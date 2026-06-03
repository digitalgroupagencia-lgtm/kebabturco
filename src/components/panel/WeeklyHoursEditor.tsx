import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Save, Plus, Trash2, Sparkles, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  parseSchedule,
  STORE_DEFAULTS,
  DELIVERY_STORE_DEFAULTS,
  type WeeklySchedule,
} from "@/lib/storeHours";

const DAY_LABELS: Array<{ k: keyof WeeklySchedule; label: string }> = [
  { k: "mon", label: "Segunda" },
  { k: "tue", label: "Terça" },
  { k: "wed", label: "Quarta" },
  { k: "thu", label: "Quinta" },
  { k: "fri", label: "Sexta" },
  { k: "sat", label: "Sábado" },
  { k: "sun", label: "Domingo" },
];

interface Props {
  storeId: string;
}

const ChannelEditor = ({
  title,
  description,
  value,
  onChange,
}: {
  title: string;
  description: string;
  value: WeeklySchedule;
  onChange: (v: WeeklySchedule) => void;
}) => {
  const setDay = (k: keyof WeeklySchedule, patch: Partial<WeeklySchedule[keyof WeeklySchedule]>) => {
    onChange({ ...value, [k]: { ...value[k], ...patch } });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {DAY_LABELS.map(({ k, label }) => {
          const day = value[k];
          return (
            <div key={k} className="rounded-xl border border-border p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-sm">{label}</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">{day.open ? "Aberto" : "Fechado"}</span>
                  <Switch
                    checked={day.open}
                    onCheckedChange={(open) => setDay(k, { open })}
                  />
                </div>
              </div>
              {day.open && (
                <div className="space-y-1.5">
                  {day.ranges.map((r, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <Input
                        type="time"
                        value={r[0] === "24:00" ? "23:59" : r[0]}
                        onChange={(e) => {
                          const ranges = [...day.ranges];
                          ranges[i] = [e.target.value, ranges[i][1]];
                          setDay(k, { ranges });
                        }}
                        className="h-9"
                      />
                      <span className="text-xs text-muted-foreground">→</span>
                      <Input
                        type="time"
                        value={r[1] === "24:00" ? "23:59" : r[1]}
                        onChange={(e) => {
                          const ranges = [...day.ranges];
                          const v = e.target.value === "23:59" ? "24:00" : e.target.value;
                          ranges[i] = [ranges[i][0], v];
                          setDay(k, { ranges });
                        }}
                        className="h-9"
                      />
                      {day.ranges.length > 1 && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-9 w-9 shrink-0"
                          onClick={() => {
                            const ranges = day.ranges.filter((_, idx) => idx !== i);
                            setDay(k, { ranges });
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setDay(k, { ranges: [...day.ranges, ["19:00", "24:00"]] })}
                    className="gap-1 h-8 text-xs"
                  >
                    <Plus className="h-3 w-3" /> Adicionar intervalo
                  </Button>
                </div>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
};

const WeeklyHoursEditor = ({ storeId }: Props) => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [storeSched, setStoreSched] = useState<WeeklySchedule>(STORE_DEFAULTS);
  const [delivSched, setDelivSched] = useState<WeeklySchedule>(DELIVERY_STORE_DEFAULTS);
  const [applyEnabled, setApplyEnabled] = useState<boolean>(true);

  useEffect(() => {
    if (!storeId) return;
    setLoading(true);
    supabase
      .from("operations_settings")
      .select("weekly_schedule, delivery_schedule, apply_schedule_enabled")
      .eq("store_id", storeId)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setStoreSched(parseSchedule((data as any).weekly_schedule, STORE_DEFAULTS));
          setDelivSched(parseSchedule((data as any).delivery_schedule, DELIVERY_STORE_DEFAULTS));
          const v = (data as any).apply_schedule_enabled;
          setApplyEnabled(v === undefined || v === null ? true : Boolean(v));
        }
        setLoading(false);
      });
  }, [storeId]);

  const save = async () => {
    if (!storeId) return;
    setSaving(true);
    const { error } = await supabase
      .from("operations_settings")
      .update({
        weekly_schedule: storeSched as any,
        delivery_schedule: delivSched as any,
        apply_schedule_enabled: applyEnabled,
      } as any)
      .eq("store_id", storeId);
    setSaving(false);
    if (error) toast.error(error.message);
    else toast.success("Horários guardados");
  };

  const toggleApply = async (next: boolean) => {
    setApplyEnabled(next);
    if (!storeId) return;
    const { error } = await supabase
      .from("operations_settings")
      .update({ apply_schedule_enabled: next } as any)
      .eq("store_id", storeId);
    if (error) {
      setApplyEnabled(!next);
      toast.error(error.message);
    } else {
      toast.success(next ? "Validação de horário ativa" : "Validação de horário desativada — pedidos aceitos fora do horário");
    }
  };

  const applyKebabDefaults = () => {
    setStoreSched(STORE_DEFAULTS);
    setDelivSched(DELIVERY_STORE_DEFAULTS);
    toast.success("Horários oficiais Kebab Turco aplicados — clique em Guardar");
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center gap-2">
        <Loader2 className="h-4 w-4 animate-spin" /> A carregar…
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className={`rounded-xl border p-4 flex items-start justify-between gap-4 ${applyEnabled ? "border-border bg-muted/20" : "border-amber-500/40 bg-amber-500/10"}`}>
        <div className="space-y-1">
          <div className="font-bold text-sm">Aplicar horário de funcionamento</div>
          <p className="text-xs text-muted-foreground max-w-xl">
            Quando ativo, a loja só aceita pedidos dentro dos horários configurados.
            Quando desativado, permite testar e aceitar pedidos mesmo fora do horário.
            Os horários abaixo permanecem guardados.
          </p>
          {!applyEnabled && (
            <p className="text-xs font-bold text-amber-700 dark:text-amber-400">
              ⚠ Modo teste: pedidos serão aceitos em qualquer horário.
            </p>
          )}
        </div>
        <Switch checked={applyEnabled} onCheckedChange={toggleApply} />
      </div>

      <div className="flex flex-wrap gap-2 justify-between items-center">
        <p className="text-xs text-muted-foreground">
          Timezone: <span className="font-bold">Europe/Madrid</span> · DST automático
        </p>
        <Button variant="outline" size="sm" onClick={applyKebabDefaults} className="gap-1">
          <Sparkles className="h-3 w-3" /> Horários oficiais Kebab Turco
        </Button>
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <ChannelEditor
          title="Loja / Balcão / QR / Totem"
          description="Horário para pedidos no local."
          value={storeSched}
          onChange={setStoreSched}
        />
        <ChannelEditor
          title="Delivery"
          description="Horário separado para entregas (pode ter múltiplos intervalos por dia)."
          value={delivSched}
          onChange={setDelivSched}
        />
      </div>
      <Button onClick={save} disabled={saving} size="lg" className="gap-2">
        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
        Guardar horários
      </Button>
    </div>
  );
};


export default WeeklyHoursEditor;
