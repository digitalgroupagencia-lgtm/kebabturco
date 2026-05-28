import { supabase } from "@/integrations/supabase/client";

export type StorageBucket = "products" | "branding";

const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

export function safeImageExt(file: File): string {
  const extFromName = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const ext = extFromName === "jpeg" ? "jpg" : extFromName;
  return ["jpg", "png", "webp"].includes(ext) ? ext : "jpg";
}

export async function uploadImage(
  bucket: StorageBucket,
  path: string,
  file: File,
): Promise<string> {
  if (!ALLOWED_TYPES.has(file.type)) {
    throw new Error("Use PNG, JPG ou WEBP");
  }
  if (file.size > MAX_BYTES) {
    throw new Error("Imagem demasiado grande (máx. 5 MB)");
  }

  const { error } = await supabase.storage.from(bucket).upload(path, file, {
    upsert: true,
    contentType: file.type,
  });
  if (error) throw error;

  const { data: pub } = supabase.storage.from(bucket).getPublicUrl(path);
  return pub.publicUrl;
}

export async function uploadCategoryImage(
  storeId: string,
  file: File,
  categoryId?: string | null,
): Promise<string> {
  const ext = safeImageExt(file);
  const stem = categoryId ?? `draft-${Date.now()}`;
  const path = `${storeId}/categories/${stem}-${Date.now()}.${ext}`;
  return uploadImage("products", path, file);
}

export async function uploadBrandingImage(
  storeId: string,
  label: string,
  file: File,
): Promise<string> {
  const ext = safeImageExt(file);
  const safeLabel = label.replace(/[^a-z0-9_-]/gi, "-").toLowerCase();
  const path = `${storeId}/${safeLabel}-${Date.now()}.${ext}`;
  return uploadImage("branding", path, file);
}
