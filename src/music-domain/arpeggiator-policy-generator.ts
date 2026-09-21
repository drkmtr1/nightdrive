import { type ArpEvent, type ArpRange, ARP_ERROR_CODES, ArpValueError } from "./arpeggiator";
import {
  ARP_POLICY_VERSION_V1,
  ARP_POLICY_VERSION_V2,
  ARP_PROFILE_DATA_VERSION_V1,
  ARP_PROFILE_DATA_VERSION_V2,
  SHARED_ARP_POLICY_CONFIGURATION_V1,
  SHARED_ARP_POLICY_CONFIGURATION_V2,
  type ArpOctaveRangeV1,
  type ArpPolicyDecisionSlotV1,
  type ArpPolicyVersionV1,
  type ArpPolicyVersionV2,
  type ArpProfileDataVersionV1,
  type ArpProfileDataVersionV2,
} from "./arpeggiator-policy-configuration";
import type { ArpDensityMaskIdV1 } from "./arpeggiator-density-mask";
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
  preflightArpPolicyGenerationV1,
  preflightArpPolicyGenerationV2,
  type ArpPolicyCandidateLists,
} from "./arpeggiator-policy-preflight";
import {
  COMPONENT_SEED_DERIVATION_VERSION_V1,
  type ComponentSeedDerivationVersionV1,
  ComponentSeedValueError,
  deriveComponentSeedV1,
} from "./component-seed";
import type { ComplexityV1, EnergyV1 } from "./composition-intent";
import type { HarmonyProfileId, HarmonyProgressionRealization } from "./harmony";
import type { PRNG_ALGORITHM_ID } from "./prng";

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

function fail(code: ArpValueError["code"], field: string, message: string): never {
  throw new ArpValueError(code, field, message);
}

function invariant(condition: boolean, message: string): asserts condition {
  if (!condition) throw new Error(`Stage 7C Arpeggiator integration invariant failed: ${message}`);
}

function assertResolvedPlanMatchesCandidates(
  plan: ResolvedArpPlanV1,
  candidateLists: ArpPolicyCandidateLists,
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
  const preflight = preflightArpPolicyGenerationV1(request as unknown);

  let componentSeed: number;
  try {
    componentSeed = deriveComponentSeedV1(preflight.rootSeed, "arpeggiator");
  } catch (error) {
    if (error instanceof ComponentSeedValueError) {
      throw new Error("Stage 7C component-seed derivation invariant failed.", { cause: error });
    }
    throw error;
  }

  const plan = resolveArpPlanV1(
    Object.freeze({
      profileId: preflight.profileId,
      energy: preflight.energy,
      complexity: preflight.complexity,
    }),
    componentSeed,
  );
  assertResolvedPlanMatchesCandidates(plan, preflight.candidateLists);

  let events: readonly ArpEvent[];
  try {
    events = projectResolvedArpPlanV1(preflight.progression, preflight.range, plan);
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
  const preflight = preflightArpPolicyGenerationV2(request as unknown);

  let componentSeed: number;
  try {
    componentSeed = deriveComponentSeedV1(preflight.rootSeed, "arpeggiator");
  } catch (error) {
    if (error instanceof ComponentSeedValueError) {
      throw new Error("Stage 7C component-seed derivation invariant failed.", { cause: error });
    }
    throw error;
  }
  const plan = resolveArpPlanV2(
    Object.freeze({
      profileId: preflight.profileId,
      energy: preflight.energy,
      complexity: preflight.complexity,
    }),
    componentSeed,
  );
  assertResolvedPlanMatchesCandidates(
    plan,
    preflight.candidateLists,
    SHARED_ARP_POLICY_CONFIGURATION_V2.gateTicksByRate,
  );
  let events: readonly ArpEvent[];
  try {
    events = projectResolvedArpPlanV1(preflight.progression, preflight.range, plan);
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
