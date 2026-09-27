import { existsSync, readFileSync } from "node:fs";
import { dirname, extname, relative, resolve } from "node:path";

import { init, parse } from "es-module-lexer";
import { describe, expect, it, vi } from "vitest";

vi.mock("../generators/motif-generator", () => {
  throw new Error("candidate reference imported the production Motif generator");
});
vi.mock("../generators/motif-pitch-projector", () => {
  throw new Error("candidate reference imported the production Motif projector");
});
vi.mock("../generators/motif-policy-resolver", () => {
  throw new Error("candidate reference imported the production Motif resolver");
});
vi.mock("../music-domain/chord", () => {
  throw new Error("candidate reference imported production Chord code");
});
vi.mock("../music-domain/chord-inversion", () => {
  throw new Error("candidate reference imported production ChordInversion code");
});
vi.mock("../music-domain/chord-quality", () => {
  throw new Error("candidate reference imported production ChordQuality code");
});
vi.mock("../music-domain/chord-voicing", () => {
  throw new Error("candidate reference imported production ChordVoicing code");
});
vi.mock("../music-domain/component-seed", () => {
  throw new Error("candidate reference imported production component-seed code");
});
vi.mock("../music-domain/harmony", () => {
  throw new Error("candidate reference imported production Harmony code");
});
vi.mock("../music-domain/key", () => {
  throw new Error("candidate reference imported production Key code");
});
vi.mock("../music-domain/motif-catalog", () => {
  throw new Error("candidate reference imported the production Motif catalog");
});
vi.mock("../music-domain/motif-policy", () => {
  throw new Error("candidate reference imported production Motif policy code");
});
vi.mock("../music-domain/motif-profile-configuration", () => {
  throw new Error("candidate reference imported production Motif profile code");
});
vi.mock("../music-domain/motif-result", () => {
  throw new Error("candidate reference imported the production Motif result builder");
});
vi.mock("../music-domain/prng", () => {
  throw new Error("candidate reference imported the production PRNG");
});
vi.mock("../music-domain/scale", () => {
  throw new Error("candidate reference imported production scale code");
});
vi.mock("../music-domain/weighted-choice", () => {
  throw new Error("candidate reference imported production weighted choice code");
});

const ENTRY = resolve("src/evaluation/stage8-motif-candidate-vectors.ts");
const ALLOWED_EXTERNAL_RUNTIME_MODULES = new Set(["node:crypto"]);

function localModulePath(importer: string, specifier: string): string {
  const source = resolve(dirname(importer), specifier);
  const candidates =
    extname(source) === "" ? [`${source}.ts`, resolve(source, "index.ts")] : [source];
  const candidate = candidates.find((path) => existsSync(path));
  if (candidate === undefined) throw new Error(`Cannot resolve ${specifier} from ${importer}`);
  return candidate;
}

async function runtimeDependencyGraph(
  path: string,
  graph = new Map<string, readonly string[]>(),
): Promise<ReadonlyMap<string, readonly string[]>> {
  const fullPath = resolve(path);
  if (graph.has(fullPath)) return graph;
  const sourceText = readFileSync(fullPath, "utf8");
  const [imports] = await parse(sourceText);
  const specifiers: string[] = [];
  graph.set(fullPath, specifiers);
  for (const entry of imports) {
    const statement = sourceText.slice(entry.ss, entry.se);
    if (/^import\s+type\b/.test(statement)) continue;
    if (entry.d >= 0) throw new Error(`${fullPath} uses dynamic import`);
    if (entry.n === undefined || entry.n === null)
      throw new Error(`${fullPath} uses a nonliteral dependency`);
    specifiers.push(entry.n);
    if (ALLOWED_EXTERNAL_RUNTIME_MODULES.has(entry.n)) continue;
    if (!entry.n.startsWith(".")) throw new Error(`${fullPath} imports ${entry.n}`);
    await runtimeDependencyGraph(localModulePath(fullPath, entry.n), graph);
  }
  return graph;
}

describe("Stage 8 Motif candidate-vector independence", () => {
  it("inspects the complete runtime dependency graph and rejects production escape hatches", async () => {
    const sourceText = readFileSync(ENTRY, "utf8");
    expect(sourceText).not.toMatch(/\brequire\s*\(/);
    expect(sourceText).not.toMatch(/\beval\s*\(/);
    expect(sourceText).not.toMatch(/\bFunction\s*\(/);
    expect(sourceText).not.toMatch(/\b(?:process|module)\s*(?:\.|\[)/);
    expect(sourceText).not.toMatch(/\b(?:readFile|writeFile|mkdir|execFile|spawn|fetch)\b/);
    expect(sourceText).not.toMatch(/\bDate\s*\./);
    expect(sourceText.toLowerCase()).not.toContain("math.random");

    await init;
    const graph = await runtimeDependencyGraph(ENTRY);
    const paths = [...graph.keys()].map((path) =>
      relative(process.cwd(), path).replaceAll("\\", "/"),
    );
    expect(paths.sort()).toEqual([
      "src/evaluation/stage7-ac004-harmony-snapshots.ts",
      "src/evaluation/stage8-motif-candidate-vectors.ts",
      "src/evaluation/stage8-motif-reference-plan-resolution.ts",
      "src/evaluation/stage8-motif-reference-policy.ts",
      "src/evaluation/stage8-motif-reference-primitives.ts",
      "src/evaluation/stage8-motif-reference-projector.ts",
      "src/evaluation/stage8-motif-source-bindings.ts",
    ]);
    for (const [path, specifiers] of graph) {
      expect(path).not.toContain("music-domain");
      expect(path).not.toContain("generators");
      expect(
        specifiers.every((specifier) => specifier === "node:crypto" || specifier.startsWith(".")),
      ).toBe(true);
    }
  });

  it("derives reference-only values with production modules and ambient entropy blocked", async () => {
    const blockedCalls = [
      "deriveComponentSeedV1",
      "createMulberry32State",
      "nextMulberry32",
      "selectWeightedCandidateV1",
      "resolveMotifPlanV1",
      "generateMotifV1",
      "projectMotifPitchesV1",
      "projectResolvedMotifPlanV1",
      "serializeMotifGenerationResultV1",
    ] as const;
    const spies = blockedCalls.map((name) => {
      const spy = vi.fn(() => {
        throw new Error(`prohibited global call: ${name}`);
      });
      vi.stubGlobal(name, spy);
      return spy;
    });
    const random = vi.spyOn(Math, "random").mockImplementation(() => {
      throw new Error("ambient entropy must not be used");
    });
    const now = vi.spyOn(Date, "now").mockImplementation(() => {
      throw new Error("wall clock must not be read");
    });
    try {
      const reference = await import("./stage8-motif-candidate-vectors");
      const artifact = reference.buildStage8MotifCandidateArtifact();
      expect(artifact.vectors).toHaveLength(24);
      expect(artifact.vectors[0]?.vectorId).toBe("dark-synthwave-chorus-001-low-low-00000000");
      expect(artifact.vectors[0]?.resultJson).toContain(
        '"schema":"nightdrive.motif-generation-result.v1"',
      );
      for (const spy of spies) expect(spy).not.toHaveBeenCalled();
    } finally {
      random.mockRestore();
      now.mockRestore();
      vi.unstubAllGlobals();
    }
  });
});
