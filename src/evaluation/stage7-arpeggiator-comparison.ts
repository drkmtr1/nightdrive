import { createHash } from "node:crypto";
import { createArpRange } from "../music-domain/arpeggiator";
import {
  ARP_POLICY_VERSION_V1,
  ARP_POLICY_VERSION_V2,
  ARP_PROFILE_DATA_VERSION_V1,
  ARP_PROFILE_DATA_VERSION_V2,
  COMPONENT_SEED_DERIVATION_VERSION_V1,
  generateArpEventsWithPolicyV1,
  generateArpEventsWithPolicyV2,
} from "../music-domain/arpeggiator-policy-generator";
import {
  ARP_GENRE_PROFILE_CONFIGURATION_V1,
  ARP_GENRE_PROFILE_CONFIGURATION_V2,
  buildArpWeightedCandidatesV1,
  buildArpWeightedCandidatesV2,
} from "../music-domain/arpeggiator-profile-configuration";
import type { ComplexityV1, EnergyV1 } from "../music-domain/composition-intent";
import { getHarmonyTemplate, realizeHarmonyProgression } from "../music-domain/harmony";
import { createKey } from "../music-domain/key";
import { createPitchClass } from "../music-domain/pitch";
import { createMulberry32State, nextMulberry32, PRNG_ALGORITHM_ID } from "../music-domain/prng";
import { serializeStandardMidiV1 } from "../midi/adapter";
import { STAGE7_GOLDEN_CASES } from "./stage7-arpeggiator-fixtures";
import { assembleStage7ArpeggiatorMidiIr } from "./stage7-arpeggiator-midi-ir";

export const COMPARISON_PROTOCOL = "nightdrive.stage7-arpeggiator-v1-r1-comparison.v1";
const R1_HASH = "b6f7ee16f33cf649ae2c6f06e4b5eecf859409b1917e2bc641323857fc1956e8";
const levels = ["very-low", "low", "medium", "high", "very-high"] as const;
const roots = [0, 2048, 2049] as const;
type Lineage = "V1" | "R1";
type Tuple = readonly [EnergyV1, ComplexityV1];
const main: readonly Tuple[] = [
  ["very-low", "medium"],
  ["low", "medium"],
  ["medium", "medium"],
  ["high", "medium"],
  ["very-high", "medium"],
  ["medium", "very-low"],
  ["medium", "low"],
  ["medium", "high"],
  ["medium", "very-high"],
];
const extra: readonly Tuple[] = [
  ["low", "very-low"],
  ["low", "low"],
  ["low", "high"],
  ["high", "very-low"],
  ["high", "low"],
  ["high", "high"],
  ["very-high", "high"],
  ["very-high", "very-high"],
];

/** Caller-supplied custody facts, not assertions that an artifact or lock was accepted. */
export type ComparisonInputs = Readonly<{
  generatingCommit: string;
  toolchain: Readonly<{ node: string; npm: string }>;
  sources: readonly Readonly<{ path: string; commit: string; text: string }>[];
}>;

const sourcePaths = [
  "docs/reviews/STAGE7_ARPEGGIATOR_V1_R1_COMPARISON_PROTOCOL.md",
  "docs/reviews/STAGE7_ARPEGGIATOR_GOLDEN_CASES.md",
  "docs/reviews/STAGE7_ARPEGGIATOR_AUDITION_ARTIFACT.md",
  "docs/reviews/STAGE7_ARPEGGIATOR_LISTENING_SETUP.md",
  "docs/reviews/STAGE7_ARPEGGIATOR_V2_CALIBRATION.md",
] as const;

export function comparisonSha256(bytes: string | Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}

function json(value: unknown): string {
  return `${JSON.stringify(value, null, 2)}\n`;
}
function requireValue(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`Comparison preflight: ${message}`);
}

function checkInputs(input: ComparisonInputs): ComparisonInputs {
  requireValue(/^[0-9a-f]{40}$/.test(input.generatingCommit), "generating commit");
  requireValue(/^v?\d+\.\d+\.\d+$/.test(input.toolchain.node), "Node version");
  requireValue(/^\d+\.\d+\.\d+$/.test(input.toolchain.npm), "npm version");
  requireValue(input.sources.length === sourcePaths.length, "source inventory");
  const sources = sourcePaths.map((path) => {
    const matches = input.sources.filter((source) => source.path === path);
    requireValue(matches.length === 1, `source ${path}`);
    const source = matches[0];
    requireValue(/^[0-9a-f]{40}$/.test(source.commit), "source commit");
    requireValue(typeof source.text === "string" && source.text.length > 0, "source text");
    return { path, commit: source.commit, text: source.text };
  });
  const calibration = sources[4].text.match(/```json\s*\r?\n([\s\S]*?)\r?\n```/);
  requireValue(calibration, "calibration JSON");
  const hash = comparisonSha256(JSON.stringify(JSON.parse(calibration[1])));
  requireValue(hash === R1_HASH, "accepted R1 source fingerprint");
  const runtime = ARP_GENRE_PROFILE_CONFIGURATION_V2.profiles.map((profile) => ({
    profileId: profile.profileId,
    slots: profile.decisionSlots.map((slot) => ({
      slot: slot.slot,
      candidates: slot.candidates,
      energy: slot.energyWeights.map((row) => row.values),
      complexity: slot.complexityAdditions.map((row) => row.values),
    })),
  }));
  requireValue(comparisonSha256(JSON.stringify(runtime)) === hash, "runtime R1 fingerprint");
  return {
    generatingCommit: input.generatingCommit,
    toolchain: { node: input.toolchain.node, npm: input.toolchain.npm },
    sources,
  };
}

// Presentation-only stream; never shared with the public musical operations.
function shuffler(seed: number) {
  let state = createMulberry32State(seed);
  return <T>(values: readonly T[]): T[] => {
    const result = [...values];
    for (let i = result.length - 1; i > 0; i--) {
      const draw = nextMulberry32(state);
      state = draw.state;
      const j = draw.value % (i + 1);
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  };
}

function candidateEvidence() {
  let candidateLists = 0;
  let mediumSourceRows = 0;
  let mediumLists = 0;
  let darkwaveEnergyLists = 0;
  for (const profile of ARP_GENRE_PROFILE_CONFIGURATION_V2.profiles) {
    const original = ARP_GENRE_PROFILE_CONFIGURATION_V1.profiles.find(
      (p) => p.profileId === profile.profileId,
    );
    requireValue(original, "V1 profile anchor");
    for (const slot of profile.decisionSlots) {
      const oldSlot = original.decisionSlots.find((s) => s.slot === slot.slot);
      requireValue(oldSlot, "V1 slot anchor");
      for (const rows of ["energyWeights", "complexityAdditions"] as const) {
        requireValue(
          json(slot[rows][2]) === json(oldSlot[rows][2]),
          "medium source row preservation",
        );
        mediumSourceRows++;
      }
      for (const [e, energy] of levels.entries())
        for (const [c, complexity] of levels.entries()) {
          const actual = buildArpWeightedCandidatesV2(
            ARP_GENRE_PROFILE_CONFIGURATION_V2,
            profile.profileId,
            slot.slot,
            energy,
            complexity,
          );
          const expected = slot.candidates.map((value, i) => ({
            value,
            weight: slot.energyWeights[e].values[i] + slot.complexityAdditions[c].values[i],
          }));
          requireValue(json(actual) === json(expected), "exact R1 candidate list");
          candidateLists++;
          if (energy === "medium" && complexity === "medium") {
            requireValue(
              json(actual) ===
                json(
                  buildArpWeightedCandidatesV1(
                    ARP_GENRE_PROFILE_CONFIGURATION_V1,
                    profile.profileId,
                    slot.slot,
                    energy,
                    complexity,
                  ),
                ),
              "medium list preservation",
            );
            mediumLists++;
          }
          if (profile.profileId === "darkwave" && complexity === "medium") {
            requireValue(
              json(actual) ===
                json(
                  buildArpWeightedCandidatesV1(
                    ARP_GENRE_PROFILE_CONFIGURATION_V1,
                    profile.profileId,
                    slot.slot,
                    energy,
                    complexity,
                  ),
                ),
              "Darkwave Energy preservation",
            );
            darkwaveEnergyLists++;
          }
        }
    }
  }
  return { candidateLists, mediumSourceRows, mediumLists, darkwaveEnergyLists };
}

function design() {
  type Unit = {
    group: "main" | "extra" | "seed";
    caseIndex: number;
    rootSeed: number;
    energy: EnergyV1;
    complexity: ComplexityV1;
  };
  const units: Unit[] = [];
  const add = (
    group: Unit["group"],
    caseIndex: number,
    rootSeed: number,
    tuples: readonly Tuple[],
  ) => {
    for (const [energy, complexity] of tuples)
      units.push({ group, caseIndex, rootSeed, energy, complexity });
  };
  for (let p = 0; p < 4; p++) for (const root of roots) add("main", p, root, main);
  for (const root of roots) add("extra", 3, root, extra);
  for (let p = 0; p < 4; p++)
    for (const root of [1, 2]) add("seed", p, root, [["medium", "medium"]]);
  const find = (p: number, root: number, energy: EnergyV1, complexity: ComplexityV1) => {
    const index = units.findIndex(
      (u) =>
        u.caseIndex === p &&
        u.rootSeed === root &&
        u.energy === energy &&
        u.complexity === complexity,
    );
    requireValue(index >= 0, "panel source reference");
    return index;
  };
  type Panel = {
    stratum: "main" | "extra" | "seed";
    caseIndex: number;
    axis: string;
    regression: string | null;
    units: number[];
  };
  const panels: Panel[] = [];
  for (let p = 0; p < 4; p++)
    for (const root of roots)
      for (const axis of ["Energy", "Complexity"]) {
        panels.push({
          stratum: "main",
          caseIndex: p,
          axis,
          regression: null,
          units: levels.map((level) =>
            find(
              p,
              root,
              axis === "Energy" ? level : "medium",
              axis === "Complexity" ? level : "medium",
            ),
          ),
        });
      }
  const regressions: readonly { axis: string; tuples: readonly Tuple[] }[] = [
    {
      axis: "Energy",
      tuples: [
        ["low", "very-low"],
        ["medium", "very-low"],
      ],
    },
    {
      axis: "Energy",
      tuples: [
        ["low", "low"],
        ["medium", "low"],
      ],
    },
    {
      axis: "Energy",
      tuples: [
        ["low", "high"],
        ["medium", "high"],
      ],
    },
    {
      axis: "Complexity",
      tuples: [
        ["low", "very-low"],
        ["low", "low"],
      ],
    },
    {
      axis: "Complexity",
      tuples: [
        ["high", "very-low"],
        ["high", "low"],
      ],
    },
    {
      axis: "Complexity",
      tuples: [
        ["high", "medium"],
        ["high", "high"],
      ],
    },
    {
      axis: "Complexity",
      tuples: [
        ["very-high", "high"],
        ["very-high", "very-high"],
      ],
    },
  ];
  for (const root of roots)
    regressions.forEach((r, i) => {
      panels.push({
        stratum: "extra",
        caseIndex: 3,
        axis: r.axis,
        regression: `X${i + 1}`,
        units: r.tuples.map(([e, c]) => find(3, root, e, c)),
      });
    });
  for (let p = 0; p < 4; p++)
    panels.push({
      stratum: "seed",
      caseIndex: p,
      axis: "Seed",
      regression: null,
      units: [0, 1, 2].map((root) => find(p, root, "medium", "medium")),
    });
  return { units, panels };
}

export type ComparisonPackage = Readonly<{
  inputs: ComparisonInputs;
  design: ComparisonDesign;
  documents: Readonly<Record<string, string>>;
  fixtures: readonly Readonly<{ path: string; bytes: Uint8Array }>[];
}>;

export type ComparisonDesign = Readonly<{ bytes: Uint8Array; sha256: string }>;

/** Canonical UTF-8 input bytes only; no musical generation, MIDI, fixture bytes, or IO. Not a lock. */
export function buildStage7ComparisonDesign(rawInput: ComparisonInputs): ComparisonDesign {
  const inputs = checkInputs(rawInput);
  const { units, panels } = design();
  const sourceRefs = inputs.sources.map(({ path, commit, text }) => ({
    path,
    commit,
    sha256: comparisonSha256(text),
  }));
  // Input-only identity exists before output generation. This is NOT an accepted design lock.
  const designJson = json({
    protocol: COMPARISON_PROTOCOL,
    status: "UNLOCKED",
    generatingCommit: inputs.generatingCommit,
    toolchain: inputs.toolchain,
    sources: sourceRefs,
    goldenCases: STAGE7_GOLDEN_CASES,
    units,
    panels,
    versions: {
      V1: [ARP_PROFILE_DATA_VERSION_V1, ARP_POLICY_VERSION_V1],
      R1: [ARP_PROFILE_DATA_VERSION_V2, ARP_POLICY_VERSION_V2],
      seedDerivation: COMPONENT_SEED_DERIVATION_VERSION_V1,
      prng: PRNG_ALGORITHM_ID,
    },
    presentation: {
      fixtureSeed: 0,
      panelSeed: 1,
      roleSeed: 2,
      algorithm: "descending-fisher-yates-uint32-modulo",
    },
    setup: {
      fstSha256: "baf5d3d8aea2084c252c47a72ffd9239ebf35bfbbd32818bc0faf1993dcca1de",
      flpSha256: "77b8fd4417acb12069e3a1ded3f369b5ec37038af2d0841d7f0f1bba84d1d9ab",
      filesVerified: false,
    },
    responseProtocol: sourceRefs[0],
    listeningAuthorized: false,
  });
  return Object.freeze({
    bytes: new TextEncoder().encode(designJson),
    sha256: comparisonSha256(designJson),
  });
}

/** Tooling only. The supplied design must match reconstruction before any musical generation. */
export function buildStage7ComparisonPackage(
  rawInput: ComparisonInputs,
  frozenDesign: ComparisonDesign,
): ComparisonPackage {
  const inputs = checkInputs(rawInput);
  const reconstructed = buildStage7ComparisonDesign(inputs);
  requireValue(
    frozenDesign?.bytes instanceof Uint8Array &&
      frozenDesign.sha256 === reconstructed.sha256 &&
      comparisonSha256(frozenDesign.bytes) === frozenDesign.sha256 &&
      frozenDesign.bytes.length === reconstructed.bytes.length &&
      frozenDesign.bytes.every((byte, index) => byte === reconstructed.bytes[index]),
    "frozen design identity mismatch",
  );
  const boundDesign = Object.freeze({
    bytes: Uint8Array.from(reconstructed.bytes),
    sha256: reconstructed.sha256,
  });
  const designJson = new TextDecoder().decode(boundDesign.bytes);
  const candidates = candidateEvidence();
  const { units, panels } = design();
  const fixtureOrder = shuffler(0)(Array.from({ length: 280 }, (_, i) => i));
  const labels = new Map(
    fixtureOrder.map((index, i) => [index, `ND7C-${String(i + 1).padStart(3, "0")}`]),
  );
  const roleShuffle = shuffler(2);
  const aRoles = [
    [12, 12],
    [11, 10],
    [2, 2],
  ].flatMap(([v1, r1]) =>
    roleShuffle<Lineage>([...Array<Lineage>(v1).fill("V1"), ...Array<Lineage>(r1).fill("R1")]),
  );
  const presentedPanels = shuffler(1)(
    panels.map((panel, i) => ({
      ...panel,
      canonicalIndex: i,
      A: aRoles[i],
      B: aRoles[i] === "V1" ? ("R1" as const) : ("V1" as const),
    })),
  ).map((panel, i) => ({
    panelId: `ND7C-P${String(i + 1).padStart(3, "0")}`,
    ...panel,
  }));
  const sourceRefs = inputs.sources.map(({ path, commit, text }) => ({
    path,
    commit,
    sha256: comparisonSha256(text),
  }));
  const range = createArpRange({ minMidiPitch: 0, maxMidiPitch: 127 });
  const contexts = STAGE7_GOLDEN_CASES.map((source) => {
    const template = getHarmonyTemplate(source.templateId);
    requireValue(template.scale === source.scale, "golden scale");
    return realizeHarmonyProgression(
      source.profileId,
      template,
      createKey(createPitchClass(0), template.scale),
    );
  });
  const fixtures: { path: string; bytes: Uint8Array }[] = [];
  const records = units.flatMap((unit, unitIndex) =>
    (["V1", "R1"] as const).map((lineage, versionIndex) => {
      const source = STAGE7_GOLDEN_CASES[unit.caseIndex];
      const profileVersion =
        lineage === "V1" ? ARP_PROFILE_DATA_VERSION_V1 : ARP_PROFILE_DATA_VERSION_V2;
      const policyVersion = lineage === "V1" ? ARP_POLICY_VERSION_V1 : ARP_POLICY_VERSION_V2;
      const request = {
        progression: contexts[unit.caseIndex],
        range,
        intent: { energy: unit.energy, complexity: unit.complexity },
        profile: { id: source.profileId, version: profileVersion },
        policy: { version: policyVersion },
        seedDerivation: { version: COMPONENT_SEED_DERIVATION_VERSION_V1 },
        prng: { version: PRNG_ALGORITHM_ID },
        rootSeed: unit.rootSeed,
      };
      const result =
        lineage === "V1"
          ? generateArpEventsWithPolicyV1({
              ...request,
              profile: { id: source.profileId, version: ARP_PROFILE_DATA_VERSION_V1 },
              policy: { version: ARP_POLICY_VERSION_V1 },
            })
          : generateArpEventsWithPolicyV2({
              ...request,
              profile: { id: source.profileId, version: ARP_PROFILE_DATA_VERSION_V2 },
              policy: { version: ARP_POLICY_VERSION_V2 },
            });
      const bytes = serializeStandardMidiV1(
        assembleStage7ArpeggiatorMidiIr(request.progression, result.events),
      );
      const label = labels.get(unitIndex * 2 + versionIndex);
      requireValue(label, "fixture label");
      const path = `pass1/${label}.mid`;
      fixtures.push({ path, bytes });
      const baselineListened =
        lineage === "V1" &&
        ((unit.rootSeed === 0 &&
          ((unit.complexity === "medium" &&
            ["very-low", "medium", "very-high"].includes(unit.energy)) ||
            (unit.energy === "medium" && ["very-low", "very-high"].includes(unit.complexity)))) ||
          ([1, 2].includes(unit.rootSeed) &&
            unit.energy === "medium" &&
            unit.complexity === "medium"));
      return {
        sourceKey: [
          COMPARISON_PROTOCOL,
          source.id,
          unit.energy,
          unit.complexity,
          String(unit.rootSeed),
          lineage,
        ].join("/"),
        unitIndex,
        ...unit,
        lineage,
        goldenCase: source,
        progression: request.progression,
        range,
        profileVersion,
        policyVersion,
        seedDerivation: COMPONENT_SEED_DERIVATION_VERSION_V1,
        prng: PRNG_ALGORITHM_ID,
        plan: result.plan,
        events: result.events,
        label,
        midiFilename: `${label}.mid`,
        midiByteLength: bytes.length,
        midiSha256: comparisonSha256(bytes),
        priorExposure: {
          status: baselineListened ? "YES" : "UNKNOWN",
          explanation: baselineListened
            ? "Known V1 baseline-listening exposure: one of the seven conditions per profile in the accepted Stage 7 baseline evaluation; see docs/reviews/STAGE7_ARPEGGIATOR_EVALUATION_RESULTS.md and the comparison protocol's Frozen roots and intent matrix."
            : "Evaluator exposure is not established for this lineage/condition by the accepted baseline evidence; research inspection is not listening exposure. No NO/pristine-exposure claim.",
        },
      };
    }),
  );
  const grouping = presentedPanels.map((panel) => ({
    panelId: panel.panelId,
    profileCase: STAGE7_GOLDEN_CASES[panel.caseIndex].id,
    axis: panel.axis,
    entries: panel.units.map((index) => ({
      energy: units[index].energy,
      complexity: units[index].complexity,
      rootSeed: units[index].rootSeed,
      A: `${labels.get(index * 2 + (panel.A === "V1" ? 0 : 1))}.mid`,
      B: `${labels.get(index * 2 + (panel.B === "V1" ? 0 : 1))}.mid`,
    })),
  }));
  const documents = {
    "custodian/design-inputs.json": designJson,
    "custodian/manifest.json": json({
      protocol: COMPARISON_PROTOCOL,
      designInputsSha256: comparisonSha256(designJson),
      fixtureCount: 280,
      pairCount: 140,
      panelCount: 49,
      fixtures: records,
    }),
    "custodian/presentation.json": json({
      protocol: COMPARISON_PROTOCOL,
      streams: { algorithm: PRNG_ALGORITHM_ID, fixture: 0, panel: 1, roles: 2 },
      fixtures: fixtureOrder.map((index) => ({
        label: labels.get(index),
        sourceKey: records[index].sourceKey,
      })),
      panels: presentedPanels,
    }),
    "pass1/blind-manifest.json": json({
      fixtureCount: 280,
      fixtures: fixtureOrder.map((index) => ({
        label: records[index].label,
        filename: records[index].midiFilename,
        byteLength: records[index].midiByteLength,
      })),
    }),
    "pass2/grouping.json": json({ panelCount: 49, panels: grouping }),
    "custodian/deterministic-evidence.json": json({
      protocol: COMPARISON_PROTOCOL,
      generatingCommit: inputs.generatingCommit,
      toolchain: inputs.toolchain,
      sources: sourceRefs,
      fresh: {
        ...candidates,
        r1SourceAndRuntimeSha256: R1_HASH,
        fixtureCount: records.length,
        pairCount: units.length,
        panelCount: panels.length,
      },
      retained: [
        {
          sourceCommit: "6631da6dd2d601032fe8f6aa27bf654960b1e4ac",
          source: "src/evaluation/stage7-r1-diagnostics.test.ts",
          applicability:
            "Exact unchanged R1 fingerprint; 500 lists, 40 medium rows, 20 medium/medium and 25 Darkwave Energy lists, collision denominators and nine regressions. Historical search/finalist/no-retuning chronology NOT reproduced. Not executed by this builder.",
          context: {
            goldenCases: STAGE7_GOLDEN_CASES,
            range: [0, 127],
            rootsInclusive: [1024, 2047],
            denominator: 1024,
            equality: "All five plan fields; ordered pitch/startTick/durationTicks events",
            endpointProfile: "midtempo-cyberpunk",
            endpointTupleOrder: [
              "very-low vs medium",
              "medium vs very-high",
              "very-low vs very-high",
              "all three",
            ],
          },
          endpointCollisions: {
            energyPlansAndEvents: { V1: [176, 252, 122, 35], R1: [166, 158, 107, 15] },
            complexityPlans: { V1: [127, 60, 72, 9], R1: [33, 58, 41, 2] },
            complexityEvents: { V1: [129, 73, 81, 13], R1: [39, 66, 49, 4] },
          },
          midtempoAdjacentEvents: {
            relationships: 40,
            denominator: 40960,
            V1: 9972,
            R1: 4929,
            improved: 28,
            tied: 3,
            regressed: 9,
            regressions: [
              { axis: "Energy", fixed: "very-low", levels: ["low", "medium"], V1: 166, R1: 180 },
              { axis: "Energy", fixed: "low", levels: ["low", "medium"], V1: 170, R1: 194 },
              { axis: "Energy", fixed: "high", levels: ["low", "medium"], V1: 167, R1: 182 },
              { axis: "Complexity", fixed: "low", levels: ["very-low", "low"], V1: 40, R1: 46 },
              { axis: "Complexity", fixed: "medium", levels: ["medium", "high"], V1: 53, R1: 61 },
              {
                axis: "Complexity",
                fixed: "medium",
                levels: ["high", "very-high"],
                V1: 60,
                R1: 61,
              },
              { axis: "Complexity", fixed: "high", levels: ["very-low", "low"], V1: 55, R1: 56 },
              { axis: "Complexity", fixed: "high", levels: ["medium", "high"], V1: 59, R1: 71 },
              {
                axis: "Complexity",
                fixed: "very-high",
                levels: ["high", "very-high"],
                V1: 76,
                R1: 80,
              },
            ],
          },
          darkwaveComplexityEvents: { V1: 66, R1: 70, denominator: 1024 },
          historicalV1ProjectionCollapses: {
            count: 5,
            rootsInclusive: [0, 255],
            explanation:
              "Different plans can yield equal ordered events under accepted masking/projection; not a runtime defect.",
          },
        },
      ],
      limitationsSource: sourceRefs[0],
      packageReview: "REQUIRED",
      setupFileVerification: "REQUIRED",
      replayAndMidiConformanceEvidence:
        "Requires tests at generating commit; not claimed by construction",
      musicalAcceptance: false,
    }),
  };
  return { inputs, design: boundDesign, documents, fixtures };
}

/** Exact-byte inventory for a future lock; the lock itself MUST NOT be an entry. */
export function comparisonInventory(
  entries: readonly Readonly<{ path: string; bytes: Uint8Array }>[],
  lockPath: string,
) {
  const seen = new Set<string>();
  const inventory = entries
    .map(({ path, bytes }) => {
      requireValue(
        /^[a-zA-Z0-9_-]+\/[a-zA-Z0-9_.-]+$/.test(path) && !path.includes(".."),
        "safe relative path",
      );
      requireValue(path !== lockPath && !seen.has(path), "duplicate/self-referencing inventory");
      seen.add(path);
      return { path, byteLength: bytes.length, sha256: comparisonSha256(bytes) };
    })
    .sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0));
  return {
    inventory,
    sha256: comparisonSha256(inventory.map((item) => `${item.path}\t${item.sha256}\n`).join("")),
  };
}

/** Rebuild from bound inputs to reject forged mappings, metadata, bytes, and custody leakage. */
export function validateComparisonPackage(candidate: ComparisonPackage) {
  const expected = buildStage7ComparisonPackage(candidate.inputs, candidate.design);
  requireValue(json(candidate.documents) === json(expected.documents), "document content/order");
  requireValue(candidate.fixtures.length === expected.fixtures.length, "fixture inventory");
  const snapshots = candidate.fixtures.map((fixture, index) => {
    const wanted = expected.fixtures[index];
    requireValue(
      fixture.path === wanted.path && fixture.bytes instanceof Uint8Array,
      "fixture path/type",
    );
    const bytes = Uint8Array.from(fixture.bytes);
    requireValue(
      bytes.length === wanted.bytes.length &&
        comparisonSha256(bytes) === comparisonSha256(wanted.bytes),
      "current MIDI bytes/hash/length",
    );
    return { path: fixture.path, bytes };
  });
  return [
    ...Object.entries(expected.documents).map(([path, text]) => ({
      path,
      bytes: new TextEncoder().encode(text),
    })),
    ...snapshots,
  ];
}
