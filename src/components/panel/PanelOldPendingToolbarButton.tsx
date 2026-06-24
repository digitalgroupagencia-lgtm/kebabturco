import { useState } from "react";
import { ArchiveX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useStaffT } from "@/hooks/useStaffT";
import { usePanelStoreId } from "@/contexts/PanelStoreContext";
import OldPendingOrdersDialog from "@/components/panel/OldPendingOrdersDialog";

/** Botão «Pendentes antigos» na barra superior do painel (não junto ao sino). */
export default function PanelOldPendingToolbarButton() {
  const { t } = useStaffT();
  const { storeId } = usePanelStoreId();
  const [open, setOpen] = useState(false);

  if (!storeId) return null;

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="h-9 gap-1.5 px-2 text-xs font-bold shrink-0"
        onClick={() => setOpen(true)}
        title={t("live.old_pending.tooltip")}
      >
        <ArchiveX className="h-4 w-4 shrink-0" />
        <span className="hidden md:inline">{t("live.old_pending.btn")}</span>
      </Button>
      <OldPendingOrdersDialog open={open} onOpenChange={setOpen} storeId={storeId} />
    </>
  );
}
