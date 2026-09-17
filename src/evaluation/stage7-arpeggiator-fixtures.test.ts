// @vitest-environment node

import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdtemp, readFile, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { parseMidi } from "midi-file";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { createArpRange } from "../music-domain/arpeggiator";
import {
  ARP_POLICY_VERSION_V1,
  ARP_PROFILE_DATA_VERSION_V1,
  COMPONENT_SEED_DERIVATION_VERSION_V1,
  generateArpEventsWithPolicyV1,
} from "../music-domain/arpeggiator-policy-generator";
import { getHarmonyTemplate, realizeHarmonyProgression } from "../music-domain/harmony";
import { createKey } from "../music-domain/key";
import { createPitchClass } from "../music-domain/pitch";
import { PRNG_ALGORITHM_ID } from "../music-domain/prng";
import { serializeStandardMidiV1 } from "../midi/adapter";
import { materializeStage7ArpeggiatorFixturePackage } from "./stage7-arpeggiator-fixture-materializer";
import {
  buildStage7ArpeggiatorFixturePackage,
  STAGE7_EVALUATION_CONDITIONS,
  STAGE7_EVALUATION_PROTOCOL_ID,
  STAGE7_FIXTURE_PACKAGE_SCHEMA,
  STAGE7_GOLDEN_CASES,
  STAGE7_PRESENTATION_SCHEMA,
  type Stage7FixturePackage,
} from "./stage7-arpeggiator-fixtures";
import { assembleStage7ArpeggiatorMidiIr } from "./stage7-arpeggiator-midi-ir";

const COMMIT = "504a3912335011bda7683926ee4e751c866a0ec5";
const OTHER_COMMIT = "a".repeat(40);
let fixturePackage: Stage7FixturePackage;
let replay: Stage7FixturePackage;

beforeAll(() => {
  const random = vi.spyOn(Math, "random").mockImplementation(() => {
    throw new Error("ambient randomness must not be consulted");
  });
  try {
    fixturePackage = buildStage7ArpeggiatorFixturePackage(COMMIT);
    replay = buildStage7ArpeggiatorFixturePackage(COMMIT);
  } finally {
    random.mockRestore();
  }
});

function manifest() {
  return JSON.parse(fixturePackage.manifestJson) as {
    schema: string;
    evaluationProtocolId: string;
    generatingCommitSha: string;
    fixtureCount: number;
    presentationOrderSeed: number;
    midiTransport: Record<string, unknown>;
    fixtures: {
      fixtureId: string;
      goldenCaseId: string;
      profileId: string;
      energy: string;
      complexity: string;
      rootSeed: number;
      profileDataVersion: string;
      policyVersion: string;
      seedDerivationVersion: string;
      prngVersion: string;
      evaluationProtocolVersion: string;
      midiFilename: string;
      midiSha256: string;
      midiByteLength: number;
    }[];
  };
}

function presentation() {
  return JSON.parse(fixturePackage.presentationJson) as {
    schema: string;
    presentationOrderSeed: number;
    entries: { label: string; fixtureId: string }[];
  };
}

function json(value: unknown): string {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function withManifestMutation(
  packageValue: Stage7FixturePackage,
  mutate: (value: { fixtures: Record<string, unknown>[] }) => void,
): Stage7FixturePackage {
  const value = JSON.parse(packageValue.manifestJson) as { fixtures: Record<string, unknown>[] };
  mutate(value);
  return { ...packageValue, manifestJson: json(value) };
}

function withPresentationMutation(
  packageValue: Stage7FixturePackage,
  mutate: (value: { entries: { label: string; fixtureId: string }[] }) => void,
): Stage7FixturePackage {
  const value = JSON.parse(packageValue.presentationJson) as {
    entries: { label: string; fixtureId: string }[];
  };
  mutate(value);
  return { ...packageValue, presentationJson: json(value) };
}

async function expectPreflightFailureBeforeOutputCreation(packageValue: Stage7FixturePackage) {
  const root = await mkdtemp(join(tmpdir(), "nightdrive-stage7-fixture-preflight-"));
  const destination = join(root, "package");
  try {
    await expect(
      materializeStage7ArpeggiatorFixturePackage(destination, packageValue),
    ).rejects.toThrow();
    expect(existsSync(destination)).toBe(false);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

describe("Stage 7 evaluation fixture package construction", () => {
  it("encodes exactly the accepted four source records and their canonical reconstruction", () => {
    expect(STAGE7_GOLDEN_CASES).toEqual([
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
    ]);
    for (const source of STAGE7_GOLDEN_CASES) {
      const template = getHarmonyTemplate(source.templateId);
      const progression = realizeHarmonyProgression(
        source.profileId,
        template,
        createKey(createPitchClass(0), template.scale),
      );
      expect({
        profile: progression.profile,
        templateId: progression.templateId,
        templateVersion: progression.templateVersion,
        tonic: progression.key.tonic,
        scale: progression.key.scale,
        bars: progression.slots.reduce((sum, slot) => sum + slot.bars, 0),
      }).toEqual({
        profile: source.profileId,
        templateId: source.templateId,
        templateVersion: "v1",
        tonic: 0,
        scale: source.scale,
        bars: 8,
      });
    }
  });

  it("uses exactly the closed seven-condition order and 28 durable source IDs", () => {
    expect(STAGE7_EVALUATION_CONDITIONS).toEqual([
      { energy: "medium", complexity: "medium", rootSeed: 0 },
      { energy: "very-low", complexity: "medium", rootSeed: 0 },
      { energy: "very-high", complexity: "medium", rootSeed: 0 },
      { energy: "medium", complexity: "very-low", rootSeed: 0 },
      { energy: "medium", complexity: "very-high", rootSeed: 0 },
      { energy: "medium", complexity: "medium", rootSeed: 1 },
      { energy: "medium", complexity: "medium", rootSeed: 2 },
    ]);
    const expected = STAGE7_GOLDEN_CASES.flatMap((source) =>
      STAGE7_EVALUATION_CONDITIONS.map(
        (condition) =>
          `${source.id}__${condition.energy}__${condition.complexity}__seed-${condition.rootSeed}`,
      ),
    );
    expect(fixturePackage.fixtures.map((fixture) => fixture.fixtureId)).toEqual(expected);
    expect(new Set(expected).size).toBe(28);
  });

  it("uses the public generation, accepted assembler and serializer without mutating domain values", () => {
    const source = STAGE7_GOLDEN_CASES[0];
    const template = getHarmonyTemplate(source.templateId);
    const progression = realizeHarmonyProgression(
      source.profileId,
      template,
      createKey(createPitchClass(0), template.scale),
    );
    const range = createArpRange({ minMidiPitch: 0, maxMidiPitch: 127 });
    const request = Object.freeze({
      progression,
      range,
      intent: Object.freeze({ energy: "medium", complexity: "medium" }),
      profile: Object.freeze({ id: source.profileId, version: ARP_PROFILE_DATA_VERSION_V1 }),
      policy: Object.freeze({ version: ARP_POLICY_VERSION_V1 }),
      seedDerivation: Object.freeze({ version: COMPONENT_SEED_DERIVATION_VERSION_V1 }),
      prng: Object.freeze({ version: PRNG_ALGORITHM_ID }),
      rootSeed: 0,
    } as const);
    const before = JSON.stringify(request);
    const generated = generateArpEventsWithPolicyV1(request);
    const expectedBytes = serializeStandardMidiV1(
      assembleStage7ArpeggiatorMidiIr(progression, generated.events),
    );
    expect(fixturePackage.fixtures[0].bytes).toEqual(expectedBytes);
    expect(JSON.stringify(request)).toBe(before);
  });

  it("serializes every fixture to valid Format 1/960 MIDI bytes with matching hashes and lengths", () => {
    const data = manifest();
    expect(data).toMatchObject({
      schema: STAGE7_FIXTURE_PACKAGE_SCHEMA,
      evaluationProtocolId: STAGE7_EVALUATION_PROTOCOL_ID,
      generatingCommitSha: COMMIT,
      fixtureCount: 28,
      presentationOrderSeed: 0,
    });
    expect(data.midiTransport).toEqual({
      format: 1,
      ppq: 960,
      meter: "4/4",
      microsecondsPerQuarter: 500_000,
      sectionEndTick: 30_720,
      tracks: ["conductor", "chords", "arp"],
      chordChannel: 0,
      arpChannel: 2,
      noteOnVelocity: 100,
    });
    for (const [index, fixture] of fixturePackage.fixtures.entries()) {
      const parsed = parseMidi(fixture.bytes);
      expect(parsed.header).toMatchObject({ format: 1, numTracks: 3, ticksPerBeat: 960 });
      expect(parsed.tracks).toHaveLength(3);
      const record = data.fixtures[index];
      expect(record).toMatchObject({
        fixtureId: fixture.fixtureId,
        midiFilename: fixture.midiFilename,
        profileDataVersion: ARP_PROFILE_DATA_VERSION_V1,
        policyVersion: ARP_POLICY_VERSION_V1,
        seedDerivationVersion: COMPONENT_SEED_DERIVATION_VERSION_V1,
        prngVersion: PRNG_ALGORITHM_ID,
        evaluationProtocolVersion: STAGE7_EVALUATION_PROTOCOL_ID,
        midiByteLength: fixture.bytes.byteLength,
        midiSha256: createHash("sha256").update(fixture.bytes).digest("hex"),
      });
      expect(record.fixtureId).toBe(
        `${record.goldenCaseId}__${record.energy}__${record.complexity}__seed-${record.rootSeed}`,
      );
      expect(fixture.bytes.byteLength).toBeGreaterThan(100);
    }
  });

  it("replays byte-identical MIDI, manifest and mapping without time, UUID or ambient random fields", () => {
    expect(replay.manifestJson).toBe(fixturePackage.manifestJson);
    expect(replay.presentationJson).toBe(fixturePackage.presentationJson);
    expect(replay.fixtures.map((fixture) => fixture.bytes)).toEqual(
      fixturePackage.fixtures.map((fixture) => fixture.bytes),
    );
    expect(fixturePackage.manifestJson).not.toMatch(/timestamp|generatedAt|uuid/i);
    expect(fixturePackage.presentationJson).not.toMatch(/timestamp|generatedAt|uuid/i);
  });

  it("uses an independent seed-zero permutation and opaque, unique blind labels", () => {
    const mapping = presentation();
    expect(mapping).toMatchObject({ schema: STAGE7_PRESENTATION_SCHEMA, presentationOrderSeed: 0 });
    expect(mapping.entries.map((entry) => entry.label)).toEqual(
      Array.from({ length: 28 }, (_, index) => `ND7-${String(index + 1).padStart(3, "0")}`),
    );
    expect(new Set(mapping.entries.map((entry) => entry.fixtureId))).toEqual(
      new Set(fixturePackage.fixtures.map((fixture) => fixture.fixtureId)),
    );
    expect(mapping.entries.map((entry) => entry.fixtureId)).not.toEqual(
      fixturePackage.fixtures.map((fixture) => fixture.fixtureId),
    );
    for (const entry of mapping.entries) expect(`${entry.label}.mid`).toMatch(/^ND7-\d{3}\.mid$/);
  });

  it("changes only explicit generating-commit metadata when that SHA changes", () => {
    const changed = buildStage7ArpeggiatorFixturePackage(OTHER_COMMIT);
    expect(changed.presentationJson).toBe(fixturePackage.presentationJson);
    expect(changed.fixtures.map((fixture) => fixture.bytes)).toEqual(
      fixturePackage.fixtures.map((fixture) => fixture.bytes),
    );
    const originalManifest = manifest();
    const changedManifest = JSON.parse(changed.manifestJson);
    expect(changedManifest).toEqual({ ...originalManifest, generatingCommitSha: OTHER_COMMIT });
  });

  it("rejects implicit or malformed generating commit metadata", () => {
    expect(() => buildStage7ArpeggiatorFixturePackage("")).toThrow(RangeError);
    expect(() => buildStage7ArpeggiatorFixturePackage("HEAD")).toThrow(RangeError);
  });
});

describe("explicit-directory evaluation materialization", () => {
  it("writes only within a fresh temporary directory, with blind bytes equal to mapped canonical bytes", async () => {
    const root = await mkdtemp(join(tmpdir(), "nightdrive-stage7-fixtures-"));
    const destination = join(root, "package");
    try {
      await materializeStage7ArpeggiatorFixturePackage(destination, fixturePackage);
      expect((await readdir(destination)).sort()).toEqual([
        "blind",
        "canonical",
        "manifest.json",
        "presentation.json",
      ]);
      expect(await readFile(join(destination, "manifest.json"), "utf8")).toBe(
        fixturePackage.manifestJson,
      );
      expect(await readFile(join(destination, "presentation.json"), "utf8")).toBe(
        fixturePackage.presentationJson,
      );
      expect(await readdir(join(destination, "canonical"))).toHaveLength(28);
      expect(await readdir(join(destination, "blind"))).toEqual(
        presentation().entries.map((entry) => `${entry.label}.mid`),
      );
      const byId = new Map(fixturePackage.fixtures.map((fixture) => [fixture.fixtureId, fixture]));
      for (const entry of presentation().entries) {
        const fixture = byId.get(entry.fixtureId);
        expect(fixture).toBeDefined();
        expect(
          Uint8Array.from(await readFile(join(destination, "blind", `${entry.label}.mid`))),
        ).toEqual(fixture?.bytes);
        expect(
          Uint8Array.from(
            await readFile(join(destination, "canonical", fixture?.midiFilename ?? "")),
          ),
        ).toEqual(fixture?.bytes);
      }
      await expect(
        materializeStage7ArpeggiatorFixturePackage(destination, fixturePackage),
      ).rejects.toThrow();
      expect(await readFile(join(destination, "manifest.json"), "utf8")).toBe(
        fixturePackage.manifestJson,
      );
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("rejects implicit/relative and source-tree output targets", async () => {
    await expect(
      materializeStage7ArpeggiatorFixturePackage("package", fixturePackage),
    ).rejects.toThrow(RangeError);
    await expect(
      materializeStage7ArpeggiatorFixturePackage(
        join(process.cwd(), "src", "package"),
        fixturePackage,
      ),
    ).rejects.toThrow(RangeError);
    await expect(
      materializeStage7ArpeggiatorFixturePackage(
        join(process.cwd(), "docs", "package"),
        fixturePackage,
      ),
    ).rejects.toThrow(RangeError);
  });

  it("rejects mutated fixture bytes before creating the output directory", async () => {
    const packageValue = buildStage7ArpeggiatorFixturePackage(COMMIT);
    packageValue.fixtures[0].bytes[0] ^= 0xff;
    await expectPreflightFailureBeforeOutputCreation(packageValue);
  });

  it("rejects stale manifest hashes before creating the output directory", async () => {
    const packageValue = withManifestMutation(
      buildStage7ArpeggiatorFixturePackage(COMMIT),
      (value) => {
        value.fixtures[0].midiSha256 = "0".repeat(64);
      },
    );
    await expectPreflightFailureBeforeOutputCreation(packageValue);
  });

  it("rejects stale manifest byte lengths before creating the output directory", async () => {
    const packageValue = withManifestMutation(
      buildStage7ArpeggiatorFixturePackage(COMMIT),
      (value) => {
        value.fixtures[0].midiByteLength = Number(value.fixtures[0].midiByteLength) + 1;
      },
    );
    await expectPreflightFailureBeforeOutputCreation(packageValue);
  });

  it("rejects manifest filename mismatches before creating the output directory", async () => {
    const packageValue = withManifestMutation(
      buildStage7ArpeggiatorFixturePackage(COMMIT),
      (value) => {
        value.fixtures[0].midiFilename = "mismatched.mid";
      },
    );
    await expectPreflightFailureBeforeOutputCreation(packageValue);
  });

  it("rejects duplicate blind labels before creating the output directory", async () => {
    const packageValue = withPresentationMutation(
      buildStage7ArpeggiatorFixturePackage(COMMIT),
      (value) => {
        value.entries[1].label = value.entries[0].label;
      },
    );
    await expectPreflightFailureBeforeOutputCreation(packageValue);
  });

  it("rejects duplicate and missing blind fixture references before creating the output directory", async () => {
    const packageValue = withPresentationMutation(
      buildStage7ArpeggiatorFixturePackage(COMMIT),
      (value) => {
        value.entries[1].fixtureId = value.entries[0].fixtureId;
      },
    );
    await expectPreflightFailureBeforeOutputCreation(packageValue);
  });

  it("rejects duplicate canonical filenames before creating the output directory", async () => {
    const original = buildStage7ArpeggiatorFixturePackage(COMMIT);
    const duplicateFilename = original.fixtures[0].midiFilename;
    const fixtures = original.fixtures.map((fixture, index) =>
      index === 1 ? { ...fixture, midiFilename: duplicateFilename } : fixture,
    );
    const packageValue = withManifestMutation({ ...original, fixtures }, (value) => {
      value.fixtures[1].midiFilename = duplicateFilename;
    });
    await expectPreflightFailureBeforeOutputCreation(packageValue);
  });
});
