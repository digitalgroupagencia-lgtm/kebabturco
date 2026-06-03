/**
 * Android Direct Print Listener
 * ---------------------------------------
 * Roda APENAS no APK Android (Capacitor.isNativePlatform()).
 * No browser/PWA é no-op total → não afeta PrintBridge nem nada do web.
 *
 * Fluxo:
 *  1. Detecta lojas onde printer_settings.print_mode = 'android_direct'
 *  2. Escuta INSERTs em print_jobs via Realtime (filtrados por store_id)
 *  3. Abre TCP → envia ESC/POS (ticket_data base64) → fecha
 *  4. Marca job como 'printed' (sucesso) ou 'failed' + error_message
 */
import { Capacitor } from "@capacitor/core";
import { TcpSocket, DataEncoding } from "capacitor-tcp-socket";
import { supabase } from "@/integrations/supabase/client";
import type { RealtimeChannel } from "@supabase/supabase-js";

type PrintJob = {
  id: string;
  store_id: string | null;
  ticket_data: string;
  printer_ip: string;
  printer_port: number;
  copies: number;
  status: string;
};

const TAG = "[AndroidPrint]";
let started = false;
const channels: RealtimeChannel[] = [];

function log(...args: unknown[]) {
  // eslint-disable-next-line no-console
  console.log(TAG, ...args);
}

async function fetchAndroidStores(): Promise<string[]> {
  const { data, error } = await supabase
    .from("printer_settings")
    .select("store_id, print_mode, enabled")
    .eq("print_mode", "android_direct")
    .eq("enabled", true);
  if (error) {
    log("erro lendo printer_settings", error.message);
    return [];
  }
  return (data ?? []).map((r) => r.store_id).filter(Boolean) as string[];
}

async function sendEscPos(job: PrintJob): Promise<void> {
  log(`conectando ${job.printer_ip}:${job.printer_port}`);
  const { client } = await TcpSocket.connect({
    ipAddress: job.printer_ip,
    port: job.printer_port || 9100,
  });
  try {
    const copies = Math.max(1, job.copies || 1);
    for (let i = 0; i < copies; i++) {
      await TcpSocket.send({
        client,
        data: job.ticket_data, // already base64
        encoding: DataEncoding.BASE64,
      });
    }
  } finally {
    try {
      await TcpSocket.disconnect({ client });
    } catch (e) {
      log("disconnect warn", (e as Error).message);
    }
  }
}

async function markJob(jobId: string, status: "printing" | "printed" | "failed", errorMessage?: string) {
  const patch: Record<string, unknown> = { status, updated_at: new Date().toISOString() };
  if (errorMessage !== undefined) patch.error_message = errorMessage;
  const { error } = await supabase.from("print_jobs").update(patch).eq("id", jobId);
  if (error) log("falha update job", jobId, error.message);
}

async function processJob(job: PrintJob) {
  if (job.status !== "pending") return;
  log("novo job", job.id, `(copies=${job.copies})`);
  try {
    await markJob(job.id, "printing");
    await sendEscPos(job);
    await markJob(job.id, "printed");
    log("✓ impresso", job.id);
  } catch (e) {
    const msg = (e as Error)?.message || String(e);
    log("✗ falha", job.id, msg);
    await markJob(job.id, "failed", `[android] ${msg}`);
  }
}

async function drainPending(storeId: string) {
  const { data } = await supabase
    .from("print_jobs")
    .select("id, store_id, ticket_data, printer_ip, printer_port, copies, status")
    .eq("store_id", storeId)
    .eq("status", "pending")
    .order("created_at", { ascending: true })
    .limit(10);
  for (const job of (data ?? []) as PrintJob[]) {
    await processJob(job);
  }
}

function subscribeStore(storeId: string) {
  const ch = supabase
    .channel(`android-print:${storeId}`)
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "print_jobs", filter: `store_id=eq.${storeId}` },
      (payload) => {
        const job = payload.new as PrintJob;
        void processJob(job);
      },
    )
    .subscribe((status) => {
      if (status === "SUBSCRIBED") log("escutando loja", storeId);
    });
  channels.push(ch);
  // Drain any jobs pendentes deixados enquanto offline
  void drainPending(storeId);
}

export async function startAndroidPrintListener() {
  if (started) return;
  if (!Capacitor.isNativePlatform()) {
    // Web/PWA → nada a fazer. Bridge/PC continua processando.
    return;
  }
  started = true;
  log("iniciando (plataforma nativa)");

  const stores = await fetchAndroidStores();
  if (stores.length === 0) {
    log("nenhuma loja em modo android_direct — listener inativo");
    started = false;
    return;
  }
  for (const id of stores) subscribeStore(id);

  // Reavalia lojas a cada 5 min (caso admin troque o modo)
  setInterval(async () => {
    const current = await fetchAndroidStores();
    const knownIds = new Set(channels.map((c) => c.topic.replace("realtime:android-print:", "")));
    for (const id of current) {
      if (!knownIds.has(id)) subscribeStore(id);
    }
  }, 5 * 60 * 1000);
}

export function isAndroidNative(): boolean {
  return Capacitor.isNativePlatform() && Capacitor.getPlatform() === "android";
}

/** Teste manual a partir da UI — só funciona dentro do APK. */
export async function androidDirectTestPrint(opts: { ip: string; port: number; ticketBase64: string }) {
  if (!Capacitor.isNativePlatform()) {
    throw new Error("Teste Android direto só funciona dentro do APK instalado no tablet.");
  }
  const { client } = await TcpSocket.connect({ ipAddress: opts.ip, port: opts.port || 9100 });
  try {
    await TcpSocket.send({ client, data: opts.ticketBase64, encoding: DataEncoding.BASE64 });
  } finally {
    try { await TcpSocket.disconnect({ client }); } catch { /* noop */ }
  }
}
