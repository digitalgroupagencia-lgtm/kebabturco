import { useScreenOrientationLock } from "@/hooks/useScreenOrientationLock";
import StaffLandscapePrompt from "@/components/StaffLandscapePrompt";

/**
 * Orientação por área:
 * - Cliente / entregador / login equipa → vertical
 * - Admin / painel / KDS → horizontal real (layout largo como desktop)
 */
export default function ScreenOrientationEffect() {
  useScreenOrientationLock();

  return (
    <>
      <StaffLandscapePrompt />
      <style>{`
        body.fp-rotate {
          overflow: hidden !important;
          position: fixed !important;
          inset: 0 !important;
          margin: 0 !important;
        }
        body.fp-rotate > #root {
          position: absolute;
          top: 50%;
          left: 50%;
          width: var(--fp-h);
          height: var(--fp-w);
          transform: translate(-50%, -50%) rotate(-90deg);
          transform-origin: center center;
          overflow: auto;
          -webkit-overflow-scrolling: touch;
        }
        html.staff-landscape-layout #root {
          width: 100%;
          max-width: 100vw;
          min-height: 100dvh;
        }
      `}</style>
    </>
  );
}
