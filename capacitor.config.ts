import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "app.lovable.d04adf9611f44dc9b79cf756a89ef084",
  appName: "kebabturco",
  webDir: "dist",
  server: {
    url: "https://d04adf96-11f4-4dc9-b79c-f756a89ef084.lovableproject.com?forceHideBadge=true",
    cleartext: true,
    androidScheme: "https",
    // Allow LAN access to the printer (cleartext HTTP/TCP to local IPs)
    allowNavigation: ["192.168.*", "10.*", "172.16.*", "*.lovableproject.com", "*.lovable.app"],
  },
  android: {
    allowMixedContent: true,
  },
};

export default config;
