import { createArpRange } from "../music-domain/arpeggiator";
import {
  ARP_POLICY_VERSION_V2,
  ARP_PROFILE_DATA_VERSION_V2,
  generateArpEventsWithPolicyV2,
} from "../music-domain/arpeggiator-policy-generator";
import { createBassRange, generateBassEvents } from "../music-domain/bass";
import { COMPONENT_SEED_DERIVATION_VERSION_V1 } from "../music-domain/component-seed";
import { getHarmonyTemplate, realizeHarmonyProgression } from "../music-domain/harmony";
import { createKey } from "../music-domain/key";
import { createTempoFromMicrosecondsPerQuarter } from "../music-domain/musical-time";
import { createPitchClass } from "../music-domain/pitch";
import { PRNG_ALGORITHM_ID } from "../music-domain/prng";
import { createScaleType } from "../music-domain/scale";

export const FIRST_PLAYABLE_SOURCE_CAPTURE_SCHEMA =
  "nightdrive.first-playable-source-capture.v1" as const;

export type FirstPlayableSourceRequest = Readonly<{
  schema: "nightdrive.first-playable-composition-request.v1";
  engineVersion: "nightdrive.engine.first-playable-composition.v1";
  generatorVersion: "nightdrive.generator.first-playable-composition.v1";
  profile: Readonly<{ id: string }>;
  harmony: Readonly<{
    templateId: string;
    templateVersion: "v1";
    key: Readonly<{ tonic: number; scale: string }>;
  }>;
  section: Readonly<{ tempo: Readonly<{ microsecondsPerQuarter: number }> }>;
  intent: Readonly<{ energy: string; complexity: string }>;
  rootSeed: number;
  bass?: Readonly<{
    range?: Readonly<{ minMidiPitch: number; maxMidiPitch: number }>;
    rhythm?: string;
  }>;
  arpeggiator: Readonly<{
    range: Readonly<{ minMidiPitch: number; maxMidiPitch: number }>;
    profile: Readonly<{ version: "nightdrive.genre-profile.arpeggiator.v2" }>;
    policy: Readonly<{ version: "nightdrive.arpeggiator-policy.v2" }>;
    seedDerivation: Readonly<{ version: "nightdrive.seed-derivation.component.v1" }>;
    prng: Readonly<{ version: "nightdrive.prng.mulberry32.v1" }>;
  }>;
}>;

export type FirstPlayableSourceRecord = Readonly<{
  vectorId: string;
  normalizedRequest: Readonly<Record<string, unknown>>;
  components: Readonly<{
    harmony: Readonly<Record<string, unknown>>;
    bass: readonly Readonly<{ pitch: number; startTick: number; durationTicks: number }>[];
    arpeggiator: readonly Readonly<{
      pitch: number;
      startTick: number;
      durationTicks: number;
    }>[];
  }>;
}>;

type MatrixEntry = Readonly<{ vectorId: string; request: FirstPlayableSourceRequest }>;
type NormalizedSourceRequest = Readonly<
  Omit<FirstPlayableSourceRequest, "bass"> & {
    bass: Readonly<{
      range: Readonly<{ minMidiPitch: number; maxMidiPitch: number }>;
      rhythm: string;
    }>;
  }
>;

const COMMON = {
  schema: "nightdrive.first-playable-composition-request.v1",
  engineVersion: "nightdrive.engine.first-playable-composition.v1",
  generatorVersion: "nightdrive.generator.first-playable-composition.v1",
  section: { tempo: { microsecondsPerQuarter: 500000 } },
  intent: { energy: "medium", complexity: "medium" },
  rootSeed: 0,
  bass: { range: { minMidiPitch: 36, maxMidiPitch: 60 }, rhythm: "sustained" },
  arpeggiator: {
    range: { minMidiPitch: 0, maxMidiPitch: 127 },
    profile: { version: "nightdrive.genre-profile.arpeggiator.v2" },
    policy: { version: "nightdrive.arpeggiator-policy.v2" },
    seedDerivation: { version: "nightdrive.seed-derivation.component.v1" },
    prng: { version: "nightdrive.prng.mulberry32.v1" },
  },
} as const;

function request(
  profile: string,
  templateId: string,
  tonic: number,
  scale: string,
  overrides: Readonly<Record<string, unknown>> = {},
): FirstPlayableSourceRequest {
  return detachFreeze({
    ...COMMON,
    profile: { id: profile },
    harmony: { templateId, templateVersion: "v1", key: { tonic, scale } },
    ...overrides,
  }) as FirstPlayableSourceRequest;
}

const FP01 = request("dark-synthwave", "degree-0654-natural-minor-v1", 0, "natural-minor");

export const FIRST_PLAYABLE_SOURCE_MATRIX: readonly MatrixEntry[] = Object.freeze([
  Object.freeze({ vectorId: "FP-01", request: FP01 }),
  Object.freeze({
    vectorId: "FP-02",
    request: request("classic-synthwave", "degree-0344-major-v1", 2, "major"),
  }),
  Object.freeze({
    vectorId: "FP-03",
    request: request("darkwave", "degree-0340-phrygian-v1", 4, "phrygian"),
  }),
  Object.freeze({
    vectorId: "FP-04",
    request: request("midtempo-cyberpunk", "degree-0654-phrygian-v1", 7, "phrygian"),
  }),
  Object.freeze({
    vectorId: "FP-05",
    request: request("dark-synthwave", "degree-0654-natural-minor-v1", 0, "natural-minor", {
      section: { tempo: { microsecondsPerQuarter: 400001 } },
    }),
  }),
  Object.freeze({
    vectorId: "FP-06",
    request: request("dark-synthwave", "degree-0654-natural-minor-v1", 0, "natural-minor", {
      rootSeed: 4294967295,
    }),
  }),
  Object.freeze({
    vectorId: "FP-07",
    request: request("dark-synthwave", "degree-0654-natural-minor-v1", 0, "natural-minor", {
      intent: { energy: "very-high", complexity: "medium" },
    }),
  }),
  Object.freeze({
    vectorId: "FP-08",
    request: request("dark-synthwave", "degree-0654-natural-minor-v1", 0, "natural-minor", {
      intent: { energy: "medium", complexity: "very-low" },
    }),
  }),
  Object.freeze({
    vectorId: "FP-09",
    request: request("dark-synthwave", "degree-0654-natural-minor-v1", 0, "natural-minor", {
      bass: { range: { minMidiPitch: 36, maxMidiPitch: 60 }, rhythm: "quarter-pulse" },
    }),
  }),
  Object.freeze({
    vectorId: "FP-10",
    request: request("dark-synthwave", "degree-0654-natural-minor-v1", 0, "natural-minor", {
      bass: { range: { minMidiPitch: 24, maxMidiPitch: 35 }, rhythm: "sustained" },
    }),
  }),
  Object.freeze({
    vectorId: "FP-11",
    request: request("dark-synthwave", "degree-0654-natural-minor-v1", 0, "natural-minor", {
      arpeggiator: {
        ...COMMON.arpeggiator,
        range: { minMidiPitch: 0, maxMidiPitch: 126 },
      },
    }),
  }),
  Object.freeze({
    vectorId: "FP-12",
    request: request("dark-synthwave", "degree-0654-natural-minor-v1", 1, "natural-minor"),
  }),
]);

function detachFreeze<T>(value: T): T {
  if (Array.isArray(value)) {
    return Object.freeze(value.map((item) => detachFreeze(item))) as T;
  }
  if (typeof value === "object" && value !== null) {
    const copy: Record<string, unknown> = {};
    for (const [key, child] of Object.entries(value)) copy[key] = detachFreeze(child);
    return Object.freeze(copy) as T;
  }
  return value;
}

function normalizedRequest(requestValue: FirstPlayableSourceRequest): NormalizedSourceRequest {
  if (requestValue.schema !== "nightdrive.first-playable-composition-request.v1")
    throw new RangeError("source request schema is unsupported");
  if (requestValue.engineVersion !== "nightdrive.engine.first-playable-composition.v1")
    throw new RangeError("source request engine version is unsupported");
  if (requestValue.generatorVersion !== "nightdrive.generator.first-playable-composition.v1")
    throw new RangeError("source request generator version is unsupported");
  if (requestValue.harmony.templateVersion !== "v1")
    throw new RangeError("source Harmony template version is unsupported");
  if (requestValue.arpeggiator.profile.version !== ARP_PROFILE_DATA_VERSION_V2)
    throw new RangeError("source Arpeggiator profile version is unsupported");
  if (requestValue.arpeggiator.policy.version !== ARP_POLICY_VERSION_V2)
    throw new RangeError("source Arpeggiator policy version is unsupported");
  if (requestValue.arpeggiator.seedDerivation.version !== COMPONENT_SEED_DERIVATION_VERSION_V1)
    throw new RangeError("source seed derivation version is unsupported");
  if (requestValue.arpeggiator.prng.version !== PRNG_ALGORITHM_ID)
    throw new RangeError("source PRNG version is unsupported");
  createTempoFromMicrosecondsPerQuarter(requestValue.section.tempo.microsecondsPerQuarter);

  const bass = requestValue.bass;
  if (Object.hasOwn(requestValue, "bass") && bass === undefined)
    throw new RangeError("explicit undefined Bass input is invalid");
  if (bass !== undefined && Object.hasOwn(bass, "range") && bass.range === undefined)
    throw new RangeError("explicit undefined Bass range is invalid");
  if (bass !== undefined && Object.hasOwn(bass, "rhythm") && bass.rhythm === undefined)
    throw new RangeError("explicit undefined Bass rhythm is invalid");
  const bassRange = createBassRange(bass?.range ?? { minMidiPitch: 36, maxMidiPitch: 60 });
  const bassRhythm = bass?.rhythm ?? "sustained";
  return detachFreeze({
    schema: requestValue.schema,
    engineVersion: requestValue.engineVersion,
    generatorVersion: requestValue.generatorVersion,
    profile: { id: requestValue.profile.id },
    harmony: {
      templateId: requestValue.harmony.templateId,
      templateVersion: requestValue.harmony.templateVersion,
      key: {
        tonic: requestValue.harmony.key.tonic,
        scale: requestValue.harmony.key.scale,
      },
    },
    section: {
      tempo: { microsecondsPerQuarter: requestValue.section.tempo.microsecondsPerQuarter },
    },
    intent: { energy: requestValue.intent.energy, complexity: requestValue.intent.complexity },
    rootSeed: requestValue.rootSeed,
    bass: {
      range: {
        minMidiPitch: bassRange.minMidiPitch,
        maxMidiPitch: bassRange.maxMidiPitch,
      },
      rhythm: bassRhythm,
    },
    arpeggiator: {
      range: {
        minMidiPitch: requestValue.arpeggiator.range.minMidiPitch,
        maxMidiPitch: requestValue.arpeggiator.range.maxMidiPitch,
      },
      profile: { version: requestValue.arpeggiator.profile.version },
      policy: { version: requestValue.arpeggiator.policy.version },
      seedDerivation: { version: requestValue.arpeggiator.seedDerivation.version },
      prng: { version: requestValue.arpeggiator.prng.version },
    },
  }) as NormalizedSourceRequest;
}

export function captureFirstPlayableSourceRecord(
  vectorId: string,
  requestValue: FirstPlayableSourceRequest,
): FirstPlayableSourceRecord {
  const normalized = normalizedRequest(requestValue);
  const key = createKey(
    createPitchClass(requestValue.harmony.key.tonic),
    createScaleType(requestValue.harmony.key.scale),
  );
  const template = getHarmonyTemplate(requestValue.harmony.templateId);
  const progression = realizeHarmonyProgression(requestValue.profile.id as never, template, key);
  const bass = generateBassEvents(
    progression,
    createBassRange(normalized.bass.range as { minMidiPitch: number; maxMidiPitch: number }),
    { rhythm: normalized.bass.rhythm as never },
  );
  const arpeggiator = generateArpEventsWithPolicyV2({
    progression,
    range: createArpRange(normalized.arpeggiator.range),
    intent: normalized.intent as never,
    profile: {
      id: requestValue.profile.id as never,
      version: ARP_PROFILE_DATA_VERSION_V2,
    },
    policy: { version: ARP_POLICY_VERSION_V2 },
    seedDerivation: { version: COMPONENT_SEED_DERIVATION_VERSION_V1 },
    prng: { version: PRNG_ALGORITHM_ID },
    rootSeed: requestValue.rootSeed,
  });

  const harmony = {
    profile: progression.profile,
    templateId: progression.templateId,
    templateVersion: progression.templateVersion,
    key: { tonic: progression.key.tonic, scale: progression.key.scale },
    slots: progression.slots.map((slot) => ({
      index: slot.index,
      degree: slot.degree,
      bars: slot.bars,
      chord: { root: slot.chord.root, quality: slot.chord.quality },
      inversion: slot.inversion,
      voicing: { midiPitches: [...slot.voicing.midiPitches] },
    })),
  };
  const copyEvents = (
    events: readonly { pitch: number; startTick: number; durationTicks: number }[],
  ) =>
    events.map((event) => ({
      pitch: event.pitch,
      startTick: event.startTick,
      durationTicks: event.durationTicks,
    }));

  return detachFreeze({
    vectorId,
    normalizedRequest: normalized,
    components: {
      harmony,
      bass: copyEvents(bass),
      arpeggiator: copyEvents(arpeggiator.events),
    },
  });
}

export function captureFirstPlayableSourceMatrix(): readonly FirstPlayableSourceRecord[] {
  return Object.freeze(
    FIRST_PLAYABLE_SOURCE_MATRIX.map(({ vectorId, request: matrixRequest }) =>
      captureFirstPlayableSourceRecord(vectorId, matrixRequest),
    ),
  );
}
