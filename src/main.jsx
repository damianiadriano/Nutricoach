import React from "react";
import ReactDOM from "react-dom/client";
import NutriCoach from "./NutriCoach.jsx";
import "./index.css";

// Registrazione esplicita del service worker (richiesta con injectManifest)
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw-push.js", { scope: "/" })
      .then(reg => console.log("SW registrato:", reg.scope))
      .catch(err => console.warn("SW registration failed:", err));
  });
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <NutriCoach />
  </React.StrictMode>
);
