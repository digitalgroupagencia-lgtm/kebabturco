import { Capacitor, registerPlugin } from "@capacitor/core";

type Orientation = "portrait" | "landscape" | "unspecified";

const AndroidScreenOrientation = registerPlugin<{
  setOrientation(options: { orientation: Orientation }): Promise<{ orientation: Orientation }>;
}>("AndroidScreenOrientation");

/**
 * Lock orientation through the native Android plugin already bundled in the app.
 * Web and non-native platforms are intentionally no-op.
 */
export async function setAndroidOrientation(orientation: Orientation) {
  if (typeof window === "undefined") return;
  if (!Capacitor.isNativePlatform()) return;

  try {
    await AndroidScreenOrientation.setOrientation({ orientation });
  } catch (error) {
    console.warn("[AndroidOrientation] falha ao ajustar orientação", error);
  }
}
