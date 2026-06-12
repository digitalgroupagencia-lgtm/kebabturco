import { useCallback, useEffect, useState } from "react";
import { Loader2, RefreshCw, Wallet } from "lucide-react";
import PanelStoreSwitcher from "@/components/panel/PanelStoreSwitcher";
import RestaurantFinanceDashboard from "@/components/finance/RestaurantFinanceDashboard";
import { Button } from "@/components/ui/button";
import { usePanelStoreId } from "@/contexts/PanelStoreContext";
import { useStaffT } from "@/hooks/useStaffT";
import { fetchStoreFinancialProfile } from "@/services/orderService";
import {
  fetchFinanceMovements,
  fetchFinancePayouts,
  fetchRestaurantFinanceSnapshot,
  type FinanceMovement,
  type FinancePayout,
  type RestaurantFinanceSnapshot,
} from "@/services/restaurantFinanceService";
import { isStripeConnectReady } from "@/lib/stripeConnectReady";

const PanelFinancePage = () => {
  const { storeId } = usePanelStoreId();
  const { t } = useStaffT();
  const [movements, setMovements] = useState<FinanceMovement[]>([]);
  const [payouts, setPayouts] = useState<FinancePayout[]>([]);
  const [financeSnapshot, setFinanceSnapshot] = useState<RestaurantFinanceSnapshot | null>(null);
  const [ibanLast4, setIbanLast4] = useState<string | null>(null);
  const [businessName, setBusinessName] = useState<string | null>(null);
  const [lastPayoutAt, setLastPayoutAt] = useState<string | null>(null);
  const [paymentsActive, setPaymentsActive] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!storeId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setLoadError(null);
    try {
      const [profile, mv, po] = await Promise.all([
        fetchStoreFinancialProfile(storeId).catch(() => null),
        fetchFinanceMovements(storeId),
        fetchFinancePayouts(storeId),
      ]);
      setMovements(mv);
      setPayouts(po);
      setIbanLast4(profile?.stripe_iban_last4 ?? null);
      setBusinessName(profile?.stripe_business_name ?? null);
      setLastPayoutAt(profile?.stripe_last_payout_at ?? null);
      setPaymentsActive(isStripeConnectReady(profile));
      const ledgerNet = mv.reduce((s, m) => s + m.youReceiveCents, 0);
      const snap = await fetchRestaurantFinanceSnapshot(storeId, ledgerNet);
      setFinanceSnapshot(snap);
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "Erro ao carregar");
    } finally {
      setLoading(false);
    }
  }, [storeId]);

  useEffect(() => {
    void load();
  }, [load]);

  const hasData = paymentsActive || movements.length > 0 || payouts.length > 0;

  return (
    <div className="mx-auto max-w-lg space-y-5 pb-10">
      <PanelStoreSwitcher />

      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-black flex items-center gap-2">
            <Wallet className="h-5 w-5 text-primary" />
            {t("nav.finance", "Recebimentos")}
          </h1>
          <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
            {t(
              "finance.panel.subtitle",
              "Veja quanto entrou nos pedidos online, as taxas e quando o dinheiro cai na conta bancária.",
            )}
          </p>
        </div>
        <Button variant="outline" size="sm" className="shrink-0 gap-1.5" onClick={() => void load()} disabled={loading}>
          {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
          {t("common.refresh", "Actualizar")}
        </Button>
      </div>

      {loadError && (
        <div className="rounded-xl border border-destructive/40 bg-destructive/5 p-3 text-xs text-destructive">{loadError}</div>
      )}

      {loading && !hasData ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : hasData ? (
        <RestaurantFinanceDashboard
          snapshot={financeSnapshot}
          movements={movements}
          payouts={payouts}
          ibanLast4={ibanLast4}
          businessName={businessName}
          lastPayoutAt={lastPayoutAt}
        />
      ) : (
        <div className="rounded-2xl border bg-card p-6 space-y-3 text-sm leading-relaxed">
          <p className="font-semibold">{t("finance.panel.pending.title", "Recebimentos em configuração")}</p>
          <p className="text-muted-foreground">
            {t(
              "finance.panel.pending.body",
              "Ainda não há movimentos a mostrar. A equipa Kebab Turco activa a conta bancária e os pagamentos online — quando houver vendas, aparecem aqui automaticamente.",
            )}
          </p>
        </div>
      )}
    </div>
  );
};

export default PanelFinancePage;
