import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { AlertTriangle, ChevronRight, HelpCircle, Sparkles, X, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useOperationalDiagnostics } from "@/features/ops/useOperationalDiagnostics";
import { useAdminStoreId } from "@/hooks/useAdminStoreId";
import { loadStoredFullAuditReport } from "@/services/fullAppAuditService";
import { probeStaffAuthAudit } from "@/lib/diagnostics/staffAuthAuditProbe";
import type { AuditFinding } from "@/services/adminSystemAudit";
import { useDemoMode } from "@/lib/demoMode";
import { nav } from "@/lib/navPaths";
import AskAssistantButton from "@/components/admin/AskAssistantButton";

/* =========================================================================
 * Contexto para registar conteúdo de ajuda contextual da página actual.
 * A página chama useRegisterHowToUse(props); o ícone "?" da barra de status
 * abre um Sheet com esse conteúdo. Evita banners gigantes de "Como usar".
 * ======================================================================= */

type HowToStep = string | { title: string; detail?: string };

export type HowToContent = {
  title?: string;
  purpose: string;
  whenToUse?: string;
  steps?: HowToStep[];
  howToConfirm?: string;
  assistantQuestion?: string;
};

type Ctx = {
  content: HowToContent | null;
  setContent: (c: HowToContent | null) => void;
};

const StaffStatusContext = createContext<Ctx | null>(null);

export function StaffStatusProvider({ children }: { children: ReactNode }) {
  const [content, setContent] = useState<HowToContent | null>(null);
  const value = useMemo<Ctx>(() => ({ content, setContent }), [content]);
  return <StaffStatusContext.Provider value={value}>{children}</StaffStatusContext.Provider>;
}

export function useRegisterHowToUse(content: HowToContent | null) {
  const ctx = useContext(StaffStatusContext);
  const serialized = JSON.stringify(content ?? null);
  useEffect(() => {
    if (!ctx) return;
    ctx.setContent(content);
    return () => ctx.setContent(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serialized]);
}

/* =========================================================================
 * Chip do alerta crítico operacional — compacto, clicável.
 * ======================================================================= */

function CriticalChip() {
  const { criticalIssues, failCount, warnCount, run, lastRun } = useOperationalDiagnostics();
  const { storeId } = useAdminStoreId();
  const location = useLocation();
  const [staffFindings, setStaffFindings] = useState<AuditFinding[]>([]);
  const dismissKey = "ops-diagnostics-banner-dismissed";
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    try { setDismissed(sessionStorage.getItem(dismissKey) === "1"); } catch { /* noop */ }
  }, []);

  useEffect(() => { if (!lastRun) void run(); }, [lastRun, run]);

  useEffect(() => {
    const stored = loadStoredFullAuditReport();
    const storedCritical = stored?.allFindings.filter(
      (f) => f.severity === "critical" && (f.panel === "backend" || f.category === "team" || f.id.startsWith("rpc-missing-manager_")),
    ) ?? [];
    if (storedCritical.length > 0) { setStaffFindings(storedCritical); return; }
    if (!storeId) return;
    let active = true;
    void probeStaffAuthAudit(storeId).then((findings) => {
      if (active) setStaffFindings(findings.filter((f) => f.severity === "critical"));
    });
    return () => { active = false; };
  }, [storeId, lastRun]);

  const totalFail = failCount + staffFindings.length;
  const totalWarn = warnCount;

  // Só mostra em Command Center / Estado do sistema / Diagnóstico / Live.
  const path = location.pathname;
  const showOnRoute =
    path === nav.admin() ||
    path.startsWith(nav.admin("diagnostics")) ||
    path.startsWith(nav.admin("system")) ||
    path === nav.panel() ||
    path.startsWith(nav.panel("live"));

  if (!showOnRoute || dismissed) return null;
  if (totalFail === 0 && totalWarn === 0) return null;

  const isCritical = totalFail > 0;
  const count = isCritical ? totalFail : totalWarn;
  const label = isCritical ? `${count} crítico${count > 1 ? "s" : ""}` : `${count} aviso${count > 1 ? "s" : ""}`;
  const Icon = isCritical ? XCircle : AlertTriangle;
  const cls = isCritical
    ? "border-destructive/40 bg-destructive/10 text-destructive hover:bg-destructive/15"
    : "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300 hover:bg-amber-500/15";

  const topMsg = criticalIssues[0]?.label || staffFindings[0]?.label || "Toque para auditar";

  return (
    <div className="inline-flex items-center">
      <Link
        to={nav.admin("diagnostics")}
        title={topMsg}
        className={`inline-flex items-center gap-1.5 h-8 pl-2 pr-1.5 rounded-l-md border border-r-0 text-xs font-semibold transition ${cls}`}
      >
        <Icon className="h-3.5 w-3.5" />
        <span>{label}</span>
        <ChevronRight className="h-3.5 w-3.5 opacity-70" />
      </Link>
      <button
        type="button"
        aria-label="Dispensar aviso"
        onClick={() => { try { sessionStorage.setItem(dismissKey, "1"); } catch { /* noop */ } setDismissed(true); }}
        className={`inline-flex items-center justify-center h-8 w-7 rounded-r-md border text-xs ${cls}`}
      >
        <X className="h-3 w-3" />
      </button>
    </div>
  );
}

/* =========================================================================
 * Chip do modo demonstração.
 * ======================================================================= */

function DemoChip() {
  const demo = useDemoMode();
  if (!demo) return null;
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="inline-flex items-center gap-1.5 h-8 px-2.5 rounded-md border border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300 text-xs font-semibold hover:bg-amber-500/15 transition"
        >
          <Sparkles className="h-3.5 w-3.5" />
          <span>Modo demo</span>
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72 text-xs">
        <p className="font-bold mb-1">Modo demonstração activo</p>
        <p className="text-muted-foreground">
          Gráficos e listas mostram dados de exemplo. Para voltar aos dados reais, abra <strong>Admin → Simulador de pedidos</strong> e toque em <em>Limpar dados de teste</em>.
        </p>
      </PopoverContent>
    </Popover>
  );
}

/* =========================================================================
 * Botão "?" — abre Sheet com a ajuda da página, registada via contexto.
 * ======================================================================= */

function HelpChip() {
  const ctx = useContext(StaffStatusContext);
  const [open, setOpen] = useState(false);
  if (!ctx?.content) return null;
  const c = ctx.content;

  return (
    <>
      <button
        type="button"
        aria-label={c.title || "Como usar esta tela"}
        title={c.title || "Como usar esta tela"}
        onClick={() => setOpen(true)}
        className="inline-flex items-center justify-center h-8 w-8 rounded-md border bg-card text-muted-foreground hover:text-foreground hover:bg-accent transition"
      >
        <HelpCircle className="h-4 w-4" />
      </button>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2"><HelpCircle className="h-5 w-5 text-primary" /> {c.title || "Como usar esta tela"}</SheetTitle>
            <SheetDescription>{c.purpose}</SheetDescription>
          </SheetHeader>
          <div className="mt-4 space-y-4 text-sm">
            {c.whenToUse && (
              <div>
                <p className="font-bold text-xs uppercase tracking-wide text-muted-foreground mb-1">Quando usar</p>
                <p>{c.whenToUse}</p>
              </div>
            )}
            {c.steps && c.steps.length > 0 && (
              <div>
                <p className="font-bold text-xs uppercase tracking-wide text-muted-foreground mb-1">Passo a passo</p>
                <ol className="list-decimal pl-5 space-y-1">
                  {c.steps.map((s, i) => {
                    const isObj = typeof s !== "string";
                    return (
                      <li key={i}>
                        {isObj ? (
                          <>
                            <span className="font-medium">{s.title}</span>
                            {s.detail && <span className="text-muted-foreground"> — {s.detail}</span>}
                          </>
                        ) : s}
                      </li>
                    );
                  })}
                </ol>
              </div>
            )}
            {c.howToConfirm && (
              <div>
                <p className="font-bold text-xs uppercase tracking-wide text-muted-foreground mb-1">Como confirmar que deu certo</p>
                <p>{c.howToConfirm}</p>
              </div>
            )}
            {c.assistantQuestion && (
              <div className="pt-2 border-t">
                <AskAssistantButton question={c.assistantQuestion} label="Pedir explicação à IA" />
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}

/* =========================================================================
 * Barra fina horizontal — agrupa os 3 chips.
 * ======================================================================= */

export default function StaffStatusRow() {
  return (
    <div className="flex flex-wrap items-center gap-2 min-h-[2rem]">
      <CriticalChip />
      <div className="ml-auto inline-flex items-center gap-2">
        <DemoChip />
        <HelpChip />
      </div>
    </div>
  );
}
