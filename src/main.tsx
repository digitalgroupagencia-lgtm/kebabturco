import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { applyBrowserChromeColor } from "./lib/brandTokens";

applyBrowserChromeColor();

if (typeof window !== "undefined") {
  const markStandalone = () => {
    if (window.matchMedia("(display-mode: standalone)").matches) {
      document.documentElement.classList.add("pwa-standalone");
    }
  };
  markStandalone();
  window.matchMedia("(display-mode: standalone)").addEventListener("change", markStandalone);
}

function removeBootFallback() {
  document.getElementById("boot-fallback")?.remove();
}

function showBootError(message: string) {
  removeBootFallback();
  const root = document.getElementById("root");
  if (!root) return;
  root.innerHTML = `
    <div style="min-height:100dvh;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:24px;text-align:center;font-family:system-ui,sans-serif;background:#5C1419;color:#fff">
      <p style="font-size:18px;font-weight:700;margin:0 0 12px">Não foi possível abrir o menu</p>
      <p style="font-size:14px;color:rgba(255,255,255,0.75);margin:0 0 20px;max-width:320px">${message}</p>
      <button type="button" onclick="location.reload()" style="background:#8B1A1A;color:#fff;border:none;border-radius:999px;padding:12px 24px;font-weight:700;font-size:14px">
        Actualizar página
      </button>
    </div>
  `;
}

const rootEl = document.getElementById("root");
if (!rootEl) {
  showBootError("Página incompleta. Tente novamente.");
} else {
  try {
    createRoot(rootEl).render(<App />);
    requestAnimationFrame(removeBootFallback);
  } catch (error) {
    console.error("[boot]", error);
    showBootError("Erro ao iniciar. Toque em Actualizar ou limpe o histórico do Safari.");
  }
}
