// @vitest-environment node

import process from "node:process";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  type CompleteSectionRequestV1,
  CompleteSectionValueError,
  serializeCompleteSectionV1,
} from "../composition/complete-section";
import * as nodeAdapter from "./complete-section-node";
import { generateCompleteSectionPreviewForAuditionV1 } from "./complete-section-preview-node";

function request(): CompleteSectionRequestV1 {
  return {
    schema: "nightdrive.complete-section-request.v1",
    engineVersion: "nightdrive.engine.complete-section.v1",
    generatorVersion: "nightdrive.generator.complete-section.v1",
    composition: {
      schema: "nightdrive.first-playable-composition-request.v1",
      engineVersion: "nightdrive.engine.first-playable-composition.v1",
      generatorVersion: "nightdrive.generator.first-playable-composition.v1",
      profile: { id: "dark-synthwave" },
      harmony: {
        templateId: "degree-0654-natural-minor-v1",
        templateVersion: "v1",
        key: {
          tonic: 0,
          scale: "natural-minor",
        } as CompleteSectionRequestV1["composition"]["harmony"]["key"],
      },
      section: {
        tempo: {
          microsecondsPerQuarter: 500000,
        } as CompleteSectionRequestV1["composition"]["section"]["tempo"],
      },
      intent: { energy: "medium", complexity: "medium" },
      rootSeed: 0,
      arpeggiator: {
        range: {
          minMidiPitch: 36,
          maxMidiPitch: 84,
        } as CompleteSectionRequestV1["composition"]["arpeggiator"]["range"],
        profile: { version: "nightdrive.genre-profile.arpeggiator.v2" },
        policy: { version: "nightdrive.arpeggiator-policy.v2" },
        seedDerivation: { version: "nightdrive.seed-derivation.component.v1" },
        prng: { version: "nightdrive.prng.mulberry32.v1" },
      },
    },
    motif: {
      schema: "nightdrive.motif-generation-request.v1",
      generatorVersion: "nightdrive.generator.motif.v1",
      profile: { version: "nightdrive.genre-profile.motif.v1" },
      policyVersion: "nightdrive.motif-policy.v1",
    },
  };
}

// Literal source pitches/timings reuse the independently reviewed complete-section
// fixture in generators/complete-section.test.ts at integrated PR #275.
// Expected values do not come from this projection or a generated result.
const EXPECTED_TRACKS = [
  {
    role: "harmony",
    notes: [
      [36, 39, 43],
      [38, 41, 46],
      [36, 39, 44],
      [38, 43, 47],
    ].flatMap((pitches, slot) =>
      pitches.map((pitch) => ({ pitch, startTick: slot * 7680, durationTicks: 7680 })),
    ),
  },
  {
    role: "bass",
    notes: [48, 46, 44, 43].map((pitch, slot) => ({
      pitch,
      startTick: slot * 7680,
      durationTicks: 7680,
    })),
  },
  {
    role: "arpeggiator",
    notes: [
      [55, 51, 43, 39, 36, 51, 48, 43, 36, 55, 51, 43],
      [58, 53, 46, 41, 38, 53, 50, 46, 38, 58, 53, 46],
      [56, 51, 44, 39, 36, 51, 48, 44, 36, 56, 51, 44],
      [59, 55, 47, 43, 38, 55, 50, 47, 38, 59, 55, 47],
    ].flatMap((pitches, slot) =>
      pitches.map((pitch, index) => {
        const offset = [0, 480, 1440, 1920, 2400, 3360, 3840, 4320, 5280, 5760, 6240, 7200][index];
        if (offset === undefined) throw new Error("Missing literal Arpeggiator onset.");
        return { pitch, startTick: slot * 7680 + offset, durationTicks: 360 };
      }),
    ),
  },
  {
    role: "lead",
    notes: [75, 79, 79, 75, 74, 77, 77, 74, 80, 84, 84, 80, 79, 79, 79, 74].map((pitch, index) => ({
      pitch,
      startTick: index * 1920,
      durationTicks: 960,
    })),
  },
];

describe("derived complete-section preview", () => {
  const originalVersion = Object.getOwnPropertyDescriptor(process.versions, "node");
  afterEach(() => {
    vi.restoreAllMocks();
    if (originalVersion === undefined) throw new Error("Missing Node identity.");
    Object.defineProperty(process.versions, "node", originalVersion);
  });

  it("delegates once with unchanged input and projects all four literal tracks in source order", async () => {
    const input = request();
    const before = structuredClone(input);
    const generate = vi.spyOn(nodeAdapter, "generateCompleteSectionForAuditionV1");
    const preview = await generateCompleteSectionPreviewForAuditionV1(input);
    expect(generate).toHaveBeenCalledTimes(1);
    expect(generate.mock.calls[0]?.[0]).toBe(input);
    expect(input).toEqual(before);
    expect(preview).toEqual({
      sourceResultHash: "0eb122a36f7c90e6b58c4d3017d21a051a81ed54bee1b98d00a40e3adcc66fa1",
      section: {
        ppq: 960,
        barCount: 8,
        timeSignature: { numerator: 4, denominator: 4 },
        tempo: { microsecondsPerQuarter: 500000 },
        endTick: 30720,
      },
      tracks: EXPECTED_TRACKS,
    });
    for (const track of preview.tracks) {
      for (const note of track.notes) {
        expect(note.startTick + note.durationTicks).toBeLessThanOrEqual(preview.section.endTick);
      }
    }
    expect(preview.tracks[0]?.notes.at(-1)).toEqual({
      pitch: 47,
      startTick: 23040,
      durationTicks: 7680,
    });
  });

  it("detaches every nested object, keeps source canonical bytes unchanged, and freezes the whole preview", async () => {
    const source = await nodeAdapter.generateCompleteSectionForAuditionV1(request());
    const sourceBytes = serializeCompleteSectionV1(source);
    vi.spyOn(nodeAdapter, "generateCompleteSectionForAuditionV1").mockResolvedValueOnce(source);
    const preview = await generateCompleteSectionPreviewForAuditionV1(request());
    const sourceObjects = new Set<object>();
    const collect = (value: unknown): void => {
      if (value === null || typeof value !== "object") return;
      sourceObjects.add(value);
      for (const child of Object.values(value)) collect(child);
    };
    collect(source);
    const inspect = (value: unknown): void => {
      if (value === null || typeof value !== "object") return;
      expect(sourceObjects.has(value)).toBe(false);
      expect(Object.isFrozen(value)).toBe(true);
      expect(Reflect.set(value, "unexpected", true)).toBe(false);
      for (const key of Reflect.ownKeys(value)) {
        const child = Object.getOwnPropertyDescriptor(value, key)?.value;
        expect(Reflect.set(value, key, "mutation")).toBe(false);
        inspect(child);
      }
    };
    inspect(preview);
    expect(serializeCompleteSectionV1(source)).toBe(sourceBytes);
    expect(preview.tracks).toEqual(EXPECTED_TRACKS);
    expect(JSON.parse(JSON.stringify(preview))).toEqual(preview);
  });

  it("replays identical data and preserves ticks at a different accepted tempo", async () => {
    const first = await generateCompleteSectionPreviewForAuditionV1(request());
    const replay = await generateCompleteSectionPreviewForAuditionV1(request());
    expect(JSON.stringify(replay)).toBe(JSON.stringify(first));
    const input = request();
    const slower = {
      ...input,
      composition: {
        ...input.composition,
        section: {
          tempo: {
            microsecondsPerQuarter: 750000,
          } as CompleteSectionRequestV1["composition"]["section"]["tempo"],
        },
      },
    };
    const preview = await generateCompleteSectionPreviewForAuditionV1(slower);
    expect(preview.section.tempo.microsecondsPerQuarter).toBe(750000);
    expect(preview.section.endTick).toBe(30720);
    expect(preview.tracks).toEqual(EXPECTED_TRACKS);
    expect(preview.sourceResultHash).not.toBe(first.sourceResultHash);
  });

  it("preserves accepted invalid-request errors without delivering a preview", async () => {
    const generate = vi.spyOn(nodeAdapter, "generateCompleteSectionForAuditionV1");
    await expect(
      generateCompleteSectionPreviewForAuditionV1({ ...request(), schema: "invalid" } as never),
    ).rejects.toMatchObject({ code: "UNSUPPORTED_COMPLETE_SECTION_SCHEMA", field: "schema" });
    expect(generate).toHaveBeenCalledTimes(1);
  });

  it("propagates the exact delegated failure without retry or partial output", async () => {
    const failure = new CompleteSectionValueError(
      "INVALID_COMPLETE_SECTION_REQUEST",
      "request",
      "delegated failure",
    );
    const generate = vi
      .spyOn(nodeAdapter, "generateCompleteSectionForAuditionV1")
      .mockRejectedValueOnce(failure);
    const resolved = vi.fn();
    const operation = generateCompleteSectionPreviewForAuditionV1(request());
    void operation.then(resolved, () => undefined);
    await expect(operation).rejects.toBe(failure);
    expect(resolved).not.toHaveBeenCalled();
    expect(generate).toHaveBeenCalledTimes(1);
  });

  it("retains the integrated Node runtime gate before any preview can be produced", async () => {
    Object.defineProperty(process.versions, "node", { value: "22.17.1", configurable: true });
    await expect(generateCompleteSectionPreviewForAuditionV1(request())).rejects.toThrow(
      "Complete-section audition generation requires Node 24.21.0.",
    );
  });
});
