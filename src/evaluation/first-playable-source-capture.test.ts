import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import * as arpPolicyGenerator from "../music-domain/arpeggiator-policy-generator";
import * as bassDomain from "../music-domain/bass";
import * as harmonyDomain from "../music-domain/harmony";
import {
  captureFirstPlayableSourceMatrix,
  captureFirstPlayableSourceRecord,
  FIRST_PLAYABLE_SOURCE_MATRIX,
} from "./first-playable-source-capture";

const EXPECTED_IDS = [
  "FP-01",
  "FP-02",
  "FP-03",
  "FP-04",
  "FP-05",
  "FP-06",
  "FP-07",
  "FP-08",
  "FP-09",
  "FP-10",
  "FP-11",
  "FP-12",
] as const;

function stable(value: unknown): string {
  return JSON.stringify(value);
}

function deeplyFrozen(value: unknown): boolean {
  if (typeof value !== "object" || value === null) return true;
  return (
    Object.isFrozen(value) &&
    Reflect.ownKeys(value).every((key) => deeplyFrozen(Reflect.get(value, key)))
  );
}

describe("First Playable upstream source capture", () => {
  it("constructs the exact ordered, fully expanded twelve-request matrix", () => {
    expect(FIRST_PLAYABLE_SOURCE_MATRIX.map(({ vectorId }) => vectorId)).toEqual(EXPECTED_IDS);
    expect(deeplyFrozen(FIRST_PLAYABLE_SOURCE_MATRIX)).toBe(true);
    expect(new Set(FIRST_PLAYABLE_SOURCE_MATRIX.map(({ vectorId }) => vectorId)).size).toBe(12);
    const requests = FIRST_PLAYABLE_SOURCE_MATRIX.map(({ request }) => request);
    for (const request of requests) {
      expect(Object.keys(request)).toEqual([
        "schema",
        "engineVersion",
        "generatorVersion",
        "section",
        "intent",
        "rootSeed",
        "bass",
        "arpeggiator",
        "profile",
        "harmony",
      ]);
      expect(request.bass).toBeDefined();
      expect(request.arpeggiator.profile.version).toBe("nightdrive.genre-profile.arpeggiator.v2");
      expect(request.arpeggiator.policy.version).toBe("nightdrive.arpeggiator-policy.v2");
    }
    expect(requests.slice(4).map((request) => request.profile.id)).toEqual(
      Array.from({ length: 8 }, () => "dark-synthwave"),
    );
    expect(requests.slice(4).map((request) => request.harmony.key.tonic)).toEqual([
      0, 0, 0, 0, 0, 0, 0, 1,
    ]);
    expect(
      requests.map((request) => [
        request.profile.id,
        request.harmony.templateId,
        request.harmony.key.tonic,
        request.harmony.key.scale,
      ]),
    ).toEqual([
      ["dark-synthwave", "degree-0654-natural-minor-v1", 0, "natural-minor"],
      ["classic-synthwave", "degree-0344-major-v1", 2, "major"],
      ["darkwave", "degree-0340-phrygian-v1", 4, "phrygian"],
      ["midtempo-cyberpunk", "degree-0654-phrygian-v1", 7, "phrygian"],
      ...Array.from({ length: 7 }, () => [
        "dark-synthwave",
        "degree-0654-natural-minor-v1",
        0,
        "natural-minor",
      ]),
      ["dark-synthwave", "degree-0654-natural-minor-v1", 1, "natural-minor"],
    ]);
    expect(
      requests.map((request) => [
        request.section.tempo.microsecondsPerQuarter,
        request.rootSeed,
        request.intent.energy,
        request.intent.complexity,
        request.bass?.range?.minMidiPitch,
        request.bass?.range?.maxMidiPitch,
        request.bass?.rhythm,
        request.arpeggiator.range.maxMidiPitch,
      ]),
    ).toEqual([
      [500000, 0, "medium", "medium", 36, 60, "sustained", 127],
      [500000, 0, "medium", "medium", 36, 60, "sustained", 127],
      [500000, 0, "medium", "medium", 36, 60, "sustained", 127],
      [500000, 0, "medium", "medium", 36, 60, "sustained", 127],
      [400001, 0, "medium", "medium", 36, 60, "sustained", 127],
      [500000, 4294967295, "medium", "medium", 36, 60, "sustained", 127],
      [500000, 0, "very-high", "medium", 36, 60, "sustained", 127],
      [500000, 0, "medium", "very-low", 36, 60, "sustained", 127],
      [500000, 0, "medium", "medium", 36, 60, "quarter-pulse", 127],
      [500000, 0, "medium", "medium", 24, 35, "sustained", 127],
      [500000, 0, "medium", "medium", 36, 60, "sustained", 126],
      [500000, 0, "medium", "medium", 36, 60, "sustained", 127],
    ]);
  });

  it("matches the twelve detached source records captured for this candidate", () => {
    const artifact = JSON.parse(
      readFileSync("docs/reviews/FIRST_PLAYABLE_SOURCE_RECORDS.json", "utf8"),
    ) as { schema: string; status: string; vectors: unknown[] };
    expect(artifact.schema).toBe("nightdrive.first-playable-source-records.v1");
    expect(artifact.status).toBe("CANDIDATE - NOT FROZEN OR ACCEPTED");
    expect(artifact.vectors).toHaveLength(12);
    expect(artifact.vectors).toEqual(captureFirstPlayableSourceMatrix());
  });

  it("uses exactly one Harmony realization shared by the accepted Bass and V2 APIs", () => {
    const harmonySpy = vi.spyOn(harmonyDomain, "realizeHarmonyProgression");
    const bassSpy = vi.spyOn(bassDomain, "generateBassEvents");
    const arpSpy = vi.spyOn(arpPolicyGenerator, "generateArpEventsWithPolicyV2");
    try {
      const records = captureFirstPlayableSourceMatrix();
      expect(records.map(({ vectorId }) => vectorId)).toEqual(EXPECTED_IDS);
      expect(harmonySpy).toHaveBeenCalledTimes(12);
      expect(bassSpy).toHaveBeenCalledTimes(12);
      expect(arpSpy).toHaveBeenCalledTimes(12);
      for (let index = 0; index < 12; index += 1) {
        const harmony = harmonySpy.mock.results[index]?.value;
        expect(bassSpy.mock.calls[index]?.[0]).toBe(harmony);
        expect(arpSpy.mock.calls[index]?.[0].progression).toBe(harmony);
      }
    } finally {
      harmonySpy.mockRestore();
      bassSpy.mockRestore();
      arpSpy.mockRestore();
    }
  });

  it("copies only the exact detached raw source shape and retains stable ordering", () => {
    const records = captureFirstPlayableSourceMatrix();
    expect(deeplyFrozen(records)).toBe(true);
    for (const record of records) {
      expect(Object.keys(record)).toEqual(["vectorId", "normalizedRequest", "components"]);
      expect(Object.keys(record.components)).toEqual(["harmony", "bass", "arpeggiator"]);
      expect(Object.hasOwn(record.components, "schema")).toBe(false);
      expect(Object.keys(record.components.harmony)).toEqual([
        "profile",
        "templateId",
        "templateVersion",
        "key",
        "slots",
      ]);
      expect(Object.keys(record.components.harmony.key as object)).toEqual(["tonic", "scale"]);
      for (const slot of record.components.harmony.slots as readonly Record<string, unknown>[]) {
        expect(Object.keys(slot)).toEqual([
          "index",
          "degree",
          "bars",
          "chord",
          "inversion",
          "voicing",
        ]);
        expect(Object.keys(slot.chord as object)).toEqual(["root", "quality"]);
        expect(Object.keys(slot.voicing as object)).toEqual(["midiPitches"]);
      }
      for (const events of [record.components.bass, record.components.arpeggiator]) {
        expect(
          events.every((event) => Object.keys(event).join(",") === "pitch,startTick,durationTicks"),
        ).toBe(true);
        expect(
          events.every((event, index) => {
            const previous = events[index - 1];
            return index === 0 || (previous !== undefined && event.startTick > previous.startTick);
          }),
        ).toBe(true);
      }
      const text = stable(record);
      for (const forbidden of [
        "componentHashes",
        "resultHash",
        "warnings",
        "adjacentCost",
        "rationale",
        "plan",
        "componentSeed",
        "candidateLists",
      ]) {
        expect(text).not.toContain(forbidden);
      }
    }
  });

  it("proves the selected semantic coverage and component isolation relations", () => {
    const records = captureFirstPlayableSourceMatrix();
    const byId = new Map(records.map((record) => [record.vectorId, record]));
    const at = (id: string) => {
      const record = byId.get(id);
      if (record === undefined) throw new Error(`Missing source record: ${id}`);
      return record;
    };
    const base = at("FP-01");

    expect(
      new Set(records.slice(0, 4).map((record) => stable(record.components.harmony))).size,
    ).toBe(4);
    expect(at("FP-01").components.bass).toHaveLength(4);
    expect(at("FP-09").components.bass).toHaveLength(32);
    expect(
      at("FP-10").components.bass.every((event) => event.pitch >= 24 && event.pitch <= 35),
    ).toBe(true);
    expect(at("FP-10").components.bass.map((event) => event.pitch)).not.toEqual(
      base.components.bass.map((event) => event.pitch),
    );
    expect(at("FP-11").components.arpeggiator.every((event) => event.pitch <= 126)).toBe(true);
    expect(at("FP-11").components.arpeggiator).toEqual(base.components.arpeggiator);

    for (const id of ["FP-05", "FP-06", "FP-07", "FP-08", "FP-09", "FP-10", "FP-11"]) {
      expect(at(id).components.harmony).toEqual(base.components.harmony);
    }
    expect(at("FP-12").components.harmony).not.toEqual(base.components.harmony);
    for (const id of ["FP-05", "FP-06", "FP-07", "FP-08", "FP-11"]) {
      expect(at(id).components.bass).toEqual(base.components.bass);
    }
    expect(at("FP-05").components.arpeggiator).toEqual(base.components.arpeggiator);
    expect(at("FP-09").components.arpeggiator).toEqual(base.components.arpeggiator);

    const timing = (events: readonly { startTick: number; durationTicks: number }[]) =>
      stable(events.map(({ startTick, durationTicks }) => [startTick, durationTicks]));
    expect(
      new Set(records.slice(0, 4).map((record) => timing(record.components.arpeggiator))).size,
    ).toBeGreaterThanOrEqual(2);
  });

  it("normalizes every accepted Bass-default alias to the FP-01 source request", () => {
    const matrixEntry = FIRST_PLAYABLE_SOURCE_MATRIX[0];
    if (matrixEntry === undefined) throw new Error("Missing FP-01 request.");
    const variants = [
      (() => {
        const { bass: _bass, ...withoutBass } = matrixEntry.request;
        return withoutBass as typeof matrixEntry.request;
      })(),
      { ...matrixEntry.request, bass: {} },
      { ...matrixEntry.request, bass: { range: { minMidiPitch: 36, maxMidiPitch: 60 } } },
      { ...matrixEntry.request, bass: { rhythm: "sustained" } },
      {
        ...matrixEntry.request,
        bass: { range: { minMidiPitch: 36, maxMidiPitch: 60 }, rhythm: "sustained" },
      },
    ];
    const captures = variants.map((variant) =>
      captureFirstPlayableSourceRecord("FP-01", variant as typeof matrixEntry.request),
    );
    expect(captures.every((capture) => stable(capture) === stable(captures[0]))).toBe(true);
    const invalid = [
      { ...matrixEntry.request, bass: undefined },
      { ...matrixEntry.request, bass: { range: undefined } },
      { ...matrixEntry.request, bass: { rhythm: undefined } },
    ];
    for (const request of invalid) {
      expect(() => captureFirstPlayableSourceRecord("FP-01", request as never)).toThrow(RangeError);
    }
  });

  it("is independent of ambient randomness", () => {
    const random = vi.spyOn(Math, "random").mockImplementation(() => {
      throw new Error("ambient randomness is prohibited during source capture");
    });
    try {
      expect(captureFirstPlayableSourceMatrix()).toHaveLength(12);
      expect(random).not.toHaveBeenCalled();
    } finally {
      random.mockRestore();
    }
  });

  it("does not import or call any prohibited canonical representation path", () => {
    const source = readFileSync("src/evaluation/first-playable-source-capture.ts", "utf8");
    for (const prohibited of [
      "generateFirstPlayableCompositionV1",
      "buildFirstPlayableCompositionV1",
      "serializeFirstPlayableComposition",
      "serializeFirstPlayableHarmonyComponentV1",
      "digestFirstPlayable",
      "verifyFirstPlayableCompositionV1",
      "serializeStage7ArpeggiatorAggregate",
      "stage7-digest",
      "createHash",
    ]) {
      expect(source).not.toContain(prohibited);
    }
  });
});
