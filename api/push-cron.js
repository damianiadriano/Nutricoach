// ============================================================
//  /api/push-cron.js
//  Gira ogni ora via Vercel Cron (configurato in vercel.json).
//  Controlla chi deve ricevere notifiche e le invia.
//  Notifiche gestite:
//    1. Promemoria pasti (colazione e pranzo)
//    4. Promemoria pesata settimanale
// ============================================================
import { createClient } from "@supabase/supabase-js";
import webpush from "web-push";

webpush.setVapidDetails(
  "mailto:nutricoach@noreply.app",
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

const supabase = () => createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  // Vercel Cron autentica con CRON_SECRET
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && req.headers.authorization !== `Bearer ${cronSecret}`)
    return res.status(401).json({ error: "unauthorized" });

  const db = supabase();
  const now = new Date();
  const hourUTC = now.getUTCHours();
  const minuteUTC = now.getUTCMinutes();
  const dowUTC = now.getUTCDay(); // 0=Dom ... 6=Sab

  const sent = [], skipped = [];

  // Recupera tutte le subscription attive
  const { data: subs, error } = await db.from("push_subscriptions").select("*");
  if (error) return res.status(500).json({ error: error.message });

  for (const sub of subs || []) {
    const prefs = sub.prefs || {};
    const pushSub = sub.subscription;

    // ---- Notifica 1: Promemoria pasti ----
    if (prefs.meal_reminder !== false) {
      const times = prefs.meal_times || ["08:30", "13:00"];
      for (const t of times) {
        const [h, m] = t.split(":").map(Number);
        // Confronto UTC con tolleranza ±5 min
        if (Math.abs(hourUTC * 60 + minuteUTC - (h * 60 + m)) <= 5) {
          const isBreakfast = h < 11;
          const payload = JSON.stringify({
            title: isBreakfast ? "🌅 Hai fatto colazione?" : "🥗 Ora di pranzo!",
            body: isBreakfast
              ? "Registra la colazione su NutriCoach per iniziare bene la giornata."
              : "Hai già registrato il pranzo? Tieniti in linea con il target.",
            icon: "/icon-192.png",
            badge: "/icon-192.png",
            tag: `meal-${isBreakfast ? "breakfast" : "lunch"}`,
            data: { url: "/" },
          });
          await safeSend(pushSub, payload, db, sub.id, sent, skipped);
        }
      }
    }

    // ---- Notifica 4: Promemoria pesata settimanale ----
    if (prefs.weigh_reminder !== false) {
      const weighDay = prefs.weigh_day ?? 1; // default: lunedì
      const [wh, wm] = (prefs.weigh_time || "07:30").split(":").map(Number);
      if (dowUTC === weighDay && Math.abs(hourUTC * 60 + minuteUTC - (wh * 60 + wm)) <= 5) {
        const payload = JSON.stringify({
          title: "⚖️ Giorno della pesata",
          body: "Pesati a digiuno, dopo il bagno. Registra il peso su NutriCoach per tracciare il trend.",
          icon: "/icon-192.png",
          badge: "/icon-192.png",
          tag: "weigh-reminder",
          data: { url: "/?tab=peso" },
        });
        await safeSend(pushSub, payload, db, sub.id, sent, skipped);
      }
    }
  }

  return res.status(200).json({ sent: sent.length, skipped: skipped.length, at: now.toISOString() });
}

async function safeSend(subscription, payload, db, subId, sent, skipped) {
  try {
    await webpush.sendNotification(subscription, payload);
    sent.push(subId);
  } catch (e) {
    if (e.statusCode === 410 || e.statusCode === 404) {
      // Subscription scaduta — eliminiamo
      await db.from("push_subscriptions").delete().eq("id", subId);
    }
    skipped.push({ id: subId, status: e.statusCode });
  }
}
