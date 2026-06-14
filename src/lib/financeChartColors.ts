export type FinancePaymentMethodKey =
  | "card"
  | "bizum"
  | "apple_pay"
  | "google_pay"
  | "cash"
  | "pix"
  | "other";

export const PAYMENT_METHOD_LABELS: Record<FinancePaymentMethodKey, string> = {
  card: "Cartão",
  bizum: "Bizum",
  apple_pay: "Apple Pay",
  google_pay: "Google Pay",
  cash: "Dinheiro",
  pix: "Pix",
  other: "Outro",
};

/** Cores fixas por método — legíveis em claro e escuro. */
export const PAYMENT_METHOD_CHART_COLORS: Record<FinancePaymentMethodKey, string> = {
  card: "hsl(210 72% 48%)",
  bizum: "hsl(25 92% 50%)",
  apple_pay: "hsl(220 8% 18%)",
  google_pay: "hsl(var(--success))",
  cash: "hsl(38 92% 50%)",
  pix: "hsl(262 52% 52%)",
  other: "hsl(var(--muted-foreground))",
};

export function normalizeFinancePaymentMethod(raw: string | null | undefined): FinancePaymentMethodKey {
  const key = (raw ?? "").trim().toLowerCase();
  if (key in PAYMENT_METHOD_LABELS) return key as FinancePaymentMethodKey;
  return "other";
}
