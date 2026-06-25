import type { ModifierGroupKind } from "./types";

export const GROUP_KIND_META: Record<
  ModifierGroupKind,
  {
    labelPt: string;
    labelEs: string;
    adminHintPt: string;
    customerBadgePt: string;
  }
> = {
  choice: {
    labelPt: "Escolha obrigatória",
    labelEs: "Elección obligatoria",
    adminHintPt: "Carne, bebida do menu, pizza do combo, o cliente escolhe uma opção.",
    customerBadgePt: "Obrigatório",
  },
  substitution: {
    labelPt: "Substituição",
    labelEs: "Sustitución",
    adminHintPt: "Patatas fritas / bravas / deluxe, só uma opção, não é extra.",
    customerBadgePt: "Escolhe 1",
  },
  removal: {
    labelPt: "Remover ingrediente",
    labelEs: "Quitar ingrediente",
    adminHintPt: "Cebola, tomate, molho, toque para retirar, sem custo.",
    customerBadgePt: "Personalizar",
  },
  extra: {
    labelPt: "Extra adicionável",
    labelEs: "Extra añadible",
    adminHintPt: "Queijo extra, carne extra, quantidade com + e −.",
    customerBadgePt: "Extra",
  },
};

export function groupKindLabel(kind: ModifierGroupKind | string, lang: "pt" | "es" = "pt"): string {
  const meta = GROUP_KIND_META[kind as ModifierGroupKind];
  if (!meta) return String(kind);
  return lang === "es" ? meta.labelEs : meta.labelPt;
}

export function normalizeGroupKindSettings(kind: ModifierGroupKind, isRequired: boolean) {
  switch (kind) {
    case "substitution":
      return { selection_mode: "single" as const, min_select: isRequired ? 1 : 0, max_select: 1 };
    case "extra":
      return { selection_mode: "multiple" as const, min_select: 0, max_select: 99 };
    case "removal":
      return { selection_mode: "multiple" as const, min_select: 0, max_select: 99 };
    default:
      return null;
  }
}
