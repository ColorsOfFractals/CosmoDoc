export interface ComplexNumber {
  real: number;
  imaginary: number;
}

export function complex(
  real: number,
  imaginary = 0,
): ComplexNumber {
  if (
    !Number.isFinite(real) ||
    !Number.isFinite(imaginary)
  ) {
    throw new TypeError(
      "Complex components must be finite numbers.",
    );
  }

  return { real, imaginary };
}

export function addComplex(
  left: ComplexNumber,
  right: ComplexNumber,
): ComplexNumber {
  return complex(
    left.real + right.real,
    left.imaginary + right.imaginary,
  );
}

export function subtractComplex(
  left: ComplexNumber,
  right: ComplexNumber,
): ComplexNumber {
  return complex(
    left.real - right.real,
    left.imaginary - right.imaginary,
  );
}

export function multiplyComplex(
  left: ComplexNumber,
  right: ComplexNumber,
): ComplexNumber {
  return complex(
    left.real * right.real -
      left.imaginary * right.imaginary,
    left.real * right.imaginary +
      left.imaginary * right.real,
  );
}

export function divideComplex(
  left: ComplexNumber,
  right: ComplexNumber,
): ComplexNumber {
  const denominator =
    right.real * right.real +
    right.imaginary * right.imaginary;

  if (denominator === 0) {
    throw new RangeError(
      "Cannot divide by complex zero.",
    );
  }

  return complex(
    (
      left.real * right.real +
      left.imaginary * right.imaginary
    ) / denominator,
    (
      left.imaginary * right.real -
      left.real * right.imaginary
    ) / denominator,
  );
}

export function complexMagnitude(
  value: ComplexNumber,
): number {
  return Math.hypot(
    value.real,
    value.imaginary,
  );
}

export function complexArgument(
  value: ComplexNumber,
): number {
  return Math.atan2(
    value.imaginary,
    value.real,
  );
}

export function complexConjugate(
  value: ComplexNumber,
): ComplexNumber {
  return complex(
    value.real,
    -value.imaginary,
  );
}

export function formatComplex(
  value: ComplexNumber,
  suffix: "i" | "j" = "i",
): string {
  if (value.imaginary === 0) {
    return String(value.real);
  }

  if (value.real === 0) {
    return `${value.imaginary}${suffix}`;
  }

  const sign =
    value.imaginary < 0
      ? "-"
      : "+";

  return `${value.real}${sign}${Math.abs(value.imaginary)}${suffix}`;
}

export function parseComplex(
  source: string,
): ComplexNumber | undefined {
  const normalized = source
    .trim()
    .replace(/\s+/g, "")
    .replace(/j$/i, "i");

  if (normalized === "") {
    return undefined;
  }

  if (!normalized.endsWith("i")) {
    const real = Number(normalized);

    return Number.isFinite(real)
      ? complex(real, 0)
      : undefined;
  }

  const body = normalized.slice(0, -1);

  if (body === "" || body === "+") {
    return complex(0, 1);
  }

  if (body === "-") {
    return complex(0, -1);
  }

  let splitIndex = -1;

  for (let index = 1; index < body.length; index += 1) {
    if (
      body[index] === "+" ||
      body[index] === "-"
    ) {
      splitIndex = index;
    }
  }

  if (splitIndex < 0) {
    const imaginary = Number(body);

    return Number.isFinite(imaginary)
      ? complex(0, imaginary)
      : undefined;
  }

  const real = Number(
    body.slice(0, splitIndex),
  );

  const imaginary = Number(
    body.slice(splitIndex),
  );

  if (
    !Number.isFinite(real) ||
    !Number.isFinite(imaginary)
  ) {
    return undefined;
  }

  return complex(real, imaginary);
}