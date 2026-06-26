import type { CapacitorConfig } from "@capacitor/cli";

const serverAllowNavigation = [
  "192.168.*",
  "10.*",
  "172.16.*",
  "*.lovable.app",
  "*.lovableproject.com",
  "kebabturco.net",
  "*.kebabturco.net",
  "snaporder.digitalgroupsti.com",
];

/** iOS App Store: site embutido no IPA (arranque fiável). Android/tablet: URL remota. */
const bundleWebInNativeApp = process.env.VITE_IOS_BUNDLE_WEB === "true";

const config: CapacitorConfig = {
  appId: "net.kebabturco.app",
  appName: "Kebab Turco",
  webDir: "dist",
  ...(bundleWebInNativeApp
    ? {}
    : {
        server: {
          // Tablet Android / dev: atualizações Lovable ao reabrir, sem rebuild do APK.
          url: "https://kebabturco.net",
          cleartext: true,
          androidScheme: "https",
          allowNavigation: serverAllowNavigation,
        },
      }),
  android: {
    allowMixedContent: true,
  },
  plugins: {
    PushNotifications: {
      presentationOptions: ["badge", "sound", "banner", "list"],
    },
  },
};

export default config;
