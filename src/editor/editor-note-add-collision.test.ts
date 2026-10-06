import { describe, expect, it, vi } from "vitest";

const digestControl = vi.hoisted(() => ({ forcedAddedNoteHash: null as string | null }));

vi.mock("../generators/adapters/stage7-digest", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../generators/adapters/stage7-digest")>();
  return {
    ...actual,
    digestStage7CanonicalUtf8(value: string) {
      let schema: unknown;
      try {
        schema = (JSON.parse(value) as { schema?: unknown }).schema;
      } catch {
        schema = undefined;
      }
      if (
        schema === "nightdrive.editor-added-note-id-input.v1" &&
        digestControl.forcedAddedNoteHash !== null
      )
        return digestControl.forcedAddedNoteHash;
      return actual.digestStage7CanonicalUtf8(value);
    },
  };
});

import {
  COMPLETE_SECTION_ENGINE_VERSION_V1,
  COMPLETE_SECTION_GENERATOR_VERSION_V1,
  COMPLETE_SECTION_REQUEST_SCHEMA_V1,
} from "../composition/complete-section";
import { ADD_NOTE_COMMAND_V6, EDITOR_COMMAND_SCHEMA_V6 } from "../composition/editor-revision";
import { generateCompleteSectionV1 } from "../generators/complete-section";
import {
  ARP_POLICY_VERSION_V2,
  ARP_PROFILE_DATA_VERSION_V2,
} from "../music-domain/arpeggiator-policy-configuration";
import { COMPONENT_SEED_DERIVATION_VERSION_V1 } from "../music-domain/component-seed";
import { HARMONY_PROFILE_IDS } from "../music-domain/harmony";
import { MOTIF_POLICY_VERSION_V1 } from "../music-domain/motif-policy";
import { MOTIF_PROFILE_DATA_VERSION_V1 } from "../music-domain/motif-profile-configuration";
import { MOTIF_GENERATOR_VERSION_V1 } from "../music-domain/motif-result";
import { PRNG_ALGORITHM_ID } from "../music-domain/prng";
import {
  applyEditorCommandV1,
  createEditorHistoryV1,
  selectedEditorRevisionV1,
} from "./editor-history";

const request = {
  schema: COMPLETE_SECTION_REQUEST_SCHEMA_V1,
  engineVersion: COMPLETE_SECTION_ENGINE_VERSION_V1,
  generatorVersion: COMPLETE_SECTION_GENERATOR_VERSION_V1,
  composition: {
    schema: "nightdrive.first-playable-composition-request.v1",
    engineVersion: "nightdrive.engine.first-playable-composition.v1",
    generatorVersion: "nightdrive.generator.first-playable-composition.v1",
    profile: { id: HARMONY_PROFILE_IDS.darkSynthwave },
    harmony: {
      templateId: "degree-0654-natural-minor-v1",
      templateVersion: "v1",
      key: { tonic: 0, scale: "natural-minor" },
    },
    section: { tempo: { microsecondsPerQuarter: 500_000 } },
    intent: { energy: "medium", complexity: "medium" },
    rootSeed: 0,
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
} as const;

describe("M2 added-note global identity collision", () => {
  it("fails closed when the parent-bound added ID collides with any role ID", async () => {
    const source = await generateCompleteSectionV1(request as never);
    const history = createEditorHistoryV1(source);
    const parent = selectedEditorRevisionV1(history);
    const harmonyId = parent.tracks[0]?.notes[0]?.id;
    if (!harmonyId) throw new Error("Missing global-collision parent fixture.");
    const before = JSON.stringify(history);
    digestControl.forcedAddedNoteHash = harmonyId.slice("note-".length);
    try {
      expect(() =>
        applyEditorCommandV1(
          history,
          { schema: parent.schema, revisionHash: parent.revisionHash },
          {
            schema: EDITOR_COMMAND_SCHEMA_V6,
            type: ADD_NOTE_COMMAND_V6,
            pitch: 64,
            startTick: 960,
            durationTicks: 480,
          },
        ),
      ).toThrow(expect.objectContaining({ code: "EDITOR_NOTE_ID_COLLISION", field: "command" }));
    } finally {
      digestControl.forcedAddedNoteHash = null;
    }
    expect(JSON.stringify(history)).toBe(before);
    expect(selectedEditorRevisionV1(history)).toEqual(parent);
  });
});
