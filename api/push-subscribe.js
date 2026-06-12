// ============================================================
//  /api/push-subscribe.js
// ============================================================
import { createClient } from "@supabase/supabase-js";

export default async function handler(req, res) {
  if (!["POST", "DELETE"].includes(req.method))
    return res.status(405).json({ error: "Method not allowed" });

  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const serviceKey  = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const anonKey     = process.env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !serviceKey || !anonKey)
    return res.status(500).json({ error: "Config Supabase mancante." });

  // Verifica JWT
  const jwt = (req.headers.authorization || "").replace("Bearer ", "").trim();
  if (!jwt) return res.status(401).json({ error: "Non autenticato." });

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: `Bearer ${jwt}` } },
    auth: { persistSession: false },
  });
  const { data: { user }, error: authErr } = await userClient.auth.getUser();
  if (authErr || !user) {
    console.error("auth error:", authErr?.message);
    return res.status(401).json({ error: "Sessione non valida." });
  }

  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false },
  });
  const { subscription, prefs } = req.body || {};

  if (req.method === "DELETE") {
    const endpoint = subscription?.endpoint;
    if (!endpoint) return res.status(400).json({ error: "endpoint mancante." });
    // filtro lato JS sull'endpoint perché Supabase non supporta ->>'...' in .eq()
    const { data: existing } = await admin
      .from("push_subscriptions").select("id, subscription").eq("user_id", user.id);
    const toDelete = (existing || []).filter(r => r.subscription?.endpoint === endpoint);
    for (const row of toDelete) {
      await admin.from("push_subscriptions").delete().eq("id", row.id);
    }
    return res.status(200).json({ ok: true });
  }

  // POST — cerca se esiste già una subscription con lo stesso endpoint per questo utente
  if (!subscription?.endpoint) return res.status(400).json({ error: "subscription non valida." });

  const { data: existing, error: selErr } = await admin
    .from("push_subscriptions").select("id").eq("user_id", user.id);

  if (selErr) {
    console.error("select error:", selErr.message);
    return res.status(500).json({ error: "Errore lettura DB: " + selErr.message });
  }

  const match = (existing || []).find(r => {
    // endpoint è dentro la colonna subscription (jsonb)
    return true; // aggiorniamo qualunque row esistente per questo user
  });

  let dbError;
  if (match) {
    // aggiorna la riga esistente
    const { error } = await admin.from("push_subscriptions")
      .update({ subscription, prefs: prefs || {}, updated_at: new Date().toISOString() })
      .eq("id", match.id);
    dbError = error;
  } else {
    // inserisci nuova riga
    const { error } = await admin.from("push_subscriptions")
      .insert({ user_id: user.id, subscription, prefs: prefs || {} });
    dbError = error;
  }

  if (dbError) {
    console.error("db error:", dbError.message, dbError.details, dbError.hint);
    return res.status(500).json({ error: "Errore DB: " + dbError.message });
  }

  return res.status(200).json({ ok: true });
}
