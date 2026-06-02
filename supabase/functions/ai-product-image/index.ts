import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const STYLE_PROMPTS: Record<string, string> = {
  realistic: "professional food photography, photorealistic, top-down or 45-degree angle, studio lighting, neutral background, vibrant colors, appetizing, like Uber Eats / iFood listings",
  "3d": "stylized 3D render, Pixar style, soft lighting, cute, modern fast-food vibe, clean background",
  flatlay: "flatlay photography, top-down view, neutral wood or marble background, natural light",
  minimal: "minimalist product shot, plain neutral background, soft shadow, clean composition",
};

function pickName(name: unknown): string {
  if (typeof name === "string") return name;
  if (name && typeof name === "object") {
    const n = name as Record<string, string>;
    return n.pt || n.en || n.es || n.fr || Object.values(n)[0] || "produto";
  }
  return "produto";
}
function pickDesc(desc: unknown): string {
  if (!desc) return "";
  if (typeof desc === "string") return desc;
  if (typeof desc === "object") {
    const n = desc as Record<string, string>;
    return n.pt || n.en || n.es || Object.values(n)[0] || "";
  }
  return "";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // --- AUTH ---
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
    const { data: userData, error: claimsErr } = await userClient.auth.getUser(
      authHeader.replace("Bearer ", ""),
    );
    if (claimsErr || !userData?.user?.id) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = userData.user.id as string;

    const { product_id, style = "realistic" } = await req.json();
    if (!product_id) {
      return new Response(JSON.stringify({ error: "product_id é obrigatório" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY missing");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: product, error: pErr } = await supabase
      .from("products")
      .select("id, name, description, store_id")
      .eq("id", product_id)
      .single();
    if (pErr || !product) throw new Error("Produto não encontrado");

    // Verifica permissão sobre a store do produto
    const [{ data: roles }, { data: store }] = await Promise.all([
      supabase.from("user_roles").select("role, tenant_id").eq("user_id", userId),
      supabase.from("stores").select("tenant_id").eq("id", product.store_id).maybeSingle(),
    ]);
    const isAdminMaster = (roles ?? []).some((r) => r.role === "admin_master");
    const userTenantIds = (roles ?? []).map((r) => r.tenant_id).filter(Boolean);
    if (!isAdminMaster && !(store && userTenantIds.includes(store.tenant_id))) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }


    const name = pickName(product.name);
    const description = pickDesc(product.description);
    const stylePrompt = STYLE_PROMPTS[style] ?? STYLE_PROMPTS.realistic;

    const prompt = `${name}. ${description}. ${stylePrompt}. The dish must clearly show the ingredients mentioned. High detail, sharp focus, no text, no watermark.`;

    let imgB64: string | undefined;
    let lastErrText = "";
    for (let attempt = 0; attempt < 3; attempt++) {
      const variantPrompt =
        attempt === 0
          ? prompt
          : `${prompt} IMPORTANT: respond ONLY with the generated image, no text.`;
      const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash-image",
          messages: [{ role: "user", content: variantPrompt }],
          modalities: ["image", "text"],
        }),
      });

      if (aiResp.status === 429) return new Response(JSON.stringify({ error: "Limite de uso atingido. Tente novamente em alguns segundos." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (aiResp.status === 402) return new Response(JSON.stringify({ error: "Créditos esgotados em Lovable AI." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (!aiResp.ok) {
        lastErrText = await aiResp.text();
        console.error("AI gateway error", aiResp.status, lastErrText);
        continue;
      }

      const aiJson = await aiResp.json();
      imgB64 = aiJson.choices?.[0]?.message?.images?.[0]?.image_url?.url;
      if (imgB64) break;
      console.warn(`Tentativa ${attempt + 1}: sem imagem na resposta, retrying...`);
    }

    if (!imgB64) {
      return new Response(
        JSON.stringify({ error: "A IA não conseguiu gerar a imagem agora. Tente novamente em alguns segundos." }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }


    const base64 = imgB64.split(",")[1] ?? imgB64;
    const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
    const path = `${product.store_id}/${product.id}-${Date.now()}.png`;

    const { error: upErr } = await supabase.storage.from("products").upload(path, bytes, {
      contentType: "image/png",
      upsert: true,
    });
    if (upErr) throw upErr;

    const { data: pub } = supabase.storage.from("products").getPublicUrl(path);
    const publicUrl = pub.publicUrl;

    await supabase.from("products").update({ image_url: publicUrl }).eq("id", product_id);

    return new Response(JSON.stringify({ image_url: publicUrl }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});