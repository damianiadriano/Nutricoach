// ============================================================
//  src/sw-push.js — Service Worker con push handler
// ============================================================
import { cleanupOutdatedCaches, precacheAndRoute } from "workbox-precaching";

// Attiva subito senza aspettare il reload (importante su iOS)
self.skipWaiting();
self.addEventListener("activate", e => e.waitUntil(self.clients.claim()));

cleanupOutdatedCaches();
precacheAndRoute(self.__WB_MANIFEST || []);

// ---- Push: ricevi e mostra la notifica ----
self.addEventListener("push", event => {
  if (!event.data) return;
  let data = {};
  try { data = event.data.json(); } catch (e) { return; }

  const options = {
    body: data.body || "",
    icon: data.icon || "/icon-192.png",
    badge: data.badge || "/icon-192.png",
    tag: data.tag || "nutricoach",
    data: data.data || {},
    requireInteraction: false,
  };

  event.waitUntil(self.registration.showNotification(data.title || "NutriCoach", options));
});

// ---- Click sulla notifica ----
self.addEventListener("notificationclick", event => {
  event.notification.close();
  const url = (event.notification.data?.url) || "/";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true })
      .then(list => {
        const found = list.find(c => c.url.startsWith(self.location.origin));
        if (found) return found.focus();
        return self.clients.openWindow(self.location.origin + url);
      })
  );
});

// ---- Subscription rinnovata dal browser ----
self.addEventListener("pushsubscriptionchange", event => {
  event.waitUntil(
    self.registration.pushManager.subscribe({ userVisibleOnly: true })
      .then(sub => fetch("/api/push-subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subscription: sub.toJSON() }),
      }))
  );
});
