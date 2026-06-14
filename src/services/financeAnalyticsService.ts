import {
  normalizeFinancePaymentMethod,
  PAYMENT_METHOD_CHART_COLORS,
  PAYMENT_METHOD_LABELS,
  type FinancePaymentMethodKey,
} from "@/lib/financeChartColors";
import type { FinanceMovement } from "@/services/restaurantFinanceService";

export type MethodSlice = {
  key: FinancePaymentMethodKey;
  label: string;
  count: number;
  volumeCents: number;
  color: string;
  percent: number;
};

export type DailyFinancePoint = {
  date: string;
  dateLabel: string;
  netCents: number;
  feesCents: number;
  grossCents: number;
};

export type PeriodTotals = {
  grossCents: number;
  feesCents: number;
  netCents: number;
  count: number;
};

export type FinanceAnalytics = {
  byMethod: MethodSlice[];
  dailySeries: DailyFinancePoint[];
  today: PeriodTotals;
  week: PeriodTotals;
  month: PeriodTotals;
};

function startOfLocalDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function periodTotals(movements: FinanceMovement[], since: Date): PeriodTotals {
  const filtered = movements.filter((m) => m.kind === "payment" && new Date(m.createdAt) >= since);
  return {
    grossCents: filtered.reduce((s, m) => s + m.customerPaidCents, 0),
    feesCents: filtered.reduce((s, m) => s + m.serviceFeeCents, 0),
    netCents: filtered.reduce((s, m) => s + m.youReceiveCents, 0),
    count: filtered.length,
  };
}

export function buildFinanceAnalytics(movements: FinanceMovement[]): FinanceAnalytics {
  const payments = movements.filter((m) => m.kind === "payment");
  const now = new Date();
  const todayStart = startOfLocalDay(now);
  const weekStart = new Date(todayStart);
  weekStart.setDate(weekStart.getDate() - 6);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const methodMap = new Map<FinancePaymentMethodKey, { count: number; volumeCents: number }>();
  const dayMap = new Map<string, DailyFinancePoint>();

  for (const m of payments) {
    const method = normalizeFinancePaymentMethod(m.paymentMethod);
    const prev = methodMap.get(method) ?? { count: 0, volumeCents: 0 };
    methodMap.set(method, {
      count: prev.count + 1,
      volumeCents: prev.volumeCents + m.customerPaidCents,
    });

    const dayKey = startOfLocalDay(new Date(m.createdAt)).toISOString().slice(0, 10);
    const existing = dayMap.get(dayKey) ?? {
      date: dayKey,
      dateLabel: new Date(dayKey).toLocaleDateString("pt-PT", { day: "2-digit", month: "short" }),
      netCents: 0,
      feesCents: 0,
      grossCents: 0,
    };
    dayMap.set(dayKey, {
      ...existing,
      grossCents: existing.grossCents + m.customerPaidCents,
      feesCents: existing.feesCents + m.serviceFeeCents,
      netCents: existing.netCents + m.youReceiveCents,
    });
  }

  const totalVolume = payments.reduce((s, m) => s + m.customerPaidCents, 0);

  const byMethod: MethodSlice[] = Array.from(methodMap.entries())
    .map(([key, data]) => ({
      key,
      label: PAYMENT_METHOD_LABELS[key],
      count: data.count,
      volumeCents: data.volumeCents,
      color: PAYMENT_METHOD_CHART_COLORS[key],
      percent: totalVolume > 0 ? Math.round((data.volumeCents / totalVolume) * 100) : 0,
    }))
    .sort((a, b) => b.volumeCents - a.volumeCents);

  const dailySeries = Array.from({ length: 30 }, (_, i) => {
    const d = new Date(todayStart);
    d.setDate(d.getDate() - (29 - i));
    const key = d.toISOString().slice(0, 10);
    return (
      dayMap.get(key) ?? {
        date: key,
        dateLabel: d.toLocaleDateString("pt-PT", { day: "2-digit", month: "short" }),
        netCents: 0,
        feesCents: 0,
        grossCents: 0,
      }
    );
  });

  return {
    byMethod,
    dailySeries,
    today: periodTotals(movements, todayStart),
    week: periodTotals(movements, weekStart),
    month: periodTotals(movements, monthStart),
  };
}
