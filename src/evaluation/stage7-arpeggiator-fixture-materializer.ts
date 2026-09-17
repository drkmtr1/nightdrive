import { createHash } from "node:crypto";
import { mkdir, realpath, writeFile } from "node:fs/promises";
import { basename, dirname, isAbsolute, relative, resolve, sep } from "node:path";
import type { Stage7FixturePackage } from "./stage7-arpeggiator-fixtures";

type ManifestFixture = Readonly<{
  fixtureId: string;
  midiFilename: string;
  midiSha256: string;
  midiByteLength: number;
}>;

type ValidatedFixture = Readonly<{
  fixtureId: string;
  midiFilename: string;
  bytes: Uint8Array;
}>;

type BlindFixture = Readonly<{
  label: string;
  fixture: ValidatedFixture;
}>;

type ValidatedFixturePackage = Readonly<{
  fixtures: readonly ValidatedFixture[];
  blindFixtures: readonly BlindFixture[];
  manifestJson: string;
  presentationJson: string;
}>;

function isWithin(parent: string, child: string): boolean {
  const path = relative(parent, child);
  return path === "" || (!path.startsWith(`..${sep}`) && path !== ".." && !isAbsolute(path));
}

function record(value: unknown, message: string): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) throw new Error(message);
  return value as Record<string, unknown>;
}

function stringField(value: Record<string, unknown>, field: string, message: string): string {
  const candidate = value[field];
  if (typeof candidate !== "string") throw new Error(message);
  return candidate;
}

function integerField(value: Record<string, unknown>, field: string, message: string): number {
  const candidate = value[field];
  if (typeof candidate !== "number" || !Number.isSafeInteger(candidate) || candidate < 0) {
    throw new Error(message);
  }
  return candidate;
}

function validateFixturePackage(fixturePackage: Stage7FixturePackage): ValidatedFixturePackage {
  if (!Array.isArray(fixturePackage.fixtures))
    throw new Error("Fixture package has no fixture array.");

  const fixtures = fixturePackage.fixtures;
  const fixtureById = new Map<string, (typeof fixtures)[number]>();
  const canonicalFilenames = new Set<string>();
  for (const fixture of fixtures) {
    const candidate = record(fixture, "Fixture package contains an invalid fixture.");
    const fixtureId = stringField(candidate, "fixtureId", "Fixture has an invalid fixture ID.");
    const midiFilename = stringField(
      candidate,
      "midiFilename",
      "Fixture has an invalid MIDI filename.",
    );
    const bytes = candidate.bytes;
    if (!(bytes instanceof Uint8Array)) throw new Error("Fixture has invalid MIDI bytes.");
    if (fixtureById.has(fixtureId))
      throw new Error("Fixture package contains duplicate fixture IDs.");
    if (!/^[a-z0-9-]+__[a-z-]+__[a-z-]+__seed-[0-9]+\.mid$/.test(midiFilename)) {
      throw new Error("Unsafe evaluation fixture filename.");
    }
    if (canonicalFilenames.has(midiFilename)) {
      throw new Error("Fixture package contains duplicate MIDI filenames.");
    }
    fixtureById.set(fixtureId, fixture);
    canonicalFilenames.add(midiFilename);
  }

  const manifestJson = fixturePackage.manifestJson;
  const manifest = record(JSON.parse(manifestJson), "Fixture manifest must be an object.");
  if (!Array.isArray(manifest.fixtures)) throw new Error("Fixture manifest has no fixture array.");
  if (manifest.fixtures.length !== fixtures.length) {
    throw new Error("Fixture manifest does not cover all fixtures.");
  }
  const manifestById = new Map<string, ManifestFixture>();
  for (const candidate of manifest.fixtures) {
    const manifestFixture = record(candidate, "Fixture manifest contains an invalid fixture.");
    const fixtureId = stringField(
      manifestFixture,
      "fixtureId",
      "Manifest fixture has an invalid fixture ID.",
    );
    if (manifestById.has(fixtureId))
      throw new Error("Fixture manifest contains duplicate fixture IDs.");
    manifestById.set(fixtureId, {
      fixtureId,
      midiFilename: stringField(
        manifestFixture,
        "midiFilename",
        "Manifest fixture has an invalid MIDI filename.",
      ),
      midiSha256: stringField(
        manifestFixture,
        "midiSha256",
        "Manifest fixture has an invalid MIDI hash.",
      ),
      midiByteLength: integerField(
        manifestFixture,
        "midiByteLength",
        "Manifest fixture has an invalid MIDI byte length.",
      ),
    });
  }
  const validatedFixtureById = new Map<string, ValidatedFixture>();
  const validatedFixtures: ValidatedFixture[] = [];
  for (const fixture of fixtures) {
    const manifestFixture = manifestById.get(fixture.fixtureId);
    if (!manifestFixture) throw new Error("Fixture is missing from the manifest.");
    if (manifestFixture.fixtureId !== fixture.fixtureId) {
      throw new Error("Fixture manifest ID mismatch.");
    }
    if (manifestFixture.midiFilename !== fixture.midiFilename) {
      throw new Error("Fixture manifest filename mismatch.");
    }
    if (manifestFixture.midiByteLength !== fixture.bytes.byteLength) {
      throw new Error("Fixture manifest byte-length mismatch.");
    }
    if (manifestFixture.midiSha256 !== createHash("sha256").update(fixture.bytes).digest("hex")) {
      throw new Error("Fixture manifest hash mismatch.");
    }
    const validatedFixture = Object.freeze({
      fixtureId: fixture.fixtureId,
      midiFilename: fixture.midiFilename,
      bytes: Uint8Array.from(fixture.bytes),
    });
    validatedFixtureById.set(validatedFixture.fixtureId, validatedFixture);
    validatedFixtures.push(validatedFixture);
  }

  const presentationJson = fixturePackage.presentationJson;
  const presentation = record(
    JSON.parse(presentationJson),
    "Fixture presentation must be an object.",
  );
  if (!Array.isArray(presentation.entries))
    throw new Error("Fixture presentation has no entry array.");
  if (presentation.entries.length !== fixtures.length) {
    throw new Error("Presentation mapping does not cover all fixtures.");
  }
  const labels = new Set<string>();
  const mappedFixtureIds = new Set<string>();
  const blindFixtures: BlindFixture[] = [];
  for (const candidate of presentation.entries) {
    const entry = record(candidate, "Fixture presentation contains an invalid entry.");
    const label = stringField(entry, "label", "Fixture presentation has an invalid label.");
    const fixtureId = stringField(
      entry,
      "fixtureId",
      "Fixture presentation has an invalid fixture reference.",
    );
    if (!/^ND7-[0-9]{3}$/.test(label)) throw new Error("Unsafe blind label.");
    if (labels.has(label)) throw new Error("Fixture presentation contains duplicate labels.");
    const fixture = validatedFixtureById.get(fixtureId);
    if (!fixture) {
      throw new Error("Presentation mapping references an unknown fixture.");
    }
    if (mappedFixtureIds.has(fixtureId)) {
      throw new Error("Fixture presentation contains duplicate fixture references.");
    }
    labels.add(label);
    mappedFixtureIds.add(fixtureId);
    blindFixtures.push(Object.freeze({ label, fixture }));
  }
  if (mappedFixtureIds.size !== fixtureById.size) {
    throw new Error("Presentation mapping does not cover all fixtures exactly once.");
  }

  return { fixtures: validatedFixtures, blindFixtures, manifestJson, presentationJson };
}

/** Writes a completed derived package only to an explicit, not-yet-existing directory. */
export async function materializeStage7ArpeggiatorFixturePackage(
  outputDirectory: string,
  fixturePackage: Stage7FixturePackage,
): Promise<void> {
  const validated = validateFixturePackage(fixturePackage);
  if (!isAbsolute(outputDirectory)) throw new RangeError("Output directory must be absolute.");
  const target = resolve(outputDirectory);
  const repository = process.cwd();
  const actualParent = await realpath(dirname(target));
  const actualTarget = resolve(actualParent, basename(target));
  if (
    isWithin(resolve(repository, "src"), actualTarget) ||
    isWithin(resolve(repository, "docs"), actualTarget)
  ) {
    throw new RangeError("Evaluation packages cannot be written under src or docs.");
  }

  // Non-recursive mkdir fails closed even for an existing empty directory; no prior package is overwritten.
  await mkdir(target);
  const canonical = resolve(target, "canonical");
  const blind = resolve(target, "blind");
  await mkdir(canonical);
  await mkdir(blind);

  for (const fixture of validated.fixtures) {
    await writeFile(resolve(canonical, fixture.midiFilename), fixture.bytes, { flag: "wx" });
  }
  for (const blindFixture of validated.blindFixtures) {
    await writeFile(resolve(blind, `${blindFixture.label}.mid`), blindFixture.fixture.bytes, {
      flag: "wx",
    });
  }
  await writeFile(resolve(target, "manifest.json"), validated.manifestJson, { flag: "wx" });
  await writeFile(resolve(target, "presentation.json"), validated.presentationJson, { flag: "wx" });
}
