# NutriCoach — Attivare la stima dei piatti (testo + foto)

Questa funzione stima i valori nutrizionali di un piatto da una descrizione testuale
o da una foto, e propone gli ingredienti come voci modificabili da inserire nel diario.

Usa **Google Gemini** (modello `gemini-2.5-flash-lite`): multimodale, economico e con
un **free tier** che per uso personale copre praticamente tutto. La chiave API resta
**sul server** (mai nel telefono), grazie a una piccola funzione su Vercel.

---

## File da pubblicare (3, oltre alle icone già fatte)

| File | Dove va su GitHub | Cosa fa |
|------|-------------------|---------|
| `NutriCoach.jsx` | cartella `src/` (sostituisce) | interfaccia stima + badge 📷/✨ |
| `estimate.js` | cartella `src/` (NUOVO) | ridimensiona foto e chiama il server |
| `api-estimate.js` → rinomina in **`estimate.js`** | cartella **`api/`** (NUOVA) | tiene la chiave e chiama Gemini |

⚠️ Attenzione ai due file con lo stesso nome ma cartelle diverse:
- `src/estimate.js` (client)
- `api/estimate.js` (server) ← questo è il file che ti ho dato come `api-estimate.js`: **caricalo nella cartella `api` rinominandolo `estimate.js`**.

---

## Passo 1 — Crea la chiave Google Gemini (gratis)

1. Vai su **aistudio.google.com** e accedi con un account Google.
2. In alto/menu cerca **"Get API key"** (o "Crea chiave API").
3. Crea una chiave in un nuovo progetto. **Copiala** (è una lunga stringa).
4. Resta sul piano gratuito: non serve carta di credito. Il free tier dà circa
   **1.000 richieste al giorno**, molto più del necessario.

> Nota privacy: sul piano gratuito Google può usare i contenuti inviati per
> migliorare i suoi modelli. Noi inviamo solo descrizioni di piatti e foto di cibo,
> nessun dato personale. L'immagine non viene salvata da nessuna parte.

## Passo 2 — Carica i file su GitHub

1. **`src/NutriCoach.jsx`**: cartella `src` → Upload files → sostituisci.
2. **`src/estimate.js`**: cartella `src` → Upload files → aggiungi il file `estimate.js` (quello piccolo, client).
3. **`api/estimate.js`**:
   - Dalla pagina principale del repo: **Add file → Create new file**
   - Nel nome scrivi: `api/estimate.js` (la `/` crea la cartella `api`)
   - Incolla il contenuto del file che ti ho dato come `api-estimate.js`
   - Commit.

## Passo 3 — Imposta la chiave su Vercel (variabile d'ambiente)

La chiave NON sta nel codice: si mette nelle impostazioni di Vercel.

1. Vai sul tuo progetto su **vercel.com** → **Settings** → **Environment Variables**.
2. Aggiungi una variabile:
   - **Name**: `GEMINI_API_KEY`
   - **Value**: incolla la chiave copiata al Passo 1
   - Lascia selezionati tutti gli ambienti (Production/Preview/Development).
3. Salva.
4. Vai su **Deployments** → sul deploy più recente, menu (···) → **Redeploy**
   (serve perché la variabile venga letta).

## Passo 4 — Prova

1. Apri l'app (chiudi e riapri dalla Home), apri un pasto, tocca **✨ Stima un piatto**.
2. Prova prima col testo: "pasta al pomodoro 120g, parmigiano 15g". Premi *Stima dal testo*.
3. Poi prova con una foto. Per i pesi migliori, metti una forchetta o il telefono accanto al piatto.

---

## Come funziona, in breve

- **Due ingressi, stesso motore**: testo o foto finiscono nella stessa stima.
- **Lista, non totale**: ottieni una voce per ingrediente, ognuna con kcal e macro
  per 100g e per la porzione, più una **confidenza** (alta/media/bassa).
- **Tutto modificabile**: correggi nome, grammi, spunta cosa inserire.
- **Tracciabilità**: le voci da foto entrano nel diario con dicitura "recuperato da
  piatto … (foto)" e un'icona 📷, così riconosci a colpo d'occhio le stime più incerte.
- **Salvabile come ⭐**: ogni voce può diventare un alimento personalizzato riutilizzabile.
- **Foto**: disclaimer sempre visibile, controllo dell'oggetto di scala, confidenza
  abbassata d'ufficio, immagine ridotta a 512px prima dell'invio e **mai salvata**.
- **Fallback**: se sei offline o la stima fallisce, inserisci a mano come sempre.

---

## Costi reali (per decidere serenamente)

- **Free tier**: ~1.000 richieste/giorno gratis. Per uso personale = sempre gratis.
- Se mai superassi il gratuito (improbabile):
  - una stima **da testo** ≈ **$0,0001** (un decimo di millesimo di dollaro)
  - una stima **da foto** ≈ **$0,0002–0,0003**
  - Anche 500 stime in un mese ≈ **~$0,10**.
- **Salvaguardia spesa**: in Google AI Studio puoi restare in piano gratuito senza
  carta (zero rischio di addebiti). Se passi al piano a pagamento, puoi impostare un
  **budget alert** in Google Cloud Console (es. tetto 1€/mese) che ti avvisa.

## Limiti da conoscere (onestà)

- La stima **da foto è approssimativa**: dedurre i grammi da un'immagine ha errori
  facilmente del 20–40%, e olio/burro/zucchero spesso non si "vedono". L'oggetto di
  scala aiuta ma non risolve. Usala come punto di partenza veloce, **correggendo a mano**.
- La stima **da testo con grammi indicati** è più affidabile (l'AI fa soprattutto il
  calcolo nutrizionale).
- È una **funzione online**: senza rete non è disponibile, ma l'inserimento manuale sì.

## Se qualcosa non va

- **"Config mancante: GEMINI_API_KEY"** → non hai impostato la variabile su Vercel
  (Passo 3) o non hai fatto il Redeploy.
- **Errore 429 / "Troppe richieste"** → limite del free tier momentaneo: aspetta un minuto.
- **La stima non parte** → controlla di essere online; in alternativa inserisci a mano.
