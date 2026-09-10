import { createChord, type Chord } from "./chord";
import { createChordQuality, CHORD_QUALITIES, type ChordQuality } from "./chord-quality";
import { createKey, pitchClassAtKeyDegree, type Key } from "./key";
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

export function createHarmonyTemplate(value: unknown): HarmonyTemplate {
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
  return createHarmonyTemplate({
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
