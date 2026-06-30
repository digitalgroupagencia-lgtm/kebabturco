import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase as _supabaseRaw } from "@/integrations/supabase/client";
const supabase = _supabaseRaw as unknown as any;
import { useAdminStoreId } from "@/hooks/useAdminStoreId";
import { useStaffT } from "@/hooks/useStaffT";
import { panelT } from "@/lib/staffPanelLocale";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2, Plus, Pencil, Trash2, Layers, GripVertical, AlertTriangle, Download } from "lucide-react";
import type { ModifierGroupKind, SelectionMode, ModifierGroup } from "@/lib/modifiers/types";
import { GROUP_KIND_META, normalizeGroupKindSettings } from "@/lib/modifiers/groupKindMeta";
import { getModifierConfigWarnings } from "@/lib/modifiers/sanitizeGroups";
import { importStoreModifiersFromCatalog } from "@/lib/modifiers/importStoreModifiersFromCatalog";
import { isImportModifiersError } from "@/lib/modifiers/importStoreModifiersErrors";
import { useStoreLanguages } from "@/hooks/useStoreLanguages";
import { LANG_LABELS } from "@/contexts/LanguageContext";
import { buildPrimaryLanguagePayload, pickSourceText } from "@/lib/localizedText";
import AdminStoreSwitcher from "@/components/admin/AdminStoreSwitcher";

type GroupRow = {
  id: string;
  name: Record<string, string>;
  description: Record<string, string>;
  group_kind: ModifierGroupKind;
  selection_mode: SelectionMode;
  min_select: number;
  max_select: number;
  is_required: boolean;
  is_active: boolean;
  sort_order: number;
};

type OptionRow = {
  id: string;
  group_id: string;
  name: Record<string, string>;
  price_delta: number;
  max_qty: number;
  is_default: boolean;
  sort_order: number;
};

const MODIFIER_KIND_LABEL_KEY: Record<ModifierGroupKind, string> = {
  choice: "modifiers.type.choice",
  substitution: "modifiers.type.substitution",
  removal: "modifiers.type.removal",
  extra: "modifiers.type.extra",
};

const MODIFIER_KIND_HINT_KEY: Record<ModifierGroupKind, string> = {
  choice: "modifiers.kind.choice.hint",
  substitution: "modifiers.kind.substitution.hint",
  removal: "modifiers.kind.removal.hint",
  extra: "modifiers.kind.extra.hint",
};

const emptyGroup = (): Partial<GroupRow> => ({
  name: {},
  description: {},
  group_kind: "choice",
  selection_mode: "single",
  min_select: 0,
  max_select: 1,
  is_required: false,
  is_active: true,
});

export default function ModifierGroupsPage() {
  const { t, lang } = useStaffT();
  const { storeId, loading: loadingStore } = useAdminStoreId();
  const { primaryLang, loading: loadingLangs } = useStoreLanguages(storeId);
  const [groups, setGroups] = useState<GroupRow[]>([]);
  const [options, setOptions] = useState<OptionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [groupDialog, setGroupDialog] = useState(false);
  const [optionDialog, setOptionDialog] = useState(false);
  const [editingGroup, setEditingGroup] = useState<Partial<GroupRow> | null>(null);
  const [editingOption, setEditingOption] = useState<Partial<OptionRow> | null>(null);
  const [groupName, setGroupName] = useState("");
  const [optionName, setOptionName] = useState("");
  const [importing, setImporting] = useState(false);
  const [autoImportDone, setAutoImportDone] = useState(false);

  const fetchAll = useCallback(async () => {
    if (!storeId) {
      setGroups([]);
      setOptions([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data: gData, error: gErr } = await supabase
      .from("modifier_groups")
      .select("*")
      .eq("store_id", storeId)
      .order("sort_order");
    if (gErr) {
      console.error("[ModifierGroupsPage] load groups failed", gErr);
      toast.error(t("modifiers.toast.load_groups_error"));
      setLoading(false);
      return;
    }
    const gs = (gData || []) as GroupRow[];
    setGroups(gs);
    if (gs.length && !selectedGroupId) setSelectedGroupId(gs[0].id);

    const ids = gs.map((g) => g.id);
    if (ids.length) {
      const { data: oData, error: oErr } = await supabase
        .from("modifier_options")
        .select("*")
        .in("group_id", ids)
        .order("sort_order");
      if (oErr) {
        console.error("[ModifierGroupsPage] load options failed", oErr);
        toast.error(t("modifiers.toast.load_options_error"));
      }
      setOptions((oData || []) as OptionRow[]);
    } else {
      setOptions([]);
    }
    setLoading(false);
  }, [storeId, selectedGroupId]);

  useEffect(() => {
    if (storeId) fetchAll();
  }, [storeId, fetchAll]);

  useEffect(() => {
    setAutoImportDone(false);
  }, [storeId]);

  const runImport = useCallback(
    async (replaceExisting = false, silent = false) => {
      if (!storeId) return;
      setImporting(true);
      try {
        const result = await importStoreModifiersFromCatalog(storeId, { replaceExisting });
        if (!silent) {
          toast.success(panelT(lang, "modifiers.toast.imported", {
            groups: result.groupsCreated,
            options: result.optionsCreated,
          }));
        }
        await fetchAll();
      } catch (err) {
        if (isImportModifiersError(err)) {
          if (silent && (err.code === "NO_CUSTOMIZATIONS" || err.code === "HAS_GROUPS")) {
            return;
          }
          const key =
            err.code === "HAS_GROUPS"
              ? "modifiers.import.error.has_groups"
              : err.code === "NO_PRODUCTS"
                ? "modifiers.import.error.no_products"
                : "modifiers.import.error.no_customizations";
          if (!silent) toast.error(t(key));
        } else {
          if (!silent) {
            toast.error(err instanceof Error ? err.message : t("modifiers.toast.import_error"));
          }
        }
      } finally {
        setImporting(false);
      }
    },
    [storeId, fetchAll, lang, t],
  );

  useEffect(() => {
    if (!storeId || loading || loadingStore || groups.length > 0 || autoImportDone || importing) return;
    setAutoImportDone(true);
    void runImport(false, true);
  }, [storeId, loading, loadingStore, groups.length, autoImportDone, importing, runImport]);

  const selectedGroup = groups.find((g) => g.id === selectedGroupId);
  const groupOptions = options.filter((o) => o.group_id === selectedGroupId);

  const configWarnings = useMemo(() => {
    const modifierGroups: ModifierGroup[] = groups.map((g) => ({
      id: g.id,
      storeId: storeId || "",
      name: g.name,
      description: g.description,
      groupKind: g.group_kind,
      selectionMode: g.selection_mode,
      minSelect: g.min_select,
      maxSelect: g.max_select,
      isRequired: g.is_required,
      sortOrder: g.sort_order,
      repeatPerUnit: false,
      linkSortOrder: g.sort_order,
      options: options
        .filter((o) => o.group_id === g.id)
        .map((o) => ({
          id: o.id,
          groupId: o.group_id,
          name: o.name,
          priceDelta: Number(o.price_delta || 0),
          maxQty: o.max_qty || 1,
          isDefault: o.is_default ?? false,
          sortOrder: o.sort_order ?? 0,
        })),
    }));
    return getModifierConfigWarnings(modifierGroups);
  }, [groups, options, storeId]);

  const openGroup = (g?: GroupRow) => {
    if (g) {
      setEditingGroup({ ...g });
      setGroupName(pickSourceText(g.name, primaryLang));
    } else {
      setEditingGroup(emptyGroup());
      setGroupName("");
    }
    setGroupDialog(true);
  };

  const saveGroup = async () => {
    if (!storeId || !editingGroup) return;
    if (!groupName.trim()) {
      toast.error(panelT(lang, "menu.toast.name_required", { lang: LANG_LABELS[primaryLang] }));
      return;
    }
    const kind = (editingGroup.group_kind || "choice") as ModifierGroupKind;
    const normalized = normalizeGroupKindSettings(kind, editingGroup.is_required ?? false);
    const payload = {
      store_id: storeId,
      name: buildPrimaryLanguagePayload(editingGroup.name, primaryLang, groupName),
      description: editingGroup.description || {},
      group_kind: kind,
      selection_mode: normalized?.selection_mode ?? editingGroup.selection_mode ?? "single",
      min_select: normalized?.min_select ?? editingGroup.min_select ?? 0,
      max_select: normalized?.max_select ?? editingGroup.max_select ?? 1,
      is_required: editingGroup.is_required ?? false,
      is_active: editingGroup.is_active ?? true,
      sort_order: editingGroup.sort_order ?? groups.length,
    };
    if (editingGroup.id) {
      const { error } = await supabase.from("modifier_groups").update(payload).eq("id", editingGroup.id);
      if (error) { toast.error(error.message); return; }
    } else {
      const { error } = await supabase.from("modifier_groups").insert(payload);
      if (error) { toast.error(error.message); return; }
    }
    toast.success(t("modifiers.toast.group_saved"));
    setGroupDialog(false);
    fetchAll();
  };

  const deleteGroup = async (id: string) => {
    if (!confirm(t("modifiers.confirm.delete_group"))) return;
    const { error } = await supabase.from("modifier_groups").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success(t("modifiers.toast.group_deleted"));
    if (selectedGroupId === id) setSelectedGroupId(null);
    fetchAll();
  };

  const openOption = (o?: OptionRow) => {
    if (!selectedGroupId) return;
    if (o) {
      setEditingOption({ ...o });
      setOptionName(pickSourceText(o.name, primaryLang));
    } else {
      setEditingOption({
        group_id: selectedGroupId,
        name: {},
        price_delta: 0,
        max_qty: 1,
        sort_order: groupOptions.length,
      });
      setOptionName("");
    }
    setOptionDialog(true);
  };

  const saveOption = async () => {
    if (!editingOption?.group_id) return;
    if (!optionName.trim()) {
      toast.error(panelT(lang, "menu.toast.name_required", { lang: LANG_LABELS[primaryLang] }));
      return;
    }
    const payload = {
      group_id: editingOption.group_id,
      name: buildPrimaryLanguagePayload(editingOption.name, primaryLang, optionName),
      price_delta: Number(editingOption.price_delta || 0),
      max_qty: Math.max(1, Number(editingOption.max_qty || 1)),
      is_default: editingOption.is_default ?? false,
      sort_order: editingOption.sort_order ?? groupOptions.length,
      is_active: true,
    };
    if (payload.is_default) {
      await supabase.from("modifier_options").update({ is_default: false }).eq("group_id", editingOption.group_id);
    }
    if (editingOption.id) {
      const { error } = await supabase.from("modifier_options").update(payload).eq("id", editingOption.id);
      if (error) { toast.error(error.message); return; }
    } else {
      const { error } = await supabase.from("modifier_options").insert(payload);
      if (error) { toast.error(error.message); return; }
    }
    toast.success(t("modifiers.toast.option_saved"));
    setOptionDialog(false);
    fetchAll();
  };

  const deleteOption = async (id: string) => {
    const { error } = await supabase.from("modifier_options").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    fetchAll();
  };

  if (loadingStore || loading || loadingLangs) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-6xl mx-auto">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black flex items-center gap-2">
            <Layers className="w-7 h-7 text-primary" /> {t("page.modifiers.title")}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">{t("modifiers.subtitle")}</p>
        </div>
        <Button onClick={() => openGroup()} className="font-bold">
          <Plus className="w-4 h-4 mr-1" /> {t("modifiers.new_group")}
        </Button>
      </div>

      <AdminStoreSwitcher hint={t("modifiers.store_hint_admin")} />

      {!loading && groups.length === 0 && (
        <Card className="border-dashed border-primary/40 bg-primary/5">
          <CardContent className="p-4 space-y-3">
            <p className="text-sm font-semibold">{t("modifiers.import.banner")}</p>
            <p className="text-xs text-muted-foreground">{t("modifiers.import.hint2")}</p>
            <Button type="button" disabled={importing || !storeId} onClick={() => void runImport(false)}>
              {importing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Download className="h-4 w-4 mr-2" />}
              {t("modifiers.import.btn")}
            </Button>
          </CardContent>
        </Card>
      )}

      {configWarnings.length > 0 && (
        <div className="rounded-xl border-2 border-amber-500/40 bg-amber-500/10 p-4 space-y-2">
          <p className="text-sm font-black flex items-center gap-2 text-amber-900 dark:text-amber-100">
            <AlertTriangle className="w-5 h-5 shrink-0" />
            {t("modifiers.warnings.title")}
          </p>
          <ul className="text-sm text-amber-900/90 dark:text-amber-100/90 space-y-1 list-disc pl-5">
            {configWarnings.map((w) => (
              <li key={w.groupId}>
                <span className="font-bold">{w.groupName}:</span> {w.message}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {(Object.keys(GROUP_KIND_META) as ModifierGroupKind[]).map((kind) => (
          <div key={kind} className="rounded-xl border bg-card p-3 space-y-1">
            <p className="text-sm font-black">{t(MODIFIER_KIND_LABEL_KEY[kind])}</p>
            <p className="text-xs text-muted-foreground leading-snug">{t(MODIFIER_KIND_HINT_KEY[kind])}</p>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-[280px_1fr] gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">{t("modifiers.groups")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 p-2">
            {groups.length === 0 && (
              <p className="text-sm text-muted-foreground p-3">{t("modifiers.groups.empty")}</p>
            )}
            {groups.map((g) => (
              <button
                key={g.id}
                type="button"
                onClick={() => setSelectedGroupId(g.id)}
                className={`w-full text-left rounded-xl px-3 py-2.5 flex items-center gap-2 transition-colors ${
                  selectedGroupId === g.id ? "bg-primary/10 text-primary font-bold" : "hover:bg-muted/60"
                }`}
              >
                <GripVertical className="w-4 h-4 opacity-40 shrink-0" />
                <span className="truncate flex-1">{pickSourceText(g.name, primaryLang) || t("modifiers.group_fallback")}</span>
                {g.is_required && (
                  <span className="text-[9px] uppercase font-bold bg-destructive/10 text-destructive px-1.5 py-0.5 rounded">
                    {t("modifiers.required_short")}
                  </span>
                )}
              </button>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base">
              {selectedGroup ? pickSourceText(selectedGroup.name, primaryLang) : t("modifiers.select_group")}
            </CardTitle>
            {selectedGroup && (
              <div className="flex gap-1">
                <Button size="sm" variant="outline" onClick={() => openGroup(selectedGroup)}>
                  <Pencil className="w-3.5 h-3.5" />
                </Button>
                <Button size="sm" variant="destructive" onClick={() => deleteGroup(selectedGroup.id)}>
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            )}
          </CardHeader>
          <CardContent className="space-y-3">
            {selectedGroup && (
              <div className="flex flex-wrap gap-2 text-xs">
                <span className="px-2 py-1 rounded-full bg-muted font-semibold">
                  {t(MODIFIER_KIND_LABEL_KEY[selectedGroup.group_kind])}
                </span>
                {selectedGroup.group_kind !== "substitution" && selectedGroup.group_kind !== "extra" && (
                  <span className="px-2 py-1 rounded-full bg-muted font-semibold">{selectedGroup.selection_mode}</span>
                )}
                {selectedGroup.is_required && (
                  <span className="px-2 py-1 rounded-full bg-destructive/10 text-destructive font-semibold">{t("modifiers.required")}</span>
                )}
              </div>
            )}
            <Button size="sm" disabled={!selectedGroupId} onClick={() => openOption()} className="font-bold">
              <Plus className="w-4 h-4 mr-1" /> {t("modifiers.new_option")}
            </Button>
            <div className="space-y-2">
              {groupOptions.map((o) => (
                <div key={o.id} className="flex items-center gap-3 rounded-xl border px-3 py-2.5">
                  <div className="flex-1 min-w-0">
                    <p className="font-bold truncate">{pickSourceText(o.name, primaryLang)}</p>
                    <p className="text-xs text-muted-foreground">
                      {o.price_delta > 0 ? `+${Number(o.price_delta).toFixed(2)} €` : t("modifiers.no_extra_cost")}
                      {o.max_qty > 1 ? ` · ${panelT(lang, "modifiers.max_qty", { n: o.max_qty })}` : ""}
                    </p>
                  </div>
                  <Button size="icon" variant="ghost" onClick={() => openOption(o)}>
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Button size="icon" variant="ghost" className="text-destructive" onClick={() => deleteOption(o.id)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog open={groupDialog} onOpenChange={setGroupDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingGroup?.id ? t("modifiers.dialog.edit_group") : t("modifiers.dialog.new_group")}</DialogTitle>
          </DialogHeader>
          {editingGroup && (
            <div className="space-y-3">
              <div>
                <Label>{panelT(lang, "modifiers.field.name", { lang: LANG_LABELS[primaryLang] })}</Label>
                <Input
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>{t("modifiers.field.type")}</Label>
                <Select
                  value={editingGroup.group_kind || "choice"}
                  onValueChange={(v) => {
                    const kind = v as ModifierGroupKind;
                    const normalized = normalizeGroupKindSettings(kind, editingGroup.is_required ?? false);
                    setEditingGroup({
                      ...editingGroup,
                      group_kind: kind,
                      ...(normalized || {}),
                    });
                  }}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="choice">{t("modifiers.type.choice")}</SelectItem>
                    <SelectItem value="substitution">{t("modifiers.type.substitution")}</SelectItem>
                    <SelectItem value="removal">{t("modifiers.type.removal")}</SelectItem>
                    <SelectItem value="extra">{t("modifiers.type.extra")}</SelectItem>
                  </SelectContent>
                </Select>
                {editingGroup.group_kind && (
                  <p className="text-[11px] text-muted-foreground mt-1.5 leading-snug">
                    {t(MODIFIER_KIND_HINT_KEY[editingGroup.group_kind as ModifierGroupKind])}
                  </p>
                )}
              </div>
              {editingGroup.group_kind !== "substitution" && editingGroup.group_kind !== "extra" && (
                <div>
                  <Label>{t("modifiers.field.mode")}</Label>
                  <Select
                    value={editingGroup.selection_mode || "single"}
                    onValueChange={(v) => setEditingGroup({ ...editingGroup, selection_mode: v as SelectionMode })}
                    disabled={editingGroup.group_kind === "removal"}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="single">{t("modifiers.mode.single")}</SelectItem>
                      <SelectItem value="multiple">{t("modifiers.mode.multiple")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
              </div>
              <div className="grid grid-cols-2 gap-3">
                {editingGroup.group_kind !== "substitution" && editingGroup.group_kind !== "extra" && (
                  <>
                    <div>
                      <Label>{t("modifiers.field.min")}</Label>
                      <Input
                        type="number"
                        min={0}
                        value={editingGroup.min_select ?? 0}
                        onChange={(e) => setEditingGroup({ ...editingGroup, min_select: Number(e.target.value) })}
                      />
                    </div>
                    <div>
                      <Label>{t("modifiers.field.max")}</Label>
                      <Input
                        type="number"
                        min={1}
                        value={editingGroup.max_select ?? 1}
                        onChange={(e) => setEditingGroup({ ...editingGroup, max_select: Number(e.target.value) })}
                      />
                    </div>
                  </>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={editingGroup.is_required ?? false}
                  onCheckedChange={(c) => {
                    const kind = (editingGroup.group_kind || "choice") as ModifierGroupKind;
                    const normalized = normalizeGroupKindSettings(kind, c);
                    setEditingGroup({
                      ...editingGroup,
                      is_required: c,
                      ...(normalized || {}),
                    });
                  }}
                />
                <Label>{t("modifiers.required")}</Label>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button onClick={saveGroup} className="font-bold">{t("common.save")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={optionDialog} onOpenChange={setOptionDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingOption?.id ? t("modifiers.dialog.edit_option") : t("modifiers.dialog.new_option")}</DialogTitle>
          </DialogHeader>
          {editingOption && (
            <div className="space-y-3">
              <div>
                <Label>{panelT(lang, "modifiers.field.name", { lang: LANG_LABELS[primaryLang] })}</Label>
                <Input
                  value={optionName}
                  onChange={(e) => setOptionName(e.target.value)}
                />
              </div>
              <div>
                <Label>{t("modifiers.field.extra_price")}</Label>
                <Input
                  type="number"
                  step="0.01"
                  min={0}
                  value={editingOption.price_delta ?? 0}
                  onChange={(e) => setEditingOption({ ...editingOption, price_delta: Number(e.target.value) })}
                />
              </div>
              <div>
                <Label>{t("modifiers.field.max_qty")}</Label>
                <Input
                  type="number"
                  min={1}
                  max={99}
                  value={editingOption.max_qty ?? 1}
                  onChange={(e) => setEditingOption({ ...editingOption, max_qty: Number(e.target.value) })}
                />
              </div>
              {(selectedGroup?.group_kind === "choice" || selectedGroup?.group_kind === "substitution") && (
                <div className="flex items-center gap-2">
                  <Switch
                    checked={editingOption.is_default ?? false}
                    onCheckedChange={(c) => setEditingOption({ ...editingOption, is_default: c })}
                  />
                  <Label>{t("modifiers.default_option")}</Label>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button onClick={saveOption} className="font-bold">{t("common.save")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
