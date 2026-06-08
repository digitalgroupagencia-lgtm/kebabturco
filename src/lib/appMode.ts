/**
 * PropioApp Master — em migração para SaaS multi-tenant.
 * Enquanto SINGLE_TENANT_MODE=true o app ainda usa fallbacks do tenant template.
 */
export const APP_NAME = "PropioApp";
export const DEFAULT_TENANT_SLUG = "template-restaurant";

/** IDs de emergência (fallback se a resolução por slug falhar). */
export const DEFAULT_TENANT_ID = "11111111-1111-1111-1111-111111111111";
export const DEFAULT_STORE_ID = "22222222-2222-2222-2222-222222222222";

/** Quando true: nunca activar shell SnapOrder / Admin Master multi-cliente. */
export const SINGLE_TENANT_MODE = true;
