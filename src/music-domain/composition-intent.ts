export const ENERGY_V1_VALUES = Object.freeze([
  "very-low",
  "low",
  "medium",
  "high",
  "very-high",
] as const);

export const COMPLEXITY_V1_VALUES = Object.freeze([
  "very-low",
  "low",
  "medium",
  "high",
  "very-high",
] as const);

export type EnergyV1 = (typeof ENERGY_V1_VALUES)[number];
export type ComplexityV1 = (typeof COMPLEXITY_V1_VALUES)[number];

export type CompositionIntentCreationInputV1 = Readonly<{
  energy?: unknown;
  complexity?: unknown;
}>;

export type NormalizedCompositionIntentV1 = Readonly<{
  energy: EnergyV1;
  complexity: ComplexityV1;
}>;

export type CompositionIntentErrorCode = "INVALID_ENERGY" | "INVALID_COMPLEXITY";
export type CompositionIntentErrorField = "energy" | "complexity";

export class CompositionIntentValueError extends RangeError {
  readonly code: CompositionIntentErrorCode;
  readonly field: CompositionIntentErrorField;

  constructor(
    code: CompositionIntentErrorCode,
    field: CompositionIntentErrorField,
    message: string,
  ) {
    super(message);
    this.name = "CompositionIntentValueError";
    this.code = code;
    this.field = field;
  }
}

function invalidEnergy(): never {
  throw new CompositionIntentValueError(
    "INVALID_ENERGY",
    "energy",
    "energy must be an exact canonical EnergyV1 identifier.",
  );
}

function invalidComplexity(): never {
  throw new CompositionIntentValueError(
    "INVALID_COMPLEXITY",
    "complexity",
    "complexity must be an exact canonical ComplexityV1 identifier.",
  );
}

function validateEnergy(value: unknown): EnergyV1 {
  if (typeof value !== "string" || !ENERGY_V1_VALUES.includes(value as EnergyV1)) {
    invalidEnergy();
  }
  return value as EnergyV1;
}

function validateComplexity(value: unknown): ComplexityV1 {
  if (typeof value !== "string" || !COMPLEXITY_V1_VALUES.includes(value as ComplexityV1)) {
    invalidComplexity();
  }
  return value as ComplexityV1;
}

function createNormalizedIntent(
  energy: EnergyV1,
  complexity: ComplexityV1,
): NormalizedCompositionIntentV1 {
  return Object.freeze({ energy, complexity });
}

export function normalizeCompositionIntentV1(
  input: CompositionIntentCreationInputV1,
): NormalizedCompositionIntentV1 {
  const energy = input.energy === undefined ? "medium" : validateEnergy(input.energy);
  const complexity =
    input.complexity === undefined ? "medium" : validateComplexity(input.complexity);
  return createNormalizedIntent(energy, complexity);
}

export function validateNormalizedCompositionIntentV1(
  input: Readonly<{ energy: unknown; complexity: unknown }>,
): NormalizedCompositionIntentV1 {
  const energy = validateEnergy(input.energy);
  const complexity = validateComplexity(input.complexity);
  return createNormalizedIntent(energy, complexity);
}
