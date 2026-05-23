import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";

type TenantOption = { id: string; name: string; slug: string; plan?: string | null };

type Props = {
  tenants: TenantOption[];
  value: string;
  onChange: (tenantId: string) => void;
  label?: string;
};

export default function CentralTenantPicker({ tenants, value, onChange, label = "Restaurante" }: Props) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="h-11 rounded-xl">
          <SelectValue placeholder="Seleccionar cliente" />
        </SelectTrigger>
        <SelectContent>
          {tenants.map((t) => (
            <SelectItem key={t.id} value={t.id}>
              {t.name} {t.plan ? `· ${String(t.plan).toUpperCase()}` : ""}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
