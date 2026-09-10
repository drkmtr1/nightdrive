import { createPitchClass, type PitchClass } from "./pitch";
import {
  createScaleDegree,
  createScaleType,
  pitchClassAtScaleDegree,
  pitchClassesForScale,
  scaleContainsPitchClass,
  type ScaleDegree,
  type ScaleType,
} from "./scale";

export type Key = Readonly<{
  tonic: PitchClass;
  scale: ScaleType;
}>;

export function createKey(tonic: PitchClass, scale: ScaleType): Key {
  return Object.freeze({
    tonic: createPitchClass(tonic),
    scale: createScaleType(scale),
  });
}

function validatedKey(key: Key): Key {
  return createKey(key.tonic, key.scale);
}

export function keysEqual(left: Key, right: Key): boolean {
  const validatedLeft = validatedKey(left);
  const validatedRight = validatedKey(right);
  return (
    validatedLeft.tonic === validatedRight.tonic && validatedLeft.scale === validatedRight.scale
  );
}

export function pitchClassesForKey(key: Key): readonly PitchClass[] {
  const validated = validatedKey(key);
  return pitchClassesForScale(validated.tonic, validated.scale);
}

export function pitchClassAtKeyDegree(key: Key, degree: ScaleDegree): PitchClass {
  const validated = validatedKey(key);
  return pitchClassAtScaleDegree(validated.tonic, validated.scale, createScaleDegree(degree));
}

export function keyContainsPitchClass(key: Key, pitchClass: PitchClass): boolean {
  const validated = validatedKey(key);
  return scaleContainsPitchClass(validated.tonic, validated.scale, createPitchClass(pitchClass));
}

export function serializeKey(key: Key): string {
  const validated = validatedKey(key);
  return JSON.stringify({
    schema: "nightdrive.key.v1",
    tonicSemitoneClass: validated.tonic,
    scale: validated.scale,
  });
}
