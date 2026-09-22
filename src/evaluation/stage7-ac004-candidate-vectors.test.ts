import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { deriveStage7Ac004ReferenceVector } from "./stage7-ac004-reference-vectors";

type CandidateVector = {
  vectorId: string;
  status: string;
  sourceRecordId: string;
  profileId: string;
  profileVersion: string;
  policyVersion: string;
  seedDerivationVersion: string;
  prngVersion: string;
  rootSeed: number;
  intent: { energy: string; complexity: string };
  range: { minMidiPitch: number; maxMidiPitch: number };
  plan: Record<string, unknown>;
  events: Array<Record<string, number>>;
  harmonyJson: string;
  arpeggiatorJson: string;
  aggregateHashInputJson: string;
  aggregateJson: string;
  byteLengths: { harmony: number; arpeggiator: number; aggregate: number };
  harmonySha256: string;
  arpeggiatorSha256: string;
  resultHash: string;
};

type CandidateArtifact = {
  schema: string;
  status: string;
  generatedBy: string;
  matrix: {
    mediumMediumCount: number;
    nonMediumCount: number;
    versions: string[];
    sourceRecordIds: string[];
    rootSeeds: number[];
  };
  vectors: CandidateVector[];
};

const artifact = JSON.parse(
  readFileSync("docs/reviews/STAGE7_AC004_CANDIDATE_GOLDEN_VECTORS.json", "utf8"),
) as CandidateArtifact;
const sourceIds = [
  "dark-synthwave-chorus-001",
  "classic-synthwave-chorus-001",
  "darkwave-verse-001",
  "cyberpunk-build-001",
] as const;
const profileBySource: Record<string, string> = {
  "dark-synthwave-chorus-001": "dark-synthwave",
  "classic-synthwave-chorus-001": "classic-synthwave",
  "darkwave-verse-001": "darkwave",
  "cyberpunk-build-001": "midtempo-cyberpunk",
};

describe("Stage 7 AC-004 candidate golden vectors", () => {
  it("contains the complete unaccepted matrix and literal evidence", () => {
    expect(artifact.schema).toBe("nightdrive.stage7-ac004-candidate-golden-vectors.v1");
    expect(artifact.status).toBe("ACCEPTED/FROZEN AC-004 ORACLE EVIDENCE");
    expect(artifact.generatedBy).toBe("src/evaluation/stage7-ac004-reference-vectors.ts");
    expect(artifact.matrix).toEqual({
      mediumMediumCount: 16,
      nonMediumCount: 1,
      versions: ["v1", "v2"],
      sourceRecordIds: [...sourceIds],
      rootSeeds: [0, 0xffffffff],
    });
    expect(artifact.vectors).toHaveLength(17);
    expect(new Set(artifact.vectors.map((vector) => vector.vectorId)).size).toBe(17);

    const medium = artifact.vectors.filter(
      (vector) => vector.intent.energy === "medium" && vector.intent.complexity === "medium",
    );
    expect(medium).toHaveLength(16);
    expect(
      new Set(
        medium.map(
          (vector) => `${vector.sourceRecordId}|${vector.profileVersion}|${vector.rootSeed}`,
        ),
      ).size,
    ).toBe(16);
    expect(
      new Set(medium.map((vector) => `${vector.sourceRecordId}|${vector.profileVersion}`)),
    ).toEqual(
      new Set(
        sourceIds.flatMap((sourceRecordId) => [
          `${sourceRecordId}|nightdrive.genre-profile.arpeggiator.v1`,
          `${sourceRecordId}|nightdrive.genre-profile.arpeggiator.v2`,
        ]),
      ),
    );
    expect(new Set(medium.map((vector) => vector.rootSeed))).toEqual(new Set([0, 0xffffffff]));

    const nonMedium = artifact.vectors.filter(
      (vector) => vector.intent.energy !== "medium" || vector.intent.complexity !== "medium",
    );
    expect(nonMedium).toHaveLength(1);
    expect(nonMedium[0]?.sourceRecordId).toBe("cyberpunk-build-001");
    expect(nonMedium[0]?.profileVersion).toBe("nightdrive.genre-profile.arpeggiator.v1");
    for (const vector of artifact.vectors) {
      expect(vector.status).toBe("ACCEPTED/FROZEN AC-004 ORACLE EVIDENCE");
      expect(vector.profileId).toBe(profileBySource[vector.sourceRecordId]);
      expect(vector.harmonyJson).toEqual(expect.any(String));
      expect(vector.arpeggiatorJson).toEqual(expect.any(String));
      expect(vector.aggregateHashInputJson).toEqual(expect.any(String));
      expect(vector.aggregateJson).toEqual(expect.any(String));
      expect(vector.harmonySha256).toMatch(/^[0-9a-f]{64}$/);
      expect(vector.arpeggiatorSha256).toMatch(/^[0-9a-f]{64}$/);
      expect(vector.resultHash).toMatch(/^[0-9a-f]{64}$/);
      expect(vector.byteLengths).toEqual({
        harmony: new TextEncoder().encode(vector.harmonyJson).byteLength,
        arpeggiator: new TextEncoder().encode(vector.arpeggiatorJson).byteLength,
        aggregate: new TextEncoder().encode(vector.aggregateJson).byteLength,
      });
    }
  });

  it("matches repeated independent derivation without an update path", () => {
    for (const vector of artifact.vectors) {
      const derived = deriveStage7Ac004ReferenceVector({
        sourceRecordId: vector.sourceRecordId,
        version: vector.profileVersion.endsWith(".v1") ? "v1" : "v2",
        energy: vector.intent.energy as "very-low" | "low" | "medium" | "high" | "very-high",
        complexity: vector.intent.complexity as
          | "very-low"
          | "low"
          | "medium"
          | "high"
          | "very-high",
        rootSeed: vector.rootSeed,
        range: vector.range,
      });
      expect(derived.plan).toEqual(vector.plan);
      expect(derived.events).toEqual(vector.events);
      expect(derived.harmonyJson).toBe(vector.harmonyJson);
      expect(derived.arpeggiatorJson).toBe(vector.arpeggiatorJson);
      expect(derived.aggregateHashInputJson).toBe(vector.aggregateHashInputJson);
      expect(derived.aggregateJson).toBe(vector.aggregateJson);
      expect(derived.byteLengths).toEqual(vector.byteLengths);
      expect(derived.harmonySha256).toBe(vector.harmonySha256);
      expect(derived.arpeggiatorSha256).toBe(vector.arpeggiatorSha256);
      expect(derived.resultHash).toBe(vector.resultHash);
    }
  });
});
