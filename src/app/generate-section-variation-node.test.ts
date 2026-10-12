// @vitest-environment node
import process from "node:process";
import { afterEach, expect, it, vi } from "vitest";
import type { CompleteSectionRequestV1 } from "../composition/complete-section";
import * as generator from "../generators/complete-section";
import { createKey } from "../music-domain/key";
import { createTempoFromBpm } from "../music-domain/musical-time";
import { createPitchClass } from "../music-domain/pitch";
import { generateSectionAction } from "./generate-section-action";
import { createOriginalVariationApplicationAction } from "./variation-action";

afterEach(() => vi.restoreAllMocks());

it("actual existing browser request/defaults generate once then bootstrap through one fresh pinned admission, never replace product output", async () => {
  expect(process.versions.node).toBe("24.21.0");
  // Independent consumer request fixture: exact existing UI controls, including
  // its supported sustained-Bass default rather than an invented new input.
  const request: CompleteSectionRequestV1 = {
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
        key: createKey(createPitchClass(0), "natural-minor"),
      },
      section: { tempo: createTempoFromBpm(120) },
      intent: { energy: "medium", complexity: "medium" },
      rootSeed: 0,
      bass: { range: { minMidiPitch: 36, maxMidiPitch: 60 } as never, rhythm: "sustained" },
      arpeggiator: {
        range: { minMidiPitch: 36, maxMidiPitch: 84 } as never,
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
  const legacyRequest = structuredClone(request);
  Reflect.deleteProperty(legacyRequest.composition, "bass");
  const legacy = await generateSectionAction(legacyRequest);
  const before = JSON.stringify(request);
  const generate = vi.spyOn(generator, "generateCompleteSectionV1");
  const current = await generateSectionAction(request);
  expect(generate).toHaveBeenCalledTimes(1);
  expect(current.history.source).toEqual(legacy.history.source);
  const original = JSON.stringify(current);
  const next = await createOriginalVariationApplicationAction(
    current.history.source,
    request,
    current.history,
  );
  expect(generate).toHaveBeenCalledTimes(2); // One product result + one discarded verification replay.
  expect(next.collection.source).toEqual(current.history.source);
  expect(next.collection.sourceRequest).toEqual(request);
  expect(next.collection.alternatives).toHaveLength(1);
  expect(next.collection.alternatives[0]?.history).toEqual(current.history);
  expect(next.selectedRevision).toEqual(current.selectedRevision);
  expect(next.preview).toEqual(current.preview);
  expect(next.preview.sourceResultHash).toBe(current.history.source.resultHash);
  expect(JSON.stringify(current)).toBe(original);
  expect(JSON.stringify(request)).toBe(before);
});
