const MIDI_DOWNLOAD_MIME_TYPE = "audio/midi";
const FALLBACK_MIDI_FILENAME = "nightdrive-section.mid";

export interface MidiDownloadOptions {
  readonly bytes: Uint8Array;
  readonly filename?: unknown;
}

/**
 * Normalize a caller-provided logical basename to a deterministic safe `.mid` filename.
 * Filename handling is deliberately separate from MIDI semantics.
 */
export function sanitizeMidiFilename(value: unknown): string {
  if (typeof value !== "string") return FALLBACK_MIDI_FILENAME;

  let basename = value.trim();
  if (basename.length === 0) return FALLBACK_MIDI_FILENAME;

  basename = basename.replace(/[\\/]+/g, "-");
  basename = Array.from(basename)
    .filter((character) => {
      const codePoint = character.codePointAt(0) ?? 0;
      return !(codePoint <= 0x1f || (codePoint >= 0x7f && codePoint <= 0x9f));
    })
    .join("");
  basename = basename.replace(/[<>:"|?*]/g, "");
  basename = basename.trim();
  basename = basename.replace(/(?:\.mid)+$/iu, "");
  basename = basename.replace(/\.+$/u, "").trim();

  if (basename.length === 0 || /^\.*$/u.test(basename) || !/[^\s.-]/u.test(basename)) {
    return FALLBACK_MIDI_FILENAME;
  }

  return `${basename}.mid`;
}

/**
 * Trigger a browser download for already-serialized Nightdrive MIDI bytes.
 * The adapter owns browser delivery mechanics only; it does not validate or alter MIDI semantics.
 */
export function downloadMidiBytes({ bytes, filename }: MidiDownloadOptions): void {
  if (!(bytes instanceof Uint8Array)) {
    throw new TypeError("MIDI download bytes must be a Uint8Array.");
  }

  const blob = new Blob([bytes.slice()], { type: MIDI_DOWNLOAD_MIME_TYPE });
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  const safeFilename = sanitizeMidiFilename(filename);

  anchor.href = objectUrl;
  anchor.download = safeFilename;
  anchor.setAttribute("download", safeFilename);
  anchor.hidden = true;

  try {
    document.body.appendChild(anchor);
    anchor.click();
  } finally {
    anchor.remove();
    URL.revokeObjectURL(objectUrl);
  }
}

export { FALLBACK_MIDI_FILENAME, MIDI_DOWNLOAD_MIME_TYPE };
