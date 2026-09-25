import { describe, expect, it, vi } from "vitest";
import * as publicDomain from "./index";
import {
  MOTIF_CONTOUR_CATALOG_VERSION_V1,
  MOTIF_PHRASE4_DISPLACEMENTS_V1,
  MOTIF_PHRASE_ROLES_V1,
  MOTIF_REGISTER_BANDS_V1,
  MOTIF_RHYTHM_CATALOG_V1,
  MOTIF_RHYTHM_CATALOG_VERSION_V1,
  MOTIF_RHYTHM_TEMPLATE_IDS_V1,
  MOTIF_TENSION_MODES_V1,
  type MotifRhythmTemplateIdV1,
  type MotifRhythmTemplateV1,
  getMotifRhythmTemplateV1,
} from "./motif-catalog";
import * as prng from "./prng";

const EXPECTED_TEMPLATES = [
  [
    "sparse-4",
    {
      relativeOnsetGridIndices: [0, 4, 8, 12],
      durationsTicks: [960, 960, 960, 960],
      contourOffsets: [0, 1, 2, 0],
      displacementEventOrdinal: 1,
    },
  ],
  [
    "steady-6",
    {
      relativeOnsetGridIndices: [0, 2, 4, 7, 10, 14],
      durationsTicks: [960, 480, 960, 480, 960, 960],
      contourOffsets: [0, 1, 2, 1, 2, 0],
      displacementEventOrdinal: 3,
    },
  ],
  [
    "active-8",
    {
      relativeOnsetGridIndices: [0, 2, 4, 6, 8, 10, 12, 14],
      durationsTicks: [480, 480, 480, 480, 480, 480, 480, 480],
      contourOffsets: [0, 1, 2, 3, 2, 3, 1, 0],
      displacementEventOrdinal: 3,
    },
  ],
] as const satisfies readonly (readonly [MotifRhythmTemplateIdV1, MotifRhythmTemplateV1])[];

describe("Stage 8 immutable Motif catalog foundation", () => {
  it("freezes the exact accepted identities and closed-domain order", () => {
    expect(MOTIF_CONTOUR_CATALOG_VERSION_V1).toBe("nightdrive.motif-contour.v1");
    expect(MOTIF_RHYTHM_CATALOG_VERSION_V1).toBe("nightdrive.motif-rhythm.v1");
    expect(MOTIF_RHYTHM_TEMPLATE_IDS_V1).toEqual(["sparse-4", "steady-6", "active-8"]);
    expect(MOTIF_REGISTER_BANDS_V1).toEqual(["lower", "middle", "upper"]);
    expect(MOTIF_TENSION_MODES_V1).toEqual(["chordal", "diatonic-passing"]);
    expect(MOTIF_PHRASE4_DISPLACEMENTS_V1).toEqual(["none", "earlier-480", "later-480"]);
    expect(MOTIF_PHRASE_ROLES_V1).toEqual([
      "identity",
      "motif-form-repetition",
      "harmony-aware-transposition",
      "contour-preserving-response",
    ]);

    for (const value of [
      MOTIF_RHYTHM_TEMPLATE_IDS_V1,
      MOTIF_REGISTER_BANDS_V1,
      MOTIF_TENSION_MODES_V1,
      MOTIF_PHRASE4_DISPLACEMENTS_V1,
      MOTIF_PHRASE_ROLES_V1,
    ]) {
      expect(Object.isFrozen(value)).toBe(true);
    }
  });

  it("contains exactly the accepted template IDs in declaration order", () => {
    expect(Object.keys(MOTIF_RHYTHM_CATALOG_V1)).toEqual(
      EXPECTED_TEMPLATES.map(([templateId]) => templateId),
    );
  });

  it.each(EXPECTED_TEMPLATES)("maps %s to its exact accepted form", (templateId, expected) => {
    expect(getMotifRhythmTemplateV1(templateId)).toEqual(expected);
  });

  it("recursively freezes the catalog and returns stable canonical references", () => {
    expect(Object.isFrozen(MOTIF_RHYTHM_CATALOG_V1)).toBe(true);

    for (const [templateId] of EXPECTED_TEMPLATES) {
      const first = getMotifRhythmTemplateV1(templateId);
      expect(first).toBe(getMotifRhythmTemplateV1(templateId));
      expect(Object.isFrozen(first)).toBe(true);
      expect(Object.isFrozen(first.relativeOnsetGridIndices)).toBe(true);
      expect(Object.isFrozen(first.durationsTicks)).toBe(true);
      expect(Object.isFrozen(first.contourOffsets)).toBe(true);
      expect(Reflect.set(first.contourOffsets, 0, 99)).toBe(false);
    }
  });

  it("proves event counts, 480-tick grid, durations, phrase bounds, and contour alignment", () => {
    for (const [templateId] of EXPECTED_TEMPLATES) {
      const template = getMotifRhythmTemplateV1(templateId);
      expect(template.relativeOnsetGridIndices).toHaveLength(template.durationsTicks.length);
      expect(template.contourOffsets).toHaveLength(template.durationsTicks.length);
      for (let index = 0; index < template.durationsTicks.length; index += 1) {
        const startTick = template.relativeOnsetGridIndices[index] * 480;
        expect(Number.isInteger(template.relativeOnsetGridIndices[index])).toBe(true);
        expect(
          template.durationsTicks[index] === 480 || template.durationsTicks[index] === 960,
        ).toBe(true);
        expect(startTick).toBeGreaterThanOrEqual(0);
        expect(startTick + template.durationsTicks[index]).toBeLessThanOrEqual(7680);
      }
    }
  });

  it("proves both accepted Phrase-4 displacements preserve bounds, order, and non-overlap", () => {
    for (const [templateId] of EXPECTED_TEMPLATES) {
      const template = getMotifRhythmTemplateV1(templateId);
      for (const displacement of [-480, 480]) {
        const starts = template.relativeOnsetGridIndices.map((gridIndex, eventIndex) =>
          eventIndex === template.displacementEventOrdinal
            ? gridIndex * 480 + displacement
            : gridIndex * 480,
        );
        for (let index = 0; index < starts.length; index += 1) {
          expect(starts[index]).toBeGreaterThanOrEqual(0);
          expect(starts[index] + template.durationsTicks[index]).toBeLessThanOrEqual(7680);
          if (index > 0) {
            expect(starts[index]).toBeGreaterThanOrEqual(
              starts[index - 1] + template.durationsTicks[index - 1],
            );
          }
        }
      }
    }
  });

  it("fails closed for an impossible internal template ID", () => {
    expect(() => getMotifRhythmTemplateV1("unknown" as never)).toThrow(
      new Error("Motif rhythm catalog invariant failed."),
    );
  });

  it("does not consult ambient randomness or the Nightdrive PRNG", () => {
    const random = vi.spyOn(Math, "random").mockImplementation(() => {
      throw new Error("ambient randomness is prohibited");
    });
    const next = vi.spyOn(prng, "nextMulberry32");
    try {
      for (const [templateId, expected] of EXPECTED_TEMPLATES) {
        expect(getMotifRhythmTemplateV1(templateId)).toEqual(expected);
      }
      expect(random).not.toHaveBeenCalled();
      expect(next).not.toHaveBeenCalled();
    } finally {
      next.mockRestore();
      random.mockRestore();
    }
  });

  it("does not expose the internal catalog foundation from the public barrel", () => {
    expect(publicDomain).not.toHaveProperty("MOTIF_RHYTHM_CATALOG_V1");
    expect(publicDomain).not.toHaveProperty("getMotifRhythmTemplateV1");
  });
});
