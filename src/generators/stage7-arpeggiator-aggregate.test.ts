// @vitest-environment node

import { describe, expect, it } from "vitest";
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
  realizeHarmonyProgression,
} from "../music-domain/harmony";
import { createKey } from "../music-domain/key";
import { createTempoFromMicrosecondsPerQuarter } from "../music-domain/musical-time";
import { createPitchClass } from "../music-domain/pitch";
import { PRNG_ALGORITHM_ID } from "../music-domain/prng";
import { generateArpEventsWithPolicyV1 } from "../music-domain/arpeggiator-policy-generator";
import { generateStage7ArpeggiatorAggregateV1 } from "./stage7-arpeggiator-aggregate";
import { digestStage7ArpeggiatorAggregateV1 } from "./stage7-aggregate-hash";
import { verifyStage7ArpeggiatorAggregateV1 } from "./stage7-aggregate-verifier";

function recursivelyFrozen(value: unknown): boolean {
  if (typeof value !== "object" || value === null) return true;
  return (
    Object.isFrozen(value) &&
    Reflect.ownKeys(value).every((key) => recursivelyFrozen(Reflect.get(value, key)))
  );
}

function request(version: "v1" | "v2" = "v1") {
  const profile = HARMONY_PROFILE_IDS.classicSynthwave;
  const template = getHarmonyTemplatesForProfile(profile)[0];
  if (template === undefined) throw new Error("Missing fixture template.");
  const progression = realizeHarmonyProgression(
    profile,
    template,
    createKey(createPitchClass(0), template.scale),
  );
  return {
    schema: "nightdrive.stage7-arpeggiator-aggregate.v1" as const,
    engineVersion: "nightdrive.engine.stage7-aggregate.v1" as const,
    generatorVersion: "nightdrive.generator.stage7-arpeggiator.v1" as const,
    parent: null,
    tempo: createTempoFromMicrosecondsPerQuarter(500_000),
    progression,
    range: createArpRange({ minMidiPitch: 36, maxMidiPitch: 84 }),
    intent: { energy: "medium" as const, complexity: "medium" as const },
    profile: {
      id: profile,
      version: version === "v1" ? ARP_PROFILE_DATA_VERSION_V1 : ARP_PROFILE_DATA_VERSION_V2,
    },
    policy: { version: version === "v1" ? ARP_POLICY_VERSION_V1 : ARP_POLICY_VERSION_V2 },
    seedDerivation: { version: COMPONENT_SEED_DERIVATION_VERSION_V1 },
    prng: { version: PRNG_ALGORITHM_ID },
    rootSeed: 0,
  };
}

describe("Stage 7 aggregate preflight/orchestration", () => {
  it("routes a complete V1 request and returns a verified frozen aggregate", async () => {
    const source = request();
    const before = structuredClone(source);
    const result = await generateStage7ArpeggiatorAggregateV1(source);
    expect(result.components.harmony.profile).toBe(result.provenance.profile.id);
    expect(result.components.harmony.templateId).toBe(source.progression.templateId);
    expect(result.components.harmony.slots.map((slot) => slot.voicing.midiPitches)).toEqual(
      source.progression.slots.map((slot) => slot.voicing.midiPitches),
    );
    const direct = generateArpEventsWithPolicyV1({
      progression: source.progression,
      range: source.range,
      intent: source.intent,
      profile: source.profile as never,
      policy: source.policy as never,
      seedDerivation: source.seedDerivation,
      prng: source.prng,
      rootSeed: source.rootSeed,
    });
    expect(result.components.arpeggiator).toEqual(direct.events);
    expect(result.components.arpeggiator.length).toBeGreaterThan(0);
    expect(result).not.toHaveProperty("plan");
    expect(result.resultHash).toBe(digestStage7ArpeggiatorAggregateV1(result));
    expect(Object.isFrozen(result)).toBe(true);
    expect(Object.isFrozen(result.components)).toBe(true);
    expect(recursivelyFrozen(result)).toBe(true);
    await expect(verifyStage7ArpeggiatorAggregateV1(result)).resolves.toEqual(result);
    expect(source).toEqual(before);
  });

  it("routes a complete V2 request without changing the aggregate schema", async () => {
    const result = await generateStage7ArpeggiatorAggregateV1(request("v2"));
    expect(result.provenance.profile.version).toBe(ARP_PROFILE_DATA_VERSION_V2);
    expect(result.provenance.policy.version).toBe(ARP_POLICY_VERSION_V2);
  });

  it("enforces aggregate identity and pair precedence before delegation", async () => {
    const invalidSchema = { ...request(), schema: "wrong" };
    await expect(
      generateStage7ArpeggiatorAggregateV1(invalidSchema as never),
    ).rejects.toMatchObject({ code: "UNSUPPORTED_AGGREGATE_SCHEMA", field: "schema" });
    const mixed = { ...request(), policy: { version: ARP_POLICY_VERSION_V2 } };
    await expect(generateStage7ArpeggiatorAggregateV1(mixed as never)).rejects.toMatchObject({
      code: "INCOMPATIBLE_AGGREGATE_ARP_VERSIONS",
      field: "policy.version",
    });
  });

  it("uses the aggregate-owned tempo error and profile/context mismatch error", async () => {
    const malformedTempo = { ...request(), tempo: {} };
    await expect(
      generateStage7ArpeggiatorAggregateV1(malformedTempo as never),
    ).rejects.toMatchObject({
      code: "INVALID_AGGREGATE_TEMPO",
      field: "tempo.microsecondsPerQuarter",
    });
    const mismatch = {
      ...request(),
      profile: { ...request().profile, id: HARMONY_PROFILE_IDS.darkwave },
    };
    await expect(generateStage7ArpeggiatorAggregateV1(mismatch as never)).rejects.toMatchObject({
      code: "INCOMPATIBLE_ARP_PROFILE_CONTEXT",
      field: "profile.id",
    });
  });

  it("produces canonical-value-equivalent output for equal requests", async () => {
    const first = await generateStage7ArpeggiatorAggregateV1(request());
    const second = await generateStage7ArpeggiatorAggregateV1(request());
    expect(second).toEqual(first);
    expect(JSON.stringify(second)).toBe(JSON.stringify(first));
  });
});
