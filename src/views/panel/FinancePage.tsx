import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAdminStoreId } from "@/hooks/useAdminStoreId";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  activateLiveStripeConnect,
  createStoreOnboardingLink,
  createStripeConnectEmbeddedSession,
  fetchStoreFinancialProfile,
  fetchStripePlatformStatus,
  provisionTestStripeConnect,
  resyncStorePayoutIntakeToStripe,
  syncStripeConnectStatus,
  type StoreFinancialProfile,
  type StripePlatformStatus,
} from "@/services/orderService";
import type { SavePayoutIntakeResult, StorePayoutIntake } from "@/services/payoutIntakeService";
import { inferStripePlatformStatus } from "@/lib/inferStripePlatformStatus";
import { isStripeConnectReady, stripeConnectStatusLabel } from "@/lib/stripeConnectReady";
import StripeConnectEmbeddedPanel from "@/components/finance/StripeConnectEmbeddedPanel";
import TestCheckoutReadiness from "@/components/finance/TestCheckoutReadiness";
import ManualDatabaseSqlPanel from "@/components/finance/ManualDatabaseSqlPanel";
import { probeSchemaFallback } from "@/services/operationalDiagnosticsService";
import {
  Loader2,
  Wallet,
  ShieldCheck,
  AlertTriangle,
  Info,
  Settings2,
  Share2,
  Copy,
} from "lucide-react";
import { Link } from "react-router-dom";
import { nav } from "@/lib/navPaths";
import AdminStoreSwitcher from "@/components/admin/AdminStoreSwitcher";
import AdminPayoutIntakeForm from "@/components/finance/AdminPayoutIntakeForm";
import RestaurantFinanceDashboard from "@/components/finance/RestaurantFinanceDashboard";
import {
  fetchFinanceMovements,
  fetchFinancePayouts,
  fetchRestaurantFinanceSnapshot,
  type FinanceMovement,
  type FinancePayout,
  type RestaurantFinanceSnapshot,
} from "@/services/restaurantFinanceService";

async function probeLedgerTable(storeId: string): Promise<boolean> {
  try {
    const { error } = await supabase.from("store_payment_ledger").select("id").eq("store_id", storeId).limit(1);
    return !error;
  } catch {
    return false;
  }
}

const FinancePage = () => {
  const { storeId } = useAdminStoreId();
  const [profile, setProfile] = useState<StoreFinancialProfile | null>(null);
  const [movements, setMovements] = useState<FinanceMovement[]>([]);
  const [payouts, setPayouts] = useState<FinancePayout[]>([]);
  const [financeSnapshot, setFinanceSnapshot] = useState<RestaurantFinanceSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [ledgerTableOk, setLedgerTableOk] = useState(true);
  const [platformStatus, setPlatformStatus] = useState<StripePlatformStatus | null>(null);
  const [embeddedMode, setEmbeddedMode] = useState<"none" | "onboarding" | "management">("none");
  const [syncing, setSyncing] = useState(false);
  const [testProvisionBusy, setTestProvisionBusy] = useState(false);
  const [linkBusy, setLinkBusy] = useState(false);
  const [onboardingLink, setOnboardingLink] = useState<string | null>(null);
  const [intakeSaved, setIntakeSaved] = useState<StorePayoutIntake | null>(null);
  const [registerResult, setRegisterResult] = useState<SavePayoutIntakeResult | null>(null);
  const [connectingRestaurant, setConnectingRestaurant] = useState(false);
  const [showTestTools, setShowTestTools] = useState(false);
  const [schemaProbe, setSchemaProbe] = useState<Awaited<ReturnType<typeof probeSchemaFallback>> | null>(null);

  const load = useCallback(async (options?: { silent?: boolean }) => {
    if (!storeId) return;
    if (!options?.silent) {
      setLoading(true);
      setLoadError(null);
    }
    try {
      const [prof, schema, mv, po, serverPlatform, ledgerOk] = await Promise.all([
        fetchStoreFinancialProfile(storeId).catch(() => null),
        probeSchemaFallback().catch(() => null),
        fetchFinanceMovements(storeId),
        fetchFinancePayouts(storeId),
        fetchStripePlatformStatus(storeId).catch(() => null),
        probeLedgerTable(storeId),
      ]);
      setProfile(prof);
      setPlatformStatus(serverPlatform ?? inferStripePlatformStatus(prof));
      setSchemaProbe(schema);
      setMovements(mv);
      setLedgerTableOk(ledgerOk);
      setPayouts(po);
      const ledgerNet = mv.reduce((s, m) => s + m.youReceiveCents, 0);
      const snap = await fetchRestaurantFinanceSnapshot(storeId, ledgerNet);
      setFinanceSnapshot(snap);
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "Erro ao carregar recebimentos");
    } finally {
      if (!options?.silent) setLoading(false);
    }
  }, [storeId]);

  useEffect(() => {
    void load();
  }, [load]);

  const refreshStatus = useCallback(async () => {
    if (!storeId) return;
    setSyncing(true);
    try {
      await syncStripeConnectStatus(storeId);
      const fresh = await fetchStoreFinancialProfile(storeId);
      const stillNotReady = !isStripeConnectReady(fresh);
      const hasIntake = Boolean(intakeSaved?.owner_email?.trim());
      if (stillNotReady && hasIntake) {
        const resync = await resyncStorePayoutIntakeToStripe(storeId);
        toast.success(resync.message || "Dados financeiros actualizados");
        await syncStripeConnectStatus(storeId);
      } else if (isStripeConnectReady(fresh)) {
        toast.success("Pagamentos online activos — dados actualizados");
      } else {
        toast.success("Dados financeiros actualizados");
      }
      await load({ silent: true });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao sincronizar");
    } finally {
      setSyncing(false);
    }
  }, [storeId, load, intakeSaved]);

  const onEmbeddedComplete = useCallback(async () => {
    setEmbeddedMode("none");
    await refreshStatus();
  }, [refreshStatus]);

  const connectRestaurantAccount = useCallback(async () => {
    if (!storeId) return;
    if (!intakeSaved?.owner_email?.trim()) {
      toast.error("Guarde primeiro os dados do restaurante, incluindo o e-mail do dono.");
      return;
    }
    setConnectingRestaurant(true);
    try {
      const inTestMode =
        profile?.stripe_connect_environment === "test" ||
        Boolean(profile?.stripe_connect_test_simulated);
      if (inTestMode) {
        await activateLiveStripeConnect(storeId);
        await load({ silent: true });
      }
      const session = await createStripeConnectEmbeddedSession(storeId, "embedded_onboarding");
      if (session.skipEmbedded || session.accountType === "custom") {
        await load({ silent: true });
        toast.success(
          session.message || "Restaurante já registado na plataforma — não precisa de formulário extra.",
        );
        return;
      }
      setEmbeddedMode("onboarding");
      toast.success(
        `Formulário aberto — use o e-mail ${intakeSaved.owner_email} (já fica pré-preenchido).`,
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao ligar a conta do restaurante");
    } finally {
      setConnectingRestaurant(false);
    }
  }, [storeId, load, intakeSaved, profile]);

  const generateOnboardingLink = useCallback(async () => {
    if (!storeId) return;
    setLinkBusy(true);
    try {
      const { path } = await createStoreOnboardingLink(storeId);
      const url = `${window.location.origin}${path}`;
      setOnboardingLink(url);
      await load({ silent: true });
      toast.success("Link gerado — copie ou envie por WhatsApp.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao gerar o link");
    } finally {
      setLinkBusy(false);
    }
  }, [storeId, load]);

  const activateTestReceivables = useCallback(async () => {
    if (!storeId) return;
    setTestProvisionBusy(true);
    try {
      const result = await provisionTestStripeConnect(storeId);
      await load({ silent: true });
      toast.success(result.message || "Modo teste activo — recebimentos de teste activos");
      setEmbeddedMode("none");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao activar recebimentos de teste");
    } finally {
      setTestProvisionBusy(false);
    }
  }, [storeId, load]);

  if (!storeId) {
    return <div className="p-6 text-sm text-muted-foreground">Sem restaurante vinculado</div>;
  }

  if (loading) {
    return (
      <div className="p-6 flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> A carregar…
      </div>
    );
  }

  const ready = isStripeConnectReady(profile);
  const connectStatus = stripeConnectStatusLabel(profile);
  const platformRegistered = Boolean(
    profile?.stripe_connect_account_id || registerResult?.accountId || registerResult?.accountType === "custom",
  );
  const showConnectStep = !ready && !platformRegistered && embeddedMode === "none";
  const payoutsActive = Boolean(profile?.stripe_payouts_enabled);
  const connectEnv =
    (profile?.stripe_connect_environment as "live" | "test" | undefined) ??
    platformStatus?.connectEnvironment ??
    "live";
  const productionBlocked = Boolean(platformStatus?.productionBlocked);
  const pendingVerification = Boolean(platformStatus?.pendingVerification);
  const testModeActive = connectEnv === "test" || Boolean(profile?.stripe_connect_test_simulated);
  const testSimulated = Boolean(profile?.stripe_connect_test_simulated);
  const serverHasTestKey = Boolean(platformStatus?.testKeysConfigured);
  const schemaStripeEnv = schemaProbe?.schema_stripe_connect_environment ?? true;
  const schemaTestSimulated = schemaProbe?.schema_stripe_connect_test_simulated ?? true;
  const schemaIncomplete = !schemaStripeEnv || !schemaTestSimulated || !ledgerTableOk;

  const showTestDiagnostics =
    testModeActive || testSimulated || showTestTools || (!ready && productionBlocked);

  const showFinanceDashboard = ready || movements.length > 0 || payouts.length > 0;

  return (
    <div className="mx-auto max-w-lg space-y-4 pb-10">
      <AdminStoreSwitcher hint="Recebimentos são configurados por unidade — só administradores." />
      <AdminPayoutIntakeForm
        storeId={storeId}
        onSaved={(row, result) => {
          setIntakeSaved(row);
          setRegisterResult(result);
          void load({ silent: true });
        }}
      />

      <div>
        <h1 className="text-xl font-black flex items-center gap-2">
          <Wallet className="h-5 w-5 text-primary" />
          Recebimentos
        </h1>
        <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
          Sistema financeiro do restaurante — ligue a conta bancária, acompanhe pedidos pagos online e repasses.
          O cliente paga o total do pedido; a taxa da plataforma sai do repasse ao restaurante.
        </p>
        <Link to={nav.admin("diagnostics")} className="text-xs text-primary font-semibold underline mt-2 inline-block">
          Ver Estado do sistema
        </Link>
      </div>

      {loadError && (
        <div className="rounded-xl border border-destructive/40 bg-destructive/5 p-3 text-xs text-destructive">
          {loadError}
        </div>
      )}

      <ManualDatabaseSqlPanel
        schemaStripeEnv={schemaStripeEnv}
        schemaTestSimulated={schemaTestSimulated}
        ledgerOk={ledgerTableOk}
      />

      {(productionBlocked || pendingVerification || schemaIncomplete) && (
        <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 space-y-1">
          <div className="flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-700 shrink-0 mt-0.5" />
            <div className="text-xs leading-relaxed">
              <p className="font-black text-amber-900 dark:text-amber-200">Pagamentos reais pendentes de aprovação</p>
              <p className="text-muted-foreground mt-1">
                Pagamentos reais ficam bloqueados até a verificação terminar. Use o modo teste abaixo enquanto isso.
              </p>
            </div>
          </div>
        </div>
      )}

      {!ready && (
        <div className="rounded-2xl border-2 border-primary/30 bg-primary/5 p-4 space-y-3">
          <div className="flex items-start gap-3">
            <Share2 className="h-5 w-5 text-primary shrink-0 mt-0.5" />
            <div>
              <p className="font-black text-base">Enviar link ao dono (WhatsApp)</p>
              <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                Gere um link para o dono preencher os dados de recebimentos no telemóvel.
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            className="w-full h-11 font-bold gap-2"
            disabled={linkBusy}
            onClick={() => void generateOnboardingLink()}
          >
            {linkBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Share2 className="h-4 w-4" />}
            Gerar link para WhatsApp
          </Button>
          {onboardingLink && (
            <div className="rounded-lg border bg-muted/40 p-3 space-y-2">
              <p className="text-xs font-mono break-all">{onboardingLink}</p>
              <div className="flex gap-2 flex-wrap">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  className="gap-1"
                  onClick={() => {
                    void navigator.clipboard?.writeText(onboardingLink);
                    toast.success("Link copiado");
                  }}
                >
                  <Copy className="h-3.5 w-3.5" /> Copiar
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  asChild
                >
                  <a
                    href={`https://wa.me/?text=${encodeURIComponent(`Hola! Rellena los datos para recibir los cobros del restaurante: ${onboardingLink}`)}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Enviar WhatsApp
                  </a>
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {platformRegistered && !ready && (
        <div className="rounded-xl border border-green-500/40 bg-green-500/10 p-3 text-sm leading-relaxed text-green-900 dark:text-green-200">
          <p className="font-bold">Dados guardados na plataforma</p>
          <p className="text-xs mt-1 opacity-90">
            Pode completar aqui ou enviar o link acima ao dono. Pagamentos activos quando a análise terminar.
          </p>
        </div>
      )}

      {showConnectStep && (
        <div className="rounded-2xl border-2 border-green-600/40 bg-green-600/5 p-4 space-y-3">
          <div className="flex items-start gap-3">
            <ShieldCheck className="h-6 w-6 text-green-700 shrink-0" />
            <div>
              <p className="font-black text-base">Passo 2 — Confirmar ligação (só se o Passo 1 pedir)</p>
              <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                Só use este botão se o Passo 1 não tiver conseguido registar o restaurante automaticamente.
              </p>
            </div>
          </div>
          <Button
            className="w-full h-12 font-black text-base bg-green-700 hover:bg-green-800 text-white disabled:opacity-50"
            disabled={connectingRestaurant || !intakeSaved?.owner_email}
            onClick={() => void connectRestaurantAccount()}
          >
            {connectingRestaurant ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Ligar conta do restaurante (produção)
          </Button>
        </div>
      )}

      {showTestDiagnostics && (
        <TestCheckoutReadiness
          profile={profile}
          platformStatus={platformStatus}
          schemaStripeEnv={schemaStripeEnv}
          schemaTestSimulated={schemaTestSimulated}
          serverTestKey={serverHasTestKey}
          edgeFunctionsOk
        />
      )}

      {(testModeActive || testSimulated) && (
        <div className="rounded-lg border border-dashed px-3 py-2 text-xs font-bold uppercase tracking-wide text-amber-800 dark:text-amber-300 bg-amber-500/10">
          {testModeActive ? "Modo teste activo" : "Modo teste disponível"}
        </div>
      )}

      {!testModeActive && !productionBlocked && ready && (
        <div className="rounded-lg border border-green-500/30 px-3 py-2 text-xs font-bold uppercase tracking-wide text-green-800 dark:text-green-300 bg-green-500/10">
          Modo produção — pagamentos reais
        </div>
      )}

      {showFinanceDashboard && (
        <RestaurantFinanceDashboard
          snapshot={financeSnapshot}
          movements={movements}
          payouts={payouts}
          ibanLast4={profile?.stripe_iban_last4}
          businessName={profile?.stripe_business_name}
          lastPayoutAt={profile?.stripe_last_payout_at}
        />
      )}

      {!showFinanceDashboard && (
        <div className="rounded-xl border bg-muted/40 p-3 space-y-2 text-xs">
          <div className="flex items-start gap-2">
            <Info className="h-4 w-4 text-primary shrink-0 mt-0.5" />
            <p className="text-muted-foreground leading-relaxed">
              Quando os pagamentos online estiverem activos, verá aqui o extrato completo, saldos e previsão de
              depósito no banco. O cliente paga o total do pedido; a taxa de serviço da plataforma aparece só no
              extrato, sem surpresas no checkout.
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-xl border bg-card p-3">
          <p className="text-[10px] text-muted-foreground uppercase font-bold">Pagamentos online</p>
          <p className="text-sm font-bold mt-0.5 capitalize">
            {connectStatus === "ready"
              ? testModeActive
                ? "Modo teste activo"
                : "Activos"
              : connectStatus === "pending"
                ? "Pendentes"
                : "Por activar"}
          </p>
        </div>
        <div className="rounded-xl border bg-card p-3">
          <p className="text-[10px] text-muted-foreground uppercase font-bold">Depósito no banco</p>
          <p className="text-sm font-bold mt-0.5 capitalize">
            {payoutsActive ? "Activo" : profile?.stripe_payout_status || "Pendente"}
          </p>
        </div>
      </div>

      {!showTestTools && (
        <Button
          variant="ghost"
          size="sm"
          className="w-full text-xs text-muted-foreground"
          onClick={() => setShowTestTools(true)}
        >
          Ferramentas de teste (cartão 4242) — opcional
        </Button>
      )}

      {showTestTools && (
        <div className="rounded-2xl border border-dashed border-amber-500/40 bg-amber-500/5 p-4 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <p className="font-bold text-sm">Modo teste (opcional)</p>
            <Button variant="ghost" size="sm" onClick={() => setShowTestTools(false)}>
              Fechar
            </Button>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Só para testar pedidos com cartão 4242 — não precisa disto para vender a sério hoje.
          </p>
          <Button
            className="w-full h-11 font-bold bg-amber-600 hover:bg-amber-700 text-white disabled:opacity-50"
            disabled={testProvisionBusy || schemaIncomplete}
            onClick={() => void activateTestReceivables()}
          >
            {testProvisionBusy ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Activar recebimentos de teste
          </Button>
          <Button
            variant="outline"
            className="w-full h-10 font-semibold gap-2"
            disabled={linkBusy}
            onClick={() => void generateOnboardingLink()}
          >
            {linkBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Share2 className="h-4 w-4" />}
            Gerar link para o restaurante (alternativa)
          </Button>
          {onboardingLink && (
            <div className="rounded-lg border bg-muted/40 p-3 space-y-2">
              <p className="text-xs font-mono break-all">{onboardingLink}</p>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="gap-1"
                onClick={() => {
                  void navigator.clipboard?.writeText(onboardingLink);
                  toast.success("Link copiado");
                }}
              >
                <Copy className="h-3.5 w-3.5" /> Copiar link
              </Button>
            </div>
          )}
        </div>
      )}

      {embeddedMode === "onboarding" && (
        <div className="rounded-2xl border bg-card p-4 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <p className="font-black text-sm">Verificação da conta</p>
            <Button variant="ghost" size="sm" onClick={() => setEmbeddedMode("none")}>
              Fechar
            </Button>
          </div>
          {intakeSaved?.owner_email && (
            <p className="text-xs text-muted-foreground leading-relaxed">
              Use o e-mail <strong className="text-foreground">{intakeSaved.owner_email}</strong> — é o do dono do
              restaurante. Se pedir login, é só para confirmar a identidade (obrigatório por lei).
            </p>
          )}
          <StripeConnectEmbeddedPanel
            storeId={storeId}
            variant="onboarding"
            connectEnvironment="live"
            productionBlocked={false}
            onComplete={onEmbeddedComplete}
            onTestProvisioned={(msg) => toast.success(msg)}
          />
        </div>
      )}

      {ready && (
        <div className="rounded-xl border border-green-500/40 bg-green-500/10 p-3 text-sm font-semibold text-green-800 dark:text-green-300 flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 shrink-0" />
          {testModeActive
            ? testSimulated
              ? "Recebimentos de teste simulados — checkout disponível, sem dinheiro real."
              : "Recebimentos em modo teste — cartão simulado, sem dinheiro real."
            : "Recebimentos online activos — cartão, Apple Pay e Google Pay."}
        </div>
      )}

      {(ready || profile?.stripe_connect_account_id) && embeddedMode !== "management" && (
        <Button
          variant="outline"
          className="w-full h-11 font-bold gap-2"
          onClick={() => setEmbeddedMode("management")}
        >
          <Settings2 className="h-4 w-4" />
          Gerir conta bancária e documentos
        </Button>
      )}

      {embeddedMode === "management" && (
        <div className="rounded-2xl border bg-card p-4 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <p className="font-black text-sm">Conta bancária e repasses</p>
            <Button variant="ghost" size="sm" onClick={() => setEmbeddedMode("none")}>
              Fechar
            </Button>
          </div>
          <StripeConnectEmbeddedPanel
            storeId={storeId}
            variant="management"
            connectEnvironment={connectEnv}
            productionBlocked={productionBlocked || pendingVerification}
            onComplete={onEmbeddedComplete}
          />
        </div>
      )}

      <Button
        variant="secondary"
        size="sm"
        className="w-full"
        onClick={refreshStatus}
        disabled={syncing}
      >
        {syncing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
        Actualizar dados financeiros
      </Button>
    </div>
  );
};

export default FinancePage;
