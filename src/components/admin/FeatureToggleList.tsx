import OpsCompactCard from "@/components/panel/OpsCompactCard";
import { Switch } from "@/components/ui/switch";
import type { TenantFeatureFlag } from "@/lib/platformFeatures";

type Props = {
  features: TenantFeatureFlag[];
  savingKey: string | null;
  onToggle: (featureKey: string, enabled: boolean) => void;
  preparedOnly?: boolean;
};

export default function FeatureToggleList({ features, savingKey, onToggle, preparedOnly }: Props) {
  if (features.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-8 border border-dashed rounded-2xl">
        Nenhuma funcionalidade nesta central
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {features.map((f) => (
        <OpsCompactCard
          key={f.feature_key}
          title={f.name}
          summary={preparedOnly ? "Preparado, motor automático em breve" : f.source === "override" ? "Ajuste manual" : "Incluído no plano"}
          badges={f.enabled ? ["Activo"] : ["Inactivo"]}
          inactive={!f.enabled}
          editable={false}
          actions={
            <Switch
              checked={f.enabled}
              disabled={savingKey === f.feature_key}
              onCheckedChange={(v) => onToggle(f.feature_key, v)}
            />
          }
        />
      ))}
    </div>
  );
}
