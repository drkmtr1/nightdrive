import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

import { init, parse } from "es-module-lexer";
import { describe, expect, it, vi } from "vitest";

vi.mock("../generators/motif-generator", () => {
  throw new Error("independent reference imported the production Motif generator");
});
vi.mock("../generators/motif-pitch-projector", () => {
  throw new Error("independent reference imported the production Motif projector");
});
vi.mock("../generators/motif-policy-resolver", () => {
  throw new Error("independent reference imported the production Motif resolver");
});
vi.mock("../music-domain/component-seed", () => {
  throw new Error("independent reference imported production component-seed code");
});
vi.mock("../music-domain/composition-intent", () => {
  throw new Error("independent reference imported production composition intent code");
});
vi.mock("../music-domain/motif-catalog", () => {
  throw new Error("independent reference imported the production Motif catalog");
});
vi.mock("../music-domain/motif-policy", () => {
  throw new Error("independent reference imported production Motif policy code");
});
vi.mock("../music-domain/motif-profile-configuration", () => {
  throw new Error("independent reference imported production Motif profile code");
});
vi.mock("../music-domain/motif-result", () => {
  throw new Error("independent reference imported the production Motif result builder");
});
vi.mock("../music-domain/prng", () => {
  throw new Error("independent reference imported the production PRNG");
});
vi.mock("../music-domain/weighted-choice", () => {
  throw new Error("independent reference imported production weighted-choice code");
});

const ENTRY = resolve("src/evaluation/stage8-motif-reference-plan-resolution.ts");
const POLICY = resolve("src/evaluation/stage8-motif-reference-policy.ts");
const PRIMITIVES = resolve("src/evaluation/stage8-motif-reference-primitives.ts");
const PROHIBITED_CALLS = Object.freeze([
  "deriveComponentSeedV1",
  "createMulberry32State",
  "nextMulberry32",
  "selectWeightedCandidateV1",
  "resolveMotifPlanV1",
  "getMotifRhythmTemplateV1",
  "generateMotifV1",
  "projectMotifPitchesV1",
  "projectResolvedMotifPlanV1",
  "serializeMotifGenerationResultV1",
]);

async function referenceRuntimeImportGraph(
  path: string,
  graph = new Map<string, readonly string[]>(),
): Promise<ReadonlyMap<string, readonly string[]>> {
  const fullPath = resolve(path);
  if (graph.has(fullPath)) return graph;

  const sourceText = readFileSync(fullPath, "utf8");
  const [imports] = await parse(sourceText);
  const specifiers: string[] = [];
  for (const entry of imports) {
    if (entry.d >= 0) throw new Error(`${fullPath} uses dynamic import`);
    if (entry.n === undefined || entry.n === null)
      throw new Error(`${fullPath} uses a nonliteral dependency`);
    if (!entry.n.startsWith("."))
      throw new Error(`${fullPath} imports an unapproved external module ${entry.n}`);
    specifiers.push(entry.n);
  }
  graph.set(fullPath, specifiers);

  for (const specifier of specifiers) {
    const target = resolve(dirname(fullPath), specifier);
    const choices = [target, `${target}.ts`, `${target}.tsx`, resolve(target, "index.ts")];
    const match = choices.find((choice) => {
      try {
        readFileSync(choice);
        return true;
      } catch {
        return false;
      }
    });
    if (match === undefined)
      throw new Error(`${fullPath} has unresolved runtime import ${specifier}`);
    await referenceRuntimeImportGraph(match, graph);
  }
  return graph;
}

describe("Stage 8 Motif reference plan-resolution independence", () => {
  it("parses the actual complete runtime dependency graph and rejects escape hatches", async () => {
    const sourceText = readFileSync(ENTRY, "utf8");
    expect(sourceText).not.toMatch(/\brequire\s*\(/);
    expect(sourceText).not.toMatch(/\beval\s*\(/);
    expect(sourceText).not.toMatch(/\bFunction\s*\(/);
    expect(sourceText).not.toMatch(/\b(?:process|module)\s*(?:\.|\[)/);
    expect(sourceText.toLowerCase()).not.toContain("random");
    expect(sourceText).not.toMatch(/\b(?:crypto|getRandomValues)\b/);

    await init;
    const graph = await referenceRuntimeImportGraph(ENTRY);
    expect([...graph]).toEqual([
      [ENTRY, ["./stage8-motif-reference-policy", "./stage8-motif-reference-primitives"]],
      [POLICY, []],
      [PRIMITIVES, []],
    ]);
  });

  it("resolves an isolated reference plan while production Motif modules and calls are blocked", async () => {
    const spies = PROHIBITED_CALLS.map((name) => {
      const spy = vi.fn(() => {
        throw new Error(`prohibited global call: ${name}`);
      });
      vi.stubGlobal(name, spy);
      return spy;
    });
    try {
      const reference = await import("./stage8-motif-reference-plan-resolution");
      const plan = reference.resolveStage8MotifReferencePlanV1(
        { profileId: "darkwave", energy: "high", complexity: "high" },
        0,
      );
      expect(plan).toEqual({
        policyVersion: "nightdrive.motif-policy.v1",
        profileVersion: "nightdrive.genre-profile.motif.v1",
        rhythmTemplate: "active-8",
        registerBand: "lower",
        tensionMode: "chordal",
        phrase4Displacement: "later-480",
        contourOffsets: [0, 1, 2, 3, 2, 3, 1, 0],
        phraseRoles: [
          "identity",
          "motif-form-repetition",
          "harmony-aware-transposition",
          "contour-preserving-response",
        ],
      });
      expect(Object.isFrozen(plan)).toBe(true);
      expect(Object.isFrozen(plan.contourOffsets)).toBe(true);
      expect(Object.isFrozen(plan.phraseRoles)).toBe(true);
      for (const spy of spies) expect(spy).not.toHaveBeenCalled();
    } finally {
      vi.unstubAllGlobals();
    }
  });
});
