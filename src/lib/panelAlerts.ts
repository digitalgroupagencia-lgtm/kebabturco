import { deployDebugLog } from "@/lib/deployDebugLog";

const ALERTS_ENABLED_KEY = "panel-alerts-enabled";
export const PANEL_ALERTS_CHANGED_EVENT = "panel-alerts-changed";
const REPEAT_MS = 2000;

let audioCtx: AudioContext | null = null;
let beepBlobUrl: string | null = null;
let domAudio: HTMLAudioElement | null = null;
let repeatTimer: number | null = null;
let visibilityHookInstalled = false;
let iosAudioUnlocked = false;

function isIOSLike(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  return (
    /iPad|iPhone|iPod/.test(ua) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  );
}

function installVisibilityHook() {
  if (visibilityHookInstalled || typeof document === "undefined") return;
  visibilityHookInstalled = true;
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") void ensureAudioReady();
  });
}

function getDomAudio(): HTMLAudioElement {
  if (domAudio && document.body.contains(domAudio)) return domAudio;
  domAudio = document.createElement("audio");
  domAudio.id = "panel-alert-beep";
  domAudio.preload = "auto";
  domAudio.setAttribute("playsinline", "true");
  domAudio.setAttribute("webkit-playsinline", "true");
  domAudio.style.display = "none";
  document.body.appendChild(domAudio);
  return domAudio;
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
  if (!enabled) {
    iosAudioUnlocked = false;
    stopPendingOrderAlertLoop();
  }
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(PANEL_ALERTS_CHANGED_EVENT));
  }
}

async function ensureBeepUrl(): Promise<string> {
  if (beepBlobUrl) return beepBlobUrl;
  beepBlobUrl = await generateBeepBlobUrl();
  return beepBlobUrl;
}

/** Safari/iPhone exige toque antes de som — chamar num botão. */
export async function enablePanelAlerts(): Promise<boolean> {
  installVisibilityHook();
  try {
    const heard = await playHtmlBeep(true);
    if (isIOSLike()) {
      iosAudioUnlocked = heard;
      if (heard) setPanelAlertsEnabled(true);
      deployDebugLog({
        hypothesisId: "H-iOS-A",
        location: "panelAlerts.ts:enablePanelAlerts",
        message: "ios html unlock",
        data: { heard, iosAudioUnlocked },
        runId: "alert-ios",
      });
      return heard;
    }

    const webOk = await ensureAudioReady();
    if (!heard && webOk) await playWebBeep();
    setPanelAlertsEnabled(true);

    deployDebugLog({
      hypothesisId: "H-A",
      location: "panelAlerts.ts:enablePanelAlerts",
      message: "alerts enabled",
      data: { webAudioState: audioCtx?.state ?? "none", webOk, heard },
      runId: "alert-audio",
    });

    return webOk || heard;
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
  const duration = 0.55;
  const offline = new OfflineAudioContext(1, Math.ceil(sampleRate * duration), sampleRate);
  const osc = offline.createOscillator();
  const gain = offline.createGain();
  osc.type = "square";
  osc.frequency.value = 880;
  gain.gain.setValueAtTime(0.55, 0);
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
  const sampleRate = buffer.sampleRate;
  const samples = buffer.getChannelData(0);
  const dataSize = samples.length * 2;
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
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
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

/** iPhone/Safari — HTML Audio no DOM (Web Audio muitas vezes inaudível). */
async function playHtmlBeep(isUnlock = false): Promise<boolean> {
  try {
    const url = await ensureBeepUrl();
    const audio = getDomAudio();
    audio.src = url;
    audio.volume = 1;
    audio.muted = false;
    audio.currentTime = 0;

    await audio.play();

    if (isUnlock && isIOSLike()) {
      iosAudioUnlocked = true;
    }

    deployDebugLog({
      hypothesisId: "H-iOS-B",
      location: "panelAlerts.ts:playHtmlBeep",
      message: "html beep play",
      data: {
        isUnlock,
        isIOS: isIOSLike(),
        paused: audio.paused,
        volume: audio.volume,
        readyState: audio.readyState,
      },
      runId: "alert-ios",
    });

    return !audio.paused;
  } catch (err) {
    deployDebugLog({
      hypothesisId: "H-iOS-B",
      location: "panelAlerts.ts:playHtmlBeep",
      message: "html beep failed",
      data: {
        error: err instanceof Error ? err.message : String(err),
        isIOS: isIOSLike(),
      },
      runId: "alert-ios",
    });
    return false;
  }
}

function playWebBeep(): boolean {
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

async function playAlertSound(): Promise<boolean> {
  if (!isPanelAlertsEnabled()) return false;

  let soundOk = false;
  let path = "none";

  if (isIOSLike()) {
    soundOk = await playHtmlBeep(false);
    path = "ios-html";
    if (!soundOk && iosAudioUnlocked) {
      soundOk = await playHtmlBeep(false);
    }
  } else {
    const ready = await ensureAudioReady();
    soundOk = ready && playWebBeep();
    path = "web-audio";
    if (!soundOk) {
      soundOk = await playHtmlBeep(false);
      path = "desktop-html-fallback";
    }
  }

  if (typeof navigator !== "undefined" && navigator.vibrate) {
    navigator.vibrate(soundOk ? [120, 60, 120] : [200, 100, 200, 100, 200]);
  }

  deployDebugLog({
    hypothesisId: "H-iOS-C",
    location: "panelAlerts.ts:playAlertSound",
    message: "alert sound attempt",
    data: {
      soundOk,
      path,
      isIOS: isIOSLike(),
      webState: audioCtx?.state ?? "none",
      iosAudioUnlocked,
    },
    runId: "alert-ios",
  });

  return soundOk;
}

export async function playTestAlert(): Promise<boolean> {
  installVisibilityHook();
  if (!isPanelAlertsEnabled()) {
    const enabled = await enablePanelAlerts();
    if (!enabled) return false;
  }
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

export function isIOSPanelDevice(): boolean {
  return isIOSLike();
}
