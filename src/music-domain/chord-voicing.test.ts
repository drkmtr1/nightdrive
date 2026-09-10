import { describe, expect, it } from "vitest";
import { CHORD_QUALITIES, createChordQuality } from "./chord-quality";
import { createChord, getChordPitchClasses } from "./chord";
import {
  chordVoicingsEqual,
  createChordVoicing,
  isChordVoicingCompatibleWithChord,
  isChordVoicingCompatibleWithChordInversion,
  serializeChordVoicing,
  type ChordVoicing,
} from "./chord-voicing";
import { createChordInversion } from "./chord-inversion";
import { createPitchClass, createMidiPitch } from "./pitch";

const qualities = Object.values(CHORD_QUALITIES);

function voicingFor(chord: ReturnType<typeof createChord>, inversion: number): ChordVoicing {
  const members = getChordPitchClasses(chord);
  const ordered = [...members.slice(inversion), ...members.slice(0, inversion)];
  let previous = 35;
  const pitches = ordered.map((member) => {
    let pitch = previous + 1;
    while (pitch % 12 !== member) pitch += 1;
    previous = pitch;
    return createMidiPitch(pitch);
  });
  return createChordVoicing(pitches);
}

describe("ChordVoicing", () => {
  it("constructs immutable strictly ascending three-pitch values", () => {
    const input = [48, 52, 55];
    const voicing = createChordVoicing(input);
    expect(Object.isFrozen(voicing)).toBe(true);
    expect(Object.isFrozen(voicing.midiPitches)).toBe(true);
    input[0] = 60;
    expect(voicing.midiPitches).toEqual([48, 52, 55]);
    expect(Reflect.set(voicing.midiPitches, 0, 60)).toBe(false);
    expect(voicing.midiPitches).toEqual([48, 52, 55]);
  });

  it("rejects malformed shapes, values, sparse arrays, and ordering", () => {
    const sparse = [48, 52, 55];
    delete sparse[1];
    const invalid: unknown[] = [
      "48,52,55",
      [],
      [48],
      [48, 52],
      [48, 52, 55, 60],
      sparse,
      [48, 48, 55],
      [55, 52, 48],
      [48, 52, 52],
      [Number.NaN, 52, 55],
      [48, Infinity, 55],
      [48, 52.5, 55],
      [-1, 52, 55],
      [48, 52, 128],
      ["48", 52, 55],
      [{}, 52, 55],
      [null, 52, 55],
      [undefined, 52, 55],
      [48, Number.MAX_SAFE_INTEGER + 1, 55],
    ];
    for (const value of invalid) expect(() => createChordVoicing(value)).toThrow();
  });

  it("revalidates forged values and compares ordered identity", () => {
    const values = [
      createChordVoicing([36, 40, 43]),
      createChordVoicing([48, 52, 55]),
      createChordVoicing([60, 64, 67]),
    ];
    for (const left of values) {
      for (const right of values) expect(chordVoicingsEqual(left, right)).toBe(left === right);
    }
    expect(() => chordVoicingsEqual({ midiPitches: [48, 48, 55] } as never, values[0])).toThrow();
    expect(() => serializeChordVoicing({ midiPitches: [48, 52, 128] } as never)).toThrow();
  });

  it("serializes exact stable fixtures with no forbidden fields", () => {
    const voicing = createChordVoicing([48, 52, 55]);
    const serialized = serializeChordVoicing(voicing);
    expect(serialized).toBe('{"schema":"nightdrive.chord-voicing.v1","midiPitches":[48,52,55]}');
    expect(serializeChordVoicing(voicing)).toBe(serialized);
    const parsed = JSON.parse(serialized) as Record<string, unknown>;
    expect(Object.keys(parsed)).toEqual(["schema", "midiPitches"]);
    for (const field of [
      "root",
      "quality",
      "pitchClasses",
      "inversion",
      "range",
      "spacing",
      "profile",
      "harmony",
    ]) {
      expect(parsed).not.toHaveProperty(field);
    }
  });

  it("checks deterministic Chord membership compatibility", () => {
    const cMajor = createChord(createPitchClass(0), createChordQuality(CHORD_QUALITIES.majorTriad));
    expect(isChordVoicingCompatibleWithChord(createChordVoicing([48, 52, 55]), cMajor)).toBe(true);
    expect(isChordVoicingCompatibleWithChord(createChordVoicing([52, 55, 60]), cMajor)).toBe(true);
    expect(isChordVoicingCompatibleWithChord(createChordVoicing([55, 60, 64]), cMajor)).toBe(true);
    expect(isChordVoicingCompatibleWithChord(createChordVoicing([48, 55, 60]), cMajor)).toBe(false);

    for (let root = 0; root < 12; root += 1) {
      for (const quality of qualities) {
        const chord = createChord(createPitchClass(root), createChordQuality(quality));
        for (let inversion = 0; inversion < 3; inversion += 1) {
          const voicing = voicingFor(chord, inversion);
          expect(isChordVoicingCompatibleWithChord(voicing, chord)).toBe(true);
          expect(
            isChordVoicingCompatibleWithChordInversion(
              voicing,
              chord,
              createChordInversion(inversion),
            ),
          ).toBe(true);
          for (let other = 0; other < 3; other += 1) {
            expect(
              isChordVoicingCompatibleWithChordInversion(
                voicing,
                chord,
                createChordInversion(other),
              ),
            ).toBe(other === inversion);
          }
        }
      }
    }
  });

  it("uses canonical member order for wrapped B diminished inversion", () => {
    const chord = createChord(
      createPitchClass(11),
      createChordQuality(CHORD_QUALITIES.diminishedTriad),
    );
    const voicing = createChordVoicing([50, 53, 59]);
    expect(isChordVoicingCompatibleWithChord(voicing, chord)).toBe(true);
    expect(
      isChordVoicingCompatibleWithChordInversion(voicing, chord, createChordInversion(1)),
    ).toBe(true);
    expect(
      isChordVoicingCompatibleWithChordInversion(voicing, chord, createChordInversion(0)),
    ).toBe(false);
    expect(
      isChordVoicingCompatibleWithChordInversion(voicing, chord, createChordInversion(2)),
    ).toBe(false);
  });
});
