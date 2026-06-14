import { supabase as _supabaseRaw } from "@/integrations/supabase/client";

const supabase = _supabaseRaw as unknown as any;

export type FinanceMovement = {
  id: string;
  createdAt: string;
  kind: "payment" | "dispute" | "dispute_fee" | "other";
  title: string;
  orderNumber: string | null;
  customerPaidCents: number;
  serviceFeeCents: number;
  youReceiveCents: number;
  paymentMethod: string | null;
};

export type FinancePayout = {
  id: string;
  amountCents: number;
  status: string;
  arrivalDate: string | null;
  createdAt: string;
};

export type RestaurantFinanceSnapshot = {
  availableCents: number;
  pendingCents: number;
  payoutInterval: "daily" | "weekly" | "monthly" | "manual";
  payoutWeekday: string | null;
  nextPayoutDate: string | null;
  nextPayoutAmountCents: number | null;
  ibanLast4: string | null;
  simulated: boolean;
};

type LedgerDbRow = {
  id: string;
  created_at: string;
  entry_type: string | null;
  description: string | null;
  gross_cents: number;
  processing_fee_cents: number;
  net_cents: number;
  order_id: string | null;
  orders: {
    order_number: string;
    subtotal: number;
    delivery_fee: number | null;
    discount_amount: number | null;
    payment_method: string | null;
  } | null;
};

function movementKind(entryType: string | null): FinanceMovement["kind"] {
  if (entryType === "dispute_fee") return "dispute_fee";
  if (entryType === "dispute_reversal") return "dispute";
  if (entryType === "order_payment") return "payment";
  return "other";
}

function movementTitle(kind: FinanceMovement["kind"], description: string | null, orderNumber: string | null): string {
  if (kind === "dispute_fee") return "Taxa de contestação";
  if (kind === "dispute") return "Pagamento contestado";
  if (orderNumber) return `Pedido #${orderNumber}`;
  return description || "Movimento";
}

function orderCustomerTotalCents(order: LedgerDbRow["orders"]): number | null {
  if (!order) return null;
  const total = order.subtotal + (order.delivery_fee ?? 0) - (order.discount_amount ?? 0);
  return Math.max(0, Math.round(total * 100));
}

export function mapLedgerRowToMovement(row: LedgerDbRow): FinanceMovement {
  const kind = movementKind(row.entry_type);
  const orderNumber = row.orders?.order_number ?? null;
  const customerFromOrder = orderCustomerTotalCents(row.orders);
  const serviceFeeCents = kind === "payment" ? Math.max(0, row.processing_fee_cents) : 0;

  let customerPaidCents = 0;
  let youReceiveCents = row.net_cents;

  if (kind === "payment") {
    customerPaidCents =
      customerFromOrder ?? Math.max(0, row.net_cents + serviceFeeCents);
    youReceiveCents = row.net_cents;
  }

  return {
    id: row.id,
    createdAt: row.created_at,
    kind,
    title: movementTitle(kind, row.description, orderNumber),
    orderNumber,
    customerPaidCents,
    serviceFeeCents,
    youReceiveCents,
    paymentMethod: row.orders?.payment_method ?? null,
  };
}

export async function fetchFinanceMovements(storeId: string, limit = 60): Promise<FinanceMovement[]> {
  const { data, error } = await supabase
    .from("store_payment_ledger")
    .select(
      "id,created_at,entry_type,description,gross_cents,processing_fee_cents,net_cents,order_id,orders(order_number,subtotal,delivery_fee,discount_amount,payment_method)",
    )
    .eq("store_id", storeId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error || !Array.isArray(data)) return [];
  return (data as LedgerDbRow[]).map(mapLedgerRowToMovement);
}

export async function fetchFinancePayouts(storeId: string, limit = 20): Promise<FinancePayout[]> {
  const { data, error } = await supabase
    .from("store_payouts")
    .select("id,amount_cents,status,arrival_date,created_at")
    .eq("store_id", storeId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error || !Array.isArray(data)) return [];
  return data.map((p: {
    id: string;
    amount_cents: number;
    status: string;
    arrival_date: string | null;
    created_at: string;
  }) => ({
    id: p.id,
    amountCents: p.amount_cents,
    status: p.status,
    arrivalDate: p.arrival_date,
    createdAt: p.created_at,
  }));
}

export async function fetchRestaurantFinanceSnapshot(
  _storeId: string,
  ledgerNetCents: number,
): Promise<RestaurantFinanceSnapshot | null> {
  return {
    availableCents: Math.max(0, ledgerNetCents),
    pendingCents: 0,
    payoutInterval: "weekly",
    payoutWeekday: "segunda-feira",
    nextPayoutDate: null,
    nextPayoutAmountCents: null,
    ibanLast4: null,
    simulated: true,
  };
}

export function payoutStatusLabel(status: string): string {
  const map: Record<string, string> = {
    paid: "Recebido no banco",
    pending: "A caminho",
    in_transit: "A caminho",
    failed: "Falhou",
    canceled: "Cancelado",
  };
  return map[status] ?? status;
}

export function formatEur(cents: number): string {
  return (cents / 100).toLocaleString("pt-PT", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function formatShortDate(iso: string): string {
  return new Date(iso).toLocaleDateString("pt-PT", { day: "2-digit", month: "short", year: "numeric" });
}

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("pt-PT", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}
