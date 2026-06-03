#!/usr/bin/env node
/**
 * Correr auditoria contra produção (anon key do bundle).
 * Uso: node scripts/run-production-audit.mjs [storeId]
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

function loadEnvFromFile(path) {
  try {
    const raw = readFileSync(path, "utf8");
    const env = {};
    for (const line of raw.split("\n")) {
      const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
      if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, "");
    }
    return env;
  } catch {
    return {};
  }
}

const envFile = loadEnvFromFile(join(root, ".env"));
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || envFile.VITE_SUPABASE_URL;
const ANON_KEY =
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY || envFile.VITE_SUPABASE_PUBLISHABLE_KEY;
const storeId = process.argv[2] || process.env.AUDIT_STORE_ID || null;

if (!SUPABASE_URL || !ANON_KEY) {
  console.error("Defina VITE_SUPABASE_URL e VITE_SUPABASE_PUBLISHABLE_KEY em .env");
  process.exit(1);
}

const DUMMY_UUID = "00000000-0000-0000-0000-000000000001";

function isRpcMissing(msg) {
  const m = (msg ?? "").toLowerCase();
  return m.includes("pgrst202") || m.includes("could not find the function");
}

function isAuthRequired(status, msg) {
  if (status === 401 || status === 403) return true;
  const m = (msg ?? "").toLowerCase();
  return (
    m.includes("permission denied") ||
    m.includes("not authorized") ||
    m.includes("jwt") ||
    m.includes("rls") ||
    m.includes("row-level security")
  );
}

async function probeRpc(name, args) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${name}`, {
    method: "POST",
    headers: {
      apikey: ANON_KEY,
      Authorization: `Bearer ${ANON_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(args),
  });
  if (res.ok) return { status: "present" };
  const body = await res.json().catch(() => ({}));
  const msg = body.message || body.error || res.statusText;
  // Sondas anónimas: permission denied / 401 / 403 significam que a função
  // EXISTE mas exige autenticação. Não confundir com função inexistente.
  if (isAuthRequired(res.status, msg)) {
    return { status: "present", detail: "requer autenticação (anon sem permissão)" };
  }
  if (isRpcMissing(msg)) return { status: "missing", detail: msg };
  return { status: "present", detail: msg };
}


async function probeEdge(name) {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/${name}`, {
    method: "OPTIONS",
    headers: { apikey: ANON_KEY },
  });
  return { reachable: res.status !== 404, status: res.status };
}

const CRITICAL_RPCS = [
  "manager_set_staff_password",
  "manager_repair_staff_login",
  "assign_delivery_driver",
  "create_customer_order",
];

const OTHER_RPCS = [
  "lookup_staff_user_by_email",
  "list_store_drivers",
  "create_seller_order",
  "mark_order_paid_at_counter",
];

const EDGES = [
  "stripe-create-payment-intent",
  "operational-diagnostics",
  "create-staff-member",
  "update-staff-member",
  "print-order",
  "send-push-notification",
  "stripe-webhook",
];

console.log("=== Auditoria produção ===");
console.log(`URL: ${SUPABASE_URL}`);
console.log(`Loja: ${storeId ?? "(não especificada)"}`);
console.log("");

const findings = { ok: [], critical: [], warning: [] };

for (const rpc of [...CRITICAL_RPCS, ...OTHER_RPCS]) {
  const args =
    rpc === "lookup_staff_user_by_email"
      ? { _email: "probe@test.local" }
      : rpc === "list_store_drivers" && storeId
        ? { _store_id: storeId }
        : rpc.includes("order") || rpc.includes("driver")
          ? { _order_id: DUMMY_UUID, _driver_user_id: DUMMY_UUID, _store_id: storeId || DUMMY_UUID }
          : { _user_id: DUMMY_UUID, _password: "Test1234!" };

  const result = await probeRpc(rpc, args);
  const critical = CRITICAL_RPCS.includes(rpc);
  if (result.status === "missing") {
    const entry = `${rpc} — NÃO ACTIVA`;
    if (critical) findings.critical.push(entry);
    else findings.warning.push(entry);
  } else {
    findings.ok.push(`${rpc} — activa`);
  }
}

for (const fn of EDGES) {
  const { reachable, status } = await probeEdge(fn);
  if (!reachable) {
    const isStaff = fn.includes("staff-member");
    const entry = `${fn} — HTTP ${status} (não publicada)`;
    if (isStaff) findings.warning.push(entry);
    else findings.critical.push(entry);
  } else {
    findings.ok.push(`${fn} — servidor activo`);
  }
}

console.log(`OK (${findings.ok.length}):`);
findings.ok.forEach((l) => console.log(`  ✓ ${l}`));
console.log("");
if (findings.critical.length) {
  console.log(`CRÍTICO (${findings.critical.length}):`);
  findings.critical.forEach((l) => console.log(`  ✗ ${l}`));
  console.log("");
}
if (findings.warning.length) {
  console.log(`AVISOS (${findings.warning.length}):`);
  findings.warning.forEach((l) => console.log(`  ! ${l}`));
  console.log("");
}

console.log("Acções recomendadas:");
if (findings.critical.some((f) => f.includes("manager_"))) {
  console.log("  → Sync + Publish na Lovable para aplicar migrations de senha da equipa");
}
if (findings.warning.some((f) => f.includes("staff-member"))) {
  console.log("  → Publicar create/update-staff-member OU actualizar stripe-create-payment-intent");
}
if (findings.critical.length === 0 && findings.warning.length === 0) {
  console.log("  → Nenhuma acção urgente detectada via probes anónimas");
}

process.exit(findings.critical.length > 0 ? 1 : 0);
