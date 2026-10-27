import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { ArrowDown } from "lucide-react";
import { buildRows, isReadByAll } from "../../lib/chat";
import { formatDayLabel } from "../../lib/format";
import { Spinner } from "../../components/ui/Spinner";
import { useAuth } from "../../context/AuthContext";
import { useChatActions } from "../../context/ChatContext";
import { MessageBubble } from "./MessageBubble";
import { TypingIndicator } from "./TypingIndicator";

const NEAR_BOTTOM = 96; // px from the bottom that still counts as "at the bottom"
const reduceMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * The scrolling transcript.
 *  – sticks to the bottom for new messages while you're reading the latest
 *  – otherwise leaves your position alone and offers a "new messages" jump
 *  – loads older pages when you reach the top, without the view jumping
 */
export function MessageList({ chat, items, hasMore, loadingMore, typingNames }) {
  const { user: me } = useAuth();
  const { loadOlder, retryMessage, discardMessage } = useChatActions();
  const scroller = useRef(null);
  const content = useRef(null);
  const topSentinel = useRef(null);
  const stick = useRef(true); // are we pinned to the bottom?
  const prev = useRef({ firstId: null, lastId: null, height: 0, top: 0, chatId: null });
  const [showJump, setShowJump] = useState(false);
  const [missed, setMissed] = useState(0);
  const initialIds = useRef(new Set());

  const rows = useMemo(() => buildRows(items, me._id, { formatDay: formatDayLabel }), [items, me._id]);

  // Remember which messages existed when this chat was opened: only later ones animate in.
  useEffect(() => {
    initialIds.current = new Set(items.map((m) => m._id));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chat._id]);

  const scrollToBottom = (smooth) => {
    const el = scroller.current;
    el.scrollTo({ top: el.scrollHeight, behavior: smooth && !reduceMotion() ? "smooth" : "auto" });
  };

  // Keep scroll position sensible whenever the list changes.
  useLayoutEffect(() => {
    const el = scroller.current;
    if (!el) return;
    const p = prev.current;
    const firstId = items[0]?._id;
    const last = items[items.length - 1];

    if (p.chatId !== chat._id) {
      scrollToBottom(false); // just opened: jump to the latest, no animation
      stick.current = true;
      setShowJump(false);
      setMissed(0);
    } else if (p.firstId && firstId !== p.firstId && last?._id === p.lastId) {
      el.scrollTop = el.scrollHeight - p.height + p.top; // older page prepended: hold the view
    } else if (last && last._id !== p.lastId) {
      if (stick.current || last.sender?._id === me._id) scrollToBottom(true);
      else setMissed((n) => n + 1);
    }

    prev.current = { firstId, lastId: last?._id ?? null, height: el.scrollHeight, top: el.scrollTop, chatId: chat._id };
  }, [items, chat._id, me._id]);

  // Anything that makes the transcript taller while you're at the bottom (a failed-send
  // row, the typing bubble, an image finishing loading) keeps the latest content in view.
  useEffect(() => {
    const list = content.current;
    if (!list || typeof ResizeObserver === "undefined") return undefined;
    const observer = new ResizeObserver(() => {
      if (stick.current) scroller.current.scrollTop = scroller.current.scrollHeight;
    });
    observer.observe(list);
    return () => observer.disconnect();
  }, []);

  // Typing bubble appearing should also reveal itself if we're pinned.
  useLayoutEffect(() => {
    if (typingNames.length && stick.current) scrollToBottom(true);
  }, [typingNames.length]);

  const onScroll = () => {
    const el = scroller.current;
    const distance = el.scrollHeight - el.scrollTop - el.clientHeight;
    stick.current = distance < NEAR_BOTTOM;
    setShowJump(distance > 240);
    if (stick.current) setMissed(0);
    prev.current.height = el.scrollHeight;
    prev.current.top = el.scrollTop;
  };

  // Load the previous page when the top sentinel scrolls into view.
  useEffect(() => {
    const target = topSentinel.current;
    if (!target || !hasMore) return undefined;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          const el = scroller.current;
          prev.current.height = el.scrollHeight;
          prev.current.top = el.scrollTop;
          loadOlder(chat._id);
        }
      },
      { root: scroller.current, rootMargin: "200px 0px 0px 0px" }
    );
    io.observe(target);
    return () => io.disconnect();
  }, [hasMore, chat._id, loadOlder, items.length]);

  return (
    <div className="relative min-h-0 flex-1">
      <div ref={scroller} onScroll={onScroll} className="h-full overflow-y-auto overscroll-contain px-3 pb-3 pt-2 md:px-6">
        <ul ref={content} className="mx-auto flex max-w-3xl flex-col" aria-label="Messages" aria-live="off">
          <li ref={topSentinel} aria-hidden className="flex h-8 items-center justify-center">
            {loadingMore && <Spinner className="text-ink-3" label="Loading earlier messages" />}
          </li>

          {!hasMore && items.length === 0 && (
            <li className="py-16 text-center text-subhead text-ink-3">No messages yet. Say hello 👋</li>
          )}

          {rows.map((row) =>
            row.type === "day" ? (
              <li key={row.key} className="sticky top-1 z-[1] my-3 flex justify-center">
                <span className="rounded-full bg-surface/90 px-3 py-1 text-caption font-semibold text-ink-2 shadow-raised ring-1 ring-inset ring-line backdrop-blur-md">
                  {row.label}
                </span>
              </li>
            ) : (
              <MessageBubble
                key={row.key}
                message={row.message}
                mine={row.mine}
                position={row.position}
                showAvatar={row.showAvatar}
                showName={row.showName}
                isGroup={chat.isGroupChat}
                read={row.mine && isReadByAll(row.message, chat, me._id)}
                animate={!initialIds.current.has(row.message._id)}
                onRetry={() => retryMessage(chat._id, row.message._id)}
                onDiscard={() => discardMessage(chat._id, row.message._id)}
              />
            )
          )}

          {typingNames.length > 0 && (
            <TypingIndicator label={`${typingNames.join(", ")} ${typingNames.length > 1 ? "are" : "is"} typing`} />
          )}
        </ul>
      </div>

      {/* Jump to latest */}
      <button
        type="button"
        onClick={() => scrollToBottom(true)}
        aria-label={missed ? `Jump to latest, ${missed} new` : "Jump to latest"}
        tabIndex={showJump ? 0 : -1}
        className="press glass absolute bottom-3 right-4 flex h-11 items-center gap-1.5 rounded-full px-3.5 text-footnote font-semibold text-ink shadow-overlay transition-[opacity,transform] duration-200 ease-out data-[hidden=true]:pointer-events-none data-[hidden=true]:translate-y-2 data-[hidden=true]:opacity-0"
        data-hidden={!showJump}
      >
        <ArrowDown size={16} aria-hidden />
        {missed > 0 && <span className="tabular-nums text-accent-ink">{missed} new</span>}
      </button>
    </div>
  );
}
