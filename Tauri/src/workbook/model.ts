/**
 * CosmoDoc workbook model boundary.
 *
 * This module describes document state independently from
 * ExcelJS and independently from the visual renderer.
 */

export interface CosmoCell {
  row: number;
  column: number;
  value: unknown;
  formula?: string;
}

export interface CosmoWorksheet {
  name: string;
  cells: Map<string, CosmoCell>;
}

export interface CosmoWorkbook {
  sheets: CosmoWorksheet[];
  activeSheetIndex: number;
}