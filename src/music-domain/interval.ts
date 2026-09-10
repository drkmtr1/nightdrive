import { createMidiPitch, type MidiPitch } from "./pitch";

const intervalBrand: unique symbol = Symbol("Interval");

export type Interval = number & { readonly [intervalBrand]: true };

export const INTERVAL_ERROR_CODES = {
  arithmeticOverflow: "ARITHMETIC_OVERFLOW",
  notFinite: "NOT_FINITE",
  notInteger: "NOT_INTEGER",
  unsafeInteger: "UNSAFE_INTEGER",
} as const;

export type IntervalErrorCode = (typeof INTERVAL_ERROR_CODES)[keyof typeof INTERVAL_ERROR_CODES];

export class IntervalValueError extends RangeError {
  readonly code: IntervalErrorCode;
  readonly field: string;

  constructor(code: IntervalErrorCode, field: string, message: string) {
    super(message);
    this.name = "IntervalValueError";
    this.code = code;
    this.field = field;
  }
}

function requireSafeInteger(value: number, field: string): void {
  if (!Number.isFinite(value)) {
    throw new IntervalValueError(INTERVAL_ERROR_CODES.notFinite, field, `${field} must be finite.`);
  }
  if (!Number.isInteger(value)) {
    throw new IntervalValueError(
      INTERVAL_ERROR_CODES.notInteger,
      field,
      `${field} must be an integer.`,
    );
  }
  if (!Number.isSafeInteger(value)) {
    throw new IntervalValueError(
      INTERVAL_ERROR_CODES.unsafeInteger,
      field,
      `${field} must be a safe integer.`,
    );
  }
}

function checkedArithmetic(value: number, field: string): number {
  if (!Number.isSafeInteger(value)) {
    throw new IntervalValueError(
      INTERVAL_ERROR_CODES.arithmeticOverflow,
      field,
      `${field} exceeds the safe integer range.`,
    );
  }
  return value;
}

export function createInterval(semitones: number): Interval {
  requireSafeInteger(semitones, "interval.semitones");
  return (semitones === 0 ? 0 : semitones) as Interval;
}

export function intervalsEqual(left: Interval, right: Interval): boolean {
  return createInterval(left) === createInterval(right);
}

export function compareIntervals(left: Interval, right: Interval): -1 | 0 | 1 {
  const validatedLeft = createInterval(left);
  const validatedRight = createInterval(right);
  return validatedLeft < validatedRight ? -1 : validatedLeft > validatedRight ? 1 : 0;
}

export function negateInterval(interval: Interval): Interval {
  return createInterval(-createInterval(interval));
}

export function addIntervals(left: Interval, right: Interval): Interval {
  return createInterval(
    checkedArithmetic(createInterval(left) + createInterval(right), "interval.semitones"),
  );
}

export function subtractIntervals(left: Interval, right: Interval): Interval {
  return createInterval(
    checkedArithmetic(createInterval(left) - createInterval(right), "interval.semitones"),
  );
}

export function intervalBetweenMidiPitches(from: MidiPitch, to: MidiPitch): Interval {
  const validatedFrom = createMidiPitch(from);
  const validatedTo = createMidiPitch(to);
  return createInterval(validatedTo - validatedFrom);
}

export function serializeInterval(interval: Interval): string {
  return JSON.stringify({
    schema: "nightdrive.interval.v1",
    semitones: createInterval(interval),
  });
}
