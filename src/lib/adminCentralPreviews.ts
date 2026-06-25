/** Pré-visualizações estáticas com variantes para interacção leve nas centrais. */

export type PreviewVariant = { id: string; label: string; content: string };

export const AI_MODULE_PREVIEWS: Record<
  string,
  { variants: PreviewVariant[]; metricLabels: [string, string] }
> = {
  support: {
    variants: [
      { id: "a", label: "Dúvida", content: "Olá! O menu vegetariano inclui falafel?" },
      { id: "b", label: "Pedido", content: "Quero 2 kebabs mixtos para entrega." },
      { id: "c", label: "Horário", content: "Ainda estão abertos às 23h?" },
    ],
    metricLabels: ["Conversas hoje", "Tempo médio"],
  },
  seller: {
    variants: [
      { id: "a", label: "Sugestão", content: "Mesa 4: sugerir combo + bebida (+18% ticket)." },
      { id: "b", label: "Upsell", content: "Cliente pediu 1 kebab, oferecer batatas deluxe." },
    ],
    metricLabels: ["Sugestões", "Aceites"],
  },
  recovery: {
    variants: [
      { id: "a", label: "Winback", content: "Há 21 dias sem pedir, 10% só hoje." },
      { id: "b", label: "Carrinho", content: "Deixaste o carrinho, completa em 1 clique." },
    ],
    metricLabels: ["Reactivados", "Taxa resposta"],
  },
  marketing: {
    variants: [
      { id: "a", label: "Horário fraco", content: "15h–17h: -15% em entregas na zona centro." },
      { id: "b", label: "Combo", content: "Kebab + bebida por 9,90€ esta semana." },
    ],
    metricLabels: ["Ideias geradas", "Aprovadas"],
  },
};

export type CampaignTemplate = {
  key: string;
  title: string;
  subtitle: string;
  featureKey: string;
  accent: string;
  icon: "clock" | "heart" | "gift" | "trending" | "users";
  previews: PreviewVariant[];
};

export const CAMPAIGN_TEMPLATES: CampaignTemplate[] = [
  {
    key: "slow_hours",
    title: "Horário fraco",
    subtitle: "Boost de vendas em horas mortas",
    featureKey: "campaigns",
    accent: "from-amber-500/20 to-orange-500/10",
    icon: "clock",
    previews: [
      { id: "a", label: "Push", content: "🌯 20% off entre 15h e 17h, só hoje!" },
      { id: "b", label: "Banner", content: "Happy hour kebab · Entrega grátis 15h–17h" },
    ],
  },
  {
    key: "winback",
    title: "Winback",
    subtitle: "Trazer de volta quem sumiu",
    featureKey: "customer_recovery",
    accent: "from-rose-500/20 to-pink-500/10",
    icon: "heart",
    previews: [
      { id: "a", label: "30 dias", content: "Sentimos a tua falta! 10% no próximo pedido." },
      { id: "b", label: "60 dias", content: "Volta connosco, sobremesa grátis hoje." },
    ],
  },
  {
    key: "birthday",
    title: "Aniversário",
    subtitle: "Surpreender no dia especial",
    featureKey: "campaigns",
    accent: "from-violet-500/20 to-purple-500/10",
    icon: "gift",
    previews: [
      { id: "a", label: "SMS", content: "Parabéns! 🎂 Batatas deluxe grátis no teu pedido." },
      { id: "b", label: "Push", content: "É o teu dia, -15% em tudo até meia-noite." },
    ],
  },
  {
    key: "upsell",
    title: "Upsell",
    subtitle: "Aumentar valor do carrinho",
    featureKey: "campaigns",
    accent: "from-emerald-500/20 to-teal-500/10",
    icon: "trending",
    previews: [
      { id: "a", label: "Bebida", content: "Adiciona Coca-Cola por +1€, poupa 0,50€" },
      { id: "b", label: "Combo", content: "Faz combo: kebab + batatas por 11,90€" },
    ],
  },
  {
    key: "new_customers",
    title: "Novos clientes",
    subtitle: "Segunda encomenda incentivada",
    featureKey: "campaigns",
    accent: "from-sky-500/20 to-blue-500/10",
    icon: "users",
    previews: [
      { id: "a", label: "Boas-vindas", content: "Bem-vindo! -10% na 2.ª encomenda." },
      { id: "b", label: "Review", content: "Gostaste? Deixa review e ganha carimbo extra." },
    ],
  },
];

export const LOYALTY_PREVIEWS: Record<
  string,
  { tagline: string; variants: PreviewVariant[]; perks: string[] }
> = {
  stamps: {
    tagline: "Carimbos digitais, recompensa ao completar",
    variants: [
      { id: "a", label: "Cartão", content: "●●●●●●●●○○, faltam 2 para recompensa!" },
      { id: "b", label: "Recompensa", content: "🎉 10 carimbos! Kebab médio grátis." },
    ],
    perks: ["Simples de entender", "Ideal para takeaway", "Já activo no painel"],
  },
  points: {
    tagline: "Pontos por euro gasto, troca flexível",
    variants: [
      { id: "a", label: "Saldo", content: "1.240 pts · equivale a 6,20€ de desconto" },
      { id: "b", label: "Ganho", content: "+48 pts no último pedido de 24€" },
    ],
    perks: ["Flexível", "Cross-sell natural", "Preparado"],
  },
  cashback: {
    tagline: "Devolve % em crédito na próxima compra",
    variants: [
      { id: "a", label: "Saldo", content: "Cashback: 3,40€ disponível · expira em 30d" },
      { id: "b", label: "Ganho", content: "5% do pedido (18,50€) = +0,92€ cashback" },
    ],
    perks: ["Aumenta recompra", "Transparente", "Preparado"],
  },
  vip: {
    tagline: "Níveis Bronze · Prata · Ouro com benefícios",
    variants: [
      { id: "a", label: "Nível", content: "⭐ VIP Ouro, entrega prioritária + surpresas mensais" },
      { id: "b", label: "Progresso", content: "Prata → Ouro: 3 pedidos ou +80€ este mês" },
    ],
    perks: ["Sensação exclusiva", "Retenção alta", "Preparado"],
  },
};

export const CONVERSATIONAL_PREVIEWS: PreviewVariant[] = [
  { id: "a", label: "Pedido", content: "«Quero 2 kebabs mixtos sem cebola e uma Coca»" },
  { id: "b", label: "Confirmação", content: "«Perfeito! Total 19,80€, confirmar entrega?»" },
  { id: "c", label: "Alteração", content: "«Troca uma bebida por Água com gás, por favor»" },
];
