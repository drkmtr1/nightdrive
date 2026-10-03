import process from "node:process";
import {
  type CompleteSectionRequestV1,
  type CompleteSectionResultV1,
  verifyCompleteSectionV1,
} from "../composition/complete-section";
import { generateCompleteSectionV1 } from "../generators/complete-section";

/** Internal Node application entry point; no HTTP or browser-generation API. */
export async function generateCompleteSectionForAuditionV1(
  request: CompleteSectionRequestV1,
): Promise<CompleteSectionResultV1> {
  if (process.versions.node !== "24.21.0") {
    throw new Error("Complete-section audition generation requires Node 24.21.0.");
  }
  const generated = await generateCompleteSectionV1(request);
  // Validate the actual returned value before it crosses the application
  // boundary. No component output or partial result escapes on failure.
  return verifyCompleteSectionV1(generated);
}
