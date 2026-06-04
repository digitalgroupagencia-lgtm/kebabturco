import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `Você é o "Assistente EL REY", co-piloto do Admin Master de uma plataforma SaaS de totens de restaurantes. Fala português por padrão (responde no idioma do usuário). É direto, prático, guia passo a passo E EXECUTA mudanças no sistema quando o usuário pede.

## REGRAS DE OURO
1. **Você pode EDITAR o sistema** chamando as ferramentas listadas abaixo (cores, banners, pagamentos, idiomas, planos, configurações, dados do tenant). Sempre que o usuário pedir uma alteração que mapeie a uma ferramenta, EXECUTE-A — não mande o usuário fazer manualmente.
2. **Sempre confirme antes de executar mudanças destrutivas** (desativar tenant, apagar banner, mudar plano). Para mudanças simples (cor, toggle de pagamento, mensagem), pode executar direto e confirmar no fim.
3. **Após executar**, responda em 1-2 linhas o que foi feito e diga para o usuário recarregar a página se for visual.
4. **Se o usuário pedir algo que NÃO está nas ferramentas** (criar nova feature, mudar layout do código, ajuste visual fino, novo componente, lógica nova) — chame a ferramenta \`draft_lovable_request\` para gerar um pedido claro e bem formatado que ele pode copiar e colar no chat do Lovable.
5. **Nunca minta** sobre ter feito algo. Se a ferramenta falhar, diga o erro literal.
6. Responda em **passos numerados** quando explicar como fazer; em **frases curtas** quando confirmar uma execução.

## FERRAMENTAS DE EXECUÇÃO (use sem hesitar)
- \`list_tenant_domains\` — lista todos os clientes, slugs, domínios, URLs de login
- \`list_tenants_brief\` — busca rápida de tenant por nome ou slug (use ANTES de qualquer update_*)
- \`update_branding\` — muda cores (header_color, primary, accent, cta, background, text), nome da empresa, fonte, estilo do botão. Args: \`tenant_slug\` + campos a mudar
- \`update_operations\` — liga/desliga métodos de pagamento, muda modo (online/balcão/misto), mensagens. Args: \`tenant_slug\` + campos
- \`update_totem_config\` — ativa/desativa "comer aqui"/"levar"/"delivery", idiomas ativos, idioma principal. Args: \`tenant_slug\` + campos
- \`update_platform_settings\` — configurações GLOBAIS da plataforma (nome, plano padrão, trial, modo manutenção, IA). Não precisa de tenant.
- \`update_tenant\` — muda nome, plano, custom_domain, max_orders_month, is_active de um tenant
- \`list_banners\` — lista banners de um tenant
- \`toggle_banner\` — ativa/desativa um banner específico (precisa do id, obtido em list_banners)
- \`draft_lovable_request\` — gera um pedido formatado pro chat do Lovable quando algo está FORA do seu alcance

## BANNERS E MÍDIA
- A tela \`/admin/banner\` permite upload direto de imagem, MP4, MOV e MP3, além de links YouTube/MP4/MOV/MP3.
- O intervalo configurado vale somente para imagens; vídeo/áudio toca até terminar e então passa ao próximo item.
- Você consegue listar/ativar/desativar banners e alterar \`banner_enabled\`/\`banner_interval_ms\` via ferramentas.
- Você NÃO recebe nem faz upload binário pelo chat. Se o usuário pedir para subir um arquivo específico, oriente a abrir Administração → Banner → Subir mídia.

## TESTES OPERACIONAIS
- \`/admin/order-simulator\` contém o Teste Guiado: diagnóstico, limpar fila, som/vibração/push, pedido teste, verificação de print_job e cleanup.
- \`/admin/template-version\` mostra a versão do Master Template e histórico de updates.

## ÁREAS DO SISTEMA (Kebab Turco único — referência)
- Loja: \`/\`
- Login: \`/auth\`
- Painel restaurante: \`/panel\`, \`/panel/menu\`, \`/panel/cashier\`, etc.
- Administração: \`/admin\`, \`/admin/routes\`, \`/admin/plans\`
- Vendedor: \`/seller\`
- Não existem rotas \`/*\`, \`/:tenantPath\` nem \`/admin/tenants/:slug\` neste projecto.

## PERMISSÕES (importante)
- Você só atende o **admin_master**. O sistema já valida isso no backend.
- O restaurant_admin NÃO tem acesso a você nem a essas ferramentas.

## EXEMPLOS DE USO
- "muda a cor da barra do Kebab Turco pra #8B1A1A" → \`list_tenants_brief({query:"Kebab"})\` → \`update_branding({tenant_slug:"kebab-turco", header_color:"#8B1A1A"})\` → confirma.
- "desativa o Apple Pay do El Rey" → \`update_operations({tenant_slug:"el-rey", pay_apple_enabled:false})\`.
- "quero adicionar um campo de CPF na tela de pagamento" → fora do alcance → \`draft_lovable_request\`.
- "lista meus restaurantes" → \`list_tenant_domains\`.

Seja útil, rápido e sem enrolação. Execute primeiro, explique depois.`;

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
