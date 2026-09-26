/**
 * Evaluation-only deterministic primitives for the Stage 8 Motif reference.
 *
 * The module deliberately has no runtime imports. It independently encodes
 * only the settled seed, PRNG, and weighted-choice contracts needed before
 * Motif policy and projection reference work begins.
 */

const UINT32_MAX = 0xffff_ffff;
const MAX_WEIGHT = 65_535;
const COMPONENT_ID = "motif";
const DOMAIN_TAG = "nightdrive.seed-derivation.component.v1";
const textEncoder = new TextEncoder();
const DOMAIN_TAG_BYTES = textEncoder.encode(DOMAIN_TAG);
const COMPONENT_ID_BYTES = textEncoder.encode(COMPONENT_ID);

export type Stage8MotifReferencePrng = Readonly<{
  nextUint32: () => number;
}>;

export type Stage8MotifReferenceWeightedCandidate<T> = Readonly<{
  value: T;
  weight: number;
}>;

function assertCanonicalUint32(value: unknown, field: string): number {
  if (
    typeof value !== "number" ||
    !Number.isSafeInteger(value) ||
    value < 0 ||
    value > UINT32_MAX
  ) {
    throw new RangeError(`${field} must be a canonical uint32.`);
  }
  return value;
}

function rotateLeft32(value: number, amount: number): number {
  return ((value << amount) | (value >>> (32 - amount))) >>> 0;
}

function motifSeedInput(rootSeed: number): Uint8Array {
  const bytes = new Uint8Array(DOMAIN_TAG_BYTES.length + 1 + 4 + 1 + COMPONENT_ID_BYTES.length);
  let offset = 0;
  bytes.set(DOMAIN_TAG_BYTES, offset);
  offset += DOMAIN_TAG_BYTES.length;
  bytes[offset] = 0;
  offset += 1;
  bytes[offset] = rootSeed & 0xff;
  bytes[offset + 1] = (rootSeed >>> 8) & 0xff;
  bytes[offset + 2] = (rootSeed >>> 16) & 0xff;
  bytes[offset + 3] = rootSeed >>> 24;
  offset += 4;
  bytes[offset] = COMPONENT_ID_BYTES.length;
  offset += 1;
  bytes.set(COMPONENT_ID_BYTES, offset);
  return bytes;
}

function murmurHash3X86_32(bytes: Uint8Array): number {
  let hash = 0;
  let offset = 0;

  while (offset + 4 <= bytes.length) {
    let block =
      bytes[offset] |
      (bytes[offset + 1] << 8) |
      (bytes[offset + 2] << 16) |
      (bytes[offset + 3] << 24);
    block = Math.imul(block, 0xcc9e2d51) >>> 0;
    block = rotateLeft32(block, 15);
    block = Math.imul(block, 0x1b873593) >>> 0;
    hash = (hash ^ block) >>> 0;
    hash = rotateLeft32(hash, 13);
    hash = (Math.imul(hash, 5) + 0xe6546b64) >>> 0;
    offset += 4;
  }

  let tail = 0;
  const remaining = bytes.length - offset;
  if (remaining >= 3) tail ^= bytes[offset + 2] << 16;
  if (remaining >= 2) tail ^= bytes[offset + 1] << 8;
  if (remaining >= 1) {
    tail ^= bytes[offset];
    tail = Math.imul(tail >>> 0, 0xcc9e2d51) >>> 0;
    tail = rotateLeft32(tail, 15);
    tail = Math.imul(tail, 0x1b873593) >>> 0;
    hash = (hash ^ tail) >>> 0;
  }

  hash = (hash ^ bytes.length) >>> 0;
  hash = (hash ^ (hash >>> 16)) >>> 0;
  hash = Math.imul(hash, 0x85ebca6b) >>> 0;
  hash = (hash ^ (hash >>> 13)) >>> 0;
  hash = Math.imul(hash, 0xc2b2ae35) >>> 0;
  return (hash ^ (hash >>> 16)) >>> 0;
}

/** Derives only the fixed `motif` component seed required by this reference. */
export function deriveStage8MotifReferenceSeed(rootSeed: unknown): number {
  return murmurHash3X86_32(motifSeedInput(assertCanonicalUint32(rootSeed, "rootSeed")));
}

/** Creates one independent Mulberry32 V1 stream for the supplied canonical seed. */
export function createStage8MotifReferencePrng(seed: unknown): Stage8MotifReferencePrng {
  let state = assertCanonicalUint32(seed, "seed");

  return Object.freeze({
    nextUint32: () => {
      state = (state + 0x6d2b79f5) >>> 0;
      let value = state;
      value = Math.imul(value ^ (value >>> 15), value | 1) >>> 0;
      value = (value ^ ((value + Math.imul(value ^ (value >>> 7), value | 61)) >>> 0)) >>> 0;
      return (value ^ (value >>> 14)) >>> 0;
    },
  });
}

/** Selects from one declared-order weighted list using exactly one supplied uint32 output. */
export function selectStage8MotifReferenceWeightedCandidate<T>(
  candidates: readonly Stage8MotifReferenceWeightedCandidate<T>[],
  output: unknown,
): T {
  const uint32 = assertCanonicalUint32(output, "output");
  if (!Array.isArray(candidates) || candidates.length === 0)
    throw new RangeError("candidates must be a non-empty array.");

  let totalWeight = 0;
  for (const [index, candidate] of candidates.entries()) {
    if (typeof candidate !== "object" || candidate === null)
      throw new RangeError(`candidates[${index}] must be an object.`);
    if (
      typeof candidate.weight !== "number" ||
      !Number.isSafeInteger(candidate.weight) ||
      candidate.weight < 0 ||
      candidate.weight > MAX_WEIGHT
    ) {
      throw new RangeError(`candidates[${index}].weight must be a safe integer in 0..65535.`);
    }
    totalWeight += candidate.weight;
    if (totalWeight > MAX_WEIGHT)
      throw new RangeError("candidates total weight must not exceed 65535.");
  }
  if (totalWeight === 0) throw new RangeError("candidates total weight must be positive.");

  const bucket = uint32 % totalWeight;
  let cumulativeExclusive = 0;
  for (const candidate of candidates) {
    cumulativeExclusive += candidate.weight;
    if (bucket < cumulativeExclusive) return candidate.value;
  }

  throw new Error("Weighted selection did not resolve a candidate.");
}
