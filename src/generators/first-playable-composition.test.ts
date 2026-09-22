import { describe, expect, it, vi } from "vitest";
import {
  FIRST_PLAYABLE_COMPOSITION_REQUEST_SCHEMA_V1,
  FIRST_PLAYABLE_ENGINE_VERSION_V1,
  FIRST_PLAYABLE_GENERATOR_VERSION_V1,
  FirstPlayableCompositionValueError,
  serializeFirstPlayableCompositionHashInputV1,
  serializeFirstPlayableCompositionV1,
  verifyFirstPlayableCompositionV1,
} from "../composition/first-playable-composition";
import { generateFirstPlayableCompositionV1 } from "./first-playable-composition";
import {
  ARP_POLICY_VERSION_V2,
  ARP_PROFILE_DATA_VERSION_V2,
} from "../music-domain/arpeggiator-policy-configuration";
import { COMPONENT_SEED_DERIVATION_VERSION_V1 } from "../music-domain/component-seed";
import * as arpeggiatorPolicyGenerator from "../music-domain/arpeggiator-policy-generator";
import * as arpeggiatorResolver from "../music-domain/arpeggiator-policy-resolver";
import * as arpeggiatorProjector from "../music-domain/arpeggiator-resolved-plan-projector";
import * as bassDomain from "../music-domain/bass";
import * as componentSeed from "../music-domain/component-seed";
import { HARMONY_PROFILE_IDS } from "../music-domain/harmony";
import * as harmonyDomain from "../music-domain/harmony";
import { PRNG_ALGORITHM_ID } from "../music-domain/prng";

function request(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
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
    rootSeed: 0,
    bass: {},
    arpeggiator: {
      range: { minMidiPitch: 0, maxMidiPitch: 127 },
      profile: { version: ARP_PROFILE_DATA_VERSION_V2 },
      policy: { version: ARP_POLICY_VERSION_V2 },
      seedDerivation: { version: COMPONENT_SEED_DERIVATION_VERSION_V1 },
      prng: { version: PRNG_ALGORITHM_ID },
    },
    ...overrides,
  };
}

describe("First Playable canonical composition", () => {
  it("generates the exact frozen H+B+A result boundary and stable hashes", async () => {
    const input = request();
    const before = JSON.stringify(input);
    const first = await generateFirstPlayableCompositionV1(input as never);
    const second = await generateFirstPlayableCompositionV1(input as never);

    expect(first).toEqual(second);
    expect(first.schema).toBe("nightdrive.first-playable-composition-result.v1");
    expect(first.section).toMatchObject({
      ppq: 960,
      barCount: 8,
      timeSignature: { numerator: 4, denominator: 4 },
    });
    expect(first.components.harmony.profile).toBe(HARMONY_PROFILE_IDS.darkSynthwave);
    expect(first.components.harmony.slots).toHaveLength(4);
    expect(first.components.bass).toHaveLength(4);
    expect(first.components.arpeggiator.length).toBeGreaterThan(0);
    expect(
      first.components.harmony.slots.map((slot) => [
        slot.index,
        slot.degree,
        slot.bars,
        slot.chord.root,
        slot.chord.quality,
        slot.inversion,
        ...slot.voicing.midiPitches,
      ]),
    ).toEqual([
      [0, 0, 2, 0, "minor-triad", 0, 36, 39, 43],
      [1, 6, 2, 10, "major-triad", 1, 38, 41, 46],
      [2, 5, 2, 8, "major-triad", 1, 36, 39, 44],
      [3, 4, 2, 7, "major-triad", 2, 38, 43, 47],
    ]);
    expect(first.components.bass).toEqual([
      { pitch: 48, startTick: 0, durationTicks: 7680 },
      { pitch: 46, startTick: 7680, durationTicks: 7680 },
      { pitch: 44, startTick: 15360, durationTicks: 7680 },
      { pitch: 43, startTick: 23040, durationTicks: 7680 },
    ]);
    expect(first.components.arpeggiator).toEqual([
      { pitch: 55, startTick: 0, durationTicks: 360 },
      { pitch: 51, startTick: 480, durationTicks: 360 },
      { pitch: 43, startTick: 1440, durationTicks: 360 },
      { pitch: 39, startTick: 1920, durationTicks: 360 },
      { pitch: 36, startTick: 2400, durationTicks: 360 },
      { pitch: 51, startTick: 3360, durationTicks: 360 },
      { pitch: 48, startTick: 3840, durationTicks: 360 },
      { pitch: 43, startTick: 4320, durationTicks: 360 },
      { pitch: 36, startTick: 5280, durationTicks: 360 },
      { pitch: 55, startTick: 5760, durationTicks: 360 },
      { pitch: 51, startTick: 6240, durationTicks: 360 },
      { pitch: 43, startTick: 7200, durationTicks: 360 },
      { pitch: 58, startTick: 7680, durationTicks: 360 },
      { pitch: 53, startTick: 8160, durationTicks: 360 },
      { pitch: 46, startTick: 9120, durationTicks: 360 },
      { pitch: 41, startTick: 9600, durationTicks: 360 },
      { pitch: 38, startTick: 10080, durationTicks: 360 },
      { pitch: 53, startTick: 11040, durationTicks: 360 },
      { pitch: 50, startTick: 11520, durationTicks: 360 },
      { pitch: 46, startTick: 12000, durationTicks: 360 },
      { pitch: 38, startTick: 12960, durationTicks: 360 },
      { pitch: 58, startTick: 13440, durationTicks: 360 },
      { pitch: 53, startTick: 13920, durationTicks: 360 },
      { pitch: 46, startTick: 14880, durationTicks: 360 },
      { pitch: 56, startTick: 15360, durationTicks: 360 },
      { pitch: 51, startTick: 15840, durationTicks: 360 },
      { pitch: 44, startTick: 16800, durationTicks: 360 },
      { pitch: 39, startTick: 17280, durationTicks: 360 },
      { pitch: 36, startTick: 17760, durationTicks: 360 },
      { pitch: 51, startTick: 18720, durationTicks: 360 },
      { pitch: 48, startTick: 19200, durationTicks: 360 },
      { pitch: 44, startTick: 19680, durationTicks: 360 },
      { pitch: 36, startTick: 20640, durationTicks: 360 },
      { pitch: 56, startTick: 21120, durationTicks: 360 },
      { pitch: 51, startTick: 21600, durationTicks: 360 },
      { pitch: 44, startTick: 22560, durationTicks: 360 },
      { pitch: 59, startTick: 23040, durationTicks: 360 },
      { pitch: 55, startTick: 23520, durationTicks: 360 },
      { pitch: 47, startTick: 24480, durationTicks: 360 },
      { pitch: 43, startTick: 24960, durationTicks: 360 },
      { pitch: 38, startTick: 25440, durationTicks: 360 },
      { pitch: 55, startTick: 26400, durationTicks: 360 },
      { pitch: 50, startTick: 26880, durationTicks: 360 },
      { pitch: 47, startTick: 27360, durationTicks: 360 },
      { pitch: 38, startTick: 28320, durationTicks: 360 },
      { pitch: 59, startTick: 28800, durationTicks: 360 },
      { pitch: 55, startTick: 29280, durationTicks: 360 },
      { pitch: 47, startTick: 30240, durationTicks: 360 },
    ]);
    expect(first.provenance.bass).toEqual({
      range: { minMidiPitch: 36, maxMidiPitch: 60 },
      rhythm: "sustained",
    });
    expect(first.provenance.profile.id).toBe(first.components.harmony.profile);
    expect(first.componentHashes).toEqual({
      harmony: "c9b2c0ac4114b7337b4ad81922cada525866f9d2925d8571618437803e8eddb8",
      bass: "9b22b2c9cf750441803ca46e654861dbae0528fadc1e31e6315838f1eaaa2454",
      arpeggiator: "e9c688f98e22277b1eb9c13e1513a1a2b6b3b5b61a089fb44f6135c852c2b98d",
    });
    expect(first.resultHash).toBe(
      "38cb2342d7317ec9372f3fe72473b142ac708c45394ebfa1f9c71835c1e54011",
    );
    expect(verifyFirstPlayableCompositionV1(first)).toEqual(first);
    expect(serializeFirstPlayableCompositionV1(first)).toBe(
      serializeFirstPlayableCompositionV1(second),
    );
    expect(serializeFirstPlayableCompositionHashInputV1(first)).not.toContain("resultHash");
    expect(Object.isFrozen(first)).toBe(true);
    expect(Object.isFrozen(first.section)).toBe(true);
    expect(Object.isFrozen(first.section.timeSignature)).toBe(true);
    expect(Object.isFrozen(first.section.tempo)).toBe(true);
    expect(Object.isFrozen(first.components)).toBe(true);
    expect(Object.isFrozen(first.components.harmony)).toBe(true);
    expect(Object.isFrozen(first.components.harmony.key)).toBe(true);
    expect(Object.isFrozen(first.components.harmony.slots)).toBe(true);
    expect(Object.isFrozen(first.components.harmony.slots[0])).toBe(true);
    expect(Object.isFrozen(first.components.bass)).toBe(true);
    expect(Object.isFrozen(first.components.bass[0])).toBe(true);
    expect(Object.isFrozen(first.components.arpeggiator)).toBe(true);
    expect(Object.isFrozen(first.components.arpeggiator[0])).toBe(true);
    expect(Object.isFrozen(first.provenance)).toBe(true);
    expect(Object.isFrozen(first.provenance.profile)).toBe(true);
    expect(Object.isFrozen(first.provenance.bass.range)).toBe(true);
    expect(Object.isFrozen(first.componentHashes)).toBe(true);
    expect(Object.isFrozen(first.warnings)).toBe(true);
    expect(JSON.stringify(input)).toBe(before);
    input.intent = { energy: "high", complexity: "high" };
    input.rootSeed = 123;
    expect(first.provenance.intent).toEqual({ energy: "medium", complexity: "medium" });
    expect(first.provenance.rootSeed).toBe(0);
  });

  it("uses explicit Bass inputs without changing accepted event semantics", async () => {
    const result = await generateFirstPlayableCompositionV1(
      request({
        bass: { range: { minMidiPitch: 36, maxMidiPitch: 60 }, rhythm: "quarter-pulse" },
      }) as never,
    );
    expect(result.provenance.bass.rhythm).toBe("quarter-pulse");
    expect(result.components.bass).toHaveLength(32);
    expect(result.components.bass.at(-1)).toMatchObject({ startTick: 29_760, durationTicks: 960 });
  });

  it("normalizes omitted Bass inputs but rejects explicit undefined values", async () => {
    const omitted = request();
    delete omitted.bass;
    const result = await generateFirstPlayableCompositionV1(omitted as never);
    expect(result.provenance.bass).toEqual({
      range: { minMidiPitch: 36, maxMidiPitch: 60 },
      rhythm: "sustained",
    });
    await expect(
      generateFirstPlayableCompositionV1(request({ bass: undefined }) as never),
    ).rejects.toMatchObject({
      code: "INVALID_FIRST_PLAYABLE_REQUEST",
      field: "bass",
    });
    await expect(
      generateFirstPlayableCompositionV1(request({ bass: { range: undefined } }) as never),
    ).rejects.toMatchObject({ code: "INVALID_FIRST_PLAYABLE_REQUEST", field: "bass.range" });
    await expect(
      generateFirstPlayableCompositionV1(request({ bass: { rhythm: undefined } }) as never),
    ).rejects.toMatchObject({ code: "INVALID_FIRST_PLAYABLE_REQUEST", field: "bass.rhythm" });
  });

  it("supports every accepted Harmony profile/template family", async () => {
    const cases = [
      {
        profile: HARMONY_PROFILE_IDS.darkSynthwave,
        templateId: "degree-0654-natural-minor-v1",
        scale: "natural-minor",
        tonic: 0,
      },
      {
        profile: HARMONY_PROFILE_IDS.classicSynthwave,
        templateId: "degree-0344-major-v1",
        scale: "major",
        tonic: 2,
      },
      {
        profile: HARMONY_PROFILE_IDS.darkwave,
        templateId: "degree-0340-phrygian-v1",
        scale: "phrygian",
        tonic: 4,
      },
      {
        profile: HARMONY_PROFILE_IDS.midtempoCyberpunk,
        templateId: "degree-0654-phrygian-v1",
        scale: "phrygian",
        tonic: 7,
      },
    ] as const;

    for (const fixture of cases) {
      const result = await generateFirstPlayableCompositionV1(
        request({
          profile: { id: fixture.profile },
          harmony: {
            templateId: fixture.templateId,
            templateVersion: "v1",
            key: { tonic: fixture.tonic, scale: fixture.scale },
          },
        }) as never,
      );
      expect(result.components.harmony.profile).toBe(fixture.profile);
      expect(result.components.harmony.templateId).toBe(fixture.templateId);
      expect(verifyFirstPlayableCompositionV1(result)).toEqual(result);
    }
  });

  it("realizes Harmony once and shares that exact realization with Bass and V2 Arpeggiator", async () => {
    const harmonySpy = vi.spyOn(harmonyDomain, "realizeHarmonyProgression");
    const bassSpy = vi.spyOn(bassDomain, "generateBassEvents");
    const arpeggiatorSpy = vi.spyOn(arpeggiatorPolicyGenerator, "generateArpEventsWithPolicyV2");
    try {
      await generateFirstPlayableCompositionV1(request() as never);
      expect(harmonySpy).toHaveBeenCalledTimes(1);
      expect(bassSpy).toHaveBeenCalledTimes(1);
      expect(arpeggiatorSpy).toHaveBeenCalledTimes(1);
      expect(bassSpy.mock.calls[0]?.[0]).toBe(arpeggiatorSpy.mock.calls[0]?.[0].progression);
    } finally {
      harmonySpy.mockRestore();
      bassSpy.mockRestore();
      arpeggiatorSpy.mockRestore();
    }
  });

  it("enforces result-hash self-exclusion and profile identity before digest comparison", async () => {
    const result = await generateFirstPlayableCompositionV1(request() as never);
    const hashInput = serializeFirstPlayableCompositionHashInputV1(result);
    const alteredHash = { ...result, resultHash: "0".repeat(64) };
    expect(serializeFirstPlayableCompositionHashInputV1(alteredHash)).toBe(hashInput);

    const alteredProfile = {
      ...result,
      components: {
        ...result.components,
        harmony: result.components.harmony,
      },
      provenance: {
        ...result.provenance,
        profile: { id: HARMONY_PROFILE_IDS.darkwave },
      },
    };
    expect(() => verifyFirstPlayableCompositionV1(alteredProfile)).toThrowError(
      expect.objectContaining({
        code: "INVALID_FIRST_PLAYABLE_RESULT",
        field: "provenance.profile.id",
      }),
    );
  });

  it("rejects coordinator envelope identities and tempo with exact fields", async () => {
    await expect(
      generateFirstPlayableCompositionV1(request({ schema: "wrong" }) as never),
    ).rejects.toMatchObject({
      code: "UNSUPPORTED_FIRST_PLAYABLE_SCHEMA",
      field: "schema",
    });
    await expect(
      generateFirstPlayableCompositionV1(
        request({ section: { tempo: { microsecondsPerQuarter: 0 } } }) as never,
      ),
    ).rejects.toMatchObject({
      code: "INVALID_FIRST_PLAYABLE_TEMPO",
      field: "section.tempo.microsecondsPerQuarter",
    });
  });

  it("assigns malformed required request values to their owning boundary", async () => {
    const baseArpeggiator = request().arpeggiator as Record<string, unknown>;
    const cases = [
      [
        "intent.energy",
        { intent: { energy: "invalid", complexity: "medium" } },
        "INVALID_ENERGY",
        "energy",
      ],
      [
        "intent.complexity",
        { intent: { energy: "medium", complexity: "invalid" } },
        "INVALID_COMPLEXITY",
        "complexity",
      ],
      [
        "profile.id",
        { profile: { id: "invalid" } },
        "INVALID_FIRST_PLAYABLE_REQUEST",
        "profile.id",
      ],
      [
        "harmony.templateId",
        { harmony: { templateVersion: "v1", key: { tonic: 0, scale: "natural-minor" } } },
        "INVALID_FIRST_PLAYABLE_REQUEST",
        "harmony.templateId",
      ],
      [
        "harmony.templateVersion",
        {
          harmony: {
            templateId: "degree-0654-natural-minor-v1",
            key: { tonic: 0, scale: "natural-minor" },
          },
        },
        "INVALID_FIRST_PLAYABLE_REQUEST",
        "harmony.templateVersion",
      ],
      [
        "harmony.key",
        { harmony: { templateId: "degree-0654-natural-minor-v1", templateVersion: "v1" } },
        "INVALID_FIRST_PLAYABLE_REQUEST",
        "harmony.key",
      ],
      ["section.tempo", { section: {} }, "INVALID_FIRST_PLAYABLE_REQUEST", "section.tempo"],
      ["rootSeed", { rootSeed: undefined }, "INVALID_ROOT_SEED", "rootSeed"],
      [
        "arpeggiator.range",
        { arpeggiator: { ...baseArpeggiator, range: undefined } },
        "INVALID_FIRST_PLAYABLE_REQUEST",
        "arpeggiator.range",
      ],
      [
        "arpeggiator.profile.version",
        { arpeggiator: { ...baseArpeggiator, profile: {} } },
        "INVALID_FIRST_PLAYABLE_REQUEST",
        "arpeggiator.profile.version",
      ],
      [
        "arpeggiator.policy.version",
        { arpeggiator: { ...baseArpeggiator, policy: {} } },
        "INVALID_FIRST_PLAYABLE_REQUEST",
        "arpeggiator.policy.version",
      ],
      [
        "arpeggiator.seedDerivation.version",
        { arpeggiator: { ...baseArpeggiator, seedDerivation: {} } },
        "INVALID_FIRST_PLAYABLE_REQUEST",
        "arpeggiator.seedDerivation.version",
      ],
      [
        "arpeggiator.prng.version",
        { arpeggiator: { ...baseArpeggiator, prng: {} } },
        "INVALID_FIRST_PLAYABLE_REQUEST",
        "arpeggiator.prng.version",
      ],
    ] as const;
    for (const [_name, overrides, code, field] of cases) {
      await expect(
        generateFirstPlayableCompositionV1(request(overrides) as never),
      ).rejects.toMatchObject({ code, field });
    }
  });

  it("rejects accessor request properties without executing them", async () => {
    let executed = false;
    const input = request();
    Object.defineProperty(input, "schema", {
      configurable: true,
      enumerable: true,
      get() {
        executed = true;
        return FIRST_PLAYABLE_COMPOSITION_REQUEST_SCHEMA_V1;
      },
    });
    await expect(generateFirstPlayableCompositionV1(input as never)).rejects.toMatchObject({
      code: "INVALID_FIRST_PLAYABLE_REQUEST",
      field: "request.schema",
    });
    expect(executed).toBe(false);
  });

  it("does not invoke caller toJSON hooks during canonical serialization", async () => {
    const result = await generateFirstPlayableCompositionV1(request() as never);
    const toJSON = vi.fn(() => {
      throw new Error("caller toJSON must not execute");
    });
    expect(() => serializeFirstPlayableCompositionV1({ ...result, toJSON })).toThrowError(
      expect.objectContaining({ code: "INVALID_FIRST_PLAYABLE_RESULT" }),
    );
    expect(toJSON).not.toHaveBeenCalled();
  });

  it("preserves component-owned structured failures and rejects extra request fields", async () => {
    await expect(
      generateFirstPlayableCompositionV1(request({ extra: true }) as never),
    ).rejects.toBeInstanceOf(FirstPlayableCompositionValueError);
    await expect(
      generateFirstPlayableCompositionV1(request({ rootSeed: -1 }) as never),
    ).rejects.toMatchObject({ code: "INVALID_ROOT_SEED", field: "rootSeed" });
    await expect(
      generateFirstPlayableCompositionV1(
        request({ intent: { energy: "invalid", complexity: "medium" } }) as never,
      ),
    ).rejects.toMatchObject({ code: "INVALID_ENERGY", field: "energy" });
  });

  it("preserves V2 preflight semantics before Harmony or component generation", async () => {
    const harmonySpy = vi.spyOn(harmonyDomain, "realizeHarmonyProgression");
    const arpeggiatorSpy = vi.spyOn(arpeggiatorPolicyGenerator, "generateArpEventsWithPolicyV2");
    const componentSeedSpy = vi.spyOn(componentSeed, "deriveComponentSeedV1");
    const resolverSpy = vi.spyOn(arpeggiatorResolver, "resolveArpPlanV2");
    const projectorSpy = vi.spyOn(arpeggiatorProjector, "projectResolvedArpPlanV1");
    const baseArpeggiator = request().arpeggiator as Record<string, unknown>;
    const cases = [
      [
        "profile version",
        {
          ...baseArpeggiator,
          profile: { version: "nightdrive.genre-profile.arpeggiator.v1" },
        },
        "UNSUPPORTED_ARP_PROFILE_VERSION",
        "profile.version",
      ],
      [
        "policy version",
        {
          ...baseArpeggiator,
          policy: { version: "nightdrive.arpeggiator-policy.v1" },
        },
        "UNSUPPORTED_ARP_POLICY_VERSION",
        "policy.version",
      ],
      [
        "seed derivation version",
        {
          ...baseArpeggiator,
          seedDerivation: { version: "nightdrive.seed-derivation.component.v2" },
        },
        "UNSUPPORTED_SEED_DERIVATION_VERSION",
        "seedDerivation.version",
      ],
      [
        "PRNG version",
        {
          ...baseArpeggiator,
          prng: { version: "nightdrive.prng.mulberry32.v2" },
        },
        "UNSUPPORTED_PRNG_VERSION",
        "prng.version",
      ],
    ] as const;
    try {
      for (const [_name, arpeggiator, code, field] of cases) {
        await expect(
          generateFirstPlayableCompositionV1(request({ arpeggiator }) as never),
        ).rejects.toMatchObject({ code, field });
      }
      await expect(
        generateFirstPlayableCompositionV1(
          request({
            arpeggiator: {
              ...baseArpeggiator,
              profile: { version: "nightdrive.genre-profile.arpeggiator.v1" },
              policy: { version: "nightdrive.arpeggiator-policy.v1" },
            },
          }) as never,
        ),
      ).rejects.toMatchObject({
        code: "UNSUPPORTED_ARP_PROFILE_VERSION",
        field: "profile.version",
      });
      await expect(
        generateFirstPlayableCompositionV1(
          request({
            arpeggiator: {
              ...baseArpeggiator,
              policy: { version: "nightdrive.arpeggiator-policy.v1" },
              seedDerivation: { version: "nightdrive.seed-derivation.component.v2" },
            },
          }) as never,
        ),
      ).rejects.toMatchObject({
        code: "UNSUPPORTED_ARP_POLICY_VERSION",
        field: "policy.version",
      });
      await expect(
        generateFirstPlayableCompositionV1(
          request({
            arpeggiator: {
              ...baseArpeggiator,
              seedDerivation: { version: "nightdrive.seed-derivation.component.v2" },
              prng: { version: "nightdrive.prng.mulberry32.v2" },
            },
          }) as never,
        ),
      ).rejects.toMatchObject({
        code: "UNSUPPORTED_SEED_DERIVATION_VERSION",
        field: "seedDerivation.version",
      });
      await expect(
        generateFirstPlayableCompositionV1(
          request({
            rootSeed: -1,
            arpeggiator: {
              ...baseArpeggiator,
              profile: { version: "nightdrive.genre-profile.arpeggiator.v1" },
            },
          }) as never,
        ),
      ).rejects.toMatchObject({
        code: "UNSUPPORTED_ARP_PROFILE_VERSION",
        field: "profile.version",
      });
      const invalidRanges = [
        ["null", null],
        ["array", []],
        ["malformed record", { minMidiPitch: 0 }],
        ["reversed", { minMidiPitch: 127, maxMidiPitch: 0 }],
        ["out of domain", { minMidiPitch: -1, maxMidiPitch: 127 }],
      ] as const;
      for (const [_name, range] of invalidRanges) {
        await expect(
          generateFirstPlayableCompositionV1(
            request({ rootSeed: -1, arpeggiator: { ...baseArpeggiator, range } }) as never,
          ),
        ).rejects.toMatchObject({ code: "INVALID_ROOT_SEED", field: "rootSeed" });
      }
      expect(harmonySpy).not.toHaveBeenCalled();
      expect(arpeggiatorSpy).not.toHaveBeenCalled();
      expect(componentSeedSpy).not.toHaveBeenCalled();
      expect(resolverSpy).not.toHaveBeenCalled();
      expect(projectorSpy).not.toHaveBeenCalled();
    } finally {
      harmonySpy.mockRestore();
      arpeggiatorSpy.mockRestore();
      componentSeedSpy.mockRestore();
      resolverSpy.mockRestore();
      projectorSpy.mockRestore();
    }
  });

  it("does not use ambient randomness", async () => {
    const random = vi.spyOn(Math, "random").mockImplementation(() => {
      throw new Error("ambient randomness is prohibited");
    });
    try {
      await generateFirstPlayableCompositionV1(request() as never);
      expect(random).not.toHaveBeenCalled();
    } finally {
      random.mockRestore();
    }
  });
});
