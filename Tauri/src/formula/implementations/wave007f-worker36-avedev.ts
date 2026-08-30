import type { FunctionDefinition } from "../functions";

function flattenNumbers(value: unknown): number[] {
  if (Array.isArray(value)) {
    return value.flatMap(flattenNumbers);
  }

  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error("AVEDEV expects finite numeric material");
  }

  return [value];
}

export const definitions: FunctionDefinition[] = [
  {
    name: "AVEDEV",
    minArgs: 1,
    maxArgs: 255,
    evaluate(args) {
      const values = args.flatMap(flattenNumbers);

      if (values.length === 0) {
        throw new Error("AVEDEV requires numeric material");
      }

      const mean =
        values.reduce((sum, value) => sum + value, 0) /
        values.length;

      return (
        values.reduce(
          (sum, value) => sum + Math.abs(value - mean),
          0,
        ) / values.length
      );
    },
  },
];