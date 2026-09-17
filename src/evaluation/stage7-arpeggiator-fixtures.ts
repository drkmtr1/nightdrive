import { createHash } from "node:crypto";
import { createArpRange } from "../music-domain/arpeggiator";
import {
  ARP_POLICY_VERSION_V1,
  ARP_PROFILE_DATA_VERSION_V1,
  COMPONENT_SEED_DERIVATION_VERSION_V1,
  generateArpEventsWithPolicyV1,
} from "../music-domain/arpeggiator-policy-generator";
import type { ComplexityV1, EnergyV1 } from "../music-domain/composition-intent";
import {
  getHarmonyTemplate,
  realizeHarmonyProgression,
  type HarmonyProfileId,
} from "../music-domain/harmony";
import { createKey } from "../music-domain/key";
import { createPitchClass } from "../music-domain/pitch";
import { createMulberry32State, nextMulberry32, PRNG_ALGORITHM_ID } from "../music-domain/prng";
import { serializeStandardMidiV1 } from "../midi/adapter";
import { assembleStage7ArpeggiatorMidiIr } from "./stage7-arpeggiator-midi-ir";

export const STAGE7_EVALUATION_PROTOCOL_ID = "nightdrive.stage7-arpeggiator-evaluation.v1" as const;
export const STAGE7_FIXTURE_PACKAGE_SCHEMA =
  "nightdrive.stage7-arpeggiator-fixture-package.v1" as const;
export const STAGE7_PRESENTATION_SCHEMA = "nightdrive.stage7-arpeggiator-presentation.v1" as const;

// Evaluation source selection only. Musical policy remains owned by the public domain operation.
export const STAGE7_GOLDEN_CASES = Object.freeze([
  Object.freeze({
    id: "dark-synthwave-chorus-001",
    profileId: "dark-synthwave",
    templateId: "degree-0654-natural-minor-v1",
    scale: "natural-minor",
  }),
  Object.freeze({
    id: "classic-synthwave-chorus-001",
    profileId: "classic-synthwave",
    templateId: "degree-0344-major-v1",
    scale: "major",
  }),
  Object.freeze({
    id: "darkwave-verse-001",
    profileId: "darkwave",
    templateId: "degree-0654-natural-minor-v1",
    scale: "natural-minor",
  }),
  Object.freeze({
    id: "cyberpunk-build-001",
    profileId: "midtempo-cyberpunk",
    templateId: "degree-0654-phrygian-v1",
    scale: "phrygian",
  }),
] as const satisfies readonly {
  id: string;
  profileId: HarmonyProfileId;
  templateId: string;
  scale: string;
}[]);

export const STAGE7_EVALUATION_CONDITIONS = Object.freeze([
  Object.freeze({ energy: "medium", complexity: "medium", rootSeed: 0 }),
  Object.freeze({ energy: "very-low", complexity: "medium", rootSeed: 0 }),
  Object.freeze({ energy: "very-high", complexity: "medium", rootSeed: 0 }),
  Object.freeze({ energy: "medium", complexity: "very-low", rootSeed: 0 }),
  Object.freeze({ energy: "medium", complexity: "very-high", rootSeed: 0 }),
  Object.freeze({ energy: "medium", complexity: "medium", rootSeed: 1 }),
  Object.freeze({ energy: "medium", complexity: "medium", rootSeed: 2 }),
] as const satisfies readonly { energy: EnergyV1; complexity: ComplexityV1; rootSeed: number }[]);

export type Stage7FixtureArtifact = Readonly<{
  fixtureId: string;
  midiFilename: string;
  bytes: Uint8Array;
}>;

export type Stage7FixturePackage = Readonly<{
  manifestJson: string;
  presentationJson: string;
  fixtures: readonly Stage7FixtureArtifact[];
}>;

function json(value: unknown): string {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function presentationOrder(fixtureIds: readonly string[]): readonly string[] {
  const order = [...fixtureIds];
  let state = createMulberry32State(0);
  for (let index = order.length - 1; index > 0; index -= 1) {
    const step = nextMulberry32(state);
    state = step.state;
    const swapIndex = step.value % (index + 1);
    [order[index], order[swapIndex]] = [order[swapIndex], order[index]];
  }
  return Object.freeze(order);
}

/** Constructs derived evaluation evidence in memory; never writes a baseline package. */
export function buildStage7ArpeggiatorFixturePackage(
  generatingCommitSha: string,
): Stage7FixturePackage {
  if (!/^[0-9a-f]{40}$/.test(generatingCommitSha)) {
    throw new RangeError("generatingCommitSha must be an explicit 40-character lowercase Git SHA.");
  }

  const range = createArpRange({ minMidiPitch: 0, maxMidiPitch: 127 });
  const fixtures: Stage7FixtureArtifact[] = [];
  const manifestFixtures = [];

  for (const source of STAGE7_GOLDEN_CASES) {
    const template = getHarmonyTemplate(source.templateId);
    if (template.scale !== source.scale)
      throw new Error(`Evaluation source scale drift: ${source.id}`);
    const progression = realizeHarmonyProgression(
      source.profileId,
      template,
      createKey(createPitchClass(0), template.scale),
    );
    for (const condition of STAGE7_EVALUATION_CONDITIONS) {
      const fixtureId = `${source.id}__${condition.energy}__${condition.complexity}__seed-${condition.rootSeed}`;
      const result = generateArpEventsWithPolicyV1({
        progression,
        range,
        intent: { energy: condition.energy, complexity: condition.complexity },
        profile: { id: source.profileId, version: ARP_PROFILE_DATA_VERSION_V1 },
        policy: { version: ARP_POLICY_VERSION_V1 },
        seedDerivation: { version: COMPONENT_SEED_DERIVATION_VERSION_V1 },
        prng: { version: PRNG_ALGORITHM_ID },
        rootSeed: condition.rootSeed,
      });
      const bytes = serializeStandardMidiV1(
        assembleStage7ArpeggiatorMidiIr(progression, result.events),
      );
      const midiFilename = `${fixtureId}.mid`;
      fixtures.push(Object.freeze({ fixtureId, midiFilename, bytes }));
      manifestFixtures.push({
        fixtureId,
        goldenCaseId: source.id,
        profileId: source.profileId,
        energy: condition.energy,
        complexity: condition.complexity,
        rootSeed: condition.rootSeed,
        profileDataVersion: ARP_PROFILE_DATA_VERSION_V1,
        policyVersion: ARP_POLICY_VERSION_V1,
        seedDerivationVersion: COMPONENT_SEED_DERIVATION_VERSION_V1,
        prngVersion: PRNG_ALGORITHM_ID,
        evaluationProtocolVersion: STAGE7_EVALUATION_PROTOCOL_ID,
        midiFilename,
        midiSha256: createHash("sha256").update(bytes).digest("hex"),
        midiByteLength: bytes.byteLength,
      });
    }
  }

  const presentation = presentationOrder(fixtures.map((fixture) => fixture.fixtureId)).map(
    (fixtureId, index) => ({ label: `ND7-${String(index + 1).padStart(3, "0")}`, fixtureId }),
  );
  return Object.freeze({
    manifestJson: json({
      schema: STAGE7_FIXTURE_PACKAGE_SCHEMA,
      evaluationProtocolId: STAGE7_EVALUATION_PROTOCOL_ID,
      generatingCommitSha,
      fixtureCount: fixtures.length,
      presentationOrderSeed: 0,
      midiTransport: {
        format: 1,
        ppq: 960,
        meter: "4/4",
        microsecondsPerQuarter: 500_000,
        sectionEndTick: 30_720,
        tracks: ["conductor", "chords", "arp"],
        chordChannel: 0,
        arpChannel: 2,
        noteOnVelocity: 100,
      },
      fixtures: manifestFixtures,
    }),
    presentationJson: json({
      schema: STAGE7_PRESENTATION_SCHEMA,
      presentationOrderSeed: 0,
      entries: presentation,
    }),
    fixtures: Object.freeze(fixtures),
  });
}
