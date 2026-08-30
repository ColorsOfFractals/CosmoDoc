import type {
  FunctionDefinition,
  FunctionArgument,
} from "../functions";

function requireNumber(
  args: FunctionArgument[],
  name: string,
): number {
  if (args.length !== 1) {
    throw new RangeError(
      name + " expects exactly 1 argument",
    );
  }

  const value = args[0];

  if (
    typeof value !== "number" ||
    !Number.isFinite(value)
  ) {
    throw new TypeError(
      name + " expects a finite number",
    );
  }

  return value;
}

export const definitions: FunctionDefinition[] = [
  {
    name: "DEGREES",
    minArgs: 1,
    maxArgs: 1,
    evaluate(args) {
      const radians =
        requireNumber(args, "DEGREES");

      return radians * (180 / Math.PI);
    },
  },

  {
    name: "PI",
    minArgs: 0,
    maxArgs: 0,
    evaluate(args) {
      if (args.length !== 0) {
        throw new RangeError(
          "PI expects exactly 0 arguments",
        );
      }

      return Math.PI;
    },
  },

  {
    name: "RADIANS",
    minArgs: 1,
    maxArgs: 1,
    evaluate(args) {
      const degrees =
        requireNumber(args, "RADIANS");

      return degrees * (Math.PI / 180);
    },
  },
];