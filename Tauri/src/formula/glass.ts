export interface CellAddress {
  row: number;
  column: number;
  sheet?: string;
}

export interface CellReferenceValue {
  kind: "cell-reference";
  address: CellAddress;
}

export interface RangeReferenceValue {
  kind: "range-reference";
  start: CellAddress;
  end: CellAddress;
}

export type FormulaReferenceValue =
  | CellReferenceValue
  | RangeReferenceValue;

export interface FormulaEvaluationContext {
  currentCell?: CellAddress;
  currentSheet?: string;

  resolveCell?: (
    reference: CellReferenceValue
  ) => unknown;

  resolveRange?: (
    reference: RangeReferenceValue
  ) => unknown[][];
}

export function isCellReferenceValue(
  value: unknown
): value is CellReferenceValue {
  if(typeof value !== "object" || value === null){
    return false;
  }

  const candidate=value as Partial<CellReferenceValue>;

  return (
    candidate.kind === "cell-reference" &&
    typeof candidate.address === "object" &&
    candidate.address !== null &&
    typeof candidate.address.row === "number" &&
    typeof candidate.address.column === "number"
  );
}

export function isRangeReferenceValue(
  value: unknown
): value is RangeReferenceValue {
  if(typeof value !== "object" || value === null){
    return false;
  }

  const candidate=value as Partial<RangeReferenceValue>;

  return (
    candidate.kind === "range-reference" &&
    typeof candidate.start === "object" &&
    candidate.start !== null &&
    typeof candidate.start.row === "number" &&
    typeof candidate.start.column === "number" &&
    typeof candidate.end === "object" &&
    candidate.end !== null &&
    typeof candidate.end.row === "number" &&
    typeof candidate.end.column === "number"
  );
}

export function cellReference(
  row: number,
  column: number,
  sheet?: string
): CellReferenceValue {
  return {
    kind: "cell-reference",
    address: {
      row,
      column,
      ...(sheet === undefined ? {} : { sheet })
    }
  };
}

export function rangeReference(
  start: CellAddress,
  end: CellAddress
): RangeReferenceValue {
  return {
    kind: "range-reference",
    start,
    end
  };
}