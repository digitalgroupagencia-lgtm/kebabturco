/** Stubs para fluxo de cupão demo de visita. */
export const DEMO_VISIT_COUPON_CODE = "VISITA";

export async function finalizeDemoVisitOrder(_orderId: string): Promise<void> {
  /* no-op */
}

type PrintParams = {
  storeId: string;
  orderId: string;
  orderNumber: string | number;
  orderType: string;
  tableNumber: string | null;
  customerName: string | null;
  customerPhone: string | null;
  customerEmail: string | null;
  paymentMethod: string;
  paymentStatus: string;
  paidViaApp: boolean;
  items: unknown[];
  total: number;
  subtotal: number;
  notes?: string;
  deliveryAddress?: string | null;
  customerOrderType?: string;
  mesaValidated?: boolean;
  settings?: unknown;
  companyName?: string;
};

export async function printVisitDemoOrder(_params: PrintParams): Promise<void> {
  /* no-op */
}
