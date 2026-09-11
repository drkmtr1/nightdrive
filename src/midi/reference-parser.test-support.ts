import { MIDI_IR_PPQ, MIDI_IR_SECTION_END_TICK } from "./index";

export type ReferenceEvent = {
  readonly absoluteTick: number;
  readonly deltaTime: number;
  readonly kind: "meta" | "channel";
  readonly metaType?: number;
  readonly status?: number;
  readonly data: readonly number[];
  readonly text?: string;
};

export type ReferenceTrack = {
  readonly name: string;
  readonly events: readonly ReferenceEvent[];
};

export type ReferenceFile = {
  readonly format: number;
  readonly division: number;
  readonly tracks: readonly ReferenceTrack[];
};

function parseFailure(message: string): never {
  throw new Error(`independent SMF reference parser: ${message}`);
}

function readUint16(bytes: Uint8Array, offset: number): number {
  if (offset + 2 > bytes.length) parseFailure("truncated uint16");
  return (bytes[offset] << 8) | bytes[offset + 1];
}

function readUint32(bytes: Uint8Array, offset: number): number {
  if (offset + 4 > bytes.length) parseFailure("truncated uint32");
  return (
    bytes[offset] * 0x1000000 +
    (bytes[offset + 1] << 16) +
    (bytes[offset + 2] << 8) +
    bytes[offset + 3]
  );
}

function readVlq(bytes: Uint8Array, offset: number, end: number): { value: number; next: number } {
  let value = 0;
  for (let count = 0; count < 4; count += 1) {
    if (offset >= end) parseFailure("truncated variable-length quantity");
    const byte = bytes[offset++];
    value = value * 128 + (byte & 0x7f);
    if ((byte & 0x80) === 0) return { value, next: offset };
  }
  parseFailure("variable-length quantity exceeds four bytes");
}

function textFromBytes(data: readonly number[]): string {
  return String.fromCharCode(...data);
}

/** Test-only independent reader for the bounded Nightdrive V1 SMF contract. */
export function parseReferenceSmf(bytes: Uint8Array): ReferenceFile {
  if (bytes.length < 14) parseFailure("truncated header");
  if (textFromBytes(Array.from(bytes.slice(0, 4))) !== "MThd") {
    parseFailure("missing MThd header");
  }
  if (readUint32(bytes, 4) !== 6) parseFailure("header length is not six");
  const format = readUint16(bytes, 8);
  const trackCount = readUint16(bytes, 10);
  const division = readUint16(bytes, 12);
  if (format !== 1) parseFailure("V1 requires Format 1");
  if (division !== MIDI_IR_PPQ) parseFailure("V1 requires 960 PPQ");
  if (trackCount === 0) parseFailure("file must contain a track");

  let offset = 14;
  const tracks: ReferenceTrack[] = [];
  for (let trackIndex = 0; trackIndex < trackCount; trackIndex += 1) {
    if (offset + 8 > bytes.length) parseFailure("truncated track chunk header");
    if (textFromBytes(Array.from(bytes.slice(offset, offset + 4))) !== "MTrk") {
      parseFailure("missing MTrk chunk");
    }
    const length = readUint32(bytes, offset + 4);
    const trackStart = offset + 8;
    const trackEnd = trackStart + length;
    if (trackEnd > bytes.length) parseFailure("track chunk exceeds file boundary");
    offset = trackStart;
    let absoluteTick = 0;
    let eotCount = 0;
    const events: ReferenceEvent[] = [];
    while (offset < trackEnd) {
      const delta = readVlq(bytes, offset, trackEnd);
      offset = delta.next;
      absoluteTick += delta.value;
      if (offset >= trackEnd) parseFailure("missing event status");
      const status = bytes[offset++];
      if (status === 0xff) {
        if (offset >= trackEnd) parseFailure("truncated meta-event type");
        const metaType = bytes[offset++];
        const size = readVlq(bytes, offset, trackEnd);
        offset = size.next;
        if (offset + size.value > trackEnd) parseFailure("meta-event exceeds track boundary");
        const data = Array.from(bytes.slice(offset, offset + size.value));
        offset += size.value;
        events.push({
          absoluteTick,
          deltaTime: delta.value,
          kind: "meta",
          metaType,
          data,
          ...(metaType === 0x03 ? { text: textFromBytes(data) } : {}),
        });
        if (metaType === 0x2f) {
          if (size.value !== 0) parseFailure("End-of-Track must have zero length");
          eotCount += 1;
          if (absoluteTick !== MIDI_IR_SECTION_END_TICK) {
            parseFailure("End-of-Track is not at tick 30720");
          }
          if (offset !== trackEnd) parseFailure("event appears after End-of-Track");
        }
        continue;
      }
      if (status < 0x80 || status > 0xef) parseFailure("unsupported or implicit channel status");
      const dataLength = (status & 0xe0) === 0xc0 || (status & 0xe0) === 0xd0 ? 1 : 2;
      if (offset + dataLength > trackEnd) parseFailure("channel event exceeds track boundary");
      const data = Array.from(bytes.slice(offset, offset + dataLength));
      offset += dataLength;
      events.push({ absoluteTick, deltaTime: delta.value, kind: "channel", status, data });
    }
    if (offset !== trackEnd) parseFailure("track parser did not consume its chunk");
    if (eotCount !== 1) parseFailure("each track needs exactly one End-of-Track");
    const nameEvent = events.find((event) => event.metaType === 0x03);
    tracks.push({ name: nameEvent?.text ?? "", events });
    offset = trackEnd;
  }
  if (offset !== bytes.length) parseFailure("trailing bytes after declared tracks");
  return { format, division, tracks };
}
