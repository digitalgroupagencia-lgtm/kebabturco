import { deployDebugLog } from "@/lib/deployDebugLog";

const ALERTS_ENABLED_KEY = "panel-alerts-enabled";
export const PANEL_ALERTS_CHANGED_EVENT = "panel-alerts-changed";
const REPEAT_MS = 2000;

let audioCtx: AudioContext | null = null;
let fallbackAudio: HTMLAudioElement | null = null;
let fallbackBeepUrl: string | null = null;
let repeatTimer: number | null = null;
let visibilityHookInstalled = false;

function installVisibilityHook() {
  if (visibilityHookInstalled || typeof document === "undefined") return;
  visibilityHookInstalled = true;
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") void ensureAudioReady();
  });
}

export function isPanelAlertsEnabled(): boolean {
  try {
    return localStorage.getItem(ALERTS_ENABLED_KEY) === "1";
  } catch {
    return false;
  }
}

export function setPanelAlertsEnabled(enabled: boolean) {
  try {
    localStorage.setItem(ALERTS_ENABLED_KEY, enabled ? "1" : "0");
  } catch {
    /* ignore */
  }
  if (!enabled) stopPendingOrderAlertLoop();
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(PANEL_ALERTS_CHANGED_EVENT));
  }
}

/** Safari/iPhone exige toque antes de som — chamar num botão. */
export async function enablePanelAlerts(): Promise<boolean> {
  installVisibilityHook();
  try {
    const webOk = await ensureAudioReady();
    await unlockFallbackAudio();
    setPanelAlertsEnabled(true);

    deployDebugLog({
      hypothesisId: "H-A",
      location: "panelAlerts.ts:enablePanelAlerts",
      message: "alerts enabled",
      data: {
        webAudioState: audioCtx?.state ?? "none",
        webOk,
        fallbackReady: Boolean(fallbackAudio),
      },
      runId: "alert-audio",
    });

    return webOk || Boolean(fallbackAudio);
  } catch {
    setPanelAlertsEnabled(false);
    return false;
  }
}

async function ensureAudioReady(): Promise<boolean> {
  try {
    if (!audioCtx) audioCtx = new AudioContext();
    if (audioCtx.state === "suspended") await audioCtx.resume();
    return audioCtx.state === "running";
  } catch {
    return false;
  }
}

async function generateBeepBlobUrl(): Promise<string> {
  const sampleRate = 44100;
  const duration = 0.45;
  const offline = new OfflineAudioContext(1, sampleRate * duration, sampleRate);
  const osc = offline.createOscillator();
  const gain = offline.createGain();
  osc.type = "sine";
  osc.frequency.value = 880;
  gain.gain.setValueAtTime(0.45, 0);
  gain.gain.exponentialRampToValueAtTime(0.01, duration);
  osc.connect(gain);
  gain.connect(offline.destination);
  osc.start(0);
  osc.stop(duration);
  const buffer = await offline.startRendering();
  const wav = encodeWav(buffer);
  const blob = new Blob([wav], { type: "audio/wav" });
  return URL.createObjectURL(blob);
}

function encodeWav(buffer: AudioBuffer): ArrayBuffer {
  const numChannels = 1;
  const sampleRate = buffer.sampleRate;
  const samples = buffer.getChannelData(0);
  const bytesPerSample = 2;
  const blockAlign = numChannels * bytesPerSample;
  const dataSize = samples.length * bytesPerSample;
  const ab = new ArrayBuffer(44 + dataSize);
  const view = new DataView(ab);

  const writeStr = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
  };

  writeStr(0, "RIFF");
  view.setUint32(4, 36 + dataSize, true);
  writeStr(8, "WAVE");
  writeStr(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * blockAlign, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, 16, true);
  writeStr(36, "data");
  view.setUint32(40, dataSize, true);

  let offset = 44;
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    offset += 2;
  }
  return ab;
}

async function unlockFallbackAudio(): Promise<boolean> {
  try {
    if (!fallbackBeepUrl) fallbackBeepUrl = await generateBeepBlobUrl();
    if (!fallbackAudio) {
      fallbackAudio = new Audio(fallbackBeepUrl);
      fallbackAudio.preload = "auto";
      fallbackAudio.setAttribute("playsinline", "true");
    }
    fallbackAudio.volume = 1;
    fallbackAudio.currentTime = 0;
    await fallbackAudio.play();
    fallbackAudio.pause();
    fallbackAudio.currentTime = 0;
    return true;
  } catch {
    return false;
  }
}

function beepWebAudio(): boolean {
  if (!audioCtx) audioCtx = new AudioContext();
  const ctx = audioCtx;
  if (ctx.state !== "running") return false;

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.frequency.value = 880;
  gain.gain.setValueAtTime(0.35, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);
  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + 0.35);

  const osc2 = ctx.createOscillator();
  const gain2 = ctx.createGain();
  osc2.connect(gain2);
  gain2.connect(ctx.destination);
  osc2.frequency.value = 1100;
  gain2.gain.setValueAtTime(0.3, ctx.currentTime + 0.12);
  gain2.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
  osc2.start(ctx.currentTime + 0.12);
  osc2.stop(ctx.currentTime + 0.5);
  return true;
}

async function playFallbackAudio(): Promise<boolean> {
  try {
    if (!fallbackBeepUrl) fallbackBeepUrl = await generateBeepBlobUrl();
    if (!fallbackAudio) {
      fallbackAudio = new Audio(fallbackBeepUrl);
      fallbackAudio.setAttribute("playsinline", "true");
    }
    fallbackAudio.volume = 1;
    fallbackAudio.currentTime = 0;
    await fallbackAudio.play();
    return true;
  } catch {
    return false;
  }
}

async function playAlertSound(): Promise<boolean> {
  if (!isPanelAlertsEnabled()) return false;

  const ready = await ensureAudioReady();
  let soundOk = ready && beepWebAudio();

  if (!soundOk) {
    soundOk = await playFallbackAudio();
  }

  if (typeof navigator !== "undefined" && navigator.vibrate) {
    navigator.vibrate(soundOk ? [120, 60, 120] : [200, 100, 200]);
  }

  deployDebugLog({
    hypothesisId: "H-A-H-C",
    location: "panelAlerts.ts:playAlertSound",
    message: "alert sound attempt",
    data: {
      soundOk,
      webState: audioCtx?.state ?? "none",
      usedFallback: !ready || !soundOk,
      path: typeof window !== "undefined" ? window.location.pathname : "",
    },
    runId: "alert-audio",
  });

  return soundOk;
}

export async function playTestAlert(): Promise<boolean> {
  installVisibilityHook();
  return playAlertSound();
}

/** Um bip imediato ao detectar pedido novo (o loop continua depois). */
export function playNewOrderAlert() {
  void playAlertSound();
  return isPanelAlertsEnabled();
}

function tickPendingLoop() {
  void playAlertSound();
}

/** Bip a cada 2s enquanto existir pedido em «Pedido recebido». */
export function syncPendingOrderAlertLoop(hasPendingOrders: boolean) {
  if (!hasPendingOrders || !isPanelAlertsEnabled()) {
    stopPendingOrderAlertLoop();
    return;
  }

  if (repeatTimer !== null) return;

  void playAlertSound();
  repeatTimer = window.setInterval(tickPendingLoop, REPEAT_MS);
}

export function stopPendingOrderAlertLoop() {
  if (repeatTimer !== null) {
    window.clearInterval(repeatTimer);
    repeatTimer = null;
  }
}
