import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSellerContext } from "@/hooks/useSellerContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Loader2, ArrowLeft, Plus, Minus, ShoppingCart, Trash2, Search, Send } from "lucide-react";
import { toast } from "sonner";
import { fmtMoney } from "@/hooks/useTenantBilling";

interface Line { product_id: string; product_name: string; unit_price: number; quantity: number; }

const pickName = (n: any) => (typeof n === "object" && n) ? (n.pt || n.es || n.en || Object.values(n)[0]) : String(n ?? "");

const SellerNewOrder = () => {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { storeId, userId } = useSellerContext();
  const qc = useQueryClient();

  const [tableNumber, setTableNumber] = useState(params.get("table") ?? "");
  const [customerName, setCustomerName] = useState(params.get("customer") ?? "");
  const [notes, setNotes] = useState("");
  const [search, setSearch] = useState("");
  const [lines, setLines] = useState<Line[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [openCart, setOpenCart] = useState(false);

  // Categorias e produtos
  const { data, isLoading } = useQuery({
    queryKey: ["seller-menu", storeId],
    enabled: !!storeId,
    queryFn: async () => {
      const [{ data: cats }, { data: prods }] = await Promise.all([
        supabase.from("categories").select("id, name, sort_order").eq("store_id", storeId!).eq("is_active", true).order("sort_order"),
        supabase.from("products").select("id, name, price, image_url, category_id, sort_order").eq("store_id", storeId!).eq("is_active", true).order("sort_order"),
      ]);
      return { cats: cats ?? [], prods: prods ?? [] };
    },
  });

  const [activeCat, setActiveCat] = useState<string | null>(null);
  useEffect(() => { if (!activeCat && data?.cats?.[0]) setActiveCat(data.cats[0].id); }, [data, activeCat]);

  const filteredProds = useMemo(() => {
    if (!data) return [];
    const term = search.trim().toLowerCase();
    return data.prods.filter((p: any) => {
      const name = pickName(p.name).toLowerCase();
      if (term) return name.includes(term);
      return p.category_id === activeCat;
    });
  }, [data, activeCat, search]);

  const total = lines.reduce((s, l) => s + l.unit_price * l.quantity, 0);
  const totalQty = lines.reduce((s, l) => s + l.quantity, 0);

  const addLine = (p: any) => {
    const name = pickName(p.name);
    setLines((prev) => {
      const i = prev.findIndex((l) => l.product_id === p.id);
      if (i >= 0) {
        const cp = [...prev]; cp[i] = { ...cp[i], quantity: cp[i].quantity + 1 }; return cp;
      }
      return [...prev, { product_id: p.id, product_name: name, unit_price: Number(p.price || 0), quantity: 1 }];
    });
  };
  const setQty = (id: string, q: number) => {
    setLines((prev) => q <= 0 ? prev.filter((l) => l.product_id !== id) : prev.map((l) => l.product_id === id ? { ...l, quantity: q } : l));
  };

  const submit = async () => {
    if (!tableNumber.trim()) return toast.error("Informe a mesa");
    if (!customerName.trim()) return toast.error("Informe o cliente");
    if (lines.length === 0) return toast.error("Adicione ao menos 1 item");
    if (!storeId) return;
    setSubmitting(true);
    try {
      const { data: res, error } = await supabase.rpc("create_seller_order", {
        _store_id: storeId,
        _table_number: tableNumber.trim(),
        _customer_name: customerName.trim(),
        _items: lines.map((l) => ({
          product_id: l.product_id,
          product_name: l.product_name,
          quantity: l.quantity,
          unit_price: l.unit_price,
        })),
        _notes: notes.trim() || null,
      });
      if (error) throw error;
      const out = res as any;
      // Tenta imprimir (silencioso se falhar)
      try {
        await supabase.functions.invoke("print-order", {
          body: {
            storeId,
            orderNumber: out.order_number,
            customerName: customerName.trim(),
            tableNumber: tableNumber.trim(),
            orderType: "here",
            paymentMethod: "Pendente (mesa)",
            paymentPending: true,
            notes: notes.trim() || null,
            items: lines.map((l) => ({
              productName: l.product_name, quantity: l.quantity,
              unitPrice: l.unit_price, totalPrice: l.unit_price * l.quantity,
              extras: [], removed: [],
            })),
            total: out.total,
          },
        });
      } catch {}
      toast.success(`Pedido #${out.order_number} enviado!`);
      qc.invalidateQueries({ queryKey: ["open-tables"] });
      qc.invalidateQueries({ queryKey: ["my-orders"] });
      qc.invalidateQueries({ queryKey: ["seller-today"] });
      navigate(`/seller/tables/${out.session_id}`);
    } catch (e: any) {
      toast.error(e.message ?? "Falha ao enviar pedido");
    } finally { setSubmitting(false); }
  };

  return (
    <div className="flex flex-col min-h-[calc(100dvh-7rem)]">
      <div className="p-3 space-y-2 sticky top-0 z-10 bg-background border-b border-border">
        <button onClick={() => navigate(-1)} className="text-xs flex items-center gap-1 text-muted-foreground"><ArrowLeft className="w-3 h-3" /> Voltar</button>
        <div className="grid grid-cols-2 gap-2">
          <Input value={tableNumber} onChange={(e) => setTableNumber(e.target.value)} placeholder="Mesa" inputMode="numeric" className="h-10" />
          <Input value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="Cliente" className="h-10" />
        </div>
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar produto…" className="pl-8 h-10" />
        </div>
        {!search && (
          <div className="flex gap-1.5 overflow-x-auto -mx-1 px-1 pb-1">
            {data?.cats?.map((c: any) => (
              <button key={c.id} onClick={() => setActiveCat(c.id)} className={`shrink-0 px-3 h-8 rounded-full text-xs font-bold border ${activeCat === c.id ? "bg-primary text-primary-foreground border-primary" : "bg-card text-muted-foreground border-border"}`}>
                {pickName(c.name)}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="flex-1 p-3 pb-24">
        {isLoading ? (
          <div className="flex justify-center p-6"><Loader2 className="w-6 h-6 animate-spin" /></div>
        ) : filteredProds.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">Nenhum produto.</p>
        ) : (
          <div className="space-y-2">
            {filteredProds.map((p: any) => {
              const inCart = lines.find((l) => l.product_id === p.id);
              return (
                <Card key={p.id}>
                  <CardContent className="p-2 flex items-center gap-2">
                    {p.image_url ? <img src={p.image_url} alt="" className="w-12 h-12 rounded-md object-cover shrink-0" /> : <div className="w-12 h-12 rounded-md bg-muted shrink-0" />}
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-sm truncate">{pickName(p.name)}</p>
                      <p className="text-xs text-cta font-black">{fmtMoney(Number(p.price || 0))}</p>
                    </div>
                    {inCart ? (
                      <div className="flex items-center gap-1 shrink-0">
                        <Button size="icon" variant="outline" className="h-8 w-8" onClick={() => setQty(p.id, inCart.quantity - 1)}><Minus className="w-3 h-3" /></Button>
                        <span className="w-5 text-center text-sm font-black">{inCart.quantity}</span>
                        <Button size="icon" className="h-8 w-8" onClick={() => setQty(p.id, inCart.quantity + 1)}><Plus className="w-3 h-3" /></Button>
                      </div>
                    ) : (
                      <Button size="icon" className="h-9 w-9 shrink-0 bg-cta hover:bg-cta/90 text-white" onClick={() => addLine(p)}><Plus className="w-4 h-4" /></Button>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Carrinho fixo */}
      <div className="fixed bottom-16 inset-x-0 z-30 px-3" style={{ paddingBottom: "max(0px,env(safe-area-inset-bottom))" }}>
        <Sheet open={openCart} onOpenChange={setOpenCart}>
          <SheetTrigger asChild>
            <Button className="w-full h-12 bg-cta hover:bg-cta/90 text-white font-black flex items-center justify-between" disabled={lines.length === 0}>
              <span className="flex items-center gap-2"><ShoppingCart className="w-4 h-4" /> {totalQty} item(ns)</span>
              <span>{fmtMoney(total)}</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="bottom" className="max-h-[85dvh] flex flex-col">
            <SheetHeader><SheetTitle>Resumo do pedido</SheetTitle></SheetHeader>
            <div className="flex-1 overflow-y-auto py-3 space-y-2">
              {lines.map((l) => (
                <div key={l.product_id} className="flex items-center gap-2 border-b border-border pb-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm truncate">{l.product_name}</p>
                    <p className="text-xs text-muted-foreground">{fmtMoney(l.unit_price)} un</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button size="icon" variant="outline" className="h-7 w-7" onClick={() => setQty(l.product_id, l.quantity - 1)}><Minus className="w-3 h-3" /></Button>
                    <span className="w-5 text-center text-sm font-black">{l.quantity}</span>
                    <Button size="icon" variant="outline" className="h-7 w-7" onClick={() => setQty(l.product_id, l.quantity + 1)}><Plus className="w-3 h-3" /></Button>
                  </div>
                  <p className="font-black text-sm w-16 text-right">{fmtMoney(l.unit_price * l.quantity)}</p>
                  <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => setQty(l.product_id, 0)}><Trash2 className="w-3 h-3" /></Button>
                </div>
              ))}
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Observações (opcional)" className="text-sm" />
            </div>
            <div className="border-t border-border pt-3 space-y-2">
              <div className="flex justify-between font-black"><span>Total</span><span className="text-cta">{fmtMoney(total)}</span></div>
              <Button onClick={submit} disabled={submitting} className="w-full h-12 bg-primary text-primary-foreground font-black">
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Send className="w-4 h-4 mr-1" /> Enviar para cozinha</>}
              </Button>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </div>
  );
};

export default SellerNewOrder;