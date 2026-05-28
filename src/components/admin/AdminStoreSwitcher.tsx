import { MapPin, Store } from "lucide-react";
import { useAdminStorePicker } from "@/contexts/AdminStoreContext";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Props = {
  /** Texto curto acima do selector (opcional) */
  hint?: string;
};

export default function AdminStoreSwitcher({ hint }: Props) {
  const { stores, storeId, canSwitchStore, setStoreId, loading } = useAdminStorePicker();

  if (loading) return null;

  const current = stores.find((s) => s.id === storeId);

  if (!canSwitchStore) {
    if (!current) return null;
    return (
      <div className="flex items-center gap-2 rounded-xl border bg-muted/30 px-3 py-2 text-sm">
        <Store className="h-4 w-4 text-muted-foreground shrink-0" />
        <span className="font-medium">{current.name}</span>
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
      <div className="flex items-center gap-2">
        <MapPin className="h-4 w-4 shrink-0 text-muted-foreground" />
        <Select value={storeId ?? undefined} onValueChange={setStoreId}>
          <SelectTrigger className="h-10 max-w-md bg-background">
            <SelectValue placeholder="Escolher unidade">
              {current?.name ?? "Escolher unidade"}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {stores.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                <span className="font-medium">{s.name}</span>
                {s.address ? (
                  <span className="text-muted-foreground text-xs ml-1">— {s.address}</span>
                ) : null}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
