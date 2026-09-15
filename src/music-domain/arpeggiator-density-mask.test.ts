import { describe, expect, it, vi } from "vitest";
import {
  ARP_DENSITY_MASK_CATALOG_V1,
  type ArpDensityMaskIdV1,
  type ArpDensityMaskV1,
  getArpDensityMaskV1,
} from "./arpeggiator-density-mask";
import * as publicDomain from "./index";
import * as prng from "./prng";

const EXPECTED_MASKS = [
  ["full", ["on", "on", "on", "on"]],
  ["three-of-four", ["on", "on", "rest", "on"]],
  ["alternating-on-rest", ["on", "rest", "on", "rest"]],
  ["alternating-rest-on", ["rest", "on", "rest", "on"]],
  ["one-of-four", ["on", "rest", "rest", "rest"]],
] as const satisfies readonly (readonly [ArpDensityMaskIdV1, ArpDensityMaskV1])[];

describe("Stage 7C7a3 immutable density-mask catalog", () => {
  it("contains exactly the five accepted identifiers", () => {
    expect(new Set(Object.keys(ARP_DENSITY_MASK_CATALOG_V1))).toEqual(
      new Set(EXPECTED_MASKS.map(([maskId]) => maskId)),
    );
  });

  it.each(EXPECTED_MASKS)("maps %s to its exact canonical sequence", (maskId, expected) => {
    expect(getArpDensityMaskV1(maskId)).toEqual(expected);
  });

  it("contains exactly four canonical steps and at least one on step per mask", () => {
    for (const [maskId] of EXPECTED_MASKS) {
      const sequence = getArpDensityMaskV1(maskId);
      expect(sequence).toHaveLength(4);
      expect(sequence.every((step) => step === "on" || step === "rest")).toBe(true);
      expect(sequence).toContain("on");
    }
  });

  it("freezes the catalog and every canonical sequence", () => {
    expect(Object.isFrozen(ARP_DENSITY_MASK_CATALOG_V1)).toBe(true);
    for (const [maskId] of EXPECTED_MASKS) {
      expect(Object.isFrozen(getArpDensityMaskV1(maskId))).toBe(true);
    }
  });

  it("returns the canonical sequence without cloning or mutating catalog state", () => {
    for (const [maskId, expected] of EXPECTED_MASKS) {
      const before = [...getArpDensityMaskV1(maskId)];
      const first = getArpDensityMaskV1(maskId);
      const second = getArpDensityMaskV1(maskId);

      expect(first).toBe(second);
      expect(first).toEqual(expected);
      expect(getArpDensityMaskV1(maskId)).toEqual(before);
    }
  });

  it("prevents mutation while allowing safe readonly consumption", () => {
    const sequence = getArpDensityMaskV1("three-of-four");
    const consumed = sequence.map((step) => step.toUpperCase());

    expect(consumed).toEqual(["ON", "ON", "REST", "ON"]);
    expect(Reflect.set(sequence, 0, "rest")).toBe(false);
    expect(getArpDensityMaskV1("three-of-four")).toEqual(["on", "on", "rest", "on"]);
  });

  it("defensively rejects an impossible internal identifier without structured errors", () => {
    let error: unknown;
    try {
      getArpDensityMaskV1("unknown" as never);
    } catch (caught) {
      error = caught;
    }

    expect(error).toEqual(new Error("Arpeggiator density-mask catalog invariant failed."));
    expect(error).not.toHaveProperty("code");
    expect(error).not.toHaveProperty("field");
  });

  it("does not consult ambient randomness or invoke the Nightdrive PRNG", () => {
    const random = vi.spyOn(Math, "random").mockImplementation(() => {
      throw new Error("ambient randomness is prohibited");
    });
    const next = vi.spyOn(prng, "nextMulberry32");
    try {
      for (const [maskId, expected] of EXPECTED_MASKS) {
        expect(getArpDensityMaskV1(maskId)).toEqual(expected);
      }
      expect(random).not.toHaveBeenCalled();
      expect(next).not.toHaveBeenCalled();
    } finally {
      next.mockRestore();
      random.mockRestore();
    }
  });

  it("does not expose the catalog or lookup from the public music-domain barrel", () => {
    expect(publicDomain).not.toHaveProperty("ARP_DENSITY_MASK_CATALOG_V1");
    expect(publicDomain).not.toHaveProperty("getArpDensityMaskV1");
  });
});
