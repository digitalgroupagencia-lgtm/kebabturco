#!/usr/bin/env node
/**
 * Visit Print Bridge — Mac do admin master (demo visita).
 * Liga ao Supabase via Edge Function — NÃO precisa da service role no Mac.
 */
import net from "node:net";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";

const VERSION = "1.2.0-visit-cloud";
const POLL_MS = 2500;
const HEARTBEAT_MS = 30000;
const TCP_TIMEOUT = 8000;
const LOCAL_PORT = Number(process.env.VISIT_BRIDGE_PORT || 3848);

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  const raw = fs.readFileSync(filePath, "utf8");
  for (const line of raw.split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("=");
    if (eq < 1) continue;
    const key = t.slice(0, eq).trim();
    const val = t.slice(eq + 1).trim();
    if (!process.env[key]) process.env[key] = val;
  }
}

const envPaths = [
  path.join(os.homedir(), ".kebab-visit-print.env"),
  path.join(process.cwd(), "visit-print-bridge.env"),
  path.join(process.cwd(), "print-bridge", ".env"),
];

for (const p of envPaths) loadEnvFile(p);

const SUPABASE_URL = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "").replace(/\/$/, "");
const ANON_KEY =
  process.env.SUPABASE_ANON_KEY ||
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  process.env.VITE_SUPABASE_ANON_KEY ||
  "";
const BRIDGE_TOKEN = process.env.VISIT_BRIDGE_TOKEN || "";
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const OWNER_ID = process.env.VISIT_OWNER_USER_ID || "";

const API_URL = SUPABASE_URL ? `${SUPABASE_URL}/functions/v1/visit-print-bridge-api` : "";

if (!SUPABASE_URL || !OWNER_ID) {
  console.error("[ERRO] Defina SUPABASE_URL e VISIT_OWNER_USER_ID em ~/.kebab-visit-print.env");
  console.error("       Corra: npm run visit-print:setup");
  process.exit(1);
}

const useCloudApi = Boolean(BRIDGE_TOKEN && ANON_KEY);
let supabase = null;

if (!useCloudApi) {
  if (!SERVICE_KEY) {
    console.error("[ERRO] Falta VISIT_BRIDGE_TOKEN (recomendado no Lovable Cloud).");
    console.error("       Corra: npm run visit-print:setup");
    console.error("       A service role NÃO está disponível no Lovable — use o token de bridge.");
    process.exit(1);
  }
  const { createClient } = await import("@supabase/supabase-js");
  supabase = createClient(SUPABASE_URL, SERVICE_KEY);
}

async function cloudApi(body) {
  const res = await fetch(API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${ANON_KEY}`,
      apikey: ANON_KEY,
      "x-visit-bridge-token": BRIDGE_TOKEN,
    },
    body: JSON.stringify({ owner_user_id: OWNER_ID, ...body }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data?.error || `API ${res.status}`);
  }
  return data;
}

function printTcp(ip, port, buffer) {
  return new Promise((resolve, reject) => {
    const socket = new net.Socket();
    socket.setTimeout(TCP_TIMEOUT);
    socket.connect(port, ip, () => {
      socket.write(buffer, () => socket.end());
    });
    socket.on("close", () => resolve(true));
    socket.on("timeout", () => {
      socket.destroy();
      reject(new Error("Timeout TCP"));
    });
    socket.on("error", reject);
  });
}

async function heartbeat() {
  try {
    if (useCloudApi) {
      await cloudApi({ action: "heartbeat" });
    } else {
      await supabase.rpc("upsert_visit_print_bridge_heartbeat", { _owner_user_id: OWNER_ID });
    }
  } catch (e) {
    console.warn("[HEARTBEAT]", e.message);
  }
}

async function processJob(job) {
  const ip = job.printer_ip;
  const port = job.printer_port || 9100;
  const copies = Math.max(1, job.copies || 1);
  const data = Buffer.from(job.ticket_data, "base64");

  console.log(`[JOB] ${job.id.slice(0, 8)} → ${ip}:${port} × ${copies}`);

  for (let i = 0; i < copies; i++) {
    await printTcp(ip, port, data);
  }

  if (useCloudApi) {
    await cloudApi({ action: "complete", job_id: job.id });
  } else {
    await supabase
      .from("print_jobs")
      .update({ status: "printed", updated_at: new Date().toISOString(), error_message: null })
      .eq("id", job.id);
  }

  console.log(`[JOB] ✓ impresso ${job.id.slice(0, 8)}`);
}

async function failJob(job, msg) {
  if (useCloudApi) {
    await cloudApi({ action: "fail", job_id: job.id, error: msg });
  } else {
    await supabase
      .from("print_jobs")
      .update({
        status: "failed",
        error_message: `[visit-bridge] ${msg}`,
        updated_at: new Date().toISOString(),
      })
      .eq("id", job.id);
  }
  console.error(`[JOB] ✗ ${job.id.slice(0, 8)}: ${msg}`);
}

async function poll() {
  try {
    let jobs = [];
    if (useCloudApi) {
      const data = await cloudApi({ action: "claim", limit: 3 });
      jobs = data.jobs ?? [];
    } else {
      const { data, error } = await supabase.rpc("claim_visit_print_jobs", {
        _owner_user_id: OWNER_ID,
        _limit: 3,
      });
      if (error) throw error;
      jobs = data ?? [];
    }
    for (const job of jobs) {
      try {
        await processJob(job);
      } catch (e) {
        await failJob(job, e.message || String(e));
      }
    }
  } catch (e) {
    console.warn("[POLL]", e.message);
  }
}

console.log(`[VISIT-BRIDGE] v${VERSION} owner=${OWNER_ID.slice(0, 8)}…`);
console.log(
  useCloudApi
    ? "[VISIT-BRIDGE] Modo Lovable Cloud (token de bridge — sem service role no Mac)"
    : "[VISIT-BRIDGE] Modo service role local",
);
console.log("[VISIT-BRIDGE] A escutar jobs de demonstração… (Ctrl+C para parar)\n");

void heartbeat();
setInterval(() => void heartbeat(), HEARTBEAT_MS);
setInterval(() => void poll(), POLL_MS);
void poll();

const PID_FILE = path.join(os.homedir(), ".kebab-visit-bridge.pid");
fs.writeFileSync(PID_FILE, String(process.pid));
process.on("exit", () => {
  try {
    fs.unlinkSync(PID_FILE);
  } catch {
    /* noop */
  }
});

function cors(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

const localServer = http.createServer((req, res) => {
  cors(res);
  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }
  if (req.url === "/health" && req.method === "GET") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(
      JSON.stringify({
        ok: true,
        bridge: true,
        version: VERSION,
        pid: process.pid,
        mode: useCloudApi ? "cloud" : "service_role",
      }),
    );
    return;
  }
  res.writeHead(404);
  res.end();
});

localServer.listen(LOCAL_PORT, "127.0.0.1", () => {
  console.log(`[VISIT-BRIDGE] Painel local: http://127.0.0.1:${LOCAL_PORT}/health`);
});
