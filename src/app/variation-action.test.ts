// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";
import * as node from "../web/variation-application-node";
import {
  createArpeggiatorVariationAction,
  createOriginalVariationApplicationAction,
  editRetainedVariationAction,
  projectRetainedVariationApplicationAction,
  redoRetainedVariationAction,
  selectRetainedVariationAction,
  undoRetainedVariationAction,
} from "./variation-action";

afterEach(() => vi.restoreAllMocks());
const routes = [
  {
    boundary: "createOriginalVariationApplicationForNodeV1",
    count: 3,
    run: (a: unknown[]) => createOriginalVariationApplicationAction(a[0], a[1], a[2]),
  },
  {
    boundary: "projectRetainedVariationApplicationForNodeV1",
    count: 1,
    run: (a: unknown[]) => projectRetainedVariationApplicationAction(a[0]),
  },
  {
    boundary: "createRetainedArpeggiatorVariationApplicationForNodeV1",
    count: 4,
    run: (a: unknown[]) => createArpeggiatorVariationAction(a[0], a[1], a[2], a[3]),
  },
  {
    boundary: "selectRetainedVariationApplicationForNodeV1",
    count: 5,
    run: (a: unknown[]) => selectRetainedVariationAction(a[0], a[1], a[2], a[3], a[4]),
  },
  {
    boundary: "editRetainedVariationApplicationForNodeV1",
    count: 5,
    run: (a: unknown[]) => editRetainedVariationAction(a[0], a[1], a[2], a[3], a[4]),
  },
  {
    boundary: "undoRetainedVariationApplicationForNodeV1",
    count: 4,
    run: (a: unknown[]) => undoRetainedVariationAction(a[0], a[1], a[2], a[3]),
  },
  {
    boundary: "redoRetainedVariationApplicationForNodeV1",
    count: 4,
    run: (a: unknown[]) => redoRetainedVariationAction(a[0], a[1], a[2], a[3]),
  },
] as const;

describe("untrusted variation proposal Server Actions", () => {
  it.each(routes)(
    "$boundary delegates once with every original argument and returns the exact complete result",
    async ({ boundary, count, run }) => {
      const args = Array.from({ length: count }, (_, index) => Object.freeze({ index }));
      const result = Object.freeze({ complete: "sentinel application" });
      const delegates = Object.fromEntries(
        routes.map((route) => [
          route.boundary,
          vi.spyOn(node, route.boundary).mockResolvedValue(result as never),
        ]),
      );
      await expect(run(args)).resolves.toBe(result);
      const calls = delegates[boundary]?.mock.calls;
      expect(calls).toHaveLength(1);
      expect(calls?.[0]).toHaveLength(count);
      for (let index = 0; index < count; index += 1) expect(calls?.[0]?.[index]).toBe(args[index]);
      for (const route of routes)
        if (route.boundary !== boundary) expect(delegates[route.boundary]).not.toHaveBeenCalled();
    },
  );
  it.each(routes)(
    "$boundary propagates boundary rejection without retry or alternate dispatch",
    async ({ boundary, count, run }) => {
      const failure = new Error("private diagnostic sentinel");
      const delegates = Object.fromEntries(
        routes.map((route) => [
          route.boundary,
          vi.spyOn(node, route.boundary).mockRejectedValue(failure),
        ]),
      );
      await expect(run(Array.from({ length: count }, () => ({})))).rejects.toBe(failure);
      expect(delegates[boundary]).toHaveBeenCalledTimes(1);
      for (const route of routes)
        if (route.boundary !== boundary) expect(delegates[route.boundary]).not.toHaveBeenCalled();
    },
  );
  it.each(
    routes.filter(
      ({ boundary }) =>
        boundary === "undoRetainedVariationApplicationForNodeV1" ||
        boundary === "redoRetainedVariationApplicationForNodeV1",
    ),
  )(
    "$boundary preserves null history bounds without inventing an application",
    async ({ boundary, run }) => {
      const delegate = vi.spyOn(node, boundary).mockResolvedValue(null as never);
      await expect(run([{}, {}, {}, {}])).resolves.toBeNull();
      expect(delegate).toHaveBeenCalledTimes(1);
    },
  );
  it.each(routes)(
    "$boundary rejects unsafe caller hooks through its real canonical boundary",
    async ({ count, run }) => {
      const hook = vi.fn();
      const input = Object.defineProperty({}, "schema", { enumerable: true, get: hook });
      await expect(run(Array.from({ length: count }, () => input))).rejects.toBeDefined();
      expect(hook).not.toHaveBeenCalled();
    },
  );
  it("does not accept browser-claimed admission, hashes or complete application as proof", async () => {
    const forged = {
      admitted: true,
      selectedState: { schema: "nightdrive.variation-state.v1", stateHash: "0".repeat(64) },
      collection: {},
    };
    await expect(projectRetainedVariationApplicationAction(forged)).rejects.toBeDefined();
  });
});
