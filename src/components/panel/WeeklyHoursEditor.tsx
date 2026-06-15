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
import { useStaffT } from "@/hooks/useStaffT";
import type { StaffI18nKey } from "@/lib/staffI18n";

const DAY_KEYS: Array<{ k: keyof WeeklySchedule; labelKey: StaffI18nKey }> = [
  { k: "mon", labelKey: "hours.day.mon" },
  { k: "tue", labelKey: "hours.day.tue" },
  { k: "wed", labelKey: "hours.day.wed" },
  { k: "thu", labelKey: "hours.day.thu" },
  { k: "fri", labelKey: "hours.day.fri" },
  { k: "sat", labelKey: "hours.day.sat" },
  { k: "sun", labelKey: "hours.day.sun" },
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
  const { t } = useStaffT();

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
        {DAY_KEYS.map(({ k, labelKey }) => {
          const day = value[k];
          return (
            <div key={k} className="rounded-xl border border-border p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-sm">{t(labelKey)}</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">
                    {day.open ? t("hours.open") : t("hours.closed")}
                  </span>
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
                    <Plus className="h-3 w-3" /> {t("hours.add_interval")}
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
  const { t } = useStaffT();
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
    else toast.success(t("hours.toast.saved"));
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
      toast.success(next ? t("hours.toast.validation_on") : t("hours.toast.validation_off"));
    }
  };

  const applyKebabDefaults = () => {
    setStoreSched(STORE_DEFAULTS);
    setDelivSched(DELIVERY_STORE_DEFAULTS);
    toast.success(t("hours.toast.defaults"));
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center gap-2">
        <Loader2 className="h-4 w-4 animate-spin" /> {t("common.loading")}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className={`rounded-xl border p-4 flex items-start justify-between gap-4 ${applyEnabled ? "border-border bg-muted/20" : "border-amber-500/40 bg-amber-500/10"}`}>
        <div className="space-y-1">
          <div className="font-bold text-sm">{t("hours.apply.title")}</div>
          <p className="text-xs text-muted-foreground max-w-xl">{t("hours.apply.desc")}</p>
          {!applyEnabled && (
            <p className="text-xs font-bold text-amber-700 dark:text-amber-400">{t("hours.test_mode")}</p>
          )}
        </div>
        <Switch checked={applyEnabled} onCheckedChange={toggleApply} />
      </div>

      <div className="flex flex-wrap gap-2 justify-between items-center">
        <p className="text-xs text-muted-foreground">
          {t("hours.timezone")} <span className="font-bold">Europe/Madrid</span> · {t("hours.dst")}
        </p>
        <Button variant="outline" size="sm" onClick={applyKebabDefaults} className="gap-1">
          <Sparkles className="h-3 w-3" /> {t("hours.official_btn")}
        </Button>
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <ChannelEditor
          title={t("hours.channel.store.title")}
          description={t("hours.channel.store.desc")}
          value={storeSched}
          onChange={setStoreSched}
        />
        <ChannelEditor
          title={t("hours.channel.delivery.title")}
          description={t("hours.channel.delivery.desc")}
          value={delivSched}
          onChange={setDelivSched}
        />
      </div>
      <Button onClick={save} disabled={saving} size="lg" className="gap-2">
        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
        {t("hours.save")}
      </Button>
    </div>
  );
};


export default WeeklyHoursEditor;
