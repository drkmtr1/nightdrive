// @vitest-environment node

import process from "node:process";
import { afterEach, describe, expect, it, vi } from "vitest";
import * as completeSectionValue from "../composition/complete-section";
import {
  type CompleteSectionRequestV1,
  CompleteSectionValueError,
  serializeCompleteSectionV1,
} from "../composition/complete-section";
import * as completeSectionGenerator from "../generators/complete-section";
import { generateCompleteSectionForAuditionV1 } from "./complete-section-node";

function request(): CompleteSectionRequestV1 {
  return {
    schema: "nightdrive.complete-section-request.v1",
    engineVersion: "nightdrive.engine.complete-section.v1",
    generatorVersion: "nightdrive.generator.complete-section.v1",
    composition: {
      schema: "nightdrive.first-playable-composition-request.v1",
      engineVersion: "nightdrive.engine.first-playable-composition.v1",
      generatorVersion: "nightdrive.generator.first-playable-composition.v1",
      profile: { id: "dark-synthwave" },
      harmony: {
        templateId: "degree-0654-natural-minor-v1",
        templateVersion: "v1",
        key: {
          tonic: 0,
          scale: "natural-minor",
        } as CompleteSectionRequestV1["composition"]["harmony"]["key"],
      },
      section: {
        tempo: {
          microsecondsPerQuarter: 500000,
        } as CompleteSectionRequestV1["composition"]["section"]["tempo"],
      },
      intent: { energy: "medium", complexity: "medium" },
      rootSeed: 0,
      arpeggiator: {
        range: {
          minMidiPitch: 36,
          maxMidiPitch: 84,
        } as CompleteSectionRequestV1["composition"]["arpeggiator"]["range"],
        profile: { version: "nightdrive.genre-profile.arpeggiator.v2" },
        policy: { version: "nightdrive.arpeggiator-policy.v2" },
        seedDerivation: { version: "nightdrive.seed-derivation.component.v1" },
        prng: { version: "nightdrive.prng.mulberry32.v1" },
      },
    },
    motif: {
      schema: "nightdrive.motif-generation-request.v1",
      generatorVersion: "nightdrive.generator.motif.v1",
      profile: { version: "nightdrive.genre-profile.motif.v1" },
      policyVersion: "nightdrive.motif-policy.v1",
    },
  };
}

describe("Node complete-section application adapter", () => {
  const originalVersion = Object.getOwnPropertyDescriptor(process.versions, "node");
  afterEach(() => {
    vi.restoreAllMocks();
    if (originalVersion === undefined) throw new Error("Missing actual Node identity.");
    Object.defineProperty(process.versions, "node", originalVersion);
  });

  it("calls accepted generation once with the unchanged request and returns only verified output", async () => {
    const input = request();
    const before = structuredClone(input);
    const generate = vi.spyOn(completeSectionGenerator, "generateCompleteSectionV1");
    const verify = vi.spyOn(completeSectionValue, "verifyCompleteSectionV1");
    const result = await generateCompleteSectionForAuditionV1(input);
    expect(generate).toHaveBeenCalledTimes(1);
    expect(generate.mock.calls[0]?.[0]).toBe(input);
    expect(input).toEqual(before);
    const generated = await generate.mock.results[0]?.value;
    expect(verify).toHaveBeenCalledTimes(1);
    expect(verify.mock.calls[0]?.[0]).toBe(generated);
    expect(result).toBe(verify.mock.results[0]?.value);
    expect(result).not.toBe(generated);
    expect(result.componentHashes).toEqual(generated.componentHashes);
    expect(result.resultHash).toBe(
      "0eb122a36f7c90e6b58c4d3017d21a051a81ed54bee1b98d00a40e3adcc66fa1",
    );
  });

  it("preserves canonical replay and recursively immutable values for application consumers", async () => {
    const first = await generateCompleteSectionForAuditionV1(request());
    const second = await generateCompleteSectionForAuditionV1(request());
    expect(serializeCompleteSectionV1(first)).toBe(serializeCompleteSectionV1(second));
    const inspect = (value: unknown): void => {
      if (value === null || typeof value !== "object") return;
      expect(Object.isFrozen(value)).toBe(true);
      expect(Reflect.set(value, "unexpected", true)).toBe(false);
      for (const key of Reflect.ownKeys(value)) {
        const descriptor = Object.getOwnPropertyDescriptor(value, key);
        if (descriptor === undefined) throw new Error("Missing result data descriptor.");
        expect(Reflect.set(value, key, "mutation")).toBe(false);
        inspect(descriptor.value);
      }
    };
    inspect(first);
    expect(serializeCompleteSectionV1(first)).toBe(serializeCompleteSectionV1(second));
  });

  it("propagates accepted request failure without remapping it or retrying", async () => {
    const input = { ...request(), schema: "unsupported" };
    const generate = vi.spyOn(completeSectionGenerator, "generateCompleteSectionV1");
    const verify = vi.spyOn(completeSectionValue, "verifyCompleteSectionV1");
    await expect(generateCompleteSectionForAuditionV1(input as never)).rejects.toMatchObject({
      code: "UNSUPPORTED_COMPLETE_SECTION_SCHEMA",
      field: "schema",
    });
    expect(generate).toHaveBeenCalledTimes(1);
    expect(verify).not.toHaveBeenCalled();
  });

  it("propagates the exact delegated error and never resolves a partial result", async () => {
    const failure = new CompleteSectionValueError(
      "INVALID_COMPLETE_SECTION_REQUEST",
      "request",
      "delegated failure",
    );
    const generate = vi
      .spyOn(completeSectionGenerator, "generateCompleteSectionV1")
      .mockRejectedValueOnce(failure);
    const verify = vi.spyOn(completeSectionValue, "verifyCompleteSectionV1");
    const resolved = vi.fn();
    const operation = generateCompleteSectionForAuditionV1(request());
    void operation.then(resolved, () => undefined);
    await expect(operation).rejects.toBe(failure);
    expect(resolved).not.toHaveBeenCalled();
    expect(generate).toHaveBeenCalledTimes(1);
    expect(verify).not.toHaveBeenCalled();
  });

  it("rejects a forged generator result before delivering any application output", async () => {
    const valid = await completeSectionGenerator.generateCompleteSectionV1(request());
    const forged = { ...valid, resultHash: "0".repeat(64) };
    const generate = vi
      .spyOn(completeSectionGenerator, "generateCompleteSectionV1")
      .mockResolvedValueOnce(forged);
    const resolved = vi.fn();
    const operation = generateCompleteSectionForAuditionV1(request());
    void operation.then(resolved, () => undefined);
    await expect(operation).rejects.toMatchObject({
      code: "INVALID_COMPLETE_SECTION_RESULT",
      field: "resultHash",
    });
    expect(resolved).not.toHaveBeenCalled();
    expect(generate).toHaveBeenCalledTimes(1);
  });

  it.each(["22.17.1", "24.20.0", "25.0.0"])(
    "rejects Node %s before generation",
    async (version) => {
      Object.defineProperty(process.versions, "node", { value: version, configurable: true });
      const generate = vi.spyOn(completeSectionGenerator, "generateCompleteSectionV1");
      const verify = vi.spyOn(completeSectionValue, "verifyCompleteSectionV1");
      await expect(generateCompleteSectionForAuditionV1(request())).rejects.toThrow(
        "Complete-section audition generation requires Node 24.21.0.",
      );
      expect(generate).not.toHaveBeenCalled();
      expect(verify).not.toHaveBeenCalled();
    },
  );
});
