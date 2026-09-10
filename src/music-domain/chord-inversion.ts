const chordInversionBrand: unique symbol = Symbol("ChordInversion");

export type ChordInversion = number & { readonly [chordInversionBrand]: true };

export const CHORD_INVERSION_ERROR_CODES = {
  notFinite: "NOT_FINITE",
  notInteger: "NOT_INTEGER",
  outOfRange: "OUT_OF_RANGE",
  unsafeInteger: "UNSAFE_INTEGER",
} as const;

export type ChordInversionErrorCode =
  (typeof CHORD_INVERSION_ERROR_CODES)[keyof typeof CHORD_INVERSION_ERROR_CODES];

export class ChordInversionValueError extends RangeError {
  readonly code: ChordInversionErrorCode;
  readonly field: string;

  constructor(code: ChordInversionErrorCode, field: string, message: string) {
    super(message);
    this.name = "ChordInversionValueError";
    this.code = code;
    this.field = field;
  }
}

export function createChordInversion(value: number): ChordInversion {
  if (!Number.isFinite(value)) {
    throw new ChordInversionValueError(
      CHORD_INVERSION_ERROR_CODES.notFinite,
      "inversion.memberIndex",
      "inversion.memberIndex must be finite.",
    );
  }
  if (!Number.isInteger(value)) {
    throw new ChordInversionValueError(
      CHORD_INVERSION_ERROR_CODES.notInteger,
      "inversion.memberIndex",
      "inversion.memberIndex must be an integer.",
    );
  }
  if (!Number.isSafeInteger(value)) {
    throw new ChordInversionValueError(
      CHORD_INVERSION_ERROR_CODES.unsafeInteger,
      "inversion.memberIndex",
      "inversion.memberIndex must be a safe integer.",
    );
  }
  if (value < 0 || value > 2) {
    throw new ChordInversionValueError(
      CHORD_INVERSION_ERROR_CODES.outOfRange,
      "inversion.memberIndex",
      "inversion.memberIndex must be 0, 1, or 2.",
    );
  }
  return value as ChordInversion;
}

export function chordInversionsEqual(left: ChordInversion, right: ChordInversion): boolean {
  return createChordInversion(left) === createChordInversion(right);
}

export function serializeChordInversion(inversion: ChordInversion): string {
  return JSON.stringify({
    schema: "nightdrive.chord-inversion.v1",
    memberIndex: createChordInversion(inversion),
  });
}
