import {
  type FinanceMovement,
  type FinancePayout,
  type RestaurantFinanceSnapshot,
  formatDateTime,
  formatEur,
  formatShortDate,
  payoutStatusLabel,
} from "@/services/restaurantFinanceService";
import { CalendarClock, Landmark, PiggyBank, Receipt, Timer } from "lucide-react";

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

export default function RestaurantFinanceDashboard({
  snapshot,
  movements,
  payouts,
  ibanLast4,
  businessName,
  lastPayoutAt,
}: Props) {
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
    <div className="space-y-4">
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

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        <div className="rounded-2xl border bg-card p-4 shadow-sm">
          <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
            <PiggyBank className="h-3.5 w-3.5" />
            Disponível para repasse
          </div>
          <p className="text-2xl font-black tabular-nums mt-2">{formatEur(available)}€</p>
          <p className="text-[11px] text-muted-foreground mt-1">Na sua conta de recebimentos</p>
        </div>
        <div className="rounded-2xl border bg-card p-4 shadow-sm">
          <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
            <Timer className="h-3.5 w-3.5" />
            Em processamento
          </div>
          <p className="text-2xl font-black tabular-nums mt-2">{formatEur(pending)}€</p>
          <p className="text-[11px] text-muted-foreground mt-1">Pagamentos ainda a liquidar</p>
        </div>
        <div className="rounded-2xl border bg-gradient-to-br from-primary/90 to-primary p-4 text-primary-foreground shadow-md">
          <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wide opacity-90">
            <Landmark className="h-3.5 w-3.5" />
            Próximo depósito no banco
          </div>
          <p className="text-2xl font-black tabular-nums mt-2">
            {nextPayout != null && nextPayout > 0 ? `${formatEur(nextPayout)}€` : "—"}
          </p>
          <p className="text-[11px] opacity-85 mt-1">
            {nextDate ? `Previsão: ${formatShortDate(nextDate)}` : "Assim que houver saldo"}
          </p>
        </div>
      </div>

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

      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="rounded-xl border bg-card p-3">
          <p className="text-[10px] text-muted-foreground uppercase font-bold">Faturação</p>
          <p className="text-sm font-black tabular-nums mt-1">{formatEur(totalCustomerPaid)}€</p>
        </div>
        <div className="rounded-xl border bg-card p-3">
          <p className="text-[10px] text-muted-foreground uppercase font-bold">Taxas de serviço</p>
          <p className="text-sm font-black tabular-nums mt-1">{formatEur(totalServiceFees)}€</p>
        </div>
        <div className="rounded-xl border bg-card p-3">
          <p className="text-[10px] text-muted-foreground uppercase font-bold">Líquido para si</p>
          <p className="text-sm font-black tabular-nums mt-1">{formatEur(totalYouReceive)}€</p>
        </div>
      </div>

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
