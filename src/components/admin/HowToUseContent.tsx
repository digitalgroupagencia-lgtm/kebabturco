import type { ReactNode } from "react";
import AskAssistantButton from "./AskAssistantButton";
import { useStaffT } from "@/hooks/useStaffT";
import type { StaffScreenHelpContent } from "@/contexts/StaffScreenHelpContext";

type Props = StaffScreenHelpContent;

export default function HowToUseContent({
  title,
  purpose,
  whenToUse,
  steps,
  howToConfirm,
  assistantQuestion,
  children,
}: Props) {
  const { t } = useStaffT();

  return (
    <div className="space-y-3 text-sm">
      <p className="font-bold text-base">{title ?? t("howto.title")}</p>

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
                      {s.detail && <span className="text-muted-foreground"> — {s.detail}</span>}
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

      {children as ReactNode}

      {assistantQuestion && (
        <div className="pt-2 border-t border-primary/20">
          <AskAssistantButton question={assistantQuestion} label={t("howto.ask_ai")} />
        </div>
      )}
    </div>
  );
}
