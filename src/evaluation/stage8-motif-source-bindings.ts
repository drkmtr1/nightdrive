import { STAGE7_AC004_HARMONY_SNAPSHOTS } from "./stage7-ac004-harmony-snapshots";

/**
 * Evaluation-only bindings for the accepted Stage 8 Motif qualification matrix.
 *
 * This module deliberately reads only the frozen Stage 7 Harmony literals.  It
 * does not construct a Harmony progression, invoke a generator, or import a
 * production Motif policy, projector, serializer, seed helper, or PRNG.
 */

export type Stage8MotifProfileId =
  | "dark-synthwave"
  | "classic-synthwave"
  | "darkwave"
  | "midtempo-cyberpunk";
export type Stage8MotifEnergy = "very-low" | "low" | "medium" | "high" | "very-high";
export type Stage8MotifComplexity = Stage8MotifEnergy;
export type Stage8MotifScale = "major" | "natural-minor" | "phrygian";
export type Stage8MotifChordQuality = "major-triad" | "minor-triad";

export type Stage8MotifSourceIdentityV1 = Readonly<{
  commit: "c67295bde50b599caba90f0433352815ebac9bc7";
  path: "src/evaluation/stage7-ac004-harmony-snapshots.ts";
  gitBlobObjectId: "c9ea54f1b7b6a533724fb9782ac816e2b80f9422";
}>;

export type Stage8MotifFrozenHarmonyV1 = Readonly<{
  profile: Stage8MotifProfileId;
  templateId: string;
  templateVersion: "v1";
  key: Readonly<{ tonic: number; scale: Stage8MotifScale }>;
  slots: readonly Readonly<{
    index: number;
    degree: number;
    bars: 2;
    chord: Readonly<{ root: number; quality: Stage8MotifChordQuality }>;
    inversion: 0 | 1 | 2;
    voicing: Readonly<{ midiPitches: readonly [number, number, number] }>;
  }>[];
}>;

export type Stage8MotifSourceBindingV1 = Readonly<{
  sourceRecordId: string;
  source: Stage8MotifSourceIdentityV1;
  harmony: Stage8MotifFrozenHarmonyV1;
}>;

export type Stage8MotifQualificationInputV1 = Readonly<{
  vectorId: string;
  sourceRecordId: string;
  profileId: Stage8MotifProfileId;
  intent: Readonly<{ energy: "low" | "medium" | "high"; complexity: "low" | "medium" | "high" }>;
  rootSeed: 0 | 4_294_967_295;
}>;

const SOURCE_IDENTITY: Stage8MotifSourceIdentityV1 = Object.freeze({
  commit: "c67295bde50b599caba90f0433352815ebac9bc7",
  path: "src/evaluation/stage7-ac004-harmony-snapshots.ts",
  gitBlobObjectId: "c9ea54f1b7b6a533724fb9782ac816e2b80f9422",
});

const SOURCE_ORDER = [
  {
    sourceRecordId: "dark-synthwave-chorus-001",
    profile: "dark-synthwave",
    templateId: "degree-0654-natural-minor-v1",
    tonic: 0,
    scale: "natural-minor",
    slots: [
      { degree: 0, root: 0, quality: "minor-triad", inversion: 0, midiPitches: [36, 39, 43] },
      { degree: 6, root: 10, quality: "major-triad", inversion: 1, midiPitches: [38, 41, 46] },
      { degree: 5, root: 8, quality: "major-triad", inversion: 1, midiPitches: [36, 39, 44] },
      { degree: 4, root: 7, quality: "major-triad", inversion: 2, midiPitches: [38, 43, 47] },
    ],
  },
  {
    sourceRecordId: "classic-synthwave-chorus-001",
    profile: "classic-synthwave",
    templateId: "degree-0344-major-v1",
    tonic: 0,
    scale: "major",
    slots: [
      { degree: 0, root: 0, quality: "major-triad", inversion: 0, midiPitches: [48, 52, 55] },
      { degree: 3, root: 5, quality: "major-triad", inversion: 2, midiPitches: [48, 53, 57] },
      { degree: 4, root: 7, quality: "major-triad", inversion: 1, midiPitches: [47, 50, 55] },
      { degree: 0, root: 0, quality: "major-triad", inversion: 0, midiPitches: [48, 52, 55] },
    ],
  },
  {
    sourceRecordId: "darkwave-verse-001",
    profile: "darkwave",
    templateId: "degree-0654-natural-minor-v1",
    tonic: 0,
    scale: "natural-minor",
    slots: [
      { degree: 0, root: 0, quality: "minor-triad", inversion: 0, midiPitches: [36, 39, 43] },
      { degree: 6, root: 10, quality: "major-triad", inversion: 0, midiPitches: [34, 38, 41] },
      { degree: 5, root: 8, quality: "major-triad", inversion: 1, midiPitches: [36, 39, 44] },
      { degree: 4, root: 7, quality: "major-triad", inversion: 1, midiPitches: [35, 38, 43] },
    ],
  },
  {
    sourceRecordId: "cyberpunk-build-001",
    profile: "midtempo-cyberpunk",
    templateId: "degree-0654-phrygian-v1",
    tonic: 0,
    scale: "phrygian",
    slots: [
      { degree: 0, root: 0, quality: "minor-triad", inversion: 1, midiPitches: [39, 43, 48] },
      { degree: 6, root: 10, quality: "major-triad", inversion: 1, midiPitches: [38, 41, 46] },
      { degree: 5, root: 8, quality: "major-triad", inversion: 2, midiPitches: [39, 44, 48] },
      { degree: 4, root: 7, quality: "minor-triad", inversion: 2, midiPitches: [38, 43, 46] },
    ],
  },
] as const satisfies readonly Readonly<{
  sourceRecordId: string;
  profile: Stage8MotifProfileId;
  templateId: string;
  tonic: number;
  scale: Stage8MotifScale;
  slots: readonly Readonly<{
    degree: number;
    root: number;
    quality: Stage8MotifChordQuality;
    inversion: 0 | 1 | 2;
    midiPitches: readonly [number, number, number];
  }>[];
}>[];

const QUALIFICATION_INTENTS = [
  { energy: "low", complexity: "low" },
  { energy: "medium", complexity: "medium" },
  { energy: "high", complexity: "high" },
] as const;
const QUALIFICATION_SEEDS = [0, 4_294_967_295] as const;

function deepFreeze<T>(value: T): T {
  if (typeof value !== "object" || value === null || Object.isFrozen(value)) return value;
  for (const key of Reflect.ownKeys(value)) deepFreeze(Reflect.get(value, key));
  return Object.freeze(value);
}

function assertInteger(value: unknown, field: string): asserts value is number {
  if (typeof value !== "number" || !Number.isSafeInteger(value))
    throw new RangeError(`${field} must be a safe integer.`);
}

function assertProfile(value: unknown, field: string): asserts value is Stage8MotifProfileId {
  if (
    value !== "dark-synthwave" &&
    value !== "classic-synthwave" &&
    value !== "darkwave" &&
    value !== "midtempo-cyberpunk"
  ) {
    throw new RangeError(`${field} is not an accepted Stage 8 profile.`);
  }
}

function assertScale(value: unknown, field: string): asserts value is Stage8MotifScale {
  if (value !== "major" && value !== "natural-minor" && value !== "phrygian")
    throw new RangeError(`${field} is not an accepted qualification scale.`);
}

function assertQuality(value: unknown, field: string): asserts value is Stage8MotifChordQuality {
  if (value !== "major-triad" && value !== "minor-triad")
    throw new RangeError(`${field} is not an accepted triad quality.`);
}

function assertInversion(value: unknown, field: string): asserts value is 0 | 1 | 2 {
  if (value !== 0 && value !== 1 && value !== 2)
    throw new RangeError(`${field} must be a V1 triad inversion.`);
}

function bindSnapshot(index: number): Stage8MotifSourceBindingV1 {
  const expected = SOURCE_ORDER[index];
  const snapshot = STAGE7_AC004_HARMONY_SNAPSHOTS[index];
  if (expected === undefined || snapshot === undefined)
    throw new Error("Stage 8 source-binding order is incomplete.");
  if (snapshot.sourceRecordId !== expected.sourceRecordId)
    throw new RangeError(
      `sourceRecordId at index ${index} does not match the accepted source order.`,
    );
  assertProfile(snapshot.profile, `sources[${index}].profile`);
  if (snapshot.profile !== expected.profile)
    throw new RangeError(`sources[${index}].profile does not match its accepted binding.`);
  if (snapshot.templateId !== expected.templateId || snapshot.templateVersion !== "v1")
    throw new RangeError(`sources[${index}] has an incompatible Harmony template identity.`);
  assertInteger(snapshot.key.tonic, `sources[${index}].key.tonic`);
  if (snapshot.key.tonic !== expected.tonic)
    throw new RangeError(`sources[${index}].key.tonic does not match its accepted binding.`);
  assertScale(snapshot.key.scale, `sources[${index}].key.scale`);
  if (snapshot.key.scale !== expected.scale)
    throw new RangeError(`sources[${index}].key.scale does not match its accepted binding.`);
  if (snapshot.slots.length !== 4)
    throw new RangeError(`sources[${index}] must contain exactly four Harmony slots.`);

  const slots = snapshot.slots.map((slot, slotIndex) => {
    const expectedSlot = expected.slots[slotIndex];
    if (expectedSlot === undefined)
      throw new Error("Stage 8 source-binding slot order is incomplete.");
    if (slot.index !== slotIndex || slot.bars !== 2)
      throw new RangeError(`sources[${index}].slots[${slotIndex}] has invalid identity.`);
    assertInteger(slot.degree, `sources[${index}].slots[${slotIndex}].degree`);
    if (slot.degree !== expectedSlot.degree)
      throw new RangeError(
        `sources[${index}].slots[${slotIndex}].degree does not match its binding.`,
      );
    assertInteger(slot.chord.root, `sources[${index}].slots[${slotIndex}].chord.root`);
    if (slot.chord.root !== expectedSlot.root)
      throw new RangeError(
        `sources[${index}].slots[${slotIndex}].chord.root does not match its binding.`,
      );
    assertQuality(slot.chord.quality, `sources[${index}].slots[${slotIndex}].chord.quality`);
    if (slot.chord.quality !== expectedSlot.quality)
      throw new RangeError(
        `sources[${index}].slots[${slotIndex}].chord.quality does not match its binding.`,
      );
    assertInversion(slot.inversion, `sources[${index}].slots[${slotIndex}].inversion`);
    if (slot.inversion !== expectedSlot.inversion)
      throw new RangeError(
        `sources[${index}].slots[${slotIndex}].inversion does not match its binding.`,
      );
    if (slot.voicing.midiPitches.length !== 3)
      throw new RangeError(`sources[${index}].slots[${slotIndex}].voicing must contain a triad.`);
    const midiPitches = slot.voicing.midiPitches.map((pitch, pitchIndex) => {
      assertInteger(
        pitch,
        `sources[${index}].slots[${slotIndex}].voicing.midiPitches[${pitchIndex}]`,
      );
      return pitch;
    });
    if (
      midiPitches[0] === undefined ||
      midiPitches[1] === undefined ||
      midiPitches[2] === undefined
    )
      throw new Error("Stage 8 source-binding triad is incomplete.");
    if (midiPitches.some((pitch, pitchIndex) => pitch !== expectedSlot.midiPitches[pitchIndex]))
      throw new RangeError(
        `sources[${index}].slots[${slotIndex}].voicing does not match its accepted binding.`,
      );
    return {
      index: slotIndex,
      degree: slot.degree,
      bars: 2 as const,
      chord: { root: slot.chord.root, quality: slot.chord.quality },
      inversion: slot.inversion,
      voicing: { midiPitches: [midiPitches[0], midiPitches[1], midiPitches[2]] as const },
    };
  });

  return deepFreeze({
    sourceRecordId: snapshot.sourceRecordId,
    source: SOURCE_IDENTITY,
    harmony: {
      profile: snapshot.profile,
      templateId: snapshot.templateId,
      templateVersion: "v1" as const,
      key: { tonic: snapshot.key.tonic, scale: snapshot.key.scale },
      slots,
    },
  });
}

export const STAGE8_MOTIF_SOURCE_BINDINGS: readonly Stage8MotifSourceBindingV1[] = deepFreeze(
  SOURCE_ORDER.map((_, index) => bindSnapshot(index)),
);

export const STAGE8_MOTIF_QUALIFICATION_INPUTS: readonly Stage8MotifQualificationInputV1[] =
  deepFreeze(
    STAGE8_MOTIF_SOURCE_BINDINGS.flatMap((binding) =>
      QUALIFICATION_INTENTS.flatMap((intent) =>
        QUALIFICATION_SEEDS.map((rootSeed) =>
          deepFreeze({
            vectorId: `${binding.sourceRecordId}-${intent.energy}-${intent.complexity}-${rootSeed
              .toString(16)
              .padStart(8, "0")}`,
            sourceRecordId: binding.sourceRecordId,
            profileId: binding.harmony.profile,
            intent: { energy: intent.energy, complexity: intent.complexity },
            rootSeed,
          }),
        ),
      ),
    ),
  );

export function getStage8MotifSourceBinding(sourceRecordId: string): Stage8MotifSourceBindingV1 {
  const binding = STAGE8_MOTIF_SOURCE_BINDINGS.find(
    (candidate) => candidate.sourceRecordId === sourceRecordId,
  );
  if (binding === undefined)
    throw new RangeError(`Unknown Stage 8 Motif source: ${sourceRecordId}`);
  return binding;
}

export function getStage8MotifQualificationInput(
  vectorId: string,
): Stage8MotifQualificationInputV1 {
  const input = STAGE8_MOTIF_QUALIFICATION_INPUTS.find(
    (candidate) => candidate.vectorId === vectorId,
  );
  if (input === undefined) throw new RangeError(`Unknown Stage 8 Motif vector: ${vectorId}`);
  return input;
}
