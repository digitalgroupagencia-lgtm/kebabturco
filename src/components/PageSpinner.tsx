import { Loader2 } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

const PageSpinner = () => {
  const { t } = useLanguage();

  return (
    <div className="flex min-h-[50dvh] flex-col items-center justify-center gap-3 text-muted-foreground">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
      <p className="text-sm font-semibold">{t("loadingGeneric")}</p>
    </div>
  );
};

export default PageSpinner;
