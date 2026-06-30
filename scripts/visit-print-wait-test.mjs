#!/usr/bin/env node
/**
 * Procura impressora na rede local e envia ticket de teste quando encontrar.
 * Uso: npm run visit-print:wait-test
 */
import net from "node:net";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";

const TIMEOUT_MS = 1200;
const PORT = 9100;
const SUBNET = process.env.VISIT_SCAN_SUBNET || "192.168.1";
const PREFERRED_IP = process.env.VISIT_PRINTER_IP || "192.168.1.141";
const LABEL = process.env.VISIT_TEST_LABEL || "MAIN HOUSE";

function loadEnv() {
  const envPath = path.join(os.homedir(), ".kebab-visit-print.env");
  if (!fs.existsSync(envPath)) return {};
  const out = {};
  for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("=");
    if (eq < 1) continue;
    out[t.slice(0, eq).trim()] = t.slice(eq + 1).trim().replace(/^["']|["']$/g, "");
  }
  return out;
}

function probe(ip, port) {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    socket.setTimeout(TIMEOUT_MS);
    socket.once("connect", () => {
      socket.destroy();
      resolve(true);
    });
    socket.once("timeout", () => {
      socket.destroy();
      resolve(false);
    });
    socket.once("error", () => resolve(false));
    socket.connect(port, ip);
  });
}

async function scanSubnet() {
  const found = [];
  const jobs = [];
  for (let i = 1; i <= 254; i++) {
    const ip = `${SUBNET}.${i}`;
    jobs.push(
      probe(ip, PORT).then((ok) => {
        if (ok) found.push(ip);
      }),
    );
    if (jobs.length >= 40) {
      await Promise.all(jobs);
      jobs.length = 0;
    }
  }
  if (jobs.length) await Promise.all(jobs);
  return found.sort((a, b) => {
    const ap = a === PREFERRED_IP ? 0 : 1;
    const bp = b === PREFERRED_IP ? 0 : 1;
    return ap - bp || a.localeCompare(b);
  });
}

function buildTestTicket(label) {
  const lines = [
    "\x1B\x40",
    "\x1B\x61\x01",
    "KEBAB TURCO",
    "DEMO VISITA",
    label,
    new Date().toLocaleString("pt-PT"),
    "",
    "Se le isto, a impressora",
    "esta ligada e a funcionar.",
    "",
    "\n\n\n",
    "\x1D\x56\x00",
  ];
  return Buffer.from(lines.join("\n"), "binary");
}

function printTcp(ip, port, buffer) {
  return new Promise((resolve, reject) => {
    const socket = new net.Socket();
    socket.setTimeout(8000);
    socket.connect(port, ip, () => socket.write(buffer, () => socket.end()));
    socket.on("close", () => resolve(true));
    socket.on("timeout", () => {
      socket.destroy();
      reject(new Error("Timeout ao enviar para a impressora"));
    });
    socket.on("error", reject);
  });
}

async function tryPrint(ip) {
  const ticket = buildTestTicket(LABEL);
  console.log(`\n→ A enviar teste para ${ip}:${PORT} …`);
  await printTcp(ip, PORT, ticket);
  console.log(`✓ Dados enviados para ${ip} — verifique se saiu papel.\n`);
}

async function main() {
  console.log("\n=== Demo visita — procurar impressora e imprimir teste ===\n");
  const env = loadEnv();
  const preferred = env.VISIT_PRINTER_IP || PREFERRED_IP;

  console.log(`1) A testar IP guardado: ${preferred}`);
  if (await probe(preferred, PORT)) {
    await tryPrint(preferred);
    return;
  }
  console.log("   Não responde — a impressora pode estar desligada ou com outro IP.\n");

  console.log(`2) A procurar impressoras na rede ${SUBNET}.x (porta ${PORT})…`);
  const found = await scanSubnet();
  if (!found.length) {
    console.log("\n✗ Nenhuma impressora encontrada na rede.");
    console.log("  • Ligue a Epson e confirme que está na mesma Wi‑Fi do Mac");
    console.log("  • Imprima o ticket de rede da impressora (botão) e actualize o IP no painel");
    console.log("  • Depois volte a correr: npm run visit-print:wait-test\n");
    process.exit(1);
  }

  console.log(`   Encontrada(s): ${found.join(", ")}`);
  for (const ip of found) {
    try {
      await tryPrint(ip);
      if (ip !== preferred) {
        console.log(`⚠ O IP no painel é ${preferred} mas a impressora parece estar em ${ip}`);
        console.log("  Actualize o IP no painel Admin → Demo visita → Guardar.\n");
      }
      return;
    } catch (e) {
      console.error(`   Falhou em ${ip}:`, e.message);
    }
  }
  process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
