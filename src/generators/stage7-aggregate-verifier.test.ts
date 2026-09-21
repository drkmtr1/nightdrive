// @vitest-environment node

import { readFileSync } from "node:fs";

import { describe, expect, it, vi } from "vitest";

import {
  STAGE7_AGGREGATE_ENGINE_VERSION_V1,
  STAGE7_ARPEGGIATOR_AGGREGATE_SCHEMA_V1,
  STAGE7_ARPEGGIATOR_GENERATOR_VERSION_V1,
  serializeStage7ArpeggiatorAggregateV1,
} from "../composition/stage7-arpeggiator-aggregate";
import {
  ARP_POLICY_VERSION_V1,
  ARP_POLICY_VERSION_V2,
  ARP_PROFILE_DATA_VERSION_V1,
  ARP_PROFILE_DATA_VERSION_V2,
} from "../music-domain/arpeggiator-policy-configuration";
import { COMPONENT_SEED_DERIVATION_VERSION_V1 } from "../music-domain/component-seed";
import { PRNG_ALGORITHM_ID } from "../music-domain/prng";
import * as aggregateHash from "./stage7-aggregate-hash";
import { digestStage7ArpeggiatorAggregateV1 } from "./stage7-aggregate-hash";
import { verifyStage7ArpeggiatorAggregateV1 } from "./stage7-aggregate-verifier";
import * as componentHashes from "./stage7-component-hashes";
import {
  digestStage7ArpeggiatorComponentV1,
  digestStage7HarmonyComponentV1,
} from "./stage7-component-hashes";

const HARMONY = {
  profile: "classic-synthwave",
  templateId: "degree-0344-major-v1",
  templateVersion: "v1",
  key: { tonic: 0, scale: "major" },
  slots: [
    {
      index: 0,
      degree: 0,
      bars: 2,
      chord: { root: 0, quality: "major-triad" },
      inversion: 0,
      voicing: { midiPitches: [48, 52, 55] },
    },
    {
      index: 1,
      degree: 3,
      bars: 2,
      chord: { root: 5, quality: "major-triad" },
      inversion: 2,
      voicing: { midiPitches: [48, 53, 57] },
    },
    {
      index: 2,
      degree: 4,
      bars: 2,
      chord: { root: 7, quality: "major-triad" },
      inversion: 1,
      voicing: { midiPitches: [47, 50, 55] },
    },
    {
      index: 3,
      degree: 0,
      bars: 2,
      chord: { root: 0, quality: "major-triad" },
      inversion: 0,
      voicing: { midiPitches: [48, 52, 55] },
    },
  ],
};

const EVENTS = [
  { pitch: 48, startTick: 0, durationTicks: 240 },
  { pitch: 52, startTick: 480, durationTicks: 240 },
];

function validAggregate(version: "v1" | "v2" = "v1"): Record<string, unknown> {
  const aggregate: Record<string, unknown> = {
    schema: STAGE7_ARPEGGIATOR_AGGREGATE_SCHEMA_V1,
    engineVersion: STAGE7_AGGREGATE_ENGINE_VERSION_V1,
    generatorVersion: STAGE7_ARPEGGIATOR_GENERATOR_VERSION_V1,
    section: {
      ppq: 960,
      barCount: 8,
      timeSignature: { numerator: 4, denominator: 4 },
      tempo: { microsecondsPerQuarter: 500_000 },
    },
    components: { harmony: HARMONY, arpeggiator: EVENTS },
    provenance: {
      profile: {
        id: "classic-synthwave",
        version: version === "v1" ? ARP_PROFILE_DATA_VERSION_V1 : ARP_PROFILE_DATA_VERSION_V2,
      },
      policy: { version: version === "v1" ? ARP_POLICY_VERSION_V1 : ARP_POLICY_VERSION_V2 },
      seedDerivation: { version: COMPONENT_SEED_DERIVATION_VERSION_V1 },
      prng: { version: PRNG_ALGORITHM_ID },
      rootSeed: 0,
      normalizedInputs: {
        intent: { energy: "medium", complexity: "medium" },
        range: { minMidiPitch: 0, maxMidiPitch: 127 },
      },
      parent: null,
    },
    componentHashes: { harmony: "a".repeat(64), arpeggiator: "b".repeat(64) },
    warnings: [],
    resultHash: "c".repeat(64),
  };
  const section = aggregate.section;
  const components = aggregate.components as { harmony: unknown; arpeggiator: unknown[] };
  const hashes = aggregate.componentHashes as Record<string, unknown>;
  hashes.harmony = digestStage7HarmonyComponentV1(section, components.harmony);
  hashes.arpeggiator = digestStage7ArpeggiatorComponentV1(section, components.arpeggiator);
  aggregate.resultHash = digestStage7ArpeggiatorAggregateV1(aggregate);
  return aggregate;
}

function cloneAggregate(version: "v1" | "v2" = "v1"): Record<string, unknown> {
  return structuredClone(validAggregate(version));
}

function expectInvalid(value: unknown, field: string): Promise<void> {
  return expect(verifyStage7ArpeggiatorAggregateV1(value)).rejects.toMatchObject({
    code: "INVALID_AGGREGATE_RESULT",
    field,
  });
}

function expectMismatch(value: unknown, field: string): Promise<void> {
  return expect(verifyStage7ArpeggiatorAggregateV1(value)).rejects.toMatchObject({
    code: "AGGREGATE_HASH_MISMATCH",
    field,
  });
}

describe("Stage 7 aggregate digest verification", () => {
  it.each(["v1", "v2"] as const)("accepts and freezes a valid %s aggregate", async (version) => {
    const source = cloneAggregate(version);
    const verified = await verifyStage7ArpeggiatorAggregateV1(source);

    expect(serializeStage7ArpeggiatorAggregateV1(verified)).toBe(
      serializeStage7ArpeggiatorAggregateV1(source),
    );
    expect(Object.isFrozen(verified)).toBe(true);
    expect(Object.isFrozen(verified.section)).toBe(true);
    expect(Object.isFrozen(verified.components.harmony.slots)).toBe(true);
    expect(Object.isFrozen(verified.components.arpeggiator)).toBe(true);
    expect(verified).not.toBe(source);
  });

  it("rejects malformed top-level and nested values before digest comparison", async () => {
    await expectInvalid(undefined, "result");

    const missing = cloneAggregate();
    delete missing.resultHash;
    await expectInvalid(missing, "resultHash");

    const unexpected = cloneAggregate();
    unexpected.zeta = undefined;
    unexpected.alpha = undefined;
    await expectInvalid(unexpected, "alpha");

    const sparse = cloneAggregate();
    const sparseEvents = (sparse.components as { arpeggiator: unknown[] }).arpeggiator;
    delete sparseEvents[0];
    await expectInvalid(sparse, "components.arpeggiator[0]");

    const invalidDigest = cloneAggregate();
    (invalidDigest.componentHashes as Record<string, unknown>).harmony = "A".repeat(64);
    await expectInvalid(invalidDigest, "componentHashes.harmony");
  });

  it("performs relational checks before any digest comparison", async () => {
    const mismatch = cloneAggregate();
    const provenance = mismatch.provenance as { profile: { id: string } };
    provenance.profile.id = "darkwave";
    await expectInvalid(mismatch, "provenance.profile.id");

    const eventMismatch = cloneAggregate();
    const events = (eventMismatch.components as { arpeggiator: Array<{ startTick: number }> })
      .arpeggiator;
    const secondEvent = events[1];
    if (secondEvent === undefined) throw new Error("Missing verifier test event.");
    secondEvent.startTick = 100;
    await expectInvalid(eventMismatch, "components.arpeggiator[1].startTick");
  });

  it("reports digest mismatches in component-then-result order", async () => {
    const harmonyMismatch = cloneAggregate();
    (harmonyMismatch.componentHashes as Record<string, unknown>).harmony = "1".repeat(64);
    (harmonyMismatch.componentHashes as Record<string, unknown>).arpeggiator = "2".repeat(64);
    harmonyMismatch.resultHash = "3".repeat(64);
    await expectMismatch(harmonyMismatch, "componentHashes.harmony");

    const arpeggiatorMismatch = cloneAggregate();
    (arpeggiatorMismatch.componentHashes as Record<string, unknown>).arpeggiator = "2".repeat(64);
    arpeggiatorMismatch.resultHash = "3".repeat(64);
    await expectMismatch(arpeggiatorMismatch, "componentHashes.arpeggiator");

    const resultMismatch = cloneAggregate();
    resultMismatch.resultHash = "3".repeat(64);
    await expectMismatch(resultMismatch, "resultHash");
  });

  it("does not invoke digest work when structural or relational validation fails", async () => {
    const harmonySpy = vi.spyOn(componentHashes, "digestStage7HarmonyComponentV1");
    const arpeggiatorSpy = vi.spyOn(componentHashes, "digestStage7ArpeggiatorComponentV1");
    const aggregateSpy = vi.spyOn(aggregateHash, "digestStage7ArpeggiatorAggregateV1");

    const invalid = cloneAggregate();
    (invalid.provenance as { profile: { id: string } }).profile.id = "darkwave";
    vi.clearAllMocks();
    await expectInvalid(invalid, "provenance.profile.id");

    expect(harmonySpy).not.toHaveBeenCalled();
    expect(arpeggiatorSpy).not.toHaveBeenCalled();
    expect(aggregateSpy).not.toHaveBeenCalled();
  });

  it("has no seed, PRNG, generation, or replay-oracle behavior", () => {
    const source = readFileSync("src/generators/stage7-aggregate-verifier.ts", "utf8");
    expect(source).not.toMatch(
      /deriveComponentSeed|createMulberry|resolveArpPlan|projectResolved/u,
    );
    expect(source).not.toContain("generateArpEventsWithPolicy");
  });
});
