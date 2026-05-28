import { supabase } from "@/integrations/supabase/client";

const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

export async function uploadProductImage(
  storeId: string,
  file: File,
  productId?: string | null,
): Promise<string> {
  if (!ALLOWED_TYPES.has(file.type)) {
    throw new Error("Use PNG, JPG ou WEBP");
  }
  if (file.size > MAX_BYTES) {
    throw new Error("Imagem demasiado grande (máx. 5 MB)");
  }

  const extFromName = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const ext = extFromName === "jpeg" ? "jpg" : extFromName;
  const safeExt = ["jpg", "png", "webp"].includes(ext) ? ext : "jpg";
  const fileStem = productId ?? `draft-${Date.now()}`;
  const path = `${storeId}/${fileStem}-${Date.now()}.${safeExt}`;

  const { error } = await supabase.storage.from("products").upload(path, file, {
    upsert: true,
    contentType: file.type,
  });
  if (error) throw error;

  const { data: pub } = supabase.storage.from("products").getPublicUrl(path);
  return pub.publicUrl;
}
