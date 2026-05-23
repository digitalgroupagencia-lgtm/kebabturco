import { Loader2 } from "lucide-react";

const PageSpinner = () => (
  <div className="min-h-[50dvh] flex flex-col items-center justify-center gap-3 text-muted-foreground">
    <Loader2 className="h-8 w-8 animate-spin text-primary" />
    <p className="text-sm font-semibold">A carregar…</p>
  </div>
);

export default PageSpinner;
