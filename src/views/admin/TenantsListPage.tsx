import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Building2,
  Plus,
  ExternalLink,
  LayoutDashboard,
  Settings,
  CreditCard,
  Smartphone,
  Globe,
  Loader2,
  Search,
} from "lucide-react";
import { useState, useMemo } from "react";
import PlatformPageShell from "@/components/admin/premium/PlatformPageShell";
import AdminPageHeader from "@/components/admin/premium/AdminPageHeader";
import StatusPill from "@/components/admin/premium/StatusPill";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { PLAN_LABELS, type PlanKey } from "@/lib/platformFeatures";
import { nav } from "@/lib/navPaths.ts";
import { APP_NAME } from "@/lib/appMode";

type TenantRow = {
  id: string;
  name: string;
  slug: string;
  plan: string | null;
  is_active: boolean;
  custom_domain: string | null;
  path_slug: string | null;
  created_at: string;
  tenant_app_distribution?: { distribution_type: string | null }[] | null;
  store_payment_gateways?: { is_enabled: boolean; gateway_id: string | null }[] | null;
};

function fmtDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString("pt-PT", { day: "2-digit", month: "short", year: "numeric" });
  } catch {
    return iso;
  }
}

function tenantPublicUrl(t: TenantRow): string {
  if (t.custom_domain) return `https://${t.custom_domain}`;
  if (t.path_slug) return `/${t.path_slug}`;
  return `/${t.slug}`;
}

export default function TenantsListPage() {
  const [q, setQ] = useState("");

  const { data: tenants, isLoading } = useQuery({
    queryKey: ["admin-tenants-list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tenants")
        .select(`
          id, name, slug, plan, is_active, custom_domain, path_slug, created_at,
          tenant_app_distribution ( distribution_type ),
          store_payment_gateways:stores!inner(store_payment_gateways(is_enabled, gateway_id))
        `)
        .eq("is_template", false)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as TenantRow[];
    },
  });

  const filtered = useMemo(() => {
    const list = tenants ?? [];
    const term = q.trim().toLowerCase();
    if (!term) return list;
    return list.filter((t) =>
      [t.name, t.slug, t.custom_domain ?? ""].some((s) => s.toLowerCase().includes(term)),
    );
  }, [tenants, q]);

  return (
    <PlatformPageShell width="wide">
      <AdminPageHeader
        title="Restaurantes"
        description="Todos os restaurantes da plataforma PropioApp. Gerencie planos, distribuição, pagamentos e acesso de suporte."
        breadcrumbs={[{ label: APP_NAME, to: nav.admin() }, { label: "Restaurantes" }]}
        actions={
          <Button asChild className="gap-2">
            <Link to={nav.admin("tenants", "new")}>
              <Plus className="h-4 w-4" />
              Criar restaurante
            </Link>
          </Button>
        }
      />

      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Procurar por nome, slug ou domínio…"
            className="pl-9"
          />
        </div>
        <StatusPill label={`${filtered.length} restaurantes`} tone="neutral" />
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : filtered.length === 0 ? (
        <Card className="p-10 text-center">
          <Building2 className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
          <p className="text-sm font-semibold">Sem restaurantes ainda</p>
          <p className="text-xs text-muted-foreground mt-1">
            Comece por criar o primeiro restaurante para sua plataforma.
          </p>
          <Button asChild className="mt-4 gap-2">
            <Link to={nav.admin("tenants", "new")}>
              <Plus className="h-4 w-4" /> Criar restaurante
            </Link>
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {filtered.map((t) => {
            const dist = (t.tenant_app_distribution ?? [])[0]?.distribution_type ?? "pwa";
            const planLabel = PLAN_LABELS[(t.plan as PlanKey) || "start"] ?? "START";
            const stripeEnabled = (t.store_payment_gateways as unknown as { store_payment_gateways: { is_enabled: boolean }[] }[] | undefined)
              ?.some((row) => row.store_payment_gateways?.some((g) => g.is_enabled)) ?? false;

            return (
              <Card key={t.id} className="p-4 hover:border-primary/30 transition-colors">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <Building2 className="h-5 w-5 text-primary" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-sm truncate">{t.name}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        /{t.slug} · criado {fmtDate(t.created_at)}
                      </p>
                      {t.custom_domain && (
                        <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                          <Globe className="inline h-3 w-3 mr-1" />
                          {t.custom_domain}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <Badge variant="outline" className="text-[10px]">{planLabel}</Badge>
                    {t.is_active ? (
                      <StatusPill label="Activo" tone="active" dot />
                    ) : (
                      <StatusPill label="Inactivo" tone="neutral" />
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap gap-1.5 mt-3">
                  <Badge variant="secondary" className="text-[10px] gap-1">
                    <Smartphone className="h-3 w-3" />
                    {dist === "native_app" ? "App nativo" : "PWA"}
                  </Badge>
                  <Badge
                    variant={stripeEnabled ? "default" : "outline"}
                    className="text-[10px] gap-1"
                  >
                    <CreditCard className="h-3 w-3" />
                    Stripe {stripeEnabled ? "ON" : "OFF"}
                  </Badge>
                </div>

                <div className="flex flex-wrap gap-1.5 mt-3 pt-3 border-t">
                  <Button asChild size="sm" variant="default" className="gap-1.5 h-8">
                    <Link to={nav.panel()}>
                      <LayoutDashboard className="h-3.5 w-3.5" />
                      Abrir painel
                    </Link>
                  </Button>
                  <Button asChild size="sm" variant="outline" className="gap-1.5 h-8">
                    <a href={tenantPublicUrl(t)} target="_blank" rel="noreferrer">
                      <ExternalLink className="h-3.5 w-3.5" />
                      Loja pública
                    </a>
                  </Button>
                  <Button asChild size="sm" variant="ghost" className="gap-1.5 h-8">
                    <Link to={nav.admin("distribution", t.id)}>
                      <Smartphone className="h-3.5 w-3.5" />
                      Distribuição
                    </Link>
                  </Button>
                  <Button asChild size="sm" variant="ghost" className="gap-1.5 h-8">
                    <Link to={nav.admin("payments")}>
                      <CreditCard className="h-3.5 w-3.5" />
                      Pagamentos
                    </Link>
                  </Button>
                  <Button asChild size="sm" variant="ghost" className="gap-1.5 h-8">
                    <Link to={nav.admin("settings")}>
                      <Settings className="h-3.5 w-3.5" />
                      Configurar
                    </Link>
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </PlatformPageShell>
  );
}