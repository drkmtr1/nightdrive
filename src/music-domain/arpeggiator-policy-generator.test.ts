// @vitest-environment node

import { readFileSync } from "node:fs";
import { beforeEach, describe, expect, it, vi } from "vitest";
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
  ARP_PROFILE_DATA_VERSION_V1,
  SharedArpPolicyConfigurationError,
} from "./arpeggiator-policy-configuration";
import {
  ArpGenreProfileConfigurationError,
  buildArpWeightedCandidatesV1,
  validateArpGenreProfileConfigurationV1,
} from "./arpeggiator-profile-configuration";
import {
  type ArpPolicyGenerationRequestV1,
  COMPONENT_SEED_DERIVATION_VERSION_V1,
  generateArpEventsWithPolicyV1,
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

function withField(base: ArpPolicyGenerationRequestV1, field: string, value: unknown): unknown {
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

function withoutField(base: ArpPolicyGenerationRequestV1, field: string): unknown {
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
