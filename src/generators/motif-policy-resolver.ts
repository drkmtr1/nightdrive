import type { ComplexityV1, EnergyV1 } from "../music-domain/composition-intent";
import type { HarmonyProfileId } from "../music-domain/harmony";
import { getMotifRhythmTemplateV1, MOTIF_PHRASE_ROLES_V1 } from "../music-domain/motif-catalog";
import { MOTIF_POLICY_VERSION_V1, type ResolvedMotifPlanV1 } from "../music-domain/motif-policy";
import {
  buildMotifWeightedCandidatesV1,
  MOTIF_GENRE_PROFILE_CONFIGURATION_V1,
  MOTIF_POLICY_DECISION_SLOTS_V1,
  MOTIF_PROFILE_DATA_VERSION_V1,
  type MotifPolicyCandidateBySlotV1,
  type MotifPolicyDecisionSlotV1,
} from "../music-domain/motif-profile-configuration";
import { createMulberry32State, type Mulberry32State, nextMulberry32 } from "../music-domain/prng";
import { selectWeightedCandidateV1 } from "../music-domain/weighted-choice";

export type ValidatedMotifPolicyContextV1 = Readonly<{
  profileId: HarmonyProfileId;
  energy: EnergyV1;
  complexity: ComplexityV1;
}>;

function selectDecision<TSlot extends MotifPolicyDecisionSlotV1>(
  context: ValidatedMotifPolicyContextV1,
  slot: TSlot,
  state: Mulberry32State,
): Readonly<{ value: MotifPolicyCandidateBySlotV1[TSlot]; state: Mulberry32State }> {
  const candidates = buildMotifWeightedCandidatesV1(
    MOTIF_GENRE_PROFILE_CONFIGURATION_V1,
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

export function resolveMotifPlanV1(
  context: ValidatedMotifPolicyContextV1,
  componentSeed: number,
): ResolvedMotifPlanV1 {
  const [rhythmSlot, registerSlot, tensionSlot, displacementSlot] = MOTIF_POLICY_DECISION_SLOTS_V1;
  let state = createMulberry32State(componentSeed);

  const rhythm = selectDecision(context, rhythmSlot, state);
  state = rhythm.state;
  const register = selectDecision(context, registerSlot, state);
  state = register.state;
  const tension = selectDecision(context, tensionSlot, state);
  state = tension.state;
  const displacement = selectDecision(context, displacementSlot, state);

  return Object.freeze({
    policyVersion: MOTIF_POLICY_VERSION_V1,
    profileVersion: MOTIF_PROFILE_DATA_VERSION_V1,
    rhythmTemplate: rhythm.value,
    registerBand: register.value,
    tensionMode: tension.value,
    phrase4Displacement: displacement.value,
    contourOffsets: getMotifRhythmTemplateV1(rhythm.value).contourOffsets,
    phraseRoles: MOTIF_PHRASE_ROLES_V1,
  });
}
