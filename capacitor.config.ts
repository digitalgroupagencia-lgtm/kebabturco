import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "app.lovable.d04adf9611f44dc9b79cf756a89ef084",
  appName: "kebabturco",
  webDir: "dist",
  server: {
    // Aponta para o app publicado — atualizações no Lovable chegam ao tablet
    // automaticamente ao reabrir o app, sem precisar rebuildar o APK.
    url: "https://kebabturco.lovable.app",
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
};

export default config;
