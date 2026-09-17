import type { ArpEvent } from "../music-domain/arpeggiator";
import type { HarmonyProgressionRealization } from "../music-domain/harmony";
import { createDurationTicks, createTick, V1_TICKS_PER_BAR } from "../music-domain/musical-time";
import {
  createMidiIr,
  expandMidiSourceNote,
  MIDI_CHANNEL_BY_COMPONENT,
  MIDI_COMPONENT_IDS,
  MIDI_IR_PPQ,
  MIDI_IR_SCHEMA,
  MIDI_IR_SECTION_END_TICK,
  type MidiIr,
  type MidiNoteOffEvent,
  type MidiNoteOnEvent,
} from "../midi";

type NoteEvent = MidiNoteOnEvent | MidiNoteOffEvent;

// The MIDI IR validates this order; stable sort retains source order for equal keys.
function orderNoteEvents(events: NoteEvent[]): NoteEvent[] {
  return events.sort(
    (left, right) =>
      left.tick - right.tick ||
      (left.type === "note-off" ? 0 : 1) - (right.type === "note-off" ? 0 : 1) ||
      left.pitch - right.pitch,
  );
}

export function assembleStage7ArpeggiatorMidiIr(
  progression: HarmonyProgressionRealization,
  arpEvents: readonly ArpEvent[],
): MidiIr {
  const chordEvents: NoteEvent[] = [];
  let slotStartTick = 0;
  for (const slot of progression.slots) {
    const durationTicks = createDurationTicks(slot.bars * V1_TICKS_PER_BAR);
    for (const pitch of slot.voicing.midiPitches) {
      chordEvents.push(
        ...expandMidiSourceNote({
          component: MIDI_COMPONENT_IDS.chords,
          channel: MIDI_CHANNEL_BY_COMPONENT.chords,
          startTick: createTick(slotStartTick),
          durationTicks,
          pitch,
          velocity: 100,
        }),
      );
    }
    slotStartTick += durationTicks;
  }

  const expandedArpEvents: NoteEvent[] = [];
  for (const event of arpEvents) {
    expandedArpEvents.push(
      ...expandMidiSourceNote({
        component: MIDI_COMPONENT_IDS.arp,
        channel: MIDI_CHANNEL_BY_COMPONENT.arp,
        startTick: event.startTick,
        durationTicks: event.durationTicks,
        pitch: event.pitch,
        velocity: 100,
      }),
    );
  }

  const endOfTrack = { type: "end-of-track", tick: MIDI_IR_SECTION_END_TICK } as const;
  return createMidiIr({
    schema: MIDI_IR_SCHEMA,
    ppq: MIDI_IR_PPQ,
    sectionEndTick: MIDI_IR_SECTION_END_TICK,
    tracks: [
      {
        component: MIDI_COMPONENT_IDS.conductor,
        events: [
          { type: "track-name", tick: 0, name: "Conductor" },
          { type: "time-signature", tick: 0, numerator: 4, denominator: 4 },
          { type: "tempo", tick: 0, microsecondsPerQuarter: 500_000 },
          endOfTrack,
        ],
      },
      {
        component: MIDI_COMPONENT_IDS.chords,
        channel: MIDI_CHANNEL_BY_COMPONENT.chords,
        events: [
          { type: "track-name", tick: 0, name: "Chords" },
          ...orderNoteEvents(chordEvents),
          endOfTrack,
        ],
      },
      {
        component: MIDI_COMPONENT_IDS.arp,
        channel: MIDI_CHANNEL_BY_COMPONENT.arp,
        events: [
          { type: "track-name", tick: 0, name: "Arp" },
          ...orderNoteEvents(expandedArpEvents),
          endOfTrack,
        ],
      },
    ],
  });
}
