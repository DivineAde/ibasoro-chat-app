import { storage } from "./storage";

const SOUND_KEY = "ibasoro:sound";
export const isSoundOn = () => storage.get(SOUND_KEY, true);
export const setSoundOn = (on) => storage.set(SOUND_KEY, on);

let ctx;

/** A short, soft two-note "pop" synthesised with Web Audio (no asset needed). */
export const playReceive = () => {
  if (!isSoundOn()) return;
  try {
    ctx = ctx || new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state === "suspended") ctx.resume();
    const now = ctx.currentTime;
    [
      [660, 0],
      [880, 0.08],
    ].forEach(([freq, offset]) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, now + offset);
      gain.gain.exponentialRampToValueAtTime(0.08, now + offset + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + offset + 0.16);
      osc.connect(gain).connect(ctx.destination);
      osc.start(now + offset);
      osc.stop(now + offset + 0.18);
    });
  } catch {
    /* autoplay blocked – ignore */
  }
};

