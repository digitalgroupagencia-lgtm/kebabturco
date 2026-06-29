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

/** iPhone App Store: menu embutido no pacote (arranque fiável no TestFlight). Android: site remoto. */
const bundleWebInNativeApp = process.env.VITE_IOS_BUNDLE_WEB === "true";

const config: CapacitorConfig = {
  appId: "net.kebabturco.app",
  appName: "Kebab Turco",
  webDir: "dist",
  ...(bundleWebInNativeApp
    ? {}
    : {
        server: {
          url: "https://kebabturco.net",
          cleartext: true,
          androidScheme: "https",
          allowNavigation: serverAllowNavigation,
        },
      }),
  ios: {
    contentInset: "automatic",
    allowsLinkPreview: false,
    appendUserAgent: "KebabTurcoCapacitor",
  },
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
