/**
 * Rectangular spreadsheet array vocabulary.
 *
 * Dynamic-array semantics, broadcasting, and spill behavior
 * will build on this boundary.
 */

export interface SpreadsheetMatrix<T = unknown> {
  rows: T[][];
}

export interface MatrixShape {
  rows: number;
  columns: number;
}

export function matrixShape<T>(
  matrix: SpreadsheetMatrix<T>,
): MatrixShape {
  return {
    rows: matrix.rows.length,
    columns:
      matrix.rows.length === 0
        ? 0
        : Math.max(...matrix.rows.map((row) => row.length)),
  };
}