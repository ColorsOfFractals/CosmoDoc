export interface SpillOrigin {
  row: number;
  column: number;
}

export interface SpillShape {
  rows: number;
  columns: number;
}

export interface SpillCell extends SpillOrigin {
  sourceRow: number;
  sourceColumn: number;
}

export interface SpillPlan {
  origin: SpillOrigin;
  shape: SpillShape;
  cells: SpillCell[];
}

export type SpillOccupancyCheck = (
  row: number,
  column: number,
) => boolean;

export function validateSpillShape(
  shape: SpillShape,
): SpillShape {
  if (
    !Number.isInteger(shape.rows) ||
    !Number.isInteger(shape.columns) ||
    shape.rows < 1 ||
    shape.columns < 1
  ) {
    throw new RangeError(
      "Spill dimensions must be positive integers.",
    );
  }

  return shape;
}

export function buildSpillPlan(
  origin: SpillOrigin,
  shape: SpillShape,
): SpillPlan {
  validateSpillShape(shape);

  if (
    !Number.isInteger(origin.row) ||
    !Number.isInteger(origin.column) ||
    origin.row < 1 ||
    origin.column < 1
  ) {
    throw new RangeError(
      "Spill origin must be a valid one-based cell.",
    );
  }

  const cells: SpillCell[] = [];

  for (
    let sourceRow = 0;
    sourceRow < shape.rows;
    sourceRow += 1
  ) {
    for (
      let sourceColumn = 0;
      sourceColumn < shape.columns;
      sourceColumn += 1
    ) {
      cells.push({
        row: origin.row + sourceRow,
        column: origin.column + sourceColumn,
        sourceRow,
        sourceColumn,
      });
    }
  }

  return {
    origin,
    shape,
    cells,
  };
}

export function findSpillCollision(
  plan: SpillPlan,
  occupied: SpillOccupancyCheck,
): SpillCell | undefined {
  for (const cell of plan.cells) {
    const isOrigin =
      cell.row === plan.origin.row &&
      cell.column === plan.origin.column;

    if (!isOrigin && occupied(cell.row, cell.column)) {
      return cell;
    }
  }

  return undefined;
}

export function canSpill(
  plan: SpillPlan,
  occupied: SpillOccupancyCheck,
): boolean {
  return findSpillCollision(plan, occupied) === undefined;
}