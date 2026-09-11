import { writeMidi, type MidiData, type MidiEvent } from "midi-file";

import { createMidiIr, type MidiIrEvent, type MidiIrTrack } from "../index";

/**
 * Serialize a validated Nightdrive MIDI IR to Standard MIDI File Format 1.
 *
 * The returned bytes are environment-neutral and the third-party MIDI object
 * model is deliberately kept inside this adapter module.
 */
export function serializeStandardMidiV1(value: unknown): Uint8Array {
  const ir = createMidiIr(value);
  const data: MidiData = {
    header: {
      format: 1,
      numTracks: ir.tracks.length,
      ticksPerBeat: 960,
    },
    tracks: ir.tracks.map(serializeTrack),
  };

  return Uint8Array.from(
    writeMidi(data, {
      running: false,
      useByte9ForNoteOff: false,
    }),
  );
}

function serializeTrack(track: MidiIrTrack): MidiEvent[] {
  let previousTick = 0;
  return track.events.map((event) => {
    const deltaTime = event.tick - previousTick;
    previousTick = event.tick;
    return serializeEvent(event, deltaTime);
  });
}

function serializeEvent(event: MidiIrEvent, deltaTime: number): MidiEvent {
  switch (event.type) {
    case "track-name":
      return { type: "trackName", deltaTime, text: event.name, meta: true };
    case "time-signature":
      return {
        type: "timeSignature",
        deltaTime,
        numerator: 4,
        denominator: 4,
        metronome: 24,
        thirtyseconds: 8,
        meta: true,
      };
    case "tempo":
      return {
        type: "setTempo",
        deltaTime,
        microsecondsPerBeat: event.microsecondsPerQuarter,
        meta: true,
      };
    case "note-on":
      return {
        type: "noteOn",
        deltaTime,
        channel: event.channel,
        noteNumber: event.pitch,
        velocity: event.velocity,
      };
    case "note-off":
      return {
        type: "noteOff",
        deltaTime,
        channel: event.channel,
        noteNumber: event.pitch,
        velocity: 0,
      };
    case "end-of-track":
      return { type: "endOfTrack", deltaTime, meta: true };
  }
}
