import type { StaffRole } from "@/lib/staffPermissions";
import { STAFF_ROLE_LABELS } from "@/lib/staffPermissions";

export type StaffLoginMethod = "email" | "google";

export type StaffOnboardingInput = {
  name: string;
  email: string;
  password: string;
  role: StaffRole;
  lang: "pt" | "es";
  siteUrl?: string;
  /** Código para confirmar pagamento em dinheiro no balcão (definido pelo gerente). */
  paymentCode?: string | null;
  loginMethod?: StaffLoginMethod;
};

function staffAreaSteps(site: string, lang: "pt" | "es"): string[] {
  if (lang === "es") {
    return [
      "Cómo entrar en el móvil:",
      `1. Abra el menú del cliente (${site})`,
      "2. Toque el logotipo 5 veces seguidas",
      "3. Se abre «Área del equipo»",
    ];
  }
  return [
    "Como entrar no telemóvel:",
    `1. Abra o menu do cliente (${site})`,
    "2. Toque no logótipo 5 vezes seguidas",
    "3. Abre «Área da equipe»",
  ];
}

function loginBlock(input: StaffOnboardingInput): string[] {
  const site = input.siteUrl?.replace(/\/$/, "") || "https://kebabturco.net";
  const usesGoogle = input.loginMethod === "google";

  if (input.lang === "es") {
    const lines = ["══ ACCESO AL PANEL ══", `Correo: ${input.email}`, ""];
    if (usesGoogle) {
      lines.push(
        "Entre SIEMPRE con Google (no necesita contraseña):",
        "4. Pulse «Continuar con Google» y elija la misma cuenta de arriba",
      );
    } else {
      lines.push(
        `Contraseña: ${input.password}`,
        "4. Introduzca el correo y la contraseña de arriba",
        "",
        "También puede entrar con Google usando el mismo correo.",
      );
    }
    lines.push("", ...staffAreaSteps(site, "es"), "", "Idioma: español por defecto. Use el icono 🌐 arriba a la derecha para cambiar.");
    return lines;
  }

  const lines = ["══ ACESSO AO PAINEL ══", `Email: ${input.email}`, ""];
  if (usesGoogle) {
    lines.push(
      "Entre SEMPRE com Google (não precisa de senha):",
      "4. Toque «Continuar com Google» e escolha a mesma conta indicada acima",
    );
  } else {
    lines.push(
      `Senha: ${input.password}`,
      "4. Introduza o e-mail e a senha indicados acima",
      "",
      "Também pode entrar com Google usando o mesmo e-mail.",
    );
  }
  lines.push("", ...staffAreaSteps(site, "pt"), "", "Idioma: espanhol por defeito. Use o ícone 🌐 no topo para mudar.");
  return lines;
}

function cashPaymentCodeBlock(input: StaffOnboardingInput): string[] {
  const code = input.paymentCode?.trim();
  if (!code) return [];

  if (input.lang === "es") {
    return [
      "",
      "══ CÓDIGO PARA PAGO EN EFECTIVO ══",
      `Su código: ${code}`,
      "",
      "Cuando un cliente paga en efectivo en la tablet, el sistema le pedirá ESTE código.",
      "Así queda registrado quién confirmó el cobro (no vale la sesión de quien esté logueado).",
      "",
      "Es solo suyo — no lo comparta. Si lo olvida, el gerente define uno nuevo en Equipo.",
      "Solo el gerente puede cambiarlo; usted no puede cambiarlo solo.",
    ];
  }
  return [
    "",
    "══ CÓDIGO PARA PAGAMENTO EM DINHEIRO ══",
    `O seu código: ${code}`,
    "",
    "Quando um cliente paga em dinheiro no tablet, o sistema pede ESTE código.",
    "Assim fica registado quem confirmou o pagamento (não vale a sessão de quem estiver ligado).",
    "",
    "É só seu — não partilhe. Se esquecer, o gerente define um novo em Equipa.",
    "Só o gerente pode alterá-lo; não pode mudá-lo sozinho/a.",
  ];
}

function roleSteps(role: StaffRole, lang: "pt" | "es"): string[] {
  const es: Partial<Record<StaffRole, string[]>> = {
    delivery: [
      "══ ENTREGADOR — QUÉ HACER ══",
      "1. Active notificaciones cuando el panel lo pida (nuevos pedidos).",
      "2. En «Entregas» vea pedidos asignados y listos para salir.",
      "3. Al recoger: cambie el estado a «En camino».",
      "4. Antes de entregar al cliente: pida el código de 4 dígitos del pedido.",
      "5. En la app, introduzca ese código para confirmar la entrega.",
      "6. El restaurante valida la entrega en el panel.",
    ],
    operator: [
      "══ OPERADOR — QUÉ HACER ══",
      "1. Abra «Pedidos ao vivo» — el sonido repite hasta cambiar el estado.",
      "2. Active alertas (sonido + notificaciones) la primera vez.",
      "3. Pedido nuevo: confirme, ponga tiempo de preparación.",
      "4. Si es en efectivo: registre el pago en caja ANTES de producir.",
      "5. Cambie estados: recibido → preparando → listo.",
      "6. Imprima o envíe a cocina según el flujo de la tienda.",
    ],
    kitchen: [
      "══ COCINA — QUÉ HACER ══",
      "1. Entre en «Cocina» o «Pedidos ao vivo» según su acceso.",
      "2. El aviso sonoro suena hasta que marque «En preparación» o «Listo».",
      "3. Prepare según el ticket — revise modificadores y notas.",
      "4. Marque «Listo» cuando termine para avisar al mostrador/entrega.",
    ],
    cashier: [
      "══ CAJA — QUÉ HACER ══",
      "1. Use «Caixa» para cobros y cuadre del día.",
      "2. Pedidos en efectivo: confirme el pago en el sistema antes de cocinar.",
      "3. Imprima ticket si el cliente lo necesita.",
    ],
    attendant: [
      "══ ATENDENTE — QUÉ HACER ══",
      "1. «Pedidos ao vivo» y mapa de mesas.",
      "2. Atienda pedidos nuevos y cambie estados.",
      "3. Efectivo: registre pago en caja antes de producción.",
    ],
    manager: [
      "══ GERENTE — QUÉ HACER ══",
      "1. Acceso casi completo al panel del restaurante.",
      "2. Equipo: crear miembros con correo y contraseña.",
      "3. Supervise pedidos, caja, entregas y configuración operativa.",
      "4. Guía completa en el menú «Guia» del panel.",
    ],
    restaurant_admin: [
      "══ DONO DO RESTAURANTE — QUÉ HACER ══",
      "1. Control total del panel: pedidos, equipo, caja, mesas.",
      "2. Configure alertas y notificaciones en «Pedidos ao vivo».",
      "3. Revise finanzas y operación diaria.",
      "4. Guía en «Guia» dentro del panel.",
    ],
  };

  const pt: Partial<Record<StaffRole, string[]>> = {
    delivery: [
      "══ ENTREGADOR — O QUE FAZER ══",
      "1. Active notificações quando o painel pedir (novos pedidos).",
      "2. Em «Entregas» veja pedidos atribuídos e prontos a sair.",
      "3. Ao recolher: mude o estado para «A caminho».",
      "4. Antes de entregar ao cliente: peça o código de 4 dígitos do pedido.",
      "5. Na app, introduza esse código para confirmar a entrega.",
      "6. O restaurante valida a entrega no painel.",
    ],
    operator: [
      "══ OPERADOR — O QUE FAZER ══",
      "1. Abra «Pedidos ao vivo» — o som repete até mudar o estado.",
      "2. Active alertas (som + notificações) na primeira vez.",
      "3. Pedido novo: confirme, indique tempo de preparação.",
      "4. Se for dinheiro: registe o pagamento na caixa ANTES de produzir.",
      "5. Mude estados: recebido → a preparar → pronto.",
      "6. Imprima ou envie para cozinha conforme o fluxo da loja.",
    ],
    kitchen: [
      "══ COZINHA — O QUE FAZER ══",
      "1. Entre em «Cozinha» ou «Pedidos ao vivo» conforme o acesso.",
      "2. O aviso sonoro toca até marcar «Em preparação» ou «Pronto».",
      "3. Prepare conforme o ticket — reveja modificadores e notas.",
      "4. Marque «Pronto» quando terminar para avisar balcão/entrega.",
    ],
    cashier: [
      "══ CAIXA — O QUE FAZER ══",
      "1. Use «Caixa» para cobranças e fecho do dia.",
      "2. Pedidos em dinheiro: confirme pagamento no sistema antes de cozinhar.",
      "3. Imprima talão se o cliente precisar.",
    ],
    attendant: [
      "══ ATENDENTE — O QUE FAZER ══",
      "1. «Pedidos ao vivo» e mapa de mesas.",
      "2. Atenda pedidos novos e mude estados.",
      "3. Dinheiro: registe pagamento na caixa antes da produção.",
    ],
    manager: [
      "══ GERENTE — O QUE FAZER ══",
      "1. Acesso quase completo ao painel do restaurante.",
      "2. Equipa: criar membros com e-mail e senha.",
      "3. Supervise pedidos, caixa, entregas e configuração operativa.",
      "4. Guia completa no menu «Guia» do painel.",
    ],
    restaurant_admin: [
      "══ DONO DO RESTAURANTE — O QUE FAZER ══",
      "1. Controlo total do painel: pedidos, equipa, caixa, mesas.",
      "2. Configure alertas e notificações em «Pedidos ao vivo».",
      "3. Revise finanças e operação diária.",
      "4. Guia em «Guia» dentro do painel.",
    ],
  };

  const map = lang === "es" ? es : pt;
  return map[role] ?? (lang === "es"
    ? [`Función: ${STAFF_ROLE_LABELS[role]}. Consulte al gerente y la «Guia» del panel.`]
    : [`Função: ${STAFF_ROLE_LABELS[role]}. Consulte o gerente e a «Guia» do painel.`]);
}

export function buildStaffOnboardingSummary(input: StaffOnboardingInput): string {
  const roleLabel = STAFF_ROLE_LABELS[input.role] ?? input.role;
  const header = input.lang === "es"
    ? `Bienvenido/a, ${input.name || input.email}!\nPerfil: ${roleLabel}\n`
    : `Bem-vindo/a, ${input.name || input.email}!\nPerfil: ${roleLabel}\n`;

  return [header, ...loginBlock(input), ...cashPaymentCodeBlock(input), "", ...roleSteps(input.role, input.lang)].join("\n");
}

export function buildStaffOnboardingWhatsAppUrl(text: string): string {
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}
