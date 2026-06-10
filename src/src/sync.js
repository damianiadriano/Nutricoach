// ============================================================
//  Sincronizzazione anonima con Supabase
//  - Nessun dato personale: solo un utente anonimo (ID casuale)
//  - I dati dell'app vivono in una riga legata a quell'ID
//  - localStorage resta la cache locale: l'app funziona anche offline
// ============================================================
import { createClient } from "@supabase/supabase-js";

// 🔧 Incolla qui i due valori dal tuo progetto Supabase (vedi GUIDA-SUPABASE.md)
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "https://zuatjmrvvbawibtnszor.supabase.co";
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp1YXRqbXJ2dmJhd2lidG5zem9yIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEwNDM5NjYsImV4cCI6MjA5NjYxOTk2Nn0.n0aWz-iNangkyzM5UNSpIAxajG_pmFZgLEL5ukvZCyE";

export const syncConfigured =
  SUPABASE_URL.startsWith("http") && !SUPABASE_KEY.startsWith("INCOLLA");

export const supabase = syncConfigured
  ? createClient(SUPABASE_URL, SUPABASE_KEY, {
      auth: { persistSession: true, autoRefreshToken: true, storageKey: "nc-auth" },
    })
  : null;

// Garantisce una sessione: se non esiste, crea un utente ANONIMO (nessun dato personale)
export async function ensureSession() {
  if (!supabase) return null;
  const { data: { session } } = await supabase.auth.getSession();
  if (session) return session.user;
  const { data, error } = await supabase.auth.signInAnonymously();
  if (error) { console.error("Auth anonima fallita:", error.message); return null; }
  return data.user;
}

// Scarica i dati remoti per l'utente corrente
export async function pullRemote() {
  if (!supabase) return null;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data, error } = await supabase
    .from("app_data").select("payload, updated_at").eq("user_id", user.id).maybeSingle();
  if (error) { console.error("pull:", error.message); return null; }
  return data ? { payload: data.payload, updatedAt: data.updated_at } : null;
}

// Carica i dati (upsert) per l'utente corrente
export async function pushRemote(payload) {
  if (!supabase) return false;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;
  const { error } = await supabase
    .from("app_data")
    .upsert({ user_id: user.id, payload, updated_at: new Date().toISOString() }, { onConflict: "user_id" });
  if (error) { console.error("push:", error.message); return false; }
  return true;
}

// ---- Collegamento multi-dispositivo tramite "codice di collegamento" ----
// Il codice è la sessione (refresh token) serializzata: incollandolo su un altro
// dispositivo, questo assume la stessa identità anonima e vede gli stessi dati.
export async function exportLinkCode() {
  if (!supabase) return null;
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return null;
  const payload = { at: session.access_token, rt: session.refresh_token };
  return btoa(JSON.stringify(payload));
}

export async function importLinkCode(code) {
  if (!supabase) return false;
  try {
    const { at, rt } = JSON.parse(atob(code.trim()));
    const { error } = await supabase.auth.setSession({ access_token: at, refresh_token: rt });
    if (error) { console.error("link:", error.message); return false; }
    return true;
  } catch (e) { console.error("codice non valido", e); return false; }
}

export async function getUserId() {
  if (!supabase) return null;
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id || null;
}
