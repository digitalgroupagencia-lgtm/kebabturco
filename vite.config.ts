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
      const boot = `<script>(function(){var src=${JSON.stringify(src)};window.__SNAPORDER_MAIN__=src;function loadApp(){var s=document.createElement("script");s.type="module";s.crossOrigin="anonymous";s.src=src;document.body.appendChild(s)}function purge(){var tasks=[];if("serviceWorker" in navigator){tasks.push(navigator.serviceWorker.getRegistrations().then(function(regs){return Promise.all(regs.map(function(r){return r.unregister()}))}))}if("caches" in window){tasks.push(caches.keys().then(function(keys){return Promise.all(keys.map(function(k){return caches.delete(k)}))}))}return Promise.all(tasks).catch(function(){})}purge().finally(loadApp)})();</script>`;
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
    deferAppBoot(),
    emitVersionJson(),
    mode === "development" && componentTagger(),
  ].filter(Boolean),
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
}));
