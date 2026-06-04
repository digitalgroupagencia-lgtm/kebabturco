import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  TEMPLATE_VERSION,
  TEMPLATE_CODENAME,
  TEMPLATE_RELEASED_AT,
  diagnoseTemplateStatus,
  type TemplateStatus,
} from "@/lib/templateVersion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/hooks/use-toast";
import {
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  History,
  Save,
  Loader2,
} from "lucide-react";

type HistoryRow = {
  id: string;
  version: string;
  applied_at: string;
  project_name: string | null;
  update_type: string;
  migration_names: string[];
  notes: string | null;
  requires_apk_rebuild: boolean;
  success: boolean;
};

const statusBadge = (status: TemplateStatus) => {
  switch (status.kind) {
    case "up_to_date":
      return { icon: CheckCircle2, variant: "default" as const, color: "text-success" };
    case "db_outdated":
      return { icon: AlertTriangle, variant: "secondary" as const, color: "text-warning" };
    case "code_outdated":
      return { icon: AlertTriangle, variant: "secondary" as const, color: "text-warning" };
    case "bootstrap_missing":
      return { icon: XCircle, variant: "destructive" as const, color: "text-destructive" };
  }
};

export default function TemplateVersionPage() {
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<TemplateStatus | null>(null);
  const [history, setHistory] = useState<HistoryRow[]>([]);
  const [saving, setSaving] = useState(false);
  const [applying, setApplying] = useState(false);


  // form
  const [projectName, setProjectName] = useState("");
  const [updateType, setUpdateType] = useState("frontend");
  const [migrationNames, setMigrationNames] = useState("");
  const [notes, setNotes] = useState("");
  const [requiresApk, setRequiresApk] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const [{ data: ver }, { data: hist }] = await Promise.all([
      supabase
        .from("_template_version")
        .select("version, applied_at")
        .order("applied_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("template_update_history")
        .select("*")
        .order("applied_at", { ascending: false })
        .limit(20),
    ]);
    setStatus(diagnoseTemplateStatus(ver?.version ?? null, ver?.applied_at ?? null));
    setHistory((hist as HistoryRow[] | null) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const registerUpdate = async () => {
    setSaving(true);
    const { data: userData } = await supabase.auth.getUser();
    const migrations = migrationNames
      .split(/[,\n]/)
      .map((s) => s.trim())
      .filter(Boolean);
    const { error } = await supabase.from("template_update_history").insert({
      version: TEMPLATE_VERSION,
      project_name: projectName || null,
      update_type: updateType,
      migration_names: migrations,
      notes: notes || null,
      requires_apk_rebuild: requiresApk,
      success: true,
      applied_by: userData.user?.id ?? null,
    });
    setSaving(false);
    if (error) {
      toast({ title: "Erro ao registrar", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Update registrado", description: `v${TEMPLATE_VERSION}` });
    setNotes("");
    setMigrationNames("");
    void load();
  };

  const applyCatchup = async () => {
    setApplying(true);
    const { data, error } = await supabase.rpc("apply_template_catchup", {
      _target_version: TEMPLATE_VERSION,
    });
    setApplying(false);
    if (error) {
      toast({
        title: "Falha ao atualizar banco",
        description: error.message,
        variant: "destructive",
      });
      return;
    }
    const result = data as { ok: boolean; error?: string; already_up_to_date?: boolean; new_version?: string; previous_version?: string };
    if (!result?.ok) {
      toast({
        title: "Não foi possível atualizar",
        description: result?.error ?? "Erro desconhecido",
        variant: "destructive",
      });
      return;
    }
    toast({
      title: result.already_up_to_date ? "Banco já estava atualizado" : "Banco atualizado com sucesso",
      description: result.already_up_to_date
        ? `Versão ${result.new_version ?? TEMPLATE_VERSION}`
        : `${result.previous_version ?? "—"} → ${result.new_version}`,
    });
    void load();
  };

  const badge = status ? statusBadge(status) : null;
  const StatusIcon = badge?.icon ?? RefreshCw;
  const needsCatchup = status?.kind === "db_outdated" || status?.kind === "bootstrap_missing";


  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">Versão do Template</h1>
          <p className="text-sm text-muted-foreground">
            Diagnóstico do Master Template, código vs banco e histórico de updates.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => void load()} disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          <span className="ml-1.5">Atualizar</span>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <StatusIcon className={`h-5 w-5 ${badge?.color ?? ""}`} />
            {status?.label ?? "Carregando…"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">{status?.detail}</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
            <div>
              <p className="text-xs text-muted-foreground">Código</p>
              <p className="font-bold">{TEMPLATE_VERSION}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Banco</p>
              <p className="font-bold">{status?.dbVersion ?? "—"}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Última aplicação</p>
              <p className="font-bold">
                {status?.dbAppliedAt
                  ? new Date(status.dbAppliedAt).toLocaleString("pt-PT")
                  : "—"}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Codename</p>
              <p className="font-bold">
                {TEMPLATE_CODENAME} <span className="font-normal text-muted-foreground">({TEMPLATE_RELEASED_AT})</span>
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Save className="h-5 w-5" />
            Registrar update aplicado
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid md:grid-cols-2 gap-3">
            <div>
              <Label>Nome do projeto/restaurante</Label>
              <Input
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                placeholder="Ex: Pastelanche"
              />
            </div>
            <div>
              <Label>Tipo</Label>
              <select
                className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                value={updateType}
                onChange={(e) => setUpdateType(e.target.value)}
              >
                <option value="frontend">frontend</option>
                <option value="banco">banco</option>
                <option value="native">native/android</option>
                <option value="integração">integração</option>
                <option value="bugfix">bugfix</option>
                <option value="feature">feature</option>
                <option value="mixed">mixed</option>
              </select>
            </div>
          </div>
          <div>
            <Label>Migrations aplicadas (separe por vírgula ou linha)</Label>
            <Textarea
              rows={2}
              value={migrationNames}
              onChange={(e) => setMigrationNames(e.target.value)}
              placeholder="20260604181341_template_update_history.sql"
            />
          </div>
          <div>
            <Label>Notas</Label>
            <Textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Observações da atualização…"
            />
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={requiresApk} onCheckedChange={setRequiresApk} id="apk" />
            <Label htmlFor="apk" className="cursor-pointer">Exigiu rebuild de APK</Label>
          </div>
          <Button onClick={() => void registerUpdate()} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
            Registrar v{TEMPLATE_VERSION}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Histórico de updates
          </CardTitle>
        </CardHeader>
        <CardContent>
          {history.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum update registrado ainda.</p>
          ) : (
            <div className="space-y-2">
              {history.map((h) => (
                <div key={h.id} className="border rounded-md p-3 text-sm">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant={h.success ? "default" : "destructive"}>v{h.version}</Badge>
                    <Badge variant="outline">{h.update_type}</Badge>
                    {h.requires_apk_rebuild && <Badge variant="secondary">APK rebuild</Badge>}
                    {h.project_name && (
                      <span className="font-bold">{h.project_name}</span>
                    )}
                    <span className="text-xs text-muted-foreground ml-auto">
                      {new Date(h.applied_at).toLocaleString("pt-PT")}
                    </span>
                  </div>
                  {h.migration_names.length > 0 && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Migrations: {h.migration_names.join(", ")}
                    </p>
                  )}
                  {h.notes && <p className="text-xs mt-1">{h.notes}</p>}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
