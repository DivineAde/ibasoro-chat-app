import { useCallback, useEffect, useRef, useState } from "react";
import { MAX_VOICE_SECONDS, normalizePeaks } from "../lib/media";

const MIME_PREFERENCE = ["audio/webm;codecs=opus", "audio/mp4", "audio/webm", "audio/ogg;codecs=opus"];
const LEVEL_BARS = 32;

export const recordingSupported = () =>
  typeof navigator !== "undefined" && Boolean(navigator.mediaDevices?.getUserMedia) && typeof MediaRecorder !== "undefined";

/**
 * Record a voice note.
 *   const rec = useVoiceRecorder();
 *   await rec.start();            // asks for the microphone
 *   const note = await rec.stop();  // { file, duration, waveform } – or null if too short
 *   rec.cancel();
 * `rec.elapsed` (seconds) and `rec.levels` (recent loudness, 0–1) drive the live UI.
 * Auto-stops at the maximum length and calls `onLimit` with the finished note.
 */
export function useVoiceRecorder({ onLimit } = {}) {
  const [status, setStatus] = useState("idle"); // idle | requesting | recording
  const [elapsed, setElapsed] = useState(0);
  const [levels, setLevels] = useState(() => Array(LEVEL_BARS).fill(0));
  const [error, setError] = useState(null); // "denied" | "unsupported" | "failed"
  const session = useRef(null);
  const limitRef = useRef(onLimit);
  limitRef.current = onLimit;

  const teardown = useCallback(() => {
    const s = session.current;
    if (!s) return;
    clearInterval(s.timer);
    cancelAnimationFrame(s.raf);
    s.stream.getTracks().forEach((t) => t.stop());
    s.audioContext?.close().catch(() => {});
    session.current = null;
  }, []);

  useEffect(() => () => {
    const s = session.current;
    if (s) s.recorder.onstop = null;
    teardown();
  }, [teardown]);

  const finish = useCallback(
    () =>
      new Promise((resolve) => {
        const s = session.current;
        if (!s) return resolve(null);
        s.recorder.onstop = () => {
          const duration = (Date.now() - s.startedAt) / 1000;
          const { samples, mime } = s;
          const blob = new Blob(s.chunks, { type: mime });
          teardown();
          setStatus("idle");
          setElapsed(0);
          setLevels(Array(LEVEL_BARS).fill(0));
          if (duration < 0.6 || blob.size < 500) return resolve(null); // an accidental tap
          const ext = mime.includes("mp4") ? "m4a" : mime.includes("ogg") ? "ogg" : "webm";
          resolve({
            file: new File([blob], `voice-note.${ext}`, { type: mime }),
            duration: Math.round(duration),
            waveform: normalizePeaks(samples, 48),
          });
        };
        s.recorder.stop();
      }),
    [teardown]
  );

  const start = useCallback(async () => {
    if (session.current || status !== "idle") return false;
    if (!recordingSupported()) {
      setError("unsupported");
      return false;
    }
    setError(null);
    setStatus("requesting");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
      const mime = MIME_PREFERENCE.find((m) => MediaRecorder.isTypeSupported?.(m)) || "";
      const recorder = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
      const s = {
        stream,
        recorder,
        chunks: [],
        samples: [],
        mime: (recorder.mimeType || mime || "audio/webm").split(";")[0],
        startedAt: Date.now(),
      };
      recorder.ondataavailable = (e) => e.data.size && s.chunks.push(e.data);

      // Live loudness for the meter, and the samples that become the stored waveform.
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        s.audioContext = new AudioCtx();
        const analyser = s.audioContext.createAnalyser();
        analyser.fftSize = 512;
        s.audioContext.createMediaStreamSource(stream).connect(analyser);
        const data = new Uint8Array(analyser.fftSize);
        let last = 0;
        const tick = (t) => {
          analyser.getByteTimeDomainData(data);
          let sum = 0;
          for (const v of data) sum += ((v - 128) / 128) ** 2;
          const level = Math.min(1, Math.sqrt(sum / data.length) * 3.2);
          if (t - last > 90) {
            last = t;
            s.samples.push(level);
            setLevels((prev) => [...prev.slice(1), level]);
          }
          s.raf = requestAnimationFrame(tick);
        };
        s.raf = requestAnimationFrame(tick);
      }

      s.timer = setInterval(() => {
        const seconds = (Date.now() - s.startedAt) / 1000;
        setElapsed(seconds);
        if (seconds >= MAX_VOICE_SECONDS) finish().then((note) => note && limitRef.current?.(note));
      }, 200);

      session.current = s;
      recorder.start(250);
      setStatus("recording");
      return true;
    } catch (e) {
      teardown();
      setStatus("idle");
      setError(e?.name === "NotAllowedError" || e?.name === "SecurityError" ? "denied" : "failed");
      return false;
    }
  }, [status, finish, teardown]);

  const cancel = useCallback(() => {
    const s = session.current;
    if (s) s.recorder.onstop = null;
    try {
      s?.recorder.state !== "inactive" && s?.recorder.stop();
    } catch {
      /* already stopped */
    }
    teardown();
    setStatus("idle");
    setElapsed(0);
    setLevels(Array(LEVEL_BARS).fill(0));
  }, [teardown]);

  return { status, elapsed, levels, error, start, stop: finish, cancel, clearError: () => setError(null) };
}
