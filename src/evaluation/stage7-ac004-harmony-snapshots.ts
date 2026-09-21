import type { HarmonyProfileId } from "../music-domain/harmony";

export type Stage7Ac004HarmonySnapshot = Readonly<{
  sourceRecordId: string;
  profile: HarmonyProfileId;
  templateId: string;
  templateVersion: "v1";
  key: Readonly<{ tonic: number; scale: string }>;
  slots: readonly Readonly<{
    index: number;
    degree: number;
    bars: number;
    chord: Readonly<{ root: number; quality: string }>;
    inversion: number;
    voicing: Readonly<{ midiPitches: readonly number[] }>;
  }>[];
}>;

function deepFreeze<T>(value: T): T {
  if (typeof value !== "object" || value === null || Object.isFrozen(value)) return value;
  for (const key of Reflect.ownKeys(value)) deepFreeze(Reflect.get(value, key));
  return Object.freeze(value);
}

const SNAPSHOT_SOURCE = [
  {
    sourceRecordId: "dark-synthwave-chorus-001",
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
  },
  {
    sourceRecordId: "classic-synthwave-chorus-001",
    profile: "classic-synthwave",
    templateId: "degree-0344-major-v1",
    templateVersion: "v1",
    key: { tonic: 0, scale: "major" },
    slots: [
      {
        index: 0,
        degree: 0,
        bars: 2,
        chord: { root: 0, quality: "major-triad" },
        inversion: 0,
        voicing: { midiPitches: [48, 52, 55] },
      },
      {
        index: 1,
        degree: 3,
        bars: 2,
        chord: { root: 5, quality: "major-triad" },
        inversion: 2,
        voicing: { midiPitches: [48, 53, 57] },
      },
      {
        index: 2,
        degree: 4,
        bars: 2,
        chord: { root: 7, quality: "major-triad" },
        inversion: 1,
        voicing: { midiPitches: [47, 50, 55] },
      },
      {
        index: 3,
        degree: 0,
        bars: 2,
        chord: { root: 0, quality: "major-triad" },
        inversion: 0,
        voicing: { midiPitches: [48, 52, 55] },
      },
    ],
  },
  {
    sourceRecordId: "darkwave-verse-001",
    profile: "darkwave",
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
        inversion: 0,
        voicing: { midiPitches: [34, 38, 41] },
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
        inversion: 1,
        voicing: { midiPitches: [35, 38, 43] },
      },
    ],
  },
  {
    sourceRecordId: "cyberpunk-build-001",
    profile: "midtempo-cyberpunk",
    templateId: "degree-0654-phrygian-v1",
    templateVersion: "v1",
    key: { tonic: 0, scale: "phrygian" },
    slots: [
      {
        index: 0,
        degree: 0,
        bars: 2,
        chord: { root: 0, quality: "minor-triad" },
        inversion: 1,
        voicing: { midiPitches: [39, 43, 48] },
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
        inversion: 2,
        voicing: { midiPitches: [39, 44, 48] },
      },
      {
        index: 3,
        degree: 4,
        bars: 2,
        chord: { root: 7, quality: "minor-triad" },
        inversion: 2,
        voicing: { midiPitches: [38, 43, 46] },
      },
    ],
  },
] as const satisfies readonly Stage7Ac004HarmonySnapshot[];

export const STAGE7_AC004_HARMONY_SNAPSHOTS: readonly Stage7Ac004HarmonySnapshot[] =
  deepFreeze(SNAPSHOT_SOURCE);

const SNAPSHOT_BY_ID = new Map(
  STAGE7_AC004_HARMONY_SNAPSHOTS.map((snapshot) => [snapshot.sourceRecordId, snapshot]),
);

export function getStage7Ac004HarmonySnapshot(sourceRecordId: string): Stage7Ac004HarmonySnapshot {
  const snapshot = SNAPSHOT_BY_ID.get(sourceRecordId);
  if (snapshot === undefined)
    throw new RangeError(`Unknown Stage 7 AC-004 source: ${sourceRecordId}`);
  return snapshot;
}
