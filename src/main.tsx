/**
 * Entrada mínima: marca a app como pronta antes de carregar React e o menu
 * (no iPhone o bundle principal demora vários segundos a avaliar imports).
 */
if (typeof window !== "undefined") {
  window.__SNAPORDER_APP_READY__ = true;
}

void import("./appMount.tsx").catch((error) => {
  console.error("[boot] appMount failed", error);
  const el = document.getElementById("boot-fallback");
  if (!el) return;
  el.innerHTML =
    '<div style="min-height:100dvh;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:24px;text-align:center;font-family:system-ui,sans-serif;color:#fff;background:#5F0504">' +
    '<p style="font-size:18px;font-weight:700;margin:0 0 12px">Kebab Turco</p>' +
    '<p style="font-size:14px;opacity:0.85;margin:0 0 20px;max-width:320px">Não foi possível abrir o menu. Toque em Actualizar.</p>' +
    '<button type="button" id="boot-reload-btn" style="background:#fff;color:#5F0504;border:none;border-radius:999px;padding:12px 24px;font-weight:700;font-size:14px">Actualizar</button>' +
    "</div>";
  const btn = document.getElementById("boot-reload-btn");
  if (btn) btn.addEventListener("click", () => window.location.reload());
});
