// ============================================================
//  src/estimate.js — lato client
//  - ridimensiona l'immagine prima dell'invio (foto iPhone pesanti)
//  - chiama /api/estimate
//  - l'immagine resta solo in memoria, non viene salvata
// ============================================================

// Ridimensiona a max 512px lato lungo, JPEG qualità 0.7 → pochi KB
export async function resizeImage(file, maxSide = 512, quality = 0.7) {
  const dataUrl = await new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result);
    r.onerror = rej;
    r.readAsDataURL(file);
  });
  const img = await new Promise((res, rej) => {
    const i = new Image();
    i.onload = () => res(i);
    i.onerror = rej;
    i.src = dataUrl;
  });
  let { width, height } = img;
  if (width > height && width > maxSide) { height = Math.round(height * maxSide / width); width = maxSide; }
  else if (height > maxSide) { width = Math.round(width * maxSide / height); height = maxSide; }
  const canvas = document.createElement("canvas");
  canvas.width = width; canvas.height = height;
  canvas.getContext("2d").drawImage(img, 0, 0, width, height);
  const out = canvas.toDataURL("image/jpeg", quality);
  return out.split(",")[1]; // solo base64
}

// Stima da testo
export async function estimateFromText(text) {
  const r = await fetch("/api/estimate", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  });
  return handle(r);
}

// Stima da foto (con eventuale testo di contesto)
export async function estimateFromPhoto(file, contextText = "") {
  const imageBase64 = await resizeImage(file);
  const r = await fetch("/api/estimate", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ imageBase64, imageMime: "image/jpeg", text: contextText }),
  });
  return handle(r);
}

async function handle(r) {
  let data = null;
  try { data = await r.json(); } catch { /* ignore */ }
  if (!r.ok) {
    const msg = data?.error || (r.status === 429 ? "Troppe richieste, riprova tra poco." : "Servizio non disponibile.");
    throw new Error(msg);
  }
  return data; // { items:[...], scaleObjectFound, scaleNote }
}

// La feature è disponibile solo se l'endpoint esiste (online).
export const estimateAvailable = typeof fetch !== "undefined";

// ---- Generazione menù del giorno (usa il piano attivo) ----
export async function generateMenu(planPayload) {
  const r = await fetch("/api/menu", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify(planPayload),
  });
  return handle(r);
}
