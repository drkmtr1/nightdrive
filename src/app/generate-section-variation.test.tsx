import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import axe from "axe-core";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { EditorApplicationV1 } from "../web/editor-application-node";
import { BrowserAudition } from "./browser-audition";
import { GenerateSection, type VariationActions } from "./generate-section";

// Consumer responses only: synthetic identities are not canonical proofs or hash oracles.
// Complete real pinned-Node source/proof/history/preview/action evidence is separate.
type Application = Awaited<ReturnType<VariationActions["bootstrap"]>>;
const section = {
  ppq: 960,
  barCount: 8,
  endTick: 30720,
  timeSignature: { numerator: 4, denominator: 4 },
  tempo: { microsecondsPerQuarter: 500000 },
};
const source = { schema: "nightdrive.complete-section-result.v1", resultHash: "a".repeat(64) };
const roles = ["harmony", "bass", "arpeggiator", "lead"] as const;
const root = {
  schema: "nightdrive.editor-revision.v1",
  revisionHash: "b".repeat(64),
  source,
  section,
  parent: null,
  command: null,
  tracks: roles.map((role, i) => ({
    role,
    notes: [
      {
        id: `note-${String(i + 1).repeat(64)}`,
        pitch: 60,
        startTick: 0,
        durationTicks: 960,
        velocity: 100,
      },
    ],
  })),
};
function application(selectedSequence = 0, count = 1, cursor = 0): Application {
  const alternatives = Array.from({ length: count }, (_, sequence) => {
    const child = {
      ...root,
      revisionHash: String(sequence + 4).repeat(64),
      parent: { schema: root.schema, revisionHash: root.revisionHash },
      tracks: root.tracks.map((track) =>
        track.role === "lead"
          ? { ...track, notes: track.notes.map((note) => ({ ...note, pitch: 64 })) }
          : track,
      ),
    };
    return {
      sequence,
      attempt: null,
      variation: null,
      creationProof: null,
      history: {
        source,
        revisions: [root, child],
        cursor: sequence === selectedSequence ? cursor : 0,
      },
    };
  });
  const selected = alternatives[selectedSequence];
  if (!selected) throw new Error("Missing consumer fixture");
  const revision = selected.history.revisions[cursor];
  if (!revision) throw new Error("Missing consumer revision");
  return {
    collection: {
      source,
      sourceRequest: { schema: "consumer-request" },
      alternatives,
      selectedSequence,
      nextSequence: count,
    },
    selectedState: {
      schema: "nightdrive.variation-state.v1",
      stateHash: String(selectedSequence + cursor + 1).repeat(64),
    },
    selectedRevision: { schema: revision.schema, revisionHash: revision.revisionHash },
    preview: {
      sourceResultHash: source.resultHash,
      section,
      tracks: revision.tracks.map((track) => ({
        role: track.role,
        notes: track.notes.map(({ pitch, startTick, durationTicks }) => ({
          pitch: track.role === "arpeggiator" ? 60 + selectedSequence : pitch,
          startTick,
          durationTicks,
        })),
      })),
    },
  } as unknown as Application;
}
function editor(value: Application): EditorApplicationV1 {
  const selected = value.collection.alternatives.find(
    (item) => item.sequence === value.collection.selectedSequence,
  );
  if (!selected) throw new Error("Missing fixture");
  return {
    history: selected.history,
    selectedRevision: value.selectedRevision,
    preview: value.preview,
  };
}
function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
}
function setup(initial = application()) {
  const originalEditor = editor(initial);
  const generate = vi.fn().mockResolvedValue(originalEditor);
  const actions = {
    bootstrap: vi.fn().mockResolvedValue(initial),
    create: vi.fn().mockResolvedValue(application(1, 2)),
    select: vi.fn().mockResolvedValue(application(0, 2)),
    edit: vi
      .fn()
      .mockResolvedValue(
        application(initial.collection.selectedSequence, initial.collection.alternatives.length, 1),
      ),
    undo: vi
      .fn()
      .mockResolvedValue(
        application(initial.collection.selectedSequence, initial.collection.alternatives.length, 0),
      ),
    redo: vi
      .fn()
      .mockResolvedValue(
        application(initial.collection.selectedSequence, initial.collection.alternatives.length, 1),
      ),
  };
  const legacy = vi
    .fn()
    .mockRejectedValue(new Error("legacy operation must not run in M3 context"));
  const view = render(
    <GenerateSection
      choices={[
        {
          profile: "dark-synthwave",
          templates: [{ id: "degree-0654-natural-minor-v1", scale: "natural-minor" }],
        },
      ]}
      generateAction={generate}
      variationActions={actions}
      addLeadNoteAction={legacy}
      setLeadPitchAction={legacy}
      setLeadStartTickAction={legacy}
      setLeadDurationAction={legacy}
      setLeadPositionAction={legacy}
      setLeadVelocityAction={legacy}
      deleteLeadNoteAction={legacy}
      undoSectionEditAction={legacy}
      redoSectionEditAction={legacy}
    />,
  );
  fireEvent.change(screen.getByLabelText("Profile"), { target: { value: "dark-synthwave" } });
  fireEvent.change(screen.getByLabelText("Harmony template"), {
    target: { value: "degree-0654-natural-minor-v1" },
  });
  const ready = async () => {
    fireEvent.click(screen.getByRole("button", { name: "Generate" }));
    await screen.findByRole("heading", { name: "Arpeggiator variations" });
    await waitFor(() => expect(seed()).toBeEnabled());
  };
  return { ...view, actions, generate, legacy, originalEditor, ready };
}
function seed() {
  return screen.getByLabelText("Seed", { selector: "#variation-seed" });
}
function create() {
  fireEvent.click(screen.getByRole("button", { name: "Create Arpeggiator Variation" }));
}
afterEach(() => vi.restoreAllMocks());

describe("ADR042 retained Arpeggiator browser interaction", () => {
  it("exposes nothing before complete bootstrap, forwards original source/request/history and labels native controls", async () => {
    const s = setup();
    expect(screen.queryByLabelText("Active variation")).not.toBeInTheDocument();
    await s.ready();
    expect(s.actions.bootstrap).toHaveBeenCalledExactlyOnceWith(
      s.originalEditor.history.source,
      s.generate.mock.calls[0]?.[0],
      s.originalEditor.history,
    );
    expect(s.generate.mock.calls[0]?.[0].composition.bass).toEqual({
      range: { minMidiPitch: 36, maxMidiPitch: 60 },
      rhythm: "sustained",
    });
    expect(seed()).toHaveValue(null);
    for (const [key, value] of Object.entries({
      type: "number",
      name: "variationSeed",
      min: "0",
      max: "4294967295",
      step: "1",
      required: "",
    }))
      expect(seed()).toHaveAttribute(key, value);
    expect(screen.getByLabelText("Active variation")).toHaveValue("0");
    expect(screen.getByRole("option", { name: "Original" })).toHaveValue("0");
    expect(screen.getByRole("button", { name: "Apply Lead pitch" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Play" })).toBeInTheDocument();
    expect(s.actions.create).not.toHaveBeenCalled();
  });
  it.each([
    ["0", 0],
    ["4294967295", 4294967295],
    ["0007", 7],
    ["42", 42],
  ])(
    "submits explicit %s once with exact current ownership and keeps draft",
    async (draft, number) => {
      const s = setup();
      await s.ready();
      const original = application();
      fireEvent.change(seed(), { target: { value: draft } });
      fireEvent.blur(seed());
      seed().focus();
      expect(s.actions.create).not.toHaveBeenCalled();
      create();
      await waitFor(() => expect(screen.getByLabelText("Active variation")).toHaveValue("1"));
      expect(s.actions.create).toHaveBeenCalledExactlyOnceWith(
        original.collection,
        0,
        original.selectedRevision,
        {
          schema: "nightdrive.arpeggiator-variation-request.v1",
          parent: original.selectedState,
          rootSeed: number,
        },
      );
      expect((seed() as HTMLInputElement).value).toBe(draft);
      expect(s.legacy).not.toHaveBeenCalled();
    },
  );
  it.each(["", "-1", "+5", " ", "1.5", "1e2", "0x10", "4294967296", "9007199254740992"])(
    "fails closed for application-visible or browser-sanitized invalid draft %j",
    async (draft) => {
      const s = setup();
      await s.ready();
      fireEvent.change(seed(), { target: { value: draft } });
      const delivered = (seed() as HTMLInputElement).value;
      fireEvent.submit(seed().closest("form") as HTMLFormElement);
      expect(s.actions.create).not.toHaveBeenCalled();
      expect(s.actions.select).not.toHaveBeenCalled();
      expect(s.actions.edit).not.toHaveBeenCalled();
      expect(screen.getByLabelText("Active variation")).toHaveValue("0");
      expect((seed() as HTMLInputElement).value).toBe(delivered);
      expect(screen.getByText("Seed: enter a whole number from 0 to 4294967295.")).toBeVisible();
    },
  );
  it("retains repeated same-seed alternatives, stable ordered sequences and selected return; never deduplicates", async () => {
    const s = setup();
    await s.ready();
    fireEvent.change(seed(), { target: { value: "0" } });
    create();
    await waitFor(() => expect(screen.getByLabelText("Active variation")).toHaveValue("1"));
    s.actions.create.mockResolvedValueOnce(application(2, 3));
    create();
    await waitFor(() => expect(screen.getByLabelText("Active variation")).toHaveValue("2"));
    expect(
      within(screen.getByLabelText("Active variation"))
        .getAllByRole("option")
        .map((option) => [option.textContent, (option as HTMLOptionElement).value]),
    ).toEqual([
      ["Original", "0"],
      ["Variation 1", "1"],
      ["Variation 2", "2"],
    ]);
    expect(s.actions.create).toHaveBeenCalledTimes(2);
    expect(seed()).toHaveValue(0);
  });
  it("same selection dispatches nothing; another restores only the complete returned context and keeps seed", async () => {
    const initial = application(1, 2, 1);
    const s = setup(initial);
    await s.ready();
    fireEvent.change(seed(), { target: { value: "17" } });
    const selector = screen.getByLabelText("Active variation");
    fireEvent.focus(selector);
    fireEvent.change(selector, { target: { value: "1" } });
    expect(s.actions.select).not.toHaveBeenCalled();
    fireEvent.change(selector, { target: { value: "0" } });
    await waitFor(() => expect(selector).toHaveValue("0"));
    expect(s.actions.select).toHaveBeenCalledExactlyOnceWith(
      initial.collection,
      1,
      initial.selectedState,
      initial.selectedRevision,
      0,
    );
    expect(seed()).toHaveValue(17);
    expect(s.actions.create).not.toHaveBeenCalled();
    expect(screen.getByLabelText("MIDI pitch (60–84)")).toHaveValue(60);
  });
  it("selected edit and Undo/Redo submit exact collection/combined/editor owners, never legacy operations", async () => {
    const initial = application(1, 2);
    const changed = application(1, 2, 1);
    const s = setup(initial);
    await s.ready();
    fireEvent.change(screen.getByLabelText("MIDI pitch (60–84)"), { target: { value: "64" } });
    fireEvent.click(screen.getByRole("button", { name: "Apply Lead pitch" }));
    await waitFor(() => expect(screen.getByLabelText("MIDI pitch (60–84)")).toHaveValue(64));
    expect(s.actions.edit).toHaveBeenCalledExactlyOnceWith(
      initial.collection,
      1,
      initial.selectedState,
      initial.selectedRevision,
      {
        schema: "nightdrive.editor-note-command.v1",
        type: "set-note-pitch",
        noteId: `note-${"4".repeat(64)}`,
        expectedPitch: 60,
        pitch: 64,
      },
    );
    fireEvent.click(screen.getByRole("button", { name: "Undo" }));
    await waitFor(() => expect(screen.getByLabelText("MIDI pitch (60–84)")).toHaveValue(60));
    expect(s.actions.undo).toHaveBeenCalledExactlyOnceWith(
      changed.collection,
      1,
      changed.selectedState,
      changed.selectedRevision,
    );
    fireEvent.click(screen.getByRole("button", { name: "Redo" }));
    await waitFor(() => expect(screen.getByLabelText("MIDI pitch (60–84)")).toHaveValue(64));
    expect(s.actions.redo).toHaveBeenCalledExactlyOnceWith(
      initial.collection,
      1,
      initial.selectedState,
      initial.selectedRevision,
    );
    expect(s.legacy).not.toHaveBeenCalled();
  });
  it("preserves controlled selection, seed and current edited state on safe canonical rejection", async () => {
    const s = setup(application(1, 2, 1));
    await s.ready();
    fireEvent.change(seed(), { target: { value: "8" } });
    s.actions.create.mockRejectedValueOnce(new Error("SECRET internal stack"));
    create();
    await screen.findByText(
      "The variation could not be updated. Your section and histories remain unchanged.",
    );
    expect(seed()).toHaveValue(8);
    expect(screen.getByLabelText("MIDI pitch (60–84)")).toHaveValue(64);
    s.actions.select.mockRejectedValueOnce(new Error("SECRET another error"));
    fireEvent.change(screen.getByLabelText("Active variation"), { target: { value: "0" } });
    await waitFor(() => expect(screen.getByLabelText("Active variation")).toBeEnabled());
    expect(screen.getByLabelText("Active variation")).toHaveValue("1");
    expect(screen.queryByText(/SECRET/)).not.toBeInTheDocument();
  });
  it("guards duplicate and cross-operation dispatch while pending with native disabled/busy controls", async () => {
    const s = setup();
    await s.ready();
    const pending = deferred<Application>();
    s.actions.create.mockReturnValueOnce(pending.promise);
    fireEvent.change(seed(), { target: { value: "9" } });
    create();
    fireEvent.submit(seed().closest("form") as HTMLFormElement);
    fireEvent.change(screen.getByLabelText("Active variation"), { target: { value: "0" } });
    expect(seed()).toBeDisabled();
    expect(screen.getByLabelText("Active variation")).toBeDisabled();
    expect(screen.getByRole("button", { name: "Generate" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Apply Lead pitch" })).toBeDisabled();
    expect(
      screen.getByRole("heading", { name: "Arpeggiator variations" }).closest("section"),
    ).toHaveAttribute("aria-busy", "true");
    expect(s.actions.create).toHaveBeenCalledTimes(1);
    expect(s.actions.select).not.toHaveBeenCalled();
    await act(async () => pending.resolve(application(1, 2)));
    expect(seed()).toBeEnabled();
  });
  it.each(["success", "failure"])(
    "ignores stale %s after a newer application-visible seed proposal",
    async (kind) => {
      const s = setup();
      await s.ready();
      const pending = deferred<Application>();
      s.actions.create.mockReturnValueOnce(pending.promise);
      fireEvent.change(seed(), { target: { value: "9" } });
      create();
      fireEvent.change(seed(), { target: { value: "10" } });
      await act(async () => {
        if (kind === "success") pending.resolve(application(1, 2));
        else pending.reject(new Error("stale error"));
      });
      expect(screen.getByLabelText("Active variation")).toHaveValue("0");
      expect(seed()).toHaveValue(10);
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    },
  );
  it.each(["success", "failure"])(
    "ignores stale %s after generation-input invalidation",
    async (kind) => {
      const s = setup();
      await s.ready();
      const pending = deferred<Application>();
      s.actions.create.mockReturnValueOnce(pending.promise);
      fireEvent.change(seed(), { target: { value: "9" } });
      create();
      fireEvent.change(screen.getByLabelText("Key tonic"), { target: { value: "1" } });
      await act(async () => {
        if (kind === "success") pending.resolve(application(1, 2));
        else pending.reject(new Error("stale error"));
      });
      expect(screen.queryByLabelText("Active variation")).not.toBeInTheDocument();
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    },
  );
  it("ignores completion after unmount and never automatically plays", async () => {
    const play = vi.spyOn(BrowserAudition.prototype, "play").mockResolvedValue(undefined);
    const s = setup();
    await s.ready();
    const pending = deferred<Application>();
    s.actions.create.mockReturnValueOnce(pending.promise);
    fireEvent.change(seed(), { target: { value: "2" } });
    create();
    s.unmount();
    await act(async () => pending.resolve(application(1, 2)));
    expect(play).not.toHaveBeenCalled();
    expect(s.actions.create).toHaveBeenCalledTimes(1);
  });
  it("uses returned varied preview on explicit Play, invalidates only successful installs, no automatic restart", async () => {
    const play = vi.spyOn(BrowserAudition.prototype, "play").mockResolvedValue(undefined);
    const invalidate = vi.spyOn(BrowserAudition.prototype, "invalidate");
    const s = setup();
    await s.ready();
    fireEvent.click(screen.getByRole("button", { name: "Play" }));
    invalidate.mockClear();
    fireEvent.submit(seed().closest("form") as HTMLFormElement);
    expect(invalidate).not.toHaveBeenCalled();
    fireEvent.change(seed(), { target: { value: "1" } });
    create();
    await waitFor(() => expect(screen.getByLabelText("Active variation")).toHaveValue("1"));
    expect(invalidate).toHaveBeenCalledTimes(1);
    expect(play).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole("button", { name: "Play" }));
    expect(play).toHaveBeenLastCalledWith(application(1, 2).preview);
  });
  it("does not expose controls or a partial original when bootstrap fails", async () => {
    const s = setup();
    s.actions.bootstrap.mockRejectedValueOnce(new Error("private source proof"));
    fireEvent.click(screen.getByRole("button", { name: "Generate" }));
    await screen.findByRole("alert");
    expect(screen.queryByLabelText("Active variation")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Play" })).not.toBeInTheDocument();
    expect(screen.queryByText(/private source/)).not.toBeInTheDocument();
  });
  it("native form submission is available without pointer placement and has no detectable axe violations", async () => {
    const s = setup();
    await s.ready();
    seed().focus();
    expect(seed()).toHaveFocus();
    fireEvent.change(seed(), { target: { value: "7" } });
    fireEvent.submit(seed().closest("form") as HTMLFormElement);
    await waitFor(() => expect(screen.getByLabelText("Active variation")).toHaveValue("1"));
    screen.getByLabelText("Active variation").focus();
    expect(screen.getByLabelText("Active variation")).toHaveFocus();
    const result = await axe.run(s.container, { rules: { "color-contrast": { enabled: false } } });
    expect(result.violations).toHaveLength(0);
  });
});

describe("existing Lead surfaces keep selected M3 context authority", () => {
  it.each([
    {
      type: "add-note",
      values: [
        ["Pitch", "72"],
        ["Start Tick", "2400"],
        ["Duration Ticks", "480"],
      ],
      button: "Add Note",
    },
    {
      type: "set-note-start-tick",
      values: [["Absolute start tick", "480"]],
      button: "Move Lead note",
    },
    {
      type: "set-note-duration",
      values: [["Absolute duration ticks", "480"]],
      button: "Apply Lead duration",
    },
    {
      type: "set-note-position",
      values: [
        ["Position MIDI pitch (60–84)", "64"],
        ["Position absolute start tick", "480"],
      ],
      button: "Apply Lead position",
    },
    { type: "set-note-velocity", values: [["Velocity", "88"]], button: "Apply Velocity" },
    { type: "delete-note", values: [], button: "Delete selected Lead note" },
    { type: "set-note-pitch", values: [["Transpose (semitones)", "2"]], button: "Apply Transpose" },
  ])(
    "$button submits one existing $type through selected context, not legacy authority",
    async ({ type, values, button }) => {
      const initial = application(1, 2);
      const s = setup(initial);
      await s.ready();
      for (const [label, value] of values)
        fireEvent.change(screen.getByLabelText(label ?? ""), { target: { value } });
      fireEvent.click(screen.getByRole("button", { name: button }));
      await waitFor(() => expect(s.actions.edit).toHaveBeenCalledTimes(1));
      expect(s.actions.edit.mock.calls[0]?.slice(0, 4)).toEqual([
        initial.collection,
        1,
        initial.selectedState,
        initial.selectedRevision,
      ]);
      expect(s.actions.edit.mock.calls[0]?.[4]).toMatchObject({ type });
      expect(s.legacy).not.toHaveBeenCalled();
    },
  );
  it("Snap Start uses v2 in selected context and leaves pointer snapping policy unchanged", async () => {
    const initial = structuredClone(application(1, 2));
    const note = initial.collection.alternatives[1]?.history.revisions[0]?.tracks[3]?.notes[0];
    if (!note) throw new Error("Missing consumer note");
    Object.assign(note, { startTick: 121 });
    const s = setup(initial);
    await s.ready();
    fireEvent.click(screen.getByRole("button", { name: "Snap Start" }));
    await waitFor(() => expect(s.actions.edit).toHaveBeenCalledTimes(1));
    expect(s.actions.edit.mock.calls[0]?.[4]).toEqual({
      schema: "nightdrive.editor-note-command.v2",
      type: "set-note-start-tick",
      noteId: note.id,
      expectedStartTick: 121,
      startTick: 240,
    });
    expect(s.legacy).not.toHaveBeenCalled();
  });
  it("a newer delivered Lead draft invalidates an outstanding variation response without overwriting that draft", async () => {
    const s = setup();
    await s.ready();
    const pending = deferred<Application>();
    s.actions.create.mockReturnValueOnce(pending.promise);
    fireEvent.change(seed(), { target: { value: "4" } });
    create();
    fireEvent.change(screen.getByLabelText("MIDI pitch (60–84)"), { target: { value: "65" } });
    await act(async () => pending.resolve(application(1, 2)));
    expect(screen.getByLabelText("Active variation")).toHaveValue("0");
    expect(screen.getByLabelText("MIDI pitch (60–84)")).toHaveValue(65);
  });
  it.each(["success", "failure"])(
    "stale Original bootstrap %s cannot expose a replaced source",
    async (kind) => {
      const s = setup();
      const pending = deferred<Application>();
      s.actions.bootstrap.mockReturnValueOnce(pending.promise);
      fireEvent.click(screen.getByRole("button", { name: "Generate" }));
      await waitFor(() => expect(s.actions.bootstrap).toHaveBeenCalledTimes(1));
      fireEvent.change(screen.getByLabelText("Key tonic"), { target: { value: "1" } });
      await act(async () => {
        if (kind === "success") pending.resolve(application());
        else pending.reject(new Error("stale bootstrap"));
      });
      expect(screen.queryByLabelText("Active variation")).not.toBeInTheDocument();
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    },
  );
});

it("maps a recognized canonical Seed failure to associated safe feedback without copying private diagnostics", async () => {
  const s = setup();
  await s.ready();
  fireEvent.change(seed(), { target: { value: "8" } });
  s.actions.create.mockRejectedValueOnce({
    code: "INVALID_VARIATION_SEED",
    field: "request.rootSeed",
    message: "PRIVATE stack /secret/path",
  });
  create();
  await screen.findByText("Seed: enter a whole number from 0 to 4294967295.");
  expect(seed()).toHaveValue(8);
  expect(seed()).toHaveAttribute("aria-invalid", "true");
  expect(screen.getByLabelText("Active variation")).toHaveValue("0");
  expect(screen.queryByText(/PRIVATE/)).not.toBeInTheDocument();
});
