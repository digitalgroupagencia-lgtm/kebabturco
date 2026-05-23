import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { ADMIN_MASTER_HOSTS } from "@/lib/platformHosts";
import { buildTenantUrl, getTenantTotemUrl, type TenantUrlConfig } from "@/lib/tenantUrls";
import { Copy, ExternalLink, Globe, Link2, Pencil, Loader2, Shield } from "lucide-react";
import { useState } from "react";

type TenantRow = TenantUrlConfig & {
  id: string;
  name: string;
  is_active: boolean;
};

type DomainForm = {
  custom_domain: string;
  path_slug: string;
  master_domain: string;
  use_master_domain: boolean;
};

const emptyDomainForm: DomainForm = {
  custom_domain: "",
  path_slug: "",
  master_domain: "",
  use_master_domain: false,
};

const linkRows = (tenant: TenantUrlConfig) => [
  { label: "Totem / loja pública", url: getTenantTotemUrl(tenant), icon: Globe },
  { label: "Painel restaurante", url: buildTenantUrl(tenant, "/panel"), icon: Shield },
  { label: "App vendedor", url: buildTenantUrl(tenant, "/seller"), icon: Shield },
  { label: "Login", url: buildTenantUrl(tenant, "/auth"), icon: Link2 },
];

function DomainStatus({ tenant }: { tenant: TenantRow }) {
  if (tenant.custom_domain) {
    return (
      <Badge className="bg-emerald-600/90 hover:bg-emerald-600">
        Domínio próprio · {tenant.custom_domain}
      </Badge>
    );
  }
  if (tenant.use_master_domain && tenant.path_slug) {
    return (
      <Badge variant="outline">
        Path · {tenant.master_domain || "?"}/{tenant.path_slug}
      </Badge>
    );
  }
  return <Badge variant="secondary">Sem domínio — usa ?tenant=</Badge>;
}

export default function AdminDomainsPage() {
  const qc = useQueryClient();
  const [editTenant, setEditTenant] = useState<TenantRow | null>(null);
  const [form, setForm] = useState<DomainForm>(emptyDomainForm);

  const { data: tenants, isLoading } = useQuery({
    queryKey: ["admin-domains-tenants"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tenants")
        .select("id, name, slug, is_active, custom_domain, path_slug, master_domain, use_master_domain")
        .eq("is_template", false)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data as TenantRow[];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: DomainForm }) => {
      const { error } = await supabase.from("tenants").update({
        custom_domain: patch.custom_domain.trim() || null,
        path_slug: patch.path_slug.trim() || null,
        master_domain: patch.master_domain.trim() || null,
        use_master_domain: patch.use_master_domain,
      }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-domains-tenants"] });
      qc.invalidateQueries({ queryKey: ["admin-tenants"] });
      toast.success("Domínios actualizados");
      setEditTenant(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const openEdit = (t: TenantRow) => {
    setEditTenant(t);
    setForm({
      custom_domain: t.custom_domain || "",
      path_slug: t.path_slug || "",
      master_domain: t.master_domain || "",
      use_master_domain: t.use_master_domain ?? false,
    });
  };

  const copy = (url: string) => {
    navigator.clipboard.writeText(url);
    toast.success("Link copiado");
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Globe className="w-6 h-6 text-primary" /> Domínios & Links
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Um único app serve todos os clientes. Cada restaurante é identificado pelo domínio ou subcaminho configurado aqui.
        </p>
      </div>

      <Card className="border-primary/20 bg-primary/5">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Shield className="w-4 h-4" /> Admin Master (reservado)
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm space-y-2">
          <p>
            Futuro painel da plataforma:{" "}
            <strong>{ADMIN_MASTER_HOSTS.join(", ")}</strong>
          </p>
          <p className="text-muted-foreground text-xs">
            Aponte o DNS deste domínio para o mesmo deploy. O sistema redirecciona automaticamente para <code>/admin</code>.
            Não associe este domínio a nenhum restaurante.
          </p>
        </CardContent>
      </Card>

      <div className="space-y-4">
        {tenants?.map((t, index) => (
          <Card key={t.id}>
            <CardHeader className="pb-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <CardTitle className="text-lg flex items-center gap-2 flex-wrap">
                    {t.name}
                    {index === 0 && (
                      <Badge variant="outline" className="text-[10px] uppercase tracking-wide">
                        Cliente #1
                      </Badge>
                    )}
                  </CardTitle>
                  <p className="text-xs text-muted-foreground mt-1">slug: {t.slug}</p>
                </div>
                <div className="flex items-center gap-2">
                  <DomainStatus tenant={t} />
                  <Dialog open={editTenant?.id === t.id} onOpenChange={(o) => !o && setEditTenant(null)}>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm" onClick={() => openEdit(t)}>
                        <Pencil className="w-3.5 h-3.5 mr-1" /> Editar
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-lg">
                      <DialogHeader>
                        <DialogTitle>Domínios — {t.name}</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <Label>Domínio próprio</Label>
                          <Input
                            placeholder="kebabturco.net"
                            value={form.custom_domain}
                            onChange={(e) => setForm({ ...form, custom_domain: e.target.value })}
                          />
                          <p className="text-xs text-muted-foreground mt-1">DNS CNAME/A → mesmo hosting do app</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={form.use_master_domain}
                            onCheckedChange={(v) => setForm({ ...form, use_master_domain: v })}
                          />
                          <Label>Usar subcaminho no domínio principal (legado)</Label>
                        </div>
                        {form.use_master_domain && (
                          <>
                            <div>
                              <Label>Domínio principal</Label>
                              <Input
                                placeholder="snaporder.es"
                                value={form.master_domain}
                                onChange={(e) => setForm({ ...form, master_domain: e.target.value })}
                              />
                            </div>
                            <div>
                              <Label>Subcaminho (path_slug)</Label>
                              <Input
                                placeholder="kebabturco"
                                value={form.path_slug}
                                onChange={(e) => setForm({ ...form, path_slug: e.target.value })}
                              />
                            </div>
                          </>
                        )}
                        <Button
                          className="w-full"
                          disabled={saveMutation.isPending}
                          onClick={() => editTenant && saveMutation.mutate({ id: editTenant.id, patch: form })}
                        >
                          {saveMutation.isPending ? "A guardar…" : "Guardar"}
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {linkRows(t).map((row) => (
                <div
                  key={row.label}
                  className="flex flex-col sm:flex-row sm:items-center gap-2 p-3 rounded-xl bg-muted/30 border"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold">{row.label}</p>
                    <p className="text-xs font-mono break-all text-muted-foreground">{row.url}</p>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button variant="ghost" size="icon" onClick={() => copy(row.url)}>
                      <Copy className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" asChild>
                      <a href={row.url} target="_blank" rel="noreferrer">
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
