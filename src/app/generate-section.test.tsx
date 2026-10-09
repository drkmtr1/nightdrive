import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import axe from "axe-core";
import { describe, expect, it, vi } from "vitest";
import type {
  CompleteSectionRequestV1,
  CompleteSectionResultV1,
} from "../composition/complete-section";
import type { EditorRevisionV1 } from "../composition/editor-revision";
import type { CompleteSectionPreview } from "../web/complete-section-preview-node";
import type { EditorApplicationV1 } from "../web/editor-application-node";
import {
  createBrowserAuditionDependencies,
  GenerateSection,
  type GenerationChoice,
} from "./generate-section";

const CHOICES: readonly GenerationChoice[] = [
  {
    profile: "dark-synthwave",
    templates: [{ id: "degree-0654-natural-minor-v1", scale: "natural-minor" }],
  },
  { profile: "darkwave", templates: [{ id: "degree-0364-phrygian-v1", scale: "phrygian" }] },
];
// Consumer fixture only, not a canonical result or musical oracle.
const PREVIEW: CompleteSectionPreview = {
  sourceResultHash: "a".repeat(64),
  section: {
    ppq: 960,
    barCount: 8,
    timeSignature: { numerator: 4, denominator: 4 },
    tempo: { microsecondsPerQuarter: 500000 },
    endTick: 30720,
  },
  tracks: ["harmony", "bass", "arpeggiator", "lead"].map((role) => ({
    role: role as CompleteSectionPreview["tracks"][number]["role"],
    notes: [{ pitch: 60, startTick: 0, durationTicks: 960 }],
  })),
};
const NOTE_ID = `note-${"d".repeat(64)}`;

function makeEditorApplication(
  leadPitch = 60,
  includeChild = false,
  selectedCursor?: number,
  leadStartTick?: number,
  leadDurationTicks?: number,
  deleteLeadNote = false,
): EditorApplicationV1 {
  const roles = ["harmony", "bass", "arpeggiator", "lead"] as const;
  const rootTracks = roles.map((role, index) => ({
    role,
    notes: [
      {
        id: `note-${["a", "b", "c", "d"][index]?.repeat(64)}`,
        pitch: 60,
        startTick: 0,
        durationTicks: 960,
        velocity: 100,
      },
    ],
  }));
  const root = {
    schema: "nightdrive.editor-revision.v1",
    source: { schema: "nightdrive.complete-section-result.v1", resultHash: "a".repeat(64) },
    section: {
      ppq: PREVIEW.section.ppq,
      barCount: PREVIEW.section.barCount,
      timeSignature: PREVIEW.section.timeSignature,
      tempo: PREVIEW.section.tempo,
      endTick: PREVIEW.section.endTick,
    },
    tracks: rootTracks,
    parent: null,
    command: null,
    revisionHash: "b".repeat(64),
  } as unknown as EditorRevisionV1;
  const child = {
    ...root,
    tracks: root.tracks.map((track) =>
      track.role === "lead"
        ? {
            ...track,
            notes: deleteLeadNote
              ? track.notes.filter((note) => note.id !== NOTE_ID)
              : track.notes.map((note) => ({
                  ...note,
                  pitch: leadPitch,
                  ...(leadStartTick === undefined ? {} : { startTick: leadStartTick }),
                  ...(leadDurationTicks === undefined ? {} : { durationTicks: leadDurationTicks }),
                })),
          }
        : track,
    ),
    parent: { schema: root.schema, revisionHash: root.revisionHash },
    command: deleteLeadNote
      ? {
          schema: "nightdrive.editor-note-command.v4",
          type: "delete-note",
          noteId: NOTE_ID,
        }
      : leadStartTick !== undefined && leadPitch !== 60
        ? {
            schema: "nightdrive.editor-note-command.v5",
            type: "set-note-position",
            noteId: NOTE_ID,
            expectedPitch: 60,
            expectedStartTick: 0,
            pitch: leadPitch,
            startTick: leadStartTick,
          }
        : leadStartTick !== undefined
          ? {
              schema: "nightdrive.editor-note-command.v2",
              type: "set-note-start-tick",
              noteId: NOTE_ID,
              expectedStartTick: 0,
              startTick: leadStartTick,
            }
          : leadDurationTicks !== undefined
            ? {
                schema: "nightdrive.editor-note-command.v3",
                type: "set-note-duration",
                noteId: NOTE_ID,
                expectedDurationTicks: 960,
                durationTicks: leadDurationTicks,
              }
            : {
                schema: "nightdrive.editor-note-command.v1",
                type: "set-note-pitch",
                noteId: NOTE_ID,
                expectedPitch: 60,
                pitch: leadPitch,
              },
    revisionHash: "c".repeat(64),
  } as unknown as EditorRevisionV1;
  const revisions = includeChild ? [root, child] : [root];
  const cursor = includeChild ? (selectedCursor ?? 1) : 0;
  const selected = revisions[cursor];
  const preview: CompleteSectionPreview = {
    ...PREVIEW,
    tracks: selected.tracks.map((track) => ({
      role: track.role,
      notes: track.notes.map(({ pitch, startTick, durationTicks }) => ({
        pitch,
        startTick,
        durationTicks,
      })),
    })),
  };
  return {
    history: {
      source: {} as CompleteSectionResultV1,
      revisions,
      cursor,
    },
    selectedRevision: { schema: selected.schema, revisionHash: selected.revisionHash },
    preview,
  } as EditorApplicationV1;
}

const ROOT_APPLICATION = makeEditorApplication();
const EDITED_APPLICATION = makeEditorApplication(64, true);
const UNDONE_APPLICATION = makeEditorApplication(64, true, 0);
const MOVED_APPLICATION = makeEditorApplication(60, true, 1, 480);
const MOVED_UNDONE_APPLICATION = makeEditorApplication(60, true, 0, 480);
const POSITION_APPLICATION = makeEditorApplication(64, true, 1, 480);
const POSITION_UNDONE_APPLICATION = makeEditorApplication(64, true, 0, 480);
const PITCH_POSITION_APPLICATION = makeEditorApplication(64, true, 1, 0);
const DURATION_APPLICATION = makeEditorApplication(60, true, 1, undefined, 1440);
const DURATION_UNDONE_APPLICATION = makeEditorApplication(60, true, 0, undefined, 1440);
function makeVelocityApplication(velocity: number, cursor = 1): EditorApplicationV1 {
  const root = ROOT_APPLICATION.history.revisions[0];
  const rootLead = root?.tracks.find((track) => track.role === "lead");
  if (!root || !rootLead) throw new Error("Missing editor root fixture.");
  const child = {
    ...root,
    tracks: root.tracks.map((track) =>
      track.role === "lead"
        ? {
            ...track,
            notes: track.notes.map((note) => (note.id === NOTE_ID ? { ...note, velocity } : note)),
          }
        : track,
    ),
    parent: { schema: root.schema, revisionHash: root.revisionHash },
    command: {
      schema: "nightdrive.editor-note-command.v7",
      type: "set-note-velocity",
      noteId: NOTE_ID,
      expectedVelocity: 100,
      velocity,
    },
    revisionHash: "9".repeat(64),
  } as unknown as EditorRevisionV1;
  const revisions = [root, child];
  const selected = revisions[cursor];
  if (!selected) throw new Error("Invalid velocity revision cursor.");
  return {
    history: { ...ROOT_APPLICATION.history, revisions, cursor },
    selectedRevision: { schema: selected.schema, revisionHash: selected.revisionHash },
    preview: ROOT_APPLICATION.preview,
  } as EditorApplicationV1;
}
const VELOCITY_APPLICATION = makeVelocityApplication(88);
const VELOCITY_UNDONE_APPLICATION = makeVelocityApplication(88, 0);
const DELETED_APPLICATION = makeEditorApplication(60, true, 1, undefined, undefined, true);
const DELETED_UNDONE_APPLICATION = makeEditorApplication(60, true, 0, undefined, undefined, true);
const ADDED_NOTE_ID = `note-${"e".repeat(64)}`;

function makeAddedLeadApplication(cursor = 1): EditorApplicationV1 {
  const root = ROOT_APPLICATION.history.revisions[0];
  if (!root) throw new Error("Missing editor root fixture.");
  const child = {
    ...root,
    tracks: root.tracks.map((track) =>
      track.role === "lead"
        ? {
            ...track,
            notes: [
              ...track.notes,
              {
                id: ADDED_NOTE_ID,
                pitch: 64,
                startTick: 960,
                durationTicks: 480,
                velocity: 100,
              },
            ],
          }
        : track,
    ),
    parent: { schema: root.schema, revisionHash: root.revisionHash },
    command: {
      schema: "nightdrive.editor-note-command.v6",
      type: "add-note",
      pitch: 64,
      startTick: 960,
      durationTicks: 480,
    },
    revisionHash: "e".repeat(64),
  } as unknown as EditorRevisionV1;
  const selected = cursor === 1 ? child : root;
  return {
    history: {
      source: ROOT_APPLICATION.history.source,
      revisions: [root, child],
      cursor,
    },
    selectedRevision: { schema: selected.schema, revisionHash: selected.revisionHash },
    preview: {
      ...ROOT_APPLICATION.preview,
      tracks: selected.tracks.map((track) => ({
        role: track.role,
        notes: track.notes.map(({ pitch, startTick, durationTicks }) => ({
          pitch,
          startTick,
          durationTicks,
        })),
      })),
    },
  };
}

const ADDED_APPLICATION = makeAddedLeadApplication();
const ADDED_UNDONE_APPLICATION = makeAddedLeadApplication(0);
const OVERLAPPING_NOTE_ID = `note-${"f".repeat(64)}`;

function makeOverlappingLeadApplication(): EditorApplicationV1 {
  const existingRoot = ROOT_APPLICATION.history.revisions[0];
  if (!existingRoot) throw new Error("Missing editor root fixture.");
  const leadTrack = existingRoot.tracks.find((track) => track.role === "lead");
  const existingNote = leadTrack?.notes[0];
  if (!leadTrack || !existingNote) throw new Error("Missing Lead note fixture.");
  const overlappingNote = { ...existingNote, id: OVERLAPPING_NOTE_ID };
  const root = {
    ...existingRoot,
    revisionHash: "f".repeat(64),
    tracks: existingRoot.tracks.map((track) =>
      track.role === "lead" ? { ...track, notes: [...track.notes, overlappingNote] } : track,
    ),
  };
  const previewTracks = ROOT_APPLICATION.preview.tracks.map((track) =>
    track.role === "lead"
      ? {
          ...track,
          notes: [
            ...track.notes,
            {
              pitch: overlappingNote.pitch,
              startTick: overlappingNote.startTick,
              durationTicks: overlappingNote.durationTicks,
            },
          ],
        }
      : track,
  );
  return {
    history: { ...ROOT_APPLICATION.history, revisions: [root], cursor: 0 },
    selectedRevision: { schema: root.schema, revisionHash: root.revisionHash },
    preview: { ...ROOT_APPLICATION.preview, tracks: previewTracks },
  };
}

function makeVelocitySelectionApplication(): EditorApplicationV1 {
  const application = makeOverlappingLeadApplication();
  const original = application.history.revisions[0];
  if (!original) throw new Error("Missing Lead selection fixture.");
  const root = {
    ...original,
    tracks: original.tracks.map((track) =>
      track.role === "lead"
        ? {
            ...track,
            notes: track.notes.map((note) =>
              note.id === OVERLAPPING_NOTE_ID
                ? { ...note, pitch: 64, startTick: 960, velocity: 73 }
                : note,
            ),
          }
        : track,
    ),
  };
  const preview = {
    ...application.preview,
    tracks: application.preview.tracks.map((track) =>
      track.role === "lead"
        ? {
            ...track,
            notes: [...track.notes, { pitch: 64, startTick: 960, durationTicks: 960 }],
          }
        : track,
    ),
  };
  return {
    ...application,
    history: { ...application.history, revisions: [root] },
    selectedRevision: { schema: root.schema, revisionHash: root.revisionHash },
    preview,
  } as EditorApplicationV1;
}

function makeActions() {
  return {
    generateAction: vi.fn().mockResolvedValue(ROOT_APPLICATION),
    addLeadNoteAction: vi.fn().mockResolvedValue(ADDED_APPLICATION),
    setLeadPitchAction: vi.fn().mockResolvedValue(EDITED_APPLICATION),
    setLeadStartTickAction: vi.fn().mockResolvedValue(MOVED_APPLICATION),
    setLeadPositionAction: vi.fn().mockResolvedValue(POSITION_APPLICATION),
    setLeadDurationAction: vi.fn().mockResolvedValue(DURATION_APPLICATION),
    setLeadVelocityAction: vi.fn().mockResolvedValue(VELOCITY_APPLICATION),
    deleteLeadNoteAction: vi.fn().mockResolvedValue(DELETED_APPLICATION),
    undoSectionEditAction: vi.fn().mockResolvedValue(UNDONE_APPLICATION),
    redoSectionEditAction: vi.fn().mockResolvedValue(EDITED_APPLICATION),
  };
}

function renderConsumer(actions = makeActions()) {
  return {
    actions,
    ...render(<GenerateSection choices={CHOICES} {...actions} />),
  };
}
function installFakeAudioContext() {
  const sources: Array<{ stop: ReturnType<typeof vi.fn> }> = [];
  const context = {
    currentTime: 0,
    state: "running",
    onstatechange: null,
    resume: vi.fn().mockResolvedValue(undefined),
    createOscillator: vi.fn(() => {
      const next = {
        connect: vi.fn(),
        disconnect: vi.fn(),
        frequency: { setValueAtTime: vi.fn() },
        start: vi.fn(),
        stop: vi.fn(),
        type: "sine",
      };
      sources.push(next);
      return next;
    }),
    createGain: vi.fn(() => ({
      connect: vi.fn(),
      disconnect: vi.fn(),
      gain: {
        value: 0,
        cancelScheduledValues: vi.fn(),
        linearRampToValueAtTime: vi.fn(),
        setValueAtTime: vi.fn(),
      },
    })),
    destination: {},
  };
  const original = Object.getOwnPropertyDescriptor(window, "AudioContext");
  function TestAudioContext() {
    return context;
  }
  Object.defineProperty(window, "AudioContext", {
    configurable: true,
    value: TestAudioContext,
  });
  return {
    sources,
    restore() {
      if (original) Object.defineProperty(window, "AudioContext", original);
      else Reflect.deleteProperty(window, "AudioContext");
    },
  };
}
function choose() {
  fireEvent.change(screen.getByLabelText("Profile"), { target: { value: "dark-synthwave" } });
  fireEvent.change(screen.getByLabelText("Harmony template"), {
    target: { value: "degree-0654-natural-minor-v1" },
  });
}
function submit() {
  const form = screen.getByRole("button", { name: "Generate" }).closest("form");
  if (!form) throw new Error("Missing form.");
  fireEvent.submit(form);
}

function makeSnappedApplication(
  initial: EditorApplicationV1,
  startTick: number,
): EditorApplicationV1 {
  const parent = initial.history.revisions[initial.history.cursor];
  if (!parent) throw new Error("Missing snap test parent.");
  const note = parent.tracks[3]?.notes[0];
  if (!note) throw new Error("Missing snap test note.");
  const child = {
    ...parent,
    parent: initial.selectedRevision,
    command: {
      schema: "nightdrive.editor-note-command.v2",
      type: "set-note-start-tick",
      noteId: note.id,
      expectedStartTick: note.startTick,
      startTick,
    },
    tracks: parent.tracks.map((track) =>
      track.role === "lead"
        ? {
            ...track,
            notes: track.notes.map((item) => (item.id === note.id ? { ...item, startTick } : item)),
          }
        : track,
    ),
    revisionHash: "e".repeat(64),
  } as EditorRevisionV1;
  return {
    ...initial,
    history: {
      ...initial.history,
      revisions: [...initial.history.revisions.slice(0, initial.history.cursor + 1), child],
      cursor: initial.history.cursor + 1,
    },
    selectedRevision: { schema: child.schema, revisionHash: child.revisionHash },
    preview: {
      ...initial.preview,
      tracks: child.tracks.map((track) => ({
        role: track.role,
        notes: track.notes.map(({ pitch, startTick: tick, durationTicks }) => ({
          pitch,
          startTick: tick,
          durationTicks,
        })),
      })),
    },
  };
}

describe("Generate section consumer", () => {
  it.each([
    [0, 0],
    [119, 0],
    [120, 240],
    [121, 240],
    [239, 240],
    [240, 240],
    [359, 240],
    [360, 480],
    [361, 480],
  ])("Snap Start maps literal tick %i to %i through existing v2", async (oldTick, snappedTick) => {
    const initial = makeEditorApplication(60, true, 1, oldTick);
    const next = makeSnappedApplication(initial, snappedTick);
    const actions = makeActions();
    actions.generateAction.mockResolvedValue(initial);
    actions.setLeadStartTickAction.mockResolvedValue(next);
    renderConsumer(actions);
    choose();
    submit();
    await screen.findByRole("heading", { name: "Generated section" });
    const button = screen.getByRole("button", { name: "Snap Start" });
    expect(button).toHaveAttribute("type", "button");
    expect(button).toBeEnabled();
    fireEvent.click(button);
    if (oldTick === snappedTick) {
      expect(actions.setLeadStartTickAction).not.toHaveBeenCalled();
      expect(screen.getByText("Editor revision 2 of 2.")).toBeVisible();
      return;
    }
    await screen.findByText("Editor revision 3 of 3.");
    expect(actions.setLeadStartTickAction.mock.calls).toEqual([
      [
        initial,
        initial.selectedRevision,
        {
          schema: "nightdrive.editor-note-command.v2",
          type: "set-note-start-tick",
          noteId: NOTE_ID,
          expectedStartTick: oldTick,
          startTick: snappedTick,
        },
      ],
    ]);
    expect(screen.getByLabelText("Absolute start tick")).toHaveValue(snappedTick);
    expect(next.preview.sourceResultHash).toBe(initial.preview.sourceResultHash);
    expect(next.history.revisions[2]?.tracks.slice(0, 3)).toEqual(
      initial.history.revisions[1]?.tracks.slice(0, 3),
    );
  });

  it.each([
    { oldTick: 30719, duration: 1, expected: 30720, code: "EDITOR_NOTE_START_OUT_OF_RANGE" },
    { oldTick: 30600, duration: 120, expected: 30720, code: "EDITOR_NOTE_START_OUT_OF_RANGE" },
    { oldTick: 30361, duration: 359, expected: 30480, code: "EDITOR_NOTE_START_OUT_OF_RANGE" },
    { oldTick: 350, duration: 960, expected: 240, code: "EDITOR_NOTE_START_ORDER_INVALID" },
    { oldTick: 370, duration: 960, expected: 480, code: "EDITOR_NOTE_START_ORDER_INVALID" },
  ])(
    "keeps rejected Snap Start $oldTick unchanged without alternative grid fallback",
    async ({ oldTick, duration, expected, code }) => {
      const initial = makeEditorApplication(60, true, 1, oldTick, duration);
      const actions = makeActions();
      actions.generateAction.mockResolvedValue(initial);
      actions.setLeadStartTickAction.mockRejectedValue({
        code,
        field: "command.startTick",
        message: "private detail",
      });
      renderConsumer(actions);
      choose();
      submit();
      await screen.findByRole("heading", { name: "Generated section" });
      fireEvent.click(screen.getByRole("button", { name: "Snap Start" }));
      await screen.findByRole("alert");
      expect(actions.setLeadStartTickAction.mock.calls).toEqual([
        [
          initial,
          initial.selectedRevision,
          {
            schema: "nightdrive.editor-note-command.v2",
            type: "set-note-start-tick",
            noteId: NOTE_ID,
            expectedStartTick: oldTick,
            startTick: expected,
          },
        ],
      ]);
      expect(screen.getByLabelText("Absolute start tick")).toHaveValue(oldTick);
      expect(screen.getByLabelText("Absolute duration ticks")).toHaveValue(duration);
      expect(screen.getByText("Editor revision 2 of 2.")).toBeVisible();
      expect(screen.queryByText(/private detail/)).toBeNull();
    },
  );

  it("Snap Start targets an added stable note and preserves on-grid redo and active playback", async () => {
    const actions = makeActions();
    actions.generateAction.mockResolvedValue(ADDED_APPLICATION);
    renderConsumer(actions);
    choose();
    submit();
    await screen.findByRole("heading", { name: "Generated section" });
    fireEvent.change(screen.getByLabelText("Lead note"), { target: { value: ADDED_NOTE_ID } });
    fireEvent.click(screen.getByRole("button", { name: "Snap Start" }));
    expect(actions.setLeadStartTickAction).not.toHaveBeenCalled();
    expect(screen.getByLabelText("Lead note")).toHaveValue(ADDED_NOTE_ID);
    expect(screen.getByText("Editor revision 2 of 2.")).toBeVisible();
  });

  it("Snap Start sends the selected added note's stable ID through v2", async () => {
    const selected = ADDED_APPLICATION.history.revisions[1];
    if (!selected) throw new Error("Missing added note fixture.");
    const revision = {
      ...selected,
      tracks: selected.tracks.map((track) =>
        track.role === "lead"
          ? {
              ...track,
              notes: track.notes.map((note) =>
                note.id === ADDED_NOTE_ID ? { ...note, startTick: 1001 } : note,
              ),
            }
          : track,
      ),
    };
    const initial = {
      ...ADDED_APPLICATION,
      history: {
        ...ADDED_APPLICATION.history,
        revisions: [ADDED_APPLICATION.history.revisions[0] as EditorRevisionV1, revision],
      },
    };
    const actions = makeActions();
    actions.generateAction.mockResolvedValue(initial);
    actions.setLeadStartTickAction.mockRejectedValue(new Error("safe rejection test"));
    renderConsumer(actions);
    choose();
    submit();
    await screen.findByRole("heading", { name: "Generated section" });
    fireEvent.change(screen.getByLabelText("Lead note"), { target: { value: ADDED_NOTE_ID } });
    fireEvent.click(screen.getByRole("button", { name: "Snap Start" }));
    await screen.findByRole("alert");
    expect(actions.setLeadStartTickAction.mock.calls).toEqual([
      [
        initial,
        initial.selectedRevision,
        {
          schema: "nightdrive.editor-note-command.v2",
          type: "set-note-start-tick",
          noteId: ADDED_NOTE_ID,
          expectedStartTick: 1001,
          startTick: 960,
        },
      ],
    ]);
    expect(screen.getByLabelText("Lead note")).toHaveValue(ADDED_NOTE_ID);
    expect(screen.getByLabelText("Absolute start tick")).toHaveValue(1001);
  });

  it("Snap Start does not invalidate active playback or redo for an on-grid selected note", async () => {
    const audio = installFakeAudioContext();
    try {
      const actions = makeActions();
      actions.generateAction.mockResolvedValue(UNDONE_APPLICATION);
      renderConsumer(actions);
      choose();
      submit();
      await screen.findByRole("heading", { name: "Generated section" });
      fireEvent.click(screen.getByRole("button", { name: "Play" }));
      await screen.findByText("Playing all four roles.");
      const stopCalls = audio.sources.map((source) => source.stop.mock.calls.length);
      fireEvent.click(screen.getByRole("button", { name: "Snap Start" }));
      expect(actions.setLeadStartTickAction).not.toHaveBeenCalled();
      expect(screen.getByText("Playing all four roles.")).toBeVisible();
      expect(screen.getByRole("button", { name: "Redo" })).toBeEnabled();
      expect(audio.sources.map((source) => source.stop.mock.calls.length)).toEqual(stopCalls);
    } finally {
      audio.restore();
    }
  });

  it("fails closed for malformed local start context and disables Snap Start with no selected note", async () => {
    const actions = makeActions();
    actions.generateAction.mockResolvedValue(makeEditorApplication(60, true, 1, -1));
    renderConsumer(actions);
    choose();
    submit();
    await screen.findByRole("heading", { name: "Generated section" });
    fireEvent.click(screen.getByRole("button", { name: "Snap Start" }));
    expect(actions.setLeadStartTickAction).not.toHaveBeenCalled();
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Snap Start could not use this note's timing",
    );
    actions.generateAction.mockResolvedValue(DELETED_APPLICATION);
    submit();
    await waitFor(() => expect(screen.getByRole("button", { name: "Snap Start" })).toBeDisabled());
  });

  it.each(["resolve", "reject"])(
    "guards duplicate Snap Start and ignores stale %s after input change",
    async (outcome) => {
      const initial = makeEditorApplication(60, true, 1, 120);
      let resolveEdit!: (value: EditorApplicationV1) => void;
      let rejectEdit!: (reason: Error) => void;
      const actions = makeActions();
      actions.generateAction.mockResolvedValue(initial);
      actions.setLeadStartTickAction.mockImplementation(
        () =>
          new Promise((resolve, reject) => {
            resolveEdit = resolve;
            rejectEdit = reject;
          }),
      );
      renderConsumer(actions);
      choose();
      submit();
      await screen.findByRole("heading", { name: "Generated section" });
      const button = screen.getByRole("button", { name: "Snap Start" });
      fireEvent.click(button);
      fireEvent.click(button);
      expect(actions.setLeadStartTickAction).toHaveBeenCalledTimes(1);
      expect(button).toBeDisabled();
      fireEvent.change(screen.getByLabelText("Energy"), { target: { value: "high" } });
      await act(async () => {
        if (outcome === "resolve") resolveEdit(makeSnappedApplication(initial, 240));
        else rejectEdit(new Error("private stale snap"));
      });
      expect(screen.queryByRole("heading", { name: "Generated section" })).toBeNull();
      expect(screen.queryByRole("alert")).toBeNull();
    },
  );

  it("Snap Start restores exact selected applications on one-step Undo/Redo and invalidates active audition", async () => {
    const audio = installFakeAudioContext();
    try {
      const initial = makeEditorApplication(60, true, 1, 120);
      const next = makeSnappedApplication(initial, 240);
      const actions = makeActions();
      actions.generateAction.mockResolvedValue(initial);
      actions.setLeadStartTickAction.mockResolvedValue(next);
      actions.undoSectionEditAction.mockResolvedValue({
        ...next,
        history: { ...next.history, cursor: 1 },
        selectedRevision: initial.selectedRevision,
        preview: initial.preview,
      });
      actions.redoSectionEditAction.mockResolvedValue(next);
      renderConsumer(actions);
      choose();
      submit();
      await screen.findByRole("heading", { name: "Generated section" });
      fireEvent.click(screen.getByRole("button", { name: "Play" }));
      await screen.findByText("Playing all four roles.");
      const count = audio.sources.length;
      fireEvent.click(screen.getByRole("button", { name: "Snap Start" }));
      await screen.findByText("Editor revision 3 of 3.");
      expect(screen.getByText("Playback stopped.")).toBeVisible();
      expect(audio.sources).toHaveLength(count);
      fireEvent.click(screen.getByRole("button", { name: "Undo" }));
      await screen.findByText("Editor revision 2 of 3.");
      expect(actions.undoSectionEditAction).toHaveBeenCalledWith(next);
      expect(screen.getByLabelText("Absolute start tick")).toHaveValue(120);
      fireEvent.click(screen.getByRole("button", { name: "Redo" }));
      await screen.findByText("Editor revision 3 of 3.");
      expect(screen.getByLabelText("Absolute start tick")).toHaveValue(240);
      expect(actions.setLeadStartTickAction).toHaveBeenCalledTimes(1);
    } finally {
      audio.restore();
    }
  });

  it("targets an added note by stable ID and clears the delta on piano-roll selection", async () => {
    const actions = makeActions();
    actions.generateAction.mockResolvedValue(ADDED_APPLICATION);
    actions.setLeadPitchAction.mockRejectedValue(new Error("rejected"));
    renderConsumer(actions);
    choose();
    submit();
    await screen.findByRole("heading", { name: "Generated section" });
    const field = screen.getByLabelText("Transpose (semitones)");
    fireEvent.change(field, { target: { value: "3" } });
    fireEvent.click(
      screen.getByRole("button", {
        name: "Lead note 2, MIDI pitch 64, start tick 960, duration 480 ticks",
      }),
    );
    expect(field).toHaveValue("");
    fireEvent.change(field, { target: { value: "-2" } });
    fireEvent.submit(screen.getByRole("form", { name: "Transpose selected Lead note" }));
    await screen.findByRole("alert");
    const note = ADDED_APPLICATION.history.revisions[1]?.tracks[3]?.notes[1];
    expect(actions.setLeadPitchAction).toHaveBeenCalledWith(
      ADDED_APPLICATION,
      ADDED_APPLICATION.selectedRevision,
      {
        schema: "nightdrive.editor-note-command.v1",
        type: "set-note-pitch",
        noteId: note?.id,
        expectedPitch: 64,
        pitch: 62,
      },
    );
    expect(field).toHaveValue("-2");
    expect(screen.getByText("Editor revision 2 of 2.")).toBeVisible();
  });

  it.each([
    { oldPitch: 60, draft: "2", replacement: 62 },
    { oldPitch: 64, draft: "-2", replacement: 62 },
    { oldPitch: 64, draft: "-4", replacement: 60 },
    { oldPitch: 60, draft: "24", replacement: 84 },
  ])(
    "transposes $oldPitch by $draft through one existing absolute pitch command",
    async ({ oldPitch, draft, replacement }) => {
      const initial = oldPitch === 60 ? ROOT_APPLICATION : makeEditorApplication(oldPitch, true);
      const next = makeEditorApplication(replacement, true);
      const actions = makeActions();
      actions.generateAction.mockResolvedValue(initial);
      actions.setLeadPitchAction.mockResolvedValue(next);
      renderConsumer(actions);
      choose();
      submit();
      await screen.findByRole("heading", { name: "Generated section" });
      const field = screen.getByLabelText("Transpose (semitones)");
      expect(field).toHaveAttribute("type", "text");
      expect(field).toHaveValue("");
      fireEvent.change(field, { target: { value: draft } });
      expect(actions.setLeadPitchAction).not.toHaveBeenCalled();
      fireEvent.submit(screen.getByRole("form", { name: "Transpose selected Lead note" }));
      await waitFor(() => expect(field).toHaveValue(""));
      expect(actions.setLeadPitchAction.mock.calls).toEqual([
        [
          initial,
          initial.selectedRevision,
          {
            schema: "nightdrive.editor-note-command.v1",
            type: "set-note-pitch",
            noteId: NOTE_ID,
            expectedPitch: oldPitch,
            pitch: replacement,
          },
        ],
      ]);
      expect(screen.getByLabelText("MIDI pitch (60–84)")).toHaveValue(replacement);
      expect(screen.getByLabelText("Absolute start tick")).toHaveValue(0);
      expect(screen.getByLabelText("Absolute duration ticks")).toHaveValue(960);
      expect(next.preview.sourceResultHash).toBe(initial.preview.sourceResultHash);
      expect(initial.history.revisions[initial.history.cursor]?.tracks[3]?.notes[0]?.pitch).toBe(
        oldPitch,
      );
    },
  );

  it.each(["", " ", "+2", "1.5", "1e2", "9007199254740992", "9007199254740991", "-1", "25"])(
    "rejects transpose draft %j without dispatch or changing editor state",
    async (draft) => {
      const { actions } = renderConsumer();
      choose();
      submit();
      await screen.findByRole("heading", { name: "Generated section" });
      const field = screen.getByLabelText("Transpose (semitones)");
      fireEvent.change(field, { target: { value: draft } });
      fireEvent.submit(screen.getByRole("form", { name: "Transpose selected Lead note" }));
      expect(actions.setLeadPitchAction).not.toHaveBeenCalled();
      expect(field).toHaveValue(draft);
      expect(screen.getByRole("alert")).toHaveTextContent("Transpose:");
      expect(screen.getByLabelText("MIDI pitch (60–84)")).toHaveValue(60);
      expect(screen.getByText("Editor revision 1 of 1.")).toBeVisible();
    },
  );

  it.each(["0", "-0", "000"])("keeps transpose %j a no-op", async (draft) => {
    const { actions } = renderConsumer();
    choose();
    submit();
    await screen.findByRole("heading", { name: "Generated section" });
    fireEvent.change(screen.getByLabelText("Transpose (semitones)"), { target: { value: draft } });
    fireEvent.submit(screen.getByRole("form", { name: "Transpose selected Lead note" }));
    expect(actions.setLeadPitchAction).not.toHaveBeenCalled();
    expect(screen.getByText("Editor revision 1 of 1.")).toBeVisible();
  });

  it("preserves a rejected transpose draft and uses safe boundary feedback", async () => {
    const actions = makeActions();
    actions.setLeadPitchAction.mockRejectedValue(new Error("private stack path"));
    renderConsumer(actions);
    choose();
    submit();
    await screen.findByRole("heading", { name: "Generated section" });
    fireEvent.change(screen.getByLabelText("Transpose (semitones)"), { target: { value: "2" } });
    fireEvent.submit(screen.getByRole("form", { name: "Transpose selected Lead note" }));
    await screen.findByRole("alert");
    expect(screen.getByLabelText("Transpose (semitones)")).toHaveValue("2");
    expect(screen.getByText("Editor revision 1 of 1.")).toBeVisible();
    expect(screen.queryByText(/private stack path/)).toBeNull();
    expect(actions.setLeadPitchAction).toHaveBeenCalledTimes(1);
  });

  it("clears transpose drafts on selection and undo/redo, retaining one-step history", async () => {
    const { actions } = renderConsumer();
    choose();
    submit();
    await screen.findByRole("heading", { name: "Generated section" });
    const field = screen.getByLabelText("Transpose (semitones)");
    fireEvent.change(field, { target: { value: "4" } });
    fireEvent.submit(screen.getByRole("form", { name: "Transpose selected Lead note" }));
    await screen.findByText("Editor revision 2 of 2.");
    expect(actions.setLeadPitchAction).toHaveBeenCalledTimes(1);
    fireEvent.change(field, { target: { value: "-1" } });
    fireEvent.click(screen.getByRole("button", { name: "Undo" }));
    await screen.findByText("Editor revision 1 of 2.");
    expect(field).toHaveValue("");
    expect(actions.undoSectionEditAction).toHaveBeenCalledWith(EDITED_APPLICATION);
    fireEvent.change(field, { target: { value: "3" } });
    fireEvent.click(screen.getByRole("button", { name: "Redo" }));
    await screen.findByText("Editor revision 2 of 2.");
    expect(field).toHaveValue("");
    expect(actions.redoSectionEditAction).toHaveBeenCalledWith(UNDONE_APPLICATION);
    fireEvent.change(field, { target: { value: "3" } });
    fireEvent.change(screen.getByLabelText("Lead note"), { target: { value: NOTE_ID } });
    expect(field).toHaveValue("");
  });

  it.each(["resolve", "reject"])(
    "suppresses duplicate transpose and stale %s after input invalidation",
    async (outcome) => {
      let resolveEdit!: (value: EditorApplicationV1) => void;
      let rejectEdit!: (reason: Error) => void;
      const actions = makeActions();
      actions.setLeadPitchAction.mockImplementation(
        () =>
          new Promise((resolve, reject) => {
            resolveEdit = resolve;
            rejectEdit = reject;
          }),
      );
      renderConsumer(actions);
      choose();
      submit();
      await screen.findByRole("heading", { name: "Generated section" });
      fireEvent.change(screen.getByLabelText("Transpose (semitones)"), { target: { value: "4" } });
      const form = screen.getByRole("form", { name: "Transpose selected Lead note" });
      fireEvent.submit(form);
      fireEvent.submit(form);
      expect(actions.setLeadPitchAction).toHaveBeenCalledTimes(1);
      fireEvent.change(screen.getByLabelText("Energy"), { target: { value: "high" } });
      await act(async () => {
        if (outcome === "resolve") resolveEdit(EDITED_APPLICATION);
        else rejectEdit(new Error("private stale error"));
      });
      expect(screen.queryByRole("heading", { name: "Generated section" })).toBeNull();
      expect(screen.queryByRole("alert")).toBeNull();
    },
  );

  it("invalidates audition on successful transpose without automatically playing again", async () => {
    const audio = installFakeAudioContext();
    try {
      renderConsumer();
      choose();
      submit();
      await screen.findByRole("heading", { name: "Generated section" });
      fireEvent.click(screen.getByRole("button", { name: "Play" }));
      await screen.findByText("Playing all four roles.");
      const count = audio.sources.length;
      fireEvent.change(screen.getByLabelText("Transpose (semitones)"), { target: { value: "4" } });
      fireEvent.submit(screen.getByRole("form", { name: "Transpose selected Lead note" }));
      await screen.findByText("Editor revision 2 of 2.");
      expect(screen.getByText("Playback stopped.")).toBeVisible();
      expect(audio.sources).toHaveLength(count);
    } finally {
      audio.restore();
    }
  });

  it("starts empty with explicit profile/template selection", () => {
    const { actions } = renderConsumer();
    expect(screen.getByLabelText("Profile")).toHaveValue("");
    expect(screen.getByLabelText("Harmony template")).toHaveValue("");
    expect(screen.getByRole("status")).toHaveTextContent("No section is loaded");
    submit();
    expect(actions.generateAction).not.toHaveBeenCalled();
    expect(screen.getByRole("alert")).toBeVisible();
    expect(screen.queryByRole("button", { name: "Play" })).not.toBeInTheDocument();
  });
  it("submits one explicit accepted request and displays existing four-role data", async () => {
    const { actions } = renderConsumer();
    choose();
    fireEvent.change(screen.getByLabelText("Seed"), { target: { value: "42" } });
    fireEvent.change(screen.getByLabelText("Key tonic"), { target: { value: "2" } });
    fireEvent.change(screen.getByLabelText("Tempo (BPM)"), { target: { value: "80" } });
    fireEvent.change(screen.getByLabelText("Energy"), { target: { value: "high" } });
    submit();
    await screen.findByRole("heading", { name: "Generated section" });
    expect(actions.generateAction).toHaveBeenCalledTimes(1);
    expect(actions.generateAction.mock.calls[0]?.[0]).toEqual({
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
          key: { tonic: 2, scale: "natural-minor" },
        },
        section: { tempo: { microsecondsPerQuarter: 750000 } },
        intent: { energy: "high", complexity: "medium" },
        rootSeed: 42,
        arpeggiator: {
          range: { minMidiPitch: 36, maxMidiPitch: 84 },
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
    });
    for (const role of ["Harmony", "Bass", "Arpeggiator", "Lead"])
      expect(screen.getByRole("heading", { name: role })).toBeVisible();
    expect(screen.getByRole("heading", { name: "Eight-bar note timeline" })).toBeVisible();
    const timeline = screen.getByRole("table", {
      name: /four-role notes positioned across the generated eight-bar section/i,
    });
    expect(timeline).toBeVisible();
    const pianoRollHeading = screen.getByRole("heading", { name: "Lead piano roll" });
    expect(
      timeline.compareDocumentPosition(pianoRollHeading) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(
      screen.getByRole("listitem", {
        name: /Lead note, MIDI pitch 60, start tick 0, duration 960 ticks/i,
      }),
    ).toBeVisible();
    expect(screen.getAllByText("1 notes")).toHaveLength(4);
    expect(screen.getByRole("button", { name: "Play" })).toBeVisible();
    expect(screen.getByText(/internal composition preview/i)).toBeVisible();
    expect(screen.getByRole("combobox", { name: "Lead note" })).toHaveValue(NOTE_ID);
    const addForm = screen.getByRole("form", { name: "Add Lead note" });
    expect(addForm.querySelectorAll("input")).toHaveLength(3);
    expect(screen.getByLabelText("Pitch")).toHaveProperty("value", "");
    expect(screen.getByLabelText("Start Tick")).toHaveProperty("value", "");
    expect(screen.getByLabelText("Duration Ticks")).toHaveProperty("value", "");
    expect(screen.getByRole("button", { name: "Add Note" })).toHaveAttribute("type", "submit");
    expect(screen.getByLabelText("MIDI pitch (60–84)")).toHaveValue(60);
    expect(screen.getByRole("button", { name: "Apply Lead pitch" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Undo" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Redo" })).toBeDisabled();
  });
  it("submits one absolute v6 Add Note command and restores the returned revision through undo and redo", async () => {
    const { actions } = renderConsumer();
    choose();
    submit();
    await screen.findByRole("heading", { name: "Generated section" });

    fireEvent.change(screen.getByLabelText("Pitch"), { target: { value: "64" } });
    fireEvent.change(screen.getByLabelText("Start Tick"), { target: { value: "960" } });
    fireEvent.change(screen.getByLabelText("Duration Ticks"), { target: { value: "480" } });
    const addForm = screen.getByRole("form", { name: "Add Lead note" });
    fireEvent.submit(addForm);

    await screen.findByRole("listitem", {
      name: "Lead note, MIDI pitch 64, start tick 960, duration 480 ticks",
    });
    expect(actions.addLeadNoteAction).toHaveBeenCalledTimes(1);
    expect(actions.addLeadNoteAction.mock.calls[0]).toEqual([
      ROOT_APPLICATION,
      ROOT_APPLICATION.selectedRevision,
      {
        schema: "nightdrive.editor-note-command.v6",
        type: "add-note",
        pitch: 64,
        startTick: 960,
        durationTicks: 480,
      },
    ]);
    expect(actions.generateAction).toHaveBeenCalledTimes(1);
    expect(ADDED_APPLICATION.preview.sourceResultHash).toBe(PREVIEW.sourceResultHash);
    expect(screen.getByText("Editor revision 2 of 2.")).toBeVisible();
    expect(screen.getByRole("button", { name: "Undo" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Redo" })).toBeDisabled();
    expect(screen.getByRole("combobox", { name: "Lead note" })).toHaveValue(NOTE_ID);
    expect(
      screen.getByRole("option", {
        name: /Lead note 2 · MIDI 64 · tick 960 · duration 480/,
      }),
    ).toBeInTheDocument();

    fireEvent.change(screen.getByRole("combobox", { name: "Lead note" }), {
      target: { value: ADDED_NOTE_ID },
    });
    expect(screen.getByLabelText("MIDI pitch (60–84)")).toHaveValue(64);
    expect(screen.getByLabelText("Absolute start tick")).toHaveValue(960);
    expect(screen.getByLabelText("Absolute duration ticks")).toHaveValue(480);

    actions.undoSectionEditAction.mockResolvedValueOnce(ADDED_UNDONE_APPLICATION);
    fireEvent.click(screen.getByRole("button", { name: "Undo" }));
    await screen.findByText("Editor revision 1 of 2.");
    expect(actions.undoSectionEditAction).toHaveBeenCalledWith(ADDED_APPLICATION);
    expect(screen.queryByRole("listitem", { name: /MIDI pitch 64, start tick 960/ })).toBeNull();
    expect(screen.getByRole("button", { name: "Redo" })).toBeEnabled();

    actions.redoSectionEditAction.mockResolvedValueOnce(ADDED_APPLICATION);
    fireEvent.click(screen.getByRole("button", { name: "Redo" }));
    await screen.findByRole("listitem", {
      name: "Lead note, MIDI pitch 64, start tick 960, duration 480 ticks",
    });
    expect(actions.redoSectionEditAction).toHaveBeenCalledWith(ADDED_UNDONE_APPLICATION);
  });

  it.each([
    { field: "Pitch", pitch: "", startTick: "0", durationTicks: "480", message: "Pitch:" },
    { field: "Pitch", pitch: "1e2", startTick: "0", durationTicks: "480", message: "Pitch:" },
    {
      field: "Pitch",
      pitch: "9007199254740992",
      startTick: "0",
      durationTicks: "480",
      message: "Pitch:",
    },
    { field: "Pitch", pitch: "85", startTick: "0", durationTicks: "480", message: "Pitch:" },
    {
      field: "Start Tick",
      pitch: "64",
      startTick: "",
      durationTicks: "480",
      message: "Start Tick:",
    },
    {
      field: "Start Tick",
      pitch: "64",
      startTick: "1.5",
      durationTicks: "480",
      message: "Start Tick:",
    },
    {
      field: "Start Tick",
      pitch: "64",
      startTick: "9007199254740992",
      durationTicks: "480",
      message: "Start Tick:",
    },
    {
      field: "Start Tick",
      pitch: "64",
      startTick: "30720",
      durationTicks: "1",
      message: "Start Tick:",
    },
    {
      field: "Duration Ticks",
      pitch: "64",
      startTick: "0",
      durationTicks: "",
      message: "Duration Ticks:",
    },
    {
      field: "Duration Ticks",
      pitch: "64",
      startTick: "0",
      durationTicks: "1.5",
      message: "Duration Ticks:",
    },
    {
      field: "Duration Ticks",
      pitch: "64",
      startTick: "0",
      durationTicks: "9007199254740992",
      message: "Duration Ticks:",
    },
    {
      field: "Duration Ticks",
      pitch: "64",
      startTick: "0",
      durationTicks: "0",
      message: "Duration Ticks:",
    },
    {
      field: "Duration Ticks",
      pitch: "64",
      startTick: "30719",
      durationTicks: "2",
      message: "Duration Ticks:",
    },
  ])("rejects invalid $field input without changing the editor application", async (testCase) => {
    const { actions } = renderConsumer();
    choose();
    submit();
    await screen.findByRole("heading", { name: "Generated section" });

    fireEvent.change(screen.getByLabelText("Pitch"), {
      target: { value: testCase.pitch },
    });
    fireEvent.change(screen.getByLabelText("Start Tick"), {
      target: { value: testCase.startTick },
    });
    fireEvent.change(screen.getByLabelText("Duration Ticks"), {
      target: { value: testCase.durationTicks },
    });
    fireEvent.submit(screen.getByRole("form", { name: "Add Lead note" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(testCase.message);
    const field = screen.getByLabelText(testCase.field);
    expect(field).toHaveAttribute("aria-invalid", "true");
    expect(field).toHaveAttribute("aria-describedby", "add-lead-note-error");
    expect(screen.getByLabelText("Pitch")).toHaveProperty("value", testCase.pitch);
    expect(screen.getByLabelText("Start Tick")).toHaveProperty("value", testCase.startTick);
    expect(screen.getByLabelText("Duration Ticks")).toHaveProperty("value", testCase.durationTicks);
    expect(actions.addLeadNoteAction).not.toHaveBeenCalled();
    expect(screen.getByText("Editor revision 1 of 1.")).toBeVisible();
    expect(
      screen.getByRole("listitem", {
        name: "Lead note, MIDI pitch 60, start tick 0, duration 960 ticks",
      }),
    ).toBeVisible();
  });

  it("allows the explicit add form when the current Lead track has no selected note", async () => {
    const actions = makeActions();
    actions.generateAction.mockResolvedValueOnce(DELETED_APPLICATION);
    actions.addLeadNoteAction.mockImplementationOnce(() => new Promise(() => {}));
    renderConsumer(actions);
    choose();
    submit();
    await screen.findByText("0 notes");

    expect(screen.getByRole("combobox", { name: "Lead note" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Add Note" })).toBeEnabled();
    fireEvent.change(screen.getByLabelText("Pitch"), { target: { value: "64" } });
    fireEvent.change(screen.getByLabelText("Start Tick"), { target: { value: "960" } });
    fireEvent.change(screen.getByLabelText("Duration Ticks"), { target: { value: "480" } });
    fireEvent.submit(screen.getByRole("form", { name: "Add Lead note" }));

    expect(actions.addLeadNoteAction).toHaveBeenCalledTimes(1);
    expect(actions.addLeadNoteAction.mock.calls[0]).toEqual([
      DELETED_APPLICATION,
      DELETED_APPLICATION.selectedRevision,
      {
        schema: "nightdrive.editor-note-command.v6",
        type: "add-note",
        pitch: 64,
        startTick: 960,
        durationTicks: 480,
      },
    ]);
  });

  it("does not create a note when the empty piano-roll grid is activated", async () => {
    const { actions } = renderConsumer();
    choose();
    submit();
    await screen.findByRole("heading", { name: "Generated section" });

    fireEvent.click(screen.getByTestId("lead-piano-roll-plot"));
    expect(actions.addLeadNoteAction).not.toHaveBeenCalled();
    expect(screen.getByText("Editor revision 1 of 1.")).toBeVisible();
    expect(
      screen.getByRole("listitem", {
        name: "Lead note, MIDI pitch 60, start tick 0, duration 960 ticks",
      }),
    ).toBeVisible();
    expect(screen.getByLabelText("Pitch")).toHaveProperty("value", "");
    expect(screen.getByLabelText("Start Tick")).toHaveProperty("value", "");
    expect(screen.getByLabelText("Duration Ticks")).toHaveProperty("value", "");
  });

  it("submits only one Add Note command while the Node operation is pending and installs no optimistic note", async () => {
    const actions = makeActions();
    let resolveAdd: ((value: EditorApplicationV1) => void) | undefined;
    actions.addLeadNoteAction.mockImplementationOnce(
      () =>
        new Promise<EditorApplicationV1>((resolve) => {
          resolveAdd = resolve;
        }),
    );
    renderConsumer(actions);
    choose();
    submit();
    await screen.findByRole("heading", { name: "Generated section" });
    fireEvent.change(screen.getByLabelText("Pitch"), { target: { value: "64" } });
    fireEvent.change(screen.getByLabelText("Start Tick"), { target: { value: "960" } });
    fireEvent.change(screen.getByLabelText("Duration Ticks"), { target: { value: "480" } });
    const addForm = screen.getByRole("form", { name: "Add Lead note" });

    fireEvent.submit(addForm);
    expect(actions.addLeadNoteAction).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("button", { name: "Add Note" })).toBeDisabled();
    expect(screen.getByText("Editor revision 1 of 1.")).toBeVisible();
    expect(
      screen.queryByRole("listitem", {
        name: "Lead note, MIDI pitch 64, start tick 960, duration 480 ticks",
      }),
    ).toBeNull();

    fireEvent.submit(addForm);
    expect(actions.addLeadNoteAction).toHaveBeenCalledTimes(1);
    if (!resolveAdd) throw new Error("Add operation did not remain pending.");
    await act(async () => resolveAdd?.(ADDED_APPLICATION));
    await screen.findByRole("listitem", {
      name: "Lead note, MIDI pitch 64, start tick 960, duration 480 ticks",
    });
  });

  it("keeps the application and active audition after Add Note is rejected with a safe diagnostic", async () => {
    const audio = installFakeAudioContext();
    try {
      const actions = makeActions();
      actions.addLeadNoteAction.mockRejectedValueOnce(new Error("private v6 failure"));
      renderConsumer(actions);
      choose();
      submit();
      await screen.findByRole("heading", { name: "Generated section" });
      fireEvent.click(screen.getByRole("button", { name: "Play" }));
      await screen.findByText("Playing all four roles.");
      const sourceStopCallsBefore = audio.sources.map((source) => source.stop.mock.calls.length);

      fireEvent.change(screen.getByLabelText("Pitch"), { target: { value: "64" } });
      fireEvent.change(screen.getByLabelText("Start Tick"), { target: { value: "960" } });
      fireEvent.change(screen.getByLabelText("Duration Ticks"), { target: { value: "480" } });
      fireEvent.submit(screen.getByRole("form", { name: "Add Lead note" }));

      const alert = await screen.findByRole("alert");
      expect(alert).toHaveTextContent(
        "The Lead edit history could not be updated. The generated section remains unchanged.",
      );
      expect(alert).not.toHaveTextContent("private v6 failure");
      expect(screen.getByText("Playing all four roles.")).toBeVisible();
      expect(audio.sources.map((source) => source.stop.mock.calls.length)).toEqual(
        sourceStopCallsBefore,
      );
      expect(screen.getByText("Editor revision 1 of 1.")).toBeVisible();
      expect(
        screen.getByRole("listitem", {
          name: "Lead note, MIDI pitch 60, start tick 0, duration 960 ticks",
        }),
      ).toBeVisible();
      expect(screen.getByLabelText("Pitch")).toHaveValue(64);
      expect(screen.getByLabelText("Start Tick")).toHaveValue(960);
      expect(screen.getByLabelText("Duration Ticks")).toHaveValue(480);
    } finally {
      audio.restore();
    }
  });

  it("invalidates playback after accepted Add Note without automatically resuming", async () => {
    const audio = installFakeAudioContext();
    try {
      const { actions } = renderConsumer();
      choose();
      submit();
      await screen.findByRole("heading", { name: "Generated section" });
      fireEvent.click(screen.getByRole("button", { name: "Play" }));
      await screen.findByText("Playing all four roles.");
      const sourcesBeforeAdd = audio.sources.length;

      fireEvent.change(screen.getByLabelText("Pitch"), { target: { value: "64" } });
      fireEvent.change(screen.getByLabelText("Start Tick"), { target: { value: "960" } });
      fireEvent.change(screen.getByLabelText("Duration Ticks"), { target: { value: "480" } });
      fireEvent.submit(screen.getByRole("form", { name: "Add Lead note" }));

      await screen.findByRole("listitem", {
        name: "Lead note, MIDI pitch 64, start tick 960, duration 480 ticks",
      });
      expect(actions.addLeadNoteAction).toHaveBeenCalledTimes(1);
      expect(screen.getByText("Playback stopped.")).toBeVisible();
      expect(screen.getByRole("button", { name: "Play" })).toBeEnabled();
      expect(audio.sources).toHaveLength(sourcesBeforeAdd);
    } finally {
      audio.restore();
    }
  });

  it("sends one stable Lead pitch command and restores the exact selected preview through undo and redo", async () => {
    const { actions } = renderConsumer();
    choose();
    submit();
    await screen.findByRole("heading", { name: "Generated section" });

    fireEvent.change(screen.getByLabelText("MIDI pitch (60–84)"), {
      target: { value: "64" },
    });
    expect(screen.getByRole("button", { name: "Apply Lead pitch" })).toBeEnabled();
    fireEvent.click(screen.getByRole("button", { name: "Apply Lead pitch" }));
    await screen.findByRole("listitem", {
      name: "Lead note, MIDI pitch 64, start tick 0, duration 960 ticks",
    });

    expect(actions.setLeadPitchAction).toHaveBeenCalledTimes(1);
    expect(actions.setLeadPitchAction.mock.calls[0]).toEqual([
      ROOT_APPLICATION,
      ROOT_APPLICATION.selectedRevision,
      {
        schema: "nightdrive.editor-note-command.v1",
        type: "set-note-pitch",
        noteId: NOTE_ID,
        expectedPitch: 60,
        pitch: 64,
      },
    ]);
    expect(actions.generateAction).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("button", { name: "Undo" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Redo" })).toBeDisabled();
    expect(screen.getByText("Editor revision 2 of 2.")).toBeVisible();

    fireEvent.click(screen.getByRole("button", { name: "Undo" }));
    await screen.findByRole("listitem", {
      name: "Lead note, MIDI pitch 60, start tick 0, duration 960 ticks",
    });
    expect(actions.undoSectionEditAction).toHaveBeenCalledWith(EDITED_APPLICATION);
    expect(screen.getByRole("button", { name: "Redo" })).toBeEnabled();
    expect(screen.getByText("Editor revision 1 of 2.")).toBeVisible();

    fireEvent.click(screen.getByRole("button", { name: "Redo" }));
    await screen.findByRole("listitem", {
      name: "Lead note, MIDI pitch 64, start tick 0, duration 960 ticks",
    });
    expect(actions.redoSectionEditAction).toHaveBeenCalledWith(UNDONE_APPLICATION);
    expect(screen.getByText("Editor revision 2 of 2.")).toBeVisible();
  });
  it("submits one absolute Lead start-tick command and restores the derived preview through undo and redo", async () => {
    const { actions } = renderConsumer();
    choose();
    submit();
    await screen.findByRole("heading", { name: "Generated section" });

    const startTick = screen.getByLabelText("Absolute start tick");
    expect(startTick).toHaveValue(0);
    expect(screen.getByRole("button", { name: "Move Lead note" })).toBeDisabled();
    fireEvent.change(startTick, { target: { value: "480" } });
    expect(screen.getByRole("button", { name: "Move Lead note" })).toBeEnabled();
    fireEvent.click(screen.getByRole("button", { name: "Move Lead note" }));

    await screen.findByRole("listitem", {
      name: "Lead note, MIDI pitch 60, start tick 480, duration 960 ticks",
    });
    expect(actions.setLeadStartTickAction).toHaveBeenCalledTimes(1);
    expect(actions.setLeadStartTickAction.mock.calls[0]).toEqual([
      ROOT_APPLICATION,
      ROOT_APPLICATION.selectedRevision,
      {
        schema: "nightdrive.editor-note-command.v2",
        type: "set-note-start-tick",
        noteId: NOTE_ID,
        expectedStartTick: 0,
        startTick: 480,
      },
    ]);
    expect(actions.generateAction).toHaveBeenCalledTimes(1);
    expect(screen.getByLabelText("Absolute start tick")).toHaveValue(480);
    expect(screen.getByText("Editor revision 2 of 2.")).toBeVisible();

    actions.undoSectionEditAction.mockResolvedValue(MOVED_UNDONE_APPLICATION);
    fireEvent.click(screen.getByRole("button", { name: "Undo" }));
    await screen.findByRole("listitem", {
      name: "Lead note, MIDI pitch 60, start tick 0, duration 960 ticks",
    });
    expect(actions.undoSectionEditAction).toHaveBeenCalledWith(MOVED_APPLICATION);
    expect(screen.getByRole("button", { name: "Redo" })).toBeEnabled();

    actions.redoSectionEditAction.mockResolvedValue(MOVED_APPLICATION);
    fireEvent.click(screen.getByRole("button", { name: "Redo" }));
    await screen.findByRole("listitem", {
      name: "Lead note, MIDI pitch 60, start tick 480, duration 960 ticks",
    });
    expect(actions.redoSectionEditAction).toHaveBeenCalledWith(MOVED_UNDONE_APPLICATION);
  });

  it("applies paired Lead position fields with one v5 command and restores the exact revision through undo and redo", async () => {
    const { actions } = renderConsumer();
    choose();
    submit();
    await screen.findByRole("heading", { name: "Generated section" });

    fireEvent.change(screen.getByLabelText("Position MIDI pitch (60–84)"), {
      target: { value: "64" },
    });
    fireEvent.change(screen.getByLabelText("Position absolute start tick"), {
      target: { value: "480" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Apply Lead position" }));

    await screen.findByRole("listitem", {
      name: "Lead note, MIDI pitch 64, start tick 480, duration 960 ticks",
    });
    expect(actions.setLeadPositionAction).toHaveBeenCalledTimes(1);
    expect(actions.setLeadPositionAction.mock.calls[0]).toEqual([
      ROOT_APPLICATION,
      ROOT_APPLICATION.selectedRevision,
      {
        schema: "nightdrive.editor-note-command.v5",
        type: "set-note-position",
        noteId: NOTE_ID,
        expectedPitch: 60,
        expectedStartTick: 0,
        pitch: 64,
        startTick: 480,
      },
    ]);
    expect(actions.setLeadPitchAction).not.toHaveBeenCalled();
    expect(actions.setLeadStartTickAction).not.toHaveBeenCalled();
    expect(POSITION_APPLICATION.preview.sourceResultHash).toBe(PREVIEW.sourceResultHash);
    expect(screen.getByText("Editor revision 2 of 2.")).toBeVisible();

    actions.undoSectionEditAction.mockResolvedValueOnce(POSITION_UNDONE_APPLICATION);
    fireEvent.click(screen.getByRole("button", { name: "Undo" }));
    await screen.findByRole("listitem", {
      name: "Lead note, MIDI pitch 60, start tick 0, duration 960 ticks",
    });
    expect(actions.undoSectionEditAction).toHaveBeenCalledWith(POSITION_APPLICATION);

    actions.redoSectionEditAction.mockResolvedValueOnce(POSITION_APPLICATION);
    fireEvent.click(screen.getByRole("button", { name: "Redo" }));
    await screen.findByRole("listitem", {
      name: "Lead note, MIDI pitch 64, start tick 480, duration 960 ticks",
    });
    expect(actions.redoSectionEditAction).toHaveBeenCalledWith(POSITION_UNDONE_APPLICATION);
  });

  it("carries an unchanged paired position field and leaves the single-field controls independent", async () => {
    const { actions } = renderConsumer();
    actions.setLeadPositionAction.mockResolvedValueOnce(PITCH_POSITION_APPLICATION);
    choose();
    submit();
    await screen.findByRole("heading", { name: "Generated section" });

    fireEvent.change(screen.getByLabelText("Position MIDI pitch (60–84)"), {
      target: { value: "64" },
    });
    expect(screen.getByRole("button", { name: "Apply Lead position" })).toBeEnabled();
    fireEvent.click(screen.getByRole("button", { name: "Apply Lead position" }));

    await screen.findByText("Editor revision 2 of 2.");
    expect(actions.setLeadPositionAction.mock.calls[0]?.[2]).toEqual({
      schema: "nightdrive.editor-note-command.v5",
      type: "set-note-position",
      noteId: NOTE_ID,
      expectedPitch: 60,
      expectedStartTick: 0,
      pitch: 64,
      startTick: 0,
    });
    expect(actions.setLeadPitchAction).not.toHaveBeenCalled();
    expect(actions.setLeadStartTickAction).not.toHaveBeenCalled();
  });

  it("does not submit an unchanged paired position and preserves canonical state when v5 rejects", async () => {
    const { actions } = renderConsumer();
    choose();
    submit();
    await screen.findByRole("heading", { name: "Generated section" });

    expect(screen.getByRole("button", { name: "Apply Lead position" })).toBeDisabled();
    expect(actions.setLeadPositionAction).not.toHaveBeenCalled();

    actions.setLeadPositionAction.mockRejectedValueOnce(new Error("private v5 failure"));
    fireEvent.change(screen.getByLabelText("Position absolute start tick"), {
      target: { value: "480" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Apply Lead position" }));
    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(
      "The Lead edit history could not be updated. The generated section remains unchanged.",
    );
    expect(alert).not.toHaveTextContent("private v5 failure");
    expect(screen.getByText("Editor revision 1 of 1.")).toBeVisible();
    expect(actions.setLeadPositionAction).toHaveBeenCalledTimes(1);
  });

  it("keeps overlapping Lead notes individually reachable through the existing selector", async () => {
    const actions = makeActions();
    actions.generateAction.mockResolvedValueOnce(makeOverlappingLeadApplication());
    renderConsumer(actions);
    choose();
    submit();
    await screen.findByRole("heading", { name: "Lead piano roll" });

    const selector = screen.getByRole("combobox", { name: "Lead note" });
    expect(selector.querySelectorAll("option")).toHaveLength(2);
    expect(
      screen.getAllByRole("button", { name: /Lead note [12], MIDI pitch 60, start tick 0/ }),
    ).toHaveLength(2);

    fireEvent.change(selector, { target: { value: OVERLAPPING_NOTE_ID } });
    expect(selector).toHaveValue(OVERLAPPING_NOTE_ID);
    expect(screen.getByLabelText("Position MIDI pitch (60–84)")).toHaveValue(60);
    expect(screen.getByLabelText("Position absolute start tick")).toHaveValue(0);
    expect(actions.setLeadPositionAction).not.toHaveBeenCalled();
  });

  it("submits one v5 command from an activated piano-roll drag only when the pointer is released", async () => {
    const positionApplication = makeEditorApplication(65, true, 1, 1_267);
    const actions = makeActions();
    actions.setLeadPositionAction.mockResolvedValueOnce(positionApplication);
    renderConsumer(actions);
    choose();
    submit();
    await screen.findByRole("heading", { name: "Lead piano roll" });

    const plot = screen.getByTestId("lead-piano-roll-plot");
    Object.defineProperty(plot, "getBoundingClientRect", {
      configurable: true,
      value: () => ({
        x: 0,
        y: 0,
        width: 1_000,
        height: 500,
        top: 0,
        right: 1_000,
        bottom: 500,
        left: 0,
        toJSON: () => ({}),
      }),
    });
    const note = screen.getByRole("button", {
      name: "Lead note 1, MIDI pitch 60, start tick 0, duration 960 ticks",
    });
    fireEvent.pointerDown(note, {
      pointerId: 2,
      isPrimary: true,
      button: 0,
      clientX: 120,
      clientY: 100,
    });
    fireEvent.pointerMove(note, {
      pointerId: 2,
      isPrimary: true,
      clientX: 130,
      clientY: 80,
    });
    expect(actions.setLeadPositionAction).not.toHaveBeenCalled();
    fireEvent.pointerUp(note, {
      pointerId: 2,
      isPrimary: true,
      button: 0,
      clientX: 130,
      clientY: 80,
    });

    await screen.findByText("Editor revision 2 of 2.");
    expect(actions.setLeadPositionAction).toHaveBeenCalledTimes(1);
    expect(actions.setLeadPositionAction.mock.calls[0]?.[2]).toEqual({
      schema: "nightdrive.editor-note-command.v5",
      type: "set-note-position",
      noteId: NOTE_ID,
      expectedPitch: 60,
      expectedStartTick: 0,
      pitch: 61,
      startTick: 307,
    });
    expect(actions.setLeadPitchAction).not.toHaveBeenCalled();
    expect(actions.setLeadStartTickAction).not.toHaveBeenCalled();
  });

  it("submits one absolute Lead duration command, updates the derived preview, and restores revisions", async () => {
    const { actions } = renderConsumer();
    choose();
    submit();
    await screen.findByRole("heading", { name: "Generated section" });

    const duration = screen.getByLabelText("Absolute duration ticks");
    expect(duration).toHaveValue(960);
    expect(screen.getByRole("button", { name: "Apply Lead duration" })).toBeDisabled();
    fireEvent.change(duration, { target: { value: "1440" } });
    expect(screen.getByRole("button", { name: "Apply Lead duration" })).toBeEnabled();
    fireEvent.click(screen.getByRole("button", { name: "Apply Lead duration" }));

    await screen.findByRole("listitem", {
      name: "Lead note, MIDI pitch 60, start tick 0, duration 1440 ticks",
    });
    expect(actions.setLeadDurationAction).toHaveBeenCalledTimes(1);
    expect(actions.setLeadDurationAction.mock.calls[0]).toEqual([
      ROOT_APPLICATION,
      ROOT_APPLICATION.selectedRevision,
      {
        schema: "nightdrive.editor-note-command.v3",
        type: "set-note-duration",
        noteId: NOTE_ID,
        expectedDurationTicks: 960,
        durationTicks: 1440,
      },
    ]);
    expect(actions.generateAction).toHaveBeenCalledTimes(1);
    expect(screen.getByLabelText("Absolute duration ticks")).toHaveValue(1440);
    expect(screen.getByText("Editor revision 2 of 2.")).toBeVisible();

    actions.undoSectionEditAction.mockResolvedValue(DURATION_UNDONE_APPLICATION);
    fireEvent.click(screen.getByRole("button", { name: "Undo" }));
    await screen.findByRole("listitem", {
      name: "Lead note, MIDI pitch 60, start tick 0, duration 960 ticks",
    });
    expect(actions.undoSectionEditAction).toHaveBeenCalledWith(DURATION_APPLICATION);
    expect(screen.getByRole("button", { name: "Redo" })).toBeEnabled();

    actions.redoSectionEditAction.mockResolvedValue(DURATION_APPLICATION);
    fireEvent.click(screen.getByRole("button", { name: "Redo" }));
    await screen.findByRole("listitem", {
      name: "Lead note, MIDI pitch 60, start tick 0, duration 1440 ticks",
    });
    expect(actions.redoSectionEditAction).toHaveBeenCalledWith(DURATION_UNDONE_APPLICATION);
  });

  it("commits right-edge resize through v3 and retains exact undo/redo application identities", async () => {
    const { actions } = renderConsumer();
    actions.setLeadDurationAction.mockResolvedValueOnce(DURATION_APPLICATION);
    actions.undoSectionEditAction.mockResolvedValueOnce(DURATION_UNDONE_APPLICATION);
    actions.redoSectionEditAction.mockResolvedValueOnce(DURATION_APPLICATION);
    choose();
    submit();
    await screen.findByRole("heading", { name: "Generated section" });
    const plot = screen.getByTestId("lead-piano-roll-plot");
    Object.defineProperty(plot, "getBoundingClientRect", {
      value: () => ({ width: 30720, height: 500 }),
    });
    const handle = screen.getByRole("button", { name: /Resize duration: Lead 1/ });
    fireEvent.pointerDown(handle, {
      pointerId: 1,
      isPrimary: true,
      button: 0,
      clientX: 100,
      clientY: 100,
    });
    fireEvent.pointerMove(handle, { pointerId: 1, clientX: 580, clientY: 120 });
    expect(actions.setLeadDurationAction).not.toHaveBeenCalled();
    fireEvent.pointerUp(handle, { pointerId: 1, clientX: 580, clientY: 120 });
    await screen.findByText("Editor revision 2 of 2.");
    expect(actions.setLeadDurationAction).toHaveBeenCalledExactlyOnceWith(
      ROOT_APPLICATION,
      ROOT_APPLICATION.selectedRevision,
      {
        schema: "nightdrive.editor-note-command.v3",
        type: "set-note-duration",
        noteId: NOTE_ID,
        expectedDurationTicks: 960,
        durationTicks: 1440,
      },
    );
    expect(actions.setLeadPositionAction).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Undo" }));
    await screen.findByText("Editor revision 1 of 2.");
    expect(actions.undoSectionEditAction).toHaveBeenCalledWith(DURATION_APPLICATION);
    fireEvent.click(screen.getByRole("button", { name: "Redo" }));
    await screen.findByText("Editor revision 2 of 2.");
    expect(actions.redoSectionEditAction).toHaveBeenCalledWith(DURATION_UNDONE_APPLICATION);
  });

  it("submits one explicit v7 velocity command and restores canonical velocity through undo and redo", async () => {
    const { actions } = renderConsumer();
    actions.setLeadVelocityAction.mockResolvedValueOnce(VELOCITY_APPLICATION);
    actions.undoSectionEditAction.mockResolvedValueOnce(VELOCITY_UNDONE_APPLICATION);
    actions.redoSectionEditAction.mockResolvedValueOnce(VELOCITY_APPLICATION);
    choose();
    submit();
    await screen.findByRole("heading", { name: "Generated section" });

    const velocity = screen.getByLabelText("Velocity");
    expect(velocity).toHaveValue(100);
    expect(
      screen.getByText(
        "Velocity is saved in the editor revision, but it does not change preview loudness yet.",
      ),
    ).toBeVisible();
    expect(screen.getByRole("button", { name: "Apply Velocity" })).toBeDisabled();
    fireEvent.change(velocity, { target: { value: "88" } });
    fireEvent.blur(velocity);
    expect(screen.getByRole("button", { name: "Apply Velocity" })).toBeEnabled();
    expect(actions.setLeadVelocityAction).not.toHaveBeenCalled();
    expect(screen.getByText("Editor revision 1 of 1.")).toBeVisible();

    fireEvent.click(screen.getByRole("button", { name: "Apply Velocity" }));
    await screen.findByText("Editor revision 2 of 2.");
    expect(actions.setLeadVelocityAction).toHaveBeenCalledTimes(1);
    expect(actions.setLeadVelocityAction.mock.calls[0]).toEqual([
      ROOT_APPLICATION,
      ROOT_APPLICATION.selectedRevision,
      {
        schema: "nightdrive.editor-note-command.v7",
        type: "set-note-velocity",
        noteId: NOTE_ID,
        expectedVelocity: 100,
        velocity: 88,
      },
    ]);
    expect(screen.getByLabelText("Velocity")).toHaveValue(88);
    expect(screen.getByText("Editor revision 2 of 2.")).toBeVisible();
    expect(VELOCITY_APPLICATION.preview.sourceResultHash).toBe(PREVIEW.sourceResultHash);
    expect(
      VELOCITY_APPLICATION.preview.tracks.every((track) =>
        track.notes.every((note) => !Object.hasOwn(note, "velocity")),
      ),
    ).toBe(true);
    expect(screen.getByRole("button", { name: "Play" })).toBeEnabled();
    expect(screen.queryByText("Playing all four roles.")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Undo" }));
    await waitFor(() => expect(screen.getByLabelText("Velocity")).toHaveValue(100));
    expect(actions.undoSectionEditAction).toHaveBeenCalledWith(VELOCITY_APPLICATION);
    expect(screen.getByText("Editor revision 1 of 2.")).toBeVisible();

    fireEvent.click(screen.getByRole("button", { name: "Redo" }));
    await waitFor(() => expect(screen.getByLabelText("Velocity")).toHaveValue(88));
    expect(actions.redoSectionEditAction).toHaveBeenCalledWith(VELOCITY_UNDONE_APPLICATION);
    expect(screen.getByText("Editor revision 2 of 2.")).toBeVisible();
  });

  it("invalidates active audition on successful velocity edit without auto-resume", async () => {
    const audio = installFakeAudioContext();
    try {
      const { actions } = renderConsumer();
      actions.setLeadVelocityAction.mockResolvedValueOnce(VELOCITY_APPLICATION);
      choose();
      submit();
      await screen.findByRole("heading", { name: "Generated section" });
      fireEvent.click(screen.getByRole("button", { name: "Play" }));
      await screen.findByText("Playing all four roles.");

      fireEvent.change(screen.getByLabelText("Velocity"), { target: { value: "88" } });
      fireEvent.click(screen.getByRole("button", { name: "Apply Velocity" }));
      await screen.findByText("Editor revision 2 of 2.");

      expect(screen.getByText("Playback stopped.")).toBeVisible();
      expect(screen.getByRole("button", { name: "Play" })).toBeEnabled();
      expect(screen.queryByText("Playing all four roles.")).not.toBeInTheDocument();
      expect(audio.sources.length).toBeGreaterThan(0);
      expect(audio.sources.every((source) => source.stop.mock.calls.length > 0)).toBe(true);
    } finally {
      audio.restore();
    }
  });

  it("refreshes Velocity from both existing Lead-note selection paths", async () => {
    const { actions } = renderConsumer();
    actions.generateAction.mockResolvedValueOnce(makeVelocitySelectionApplication());
    choose();
    submit();
    await screen.findByRole("heading", { name: "Generated section" });

    const velocity = screen.getByLabelText("Velocity");
    expect(velocity).toHaveValue(100);
    fireEvent.change(screen.getByRole("combobox", { name: "Lead note" }), {
      target: { value: OVERLAPPING_NOTE_ID },
    });
    expect(velocity).toHaveValue(73);

    fireEvent.click(
      screen.getByRole("button", { name: /Lead note 1, MIDI pitch 60, start tick 0/ }),
    );
    expect(velocity).toHaveValue(100);
    fireEvent.click(
      screen.getByRole("button", { name: /Lead note 2, MIDI pitch 64, start tick 960/ }),
    );
    expect(velocity).toHaveValue(73);
    expect(actions.setLeadVelocityAction).not.toHaveBeenCalled();
  });

  it.each(["", "1.5", "1e2", "0", "128", "9007199254740992"])(
    "rejects invalid Velocity draft %j without dispatch and preserves the application-visible draft",
    async (draft) => {
      const { actions } = renderConsumer();
      choose();
      submit();
      await screen.findByRole("heading", { name: "Generated section" });
      const velocity = screen.getByLabelText("Velocity");
      fireEvent.change(velocity, { target: { value: draft } });
      const applicationVisibleDraft = (velocity as HTMLInputElement).value;
      fireEvent.submit(screen.getByLabelText("Velocity").closest("form") as HTMLFormElement);

      const alert = await screen.findByRole("alert");
      expect(alert).toHaveTextContent("Velocity:");
      expect((velocity as HTMLInputElement).value).toBe(applicationVisibleDraft);
      if (draft) expect(alert).toHaveTextContent(`Entered value: ${draft}.`);
      expect(actions.setLeadVelocityAction).not.toHaveBeenCalled();
      expect(velocity).toHaveValue(draft === "" ? null : Number(draft));
      expect(screen.getByText("Editor revision 1 of 1.")).toBeVisible();
      expect(
        screen.getByRole("listitem", {
          name: "Lead note, MIDI pitch 60, start tick 0, duration 960 ticks",
        }),
      ).toBeVisible();
    },
  );

  it("rejects a browser-sanitized Velocity draft without changing application or history", async () => {
    const { actions } = renderConsumer();
    actions.generateAction.mockResolvedValueOnce(VELOCITY_UNDONE_APPLICATION);
    actions.redoSectionEditAction.mockResolvedValueOnce(VELOCITY_APPLICATION);
    choose();
    submit();
    await screen.findByRole("heading", { name: "Generated section" });
    const velocity = screen.getByLabelText("Velocity") as HTMLInputElement;
    expect(velocity).toHaveAttribute("type", "number");
    expect(velocity).toHaveAttribute("min", "1");
    expect(velocity).toHaveAttribute("max", "127");
    expect(velocity).toHaveAttribute("step", "1");

    fireEvent.change(velocity, { target: { value: "+5" } });
    // The native input discards this syntax before application state receives it.
    expect(velocity.value).toBe("");
    fireEvent.submit(velocity.closest("form") as HTMLFormElement);
    expect(await screen.findByRole("alert")).toHaveTextContent("Velocity:");
    expect(velocity.value).toBe("");
    expect(actions.setLeadVelocityAction).not.toHaveBeenCalled();
    expect(actions.undoSectionEditAction).not.toHaveBeenCalled();
    expect(screen.getByText("Editor revision 1 of 2.")).toBeVisible();
    expect(screen.getByRole("button", { name: "Redo" })).toBeEnabled();
    expect(
      screen.getByRole("listitem", {
        name: "Lead note, MIDI pitch 60, start tick 0, duration 960 ticks",
      }),
    ).toBeVisible();

    fireEvent.click(screen.getByRole("button", { name: "Redo" }));
    await screen.findByText("Editor revision 2 of 2.");
    expect(actions.redoSectionEditAction).toHaveBeenCalledWith(VELOCITY_UNDONE_APPLICATION);
    expect(actions.redoSectionEditAction.mock.calls[0][0]).toBe(VELOCITY_UNDONE_APPLICATION);
  });

  it("preserves application, preview, history, draft, and audition after a safe velocity rejection", async () => {
    const audio = installFakeAudioContext();
    try {
      const { actions } = renderConsumer();
      actions.generateAction.mockResolvedValueOnce(VELOCITY_UNDONE_APPLICATION);
      const privateFailure = Object.assign(new Error("private velocity failure"), {
        code: "STALE_EDITOR_NOTE_VALUE",
        field: "command.expectedVelocity",
      });
      actions.setLeadVelocityAction.mockRejectedValueOnce(privateFailure);
      choose();
      submit();
      await screen.findByRole("heading", { name: "Generated section" });
      fireEvent.click(screen.getByRole("button", { name: "Play" }));
      await screen.findByText("Playing all four roles.");
      const sourceCount = audio.sources.length;
      const stopCountsBefore = audio.sources.map((source) => source.stop.mock.calls.length);

      const velocity = screen.getByLabelText("Velocity");
      fireEvent.change(velocity, { target: { value: "88" } });
      fireEvent.click(screen.getByRole("button", { name: "Apply Velocity" }));
      expect(await screen.findByRole("alert")).toHaveTextContent(
        "Velocity changed since this value was loaded",
      );
      expect(screen.getByRole("alert")).not.toHaveTextContent("private velocity failure");
      expect(velocity).toHaveValue(88);
      expect(screen.getByText("Editor revision 1 of 2.")).toBeVisible();
      expect(screen.getByRole("button", { name: "Redo" })).toBeEnabled();
      expect(
        screen.getByRole("listitem", {
          name: "Lead note, MIDI pitch 60, start tick 0, duration 960 ticks",
        }),
      ).toBeVisible();
      expect(screen.getByText("Playing all four roles.")).toBeVisible();
      expect(audio.sources).toHaveLength(sourceCount);
      expect(audio.sources.map((source) => source.stop.mock.calls.length)).toEqual(
        stopCountsBefore,
      );
      expect(actions.undoSectionEditAction).not.toHaveBeenCalled();
    } finally {
      audio.restore();
    }
  });

  it("uses the existing safe editor diagnostic for an unrecognized velocity failure", async () => {
    const { actions } = renderConsumer();
    actions.setLeadVelocityAction.mockRejectedValueOnce(new Error("private v7 detail"));
    choose();
    submit();
    await screen.findByRole("heading", { name: "Generated section" });
    const velocity = screen.getByLabelText("Velocity");
    fireEvent.change(velocity, { target: { value: "88" } });
    fireEvent.click(screen.getByRole("button", { name: "Apply Velocity" }));

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("The Lead edit history could not be updated.");
    expect(alert).not.toHaveTextContent("private v7 detail");
    expect(velocity).toHaveValue(88);
    expect(screen.getByText("Editor revision 1 of 1.")).toBeVisible();
  });

  it("guards duplicate pending velocity submissions", async () => {
    let resolveVelocity: ((value: EditorApplicationV1) => void) | undefined;
    const { actions } = renderConsumer();
    actions.setLeadVelocityAction.mockImplementationOnce(
      () =>
        new Promise<EditorApplicationV1>((resolve) => {
          resolveVelocity = resolve;
        }),
    );
    choose();
    submit();
    await screen.findByRole("heading", { name: "Generated section" });
    fireEvent.change(screen.getByLabelText("Velocity"), { target: { value: "88" } });
    const apply = screen.getByRole("button", { name: "Apply Velocity" });
    fireEvent.click(apply);
    expect(apply).toBeDisabled();
    fireEvent.submit(screen.getByLabelText("Velocity").closest("form") as HTMLFormElement);
    expect(actions.setLeadVelocityAction).toHaveBeenCalledTimes(1);

    await act(async () => {
      if (!resolveVelocity) throw new Error("No pending velocity operation.");
      resolveVelocity(VELOCITY_APPLICATION);
    });
    await screen.findByText("Editor revision 2 of 2.");
    expect(actions.setLeadVelocityAction).toHaveBeenCalledTimes(1);
  });

  it("deletes only the selected Lead note through the v4 action and restores its exact preview with undo/redo", async () => {
    const { actions } = renderConsumer();
    choose();
    submit();
    await screen.findByRole("heading", { name: "Generated section" });

    const deletion = screen.getByRole("button", { name: "Delete selected Lead note" });
    expect(deletion).toBeEnabled();
    fireEvent.click(deletion);
    await screen.findByText("0 notes");

    expect(actions.deleteLeadNoteAction).toHaveBeenCalledTimes(1);
    expect(actions.deleteLeadNoteAction.mock.calls[0]).toEqual([
      ROOT_APPLICATION,
      ROOT_APPLICATION.selectedRevision,
      {
        schema: "nightdrive.editor-note-command.v4",
        type: "delete-note",
        noteId: NOTE_ID,
      },
    ]);
    expect(actions.generateAction).toHaveBeenCalledTimes(1);
    expect(DELETED_APPLICATION.preview.sourceResultHash).toBe(PREVIEW.sourceResultHash);
    expect(screen.getByRole("button", { name: "Delete selected Lead note" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Undo" })).toBeEnabled();
    expect(screen.getByText("Editor revision 2 of 2.")).toBeVisible();

    actions.undoSectionEditAction.mockResolvedValueOnce(DELETED_UNDONE_APPLICATION);
    fireEvent.click(screen.getByRole("button", { name: "Undo" }));
    await screen.findByRole("listitem", {
      name: "Lead note, MIDI pitch 60, start tick 0, duration 960 ticks",
    });
    expect(actions.undoSectionEditAction).toHaveBeenCalledWith(DELETED_APPLICATION);
    expect(screen.getByRole("button", { name: "Redo" })).toBeEnabled();

    actions.redoSectionEditAction.mockResolvedValueOnce(DELETED_APPLICATION);
    fireEvent.click(screen.getByRole("button", { name: "Redo" }));
    await screen.findByText("0 notes");
    expect(actions.redoSectionEditAction).toHaveBeenCalledWith(DELETED_UNDONE_APPLICATION);
    expect(screen.getByText("Editor revision 2 of 2.")).toBeVisible();
  });

  it("keeps the current preview and reports only the safe diagnostic if deletion fails", async () => {
    const actions = makeActions();
    actions.deleteLeadNoteAction.mockRejectedValueOnce(new Error("private delete failure"));
    renderConsumer(actions);
    choose();
    submit();
    await screen.findByRole("heading", { name: "Generated section" });

    fireEvent.click(screen.getByRole("button", { name: "Delete selected Lead note" }));
    const alert = await screen.findByRole("alert");

    expect(alert).toHaveTextContent(
      "The Lead edit history could not be updated. The generated section remains unchanged.",
    );
    expect(alert).not.toHaveTextContent("private delete failure");
    expect(
      screen.getByRole("listitem", {
        name: "Lead note, MIDI pitch 60, start tick 0, duration 960 ticks",
      }),
    ).toBeVisible();
    expect(screen.getByText("Editor revision 1 of 1.")).toBeVisible();
    expect(screen.getByRole("button", { name: "Delete selected Lead note" })).toBeEnabled();
  });

  it("rejects a Lead duration beyond the remaining section span in the browser proposal", async () => {
    const { actions } = renderConsumer();
    choose();
    submit();
    await screen.findByRole("heading", { name: "Generated section" });
    fireEvent.change(screen.getByLabelText("Absolute duration ticks"), {
      target: { value: "30721" },
    });
    expect(screen.getByRole("button", { name: "Apply Lead duration" })).toBeDisabled();
    expect(actions.setLeadDurationAction).not.toHaveBeenCalled();
  });

  it("stops the current audition when a validated start-tick revision becomes selected", async () => {
    const audio = installFakeAudioContext();
    try {
      renderConsumer();
      choose();
      submit();
      await screen.findByRole("heading", { name: "Generated section" });
      fireEvent.click(screen.getByRole("button", { name: "Play" }));
      await screen.findByText("Playing all four roles.");

      fireEvent.change(screen.getByLabelText("Absolute start tick"), {
        target: { value: "480" },
      });
      fireEvent.click(screen.getByRole("button", { name: "Move Lead note" }));
      await screen.findByRole("listitem", {
        name: "Lead note, MIDI pitch 60, start tick 480, duration 960 ticks",
      });

      expect(screen.getByText("Playback stopped.")).toBeVisible();
      expect(audio.sources.every((source) => source.stop.mock.calls.length > 0)).toBe(true);
    } finally {
      audio.restore();
    }
  });
  it("stops the current audition when a validated duration revision becomes selected", async () => {
    const audio = installFakeAudioContext();
    try {
      renderConsumer();
      choose();
      submit();
      await screen.findByRole("heading", { name: "Generated section" });
      fireEvent.click(screen.getByRole("button", { name: "Play" }));
      await screen.findByText("Playing all four roles.");

      fireEvent.change(screen.getByLabelText("Absolute duration ticks"), {
        target: { value: "1440" },
      });
      fireEvent.click(screen.getByRole("button", { name: "Apply Lead duration" }));
      await screen.findByRole("listitem", {
        name: "Lead note, MIDI pitch 60, start tick 0, duration 1440 ticks",
      });

      expect(screen.getByText("Playback stopped.")).toBeVisible();
      expect(audio.sources.every((source) => source.stop.mock.calls.length > 0)).toBe(true);
    } finally {
      audio.restore();
    }
  });
  it("invalidates the current audition when a validated deletion becomes selected", async () => {
    const audio = installFakeAudioContext();
    try {
      const { actions } = renderConsumer();
      choose();
      submit();
      await screen.findByRole("heading", { name: "Generated section" });
      fireEvent.click(screen.getByRole("button", { name: "Play" }));
      await screen.findByText("Playing all four roles.");

      fireEvent.click(screen.getByRole("button", { name: "Delete selected Lead note" }));
      await screen.findByText("0 notes");

      expect(actions.deleteLeadNoteAction).toHaveBeenCalledTimes(1);
      expect(screen.getByText("Playback stopped.")).toBeVisible();
      expect(audio.sources.every((source) => source.stop.mock.calls.length > 0)).toBe(true);
    } finally {
      audio.restore();
    }
  });
  it("stops the current audition when a validated Lead revision becomes selected", async () => {
    const audio = installFakeAudioContext();
    try {
      const { actions } = renderConsumer();
      choose();
      submit();
      await screen.findByRole("heading", { name: "Generated section" });
      fireEvent.click(screen.getByRole("button", { name: "Play" }));
      await screen.findByText("Playing all four roles.");

      fireEvent.change(screen.getByLabelText("MIDI pitch (60–84)"), {
        target: { value: "64" },
      });
      fireEvent.click(screen.getByRole("button", { name: "Apply Lead pitch" }));
      await screen.findByRole("listitem", {
        name: "Lead note, MIDI pitch 64, start tick 0, duration 960 ticks",
      });

      expect(actions.setLeadPitchAction).toHaveBeenCalledTimes(1);
      expect(screen.getByText("Playback stopped.")).toBeVisible();
      expect(audio.sources.every((source) => source.stop.mock.calls.length > 0)).toBe(true);
    } finally {
      audio.restore();
    }
  });
  it("keeps native keyboard-operable transport and isolation controls available for a generated section", async () => {
    renderConsumer();
    choose();
    submit();
    await screen.findByRole("heading", { name: "Generated section" });

    expect(screen.getByRole("button", { name: "Play" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Stop" })).toBeDisabled();
    expect(screen.getByRole("checkbox", { name: "Loop" })).toBeEnabled();
    for (const role of ["Harmony", "Bass", "Arpeggiator", "Lead"])
      expect(screen.getByRole("checkbox", { name: `Mute ${role}` })).toBeEnabled();
    expect(screen.getByRole("combobox", { name: "Solo" })).toBeEnabled();
  });
  it("calls browser timers with window as their receiver", () => {
    const originalSetInterval = Object.getOwnPropertyDescriptor(window, "setInterval");
    const originalClearInterval = Object.getOwnPropertyDescriptor(window, "clearInterval");
    const timer = vi.fn(function (
      this: typeof window,
      _callback: TimerHandler,
      _milliseconds?: number,
    ) {
      if (this !== window) throw new TypeError("Illegal invocation");
      return 1 as unknown as ReturnType<typeof window.setInterval>;
    });
    const clearTimer = vi.fn(function (
      this: typeof window,
      _handle: ReturnType<typeof window.setInterval>,
    ) {
      if (this !== window) throw new TypeError("Illegal invocation");
    });
    Object.defineProperty(window, "setInterval", { configurable: true, value: timer });
    Object.defineProperty(window, "clearInterval", { configurable: true, value: clearTimer });
    try {
      const dependencies = createBrowserAuditionDependencies();
      dependencies.setInterval(() => {}, 25);
      dependencies.clearInterval(1 as unknown as ReturnType<typeof window.setInterval>);
      expect(timer).toHaveBeenCalledWith(expect.any(Function), 25);
      expect(clearTimer).toHaveBeenCalledWith(1);
    } finally {
      if (originalSetInterval) Object.defineProperty(window, "setInterval", originalSetInterval);
      else Reflect.deleteProperty(window, "setInterval");
      if (originalClearInterval)
        Object.defineProperty(window, "clearInterval", originalClearInterval);
      else Reflect.deleteProperty(window, "clearInterval");
    }
  });
  it("stops owned audio when hidden and when the preview consumer unmounts", async () => {
    const audio = installFakeAudioContext();
    const visibility = Object.getOwnPropertyDescriptor(document, "visibilityState");
    try {
      const rendered = renderConsumer();
      choose();
      submit();
      await screen.findByRole("heading", { name: "Generated section" });
      fireEvent.click(screen.getByRole("button", { name: "Play" }));
      await screen.findByText("Playing all four roles.");

      Object.defineProperty(document, "visibilityState", { configurable: true, value: "hidden" });
      act(() => document.dispatchEvent(new Event("visibilitychange")));
      expect(screen.getByText("Playback stopped.")).toBeVisible();
      expect(audio.sources.every((source) => source.stop.mock.calls.length > 0)).toBe(true);

      rendered.unmount();
      expect(audio.sources.every((source) => source.stop.mock.calls.length > 0)).toBe(true);
    } finally {
      if (visibility) Object.defineProperty(document, "visibilityState", visibility);
      audio.restore();
    }
  });
  it("prevents duplicate submissions and clears stale output on control changes", async () => {
    let resolve: ((value: EditorApplicationV1) => void) | undefined;
    const generate = vi.fn<(request: CompleteSectionRequestV1) => Promise<EditorApplicationV1>>(
      () =>
        new Promise<EditorApplicationV1>((done) => {
          resolve = done;
        }),
    );
    const actions = makeActions();
    actions.generateAction = generate;
    renderConsumer(actions);
    choose();
    const form = screen.getByRole("button", { name: "Generate" }).closest("form");
    if (!form) throw new Error("Missing form.");
    fireEvent.submit(form);
    fireEvent.submit(form);
    expect(generate).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("button", { name: "Generating…" })).toBeDisabled();
    expect(screen.getByLabelText("Seed")).toBeEnabled();
    await act(async () => {
      if (!resolve) throw new Error("No pending invocation.");
      resolve(ROOT_APPLICATION);
    });
    await screen.findByRole("heading", { name: "Generated section" });
    fireEvent.change(screen.getByLabelText("Profile"), { target: { value: "darkwave" } });
    expect(screen.getByLabelText("Harmony template")).toHaveValue("");
    expect(screen.queryByRole("heading", { name: "Generated section" })).not.toBeInTheDocument();
  });
  it("ignores a stale success after inputs change and waits for an explicit Generate", async () => {
    let resolveFirst: ((value: EditorApplicationV1) => void) | undefined;
    const generate = vi
      .fn<(request: CompleteSectionRequestV1) => Promise<EditorApplicationV1>>()
      .mockImplementationOnce(
        () =>
          new Promise<EditorApplicationV1>((resolve) => {
            resolveFirst = resolve;
          }),
      )
      .mockResolvedValueOnce(ROOT_APPLICATION);
    const actions = makeActions();
    actions.generateAction = generate;
    renderConsumer(actions);
    choose();
    submit();
    expect(generate).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("button", { name: "Generating…" })).toBeDisabled();

    fireEvent.change(screen.getByLabelText("Seed"), { target: { value: "43" } });
    expect(screen.getByLabelText("Seed")).toHaveValue(43);

    await act(async () => {
      if (!resolveFirst) throw new Error("No pending invocation.");
      resolveFirst(ROOT_APPLICATION);
    });

    expect(screen.getByLabelText("Seed")).toHaveValue(43);
    expect(screen.queryByRole("heading", { name: "Generated section" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Generate" })).toBeEnabled();
    expect(generate).toHaveBeenCalledTimes(1);

    submit();
    await screen.findByRole("heading", { name: "Generated section" });
    expect(generate).toHaveBeenCalledTimes(2);
    expect(generate.mock.calls[0]?.[0].composition.rootSeed).toBe(0);
    expect(generate.mock.calls[1]?.[0].composition.rootSeed).toBe(43);
  });
  it("ignores a stale rejection after inputs change", async () => {
    let rejectFirst: ((reason: Error) => void) | undefined;
    const generate = vi.fn<(request: CompleteSectionRequestV1) => Promise<EditorApplicationV1>>(
      () =>
        new Promise<EditorApplicationV1>((_resolve, reject) => {
          rejectFirst = reject;
        }),
    );
    const actions = makeActions();
    actions.generateAction = generate;
    renderConsumer(actions);
    choose();
    submit();
    fireEvent.change(screen.getByLabelText("Energy"), { target: { value: "high" } });

    await act(async () => {
      if (!rejectFirst) throw new Error("No pending invocation.");
      rejectFirst(new Error("stale secret diagnostic"));
    });

    expect(screen.getByLabelText("Energy")).toHaveValue("high");
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Generated section" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Generate" })).toBeEnabled();
    expect(generate).toHaveBeenCalledTimes(1);
  });
  it("ignores a stale editor success after generation controls change", async () => {
    let resolveEdit: ((application: EditorApplicationV1) => void) | undefined;
    const actions = makeActions();
    actions.setLeadPitchAction = vi.fn(
      () =>
        new Promise<EditorApplicationV1>((resolve) => {
          resolveEdit = resolve;
        }),
    );
    renderConsumer(actions);
    choose();
    submit();
    await screen.findByRole("heading", { name: "Generated section" });

    fireEvent.change(screen.getByLabelText("MIDI pitch (60–84)"), {
      target: { value: "64" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Apply Lead pitch" }));
    expect(screen.getByRole("button", { name: "Apply Lead pitch" })).toBeDisabled();
    fireEvent.change(screen.getByLabelText("Seed"), { target: { value: "43" } });

    await act(async () => {
      if (!resolveEdit) throw new Error("No pending edit invocation.");
      resolveEdit(EDITED_APPLICATION);
    });

    expect(screen.getByLabelText("Seed")).toHaveValue(43);
    expect(screen.queryByRole("heading", { name: "Generated section" })).not.toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Generate" })).toBeEnabled();
    expect(actions.generateAction).toHaveBeenCalledTimes(1);
    expect(actions.setLeadPitchAction).toHaveBeenCalledTimes(1);
  });
  it("ignores a stale editor rejection after generation controls change", async () => {
    let rejectEdit: ((reason: Error) => void) | undefined;
    const actions = makeActions();
    actions.setLeadPitchAction = vi.fn(
      () =>
        new Promise<EditorApplicationV1>((_resolve, reject) => {
          rejectEdit = reject;
        }),
    );
    renderConsumer(actions);
    choose();
    submit();
    await screen.findByRole("heading", { name: "Generated section" });

    fireEvent.change(screen.getByLabelText("MIDI pitch (60–84)"), {
      target: { value: "64" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Apply Lead pitch" }));
    fireEvent.change(screen.getByLabelText("Seed"), { target: { value: "44" } });

    await act(async () => {
      if (!rejectEdit) throw new Error("No pending edit invocation.");
      rejectEdit(new Error("stale private diagnostic"));
    });

    expect(screen.getByLabelText("Seed")).toHaveValue(44);
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.queryByText(/stale private diagnostic/)).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Generated section" })).not.toBeInTheDocument();
  });
  it("shows a safe error without stale data or automatic retries, then allows explicit recovery", async () => {
    const generate = vi
      .fn<(request: CompleteSectionRequestV1) => Promise<EditorApplicationV1>>()
      .mockResolvedValueOnce(ROOT_APPLICATION)
      .mockRejectedValueOnce(new Error("secret diagnostic"))
      .mockResolvedValueOnce(ROOT_APPLICATION);
    const actions = makeActions();
    actions.generateAction = generate;
    renderConsumer(actions);
    choose();
    submit();
    await screen.findByRole("heading", { name: "Generated section" });
    await waitFor(() => expect(screen.getByRole("button", { name: "Generate" })).toBeEnabled());
    submit();
    await screen.findByRole("alert");
    expect(screen.queryByText(/secret diagnostic/)).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Generated section" })).not.toBeInTheDocument();
    expect(generate).toHaveBeenCalledTimes(2);
    await waitFor(() => expect(screen.getByRole("button", { name: "Generate" })).toBeEnabled());
    submit();
    await screen.findByRole("heading", { name: "Generated section" });
    expect(generate).toHaveBeenCalledTimes(3);
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
  it("rejects an out-of-domain seed before invoking Node", () => {
    const { actions } = renderConsumer();
    choose();
    fireEvent.change(screen.getByLabelText("Seed"), { target: { value: "4294967296" } });
    submit();
    expect(actions.generateAction).not.toHaveBeenCalled();
    expect(screen.getByRole("alert")).toBeVisible();
  });
  it("has no detectable empty/ready accessibility violations", async () => {
    const actions = makeActions();
    const { container } = render(
      <main>
        <GenerateSection choices={CHOICES} {...actions} />
      </main>,
    );
    expect(
      (await axe.run(container, { rules: { "color-contrast": { enabled: false } } })).violations,
    ).toEqual([]);
    choose();
    submit();
    await screen.findByRole("heading", { name: "Generated section" });
    expect(
      (await axe.run(container, { rules: { "color-contrast": { enabled: false } } })).violations,
    ).toEqual([]);
  });
});
