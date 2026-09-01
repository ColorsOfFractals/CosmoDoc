import { FunctionRegistry } from "./functions";
import { definitions as wave019StatisticalProbability } from "./implementations/wave019-statistical-probability";
import { definitions as wave018DistributionsII } from "./implementations/wave018-distributions-ii";
import { definitions as wave017Distributions } from "./implementations/wave017-distributions";
import { definitions as wave016FinancialII } from "./implementations/wave016-financial-ii";
import { definitions as wave015Financial } from "./implementations/wave015-financial";
import { definitions as wave014DateTime } from "./implementations/wave014-date-time";
import { definitions as wave013EngineeringBase } from "./implementations/wave013-engineering-base";
import { definitions as wave012TextInfo } from "./implementations/wave012-text-info";
import { definitions as wave011MathLeftovers } from "./implementations/wave011-math-leftovers";
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

  for (const definition of wave011MathLeftovers) {
    registry.register(definition);
  }

  for (const definition of wave012TextInfo) {
    registry.register(definition);
  }

  for (const definition of wave013EngineeringBase) {
    registry.register(definition);
  }

  for (const definition of wave014DateTime) {
    registry.register(definition);
  }

  for (const definition of wave015Financial) {
    registry.register(definition);
  }

  for (const definition of wave016FinancialII) {
    registry.register(definition);
  }

  for (const definition of wave017Distributions) {
    registry.register(definition);
  }

  for (const definition of wave018DistributionsII) {
    registry.register(definition);
  }

  for (const definition of wave019StatisticalProbability) {
    registry.register(definition);
  }

  return registry;
}