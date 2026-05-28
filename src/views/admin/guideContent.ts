import { SINGLE_TENANT_MODE } from "@/lib/appMode";

export interface FaqItem {
  q: string;
  a: string;
}

export interface FaqSection {
  title: string;
  items: FaqItem[];
}

const KEBAB_SECTIONS: FaqSection[] = [
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
        a: "Na administração geral do projecto, secção Cardápio. Crie categorias e depois produtos com preço, imagem e personalizações.",
      },
      {
        q: "Como importar um cardápio?",
        a: "No Cardápio, use Importar com IA e cole o texto do menu. A IA cria categorias e produtos.",
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
