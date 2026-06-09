import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Loader2, Smartphone, Globe, Apple } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { nav } from "@/lib/navPaths.ts";

type DistributionRow = {
  id: string;
  tenant_id: string;
  distribution_type: "pwa" | "native_app";
  pwa_status: "draft" | "active" | "disabled";
  android_app_status: string;
  ios_app_status: string;
  android_version: string | null;
  ios_version: string | null;
  updated_at: string;
  tenants: { name: string; slug: string } | null;
};

const statusBadgeVariant = (s: string) =>
  s === "published" || s === "active"
    ? "default"
    : s === "in_review" || s === "draft"
      ? "secondary"
      : s === "rejected"
        ? "destructive"
        : "outline";

export default function DistributionOverviewPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["admin-tenant-app-distribution-overview"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tenant_app_distribution")
        .select("*, tenants(name, slug)")
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as DistributionRow[];
    },
  });

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Smartphone className="h-6 w-6" /> Distribuição comercial
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Visão consolidada da distribuição (PWA, Android, iOS) de cada restaurante.
        </p>
      </div>

      <Card className="p-0 overflow-hidden">
        {isLoading ? (
          <div className="p-8 flex items-center gap-2">
            <Loader2 className="animate-spin h-4 w-4" /> Carregando…
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Restaurante</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead><Globe className="inline h-3 w-3 mr-1" />PWA</TableHead>
                <TableHead><Smartphone className="inline h-3 w-3 mr-1" />Android</TableHead>
                <TableHead><Apple className="inline h-3 w-3 mr-1" />iOS</TableHead>
                <TableHead className="text-right">Acção</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(data ?? []).map((row) => (
                <TableRow key={row.id}>
                  <TableCell>
                    <div className="font-medium">{row.tenants?.name ?? "—"}</div>
                    <div className="text-xs text-muted-foreground">{row.tenants?.slug}</div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={row.distribution_type === "native_app" ? "default" : "secondary"}>
                      {row.distribution_type === "native_app" ? "App nativo" : "PWA"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={statusBadgeVariant(row.pwa_status)}>{row.pwa_status}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={statusBadgeVariant(row.android_app_status)}>
                      {row.android_app_status}
                    </Badge>
                    {row.android_version && (
                      <span className="ml-2 text-xs text-muted-foreground">v{row.android_version}</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant={statusBadgeVariant(row.ios_app_status)}>{row.ios_app_status}</Badge>
                    {row.ios_version && (
                      <span className="ml-2 text-xs text-muted-foreground">v{row.ios_version}</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button asChild size="sm" variant="outline">
                      <Link to={nav.admin("distribution", row.tenant_id)}>Editar</Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {(data ?? []).length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-sm text-muted-foreground py-8">
                    Nenhum restaurante encontrado.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        )}
      </Card>
    </div>
  );
}