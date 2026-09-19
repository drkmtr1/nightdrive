// @vitest-environment node

import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { createArpRange } from "../music-domain/arpeggiator";
import {
  ARP_POLICY_DECISION_SLOT_V1_VALUES,
  type ArpPolicyDecisionSlotV1,
} from "../music-domain/arpeggiator-policy-configuration";
import {
  ARP_GENRE_PROFILE_CONFIGURATION_V1,
  buildArpWeightedCandidatesV1,
  type ArpGenreProfileConfigurationDataV1,
  type ArpPolicyCandidateByDecisionSlotV1,
} from "../music-domain/arpeggiator-profile-configuration";
import {
  resolveArpPlanV1,
  type ResolvedArpPlanV1,
} from "../music-domain/arpeggiator-policy-resolver";
import { projectResolvedArpPlanV1 } from "../music-domain/arpeggiator-resolved-plan-projector";
import { deriveComponentSeedV1 } from "../music-domain/component-seed";
import { ENERGY_V1_VALUES, type EnergyV1 } from "../music-domain/composition-intent";
import {
  getHarmonyTemplate,
  realizeHarmonyProgression,
  type HarmonyProfileId,
} from "../music-domain/harmony";
import { createKey } from "../music-domain/key";
import { createPitchClass } from "../music-domain/pitch";
import * as prng from "../music-domain/prng";
import type { WeightedCandidate } from "../music-domain/weighted-choice";
import { STAGE7_GOLDEN_CASES } from "./stage7-arpeggiator-fixtures";

// Existing resolver tests use this same module seam. Only the list provider is replaced;
// the resolver, seed derivation, five draws, weighted choice, gate mapping and projector run intact.
vi.mock("../music-domain/arpeggiator-profile-configuration", { spy: true });

const FINGERPRINT = "b6f7ee16f33cf649ae2c6f06e4b5eecf859409b1917e2bc641323857fc1956e8";
const LEVELS = ENERGY_V1_VALUES;
const SLOTS = ARP_POLICY_DECISION_SLOT_V1_VALUES;
type Candidate = ArpPolicyCandidateByDecisionSlotV1[ArpPolicyDecisionSlotV1];
type ResearchProfile = {
  profileId: HarmonyProfileId;
  slots: {
    slot: ArpPolicyDecisionSlotV1;
    candidates: Candidate[];
    energy: number[][];
    complexity: number[][];
  }[];
};
type Dataset = "v1" | "r1";
type Output = { plan: ResolvedArpPlanV1; planKey: string; eventKey: string };
type Tuple = [number, number, number, number];
type Metrics = {
  energyPlan: Tuple;
  energyEvents: Tuple;
  complexityPlan: Tuple;
  complexityEvents: Tuple;
  adjacent: number[];
  darkwave: number;
};

const document = readFileSync("docs/reviews/STAGE7_ARPEGGIATOR_V2_CALIBRATION.md", "utf8");
const json = document.match(/```json\r?\n([\s\S]*?)\r?\n```/)?.[1];
if (!json) throw new Error("Missing authoritative R1 JSON");
const r1 = JSON.parse(json) as ResearchProfile[];
if (createHash("sha256").update(JSON.stringify(r1)).digest("hex") !== FINGERPRINT) {
  throw new Error("Frozen R1 fingerprint mismatch");
}
function freezeTree(value: unknown): void {
  if (value && typeof value === "object") {
    for (const child of Object.values(value)) freezeTree(child);
    Object.freeze(value);
  }
}
freezeTree(r1);
const beforeR1 = JSON.stringify(r1);
const beforeV1 = JSON.stringify(ARP_GENRE_PROFILE_CONFIGURATION_V1);
const range = createArpRange({ minMidiPitch: 0, maxMidiPitch: 127 });
const contexts = STAGE7_GOLDEN_CASES.map((source) => {
  const template = getHarmonyTemplate(source.templateId);
  return realizeHarmonyProgression(
    source.profileId,
    template,
    createKey(createPitchClass(0), template.scale),
  );
});
const lists = {
  v1: new Map<string, readonly WeightedCandidate<Candidate>[]>(),
  r1: new Map<string, readonly WeightedCandidate<Candidate>[]>(),
};
let active: Dataset = "v1";

function listKey(
  profile: HarmonyProfileId,
  slot: ArpPolicyDecisionSlotV1,
  energy: EnergyV1,
  complexity: EnergyV1,
): string {
  return `${profile}/${slot}/${energy}/${complexity}`;
}

function diagnosticCandidates<TSlot extends ArpPolicyDecisionSlotV1>(
  _configuration: ArpGenreProfileConfigurationDataV1,
  profile: HarmonyProfileId,
  slot: TSlot,
  energy: EnergyV1,
  complexity: EnergyV1,
): readonly WeightedCandidate<ArpPolicyCandidateByDecisionSlotV1[TSlot]>[] {
  const result = lists[active].get(listKey(profile, slot, energy, complexity));
  if (!result) throw new Error("Missing frozen diagnostic list");
  return result as readonly WeightedCandidate<ArpPolicyCandidateByDecisionSlotV1[TSlot]>[];
}

beforeAll(async () => {
  const original = await vi.importActual<
    typeof import("../music-domain/arpeggiator-profile-configuration")
  >("../music-domain/arpeggiator-profile-configuration");
  expect(r1.map((profile) => profile.profileId)).toEqual(
    STAGE7_GOLDEN_CASES.map((source) => source.profileId),
  );
  for (const [profileIndex, profile] of r1.entries()) {
    expect(profile.slots.map((slot) => slot.slot)).toEqual(SLOTS);
    for (const [slotIndex, slot] of profile.slots.entries()) {
      const v1 = ARP_GENRE_PROFILE_CONFIGURATION_V1.profiles[profileIndex].decisionSlots[slotIndex];
      expect(slot.candidates).toEqual(v1.candidates);
      expect(slot.energy).toHaveLength(5);
      expect(slot.complexity).toHaveLength(5);
      for (const row of [...slot.energy, ...slot.complexity]) {
        expect(row).toHaveLength(slot.candidates.length);
        for (const value of row)
          expect(Number.isSafeInteger(value) && value >= 0 && value <= 65_535).toBe(true);
      }
      for (const [ei, energy] of LEVELS.entries()) {
        for (const [ci, complexity] of LEVELS.entries()) {
          const key = listKey(profile.profileId, slot.slot, energy, complexity);
          lists.v1.set(
            key,
            original.buildArpWeightedCandidatesV1(
              ARP_GENRE_PROFILE_CONFIGURATION_V1,
              profile.profileId,
              slot.slot,
              energy,
              complexity,
            ),
          );
          lists.r1.set(
            key,
            Object.freeze(
              slot.candidates.map((value, index) =>
                Object.freeze({
                  value,
                  weight: slot.energy[ei][index] + slot.complexity[ci][index],
                }),
              ),
            ),
          );
        }
      }
    }
  }
  vi.mocked(buildArpWeightedCandidatesV1).mockImplementation(diagnosticCandidates);
});

afterAll(() => {
  expect(JSON.stringify(r1)).toBe(beforeR1);
  expect(JSON.stringify(ARP_GENRE_PROFILE_CONFIGURATION_V1)).toBe(beforeV1);
  vi.restoreAllMocks();
});

// Equality uses all five plan fields and all three event fields in emitted order.
// Cache only projection by complete plan + profile, never policy selection or PRNG outputs.
function outputFactory() {
  const projections = new Map<string, string>();
  return (
    dataset: Dataset,
    profileIndex: number,
    energy: EnergyV1,
    complexity: EnergyV1,
    root: number,
  ): Output => {
    active = dataset;
    const plan = resolveArpPlanV1(
      { profileId: STAGE7_GOLDEN_CASES[profileIndex].profileId, energy, complexity },
      deriveComponentSeedV1(root, "arpeggiator"),
    );
    const planKey = JSON.stringify([
      plan.rate,
      plan.direction,
      plan.gateTicks,
      plan.octaveRange,
      plan.maskId,
    ]);
    const key = `${profileIndex}/${planKey}`;
    let eventKey = projections.get(key);
    if (eventKey === undefined) {
      eventKey = JSON.stringify(
        projectResolvedArpPlanV1(contexts[profileIndex], range, plan).map((event) => [
          event.pitch,
          event.startTick,
          event.durationTicks,
        ]),
      );
      projections.set(key, eventKey);
    }
    return { plan, planKey, eventKey };
  };
}

function emptyMetrics(): Metrics {
  return {
    energyPlan: [0, 0, 0, 0],
    energyEvents: [0, 0, 0, 0],
    complexityPlan: [0, 0, 0, 0],
    complexityEvents: [0, 0, 0, 0],
    adjacent: Array<number>(40).fill(0),
    darkwave: 0,
  };
}
function addTuple(target: Tuple, values: readonly Output[], key: "planKey" | "eventKey") {
  const a = values[0][key] === values[1][key];
  const b = values[1][key] === values[2][key];
  const c = values[0][key] === values[2][key];
  for (const [index, equal] of [a, b, c, a && b].entries()) target[index] += Number(equal);
}

function accumulate(metrics: Record<Dataset, Metrics>, firstRoot: number, lastRoot: number) {
  const output = outputFactory();
  for (let root = firstRoot; root <= lastRoot; root += 1) {
    for (const dataset of ["v1", "r1"] as const) {
      const grid = LEVELS.map((energy) =>
        LEVELS.map((complexity) => output(dataset, 3, energy, complexity, root)),
      );
      const energyPanel = [grid[0][2], grid[2][2], grid[4][2]];
      const complexityPanel = [grid[2][0], grid[2][2], grid[2][4]];
      addTuple(metrics[dataset].energyPlan, energyPanel, "planKey");
      addTuple(metrics[dataset].energyEvents, energyPanel, "eventKey");
      addTuple(metrics[dataset].complexityPlan, complexityPanel, "planKey");
      addTuple(metrics[dataset].complexityEvents, complexityPanel, "eventKey");
      // First 20 edges vary Energy at fixed Complexity; next 20 reverse the axes.
      for (let fixed = 0; fixed < 5; fixed += 1) {
        for (let edge = 0; edge < 4; edge += 1) {
          metrics[dataset].adjacent[fixed * 4 + edge] += Number(
            grid[edge][fixed].eventKey === grid[edge + 1][fixed].eventKey,
          );
          metrics[dataset].adjacent[20 + fixed * 4 + edge] += Number(
            grid[fixed][edge].eventKey === grid[fixed][edge + 1].eventKey,
          );
        }
      }
      metrics[dataset].darkwave += Number(
        output(dataset, 2, "medium", "very-low", root).eventKey ===
          output(dataset, 2, "medium", "very-high", root).eventKey,
      );
    }
    vi.mocked(buildArpWeightedCandidatesV1).mockClear();
  }
}

describe("frozen R1 diagnostic evidence", () => {
  it("verifies all 500 lists and the exact 40/20/25 preservation anchors", () => {
    expect(lists.r1.size).toBe(500);
    const weights = [...lists.r1.values()].flatMap((list) => list.map((entry) => entry.weight));
    const totals = [...lists.r1.values()].map((list) =>
      list.reduce((sum, entry) => sum + entry.weight, 0),
    );
    expect([Math.min(...weights), Math.max(...weights)]).toEqual([1, 14]);
    expect([Math.min(...totals), Math.max(...totals)]).toEqual([1, 27]);
    expect(weights.every(Number.isSafeInteger) && totals.every(Number.isSafeInteger)).toBe(true);
    let mediumRows = 0;
    let centers = 0;
    let controls = 0;
    for (const [pi, profile] of r1.entries()) {
      for (const [si, slot] of profile.slots.entries()) {
        const v1 = ARP_GENRE_PROFILE_CONFIGURATION_V1.profiles[pi].decisionSlots[si];
        expect(slot.energy[2]).toEqual(v1.energyWeights[2].values);
        expect(slot.complexity[2]).toEqual(v1.complexityAdditions[2].values);
        mediumRows += 2;
        const key = listKey(profile.profileId, slot.slot, "medium", "medium");
        expect(lists.r1.get(key)).toEqual(lists.v1.get(key));
        centers += 1;
        if (pi === 2)
          for (const energy of LEVELS) {
            const control = listKey(profile.profileId, slot.slot, energy, "medium");
            expect(lists.r1.get(control)).toEqual(lists.v1.get(control));
            controls += 1;
          }
      }
    }
    expect([mediumRows, centers, controls]).toEqual([40, 20, 25]);
  });

  it("retains representative same-seed plan/events across all preserved settings", () => {
    const output = outputFactory();
    for (const root of [0, 1, 255, 1024, 2047, 0xffff_ffff]) {
      for (let pi = 0; pi < 4; pi += 1)
        expect(output("r1", pi, "medium", "medium", root)).toEqual(
          output("v1", pi, "medium", "medium", root),
        );
      for (const energy of LEVELS)
        expect(output("r1", 2, energy, "medium", root)).toEqual(
          output("v1", 2, energy, "medium", root),
        );
    }
  });

  it("uses the accepted resolver's five draws including the singleton gate", () => {
    const step = vi.spyOn(prng, "nextMulberry32");
    try {
      vi.mocked(buildArpWeightedCandidatesV1).mockClear();
      outputFactory()("r1", 3, "medium", "medium", 0);
      expect(step).toHaveBeenCalledTimes(5);
      expect(vi.mocked(buildArpWeightedCandidatesV1).mock.calls.map((call) => call[2])).toEqual(
        SLOTS,
      );
    } finally {
      step.mockRestore();
    }
  });

  function computeFreshMetrics() {
    const metrics = { v1: emptyMetrics(), r1: emptyMetrics() };
    const random = vi.spyOn(Math, "random").mockImplementation(() => {
      throw new Error("Unexpected ambient randomness");
    });
    const clock = vi.spyOn(Date, "now").mockImplementation(() => {
      throw new Error("Unexpected clock input");
    });
    try {
      accumulate(metrics, 1024, 2047);
      return metrics;
    } finally {
      random.mockRestore();
      clock.mockRestore();
    }
  }

  it("matches both complete metric runs and every documented fresh-root total", () => {
    const first = computeFreshMetrics();
    const second = computeFreshMetrics();
    expect(second).toEqual(first);
    const { v1, r1: candidate } = first;
    expect(v1.energyPlan).toEqual([176, 252, 122, 35]);
    expect(v1.energyEvents).toEqual([176, 252, 122, 35]);
    expect(candidate.energyPlan).toEqual([166, 158, 107, 15]);
    expect(candidate.energyEvents).toEqual([166, 158, 107, 15]);
    expect(v1.complexityPlan).toEqual([127, 60, 72, 9]);
    expect(candidate.complexityPlan).toEqual([33, 58, 41, 2]);
    expect(v1.complexityEvents).toEqual([129, 73, 81, 13]);
    expect(candidate.complexityEvents).toEqual([39, 66, 49, 4]);
    expect(v1.adjacent.reduce((a, b) => a + b, 0)).toBe(9972);
    expect(candidate.adjacent.reduce((a, b) => a + b, 0)).toBe(4929);
    expect([v1.darkwave, candidate.darkwave]).toEqual([66, 70]);
    const regressions = candidate.adjacent.flatMap((value, index) =>
      value > v1.adjacent[index] ? [[index, v1.adjacent[index], value]] : [],
    );
    expect(regressions).toEqual([
      [1, 166, 180],
      [5, 170, 194],
      [13, 167, 182],
      [24, 40, 46],
      [30, 53, 61],
      [31, 60, 61],
      [32, 55, 56],
      [34, 59, 71],
      [39, 76, 80],
    ]);
    expect([
      candidate.adjacent.filter((value, index) => value < v1.adjacent[index]).length,
      candidate.adjacent.filter((value, index) => value === v1.adjacent[index]).length,
      regressions.length,
    ]).toEqual([28, 3, 9]);
  });

  it("retains the disclosed R1 Midtempo root-zero Energy collision", () => {
    const output = outputFactory();
    expect(output("r1", 3, "medium", "medium", 0)).toEqual(
      output("r1", 3, "very-high", "medium", 0),
    );
  });

  it("reproduces five historical V1 Midtempo projection collapses on roots 0..255", () => {
    const output = outputFactory();
    const roots: number[] = [];
    for (let root = 0; root <= 255; root += 1) {
      const low = output("v1", 3, "medium", "very-low", root);
      const high = output("v1", 3, "medium", "very-high", root);
      if (low.planKey !== high.planKey && low.eventKey === high.eventKey) {
        roots.push(root);
        expect([low.plan.direction, high.plan.direction].sort()).toEqual(["down-up", "up-down"]);
        expect(low.plan.maskId).toBe("alternating-rest-on");
        expect(high.plan.maskId).toBe("alternating-rest-on");
      }
    }
    expect(roots).toHaveLength(5);
  });
});
