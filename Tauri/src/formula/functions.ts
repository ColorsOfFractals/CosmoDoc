/**
 * CosmoDoc function-registry boundary.
 *
 * Hundreds of spreadsheet functions should populate this
 * registry rather than becoming hundreds of architectures.
 */

export type FunctionArgument = unknown;
export type FunctionResult = unknown;

export type CosmoFunction =
  (args: FunctionArgument[]) => FunctionResult;

export interface FunctionDefinition {
  name: string;
  minArgs: number;
  maxArgs?: number;
  evaluate: CosmoFunction;
}

export class FunctionRegistry {
  private readonly functions =
    new Map<string, FunctionDefinition>();

  register(definition: FunctionDefinition): void {
    this.functions.set(
      definition.name.toUpperCase(),
      definition,
    );
  }

  get(name: string): FunctionDefinition | undefined {
    return this.functions.get(name.toUpperCase());
  }
}