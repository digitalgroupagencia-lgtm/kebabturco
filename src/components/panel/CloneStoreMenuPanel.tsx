import { useMemo, useState } from "react";
import { Copy, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useAdminStorePicker } from "@/contexts/AdminStoreContext";
import { cloneStoreMenu } from "@/lib/cloneStoreMenu";
import { toast } from "sonner";

type Props = {
  targetStoreId: string;
  targetProductCount: number;
  onCloned: () => void;
};

export default function CloneStoreMenuPanel({
  targetStoreId,
  targetProductCount,
  onCloned,
}: Props) {
  const { stores } = useAdminStorePicker();
  const sources = useMemo(
    () => stores.filter((s) => s.id !== targetStoreId),
    [stores, targetStoreId],
  );
  const [sourceId, setSourceId] = useState(sources[0]?.id ?? "");
  const [busy, setBusy] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  if (sources.length === 0) return null;

  const sourceName = sources.find((s) => s.id === sourceId)?.name ?? "outra unidade";
  const targetName = stores.find((s) => s.id === targetStoreId)?.name ?? "esta unidade";

  const runClone = async (replaceExisting: boolean) => {
    if (!sourceId) {
      toast.error("Escolha a unidade de origem");
      return;
    }
    setBusy(true);
    try {
      const result = await cloneStoreMenu(sourceId, targetStoreId, {
        copyImages: true,
        replaceExisting,
      });
      toast.success(
        `Cardápio copiado: ${result.categories_copied} categorias, ${result.products_copied} produtos`,
      );
      onCloned();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao duplicar cardápio");
    } finally {
      setBusy(false);
      setConfirmOpen(false);
    }
  };

  return (
    <>
      <Card className="border-dashed border-primary/40 bg-primary/5">
        <CardContent className="p-4 space-y-3">
          <p className="text-sm font-semibold flex items-center gap-2">
            <Copy className="h-4 w-4 text-primary" />
            Duplicar cardápio para {targetName}
          </p>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Copia categorias, produtos, preços e personalizações de outra unidade. Depois de copiar,
            cada unidade é independente — alterar em {targetName} não muda {sourceName || "a origem"}.
          </p>
          <div className="flex flex-wrap items-end gap-2">
            <div className="space-y-1 min-w-[200px] flex-1">
              <p className="text-xs text-muted-foreground">Copiar de</p>
              <Select value={sourceId} onValueChange={setSourceId}>
                <SelectTrigger className="h-10 bg-background">
                  <SelectValue placeholder="Escolher unidade" />
                </SelectTrigger>
                <SelectContent>
                  {sources.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              type="button"
              disabled={busy || !sourceId}
              onClick={() => {
                if (targetProductCount > 0) setConfirmOpen(true);
                else void runClone(false);
              }}
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Duplicar cardápio
            </Button>
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Substituir cardápio existente?</AlertDialogTitle>
            <AlertDialogDescription>
              {targetName} já tem produtos. Ao continuar, o cardápio actual será apagado e substituído
              pela cópia de {sourceName}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Cancelar</AlertDialogCancel>
            <AlertDialogAction disabled={busy} onClick={() => void runClone(true)}>
              Substituir e copiar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
