import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

type Props = {
  /** Pergunta já formatada para enviar à IA. */
  question: string;
  /** Se true, manda automático; se false, só preenche o input para revisão. */
  autoSend?: boolean;
  /** Texto do botão. Default: "Perguntar ao Assistente IA". */
  label?: string;
  size?: "sm" | "default";
  variant?: "default" | "outline" | "ghost";
  className?: string;
};

/**
 * Botão didático que abre o Assistente IA com uma pergunta pré-preenchida.
 * Use sempre dentro de /admin/* ou /panel/*. NUNCA expor para clientes finais.
 */
export default function AskAssistantButton({
  question,
  autoSend = true,
  label = "Perguntar ao Assistente IA",
  size = "sm",
  variant = "outline",
  className,
}: Props) {
  const handleClick = () => {
    window.dispatchEvent(
      new CustomEvent("assistant:ask", { detail: { text: question, autoSend } }),
    );
  };
  return (
    <Button
      type="button"
      size={size}
      variant={variant}
      onClick={handleClick}
      className={className}
      title="Abre o chat da IA com este contexto e pede instruções passo-a-passo"
    >
      <Sparkles className="h-3.5 w-3.5 mr-1.5" />
      {label}
    </Button>
  );
}
