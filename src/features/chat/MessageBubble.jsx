import { memo, useCallback, useState } from "react";
import { AlertCircle, Ban, Check, CheckCheck, Clock, MoreHorizontal, Reply, Smile } from "lucide-react";
import { cn } from "../../lib/cn";
import { formatTime } from "../../lib/format";
import { linkify } from "../../lib/linkify";
import { canEditMessage, isDeleted } from "../../lib/chat";
import { Avatar } from "../../components/ui/Avatar";
import { FileContent } from "./message/FileContent";
import { ImageContent } from "./message/ImageContent";
import { MessageMenu } from "./message/MessageMenu";
import { Reactions } from "./message/Reactions";
import { ReplyQuote } from "./message/ReplyQuote";
import { VoiceContent } from "./message/VoiceContent";
import { useMessageActions } from "./message/MessageActionsContext";
import { useMessageGestures } from "./message/useMessageGestures";

function Status({ message, read }) {
  if (message.status === "sending") return <Clock size={13} aria-label="Sending" className="opacity-80" />;
  if (message.status === "failed") return <AlertCircle size={14} aria-label="Failed to send" className="text-danger" />;
  return read ? <CheckCheck size={15} aria-label="Read" className="text-white" /> : <Check size={14} aria-label="Sent" className="opacity-80" />;
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

/** Time, "edited" and delivery state. `overlay` floats it on a photo. */
function Meta({ message, mine, read, overlay, className }) {
  return (
    <span
      className={cn(
        "flex items-center gap-1 text-[11px] tabular-nums leading-none",
        overlay ? "rounded-full bg-black/45 px-2 py-1 text-white backdrop-blur-sm" : mine ? "text-accent-fg/75" : "text-ink-3",
        className
      )}
    >
      {message.editedAt && !message.deletedAt && <span>edited</span>}
      <time dateTime={message.createdAt}>{formatTime(message.createdAt)}</time>
      {mine && <Status message={message} read={read} />}
    </span>
  );
}

const ToolbarButton = ({ label, icon: Icon, onClick }) => (
  <button
    type="button"
    aria-label={label}
    title={label}
    onClick={onClick}
    className="press flex h-8 w-8 items-center justify-center rounded-full text-ink-2 hover:bg-ink/5 hover:text-ink"
  >
    <Icon size={16} aria-hidden />
  </button>
);

/**
 * One chat bubble: text, photo, voice note or file, with reply quote, reactions and actions.
 * Memoised: in a long conversation only the bubble whose props changed re-renders.
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
  highlight,
  onRetry,
  onDiscard,
}) {
  const actions = useMessageActions();
  const [menuAnchor, setMenuAnchor] = useState(null);
  const tail = position === "single" || position === "last";
  const failed = message.status === "failed";
  const unsent = Boolean(message.status);
  const deleted = isDeleted(message);
  const sender = message.sender;
  const type = message.type || "text";
  const meId = actions.meId;
  const interactive = !unsent && !deleted;

  const openMenu = (rect) => interactive && setMenuAnchor(rect);
  const closeMenu = useCallback(() => setMenuAnchor(null), []);
  const gestures = useMessageGestures({
    enabled: interactive,
    onMenu: openMenu,
    onReply: () => actions.onReply?.(message),
  });

  const photoOnly = type === "image" && !message.content && !deleted;
  const textLike = type === "text" && !deleted;
  const reply = !deleted && message.replyTo;

  return (
    <li
      data-message-id={message._id}
      className={cn(
        "relative flex items-end gap-2 rounded-2xl",
        mine ? "justify-end" : "justify-start",
        position === "single" || position === "first" ? "mt-3" : "mt-0.5",
        // Leave room for reaction chips hanging off the bubble.
        message.reactions?.length && "mb-2",
        animate && "animate-msg-in",
        highlight && "animate-flash"
      )}
      style={{ transformOrigin: mine ? "bottom right" : "bottom left" }}
    >
      {/* Swipe-to-reply cue, revealed behind the bubble as it follows the finger. */}
      <span
        ref={gestures.hintRef}
        aria-hidden
        className="pointer-events-none absolute left-1 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-ink/10 text-ink-2 opacity-0"
      >
        <Reply size={16} />
      </span>

      {isGroup && !mine && (
        <span className="w-7 shrink-0">{showAvatar && <Avatar name={sender.name} src={sender.pic} size="xs" />}</span>
      )}

      <div className={cn("group/msg relative flex max-w-[min(80%,34rem)] flex-col", mine ? "items-end" : "items-start")}>
        {isGroup && !mine && showName && <span className="mb-0.5 px-3 text-caption font-semibold text-accent-ink">{sender.name}</span>}

        {/* Desktop hover toolbar. The wrapper's padding (not a margin) bridges the gap to the
            bubble, so the pointer never leaves the hover area on its way to a button. */}
        {interactive && (
          <div
            className={cn(
              "absolute top-1/2 z-[2] hidden -translate-y-1/2 opacity-0 transition-opacity duration-120",
              "focus-within:opacity-100 group-hover/msg:opacity-100 [@media(hover:hover)]:flex",
              mine ? "right-full pr-2" : "left-full pl-2"
            )}
          >
            <div className="flex items-center rounded-full bg-raised p-0.5 shadow-overlay">
              <ToolbarButton label="React" icon={Smile} onClick={() => openMenu(gestures.bubbleRef.current.getBoundingClientRect())} />
              <ToolbarButton label="Reply" icon={Reply} onClick={() => actions.onReply?.(message)} />
              <ToolbarButton label="More actions" icon={MoreHorizontal} onClick={() => openMenu(gestures.bubbleRef.current.getBoundingClientRect())} />
            </div>
          </div>
        )}

        <div
          data-bubble
          ref={gestures.bubbleRef}
          {...gestures.handlers}
          onContextMenu={(e) => {
            if (!interactive) return;
            e.preventDefault();
            openMenu(e.currentTarget.getBoundingClientRect());
          }}
          className={cn(
            "relative max-w-full touch-pan-y select-text rounded-bubble text-body shadow-[0_1px_1px_rgb(var(--shadow)/0.04)] [@media(pointer:coarse)]:select-none [@media(pointer:coarse)]:[-webkit-touch-callout:none]",
            photoOnly ? "p-1" : type === "image" ? "p-1 pb-2" : "px-3.5 py-2",
            deleted
              ? "bg-transparent text-ink-3 ring-1 ring-inset ring-line"
              : mine ? "bg-bubble-out text-accent-fg" : "bg-bubble-in text-ink ring-1 ring-inset ring-line",
            tail && (mine ? "rounded-br-[6px]" : "rounded-bl-[6px]"),
            message.status === "sending" && type === "text" && "opacity-70",
            failed && "ring-2 ring-danger"
          )}
        >
          {reply && (
            <ReplyQuote
              reply={reply}
              mine={mine}
              meId={meId}
              onClick={() => actions.onJump?.(reply._id)}
              className={cn("mb-1.5", type === "image" && "mx-1 mt-1 w-[calc(100%-0.5rem)]")}
            />
          )}

          {deleted && (
            <p className="flex items-center gap-1.5 pr-14 text-subhead italic">
              <Ban size={14} aria-hidden /> This message was deleted
            </p>
          )}

          {textLike && (
            <p className="whitespace-pre-wrap [overflow-wrap:anywhere]">
              <Text content={message.content} mine={mine} />
              {/* Invisible spacer reserves room so text never runs under the timestamp. */}
              <span aria-hidden className={cn("inline-block", message.editedAt ? (mine ? "w-[104px]" : "w-[86px]") : mine ? "w-[68px]" : "w-[50px]")} />
            </p>
          )}

          {type === "image" && !deleted && (
            <div className="relative">
              <ImageContent message={message} onOpen={actions.onOpenImage} onCancel={onDiscard} />
              {photoOnly && <Meta message={message} mine={mine} read={read} overlay className="absolute bottom-1.5 right-1.5" />}
            </div>
          )}
          {type === "image" && !deleted && message.content && (
            <p className="mt-1.5 whitespace-pre-wrap px-2.5 pb-2 [overflow-wrap:anywhere]">
              <Text content={message.content} mine={mine} />
              <span aria-hidden className={cn("inline-block", mine ? "w-[68px]" : "w-[50px]")} />
            </p>
          )}

          {type === "voice" && !deleted && <VoiceContent message={message} mine={mine} />}
          {type === "file" && !deleted && <FileContent message={message} mine={mine} />}
          {type === "file" && !deleted && message.content && (
            <p className="mt-1 whitespace-pre-wrap px-1.5 [overflow-wrap:anywhere]"><Text content={message.content} mine={mine} /></p>
          )}

          {/* Timestamp: pinned in the corner for text, in its own row for everything else. */}
          {textLike && <Meta message={message} mine={mine} read={read} className="absolute bottom-1.5 right-3" />}
          {!textLike && !photoOnly && (
            <Meta message={message} mine={mine && !deleted} read={read} className={cn("justify-end", deleted ? "absolute bottom-2 right-3" : type === "image" ? "absolute bottom-2 right-3.5" : "mt-0.5")} />
          )}
        </div>

        {!deleted && (
          <Reactions reactions={message.reactions} meId={meId} mine={mine} onToggle={(emoji) => actions.onReact?.(message, emoji)} />
        )}

        {failed && (
          <div className="mt-1 flex items-center gap-3 px-1 text-footnote">
            <span className="text-danger">Not sent.</span>
            <button type="button" onClick={onRetry} className="font-semibold text-accent-ink hover:underline">Retry</button>
            <button type="button" onClick={onDiscard} className="font-semibold text-ink-2 hover:underline">Delete</button>
          </div>
        )}
      </div>

      {menuAnchor && (
        <MessageMenu
          message={message}
          anchor={menuAnchor}
          mine={mine}
          meId={meId}
          canEdit={canEditMessage(message, meId)}
          onClose={closeMenu}
          onReact={(emoji) => actions.onReact?.(message, emoji)}
          onReply={() => actions.onReply?.(message)}
          onEdit={() => actions.onEdit?.(message)}
          onCopy={() => actions.onCopy?.(message)}
          onDelete={() => actions.onDelete?.(message)}
        />
      )}
    </li>
  );
});
