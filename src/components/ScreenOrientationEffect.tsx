import { useScreenOrientationLock } from "@/hooks/useScreenOrientationLock";

/**
 * Orientação por área:
 * - Cliente / entregador / login equipa → vertical
 * - Admin / painel / KDS → horizontal (rotação automática no telemóvel)
 */
export default function ScreenOrientationEffect() {
  useScreenOrientationLock();

  return (
    <style>{`
        body.fp-rotate {
          overflow: hidden !important;
          position: fixed !important;
          inset: 0 !important;
          margin: 0 !important;
          width: 100% !important;
          height: 100% !important;
        }
        body.fp-rotate > #root {
          position: absolute;
          top: 50%;
          left: 50%;
          width: var(--fp-h) !important;
          height: var(--fp-w) !important;
          max-width: none !important;
          min-height: 0 !important;
          max-height: none !important;
          transform: translate(-50%, -50%) rotate(-90deg);
          transform-origin: center center;
          overflow: auto;
          -webkit-overflow-scrolling: touch;
        }
        html.staff-landscape-layout:not(:has(body.fp-rotate)) #root {
          width: 100%;
          max-width: 100vw;
          min-height: 100dvh;
        }
      `}</style>
  );
}
