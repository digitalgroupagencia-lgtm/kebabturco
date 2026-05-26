export type TableQrLang = "pt" | "en" | "es" | "fr";

export type TableQrBranding = {
  restaurantName: string;
  logoUrl?: string | null;
  primaryLang: TableQrLang;
};

export const TABLE_QR_LABELS: Record<
  TableQrLang,
  { tableWord: string; scanHint: string; poweredBy?: string }
> = {
  es: {
    tableWord: "MESA",
    scanHint: "Escanea para pedir",
  },
  en: {
    tableWord: "TABLE",
    scanHint: "Scan to order",
  },
  pt: {
    tableWord: "MESA",
    scanHint: "Escaneie para pedir",
  },
  fr: {
    tableWord: "TABLE",
    scanHint: "Scannez pour commander",
  },
};

export function normalizeTableQrLang(value: string | null | undefined): TableQrLang {
  if (value === "pt" || value === "en" || value === "es" || value === "fr") return value;
  return "es";
}
