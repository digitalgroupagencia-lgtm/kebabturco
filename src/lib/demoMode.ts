/**
 * Modo demonstração — flag local (localStorage) que injecta dados de
 * exemplo no dashboard quando ligada. Não toca em DB nem em lógica real.
 * Reversível: basta desligar para voltar aos dados reais.
 */
const KEY = "propio-demo-mode";
const EVENT = "propio-demo-mode-change";

export function isDemoMode(): boolean {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(KEY) === "on";
}

export function setDemoMode(on: boolean) {
  if (typeof window === "undefined") return;
  if (on) window.localStorage.setItem(KEY, "on");
  else window.localStorage.removeItem(KEY);
  window.dispatchEvent(new CustomEvent(EVENT, { detail: on }));
}

export function onDemoModeChange(cb: (on: boolean) => void): () => void {
  if (typeof window === "undefined") return () => {};
  const handler = (e: Event) => cb((e as CustomEvent<boolean>).detail);
  window.addEventListener(EVENT, handler);
  return () => window.removeEventListener(EVENT, handler);
}

import { useEffect, useState } from "react";

export function useDemoMode() {
  const [on, setOn] = useState<boolean>(() => isDemoMode());
  useEffect(() => onDemoModeChange(setOn), []);
  return on;
}