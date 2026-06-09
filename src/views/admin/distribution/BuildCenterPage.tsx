import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, Plus, Hammer, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";

const STATUSES = ["planned", "in_progress", "success", "failed", "cancelled"] as const;

type Build = {
  id: string;
  tenant_id: string;
  platform: "android" | "ios";
  version: string | null;
  build_number: string | null;
  status: (typeof STATUSES)[number];
  artifact_url: string | null;
  notes: string | null;
  started_at: string | null;
  finished_at: string | null;
  created_at: string;
  tenants: { name: string; slug: string } | null;
};

type Tenant = { id: string; name: string; slug: string };

const statusVariant = (s: string) =>
  s === "success" ? "default" : s === "failed" ? "destructive" : s === "in_progress" ? "secondary" : "outline";

export default function BuildCenterPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    tenant_id: "",
    platform: "android" as "android" | "ios",
    version: "",
    build_number: "",
    status: "planned" as (typeof STATUSES)[number],
    notes: "",
    artifact_url: "",
  });

  const { data: tenants } = useQuery({
    queryKey: ["admin-tenants-min"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tenants").select("id, name, slug").order("name");
      if (error) throw error;
      return (data ?? []) as Tenant[];
    },
  });

  const { data: builds, isLoading } = useQuery({
    queryKey: ["admin-tenant-app-builds"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tenant_app_builds")
        .select("*, tenants(name, slug)")
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return (data ?? []) as unknown as Build[];
    },
  });

  const create = async () => {
    if (!form.tenant_id) { toast.error("Selecciona restaurante"); return; }
    const { error } = await supabase.from("tenant_app_builds").insert({
      tenant_id: form.tenant_id,
      platform: form.platform,
      version: form.version || null,
      build_number: form.build_number || null,
      status: form.status,
      notes: form.notes || null,
      artifact_url: form.artifact_url || null,
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Build registado");
    setOpen(false);
    setForm({ tenant_id: "", platform: "android", version: "", build_number: "", status: "planned", notes: "", artifact_url: "" });
    qc.invalidateQueries({ queryKey: ["admin-tenant-app-builds"] });
  };

  const remove = async (id: string) => {
    if (!confirm("Remover este registo de build?")) return;
    const { error } = await supabase.from("tenant_app_builds").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Build removido");
    qc.invalidateQueries({ queryKey: ["admin-tenant-app-builds"] });
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Hammer className="h-6 w-6" /> Build Center
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Registo de builds Android/iOS por restaurante. Não executa builds reais — apenas controla o histórico.
          </p>
        </div>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-1" /> Novo build</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Registar build</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div>
                <Label>Restaurante</Label>
                <Select value={form.tenant_id} onValueChange={(v) => setForm({ ...form, tenant_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Seleccione" /></SelectTrigger>
                  <SelectContent>
                    {(tenants ?? []).map((t) => (
                      <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Plataforma</Label>
                  <Select value={form.platform} onValueChange={(v) => setForm({ ...form, platform: v as "android" | "ios" })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="android">Android</SelectItem>
                      <SelectItem value="ios">iOS</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Estado</Label>
                  <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v as (typeof STATUSES)[number] })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Versão</Label>
                  <Input value={form.version} onChange={(e) => setForm({ ...form, version: e.target.value })} placeholder="1.0.0" />
                </div>
                <div>
                  <Label>Build #</Label>
                  <Input value={form.build_number} onChange={(e) => setForm({ ...form, build_number: e.target.value })} placeholder="123" />
                </div>
              </div>
              <div>
                <Label>URL do artefacto</Label>
                <Input value={form.artifact_url} onChange={(e) => setForm({ ...form, artifact_url: e.target.value })} />
              </div>
              <div>
                <Label>Notas</Label>
                <Textarea rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
              </div>
            </div>
            <DialogFooter>
              <Button onClick={create}>Criar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="p-0 overflow-hidden">
        {isLoading ? (
          <div className="p-8 flex items-center gap-2"><Loader2 className="animate-spin h-4 w-4" /> Carregando…</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Restaurante</TableHead>
                <TableHead>Plataforma</TableHead>
                <TableHead>Versão</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Data</TableHead>
                <TableHead className="text-right">Acção</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(builds ?? []).map((b) => (
                <TableRow key={b.id}>
                  <TableCell>{b.tenants?.name ?? "—"}</TableCell>
                  <TableCell><Badge variant="outline">{b.platform}</Badge></TableCell>
                  <TableCell>
                    {b.version ?? "—"}{b.build_number ? ` (${b.build_number})` : ""}
                  </TableCell>
                  <TableCell><Badge variant={statusVariant(b.status)}>{b.status}</Badge></TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {new Date(b.created_at).toLocaleString()}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button size="icon" variant="ghost" onClick={() => remove(b.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {(builds ?? []).length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-sm text-muted-foreground py-8">
                    Nenhum build registado.
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