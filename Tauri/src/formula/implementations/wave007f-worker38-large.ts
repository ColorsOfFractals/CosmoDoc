import type { FunctionDefinition } from "../functions";

function flattenNumbers(value: unknown): number[] {
  if (Array.isArray(value)) {
    return value.flatMap(flattenNumbers);
  }

  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error("LARGE expects finite numeric material");
  }

  return [value];
}

export const definitions: FunctionDefinition[] = [
  {
    name: "LARGE",
    minArgs: 2,
    maxArgs: 2,
    evaluate(args) {
      if (args.length !== 2) {
        throw new Error("LARGE requires array and k");
      }

      const values = flattenNumbers(args[0]);
      const rawK = args[1];

      if (
        typeof rawK !== "number" ||
        !Number.isFinite(rawK) ||
        !Number.isInteger(rawK)
      ) {
        throw new Error("LARGE k must be an integer");
      }

      if (rawK < 1 || rawK > values.length) {
        throw new Error("LARGE k is outside the array");
      }

      const ordered = [...values].sort(
        (left, right) => right - left,
      );

      return ordered[rawK - 1];
    },
  },
];