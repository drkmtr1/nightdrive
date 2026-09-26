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

const ENTRY = resolve("src/evaluation/stage8-motif-reference-policy.ts");
const PROHIBITED_CALLS = Object.freeze([
  "deriveComponentSeedV1",
  "generateMotifV1",
  "projectMotifPitchesV1",
  "resolveMotifPlanV1",
  "selectWeightedCandidateV1",
  "serializeMotifGenerationResultV1",
]);

async function referenceRuntimeImports(
  path: string,
  visited = new Set<string>(),
): Promise<string[]> {
  const fullPath = resolve(path);
  if (visited.has(fullPath)) return [];
  visited.add(fullPath);

  const text = readFileSync(fullPath, "utf8");
  const [imports] = await parse(text);
  const specifiers: string[] = [];
  for (const entry of imports) {
    if (entry.d >= 0) throw new Error(`${fullPath} uses dynamic import`);
    if (entry.n === undefined || entry.n === null)
      throw new Error(`${fullPath} uses a nonliteral dependency`);
    specifiers.push(entry.n);
  }
  for (const specifier of specifiers) {
    if (!specifier.startsWith("."))
      throw new Error(`${fullPath} imports an unapproved external module ${specifier}`);
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
    await referenceRuntimeImports(match, visited);
  }
  return specifiers;
}

describe("Stage 8 Motif reference policy independence", () => {
  it("parses the actual runtime dependency graph and rejects escape hatches", () => {
    const sourceText = readFileSync(ENTRY, "utf8");
    expect(sourceText).not.toMatch(/\brequire\s*\(/);
    expect(sourceText).not.toMatch(/\beval\s*\(/);
    expect(sourceText).not.toMatch(/\bFunction\s*\(/);
    expect(sourceText).not.toMatch(/\b(?:process|module)\s*(?:\.|\[)/);
    expect(sourceText.toLowerCase()).not.toContain("random");
    expect(sourceText).not.toMatch(/\b(?:crypto|getRandomValues)\b/);
    return init.then(async () => expect(await referenceRuntimeImports(ENTRY)).toEqual([]));
  });

  it("constructs an isolated list while production Motif modules and calls are blocked", async () => {
    const spies = PROHIBITED_CALLS.map((name) => {
      const spy = vi.fn(() => {
        throw new Error(`prohibited global call: ${name}`);
      });
      vi.stubGlobal(name, spy);
      return spy;
    });
    try {
      const reference = await import("./stage8-motif-reference-policy");
      expect(
        reference.buildStage8MotifReferenceWeightedCandidates(
          "darkwave",
          "displacement",
          "high",
          "high",
        ),
      ).toEqual([
        { value: "none", weight: 5 },
        { value: "later-480", weight: 6 },
        { value: "earlier-480", weight: 3 },
      ]);
      for (const spy of spies) expect(spy).not.toHaveBeenCalled();
    } finally {
      vi.unstubAllGlobals();
    }
  });
});
