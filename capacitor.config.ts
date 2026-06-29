import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "net.kebabturco.app",
  appName: "Kebab Turco",
  webDir: "dist",
  server: {
    url: "https://kebabturco.net",
    cleartext: true,
    androidScheme: "https",
    allowNavigation: [
      "192.168.*",
      "10.*",
      "172.16.*",
      "*.lovable.app",
      "*.lovableproject.com",
      "kebabturco.net",
      "*.kebabturco.net",
      "snaporder.digitalgroupsti.com",
    ],
  },
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
