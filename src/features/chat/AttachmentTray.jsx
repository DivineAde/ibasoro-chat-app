import { FileText, Loader2, X } from "lucide-react";
import { extensionOf, formatBytes } from "../../lib/media";

/** Files waiting to be sent, shown above the input. Each can be removed. */
export function AttachmentTray({ items, onRemove }) {
  if (!items.length) return null;
  return (
    <ul aria-label="Attachments to send" className="mx-auto flex max-w-3xl gap-2.5 overflow-x-auto px-1.5 pb-2.5 pt-2">
      {items.map((item) => (
        <li key={item.id} className="relative shrink-0 animate-pop-in">
          {item.kind === "image" ? (
            <div className="relative h-16 w-16 overflow-hidden rounded-[14px] bg-sunken ring-1 ring-inset ring-line">
              <img src={item.previewUrl} alt={item.file.name} className="h-full w-full object-cover" draggable={false} />
              {item.preparing && (
                <span className="absolute inset-0 flex items-center justify-center bg-black/35 text-white">
                  <Loader2 size={18} className="animate-spin" aria-label="Preparing" />
                </span>
              )}
            </div>
          ) : (
            <div className="flex h-16 w-44 items-center gap-2.5 rounded-[14px] bg-sunken px-2.5 ring-1 ring-inset ring-line">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] bg-accent-soft text-[10px] font-bold text-accent-ink" aria-hidden>
                {extensionOf(item.file.name) === "FILE" ? <FileText size={18} /> : extensionOf(item.file.name)}
              </span>
              <span className="min-w-0">
                <span className="block truncate text-footnote font-semibold text-ink">{item.file.name}</span>
                <span className="block text-caption text-ink-3">{formatBytes(item.file.size)}</span>
              </span>
            </div>
          )}
          <button
            type="button"
            onClick={() => onRemove(item.id)}
            aria-label={`Remove ${item.file.name}`}
            className="press absolute -right-1.5 -top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-ink text-canvas shadow-raised after:absolute after:-inset-2 after:content-['']"
          >
            <X size={13} strokeWidth={3} aria-hidden />
          </button>
        </li>
      ))}
    </ul>
  );
}
