import "https://deno.land/x/xhr@0.1.0/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const LANG_NAMES: Record<string, string> = {
  pt: "Portuguese (Portugal/Brazil)",
  en: "English",
  es: "Spanish",
  fr: "French",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { texts, from, to } = await req.json();
    if (!Array.isArray(texts) || !from || !to || from === to) {
      return new Response(JSON.stringify({ error: "texts, from e to são obrigatórios" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const batch = [...new Set((texts as string[]).map((t) => String(t).trim()).filter(Boolean))].slice(
      0,
      40,
    );
    if (!batch.length) {
      return new Response(JSON.stringify({ translations: {} }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY missing");

    const fromName = LANG_NAMES[from] ?? from;
    const toName = LANG_NAMES[to] ?? to;

    const system = `You translate restaurant menu text from ${fromName} to ${toName}.
Return ONLY valid JSON: { "translations": { "<original>": "<translated>", ... } }
Rules:
- Translate food names and descriptions naturally for customers.
- Keep numbers, sizes (33cl, 2L), combo counts and brand names unchanged when appropriate.
- Do not add explanations. One translation per input string exactly as key.`;

    const user = JSON.stringify({ texts: batch });

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (aiResp.status === 429) {
      return new Response(JSON.stringify({ error: "Rate limit" }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!aiResp.ok) throw new Error("AI error: " + (await aiResp.text()));

    const aiJson = await aiResp.json();
    const raw = aiJson.choices?.[0]?.message?.content ?? "{}";
    let parsed: { translations?: Record<string, string> };
    try {
      parsed = JSON.parse(raw);
    } catch {
      throw new Error("IA retornou JSON inválido");
    }

    const translations: Record<string, string> = {};
    for (const text of batch) {
      translations[text] = parsed.translations?.[text]?.trim() || text;
    }

    return new Response(JSON.stringify({ translations }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
