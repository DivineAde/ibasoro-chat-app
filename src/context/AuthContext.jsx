import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { setUnauthorizedHandler } from "../lib/api";
import { KEYS, storage } from "../lib/storage";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => storage.get(KEYS.user));

  const signIn = useCallback((data) => {
    storage.set(KEYS.user, data);
    setUser(data);
  }, []);

  const signOut = useCallback(() => {
    storage.remove(KEYS.user);
    setUser(null);
  }, []);

  /** Merge profile changes (name, pic, refreshed token) into the session. */
  const updateUser = useCallback((patch) => {
    setUser((prev) => {
      const next = { ...prev, ...patch };
      storage.set(KEYS.user, next);
      return next;
    });
  }, []);

  // Any 401 from the API ends the session.
  useEffect(() => setUnauthorizedHandler(signOut), [signOut]);

  // Keep several tabs in sync (sign out in one → sign out in all).
  useEffect(() => {
    const onStorage = (e) => {
      if (e.key === KEYS.user) setUser(storage.get(KEYS.user));
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const value = useMemo(
    () => ({ user, signIn, signOut, updateUser }),
    [user, signIn, signOut, updateUser]
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
};
