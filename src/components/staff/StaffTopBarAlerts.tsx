import { Link, useSearchParams } from "react-router-dom";
import {
  AlertCircle,
  AlertTriangle,
  ChevronRight,
  HelpCircle,
  Loader2,
  X,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useStaffDiagnosticsAlert } from "@/hooks/useStaffDiagnosticsAlert";
import { LOVABLE_WILDCARD_HINT } from "@/lib/routeMap";
import { nav } from "@/lib/navPaths";
import { useStaffScreenHelp } from "@/contexts/StaffScreenHelpContext";
import HowToUseContent from "@/components/admin/HowToUseContent";

type Props = {
  area: "admin" | "panel";
};

function toolbarBtnClass(tone: "default" | "critical" | "warning" | "help") {
  const base =
    "relative h-9 w-9 shrink-0 rounded-lg border bg-background/80 hover:bg-muted/60";
  if (tone === "critical") return `${base} border-destructive/40 text-destructive`;
  if (tone === "warning") return `${base} border-amber-500/40 text-amber-700 dark:text-amber-300`;
  if (tone === "help") return `${base} border-primary/30 text-primary`;
  return `${base} border-border text-muted-foreground`;
}

function BadgeCount({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">
      {count > 9 ? "9+" : count}
    </span>
  );
}

function DiagnosticsAlertButton({ area }: { area: "admin" | "panel" }) {
  const {
    loading,
    visible,
    isCritical,
    badgeCount,
    message,
    topIssue,
    staffCriticalCount,
    useAuditReport,
  } = useStaffDiagnosticsAlert(area);

  if (!visible) return null;

  const Icon = loading ? Loader2 : isCritical ? XCircle : AlertTriangle;
  const tone = isCritical ? "critical" : "warning";

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={toolbarBtnClass(tone)}
          aria-label={message ?? "Estado do sistema"}
        >
          <Icon className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          {!loading && <BadgeCount count={badgeCount} />}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[min(22rem,calc(100vw-2rem))] p-4 space-y-3">
        {loading ? (
          <p className="text-sm text-muted-foreground flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            A verificar estado do sistema…
          </p>
        ) : (
          <>
            <p className="font-bold text-sm">{message}</p>
            {topIssue?.label && (
              <div className="text-sm space-y-1">
                <p>
                  {topIssue.label}
                  {topIssue.detail && !topIssue.action ? `: ${topIssue.detail}` : ""}
                </p>
                {topIssue.action && (
                  <p className="text-xs font-semibold text-muted-foreground">→ {topIssue.action}</p>
                )}
              </div>
            )}
            {area === "admin" && staffCriticalCount > 0 && !useAuditReport && (
              <p className="text-xs text-muted-foreground">
                Inclui verificação de login da equipa e servidores críticos.
              </p>
            )}
            <Button asChild variant="outline" size="sm" className="w-full gap-1">
              <Link to={nav.admin("diagnostics")}>
                Auditar tudo
                <ChevronRight className="h-4 w-4" />
              </Link>
            </Button>
          </>
        )}
      </PopoverContent>
    </Popover>
  );
}

function LovableRouteHintButton() {
  const [params, setParams] = useSearchParams();
  if (params.get("routeHint") !== LOVABLE_WILDCARD_HINT) return null;

  const dismiss = () => {
    const next = new URLSearchParams(params);
    next.delete("routeHint");
    setParams(next, { replace: true });
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={toolbarBtnClass("warning")}
          aria-label="Aviso de endereço de teste"
        >
          <AlertCircle className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[min(22rem,calc(100vw-2rem))] p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm font-semibold">/admin/* não é uma página real</p>
          <Button type="button" variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={dismiss}>
            <X className="h-4 w-4" />
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          O preview Lovable mostrou um endereço genérico. Foi corrigido para <strong>/admin</strong>.
          Consulte o{" "}
          <Link to={nav.admin("routes")} className="text-primary font-semibold underline">
            mapa de rotas
          </Link>{" "}
          para testar endereços reais.
        </p>
      </PopoverContent>
    </Popover>
  );
}

function ScreenHelpButton() {
  const { help } = useStaffScreenHelp();
  if (!help) return null;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={toolbarBtnClass("help")}
          aria-label="Como usar este ecrã"
        >
          <HelpCircle className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className="w-[min(24rem,calc(100vw-2rem))] max-h-[min(70vh,28rem)] overflow-y-auto p-4"
      >
        <HowToUseContent {...help} />
      </PopoverContent>
    </Popover>
  );
}

export default function StaffTopBarAlerts({ area }: Props) {
  return (
    <div className="flex items-center gap-1 shrink-0 mr-1">
      {area === "admin" && <DiagnosticsAlertButton area={area} />}
      {area === "admin" && <LovableRouteHintButton />}
      <ScreenHelpButton />
    </div>
  );
}
