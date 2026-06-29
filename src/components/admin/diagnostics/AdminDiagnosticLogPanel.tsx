import { Copy, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { DiagnosticLogEntry, DiagnosticLogLevel } from "@/lib/diagnostics/createDiagnosticLogger";
import { cn } from "@/lib/utils";

function LogLevelBadge({ level }: { level: DiagnosticLogLevel }) {
  const cls =
    level === "error"
      ? "bg-destructive/15 text-destructive"
      : level === "warn"
        ? "bg-amber-500/15 text-amber-800 dark:text-amber-200"
        : "bg-muted text-muted-foreground";
  return (
    <span className={cn("rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase", cls)}>
      {level}
    </span>
  );
}

type Props = {
  title?: string;
  description?: string;
  logs: DiagnosticLogEntry[];
  onClear: () => void;
  emptyMessage?: string;
};

export default function AdminDiagnosticLogPanel({
  title = "Logs detalhados",
  description = "Erros e passos de teste (também na consola do browser)",
  logs,
  onClear,
  emptyMessage = "Sem logs ainda — execute um teste.",
}: Props) {
  const copyLogs = async () => {
    const text = logs
      .map(
        (l) =>
          `[${l.at}] ${l.level.toUpperCase()} ${l.domain}/${l.context ?? "system"}/${l.stage}: ${l.message}${
            l.details ? ` ${JSON.stringify(l.details)}` : ""
          }`,
      )
      .join("\n");
    await navigator.clipboard.writeText(text);
    toast.success("Logs copiados");
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
        <div>
          <CardTitle className="text-base">{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </div>
        <div className="flex gap-2">
          <Button type="button" variant="outline" size="sm" onClick={() => void copyLogs()} disabled={!logs.length}>
            <Copy className="h-3.5 w-3.5 mr-1" />
            Copiar
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={onClear} disabled={!logs.length}>
            <Trash2 className="h-3.5 w-3.5 mr-1" />
            Limpar
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {logs.length === 0 ? (
          <p className="text-sm text-muted-foreground">{emptyMessage}</p>
        ) : (
          <ul className="space-y-2 max-h-80 overflow-y-auto">
            {logs.map((log) => (
              <li
                key={log.id}
                className="rounded-md border border-border/60 bg-muted/30 px-3 py-2 text-xs font-mono"
              >
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <LogLevelBadge level={log.level} />
                  <span className="text-muted-foreground">
                    {log.context ? `${log.context}/` : ""}
                    {log.stage}
                  </span>
                  <span className="text-muted-foreground ml-auto">
                    {new Date(log.at).toLocaleTimeString("pt-PT")}
                  </span>
                </div>
                <p className="text-foreground break-words">{log.message}</p>
                {log.details ? (
                  <pre className="mt-1 text-[10px] text-muted-foreground whitespace-pre-wrap break-all">
                    {JSON.stringify(log.details, null, 2)}
                  </pre>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
