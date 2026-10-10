import { Buffer } from "node:buffer";
import process from "node:process";
import {
  serializeCompleteSectionV1,
  verifyCompleteSectionV1,
} from "../composition/complete-section";
import { type EditorHistoryV1, verifyEditorHistoryV1 } from "../editor/editor-history";
import {
  snapshotVariationInputV1,
  verifyVariationSourceAdmissionV1,
} from "./variation-source-node";

export class VariationHistoryValueError extends RangeError {
  readonly code = "INVALID_VARIATION_LINEAGE";
  constructor(readonly field: string) {
    super(`Variation history is invalid at ${field}.`);
    this.name = "VariationHistoryValueError";
  }
}

/** Prerequisite only: freshly admits source, then verifies its full editor history.
 * Returned snapshots are data, never transferable admission authority.
 * No variation/creation-parent proof or combined-state identity is claimed. */
export async function verifyVariationEditorHistoryForNodeV1(
  source: unknown,
  sourceRequest: unknown,
  history: unknown,
) {
  if (process.versions.node !== "24.21.0") {
    throw new Error("Variation editor history verification requires Node 24.21.0.");
  }
  // The global descriptor phase precedes every await and all semantic checks.
  const supplied = snapshotVariationInputV1(source, "source");
  const request = snapshotVariationInputV1(sourceRequest, "sourceRequest");
  const saved = snapshotVariationInputV1(history, "history");
  const admitted = await verifyVariationSourceAdmissionV1(supplied, request);
  if (
    typeof saved !== "object" ||
    saved === null ||
    Array.isArray(saved) ||
    JSON.stringify(Object.keys(saved)) !== '["source","revisions","cursor"]'
  ) {
    throw new VariationHistoryValueError("history");
  }
  const record = saved as EditorHistoryV1;
  const retained = verifyCompleteSectionV1(record.source);
  if (
    !Buffer.from(serializeCompleteSectionV1(retained), "utf8").equals(
      Buffer.from(serializeCompleteSectionV1(admitted.source), "utf8"),
    )
  ) {
    throw new VariationHistoryValueError("history.source");
  }
  // Existing verifier proves root and all children, even beyond the active cursor.
  const verifiedHistory = verifyEditorHistoryV1(record);
  return Object.freeze({
    source: admitted.source,
    sourceRequest: admitted.sourceRequest,
    history: verifiedHistory,
  });
}
