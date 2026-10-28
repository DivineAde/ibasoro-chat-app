/* Web Push handlers, pulled into the generated service worker via workbox `importScripts`. */

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data?.json() ?? {};
  } catch {
    /* ignore malformed payloads */
  }

  event.waitUntil(
    (async () => {
      // If the app is open and visible, the in-app UI already tells the person.
      const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      if (windows.some((w) => w.visibilityState === "visible")) return;

      await self.registration.showNotification(data.title || "ìbáṣọ̀rọ̀", {
        body: data.body || "New message",
        icon: "/icon-192.png",
        badge: "/icon-192.png",
        tag: data.tag || data.chatId, // one notification per chat, replaced as more arrive
        renotify: true,
        data: { chatId: data.chatId, messageId: data.messageId },
      });
    })()
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const { chatId, messageId } = event.notification.data || {};
  const path = chatId ? `/chat/${chatId}${messageId ? `?m=${messageId}` : ""}` : "/chat";

  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      const open = windows[0];
      if (open) {
        await open.focus();
        open.postMessage({ type: "open-chat", path });
      } else {
        await self.clients.openWindow(path);
      }
    })()
  );
});
