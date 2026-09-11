import {
  calculateVoiceLeadingCost,
  enumerateChordVoicingCandidates,
  HARMONY_PROFILE_IDS,
  type ChordVoicingCandidate,
  type HarmonyProfileId,
} from "./harmony";
import type { Chord } from "./chord";
import type { ChordInversion } from "./chord-inversion";

export function progressionCandidates(
  chord: Chord,
  profile: HarmonyProfileId,
  inversions: readonly ChordInversion[] | undefined,
): readonly ChordVoicingCandidate[] {
  return enumerateChordVoicingCandidates(chord, profile, inversions);
}

function compareFirstPitchTuples(left: ChordVoicingCandidate, right: ChordVoicingCandidate): number {
  const leftPitches = left.voicing.midiPitches;
  const rightPitches = right.voicing.midiPitches;
  return (
    leftPitches[0] - rightPitches[0] ||
    leftPitches[1] - rightPitches[1] ||
    leftPitches[2] - rightPitches[2]
  );
}

function compareStage4B3PitchTieBreak(left: ChordVoicingCandidate, right: ChordVoicingCandidate): number {
  const leftPitches = left.voicing.midiPitches;
  const rightPitches = right.voicing.midiPitches;
  return (
    leftPitches[2] - rightPitches[2] ||
    leftPitches[0] - rightPitches[0] ||
    leftPitches[1] - rightPitches[1] ||
    leftPitches[2] - rightPitches[2]
  );
}

function firstSlotPreferenceRank(
  profile: HarmonyProfileId,
  candidate: ChordVoicingCandidate,
): number {
  return profile === HARMONY_PROFILE_IDS.classicSynthwave && candidate.inversion === 0 ? 0 : 1;
}

function laterSlotPreferenceRank(
  profile: HarmonyProfileId,
  candidate: ChordVoicingCandidate,
  slotIndex: number,
  slotCount: number,
  previous: ChordVoicingCandidate,
): number {
  if (slotIndex === slotCount - 1 && profile === HARMONY_PROFILE_IDS.darkSynthwave) {
    return candidate.inversion === 0 ? 0 : 1;
  }
  if (slotIndex === slotCount - 1 && profile === HARMONY_PROFILE_IDS.darkwave) {
    return candidate.inversion === 2 ? 1 : 0;
  }
  if (profile === HARMONY_PROFILE_IDS.midtempoCyberpunk) {
    return candidate.inversion === previous.inversion ? 1 : 0;
  }
  return 0;
}

export function selectFirstProgressionCandidate(
  profile: HarmonyProfileId,
  candidates: readonly ChordVoicingCandidate[],
): { candidate: ChordVoicingCandidate; preferenceRank: number } {
  let selected = candidates[0];
  let selectedRank = firstSlotPreferenceRank(profile, selected);
  for (const candidate of candidates.slice(1)) {
    const rank = firstSlotPreferenceRank(profile, candidate);
    if (
      rank < selectedRank ||
      (rank === selectedRank && compareFirstPitchTuples(candidate, selected) < 0)
    ) {
      selected = candidate;
      selectedRank = rank;
    }
  }
  return { candidate: selected, preferenceRank: selectedRank };
}

export function selectLaterProgressionCandidate(
  profile: HarmonyProfileId,
  candidates: readonly ChordVoicingCandidate[],
  previous: ChordVoicingCandidate,
  slotIndex: number,
  slotCount: number,
): { candidate: ChordVoicingCandidate; cost: number; preferenceRank: number } {
  let selected = candidates[0];
  let selectedCost = calculateVoiceLeadingCost(previous.voicing, selected.voicing);
  let selectedRank = laterSlotPreferenceRank(profile, selected, slotIndex, slotCount, previous);
  for (const candidate of candidates.slice(1)) {
    const cost = calculateVoiceLeadingCost(previous.voicing, candidate.voicing);
    const rank = laterSlotPreferenceRank(profile, candidate, slotIndex, slotCount, previous);
    if (
      cost < selectedCost ||
      (cost === selectedCost &&
        (rank < selectedRank ||
          (rank === selectedRank && compareStage4B3PitchTieBreak(candidate, selected) < 0)))
    ) {
      selected = candidate;
      selectedCost = cost;
      selectedRank = rank;
    }
  }
  return { candidate: selected, cost: selectedCost, preferenceRank: selectedRank };
}
