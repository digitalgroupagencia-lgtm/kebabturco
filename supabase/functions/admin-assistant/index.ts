import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `Você é o "Assistente EL REY", co-piloto do Admin Master de uma plataforma SaaS multi-tenant de restaurantes (totem + painel restaurante + app cliente + admin master). Fala português simples, sem jargão técnico. É direto, prático, guia passo a passo E EXECUTA mudanças no sistema quando o usuário pede.

## REGRAS DE OURO
1. **Português simples sempre.** O dono do produto não programa. Nada de "RLS", "migration", "schema" sem explicar em palavras humanas primeiro.
2. **Você pode EDITAR o sistema** chamando as ferramentas abaixo. Se a ação mapeia numa ferramenta, EXECUTE — não mande o usuário fazer manual.
3. **Confirme antes de mudanças destrutivas** (desativar tenant, apagar banner, mudar plano). Mudanças simples (cor, toggle, mensagem) pode executar direto.
4. **Se está fora do alcance** (nova feature, mudar layout, lógica nova), chame \`draft_lovable_request\` para gerar pedido pronto pra colar no chat do Lovable.
5. **Nunca minta.** Se a ferramenta falhar, mostra o erro literal.
6. Passos numerados para "como fazer"; frases curtas para "feito".

## DIFERENÇA CÓDIGO vs BANCO (pergunta frequente do usuário)
Sempre que o usuário perguntar "por que está desatualizado?", "qual a diferença de código e banco?", "como atualizar o banco?", responda assim:

- **Código** = o app em si (telas, botões, fluxo de pedido, impressão, painel). Publicado no Lovable em kebabturco.net.
- **Banco** = onde ficam os dados (pedidos, produtos, clientes, configurações) e a estrutura deles (tabelas, colunas, regras).
- Publicar atualiza só o código. O banco precisa de uma migration para acompanhar.
- Quando aparecer "Existem migrations pendentes" ou "Banco em X, código em Y", o caminho é:
  1. Abrir **Administração → Versão do Template** (/admin/template-version)
  2. Clicar no botão laranja **"Atualizar banco para vX.Y.Z"**
  3. Pronto. O aviso desaparece e fica registrado no histórico.
- Se o botão não aparecer ou der erro, aí sim pedir no chat do Lovable para criar migration nova.

## ÁREAS DO SISTEMA (mapa completo)

### Admin Master (/admin) — só admin_master
- /admin — dashboard
- /admin/tenants — lista, criar/editar restaurantes (Wizard IA)
- /admin/plans — planos e features
- /admin/banner — banners de imagem/MP4/MOV/MP3
- /admin/template-version — código vs banco + botão atualizar + histórico
- /admin/order-simulator — teste guiado (diagnóstico, pedido teste, limpar fila)
- /admin/printer — Print Bridge status
- /admin/routes — todas as rotas do app
- /admin/settings — configurações globais (manutenção, idioma padrão, IA)
- Monitoramento financeiro: admin_master vê tudo, restaurant_admin só a própria loja.

### Painel Restaurante (/panel) — restaurant_admin/operator
- /panel — pedidos em tempo real
- /panel/menu — produtos, categorias, modificadores
- /panel/cashier — caixa
- /panel/kds — cozinha (Kitchen Display)
- /panel/delivery — entregadores
- /panel/tables — mesas/QR
- /panel/seller — vendedor (atendimento balcão)
- /panel/reports — relatórios

### App Cliente (/) — público
- Splash → idioma → loja → modalidade (delivery/takeaway/mesa) → cardápio → carrinho → pagamento → tracking → fidelidade/cupom.

### Totem — touch-first, mesma origem do cliente com layout próprio
- Botões mínimo 48px, multi-idioma pt/en/es/fr.

## FUNCIONALIDADES TRANSVERSAIS

### Print Bridge
- **Modo Android direct**: o próprio tablet do painel é o Bridge. Manda heartbeat só com a aba aberta e ativa. Se ficar 2 min sem sinal → "inativo". Cura: abrir o painel no tablet e deixar acordado.
- **Modo PC**: PC com Kebab Print Bridge rodando + impressora em rede. Se "inativo": PC ligado? Bridge no taskbar? \`start.bat\` em \`C:\\kebab-print-bridge\\\` rodando? Impressora respondendo no IP?
- Estados: ativo (verde, ok), inativo (vermelho, agir), unknown (cinza, primeira vez/sem dados), checking (verificando).

### Push notifications
- Cliente: PWA + nativo (FCM). Pede permissão na primeira abertura.
- Tablet/Painel: push para novos pedidos quando aba não está em foco.

### Roles e permissões
- **admin_master** — você (dono da plataforma). Vê tudo.
- **restaurant_admin** — dono de 1 restaurante. Só a própria loja.
- **operator** — funcionário no painel.
- **kitchen** — só KDS.
- Tudo em tabela \`user_roles\` (NUNCA na profiles, por segurança).

### Multi-idioma
- pt/en/es/fr. Conteúdo dinâmico em JSONB (\`name_i18n\`, \`description_i18n\`).

### Pagamentos
- Stripe Connect (cada restaurante recebe direto na conta dele).
- Métodos: cartão, dinheiro, Pix, Apple/Google Pay, pagar no balcão, link.
- Configurável por loja em /panel/settings ou via \`update_operations\`.

### Cupons e fidelidade
- Cupons: código, % ou valor fixo, validade, mínimo, limite de uso.
- Fidelidade: sistema de selos (loyalty_accounts).

### Entregadores
- /panel/delivery. Atribuir pedido, confirmar entrega, tracking.

### Domínio próprio
- /admin/tenants/[id]/domain. Apontar CNAME para a master, ativar SSL.

### Criar novo restaurante
- /admin/tenants → "Novo (Wizard IA)" → nome, slug, plano → IA importa cardápio se quiser → bootstrap automático.

## FERRAMENTAS DE EXECUÇÃO (use sem hesitar)
- \`list_tenant_domains\` — lista todos os clientes com URLs
- \`list_tenants_brief\` — busca rápida (use ANTES de qualquer update_*)
- \`update_branding\` — cores, nome, fonte
- \`update_operations\` — pagamentos, modo, mensagens
- \`update_totem_config\` — modalidades, idiomas
- \`update_platform_settings\` — config global
- \`update_tenant\` — plano, domínio, limite, ativo
- \`list_banners\` / \`toggle_banner\`
- \`draft_lovable_request\` — quando está fora do alcance

## EXEMPLOS
- "por que está desatualizado?" → explica código vs banco em 4 linhas + manda em /admin/template-version e clicar no botão.
- "como atualizo o banco?" → "Abre /admin/template-version e clica no botão laranja 'Atualizar banco para vX.Y.Z'. Pronto."
- "o print bridge tá inativo" → explica os 2 modos, pergunta qual está usando, dá passos.
- "muda cor do Kebab pra #8B1A1A" → \`list_tenants_brief\` → \`update_branding\` → confirma.
- "quero campo de CPF no checkout" → fora do alcance → \`draft_lovable_request\`.

Seja útil, rápido, sem enrolação. Português simples. Execute primeiro, explique depois.`;


const TOOLS = [
  {
    type: "function",
    function: {
      name: "list_tenant_domains",
      description: "Lista todos os tenants ativos com domínios, slug, plano e URLs (totem, painel, admin).",
      parameters: {
        type: "object",
        properties: {
          include_inactive: { type: "boolean", description: "Inclui tenants desativados. Padrão: false." },
        },
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "list_tenants_brief",
      description: "Busca rápida de tenants por nome ou slug. Retorna id, nome, slug e store_id da primeira loja (use o slug nos updates).",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "Texto a procurar no nome ou slug. Vazio = todos." },
        },
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "update_branding",
      description: "Atualiza identidade visual (cores e nome) do tenant. Cores em formato hex (#RRGGBB).",
      parameters: {
        type: "object",
        properties: {
          tenant_slug: { type: "string" },
          company_name: { type: "string" },
          header_color: { type: "string", description: "Cor da barra superior do totem" },
          primary_color: { type: "string" },
          secondary_color: { type: "string" },
          accent_color: { type: "string" },
          cta_color: { type: "string" },
          background_color: { type: "string" },
          text_color: { type: "string" },
          font_family: { type: "string" },
          button_style: { type: "string", enum: ["rounded", "square", "pill"] },
        },
        required: ["tenant_slug"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "update_operations",
      description: "Atualiza configurações de operação/pagamento do tenant.",
      parameters: {
        type: "object",
        properties: {
          tenant_slug: { type: "string" },
          payment_mode: { type: "string", enum: ["online", "counter", "mixed"] },
          pay_card_enabled: { type: "boolean" },
          pay_cash_enabled: { type: "boolean" },
          pay_pix_enabled: { type: "boolean" },
          pay_apple_enabled: { type: "boolean" },
          pay_google_enabled: { type: "boolean" },
          pay_counter_enabled: { type: "boolean" },
          pay_link_enabled: { type: "boolean" },
          msg_paid: { type: "string" },
          banner_enabled: { type: "boolean" },
          banner_interval_ms: { type: "integer" },
        },
        required: ["tenant_slug"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "update_totem_config",
      description: "Ativa/desativa tipos de pedido e ajusta idiomas do totem.",
      parameters: {
        type: "object",
        properties: {
          tenant_slug: { type: "string" },
          enable_dine_in: { type: "boolean" },
          enable_takeaway: { type: "boolean" },
          enable_delivery: { type: "boolean" },
          primary_language: { type: "string", enum: ["pt", "en", "es", "fr"] },
          active_languages: {
            type: "array",
            items: { type: "string", enum: ["pt", "en", "es", "fr"] },
          },
        },
        required: ["tenant_slug"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "update_platform_settings",
      description: "Atualiza configurações GLOBAIS da plataforma (não escopadas a um tenant).",
      parameters: {
        type: "object",
        properties: {
          platform_name: { type: "string" },
          support_email: { type: "string" },
          default_language: { type: "string" },
          default_currency: { type: "string" },
          default_plan: { type: "string" },
          default_max_orders: { type: "integer" },
          trial_days: { type: "integer" },
          maintenance_mode: { type: "boolean" },
          maintenance_message: { type: "string" },
          ai_auto_menu: { type: "boolean" },
          ai_auto_images: { type: "boolean" },
          ai_image_style: { type: "string" },
        },
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "update_tenant",
      description: "Atualiza dados básicos do tenant (plano, domínio, limite, status).",
      parameters: {
        type: "object",
        properties: {
          tenant_slug: { type: "string" },
          name: { type: "string" },
          plan: { type: "string" },
          custom_domain: { type: "string" },
          max_orders_month: { type: "integer" },
          is_active: { type: "boolean" },
        },
        required: ["tenant_slug"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "list_banners",
      description: "Lista banners promocionais de um tenant.",
      parameters: {
        type: "object",
        properties: { tenant_slug: { type: "string" } },
        required: ["tenant_slug"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "toggle_banner",
      description: "Ativa ou desativa um banner específico (use list_banners primeiro para ver os ids).",
      parameters: {
        type: "object",
        properties: {
          banner_id: { type: "string" },
          is_active: { type: "boolean" },
        },
        required: ["banner_id", "is_active"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "draft_lovable_request",
      description: "Gera um pedido pronto pra copiar e colar no chat do Lovable quando algo está fora do alcance das outras ferramentas (mudança de layout, nova feature, nova lógica, ajuste de código).",
      parameters: {
        type: "object",
        properties: {
          summary: { type: "string", description: "Resumo curto do que o usuário quer (1 linha)" },
          details: { type: "string", description: "Detalhes, contexto, telas envolvidas, comportamento esperado" },
        },
        required: ["summary", "details"],
        additionalProperties: false,
      },
    },
  },
];

async function resolveStoreId(admin: any, slug: string): Promise<string | null> {
  const { data: t } = await admin.from("tenants").select("id").eq("slug", slug).maybeSingle();
  if (!t) return null;
  const { data: s } = await admin
    .from("stores")
    .select("id")
    .eq("tenant_id", t.id)
    .order("sort_order")
    .limit(1)
    .maybeSingle();
  return s?.id ?? null;
}

async function runTool(name: string, args: any) {
  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  if (name === "list_tenant_domains") {
    const includeInactive = args?.include_inactive === true;
    let q = admin.from("tenants").select("id,name,slug,custom_domain,path_slug,master_domain,use_master_domain,plan,is_active,max_orders_month").order("name");
    if (!includeInactive) q = q.eq("is_active", true);
    const { data, error } = await q;
    if (error) return { error: error.message };
    const buildTotemUrl = (t: {
      custom_domain?: string | null;
      slug: string;
      path_slug?: string | null;
      master_domain?: string | null;
      use_master_domain?: boolean | null;
    }) => {
      if (t.custom_domain) return `https://${t.custom_domain.replace(/^https?:\/\//, "")}/`;
      if (t.use_master_domain && t.master_domain && t.path_slug) {
        return `https://${t.master_domain.replace(/^https?:\/\//, "")}/${t.path_slug}`;
      }
      return null;
    };
    return {
      tenants: (data ?? []).map((t: any) => {
        const totem = buildTotemUrl(t);
        const origin = t.custom_domain ? `https://${t.custom_domain}` : totem?.replace(/\/[^/]*$/, "") || null;
        return {
          name: t.name,
          slug: t.slug,
          plan: t.plan,
          is_active: t.is_active,
          custom_domain: t.custom_domain,
          totem_url: totem ?? `(configurar domínio — slug: ${t.slug})`,
          panel_login_url: origin ? `${origin}/panel` : `(configurar domínio)/panel`,
        };
      }),
    };
  }

  if (name === "list_tenants_brief") {
    const query = (args?.query ?? "").toString().trim();
    let q = admin.from("tenants").select("id,name,slug,is_active").order("name");
    if (query) q = q.or(`name.ilike.%${query}%,slug.ilike.%${query}%`);
    const { data, error } = await q.limit(20);
    if (error) return { error: error.message };
    const out: any[] = [];
    for (const t of data ?? []) {
      const storeId = await resolveStoreId(admin, t.slug);
      out.push({ ...t, store_id: storeId });
    }
    return { tenants: out };
  }

  if (name === "update_branding") {
    const { tenant_slug, ...fields } = args ?? {};
    if (!tenant_slug) return { error: "tenant_slug obrigatório" };
    const storeId = await resolveStoreId(admin, tenant_slug);
    if (!storeId) return { error: `Tenant '${tenant_slug}' não encontrado` };
    const update: any = {};
    for (const k of ["company_name", "header_color", "primary_color", "secondary_color", "accent_color", "cta_color", "background_color", "text_color", "font_family", "button_style"]) {
      if (fields[k] !== undefined) update[k] = fields[k];
    }
    if (Object.keys(update).length === 0) return { error: "Nenhum campo para atualizar" };
    const { error } = await admin.from("company_settings").update(update).eq("store_id", storeId);
    if (error) return { error: error.message };
    return { ok: true, updated: update, tenant_slug };
  }

  if (name === "update_operations") {
    const { tenant_slug, ...fields } = args ?? {};
    if (!tenant_slug) return { error: "tenant_slug obrigatório" };
    const storeId = await resolveStoreId(admin, tenant_slug);
    if (!storeId) return { error: `Tenant '${tenant_slug}' não encontrado` };
    const update: any = {};
    for (const k of ["payment_mode", "pay_card_enabled", "pay_cash_enabled", "pay_pix_enabled", "pay_apple_enabled", "pay_google_enabled", "pay_counter_enabled", "pay_link_enabled", "msg_paid", "banner_enabled", "banner_interval_ms"]) {
      if (fields[k] !== undefined) update[k] = fields[k];
    }
    if (Object.keys(update).length === 0) return { error: "Nenhum campo para atualizar" };
    // upsert para garantir
    const { data: existing } = await admin.from("operations_settings").select("id").eq("store_id", storeId).maybeSingle();
    if (existing) {
      const { error } = await admin.from("operations_settings").update(update).eq("store_id", storeId);
      if (error) return { error: error.message };
    } else {
      const { error } = await admin.from("operations_settings").insert({ store_id: storeId, ...update });
      if (error) return { error: error.message };
    }
    return { ok: true, updated: update, tenant_slug };
  }

  if (name === "update_totem_config") {
    const { tenant_slug, ...fields } = args ?? {};
    if (!tenant_slug) return { error: "tenant_slug obrigatório" };
    const storeId = await resolveStoreId(admin, tenant_slug);
    if (!storeId) return { error: `Tenant '${tenant_slug}' não encontrado` };
    const update: any = {};
    for (const k of ["enable_dine_in", "enable_takeaway", "enable_delivery", "primary_language", "active_languages"]) {
      if (fields[k] !== undefined) update[k] = fields[k];
    }
    if (Object.keys(update).length === 0) return { error: "Nenhum campo para atualizar" };
    const { data: existing } = await admin.from("totem_config").select("id").eq("store_id", storeId).maybeSingle();
    if (existing) {
      const { error } = await admin.from("totem_config").update(update).eq("store_id", storeId);
      if (error) return { error: error.message };
    } else {
      const { error } = await admin.from("totem_config").insert({ store_id: storeId, ...update });
      if (error) return { error: error.message };
    }
    return { ok: true, updated: update, tenant_slug };
  }

  if (name === "update_platform_settings") {
    const fields = args ?? {};
    const allowed = ["platform_name", "support_email", "default_language", "default_currency", "default_plan", "default_max_orders", "trial_days", "maintenance_mode", "maintenance_message", "ai_auto_menu", "ai_auto_images", "ai_image_style"];
    const update: any = {};
    for (const k of allowed) if (fields[k] !== undefined) update[k] = fields[k];
    if (Object.keys(update).length === 0) return { error: "Nenhum campo para atualizar" };
    const { data: existing } = await admin.from("platform_settings").select("id").limit(1).maybeSingle();
    if (existing) {
      const { error } = await admin.from("platform_settings").update(update).eq("id", existing.id);
      if (error) return { error: error.message };
    } else {
      const { error } = await admin.from("platform_settings").insert(update);
      if (error) return { error: error.message };
    }
    return { ok: true, updated: update };
  }

  if (name === "update_tenant") {
    const { tenant_slug, ...fields } = args ?? {};
    if (!tenant_slug) return { error: "tenant_slug obrigatório" };
    const update: any = {};
    for (const k of ["name", "plan", "custom_domain", "max_orders_month", "is_active"]) {
      if (fields[k] !== undefined) update[k] = fields[k];
    }
    if (Object.keys(update).length === 0) return { error: "Nenhum campo para atualizar" };
    const { error } = await admin.from("tenants").update(update).eq("slug", tenant_slug);
    if (error) return { error: error.message };
    return { ok: true, updated: update, tenant_slug };
  }

  if (name === "list_banners") {
    const { tenant_slug } = args ?? {};
    if (!tenant_slug) return { error: "tenant_slug obrigatório" };
    const storeId = await resolveStoreId(admin, tenant_slug);
    if (!storeId) return { error: `Tenant '${tenant_slug}' não encontrado` };
    const { data, error } = await admin.from("promo_banners").select("id,media_type,image_url,video_url,is_active,sort_order").eq("store_id", storeId).order("sort_order");
    if (error) return { error: error.message };
    return { banners: data ?? [] };
  }

  if (name === "toggle_banner") {
    const { banner_id, is_active } = args ?? {};
    if (!banner_id) return { error: "banner_id obrigatório" };
    const { error } = await admin.from("promo_banners").update({ is_active: !!is_active }).eq("id", banner_id);
    if (error) return { error: error.message };
    return { ok: true, banner_id, is_active: !!is_active };
  }

  if (name === "draft_lovable_request") {
    const { summary, details } = args ?? {};
    const draft = `**${summary}**\n\n${details}`;
    return {
      ok: true,
      message: "Pedido formatado pronto. Copie o bloco abaixo e cole no chat do Lovable.",
      draft,
    };
  }

  return { error: `Unknown tool: ${name}` };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // ===== Valida que o caller é admin_master =====
    const authHeader = req.headers.get("Authorization") || "";
    const jwt = authHeader.replace(/^Bearer\s+/i, "");
    if (!jwt) {
      return new Response(JSON.stringify({ error: "Não autenticado." }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const authClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: `Bearer ${jwt}` } } },
    );
    const { data: userData, error: userErr } = await authClient.auth.getUser();
    if (userErr || !userData.user) {
      return new Response(JSON.stringify({ error: "Sessão inválida." }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const { data: roleRow } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", userData.user.id)
      .eq("role", "admin_master")
      .maybeSingle();
    if (!roleRow) {
      return new Response(JSON.stringify({ error: "Acesso restrito ao Admin Master." }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    // ===== Fim validação =====

    const { messages } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY missing");

    const conv: any[] = [{ role: "system", content: SYSTEM_PROMPT }, ...messages];

    for (let step = 0; step < 5; step++) {
      const planResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: conv,
          tools: TOOLS,
          tool_choice: "auto",
        }),
      });

      if (planResp.status === 429) {
        return new Response(JSON.stringify({ error: "Limite de uso atingido, tente mais tarde." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (planResp.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos insuficientes no Lovable AI." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (!planResp.ok) {
        const txt = await planResp.text();
        throw new Error("Gateway error: " + txt);
      }

      const planData = await planResp.json();
      const msg = planData.choices?.[0]?.message;
      const toolCalls = msg?.tool_calls;

      if (!toolCalls || toolCalls.length === 0) break;

      conv.push({ role: "assistant", content: msg.content ?? "", tool_calls: toolCalls });
      for (const call of toolCalls) {
        let parsedArgs: any = {};
        try { parsedArgs = JSON.parse(call.function?.arguments ?? "{}"); } catch {}
        const result = await runTool(call.function?.name, parsedArgs);
        conv.push({ role: "tool", tool_call_id: call.id, content: JSON.stringify(result) });
      }
    }

    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: "google/gemini-2.5-flash", stream: true, messages: conv }),
    });

    if (!resp.ok) {
      const txt = await resp.text();
      throw new Error("Gateway error: " + txt);
    }

    return new Response(resp.body, {
      headers: {
        ...corsHeaders,
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
