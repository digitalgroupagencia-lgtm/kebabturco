import { useSelectedTenant } from "@/contexts/SelectedTenantContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Copy, ExternalLink, Link2, Monitor, ShieldCheck, Store } from "lucide-react";
import { toast } from "sonner";

const linkBlocks = (origin: string) => [
  {
    icon: Monitor,
    color: "text-primary",
    title: "Totem / App do cliente",
    desc: "Link público que o cliente acessa para fazer pedidos (cardápio, totem, mesas).",
    url: `${origin}/`,
  },
  {
    icon: ShieldCheck,
    color: "text-emerald-500",
    title: "Painel do dono do restaurante",
    desc: "Acesso para o restaurant_admin gerenciar pedidos, cardápio, equipe e configurações.",
    url: `${origin}/panel`,
  },
  {
    icon: Store,
    color: "text-amber-500",
    title: "App do vendedor / garçom",
    desc: "Acesso dos vendedores para abrir mesas e lançar pedidos pelo celular.",
    url: `${origin}/seller`,
  },
  {
    icon: ShieldCheck,
    color: "text-fuchsia-500",
    title: "Login (todos os papéis)",
    desc: "URL única de login. O sistema redireciona automaticamente conforme o papel.",
    url: `${origin}/auth`,
  },
];

export default function TenantLinksPage() {
  const { tenant } = useSelectedTenant();

  // Prefere domínio próprio se configurado
  const origin =
    (tenant?.custom_domain ? `https://${tenant.custom_domain}` : window.location.origin).replace(/\/$/, "");

  const links = linkBlocks(origin);

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
      ) : (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-3 text-xs">
          ⚠️ Sem domínio próprio. Os links usam o domínio padrão da plataforma.
        </div>
      )}

      <div className="grid gap-4">
        {links.map((l) => (
          <Card key={l.url}>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <l.icon className={`w-5 h-5 ${l.color}`} /> {l.title}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-xs text-muted-foreground">{l.desc}</p>
              <div className="flex gap-2">
                <Input value={l.url} readOnly className="font-mono text-xs" />
                <Button variant="outline" size="icon" onClick={() => copy(l.url)} title="Copiar">
                  <Copy className="w-4 h-4" />
                </Button>
                <Button variant="outline" size="icon" asChild title="Abrir em nova aba">
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