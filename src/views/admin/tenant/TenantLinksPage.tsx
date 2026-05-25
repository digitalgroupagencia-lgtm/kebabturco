import { useSelectedTenant } from "@/contexts/SelectedTenantContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Copy, ExternalLink, Link2, Monitor, ShieldCheck, Store } from "lucide-react";
import { toast } from "sonner";
import { buildTenantUrl, getTenantTotemUrl, type TenantUrlConfig } from "@/lib/tenantUrls";

const linkBlocks = (tenant: TenantUrlConfig, origin: string) => [
  {
    icon: Monitor,
    color: "text-primary",
    title: "Totem / App do cliente",
    desc: "Link público que o cliente acessa para fazer pedidos (cardápio, totem, mesas).",
    url: getTenantTotemUrl(tenant, origin),
  },
  {
    icon: ShieldCheck,
    color: "text-emerald-500",
    title: "Painel do dono do restaurante",
    desc: "Acesso para o restaurant_admin gerenciar pedidos, cardápio, equipe e configurações.",
    url: buildTenantUrl(tenant, "/panel", origin),
  },
  {
    icon: Store,
    color: "text-amber-500",
    title: "App do vendedor / garçom",
    desc: "Acesso dos vendedores para abrir mesas e lançar pedidos pelo celular.",
    url: buildTenantUrl(tenant, "/seller", origin),
  },
  {
    icon: ShieldCheck,
    color: "text-fuchsia-500",
    title: "Login (todos os papéis)",
    desc: "URL única de login. O sistema redireciona automaticamente conforme o papel.",
    url: buildTenantUrl(tenant, "/auth", origin),
  },
];

export default function TenantLinksPage() {
  const { tenant } = useSelectedTenant();

  const tenantConfig: TenantUrlConfig = {
    slug: tenant?.slug || "",
    custom_domain: tenant?.custom_domain,
    path_slug: tenant?.path_slug,
    master_domain: tenant?.master_domain,
    use_master_domain: tenant?.use_master_domain,
  };

  const origin = window.location.origin.replace(/\/$/, "");
  const links = linkBlocks(tenantConfig, origin);

  const copy = (url: string) => {
    navigator.clipboard.writeText(url);
    toast.success("Link copiado!");
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Link2 className="w-6 h-6 text-primary" /> Links de acesso
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Compartilhe estes links com o cliente <strong>{tenant?.name}</strong>. Funciona com o domínio próprio quando configurado.
        </p>
      </div>

      {tenant?.custom_domain ? (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-3 text-xs">
          ✅ Domínio próprio ativo: <strong>{tenant.custom_domain}</strong>
        </div>
      ) : tenant?.use_master_domain && tenant.path_slug ? (
        <div className="rounded-xl border border-blue-500/30 bg-blue-500/5 p-3 text-xs">
          Subcaminho activo: <strong>{tenant.master_domain}/{tenant.path_slug}</strong>
        </div>
      ) : (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-3 text-xs">
          ⚠️ Sem domínio próprio. Os links usam o domínio actual + parâmetro <code>?tenant=</code>.
        </div>
      )}

      <div className="grid gap-4">
        {links.map((l) => (
          <Card key={l.title}>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <l.icon className={`w-4 h-4 ${l.color}`} /> {l.title}
              </CardTitle>
              <p className="text-xs text-muted-foreground">{l.desc}</p>
            </CardHeader>
            <CardContent className="flex flex-col sm:flex-row gap-2">
              <Input readOnly value={l.url} className="font-mono text-xs" />
              <div className="flex gap-2 shrink-0">
                <Button variant="outline" size="icon" onClick={() => copy(l.url)}>
                  <Copy className="w-4 h-4" />
                </Button>
                <Button variant="outline" size="icon" asChild>
                  <a href={l.url} target="_blank" rel="noreferrer">
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
