import { cn } from "../../lib/cn";

/** Unread counter pill. Renders nothing for 0. */
export function CountBadge({ count, className }) {
  if (!count) return null;
  return (
    <span
      aria-label={`${count} unread`}
      className={cn(
        "inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-accent px-1.5",
        "text-caption font-semibold tabular-nums text-accent-fg",
        className
      )}
    >
      {count > 99 ? "99+" : count}
    </span>
  );
}
