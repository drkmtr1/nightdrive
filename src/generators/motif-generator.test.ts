import { describe, expect, it, vi } from "vitest";
import { createKey } from "../music-domain/key";
import {
  HARMONY_PROFILE_IDS,
  getHarmonyTemplatesForProfile,
  realizeHarmonyProgression,
  type HarmonyProfileId,
} from "../music-domain/harmony";
import {
  MOTIF_GENERATOR_VERSION_V1,
  serializeMotifGenerationResultV1,
} from "../music-domain/motif-result";
import { MOTIF_POLICY_VERSION_V1 } from "../music-domain/motif-policy";
import * as profileConfiguration from "../music-domain/motif-profile-configuration";
import {
  MOTIF_PROFILE_DATA_VERSION_V1,
  MotifGenreProfileConfigurationError,
} from "../music-domain/motif-profile-configuration";
import * as projector from "./motif-pitch-projector";
import { MotifProjectionNoValidPathError } from "./motif-pitch-projector";
import { createPitchClass } from "../music-domain/pitch";
import {
  MOTIF_GENERATION_REQUEST_SCHEMA_V1,
  MotifValueError,
  generateMotifV1,
} from "./motif-generator";

function deepFreeze<T>(value: T): T {
  if (typeof value !== "object" || value === null || Object.isFrozen(value)) return value;
  for (const key of Reflect.ownKeys(value)) {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (descriptor !== undefined && "value" in descriptor) deepFreeze(descriptor.value);
  }
  return Object.freeze(value);
}

function request(
  profileId: HarmonyProfileId = HARMONY_PROFILE_IDS.darkSynthwave,
  rootSeed = 0x12345678,
) {
  const template = getHarmonyTemplatesForProfile(profileId)[0];
  return deepFreeze({
    schema: MOTIF_GENERATION_REQUEST_SCHEMA_V1,
    generatorVersion: MOTIF_GENERATOR_VERSION_V1,
    profile: { id: profileId, version: MOTIF_PROFILE_DATA_VERSION_V1 },
    policyVersion: MOTIF_POLICY_VERSION_V1,
    harmony: realizeHarmonyProgression(
      profileId,
      template,
      createKey(createPitchClass(0), template.scale),
    ),
    intent: { energy: "medium" as const, complexity: "medium" as const },
    rootSeed,
  });
}

function replace(source: ReturnType<typeof request>, patch: Record<string, unknown>): unknown {
  return deepFreeze({ ...source, ...patch });
}

function expectError(value: unknown, code: MotifValueError["code"], field: string): void {
  expect(() => generateMotifV1(value)).toThrow(MotifValueError);
  try {
    generateMotifV1(value);
  } catch (error) {
    expect(error).toMatchObject({ code, field });
  }
}

describe("generateMotifV1", () => {
  it("composes the accepted deterministic foundations into one canonical public result", () => {
    for (const profileId of Object.values(HARMONY_PROFILE_IDS)) {
      const input = request(profileId);
      const before = JSON.stringify(input);
      const first = generateMotifV1(input);
      const second = generateMotifV1(input);

      expect(serializeMotifGenerationResultV1(first)).toBe(
        serializeMotifGenerationResultV1(second),
      );
      expect(first.provenance.profile.id).toBe(profileId);
      expect(first.provenance.rootSeed).toBe(input.rootSeed);
      expect(first.events.length).toBeGreaterThan(0);
      expect(Object.isFrozen(first)).toBe(true);
      expect(Object.isFrozen(first.events)).toBe(true);
      expect(Object.isFrozen(first.provenance.harmony)).toBe(true);
      expect(JSON.stringify(input)).toBe(before);
    }
  });

  it("rejects malformed, mutable, reordered, extra, and accessor-bearing requests first", () => {
    const input = request();
    expectError(null, "INVALID_MOTIF_REQUEST", "request");
    expectError({ ...input }, "INVALID_MOTIF_REQUEST", "request");
    expectError(deepFreeze({ ...input, extra: true }), "INVALID_MOTIF_REQUEST", "request");
    expectError(
      deepFreeze({
        generatorVersion: input.generatorVersion,
        schema: input.schema,
        profile: input.profile,
        policyVersion: input.policyVersion,
        harmony: input.harmony,
        intent: input.intent,
        rootSeed: input.rootSeed,
      }),
      "INVALID_MOTIF_REQUEST",
      "request",
    );
    let reads = 0;
    const accessor = {
      schema: input.schema,
      generatorVersion: input.generatorVersion,
      profile: input.profile,
      policyVersion: input.policyVersion,
      harmony: input.harmony,
      intent: input.intent,
      get rootSeed() {
        reads += 1;
        return input.rootSeed;
      },
    };
    Object.freeze(accessor);
    expectError(accessor, "INVALID_MOTIF_REQUEST", "request");
    expect(reads).toBe(0);
  });

  it("uses the accepted public error precedence for identities and profile context", () => {
    const input = request();
    expectError(
      replace(input, {
        schema: "wrong",
        generatorVersion: "wrong",
        profile: { id: "wrong", version: "wrong" },
        policyVersion: "wrong",
        rootSeed: -1,
      }),
      "UNSUPPORTED_MOTIF_SCHEMA",
      "schema",
    );
    expectError(
      replace(input, { generatorVersion: "wrong" }),
      "UNSUPPORTED_MOTIF_GENERATOR_VERSION",
      "generatorVersion",
    );
    expectError(
      replace(input, { profile: { ...input.profile, version: "wrong" } }),
      "UNSUPPORTED_MOTIF_PROFILE_VERSION",
      "profile.version",
    );
    expectError(
      replace(input, { policyVersion: "wrong" }),
      "UNSUPPORTED_MOTIF_POLICY_VERSION",
      "policyVersion",
    );
    expectError(
      replace(input, { profile: { ...input.profile, id: "wrong" } }),
      "INVALID_MOTIF_PROFILE",
      "profile.id",
    );
    expectError(
      replace(input, {
        profile: { ...input.profile, id: HARMONY_PROFILE_IDS.classicSynthwave },
      }),
      "INCOMPATIBLE_MOTIF_PROFILE_CONTEXT",
      "profile.id",
    );
  });

  it("rejects malformed Harmony, intent, and root seeds with no partial result", () => {
    const input = request();
    const malformedHarmony = structuredClone(input.harmony) as { templateId: string };
    malformedHarmony.templateId = "unknown-template";
    expectError(
      replace(input, { harmony: deepFreeze(malformedHarmony) }),
      "INVALID_MOTIF_HARMONY",
      "harmony",
    );
    expectError(
      replace(input, { intent: { energy: "wrong", complexity: input.intent.complexity } }),
      "INVALID_MOTIF_INTENT",
      "intent",
    );
    for (const rootSeed of [-0, -1, 0x1_0000_0000, 1.5, Number.NaN, Number.POSITIVE_INFINITY]) {
      expectError(replace(input, { rootSeed }), "INVALID_MOTIF_ROOT_SEED", "rootSeed");
    }
  });

  it("translates invalid policy configuration and no-path failures at their owned boundaries", () => {
    const input = request();
    const configuration = vi
      .spyOn(profileConfiguration, "validateMotifGenreProfileConfigurationV1")
      .mockImplementationOnce(() => {
        throw new MotifGenreProfileConfigurationError(
          "INVALID_PROFILE_DATA_VERSION",
          "invalid test configuration",
        );
      });
    expectError(input, "INVALID_MOTIF_POLICY_CONFIGURATION", "profile.version");
    configuration.mockRestore();

    const projection = vi
      .spyOn(projector, "projectResolvedMotifPlanV1")
      .mockImplementationOnce(() => {
        throw new MotifProjectionNoValidPathError();
      });
    expectError(input, "NO_VALID_MOTIF", "harmony");
    projection.mockRestore();
  });

  it("does not consume ambient randomness", () => {
    const random = vi.spyOn(Math, "random").mockImplementation(() => {
      throw new Error("ambient randomness must not be used");
    });
    try {
      expect(generateMotifV1(request()).events.length).toBeGreaterThan(0);
    } finally {
      random.mockRestore();
    }
  });
});
