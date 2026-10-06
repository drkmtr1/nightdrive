// @vitest-environment node

import process from "node:process";
import { afterEach, describe, expect, it } from "vitest";
import {
  COMPLETE_SECTION_ENGINE_VERSION_V1,
  COMPLETE_SECTION_GENERATOR_VERSION_V1,
  COMPLETE_SECTION_REQUEST_SCHEMA_V1,
} from "../composition/complete-section";
import {
  createChildEditorRevisionV1,
  EDITOR_COMMAND_SCHEMA_V1,
  EDITOR_COMMAND_SCHEMA_V4,
  EDITOR_COMMAND_SCHEMA_V5,
  EDITOR_COMMAND_SCHEMA_V6,
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
  createEditorApplicationV1,
  editEditorApplicationAddNoteV1,
  editEditorApplicationDeleteNoteV1,
  editEditorApplicationDurationV1,
  editEditorApplicationPitchV1,
  editEditorApplicationPositionV1,
  editEditorApplicationStartTickV1,
  redoEditorApplicationV1,
  undoEditorApplicationV1,
} from "./editor-application-node";

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

const deepFrozen = (value: unknown): boolean => {
  if (!value || typeof value !== "object") return true;
  return Object.isFrozen(value) && Object.values(value).every((entry) => deepFrozen(entry));
};

describe("M2 editor application boundary", () => {
  const actualVersion = Object.getOwnPropertyDescriptor(process.versions, "node");
  afterEach(() => {
    if (!actualVersion) throw new Error("Missing Node identity.");
    Object.defineProperty(process.versions, "node", actualVersion);
  });

  it("rejects unsupported runtimes before accessing operation inputs", () => {
    Object.defineProperty(process.versions, "node", { value: "22.17.1", configurable: true });
    expect(() => createEditorApplicationV1(undefined as never)).toThrow("require Node");
    expect(() =>
      editEditorApplicationPitchV1(undefined as never, undefined as never, undefined as never),
    ).toThrow("require Node");
    expect(() =>
      editEditorApplicationStartTickV1(undefined as never, undefined as never, undefined as never),
    ).toThrow("require Node");
    expect(() =>
      editEditorApplicationDurationV1(undefined as never, undefined as never, undefined as never),
    ).toThrow("require Node");
    expect(() =>
      editEditorApplicationDeleteNoteV1(undefined as never, undefined as never, undefined as never),
    ).toThrow("require Node");
    expect(() =>
      editEditorApplicationAddNoteV1(undefined as never, undefined as never, undefined as never),
    ).toThrow("require Node");
    expect(() =>
      editEditorApplicationPositionV1(undefined as never, undefined as never, undefined as never),
    ).toThrow("require Node");
    expect(() => undoEditorApplicationV1(undefined as never)).toThrow("require Node");
    expect(() => redoEditorApplicationV1(undefined as never)).toThrow("require Node");
  });

  it("projects the verified root and edited history selection into detached audition previews", async () => {
    const source = await generateCompleteSectionV1(request as never);
    const root = createEditorApplicationV1(source);
    const rootRevision = root.history.revisions[0];
    const leadTrack = rootRevision?.tracks[3];
    const target = leadTrack?.notes[0];
    if (!rootRevision || !leadTrack || !target)
      throw new Error("Missing canonical editor fixture.");

    expect(root.selectedRevision).toEqual({
      schema: rootRevision.schema,
      revisionHash: rootRevision.revisionHash,
    });
    expect(root.preview.sourceResultHash).toBe(source.resultHash);
    expect(root.preview.tracks.map((track) => track.role)).toEqual([
      "harmony",
      "bass",
      "arpeggiator",
      "lead",
    ]);
    expect(root.preview.tracks[3]?.notes).toEqual(
      leadTrack.notes.map(({ pitch, startTick, durationTicks }) => ({
        pitch,
        startTick,
        durationTicks,
      })),
    );
    for (const [index, track] of rootRevision.tracks.entries()) {
      expect(root.preview.tracks[index]?.notes).toEqual(
        track.notes.map(({ pitch, startTick, durationTicks }) => ({
          pitch,
          startTick,
          durationTicks,
        })),
      );
      expect(root.preview.tracks[index]?.notes).not.toBe(track.notes);
      expect(root.preview.tracks[index]?.notes[0]).not.toBe(track.notes[0]);
    }
    expect(root.preview.section).toEqual(rootRevision.section);
    expect(root.preview.section).not.toBe(rootRevision.section);
    expect(root.preview).not.toHaveProperty("revisionHash");
    expect(deepFrozen(root)).toBe(true);

    const edited = editEditorApplicationPitchV1(root, root.selectedRevision, {
      schema: EDITOR_COMMAND_SCHEMA_V1,
      type: "set-note-pitch",
      noteId: target.id,
      expectedPitch: target.pitch,
      pitch: target.pitch === 84 ? 83 : target.pitch + 1,
    });
    const editedRevision = edited.history.revisions[1];
    const changedPitch = editedRevision?.tracks[3]?.notes[0]?.pitch;
    if (!editedRevision || changedPitch === undefined) throw new Error("Missing edited note.");
    expect(edited.selectedRevision.revisionHash).toBe(editedRevision.revisionHash);
    expect(edited.selectedRevision.revisionHash).not.toBe(root.selectedRevision.revisionHash);
    expect(edited.preview.sourceResultHash).toBe(source.resultHash);
    expect(edited.preview.tracks[3]?.notes[0]?.pitch).toBe(changedPitch);
    expect(root.preview.tracks[3]?.notes[0]?.pitch).toBe(target.pitch);
    expect(edited.preview).not.toHaveProperty("revisionHash");
    expect(edited.preview.tracks.slice(0, 3)).toEqual(root.preview.tracks.slice(0, 3));
    expect(edited.preview.tracks[3]?.notes.slice(1)).toEqual(
      root.preview.tracks[3]?.notes.slice(1),
    );
    expect(edited.preview.tracks[3]?.notes[0]).toEqual({
      pitch: changedPitch,
      startTick: target.startTick,
      durationTicks: target.durationTicks,
    });
    expect(deepFrozen(edited)).toBe(true);
    expect(source.resultHash).toBe(root.preview.sourceResultHash);

    const undone = undoEditorApplicationV1(edited);
    if (!undone) throw new Error("Undo should restore the root revision.");
    expect(undone.selectedRevision).toEqual(root.selectedRevision);
    expect(undone.preview).toEqual(root.preview);

    const redone = redoEditorApplicationV1(undone);
    if (!redone) throw new Error("Redo should restore the edited revision.");
    expect(redone.selectedRevision).toEqual(edited.selectedRevision);
    expect(redone.preview).toEqual(edited.preview);
    expect(undoEditorApplicationV1(root)).toBeNull();
    expect(redoEditorApplicationV1(edited)).toBeNull();

    const before = structuredClone(undone);
    expect(() =>
      editEditorApplicationPitchV1(undone, edited.selectedRevision, {
        schema: EDITOR_COMMAND_SCHEMA_V1,
        type: "set-note-pitch",
        noteId: target.id,
        expectedPitch: target.pitch,
        pitch: 76,
      }),
    ).toThrow(expect.objectContaining({ code: "STALE_EDITOR_PARENT" }));
    expect(undone).toEqual(before);
    expect(redoEditorApplicationV1(undone)?.selectedRevision).toEqual(edited.selectedRevision);

    const replacement = editEditorApplicationPitchV1(undone, root.selectedRevision, {
      schema: EDITOR_COMMAND_SCHEMA_V1,
      type: "set-note-pitch",
      noteId: target.id,
      expectedPitch: target.pitch,
      pitch: target.pitch === 60 ? 61 : 60,
    });
    expect(redoEditorApplicationV1(replacement)).toBeNull();
    expect(edited.selectedRevision.revisionHash).toBe(editedRevision.revisionHash);
  });

  it("projects an edited absolute start tick from the verified revision while preserving source identity", async () => {
    const source = await generateCompleteSectionV1(request as never);
    const root = createEditorApplicationV1(source);
    const rootRevision = root.history.revisions[0];
    const target = rootRevision?.tracks[3]?.notes[0];
    if (!rootRevision || !target) throw new Error("Missing canonical Lead fixture.");
    const movedStartTick = target.startTick + 1;

    const moved = editEditorApplicationStartTickV1(root, root.selectedRevision, {
      schema: "nightdrive.editor-note-command.v2",
      type: "set-note-start-tick",
      noteId: target.id,
      expectedStartTick: target.startTick,
      startTick: movedStartTick,
    });
    const movedRevision = moved.history.revisions[1];
    const movedNote = movedRevision?.tracks[3]?.notes[0];
    if (!movedRevision || !movedNote) throw new Error("Missing moved revision.");

    expect(movedRevision.command).toEqual({
      schema: "nightdrive.editor-note-command.v2",
      type: "set-note-start-tick",
      noteId: target.id,
      expectedStartTick: target.startTick,
      startTick: movedStartTick,
    });
    expect(movedNote).toEqual({ ...target, startTick: movedStartTick });
    expect(moved.preview.tracks[3]?.notes[0]).toEqual({
      pitch: target.pitch,
      startTick: movedStartTick,
      durationTicks: target.durationTicks,
    });
    expect(moved.preview.sourceResultHash).toBe(source.resultHash);
    expect(moved.selectedRevision.revisionHash).toBe(movedRevision.revisionHash);
    expect(moved.preview).not.toHaveProperty("revisionHash");
    expect(deepFrozen(moved)).toBe(true);
    expect(root.history.revisions[0]).toEqual(rootRevision);
    expect(root.preview.tracks[3]?.notes[0]?.startTick).toBe(target.startTick);

    const undone = undoEditorApplicationV1(moved);
    if (!undone) throw new Error("Undo should restore the imported root.");
    expect(undone.selectedRevision).toEqual(root.selectedRevision);
    expect(undone.preview).toEqual(root.preview);
    const redone = redoEditorApplicationV1(undone);
    if (!redone) throw new Error("Redo should restore the moved revision.");
    expect(redone.selectedRevision).toEqual(moved.selectedRevision);
    expect(redone.preview).toEqual(moved.preview);
  });

  it("projects an edited absolute duration and restores exact revisions through undo and redo", async () => {
    const source = await generateCompleteSectionV1(request as never);
    const root = createEditorApplicationV1(source);
    const rootRevision = root.history.revisions[0];
    const target = rootRevision?.tracks[3]?.notes[0];
    if (!rootRevision || !target) throw new Error("Missing canonical Lead fixture.");

    const edited = editEditorApplicationDurationV1(root, root.selectedRevision, {
      schema: "nightdrive.editor-note-command.v3",
      type: "set-note-duration",
      noteId: target.id,
      expectedDurationTicks: target.durationTicks,
      durationTicks: target.durationTicks + 480,
    });
    const child = edited.history.revisions[1];
    const changed = child?.tracks[3]?.notes[0];
    if (!child || !changed) throw new Error("Missing duration revision.");
    expect(child.command).toEqual({
      schema: "nightdrive.editor-note-command.v3",
      type: "set-note-duration",
      noteId: target.id,
      expectedDurationTicks: target.durationTicks,
      durationTicks: target.durationTicks + 480,
    });
    expect(changed).toEqual({ ...target, durationTicks: target.durationTicks + 480 });
    expect(edited.preview.tracks[3]?.notes[0]).toEqual({
      pitch: target.pitch,
      startTick: target.startTick,
      durationTicks: target.durationTicks + 480,
    });
    expect(edited.preview.sourceResultHash).toBe(source.resultHash);
    expect(edited.selectedRevision.revisionHash).toBe(child.revisionHash);
    expect(edited.preview).not.toHaveProperty("revisionHash");
    expect(edited.preview.tracks.slice(0, 3)).toEqual(root.preview.tracks.slice(0, 3));
    expect(root.preview.tracks[3]?.notes[0]?.durationTicks).toBe(target.durationTicks);
    expect(deepFrozen(edited)).toBe(true);

    const undone = undoEditorApplicationV1(edited);
    if (!undone) throw new Error("Undo should restore the imported root.");
    expect(undone.selectedRevision).toEqual(root.selectedRevision);
    expect(undone.preview).toEqual(root.preview);
    const redone = redoEditorApplicationV1(undone);
    if (!redone) throw new Error("Redo should restore the duration revision.");
    expect(redone.selectedRevision).toEqual(edited.selectedRevision);
    expect(redone.preview).toEqual(edited.preview);
  });

  it("reverifies retained history and ignores caller-supplied derived preview authority", async () => {
    const source = await generateCompleteSectionV1(request as never);
    const current = createEditorApplicationV1(source);
    const forged = structuredClone(current);
    (forged.history.revisions[0]?.tracks[3]?.notes[0] as { pitch: number }).pitch = 84;
    expect(() => undoEditorApplicationV1(forged)).toThrow();
    expect(() => redoEditorApplicationV1(forged)).toThrow();
    const target = current.history.revisions[0]?.tracks[3]?.notes[0];
    if (!target) throw new Error("Missing Lead fixture.");
    const command = {
      schema: EDITOR_COMMAND_SCHEMA_V1,
      type: "set-note-pitch" as const,
      noteId: target.id,
      expectedPitch: target.pitch,
      pitch: target.pitch === 84 ? 83 : 84,
    };
    expect(() => editEditorApplicationPitchV1(forged, current.selectedRevision, command)).toThrow();
    expect(() =>
      editEditorApplicationStartTickV1(forged, current.selectedRevision, {
        schema: "nightdrive.editor-note-command.v2",
        type: "set-note-start-tick",
        noteId: target.id,
        expectedStartTick: target.startTick,
        startTick: target.startTick + 1,
      }),
    ).toThrow();
    expect(() =>
      editEditorApplicationDurationV1(forged, current.selectedRevision, {
        schema: "nightdrive.editor-note-command.v3",
        type: "set-note-duration",
        noteId: target.id,
        expectedDurationTicks: target.durationTicks,
        durationTicks: target.durationTicks + 120,
      }),
    ).toThrow();
    const alteredView = structuredClone(current);
    (alteredView.preview.tracks[0]?.notes[0] as { pitch: number }).pitch = 0;
    const edited = editEditorApplicationPitchV1(alteredView, current.selectedRevision, command);
    expect(edited.preview.tracks[0]).toEqual(current.preview.tracks[0]);
    expect(edited.history.source).toEqual(source);
  });
  it("projects a verified v4 deletion and restores exact revisions through undo/redo", async () => {
    const source = await generateCompleteSectionV1(request as never);
    const root = createEditorApplicationV1(source);
    const rootRevision = root.history.revisions[0];
    const rootLead = rootRevision?.tracks[3]?.notes;
    const targetIndex = 7;
    const target = rootLead?.[targetIndex];
    if (!rootRevision || !rootLead || !target)
      throw new Error("Missing delete application fixture.");
    const command = {
      schema: EDITOR_COMMAND_SCHEMA_V4,
      type: "delete-note",
      noteId: target.id,
    } as const;
    const deleted = editEditorApplicationDeleteNoteV1(root, root.selectedRevision, command);
    const deletedRevision = deleted.history.revisions[1];
    if (!deletedRevision) throw new Error("Missing deleted revision.");

    expect(deletedRevision.command).toEqual(command);
    expect(deleted.selectedRevision.revisionHash).toBe(deletedRevision.revisionHash);
    expect(deleted.preview.sourceResultHash).toBe(source.resultHash);
    expect(deleted.preview.tracks[3]?.notes).toEqual(
      root.preview.tracks[3]?.notes.filter((_, index) => index !== targetIndex),
    );
    expect(deleted.preview.tracks.slice(0, 3)).toEqual(root.preview.tracks.slice(0, 3));
    expect(deleted.preview).not.toHaveProperty("revisionHash");
    expect(root.preview.tracks[3]?.notes).toHaveLength(rootLead.length);
    expect(deleted.preview.tracks[3]?.notes[7]).toEqual(root.preview.tracks[3]?.notes[8]);
    expect(deepFrozen(deleted)).toBe(true);

    const undone = undoEditorApplicationV1(deleted);
    if (!undone) throw new Error("Undo should restore the root revision.");
    expect(undone.selectedRevision).toEqual(root.selectedRevision);
    expect(undone.preview).toEqual(root.preview);
    const redone = redoEditorApplicationV1(undone);
    if (!redone) throw new Error("Redo should restore the deletion.");
    expect(redone.selectedRevision).toEqual(deleted.selectedRevision);
    expect(redone.preview).toEqual(deleted.preview);

    const deleteRevisions = [rootRevision];
    let deleteParent = rootRevision;
    while ((deleteParent.tracks[3]?.notes.length ?? 0) > 1) {
      const nextTarget = deleteParent.tracks[3]?.notes[0];
      if (!nextTarget) throw new Error("Missing delete-chain target.");
      const child = createChildEditorRevisionV1(
        deleteParent,
        {
          schema: EDITOR_COMMAND_SCHEMA_V4,
          type: "delete-note",
          noteId: nextTarget.id,
        },
        source,
        deleteRevisions.slice(0, -1),
      );
      deleteRevisions.push(child);
      deleteParent = child;
    }
    const finalTarget = deleteParent.tracks[3]?.notes[0];
    if (!finalTarget) throw new Error("Missing final Lead note.");
    const almostEmpty = {
      history: {
        source,
        revisions: deleteRevisions,
        cursor: deleteRevisions.length - 1,
      },
      selectedRevision: {
        schema: deleteParent.schema,
        revisionHash: deleteParent.revisionHash,
      },
      preview: root.preview,
    };
    const emptied = editEditorApplicationDeleteNoteV1(almostEmpty, almostEmpty.selectedRevision, {
      schema: EDITOR_COMMAND_SCHEMA_V4,
      type: "delete-note",
      noteId: finalTarget.id,
    });
    expect(emptied.preview.tracks.map((track) => track.role)).toEqual([
      "harmony",
      "bass",
      "arpeggiator",
      "lead",
    ]);
    expect(emptied.preview.tracks[3]?.notes).toEqual([]);
    expect(emptied.preview.sourceResultHash).toBe(source.resultHash);
    expect(deepFrozen(emptied)).toBe(true);
  });

  it("applies one v5 atomic position command at the Node boundary and projects the selected revision", async () => {
    const source = await generateCompleteSectionV1(request as never);
    const root = createEditorApplicationV1(source);
    const rootRevision = root.history.revisions[0];
    const target = rootRevision?.tracks[3]?.notes[0];
    if (!rootRevision || !target) throw new Error("Missing atomic position application fixture.");
    const command = {
      schema: EDITOR_COMMAND_SCHEMA_V5,
      type: "set-note-position",
      noteId: target.id,
      expectedPitch: target.pitch,
      expectedStartTick: target.startTick,
      pitch: target.pitch + 1,
      startTick: target.startTick + 480,
    } as const;

    const edited = editEditorApplicationPositionV1(root, root.selectedRevision, command);
    const child = edited.history.revisions[1];
    if (!child) throw new Error("Missing one-step position revision.");
    expect(edited.history.revisions).toHaveLength(2);
    expect(edited.history.cursor).toBe(1);
    expect(child.command).toEqual(command);
    expect(child.parent?.revisionHash).toBe(rootRevision.revisionHash);
    expect(child.tracks[3]?.notes[0]).toEqual({
      ...target,
      pitch: target.pitch + 1,
      startTick: target.startTick + 480,
    });
    expect(edited.preview.tracks[3]?.notes[0]).toEqual({
      pitch: target.pitch + 1,
      startTick: target.startTick + 480,
      durationTicks: target.durationTicks,
    });
    expect(edited.preview.sourceResultHash).toBe(source.resultHash);
    expect(edited.selectedRevision.revisionHash).toBe(child.revisionHash);
    expect(edited.preview).not.toHaveProperty("revisionHash");
    expect(deepFrozen(edited)).toBe(true);
    expect(root.history.revisions[0]).toEqual(rootRevision);
    expect(root.preview.tracks[3]?.notes[0]).toEqual({
      pitch: target.pitch,
      startTick: target.startTick,
      durationTicks: target.durationTicks,
    });

    const undone = undoEditorApplicationV1(edited);
    if (!undone) throw new Error("Undo should restore the exact parent revision.");
    expect(undone.selectedRevision).toEqual(root.selectedRevision);
    expect(undone.preview).toEqual(root.preview);
    const redone = redoEditorApplicationV1(undone);
    if (!redone) throw new Error("Redo should restore the exact child revision.");
    expect(redone.selectedRevision).toEqual(edited.selectedRevision);
    expect(redone.preview).toEqual(edited.preview);
  });

  it("applies one canonical v6 Lead add command at the Node boundary and projects the immutable revision", async () => {
    const source = await generateCompleteSectionV1(request as never);
    const root = createEditorApplicationV1(source);
    const rootRevision = root.history.revisions[0];
    const lead = rootRevision?.tracks[3]?.notes;
    if (!rootRevision || !lead) throw new Error("Missing add-note application fixture.");
    const command = {
      schema: EDITOR_COMMAND_SCHEMA_V6,
      type: "add-note",
      pitch: 64,
      startTick: 960,
      durationTicks: 480,
    } as const;

    const added = editEditorApplicationAddNoteV1(root, root.selectedRevision, command);
    const child = added.history.revisions[1];
    const newNote = child?.tracks[3]?.notes[1];
    if (!child || !newNote) throw new Error("Missing canonical added-note child.");
    expect(added.history.revisions).toHaveLength(2);
    expect(added.history.cursor).toBe(1);
    expect(child.command).toEqual(command);
    expect(child.parent?.revisionHash).toBe(rootRevision.revisionHash);
    expect(child.tracks[3]?.notes).toHaveLength(lead.length + 1);
    expect(newNote).toMatchObject({ pitch: 64, startTick: 960, durationTicks: 480, velocity: 100 });
    expect(newNote.id).toMatch(/^note-[0-9a-f]{64}$/u);
    expect(child.tracks[3]?.notes[0]).toEqual(lead[0]);
    expect(child.tracks[3]?.notes[2]).toEqual(lead[1]);
    expect(added.preview.tracks[3]?.notes[1]).toEqual({
      pitch: 64,
      startTick: 960,
      durationTicks: 480,
    });
    expect(added.preview.tracks[3]?.notes[1]).not.toHaveProperty("id");
    expect(added.preview.sourceResultHash).toBe(source.resultHash);
    expect(added.preview.tracks.slice(0, 3)).toEqual(root.preview.tracks.slice(0, 3));
    expect(root.history.revisions[0]).toEqual(rootRevision);
    expect(root.preview.tracks[3]?.notes).toHaveLength(lead.length);
    expect(added.preview).not.toHaveProperty("revisionHash");
    expect(deepFrozen(added)).toBe(true);

    const undone = undoEditorApplicationV1(added);
    if (!undone) throw new Error("Undo should restore the exact pre-add revision.");
    expect(undone.selectedRevision).toEqual(root.selectedRevision);
    expect(undone.preview).toEqual(root.preview);
    const redone = redoEditorApplicationV1(undone);
    if (!redone) throw new Error("Redo should restore the exact added-note revision.");
    expect(redone.selectedRevision).toEqual(added.selectedRevision);
    expect(redone.preview).toEqual(added.preview);
    expect(redone.history.revisions[1]?.tracks[3]?.notes[1]?.id).toBe(newNote.id);
  });
});
