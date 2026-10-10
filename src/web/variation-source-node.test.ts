// @vitest-environment node
import { Buffer } from "node:buffer";
import { createHash } from "node:crypto";
import process from "node:process";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  type CompleteSectionRequestV1,
  serializeCompleteSectionV1,
  verifyCompleteSectionV1,
} from "../composition/complete-section";
import * as generator from "../generators/complete-section";
import { verifyVariationSourceAdmissionV1 } from "./variation-source-node";

function request(): CompleteSectionRequestV1 {
  return {
    schema: "nightdrive.complete-section-request.v1",
    engineVersion: "nightdrive.engine.complete-section.v1",
    generatorVersion: "nightdrive.generator.complete-section.v1",
    composition: {
      schema: "nightdrive.first-playable-composition-request.v1",
      engineVersion: "nightdrive.engine.first-playable-composition.v1",
      generatorVersion: "nightdrive.generator.first-playable-composition.v1",
      profile: { id: "dark-synthwave" },
      harmony: {
        templateId: "degree-0654-natural-minor-v1",
        templateVersion: "v1",
        key: {
          tonic: 0,
          scale: "natural-minor",
        } as CompleteSectionRequestV1["composition"]["harmony"]["key"],
      },
      section: {
        tempo: {
          microsecondsPerQuarter: 500000,
        } as CompleteSectionRequestV1["composition"]["section"]["tempo"],
      },
      intent: { energy: "medium", complexity: "medium" },
      rootSeed: 0,
      bass: { range: { minMidiPitch: 36, maxMidiPitch: 60 } as never, rhythm: "sustained" },
      arpeggiator: {
        range: {
          minMidiPitch: 36,
          maxMidiPitch: 84,
        } as CompleteSectionRequestV1["composition"]["arpeggiator"]["range"],
        profile: { version: "nightdrive.genre-profile.arpeggiator.v2" },
        policy: { version: "nightdrive.arpeggiator-policy.v2" },
        seedDerivation: { version: "nightdrive.seed-derivation.component.v1" },
        prng: { version: "nightdrive.prng.mulberry32.v1" },
      },
    },
    motif: {
      schema: "nightdrive.motif-generation-request.v1",
      generatorVersion: "nightdrive.generator.motif.v1",
      profile: { version: "nightdrive.genre-profile.motif.v1" },
      policyVersion: "nightdrive.motif-policy.v1",
    },
  };
}
// Independent wire fixture. H+B+A values are transcribed from the accepted
// FIRST_PLAYABLE_CANONICAL_ORACLE.json FP-01, not complete-section generation.
// Its pitches all lie in 36..84, so the narrower request range changes no event.
// Lead is the accepted source-0 medium/medium seed-zero independent plan:
// sparse-4 / upper / chordal / none. MOTIF_MODEL's chord targeting, complete-path
// objective and exact P3 precedence give the literal path below (P1/P3 +5).
// No expected field is read from the production operation or its serializers.
const LITERAL_SECTION = {
  ppq: 960,
  barCount: 8,
  timeSignature: { schema: "nightdrive.time-signature.v1", numerator: 4, denominator: 4 },
  tempo: { schema: "nightdrive.tempo.v1", microsecondsPerQuarter: 500000 },
};
const LITERAL_COMPONENTS = {
  harmony: {
    profile: "dark-synthwave",
    templateId: "degree-0654-natural-minor-v1",
    templateVersion: "v1",
    key: { schema: "nightdrive.key.v1", tonicSemitoneClass: 0, scale: "natural-minor" },
    slots: [
      [0, 0, 0, "minor-triad", 0, [36, 39, 43]],
      [1, 6, 10, "major-triad", 1, [38, 41, 46]],
      [2, 5, 8, "major-triad", 1, [36, 39, 44]],
      [3, 4, 7, "major-triad", 2, [38, 43, 47]],
    ].map(([index, degree, root, quality, inversion, pitches]) => ({
      index,
      degree,
      bars: 2,
      chord: { schema: "nightdrive.chord.v1", rootSemitoneClass: root, quality },
      inversion: { schema: "nightdrive.chord-inversion.v1", memberIndex: inversion },
      voicing: { schema: "nightdrive.chord-voicing.v1", midiPitches: pitches },
    })),
  },
  bass: [48, 46, 44, 43].map((pitch, index) => ({
    pitch,
    startTick: index * 7680,
    durationTicks: 7680,
  })),
  arpeggiator: [
    [55, 51, 43, 39, 36, 51, 48, 43, 36, 55, 51, 43],
    [58, 53, 46, 41, 38, 53, 50, 46, 38, 58, 53, 46],
    [56, 51, 44, 39, 36, 51, 48, 44, 36, 56, 51, 44],
    [59, 55, 47, 43, 38, 55, 50, 47, 38, 59, 55, 47],
  ].flatMap((pitches, phrase) =>
    pitches.map((pitch, index) => {
      const offset = [0, 480, 1440, 1920, 2400, 3360, 3840, 4320, 5280, 5760, 6240, 7200][index];
      if (offset === undefined) throw new Error("Missing literal Arpeggiator onset.");
      return { pitch, startTick: phrase * 7680 + offset, durationTicks: 360 };
    }),
  ),
  lead: {
    plan: {
      policyVersion: "nightdrive.motif-policy.v1",
      profileVersion: "nightdrive.genre-profile.motif.v1",
      rhythmTemplate: "sparse-4",
      registerBand: "upper",
      tensionMode: "chordal",
      phrase4Displacement: "none",
      contourOffsets: [0, 1, 2, 0],
      phraseRoles: [
        "identity",
        "motif-form-repetition",
        "harmony-aware-transposition",
        "contour-preserving-response",
      ],
    },
    events: [75, 79, 79, 75, 74, 77, 77, 74, 80, 84, 84, 80, 79, 79, 79, 74].map(
      (pitch, index) => ({
        pitch,
        startTick: index * 1920,
        durationTicks: 960,
      }),
    ),
  },
};
const LITERAL_PROVENANCE = {
  profile: { id: "dark-synthwave" },
  harmonyTemplate: { id: "degree-0654-natural-minor-v1", version: "v1" },
  bass: { range: { minMidiPitch: 36, maxMidiPitch: 60 }, rhythm: "sustained" },
  arpeggiator: {
    range: { minMidiPitch: 36, maxMidiPitch: 84 },
    profile: { version: "nightdrive.genre-profile.arpeggiator.v2" },
    policy: { version: "nightdrive.arpeggiator-policy.v2" },
    seedDerivation: { version: "nightdrive.seed-derivation.component.v1" },
    prng: { version: "nightdrive.prng.mulberry32.v1" },
  },
  motif: {
    generatorVersion: "nightdrive.generator.motif.v1",
    profile: { version: "nightdrive.genre-profile.motif.v1" },
    policy: { version: "nightdrive.motif-policy.v1" },
    contour: { version: "nightdrive.motif-contour.v1" },
    rhythm: { version: "nightdrive.motif-rhythm.v1" },
    seedDerivation: { version: "nightdrive.seed-derivation.component.v1" },
    prng: { version: "nightdrive.prng.mulberry32.v1" },
    weightedChoice: { version: "nightdrive.weighted-choice.uint32-modulo.v1" },
    componentSeed: 3256624460,
  },
  intent: { energy: "medium", complexity: "medium" },
  rootSeed: 0,
  parent: null,
};
const LITERAL_COMPONENT_HASHES = {
  harmony: "223062477b0382454187436de8444f134d105e671d3f550841aa0babd7eebffb",
  bass: "18152a11fa590ae46f8db418337c080f2561c0e976462e4872137da8291185c7",
  arpeggiator: "9a38c28c2ffee6029c13ccf6645e317457a3dd6041cfd21b5539a780d1313c1f",
  lead: "26a59097472088cc3d26ccb2ca59c246b020316fe392bc6beb2e99dc1c021b1a",
};
const LITERAL_HASH_INPUT = {
  schema: "nightdrive.complete-section-result.v1",
  engineVersion: "nightdrive.engine.complete-section.v1",
  generatorVersion: "nightdrive.generator.complete-section.v1",
  section: LITERAL_SECTION,
  components: LITERAL_COMPONENTS,
  provenance: LITERAL_PROVENANCE,
  componentHashes: LITERAL_COMPONENT_HASHES,
  warnings: [],
};
const LITERAL_RESULT_HASH = "0eb122a36f7c90e6b58c4d3017d21a051a81ed54bee1b98d00a40e3adcc66fa1";
const sha256 = (json: string): string =>
  createHash("sha256").update(Buffer.from(json, "utf8")).digest("hex");

// Literal fixture reused unchanged from the accepted complete-section independent
// fixture. It is not obtained by invoking a production generator/serializer.
function wireSource() {
  return structuredClone({ ...LITERAL_HASH_INPUT, resultHash: LITERAL_RESULT_HASH });
}
// Mechanical test-side wire -> accepted value projection, no production parser.
function source(wire = wireSource()) {
  return {
    ...wire,
    section: {
      ppq: wire.section.ppq,
      barCount: wire.section.barCount,
      timeSignature: { numerator: 4, denominator: 4 },
      tempo: { microsecondsPerQuarter: wire.section.tempo.microsecondsPerQuarter },
    },
    components: {
      ...wire.components,
      harmony: {
        ...wire.components.harmony,
        key: {
          tonic: wire.components.harmony.key.tonicSemitoneClass,
          scale: wire.components.harmony.key.scale,
        },
        slots: wire.components.harmony.slots.map((slot) => ({
          ...slot,
          chord: { root: slot.chord.rootSemitoneClass, quality: slot.chord.quality },
          inversion: slot.inversion.memberIndex,
          voicing: { midiPitches: slot.voicing.midiPitches },
        })),
      },
    },
  };
}
function frozen(value: unknown): void {
  if (value === null || typeof value !== "object") return;
  expect(Object.isFrozen(value)).toBe(true);
  for (const child of Object.values(value)) frozen(child);
}
describe("pinned Node variation source admission", () => {
  const version = Object.getOwnPropertyDescriptor(process.versions, "node");
  afterEach(() => {
    vi.restoreAllMocks();
    if (version) Object.defineProperty(process.versions, "node", version);
  });

  it("executes one real replay and matches independent full bytes and hashes", async () => {
    expect(process.versions.node).toBe("24.21.0");
    const input = source();
    const req = request();
    const before = structuredClone({ input, req });
    const replay = vi.spyOn(generator, "generateCompleteSectionV1");
    const result = await verifyVariationSourceAdmissionV1(input, req);
    expect(replay).toHaveBeenCalledTimes(1);
    expect(replay.mock.calls[0]?.[0]).toEqual(req);
    expect(replay.mock.calls[0]?.[0]).not.toBe(req);
    expect({ input, req }).toEqual(before);
    expect(result.source).not.toBe(input);
    expect(result.source).not.toBe(await replay.mock.results[0]?.value);
    expect(serializeCompleteSectionV1(result.source)).toBe(JSON.stringify(wireSource()));
    expect(sha256(JSON.stringify(LITERAL_HASH_INPUT))).toBe(LITERAL_RESULT_HASH);
    for (const role of ["harmony", "bass", "arpeggiator", "lead"] as const) {
      expect(
        sha256(
          JSON.stringify({
            schema: `nightdrive.complete-section-${role}-component.v1`,
            section: LITERAL_SECTION,
            component: LITERAL_COMPONENTS[role],
          }),
        ),
      ).toBe(LITERAL_COMPONENT_HASHES[role]);
    }
    expect(Buffer.from(serializeCompleteSectionV1(result.source), "utf8")).toEqual(
      Buffer.from(JSON.stringify(wireSource()), "utf8"),
    );
    frozen(result);
    expect(Object.isFrozen(input)).toBe(false);
  });

  it("rejects a forged self-consistent source using independent recomputed hashes", async () => {
    const forged = wireSource();
    forged.section.tempo.microsecondsPerQuarter = 600000;
    for (const role of ["harmony", "bass", "arpeggiator", "lead"] as const) {
      forged.componentHashes[role] = sha256(
        JSON.stringify({
          schema: `nightdrive.complete-section-${role}-component.v1`,
          section: forged.section,
          component: forged.components[role],
        }),
      );
    }
    const { resultHash: _oldHash, ...input } = forged;
    forged.resultHash = sha256(JSON.stringify(input));
    expect(verifyCompleteSectionV1(source(forged)).resultHash).toBe(forged.resultHash);
    await expect(verifyVariationSourceAdmissionV1(source(forged), request())).rejects.toMatchObject(
      {
        code: "SOURCE_ADMISSION_MISMATCH",
        field: "source",
      },
    );
  });

  it("cannot reuse a returned snapshot or a fabricated admission claim", async () => {
    const replay = vi.spyOn(generator, "generateCompleteSectionV1");
    const first = await verifyVariationSourceAdmissionV1(source(), request());
    await verifyVariationSourceAdmissionV1(first.source, first.sourceRequest);
    expect(replay).toHaveBeenCalledTimes(2);
    await expect(
      verifyVariationSourceAdmissionV1({ ...first.source, admitted: true }, first.sourceRequest),
    ).rejects.toBeDefined();
    expect(replay).toHaveBeenCalledTimes(2);
  });

  it("snapshots inputs before pending replay and never installs replay output", async () => {
    const original = source();
    const req = request();
    let resolve!: (value: Awaited<ReturnType<typeof generator.generateCompleteSectionV1>>) => void;
    const replay = vi.spyOn(generator, "generateCompleteSectionV1").mockImplementationOnce(
      () =>
        new Promise((r) => {
          resolve = r;
        }),
    );
    const pending = verifyVariationSourceAdmissionV1(original, req);
    original.resultHash = "0".repeat(64);
    (req.composition as { rootSeed: number }).rootSeed = 99;
    expect(replay.mock.calls[0]?.[0].composition.rootSeed).toBe(0);
    resolve(verifyCompleteSectionV1(source()));
    expect((await pending).source.resultHash).toBe(LITERAL_RESULT_HASH);
  });

  it.each([undefined, null, {}, { ...request(), admitted: true }])(
    "rejects incomplete/extra retained request %j without replay",
    async (req) => {
      const replay = vi.spyOn(generator, "generateCompleteSectionV1");
      await expect(verifyVariationSourceAdmissionV1(source(), req)).rejects.toMatchObject({
        code: "INVALID_SOURCE_ADMISSION_REQUEST",
      });
      expect(replay).not.toHaveBeenCalled();
    },
  );
  it("rejects missing explicit Bass and reordered fields", async () => {
    const req = request();
    const { bass: _bass, ...composition } = req.composition;
    await expect(
      verifyVariationSourceAdmissionV1(source(), { ...req, composition }),
    ).rejects.toMatchObject({ code: "INVALID_SOURCE_ADMISSION_REQUEST" });
    await expect(
      verifyVariationSourceAdmissionV1(source(), {
        composition: req.composition,
        schema: req.schema,
        engineVersion: req.engineVersion,
        generatorVersion: req.generatorVersion,
        motif: req.motif,
      }),
    ).rejects.toMatchObject({ code: "INVALID_SOURCE_ADMISSION_REQUEST" });
  });
  it.each(["getter", "toJSON", "symbol", "function", "cycle"])(
    "rejects %s without executing caller hooks",
    async (kind) => {
      const req = request() as unknown as Record<string | symbol, unknown>;
      const hook = vi.fn();
      if (kind === "getter") Object.defineProperty(req, "schema", { get: hook, enumerable: true });
      if (kind === "toJSON") req.toJSON = hook;
      if (kind === "symbol") req[Symbol("hidden")] = 1;
      if (kind === "function") req.extra = hook;
      if (kind === "cycle") req.extra = req;
      const replay = vi.spyOn(generator, "generateCompleteSectionV1");
      await expect(verifyVariationSourceAdmissionV1(source(), req)).rejects.toMatchObject({
        code: "INVALID_VARIATION_INPUT",
      });
      expect(hook).not.toHaveBeenCalled();
      expect(replay).not.toHaveBeenCalled();
    },
  );
  it("preserves source-before-request and accepted generator error precedence", async () => {
    await expect(
      verifyVariationSourceAdmissionV1({ ...source(), resultHash: "0".repeat(64) }, {}),
    ).rejects.toMatchObject({ code: "INVALID_COMPLETE_SECTION_RESULT" });
    await expect(
      verifyVariationSourceAdmissionV1(source(), { ...request(), schema: "unsupported" }),
    ).rejects.toMatchObject({ code: "UNSUPPORTED_COMPLETE_SECTION_SCHEMA" });
  });
  it("propagates delegated failure unchanged without retry or partial result", async () => {
    const failure = new Error("test-only replay failure");
    const replay = vi.spyOn(generator, "generateCompleteSectionV1").mockRejectedValueOnce(failure);
    const installed = vi.fn();
    const promise = verifyVariationSourceAdmissionV1(source(), request());
    void promise.then(installed, () => undefined);
    await expect(promise).rejects.toBe(failure);
    expect(replay).toHaveBeenCalledTimes(1);
    expect(installed).not.toHaveBeenCalled();
  });
  it("verifies replay output before comparison or return", async () => {
    vi.spyOn(generator, "generateCompleteSectionV1").mockResolvedValueOnce({
      ...source(),
      resultHash: "0".repeat(64),
    } as never);
    await expect(verifyVariationSourceAdmissionV1(source(), request())).rejects.toMatchObject({
      code: "INVALID_COMPLETE_SECTION_RESULT",
    });
  });
  it("fails closed when the supported replay executor is unavailable", async () => {
    const exports: { generateCompleteSectionV1: unknown } = generator;
    vi.spyOn(exports, "generateCompleteSectionV1", "get").mockReturnValue(undefined);
    await expect(verifyVariationSourceAdmissionV1(source(), request())).rejects.toMatchObject({
      code: "SOURCE_ADMISSION_UNAVAILABLE",
    });
  });
  it("rejects source accessors before reading them", async () => {
    const hook = vi.fn();
    const input = source();
    Object.defineProperty(input, "components", { get: hook, enumerable: true });
    const replay = vi.spyOn(generator, "generateCompleteSectionV1");
    await expect(verifyVariationSourceAdmissionV1(input, request())).rejects.toMatchObject({
      code: "INVALID_VARIATION_INPUT",
    });
    expect(hook).not.toHaveBeenCalled();
    expect(replay).not.toHaveBeenCalled();
  });
  it("requires the exact runtime before touching inputs or generation", async () => {
    Object.defineProperty(process.versions, "node", { value: "24.20.0", configurable: true });
    const hook = vi.fn();
    const bad = Object.defineProperty({}, "schema", { get: hook });
    const replay = vi.spyOn(generator, "generateCompleteSectionV1");
    await expect(verifyVariationSourceAdmissionV1(bad, bad)).rejects.toThrow(
      "requires Node 24.21.0",
    );
    expect(hook).not.toHaveBeenCalled();
    expect(replay).not.toHaveBeenCalled();
  });
});
