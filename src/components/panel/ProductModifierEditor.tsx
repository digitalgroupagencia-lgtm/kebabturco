import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { groupKindLabel } from "@/lib/modifiers/groupKindMeta";
import { sortModifierGroups } from "@/lib/modifiers/groupOrder";
import type { ModifierGroupKind } from "@/lib/modifiers/types";
import { Link } from "react-router-dom";

type GroupLink = {
  group_id: string;
  sort_order: number;
  repeat_per_unit: boolean;
};

type StoreGroup = {
  id: string;
  name: Record<string, string>;
  group_kind: string;
  is_required: boolean;
};

type Props = {
  storeId: string;
  productId?: string;
  productType: "simple" | "combo";
  comboUnitCount: number;
  onProductTypeChange: (v: "simple" | "combo") => void;
  onComboUnitCountChange: (n: number) => void;
  onLinksChange: (links: GroupLink[]) => void;
};

export default function ProductModifierEditor({
  storeId,
  productId,
  productType,
  comboUnitCount,
  onProductTypeChange,
  onComboUnitCountChange,
  onLinksChange,
}: Props) {
  const [groups, setGroups] = useState<StoreGroup[]>([]);
  const [links, setLinks] = useState<GroupLink[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      const { data: gData } = await supabase
        .from("modifier_groups")
        .select("id, name, group_kind, is_required")
        .eq("store_id", storeId)
        .eq("is_active", true)
        .order("sort_order");
      if (!active) return;
      setGroups((gData || []) as StoreGroup[]);

      if (productId) {
        const { data: lData } = await supabase
          .from("product_modifier_groups")
          .select("group_id, sort_order, repeat_per_unit")
          .eq("product_id", productId)
          .order("sort_order");
        const loaded = (lData || []) as GroupLink[];
        setLinks(loaded);
        onLinksChange(loaded);
      } else {
        setLinks([]);
        onLinksChange([]);
      }
      setLoading(false);
    })();
    return () => { active = false; };
  }, [storeId, productId]);

  const toggleGroup = (groupId: string) => {
    const exists = links.find((l) => l.group_id === groupId);
    const next = exists
      ? links.filter((l) => l.group_id !== groupId)
      : [...links, { group_id: groupId, sort_order: links.length, repeat_per_unit: false }];
    setLinks(next);
    onLinksChange(next);
  };

  const toggleRepeat = (groupId: string) => {
    const next = links.map((l) =>
      l.group_id === groupId ? { ...l, repeat_per_unit: !l.repeat_per_unit } : l,
    );
    setLinks(next);
    onLinksChange(next);
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
        <Loader2 className="w-4 h-4 animate-spin" /> A carregar grupos…
      </div>
    );
  }

  return (
    <div className="space-y-4 rounded-xl border border-primary/20 bg-primary/5 p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-bold text-foreground">Personalização avançada</p>
        <Link to="/panel/modifiers" className="text-xs font-bold text-primary hover:underline">
          Gerir grupos →
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Tipo de produto</Label>
          <Select value={productType} onValueChange={(v) => onProductTypeChange(v as "simple" | "combo")}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="simple">Simples</SelectItem>
              <SelectItem value="combo">Combo / menu</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {productType === "combo" && (
          <div>
            <Label>Unidades no combo</Label>
            <Input
              type="number"
              min={1}
              max={20}
              value={comboUnitCount}
              onChange={(e) => onComboUnitCountChange(Math.max(1, Number(e.target.value) || 1))}
            />
          </div>
        )}
      </div>

      {groups.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          Cria grupos em Personalização: escolha, substituição, ingredientes ou extras.
        </p>
      ) : (
        <div className="space-y-2 max-h-56 overflow-y-auto">
          {sortModifierGroups(
            groups.map((g) => ({
              id: g.id,
              storeId: "",
              name: g.name,
              description: {},
              groupKind: g.group_kind as ModifierGroupKind,
              selectionMode: "single",
              minSelect: 0,
              maxSelect: 1,
              isRequired: g.is_required,
              sortOrder: 0,
              repeatPerUnit: false,
              linkSortOrder: 0,
              options: [],
            })),
          ).map((sorted) => {
            const g = groups.find((x) => x.id === sorted.id)!;
            const linked = links.find((l) => l.group_id === g.id);
            return (
              <div key={g.id} className="flex items-center gap-2 rounded-lg border bg-card px-3 py-2">
                <Switch checked={!!linked} onCheckedChange={() => toggleGroup(g.id)} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate">{g.name?.pt || g.name?.es}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {groupKindLabel(g.group_kind as ModifierGroupKind)}
                    {g.is_required ? " · obrigatório" : ""}
                  </p>
                </div>
                {linked && productType === "combo" && (
                  <label className="flex items-center gap-1 text-[10px] font-bold shrink-0" title="Repetir em cada unidade (ex.: cada pita)">
                    <Switch checked={linked.repeat_per_unit} onCheckedChange={() => toggleRepeat(g.id)} />
                    Por unidade
                  </label>
                )}
              </div>
            );
          })}
        </div>
      )}

      {productType === "combo" && links.length > 0 && (
        <p className="text-[11px] text-muted-foreground leading-snug">
          Bebida e substituições: liga sem «Por unidade». Carne, molho e ingredientes: liga com «Por unidade» para configurar cada pita/pizza.
        </p>
      )}
    </div>
  );
}

export async function saveProductModifierLinks(productId: string, links: GroupLink[]) {
  await supabase.from("product_modifier_groups").delete().eq("product_id", productId);
  if (!links.length) return;
  const { error } = await supabase.from("product_modifier_groups").insert(
    links.map((l, i) => ({
      product_id: productId,
      group_id: l.group_id,
      sort_order: i,
      repeat_per_unit: l.repeat_per_unit,
    })),
  );
  if (error) throw error;
}
