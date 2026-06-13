// ============================================================
//  src/push.js — Gestione notifiche push lato client
// ============================================================

export const VAPID_PUBLIC = import.meta.env.VITE_VAPID_PUBLIC_KEY ||
  "BEcVYvWR4P41cfdSiQfAXRErl37d4fitnitBI6UiFRK_BntO8MhfgR6lOzJ-LEwhkbTPst5J-uTbMfcEvnAodRk";

export function pushSupported() {
  return typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window;
}

export function pushPermission() {
  if (!pushSupported()) return "unsupported";
  return Notification.permission;
}

function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  return Uint8Array.from([...raw].map(c => c.charCodeAt(0)));
}

export async function getCurrentSubscription() {
  if (!pushSupported()) return null;
  try {
    // Assicurati che il SW sia registrato e pronto
    const reg = await Promise.race([
      navigator.serviceWorker.ready,
      new Promise((_, reject) => setTimeout(() => reject(new Error("SW timeout")), 5000))
    ]);
    return reg.pushManager.getSubscription();
  } catch (e) {
    console.warn("getCurrentSubscription:", e.message);
    return null;
  }
}

export async function subscribePush(jwt, prefs = {}) {
  if (!pushSupported()) return { error: "Push non supportate su questo browser." };
  if (Notification.permission === "denied")
    return { error: "Hai bloccato le notifiche. Vai in Impostazioni → Safari → NutriCoach → Notifiche." };

  if (Notification.permission === "default") {
    const p = await Notification.requestPermission();
    if (p !== "granted") return { error: "Permesso notifiche non concesso." };
  }

  try {
    // Attendi il SW con timeout
    const reg = await Promise.race([
      navigator.serviceWorker.ready,
      new Promise((_, reject) => setTimeout(() => reject(new Error("Service worker non pronto. Ricarica l'app e riprova.")), 8000))
    ]);

    let sub = await reg.pushManager.getSubscription();
    if (!sub) {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC),
      });
    }

    // Salva fuso orario dell'utente per notifiche ora-locali
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const fullPrefs = { ...prefs, timezone };

    const r = await fetch("/api/push-subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${jwt}` },
      body: JSON.stringify({ subscription: sub.toJSON(), prefs: fullPrefs }),
    });
    const body = await r.json().catch(() => ({}));
    if (!r.ok) return { error: body.error || "Errore salvataggio subscription." };
    return { ok: true, subscription: sub };
  } catch (e) {
    return { error: e.message };
  }
}

export async function unsubscribePush(jwt) {
  try {
    const sub = await getCurrentSubscription();
    if (sub) {
      const r = await fetch("/api/push-subscribe", {
        method: "DELETE",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${jwt}` },
        body: JSON.stringify({ subscription: sub.toJSON() }),
      });
      if (!r.ok) console.warn("unsubscribe server error:", await r.text());
      await sub.unsubscribe();
    }
    return { ok: true };
  } catch (e) {
    return { error: e.message };
  }
}

export async function updatePushPrefs(jwt, prefs) {
  try {
    const sub = await getCurrentSubscription();
    if (!sub) return { error: "Nessuna subscription attiva." };
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const r = await fetch("/api/push-subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${jwt}` },
      body: JSON.stringify({ subscription: sub.toJSON(), prefs: { ...prefs, timezone } }),
    });
    const body = await r.json().catch(() => ({}));
    if (!r.ok) return { error: body.error || "Errore aggiornamento preferenze." };
    return { ok: true };
  } catch (e) {
    return { error: e.message };
  }
}

// ---- Notifiche evento locali ----
export async function notifyWeightMilestone(currentKg, startKg) {
  if (!pushSupported() || Notification.permission !== "granted") return;
  const lost = +(startKg - currentKg).toFixed(1);
  if (lost < 1) return;
  const hit = [1, 2, 3, 5].find(m => Math.abs(lost - m) < 0.15);
  if (!hit) return;
  const reg = await navigator.serviceWorker.ready.catch(() => null);
  if (!reg) return;
  reg.showNotification("🎉 Obiettivo peso!", {
    body: `Hai perso ${hit} kg dal peso iniziale. Continua così!`,
    icon: "/icon-192.png",
    badge: "/icon-192.png",
    tag: `weight-milestone-${hit}`,
    data: { url: "/?tab=peso" },
  });
}

export async function notifyPlanExpiring(plans) {
  if (!pushSupported() || Notification.permission !== "granted") return;
  if (!plans?.length) return;
  const newest = [...plans].sort((a, b) => b.validFrom.localeCompare(a.validFrom))[0];
  const days = Math.floor((Date.now() - new Date(newest.validFrom + "T12:00:00").getTime()) / 86400000);
  if (days < 30) return;
  const lsKey = "nc-plan-expiry-notified";
  const last = parseInt(localStorage.getItem(lsKey) || "0");
  if (Date.now() - last < 7 * 86400000) return;
  localStorage.setItem(lsKey, String(Date.now()));
  const reg = await navigator.serviceWorker.ready.catch(() => null);
  if (!reg) return;
  reg.showNotification("📋 Rivedi il tuo piano", {
    body: `Il piano alimentare è attivo da ${days} giorni. Potrebbe essere il momento di aggiornarlo.`,
    icon: "/icon-192.png",
    badge: "/icon-192.png",
    tag: "plan-expiring",
    data: { url: "/?tab=piano" },
  });
}
