import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Loader2, Rocket, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { nav } from "@/lib/navPaths.ts";

type Row = {
  tenant_id: string;
  android_app_status: string;
  android_version: string | null;
  android_published_at: string | null;
  android_play_console_url: string | null;
  ios_app_status: string;
  ios_version: string | null;
  ios_published_at: string | null;
  ios_appstore_connect_url: string | null;
  tenants: { name: string; slug: string } | null;
};

const v = (s: string) =>
  s === "published" ? "default" : s === "in_review" ? "secondary" : s === "rejected" ? "destructive" : "outline";

const fmt = (d: string | null) => (d ? new Date(d).toLocaleDateString() : "—");

export default function ReleaseCenterPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["admin-release-center"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tenant_app_distribution")
        .select(
          "tenant_id, android_app_status, android_version, android_published_at, android_play_console_url, ios_app_status, ios_version, ios_published_at, ios_appstore_connect_url, tenants(name, slug)",
        )
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as Row[];
    },
  });

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Rocket className="h-6 w-6" /> Release Center
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Estado de publicação por restaurante (Google Play & App Store). Edição em Distribuição.
        </p>
      </div>

      <Card className="p-0 overflow-hidden">
        {isLoading ? (
          <div className="p-8 flex items-center gap-2"><Loader2 className="animate-spin h-4 w-4" /> Carregando…</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Restaurante</TableHead>
                <TableHead>Android</TableHead>
                <TableHead>Publicado</TableHead>
                <TableHead>iOS</TableHead>
                <TableHead>Publicado</TableHead>
                <TableHead className="text-right">Acção</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(data ?? []).map((r) => (
                <TableRow key={r.tenant_id}>
                  <TableCell>
                    <div className="font-medium">{r.tenants?.name ?? "—"}</div>
                    <div className="text-xs text-muted-foreground">{r.tenants?.slug}</div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Badge variant={v(r.android_app_status)}>{r.android_app_status}</Badge>
                      {r.android_version && <span className="text-xs text-muted-foreground">v{r.android_version}</span>}
                      {r.android_play_console_url && (
                        <a href={r.android_play_console_url} target="_blank" rel="noreferrer" className="text-primary">
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-xs">{fmt(r.android_published_at)}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Badge variant={v(r.ios_app_status)}>{r.ios_app_status}</Badge>
                      {r.ios_version && <span className="text-xs text-muted-foreground">v{r.ios_version}</span>}
                      {r.ios_appstore_connect_url && (
                        <a href={r.ios_appstore_connect_url} target="_blank" rel="noreferrer" className="text-primary">
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-xs">{fmt(r.ios_published_at)}</TableCell>
                  <TableCell className="text-right">
                    <Button asChild size="sm" variant="outline">
                      <Link to={nav.admin("distribution", r.tenant_id)}>Editar</Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {(data ?? []).length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-sm text-muted-foreground py-8">
                    Sem dados.
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