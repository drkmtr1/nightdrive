import { describe, expect, it, vi } from "vitest";

import {
  createStage8MotifReferencePrng,
  deriveStage8MotifReferenceSeed,
  selectStage8MotifReferenceWeightedCandidate,
} from "./stage8-motif-reference-primitives";

describe("Stage 8 Motif independent reference primitives", () => {
  it("derives the four normative Motif component-seed vectors", () => {
    expect(deriveStage8MotifReferenceSeed(0)).toBe(3_256_624_460);
    expect(deriveStage8MotifReferenceSeed(1)).toBe(3_484_630_024);
    expect(deriveStage8MotifReferenceSeed(4_294_967_295)).toBe(1_158_484_109);
    expect(deriveStage8MotifReferenceSeed(305_419_896)).toBe(2_373_523_338);
  });

  it("rejects malformed reference root seeds without coercion", () => {
    for (const rootSeed of [undefined, null, -1, 0.5, Number.NaN, Infinity, 4_294_967_296, "0"]) {
      expect(() => deriveStage8MotifReferenceSeed(rootSeed)).toThrow(/rootSeed/);
    }
  });

  it("matches independently derived Mulberry32 sequences and keeps streams isolated", () => {
    const expectedBySeed = new Map<number, readonly number[]>([
      [0, [1_144_304_738, 1_416_247, 958_946_056, 627_933_444, 2_007_157_716]],
      [1, [2_693_262_067, 11_749_833, 2_265_367_787, 4_213_581_821, 4_159_151_403]],
      [4_294_967_295, [3_850_105_811, 813_802_916, 3_073_704_848, 4_054_706_436, 3_630_262_831]],
    ]);

    const random = vi.spyOn(Math, "random");
    for (const [seed, expected] of expectedBySeed) {
      const first = createStage8MotifReferencePrng(seed);
      const second = createStage8MotifReferencePrng(seed);
      expect(Object.isFrozen(first)).toBe(true);
      expect(Array.from({ length: expected.length }, () => first.nextUint32())).toEqual(expected);
      expect(Array.from({ length: expected.length }, () => second.nextUint32())).toEqual(expected);
    }
    expect(random).not.toHaveBeenCalled();
    random.mockRestore();
  });

  it("rejects malformed PRNG seeds without coercion", () => {
    for (const seed of [undefined, null, -1, 0.5, Number.NaN, Infinity, 4_294_967_296, "0"]) {
      expect(() => createStage8MotifReferencePrng(seed)).toThrow(/seed/);
    }
  });

  it("selects the normative declared-order weighted-choice vectors", () => {
    expect(
      selectStage8MotifReferenceWeightedCandidate(
        [
          { value: "A", weight: 1 },
          { value: "B", weight: 1 },
          { value: "C", weight: 1 },
        ],
        0,
      ),
    ).toBe("A");
    expect(
      selectStage8MotifReferenceWeightedCandidate(
        [
          { value: "A", weight: 1 },
          { value: "B", weight: 1 },
          { value: "C", weight: 1 },
        ],
        2,
      ),
    ).toBe("C");
    expect(
      selectStage8MotifReferenceWeightedCandidate(
        [
          { value: "A", weight: 2 },
          { value: "B", weight: 3 },
          { value: "C", weight: 1 },
        ],
        2,
      ),
    ).toBe("B");
    expect(
      selectStage8MotifReferenceWeightedCandidate(
        [
          { value: "A", weight: 2 },
          { value: "B", weight: 3 },
          { value: "C", weight: 1 },
        ],
        5,
      ),
    ).toBe("C");
    expect(
      selectStage8MotifReferenceWeightedCandidate(
        [
          { value: "A", weight: 2 },
          { value: "B", weight: 3 },
          { value: "C", weight: 1 },
        ],
        0xffff_ffff,
      ),
    ).toBe("B");
    expect(
      selectStage8MotifReferenceWeightedCandidate(
        [
          { value: "A", weight: 0 },
          { value: "B", weight: 2 },
          { value: "C", weight: 0 },
        ],
        0,
      ),
    ).toBe("B");
    expect(
      selectStage8MotifReferenceWeightedCandidate([{ value: "A", weight: 7 }], 0xffff_ffff),
    ).toBe("A");
  });

  it("rejects malformed weighted choices and preserves frozen candidate input", () => {
    const candidates = Object.freeze([
      Object.freeze({ value: "A", weight: 2 }),
      Object.freeze({ value: "B", weight: 3 }),
    ]);
    expect(selectStage8MotifReferenceWeightedCandidate(candidates, 2)).toBe("B");
    expect(candidates).toEqual([
      { value: "A", weight: 2 },
      { value: "B", weight: 3 },
    ]);

    for (const output of [undefined, null, -1, 0.5, Number.NaN, Infinity, 4_294_967_296, "0"]) {
      expect(() => selectStage8MotifReferenceWeightedCandidate(candidates, output)).toThrow(
        /output/,
      );
    }
    expect(() => selectStage8MotifReferenceWeightedCandidate([], 0)).toThrow(/non-empty/);
    expect(() =>
      selectStage8MotifReferenceWeightedCandidate([{ value: "A", weight: 0 }], 0),
    ).toThrow(/positive/);
    expect(() =>
      selectStage8MotifReferenceWeightedCandidate([{ value: "A", weight: 65_536 }], 0),
    ).toThrow(/65535/);
    expect(() =>
      selectStage8MotifReferenceWeightedCandidate(
        [
          { value: "A", weight: 65_535 },
          { value: "B", weight: 1 },
        ],
        0,
      ),
    ).toThrow(/total weight/);
  });
});
