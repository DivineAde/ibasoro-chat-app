export const REACTIONS = ["👍", "❤️", "😂", "😮", "😢", "🙏"];

/** [{ user, emoji }] → [{ emoji, count, mine }] in first-used order. */
export const groupReactions = (reactions = [], meId) => {
  const groups = new Map();
  for (const { user, emoji } of reactions) {
    const id = typeof user === "string" ? user : user?._id;
    const group = groups.get(emoji) || { emoji, count: 0, mine: false };
    group.count += 1;
    group.mine ||= id === meId;
    groups.set(emoji, group);
  }
  return [...groups.values()];
};

/** The emoji `meId` reacted with, if any. */
export const myReaction = (reactions = [], meId) =>
  reactions.find((r) => (typeof r.user === "string" ? r.user : r.user?._id) === meId)?.emoji || null;

/** Apply my reaction locally (null removes it): one reaction per person. */
export const withReaction = (reactions = [], meId, emoji) => [
  ...reactions.filter((r) => (typeof r.user === "string" ? r.user : r.user?._id) !== meId),
  ...(emoji ? [{ user: meId, emoji }] : []),
];
