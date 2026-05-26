import { useEffect, useState, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAdminStoreId } from "@/hooks/useAdminStoreId";
import { Button } from "@/components/ui/button";
import OpsCompactCard from "@/components/panel/OpsCompactCard";
import { toast } from "sonner";
import {
  createStripeConnectLink,
  fetchStoreFinancialProfile,
  provisionStripeConnect,
  type StoreFinancialProfile,
} from "@/services/orderService";
import { PLATFORM_FEE_EUR, estimateProcessingFeeEur } from "@/lib/processingFee";
import { Loader2, Wallet, ArrowDownLeft, Building2, ShieldCheck } from "lucide-react";
import { Link } from "react-router-dom";
import { nav } from "@/lib/navPaths";

type LedgerRow = {
  id: string;
  description: string | null;
  gross_cents: number;
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
  const [searchParams, setSearchParams] = useSearchParams();
  const [profile, setProfile] = useState<StoreFinancialProfile | null>(null);
  const [ledger, setLedger] = useState<LedgerRow[]>([]);
  const [payouts, setPayouts] = useState<PayoutRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [activating, setActivating] = useState(false);

  const load = useCallback(async () => {
    if (!storeId) return;
    setLoading(true);
    const [prof, { data: lg }, { data: po }] = await Promise.all([
      fetchStoreFinancialProfile(storeId),
      supabase
        .from("store_payment_ledger")
        .select("id,description,gross_cents,processing_fee_cents,net_cents,created_at")
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

  useEffect(() => {
    if (searchParams.get("onboarding") === "done") {
      searchParams.delete("onboarding");
      setSearchParams(searchParams, { replace: true });
      load();
      toast.success("Dados bancários actualizados");
    }
  }, [searchParams, setSearchParams, load]);

  const activatePayouts = async () => {
    if (!storeId) return;
    setActivating(true);
    try {
      await provisionStripeConnect(storeId);
      const returnUrl = `${window.location.origin}${window.location.pathname}?onboarding=done`;
      const { url } = await createStripeConnectLink(storeId, returnUrl);
      window.location.href = url;
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao activar recebimentos");
      setActivating(false);
    }
  };

  const balanceNet = ledger.reduce((s, r) => s + r.net_cents, 0);

  if (!storeId) {
    return <div className="p-6 text-sm text-muted-foreground">Sem loja vinculada</div>;
  }

  if (loading) {
    return (
      <div className="p-6 flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> A carregar…
      </div>
    );
  }

  const ready = profile?.stripe_charges_enabled && profile?.stripe_onboarding_completed;
  const exampleFee = estimateProcessingFeeEur(20);

  return (
    <div className="mx-auto max-w-lg space-y-4 pb-10">
      <div>
        <h1 className="text-xl font-black flex items-center gap-2">
          <Wallet className="h-5 w-5 text-primary" />
          Recebimentos
        </h1>
        <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
          O sistema gere pagamentos e repasses. Taxa por pedido online: {PLATFORM_FEE_EUR.toFixed(2)}€ + custo de processamento (ex. 20€ ≈ {exampleFee.toFixed(2)}€ total).
        </p>
        <Link to={nav.admin("diagnostics")} className="text-xs text-primary font-semibold underline mt-2 inline-block">
          Ver Estado do sistema (pagamentos e webhook)
        </Link>
      </div>

      <div className="rounded-2xl bg-gradient-to-br from-primary/90 to-primary p-5 text-primary-foreground shadow-lg">
        <p className="text-xs opacity-90 uppercase tracking-wide font-semibold">Saldo registado</p>
        <p className="text-4xl font-black tabular-nums mt-1">{centsToEur(balanceNet)}€</p>
        <p className="text-[11px] opacity-80 mt-2">Líquido após taxa de processamento online</p>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-xl border bg-card p-3">
          <p className="text-[10px] text-muted-foreground uppercase font-bold">Estado</p>
          <p className="text-sm font-bold mt-0.5">
            {ready ? "Activo" : profile?.stripe_connect_account_id ? "Pendente" : "Por activar"}
          </p>
        </div>
        <div className="rounded-xl border bg-card p-3">
          <p className="text-[10px] text-muted-foreground uppercase font-bold">Repasse</p>
          <p className="text-sm font-bold mt-0.5 capitalize">{profile?.stripe_payout_status || "pending"}</p>
        </div>
      </div>

      {!ready && (
        <div className="rounded-2xl border-2 border-primary/30 bg-primary/5 p-4 space-y-3">
          <div className="flex items-start gap-3">
            <ShieldCheck className="h-6 w-6 text-primary shrink-0" />
            <div>
              <p className="font-black text-base">Conta bancária Stripe — passo obrigatório</p>
              <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                Sem completar este passo na Stripe, o cliente <strong>não consegue pagar com cartão</strong>, mesmo com
                as chaves já configuradas.
              </p>
              {profile?.stripe_connect_account_id && !profile.stripe_charges_enabled && (
                <p className="text-xs font-semibold text-amber-700 dark:text-amber-300 mt-2">
                  Conta criada — faltam dados ou validação na Stripe.
                </p>
              )}
            </div>
          </div>
          <Button className="w-full h-12 font-black text-base" onClick={activatePayouts} disabled={activating}>
            {activating ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              "Abrir Stripe e completar dados bancários"
            )}
          </Button>
          <p className="text-[11px] text-muted-foreground text-center">
            Abre a página oficial da Stripe num separador seguro. Volta aqui quando terminar.
          </p>
        </div>
      )}

      {ready && (
        <div className="rounded-xl border border-green-500/40 bg-green-500/10 p-3 text-sm font-semibold text-green-800 dark:text-green-300 flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 shrink-0" />
          Recebimentos online activos — cartão e repasse automático.
        </div>
      )}

      {profile?.stripe_iban_last4 && (
        <OpsCompactCard
          title={profile.stripe_business_name || "Conta bancária"}
          summary={`IBAN ···· ${profile.stripe_iban_last4}`}
          meta={
            profile.stripe_last_payout_at
              ? `Último repasse: ${new Date(profile.stripe_last_payout_at).toLocaleDateString("pt-PT")}`
              : undefined
          }
          badges={profile.stripe_payouts_enabled ? ["Repasse activo"] : []}
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
              title={row.description || "Pagamento"}
              summary={`Bruto ${centsToEur(row.gross_cents)}€ · Taxa processamento ${centsToEur(row.processing_fee_cents)}€`}
              meta={`Líquido ${centsToEur(row.net_cents)}€ · ${new Date(row.created_at).toLocaleString("pt-PT", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}`}
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
          <h2 className="text-sm font-bold mb-2">Repasses</h2>
          <div className="space-y-2">
            {payouts.map((p) => (
              <OpsCompactCard
                key={p.id}
                title={`${centsToEur(p.amount_cents)}€`}
                summary={p.arrival_date ? `Chegada ${p.arrival_date}` : "A processar"}
                badges={[p.status]}
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
