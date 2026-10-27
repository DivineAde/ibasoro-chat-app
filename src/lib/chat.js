/** Pure helpers for reasoning about chats and messages. Easy to unit-test. */

export const idOf = (x) => (typeof x === "string" ? x : x?._id);

/** The other participant of a one-to-one chat. */
export const getOtherUser = (chat, me) =>
  chat?.users?.find((u) => u._id !== me?._id) || chat?.users?.[0];

export const chatTitle = (chat, me) =>
  chat?.isGroupChat ? chat.chatName : getOtherUser(chat, me)?.name || "Unknown";

export const chatPicture = (chat, me) => (chat?.isGroupChat ? null : getOtherUser(chat, me)?.pic);

/** The DB default avatar is an anonymous silhouette – prefer our initials. */
export const isDefaultPic = (src) => !src || /anonymous-avatar-icon/.test(src);

/** One-line preview for the chat list. */
export const chatPreview = (chat, me) => {
  const m = chat?.latestMessage;
  if (!m) return null;
  const mine = idOf(m.sender) === me?._id;
  const prefix = mine ? "You: " : chat.isGroupChat ? `${m.sender?.name?.split(" ")[0] || ""}: ` : "";
  return `${prefix}${m.content}`;
};

/** Insert or replace by `_id`, keeping order (messages are oldest → newest). */
export const upsertMessage = (list, message) => {
  const i = list.findIndex((m) => m._id === message._id);
  if (i === -1) return [...list, message];
  const next = list.slice();
  next[i] = { ...next[i], ...message };
  return next;
};

/**
 * Turn a flat message list into render rows:
 *   { type: "day", key, label }  and  { type: "message", key, message, position, showAvatar }
 *
 * `position` describes where the message sits in a run from the same sender
 * ("single" | "first" | "middle" | "last") so bubbles can join up visually.
 */
export const buildRows = (messages, meId, { formatDay }) => {
  const rows = [];
  let lastDay = null;

  messages.forEach((m, i) => {
    const day = new Date(m.createdAt).toDateString();
    if (day !== lastDay) {
      rows.push({ type: "day", key: `day-${day}`, label: formatDay(m.createdAt) });
      lastDay = day;
    }

    const prev = messages[i - 1];
    const next = messages[i + 1];
    const sender = idOf(m.sender);
    // A run continues while the sender stays the same, on the same day, within 5 minutes.
    const continues = (a, b) =>
      a &&
      b &&
      idOf(a.sender) === idOf(b.sender) &&
      new Date(a.createdAt).toDateString() === new Date(b.createdAt).toDateString() &&
      Math.abs(new Date(b.createdAt) - new Date(a.createdAt)) < 5 * 60 * 1000;

    const joinsPrev = continues(prev, m);
    const joinsNext = continues(m, next);
    const position = joinsPrev ? (joinsNext ? "middle" : "last") : joinsNext ? "first" : "single";

    rows.push({
      type: "message",
      key: m._id,
      message: m,
      mine: sender === meId,
      position,
      showAvatar: sender !== meId && !joinsNext,
      showName: sender !== meId && !joinsPrev,
    });
  });

  return rows;
};

/** Has everyone else in the chat read this message? */
export const isReadByAll = (message, chat, meId) => {
  const others = (chat?.users || []).map((u) => u._id).filter((id) => id !== meId);
  if (!others.length) return false;
  const readBy = (message.readBy || []).map(idOf);
  return others.every((id) => readBy.includes(id));
};
