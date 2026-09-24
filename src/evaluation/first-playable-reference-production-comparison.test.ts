import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  digestFirstPlayableArpeggiatorComponentV1,
  digestFirstPlayableBassComponentV1,
  digestFirstPlayableHarmonyComponentV1,
  serializeFirstPlayableArpeggiatorComponentV1,
  serializeFirstPlayableBassComponentV1,
  serializeFirstPlayableCompositionHashInputV1,
  serializeFirstPlayableCompositionV1,
  serializeFirstPlayableHarmonyComponentV1,
} from "../composition/first-playable-composition";

type JsonRecord = Record<string, unknown>;

const ORACLE_PATH = "docs/reviews/FIRST_PLAYABLE_CANONICAL_ORACLE.json";
const FROZEN_ORACLE_SHA256 = "fbd6d9adf052e317c5e37dff8415e383b3c070684bf0eb6472af233f0a654173";
const FROZEN_VECTOR_IDS = [
  "FP-01",
  "FP-02",
  "FP-03",
  "FP-04",
  "FP-05",
  "FP-06",
  "FP-07",
  "FP-08",
  "FP-09",
  "FP-10",
  "FP-11",
  "FP-12",
];

function sha256Utf8(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

function record(value: unknown): JsonRecord {
  if (typeof value !== "object" || value === null || Array.isArray(value))
    throw new Error("expected record");
  return value as JsonRecord;
}

function assertExact(actual: string, expected: string): void {
  if (actual !== expected) throw new Error("production/reference literal comparison mismatch");
}

function productionInput(sourceVector: JsonRecord, oracleVector: JsonRecord): JsonRecord {
  const request = record(sourceVector.normalizedRequest);
  const harmonyRequest = record(request.harmony);
  const requestSection = record(request.section);
  const requestArp = record(request.arpeggiator);
  const sourceComponents = record(sourceVector.components);
  const requestBass = record(request.bass);
  const frozenHashes = record(oracleVector.componentHashes);
  return {
    schema: "nightdrive.first-playable-composition-result.v1",
    engineVersion: request.engineVersion,
    generatorVersion: request.generatorVersion,
    section: {
      ppq: 960,
      barCount: 8,
      timeSignature: { numerator: 4, denominator: 4 },
      tempo: requestSection.tempo,
    },
    components: sourceComponents,
    provenance: {
      profile: request.profile,
      harmonyTemplate: { id: harmonyRequest.templateId, version: harmonyRequest.templateVersion },
      bass: requestBass,
      arpeggiator: requestArp,
      intent: request.intent,
      rootSeed: request.rootSeed,
      parent: null,
    },
    componentHashes: frozenHashes,
    warnings: [],
    resultHash: oracleVector.resultHash,
  };
}

function resultWrongInputs(oracleVector: JsonRecord): string[] {
  const base = String(oracleVector.resultHashInputJson);
  const wrong: string[] = [];
  for (const value of [null, "", "0".repeat(64)]) {
    const object = JSON.parse(base) as JsonRecord;
    object.resultHash = value;
    wrong.push(JSON.stringify(object));
  }
  wrong.push(String(oracleVector.canonicalJson));
  for (const key of ["componentHashes", "provenance", "warnings"]) {
    const object = JSON.parse(base) as JsonRecord;
    delete object[key];
    wrong.push(JSON.stringify(object));
  }
  return wrong;
}

function componentWrongInputs(
  domain: "harmony" | "bass" | "arpeggiator",
  oracleVector: JsonRecord,
): string[] {
  const strings = record(oracleVector.componentJson);
  const base = String(strings[domain]);
  const make = () => JSON.parse(base) as JsonRecord;
  const wrong: string[] = [];
  const stage7 = make();
  stage7.schema = "nightdrive.stage7-arpeggiator-component.v1";
  wrong.push(JSON.stringify(stage7));
  const missingSection = make();
  delete missingSection.section;
  wrong.push(JSON.stringify(missingSection));
  const appended = make();
  appended.rootSeed = 0;
  appended.provenance = { parent: null };
  wrong.push(JSON.stringify(appended));
  const other = domain === "harmony" ? "bass" : "harmony";
  const otherComponent = JSON.parse(String(strings[other])) as JsonRecord;
  const root = make();
  root.component = otherComponent.component;
  wrong.push(JSON.stringify(root));
  const changed = make();
  if (domain === "harmony") {
    const harmony = changed.component as JsonRecord;
    const slots = harmony.slots as JsonRecord[];
    slots[0] = { ...(slots[0] as JsonRecord), bars: 1 };
  } else {
    const events = changed.component as JsonRecord[];
    events[0] = {
      ...(events[0] as JsonRecord),
      durationTicks: Number(events[0]?.durationTicks) + 1,
    };
  }
  wrong.push(JSON.stringify(changed));
  const reordered = make();
  wrong.push(JSON.stringify(Object.fromEntries(Object.entries(reordered).reverse())));
  const reorderedNested = make();
  if (domain === "harmony") {
    const harmony = reorderedNested.component as JsonRecord;
    const slots = harmony.slots as JsonRecord[];
    slots[0] = Object.fromEntries(Object.entries(slots[0] as JsonRecord).reverse());
  } else {
    const events = reorderedNested.component as JsonRecord[];
    events[0] = Object.fromEntries(Object.entries(events[0] as JsonRecord).reverse());
  }
  wrong.push(JSON.stringify(reorderedNested));
  const swapped = make();
  if (domain === "harmony") {
    const slots = (swapped.component as JsonRecord).slots as JsonRecord[];
    [slots[0], slots[1]] = [slots[1] as JsonRecord, slots[0] as JsonRecord];
  } else {
    const events = swapped.component as JsonRecord[];
    [events[0], events[1]] = [events[1] as JsonRecord, events[0] as JsonRecord];
  }
  wrong.push(JSON.stringify(swapped));
  if (domain === "harmony") {
    const missingPrimitive = make();
    const harmony = missingPrimitive.component as JsonRecord;
    const key = harmony.key as JsonRecord;
    harmony.key = { tonicSemitoneClass: key.tonicSemitoneClass, scale: key.scale };
    wrong.push(JSON.stringify(missingPrimitive));
  } else {
    const missingEventMember = make();
    delete ((missingEventMember.component as JsonRecord[])[0] as JsonRecord).durationTicks;
    wrong.push(JSON.stringify(missingEventMember));
  }
  return wrong;
}

describe("First Playable production serializers compared with the frozen oracle", () => {
  const sources = JSON.parse(
    readFileSync("docs/reviews/FIRST_PLAYABLE_SOURCE_RECORDS.json", "utf8"),
  ) as {
    status: unknown;
    vectors: JsonRecord[];
  };
  const oracleBytes = readFileSync(ORACLE_PATH);
  const oracle = JSON.parse(oracleBytes.toString("utf8")) as {
    status: unknown;
    vectors: JsonRecord[];
  };

  function assertFrozenEvidence(): void {
    expect(sources.status).toBe("ACCEPTED/FROZEN");
    expect(oracle.status).toBe("ACCEPTED/FROZEN");
    expect(oracleBytes.length).toBe(251750);
    expect(createHash("sha256").update(oracleBytes).digest("hex")).toBe(FROZEN_ORACLE_SHA256);
    expect(sources.vectors.map((vector) => vector.vectorId)).toEqual(FROZEN_VECTOR_IDS);
    expect(oracle.vectors.map((vector) => vector.vectorId)).toEqual(FROZEN_VECTOR_IDS);
  }

  it("requires accepted/frozen source records and the exact frozen oracle artifact", () => {
    assertFrozenEvidence();
  });

  it("matches every independently retained component/result byte string and digest", () => {
    assertFrozenEvidence();
    sources.vectors.forEach((sourceVector, index) => {
      const oracleVector = oracle.vectors[index] as JsonRecord;
      const request = record(sourceVector.normalizedRequest);
      const sectionRequest = record(request.section);
      const productionSection = {
        ppq: 960,
        barCount: 8,
        timeSignature: { numerator: 4, denominator: 4 },
        tempo: sectionRequest.tempo,
      };
      const sourceComponents = record(sourceVector.components);
      const expectedComponentStrings = record(oracleVector.componentJson);
      const expectedHashes = record(oracleVector.componentHashes);

      const harmonyJson = serializeFirstPlayableHarmonyComponentV1(
        productionSection,
        sourceComponents.harmony,
      );
      const bassJson = serializeFirstPlayableBassComponentV1(
        productionSection,
        sourceComponents.bass,
      );
      const arpeggiatorJson = serializeFirstPlayableArpeggiatorComponentV1(
        productionSection,
        sourceComponents.arpeggiator,
      );
      assertExact(harmonyJson, String(expectedComponentStrings.harmony));
      assertExact(bassJson, String(expectedComponentStrings.bass));
      assertExact(arpeggiatorJson, String(expectedComponentStrings.arpeggiator));
      expect(
        digestFirstPlayableHarmonyComponentV1(productionSection, sourceComponents.harmony),
      ).toBe(expectedHashes.harmony);
      expect(digestFirstPlayableBassComponentV1(productionSection, sourceComponents.bass)).toBe(
        expectedHashes.bass,
      );
      expect(
        digestFirstPlayableArpeggiatorComponentV1(productionSection, sourceComponents.arpeggiator),
      ).toBe(expectedHashes.arpeggiator);

      const productionResult = productionInput(sourceVector, oracleVector);
      assertExact(
        serializeFirstPlayableCompositionHashInputV1(productionResult),
        String(oracleVector.resultHashInputJson),
      );
      assertExact(
        serializeFirstPlayableCompositionV1(productionResult),
        String(oracleVector.canonicalJson),
      );
    });
  });

  it("rejects every concrete wrong component and self-exclusion expectation", () => {
    assertFrozenEvidence();
    const source = sources.vectors[0] as JsonRecord;
    const oracleVector = oracle.vectors[0] as JsonRecord;
    const request = record(source.normalizedRequest);
    const section = {
      ppq: 960,
      barCount: 8,
      timeSignature: { numerator: 4, denominator: 4 },
      tempo: record(request.section).tempo,
    };
    const components = record(source.components);
    const productionComponent = {
      harmony: serializeFirstPlayableHarmonyComponentV1(section, components.harmony),
      bass: serializeFirstPlayableBassComponentV1(section, components.bass),
      arpeggiator: serializeFirstPlayableArpeggiatorComponentV1(section, components.arpeggiator),
    };
    const frozenComponents = record(oracleVector.componentJson);
    const frozenHashes = record(oracleVector.componentHashes);
    for (const domain of ["harmony", "bass", "arpeggiator"] as const) {
      const actual = productionComponent[domain];
      const expected = String(frozenComponents[domain]);
      assertExact(actual, expected);
      for (const wrong of componentWrongInputs(domain, oracleVector)) {
        expect(wrong).not.toBe(expected);
        expect(() => assertExact(actual, wrong)).toThrow(/mismatch/u);
        expect(sha256Utf8(wrong)).not.toBe(frozenHashes[domain]);
      }
    }

    const productionResult = productionInput(source, oracleVector);
    const actualHashInput = serializeFirstPlayableCompositionHashInputV1(productionResult);
    assertExact(actualHashInput, String(oracleVector.resultHashInputJson));
    expect(Object.hasOwn(JSON.parse(actualHashInput), "resultHash")).toBe(false);
    for (const wrong of resultWrongInputs(oracleVector)) {
      expect(wrong).not.toBe(actualHashInput);
      expect(() => assertExact(actualHashInput, wrong)).toThrow(/mismatch/u);
      expect(sha256Utf8(wrong)).not.toBe(oracleVector.resultHash);
    }
    const changedResultHash = { ...productionResult, resultHash: "f".repeat(64) };
    expect(serializeFirstPlayableCompositionHashInputV1(changedResultHash)).toBe(actualHashInput);
  });
});
