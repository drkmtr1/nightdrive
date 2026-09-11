import { createChord, type Chord } from "./chord";
import { createChordQuality, CHORD_QUALITIES, type ChordQuality } from "./chord-quality";
import { createKey, pitchClassAtKeyDegree, type Key } from "./key";
import {
  createChordVoicing,
  isChordVoicingCompatibleWithChord,
  isChordVoicingCompatibleWithChordInversion,
  type ChordVoicing,
} from "./chord-voicing";
import { createChordInversion, type ChordInversion } from "./chord-inversion";
import { createMidiPitch } from "./pitch";
import {
  createScaleDegree,
  createScaleType,
  SCALE_TYPES,
  type ScaleDegree,
  type ScaleType,
} from "./scale";

export const HARMONY_TEMPLATE_SCHEMA = "nightdrive.harmony-template.v1" as const;
export type HarmonyTemplateSlot = Readonly<{
  degree: ScaleDegree;
  quality: ChordQuality;
  bars: number;
}>;
export type HarmonyTemplate = Readonly<{
  schema: typeof HARMONY_TEMPLATE_SCHEMA;
  id: string;
  version: "v1";
  scale: ScaleType;
  slots: readonly HarmonyTemplateSlot[];
}>;

export const HARMONY_PROFILE_IDS = {
  darkSynthwave: "dark-synthwave",
  classicSynthwave: "classic-synthwave",
  darkwave: "darkwave",
  midtempoCyberpunk: "midtempo-cyberpunk",
} as const;
export type HarmonyProfileId = (typeof HARMONY_PROFILE_IDS)[keyof typeof HARMONY_PROFILE_IDS];

export const HARMONY_ERROR_CODES = {
  unsupportedTemplate: "UNSUPPORTED_TEMPLATE",
  scaleMismatch: "HARMONY_SCALE_MISMATCH",
  unknownTemplate: "UNKNOWN_HARMONY_TEMPLATE",
  unknownProfile: "UNKNOWN_HARMONY_PROFILE",
  noInversion: "NO_INVERSION",
  noVoicing: "NO_VOICING",
  noCandidate: "NO_CANDIDATE",
} as const;
export type HarmonyErrorCode = (typeof HARMONY_ERROR_CODES)[keyof typeof HARMONY_ERROR_CODES];
export class HarmonyTemplateValueError extends RangeError {
  readonly code: HarmonyErrorCode;
  readonly field: string;
  constructor(code: HarmonyErrorCode, field: string, message: string) {
    super(message);
    this.name = "HarmonyTemplateValueError";
    this.code = code;
    this.field = field;
  }
}

export type HarmonyVoicingPolicy = Readonly<{
  minMidiPitch: number;
  maxMidiPitch: number;
  maxSpan: number;
}>;
export type ChordVoicingCandidate = Readonly<{
  inversion: ChordInversion;
  voicing: ChordVoicing;
}>;
export type VoiceLedCandidateSelection = Readonly<{
  candidate: ChordVoicingCandidate;
  cost: number;
}>;

function fail(
  field: string,
  message: string,
  code: HarmonyErrorCode = HARMONY_ERROR_CODES.unsupportedTemplate,
): never {
  throw new HarmonyTemplateValueError(code, field, message);
}

const KNOWN_TEMPLATE_IDS = new Set([
  "degree-0344-major-v1",
  "degree-0344-natural-minor-v1",
  "degree-0344-harmonic-minor-v1",
  "degree-0344-melodic-minor-v1",
  "degree-0344-dorian-v1",
  "degree-0344-phrygian-v1",
  "degree-0654-major-v1",
  "degree-0654-natural-minor-v1",
  "degree-0654-harmonic-minor-v1",
  "degree-0654-melodic-minor-v1",
  "degree-0654-dorian-v1",
  "degree-0654-phrygian-v1",
  "degree-0340-major-v1",
  "degree-0340-natural-minor-v1",
  "degree-0340-harmonic-minor-v1",
  "degree-0340-melodic-minor-v1",
  "degree-0340-dorian-v1",
  "degree-0340-phrygian-v1",
]);

function createHarmonyTemplateStructure(value: unknown): HarmonyTemplate {
  if (typeof value !== "object" || value === null || Array.isArray(value))
    return fail("template", "template must be an object.");
  const input = value as Record<string, unknown>;
  if (input.schema !== HARMONY_TEMPLATE_SCHEMA)
    return fail("schema", "unsupported template schema.");
  if (typeof input.id !== "string" || input.id.trim() === "")
    return fail("id", "id must be non-empty.");
  if (!KNOWN_TEMPLATE_IDS.has(input.id)) return fail("id", "unknown harmony template ID.");
  if (input.version !== "v1") return fail("version", "unsupported template version.");
  let scale: ScaleType;
  try {
    scale = createScaleType(input.scale);
  } catch {
    return fail("scale", "unsupported scale context.");
  }
  if (!Array.isArray(input.slots) || input.slots.length === 0)
    return fail("slots", "slots must be non-empty.");
  const slots: HarmonyTemplateSlot[] = [];
  let totalBars = 0;
  for (let index = 0; index < input.slots.length; index += 1) {
    if (!Object.hasOwn(input.slots, index))
      return fail(`slots[${index}]`, "slots must not be sparse.");
    const raw = input.slots[index];
    if (typeof raw !== "object" || raw === null || Array.isArray(raw))
      return fail(`slots[${index}]`, "slot must be an object.");
    const slot = raw as Record<string, unknown>;
    let degree: ScaleDegree;
    let quality: ChordQuality;
    try {
      degree = createScaleDegree(slot.degree as number);
      quality = createChordQuality(slot.quality);
    } catch {
      return fail(`slots[${index}]`, "slot degree and quality must be canonical values.");
    }
    if (typeof slot.bars !== "number" || !Number.isSafeInteger(slot.bars) || slot.bars <= 0)
      return fail(`slots[${index}].bars`, "bars must be a positive safe integer.");
    const frozen = Object.freeze({ degree, quality, bars: slot.bars });
    slots.push(frozen);
    totalBars += slot.bars;
  }
  if (totalBars !== 8) return fail("slots", "slot bar spans must total exactly 8 bars.");
  return Object.freeze({
    schema: HARMONY_TEMPLATE_SCHEMA,
    id: input.id,
    version: "v1",
    scale,
    slots: Object.freeze(slots),
  });
}

type SlotData = readonly [number, ChordQuality, number];
function template(id: string, scale: ScaleType, slots: readonly SlotData[]): HarmonyTemplate {
  return createHarmonyTemplateStructure({
    schema: HARMONY_TEMPLATE_SCHEMA,
    id,
    version: "v1",
    scale,
    slots: slots.map(([degree, quality, bars]) => ({ degree, quality, bars })),
  });
}
const q = CHORD_QUALITIES;
export const HARMONY_TEMPLATE_CATALOG: readonly HarmonyTemplate[] = Object.freeze([
  template("degree-0344-major-v1", SCALE_TYPES.major, [
    [0, q.majorTriad, 2],
    [3, q.majorTriad, 2],
    [4, q.majorTriad, 2],
    [0, q.majorTriad, 2],
  ]),
  template("degree-0344-natural-minor-v1", SCALE_TYPES.naturalMinor, [
    [0, q.minorTriad, 2],
    [3, q.minorTriad, 2],
    [4, q.majorTriad, 2],
    [0, q.minorTriad, 2],
  ]),
  template("degree-0344-harmonic-minor-v1", SCALE_TYPES.harmonicMinor, [
    [0, q.minorTriad, 2],
    [3, q.minorTriad, 2],
    [4, q.majorTriad, 2],
    [0, q.minorTriad, 2],
  ]),
  template("degree-0344-melodic-minor-v1", SCALE_TYPES.melodicMinor, [
    [0, q.minorTriad, 2],
    [3, q.majorTriad, 2],
    [4, q.majorTriad, 2],
    [0, q.minorTriad, 2],
  ]),
  template("degree-0344-dorian-v1", SCALE_TYPES.dorian, [
    [0, q.minorTriad, 2],
    [3, q.majorTriad, 2],
    [4, q.minorTriad, 2],
    [0, q.minorTriad, 2],
  ]),
  template("degree-0344-phrygian-v1", SCALE_TYPES.phrygian, [
    [0, q.minorTriad, 2],
    [3, q.majorTriad, 2],
    [4, q.minorTriad, 2],
    [0, q.minorTriad, 2],
  ]),
  template("degree-0654-major-v1", SCALE_TYPES.major, [
    [0, q.majorTriad, 2],
    [6, q.diminishedTriad, 2],
    [5, q.majorTriad, 2],
    [4, q.majorTriad, 2],
  ]),
  template("degree-0654-natural-minor-v1", SCALE_TYPES.naturalMinor, [
    [0, q.minorTriad, 2],
    [6, q.majorTriad, 2],
    [5, q.majorTriad, 2],
    [4, q.majorTriad, 2],
  ]),
  template("degree-0654-harmonic-minor-v1", SCALE_TYPES.harmonicMinor, [
    [0, q.minorTriad, 2],
    [6, q.majorTriad, 2],
    [5, q.majorTriad, 2],
    [4, q.majorTriad, 2],
  ]),
  template("degree-0654-melodic-minor-v1", SCALE_TYPES.melodicMinor, [
    [0, q.minorTriad, 2],
    [6, q.majorTriad, 2],
    [5, q.majorTriad, 2],
    [4, q.majorTriad, 2],
  ]),
  template("degree-0654-dorian-v1", SCALE_TYPES.dorian, [
    [0, q.minorTriad, 2],
    [6, q.majorTriad, 2],
    [5, q.majorTriad, 2],
    [4, q.minorTriad, 2],
  ]),
  template("degree-0654-phrygian-v1", SCALE_TYPES.phrygian, [
    [0, q.minorTriad, 2],
    [6, q.majorTriad, 2],
    [5, q.majorTriad, 2],
    [4, q.minorTriad, 2],
  ]),
  template("degree-0340-major-v1", SCALE_TYPES.major, [
    [0, q.majorTriad, 2],
    [3, q.majorTriad, 2],
    [4, q.majorTriad, 2],
    [0, q.majorTriad, 2],
  ]),
  template("degree-0340-natural-minor-v1", SCALE_TYPES.naturalMinor, [
    [0, q.minorTriad, 2],
    [3, q.minorTriad, 2],
    [4, q.majorTriad, 2],
    [0, q.minorTriad, 2],
  ]),
  template("degree-0340-harmonic-minor-v1", SCALE_TYPES.harmonicMinor, [
    [0, q.minorTriad, 2],
    [3, q.minorTriad, 2],
    [4, q.majorTriad, 2],
    [0, q.minorTriad, 2],
  ]),
  template("degree-0340-melodic-minor-v1", SCALE_TYPES.melodicMinor, [
    [0, q.minorTriad, 2],
    [3, q.majorTriad, 2],
    [4, q.majorTriad, 2],
    [0, q.minorTriad, 2],
  ]),
  template("degree-0340-dorian-v1", SCALE_TYPES.dorian, [
    [0, q.minorTriad, 2],
    [3, q.majorTriad, 2],
    [4, q.minorTriad, 2],
    [0, q.minorTriad, 2],
  ]),
  template("degree-0340-phrygian-v1", SCALE_TYPES.phrygian, [
    [0, q.minorTriad, 2],
    [3, q.majorTriad, 2],
    [4, q.minorTriad, 2],
    [0, q.minorTriad, 2],
  ]),
]);

function definitionsEqual(left: HarmonyTemplate, right: HarmonyTemplate): boolean {
  return (
    left.schema === right.schema &&
    left.id === right.id &&
    left.version === right.version &&
    left.scale === right.scale &&
    left.slots.length === right.slots.length &&
    left.slots.every(
      (slot, index) =>
        slot.degree === right.slots[index].degree &&
        slot.quality === right.slots[index].quality &&
        slot.bars === right.slots[index].bars,
    )
  );
}

export function createHarmonyTemplate(value: unknown): HarmonyTemplate {
  const candidate = createHarmonyTemplateStructure(value);
  const canonical = HARMONY_TEMPLATE_CATALOG.find(
    (templateValue) => templateValue.id === candidate.id,
  );
  if (canonical === undefined || !definitionsEqual(candidate, canonical)) {
    return fail("template", "template does not match its canonical definition.");
  }
  return canonical;
}

const PROFILE_TEMPLATE_IDS: Readonly<Record<HarmonyProfileId, readonly string[]>> = Object.freeze({
  [HARMONY_PROFILE_IDS.darkSynthwave]: Object.freeze([
    "degree-0654-natural-minor-v1",
    "degree-0344-harmonic-minor-v1",
    "degree-0340-dorian-v1",
  ]),
  [HARMONY_PROFILE_IDS.classicSynthwave]: Object.freeze([
    "degree-0344-major-v1",
    "degree-0340-major-v1",
    "degree-0344-natural-minor-v1",
    "degree-0340-dorian-v1",
  ]),
  [HARMONY_PROFILE_IDS.darkwave]: Object.freeze([
    "degree-0654-natural-minor-v1",
    "degree-0340-phrygian-v1",
    "degree-0344-dorian-v1",
  ]),
  [HARMONY_PROFILE_IDS.midtempoCyberpunk]: Object.freeze([
    "degree-0654-phrygian-v1",
    "degree-0344-harmonic-minor-v1",
    "degree-0340-natural-minor-v1",
  ]),
});

export const HARMONY_VOICING_POLICIES: Readonly<Record<HarmonyProfileId, HarmonyVoicingPolicy>> =
  Object.freeze({
    [HARMONY_PROFILE_IDS.darkSynthwave]: Object.freeze({
      minMidiPitch: 36,
      maxMidiPitch: 84,
      maxSpan: 24,
    }),
    [HARMONY_PROFILE_IDS.classicSynthwave]: Object.freeze({
      minMidiPitch: 40,
      maxMidiPitch: 88,
      maxSpan: 24,
    }),
    [HARMONY_PROFILE_IDS.darkwave]: Object.freeze({
      minMidiPitch: 34,
      maxMidiPitch: 80,
      maxSpan: 22,
    }),
    [HARMONY_PROFILE_IDS.midtempoCyberpunk]: Object.freeze({
      minMidiPitch: 38,
      maxMidiPitch: 86,
      maxSpan: 26,
    }),
  });

export function getHarmonyVoicingPolicy(profile: HarmonyProfileId): HarmonyVoicingPolicy {
  return (
    HARMONY_VOICING_POLICIES[profile] ??
    fail("profile", "unknown harmony profile.", HARMONY_ERROR_CODES.unknownProfile)
  );
}

export function enumerateChordVoicingCandidates(
  chord: Chord,
  profile: HarmonyProfileId,
  allowedInversions?: readonly ChordInversion[],
): readonly ChordVoicingCandidate[] {
  const policy = getHarmonyVoicingPolicy(profile);
  const allowed =
    allowedInversions === undefined
      ? [0, 1, 2].map(createChordInversion)
      : allowedInversions.map((value) => createChordInversion(value));
  if (allowed.length === 0)
    return fail("inversions", "no permitted inversion.", HARMONY_ERROR_CODES.noInversion);
  const candidates: ChordVoicingCandidate[] = [];
  for (let bass = policy.minMidiPitch; bass <= policy.maxMidiPitch; bass += 1) {
    for (let middle = bass + 1; middle <= policy.maxMidiPitch; middle += 1) {
      for (
        let top = middle + 1;
        top <= policy.maxMidiPitch && top - bass <= policy.maxSpan;
        top += 1
      ) {
        const voicing = createChordVoicing([
          createMidiPitch(bass),
          createMidiPitch(middle),
          createMidiPitch(top),
        ]);
        if (!isChordVoicingCompatibleWithChord(voicing, chord)) continue;
        const inversion = allowed.find((value) =>
          isChordVoicingCompatibleWithChordInversion(voicing, chord, value),
        );
        if (inversion !== undefined) candidates.push(Object.freeze({ inversion, voicing }));
      }
    }
  }
  if (candidates.length === 0)
    return fail("voicing", "no valid voicing.", HARMONY_ERROR_CODES.noVoicing);
  return Object.freeze(candidates);
}

export function calculateVoiceLeadingCost(previous: ChordVoicing, next: ChordVoicing): number {
  const from = createChordVoicing(previous.midiPitches).midiPitches;
  const to = createChordVoicing(next.midiPitches).midiPitches;
  return Math.abs(from[0] - to[0]) + Math.abs(from[1] - to[1]) + Math.abs(from[2] - to[2]);
}

function compareCandidateVoicings(left: ChordVoicing, right: ChordVoicing): number {
  const leftPitches = left.midiPitches;
  const rightPitches = right.midiPitches;
  return (
    leftPitches[2] - rightPitches[2] ||
    leftPitches[0] - rightPitches[0] ||
    leftPitches[1] - rightPitches[1] ||
    leftPitches[2] - rightPitches[2]
  );
}

export function selectVoiceLedCandidate(
  previous: ChordVoicing,
  candidates: readonly ChordVoicingCandidate[],
): VoiceLedCandidateSelection {
  const validatedPrevious = createChordVoicing(previous.midiPitches);
  if (!Array.isArray(candidates) || candidates.length === 0) {
    return fail(
      "candidates",
      "at least one candidate is required.",
      HARMONY_ERROR_CODES.noCandidate,
    );
  }
  let selected: ChordVoicingCandidate | undefined;
  let selectedCost = Number.POSITIVE_INFINITY;
  for (const candidate of candidates) {
    const validatedVoicing = createChordVoicing(candidate.voicing.midiPitches);
    const validatedCandidate = Object.freeze({
      inversion: createChordInversion(candidate.inversion),
      voicing: validatedVoicing,
    });
    const cost = calculateVoiceLeadingCost(validatedPrevious, validatedVoicing);
    if (
      selected === undefined ||
      cost < selectedCost ||
      (cost === selectedCost && compareCandidateVoicings(validatedVoicing, selected.voicing) < 0)
    ) {
      selected = validatedCandidate;
      selectedCost = cost;
    }
  }
  return Object.freeze({ candidate: selected as ChordVoicingCandidate, cost: selectedCost });
}

export function isHarmonyProfileId(value: unknown): value is HarmonyProfileId {
  return typeof value === "string" && Object.hasOwn(PROFILE_TEMPLATE_IDS, value);
}
export function getHarmonyTemplate(id: string): HarmonyTemplate {
  const result = HARMONY_TEMPLATE_CATALOG.find((candidate) => candidate.id === id);
  return result ?? fail("id", "unknown harmony template.", HARMONY_ERROR_CODES.unknownTemplate);
}
export function getHarmonyTemplateIdsForProfile(profile: HarmonyProfileId): readonly string[] {
  return (
    PROFILE_TEMPLATE_IDS[profile] ??
    fail("profile", "unknown harmony profile.", HARMONY_ERROR_CODES.unknownProfile)
  );
}
export function getHarmonyTemplatesForProfile(
  profile: HarmonyProfileId,
): readonly HarmonyTemplate[] {
  return Object.freeze(getHarmonyTemplateIdsForProfile(profile).map(getHarmonyTemplate));
}
export function isHarmonyTemplateSupportedForProfile(
  profile: HarmonyProfileId,
  templateValue: HarmonyTemplate,
): boolean {
  return getHarmonyTemplateIdsForProfile(profile).includes(createHarmonyTemplate(templateValue).id);
}

export function realizeHarmonyTemplate(
  templateValue: HarmonyTemplate,
  keyValue: Key,
): readonly Chord[] {
  const templateValidated = createHarmonyTemplate(templateValue);
  const key = createKey(keyValue.tonic, keyValue.scale);
  if (key.scale !== templateValidated.scale)
    return fail(
      "scale",
      "key scale does not match template scale.",
      HARMONY_ERROR_CODES.scaleMismatch,
    );
  return Object.freeze(
    templateValidated.slots.map((slot) =>
      createChord(pitchClassAtKeyDegree(key, slot.degree), slot.quality),
    ),
  );
}
