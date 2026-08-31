import type { FunctionDefinition } from "../functions";

function text(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "boolean") return value ? "TRUE" : "FALSE";
  return String(value);
}

function number(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;

  if (typeof value === "string" && value.trim() !== "") {
    const n = Number(value);
    if (Number.isFinite(n)) return n;
  }

  throw new TypeError("Expected number");
}

function bool(value: unknown): boolean {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value !== 0;

  if (typeof value === "string") {
    const v = value.trim().toUpperCase();
    if (v === "TRUE") return true;
    if (v === "FALSE") return false;
  }

  return Boolean(value);
}

function flatten(values: unknown[]): unknown[] {
  return values.flatMap(value =>
    Array.isArray(value) ? flatten(value) : [value]
  );
}

function def(
  name: string,
  minArgs: number,
  maxArgs: number,
  evaluate: (args: unknown[]) => unknown,
): FunctionDefinition {
  return { name, minArgs, maxArgs, evaluate };
}

export const definitions: FunctionDefinition[] = [

  // ----------------------------------------------------------
  // TEXT
  // ----------------------------------------------------------

  def("CHAR", 1, 1, args =>
    String.fromCharCode(Math.trunc(number(args[0])))
  ),

  def("CODE", 1, 1, args => {
    const s = text(args[0]);
    return s.length ? s.charCodeAt(0) : 0;
  }),

  def("UNICHAR", 1, 1, args =>
    String.fromCodePoint(Math.trunc(number(args[0])))
  ),

  def("UNICODE", 1, 1, args => {
    const s = text(args[0]);
    return s.length ? (s.codePointAt(0) ?? 0) : 0;
  }),

  def("LOWER", 1, 1, args =>
    text(args[0]).toLowerCase()
  ),

  def("UPPER", 1, 1, args =>
    text(args[0]).toUpperCase()
  ),

  def("LEN", 1, 1, args =>
    text(args[0]).length
  ),

  def("LEFT", 1, 2, args => {
    const s = text(args[0]);
    const count = args.length > 1
      ? Math.max(0, Math.trunc(number(args[1])))
      : 1;

    return s.slice(0, count);
  }),

  def("RIGHT", 1, 2, args => {
    const s = text(args[0]);
    const count = args.length > 1
      ? Math.max(0, Math.trunc(number(args[1])))
      : 1;

    return count === 0 ? "" : s.slice(-count);
  }),

  def("MID", 3, 3, args => {
    const s = text(args[0]);
    const start = Math.max(1, Math.trunc(number(args[1])));
    const count = Math.max(0, Math.trunc(number(args[2])));

    return s.substr(start - 1, count);
  }),

  def("REPT", 2, 2, args =>
    text(args[0]).repeat(
      Math.max(0, Math.trunc(number(args[1])))
    )
  ),

  def("TRIM", 1, 1, args =>
    text(args[0]).trim().replace(/ +/g, " ")
  ),

  def("CLEAN", 1, 1, args =>
    text(args[0]).replace(/[\x00-\x1F]/g, "")
  ),

  def("EXACT", 2, 2, args =>
    text(args[0]) === text(args[1])
  ),

  def("CONCATENATE", 1, 255, args =>
    flatten(args).map(text).join("")
  ),

  def("CONCAT", 1, 255, args =>
    flatten(args).map(text).join("")
  ),

  def("REPLACE", 4, 4, args => {
    const original = text(args[0]);
    const start = Math.max(1, Math.trunc(number(args[1]))) - 1;
    const count = Math.max(0, Math.trunc(number(args[2])));
    const replacement = text(args[3]);

    return (
      original.slice(0, start) +
      replacement +
      original.slice(start + count)
    );
  }),

  def("SUBSTITUTE", 3, 4, args => {
    const source = text(args[0]);
    const oldText = text(args[1]);
    const newText = text(args[2]);

    if (args.length < 4) {
      return source.split(oldText).join(newText);
    }

    const target = Math.trunc(number(args[3]));
    if (target < 1) return source;

    let occurrence = 0;
    let cursor = 0;
    let result = "";

    while (true) {
      const found = source.indexOf(oldText, cursor);

      if (found < 0) {
        result += source.slice(cursor);
        break;
      }

      occurrence++;
      result += source.slice(cursor, found);

      if (occurrence === target) {
        result += newText;
      } else {
        result += oldText;
      }

      cursor = found + oldText.length;
    }

    return result;
  }),

  def("FIND", 2, 3, args => {
    const needle = text(args[0]);
    const haystack = text(args[1]);
    const start = args.length > 2
      ? Math.max(1, Math.trunc(number(args[2])))
      : 1;

    const index = haystack.indexOf(needle, start - 1);

    if (index < 0) throw new RangeError("Not found");
    return index + 1;
  }),

  def("SEARCH", 2, 3, args => {
    const needle = text(args[0]).toLowerCase();
    const haystack = text(args[1]).toLowerCase();
    const start = args.length > 2
      ? Math.max(1, Math.trunc(number(args[2])))
      : 1;

    const index = haystack.indexOf(needle, start - 1);

    if (index < 0) throw new RangeError("Not found");
    return index + 1;
  }),

  def("T", 1, 1, args =>
    typeof args[0] === "string" ? args[0] : ""
  ),

  def("N", 1, 1, args => {
    if (typeof args[0] === "number") return args[0];
    if (typeof args[0] === "boolean") return args[0] ? 1 : 0;
    return 0;
  }),

  def("VALUE", 1, 1, args => {
    const cleaned = text(args[0])
      .trim()
      .replace(/,/g, "")
      .replace(/^\$/, "");

    const n = Number(cleaned);

    if (!Number.isFinite(n)) {
      throw new TypeError("Expected numeric text");
    }

    return n;
  }),

  // ----------------------------------------------------------
  // LOGICAL
  // ----------------------------------------------------------

  def("TRUE", 0, 0, () => true),
  def("FALSE", 0, 0, () => false),

  def("NOT", 1, 1, args =>
    !bool(args[0])
  ),

  def("AND", 1, 255, args =>
    flatten(args).every(bool)
  ),

  def("OR", 1, 255, args =>
    flatten(args).some(bool)
  ),

  def("XOR", 1, 255, args =>
    flatten(args).filter(bool).length % 2 === 1
  ),

  def("IF", 2, 3, args =>
    bool(args[0])
      ? args[1]
      : (args.length > 2 ? args[2] : false)
  ),

  def("IFERROR", 2, 2, args =>
    args[0] instanceof Error ? args[1] : args[0]
  ),

  def("IFNA", 2, 2, args => {
    const value = args[0];

    if (
      value instanceof Error &&
      /N\/A|NA/i.test(value.message)
    ) {
      return args[1];
    }

    return value;
  }),

  // ----------------------------------------------------------
  // SIMPLE INFORMATION
  // ----------------------------------------------------------

  def("ISBLANK", 1, 1, args =>
    args[0] === null || args[0] === undefined
  ),

  def("ISEVEN", 1, 1, args =>
    Math.trunc(number(args[0])) % 2 === 0
  ),

  def("ISODD", 1, 1, args =>
    Math.abs(Math.trunc(number(args[0])) % 2) === 1
  ),

  def("ISLOGICAL", 1, 1, args =>
    typeof args[0] === "boolean"
  ),

  def("ISNUMBER", 1, 1, args =>
    typeof args[0] === "number" &&
    Number.isFinite(args[0])
  ),

  def("ISTEXT", 1, 1, args =>
    typeof args[0] === "string"
  ),

  def("ISNONTEXT", 1, 1, args =>
    typeof args[0] !== "string"
  ),

  def("TYPE", 1, 1, args => {
    const value = args[0];

    if (typeof value === "number") return 1;
    if (typeof value === "string") return 2;
    if (typeof value === "boolean") return 4;
    if (value instanceof Error) return 16;
    if (Array.isArray(value)) return 64;

    return 1;
  }),
];