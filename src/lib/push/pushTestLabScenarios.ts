export type PushLabScenarioId =
  | "simple_staff"
  | "simple_marketing"
  | "staff_new_order"
  | "customer_status"
  | "staff_cancelled"
  | "marketing_broadcast";

export type CustomerStatusEvent =
  | "pending"
  | "payment_paid"
  | "preparing"
  | "ready"
  | "out_for_delivery"
  | "delivered"
  | "collected"
  | "served"
  | "cancelled";

export type PushLabScenario = {
  id: PushLabScenarioId;
  label: string;
  description: string;
  hint: string;
  defaultTitle: string;
  defaultBody: string;
  supportsImage: boolean;
  needsOrder: boolean;
  needsCustomerEvent: boolean;
  showsLiveActivityPreview: boolean;
  liveActivityKind?: "staff" | "customer";
};

export const PUSH_LAB_SCENARIOS: PushLabScenario[] = [
  {
    id: "simple_staff",
    label: "Alerta equipa (faixa)",
    description: "Notificação pequena para a equipa, sem cartão grande no ecrã bloqueado.",
    hint: "Use para confirmar que o iPhone ou browser da equipa recebe push.",
    defaultTitle: "Teste equipa Kebab Turco",
    defaultBody: "Se vês isto, os alertas da equipa estão a funcionar.",
    supportsImage: false,
    needsOrder: false,
    needsCustomerEvent: false,
    showsLiveActivityPreview: false,
  },
  {
    id: "staff_new_order",
    label: "Pedido novo + ACEITAR",
    description: "Igual a um pedido real: faixa + cartão grande no ecrã bloqueado com botão ACEITAR.",
    hint: "Escolha um pedido pendente ou crie um teste. No iPhone feche a app antes de disparar.",
    defaultTitle: "",
    defaultBody: "",
    supportsImage: false,
    needsOrder: true,
    needsCustomerEvent: false,
    showsLiveActivityPreview: true,
    liveActivityKind: "staff",
  },
  {
    id: "staff_cancelled",
    label: "Pedido cancelado (equipa)",
    description: "Avisa a equipa que um pedido foi cancelado e fecha o cartão grande se existir.",
    hint: "Escolha um pedido (idealmente já cancelado ou pendente para teste).",
    defaultTitle: "",
    defaultBody: "",
    supportsImage: false,
    needsOrder: true,
    needsCustomerEvent: false,
    showsLiveActivityPreview: false,
  },
  {
    id: "customer_status",
    label: "Estado do pedido (cliente)",
    description: "Push ao cliente + cartão grande no ecrã bloqueado com o estado escolhido.",
    hint: "O cliente precisa de ter aceitado notificações no menu ou na app.",
    defaultTitle: "",
    defaultBody: "",
    supportsImage: false,
    needsOrder: true,
    needsCustomerEvent: true,
    showsLiveActivityPreview: true,
    liveActivityKind: "customer",
  },
  {
    id: "simple_marketing",
    label: "Marketing (só este dispositivo)",
    description: "Teste de campanha só para o browser ou telemóvel onde está agora.",
    defaultTitle: "Oferta especial 🥙",
    defaultBody: "Hoje temos promoção — abre o menu e aproveita!",
    hint: "Registe push de cliente neste dispositivo antes de enviar.",
    supportsImage: true,
    needsOrder: false,
    needsCustomerEvent: false,
    showsLiveActivityPreview: false,
  },
  {
    id: "marketing_broadcast",
    label: "Marketing (todos os clientes)",
    description: "Envia para todos os clientes com notificações activas nesta loja.",
    defaultTitle: "Novidade no Kebab Turco",
    defaultBody: "Descobre o que há de novo no menu — toca para ver.",
    hint: "Pode acrescentar imagem (banner). Textos traduzidos automaticamente.",
    supportsImage: true,
    needsOrder: false,
    needsCustomerEvent: false,
    showsLiveActivityPreview: false,
  },
];

export const CUSTOMER_STATUS_OPTIONS: { value: CustomerStatusEvent; label: string }[] = [
  { value: "pending", label: "Pedido recebido" },
  { value: "payment_paid", label: "Pagamento confirmado" },
  { value: "preparing", label: "Em preparação" },
  { value: "ready", label: "Pronto para recolha" },
  { value: "out_for_delivery", label: "A caminho" },
  { value: "delivered", label: "Entregue" },
  { value: "collected", label: "Recolhido" },
  { value: "served", label: "Servido na mesa" },
  { value: "cancelled", label: "Cancelado" },
];

export function getPushLabScenario(id: PushLabScenarioId): PushLabScenario {
  return PUSH_LAB_SCENARIOS.find((s) => s.id === id) ?? PUSH_LAB_SCENARIOS[0];
}
