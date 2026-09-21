import { createHash } from "node:crypto";

import {
  getStage7Ac004HarmonySnapshot,
  type Stage7Ac004HarmonySnapshot,
} from "./stage7-ac004-harmony-snapshots";

export type Stage7Ac004ReferenceVersion = "v1" | "v2";
export type Stage7Ac004ReferenceRequest = Readonly<{
  sourceRecordId: string;
  version: Stage7Ac004ReferenceVersion;
  energy: "very-low" | "low" | "medium" | "high" | "very-high";
  complexity: "very-low" | "low" | "medium" | "high" | "very-high";
  rootSeed: number;
  range?: Readonly<{ minMidiPitch: number; maxMidiPitch: number }>;
}>;

export type Stage7Ac004ReferenceVector = Readonly<{
  sourceRecordId: string;
  version: Stage7Ac004ReferenceVersion;
  rootSeed: number;
  plan: Readonly<{
    rate: string;
    direction: string;
    gateTicks: number;
    octaveRange: number;
    maskId: string;
  }>;
  events: readonly Readonly<{ pitch: number; startTick: number; durationTicks: number }>[];
  harmonyJson: string;
  arpeggiatorJson: string;
  aggregateHashInputJson: string;
  aggregateJson: string;
  harmonySha256: string;
  arpeggiatorSha256: string;
  resultHash: string;
  byteLengths: Readonly<{ harmony: number; arpeggiator: number; aggregate: number }>;
}>;

type Slot = Readonly<{
  candidates: readonly string[];
  energy: readonly (readonly number[])[];
  complexity: readonly (readonly number[])[];
}>;

const LEVELS = ["very-low", "low", "medium", "high", "very-high"] as const;
export const STAGE7_AC004_REFERENCE_RATE_TICKS = Object.freeze({
  quarter: 960,
  eighth: 480,
  sixteenth: 240,
});
const RATE_TICKS: Readonly<Record<string, number>> = STAGE7_AC004_REFERENCE_RATE_TICKS;
export const STAGE7_AC004_REFERENCE_GATE_TICKS = Object.freeze({
  quarter: { short: 480, medium: 720, long: 960 },
  eighth: { short: 240, medium: 360, long: 480 },
  sixteenth: { short: 120, medium: 180, long: 240 },
});
const GATE_TICKS: Readonly<Record<string, Readonly<Record<string, number>>>> =
  STAGE7_AC004_REFERENCE_GATE_TICKS;
const MASKS: Record<string, readonly ("on" | "rest")[]> = {
  full: ["on", "on", "on", "on"],
  "three-of-four": ["on", "on", "rest", "on"],
  "one-of-four": ["on", "rest", "rest", "rest"],
  "alternating-on-rest": ["on", "rest", "on", "rest"],
  "alternating-rest-on": ["rest", "on", "rest", "on"],
};

function rows(...values: readonly (readonly number[])[]): readonly (readonly number[])[] {
  return values;
}
function slot(
  candidates: readonly string[],
  energy: readonly (readonly number[])[],
  complexity: readonly (readonly number[])[],
): Slot {
  return { candidates, energy, complexity };
}

// These are copied, reviewed literals from the accepted profile-policy contract.
const PROFILE_SLOTS: Record<string, readonly Slot[]> = {
  "dark-synthwave": [
    slot(
      ["eighth", "sixteenth"],
      rows([5, 1], [4, 2], [3, 5], [2, 6], [1, 7]),
      rows([0, 0], [0, 0], [0, 0], [0, 0], [0, 0]),
    ),
    slot(
      ["1", "2"],
      rows([2, 5], [2, 5], [2, 5], [2, 5], [2, 5]),
      rows([2, 0], [1, 0], [0, 0], [0, 1], [0, 2]),
    ),
    slot(
      ["down-up", "down", "up-down"],
      rows([6, 4, 1], [6, 4, 1], [6, 4, 1], [6, 4, 1], [6, 4, 1]),
      rows([0, 1, 0], [0, 0, 0], [0, 0, 0], [1, 0, 1], [2, 0, 2]),
    ),
    slot(
      ["three-of-four", "full"],
      rows([6, 2], [5, 3], [4, 5], [3, 6], [2, 7]),
      rows([0, 0], [0, 0], [0, 0], [0, 0], [0, 0]),
    ),
    slot(
      ["short", "medium"],
      rows([2, 6], [3, 5], [4, 4], [5, 3], [6, 2]),
      rows([0, 0], [0, 0], [0, 0], [0, 0], [0, 0]),
    ),
  ],
  "classic-synthwave": [
    slot(
      ["eighth", "sixteenth"],
      rows([5, 1], [4, 2], [3, 5], [2, 6], [1, 7]),
      rows([0, 0], [0, 0], [0, 0], [0, 0], [0, 0]),
    ),
    slot(
      ["1", "2"],
      rows([5, 2], [4, 3], [3, 5], [2, 6], [1, 7]),
      rows([0, 0], [0, 0], [0, 0], [0, 0], [0, 0]),
    ),
    slot(
      ["up", "up-down", "down-up"],
      rows([6, 3, 1], [6, 3, 1], [6, 3, 1], [6, 3, 1], [6, 3, 1]),
      rows([2, 0, 0], [1, 0, 0], [0, 1, 0], [0, 2, 1], [0, 3, 2]),
    ),
    slot(
      ["three-of-four", "full"],
      rows([6, 2], [5, 3], [3, 6], [2, 7], [1, 8]),
      rows([0, 0], [0, 0], [0, 0], [0, 0], [0, 0]),
    ),
    slot(
      ["short", "medium"],
      rows([2, 6], [3, 5], [4, 5], [5, 4], [6, 3]),
      rows([0, 0], [0, 0], [0, 0], [0, 0], [0, 0]),
    ),
  ],
  darkwave: [
    slot(
      ["quarter", "eighth"],
      rows([6, 2], [5, 3], [3, 6], [2, 7], [1, 8]),
      rows([0, 0], [0, 0], [0, 0], [0, 0], [0, 0]),
    ),
    slot(
      ["1", "2"],
      rows([7, 1], [7, 1], [7, 1], [7, 1], [7, 1]),
      rows([1, 0], [0, 0], [0, 1], [0, 2], [0, 3]),
    ),
    slot(
      ["up", "down", "up-down"],
      rows([7, 5, 1], [7, 5, 1], [7, 5, 1], [7, 5, 1], [7, 5, 1]),
      rows([1, 0, 0], [0, 1, 0], [0, 0, 1], [0, 0, 2], [0, 0, 3]),
    ),
    slot(
      ["one-of-four", "alternating-on-rest", "alternating-rest-on"],
      rows([7, 2, 1], [6, 3, 2], [4, 6, 3], [3, 7, 4], [2, 8, 5]),
      rows([2, 1, 0], [1, 1, 0], [0, 1, 1], [0, 1, 2], [0, 1, 3]),
    ),
    slot(
      ["medium", "long"],
      rows([2, 7], [3, 6], [4, 5], [6, 3], [7, 2]),
      rows([0, 0], [0, 0], [0, 0], [0, 0], [0, 0]),
    ),
  ],
  "midtempo-cyberpunk": [
    slot(
      ["eighth", "sixteenth"],
      rows([5, 2], [4, 3], [4, 4], [3, 5], [2, 6]),
      rows([0, 0], [0, 0], [0, 0], [0, 0], [0, 0]),
    ),
    slot(
      ["1", "2"],
      rows([4, 4], [4, 4], [4, 4], [4, 4], [4, 4]),
      rows([2, 0], [1, 0], [0, 0], [0, 1], [0, 2]),
    ),
    slot(
      ["down-up", "up-down", "down", "up"],
      rows([5, 5, 2, 2], [5, 5, 2, 2], [5, 5, 2, 2], [5, 5, 2, 2], [5, 5, 2, 2]),
      rows([0, 0, 1, 1], [0, 0, 1, 0], [1, 1, 0, 0], [2, 2, 0, 0], [3, 3, 0, 0]),
    ),
    slot(
      ["three-of-four", "alternating-on-rest", "alternating-rest-on"],
      rows([2, 5, 4], [3, 5, 4], [5, 5, 5], [7, 4, 5], [8, 3, 5]),
      rows([2, 1, 0], [1, 1, 0], [0, 1, 1], [0, 1, 2], [0, 1, 3]),
    ),
    slot(["short"], rows([1], [1], [1], [1], [1]), rows([0], [0], [0], [0], [0])),
  ],
};

const PROFILE_V2_OVERRIDES: Record<string, readonly Slot[]> = {
  "dark-synthwave": [
    slot(
      ["eighth", "sixteenth"],
      rows([5, 1], [4, 2], [3, 5], [2, 6], [1, 7]),
      rows([0, 0], [0, 0], [0, 0], [0, 0], [0, 0]),
    ),
    slot(
      ["1", "2"],
      rows([2, 5], [2, 5], [2, 5], [2, 5], [2, 5]),
      rows([6, 0], [3, 0], [0, 0], [0, 2], [0, 4]),
    ),
    slot(
      ["down-up", "down", "up-down"],
      rows([6, 4, 1], [6, 4, 1], [6, 4, 1], [6, 4, 1], [6, 4, 1]),
      rows([0, 2, 1], [0, 1, 1], [0, 0, 0], [1, 0, 4], [2, 0, 8]),
    ),
    slot(
      ["three-of-four", "full"],
      rows([9, 2], [7, 4], [4, 5], [3, 4], [1, 3]),
      rows([0, 0], [0, 0], [0, 0], [0, 0], [0, 0]),
    ),
    slot(
      ["short", "medium"],
      rows([4, 7], [4, 6], [4, 4], [5, 3], [6, 1]),
      rows([0, 0], [0, 0], [0, 0], [0, 0], [0, 0]),
    ),
  ],
  "classic-synthwave": [
    slot(
      ["eighth", "sixteenth"],
      rows([5, 1], [4, 1], [3, 5], [2, 5], [1, 7]),
      rows([0, 0], [0, 0], [0, 0], [0, 0], [0, 0]),
    ),
    slot(
      ["1", "2"],
      rows([5, 2], [4, 3], [3, 5], [2, 6], [2, 7]),
      rows([6, 0], [0, 0], [0, 0], [0, 0], [1, 4]),
    ),
    slot(
      ["up", "up-down", "down-up"],
      rows([6, 3, 1], [6, 3, 1], [6, 3, 1], [6, 3, 1], [6, 3, 1]),
      rows([2, 1, 0], [1, 1, 0], [0, 1, 0], [0, 5, 5], [2, 6, 9]),
    ),
    slot(
      ["three-of-four", "full"],
      rows([6, 2], [5, 2], [3, 6], [2, 7], [1, 8]),
      rows([0, 0], [0, 0], [0, 0], [0, 0], [0, 0]),
    ),
    slot(
      ["short", "medium"],
      rows([5, 9], [5, 7], [4, 5], [5, 6], [6, 3]),
      rows([0, 0], [0, 0], [0, 0], [0, 0], [0, 0]),
    ),
  ],
  darkwave: [
    slot(
      ["quarter", "eighth"],
      rows([6, 2], [5, 3], [3, 6], [2, 7], [1, 8]),
      rows([0, 0], [0, 0], [0, 0], [0, 0], [0, 0]),
    ),
    slot(
      ["1", "2"],
      rows([7, 1], [7, 1], [7, 1], [7, 1], [7, 1]),
      rows([1, 0], [1, 1], [0, 1], [0, 2], [0, 3]),
    ),
    slot(
      ["up", "down", "up-down"],
      rows([7, 5, 1], [7, 5, 1], [7, 5, 1], [7, 5, 1], [7, 5, 1]),
      rows([7, 0, 1], [4, 0, 1], [0, 0, 1], [0, 0, 2], [0, 0, 3]),
    ),
    slot(
      ["one-of-four", "alternating-on-rest", "alternating-rest-on"],
      rows([7, 2, 1], [6, 3, 2], [4, 6, 3], [3, 7, 4], [2, 8, 5]),
      rows([2, 1, 0], [1, 1, 0], [0, 1, 1], [0, 1, 2], [0, 1, 3]),
    ),
    slot(
      ["medium", "long"],
      rows([2, 7], [3, 6], [4, 5], [6, 3], [7, 2]),
      rows([0, 0], [0, 0], [0, 0], [0, 0], [0, 0]),
    ),
  ],
  "midtempo-cyberpunk": [
    slot(
      ["eighth", "sixteenth"],
      rows([8, 2], [7, 6], [4, 4], [4, 7], [2, 5]),
      rows([0, 0], [0, 0], [0, 0], [0, 0], [0, 0]),
    ),
    slot(
      ["1", "2"],
      rows([4, 4], [4, 4], [4, 4], [4, 4], [4, 4]),
      rows([2, 0], [1, 0], [0, 0], [0, 1], [0, 5]),
    ),
    slot(
      ["down-up", "up-down", "down", "up"],
      rows([5, 5, 2, 2], [5, 5, 2, 2], [5, 5, 2, 2], [5, 5, 2, 2], [5, 5, 2, 2]),
      rows([0, 0, 3, 6], [1, 0, 1, 3], [1, 1, 0, 0], [4, 4, 0, 1], [3, 3, 0, 0]),
    ),
    slot(
      ["three-of-four", "alternating-on-rest", "alternating-rest-on"],
      rows([3, 5, 4], [4, 5, 5], [5, 5, 5], [9, 6, 6], [8, 5, 5]),
      rows([2, 1, 0], [0, 0, 0], [0, 1, 1], [0, 1, 2], [0, 1, 3]),
    ),
    slot(["short"], rows([1], [1], [1], [1], [1]), rows([0], [0], [0], [0], [0])),
  ],
};

function sha256(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}
export function qualifyStage7Ac004Sha256(): Readonly<{ empty: string; utf8: string }> {
  const utf8 = new TextEncoder().encode("Nightdrive ♫");
  return { empty: sha256(new Uint8Array()), utf8: sha256(utf8) };
}

function murmur(bytes: Uint8Array): number {
  const c1 = 0xcc9e2d51;
  const c2 = 0x1b873593;
  const rot = (v: number, n: number) => ((v << n) | (v >>> (32 - n))) >>> 0;
  const mix = (v: number) => Math.imul(rot(Math.imul(v, c1) >>> 0, 15), c2) >>> 0;
  let h = 0;
  const full = bytes.length - (bytes.length % 4);
  for (let i = 0; i < full; i += 4) {
    const b = (bytes[i] | (bytes[i + 1] << 8) | (bytes[i + 2] << 16) | (bytes[i + 3] << 24)) >>> 0;
    h = (h ^ mix(b)) >>> 0;
    h = (Math.imul(rot(h, 13), 5) + 0xe6546b64) >>> 0;
  }
  let tail = 0;
  for (let i = bytes.length - 1; i >= full; i -= 1) tail ^= bytes[i] << ((i - full) * 8);
  if (tail !== 0) h = (h ^ mix(tail >>> 0)) >>> 0;
  h ^= bytes.length;
  h ^= h >>> 16;
  h = Math.imul(h, 0x85ebca6b) >>> 0;
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35) >>> 0;
  return (h ^ (h >>> 16)) >>> 0;
}

function componentSeed(rootSeed: number): number {
  const tag = new TextEncoder().encode("nightdrive.seed-derivation.component.v1");
  const component = new TextEncoder().encode("arpeggiator");
  const bytes = new Uint8Array(tag.length + 1 + 4 + 1 + component.length);
  bytes.set(tag);
  bytes[tag.length] = 0;
  bytes[tag.length + 1] = rootSeed & 255;
  bytes[tag.length + 2] = (rootSeed >>> 8) & 255;
  bytes[tag.length + 3] = (rootSeed >>> 16) & 255;
  bytes[tag.length + 4] = (rootSeed >>> 24) & 255;
  bytes[tag.length + 5] = component.length;
  bytes.set(component, tag.length + 6);
  return murmur(bytes);
}
export function deriveStage7Ac004ComponentSeed(rootSeed: number): number {
  return componentSeed(rootSeed);
}

function next(state: number): readonly [number, number] {
  state = (state + 0x6d2b79f5) >>> 0;
  let t = state;
  t = Math.imul(t ^ (t >>> 15), t | 1) >>> 0;
  t = (t ^ ((t + Math.imul(t ^ (t >>> 7), t | 61)) >>> 0)) >>> 0;
  return [state, (t ^ (t >>> 14)) >>> 0];
}
export function advanceStage7Ac004Mulberry32(state: number): readonly [number, number] {
  return next(state);
}
function choose(value: number, candidates: readonly string[], weights: readonly number[]): string {
  const total = weights.reduce((a, b) => a + b, 0);
  let cursor = value % total;
  for (let i = 0; i < candidates.length; i += 1) {
    cursor -= weights[i] ?? 0;
    if (cursor < 0) return candidates[i] as string;
  }
  throw new Error("reference weighted choice invariant failed");
}
export function selectStage7Ac004Weighted(
  value: number,
  candidates: readonly string[],
  weights: readonly number[],
): string {
  return choose(value, candidates, weights);
}
function directionCycle(length: number, direction: string): readonly number[] {
  const up = Array.from({ length }, (_, i) => i);
  const down = [...up].reverse();
  if (direction === "up") return up;
  if (direction === "down") return down;
  const turn =
    direction === "up-down"
      ? [...up, ...up.slice(1, -1).reverse()]
      : [...down, ...down.slice(1, -1).reverse()];
  return turn;
}

function canonicalHarmony(snapshot: Stage7Ac004HarmonySnapshot): CanonicalHarmony {
  return {
    profile: snapshot.profile,
    templateId: snapshot.templateId,
    templateVersion: snapshot.templateVersion,
    key: { tonic: snapshot.key.tonic, scale: snapshot.key.scale },
    slots: snapshot.slots.map((slot) => ({
      index: slot.index,
      degree: slot.degree,
      bars: slot.bars,
      chord: { root: slot.chord.root, quality: slot.chord.quality },
      inversion: slot.inversion,
      voicing: { midiPitches: [...slot.voicing.midiPitches] },
    })),
  };
}
type CanonicalHarmony = Readonly<{
  profile: string;
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
type CanonicalSection = Readonly<{
  ppq: 960;
  barCount: 8;
  timeSignature: Readonly<{ numerator: 4; denominator: 4 }>;
  tempo: Readonly<{ microsecondsPerQuarter: 500000 }>;
}>;
function harmonyWireValue(harmony: CanonicalHarmony): unknown {
  return {
    profile: harmony.profile,
    templateId: harmony.templateId,
    templateVersion: harmony.templateVersion,
    key: {
      schema: "nightdrive.key.v1",
      tonicSemitoneClass: harmony.key.tonic,
      scale: harmony.key.scale,
    },
    slots: harmony.slots.map((slot) => ({
      index: slot.index,
      degree: slot.degree,
      bars: slot.bars,
      chord: {
        schema: "nightdrive.chord.v1",
        rootSemitoneClass: slot.chord.root,
        quality: slot.chord.quality,
      },
      inversion: { schema: "nightdrive.chord-inversion.v1", memberIndex: slot.inversion },
      voicing: {
        schema: "nightdrive.chord-voicing.v1",
        midiPitches: [...slot.voicing.midiPitches],
      },
    })),
  };
}
function sectionWireValue(section: CanonicalSection): unknown {
  return {
    ppq: section.ppq,
    barCount: section.barCount,
    timeSignature: { schema: "nightdrive.time-signature.v1", numerator: 4, denominator: 4 },
    tempo: {
      schema: "nightdrive.tempo.v1",
      microsecondsPerQuarter: section.tempo.microsecondsPerQuarter,
    },
  };
}
function bytes(json: string): Uint8Array {
  return new TextEncoder().encode(json);
}

function deriveEvents(snapshot: Stage7Ac004HarmonySnapshot, request: Stage7Ac004ReferenceRequest) {
  const slots = (request.version === "v2" ? PROFILE_V2_OVERRIDES : PROFILE_SLOTS)[snapshot.profile];
  if (!slots) throw new Error(`Unknown reference profile: ${snapshot.profile}`);
  const levels = [request.energy, request.complexity].map((v) => LEVELS.indexOf(v));
  if (levels.some((v) => v < 0)) throw new Error("invalid reference intent");
  let state = componentSeed(request.rootSeed);
  const selected: string[] = [];
  for (let i = 0; i < slots.length; i += 1) {
    const current = slots[i] as Slot;
    const energy = current.energy[levels[0] as number] as readonly number[];
    const complexity = current.complexity[levels[1] as number] as readonly number[];
    const weights = energy.map((weight, index) => weight + (complexity[index] ?? 0));
    const step = next(state);
    state = step[0] as number;
    selected[i] = choose(step[1] as number, current.candidates, weights);
  }
  const rate = selected[0] as string;
  const octaveRange = Number(selected[1]);
  const direction = selected[2] as string;
  const mask = selected[3] as string;
  const gate = selected[4] as string;
  const gateTicks = GATE_TICKS[rate]?.[gate] as number;
  const range = request.range ?? { minMidiPitch: 0, maxMidiPitch: 127 };
  const events: { pitch: number; startTick: number; durationTicks: number }[] = [];
  let slotStart = 0;
  for (const source of snapshot.slots) {
    const candidates = [
      ...new Set(
        source.voicing.midiPitches.flatMap((pitch) =>
          Array.from({ length: octaveRange }, (_, octave) => pitch + octave * 12).filter(
            (p) => p >= range.minMidiPitch && p <= range.maxMidiPitch && p <= 127,
          ),
        ),
      ),
    ].sort((a, b) => a - b);
    if (candidates.length === 0)
      throw new Error(`no legal reference pitch in ${snapshot.sourceRecordId}`);
    const cycle = directionCycle(candidates.length, direction);
    const rateTicks = RATE_TICKS[rate] as number;
    const slotEnd = slotStart + source.bars * 3840;
    for (let tick = slotStart, step = 0; tick < slotEnd; tick += rateTicks, step += 1) {
      if ((MASKS[mask] as readonly string[])[step % 4] === "on")
        events.push({
          pitch: candidates[cycle[step % cycle.length] as number] as number,
          startTick: tick,
          durationTicks: gateTicks,
        });
    }
    slotStart = slotEnd;
  }
  return { selected: { rate, direction, gateTicks, octaveRange, maskId: mask }, events };
}

export function deriveStage7Ac004ReferenceVector(
  request: Stage7Ac004ReferenceRequest,
): Stage7Ac004ReferenceVector {
  if (
    !Number.isSafeInteger(request.rootSeed) ||
    request.rootSeed < 0 ||
    request.rootSeed > 0xffffffff
  )
    throw new RangeError("rootSeed must be uint32");
  const snapshot = getStage7Ac004HarmonySnapshot(request.sourceRecordId);
  const derived = deriveEvents(snapshot, request);
  const harmony = canonicalHarmony(snapshot);
  const section: CanonicalSection = {
    ppq: 960,
    barCount: 8,
    timeSignature: { numerator: 4, denominator: 4 },
    tempo: { microsecondsPerQuarter: 500000 },
  };
  const profileVersion =
    request.version === "v1"
      ? "nightdrive.genre-profile.arpeggiator.v1"
      : "nightdrive.genre-profile.arpeggiator.v2";
  const policyVersion =
    request.version === "v1"
      ? "nightdrive.arpeggiator-policy.v1"
      : "nightdrive.arpeggiator-policy.v2";
  const arp = derived.events;
  const provenance = {
    profile: { id: snapshot.profile, version: profileVersion },
    policy: { version: policyVersion },
    seedDerivation: { version: "nightdrive.seed-derivation.component.v1" },
    prng: { version: "nightdrive.prng.mulberry32.v1" },
    rootSeed: request.rootSeed,
    normalizedInputs: {
      intent: { energy: request.energy, complexity: request.complexity },
      range: request.range ?? { minMidiPitch: 0, maxMidiPitch: 127 },
    },
    parent: null,
  };
  const sectionWire = sectionWireValue(section);
  const harmonyWire = harmonyWireValue(harmony);
  const harmonyJson = JSON.stringify({
    schema: "nightdrive.stage7-harmony-component.v1",
    section: sectionWire,
    harmony: harmonyWire,
  });
  const arpeggiatorJson = JSON.stringify({
    schema: "nightdrive.stage7-arpeggiator-component.v1",
    section: sectionWire,
    events: arp,
  });
  const componentHashes = {
    harmony: sha256(bytes(harmonyJson)),
    arpeggiator: sha256(bytes(arpeggiatorJson)),
  };
  const aggregateBase = {
    schema: "nightdrive.stage7-arpeggiator-aggregate.v1",
    engineVersion: "nightdrive.engine.stage7-aggregate.v1",
    generatorVersion: "nightdrive.generator.stage7-arpeggiator.v1",
    section: sectionWire,
    components: { harmony: harmonyWire, arpeggiator: arp },
    provenance,
    componentHashes,
    warnings: [],
  };
  const aggregateHashInputJson = JSON.stringify(aggregateBase);
  const resultHash = sha256(bytes(aggregateHashInputJson));
  const aggregateJson = JSON.stringify({ ...aggregateBase, resultHash });
  return Object.freeze({
    sourceRecordId: request.sourceRecordId,
    version: request.version,
    rootSeed: request.rootSeed,
    plan: Object.freeze(derived.selected),
    events: Object.freeze(arp.map((event) => Object.freeze(event))),
    harmonyJson,
    arpeggiatorJson,
    aggregateHashInputJson,
    aggregateJson,
    harmonySha256: componentHashes.harmony,
    arpeggiatorSha256: componentHashes.arpeggiator,
    resultHash,
    byteLengths: {
      harmony: bytes(harmonyJson).byteLength,
      arpeggiator: bytes(arpeggiatorJson).byteLength,
      aggregate: bytes(aggregateJson).byteLength,
    },
  });
}
