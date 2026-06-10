# NutriCoach — Guida alla pubblicazione

La tua app personale di nutrizione e coaching. Questa guida ti porta da zero ad
avere l'app sul telefono, con icona sulla home, in circa 10-15 minuti la prima volta.
Non serve saper programmare: si tratta di caricare file e cliccare pulsanti.

I tuoi dati restano **solo sul tuo dispositivo** (nel browser). Nessun server, nessun account dove finiscono i tuoi pasti o il tuo peso.

---

## Cosa ti serve (gratis)

1. Un account **GitHub** → https://github.com/signup
2. Un account **Vercel** → https://vercel.com/signup (accedi con "Continue with GitHub", è la via più semplice)

---

## Metodo 1 — Vercel collegato a GitHub (consigliato)

Questo metodo ti dà aggiornamenti automatici: se un giorno modifichi l'app, basta ricaricare i file su GitHub e Vercel ripubblica da solo.

### Passo 1 — Carica il progetto su GitHub
1. Vai su https://github.com/new
2. Dai un nome al repository, es. `nutricoach`. Lascialo pure **Private**.
3. Clicca **Create repository**.
4. Nella pagina che appare, clicca il link **"uploading an existing file"**.
5. Trascina nella finestra **tutto il contenuto** della cartella `nutricoach`
   (le cartelle `src`, `public` e i file `package.json`, `vite.config.js`,
   `index.html`, `.gitignore`).
   ⚠️ NON caricare le cartelle `node_modules` o `dist` se presenti: non servono.
6. In fondo, clicca **Commit changes**.

### Passo 2 — Pubblica con Vercel
1. Vai su https://vercel.com/new
2. Trovi il repository `nutricoach` nell'elenco → clicca **Import**.
3. Vercel riconosce da solo che è un progetto **Vite**. Non toccare nulla.
4. Clicca **Deploy** e attendi ~1 minuto.
5. Apparirà un indirizzo tipo `https://nutricoach-xxxx.vercel.app` — **quella è la tua app online.**

### Passo 3 — Installala sul telefono
**iPhone (Safari):**
1. Apri l'indirizzo Vercel in **Safari**.
2. Tocca il pulsante Condividi (quadrato con freccia in alto).
3. Scorri e tocca **"Aggiungi alla schermata Home"**.
4. Conferma: ora hai l'icona di NutriCoach come una vera app.

**Android (Chrome):**
1. Apri l'indirizzo in Chrome.
2. Menu (tre puntini) → **"Installa app"** o **"Aggiungi a schermata Home"**.

---

## Metodo 2 — Vercel senza GitHub (ancora più rapido, senza aggiornamenti automatici)

Se vuoi solo metterla online velocemente:
1. Installa lo strumento da terminale: apri il Terminale e digita
   `npm install -g vercel`
2. Entra nella cartella del progetto: `cd percorso/della/cartella/nutricoach`
3. Digita `vercel` e segui le domande (accetta i valori di default premendo Invio).
4. Al termine ti dà l'indirizzo pubblico. Per renderlo definitivo: `vercel --prod`.

---

## Provarla sul tuo computer prima di pubblicare (facoltativo)

Nella cartella del progetto, da terminale:
```
npm install
npm run dev
```
Apri l'indirizzo che compare (di solito http://localhost:5173).

---

## Domande frequenti

**I miei dati sono al sicuro?**
Sì: restano nella memoria locale del browser del dispositivo su cui usi l'app.
Non vengono inviati da nessuna parte.

**Se cambio telefono perdo i dati?**
Sì, i dati non si sincronizzano tra dispositivi (è il prezzo della privacy totale).
Usa sempre lo stesso dispositivo/browser. Per backup avanzati si potrebbe aggiungere
un export/import dei dati — chiedi pure se ti serve.

**La ricerca prodotti (Open Food Facts) funziona?**
Sì, una volta online funziona normalmente perché parte dal browser.

**L'Apple Watch si collega da solo?**
No: come spiegato, una web-app non accede a HealthKit. Continui a copiare a mano
le kcal dall'app Allenamento. È l'unico limite rispetto a un'app nativa.

**Quanto costa?**
Zero. I piani gratuiti di GitHub e Vercel sono più che sufficienti per uso personale.
