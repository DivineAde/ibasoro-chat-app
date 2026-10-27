const sameDay = (a, b) => a.toDateString() === b.toDateString();
const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const daysBetween = (a, b) => Math.round((startOfDay(a) - startOfDay(b)) / 86400000);

/** 9:41 AM – honours the user's locale. */
export const formatTime = (iso) =>
  new Date(iso).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });

/** Chat-list timestamp: time today, "Yesterday", weekday this week, else date. */
export const formatListTime = (iso, now = new Date()) => {
  if (!iso) return "";
  const d = new Date(iso);
  const diff = daysBetween(now, d);
  if (diff <= 0) return formatTime(iso);
  if (diff === 1) return "Yesterday";
  if (diff < 7) return d.toLocaleDateString(undefined, { weekday: "short" });
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
};

/** Day divider label inside a conversation. */
export const formatDayLabel = (iso, now = new Date()) => {
  const d = new Date(iso);
  const diff = daysBetween(now, d);
  if (diff === 0) return "Today";
  if (diff === 1) return "Yesterday";
  if (diff < 7) return d.toLocaleDateString(undefined, { weekday: "long" });
  return d.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    ...(d.getFullYear() !== now.getFullYear() && { year: "numeric" }),
  });
};

/** "Last seen today at 9:41 AM" */
export const formatLastSeen = (iso, now = new Date()) => {
  if (!iso) return "Offline";
  const d = new Date(iso);
  if (sameDay(d, now)) return `Last seen today at ${formatTime(iso)}`;
  const diff = daysBetween(now, d);
  if (diff === 1) return `Last seen yesterday at ${formatTime(iso)}`;
  return `Last seen ${d.toLocaleDateString(undefined, { month: "short", day: "numeric" })}`;
};

export const initials = (name = "") =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() || "")
    .join("") || "?";
