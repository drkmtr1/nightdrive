import {
  ARP_ERROR_CODES,
  type ArpEvent,
  type ArpRange,
  ArpValueError,
  createArpRange,
  deriveArpSlotCandidates,
} from "./arpeggiator";
import {
  ARP_POLICY_VERSION_V1,
  ARP_POLICY_VERSION_V2,
  ARP_PROFILE_DATA_VERSION_V1,
  ARP_PROFILE_DATA_VERSION_V2,
  SHARED_ARP_POLICY_CONFIGURATION_V1,
  SHARED_ARP_POLICY_CONFIGURATION_V2,
  SharedArpPolicyConfigurationError,
  type ArpOctaveRangeV1,
  type ArpPolicyDecisionSlotV1,
  type ArpPolicyVersionV1,
  type ArpPolicyVersionV2,
  type ArpProfileDataVersionV1,
  type ArpProfileDataVersionV2,
  validateSharedArpPolicyConfigurationV1,
  validateSharedArpPolicyConfigurationV2,
} from "./arpeggiator-policy-configuration";
import type { ArpDensityMaskIdV1 } from "./arpeggiator-density-mask";
import {
  ARP_GENRE_PROFILE_CONFIGURATION_V1,
  ARP_GENRE_PROFILE_CONFIGURATION_V2,
  ArpGenreProfileConfigurationError,
  buildArpWeightedCandidatesV1,
  buildArpWeightedCandidatesV2,
  validateArpGenreProfileConfigurationV1,
  validateArpGenreProfileConfigurationV2,
} from "./arpeggiator-profile-configuration";
import {
  type ResolvedArpPlanV1,
  resolveArpPlanV1,
  resolveArpPlanV2,
} from "./arpeggiator-policy-resolver";
import {
  ArpProjectionNoLegalPitchError,
  projectResolvedArpPlanV1,
} from "./arpeggiator-resolved-plan-projector";
import {
  COMPONENT_SEED_DERIVATION_VERSION_V1,
  type ComponentSeedDerivationVersionV1,
  ComponentSeedValueError,
  deriveComponentSeedV1,
} from "./component-seed";
import {
  type ComplexityV1,
  CompositionIntentValueError,
  type EnergyV1,
  validateNormalizedCompositionIntentV1,
} from "./composition-intent";
import {
  type HarmonyProfileId,
  type HarmonyProgressionRealization,
  isHarmonyProfileId,
} from "./harmony";
import { PRNG_ALGORITHM_ID } from "./prng";

export { ARP_POLICY_VERSION_V1, ARP_PROFILE_DATA_VERSION_V1 };
export { ARP_POLICY_VERSION_V2, ARP_PROFILE_DATA_VERSION_V2 };
export type { ArpPolicyVersionV2, ArpProfileDataVersionV2 };
export type {
  ArpDensityMaskIdV1,
  ArpOctaveRangeV1,
  ArpPolicyVersionV1,
  ArpProfileDataVersionV1,
  ResolvedArpPlanV1,
};
export { COMPONENT_SEED_DERIVATION_VERSION_V1 };
export type { ComponentSeedDerivationVersionV1 };

export type ArpPrngVersionV1 = typeof PRNG_ALGORITHM_ID;

export type ArpPolicyGenerationRequestV1 = Readonly<{
  progression: HarmonyProgressionRealization;
  range: ArpRange;
  intent: Readonly<{
    energy: EnergyV1;
    complexity: ComplexityV1;
  }>;
  profile: Readonly<{
    id: HarmonyProfileId;
    version: ArpProfileDataVersionV1;
  }>;
  policy: Readonly<{
    version: ArpPolicyVersionV1;
  }>;
  seedDerivation: Readonly<{
    version: ComponentSeedDerivationVersionV1;
  }>;
  prng: Readonly<{
    version: ArpPrngVersionV1;
  }>;
  rootSeed: number;
}>;

export type ArpPolicyGenerationResultV1 = Readonly<{
  plan: ResolvedArpPlanV1;
  events: readonly ArpEvent[];
}>;

type UnknownRecord = Record<PropertyKey, unknown>;

export type ArpPolicyGenerationRequestV2 = Readonly<{
  progression: HarmonyProgressionRealization;
  range: ArpRange;
  intent: Readonly<{ energy: EnergyV1; complexity: ComplexityV1 }>;
  profile: Readonly<{ id: HarmonyProfileId; version: ArpProfileDataVersionV2 }>;
  policy: Readonly<{ version: ArpPolicyVersionV2 }>;
  seedDerivation: Readonly<{ version: ComponentSeedDerivationVersionV1 }>;
  prng: Readonly<{ version: ArpPrngVersionV1 }>;
  rootSeed: number;
}>;

export type ArpPolicyGenerationResultV2 = Readonly<{
  plan: ResolvedArpPlanV1;
  events: readonly ArpEvent[];
}>;

const UINT32_MAX = 0xffff_ffff;
const FULL_MIDI_ARP_RANGE = createArpRange({ minMidiPitch: 0, maxMidiPitch: 127 });

function fail(code: ArpValueError["code"], field: string, message: string): never {
  throw new ArpValueError(code, field, message);
}

function readRecordProperty(value: unknown, property: string): unknown {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return undefined;
  return (value as UnknownRecord)[property];
}

function validateIntent(
  request: unknown,
): Readonly<{ energy: EnergyV1; complexity: ComplexityV1 }> {
  const intent = readRecordProperty(request, "intent");
  try {
    return validateNormalizedCompositionIntentV1({
      energy: readRecordProperty(intent, "energy"),
      complexity: readRecordProperty(intent, "complexity"),
    });
  } catch (error) {
    if (error instanceof CompositionIntentValueError) {
      const field = error.field === "energy" ? "intent.energy" : "intent.complexity";
      const code =
        error.code === "INVALID_ENERGY"
          ? ARP_ERROR_CODES.invalidEnergy
          : ARP_ERROR_CODES.invalidComplexity;
      return fail(code, field, `${field} must be an exact canonical identifier.`);
    }
    throw error;
  }
}

function validateProfileId(request: unknown): HarmonyProfileId {
  const value = readRecordProperty(readRecordProperty(request, "profile"), "id");
  if (!isHarmonyProfileId(value)) {
    return fail(
      ARP_ERROR_CODES.invalidArpProfile,
      "profile.id",
      "profile.id must be an exact supported Harmony profile identifier.",
    );
  }
  return value;
}

function validateVersion<T extends string>(
  value: unknown,
  supported: T,
  code: ArpValueError["code"],
  field: string,
): T {
  if (value !== supported)
    return fail(code, field, `${field} must be the exact supported version.`);
  return supported;
}

function validateRootSeed(value: unknown): number {
  if (
    typeof value !== "number" ||
    !Number.isFinite(value) ||
    !Number.isSafeInteger(value) ||
    value < 0 ||
    value > UINT32_MAX
  ) {
    return fail(
      ARP_ERROR_CODES.invalidRootSeed,
      "rootSeed",
      "rootSeed must be a finite safe integer in the uint32 range.",
    );
  }
  return value;
}

function validateProfileConfiguration(): void {
  try {
    validateArpGenreProfileConfigurationV1(ARP_GENRE_PROFILE_CONFIGURATION_V1);
  } catch (error) {
    if (error instanceof ArpGenreProfileConfigurationError) {
      fail(
        ARP_ERROR_CODES.invalidArpPolicyConfiguration,
        "profile.version",
        "The selected Arpeggiator profile configuration is invalid.",
      );
    }
    throw error;
  }
}

function validateSharedConfiguration(): void {
  try {
    validateSharedArpPolicyConfigurationV1(SHARED_ARP_POLICY_CONFIGURATION_V1);
  } catch (error) {
    if (error instanceof SharedArpPolicyConfigurationError) {
      fail(
        ARP_ERROR_CODES.invalidArpPolicyConfiguration,
        "policy.version",
        "The selected shared Arpeggiator policy configuration is invalid.",
      );
    }
    throw error;
  }
}

function constructCandidateLists(
  profileId: HarmonyProfileId,
  energy: EnergyV1,
  complexity: ComplexityV1,
) {
  validateProfileConfiguration();
  const lists = new Map<
    ArpPolicyDecisionSlotV1,
    readonly Readonly<{ value: unknown; weight: number }>[]
  >();
  for (const slot of ["rate", "octave-range", "direction", "mask", "gate"] as const) {
    try {
      lists.set(
        slot,
        buildArpWeightedCandidatesV1(
          ARP_GENRE_PROFILE_CONFIGURATION_V1,
          profileId,
          slot,
          energy,
          complexity,
        ),
      );
    } catch (error) {
      if (error instanceof ArpGenreProfileConfigurationError) {
        return fail(
          ARP_ERROR_CODES.invalidArpPolicyConfiguration,
          "profile.version",
          "The selected Arpeggiator profile configuration is invalid.",
        );
      }
      throw error;
    }
  }
  return lists;
}

function invariant(condition: boolean, message: string): asserts condition {
  if (!condition) throw new Error(`Stage 7C Arpeggiator integration invariant failed: ${message}`);
}

function assertResolvedPlanMatchesCandidates(
  plan: ResolvedArpPlanV1,
  candidateLists: ReturnType<typeof constructCandidateLists>,
  gateMappings = SHARED_ARP_POLICY_CONFIGURATION_V1.gateTicksByRate,
): void {
  const contains = (slot: ArpPolicyDecisionSlotV1, value: unknown) =>
    candidateLists.get(slot)?.some((candidate) => candidate.value === value) === true;
  invariant(contains("rate", plan.rate), "resolved rate is outside validated candidates");
  invariant(
    contains("octave-range", plan.octaveRange),
    "resolved octave range is outside validated candidates",
  );
  invariant(
    contains("direction", plan.direction),
    "resolved direction is outside validated candidates",
  );
  invariant(contains("mask", plan.maskId), "resolved mask is outside validated candidates");
  const validGateTicks = candidateLists
    .get("gate")
    ?.some(
      (candidate) =>
        gateMappings[plan.rate][candidate.value as "short" | "medium" | "long"] === plan.gateTicks,
    );
  invariant(validGateTicks === true, "resolved gate is outside validated candidates");
}

export function generateArpEventsWithPolicyV1(
  request: ArpPolicyGenerationRequestV1,
): ArpPolicyGenerationResultV1 {
  const rawRequest = request as unknown;

  // Stage 7C5 preflight steps 1–2.
  const intent = validateIntent(rawRequest);
  // Step 3.
  const profileId = validateProfileId(rawRequest);
  const profile = readRecordProperty(rawRequest, "profile");
  const policy = readRecordProperty(rawRequest, "policy");
  const seedDerivation = readRecordProperty(rawRequest, "seedDerivation");
  const prng = readRecordProperty(rawRequest, "prng");
  // Step 4.
  const profileVersion = validateVersion(
    readRecordProperty(profile, "version"),
    ARP_PROFILE_DATA_VERSION_V1,
    ARP_ERROR_CODES.unsupportedArpProfileVersion,
    "profile.version",
  );
  // Step 5.
  const policyVersion = validateVersion(
    readRecordProperty(policy, "version"),
    ARP_POLICY_VERSION_V1,
    ARP_ERROR_CODES.unsupportedArpPolicyVersion,
    "policy.version",
  );
  // Step 6. V1 has one supported compatible pair.
  if (
    profileVersion !== SHARED_ARP_POLICY_CONFIGURATION_V1.compatibleProfileDataVersion ||
    policyVersion !== SHARED_ARP_POLICY_CONFIGURATION_V1.version
  ) {
    return fail(
      ARP_ERROR_CODES.incompatibleArpProfilePolicy,
      "policy.version",
      "profile.version and policy.version must be a supported compatible pair.",
    );
  }
  // Step 7.
  validateVersion(
    readRecordProperty(seedDerivation, "version"),
    COMPONENT_SEED_DERIVATION_VERSION_V1,
    ARP_ERROR_CODES.unsupportedSeedDerivationVersion,
    "seedDerivation.version",
  );
  // Step 8.
  validateVersion(
    readRecordProperty(prng, "version"),
    PRNG_ALGORITHM_ID,
    ARP_ERROR_CODES.unsupportedPrngVersion,
    "prng.version",
  );
  // Step 9.
  const rootSeed = validateRootSeed(readRecordProperty(rawRequest, "rootSeed"));
  // Step 10.
  const candidateLists = constructCandidateLists(profileId, intent.energy, intent.complexity);
  // Step 11.
  validateSharedConfiguration();
  // Step 12.
  const range = createArpRange(readRecordProperty(rawRequest, "range"));
  // Step 13. A full MIDI range makes this a pure Harmony-context validation pass.
  const progression = readRecordProperty(
    rawRequest,
    "progression",
  ) as HarmonyProgressionRealization;
  deriveArpSlotCandidates(progression, FULL_MIDI_ARP_RANGE);
  // Step 14.
  if (progression.profile !== profileId) {
    return fail(
      ARP_ERROR_CODES.incompatibleArpProfileContext,
      "profile.id",
      "profile.id must equal the validated Harmony progression profile.",
    );
  }

  let componentSeed: number;
  try {
    componentSeed = deriveComponentSeedV1(rootSeed, "arpeggiator");
  } catch (error) {
    if (error instanceof ComponentSeedValueError) {
      throw new Error("Stage 7C component-seed derivation invariant failed.", { cause: error });
    }
    throw error;
  }

  const plan = resolveArpPlanV1(
    Object.freeze({ profileId, energy: intent.energy, complexity: intent.complexity }),
    componentSeed,
  );
  assertResolvedPlanMatchesCandidates(plan, candidateLists);

  let events: readonly ArpEvent[];
  try {
    events = projectResolvedArpPlanV1(progression, range, plan);
  } catch (error) {
    if (error instanceof ArpProjectionNoLegalPitchError) {
      return fail(
        ARP_ERROR_CODES.noLegalArpPitch,
        `progression.slots[${error.slotIndex}].voicing.midiPitches`,
        "progression slot has no selected-voicing pitch inside the resolved Arpeggiator range.",
      );
    }
    throw error;
  }

  return Object.freeze({ plan, events });
}

export function generateArpEventsWithPolicyV2(
  request: ArpPolicyGenerationRequestV2,
): ArpPolicyGenerationResultV2 {
  const rawRequest = request as unknown;
  // Steps 1–3: normalized intent, then the canonical profile ID.
  const intent = validateIntent(rawRequest);
  const profileId = validateProfileId(rawRequest);
  // Steps 4–5: operation-local support, never V1 dispatch or migration.
  const profileVersion = validateVersion(
    readRecordProperty(readRecordProperty(rawRequest, "profile"), "version"),
    ARP_PROFILE_DATA_VERSION_V2,
    ARP_ERROR_CODES.unsupportedArpProfileVersion,
    "profile.version",
  );
  const policyVersion = validateVersion(
    readRecordProperty(readRecordProperty(rawRequest, "policy"), "version"),
    ARP_POLICY_VERSION_V2,
    ARP_ERROR_CODES.unsupportedArpPolicyVersion,
    "policy.version",
  );
  // Step 6: the sole individually supported pair is declared compatible.
  if (
    profileVersion !== SHARED_ARP_POLICY_CONFIGURATION_V2.compatibleProfileDataVersion ||
    policyVersion !== SHARED_ARP_POLICY_CONFIGURATION_V2.version
  ) {
    return fail(
      ARP_ERROR_CODES.incompatibleArpProfilePolicy,
      "policy.version",
      "profile.version and policy.version must be a supported compatible pair.",
    );
  }
  // Steps 7–9 retain the accepted seed and PRNG identities and uint32 domain.
  validateVersion(
    readRecordProperty(readRecordProperty(rawRequest, "seedDerivation"), "version"),
    COMPONENT_SEED_DERIVATION_VERSION_V1,
    ARP_ERROR_CODES.unsupportedSeedDerivationVersion,
    "seedDerivation.version",
  );
  validateVersion(
    readRecordProperty(readRecordProperty(rawRequest, "prng"), "version"),
    PRNG_ALGORITHM_ID,
    ARP_ERROR_CODES.unsupportedPrngVersion,
    "prng.version",
  );
  const rootSeed = validateRootSeed(readRecordProperty(rawRequest, "rootSeed"));
  // Step 10: all profile-owned validation and five ordered candidate lists.
  const candidateLists: ReturnType<typeof constructCandidateLists> = new Map();
  try {
    validateArpGenreProfileConfigurationV2(ARP_GENRE_PROFILE_CONFIGURATION_V2);
    for (const slot of ["rate", "octave-range", "direction", "mask", "gate"] as const) {
      candidateLists.set(
        slot,
        buildArpWeightedCandidatesV2(
          ARP_GENRE_PROFILE_CONFIGURATION_V2,
          profileId,
          slot,
          intent.energy,
          intent.complexity,
        ),
      );
    }
  } catch (error) {
    if (error instanceof ArpGenreProfileConfigurationError) {
      return fail(
        ARP_ERROR_CODES.invalidArpPolicyConfiguration,
        "profile.version",
        "The selected Arpeggiator profile configuration is invalid.",
      );
    }
    throw error;
  }
  // Step 11: the shared validator owns every schedule/domain/gate constraint.
  try {
    validateSharedArpPolicyConfigurationV2(SHARED_ARP_POLICY_CONFIGURATION_V2);
  } catch (error) {
    if (error instanceof SharedArpPolicyConfigurationError) {
      return fail(
        ARP_ERROR_CODES.invalidArpPolicyConfiguration,
        "policy.version",
        "The selected shared Arpeggiator policy configuration is invalid.",
      );
    }
    throw error;
  }
  // Steps 12–14: range, independent Harmony validation, then profile equality.
  const range = createArpRange(readRecordProperty(rawRequest, "range"));
  const progression = readRecordProperty(
    rawRequest,
    "progression",
  ) as HarmonyProgressionRealization;
  deriveArpSlotCandidates(progression, FULL_MIDI_ARP_RANGE);
  if (progression.profile !== profileId) {
    return fail(
      ARP_ERROR_CODES.incompatibleArpProfileContext,
      "profile.id",
      "profile.id must equal the validated Harmony progression profile.",
    );
  }

  let componentSeed: number;
  try {
    componentSeed = deriveComponentSeedV1(rootSeed, "arpeggiator");
  } catch (error) {
    if (error instanceof ComponentSeedValueError) {
      throw new Error("Stage 7C component-seed derivation invariant failed.", { cause: error });
    }
    throw error;
  }
  const plan = resolveArpPlanV2(
    Object.freeze({ profileId, energy: intent.energy, complexity: intent.complexity }),
    componentSeed,
  );
  assertResolvedPlanMatchesCandidates(
    plan,
    candidateLists,
    SHARED_ARP_POLICY_CONFIGURATION_V2.gateTicksByRate,
  );
  let events: readonly ArpEvent[];
  try {
    events = projectResolvedArpPlanV1(progression, range, plan);
  } catch (error) {
    if (error instanceof ArpProjectionNoLegalPitchError) {
      return fail(
        ARP_ERROR_CODES.noLegalArpPitch,
        `progression.slots[${error.slotIndex}].voicing.midiPitches`,
        "progression slot has no selected-voicing pitch inside the resolved Arpeggiator range.",
      );
    }
    throw error;
  }
  return Object.freeze({ plan, events });
}
