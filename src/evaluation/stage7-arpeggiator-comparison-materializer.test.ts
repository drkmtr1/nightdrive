// @vitest-environment node
import { existsSync, readFileSync } from "node:fs";
import { mkdtemp, readFile, readdir, rm, mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { beforeAll, expect, it, vi } from "vitest";
import {
  buildStage7ComparisonDesign,
  buildStage7ComparisonPackage,
  type ComparisonPackage,
} from "./stage7-arpeggiator-comparison";
import { materializeStage7ComparisonPackage } from "./stage7-arpeggiator-comparison-materializer";

let fixturePackage: ComparisonPackage;
beforeAll(() => {
  const commit = "41d59f698e1bb37e76ddbeccb77c661768ed97aa";
  const input = {
    generatingCommit: commit,
    toolchain: { node: process.version, npm: "11.19.0" },
    sources: [
      "V1_R1_COMPARISON_PROTOCOL",
      "GOLDEN_CASES",
      "AUDITION_ARTIFACT",
      "LISTENING_SETUP",
      "V2_CALIBRATION",
    ].map((name) => {
      const path = `docs/reviews/STAGE7_ARPEGGIATOR_${name}.md`;
      return { path, commit, text: readFileSync(path, "utf8") };
    }),
  };
  fixturePackage = buildStage7ComparisonPackage(input, buildStage7ComparisonDesign(input));
});

function alterDocument(
  candidate: ComparisonPackage,
  path: string,
  change: (value: ReturnType<typeof JSON.parse>) => void,
): ComparisonPackage {
  const value = JSON.parse(candidate.documents[path]);
  change(value);
  return {
    ...candidate,
    documents: { ...candidate.documents, [path]: `${JSON.stringify(value, null, 2)}\n` },
  };
}

const malformed: [string, (candidate: ComparisonPackage) => ComparisonPackage][] = [
  [
    "mutated bytes",
    (p) => {
      const bytes = Uint8Array.from(p.fixtures[0].bytes);
      bytes[20] ^= 1;
      return { ...p, fixtures: [{ ...p.fixtures[0], bytes }, ...p.fixtures.slice(1)] };
    },
  ],
  [
    "stale hash",
    (p) =>
      alterDocument(p, "custodian/manifest.json", (v) => {
        v.fixtures[0].midiSha256 = "0".repeat(64);
      }),
  ],
  [
    "stale length",
    (p) =>
      alterDocument(p, "custodian/manifest.json", (v) => {
        v.fixtures[0].midiByteLength++;
      }),
  ],
  [
    "unsafe path",
    (p) => ({
      ...p,
      fixtures: [{ ...p.fixtures[0], path: "../escape.mid" }, ...p.fixtures.slice(1)],
    }),
  ],
  [
    "duplicate fixture",
    (p) => ({ ...p, fixtures: [p.fixtures[0], p.fixtures[0], ...p.fixtures.slice(2)] }),
  ],
  ["missing fixture", (p) => ({ ...p, fixtures: p.fixtures.slice(1) })],
  [
    "duplicate labels",
    (p) =>
      alterDocument(p, "custodian/presentation.json", (v) => {
        v.fixtures[1].label = v.fixtures[0].label;
      }),
  ],
  [
    "missing mapping",
    (p) =>
      alterDocument(p, "custodian/presentation.json", (v) => {
        v.fixtures.pop();
      }),
  ],
  [
    "duplicate reference",
    (p) =>
      alterDocument(p, "custodian/presentation.json", (v) => {
        v.fixtures[1].sourceKey = v.fixtures[0].sourceKey;
      }),
  ],
  [
    "wrong role",
    (p) =>
      alterDocument(p, "custodian/presentation.json", (v) => {
        v.panels[0].B = v.panels[0].A;
      }),
  ],
  [
    "bad grouping reference",
    (p) =>
      alterDocument(p, "pass2/grouping.json", (v) => {
        v.panels[0].entries[0].A = "ND7C-999.mid";
      }),
  ],
  [
    "blind metadata leakage",
    (p) =>
      alterDocument(p, "pass1/blind-manifest.json", (v) => {
        v.lineage = "R1";
      }),
  ],
  [
    "unexpected document",
    (p) => ({ ...p, documents: { ...p.documents, "pass1/secret.json": "{}\n" } }),
  ],
];

it.each(malformed)("rejects %s before creating the destination", async (_name, change) => {
  const parent = await mkdtemp(join(tmpdir(), "nd7c-preflight-"));
  const target = join(parent, "package");
  try {
    await expect(
      materializeStage7ComparisonPackage(target, change(fixturePackage)),
    ).rejects.toThrow();
    expect(existsSync(target)).toBe(false);
    expect(await readdir(parent)).toEqual([]);
  } finally {
    await rm(parent, { recursive: true, force: true });
  }
});

it("materializes exact bytes/JSON only in a fresh temporary directory", async () => {
  const parent = await mkdtemp(join(tmpdir(), "nd7c-valid-"));
  const target = join(parent, "package");
  const random = vi.spyOn(Math, "random").mockImplementation(() => {
    throw Error("ambient randomness");
  });
  try {
    await materializeStage7ComparisonPackage(target, fixturePackage);
    expect((await readdir(target)).sort()).toEqual(["custodian", "pass1", "pass2"]);
    expect(await readdir(join(target, "pass1"))).toHaveLength(281);
    await Promise.all(
      fixturePackage.fixtures.map(async (f) => {
        expect(new Uint8Array(await readFile(join(target, f.path)))).toEqual(f.bytes);
      }),
    );
    for (const [path, text] of Object.entries(fixturePackage.documents))
      expect(await readFile(join(target, path), "utf8")).toBe(text);
    expect(existsSync(join(target, "custodian/package-lock.json"))).toBe(false);
  } finally {
    random.mockRestore();
    await rm(parent, { recursive: true, force: true });
  }
});

it.each([false, true])(
  "refuses an existing temporary directory (contains file: %s)",
  async (containsFile) => {
    const parent = await mkdtemp(join(tmpdir(), "nd7c-existing-"));
    const target = join(parent, "package");
    try {
      await mkdir(target);
      if (containsFile) await writeFile(join(target, "sentinel.txt"), "unchanged", { flag: "wx" });
      await expect(materializeStage7ComparisonPackage(target, fixturePackage)).rejects.toThrow();
      expect(await readdir(target)).toEqual(containsFile ? ["sentinel.txt"] : []);
      if (containsFile)
        expect(await readFile(join(target, "sentinel.txt"), "utf8")).toBe("unchanged");
    } finally {
      await rm(parent, { recursive: true, force: true });
    }
  },
);

it("requires an explicit absolute destination and excludes repository src/docs", async () => {
  await expect(materializeStage7ComparisonPackage("relative", fixturePackage)).rejects.toThrow(
    "absolute",
  );
  for (const directory of ["src", "docs"]) {
    const target = join(process.cwd(), directory, "nd7c-forbidden-output");
    await expect(materializeStage7ComparisonPackage(target, fixturePackage)).rejects.toThrow(
      "src or docs",
    );
    expect(existsSync(target)).toBe(false);
  }
});
