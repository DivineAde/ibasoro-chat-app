import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
} from "react";
import { useMatch } from "react-router-dom";
import { api, errorMessage } from "../lib/api";
import { createSocket } from "../lib/socket";
import { idOf } from "../lib/chat";
import { playReceive } from "../lib/sound";
import { useAuth } from "./AuthContext";
import { chatReducer, initialChatState } from "./chatReducer";
import { useToast } from "../components/ui/Toast";

const ChatStateContext = createContext(null);
const ChatActionsContext = createContext(null);

const PAGE_SIZE = 40;
let tempCounter = 0;

/**
 * Owns the socket connection and the chat store. Components read state with
 * `useChatState()` and call stable action functions from `useChatActions()`.
 */
export function ChatProvider({ children }) {
  const { user, signOut } = useAuth();
  const toast = useToast();
  const [state, dispatch] = useReducer(chatReducer, initialChatState);
  const match = useMatch("/chat/:chatId");
  const activeChatId = match?.params.chatId || null;

  // Refs let long-lived socket handlers see fresh values without re-subscribing.
  const stateRef = useRef(state);
  stateRef.current = state;
  const activeRef = useRef(activeChatId);
  activeRef.current = activeChatId;
  const socketRef = useRef(null);
  const meId = user?._id;

  // ── REST actions ──────────────────────────────────────────────────────────
  const loadChats = useCallback(async () => {
    dispatch({ type: "chats/loading" });
    try {
      const { data } = await api.get("/chat");
      dispatch({ type: "chats/loaded", chats: data });
    } catch (error) {
      dispatch({ type: "chats/error" });
      toast.error("Couldn't load your chats", errorMessage(error));
    }
  }, [toast]);

  const loadMessages = useCallback(
    async (chatId) => {
      dispatch({ type: "messages/loading", chatId });
      try {
        const { data } = await api.get(`/message/${chatId}`, { params: { limit: PAGE_SIZE } });
        dispatch({ type: "messages/loaded", chatId, messages: data.messages, hasMore: data.hasMore });
      } catch (error) {
        dispatch({ type: "messages/error", chatId });
        toast.error("Couldn't load messages", errorMessage(error));
      }
    },
    [toast]
  );

  const loadOlder = useCallback(
    async (chatId) => {
      const current = stateRef.current.messages[chatId];
      if (!current || current.loadingMore || !current.hasMore) return;
      const oldest = current.items.find((m) => !m.status);
      if (!oldest) return;
      dispatch({ type: "messages/loadingMore", chatId });
      try {
        const { data } = await api.get(`/message/${chatId}`, {
          params: { limit: PAGE_SIZE, before: oldest._id },
        });
        dispatch({ type: "messages/older", chatId, messages: data.messages, hasMore: data.hasMore });
      } catch (error) {
        dispatch({ type: "messages/loadMoreFailed", chatId });
        toast.error("Couldn't load earlier messages", errorMessage(error));
      }
    },
    [toast]
  );

  const postMessage = useCallback(
    async (chatId, tempId, content) => {
      try {
        const { data } = await api.post("/message", { chatId, content, clientId: tempId });
        dispatch({ type: "message/replaced", chatId, tempId, message: data, meId });
      } catch {
        dispatch({ type: "message/failed", chatId, tempId });
      }
    },
    [meId]
  );

  const sendMessage = useCallback(
    (chatId, content) => {
      const text = content.trim();
      if (!text) return;
      const tempId = `tmp-${Date.now()}-${tempCounter++}`;
      dispatch({
        type: "message/optimistic",
        chatId,
        message: {
          _id: tempId,
          chat: chatId,
          sender: { _id: meId, name: user.name, pic: user.pic },
          content: text,
          createdAt: new Date().toISOString(),
          readBy: [meId],
          status: "sending",
        },
      });
      postMessage(chatId, tempId, text);
    },
    [meId, user, postMessage]
  );

  const retryMessage = useCallback(
    (chatId, tempId) => {
      const msg = stateRef.current.messages[chatId]?.items.find((m) => m._id === tempId);
      if (!msg) return;
      dispatch({ type: "message/retrying", chatId, tempId });
      postMessage(chatId, tempId, msg.content);
    },
    [postMessage]
  );

  const discardMessage = useCallback(
    (chatId, tempId) => dispatch({ type: "message/discarded", chatId, tempId }),
    []
  );

  const markRead = useCallback(async (chatId) => {
    dispatch({ type: "chat/markedRead", chatId });
    try {
      await api.post("/message/read", { chatId });
    } catch {
      /* non-critical: the next open will retry */
    }
  }, []);

  const emitTyping = useCallback((chatId, on) => {
    socketRef.current?.emit(on ? "typing:start" : "typing:stop", { chatId });
  }, []);

  // ── Chat management (merged into the store from the REST response) ────────
  const upsertChat = useCallback(
    (chat) => dispatch({ type: "chat/upsert", chat, keepUnread: true }),
    []
  );
  const removeChat = useCallback((chatId) => dispatch({ type: "chat/removed", chatId }), []);

  // ── Socket lifecycle ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!user?.token) {
      dispatch({ type: "reset" });
      return undefined;
    }

    loadChats();
    const socket = createSocket(user.token);
    socketRef.current = socket;
    let hasConnectedBefore = false;

    socket.on("connect", () => {
      // After a drop we may have missed events: reload what's on screen.
      if (hasConnectedBefore) {
        dispatch({ type: "messages/invalidate" });
        loadChats();
      }
      hasConnectedBefore = true;
    });
    socket.on("connect_error", (err) => {
      if (err.message === "unauthorized") signOut();
    });

    socket.on("presence:list", ({ onlineIds }) => dispatch({ type: "presence/list", ids: onlineIds }));
    socket.on("presence:update", (p) => dispatch({ type: "presence/update", ...p }));

    socket.on("message:new", (message) => {
      const chatId = idOf(message.chat);
      const fromOther = idOf(message.sender) !== meId;
      const watching = activeRef.current === chatId && !document.hidden;

      dispatch({ type: "message/received", message, meId, countUnread: fromOther && !watching });

      if (!stateRef.current.chats.some((c) => c._id === chatId)) {
        loadChats(); // a chat we don't know yet
        return;
      }
      if (fromOther) {
        if (watching) api.post("/message/read", { chatId }).catch(() => {});
        else playReceive();
      }
    });

    socket.on("message:read", ({ chatId, userId }) => {
      if (userId !== meId) dispatch({ type: "messages/readBy", chatId, userId });
    });

    socket.on("chat:new", (chat) => dispatch({ type: "chat/upsert", chat }));
    socket.on("chat:updated", (chat) => dispatch({ type: "chat/upsert", chat, keepUnread: true }));
    socket.on("chat:removed", ({ chatId }) => dispatch({ type: "chat/removed", chatId }));

    socket.on("typing:start", ({ chatId, userId, name }) =>
      dispatch({ type: "typing/set", chatId, userId, name, on: true })
    );
    socket.on("typing:stop", ({ chatId, userId }) =>
      dispatch({ type: "typing/set", chatId, userId, on: false })
    );

    return () => {
      socket.removeAllListeners();
      socket.disconnect();
      socketRef.current = null;
    };
    // `user.token` identifies the session; other profile edits shouldn't reconnect.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.token]);

  // Unread count in the tab title: "(3) ìbáṣọ̀rọ̀"
  const totalUnread = useMemo(
    () => state.chats.reduce((sum, c) => sum + (c.unreadCount || 0), 0),
    [state.chats]
  );
  useEffect(() => {
    document.title = totalUnread ? `(${totalUnread > 99 ? "99+" : totalUnread}) ìbáṣọ̀rọ̀` : "ìbáṣọ̀rọ̀";
  }, [totalUnread]);

  const actions = useMemo(
    () => ({
      loadChats,
      loadMessages,
      loadOlder,
      sendMessage,
      retryMessage,
      discardMessage,
      markRead,
      emitTyping,
      upsertChat,
      removeChat,
    }),
    [
      loadChats,
      loadMessages,
      loadOlder,
      sendMessage,
      retryMessage,
      discardMessage,
      markRead,
      emitTyping,
      upsertChat,
      removeChat,
    ]
  );

  const value = useMemo(() => ({ ...state, activeChatId, totalUnread }), [state, activeChatId, totalUnread]);

  return (
    <ChatStateContext.Provider value={value}>
      <ChatActionsContext.Provider value={actions}>{children}</ChatActionsContext.Provider>
    </ChatStateContext.Provider>
  );
}

/* eslint-disable react-refresh/only-export-components */
export const useChatState = () => {
  const ctx = useContext(ChatStateContext);
  if (!ctx) throw new Error("useChatState must be used inside <ChatProvider>");
  return ctx;
};

export const useChatActions = () => {
  const ctx = useContext(ChatActionsContext);
  if (!ctx) throw new Error("useChatActions must be used inside <ChatProvider>");
  return ctx;
};

/** The chat currently open in the URL, if it exists in the store. */
export const useActiveChat = () => {
  const { chats, activeChatId } = useChatState();
  return useMemo(() => chats.find((c) => c._id === activeChatId) || null, [chats, activeChatId]);
};
