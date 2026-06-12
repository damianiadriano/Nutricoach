// ============================================================
//  /api/menu.js — Serverless function (Vercel)
//  Genera un menù giornaliero su misura del piano attivo, usando Gemini.
//  Stesso provider/chiave della stima piatti (GEMINI_API_KEY).
// ============================================================

const MODEL = "gemini-2.5-flash-lite";

function buildSystem(p) {
  return `Sei un nutrizionista che crea menù giornalieri pratici e bilanciati in italiano.
Crea una proposta di menù per UN giorno, con 5 pasti: colazione, spuntino_mattina, pranzo, spuntino_pomeriggio, cena.
Il menù deve avvicinarsi a questi target giornalieri: ${p.kcal} kcal, ${p.protein}g proteine, ${p.carbs}g carboidrati, ${p.fat}g grassi.

Regole vincolanti:
- NIENTE latte vaccino né latticini liquidi (intolleranza). Yogurt greco è OK.
- Alimenti graditi da privilegiare: ${(p.likes||[]).join(", ") || "cucina mediterranea leggera"}.
- Da evitare: ${(p.dislikes||[]).join(", ") || "nessuno in particolare"}.
- Il PRANZO deve essere VELOCE da preparare e FACILMENTE TRASPORTABILE in ufficio (schiscetta/lunch box): piatti freddi o riscaldabili, pochi passaggi, niente cotture lunghe sul momento.
- Colazione tipica gradita: yogurt greco + avena/frutta.
- Porzioni realistiche con grammi. Ingredienti comuni reperibili in Italia.
${p.isSport ? "- È un GIORNO DI SPORT (padel): aumenta un po' i carboidrati e l'energia." : ""}
${p.freeMeals && p.freeMeals.length ? `- Questi pasti sono LIBERI (pasto libero, l'utente mangia fuori dieta): ${p.freeMeals.join(", ")}. Per questi metti un suggerimento leggero/indicativo, senza forzare i macro.` : ""}

Rispondi SOLO con JSON valido, senza testo extra:
{"meals":{"colazione":{"titolo":"...","ingredienti":[{"nome":"yogurt greco","grammi":200}],"kcal":350,"p":25,"c":40,"f":6,"prep":"1 frase di preparazione"},"spuntino_mattina":{...},"pranzo":{...},"spuntino_pomeriggio":{...},"cena":{...}},"nota":"breve nota sul giorno"}
Per "ingredienti" usa nomi semplici e grammi numerici. "prep" max 1 frase. Mantieni il totale vicino ai target.`;
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  const key = process.env.GEMINI_API_KEY;
  if (!key) return res.status(500).json({ error: "Config mancante: GEMINI_API_KEY non impostata su Vercel." });

  try {
    const plan = req.body || {};
    const seed = plan.seed || Math.floor(Math.random() * 1e6);
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${key}`;
    const userMsg = `Genera il menù del giorno. Varia rispetto ai giorni precedenti (seme di variazione: ${seed}). ${plan.dayLabel ? "Giorno: " + plan.dayLabel + "." : ""}`;
    const payload = {
      systemInstruction: { parts: [{ text: buildSystem(plan) }] },
      contents: [{ role: "user", parts: [{ text: userMsg }] }],
      generationConfig: { temperature: 0.9, maxOutputTokens: 1600, responseMimeType: "application/json" },
    };

    const r = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    if (!r.ok) {
      if (r.status === 429) return res.status(429).json({ error: "Limite richieste raggiunto (free tier). Riprova tra poco." });
      const t = await r.text();
      return res.status(502).json({ error: "Errore dal servizio menù.", detail: t.slice(0, 300) });
    }
    const data = await r.json();
    const raw = data?.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
    let parsed;
    try { parsed = JSON.parse(raw); } catch { return res.status(502).json({ error: "Risposta non interpretabile. Riprova." }); }

    const meals = parsed.meals || {};
    const norm = {};
    for (const slot of ["colazione", "spuntino_mattina", "pranzo", "spuntino_pomeriggio", "cena"]) {
      const m = meals[slot];
      if (!m) continue;
      norm[slot] = {
        titolo: String(m.titolo || "").slice(0, 80),
        ingredienti: Array.isArray(m.ingredienti) ? m.ingredienti.slice(0, 10).map(ing => ({
          nome: String(ing.nome || "").toLowerCase().slice(0, 50),
          grammi: Math.max(1, Math.round(parseFloat(ing.grammi) || 0)),
        })).filter(i => i.nome) : [],
        kcal: Math.round(parseFloat(m.kcal) || 0),
        p: +(parseFloat(m.p) || 0).toFixed(0),
        c: +(parseFloat(m.c) || 0).toFixed(0),
        f: +(parseFloat(m.f) || 0).toFixed(0),
        prep: String(m.prep || "").slice(0, 160),
      };
    }
    return res.status(200).json({ meals: norm, nota: String(parsed.nota || "").slice(0, 200) });
  } catch (e) {
    return res.status(500).json({ error: "Errore interno.", detail: String(e).slice(0, 200) });
  }
}
