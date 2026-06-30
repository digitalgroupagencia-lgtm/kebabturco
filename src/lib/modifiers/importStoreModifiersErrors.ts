export type ImportModifiersErrorCode =
  | "HAS_GROUPS"
  | "NO_PRODUCTS"
  | "NO_CUSTOMIZATIONS";

export class ImportModifiersError extends Error {
  readonly code: ImportModifiersErrorCode;

  constructor(code: ImportModifiersErrorCode) {
    super(code);
    this.name = "ImportModifiersError";
    this.code = code;
  }
}

export function isImportModifiersError(err: unknown): err is ImportModifiersError {
  return err instanceof ImportModifiersError;
}
