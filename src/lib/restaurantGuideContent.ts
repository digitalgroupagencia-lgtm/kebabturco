import type { FaqSection } from "@/views/admin/guideContent";

/** Guia operacional do restaurante — sem funções de admin geral. */
export const RESTAURANT_GUIDE_SECTIONS: FaqSection[] = [
  {
    title: "Primeiros passos",
    items: [
      {
        q: "Como acedo ao painel?",
        a: "Entre em /auth com o seu email e senha. Será redireccionado para /panel.\n\nAcesso rápido no telemóvel: abra o menu do cliente, toque no logótipo 5 vezes e use o código de acesso (com #) na Área da equipe.",
      },
      {
        q: "Como adiciono um membro da equipa?",
        a: "Equipe → Novo Membro. Preencha nome, email, senha, código de acesso (com #, ex: 482917#), papel e idioma (espanhol por defeito).\n\nApós criar, copie o resumo com instruções e envie ao funcionário (WhatsApp ou copiar).",
      },
      {
        q: "Quais são os papéis?",
        a: "Dono do restaurante, Gerente, Operador, Cozinha, Caixa, Atendente, Entregador. Cada um vê só o que precisa no menu lateral.",
      },
    ],
  },
  {
    title: "Pedidos e alertas",
    items: [
      {
        q: "Som e notificações de pedidos novos",
        a: "Em Pedidos ao vivo, active «Activar alertas» (som + push). O som repete até mudar o estado do pedido (ex.: para «A preparar»).",
      },
      {
        q: "Pedido em dinheiro (efectivo)",
        a: "Registe o pagamento na Caixa antes de iniciar a produção. Só depois mude o estado para preparação.",
      },
      {
        q: "Tempo de preparação",
        a: "Ao aceitar um pedido, indique o tempo estimado. O cliente vê a actualização no acompanhamento.",
      },
    ],
  },
  {
    title: "Entregador",
    items: [
      {
        q: "Fluxo do entregador",
        a: "1. Recebe notificação de pedido novo.\n2. Vê entregas atribuídas na área Entregas.\n3. Marca «A caminho» ao sair.\n4. Antes de entregar, pede ao cliente o código de 4 dígitos do pedido.\n5. Introduz o código na app para confirmar — o restaurante valida no painel.",
      },
    ],
  },
  {
    title: "Cozinha e caixa",
    items: [
      {
        q: "Cozinha",
        a: "Ecrã de cozinha / pedidos ao vivo. Prepare conforme ticket. Marque «Pronto» quando terminar.",
      },
      {
        q: "Caixa",
        a: "Confirme pagamentos em efectivo, imprima talões e consulte o resumo do dia.",
      },
    ],
  },
  {
    title: "Cardápio e configuração",
    items: [
      {
        q: "Alterar produtos ou preços",
        a: "Feito pelo administrador geral do projecto. No painel operacional consulta pedidos e opera o dia-a-dia.",
      },
      {
        q: "Promoções push aos clientes",
        a: "Configurações → Notificações → Promoção push (se activo no plano).",
      },
    ],
  },
];
