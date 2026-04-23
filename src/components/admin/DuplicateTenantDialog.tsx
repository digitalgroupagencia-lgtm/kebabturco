import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Copy, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface Props {
  sourceTenantId: string;
  sourceName: string;
  trigger?: React.ReactNode;
}

export default function DuplicateTenantDialog({ sourceTenantId, sourceName, trigger }: Props) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(`${sourceName} (cópia)`);
  const [slug, setSlug] = useState("");
  const [copyProducts, setCopyProducts] = useState(true);
  const [copyImages, setCopyImages] = useState(true);
  const [copyBanners, setCopyBanners] = useState(false);
  const qc = useQueryClient();
  const navigate = useNavigate();

  const dup = useMutation({
    mutationFn: async () => {
      if (!name.trim() || !slug.trim()) throw new Error("Informe nome e slug");
      const { data, error } = await supabase.rpc("duplicate_tenant", {
        _source_tenant_id: sourceTenantId,
        _new_name: name.trim(),
        _new_slug: slug.trim().toLowerCase().replace(/[^a-z0-9-]/g, "-"),
        _copy_products: copyProducts,
        _copy_images: copyImages,
        _copy_banners: copyBanners,
      });
      if (error) throw error;
      return data as { tenant_id: string; categories_copied?: number; products_copied?: number };
    },
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ["admin-tenants"] });
      toast.success(`Cliente duplicado! ${res.categories_copied ?? 0} categorias, ${res.products_copied ?? 0} produtos.`);
      setOpen(false);
      navigate(`/admin/tenants/${slug.trim().toLowerCase().replace(/[^a-z0-9-]/g, "-")}`);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button variant="outline" size="sm" className="gap-1.5">
            <Copy className="w-3.5 h-3.5" /> Duplicar
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Duplicar estrutura de "{sourceName}"</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Nome do novo cliente</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <Label>Slug</Label>
            <Input value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="novo-restaurante" />
          </div>
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm">Copiar produtos</Label>
              <Switch checked={copyProducts} onCheckedChange={setCopyProducts} />
            </div>
            <div className="flex items-center justify-between">
              <Label className="text-sm">Copiar imagens (logos, fotos)</Label>
              <Switch checked={copyImages} onCheckedChange={setCopyImages} />
            </div>
            <div className="flex items-center justify-between">
              <Label className="text-sm">Copiar banners promocionais</Label>
              <Switch checked={copyBanners} onCheckedChange={setCopyBanners} />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Identidade visual, configurações de pagamento, fluxo do totem e categorias são sempre copiadas.
          </p>
          <Button className="w-full" onClick={() => dup.mutate()} disabled={dup.isPending}>
            {dup.isPending ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Duplicando…</> : "Duplicar agora"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}