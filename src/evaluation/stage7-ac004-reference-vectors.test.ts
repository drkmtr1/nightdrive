import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  advanceStage7Ac004Mulberry32,
  deriveStage7Ac004ComponentSeed,
  deriveStage7Ac004ReferenceVector,
  qualifyStage7Ac004Sha256,
  selectStage7Ac004Weighted,
  STAGE7_AC004_REFERENCE_GATE_TICKS,
  STAGE7_AC004_REFERENCE_RATE_TICKS,
} from "./stage7-ac004-reference-vectors";

const IDS = [
  "dark-synthwave-chorus-001",
  "classic-synthwave-chorus-001",
  "darkwave-verse-001",
  "cyberpunk-build-001",
] as const;

describe("Stage 7 AC-004 independent reference vectors", () => {
  it("qualifies platform SHA-256 for empty and non-ASCII UTF-8 input", () => {
    expect(qualifyStage7Ac004Sha256()).toEqual({
      empty: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
      utf8: "922d6035d7d97a748f782a8c121c6a236a3d3eb5af619f3c20663b4ad212e112",
    });
  });
  it("derives every frozen source deterministically without regenerating Harmony", () => {
    for (const sourceRecordId of IDS) {
      const request = {
        sourceRecordId,
        version: "v1" as const,
        energy: "medium" as const,
        complexity: "medium" as const,
        rootSeed: 0,
      };
      const first = deriveStage7Ac004ReferenceVector(request);
      const second = deriveStage7Ac004ReferenceVector(request);
      expect(second).toEqual(first);
      expect(first.aggregateHashInputJson).not.toContain("resultHash");
      expect(first.aggregateJson.endsWith(`"resultHash":"${first.resultHash}"}`)).toBe(true);
      expect(first.harmonyJson.charCodeAt(0)).not.toBe(0xfeff);
      expect(first.harmonyJson.endsWith("\n")).toBe(false);
    }
  });
  it("matches independent fixed component-seed and Mulberry32 vectors", () => {
    expect([0, 1, 0xffffffff, 0x12345678].map(deriveStage7Ac004ComponentSeed)).toEqual([
      2_011_937_067, 2_926_668_988, 561_390_553, 3_753_044_731,
    ]);
    expect([0, 1, 0xffffffff].map((seed) => advanceStage7Ac004Mulberry32(seed)[1])).toEqual([
      1_144_304_738, 2_693_262_067, 3_850_105_811,
    ]);
  });
  it("uses the accepted modulo weighted-choice boundaries", () => {
    expect(
      [0, 1, 2, 3].map((value) => selectStage7Ac004Weighted(value, ["a", "b"], [1, 2])),
    ).toEqual(["a", "b", "b", "a"]);
  });
  it("pins accepted rate, gate and event-timing literals", () => {
    expect(STAGE7_AC004_REFERENCE_RATE_TICKS).toEqual({
      quarter: 960,
      eighth: 480,
      sixteenth: 240,
    });
    expect(STAGE7_AC004_REFERENCE_GATE_TICKS).toEqual({
      quarter: { short: 480, medium: 720, long: 960 },
      eighth: { short: 240, medium: 360, long: 480 },
      sixteenth: { short: 120, medium: 180, long: 240 },
    });
    const quarter = deriveStage7Ac004ReferenceVector({
      sourceRecordId: IDS[2],
      version: "v1",
      energy: "very-low",
      complexity: "medium",
      rootSeed: 0,
    });
    const eighth = deriveStage7Ac004ReferenceVector({
      sourceRecordId: IDS[2],
      version: "v1",
      energy: "medium",
      complexity: "medium",
      rootSeed: 0,
    });
    const sixteenth = deriveStage7Ac004ReferenceVector({
      sourceRecordId: IDS[1],
      version: "v1",
      energy: "low",
      complexity: "medium",
      rootSeed: 0,
    });
    expect(quarter.plan).toMatchObject({ rate: "quarter", gateTicks: 960 });
    expect(quarter.events.slice(0, 4).map((event) => event.startTick)).toEqual([
      0, 3840, 7680, 11520,
    ]);
    expect(quarter.events).toHaveLength(8);
    expect(eighth.plan).toMatchObject({ rate: "eighth", gateTicks: 480 });
    expect(eighth.events.slice(0, 4).map((event) => event.startTick)).toEqual([
      480, 1440, 2400, 3360,
    ]);
    expect(eighth.events).toHaveLength(32);
    expect(sixteenth.plan).toMatchObject({ rate: "sixteenth", gateTicks: 180 });
    expect(sixteenth.events.slice(0, 4).map((event) => event.startTick)).toEqual([
      0, 240, 480, 720,
    ]);
    expect(sixteenth.events).toHaveLength(128);
  });
  it("supports both accepted version pairs and root boundaries", () => {
    for (const sourceRecordId of IDS) {
      expect(
        deriveStage7Ac004ReferenceVector({
          sourceRecordId,
          version: "v1",
          energy: "medium",
          complexity: "medium",
          rootSeed: 0,
        }).version,
      ).toBe("v1");
      expect(
        deriveStage7Ac004ReferenceVector({
          sourceRecordId,
          version: "v2",
          energy: "medium",
          complexity: "medium",
          rootSeed: 0xffffffff,
        }).version,
      ).toBe("v2");
    }
  });
  it("supports the minimum accepted matrix and a non-medium distinguishing case", () => {
    for (const sourceRecordId of IDS) {
      for (const version of ["v1", "v2"] as const) {
        for (const rootSeed of [0, 0xffffffff]) {
          const vector = deriveStage7Ac004ReferenceVector({
            sourceRecordId,
            version,
            energy: "medium",
            complexity: "medium",
            rootSeed,
          });
          expect(vector.byteLengths.aggregate).toBeGreaterThan(0);
        }
      }
    }
    const medium = deriveStage7Ac004ReferenceVector({
      sourceRecordId: IDS[3],
      version: "v1",
      energy: "medium",
      complexity: "medium",
      rootSeed: 0,
    });
    const nonMedium = deriveStage7Ac004ReferenceVector({
      sourceRecordId: IDS[3],
      version: "v1",
      energy: "very-high",
      complexity: "very-low",
      rootSeed: 0,
    });
    expect(nonMedium.aggregateJson).not.toBe(medium.aggregateJson);
  });
  it("preserves canonical field order and serialization boundaries", () => {
    const vector = deriveStage7Ac004ReferenceVector({
      sourceRecordId: IDS[1],
      version: "v1",
      energy: "medium",
      complexity: "medium",
      rootSeed: 0,
    });
    expect(Object.keys(vector.plan)).toEqual([
      "rate",
      "direction",
      "gateTicks",
      "octaveRange",
      "maskId",
    ]);
    expect(Object.keys(JSON.parse(vector.harmonyJson))).toEqual(["schema", "section", "harmony"]);
    expect(Object.keys(JSON.parse(vector.arpeggiatorJson))).toEqual([
      "schema",
      "section",
      "events",
    ]);
    expect(Object.keys(JSON.parse(vector.aggregateHashInputJson))).toEqual([
      "schema",
      "engineVersion",
      "generatorVersion",
      "section",
      "components",
      "provenance",
      "componentHashes",
      "warnings",
    ]);
    expect(Object.keys(JSON.parse(vector.aggregateJson)).at(-1)).toBe("resultHash");
    for (const json of [
      vector.harmonyJson,
      vector.arpeggiatorJson,
      vector.aggregateHashInputJson,
      vector.aggregateJson,
    ]) {
      expect(json.startsWith("\ufeff")).toBe(false);
      expect(json.endsWith("\n")).toBe(false);
    }
  });
  it("projects masks, octave bounds, traversal and gate timing independently", () => {
    const vector = deriveStage7Ac004ReferenceVector({
      sourceRecordId: IDS[2],
      version: "v1",
      energy: "very-low",
      complexity: "medium",
      rootSeed: 0,
    });
    expect(vector.events.length).toBeGreaterThan(0);
    expect(
      vector.events.every(
        (event) => event.pitch >= 0 && event.pitch <= 127 && event.durationTicks > 0,
      ),
    ).toBe(true);
    expect(
      vector.events.every(
        (event, index) => index === 0 || event.startTick > vector.events[index - 1]?.startTick,
      ),
    ).toBe(true);
    expect(
      Math.max(...vector.events.map((event) => event.startTick + event.durationTicks)),
    ).toBeLessThanOrEqual(30720);
    expect(
      vector.events.some(
        (event, index) =>
          index > 0 && event.startTick - (vector.events[index - 1]?.startTick ?? 0) > 480,
      ),
    ).toBe(true);
  });
  it("contains no prohibited production oracle imports or expectation-update mechanism", () => {
    const source = readFileSync("src/evaluation/stage7-ac004-reference-vectors.ts", "utf8");
    for (const prohibited of [
      "../composition/",
      "generateStage7ArpeggiatorAggregateV1",
      "serializeStage7ArpeggiatorAggregateV1",
      "serializeStage7ArpeggiatorAggregateHashInputV1",
      "digestStage7HarmonyComponentV1",
      "digestStage7ArpeggiatorComponentV1",
      "digestStage7ArpeggiatorAggregateV1",
      "verifyStage7ArpeggiatorAggregateV1",
      "../music-domain/arpeggiator-policy-generator",
      "../music-domain/arpeggiator-policy-resolver",
      "../music-domain/arpeggiator-resolved-plan-projector",
      "stage7-digest",
      "realizeHarmonyTemplate",
      "generateHarmony",
      "serializeStage7",
      "generateArpEvents",
      "snapshot-update",
      "accept current output",
      "--update",
    ])
      expect(source).not.toContain(prohibited);
  });
});
