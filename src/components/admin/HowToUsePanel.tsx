import { type ReactNode } from "react";
import { useRegisterHowToUse } from "@/components/staff/StaffStatusRow";

type Step = string | { title: string; detail?: string };

type Props = {
  /** Título curto, ex.: "Como usar esta tela" */
  title?: string;
  /** Para quem serve esta tela em linguagem de utilizador */
  purpose: string;
  /** Quando usar */
  whenToUse?: string;
  /** Passos numerados */
  steps?: Step[];
  /** Como saber se deu certo */
  howToConfirm?: string;
  /** Pergunta sugerida ao assistente IA */
  assistantQuestion?: string;
  /** Conteúdo livre extra */
  children?: ReactNode;
  defaultOpen?: boolean;
};

/**
 * v6: a ajuda contextual deixou de ocupar uma faixa larga ao topo das telas.
 * Em vez disso, o conteúdo é registado num contexto e mostrado num Sheet
 * lateral quando o utilizador clica no ícone "?" da barra fina de status.
 * A API mantém-se para não obrigar a tocar em cada página.
 */
export default function HowToUsePanel({
  title,
  purpose,
  whenToUse,
  steps,
  howToConfirm,
  assistantQuestion,
  children: _children,
  defaultOpen: _defaultOpen,
}: Props) {
  useRegisterHowToUse({ title, purpose, whenToUse, steps, howToConfirm, assistantQuestion });
  void _children;
  void _defaultOpen;
  return null;
}
