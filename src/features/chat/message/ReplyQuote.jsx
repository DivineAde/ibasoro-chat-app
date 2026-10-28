import { cn } from "../../../lib/cn";
import { messagePreview } from "../../../lib/chat";

/** The quoted message shown above a reply, or above the composer while replying. */
export function ReplyQuote({ reply, mine, meId, onClick, className }) {
  const own = reply.sender?._id === meId;
  const label = own ? "You" : reply.sender?.name || "Someone";
  const Tag = onClick ? "button" : "div";
  return (
    <Tag
      type={onClick ? "button" : undefined}
      onClick={onClick}
      className={cn(
        "relative block w-full overflow-hidden rounded-[10px] py-1.5 pl-3 pr-2.5 text-left",
        "before:absolute before:inset-y-0 before:left-0 before:w-[3px] before:content-['']",
        mine ? "bg-black/15 before:bg-white/80" : "bg-ink/5 before:bg-accent-ink",
        onClick && "press",
        className
      )}
    >
      <span className={cn("block truncate text-caption font-semibold", mine ? "text-white" : "text-accent-ink")}>{label}</span>
      <span className={cn("block truncate text-footnote", mine ? "text-white/85" : "text-ink-2", reply.deletedAt && "italic")}>
        {messagePreview(reply)}
      </span>
    </Tag>
  );
}
