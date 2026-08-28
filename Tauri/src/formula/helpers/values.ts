/**
 * Spreadsheet value vocabulary.
 *
 * This is intentionally independent from the evaluator,
 * function registry, renderer, and ExcelJS.
 */

export type SpreadsheetScalar =
  | number
  | string
  | boolean
  | null;

export interface SpreadsheetReference {
  sheet?: string;
  row: number;
  column: number;
}

export type SpreadsheetValueKind =
  | "scalar"
  | "reference"
  | "array"
  | "error";