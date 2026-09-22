import { writeFileSync } from "node:fs";
import { it } from "vitest";
import { captureFirstPlayableSourceMatrix } from "./first-playable-source-capture";

const OUTPUT_ENVIRONMENT_VARIABLE = "FIRST_PLAYABLE_SOURCE_OUTPUT";

it.skipIf(process.env[OUTPUT_ENVIRONMENT_VARIABLE] === undefined)(
  "writes a candidate source-record artifact once at the explicit output path",
  () => {
    const outputPath = process.env[OUTPUT_ENVIRONMENT_VARIABLE];
    if (outputPath === undefined || outputPath.length === 0) {
      throw new Error(`${OUTPUT_ENVIRONMENT_VARIABLE} must name a new artifact path.`);
    }
    const artifact = {
      schema: "nightdrive.first-playable-source-records.v1",
      status: "CANDIDATE - NOT FROZEN OR ACCEPTED",
      vectors: captureFirstPlayableSourceMatrix(),
    };
    writeFileSync(outputPath, `${JSON.stringify(artifact, null, 2)}\n`, {
      encoding: "utf8",
      flag: "wx",
    });
  },
);
