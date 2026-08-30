import type { FunctionDefinition } from "../functions";

function numbers(value: unknown): number[] {
  if (!Array.isArray(value)) {
    throw new Error("CORREL expects arrays");
  }

  const result: number[] = [];

  for (const item of value) {
    if (Array.isArray(item)) {
      result.push(...numbers(item));
      continue;
    }

    if (typeof item !== "number" || !Number.isFinite(item)) {
      throw new Error("CORREL expects finite numeric arrays");
    }

    result.push(item);
  }

  return result;
}

export const definitions: FunctionDefinition[] = [
  {
    name: "CORREL",
    minArgs: 2,
    maxArgs: 2,
    evaluate(args) {
      if (args.length !== 2) {
        throw new Error("CORREL requires exactly two arrays");
      }

      const left = numbers(args[0]);
      const right = numbers(args[1]);

      if (left.length !== right.length) {
        throw new Error("CORREL arrays must have equal length");
      }

      if (left.length < 2) {
        throw new Error("CORREL requires at least two pairs");
      }

      const leftMean =
        left.reduce((sum, value) => sum + value, 0) /
        left.length;

      const rightMean =
        right.reduce((sum, value) => sum + value, 0) /
        right.length;

      let numerator = 0;
      let leftSquares = 0;
      let rightSquares = 0;

      for (let index = 0; index < left.length; index += 1) {
        const x = left[index] - leftMean;
        const y = right[index] - rightMean;

        numerator += x * y;
        leftSquares += x * x;
        rightSquares += y * y;
      }

      const denominator =
        Math.sqrt(leftSquares * rightSquares);

      if (denominator === 0) {
        throw new Error(
          "CORREL is undefined for zero variance",
        );
      }

      return numerator / denominator;
    },
  },
];