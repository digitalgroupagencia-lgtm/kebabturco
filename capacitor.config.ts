import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.eurobusinessgroup.kebabturco",
  appName: "Kebab Turco",
  webDir: "dist",
  server: {
    // Aponta para o app publicado — atualizações no Lovable chegam ao tablet
    // automaticamente ao reabrir o app, sem precisar rebuildar o APK.
    url: "https://kebabturco.net",
    cleartext: true,
    androidScheme: "https",
    // Permite acesso à LAN (impressora ESC/POS) e domínios do app
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
