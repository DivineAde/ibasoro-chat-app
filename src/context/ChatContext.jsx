import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
} from "react";
import { useMatch, useNavigate } from "react-router-dom";
import { api, errorMessage } from "../lib/api";
import { createSocket } from "../lib/socket";
import { idOf, replySnapshot } from "../lib/chat";
import { uploadFile } from "../lib/upload";
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
  const navigate = useNavigate();
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

  // Everything needed to (re)send a message that hasn't reached the server yet. Files can't
  // live in the reducer, so the outbox keeps them, keyed by the optimistic message id.
  const outbox = useRef(new Map());

  const deliver = useCallback(
    async (chatId, tempId) => {
      const job = outbox.current.get(tempId);
      if (!job) return;
      try {
        let attachment = job.attachment;
        if (job.file) {
          job.controller = new AbortController();
          job.uploaded ||= await uploadFile(job.file, job.kind, {
            signal: job.controller.signal,
            onProgress: (progress) => dispatch({ type: "message/progress", chatId, tempId, progress }),
          });
          attachment = {
            ...job.attachment,
            url: job.uploaded.url,
            size: job.uploaded.size || job.attachment.size,
          };
        }
        const { data } = await api.post("/message", {
          chatId,
          clientId: tempId,
          type: job.kind || "text",
          content: job.content,
          ...(attachment && { attachment }),
          ...(job.replyToId && { replyTo: job.replyToId }),
        });
        outbox.current.delete(tempId);
        if (job.localUrl) URL.revokeObjectURL(job.localUrl);
        dispatch({ type: "message/replaced", chatId, tempId, message: data, meId });
      } catch (error) {
        if (error.name === "AbortError") return; // discarded while uploading
        dispatch({ type: "message/failed", chatId, tempId });
      }
    },
    [meId]
  );

  const optimisticMessage = useCallback(
    (chatId, tempId, extra) => ({
      _id: tempId,
      chat: chatId,
      sender: { _id: meId, name: user.name, pic: user.pic },
      type: "text",
      createdAt: new Date().toISOString(),
      readBy: [meId],
      status: "sending",
      ...extra,
    }),
    [meId, user]
  );

  /** Send text. `replyTo` is the message being answered (the full object, for its preview). */
  const sendMessage = useCallback(
    (chatId, content, { replyTo } = {}) => {
      const text = content.trim();
      if (!text) return;
      const tempId = `tmp-${Date.now()}-${tempCounter++}`;
      outbox.current.set(tempId, { content: text, replyToId: replyTo?._id });
      dispatch({
        type: "message/optimistic",
        chatId,
        message: optimisticMessage(chatId, tempId, { content: text, ...(replyTo && { replyTo: replySnapshot(replyTo) }) }),
      });
      deliver(chatId, tempId);
    },
    [optimisticMessage, deliver]
  );

  /**
   * Send a photo, file or voice note. Shows at once from a local object URL with a progress
   * ring, uploads straight to Cloudinary, then posts the message with the hosted URL.
   * `meta`: { width, height } for images, { duration, waveform } for voice notes.
   */
  const sendAttachment = useCallback(
    (chatId, { kind, file, content = "", meta = {}, replyTo }) => {
      const tempId = `tmp-${Date.now()}-${tempCounter++}`;
      const localUrl = URL.createObjectURL(file);
      const attachment = { name: file.name, size: file.size, mime: file.type || "application/octet-stream", ...meta };
      outbox.current.set(tempId, { kind, file, content: content.trim(), attachment, localUrl, replyToId: replyTo?._id });
      dispatch({
        type: "message/optimistic",
        chatId,
        message: optimisticMessage(chatId, tempId, {
          type: kind,
          content: content.trim(),
          attachment: { ...attachment, url: localUrl },
          progress: 0,
          ...(replyTo && { replyTo: replySnapshot(replyTo) }),
        }),
      });
      deliver(chatId, tempId);
    },
    [optimisticMessage, deliver]
  );

  const retryMessage = useCallback(
    (chatId, tempId) => {
      if (!outbox.current.has(tempId)) return;
      dispatch({ type: "message/retrying", chatId, tempId });
      deliver(chatId, tempId);
    },
    [deliver]
  );

  const discardMessage = useCallback((chatId, tempId) => {
    const job = outbox.current.get(tempId);
    job?.controller?.abort();
    if (job?.localUrl) URL.revokeObjectURL(job.localUrl);
    outbox.current.delete(tempId);
    dispatch({ type: "message/discarded", chatId, tempId });
  }, []);

  // ── Edit, delete, react (optimistic, with rollback) ───────────────────────
  const findMessage = (chatId, id) => stateRef.current.messages[chatId]?.items.find((m) => m._id === id);

  const editMessage = useCallback(
    async (chatId, id, content) => {
      const before = findMessage(chatId, id);
      const text = content.trim();
      if (!before || !text || text === before.content) return true;
      dispatch({ type: "message/updated", message: { ...before, content: text, editedAt: new Date().toISOString() } });
      try {
        const { data } = await api.patch(`/message/${id}`, { content: text });
        dispatch({ type: "message/updated", message: data });
        return true;
      } catch (error) {
        dispatch({ type: "message/updated", message: before });
        toast.error("Couldn't edit message", errorMessage(error));
        return false;
      }
    },
    [toast]
  );

  const deleteMessage = useCallback(
    async (chatId, id) => {
      const before = findMessage(chatId, id);
      if (!before) return;
      const {
        attachment: _a,
        replyTo: _r,
        ...rest
      } = before;
      dispatch({ type: "message/updated", message: { ...rest, content: "", reactions: [], deletedAt: new Date().toISOString() } });
      try {
        const { data } = await api.delete(`/message/${id}`);
        dispatch({ type: "message/updated", message: data });
      } catch (error) {
        dispatch({ type: "message/updated", message: before });
        toast.error("Couldn't delete message", errorMessage(error));
      }
    },
    [toast]
  );

  const reactToMessage = useCallback(
    async (chatId, id, emoji) => {
      const before = findMessage(chatId, id);
      if (!before) return;
      dispatch({ type: "message/reaction", chatId, messageId: id, meId, emoji });
      try {
        const { data } = await api.put(`/message/${id}/reaction`, { emoji });
        dispatch({ type: "message/updated", message: data });
      } catch (error) {
        dispatch({ type: "message/updated", message: before });
        toast.error("Couldn't add reaction", errorMessage(error));
      }
    },
    [meId, toast]
  );

  /** Load the page of history around one message (search hit) so it can be scrolled to. */
  const loadAround = useCallback(
    async (chatId, messageId) => {
      try {
        const { data } = await api.get(`/message/${chatId}`, { params: { limit: PAGE_SIZE, around: messageId } });
        dispatch({ type: "messages/window", chatId, messages: data.messages, hasMore: data.hasMore, hasNewer: data.hasNewer });
        return true;
      } catch (error) {
        toast.error("Couldn't open that message", errorMessage(error));
        return false;
      }
    },
    [toast]
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

    socket.on("message:updated", (message) => dispatch({ type: "message/updated", message }));

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

  // Tapping a push notification while the app is already open asks it to show that chat.
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return undefined;
    const onMessage = (e) => e.data?.type === "open-chat" && typeof e.data.path === "string" && e.data.path.startsWith("/chat") && navigate(e.data.path);
    navigator.serviceWorker.addEventListener("message", onMessage);
    return () => navigator.serviceWorker.removeEventListener("message", onMessage);
  }, [navigate]);

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
      loadAround,
      sendMessage,
      sendAttachment,
      retryMessage,
      discardMessage,
      editMessage,
      deleteMessage,
      reactToMessage,
      markRead,
      emitTyping,
      upsertChat,
      removeChat,
    }),
    [
      loadChats,
      loadMessages,
      loadOlder,
      loadAround,
      sendMessage,
      sendAttachment,
      retryMessage,
      discardMessage,
      editMessage,
      deleteMessage,
      reactToMessage,
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
