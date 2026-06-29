import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import type { CouponSuggestionTemplate } from "@/lib/marketing/couponSuggestions";
import { validateCoupon } from "@/services/orderService";

export type CouponRow = {
  id: string;
  code: string;
  is_active: boolean;
  discount_type: string;
  expires_at: string | null;
};

export async function fetchCouponByCode(storeId: string, code: string): Promise<CouponRow | null> {
  const { data } = await supabase
    .from("coupons")
    .select("id, code, is_active, discount_type, expires_at")
    .eq("store_id", storeId)
    .ilike("code", code.trim())
    .maybeSingle();
  return (data as CouponRow) ?? null;
}

export async function createCouponFromSuggestion(
  storeId: string,
  template: CouponSuggestionTemplate,
  featuredProductId?: string | null,
): Promise<{ ok: boolean; couponId?: string; error?: string }> {
  const existing = await fetchCouponByCode(storeId, template.code);
  if (existing?.is_active) {
    return { ok: true, couponId: existing.id };
  }

  const expiresAt = template.expiresInDays
    ? new Date(Date.now() + template.expiresInDays * 86400000).toISOString()
    : null;

  const productId =
    template.linkedProductId ?? (template.discountType === "combo_nth" ? featuredProductId : null);

  const row = {
    store_id: storeId,
    code: template.code.toUpperCase(),
    description: template.description.pt,
    discount_type: template.discountType,
    discount_value: template.discountValue,
    min_order: template.minOrder,
    is_active: true,
    expires_at: expiresAt,
    linked_product_id: productId ?? null,
    promo_config: (template.promoConfig ?? {}) as Json,
  };

  if (existing) {
    const { error } = await supabase.from("coupons").update(row as never).eq("id", existing.id);
    if (error) return { ok: false, error: error.message };
    return { ok: true, couponId: existing.id };
  }

  const { data, error } = await supabase.from("coupons").insert(row as never).select("id").single();
  if (error) return { ok: false, error: error.message };
  return { ok: true, couponId: data.id as string };
}

/** Verifica se o cupão funciona no checkout (subtotal de teste). */
export async function verifyCouponInSystem(
  storeId: string,
  code: string,
  testSubtotal = 25,
  testDeliveryFee = 3.5,
): Promise<{ ok: boolean; error?: string }> {
  try {
    const result = await validateCoupon(storeId, code, testSubtotal, testDeliveryFee, []);
    if (!result.valid) return { ok: false, error: result.error ?? "Inválido" };
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

export async function ensureCampaignCoupon(
  storeId: string,
  campaignId: string,
  template: CouponSuggestionTemplate,
  featuredProductId?: string | null,
): Promise<{ ok: boolean; couponId?: string; created?: boolean; error?: string }> {
  const had = await fetchCouponByCode(storeId, template.code);
  const created = await createCouponFromSuggestion(storeId, template, featuredProductId);
  if (!created.ok || !created.couponId) {
    return { ok: false, error: created.error };
  }

  const verify = await verifyCouponInSystem(
    storeId,
    template.code,
    template.minOrder > 0 ? template.minOrder : 25,
    template.discountType === "free_delivery" ? 3.5 : 0,
  );
  if (!verify.ok) {
    return { ok: false, error: verify.error ?? "Cupão criado mas falhou validação" };
  }

  const { error: linkErr } = await supabase
    .from("marketing_campaigns")
    .update({
      linked_coupon_id: created.couponId,
      audience_config: { suggest_coupon: template.code },
    })
    .eq("id", campaignId);

  if (linkErr) return { ok: false, error: linkErr.message };

  return { ok: true, couponId: created.couponId, created: !had?.is_active };
}

export async function fetchFeaturedProductId(storeId: string): Promise<string | null> {
  const { data } = await supabase
    .from("products")
    .select("id")
    .eq("store_id", storeId)
    .eq("is_active", true)
    .eq("marketing_featured", true)
    .limit(1)
    .maybeSingle();
  if (data?.id) return data.id as string;
  const { data: top } = await supabase
    .from("products")
    .select("id")
    .eq("store_id", storeId)
    .eq("is_active", true)
    .order("sort_order")
    .limit(1)
    .maybeSingle();
  return (top?.id as string) ?? null;
}
