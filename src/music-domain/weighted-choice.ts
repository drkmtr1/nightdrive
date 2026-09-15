export type WeightedCandidate<T> = Readonly<{
  value: T;
  weight: number;
}>;

const MAX_WEIGHT = 65_535;
const UINT32_MAX = 0xffff_ffff;

function invalidCandidates(message: string): never {
  throw new RangeError(message);
}

function validateCandidates<T>(
  candidates: readonly WeightedCandidate<T>[],
): Readonly<{ weights: readonly number[]; totalWeight: number }> {
  if (!Array.isArray(candidates) || candidates.length === 0) {
    invalidCandidates("weighted candidates must be a non-empty array.");
  }

  const weights: number[] = [];
  let totalWeight = 0;

  for (let index = 0; index < candidates.length; index += 1) {
    const candidate: unknown = candidates[index];
    if (
      typeof candidate !== "object" ||
      candidate === null ||
      Array.isArray(candidate) ||
      !("value" in candidate) ||
      !("weight" in candidate)
    ) {
      invalidCandidates(`candidates[${index}] must contain value and weight properties.`);
    }

    const weight: unknown = candidate.weight;
    if (
      typeof weight !== "number" ||
      !Number.isFinite(weight) ||
      !Number.isInteger(weight) ||
      !Number.isSafeInteger(weight) ||
      weight < 0 ||
      weight > MAX_WEIGHT
    ) {
      invalidCandidates(`candidates[${index}].weight must be a finite safe integer in 0..65535.`);
    }

    totalWeight += weight;
    if (totalWeight > MAX_WEIGHT) {
      invalidCandidates("weighted candidate total must be in 1..65535.");
    }
    weights.push(weight);
  }

  if (totalWeight === 0) {
    invalidCandidates("weighted candidate total must be in 1..65535.");
  }

  return { weights, totalWeight };
}

function validateUint32(value: unknown): asserts value is number {
  if (
    typeof value !== "number" ||
    !Number.isFinite(value) ||
    !Number.isInteger(value) ||
    !Number.isSafeInteger(value) ||
    value < 0 ||
    value > UINT32_MAX
  ) {
    throw new RangeError("u must be a finite safe integer in 0..4294967295.");
  }
}

export function selectWeightedCandidateV1<T>(
  candidates: readonly WeightedCandidate<T>[],
  u: number,
): T {
  const { weights, totalWeight } = validateCandidates(candidates);
  validateUint32(u);

  const bucket = u % totalWeight;
  let cumulativeExclusive = 0;

  for (let index = 0; index < candidates.length; index += 1) {
    const candidate = candidates[index];
    const weight = weights[index];
    if (candidate === undefined || weight === undefined) {
      throw new Error("Weighted-choice selection invariant failed.");
    }

    cumulativeExclusive += weight;
    if (bucket < cumulativeExclusive) {
      return candidate.value;
    }
  }

  throw new Error("Weighted-choice selection invariant failed.");
}
