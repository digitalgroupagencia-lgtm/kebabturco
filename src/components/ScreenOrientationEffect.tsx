import { useScreenOrientationLock } from "@/hooks/useScreenOrientationLock";

/**
 * Orientação por área:
 * - Cliente / entregador / login equipa → vertical
 * - Admin / painel / KDS → horizontal com layout largo em telemóvel
 */
export default function ScreenOrientationEffect() {
  useScreenOrientationLock();

  return (
    <style>{`
      body.fp-rotate,
      body.fl-rotate {
        overflow: hidden !important;
        position: fixed !important;
        inset: 0 !important;
        margin: 0 !important;
      }
      body.fp-rotate > #root,
      body.fl-rotate > #root {
        position: absolute;
        top: 50%;
        left: 50%;
        overflow: auto;
        -webkit-overflow-scrolling: touch;
        transform-origin: center center;
      }
      body.fp-rotate > #root {
        width: var(--fp-h);
        height: var(--fp-w);
        transform: translate(-50%, -50%) rotate(-90deg);
      }
      body.fl-rotate > #root {
        width: var(--fl-h);
        height: var(--fl-w);
        transform: translate(-50%, -50%) rotate(90deg);
      }
      html.staff-landscape-layout #root {
        width: 100%;
        max-width: 100vw;
        min-height: 100dvh;
      }
    `}</style>
  );
}
