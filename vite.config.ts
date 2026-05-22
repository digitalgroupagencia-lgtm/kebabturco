import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

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
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [react(), injectAppBuildId(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: ["react", "react-dom", "react/jsx-runtime", "react/jsx-dev-runtime", "@tanstack/react-query", "@tanstack/query-core"],
  },
}));
