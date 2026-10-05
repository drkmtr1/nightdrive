import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { EditorNoteV1, EditorRevisionIdentityV1 } from "../composition/editor-revision";
import { LeadNotePianoRoll } from "./lead-note-piano-roll";

const NOTE_ID = `note-${"d".repeat(64)}`;
const PARENT: EditorRevisionIdentityV1 = {
  schema: "nightdrive.editor-revision.v1",
  revisionHash: "b".repeat(64),
};
const FIRST_NOTE: EditorNoteV1 = {
  id: NOTE_ID,
  pitch: 64,
  startTick: 960,
  durationTicks: 480,
  velocity: 100,
};
const SECOND_NOTE: EditorNoteV1 = {
  id: `note-${"e".repeat(64)}`,
  pitch: 64,
  startTick: 960,
  durationTicks: 480,
  velocity: 100,
};
const NOTES = [FIRST_NOTE, SECOND_NOTE] as const;

function setup(notes: readonly EditorNoteV1[] = NOTES) {
  const onSelectNote = vi.fn();
  const onCommitPosition = vi.fn();
  const view = render(
    <LeadNotePianoRoll
      sectionEndTick={30_720}
      notes={notes}
      selectedNoteId=""
      sourceResultHash={"a".repeat(64)}
      parent={PARENT}
      onSelectNote={onSelectNote}
      onCommitPosition={onCommitPosition}
    />,
  );
  const plot = screen.getByTestId("lead-piano-roll-plot");
  function setPlotBounds(width: number, height: number) {
    Object.defineProperty(plot, "getBoundingClientRect", {
      configurable: true,
      value: () => ({
        x: 0,
        y: 0,
        width,
        height,
        top: 0,
        right: width,
        bottom: height,
        left: 0,
        toJSON: () => ({}),
      }),
    });
  }
  return { ...view, onSelectNote, onCommitPosition, plot, setPlotBounds };
}

function noteButton(noteId = NOTE_ID) {
  const button = document.querySelector<HTMLButtonElement>(`[data-note-id="${noteId}"]`);
  if (!button) throw new Error("Missing stable-ID piano-roll note.");
  return button;
}

function pointerDown(button: HTMLButtonElement, x: number, y: number) {
  fireEvent.pointerDown(button, {
    pointerId: 1,
    isPrimary: true,
    button: 0,
    clientX: x,
    clientY: y,
  });
}

function pointerMove(button: HTMLButtonElement, x: number, y: number) {
  fireEvent.pointerMove(button, {
    pointerId: 1,
    isPrimary: true,
    clientX: x,
    clientY: y,
  });
}

function pointerUp(button: HTMLButtonElement, x: number, y: number) {
  fireEvent.pointerUp(button, {
    pointerId: 1,
    isPrimary: true,
    button: 0,
    clientX: x,
    clientY: y,
  });
}

describe("LeadNotePianoRoll", () => {
  it("projects only stable-ID Lead notes with eight decorative bar guides and MIDI pitch labels", () => {
    const { onCommitPosition, onSelectNote, plot } = setup();
    expect(screen.getByRole("heading", { name: "Lead piano roll" })).toBeVisible();
    expect(plot).toHaveAccessibleName("Lead notes across eight bars");
    expect(
      screen.getAllByRole("listitem", {
        name: /^MIDI (?:84|83|82|81|80|79|78|77|76|75|74|73|72|71|70|69|68|67|66|65|64|63|62|61|60)$/,
      }),
    ).toHaveLength(25);
    expect(plot.querySelectorAll(".leadPianoRollBarLine")).toHaveLength(9);
    expect(screen.getAllByRole("button", { name: /Lead note/ })).toHaveLength(2);
    expect(noteButton()).toHaveAttribute("data-note-id", NOTE_ID);
    expect(noteButton()).toHaveStyle({ left: "3.125%", width: "1.5625%", top: "80%" });
    expect(onSelectNote).not.toHaveBeenCalled();
    expect(onCommitPosition).not.toHaveBeenCalled();
  });

  it("selects by stable note ID, preserves the grab offset, and submits one v5 command only on release", () => {
    const { onCommitPosition, onSelectNote, setPlotBounds } = setup([FIRST_NOTE]);
    setPlotBounds(1_000, 500);
    const button = noteButton();
    pointerDown(button, 120, 100);
    pointerMove(button, 130, 80);

    expect(onSelectNote).toHaveBeenCalledTimes(1);
    expect(onSelectNote).toHaveBeenCalledWith(NOTE_ID);
    expect(onCommitPosition).not.toHaveBeenCalled();
    expect(button).toHaveAttribute("data-transient-proposal", "true");
    expect(button).toHaveAttribute("data-start-tick", "1267");
    expect(button).toHaveAttribute("data-pitch", "65");

    pointerUp(button, 130, 80);
    expect(onCommitPosition).toHaveBeenCalledTimes(1);
    expect(onCommitPosition).toHaveBeenCalledWith({
      sourceResultHash: "a".repeat(64),
      expectedParent: PARENT,
      command: {
        schema: "nightdrive.editor-note-command.v5",
        type: "set-note-position",
        noteId: NOTE_ID,
        expectedPitch: 64,
        expectedStartTick: 960,
        pitch: 65,
        startTick: 1_267,
      },
    });
    expect(button).not.toHaveAttribute("data-transient-proposal");
    expect(button).toHaveAttribute("data-start-tick", "960");
    expect(button).toHaveAttribute("data-pitch", "64");
  });

  it("treats movement below four CSS pixels as selection and movement at four pixels as a drag", () => {
    const first = setup([FIRST_NOTE]);
    first.setPlotBounds(1_000, 500);
    const note = noteButton();
    pointerDown(note, 100, 100);
    pointerMove(note, 103.99, 100);
    expect(note).not.toHaveAttribute("data-transient-proposal");
    pointerUp(note, 103.99, 100);
    expect(first.onCommitPosition).not.toHaveBeenCalled();

    first.unmount();
    const second = setup([FIRST_NOTE]);
    second.setPlotBounds(1_000, 500);
    const exactThresholdNote = noteButton();
    pointerDown(exactThresholdNote, 100, 100);
    pointerMove(exactThresholdNote, 104, 100);
    expect(exactThresholdNote).toHaveAttribute("data-transient-proposal", "true");
    expect(second.onCommitPosition).not.toHaveBeenCalled();
    pointerUp(exactThresholdNote, 104, 100);
    expect(second.onCommitPosition).toHaveBeenCalledTimes(1);
    expect(second.onCommitPosition.mock.calls[0]?.[0].command).toMatchObject({
      expectedStartTick: 960,
      startTick: 1_083,
      expectedPitch: 64,
      pitch: 64,
    });
  });

  it.each([
    { dx: 0.5, dy: 4, expectedTick: 961, expectedPitch: 63 },
    { dx: -0.5, dy: -4, expectedTick: 959, expectedPitch: 65 },
  ])(
    "rounds exact half-tick and half-semitone displacements away from zero: $dx/$dy",
    ({ dx, dy, expectedTick, expectedPitch }) => {
      const { onCommitPosition, setPlotBounds } = setup([FIRST_NOTE]);
      setPlotBounds(30_720, 200);
      const note = noteButton();
      pointerDown(note, 0, 0);
      pointerMove(note, dx, dy);
      expect(onCommitPosition).not.toHaveBeenCalled();
      pointerUp(note, dx, dy);
      expect(onCommitPosition.mock.calls[0]?.[0].command).toMatchObject({
        startTick: expectedTick,
        pitch: expectedPitch,
      });
    },
  );

  it("cancels on pointer cancellation and lost pointer capture without submitting", () => {
    const { onCommitPosition, setPlotBounds } = setup([FIRST_NOTE]);
    setPlotBounds(1_000, 500);
    const note = noteButton();
    pointerDown(note, 100, 100);
    pointerMove(note, 110, 80);
    expect(note).toHaveAttribute("data-transient-proposal", "true");
    fireEvent.pointerCancel(note, { pointerId: 1 });
    expect(note).not.toHaveAttribute("data-transient-proposal");
    expect(onCommitPosition).not.toHaveBeenCalled();

    pointerDown(note, 100, 100);
    pointerMove(note, 110, 80);
    fireEvent.lostPointerCapture(note, { pointerId: 1 });
    expect(note).not.toHaveAttribute("data-transient-proposal");
    expect(onCommitPosition).not.toHaveBeenCalled();
  });

  it("cancels if the source or parent changes before release", () => {
    const props = {
      sectionEndTick: 30_720,
      notes: [FIRST_NOTE],
      selectedNoteId: "",
      sourceResultHash: "a".repeat(64),
      parent: PARENT,
      onSelectNote: vi.fn(),
      onCommitPosition: vi.fn(),
    };
    const view = render(<LeadNotePianoRoll {...props} />);
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
    const note = noteButton();
    pointerDown(note, 100, 100);
    pointerMove(note, 110, 80);
    view.rerender(
      <LeadNotePianoRoll
        {...props}
        sourceResultHash={"f".repeat(64)}
        parent={{ ...PARENT, revisionHash: "c".repeat(64) }}
      />,
    );
    pointerUp(note, 110, 80);
    expect(props.onCommitPosition).not.toHaveBeenCalled();
    expect(note).not.toHaveAttribute("data-transient-proposal");
  });

  it("discards an active proposal when the view is torn down", () => {
    const { onCommitPosition, setPlotBounds, unmount } = setup([FIRST_NOTE]);
    setPlotBounds(1_000, 500);
    const note = noteButton();
    pointerDown(note, 100, 100);
    pointerMove(note, 110, 80);
    expect(note).toHaveAttribute("data-transient-proposal", "true");
    unmount();
    pointerUp(note, 110, 80);
    expect(onCommitPosition).not.toHaveBeenCalled();
  });

  it("does not create a revision when an activated drag maps to the unchanged position", () => {
    const { onCommitPosition, setPlotBounds } = setup([FIRST_NOTE]);
    setPlotBounds(3_072_000, 25_000);
    const note = noteButton();
    pointerDown(note, 100, 100);
    pointerMove(note, 104, 100);
    expect(note).toHaveAttribute("data-transient-proposal", "true");
    pointerUp(note, 104, 100);
    expect(onCommitPosition).not.toHaveBeenCalled();
  });
});
