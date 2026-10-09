"use client";

import type { PointerEvent as ReactPointerEvent } from "react";
import { Fragment, useEffect, useRef, useState } from "react";
import type {
  EditorNoteV1,
  EditorRevisionIdentityV1,
  SetNoteDurationCommandV3,
  SetNotePositionCommandV5,
} from "../composition/editor-revision";

const MIDI_MIN = 60;
const MIDI_MAX = 84;
const PITCH_ROW_COUNT = MIDI_MAX - MIDI_MIN + 1;
const DRAG_THRESHOLD_CSS_PX = 4;

type CommitRequest = Readonly<{
  sourceResultHash: string;
  expectedParent: EditorRevisionIdentityV1;
  command: SetNotePositionCommandV5;
}>;

type Props = Readonly<{
  sectionEndTick: number;
  notes: readonly EditorNoteV1[];
  selectedNoteId: string;
  sourceResultHash: string;
  parent: EditorRevisionIdentityV1;
  onSelectNote: (noteId: string) => void;
  onCommitPosition: (request: CommitRequest) => void;
  onCommitDuration: (
    request: Omit<CommitRequest, "command"> & { command: SetNoteDurationCommandV3 },
  ) => void;
  disabled?: boolean;
}>;

type Proposal = Readonly<{
  noteId: string;
  pitch: number;
  startTick: number;
}>;

type Gesture = Readonly<{
  pointerId: number;
  noteId: string;
  expectedPitch: number;
  expectedStartTick: number;
  sourceResultHash: string;
  expectedParent: EditorRevisionIdentityV1;
  startX: number;
  startY: number;
  plotWidth: number;
  semitoneRowHeight: number;
  activated: boolean;
}>;

function roundHalfAwayFromZero(value: number): number {
  const magnitude = Math.floor(Math.abs(value) + 0.5);
  return value < 0 ? -magnitude : magnitude;
}

function pointerId(event: ReactPointerEvent<HTMLButtonElement>): number {
  return Number.isFinite(event.pointerId) ? event.pointerId : 0;
}

function sameContext(
  gesture: Gesture,
  sourceResultHash: string,
  parent: EditorRevisionIdentityV1,
): boolean {
  return (
    gesture.sourceResultHash === sourceResultHash &&
    gesture.expectedParent.schema === parent.schema &&
    gesture.expectedParent.revisionHash === parent.revisionHash
  );
}

function proposalAt(gesture: Gesture, clientX: number, clientY: number): Proposal {
  const deltaX = clientX - gesture.startX;
  const deltaY = clientY - gesture.startY;
  return {
    noteId: gesture.noteId,
    startTick:
      gesture.expectedStartTick + roundHalfAwayFromZero((deltaX * 30_720) / gesture.plotWidth),
    pitch: gesture.expectedPitch + roundHalfAwayFromZero(-deltaY / gesture.semitoneRowHeight),
  };
}

/** A noncanonical Lead-only projection whose pointer gestures submit one v5 command on release. */
export function LeadNotePianoRoll({
  sectionEndTick,
  notes,
  selectedNoteId,
  sourceResultHash,
  parent,
  onSelectNote,
  onCommitPosition,
  onCommitDuration,
  disabled = false,
}: Props) {
  const resizeRef = useRef<{
    pointerId: number;
    note: EditorNoteV1;
    x: number;
    y: number;
    width: number;
    sourceResultHash: string;
    parent: EditorRevisionIdentityV1;
    activated: boolean;
  } | null>(null);
  const [resizeProposal, setResizeProposal] = useState<{
    noteId: string;
    durationTicks: number;
  } | null>(null);
  function cancelResize() {
    resizeRef.current = null;
    setResizeProposal(null);
  }
  useEffect(() => {
    const gesture = resizeRef.current;
    if (
      gesture &&
      (disabled ||
        (selectedNoteId && selectedNoteId !== gesture.note.id) ||
        gesture.sourceResultHash !== sourceResultHash ||
        gesture.parent.schema !== parent.schema ||
        gesture.parent.revisionHash !== parent.revisionHash)
    ) {
      resizeRef.current = null;
      setResizeProposal(null);
    }
  }, [disabled, selectedNoteId, sourceResultHash, parent.schema, parent.revisionHash]);
  useEffect(
    () => () => {
      resizeRef.current = null;
    },
    [],
  );
  function beginResize(note: EditorNoteV1, event: ReactPointerEvent<HTMLButtonElement>) {
    event.stopPropagation();
    if (
      disabled ||
      event.button !== 0 ||
      event.isPrimary === false ||
      resizeRef.current ||
      gestureRef.current
    )
      return;
    const width = plotRef.current?.getBoundingClientRect().width;
    if (
      !width ||
      !Number.isFinite(width) ||
      width <= 0 ||
      !Number.isFinite(event.clientX) ||
      !Number.isFinite(event.clientY)
    )
      return;
    resizeRef.current = {
      pointerId: pointerId(event),
      note,
      x: event.clientX,
      y: event.clientY,
      width,
      sourceResultHash,
      parent,
      activated: false,
    };
    onSelectNote(note.id);
    try {
      event.currentTarget.setPointerCapture?.(event.pointerId);
    } catch {
      cancelResize();
    }
  }
  function resizeAt(event: ReactPointerEvent<HTMLButtonElement>, release: boolean) {
    const gesture = resizeRef.current;
    if (!gesture || gesture.pointerId !== pointerId(event)) return;
    if (
      disabled ||
      (selectedNoteId && selectedNoteId !== gesture.note.id) ||
      gesture.sourceResultHash !== sourceResultHash ||
      gesture.parent.schema !== parent.schema ||
      gesture.parent.revisionHash !== parent.revisionHash
    ) {
      cancelResize();
      return;
    }
    const dx = event.clientX - gesture.x;
    const dy = event.clientY - gesture.y;
    const durationTicks =
      gesture.note.durationTicks + roundHalfAwayFromZero((dx * 30_720) / gesture.width);
    if (!Number.isFinite(dx) || !Number.isFinite(dy) || !Number.isSafeInteger(durationTicks)) {
      cancelResize();
      return;
    }
    const activated = gesture.activated || Math.hypot(dx, dy) >= DRAG_THRESHOLD_CSS_PX;
    resizeRef.current = { ...gesture, activated };
    if (!release) {
      setResizeProposal(activated ? { noteId: gesture.note.id, durationTicks } : null);
      return;
    }
    cancelResize();
    if (!activated || durationTicks === gesture.note.durationTicks) return;
    onCommitDuration({
      sourceResultHash: gesture.sourceResultHash,
      expectedParent: gesture.parent,
      command: {
        schema: "nightdrive.editor-note-command.v3",
        type: "set-note-duration",
        noteId: gesture.note.id,
        expectedDurationTicks: gesture.note.durationTicks,
        durationTicks,
      },
    });
  }

  const plotRef = useRef<HTMLFieldSetElement>(null);
  const gestureRef = useRef<Gesture | null>(null);
  const contextRef = useRef({ sourceResultHash, parent });
  const [proposal, setProposal] = useState<Proposal | null>(null);
  contextRef.current = { sourceResultHash, parent };

  function clearGesture(expectedPointerId?: number) {
    const gesture = gestureRef.current;
    if (!gesture || (expectedPointerId !== undefined && gesture.pointerId !== expectedPointerId))
      return;
    gestureRef.current = null;
    setProposal(null);
  }

  function cancelGesture(event: ReactPointerEvent<HTMLButtonElement>) {
    clearGesture(pointerId(event));
  }

  useEffect(() => {
    const gesture = gestureRef.current;
    if (
      gesture &&
      (gesture.sourceResultHash !== sourceResultHash ||
        gesture.expectedParent.schema !== parent.schema ||
        gesture.expectedParent.revisionHash !== parent.revisionHash)
    ) {
      gestureRef.current = null;
      setProposal(null);
    }
  }, [sourceResultHash, parent.schema, parent.revisionHash]);

  useEffect(
    () => () => {
      gestureRef.current = null;
    },
    [],
  );

  function beginGesture(note: EditorNoteV1, event: ReactPointerEvent<HTMLButtonElement>) {
    if (disabled || resizeRef.current || event.button !== 0 || event.isPrimary === false) return;
    const plot = plotRef.current;
    if (!plot) return;
    const bounds = plot.getBoundingClientRect();
    const semitoneRowHeight = bounds.height / PITCH_ROW_COUNT;
    if (!(bounds.width > 0) || !(semitoneRowHeight > 0)) return;

    if (gestureRef.current) return;
    const currentPointerId = pointerId(event);
    gestureRef.current = {
      pointerId: currentPointerId,
      noteId: note.id,
      expectedPitch: note.pitch,
      expectedStartTick: note.startTick,
      sourceResultHash,
      expectedParent: parent,
      startX: event.clientX,
      startY: event.clientY,
      plotWidth: bounds.width,
      semitoneRowHeight,
      activated: false,
    };
    onSelectNote(note.id);

    if (
      Number.isFinite(event.pointerId) &&
      typeof event.currentTarget.setPointerCapture === "function"
    ) {
      try {
        event.currentTarget.setPointerCapture(event.pointerId);
      } catch {
        clearGesture(currentPointerId);
      }
    }
  }

  function moveGesture(event: ReactPointerEvent<HTMLButtonElement>) {
    const gesture = gestureRef.current;
    if (!gesture || gesture.pointerId !== pointerId(event)) return;
    const current = contextRef.current;
    if (!sameContext(gesture, current.sourceResultHash, current.parent)) {
      clearGesture(gesture.pointerId);
      return;
    }

    const deltaX = event.clientX - gesture.startX;
    const deltaY = event.clientY - gesture.startY;
    const activated = gesture.activated || Math.hypot(deltaX, deltaY) >= DRAG_THRESHOLD_CSS_PX;
    gestureRef.current = { ...gesture, activated };
    setProposal(activated ? proposalAt(gesture, event.clientX, event.clientY) : null);
  }

  function endGesture(event: ReactPointerEvent<HTMLButtonElement>) {
    const gesture = gestureRef.current;
    if (!gesture || gesture.pointerId !== pointerId(event)) return;
    const current = contextRef.current;
    if (!sameContext(gesture, current.sourceResultHash, current.parent)) {
      clearGesture(gesture.pointerId);
      return;
    }

    const deltaX = event.clientX - gesture.startX;
    const deltaY = event.clientY - gesture.startY;
    const activated = gesture.activated || Math.hypot(deltaX, deltaY) >= DRAG_THRESHOLD_CSS_PX;
    const next = activated ? proposalAt(gesture, event.clientX, event.clientY) : null;
    clearGesture(gesture.pointerId);

    if (
      !next ||
      (next.pitch === gesture.expectedPitch && next.startTick === gesture.expectedStartTick)
    )
      return;

    const command: SetNotePositionCommandV5 = {
      schema: "nightdrive.editor-note-command.v5",
      type: "set-note-position",
      noteId: gesture.noteId,
      expectedPitch: gesture.expectedPitch,
      expectedStartTick: gesture.expectedStartTick,
      pitch: next.pitch,
      startTick: next.startTick,
    };
    onCommitPosition({
      sourceResultHash: gesture.sourceResultHash,
      expectedParent: gesture.expectedParent,
      command,
    });
  }

  const bars = Array.from({ length: 8 }, (_, index) => index + 1);
  const barLines = Array.from({ length: 9 }, (_, index) => index);
  const pitches = Array.from({ length: PITCH_ROW_COUNT }, (_, index) => MIDI_MAX - index);

  return (
    <section className="leadPianoRoll" aria-labelledby="lead-piano-roll-title">
      <h3 id="lead-piano-roll-title">Lead piano roll</h3>
      <p id="lead-piano-roll-help" className="supportingCopy">
        Drag an existing Lead note to change its pitch and start tick together. Movement is in
        integer ticks without beat or bar snapping. Use the paired fields in Lead note correction
        for keyboard editing.
      </p>
      <p role="status">
        {resizeProposal
          ? `Proposed duration ${resizeProposal.durationTicks} ticks; end tick ${(notes.find((note) => note.id === resizeProposal.noteId)?.startTick ?? 0) + resizeProposal.durationTicks}. Not yet applied.`
          : "Use the right-edge handle to resize; use Absolute duration ticks and Apply Lead duration for keyboard editing."}
      </p>
      <div className="leadPianoRollViewport">
        <div className="leadPianoRollCanvas">
          <div className="leadPianoRollBars" aria-hidden="true">
            <span>Pitch</span>
            <div>
              {bars.map((bar) => (
                <span key={bar}>Bar {bar}</span>
              ))}
            </div>
          </div>
          <div className="leadPianoRollBody">
            <ul className="leadPianoRollPitchAxis" aria-label="MIDI pitch rows">
              {pitches.map((pitch) => (
                <li key={pitch} aria-label={`MIDI ${pitch}`}>
                  {pitch}
                </li>
              ))}
            </ul>
            <fieldset
              ref={plotRef}
              className="leadPianoRollPlot"
              aria-describedby="lead-piano-roll-help"
              data-testid="lead-piano-roll-plot"
            >
              <legend className="leadPianoRollVisuallyHidden">Lead notes across eight bars</legend>
              <div className="leadPianoRollGrid" aria-hidden="true">
                {pitches.map((pitch) => (
                  <span key={pitch} className="leadPianoRollPitchLine" />
                ))}
                {barLines.map((bar) => (
                  <span
                    key={bar}
                    className="leadPianoRollBarLine"
                    style={{ left: `${(bar / 8) * 100}%` }}
                  />
                ))}
              </div>
              {notes.map((note, index) => {
                const displayedPitch = proposal?.noteId === note.id ? proposal.pitch : note.pitch;
                const displayedStartTick =
                  proposal?.noteId === note.id ? proposal.startTick : note.startTick;
                return (
                  <Fragment key={note.id}>
                    <button
                      type="button"
                      className="leadPianoRollNote"
                      aria-label={`Lead note ${index + 1}, MIDI pitch ${displayedPitch}, start tick ${displayedStartTick}, duration ${note.durationTicks} ticks`}
                      aria-pressed={selectedNoteId === note.id}
                      data-note-id={note.id}
                      data-pitch={displayedPitch}
                      data-start-tick={displayedStartTick}
                      data-duration-ticks={note.durationTicks}
                      data-transient-proposal={proposal?.noteId === note.id ? "true" : undefined}
                      style={{
                        left: `${(displayedStartTick / sectionEndTick) * 100}%`,
                        width: `${(note.durationTicks / sectionEndTick) * 100}%`,
                        top: `${((MIDI_MAX - displayedPitch) / PITCH_ROW_COUNT) * 100}%`,
                        height: `${100 / PITCH_ROW_COUNT}%`,
                      }}
                      disabled={disabled}
                      onPointerDown={(event) => beginGesture(note, event)}
                      onPointerMove={moveGesture}
                      onPointerUp={endGesture}
                      onPointerCancel={cancelGesture}
                      onLostPointerCapture={cancelGesture}
                      onClick={(event) => {
                        if (event.detail === 0) onSelectNote(note.id);
                      }}
                    />
                    <button
                      type="button"
                      className="leadPianoRollResize"
                      disabled={disabled}
                      aria-label={`Resize duration: Lead ${index + 1}, MIDI ${note.pitch}, start ${note.startTick} ticks`}
                      data-resize-note-id={note.id}
                      style={{
                        left: `${((note.startTick + note.durationTicks) / sectionEndTick) * 100}%`,
                        top: `${((MIDI_MAX - note.pitch) / PITCH_ROW_COUNT) * 100}%`,
                        height: `${100 / PITCH_ROW_COUNT}%`,
                      }}
                      onPointerDown={(event) => beginResize(note, event)}
                      onPointerMove={(event) => resizeAt(event, false)}
                      onPointerUp={(event) => resizeAt(event, true)}
                      onPointerCancel={cancelResize}
                      onLostPointerCapture={cancelResize}
                      onKeyDown={(event) => {
                        if (event.key === "Escape") cancelResize();
                      }}
                    />
                  </Fragment>
                );
              })}
            </fieldset>
          </div>
        </div>
      </div>
    </section>
  );
}
