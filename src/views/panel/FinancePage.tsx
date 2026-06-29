import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useStorePayoutsRealtime } from "@/hooks/useStorePayoutsRealtime";
import { useAdminStoreId } from "@/hooks/useAdminStoreId";
import { useStaffT } from "@/hooks/useStaffT";
import { panelT } from "@/lib/staffPanelLocale";
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
  enableStoreBizumPayments,
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
import CheckoutActivationPanel from "@/components/finance/CheckoutActivationPanel";
import {
  fetchStripeConnectEdgeHealth,
  isStripeConnectEdgeUpToDate,
} from "@/lib/stripeEdgeVersion";
import { probeCheckoutStripeRpc, probeSchemaFallback } from "@/services/operationalDiagnosticsService";
import {
  Loader2,
  Wallet,
  ShieldCheck,
  AlertTriangle,
  Info,
  Settings2,
  Share2,
  Copy,
  RefreshCw,
  Smartphone,
} from "lucide-react";
import { Link } from "react-router-dom";
import { nav } from "@/lib/navPaths";
import AdminStoreSwitcher from "@/components/admin/AdminStoreSwitcher";
import AdminPayoutIntakeForm from "@/components/finance/AdminPayoutIntakeForm";
import RestaurantFinanceDashboard from "@/components/finance/RestaurantFinanceDashboard";
import {
  fetchFinanceMovements,
  fetchFinancePayouts,
  refreshStripeFinanceExtras,
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
  const { t, lang } = useStaffT();
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
  const [bizumBusy, setBizumBusy] = useState(false);
  const [testProvisionBusy, setTestProvisionBusy] = useState(false);
  const [linkBusy, setLinkBusy] = useState(false);
  const [onboardingLink, setOnboardingLink] = useState<string | null>(null);
  const [intakeSaved, setIntakeSaved] = useState<StorePayoutIntake | null>(null);
  const [registerResult, setRegisterResult] = useState<SavePayoutIntakeResult | null>(null);
  const [connectingRestaurant, setConnectingRestaurant] = useState(false);
  const [showTestTools, setShowTestTools] = useState(false);
  const [schemaProbe, setSchemaProbe] = useState<Awaited<ReturnType<typeof probeSchemaFallback>> | null>(null);
  const [checkoutRpcReady, setCheckoutRpcReady] = useState(true);
  const [edgeNeedsDeploy, setEdgeNeedsDeploy] = useState(false);

  const load = useCallback(async (options?: { silent?: boolean }) => {
    if (!storeId) return;
    if (!options?.silent) {
      setLoading(true);
      setLoadError(null);
    }
    try {
      const [prof, mv, po] = await Promise.all([
        fetchStoreFinancialProfile(storeId).catch(() => null),
        fetchFinanceMovements(storeId),
        fetchFinancePayouts(storeId),
      ]);
      setProfile(prof);
      setMovements(mv);
      setPayouts(po);
      if (!options?.silent) setLoading(false);

      const connectReady = isStripeConnectReady(prof);

      void (async () => {
        if (connectReady) {
          try {
            const { snapshot } = await refreshStripeFinanceExtras(storeId);
            if (snapshot) setFinanceSnapshot(snapshot);
            const freshPo = await fetchFinancePayouts(storeId);
            setPayouts(freshPo);
          } catch {
            /* saldo Stripe opcional */
          }
        }

        const [schema, serverPlatform, ledgerOk, checkoutRpc, edgeHealth] = await Promise.all([
          probeSchemaFallback().catch(() => null),
          fetchStripePlatformStatus(storeId).catch(() => null),
          probeLedgerTable(storeId),
          probeCheckoutStripeRpc(),
          fetchStripeConnectEdgeHealth(),
        ]);
        setCheckoutRpcReady(checkoutRpc);
        setEdgeNeedsDeploy(!isStripeConnectEdgeUpToDate(edgeHealth));
        setPlatformStatus(serverPlatform ?? inferStripePlatformStatus(prof));
        setSchemaProbe(schema);
        setLedgerTableOk(ledgerOk);
      })();
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : t("finance.admin.load_error"));
      if (!options?.silent) setLoading(false);
    }
  }, [storeId, t]);

  useEffect(() => {
    void load();
  }, [load]);

  useStorePayoutsRealtime(storeId, () => {
    void load({ silent: true });
  });

  const refreshStatus = useCallback(async () => {
    if (!storeId) return;
    setSyncing(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();

      const syncResult = await syncStripeConnectStatus(storeId, { silent: true }).catch(() => null);
      if (syncResult?.ready) {
        await enableStoreBizumPayments(storeId).catch(() => null);
      }
      if (syncResult?.bizumMessage) {
        if (syncResult.bizumEnabled) toast.success(syncResult.bizumMessage);
        else toast.message(syncResult.bizumMessage);
      }

      let fresh = await fetchStoreFinancialProfile(storeId);
      const stillNotReady = !isStripeConnectReady(fresh);
      const hasIntake = Boolean(intakeSaved?.owner_email?.trim());

      if (stillNotReady && session && hasIntake) {
        try {
          const resync = await resyncStorePayoutIntakeToStripe(storeId);
          if (resync.message) toast.message(resync.message);
          await syncStripeConnectStatus(storeId, { silent: true }).catch(() => null);
          fresh = await fetchStoreFinancialProfile(storeId);
        } catch {
          /* reenvio opcional */
        }
      }

      await load({ silent: true });
      const readyNow = isStripeConnectReady(fresh);

      if (readyNow) {
        toast.success(t("finance.admin.toast.sync_ok"));
      } else if (!session) {
        toast.error(t("finance.admin.toast.sync_login"));
      } else if (!checkoutRpcReady) {
        toast.warning(t("finance.admin.toast.sync_sql"));
      } else {
        toast.warning(t("finance.admin.toast.sync_pending"));
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("finance.admin.toast.sync_error"));
    } finally {
      setSyncing(false);
    }
  }, [storeId, load, intakeSaved, checkoutRpcReady, t]);

  const activateBizum = useCallback(async () => {
    if (!storeId) return;
    setBizumBusy(true);
    try {
      const result = await enableStoreBizumPayments(storeId);
      if (result.enabled) toast.success(result.message || t("finance.admin.toast.bizum_ok"));
      else toast.warning(result.message || t("finance.admin.toast.bizum_unavailable"));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("finance.admin.toast.bizum_error"));
    } finally {
      setBizumBusy(false);
    }
  }, [storeId]);

  const onEmbeddedComplete = useCallback(async () => {
    setEmbeddedMode("none");
    await refreshStatus();
  }, [refreshStatus]);

  const connectRestaurantAccount = useCallback(async () => {
    if (!storeId) return;
    if (!intakeSaved?.owner_email?.trim()) {
      toast.error(t("finance.admin.toast.save_first"));
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
          session.message || t("finance.admin.toast.connect_registered"),
        );
        return;
      }
      setEmbeddedMode("onboarding");
      toast.success(
        `Formulário aberto, use o e-mail ${intakeSaved.owner_email} (já fica pré-preenchido).`,
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("finance.admin.toast.connect_error"));
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
      toast.success(t("finance.admin.toast.link_generated"));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("finance.admin.toast.link_error"));
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
      toast.success(result.message || t("finance.admin.toast.test_activated"));
      setEmbeddedMode("none");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("finance.admin.toast.test_error"));
    } finally {
      setTestProvisionBusy(false);
    }
  }, [storeId, load]);

  if (!storeId) {
    return <div className="p-6 text-sm text-muted-foreground">{t("finance.admin.no_store")}</div>;
  }

  if (loading) {
    return (
      <div className="p-6 flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> {t("common.loading")}
      </div>
    );
  }

  const ready = isStripeConnectReady(profile);
  const connectStatus = stripeConnectStatusLabel(profile);
  const platformRegistered = Boolean(
    profile?.stripe_connect_account_id || registerResult?.accountId || registerResult?.accountType === "custom",
  );
  const showConnectStep = !ready && embeddedMode === "none";
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
    <div className="w-full max-w-[1600px] px-4 sm:px-6 space-y-4 pb-10">
      <AdminStoreSwitcher hint={t("finance.admin.store_hint")} />
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
          {t("finance.admin.title")}
        </h1>
        <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{t("finance.admin.subtitle_full")}</p>
        <Link to={nav.admin("diagnostics")} className="text-xs text-primary font-semibold underline mt-2 inline-block">
          {t("finance.admin.diagnostics_link")}
        </Link>
      </div>

      {loadError && (
        <div className="rounded-xl border border-destructive/40 bg-destructive/5 p-3 text-xs text-destructive">
          {loadError}
        </div>
      )}

      {edgeNeedsDeploy && (
        <div className="rounded-xl border-2 border-destructive/50 bg-destructive/10 p-4 space-y-2">
          <p className="text-sm font-black text-destructive">{t("finance.admin.edge_outdated")}</p>
          <p className="text-xs text-muted-foreground leading-relaxed">{t("finance.admin.edge_hint_full")}</p>
          <p className="text-xs font-semibold text-foreground">{t("finance.admin.edge_deploy_hint")}</p>
        </div>
      )}

      <ManualDatabaseSqlPanel
        schemaStripeEnv={schemaStripeEnv}
        schemaTestSimulated={schemaTestSimulated}
        ledgerOk={ledgerTableOk}
      />

      {!ready && (
        <CheckoutActivationPanel
          syncing={syncing}
          checkoutRpcReady={checkoutRpcReady}
          onSync={() => void refreshStatus()}
        />
      )}

      {(productionBlocked || pendingVerification || schemaIncomplete) && (
        <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 space-y-1">
          <div className="flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-700 shrink-0 mt-0.5" />
            <div className="text-xs leading-relaxed">
              <p className="font-black text-amber-900 dark:text-amber-200">{t("finance.admin.pending_real")}</p>
              <p className="text-muted-foreground mt-1">{t("finance.admin.pending_real_hint")}</p>
            </div>
          </div>
        </div>
      )}

      {!ready && (
        <div className="rounded-2xl border-2 border-primary/30 bg-primary/5 p-4 space-y-3">
          <div className="flex items-start gap-3">
            <Share2 className="h-5 w-5 text-primary shrink-0 mt-0.5" />
            <div>
              <p className="font-black text-base">{t("finance.admin.whatsapp.title")}</p>
              <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{t("finance.admin.whatsapp.hint")}</p>
            </div>
          </div>
          <Button
            variant="outline"
            className="w-full h-11 font-bold gap-2"
            disabled={linkBusy}
            onClick={() => void generateOnboardingLink()}
          >
            {linkBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Share2 className="h-4 w-4" />}
            {t("finance.admin.whatsapp.btn")}
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
                    toast.success(t("finance.admin.link_copied"));
                  }}
                >
                  <Copy className="h-3.5 w-3.5" /> {t("finance.admin.copy")}
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  asChild
                >
                  <a
                    href={`https://wa.me/?text=${encodeURIComponent(panelT(lang, "finance.admin.whatsapp.message", { link: onboardingLink }))}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {t("finance.admin.send_whatsapp")}
                  </a>
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {platformRegistered && !ready && (
        <div className="rounded-xl border border-green-500/40 bg-green-500/10 p-3 text-sm leading-relaxed text-green-900 dark:text-green-200">
          <p className="font-bold">{t("finance.admin.platform_saved")}</p>
          <p className="text-xs mt-1 opacity-90">{t("finance.admin.platform_saved_hint")}</p>
        </div>
      )}

      {showConnectStep && (
        <div className="rounded-2xl border-2 border-green-600/40 bg-green-600/5 p-4 space-y-3">
          <div className="flex items-start gap-3">
            <ShieldCheck className="h-6 w-6 text-green-700 shrink-0" />
            <div>
              <p className="font-black text-base">
                {platformRegistered ? t("finance.admin.connect.title") : t("finance.admin.connect.step2")}
              </p>
              <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                {platformRegistered ? t("finance.admin.connect.hint_registered") : t("finance.admin.connect.hint_fallback")}
              </p>
            </div>
          </div>
          <Button
            className="w-full h-12 font-black text-base bg-green-700 hover:bg-green-800 text-white disabled:opacity-50"
            disabled={connectingRestaurant || !intakeSaved?.owner_email}
            onClick={() => void connectRestaurantAccount()}
          >
            {connectingRestaurant ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            {t("finance.admin.connect.btn")}
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
          {testModeActive ? t("finance.admin.test_mode") : t("finance.admin.test_available")}
        </div>
      )}

      {!testModeActive && !productionBlocked && ready && (
        <div className="rounded-lg border border-green-500/30 px-3 py-2 text-xs font-bold uppercase tracking-wide text-green-800 dark:text-green-300 bg-green-500/10">
          {t("finance.admin.prod_mode")}
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
              {t("finance.admin.dashboard_hint_full")}
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-xl border bg-card p-3">
          <p className="text-[10px] text-muted-foreground uppercase font-bold">{t("finance.admin.online_payments")}</p>
          <p className="text-sm font-bold mt-0.5 capitalize">
            {connectStatus === "ready"
              ? testModeActive
                ? t("finance.admin.test_mode")
                : t("finance.admin.status.active")
              : connectStatus === "pending"
                ? t("finance.admin.status.pending")
                : t("finance.admin.status.inactive")}
          </p>
        </div>
        <div className="rounded-xl border bg-card p-3">
          <p className="text-[10px] text-muted-foreground uppercase font-bold">{t("finance.admin.bank_deposit")}</p>
          <p className="text-sm font-bold mt-0.5 capitalize">
            {payoutsActive ? t("finance.admin.deposit.active") : profile?.stripe_payout_status || t("finance.admin.deposit.pending")}
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
          {t("finance.admin.test_tools")}
        </Button>
      )}

      {showTestTools && (
        <div className="rounded-2xl border border-dashed border-amber-500/40 bg-amber-500/5 p-4 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <p className="font-bold text-sm">{t("finance.admin.test_section")}</p>
            <Button variant="ghost" size="sm" onClick={() => setShowTestTools(false)}>
              {t("common.close")}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">{t("finance.admin.test_hint_full")}</p>
          <Button
            className="w-full h-11 font-bold bg-amber-600 hover:bg-amber-700 text-white disabled:opacity-50"
            disabled={testProvisionBusy || schemaIncomplete}
            onClick={() => void activateTestReceivables()}
          >
            {testProvisionBusy ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            {t("finance.admin.activate_test")}
          </Button>
          <Button
            variant="outline"
            className="w-full h-10 font-semibold gap-2"
            disabled={linkBusy}
            onClick={() => void generateOnboardingLink()}
          >
            {linkBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Share2 className="h-4 w-4" />}
            {t("finance.admin.test_link_alt")}
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
                  toast.success(t("finance.admin.link_copied"));
                }}
              >
                <Copy className="h-3.5 w-3.5" /> {t("finance.admin.copy_link")}
              </Button>
            </div>
          )}
        </div>
      )}

      {embeddedMode === "onboarding" && (
        <div className="rounded-2xl border bg-card p-4 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <p className="font-black text-sm">{t("finance.admin.verify.title")}</p>
            <Button variant="ghost" size="sm" onClick={() => setEmbeddedMode("none")}>
              {t("common.close")}
            </Button>
          </div>
          {intakeSaved?.owner_email && (
            <p className="text-xs text-muted-foreground leading-relaxed">
              {panelT(lang, "finance.admin.verify.email_hint", { email: intakeSaved.owner_email })}
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
              ? t("finance.admin.ready_test_simulated")
              : t("finance.admin.ready_test_card")
            : t("finance.admin.ready_live")}
        </div>
      )}

      {(ready || profile?.stripe_connect_account_id) && embeddedMode !== "management" && (
        <Button
          variant="outline"
          className="w-full h-11 font-bold gap-2"
          onClick={() => setEmbeddedMode("management")}
        >
          <Settings2 className="h-4 w-4" />
          {t("finance.admin.manage_bank")}
        </Button>
      )}

      {embeddedMode === "management" && (
        <div className="rounded-2xl border bg-card p-4 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <p className="font-black text-sm">{t("finance.admin.bank_section")}</p>
            <Button variant="ghost" size="sm" onClick={() => setEmbeddedMode("none")}>
              {t("common.close")}
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

      <div className="grid grid-cols-1 gap-2">
        {ready && !testModeActive && (
          <Button
            variant="outline"
            className="w-full h-11 font-bold gap-2"
            onClick={() => void activateBizum()}
            disabled={bizumBusy || syncing}
          >
            {bizumBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Smartphone className="h-4 w-4" />}
            {t("finance.admin.activate_bizum")}
          </Button>
        )}
        <Button
          variant={ready ? "secondary" : "default"}
          className="w-full h-11 font-bold gap-2"
          onClick={refreshStatus}
          disabled={syncing}
        >
          {syncing ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
          {t("finance.admin.sync_stripe")}
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="w-full"
          onClick={() => void load({ silent: false })}
          disabled={loading || syncing}
        >
          {t("finance.admin.refresh")}
        </Button>
      </div>
    </div>
  );
};

export default FinancePage;
