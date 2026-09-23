import { readFileSync, writeFileSync } from "node:fs";
import { it } from "vitest";
import {
  buildFirstPlayableOracle,
  FIRST_PLAYABLE_REFERENCE_MANIFEST_PATH,
  FIRST_PLAYABLE_SOURCE_MANIFEST_PATH,
  FIRST_PLAYABLE_SOURCE_RECORDS_PATH,
  sha256Bytes,
} from "./first-playable-reference-vectors";

const OUTPUT_VARIABLE = "FIRST_PLAYABLE_REFERENCE_OUTPUT";
const MANIFEST_VARIABLE = "FIRST_PLAYABLE_REFERENCE_MANIFEST_INPUT";

it.skipIf(process.env[OUTPUT_VARIABLE] === undefined)(
  "writes the candidate oracle only to the explicit new output path",
  () => {
    const outputPath = process.env[OUTPUT_VARIABLE];
    if (outputPath === undefined || outputPath.length === 0)
      throw new Error(`${OUTPUT_VARIABLE} must name a new artifact path.`);
    const sourceRecordsBytes = readFileSync(FIRST_PLAYABLE_SOURCE_RECORDS_PATH);
    const sourceManifestBytes = readFileSync(FIRST_PLAYABLE_SOURCE_MANIFEST_PATH);
    const manifestPath = process.env[MANIFEST_VARIABLE] ?? FIRST_PLAYABLE_REFERENCE_MANIFEST_PATH;
    const referenceManifestBytes = readFileSync(manifestPath);
    const sourceArtifact = JSON.parse(sourceRecordsBytes.toString("utf8")) as unknown;
    const sourceManifestSha256 = sha256Bytes(sourceManifestBytes);
    const referenceManifestSha256 = sha256Bytes(referenceManifestBytes);
    const candidate = buildFirstPlayableOracle(
      sourceArtifact,
      sourceManifestSha256,
      referenceManifestSha256,
    );
    const output = `${JSON.stringify(candidate, null, 2)}\n`;
    writeFileSync(outputPath, output, { encoding: "utf8", flag: "wx" });
  },
);
