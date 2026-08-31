import { FunctionRegistry } from "./functions";
import { definitions as wave010Statistics } from "./implementations/wave010-statistics";
import { definitions as wave009TextLogical } from "./implementations/wave009-text-logical";
import { definitions as wave008MathSweep } from "./implementations/wave008-math-sweep";
import { definitions as wave007fWorker14 } from "./implementations/wave007f-worker14-random";
import { definitions as wave007fWorker38 } from "./implementations/wave007f-worker38-large";
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

  for (const definition of wave007fWorker38) {
    registry.register(definition);
  }

  for (const definition of wave007fWorker14) {
    registry.register(definition);
  }

  for (const definition of wave008MathSweep) {
    registry.register(definition);
  }

  for (const definition of wave009TextLogical) {
    registry.register(definition);
  }

  for (const definition of wave010Statistics) {
    registry.register(definition);
  }

  return registry;
}