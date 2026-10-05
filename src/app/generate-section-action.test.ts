// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";
import * as completeSection from "../web/complete-section-node";
import * as editorApplication from "../web/editor-application-node";
import {
  deleteLeadNoteAction,
  generateSectionAction,
  redoSectionEditAction,
  setLeadDurationAction,
  setLeadPitchAction,
  setLeadPositionAction,
  setLeadStartTickAction,
  undoSectionEditAction,
} from "./generate-section-action";

afterEach(() => vi.restoreAllMocks());

describe("editor application server functions", () => {
  it("generates one verified source and imports that exact result as editor state", async () => {
    const request = { sentinel: "request" };
    const source = { sentinel: "verified source" };
    const application = { sentinel: "editor application" };
    const generate = vi
      .spyOn(completeSection, "generateCompleteSectionForAuditionV1")
      .mockResolvedValueOnce(source as never);
    const create = vi
      .spyOn(editorApplication, "createEditorApplicationV1")
      .mockReturnValueOnce(application as never);

    expect(await generateSectionAction(request as never)).toBe(application);
    expect(generate).toHaveBeenCalledTimes(1);
    expect(generate.mock.calls[0]?.[0]).toBe(request);
    expect(create).toHaveBeenCalledTimes(1);
    expect(create.mock.calls[0]?.[0]).toBe(source);
  });

  it("does not rely on browser validation for malformed generation requests", async () => {
    await expect(generateSectionAction({ schema: "invalid" } as never)).rejects.toMatchObject({
      code: "INVALID_COMPLETE_SECTION_REQUEST",
      field: "request",
    });
  });

  it("rejects caller hooks without executing them through the Node request validator", async () => {
    const getter = vi.fn();
    const request = Object.defineProperty({}, "schema", { get: getter, enumerable: true });
    await expect(generateSectionAction(request as never)).rejects.toBeDefined();
    expect(getter).not.toHaveBeenCalled();
  });

  it("returns no editor application when verified generation fails", async () => {
    const failure = new Error("private diagnostic");
    const generate = vi
      .spyOn(completeSection, "generateCompleteSectionForAuditionV1")
      .mockRejectedValueOnce(failure);
    const create = vi.spyOn(editorApplication, "createEditorApplicationV1");
    await expect(generateSectionAction({} as never)).rejects.toBe(failure);
    expect(generate).toHaveBeenCalledTimes(1);
    expect(create).not.toHaveBeenCalled();
  });

  it("passes edit and immutable history operations through the Node application boundary", async () => {
    const current = { sentinel: "current" } as never;
    const parent = { schema: "parent" } as never;
    const command = { schema: "command" } as never;
    const next = { sentinel: "next" };
    const edit = vi
      .spyOn(editorApplication, "editEditorApplicationPitchV1")
      .mockReturnValueOnce(next as never);
    const undo = vi
      .spyOn(editorApplication, "undoEditorApplicationV1")
      .mockReturnValueOnce(current);
    const redo = vi.spyOn(editorApplication, "redoEditorApplicationV1").mockReturnValueOnce(null);

    await expect(setLeadPitchAction(current, parent, command)).resolves.toBe(next);
    await expect(undoSectionEditAction(current)).resolves.toBe(current);
    await expect(redoSectionEditAction(current)).resolves.toBeNull();

    expect(edit).toHaveBeenCalledTimes(1);
    expect(edit.mock.calls[0]).toEqual([current, parent, command]);
    expect(undo).toHaveBeenCalledTimes(1);
    expect(undo).toHaveBeenCalledWith(current);
    expect(redo).toHaveBeenCalledTimes(1);
    expect(redo).toHaveBeenCalledWith(current);
  });

  it("passes the versioned start-tick command through the pinned Node boundary", async () => {
    const current = { sentinel: "current" } as never;
    const parent = { schema: "parent" } as never;
    const command = {
      schema: "nightdrive.editor-note-command.v2",
      type: "set-note-start-tick",
    } as never;
    const next = { sentinel: "next" };
    const edit = vi
      .spyOn(editorApplication, "editEditorApplicationStartTickV1")
      .mockReturnValueOnce(next as never);

    await expect(setLeadStartTickAction(current, parent, command)).resolves.toBe(next);
    expect(edit).toHaveBeenCalledTimes(1);
    expect(edit.mock.calls[0]).toEqual([current, parent, command]);
  });

  it("passes the atomic v5 position command through the pinned Node boundary", async () => {
    const current = { sentinel: "current" } as never;
    const parent = { schema: "parent", revisionHash: "parent-hash" } as never;
    const command = {
      schema: "nightdrive.editor-note-command.v5",
      type: "set-note-position",
      noteId: "stable-note-id",
      expectedPitch: 60,
      expectedStartTick: 0,
      pitch: 64,
      startTick: 480,
    } as never;
    const next = { sentinel: "next" };
    const edit = vi
      .spyOn(editorApplication, "editEditorApplicationPositionV1")
      .mockReturnValueOnce(next as never);

    await expect(setLeadPositionAction(current, parent, command)).resolves.toBe(next);
    expect(edit).toHaveBeenCalledTimes(1);
    expect(edit.mock.calls[0]).toEqual([current, parent, command]);
  });

  it("passes the versioned duration command through the pinned Node boundary", async () => {
    const current = { sentinel: "current" } as never;
    const parent = { schema: "parent" } as never;
    const command = {
      schema: "nightdrive.editor-note-command.v3",
      type: "set-note-duration",
    } as never;
    const next = { sentinel: "next" };
    const edit = vi
      .spyOn(editorApplication, "editEditorApplicationDurationV1")
      .mockReturnValueOnce(next as never);

    await expect(setLeadDurationAction(current, parent, command)).resolves.toBe(next);
    expect(edit).toHaveBeenCalledTimes(1);
    expect(edit.mock.calls[0]).toEqual([current, parent, command]);
  });

  it("passes the v4 delete-note command through the Node application boundary", async () => {
    const current = { sentinel: "current" } as never;
    const parent = { schema: "parent" } as never;
    const command = {
      schema: "nightdrive.editor-note-command.v4",
      type: "delete-note",
      noteId: "stable-note-id",
    } as never;
    const next = { sentinel: "next" };
    const edit = vi
      .spyOn(editorApplication, "editEditorApplicationDeleteNoteV1")
      .mockReturnValueOnce(next as never);

    await expect(deleteLeadNoteAction(current, parent, command)).resolves.toBe(next);
    expect(edit).toHaveBeenCalledTimes(1);
    expect(edit.mock.calls[0]).toEqual([current, parent, command]);
  });

  it("propagates edit failures without returning fallback state", async () => {
    const failure = new Error("private diagnostic");
    const edit = vi
      .spyOn(editorApplication, "editEditorApplicationPitchV1")
      .mockImplementationOnce(() => {
        throw failure;
      });
    await expect(setLeadPitchAction({} as never, {} as never, {} as never)).rejects.toBe(failure);
    expect(edit).toHaveBeenCalledTimes(1);
  });
});
