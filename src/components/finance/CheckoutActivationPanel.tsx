import { useState } from "react";
import { AlertCircle, Check, Copy, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { CHECKOUT_ACTIVATION_SQL } from "@/lib/checkoutActivationSql";
import { STRIPE_EDGE_DEPLOY_HINT } from "@/lib/stripeEdgeVersion";

type Props = {
  syncing: boolean;
  checkoutRpcReady: boolean;
  onSync: () => void;
};

export default function CheckoutActivationPanel({ syncing, checkoutRpcReady, onSync }: Props) {
  const [copied, setCopied] = useState(false);

  const copySql = async () => {
    try {
      await navigator.clipboard.writeText(CHECKOUT_ACTIVATION_SQL);
      setCopied(true);
      toast.success("SQL copiado, cole no editor da base de dados e execute");
      window.setTimeout(() => setCopied(false), 2500);
    } catch {
      toast.error("Não foi possível copiar, seleccione o texto manualmente");
    }
  };

  return (
    <div className="rounded-2xl border-2 border-amber-500/50 bg-amber-500/10 p-4 space-y-3">
      <div className="flex items-start gap-2">
        <AlertCircle className="h-5 w-5 text-amber-700 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="text-sm font-black text-amber-900 dark:text-amber-100">
            Pagamentos online ainda por activar no site
          </p>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Na Stripe a conta pode estar correcta, mas o site só aceita cartão depois de sincronizar e de
            actualizar a base de dados uma vez. Use os botões abaixo por esta ordem.
          </p>
          {!checkoutRpcReady && (
            <p className="text-xs font-semibold text-destructive pt-1">
              Falta uma actualização na base de dados, copie o SQL e execute no editor.
            </p>
          )}
        </div>
      </div>

      <Button
        className="w-full h-12 font-black text-base gap-2"
        disabled={syncing}
        onClick={onSync}
      >
        {syncing ? <RefreshCw className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
        Sincronizar com Stripe
      </Button>

      <Button type="button" variant="outline" className="w-full font-bold gap-2" onClick={() => void copySql()}>
        {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
        {copied ? "SQL copiado!" : "Copiar SQL de activação (só uma vez)"}
      </Button>

      <p className="text-[10px] text-muted-foreground text-center leading-relaxed">
        Se o SQL já foi executado: {STRIPE_EDGE_DEPLOY_HINT}
      </p>
    </div>
  );
}
