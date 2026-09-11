// @vitest-environment node

import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { serializeStandardMidiV1 } from "../adapter";
import {
  createMidiIr,
  MIDI_CHANNEL_BY_COMPONENT,
  MIDI_IR_PPQ,
  MIDI_IR_SECTION_END_TICK,
} from "../index";
import { parseReferenceSmf } from "../reference-parser.test-support";
import { STAGE_5C1_FIXTURE_IR } from "./stage-5c1-interoperability";

const fixtureBytes = Uint8Array.from(
  readFileSync(new URL("./stage-5c1-interoperability.mid", import.meta.url)),
);
const fixtureSha256 = "230d6c7eb67eaa512b61f381d6255276f8b575367ee9bc4c634e1f94eb53ce2d";

function sha256(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}

function semanticNotes(
  events: ReturnType<typeof parseReferenceSmf>["tracks"][number]["events"],
): readonly (readonly [number, number, number, number])[] {
  const active = new Map<string, readonly [number, number, number]>();
  const notes: [number, number, number, number][] = [];
  for (const event of events) {
    if (event.kind !== "channel" || event.status === undefined) continue;
    const pitch = event.data[0];
    const key = `${event.status & 0x0f}:${pitch}`;
    if ((event.status & 0xf0) === 0x90 && event.data[1] > 0) {
      active.set(key, [event.absoluteTick, pitch, event.data[1]]);
    } else if ((event.status & 0xf0) === 0x80) {
      const start = active.get(key);
      if (!start) throw new Error(`unmatched Note Off for ${key}`);
      notes.push([start[0], event.absoluteTick, start[1], start[2]]);
      active.delete(key);
    }
  }
  if (active.size > 0) throw new Error("unterminated note in fixture");
  return notes;
}

describe("Stage 5C1 FL Studio interoperability fixture", () => {
  it("is a committed byte-stable production serialization", () => {
    const generated = serializeStandardMidiV1(STAGE_5C1_FIXTURE_IR);
    expect(generated).toEqual(fixtureBytes);
    expect(sha256(generated)).toBe(fixtureSha256);
    expect(generated).toEqual(serializeStandardMidiV1(STAGE_5C1_FIXTURE_IR));
    expect(createMidiIr(STAGE_5C1_FIXTURE_IR).tracks).toHaveLength(5);
  });

  it("matches the independent parser's Format 1, metadata, tracks, and channels", () => {
    const parsed = parseReferenceSmf(fixtureBytes);
    expect(parsed.format).toBe(1);
    expect(parsed.division).toBe(MIDI_IR_PPQ);
    expect(parsed.tracks.map((track) => track.name)).toEqual([
      "Conductor",
      "Chords",
      "Bass",
      "Arp",
      "Lead",
    ]);
    expect(parsed.tracks).toHaveLength(5);
    expect(parsed.tracks[0].events.find((event) => event.metaType === 0x58)?.data).toEqual([
      4, 2, 24, 8,
    ]);
    expect(parsed.tracks[0].events.find((event) => event.metaType === 0x51)?.data).toEqual([
      0x07, 0xa1, 0x20,
    ]);
    for (const [index, track] of parsed.tracks.entries()) {
      const component = ["conductor", "chords", "bass", "arp", "lead"][index];
      const eots = track.events.filter((event) => event.metaType === 0x2f);
      expect(eots).toHaveLength(1);
      expect(eots[0].absoluteTick).toBe(MIDI_IR_SECTION_END_TICK);
      expect(track.events.at(-1)?.metaType).toBe(0x2f);
      if (component !== "conductor") {
        const channel = MIDI_CHANNEL_BY_COMPONENT[component as "chords" | "bass" | "arp" | "lead"];
        for (const event of track.events.filter((candidate) => candidate.kind === "channel")) {
          expect((event.status ?? 0) & 0x0f).toBe(channel);
        }
      }
    }
  });

  it("preserves the expected chord, bass, arp, and lead semantics", () => {
    const parsed = parseReferenceSmf(fixtureBytes);
    expect(semanticNotes(parsed.tracks[1].events)).toEqual([
      [0, 7_680, 60, 100],
      [0, 7_680, 64, 100],
      [0, 7_680, 67, 100],
      [7_680, 15_360, 57, 100],
      [7_680, 15_360, 60, 100],
      [7_680, 15_360, 64, 100],
      [15_360, 23_040, 53, 100],
      [15_360, 23_040, 57, 100],
      [15_360, 23_040, 60, 100],
      [23_040, 30_720, 55, 100],
      [23_040, 30_720, 59, 100],
      [23_040, 30_720, 62, 100],
    ]);
    expect(semanticNotes(parsed.tracks[2].events)).toEqual([
      [0, 3_840, 36, 100],
      [3_840, 7_680, 33, 100],
      [7_680, 11_520, 29, 100],
      [11_520, 15_360, 31, 100],
      [15_360, 19_200, 36, 100],
      [19_200, 23_040, 33, 100],
      [23_040, 26_880, 29, 100],
      [26_880, 30_720, 31, 100],
    ]);
    const arp = semanticNotes(parsed.tracks[3].events);
    expect(arp).toHaveLength(64);
    expect(arp.slice(0, 8)).toEqual([
      [0, 480, 72, 80],
      [480, 960, 76, 80],
      [960, 1_440, 79, 80],
      [1_440, 1_920, 76, 80],
      [1_920, 2_400, 72, 80],
      [2_400, 2_880, 76, 80],
      [2_880, 3_360, 79, 80],
      [3_360, 3_840, 76, 80],
    ]);
    for (let barIndex = 1; barIndex < 8; barIndex += 1) {
      expect(arp.slice(barIndex * 8, barIndex * 8 + 8)).toEqual(
        [72, 76, 79, 76, 72, 76, 79, 76].map((pitch, subdivision) => [
          barIndex * 3_840 + subdivision * 480,
          barIndex * 3_840 + (subdivision + 1) * 480,
          pitch,
          80,
        ]),
      );
    }
    expect(semanticNotes(parsed.tracks[4].events)).toEqual([
      [0, 1_920, 84, 110],
      [3_840, 7_680, 86, 100],
      [11_520, 14_400, 88, 96],
      [19_200, 24_960, 91, 112],
      [24_960, 30_720, 88, 104],
    ]);
  });

  it("keeps explicit Note Off velocity zero and the terminal boundary", () => {
    const parsed = parseReferenceSmf(fixtureBytes);
    for (const track of parsed.tracks) {
      const channelEvents = track.events.filter((event) => event.kind === "channel");
      expect(
        channelEvents
          .filter((event) => (event.status ?? 0) >= 0x80 && (event.status ?? 0) < 0x90)
          .every((event) => event.data[1] === 0),
      ).toBe(true);
      expect(
        channelEvents.some(
          (event) =>
            (event.status ?? 0) >= 0x90 && (event.status ?? 0) < 0xa0 && event.data[1] === 0,
        ),
      ).toBe(false);
      expect(track.events.every((event) => event.absoluteTick <= MIDI_IR_SECTION_END_TICK)).toBe(
        true,
      );
    }
  });
});
