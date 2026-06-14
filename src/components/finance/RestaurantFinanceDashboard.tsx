import { useMemo } from "react";
import {
  type FinanceMovement,
  type FinancePayout,
  type RestaurantFinanceSnapshot,
  formatDateTime,
  formatEur,
  formatShortDate,
  payoutStatusLabel,
} from "@/services/restaurantFinanceService";
import { buildFinanceAnalytics } from "@/services/financeAnalyticsService";
import PremiumMetricCard from "@/components/admin/premium/PremiumMetricCard";
import PremiumChartCard from "@/components/admin/premium/PremiumChartCard";
import PremiumDonutChart from "@/components/admin/premium/PremiumDonutChart";
import PremiumDualLineChart from "@/components/admin/premium/PremiumDualLineChart";
import PremiumFunnelChart from "@/components/admin/premium/PremiumFunnelChart";
import EqualCardGrid from "@/components/admin/premium/EqualCardGrid";
import { CalendarClock, Landmark, PiggyBank, Receipt, Timer, TrendingUp, Wallet } from "lucide-react";

type Props = {
  snapshot: RestaurantFinanceSnapshot | null;
  movements: FinanceMovement[];
  payouts: FinancePayout[];
  ibanLast4?: string | null;
  businessName?: string | null;
  lastPayoutAt?: string | null;
};

function payoutScheduleText(snapshot: RestaurantFinanceSnapshot | null): string {
  if (!snapshot) return "Repasses automáticos para a sua conta bancária";
  if (snapshot.payoutInterval === "daily") return "Repasses automáticos todos os dias úteis";
  if (snapshot.payoutInterval === "weekly" && snapshot.payoutWeekday) {
    return `Repasses automáticos às ${snapshot.payoutWeekday}s`;
  }
  return "Repasses automáticos para a sua conta bancária";
}

function fmtPeriod(cents: number): string {
  return `${formatEur(cents)}€`;
}

export default function RestaurantFinanceDashboard({
  snapshot,
  movements,
  payouts,
  ibanLast4,
  businessName,
  lastPayoutAt,
}: Props) {
  const analytics = useMemo(() => buildFinanceAnalytics(movements), [movements]);

  const totalCustomerPaid = movements
    .filter((m) => m.kind === "payment")
    .reduce((s, m) => s + m.customerPaidCents, 0);
  const totalServiceFees = movements.reduce((s, m) => s + m.serviceFeeCents, 0);
  const totalYouReceive = movements.reduce((s, m) => s + m.youReceiveCents, 0);

  const available = snapshot?.availableCents ?? 0;
  const pending = snapshot?.pendingCents ?? 0;
  const nextPayout = snapshot?.nextPayoutAmountCents ?? null;
  const nextDate = snapshot?.nextPayoutDate ?? null;
  const bankLast4 = snapshot?.ibanLast4 ?? ibanLast4 ?? null;

  return (
    <div className="space-y-5">
      <div className="rounded-xl border bg-muted/30 p-3 text-xs leading-relaxed text-muted-foreground">
        <p>
          O cliente paga o total do pedido. A <strong className="text-foreground">taxa de serviço da plataforma</strong>{" "}
          é descontada automaticamente — vê o valor líquido em cada linha abaixo.
        </p>
        <p className="mt-1 flex items-center gap-1.5">
          <CalendarClock className="h-3.5 w-3.5 shrink-0" />
          {payoutScheduleText(snapshot)}
        </p>
      </div>

      <EqualCardGrid cols={3}>
        <PremiumMetricCard
          icon={PiggyBank}
          tone="success"
          label="Disponível para repasse"
          value={`${formatEur(available)}€`}
          sub="Na sua conta de recebimentos"
        />
        <PremiumMetricCard
          icon={Timer}
          tone="warning"
          label="Em processamento"
          value={`${formatEur(pending)}€`}
          sub="Pagamentos ainda a liquidar"
        />
        <PremiumMetricCard
          icon={Landmark}
          tone="primary"
          label="Próximo depósito no banco"
          value={nextPayout != null && nextPayout > 0 ? `${formatEur(nextPayout)}€` : "—"}
          sub={nextDate ? `Previsão: ${formatShortDate(nextDate)}` : "Assim que houver saldo"}
        />
      </EqualCardGrid>

      {bankLast4 && (
        <div className="rounded-xl border bg-card px-4 py-3 flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-bold">{businessName || "Conta bancária"}</p>
            <p className="text-sm text-muted-foreground tabular-nums">IBAN ···· {bankLast4}</p>
          </div>
          {lastPayoutAt && (
            <p className="text-[11px] text-muted-foreground text-right">
              Último depósito
              <br />
              <span className="font-semibold text-foreground">{formatShortDate(lastPayoutAt)}</span>
            </p>
          )}
        </div>
      )}

      <EqualCardGrid cols={3}>
        <PremiumMetricCard
          icon={Wallet}
          tone="info"
          label="Hoje"
          value={fmtPeriod(analytics.today.grossCents)}
          sub={`${analytics.today.count} pedido(s) · líquido ${fmtPeriod(analytics.today.netCents)}`}
        />
        <PremiumMetricCard
          icon={TrendingUp}
          tone="purple"
          label="Últimos 7 dias"
          value={fmtPeriod(analytics.week.grossCents)}
          sub={`${analytics.week.count} pedido(s) · líquido ${fmtPeriod(analytics.week.netCents)}`}
        />
        <PremiumMetricCard
          icon={Receipt}
          tone="orange"
          label="Este mês"
          value={fmtPeriod(analytics.month.grossCents)}
          sub={`${analytics.month.count} pedido(s) · líquido ${fmtPeriod(analytics.month.netCents)}`}
        />
      </EqualCardGrid>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
        <PremiumChartCard
          title="Pagamentos por método"
          subtitle="Volume em euros — cartão, Bizum, Apple Pay, Google Pay"
          className="xl:col-span-5"
        >
          <PremiumDonutChart data={analytics.byMethod} />
        </PremiumChartCard>

        <PremiumChartCard
          title="Evolução diária"
          subtitle="Últimos 30 dias — verde = líquido, vermelho = taxas"
          className="xl:col-span-7"
        >
          <PremiumDualLineChart data={analytics.dailySeries} />
        </PremiumChartCard>
      </div>

      <PremiumChartCard title="Volume por método" subtitle="Comparativo rápido (funil)">
        <PremiumFunnelChart data={analytics.byMethod} />
      </PremiumChartCard>

      <EqualCardGrid cols={3}>
        <div className="rounded-xl border bg-card p-3 text-center h-full flex flex-col justify-center">
          <p className="text-[10px] text-muted-foreground uppercase font-bold">Faturação total</p>
          <p className="text-lg font-black tabular-nums mt-1">{formatEur(totalCustomerPaid)}€</p>
        </div>
        <div className="rounded-xl border bg-card p-3 text-center h-full flex flex-col justify-center">
          <p className="text-[10px] text-muted-foreground uppercase font-bold">Taxas de serviço</p>
          <p className="text-lg font-black tabular-nums mt-1 text-destructive">−{formatEur(totalServiceFees)}€</p>
        </div>
        <div className="rounded-xl border bg-card p-3 text-center h-full flex flex-col justify-center">
          <p className="text-[10px] text-muted-foreground uppercase font-bold">Líquido para si</p>
          <p className="text-lg font-black tabular-nums mt-1 text-emerald-600 dark:text-emerald-400">
            {formatEur(totalYouReceive)}€
          </p>
        </div>
      </EqualCardGrid>

      <div>
        <h2 className="text-sm font-bold mb-2 flex items-center gap-1.5">
          <Receipt className="h-4 w-4" />
          Extrato de movimentos
        </h2>
        {movements.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground py-10 border border-dashed rounded-2xl">
            Ainda sem movimentos — aparecem aqui assim que houver pagamentos online.
          </p>
        ) : (
          <div className="rounded-2xl border overflow-hidden">
            <div className="hidden sm:grid grid-cols-[1.1fr_0.9fr_0.8fr_0.8fr_0.9fr] gap-2 px-3 py-2 bg-muted/50 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
              <span>Data / descrição</span>
              <span className="text-right">Cliente pagou</span>
              <span className="text-right">Taxa serviço</span>
              <span className="text-right">Recebe</span>
              <span className="text-right">Estado</span>
            </div>
            <div className="divide-y">
              {movements.map((m) => (
                <div
                  key={m.id}
                  className="px-3 py-3 sm:grid sm:grid-cols-[1.1fr_0.9fr_0.8fr_0.8fr_0.9fr] sm:gap-2 sm:items-center hover:bg-muted/20"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-bold truncate">{m.title}</p>
                    <p className="text-[11px] text-muted-foreground">{formatDateTime(m.createdAt)}</p>
                  </div>
                  <div className="mt-2 sm:mt-0 flex sm:block justify-between text-xs sm:text-sm">
                    <span className="sm:hidden text-muted-foreground">Cliente pagou</span>
                    <span className="font-semibold tabular-nums sm:text-right">
                      {m.customerPaidCents > 0 ? `${formatEur(m.customerPaidCents)}€` : "—"}
                    </span>
                  </div>
                  <div className="flex sm:block justify-between text-xs sm:text-sm">
                    <span className="sm:hidden text-muted-foreground">Taxa serviço</span>
                    <span className="font-semibold tabular-nums text-muted-foreground sm:text-right">
                      {m.serviceFeeCents > 0 ? `−${formatEur(m.serviceFeeCents)}€` : "—"}
                    </span>
                  </div>
                  <div className="flex sm:block justify-between text-xs sm:text-sm">
                    <span className="sm:hidden text-muted-foreground">Recebe</span>
                    <span
                      className={`font-black tabular-nums sm:text-right ${
                        m.youReceiveCents < 0 ? "text-destructive" : "text-foreground"
                      }`}
                    >
                      {m.youReceiveCents < 0 ? "−" : ""}
                      {formatEur(Math.abs(m.youReceiveCents))}€
                    </span>
                  </div>
                  <div className="flex sm:block justify-between text-xs sm:mt-0 mt-1">
                    <span className="sm:hidden text-muted-foreground">Estado</span>
                    <span className="sm:text-right text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                      {m.kind === "payment"
                        ? "Confirmado"
                        : m.kind === "dispute"
                          ? "Contestado"
                          : m.kind === "dispute_fee"
                            ? "Ajuste"
                            : "Movimento"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div>
        <h2 className="text-sm font-bold mb-2 flex items-center gap-1.5">
          <Landmark className="h-4 w-4" />
          Depósitos no banco
        </h2>
        {payouts.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground py-8 border border-dashed rounded-2xl">
            O primeiro depósito aparece aqui após o repasse automático.
          </p>
        ) : (
          <div className="space-y-2">
            {payouts.map((p) => (
              <div
                key={p.id}
                className="rounded-xl border bg-card px-4 py-3 flex items-center justify-between gap-3"
              >
                <div>
                  <p className="text-lg font-black tabular-nums">{formatEur(p.amountCents)}€</p>
                  <p className="text-[11px] text-muted-foreground">
                    {p.arrivalDate
                      ? `Chegada prevista: ${formatShortDate(p.arrivalDate)}`
                      : `Pedido em ${formatShortDate(p.createdAt)}`}
                  </p>
                </div>
                <span
                  className={`text-[11px] font-bold uppercase tracking-wide px-2 py-1 rounded-full ${
                    p.status === "paid"
                      ? "bg-green-500/15 text-green-800 dark:text-green-300"
                      : p.status === "failed"
                        ? "bg-destructive/15 text-destructive"
                        : "bg-amber-500/15 text-amber-900 dark:text-amber-200"
                  }`}
                >
                  {payoutStatusLabel(p.status)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
