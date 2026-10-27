import { useEffect, useId, useRef, useState } from "react";
import { X } from "lucide-react";
import { cn } from "../../lib/cn";
import { IconButton } from "./IconButton";

/**
 * Modal built on the native <dialog> element, so focus trapping, Escape,
 * inertness of the page behind it and focus restoration come from the browser.
 *
 * Presents as a bottom sheet on phones and a centred card from `sm` up, with
 * an exit animation that is faster than the entrance.
 */
export function Dialog({ open, onClose, title, description, children, footer, size = "md", className }) {
  const ref = useRef(null);
  const titleId = useId();
  const descId = useId();
  const [mounted, setMounted] = useState(open);
  const [closing, setClosing] = useState(false);

  useEffect(() => {
    if (open) {
      setMounted(true);
      setClosing(false);
    } else if (mounted) {
      setClosing(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    const dialog = ref.current;
    if (mounted && dialog && !dialog.open) dialog.showModal();
  }, [mounted]);

  const finishClosing = (e) => {
    if (!closing || e.target !== ref.current) return;
    ref.current?.close();
    setMounted(false);
    setClosing(false);
  };

  if (!mounted) return null;

  return (
    <dialog
      ref={ref}
      aria-labelledby={title ? titleId : undefined}
      aria-describedby={description ? descId : undefined}
      data-closing={closing || undefined}
      onCancel={(e) => {
        e.preventDefault(); // we control closing so the exit animation can play
        onClose();
      }}
      onClick={(e) => e.target === ref.current && onClose()} // backdrop click
      onAnimationEnd={finishClosing}
      className={cn(
        // Native <dialog> is `position: fixed; inset: 0` with auto margins. A top auto
        // margin pins it to the bottom (sheet); `sm:my-auto` centres it (card).
        "mx-auto mb-0 mt-auto w-full max-w-full bg-transparent p-0 text-ink outline-none sm:my-auto",
        size === "sm" && "sm:max-w-sm",
        size === "md" && "sm:max-w-md",
        size === "lg" && "sm:max-w-lg",
        closing ? "animate-sheet-out sm:animate-pop-out" : "animate-sheet-in sm:animate-pop-in",
        "origin-center"
      )}
    >
      <div
        className={cn(
          "flex max-h-[min(88dvh,720px)] flex-col overflow-hidden bg-raised shadow-overlay",
          "rounded-t-[28px] pb-[var(--safe-bottom)] sm:rounded-[28px] sm:pb-0",
          className
        )}
      >
        {/* Grabber – only meaningful as a visual cue on phones */}
        <div aria-hidden className="mx-auto mt-2 h-1 w-9 rounded-full bg-ink/15 sm:hidden" />
        <header className="flex items-start justify-between gap-3 px-5 pb-2 pt-4">
          <div className="min-w-0">
            {title && (
              <h2 id={titleId} className="text-title3 text-ink">
                {title}
              </h2>
            )}
            {description && (
              <p id={descId} className="mt-0.5 text-subhead text-ink-2">
                {description}
              </p>
            )}
          </div>
          <IconButton label="Close" icon={X} size="sm" variant="soft" onClick={onClose} className="-mr-1" />
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-5 pt-2">{children}</div>
        {footer && <footer className="flex items-center justify-end gap-2 border-t border-line px-5 py-3">{footer}</footer>}
      </div>
    </dialog>
  );
}
