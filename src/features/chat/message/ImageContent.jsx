import { useState } from "react";
import { ImageOff, X } from "lucide-react";
import { cn } from "../../../lib/cn";
import { thumbUrl } from "../../../lib/media";

const MAX_W = 300;
const MAX_H = 380;

/** Size the box from the photo's real dimensions so the transcript never jumps when it loads. */
const boxFor = ({ width, height }) => {
  const ratio = width && height ? width / height : 4 / 3;
  let w = Math.min(MAX_W, width || MAX_W);
  let h = w / ratio;
  if (h > MAX_H) {
    h = MAX_H;
    w = h * ratio;
  }
  return { width: Math.max(w, 120), aspectRatio: ratio };
};

function ProgressRing({ value, onCancel }) {
  const r = 17;
  const c = 2 * Math.PI * r;
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-black/25">
      <button
        type="button"
        onClick={onCancel}
        aria-label={`Uploading ${Math.round(value * 100)}%. Cancel`}
        className="press relative flex h-12 w-12 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-sm"
      >
        <svg viewBox="0 0 40 40" className="absolute inset-0 -rotate-90" aria-hidden>
          <circle cx="20" cy="20" r={r} fill="none" stroke="white" strokeOpacity="0.25" strokeWidth="2.5" />
          <circle
            cx="20"
            cy="20"
            r={r}
            fill="none"
            stroke="white"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeDasharray={c}
            strokeDashoffset={c * (1 - Math.max(0.06, value))}
            className="transition-[stroke-dashoffset] duration-200 ease-out"
          />
        </svg>
        <X size={16} aria-hidden />
      </button>
    </div>
  );
}

export function ImageContent({ message, onOpen, onCancel }) {
  const a = message.attachment;
  const [loaded, setLoaded] = useState(false);
  const [broken, setBroken] = useState(false);
  const [fallback, setFallback] = useState(false);
  const uploading = message.status === "sending" && typeof message.progress === "number";
  const src = fallback ? a.url : thumbUrl(a.url);

  return (
    <div className="relative max-w-full overflow-hidden rounded-[17px] bg-sunken" style={boxFor(a)}>
      {broken ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 text-footnote text-ink-3">
          <ImageOff size={22} aria-hidden />
          Photo unavailable
        </div>
      ) : (
        <button
          type="button"
          onClick={() => onOpen?.(message)}
          aria-label={`Open photo${a.name ? `: ${a.name}` : ""}`}
          className="absolute inset-0 block h-full w-full"
        >
          <img
            src={src}
            alt={message.content || a.name || "Photo"}
            width={a.width}
            height={a.height}
            loading="lazy"
            decoding="async"
            draggable={false}
            onLoad={() => setLoaded(true)}
            // A transformed URL can be refused (strict transformations): retry the original once.
            onError={() => (fallback || src === a.url ? setBroken(true) : setFallback(true))}
            className={cn("h-full w-full object-cover transition-opacity duration-300 ease-out", loaded ? "opacity-100" : "opacity-0")}
          />
        </button>
      )}
      {!loaded && !broken && <div aria-hidden className="absolute inset-0 animate-pulse bg-ink/5" />}
      {uploading && <ProgressRing value={message.progress} onCancel={onCancel} />}
    </div>
  );
}
