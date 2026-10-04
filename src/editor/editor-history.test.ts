import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  COMPLETE_SECTION_ENGINE_VERSION_V1,
  COMPLETE_SECTION_GENERATOR_VERSION_V1,
  COMPLETE_SECTION_REQUEST_SCHEMA_V1,
} from "../composition/complete-section";
import {
  createChildEditorRevisionV1,
  EDITOR_COMMAND_SCHEMA_V1,
  type EditorRevisionV1,
  type EditorValueError,
  importCompleteSectionAsEditorRootV1,
  serializeEditorRevisionV1,
  verifyEditorRevisionV1,
} from "../composition/editor-revision";
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
  redoEditorHistoryV1,
  selectedEditorRevisionV1,
  undoEditorHistoryV1,
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

async function history() {
  return createEditorHistoryV1(await generateCompleteSectionV1(request as never));
}

describe("M2 editor revisions", () => {
  it("imports a frozen four-role root with deterministic IDs and velocity 100", async () => {
    const source = await generateCompleteSectionV1(request as never);
    const root = importCompleteSectionAsEditorRootV1(source);
    expect(root.tracks.map((track) => track.role)).toEqual([
      "harmony",
      "bass",
      "arpeggiator",
      "lead",
    ]);
    expect(root.tracks.flatMap((track) => track.notes).every((note) => note.velocity === 100)).toBe(
      true,
    );
    expect(Object.isFrozen(root.tracks[3]?.notes[0])).toBe(true);
    expect(importCompleteSectionAsEditorRootV1(source)).toEqual(root);
    expect(serializeEditorRevisionV1(root, source, [])).toBe(JSON.stringify(root));
  });

  it("applies one Lead pitch command and preserves source, IDs, timing and other roles", async () => {
    const current = await history();
    const root = selectedEditorRevisionV1(current);
    const target = root.tracks[3]?.notes[0];
    if (!target) throw new Error("Missing Lead fixture.");
    const next = applyEditorCommandV1(
      current,
      { schema: root.schema, revisionHash: root.revisionHash },
      {
        schema: EDITOR_COMMAND_SCHEMA_V1,
        type: "set-note-pitch",
        noteId: target.id,
        expectedPitch: target.pitch,
        pitch: 76,
      },
    );
    const child = selectedEditorRevisionV1(next);
    expect(child.source).toEqual(root.source);
    expect(child.parent?.revisionHash).toBe(root.revisionHash);
    expect(child.tracks[3]?.notes[0]).toMatchObject({
      id: target.id,
      pitch: 76,
      startTick: target.startTick,
      durationTicks: target.durationTicks,
      velocity: 100,
    });
    expect(child.tracks.slice(0, 3)).toEqual(root.tracks.slice(0, 3));
  });

  it("navigates exact immutable entries and clears redo only after a valid new edit", async () => {
    const initial = await history();
    const root = selectedEditorRevisionV1(initial);
    const target = root.tracks[3]?.notes[0];
    if (!target) throw new Error("Missing Lead fixture.");
    const edited = applyEditorCommandV1(
      initial,
      { schema: root.schema, revisionHash: root.revisionHash },
      {
        schema: EDITOR_COMMAND_SCHEMA_V1,
        type: "set-note-pitch",
        noteId: target.id,
        expectedPitch: target.pitch,
        pitch: 76,
      },
    );
    const child = selectedEditorRevisionV1(edited);
    const undone = undoEditorHistoryV1(edited);
    if (!undone) throw new Error("Undo should be available after an edit.");
    expect(selectedEditorRevisionV1(undone)).toEqual(root);
    const redone = redoEditorHistoryV1(undone);
    if (!redone) throw new Error("Redo should be available after undo.");
    expect(selectedEditorRevisionV1(redone)).toEqual(child);
    const replacement = applyEditorCommandV1(
      undone,
      { schema: root.schema, revisionHash: root.revisionHash },
      {
        schema: EDITOR_COMMAND_SCHEMA_V1,
        type: "set-note-pitch",
        noteId: target.id,
        expectedPitch: target.pitch,
        pitch: 77,
      },
    );
    expect(redoEditorHistoryV1(replacement)).toBeNull();
    expect(replacement.revisions).toHaveLength(2);
  });

  it("rejects stale or out-of-range commands without changing history", async () => {
    const current = await history();
    const root = selectedEditorRevisionV1(current);
    const target = root.tracks[3]?.notes[0];
    if (!target) throw new Error("Missing Lead fixture.");
    expect(() =>
      applyEditorCommandV1(
        current,
        { schema: root.schema, revisionHash: "0".repeat(64) },
        {
          schema: EDITOR_COMMAND_SCHEMA_V1,
          type: "set-note-pitch",
          noteId: target.id,
          expectedPitch: target.pitch,
          pitch: 76,
        },
      ),
    ).toThrow(
      expect.objectContaining({ code: "STALE_EDITOR_PARENT" } satisfies Partial<EditorValueError>),
    );
    expect(() =>
      applyEditorCommandV1(
        current,
        { schema: root.schema, revisionHash: root.revisionHash },
        {
          schema: EDITOR_COMMAND_SCHEMA_V1,
          type: "set-note-pitch",
          noteId: target.id,
          expectedPitch: target.pitch,
          pitch: 85,
        },
      ),
    ).toThrow(
      expect.objectContaining({
        code: "EDITOR_LEAD_PITCH_OUT_OF_RANGE",
      } satisfies Partial<EditorValueError>),
    );
    expect(current.revisions).toHaveLength(1);
  });
});

function rehash(revision: EditorRevisionV1): EditorRevisionV1 {
  const { revisionHash: _old, ...content } = revision;
  return {
    ...content,
    revisionHash: createHash("sha256")
      .update(
        JSON.stringify({ schema: "nightdrive.editor-revision-hash-input.v1", revision: content }),
        "utf8",
      )
      .digest("hex"),
  };
}

describe("authoritative source and lineage verification", () => {
  it("rejects a self-consistent forged root at every canonical boundary", async () => {
    const source = await generateCompleteSectionV1(request as never);
    const root = importCompleteSectionAsEditorRootV1(source);
    const forged = structuredClone(root);
    (forged.tracks[3]?.notes[0] as { pitch: number }).pitch = 76;
    const recomputed = rehash(forged);
    const command = {
      schema: EDITOR_COMMAND_SCHEMA_V1,
      type: "set-note-pitch" as const,
      noteId: recomputed.tracks[3]?.notes[0]?.id as string,
      expectedPitch: 76,
      pitch: 77,
    };
    expect(() => verifyEditorRevisionV1(recomputed, source, [])).toThrow(
      expect.objectContaining({ code: "INVALID_EDITOR_SOURCE_BINDING" }),
    );
    expect(() => serializeEditorRevisionV1(recomputed, source, [])).toThrow();
    expect(() => createChildEditorRevisionV1(recomputed, command, source, [])).toThrow();
    // Runtime callers cannot omit retained source despite a self-consistent digest.
    expect(() => verifyEditorRevisionV1(recomputed, undefined as never, [])).toThrow();
    expect(() => serializeEditorRevisionV1(recomputed, undefined as never, [])).toThrow();
    expect(() =>
      createChildEditorRevisionV1(recomputed, command, undefined as never, []),
    ).toThrow();
    expect(verifyEditorRevisionV1(root, source, [])).toEqual(root);
  });

  it("rejects a self-consistent child that differs from its recorded transition", async () => {
    const source = await generateCompleteSectionV1(request as never);
    const root = importCompleteSectionAsEditorRootV1(source);
    const target = root.tracks[3]?.notes[0];
    if (!target) throw new Error("Missing Lead fixture.");
    const command = {
      schema: EDITOR_COMMAND_SCHEMA_V1,
      type: "set-note-pitch" as const,
      noteId: target.id,
      expectedPitch: target.pitch,
      pitch: 76,
    };
    const child = createChildEditorRevisionV1(root, command, source, []);
    expect(verifyEditorRevisionV1(child, source, [root])).toEqual(child);
    expect(serializeEditorRevisionV1(child, source, [root])).toBe(JSON.stringify(child));
    const forged = structuredClone(child);
    (forged.tracks[3]?.notes[1] as { pitch: number }).pitch = 78;
    const recomputed = rehash(forged);
    expect(() => verifyEditorRevisionV1(recomputed, source, [root])).toThrow(
      expect.objectContaining({ code: "INVALID_EDITOR_LINEAGE" }),
    );
    expect(() => serializeEditorRevisionV1(recomputed, source, [root])).toThrow();
    expect(() => createChildEditorRevisionV1(recomputed, command, source, [root])).toThrow();
    expect(() => verifyEditorRevisionV1(child, source, [])).toThrow();
    expect(() => verifyEditorRevisionV1(child, source, [root, root])).toThrow();
  });
});
