import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { applyBrowserChromeColor, applyStaffAppChrome } from "./lib/brandTokens";
import { isStaffAppPath } from "./lib/appRouteKind";
import { dismissBootShell } from "./lib/bootShell";
import { startStripeDebugOverlayGuard } from "./lib/stripeDebugOverlayGuard";
import { dismissNativeIOSMediaPlayer } from "./lib/panelAlerts";
import { forceStaffRecoveryPathWhenNeeded } from "./lib/staffPasswordRecoveryUrl";

let appMounted = false;

function renderFatalBootError(message: string): void {
  if (appMounted) return; // não destruir a app já montada por erros assíncronos
  const root = document.getElementById("root");
  if (!root) return;
  // se a app já renderizou algo no root, não substituir
  if (root.childElementCount > 0 && root.querySelector("[data-app-root], main, #app, .app, [data-reactroot]")) {
    return;
  }
  root.innerHTML = `
    <div style="min-height:100dvh;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:24px;text-align:center;font-family:system-ui,sans-serif;background:#3A0205;color:#fff">
      <p style="font-size:18px;font-weight:700;margin:0 0 12px">Não foi possível abrir o menu</p>
      <p style="font-size:14px;color:rgba(255,255,255,0.75);margin:0 0 20px;max-width:360px">${message}</p>
      <button type="button" onclick="location.reload()" style="background:#5A0808;color:#fff;border:none;border-radius:999px;padding:12px 24px;font-weight:700;font-size:14px">
        Actualizar página
      </button>
    </div>
  `;
}

if (typeof window !== "undefined") {
  window.__SNAPORDER_APP_READY__ = true;
  window.addEventListener("error", (event) => {
    console.error("[boot:error]", event?.error || event);
    if (appMounted) return;
    const reason = event?.error?.message || event?.message || "erro desconhecido";
    renderFatalBootError(`Erro ao iniciar: ${reason}`);
  });
  window.addEventListener("unhandledrejection", (event) => {
    console.error("[boot:promise]", event.reason);
    if (appMounted) return;
    const reason =
      typeof event.reason === "string"
        ? event.reason
        : event.reason?.message || "promessa rejeitada";
    renderFatalBootError(`Erro ao carregar: ${reason}`);
  });
}

startStripeDebugOverlayGuard();
dismissNativeIOSMediaPlayer();
forceStaffRecoveryPathWhenNeeded();
// Push inicializado sob demanda (evita crash no arranque do TestFlight).
if (typeof window !== "undefined") {
  window.setTimeout(() => {
    void import("./services/nativePush").then((m) => m.initNativePushBridge());
  }, 2500);
}

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
  const mql = window.matchMedia("(display-mode: standalone)");
  // iOS WebView can expose only addListener/removeListener.
  if (typeof mql.addEventListener === "function") {
    mql.addEventListener("change", markStandalone);
  } else if (typeof mql.addListener === "function") {
    mql.addListener(markStandalone);
  }
}

function showBootError(message: string) {
  dismissBootShell();
  renderFatalBootError(message);
}

const rootEl = document.getElementById("root");
if (!rootEl) {
  showBootError("Página incompleta. Tente novamente.");
} else {
  try {
    createRoot(rootEl).render(<App />);
    appMounted = true;
    if (isStaffAppPath()) {
      dismissBootShell();
    }
  } catch (error) {
    console.error("[boot]", error);
    showBootError("Erro ao iniciar. Toque em Actualizar ou limpe o histórico do Safari.");
  }
}
