import { useState } from "react";
import { AlertCircle, Check, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { MANUAL_STRIPE_DB_SQL } from "@/lib/manualStripeDbSql";

export { MANUAL_STRIPE_DB_SQL };

const PREVIEW_LINE_COUNT = 16;

type Props = {
  schemaStripeEnv: boolean;
  schemaTestSimulated: boolean;
  ledgerOk: boolean;
};

export default function ManualDatabaseSqlPanel({ schemaStripeEnv, schemaTestSimulated, ledgerOk }: Props) {
  const [copied, setCopied] = useState(false);
  const needsSql = !schemaStripeEnv || !schemaTestSimulated || !ledgerOk;

  if (!needsSql) return null;

  const lines = MANUAL_STRIPE_DB_SQL.trim().split("\n");
  const hasMore = lines.length > PREVIEW_LINE_COUNT;
  const preview = hasMore
    ? `${lines.slice(0, PREVIEW_LINE_COUNT).join("\n")}\n\n-- …`
    : MANUAL_STRIPE_DB_SQL.trim();

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(MANUAL_STRIPE_DB_SQL.trim());
      setCopied(true);
      toast.success("SQL copiado, cole no editor da base de dados e execute");
      window.setTimeout(() => setCopied(false), 2500);
    } catch {
      toast.error("Não foi possível copiar, seleccione o texto manualmente");
    }
  };

  return (
    <div className="rounded-xl border-2 border-destructive/40 bg-destructive/5 p-4 space-y-3">
      <div className="flex items-start gap-2">
        <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="text-sm font-black text-destructive">Base de dados incompleta</p>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Clique em <strong>Copiar SQL</strong>, cole no editor da base de dados e execute. Depois actualize esta
            página.
          </p>
          <ul className="text-xs text-muted-foreground list-disc pl-4 pt-1">
            {!schemaStripeEnv && <li>Falta coluna modo teste/produção</li>}
            {!schemaTestSimulated && <li>Falta coluna recebimentos simulados</li>}
            {!ledgerOk && <li>Falta tabela de movimentos financeiros</li>}
          </ul>
        </div>
      </div>
      <pre className="text-[10px] leading-relaxed bg-background border rounded-lg p-3 overflow-x-auto max-h-48 whitespace-pre-wrap">
        {preview}
      </pre>
      {hasMore && (
        <p className="text-[10px] text-muted-foreground text-center">
          Pré-visualização, o botão abaixo copia o script completo ({lines.length} linhas)
        </p>
      )}
      <Button type="button" variant="outline" size="sm" className="w-full font-bold" onClick={() => void copy()}>
        {copied ? <Check className="h-4 w-4 mr-2" /> : <Copy className="h-4 w-4 mr-2" />}
        {copied ? "Copiado!" : "Copiar SQL"}
      </Button>
    </div>
  );
}
