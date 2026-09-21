import { readFileSync } from "node:fs";

import { describe, expect, it, vi } from "vitest";

import {
  serializeStage7ArpeggiatorComponentV1,
  serializeStage7HarmonyComponentV1,
  Stage7AggregateValueError,
} from "../composition/stage7-arpeggiator-aggregate";

import {
  digestStage7ArpeggiatorComponentV1,
  digestStage7HarmonyComponentV1,
} from "./stage7-component-hashes";

const SECTION = Object.freeze({
  ppq: 960,
  barCount: 8,
  timeSignature: Object.freeze({ numerator: 4, denominator: 4 }),
  tempo: Object.freeze({ microsecondsPerQuarter: 500_000 }),
});

const HARMONY = Object.freeze({
  profile: "classic-synthwave",
  templateId: "degree-0344-major-v1",
  templateVersion: "v1",
  key: Object.freeze({ tonic: 0, scale: "major" }),
  slots: Object.freeze([
    Object.freeze({
      index: 0,
      degree: 0,
      bars: 2,
      chord: Object.freeze({ root: 0, quality: "major-triad" }),
      inversion: 0,
      voicing: Object.freeze({ midiPitches: Object.freeze([48, 52, 55]) }),
    }),
    Object.freeze({
      index: 1,
      degree: 3,
      bars: 2,
      chord: Object.freeze({ root: 5, quality: "major-triad" }),
      inversion: 2,
      voicing: Object.freeze({ midiPitches: Object.freeze([48, 53, 57]) }),
    }),
    Object.freeze({
      index: 2,
      degree: 4,
      bars: 2,
      chord: Object.freeze({ root: 7, quality: "major-triad" }),
      inversion: 1,
      voicing: Object.freeze({ midiPitches: Object.freeze([47, 50, 55]) }),
    }),
    Object.freeze({
      index: 3,
      degree: 0,
      bars: 2,
      chord: Object.freeze({ root: 0, quality: "major-triad" }),
      inversion: 0,
      voicing: Object.freeze({ midiPitches: Object.freeze([48, 52, 55]) }),
    }),
  ]),
});

const EVENTS = Object.freeze([
  Object.freeze({ pitch: 48, startTick: 0, durationTicks: 240 }),
  Object.freeze({ pitch: 52, startTick: 480, durationTicks: 240 }),
]);

const EXPECTED_HARMONY_JSON =
  '{"schema":"nightdrive.stage7-harmony-component.v1","section":{"ppq":960,"barCount":8,"timeSignature":{"schema":"nightdrive.time-signature.v1","numerator":4,"denominator":4},"tempo":{"schema":"nightdrive.tempo.v1","microsecondsPerQuarter":500000}},"harmony":{"profile":"classic-synthwave","templateId":"degree-0344-major-v1","templateVersion":"v1","key":{"schema":"nightdrive.key.v1","tonicSemitoneClass":0,"scale":"major"},"slots":[{"index":0,"degree":0,"bars":2,"chord":{"schema":"nightdrive.chord.v1","rootSemitoneClass":0,"quality":"major-triad"},"inversion":{"schema":"nightdrive.chord-inversion.v1","memberIndex":0},"voicing":{"schema":"nightdrive.chord-voicing.v1","midiPitches":[48,52,55]}},{"index":1,"degree":3,"bars":2,"chord":{"schema":"nightdrive.chord.v1","rootSemitoneClass":5,"quality":"major-triad"},"inversion":{"schema":"nightdrive.chord-inversion.v1","memberIndex":2},"voicing":{"schema":"nightdrive.chord-voicing.v1","midiPitches":[48,53,57]}},{"index":2,"degree":4,"bars":2,"chord":{"schema":"nightdrive.chord.v1","rootSemitoneClass":7,"quality":"major-triad"},"inversion":{"schema":"nightdrive.chord-inversion.v1","memberIndex":1},"voicing":{"schema":"nightdrive.chord-voicing.v1","midiPitches":[47,50,55]}},{"index":3,"degree":0,"bars":2,"chord":{"schema":"nightdrive.chord.v1","rootSemitoneClass":0,"quality":"major-triad"},"inversion":{"schema":"nightdrive.chord-inversion.v1","memberIndex":0},"voicing":{"schema":"nightdrive.chord-voicing.v1","midiPitches":[48,52,55]}}]}}';
const EXPECTED_ARPEGGIATOR_JSON =
  '{"schema":"nightdrive.stage7-arpeggiator-component.v1","section":{"ppq":960,"barCount":8,"timeSignature":{"schema":"nightdrive.time-signature.v1","numerator":4,"denominator":4},"tempo":{"schema":"nightdrive.tempo.v1","microsecondsPerQuarter":500000}},"events":[{"pitch":48,"startTick":0,"durationTicks":240},{"pitch":52,"startTick":480,"durationTicks":240}]}';
const EXPECTED_HARMONY_DIGEST = "35ec12d8ee6b061afb58e10f4c5700d98a698e3794ff3b1f16db01f35b51b24b";
const EXPECTED_ARPEGGIATOR_DIGEST =
  "ecc58e45c8693c7c0e1c1880c2ae25904cdd93cbc10f236cbf6438c44cb1079b";

function reverseRecordOrder(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(reverseRecordOrder);
  if (typeof value !== "object" || value === null) return value;
  return Object.fromEntries(
    Object.entries(value)
      .reverse()
      .map(([key, nested]) => [key, reverseRecordOrder(nested)]),
  );
}

describe("Stage 7 component canonical projections and hashes", () => {
  it("emits the literal canonical Harmony component JSON and digest", () => {
    expect(serializeStage7HarmonyComponentV1(SECTION, HARMONY)).toBe(EXPECTED_HARMONY_JSON);
    expect(digestStage7HarmonyComponentV1(SECTION, HARMONY)).toBe(EXPECTED_HARMONY_DIGEST);
  });

  it("emits the literal canonical Arpeggiator component JSON and digest", () => {
    expect(serializeStage7ArpeggiatorComponentV1(SECTION, EVENTS)).toBe(EXPECTED_ARPEGGIATOR_JSON);
    expect(digestStage7ArpeggiatorComponentV1(SECTION, EVENTS)).toBe(EXPECTED_ARPEGGIATOR_DIGEST);
  });

  it("owns schema key order rather than caller record construction order", () => {
    expect(
      serializeStage7HarmonyComponentV1(reverseRecordOrder(SECTION), reverseRecordOrder(HARMONY)),
    ).toBe(EXPECTED_HARMONY_JSON);
    expect(
      serializeStage7ArpeggiatorComponentV1(
        reverseRecordOrder(SECTION),
        reverseRecordOrder(EVENTS),
      ),
    ).toBe(EXPECTED_ARPEGGIATOR_JSON);
  });

  it("binds the same canonical section into both component domains", () => {
    const changedSection = {
      ...SECTION,
      tempo: { microsecondsPerQuarter: 500_001 },
    };
    expect(serializeStage7HarmonyComponentV1(changedSection, HARMONY)).not.toBe(
      EXPECTED_HARMONY_JSON,
    );
    expect(serializeStage7ArpeggiatorComponentV1(changedSection, EVENTS)).not.toBe(
      EXPECTED_ARPEGGIATOR_JSON,
    );
    expect(digestStage7HarmonyComponentV1(changedSection, HARMONY)).not.toBe(
      EXPECTED_HARMONY_DIGEST,
    );
    expect(digestStage7ArpeggiatorComponentV1(changedSection, EVENTS)).not.toBe(
      EXPECTED_ARPEGGIATOR_DIGEST,
    );
  });

  it("keeps Harmony and Arpeggiator component domains isolated", () => {
    const changedEvents = [{ pitch: 48, startTick: 0, durationTicks: 120 }];
    const changedHarmony = {
      ...HARMONY,
      slots: HARMONY.slots.map((slot, index) =>
        index === 0 ? { ...slot, voicing: { midiPitches: [60, 64, 67] } } : slot,
      ),
    };

    expect(digestStage7HarmonyComponentV1(SECTION, HARMONY)).toBe(EXPECTED_HARMONY_DIGEST);
    expect(digestStage7HarmonyComponentV1(SECTION, changedHarmony)).not.toBe(
      EXPECTED_HARMONY_DIGEST,
    );
    expect(digestStage7ArpeggiatorComponentV1(SECTION, EVENTS)).toBe(EXPECTED_ARPEGGIATOR_DIGEST);
    expect(digestStage7ArpeggiatorComponentV1(SECTION, changedEvents)).not.toBe(
      EXPECTED_ARPEGGIATOR_DIGEST,
    );
  });

  it("rejects caller toJSON without invoking it", () => {
    const section = { ...SECTION } as Record<string, unknown>;
    const toJSON = vi.fn();
    Object.defineProperty(section, "toJSON", { value: toJSON, enumerable: false });

    expect(() => serializeStage7HarmonyComponentV1(section, HARMONY)).toThrow(
      Stage7AggregateValueError,
    );
    expect(toJSON).not.toHaveBeenCalled();
  });

  it("uses the accepted digest adapter rather than direct crypto", () => {
    const source = readFileSync("src/generators/stage7-component-hashes.ts", "utf8");

    expect(source).toContain('from "./adapters/stage7-digest"');
    expect(source).not.toMatch(/node:|createHash|TextEncoder/u);
  });
});
