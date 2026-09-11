import { writeMidi } from "midi-file";
import MidiWriter from "midi-writer-js";

const PPQ = 960;
const END = 30720;
const fixture = {
  conductor: [
    { tick: 0, kind: "trackName", text: "Conductor" },
    { tick: 0, kind: "timeSignature", numerator: 4, denominator: 2, metronome: 24, thirtyseconds: 8 },
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
  return Uint8Array.from(writeMidi({
    header: { format: 1, numTracks: 2, ticksPerBeat: PPQ },
    tracks: [
      toDelta([...fixture.conductor, { tick: END, kind: "endOfTrack", meta: true }]),
      toDelta([...fixture.chords, { tick: END, kind: "endOfTrack", meta: true }]),
    ],
  }, { running: false, useByte9ForNoteOff: false }));
}

function writeMidiWriter() {
  const conductor = new MidiWriter.Track();
  conductor.addTrackName("Conductor");
  conductor.addEvent(new MidiWriter.TimeSignatureEvent({
    numerator: 4,
    denominator: 4,
    metronome: 24,
    thirtyseconds: 8,
  }));
  conductor.addEvent(new MidiWriter.TempoEvent({ bpm: 120 }));
  const chords = new MidiWriter.Track();
  chords.addTrackName("Chords");
  chords.addEvent(new MidiWriter.NoteOnEvent({ channel: 1, pitch: 60, velocity: 100, tick: 0 }));
  chords.addEvent(new MidiWriter.NoteOnEvent({ channel: 1, pitch: 64, velocity: 100, tick: 0 }));
  chords.addEvent(new MidiWriter.NoteOnEvent({ channel: 1, pitch: 67, velocity: 100, tick: 0 }));
  chords.addEvent(new MidiWriter.NoteOffEvent({ channel: 1, pitch: 60, velocity: 0, duration: "T960", tick: 960 }));
  chords.addEvent(new MidiWriter.NoteOnEvent({ channel: 1, pitch: 60, velocity: 90, tick: 960 }));
  chords.addEvent(new MidiWriter.NoteOffEvent({ channel: 1, pitch: 60, velocity: 0, duration: "T28800", tick: END }));
  chords.addEvent(new MidiWriter.NoteOffEvent({ channel: 1, pitch: 64, velocity: 0, duration: "T30720", tick: END }));
  chords.addEvent(new MidiWriter.NoteOffEvent({ channel: 1, pitch: 67, velocity: 0, duration: "T30720", tick: END }));
  return new MidiWriter.Writer([conductor, chords], { ticksPerBeat: PPQ }).buildFile();
}

function readVlq(bytes, index) {
  let value = 0;
  let count = 0;
  while (true) {
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
    const length = view.getUint32(offset + 4);
    const end = offset + 8 + length;
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
        cursor = size.next + size.value;
        events.push({ tick: absolute, status: `ff${type.toString(16).padStart(2, "0")}` });
        if (type === 0x2f) break;
      } else if ((status & 0xf0) === 0x80 || (status & 0xf0) === 0x90) {
        const pitch = bytes[cursor++];
        const velocity = bytes[cursor++];
        events.push({ tick: absolute, status: status & 0xf0, channel: status & 0x0f, pitch, velocity });
      } else {
        const size = (status & 0xe0) === 0xc0 ? 1 : 2;
        cursor += size;
      }
      if (status >= 0x80 && status < 0xf0) running = status;
    }
    trackReports.push({ length, events, eotCount: events.filter((event) => event.status === "ff2f").length, eotTicks: events.filter((event) => event.status === "ff2f").map((event) => event.tick) });
    offset = end;
  }
  return { format, tracks, division, trackReports, bytes: [...bytes] };
}

function run(name, writer) {
  try {
    const first = Uint8Array.from(writer());
    const second = Uint8Array.from(writer());
    return { name, ok: true, byteStable: Buffer.from(first).equals(Buffer.from(second)), inspection: inspect(first) };
  } catch (error) {
    return { name, ok: false, error: String(error) };
  }
}

console.log(JSON.stringify({ fixture, results: [run("midi-file", writeMidiFile), run("midi-writer-js", writeMidiWriter)] }, null, 2));
