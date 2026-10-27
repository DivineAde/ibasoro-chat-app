import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { KEYS, storage } from "../lib/storage";

const ThemeContext = createContext(null);
const THEME_COLORS = { light: "#f7f5f1", dark: "#0e0e12" };
const QUERY = "(prefers-color-scheme: dark)";

const systemTheme = () =>
  typeof window !== "undefined" && window.matchMedia(QUERY).matches ? "dark" : "light";

/** Apply a resolved theme to <html> without animating every element at once. */
const apply = (resolved) => {
  const root = document.documentElement;
  root.setAttribute("data-theme-switching", "");
  root.dataset.theme = resolved;
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", THEME_COLORS[resolved]);
  // Remove the guard after the browser has painted the new theme.
  requestAnimationFrame(() => requestAnimationFrame(() => root.removeAttribute("data-theme-switching")));
};

export function ThemeProvider({ children }) {
  // "system" follows the OS; "light" / "dark" are explicit overrides.
  const [preference, setPreferenceState] = useState(() => storage.get(KEYS.theme, "system"));
  const [system, setSystem] = useState(systemTheme);

  useEffect(() => {
    const mq = window.matchMedia(QUERY);
    const onChange = () => setSystem(mq.matches ? "dark" : "light");
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  const resolved = preference === "system" ? system : preference;
  useEffect(() => apply(resolved), [resolved]);

  const setPreference = useCallback((value) => {
    storage.set(KEYS.theme, value);
    setPreferenceState(value);
  }, []);

  const value = useMemo(() => ({ preference, resolved, setPreference }), [preference, resolved, setPreference]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export const useTheme = () => {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used inside <ThemeProvider>");
  return ctx;
};
