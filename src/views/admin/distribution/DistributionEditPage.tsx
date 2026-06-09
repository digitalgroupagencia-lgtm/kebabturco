import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, ArrowLeft, Smartphone, Trash2, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { nav } from "@/lib/navPaths.ts";

type Form = {
  distribution_type: "pwa" | "native_app";
  pwa_status: "draft" | "active" | "disabled";
  android_app_status: string;
  android_package_id: string;
  android_version: string;
  android_published_at: string;
  android_play_console_url: string;
  ios_app_status: string;
  ios_bundle_id: string;
  ios_version: string;
  ios_published_at: string;
  ios_appstore_connect_url: string;
  native_app_start_url: string;
  native_app_icon_url: string;
  native_app_splash_url: string;
  native_app_screenshots: string[];
  notes: string;
};

const STORE_STATUSES = [
  "not_started", "draft", "in_review", "published", "rejected", "disabled",
] as const;

function toInputDate(v: string | null | undefined) {
  if (!v) return "";
  return new Date(v).toISOString().slice(0, 10);
}

export default function DistributionEditPage() {
  const { tenantId } = useParams<{ tenantId: string }>();
  const qc = useQueryClient();
  const [form, setForm] = useState<Form | null>(null);
  const [saving, setSaving] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["tenant-app-distribution", tenantId],
    enabled: !!tenantId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tenant_app_distribution")
        .select("*, tenants(name, slug)")
        .eq("tenant_id", tenantId!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (!data) return;
    setForm({
      distribution_type: (data.distribution_type as Form["distribution_type"]) ?? "pwa",
      pwa_status: (data.pwa_status as Form["pwa_status"]) ?? "active",
      android_app_status: data.android_app_status ?? "not_started",
      android_package_id: data.android_package_id ?? "",
      android_version: data.android_version ?? "",
      android_published_at: toInputDate(data.android_published_at),
      android_play_console_url: data.android_play_console_url ?? "",
      ios_app_status: data.ios_app_status ?? "not_started",
      ios_bundle_id: data.ios_bundle_id ?? "",
      ios_version: data.ios_version ?? "",
      ios_published_at: toInputDate(data.ios_published_at),
      ios_appstore_connect_url: data.ios_appstore_connect_url ?? "",
      native_app_start_url: data.native_app_start_url ?? "",
      native_app_icon_url: data.native_app_icon_url ?? "",
      native_app_splash_url: data.native_app_splash_url ?? "",
      native_app_screenshots: Array.isArray(data.native_app_screenshots)
        ? (data.native_app_screenshots as string[])
        : [],
      notes: data.notes ?? "",
    });
  }, [data]);

  const set = <K extends keyof Form>(k: K, v: Form[K]) =>
    setForm((f) => (f ? { ...f, [k]: v } : f));

  const save = async () => {
    if (!form || !tenantId) return;
    setSaving(true);
    const { error } = await supabase
      .from("tenant_app_distribution")
      .update({
        distribution_type: form.distribution_type,
        pwa_status: form.pwa_status,
        android_app_status: form.android_app_status as any,
        android_package_id: form.android_package_id || null,
        android_version: form.android_version || null,
        android_published_at: form.android_published_at || null,
        android_play_console_url: form.android_play_console_url || null,
        ios_app_status: form.ios_app_status as any,
        ios_bundle_id: form.ios_bundle_id || null,
        ios_version: form.ios_version || null,
        ios_published_at: form.ios_published_at || null,
        ios_appstore_connect_url: form.ios_appstore_connect_url || null,
        native_app_start_url: form.native_app_start_url || null,
        native_app_icon_url: form.native_app_icon_url || null,
        native_app_splash_url: form.native_app_splash_url || null,
        native_app_screenshots: form.native_app_screenshots,
        notes: form.notes || null,
      })
      .eq("tenant_id", tenantId);
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Distribuição actualizada");
    qc.invalidateQueries({ queryKey: ["admin-tenant-app-distribution-overview"] });
    qc.invalidateQueries({ queryKey: ["tenant-app-distribution", tenantId] });
  };

  if (isLoading || !form) {
    return (
      <div className="p-8 flex items-center gap-2">
        <Loader2 className="animate-spin h-4 w-4" /> Carregando…
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <Button asChild size="sm" variant="ghost" className="mb-2">
            <Link to={nav.admin("distribution")}>
              <ArrowLeft className="h-4 w-4 mr-1" /> Voltar
            </Link>
          </Button>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Smartphone className="h-6 w-6" /> Distribuição — {data?.tenants?.name ?? "Restaurante"}
          </h1>
          <p className="text-sm text-muted-foreground">{data?.tenants?.slug}</p>
        </div>
        <Button onClick={save} disabled={saving}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Salvar"}
        </Button>
      </div>

      <Card className="p-5 space-y-4">
        <h2 className="font-semibold">Geral</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label>Tipo de distribuição</Label>
            <Select value={form.distribution_type} onValueChange={(v) => set("distribution_type", v as Form["distribution_type"])}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="pwa">PWA</SelectItem>
                <SelectItem value="native_app">App nativo</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Estado PWA</Label>
            <Select value={form.pwa_status} onValueChange={(v) => set("pwa_status", v as Form["pwa_status"])}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {["draft", "active", "disabled"].map((s) => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>

      <Card className="p-5 space-y-4">
        <h2 className="font-semibold">Android</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label>Estado</Label>
            <Select value={form.android_app_status} onValueChange={(v) => set("android_app_status", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {STORE_STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Package ID</Label>
            <Input value={form.android_package_id} onChange={(e) => set("android_package_id", e.target.value)} placeholder="com.empresa.app" />
          </div>
          <div>
            <Label>Versão</Label>
            <Input value={form.android_version} onChange={(e) => set("android_version", e.target.value)} placeholder="1.0.0" />
          </div>
          <div>
            <Label>Publicado em</Label>
            <Input type="date" value={form.android_published_at} onChange={(e) => set("android_published_at", e.target.value)} />
          </div>
          <div className="md:col-span-2">
            <Label>URL Play Console</Label>
            <Input value={form.android_play_console_url} onChange={(e) => set("android_play_console_url", e.target.value)} />
          </div>
        </div>
      </Card>

      <Card className="p-5 space-y-4">
        <h2 className="font-semibold">iOS</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label>Estado</Label>
            <Select value={form.ios_app_status} onValueChange={(v) => set("ios_app_status", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {STORE_STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Bundle ID</Label>
            <Input value={form.ios_bundle_id} onChange={(e) => set("ios_bundle_id", e.target.value)} placeholder="com.empresa.app" />
          </div>
          <div>
            <Label>Versão</Label>
            <Input value={form.ios_version} onChange={(e) => set("ios_version", e.target.value)} placeholder="1.0.0" />
          </div>
          <div>
            <Label>Publicado em</Label>
            <Input type="date" value={form.ios_published_at} onChange={(e) => set("ios_published_at", e.target.value)} />
          </div>
          <div className="md:col-span-2">
            <Label>URL App Store Connect</Label>
            <Input value={form.ios_appstore_connect_url} onChange={(e) => set("ios_appstore_connect_url", e.target.value)} />
          </div>
        </div>
      </Card>

      <Card className="p-5 space-y-4">
        <h2 className="font-semibold">App nativo · Assets</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <Label>Start URL</Label>
            <Input value={form.native_app_start_url} onChange={(e) => set("native_app_start_url", e.target.value)} />
          </div>
          <div>
            <Label>Ícone (URL)</Label>
            <Input value={form.native_app_icon_url} onChange={(e) => set("native_app_icon_url", e.target.value)} />
          </div>
          <div>
            <Label>Splash (URL)</Label>
            <Input value={form.native_app_splash_url} onChange={(e) => set("native_app_splash_url", e.target.value)} />
          </div>
        </div>

        <div className="space-y-2">
          <Label>Screenshots</Label>
          {form.native_app_screenshots.map((url, i) => (
            <div key={i} className="flex items-center gap-2">
              <Input
                value={url}
                onChange={(e) => {
                  const next = [...form.native_app_screenshots];
                  next[i] = e.target.value;
                  set("native_app_screenshots", next);
                }}
                placeholder="https://…"
              />
              <Button size="icon" variant="ghost" onClick={() => set(
                "native_app_screenshots",
                form.native_app_screenshots.filter((_, j) => j !== i),
              )}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
          <Button size="sm" variant="outline" onClick={() => set(
            "native_app_screenshots",
            [...form.native_app_screenshots, ""],
          )}>
            <Plus className="h-4 w-4 mr-1" /> Adicionar screenshot
          </Button>
        </div>
      </Card>

      <Card className="p-5 space-y-2">
        <Label>Notas internas</Label>
        <Textarea rows={3} value={form.notes} onChange={(e) => set("notes", e.target.value)} />
      </Card>
    </div>
  );
}