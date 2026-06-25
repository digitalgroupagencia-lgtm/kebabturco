import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { applyBrowserChromeColor, applyStaffAppChrome } from "./lib/brandTokens";
import { isStaffAppPath } from "./lib/appRouteKind";
import { dismissBootShell } from "./lib/bootShell";
import { startStripeDebugOverlayGuard } from "./lib/stripeDebugOverlayGuard";
import { initNativePushBridge } from "./services/nativePush";

if (typeof window !== "undefined") {
  window.__SNAPORDER_APP_READY__ = true;
}

startStripeDebugOverlayGuard();
void initNativePushBridge();

if (isStaffAppPath()) {
  applyStaffAppChrome();
} else {
  applyBrowserChromeColor();
}

if (typeof window !== "undefined") {
  const markStandalone = () => {
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
    if (standalone) {
      document.documentElement.classList.add("pwa-standalone");
    }
  };
  markStandalone();
  window.matchMedia("(display-mode: standalone)").addEventListener("change", markStandalone);
}

function showBootError(message: string) {
  dismissBootShell();
  const root = document.getElementById("root");
  if (!root) return;
  root.innerHTML = `
    <div style="min-height:100dvh;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:24px;text-align:center;font-family:system-ui,sans-serif;background:#3A0205;color:#fff">
      <p style="font-size:18px;font-weight:700;margin:0 0 12px">Não foi possível abrir o menu</p>
      <p style="font-size:14px;color:rgba(255,255,255,0.75);margin:0 0 20px;max-width:320px">${message}</p>
      <button type="button" onclick="location.reload()" style="background:#5A0808;color:#fff;border:none;border-radius:999px;padding:12px 24px;font-weight:700;font-size:14px">
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
    if (isStaffAppPath()) {
      dismissBootShell();
    }
  } catch (error) {
    console.error("[boot]", error);
    showBootError("Erro ao iniciar. Toque em Actualizar ou limpe o histórico do Safari.");
  }
}
