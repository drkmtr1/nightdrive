import { createHash } from "node:crypto";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  COMPLETE_SECTION_ENGINE_VERSION_V1,
  COMPLETE_SECTION_GENERATOR_VERSION_V1,
  COMPLETE_SECTION_REQUEST_SCHEMA_V1,
  CompleteSectionValueError,
  serializeCompleteSectionArpeggiatorComponentV1,
  serializeCompleteSectionBassComponentV1,
  serializeCompleteSectionHarmonyComponentV1,
  serializeCompleteSectionHashInputV1,
  serializeCompleteSectionLeadComponentV1,
  serializeCompleteSectionV1,
  verifyCompleteSectionV1,
} from "../composition/complete-section";
import {
  FIRST_PLAYABLE_COMPOSITION_REQUEST_SCHEMA_V1,
  FIRST_PLAYABLE_ENGINE_VERSION_V1,
  FIRST_PLAYABLE_GENERATOR_VERSION_V1,
} from "../composition/first-playable-composition";
import { resolveStage8MotifReferencePlanV1 } from "../evaluation/stage8-motif-reference-plan-resolution";
import { projectStage8MotifReferencePlanV1 } from "../evaluation/stage8-motif-reference-projector";
import { getStage8MotifSourceBinding } from "../evaluation/stage8-motif-source-bindings";
import {
  ARP_POLICY_VERSION_V2,
  ARP_PROFILE_DATA_VERSION_V2,
} from "../music-domain/arpeggiator-policy-configuration";
import * as arpeggiatorDomain from "../music-domain/arpeggiator-policy-generator";
import * as bassDomain from "../music-domain/bass";
import * as componentSeed from "../music-domain/component-seed";
import { COMPONENT_SEED_DERIVATION_VERSION_V1 } from "../music-domain/component-seed";
import * as harmonyDomain from "../music-domain/harmony";
import { HARMONY_PROFILE_IDS } from "../music-domain/harmony";
import { MOTIF_POLICY_VERSION_V1 } from "../music-domain/motif-policy";
import { MOTIF_PROFILE_DATA_VERSION_V1 } from "../music-domain/motif-profile-configuration";
import { MOTIF_GENERATOR_VERSION_V1 } from "../music-domain/motif-result";
import * as prng from "../music-domain/prng";
import { PRNG_ALGORITHM_ID } from "../music-domain/prng";
import { generateCompleteSectionV1 } from "./complete-section";
import * as motifGenerator from "./motif-generator";

function request(rootSeed = 0): Record<string, unknown> {
  return {
    schema: COMPLETE_SECTION_REQUEST_SCHEMA_V1,
    engineVersion: COMPLETE_SECTION_ENGINE_VERSION_V1,
    generatorVersion: COMPLETE_SECTION_GENERATOR_VERSION_V1,
    composition: {
      schema: FIRST_PLAYABLE_COMPOSITION_REQUEST_SCHEMA_V1,
      engineVersion: FIRST_PLAYABLE_ENGINE_VERSION_V1,
      generatorVersion: FIRST_PLAYABLE_GENERATOR_VERSION_V1,
      profile: { id: HARMONY_PROFILE_IDS.darkSynthwave },
      harmony: {
        templateId: "degree-0654-natural-minor-v1",
        templateVersion: "v1",
        key: { tonic: 0, scale: "natural-minor" },
      },
      section: { tempo: { microsecondsPerQuarter: 500_000 } },
      intent: { energy: "medium", complexity: "medium" },
      rootSeed,
      arpeggiator: {
        range: { minMidiPitch: 36, maxMidiPitch: 84 },
        profile: { version: ARP_PROFILE_DATA_VERSION_V2 },
        policy: { version: ARP_POLICY_VERSION_V2 },
        seedDerivation: { version: COMPONENT_SEED_DERIVATION_VERSION_V1 },
        prng: { version: PRNG_ALGORITHM_ID },
      },
    },
    motif: {
      schema: "nightdrive.motif-generation-request.v1",
      generatorVersion: MOTIF_GENERATOR_VERSION_V1,
      profile: { version: MOTIF_PROFILE_DATA_VERSION_V1 },
      policyVersion: MOTIF_POLICY_VERSION_V1,
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

describe("complete-section generation", () => {
  afterEach(() => vi.restoreAllMocks());
  it("creates one replayable frozen H+B+A+Lead result from one request", async () => {
    const input = request();
    const first = await generateCompleteSectionV1(input as never);
    const second = await generateCompleteSectionV1(input as never);

    expect(first).toEqual(second);
    expect(first.schema).toBe("nightdrive.complete-section-result.v1");
    expect(first.components.harmony.slots).toHaveLength(4);
    expect(first.components.bass.length).toBeGreaterThan(0);
    expect(first.components.arpeggiator.length).toBeGreaterThan(0);
    expect(first.components.lead.events.length).toBeGreaterThan(0);
    expect(first.provenance.motif.generatorVersion).toBe(MOTIF_GENERATOR_VERSION_V1);
    expect(first.componentHashes).toEqual({
      harmony: "223062477b0382454187436de8444f134d105e671d3f550841aa0babd7eebffb",
      bass: "18152a11fa590ae46f8db418337c080f2561c0e976462e4872137da8291185c7",
      arpeggiator: "9a38c28c2ffee6029c13ccf6645e317457a3dd6041cfd21b5539a780d1313c1f",
      lead: "26a59097472088cc3d26ccb2ca59c246b020316fe392bc6beb2e99dc1c021b1a",
    });
    expect(first.resultHash).toBe(
      "0eb122a36f7c90e6b58c4d3017d21a051a81ed54bee1b98d00a40e3adcc66fa1",
    );
    expect(Object.isFrozen(first)).toBe(true);
    expect(Object.isFrozen(first.components.lead.events)).toBe(true);
    expect(verifyCompleteSectionV1(first)).toEqual(first);
    expect(serializeCompleteSectionV1(first)).toContain('"lead"');
  });

  it("preserves component-isolated seeding", async () => {
    const zero = await generateCompleteSectionV1(request(0) as never);
    const one = await generateCompleteSectionV1(request(1) as never);

    expect(zero.components.harmony).toEqual(one.components.harmony);
    expect(zero.components.bass).toEqual(one.components.bass);
    expect(zero.components.lead).not.toEqual(one.components.lead);
  });

  it("realizes Harmony once and passes that exact realization to all three dependents", async () => {
    const harmony = vi.spyOn(harmonyDomain, "realizeHarmonyProgression");
    const bass = vi.spyOn(bassDomain, "generateBassEvents");
    const arpeggiator = vi.spyOn(arpeggiatorDomain, "generateArpEventsWithPolicyV2");
    const motif = vi.spyOn(motifGenerator, "generateMotifV1");

    await generateCompleteSectionV1(request() as never);

    expect(harmony).toHaveBeenCalledTimes(1);
    const realization = harmony.mock.results[0]?.value;
    expect(bass.mock.calls[0]?.[0]).toBe(realization);
    expect(arpeggiator.mock.calls[0]?.[0].progression).toBe(realization);
    const motifInput = motif.mock.calls[0]?.[0] as { harmony: unknown } | undefined;
    expect(motifInput?.harmony).toBe(realization);
    expect(bass).toHaveBeenCalledTimes(1);
    expect(arpeggiator).toHaveBeenCalledTimes(1);
    expect(motif).toHaveBeenCalledTimes(1);
    const order = [harmony, bass, arpeggiator, motif].map((spy) => spy.mock.invocationCallOrder[0]);
    expect(order.every((value) => value !== undefined)).toBe(true);
    expect(order).toEqual([...order].sort((a, b) => Number(a) - Number(b)));
  });

  it("independently verifies the literal Lead fixture without a production Motif oracle", () => {
    const binding = getStage8MotifSourceBinding("dark-synthwave-chorus-001");
    const plan = resolveStage8MotifReferencePlanV1(
      { profileId: "dark-synthwave", energy: "medium", complexity: "medium" },
      0,
    );
    expect(plan).toEqual(LITERAL_COMPONENTS.lead.plan);
    expect(projectStage8MotifReferencePlanV1(binding.harmony, plan)).toEqual(
      LITERAL_COMPONENTS.lead.events,
    );
  });

  it("matches independently constructed canonical bytes and all five standard SHA-256 answers", async () => {
    const result = await generateCompleteSectionV1(request() as never);
    const componentInputs = {
      harmony: JSON.stringify({
        schema: "nightdrive.complete-section-harmony-component.v1",
        section: LITERAL_SECTION,
        component: LITERAL_COMPONENTS.harmony,
      }),
      bass: JSON.stringify({
        schema: "nightdrive.complete-section-bass-component.v1",
        section: LITERAL_SECTION,
        component: LITERAL_COMPONENTS.bass,
      }),
      arpeggiator: JSON.stringify({
        schema: "nightdrive.complete-section-arpeggiator-component.v1",
        section: LITERAL_SECTION,
        component: LITERAL_COMPONENTS.arpeggiator,
      }),
      lead: JSON.stringify({
        schema: "nightdrive.complete-section-lead-component.v1",
        section: LITERAL_SECTION,
        component: LITERAL_COMPONENTS.lead,
      }),
    };
    expect(
      serializeCompleteSectionHarmonyComponentV1(result.section, result.components.harmony),
    ).toBe(componentInputs.harmony);
    expect(serializeCompleteSectionBassComponentV1(result.section, result.components.bass)).toBe(
      componentInputs.bass,
    );
    expect(
      serializeCompleteSectionArpeggiatorComponentV1(result.section, result.components.arpeggiator),
    ).toBe(componentInputs.arpeggiator);
    expect(serializeCompleteSectionLeadComponentV1(result.section, result.components.lead)).toBe(
      componentInputs.lead,
    );
    for (const name of ["harmony", "bass", "arpeggiator", "lead"] as const) {
      expect(sha256(componentInputs[name])).toBe(LITERAL_COMPONENT_HASHES[name]);
      expect(result.componentHashes[name]).toBe(LITERAL_COMPONENT_HASHES[name]);
    }
    const expectedHashInput = JSON.stringify(LITERAL_HASH_INPUT);
    expect(serializeCompleteSectionHashInputV1(result)).toBe(expectedHashInput);
    expect(sha256(expectedHashInput)).toBe(LITERAL_RESULT_HASH);
    expect(result.resultHash).toBe(LITERAL_RESULT_HASH);
    const expectedJson = JSON.stringify({ ...LITERAL_HASH_INPUT, resultHash: LITERAL_RESULT_HASH });
    expect(serializeCompleteSectionV1(result)).toBe(expectedJson);
    expect(Buffer.from(serializeCompleteSectionV1(result), "utf8")).toEqual(
      Buffer.from(expectedJson, "utf8"),
    );
  });

  it("deeply freezes every returned record and array, including provenance, plans and hashes", async () => {
    const result = await generateCompleteSectionV1(request() as never);
    const seen = new Set<object>();
    const inspect = (value: unknown): void => {
      if (value === null || typeof value !== "object" || seen.has(value)) return;
      seen.add(value);
      expect(Object.isFrozen(value)).toBe(true);
      for (const key of Reflect.ownKeys(value)) {
        const descriptor = Object.getOwnPropertyDescriptor(value, key);
        if (descriptor === undefined) throw new Error("Missing immutable-result descriptor.");
        expect(descriptor.configurable).toBe(false);
        expect(descriptor.writable).toBe(false);
        expect(Reflect.set(value, key, "mutation")).toBe(false);
        inspect(descriptor.value);
      }
      expect(Reflect.set(value, "unexpected", true)).toBe(false);
    };
    inspect(result);
    expect(seen.size).toBeGreaterThan(100);
    expect(serializeCompleteSectionV1(result)).toBe(
      JSON.stringify({ ...LITERAL_HASH_INPUT, resultHash: LITERAL_RESULT_HASH }),
    );
  });

  it.each(["bass", "arpeggiator", "motif"] as const)(
    "returns no partial result when delegated %s generation fails",
    async (stage) => {
      const failure = Object.freeze(new Error(`delegated ${stage} failure`));
      const bass = vi.spyOn(bassDomain, "generateBassEvents");
      const arp = vi.spyOn(arpeggiatorDomain, "generateArpEventsWithPolicyV2");
      const motif = vi.spyOn(motifGenerator, "generateMotifV1");
      const reject = (): never => {
        throw failure;
      };
      if (stage === "bass") bass.mockImplementationOnce(reject);
      if (stage === "arpeggiator") arp.mockImplementationOnce(reject);
      if (stage === "motif") motif.mockImplementationOnce(reject);
      const resolved = vi.fn();
      const operation = generateCompleteSectionV1(request() as never);
      void operation.then(resolved, () => undefined);
      await expect(operation).rejects.toBe(failure);
      expect(resolved).not.toHaveBeenCalled();
      for (const key of ["components", "componentHashes", "warnings", "resultHash"])
        expect(Object.hasOwn(failure, key)).toBe(false);
      expect(bass).toHaveBeenCalledTimes(1);
      expect(arp).toHaveBeenCalledTimes(stage === "bass" ? 0 : 1);
      expect(motif).toHaveBeenCalledTimes(stage === "motif" ? 1 : 0);
    },
  );

  it.each([
    "toJSON",
    "accessor",
    "setter",
    "extra function",
    "extra undefined",
    "symbol",
    "missing",
    "reordered",
    "function value",
    "malformed value",
    "array accessor",
    "array toJSON",
    "array symbol",
    "non-enumerable field",
    "non-enumerable element",
    "inherited plan hook",
    "inherited array hook",
    "extra numeric array field",
    "negative zero contour",
    "malformed contour",
    "malformed roles",
  ])("rejects a forged Lead plan (%s) without executing caller code", async (kind) => {
    const result = await generateCompleteSectionV1(request() as never);
    const forged = structuredClone(result);
    const plan = forged.components.lead.plan as unknown as Record<PropertyKey, unknown>;
    const caller = vi.fn(() => "upper");
    if (kind === "toJSON") plan.toJSON = caller;
    if (kind === "accessor")
      Object.defineProperty(plan, "registerBand", { enumerable: true, get: caller });
    if (kind === "setter")
      Object.defineProperty(plan, "registerBand", { enumerable: true, set: caller });
    if (kind === "extra function") plan.extra = caller;
    if (kind === "extra undefined") plan.extra = undefined;
    if (kind === "symbol") plan[Symbol("unexpected")] = true;
    if (kind === "missing") delete plan.tensionMode;
    if (kind === "reordered") {
      const value = plan.policyVersion;
      delete plan.policyVersion;
      plan.policyVersion = value;
    }
    if (kind === "function value") plan.registerBand = caller;
    if (kind === "malformed value") plan.registerBand = "not-a-band";
    const offsets = plan.contourOffsets as number[];
    if (kind === "array accessor") Object.defineProperty(offsets, "0", { get: caller });
    if (kind === "array toJSON") Object.defineProperty(offsets, "toJSON", { value: caller });
    if (kind === "array symbol")
      Object.defineProperty(offsets, Symbol("unexpected"), { value: caller });
    if (kind === "non-enumerable field")
      Object.defineProperty(plan, "registerBand", { enumerable: false });
    if (kind === "non-enumerable element")
      Object.defineProperty(offsets, "0", { enumerable: false });
    if (kind === "inherited plan hook") Object.setPrototypeOf(plan, { toJSON: caller });
    if (kind === "inherited array hook") Object.setPrototypeOf(offsets, { toJSON: caller });
    if (kind === "extra numeric array field")
      Object.defineProperty(offsets, "4294967295", { value: caller });
    if (kind === "negative zero contour") offsets[0] = -0;
    if (kind === "malformed contour") offsets[1] = 99;
    if (kind === "malformed roles")
      plan.phraseRoles = ["identity", "identity", "identity", "identity"];
    expect(() => verifyCompleteSectionV1(forged)).toThrow(CompleteSectionValueError);
    expect(() =>
      serializeCompleteSectionLeadComponentV1(result.section, forged.components.lead),
    ).toThrow(CompleteSectionValueError);
    expect(caller).not.toHaveBeenCalled();
  });

  it.each([
    [0, 2011937067, 3256624460],
    [1, 2926668988, 3484630024],
  ] as const)(
    "preserves independent component domains and exact stream draw counts for root %i",
    async (root, arpSeed, motifSeed) => {
      const derive = vi.spyOn(componentSeed, "deriveComponentSeedV1");
      const create = vi.spyOn(prng, "createMulberry32State");
      const step = vi.spyOn(prng, "nextMulberry32");
      const originalArp = arpeggiatorDomain.generateArpEventsWithPolicyV2;
      const originalMotif = motifGenerator.generateMotifV1;
      const trace = (
        run: () => unknown,
        id: "arpeggiator" | "motif",
        seed: number,
        draws: number,
      ): unknown => {
        const d = derive.mock.calls.length,
          c = create.mock.calls.length,
          s = step.mock.calls.length;
        const output = run();
        expect(derive.mock.calls.slice(d)).toEqual([[root, id]]);
        expect(derive.mock.results[d]?.value).toBe(seed);
        expect(create.mock.calls.slice(c)).toEqual([[seed]]);
        expect(step.mock.calls.length - s).toBe(draws);
        expect(step.mock.calls[s]?.[0]).toBe(seed);
        for (let index = s + 1; index < step.mock.calls.length; index += 1)
          expect(step.mock.calls[index]?.[0]).toBe(step.mock.results[index - 1]?.value.state);
        return output;
      };
      const arp = vi
        .spyOn(arpeggiatorDomain, "generateArpEventsWithPolicyV2")
        .mockImplementation(
          (input) =>
            trace(() => originalArp(input), "arpeggiator", arpSeed, 5) as ReturnType<
              typeof originalArp
            >,
        );
      const motif = vi
        .spyOn(motifGenerator, "generateMotifV1")
        .mockImplementation(
          (input) =>
            trace(() => originalMotif(input), "motif", motifSeed, 4) as ReturnType<
              typeof originalMotif
            >,
        );
      const result = await generateCompleteSectionV1(request(root) as never);
      expect(arp).toHaveBeenCalledTimes(1);
      expect(motif).toHaveBeenCalledTimes(1);
      expect(arp.mock.calls[0]?.[0].rootSeed).toBe(root);
      const motifInput = motif.mock.calls[0]?.[0] as { rootSeed: number } | undefined;
      expect(motifInput?.rootSeed).toBe(root);
      expect(result.provenance.motif.componentSeed).toBe(motifSeed);
      // Later canonical verification deliberately replays Motif's existing
      // resolver in fresh streams. It must never reuse either generator stream.
      expect(create.mock.calls.every(([seed]) => seed === arpSeed || seed === motifSeed)).toBe(
        true,
      );
      expect(create.mock.calls.filter(([seed]) => seed === arpSeed)).toHaveLength(1);
      expect(step.mock.calls).toHaveLength(
        5 + 4 * create.mock.calls.filter(([seed]) => seed === motifSeed).length,
      );
    },
  );

  it("fails closed at the complete-section envelope before nested generation", async () => {
    const invalid = request();
    invalid.schema = "nightdrive.other.v1";

    await expect(generateCompleteSectionV1(invalid as never)).rejects.toMatchObject({
      code: "UNSUPPORTED_COMPLETE_SECTION_SCHEMA",
      field: "schema",
    } satisfies Partial<CompleteSectionValueError>);
  });

  it("rejects a malformed or reordered Motif wrapper before component execution", async () => {
    const invalid = request();
    invalid.motif = {
      generatorVersion: MOTIF_GENERATOR_VERSION_V1,
      schema: "nightdrive.motif-generation-request.v1",
      profile: { version: MOTIF_PROFILE_DATA_VERSION_V1 },
      policyVersion: MOTIF_POLICY_VERSION_V1,
    };

    await expect(generateCompleteSectionV1(invalid as never)).rejects.toMatchObject({
      code: "INVALID_COMPLETE_SECTION_MOTIF_CONFIGURATION",
      field: "motif",
    });
  });

  it("preserves nested First Playable errors", async () => {
    const invalid = request();
    (invalid.composition as Record<string, unknown>).schema = "nightdrive.other.v1";

    await expect(generateCompleteSectionV1(invalid as never)).rejects.toMatchObject({
      code: "UNSUPPORTED_FIRST_PLAYABLE_SCHEMA",
      field: "schema",
    });
  });

  it("rejects a forged Lead component even when its other result fields are unchanged", async () => {
    const result = await generateCompleteSectionV1(request() as never);
    const forged = structuredClone(result) as Record<string, unknown>;
    ((forged.components as Record<string, unknown>).lead as Record<string, unknown>).events = [];

    expect(() => verifyCompleteSectionV1(forged)).toThrow(CompleteSectionValueError);
  });
});
