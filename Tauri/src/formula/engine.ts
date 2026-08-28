/**
 * CosmoDoc formula-engine boundary.
 */

export type FormulaValue =
  | string
  | number
  | boolean
  | null;

export interface FormulaContext {
  getCellValue(address: string): FormulaValue;
}

export interface FormulaExpression {
  source: string;
}

export interface FormulaResult {
  value: FormulaValue;
  error?: string;
}