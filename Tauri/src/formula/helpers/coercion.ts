export interface CoercionSuccess<T> {
  ok: true;
  value: T;
}

export interface CoercionFailure {
  ok: false;
  reason: string;
}

export type CoercionResult<T> =
  | CoercionSuccess<T>
  | CoercionFailure;

function success<T>(value: T): CoercionSuccess<T> {
  return { ok: true, value };
}

function failure(reason: string): CoercionFailure {
  return { ok: false, reason };
}

export function coerceNumber(value: unknown): CoercionResult<number> {
  if (typeof value === "number") {
    return Number.isFinite(value)
      ? success(value)
      : failure("Number is not finite.");
  }

  if (value === null || value === undefined || value === "") {
    return success(0);
  }

  if (typeof value === "boolean") {
    return success(value ? 1 : 0);
  }

  if (typeof value === "string") {
    const trimmed = value.trim();

    if (trimmed === "") {
      return success(0);
    }

    const parsed = Number(trimmed);

    return Number.isFinite(parsed)
      ? success(parsed)
      : failure(`Cannot coerce "${value}" to a number.`);
  }

  return failure("Value cannot be coerced to a number.");
}

export function coerceBoolean(
  value: unknown,
): CoercionResult<boolean> {
  if (typeof value === "boolean") {
    return success(value);
  }

  if (value === null || value === undefined || value === "") {
    return success(false);
  }

  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      return failure("Number is not finite.");
    }

    return success(value !== 0);
  }

  if (typeof value === "string") {
    const normalized = value.trim().toUpperCase();

    if (normalized === "TRUE") {
      return success(true);
    }

    if (normalized === "FALSE") {
      return success(false);
    }
  }

  return failure("Value cannot be coerced to a boolean.");
}

export function coerceText(value: unknown): CoercionResult<string> {
  if (value === null || value === undefined) {
    return success("");
  }

  if (typeof value === "string") {
    return success(value);
  }

  if (typeof value === "number") {
    return Number.isFinite(value)
      ? success(String(value))
      : failure("Number is not finite.");
  }

  if (typeof value === "boolean") {
    return success(value ? "TRUE" : "FALSE");
  }

  return failure("Value cannot be coerced to text.");
}

export function requireNumber(value: unknown): number {
  const result = coerceNumber(value);

  if (!result.ok) {
    throw new TypeError(result.reason);
  }

  return result.value;
}