import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM = `Você é um extrator de cardápios. Receberá texto livre de um cardápio (português, espanhol ou inglês) e DEVE retornar APENAS JSON válido (sem markdown, sem comentários) no formato:
{
  "categories": [
    {
      "name": "string (nome da categoria)",
      "products": [
        {
          "name": "string",
          "description": "string curta com ingredientes principais",
          "price": number (em moeda local, ex 12.5)
        }
      ]
    }
  ]
}

Regras:
- Sempre extraia o preço como número (não string). Se não houver preço, use 0.
- Agrupe corretamente em categorias. Se não houver categoria explícita, crie "Geral".
- Mantenha nomes curtos e claros.
- Descrição com no máximo 120 caracteres.
- Não invente itens que não estão no texto.
- Responda APENAS o objeto JSON.`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // --- AUTH: exige usuário autenticado com acesso à store ---
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: claimsData, error: claimsErr } = await userClient.auth.getClaims(
      authHeader.replace("Bearer ", ""),
    );
    if (claimsErr || !claimsData?.claims?.sub) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = claimsData.claims.sub as string;

    const { menu_text, store_id, image_style = "realistic", generate_images = true } = await req.json();
    if (!menu_text || !store_id) {
      return new Response(JSON.stringify({ error: "menu_text e store_id são obrigatórios" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Verifica permissão: admin_master OU pertence ao tenant da store
    const [{ data: roles }, { data: store }] = await Promise.all([
      supabase.from("user_roles").select("role, tenant_id").eq("user_id", userId),
      supabase.from("stores").select("tenant_id").eq("id", store_id).maybeSingle(),
    ]);
    const isAdminMaster = (roles ?? []).some((r) => r.role === "admin_master");
    const userTenantIds = (roles ?? []).map((r) => r.tenant_id).filter(Boolean);
    const allowed = isAdminMaster || (store && userTenantIds.includes(store.tenant_id));
    if (!allowed) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY missing");

    const { data: langConfig } = await supabase
      .from("totem_config")
      .select("primary_language")
      .eq("store_id", store_id)
      .maybeSingle();
    const primaryLang = (langConfig?.primary_language as string) || "es";

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: SYSTEM },
          { role: "user", content: menu_text },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (aiResp.status === 429) return new Response(JSON.stringify({ error: "Limite de uso atingido. Tente novamente em alguns minutos." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    if (aiResp.status === 402) return new Response(JSON.stringify({ error: "Créditos esgotados. Adicione fundos em Lovable AI." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    if (!aiResp.ok) throw new Error("AI error: " + (await aiResp.text()));

    const aiJson = await aiResp.json();
    const raw = aiJson.choices?.[0]?.message?.content ?? "{}";
    let parsed: { categories: Array<{ name: string; products: Array<{ name: string; description?: string; price: number }> }> };
    try { parsed = JSON.parse(raw); } catch { throw new Error("IA retornou JSON inválido"); }

    const result = { categories_created: 0, products_created: 0, image_jobs: [] as string[] };

    for (const [catIdx, cat] of (parsed.categories ?? []).entries()) {
      const { data: insertedCat, error: catErr } = await supabase
        .from("categories")
        .insert({
          store_id,
          name: { [primaryLang]: cat.name },
          sort_order: catIdx,
        })
        .select("id")
        .single();
      if (catErr) { console.error("cat err", catErr); continue; }
      result.categories_created++;

      for (const [pIdx, p] of (cat.products ?? []).entries()) {
        const { data: insertedProd, error: pErr } = await supabase
          .from("products")
          .insert({
            store_id,
            category_id: insertedCat.id,
            name: { [primaryLang]: p.name },
            description: p.description ? { [primaryLang]: p.description } : {},
            price: Number(p.price) || 0,
            sort_order: pIdx,
          })
          .select("id")
          .single();
        if (pErr) { console.error("prod err", pErr); continue; }
        result.products_created++;
        if (generate_images) result.image_jobs.push(insertedProd.id);
      }
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
