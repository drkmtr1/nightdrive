const tickBrand: unique symbol = Symbol("Tick");
const durationTicksBrand: unique symbol = Symbol("DurationTicks");
const barIndexBrand: unique symbol = Symbol("BarIndex");
const beatIndexBrand: unique symbol = Symbol("BeatIndex");
const tickWithinBeatBrand: unique symbol = Symbol("TickWithinBeat");
const microsecondsPerQuarterBrand: unique symbol = Symbol("MicrosecondsPerQuarter");

export type Tick = number & { readonly [tickBrand]: true };
export type DurationTicks = number & { readonly [durationTicksBrand]: true };
export type BarIndex = number & { readonly [barIndexBrand]: true };
export type BeatIndex = number & { readonly [beatIndexBrand]: true };
export type TickWithinBeat = number & { readonly [tickWithinBeatBrand]: true };
export type MicrosecondsPerQuarter = number & {
  readonly [microsecondsPerQuarterBrand]: true;
};

export interface MusicalPosition {
  readonly bar: BarIndex;
  readonly beat: BeatIndex;
  readonly tickWithinBeat: TickWithinBeat;
}

export interface TimeSignature {
  readonly numerator: number;
  readonly denominator: number;
}

export interface Tempo {
  readonly microsecondsPerQuarter: MicrosecondsPerQuarter;
}

export const MUSICAL_TIME_ERROR_CODES = {
  arithmeticOverflow: "ARITHMETIC_OVERFLOW",
  invalidEventRange: "INVALID_EVENT_RANGE",
  invalidPosition: "INVALID_POSITION",
  notFinite: "NOT_FINITE",
  notInteger: "NOT_INTEGER",
  outOfRange: "OUT_OF_RANGE",
  unsafeInteger: "UNSAFE_INTEGER",
  unsupportedTimeSignature: "UNSUPPORTED_TIME_SIGNATURE",
} as const;

export type MusicalTimeErrorCode =
  (typeof MUSICAL_TIME_ERROR_CODES)[keyof typeof MUSICAL_TIME_ERROR_CODES];

export class MusicalTimeError extends RangeError {
  readonly code: MusicalTimeErrorCode;
  readonly field: string;

  constructor(code: MusicalTimeErrorCode, field: string, message: string) {
    super(message);
    this.name = "MusicalTimeError";
    this.code = code;
    this.field = field;
  }
}

export const PPQ = 960 as const;
export const V1_BAR_COUNT = 8 as const;
export const V1_BEATS_PER_BAR = 4 as const;
export const V1_TICKS_PER_BEAT = PPQ;
export const V1_TICKS_PER_BAR = V1_BEATS_PER_BAR * V1_TICKS_PER_BEAT;
export const V1_SECTION_LENGTH_TICKS = V1_BAR_COUNT * V1_TICKS_PER_BAR;

function requireFinite(value: number, field: string): void {
  if (!Number.isFinite(value)) {
    throw new MusicalTimeError(
      MUSICAL_TIME_ERROR_CODES.notFinite,
      field,
      `${field} must be finite.`,
    );
  }
}

function requireSafeInteger(value: number, field: string): void {
  requireFinite(value, field);
  if (!Number.isInteger(value)) {
    throw new MusicalTimeError(
      MUSICAL_TIME_ERROR_CODES.notInteger,
      field,
      `${field} must be an integer.`,
    );
  }
  if (!Number.isSafeInteger(value)) {
    throw new MusicalTimeError(
      MUSICAL_TIME_ERROR_CODES.unsafeInteger,
      field,
      `${field} must be a safe integer.`,
    );
  }
}

function requireAtLeast(value: number, minimum: number, field: string): void {
  requireSafeInteger(value, field);
  if (value < minimum) {
    throw new MusicalTimeError(
      MUSICAL_TIME_ERROR_CODES.outOfRange,
      field,
      `${field} must be at least ${minimum}.`,
    );
  }
}

export function createTick(value: number): Tick {
  requireAtLeast(value, 0, "tick");
  return value as Tick;
}

export function createDurationTicks(value: number): DurationTicks {
  requireAtLeast(value, 1, "durationTicks");
  return value as DurationTicks;
}

export function createTimeSignature(numerator: number, denominator: number): TimeSignature {
  requireAtLeast(numerator, 1, "timeSignature.numerator");
  requireAtLeast(denominator, 1, "timeSignature.denominator");

  const isPowerOfTwo = (denominator & (denominator - 1)) === 0;
  const ticksPerDenominatorBeat = (PPQ * 4) / denominator;
  if (!isPowerOfTwo || !Number.isSafeInteger(ticksPerDenominatorBeat)) {
    throw new MusicalTimeError(
      MUSICAL_TIME_ERROR_CODES.unsupportedTimeSignature,
      "timeSignature.denominator",
      `timeSignature.denominator must be a power of two that resolves exactly at ${PPQ} PPQ.`,
    );
  }

  return Object.freeze({ numerator, denominator });
}

export const V1_TIME_SIGNATURE = createTimeSignature(4, 4);

export function createTempoFromMicrosecondsPerQuarter(value: number): Tempo {
  requireAtLeast(value, 1, "tempo.microsecondsPerQuarter");
  return Object.freeze({
    microsecondsPerQuarter: value as MicrosecondsPerQuarter,
  });
}

export function createTempoFromBpm(bpm: number): Tempo {
  requireFinite(bpm, "tempo.bpm");
  if (bpm <= 0) {
    throw new MusicalTimeError(
      MUSICAL_TIME_ERROR_CODES.outOfRange,
      "tempo.bpm",
      "tempo.bpm must be greater than 0.",
    );
  }

  // Positive values use Math.round's specified nearest-integer policy; an exact
  // half-microsecond rounds toward positive infinity.
  return createTempoFromMicrosecondsPerQuarter(Math.round(60_000_000 / bpm));
}

export function tempoToBpm(tempo: Tempo): number {
  const validated = createTempoFromMicrosecondsPerQuarter(tempo.microsecondsPerQuarter);
  return 60_000_000 / validated.microsecondsPerQuarter;
}

export function ticksToSeconds(ticks: Tick, tempo: Tempo): number {
  const validatedTick = createTick(ticks);
  const validatedTempo = createTempoFromMicrosecondsPerQuarter(tempo.microsecondsPerQuarter);
  return (validatedTick * validatedTempo.microsecondsPerQuarter) / PPQ / 1_000_000;
}

export function createMusicalPosition(input: {
  readonly bar: number;
  readonly beat: number;
  readonly tickWithinBeat: number;
}): MusicalPosition {
  requireAtLeast(input.bar, 0, "position.bar");
  requireAtLeast(input.beat, 0, "position.beat");
  requireAtLeast(input.tickWithinBeat, 0, "position.tickWithinBeat");

  const isSectionEnd = input.bar === V1_BAR_COUNT && input.beat === 0 && input.tickWithinBeat === 0;
  const isPositionWithinSection =
    input.bar < V1_BAR_COUNT &&
    input.beat < V1_BEATS_PER_BAR &&
    input.tickWithinBeat < V1_TICKS_PER_BEAT;

  if (!isSectionEnd && !isPositionWithinSection) {
    throw new MusicalTimeError(
      MUSICAL_TIME_ERROR_CODES.invalidPosition,
      "position",
      "position must be inside the 8-bar 4/4 section or equal its exclusive end boundary.",
    );
  }

  return Object.freeze({
    bar: input.bar as BarIndex,
    beat: input.beat as BeatIndex,
    tickWithinBeat: input.tickWithinBeat as TickWithinBeat,
  });
}

export function positionToTick(position: MusicalPosition): Tick {
  const validated = createMusicalPosition(position);
  return createTick(
    validated.bar * V1_TICKS_PER_BAR +
      validated.beat * V1_TICKS_PER_BEAT +
      validated.tickWithinBeat,
  );
}

export function tickToPosition(tick: Tick): MusicalPosition {
  const validated = createTick(tick);
  if (validated > V1_SECTION_LENGTH_TICKS) {
    throw new MusicalTimeError(
      MUSICAL_TIME_ERROR_CODES.outOfRange,
      "tick",
      `tick must not exceed the section boundary ${V1_SECTION_LENGTH_TICKS}.`,
    );
  }

  if (validated === V1_SECTION_LENGTH_TICKS) {
    return createMusicalPosition({
      bar: V1_BAR_COUNT,
      beat: 0,
      tickWithinBeat: 0,
    });
  }

  const bar = Math.floor(validated / V1_TICKS_PER_BAR);
  const tickWithinBar = validated % V1_TICKS_PER_BAR;
  return createMusicalPosition({
    bar,
    beat: Math.floor(tickWithinBar / V1_TICKS_PER_BEAT),
    tickWithinBeat: tickWithinBar % V1_TICKS_PER_BEAT,
  });
}

export function isEventStartTick(tick: Tick): boolean {
  const validated = createTick(tick);
  return validated < V1_SECTION_LENGTH_TICKS;
}

export function isEventStartPosition(position: MusicalPosition): boolean {
  return isEventStartTick(positionToTick(position));
}

export function comparePositions(left: MusicalPosition, right: MusicalPosition): -1 | 0 | 1 {
  const leftTick = positionToTick(left);
  const rightTick = positionToTick(right);
  return leftTick < rightTick ? -1 : leftTick > rightTick ? 1 : 0;
}

function checkedSum(left: number, right: number, field: string): number {
  const sum = left + right;
  if (!Number.isSafeInteger(sum)) {
    throw new MusicalTimeError(
      MUSICAL_TIME_ERROR_CODES.arithmeticOverflow,
      field,
      `${field} exceeds the safe integer range.`,
    );
  }
  return sum;
}

export function addDurations(left: DurationTicks, right: DurationTicks): DurationTicks {
  const validatedLeft = createDurationTicks(left);
  const validatedRight = createDurationTicks(right);
  return createDurationTicks(checkedSum(validatedLeft, validatedRight, "durationTicks"));
}

export function subtractDurations(
  minuend: DurationTicks,
  subtrahend: DurationTicks,
): DurationTicks {
  const validatedMinuend = createDurationTicks(minuend);
  const validatedSubtrahend = createDurationTicks(subtrahend);
  return createDurationTicks(validatedMinuend - validatedSubtrahend);
}

export function durationBetween(start: MusicalPosition, end: MusicalPosition): DurationTicks {
  return createDurationTicks(positionToTick(end) - positionToTick(start));
}

export function addDurationToPosition(
  position: MusicalPosition,
  duration: DurationTicks,
): MusicalPosition {
  const start = positionToTick(position);
  const validatedDuration = createDurationTicks(duration);
  const end = checkedSum(start, validatedDuration, "event.endTick");
  return tickToPosition(createTick(end));
}

export function validateEventRange(
  start: MusicalPosition,
  duration: DurationTicks,
): Readonly<{ startTick: Tick; endTick: Tick }> {
  const startTick = positionToTick(start);
  if (!isEventStartTick(startTick)) {
    throw new MusicalTimeError(
      MUSICAL_TIME_ERROR_CODES.invalidEventRange,
      "event.startTick",
      "event.startTick must be before the exclusive section end boundary.",
    );
  }

  try {
    const end = addDurationToPosition(start, duration);
    return Object.freeze({ startTick, endTick: positionToTick(end) });
  } catch (error) {
    if (error instanceof MusicalTimeError) {
      throw new MusicalTimeError(
        MUSICAL_TIME_ERROR_CODES.invalidEventRange,
        "event",
        "event must have positive duration and end at or before the section boundary.",
      );
    }
    throw error;
  }
}

export const SUBDIVISION_TICKS = Object.freeze({
  whole: createDurationTicks(3_840),
  half: createDurationTicks(1_920),
  quarter: createDurationTicks(960),
  eighth: createDurationTicks(480),
  sixteenth: createDurationTicks(240),
  thirtySecond: createDurationTicks(120),
  dottedWhole: createDurationTicks(5_760),
  dottedHalf: createDurationTicks(2_880),
  dottedQuarter: createDurationTicks(1_440),
  dottedEighth: createDurationTicks(720),
  dottedSixteenth: createDurationTicks(360),
  dottedThirtySecond: createDurationTicks(180),
  wholeTriplet: createDurationTicks(2_560),
  halfTriplet: createDurationTicks(1_280),
  quarterTriplet: createDurationTicks(640),
  eighthTriplet: createDurationTicks(320),
  sixteenthTriplet: createDurationTicks(160),
  thirtySecondTriplet: createDurationTicks(80),
});

export function serializeTick(tick: Tick): string {
  return JSON.stringify({
    schema: "nightdrive.tick.v1",
    ticks: createTick(tick),
  });
}

export function serializeDurationTicks(duration: DurationTicks): string {
  return JSON.stringify({
    schema: "nightdrive.duration-ticks.v1",
    ticks: createDurationTicks(duration),
  });
}

export function serializeMusicalPosition(position: MusicalPosition): string {
  const validated = createMusicalPosition(position);
  return JSON.stringify({
    schema: "nightdrive.musical-position.v1",
    bar: validated.bar,
    beat: validated.beat,
    tickWithinBeat: validated.tickWithinBeat,
  });
}

export function serializeTempo(tempo: Tempo): string {
  const validated = createTempoFromMicrosecondsPerQuarter(tempo.microsecondsPerQuarter);
  return JSON.stringify({
    schema: "nightdrive.tempo.v1",
    microsecondsPerQuarter: validated.microsecondsPerQuarter,
  });
}

export function serializeTimeSignature(timeSignature: TimeSignature): string {
  const validated = createTimeSignature(timeSignature.numerator, timeSignature.denominator);
  return JSON.stringify({
    schema: "nightdrive.time-signature.v1",
    numerator: validated.numerator,
    denominator: validated.denominator,
  });
}
