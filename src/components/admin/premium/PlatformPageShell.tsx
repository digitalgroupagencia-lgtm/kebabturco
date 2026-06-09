import { cn } from "@/lib/utils";

type Props = {
  children: React.ReactNode;
  className?: string;
  /** Mantido por compatibilidade — ignorado. A largura agora é definida no layout pai. */
  width?: "default" | "wide" | "full";
};

/**
 * Casca de página interna. Não aplica largura/centralização própria:
 * o container único (max-w-[1400px], padding lateral, alinhamento à esquerda)
 * está nos layouts (AdminLayout / PanelLayout). Aqui apenas garantimos o
 * espaçamento vertical entre seções.
 */
export default function PlatformPageShell({ children, className }: Props) {
  return <div className={cn("w-full space-y-6", className)}>{children}</div>;
}
