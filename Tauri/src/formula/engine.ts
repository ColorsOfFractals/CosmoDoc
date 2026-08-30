import { createFunctionRegistry } from "./registry";
import type { FunctionArgument, FunctionResult } from "./functions";
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
/**
 * Invoke a production spreadsheet function through the USB-K registry.
 *
 * This establishes engine -> registry dispatch only.
 * Parser, cell, and FormulaContext integration remain separate jurisdictions.
 */
const functionRegistry = createFunctionRegistry();

export function evaluateRegisteredFunction(
  name: string,
  args: FunctionArgument[],
): FunctionResult {
  const definition = functionRegistry.get(name);

  if (!definition) {
    throw new Error(`Unknown spreadsheet function: ${name}`);
  }

  return definition.evaluate(args);
}