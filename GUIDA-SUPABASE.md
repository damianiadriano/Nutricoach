# Sincronizzazione anonima con Supabase

Questa guida attiva la sincronizzazione automatica dei dati tra tutti i tuoi
dispositivi, **senza salvare alcun dato personale**. Tempo richiesto: ~15 minuti,
una volta sola.

## Come resta anonimo

- L'app usa l'**accesso anonimo** di Supabase: alla prima apertura crea
  un'identità con un ID casuale. Niente email, niente nome, niente password.
- I tuoi dati (pasti, peso, allenamenti) finiscono in una sola riga legata a
  quell'ID, protetta da regole che impediscono a chiunque altro di leggerli.
- Nel database non c'è nulla che possa ricondurre a te.

---

## Passo 1 — Crea il progetto Supabase (gratis)

1. Vai su https://supabase.com e registrati (puoi usare GitHub).
2. Clicca **New project**.
3. Dai un nome (es. `nutricoach`), scegli una password per il database
   (salvala da qualche parte, anche se non ti servirà per l'app) e una region
   vicina (es. *West EU*).
4. Attendi 1-2 minuti che il progetto sia pronto.

## Passo 2 — Crea la tabella e le regole di sicurezza

1. Nel menu a sinistra apri **SQL Editor**.
2. Clicca **+ New query**.
3. Apri il file `supabase-setup.sql` (incluso nel progetto), copia **tutto** il
   contenuto e incollalo nell'editor.
4. Clicca **Run** (in basso a destra). Deve comparire "Success".

## Passo 3 — Abilita l'accesso anonimo

1. Nel menu a sinistra: **Authentication** → **Providers** (o **Sign In / Up**).
2. Trova **Anonymous Sign-ins** e attivalo (toggle su ON).
3. Salva.

## Passo 4 — Copia le due chiavi nell'app

1. Nel menu a sinistra: **Project Settings** (icona ingranaggio) → **API**.
2. Ti servono due valori:
   - **Project URL** (es. `https://abcdefgh.supabase.co`)
   - **anon public** key (una lunga stringa sotto "Project API keys")
3. Apri il file `src/sync.js` del progetto e incolla i due valori al posto di
   `INCOLLA_QUI_PROJECT_URL` e `INCOLLA_QUI_ANON_KEY`:

   ```js
   const SUPABASE_URL = "https://abcdefgh.supabase.co";
   const SUPABASE_KEY = "eyJhbGciOi...la-tua-chiave-anon...";
   ```

   > La chiave "anon public" è pensata per stare nel codice del browser: da sola
   > non dà accesso a nulla, perché sono le regole di sicurezza del Passo 2 a
   > proteggere i dati.

   **In alternativa**, se pubblichi su Vercel, puoi non toccare il file e
   impostare invece due *Environment Variables* nel progetto Vercel:
   `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`. Più pulito, ma facoltativo.

## Passo 5 — Ripubblica

Se usi Vercel collegato a GitHub: ricarica i file aggiornati su GitHub e Vercel
ripubblica da solo. Altrimenti rilancia `vercel --prod`.

Apri l'app: in alto vedrai il pallino verde **"Sincronizzato"**. Fatto.

---

## Usare l'app su più dispositivi

L'identità anonima vive sul dispositivo dove è nata. Per ritrovare gli stessi
dati altrove:

1. Sul dispositivo principale apri la scheda **☁️ Sync** → **Genera codice di
   collegamento** → copia.
2. Sull'altro dispositivo apri la stessa app (stesso indirizzo), vai in **☁️
   Sync** → incolla il codice in **Collega questo dispositivo** → **Collega e
   sincronizza**.
3. Da quel momento i due dispositivi condividono gli stessi dati, in automatico.

⚠️ Quel codice è la chiave dei tuoi dati: trattalo come una password e non
condividerlo.

---

## Domande frequenti

**Funziona offline?**
Sì. L'app salva sempre prima sul dispositivo (come fa di base) e poi allinea il
cloud quando c'è connessione. Se sei offline, il pallino diventa "Offline" e la
sincronizzazione riprende da sola appena torni online.

**Cosa succede se apro l'app contemporaneamente su due dispositivi?**
Vince l'ultimo salvataggio. Per uso personale è più che sufficiente; evita solo
di modificare lo stesso giorno in contemporanea su due device.

**È davvero gratis?**
Sì. Il piano gratuito di Supabase regge ampiamente un uso personale (500 MB di
database, i tuoi dati pesano pochi KB).

**Posso cancellare tutto dal cloud?**
Sì: dal pannello Supabase, sezione **Table Editor** → `app_data` → elimina la
riga. Oppure **Authentication** → elimina l'utente anonimo.
