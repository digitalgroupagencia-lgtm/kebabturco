import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { Loader2, Sparkles, Wand2, ChevronRight, CheckCircle2 } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

interface Props {
  trigger: React.ReactNode;
  defaultImageStyle?: string;
}

export default function NewTenantWizard({ trigger, defaultImageStyle = "realistic" }: Props) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(1);
  const [busy, setBusy] = useState(false);

  // Step 1, tenant
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [plan, setPlan] = useState("free");
  const [customDomain, setCustomDomain] = useState("");

  // Step 2, store
  const [storeName, setStoreName] = useState("");
  const [storePhone, setStorePhone] = useState("");
  const [storeAddress, setStoreAddress] = useState("");

  // Step 3, IA
  const [menuText, setMenuText] = useState("");
  const [generateImages, setGenerateImages] = useState(true);
  const [imageStyle, setImageStyle] = useState(defaultImageStyle);

  // progress
  const [progress, setProgress] = useState(0);
  const [statusMsg, setStatusMsg] = useState("");
  const [done, setDone] = useState(false);

  const reset = () => {
    setStep(1); setBusy(false); setName(""); setSlug(""); setPlan("free"); setCustomDomain("");
    setStoreName(""); setStorePhone(""); setStoreAddress("");
    setMenuText(""); setGenerateImages(true); setImageStyle(defaultImageStyle);
    setProgress(0); setStatusMsg(""); setDone(false);
  };

  const slugify = (s: string) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

  const run = async () => {
    if (!name || !storeName) { toast.error("Preencha nome do cliente e da loja"); return; }
    setBusy(true); setProgress(5); setStatusMsg("Criando cliente...");
    try {
      // 1. Tenant
      const finalSlug = slug || slugify(name);
      const { data: tenant, error: tErr } = await supabase
        .from("tenants")
        .insert({ name, slug: finalSlug, plan, custom_domain: customDomain || null, is_active: true })
        .select("id")
        .single();
      if (tErr) throw tErr;

      setProgress(20); setStatusMsg("Criando loja...");

      // 2. Store
      const { data: store, error: sErr } = await supabase
        .from("stores")
        .insert({ tenant_id: tenant.id, name: storeName, phone: storePhone || null, address: storeAddress || null, is_active: true })
        .select("id")
        .single();
      if (sErr) throw sErr;

      // 3. Menu por IA (se houver texto)
      let imageJobs: string[] = [];
      if (menuText.trim().length > 10) {
        setProgress(35); setStatusMsg("IA lendo o cardápio...");
        const { data: menuRes, error: mErr } = await supabase.functions.invoke("ai-menu-import", {
          body: { menu_text: menuText, store_id: store.id, image_style: imageStyle, generate_images: generateImages },
        });
        if (mErr) throw mErr;
        if (menuRes?.error) throw new Error(menuRes.error);
        imageJobs = menuRes?.image_jobs ?? [];
        toast.success(`${menuRes?.products_created ?? 0} produtos criados em ${menuRes?.categories_created ?? 0} categorias`);
      }

      // 4. Gerar imagens (sequencial p/ não estourar rate limit)
      if (generateImages && imageJobs.length > 0) {
        setProgress(55);
        for (let i = 0; i < imageJobs.length; i++) {
          const pid = imageJobs[i];
          setStatusMsg(`Gerando imagem ${i + 1} de ${imageJobs.length}...`);
          try {
            await supabase.functions.invoke("ai-product-image", { body: { product_id: pid, style: imageStyle } });
          } catch (err) {
            console.error("img err", err);
          }
          setProgress(55 + Math.round(((i + 1) / imageJobs.length) * 40));
        }
      }

      setProgress(100); setStatusMsg("Pronto!"); setDone(true);
      toast.success("Cliente criado com sucesso!");
      qc.invalidateQueries({ queryKey: ["admin-tenants"] });
      qc.invalidateQueries({ queryKey: ["admin-store-counts"] });
    } catch (e) {
      console.error(e);
      toast.error((e as Error).message);
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) reset(); }}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" /> Novo cliente com IA
          </DialogTitle>
        </DialogHeader>

        {!busy && !done && (
          <div className="space-y-5">
            {step === 1 && (
              <div className="space-y-3">
                <h3 className="font-semibold">1. Dados do cliente</h3>
                <div><Label>Nome do restaurante *</Label><Input value={name} onChange={(e) => { setName(e.target.value); if (!slug) setSlug(slugify(e.target.value)); }} /></div>
                <div><Label>Slug (URL)</Label><Input value={slug} onChange={(e) => setSlug(slugify(e.target.value))} placeholder="meu-restaurante" /></div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <Label>Plano</Label>
                    <Select value={plan} onValueChange={setPlan}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="free">Free</SelectItem>
                        <SelectItem value="starter">Starter</SelectItem>
                        <SelectItem value="pro">Pro</SelectItem>
                        <SelectItem value="enterprise">Enterprise</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div><Label>Domínio próprio (opcional)</Label><Input value={customDomain} onChange={(e) => setCustomDomain(e.target.value)} placeholder="pedido.restaurante.com" /></div>
                </div>
                <div className="flex justify-end"><Button onClick={() => setStep(2)} disabled={!name}>Próximo <ChevronRight className="w-4 h-4 ml-1" /></Button></div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-3">
                <h3 className="font-semibold">2. Primeira loja</h3>
                <div><Label>Nome da loja *</Label><Input value={storeName} onChange={(e) => setStoreName(e.target.value)} placeholder={name || "Loja Centro"} /></div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div><Label>Telefone</Label><Input value={storePhone} onChange={(e) => setStorePhone(e.target.value)} /></div>
                  <div><Label>Endereço</Label><Input value={storeAddress} onChange={(e) => setStoreAddress(e.target.value)} /></div>
                </div>
                <div className="flex justify-between"><Button variant="ghost" onClick={() => setStep(1)}>Voltar</Button><Button onClick={() => setStep(3)} disabled={!storeName}>Próximo <ChevronRight className="w-4 h-4 ml-1" /></Button></div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-3">
                <h3 className="font-semibold flex items-center gap-2"><Wand2 className="w-4 h-4 text-primary" /> 3. Cardápio com IA</h3>
                <p className="text-xs text-muted-foreground">Cole o cardápio abaixo (texto livre, copiado de PDF/Word/foto). A IA vai estruturar em categorias e produtos automaticamente. Deixe vazio para criar o cliente sem cardápio.</p>
                <Textarea value={menuText} onChange={(e) => setMenuText(e.target.value)} rows={10} placeholder={`Hambúrgueres\nX-Burger - 18,90 - pão, hambúrguer 150g, queijo, alface\nX-Bacon - 22,50 - pão, hambúrguer, bacon, queijo\n\nBebidas\nCoca-Cola lata - 6,00\nÁgua - 4,00`} />
                <div className="flex items-center justify-between gap-3 p-3 rounded-xl bg-muted/30">
                  <div>
                    <Label className="text-base">Gerar imagens dos produtos por IA</Label>
                    <p className="text-xs text-muted-foreground">Fotos fotorrealistas baseadas nos ingredientes.</p>
                  </div>
                  <Switch checked={generateImages} onCheckedChange={setGenerateImages} />
                </div>
                {generateImages && (
                  <div>
                    <Label>Estilo visual</Label>
                    <Select value={imageStyle} onValueChange={setImageStyle}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="realistic">Fotorrealista (Uber Eats / iFood)</SelectItem>
                        <SelectItem value="3d">3D estilizado (Pixar)</SelectItem>
                        <SelectItem value="flatlay">Flatlay (vista de cima)</SelectItem>
                        <SelectItem value="minimal">Minimalista (fundo neutro)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <div className="flex justify-between"><Button variant="ghost" onClick={() => setStep(2)}>Voltar</Button><Button onClick={run}><Sparkles className="w-4 h-4 mr-2" /> Criar cliente</Button></div>
              </div>
            )}
          </div>
        )}

        {busy && !done && (
          <div className="space-y-4 py-6">
            <div className="flex items-center gap-3"><Loader2 className="w-5 h-5 animate-spin text-primary" /><span className="text-sm">{statusMsg}</span></div>
            <Progress value={progress} />
            <p className="text-xs text-muted-foreground">Não feche esta janela. Pode levar alguns minutos se houver muitos produtos.</p>
          </div>
        )}

        {done && (
          <div className="space-y-4 py-6 text-center">
            <CheckCircle2 className="w-12 h-12 text-success mx-auto" />
            <h3 className="font-semibold text-lg">Cliente criado!</h3>
            <p className="text-sm text-muted-foreground">Tudo pronto. Você já pode editar produtos, fotos e configurar o totem.</p>
            <Button className="w-full" onClick={() => { setOpen(false); reset(); }}>Fechar</Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}