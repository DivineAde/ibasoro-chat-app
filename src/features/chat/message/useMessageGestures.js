import { useCallback, useRef } from "react";

const LONG_PRESS_MS = 420;
const SLOP = 8; // px of movement before a press stops being a press
const REPLY_AT = 56; // px of rightward drag that commits a reply

/**
 * Touch gestures for one bubble:
 *  – long-press opens the action menu
 *  – drag right past a threshold replies (the bubble follows the finger, then springs back)
 * Mouse and pen are ignored: desktop uses the hover toolbar and right-click instead.
 * Transform is written straight to the DOM so dragging never re-renders React.
 */
export function useMessageGestures({ onMenu, onReply, enabled }) {
  const bubble = useRef(null);
  const hint = useRef(null);
  const gesture = useRef(null);

  const reset = useCallback((animate = true) => {
    clearTimeout(gesture.current?.timer);
    gesture.current = null;
    if (bubble.current) {
      bubble.current.style.transition = animate ? "transform 260ms cubic-bezier(0.32, 0.72, 0, 1)" : "none";
      bubble.current.style.transform = "";
    }
    if (hint.current) {
      hint.current.style.transition = "opacity 160ms, transform 160ms";
      hint.current.style.opacity = "0";
    }
  }, []);

  const onPointerDown = (e) => {
    if (!enabled || e.pointerType !== "touch") return;
    const g = { x: e.clientX, y: e.clientY, dx: 0, locked: false, fired: false };
    g.timer = setTimeout(() => {
      if (gesture.current !== g || g.locked) return;
      g.fired = true;
      navigator.vibrate?.(10);
      onMenu(bubble.current.getBoundingClientRect());
    }, LONG_PRESS_MS);
    gesture.current = g;
  };

  const onPointerMove = (e) => {
    const g = gesture.current;
    if (!g || g.fired) return;
    const dx = e.clientX - g.x;
    const dy = e.clientY - g.y;
    if (!g.locked) {
      if (Math.abs(dx) > SLOP || Math.abs(dy) > SLOP) clearTimeout(g.timer); // moving: not a long-press
      if (dx > SLOP && dx > Math.abs(dy) * 1.5) {
        g.locked = true;
        bubble.current.style.transition = "none";
      } else return;
    }
    // Rubber-band: resistance grows past the threshold.
    g.dx = dx <= REPLY_AT ? Math.max(0, dx) : REPLY_AT + (dx - REPLY_AT) * 0.25;
    bubble.current.style.transform = `translateX(${g.dx}px)`;
    if (hint.current) {
      const t = Math.min(1, g.dx / REPLY_AT);
      hint.current.style.transition = "none";
      hint.current.style.opacity = String(t);
      hint.current.style.transform = `scale(${0.6 + 0.4 * t})`;
    }
    if (!g.crossed && g.dx >= REPLY_AT) {
      g.crossed = true;
      navigator.vibrate?.(8);
    }
  };

  const onPointerUp = () => {
    const g = gesture.current;
    if (g?.locked && g.dx >= REPLY_AT) onReply();
    reset();
  };

  return {
    bubbleRef: bubble,
    hintRef: hint,
    handlers: { onPointerDown, onPointerMove, onPointerUp, onPointerCancel: () => reset() },
    suppressClick: () => Boolean(gesture.current?.fired),
  };
}
