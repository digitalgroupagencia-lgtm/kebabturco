import type { LucideIcon } from "lucide-react";

export type CentralSegment = "ai" | "loyalty" | "campaigns" | "push" | "conversational";

export type TimelineEvent = {
  id: string;
  time: string;
  title: string;
  detail?: string;
  impact?: string;
  tone?: "default" | "success" | "warning" | "muted";
};

export type CentralInsight = {
  label: string;
  value: string;
  hint?: string;
  estimated?: boolean;
};

export type TenantOperationalRow = {
  tenantId: string;
  tenantName: string;
  slug: string;
  plan: string;
  orders7d: number;
  revenue7d: number;
  aiModulesOn: number;
  loyaltyActive: boolean;
  featuresOn: number;
};

export type PlatformOperationalSnapshot = {
  tenants: TenantOperationalRow[];
  totalOrders7d: number;
  totalRevenue7d: number;
  activeTenants: number;
};

const SEGMENT_LABELS: Record<CentralSegment, string> = {
  ai: "IA",
  loyalty: "Fidelidade",
  campaigns: "Campanhas",
  push: "Push",
  conversational: "Conversacional",
};

export function segmentLabel(segment: CentralSegment): string {
  return SEGMENT_LABELS[segment];
}

/** Métricas agregadas por central, derivadas dos dados reais + estimativas coerentes */
export function aggregateCentralMetrics(
  snapshot: PlatformOperationalSnapshot,
  segment: CentralSegment,
) {
  const { tenants, totalOrders7d, activeTenants } = snapshot;
  const base = {
    activeTenants,
    totalClients: tenants.length,
  };

  switch (segment) {
    case "ai": {
      const modulesOn = tenants.reduce((s, t) => s + t.aiModulesOn, 0);
      const tenantsWithAi = tenants.filter((t) => t.aiModulesOn > 0).length;
      return {
        ...base,
        kpi1: { label: "Módulos activos", value: String(modulesOn) },
        kpi2: { label: "Restaurantes c/ IA", value: String(tenantsWithAi) },
        kpi3: { label: "Sugestões 7d", value: String(Math.round(totalOrders7d * 0.12)), estimated: true },
        kpi4: { label: "Motores", value: tenantsWithAi > 0 ? "Standby" : "Off", tone: "warning" as const },
      };
    }
    case "loyalty": {
      const withLoyalty = tenants.filter((t) => t.loyaltyActive).length;
      return {
        ...base,
        kpi1: { label: "Programas activos", value: String(withLoyalty) },
        kpi2: { label: "Retenção", value: withLoyalty > 0 ? "+14%" : ", ", estimated: true },
        kpi3: { label: "Clientes VIP", value: String(Math.round(totalOrders7d * 0.08)), estimated: true },
        kpi4: { label: "Carimbos 7d", value: String(Math.round(totalOrders7d * 0.35)), estimated: true },
      };
    }
    case "campaigns": {
      const withCampaigns = tenants.filter((t) => t.featuresOn >= 2).length;
      return {
        ...base,
        kpi1: { label: "Campanhas prontas", value: String(withCampaigns * 2), estimated: true },
        kpi2: { label: "Agendadas", value: String(Math.max(1, withCampaigns)), estimated: true },
        kpi3: { label: "Alcance 7d", value: String(Math.round(totalOrders7d * 1.4)), estimated: true },
        kpi4: { label: "Conversão", value: "8.2%", estimated: true },
      };
    }
    case "push": {
      const eligible = tenants.filter((t) => t.plan !== "start").length;
      return {
        ...base,
        kpi1: { label: "Subscrições", value: String(Math.round(totalOrders7d * 0.6)), estimated: true },
        kpi2: { label: "Envios 7d", value: String(Math.round(totalOrders7d * 0.25)), estimated: true },
        kpi3: { label: "Rest. elegíveis", value: String(eligible) },
        kpi4: { label: "Taxa abertura", value: "42%", estimated: true },
      };
    }
    case "conversational": {
      const premium = tenants.filter((t) => t.plan === "premium").length;
      return {
        ...base,
        kpi1: { label: "Fluxos activos", value: String(premium) },
        kpi2: { label: "Conversas 7d", value: String(Math.round(totalOrders7d * 0.18)), estimated: true },
        kpi3: { label: "Pedidos via chat", value: String(Math.round(totalOrders7d * 0.06)), estimated: true },
        kpi4: { label: "Tempo médio", value: "2.4 min", estimated: true },
      };
    }
  }
}

export function buildCentralTimeline(
  snapshot: PlatformOperationalSnapshot,
  segment: CentralSegment,
): TimelineEvent[] {
  const events: TimelineEvent[] = [];
  const top = [...snapshot.tenants].sort((a, b) => b.orders7d - a.orders7d).slice(0, 5);

  top.forEach((t, i) => {
    const mins = 15 + i * 47;
    const time = mins < 60 ? `há ${mins} min` : `há ${Math.floor(mins / 60)}h`;

    if (segment === "ai" && t.aiModulesOn > 0) {
      events.push({
        id: `ai-${t.tenantId}`,
        time,
        title: `Módulo IA · ${t.tenantName}`,
        detail: `${t.aiModulesOn} módulo(s) preparado(s)`,
        impact: t.orders7d > 0 ? `+${Math.min(22, 8 + t.aiModulesOn * 3)}% ticket est.` : undefined,
        tone: "success",
      });
    }
    if (segment === "campaigns" && t.featuresOn >= 1) {
      events.push({
        id: `camp-${t.tenantId}`,
        time,
        title: `Campanha preparada · ${t.tenantName}`,
        detail: "Modelo winback / horário fraco",
        impact: `${Math.max(12, t.orders7d)} contactos est.`,
        tone: "default",
      });
    }
    if (segment === "loyalty" && t.loyaltyActive) {
      events.push({
        id: `loy-${t.tenantId}`,
        time,
        title: `Fidelidade activa · ${t.tenantName}`,
        detail: "Programa de retenção ligado",
        impact: "+14% retenção est.",
        tone: "success",
      });
    }
    if (segment === "push" && t.plan !== "start") {
      events.push({
        id: `push-${t.tenantId}`,
        time,
        title: `Push preparado · ${t.tenantName}`,
        detail: "Segmento pós-pedido",
        impact: "42% abertura est.",
        tone: "muted",
      });
    }
    if (segment === "conversational" && t.plan === "premium") {
      events.push({
        id: `conv-${t.tenantId}`,
        time,
        title: `Fluxo conversacional · ${t.tenantName}`,
        detail: "Pedido por conversa (preview)",
        tone: "default",
      });
    }
  });

  if (events.length === 0) {
    events.push({
      id: "empty",
      time: ", ",
      title: "Nenhum evento operacional ainda",
      detail: "Activa módulos num restaurante para ver actividade estimada",
      tone: "muted",
    });
  }

  return events.slice(0, 8);
}

export function buildCentralInsights(
  snapshot: PlatformOperationalSnapshot,
  segment: CentralSegment,
): CentralInsight[] {
  const { totalOrders7d, totalRevenue7d, tenants } = snapshot;
  const avgOrders = tenants.length ? Math.round(totalOrders7d / tenants.length) : 0;

  const common: CentralInsight[] = [
    { label: "Pedidos 7d (plataforma)", value: String(totalOrders7d) },
    { label: "Receita 7d", value: `€${Math.round(totalRevenue7d)}` },
    { label: "Média por restaurante", value: `${avgOrders} pedidos` },
  ];

  const bySegment: Record<CentralSegment, CentralInsight[]> = {
    ai: [
      { label: "Previsão amanhã", value: `${Math.round(totalOrders7d / 7 * 1.08)} pedidos`, hint: "Baseado na média 7d", estimated: true },
      { label: "Horário pico", value: "19h – 21h", hint: "Padrão sector", estimated: true },
      { label: "Score plataforma", value: String(Math.min(96, 72 + tenants.filter((t) => t.aiModulesOn > 0).length * 8)), estimated: true },
    ],
    loyalty: [
      { label: "Retenção 30d", value: "+18%", hint: "Com programas activos", estimated: true },
      { label: "Clientes recorrentes", value: String(Math.round(totalOrders7d * 0.42)), estimated: true },
      { label: "Próxima acção", value: "Activar VIP", hint: "2 restaurantes elegíveis", estimated: true },
    ],
    campaigns: [
      { label: "Melhor dia", value: "Quinta-feira", hint: "Conversão histórica", estimated: true },
      { label: "Campanha sugerida", value: "Combo almoço", hint: "Horário 12h–14h", estimated: true },
      { label: "ROI campanhas", value: "3.2×", estimated: true },
    ],
    push: [
      { label: "Melhor hora envio", value: "18:30", hint: "Antes do pico", estimated: true },
      { label: "Opt-in", value: "38%", hint: "Pós-pedido totem", estimated: true },
      { label: "Reengagement", value: `${Math.max(0, tenants.length - 1)} inactivos`, estimated: true },
    ],
    conversational: [
      { label: "Intenção top", value: "Pedido delivery", hint: "Preview NLP", estimated: true },
      { label: "Upsell automático", value: "Bebida +12%", hint: "Quando activo", estimated: true },
      { label: "Premium activos", value: String(tenants.filter((t) => t.plan === "premium").length) },
    ],
  };

  return [...common, ...bySegment[segment]];
}

export function computeTenantHealthScore(row: TenantOperationalRow): number {
  let score = 40;
  if (row.orders7d > 0) score += Math.min(25, Math.round(row.orders7d / 2));
  score += row.aiModulesOn * 5;
  if (row.loyaltyActive) score += 10;
  if (row.featuresOn >= 2) score += 8;
  if (row.plan === "premium") score += 7;
  else if (row.plan === "pro") score += 4;
  return Math.min(100, score);
}

export function buildHubTimeline(snapshot: PlatformOperationalSnapshot): TimelineEvent[] {
  const events: TimelineEvent[] = [];
  const segments: CentralSegment[] = ["ai", "campaigns", "loyalty", "push", "conversational"];

  segments.forEach((seg, si) => {
    const sub = buildCentralTimeline(snapshot, seg).slice(0, 2);
    sub.forEach((e, i) => {
      events.push({
        ...e,
        id: `hub-${seg}-${i}-${si}`,
        detail: e.detail ? `[${segmentLabel(seg)}] ${e.detail}` : `[${segmentLabel(seg)}]`,
      });
    });
  });

  return events
    .filter((e) => e.id !== "empty")
    .slice(0, 12);
}

export type { LucideIcon };
