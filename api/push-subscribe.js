// ============================================================
//  /api/push-subscribe.js
//  Salva o elimina una push subscription per l'utente loggato.
//  Usa la service_role key di Supabase per scrivere la tabella
//  senza che le RLS blocchino il cron job.
// ============================================================
import { createClient } from "@supabase/supabase-js";

export default async function handler(req, res) {
  if (!["POST", "DELETE"].includes(req.method))
    return res.status(405).json({ error: "Method not allowed" });

  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const anonKey   = process.env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !serviceKey || !anonKey)
    return res.status(500).json({ error: "Config Supabase mancante." });

  // Autentichiamo l'utente con il JWT che arriva dall'header
  const jwt = (req.headers.authorization || "").replace("Bearer ", "");
  if (!jwt) return res.status(401).json({ error: "Non autenticato." });

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: `Bearer ${jwt}` } },
  });
  const { data: { user }, error: authErr } = await userClient.auth.getUser();
  if (authErr || !user) return res.status(401).json({ error: "Sessione non valida." });

  // Client admin per scrivere senza RLS
  const admin = createClient(supabaseUrl, serviceKey);
  const { subscription, prefs } = req.body || {};

  if (req.method === "DELETE") {
    const endpoint = subscription?.endpoint;
    if (!endpoint) return res.status(400).json({ error: "endpoint mancante." });
    await admin.from("push_subscriptions")
      .delete().eq("user_id", user.id).eq("subscription->>'endpoint'", endpoint);
    return res.status(200).json({ ok: true });
  }

  // POST — salva o aggiorna
  if (!subscription?.endpoint) return res.status(400).json({ error: "subscription non valida." });

  const { error } = await admin.from("push_subscriptions").upsert(
    { user_id: user.id, subscription, prefs: prefs || {}, updated_at: new Date().toISOString() },
    { onConflict: "user_id,subscription->>'endpoint'" }
  );
  if (error) {
    // fallback: insert semplice se l'upsert fallisce per conflitto expression index
    const { error: e2 } = await admin.from("push_subscriptions")
      .delete().eq("user_id", user.id);
    if (!e2) await admin.from("push_subscriptions")
      .insert({ user_id: user.id, subscription, prefs: prefs || {} });
  }
  return res.status(200).json({ ok: true });
}
