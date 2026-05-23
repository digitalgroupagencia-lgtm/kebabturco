export const PLAN_KEYS = ["start", "pro", "premium"] as const;
export type PlanKey = (typeof PLAN_KEYS)[number];

export const CENTRAL_GROUPS = {
  core: "Núcleo",
  growth: "Crescimento",
  loyalty: "Fidelidade",
  campaigns: "Campanhas",
  push: "Push",
  ai: "Inteligência artificial",
  premium: "Premium",
} as const;

export const PLAN_LABELS: Record<PlanKey, string> = {
  start: "START",
  pro: "PRO",
  premium: "PREMIUM",
};

export const AI_MODULES = [
  { key: "support", label: "IA atendimento", desc: "Responde dúvidas e ajuda no pedido" },
  { key: "seller", label: "IA vendedor", desc: "Apoio à equipa de sala" },
  { key: "recovery", label: "IA recuperação", desc: "Reactiva clientes inactivos" },
  { key: "marketing", label: "IA marketing", desc: "Sugere promos e campanhas" },
] as const;

export const LOYALTY_MODELS = [
  { key: "stamps", label: "Carimbos", desc: "Modelo actual (ex.: 10 = reward)" },
  { key: "points", label: "Pontos", desc: "Em preparação" },
  { key: "cashback", label: "Cashback", desc: "Em preparação" },
  { key: "vip", label: "VIP", desc: "Em preparação" },
] as const;

export type TenantFeatureFlag = {
  feature_key: string;
  name: string;
  central_group: string;
  enabled: boolean;
  source: string;
};
