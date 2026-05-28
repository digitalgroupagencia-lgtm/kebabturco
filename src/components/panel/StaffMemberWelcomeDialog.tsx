import { Copy, MessageCircle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  buildStaffOnboardingSummary,
  buildStaffOnboardingWhatsAppUrl,
  type StaffOnboardingInput,
} from "@/lib/staffOnboardingGuide";

type Props = {
  open: boolean;
  data: StaffOnboardingInput | null;
  onOpenChange: (open: boolean) => void;
  mode?: "create" | "review";
};

const StaffMemberWelcomeDialog = ({ open, data, onOpenChange, mode = "create" }: Props) => {
  if (!data) return null;

  const summary = buildStaffOnboardingSummary(data);
  const isEs = data.lang === "es";
  const title =
    mode === "review"
      ? isEs
        ? "Instrucciones para el miembro"
        : "Instruções para o membro"
      : isEs
        ? "Resumen para el nuevo miembro"
        : "Resumo para o novo membro";

  const copyAll = async () => {
    try {
      await navigator.clipboard.writeText(summary);
      toast.success(isEs ? "¡Copiado!" : "Copiado!");
    } catch {
      toast.error(isEs ? "No se pudo copiar" : "Não foi possível copiar");
    }
  };

  const shareWhatsApp = () => {
    window.open(buildStaffOnboardingWhatsAppUrl(summary), "_blank", "noopener,noreferrer");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            {isEs
              ? "Copie o envíe por WhatsApp. Incluye correo, contraseña y guía según el perfil."
              : "Copie ou envie por WhatsApp. Inclui e-mail, senha e guia conforme o perfil."}
          </DialogDescription>
        </DialogHeader>

        <pre className="flex-1 overflow-y-auto rounded-xl border bg-muted/30 p-3 text-xs leading-relaxed whitespace-pre-wrap font-sans">
          {summary}
        </pre>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button type="button" variant="outline" className="w-full sm:w-auto" onClick={() => void copyAll()}>
            <Copy className="w-4 h-4 mr-2" />
            {isEs ? "Copiar todo" : "Copiar tudo"}
          </Button>
          <Button type="button" className="w-full sm:w-auto bg-[#25D366] hover:bg-[#20bd5a] text-white" onClick={shareWhatsApp}>
            <MessageCircle className="w-4 h-4 mr-2" />
            WhatsApp
          </Button>
          <Button type="button" variant="secondary" className="w-full sm:w-auto" onClick={() => onOpenChange(false)}>
            {isEs ? "Cerrar" : "Fechar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default StaffMemberWelcomeDialog;
