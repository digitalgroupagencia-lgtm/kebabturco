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
// ============================================================

require('dotenv').config();
const net = require('net');
const { createClient } = require('@supabase/supabase-js');

const CONFIG = {
  SUPABASE_URL: process.env.SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY,
  STORE_ID: process.env.STORE_ID || null, // se vazio, escuta todos
  DEFAULT_PRINTER_IP: process.env.DEFAULT_PRINTER_IP || '192.168.1.200',
  DEFAULT_PRINTER_PORT: parseInt(process.env.DEFAULT_PRINTER_PORT || '9100'),
  TCP_TIMEOUT: 5000,
  POLL_INTERVAL: 3000,
};

const supabaseKey = CONFIG.SUPABASE_SERVICE_ROLE_KEY || CONFIG.SUPABASE_ANON_KEY;

if (!CONFIG.SUPABASE_URL || !supabaseKey) {
  console.error('[ERRO] Configure SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY (recomendado) ou SUPABASE_ANON_KEY no .env');
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

async function processJob(job) {
  if (processing.has(job.id)) return;
  processing.add(job.id);
  const ip = job.printer_ip || CONFIG.DEFAULT_PRINTER_IP;
  const port = job.printer_port || CONFIG.DEFAULT_PRINTER_PORT;
  const copies = job.copies || 1;

  console.log(`\n[JOB] ${job.id.substring(0, 8)} → ${ip}:${port} × ${copies}`);

  const { data: claimed } = await supabase.from('print_jobs')
    .update({ status: 'printing' }).eq('id', job.id).eq('status', 'pending').select('id');
  if (!claimed || claimed.length === 0) { processing.delete(job.id); return; }

  try {
    const buf = Buffer.from(job.ticket_data, 'base64');
    for (let i = 0; i < copies; i++) {
      await printViaTcp(ip, port, buf);
    }
    await supabase.from('print_jobs').update({ status: 'printed' }).eq('id', job.id);
    console.log(`[JOB] ✅ ${job.id.substring(0, 8)} impresso`);
  } catch (err) {
    console.error(`[JOB] ❌ ${err.message}`);
    await supabase.from('print_jobs')
      .update({ status: 'failed', error_message: err.message }).eq('id', job.id);
  } finally {
    processing.delete(job.id);
  }
}

async function processPending() {
  let q = supabase.from('print_jobs').select('*').eq('status', 'pending').order('created_at');
  if (CONFIG.STORE_ID) q = q.eq('store_id', CONFIG.STORE_ID);
  const { data: jobs } = await q.limit(10);
  if (jobs && jobs.length > 0) {
    console.log(`[POLL] ${jobs.length} job(s) pendente(s)`);
    for (const job of jobs) await processJob(job);
  }
}

function startRealtime() {
  const filter = CONFIG.STORE_ID
    ? `status=eq.pending`
    : 'status=eq.pending';
  supabase.channel('print-jobs')
    .on('postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'print_jobs', filter },
      async (payload) => {
        if (CONFIG.STORE_ID && payload.new.store_id !== CONFIG.STORE_ID) return;
        console.log('\n[REALTIME] 🔔 Novo job');
        await processJob(payload.new);
      })
    .subscribe((s) => console.log(`[REALTIME] ${s}`));
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
  console.log(`[CFG] Store: ${CONFIG.STORE_ID || '(todos)'}`);
  console.log(`[CFG] Impressora padrão: ${CONFIG.DEFAULT_PRINTER_IP}:${CONFIG.DEFAULT_PRINTER_PORT}`);
  await testConnection();
  await processPending();
  startRealtime();
  setInterval(processPending, CONFIG.POLL_INTERVAL);
  console.log('\n[BRIDGE] ✅ Aguardando jobs... (Ctrl+C para sair)\n');
}

main().catch(console.error);
