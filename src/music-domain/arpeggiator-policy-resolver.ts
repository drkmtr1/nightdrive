import type { ArpDirectionId, ArpRateId } from "./arpeggiator";
import type { ArpDensityMaskIdV1 } from "./arpeggiator-density-mask";
import {
  SHARED_ARP_POLICY_CONFIGURATION_V1,
  SHARED_ARP_POLICY_CONFIGURATION_V2,
  type ArpOctaveRangeV1,
  type ArpPolicyDecisionSlotV1,
} from "./arpeggiator-policy-configuration";
import {
  ARP_GENRE_PROFILE_CONFIGURATION_V1,
  ARP_GENRE_PROFILE_CONFIGURATION_V2,
  buildArpWeightedCandidatesV1,
  buildArpWeightedCandidatesV2,
  type ArpPolicyCandidateByDecisionSlotV1,
} from "./arpeggiator-profile-configuration";
import type { ComplexityV1, EnergyV1 } from "./composition-intent";
import type { HarmonyProfileId } from "./harmony";
import type { DurationTicks } from "./musical-time";
import { createMulberry32State, nextMulberry32, type Mulberry32State } from "./prng";
import { selectWeightedCandidateV1, type WeightedCandidate } from "./weighted-choice";

export type ValidatedArpPolicyContextV1 = Readonly<{
  profileId: HarmonyProfileId;
  energy: EnergyV1;
  complexity: ComplexityV1;
}>;

export type ValidatedArpPolicyContextV2 = ValidatedArpPolicyContextV1;

export type ResolvedArpPlanV1 = Readonly<{
  rate: ArpRateId;
  direction: ArpDirectionId;
  gateTicks: DurationTicks;
  octaveRange: ArpOctaveRangeV1;
  maskId: ArpDensityMaskIdV1;
}>;

type ResolverPolicyConfiguration =
  | typeof SHARED_ARP_POLICY_CONFIGURATION_V1
  | typeof SHARED_ARP_POLICY_CONFIGURATION_V2;

type ResolverCandidateBuilder = <TSlot extends ArpPolicyDecisionSlotV1>(
  context: ValidatedArpPolicyContextV1,
  slot: TSlot,
) => readonly WeightedCandidate<ArpPolicyCandidateByDecisionSlotV1[TSlot]>[];

function buildCandidatesV1<TSlot extends ArpPolicyDecisionSlotV1>(
  context: ValidatedArpPolicyContextV1,
  slot: TSlot,
): readonly WeightedCandidate<ArpPolicyCandidateByDecisionSlotV1[TSlot]>[] {
  return buildArpWeightedCandidatesV1(
    ARP_GENRE_PROFILE_CONFIGURATION_V1,
    context.profileId,
    slot,
    context.energy,
    context.complexity,
  );
}

function buildCandidatesV2<TSlot extends ArpPolicyDecisionSlotV1>(
  context: ValidatedArpPolicyContextV2,
  slot: TSlot,
): readonly WeightedCandidate<ArpPolicyCandidateByDecisionSlotV1[TSlot]>[] {
  return buildArpWeightedCandidatesV2(
    ARP_GENRE_PROFILE_CONFIGURATION_V2,
    context.profileId,
    slot,
    context.energy,
    context.complexity,
  );
}

function selectDecision<TSlot extends ArpPolicyDecisionSlotV1>(
  context: ValidatedArpPolicyContextV1,
  slot: TSlot,
  state: Mulberry32State,
  buildCandidates: ResolverCandidateBuilder,
): Readonly<{
  value: ArpPolicyCandidateByDecisionSlotV1[TSlot];
  state: Mulberry32State;
}> {
  const candidates = buildCandidates(context, slot);
  const step = nextMulberry32(state);
  return Object.freeze({
    value: selectWeightedCandidateV1(candidates, step.value),
    state: step.state,
  });
}

function resolveArpPlan(
  context: ValidatedArpPolicyContextV1,
  componentSeed: number,
  policyConfiguration: ResolverPolicyConfiguration,
  buildCandidates: ResolverCandidateBuilder,
): ResolvedArpPlanV1 {
  const [rateSlot, octaveRangeSlot, directionSlot, maskSlot, gateSlot] =
    policyConfiguration.decisionSlots;
  let state = createMulberry32State(componentSeed);

  const rateSelection = selectDecision(context, rateSlot, state, buildCandidates);
  state = rateSelection.state;
  const octaveRangeSelection = selectDecision(context, octaveRangeSlot, state, buildCandidates);
  state = octaveRangeSelection.state;
  const directionSelection = selectDecision(context, directionSlot, state, buildCandidates);
  state = directionSelection.state;
  const maskSelection = selectDecision(context, maskSlot, state, buildCandidates);
  state = maskSelection.state;
  const gateSelection = selectDecision(context, gateSlot, state, buildCandidates);

  const rate = rateSelection.value;
  const gateTicks = policyConfiguration.gateTicksByRate[rate][gateSelection.value];

  return Object.freeze({
    rate,
    direction: directionSelection.value,
    gateTicks,
    octaveRange: octaveRangeSelection.value,
    maskId: maskSelection.value,
  });
}

export function resolveArpPlanV1(
  context: ValidatedArpPolicyContextV1,
  componentSeed: number,
): ResolvedArpPlanV1 {
  return resolveArpPlan(
    context,
    componentSeed,
    SHARED_ARP_POLICY_CONFIGURATION_V1,
    buildCandidatesV1,
  );
}

export function resolveArpPlanV2(
  context: ValidatedArpPolicyContextV2,
  componentSeed: number,
): ResolvedArpPlanV1 {
  return resolveArpPlan(
    context,
    componentSeed,
    SHARED_ARP_POLICY_CONFIGURATION_V2,
    buildCandidatesV2,
  );
}
