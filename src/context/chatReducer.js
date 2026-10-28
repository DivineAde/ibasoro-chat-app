import { idOf, upsertMessage } from "../lib/chat";
import { withReaction } from "../lib/reactions";

/**
 * All chat state lives in one pure reducer so the real-time rules
 * (ordering, unread counts, de-duplication, read receipts) are testable
 * without React or a socket.
 *
 * state = {
 *   chatsStatus: "idle" | "loading" | "loaded" | "error",
 *   chats: Chat[]                       // newest activity first
 *   messages: { [chatId]: { items, hasMore, hasNewer, status, loadingMore } }
 *             hasNewer = the list is a window around a search hit, not the latest page
 *   typing:   { [chatId]: { [userId]: name } }
 *   online:   { [userId]: true }
 *   lastSeen: { [userId]: isoString }
 * }
 */
export const initialChatState = {
  chatsStatus: "idle",
  chats: [],
  messages: {},
  typing: {},
  online: {},
  lastSeen: {},
};

const activity = (chat) => new Date(chat.latestMessage?.createdAt || chat.updatedAt || 0).getTime();
export const sortChats = (chats) => chats.slice().sort((a, b) => activity(b) - activity(a));

const patchChat = (state, chatId, patch) => ({
  ...state,
  chats: state.chats.map((c) => (c._id === chatId ? { ...c, ...patch(c) } : c)),
});

const patchMessages = (state, chatId, patch) => {
  const current = state.messages[chatId];
  if (!current) return state;
  return { ...state, messages: { ...state.messages, [chatId]: { ...current, ...patch(current) } } };
};

export function chatReducer(state, action) {
  switch (action.type) {
    case "reset":
      return initialChatState;

    // ── Chat list ───────────────────────────────────────────────────────────
    case "chats/loading":
      return { ...state, chatsStatus: state.chatsStatus === "loaded" ? "loaded" : "loading" };
    case "chats/error":
      return { ...state, chatsStatus: state.chatsStatus === "loaded" ? "loaded" : "error" };
    case "chats/loaded":
      return { ...state, chatsStatus: "loaded", chats: sortChats(action.chats) };

    case "chat/upsert": {
      const existing = state.chats.find((c) => c._id === action.chat._id);
      const merged = existing
        ? {
            ...existing,
            ...action.chat,
            // Broadcast payloads carry no per-user data; keep our own unread count.
            unreadCount: action.keepUnread ? existing.unreadCount : action.chat.unreadCount ?? 0,
            latestMessage: action.chat.latestMessage ?? existing.latestMessage,
          }
        : { unreadCount: 0, ...action.chat };
      const rest = state.chats.filter((c) => c._id !== action.chat._id);
      return { ...state, chats: sortChats([merged, ...rest]) };
    }

    case "chat/removed": {
      const { [action.chatId]: _gone, ...messages } = state.messages;
      return { ...state, chats: state.chats.filter((c) => c._id !== action.chatId), messages };
    }

    case "chat/markedRead":
      return patchChat(state, action.chatId, () => ({ unreadCount: 0 }));

    // ── Messages ────────────────────────────────────────────────────────────
    case "messages/loading":
      return {
        ...state,
        messages: {
          ...state.messages,
          [action.chatId]: { items: [], hasMore: false, hasNewer: false, status: "loading", loadingMore: false },
        },
      };
    case "messages/loaded":
      return {
        ...state,
        messages: {
          ...state.messages,
          [action.chatId]: {
            // Server history first, then any optimistic (still sending / failed) messages.
            items: [
              ...action.messages,
              ...(state.messages[action.chatId]?.items || []).filter((m) => m.status),
            ],
            hasMore: action.hasMore,
            hasNewer: false,
            status: "loaded",
            loadingMore: false,
          },
        },
      };
    // A window of history around one message (jump from search). Newer messages exist
    // on the server but aren't in the list, so live arrivals must not be appended.
    case "messages/window":
      return {
        ...state,
        messages: {
          ...state.messages,
          [action.chatId]: {
            items: action.messages,
            hasMore: action.hasMore,
            hasNewer: action.hasNewer,
            status: "loaded",
            loadingMore: false,
          },
        },
      };
    case "messages/error":
      return patchMessages(state, action.chatId, () => ({ status: "error" }));
    case "messages/loadingMore":
      return patchMessages(state, action.chatId, () => ({ loadingMore: true }));
    case "messages/older":
      return patchMessages(state, action.chatId, (cur) => ({
        items: [...action.messages.filter((m) => !cur.items.some((x) => x._id === m._id)), ...cur.items],
        hasMore: action.hasMore,
        loadingMore: false,
      }));
    case "messages/loadMoreFailed":
      return patchMessages(state, action.chatId, () => ({ loadingMore: false }));
    case "messages/invalidate":
      return { ...state, messages: {} };

    // A message arrived from the server (socket) – or our own, echoed back.
    case "message/received": {
      const { message, meId, countUnread } = action;
      const chatId = idOf(message.chat);
      let next = state;

      if (state.messages[chatId]?.status === "loaded" && !state.messages[chatId].hasNewer) {
        // Our own message echoed back carries the id of its optimistic bubble: swap it in place.
        next = patchMessages(next, chatId, (cur) => ({
          items: upsertMessage(
            message.clientId ? cur.items.filter((m) => m._id !== message.clientId) : cur.items,
            message
          ),
        }));
      }

      const known = state.chats.some((c) => c._id === chatId);
      if (!known) return next;

      const isNew = !state.messages[chatId]?.items?.some((m) => m._id === message._id);
      const fromOther = idOf(message.sender) !== meId;
      next = patchChat(next, chatId, (c) => ({
        latestMessage: message,
        updatedAt: message.createdAt,
        unreadCount: c.unreadCount + (fromOther && countUnread && isNew ? 1 : 0),
      }));
      // They sent something, so they are no longer typing.
      const typing = { ...next.typing[chatId] };
      delete typing[idOf(message.sender)];
      return { ...next, chats: sortChats(next.chats), typing: { ...next.typing, [chatId]: typing } };
    }

    // The server changed a message (edit, delete, reaction). Replace it wholesale:
    // a delete removes fields, so merging would resurrect them.
    case "message/updated": {
      const { message } = action;
      const chatId = idOf(message.chat);
      const swap = (m) => (m._id === message._id ? { ...message } : m);
      let next = patchMessages(state, chatId, (cur) => ({ items: cur.items.map(swap) }));
      next = patchChat(next, chatId, (c) => (c.latestMessage?._id === message._id ? { latestMessage: message } : {}));
      return next;
    }

    // My reaction, shown before the server confirms it.
    case "message/reaction": {
      const { chatId, messageId, meId, emoji } = action;
      const react = (m) => (m._id === messageId ? { ...m, reactions: withReaction(m.reactions, meId, emoji) } : m);
      return patchMessages(state, chatId, (cur) => ({ items: cur.items.map(react) }));
    }

    case "message/progress":
      return patchMessages(state, action.chatId, (cur) => ({
        items: cur.items.map((m) => (m._id === action.tempId ? { ...m, progress: action.progress } : m)),
      }));

    case "message/optimistic":
      return patchMessages(state, action.chatId, (cur) => ({ items: [...cur.items, action.message] }));
    case "message/failed":
      return patchMessages(state, action.chatId, (cur) => ({
        items: cur.items.map((m) => (m._id === action.tempId ? { ...m, status: "failed" } : m)),
      }));
    case "message/retrying":
      return patchMessages(state, action.chatId, (cur) => ({
        items: cur.items.map((m) => (m._id === action.tempId ? { ...m, status: "sending", progress: 0 } : m)),
      }));
    case "message/discarded":
      return patchMessages(state, action.chatId, (cur) => ({
        items: cur.items.filter((m) => m._id !== action.tempId),
      }));
    case "message/replaced": {
      const next = patchMessages(state, action.chatId, (cur) => ({
        items: upsertMessage(
          cur.items.filter((m) => m._id !== action.tempId),
          action.message
        ),
      }));
      return chatReducer(next, { type: "message/received", message: action.message, meId: action.meId, countUnread: false });
    }

    // Someone read the conversation: stamp them on messages they did not send.
    case "messages/readBy": {
      const { chatId, userId } = action;
      const stamp = (m) =>
        idOf(m.sender) === userId || (m.readBy || []).some((r) => idOf(r) === userId)
          ? m
          : { ...m, readBy: [...(m.readBy || []), userId] };
      let next = patchMessages(state, chatId, (cur) => ({ items: cur.items.map(stamp) }));
      next = patchChat(next, chatId, (c) => (c.latestMessage ? { latestMessage: stamp(c.latestMessage) } : {}));
      return next;
    }

    // ── Presence & typing ───────────────────────────────────────────────────
    case "presence/list":
      return { ...state, online: Object.fromEntries(action.ids.map((id) => [id, true])) };
    case "presence/update": {
      const online = { ...state.online };
      if (action.online) online[action.userId] = true;
      else delete online[action.userId];
      const lastSeen = action.lastSeenAt
        ? { ...state.lastSeen, [action.userId]: action.lastSeenAt }
        : state.lastSeen;
      return { ...state, online, lastSeen };
    }

    case "typing/set": {
      const forChat = { ...state.typing[action.chatId] };
      if (action.on) forChat[action.userId] = action.name;
      else delete forChat[action.userId];
      return { ...state, typing: { ...state.typing, [action.chatId]: forChat } };
    }

    default:
      return state;
  }
}
