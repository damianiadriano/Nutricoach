// ============================================================
//  /api/push-cron.js
//  Tre invocazioni giornaliere via Vercel Cron (piano gratuito):
//  ?slot=breakfast  → promemoria colazione
//  ?slot=lunch      → promemoria pranzo
//  ?slot=weigh      → promemoria pesata settimanale (solo lunedì)
// ============================================================
import { createClient } from "@supabase/supabase-js";
import webpush from "web-push";

webpush.setVapidDetails(
  "mailto:support@nutricoach.app",
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

export default async function handler(req, res) {
  // Vercel Cron autentica con CRON_SECRET
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && req.headers.authorization !== `Bearer ${cronSecret}`)
    return res.status(401).json({ error: "unauthorized" });

  const slot = req.query?.slot || "breakfast";
  const admin = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false } }
  );

  const { data: subs, error } = await admin.from("push_subscriptions").select("*");
  if (error) return res.status(500).json({ error: error.message });

  const sent = [], skipped = [];

  for (const sub of subs || []) {
    const prefs = sub.prefs || {};
    const pushSub = sub.subscription;

    let payload = null;

    if (slot === "breakfast" && prefs.meal_reminder !== false) {
      payload = JSON.stringify({
        title: "🌅 Buongiorno! Hai fatto colazione?",
        body: "Registra la colazione su NutriCoach per iniziare bene la giornata.",
        icon: "/icon-192.png",
        badge: "/icon-192.png",
        tag: "meal-breakfast",
        data: { url: "/" },
      });
    }

    if (slot === "lunch" && prefs.meal_reminder !== false) {
      payload = JSON.stringify({
        title: "🥗 Ora di pranzo!",
        body: "Hai già registrato il pranzo? Tieniti in linea con il target calorico.",
        icon: "/icon-192.png",
        badge: "/icon-192.png",
        tag: "meal-lunch",
        data: { url: "/" },
      });
    }

    if (slot === "weigh" && prefs.weigh_reminder !== false) {
      payload = JSON.stringify({
        title: "⚖️ Giorno della pesata",
        body: "Pesati a digiuno, dopo il bagno. Registra il peso per tracciare il trend.",
        icon: "/icon-192.png",
        badge: "/icon-192.png",
        tag: "weigh-reminder",
        data: { url: "/?tab=peso" },
      });
    }

    if (!payload) { skipped.push(sub.id); continue; }

    try {
      await webpush.sendNotification(pushSub, payload);
      sent.push(sub.id);
    } catch (e) {
      if (e.statusCode === 410 || e.statusCode === 404) {
        // Subscription scaduta — elimina
        await admin.from("push_subscriptions").delete().eq("id", sub.id);
      }
      skipped.push({ id: sub.id, status: e.statusCode });
    }
  }

  return res.status(200).json({ slot, sent: sent.length, skipped: skipped.length });
}
