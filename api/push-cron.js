// ============================================================
//  /api/push-cron.js — Notifica giornaliera consolidata
//  Un solo cron al giorno, all'orario scelto dall'utente (UTC).
//  Logica intelligente: invia solo se c'è qualcosa di rilevante.
// ============================================================
import { createClient } from "@supabase/supabase-js";
import webpush from "web-push";

const MODEL = "gemini-2.5-flash-lite";

function makeAdmin() {
  return createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false } }
  );
}

// Genera proposta menù compatta
async function generateMenuText(plan) {
  if (!process.env.GEMINI_API_KEY) return "Apri l'app per generare il menù di domani.";
  const prompt = `Nutrizionista italiano. Proponi menù di domani in UNA riga.
Piano: ${plan?.goal || "ricomposizione"}, ${plan?.targetKcal || 1850} kcal.
Formato esatto: "🌅 yogurt+avena | 🥗 riso+pollo | 🌙 salmone+verdure"
Solo il testo.`;
  try {
    const r = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${process.env.GEMINI_API_KEY}`,
      { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.8, maxOutputTokens: 80 }
        }) }
    );
    const data = await r.json();
    return data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "Apri l'app per generare il menù.";
  } catch { return "Apri l'app per generare il menù di domani."; }
}

// Conta i pasti registrati nelle ultime 24h a partire dalla mezzanotte locale
function countMealsToday(payload) {
  if (!payload?.days) return 0;
  const today = new Date().toISOString().slice(0, 10);
  // considera oggi e ieri per coprire il caso fuso orario
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  let count = 0;
  for (const key of [today, yesterday]) {
    const day = payload.days[key];
    if (!day?.logs) continue;
    for (const slot of Object.values(day.logs)) {
      if (Array.isArray(slot) && slot.length > 0) count++;
    }
  }
  return count;
}

// Controlla se c'è almeno una pesata negli ultimi 4 giorni
function hasRecentWeight(payload) {
  if (!payload?.weights) return false;
  const cutoff = new Date(Date.now() - 4 * 86400000).toISOString().slice(0, 10);
  return Object.keys(payload.weights).some(k => k >= cutoff);
}

// Ottieni il piano attivo
function getActivePlan(payload) {
  if (!payload?.plans?.length) return null;
  const today = new Date().toISOString().slice(0, 10);
  return payload.plans
    .filter(p => p.validFrom <= today)
    .sort((a, b) => b.validFrom.localeCompare(a.validFrom))[0] || null;
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
  // Autenticazione: Vercel invia automaticamente CRON_SECRET come Bearer
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const auth = req.headers.authorization || "";
    const xsecret = req.headers["x-cron-secret"] || "";
    if (auth !== `Bearer ${cronSecret}` && xsecret !== cronSecret)
      return res.status(401).json({ error: "unauthorized" });
  }

  // Verifica env var critici prima di procedere
  const missing = [];
  if (!process.env.VAPID_PUBLIC_KEY)          missing.push("VAPID_PUBLIC_KEY");
  if (!process.env.VAPID_PRIVATE_KEY)         missing.push("VAPID_PRIVATE_KEY");
  if (!process.env.VITE_SUPABASE_URL)         missing.push("VITE_SUPABASE_URL");
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) missing.push("SUPABASE_SERVICE_ROLE_KEY");
  if (missing.length) {
    console.error("[push-cron] Env var mancanti:", missing.join(", "));
    return res.status(500).json({ error: "Config mancante", missing });
  }

  // Inizializza webpush qui (non a livello di modulo, per evitare errori di avvio)
  webpush.setVapidDetails(
    "mailto:support@nutricoach.app",
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );

  console.log("[push-cron] Start", new Date().toISOString());

  const admin = makeAdmin();
  const nowUTC = new Date();

  const { data: subs, error } = await admin.from("push_subscriptions").select("*");
  if (error) return res.status(500).json({ error: error.message });

  let sent = 0, skipped = 0;

  for (const sub of subs || []) {
    const prefs = sub.prefs || {};

    // Notifiche globalmente disattivate
    if (prefs.notifications_enabled === false) { skipped++; continue; }

    // Leggi i dati dell'utente da app_data per la logica intelligente
    let userPayload = null;
    try {
      const { data: appData } = await admin.from("app_data")
        .select("payload").eq("user_id", sub.user_id).maybeSingle();
      userPayload = appData?.payload || null;
    } catch (e) { console.warn("appData read:", e.message); }

    const parts = []; // parti del messaggio consolidato

    // ---- 1. Promemoria pasti (se < 4 pasti registrati oggi) ----
    if (prefs.meal_reminder !== false) {
      const mealsCount = countMealsToday(userPayload);
      if (mealsCount < 4) {
        parts.push(`📝 Pasti registrati oggi: ${mealsCount}/5. Completa il diario!`);
      }
    }

    // ---- 2. Pesata (se nessun peso negli ultimi 4 giorni) ----
    if (prefs.weigh_reminder !== false) {
      const hasWeight = hasRecentWeight(userPayload);
      if (!hasWeight) {
        parts.push("⚖️ Nessuna pesata negli ultimi 4 giorni. Registra il peso domani mattina.");
      }
    }

    // ---- 3. Proposta menù ----
    if (prefs.menu_reminder !== false) {
      const plan = getActivePlan(userPayload);
      const menuText = await generateMenuText(plan);
      parts.push(`🍽️ Domani: ${menuText}`);
    }

    // Niente da inviare? Salta.
    if (!parts.length) { skipped++; continue; }

    // Costruisce il messaggio unico
    const title = parts.length === 1 && parts[0].startsWith("🍽️")
      ? "🍽️ NutriCoach — Menù di domani"
      : "📊 NutriCoach — Riepilogo serale";
    const body = parts.join("\n");

    const pushPayload = JSON.stringify({
      title,
      body,
      icon: "/icon-192.png",
      badge: "/icon-192.png",
      tag: "daily-summary",
      data: { url: "/" },
    });

    const ok = await safeSend(sub.subscription, pushPayload, admin, sub.id);
    ok ? sent++ : skipped++;
  }

  console.log("[push-cron] Done — sent:", sent, "skipped:", skipped);
  return res.status(200).json({ sent, skipped, at: nowUTC.toISOString() });
}
