/**
 * CosmoDoc merged-cell geometry boundary.
 */

export interface MergeGeometry {
  masterRow: number;
  masterColumn: number;
  rowSpan: number;
  columnSpan: number;
}

export interface MergeRange {
  startRow: number;
  startColumn: number;
  endRow: number;
  endColumn: number;
}

export function toMergeGeometry(range: MergeRange): MergeGeometry {
  return {
    masterRow: range.startRow,
    masterColumn: range.startColumn,
    rowSpan: range.endRow - range.startRow + 1,
    columnSpan: range.endColumn - range.startColumn + 1,
  };
}