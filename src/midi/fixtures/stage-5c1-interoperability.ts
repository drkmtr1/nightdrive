import {
  MIDI_CHANNEL_BY_COMPONENT,
  MIDI_COMPONENT_IDS,
  MIDI_IR_PPQ,
  MIDI_IR_SCHEMA,
  MIDI_IR_SECTION_END_TICK,
} from "../index";

const BAR = 3_840;
const TWO_BARS = BAR * 2;
const END = MIDI_IR_SECTION_END_TICK;
const endOfTrack = { type: "end-of-track", tick: END } as const;

type MidiEventInput = Record<string, unknown>;

function componentTrack(
  component: "chords" | "bass" | "arp" | "lead",
  events: readonly MidiEventInput[],
) {
  return {
    component,
    channel: MIDI_CHANNEL_BY_COMPONENT[component],
    events: [
      { type: "track-name", tick: 0, name: component[0].toUpperCase() + component.slice(1) },
      ...events,
      endOfTrack,
    ],
  };
}

function chord(start: number, end: number, pitches: readonly number[]): MidiEventInput[] {
  return [
    ...pitches.map((pitch) => ({ type: "note-on", tick: start, channel: 0, pitch, velocity: 100 })),
    ...pitches.map((pitch) => ({
      type: "note-off",
      tick: end,
      channel: 0,
      pitch,
      releaseVelocity: 0,
    })),
  ];
}

function singleNotes(
  component: "bass" | "arp" | "lead",
  values: readonly (readonly [number, number, number, number])[],
): MidiEventInput[] {
  const channel = MIDI_CHANNEL_BY_COMPONENT[component];
  return values.flatMap(([start, end, pitch, velocity]) => [
    { type: "note-on", tick: start, channel, pitch, velocity },
    { type: "note-off", tick: end, channel, pitch, releaseVelocity: 0 },
  ]);
}

const conductor = {
  component: MIDI_COMPONENT_IDS.conductor,
  events: [
    { type: "track-name", tick: 0, name: "Conductor" },
    { type: "time-signature", tick: 0, numerator: 4, denominator: 4 },
    { type: "tempo", tick: 0, microsecondsPerQuarter: 500_000 },
    endOfTrack,
  ],
};

const chordEvents = [
  ...chord(0, TWO_BARS, [60, 64, 67]),
  ...chord(TWO_BARS, TWO_BARS * 2, [57, 60, 64]),
  ...chord(TWO_BARS * 2, TWO_BARS * 3, [53, 57, 60]),
  ...chord(TWO_BARS * 3, END, [55, 59, 62]),
];

const bassEvents = singleNotes("bass", [
  [0, BAR, 36, 100],
  [BAR, BAR * 2, 33, 100],
  [BAR * 2, BAR * 3, 29, 100],
  [BAR * 3, BAR * 4, 31, 100],
  [BAR * 4, BAR * 5, 36, 100],
  [BAR * 5, BAR * 6, 33, 100],
  [BAR * 6, BAR * 7, 29, 100],
  [BAR * 7, END, 31, 100],
]);

const arpPattern = [72, 76, 79, 76, 72, 76, 79, 76] as const;
const arpEvents = Array.from({ length: 8 }, (_, barIndex) =>
  arpPattern.map((pitch, subdivision) => {
    const start = barIndex * BAR + subdivision * (BAR / 8);
    return [start, start + BAR / 8, pitch, 80] as const;
  }),
).flat();

const leadEvents = singleNotes("lead", [
  [0, 1_920, 84, 110],
  [BAR, BAR * 2, 86, 100],
  [BAR * 3, BAR * 3 + 2_880, 88, 96],
  [BAR * 5, BAR * 6 + 1_920, 91, 112],
  [BAR * 6 + 1_920, END, 88, 104],
]);

export const STAGE_5C1_FIXTURE_IR = {
  schema: MIDI_IR_SCHEMA,
  ppq: MIDI_IR_PPQ,
  sectionEndTick: END,
  tracks: [
    conductor,
    componentTrack("chords", chordEvents),
    componentTrack("bass", bassEvents),
    componentTrack("arp", singleNotes("arp", arpEvents)),
    componentTrack("lead", leadEvents),
  ],
} as const;
