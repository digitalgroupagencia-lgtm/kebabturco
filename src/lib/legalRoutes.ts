import type { ComponentType } from "react";
import { LEGAL_PATHS } from "@/lib/legalSite";

type LegalPageModule = { default: ComponentType<object> };

const LEGAL_PAGE_LOADERS: Record<string, () => Promise<LegalPageModule>> = {
  [LEGAL_PATHS.privacy]: () => import("@/pages/legal/PrivacyPage.tsx"),
  [LEGAL_PATHS.terms]: () => import("@/pages/legal/TermsPage.tsx"),
  [LEGAL_PATHS.deleteAccount]: () => import("@/pages/legal/DeleteAccountPage.tsx"),
  [LEGAL_PATHS.support]: () => import("@/pages/legal/SupportPage.tsx"),
};

export function isLegalPublicPath(pathname: string): boolean {
  const p = pathname.replace(/\/+$/, "") || "/";
  return p in LEGAL_PAGE_LOADERS;
}

export function legalPageLoader(pathname: string): (() => Promise<LegalPageModule>) | null {
  const p = pathname.replace(/\/+$/, "") || "/";
  return LEGAL_PAGE_LOADERS[p] ?? null;
}

export const PUBLIC_LEGAL_PATHS = Object.keys(LEGAL_PAGE_LOADERS);
