import { describe, expect, it } from "vitest";

import { digestStage7CanonicalUtf8 } from "./stage7-digest";

const KNOWN_ANSWER_VECTORS = Object.freeze([
  {
    input: "",
    digest: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
  },
  {
    input: "abc",
    digest: "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
  },
  {
    input: '{"schema":"nightdrive.stage7-arpeggiator-aggregate.v1"}',
    digest: "7c91055e7399e7bad551a38d7bbaee7ea460e218f4c730e91ee08a888d0f550c",
  },
  {
    input: "I ❤️ Nightdrive",
    digest: "c8fdac360bde479f68a14a8262070fe08060759564bdf1f2ded64d0e25e1246b",
  },
  {
    input: "x",
    digest: "2d711642b726b04401627ca9fbac32f5c8530fb1903cc4db02258717921a4881",
  },
  {
    input: "x\n",
    digest: "73cb3858a687a8494ca3323053016282f3dad39d42cf62ca4e79dda2aac7d9ac",
  },
] as const);

describe("digestStage7CanonicalUtf8", () => {
  it.each(KNOWN_ANSWER_VECTORS)("hashes the exact UTF-8 bytes of %j", ({ input, digest }) => {
    expect(digestStage7CanonicalUtf8(input)).toBe(digest);
  });

  it("is deterministic and returns an unprefixed lowercase SHA-256 digest", () => {
    const input = '{"schema":"nightdrive.stage7-arpeggiator-aggregate.v1"}';
    const first = digestStage7CanonicalUtf8(input);

    expect(digestStage7CanonicalUtf8(input)).toBe(first);
    expect(first).toHaveLength(64);
    expect(first).toMatch(/^[0-9a-f]{64}$/u);
    expect(first).not.toContain("sha256:");
    expect(first).not.toMatch(/\s$/u);
  });

  it("does not trim or normalize an embedded newline", () => {
    expect(digestStage7CanonicalUtf8("x")).toBe(KNOWN_ANSWER_VECTORS[4].digest);
    expect(digestStage7CanonicalUtf8("x\n")).toBe(KNOWN_ANSWER_VECTORS[5].digest);
    expect(digestStage7CanonicalUtf8("x")).not.toBe(digestStage7CanonicalUtf8("x\n"));
  });
});
