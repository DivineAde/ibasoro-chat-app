import { api } from "./api";

/**
 * Web Push in four states the UI can explain:
 *   unsupported · needs-install (iPhone, not added to Home Screen) · blocked · off · on
 */
const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent);
const isStandalone = () => window.matchMedia?.("(display-mode: standalone)").matches || navigator.standalone === true;

export const pushSupported = () =>
  "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;

const registration = async () => {
  const existing = await navigator.serviceWorker.getRegistration();
  return existing || (await Promise.race([navigator.serviceWorker.ready, new Promise((_, no) => setTimeout(() => no(new Error("no service worker")), 4000))]));
};

export const getPushState = async () => {
  if (isIOS() && !isStandalone()) return "needs-install";
  if (!pushSupported()) return "unsupported";
  if (Notification.permission === "denied") return "blocked";
  try {
    const sub = await (await registration()).pushManager.getSubscription();
    return sub && Notification.permission === "granted" ? "on" : "off";
  } catch {
    return "unsupported"; // e.g. the dev server, where no service worker is installed
  }
};

const toKey = (base64) => {
  const padded = (base64 + "=".repeat((4 - (base64.length % 4)) % 4)).replace(/-/g, "+").replace(/_/g, "/");
  return Uint8Array.from(atob(padded), (c) => c.charCodeAt(0));
};

/** Ask permission (must be called from a click), subscribe, tell the server. */
export const enablePush = async () => {
  const permission = await Notification.requestPermission();
  if (permission !== "granted") return "blocked";

  let key;
  try {
    key = (await api.get("/push/key")).data.publicKey;
  } catch (error) {
    if (error.response?.status === 501) return "unavailable";
    throw error;
  }

  const reg = await registration();
  const sub = (await reg.pushManager.getSubscription()) || (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: toKey(key) }));
  await api.post("/push/subscribe", { subscription: sub.toJSON() });
  return "on";
};

/** Stop notifications on this device. Safe to call when nothing is subscribed. */
export const disablePush = async () => {
  if (!pushSupported()) return;
  try {
    const sub = await (await registration()).pushManager.getSubscription();
    if (!sub) return;
    await api.post("/push/unsubscribe", { endpoint: sub.endpoint }).catch(() => {});
    await sub.unsubscribe();
  } catch {
    /* nothing to undo */
  }
};
