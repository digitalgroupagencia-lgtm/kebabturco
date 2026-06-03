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
import { Capacitor, registerPlugin } from "@capacitor/core";
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

type TcpSocketPluginInstance = {
  connect(options: { ipAddress: string; port: number }): Promise<{ client: number }>;
  send(options: { client: number; data: string; encoding?: "utf8" | "base64" | "hex" }): Promise<void>;
  disconnect(options: { client: number }): Promise<void | { client?: number }>;
};

type CapacitorRuntime = typeof Capacitor & {
  Plugins?: Record<string, unknown>;
  PluginHeaders?: Array<{ name: string; methods?: Array<{ name: string; rtype?: string }> }>;
  nativePromise?: (pluginName: string, methodName: string, options?: unknown) => Promise<unknown>;
};

const TAG = "[AndroidPrint]";
let started = false;
const channels: RealtimeChannel[] = [];
let registeredTcpSocketFallback: TcpSocketPluginInstance | null = null;

function log(...args: unknown[]) {
  // eslint-disable-next-line no-console
  console.log(TAG, ...args);
}

function getWindowCapacitor(): CapacitorRuntime | undefined {
  if (typeof window === "undefined") return undefined;
  return (window as unknown as { Capacitor?: CapacitorRuntime }).Capacitor;
}

function getPluginKeys(runtime?: CapacitorRuntime) {
  return Object.keys(runtime?.Plugins ?? {});
}

function getPluginHeaderNames(runtime?: CapacitorRuntime) {
  return (runtime?.PluginHeaders ?? []).map((header) => ({
    name: header.name,
    methods: header.methods?.map((method) => method.name) ?? [],
  }));
}

function isTcpSocketPlugin(value: unknown): value is TcpSocketPluginInstance {
  return Boolean(
    value &&
      typeof value === "object" &&
      typeof (value as TcpSocketPluginInstance).connect === "function" &&
      typeof (value as TcpSocketPluginInstance).send === "function" &&
      typeof (value as TcpSocketPluginInstance).disconnect === "function",
  );
}

function resolveTcpSocketPlugin(): TcpSocketPluginInstance | null {
  const importedRuntime = Capacitor as CapacitorRuntime;
  const windowRuntime = getWindowCapacitor();
  const candidates = ["TcpSocket", "TcpSockets", "TCPSocket", "Socket"];

  const nativePromise = windowRuntime?.nativePromise ?? importedRuntime.nativePromise;
  if (Capacitor.getPlatform() === "android" && typeof nativePromise === "function") {
    return {
      connect: (options) => nativePromise("TcpSocket", "connect", options) as Promise<{ client: number }>,
      send: (options) => nativePromise("TcpSocket", "send", options) as Promise<void>,
      disconnect: (options) => nativePromise("TcpSocket", "disconnect", options) as Promise<void | { client?: number }>,
    };
  }

  for (const name of candidates) {
    const fromWindow = windowRuntime?.Plugins?.[name];
    if (isTcpSocketPlugin(fromWindow)) return fromWindow;

    const fromImported = importedRuntime.Plugins?.[name];
    if (isTcpSocketPlugin(fromImported)) return fromImported;
  }

  if (!registeredTcpSocketFallback && Capacitor.isPluginAvailable("TcpSocket")) {
    registeredTcpSocketFallback = registerPlugin<TcpSocketPluginInstance>("TcpSocket");
  }

  return registeredTcpSocketFallback;
}

function logTcpSocketDiagnostics() {
  const platform = Capacitor.getPlatform();
  const available = Capacitor.isPluginAvailable("TcpSocket");
  const importedRuntime = Capacitor as CapacitorRuntime;
  const windowRuntime = getWindowCapacitor();
  const plugin = resolveTcpSocketPlugin();

  console.log("[AndroidPrint] Platform", platform);
  console.log("[AndroidPrint] TcpSocket available", available);
  console.log("[AndroidPrint] Native platform", Capacitor.isNativePlatform());
  console.log("[AndroidPrint] Plugins", getPluginKeys(importedRuntime));
  console.log("[AndroidPrint] window.Capacitor.Plugins", getPluginKeys(windowRuntime));
  console.log("[AndroidPrint] PluginHeaders", getPluginHeaderNames(windowRuntime ?? importedRuntime));
  console.log("[AndroidPrint] TcpSocket plugin", importedRuntime.Plugins?.TcpSocket);
  console.log("[AndroidPrint] window TcpSocket plugin", windowRuntime?.Plugins?.TcpSocket);
  console.log("[AndroidPrint] nativePromise", typeof (windowRuntime?.nativePromise ?? importedRuntime.nativePromise));
  console.log("[AndroidPrint] Resolved TcpSocket plugin", plugin);
  console.log("Platform", platform);
  console.log("Plugins", getPluginKeys(windowRuntime ?? importedRuntime));
  console.log("TcpSocket plugin", windowRuntime?.Plugins?.TcpSocket ?? importedRuntime.Plugins?.TcpSocket);

  return { platform, available, plugin };
}

function getTcpSocketOrThrow(): TcpSocketPluginInstance {
  const { available, plugin } = logTcpSocketDiagnostics();
  if (!plugin) {
    throw new Error(
      `TcpSocket plugin indisponível no JS deste APK. isPluginAvailable=${available}. Verifique PluginHeaders/nativePromise no Logcat.`,
    );
  }
  return plugin;
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
  const tcpSocket = getTcpSocketOrThrow();
  const host = job.printer_ip;
  const port = job.printer_port || 9100;
  // eslint-disable-next-line no-console
  console.log("[AndroidPrint] Connecting to", host, port);
  // eslint-disable-next-line no-console
  console.log("[AndroidPrint] Plugin object:", tcpSocket);
  const { client } = await tcpSocket.connect({ ipAddress: host, port });
  // eslint-disable-next-line no-console
  console.log("[AndroidPrint] Connected, client=", client);
  try {
    const copies = Math.max(1, job.copies || 1);
    for (let i = 0; i < copies; i++) {
      // eslint-disable-next-line no-console
      console.log("[AndroidPrint] Sending copy", i + 1, "of", copies);
      await tcpSocket.send({
        client,
        data: job.ticket_data, // already base64
        encoding: "base64",
      });
    }
    // eslint-disable-next-line no-console
    console.log("[AndroidPrint] Send complete");
  } finally {
    try {
      await tcpSocket.disconnect({ client });
      // eslint-disable-next-line no-console
      console.log("[AndroidPrint] Disconnected");
    } catch (e) {
      log("disconnect warn", (e as Error).message);
    }
  }
}

async function markJob(jobId: string, status: "printing" | "printed" | "failed", errorMessage?: string) {
  const patch: { status: typeof status; updated_at: string; error_message?: string } = {
    status,
    updated_at: new Date().toISOString(),
  };
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
  logTcpSocketDiagnostics();

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
  const tcpSocket = getTcpSocketOrThrow();
  const host = opts.ip;
  const port = opts.port || 9100;
  // eslint-disable-next-line no-console
  console.log("[AndroidPrint] Connecting to", host, port);
  // eslint-disable-next-line no-console
  console.log("[AndroidPrint] Plugin object:", tcpSocket);
  const { client } = await tcpSocket.connect({ ipAddress: host, port });
  // eslint-disable-next-line no-console
  console.log("[AndroidPrint] Connected, client=", client);
  try {
    await tcpSocket.send({ client, data: opts.ticketBase64, encoding: "base64" });
    // eslint-disable-next-line no-console
    console.log("[AndroidPrint] Test send complete");
  } finally {
    try { await tcpSocket.disconnect({ client }); } catch { /* noop */ }
  }
}
