// ============================================================
// PRINT BRIDGE — escuta a fila print_jobs e imprime via TCP/LAN
// (Adaptado do projeto Toni's Digital Kitchen)
// ============================================================
//
// INSTALAÇÃO (no PC do restaurante, mesma rede da impressora):
//   1. Instale Node.js 18+
//   2. Copie esta pasta inteira para o PC
//   3. Crie um arquivo .env nesta pasta (use o botão "Descargar configuración" no painel)
//   4. Terminal: npm install
//   5. Terminal: node print-bridge.js
//
// Para rodar como serviço Windows:
//   npm install -g pm2
//   pm2 start print-bridge.js --name print-bridge
//   pm2 save && pm2 startup
//
// MULTI-LOJA: cada unidade precisa de um bridge com STORE_ID único.
// ============================================================

require('dotenv').config();
const net = require('net');
const { createClient } = require('@supabase/supabase-js');

const BRIDGE_VERSION = '2.0.0-multistore';

const CONFIG = {
  SUPABASE_URL: process.env.SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY,
  STORE_ID: process.env.STORE_ID || null,
  DEFAULT_PRINTER_IP: process.env.PRINTER_IP || process.env.DEFAULT_PRINTER_IP || '192.168.1.200',
  DEFAULT_PRINTER_PORT: parseInt(process.env.PRINTER_PORT || process.env.DEFAULT_PRINTER_PORT || '9100', 10),
  TCP_TIMEOUT: 5000,
  POLL_INTERVAL: 3000,
  HEARTBEAT_INTERVAL: 30000,
  RETRY_BASE_SECONDS: 30,
};

const supabaseKey = CONFIG.SUPABASE_SERVICE_ROLE_KEY || CONFIG.SUPABASE_ANON_KEY;

if (!CONFIG.SUPABASE_URL || !supabaseKey) {
  console.error('[ERRO] Configure SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY (recomendado) ou SUPABASE_ANON_KEY no .env');
  process.exit(1);
}

if (!CONFIG.STORE_ID) {
  console.error('[ERRO] STORE_ID é obrigatório em multi-loja. Configure no .env (Admin → Impressora → Descargar .env).');
  process.exit(1);
}

if (!CONFIG.SUPABASE_SERVICE_ROLE_KEY) {
  console.warn('[AVISO] Sem SUPABASE_SERVICE_ROLE_KEY — após hardening de segurança a impressão pode falhar.');
} else {
  console.log('[CFG] Autenticação: service role (PC local)');
}

const supabase = createClient(CONFIG.SUPABASE_URL, supabaseKey);

function printViaTcp(ip, port, data) {
  return new Promise((resolve, reject) => {
    const socket = new net.Socket();
    socket.setTimeout(CONFIG.TCP_TIMEOUT);
    socket.connect(port, ip, () => {
      socket.write(data, () => socket.end());
    });
    socket.on('close', () => resolve(true));
    socket.on('timeout', () => { socket.destroy(); reject(new Error('Timeout')); });
    socket.on('error', reject);
  });
}

const processing = new Set();

async function sendHeartbeat() {
  try {
    await supabase.rpc('upsert_print_bridge_heartbeat', {
      _store_id: CONFIG.STORE_ID,
      _bridge_version: BRIDGE_VERSION,
      _printer_ip: CONFIG.DEFAULT_PRINTER_IP,
    });
  } catch (err) {
    console.warn(`[HEARTBEAT] Falhou: ${err.message}`);
  }
}

async function markOrderPrinted(orderId) {
  if (!orderId) return;
  try {
    await supabase.rpc('mark_kitchen_printed', { _order_id: orderId });
  } catch (err) {
    console.warn(`[JOB] mark_kitchen_printed falhou: ${err.message}`);
  }
}

async function scheduleRetry(job, errMessage) {
  const retryCount = (job.retry_count || 0) + 1;
  const maxRetries = job.max_retries ?? 3;

  if (retryCount < maxRetries) {
    const delaySec = CONFIG.RETRY_BASE_SECONDS * retryCount;
    const nextRetry = new Date(Date.now() + delaySec * 1000).toISOString();
    await supabase.from('print_jobs').update({
      status: 'pending',
      retry_count: retryCount,
      next_retry_at: nextRetry,
      error_message: errMessage,
    }).eq('id', job.id);
    console.log(`[JOB] ↻ retry ${retryCount}/${maxRetries} em ${delaySec}s — ${job.id.substring(0, 8)}`);
    return;
  }

  await supabase.from('print_jobs').update({
    status: 'failed',
    retry_count: retryCount,
    error_message: errMessage,
  }).eq('id', job.id);
  console.error(`[JOB] ❌ failed definitivo — ${job.id.substring(0, 8)}`);
}

async function processJob(job) {
  if (processing.has(job.id)) return;
  processing.add(job.id);
  const ip = job.printer_ip || CONFIG.DEFAULT_PRINTER_IP;
  const port = job.printer_port || CONFIG.DEFAULT_PRINTER_PORT;
  const copies = job.copies || 1;

  console.log(`\n[JOB] ${job.id.substring(0, 8)} → ${ip}:${port} × ${copies} (store ${job.store_id?.substring(0, 8) || '?'})`);

  if (job.store_id && job.store_id !== CONFIG.STORE_ID) {
    console.warn(`[JOB] Ignorado — store_id não corresponde ao STORE_ID deste bridge`);
    processing.delete(job.id);
    return;
  }

  const { data: claimed } = await supabase.from('print_jobs')
    .update({ status: 'printing', error_message: null })
    .eq('id', job.id)
    .eq('status', 'pending')
    .select('id');
  if (!claimed || claimed.length === 0) { processing.delete(job.id); return; }

  try {
    const buf = Buffer.from(job.ticket_data, 'base64');
    for (let i = 0; i < copies; i++) {
      await printViaTcp(ip, port, buf);
    }
    await supabase.from('print_jobs').update({ status: 'printed', error_message: null }).eq('id', job.id);
    await markOrderPrinted(job.order_id);
    console.log(`[JOB] ✅ ${job.id.substring(0, 8)} impresso`);
  } catch (err) {
    console.error(`[JOB] ❌ ${err.message}`);
    await scheduleRetry(job, err.message);
  } finally {
    processing.delete(job.id);
  }
}

async function processPending() {
  const now = new Date().toISOString();
  let q = supabase
    .from('print_jobs')
    .select('*')
    .eq('status', 'pending')
    .eq('store_id', CONFIG.STORE_ID)
    .or(`next_retry_at.is.null,next_retry_at.lte.${now}`)
    .order('created_at');
  const { data: jobs } = await q.limit(10);
  if (jobs && jobs.length > 0) {
    console.log(`[POLL] ${jobs.length} job(s) pendente(s)`);
    for (const job of jobs) await processJob(job);
  }
}

async function testConnection() {
  console.log(`\n[TEST] Conectando a ${CONFIG.DEFAULT_PRINTER_IP}:${CONFIG.DEFAULT_PRINTER_PORT}...`);
  try {
    const socket = new net.Socket();
    await new Promise((resolve, reject) => {
      socket.setTimeout(CONFIG.TCP_TIMEOUT);
      socket.connect(CONFIG.DEFAULT_PRINTER_PORT, CONFIG.DEFAULT_PRINTER_IP, () => { socket.end(); resolve(); });
      socket.on('timeout', () => { socket.destroy(); reject(new Error('Timeout')); });
      socket.on('error', reject);
    });
    console.log('[TEST] ✅ Impressora alcançável');
  } catch (err) {
    console.error(`[TEST] ⚠️  ${err.message} — bridge seguirá rodando`);
  }
}

async function main() {
  console.log('\n╔══════════════════════════════════════╗');
  console.log('║   PRINT BRIDGE — Lovable Totem      ║');
  console.log('╚══════════════════════════════════════╝');
  console.log(`[CFG] Versão: ${BRIDGE_VERSION}`);
  console.log(`[CFG] Store: ${CONFIG.STORE_ID}`);
  console.log(`[CFG] Impressora padrão: ${CONFIG.DEFAULT_PRINTER_IP}:${CONFIG.DEFAULT_PRINTER_PORT}`);
  console.log('[CFG] Modo: polling (sem realtime — mais estável)');
  await testConnection();
  await sendHeartbeat();
  await processPending();
  setInterval(processPending, CONFIG.POLL_INTERVAL);
  setInterval(sendHeartbeat, CONFIG.HEARTBEAT_INTERVAL);
  console.log('\n[BRIDGE] ✅ Aguardando jobs... (Ctrl+C para sair)\n');
}

main().catch(console.error);
