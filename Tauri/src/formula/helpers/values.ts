import type { SpreadsheetErrorCode, SpreadsheetErrorValue } from "./errors";

export type SpreadsheetScalar =
  | string
  | number
  | boolean
  | null
  | undefined;

export interface CellReferenceValue {
  kind: "reference";
  sheet?: string;
  row: number;
  column: number;
}


export type SpreadsheetValue =
  | SpreadsheetScalar
  | CellReferenceValue
  | SpreadsheetErrorValue
  | SpreadsheetValue[];

export function isBlankValue(value: unknown): boolean {
  return value === null || value === undefined || value === "";
}

export function isFiniteSpreadsheetNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

export function isCellReferenceValue(
  value: unknown,
): value is CellReferenceValue {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const candidate = value as Partial<CellReferenceValue>;

  return (
    candidate.kind === "reference" &&
    Number.isInteger(candidate.row) &&
    Number.isInteger(candidate.column) &&
    (candidate.row ?? 0) > 0 &&
    (candidate.column ?? 0) > 0
  );
}

export function isSpreadsheetErrorValue(
  value: unknown,
): value is SpreadsheetErrorValue {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const candidate = value as Partial<SpreadsheetErrorValue>;

  return (
    candidate.kind === "error" &&
    typeof candidate.code === "string" &&
    candidate.code.length > 0
  );
}

export function makeSpreadsheetError(
  code: SpreadsheetErrorCode,
): SpreadsheetErrorValue {
  return {
    kind: "error",
    code,
  };
}

export function scalarDisplayText(value: SpreadsheetScalar): string {
  if (value === null || value === undefined) {
    return "";
  }

  if (typeof value === "boolean") {
    return value ? "TRUE" : "FALSE";
  }

  return String(value);
}