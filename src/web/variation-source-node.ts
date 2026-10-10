import { Buffer } from "node:buffer";
import process from "node:process";
import {
  type CompleteSectionRequestV1,
  type CompleteSectionResultV1,
  serializeCompleteSectionV1,
  verifyCompleteSectionV1,
} from "../composition/complete-section";
import { generateCompleteSectionV1 } from "../generators/complete-section";

export class VariationSourceAdmissionError extends RangeError {
  constructor(
    readonly code:
      | "INVALID_VARIATION_INPUT"
      | "INVALID_SOURCE_ADMISSION_REQUEST"
      | "SOURCE_ADMISSION_MISMATCH"
      | "SOURCE_ADMISSION_UNAVAILABLE",
    readonly field: string,
  ) {
    super(`Variation source admission failed at ${field}.`);
    this.name = "VariationSourceAdmissionError";
  }
}

// Local boundary copy, not a canonical serializer or reusable admission token.
// Inspect descriptors before observing data; freeze only the detached copy.
function snapshot(value: unknown, path: string, ancestors = new Set<object>()): unknown {
  if (
    value === undefined ||
    value === null ||
    typeof value === "string" ||
    typeof value === "boolean"
  )
    return value;
  if (typeof value === "number") return Object.is(value, -0) ? 0 : value;
  const fail = (): never => {
    throw new VariationSourceAdmissionError("INVALID_VARIATION_INPUT", path);
  };
  if (typeof value !== "object" || value === null || ancestors.has(value)) return fail();
  const array = Array.isArray(value);
  if (
    Object.getPrototypeOf(value) !== (array ? Array.prototype : Object.prototype) &&
    !(Object.getPrototypeOf(value) === null && !array)
  )
    return fail();
  if (Object.getOwnPropertySymbols(value).length) return fail();
  ancestors.add(value);
  const result: Record<string, unknown> | unknown[] = array ? [] : {};
  const names = Object.getOwnPropertyNames(value);
  if (
    array &&
    (names.length !== value.length + 1 ||
      names.some((name, index) => name !== (index === value.length ? "length" : String(index))))
  )
    return fail();
  for (const name of names) {
    if (array && name === "length") continue;
    const descriptor = Object.getOwnPropertyDescriptor(value, name);
    if (!descriptor || !("value" in descriptor) || !descriptor.enumerable || name === "toJSON")
      return fail();
    Object.defineProperty(result, name, {
      value: snapshot(descriptor.value, `${path}.${name}`, ancestors),
      enumerable: true,
    });
  }
  ancestors.delete(value);
  return Object.freeze(result);
}

// Exact retained-request shape/order. Existing generator owns value/version
// validation and its historical error precedence; optional bass is explicit here.
const requestShape = {
  schema: null,
  engineVersion: null,
  generatorVersion: null,
  composition: {
    schema: null,
    engineVersion: null,
    generatorVersion: null,
    profile: { id: null },
    harmony: { templateId: null, templateVersion: null, key: { tonic: null, scale: null } },
    section: { tempo: { microsecondsPerQuarter: null } },
    intent: { energy: null, complexity: null },
    rootSeed: null,
    bass: { range: { minMidiPitch: null, maxMidiPitch: null }, rhythm: null },
    arpeggiator: {
      range: { minMidiPitch: null, maxMidiPitch: null },
      profile: { version: null },
      policy: { version: null },
      seedDerivation: { version: null },
      prng: { version: null },
    },
  },
  motif: { schema: null, generatorVersion: null, profile: { version: null }, policyVersion: null },
};
function requireRequest(value: unknown, shape: object = requestShape): void {
  if (
    typeof value !== "object" ||
    value === null ||
    Array.isArray(value) ||
    JSON.stringify(Object.keys(value)) !== JSON.stringify(Object.keys(shape))
  ) {
    throw new VariationSourceAdmissionError("INVALID_SOURCE_ADMISSION_REQUEST", "sourceRequest");
  }
  for (const [key, child] of Object.entries(shape)) {
    if (child !== null) requireRequest((value as Record<string, unknown>)[key], child);
  }
}

/** Each invocation freshly verifies equivalence to accepted deterministic generation.
 * Returned data is NOT an admission receipt/context and cannot bypass later replay.
 * No historical invocation or author identity is established.
 */
export async function verifyVariationSourceAdmissionV1(
  source: unknown,
  sourceRequest: unknown,
): Promise<Readonly<{ source: CompleteSectionResultV1; sourceRequest: CompleteSectionRequestV1 }>> {
  if (process.versions.node !== "24.21.0") {
    throw new Error("Variation source admission requires Node 24.21.0.");
  }
  // Snapshot all consumed input before source/request semantic validation or await.
  const supplied = snapshot(source, "source");
  const request = snapshot(sourceRequest, "sourceRequest");
  const verified = verifyCompleteSectionV1(supplied);
  requireRequest(request);
  if (typeof generateCompleteSectionV1 !== "function") {
    throw new VariationSourceAdmissionError("SOURCE_ADMISSION_UNAVAILABLE", "sourceRequest");
  }
  const replay = verifyCompleteSectionV1(
    await generateCompleteSectionV1(request as CompleteSectionRequestV1),
  );
  const sameBytes = Buffer.from(serializeCompleteSectionV1(verified), "utf8").equals(
    Buffer.from(serializeCompleteSectionV1(replay), "utf8"),
  );
  if (
    !sameBytes ||
    verified.resultHash !== replay.resultHash ||
    (Object.keys(verified.componentHashes) as (keyof typeof verified.componentHashes)[]).some(
      (role) => verified.componentHashes[role] !== replay.componentHashes[role],
    )
  ) {
    throw new VariationSourceAdmissionError("SOURCE_ADMISSION_MISMATCH", "source");
  }
  return Object.freeze({ source: verified, sourceRequest: request as CompleteSectionRequestV1 });
}
