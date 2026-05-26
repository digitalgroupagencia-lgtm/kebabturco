import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, Loader2, Plus, RefreshCw, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useMenuData } from "@/hooks/useMenuData";
import { useAdminStoreId } from "@/hooks/useAdminStoreId";
import type { ModifierGroup } from "@/lib/modifiers/types";
import {
  auditExpectedDrinkCatalog,
  auditModifierOptionsAgainstCatalog,
  buildProductPayloadFromOption,
  catalogAuditSummary,
  mergeCatalogAudits,
  type CatalogAuditIssue,
} from "@/lib/modifiers/menuCatalogAudit";
import { toast } from "sonner";

async function fetchDrinkGroups(storeId: string): Promise<ModifierGroup[]> {
  const sb = supabase as any;
  const { data: groups } = await sb
    .from("modifier_groups")
    .select("id, name, group_kind, sort_order, is_active")
    .eq("store_id", storeId)
    .eq("is_active", true)
    .order("sort_order");

  if (!groups?.length) return [];

  const ids = groups.map((g: any) => g.id);
  const { data: options } = await sb
    .from("modifier_options")
    .select("id, group_id, name, price, image_url, sort_order, is_active")
    .in("group_id", ids)
    .eq("is_active", true)
    .order("sort_order");

  return groups.map((g: any) => ({
    id: g.id,
    name: g.name as ModifierGroup["name"],
    groupKind: g.group_kind as ModifierGroup["groupKind"],
    options: (options ?? [])
      .filter((o: any) => o.group_id === g.id)
      .map((o: any) => ({
        id: o.id,
        name: o.name as ModifierGroup["options"][0]["name"],
        price: Number(o.price ?? 0),
        imageUrl: o.image_url ?? undefined,
      })),
  })) as unknown as ModifierGroup[];
}

async function findDrinksCategoryId(storeId: string): Promise<string | null> {
  const { data } = await supabase
    .from("categories")
    .select("id, name, sort_order")
    .eq("store_id", storeId)
    .order("sort_order");

  const match = (data ?? []).find((c) => {
    const name = c.name as Record<string, string>;
    const label = `${name?.es || ""} ${name?.pt || ""}`.toLowerCase();
    return /bebida|drink|boisson|refresco/i.test(label);
  });

  return match?.id ?? data?.[0]?.id ?? null;
}

export default function MenuCatalogAuditPanel() {
  const { storeId } = useAdminStoreId();
  const { products, loading: menuLoading } = useMenuData();
  const [groups, setGroups] = useState<ModifierGroup[]>([]);
  const [loadingGroups, setLoadingGroups] = useState(false);
  const [open, setOpen] = useState(false);
  const [creatingId, setCreatingId] = useState<string | null>(null);

  const loadGroups = useCallback(async () => {
    if (!storeId) return;
    setLoadingGroups(true);
    try {
      setGroups(await fetchDrinkGroups(storeId));
    } finally {
      setLoadingGroups(false);
    }
  }, [storeId]);

  useEffect(() => {
    void loadGroups();
  }, [loadGroups]);

  const issues = useMemo(() => {
    if (!products.length) return [] as CatalogAuditIssue[];
    return mergeCatalogAudits(
      auditModifierOptionsAgainstCatalog(groups, products),
      auditExpectedDrinkCatalog(products),
    );
  }, [groups, products]);

  const summary = useMemo(() => catalogAuditSummary(issues), [issues]);
  const loading = menuLoading || loadingGroups;

  const createProductForOption = async (issue: CatalogAuditIssue) => {
    if (!storeId || issue.optionId.startsWith("expected-")) {
      toast.message("Adicione manualmente na categoria Bebidas");
      return;
    }

    const group = groups.find((g) =>
      (g.options ?? []).some((o) => o.id === issue.optionId),
    );
    const option = group?.options?.find((o) => o.id === issue.optionId);
    if (!option) return;

    setCreatingId(issue.optionId);
    try {
      const categoryId = await findDrinksCategoryId(storeId);
      if (!categoryId) {
        toast.error("Crie primeiro uma categoria Bebidas");
        return;
      }

      const { count } = await supabase
        .from("products")
        .select("id", { count: "exact", head: true })
        .eq("category_id", categoryId);

      const payload = buildProductPayloadFromOption(
        option,
        categoryId,
        storeId,
        (count ?? 0) + 1,
      );

      const { error } = await (supabase.from("products") as any).insert(payload);
      if (error) throw error;

      toast.success(`"${issue.optionName}" adicionado ao cardápio`);
      await loadGroups();
      window.dispatchEvent(new CustomEvent("menu-catalog-audit-refresh"));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao criar produto");
    } finally {
      setCreatingId(null);
    }
  };

  if (loading) {
    return (
      <Card className="border-primary/20 mb-6">
        <CardContent className="py-6 flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          A auditar opções do cardápio…
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-primary/20 mb-6 shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <ShieldAlert className="h-5 w-5 text-primary" />
              Auditoria de opções do cardápio
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Verifica bebidas e opções usadas em combos que não aparecem para edição no cardápio.
            </p>
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => void loadGroups()}>
              <RefreshCw className="h-4 w-4 mr-1" />
              Actualizar
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={() => setOpen((v) => !v)}>
              {open ? "Ocultar" : "Ver relatório"}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap gap-3 text-sm">
          <span className="font-semibold text-destructive">{summary.errors} sem produto</span>
          <span className="font-semibold text-amber-600">{summary.warnings} avisos</span>
          <span className="text-muted-foreground">{products.length} produtos no cardápio</span>
        </div>

        {summary.total === 0 && (
          <p className="text-sm text-success font-medium">
            Todas as opções de combo têm produto editável no cardápio.
          </p>
        )}

        {open && issues.length > 0 && (
          <ul className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
            {issues.map((issue) => (
              <li
                key={`${issue.optionId}-${issue.problem}`}
                className={`rounded-xl border p-3 text-sm ${
                  issue.severity === "error"
                    ? "border-destructive/30 bg-destructive/5"
                    : "border-amber-500/30 bg-amber-500/5"
                }`}
              >
                <div className="flex items-start gap-2">
                  <AlertTriangle
                    className={`h-4 w-4 shrink-0 mt-0.5 ${issue.severity === "error" ? "text-destructive" : "text-amber-600"}`}
                  />
                  <div className="flex-1 space-y-1">
                    <p className="font-bold">{issue.optionName}</p>
                    <p className="text-xs text-muted-foreground">{issue.groupName}</p>
                    <p>
                      <span className="font-semibold">Problema:</span> {issue.problem}
                    </p>
                    <p className="text-muted-foreground">
                      <span className="font-semibold text-foreground">Sugestão:</span>{" "}
                      {issue.suggestion}
                    </p>
                    {issue.severity === "error" && !issue.optionId.startsWith("expected-") && (
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        className="mt-2 h-8"
                        disabled={creatingId === issue.optionId}
                        onClick={() => void createProductForOption(issue)}
                      >
                        {creatingId === issue.optionId ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
                        ) : (
                          <Plus className="h-3.5 w-3.5 mr-1" />
                        )}
                        Criar no cardápio
                      </Button>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
