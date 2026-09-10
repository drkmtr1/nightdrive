import { createChordQuality, getChordQualityFormula, type ChordQuality } from "./chord-quality";
import { createPitchClass, type PitchClass } from "./pitch";

export type Chord = Readonly<{
  root: PitchClass;
  quality: ChordQuality;
}>;

export function createChord(root: PitchClass, quality: ChordQuality): Chord {
  return Object.freeze({
    root: createPitchClass(root),
    quality: createChordQuality(quality),
  });
}

function validatedChord(chord: Chord): Chord {
  return createChord(chord.root, chord.quality);
}

export function chordsEqual(left: Chord, right: Chord): boolean {
  const validatedLeft = validatedChord(left);
  const validatedRight = validatedChord(right);
  return (
    validatedLeft.root === validatedRight.root && validatedLeft.quality === validatedRight.quality
  );
}

export function getChordPitchClasses(chord: Chord): readonly PitchClass[] {
  const validated = validatedChord(chord);
  const members = getChordQualityFormula(validated.quality).map((offset) =>
    createPitchClass((validated.root + offset) % 12),
  );
  return Object.freeze(members);
}

export function serializeChord(chord: Chord): string {
  const validated = validatedChord(chord);
  return JSON.stringify({
    schema: "nightdrive.chord.v1",
    rootSemitoneClass: validated.root,
    quality: validated.quality,
  });
}
