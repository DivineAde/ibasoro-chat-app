import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";
import { AlertCircle, CheckCircle2, Info } from "lucide-react";
import { cn } from "../../lib/cn";

const ToastContext = createContext(null);
const ICONS = {
  success: [CheckCircle2, "text-success"],
  error: [AlertCircle, "text-danger"],
  info: [Info, "text-accent-ink"],
};
const LIFETIME = 4500;
const EXIT = 140;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const timers = useRef(new Map());

  const dismiss = useCallback((id) => {
    clearTimeout(timers.current.get(id));
    setToasts((all) => all.map((t) => (t.id === id ? { ...t, leaving: true } : t)));
    setTimeout(() => setToasts((all) => all.filter((t) => t.id !== id)), EXIT);
  }, []);

  const push = useCallback(
    (kind, title, description) => {
      const id = crypto.randomUUID?.() || String(Math.random());
      // Same message twice in a row → don't stack duplicates.
      setToasts((all) => [...all.filter((t) => !(t.title === title && t.description === description)), { id, kind, title, description }].slice(-3));
      timers.current.set(id, setTimeout(() => dismiss(id), LIFETIME));
    },
    [dismiss]
  );

  const api = useMemo(
    () => ({
      success: (t, d) => push("success", t, d),
      error: (t, d) => push("error", t, d),
      info: (t, d) => push("info", t, d),
    }),
    [push]
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-0 z-50 flex flex-col items-center gap-2 px-4 pb-[calc(var(--safe-bottom)+16px)]"
      >
        {toasts.map(({ id, kind, title, description, leaving }) => {
          const [Icon, tone] = ICONS[kind];
          return (
            <button
              key={id}
              type="button"
              onClick={() => dismiss(id)}
              className={cn(
                "pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-[16px] bg-raised px-4 py-3 text-left shadow-overlay",
                leaving ? "animate-fade-out" : "animate-toast-in"
              )}
            >
              <Icon size={20} className={cn("mt-0.5 shrink-0", tone)} aria-hidden />
              <span className="min-w-0">
                <span className="block text-subhead font-semibold text-ink">{title}</span>
                {description && <span className="mt-0.5 block text-footnote text-ink-2">{description}</span>}
              </span>
            </button>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export const useToast = () => {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside <ToastProvider>");
  return ctx;
};
