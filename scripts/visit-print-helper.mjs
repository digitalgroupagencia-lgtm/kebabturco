#!/usr/bin/env node
/**
 * Helper local no Mac — fica à escuta em http://127.0.0.1:3847
 * O painel «Demo visita» chama /start-bridge para iniciar a impressão sem abrir o Terminal.
 *
 * Instalar uma vez (deixar este comando a correr no Mac, ou usar launchd):
 *   npm run visit-print:helper
 */
import http from "node:http";
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";

const PORT = Number(process.env.VISIT_HELPER_PORT || 3847);
const PROJECT_DIR =
  process.env.KEBAB_PROJECT_DIR || path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PID_FILE = path.join(os.homedir(), ".kebab-visit-bridge.pid");

function cors(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

function isBridgeRunning() {
  try {
    if (!fs.existsSync(PID_FILE)) return false;
    const pid = Number(fs.readFileSync(PID_FILE, "utf8").trim());
    if (!pid) return false;
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

function startBridge() {
  if (isBridgeRunning()) {
    return { started: false, already_running: true };
  }
  const script = path.join(PROJECT_DIR, "scripts", "visit-print-bridge.mjs");
  const child = spawn(process.execPath, [script], {
    cwd: PROJECT_DIR,
    detached: true,
    stdio: "ignore",
    env: { ...process.env, KEBAB_PROJECT_DIR: PROJECT_DIR },
  });
  child.unref();
  return { started: true, pid: child.pid };
}

const server = http.createServer((req, res) => {
  cors(res);
  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  const url = req.url?.split("?")[0] ?? "";

  if (url === "/health" && req.method === "GET") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(
      JSON.stringify({
        ok: true,
        helper: true,
        bridge_running: isBridgeRunning(),
        project_dir: PROJECT_DIR,
        port: PORT,
      }),
    );
    return;
  }

  if (url === "/start-bridge" && req.method === "POST") {
    const result = startBridge();
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ ok: true, ...result }));
    return;
  }

  res.writeHead(404, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ ok: false, error: "not_found" }));
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`[visit-helper] Painel pode ligar em http://127.0.0.1:${PORT}`);
  console.log(`[visit-helper] POST /start-bridge → npm run visit-print (projeto: ${PROJECT_DIR})`);
  console.log("[visit-helper] Deixe esta janela aberta enquanto faz demonstrações.\n");
});

server.on("error", (err) => {
  if (err && typeof err === "object" && "code" in err && err.code === "EADDRINUSE") {
    console.log(`[visit-helper] Já existe um helper activo na porta ${PORT}.`);
    console.log("[visit-helper] Feche esta janela e use a que já estava aberta.\n");
    process.exit(0);
  }
  console.error("[visit-helper] Erro:", err);
  process.exit(1);
});
