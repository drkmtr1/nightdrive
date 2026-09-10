const prngStateBrand: unique symbol = Symbol("Mulberry32State");

export type Mulberry32State = number & { readonly [prngStateBrand]: true };

export const PRNG_ALGORITHM_ID = "nightdrive.prng.mulberry32.v1" as const;
const UINT32_MAX = 0xffff_ffff;
const STATE_INCREMENT = 0x6d2b_79f5;

export const PRNG_ERROR_CODES = {
  notFinite: "NOT_FINITE",
  notInteger: "NOT_INTEGER",
  outOfRange: "OUT_OF_RANGE",
  unsafeInteger: "UNSAFE_INTEGER",
} as const;

export type PrngErrorCode = (typeof PRNG_ERROR_CODES)[keyof typeof PRNG_ERROR_CODES];

export class PrngValueError extends RangeError {
  readonly code: PrngErrorCode;
  readonly field: string;

  constructor(code: PrngErrorCode, field: string, message: string) {
    super(message);
    this.name = "PrngValueError";
    this.code = code;
    this.field = field;
  }
}

function validateUint32(value: number, field: string): void {
  if (!Number.isFinite(value)) {
    throw new PrngValueError(PRNG_ERROR_CODES.notFinite, field, `${field} must be finite.`);
  }
  if (!Number.isInteger(value)) {
    throw new PrngValueError(PRNG_ERROR_CODES.notInteger, field, `${field} must be an integer.`);
  }
  if (!Number.isSafeInteger(value)) {
    throw new PrngValueError(
      PRNG_ERROR_CODES.unsafeInteger,
      field,
      `${field} must be a safe integer.`,
    );
  }
  if (value < 0 || value > UINT32_MAX) {
    throw new PrngValueError(
      PRNG_ERROR_CODES.outOfRange,
      field,
      `${field} must be in the uint32 range.`,
    );
  }
}

export function createMulberry32State(seed: number): Mulberry32State {
  validateUint32(seed, "prng.seed");
  return seed as Mulberry32State;
}

export type Mulberry32Step = Readonly<{
  state: Mulberry32State;
  value: number;
}>;

export function nextMulberry32(state: Mulberry32State): Mulberry32Step {
  const nextState = ((validateAndReturn(state, "prng.state") + STATE_INCREMENT) >>>
    0) as Mulberry32State;
  let t: number = nextState;
  t = Math.imul(t ^ (t >>> 15), t | 1) >>> 0;
  t = (t ^ ((t + Math.imul(t ^ (t >>> 7), t | 61)) >>> 0)) >>> 0;
  return Object.freeze({ state: nextState, value: (t ^ (t >>> 14)) >>> 0 });
}

function validateAndReturn(value: number, field: string): number {
  validateUint32(value, field);
  return value;
}
