import { writeMidi } from "midi-file";
import MidiWriter from "midi-writer-js";

const PPQ = 960;
const END = 30720;
const fixture = {
  conductor: [
    { tick: 0, kind: "trackName", text: "Conductor" },
    {
      tick: 0,
      kind: "timeSignature",
      numerator: 4,
      denominator: 2,
      metronome: 24,
      thirtyseconds: 8,
    },
    { tick: 0, kind: "setTempo", microsecondsPerBeat: 500000 },
  ],
  chords: [
    { tick: 0, kind: "trackName", text: "Chords" },
    { tick: 0, kind: "noteOn", channel: 0, noteNumber: 60, velocity: 100 },
    { tick: 0, kind: "noteOn", channel: 0, noteNumber: 64, velocity: 100 },
    { tick: 0, kind: "noteOn", channel: 0, noteNumber: 67, velocity: 100 },
    { tick: 960, kind: "noteOff", channel: 0, noteNumber: 60, velocity: 0 },
    { tick: 960, kind: "noteOn", channel: 0, noteNumber: 60, velocity: 90 },
    { tick: 30720, kind: "noteOff", channel: 0, noteNumber: 60, velocity: 0 },
    { tick: 30720, kind: "noteOff", channel: 0, noteNumber: 64, velocity: 0 },
    { tick: 30720, kind: "noteOff", channel: 0, noteNumber: 67, velocity: 0 },
  ],
};

function toDelta(events) {
  let previous = 0;
  return events.map((event) => {
    const result = { ...event, type: event.kind, deltaTime: event.tick - previous };
    delete result.tick;
    delete result.kind;
    previous = event.tick;
    return result;
  });
}

function writeMidiFile() {
  return Uint8Array.from(
    writeMidi(
      {
        header: { format: 1, numTracks: 2, ticksPerBeat: PPQ },
        tracks: [
          toDelta([...fixture.conductor, { tick: END, kind: "endOfTrack", meta: true }]),
          toDelta([...fixture.chords, { tick: END, kind: "endOfTrack", meta: true }]),
        ],
      },
      { running: false, useByte9ForNoteOff: false },
    ),
  );
}

function writeMidiWriter() {
  const conductor = new MidiWriter.Track();
  conductor.addTrackName("Conductor");
  conductor.setTimeSignature(4, 4);
  conductor.setTempo(120);
  const chords = new MidiWriter.Track();
  chords.addTrackName("Chords");
  // Documented NoteEvent uses startTick/tick, 1-based channels, and velocity 1..100.
  chords.addEvent(
    new MidiWriter.NoteEvent({
      pitch: [60, 64, 67],
      duration: "T960",
      channel: 1,
      velocity: 79,
      startTick: 0,
    }),
  );
  chords.addEvent(
    new MidiWriter.NoteEvent({
      pitch: [60],
      duration: "T29760",
      channel: 1,
      velocity: 71,
      startTick: 960,
    }),
  );
  return new MidiWriter.Writer([conductor, chords], { ticksPerBeat: PPQ }).buildFile();
}

function readVlq(bytes, index) {
  let value = 0;
  let count = 0;
  while (true) {
    if (index >= bytes.length) throw new Error("truncated VLQ");
    const byte = bytes[index++];
    value = (value << 7) | (byte & 0x7f);
    count += 1;
    if ((byte & 0x80) === 0) return { value, next: index, count };
    if (count > 4) throw new Error("invalid VLQ");
  }
}

function inspect(bytes) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const text = (offset, length) => String.fromCharCode(...bytes.slice(offset, offset + length));
  if (text(0, 4) !== "MThd") throw new Error("missing MThd");
  const format = view.getUint16(8);
  const tracks = view.getUint16(10);
  const division = view.getUint16(12);
  let offset = 14;
  const trackReports = [];
  for (let trackIndex = 0; trackIndex < tracks; trackIndex += 1) {
    if (text(offset, 4) !== "MTrk") throw new Error("missing MTrk");
    if (offset + 8 > bytes.length) throw new Error("truncated track header");
    const length = view.getUint32(offset + 4);
    const end = offset + 8 + length;
    if (end > bytes.length) throw new Error("truncated track payload");
    let cursor = offset + 8;
    let absolute = 0;
    let running = 0;
    const events = [];
    while (cursor < end) {
      const delta = readVlq(bytes, cursor);
      cursor = delta.next;
      absolute += delta.value;
      let status = bytes[cursor];
      if (status < 0x80) status = running;
      else cursor += 1;
      if (status === 0xff) {
        const type = bytes[cursor++];
        const size = readVlq(bytes, cursor);
        if (size.next + size.value > end) throw new Error("truncated meta payload");
        const payload = bytes.slice(size.next, size.next + size.value);
        cursor = size.next + size.value;
        const event = { tick: absolute, status: `ff${type.toString(16).padStart(2, "0")}` };
        if (type === 0x03) event.text = new TextDecoder().decode(payload);
        if (type === 0x58) {
          if (payload.length !== 4) throw new Error("invalid time-signature payload");
          event.numerator = payload[0];
          event.denominatorExponent = payload[1];
          event.denominator = 2 ** payload[1];
        }
        if (type === 0x51) {
          if (payload.length !== 3) throw new Error("invalid tempo payload");
          event.microsecondsPerBeat = (payload[0] << 16) | (payload[1] << 8) | payload[2];
        }
        events.push(event);
        if (type === 0x2f) break;
      } else if ((status & 0xf0) === 0x80 || (status & 0xf0) === 0x90) {
        const pitch = bytes[cursor++];
        const velocity = bytes[cursor++];
        events.push({
          tick: absolute,
          status: status & 0xf0,
          channel: status & 0x0f,
          pitch,
          velocity,
        });
      } else {
        const size = (status & 0xe0) === 0xc0 ? 1 : 2;
        cursor += size;
      }
      if (status >= 0x80 && status < 0xf0) running = status;
    }
    trackReports.push({
      length,
      events,
      eotCount: events.filter((event) => event.status === "ff2f").length,
      eotTicks: events.filter((event) => event.status === "ff2f").map((event) => event.tick),
    });
    offset = end;
  }
  return { format, tracks, division, trackReports, bytes: [...bytes] };
}

function run(name, writer) {
  try {
    const first = Uint8Array.from(writer());
    const second = Uint8Array.from(writer());
    return {
      name,
      ok: true,
      byteStable: Buffer.from(first).equals(Buffer.from(second)),
      inspection: inspect(first),
    };
  } catch (error) {
    return { name, ok: false, error: String(error) };
  }
}

console.log(
  JSON.stringify(
    { fixture, results: [run("midi-file", writeMidiFile), run("midi-writer-js", writeMidiWriter)] },
    null,
    2,
  ),
);
