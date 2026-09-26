import { readFileSync } from "node:fs";
import { resolve } from "node:path";

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
vi.mock("../music-domain/chord", () => {
  throw new Error("independent reference imported production Chord code");
});
vi.mock("../music-domain/chord-inversion", () => {
  throw new Error("independent reference imported production ChordInversion code");
});
vi.mock("../music-domain/chord-quality", () => {
  throw new Error("independent reference imported production ChordQuality code");
});
vi.mock("../music-domain/chord-voicing", () => {
  throw new Error("independent reference imported production ChordVoicing code");
});
vi.mock("../music-domain/component-seed", () => {
  throw new Error("independent reference imported production component-seed code");
});
vi.mock("../music-domain/harmony", () => {
  throw new Error("independent reference imported production Harmony code");
});
vi.mock("../music-domain/harmony-progression-internal", () => {
  throw new Error("independent reference imported production Harmony progression code");
});
vi.mock("../music-domain/key", () => {
  throw new Error("independent reference imported production Key code");
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
vi.mock("../music-domain/scale", () => {
  throw new Error("independent reference imported production scale code");
});
vi.mock("../music-domain/weighted-choice", () => {
  throw new Error("independent reference imported production weighted choice code");
});

const ENTRY = resolve("src/evaluation/stage8-motif-reference-projector.ts");

function deepFreeze<T>(value: T): T {
  if (typeof value !== "object" || value === null || Object.isFrozen(value)) return value;
  for (const key of Reflect.ownKeys(value)) deepFreeze(Reflect.get(value, key));
  return Object.freeze(value);
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
  for (const entry of imports) {
    const statement = sourceText.slice(entry.ss, entry.se);
    if (/^import\s+type\b/.test(statement)) continue;
    if (entry.d >= 0) throw new Error(`${fullPath} uses dynamic import`);
    if (entry.n === undefined || entry.n === null)
      throw new Error(`${fullPath} uses a nonliteral dependency`);
    if (!entry.n.startsWith("."))
      throw new Error(`${fullPath} imports an unapproved external module ${entry.n}`);
    specifiers.push(entry.n);
  }
  graph.set(fullPath, specifiers);
  return graph;
}

const ISOLATED_HARMONY = deepFreeze({
  profile: "dark-synthwave",
  templateId: "degree-0654-natural-minor-v1",
  templateVersion: "v1",
  key: { tonic: 0, scale: "natural-minor" },
  slots: [
    {
      index: 0,
      degree: 0,
      bars: 2,
      chord: { root: 0, quality: "minor-triad" },
      inversion: 0,
      voicing: { midiPitches: [36, 39, 43] },
    },
    {
      index: 1,
      degree: 6,
      bars: 2,
      chord: { root: 10, quality: "major-triad" },
      inversion: 1,
      voicing: { midiPitches: [38, 41, 46] },
    },
    {
      index: 2,
      degree: 5,
      bars: 2,
      chord: { root: 8, quality: "major-triad" },
      inversion: 1,
      voicing: { midiPitches: [36, 39, 44] },
    },
    {
      index: 3,
      degree: 4,
      bars: 2,
      chord: { root: 7, quality: "major-triad" },
      inversion: 2,
      voicing: { midiPitches: [38, 43, 47] },
    },
  ],
});

const ISOLATED_PLAN = deepFreeze({
  policyVersion: "nightdrive.motif-policy.v1",
  profileVersion: "nightdrive.genre-profile.motif.v1",
  rhythmTemplate: "steady-6",
  registerBand: "upper",
  tensionMode: "chordal",
  phrase4Displacement: "none",
  contourOffsets: [0, 1, 2, 1, 2, 0],
  phraseRoles: [
    "identity",
    "motif-form-repetition",
    "harmony-aware-transposition",
    "contour-preserving-response",
  ],
});

describe("Stage 8 Motif reference projector independence", () => {
  it("parses runtime dependencies after verifying erased type-only imports and rejects escape hatches", async () => {
    const sourceText = readFileSync(ENTRY, "utf8");
    expect(sourceText.match(/^import[^;]+;$/gm)).toEqual([
      'import type { Stage8MotifReferencePlanV1 } from "./stage8-motif-reference-plan-resolution";',
      'import type { Stage8MotifFrozenHarmonyV1 } from "./stage8-motif-source-bindings";',
    ]);
    expect(sourceText).not.toMatch(/\brequire\s*\(/);
    expect(sourceText).not.toMatch(/\beval\s*\(/);
    expect(sourceText).not.toMatch(/\bFunction\s*\(/);
    expect(sourceText).not.toMatch(/\b(?:process|module)\s*(?:\.|\[)/);
    expect(sourceText.toLowerCase()).not.toContain("random");
    expect(sourceText).not.toMatch(/\b(?:crypto|getRandomValues|fetch|XMLHttpRequest|WebSocket)\b/);
    expect(sourceText).not.toMatch(/\bDate\s*\./);

    await init;
    const graph = await runtimeDependencyGraph(ENTRY);
    expect([...graph]).toEqual([[ENTRY, []]]);
  });

  it("projects an isolated literal under blocked production modules and ambient entropy", async () => {
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
      const reference = await import("./stage8-motif-reference-projector");
      const events = reference.projectStage8MotifReferencePlanV1(ISOLATED_HARMONY, ISOLATED_PLAN);
      expect(events).toHaveLength(24);
      expect(events[0]).toEqual({ pitch: 75, startTick: 0, durationTicks: 960 });
      for (const spy of spies) expect(spy).not.toHaveBeenCalled();
    } finally {
      random.mockRestore();
      now.mockRestore();
      vi.unstubAllGlobals();
    }
  });
});
