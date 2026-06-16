import { useEffect } from "react";
import type { ReactNode } from "react";
import { useStaffScreenHelp, type StaffScreenHelpContent } from "@/contexts/StaffScreenHelpContext";

type Step = string | { title: string; detail?: string };

type Props = {
  title?: string;
  purpose: string;
  whenToUse?: string;
  steps?: Step[];
  howToConfirm?: string;
  assistantQuestion?: string;
  children?: ReactNode;
  /** @deprecated Mantido por compatibilidade — o conteúdo abre no ícone da barra superior. */
  defaultOpen?: boolean;
};

/** Regista ajuda da página no ícone «?» da barra superior (não renderiza faixa no conteúdo). */
export default function HowToUsePanel({
  title,
  purpose,
  whenToUse,
  steps,
  howToConfirm,
  assistantQuestion,
  children,
}: Props) {
  const { setHelp } = useStaffScreenHelp();

  useEffect(() => {
    const payload: StaffScreenHelpContent = {
      title,
      purpose,
      whenToUse,
      steps,
      howToConfirm,
      assistantQuestion,
      children,
    };
    setHelp(payload);
    return () => setHelp(null);
  }, [title, purpose, whenToUse, steps, howToConfirm, assistantQuestion, children, setHelp]);

  return null;
}
