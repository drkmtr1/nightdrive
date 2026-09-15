import { describe, expect, it, vi } from "vitest";
import * as publicDomain from "./index";
import { selectWeightedCandidateV1, type WeightedCandidate } from "./weighted-choice";

const NORMATIVE_VECTORS = [
  [
    [
      { value: "A", weight: 1 },
      { value: "B", weight: 1 },
      { value: "C", weight: 1 },
    ],
    0,
    "A",
  ],
  [
    [
      { value: "A", weight: 1 },
      { value: "B", weight: 1 },
      { value: "C", weight: 1 },
    ],
    2,
    "C",
  ],
  [
    [
      { value: "A", weight: 2 },
      { value: "B", weight: 3 },
      { value: "C", weight: 1 },
    ],
    2,
    "B",
  ],
  [
    [
      { value: "A", weight: 2 },
      { value: "B", weight: 3 },
      { value: "C", weight: 1 },
    ],
    5,
    "C",
  ],
  [
    [
      { value: "A", weight: 2 },
      { value: "B", weight: 3 },
      { value: "C", weight: 1 },
    ],
    0xffff_ffff,
    "B",
  ],
  [
    [
      { value: "A", weight: 0 },
      { value: "B", weight: 2 },
      { value: "C", weight: 0 },
    ],
    0,
    "B",
  ],
  [[{ value: "A", weight: 7 }], 0xffff_ffff, "A"],
] as const satisfies readonly (readonly [readonly WeightedCandidate<string>[], number, string])[];

function expectRangeError(operation: () => unknown, message: string): void {
  let error: unknown;
  try {
    operation();
  } catch (caught) {
    error = caught;
  }

  expect(error).toBeInstanceOf(RangeError);
  expect(error).toMatchObject({ name: "RangeError", message });
}

describe("Stage 7C7a2 deterministic weighted choice", () => {
  it.each(NORMATIVE_VECTORS)("matches normative vector %#", (candidates, u, expected) => {
    expect(selectWeightedCandidateV1(candidates, u)).toBe(expected);
  });

  it.each([
    [0, "A"],
    [1, "A"],
    [2, "B"],
    [4, "B"],
    [5, "C"],
  ] as const)("uses half-open bucket boundaries for u=%i", (u, expected) => {
    expect(
      selectWeightedCandidateV1(
        [
          { value: "A", weight: 2 },
          { value: "B", weight: 3 },
          { value: "C", weight: 1 },
        ],
        u,
      ),
    ).toBe(expected);
  });

  it.each([
    [0, "A"],
    [1, "A"],
    [2, "B"],
  ] as const)("keeps zero-weight positions empty for u=%i", (u, expected) => {
    expect(
      selectWeightedCandidateV1(
        [
          { value: "before", weight: 0 },
          { value: "A", weight: 2 },
          { value: "between", weight: 0 },
          { value: "B", weight: 1 },
          { value: "after", weight: 0 },
        ],
        u,
      ),
    ).toBe(expected);
  });

  it.each([
    -1,
    1.5,
    Number.NaN,
    Infinity,
    -Infinity,
    Number.MAX_SAFE_INTEGER + 1,
    65_536,
    "1",
    1n,
    true,
    null,
    undefined,
    [],
    {},
  ])("rejects invalid weight %#", (weight) => {
    expectRangeError(
      () => selectWeightedCandidateV1([{ value: "A", weight: weight as never }], 0),
      "candidates[0].weight must be a finite safe integer in 0..65535.",
    );
  });

  it("validates candidate weights from left to right", () => {
    expectRangeError(
      () =>
        selectWeightedCandidateV1(
          [
            { value: "A", weight: -1 },
            { value: "B", weight: 65_536 },
          ],
          0,
        ),
      "candidates[0].weight must be a finite safe integer in 0..65535.",
    );
  });

  it("rejects an empty candidate list", () => {
    expectRangeError(
      () => selectWeightedCandidateV1([], 0),
      "weighted candidates must be a non-empty array.",
    );
  });

  it("rejects a runtime value that is not an array", () => {
    expectRangeError(
      () => selectWeightedCandidateV1({} as never, 0),
      "weighted candidates must be a non-empty array.",
    );
  });

  it.each([null, [], {}, { value: "A" }, { weight: 1 }])(
    "rejects malformed candidate %#",
    (candidate) => {
      expectRangeError(
        () => selectWeightedCandidateV1([candidate] as never, 0),
        "candidates[0] must contain value and weight properties.",
      );
    },
  );

  it("rejects an all-zero candidate list", () => {
    expectRangeError(
      () =>
        selectWeightedCandidateV1(
          [
            { value: "A", weight: 0 },
            { value: "B", weight: 0 },
          ],
          0,
        ),
      "weighted candidate total must be in 1..65535.",
    );
  });

  it("accepts the minimum positive total", () => {
    expect(selectWeightedCandidateV1([{ value: "A", weight: 1 }], 0)).toBe("A");
  });

  it("accepts the maximum total", () => {
    expect(
      selectWeightedCandidateV1(
        [
          { value: "A", weight: 65_534 },
          { value: "B", weight: 1 },
        ],
        65_534,
      ),
    ).toBe("B");
  });

  it("rejects a running total above the maximum", () => {
    expectRangeError(
      () =>
        selectWeightedCandidateV1(
          [
            { value: "A", weight: 65_535 },
            { value: "B", weight: 1 },
          ],
          0,
        ),
      "weighted candidate total must be in 1..65535.",
    );
  });

  it.each([0, 1, 0xffff_ffff])("accepts canonical uint32 u=%i", (u) => {
    expect(
      selectWeightedCandidateV1(
        [
          { value: "A", weight: 1 },
          { value: "B", weight: 1 },
          { value: "C", weight: 1 },
        ],
        u,
      ),
    ).toMatch(/^[ABC]$/);
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
  ])("rejects invalid uint32 output %#", (u) => {
    expectRangeError(
      () => selectWeightedCandidateV1([{ value: "A", weight: 1 }], u as never),
      "u must be a finite safe integer in 0..4294967295.",
    );
  });

  it("validates u even for one legal candidate", () => {
    expectRangeError(
      () => selectWeightedCandidateV1([{ value: "A", weight: 1 }], -1),
      "u must be a finite safe integer in 0..4294967295.",
    );
  });

  it.each([
    [1, 0],
    [1, 0xffff_ffff],
    [65_535, 0],
    [65_535, 0xffff_ffff],
  ] as const)("selects one candidate with weight %i and u=%i", (weight, u) => {
    expect(selectWeightedCandidateV1([{ value: "only", weight }], u)).toBe("only");
  });

  it("preserves declared candidate order", () => {
    const forward = [
      { value: "A", weight: 1 },
      { value: "B", weight: 1 },
    ] as const;
    const reverse = [
      { value: "B", weight: 1 },
      { value: "A", weight: 1 },
    ] as const;

    expect(selectWeightedCandidateV1(forward, 0)).toBe("A");
    expect(selectWeightedCandidateV1(reverse, 0)).toBe("B");
  });

  it("does not sort candidates by weight or value", () => {
    expect(
      selectWeightedCandidateV1(
        [
          { value: "Z", weight: 1 },
          { value: "A", weight: 5 },
        ],
        0,
      ),
    ).toBe("Z");
  });

  it("returns an arbitrary object value by exact reference without inferred equality", () => {
    const first = Object.freeze({ id: "same" });
    const second = Object.freeze({ id: "same" });
    const selected = selectWeightedCandidateV1(
      [
        { value: first, weight: 1 },
        { value: second, weight: 1 },
      ],
      1,
    );

    expect(selected).toBe(second);
    expect(selected).not.toBe(first);
  });

  it("accepts frozen candidates without mutation", () => {
    type CandidateValue = Readonly<{ id: string }>;
    const value: CandidateValue = Object.freeze({ id: "B" });
    const firstValue: CandidateValue = Object.freeze({ id: "A" });
    const first = Object.freeze({ value: firstValue, weight: 1 });
    const second = Object.freeze({ value, weight: 2 });
    const candidates = Object.freeze([first, second]);

    expect(selectWeightedCandidateV1(candidates, 1)).toBe(value);
    expect(candidates).toEqual([first, second]);
    expect(Object.isFrozen(candidates)).toBe(true);
    expect(Object.isFrozen(first)).toBe(true);
    expect(Object.isFrozen(second)).toBe(true);
    expect(Object.isFrozen(value)).toBe(true);
  });

  it("is deterministic for repeated equal inputs", () => {
    const candidates = [
      { value: "A", weight: 2 },
      { value: "B", weight: 3 },
      { value: "C", weight: 1 },
    ] as const;

    expect(selectWeightedCandidateV1(candidates, 0x1234_5678)).toBe(
      selectWeightedCandidateV1(candidates, 0x1234_5678),
    );
  });

  it("does not consult ambient Math.random", () => {
    const random = vi.spyOn(Math, "random").mockImplementation(() => {
      throw new Error("ambient randomness is prohibited");
    });
    try {
      expect(selectWeightedCandidateV1([{ value: "A", weight: 1 }], 0xffff_ffff)).toBe("A");
      expect(random).not.toHaveBeenCalled();
    } finally {
      random.mockRestore();
    }
  });

  it("does not expose the helper from the public music-domain barrel", () => {
    expect(publicDomain).not.toHaveProperty("selectWeightedCandidateV1");
  });
});
