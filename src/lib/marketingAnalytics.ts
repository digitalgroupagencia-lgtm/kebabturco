type EventPayload = Record<string, unknown>;

/** Stub leve para tracking de marketing (sem efeitos colaterais). */
export async function trackMarketingEvent(
  _event: string,
  _payload?: EventPayload,
): Promise<void> {
  /* no-op */
}
