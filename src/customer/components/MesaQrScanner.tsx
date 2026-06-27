import { useCallback, useEffect, useId, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { Camera, CameraOff, Loader2 } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

type MesaQrScannerProps = {
  active: boolean;
  onDetected: (raw: string) => void;
};

type ScannerStatus = "idle" | "awaiting_tap" | "starting" | "live" | "denied" | "unsupported";

function isMobileSafari(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  const ios = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const safari = /Safari/i.test(ua) && !/Chrome|CriOS|FxiOS|EdgiOS/i.test(ua);
  return ios || (safari && /Mobi|Android/i.test(ua));
}

const MesaQrScanner = ({ active, onDetected }: MesaQrScannerProps) => {
  const { t } = useLanguage();
  const elementId = useId().replace(/:/g, "");
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const handledRef = useRef(false);
  const [status, setStatus] = useState<ScannerStatus>("idle");
  const needsTap = isMobileSafari();

  const stopScanner = useCallback(async () => {
    const existing = scannerRef.current;
    scannerRef.current = null;
    if (!existing) return;
    try {
      await existing.stop();
    } catch {
      /* ignore */
    }
    try {
      existing.clear();
    } catch {
      /* ignore */
    }
  }, []);

  const startScanner = useCallback(async () => {
    if (!active || handledRef.current) return;

    setStatus("starting");
    handledRef.current = false;

    try {
      await stopScanner();
      const scanner = new Html5Qrcode(elementId, { verbose: false });
      scannerRef.current = scanner;

      const config = {
        fps: 12,
        qrbox: (viewfinderWidth: number, viewfinderHeight: number) => {
          const size = Math.min(viewfinderWidth, viewfinderHeight) * 0.72;
          return { width: size, height: size };
        },
        aspectRatio: 1,
      };

      const onScan = (decoded: string) => {
        if (handledRef.current) return;
        handledRef.current = true;
        onDetected(decoded);
        void stopScanner();
      };

      try {
        await scanner.start({ facingMode: "environment" }, config, onScan, () => {});
        setStatus("live");
        return;
      } catch {
        /* fallback: lista de câmaras */
      }

      const cameras = await Html5Qrcode.getCameras();
      if (!cameras.length) {
        setStatus("unsupported");
        return;
      }

      const backCamera =
        cameras.find((c) => /back|rear|environment|trás|trasera/i.test(c.label)) ?? cameras[cameras.length - 1];

      await scanner.start(backCamera.id, config, onScan, () => {});
      setStatus("live");
    } catch {
      setStatus("denied");
    }
  }, [active, elementId, onDetected, stopScanner]);

  useEffect(() => {
    if (!active) {
      handledRef.current = false;
      setStatus("idle");
      void stopScanner();
      return;
    }

    handledRef.current = false;
    void startScanner();
    return () => {
      void stopScanner();
    };
  }, [active, startScanner, stopScanner]);


  return (
    <div className="relative overflow-hidden rounded-[24px] border-2 border-primary/25 bg-black shadow-[0_20px_50px_-20px_rgba(0,0,0,0.45)]">
      <div id={elementId} className="min-h-[220px] w-full [&_video]:h-full [&_video]:w-full [&_video]:object-cover" />

      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <div className="relative h-[58%] w-[58%] min-h-[140px] min-w-[140px] max-h-[220px] max-w-[220px]">
          <span className="absolute left-0 top-0 h-8 w-8 rounded-tl-2xl border-l-[3px] border-t-[3px] border-white/90" />
          <span className="absolute right-0 top-0 h-8 w-8 rounded-tr-2xl border-r-[3px] border-t-[3px] border-white/90" />
          <span className="absolute bottom-0 left-0 h-8 w-8 rounded-bl-2xl border-b-[3px] border-l-[3px] border-white/90" />
          <span className="absolute bottom-0 right-0 h-8 w-8 rounded-br-2xl border-b-[3px] border-r-[3px] border-white/90" />
          {status === "live" && (
            <span className="absolute inset-x-4 top-1/2 h-0.5 -translate-y-1/2 animate-pulse bg-primary/80 shadow-[0_0_12px_rgba(58,2,5,0.8)]" />
          )}
        </div>
      </div>

      {status === "awaiting_tap" && (
        <button
          type="button"
          onClick={() => void startScanner()}
          className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/75 px-6 text-center text-white"
        >
          <Camera className="h-10 w-10 text-primary" />
          <p className="text-sm font-bold leading-relaxed">{t("mesaQrTapToStart")}</p>
        </button>
      )}

      {status === "starting" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/55 text-white">
          <Loader2 className="h-8 w-8 animate-spin" />
          <p className="text-xs font-semibold">{t("mesaQrStarting")}</p>
        </div>
      )}

      {status === "denied" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/70 px-6 text-center text-white">
          <CameraOff className="h-8 w-8 text-primary" />
          <p className="text-xs font-semibold leading-relaxed">{t("mesaQrCameraDenied")}</p>
          <button
            type="button"
            onClick={() => void startScanner()}
            className="mt-2 rounded-full bg-primary px-4 py-2 text-[11px] font-bold text-primary-foreground"
          >
            {t("mesaQrRetryCamera")}
          </button>
        </div>
      )}

      {status === "unsupported" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/70 px-6 text-center text-white">
          <Camera className="h-8 w-8 text-primary" />
          <p className="text-xs font-semibold leading-relaxed">{t("mesaQrUnsupported")}</p>
        </div>
      )}

      {status === "live" && (
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent px-4 pb-3 pt-8">
          <p className="text-center text-[11px] font-semibold text-white/90">{t("mesaQrScanning")}</p>
        </div>
      )}
    </div>
  );
};

export default MesaQrScanner;
