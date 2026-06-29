import { supabase } from "@/integrations/supabase/client";
import { validateCoupon } from "@/services/orderService";
import { couponDiagnosticLogger } from "@/lib/diagnostics/diagnosticLoggers";

export type CouponRedemptionRow = {
  id: string;
  coupon_id: string;
  customer_phone: string | null;
  discount_amount: number;
  created_at: string;
};

function log(stage: string, level: "info" | "warn" | "error", message: string, details?: Record<string, unknown>) {
  couponDiagnosticLogger.log({ stage, level, message, context: "coupon", details });
}

export async function testCouponValidation(storeId: string, code: string, subtotal: number) {
  log("validate", "info", "A validar cupão", { code, subtotal });
  try {
    const result = await validateCoupon(storeId, code.trim(), subtotal);
    if (result.valid) {
      log("validate", "info", `Cupão válido, desconto ${result.discount_amount}€`, {
        coupon_id: result.coupon_id,
        code: result.code,
      });
    } else {
      log("validate", "warn", result.error ?? "Cupão inválido", { error: result.error });
    }
    return result;
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    log("validate", "error", message);
    throw e;
  }
}

export async function fetchRecentCouponRedemptions(storeId: string, limit = 10): Promise<CouponRedemptionRow[]> {
  const { data: coupons } = await supabase.from("coupons").select("id").eq("store_id", storeId);
  const couponIds = (coupons ?? []).map((c) => c.id);
  if (!couponIds.length) return [];

  const { data, error } = await supabase
    .from("coupon_redemptions")
    .select("id, coupon_id, customer_phone, discount_amount, created_at")
    .in("coupon_id", couponIds)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    log("history", "error", error.message);
    return [];
  }
  return (data ?? []) as CouponRedemptionRow[];
}

export async function probeCouponDiagnostics(storeId: string) {
  const [{ count: activeCount }, { count: totalCount }] = await Promise.all([
    supabase
      .from("coupons")
      .select("id", { count: "exact", head: true })
      .eq("store_id", storeId)
      .eq("is_active", true),
    supabase.from("coupons").select("id", { count: "exact", head: true }).eq("store_id", storeId),
  ]);

  const redemptions = await fetchRecentCouponRedemptions(storeId, 5);
  log("probe", "info", `${activeCount ?? 0} cupões activos`, { total: totalCount ?? 0 });

  return {
    activeCoupons: activeCount ?? 0,
    totalCoupons: totalCount ?? 0,
    recentRedemptions: redemptions,
  };
}
