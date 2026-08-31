import type { FunctionDefinition } from "../functions";

function number(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new TypeError("Expected number");
  }
  return value;
}

function flatten(value: unknown): number[] {
  if (Array.isArray(value)) {
    return value.flatMap(flatten);
  }
  return [number(value)];
}

function unary(
  name: string,
  fn: (value: number) => number,
): FunctionDefinition {
  return {
    name,
    minArgs: 1,
    maxArgs: 1,
    evaluate(args) {
      return fn(number(args[0]));
    },
  };
}

function binary(
  name: string,
  fn: (a: number, b: number) => number,
): FunctionDefinition {
  return {
    name,
    minArgs: 2,
    maxArgs: 2,
    evaluate(args) {
      return fn(number(args[0]), number(args[1]));
    },
  };
}

function roundExcel(value: number, digits: number): number {
  const factor = 10 ** digits;
  return Math.sign(value) *
    Math.round(Math.abs(value) * factor + Number.EPSILON) /
    factor;
}

function factorial(value: number): number {
  const n = Math.floor(value);
  if (n < 0) throw new RangeError("Invalid argument");

  let result = 1;
  for (let i = 2; i <= n; i += 1) result *= i;
  return result;
}

export const definitions: FunctionDefinition[] = [
  unary("ABS", Math.abs),
  unary("ACOS", Math.acos),
  unary("ACOSH", Math.acosh),
  unary("ASIN", Math.asin),
  unary("ASINH", Math.asinh),
  unary("ATAN", Math.atan),
  unary("ATANH", Math.atanh),
  unary("COS", Math.cos),
  unary("COSH", Math.cosh),
  unary("EXP", Math.exp),
  unary("FACT", factorial),
  unary("INT", Math.floor),
  unary("LN", Math.log),
  unary("LOG10", Math.log10),
  unary("SIGN", Math.sign),
  unary("SIN", Math.sin),
  unary("SINH", Math.sinh),
  unary("TAN", Math.tan),
  unary("TANH", Math.tanh),

  binary("ATAN2", (x, y) => Math.atan2(y, x)),
  binary("POWER", Math.pow),

  binary("MOD", (a, b) => {
    if (b === 0) throw new RangeError("Division by zero");
    return ((a % b) + b) % b;
  }),

  binary("QUOTIENT", (a, b) => {
    if (b === 0) throw new RangeError("Division by zero");
    return Math.trunc(a / b);
  }),

  binary("LOG", (value, base) => {
    if (value <= 0 || base <= 0 || base === 1) {
      throw new RangeError("Invalid argument");
    }
    return Math.log(value) / Math.log(base);
  }),

  binary("ROUND", roundExcel),

  binary("ROUNDDOWN", (value, digits) => {
    const factor = 10 ** digits;
    return Math.trunc(value * factor) / factor;
  }),

  binary("ROUNDUP", (value, digits) => {
    const factor = 10 ** digits;
    const scaled = value * factor;
    return (
      scaled >= 0
        ? Math.ceil(scaled)
        : Math.floor(scaled)
    ) / factor;
  }),

  unary("EVEN", value => {
    if (value === 0) return 0;
    const result = Math.ceil(Math.abs(value) / 2) * 2;
    return value < 0 ? -result : result;
  }),

  unary("ODD", value => {
    if (value === 0) return 1;
    let result = Math.ceil(Math.abs(value));
    if (result % 2 === 0) result += 1;
    return value < 0 ? -result : result;
  }),

  {
    name: "TRUNC",
    minArgs: 1,
    maxArgs: 2,
    evaluate(args) {
      const value = number(args[0]);
      const digits = args.length > 1 ? number(args[1]) : 0;
      const factor = 10 ** digits;
      return Math.trunc(value * factor) / factor;
    },
  },

  {
    name: "SUM",
    minArgs: 1,
    maxArgs: 255,
    evaluate(args) {
      return args
        .flatMap(flatten)
        .reduce((sum, value) => sum + value, 0);
    },
  },

  {
    name: "SUMSQ",
    minArgs: 1,
    maxArgs: 255,
    evaluate(args) {
      return args
        .flatMap(flatten)
        .reduce((sum, value) => sum + value * value, 0);
    },
  },

  {
    name: "MAX",
    minArgs: 1,
    maxArgs: 255,
    evaluate(args) {
      return Math.max(...args.flatMap(flatten));
    },
  },

  {
    name: "MIN",
    minArgs: 1,
    maxArgs: 255,
    evaluate(args) {
      return Math.min(...args.flatMap(flatten));
    },
  },

  {
    name: "AVERAGE",
    minArgs: 1,
    maxArgs: 255,
    evaluate(args) {
      const values = args.flatMap(flatten);
      return values.reduce((a, b) => a + b, 0) / values.length;
    },
  },

  {
    name: "MEDIAN",
    minArgs: 1,
    maxArgs: 255,
    evaluate(args) {
      const values = args.flatMap(flatten).sort((a, b) => a - b);
      const mid = Math.floor(values.length / 2);

      return values.length % 2
        ? values[mid]
        : (values[mid - 1] + values[mid]) / 2;
    },
  },
];