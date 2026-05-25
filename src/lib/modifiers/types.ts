export type LocalizedName = Record<string, string>;

export type ModifierGroupKind = "choice" | "removal" | "extra" | "substitution";
export type SelectionMode = "single" | "multiple";
export type ProductType = "simple" | "combo";

export interface ModifierOption {
  id: string;
  groupId: string;
  name: LocalizedName;
  priceDelta: number;
  maxQty: number;
  isDefault: boolean;
  sortOrder: number;
}

export interface ModifierGroup {
  id: string;
  storeId: string;
  name: LocalizedName;
  description: LocalizedName;
  groupKind: ModifierGroupKind;
  selectionMode: SelectionMode;
  minSelect: number;
  maxSelect: number;
  isRequired: boolean;
  sortOrder: number;
  options: ModifierOption[];
  /** Ligado ao produto */
  repeatPerUnit: boolean;
  linkSortOrder: number;
}

export interface ProductModifierConfig {
  productId: string;
  productType: ProductType;
  comboUnitCount: number;
  unitLabel: LocalizedName;
  groups: ModifierGroup[];
  hasStructuredModifiers: boolean;
}

export interface ModifierSelection {
  groupId: string;
  groupName: LocalizedName;
  groupKind: ModifierGroupKind;
  optionId: string;
  optionName: LocalizedName;
  quantity: number;
  priceDelta: number;
  unitIndex?: number | null;
  unitLabel?: LocalizedName | null;
}

export interface ComboUnitConfiguration {
  unitIndex: number;
  unitLabel: LocalizedName;
  selections: ModifierSelection[];
}

export interface CartConfiguration {
  productType: ProductType;
  globalSelections: ModifierSelection[];
  comboUnits?: ComboUnitConfiguration[];
}

export type SelectionState = Map<string, Map<string, number>>;
