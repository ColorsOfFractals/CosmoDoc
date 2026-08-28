export interface FormulaCellAddress {
  row: number;
  column: number;
}

export interface FormulaCellLocation extends FormulaCellAddress {
  sheet: string;
}

export interface FormulaWorkbookContext {
  activeSheet: string;

  getCell(
    location: FormulaCellLocation,
  ): unknown;

  hasSheet(
    sheet: string,
  ): boolean;

  resolveSheetName?(
    requested: string,
  ): string | undefined;
}

export function assertCellAddress(
  address: FormulaCellAddress,
): FormulaCellAddress {
  if (
    !Number.isInteger(address.row) ||
    !Number.isInteger(address.column) ||
    address.row < 1 ||
    address.column < 1
  ) {
    throw new RangeError(
      "Spreadsheet addresses are one-based positive integers.",
    );
  }

  return address;
}

export function normalizeSheetName(name: string): string {
  const trimmed = name.trim();

  if (
    trimmed.startsWith("'") &&
    trimmed.endsWith("'") &&
    trimmed.length >= 2
  ) {
    return trimmed
      .slice(1, -1)
      .replace(/''/g, "'");
  }

  return trimmed;
}

export function formulaCellKey(
  location: FormulaCellLocation,
): string {
  assertCellAddress(location);

  return `${normalizeSheetName(location.sheet)}!${location.row}:${location.column}`;
}

export function resolveFormulaCell(
  context: FormulaWorkbookContext,
  sheet: string | undefined,
  address: FormulaCellAddress,
): unknown {
  assertCellAddress(address);

  const requestedSheet = normalizeSheetName(
    sheet ?? context.activeSheet,
  );

  const resolvedSheet =
    context.resolveSheetName?.(requestedSheet) ??
    requestedSheet;

  if (!context.hasSheet(resolvedSheet)) {
    return undefined;
  }

  return context.getCell({
    sheet: resolvedSheet,
    row: address.row,
    column: address.column,
  });
}

export function sameFormulaLocation(
  left: FormulaCellLocation,
  right: FormulaCellLocation,
): boolean {
  return (
    normalizeSheetName(left.sheet).toLowerCase() ===
      normalizeSheetName(right.sheet).toLowerCase() &&
    left.row === right.row &&
    left.column === right.column
  );
}