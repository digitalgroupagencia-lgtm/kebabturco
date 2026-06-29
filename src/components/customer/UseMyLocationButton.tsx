import { MapPin } from "lucide-react";
import type { Coords } from "@/lib/geolocation";

type Props = {
  onCoords: (coords: Coords) => void;
};

const UseMyLocationButton = ({ onCoords }: Props) => {
  const handleClick = () => {
    if (typeof navigator === "undefined" || !navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => onCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => {
        /* ignore */
      },
      { enableHighAccuracy: true, timeout: 8000 },
    );
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className="flex items-center gap-2 text-xs font-semibold text-primary hover:underline"
    >
      <MapPin className="w-3 h-3" />
      Usar a minha localização
    </button>
  );
};

export default UseMyLocationButton;
