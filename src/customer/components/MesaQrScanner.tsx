import { useEffect, useId, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { Camera, CameraOff, Loader2 } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

type MesaQrScannerProps = {
  active: boolean;
  onDetected: (raw: string) => void;
};

const MesaQrScanner = ({ active, onDetected }: MesaQrScannerProps) => {
  const { t } = useLanguage();
  const elementId = useId().replace(/:/g, "");
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const handledRef = useRef(false);
  const [status, setStatus] = useState<"idle" | "starting" | "live" | "denied" | "unsupported">("idle");

  useEffect(() => {
    if (!active) {
      handledRef.current = false;
      setStatus("idle");
      const existing = scannerRef.current;
      scannerRef.current = null;
      if (existing) {
        void existing.stop().catch(() => {});
        try {
          existing.clear();
        } catch {
          /* ignore */
        }
      }
      return;
    }

    let cancelled = false;
    handledRef.current = false;
    setStatus("starting");

    const start = async () => {
      try {
        const scanner = new Html5Qrcode(elementId, { verbose: false });
        scannerRef.current = scanner;

        const cameras = await Html5Qrcode.getCameras();
        if (!cameras.length) {
          if (!cancelled) setStatus("unsupported");
          return;
        }

        const backCamera =
          cameras.find((c) => /back|rear|environment|trás|trasera/i.test(c.label)) ?? cameras[cameras.length - 1];

        await scanner.start(
          backCamera.id,
          {
            fps: 12,
            qrbox: (viewfinderWidth, viewfinderHeight) => {
              const size = Math.min(viewfinderWidth, viewfinderHeight) * 0.72;
              return { width: size, height: size };
            },
            aspectRatio: 1,
          },
          (decoded) => {
            if (handledRef.current) return;
            handledRef.current = true;
            onDetected(decoded);
            void scanner.stop().catch(() => {});
          },
          () => {
            /* scan frame — sem leitura ainda */
          },
        );

        if (!cancelled) setStatus("live");
      } catch {
        if (!cancelled) setStatus("denied");
      }
    };

    void start();

    return () => {
      cancelled = true;
      const existing = scannerRef.current;
      scannerRef.current = null;
      if (existing) {
        void existing.stop().catch(() => {});
        try {
          existing.clear();
        } catch {
          /* ignore */
        }
      }
    };
  }, [active, elementId, onDetected]);

  return (
    <div className="relative overflow-hidden rounded-[24px] border-2 border-primary/25 bg-black shadow-[0_20px_50px_-20px_rgba(0,0,0,0.45)]">
      <div id={elementId} className="min-h-[220px] w-full [&_video]:object-cover" />

      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <div className="relative h-[58%] w-[58%] min-h-[140px] min-w-[140px] max-h-[220px] max-w-[220px]">
          <span className="absolute left-0 top-0 h-8 w-8 rounded-tl-2xl border-l-[3px] border-t-[3px] border-white/90" />
          <span className="absolute right-0 top-0 h-8 w-8 rounded-tr-2xl border-r-[3px] border-t-[3px] border-white/90" />
          <span className="absolute bottom-0 left-0 h-8 w-8 rounded-bl-2xl border-b-[3px] border-l-[3px] border-white/90" />
          <span className="absolute bottom-0 right-0 h-8 w-8 rounded-br-2xl border-b-[3px] border-r-[3px] border-white/90" />
          <span className="absolute inset-x-4 top-1/2 h-0.5 -translate-y-1/2 animate-pulse bg-primary/80 shadow-[0_0_12px_rgba(220,38,38,0.8)]" />
        </div>
      </div>

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
