import { APP_NAME } from "@/lib/appMode";

/**
 * Informação institucional usada nas páginas legais (lojas de apps, GDPR/LGPD).
 * Valores neutros da plataforma — cada tenant deve sobrepor com os seus
 * próprios dados via `company_settings` / wizard. Aqui ficam apenas defaults
 * seguros para quando não há tenant resolvido.
 */
const PLATFORM_ORIGIN =
  typeof window !== "undefined" ? window.location.origin : "https://propioapp.com";

export const LEGAL_SITE = {
  appName: APP_NAME,
  platformName: APP_NAME,
  companyName: APP_NAME,
  siteUrl: PLATFORM_ORIGIN,
  supportEmail: "support@propioapp.com",
  privacyEmail: "privacy@propioapp.com",
  lastUpdated: "28 de maio de 2026",
  responseTime: "até 5 dias úteis",
  deletionTime: "até 30 dias corridos",
  retentionNote:
    "Registos fiscais, comprovativos de pagamento e dados necessários à prevenção de fraude podem ser conservados pelo prazo legal aplicável.",
} as const;

export const LEGAL_PATHS = {
  privacy: "/privacy",
  terms: "/terms",
  deleteAccount: "/delete-account",
  support: "/support",
} as const;

export type LegalPathKey = keyof typeof LEGAL_PATHS;

export const LEGAL_NAV: ReadonlyArray<{ path: string; label: string; key: LegalPathKey }> = [
  { key: "privacy", path: LEGAL_PATHS.privacy, label: "Privacidade" },
  { key: "terms", path: LEGAL_PATHS.terms, label: "Termos" },
  { key: "deleteAccount", path: LEGAL_PATHS.deleteAccount, label: "Excluir conta" },
  { key: "support", path: LEGAL_PATHS.support, label: "Suporte" },
];
