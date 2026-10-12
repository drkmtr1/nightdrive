"use server";

import {
  createOriginalVariationApplicationForNodeV1,
  createRetainedArpeggiatorVariationApplicationForNodeV1,
  editRetainedVariationApplicationForNodeV1,
  projectRetainedVariationApplicationForNodeV1,
  redoRetainedVariationApplicationForNodeV1,
  selectRetainedVariationApplicationForNodeV1,
  undoRetainedVariationApplicationForNodeV1,
} from "../web/variation-application-node";

// Browser values are proposals only. Each action delegates once; the pinned
// Node boundary freshly proves source, full history/ancestry and ownership.
// No admission claim, partial application, defaults, retries or metadata here.
export async function createOriginalVariationApplicationAction(
  source: unknown,
  sourceRequest: unknown,
  history: unknown,
) {
  return createOriginalVariationApplicationForNodeV1(source, sourceRequest, history);
}

export async function projectRetainedVariationApplicationAction(value: unknown) {
  return projectRetainedVariationApplicationForNodeV1(value);
}

export async function createArpeggiatorVariationAction(
  value: unknown,
  expectedSelectedSequence: unknown,
  expectedEditor: unknown,
  request: unknown,
) {
  return createRetainedArpeggiatorVariationApplicationForNodeV1(
    value,
    expectedSelectedSequence,
    expectedEditor,
    request,
  );
}

export async function selectRetainedVariationAction(
  value: unknown,
  expectedSelectedSequence: unknown,
  expectedState: unknown,
  expectedEditor: unknown,
  selectedSequence: unknown,
) {
  return selectRetainedVariationApplicationForNodeV1(
    value,
    expectedSelectedSequence,
    expectedState,
    expectedEditor,
    selectedSequence,
  );
}

export async function editRetainedVariationAction(
  value: unknown,
  expectedSelectedSequence: unknown,
  expectedState: unknown,
  expectedEditor: unknown,
  command: unknown,
) {
  return editRetainedVariationApplicationForNodeV1(
    value,
    expectedSelectedSequence,
    expectedState,
    expectedEditor,
    command,
  );
}

export async function undoRetainedVariationAction(
  value: unknown,
  expectedSelectedSequence: unknown,
  expectedState: unknown,
  expectedEditor: unknown,
) {
  return undoRetainedVariationApplicationForNodeV1(
    value,
    expectedSelectedSequence,
    expectedState,
    expectedEditor,
  );
}

export async function redoRetainedVariationAction(
  value: unknown,
  expectedSelectedSequence: unknown,
  expectedState: unknown,
  expectedEditor: unknown,
) {
  return redoRetainedVariationApplicationForNodeV1(
    value,
    expectedSelectedSequence,
    expectedState,
    expectedEditor,
  );
}
