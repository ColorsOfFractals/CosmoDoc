import { FunctionRegistry } from "./functions";
import { definitions as math002Trig } from "./implementations/math-002-trig";

/**
 * Assemble the production spreadsheet-function registry.
 *
 * Implementation modules expose FunctionDefinition[] through USB-K.
 * This layer owns assembly only; function semantics remain inside
 * their implementation modules.
 */
export function createFunctionRegistry(): FunctionRegistry {
  const registry = new FunctionRegistry();

  for (const definition of math002Trig) {
    registry.register(definition);
  }

  return registry;
}