export type CriteriaOperator =
  | "="
  | "<>"
  | ">"
  | ">="
  | "<"
  | "<=";

export interface ParsedCriteria {
  operator: CriteriaOperator;
  operand: string;
  wildcard: boolean;
}

const criteriaPattern = /^(<=|>=|<>|=|<|>)?(.*)$/;

export function parseCriteria(criteria: unknown): ParsedCriteria {
  const source = String(criteria ?? "");
  const match = criteriaPattern.exec(source);

  if (!match) {
    return {
      operator: "=",
      operand: source,
      wildcard: false,
    };
  }

  const operator = (match[1] || "=") as CriteriaOperator;
  const operand = match[2];

  return {
    operator,
    operand,
    wildcard: /[*?]/.test(operand),
  };
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function wildcardExpression(pattern: string): RegExp {
  let expression = "";
  let escaped = false;

  for (const character of pattern) {
    if (escaped) {
      expression += escapeRegExp(character);
      escaped = false;
      continue;
    }

    if (character === "~") {
      escaped = true;
      continue;
    }

    if (character === "*") {
      expression += ".*";
      continue;
    }

    if (character === "?") {
      expression += ".";
      continue;
    }

    expression += escapeRegExp(character);
  }

  return new RegExp(`^${expression}$`, "i");
}

function compareNumbers(
  left: number,
  right: number,
  operator: CriteriaOperator,
): boolean {
  switch (operator) {
    case "=":
      return left === right;
    case "<>":
      return left !== right;
    case ">":
      return left > right;
    case ">=":
      return left >= right;
    case "<":
      return left < right;
    case "<=":
      return left <= right;
  }
}

export function matchesCriteria(
  value: unknown,
  criteria: unknown,
): boolean {
  const parsed = parseCriteria(criteria);

  if (parsed.wildcard) {
    const matched = wildcardExpression(parsed.operand).test(
      String(value ?? ""),
    );

    return parsed.operator === "<>" ? !matched : matched;
  }

  const operandNumber = Number(parsed.operand);
  const valueNumber = Number(value);

  if (
    parsed.operand.trim() !== "" &&
    Number.isFinite(operandNumber) &&
    Number.isFinite(valueNumber)
  ) {
    return compareNumbers(
      valueNumber,
      operandNumber,
      parsed.operator,
    );
  }

  const left = String(value ?? "").toLowerCase();
  const right = parsed.operand.toLowerCase();

  switch (parsed.operator) {
    case "=":
      return left === right;
    case "<>":
      return left !== right;
    case ">":
      return left > right;
    case ">=":
      return left >= right;
    case "<":
      return left < right;
    case "<=":
      return left <= right;
  }
}