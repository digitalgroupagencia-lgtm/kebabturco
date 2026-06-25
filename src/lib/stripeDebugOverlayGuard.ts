/**
 * Bloqueia overlays de debug/inspector do Stripe injetados por extensões
 * de browser ("Stripe Shell", "Stripe Elements Inspector").
 *
 * IMPORTANTE: o nosso código nunca carrega essas UIs, elas vêm de
 * extensões instaladas pelo utilizador. Mas em produção (cliente final
 * no checkout) escondemos qualquer vestígio por segurança.
 *
 * O CSS em `index.css` já esconde elementos com IDs/classes conhecidas;
 * este observer é a segunda linha de defesa para qualquer DOM injetado
 * tardiamente.
 */

const DEBUG_SELECTORS = [
  '[id^="stripe-shell"]',
  '[id^="stripe-dev"]',
  '[id^="stripe-elements-inspector"]',
  '[class*="stripe-shell"]',
  '[class*="stripe-dev-tools"]',
  '[class*="stripe-elements-inspector"]',
  'iframe[src*="stripe.com/v3/dev"]',
  'iframe[name*="stripe-shell"]',
  'iframe[name*="stripe-elements-inspector"]',
];

let started = false;

function purge(root: ParentNode) {
  DEBUG_SELECTORS.forEach((sel) => {
    root.querySelectorAll(sel).forEach((el) => {
      try {
        (el as HTMLElement).style.display = "none";
        el.remove();
      } catch {
        /* ignora */
      }
    });
  });
}

export function startStripeDebugOverlayGuard() {
  if (started || typeof window === "undefined" || typeof document === "undefined") return;
  started = true;

  // Modo dev local: deixar como está, para devs poderem usar a extensão.
  if (import.meta.env.DEV) return;

  // Limpeza inicial
  purge(document);

  // Observer leve no body, purga overlays injetados depois.
  try {
    const observer = new MutationObserver((mutations) => {
      for (const m of mutations) {
        m.addedNodes.forEach((node) => {
          if (node.nodeType !== 1) return;
          purge(node as Element);
        });
      }
    });
    observer.observe(document.documentElement, { childList: true, subtree: true });
  } catch {
    /* SSR / sandbox sem MutationObserver */
  }
}
