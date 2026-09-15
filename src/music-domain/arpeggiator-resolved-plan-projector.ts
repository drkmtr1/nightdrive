import { ARP_DIRECTION_IDS, ARP_RATE_IDS, type ArpEvent, type ArpRange } from "./arpeggiator";
import { getArpDensityMaskV1 } from "./arpeggiator-density-mask";
import type { ResolvedArpPlanV1 } from "./arpeggiator-policy-resolver";
import { createArpDirectionCycleV1, getArpRateTicksV1 } from "./arpeggiator-projection-primitives";
import { ARP_OCTAVE_RANGE_V1_VALUES } from "./arpeggiator-policy-configuration";
import type { HarmonyProgressionRealization } from "./harmony";
import { createTick, V1_SECTION_LENGTH_TICKS, V1_TICKS_PER_BAR } from "./musical-time";
import { createMidiPitch, type MidiPitch } from "./pitch";

function invariant(condition: boolean, message: string): asserts condition {
  if (!condition) {
    throw new Error(`Resolved Arpeggiator projection invariant failed: ${message}`);
  }
}

function assertResolvedPlanV1(plan: ResolvedArpPlanV1): void {
  invariant(Object.values(ARP_RATE_IDS).includes(plan.rate), "unsupported rate");
  invariant(Object.values(ARP_DIRECTION_IDS).includes(plan.direction), "unsupported direction");
  invariant(ARP_OCTAVE_RANGE_V1_VALUES.includes(plan.octaveRange), "unsupported octave range");

  const selectedRateTicks = getArpRateTicksV1(plan.rate);
  invariant(
    Number.isSafeInteger(plan.gateTicks) &&
      plan.gateTicks >= 1 &&
      plan.gateTicks <= selectedRateTicks,
    "gate must fit the selected rate step",
  );
}

function deriveExpandedCandidates(
  selectedPitches: readonly MidiPitch[],
  range: ArpRange,
  octaveRange: ResolvedArpPlanV1["octaveRange"],
): readonly MidiPitch[] {
  const uniquePitches = new Set<number>();

  for (const selectedPitch of selectedPitches) {
    for (let octaveLevel = 0; octaveLevel < octaveRange; octaveLevel += 1) {
      const expandedPitch = selectedPitch + octaveLevel * 12;
      if (
        expandedPitch <= 127 &&
        expandedPitch >= range.minMidiPitch &&
        expandedPitch <= range.maxMidiPitch
      ) {
        uniquePitches.add(expandedPitch);
      }
    }
  }

  return Object.freeze([...uniquePitches].sort((left, right) => left - right).map(createMidiPitch));
}

export function projectResolvedArpPlanV1(
  progression: HarmonyProgressionRealization,
  range: ArpRange,
  plan: ResolvedArpPlanV1,
): readonly ArpEvent[] {
  assertResolvedPlanV1(plan);
  const selectedRateTicks = getArpRateTicksV1(plan.rate);
  const mask = getArpDensityMaskV1(plan.maskId);
  const events: ArpEvent[] = [];
  let slotStartTick = 0;

  for (const slot of progression.slots) {
    const slotDurationTicks = slot.bars * V1_TICKS_PER_BAR;
    invariant(
      slotDurationTicks % selectedRateTicks === 0,
      "slot duration must be divisible by the selected rate",
    );
    const slotEndTick = slotStartTick + slotDurationTicks;
    const candidates = deriveExpandedCandidates(slot.voicing.midiPitches, range, plan.octaveRange);
    invariant(candidates.length > 0, `slot ${slot.index} has no legal expanded pitch`);
    const directionCycle = createArpDirectionCycleV1(candidates.length, plan.direction);

    for (
      let stepStartTick = slotStartTick, slotStepIndex = 0;
      stepStartTick < slotEndTick;
      stepStartTick += selectedRateTicks, slotStepIndex += 1
    ) {
      const candidateIndex = directionCycle[slotStepIndex % directionCycle.length];
      if (mask[slotStepIndex % mask.length] === "on") {
        invariant(stepStartTick + plan.gateTicks <= slotEndTick, "event crosses its slot boundary");
        events.push(
          Object.freeze({
            pitch: candidates[candidateIndex],
            startTick: createTick(stepStartTick),
            durationTicks: plan.gateTicks,
          }),
        );
      }
    }

    slotStartTick = slotEndTick;
  }

  invariant(slotStartTick === V1_SECTION_LENGTH_TICKS, "projection misses the section boundary");
  return Object.freeze(events);
}
