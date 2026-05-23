import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from "vite-plugin-pwa";

const APP_BUILD_ID = process.env.VITE_APP_BUILD_ID || String(Date.now());

const injectAppBuildId = () => ({
  name: "inject-app-build-id",
  config() {
    return {
      define: {
        __APP_BUILD_ID__: JSON.stringify(APP_BUILD_ID),
      },
    };
  },
  transformIndexHtml(html: string) {
    const meta = `<meta name="app-build-id" content="${APP_BUILD_ID}" />`;
    if (html.includes('name="app-build-id"')) {
      return html.replace(/<meta name="app-build-id" content="[^"]*" \/>/, meta);
    }
    return html.replace("</head>", `  ${meta}\n  </head>`);
  },
});

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8082,
    hmr: {
      overlay: false,
    },
  },
  plugins: [
    react(),
    injectAppBuildId(),
    VitePWA({
      registerType: "autoUpdate",
      injectRegister: false,
      includeAssets: [
        "favicon.ico",
        "apple-touch-icon.png",
        "icon-192.png",
        "icon-512.png",
        "robots.txt",
        ".well-known/assetlinks.json",
      ],
      manifest: false,
      workbox: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg,json,woff2,webmanifest}"],
        navigateFallback: "/index.html",
        navigateFallbackDenylist: [/^\/api\//, /^\/panel/, /^\/admin/, /^\/seller/],
        importScripts: ["/push-handler.js"],
      },
      devOptions: {
        enabled: false,
      },
    }),
    mode === "development" && componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: ["react", "react-dom", "react/jsx-runtime", "react/jsx-dev-runtime", "@tanstack/react-query", "@tanstack/query-core"],
  },
}));
