// @vitest-environment node

import { describe, expect, it, vi } from "vitest";
import type { ArpEvent } from "../music-domain/arpeggiator";
import {
  getHarmonyTemplate,
  HARMONY_PROFILE_IDS,
  realizeHarmonyProgression,
} from "../music-domain/harmony";
import { createKey } from "../music-domain/key";
import { createDurationTicks, createTick } from "../music-domain/musical-time";
import { createMidiPitch, createPitchClass } from "../music-domain/pitch";
import {
  createMidiIr,
  MIDI_IR_ERROR_CODES,
  MidiIrValidationError,
  type MidiIrEvent,
  type MidiNoteOffEvent,
  type MidiNoteOnEvent,
} from "../midi";
import { assembleStage7ArpeggiatorMidiIr } from "./stage7-arpeggiator-midi-ir";

function progression() {
  return realizeHarmonyProgression(
    HARMONY_PROFILE_IDS.classicSynthwave,
    getHarmonyTemplate("degree-0344-major-v1"),
    createKey(createPitchClass(0), "major"),
  );
}

function arpEvents(): readonly ArpEvent[] {
  return Object.freeze(
    [
      [0, 480, 72],
      [480, 480, 72],
      [1_920, 240, 76],
      [30_240, 480, 79],
    ].map(([startTick, durationTicks, pitch]) =>
      Object.freeze({
        startTick: createTick(startTick),
        durationTicks: createDurationTicks(durationTicks),
        pitch: createMidiPitch(pitch),
      }),
    ),
  );
}

function noteEvents(events: readonly MidiIrEvent[]) {
  return events.filter((event) => event.type === "note-on" || event.type === "note-off");
}

describe("Stage 7 evaluation-only Harmony + Arp MIDI IR assembler", () => {
  it("constructs only the exact conductor, Chords, and Arp tracks", () => {
    const ir = assembleStage7ArpeggiatorMidiIr(progression(), arpEvents());
    expect(ir).toEqual(createMidiIr(ir));
    expect(ir).toMatchObject({ schema: "nightdrive.midi-ir.v1", ppq: 960, sectionEndTick: 30_720 });
    expect(ir.tracks.map((track) => track.component)).toEqual(["conductor", "chords", "arp"]);
    expect(ir.tracks[0].events).toEqual([
      { type: "track-name", tick: 0, name: "Conductor" },
      { type: "time-signature", tick: 0, numerator: 4, denominator: 4 },
      { type: "tempo", tick: 0, microsecondsPerQuarter: 500_000 },
      { type: "end-of-track", tick: 30_720 },
    ]);
    expect(ir.tracks[1].channel).toBe(0);
    expect(ir.tracks[2].channel).toBe(2);
    for (const track of ir.tracks) {
      expect(track.events.at(-1)).toEqual({ type: "end-of-track", tick: 30_720 });
      expect(track.events.filter((event) => event.type === "end-of-track")).toHaveLength(1);
      expect(track.events.map((event) => event.type)).not.toContain("program-change");
    }
  });

  it("maps every selected Harmony voicing across exact multi-bar slot spans", () => {
    const harmony = progression();
    const events = noteEvents(assembleStage7ArpeggiatorMidiIr(harmony, []).tracks[1].events);
    expect(harmony.slots.map((slot) => slot.bars)).toEqual([2, 2, 2, 2]);
    expect(events).toHaveLength(24);
    for (const [slotIndex, slot] of harmony.slots.entries()) {
      const start = slotIndex * 7_680;
      const end = start + 7_680;
      expect(
        events
          .filter(
            (event): event is MidiNoteOnEvent => event.type === "note-on" && event.tick === start,
          )
          .map((event) => [event.pitch, event.channel, event.velocity]),
      ).toEqual(slot.voicing.midiPitches.map((pitch) => [pitch, 0, 100]));
      expect(
        events
          .filter(
            (event): event is MidiNoteOffEvent => event.type === "note-off" && event.tick === end,
          )
          .map((event) => [event.pitch, event.channel, event.releaseVelocity]),
      ).toEqual(slot.voicing.midiPitches.map((pitch) => [pitch, 0, 0]));
    }
    expect(events.at(-3)?.tick).toBe(30_720);
  });

  it("maps only supplied ArpEvents and preserves rests, same-tick order, and terminal ends", () => {
    const events = noteEvents(
      assembleStage7ArpeggiatorMidiIr(progression(), arpEvents()).tracks[2].events,
    );
    expect(events).toEqual([
      { type: "note-on", tick: 0, channel: 2, pitch: 72, velocity: 100 },
      { type: "note-off", tick: 480, channel: 2, pitch: 72, releaseVelocity: 0 },
      { type: "note-on", tick: 480, channel: 2, pitch: 72, velocity: 100 },
      { type: "note-off", tick: 960, channel: 2, pitch: 72, releaseVelocity: 0 },
      { type: "note-on", tick: 1_920, channel: 2, pitch: 76, velocity: 100 },
      { type: "note-off", tick: 2_160, channel: 2, pitch: 76, releaseVelocity: 0 },
      { type: "note-on", tick: 30_240, channel: 2, pitch: 79, velocity: 100 },
      { type: "note-off", tick: 30_720, channel: 2, pitch: 79, releaseVelocity: 0 },
    ]);
    expect(events.filter((event) => event.tick > 960 && event.tick < 1_920)).toHaveLength(0);
  });

  it("is deterministic, recursively frozen, non-mutating, and ambient-randomness independent", () => {
    const harmony = progression();
    const arp = arpEvents();
    const beforeHarmony = structuredClone(harmony);
    const beforeArp = structuredClone(arp);
    const random = vi.spyOn(Math, "random").mockImplementation(() => {
      throw new Error("ambient randomness is forbidden");
    });
    try {
      const first = assembleStage7ArpeggiatorMidiIr(harmony, arp);
      const second = assembleStage7ArpeggiatorMidiIr(harmony, arp);
      expect(first).toEqual(second);
      expect(Object.isFrozen(first)).toBe(true);
      expect(Object.isFrozen(first.tracks)).toBe(true);
      for (const track of first.tracks) {
        expect(Object.isFrozen(track)).toBe(true);
        expect(Object.isFrozen(track.events)).toBe(true);
        expect(track.events.every(Object.isFrozen)).toBe(true);
      }
      expect(harmony).toEqual(beforeHarmony);
      expect(arp).toEqual(beforeArp);
    } finally {
      random.mockRestore();
    }
  });

  it("leaves malformed note-span failure ownership with the MIDI IR", () => {
    const forged = [{ ...arpEvents()[0], pitch: 128 }] as unknown as readonly ArpEvent[];
    expect(() => assembleStage7ArpeggiatorMidiIr(progression(), forged)).toThrowError(
      MidiIrValidationError,
    );
    try {
      assembleStage7ArpeggiatorMidiIr(progression(), forged);
    } catch (error) {
      expect(error).toMatchObject({ code: MIDI_IR_ERROR_CODES.invalidPitch, field: "note.pitch" });
    }
  });
});
