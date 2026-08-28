export type ExcelDateSystem =
  | "1900"
  | "1904";

export interface ExcelDateParts {
  year: number;
  month: number;
  day: number;
  fraction: number;
  phantom1900LeapDay: boolean;
}

const millisecondsPerDay = 86_400_000;

function utcDayNumber(
  year: number,
  month: number,
  day: number,
): number {
  return Math.floor(
    Date.UTC(year, month - 1, day) /
      millisecondsPerDay,
  );
}

export function excelSerialToDateParts(
  serial: number,
  system: ExcelDateSystem = "1900",
): ExcelDateParts {
  if (!Number.isFinite(serial)) {
    throw new TypeError("Excel serial must be finite.");
  }

  const whole = Math.floor(serial);
  const fraction = serial - whole;

  if (system === "1900" && whole === 60) {
    return {
      year: 1900,
      month: 2,
      day: 29,
      fraction,
      phantom1900LeapDay: true,
    };
  }

  const epoch =
    system === "1904"
      ? utcDayNumber(1904, 1, 1)
      : utcDayNumber(1899, 12, 31);

  let adjusted = whole;

  if (system === "1900" && whole > 60) {
    adjusted -= 1;
  }

  const date = new Date(
    (epoch + adjusted) * millisecondsPerDay,
  );

  return {
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1,
    day: date.getUTCDate(),
    fraction,
    phantom1900LeapDay: false,
  };
}

export function datePartsToExcelSerial(
  year: number,
  month: number,
  day: number,
  system: ExcelDateSystem = "1900",
): number {
  if (
    system === "1900" &&
    year === 1900 &&
    month === 2 &&
    day === 29
  ) {
    return 60;
  }

  const dayNumber = utcDayNumber(year, month, day);

  const epoch =
    system === "1904"
      ? utcDayNumber(1904, 1, 1)
      : utcDayNumber(1899, 12, 31);

  let serial = dayNumber - epoch;

  if (
    system === "1900" &&
    dayNumber >= utcDayNumber(1900, 3, 1)
  ) {
    serial += 1;
  }

  return serial;
}

export function excelTimeFraction(
  hour: number,
  minute: number,
  second: number,
  millisecond = 0,
): number {
  const totalMilliseconds =
    hour * 3_600_000 +
    minute * 60_000 +
    second * 1_000 +
    millisecond;

  return totalMilliseconds / millisecondsPerDay;
}

export function daysBetweenSerials(
  start: number,
  end: number,
): number {
  return end - start;
}