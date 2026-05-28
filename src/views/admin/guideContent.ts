import { SINGLE_TENANT_MODE } from "@/lib/appMode";
import { RESTAURANT_GUIDE_SECTIONS } from "@/lib/restaurantGuideContent";

export interface FaqItem {
  q: string;
  a: string;
}

export interface FaqSection {
  title: string;
  items: FaqItem[];
}

const ADMIN_INTERNAL_SECTIONS: FaqSection[] = [
  {
    title: "Administração geral (interno)",
    items: [
      {
        q: "O que só o admin geral faz?",
        a: "Cardápio completo, identidade visual, planos, centrais (push, IA, campanhas), utilizadores globais e diagnósticos técnicos. O painel do restaurante não acede a estas áreas.",
      },
      {
        q: "Como activo push marketing para o restaurante?",
        a: "Admin → Centrais → Push. Active a função por tenant/plano. O restaurante envia promoções em Configurações → Notificações.",
      },
      {
        q: "Onde vejo o guia do restaurante?",
        a: "Nesta central de ajuda, secção «Operação do restaurante» abaixo — é o mesmo conteúdo que a equipa vê em /panel/guide.",
      },
    ],
  },
];

const KEBAB_SECTIONS: FaqSection[] = [
  {
    title: "Operação do restaurante (equipa)",
    items: RESTAURANT_GUIDE_SECTIONS.flatMap((s) =>
      s.items.map((it) => ({ q: `[Restaurante] ${it.q}`, a: it.a })),
    ),
  },
  {
    title: "Como aceder a cada área (Kebab Turco)",
    items: [
      {
        q: "Como acedo à administração geral?",
        a: "Faça login na página de entrada. Com perfil de administrador geral, abre automaticamente o painel de administração (Command Center): planos, centrais, identidade visual, utilizadores e definições.",
      },
      {
        q: "Como o dono do restaurante acede ao painel?",
        a: "Entra na página de login com o e-mail e palavra-passe. É levado ao painel do restaurante: pedidos, cardápio, caixa, equipa e configurações do Kebab Turco.",
      },
      {
        q: "Como o vendedor acede à app?",
        a: "Entra na página de login. É redireccionado para a área do vendedor (telemóvel): mesas, novos pedidos e os seus pedidos. Não vê administração nem painel completo.",
      },
      {
        q: "Como o cliente final usa a loja?",
        a: "Abre o site público do Kebab Turco (totem ou online), escolhe idioma, tipo de pedido e faz o pedido no cardápio.",
      },
    ],
  },
  {
    title: "Cardápio e produtos",
    items: [
      {
        q: "Onde cadastro produtos?",
        a: "Admin → Cardápio. No topo escolha a unidade (Gandia ou Playa Gandia). Crie categorias e produtos com preço, imagem e personalizações.",
      },
      {
        q: "Como copiar o cardápio para Playa Gandia?",
        a: "Admin → Cardápio → selector Playa Gandia → secção «Duplicar cardápio» → origem Gandia → Duplicar cardápio. Fica independente: editar na praia não muda Gandia.",
      },
      {
        q: "Como importar um cardápio?",
        a: "No Cardápio, use Importar com IA e cole o texto do menu. A IA cria categorias e produtos.",
      },
      {
        q: "Personalização global",
        a: "Admin → Personalização → unidade Gandia. Se vazio, «Importar personalizações do cardápio». Liga grupos aos produtos em Cardápio ao editar cada produto.",
      },
    ],
  },
  {
    title: "Vendedor / garçom",
    items: [
      {
        q: "Como criar um vendedor?",
        a: "No painel do restaurante, secção Vendedores. Indique nome, e-mail e palavra-passe inicial.",
      },
      {
        q: "O vendedor mexe no cardápio?",
        a: "Não. Só usa a área do vendedor para mesas e pedidos.",
      },
    ],
  },
  ...ADMIN_INTERNAL_SECTIONS,
];

const PLATFORM_SECTIONS: FaqSection[] = [
  {
    title: "Plataforma multi-cliente (legado)",
    items: [
      {
        q: "Gestão de vários clientes",
        a: "Este modo foi desactivado neste projecto. Use apenas a administração geral e o painel do Kebab Turco.",
      },
    ],
  },
];

export const GUIDE_SECTIONS: FaqSection[] = SINGLE_TENANT_MODE ? KEBAB_SECTIONS : [...KEBAB_SECTIONS, ...PLATFORM_SECTIONS];
