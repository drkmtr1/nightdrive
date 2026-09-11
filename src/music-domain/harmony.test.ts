import { describe, expect, it } from "vitest";
import { getChordPitchClasses } from "./chord";
import { CHORD_QUALITIES } from "./chord-quality";
import { createKey } from "./key";
import {
  HARMONY_TEMPLATE_CATALOG,
  createHarmonyTemplate,
  getHarmonyTemplate,
  getHarmonyTemplateIdsForProfile,
  HARMONY_PROFILE_IDS,
  enumerateChordVoicingCandidates,
  getHarmonyVoicingPolicy,
  isHarmonyTemplateSupportedForProfile,
  realizeHarmonyTemplate,
} from "./harmony";
import { createPitchClass } from "./pitch";
import { createChord } from "./chord";
import { isChordVoicingCompatibleWithChordInversion } from "./chord-voicing";
import { createChordInversion } from "./chord-inversion";

describe("Harmony template runtime", () => {
  it("preserves the complete immutable catalog and profile mappings", () => {
    expect(HARMONY_TEMPLATE_CATALOG).toHaveLength(18);
    for (const template of HARMONY_TEMPLATE_CATALOG) {
      expect(template.schema).toBe("nightdrive.harmony-template.v1");
      expect(template.version).toBe("v1");
      expect(template.slots).toHaveLength(4);
      expect(template.slots.reduce((sum, slot) => sum + slot.bars, 0)).toBe(8);
      expect(Object.isFrozen(template)).toBe(true);
      expect(Object.isFrozen(template.slots)).toBe(true);
      expect(template.slots.every((slot) => Object.isFrozen(slot))).toBe(true);
    }
    const profiles = {
      "dark-synthwave": [
        "degree-0654-natural-minor-v1",
        "degree-0344-harmonic-minor-v1",
        "degree-0340-dorian-v1",
      ],
      "classic-synthwave": [
        "degree-0344-major-v1",
        "degree-0340-major-v1",
        "degree-0344-natural-minor-v1",
        "degree-0340-dorian-v1",
      ],
      darkwave: [
        "degree-0654-natural-minor-v1",
        "degree-0340-phrygian-v1",
        "degree-0344-dorian-v1",
      ],
      "midtempo-cyberpunk": [
        "degree-0654-phrygian-v1",
        "degree-0344-harmonic-minor-v1",
        "degree-0340-natural-minor-v1",
      ],
    } as const;
    for (const [profile, ids] of Object.entries(profiles)) {
      expect(getHarmonyTemplateIdsForProfile(profile as never)).toEqual(ids);
      expect(
        ids.every((id) =>
          isHarmonyTemplateSupportedForProfile(profile as never, getHarmonyTemplate(id)),
        ),
      ).toBe(true);
    }
  });

  it("realizes explicit major and natural-minor golden fixtures", () => {
    const major = realizeHarmonyTemplate(
      getHarmonyTemplate("degree-0340-major-v1"),
      createKey(createPitchClass(0), "major"),
    );
    expect(major.map((chord) => chord.root)).toEqual([0, 5, 7, 0]);
    expect(major.map((chord) => chord.quality)).toEqual([
      CHORD_QUALITIES.majorTriad,
      CHORD_QUALITIES.majorTriad,
      CHORD_QUALITIES.majorTriad,
      CHORD_QUALITIES.majorTriad,
    ]);
    expect(major.map(getChordPitchClasses)).toEqual([
      [0, 4, 7],
      [5, 9, 0],
      [7, 11, 2],
      [0, 4, 7],
    ]);
    const minor = realizeHarmonyTemplate(
      getHarmonyTemplate("degree-0340-natural-minor-v1"),
      createKey(createPitchClass(9), "natural-minor"),
    );
    expect(minor.map((chord) => chord.root)).toEqual([9, 2, 4, 9]);
    expect(minor.map((chord) => chord.quality)).toEqual([
      CHORD_QUALITIES.minorTriad,
      CHORD_QUALITIES.minorTriad,
      CHORD_QUALITIES.majorTriad,
      CHORD_QUALITIES.minorTriad,
    ]);
    expect(minor.map(getChordPitchClasses)).toEqual([
      [9, 0, 4],
      [2, 5, 9],
      [4, 8, 11],
      [9, 0, 4],
    ]);
  });

  it("uses explicit slots rather than parsing opaque IDs", () => {
    const source = getHarmonyTemplate("degree-0344-major-v1");
    expect(source.slots.map((slot) => slot.degree)).toEqual([0, 3, 4, 0]);
    expect(
      realizeHarmonyTemplate(source, createKey(createPitchClass(0), "major")).map(
        (chord) => chord.root,
      ),
    ).toEqual([0, 5, 7, 0]);
    expect(() =>
      realizeHarmonyTemplate(source, createKey(createPitchClass(0), "natural-minor")),
    ).toThrow();
  });

  it("rejects altered content under every canonical ID", () => {
    for (const source of HARMONY_TEMPLATE_CATALOG) {
      const mutations = [
        { ...source, scale: source.scale === "major" ? "natural-minor" : "major" },
        {
          ...source,
          slots: source.slots.map((slot, index) =>
            index === 0 ? { ...slot, degree: (slot.degree + 1) % 7 } : slot,
          ),
        },
        {
          ...source,
          slots: source.slots.map((slot, index) =>
            index === 0
              ? {
                  ...slot,
                  quality:
                    slot.quality === CHORD_QUALITIES.majorTriad
                      ? CHORD_QUALITIES.minorTriad
                      : CHORD_QUALITIES.majorTriad,
                }
              : slot,
          ),
        },
        {
          ...source,
          slots: source.slots.map((slot, index) =>
            index === 0 ? { ...slot, bars: slot.bars + 1 } : slot,
          ),
        },
        { ...source, slots: source.slots.slice(1) },
      ];
      for (const mutation of mutations) expect(() => createHarmonyTemplate(mutation)).toThrow();
      expect(createHarmonyTemplate(source)).toBe(source);
    }
  });

  it("realizes every template and rejects malformed runtime values", () => {
    for (const template of HARMONY_TEMPLATE_CATALOG) {
      const key = createKey(createPitchClass(0), template.scale);
      expect(realizeHarmonyTemplate(template, key)).toHaveLength(4);
      expect(realizeHarmonyTemplate(template, key)).toEqual(realizeHarmonyTemplate(template, key));
    }
    const valid = getHarmonyTemplate("degree-0340-major-v1");
    for (const value of [
      null,
      [],
      { ...valid, schema: "wrong" },
      { ...valid, version: "v2" },
      { ...valid, scale: "unknown" },
      { ...valid, slots: [] },
      { ...valid, slots: [{ degree: 7, quality: "major-triad", bars: 8 }] },
      { ...valid, slots: [{ degree: 0, quality: "major", bars: 8 }] },
      { ...valid, slots: [{ degree: 0, quality: "major-triad", bars: 0 }] },
    ]) {
      expect(() => createHarmonyTemplate(value)).toThrow();
    }
  });

  it("enumerates immutable hard-valid voicing candidates in lexicographic order", () => {
    const policies = [
      [HARMONY_PROFILE_IDS.darkSynthwave, 36, 84, 24],
      [HARMONY_PROFILE_IDS.classicSynthwave, 40, 88, 24],
      [HARMONY_PROFILE_IDS.darkwave, 34, 80, 22],
      [HARMONY_PROFILE_IDS.midtempoCyberpunk, 38, 86, 26],
    ] as const;
    const chord = createChord(createPitchClass(0), CHORD_QUALITIES.majorTriad);
    for (const [profile, min, max, span] of policies) {
      const policy = getHarmonyVoicingPolicy(profile);
      expect(policy).toEqual({ minMidiPitch: min, maxMidiPitch: max, maxSpan: span });
      expect(Object.isFrozen(policy)).toBe(true);
      const candidates = enumerateChordVoicingCandidates(chord, profile);
      let previous: number[] | undefined;
      const tuples = new Set<string>();
      for (const candidate of candidates) {
        const tuple = [...candidate.voicing.midiPitches];
        expect(tuple[0]).toBeGreaterThanOrEqual(min);
        expect(tuple[2]).toBeLessThanOrEqual(max);
        expect(tuple[2] - tuple[0]).toBeLessThanOrEqual(span);
        expect(
          previous === undefined ||
            tuple[0] > previous[0] ||
            (tuple[0] === previous[0] &&
              (tuple[1] > previous[1] || (tuple[1] === previous[1] && tuple[2] > previous[2]))),
        ).toBe(true);
        previous = tuple;
        expect(tuples.has(tuple.join(","))).toBe(false);
        tuples.add(tuple.join(","));
        expect(Object.isFrozen(candidate)).toBe(true);
        expect(
          isChordVoicingCompatibleWithChordInversion(candidate.voicing, chord, candidate.inversion),
        ).toBe(true);
      }
      expect(candidates.length).toBeGreaterThan(0);
    }
  });

  it("supports restrictions, boundaries, wrapped roots, and unsatisfiable behavior", () => {
    const chord = createChord(createPitchClass(11), CHORD_QUALITIES.diminishedTriad);
    const unrestricted = enumerateChordVoicingCandidates(chord, HARMONY_PROFILE_IDS.darkSynthwave);
    expect(unrestricted.some((candidate) => candidate.inversion === 0)).toBe(true);
    expect(unrestricted.some((candidate) => candidate.inversion === 1)).toBe(true);
    expect(unrestricted.some((candidate) => candidate.inversion === 2)).toBe(true);
    const firstOnly = enumerateChordVoicingCandidates(chord, HARMONY_PROFILE_IDS.darkSynthwave, [
      createChordInversion(1),
    ]);
    expect(firstOnly.every((candidate) => candidate.inversion === 1)).toBe(true);
    expect(() =>
      enumerateChordVoicingCandidates(chord, HARMONY_PROFILE_IDS.darkSynthwave, []),
    ).toThrow();
    expect(() =>
      enumerateChordVoicingCandidates(chord, HARMONY_PROFILE_IDS.darkSynthwave, [3 as never]),
    ).toThrow();
    const wrapped = firstOnly.find(
      (candidate) => candidate.voicing.midiPitches.join(",") === "50,53,59",
    );
    expect(wrapped?.inversion).toBe(1);
  });
});
