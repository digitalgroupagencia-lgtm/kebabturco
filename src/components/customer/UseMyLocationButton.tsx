import { useState } from "react";
import { MapPin, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getCurrentCoords, requestLocationPermission } from "@/lib/geolocation";
import { useLanguage } from "@/contexts/LanguageContext";

type Props = {
  onCoords: (coords: { lat: number; lng: number }) => void;
  className?: string;
};

/** Botão «Usar a minha localização» no checkout de entrega. */
export default function UseMyLocationButton({ onCoords, className }: Props) {
  const { t } = useLanguage();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const run = async () => {
    setBusy(true);
    setErr(null);
    try {
      const ok = await requestLocationPermission(false);
      if (!ok) {
        setErr(t("locationDenied") || "Permissão de localização negada");
        return;
      }
      const coords = await getCurrentCoords();
      if (!coords) {
        setErr(t("locationUnavailable") || "Não foi possível obter a localização");
        return;
      }
      onCoords(coords);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={className}>
      <Button type="button" variant="outline" size="sm" className="h-9 gap-1.5 font-bold" onClick={() => void run()} disabled={busy}>
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <MapPin className="h-4 w-4" />}
        {t("useMyLocation") || "Usar a minha localização"}
      </Button>
      {err && <p className="text-[10px] text-destructive mt-1">{err}</p>}
    </div>
  );
}
