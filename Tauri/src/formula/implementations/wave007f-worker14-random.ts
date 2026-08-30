import type { FunctionDefinition } from "../functions";

function finiteNumber(
  value: unknown,
  label: string,
): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(`${label} must be a finite number`);
  }

  return value;
}

export const definitions: FunctionDefinition[] = [
  {
    name: "RAND",
    minArgs: 0,
    maxArgs: 0,
    evaluate(args) {
      if (args.length !== 0) {
        throw new Error("RAND accepts no arguments");
      }

      return Math.random();
    },
  },
  {
    name: "RANDBETWEEN",
    minArgs: 2,
    maxArgs: 2,
    evaluate(args) {
      if (args.length !== 2) {
        throw new Error(
          "RANDBETWEEN requires bottom and top",
        );
      }

      const bottom = Math.ceil(
        finiteNumber(args[0], "RANDBETWEEN bottom"),
      );

      const top = Math.floor(
        finiteNumber(args[1], "RANDBETWEEN top"),
      );

      if (bottom > top) {
        throw new Error(
          "RANDBETWEEN bottom exceeds top",
        );
      }

      return (
        Math.floor(
          Math.random() * (top - bottom + 1),
        ) + bottom
      );
    },
  },
];