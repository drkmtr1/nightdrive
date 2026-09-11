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
  calculateVoiceLeadingCost,
  selectVoiceLedCandidate,
  type ChordVoicingCandidate,
  HarmonyTemplateValueError,
  HARMONY_ERROR_CODES,
  isHarmonyTemplateSupportedForProfile,
  realizeHarmonyTemplate,
  realizeHarmonyProgression,
} from "./harmony";
import { createMidiPitch, createPitchClass } from "./pitch";
import { createChord } from "./chord";
import {
  createChordVoicing,
  isChordVoicingCompatibleWithChord,
  isChordVoicingCompatibleWithChordInversion,
} from "./chord-voicing";
import { createChordInversion } from "./chord-inversion";
import {
  progressionCandidates as progressionCandidatesInternal,
  selectFirstProgressionCandidate,
  selectLaterProgressionCandidate as selectLaterProgressionCandidateInternal,
} from "./harmony-progression-internal";

const progressionCandidate = (inversion: 0 | 1 | 2, pitches: number[]): ChordVoicingCandidate => ({
  inversion: createChordInversion(inversion),
  voicing: createChordVoicing(pitches.map(createMidiPitch)),
});
const progressionCandidates = (
  chord: Parameters<typeof enumerateChordVoicingCandidates>[0],
  profile: Parameters<typeof enumerateChordVoicingCandidates>[1],
  inversions: Parameters<typeof enumerateChordVoicingCandidates>[2],
) => progressionCandidatesInternal(chord, profile, inversions, enumerateChordVoicingCandidates);
const selectLaterProgressionCandidate = (
  profile: Parameters<typeof selectFirstProgressionCandidate>[0],
  candidates: Parameters<typeof selectFirstProgressionCandidate>[1],
  previous: ChordVoicingCandidate,
  slotIndex: number,
  slotCount: number,
) =>
  selectLaterProgressionCandidateInternal(
    profile,
    candidates,
    previous,
    slotIndex,
    slotCount,
    calculateVoiceLeadingCost,
  );

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
    try {
      enumerateChordVoicingCandidates(chord, HARMONY_PROFILE_IDS.darkSynthwave, []);
      throw new Error("expected NO_INVERSION");
    } catch (error) {
      expect(error).toBeInstanceOf(HarmonyTemplateValueError);
      expect(error).toMatchObject({ code: HARMONY_ERROR_CODES.noInversion, field: "inversions" });
    }
    expect(() =>
      enumerateChordVoicingCandidates(chord, HARMONY_PROFILE_IDS.darkSynthwave, [3 as never]),
    ).toThrow();
    const wrapped = firstOnly.find(
      (candidate) => candidate.voicing.midiPitches.join(",") === "50,53,59",
    );
    expect(wrapped?.inversion).toBe(1);
  });

  it("proves complete candidate enumeration against an independent reference", () => {
    const chord = createChord(createPitchClass(0), CHORD_QUALITIES.majorTriad);
    const profile = HARMONY_PROFILE_IDS.darkSynthwave;
    const policy = getHarmonyVoicingPolicy(profile);
    const expected: Array<{ tuple: string; inversion: number }> = [];
    for (let bass = policy.minMidiPitch; bass <= policy.maxMidiPitch; bass += 1) {
      for (let middle = bass + 1; middle <= policy.maxMidiPitch; middle += 1) {
        for (let top = middle + 1; top <= policy.maxMidiPitch; top += 1) {
          if (top - bass > policy.maxSpan) continue;
          const voicing = createChordVoicing([
            createMidiPitch(bass),
            createMidiPitch(middle),
            createMidiPitch(top),
          ]);
          if (!isChordVoicingCompatibleWithChord(voicing, chord)) continue;
          const inversion = [0, 1, 2].find((index) =>
            isChordVoicingCompatibleWithChordInversion(voicing, chord, createChordInversion(index)),
          );
          if (inversion !== undefined)
            expected.push({ tuple: `${bass},${middle},${top}`, inversion });
        }
      }
    }
    const actual = enumerateChordVoicingCandidates(chord, profile).map((candidate) => ({
      tuple: candidate.voicing.midiPitches.join(","),
      inversion: candidate.inversion,
    }));
    expect(actual).toEqual(expected);
    expect(actual).toHaveLength(expected.length);
  });

  it("covers all V1 qualities and exact policy boundaries", () => {
    const qualities = [
      CHORD_QUALITIES.majorTriad,
      CHORD_QUALITIES.minorTriad,
      CHORD_QUALITIES.diminishedTriad,
    ];
    const profiles = Object.values(HARMONY_PROFILE_IDS);
    for (const profile of profiles) {
      const policy = getHarmonyVoicingPolicy(profile);
      const profileCandidates = [];
      for (const quality of qualities) {
        const candidates = Array.from({ length: 12 }, (_, root) =>
          enumerateChordVoicingCandidates(createChord(createPitchClass(root), quality), profile),
        ).flat();
        profileCandidates.push(...candidates);
        expect(candidates.length).toBeGreaterThan(0);
        for (const candidate of candidates) {
          const [bass, , top] = candidate.voicing.midiPitches;
          expect(bass).toBeGreaterThanOrEqual(policy.minMidiPitch);
          expect(top).toBeLessThanOrEqual(policy.maxMidiPitch);
          expect(top - bass).toBeLessThanOrEqual(policy.maxSpan);
        }
        expect(
          candidates.some(({ voicing }) => voicing.midiPitches[0] === policy.minMidiPitch - 1),
        ).toBe(false);
        expect(
          candidates.some(({ voicing }) => voicing.midiPitches[2] === policy.maxMidiPitch + 1),
        ).toBe(false);
        expect(
          candidates.some(
            ({ voicing }) => voicing.midiPitches[2] - voicing.midiPitches[0] === policy.maxSpan + 1,
          ),
        ).toBe(false);
      }
      expect(
        profileCandidates.some(({ voicing }) => voicing.midiPitches[0] === policy.minMidiPitch),
      ).toBe(true);
      expect(
        profileCandidates.some(({ voicing }) => voicing.midiPitches[2] === policy.maxMidiPitch),
      ).toBe(true);
    }
    const allCandidates = profiles.flatMap((profile) =>
      qualities.flatMap((quality) =>
        enumerateChordVoicingCandidates(createChord(createPitchClass(0), quality), profile),
      ),
    );
    expect(allCandidates.every(({ voicing }) => voicing.midiPitches[0] >= 0)).toBe(true);
    expect(allCandidates.every(({ voicing }) => voicing.midiPitches[2] <= 127)).toBe(true);
  });

  it("supports multiple allowed inversions while excluding omitted inversions", () => {
    const chord = createChord(createPitchClass(11), CHORD_QUALITIES.diminishedTriad);
    const candidates = enumerateChordVoicingCandidates(chord, HARMONY_PROFILE_IDS.darkSynthwave, [
      createChordInversion(0),
      createChordInversion(2),
    ]);
    expect(candidates.some((candidate) => candidate.inversion === 0)).toBe(true);
    expect(candidates.some((candidate) => candidate.inversion === 2)).toBe(true);
    expect(candidates.some((candidate) => candidate.inversion === 1)).toBe(false);
    expect(candidates.map(({ voicing }) => voicing.midiPitches.join(","))).toEqual(
      [...candidates]
        .sort((left, right) =>
          left.voicing.midiPitches.join(",").localeCompare(right.voicing.midiPitches.join(",")),
        )
        .map(({ voicing }) => voicing.midiPitches.join(",")),
    );
  });

  it("calculates the exact adjacent voice-leading cost", () => {
    const first = createChordVoicing([
      createMidiPitch(48),
      createMidiPitch(52),
      createMidiPitch(55),
    ]);
    expect(
      calculateVoiceLeadingCost(first, createChordVoicing([50, 53, 57].map(createMidiPitch))),
    ).toBe(5);
    expect(
      calculateVoiceLeadingCost(first, createChordVoicing([48, 55, 60].map(createMidiPitch))),
    ).toBe(8);
  });

  it("selects deterministically with the accepted tie-break order", () => {
    const previous = createChordVoicing([48, 52, 55].map(createMidiPitch));
    const candidates = [
      {
        inversion: createChordInversion(0),
        voicing: createChordVoicing([48, 55, 64].map(createMidiPitch)),
      },
      {
        inversion: createChordInversion(1),
        voicing: createChordVoicing([52, 55, 60].map(createMidiPitch)),
      },
    ] as const;
    const selection = selectVoiceLedCandidate(previous, candidates);
    expect(selection.cost).toBe(12);
    expect(selection.candidate.voicing.midiPitches).toEqual([52, 55, 60]);
    expect(Object.isFrozen(selection)).toBe(true);
    expect(selectVoiceLedCandidate(previous, [...candidates].reverse())).toEqual(selection);
  });

  it("proves reachable lower-bass and lower-middle tie-breaks independently", () => {
    const previous = createChordVoicing([48, 52, 55].map(createMidiPitch));
    const qualities = [
      CHORD_QUALITIES.majorTriad,
      CHORD_QUALITIES.minorTriad,
      CHORD_QUALITIES.diminishedTriad,
    ];
    const candidates = enumerateChordVoicingCandidates(
      createChord(createPitchClass(0), CHORD_QUALITIES.majorTriad),
      HARMONY_PROFILE_IDS.darkSynthwave,
    );
    const findPair = (
      predicate: (left: ChordVoicingCandidate, right: ChordVoicingCandidate) => boolean,
    ) => {
      for (const left of candidates) {
        for (const right of candidates) {
          if (left !== right && predicate(left, right)) return [left, right] as const;
        }
      }
      return undefined;
    };
    const bassPair = findPair((left, right) => {
      const leftPitches = left.voicing.midiPitches;
      const rightPitches = right.voicing.midiPitches;
      return (
        calculateVoiceLeadingCost(previous, left.voicing) ===
          calculateVoiceLeadingCost(previous, right.voicing) &&
        leftPitches[2] === rightPitches[2] &&
        leftPitches[0] !== rightPitches[0]
      );
    });
    expect(bassPair).toBeDefined();
    if (bassPair) {
      const [left, right] = bassPair;
      const expected = left.voicing.midiPitches[0] < right.voicing.midiPitches[0] ? left : right;
      expect(selectVoiceLedCandidate(previous, [left, right]).candidate).toEqual(expected);
    }
    const middleCandidates = qualities.flatMap((quality) =>
      Array.from({ length: 12 }, (_, root) =>
        enumerateChordVoicingCandidates(
          createChord(createPitchClass(root), quality),
          HARMONY_PROFILE_IDS.darkSynthwave,
        ),
      ).flat(),
    );
    const middlePrevious = createChordVoicing([48, 54, 60].map(createMidiPitch));
    const findMiddlePair = (
      predicate: (left: ChordVoicingCandidate, right: ChordVoicingCandidate) => boolean,
    ) => {
      for (const left of middleCandidates) {
        for (const right of middleCandidates) {
          if (left !== right && predicate(left, right)) return [left, right] as const;
        }
      }
      return undefined;
    };
    const middlePair = findMiddlePair((left, right) => {
      const leftPitches = left.voicing.midiPitches;
      const rightPitches = right.voicing.midiPitches;
      return (
        calculateVoiceLeadingCost(middlePrevious, left.voicing) ===
          calculateVoiceLeadingCost(middlePrevious, right.voicing) &&
        leftPitches[2] === rightPitches[2] &&
        leftPitches[0] === rightPitches[0] &&
        leftPitches[1] !== rightPitches[1]
      );
    });
    expect(middlePair).toBeDefined();
    if (middlePair) {
      const [left, right] = middlePair;
      const expected = left.voicing.midiPitches[1] < right.voicing.midiPitches[1] ? left : right;
      expect(selectVoiceLedCandidate(middlePrevious, [right, left]).candidate).toEqual(expected);
    }
  });

  it("rejects empty candidate input with stable Harmony error semantics", () => {
    const previous = createChordVoicing([48, 52, 55].map(createMidiPitch));
    expect(() => selectVoiceLedCandidate(previous, [])).toThrowError(HarmonyTemplateValueError);
    try {
      selectVoiceLedCandidate(previous, []);
    } catch (error) {
      expect(error).toMatchObject({ code: HARMONY_ERROR_CODES.noVoicing, field: "candidates" });
    }
  });

  it("preserves unrestricted slots and Stage 4B2 candidate behavior", () => {
    for (const template of HARMONY_TEMPLATE_CATALOG) {
      expect(template.slots.every((slot) => !Object.hasOwn(slot, "inversions"))).toBe(true);
      const chord = realizeHarmonyTemplate(
        template,
        createKey(createPitchClass(0), template.scale),
      )[0];
      expect(
        enumerateChordVoicingCandidates(
          chord,
          HARMONY_PROFILE_IDS.darkSynthwave,
          template.slots[0].inversions,
        ),
      ).toEqual(enumerateChordVoicingCandidates(chord, HARMONY_PROFILE_IDS.darkSynthwave));
    }
  });

  it("strictly validates optional template inversion restrictions", () => {
    const source = getHarmonyTemplate("degree-0340-major-v1");
    const sparse: unknown[] = [];
    sparse.length = 1;
    const malformed = [
      { ...source, slots: [{ ...source.slots[0], inversions: "0" }, ...source.slots.slice(1)] },
      { ...source, slots: [{ ...source.slots[0], inversions: [] }, ...source.slots.slice(1)] },
      { ...source, slots: [{ ...source.slots[0], inversions: sparse }, ...source.slots.slice(1)] },
      { ...source, slots: [{ ...source.slots[0], inversions: [0, 0] }, ...source.slots.slice(1)] },
      { ...source, slots: [{ ...source.slots[0], inversions: [3] }, ...source.slots.slice(1)] },
      { ...source, slots: [{ ...source.slots[0], inversions: [1.5] }, ...source.slots.slice(1)] },
      { ...source, slots: [{ ...source.slots[0], inversions: ["1"] }, ...source.slots.slice(1)] },
      { ...source, slots: [{ ...source.slots[0], inversions: [0] }, ...source.slots.slice(1)] },
    ];
    for (const value of malformed) expect(() => createHarmonyTemplate(value)).toThrow();
  });

  it("realizes an immutable sequential progression while preserving slots and bars", () => {
    const template = getHarmonyTemplate("degree-0654-natural-minor-v1");
    const realization = realizeHarmonyProgression(
      HARMONY_PROFILE_IDS.darkSynthwave,
      template,
      createKey(createPitchClass(0), "natural-minor"),
    );
    expect(realization.templateId).toBe(template.id);
    expect(realization.templateVersion).toBe("v1");
    expect(realization.slots).toHaveLength(4);
    expect(realization.slots.map((slot) => slot.index)).toEqual([0, 1, 2, 3]);
    expect(realization.slots.map((slot) => slot.bars)).toEqual([2, 2, 2, 2]);
    for (const slot of realization.slots) {
      expect(isChordVoicingCompatibleWithChord(slot.voicing, slot.chord)).toBe(true);
      expect(
        isChordVoicingCompatibleWithChordInversion(slot.voicing, slot.chord, slot.inversion),
      ).toBe(true);
    }
    expect(realization.slots[0].adjacentCost).toBeNull();
    expect(realization.slots.slice(1).every((slot) => typeof slot.adjacentCost === "number")).toBe(
      true,
    );
    expect(realization.slots.every((slot) => Object.isFrozen(slot))).toBe(true);
    expect(Object.isFrozen(realization)).toBe(true);
    expect(Object.isFrozen(realization.slots)).toBe(true);
    expect(realization).toEqual(
      realizeHarmonyProgression(
        HARMONY_PROFILE_IDS.darkSynthwave,
        template,
        createKey(createPitchClass(0), "natural-minor"),
      ),
    );
  });

  it("applies the Classic Synthwave root-position anchor preference only to slot one", () => {
    const realization = realizeHarmonyProgression(
      HARMONY_PROFILE_IDS.classicSynthwave,
      getHarmonyTemplate("degree-0344-major-v1"),
      createKey(createPitchClass(0), "major"),
    );
    expect(realization.slots[0].inversion).toBe(0);
    expect(realization.slots[0].rationale.preferenceRank).toBe(0);
    expect(realization.slots.slice(1).every((slot) => slot.rationale.preferenceRank === 0)).toBe(
      true,
    );
  });

  it("keeps Darkwave cadence inversions zero and one at the same preferred rank", () => {
    const realization = realizeHarmonyProgression(
      HARMONY_PROFILE_IDS.darkwave,
      getHarmonyTemplate("degree-0344-dorian-v1"),
      createKey(createPitchClass(0), "dorian"),
    );
    const finalSlot = realization.slots[3];
    expect(finalSlot.rationale.preferenceRank).toBeLessThanOrEqual(1);
    expect(finalSlot.rationale.tieBreak).toContain("Stage 4B3");
  });

  it("rejects templates outside a profile's approved mapping", () => {
    expect(() =>
      realizeHarmonyProgression(
        HARMONY_PROFILE_IDS.darkSynthwave,
        getHarmonyTemplate("degree-0344-major-v1"),
        createKey(createPitchClass(0), "major"),
      ),
    ).toThrowError(HarmonyTemplateValueError);
  });

  it("applies template inversion restrictions before progression preferences", () => {
    const chord = createChord(createPitchClass(0), CHORD_QUALITIES.majorTriad);
    const unrestricted = progressionCandidates(chord, HARMONY_PROFILE_IDS.darkSynthwave, undefined);
    expect(new Set(unrestricted.map((candidate) => candidate.inversion))).toEqual(
      new Set([0, 1, 2]),
    );
    for (const restriction of [[0], [1], [0, 2]] as const) {
      const candidates = progressionCandidates(
        chord,
        HARMONY_PROFILE_IDS.darkSynthwave,
        restriction.map(createChordInversion),
      );
      expect(new Set(candidates.map((candidate) => candidate.inversion))).toEqual(
        new Set(restriction),
      );
      expect(
        selectFirstProgressionCandidate(HARMONY_PROFILE_IDS.darkSynthwave, candidates).candidate
          .inversion,
      ).toBe(restriction[0]);
    }
  });

  it("proves the Stage 4B4 first-slot and later-slot ranking seams", () => {
    const lowLexicographic = progressionCandidate(1, [40, 50, 60]);
    const rootPosition = progressionCandidate(0, [50, 60, 70]);
    expect(
      selectFirstProgressionCandidate(HARMONY_PROFILE_IDS.classicSynthwave, [
        lowLexicographic,
        rootPosition,
      ]).candidate,
    ).toBe(rootPosition);
    expect(
      selectFirstProgressionCandidate(HARMONY_PROFILE_IDS.darkwave, [
        lowLexicographic,
        rootPosition,
      ]).candidate,
    ).toBe(lowLexicographic);

    const previous = progressionCandidate(0, [50, 60, 70]);
    const higherCostPreferred = progressionCandidate(0, [55, 65, 75]);
    const lowerCostOther = progressionCandidate(1, [50, 60, 70]);
    expect(
      selectLaterProgressionCandidate(
        HARMONY_PROFILE_IDS.darkSynthwave,
        [higherCostPreferred, lowerCostOther],
        previous,
        1,
        2,
      ).candidate,
    ).toBe(lowerCostOther);

    const darkwaveZero = selectLaterProgressionCandidate(
      HARMONY_PROFILE_IDS.darkwave,
      [progressionCandidate(0, [50, 60, 70])],
      previous,
      1,
      2,
    );
    const darkwaveOne = selectLaterProgressionCandidate(
      HARMONY_PROFILE_IDS.darkwave,
      [progressionCandidate(1, [50, 60, 70])],
      previous,
      1,
      2,
    );
    const darkwaveTwo = selectLaterProgressionCandidate(
      HARMONY_PROFILE_IDS.darkwave,
      [progressionCandidate(2, [50, 60, 70])],
      previous,
      1,
      2,
    );
    expect(darkwaveZero.preferenceRank).toBe(darkwaveOne.preferenceRank);
    expect(darkwaveZero.preferenceRank).toBeLessThan(darkwaveTwo.preferenceRank);

    const repeated = progressionCandidate(0, [50, 60, 70]);
    const changed = progressionCandidate(1, [50, 60, 70]);
    expect(
      selectLaterProgressionCandidate(
        HARMONY_PROFILE_IDS.midtempoCyberpunk,
        [repeated, changed],
        previous,
        1,
        2,
      ).candidate,
    ).toBe(changed);
    const lowerCostRepeated = progressionCandidate(0, [51, 60, 70]);
    const higherCostChanged = progressionCandidate(1, [53, 62, 72]);
    expect(
      selectLaterProgressionCandidate(
        HARMONY_PROFILE_IDS.midtempoCyberpunk,
        [higherCostChanged, lowerCostRepeated],
        previous,
        1,
        2,
      ).candidate,
    ).toBe(lowerCostRepeated);

    const equalCostLowerMaximum = progressionCandidate(1, [49, 61, 70]);
    const equalCostHigherMaximum = progressionCandidate(1, [49, 60, 71]);
    expect(
      selectLaterProgressionCandidate(
        HARMONY_PROFILE_IDS.classicSynthwave,
        [equalCostHigherMaximum, equalCostLowerMaximum],
        previous,
        1,
        3,
      ).candidate,
    ).toBe(equalCostLowerMaximum);

    const equalCostLowerBass = progressionCandidate(1, [49, 60, 71]);
    const equalCostHigherBass = progressionCandidate(1, [50, 59, 71]);
    expect(
      selectLaterProgressionCandidate(
        HARMONY_PROFILE_IDS.classicSynthwave,
        [equalCostHigherBass, equalCostLowerBass],
        previous,
        1,
        3,
      ).candidate,
    ).toBe(equalCostLowerBass);

    const equalCostLowerMiddle = progressionCandidate(1, [49, 59, 71]);
    const equalCostHigherMiddle = progressionCandidate(1, [49, 61, 71]);
    expect(
      selectLaterProgressionCandidate(
        HARMONY_PROFILE_IDS.classicSynthwave,
        [equalCostHigherMiddle, equalCostLowerMiddle],
        previous,
        1,
        3,
      ).candidate,
    ).toBe(equalCostLowerMiddle);
  });

  it("keeps controlled later-slot selection independent of candidate order", () => {
    const previous = progressionCandidate(0, [50, 60, 70]);
    const left = progressionCandidate(1, [51, 60, 70]);
    const right = progressionCandidate(2, [50, 61, 70]);
    const first = selectLaterProgressionCandidate(
      HARMONY_PROFILE_IDS.classicSynthwave,
      [left, right],
      previous,
      1,
      3,
    );
    const second = selectLaterProgressionCandidate(
      HARMONY_PROFILE_IDS.classicSynthwave,
      [right, left],
      previous,
      1,
      3,
    );
    expect(second).toEqual(first);
  });
});
