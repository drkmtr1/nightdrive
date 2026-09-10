import { createPitchClass, type PitchClass } from "./pitch";

const scaleTypeBrand: unique symbol = Symbol("ScaleType");
const scaleDegreeBrand: unique symbol = Symbol("ScaleDegree");

export const SCALE_TYPES = {
  major: "major",
  naturalMinor: "natural-minor",
  harmonicMinor: "harmonic-minor",
  melodicMinor: "melodic-minor",
  dorian: "dorian",
  phrygian: "phrygian",
} as const;

export type ScaleType = (typeof SCALE_TYPES)[keyof typeof SCALE_TYPES] & {
  readonly [scaleTypeBrand]?: true;
};
export type ScaleDegree = number & { readonly [scaleDegreeBrand]: true };

export const SCALE_ERROR_CODES = {
  invalidScaleType: "INVALID_SCALE_TYPE",
  invalidScaleDegree: "INVALID_SCALE_DEGREE",
  notFinite: "NOT_FINITE",
  notInteger: "NOT_INTEGER",
  unsafeInteger: "UNSAFE_INTEGER",
  outOfRange: "OUT_OF_RANGE",
} as const;
export type ScaleErrorCode = (typeof SCALE_ERROR_CODES)[keyof typeof SCALE_ERROR_CODES];

export class ScaleValueError extends RangeError {
  readonly code: ScaleErrorCode;
  readonly field: string;
  constructor(code: ScaleErrorCode, field: string, message: string) {
    super(message);
    this.name = "ScaleValueError";
    this.code = code;
    this.field = field;
  }
}

const FORMULAS: Readonly<Record<string, readonly number[]>> = Object.freeze({
  major: Object.freeze([0, 2, 4, 5, 7, 9, 11]),
  "natural-minor": Object.freeze([0, 2, 3, 5, 7, 8, 10]),
  "harmonic-minor": Object.freeze([0, 2, 3, 5, 7, 8, 11]),
  "melodic-minor": Object.freeze([0, 2, 3, 5, 7, 9, 11]),
  dorian: Object.freeze([0, 2, 3, 5, 7, 9, 10]),
  phrygian: Object.freeze([0, 1, 3, 5, 7, 8, 10]),
});

function isScaleType(value: unknown): value is ScaleType {
  return typeof value === "string" && Object.hasOwn(FORMULAS, value);
}

export function createScaleType(value: unknown): ScaleType {
  if (!isScaleType(value)) {
    throw new ScaleValueError(
      SCALE_ERROR_CODES.invalidScaleType,
      "scaleType",
      "scaleType must be one of the supported canonical scale types.",
    );
  }
  return value;
}

export function createScaleDegree(value: number): ScaleDegree {
  if (!Number.isFinite(value)) {
    throw new ScaleValueError(
      SCALE_ERROR_CODES.invalidScaleDegree,
      "scaleDegree",
      "scaleDegree must be finite.",
    );
  }
  if (!Number.isInteger(value)) {
    throw new ScaleValueError(
      SCALE_ERROR_CODES.invalidScaleDegree,
      "scaleDegree",
      "scaleDegree must be an integer.",
    );
  }
  if (!Number.isSafeInteger(value)) {
    throw new ScaleValueError(
      SCALE_ERROR_CODES.invalidScaleDegree,
      "scaleDegree",
      "scaleDegree must be safe.",
    );
  }
  if (value < 0 || value > 6) {
    throw new ScaleValueError(
      SCALE_ERROR_CODES.invalidScaleDegree,
      "scaleDegree",
      "scaleDegree must be between 0 and 6.",
    );
  }
  return value as ScaleDegree;
}

export function getScaleFormula(scaleType: ScaleType): readonly number[] {
  const validated = createScaleType(scaleType);
  return Object.freeze([...FORMULAS[validated]]);
}

export function serializeScale(scaleType: ScaleType): string {
  const validated = createScaleType(scaleType);
  return JSON.stringify({
    schema: "nightdrive.scale.v1",
    scale: validated,
    semitones: getScaleFormula(validated),
  });
}

function wrappedPitchClass(tonic: PitchClass, offset: number): PitchClass {
  return createPitchClass((createPitchClass(tonic) + offset) % 12);
}

export function pitchClassesForScale(
  tonic: PitchClass,
  scaleType: ScaleType,
): readonly PitchClass[] {
  const validatedTonic = createPitchClass(tonic);
  return Object.freeze(
    getScaleFormula(scaleType).map((offset) => wrappedPitchClass(validatedTonic, offset)),
  );
}

export function pitchClassAtScaleDegree(
  tonic: PitchClass,
  scaleType: ScaleType,
  degree: ScaleDegree,
): PitchClass {
  const validatedDegree = createScaleDegree(degree);
  return pitchClassesForScale(tonic, scaleType)[validatedDegree];
}

export function scaleContainsPitchClass(
  tonic: PitchClass,
  scaleType: ScaleType,
  pitchClass: PitchClass,
): boolean {
  const validatedPitchClass = createPitchClass(pitchClass);
  return pitchClassesForScale(tonic, scaleType).includes(validatedPitchClass);
}
