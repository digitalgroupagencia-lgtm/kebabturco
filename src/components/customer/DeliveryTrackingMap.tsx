import type { DriverLocationSnapshot } from "@/services/driverLocationService";

type Props = {
  driverLocation: DriverLocationSnapshot | null;
  addressLabel?: string | null;
};

/** Mapa simples com posição do motoboy (OpenStreetMap embed). */
export default function DeliveryTrackingMap({ driverLocation, addressLabel }: Props) {
  if (!driverLocation) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-muted/30 p-6 text-center text-sm text-muted-foreground">
        Localização do entregador aparece aqui quando estiver a caminho.
      </div>
    );
  }

  const { lat, lng } = driverLocation;
  const delta = 0.012;
  const bbox = `${lng - delta},${lat - delta},${lng + delta},${lat + delta}`;
  const embedUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${encodeURIComponent(bbox)}&layer=mapnik&marker=${lat}%2C${lng}`;

  return (
    <div className="space-y-2">
      <div className="rounded-2xl overflow-hidden border border-border shadow-sm aspect-[16/10] bg-muted">
        <iframe
          title="Mapa da entrega"
          src={embedUrl}
          className="w-full h-full border-0"
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
        />
      </div>
      {addressLabel && (
        <p className="text-xs text-muted-foreground text-center">
          Entrega: <span className="font-semibold text-foreground">{addressLabel}</span>
        </p>
      )}
      <p className="text-[10px] text-center text-muted-foreground">
        Actualizado {new Date(driverLocation.updated_at).toLocaleTimeString("pt-PT")}
      </p>
    </div>
  );
}
