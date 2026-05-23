const ALERTS_ENABLED_KEY = "panel-alerts-enabled";

let audioCtx: AudioContext | null = null;

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
}

/** Safari exige um toque antes de tocar som — chamar num botão. */
export async function enablePanelAlerts(): Promise<boolean> {
  try {
    if (!audioCtx) audioCtx = new AudioContext();
    if (audioCtx.state === "suspended") await audioCtx.resume();
    setPanelAlertsEnabled(true);
    return audioCtx.state === "running";
  } catch {
    setPanelAlertsEnabled(false);
    return false;
  }
}

function beep() {
  if (!audioCtx) audioCtx = new AudioContext();
  const ctx = audioCtx;
  if (ctx.state !== "running") return false;

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.frequency.value = 880;
  gain.gain.setValueAtTime(0.3, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + 0.4);

  const osc2 = ctx.createOscillator();
  const gain2 = ctx.createGain();
  osc2.connect(gain2);
  gain2.connect(ctx.destination);
  osc2.frequency.value = 1100;
  gain2.gain.setValueAtTime(0.25, ctx.currentTime + 0.15);
  gain2.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.55);
  osc2.start(ctx.currentTime + 0.15);
  osc2.stop(ctx.currentTime + 0.55);
  return true;
}

export function playTestAlert(): boolean {
  const ok = beep();
  if (typeof navigator !== "undefined" && navigator.vibrate) {
    navigator.vibrate([120, 80, 120]);
  }
  return ok;
}

export function playNewOrderAlert() {
  const soundOk = isPanelAlertsEnabled() ? beep() : false;

  if (typeof navigator !== "undefined" && navigator.vibrate) {
    navigator.vibrate([200, 100, 200, 100, 300]);
  }

  return soundOk;
}
