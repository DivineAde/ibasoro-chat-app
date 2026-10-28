import { ArrowUp, Trash2 } from "lucide-react";
import { formatDuration } from "../../lib/media";

/** Replaces the text field while a voice note is being recorded. */
export function RecordingBar({ elapsed, levels, onCancel, onSend }) {
  return (
    <div className="mx-auto flex max-w-3xl animate-pop-in items-center gap-2" role="group" aria-label="Recording voice message">
      <button
        type="button"
        onClick={onCancel}
        aria-label="Cancel recording"
        className="press relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-danger hover:bg-danger-soft after:absolute after:-inset-1 after:content-['']"
      >
        <Trash2 size={20} aria-hidden />
      </button>

      <div className="flex min-h-[44px] min-w-0 flex-1 items-center gap-3 rounded-[22px] bg-sunken px-4 ring-1 ring-inset ring-line">
        <span aria-hidden className="h-2.5 w-2.5 shrink-0 animate-pulse rounded-full bg-danger" />
        <span className="w-10 shrink-0 text-subhead font-semibold tabular-nums text-ink" aria-live="off">{formatDuration(elapsed)}</span>
        <div aria-hidden className="flex h-7 min-w-0 flex-1 items-center justify-end gap-[3px] overflow-hidden">
          {levels.map((v, i) => (
            <span key={i} className="w-[3px] shrink-0 rounded-full bg-ink-3 transition-[height] duration-100" style={{ height: `${Math.max(14, v * 100)}%` }} />
          ))}
        </div>
      </div>

      <button
        type="button"
        onClick={onSend}
        aria-label="Send voice message"
        className="press relative mb-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent text-accent-fg shadow-raised hover:bg-accent-hover after:absolute after:-inset-1 after:content-['']"
      >
        <ArrowUp size={20} strokeWidth={2.5} aria-hidden />
      </button>
    </div>
  );
}
