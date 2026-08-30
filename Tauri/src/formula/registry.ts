import { FunctionRegistry } from "./functions";
import { definitions as wave007fWorker36 } from "./implementations/wave007f-worker36-avedev";
import { definitions as wave007fWorker34 } from "./implementations/wave007f-worker34-correl";
import { definitions as wave007fWorker11 } from "./implementations/wave007f-worker11-product";
import { definitions as math002Trig } from "./implementations/math-002-trig";
import { definitions as wave007dWorker19 } from "./implementations/wave-007d-worker-19";

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

  for (const definition of wave007dWorker19) {
    registry.register(definition);
  }

  for (const definition of wave007fWorker11) {
    registry.register(definition);
  }

  for (const definition of wave007fWorker34) {
    registry.register(definition);
  }

  for (const definition of wave007fWorker36) {
    registry.register(definition);
  }

  return registry;
}