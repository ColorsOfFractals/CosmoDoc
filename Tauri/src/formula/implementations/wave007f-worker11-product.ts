import type { FunctionDefinition } from "../functions";

function flattenNumbers(value: unknown): number[] {
  if (Array.isArray(value)) {
    return value.flatMap(flattenNumbers);
  }

  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error("PRODUCT expects finite numeric material");
  }

  return [value];
}

export const definitions: FunctionDefinition[] = [
  {
    name: "PRODUCT",
    minArgs: 1,
    maxArgs: 255,
    evaluate(args) {
      const values = args.flatMap(flattenNumbers);

      if (values.length === 0) {
        throw new Error("PRODUCT requires numeric material");
      }

      return values.reduce(
        (product, value) => product * value,
        1,
      );
    },
  },
];