import { describe, expect, it } from "vitest";
import {
  createMulberry32State,
  nextMulberry32,
  PRNG_ALGORITHM_ID,
  type Mulberry32State,
} from "./prng";

function sequence(seed: number, length: number): number[] {
  let state = createMulberry32State(seed);
  const values: number[] = [];
  for (let index = 0; index < length; index += 1) {
    const step = nextMulberry32(state);
    values.push(step.value);
    state = step.state;
  }
  return values;
}

describe("Mulberry32 PRNG", () => {
  it("exposes the stable algorithm identifier", () => {
    expect(PRNG_ALGORITHM_ID).toBe("nightdrive.prng.mulberry32.v1");
  });

  it("accepts the uint32 seed boundaries", () => {
    expect(createMulberry32State(0)).toBe(0);
    expect(createMulberry32State(1)).toBe(1);
    expect(createMulberry32State(2_147_483_647)).toBe(2_147_483_647);
    expect(createMulberry32State(4_294_967_295)).toBe(4_294_967_295);
  });

  it("rejects malformed and coercible seeds", () => {
    for (const seed of [
      -1,
      4_294_967_296,
      1.5,
      Number.NaN,
      Infinity,
      -Infinity,
      Number.MAX_SAFE_INTEGER + 1,
      "1",
      true,
      {},
      [],
      null,
      undefined,
    ]) {
      expect(() => createMulberry32State(seed as never)).toThrow();
    }
  });

  it.each([
    [0, [1_144_304_738, 1_416_247, 958_946_056, 627_933_444, 2_007_157_716]],
    [1, [2_693_262_067, 11_749_833, 2_265_367_787, 4_213_581_821, 4_159_151_403]],
    [4_294_967_295, [3_850_105_811, 813_802_916, 3_073_704_848, 4_054_706_436, 3_630_262_831]],
  ] as const)("matches known-answer sequence for seed %i", (seed, expected) => {
    expect(sequence(seed, expected.length)).toEqual(expected);
  });

  it("is deterministic across independent instances and repeated runs", () => {
    expect(sequence(123_456_789, 128)).toEqual(sequence(123_456_789, 128));
    expect(sequence(123_456_789, 128)).toEqual(sequence(123_456_789, 128));
  });

  it("advances state once per step and returns uint32 values", () => {
    let state = createMulberry32State(0);
    const seen = new Set<number>();
    for (let index = 0; index < 256; index += 1) {
      const step = nextMulberry32(state);
      expect(step.state).not.toBe(state);
      expect(Number.isSafeInteger(step.value)).toBe(true);
      expect(step.value).toBeGreaterThanOrEqual(0);
      expect(step.value).toBeLessThanOrEqual(4_294_967_295);
      seen.add(step.value);
      state = step.state;
    }
    expect(seen.size).toBeGreaterThan(1);
  });

  it("revalidates forged state values", () => {
    expect(() => nextMulberry32(4_294_967_296 as Mulberry32State)).toThrow();
    expect(() => nextMulberry32("0" as never)).toThrow();
  });
});
