// ============================================================
//  Sincronizzazione con Supabase + autenticazione email
//  - Account email+password con alias, conferma email, reset password
//  - Multi-profilo sullo stesso dispositivo (logout/login)
//  - localStorage resta la cache locale: l'app funziona anche offline
// ============================================================
import { createClient } from "@supabase/supabase-js";

// 🔧 Incolla qui i due valori dal tuo progetto Supabase (vedi GUIDA-SUPABASE.md)
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "INCOLLA_QUI_PROJECT_URL";
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || "INCOLLA_QUI_ANON_KEY";

export const syncConfigured =
  SUPABASE_URL.startsWith("http") && !SUPABASE_KEY.startsWith("INCOLLA");

export const supabase = syncConfigured
  ? createClient(SUPABASE_URL, SUPABASE_KEY, {
      auth: { persistSession: true, autoRefreshToken: true, storageKey: "nc-auth" },
    })
  : null;

// ---- AUTENTICAZIONE EMAIL ----

// Sessione corrente (null se non loggato)
export async function getSession() {
  if (!supabase) return null;
  const { data: { session } } = await supabase.auth.getSession();
  return session || null;
}
export async function getCurrentUser() {
  if (!supabase) return null;
  const { data: { user } } = await supabase.auth.getUser();
  return user || null;
}
// Alias dal metadata utente
export function aliasOf(user) {
  return user?.user_metadata?.alias || (user?.email ? user.email.split("@")[0] : "");
}

// Registrazione: email + password + alias. Invia email di conferma.
export async function signUp(email, password, alias) {
  if (!supabase) return { error: "Sync non configurata." };
  const { data, error } = await supabase.auth.signUp({
    email: email.trim(),
    password,
    options: {
      data: { alias: (alias || "").trim().slice(0, 40) },
      emailRedirectTo: typeof window !== "undefined" ? window.location.origin : undefined,
    },
  });
  if (error) return { error: traduci(error.message) };
  // Se la conferma email è attiva, non c'è ancora sessione finché non conferma.
  const needsConfirm = !data.session;
  return { user: data.user, needsConfirm };
}

export async function signIn(email, password) {
  if (!supabase) return { error: "Sync non configurata." };
  const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
  if (error) return { error: traduci(error.message) };
  return { user: data.user, session: data.session };
}

export async function signOut() {
  if (!supabase) return;
  await supabase.auth.signOut();
}

// Login con Google (OAuth). In una PWA client-only, Supabase gestisce il callback
// e riporta l'utente all'app già autenticato.
export async function signInWithGoogle() {
  if (!supabase) return { error: "Sync non configurata." };
  const { error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: typeof window !== "undefined" ? window.location.origin : undefined,
    },
  });
  if (error) return { error: traduci(error.message) };
  return { ok: true }; // il browser si reindirizza a Google da solo
}

export async function resetPassword(email) {
  if (!supabase) return { error: "Sync non configurata." };
  const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
    redirectTo: typeof window !== "undefined" ? window.location.origin : undefined,
  });
  if (error) return { error: traduci(error.message) };
  return { ok: true };
}

// Aggiorna l'alias dell'utente nei metadata
export async function updateAlias(alias) {
  if (!supabase) return { error: "Sync non configurata." };
  const { error } = await supabase.auth.updateUser({ data: { alias: alias.trim().slice(0, 40) } });
  if (error) return { error: traduci(error.message) };
  return { ok: true };
}

// Aggiorna la password (usato dopo il link di recupero)
export async function updatePassword(newPassword) {
  if (!supabase) return { error: "Sync non configurata." };
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) return { error: traduci(error.message) };
  return { ok: true };
}

// Reagisce ai cambi di stato auth (login, logout, recovery)
export function onAuthChange(cb) {
  if (!supabase) return () => {};
  const { data } = supabase.auth.onAuthStateChange((event, session) => cb(event, session));
  return () => data.subscription.unsubscribe();
}

// Messaggi d'errore in italiano
function traduci(msg) {
  const m = (msg || "").toLowerCase();
  if (m.includes("invalid login")) return "Email o password non corretti.";
  if (m.includes("email not confirmed")) return "Devi prima confermare l'email: controlla la posta (anche lo spam).";
  if (m.includes("already registered") || m.includes("already been registered")) return "Esiste già un account con questa email. Prova ad accedere.";
  if (m.includes("password should be at least")) return "La password deve avere almeno 6 caratteri.";
  if (m.includes("unable to validate email") || m.includes("invalid email")) return "Indirizzo email non valido.";
  if (m.includes("rate limit") || m.includes("too many")) return "Troppi tentativi, riprova tra poco.";
  return msg;
}

// ---- DATI: lettura e scrittura per l'utente corrente ----
export async function pullRemote() {
  if (!supabase) return null;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data, error } = await supabase
    .from("app_data").select("payload, updated_at").eq("user_id", user.id).maybeSingle();
  if (error) { console.error("pull:", error.message); return null; }
  return data ? { payload: data.payload, updatedAt: data.updated_at } : null;
}

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

// ---- ID utente corrente ----
export async function getUserId() {
  if (!supabase) return null;
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id || null;
}


// Restituisce il JWT della sessione corrente (per chiamare le API Vercel)
export async function getJwt() {
  if (!supabase) return null;
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token || null;
}
