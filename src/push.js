// ============================================================
//  src/push.js — Gestione notifiche push lato client
//  - subscribe/unsubscribe al browser
//  - salvataggio subscription sul server
//  - notifiche evento locali (7: obiettivo peso, 8: piano in scadenza)
// ============================================================

export const VAPID_PUBLIC = import.meta.env.VITE_VAPID_PUBLIC_KEY ||
  "BL8OhETYdZuQHIFtC2aCiMIl2_fu7Yh4xjekdpA3vMnHgzOvFhIHOvT8vD8bSCOX9ndl3TvqlCfxt6vHxb5kM8U";

// Controlla se le push sono supportate
export function pushSupported() {
  return typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window;
}

// Stato permesso corrente
export function pushPermission() {
  if (!pushSupported()) return "unsupported";
  return Notification.permission; // default|granted|denied
}

// Converti base64 a Uint8Array (per applicationServerKey)
function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(base64);
  return Uint8Array.from([...raw].map(c => c.charCodeAt(0)));
}

// Ottieni la subscription corrente (se esiste)
export async function getCurrentSubscription() {
  if (!pushSupported()) return null;
  const reg = await navigator.serviceWorker.ready;
  return reg.pushManager.getSubscription();
}

// Richiedi permesso e crea subscription
export async function subscribePush(jwt, prefs = {}) {
  if (!pushSupported()) return { error: "Push non supportate su questo browser." };
  if (Notification.permission === "denied")
    return { error: "Hai bloccato le notifiche. Vai nelle impostazioni del browser per riattivarle." };

  let permission = Notification.permission;
  if (permission === "default") {
    permission = await Notification.requestPermission();
  }
  if (permission !== "granted") return { error: "Permesso notifiche non concesso." };

  try {
    const reg = await navigator.serviceWorker.ready;
    let sub = await reg.pushManager.getSubscription();
    if (!sub) {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC),
      });
    }
    // Salva sul server
    const r = await fetch("/api/push-subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${jwt}` },
      body: JSON.stringify({ subscription: sub.toJSON(), prefs }),
    });
    if (!r.ok) throw new Error("Errore salvataggio subscription.");
    return { ok: true, subscription: sub };
  } catch (e) {
    return { error: e.message };
  }
}

// Rimuovi subscription
export async function unsubscribePush(jwt) {
  try {
    const sub = await getCurrentSubscription();
    if (sub) {
      await fetch("/api/push-subscribe", {
        method: "DELETE",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${jwt}` },
        body: JSON.stringify({ subscription: sub.toJSON() }),
      });
      await sub.unsubscribe();
    }
    return { ok: true };
  } catch (e) {
    return { error: e.message };
  }
}

// Aggiorna le preferenze sul server
export async function updatePushPrefs(jwt, prefs) {
  try {
    const sub = await getCurrentSubscription();
    if (!sub) return { error: "Nessuna subscription attiva." };
    const r = await fetch("/api/push-subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${jwt}` },
      body: JSON.stringify({ subscription: sub.toJSON(), prefs }),
    });
    if (!r.ok) throw new Error("Errore aggiornamento preferenze.");
    return { ok: true };
  } catch (e) {
    return { error: e.message };
  }
}

// ---- Notifiche evento locali (non richiedono server) ----

// Notifica 7: obiettivo peso raggiunto
// Chiama quando il peso scende di ≥1kg dal peso iniziale del piano
export async function notifyWeightMilestone(currentKg, startKg, goalKg) {
  if (!pushSupported() || Notification.permission !== "granted") return;
  const lost = +(startKg - currentKg).toFixed(1);
  if (lost < 1) return; // sotto 1kg non notifichiamo
  const milestones = [1, 2, 3, 5];
  const hit = milestones.find(m => Math.abs(lost - m) < 0.15);
  if (!hit) return;
  const reg = await navigator.serviceWorker.ready;
  reg.showNotification("🎉 Obiettivo peso!", {
    body: `Hai perso ${hit} kg dal peso iniziale. Continua così!`,
    icon: "/icon-192.png",
    badge: "/icon-192.png",
    tag: `weight-milestone-${hit}`,
    data: { url: "/?tab=peso" },
  });
}

// Notifica 8: piano in scadenza (>30 giorni senza aggiornamento)
export async function notifyPlanExpiring(plans) {
  if (!pushSupported() || Notification.permission !== "granted") return;
  if (!plans?.length) return;
  const newest = [...plans].sort((a, b) => b.validFrom.localeCompare(a.validFrom))[0];
  const days = Math.floor((Date.now() - new Date(newest.validFrom + "T12:00:00").getTime()) / 86400000);
  if (days < 30) return;
  // Mostriamo al massimo una volta ogni 7 giorni
  const lsKey = "nc-plan-expiry-notified";
  const last = parseInt(localStorage.getItem(lsKey) || "0");
  if (Date.now() - last < 7 * 86400000) return;
  localStorage.setItem(lsKey, String(Date.now()));
  const reg = await navigator.serviceWorker.ready;
  reg.showNotification("📋 Rivedi il tuo piano", {
    body: `Il piano alimentare è attivo da ${days} giorni. Potrebbe essere il momento di aggiornarlo.`,
    icon: "/icon-192.png",
    badge: "/icon-192.png",
    tag: "plan-expiring",
    data: { url: "/?tab=piano" },
  });
}
