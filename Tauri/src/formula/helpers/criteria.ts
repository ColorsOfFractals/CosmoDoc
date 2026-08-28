/**
 * Shared criteria vocabulary for COUNTIF, SUMIF,
 * AVERAGEIF, database functions, and related families.
 */

export type CriteriaOperator =
  | "="
  | "<>"
  | ">"
  | ">="
  | "<"
  | "<=";

export interface ParsedCriterion {
  operator: CriteriaOperator;
  operand: unknown;
  wildcard: boolean;
}

export interface CriteriaMatcher {
  matches(value: unknown, criterion: ParsedCriterion): boolean;
}