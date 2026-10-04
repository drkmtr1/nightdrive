import {
  type CompleteSectionResultV1,
  verifyCompleteSectionV1,
} from "../composition/complete-section";
import {
  createChildEditorRevisionV1,
  type EditorNoteCommand,
  type EditorRevisionIdentityV1,
  type EditorRevisionV1,
  EditorValueError,
  importCompleteSectionAsEditorRootV1,
  verifyEditorRevisionV1,
} from "../composition/editor-revision";

export type EditorHistoryV1 = Readonly<{
  source: CompleteSectionResultV1;
  revisions: readonly EditorRevisionV1[];
  cursor: number;
}>;

function freeze<T>(value: T): T {
  return Object.freeze(value);
}
function same(left: EditorRevisionIdentityV1, right: EditorRevisionIdentityV1): boolean {
  return left.schema === right.schema && left.revisionHash === right.revisionHash;
}
function selected(history: EditorHistoryV1): EditorRevisionV1 {
  const revision = history.revisions[history.cursor];
  if (!revision) throw new Error("Editor history cursor is invalid.");
  return revision;
}
function verifyHistory(history: EditorHistoryV1): EditorHistoryV1 {
  const source = verifyCompleteSectionV1(history.source);
  if (
    !Array.isArray(history.revisions) ||
    !Number.isSafeInteger(history.cursor) ||
    history.cursor < 0 ||
    history.cursor >= history.revisions.length
  )
    throw new EditorValueError("INVALID_EDITOR_REVISION", "history", "History is invalid.");
  const revisions = history.revisions.map((revision, index) =>
    verifyEditorRevisionV1(revision, source, history.revisions.slice(0, index)),
  );
  return freeze({ source, revisions: freeze(revisions), cursor: history.cursor });
}
export function createEditorHistoryV1(source: CompleteSectionResultV1): EditorHistoryV1 {
  const verified = verifyCompleteSectionV1(source);
  return freeze({
    source: verified,
    revisions: freeze([importCompleteSectionAsEditorRootV1(verified)]),
    cursor: 0,
  });
}
export function selectedEditorRevisionV1(history: EditorHistoryV1): EditorRevisionV1 {
  return selected(verifyHistory(history));
}
export function undoEditorHistoryV1(history: EditorHistoryV1): EditorHistoryV1 | null {
  const checked = verifyHistory(history);
  if (checked.cursor === 0) return null;
  return freeze({ ...checked, cursor: checked.cursor - 1 });
}
export function redoEditorHistoryV1(history: EditorHistoryV1): EditorHistoryV1 | null {
  const checked = verifyHistory(history);
  if (checked.cursor === checked.revisions.length - 1) return null;
  return freeze({ ...checked, cursor: checked.cursor + 1 });
}
export function applyEditorCommandV1(
  history: EditorHistoryV1,
  expectedParent: EditorRevisionIdentityV1,
  command: EditorNoteCommand,
): EditorHistoryV1 {
  const checked = verifyHistory(history);
  const parent = selected(checked);
  if (!expectedParent || expectedParent.schema !== parent.schema)
    throw new EditorValueError(
      "INVALID_EDITOR_PARENT",
      "expectedParent",
      "Expected parent is invalid.",
    );
  if (!same(expectedParent, { schema: parent.schema, revisionHash: parent.revisionHash }))
    throw new EditorValueError(
      "STALE_EDITOR_PARENT",
      "expectedParent.revisionHash",
      "Expected parent is stale.",
    );
  const child = createChildEditorRevisionV1(
    parent,
    command,
    checked.source,
    checked.revisions.slice(0, checked.cursor),
  );
  return freeze({
    source: checked.source,
    revisions: freeze([...checked.revisions.slice(0, checked.cursor + 1), child]),
    cursor: checked.cursor + 1,
  });
}
