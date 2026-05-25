import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { isPlatformHost } from "@/lib/platformHosts";
import { isEmbeddedTenantPreview } from "@/lib/tenantPreview";

function redirectPlatformHostIfNeeded() {
  if (!isPlatformHost(window.location.hostname)) return;
  const params = new URLSearchParams(window.location.search);
  if (params.get("preview") === "1" && params.get("tenant")) return;
  const path = window.location.pathname || "/";
  if (path === "/" || path === "") {
    window.location.replace("/auth");
    return;
  }
  const allowed =
    path.startsWith("/admin") ||
    path === "/auth" ||
    path.startsWith("/auth/") ||
    path === "/install";
  if (!allowed) window.location.replace("/admin");
}

redirectPlatformHostIfNeeded();

function removeBootFallback() {
  document.getElementById("boot-fallback")?.remove();
}

function showBootError(message: string) {
  removeBootFallback();
  const root = document.getElementById("root");
  if (!root) return;
  root.innerHTML = `
    <div style="min-height:100vh;min-height:100dvh;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:24px;text-align:center;font-family:system-ui,sans-serif;background:#fff">
      <p style="font-size:18px;font-weight:700;margin:0 0 12px">Não foi possível abrir o menu</p>
      <p style="font-size:14px;color:#666;margin:0 0 20px;max-width:320px">${message}</p>
      <button type="button" onclick="location.reload()" style="background:#CC0000;color:#fff;border:none;border-radius:999px;padding:12px 24px;font-weight:700;font-size:14px">
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
