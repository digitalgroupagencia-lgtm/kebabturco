type OrderRow = {
  id: string;
  order_number: string;
  order_type: string | null;
  customer_name: string | null;
  customer_phone: string | null;
  notes: string | null;
  delivery_street: string | null;
  delivery_number: string | null;
  delivery_complement: string | null;
  delivery_city: string | null;
  delivery_postal_code: string | null;
  delivery_notes: string | null;
  delivery_zone_name: string | null;
  table_number: string | null;
  subtotal: number;
  delivery_fee: number;
  discount_amount: number;
  total: number;
  payment_method: string | null;
  payment_status: string;
  platform_fee_cents: number;
  stripe_fee_cents: number;
  net_to_store_cents: number | null;
  stripe_payment_intent_id: string | null;
  status: string;
};

type ItemRow = {
  product_name: string;
  size_name: string | null;
  quantity: number;
  unit_price: number;
  total_price: number;
  notes: string | null;
  extras: unknown;
  removed: unknown;
  selections: unknown;
  configuration: unknown;
};

function formatAddress(o: OrderRow): string {
  const parts = [
    [o.delivery_street, o.delivery_number].filter(Boolean).join(" "),
    o.delivery_complement,
    o.delivery_city,
    o.delivery_postal_code,
  ].filter(Boolean);
  return parts.join(", ");
}

function formatItemObservation(item: ItemRow): string | null {
  const chunks: string[] = [];
  if (item.notes?.trim()) chunks.push(item.notes.trim());
  if (item.size_name?.trim()) chunks.push(`Tamanho: ${item.size_name}`);
  for (const [label, val] of [
    ["Extras", item.extras],
    ["Sem", item.removed],
    ["Opções", item.selections],
    ["Config", item.configuration],
  ] as const) {
    if (val == null) continue;
    if (Array.isArray(val) && val.length === 0) continue;
    if (typeof val === "object" && !Array.isArray(val) && Object.keys(val as object).length === 0) continue;
    try {
      chunks.push(`${label}: ${JSON.stringify(val)}`);
    } catch {
      chunks.push(`${label}: ${String(val)}`);
    }
  }
  return chunks.length ? chunks.join(" | ") : null;
}

function resolveOrigem(orderType: string | null): string {
  switch (orderType) {
    case "delivery":
      return "app_cliente";
    case "dine_in":
      return "mesa";
    case "takeaway":
      return "loja_online";
    default:
      return "app_cliente";
  }
}

export function buildMarketplaceWebhookPayload(
  order: OrderRow,
  items: ItemRow[],
  wgmStoreId: string,
) {
  const address = formatAddress(order);
  const observacoesParts = [
    order.notes?.trim() ? `Notas: ${order.notes.trim()}` : null,
    address ? `Entrega: ${address}` : null,
    order.delivery_zone_name ? `Zona: ${order.delivery_zone_name}` : null,
    order.delivery_notes?.trim() ? `Instruções: ${order.delivery_notes.trim()}` : null,
    order.table_number ? `Mesa: ${order.table_number}` : null,
    `Pedido Kebab #${order.order_number}`,
  ].filter(Boolean);

  return {
    store_id: wgmStoreId,
    external_id: order.id,
    customer_name: order.customer_name,
    customer_phone: order.customer_phone,
    origem: resolveOrigem(order.order_type),
    observacoes: observacoesParts.join("\n"),
    taxa_entrega: order.delivery_fee ?? 0,
    desconto: order.discount_amount ?? 0,
    taxa_plataforma_centavos: order.platform_fee_cents ?? 0,
    taxa_stripe_centavos: order.stripe_fee_cents ?? 0,
    centavos_liquidos_para_loja: order.net_to_store_cents ?? 0,
    metodo_pagamento: order.payment_method,
    payment_status: order.payment_status,
    stripe_payment_intent_id: order.stripe_payment_intent_id,
    items: items.map((item) => ({
      nome: item.product_name,
      quantidade: item.quantity,
      preco_unitario: item.unit_price,
      total_item: item.total_price,
      observacao: formatItemObservation(item),
    })),
  };
}
