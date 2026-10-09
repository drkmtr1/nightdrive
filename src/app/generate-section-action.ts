"use server";

import type { CompleteSectionRequestV1 } from "../composition/complete-section";
import type {
  AddNoteCommandV6,
  DeleteNoteCommandV4,
  EditorRevisionIdentityV1,
  SetNoteDurationCommandV3,
  SetNotePitchCommandV1,
  SetNotePositionCommandV5,
  SetNoteStartTickCommandV2,
  SetNoteVelocityCommandV7,
} from "../composition/editor-revision";
import { generateCompleteSectionForAuditionV1 } from "../web/complete-section-node";
import {
  createEditorApplicationV1,
  type EditorApplicationV1,
  editEditorApplicationAddNoteV1,
  editEditorApplicationDeleteNoteV1,
  editEditorApplicationDurationV1,
  editEditorApplicationPitchV1,
  editEditorApplicationPositionV1,
  editEditorApplicationStartTickV1,
  editEditorApplicationVelocityV1,
  redoEditorApplicationV1,
  undoEditorApplicationV1,
} from "../web/editor-application-node";

// Browser arguments remain untrusted. The integrated Node operation performs
// complete request/result validation; no browser validation is authoritative.
// The same verified result becomes the retained editor source and derived view.
export async function generateSectionAction(
  request: CompleteSectionRequestV1,
): Promise<EditorApplicationV1> {
  const source = await generateCompleteSectionForAuditionV1(request);
  return createEditorApplicationV1(source);
}

// This Server Action carries the v6 command unchanged to the pinned Node boundary.
export async function addLeadNoteAction(
  current: EditorApplicationV1,
  expectedParent: EditorRevisionIdentityV1,
  command: AddNoteCommandV6,
): Promise<EditorApplicationV1> {
  return editEditorApplicationAddNoteV1(current, expectedParent, command);
}

// These internal Server Actions carry validated plain data only. The Node
// application boundary re-verifies the retained source and complete history
// on every operation; browser-provided revision fields are not authority.
export async function setLeadPitchAction(
  current: EditorApplicationV1,
  expectedParent: EditorRevisionIdentityV1,
  command: SetNotePitchCommandV1,
): Promise<EditorApplicationV1> {
  return editEditorApplicationPitchV1(current, expectedParent, command);
}

export async function setLeadStartTickAction(
  current: EditorApplicationV1,
  expectedParent: EditorRevisionIdentityV1,
  command: SetNoteStartTickCommandV2,
): Promise<EditorApplicationV1> {
  return editEditorApplicationStartTickV1(current, expectedParent, command);
}

export async function setLeadPositionAction(
  current: EditorApplicationV1,
  expectedParent: EditorRevisionIdentityV1,
  command: SetNotePositionCommandV5,
): Promise<EditorApplicationV1> {
  return editEditorApplicationPositionV1(current, expectedParent, command);
}

export async function setLeadDurationAction(
  current: EditorApplicationV1,
  expectedParent: EditorRevisionIdentityV1,
  command: SetNoteDurationCommandV3,
): Promise<EditorApplicationV1> {
  return editEditorApplicationDurationV1(current, expectedParent, command);
}

export async function setLeadVelocityAction(
  current: EditorApplicationV1,
  expectedParent: EditorRevisionIdentityV1,
  command: SetNoteVelocityCommandV7,
): Promise<EditorApplicationV1> {
  return editEditorApplicationVelocityV1(current, expectedParent, command);
}

export async function deleteLeadNoteAction(
  current: EditorApplicationV1,
  expectedParent: EditorRevisionIdentityV1,
  command: DeleteNoteCommandV4,
): Promise<EditorApplicationV1> {
  return editEditorApplicationDeleteNoteV1(current, expectedParent, command);
}

export async function undoSectionEditAction(
  current: EditorApplicationV1,
): Promise<EditorApplicationV1 | null> {
  return undoEditorApplicationV1(current);
}

export async function redoSectionEditAction(
  current: EditorApplicationV1,
): Promise<EditorApplicationV1 | null> {
  return redoEditorApplicationV1(current);
}
