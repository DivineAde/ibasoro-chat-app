import { cn } from "../../../lib/cn";
import { groupReactions } from "../../../lib/reactions";

/** Reaction chips that hang off the bottom edge of a bubble. Tap one to add or remove yours. */
export function Reactions({ reactions, meId, mine, onToggle }) {
  const groups = groupReactions(reactions, meId);
  if (!groups.length) return null;
  return (
    <div className={cn("relative z-[1] -mt-2 flex flex-wrap gap-1 px-2", mine ? "justify-end" : "justify-start")}>
      {groups.map(({ emoji, count, mine: reacted }) => (
        <button
          key={emoji}
          type="button"
          onClick={() => onToggle(reacted ? null : emoji)}
          aria-pressed={reacted}
          aria-label={`${emoji} ${count}${reacted ? ", you reacted" : ""}`}
          className={cn(
            "press flex h-6 items-center gap-1 rounded-full px-2 text-footnote leading-none shadow-raised ring-2 ring-canvas",
            "animate-pop-in",
            reacted ? "bg-accent-soft text-accent-ink" : "bg-raised text-ink-2"
          )}
        >
          <span className="text-[13px]">{emoji}</span>
          {count > 1 && <span className="font-semibold tabular-nums">{count}</span>}
        </button>
      ))}
    </div>
  );
}
