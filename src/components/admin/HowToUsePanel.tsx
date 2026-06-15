import { useState, type ReactNode } from "react";
import { ChevronDown, ChevronUp, HelpCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import AskAssistantButton from "./AskAssistantButton";
import { useStaffT } from "@/hooks/useStaffT";

type Step = string | { title: string; detail?: string };

type Props = {
  /** Título curto — omitir para usar tradução padrão */
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

export default function HowToUsePanel({
  title,
  purpose,
  whenToUse,
  steps,
  howToConfirm,
  assistantQuestion,
  children,
  defaultOpen = false,
}: Props) {
  const [open, setOpen] = useState(defaultOpen);
  const { t } = useStaffT();

  return (
    <Card className="border-primary/20 bg-primary/5">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-2 p-4 text-left"
        aria-expanded={open}
      >
        <HelpCircle className="h-5 w-5 text-primary shrink-0" />
        <span className="font-bold text-sm flex-1">{title ?? t("howto.title")}</span>
        {open ? (
          <ChevronUp className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        )}
      </button>

      {open && (
        <CardContent className="pt-0 space-y-3 text-sm">
          <div>
            <p className="font-bold text-xs uppercase tracking-wide text-muted-foreground mb-1">
              {t("howto.purpose")}
            </p>
            <p>{purpose}</p>
          </div>

          {whenToUse && (
            <div>
              <p className="font-bold text-xs uppercase tracking-wide text-muted-foreground mb-1">
                {t("howto.when")}
              </p>
              <p>{whenToUse}</p>
            </div>
          )}

          {steps && steps.length > 0 && (
            <div>
              <p className="font-bold text-xs uppercase tracking-wide text-muted-foreground mb-1">
                {t("howto.steps")}
              </p>
              <ol className="list-decimal pl-5 space-y-1">
                {steps.map((s, i) => {
                  const isObj = typeof s !== "string";
                  return (
                    <li key={i}>
                      {isObj ? (
                        <>
                          <span className="font-medium">{s.title}</span>
                          {s.detail && (
                            <span className="text-muted-foreground"> — {s.detail}</span>
                          )}
                        </>
                      ) : (
                        s
                      )}
                    </li>
                  );
                })}
              </ol>
            </div>
          )}

          {howToConfirm && (
            <div>
              <p className="font-bold text-xs uppercase tracking-wide text-muted-foreground mb-1">
                {t("howto.confirm")}
              </p>
              <p>{howToConfirm}</p>
            </div>
          )}

          {children}

          {assistantQuestion && (
            <div className="pt-2 border-t border-primary/20">
              <AskAssistantButton question={assistantQuestion} label={t("howto.ask_ai")} />
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}
