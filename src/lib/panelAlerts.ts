import {
  ensureStaffPushServiceWorker,
  restoreStaffPushIfEnabled,
} from "@/lib/staffPush";
import { deployDebugLog } from "@/lib/deployDebugLog";

const ALERTS_ENABLED_KEY = "panel-alerts-enabled";
export const PANEL_ALERTS_CHANGED_EVENT = "panel-alerts-changed";
export const PANEL_ALERT_FLASH_EVENT = "panel-alert-flash";
export const PANEL_URGENT_CHANGED_EVENT = "panel-urgent-changed";
const STATIC_BEEP_URL = "/alert-beep.wav";
const ALERT_DIAG_KEY = "panel-alert-diag";
const ALERT_VOLUME = 0.42;
const ALERT_VOLUME_URGENT = 1;
/** Intervalo entre bips enquanto houver pedidos em «Recebido» sem mudança de estado. */
const PENDING_ALERT_REPEAT_MS = 4_000;
/** Após 5 min sem aceitar — som mais rápido e alto + ecrã vermelho. */
const PENDING_URGENT_REPEAT_MS = 2_000;
export const PANEL_URGENT_PENDING_MS = 5 * 60 * 1000;

/** Pedidos recebidos ainda não aceites — som repete até mudar o estado. */
const unacknowledgedPending = new Set<string>();
const pendingRegisteredAt = new Map<string, number>();

export const PANEL_UNACK_CHANGED_EVENT = "panel-unack-changed";

let audioCtx: AudioContext | null = null;
let beepBlobUrl: string | null = null;
let domAudio: HTMLAudioElement | null = null;
let repeatTimer: number | null = null;
let visibilityHookInstalled = false;
let iosAudioUnlocked = false;

export type AlertDiagnostic = {
  ok: boolean;
  path: string;
  error?: string;
  at: number;
  isIOS: boolean;
};

function isIOSLike(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  return (
    /iPad|iPhone|iPod/.test(ua) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  );
}

function saveAlertDiagnostic(diag: AlertDiagnostic) {
  try {
    sessionStorage.setItem(ALERT_DIAG_KEY, JSON.stringify(diag));
  } catch {
    /* ignore */
  }
}

export function getLastAlertDiagnostic(): AlertDiagnostic | null {
  try {
    const raw = sessionStorage.getItem(ALERT_DIAG_KEY);
    return raw ? (JSON.parse(raw) as AlertDiagnostic) : null;
  } catch {
    return null;
  }
}

function dispatchUnackChanged() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(PANEL_UNACK_CHANGED_EVENT));
  window.dispatchEvent(new CustomEvent(PANEL_URGENT_CHANGED_EVENT));
}

export function countUrgentPendingOrders(): number {
  const now = Date.now();
  let count = 0;
  for (const id of unacknowledgedPending) {
    const started = pendingRegisteredAt.get(id) ?? now;
    if (now - started >= PANEL_URGENT_PENDING_MS) count += 1;
  }
  return count;
}

export function isUrgentPendingOrder(orderId: string): boolean {
  if (!unacknowledgedPending.has(orderId)) return false;
  const started = pendingRegisteredAt.get(orderId) ?? Date.now();
  return Date.now() - started >= PANEL_URGENT_PENDING_MS;
}

function hasUrgentPendingOrders(): boolean {
  return countUrgentPendingOrders() > 0;
}

export function countUnacknowledgedPendingOrders(): number {
  return unacknowledgedPending.size;
}

export function isPendingOrderAlerting(orderId: string): boolean {
  return unacknowledgedPending.has(orderId);
}

export function acknowledgePendingOrderAlert(orderId: string) {
  if (!unacknowledgedPending.delete(orderId)) return;
  pendingRegisteredAt.delete(orderId);
  dispatchUnackChanged();
  if (unacknowledgedPending.size === 0) stopPendingOrderAlertLoop();
}

function currentAlertRepeatMs(): number {
  return hasUrgentPendingOrders() ? PENDING_URGENT_REPEAT_MS : PENDING_ALERT_REPEAT_MS;
}

function restartPendingAlertLoop() {
  stopPendingOrderAlertLoop();
  if (!isPanelAlertsEnabled() || unacknowledgedPending.size === 0) return;
  void playAlertSoundOnce();
  repeatTimer = window.setInterval(() => {
    if (unacknowledgedPending.size === 0) {
      stopPendingOrderAlertLoop();
      return;
    }
    if (isPanelAlertsEnabled()) {
      void playAlertSoundOnce();
      if (hasUrgentPendingOrders()) flashVisualAlert();
      window.dispatchEvent(new CustomEvent(PANEL_URGENT_CHANGED_EVENT));
    }
  }, currentAlertRepeatMs());
}

function ensurePendingAlertLoop() {
  if (!isPanelAlertsEnabled() || unacknowledgedPending.size === 0) {
    stopPendingOrderAlertLoop();
    return;
  }
  if (repeatTimer !== null) return;
  restartPendingAlertLoop();
}

/** Regista pedido em «Recebido» — som repete até mudar o estado. */
export function registerNewPendingOrderAlert(orderId: string): boolean {
  const isNew = !unacknowledgedPending.has(orderId);
  unacknowledgedPending.add(orderId);
  if (isNew) pendingRegisteredAt.set(orderId, Date.now());
  if (isNew) dispatchUnackChanged();
  if (isPanelAlertsEnabled()) {
    if (repeatTimer !== null && hasUrgentPendingOrders()) restartPendingAlertLoop();
    else ensurePendingAlertLoop();
  }
  return isPanelAlertsEnabled();
}

/** Para todos os alertas de pedidos recebidos (botão silenciar). */
export function silenceAllPendingAlerts() {
  if (unacknowledgedPending.size === 0) return;
  unacknowledgedPending.clear();
  pendingRegisteredAt.clear();
  stopPendingOrderAlertLoop();
  dispatchUnackChanged();
}

function flashVisualAlert() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(PANEL_ALERT_FLASH_EVENT));
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

async function ensureBeepBlobUrl(): Promise<string> {
  if (beepBlobUrl) return beepBlobUrl;
  beepBlobUrl = await generateBeepBlobUrl();
  return beepBlobUrl;
}

function beepSources(): string[] {
  if (isIOSLike()) return [STATIC_BEEP_URL];
  return [STATIC_BEEP_URL];
}

/** Safari/iPhone exige toque antes de som — chamar num botão. */
export async function enablePanelAlerts(): Promise<boolean> {
  installVisibilityHook();
  try {
    const heard = await playHtmlBeep(true);
    if (isIOSLike()) {
      // O toque no botão desbloqueia o áudio; no Safari o som pode falhar sem bloquear alertas.
      iosAudioUnlocked = true;
      setPanelAlertsEnabled(true);
      if (unacknowledgedPending.size > 0) ensurePendingAlertLoop();
      flashVisualAlert();
      if (typeof navigator !== "undefined" && navigator.vibrate) {
        navigator.vibrate(heard ? [200, 80, 200] : [400, 100, 400, 100, 400]);
      }
      deployDebugLog({
        hypothesisId: "H-iOS-A",
        location: "panelAlerts.ts:enablePanelAlerts",
        message: "ios alerts enabled on tap",
        data: { heard, iosAudioUnlocked, source: STATIC_BEEP_URL },
        runId: "alert-ios-v3",
      });
      return true;
    }

    const webOk = await ensureAudioReady();
    if (!heard && webOk) await playWebBeep();
    setPanelAlertsEnabled(true);
    if (unacknowledgedPending.size > 0) ensurePendingAlertLoop();

    deployDebugLog({
      hypothesisId: "H-A",
      location: "panelAlerts.ts:enablePanelAlerts",
      message: "alerts enabled",
      data: { webAudioState: audioCtx?.state ?? "none", webOk, heard },
      runId: "alert-ios-v3",
    });

    return webOk || heard;
  } catch {
    if (isIOSLike()) {
      iosAudioUnlocked = true;
      setPanelAlertsEnabled(true);
      if (unacknowledgedPending.size > 0) ensurePendingAlertLoop();
      flashVisualAlert();
      if (typeof navigator !== "undefined" && navigator.vibrate) {
        navigator.vibrate([400, 100, 400, 100, 400]);
      }
      return true;
    }
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
  const duration = 0.28;
  const offline = new OfflineAudioContext(1, Math.ceil(sampleRate * duration), sampleRate);
  const osc = offline.createOscillator();
  const gain = offline.createGain();
  osc.type = "sine";
  osc.frequency.value = 660;
  gain.gain.setValueAtTime(0.35, 0);
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

function waitForPlaying(audio: HTMLAudioElement, ms = 800): Promise<boolean> {
  return new Promise((resolve) => {
    if (!audio.paused && audio.currentTime > 0) {
      resolve(true);
      return;
    }
    const timer = window.setTimeout(() => {
      audio.removeEventListener("playing", onPlaying);
      resolve(!audio.paused);
    }, ms);
    const onPlaying = () => {
      window.clearTimeout(timer);
      resolve(true);
    };
    audio.addEventListener("playing", onPlaying, { once: true });
  });
}

/** iPhone/Safari — ficheiro estático no servidor (mais fiável que blob). */
async function playHtmlBeep(isUnlock = false, urgent = false): Promise<boolean> {
  const sources = beepSources();
  let lastError = "sem fonte";

  for (const src of sources) {
    try {
      const audio = getDomAudio();
      audio.pause();
      audio.currentTime = 0;
      audio.src = src;
      audio.volume = urgent ? ALERT_VOLUME_URGENT : ALERT_VOLUME;
      audio.muted = false;
      audio.load();

      await audio.play();
      const playing = await waitForPlaying(audio, isIOSLike() ? 1200 : 800);

      // Safari/iPhone: play() sem erro conta como sucesso — o evento "playing" falha muitas vezes.
      if (playing || (isIOSLike() && !audio.paused)) {
        if (isUnlock && isIOSLike()) iosAudioUnlocked = true;
        saveAlertDiagnostic({
          ok: true,
          path: `html:${src}`,
          at: Date.now(),
          isIOS: isIOSLike(),
        });
        deployDebugLog({
          hypothesisId: "H-iOS-B",
          location: "panelAlerts.ts:playHtmlBeep",
          message: "html beep playing",
          data: { src, isUnlock, currentTime: audio.currentTime, paused: audio.paused },
          runId: "alert-ios-v3",
        });
        return true;
      }
      lastError = "play ok but not playing";
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err);
      deployDebugLog({
        hypothesisId: "H-iOS-B",
        location: "panelAlerts.ts:playHtmlBeep",
        message: "html beep failed",
        data: { src, error: lastError, isIOS: isIOSLike() },
        runId: "alert-ios-v2",
      });
    }
  }

  saveAlertDiagnostic({
    ok: false,
    path: "html-failed",
    error: lastError,
    at: Date.now(),
    isIOS: isIOSLike(),
  });
  return false;
}

function playWebBeep(urgent = false): boolean {
  if (!audioCtx) audioCtx = new AudioContext();
  const ctx = audioCtx;
  if (ctx.state !== "running") return false;

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "sine";
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.frequency.value = urgent ? 880 : 660;
  const peak = urgent ? 0.55 : 0.22;
  gain.gain.setValueAtTime(peak, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + (urgent ? 0.45 : 0.28));
  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + (urgent ? 0.45 : 0.28));
  return true;
}

/** Som curto — usado no loop persistente e no teste. */
async function playAlertSoundOnce(): Promise<boolean> {
  if (!isPanelAlertsEnabled()) return false;

  const urgent = hasUrgentPendingOrders();
  flashVisualAlert();
  if (urgent) flashVisualAlert();
  await ensureAudioReady();

  let soundOk = false;
  let path = "none";

  if (isIOSLike()) {
    soundOk = await playHtmlBeep(false, urgent);
    path = "ios-static-wav";
  } else {
    soundOk = await playHtmlBeep(false, urgent);
    path = "static-wav";
    if (!soundOk) {
      const ready = await ensureAudioReady();
      soundOk = ready && playWebBeep(urgent);
      path = "web-audio";
    }
  }

  if (typeof navigator !== "undefined" && navigator.vibrate) {
    navigator.vibrate(
      urgent ? [500, 150, 500, 150, 700, 150, 700] : [300, 120, 300, 120, 500],
    );
  }

  deployDebugLog({
    hypothesisId: "H-iOS-C",
    location: "panelAlerts.ts:playAlertSoundOnce",
    message: "alert sound",
    data: { soundOk, path, isIOS: isIOSLike(), iosAudioUnlocked, pending: unacknowledgedPending.size },
    runId: "alert-loop-v1",
  });

  return soundOk;
}

async function playAlertSound(): Promise<boolean> {
  return playAlertSoundOnce();
}

export async function playTestAlert(): Promise<boolean> {
  installVisibilityHook();
  if (!isPanelAlertsEnabled()) {
    const enabled = await enablePanelAlerts();
    if (!enabled) return false;
    return true;
  }
  return playAlertSound();
}

export function playNewOrderAlert(orderId: string) {
  return registerNewPendingOrderAlert(orderId);
}

/** Mantém o loop activo enquanto existirem pedidos pendentes no painel. */
export function syncPendingOrderAlertLoop(hasPendingOrders: boolean) {
  if (hasPendingOrders && isPanelAlertsEnabled()) {
    ensurePendingAlertLoop();
  } else if (!hasPendingOrders) {
    stopPendingOrderAlertLoop();
  }
}

export function tickPendingAlertUrgency() {
  if (!isPanelAlertsEnabled() || unacknowledgedPending.size === 0) return;
  const wasUrgent = hasUrgentPendingOrders();
  window.dispatchEvent(new CustomEvent(PANEL_URGENT_CHANGED_EVENT));
  if (hasUrgentPendingOrders() && repeatTimer !== null) {
    restartPendingAlertLoop();
  } else if (!wasUrgent && hasUrgentPendingOrders()) {
    restartPendingAlertLoop();
  }
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

/** Prepara áudio e push se alertas já estavam activos numa sessão anterior. */
export async function preparePanelAlertsIfEnabled(storeId?: string): Promise<void> {
  installVisibilityHook();
  if (!isPanelAlertsEnabled()) return;
  await ensureAudioReady();
  if (unacknowledgedPending.size > 0) ensurePendingAlertLoop();
  if (storeId) {
    await ensureStaffPushServiceWorker();
    await restoreStaffPushIfEnabled(storeId);
  }
}
