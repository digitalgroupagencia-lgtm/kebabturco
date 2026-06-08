import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2, CheckCircle2, ExternalLink, Globe } from "lucide-react";

type CreateResult = {
  success: boolean;
  tenant_id: string;
  tenant_slug: string;
  custom_domain: string | null;
  store_id: string | null;
  primary_language: string;
};

const PLANS = ["free", "basic", "premium"];
const LANGS: { value: string; label: string }[] = [
  { value: "es", label: "Español" },
  { value: "pt", label: "Português" },
  { value: "en", label: "English" },
  { value: "fr", label: "Français" },
];

function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/(^-+|-+$)/g, "")
    .slice(0, 60);
}

const NewTenantWizardPage = () => {
  const { user } = useAuth();
  const { roleData, loading: roleLoading } = useUserRole(user?.id);
  const isAdminMaster = roleData?.role === "admin_master";

  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [customDomain, setCustomDomain] = useState("");
  const [plan, setPlan] = useState("free");
  const [lang, setLang] = useState("es");
  const [city, setCity] = useState("");
  const [country, setCountry] = useState("");
  const [createStore, setCreateStore] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<CreateResult | null>(null);

  const effectiveSlug = useMemo(
    () => (slugTouched ? slugify(slug) : slugify(name)),
    [slug, slugTouched, name],
  );

  const previewUrl = useMemo(() => {
    if (!result?.tenant_slug) return "";
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    return `${origin}/?preview=1&tenant=${encodeURIComponent(result.tenant_slug)}`;
  }, [result?.tenant_slug]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdminMaster) {
      toast.error("Apenas admin_master pode criar um novo restaurante");
      return;
    }
    const finalSlug = effectiveSlug;
    if (!name.trim() || finalSlug.length < 2) {
      toast.error("Preencha nome e slug válidos");
      return;
    }
    setSubmitting(true);
    try {
      const { data, error } = await (supabase.rpc as any)("admin_create_tenant_basic", {
        _name: name.trim(),
        _slug: finalSlug,
        _custom_domain: customDomain.trim() || null,
        _plan: plan,
        _primary_language: lang,
        _city: city.trim() || null,
        _country: country.trim() || null,
        _create_default_store: createStore,
      });
      if (error) throw error;
      const payload = data as CreateResult;
      setResult(payload);
      toast.success("Restaurante criado com sucesso");
    } catch (err: any) {
      console.error("[NewTenantWizard] failed", err);
      toast.error(err?.message || "Falhou criar restaurante");
    } finally {
      setSubmitting(false);
    }
  };

  if (roleLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!isAdminMaster) {
    return (
      <div className="max-w-xl mx-auto p-6">
        <Card className="p-6 text-center">
          <h1 className="text-xl font-black mb-2">Acesso restrito</h1>
          <p className="text-sm text-muted-foreground">
            Apenas administradores master podem criar novos restaurantes.
          </p>
        </Card>
      </div>
    );
  }

  if (result) {
    return (
      <div className="max-w-2xl mx-auto p-6 space-y-4">
        <Card className="p-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-success/10 flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6 text-success" />
            </div>
            <div>
              <h1 className="text-xl font-black">Restaurante criado</h1>
              <p className="text-sm text-muted-foreground">
                Slug: <strong>{result.tenant_slug}</strong>
              </p>
            </div>
          </div>

          <div className="space-y-2 text-sm">
            <p>
              <strong>Tenant ID:</strong>{" "}
              <code className="text-xs">{result.tenant_id}</code>
            </p>
            {result.store_id && (
              <p>
                <strong>Loja inicial:</strong>{" "}
                <code className="text-xs">{result.store_id}</code>
              </p>
            )}
            <p>
              <strong>Idioma principal:</strong> {result.primary_language}
            </p>
          </div>

          <div className="space-y-2">
            <Label>Pré-visualização (editor Lovable)</Label>
            <div className="flex items-center gap-2">
              <Input readOnly value={previewUrl} className="text-xs" />
              <Button asChild variant="outline" size="sm">
                <a href={previewUrl} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="w-4 h-4" />
                </a>
              </Button>
            </div>
          </div>

          {result.custom_domain ? (
            <Card className="p-4 bg-muted/40 space-y-2">
              <div className="flex items-center gap-2 font-black">
                <Globe className="w-4 h-4" /> Configuração de domínio
              </div>
              <p className="text-sm">
                Domínio registado: <strong>{result.custom_domain}</strong>
              </p>
              <p className="text-sm text-muted-foreground">
                Para o domínio ficar activo, configure no registar de DNS:
              </p>
              <ul className="text-sm list-disc pl-5 space-y-1">
                <li>Registo <strong>A</strong> @ → <code>185.158.133.1</code></li>
                <li>Registo <strong>A</strong> www → <code>185.158.133.1</code></li>
                <li>Adicionar o domínio em <em>Project Settings → Domains</em> na Lovable</li>
                <li>Aguardar propagação (até 72h) e provisão automática de SSL</li>
              </ul>
            </Card>
          ) : (
            <p className="text-sm text-muted-foreground">
              Sem domínio próprio. O restaurante pode ser acedido por preview ou
              configurando <code>custom_domain</code> mais tarde.
            </p>
          )}

          <div className="flex gap-2 pt-2">
            <Button onClick={() => { setResult(null); setName(""); setSlug(""); setSlugTouched(false); setCustomDomain(""); setCity(""); setCountry(""); }}>
              Criar outro
            </Button>
            <Button asChild variant="outline">
              <Link to="/admin">Voltar ao painel</Link>
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-4">
      <div>
        <h1 className="text-2xl font-black">Novo restaurante</h1>
        <p className="text-sm text-muted-foreground">
          Cria um novo tenant SaaS com configurações base. Catálogo, pagamentos
          e equipa configuram-se a seguir.
        </p>
      </div>

      <Card className="p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nome do restaurante *</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex.: Sabor da Casa" required />
          </div>

          <div className="space-y-2">
            <Label htmlFor="slug">Slug (identificador na URL) *</Label>
            <Input
              id="slug"
              value={effectiveSlug}
              onChange={(e) => { setSlug(e.target.value); setSlugTouched(true); }}
              placeholder="sabor-da-casa"
              required
            />
            <p className="text-xs text-muted-foreground">
              Apenas letras minúsculas, números e hífen. Usado em
              <code className="mx-1">?tenant={effectiveSlug || "..."}</code>.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="domain">Domínio próprio (opcional)</Label>
            <Input
              id="domain"
              value={customDomain}
              onChange={(e) => setCustomDomain(e.target.value)}
              placeholder="ex.: sabordacasa.pt"
            />
            <p className="text-xs text-muted-foreground">
              Sem https:// e sem caminho. DNS configurado depois.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="plan">Plano</Label>
              <select
                id="plan"
                value={plan}
                onChange={(e) => setPlan(e.target.value)}
                className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
              >
                {PLANS.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="lang">Idioma principal</Label>
              <select
                id="lang"
                value={lang}
                onChange={(e) => setLang(e.target.value)}
                className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
              >
                {LANGS.map((l) => (
                  <option key={l.value} value={l.value}>{l.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="city">Cidade</Label>
              <Input id="city" value={city} onChange={(e) => setCity(e.target.value)} placeholder="Lisboa" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="country">País</Label>
              <Input id="country" value={country} onChange={(e) => setCountry(e.target.value)} placeholder="Portugal" />
            </div>
          </div>

          <div className="flex items-center justify-between rounded-md border p-3">
            <div>
              <Label htmlFor="create-store" className="font-black">Criar loja inicial</Label>
              <p className="text-xs text-muted-foreground">
                Cria uma loja com nome do restaurante, branding e operações padrão.
              </p>
            </div>
            <Switch id="create-store" checked={createStore} onCheckedChange={setCreateStore} />
          </div>

          <div className="flex gap-2 pt-2">
            <Button type="submit" disabled={submitting}>
              {submitting && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              Criar restaurante
            </Button>
            <Button asChild type="button" variant="outline">
              <Link to="/admin">Cancelar</Link>
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
};

export default NewTenantWizardPage;