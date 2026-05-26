import { useState } from "react";
import { AlertCircle, Check, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { MANUAL_STRIPE_DB_SQL } from "@/lib/manualStripeDbSql";

export { MANUAL_STRIPE_DB_SQL };

type Props = {
  schemaStripeEnv: boolean;
  schemaTestSimulated: boolean;
  ledgerOk: boolean;
};

export default function ManualDatabaseSqlPanel({ schemaStripeEnv, schemaTestSimulated, ledgerOk }: Props) {
  const [copied, setCopied] = useState(false);
  const needsSql = !schemaStripeEnv || !schemaTestSimulated || !ledgerOk;

  if (!needsSql) return null;

  const preview =
    MANUAL_STRIPE_DB_SQL.length > 1200
      ? `${MANUAL_STRIPE_DB_SQL.slice(0, 1200)}\n\n-- … (SQL completo ao copiar — ${MANUAL_STRIPE_DB_SQL.split("\n").length} linhas)`
      : MANUAL_STRIPE_DB_SQL;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(MANUAL_STRIPE_DB_SQL);
      setCopied(true);
      toast.success("SQL completo copiado — cole no SQL Editor da base de dados");
      window.setTimeout(() => setCopied(false), 2500);
    } catch {
      toast.error("Não foi possível copiar — seleccione o texto manualmente");
    }
  };

  return (
    <div className="rounded-xl border-2 border-destructive/40 bg-destructive/5 p-4 space-y-3">
      <div className="flex items-start gap-2">
        <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="text-sm font-black text-destructive">Base de dados incompleta</p>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Cole o SQL abaixo em <strong>Lovable → Database → SQL editor → Run</strong>. Não precisa do chat da
            Lovable. Depois actualize esta página.
          </p>
          <ul className="text-xs text-muted-foreground list-disc pl-4 pt-1">
            {!schemaStripeEnv && <li>Falta coluna modo teste/produção</li>}
            {!schemaTestSimulated && <li>Falta coluna recebimentos simulados</li>}
            {!ledgerOk && <li>Falta tabela de movimentos financeiros</li>}
          </ul>
        </div>
      </div>
      <pre className="text-[10px] leading-relaxed bg-background border rounded-lg p-3 overflow-x-auto max-h-48 whitespace-pre-wrap">
        {preview.trim()}
      </pre>
      <Button type="button" variant="outline" size="sm" className="w-full font-bold" onClick={() => void copy()}>
        {copied ? <Check className="h-4 w-4 mr-2" /> : <Copy className="h-4 w-4 mr-2" />}
        {copied ? "Copiado!" : "Copiar SQL completo para colar na base de dados"}
      </Button>
      <p className="text-[10px] text-muted-foreground">
        Também disponível no GitHub: ficheiro <strong>COPIAR_COLAR_SQL_RECEBIMENTOS_TESTE_COMPLETO.sql</strong>
      </p>
    </div>
  );
}
