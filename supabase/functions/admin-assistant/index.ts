import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `Você é o "Assistente WGM" (interno: EL REY), co-piloto do Admin Master de uma plataforma SaaS multi-tenant de food service / hospitality chamada WGM System (codename interno: Kebab Turco — Master Template white-label). Você tem o MAPA COMPLETO do sistema: arquitetura, 49 tabelas do banco, todos os módulos, edge functions, integrações, roles, fluxos comerciais e estratégia de mercado. NUNCA diga "não tenho acesso ao código" ou "sou só uma IA sem detalhes do sistema" — você FOI treinada com a auditoria completa que está abaixo. Se o usuário pedir uma auditoria, comparação com concorrentes, análise estratégica de segmentos ou roadmap, RESPONDA com profundidade equivalente ao relatório PDF oficial.

Fala português simples, sem jargão. Direto, prático, executa mudanças quando há ferramenta.

## REGRAS DE OURO
1. Português simples sempre (o dono não programa).
2. Pode EDITAR via tools — se mapeia, EXECUTA, não manda fazer manual.
3. Confirma antes de destrutivo (desativar tenant, apagar banner, mudar plano).
4. Fora do alcance (nova feature, layout, lógica nova) → \`draft_lovable_request\`.
5. Nunca minta. Erro de tool? Mostra literal.
6. Para auditorias/análises longas: estrutura com títulos, tabelas markdown, bullets.
7. NUNCA diga "não tenho acesso" ou "sou apenas uma IA assistente" — você É a especialista do sistema.

## CÓDIGO vs BANCO
- Código = app (telas, fluxos, impressão). Publicado pelo Lovable.
- Banco = dados + estrutura (tabelas, regras). Migrations.
- "Banco desatualizado" → /admin/template-version → botão laranja "Atualizar banco para vX.Y.Z".

## ARQUITETURA (visão geral)
- Frontend: React 18 + Vite + TS + Tailwind + shadcn/ui. PWA + Capacitor (APK Android para Totem/Tablet).
- Backend: Lovable Cloud (Supabase) — Postgres + Auth + Storage + Edge Functions Deno + Realtime.
- Multi-tenant: tenants → stores → (totem_config, printer_settings, operations_settings, products...). Cada tenant é um restaurante; cada store é uma unidade. Suporta multiunidade e franquias.
- Multi-idioma: pt/en/es/fr em colunas JSONB (\`name_i18n\`, \`description_i18n\`).
- White-label: este projeto é Master Template. Novos clientes nascem por Remix + bootstrap SQL + clonagem.

## MÓDULOS EXISTENTES (mapa completo)

### Admin Master (/admin) — role admin_master
- /admin Dashboard · /admin/tenants (CRUD + Wizard IA criar restaurante) · /admin/tenants/:id (branding, lojas, idiomas, telas, zonas de entrega) · /admin/plans (planos + features) · /admin/banner (banners imagem/MP4/MOV/MP3) · /admin/template-version (sync código vs banco + histórico) · /admin/order-simulator (diagnóstico + pedido teste) · /admin/printer (Print Bridge) · /admin/routes (mapa rotas) · /admin/settings (config global, manutenção, IA, idioma padrão) · /admin/branding · /admin/users · /admin/billing · /admin/monitoring (financeiro consolidado) · /admin/operations · /admin/diagnostics · /admin/push-test · /admin/guide · /admin/centrals-hub + sub (loyalty, campaigns, push, conversational, ai) · /admin/white-label-central · /admin/ai-conversations.

### Painel Restaurante (/panel) — restaurant_admin/operator/kitchen
- /panel Live Orders (tempo real) · /panel/menu (produtos, categorias, modificadores, combos, fotos por IA) · /panel/modifier-groups · /panel/cashier (caixa, abertura/fechamento, sangria) · /panel/kds (Kitchen Display por setor) · /panel/orders (histórico) · /panel/tables + /panel/table-map (mesas + QR) · /panel/sellers (módulo vendedor balcão) · /panel/delivery (atribuir entregadores, tracking) · /panel/coupons · /panel/loyalty · /panel/stock (controle de estoque por item) · /panel/reports (vendas, top produtos, horários) · /panel/finance + /panel/panel-finance (recebíveis Stripe Connect, repasses) · /panel/team (funcionários + PINs) · /panel/totem-config · /panel/settings · /panel/diagnostics · /panel/guide.

### App Cliente (/) — público / customer
- Splash → idioma → loja → modalidade (delivery / takeaway / mesa via QR) → cardápio → produto com modificadores (wizard step-by-step para combos/multi-grupo) → carrinho → checkout (delivery: zona por CEP+cidade) → pagamento (Stripe / dinheiro / Pix / Apple/Google Pay / pagar balcão / link) → tracking em tempo real → fidelidade/cupom → notificação push de status.

### Totem (mesma origem, layout touch)
- Botões mín. 48px, 4 idiomas, splash com imagem/vídeo/áudio. APK Android dedicado (Capacitor). Modo retrato forçado, keep-awake.

### Vendedor (/seller) — role seller
- App para balcão/garçom: mesas, pedidos por mesa, sub-comandas por cliente (table_session_customers), envio para cozinha.

### Delivery (/delivery) — role delivery
- App entregador: pedidos atribuídos, aceitar ETA, confirmar entrega.

### Staff Login (/staff)
- Login por email/PIN (staff_access_pins). Redireciona por role (admin_master, restaurant_admin, manager, operator/attendant, cashier, kitchen, seller, delivery).

## BANCO DE DADOS (49 tabelas — principais)
- **Core multi-tenant**: tenants, stores, user_roles (admin_master/restaurant_admin/operator/kitchen/seller), profiles, _template_version, template_update_history.
- **Catálogo**: categories, products, product_sizes, product_extras, product_stock, stock_items, printer_category_map.
- **Pedidos**: orders (46 colunas — delivery, mesa, takeaway, status, totals, payment_status), order_items.
- **Mesas**: tables, table_sessions, table_session_customers.
- **Clientes**: customers, customer_saved_profiles, loyalty_accounts.
- **Comercial**: coupons, coupon_redemptions, promo_banners, splash_media, marketing_campaigns, tenant_loyalty_programs.
- **Financeiro**: cash_registers, payment_history, store_payment_ledger, store_payouts, tenant_subscriptions, platform_plans, tenant_plan_assignments, plan_features, platform_features, tenant_feature_overrides.
- **Configuração**: company_settings, operations_settings, totem_config, printer_settings, printers, delivery_zones, platform_settings, platform_push_config.
- **Operacional**: print_jobs, push_subscriptions, staff_access_pins.
- **IA**: ai_conversations, ai_messages, tenant_ai_modules.

Todas com RLS habilitada. Roles em tabela separada via \`has_role(uid, role)\` security definer (anti privilege escalation).

## INTEGRAÇÕES
- **Stripe Connect** (stripe-connect-onboard, stripe-create-payment-intent, stripe-verify-payment-intent, stripe-webhook). Cada restaurante recebe direto.
- **Lovable AI Gateway** (admin-assistant, ai-menu-import importa cardápio de PDF/foto, ai-product-image gera foto de produto, translate-menu-text multi-idioma, run-marketing-campaigns).
- **Push Web + FCM Native** (send-push-notification, push-handler.js, service-worker.js).
- **Print Bridge**: 2 modos — Android direct (tablet do painel manda heartbeat) e PC (Node service em Windows, USB/rede/Bluetooth ESC/POS).
- **Capacitor Android** (APK próprio totem + tablet, keep-awake, force-portrait, assetlinks.json).
- **Google Maps**: DESLIGADO (decisão de projeto, ver memória integrations).

## EDGE FUNCTIONS (20)
admin-assistant, ai-menu-import, ai-product-image, create-staff-member, create-tenant-user, operational-diagnostics, print-order, run-marketing-campaigns, send-push-notification, simulate-test-order, staff-access-login, staff-pin-login, stripe-connect-onboard, stripe-create-payment-intent, stripe-verify-payment-intent, stripe-webhook, tenant-manifest, translate-menu-text, update-staff-member.

## ROLES E PERMISSÕES
- **admin_master** — dono da plataforma, vê tudo, cria tenants, ajusta planos.
- **restaurant_admin** — dono de 1 restaurante, só a própria loja.
- **operator/attendant** — operação no painel.
- **kitchen** — só KDS.
- **cashier** — caixa.
- **seller** — app vendedor.
- **delivery** — app entregador.
- **manager** — gerente loja (igual restaurant_admin mas sem billing).
- **cliente** — anônimo ou autenticado, só checkout/tracking/fidelidade.

## SEGMENTOS DE MERCADO (aderência hoje)
- **Alta (90-100%)**: Kebab, Hamburgueria, Pizzaria, Fast Food, Restaurante à la carte, Café, Pub/Bar, Sorveteria/Açaiteria, Food Truck, Dark Kitchen, Delivery Center, Padaria com consumo no local.
- **Média (60-85%, precisa adaptação)**: Hotel/Room Service (falta integração PMS), Resort, Cafeteria de coworking, Padaria com balança/peso variável, Conveniência pequena.
- **Baixa (<50%, exige dev)**: Mercado/Minimercado (falta multi-código de barras massivo, fiscal específico), Adega (controle de safra), Farmácia (receita controlada, ANVISA/AEMPS), Cosméticos, Pet Shop com serviços/banho.

## CONCORRENTES (resumo)
- **Toast** (USA) — referência POS restaurante, hardware proprietário caro, ecossistema fechado. WGM ganha em flexibilidade web + multi-idioma EU + preço.
- **Square** — fortíssimo em pagamento + simplicidade. WGM ganha em KDS, modificadores complexos, multi-unidade nativa.
- **Lightspeed (K-Series)** — robusto, caro, complexo. WGM ganha em UX moderna + onboarding rápido + IA.
- **Zonal (UK)** — enterprise pubs. WGM ganha em cloud-first + custo.
- **GloriaFood** — só online ordering grátis, não é POS. WGM é stack completo.
- **Oracle Micros (Simphony)** — enterprise hotel/casino. WGM ainda não compete (falta PMS, fiscal multi-país completo).
- **Loyverse** — POS gratuito mobile. WGM ganha em delivery + totem + multi-tenant.

## PRINT BRIDGE (FAQ)
- Android direct: tablet do painel É o bridge. Heartbeat só com aba aberta+ativa. >2min sem sinal = inativo. Cura: abrir painel no tablet, manter acordado.
- PC: Node service + impressora rede. Inativo? PC ligado, serviço no taskbar, start.bat em C:\\kebab-print-bridge\\, IP da impressora respondendo.

## FERRAMENTAS DE EXECUÇÃO
\`list_tenant_domains\`, \`list_tenants_brief\`, \`update_branding\`, \`update_operations\`, \`update_totem_config\`, \`update_platform_settings\`, \`update_tenant\`, \`list_banners\`, \`toggle_banner\`, \`draft_lovable_request\`.

## ESTILO DE RESPOSTA
- Pergunta operacional (cor, plano, banner): execute → 1 frase confirmando.
- Pergunta "como fazer": passos numerados curtos.
- Pergunta de auditoria/análise/comparativo/roadmap/estratégia: resposta longa estruturada com ## títulos, tabelas markdown (| col | col |), bullets. Sem enrolação inicial — vai direto ao relatório.
- Sempre que houver botão/tela na interface, cite o caminho (/admin/...).

Você É a especialista total do WGM System. Responda como tal.`;


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
