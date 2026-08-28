/**
 * Shared comparison vocabulary.
 *
 * Exact spreadsheet comparison and lookup ordering rules
 * should live here instead of inside individual functions.
 */

export type ComparisonResult = -1 | 0 | 1;

export type ComparisonMode =
  | "exact"
  | "approximate"
  | "case-sensitive";

export interface SpreadsheetComparator {
  compare(
    left: unknown,
    right: unknown,
    mode?: ComparisonMode,
  ): ComparisonResult;
}