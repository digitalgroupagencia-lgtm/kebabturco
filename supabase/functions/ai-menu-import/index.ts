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
    const { menu_text, store_id, image_style = "realistic", generate_images = true } = await req.json();
    if (!menu_text || !store_id) {
      return new Response(JSON.stringify({ error: "menu_text e store_id são obrigatórios" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY missing");

    // 1. Extrair estrutura via Gemini
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

    // 2. Inserir no banco usando service role
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const result = { categories_created: 0, products_created: 0, image_jobs: [] as string[] };

    for (const [catIdx, cat] of (parsed.categories ?? []).entries()) {
      const { data: insertedCat, error: catErr } = await supabase
        .from("categories")
        .insert({
          store_id,
          name: { pt: cat.name, en: cat.name, es: cat.name },
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
            name: { pt: p.name, en: p.name, es: p.name },
            description: p.description ? { pt: p.description, en: p.description, es: p.description } : {},
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