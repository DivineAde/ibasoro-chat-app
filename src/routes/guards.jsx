import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

/** Signed-in users only; everyone else goes to the login screen. */
export function RequireAuth() {
  const { user } = useAuth();
  return user ? <Outlet /> : <Navigate to="/login" replace />;
}

/** Login / signup are pointless once signed in. */
export function GuestOnly() {
  const { user } = useAuth();
  return user ? <Navigate to="/chat" replace /> : <Outlet />;
}
