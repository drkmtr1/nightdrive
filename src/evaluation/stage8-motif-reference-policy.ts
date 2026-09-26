/**
 * Evaluation-only literal policy reference for Stage 8 Motif qualification.
 *
 * This module independently transcribes the settled V1 profile tables. It
 * constructs declared-order weighted candidate lists only; resolution, plan
 * construction, pitch projection, serialization, capture, and qualification
 * remain separate evidence slices.
 */

const MAX_WEIGHT = 65_535;

export const STAGE8_MOTIF_REFERENCE_POLICY_VERSION = "nightdrive.motif-policy.v1" as const;
export const STAGE8_MOTIF_REFERENCE_PROFILE_DATA_VERSION =
  "nightdrive.genre-profile.motif.v1" as const;
export const STAGE8_MOTIF_REFERENCE_PROFILE_IDS = Object.freeze([
  "dark-synthwave",
  "classic-synthwave",
  "darkwave",
  "midtempo-cyberpunk",
] as const);
export const STAGE8_MOTIF_REFERENCE_SLOT_IDS = Object.freeze([
  "rhythm",
  "register",
  "tension",
  "displacement",
] as const);
export const STAGE8_MOTIF_REFERENCE_ENERGY_LEVELS = Object.freeze([
  "very-low",
  "low",
  "medium",
  "high",
  "very-high",
] as const);
export const STAGE8_MOTIF_REFERENCE_COMPLEXITY_LEVELS = Object.freeze([
  "very-low",
  "low",
  "medium",
  "high",
  "very-high",
] as const);

export type Stage8MotifReferenceProfileId = (typeof STAGE8_MOTIF_REFERENCE_PROFILE_IDS)[number];
export type Stage8MotifReferenceSlotId = (typeof STAGE8_MOTIF_REFERENCE_SLOT_IDS)[number];
export type Stage8MotifReferenceEnergy = (typeof STAGE8_MOTIF_REFERENCE_ENERGY_LEVELS)[number];
export type Stage8MotifReferenceComplexity =
  (typeof STAGE8_MOTIF_REFERENCE_COMPLEXITY_LEVELS)[number];
export type Stage8MotifReferenceWeightedCandidate = Readonly<{
  value: string;
  weight: number;
}>;

export type Stage8MotifReferencePolicyLiteral = Readonly<{
  policyVersion: string;
  profileDataVersion: string;
  profiles: readonly Stage8MotifReferenceProfileLiteral[];
}>;

export type Stage8MotifReferenceProfileLiteral = Readonly<{
  profileId: string;
  decisionSlots: readonly Stage8MotifReferenceSlotLiteral[];
}>;

export type Stage8MotifReferenceSlotLiteral = Readonly<{
  slot: string;
  candidates: readonly string[];
  energyWeights: readonly (readonly number[])[];
  complexityAdditions: readonly (readonly number[])[];
}>;

function deepFreeze<T>(value: T): T {
  if (typeof value !== "object" || value === null || Object.isFrozen(value)) return value;
  for (const key of Reflect.ownKeys(value)) deepFreeze(Reflect.get(value, key));
  return Object.freeze(value);
}

const CANONICAL_POLICY_LITERAL: Stage8MotifReferencePolicyLiteral = deepFreeze({
  policyVersion: STAGE8_MOTIF_REFERENCE_POLICY_VERSION,
  profileDataVersion: STAGE8_MOTIF_REFERENCE_PROFILE_DATA_VERSION,
  profiles: [
    {
      profileId: "dark-synthwave",
      decisionSlots: [
        {
          slot: "rhythm",
          candidates: ["sparse-4", "steady-6", "active-8"],
          energyWeights: [
            [6, 3, 1],
            [5, 4, 1],
            [3, 6, 3],
            [2, 5, 6],
            [1, 3, 8],
          ],
          complexityAdditions: [
            [0, 0, 0],
            [0, 0, 0],
            [0, 0, 0],
            [0, 0, 0],
            [0, 0, 0],
          ],
        },
        {
          slot: "register",
          candidates: ["middle", "upper"],
          energyWeights: [
            [6, 2],
            [5, 3],
            [4, 4],
            [3, 5],
            [2, 6],
          ],
          complexityAdditions: [
            [0, 0],
            [0, 0],
            [0, 0],
            [0, 0],
            [0, 0],
          ],
        },
        {
          slot: "tension",
          candidates: ["chordal", "diatonic-passing"],
          energyWeights: [
            [5, 3],
            [5, 3],
            [5, 3],
            [5, 3],
            [5, 3],
          ],
          complexityAdditions: [
            [2, 0],
            [1, 0],
            [0, 0],
            [0, 2],
            [0, 4],
          ],
        },
        {
          slot: "displacement",
          candidates: ["none", "later-480", "earlier-480"],
          energyWeights: [
            [6, 3, 2],
            [6, 3, 2],
            [6, 3, 2],
            [6, 3, 2],
            [6, 3, 2],
          ],
          complexityAdditions: [
            [2, 0, 0],
            [1, 0, 0],
            [0, 0, 0],
            [0, 1, 1],
            [0, 2, 2],
          ],
        },
      ],
    },
    {
      profileId: "classic-synthwave",
      decisionSlots: [
        {
          slot: "rhythm",
          candidates: ["sparse-4", "steady-6", "active-8"],
          energyWeights: [
            [5, 4, 1],
            [4, 5, 1],
            [2, 7, 3],
            [2, 6, 5],
            [1, 5, 7],
          ],
          complexityAdditions: [
            [0, 0, 0],
            [0, 0, 0],
            [0, 0, 0],
            [0, 0, 0],
            [0, 0, 0],
          ],
        },
        {
          slot: "register",
          candidates: ["middle", "upper"],
          energyWeights: [
            [6, 2],
            [5, 3],
            [4, 4],
            [3, 5],
            [2, 6],
          ],
          complexityAdditions: [
            [0, 0],
            [0, 0],
            [0, 0],
            [0, 0],
            [0, 0],
          ],
        },
        {
          slot: "tension",
          candidates: ["chordal", "diatonic-passing"],
          energyWeights: [
            [6, 2],
            [6, 2],
            [6, 2],
            [6, 2],
            [6, 2],
          ],
          complexityAdditions: [
            [2, 0],
            [1, 0],
            [0, 0],
            [0, 2],
            [0, 3],
          ],
        },
        {
          slot: "displacement",
          candidates: ["none", "earlier-480", "later-480"],
          energyWeights: [
            [7, 2, 2],
            [7, 2, 2],
            [7, 2, 2],
            [7, 2, 2],
            [7, 2, 2],
          ],
          complexityAdditions: [
            [2, 0, 0],
            [1, 0, 0],
            [0, 0, 0],
            [0, 1, 1],
            [0, 2, 2],
          ],
        },
      ],
    },
    {
      profileId: "darkwave",
      decisionSlots: [
        {
          slot: "rhythm",
          candidates: ["sparse-4", "steady-6", "active-8"],
          energyWeights: [
            [8, 2, 1],
            [7, 3, 1],
            [5, 5, 2],
            [3, 7, 3],
            [2, 7, 5],
          ],
          complexityAdditions: [
            [0, 0, 0],
            [0, 0, 0],
            [0, 0, 0],
            [0, 0, 0],
            [0, 0, 0],
          ],
        },
        {
          slot: "register",
          candidates: ["lower", "middle"],
          energyWeights: [
            [7, 3],
            [7, 3],
            [7, 3],
            [7, 3],
            [7, 3],
          ],
          complexityAdditions: [
            [2, 0],
            [1, 0],
            [0, 0],
            [0, 1],
            [0, 2],
          ],
        },
        {
          slot: "tension",
          candidates: ["chordal", "diatonic-passing"],
          energyWeights: [
            [4, 4],
            [4, 4],
            [4, 4],
            [4, 4],
            [4, 4],
          ],
          complexityAdditions: [
            [2, 0],
            [1, 0],
            [0, 0],
            [0, 2],
            [0, 4],
          ],
        },
        {
          slot: "displacement",
          candidates: ["none", "later-480", "earlier-480"],
          energyWeights: [
            [5, 4, 2],
            [5, 4, 2],
            [5, 4, 2],
            [5, 4, 2],
            [5, 4, 2],
          ],
          complexityAdditions: [
            [2, 0, 0],
            [1, 0, 0],
            [0, 0, 0],
            [0, 2, 1],
            [0, 3, 2],
          ],
        },
      ],
    },
    {
      profileId: "midtempo-cyberpunk",
      decisionSlots: [
        {
          slot: "rhythm",
          candidates: ["sparse-4", "steady-6", "active-8"],
          energyWeights: [
            [6, 4, 1],
            [5, 5, 1],
            [4, 6, 3],
            [3, 7, 4],
            [2, 7, 6],
          ],
          complexityAdditions: [
            [0, 0, 0],
            [0, 0, 0],
            [0, 0, 0],
            [0, 0, 0],
            [0, 0, 0],
          ],
        },
        {
          slot: "register",
          candidates: ["lower", "middle", "upper"],
          energyWeights: [
            [5, 5, 2],
            [4, 6, 2],
            [3, 7, 3],
            [2, 7, 5],
            [1, 6, 7],
          ],
          complexityAdditions: [
            [0, 0, 0],
            [0, 0, 0],
            [0, 0, 0],
            [0, 0, 0],
            [0, 0, 0],
          ],
        },
        {
          slot: "tension",
          candidates: ["chordal", "diatonic-passing"],
          energyWeights: [
            [5, 3],
            [5, 3],
            [5, 3],
            [5, 3],
            [5, 3],
          ],
          complexityAdditions: [
            [2, 0],
            [1, 0],
            [0, 0],
            [0, 2],
            [0, 4],
          ],
        },
        {
          slot: "displacement",
          candidates: ["none", "earlier-480", "later-480"],
          energyWeights: [
            [4, 4, 3],
            [4, 4, 3],
            [4, 4, 3],
            [4, 4, 3],
            [4, 4, 3],
          ],
          complexityAdditions: [
            [2, 0, 0],
            [1, 0, 0],
            [0, 0, 0],
            [0, 2, 2],
            [0, 3, 3],
          ],
        },
      ],
    },
  ],
});

function fail(field: string): never {
  throw new RangeError(`${field} must match the canonical Stage 8 Motif policy literal.`);
}

function exactRecord(
  value: unknown,
  expectedKeys: readonly string[],
  field: string,
): Record<string, unknown> {
  if (
    typeof value !== "object" ||
    value === null ||
    Array.isArray(value) ||
    Object.getPrototypeOf(value) !== Object.prototype
  ) {
    return fail(field);
  }
  const keys = Reflect.ownKeys(value);
  if (keys.length !== expectedKeys.length) return fail(field);
  for (const [index, key] of expectedKeys.entries()) {
    if (keys[index] !== key) return fail(field);
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (descriptor === undefined || !Object.hasOwn(descriptor, "value"))
      return fail(`${field}.${key}`);
  }
  return value as Record<string, unknown>;
}

function exactArray(value: unknown, length: number, field: string): unknown[] {
  if (!Array.isArray(value) || value.length !== length) return fail(field);
  const keys = Reflect.ownKeys(value);
  if (keys.length !== length + 1 || keys[length] !== "length") return fail(field);
  for (let index = 0; index < length; index += 1) {
    if (keys[index] !== String(index)) return fail(field);
    const descriptor = Object.getOwnPropertyDescriptor(value, String(index));
    if (descriptor === undefined || !Object.hasOwn(descriptor, "value"))
      return fail(`${field}[${index}]`);
  }
  return value;
}

function exactString(value: unknown, expected: string, field: string): void {
  if (typeof value !== "string" || value !== expected) fail(field);
}

function exactWeight(value: unknown, expected: number, field: string): void {
  if (
    typeof value !== "number" ||
    !Number.isSafeInteger(value) ||
    value < 0 ||
    value > MAX_WEIGHT ||
    value !== expected
  ) {
    fail(field);
  }
}

function validateWeightRows(
  value: unknown,
  expectedRows: readonly (readonly number[])[],
  field: string,
): readonly (readonly number[])[] {
  const rows = exactArray(value, STAGE8_MOTIF_REFERENCE_ENERGY_LEVELS.length, field);
  for (const [rowIndex, expectedRow] of expectedRows.entries()) {
    const row = exactArray(rows[rowIndex], expectedRow.length, `${field}[${rowIndex}]`);
    for (const [candidateIndex, expectedWeight] of expectedRow.entries()) {
      exactWeight(row[candidateIndex], expectedWeight, `${field}[${rowIndex}][${candidateIndex}]`);
    }
  }
  return rows as readonly (readonly number[])[];
}

/**
 * Rejects any candidate literal that differs from the accepted V1 data.
 *
 * This is evaluation-only validation. It neither accepts a new policy nor
 * exposes a runtime configuration path.
 */
export function assertStage8MotifReferencePolicyLiterals(
  literal: unknown,
): asserts literal is Stage8MotifReferencePolicyLiteral {
  const policy = exactRecord(
    literal,
    ["policyVersion", "profileDataVersion", "profiles"],
    "policy",
  );
  exactString(policy.policyVersion, STAGE8_MOTIF_REFERENCE_POLICY_VERSION, "policy.policyVersion");
  exactString(
    policy.profileDataVersion,
    STAGE8_MOTIF_REFERENCE_PROFILE_DATA_VERSION,
    "policy.profileDataVersion",
  );

  const profiles = exactArray(
    policy.profiles,
    STAGE8_MOTIF_REFERENCE_PROFILE_IDS.length,
    "policy.profiles",
  );
  for (const [profileIndex, expectedProfile] of CANONICAL_POLICY_LITERAL.profiles.entries()) {
    const profile = exactRecord(
      profiles[profileIndex],
      ["profileId", "decisionSlots"],
      `policy.profiles[${profileIndex}]`,
    );
    exactString(
      profile.profileId,
      STAGE8_MOTIF_REFERENCE_PROFILE_IDS[profileIndex],
      `policy.profiles[${profileIndex}].profileId`,
    );
    const slots = exactArray(
      profile.decisionSlots,
      STAGE8_MOTIF_REFERENCE_SLOT_IDS.length,
      `policy.profiles[${profileIndex}].decisionSlots`,
    );
    for (const [slotIndex, expectedSlot] of expectedProfile.decisionSlots.entries()) {
      const slot = exactRecord(
        slots[slotIndex],
        ["slot", "candidates", "energyWeights", "complexityAdditions"],
        `policy.profiles[${profileIndex}].decisionSlots[${slotIndex}]`,
      );
      exactString(
        slot.slot,
        STAGE8_MOTIF_REFERENCE_SLOT_IDS[slotIndex],
        `policy.profiles[${profileIndex}].decisionSlots[${slotIndex}].slot`,
      );
      const candidates = exactArray(
        slot.candidates,
        expectedSlot.candidates.length,
        `policy.profiles[${profileIndex}].decisionSlots[${slotIndex}].candidates`,
      );
      for (const [candidateIndex, expectedCandidate] of expectedSlot.candidates.entries()) {
        exactString(
          candidates[candidateIndex],
          expectedCandidate,
          `policy.profiles[${profileIndex}].decisionSlots[${slotIndex}].candidates[${candidateIndex}]`,
        );
      }

      const energyRows = validateWeightRows(
        slot.energyWeights,
        expectedSlot.energyWeights,
        `policy.profiles[${profileIndex}].decisionSlots[${slotIndex}].energyWeights`,
      );
      const complexityRows = validateWeightRows(
        slot.complexityAdditions,
        expectedSlot.complexityAdditions,
        `policy.profiles[${profileIndex}].decisionSlots[${slotIndex}].complexityAdditions`,
      );
      for (const rowIndex of STAGE8_MOTIF_REFERENCE_ENERGY_LEVELS.keys()) {
        for (const candidateIndex of expectedSlot.candidates.keys()) {
          const finalWeight =
            energyRows[rowIndex][candidateIndex] + complexityRows[rowIndex][candidateIndex];
          if (!Number.isSafeInteger(finalWeight) || finalWeight < 1 || finalWeight > MAX_WEIGHT) {
            fail(
              `policy.profiles[${profileIndex}].decisionSlots[${slotIndex}].finalWeights[${rowIndex}][${candidateIndex}]`,
            );
          }
        }
      }
    }
  }
}

assertStage8MotifReferencePolicyLiterals(CANONICAL_POLICY_LITERAL);

function exactIndex(value: unknown, values: readonly string[], field: string): number {
  if (typeof value !== "string") throw new RangeError(`${field} must be a canonical identifier.`);
  const index = values.indexOf(value);
  if (index < 0) throw new RangeError(`${field} must be a supported canonical identifier.`);
  return index;
}

/**
 * Constructs one declared-order raw-weight list for a valid profile/slot/intent tuple.
 *
 * It does not select a candidate or consume a PRNG output.
 */
export function buildStage8MotifReferenceWeightedCandidates(
  profileId: unknown,
  slotId: unknown,
  energy: unknown,
  complexity: unknown,
): readonly Stage8MotifReferenceWeightedCandidate[] {
  const profileIndex = exactIndex(profileId, STAGE8_MOTIF_REFERENCE_PROFILE_IDS, "profileId");
  const slotIndex = exactIndex(slotId, STAGE8_MOTIF_REFERENCE_SLOT_IDS, "slotId");
  const energyIndex = exactIndex(energy, STAGE8_MOTIF_REFERENCE_ENERGY_LEVELS, "energy");
  const complexityIndex = exactIndex(
    complexity,
    STAGE8_MOTIF_REFERENCE_COMPLEXITY_LEVELS,
    "complexity",
  );
  const slot = CANONICAL_POLICY_LITERAL.profiles[profileIndex].decisionSlots[slotIndex];
  const energyWeights = slot.energyWeights[energyIndex];
  const complexityAdditions = slot.complexityAdditions[complexityIndex];

  return Object.freeze(
    slot.candidates.map((value, candidateIndex) => {
      const weight = energyWeights[candidateIndex] + complexityAdditions[candidateIndex];
      if (!Number.isSafeInteger(weight) || weight < 1 || weight > MAX_WEIGHT) {
        throw new RangeError("canonical Motif policy final weight is invalid.");
      }
      return Object.freeze({ value, weight });
    }),
  );
}
