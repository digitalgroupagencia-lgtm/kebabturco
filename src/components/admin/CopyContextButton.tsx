import { Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

type Props = {
  /** Texto que será copiado para o clipboard. */
  text: string;
  label?: string;
  size?: "sm" | "default";
  variant?: "default" | "outline" | "ghost";
  className?: string;
};

export default function CopyContextButton({
  text,
  label = "Copiar detalhes",
  size = "sm",
  variant = "ghost",
  className,
}: Props) {
  const handleClick = async () => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Copiado para a área de transferência");
    } catch {
      toast.error("Não foi possível copiar");
    }
  };
  return (
    <Button
      type="button"
      size={size}
      variant={variant}
      onClick={handleClick}
      className={className}
      title="Copia este conteúdo para você colar onde quiser"
    >
      <Copy className="h-3.5 w-3.5 mr-1.5" />
      {label}
    </Button>
  );
}
