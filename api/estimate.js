// ============================================================
//  /api/estimate.js  —  Serverless function (Vercel)
//  Stima nutrizionale da TESTO o FOTO usando Google Gemini.
//  La chiave API resta lato server (process.env.GEMINI_API_KEY).
//  L'immagine NON viene salvata: usata al volo e scartata.
// ============================================================

const MODEL = "gemini-2.5-flash-lite"; // economico + multimodale + free tier

const SYSTEM = `Sei un nutrizionista che stima i valori nutrizionali di un piatto.
Ricevi una descrizione testuale OPPURE una foto di un piatto.
Identifica i singoli ingredienti/alimenti distinti (NON un totale unico).
Per ciascuno stima i grammi della porzione e i valori PER 100g.
Rispondi SOLO con JSON valido, senza testo extra, in questo formato:
{"items":[{"name":"riso bianco","grams":120,"kcal100":130,"p100":2.5,"c100":28,"f100":0.3,"confidence":"alta|media|bassa","note":"breve nota"}],"scaleObjectFound":true|false,"scaleNote":"oggetto di scala trovato o no"}
Regole:
- name in italiano, minuscolo, specifico (es. "petto di pollo", non "carne").
- grammi = stima realistica della porzione mostrata/descritta.
- Se l'utente ha indicato i grammi nel testo, USA QUELLI e metti confidence alta.
- Per le FOTO: cerca un oggetto di scala (forchetta, coltello, cucchiaio, piatto standard ~26cm, telefono, mano, tovagliolo). scaleObjectFound=true solo se ne riconosci uno. Se assente, scaleObjectFound=false e abbassa la confidence a "bassa".
- Includi condimenti probabili ma invisibili (olio di cottura, burro) come voce separata con confidence bassa.
- Massimo 12 voci.`;

// Riduce l'output: nessun preambolo, solo JSON.
function buildContents({ text, imageBase64, imageMime }) {
  const parts = [];
  if (imageBase64) {
    parts.push({ inline_data: { mime_type: imageMime || "image/jpeg", data: imageBase64 } });
    parts.push({ text: "Analizza questa foto di un piatto. Cerca un oggetto di scala. " + (text ? "Contesto: " + text : "") });
  } else {
    parts.push({ text: "Descrizione del piatto da analizzare: " + text });
  }
  return [{ role: "user", parts }];
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const key = process.env.GEMINI_API_KEY;
  if (!key) return res.status(500).json({ error: "Config mancante: GEMINI_API_KEY non impostata su Vercel." });

  try {
    const { text, imageBase64, imageMime } = req.body || {};
    if (!text && !imageBase64) return res.status(400).json({ error: "Fornire testo o immagine." });

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${key}`;
    const payload = {
      systemInstruction: { parts: [{ text: SYSTEM }] },
      contents: buildContents({ text, imageBase64, imageMime }),
      generationConfig: { temperature: 0.2, maxOutputTokens: 1024, responseMimeType: "application/json" },
    };

    const r = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!r.ok) {
      const errText = await r.text();
      // 429 = rate limit free tier
      if (r.status === 429) return res.status(429).json({ error: "Limite richieste raggiunto (free tier). Riprova tra poco." });
      return res.status(502).json({ error: "Errore dal servizio di stima.", detail: errText.slice(0, 300) });
    }

    const data = await r.json();
    const raw = data?.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
    let parsed;
    try { parsed = JSON.parse(raw); }
    catch { return res.status(502).json({ error: "Risposta non interpretabile. Riprova." }); }

    const items = Array.isArray(parsed.items) ? parsed.items.slice(0, 12).map(normalizeItem).filter(Boolean) : [];
    if (!items.length) return res.status(200).json({ items: [], scaleObjectFound: !!parsed.scaleObjectFound, scaleNote: parsed.scaleNote || "" });

    return res.status(200).json({
      items,
      scaleObjectFound: !!parsed.scaleObjectFound,
      scaleNote: parsed.scaleNote || "",
    });
  } catch (e) {
    return res.status(500).json({ error: "Errore interno.", detail: String(e).slice(0, 200) });
  }
}

function normalizeItem(it) {
  if (!it || !it.name) return null;
  const num = (v, d = 0) => { const n = parseFloat(v); return isFinite(n) ? n : d; };
  const grams = Math.max(1, Math.round(num(it.grams, 100)));
  const kcal100 = Math.max(0, Math.round(num(it.kcal100)));
  const p100 = Math.max(0, +num(it.p100).toFixed(1));
  const c100 = Math.max(0, +num(it.c100).toFixed(1));
  const f100 = Math.max(0, +num(it.f100).toFixed(1));
  const conf = ["alta", "media", "bassa"].includes(it.confidence) ? it.confidence : "media";
  return { name: String(it.name).toLowerCase().slice(0, 50), grams, kcal100, p100, c100, f100, confidence: conf, note: String(it.note || "").slice(0, 80) };
}

// Vercel: alza il limite del body per accettare immagini ridotte (base64)
export const config = { api: { bodyParser: { sizeLimit: "4mb" } } };
