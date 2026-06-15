import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { useStaffT } from "@/hooks/useStaffT";
import { panelT } from "@/lib/staffPanelLocale";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Package, Plus, Pencil, Trash2, AlertTriangle, ArrowUpDown } from "lucide-react";
import HowToUsePanel from "@/components/admin/HowToUsePanel";
import PremiumPageHeader from "@/components/admin/premium/PremiumPageHeader";
import type { Tables } from "@/integrations/supabase/types";

type StockItem = Tables<"stock_items">;

const StockPage = () => {
  const { t, lang } = useStaffT();
  const { user } = useAuth();
  const { roleData } = useUserRole(user?.id);
  const storeId = roleData?.store_id;

  const [items, setItems] = useState<StockItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<StockItem | null>(null);

  const [name, setName] = useState("");
  const [unit, setUnit] = useState("un");
  const [currentQty, setCurrentQty] = useState("");
  const [minQty, setMinQty] = useState("");

  const [adjustItem, setAdjustItem] = useState<StockItem | null>(null);
  const [adjustQty, setAdjustQty] = useState("");

  useEffect(() => {
    if (storeId) fetchItems();
  }, [storeId]);

  const fetchItems = async () => {
    if (!storeId) return;
    const { data, error } = await supabase
      .from("stock_items")
      .select("*")
      .eq("store_id", storeId)
      .order("name");
    if (!error && data) setItems(data);
    setLoading(false);
  };

  const openDialog = (item?: StockItem) => {
    if (item) {
      setEditing(item);
      setName(item.name);
      setUnit(item.unit);
      setCurrentQty(String(item.current_qty));
      setMinQty(String(item.min_qty ?? 0));
    } else {
      setEditing(null);
      setName("");
      setUnit("un");
      setCurrentQty("0");
      setMinQty("0");
    }
    setDialogOpen(true);
  };

  const save = async () => {
    if (!storeId || !name.trim()) {
      toast.error(t("stock.toast.name_required"));
      return;
    }
    const payload = {
      store_id: storeId,
      name: name.trim(),
      unit,
      current_qty: parseFloat(currentQty) || 0,
      min_qty: parseFloat(minQty) || 0,
    };

    if (editing) {
      const { error } = await supabase.from("stock_items").update(payload).eq("id", editing.id);
      if (error) { toast.error(t("stock.toast.update_error")); return; }
      toast.success(t("stock.toast.updated"));
    } else {
      const { error } = await supabase.from("stock_items").insert(payload);
      if (error) { toast.error(t("stock.toast.create_error")); return; }
      toast.success(t("stock.toast.created"));
    }
    setDialogOpen(false);
    fetchItems();
  };

  const deleteItem = async (id: string) => {
    const { error } = await supabase.from("stock_items").delete().eq("id", id);
    if (error) { toast.error(t("stock.toast.delete_error")); return; }
    toast.success(t("stock.toast.deleted"));
    fetchItems();
  };

  const adjustStock = async () => {
    if (!adjustItem) return;
    const newQty = Number(adjustItem.current_qty) + (parseFloat(adjustQty) || 0);
    const { error } = await supabase
      .from("stock_items")
      .update({ current_qty: newQty })
      .eq("id", adjustItem.id);
    if (error) { toast.error(t("stock.toast.adjust_error")); return; }
    toast.success(t("stock.toast.adjusted"));
    setAdjustItem(null);
    setAdjustQty("");
    fetchItems();
  };

  const lowStockItems = items.filter(
    (i) => i.min_qty !== null && Number(i.current_qty) <= Number(i.min_qty)
  );

  if (!storeId) {
    return (
      <div className="space-y-4">
        <h2 className="text-2xl font-bold">{t("page.stock.title")}</h2>
        <Card><CardContent className="p-8 text-center text-muted-foreground">{t("common.no_store")}</CardContent></Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <HowToUsePanel
        purpose={t("howto.stock.purpose")}
        whenToUse={t("howto.stock.when")}
        steps={[t("howto.stock.step1"), t("howto.stock.step2"), t("howto.stock.step3")]}
        howToConfirm={t("howto.stock.confirm")}
        assistantQuestion={t("howto.stock.assistant")}
      />
      <PremiumPageHeader
        icon={Package}
        title={t("page.stock.title")}
        subtitle={t("stock.subtitle")}
        actions={
          <Button size="sm" onClick={() => openDialog()} className="h-9">
            <Plus className="h-4 w-4 mr-1" /> {t("stock.new")}
          </Button>
        }
      />

      {lowStockItems.length > 0 && (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              <span className="font-semibold text-destructive">
                {panelT(lang, "stock.low_alert", { count: lowStockItems.length })}
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {lowStockItems.map((i) => (
                <Badge key={i.id} variant="destructive">{i.name}: {Number(i.current_qty)} {i.unit}</Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("stock.col.item")}</TableHead>
                <TableHead>{t("stock.col.qty")}</TableHead>
                <TableHead>{t("stock.col.min")}</TableHead>
                <TableHead>{t("stock.col.unit")}</TableHead>
                <TableHead>{t("stock.col.status")}</TableHead>
                <TableHead className="text-right">{t("stock.col.actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => {
                const isLow = item.min_qty !== null && Number(item.current_qty) <= Number(item.min_qty);
                return (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.name}</TableCell>
                    <TableCell className={isLow ? "text-destructive font-bold" : ""}>{Number(item.current_qty)}</TableCell>
                    <TableCell className="text-muted-foreground">{Number(item.min_qty ?? 0)}</TableCell>
                    <TableCell>{item.unit}</TableCell>
                    <TableCell>
                      {isLow ? (
                        <Badge variant="destructive">{t("stock.badge.low")}</Badge>
                      ) : (
                        <Badge variant="secondary">OK</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button size="icon" variant="ghost" onClick={() => { setAdjustItem(item); setAdjustQty(""); }}>
                          <ArrowUpDown className="h-4 w-4" />
                        </Button>
                        <Button size="icon" variant="ghost" onClick={() => openDialog(item)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button size="icon" variant="ghost" className="text-destructive" onClick={() => deleteItem(item.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
              {items.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    {t("stock.empty")}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? t("stock.dialog.edit") : t("stock.dialog.new")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>{t("stock.field.name")}</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder={t("stock.field.name.ph")} />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label>{t("stock.field.unit")}</Label>
                <Input value={unit} onChange={(e) => setUnit(e.target.value)} placeholder={t("stock.field.unit.ph")} />
              </div>
              <div>
                <Label>{t("stock.col.qty")}</Label>
                <Input type="number" value={currentQty} onChange={(e) => setCurrentQty(e.target.value)} />
              </div>
              <div>
                <Label>{t("stock.col.min")}</Label>
                <Input type="number" value={minQty} onChange={(e) => setMinQty(e.target.value)} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild><Button variant="outline">{t("common.cancel")}</Button></DialogClose>
            <Button onClick={save}>{t("common.save")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!adjustItem} onOpenChange={(open) => !open && setAdjustItem(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{panelT(lang, "stock.adjust.title", { name: adjustItem?.name ?? "" })}</DialogTitle>
          </DialogHeader>
          <div>
            <Label>{t("stock.adjust.label")}</Label>
            <Input type="number" value={adjustQty} onChange={(e) => setAdjustQty(e.target.value)} placeholder={t("stock.adjust.ph")} />
            {adjustItem && (
              <p className="text-sm text-muted-foreground mt-2">
                {panelT(lang, "stock.adjust.preview", {
                  current: Number(adjustItem.current_qty),
                  next: Number(adjustItem.current_qty) + (parseFloat(adjustQty) || 0),
                })}
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAdjustItem(null)}>{t("common.cancel")}</Button>
            <Button onClick={adjustStock}>{t("common.confirm")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default StockPage;
