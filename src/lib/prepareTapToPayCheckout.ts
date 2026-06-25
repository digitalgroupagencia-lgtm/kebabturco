import { isTapToPayUserEnabled } from "@/lib/tapToPayPrefs";
import {
  consumeLastTapToPayWarmUpError,
  getTapToPayReaderStatus,
  getTapToPayUnavailableMessage,
  isTapToPayPlatform,
  warmUpTapToPayReader,
} from "@/lib/stripeTerminalService";

export type TapToPayPrepareResult = { ok: true } | { ok: false; message: string };

/** Fecha teclado e aguarda modais animarem antes do próximo passo (Apple Tap to Pay). */
export async function waitForStaffPinUiDismiss(): Promise<void> {
  if (typeof document !== "undefined" && document.activeElement instanceof HTMLElement) {
    document.activeElement.blur();
  }
  await new Promise<void>((resolve) => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        window.setTimeout(resolve, 550);
      });
    });
  });
}

/** Prepara o leitor com ecrãs da app fechados, a Apple pode pedir termos por cima. */
export async function ensureTapToPayReaderReady(storeId: string): Promise<TapToPayPrepareResult> {
  if (!isTapToPayPlatform()) {
    return { ok: false, message: getTapToPayUnavailableMessage() };
  }
  if (!isTapToPayUserEnabled()) {
    return {
      ok: false,
      message: "Active o Tap to Pay nas Definições antes de cobrar.",
    };
  }

  try {
    const current = await getTapToPayReaderStatus();
    if (current.ready) return { ok: true };

    const warmed = await warmUpTapToPayReader(storeId);
    if (warmed === "ready") return { ok: true };

    const detail = consumeLastTapToPayWarmUpError();
    return {
      ok: false,
      message:
        detail ??
        "Não foi possível preparar o Tap to Pay. Vá a Definições (ícone engrenagem) → Preparar leitor e aceite os termos da Apple.",
    };
  } catch (e) {
    return {
      ok: false,
      message: e instanceof Error ? e.message : "Erro ao preparar Tap to Pay.",
    };
  }
}
