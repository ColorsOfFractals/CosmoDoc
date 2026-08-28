/**
 * Spreadsheet errors are values, not JavaScript exceptions.
 */

export type SpreadsheetErrorCode =
  | "#NULL!"
  | "#DIV/0!"
  | "#VALUE!"
  | "#REF!"
  | "#NAME?"
  | "#NUM!"
  | "#N/A"
  | "#SPILL!"
  | "#CALC!";

export interface SpreadsheetErrorValue {
  kind: "error";
  code: SpreadsheetErrorCode;
  detail?: string;
}

export function spreadsheetError(
  code: SpreadsheetErrorCode,
  detail?: string,
): SpreadsheetErrorValue {
  return {
    kind: "error",
    code,
    detail,
  };
}