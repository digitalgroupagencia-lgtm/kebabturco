import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { supabase as _supabaseRaw } from "@/integrations/supabase/client";
const supabase = _supabaseRaw as unknown as any;
import { useAdminStoreId } from "@/hooks/useAdminStoreId";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, GripVertical, ImageIcon, Sparkles, Loader2 } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";
import ProductModifierEditor, { saveProductModifierLinks } from "@/components/panel/ProductModifierEditor";
import MenuCustomizationAuditPanel from "@/components/panel/MenuCustomizationAuditPanel";
import MenuCatalogAuditPanel from "@/components/panel/MenuCatalogAuditPanel";
import PanelPageHeader from "@/components/panel/PanelPageHeader";
import ImageUploadField from "@/components/panel/ImageUploadField";
import { uploadProductImage } from "@/lib/uploadProductImage";
import { useStoreLanguages } from "@/hooks/useStoreLanguages";
import { LANG_LABELS } from "@/contexts/LanguageContext";
import {
  buildPrimaryLanguagePayload,
  pickLocalizedText,
  pickSourceText,
} from "@/lib/localizedText";

type Category = Tables<"categories">;
type Product = Tables<"products">;

const MenuPage = () => {
  const { pathname } = useLocation();
  const isAdminMenu = pathname.startsWith("/admin");
  const { storeId, loading: loadingStore } = useAdminStoreId();
  const { primaryLang, loading: loadingLangs } = useStoreLanguages(storeId);
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [genImageId, setGenImageId] = useState<string | null>(null);
  const [prodImageUploading, setProdImageUploading] = useState(false);

  // Category form
  const [catDialogOpen, setCatDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [catName, setCatName] = useState("");
  const [catImageUrl, setCatImageUrl] = useState("");

  // Product form
  const [prodDialogOpen, setProdDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [prodName, setProdName] = useState("");
  const [prodDesc, setProdDesc] = useState("");
  const [prodPrice, setProdPrice] = useState("");
  const [prodImageUrl, setProdImageUrl] = useState("");
  const [prodBestseller, setProdBestseller] = useState(false);
  const [prodPromo, setProdPromo] = useState(false);
  const [modifierLines, setModifierLines] = useState("");
  const [prodType, setProdType] = useState<"simple" | "combo">("simple");
  const [comboUnits, setComboUnits] = useState(1);
  const [modifierLinks, setModifierLinks] = useState<{ group_id: string; sort_order: number; repeat_per_unit: boolean }[]>([]);
  const [afterAddSuggestionIds, setAfterAddSuggestionIds] = useState("");

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

  useEffect(() => {
    const handleCreated = (event: Event) => {
      const categoryId = (event as CustomEvent<{ categoryId?: string }>).detail?.categoryId;
      void fetchCategories();
      if (categoryId) {
        setSelectedCategoryId(categoryId);
        void fetchProducts(categoryId);
      }
    };

    window.addEventListener("menu-catalog-audit-product-created", handleCreated);
    return () => window.removeEventListener("menu-catalog-audit-product-created", handleCreated);
  }, [storeId]);

  // Category CRUD
  const openCatDialog = (cat?: Category) => {
    if (cat) {
      setEditingCategory(cat);
      setCatName(pickSourceText(cat.name, primaryLang));
      setCatImageUrl(cat.image_url || "");
    } else {
      setEditingCategory(null);
      setCatName("");
      setCatImageUrl("");
    }
    setCatDialogOpen(true);
  };

  const saveCategory = async () => {
    if (!storeId) return;
    if (!catName.trim()) {
      toast.error(`Nome (${LANG_LABELS[primaryLang]}) é obrigatório`);
      return;
    }
    const namePayload = buildPrimaryLanguagePayload(editingCategory?.name, primaryLang, catName);

    const payload = {
      store_id: storeId,
      name: namePayload as unknown as import("@/integrations/supabase/types").Json,
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
      setProdName(pickSourceText(prod.name, primaryLang));
      setProdDesc(pickSourceText(prod.description, primaryLang));
      setProdPrice(String(prod.price));
      setProdImageUrl(prod.image_url || "");
      setProdBestseller(Boolean(prod.is_bestseller));
      setProdPromo(Boolean(prod.is_promo));
      const mods = Array.isArray(prod.price_modifiers) ? prod.price_modifiers : [];
      setModifierLines(
        mods.map((m: { name?: Record<string, string>; price?: number }, i: number) => {
          const label = pickLocalizedText(m.name, primaryLang) || `Extra ${i + 1}`;
          return `${label}|${m.price ?? 0}`;
        }).join("\n"),
      );
      const p = prod as Product & { product_type?: string; combo_unit_count?: number };
      setProdType(p.product_type === "combo" ? "combo" : "simple");
      setComboUnits(Math.max(1, p.combo_unit_count || 1));
      const suggestions = (prod as Product & { after_add_suggestions?: string[] }).after_add_suggestions;
      setAfterAddSuggestionIds(Array.isArray(suggestions) ? suggestions.join(", ") : "");
    } else {
      setEditingProduct(null);
      setProdName("");
      setProdDesc("");
      setProdPrice("");
      setProdImageUrl("");
      setProdBestseller(false);
      setProdPromo(false);
      setModifierLines("");
      setProdType("simple");
      setComboUnits(1);
      setModifierLinks([]);
      setAfterAddSuggestionIds("");
    }
    setProdDialogOpen(true);
  };

  const handleProductImageUpload = async (file: File) => {
    if (!storeId) {
      toast.error("Loja não carregada");
      return;
    }
    setProdImageUploading(true);
    try {
      const url = await uploadProductImage(storeId, file, editingProduct?.id);
      setProdImageUrl(url);
      toast.success("Imagem enviada");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao enviar imagem");
    } finally {
      setProdImageUploading(false);
    }
  };

  const saveProduct = async () => {
    if (!storeId || !selectedCategoryId) return;

    if (!prodName.trim()) {
      toast.error(`Nome (${LANG_LABELS[primaryLang]}) é obrigatório`);
      return;
    }

    const namePayload = buildPrimaryLanguagePayload(editingProduct?.name, primaryLang, prodName);
    const descriptionPayload = buildPrimaryLanguagePayload(editingProduct?.description, primaryLang, prodDesc);

    const priceModifiers = modifierLines
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line, index) => {
        const [namePart, pricePart] = line.split("|");
        const label = (namePart || "").trim();
        return {
          id: `mod-${index}`,
          name: { [primaryLang]: label },
          price: parseFloat(pricePart || "0") || 0,
        };
      });

    const payload = {
      store_id: storeId,
      category_id: selectedCategoryId,
      name: namePayload as unknown as import("@/integrations/supabase/types").Json,
      description: descriptionPayload as unknown as import("@/integrations/supabase/types").Json,
      price: parseFloat(prodPrice) || 0,
      image_url: prodImageUrl || null,
      is_bestseller: prodBestseller,
      is_promo: prodPromo,
      price_modifiers: priceModifiers as unknown as import("@/integrations/supabase/types").Json,
      product_type: prodType,
      combo_unit_count: prodType === "combo" ? comboUnits : 0,
      after_add_suggestions: afterAddSuggestionIds
        .split(/[,\s]+/)
        .map((id) => id.trim())
        .filter(Boolean) as unknown as import("@/integrations/supabase/types").Json,
    };

    if (editingProduct) {
      const { error } = await supabase
        .from("products")
        .update(payload)
        .eq("id", editingProduct.id);
      if (error) { toast.error("Erro ao atualizar produto"); return; }
      try {
        await saveProductModifierLinks(editingProduct.id, modifierLinks);
      } catch {
        toast.error("Produto guardado, mas falhou ao ligar grupos");
      }
      toast.success("Produto atualizado!");
    } else {
      const { data: inserted, error } = await supabase.from("products").insert(payload).select("id").single();
      if (error) { toast.error("Erro ao criar produto"); return; }
      if (inserted?.id && modifierLinks.length) {
        try {
          await saveProductModifierLinks(inserted.id, modifierLinks);
        } catch {
          toast.error("Produto criado, mas falhou ao ligar grupos");
        }
      }
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

  if (loadingStore || loadingLangs) {
    return <div className="p-8 text-muted-foreground flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" />Carregando cardápio...</div>;
  }

  if (!storeId) {
    return (
      <div className="space-y-4">
        <h2 className="text-2xl font-bold">Cardápio</h2>
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            Nenhuma unidade activa encontrada para editar o cardápio. Verifique em Administração → Unidades se Gandia e Playa Gandia estão activas.
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PanelPageHeader
        title="Cardápio"
        description="Edite categorias, produtos, preços e imagens. Todas as opções usadas em combos devem existir aqui."
      />

      {isAdminMenu && (
        <>
          <MenuCatalogAuditPanel />
          <MenuCustomizationAuditPanel />
        </>
      )}

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
                    <Label>Nome ({LANG_LABELS[primaryLang]})</Label>
                    <Input
                      value={catName}
                      onChange={(e) => setCatName(e.target.value)}
                      placeholder="Ex.: Pizzas"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Idioma principal do restaurante. Traduções para o cliente são automáticas.
                    </p>
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
                className={`p-2 rounded-lg border cursor-pointer transition-colors group ${
                  selectedCategoryId === cat.id
                    ? "border-primary bg-primary/5"
                    : "hover:border-primary/50"
                }`}
                onClick={() => setSelectedCategoryId(cat.id)}
              >
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded-md overflow-hidden bg-muted flex items-center justify-center shrink-0 border">
                    {cat.image_url ? (
                      <img src={cat.image_url} alt={name?.pt || ""} className="w-full h-full object-cover" />
                    ) : (
                      <ImageIcon className="h-4 w-4 text-muted-foreground/40" />
                    )}
                  </div>
                  <span className="font-medium text-sm flex-1 min-w-0 truncate">
                    {pickLocalizedText(name, primaryLang) || "Sem nome"}
                  </span>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
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
                      <Label>Nome ({LANG_LABELS[primaryLang]})</Label>
                      <Input
                        value={prodName}
                        onChange={(e) => setProdName(e.target.value)}
                        placeholder="Ex.: Kebab mixto"
                      />
                    </div>
                    <div>
                      <Label>Descrição ({LANG_LABELS[primaryLang]})</Label>
                      <Textarea
                        value={prodDesc}
                        onChange={(e) => setProdDesc(e.target.value)}
                        placeholder="Ingredientes principais…"
                        rows={3}
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Escreva só no idioma principal. O sistema traduz para os idiomas activos no totem.
                      </p>
                    </div>
                    <div>
                      <Label>Preço (€)</Label>
                      <Input type="number" step="0.01" value={prodPrice} onChange={(e) => setProdPrice(e.target.value)} placeholder="0.00" />
                    </div>
                    <ImageUploadField
                      label="Imagem do produto"
                      dimensions="800×800 px, fundo neutro"
                      value={prodImageUrl}
                      uploading={prodImageUploading}
                      disabled={!storeId}
                      onPickFile={handleProductImageUpload}
                    />
                    <div className="flex items-center justify-between">
                      <Label>⭐ Mais vendido</Label>
                      <Switch checked={prodBestseller} onCheckedChange={setProdBestseller} />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label>🏷️ Em promoção</Label>
                      <Switch checked={prodPromo} onCheckedChange={setProdPromo} />
                    </div>
                    <ProductModifierEditor
                      storeId={storeId!}
                      productId={editingProduct?.id}
                      productType={prodType}
                      comboUnitCount={comboUnits}
                      onProductTypeChange={setProdType}
                      onComboUnitCountChange={setComboUnits}
                      onLinksChange={setModifierLinks}
                    />
                    <div>
                      <Label>Sugestões após adicionar (IDs de produto, separados por vírgula)</Label>
                      <Input
                        value={afterAddSuggestionIds}
                        onChange={(e) => setAfterAddSuggestionIds(e.target.value)}
                        placeholder="uuid-bebida, uuid-sobremesa"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Opcional. Ex.: kebab → bebidas; combo → sobremesa. Deixe vazio para regra automática.
                      </p>
                    </div>
                    <div>
                      <Label>Extras legado (1 por linha: Nome|preço)</Label>
                      <textarea
                        value={modifierLines}
                        onChange={(e) => setModifierLines(e.target.value)}
                        placeholder={"Sin cebolla|0\nExtra queso|1\nCarne extra|2"}
                        rows={4}
                        className="w-full rounded-md border px-3 py-2 text-sm font-mono"
                      />
                      <p className="text-xs text-muted-foreground mt-1">Use grupos acima para personalização profissional. Isto é fallback antigo.</p>
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
                      {prod.is_promo && (
                        <span className="absolute top-2 right-2 bg-destructive text-destructive-foreground text-xs font-bold px-2 py-0.5 rounded">
                          Oferta
                        </span>
                      )}
                    </div>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="font-semibold">{pickLocalizedText(name, primaryLang) || "Sem nome"}</h4>
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
