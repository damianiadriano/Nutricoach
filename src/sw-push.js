// ============================================================
//  public/sw-push.js
//  Service worker custom che gestisce gli eventi push.
//  Viene importato dal service worker generato da Vite PWA
//  tramite la config injectManifest (vedi vite.config.js).
//
//  NOTA: con generateSW (la config che usiamo) Vite genera
//  automaticamente il SW. Per aggiungere il push handler dobbiamo
//  passare a injectManifest e usare questo file come base.
// ============================================================

// Questo file è incluso tramite il campo `swSrc` nella config Vite PWA.

import { cleanupOutdatedCaches, precacheAndRoute } from "workbox-precaching";

cleanupOutdatedCaches();
precacheAndRoute(self.__WB_MANIFEST || []);

// ---- Push event: mostra la notifica ----
self.addEventListener("push", event => {
  if (!event.data) return;
  let data = {};
  try { data = event.data.json(); } catch (e) { return; }
  event.waitUntil(
    self.registration.showNotification(data.title || "NutriCoach", {
      body: data.body || "",
      icon: data.icon || "/icon-192.png",
      badge: data.badge || "/icon-192.png",
      tag: data.tag || "nutricoach",
      data: data.data || {},
      actions: data.actions || [],
    })
  );
});

// ---- Click sulla notifica: apri l'app ----
self.addEventListener("notificationclick", event => {
  event.notification.close();
  const url = event.notification.data?.url || "/";
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then(windowClients => {
      // Se l'app è già aperta, portala in foreground
      const existing = windowClients.find(c => c.url.includes(self.location.origin));
      if (existing) return existing.focus();
      return clients.openWindow(self.location.origin + url);
    })
  );
});

// ---- Push subscription change (subscription rinnovata dal browser) ----
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
