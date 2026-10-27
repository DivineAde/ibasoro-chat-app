import { memo } from "react";
import { AlertCircle, Check, CheckCheck, Clock } from "lucide-react";
import { cn } from "../../lib/cn";
import { formatTime } from "../../lib/format";
import { linkify } from "../../lib/linkify";
import { Avatar } from "../../components/ui/Avatar";

function Status({ message, read }) {
  if (message.status === "sending") {
    return <Clock size={13} aria-label="Sending" className="opacity-80" />;
  }
  if (message.status === "failed") {
    return <AlertCircle size={14} aria-label="Failed to send" className="text-danger" />;
  }
  return read ? (
    <CheckCheck size={15} aria-label="Read" className="text-white" />
  ) : (
    <Check size={14} aria-label="Sent" className="opacity-80" />
  );
}

function Text({ content, mine }) {
  return linkify(content).map((part, i) =>
    part.type === "link" ? (
      <a
        key={i}
        href={part.value}
        target="_blank"
        rel="noopener noreferrer"
        className={cn("break-all underline underline-offset-2", mine ? "decoration-white/60" : "text-accent-ink decoration-accent-ink/40")}
      >
        {part.value}
      </a>
    ) : (
      <span key={i}>{part.value}</span>
    )
  );
}

/**
 * One chat bubble. Memoised: in a long conversation only the bubble whose
 * props changed re-renders when a message arrives or a receipt flips.
 */
export const MessageBubble = memo(function MessageBubble({
  message,
  mine,
  position,
  showAvatar,
  showName,
  isGroup,
  read,
  animate,
  onRetry,
  onDiscard,
}) {
  const tail = position === "single" || position === "last";
  const failed = message.status === "failed";
  const sender = message.sender;

  return (
    <li
      className={cn(
        "flex items-end gap-2",
        mine ? "justify-end" : "justify-start",
        position === "single" || position === "first" ? "mt-3" : "mt-0.5",
        animate && "animate-msg-in"
      )}
      style={{ transformOrigin: mine ? "bottom right" : "bottom left" }}
    >
      {/* Gutter keeps bubbles aligned when the avatar is only shown on the last of a run. */}
      {isGroup && !mine && (
        <span className="w-7 shrink-0">{showAvatar && <Avatar name={sender.name} src={sender.pic} size="xs" />}</span>
      )}

      <div className={cn("flex max-w-[min(80%,34rem)] flex-col", mine ? "items-end" : "items-start")}>
        {isGroup && !mine && showName && (
          <span className="mb-0.5 px-3 text-caption font-semibold text-accent-ink">{sender.name}</span>
        )}

        <div
          className={cn(
            "relative rounded-bubble px-3.5 py-2 text-body shadow-[0_1px_1px_rgb(var(--shadow)/0.04)]",
            mine ? "bg-bubble-out text-accent-fg" : "bg-bubble-in text-ink ring-1 ring-inset ring-line",
            tail && (mine ? "rounded-br-[6px]" : "rounded-bl-[6px]"),
            message.status === "sending" && "opacity-70",
            failed && "ring-2 ring-danger"
          )}
        >
          <p className="whitespace-pre-wrap [overflow-wrap:anywhere]">
            <Text content={message.content} mine={mine} />
            {/* Invisible spacer reserves room so text never runs under the timestamp. */}
            <span aria-hidden className={cn("inline-block", mine ? "w-[68px]" : "w-[50px]")} />
          </p>
          <span
            className={cn(
              "absolute bottom-1.5 right-3 flex items-center gap-1 text-[11px] tabular-nums leading-none",
              mine ? "text-accent-fg/75" : "text-ink-3"
            )}
          >
            <time dateTime={message.createdAt}>{formatTime(message.createdAt)}</time>
            {mine && <Status message={message} read={read} />}
          </span>
        </div>

        {failed && (
          <div className="mt-1 flex items-center gap-3 px-1 text-footnote">
            <span className="text-danger">Not sent.</span>
            <button type="button" onClick={onRetry} className="font-semibold text-accent-ink hover:underline">
              Retry
            </button>
            <button type="button" onClick={onDiscard} className="font-semibold text-ink-2 hover:underline">
              Delete
            </button>
          </div>
        )}
      </div>
    </li>
  );
});
