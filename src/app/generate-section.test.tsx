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
const NOTE_ID = "note-" + "d".repeat(64);

function makeEditorApplication(
  leadPitch = 60,
  includeChild = false,
  selectedCursor?: number,
  leadStartTick?: number,
): EditorApplicationV1 {
  const roles = ["harmony", "bass", "arpeggiator", "lead"] as const;
  const rootTracks = roles.map((role, index) => ({
    role,
    notes: [
      {
        id: "note-" + ["a", "b", "c", "d"][index]?.repeat(64),
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
            notes: track.notes.map((note) => ({
              ...note,
              pitch: leadPitch,
              ...(leadStartTick === undefined ? {} : { startTick: leadStartTick }),
            })),
          }
        : track,
    ),
    parent: { schema: root.schema, revisionHash: root.revisionHash },
    command:
      leadStartTick === undefined
        ? {
            schema: "nightdrive.editor-note-command.v1",
            type: "set-note-pitch",
            noteId: NOTE_ID,
            expectedPitch: 60,
            pitch: leadPitch,
          }
        : {
            schema: "nightdrive.editor-note-command.v2",
            type: "set-note-start-tick",
            noteId: NOTE_ID,
            expectedStartTick: 0,
            startTick: leadStartTick,
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

function makeActions() {
  return {
    generateAction: vi.fn().mockResolvedValue(ROOT_APPLICATION),
    setLeadPitchAction: vi.fn().mockResolvedValue(EDITED_APPLICATION),
    setLeadStartTickAction: vi.fn().mockResolvedValue(MOVED_APPLICATION),
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

describe("Generate section consumer", () => {
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
    expect(
      screen.getByRole("table", {
        name: /four-role notes positioned across the generated eight-bar section/i,
      }),
    ).toBeVisible();
    expect(
      screen.getByRole("listitem", {
        name: /Lead note, MIDI pitch 60, start tick 0, duration 960 ticks/i,
      }),
    ).toBeVisible();
    expect(screen.getAllByText("1 notes")).toHaveLength(4);
    expect(screen.getByRole("button", { name: "Play" })).toBeVisible();
    expect(screen.getByText(/internal composition preview/i)).toBeVisible();
    expect(screen.getByRole("combobox", { name: "Lead note" })).toHaveValue(NOTE_ID);
    expect(screen.getByLabelText("MIDI pitch (60–84)")).toHaveValue(60);
    expect(screen.getByRole("button", { name: "Apply Lead pitch" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Undo" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Redo" })).toBeDisabled();
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
