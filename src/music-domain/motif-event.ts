import type { MotifDurationTicksV1 } from "./motif-catalog";
import { createTick, type Tick } from "./musical-time";
import { createMidiPitch, type MidiPitch } from "./pitch";

export type MotifEventV1 = Readonly<{
  pitch: MidiPitch;
  startTick: Tick;
  durationTicks: MotifDurationTicksV1;
}>;

export function createMotifEventV1(value: {
  pitch: number;
  startTick: number;
  durationTicks: number;
}): MotifEventV1 {
  if (value.durationTicks !== 480 && value.durationTicks !== 960) {
    throw new RangeError("Motif event duration must be 480 or 960 ticks.");
  }

  return Object.freeze({
    pitch: createMidiPitch(value.pitch),
    startTick: createTick(value.startTick),
    durationTicks: value.durationTicks,
  });
}
