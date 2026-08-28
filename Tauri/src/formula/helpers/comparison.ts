export type ComparisonResult = -1 | 0 | 1;

function valueRank(value: unknown): number {
  if (value === null || value === undefined || value === "") {
    return 0;
  }

  if (typeof value === "number") {
    return 1;
  }

  if (typeof value === "string") {
    return 2;
  }

  if (typeof value === "boolean") {
    return 3;
  }

  return 4;
}

export function compareSpreadsheetValues(
  left: unknown,
  right: unknown,
): ComparisonResult {
  if (Object.is(left, right)) {
    return 0;
  }

  const leftRank = valueRank(left);
  const rightRank = valueRank(right);

  if (leftRank !== rightRank) {
    return leftRank < rightRank ? -1 : 1;
  }

  if (typeof left === "number" && typeof right === "number") {
    if (Number.isNaN(left) && Number.isNaN(right)) {
      return 0;
    }

    if (Number.isNaN(left)) {
      return 1;
    }

    if (Number.isNaN(right)) {
      return -1;
    }

    return left < right ? -1 : 1;
  }

  if (typeof left === "string" && typeof right === "string") {
    const comparison = left.localeCompare(
      right,
      undefined,
      { sensitivity: "base" },
    );

    if (comparison === 0) {
      return 0;
    }

    return comparison < 0 ? -1 : 1;
  }

  if (typeof left === "boolean" && typeof right === "boolean") {
    return left ? 1 : -1;
  }

  const leftText = String(left);
  const rightText = String(right);

  if (leftText === rightText) {
    return 0;
  }

  return leftText < rightText ? -1 : 1;
}

export function spreadsheetEquals(
  left: unknown,
  right: unknown,
): boolean {
  return compareSpreadsheetValues(left, right) === 0;
}

export function spreadsheetLessThan(
  left: unknown,
  right: unknown,
): boolean {
  return compareSpreadsheetValues(left, right) < 0;
}

export function spreadsheetGreaterThan(
  left: unknown,
  right: unknown,
): boolean {
  return compareSpreadsheetValues(left, right) > 0;
}

export function compareTextInsensitive(
  left: string,
  right: string,
): ComparisonResult {
  const comparison = left.localeCompare(
    right,
    undefined,
    { sensitivity: "base" },
  );

  if (comparison === 0) {
    return 0;
  }

  return comparison < 0 ? -1 : 1;
}