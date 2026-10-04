import { digestStage7CanonicalUtf8 } from "../generators/adapters/stage7-digest";
import {
  COMPLETE_SECTION_RESULT_SCHEMA_V1,
  type CompleteSectionResultV1,
  verifyCompleteSectionV1,
} from "./complete-section";

export const EDITOR_REVISION_SCHEMA_V1 = "nightdrive.editor-revision.v1" as const;
export const EDITOR_REVISION_HASH_INPUT_SCHEMA_V1 =
  "nightdrive.editor-revision-hash-input.v1" as const;
export const EDITOR_NOTE_ID_INPUT_SCHEMA_V1 = "nightdrive.editor-note-id-input.v1" as const;
export const EDITOR_COMMAND_SCHEMA_V1 = "nightdrive.editor-note-command.v1" as const;
export const SET_NOTE_PITCH_COMMAND_V1 = "set-note-pitch" as const;
const ROLES = ["harmony", "bass", "arpeggiator", "lead"] as const;
type EditorRole = (typeof ROLES)[number];
const HASH = /^[0-9a-f]{64}$/u;
const NOTE_ID = /^note-[0-9a-f]{64}$/u;
export type EditorNoteV1 = Readonly<{
  id: string;
  pitch: number;
  startTick: number;
  durationTicks: number;
  velocity: number;
}>;
export type EditorTrackV1 = Readonly<{ role: EditorRole; notes: readonly EditorNoteV1[] }>;
export type EditorRevisionIdentityV1 = Readonly<{
  schema: typeof EDITOR_REVISION_SCHEMA_V1;
  revisionHash: string;
}>;
export type SetNotePitchCommandV1 = Readonly<{
  schema: typeof EDITOR_COMMAND_SCHEMA_V1;
  type: typeof SET_NOTE_PITCH_COMMAND_V1;
  noteId: string;
  expectedPitch: number;
  pitch: number;
}>;
export type EditorRevisionV1 = Readonly<{
  schema: typeof EDITOR_REVISION_SCHEMA_V1;
  source: Readonly<{ schema: typeof COMPLETE_SECTION_RESULT_SCHEMA_V1; resultHash: string }>;
  section: Readonly<{
    ppq: 960;
    barCount: 8;
    timeSignature: Readonly<{ numerator: 4; denominator: 4 }>;
    tempo: Readonly<{ microsecondsPerQuarter: number }>;
    endTick: 30720;
  }>;
  tracks: readonly EditorTrackV1[];
  parent: EditorRevisionIdentityV1 | null;
  command: SetNotePitchCommandV1 | null;
  revisionHash: string;
}>;
export type EditorErrorCode =
  | "UNSUPPORTED_EDITOR_REVISION_SCHEMA"
  | "INVALID_EDITOR_REVISION"
  | "INVALID_EDITOR_SOURCE_BINDING"
  | "INVALID_EDITOR_LINEAGE"
  | "EDITOR_REVISION_HASH_MISMATCH"
  | "INVALID_EDITOR_PARENT"
  | "STALE_EDITOR_PARENT"
  | "INVALID_EDITOR_COMMAND"
  | "UNSUPPORTED_EDITOR_COMMAND_SCHEMA"
  | "UNSUPPORTED_EDITOR_COMMAND_TYPE"
  | "EDITOR_NOTE_NOT_FOUND"
  | "EDITOR_NOTE_NOT_EDITABLE"
  | "STALE_EDITOR_NOTE_VALUE"
  | "EDITOR_LEAD_PITCH_OUT_OF_RANGE"
  | "NO_OP_EDITOR_COMMAND";
export class EditorValueError extends RangeError {
  constructor(
    readonly code: EditorErrorCode,
    readonly field: string,
    message: string,
  ) {
    super(message);
    this.name = "EditorValueError";
  }
}
type Data = Record<PropertyKey, unknown>;
const fail = (code: EditorErrorCode, field: string, message: string): never => {
  throw new EditorValueError(code, field, message);
};
function deepFreeze<T>(value: T): T {
  if (Array.isArray(value)) value.forEach(deepFreeze);
  else if (value && typeof value === "object") Object.values(value as object).forEach(deepFreeze);
  return Object.freeze(value);
}
function dataRecord(
  value: unknown,
  path: string,
  fields: readonly string[],
  code: EditorErrorCode = "INVALID_EDITOR_REVISION",
): Data {
  if (
    typeof value !== "object" ||
    value === null ||
    Array.isArray(value) ||
    Object.getPrototypeOf(value) !== Object.prototype
  )
    fail(code, path, "Must be an ordinary record.");
  const names = Object.getOwnPropertyNames(value);
  if (
    Object.getOwnPropertySymbols(value).length ||
    names.length !== fields.length ||
    names.some((name, i) => name !== fields[i])
  )
    fail(code, path, "Invalid fields or field order.");
  for (const name of names) {
    const d = Object.getOwnPropertyDescriptor(value, name);
    if (!d || !("value" in d) || typeof d.value === "function")
      fail(code, `${path}.${name}`, "Must be ordinary data.");
  }
  return value as Data;
}
function read(value: Data, key: string): unknown {
  const d = Object.getOwnPropertyDescriptor(value, key);
  return d && "value" in d ? d.value : undefined;
}
function dense(
  value: unknown,
  path: string,
  code: EditorErrorCode = "INVALID_EDITOR_REVISION",
): readonly unknown[] {
  if (
    !Array.isArray(value) ||
    Object.getPrototypeOf(value) !== Array.prototype ||
    Object.getOwnPropertySymbols(value).length
  )
    fail(code, path, "Must be a dense array.");
  const arrayValue = value as readonly unknown[];
  const names = Object.getOwnPropertyNames(arrayValue);
  if (names.length !== arrayValue.length + 1 || names.at(-1) !== "length")
    fail(code, path, "Invalid array keys.");
  for (let i = 0; i < arrayValue.length; i += 1) {
    if (names[i] !== String(i)) fail(code, path, "Array must be dense.");
    const d = Object.getOwnPropertyDescriptor(arrayValue, i);
    if (!d || !("value" in d)) fail(code, `${path}[${i}]`, "Array values must be data.");
  }
  return arrayValue;
}
function int(
  value: unknown,
  path: string,
  code: EditorErrorCode = "INVALID_EDITOR_REVISION",
): number {
  if (typeof value !== "number" || !Number.isSafeInteger(value))
    fail(code, path, "Must be a safe integer.");
  return Object.is(value, -0) ? 0 : (value as number);
}
function hash(
  value: unknown,
  path: string,
  code: EditorErrorCode = "INVALID_EDITOR_REVISION",
): string {
  if (typeof value !== "string" || !HASH.test(value))
    fail(code, path, "Must be a lowercase SHA-256 digest.");
  return value as string;
}
export function editorNoteIdV1(resultHash: string, role: EditorRole, ordinal: number): string {
  return `note-${digestStage7CanonicalUtf8(JSON.stringify({ schema: EDITOR_NOTE_ID_INPUT_SCHEMA_V1, source: { schema: COMPLETE_SECTION_RESULT_SCHEMA_V1, resultHash }, role, ordinal }))}`;
}
function note(
  resultHash: string,
  role: EditorRole,
  ordinal: number,
  event: { pitch: number; startTick: number; durationTicks: number },
): EditorNoteV1 {
  return deepFreeze({
    id: editorNoteIdV1(resultHash, role, ordinal),
    pitch: event.pitch,
    startTick: event.startTick,
    durationTicks: event.durationTicks,
    velocity: 100,
  });
}
function project(source: CompleteSectionResultV1): readonly EditorTrackV1[] {
  let start = 0;
  const h: EditorNoteV1[] = [];
  for (const slot of source.components.harmony.slots) {
    for (const pitch of slot.voicing.midiPitches)
      h.push(
        note(source.resultHash, "harmony", h.length, {
          pitch,
          startTick: start,
          durationTicks: slot.bars * 3840,
        }),
      );
    start += slot.bars * 3840;
  }
  const events = (
    role: Exclude<EditorRole, "harmony">,
    xs: readonly { pitch: number; startTick: number; durationTicks: number }[],
  ) => xs.map((x, i) => note(source.resultHash, role, i, x));
  return deepFreeze([
    deepFreeze({ role: "harmony" as const, notes: deepFreeze(h) }),
    deepFreeze({
      role: "bass" as const,
      notes: deepFreeze(events("bass", source.components.bass)),
    }),
    deepFreeze({
      role: "arpeggiator" as const,
      notes: deepFreeze(events("arpeggiator", source.components.arpeggiator)),
    }),
    deepFreeze({
      role: "lead" as const,
      notes: deepFreeze(events("lead", source.components.lead.events)),
    }),
  ]);
}
function revisionHash(base: Omit<EditorRevisionV1, "revisionHash">): string {
  return digestStage7CanonicalUtf8(
    JSON.stringify({ schema: EDITOR_REVISION_HASH_INPUT_SCHEMA_V1, revision: base }),
  );
}
function build(base: Omit<EditorRevisionV1, "revisionHash">): EditorRevisionV1 {
  return deepFreeze({ ...base, revisionHash: revisionHash(base) });
}
export function importCompleteSectionAsEditorRootV1(
  source: CompleteSectionResultV1,
): EditorRevisionV1 {
  const v = verifyCompleteSectionV1(source);
  return build({
    schema: EDITOR_REVISION_SCHEMA_V1,
    source: deepFreeze({ schema: COMPLETE_SECTION_RESULT_SCHEMA_V1, resultHash: v.resultHash }),
    section: deepFreeze({
      ppq: 960,
      barCount: 8,
      timeSignature: deepFreeze({ numerator: 4, denominator: 4 }),
      tempo: deepFreeze({ microsecondsPerQuarter: v.section.tempo.microsecondsPerQuarter }),
      endTick: 30720,
    }),
    tracks: project(v),
    parent: null,
    command: null,
  });
}
export function validateSetNotePitchCommandV1(value: unknown): SetNotePitchCommandV1 {
  const c = dataRecord(
    value,
    "command",
    ["schema", "type", "noteId", "expectedPitch", "pitch"],
    "INVALID_EDITOR_COMMAND",
  );
  if (read(c, "schema") !== EDITOR_COMMAND_SCHEMA_V1)
    fail("UNSUPPORTED_EDITOR_COMMAND_SCHEMA", "command.schema", "Unsupported command schema.");
  if (read(c, "type") !== SET_NOTE_PITCH_COMMAND_V1)
    fail("UNSUPPORTED_EDITOR_COMMAND_TYPE", "command.type", "Unsupported command type.");
  const noteId = read(c, "noteId");
  if (typeof noteId !== "string" || !NOTE_ID.test(noteId))
    fail("INVALID_EDITOR_COMMAND", "command.noteId", "Invalid note ID.");
  const expectedPitch = int(
    read(c, "expectedPitch"),
    "command.expectedPitch",
    "INVALID_EDITOR_COMMAND",
  );
  const pitch = int(read(c, "pitch"), "command.pitch", "INVALID_EDITOR_COMMAND");
  if (expectedPitch < 0 || expectedPitch > 127 || pitch < 0 || pitch > 127)
    fail("INVALID_EDITOR_COMMAND", "command.pitch", "Pitches must be 0..127.");
  return deepFreeze({
    schema: EDITOR_COMMAND_SCHEMA_V1,
    type: SET_NOTE_PITCH_COMMAND_V1,
    noteId: noteId as string,
    expectedPitch,
    pitch,
  });
}
function validateRevisionShapeV1(value: unknown): EditorRevisionV1 {
  const r = dataRecord(value, "revision", [
    "schema",
    "source",
    "section",
    "tracks",
    "parent",
    "command",
    "revisionHash",
  ]);
  if (read(r, "schema") !== EDITOR_REVISION_SCHEMA_V1)
    fail("UNSUPPORTED_EDITOR_REVISION_SCHEMA", "revision.schema", "Unsupported revision schema.");
  const source = dataRecord(
    read(r, "source"),
    "revision.source",
    ["schema", "resultHash"],
    "INVALID_EDITOR_SOURCE_BINDING",
  );
  if (read(source, "schema") !== COMPLETE_SECTION_RESULT_SCHEMA_V1)
    fail("INVALID_EDITOR_SOURCE_BINDING", "revision.source.schema", "Wrong source schema.");
  const resultHash = hash(
    read(source, "resultHash"),
    "revision.source.resultHash",
    "INVALID_EDITOR_SOURCE_BINDING",
  );
  const section = dataRecord(read(r, "section"), "revision.section", [
    "ppq",
    "barCount",
    "timeSignature",
    "tempo",
    "endTick",
  ]);
  const ts = dataRecord(read(section, "timeSignature"), "revision.section.timeSignature", [
    "numerator",
    "denominator",
  ]);
  const tempo = dataRecord(read(section, "tempo"), "revision.section.tempo", [
    "microsecondsPerQuarter",
  ]);
  if (
    int(read(section, "ppq"), "revision.section.ppq") !== 960 ||
    int(read(section, "barCount"), "revision.section.barCount") !== 8 ||
    int(read(ts, "numerator"), "revision.section.timeSignature.numerator") !== 4 ||
    int(read(ts, "denominator"), "revision.section.timeSignature.denominator") !== 4 ||
    int(read(section, "endTick"), "revision.section.endTick") !== 30720 ||
    int(read(tempo, "microsecondsPerQuarter"), "revision.section.tempo.microsecondsPerQuarter") < 1
  )
    fail("INVALID_EDITOR_REVISION", "revision.section", "Invalid section.");
  const tracks = dense(read(r, "tracks"), "revision.tracks");
  if (tracks.length !== 4)
    fail("INVALID_EDITOR_REVISION", "revision.tracks", "Must have four tracks.");
  const validatedTracks = ROLES.map((role, i) => {
    const track = dataRecord(tracks[i], `revision.tracks[${i}]`, ["role", "notes"]);
    if (read(track, "role") !== role)
      fail("INVALID_EDITOR_REVISION", `revision.tracks[${i}].role`, "Track order is fixed.");
    const notes = dense(read(track, "notes"), `revision.tracks[${i}].notes`);
    return deepFreeze({
      role,
      notes: deepFreeze(
        notes.map((raw, j) => {
          const n = dataRecord(raw, `revision.tracks[${i}].notes[${j}]`, [
            "id",
            "pitch",
            "startTick",
            "durationTicks",
            "velocity",
          ]);
          const id = read(n, "id");
          if (id !== editorNoteIdV1(resultHash, role, j))
            fail(
              "INVALID_EDITOR_REVISION",
              `revision.tracks[${i}].notes[${j}].id`,
              "Invalid deterministic note ID.",
            );
          const pitch = int(read(n, "pitch"), `revision.tracks[${i}].notes[${j}].pitch`);
          const startTick = int(
            read(n, "startTick"),
            `revision.tracks[${i}].notes[${j}].startTick`,
          );
          const durationTicks = int(
            read(n, "durationTicks"),
            `revision.tracks[${i}].notes[${j}].durationTicks`,
          );
          const velocity = int(read(n, "velocity"), `revision.tracks[${i}].notes[${j}].velocity`);
          if (
            pitch < 0 ||
            pitch > 127 ||
            startTick < 0 ||
            startTick >= 30720 ||
            durationTicks < 1 ||
            startTick + durationTicks > 30720 ||
            velocity < 1 ||
            velocity > 127 ||
            (role === "lead" && (pitch < 60 || pitch > 84))
          )
            fail("INVALID_EDITOR_REVISION", `revision.tracks[${i}].notes[${j}]`, `Invalid note.`);
          return deepFreeze({ id: id as string, pitch, startTick, durationTicks, velocity });
        }),
      ),
    });
  });
  const rawParent = read(r, "parent");
  const rawCommand = read(r, "command");
  if ((rawParent === null) !== (rawCommand === null))
    fail("INVALID_EDITOR_LINEAGE", "revision.parent", "Parent and command must agree.");
  let parent: EditorRevisionIdentityV1 | null = null;
  let command: SetNotePitchCommandV1 | null = null;
  if (rawParent !== null) {
    const p = dataRecord(
      rawParent,
      "revision.parent",
      ["schema", "revisionHash"],
      "INVALID_EDITOR_LINEAGE",
    );
    if (read(p, "schema") !== EDITOR_REVISION_SCHEMA_V1)
      fail("INVALID_EDITOR_LINEAGE", "revision.parent.schema", "Invalid parent schema.");
    parent = deepFreeze({
      schema: EDITOR_REVISION_SCHEMA_V1,
      revisionHash: hash(
        read(p, "revisionHash"),
        "revision.parent.revisionHash",
        "INVALID_EDITOR_LINEAGE",
      ),
    });
    command = validateSetNotePitchCommandV1(rawCommand);
  }
  const base = {
    schema: EDITOR_REVISION_SCHEMA_V1,
    source: deepFreeze({ schema: COMPLETE_SECTION_RESULT_SCHEMA_V1, resultHash }),
    section: deepFreeze({
      ppq: 960 as const,
      barCount: 8 as const,
      timeSignature: deepFreeze({ numerator: 4 as const, denominator: 4 as const }),
      tempo: deepFreeze({
        microsecondsPerQuarter: int(
          read(tempo, "microsecondsPerQuarter"),
          "revision.section.tempo.microsecondsPerQuarter",
        ),
      }),
      endTick: 30720 as const,
    }),
    tracks: deepFreeze(validatedTracks),
    parent,
    command,
  };
  const revisionHashValue = hash(read(r, "revisionHash"), "revision.revisionHash");
  if (revisionHashValue !== revisionHash(base))
    fail("EDITOR_REVISION_HASH_MISMATCH", "revision.revisionHash", "Hash mismatch.");
  return deepFreeze({ ...base, revisionHash: revisionHashValue });
}
function transitionVerifiedRevisionV1(
  parent: EditorRevisionV1,
  command: SetNotePitchCommandV1,
): EditorRevisionV1 {
  const p = parent;
  const c = validateSetNotePitchCommandV1(command);
  const lead = p.tracks[3];
  const index = lead.notes.findIndex((n) => n.id === c.noteId);
  if (index < 0) {
    const other = p.tracks.slice(0, 3).some((t) => t.notes.some((n) => n.id === c.noteId));
    fail(
      other ? "EDITOR_NOTE_NOT_EDITABLE" : "EDITOR_NOTE_NOT_FOUND",
      "command.noteId",
      "Target is not editable.",
    );
  }
  const old = lead.notes[index] as EditorNoteV1;
  if (old.pitch !== c.expectedPitch)
    fail("STALE_EDITOR_NOTE_VALUE", "command.expectedPitch", "Stale pitch.");
  if (c.pitch < 60 || c.pitch > 84)
    fail("EDITOR_LEAD_PITCH_OUT_OF_RANGE", "command.pitch", "Lead pitch must be 60..84.");
  if (c.pitch === old.pitch) fail("NO_OP_EDITOR_COMMAND", "command.pitch", "No-op command.");
  const tracks = deepFreeze(
    p.tracks.map((t) =>
      t.role !== "lead"
        ? t
        : deepFreeze({
            role: "lead" as const,
            notes: deepFreeze(
              t.notes.map((n, i) => (i === index ? deepFreeze({ ...n, pitch: c.pitch }) : n)),
            ),
          }),
    ),
  );
  return build({
    schema: EDITOR_REVISION_SCHEMA_V1,
    source: p.source,
    section: p.section,
    tracks,
    parent: deepFreeze({ schema: EDITOR_REVISION_SCHEMA_V1, revisionHash: p.revisionHash }),
    command: c,
  });
}

/** Verifies source, root projection and every transition; shape/hash alone is never authority. */
export function verifyEditorRevisionV1(
  value: unknown,
  source: CompleteSectionResultV1,
  ancestry: readonly EditorRevisionV1[],
): EditorRevisionV1 {
  const verifiedSource = verifyCompleteSectionV1(source);
  const ancestors = dense(ancestry, "revision.parent", "INVALID_EDITOR_LINEAGE");
  const chain = [...ancestors, value].map(validateRevisionShapeV1);
  const root = chain[0] as EditorRevisionV1;
  const expectedRoot = importCompleteSectionAsEditorRootV1(verifiedSource);
  if (root.source.resultHash !== verifiedSource.resultHash)
    fail(
      "INVALID_EDITOR_SOURCE_BINDING",
      "revision.source",
      "Source identity does not match retained source.",
    );
  if (root.parent !== null || root.command !== null)
    fail("INVALID_EDITOR_LINEAGE", "revision.parent", "Complete root ancestry is required.");
  if (JSON.stringify(root) !== JSON.stringify(expectedRoot))
    fail(
      "INVALID_EDITOR_SOURCE_BINDING",
      "revision.source",
      "Root does not match retained source projection.",
    );
  const identities = new Set([root.revisionHash]);
  let parent = root;
  for (const child of chain.slice(1)) {
    if (child.source.resultHash !== verifiedSource.resultHash)
      fail("INVALID_EDITOR_SOURCE_BINDING", "revision.source", "Ancestry source mismatch.");
    if (
      identities.has(child.revisionHash) ||
      !child.parent ||
      !child.command ||
      child.parent.revisionHash !== parent.revisionHash
    )
      fail(
        "INVALID_EDITOR_LINEAGE",
        "revision.parent",
        "Missing, repeated or mismatched ancestry.",
      );
    const expected = transitionVerifiedRevisionV1(
      parent,
      validateSetNotePitchCommandV1(child.command),
    );
    if (JSON.stringify(child) !== JSON.stringify(expected))
      fail(
        "INVALID_EDITOR_LINEAGE",
        "revision.parent",
        "Child is not its recorded parent/command transition.",
      );
    identities.add(child.revisionHash);
    parent = child;
  }
  return parent;
}

export function serializeEditorRevisionV1(
  revision: EditorRevisionV1,
  source: CompleteSectionResultV1,
  ancestry: readonly EditorRevisionV1[],
): string {
  return JSON.stringify(verifyEditorRevisionV1(revision, source, ancestry));
}

export function createChildEditorRevisionV1(
  parent: EditorRevisionV1,
  command: SetNotePitchCommandV1,
  source: CompleteSectionResultV1,
  ancestry: readonly EditorRevisionV1[],
): EditorRevisionV1 {
  return transitionVerifiedRevisionV1(verifyEditorRevisionV1(parent, source, ancestry), command);
}
