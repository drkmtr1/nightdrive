import {
  ARP_ERROR_CODES,
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
  type ArpPolicyDecisionSlotV1,
  validateSharedArpPolicyConfigurationV1,
  validateSharedArpPolicyConfigurationV2,
} from "./arpeggiator-policy-configuration";
import {
  ARP_GENRE_PROFILE_CONFIGURATION_V1,
  ARP_GENRE_PROFILE_CONFIGURATION_V2,
  ArpGenreProfileConfigurationError,
  buildArpWeightedCandidatesV1,
  buildArpWeightedCandidatesV2,
  validateArpGenreProfileConfigurationV1,
  validateArpGenreProfileConfigurationV2,
} from "./arpeggiator-profile-configuration";
import { COMPONENT_SEED_DERIVATION_VERSION_V1 } from "./component-seed";
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

type UnknownRecord = Record<PropertyKey, unknown>;

export type ArpPolicyCandidateLists = Map<
  ArpPolicyDecisionSlotV1,
  readonly Readonly<{ value: unknown; weight: number }>[]
>;

export type ArpPolicyPreflight = Readonly<{
  profileId: HarmonyProfileId;
  energy: EnergyV1;
  complexity: ComplexityV1;
  rootSeed: number;
  range: ArpRange;
  progression: HarmonyProgressionRealization;
  candidateLists: ArpPolicyCandidateLists;
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
  if (!isHarmonyProfileId(value))
    return fail(
      ARP_ERROR_CODES.invalidArpProfile,
      "profile.id",
      "profile.id must be an exact supported Harmony profile identifier.",
    );
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

function validateProfileConfigurationV1(): void {
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

function validateSharedConfigurationV1(): void {
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

function constructCandidateListsV1(
  profileId: HarmonyProfileId,
  energy: EnergyV1,
  complexity: ComplexityV1,
): ArpPolicyCandidateLists {
  validateProfileConfigurationV1();
  const lists: ArpPolicyCandidateLists = new Map();
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
      if (error instanceof ArpGenreProfileConfigurationError)
        return fail(
          ARP_ERROR_CODES.invalidArpPolicyConfiguration,
          "profile.version",
          "The selected Arpeggiator profile configuration is invalid.",
        );
      throw error;
    }
  }
  return lists;
}

function constructCandidateListsV2(
  profileId: HarmonyProfileId,
  energy: EnergyV1,
  complexity: ComplexityV1,
): ArpPolicyCandidateLists {
  const lists: ArpPolicyCandidateLists = new Map();
  try {
    validateArpGenreProfileConfigurationV2(ARP_GENRE_PROFILE_CONFIGURATION_V2);
    for (const slot of ["rate", "octave-range", "direction", "mask", "gate"] as const) {
      lists.set(
        slot,
        buildArpWeightedCandidatesV2(
          ARP_GENRE_PROFILE_CONFIGURATION_V2,
          profileId,
          slot,
          energy,
          complexity,
        ),
      );
    }
  } catch (error) {
    if (error instanceof ArpGenreProfileConfigurationError)
      return fail(
        ARP_ERROR_CODES.invalidArpPolicyConfiguration,
        "profile.version",
        "The selected Arpeggiator profile configuration is invalid.",
      );
    throw error;
  }
  return lists;
}

function preflightCommon(
  request: unknown,
  expectedProfile: string,
  expectedPolicy: string,
  profileCompat: string,
  policyCompat: string,
  candidateLists: (
    profileId: HarmonyProfileId,
    energy: EnergyV1,
    complexity: ComplexityV1,
  ) => ArpPolicyCandidateLists,
  validateShared: () => void,
): ArpPolicyPreflight {
  const intent = validateIntent(request);
  const profileId = validateProfileId(request);
  const profile = readRecordProperty(request, "profile");
  const policy = readRecordProperty(request, "policy");
  const seedDerivation = readRecordProperty(request, "seedDerivation");
  const prng = readRecordProperty(request, "prng");
  const profileVersion = validateVersion(
    readRecordProperty(profile, "version"),
    expectedProfile,
    ARP_ERROR_CODES.unsupportedArpProfileVersion,
    "profile.version",
  );
  const policyVersion = validateVersion(
    readRecordProperty(policy, "version"),
    expectedPolicy,
    ARP_ERROR_CODES.unsupportedArpPolicyVersion,
    "policy.version",
  );
  if (profileVersion !== profileCompat || policyVersion !== policyCompat)
    return fail(
      ARP_ERROR_CODES.incompatibleArpProfilePolicy,
      "policy.version",
      "profile.version and policy.version must be a supported compatible pair.",
    );
  validateVersion(
    readRecordProperty(seedDerivation, "version"),
    COMPONENT_SEED_DERIVATION_VERSION_V1,
    ARP_ERROR_CODES.unsupportedSeedDerivationVersion,
    "seedDerivation.version",
  );
  validateVersion(
    readRecordProperty(prng, "version"),
    PRNG_ALGORITHM_ID,
    ARP_ERROR_CODES.unsupportedPrngVersion,
    "prng.version",
  );
  const rootSeed = validateRootSeed(readRecordProperty(request, "rootSeed"));
  const lists = candidateLists(profileId, intent.energy, intent.complexity);
  validateShared();
  const range = createArpRange(readRecordProperty(request, "range"));
  const progression = readRecordProperty(request, "progression") as HarmonyProgressionRealization;
  deriveArpSlotCandidates(progression, FULL_MIDI_ARP_RANGE);
  if (progression.profile !== profileId)
    return fail(
      ARP_ERROR_CODES.incompatibleArpProfileContext,
      "profile.id",
      "profile.id must equal the validated Harmony progression profile.",
    );
  return Object.freeze({
    profileId,
    energy: intent.energy,
    complexity: intent.complexity,
    rootSeed,
    range,
    progression,
    candidateLists: lists,
  });
}

export function preflightArpPolicyGenerationV1(request: unknown): ArpPolicyPreflight {
  return preflightCommon(
    request,
    ARP_PROFILE_DATA_VERSION_V1,
    ARP_POLICY_VERSION_V1,
    SHARED_ARP_POLICY_CONFIGURATION_V1.compatibleProfileDataVersion,
    SHARED_ARP_POLICY_CONFIGURATION_V1.version,
    constructCandidateListsV1,
    validateSharedConfigurationV1,
  );
}

export function preflightArpPolicyGenerationV2(request: unknown): ArpPolicyPreflight {
  return preflightCommon(
    request,
    ARP_PROFILE_DATA_VERSION_V2,
    ARP_POLICY_VERSION_V2,
    SHARED_ARP_POLICY_CONFIGURATION_V2.compatibleProfileDataVersion,
    SHARED_ARP_POLICY_CONFIGURATION_V2.version,
    constructCandidateListsV2,
    () => {
      try {
        validateSharedArpPolicyConfigurationV2(SHARED_ARP_POLICY_CONFIGURATION_V2);
      } catch (error) {
        if (error instanceof SharedArpPolicyConfigurationError)
          return fail(
            ARP_ERROR_CODES.invalidArpPolicyConfiguration,
            "policy.version",
            "The selected shared Arpeggiator policy configuration is invalid.",
          );
        throw error;
      }
    },
  );
}
