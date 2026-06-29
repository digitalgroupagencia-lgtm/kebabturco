import { useStaffT } from "@/hooks/useStaffT";

type Props = {
  className?: string;
};

/** Instruções internas para a equipa — mostrar ao escolher cobrar com Tap to Pay. */
export default function TapToPayChargeEducation({ className }: Props) {
  const { t } = useStaffT();

  return (
    <div
      className={
        className ??
        "rounded-xl border border-primary/20 bg-primary/5 p-3 text-sm space-y-1.5 text-left"
      }
    >
      <p className="font-bold text-foreground">{t("tapToPay.education.title")}</p>
      <p className="text-muted-foreground leading-relaxed">{t("tapToPay.education.contactless")}</p>
      <p className="text-muted-foreground leading-relaxed">{t("tapToPay.education.wallets")}</p>
      <p className="text-muted-foreground leading-relaxed">{t("tapToPay.education.pin")}</p>
    </div>
  );
}
