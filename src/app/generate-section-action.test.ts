// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";
import * as preview from "../web/complete-section-preview-node";
import { generateSectionAction } from "./generate-section-action";

afterEach(() => vi.restoreAllMocks());

describe("Generate application server function", () => {
  it("delegates exactly once with the original argument and returns only existing preview data", async () => {
    const argument = { sentinel: "request" };
    const result = { sentinel: "preview" };
    const delegate = vi
      .spyOn(preview, "generateCompleteSectionPreviewForAuditionV1")
      .mockResolvedValueOnce(result as never);
    expect(await generateSectionAction(argument as never)).toBe(result);
    expect(delegate).toHaveBeenCalledTimes(1);
    expect(delegate.mock.calls[0]?.[0]).toBe(argument);
  });
  it("does not rely on browser validation for malformed arguments", async () => {
    await expect(generateSectionAction({ schema: "invalid" } as never)).rejects.toMatchObject({
      code: "INVALID_COMPLETE_SECTION_REQUEST",
      field: "request",
    });
  });
  it("rejects caller hooks without executing them through the actual Node validator", async () => {
    const getter = vi.fn();
    const argument = Object.defineProperty({}, "schema", { get: getter, enumerable: true });
    await expect(generateSectionAction(argument as never)).rejects.toBeDefined();
    expect(getter).not.toHaveBeenCalled();
  });
  it("propagates delegated failures without retry or partial data", async () => {
    const failure = new Error("private diagnostic");
    const delegate = vi
      .spyOn(preview, "generateCompleteSectionPreviewForAuditionV1")
      .mockRejectedValueOnce(failure);
    await expect(generateSectionAction({} as never)).rejects.toBe(failure);
    expect(delegate).toHaveBeenCalledTimes(1);
  });
});
