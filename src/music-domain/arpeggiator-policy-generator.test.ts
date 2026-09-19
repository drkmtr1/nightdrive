// @vitest-environment node

import { readFileSync } from "node:fs";
import { beforeEach, describe, expect, expectTypeOf, it, vi } from "vitest";
import {
  ARP_DIRECTION_IDS,
  ARP_ERROR_CODES,
  ARP_RATE_IDS,
  ArpValueError,
  createArpRange,
  generateArpEvents,
} from "./arpeggiator";
import {
  ARP_POLICY_VERSION_V1,
  ARP_POLICY_VERSION_V2,
  ARP_PROFILE_DATA_VERSION_V1,
  ARP_PROFILE_DATA_VERSION_V2,
  SharedArpPolicyConfigurationError,
} from "./arpeggiator-policy-configuration";
import {
  ArpGenreProfileConfigurationError,
  buildArpWeightedCandidatesV1,
  validateArpGenreProfileConfigurationV1,
} from "./arpeggiator-profile-configuration";
import {
  type ArpPolicyGenerationRequestV1,
  type ArpPolicyGenerationRequestV2,
  type ArpPolicyGenerationResultV2,
  COMPONENT_SEED_DERIVATION_VERSION_V1,
  generateArpEventsWithPolicyV1,
  generateArpEventsWithPolicyV2,
} from "./arpeggiator-policy-generator";
import * as policyConfiguration from "./arpeggiator-policy-configuration";
import * as profileConfiguration from "./arpeggiator-profile-configuration";
import * as resolver from "./arpeggiator-policy-resolver";
import * as projector from "./arpeggiator-resolved-plan-projector";
import { ComponentSeedValueError, deriveComponentSeedV1 } from "./component-seed";
import * as componentSeed from "./component-seed";
import {
  getHarmonyTemplatesForProfile,
  HARMONY_PROFILE_IDS,
  type HarmonyProfileId,
  realizeHarmonyProgression,
} from "./harmony";
import * as publicDomain from "./index";
import { createKey } from "./key";
import { SUBDIVISION_TICKS } from "./musical-time";
import { createPitchClass } from "./pitch";
import { PRNG_ALGORITHM_ID } from "./prng";
import * as prng from "./prng";

vi.mock("./arpeggiator-policy-configuration", { spy: true });
vi.mock("./arpeggiator-profile-configuration", { spy: true });
vi.mock("./arpeggiator-policy-resolver", { spy: true });
vi.mock("./arpeggiator-resolved-plan-projector", { spy: true });
vi.mock("./component-seed", { spy: true });
vi.mock("./prng", { spy: true });

const ALL_PROFILES = Object.values(HARMONY_PROFILE_IDS);

const GOLDEN_RESULTS = {
  [HARMONY_PROFILE_IDS.darkSynthwave]: {
    plan: {
      rate: "eighth",
      direction: "down",
      gateTicks: 360,
      octaveRange: 2,
      maskId: "three-of-four",
    },
    count: 48,
    first: [
      { pitch: 55, startTick: 0, durationTicks: 360 },
      { pitch: 51, startTick: 480, durationTicks: 360 },
      { pitch: 43, startTick: 1440, durationTicks: 360 },
      { pitch: 39, startTick: 1920, durationTicks: 360 },
    ],
    last: { pitch: 47, startTick: 30_240, durationTicks: 360 },
  },
  [HARMONY_PROFILE_IDS.classicSynthwave]: {
    plan: {
      rate: "eighth",
      direction: "up-down",
      gateTicks: 360,
      octaveRange: 1,
      maskId: "three-of-four",
    },
    count: 48,
    first: [
      { pitch: 48, startTick: 0, durationTicks: 360 },
      { pitch: 52, startTick: 480, durationTicks: 360 },
      { pitch: 52, startTick: 1440, durationTicks: 360 },
      { pitch: 48, startTick: 1920, durationTicks: 360 },
    ],
    last: { pitch: 52, startTick: 30_240, durationTicks: 360 },
  },
  [HARMONY_PROFILE_IDS.darkwave]: {
    plan: {
      rate: "eighth",
      direction: "up",
      gateTicks: 480,
      octaveRange: 1,
      maskId: "alternating-rest-on",
    },
    count: 32,
    first: [
      { pitch: 39, startTick: 480, durationTicks: 480 },
      { pitch: 36, startTick: 1440, durationTicks: 480 },
      { pitch: 43, startTick: 2400, durationTicks: 480 },
      { pitch: 39, startTick: 3360, durationTicks: 480 },
    ],
    last: { pitch: 35, startTick: 30_240, durationTicks: 480 },
  },
  [HARMONY_PROFILE_IDS.midtempoCyberpunk]: {
    plan: {
      rate: "eighth",
      direction: "down-up",
      gateTicks: 240,
      octaveRange: 1,
      maskId: "alternating-on-rest",
    },
    count: 32,
    first: [
      { pitch: 48, startTick: 0, durationTicks: 240 },
      { pitch: 39, startTick: 960, durationTicks: 240 },
      { pitch: 48, startTick: 1920, durationTicks: 240 },
      { pitch: 39, startTick: 2880, durationTicks: 240 },
    ],
    last: { pitch: 38, startTick: 29_760, durationTicks: 240 },
  },
} as const;

function progression(profileId: HarmonyProfileId = HARMONY_PROFILE_IDS.classicSynthwave) {
  const template = getHarmonyTemplatesForProfile(profileId)[0];
  if (template === undefined) throw new Error(`Missing Harmony template for ${profileId}.`);
  return realizeHarmonyProgression(
    profileId,
    template,
    createKey(createPitchClass(0), template.scale),
  );
}

function request(
  profileId: HarmonyProfileId = HARMONY_PROFILE_IDS.classicSynthwave,
  rootSeed = 0,
): ArpPolicyGenerationRequestV1 {
  return Object.freeze({
    progression: progression(profileId),
    range: createArpRange({ minMidiPitch: 0, maxMidiPitch: 127 }),
    intent: Object.freeze({ energy: "medium", complexity: "medium" }),
    profile: Object.freeze({ id: profileId, version: ARP_PROFILE_DATA_VERSION_V1 }),
    policy: Object.freeze({ version: ARP_POLICY_VERSION_V1 }),
    seedDerivation: Object.freeze({ version: COMPONENT_SEED_DERIVATION_VERSION_V1 }),
    prng: Object.freeze({ version: PRNG_ALGORITHM_ID }),
    rootSeed,
  });
}

function captureArpError(operation: () => unknown): ArpValueError {
  try {
    operation();
    throw new Error("Expected an ArpValueError.");
  } catch (error) {
    expect(error).toBeInstanceOf(ArpValueError);
    return error as ArpValueError;
  }
}

function expectArpError(
  operation: () => unknown,
  code: ArpValueError["code"],
  field: string,
): ArpValueError {
  const error = captureArpError(operation);
  expect(error).toMatchObject({ code, field });
  return error;
}

function withField(
  base: ArpPolicyGenerationRequestV1 | ArpPolicyGenerationRequestV2,
  field: string,
  value: unknown,
): unknown {
  const [owner, property] = field.split(".");
  if (property === undefined) return { ...base, [owner]: value };
  return {
    ...base,
    [owner]: {
      ...(base as unknown as Record<string, Record<string, unknown>>)[owner],
      [property]: value,
    },
  };
}

function withoutField(
  base: ArpPolicyGenerationRequestV1 | ArpPolicyGenerationRequestV2,
  field: string,
): unknown {
  const [owner, property] = field.split(".");
  if (property === undefined) {
    const copy = { ...base } as Record<string, unknown>;
    delete copy[owner];
    return copy;
  }
  const nested = {
    ...(base as unknown as Record<string, Record<string, unknown>>)[owner],
  };
  delete nested[property];
  return { ...base, [owner]: nested };
}

describe("Stage 7C enclosing Arpeggiator policy generation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it.each(ALL_PROFILES)("returns an exact deterministic frozen result for %s", (profileId) => {
    const input = request(profileId, 0);
    const before = structuredClone(input);
    const first = generateArpEventsWithPolicyV1(input);
    const second = generateArpEventsWithPolicyV1(input);
    const golden = GOLDEN_RESULTS[profileId];

    expect(Reflect.ownKeys(first)).toEqual(["plan", "events"]);
    expect(Reflect.ownKeys(first.plan)).toEqual([
      "rate",
      "direction",
      "gateTicks",
      "octaveRange",
      "maskId",
    ]);
    expect(first.plan).toEqual(golden.plan);
    expect(first.events).toHaveLength(golden.count);
    expect(first.events.slice(0, 4)).toEqual(golden.first);
    expect(first.events.at(-1)).toEqual(golden.last);
    expect(first).toEqual(second);
    expect(input).toEqual(before);
    expect(Object.isFrozen(first)).toBe(true);
    expect(Object.isFrozen(first.plan)).toBe(true);
    expect(Object.isFrozen(first.events)).toBe(true);
    expect(first.events.length).toBeGreaterThan(0);
    expect(first.events.every(Object.isFrozen)).toBe(true);
  });

  it("uses the exact root-to-arpeggiator handoff and accepted resolver/projector path", () => {
    const input = request(HARMONY_PROFILE_IDS.darkSynthwave, 0xffff_ffff);
    const result = generateArpEventsWithPolicyV1(input);

    expect(componentSeed.deriveComponentSeedV1).toHaveBeenCalledTimes(1);
    expect(componentSeed.deriveComponentSeedV1).toHaveBeenCalledWith(0xffff_ffff, "arpeggiator");
    expect(resolver.resolveArpPlanV1).toHaveBeenCalledTimes(1);
    expect(resolver.resolveArpPlanV1).toHaveBeenCalledWith(
      { profileId: input.profile.id, energy: "medium", complexity: "medium" },
      deriveComponentSeedV1(0xffff_ffff, "arpeggiator"),
    );
    expect(projector.projectResolvedArpPlanV1).toHaveBeenCalledTimes(1);
    expect(projector.projectResolvedArpPlanV1).toHaveBeenCalledWith(
      input.progression,
      input.range,
      result.plan,
    );
  });

  it("accepts both canonical root-seed boundaries and is isolated from ambient randomness", () => {
    const random = vi.spyOn(Math, "random").mockImplementation(() => {
      throw new Error("ambient randomness is prohibited");
    });
    try {
      const zero = generateArpEventsWithPolicyV1(request(HARMONY_PROFILE_IDS.darkwave, 0));
      const maximum = generateArpEventsWithPolicyV1(
        request(HARMONY_PROFILE_IDS.darkwave, 0xffff_ffff),
      );
      expect(zero.events.length).toBeGreaterThan(0);
      expect(maximum.events.length).toBeGreaterThan(0);
      expect(zero.plan).not.toEqual(maximum.plan);
      expect(random).not.toHaveBeenCalled();
    } finally {
      random.mockRestore();
    }
  });

  it.each([
    ["intent.energy", ARP_ERROR_CODES.invalidEnergy],
    ["intent.complexity", ARP_ERROR_CODES.invalidComplexity],
    ["profile.id", ARP_ERROR_CODES.invalidArpProfile],
    ["profile.version", ARP_ERROR_CODES.unsupportedArpProfileVersion],
    ["policy.version", ARP_ERROR_CODES.unsupportedArpPolicyVersion],
    ["seedDerivation.version", ARP_ERROR_CODES.unsupportedSeedDerivationVersion],
    ["prng.version", ARP_ERROR_CODES.unsupportedPrngVersion],
    ["rootSeed", ARP_ERROR_CODES.invalidRootSeed],
  ] as const)("rejects missing and explicit undefined %s at its exact owner", (field, code) => {
    const valid = request();
    expectArpError(
      () => generateArpEventsWithPolicyV1(withoutField(valid, field) as never),
      code,
      field,
    );
    expectArpError(
      () => generateArpEventsWithPolicyV1(withField(valid, field, undefined) as never),
      code,
      field,
    );
    expect(componentSeed.deriveComponentSeedV1).not.toHaveBeenCalled();
    expect(prng.createMulberry32State).not.toHaveBeenCalled();
    expect(prng.nextMulberry32).not.toHaveBeenCalled();
    expect(resolver.resolveArpPlanV1).not.toHaveBeenCalled();
    expect(projector.projectResolvedArpPlanV1).not.toHaveBeenCalled();
  });

  it.each([Number.NaN, Number.POSITIVE_INFINITY, -1, 0.5, 0x1_0000_0000, "0", 0n, null, false])(
    "rejects malformed root seed %s without coercion",
    (rootSeed) => {
      expectArpError(
        () => generateArpEventsWithPolicyV1({ ...request(), rootSeed } as never),
        ARP_ERROR_CODES.invalidRootSeed,
        "rootSeed",
      );
    },
  );

  it.each([
    ["seedDerivation.version", ARP_ERROR_CODES.unsupportedSeedDerivationVersion],
    ["prng.version", ARP_ERROR_CODES.unsupportedPrngVersion],
  ] as const)("rejects unsupported %s identities without inference", (field, code) => {
    expectArpError(
      () => generateArpEventsWithPolicyV1(withField(request(), field, "future") as never),
      code,
      field,
    );
  });

  it.each([
    [
      "energy before complexity",
      (base: ArpPolicyGenerationRequestV1) => ({
        ...base,
        intent: { energy: "bad", complexity: "bad" },
      }),
      ARP_ERROR_CODES.invalidEnergy,
      "intent.energy",
    ],
    [
      "complexity before profile ID",
      (base: ArpPolicyGenerationRequestV1) => ({
        ...base,
        intent: { ...base.intent, complexity: "bad" },
        profile: { ...base.profile, id: "bad" },
      }),
      ARP_ERROR_CODES.invalidComplexity,
      "intent.complexity",
    ],
    [
      "profile ID before profile version",
      (base: ArpPolicyGenerationRequestV1) => ({
        ...base,
        profile: { id: "bad", version: "bad" },
      }),
      ARP_ERROR_CODES.invalidArpProfile,
      "profile.id",
    ],
    [
      "profile version before policy version",
      (base: ArpPolicyGenerationRequestV1) => ({
        ...base,
        profile: { ...base.profile, version: "bad" },
        policy: { version: "bad" },
      }),
      ARP_ERROR_CODES.unsupportedArpProfileVersion,
      "profile.version",
    ],
    [
      "policy version before root seed",
      (base: ArpPolicyGenerationRequestV1) => ({
        ...base,
        policy: { version: "bad" },
        rootSeed: -1,
      }),
      ARP_ERROR_CODES.unsupportedArpPolicyVersion,
      "policy.version",
    ],
    [
      "root seed before profile configuration",
      (base: ArpPolicyGenerationRequestV1) => ({ ...base, rootSeed: -1 }),
      ARP_ERROR_CODES.invalidRootSeed,
      "rootSeed",
    ],
    [
      "range before Harmony",
      (base: ArpPolicyGenerationRequestV1) => ({
        ...base,
        range: { minMidiPitch: -1, maxMidiPitch: 127 },
        progression: { ...base.progression, profile: "bad" },
      }),
      ARP_ERROR_CODES.invalidArpRange,
      "range.minMidiPitch",
    ],
    [
      "Harmony before profile mismatch",
      (base: ArpPolicyGenerationRequestV1) => ({
        ...base,
        progression: { ...base.progression, profile: HARMONY_PROFILE_IDS.darkwave, slots: [] },
      }),
      ARP_ERROR_CODES.invalidHarmonicContext,
      "progression.templateVersion",
    ],
  ] as const)("locks mixed-invalid precedence: %s", (_name, mutate, code, field) => {
    expectArpError(() => generateArpEventsWithPolicyV1(mutate(request()) as never), code, field);
  });

  it("validates root seed and configuration before a valid Harmony profile mismatch", () => {
    const mismatch = {
      ...request(HARMONY_PROFILE_IDS.classicSynthwave),
      profile: {
        id: HARMONY_PROFILE_IDS.darkwave,
        version: ARP_PROFILE_DATA_VERSION_V1,
      },
    };
    expectArpError(
      () => generateArpEventsWithPolicyV1({ ...mismatch, rootSeed: -1 } as never),
      ARP_ERROR_CODES.invalidRootSeed,
      "rootSeed",
    );

    vi.mocked(profileConfiguration.validateArpGenreProfileConfigurationV1).mockImplementationOnce(
      () => {
        throw new ArpGenreProfileConfigurationError("INVALID_PROFILE_SET", "private detail");
      },
    );
    expectArpError(
      () => generateArpEventsWithPolicyV1(mismatch as never),
      ARP_ERROR_CODES.invalidArpPolicyConfiguration,
      "profile.version",
    );

    expectArpError(
      () => generateArpEventsWithPolicyV1(mismatch as never),
      ARP_ERROR_CODES.incompatibleArpProfileContext,
      "profile.id",
    );
  });

  it("orders invalid root, malformed profile configuration, and invalid range exactly", () => {
    vi.mocked(profileConfiguration.validateArpGenreProfileConfigurationV1).mockImplementationOnce(
      () => {
        throw new ArpGenreProfileConfigurationError("INVALID_PROFILE_SET", "private detail");
      },
    );
    const invalidRange = { minMidiPitch: -1, maxMidiPitch: 127 };

    expectArpError(
      () =>
        generateArpEventsWithPolicyV1({
          ...request(),
          range: invalidRange,
          rootSeed: -1,
        } as never),
      ARP_ERROR_CODES.invalidRootSeed,
      "rootSeed",
    );
    expect(profileConfiguration.validateArpGenreProfileConfigurationV1).not.toHaveBeenCalled();

    expectArpError(
      () => generateArpEventsWithPolicyV1({ ...request(), range: invalidRange } as never),
      ARP_ERROR_CODES.invalidArpPolicyConfiguration,
      "profile.version",
    );
  });

  it.each(
    ALL_PROFILES.flatMap((progressionProfile) =>
      ALL_PROFILES.filter((requestProfile) => requestProfile !== progressionProfile).map(
        (requestProfile) => [progressionProfile, requestProfile] as const,
      ),
    ),
  )(
    "rejects valid Harmony profile %s with valid request profile %s before seed derivation",
    (progressionProfile, requestProfile) => {
      const input = {
        ...request(progressionProfile),
        profile: { id: requestProfile, version: ARP_PROFILE_DATA_VERSION_V1 },
      };
      expectArpError(
        () => generateArpEventsWithPolicyV1(input),
        ARP_ERROR_CODES.incompatibleArpProfileContext,
        "profile.id",
      );
      expect(componentSeed.deriveComponentSeedV1).not.toHaveBeenCalled();
      expect(prng.createMulberry32State).not.toHaveBeenCalled();
      expect(resolver.resolveArpPlanV1).not.toHaveBeenCalled();
      expect(projector.projectResolvedArpPlanV1).not.toHaveBeenCalled();
    },
  );

  it("translates profile configuration failures without leaking helper taxonomy", () => {
    vi.mocked(validateArpGenreProfileConfigurationV1).mockImplementationOnce(() => {
      throw new ArpGenreProfileConfigurationError("INVALID_FINAL_WEIGHTS", "private detail");
    });
    const error = expectArpError(
      () => generateArpEventsWithPolicyV1(request()),
      ARP_ERROR_CODES.invalidArpPolicyConfiguration,
      "profile.version",
    );
    expect(error).not.toHaveProperty("owner");
    expect(error).not.toHaveProperty("kind");
    expect(componentSeed.deriveComponentSeedV1).not.toHaveBeenCalled();
    expect(resolver.resolveArpPlanV1).not.toHaveBeenCalled();
    expect(projector.projectResolvedArpPlanV1).not.toHaveBeenCalled();
    expect(prng.createMulberry32State).not.toHaveBeenCalled();
    expect(prng.nextMulberry32).not.toHaveBeenCalled();
  });

  it("translates candidate-construction failures and stops the exact decision order", async () => {
    const actualProfileConfiguration = await vi.importActual<
      typeof import("./arpeggiator-profile-configuration")
    >("./arpeggiator-profile-configuration");
    vi.mocked(buildArpWeightedCandidatesV1)
      .mockImplementationOnce((...arguments_) =>
        actualProfileConfiguration.buildArpWeightedCandidatesV1(...arguments_),
      )
      .mockImplementationOnce((...arguments_) =>
        actualProfileConfiguration.buildArpWeightedCandidatesV1(...arguments_),
      )
      .mockImplementationOnce(() => {
        throw new ArpGenreProfileConfigurationError("INVALID_FINAL_WEIGHTS", "private detail");
      });
    expectArpError(
      () => generateArpEventsWithPolicyV1(request()),
      ARP_ERROR_CODES.invalidArpPolicyConfiguration,
      "profile.version",
    );
    expect(vi.mocked(buildArpWeightedCandidatesV1).mock.calls.map((call) => call[2])).toEqual([
      "rate",
      "octave-range",
      "direction",
    ]);
    expect(componentSeed.deriveComponentSeedV1).not.toHaveBeenCalled();
    expect(prng.createMulberry32State).not.toHaveBeenCalled();
    expect(resolver.resolveArpPlanV1).not.toHaveBeenCalled();
    expect(projector.projectResolvedArpPlanV1).not.toHaveBeenCalled();
  });

  it("translates shared configuration failures at policy.version", () => {
    vi.mocked(policyConfiguration.validateSharedArpPolicyConfigurationV1).mockImplementationOnce(
      () => {
        throw new SharedArpPolicyConfigurationError("INVALID_GATE_MAPPINGS", "private detail");
      },
    );
    const error = expectArpError(
      () => generateArpEventsWithPolicyV1(request()),
      ARP_ERROR_CODES.invalidArpPolicyConfiguration,
      "policy.version",
    );
    expect(error).not.toHaveProperty("owner");
    expect(error).not.toHaveProperty("kind");
    expect(componentSeed.deriveComponentSeedV1).not.toHaveBeenCalled();
    expect(prng.createMulberry32State).not.toHaveBeenCalled();
    expect(prng.nextMulberry32).not.toHaveBeenCalled();
    expect(resolver.resolveArpPlanV1).not.toHaveBeenCalled();
    expect(projector.projectResolvedArpPlanV1).not.toHaveBeenCalled();
  });

  it("constructs all profile candidates in exact decision order before shared/range/Harmony work", () => {
    generateArpEventsWithPolicyV1(request());
    expect(
      vi
        .mocked(buildArpWeightedCandidatesV1)
        .mock.calls.slice(0, 5)
        .map((call) => call[2]),
    ).toEqual(["rate", "octave-range", "direction", "mask", "gate"]);
    expect(profileConfiguration.validateArpGenreProfileConfigurationV1).toHaveBeenCalled();
    expect(policyConfiguration.validateSharedArpPolicyConfigurationV1).toHaveBeenCalled();
  });

  it("performs no seed, PRNG, resolver, or projector work when any preflight step fails", () => {
    const invalidRange = {
      ...request(),
      range: { minMidiPitch: -1, maxMidiPitch: 127 },
    };
    expectArpError(
      () => generateArpEventsWithPolicyV1(invalidRange as never),
      ARP_ERROR_CODES.invalidArpRange,
      "range.minMidiPitch",
    );
    expect(componentSeed.deriveComponentSeedV1).not.toHaveBeenCalled();
    expect(prng.createMulberry32State).not.toHaveBeenCalled();
    expect(prng.nextMulberry32).not.toHaveBeenCalled();
    expect(resolver.resolveArpPlanV1).not.toHaveBeenCalled();
    expect(projector.projectResolvedArpPlanV1).not.toHaveBeenCalled();
  });

  it("finishes valid Harmony validation and profile matching before any downstream work", () => {
    const invalidHarmony = {
      ...request(),
      progression: { ...request().progression, slots: [] },
      range: createArpRange({ minMidiPitch: 127, maxMidiPitch: 127 }),
    };
    expectArpError(
      () => generateArpEventsWithPolicyV1(invalidHarmony as never),
      ARP_ERROR_CODES.invalidHarmonicContext,
      "progression.slots",
    );
    expect(componentSeed.deriveComponentSeedV1).not.toHaveBeenCalled();
    expect(prng.createMulberry32State).not.toHaveBeenCalled();
    expect(prng.nextMulberry32).not.toHaveBeenCalled();
    expect(resolver.resolveArpPlanV1).not.toHaveBeenCalled();
    expect(projector.projectResolvedArpPlanV1).not.toHaveBeenCalled();
  });

  it("treats an impossible post-preflight seed failure as internal", () => {
    vi.mocked(componentSeed.deriveComponentSeedV1).mockImplementationOnce(() => {
      throw new ComponentSeedValueError("INVALID_COMPONENT_ID", "componentId", "impossible");
    });
    let caught: unknown;
    try {
      generateArpEventsWithPolicyV1(request());
    } catch (error) {
      caught = error;
    }
    expect(caught).toBeInstanceOf(Error);
    expect(caught).not.toBeInstanceOf(ArpValueError);
    expect(caught).toMatchObject({
      message: "Stage 7C component-seed derivation invariant failed.",
    });
  });

  it("treats an impossible selected value as internal and returns no partial result", () => {
    vi.mocked(resolver.resolveArpPlanV1).mockReturnValueOnce(
      Object.freeze({
        rate: ARP_RATE_IDS.quarter,
        direction: ARP_DIRECTION_IDS.up,
        gateTicks: SUBDIVISION_TICKS.quarter,
        octaveRange: 99,
        maskId: "full",
      }) as never,
    );
    expect(() => generateArpEventsWithPolicyV1(request())).toThrow(
      "Stage 7C Arpeggiator integration invariant failed",
    );
    expect(projector.projectResolvedArpPlanV1).not.toHaveBeenCalled();
  });

  it("does not translate unrelated post-preflight projector failures", () => {
    vi.mocked(projector.projectResolvedArpPlanV1).mockImplementationOnce(() => {
      throw new Error("impossible timing invariant");
    });
    let caught: unknown;
    try {
      generateArpEventsWithPolicyV1(request());
    } catch (error) {
      caught = error;
    }
    expect(caught).toMatchObject({ message: "impossible timing invariant" });
    expect(caught).not.toBeInstanceOf(ArpValueError);
  });

  it("exposes the first post-resolution no-legal-pitch failure with no partial result", () => {
    const input = {
      ...request(),
      range: createArpRange({ minMidiPitch: 127, maxMidiPitch: 127 }),
    };
    expectArpError(
      () => generateArpEventsWithPolicyV1(input),
      ARP_ERROR_CODES.noLegalArpPitch,
      "progression.slots[0].voicing.midiPitches",
    );
    expect(componentSeed.deriveComponentSeedV1).toHaveBeenCalledTimes(1);
    expect(resolver.resolveArpPlanV1).toHaveBeenCalledTimes(1);
    expect(projector.projectResolvedArpPlanV1).toHaveBeenCalledTimes(1);
  });

  it("preserves Stage 7B canonical event behavior for a compatible resolved plan", async () => {
    const actualProfileConfiguration = await vi.importActual<
      typeof import("./arpeggiator-profile-configuration")
    >("./arpeggiator-profile-configuration");
    vi.mocked(buildArpWeightedCandidatesV1).mockImplementation((...arguments_) =>
      arguments_[2] === "gate"
        ? [Object.freeze({ value: "long", weight: 1 })]
        : actualProfileConfiguration.buildArpWeightedCandidatesV1(...arguments_),
    );
    vi.mocked(resolver.resolveArpPlanV1).mockReturnValueOnce(
      Object.freeze({
        rate: ARP_RATE_IDS.eighth,
        direction: ARP_DIRECTION_IDS.up,
        gateTicks: SUBDIVISION_TICKS.eighth,
        octaveRange: 1,
        maskId: "full",
      }),
    );
    const input = request();
    const result = generateArpEventsWithPolicyV1(input);
    expect(result.events).toEqual(
      generateArpEvents(input.progression, input.range, {
        rate: result.plan.rate,
        direction: result.plan.direction,
        gateTicks: result.plan.gateTicks,
      }),
    );
  });

  it("exposes only the accepted public Stage 7C boundary through the broad barrel", () => {
    expect(publicDomain.generateArpEventsWithPolicyV1).toBe(generateArpEventsWithPolicyV1);
    expect(publicDomain.ARP_PROFILE_DATA_VERSION_V1).toBe(ARP_PROFILE_DATA_VERSION_V1);
    expect(publicDomain.ARP_POLICY_VERSION_V1).toBe(ARP_POLICY_VERSION_V1);
    expect(publicDomain.COMPONENT_SEED_DERIVATION_VERSION_V1).toBe(
      COMPONENT_SEED_DERIVATION_VERSION_V1,
    );
    expect(publicDomain).not.toHaveProperty("resolveArpPlanV1");
    expect(publicDomain).not.toHaveProperty("projectResolvedArpPlanV1");
    expect(publicDomain).not.toHaveProperty("selectWeightedCandidateV1");
    expect(publicDomain).not.toHaveProperty("ARP_DENSITY_MASK_CATALOG_V1");
    expect(publicDomain).not.toHaveProperty("ARP_GENRE_PROFILE_CONFIGURATION_V1");
    expect(publicDomain).not.toHaveProperty("SHARED_ARP_POLICY_CONFIGURATION_V1");
  });

  it("contains no aggregate, ambient, browser, persistence, MIDI, or AI integration", () => {
    const source = readFileSync(
      new URL("./arpeggiator-policy-generator.ts", import.meta.url),
      "utf8",
    );
    for (const forbidden of [
      "Math.random",
      "Date.now",
      "new Date",
      "Intl.",
      "fetch(",
      "WebSocket",
      "navigator",
      "process.env",
      "provenance",
      'from "./midi',
      "supabase",
      "openai",
    ]) {
      expect(source.toLowerCase()).not.toContain(forbidden.toLowerCase());
    }
  });
});

function requestV2(
  profileId: HarmonyProfileId = HARMONY_PROFILE_IDS.classicSynthwave,
  rootSeed = 0,
): ArpPolicyGenerationRequestV2 {
  return Object.freeze({
    ...request(profileId, rootSeed),
    profile: Object.freeze({ id: profileId, version: ARP_PROFILE_DATA_VERSION_V2 }),
    policy: Object.freeze({ version: ARP_POLICY_VERSION_V2 }),
  });
}

function expectPreflightFailure(input: unknown, code: ArpValueError["code"], field: string) {
  let result: unknown;
  const error = expectArpError(
    () => {
      result = generateArpEventsWithPolicyV2(input as never);
    },
    code,
    field,
  );
  expect(result).toBeUndefined();
  for (const downstream of [
    componentSeed.deriveComponentSeedV1,
    prng.createMulberry32State,
    prng.nextMulberry32,
    resolver.resolveArpPlanV1,
    resolver.resolveArpPlanV2,
    projector.projectResolvedArpPlanV1,
  ]) {
    expect(downstream).not.toHaveBeenCalled();
  }
  return error;
}

describe("public V2 Arpeggiator policy generation", () => {
  beforeEach(() => {
    // Restore the real spy implementations, including the V1 suite's controlled overrides.
    vi.resetAllMocks();
  });

  it.each(ALL_PROFILES)(
    "preserves literal center anchors, ownership and immutable replay for %s",
    (profileId) => {
      const input = requestV2(profileId);
      const before = structuredClone(input);
      const profileBefore = structuredClone(
        profileConfiguration.ARP_GENRE_PROFILE_CONFIGURATION_V2,
      );
      const sharedBefore = structuredClone(policyConfiguration.SHARED_ARP_POLICY_CONFIGURATION_V2);
      const result = generateArpEventsWithPolicyV2(input);
      // R1's accepted medium/medium anchor lists preserve these literal V1 outcomes.
      const golden = GOLDEN_RESULTS[profileId];
      expect(result.plan).toEqual(golden.plan);
      expect(result.events).toHaveLength(golden.count);
      expect(result.events.slice(0, 4)).toEqual(golden.first);
      expect(result.events.at(-1)).toEqual(golden.last);
      expect(Object.keys(result)).toEqual(["plan", "events"]);
      expect(Object.keys(result.plan)).toEqual([
        "rate",
        "direction",
        "gateTicks",
        "octaveRange",
        "maskId",
      ]);
      expect([result, result.plan, result.events, ...result.events].every(Object.isFrozen)).toBe(
        true,
      );
      let start = 0;
      for (const slot of input.progression.slots) {
        const end = start + slot.bars * 3840;
        for (const event of result.events.filter(
          (event) => event.startTick >= start && event.startTick < end,
        )) {
          expect(Object.keys(event)).toEqual(["pitch", "startTick", "durationTicks"]);
          expect(event.startTick + event.durationTicks).toBeLessThanOrEqual(end);
          expect(
            slot.voicing.midiPitches.some(
              (pitch) =>
                event.pitch >= pitch &&
                (event.pitch - pitch) % 12 === 0 &&
                (event.pitch - pitch) / 12 < result.plan.octaveRange,
            ),
          ).toBe(true);
        }
        start = end;
      }
      expect(
        result.events.every(
          (event, i) => i === 0 || event.startTick > result.events[i - 1].startTick,
        ),
      ).toBe(true);
      expect(generateArpEventsWithPolicyV2(input)).toEqual(result);
      expect(input).toEqual(before);
      expect(profileConfiguration.ARP_GENRE_PROFILE_CONFIGURATION_V2).toEqual(profileBefore);
      expect(policyConfiguration.SHARED_ARP_POLICY_CONFIGURATION_V2).toEqual(sharedBefore);
    },
  );

  it.each([0, 0xffff_ffff, 42, 123456789])(
    "uses one fixed seed handoff and five V2 draws for root %s",
    (root) => {
      const input = requestV2(HARMONY_PROFILE_IDS.darkSynthwave, root);
      const result = generateArpEventsWithPolicyV2(input);
      expect(componentSeed.deriveComponentSeedV1).toHaveBeenCalledExactlyOnceWith(
        root,
        "arpeggiator",
      );
      const seed = vi.mocked(componentSeed.deriveComponentSeedV1).mock.results[0].value;
      expect(resolver.resolveArpPlanV2).toHaveBeenCalledExactlyOnceWith(
        { profileId: input.profile.id, energy: "medium", complexity: "medium" },
        seed,
      );
      expect(resolver.resolveArpPlanV1).not.toHaveBeenCalled();
      expect(prng.createMulberry32State).toHaveBeenCalledExactlyOnceWith(seed);
      expect(prng.nextMulberry32).toHaveBeenCalledTimes(5);
      expect(projector.projectResolvedArpPlanV1).toHaveBeenCalledExactlyOnceWith(
        input.progression,
        input.range,
        result.plan,
      );
      expect(result.plan).toBe(vi.mocked(resolver.resolveArpPlanV2).mock.results[0].value);
      expect(result.events).toBe(
        vi.mocked(projector.projectResolvedArpPlanV1).mock.results[0].value,
      );
      expect(
        vi
          .mocked(profileConfiguration.buildArpWeightedCandidatesV2)
          .mock.calls.map((call) => call[2]),
      ).toEqual([
        "rate",
        "octave-range",
        "direction",
        "mask",
        "gate",
        "rate",
        "octave-range",
        "direction",
        "mask",
        "gate",
      ]);
      expect(
        policyConfiguration.validateSharedArpPolicyConfigurationV2,
      ).toHaveBeenCalledExactlyOnceWith(policyConfiguration.SHARED_ARP_POLICY_CONFIGURATION_V2);
      const order = vi.mocked(policyConfiguration.validateSharedArpPolicyConfigurationV2).mock
        .invocationCallOrder[0];
      expect(
        vi.mocked(profileConfiguration.buildArpWeightedCandidatesV2).mock.invocationCallOrder[4],
      ).toBeLessThan(order);
      expect(order).toBeLessThan(
        vi.mocked(componentSeed.deriveComponentSeedV1).mock.invocationCallOrder[0],
      );
    },
  );

  const fields = [
    ["intent.energy", "INVALID_ENERGY"],
    ["intent.complexity", "INVALID_COMPLEXITY"],
    ["profile.id", "INVALID_ARP_PROFILE"],
    ["profile.version", "UNSUPPORTED_ARP_PROFILE_VERSION"],
    ["policy.version", "UNSUPPORTED_ARP_POLICY_VERSION"],
    ["seedDerivation.version", "UNSUPPORTED_SEED_DERIVATION_VERSION"],
    ["prng.version", "UNSUPPORTED_PRNG_VERSION"],
    ["rootSeed", "INVALID_ROOT_SEED"],
    ["range", "INVALID_ARP_RANGE"],
    ["progression", "INVALID_HARMONIC_CONTEXT"],
  ] as const;
  it.each(fields)("owns missing, undefined and malformed %s", (field, code) => {
    const input = requestV2();
    expectPreflightFailure(withoutField(input, field), code, field);
    for (const invalid of [undefined, null, false, [], {}, "unknown", " MEDIUM "]) {
      const isRecord = invalid !== null && typeof invalid === "object" && !Array.isArray(invalid);
      const expectedField =
        isRecord && field === "range"
          ? "range.minMidiPitch"
          : isRecord && field === "progression"
            ? "progression.profile"
            : field;
      expectPreflightFailure(withField(input, field, invalid), code, expectedField);
    }
  });
  it.each([
    ["intent", "INVALID_ENERGY", "intent.energy"],
    ["profile", "INVALID_ARP_PROFILE", "profile.id"],
    ["policy", "UNSUPPORTED_ARP_POLICY_VERSION", "policy.version"],
    ["seedDerivation", "UNSUPPORTED_SEED_DERIVATION_VERSION", "seedDerivation.version"],
    ["prng", "UNSUPPORTED_PRNG_VERSION", "prng.version"],
  ] as const)("rejects malformed wrapper %s without defaults", (wrapper, code, field) => {
    expectPreflightFailure(withoutField(requestV2(), wrapper), code, field);
    for (const value of [undefined, null, false, 1, "medium", []])
      expectPreflightFailure({ ...requestV2(), [wrapper]: value }, code, field);
  });
  it.each([null, undefined, [], false, "request"])("rejects malformed top-level %s", (input) => {
    expectPreflightFailure(input, "INVALID_ENERGY", "intent.energy");
  });
  it.each([-1, 0.5, NaN, Infinity, -Infinity, Number.MAX_SAFE_INTEGER + 1, 0x1_0000_0000, "0", 0n])(
    "rejects root %s without coercion",
    (rootSeed) => {
      expectPreflightFailure({ ...requestV2(), rootSeed }, "INVALID_ROOT_SEED", "rootSeed");
    },
  );
  it.each([
    [
      ARP_PROFILE_DATA_VERSION_V1,
      ARP_POLICY_VERSION_V1,
      "UNSUPPORTED_ARP_PROFILE_VERSION",
      "profile.version",
    ],
    [
      ARP_PROFILE_DATA_VERSION_V1,
      ARP_POLICY_VERSION_V2,
      "UNSUPPORTED_ARP_PROFILE_VERSION",
      "profile.version",
    ],
    [
      ARP_PROFILE_DATA_VERSION_V2,
      ARP_POLICY_VERSION_V1,
      "UNSUPPORTED_ARP_POLICY_VERSION",
      "policy.version",
    ],
  ] as const)("rejects operation-local pair %s / %s", (profile, policy, code, field) => {
    expectPreflightFailure(
      {
        ...requestV2(),
        profile: { id: HARMONY_PROFILE_IDS.classicSynthwave, version: profile },
        policy: { version: policy },
      },
      code,
      field,
    );
  });
  it.each([
    ["profile.version", ARP_PROFILE_DATA_VERSION_V2, "UNSUPPORTED_ARP_PROFILE_VERSION"],
    ["policy.version", ARP_POLICY_VERSION_V2, "UNSUPPORTED_ARP_POLICY_VERSION"],
    [
      "seedDerivation.version",
      COMPONENT_SEED_DERIVATION_VERSION_V1,
      "UNSUPPORTED_SEED_DERIVATION_VERSION",
    ],
    ["prng.version", PRNG_ALGORITHM_ID, "UNSUPPORTED_PRNG_VERSION"],
  ] as const)("rejects aliases and nonexact %s", (field, version, code) => {
    for (const value of [
      version.toUpperCase(),
      ` ${version}`,
      `${version} `,
      "latest",
      "future",
      2,
    ])
      expectPreflightFailure(withField(requestV2(), field, value), code, field);
  });
  it("retains the sole compatible V2 pair without widening caller support", () => {
    expect(policyConfiguration.SHARED_ARP_POLICY_CONFIGURATION_V2.version).toBe(
      ARP_POLICY_VERSION_V2,
    );
    expect(
      policyConfiguration.SHARED_ARP_POLICY_CONFIGURATION_V2.compatibleProfileDataVersion,
    ).toBe(ARP_PROFILE_DATA_VERSION_V2);
    expect(ARP_ERROR_CODES.incompatibleArpProfilePolicy).toBe("INCOMPATIBLE_ARP_PROFILE_POLICY");
  });
  it.each([
    ["intent.energy", "intent.complexity", "INVALID_ENERGY"],
    ["intent.complexity", "profile.id", "INVALID_COMPLEXITY"],
    ["profile.id", "profile.version", "INVALID_ARP_PROFILE"],
    ["profile.version", "policy.version", "UNSUPPORTED_ARP_PROFILE_VERSION"],
    ["policy.version", "seedDerivation.version", "UNSUPPORTED_ARP_POLICY_VERSION"],
    ["seedDerivation.version", "prng.version", "UNSUPPORTED_SEED_DERIVATION_VERSION"],
    ["prng.version", "rootSeed", "UNSUPPORTED_PRNG_VERSION"],
  ] as const)("orders %s before %s", (first, second, code) => {
    const invalid = withField(
      withField(requestV2(), first, "bad") as ArpPolicyGenerationRequestV2,
      second,
      "bad",
    );
    expectPreflightFailure(invalid, code, first);
  });

  it("orders root, profile config, shared config, range, Harmony and equality", () => {
    vi.mocked(profileConfiguration.validateArpGenreProfileConfigurationV2).mockImplementationOnce(
      () => {
        throw new ArpGenreProfileConfigurationError("INVALID_WEIGHT", "private profile detail");
      },
    );
    vi.mocked(policyConfiguration.validateSharedArpPolicyConfigurationV2).mockImplementationOnce(
      () => {
        throw new SharedArpPolicyConfigurationError(
          "INVALID_GATE_MAPPINGS",
          "private policy detail",
        );
      },
    );
    const invalid = {
      ...requestV2(),
      range: { minMidiPitch: -1, maxMidiPitch: 127 },
      progression: { ...progression(), slots: [] },
    };
    expectPreflightFailure({ ...invalid, rootSeed: -1 }, "INVALID_ROOT_SEED", "rootSeed");
    expect(profileConfiguration.validateArpGenreProfileConfigurationV2).not.toHaveBeenCalled();
    for (const owner of ["profile.version", "policy.version"]) {
      const error = expectPreflightFailure(invalid, "INVALID_ARP_POLICY_CONFIGURATION", owner);
      expect(error).not.toHaveProperty("owner");
      expect(error).not.toHaveProperty("kind");
      expect(error.message).not.toContain("private");
    }
    expectPreflightFailure(invalid, "INVALID_ARP_RANGE", "range.minMidiPitch");
    expectPreflightFailure(
      {
        ...invalid,
        range: requestV2().range,
        profile: { id: HARMONY_PROFILE_IDS.darkwave, version: ARP_PROFILE_DATA_VERSION_V2 },
      },
      "INVALID_HARMONIC_CONTEXT",
      "progression.slots",
    );
    expectPreflightFailure(
      {
        ...requestV2(),
        profile: { id: HARMONY_PROFILE_IDS.darkwave, version: ARP_PROFILE_DATA_VERSION_V2 },
      },
      "INCOMPATIBLE_ARP_PROFILE_CONTEXT",
      "profile.id",
    );
  });

  it.each(["rate", "octave-range", "direction", "mask", "gate"] as const)(
    "translates candidate failure at %s before shared/range work",
    async (failedSlot) => {
      const actual = await vi.importActual<typeof profileConfiguration>(
        "./arpeggiator-profile-configuration",
      );
      vi.mocked(profileConfiguration.buildArpWeightedCandidatesV2).mockImplementation((...args) => {
        if (args[2] === failedSlot)
          throw new ArpGenreProfileConfigurationError(
            "INVALID_FINAL_WEIGHTS",
            "private candidate detail",
          );
        return actual.buildArpWeightedCandidatesV2(...args);
      });
      const error = expectPreflightFailure(
        { ...requestV2(), range: null },
        "INVALID_ARP_POLICY_CONFIGURATION",
        "profile.version",
      );
      expect(error.message).not.toContain("private");
      expect(error).not.toHaveProperty("kind");
      expect(error).not.toHaveProperty("owner");
      expect(policyConfiguration.validateSharedArpPolicyConfigurationV2).not.toHaveBeenCalled();
      const order = ["rate", "octave-range", "direction", "mask", "gate"];
      expect(
        vi
          .mocked(profileConfiguration.buildArpWeightedCandidatesV2)
          .mock.calls.map((call) => call[2]),
      ).toEqual(order.slice(0, order.indexOf(failedSlot) + 1));
    },
  );

  it.each([
    [{ minMidiPitch: 80, maxMidiPitch: 40 }, "range"],
    [{ minMidiPitch: 0, maxMidiPitch: 128 }, "range.maxMidiPitch"],
    [{ minMidiPitch: -1, maxMidiPitch: -1 }, "range.minMidiPitch"],
  ])("retains ordered range fields for %s", (range, field) => {
    expectPreflightFailure(
      { ...requestV2(), range, progression: null },
      "INVALID_ARP_RANGE",
      field as string,
    );
  });

  it.each(["request", "intent", "profile", "policy", "seedDerivation", "prng"] as const)(
    "ignores attempted overrides only at %s",
    (wrapper) => {
      const input = requestV2();
      const extras = {
        weights: [999],
        candidates: ["bad"],
        componentId: "bass",
        componentSeed: -1,
        maskId: "bad",
        plan: { rate: "bad" },
      };
      const extended =
        wrapper === "request"
          ? { ...input, ...extras }
          : { ...input, [wrapper]: { ...input[wrapper], ...extras } };
      expect(generateArpEventsWithPolicyV2(extended)).toEqual(generateArpEventsWithPolicyV2(input));
      vi.clearAllMocks();
      expectPreflightFailure({ ...extended, rootSeed: undefined }, "INVALID_ROOT_SEED", "rootSeed");
      const field =
        wrapper === "request"
          ? "intent.energy"
          : wrapper === "intent"
            ? "intent.energy"
            : wrapper === "profile"
              ? "profile.id"
              : `${wrapper}.version`;
      const code = fields.find((entry) => entry[0] === field)?.[1];
      expect(code).toBeDefined();
      expectPreflightFailure(withoutField(extended, field), code as ArpValueError["code"], field);
    },
  );

  it("preserves seed isolation, sensitivity, object order independence and interior ranges", () => {
    const random = vi.spyOn(Math, "random").mockImplementation(() => {
      throw new Error("ambient randomness");
    });
    try {
      const input = {
        ...requestV2(HARMONY_PROFILE_IDS.darkwave),
        range: createArpRange({ minMidiPitch: 30, maxMidiPitch: 90 }),
      };
      const first = generateArpEventsWithPolicyV2(input);
      deriveComponentSeedV1(0, "bass");
      prng.nextMulberry32(prng.createMulberry32State(0));
      expect(
        generateArpEventsWithPolicyV2(
          Object.fromEntries(Object.entries(input).reverse()) as ArpPolicyGenerationRequestV2,
        ),
      ).toEqual(first);
      expect(generateArpEventsWithPolicyV2({ ...input, rootSeed: 0xffff_ffff }).plan).not.toEqual(
        first.plan,
      );
      expect(first.events.every((event) => event.pitch >= 30 && event.pitch <= 90)).toBe(true);
      expect(random).not.toHaveBeenCalled();
    } finally {
      random.mockRestore();
    }
  });

  it("returns no partial result when the first resolved slot has no legal pitch", () => {
    let result: unknown;
    expectArpError(
      () => {
        result = generateArpEventsWithPolicyV2({
          ...requestV2(),
          range: createArpRange({ minMidiPitch: 127, maxMidiPitch: 127 }),
        });
      },
      "NO_LEGAL_ARP_PITCH",
      "progression.slots[0].voicing.midiPitches",
    );
    expect(result).toBeUndefined();
    expect(resolver.resolveArpPlanV2).toHaveBeenCalledTimes(1);
    expect(projector.projectResolvedArpPlanV1).toHaveBeenCalledTimes(1);
  });

  it.each(["profile", "shared", "seed", "resolver", "projector"])(
    "does not translate unrelated %s failures",
    (phase) => {
      const internal = new Error("private invariant");
      const throwInternal = () => {
        throw internal;
      };
      if (phase === "profile")
        vi.mocked(
          profileConfiguration.validateArpGenreProfileConfigurationV2,
        ).mockImplementationOnce(throwInternal);
      if (phase === "shared")
        vi.mocked(
          policyConfiguration.validateSharedArpPolicyConfigurationV2,
        ).mockImplementationOnce(throwInternal);
      if (phase === "seed")
        vi.mocked(componentSeed.deriveComponentSeedV1).mockImplementationOnce(throwInternal);
      if (phase === "resolver")
        vi.mocked(resolver.resolveArpPlanV2).mockImplementationOnce(throwInternal);
      if (phase === "projector")
        vi.mocked(projector.projectResolvedArpPlanV1).mockImplementationOnce(throwInternal);
      expect(() => generateArpEventsWithPolicyV2(requestV2())).toThrow(internal);
    },
  );
  it("keeps impossible primitive and selected-value failures internal", () => {
    vi.mocked(componentSeed.deriveComponentSeedV1).mockImplementationOnce(() => {
      throw new ComponentSeedValueError("INVALID_COMPONENT_ID", "componentId", "impossible");
    });
    try {
      generateArpEventsWithPolicyV2(requestV2());
      expect.unreachable();
    } catch (error) {
      expect(error).toBeInstanceOf(Error);
      expect(error).not.toBeInstanceOf(ArpValueError);
      expect(error).not.toBeInstanceOf(ComponentSeedValueError);
      expect(error).not.toHaveProperty("code");
    }
    vi.mocked(resolver.resolveArpPlanV2).mockReturnValueOnce({
      ...GOLDEN_RESULTS[HARMONY_PROFILE_IDS.classicSynthwave].plan,
      octaveRange: 99,
    } as never);
    expect(() => generateArpEventsWithPolicyV2(requestV2())).toThrow(
      "integration invariant failed",
    );
    expect(projector.projectResolvedArpPlanV1).not.toHaveBeenCalled();
  });

  it("preserves V1-only acceptance and exposes only seven accepted V2 exports", () => {
    expectArpError(
      () => generateArpEventsWithPolicyV1(requestV2() as never),
      "UNSUPPORTED_ARP_PROFILE_VERSION",
      "profile.version",
    );
    expectArpError(
      () =>
        generateArpEventsWithPolicyV1({
          ...request(),
          policy: { version: ARP_POLICY_VERSION_V2 },
        } as never),
      "UNSUPPORTED_ARP_POLICY_VERSION",
      "policy.version",
    );
    expect(publicDomain.generateArpEventsWithPolicyV2).toBe(generateArpEventsWithPolicyV2);
    expect(publicDomain.ARP_PROFILE_DATA_VERSION_V2).toBe(ARP_PROFILE_DATA_VERSION_V2);
    expect(publicDomain.ARP_POLICY_VERSION_V2).toBe(ARP_POLICY_VERSION_V2);
    expectTypeOf<publicDomain.ArpPolicyGenerationRequestV2>().toEqualTypeOf<ArpPolicyGenerationRequestV2>();
    expectTypeOf<publicDomain.ArpPolicyGenerationResultV2>().toEqualTypeOf<ArpPolicyGenerationResultV2>();
    expectTypeOf<publicDomain.ArpPolicyVersionV2>().toEqualTypeOf<typeof ARP_POLICY_VERSION_V2>();
    expectTypeOf<publicDomain.ArpProfileDataVersionV2>().toEqualTypeOf<
      typeof ARP_PROFILE_DATA_VERSION_V2
    >();
    expectTypeOf(generateArpEventsWithPolicyV2)
      .parameter(0)
      .toEqualTypeOf<ArpPolicyGenerationRequestV2>();
    expectTypeOf(
      generateArpEventsWithPolicyV2,
    ).returns.toEqualTypeOf<ArpPolicyGenerationResultV2>();
    for (const internal of [
      "resolveArpPlanV2",
      "buildArpWeightedCandidatesV2",
      "validateArpGenreProfileConfigurationV2",
      "validateSharedArpPolicyConfigurationV2",
      "ARP_GENRE_PROFILE_CONFIGURATION_V2",
      "SHARED_ARP_POLICY_CONFIGURATION_V2",
      "ArpGenreProfileConfigurationError",
      "SharedArpPolicyConfigurationError",
      "projectResolvedArpPlanV1",
      "selectWeightedCandidateV1",
    ])
      expect(publicDomain).not.toHaveProperty(internal);
  });
});
