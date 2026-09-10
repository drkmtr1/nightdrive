import { describe, expect, it } from "vitest";
import {
  chordInversionsEqual,
  CHORD_INVERSION_ERROR_CODES,
  createChordInversion,
  serializeChordInversion,
  type ChordInversion,
} from "./chord-inversion";

const valid = [0, 1, 2].map(createChordInversion);

describe("ChordInversion", () => {
  it("constructs exactly the three canonical indices", () => {
    expect(valid).toEqual([0, 1, 2]);
  });

  it("rejects invalid numeric and runtime values", () => {
    for (const value of [
      -1,
      3,
      1.5,
      Number.NaN,
      Infinity,
      -Infinity,
      Number.MAX_SAFE_INTEGER + 1,
    ]) {
      expect(() => createChordInversion(value)).toThrow();
    }
    for (const value of ["0", true, {}, [], null, undefined]) {
      expect(() => createChordInversion(value as never)).toThrow();
    }
  });

  it("exhaustively checks all ordered equality pairs", () => {
    for (const left of valid) {
      for (const right of valid) {
        expect(chordInversionsEqual(left, right)).toBe(left === right);
      }
    }
  });

  it("revalidates forged values at public boundaries", () => {
    expect(() => chordInversionsEqual(3 as ChordInversion, valid[0])).toThrow();
    expect(() => serializeChordInversion(-1 as ChordInversion)).toThrow();
  });

  it("serializes exact minimal stable fixtures", () => {
    for (const [index, inversion] of valid.entries()) {
      const serialized = serializeChordInversion(inversion);
      expect(serialized).toBe(`{"schema":"nightdrive.chord-inversion.v1","memberIndex":${index}}`);
      expect(serializeChordInversion(inversion)).toBe(serialized);
      const parsed = JSON.parse(serialized) as Record<string, unknown>;
      expect(Object.keys(parsed)).toEqual(["schema", "memberIndex"]);
      expect(parsed).not.toHaveProperty("chord");
      expect(parsed).not.toHaveProperty("root");
      expect(parsed).not.toHaveProperty("quality");
      expect(parsed).not.toHaveProperty("voicing");
      expect(parsed).not.toHaveProperty("label");
    }
  });

  it("does not coerce or wrap values", () => {
    expect(() => createChordInversion(0.9)).toThrow(
      expect.objectContaining({ code: CHORD_INVERSION_ERROR_CODES.notInteger }),
    );
    expect(() => createChordInversion(4)).toThrow(
      expect.objectContaining({ code: CHORD_INVERSION_ERROR_CODES.outOfRange }),
    );
  });
});
