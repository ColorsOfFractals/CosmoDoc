/**
 * Spreadsheet range geometry.
 */

export interface CellCoordinate {
  row: number;
  column: number;
}

export interface RangeBounds {
  start: CellCoordinate;
  end: CellCoordinate;
}

export function rangeHeight(range: RangeBounds): number {
  return Math.abs(range.end.row - range.start.row) + 1;
}

export function rangeWidth(range: RangeBounds): number {
  return Math.abs(range.end.column - range.start.column) + 1;
}

export function normalizeRange(range: RangeBounds): RangeBounds {
  return {
    start: {
      row: Math.min(range.start.row, range.end.row),
      column: Math.min(range.start.column, range.end.column),
    },
    end: {
      row: Math.max(range.start.row, range.end.row),
      column: Math.max(range.start.column, range.end.column),
    },
  };
}