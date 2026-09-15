export type ArpMaskStepV1 = "on" | "rest";

export type ArpDensityMaskIdV1 =
  | "full"
  | "three-of-four"
  | "alternating-on-rest"
  | "alternating-rest-on"
  | "one-of-four";

export type ArpDensityMaskV1 = readonly [
  ArpMaskStepV1,
  ArpMaskStepV1,
  ArpMaskStepV1,
  ArpMaskStepV1,
];

export const ARP_DENSITY_MASK_CATALOG_V1 = Object.freeze({
  full: Object.freeze(["on", "on", "on", "on"]),
  "three-of-four": Object.freeze(["on", "on", "rest", "on"]),
  "alternating-on-rest": Object.freeze(["on", "rest", "on", "rest"]),
  "alternating-rest-on": Object.freeze(["rest", "on", "rest", "on"]),
  "one-of-four": Object.freeze(["on", "rest", "rest", "rest"]),
} satisfies Readonly<Record<ArpDensityMaskIdV1, ArpDensityMaskV1>>);

export function getArpDensityMaskV1(maskId: ArpDensityMaskIdV1): ArpDensityMaskV1 {
  if (!Object.hasOwn(ARP_DENSITY_MASK_CATALOG_V1, maskId)) {
    throw new Error("Arpeggiator density-mask catalog invariant failed.");
  }

  return ARP_DENSITY_MASK_CATALOG_V1[maskId];
}
