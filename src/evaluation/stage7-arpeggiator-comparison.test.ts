// @vitest-environment node
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { parseMidi } from "midi-file";
import { beforeAll, expect, it, vi } from "vitest";
import * as generator from "../music-domain/arpeggiator-policy-generator";
import * as assembler from "./stage7-arpeggiator-midi-ir";
import * as serializer from "../midi/adapter";
import { STAGE7_GOLDEN_CASES } from "./stage7-arpeggiator-fixtures";
import {
  buildStage7ComparisonDesign,
  buildStage7ComparisonPackage,
  comparisonInventory,
  type ComparisonInputs,
  type ComparisonPackage,
  validateComparisonPackage,
} from "./stage7-arpeggiator-comparison";

const commit = "41d59f698e1bb37e76ddbeccb77c661768ed97aa";
const names = [
  "V1_R1_COMPARISON_PROTOCOL",
  "GOLDEN_CASES",
  "AUDITION_ARTIFACT",
  "LISTENING_SETUP",
  "V2_CALIBRATION",
];
const input: ComparisonInputs = {
  generatingCommit: commit,
  toolchain: { node: process.version, npm: "11.19.0" },
  sources: names.map((name) => {
    const path = `docs/reviews/STAGE7_ARPEGGIATOR_${name}.md`;
    return { path, commit, text: readFileSync(path, "utf8") };
  }),
};
let packageA: ComparisonPackage;
let packageB: ComparisonPackage;
beforeAll(() => {
  const random = vi.spyOn(Math, "random").mockImplementation(() => {
    throw Error("ambient randomness");
  });
  try {
    packageA = buildStage7ComparisonPackage(input, buildStage7ComparisonDesign(input));
    packageB = buildStage7ComparisonPackage(input, buildStage7ComparisonDesign(input));
  } finally {
    random.mockRestore();
  }
});
function doc(path: string) {
  return JSON.parse(packageA.documents[path]);
}
function hash(value: Uint8Array | string) {
  return createHash("sha256").update(value).digest("hex");
}

function forbiddenGeneration() {
  return [
    vi.spyOn(generator, "generateArpEventsWithPolicyV1").mockImplementation(() => {
      throw Error("unexpected V1 generation");
    }),
    vi.spyOn(generator, "generateArpEventsWithPolicyV2").mockImplementation(() => {
      throw Error("unexpected V2 generation");
    }),
    vi.spyOn(assembler, "assembleStage7ArpeggiatorMidiIr").mockImplementation(() => {
      throw Error("unexpected MIDI assembly");
    }),
    vi.spyOn(serializer, "serializeStandardMidiV1").mockImplementation(() => {
      throw Error("unexpected serialization");
    }),
  ];
}

it("constructs canonical design bytes/hash independently with no musical generation or MIDI", () => {
  const spies = forbiddenGeneration();
  try {
    const design = buildStage7ComparisonDesign(input);
    const replay = buildStage7ComparisonDesign(input);
    expect(design).toEqual(replay);
    expect(design.sha256).toBe(hash(design.bytes));
    const text = new TextDecoder().decode(design.bytes);
    expect(text).toBe(packageA.documents["custodian/design-inputs.json"]);
    expect(doc("custodian/manifest.json").designInputsSha256).toBe(design.sha256);
    expect(Object.keys(design)).toEqual(["bytes", "sha256"]);
    const parsed = JSON.parse(text);
    expect(parsed.units).toHaveLength(140);
    expect(parsed.panels).toHaveLength(49);
    expect(parsed.status).toBe("UNLOCKED");
    expect(parsed.generatingCommit).toBe(input.generatingCommit);
    expect(parsed.toolchain).toEqual(input.toolchain);
    expect(parsed.presentation).toEqual({
      fixtureSeed: 0,
      panelSeed: 1,
      roleSeed: 2,
      algorithm: "descending-fisher-yates-uint32-modulo",
    });
    expect(text).not.toMatch(/midiSha256|midiByteLength|"events"|"plan"/);
    for (const spy of spies) expect(spy).not.toHaveBeenCalled();
  } finally {
    for (const spy of spies) spy.mockRestore();
  }
});

it.each(["bytes", "hash", "rehashed altered design", "commit", "toolchain", "source"])(
  "rejects mismatched frozen design (%s) before all musical/MIDI calls",
  (kind) => {
    const design = buildStage7ComparisonDesign(input);
    let changedInput = input;
    let supplied = design;
    if (kind === "bytes") {
      const bytes = Uint8Array.from(design.bytes);
      bytes[0] ^= 1;
      supplied = { ...design, bytes };
    }
    if (kind === "hash") supplied = { ...design, sha256: "0".repeat(64) };
    if (kind === "rehashed altered design") {
      const value = JSON.parse(new TextDecoder().decode(design.bytes));
      value.units[0].rootSeed = 3;
      const bytes = new TextEncoder().encode(`${JSON.stringify(value, null, 2)}\n`);
      supplied = { bytes, sha256: hash(bytes) };
    }
    if (kind === "commit") changedInput = { ...input, generatingCommit: "a".repeat(40) };
    if (kind === "toolchain")
      changedInput = { ...input, toolchain: { ...input.toolchain, npm: "11.19.1" } };
    if (kind === "source")
      changedInput = {
        ...input,
        sources: input.sources.map((s, i) => (i === 0 ? { ...s, text: `${s.text}\n` } : s)),
      };
    const spies = forbiddenGeneration();
    try {
      expect(() => buildStage7ComparisonPackage(changedInput, supplied)).toThrow(
        "frozen design identity mismatch",
      );
      for (const spy of spies) expect(spy).not.toHaveBeenCalled();
    } finally {
      for (const spy of spies) spy.mockRestore();
    }
  },
);

it("independently binds all four reused golden records to accepted literal and source-table evidence", () => {
  const expected = [
    {
      id: "dark-synthwave-chorus-001",
      profileId: "dark-synthwave",
      templateId: "degree-0654-natural-minor-v1",
      scale: "natural-minor",
    },
    {
      id: "classic-synthwave-chorus-001",
      profileId: "classic-synthwave",
      templateId: "degree-0344-major-v1",
      scale: "major",
    },
    {
      id: "darkwave-verse-001",
      profileId: "darkwave",
      templateId: "degree-0654-natural-minor-v1",
      scale: "natural-minor",
    },
    {
      id: "cyberpunk-build-001",
      profileId: "midtempo-cyberpunk",
      templateId: "degree-0654-phrygian-v1",
      scale: "phrygian",
    },
  ];
  const source = input.sources.find((s) => s.path.endsWith("GOLDEN_CASES.md"))?.text ?? "";
  const table = source
    .split("## Fixed source context")[1]
    .split("## Deterministic reconstruction")[0];
  const documented = table
    .split(/\r?\n/)
    .filter((line) => line.startsWith("| `"))
    .map((line) => {
      const columns = line.split("|").map((c) => c.trim());
      const literal = (column: string) => column.match(/`([^`]+)`/)?.[1];
      return {
        id: literal(columns[1]),
        profileId: literal(columns[2]),
        templateId: literal(columns[4]),
        scale: columns[6].toLowerCase().replaceAll(" ", "-"),
      };
    });
  expect(documented).toEqual(expected);
  expect(STAGE7_GOLDEN_CASES).toEqual(expected);
  expect(
    JSON.parse(new TextDecoder().decode(buildStage7ComparisonDesign(input).bytes)).goldenCases,
  ).toEqual(expected);
});

it("records exactly 28 known V1 baseline-listening exposures without inferring R1 or NO exposure", () => {
  const records = doc("custodian/manifest.json").fixtures;
  const cases = [
    "dark-synthwave-chorus-001",
    "classic-synthwave-chorus-001",
    "darkwave-verse-001",
    "cyberpunk-build-001",
  ];
  const conditions = [
    [0, "medium", "medium"],
    [0, "very-low", "medium"],
    [0, "very-high", "medium"],
    [0, "medium", "very-low"],
    [0, "medium", "very-high"],
    [1, "medium", "medium"],
    [2, "medium", "medium"],
  ];
  const expected = cases
    .flatMap((id) =>
      conditions.map(([root, energy, complexity]) =>
        JSON.stringify([id, root, energy, complexity, "V1"]),
      ),
    )
    .sort();
  const yes = records.filter(
    (r: { priorExposure: { status: string } }) => r.priorExposure.status === "YES",
  );
  expect(yes).toHaveLength(28);
  expect(
    yes
      .map(
        (r: {
          goldenCase: { id: string };
          rootSeed: number;
          energy: string;
          complexity: string;
          lineage: string;
        }) => JSON.stringify([r.goldenCase.id, r.rootSeed, r.energy, r.complexity, r.lineage]),
      )
      .sort(),
  ).toEqual(expected);
  for (const r of records) {
    if (r.priorExposure.status === "YES")
      expect(r.priorExposure.explanation).toContain("STAGE7_ARPEGGIATOR_EVALUATION_RESULTS.md");
    else expect(r.priorExposure.status).toBe("UNKNOWN");
    if (r.lineage === "R1") expect(r.priorExposure.status).toBe("UNKNOWN");
  }
  const altered = JSON.parse(packageA.documents["custodian/manifest.json"]);
  altered.fixtures[0].priorExposure.status = "UNKNOWN";
  expect(() =>
    validateComparisonPackage({
      ...packageA,
      documents: {
        ...packageA.documents,
        "custodian/manifest.json": `${JSON.stringify(altered, null, 2)}\n`,
      },
    }),
  ).toThrow("document content/order");
});

// Independent literal uint32 recurrence; does not import production PRNG/shuffle/matrix.
function oracle(seed: number) {
  let state = seed;
  return <T>(source: T[]) => {
    const values = [...source];
    for (let i = values.length - 1; i > 0; i--) {
      state = (state + 0x6d2b79f5) >>> 0;
      let x = Math.imul(state ^ (state >>> 15), state | 1);
      x ^= x + Math.imul(x ^ (x >>> 7), x | 61);
      const j = ((x ^ (x >>> 14)) >>> 0) % (i + 1);
      [values[j], values[i]] = [values[i], values[j]];
    }
    return values;
  };
}

it("covers the exact canonical source matrix independently, retaining byte-identical records", () => {
  const fixtures = doc("custodian/manifest.json").fixtures;
  const expected: unknown[] = [];
  const profiles = ["dark-synthwave", "classic-synthwave", "darkwave", "midtempo-cyberpunk"];
  const levels = ["very-low", "low", "medium", "high", "very-high"];
  const main = levels
    .map((e) => [e, "medium"])
    .concat(levels.filter((c) => c !== "medium").map((c) => ["medium", c]));
  const extra = [
    ["low", "very-low"],
    ["low", "low"],
    ["low", "high"],
    ["high", "very-low"],
    ["high", "low"],
    ["high", "high"],
    ["very-high", "high"],
    ["very-high", "very-high"],
  ];
  const add = (group: string, profile: string, root: number, tuples: string[][]) => {
    for (const [e, c] of tuples)
      for (const lineage of ["V1", "R1"]) expected.push([group, profile, root, e, c, lineage]);
  };
  for (const p of profiles) for (const r of [0, 2048, 2049]) add("main", p, r, main);
  for (const r of [0, 2048, 2049]) add("extra", profiles[3], r, extra);
  for (const p of profiles) for (const r of [1, 2]) add("seed", p, r, [["medium", "medium"]]);
  expect(
    fixtures.map(
      (f: {
        group: string;
        goldenCase: { profileId: string };
        rootSeed: number;
        energy: string;
        complexity: string;
        lineage: string;
      }) => [f.group, f.goldenCase.profileId, f.rootSeed, f.energy, f.complexity, f.lineage],
    ),
  ).toEqual(expected);
  expect(fixtures).toHaveLength(280);
  expect(new Set(fixtures.map((f: { unitIndex: number }) => f.unitIndex)).size).toBe(140);
  expect(new Set(fixtures.map((f: { sourceKey: string }) => f.sourceKey)).size).toBe(280);
  expect(new Set(fixtures.map((f: { midiSha256: string }) => f.midiSha256)).size).toBeLessThan(280);
  for (const [group, count] of [
    ["main", 216],
    ["extra", 48],
    ["seed", 16],
  ] as const)
    expect(fixtures.filter((f: { group: string }) => f.group === group)).toHaveLength(count);
});

it("routes exactly 140 fixtures per build through each public version, without fallback", () => {
  const v1 = vi.spyOn(generator, "generateArpEventsWithPolicyV1");
  const v2 = vi.spyOn(generator, "generateArpEventsWithPolicyV2");
  buildStage7ComparisonPackage(input, buildStage7ComparisonDesign(input));
  expect(v1).toHaveBeenCalledTimes(140);
  expect(v2).toHaveBeenCalledTimes(140);
  for (const [spy, version] of [
    [v1, "v1"],
    [v2, "v2"],
  ] as const)
    for (const [request] of spy.mock.calls) {
      expect(request.profile.version).toBe(`nightdrive.genre-profile.arpeggiator.${version}`);
      expect(request.policy.version).toBe(`nightdrive.arpeggiator-policy.${version}`);
      expect(request.seedDerivation.version).toBe("nightdrive.seed-derivation.component.v1");
      expect(request.prng.version).toBe("nightdrive.prng.mulberry32.v1");
    }
});

it("locks all three independent permutations and continuous stratified A/B assignment", () => {
  const manifest = doc("custodian/manifest.json").fixtures;
  const presentation = doc("custodian/presentation.json");
  const fixtureOrder = oracle(0)(Array.from({ length: 280 }, (_, i) => i));
  expect(presentation.fixtures).toEqual(
    fixtureOrder.map((index, i) => ({
      label: `ND7C-${String(i + 1).padStart(3, "0")}`,
      sourceKey: manifest[index].sourceKey,
    })),
  );
  const stream = oracle(2);
  const roles = [
    ...stream([...Array(12).fill("V1"), ...Array(12).fill("R1")]),
    ...stream([...Array(11).fill("V1"), ...Array(10).fill("R1")]),
    ...stream(["V1", "V1", "R1", "R1"]),
  ];
  expect(presentation.panels.map((p: { canonicalIndex: number }) => p.canonicalIndex)).toEqual(
    oracle(1)(Array.from({ length: 49 }, (_, i) => i)),
  );
  presentation.panels.forEach(
    (p: { canonicalIndex: number; panelId: string; A: string; B: string }, i: number) => {
      expect(p.panelId).toBe(`ND7C-P${String(i + 1).padStart(3, "0")}`);
      expect(p.A).toBe(roles[p.canonicalIndex]);
      expect(p.B).toBe(p.A === "V1" ? "R1" : "V1");
    },
  );
  for (const [stratum, count, first] of [
    ["main", 24, 12],
    ["extra", 21, 11],
    ["seed", 4, 2],
  ] as const) {
    const panels = presentation.panels.filter((p: { stratum: string }) => p.stratum === stratum);
    expect(panels).toHaveLength(count);
    expect(panels.filter((p: { A: string }) => p.A === "V1")).toHaveLength(first);
  }
  expect(roles.filter((role) => role === "V1")).toHaveLength(25);
});

it("binds all 49 panel references to exact axes, roots and opposite-lineage source units", () => {
  const design = doc("custodian/design-inputs.json");
  const panels = design.panels;
  const levels = ["very-low", "low", "medium", "high", "very-high"];
  let i = 0;
  for (let p = 0; p < 4; p++)
    for (const root of [0, 2048, 2049])
      for (const axis of ["Energy", "Complexity"]) {
        const panel = panels[i++];
        expect(panel.caseIndex).toBe(p);
        expect(panel.axis).toBe(axis);
        expect(panel.units.map((n: number) => design.units[n])).toEqual(
          levels.map((level) => ({
            group: "main",
            caseIndex: p,
            rootSeed: root,
            energy: axis === "Energy" ? level : "medium",
            complexity: axis === "Complexity" ? level : "medium",
          })),
        );
      }
  const pairs = [
    [
      ["low", "very-low"],
      ["medium", "very-low"],
    ],
    [
      ["low", "low"],
      ["medium", "low"],
    ],
    [
      ["low", "high"],
      ["medium", "high"],
    ],
    [
      ["low", "very-low"],
      ["low", "low"],
    ],
    [
      ["high", "very-low"],
      ["high", "low"],
    ],
    [
      ["high", "medium"],
      ["high", "high"],
    ],
    [
      ["very-high", "high"],
      ["very-high", "very-high"],
    ],
  ];
  for (const root of [0, 2048, 2049])
    pairs.forEach((pair, index) => {
      const panel = panels[i++];
      expect(panel.regression).toBe(`X${index + 1}`);
      expect(
        panel.units.map((n: number) => [design.units[n].energy, design.units[n].complexity]),
      ).toEqual(pair);
      for (const n of panel.units) {
        expect(design.units[n].caseIndex).toBe(3);
        expect(design.units[n].rootSeed).toBe(root);
      }
    });
  for (let p = 0; p < 4; p++) {
    const panel = panels[i++];
    expect(panel.caseIndex).toBe(p);
    expect(
      panel.units.map((n: number) => [
        design.units[n].rootSeed,
        design.units[n].energy,
        design.units[n].complexity,
      ]),
    ).toEqual([0, 1, 2].map((r) => [r, "medium", "medium"]));
  }
  const fixtures = doc("custodian/manifest.json").fixtures;
  for (const panel of doc("pass2/grouping.json").panels)
    for (const entry of panel.entries) {
      const a = fixtures.find((f: { midiFilename: string }) => f.midiFilename === entry.A);
      const b = fixtures.find((f: { midiFilename: string }) => f.midiFilename === entry.B);
      expect(a.unitIndex).toBe(b.unitIndex);
      expect(a.lineage).not.toBe(b.lineage);
      expect([a.energy, a.complexity, a.rootSeed]).toEqual([
        entry.energy,
        entry.complexity,
        entry.rootSeed,
      ]);
    }
});

it("replays every byte/JSON and preserves generic MIDI, chord matching and exact Arp mapping", () => {
  expect(packageA).toEqual(packageB);
  const records = doc("custodian/manifest.json").fixtures;
  for (let i = 0; i < 280; i++) {
    const fixture = packageA.fixtures[i];
    const record = records[i];
    expect(hash(fixture.bytes)).toBe(record.midiSha256);
    expect(fixture.bytes.length).toBe(record.midiByteLength);
    const midi = parseMidi(fixture.bytes);
    expect(midi.header).toMatchObject({ format: 1, numTracks: 3, ticksPerBeat: 960 });
    expect(midi.tracks.map((t) => t.find((e) => e.type === "trackName"))).toMatchObject([
      { text: "Conductor" },
      { text: "Chords" },
      { text: "Arp" },
    ]);
    if (i % 2 === 1)
      expect(midi.tracks.slice(0, 2)).toEqual(
        parseMidi(packageA.fixtures[i - 1].bytes).tracks.slice(0, 2),
      );
    const notes: unknown[] = [];
    const endings: unknown[] = [];
    let tick = 0;
    for (const event of midi.tracks[2]) {
      tick += event.deltaTime;
      if (event.type === "noteOn")
        notes.push([tick, event.noteNumber, event.velocity, event.channel]);
      if (event.type === "noteOff") endings.push([tick, event.noteNumber, event.channel]);
      expect(["trackName", "noteOn", "noteOff", "endOfTrack"]).toContain(event.type);
    }
    expect(tick).toBe(30720);
    expect(notes).toEqual(
      record.events.map((e: { startTick: number; pitch: number }) => [
        e.startTick,
        e.pitch,
        100,
        2,
      ]),
    );
    expect(endings).toEqual(
      record.events.map((e: { startTick: number; durationTicks: number; pitch: number }) => [
        e.startTick + e.durationTicks,
        e.pitch,
        2,
      ]),
    );
    expect(midi.tracks[0]).toEqual([
      { deltaTime: 0, meta: true, type: "trackName", text: "Conductor" },
      {
        deltaTime: 0,
        meta: true,
        type: "timeSignature",
        numerator: 4,
        denominator: 4,
        metronome: 24,
        thirtyseconds: 8,
      },
      { deltaTime: 0, meta: true, type: "setTempo", microsecondsPerBeat: 500000 },
      { deltaTime: 30720, meta: true, type: "endOfTrack" },
    ]);
    const chordNotes: unknown[] = [];
    let chordTick = 0;
    let slotTick = 0;
    for (const e of midi.tracks[1]) {
      chordTick += e.deltaTime;
      if (e.type === "noteOn") chordNotes.push([chordTick, e.noteNumber, e.channel, e.velocity]);
    }
    const expectedChords = record.progression.slots.flatMap(
      (slot: { bars: number; voicing: { midiPitches: number[] } }) => {
        const values = slot.voicing.midiPitches.map((pitch) => [slotTick, pitch, 0, 100]);
        slotTick += slot.bars * 3840;
        return values;
      },
    );
    expect(chordNotes).toEqual(expectedChords);
    for (const track of midi.tracks)
      for (const e of track)
        expect([
          "programChange",
          "sysEx",
          "text",
          "copyrightNotice",
          "instrumentName",
        ]).not.toContain(e.type);
  }
  for (const value of Object.values(packageA.documents)) {
    expect(value.endsWith("\n")).toBe(true);
    expect(value).not.toContain("\r");
    expect(value.charCodeAt(0)).not.toBe(0xfeff);
  }
});

it("keeps blind metadata strictly allowlisted and Pass 2 separate", () => {
  const blind = doc("pass1/blind-manifest.json");
  expect(Object.keys(blind)).toEqual(["fixtureCount", "fixtures"]);
  expect(blind.fixtureCount).toBe(280);
  blind.fixtures.forEach(
    (f: { label: string; filename: string; byteLength: number }, i: number) => {
      expect(Object.keys(f)).toEqual(["label", "filename", "byteLength"]);
      expect(f.label).toBe(`ND7C-${String(i + 1).padStart(3, "0")}`);
      expect(f.filename).toBe(`${f.label}.mid`);
      expect(f.byteLength).toBeGreaterThan(0);
    },
  );
  expect(packageA.documents["pass1/blind-manifest.json"]).not.toMatch(
    /V1|R1|profile|source|sha256|seed|panel|version/,
  );
  expect(packageA.documents["pass2/grouping.json"]).not.toMatch(/"V1"|"R1"|sha256|policy|version/);
});

it("recomputes R1, binds sources and labels retained evidence without fabricated fresh success", () => {
  const evidence = doc("custodian/deterministic-evidence.json");
  const calibration = JSON.parse(
    input.sources[4].text.match(/```json\s*\r?\n([\s\S]*?)\r?\n```/)?.[1] ?? "null",
  );
  expect(evidence.fresh.r1SourceAndRuntimeSha256).toBe(hash(JSON.stringify(calibration)));
  expect(evidence.fresh.r1SourceAndRuntimeSha256).toBe(
    "b6f7ee16f33cf649ae2c6f06e4b5eecf859409b1917e2bc641323857fc1956e8",
  );
  expect(evidence.sources).toEqual(
    input.sources.map(({ path, commit, text }) => ({ path, commit, sha256: hash(text) })),
  );
  expect(evidence.retained[0].sourceCommit).toBe("6631da6dd2d601032fe8f6aa27bf654960b1e4ac");
  expect(evidence.retained[0].applicability).toContain("Not executed by this builder");
  expect(evidence.musicalAcceptance).toBe(false);
  expect(evidence.fresh).toMatchObject({
    candidateLists: 500,
    mediumSourceRows: 40,
    mediumLists: 20,
    darkwaveEnergyLists: 25,
  });
  expect(evidence.retained[0].midtempoAdjacentEvents.regressions).toHaveLength(9);
  expect(evidence.retained[0].context.rootsInclusive).toEqual([1024, 2047]);
  expect(() =>
    buildStage7ComparisonPackage(
      {
        ...input,
        sources: input.sources.map((s, i) => (i === 4 ? { ...s, text: "```json\n[]\n```" } : s)),
      },
      buildStage7ComparisonDesign(input),
    ),
  ).toThrow("fingerprint");
});

it("hashes exact ordinal path/hash lines and excludes a lock from its own inventory", () => {
  const entries = [
    { path: "pass1/z.mid", bytes: new Uint8Array([1]) },
    { path: "pass1/A.mid", bytes: new Uint8Array([2]) },
  ];
  const result = comparisonInventory(entries, "custodian/package-lock.json");
  expect(result.sha256).toBe(
    hash(`pass1/A.mid\t${hash(entries[1].bytes)}\npass1/z.mid\t${hash(entries[0].bytes)}\n`),
  );
  expect(() => comparisonInventory(entries, entries[0].path)).toThrow("self-referencing");
  expect(() => comparisonInventory([...entries, entries[0]], "custodian/lock.json")).toThrow();
  expect(() =>
    comparisonInventory([{ ...entries[0], path: "../escape" }], "custodian/lock.json"),
  ).toThrow();
});
