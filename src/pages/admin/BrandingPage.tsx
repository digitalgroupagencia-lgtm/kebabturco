import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Palette, Image as ImageIcon, Save, Upload, UtensilsCrossed, ShoppingBag, Languages, ListOrdered } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";

type Settings = Tables<"company_settings">;
const STORE_ID = "b0000000-0000-0000-0000-000000000001";

const BrandingPage = () => {
  const [s, setS] = useState<Settings | null>(null);
  const [saving, setSaving] = useState(false);
  const fileRefs = {
    logo_main_url: useRef<HTMLInputElement>(null),
    logo_secondary_url: useRef<HTMLInputElement>(null),
    icon_dine_in_url: useRef<HTMLInputElement>(null),
    icon_takeaway_url: useRef<HTMLInputElement>(null),
    banner_home_url: useRef<HTMLInputElement>(null),
    logo_language_url: useRef<HTMLInputElement>(null),
    logo_order_type_url: useRef<HTMLInputElement>(null),
    logo_main_dark_url: useRef<HTMLInputElement>(null),
    logo_secondary_dark_url: useRef<HTMLInputElement>(null),
    logo_language_dark_url: useRef<HTMLInputElement>(null),
    logo_order_type_dark_url: useRef<HTMLInputElement>(null),
  };

  useEffect(() => { load(); }, []);

  const load = async () => {
    const { data } = await supabase.from("company_settings").select("*").eq("store_id", STORE_ID).maybeSingle();
    if (data) setS(data);
  };

  const update = (k: keyof Settings, v: any) => setS((p) => p ? { ...p, [k]: v } : p);

  const upload = async (field: keyof Settings, file: File) => {
    const ext = file.name.split(".").pop();
    const path = `${STORE_ID}/${field}-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("branding").upload(path, file, { upsert: true });
    if (error) { toast.error("Error al subir: " + error.message); return; }
    const { data: pub } = supabase.storage.from("branding").getPublicUrl(path);
    update(field, pub.publicUrl);
    toast.success("Imagem cargada — recuerda guardar");
  };

  const save = async () => {
    if (!s) return;
    setSaving(true);
    const { error } = await supabase.from("company_settings").update({
      company_name: s.company_name,
      logo_main_url: s.logo_main_url,
      logo_secondary_url: s.logo_secondary_url,
      banner_home_url: s.banner_home_url,
      icon_dine_in_url: s.icon_dine_in_url,
      icon_takeaway_url: s.icon_takeaway_url,
      logo_language_url: (s as any).logo_language_url,
      logo_order_type_url: (s as any).logo_order_type_url,
      logo_main_dark_url: (s as any).logo_main_dark_url,
      logo_secondary_dark_url: (s as any).logo_secondary_dark_url,
      logo_language_dark_url: (s as any).logo_language_dark_url,
      logo_order_type_dark_url: (s as any).logo_order_type_dark_url,
      primary_color: s.primary_color,
      secondary_color: s.secondary_color,
      background_color: s.background_color,
      text_color: s.text_color,
      accent_color: s.accent_color,
      cta_color: s.cta_color,
      header_color: (s as any).header_color,
    }).eq("store_id", STORE_ID);
    setSaving(false);
    if (error) toast.error("Error al guardar"); else toast.success("¡Identidad visual actualizada!");
  };

  if (!s) return <div className="p-8 text-muted-foreground">Cargando...</div>;

  const ImageField = ({
    label,
    field,
    icon: Icon,
    dimensions,
  }: {
    label: string;
    field: keyof Settings;
    icon: any;
    dimensions?: string;
  }) => {
    const ref = fileRefs[field as keyof typeof fileRefs];
    const url = (s as any)[field] as string | null;
    return (
      <div className="space-y-2">
        <Label className="flex items-center gap-2 flex-wrap">
          <Icon className="h-4 w-4" /> {label}
          {dimensions && (
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-primary/10 text-primary">
              {dimensions}
            </span>
          )}
        </Label>
        <div className="flex items-center gap-3 p-3 rounded-2xl border bg-muted/30">
          <div className="w-20 h-20 rounded-2xl bg-background overflow-hidden flex items-center justify-center border shrink-0">
            {url ? <img src={url} alt={label} className="w-full h-full object-contain" /> : <ImageIcon className="w-6 h-6 text-muted-foreground" />}
          </div>
          <div className="flex-1 space-y-2">
            <input ref={ref} type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" hidden
              onChange={(e) => e.target.files?.[0] && upload(field, e.target.files[0])} />
            <Button type="button" variant="outline" size="sm" onClick={() => ref?.current?.click()}>
              <Upload className="w-4 h-4 mr-2" /> Subir imagen
            </Button>
            {dimensions && (
              <p className="text-[11px] text-muted-foreground">
                Tamaño recomendado: <strong>{dimensions}</strong> · PNG / JPG / WEBP
              </p>
            )}
            <Input value={url || ""} onChange={(e) => update(field, e.target.value)} placeholder="https://..." className="text-xs" />
          </div>
        </div>
      </div>
    );
  };

  const ColorField = ({ label, field }: { label: string; field: keyof Settings }) => (
    <div>
      <Label>{label}</Label>
      <div className="flex items-center gap-2 mt-1">
        <input type="color" value={(s as any)[field]} onChange={(e) => update(field, e.target.value)} className="w-12 h-10 rounded-lg cursor-pointer border-0 bg-transparent" />
        <Input value={(s as any)[field]} onChange={(e) => update(field, e.target.value)} className="font-mono text-sm" />
      </div>
    </div>
  );

  return (
    <div className="space-y-6 max-w-6xl">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2"><Palette className="h-6 w-6" /> Identidad Visual</h2>
          <p className="text-sm text-muted-foreground mt-1">Personaliza logos, íconos y colores. Cambios en tiempo real.</p>
        </div>
        <Button onClick={save} disabled={saving} size="lg">
          <Save className="h-4 w-4 mr-2" /> {saving ? "Guardando..." : "Guardar cambios"}
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle className="text-lg">Datos de la empresa</CardTitle></CardHeader>
            <CardContent>
              <Label>Nombre</Label>
              <Input value={s.company_name} onChange={(e) => update("company_name", e.target.value)} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-lg">Logos & Banner</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <ImageField label="Logo principal (splash)" field="logo_main_url" icon={ImageIcon} dimensions="512×512 px" />
              <ImageField label="Logo principal — modo escuro" field={"logo_main_dark_url" as keyof Settings} icon={ImageIcon} dimensions="512×512 px" />
              <ImageField label="Logo horizontal (header)" field="logo_secondary_url" icon={ImageIcon} dimensions="600×160 px" />
              <ImageField label="Logo horizontal — modo escuro" field={"logo_secondary_dark_url" as keyof Settings} icon={ImageIcon} dimensions="600×160 px" />
              <ImageField label="Banner home" field="banner_home_url" icon={ImageIcon} dimensions="1080×500 px" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Logos por tela (opcional)</CardTitle>
              <p className="text-xs text-muted-foreground mt-1">
                Se vazio, usa o logo principal. Permite ter logos diferentes na tela de idioma e na tela de tipo de pedido. Cada uma também tem variante para modo escuro.
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <ImageField label="Logo na tela de idioma" field={"logo_language_url" as keyof Settings} icon={Languages} dimensions="512×512 px" />
              <ImageField label="Logo tela idioma — modo escuro" field={"logo_language_dark_url" as keyof Settings} icon={Languages} dimensions="512×512 px" />
              <ImageField label="Logo na tela 'comer aqui / levar'" field={"logo_order_type_url" as keyof Settings} icon={ListOrdered} dimensions="512×512 px" />
              <ImageField label="Logo tela 'comer aqui/levar' — modo escuro" field={"logo_order_type_dark_url" as keyof Settings} icon={ListOrdered} dimensions="512×512 px" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-lg">Íconos del flujo de pedido</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <ImageField label="Comer en el local" field="icon_dine_in_url" icon={UtensilsCrossed} dimensions="500×500 px" />
              <ImageField label="Para llevar" field="icon_takeaway_url" icon={ShoppingBag} dimensions="500×500 px" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-lg">Paleta de colores</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
              <ColorField label="Primaria" field="primary_color" />
              <ColorField label="Secundaria" field="secondary_color" />
              <ColorField label="Destaque" field="accent_color" />
              <ColorField label="CTA (botón pago)" field="cta_color" />
              <ColorField label="Fondo" field="background_color" />
              <ColorField label="Texto" field="text_color" />
              <ColorField label="Barra superior (totem)" field={"header_color" as keyof Settings} />
            </CardContent>
          </Card>
        </div>

        {/* Preview */}
        <div className="lg:sticky lg:top-4 lg:self-start">
          <Card className="overflow-hidden" style={{ background: s.background_color, color: s.text_color }}>
            <CardHeader className="border-b">
              <CardTitle className="text-lg">Vista previa en vivo</CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4" style={{ background: s.background_color }}>
              <div className="flex flex-col items-center gap-4 py-4">
                {s.logo_main_url && <img src={s.logo_main_url} alt="logo" className="w-32 h-32 object-contain" />}
                <h3 className="text-xl font-black text-center" style={{ color: s.text_color }}>¿Cómo deseas hacer tu pedido?</h3>
              </div>
              <button className="w-full flex items-center gap-4 p-4 rounded-3xl border-2 transition-transform active:scale-95" style={{ borderColor: s.primary_color + "30", background: "white" }}>
                <div className="w-16 h-16 rounded-2xl overflow-hidden flex items-center justify-center" style={{ background: s.primary_color + "15" }}>
                  {s.icon_dine_in_url ? <img src={s.icon_dine_in_url} className="w-full h-full object-cover" alt="" /> : <UtensilsCrossed className="w-8 h-8" style={{ color: s.primary_color }} />}
                </div>
                <span className="font-black text-lg" style={{ color: s.text_color }}>Comer en el local</span>
              </button>
              <button className="w-full flex items-center gap-4 p-4 rounded-3xl border-2 transition-transform active:scale-95" style={{ borderColor: s.accent_color + "30", background: "white" }}>
                <div className="w-16 h-16 rounded-2xl overflow-hidden flex items-center justify-center" style={{ background: s.accent_color + "30" }}>
                  {s.icon_takeaway_url ? <img src={s.icon_takeaway_url} className="w-full h-full object-cover" alt="" /> : <ShoppingBag className="w-8 h-8" style={{ color: s.text_color }} />}
                </div>
                <span className="font-black text-lg" style={{ color: s.text_color }}>Para llevar</span>
              </button>
              <button className="w-full p-4 rounded-2xl font-black text-white" style={{ background: s.cta_color }}>Pagar ahora</button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default BrandingPage;
