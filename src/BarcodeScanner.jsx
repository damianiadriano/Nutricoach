// ============================================================
//  BarcodeScanner.jsx
//  Scansione codice a barre dalla fotocamera.
//  - Su Android/Chrome usa BarcodeDetector API (nativa, veloce)
//  - Su iOS/Safari usa @zxing/browser (WebAssembly-free, JS puro)
//  - Dopo la scansione chiama onDetect(ean) con il codice trovato
// ============================================================
import { useState, useEffect, useRef } from "react";

// Lookup EAN su Open Food Facts
async function lookupEAN(ean) {
  const url = `https://world.openfoodfacts.org/api/v2/product/${ean}?fields=product_name,brands,nutriments,serving_size,serving_quantity,image_small_url`;
  const res = await fetch(url, { headers: { "User-Agent": "NutriCoach - personal" } });
  if (!res.ok) return null;
  const data = await res.json();
  if (data.status !== 1 || !data.product) return null;
  const p = data.product;
  const n = p.nutriments || {};
  const kcal100 = n["energy-kcal_100g"] ?? (n["energy_100g"] ? n["energy_100g"] / 4.184 : null);
  if (kcal100 == null) return null;
  return {
    name: [p.product_name, p.brands].filter(Boolean).join(" · ").slice(0, 60) || "Prodotto senza nome",
    img: p.image_small_url || null,
    kcal100: Math.round(kcal100),
    p100: +(n["proteins_100g"] ?? 0).toFixed(1),
    c100: +(n["carbohydrates_100g"] ?? 0).toFixed(1),
    f100: +(n["fat_100g"] ?? 0).toFixed(1),
    serving: p.serving_quantity ? Math.round(p.serving_quantity) : null,
    servingTxt: p.serving_size || null,
    ean,
  };
}

export default function BarcodeScanner({ onClose, onAdd }) {
  const videoRef = useRef(null);
  const [status, setStatus] = useState("starting"); // starting|scanning|found|error|notfound
  const [product, setProduct] = useState(null);
  const [grams, setGrams] = useState(100);
  const [errMsg, setErrMsg] = useState("");
  const stopRef = useRef(null); // funzione per fermare lo scanner

  useEffect(() => {
    let active = true;
    startScanner().then(stopFn => { if (active && stopFn) stopRef.current = stopFn; });
    return () => {
      active = false;
      stopRef.current?.();
    };
  }, []);

  async function startScanner() {
    if (!videoRef.current) return;
    let stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      videoRef.current.srcObject = stream;
      await videoRef.current.play();
    } catch (e) {
      setStatus("error");
      setErrMsg("Fotocamera non accessibile. Controlla i permessi nelle impostazioni del browser.");
      return;
    }

    setStatus("scanning");

    // Usa BarcodeDetector se disponibile (Android/Chrome), altrimenti ZXing
    if (typeof BarcodeDetector !== "undefined") {
      return startNativeDetector(stream);
    } else {
      return startZXing(stream);
    }
  }

  // --- Metodo 1: BarcodeDetector nativa (Android/Chrome) ---
  async function startNativeDetector(stream) {
    const detector = new BarcodeDetector({ formats: ["ean_13", "ean_8", "upc_a", "upc_e", "code_128"] });
    let running = true;
    const loop = async () => {
      if (!running || !videoRef.current) return;
      try {
        const codes = await detector.detect(videoRef.current);
        if (codes.length > 0) {
          running = false;
          await handleCode(codes[0].rawValue);
          return;
        }
      } catch (e) { /* frame non pronto */ }
      if (running) requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
    return () => { running = false; stopStream(stream); };
  }

  // --- Metodo 2: ZXing (iOS/Safari e tutti i browser) ---
  async function startZXing(stream) {
    try {
      const { BrowserMultiFormatReader } = await import("@zxing/browser");
      const reader = new BrowserMultiFormatReader();
      const controls = await reader.decodeFromStream(stream, videoRef.current, async (result, err) => {
        if (result) {
          controls.stop();
          await handleCode(result.getText());
        }
      });
      return () => { controls.stop(); stopStream(stream); };
    } catch (e) {
      setStatus("error");
      setErrMsg("Scanner non disponibile su questo browser. Cerca il prodotto per nome.");
    }
  }

  function stopStream(stream) {
    stream?.getTracks().forEach(t => t.stop());
    if (videoRef.current) videoRef.current.srcObject = null;
  }

  async function handleCode(ean) {
    setStatus("found");
    const prod = await lookupEAN(ean);
    if (!prod) {
      setStatus("notfound");
      setErrMsg(`Codice ${ean} non trovato nel database. Cerca il prodotto per nome.`);
      return;
    }
    setProduct(prod);
    setGrams(prod.serving || 100);
  }

  const fct = grams / 100;

  return (
    <div onClick={e => e.stopPropagation()} style={{ background: "#1E293B", borderRadius: "16px 16px 0 0", width: "100%", maxWidth: 720, maxHeight: "88vh", display: "flex", flexDirection: "column", border: "1px solid #334155" }}>
      <div style={{ padding: "14px 16px 10px", borderBottom: "1px solid #334155", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "var(--text-strong)" }}>📷 Scansiona codice a barre</h3>
        <button onClick={onClose} style={{ background: "none", border: "none", color: "var(--text-dim)", fontSize: 22, cursor: "pointer" }}>×</button>
      </div>

      <div style={{ overflowY: "auto", padding: "14px 16px 24px" }}>
        {/* viewfinder */}
        {(status === "starting" || status === "scanning") && (
          <div style={{ position: "relative", borderRadius: 12, overflow: "hidden", background: "#000", marginBottom: 12 }}>
            <video ref={videoRef} playsInline muted style={{ width: "100%", display: "block", maxHeight: 280, objectFit: "cover" }} />
            {/* mirino */}
            <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", pointerEvents: "none" }}>
              <div style={{ width: 220, height: 100, border: "2px solid #3B82F6", borderRadius: 8, boxShadow: "0 0 0 2000px rgba(0,0,0,0.45)" }}>
                <div style={{ position: "absolute", top: 0, left: 0, width: 20, height: 20, borderTop: "3px solid #60A5FA", borderLeft: "3px solid #60A5FA", borderRadius: "4px 0 0 0" }} />
                <div style={{ position: "absolute", top: 0, right: 0, width: 20, height: 20, borderTop: "3px solid #60A5FA", borderRight: "3px solid #60A5FA", borderRadius: "0 4px 0 0" }} />
                <div style={{ position: "absolute", bottom: 0, left: 0, width: 20, height: 20, borderBottom: "3px solid #60A5FA", borderLeft: "3px solid #60A5FA", borderRadius: "0 0 0 4px" }} />
                <div style={{ position: "absolute", bottom: 0, right: 0, width: 20, height: 20, borderBottom: "3px solid #60A5FA", borderRight: "3px solid #60A5FA", borderRadius: "0 0 4px 0" }} />
              </div>
            </div>
            {status === "scanning" && <div style={{ position: "absolute", bottom: 8, width: "100%", textAlign: "center", fontSize: 12, color: "#60A5FA" }}>Punta il codice a barre dentro il mirino</div>}
            {status === "starting" && <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", color: "#64748B", fontSize: 13 }}>Avvio fotocamera…</div>}
          </div>
        )}

        {/* trovato */}
        {status === "found" && product && (
          <div style={{ background: "#0F172A", borderRadius: 10, padding: 14, border: "1px solid #334155" }}>
            <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 10 }}>
              {product.img
                ? <img src={product.img} alt="" style={{ width: 48, height: 48, borderRadius: 8, objectFit: "cover" }} />
                : <div style={{ width: 48, height: 48, borderRadius: 8, background: "#1E293B", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 }}>🛒</div>
              }
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text-strong)", lineHeight: 1.3 }}>{product.name}</div>
                <div style={{ fontSize: 11, color: "var(--text-dim)" }}>EAN: {product.ean} · per 100g: {product.kcal100} kcal · P{product.p100} C{product.c100} F{product.f100}</div>
              </div>
            </div>
            <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 12 }}>
              <input type="number" value={grams} onChange={e => setGrams(Math.max(0, parseInt(e.target.value) || 0))}
                style={{ width: 80, padding: "9px 10px", borderRadius: 8, border: "1px solid #334155", background: "#1E293B", color: "var(--text)", fontSize: 14, outline: "none" }} />
              <span style={{ fontSize: 12, color: "var(--text-dim)" }}>g →</span>
              <span style={{ fontSize: 14, color: "var(--accent-light)", fontWeight: 700 }}>{Math.round(product.kcal100 * fct)} kcal</span>
              <span style={{ fontSize: 11, color: "var(--text-dim)" }}>P{(product.p100 * fct).toFixed(1)} C{(product.c100 * fct).toFixed(1)} F{(product.f100 * fct).toFixed(1)}</span>
            </div>
            <button onClick={() => onAdd(product, grams)}
              style={{ width: "100%", padding: 12, borderRadius: 8, border: "none", background: "linear-gradient(135deg,#2563EB,#1D4ED8)", color: "#fff", fontWeight: 700, cursor: "pointer", fontSize: 14 }}>
              + Aggiungi al pasto
            </button>
            <button onClick={() => { setStatus("scanning"); setProduct(null); stopRef.current?.(); startScanner(); }}
              style={{ width: "100%", padding: 9, borderRadius: 8, border: "1px solid #334155", background: "transparent", color: "var(--text-dim)", cursor: "pointer", fontSize: 12, marginTop: 8 }}>
              ↺ Scansiona un altro
            </button>
          </div>
        )}

        {/* errori */}
        {(status === "error" || status === "notfound") && (
          <div style={{ background: "#422006", borderRadius: 8, padding: "12px 14px", fontSize: 12, color: "#FBBF24", lineHeight: 1.5 }}>
            {status === "notfound" ? "🔍 " : "⚠️ "}{errMsg}
            {status === "notfound" && <div style={{ marginTop: 8, color: "var(--text-dim)" }}>Puoi cercarlo con 🔍 Cerca prodotto confezionato nel pasto.</div>}
          </div>
        )}
      </div>
    </div>
  );
}
