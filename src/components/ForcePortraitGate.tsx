import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { isStaffAppPath } from "@/lib/appRouteKind";

/**
 * Para rotas do CLIENTE: força orientação retrato.
 * - Tenta `screen.orientation.lock('portrait')` (PWA instalado, Android).
 * - Quando o bloqueio não é suportado (ex.: iPad em Safari, navegadores desktop em modo tablet),
 *   mostra um overlay full-screen pedindo para girar o dispositivo enquanto estiver em landscape.
 * Em rotas de staff/admin não interfere.
 */
export default function ForcePortraitGate() {
  const { pathname } = useLocation();
  const isCustomer = !isStaffAppPath(pathname);
  const [showOverlay, setShowOverlay] = useState(false);

  // Tenta travar orientação nativamente.
  useEffect(() => {
    if (!isCustomer) {
      try {
        // @ts-ignore — nem todos os browsers expõem unlock
        screen.orientation?.unlock?.();
      } catch {
        /* noop */
      }
      return;
    }
    try {
      // @ts-ignore
      const lock = screen.orientation?.lock;
      if (typeof lock === "function") {
        // @ts-ignore
        lock.call(screen.orientation, "portrait").catch(() => {
          /* ignorado — usaremos overlay */
        });
      }
    } catch {
      /* noop */
    }
  }, [isCustomer]);

  // Detecta landscape e ativa overlay (apenas em telas suficientemente grandes — tablets).
  useEffect(() => {
    if (!isCustomer) {
      setShowOverlay(false);
      return;
    }

    const compute = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      const isLandscape = w > h;
      // Considera tablet/desktop em landscape. Em telefones pequenos rodando deitado
      // (largura < 720) também mostra para garantir layout vertical.
      const meaningful = w >= 600;
      setShowOverlay(isLandscape && meaningful);
    };

    compute();
    window.addEventListener("resize", compute);
    window.addEventListener("orientationchange", compute);
    return () => {
      window.removeEventListener("resize", compute);
      window.removeEventListener("orientationchange", compute);
    };
  }, [isCustomer]);

  if (!showOverlay) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 99999,
        background: "#FFFFFF",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 24,
        padding: 32,
        textAlign: "center",
        fontFamily: "Nunito, system-ui, sans-serif",
        color: "#1a1a1a",
      }}
    >
      <div
        aria-hidden
        style={{
          width: 96,
          height: 96,
          borderRadius: 20,
          border: "4px solid #D62300",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          animation: "fp-rotate 2s ease-in-out infinite",
        }}
      >
        <div
          style={{
            width: 36,
            height: 56,
            border: "3px solid #D62300",
            borderRadius: 6,
          }}
        />
      </div>
      <h1 style={{ fontSize: 22, fontWeight: 800, margin: 0 }}>
        Gira el dispositivo
      </h1>
      <p style={{ fontSize: 16, margin: 0, maxWidth: 420, lineHeight: 1.4 }}>
        Para una mejor experiencia, usa el menú en vertical.
        <br />
        Please rotate your device to portrait.
      </p>
      <style>
        {`@keyframes fp-rotate {
          0% { transform: rotate(-90deg); }
          50% { transform: rotate(0deg); }
          100% { transform: rotate(-90deg); }
        }`}
      </style>
    </div>
  );
}
