"use server";

import type { CompleteSectionRequestV1 } from "../composition/complete-section";
import { generateCompleteSectionPreviewForAuditionV1 } from "../web/complete-section-preview-node";

// Browser arguments remain untrusted. The integrated Node operation performs
// complete request/result validation; no browser validation is authoritative.
export async function generateSectionAction(request: CompleteSectionRequestV1) {
  return generateCompleteSectionPreviewForAuditionV1(request);
}
