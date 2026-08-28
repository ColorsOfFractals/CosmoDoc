export interface NumericalSolveOptions {
  tolerance?: number;
  maxIterations?: number;
}

export interface NumericalSolveResult {
  converged: boolean;
  value: number;
  iterations: number;
  residual: number;
}

function optionsWithDefaults(
  options: NumericalSolveOptions = {},
): Required<NumericalSolveOptions> {
  return {
    tolerance: options.tolerance ?? 1e-10,
    maxIterations: options.maxIterations ?? 100,
  };
}

export function solveBisection(
  fn: (value: number) => number,
  lower: number,
  upper: number,
  options: NumericalSolveOptions = {},
): NumericalSolveResult {
  const config = optionsWithDefaults(options);

  let left = lower;
  let right = upper;
  let leftValue = fn(left);
  let rightValue = fn(right);

  if (
    !Number.isFinite(leftValue) ||
    !Number.isFinite(rightValue)
  ) {
    throw new RangeError(
      "Bisection endpoints must produce finite values.",
    );
  }

  if (leftValue === 0) {
    return {
      converged: true,
      value: left,
      iterations: 0,
      residual: 0,
    };
  }

  if (rightValue === 0) {
    return {
      converged: true,
      value: right,
      iterations: 0,
      residual: 0,
    };
  }

  if (Math.sign(leftValue) === Math.sign(rightValue)) {
    throw new RangeError(
      "Bisection interval must bracket a root.",
    );
  }

  let midpoint = (left + right) / 2;
  let midpointValue = fn(midpoint);

  for (
    let iteration = 1;
    iteration <= config.maxIterations;
    iteration += 1
  ) {
    midpoint = (left + right) / 2;
    midpointValue = fn(midpoint);

    if (
      Math.abs(midpointValue) <= config.tolerance ||
      Math.abs(right - left) <= config.tolerance
    ) {
      return {
        converged: true,
        value: midpoint,
        iterations: iteration,
        residual: Math.abs(midpointValue),
      };
    }

    if (Math.sign(midpointValue) === Math.sign(leftValue)) {
      left = midpoint;
      leftValue = midpointValue;
    } else {
      right = midpoint;
      rightValue = midpointValue;
    }
  }

  return {
    converged: false,
    value: midpoint,
    iterations: config.maxIterations,
    residual: Math.abs(midpointValue),
  };
}

export function solveNewton(
  fn: (value: number) => number,
  derivative: (value: number) => number,
  initial: number,
  options: NumericalSolveOptions = {},
): NumericalSolveResult {
  const config = optionsWithDefaults(options);
  let value = initial;

  for (
    let iteration = 1;
    iteration <= config.maxIterations;
    iteration += 1
  ) {
    const residual = fn(value);

    if (Math.abs(residual) <= config.tolerance) {
      return {
        converged: true,
        value,
        iterations: iteration,
        residual: Math.abs(residual),
      };
    }

    const slope = derivative(value);

    if (!Number.isFinite(slope) || slope === 0) {
      return {
        converged: false,
        value,
        iterations: iteration,
        residual: Math.abs(residual),
      };
    }

    const next = value - residual / slope;

    if (!Number.isFinite(next)) {
      return {
        converged: false,
        value,
        iterations: iteration,
        residual: Math.abs(residual),
      };
    }

    value = next;
  }

  const residual = fn(value);

  return {
    converged: false,
    value,
    iterations: config.maxIterations,
    residual: Math.abs(residual),
  };
}