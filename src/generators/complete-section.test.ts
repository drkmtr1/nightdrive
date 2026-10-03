import { afterEach, describe, expect, it, vi } from "vitest";
import {
  COMPLETE_SECTION_ENGINE_VERSION_V1,
  COMPLETE_SECTION_GENERATOR_VERSION_V1,
  COMPLETE_SECTION_REQUEST_SCHEMA_V1,
  CompleteSectionValueError,
  serializeCompleteSectionV1,
  verifyCompleteSectionV1,
} from "../composition/complete-section";
import {
  FIRST_PLAYABLE_COMPOSITION_REQUEST_SCHEMA_V1,
  FIRST_PLAYABLE_ENGINE_VERSION_V1,
  FIRST_PLAYABLE_GENERATOR_VERSION_V1,
} from "../composition/first-playable-composition";
import {
  ARP_POLICY_VERSION_V2,
  ARP_PROFILE_DATA_VERSION_V2,
} from "../music-domain/arpeggiator-policy-configuration";
import * as arpeggiatorDomain from "../music-domain/arpeggiator-policy-generator";
import * as bassDomain from "../music-domain/bass";
import { COMPONENT_SEED_DERIVATION_VERSION_V1 } from "../music-domain/component-seed";
import * as harmonyDomain from "../music-domain/harmony";
import { HARMONY_PROFILE_IDS } from "../music-domain/harmony";
import { MOTIF_POLICY_VERSION_V1 } from "../music-domain/motif-policy";
import { MOTIF_PROFILE_DATA_VERSION_V1 } from "../music-domain/motif-profile-configuration";
import { MOTIF_GENERATOR_VERSION_V1 } from "../music-domain/motif-result";
import { PRNG_ALGORITHM_ID } from "../music-domain/prng";
import { generateCompleteSectionV1 } from "./complete-section";
import * as motifGenerator from "./motif-generator";

function request(rootSeed = 0): Record<string, unknown> {
  return {
    schema: COMPLETE_SECTION_REQUEST_SCHEMA_V1,
    engineVersion: COMPLETE_SECTION_ENGINE_VERSION_V1,
    generatorVersion: COMPLETE_SECTION_GENERATOR_VERSION_V1,
    composition: {
      schema: FIRST_PLAYABLE_COMPOSITION_REQUEST_SCHEMA_V1,
      engineVersion: FIRST_PLAYABLE_ENGINE_VERSION_V1,
      generatorVersion: FIRST_PLAYABLE_GENERATOR_VERSION_V1,
      profile: { id: HARMONY_PROFILE_IDS.darkSynthwave },
      harmony: {
        templateId: "degree-0654-natural-minor-v1",
        templateVersion: "v1",
        key: { tonic: 0, scale: "natural-minor" },
      },
      section: { tempo: { microsecondsPerQuarter: 500_000 } },
      intent: { energy: "medium", complexity: "medium" },
      rootSeed,
      arpeggiator: {
        range: { minMidiPitch: 36, maxMidiPitch: 84 },
        profile: { version: ARP_PROFILE_DATA_VERSION_V2 },
        policy: { version: ARP_POLICY_VERSION_V2 },
        seedDerivation: { version: COMPONENT_SEED_DERIVATION_VERSION_V1 },
        prng: { version: PRNG_ALGORITHM_ID },
      },
    },
    motif: {
      schema: "nightdrive.motif-generation-request.v1",
      generatorVersion: MOTIF_GENERATOR_VERSION_V1,
      profile: { version: MOTIF_PROFILE_DATA_VERSION_V1 },
      policyVersion: MOTIF_POLICY_VERSION_V1,
    },
  };
}

describe("complete-section generation", () => {
  afterEach(() => vi.restoreAllMocks());
  it("creates one replayable frozen H+B+A+Lead result from one request", async () => {
    const input = request();
    const first = await generateCompleteSectionV1(input as never);
    const second = await generateCompleteSectionV1(input as never);

    expect(first).toEqual(second);
    expect(first.schema).toBe("nightdrive.complete-section-result.v1");
    expect(first.components.harmony.slots).toHaveLength(4);
    expect(first.components.bass.length).toBeGreaterThan(0);
    expect(first.components.arpeggiator.length).toBeGreaterThan(0);
    expect(first.components.lead.events.length).toBeGreaterThan(0);
    expect(first.provenance.motif.generatorVersion).toBe(MOTIF_GENERATOR_VERSION_V1);
    expect(first.componentHashes).toEqual({
      harmony: "223062477b0382454187436de8444f134d105e671d3f550841aa0babd7eebffb",
      bass: "18152a11fa590ae46f8db418337c080f2561c0e976462e4872137da8291185c7",
      arpeggiator: "9a38c28c2ffee6029c13ccf6645e317457a3dd6041cfd21b5539a780d1313c1f",
      lead: "26a59097472088cc3d26ccb2ca59c246b020316fe392bc6beb2e99dc1c021b1a",
    });
    expect(first.resultHash).toBe(
      "0eb122a36f7c90e6b58c4d3017d21a051a81ed54bee1b98d00a40e3adcc66fa1",
    );
    expect(Object.isFrozen(first)).toBe(true);
    expect(Object.isFrozen(first.components.lead.events)).toBe(true);
    expect(verifyCompleteSectionV1(first)).toEqual(first);
    expect(serializeCompleteSectionV1(first)).toContain('"lead"');
  });

  it("preserves component-isolated seeding", async () => {
    const zero = await generateCompleteSectionV1(request(0) as never);
    const one = await generateCompleteSectionV1(request(1) as never);

    expect(zero.components.harmony).toEqual(one.components.harmony);
    expect(zero.components.bass).toEqual(one.components.bass);
    expect(zero.components.lead).not.toEqual(one.components.lead);
  });

  it("realizes Harmony once and passes that exact realization to all three dependents", async () => {
    const harmony = vi.spyOn(harmonyDomain, "realizeHarmonyProgression");
    const bass = vi.spyOn(bassDomain, "generateBassEvents");
    const arpeggiator = vi.spyOn(arpeggiatorDomain, "generateArpEventsWithPolicyV2");
    const motif = vi.spyOn(motifGenerator, "generateMotifV1");

    await generateCompleteSectionV1(request() as never);

    expect(harmony).toHaveBeenCalledTimes(1);
    const realization = harmony.mock.results[0]?.value;
    expect(bass.mock.calls[0]?.[0]).toBe(realization);
    expect(arpeggiator.mock.calls[0]?.[0].progression).toBe(realization);
    expect(motif.mock.calls[0]?.[0]).toMatchObject({ harmony: realization });
  });

  it("fails closed at the complete-section envelope before nested generation", async () => {
    const invalid = request();
    invalid.schema = "nightdrive.other.v1";

    await expect(generateCompleteSectionV1(invalid as never)).rejects.toMatchObject({
      code: "UNSUPPORTED_COMPLETE_SECTION_SCHEMA",
      field: "schema",
    } satisfies Partial<CompleteSectionValueError>);
  });

  it("rejects a malformed or reordered Motif wrapper before component execution", async () => {
    const invalid = request();
    invalid.motif = {
      generatorVersion: MOTIF_GENERATOR_VERSION_V1,
      schema: "nightdrive.motif-generation-request.v1",
      profile: { version: MOTIF_PROFILE_DATA_VERSION_V1 },
      policyVersion: MOTIF_POLICY_VERSION_V1,
    };

    await expect(generateCompleteSectionV1(invalid as never)).rejects.toMatchObject({
      code: "INVALID_COMPLETE_SECTION_MOTIF_CONFIGURATION",
      field: "motif",
    });
  });

  it("preserves nested First Playable errors", async () => {
    const invalid = request();
    (invalid.composition as Record<string, unknown>).schema = "nightdrive.other.v1";

    await expect(generateCompleteSectionV1(invalid as never)).rejects.toMatchObject({
      code: "UNSUPPORTED_FIRST_PLAYABLE_SCHEMA",
      field: "schema",
    });
  });

  it("rejects a forged Lead component even when its other result fields are unchanged", async () => {
    const result = await generateCompleteSectionV1(request() as never);
    const forged = structuredClone(result) as Record<string, unknown>;
    ((forged.components as Record<string, unknown>).lead as Record<string, unknown>).events = [];

    expect(() => verifyCompleteSectionV1(forged)).toThrow(CompleteSectionValueError);
  });
});
