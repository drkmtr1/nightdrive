const chordQualityBrand: unique symbol = Symbol("ChordQuality");

export const CHORD_QUALITIES = {
  majorTriad: "major-triad",
  minorTriad: "minor-triad",
  diminishedTriad: "diminished-triad",
} as const;

export type ChordQuality = (typeof CHORD_QUALITIES)[keyof typeof CHORD_QUALITIES] & {
  readonly [chordQualityBrand]?: true;
};

export const CHORD_QUALITY_ERROR_CODES = {
  invalidQuality: "INVALID_CHORD_QUALITY",
} as const;
export type ChordQualityErrorCode =
  (typeof CHORD_QUALITY_ERROR_CODES)[keyof typeof CHORD_QUALITY_ERROR_CODES];

export class ChordQualityValueError extends RangeError {
  readonly code: ChordQualityErrorCode;
  readonly field: string;

  constructor(code: ChordQualityErrorCode, field: string, message: string) {
    super(message);
    this.name = "ChordQualityValueError";
    this.code = code;
    this.field = field;
  }
}

const FORMULAS: Readonly<Record<string, readonly number[]>> = Object.freeze({
  "major-triad": Object.freeze([0, 4, 7]),
  "minor-triad": Object.freeze([0, 3, 7]),
  "diminished-triad": Object.freeze([0, 3, 6]),
});

function isChordQuality(value: unknown): value is ChordQuality {
  return typeof value === "string" && Object.hasOwn(FORMULAS, value);
}

export function createChordQuality(value: unknown): ChordQuality {
  if (!isChordQuality(value)) {
    throw new ChordQualityValueError(
      CHORD_QUALITY_ERROR_CODES.invalidQuality,
      "quality",
      "quality must be one of the supported canonical chord-quality IDs.",
    );
  }
  return value;
}

export function chordQualitiesEqual(left: ChordQuality, right: ChordQuality): boolean {
  return createChordQuality(left) === createChordQuality(right);
}

export function getChordQualityFormula(quality: ChordQuality): readonly number[] {
  const validated = createChordQuality(quality);
  return Object.freeze([...FORMULAS[validated]]);
}

export function serializeChordQuality(quality: ChordQuality): string {
  const validated = createChordQuality(quality);
  return JSON.stringify({
    schema: "nightdrive.chord-quality.v1",
    quality: validated,
    semitones: getChordQualityFormula(validated),
  });
}
