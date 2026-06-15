import { MapPin } from "lucide-react";
import { usePanelStore } from "@/contexts/PanelStoreContext";
import { useStaffT } from "@/hooks/useStaffT";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function PanelStoreSwitcher() {
  const { t } = useStaffT();
  const { stores, storeId, canSwitchStore, setStoreId, loading } = usePanelStore();

  if (loading || stores.length === 0) return null;
  if (!canSwitchStore && stores.length <= 1) return null;

  const current = stores.find((s) => s.id === storeId);

  return (
    <div className="hidden sm:flex items-center gap-1.5 max-w-[220px]">
      <MapPin className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
      <Select
        value={storeId ?? undefined}
        onValueChange={setStoreId}
        disabled={!canSwitchStore}
      >
        <SelectTrigger className="h-8 text-xs border-none bg-muted/50 shadow-none">
          <SelectValue placeholder={t("panel.store.unit")}>
            {current?.name ?? t("panel.store.unit")}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {stores.map((s) => (
            <SelectItem key={s.id} value={s.id}>
              {s.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
