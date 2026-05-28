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
      const boot = `<script>(function(){var src=${JSON.stringify(src)};var PUSH=${JSON.stringify("/push-handler.js")};window.__SNAPORDER_MAIN__=src;function loadApp(){var s=document.createElement("script");s.type="module";s.crossOrigin="anonymous";s.src=src;document.body.appendChild(s)}function shouldKeepSw(r){try{var u=(r.active&&r.active.scriptURL)||(r.installing&&r.installing.scriptURL)||(r.waiting&&r.waiting.scriptURL)||"";return u.indexOf("push-handler")!==-1}catch(e){return false}}function purge(){var tasks=[];if("serviceWorker" in navigator){tasks.push(navigator.serviceWorker.getRegistrations().then(function(regs){return Promise.all(regs.map(function(r){return shouldKeepSw(r)?Promise.resolve():r.unregister()}))}))}if("caches" in window){tasks.push(caches.keys().then(function(keys){return Promise.all(keys.map(function(k){return caches.delete(k)}))}))}return Promise.all(tasks).catch(function(){})}purge().finally(loadApp)})();</script>`;
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
};
});
