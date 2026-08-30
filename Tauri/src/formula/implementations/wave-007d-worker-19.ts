import type {
  FunctionArgument,
  FunctionDefinition,
} from "../functions";

function requireExactlyOne(
  args: FunctionArgument[],
  name: string,
): number {
  if (args.length !== 1) {
    throw new TypeError(
      name +
        " expects exactly 1 argument; received " +
        String(args.length),
    );
  }

  const value = args[0];

  if (
    typeof value !== "number" ||
    !Number.isFinite(value)
  ) {
    throw new TypeError(
      name +
        " argument 1 must be a finite number",
    );
  }

  return value;
}

function sqrtExcel(
  value: number,
  name: string,
): number {
  if (value < 0) {
    throw new RangeError(
      name + " requires a non-negative number",
    );
  }

  return Math.sqrt(value);
}

export const definitions: FunctionDefinition[] = [
  {
    name: "SQRT",
    minArgs: 1,
    maxArgs: 1,
    evaluate: (args) => {
      const value =
        requireExactlyOne(
          args,
          "SQRT",
        );

      return sqrtExcel(
        value,
        "SQRT",
      );
    },
  },
  {
    name: "SQRTPI",
    minArgs: 1,
    maxArgs: 1,
    evaluate: (args) => {
      const value =
        requireExactlyOne(
          args,
          "SQRTPI",
        );

      return sqrtExcel(
        value * Math.PI,
        "SQRTPI",
      );
    },
  },
];