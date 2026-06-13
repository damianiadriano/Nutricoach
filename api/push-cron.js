// ============================================================
//  /api/push-cron.js
//  3 cron giornalieri (piano gratuito Vercel):
//    ?slot=breakfast  06:30 UTC → promemoria colazione
//    ?slot=lunch      11:00 UTC → promemoria pranzo
//    ?slot=menu       17:00 UTC → proposta menù domani (ora locale utente)
//    ?slot=weigh      05:30 UTC lunedì → pesata settimanale
// ============================================================
import { createClient } from "@supabase/supabase-js";
import webpush from "web-push";

webpush.setVapidDetails(
  "mailto:support@nutricoach.app",
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

const MODEL = "gemini-2.5-flash-lite";

function makeAdmin() {
  return createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false } }
  );
}

// Converte un orario HH:MM in ora UTC considerando il fuso
function localTimeToUTCHour(time, timezone) {
  try {
    const [h, m] = time.split(":").map(Number);
    const now = new Date();
    // Crea una data "oggi" alle HH:MM nel fuso locale dell'utente
    const localStr = new Intl.DateTimeFormat("en-CA", {
      timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit"
    }).format(now);
    const local = new Date(`${localStr}T${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}:00`);
    // Converti in UTC
    const utcParts = new Intl.DateTimeFormat("en-US", {
      timeZone: "UTC", hour: "numeric", minute: "2-digit", hour12: false
    }).formatToParts(local);
    const utcH = parseInt(utcParts.find(p => p.type === "hour")?.value || "0");
    const utcM = parseInt(utcParts.find(p => p.type === "minute")?.value || "0");
    return { h: utcH, m: utcM };
  } catch {
    return null;
  }
}

// Genera il menù del giorno con Gemini
async function generateMenuText(plan) {
  if (!plan || !process.env.GEMINI_API_KEY) return null;
  const prompt = `Proponi brevemente il menù di domani per un piano ${plan.goal || "ricomposizione"}, 
target ${plan.targetKcal || 1850} kcal, ${plan.protein || 127}g proteine. 
Formato compatto: "Colazione: ..., Pranzo: ..., Cena: ..." in massimo 2 righe. Solo il testo, niente altro.`;
  try {
    const r = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${process.env.GEMINI_API_KEY}`,
      { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.8, maxOutputTokens: 200 } }) }
    );
    const data = await r.json();
    return data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || null;
  } catch { return null; }
}

async function safeSend(pushSub, payload, admin, subId) {
  try {
    await webpush.sendNotification(pushSub, payload);
    return true;
  } catch (e) {
    if (e.statusCode === 410 || e.statusCode === 404) {
      await admin.from("push_subscriptions").delete().eq("id", subId);
    }
    return false;
  }
}

export default async function handler(req, res) {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && req.headers.authorization !== `Bearer ${cronSecret}`)
    return res.status(401).json({ error: "unauthorized" });

  const slot = req.query?.slot || "breakfast";
  const admin = makeAdmin();
  const now = new Date();
  const nowUTCH = now.getUTCHours();
  const nowUTCM = now.getUTCMinutes();

  const { data: subs, error } = await admin.from("push_subscriptions").select("*");
  if (error) return res.status(500).json({ error: error.message });

  let sent = 0, skipped = 0;

  for (const sub of subs || []) {
    const prefs = sub.prefs || {};
    const pushSub = sub.subscription;
    let payload = null;

    if (slot === "breakfast" && prefs.meal_reminder !== false) {
      payload = JSON.stringify({
        title: "🌅 Buongiorno! Hai fatto colazione?",
        body: "Registra la colazione su NutriCoach per iniziare bene la giornata.",
        icon: "/icon-192.png", badge: "/icon-192.png",
        tag: "meal-breakfast", data: { url: "/" },
      });
    }

    if (slot === "lunch" && prefs.meal_reminder !== false) {
      payload = JSON.stringify({
        title: "🥗 Ora di pranzo!",
        body: "Hai già registrato il pranzo? Tieniti in linea con il target calorico.",
        icon: "/icon-192.png", badge: "/icon-192.png",
        tag: "meal-lunch", data: { url: "/" },
      });
    }

    if (slot === "weigh" && prefs.weigh_reminder !== false) {
      payload = JSON.stringify({
        title: "⚖️ Giorno della pesata",
        body: "Pesati a digiuno, dopo il bagno. Registra il peso per tracciare il trend.",
        icon: "/icon-192.png", badge: "/icon-192.png",
        tag: "weigh-reminder", data: { url: "/?tab=peso" },
      });
    }

    if (slot === "menu" && prefs.menu_reminder !== false) {
      // Controlla se l'ora locale dell'utente corrisponde all'orario scelto (default 19:00)
      const timezone = prefs.timezone || "Europe/Rome";
      const menuTime = prefs.menu_time || "19:00";
      const utc = localTimeToUTCHour(menuTime, timezone);
      const match = utc && Math.abs(nowUTCH * 60 + nowUTCM - (utc.h * 60 + utc.m)) <= 35;
      if (match) {
        // Leggi il piano attivo dell'utente da app_data
        let planData = null;
        const { data: appData } = await admin.from("app_data")
          .select("payload").eq("user_id", sub.user_id).maybeSingle();
        if (appData?.payload?.plans?.length) {
          const today = new Date().toISOString().slice(0, 10);
          const plans = appData.payload.plans;
          planData = plans.filter(p => p.validFrom <= today)
            .sort((a, b) => b.validFrom.localeCompare(a.validFrom))[0] || null;
        }
        const menuText = await generateMenuText(planData);
        payload = JSON.stringify({
          title: "🍽️ Proposta menù per domani",
          body: menuText || "Apri NutriCoach per generare il menù di domani su misura.",
          icon: "/icon-192.png", badge: "/icon-192.png",
          tag: "menu-proposal", data: { url: "/?tab=piano" },
        });
      }
    }

    if (!payload) { skipped++; continue; }
    const ok = await safeSend(pushSub, payload, admin, sub.id);
    ok ? sent++ : skipped++;
  }

  return res.status(200).json({ slot, sent, skipped, at: now.toISOString() });
}
