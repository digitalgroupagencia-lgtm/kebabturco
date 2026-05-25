import { Link, useSearchParams } from "react-router-dom";
import { AlertCircle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LOVABLE_WILDCARD_HINT } from "@/lib/routeMap";

export default function LovableRouteHintBanner() {
  const [params, setParams] = useSearchParams();
  if (params.get("routeHint") !== LOVABLE_WILDCARD_HINT) return null;

  const dismiss = () => {
    const next = new URLSearchParams(params);
    next.delete("routeHint");
    setParams(next, { replace: true });
  };

  return (
    <div className="mb-4 rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 flex gap-3 items-start">
      <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold">/admin/* não é uma página real</p>
        <p className="text-xs text-muted-foreground mt-1">
          O preview Lovable mostrou um endereço genérico. Foi corrigido para <strong>/admin</strong>.
          Consulte o{" "}
          <Link to="/admin/routes" className="text-primary font-semibold underline">
            mapa de rotas
          </Link>{" "}
          para testar endereços reais.
        </p>
      </div>
      <Button type="button" variant="ghost" size="icon" className="shrink-0 h-8 w-8" onClick={dismiss} aria-label="Fechar">
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
}
