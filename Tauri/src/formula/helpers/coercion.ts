/**
 * Spreadsheet coercion vocabulary.
 *
 * Exact Excel compatibility rules will be hydrated here
 * rather than duplicated across individual functions.
 */

export type CoercionTarget =
  | "number"
  | "text"
  | "boolean";

export interface CoercionResult<T> {
  ok: boolean;
  value?: T;
  reason?: string;
}

export interface CoercionPolicy {
  allowBlank: boolean;
  allowNumericText: boolean;
  allowBoolean: boolean;
}