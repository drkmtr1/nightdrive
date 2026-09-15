import { describe, expect, it, vi } from "vitest";
import {
  type ComponentSeedComponentIdV1,
  type ComponentSeedErrorCode,
  type ComponentSeedErrorField,
  ComponentSeedValueError,
  deriveComponentSeedV1,
} from "./component-seed";

const GOLDEN_VECTORS = [
  [0, "harmony", 622_364_116],
  [0, "bass", 3_844_702_028],
  [0, "arpeggiator", 2_011_937_067],
  [0, "motif", 3_256_624_460],
  [1, "harmony", 2_090_515_199],
  [1, "bass", 4_258_129_003],
  [1, "arpeggiator", 2_926_668_988],
  [1, "motif", 3_484_630_024],
  [0xffff_ffff, "harmony", 1_380_703_219],
  [0xffff_ffff, "bass", 1_905_880_034],
  [0xffff_ffff, "arpeggiator", 561_390_553],
  [0xffff_ffff, "motif", 1_158_484_109],
  [0x1234_5678, "harmony", 4_067_537_834],
  [0x1234_5678, "bass", 1_025_326_744],
  [0x1234_5678, "arpeggiator", 3_753_044_731],
  [0x1234_5678, "motif", 2_373_523_338],
] as const satisfies readonly (readonly [number, ComponentSeedComponentIdV1, number])[];

function expectComponentSeedError(
  operation: () => unknown,
  code: ComponentSeedErrorCode,
  field: ComponentSeedErrorField,
): void {
  let error: unknown;
  try {
    operation();
  } catch (caught) {
    error = caught;
  }

  expect(error).toBeInstanceOf(ComponentSeedValueError);
  expect(error).toBeInstanceOf(RangeError);
  expect(error).toMatchObject({ name: "ComponentSeedValueError", code, field });
}

describe("Stage 7C7a1 component-seed derivation", () => {
  it.each(GOLDEN_VECTORS)(
    "matches the normative vector for root %i and component %s",
    (rootSeed, componentId, expected) => {
      expect(deriveComponentSeedV1(rootSeed, componentId)).toBe(expected);
    },
  );

  it("accepts the canonical uint32 root-seed boundaries", () => {
    for (const rootSeed of [0, 1, 0xffff_ffff]) {
      const result = deriveComponentSeedV1(rootSeed, "arpeggiator");
      expect(Number.isSafeInteger(result)).toBe(true);
      expect(result).toBeGreaterThanOrEqual(0);
      expect(result).toBeLessThanOrEqual(0xffff_ffff);
    }
  });

  it.each([
    -1,
    0x1_0000_0000,
    1.5,
    Number.NaN,
    Infinity,
    -Infinity,
    Number.MAX_SAFE_INTEGER + 1,
    "1",
    1n,
    true,
    null,
    undefined,
    [],
    {},
  ])("rejects invalid root seed %#", (rootSeed) => {
    expectComponentSeedError(
      () => deriveComponentSeedV1(rootSeed as never, "arpeggiator"),
      "INVALID_ROOT_SEED",
      "rootSeed",
    );
  });

  it.each([
    "unknown",
    "",
    "Harmony",
    " harmony",
    "harmony ",
    "arp",
    1,
    true,
    null,
    undefined,
    [],
    {},
  ])("rejects invalid component ID %#", (componentId) => {
    expectComponentSeedError(
      () => deriveComponentSeedV1(0, componentId as never),
      "INVALID_COMPONENT_ID",
      "componentId",
    );
  });

  it("gives root-seed validation observable precedence", () => {
    expectComponentSeedError(
      () => deriveComponentSeedV1(-1, "unknown" as never),
      "INVALID_ROOT_SEED",
      "rootSeed",
    );
  });

  it.each(GOLDEN_VECTORS)(
    "is deterministic for root %i and component %s",
    (rootSeed, componentId) => {
      expect(deriveComponentSeedV1(rootSeed, componentId)).toBe(
        deriveComponentSeedV1(rootSeed, componentId),
      );
    },
  );

  it("reproduces the four distinct accepted component fixtures", () => {
    const results = [
      deriveComponentSeedV1(0x1234_5678, "harmony"),
      deriveComponentSeedV1(0x1234_5678, "bass"),
      deriveComponentSeedV1(0x1234_5678, "arpeggiator"),
      deriveComponentSeedV1(0x1234_5678, "motif"),
    ];

    expect(results).toEqual([4_067_537_834, 1_025_326_744, 3_753_044_731, 2_373_523_338]);
    expect(new Set(results)).toHaveLength(4);
  });

  it("does not depend on ambient Math.random", () => {
    const random = vi.spyOn(Math, "random").mockImplementation(() => {
      throw new Error("ambient randomness is prohibited");
    });
    try {
      for (const [rootSeed, componentId, expected] of GOLDEN_VECTORS) {
        expect(deriveComponentSeedV1(rootSeed, componentId)).toBe(expected);
      }
      expect(random).not.toHaveBeenCalled();
    } finally {
      random.mockRestore();
    }
  });
});
