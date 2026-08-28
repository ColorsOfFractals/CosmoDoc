export type SpreadsheetMatrix<T = unknown> = T[][];

export interface MatrixShape {
  rows: number;
  columns: number;
}

export function matrixShape<T>(
  matrix: SpreadsheetMatrix<T>,
): MatrixShape {
  const rows = matrix.length;
  const columns = rows === 0 ? 0 : matrix[0].length;

  for (const row of matrix) {
    if (row.length !== columns) {
      throw new RangeError("Spreadsheet matrix must be rectangular.");
    }
  }

  return { rows, columns };
}

export function createMatrix<T>(
  rows: number,
  columns: number,
  factory: (row: number, column: number) => T,
): SpreadsheetMatrix<T> {
  if (
    !Number.isInteger(rows) ||
    !Number.isInteger(columns) ||
    rows < 0 ||
    columns < 0
  ) {
    throw new RangeError(
      "Matrix dimensions must be non-negative integers.",
    );
  }

  const matrix: SpreadsheetMatrix<T> = [];

  for (let row = 0; row < rows; row += 1) {
    const values: T[] = [];

    for (let column = 0; column < columns; column += 1) {
      values.push(factory(row, column));
    }

    matrix.push(values);
  }

  return matrix;
}

export function scalarMatrix<T>(value: T): SpreadsheetMatrix<T> {
  return [[value]];
}

export function mapMatrix<T, U>(
  matrix: SpreadsheetMatrix<T>,
  mapper: (value: T, row: number, column: number) => U,
): SpreadsheetMatrix<U> {
  matrixShape(matrix);

  return matrix.map((row, rowIndex) =>
    row.map((value, columnIndex) =>
      mapper(value, rowIndex, columnIndex),
    ),
  );
}

export function flattenMatrix<T>(
  matrix: SpreadsheetMatrix<T>,
): T[] {
  matrixShape(matrix);

  return matrix.reduce<T[]>(
    (all, row) => all.concat(row),
    [],
  );
}

export function transposeMatrix<T>(
  matrix: SpreadsheetMatrix<T>,
): SpreadsheetMatrix<T> {
  const shape = matrixShape(matrix);

  return createMatrix(
    shape.columns,
    shape.rows,
    (row, column) => matrix[column][row],
  );
}

export function matrixCell<T>(
  matrix: SpreadsheetMatrix<T>,
  row: number,
  column: number,
): T | undefined {
  matrixShape(matrix);

  return matrix[row]?.[column];
}