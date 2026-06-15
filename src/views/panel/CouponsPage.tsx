import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAdminStoreId } from "@/hooks/useAdminStoreId";
import { useStaffT } from "@/hooks/useStaffT";
import { panelT } from "@/lib/staffPanelLocale";
import type { StaffUiLang } from "@/components/StaffLanguageToggle";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import OpsCompactCard from "@/components/panel/OpsCompactCard";
import { toast } from "sonner";
import { Plus, Trash2, Tag, MoreVertical } from "lucide-react";
import HowToUsePanel from "@/components/admin/HowToUsePanel";

type Coupon = {
  id: string;
  code: string;
  description: string | null;
  discount_type: string;
  discount_value: number;
  min_order: number;
  max_uses: number | null;
  uses_count: number;
  is_active: boolean;
  expires_at: string | null;
};

function formatCouponSummary(c: Coupon, lang: StaffUiLang): string {
  const discount =
    c.discount_type === "percent"
      ? panelT(lang, "coupons.summary.percent", { value: c.discount_value })
      : panelT(lang, "coupons.summary.fixed", { value: c.discount_value });
  const min =
    c.min_order > 0
      ? panelT(lang, "coupons.summary.min", { value: c.min_order })
      : panelT(lang, "coupons.summary.no_min");
  const uses = c.max_uses
    ? panelT(lang, "coupons.summary.uses", { used: c.uses_count, max: c.max_uses })
    : panelT(lang, "coupons.summary.uses_open", { used: c.uses_count });
  return `${discount} · ${min} · ${uses}`;
}

const CouponsPage = () => {
  const { t, lang } = useStaffT();
  const { storeId } = useAdminStoreId();
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [createOpen, setCreateOpen] = useState(false);
  const [code, setCode] = useState("");
  const [discountType, setDiscountType] = useState<"percent" | "fixed">("percent");
  const [discountValue, setDiscountValue] = useState("10");
  const [minOrder, setMinOrder] = useState("0");
  const [saving, setSaving] = useState(false);

  const load = async () => {
    if (!storeId) return;
    const { data } = await supabase.from("coupons").select("*").eq("store_id", storeId).order("created_at", { ascending: false });
    setCoupons((data as Coupon[]) || []);
  };

  useEffect(() => {
    load();
  }, [storeId]);

  const create = async () => {
    if (!storeId || !code.trim()) return;
    setSaving(true);
    const { error } = await supabase.from("coupons").insert({
      store_id: storeId,
      code: code.trim().toUpperCase(),
      discount_type: discountType,
      discount_value: parseFloat(discountValue) || 0,
      min_order: parseFloat(minOrder) || 0,
    });
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(t("coupons.toast.created"));
    setCode("");
    setCreateOpen(false);
    load();
  };

  const toggle = async (c: Coupon) => {
    await supabase.from("coupons").update({ is_active: !c.is_active }).eq("id", c.id);
    load();
  };

  const remove = async (id: string) => {
    if (!confirm(t("coupons.confirm.remove"))) return;
    await supabase.from("coupons").delete().eq("id", id);
    toast.success(t("coupons.toast.removed"));
    load();
  };

  if (!storeId) return <div className="p-6 text-sm text-muted-foreground">{t("common.no_store")}</div>;

  return (
    <div className="mx-auto max-w-lg space-y-4 pb-8">
      <HowToUsePanel
        purpose={t("howto.coupons.purpose")}
        whenToUse={t("howto.coupons.when")}
        steps={[
          t("howto.coupons.step1"),
          t("howto.coupons.step2"),
          t("howto.coupons.step3"),
          t("howto.coupons.step4"),
          t("howto.coupons.step5"),
        ]}
        howToConfirm={t("howto.coupons.confirm")}
        assistantQuestion={t("howto.coupons.assistant")}
      />
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-black flex items-center gap-2">
            <Tag className="w-5 h-5 text-primary" />
            {t("page.coupons.title")}
          </h2>
          <p className="text-xs text-muted-foreground mt-1">
            {panelT(lang, "coupons.subtitle", { count: coupons.length })}
          </p>
        </div>
        <Button
          variant={createOpen ? "secondary" : "default"}
          size="sm"
          className="h-10 rounded-xl font-bold shrink-0"
          onClick={() => setCreateOpen((v) => !v)}
        >
          <Plus className="w-4 h-4 mr-1" />
          {createOpen ? t("coupons.close") : t("coupons.new")}
        </Button>
      </div>

      {createOpen && (
        <div className="rounded-2xl border bg-card p-3.5 space-y-2.5 shadow-sm ring-1 ring-primary/10">
          <div>
            <Label className="text-xs">{t("coupons.field.code")}</Label>
            <Input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="VERAO10"
              className="h-11 mt-1 font-bold tracking-wide"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs">{t("coupons.field.type")}</Label>
              <select
                className="w-full h-10 mt-1 rounded-md border px-2 text-sm bg-background"
                value={discountType}
                onChange={(e) => setDiscountType(e.target.value as "percent" | "fixed")}
              >
                <option value="percent">{t("coupons.type.percent")}</option>
                <option value="fixed">{t("coupons.type.fixed")}</option>
              </select>
            </div>
            <div>
              <Label className="text-xs">{t("coupons.field.value")}</Label>
              <Input type="number" value={discountValue} onChange={(e) => setDiscountValue(e.target.value)} className="h-10 mt-1" />
            </div>
          </div>
          <div>
            <Label className="text-xs">{t("coupons.field.min")}</Label>
            <Input type="number" value={minOrder} onChange={(e) => setMinOrder(e.target.value)} className="h-10 mt-1" />
          </div>
          <Button className="w-full h-11 font-bold" onClick={create} disabled={saving}>
            {saving ? t("coupons.saving") : t("coupons.create")}
          </Button>
        </div>
      )}

      <div className="space-y-2">
        {coupons.map((c) => (
          <OpsCompactCard
            key={c.id}
            title={c.code}
            summary={formatCouponSummary(c, lang)}
            inactive={!c.is_active}
            badges={c.is_active ? [t("coupons.badge.active")] : [t("coupons.badge.paused")]}
            editable={false}
            actions={
              <>
                <Switch checked={c.is_active} onCheckedChange={() => toggle(c)} />
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button type="button" variant="ghost" size="icon" className="h-9 w-9">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem className="text-destructive" onClick={() => remove(c.id)}>
                      <Trash2 className="h-4 w-4 mr-2" /> {t("coupons.remove")}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            }
          />
        ))}
        {coupons.length === 0 && !createOpen && (
          <p className="text-center text-sm text-muted-foreground py-10 border border-dashed rounded-2xl">
            {t("coupons.empty")}
          </p>
        )}
      </div>

      <p className="text-xs text-center text-muted-foreground pt-2">
        <a href="/admin/diagnostics-hub?tab=coupons" className="text-primary underline">
          {t("coupons.test_link")}
        </a>
      </p>
    </div>
  );
};

export default CouponsPage;
