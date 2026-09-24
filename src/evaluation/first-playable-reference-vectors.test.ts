import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import {
  deriveFirstPlayableReferenceVector,
  deriveFirstPlayableReferenceVectorWithRequest,
  evidenceJson,
  FIRST_PLAYABLE_REFERENCE_MANIFEST_PATH,
  FIRST_PLAYABLE_SOURCE_MANIFEST_PATH,
  FIRST_PLAYABLE_SOURCE_RECORDS_PATH,
  FIRST_PLAYABLE_VECTOR_IDS,
  sha256Bytes,
  sha256Utf8,
  utf8Length,
  validateFrozenSourceArtifact,
} from "./first-playable-reference-vectors";

type JsonRecord = Record<string, unknown>;
const EXPECTED_SOURCE_RECORDS_SHA256 =
  "3a067218a0dd9d992e236ccff5fab839fa8c14b832c3436718453f305fda1946";
const EXPECTED_SOURCE_MANIFEST_SHA256 =
  "b024ccc2e4b4507cee2614f86a117836817c91e030bc5311a98d06a4264202f1";
const EXPECTED_REFERENCE_MANIFEST_SHA256 =
  "087a23f06a1bbe5dd834b6c533de0c9a5aef9228c719667390d33458ac514a28";
const EXPECTED_VECTOR_FINGERPRINT =
  "bb2c45ed2590e257cac659bfa01e4fc84520c019f87e469f0a7e566fcb0c97a8";
const EMPTY_SHA256 = "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855";
const ASCII_SHA256 = "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad";
const UTF8_SHA256 = "4a99557e4033c3539de2eb65472017cad5f9557f7a0625a09f1c3f6e2ba69c4c";

function parsed(path: string): { bytes: Buffer; value: JsonRecord } {
  const bytes = readFileSync(path);
  return { bytes, value: JSON.parse(bytes.toString("utf8")) as JsonRecord };
}

function record(value: unknown): JsonRecord {
  if (typeof value !== "object" || value === null || Array.isArray(value))
    throw new Error("expected record");
  return value as JsonRecord;
}

function idsFromArtifact(value: JsonRecord): string[] {
  const vectors = value.vectors as JsonRecord[];
  return vectors.map((vector) => String(vector.vectorId));
}

function assertExact(actual: string, expected: string): void {
  if (actual !== expected) throw new Error("literal comparison mismatch");
}

function wrongComponentInputs(
  domain: "harmony" | "bass" | "arpeggiator",
  candidateVector: JsonRecord,
): string[] {
  const componentJson = record(candidateVector.componentJson);
  const frozen = String(componentJson[domain]);
  const canonicalRoot = JSON.parse(frozen) as JsonRecord;
  const clone = (): JsonRecord => JSON.parse(frozen) as JsonRecord;
  const wrong: string[] = [];
  const changedSchema = clone();
  changedSchema.schema = "nightdrive.stage7-arpeggiator-component.v1";
  wrong.push(JSON.stringify(changedSchema));
  const missingSection = clone();
  delete missingSection.section;
  wrong.push(JSON.stringify(missingSection));
  const appendedLineage = clone();
  appendedLineage.rootSeed = 0;
  appendedLineage.provenance = { rootSeed: 0, parent: null };
  wrong.push(JSON.stringify(appendedLineage));
  const other = domain === "harmony" ? "bass" : "harmony";
  const otherWire = JSON.parse(String(componentJson[other])) as JsonRecord;
  wrong.push(
    JSON.stringify({
      schema: canonicalRoot.schema,
      section: canonicalRoot.section,
      component: otherWire.component,
    }),
  );

  const omittedMember = clone();
  const component = omittedMember.component as JsonRecord | JsonRecord[];
  if (domain === "harmony") {
    const harmony = component as JsonRecord;
    const slots = harmony.slots as JsonRecord[];
    slots[0] = { ...(slots[0] as JsonRecord), bars: 1 };
  } else {
    const events = component as JsonRecord[];
    events[0] = {
      ...(events[0] as JsonRecord),
      durationTicks: Number(events[0]?.durationTicks) + 1,
    };
  }
  wrong.push(JSON.stringify(omittedMember));

  const reorderedWrapper = clone();
  const reorderedEntries = Object.entries(reorderedWrapper).reverse();
  wrong.push(JSON.stringify(Object.fromEntries(reorderedEntries)));
  const reorderedNested = clone();
  if (domain === "harmony") {
    const harmony = reorderedNested.component as JsonRecord;
    harmony.slots = [...(harmony.slots as JsonRecord[])];
    const firstSlot = (harmony.slots as JsonRecord[])[0] as JsonRecord;
    (harmony.slots as JsonRecord[])[0] = Object.fromEntries(Object.entries(firstSlot).reverse());
  } else {
    const events = reorderedNested.component as JsonRecord[];
    events[0] = Object.fromEntries(Object.entries(events[0] as JsonRecord).reverse());
  }
  wrong.push(JSON.stringify(reorderedNested));
  const values = clone();
  if (domain === "harmony") {
    const harmony = values.component as JsonRecord;
    const slots = harmony.slots as JsonRecord[];
    if (slots.length < 2) throw new Error("Harmony slot counterexample requires two slots");
    [slots[0], slots[1]] = [slots[1] as JsonRecord, slots[0] as JsonRecord];
  } else {
    const events = values.component as JsonRecord[];
    if (events.length < 2) throw new Error(`${domain} event counterexample requires two events`);
    [events[0], events[1]] = [events[1] as JsonRecord, events[0] as JsonRecord];
  }
  wrong.push(JSON.stringify(values));

  if (domain === "harmony") {
    const missingPrimitive = clone();
    const harmony = missingPrimitive.component as JsonRecord;
    const key = harmony.key as JsonRecord;
    harmony.key = { tonicSemitoneClass: key.tonicSemitoneClass, scale: key.scale };
    wrong.push(JSON.stringify(missingPrimitive));
  } else {
    const omittedEventKey = clone();
    const events = omittedEventKey.component as JsonRecord[];
    const first = events[0] as JsonRecord;
    delete first.durationTicks;
    wrong.push(JSON.stringify(omittedEventKey));
  }
  return wrong;
}

function wrongResultHashInputs(candidateVector: JsonRecord): string[] {
  const base = String(candidateVector.resultHashInputJson);
  const wrong: string[] = [];
  for (const value of [null, "", "0".repeat(64)]) {
    const object = JSON.parse(base) as JsonRecord;
    object.resultHash = value;
    wrong.push(JSON.stringify(object));
  }
  wrong.push(String(candidateVector.canonicalJson));
  for (const key of ["componentHashes", "provenance", "warnings"]) {
    const object = JSON.parse(base) as JsonRecord;
    delete object[key];
    wrong.push(JSON.stringify(object));
  }
  return wrong;
}

function reverseRecordOrder(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(reverseRecordOrder);
  if (typeof value !== "object" || value === null) return value;
  const entries = Object.entries(value)
    .reverse()
    .map(([key, item]) => [key, reverseRecordOrder(item)]);
  return Object.fromEntries(entries);
}

describe("First Playable independent reference semantics", () => {
  const source = parsed(FIRST_PLAYABLE_SOURCE_RECORDS_PATH);
  const sourceManifest = parsed(FIRST_PLAYABLE_SOURCE_MANIFEST_PATH);
  const referenceManifest = parsed(FIRST_PLAYABLE_REFERENCE_MANIFEST_PATH);
  const sourceVectors = source.value.vectors as JsonRecord[];
  const derivedVectors = sourceVectors.map(deriveFirstPlayableReferenceVector);

  it("qualifies independent SHA-256 and explicit UTF-8 known answers", () => {
    expect(sha256Utf8("")).toBe(EMPTY_SHA256);
    expect(sha256Utf8("abc")).toBe(ASCII_SHA256);
    expect(sha256Utf8("é")).toBe(UTF8_SHA256);
    expect(utf8Length("é")).toBe(2);
  });

  it("binds accepted source and reference artifact identities without inspecting portable inventory", () => {
    expect(source.value.status).toBe("ACCEPTED/FROZEN");
    expect(sourceManifest.value.status).toBe("ACCEPTED/FROZEN");
    expect(referenceManifest.value.status).toBe("ACCEPTED/FROZEN");
    expect(sourceVectors).toHaveLength(12);
    expect(idsFromArtifact(source.value)).toEqual(FIRST_PLAYABLE_VECTOR_IDS);
    expect(source.bytes.byteLength).toBe(124275);
    expect(sha256Bytes(source.bytes)).toBe(EXPECTED_SOURCE_RECORDS_SHA256);
    expect(sourceManifest.bytes.byteLength).toBe(27554);
    expect(sha256Bytes(sourceManifest.bytes)).toBe(EXPECTED_SOURCE_MANIFEST_SHA256);
    expect(referenceManifest.bytes.byteLength).toBe(61686);
    expect(sha256Bytes(referenceManifest.bytes)).toBe(EXPECTED_REFERENCE_MANIFEST_SHA256);
    expect(sha256Utf8(JSON.stringify(sourceVectors))).toBe(EXPECTED_VECTOR_FINGERPRINT);
    expect(validateFrozenSourceArtifact(source.value).validated.map((row) => row.vectorId)).toEqual(
      FIRST_PLAYABLE_VECTOR_IDS,
    );
  });

  it("characterizes twelve ordered independently derived rows", () => {
    expect(derivedVectors).toHaveLength(12);
    expect(derivedVectors.map((vector) => vector.vectorId)).toEqual(FIRST_PLAYABLE_VECTOR_IDS);

    derivedVectors.forEach((vector, index) => {
      expect(Object.keys(vector)).toEqual([
        "vectorId",
        "normalizedRequest",
        "componentJson",
        "resultHashInputJson",
        "canonicalJson",
        "utf8ByteLengths",
        "componentHashes",
        "resultHash",
        "canonicalUtf8Sha256",
      ]);
      expect(vector.vectorId).toBe(FIRST_PLAYABLE_VECTOR_IDS[index]);
      expect(Object.keys(record(vector.componentJson))).toEqual(["harmony", "bass", "arpeggiator"]);
      expect(Object.keys(record(vector.utf8ByteLengths))).toEqual([
        "harmony",
        "bass",
        "arpeggiator",
        "resultHashInput",
        "canonical",
      ]);
      expect(Object.keys(record(vector.componentHashes))).toEqual([
        "harmony",
        "bass",
        "arpeggiator",
      ]);
      const componentJson = record(vector.componentJson);
      for (const domain of ["harmony", "bass", "arpeggiator"] as const) {
        const literal = String(componentJson[domain]);
        expect(literal.startsWith("\ufeff")).toBe(false);
        expect(literal.endsWith("\n")).toBe(false);
        expect(JSON.stringify(JSON.parse(literal))).toBe(literal);
        expect(Buffer.byteLength(literal, "utf8")).toBe(record(vector.utf8ByteLengths)[domain]);
        expect(sha256Utf8(literal)).toBe(record(vector.componentHashes)[domain]);
      }
      const hashInput = String(vector.resultHashInputJson);
      const canonical = String(vector.canonicalJson);
      expect(hashInput.startsWith("\ufeff")).toBe(false);
      expect(hashInput.endsWith("\n")).toBe(false);
      expect(canonical.startsWith("\ufeff")).toBe(false);
      expect(canonical.endsWith("\n")).toBe(false);
      expect(JSON.stringify(JSON.parse(hashInput))).toBe(hashInput);
      expect(JSON.stringify(JSON.parse(canonical))).toBe(canonical);
      const parsedHashInput = JSON.parse(hashInput) as JsonRecord;
      const parsedCanonical = JSON.parse(canonical) as JsonRecord;
      expect(Object.keys(parsedHashInput)).toEqual([
        "schema",
        "engineVersion",
        "generatorVersion",
        "section",
        "components",
        "provenance",
        "componentHashes",
        "warnings",
      ]);
      expect(Object.hasOwn(parsedHashInput, "resultHash")).toBe(false);
      expect(Object.keys(parsedCanonical).at(-1)).toBe("resultHash");
      expect(sha256Utf8(hashInput)).toBe(vector.resultHash);
      expect(sha256Utf8(canonical)).toBe(vector.canonicalUtf8Sha256);
      expect(record(vector.utf8ByteLengths).resultHashInput).toBe(
        Buffer.byteLength(hashInput, "utf8"),
      );
      expect(record(vector.utf8ByteLengths).canonical).toBe(Buffer.byteLength(canonical, "utf8"));
      expect(parsedHashInput.warnings).toEqual([]);
      expect(record(parsedHashInput.provenance).parent).toBeNull();
    });
    expect(derivedVectors.every((vector) => !Object.hasOwn(vector, "expectedResult"))).toBe(true);
    expect(derivedVectors.every((vector) => !Object.hasOwn(vector, "plan"))).toBe(true);
  });

  it("normalizes all five Bass-default aliases against independently derived FP-01", () => {
    const sourceVector = sourceVectors[0] as JsonRecord;
    const request = record(sourceVector.normalizedRequest);
    const normalizedBass = record(request.bass);
    const baseline = derivedVectors[0] as JsonRecord;
    const aliases: JsonRecord[] = [];
    const absent = structuredClone(request);
    delete absent.bass;
    aliases.push(absent);
    aliases.push({ ...structuredClone(request), bass: {} });
    aliases.push({
      ...structuredClone(request),
      bass: { range: structuredClone(normalizedBass.range) },
    });
    aliases.push({ ...structuredClone(request), bass: { rhythm: normalizedBass.rhythm } });
    aliases.push({ ...structuredClone(request), bass: structuredClone(normalizedBass) });
    for (const alias of aliases) {
      const derived = deriveFirstPlayableReferenceVectorWithRequest(sourceVector, alias);
      expect(derived).toEqual(baseline);
      expect(derived.normalizedRequest).toEqual(record(baseline.normalizedRequest));
    }
    expect(derivedVectors).toHaveLength(12);
  });

  it("ignores caller object construction order while preserving every musical array order", () => {
    sourceVectors.forEach((vector, index) => {
      expect(deriveFirstPlayableReferenceVector(reverseRecordOrder(vector))).toEqual(
        derivedVectors[index],
      );
    });
  });

  it("rejects malformed values without executing accessors or toJSON", () => {
    for (const invalid of [
      undefined,
      Number.NaN,
      Number.POSITIVE_INFINITY,
      1n,
      Symbol("x"),
      () => 0,
    ])
      expect(() => evidenceJson({ value: invalid })).toThrow();
    const cycle: JsonRecord = {};
    cycle.self = cycle;
    expect(() => evidenceJson(cycle)).toThrow(/cycles/u);
    expect(() => evidenceJson(new Array(1))).toThrow(/sparse/u);

    let getterCalls = 0;
    const accessor: JsonRecord = {};
    Object.defineProperty(accessor, "value", {
      enumerable: true,
      get() {
        getterCalls += 1;
        return "unsafe";
      },
    });
    expect(() => evidenceJson(accessor)).toThrow(/accessors/u);
    expect(getterCalls).toBe(0);

    const toJson = vi.fn(() => "unexpected");
    expect(() => evidenceJson({ toJSON: toJson })).toThrow();
    expect(toJson).not.toHaveBeenCalled();

    const invalidVector = structuredClone(sourceVectors[0]) as JsonRecord;
    const invalidRequest = record(invalidVector.normalizedRequest);
    invalidRequest.extra = true;
    expect(() => deriveFirstPlayableReferenceVector(invalidVector)).toThrow(/exactly the keys/u);
    expect(() => evidenceJson({ negativeZero: -0 })).not.toThrow();
    expect(evidenceJson({ negativeZero: -0 })).toBe('{"negativeZero":0}');
    expect(evidenceJson({ maximumTempo: Number.MAX_SAFE_INTEGER })).toBe(
      '{"maximumTempo":9007199254740991}',
    );
  });

  it("rejects wrong component hash domains for every component", () => {
    const candidate = derivedVectors[0] as JsonRecord;
    const hashes = record(candidate.componentHashes);
    for (const domain of ["harmony", "bass", "arpeggiator"] as const) {
      const expected = String(record(candidate.componentJson)[domain]);
      for (const wrong of wrongComponentInputs(domain, candidate)) {
        expect(wrong).not.toBe(expected);
        expect(sha256Utf8(wrong)).not.toBe(hashes[domain]);
        expect(() => assertExact(wrong, expected)).toThrow(/mismatch/u);
      }
    }
  });

  it("rejects all self-containing, incomplete, and wrong result-hash inputs for every row", () => {
    for (const candidate of derivedVectors) {
      const expected = String(candidate.resultHashInputJson);
      for (const wrong of wrongResultHashInputs(candidate)) {
        expect(wrong).not.toBe(expected);
        expect(sha256Utf8(wrong)).not.toBe(candidate.resultHash);
        expect(() => assertExact(wrong, expected)).toThrow(/mismatch/u);
      }
    }
  });

  it("proves the FP-01-based component-isolation relations", () => {
    const byId = new Map(derivedVectors.map((vector) => [String(vector.vectorId), vector]));
    const vector = (id: string) => {
      const value = byId.get(id);
      if (value === undefined) throw new Error(`missing candidate row ${id}`);
      return value;
    };
    const canonical = (id: string) => JSON.parse(String(vector(id).canonicalJson)) as JsonRecord;
    const components = (id: string) => record(canonical(id).components);
    const hashes = (id: string) => record(vector(id).componentHashes);
    const componentJson = (id: string) => record(vector(id).componentJson);
    const fp1 = canonical("FP-01");

    expect(record(canonical("FP-05").section).tempo).not.toEqual(record(fp1.section).tempo);
    expect(components("FP-05")).toEqual(components("FP-01"));
    for (const domain of ["harmony", "bass", "arpeggiator"] as const) {
      expect(componentJson("FP-05")[domain]).not.toBe(componentJson("FP-01")[domain]);
      expect(hashes("FP-05")[domain]).not.toBe(hashes("FP-01")[domain]);
    }

    for (const id of ["FP-06", "FP-07", "FP-08"]) {
      expect(components(id).harmony).toEqual(components("FP-01").harmony);
      expect(components(id).bass).toEqual(components("FP-01").bass);
      expect(componentJson(id).harmony).toBe(componentJson("FP-01").harmony);
      expect(componentJson(id).bass).toBe(componentJson("FP-01").bass);
      expect(hashes(id).harmony).toBe(hashes("FP-01").harmony);
      expect(hashes(id).bass).toBe(hashes("FP-01").bass);
      expect(vector(id).resultHashInputJson).not.toBe(vector("FP-01").resultHashInputJson);
      expect(vector(id).resultHash).not.toBe(vector("FP-01").resultHash);
    }
    expect(record(vector("FP-06").normalizedRequest).rootSeed).toBe(4_294_967_295);

    expect(components("FP-09").harmony).toEqual(components("FP-01").harmony);
    expect(components("FP-09").arpeggiator).toEqual(components("FP-01").arpeggiator);
    expect(componentJson("FP-09").harmony).toBe(componentJson("FP-01").harmony);
    expect(componentJson("FP-09").arpeggiator).toBe(componentJson("FP-01").arpeggiator);
    expect(components("FP-09").bass).not.toEqual(components("FP-01").bass);
    expect(componentJson("FP-09").bass).not.toBe(componentJson("FP-01").bass);

    expect(components("FP-10").harmony).toEqual(components("FP-01").harmony);
    expect(components("FP-10").arpeggiator).toEqual(components("FP-01").arpeggiator);
    expect(components("FP-10").bass).not.toEqual(components("FP-01").bass);
    expect(componentJson("FP-10").bass).not.toBe(componentJson("FP-01").bass);

    expect(components("FP-11")).toEqual(components("FP-01"));
    expect(hashes("FP-11")).toEqual(hashes("FP-01"));
    expect(vector("FP-11").resultHashInputJson).not.toBe(vector("FP-01").resultHashInputJson);
    expect(vector("FP-11").resultHash).not.toBe(vector("FP-01").resultHash);

    expect(components("FP-12").harmony).not.toEqual(components("FP-01").harmony);
    expect(record(record(components("FP-12").harmony).key).tonicSemitoneClass).not.toBe(
      record(record(components("FP-01").harmony).key).tonicSemitoneClass,
    );
    expect(components("FP-12").bass).not.toEqual(components("FP-01").bass);
    expect(components("FP-12").arpeggiator).not.toEqual(components("FP-01").arpeggiator);
  });
});
