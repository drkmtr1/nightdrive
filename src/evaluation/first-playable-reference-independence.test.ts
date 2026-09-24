import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { init, parse } from "es-module-lexer";
import { describe, expect, it, vi } from "vitest";

vi.mock("../composition/first-playable-composition", () => {
  throw new Error("independent reference imported production composition code");
});
vi.mock("../generators/first-playable-composition", () => {
  throw new Error("independent reference imported the production coordinator");
});
vi.mock("../music-domain/harmony", () => {
  throw new Error("independent reference imported Harmony generation");
});
vi.mock("../music-domain/bass", () => {
  throw new Error("independent reference imported Bass generation");
});
vi.mock("../music-domain/arpeggiator-policy-generator", () => {
  throw new Error("independent reference imported Arpeggiator generation");
});
vi.mock("../generators/adapters/stage7-digest", () => {
  throw new Error("independent reference imported the Nightdrive digest adapter");
});
vi.mock("./stage7-ac004-reference-vectors", () => {
  throw new Error("independent reference imported the Stage 7 reference assembler");
});

const ENTRY = resolve("src/evaluation/first-playable-reference-vectors.ts");
const ALLOWED_BUILTINS = new Set(["node:crypto"]);
const PROHIBITED_CALLS = Object.freeze([
  "buildFirstPlayableCompositionV1",
  "generateFirstPlayableCompositionV1",
  "serializeFirstPlayableHarmonyComponentV1",
  "serializeFirstPlayableBassComponentV1",
  "serializeFirstPlayableArpeggiatorComponentV1",
  "serializeFirstPlayableCompositionV1",
  "serializeFirstPlayableCompositionHashInputV1",
  "digestFirstPlayableHarmonyComponentV1",
  "digestFirstPlayableBassComponentV1",
  "digestFirstPlayableArpeggiatorComponentV1",
  "digestFirstPlayableCompositionV1",
  "verifyFirstPlayableCompositionV1",
  "realizeHarmonyProgression",
  "generateBassEvents",
  "generateArpEventsWithPolicyV2",
  "generateArpEventsWithPolicyV1",
  "deriveComponentSeedV1",
  "resolveArpeggiatorPolicyV2",
  "projectResolvedArpPlanV1",
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
    if (ALLOWED_BUILTINS.has(specifier)) continue;
    if (!specifier.startsWith("."))
      throw new Error(`${fullPath} imports unapproved external module ${specifier}`);
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

describe("First Playable reference independence boundary", () => {
  it("parses and traverses the actual runtime dependency graph, permitting only node:crypto", () => {
    return init.then(async () =>
      expect(await referenceRuntimeImports(ENTRY)).toEqual(["node:crypto"]),
    );
  });

  it("loads and hashes frozen evidence while prohibited production modules are mocked to fail", async () => {
    const spies = PROHIBITED_CALLS.map((name) => {
      const spy = vi.fn(() => {
        throw new Error(`prohibited global call: ${name}`);
      });
      vi.stubGlobal(name, spy);
      return spy;
    });
    try {
      const reference = await import("./first-playable-reference-vectors");
      expect(reference.sha256Utf8("abc")).toBe(
        "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
      );
      const sources = JSON.parse(
        readFileSync("docs/reviews/FIRST_PLAYABLE_SOURCE_RECORDS.json", "utf8"),
      ) as {
        vectors: unknown[];
      };
      expect(
        reference.validateFrozenSourceArtifact({
          schema: "nightdrive.first-playable-source-records.v1",
          status: "ACCEPTED/FROZEN",
          vectors: sources.vectors,
        }).validated,
      ).toHaveLength(12);
      expect(reference.deriveFirstPlayableReferenceVector(sources.vectors[0]).vectorId).toBe(
        "FP-01",
      );
      for (const spy of spies) expect(spy).not.toHaveBeenCalled();
    } finally {
      vi.unstubAllGlobals();
    }
  });
});
