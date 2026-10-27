/** localStorage that never throws (private mode, blocked storage, SSR). */
export const storage = {
  get(key, fallback = null) {
    try {
      const raw = localStorage.getItem(key);
      return raw === null ? fallback : JSON.parse(raw);
    } catch {
      return fallback;
    }
  },
  set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      /* ignore */
    }
  },
  remove(key) {
    try {
      localStorage.removeItem(key);
    } catch {
      /* ignore */
    }
  },
};

// `userInfo` is kept for backwards compatibility with sessions created by v1.
export const KEYS = { user: "userInfo", theme: "ibasoro:theme" };
