import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAdminStoreId } from "@/hooks/useAdminStoreId";
import { Button } from "@/components/ui/button";
import OpsCompactCard from "@/components/panel/OpsCompactCard";
import { toast } from "sonner";
import {
  activateLiveStripeConnect,
  createStoreOnboardingLink,
  fetchStoreFinancialProfile,
  fetchStripePlatformStatus,
  provisionTestStripeConnect,
  syncStripeConnectStatus,
  type StoreFinancialProfile,
  type StripePlatformStatus,
} from "@/services/orderService";
import type { StorePayoutIntake } from "@/services/payoutIntakeService";
import { inferStripePlatformStatus } from "@/lib/inferStripePlatformStatus";
import { computePlatformDeductionEur, PLATFORM_FEE_EUR } from "@/lib/processingFee";
import { isStripeConnectReady, stripeConnectStatusLabel } from "@/lib/stripeConnectReady";
import StripeConnectEmbeddedPanel from "@/components/finance/StripeConnectEmbeddedPanel";
import TestCheckoutReadiness from "@/components/finance/TestCheckoutReadiness";
import ManualDatabaseSqlPanel from "@/components/finance/ManualDatabaseSqlPanel";
import { probeSchemaFallback } from "@/services/operationalDiagnosticsService";
import {
  Loader2,
  Wallet,
  ArrowDownLeft,
  Building2,
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

type LedgerRow = {
  id: string;
  description: string | null;
  gross_cents: number;
  platform_fee_cents: number;
  processing_fee_cents: number;
  net_cents: number;
  created_at: string;
};

type PayoutRow = {
  id: string;
  amount_cents: number;
  status: string;
  arrival_date: string | null;
  created_at: string;
};

const centsToEur = (c: number) => (c / 100).toFixed(2);

async function fetchLedgerSafe(storeId: string): Promise<{ rows: LedgerRow[]; ok: boolean }> {
  try {
    const { data, error } = await supabase
      .from("store_payment_ledger")
      .select("id,description,gross_cents,platform_fee_cents,processing_fee_cents,net_cents,created_at")
      .eq("store_id", storeId)
      .order("created_at", { ascending: false })
      .limit(30);
    if (error) return { rows: [], ok: false };
    return { rows: (data as LedgerRow[]) || [], ok: true };
  } catch {
    return { rows: [], ok: false };
  }
}

async function fetchPayoutsSafe(storeId: string): Promise<PayoutRow[]> {
  try {
    const { data, error } = await supabase
      .from("store_payouts")
      .select("id,amount_cents,status,arrival_date,created_at")
      .eq("store_id", storeId)
      .order("created_at", { ascending: false })
      .limit(10);
    if (error) return [];
    return (data as PayoutRow[]) || [];
  } catch {
    return [];
  }
}

const FinancePage = () => {
  const { storeId } = useAdminStoreId();
  const [profile, setProfile] = useState<StoreFinancialProfile | null>(null);
  const [ledger, setLedger] = useState<LedgerRow[]>([]);
  const [payouts, setPayouts] = useState<PayoutRow[]>([]);
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
      const [prof, schema, ledgerRes, po, serverPlatform] = await Promise.all([
        fetchStoreFinancialProfile(storeId).catch(() => null),
        probeSchemaFallback().catch(() => null),
        fetchLedgerSafe(storeId),
        fetchPayoutsSafe(storeId),
        fetchStripePlatformStatus(storeId).catch(() => null),
      ]);
      setProfile(prof);
      setPlatformStatus(serverPlatform ?? inferStripePlatformStatus(prof));
      setSchemaProbe(schema);
      setLedger(ledgerRes.rows);
      setLedgerTableOk(ledgerRes.ok);
      setPayouts(po);
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
      await load({ silent: true });
      toast.success("Estado dos recebimentos actualizado");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao actualizar");
    } finally {
      setSyncing(false);
    }
  }, [storeId, load]);

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

  const balanceNet = ledger.reduce((s, r) => s + r.net_cents, 0);
  const exampleDeduction = computePlatformDeductionEur(20);

  return (
    <div className="mx-auto max-w-lg space-y-4 pb-10">
      <AdminStoreSwitcher hint="Recebimentos são configurados por unidade — só administradores." />
      <AdminPayoutIntakeForm storeId={storeId} onSaved={setIntakeSaved} />

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
              <p className="font-black text-amber-900 dark:text-amber-200">Plataforma real pendente de aprovação</p>
              <p className="text-muted-foreground mt-1">
                Pagamentos reais ficam bloqueados até a Stripe aprovar. Use o modo teste abaixo — não depende dessa
                aprovação.
              </p>
            </div>
          </div>
        </div>
      )}

      {!ready && embeddedMode === "none" && (
        <div className="rounded-2xl border-2 border-green-600/40 bg-green-600/5 p-4 space-y-3">
          <div className="flex items-start gap-3">
            <ShieldCheck className="h-6 w-6 text-green-700 shrink-0" />
            <div>
              <p className="font-black text-base">Passo 2 — Confirmar ligação (só se o Passo 1 pedir)</p>
              <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                Depois de guardar, o restaurante fica registado como cliente Connect na plataforma Euro Business
                Group — não é um novo registo Stripe. Este botão só aparece se faltar algum passo de verificação.
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

      <div className="rounded-xl border bg-muted/40 p-3 space-y-2 text-xs">
        <div className="flex items-start gap-2">
          <Info className="h-4 w-4 text-primary shrink-0 mt-0.5" />
          <div className="space-y-1 text-muted-foreground leading-relaxed">
            <p>
              <strong className="text-foreground">Exemplo pedido 20,00€:</strong> o cliente paga{" "}
              <strong className="text-foreground">20,00€</strong> (total simples, sem taxa extra).
            </p>
            <p>
              A taxa da plataforma (cerca de {PLATFORM_FEE_EUR.toFixed(2)}€ + processamento, ~{exampleDeduction.toFixed(2)}€ neste exemplo) sai do repasse do restaurante — o restaurante recebe ~{(20 - exampleDeduction).toFixed(2)}€ líquidos.
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-2xl bg-gradient-to-br from-primary/90 to-primary p-5 text-primary-foreground shadow-lg">
        <p className="text-xs opacity-90 uppercase tracking-wide font-semibold">Total recebido (pedidos online)</p>
        <p className="text-4xl font-black tabular-nums mt-1">{centsToEur(balanceNet)}€</p>
        <p className="text-[11px] opacity-80 mt-2">Valor dos produtos + entrega</p>
      </div>

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
          <p className="text-[10px] text-muted-foreground uppercase font-bold">Repasse bancário</p>
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
        Actualizar estado dos recebimentos
      </Button>

      {profile?.stripe_iban_last4 && (
        <OpsCompactCard
          title={profile.stripe_business_name || "Conta bancária"}
          summary={`IBAN ···· ${profile.stripe_iban_last4}`}
          meta={
            profile.stripe_last_payout_at
              ? `Último repasse: ${new Date(profile.stripe_last_payout_at).toLocaleDateString("pt-PT")}`
              : undefined
          }
          badges={payoutsActive ? ["Repasse activo"] : []}
          editable={false}
          actions={<Building2 className="h-4 w-4 text-muted-foreground" />}
        />
      )}

      <div>
        <h2 className="text-sm font-bold mb-2 flex items-center gap-1.5">
          <ArrowDownLeft className="h-4 w-4" /> Movimentos recentes
        </h2>
        <div className="space-y-2">
          {ledger.map((row) => (
            <OpsCompactCard
              key={row.id}
              title={row.description || "Pagamento online"}
              summary={`Valor do pedido ${centsToEur(row.net_cents)}€`}
              meta={`${new Date(row.created_at).toLocaleString("pt-PT", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}`}
              editable={false}
            />
          ))}
          {ledger.length === 0 && (
            <p className="text-center text-sm text-muted-foreground py-8 border border-dashed rounded-2xl">
              Ainda sem pagamentos online registados
            </p>
          )}
        </div>
      </div>

      {payouts.length > 0 && (
        <div>
          <h2 className="text-sm font-bold mb-2">Repasses para o banco</h2>
          <div className="space-y-2">
            {payouts.map((p) => (
              <OpsCompactCard
                key={p.id}
                title={`${centsToEur(p.amount_cents)}€`}
                summary={p.arrival_date ? `Chegada ${p.arrival_date}` : "A processar"}
                badges={[p.status === "failed" ? "Falhou" : p.status]}
                editable={false}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default FinancePage;
