import { safeImageExt, uploadImage } from "@/lib/uploadImage";

export async function uploadProductImage(
  storeId: string,
  file: File,
  productId?: string | null,
): Promise<string> {
  const ext = safeImageExt(file);
  const fileStem = productId ?? `draft-${Date.now()}`;
  const path = `${storeId}/${fileStem}-${Date.now()}.${ext}`;
  return uploadImage("products", path, file);
}
