import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { ArrowUp } from "lucide-react";
import { cn } from "../../lib/cn";
import { useMediaQuery } from "../../hooks/useMediaQuery";
import { useChatActions } from "../../context/ChatContext";

export const MAX_LENGTH = 4000;
const SHOW_COUNTER_AT = 3500;
const MAX_HEIGHT = 160; // ~6 lines
const TYPING_IDLE_MS = 2500;

// Unsent text survives switching chats (kept for the lifetime of the tab).
const drafts = new Map();

/**
 * Message input.
 *  – Enter sends, Shift+Enter adds a line (on touch keyboards Enter adds a line)
 *  – grows with content, then scrolls
 *  – tells the other side when you start / stop typing
 * Mount with `key={chatId}` so each chat gets its own draft and typing state.
 */
export function Composer({ chatId }) {
  const { sendMessage, emitTyping } = useChatActions();
  const [text, setText] = useState(() => drafts.get(chatId) || "");
  const field = useRef(null);
  const typing = useRef({ on: false, timer: null });
  const touch = useMediaQuery("(pointer: coarse)");

  const canSend = text.trim().length > 0;

  useLayoutEffect(() => {
    const el = field.current;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, MAX_HEIGHT)}px`;
  }, [text]);

  const stopTyping = useCallback(() => {
    const t = typing.current;
    clearTimeout(t.timer);
    if (t.on) {
      t.on = false;
      emitTyping(chatId, false);
    }
  }, [chatId, emitTyping]);

  useEffect(() => stopTyping, [stopTyping]);

  const onChange = (e) => {
    const value = e.target.value;
    setText(value);
    if (value) drafts.set(chatId, value);
    else drafts.delete(chatId);

    const t = typing.current;
    if (!value.trim()) return stopTyping();
    if (!t.on) {
      t.on = true;
      emitTyping(chatId, true);
    }
    clearTimeout(t.timer);
    t.timer = setTimeout(stopTyping, TYPING_IDLE_MS);
  };

  const send = () => {
    if (!canSend) return;
    sendMessage(chatId, text);
    setText("");
    drafts.delete(chatId);
    stopTyping();
    field.current?.focus();
  };

  const onKeyDown = (e) => {
    if (e.key !== "Enter" || e.shiftKey || touch || e.nativeEvent.isComposing) return;
    e.preventDefault();
    send();
  };

  return (
    <div className="glass border-t border-line px-3 pb-[calc(var(--safe-bottom)+10px)] pt-2.5 md:px-6">
      <div className="mx-auto flex max-w-3xl items-end gap-2">
        <div className="flex min-w-0 flex-1 items-end rounded-[22px] bg-sunken ring-1 ring-inset ring-line transition-shadow duration-160 ease-out focus-within:ring-2 focus-within:ring-accent-ink">
          <textarea
            ref={field}
            rows={1}
            value={text}
            maxLength={MAX_LENGTH}
            onChange={onChange}
            onKeyDown={onKeyDown}
            onBlur={stopTyping}
            aria-label="Message"
            placeholder="Message"
            enterKeyHint={touch ? "enter" : "send"}
            autoComplete="off"
            className="max-h-40 min-h-[44px] min-w-0 flex-1 resize-none bg-transparent px-4 py-[11px] text-body text-ink outline-none placeholder:text-ink-3"
          />
          {text.length >= SHOW_COUNTER_AT && (
            <span className={cn("pb-3 pr-3 text-caption tabular-nums", text.length >= MAX_LENGTH ? "text-danger" : "text-ink-3")}>
              {MAX_LENGTH - text.length}
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={send}
          // Keep focus in the field so the touch keyboard doesn't collapse on every send.
          onPointerDown={(e) => e.preventDefault()}
          disabled={!canSend}
          aria-label="Send message"
          className={cn(
            "press relative mb-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full",
            "after:absolute after:-inset-1 after:content-['']",
            canSend ? "bg-accent text-accent-fg shadow-raised hover:bg-accent-hover" : "bg-ink/10 text-ink-3"
          )}
        >
          <ArrowUp size={20} strokeWidth={2.5} aria-hidden />
        </button>
      </div>
    </div>
  );
}
