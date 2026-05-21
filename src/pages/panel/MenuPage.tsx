import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAdminStoreId } from "@/hooks/useAdminStoreId";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, GripVertical, ImageIcon, Sparkles, Loader2 } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";

type Category = Tables<"categories">;
type Product = Tables<"products">;

const MenuPage = () => {
  const { storeId, loading: loadingStore } = useAdminStoreId();
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [genImageId, setGenImageId] = useState<string | null>(null);

  // Category form
  const [catDialogOpen, setCatDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [catNamePt, setCatNamePt] = useState("");
  const [catNameEn, setCatNameEn] = useState("");
  const [catImageUrl, setCatImageUrl] = useState("");

  // Product form
  const [prodDialogOpen, setProdDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [prodNamePt, setProdNamePt] = useState("");
  const [prodNameEn, setProdNameEn] = useState("");
  const [prodDescPt, setProdDescPt] = useState("");
  const [prodPrice, setProdPrice] = useState("");
  const [prodImageUrl, setProdImageUrl] = useState("");

  useEffect(() => {
    if (storeId) {
      fetchCategories();
    }
  }, [storeId]);

  useEffect(() => {
    if (selectedCategoryId && storeId) {
      fetchProducts(selectedCategoryId);
    }
  }, [selectedCategoryId, storeId]);

  const fetchCategories = async () => {
    if (!storeId) return;
    const { data, error } = await supabase
      .from("categories")
      .select("*")
      .eq("store_id", storeId)
      .order("sort_order");

    if (!error && data) {
      setCategories(data);
      if (data.length > 0 && !selectedCategoryId) {
        setSelectedCategoryId(data[0].id);
      }
    }
    setLoading(false);
  };

  const fetchProducts = async (categoryId: string) => {
    if (!storeId) return;
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .eq("store_id", storeId)
      .eq("category_id", categoryId)
      .order("sort_order");

    if (!error && data) {
      setProducts(data);
    }
  };

  // Category CRUD
  const openCatDialog = (cat?: Category) => {
    if (cat) {
      setEditingCategory(cat);
      const name = cat.name as Record<string, string>;
      setCatNamePt(name?.pt || "");
      setCatNameEn(name?.en || "");
      setCatImageUrl(cat.image_url || "");
    } else {
      setEditingCategory(null);
      setCatNamePt("");
      setCatNameEn("");
      setCatImageUrl("");
    }
    setCatDialogOpen(true);
  };

  const saveCategory = async () => {
    if (!storeId || !catNamePt.trim()) {
      toast.error("Nome da categoria é obrigatório");
      return;
    }

    const payload = {
      store_id: storeId,
      name: { pt: catNamePt.trim(), en: catNameEn.trim() } as unknown as import("@/integrations/supabase/types").Json,
      image_url: catImageUrl || null,
    };

    if (editingCategory) {
      const { error } = await supabase
        .from("categories")
        .update(payload)
        .eq("id", editingCategory.id);
      if (error) { toast.error("Erro ao atualizar categoria"); return; }
      toast.success("Categoria atualizada!");
    } else {
      const { error } = await supabase.from("categories").insert(payload);
      if (error) { toast.error("Erro ao criar categoria"); return; }
      toast.success("Categoria criada!");
    }

    setCatDialogOpen(false);
    fetchCategories();
  };

  const deleteCategory = async (id: string) => {
    const { error } = await supabase.from("categories").delete().eq("id", id);
    if (error) { toast.error("Erro ao excluir categoria"); return; }
    toast.success("Categoria excluída!");
    if (selectedCategoryId === id) setSelectedCategoryId(null);
    fetchCategories();
  };

  // Product CRUD
  const openProdDialog = (prod?: Product) => {
    if (prod) {
      setEditingProduct(prod);
      const name = prod.name as Record<string, string>;
      const desc = prod.description as Record<string, string> | null;
      setProdNamePt(name?.pt || "");
      setProdNameEn(name?.en || "");
      setProdDescPt(desc?.pt || "");
      setProdPrice(String(prod.price));
      setProdImageUrl(prod.image_url || "");
    } else {
      setEditingProduct(null);
      setProdNamePt("");
      setProdNameEn("");
      setProdDescPt("");
      setProdPrice("");
      setProdImageUrl("");
    }
    setProdDialogOpen(true);
  };

  const saveProduct = async () => {
    if (!storeId || !selectedCategoryId || !prodNamePt.trim()) {
      toast.error("Nome do produto é obrigatório");
      return;
    }

    const payload = {
      store_id: storeId,
      category_id: selectedCategoryId,
      name: { pt: prodNamePt.trim(), en: prodNameEn.trim() } as unknown as import("@/integrations/supabase/types").Json,
      description: { pt: prodDescPt.trim() } as unknown as import("@/integrations/supabase/types").Json,
      price: parseFloat(prodPrice) || 0,
      image_url: prodImageUrl || null,
    };

    if (editingProduct) {
      const { error } = await supabase
        .from("products")
        .update(payload)
        .eq("id", editingProduct.id);
      if (error) { toast.error("Erro ao atualizar produto"); return; }
      toast.success("Produto atualizado!");
    } else {
      const { error } = await supabase.from("products").insert(payload);
      if (error) { toast.error("Erro ao criar produto"); return; }
      toast.success("Produto criado!");
    }

    setProdDialogOpen(false);
    fetchProducts(selectedCategoryId);
  };

  const deleteProduct = async (id: string) => {
    const { error } = await supabase.from("products").delete().eq("id", id);
    if (error) { toast.error("Erro ao excluir produto"); return; }
    toast.success("Produto excluído!");
    if (selectedCategoryId) fetchProducts(selectedCategoryId);
  };

  const toggleProductActive = async (prod: Product) => {
    await supabase.from("products").update({ is_active: !prod.is_active }).eq("id", prod.id);
    if (selectedCategoryId) fetchProducts(selectedCategoryId);
  };

  const regenerateImage = async (prod: Product) => {
    setGenImageId(prod.id);
    try {
      const { data, error } = await supabase.functions.invoke("ai-product-image", {
        body: { product_id: prod.id, style: "realistic" },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success("Imagem gerada!");
      if (selectedCategoryId) fetchProducts(selectedCategoryId);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setGenImageId(null);
    }
  };

  if (loadingStore) {
    return <div className="p-8 text-muted-foreground flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" />Carregando cardápio...</div>;
  }

  if (!storeId) {
    return (
      <div className="space-y-4">
        <h2 className="text-2xl font-bold">Cardápio</h2>
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            Você não está associado a nenhuma loja. Peça ao administrador para vincular sua conta.
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Cardápio</h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Categories sidebar */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">Categorias</h3>
            <Dialog open={catDialogOpen} onOpenChange={setCatDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" variant="outline" onClick={() => openCatDialog()}>
                  <Plus className="h-4 w-4" />
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{editingCategory ? "Editar Categoria" : "Nova Categoria"}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>Nome (PT) *</Label>
                    <Input value={catNamePt} onChange={(e) => setCatNamePt(e.target.value)} placeholder="Ex: Hambúrgueres" />
                  </div>
                  <div>
                    <Label>Nome (EN)</Label>
                    <Input value={catNameEn} onChange={(e) => setCatNameEn(e.target.value)} placeholder="Ex: Burgers" />
                  </div>
                  <div>
                    <Label>URL da Imagem <span className="text-xs text-muted-foreground ml-1">(512×512 px, quadrada)</span></Label>
                    <Input value={catImageUrl} onChange={(e) => setCatImageUrl(e.target.value)} placeholder="https://..." />
                  </div>
                </div>
                <DialogFooter>
                  <DialogClose asChild>
                    <Button variant="outline">Cancelar</Button>
                  </DialogClose>
                  <Button onClick={saveCategory}>Salvar</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          {categories.map((cat) => {
            const name = cat.name as Record<string, string>;
            return (
              <div
                key={cat.id}
                className={`p-3 rounded-lg border cursor-pointer transition-colors group ${
                  selectedCategoryId === cat.id
                    ? "border-primary bg-primary/5"
                    : "hover:border-primary/50"
                }`}
                onClick={() => setSelectedCategoryId(cat.id)}
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium text-sm">{name?.pt || "Sem nome"}</span>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={(e) => { e.stopPropagation(); openCatDialog(cat); }} className="p-1 hover:bg-muted rounded">
                      <Pencil className="h-3 w-3" />
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); deleteCategory(cat.id); }} className="p-1 hover:bg-destructive/10 rounded text-destructive">
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}

          {categories.length === 0 && !loading && (
            <p className="text-sm text-muted-foreground text-center py-4">
              Nenhuma categoria. Crie a primeira!
            </p>
          )}
        </div>

        {/* Products */}
        <div className="lg:col-span-3 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">Produtos</h3>
            {selectedCategoryId && (
              <Dialog open={prodDialogOpen} onOpenChange={setProdDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" onClick={() => openProdDialog()}>
                    <Plus className="h-4 w-4 mr-1" /> Novo Produto
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>{editingProduct ? "Editar Produto" : "Novo Produto"}</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 max-h-[60vh] overflow-y-auto">
                    <div>
                      <Label>Nome (PT) *</Label>
                      <Input value={prodNamePt} onChange={(e) => setProdNamePt(e.target.value)} placeholder="Ex: Big Burger" />
                    </div>
                    <div>
                      <Label>Nome (EN)</Label>
                      <Input value={prodNameEn} onChange={(e) => setProdNameEn(e.target.value)} placeholder="Ex: Big Burger" />
                    </div>
                    <div>
                      <Label>Descrição (PT)</Label>
                      <Input value={prodDescPt} onChange={(e) => setProdDescPt(e.target.value)} placeholder="Descrição do produto" />
                    </div>
                    <div>
                      <Label>Preço (€)</Label>
                      <Input type="number" step="0.01" value={prodPrice} onChange={(e) => setProdPrice(e.target.value)} placeholder="0.00" />
                    </div>
                    <div>
                      <Label>URL da Imagem <span className="text-xs text-muted-foreground ml-1">(800×800 px, fundo neutro)</span></Label>
                      <Input value={prodImageUrl} onChange={(e) => setProdImageUrl(e.target.value)} placeholder="https://..." />
                    </div>
                  </div>
                  <DialogFooter>
                    <DialogClose asChild>
                      <Button variant="outline">Cancelar</Button>
                    </DialogClose>
                    <Button onClick={saveProduct}>Salvar</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}
          </div>

          {!selectedCategoryId ? (
            <Card>
              <CardContent className="p-8 text-center text-muted-foreground">
                Selecione uma categoria para ver os produtos
              </CardContent>
            </Card>
          ) : products.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center text-muted-foreground">
                Nenhum produto nesta categoria. Adicione o primeiro!
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {products.map((prod) => {
                const name = prod.name as Record<string, string>;
                return (
                  <Card key={prod.id} className={`overflow-hidden ${!prod.is_active ? "opacity-50" : ""}`}>
                    <div className="aspect-video bg-muted flex items-center justify-center relative">
                      {prod.image_url ? (
                        <img src={prod.image_url} alt={name?.pt} className="w-full h-full object-cover" />
                      ) : (
                        <ImageIcon className="h-10 w-10 text-muted-foreground/30" />
                      )}
                      {prod.is_bestseller && (
                        <span className="absolute top-2 left-2 bg-accent text-accent-foreground text-xs font-bold px-2 py-0.5 rounded">
                          ⭐ Best
                        </span>
                      )}
                    </div>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="font-semibold">{name?.pt || "Sem nome"}</h4>
                          <p className="text-lg font-bold text-primary">€ {Number(prod.price).toFixed(2)}</p>
                        </div>
                        <div className="flex gap-1">
                          <button onClick={() => openProdDialog(prod)} className="p-1.5 hover:bg-muted rounded">
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => regenerateImage(prod)}
                            disabled={genImageId === prod.id}
                            className="p-1.5 hover:bg-primary/10 rounded text-primary disabled:opacity-50"
                            title="Gerar imagem com IA"
                          >
                            {genImageId === prod.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                          </button>
                          <button onClick={() => toggleProductActive(prod)} className="p-1.5 hover:bg-muted rounded text-xs">
                            {prod.is_active ? "🟢" : "🔴"}
                          </button>
                          <button onClick={() => deleteProduct(prod.id)} className="p-1.5 hover:bg-destructive/10 rounded text-destructive">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MenuPage;
