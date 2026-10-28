import { Download } from "lucide-react";
import { cn } from "../../../lib/cn";
import { extensionOf, formatBytes } from "../../../lib/media";

/** Document tile: extension badge, name, size. The whole tile opens/downloads the file. */
export function FileContent({ message, mine }) {
  const a = message.attachment;
  const uploading = message.status === "sending" && typeof message.progress === "number";
  const pending = message.status === "sending";
  return (
    <div className="min-w-[13rem] max-w-full">
      <a
        href={pending ? undefined : a.url}
        target="_blank"
        rel="noopener noreferrer"
        download={a.name}
        aria-label={`${a.name}, ${formatBytes(a.size)}. Open`}
        className={cn("press flex items-center gap-3 rounded-[12px] p-1.5 pr-2.5", !pending && (mine ? "hover:bg-white/10" : "hover:bg-ink/5"))}
      >
        <span
          aria-hidden
          className={cn(
            "flex h-11 w-11 shrink-0 items-center justify-center rounded-[10px] text-[11px] font-bold tracking-wide",
            mine ? "bg-white/20 text-white" : "bg-accent-soft text-accent-ink"
          )}
        >
          {extensionOf(a.name)}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-subhead font-semibold">{a.name}</span>
          <span className={cn("block text-footnote", mine ? "text-white/75" : "text-ink-2")}>
            {uploading ? `${Math.round(message.progress * 100)}% of ${formatBytes(a.size)}` : formatBytes(a.size)}
          </span>
        </span>
        {!pending && <Download size={18} aria-hidden className={mine ? "text-white/80" : "text-ink-2"} />}
      </a>
      {uploading && (
        <div className="mx-1.5 mb-1 mt-1 h-1 overflow-hidden rounded-full bg-black/15" role="progressbar" aria-valuenow={Math.round(message.progress * 100)} aria-valuemin={0} aria-valuemax={100}>
          <div className="h-full rounded-full bg-white/90 transition-[width] duration-200 ease-out" style={{ width: `${Math.max(4, message.progress * 100)}%` }} />
        </div>
      )}
    </div>
  );
}
