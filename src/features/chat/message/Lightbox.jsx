import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Download, X } from "lucide-react";
import { cn } from "../../../lib/cn";
import { IconButton } from "../../../components/ui/IconButton";
import { thumbUrl } from "../../../lib/media";

/**
 * Full-screen photo viewer across every photo in the conversation.
 * Native <dialog>: Escape, focus trap and inert background are free.
 * ← / → move between photos.
 */
export function Lightbox({ images, startId, onClose }) {
  const ref = useRef(null);
  const [index, setIndex] = useState(() => Math.max(0, images.findIndex((m) => m._id === startId)));
  const [closing, setClosing] = useState(false);
  const current = images[index];

  useEffect(() => {
    ref.current?.showModal();
  }, []);

  const go = (d) => setIndex((i) => Math.min(images.length - 1, Math.max(0, i + d)));
  const close = () => setClosing(true);

  const onKeyDown = (e) => {
    if (e.key === "ArrowRight") go(1);
    else if (e.key === "ArrowLeft") go(-1);
  };

  if (!current) return null;
  const { attachment: a } = current;

  return (
    <dialog
      ref={ref}
      aria-label="Photo viewer"
      onKeyDown={onKeyDown}
      onCancel={(e) => {
        e.preventDefault();
        close();
      }}
      onAnimationEnd={(e) => closing && e.target === ref.current && onClose()}
      className={cn(
        "m-0 h-[100dvh] max-h-none w-screen max-w-none overflow-hidden bg-black/90 p-0 text-white backdrop:bg-transparent",
        closing ? "animate-fade-out" : "animate-fade-in"
      )}
    >
      <div className="absolute inset-x-0 top-0 z-10 flex items-center gap-1 bg-gradient-to-b from-black/60 to-transparent px-3 pb-8 pt-[calc(var(--safe-top)+10px)]">
        <IconButton label="Close" icon={X} onClick={close} className="text-white hover:bg-white/15 hover:text-white" />
        <div className="min-w-0 flex-1 px-2 text-center">
          <p className="truncate text-subhead font-semibold">{current.sender?.name}</p>
          {images.length > 1 && <p className="text-caption text-white/70 tabular-nums">{index + 1} of {images.length}</p>}
        </div>
        <a
          href={a.url}
          download={a.name}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Download photo"
          title="Download photo"
          className="press relative inline-flex h-11 w-11 items-center justify-center rounded-full text-white hover:bg-white/15"
        >
          <Download size={20} aria-hidden />
        </a>
      </div>

      <div className="flex h-full w-full items-center justify-center p-4 pb-[calc(var(--safe-bottom)+16px)] pt-20" onClick={(e) => e.target === e.currentTarget && close()}>
        <img
          key={current._id}
          src={thumbUrl(a.url, 1800)}
          onError={(e) => {
            if (e.currentTarget.src !== a.url) e.currentTarget.src = a.url;
          }}
          alt={current.content || a.name || "Photo"}
          className="max-h-full max-w-full animate-pop-in rounded-lg object-contain shadow-overlay"
          draggable={false}
        />
      </div>

      {current.content && (
        <p className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-6 pb-[calc(var(--safe-bottom)+16px)] pt-10 text-center text-body">{current.content}</p>
      )}

      {images.length > 1 && (
        <>
          <IconButton label="Previous photo" icon={ChevronLeft} onClick={() => go(-1)} disabled={index === 0} className="absolute left-3 top-1/2 -translate-y-1/2 bg-black/40 text-white hover:bg-black/60 hover:text-white max-sm:hidden" />
          <IconButton label="Next photo" icon={ChevronRight} onClick={() => go(1)} disabled={index === images.length - 1} className="absolute right-3 top-1/2 -translate-y-1/2 bg-black/40 text-white hover:bg-black/60 hover:text-white max-sm:hidden" />
        </>
      )}
    </dialog>
  );
}
