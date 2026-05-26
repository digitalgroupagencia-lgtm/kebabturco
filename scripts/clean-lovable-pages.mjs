#!/usr/bin/env node
/**
 * A Lovable recria por vezes src/pages/panel|admin|seller ao sincronizar.
 * Essas pastas alimentam o dropdown com rotas fantasma (/banners, /admin/*, …).
 * Mantém só as 4 páginas públicas + README.
 */
import fs from "node:fs";
import path from "node:path";

const pagesRoot = path.join(process.cwd(), "src", "pages");
const allowedFiles = new Set(["Index.tsx", "Auth.tsx", "StaffLogin.tsx", "Install.tsx", "NotFound.tsx", "README.md"]);

if (!fs.existsSync(pagesRoot)) {
  process.exit(0);
}

for (const name of fs.readdirSync(pagesRoot)) {
  const full = path.join(pagesRoot, name);
  const stat = fs.statSync(full);
  if (stat.isDirectory()) {
    fs.rmSync(full, { recursive: true, force: true });
    console.log(`[clean-lovable-pages] removed folder ${full}`);
  } else if (!allowedFiles.has(name)) {
    fs.rmSync(full, { force: true });
    console.log(`[clean-lovable-pages] removed file ${full}`);
  }
}
