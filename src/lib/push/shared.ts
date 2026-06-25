/**
 * Push, Núcleo partilhado.
 *
 * Subscrição, service worker, logger e diagnóstico VAPID que ambos cliente e
 * staff podem usar. NÃO importar nada daqui que seja específico do cliente
 * ou da equipa.
 */
export {
  subscribePushWithLogging,
  type PushSubscribeOptions,
  type PushSubscribeResult,
} from "@/lib/push/pushSubscriptionCore";
export {
  PUSH_HANDLER_SW_PATH,
  ensureStaffPushServiceWorker,
  isPushHandlerRegistration,
} from "@/lib/push/pushServiceWorker";
export { probePushServiceWorker, getBrowserPushSupport } from "@/lib/push/pushServiceWorkerProbe";
export { getVapidKeyDiagnostics } from "@/lib/push/pushVapidDiagnostics";
export { pushLog, describePushFailure } from "@/lib/push/pushLogger";
export type { PushLogContext, PushLogStage, PushLogLevel } from "@/lib/push/pushLogger";
