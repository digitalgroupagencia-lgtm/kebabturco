/**
 * Push — API exclusiva do CLIENTE (cardápio / pedidos).
 *
 * Qualquer ecrã do cliente deve importar daqui e NUNCA de `@/lib/staffPush`,
 * `@/lib/push/pushTestService` ou de `@/lib/diagnostics/*`.
 */
export {
  CUSTOMER_MARKETING_PUSH_TAG,
  CUSTOMER_MARKETING_PUSH_KEY,
  CUSTOMER_MARKETING_PROMPT_SESSION_KEY,
  isCustomerMarketingPushOpted,
  setCustomerMarketingPushOpted,
  markCustomerMarketingPromptShown,
  shouldPromptCustomerMarketingPush,
  isCustomerMarketingPushSupported,
  subscribeCustomerMarketingPush,
} from "@/lib/customerMarketingPush";
