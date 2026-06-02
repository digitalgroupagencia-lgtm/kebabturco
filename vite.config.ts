import { loadEnv } from "vite";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import fs from "fs";
import { execSync } from "child_process";
import { componentTagger } from "lovable-tagger";

const APP_BUILD_ID = process.env.VITE_APP_BUILD_ID || String(Date.now());

let GIT_SHA =
  process.env.VITE_GIT_SHA ||
  process.env.GITHUB_SHA?.slice(0, 7) ||
  process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ||
  "unknown";
if (GIT_SHA === "unknown") {
  try {
    GIT_SHA = execSync("git rev-parse --short HEAD", { encoding: "utf-8" }).trim();
  } catch {
    /* build remoto sem git */
  }
}

const injectAppBuildId = () => ({
  name: "inject-app-build-id",
  config() {
    return {
      define: {
        __APP_BUILD_ID__: JSON.stringify(APP_BUILD_ID),
        __GIT_SHA__: JSON.stringify(GIT_SHA),
      },
    };
  },
  transformIndexHtml(html: string) {
    const meta = `<meta name="app-build-id" content="${APP_BUILD_ID}" />\n  <meta name="app-git-sha" content="${GIT_SHA}" />`;
    if (html.includes('name="app-build-id"')) {
      return html
        .replace(/<meta name="app-build-id" content="[^"]*" \/>/, `<meta name="app-build-id" content="${APP_BUILD_ID}" />`)
        .replace(/<meta name="app-git-sha" content="[^"]*" \/>/, `<meta name="app-git-sha" content="${GIT_SHA}" />`);
    }
    return html.replace("</head>", `  ${meta}\n  </head>`);
  },
});

/** Só carrega a app DEPOIS de limpar service worker e caches (evita race no Safari). */
const deferAppBoot = () => ({
  name: "defer-app-boot",
  transformIndexHtml: {
    order: "post" as const,
    handler(html: string) {
      const moduleRe = /<script type="module"(?: crossorigin)? src="([^"]+)"><\/script>/;
      const match = html.match(moduleRe);
      if (!match) return html;

      const src = match[1];
      const boot = `<script src="/snaporder-boot.js" data-app-src="${src}" defer></script>`;
      return html.replace(moduleRe, boot);
    },
  },
});

const emitVersionJson = () => ({
  name: "emit-version-json",
  writeBundle(options: { dir?: string }) {
    const dir = options.dir ?? "dist";
    const payload = {
      buildId: APP_BUILD_ID,
      builtAt: new Date().toISOString(),
      gitSha: GIT_SHA,
    };
    fs.writeFileSync(path.join(dir, "version.json"), JSON.stringify(payload, null, 2));
  },
});

function parsePublicEnvFile(filePath: string): Record<string, string> {
  if (!fs.existsSync(filePath)) return {};
  const out: Record<string, string> = {};
  for (const line of fs.readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (value) out[key] = value;
  }
  return out;
}

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const stripePublicFile = parsePublicEnvFile(path.join(__dirname, "config/stripe.public.env"));
  const stripePublishableFromEnv =
    env.VITE_STRIPE_PUBLISHABLE_KEY ||
    env.STRIPE_PUBLISHABLE_KEY ||
    env.VITE_PUBLIC_STRIPE_PUBLISHABLE_KEY ||
    "";
  const stripeTestPublishableFromProject =
    stripePublicFile.VITE_STRIPE_PUBLISHABLE_KEY_TEST ||
    env.VITE_STRIPE_PUBLISHABLE_KEY_TEST ||
    "";

  const stripeDefines: Record<string, string> = {};
  if (stripePublishableFromEnv) {
    stripeDefines["import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY"] = JSON.stringify(stripePublishableFromEnv);
  }
  if (stripeTestPublishableFromProject) {
    stripeDefines["import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY_TEST"] = JSON.stringify(
      stripeTestPublishableFromProject,
    );
  }

  return {
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
    deferAppBoot(),
    emitVersionJson(),
    mode === "development" && componentTagger(),
  ].filter(Boolean),
  define: stripeDefines,
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: [
      "react",
      "react-dom",
      "react/jsx-runtime",
      "react/jsx-dev-runtime",
      "@tanstack/react-query",
      "@tanstack/query-core",
    ],
  },
  build: {
    rollupOptions: {
      output: {
        /**
         * Chunks isolados: cliente (cardápio/carrinho/checkout) vs interno
         * (admin/painel/equipa/etc). Alterar um módulo interno NÃO invalida
         * o bundle do cliente — o navegador continua a usar o chunk cliente
         * cacheado, e o fluxo de venda fica protegido.
         */
        manualChunks(id: string) {
          if (!id.includes("/src/")) return undefined;

          // Área interna
          if (
            id.includes("/src/views/admin/") ||
            id.includes("/src/views/panel/") ||
            id.includes("/src/views/seller/") ||
            id.includes("/src/views/delivery/") ||
            id.includes("/src/components/admin/") ||
            id.includes("/src/components/panel/") ||
            id.includes("/src/components/seller/") ||
            id.includes("/src/components/delivery/") ||
            id.includes("/src/components/kitchen/") ||
            id.includes("/src/components/staff/") ||
            id.includes("/src/routes/internalRouteOutlet")
          ) {
            return "internal";
          }

          // Área cliente
          if (
            id.includes("/src/components/screens/") ||
            id.includes("/src/components/customization/") ||
            id.includes("/src/components/Customer") ||
            id.includes("/src/contexts/CartContext") ||
            id.includes("/src/contexts/OrderContext") ||
            id.includes("/src/contexts/LanguageContext") ||
            id.includes("/src/pages/Index")
          ) {
            return "customer";
          }

          return undefined;
        },
      },
    },
  },
};
});
