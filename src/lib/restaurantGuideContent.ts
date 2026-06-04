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
        a: "Equipe → Novo Membro. Preencha nome, e-mail, senha, papel e idioma (espanhol por defeito).\n\nApós criar, copie o resumo com instruções e envie ao funcionário (WhatsApp ou copiar). Ele entra na app com esse e-mail e senha (5 toques no logótipo → Área da equipe).",
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
        a: "Feito na administração geral (/admin) → Cardápio. Escolha a unidade no selector (Gandia ou Playa Gandia). Cada loja tem cardápio independente — mudar preço numa não altera a outra.",
      },
      {
        q: "Duas lojas (Gandia e Playa Gandia)",
        a: "O cliente escolhe a loja ao encomendar. No admin, use o selector no topo do Cardápio. Cada loja tem cardápio independente — alterar preços numa não muda na outra.",
      },
      {
        q: "Personalização (extras, carne, ingredientes)",
        a: "Admin → Personalização. Escolha a unidade Gandia. Se estiver vazio, use «Importar personalizações do cardápio». Depois pode editar grupos e opções.",
      },
      {
        q: "Promoções push aos clientes",
        a: "Configurações → Notificações → Promoção push (se activo no plano).",
      },
    ],
  },
  {
    title: "Notificações no tablet (som, impressão e push)",
    items: [
      {
        q: "Quando o tablet toca, imprime e mostra notificação?",
        a: "Resumo por cenário no tablet do restaurante (com o app instalado da Play Store e sessão iniciada no painel):\n\n**1) App aberto, tela ligada** ✅\nSom toca, alerta visual aparece e a impressora dispara automaticamente. Cenário ideal — é como o tablet deve ficar durante o serviço.\n\n**2) App aberto, tela bloqueada** ✅\nSom toca (alerta sonoro nativo) e push aparece no ecrã de bloqueio. A impressão dispara assim que a tela é desbloqueada e o app volta ao primeiro plano. Recomenda-se ativar «Manter ecrã ligado» nas Configurações do tablet.\n\n**3) App aberto e outro aplicativo em primeiro plano** ✅\nPush chega na barra superior + som. Ao tocar na notificação, abre o painel e imprime o pedido pendente. Se ignorar, o pedido fica na fila e imprime ao voltar ao painel.\n\n**4) App fechado, tela ligada** ⚠️\nPush chega na barra de notificações e toca o som padrão do sistema. **A impressão só dispara depois de abrir o app.** Por isso recomendamos deixar o app SEMPRE aberto durante o serviço.\n\n**5) App fechado, tela bloqueada** ⚠️\nPush chega normalmente (Android acorda o ecrã). Mesmo caso anterior: a impressão automática só acontece ao abrir o app. Pedido fica seguro no servidor e imprime ao reentrar.",
      },
      {
        q: "Recomendações para o restaurante",
        a: "**Para garantir que NUNCA perde um pedido:**\n\n• Deixe o app do painel SEMPRE aberto no tablet durante o expediente.\n• Ative «Manter ecrã ligado» (Configurações Android → Ecrã → Tempo limite → Nunca, ou use o modo Quiosque).\n• Ligue o tablet à corrente — não dependa da bateria.\n• Active os «Alertas» dentro de Pedidos ao Vivo (botão «Activar alertas»). Sem isso, o som não toca.\n• Mantenha o volume do tablet no máximo.\n• Wi-Fi estável é essencial (impressora LAN + app dependem da mesma rede).\n• Permissões obrigatórias: Notificações, Som, Manter ativo em segundo plano (em alguns Androids: Configurações → Apps → SnapOrder → Bateria → Sem restrições).",
      },
      {
        q: "A impressora imprime mesmo com o tablet bloqueado?",
        a: "Depende. A impressão é disparada pelo painel — então:\n\n• Se o app está aberto (mesmo com a tela bloqueada), a impressora dispara normalmente assim que o pedido chega, porque o painel continua escutando.\n• Se o app foi fechado pelo Android (por economia de bateria ou tempo de inatividade), o pedido só será impresso quando alguém abrir o painel novamente.\n\nPor isso a regra de ouro: **app sempre aberto + tablet ligado à corrente + bateria sem restrições.**",
      },
      {
        q: "O som não está tocando, o que verifico?",
        a: "1. Botão «Activar alertas» está verde em Pedidos ao Vivo?\n2. Volume do tablet no máximo (volume de mídia + notificações)?\n3. Modo Não Perturbe desligado?\n4. App tem permissão de notificações? (Configurações Android → Apps → SnapOrder → Notificações → Permitir tudo)\n5. Bateria sem restrições para o app?\n\nSe tudo OK e ainda não toca, peça ao admin master para abrir a aba «Diagnóstico» e rodar o teste de som/push.",
      },
    ],
  },
];
