// @vitest-environment node

import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import {
  COMPLEXITY_V1_VALUES,
  type ComplexityV1,
  CompositionIntentValueError,
  ENERGY_V1_VALUES,
  type EnergyV1,
  normalizeCompositionIntentV1,
  validateNormalizedCompositionIntentV1,
} from "./composition-intent";
import * as publicDomain from "./index";
import type {
  ComplexityV1 as PublicComplexityV1,
  CompositionIntentErrorCode as PublicCompositionIntentErrorCode,
  CompositionIntentErrorField as PublicCompositionIntentErrorField,
  EnergyV1 as PublicEnergyV1,
  NormalizedCompositionIntentV1 as PublicNormalizedCompositionIntentV1,
} from "./index";
import * as prng from "./prng";

const EXPECTED_VALUES = ["very-low", "low", "medium", "high", "very-high"] as const;

const INVALID_VALUES = [
  "Medium",
  " medium",
  "medium ",
  "mid",
  "unknown",
  1,
  1.5,
  Number.NaN,
  Infinity,
  -Infinity,
  true,
  null,
  [],
  {},
] as const;

function expectIntentError(
  operation: () => unknown,
  code: "INVALID_ENERGY" | "INVALID_COMPLEXITY",
  field: "energy" | "complexity",
): CompositionIntentValueError {
  let error: unknown;
  try {
    operation();
  } catch (caught) {
    error = caught;
  }

  expect(error).toBeInstanceOf(CompositionIntentValueError);
  expect(error).toBeInstanceOf(RangeError);
  expect(error).toMatchObject({ name: "CompositionIntentValueError", code, field });
  return error as CompositionIntentValueError;
}

describe("Stage 7C7a4 canonical Energy and Complexity", () => {
  it("freezes two distinct tuples in exact canonical ordinal order", () => {
    expect(ENERGY_V1_VALUES).toEqual(EXPECTED_VALUES);
    expect(COMPLEXITY_V1_VALUES).toEqual(EXPECTED_VALUES);
    expect(Object.isFrozen(ENERGY_V1_VALUES)).toBe(true);
    expect(Object.isFrozen(COMPLEXITY_V1_VALUES)).toBe(true);
    expect(ENERGY_V1_VALUES).not.toBe(COMPLEXITY_V1_VALUES);
  });

  it.each(EXPECTED_VALUES)("accepts exact EnergyV1 value %s", (energy) => {
    expect(validateNormalizedCompositionIntentV1({ energy, complexity: "medium" })).toEqual({
      energy,
      complexity: "medium",
    });
  });

  it.each(EXPECTED_VALUES)("accepts exact ComplexityV1 value %s", (complexity) => {
    expect(validateNormalizedCompositionIntentV1({ energy: "medium", complexity })).toEqual({
      energy: "medium",
      complexity,
    });
  });

  it.each(
    EXPECTED_VALUES.flatMap((energy) =>
      EXPECTED_VALUES.map((complexity) => [energy, complexity] as const),
    ),
  )("accepts and preserves Energy %s with Complexity %s", (energy, complexity) => {
    expect(validateNormalizedCompositionIntentV1({ energy, complexity })).toEqual({
      energy,
      complexity,
    });
  });
});

describe("Stage 7C7a4 creation defaulting", () => {
  it.each([
    [{}, { energy: "medium", complexity: "medium" }],
    [{ energy: "high" }, { energy: "high", complexity: "medium" }],
    [{ complexity: "low" }, { energy: "medium", complexity: "low" }],
    [{ energy: undefined }, { energy: "medium", complexity: "medium" }],
    [{ complexity: undefined }, { energy: "medium", complexity: "medium" }],
    [
      { energy: undefined, complexity: undefined },
      { energy: "medium", complexity: "medium" },
    ],
  ] as const)("normalizes omission fixture %#", (input, expected) => {
    expect(normalizeCompositionIntentV1(input)).toEqual(expected);
  });

  it("rejects malformed present energy without defaulting", () => {
    expectIntentError(
      () => normalizeCompositionIntentV1({ energy: "HIGH", complexity: "low" }),
      "INVALID_ENERGY",
      "energy",
    );
  });

  it("rejects malformed present complexity without defaulting", () => {
    expectIntentError(
      () => normalizeCompositionIntentV1({ energy: "high", complexity: "LOW" }),
      "INVALID_COMPLEXITY",
      "complexity",
    );
  });

  it("validates malformed energy before malformed complexity", () => {
    expectIntentError(
      () => normalizeCompositionIntentV1({ energy: "HIGH", complexity: "LOW" }),
      "INVALID_ENERGY",
      "energy",
    );
  });
});

describe("Stage 7C7a4 canonical validation", () => {
  it("requires explicit energy", () => {
    expectIntentError(
      () => validateNormalizedCompositionIntentV1({ complexity: "medium" } as never),
      "INVALID_ENERGY",
      "energy",
    );
  });

  it("requires explicit complexity", () => {
    expectIntentError(
      () => validateNormalizedCompositionIntentV1({ energy: "medium" } as never),
      "INVALID_COMPLEXITY",
      "complexity",
    );
  });

  it.each([
    [{ energy: undefined, complexity: "medium" }, "INVALID_ENERGY", "energy"],
    [{ energy: "medium", complexity: undefined }, "INVALID_COMPLEXITY", "complexity"],
  ] as const)("rejects explicit undefined in canonical fixture %#", (input, code, field) => {
    expectIntentError(() => validateNormalizedCompositionIntentV1(input), code, field);
  });

  it.each(INVALID_VALUES)("rejects invalid Energy value %# without coercion", (energy) => {
    expectIntentError(
      () => validateNormalizedCompositionIntentV1({ energy, complexity: "medium" }),
      "INVALID_ENERGY",
      "energy",
    );
  });

  it.each(INVALID_VALUES)("rejects invalid Complexity value %# without coercion", (complexity) => {
    expectIntentError(
      () => validateNormalizedCompositionIntentV1({ energy: "medium", complexity }),
      "INVALID_COMPLEXITY",
      "complexity",
    );
  });

  it("validates malformed energy before malformed complexity", () => {
    expectIntentError(
      () => validateNormalizedCompositionIntentV1({ energy: "HIGH", complexity: "LOW" }),
      "INVALID_ENERGY",
      "energy",
    );
  });

  it("does not capture the rejected value on its structured error", () => {
    const error = expectIntentError(
      () => validateNormalizedCompositionIntentV1({ energy: "secret", complexity: "medium" }),
      "INVALID_ENERGY",
      "energy",
    );

    expect(error).not.toHaveProperty("value");
    expect(error).not.toHaveProperty("invalidValue");
    expect(error).not.toHaveProperty("input");
  });
});

describe("Stage 7C7a4 immutability and isolation", () => {
  it.each([
    ["creation", () => normalizeCompositionIntentV1({ energy: "high", complexity: "low" })],
    [
      "canonical",
      () => validateNormalizedCompositionIntentV1({ energy: "high", complexity: "low" }),
    ],
  ] as const)("returns a newly frozen %s result", (_boundary, operation) => {
    const first = operation();
    const second = operation();

    expect(first).toEqual({ energy: "high", complexity: "low" });
    expect(second).toEqual(first);
    expect(first).not.toBe(second);
    expect(Object.isFrozen(first)).toBe(true);
    expect(Object.isFrozen(second)).toBe(true);
  });

  it("does not mutate or freeze caller input", () => {
    const creationInput: { energy?: EnergyV1; complexity?: ComplexityV1 } = { energy: "high" };
    const canonicalInput = { energy: "low", complexity: "very-high" };
    const creationBefore = { ...creationInput };
    const canonicalBefore = { ...canonicalInput };

    normalizeCompositionIntentV1(creationInput);
    validateNormalizedCompositionIntentV1(canonicalInput);

    expect(creationInput).toEqual(creationBefore);
    expect(canonicalInput).toEqual(canonicalBefore);
    expect(Object.isFrozen(creationInput)).toBe(false);
    expect(Object.isFrozen(canonicalInput)).toBe(false);
  });

  it("does not consult ambient randomness or invoke the Nightdrive PRNG", () => {
    const random = vi.spyOn(Math, "random").mockImplementation(() => {
      throw new Error("ambient randomness is prohibited");
    });
    const next = vi.spyOn(prng, "nextMulberry32");
    try {
      expect(normalizeCompositionIntentV1({ energy: "low" })).toEqual({
        energy: "low",
        complexity: "medium",
      });
      expect(
        validateNormalizedCompositionIntentV1({ energy: "high", complexity: "very-high" }),
      ).toEqual({ energy: "high", complexity: "very-high" });
      expect(random).not.toHaveBeenCalled();
      expect(next).not.toHaveBeenCalled();
    } finally {
      next.mockRestore();
      random.mockRestore();
    }
  });

  it("exposes only the authorized shared runtime surface through the public barrel", () => {
    const publicTypeFixture: Readonly<{
      energy: PublicEnergyV1;
      complexity: PublicComplexityV1;
      code: PublicCompositionIntentErrorCode;
      field: PublicCompositionIntentErrorField;
      normalized: PublicNormalizedCompositionIntentV1;
    }> = {
      energy: "high",
      complexity: "low",
      code: "INVALID_ENERGY",
      field: "energy",
      normalized: { energy: "high", complexity: "low" },
    };

    expect(publicDomain).toMatchObject({
      ENERGY_V1_VALUES,
      COMPLEXITY_V1_VALUES,
      CompositionIntentValueError,
      validateNormalizedCompositionIntentV1,
    });
    expect(publicTypeFixture.normalized).toEqual({ energy: "high", complexity: "low" });
    expect(publicDomain).not.toHaveProperty("normalizeCompositionIntentV1");

    const publicIndexSource = readFileSync(new URL("./index.ts", import.meta.url), "utf8");
    expect(publicIndexSource).not.toContain("CompositionIntentCreationInputV1");
    expect(publicIndexSource).not.toContain("normalizeCompositionIntentV1");
  });
});
