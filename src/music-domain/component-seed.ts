export type ComponentSeedComponentIdV1 = "harmony" | "bass" | "arpeggiator" | "motif";

export type ComponentSeedErrorCode = "INVALID_ROOT_SEED" | "INVALID_COMPONENT_ID";

export type ComponentSeedErrorField = "rootSeed" | "componentId";

export class ComponentSeedValueError extends RangeError {
  readonly code: ComponentSeedErrorCode;
  readonly field: ComponentSeedErrorField;

  constructor(code: ComponentSeedErrorCode, field: ComponentSeedErrorField, message: string) {
    super(message);
    this.name = "ComponentSeedValueError";
    this.code = code;
    this.field = field;
  }
}

const UINT32_MAX = 0xffff_ffff;
const DOMAIN_TAG = "nightdrive.seed-derivation.component.v1";
const DOMAIN_TAG_BYTES = new TextEncoder().encode(DOMAIN_TAG);
const UTF8_ENCODER = new TextEncoder();
const MURMUR_C1 = 0xcc9e_2d51;
const MURMUR_C2 = 0x1b87_3593;

function invalidRootSeed(): never {
  throw new ComponentSeedValueError(
    "INVALID_ROOT_SEED",
    "rootSeed",
    "rootSeed must be a finite safe integer in the uint32 range.",
  );
}

function invalidComponentId(): never {
  throw new ComponentSeedValueError(
    "INVALID_COMPONENT_ID",
    "componentId",
    "componentId must be an exact Stage 7C3 V1 component identifier.",
  );
}

function validateRootSeed(rootSeed: unknown): asserts rootSeed is number {
  if (
    typeof rootSeed !== "number" ||
    !Number.isFinite(rootSeed) ||
    !Number.isInteger(rootSeed) ||
    !Number.isSafeInteger(rootSeed) ||
    rootSeed < 0 ||
    rootSeed > UINT32_MAX
  ) {
    invalidRootSeed();
  }
}

function validateComponentId(
  componentId: unknown,
): asserts componentId is ComponentSeedComponentIdV1 {
  if (
    componentId !== "harmony" &&
    componentId !== "bass" &&
    componentId !== "arpeggiator" &&
    componentId !== "motif"
  ) {
    invalidComponentId();
  }
}

function createCanonicalInputBytes(
  rootSeed: number,
  componentId: ComponentSeedComponentIdV1,
): Uint8Array {
  const componentIdBytes = UTF8_ENCODER.encode(componentId);
  const bytes = new Uint8Array(DOMAIN_TAG_BYTES.length + 1 + 4 + 1 + componentIdBytes.length);
  let offset = 0;

  bytes.set(DOMAIN_TAG_BYTES, offset);
  offset += DOMAIN_TAG_BYTES.length;
  bytes[offset] = 0;
  offset += 1;
  bytes[offset] = rootSeed & 0xff;
  bytes[offset + 1] = (rootSeed >>> 8) & 0xff;
  bytes[offset + 2] = (rootSeed >>> 16) & 0xff;
  bytes[offset + 3] = (rootSeed >>> 24) & 0xff;
  offset += 4;
  bytes[offset] = componentIdBytes.length;
  offset += 1;
  bytes.set(componentIdBytes, offset);

  return bytes;
}

function rotateLeft32(value: number, shift: number): number {
  return ((value << shift) | (value >>> (32 - shift))) >>> 0;
}

function mixMurmurBlock(value: number): number {
  let mixed = Math.imul(value, MURMUR_C1) >>> 0;
  mixed = rotateLeft32(mixed, 15);
  return Math.imul(mixed, MURMUR_C2) >>> 0;
}

function murmurHash3X86_32(bytes: Uint8Array): number {
  let hash = 0;
  const blockLength = bytes.length - (bytes.length % 4);

  for (let offset = 0; offset < blockLength; offset += 4) {
    const block =
      ((bytes[offset] ?? 0) |
        ((bytes[offset + 1] ?? 0) << 8) |
        ((bytes[offset + 2] ?? 0) << 16) |
        ((bytes[offset + 3] ?? 0) << 24)) >>>
      0;
    hash = (hash ^ mixMurmurBlock(block)) >>> 0;
    hash = rotateLeft32(hash, 13);
    hash = (Math.imul(hash, 5) + 0xe654_6b64) >>> 0;
  }

  const tailLength = bytes.length - blockLength;
  let tail = 0;
  if (tailLength >= 3) tail = (tail ^ ((bytes[blockLength + 2] ?? 0) << 16)) >>> 0;
  if (tailLength >= 2) tail = (tail ^ ((bytes[blockLength + 1] ?? 0) << 8)) >>> 0;
  if (tailLength >= 1) {
    tail = (tail ^ (bytes[blockLength] ?? 0)) >>> 0;
    hash = (hash ^ mixMurmurBlock(tail)) >>> 0;
  }

  hash = (hash ^ bytes.length) >>> 0;
  hash = (hash ^ (hash >>> 16)) >>> 0;
  hash = Math.imul(hash, 0x85eb_ca6b) >>> 0;
  hash = (hash ^ (hash >>> 13)) >>> 0;
  hash = Math.imul(hash, 0xc2b2_ae35) >>> 0;
  hash = (hash ^ (hash >>> 16)) >>> 0;
  return hash >>> 0;
}

export function deriveComponentSeedV1(
  rootSeed: number,
  componentId: ComponentSeedComponentIdV1,
): number {
  validateRootSeed(rootSeed);
  validateComponentId(componentId);
  return murmurHash3X86_32(createCanonicalInputBytes(rootSeed, componentId));
}
