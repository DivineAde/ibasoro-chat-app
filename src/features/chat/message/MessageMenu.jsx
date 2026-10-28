import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Copy, Download, Pencil, Reply, Trash2 } from "lucide-react";
import { cn } from "../../../lib/cn";
import { REACTIONS, myReaction } from "../../../lib/reactions";
import { useMediaQuery } from "../../../hooks/useMediaQuery";

const GAP = 8;
const MARGIN = 12;

function Item({ icon: Icon, danger, onClick, children }) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      className={cn(
        "flex h-11 w-full items-center gap-3 rounded-[10px] px-3 text-left text-subhead outline-none transition-colors duration-120 hover:bg-ink/5 focus-visible:bg-ink/5",
        danger ? "text-danger" : "text-ink"
      )}
    >
      <Icon size={18} aria-hidden className={danger ? "" : "text-ink-2"} />
      {children}
    </button>
  );
}

/**
 * Reactions + actions for one message.
 * Phones: a bottom sheet over a scrim. Desktop: a popover that sits beside the bubble,
 * flipping above it when there isn't room below.
 */
export function MessageMenu({ message, anchor, mine, meId, canEdit, onClose, onReact, onReply, onEdit, onCopy, onDelete }) {
  const sheet = useMediaQuery("(max-width: 639px)");
  const panel = useRef(null);
  const [pos, setPos] = useState(null);
  const current = myReaction(message.reactions, meId);
  const a = message.attachment;

  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    panel.current?.querySelector("button")?.focus({ preventScroll: true });
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  // Close if the page scrolls or resizes: the anchor would no longer match.
  useEffect(() => {
    if (sheet) return undefined;
    window.addEventListener("resize", onClose);
    return () => window.removeEventListener("resize", onClose);
  }, [sheet, onClose]);

  useLayoutEffect(() => {
    if (sheet || !panel.current) return;
    const { width, height } = panel.current.getBoundingClientRect();
    const below = anchor.bottom + GAP + height <= window.innerHeight - MARGIN;
    const top = below ? anchor.bottom + GAP : Math.max(MARGIN, anchor.top - GAP - height);
    const preferred = mine ? anchor.right - width : anchor.left;
    const left = Math.min(Math.max(MARGIN, preferred), window.innerWidth - width - MARGIN);
    setPos({ top, left, origin: `${below ? "top" : "bottom"} ${mine ? "right" : "left"}` });
  }, [sheet, anchor, mine]);

  const act = (fn) => () => {
    onClose();
    fn();
  };

  return createPortal(
    <div className="fixed inset-0 z-50" onContextMenu={(e) => e.preventDefault()}>
      <div className="absolute inset-0 animate-fade-in bg-[var(--scrim)]" onPointerDown={onClose} aria-hidden />
      <div
        ref={panel}
        role="menu"
        aria-label="Message actions"
        style={sheet ? undefined : { top: pos?.top ?? 0, left: pos?.left ?? 0, transformOrigin: pos?.origin, visibility: pos ? "visible" : "hidden" }}
        className={cn(
          "absolute w-[min(17rem,calc(100vw-24px))] rounded-[20px] bg-raised p-1.5 shadow-overlay",
          sheet
            ? "inset-x-0 bottom-0 w-full animate-sheet-in rounded-b-none pb-[calc(var(--safe-bottom)+10px)] pt-3"
            : "animate-pop-in"
        )}
      >
        <div role="group" aria-label="React" className="mb-1 flex items-center justify-between rounded-full bg-sunken px-1.5 py-1">
          {REACTIONS.map((emoji) => (
            <button
              key={emoji}
              type="button"
              onClick={act(() => onReact(current === emoji ? null : emoji))}
              aria-label={`React ${emoji}`}
              aria-pressed={current === emoji}
              className={cn(
                "press flex h-10 w-10 items-center justify-center rounded-full text-[22px] transition-transform duration-160 ease-out hover:scale-125",
                current === emoji && "bg-accent-soft ring-2 ring-accent-ink/40"
              )}
            >
              {emoji}
            </button>
          ))}
        </div>

        <Item icon={Reply} onClick={act(onReply)}>Reply</Item>
        {(message.type || "text") === "text" && <Item icon={Copy} onClick={act(onCopy)}>Copy</Item>}
        {a && !message.status && (
          <a role="menuitem" href={a.url} download={a.name} target="_blank" rel="noopener noreferrer" onClick={onClose}
            className="flex h-11 w-full items-center gap-3 rounded-[10px] px-3 text-subhead text-ink outline-none hover:bg-ink/5 focus-visible:bg-ink/5">
            <Download size={18} aria-hidden className="text-ink-2" /> Save
          </a>
        )}
        {canEdit && <Item icon={Pencil} onClick={act(onEdit)}>Edit</Item>}
        {mine && <Item icon={Trash2} danger onClick={act(onDelete)}>Delete</Item>}
      </div>
    </div>,
    document.body
  );
}
