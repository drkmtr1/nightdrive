// @vitest-environment node

import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import { createArpRange } from "../music-domain/arpeggiator";
import {
  ARP_POLICY_VERSION_V1,
  ARP_POLICY_VERSION_V2,
  ARP_PROFILE_DATA_VERSION_V1,
  ARP_PROFILE_DATA_VERSION_V2,
} from "../music-domain/arpeggiator-policy-configuration";
import { COMPONENT_SEED_DERIVATION_VERSION_V1 } from "../music-domain/component-seed";
import {
  getHarmonyTemplatesForProfile,
  HARMONY_PROFILE_IDS,
  type HarmonyProfileId,
  realizeHarmonyProgression,
} from "../music-domain/harmony";
import { createKey } from "../music-domain/key";
import {
  createDurationTicks,
  createTempoFromMicrosecondsPerQuarter,
  createTick,
  V1_TIME_SIGNATURE,
} from "../music-domain/musical-time";
import { createMidiPitch, createPitchClass } from "../music-domain/pitch";
import { PRNG_ALGORITHM_ID } from "../music-domain/prng";
import {
  STAGE7_AGGREGATE_ENGINE_VERSION_V1,
  STAGE7_ARPEGGIATOR_AGGREGATE_SCHEMA_V1,
  STAGE7_ARPEGGIATOR_COMPONENT_SCHEMA_V1,
  STAGE7_ARPEGGIATOR_GENERATOR_VERSION_V1,
  STAGE7_HARMONY_COMPONENT_SCHEMA_V1,
  Stage7AggregateValueError,
  projectStage7HarmonyContextV1,
  serializeStage7ArpeggiatorAggregateV1,
  type Stage7ArpeggiatorAggregateV1,
  validateStage7ArpeggiatorAggregateV1,
} from "./stage7-arpeggiator-aggregate";

const DIGEST_A = "a".repeat(64);
const DIGEST_B = "b".repeat(64);
const DIGEST_C = "c".repeat(64);
const TOP_LEVEL_FIELDS = [
  "schema",
  "engineVersion",
  "generatorVersion",
  "section",
  "components",
  "provenance",
  "componentHashes",
  "warnings",
  "resultHash",
] as const;

function progression(profile: HarmonyProfileId = HARMONY_PROFILE_IDS.classicSynthwave) {
  const template = getHarmonyTemplatesForProfile(profile)[0];
  if (template === undefined) throw new Error(`Missing Harmony template for ${profile}.`);
  return realizeHarmonyProgression(
    profile,
    template,
    createKey(createPitchClass(0), template.scale),
  );
}

const CLASSIC_SYNTHWAVE_HARMONY = projectStage7HarmonyContextV1(progression());

function aggregate(version: "v1" | "v2" = "v1"): Stage7ArpeggiatorAggregateV1 {
  const profile = HARMONY_PROFILE_IDS.classicSynthwave;
  return {
    schema: STAGE7_ARPEGGIATOR_AGGREGATE_SCHEMA_V1,
    engineVersion: STAGE7_AGGREGATE_ENGINE_VERSION_V1,
    generatorVersion: STAGE7_ARPEGGIATOR_GENERATOR_VERSION_V1,
    section: {
      ppq: 960,
      barCount: 8,
      timeSignature: V1_TIME_SIGNATURE,
      tempo: createTempoFromMicrosecondsPerQuarter(500_000),
    },
    components: {
      harmony: CLASSIC_SYNTHWAVE_HARMONY,
      arpeggiator: [
        {
          pitch: createMidiPitch(48),
          startTick: createTick(0),
          durationTicks: createDurationTicks(240),
        },
        {
          pitch: createMidiPitch(52),
          startTick: createTick(480),
          durationTicks: createDurationTicks(240),
        },
      ],
    },
    provenance: {
      profile: {
        id: profile,
        version: version === "v1" ? ARP_PROFILE_DATA_VERSION_V1 : ARP_PROFILE_DATA_VERSION_V2,
      },
      policy: {
        version: version === "v1" ? ARP_POLICY_VERSION_V1 : ARP_POLICY_VERSION_V2,
      },
      seedDerivation: { version: COMPONENT_SEED_DERIVATION_VERSION_V1 },
      prng: { version: PRNG_ALGORITHM_ID },
      rootSeed: 0,
      normalizedInputs: {
        intent: { energy: "medium", complexity: "medium" },
        range: createArpRange({ minMidiPitch: 0, maxMidiPitch: 127 }),
      },
      parent: null,
    },
    componentHashes: { harmony: DIGEST_A, arpeggiator: DIGEST_B },
    warnings: [],
    resultHash: DIGEST_C,
  };
}

function mutableFixture(version: "v1" | "v2" = "v1"): Record<string, unknown> {
  return structuredClone(aggregate(version)) as unknown as Record<string, unknown>;
}

function setNested(root: unknown, path: readonly (string | number)[], value: unknown): void {
  let current = root as Record<PropertyKey, unknown>;
  for (let index = 0; index < path.length - 1; index += 1) {
    current = current[path[index] as PropertyKey] as Record<PropertyKey, unknown>;
  }
  current[path[path.length - 1] as PropertyKey] = value;
}

function expectAggregateError(value: unknown, field: string): Stage7AggregateValueError {
  try {
    validateStage7ArpeggiatorAggregateV1(value);
    throw new Error("Expected Stage7AggregateValueError.");
  } catch (error) {
    expect(error).toBeInstanceOf(Stage7AggregateValueError);
    expect(error).toMatchObject({ code: "INVALID_AGGREGATE_RESULT", field });
    return error as Stage7AggregateValueError;
  }
}

function recursivelyFrozen(value: unknown): boolean {
  if (typeof value !== "object" || value === null) return true;
  if (!Object.isFrozen(value)) return false;
  return Reflect.ownKeys(value).every((key) => recursivelyFrozen(Reflect.get(value, key)));
}

describe("Stage 7 aggregate canonical Harmony projection", () => {
  it("projects only canonical Harmony state while preserving order and selected voicings", () => {
    const source = structuredClone(progression()) as ReturnType<typeof progression>;
    const sourceBefore = structuredClone(source);
    const projected = projectStage7HarmonyContextV1(source);

    expect(Reflect.ownKeys(projected)).toEqual([
      "profile",
      "templateId",
      "templateVersion",
      "key",
      "slots",
    ]);
    expect(projected.slots.map((slot) => Reflect.ownKeys(slot))).toEqual(
      source.slots.map(() => ["index", "degree", "bars", "chord", "inversion", "voicing"]),
    );
    expect(projected.slots.map((slot) => slot.index)).toEqual(
      source.slots.map((slot) => slot.index),
    );
    expect(projected.slots.map((slot) => slot.voicing.midiPitches)).toEqual(
      source.slots.map((slot) => slot.voicing.midiPitches),
    );
    expect(JSON.stringify(projected)).not.toContain("adjacentCost");
    expect(JSON.stringify(projected)).not.toContain("rationale");
    expect(source).toEqual(sourceBefore);
    expect(recursivelyFrozen(projected)).toBe(true);
  });

  it("returns a detached snapshot unaffected by later caller mutation", () => {
    const source = structuredClone(progression());
    const projected = projectStage7HarmonyContextV1(source);
    const before = structuredClone(projected);

    setNested(source, ["profile"], HARMONY_PROFILE_IDS.darkwave);
    setNested(source, ["key", "tonic"], 7);
    setNested(source, ["slots", 0, "index"], 99);
    setNested(source, ["slots", 0, "voicing", "midiPitches", 0], 0);
    setNested(source, ["slots", 0, "rationale", "tieBreak"], "changed");

    expect(projected).toEqual(before);
    expect(projected.key).not.toBe(source.key);
    expect(projected.slots).not.toBe(source.slots);
    expect(projected.slots[0]?.voicing).not.toBe(source.slots[0].voicing);
  });
});

describe("Stage 7 aggregate canonical result validation", () => {
  it.each(["v1", "v2"] as const)(
    "accepts, detaches, and recursively freezes a valid %s value",
    (version) => {
      const source = mutableFixture(version);
      const validated = validateStage7ArpeggiatorAggregateV1(source);
      const before = structuredClone(validated);

      setNested(source, ["components", "arpeggiator", 0, "pitch"], 127);
      setNested(source, ["components", "harmony", "slots", 0, "voicing", "midiPitches", 0], 0);
      setNested(source, ["provenance", "normalizedInputs", "intent", "energy"], "high");

      expect(validated).toEqual(before);
      expect(recursivelyFrozen(validated)).toBe(true);
      expect(validated).not.toBe(source);
    },
  );

  it.each(TOP_LEVEL_FIELDS)("rejects missing and undefined top-level %s", (field) => {
    const missing = mutableFixture();
    delete missing[field];
    expectAggregateError(missing, field);

    const undefinedValue = mutableFixture();
    undefinedValue[field] = undefined;
    expectAggregateError(undefinedValue, field);
  });

  it("reports unexpected keys in ordinal order before visiting values", () => {
    const value = mutableFixture();
    value.schema = "wrong";
    value.zeta = true;
    value.alpha = true;
    expectAggregateError(value, "alpha");
  });

  it.each([
    [
      "components.arpeggiator[0]",
      (value: Record<string, unknown>): unknown[] =>
        (value.components as { arpeggiator: unknown[] }).arpeggiator,
    ],
    [
      "components.harmony.slots[0]",
      (value: Record<string, unknown>): unknown[] =>
        (value.components as { harmony: { slots: unknown[] } }).harmony.slots,
    ],
    [
      "components.harmony.slots[0].voicing.midiPitches[0]",
      (value: Record<string, unknown>): unknown[] =>
        (
          value.components as {
            harmony: { slots: { voicing: { midiPitches: unknown[] } }[] };
          }
        ).harmony.slots[0].voicing.midiPitches,
    ],
  ] as const)("rejects an accessor at %s without executing it", (field, selectArray) => {
    const value = mutableFixture();
    const array = selectArray(value);
    const original = array[0];
    const getter = vi.fn(() => original);
    Object.defineProperty(array, 0, { configurable: true, enumerable: true, get: getter });

    expectAggregateError(value, field);
    expect(getter).not.toHaveBeenCalled();

    try {
      serializeStage7ArpeggiatorAggregateV1(value);
      throw new Error("Expected Stage7AggregateValueError.");
    } catch (error) {
      expect(error).toBeInstanceOf(Stage7AggregateValueError);
      expect(error).toMatchObject({ code: "INVALID_AGGREGATE_RESULT", field });
    }
    expect(getter).not.toHaveBeenCalled();
  });

  it.each([
    ["schema", "future", "schema"],
    ["engineVersion", "future", "engineVersion"],
    ["generatorVersion", "future", "generatorVersion"],
  ])("rejects malformed identity %s", (field, value, expectedField) => {
    const result = mutableFixture();
    result[field] = value;
    expectAggregateError(result, expectedField);
  });

  it.each([
    [(value: unknown): void => setNested(value, ["section", "ppq"], 480), "section.ppq"],
    [(value: unknown): void => setNested(value, ["section", "barCount"], 7), "section.barCount"],
    [
      (value: unknown): void => setNested(value, ["section", "timeSignature", "numerator"], 3),
      "section.timeSignature.numerator",
    ],
    [
      (value: unknown): void => setNested(value, ["section", "timeSignature", "denominator"], 8),
      "section.timeSignature.denominator",
    ],
    [
      (value: unknown): void => setNested(value, ["section", "tempo", "microsecondsPerQuarter"], 0),
      "section.tempo.microsecondsPerQuarter",
    ],
  ] as const)("rejects a malformed section at %s", (mutate, field) => {
    const value = mutableFixture();
    mutate(value);
    expectAggregateError(value, field);
  });

  it.each([
    [
      (value: unknown): void => setNested(value, ["components", "harmony", "profile"], "future"),
      "components.harmony.profile",
    ],
    [
      (value: unknown): void =>
        setNested(value, ["components", "harmony", "templateId"], "unknown"),
      "components.harmony.templateId",
    ],
    [
      (value: unknown): void =>
        setNested(value, ["components", "harmony", "templateVersion"], "v2"),
      "components.harmony.templateVersion",
    ],
    [
      (value: unknown): void => setNested(value, ["components", "harmony", "key", "tonic"], 12),
      "components.harmony.key.tonic",
    ],
    [
      (value: unknown): void => setNested(value, ["components", "harmony", "slots"], []),
      "components.harmony.slots",
    ],
    [
      (value: unknown): void => setNested(value, ["components", "harmony", "slots", 0, "index"], 1),
      "components.harmony.slots[0].index",
    ],
    [
      (value: unknown): void => setNested(value, ["components", "harmony", "slots", 0, "bars"], 99),
      "components.harmony.slots[0]",
    ],
    [
      (value: unknown): void =>
        setNested(value, ["components", "harmony", "slots", 0, "voicing", "midiPitches", 0], 127),
      "components.harmony.slots[0].voicing.midiPitches",
    ],
  ] as const)("rejects malformed Harmony at %s", (mutate, field) => {
    const value = mutableFixture();
    mutate(value);
    expectAggregateError(value, field);
  });

  it.each([
    [
      (value: unknown): void => setNested(value, ["components", "arpeggiator", 0, "pitch"], 128),
      "components.arpeggiator[0].pitch",
    ],
    [
      (value: unknown): void => setNested(value, ["components", "arpeggiator", 0, "startTick"], -1),
      "components.arpeggiator[0].startTick",
    ],
    [
      (value: unknown): void =>
        setNested(value, ["components", "arpeggiator", 0, "durationTicks"], 0),
      "components.arpeggiator[0].durationTicks",
    ],
    [
      (value: unknown): void =>
        setNested(value, ["components", "arpeggiator", 0, "startTick"], 30_700),
      "components.arpeggiator[0].durationTicks",
    ],
    [
      (value: unknown): void =>
        setNested(value, ["components", "arpeggiator", 1, "startTick"], 100),
      "components.arpeggiator[1].startTick",
    ],
  ] as const)("rejects malformed Arpeggiator events at %s", (mutate, field) => {
    const value = mutableFixture();
    mutate(value);
    expectAggregateError(value, field);
  });

  it.each([
    [
      (value: unknown): void => setNested(value, ["provenance", "profile", "id"], "future"),
      "provenance.profile.id",
    ],
    [
      (value: unknown): void => setNested(value, ["provenance", "profile", "version"], "future"),
      "provenance.profile.version",
    ],
    [
      (value: unknown): void => setNested(value, ["provenance", "policy", "version"], "future"),
      "provenance.policy.version",
    ],
    [
      (value: unknown): void =>
        setNested(value, ["provenance", "seedDerivation", "version"], "future"),
      "provenance.seedDerivation.version",
    ],
    [
      (value: unknown): void => setNested(value, ["provenance", "prng", "version"], "future"),
      "provenance.prng.version",
    ],
    [
      (value: unknown): void => setNested(value, ["provenance", "rootSeed"], -1),
      "provenance.rootSeed",
    ],
    [
      (value: unknown): void =>
        setNested(value, ["provenance", "normalizedInputs", "intent", "energy"], "future"),
      "provenance.normalizedInputs.intent.energy",
    ],
    [
      (value: unknown): void =>
        setNested(value, ["provenance", "normalizedInputs", "intent", "complexity"], "future"),
      "provenance.normalizedInputs.intent.complexity",
    ],
    [
      (value: unknown): void =>
        setNested(value, ["provenance", "normalizedInputs", "range", "minMidiPitch"], -1),
      "provenance.normalizedInputs.range.minMidiPitch",
    ],
    [
      (value: unknown): void => setNested(value, ["provenance", "parent"], "parent"),
      "provenance.parent",
    ],
  ] as const)("rejects malformed provenance at %s", (mutate, field) => {
    const value = mutableFixture();
    mutate(value);
    expectAggregateError(value, field);
  });

  it.each([
    [
      "componentHashes.harmony",
      (value: unknown): void => setNested(value, ["componentHashes", "harmony"], "A".repeat(64)),
    ],
    [
      "componentHashes.arpeggiator",
      (value: unknown): void => setNested(value, ["componentHashes", "arpeggiator"], "abc"),
    ],
    [
      "resultHash",
      (value: unknown): void => setNested(value, ["resultHash"], `${"0".repeat(63)}g`),
    ],
  ] as const)("rejects malformed digest at %s without comparing hashes", (field, mutate) => {
    const value = mutableFixture();
    mutate(value);
    expectAggregateError(value, field);
  });

  it("requires exact empty warnings and null root lineage", () => {
    const warning = mutableFixture();
    setNested(warning, ["warnings"], ["warning"]);
    expectAggregateError(warning, "warnings");

    const parent = mutableFixture();
    setNested(parent, ["provenance", "parent"], {});
    expectAggregateError(parent, "provenance.parent");
  });

  it("enforces Harmony/provenance profile equality before syntactic digest significance", () => {
    const value = mutableFixture();
    setNested(value, ["provenance", "profile", "id"], HARMONY_PROFILE_IDS.darkwave);
    setNested(value, ["componentHashes", "harmony"], "1".repeat(64));
    setNested(value, ["componentHashes", "arpeggiator"], "2".repeat(64));
    setNested(value, ["resultHash"], "3".repeat(64));
    expectAggregateError(value, "provenance.profile.id");
  });

  it.each([
    [ARP_PROFILE_DATA_VERSION_V1, ARP_POLICY_VERSION_V2],
    [ARP_PROFILE_DATA_VERSION_V2, ARP_POLICY_VERSION_V1],
  ])("rejects cross-pair %s / %s", (profileVersion, policyVersion) => {
    const value = mutableFixture();
    setNested(value, ["provenance", "profile", "version"], profileVersion);
    setNested(value, ["provenance", "policy", "version"], policyVersion);
    expectAggregateError(value, "provenance.policy.version");
  });

  it("normalizes legal negative zero while preserving valid domains", () => {
    const value = mutableFixture();
    setNested(value, ["components", "harmony", "slots", 0, "index"], -0);
    setNested(value, ["components", "harmony", "slots", 0, "inversion"], -0);
    setNested(value, ["components", "arpeggiator", 0, "pitch"], -0);
    setNested(value, ["components", "arpeggiator", 0, "startTick"], -0);
    setNested(value, ["provenance", "rootSeed"], -0);
    setNested(value, ["provenance", "normalizedInputs", "range", "minMidiPitch"], -0);

    const validated = validateStage7ArpeggiatorAggregateV1(value);
    expect(Object.is(validated.components.arpeggiator[0]?.startTick, -0)).toBe(false);
    expect(Object.is(validated.provenance.rootSeed, -0)).toBe(false);
    expect(serializeStage7ArpeggiatorAggregateV1(value)).not.toContain(":-0");
  });
});

describe("Stage 7 aggregate canonical serialization", () => {
  it.each(["v1", "v2"] as const)("emits the exact canonical %s JSON", (version) => {
    expect(serializeStage7ArpeggiatorAggregateV1(aggregate(version))).toBe(
      version === "v1" ? EXPECTED_V1_JSON : EXPECTED_V2_JSON,
    );
  });

  it("is repeatable and independent of caller property construction order", () => {
    const ordered = aggregate();
    const shuffled = {
      resultHash: ordered.resultHash,
      warnings: ordered.warnings,
      componentHashes: {
        arpeggiator: ordered.componentHashes.arpeggiator,
        harmony: ordered.componentHashes.harmony,
      },
      provenance: {
        parent: ordered.provenance.parent,
        normalizedInputs: {
          range: {
            maxMidiPitch: ordered.provenance.normalizedInputs.range.maxMidiPitch,
            minMidiPitch: ordered.provenance.normalizedInputs.range.minMidiPitch,
          },
          intent: {
            complexity: ordered.provenance.normalizedInputs.intent.complexity,
            energy: ordered.provenance.normalizedInputs.intent.energy,
          },
        },
        rootSeed: ordered.provenance.rootSeed,
        prng: { version: ordered.provenance.prng.version },
        seedDerivation: { version: ordered.provenance.seedDerivation.version },
        policy: { version: ordered.provenance.policy.version },
        profile: {
          version: ordered.provenance.profile.version,
          id: ordered.provenance.profile.id,
        },
      },
      components: {
        arpeggiator: ordered.components.arpeggiator.map((event) => ({
          durationTicks: event.durationTicks,
          startTick: event.startTick,
          pitch: event.pitch,
        })),
        harmony: ordered.components.harmony,
      },
      section: {
        tempo: ordered.section.tempo,
        timeSignature: ordered.section.timeSignature,
        barCount: ordered.section.barCount,
        ppq: ordered.section.ppq,
      },
      generatorVersion: ordered.generatorVersion,
      engineVersion: ordered.engineVersion,
      schema: ordered.schema,
    };

    const expected = serializeStage7ArpeggiatorAggregateV1(ordered);
    expect(serializeStage7ArpeggiatorAggregateV1(ordered)).toBe(expected);
    expect(serializeStage7ArpeggiatorAggregateV1(shuffled)).toBe(expected);
    expect(expected).not.toMatch(/[\r\n]/u);
    expect(expected).not.toContain(" ");
  });

  it("ignores noncanonical full-realization metadata before aggregate serialization", () => {
    const first = progression();
    const second = structuredClone(first);
    setNested(second, ["slots", 0, "adjacentCost"], 987_654);
    setNested(second, ["slots", 0, "rationale", "preferenceRank"], 999);
    setNested(second, ["slots", 0, "rationale", "tieBreak"], "ignored");

    const left = mutableFixture();
    const right = mutableFixture();
    setNested(left, ["components", "harmony"], projectStage7HarmonyContextV1(first));
    setNested(right, ["components", "harmony"], projectStage7HarmonyContextV1(second));
    expect(serializeStage7ArpeggiatorAggregateV1(left)).toBe(
      serializeStage7ArpeggiatorAggregateV1(right),
    );
  });

  it("never invokes caller toJSON and has no Node/hash/orchestration dependency", () => {
    const value = mutableFixture();
    const toJSON = vi.fn();
    Object.defineProperty(value, "toJSON", { value: toJSON, enumerable: false });
    expect(() => serializeStage7ArpeggiatorAggregateV1(value)).toThrow(Stage7AggregateValueError);
    expect(toJSON).not.toHaveBeenCalled();

    const source = readFileSync(
      new URL("./stage7-arpeggiator-aggregate.ts", import.meta.url),
      "utf8",
    );
    expect(source).not.toMatch(/node:|createHash|subtle\.digest/u);
    expect(source).not.toContain("generateArpEventsWithPolicyV1");
    expect(source).not.toContain("generateArpEventsWithPolicyV2");
    expect(source).not.toContain("src/generators");
    expect(STAGE7_HARMONY_COMPONENT_SCHEMA_V1).toBe("nightdrive.stage7-harmony-component.v1");
    expect(STAGE7_ARPEGGIATOR_COMPONENT_SCHEMA_V1).toBe(
      "nightdrive.stage7-arpeggiator-component.v1",
    );
  });
});

const EXPECTED_V1_JSON =
  '{"schema":"nightdrive.stage7-arpeggiator-aggregate.v1","engineVersion":"nightdrive.engine.stage7-aggregate.v1","generatorVersion":"nightdrive.generator.stage7-arpeggiator.v1","section":{"ppq":960,"barCount":8,"timeSignature":{"schema":"nightdrive.time-signature.v1","numerator":4,"denominator":4},"tempo":{"schema":"nightdrive.tempo.v1","microsecondsPerQuarter":500000}},"components":{"harmony":{"profile":"classic-synthwave","templateId":"degree-0344-major-v1","templateVersion":"v1","key":{"schema":"nightdrive.key.v1","tonicSemitoneClass":0,"scale":"major"},"slots":[{"index":0,"degree":0,"bars":2,"chord":{"schema":"nightdrive.chord.v1","rootSemitoneClass":0,"quality":"major-triad"},"inversion":{"schema":"nightdrive.chord-inversion.v1","memberIndex":0},"voicing":{"schema":"nightdrive.chord-voicing.v1","midiPitches":[48,52,55]}},{"index":1,"degree":3,"bars":2,"chord":{"schema":"nightdrive.chord.v1","rootSemitoneClass":5,"quality":"major-triad"},"inversion":{"schema":"nightdrive.chord-inversion.v1","memberIndex":2},"voicing":{"schema":"nightdrive.chord-voicing.v1","midiPitches":[48,53,57]}},{"index":2,"degree":4,"bars":2,"chord":{"schema":"nightdrive.chord.v1","rootSemitoneClass":7,"quality":"major-triad"},"inversion":{"schema":"nightdrive.chord-inversion.v1","memberIndex":1},"voicing":{"schema":"nightdrive.chord-voicing.v1","midiPitches":[47,50,55]}},{"index":3,"degree":0,"bars":2,"chord":{"schema":"nightdrive.chord.v1","rootSemitoneClass":0,"quality":"major-triad"},"inversion":{"schema":"nightdrive.chord-inversion.v1","memberIndex":0},"voicing":{"schema":"nightdrive.chord-voicing.v1","midiPitches":[48,52,55]}}]},"arpeggiator":[{"pitch":48,"startTick":0,"durationTicks":240},{"pitch":52,"startTick":480,"durationTicks":240}]},"provenance":{"profile":{"id":"classic-synthwave","version":"nightdrive.genre-profile.arpeggiator.v1"},"policy":{"version":"nightdrive.arpeggiator-policy.v1"},"seedDerivation":{"version":"nightdrive.seed-derivation.component.v1"},"prng":{"version":"nightdrive.prng.mulberry32.v1"},"rootSeed":0,"normalizedInputs":{"intent":{"energy":"medium","complexity":"medium"},"range":{"minMidiPitch":0,"maxMidiPitch":127}},"parent":null},"componentHashes":{"harmony":"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa","arpeggiator":"bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb"},"warnings":[],"resultHash":"cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc"}';
const EXPECTED_V2_JSON =
  '{"schema":"nightdrive.stage7-arpeggiator-aggregate.v1","engineVersion":"nightdrive.engine.stage7-aggregate.v1","generatorVersion":"nightdrive.generator.stage7-arpeggiator.v1","section":{"ppq":960,"barCount":8,"timeSignature":{"schema":"nightdrive.time-signature.v1","numerator":4,"denominator":4},"tempo":{"schema":"nightdrive.tempo.v1","microsecondsPerQuarter":500000}},"components":{"harmony":{"profile":"classic-synthwave","templateId":"degree-0344-major-v1","templateVersion":"v1","key":{"schema":"nightdrive.key.v1","tonicSemitoneClass":0,"scale":"major"},"slots":[{"index":0,"degree":0,"bars":2,"chord":{"schema":"nightdrive.chord.v1","rootSemitoneClass":0,"quality":"major-triad"},"inversion":{"schema":"nightdrive.chord-inversion.v1","memberIndex":0},"voicing":{"schema":"nightdrive.chord-voicing.v1","midiPitches":[48,52,55]}},{"index":1,"degree":3,"bars":2,"chord":{"schema":"nightdrive.chord.v1","rootSemitoneClass":5,"quality":"major-triad"},"inversion":{"schema":"nightdrive.chord-inversion.v1","memberIndex":2},"voicing":{"schema":"nightdrive.chord-voicing.v1","midiPitches":[48,53,57]}},{"index":2,"degree":4,"bars":2,"chord":{"schema":"nightdrive.chord.v1","rootSemitoneClass":7,"quality":"major-triad"},"inversion":{"schema":"nightdrive.chord-inversion.v1","memberIndex":1},"voicing":{"schema":"nightdrive.chord-voicing.v1","midiPitches":[47,50,55]}},{"index":3,"degree":0,"bars":2,"chord":{"schema":"nightdrive.chord.v1","rootSemitoneClass":0,"quality":"major-triad"},"inversion":{"schema":"nightdrive.chord-inversion.v1","memberIndex":0},"voicing":{"schema":"nightdrive.chord-voicing.v1","midiPitches":[48,52,55]}}]},"arpeggiator":[{"pitch":48,"startTick":0,"durationTicks":240},{"pitch":52,"startTick":480,"durationTicks":240}]},"provenance":{"profile":{"id":"classic-synthwave","version":"nightdrive.genre-profile.arpeggiator.v2"},"policy":{"version":"nightdrive.arpeggiator-policy.v2"},"seedDerivation":{"version":"nightdrive.seed-derivation.component.v1"},"prng":{"version":"nightdrive.prng.mulberry32.v1"},"rootSeed":0,"normalizedInputs":{"intent":{"energy":"medium","complexity":"medium"},"range":{"minMidiPitch":0,"maxMidiPitch":127}},"parent":null},"componentHashes":{"harmony":"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa","arpeggiator":"bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb"},"warnings":[],"resultHash":"cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc"}';
