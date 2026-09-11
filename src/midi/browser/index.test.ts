import { readFileSync } from "node:fs";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  downloadMidiBytes,
  FALLBACK_MIDI_FILENAME,
  MIDI_DOWNLOAD_MIME_TYPE,
  sanitizeMidiFilename,
} from "./index";

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  document.body.replaceChildren();
});

function stubObjectUrls(): {
  createObjectURL: ReturnType<typeof vi.fn>;
  revokeObjectURL: ReturnType<typeof vi.fn>;
} {
  const createObjectURL = vi
    .fn<(blob: Blob) => string>()
    .mockReturnValueOnce("blob:nightdrive-1")
    .mockReturnValueOnce("blob:nightdrive-2");
  const revokeObjectURL = vi.fn<(url: string) => void>();
  vi.stubGlobal("URL", { createObjectURL, revokeObjectURL });
  return { createObjectURL, revokeObjectURL };
}

describe("MIDI browser delivery filename policy", () => {
  it("normalizes a logical basename and enforces one lowercase .mid extension", () => {
    expect(sanitizeMidiFilename("night drive")).toBe("night drive.mid");
    expect(sanitizeMidiFilename("night-drive.MID")).toBe("night-drive.mid");
    expect(sanitizeMidiFilename("night-drive.mid.mid")).toBe("night-drive.mid");
  });

  it("normalizes separators, controls, forbidden characters, and whitespace", () => {
    expect(sanitizeMidiFilename("  folder\\night/section\u0000<1>?  ")).toBe(
      "folder-night-section1.mid",
    );
    expect(sanitizeMidiFilename("  section  ")).toBe("section.mid");
  });

  it("uses a stable fallback for missing or invalid basenames", () => {
    for (const value of [undefined, null, 42, "", "   ", "..", ".mid", '<>:"|?*']) {
      expect(sanitizeMidiFilename(value)).toBe(FALLBACK_MIDI_FILENAME);
    }
    expect(sanitizeMidiFilename("section")).toBe(sanitizeMidiFilename("section"));
  });
});

describe("MIDI browser delivery adapter", () => {
  it("keeps browser delivery outside the semantic IR and serializer modules", () => {
    const semanticSource = readFileSync("src/midi/index.ts", "utf8");
    const serializerSource = readFileSync("src/midi/adapter/index.ts", "utf8");
    const browserSource = readFileSync("src/midi/browser/index.ts", "utf8");
    const browserImports = Array.from(
      browserSource.matchAll(/(?:from\s+|import\s*\(\s*)["']([^"']+)["']/g),
      (match) => match[1],
    );

    expect(semanticSource).not.toContain("./browser");
    expect(serializerSource).not.toContain("document");
    expect(serializerSource).not.toContain("createObjectURL");
    expect(browserImports.every((specifier) => specifier.startsWith("."))).toBe(true);
    expect(browserSource).not.toContain("./adapter");
    expect(browserSource).not.toContain("midi-file");
  });

  it("creates an exact MIDI Blob, configures and clicks one temporary anchor, then cleans up", async () => {
    const { createObjectURL, revokeObjectURL } = stubObjectUrls();
    const click = vi
      .spyOn(HTMLAnchorElement.prototype, "click")
      .mockImplementation(() => undefined);
    const lifecycle: string[] = [];
    click.mockImplementation(() => lifecycle.push("click"));
    revokeObjectURL.mockImplementation(() => lifecycle.push("revoke"));
    const bytes = Uint8Array.from([0x00, 0x90, 0x3c, 0x64, 0xff]);

    downloadMidiBytes({ bytes, filename: "  section.mid " });

    const blob = createObjectURL.mock.calls[0]?.[0] as Blob;
    expect(blob).toBeInstanceOf(Blob);
    expect(blob.type).toBe(MIDI_DOWNLOAD_MIME_TYPE);
    expect(new Uint8Array(await blob.arrayBuffer())).toEqual(bytes);
    expect(click).toHaveBeenCalledTimes(1);
    expect(lifecycle).toEqual(["click", "revoke"]);
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:nightdrive-1");
    expect(document.body.querySelectorAll("a")).toHaveLength(0);
  });

  it("sets the safe filename and object URL on the temporary anchor", () => {
    const { createObjectURL } = stubObjectUrls();
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => undefined);
    const appendChild = vi.spyOn(document.body, "appendChild");

    downloadMidiBytes({ bytes: Uint8Array.of(1, 2, 3), filename: "folder\\demo.mid" });

    const anchor = appendChild.mock.calls[0]?.[0] as HTMLAnchorElement;
    expect(anchor.download).toBe("folder-demo.mid");
    expect(anchor.getAttribute("download")).toBe("folder-demo.mid");
    expect(anchor.href).toBe("blob:nightdrive-1");
    expect(createObjectURL).toHaveBeenCalledTimes(1);
    expect(document.body.contains(anchor)).toBe(false);
  });

  it("preserves caller bytes and keeps repeated invocations independent", () => {
    const { createObjectURL, revokeObjectURL } = stubObjectUrls();
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => undefined);
    const bytes = Uint8Array.of(4, 5, 6);
    const original = bytes.slice();

    downloadMidiBytes({ bytes, filename: "one" });
    downloadMidiBytes({ bytes, filename: "two" });

    expect(bytes).toEqual(original);
    expect(createObjectURL).toHaveBeenCalledTimes(2);
    expect(revokeObjectURL).toHaveBeenNthCalledWith(1, "blob:nightdrive-1");
    expect(revokeObjectURL).toHaveBeenNthCalledWith(2, "blob:nightdrive-2");
    expect(document.body.querySelectorAll("a")).toHaveLength(0);
  });

  it("cleans up and revokes the URL when the browser click fails", () => {
    const { revokeObjectURL } = stubObjectUrls();
    const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {
      throw new Error("browser click failed");
    });
    const bytes = Uint8Array.of(7, 8, 9);

    expect(() => downloadMidiBytes({ bytes, filename: "failure" })).toThrow("browser click failed");
    expect(click).toHaveBeenCalledTimes(1);
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:nightdrive-1");
    expect(document.body.querySelectorAll("a")).toHaveLength(0);
    expect(bytes).toEqual(Uint8Array.of(7, 8, 9));
  });

  it("rejects non-Uint8Array input without creating browser state", () => {
    const { createObjectURL } = stubObjectUrls();

    expect(() =>
      downloadMidiBytes({ bytes: [1, 2, 3] as unknown as Uint8Array, filename: "invalid" }),
    ).toThrow(TypeError);
    expect(createObjectURL).not.toHaveBeenCalled();
  });
});
