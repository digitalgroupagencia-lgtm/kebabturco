import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAdminStoreId } from "@/hooks/useAdminStoreId";
import { Button } from "@/components/ui/button";
import OpsCompactCard from "@/components/panel/OpsCompactCard";
import { toast } from "sonner";
import {
  fetchStoreFinancialProfile,
  syncStripeConnectStatus,
  type StoreFinancialProfile,
} from "@/services/orderService";
import { computeOnlineServiceFeeEur, ONLINE_SERVICE_FEE_LABEL } from "@/lib/processingFee";
import { isStripeConnectReady, stripeConnectStatusLabel } from "@/lib/stripeConnectReady";
import StripeConnectEmbeddedPanel from "@/components/finance/StripeConnectEmbeddedPanel";
import {
  Loader2,
  Wallet,
  ArrowDownLeft,
  Building2,
  ShieldCheck,
  Info,
  Settings2,
} from "lucide-react";
import { Link } from "react-router-dom";
import { nav } from "@/lib/navPaths";

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

const FinancePage = () => {
  const { storeId } = useAdminStoreId();
  const [profile, setProfile] = useState<StoreFinancialProfile | null>(null);
  const [ledger, setLedger] = useState<LedgerRow[]>([]);
  const [payouts, setPayouts] = useState<PayoutRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [embeddedMode, setEmbeddedMode] = useState<"none" | "onboarding" | "management">("none");
  const [syncing, setSyncing] = useState(false);

  const load = useCallback(async () => {
    if (!storeId) return;
    setLoading(true);
    const [prof, { data: lg }, { data: po }] = await Promise.all([
      fetchStoreFinancialProfile(storeId),
      supabase
        .from("store_payment_ledger")
        .select("id,description,gross_cents,platform_fee_cents,processing_fee_cents,net_cents,created_at")
        .eq("store_id", storeId)
        .order("created_at", { ascending: false })
        .limit(30),
      supabase
        .from("store_payouts")
        .select("id,amount_cents,status,arrival_date,created_at")
        .eq("store_id", storeId)
        .order("created_at", { ascending: false })
        .limit(10),
    ]);
    setProfile(prof);
    setLedger((lg as LedgerRow[]) || []);
    setPayouts((po as PayoutRow[]) || []);
    setLoading(false);
  }, [storeId]);

  useEffect(() => {
    load();
  }, [load]);

  const refreshStatus = useCallback(async () => {
    if (!storeId) return;
    setSyncing(true);
    try {
      await syncStripeConnectStatus(storeId);
      await load();
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

  const balanceNet = ledger.reduce((s, r) => s + r.net_cents, 0);
  const exampleOnlineFee = computeOnlineServiceFeeEur(20);

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

  return (
    <div className="mx-auto max-w-lg space-y-4 pb-10">
      <div>
        <h1 className="text-xl font-black flex items-center gap-2">
          <Wallet className="h-5 w-5 text-primary" />
          Recebimentos
        </h1>
        <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
          Sistema financeiro do restaurante — ligue a conta bancária, acompanhe pedidos pagos online e repasses.
          O cliente paga a {ONLINE_SERVICE_FEE_LABEL.toLowerCase()} no checkout; o restaurante recebe o valor integral
          dos produtos e entrega.
        </p>
        <Link to={nav.admin("diagnostics")} className="text-xs text-primary font-semibold underline mt-2 inline-block">
          Ver Estado do sistema
        </Link>
      </div>

      <div className="rounded-xl border bg-muted/40 p-3 space-y-2 text-xs">
        <div className="flex items-start gap-2">
          <Info className="h-4 w-4 text-primary shrink-0 mt-0.5" />
          <div className="space-y-1 text-muted-foreground leading-relaxed">
            <p>
              <strong className="text-foreground">Exemplo pedido 20,00€:</strong> cliente paga cerca de{" "}
              {(20 + exampleOnlineFee).toFixed(2)}€ (inclui {exampleOnlineFee.toFixed(2)}€ de taxa online).
            </p>
            <p>O restaurante recebe <strong className="text-foreground">20,00€</strong>.</p>
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
            {connectStatus === "ready" ? "Activos" : connectStatus === "pending" ? "Pendentes" : "Por activar"}
          </p>
        </div>
        <div className="rounded-xl border bg-card p-3">
          <p className="text-[10px] text-muted-foreground uppercase font-bold">Repasse bancário</p>
          <p className="text-sm font-bold mt-0.5 capitalize">
            {payoutsActive ? "Activo" : profile?.stripe_payout_status || "Pendente"}
          </p>
        </div>
      </div>

      {!ready && embeddedMode !== "onboarding" && (
        <div className="rounded-2xl border-2 border-primary/30 bg-primary/5 p-4 space-y-3">
          <div className="flex items-start gap-3">
            <ShieldCheck className="h-6 w-6 text-primary shrink-0" />
            <div>
              <p className="font-black text-base">Conectar recebimentos</p>
              <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                Preencha aqui os dados da empresa, identidade e conta bancária. Tudo fica dentro deste painel — sem
                sair para outro site.
              </p>
            </div>
          </div>
          <Button
            className="w-full h-12 font-black text-base"
            onClick={() => setEmbeddedMode("onboarding")}
          >
            Conectar recebimentos do restaurante
          </Button>
        </div>
      )}

      {embeddedMode === "onboarding" && (
        <div className="rounded-2xl border bg-card p-4 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <p className="font-black text-sm">Activar recebimentos</p>
            <Button variant="ghost" size="sm" onClick={() => setEmbeddedMode("none")}>
              Fechar
            </Button>
          </div>
          <StripeConnectEmbeddedPanel
            storeId={storeId}
            variant="onboarding"
            onComplete={onEmbeddedComplete}
          />
        </div>
      )}

      {ready && (
        <div className="rounded-xl border border-green-500/40 bg-green-500/10 p-3 text-sm font-semibold text-green-800 dark:text-green-300 flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 shrink-0" />
          Recebimentos online activos — cartão, Apple Pay e Google Pay.
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
