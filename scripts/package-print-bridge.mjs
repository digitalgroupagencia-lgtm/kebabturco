#!/usr/bin/env node
/**
 * Gera public/downloads/kebab-print-bridge.zip a partir de print-bridge/
 * Uso: npm run package:bridge
 *
 * Em ambientes sem o comando `zip` (ex.: build Lovable), reutiliza o zip já no repositório.
 */
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const bridgeDir = path.join(root, "print-bridge");
const outDir = path.join(root, "public", "downloads");
const outZip = path.join(outDir, "kebab-print-bridge.zip");

const INCLUDE = [
  "print-bridge.js",
  "package.json",
  ".env.example",
  "install-windows.bat",
  "start-bridge.bat",
  "install-service-windows.bat",
  "uninstall-service-windows.bat",
  "README.md",
  "README-WINDOWS.md",
];

function hasZipCommand() {
  try {
    execSync("command -v zip", { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

for (const name of INCLUDE) {
  const p = path.join(bridgeDir, name);
  if (!fs.existsSync(p)) {
    console.error(`[ERRO] Ficheiro em falta: print-bridge/${name}`);
    process.exit(1);
  }
}

fs.mkdirSync(outDir, { recursive: true });

if (!hasZipCommand()) {
  if (fs.existsSync(outZip)) {
    console.log("[package-print-bridge] zip indisponível — a usar ficheiro existente");
    process.exit(0);
  }
  console.error("[package-print-bridge] zip indisponível e sem ficheiro existente em public/downloads/");
  process.exit(1);
}

if (fs.existsSync(outZip)) fs.unlinkSync(outZip);

const isWin = process.platform === "win32";
if (isWin) {
  const ps = [
    "Compress-Archive",
    `-Path "${bridgeDir}\\*"`,
    `-DestinationPath "${outZip}"`,
    "-Force",
  ].join(" ");
  execSync(`powershell -NoProfile -Command "${ps}"`, { stdio: "inherit", cwd: root });
} else {
  const fileArgs = INCLUDE.map((f) => `"${f}"`).join(" ");
  execSync(`zip -r "${outZip}" ${fileArgs} -x "node_modules/*" ".env"`, {
    stdio: "inherit",
    cwd: bridgeDir,
  });
}

const stat = fs.statSync(outZip);
console.log(`\n[OK] ${outZip} (${Math.round(stat.size / 1024)} KB)`);
