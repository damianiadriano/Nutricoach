-- ============================================================
--  NutriCoach — Setup database Supabase
--  Incolla TUTTO questo testo nella sezione "SQL Editor" di Supabase
--  e premi "Run". Crea la tabella e le regole di sicurezza.
-- ============================================================

-- Tabella unica: una riga per utente, con tutti i suoi dati in un campo JSON.
create table if not exists public.app_data (
  user_id uuid primary key references auth.users(id) on delete cascade,
  payload jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- Attiva la sicurezza a livello di riga
alter table public.app_data enable row level security;

-- REGOLA: ogni utente (anche anonimo) può leggere SOLO la propria riga
create policy "leggi i propri dati"
  on public.app_data for select
  using ( auth.uid() = user_id );

-- REGOLA: ogni utente può creare la propria riga
create policy "crea i propri dati"
  on public.app_data for insert
  with check ( auth.uid() = user_id );

-- REGOLA: ogni utente può aggiornare solo la propria riga
create policy "aggiorna i propri dati"
  on public.app_data for update
  using ( auth.uid() = user_id )
  with check ( auth.uid() = user_id );

-- Fatto. Nessun dato è leggibile da altri utenti.
