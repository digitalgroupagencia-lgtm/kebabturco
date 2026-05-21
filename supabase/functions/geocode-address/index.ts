// Edge function: geocodifica um endereço via Google Maps e calcula a distância
// até a loja escolhida. Retorna { lat, lng, distance_km, formatted_address }.
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";

const GATEWAY = "https://connector-gateway.lovable.dev/google_maps";

function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6371;
  const toRad = (x: number) => (x * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const sa =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(sa));
}

async function geocode(address: string): Promise<{ lat: number; lng: number; formatted: string } | null> {
  const LOVABLE = Deno.env.get("LOVABLE_API_KEY");
  const MAPS = Deno.env.get("GOOGLE_MAPS_API_KEY");
  if (!LOVABLE || !MAPS) throw new Error("Google Maps connector not configured");
  const url = `${GATEWAY}/maps/api/geocode/json?address=${encodeURIComponent(address)}`;
  const r = await fetch(url, {
    headers: {
      Authorization: `Bearer ${LOVABLE}`,
      "X-Connection-Api-Key": MAPS,
    },
  });
  const j = await r.json();
  if (!r.ok || j.status !== "OK" || !j.results?.[0]) return null;
  const res = j.results[0];
  return {
    lat: res.geometry.location.lat,
    lng: res.geometry.location.lng,
    formatted: res.formatted_address,
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const body = await req.json();
    const { storeId, address, mode } = body as {
      storeId: string;
      address: string;
      mode?: "store" | "customer";
    };
    if (!storeId || !address || typeof address !== "string" || address.length < 3) {
      return new Response(JSON.stringify({ error: "Invalid input" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const geo = await geocode(address);
    if (!geo) {
      return new Response(JSON.stringify({ error: "Endereço não encontrado" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Se for geocoding da loja → grava lat/lng
    if (mode === "store") {
      await supabase
        .from("stores")
        .update({ latitude: geo.lat, longitude: geo.lng, geocoded_address: geo.formatted })
        .eq("id", storeId);
      return new Response(
        JSON.stringify({ lat: geo.lat, lng: geo.lng, formatted_address: geo.formatted }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Cliente: calcula distância até a loja
    const { data: store } = await supabase
      .from("stores")
      .select("latitude, longitude")
      .eq("id", storeId)
      .maybeSingle();

    let distance_km: number | null = null;
    if (store?.latitude != null && store?.longitude != null) {
      distance_km = haversineKm(
        { lat: Number(store.latitude), lng: Number(store.longitude) },
        { lat: geo.lat, lng: geo.lng },
      );
    }

    return new Response(
      JSON.stringify({
        lat: geo.lat,
        lng: geo.lng,
        formatted_address: geo.formatted,
        distance_km,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unknown";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
