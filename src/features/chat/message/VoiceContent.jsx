import { useEffect, useMemo, useRef, useState } from "react";
import { Loader2, Pause, Play } from "lucide-react";
import { cn } from "../../../lib/cn";
import { formatDuration, playbackUrl, pseudoPeaks } from "../../../lib/media";

const RATES = [1, 1.5, 2];

// Only one voice note plays at a time: starting another stops the previous.
let stopActive = null;

/** Play/pause, a tappable waveform that doubles as a scrubber, and a speed toggle. */
export function VoiceContent({ message, mine }) {
  const a = message.attachment;
  const peaks = useMemo(() => (a.waveform?.length ? a.waveform : pseudoPeaks(message._id)), [a.waveform, message._id]);
  const total = a.duration || 0;

  const audio = useRef(null);
  const [state, setState] = useState("idle"); // idle | loading | playing | paused
  const [elapsed, setElapsed] = useState(0);
  const [rate, setRate] = useState(1);
  const [failed, setFailed] = useState(false);
  const pending = message.status === "sending";

  const halt = () => {
    audio.current?.pause();
    setState("paused");
  };

  useEffect(
    () => () => {
      audio.current?.pause();
      audio.current = null;
      if (stopActive === halt) stopActive = null;
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const ensureAudio = () => {
    if (audio.current) return audio.current;
    const el = new Audio(playbackUrl(a.url));
    el.preload = "auto";
    el.addEventListener("timeupdate", () => setElapsed(el.currentTime));
    el.addEventListener("playing", () => setState("playing"));
    el.addEventListener("waiting", () => setState("loading"));
    el.addEventListener("pause", () => !el.ended && setState("paused"));
    el.addEventListener("ended", () => {
      setState("idle");
      setElapsed(0);
      el.currentTime = 0;
    });
    el.addEventListener("error", () => {
      setFailed(true);
      setState("idle");
    });
    audio.current = el;
    return el;
  };

  const toggle = async () => {
    const el = ensureAudio();
    if (state === "playing") return halt();
    if (stopActive && stopActive !== halt) stopActive();
    stopActive = halt;
    el.playbackRate = rate;
    setFailed(false);
    setState("loading");
    try {
      await el.play();
    } catch {
      setFailed(true);
      setState("idle");
    }
  };

  const cycleRate = () => {
    const next = RATES[(RATES.indexOf(rate) + 1) % RATES.length];
    setRate(next);
    if (audio.current) audio.current.playbackRate = next;
  };

  const seek = (e) => {
    const el = audio.current;
    const duration = el?.duration && Number.isFinite(el.duration) ? el.duration : total;
    if (!el || !duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    el.currentTime = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width)) * duration;
    setElapsed(el.currentTime);
  };

  const length = audio.current?.duration && Number.isFinite(audio.current.duration) ? audio.current.duration : total;
  const progress = length ? Math.min(1, elapsed / length) : 0;
  const active = state !== "idle";
  const uploading = pending && typeof message.progress === "number";
  const Icon = state === "loading" ? Loader2 : state === "playing" ? Pause : Play;

  return (
    <div className="flex w-[15.5rem] max-w-full items-center gap-2.5">
      <button
        type="button"
        onClick={toggle}
        disabled={pending}
        aria-label={state === "playing" ? "Pause voice message" : "Play voice message"}
        className={cn(
          "press flex h-10 w-10 shrink-0 items-center justify-center rounded-full",
          mine ? "bg-white text-accent" : "bg-accent text-accent-fg",
          pending && "opacity-60"
        )}
      >
        <Icon size={18} aria-hidden className={cn(state === "loading" && "animate-spin", state !== "playing" && state !== "loading" && "translate-x-px")} fill={state === "loading" ? "none" : "currentColor"} />
      </button>

      <div className="min-w-0 flex-1">
        <div
          role="slider"
          tabIndex={0}
          aria-label="Voice message position"
          aria-valuemin={0}
          aria-valuemax={Math.round(length)}
          aria-valuenow={Math.round(elapsed)}
          aria-valuetext={`${formatDuration(elapsed)} of ${formatDuration(length)}`}
          onClick={seek}
          onKeyDown={(e) => {
            const el = audio.current;
            if (!el) return;
            if (e.key === "ArrowRight") el.currentTime = Math.min(length, el.currentTime + 5);
            else if (e.key === "ArrowLeft") el.currentTime = Math.max(0, el.currentTime - 5);
            else return;
            e.preventDefault();
          }}
          className="flex h-8 cursor-pointer items-center gap-[2px]"
        >
          {peaks.map((p, i) => (
            <span
              key={i}
              aria-hidden
              style={{ height: `${Math.max(14, p)}%` }}
              className={cn(
                "w-[3px] flex-1 rounded-full transition-colors duration-100",
                i / peaks.length < progress
                  ? mine ? "bg-white" : "bg-accent-ink"
                  : mine ? "bg-white/40" : "bg-ink/25"
              )}
            />
          ))}
        </div>
        <div className="mt-0.5 flex items-center justify-between text-caption tabular-nums">
          <span className={mine ? "text-white/80" : "text-ink-2"}>
            {failed ? "Can’t play" : uploading ? `Sending ${Math.round(message.progress * 100)}%` : formatDuration(active ? elapsed : total)}
          </span>
          {active && (
            <button
              type="button"
              onClick={cycleRate}
              aria-label={`Playback speed ${rate}×`}
              className={cn("press -my-1 rounded-full px-2 py-1 text-caption font-bold", mine ? "bg-white/20 text-white" : "bg-ink/10 text-ink")}
            >
              {rate}×
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
