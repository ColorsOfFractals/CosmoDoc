/**
 * CosmoDoc grid-rendering boundary.
 *
 * Rendering should consume document semantics rather than
 * requiring main.ts to understand workbook internals.
 */

export interface GridRenderCell {
  row: number;
  column: number;
  text: string;
  rowSpan?: number;
  columnSpan?: number;
}

export interface GridRenderModel {
  rows: number;
  columns: number;
  cells: GridRenderCell[];
}