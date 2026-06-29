/**
 * Push — API exclusiva do STAFF (painel / equipa / admin / diagnósticos).
 *
 * O cliente NÃO pode importar este módulo. O smoke test bloqueia o build
 * se qualquer ecrã público trouxer estes símbolos estaticamente.
 */
export {
  STAFF_PUSH_TAG,
  STAFF_PUSH_ENABLED_KEY,
  PUSH_HANDLER_SW_PATH,
  ensureStaffPushServiceWorker,
  isPushHandlerRegistration,
  isStaffPushEnabled,
  setStaffPushEnabled,
  isStaffPushSupported,
  subscribeStaffPush,
  unsubscribeStaffPush,
  restoreStaffPushIfEnabled,
} from "@/lib/staffPush";
