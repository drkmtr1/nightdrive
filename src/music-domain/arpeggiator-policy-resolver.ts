import type { ArpDirectionId, ArpRateId } from "./arpeggiator";
import type { ArpDensityMaskIdV1 } from "./arpeggiator-density-mask";
import {
  SHARED_ARP_POLICY_CONFIGURATION_V1,
  type ArpOctaveRangeV1,
  type ArpPolicyDecisionSlotV1,
} from "./arpeggiator-policy-configuration";
import {
  ARP_GENRE_PROFILE_CONFIGURATION_V1,
  buildArpWeightedCandidatesV1,
  type ArpPolicyCandidateByDecisionSlotV1,
} from "./arpeggiator-profile-configuration";
import type { ComplexityV1, EnergyV1 } from "./composition-intent";
import type { HarmonyProfileId } from "./harmony";
import type { DurationTicks } from "./musical-time";
import { createMulberry32State, nextMulberry32, type Mulberry32State } from "./prng";
import { selectWeightedCandidateV1 } from "./weighted-choice";

export type ValidatedArpPolicyContextV1 = Readonly<{
  profileId: HarmonyProfileId;
  energy: EnergyV1;
  complexity: ComplexityV1;
}>;

export type ResolvedArpPlanV1 = Readonly<{
  rate: ArpRateId;
  direction: ArpDirectionId;
  gateTicks: DurationTicks;
  octaveRange: ArpOctaveRangeV1;
  maskId: ArpDensityMaskIdV1;
}>;

function selectDecision<TSlot extends ArpPolicyDecisionSlotV1>(
  context: ValidatedArpPolicyContextV1,
  slot: TSlot,
  state: Mulberry32State,
): Readonly<{
  value: ArpPolicyCandidateByDecisionSlotV1[TSlot];
  state: Mulberry32State;
}> {
  const candidates = buildArpWeightedCandidatesV1(
    ARP_GENRE_PROFILE_CONFIGURATION_V1,
    context.profileId,
    slot,
    context.energy,
    context.complexity,
  );
  const step = nextMulberry32(state);
  return Object.freeze({
    value: selectWeightedCandidateV1(candidates, step.value),
    state: step.state,
  });
}

export function resolveArpPlanV1(
  context: ValidatedArpPolicyContextV1,
  componentSeed: number,
): ResolvedArpPlanV1 {
  const [rateSlot, octaveRangeSlot, directionSlot, maskSlot, gateSlot] =
    SHARED_ARP_POLICY_CONFIGURATION_V1.decisionSlots;
  let state = createMulberry32State(componentSeed);

  const rateSelection = selectDecision(context, rateSlot, state);
  state = rateSelection.state;
  const octaveRangeSelection = selectDecision(context, octaveRangeSlot, state);
  state = octaveRangeSelection.state;
  const directionSelection = selectDecision(context, directionSlot, state);
  state = directionSelection.state;
  const maskSelection = selectDecision(context, maskSlot, state);
  state = maskSelection.state;
  const gateSelection = selectDecision(context, gateSlot, state);

  const rate = rateSelection.value;
  const gateTicks = SHARED_ARP_POLICY_CONFIGURATION_V1.gateTicksByRate[rate][gateSelection.value];

  return Object.freeze({
    rate,
    direction: directionSelection.value,
    gateTicks,
    octaveRange: octaveRangeSelection.value,
    maskId: maskSelection.value,
  });
}
