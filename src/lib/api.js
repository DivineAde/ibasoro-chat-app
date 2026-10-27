import axios from "axios";
import { KEYS, storage } from "./storage";

export const API_URL = (import.meta.env.VITE_API_URL || "http://localhost:5000").replace(/\/$/, "");

export const api = axios.create({ baseURL: `${API_URL}/api` });

// Attach the token on every request so call sites never think about auth.
api.interceptors.request.use((config) => {
  const user = storage.get(KEYS.user);
  if (user?.token) config.headers.Authorization = `Bearer ${user.token}`;
  return config;
});

let onUnauthorized = () => {};
export const setUnauthorizedHandler = (fn) => {
  onUnauthorized = fn;
};

api.interceptors.response.use(
  (res) => res,
  (error) => {
    // An expired / revoked token anywhere in the app signs the user out cleanly.
    // (Login/register 401s are real credential errors, not an expired session.)
    const isAuthCall = /\/user(\/login)?$/.test(error.config?.url || "");
    if (error.response?.status === 401 && !isAuthCall) onUnauthorized();
    return Promise.reject(error);
  }
);

/** Human-readable message from an axios error. */
export const errorMessage = (error, fallback = "Something went wrong. Please try again.") => {
  if (!error.response) return "Can't reach the server. Check your connection.";
  return error.response.data?.message || fallback;
};
