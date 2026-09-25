export const MOTIF_CONTOUR_CATALOG_VERSION_V1 = "nightdrive.motif-contour.v1" as const;
export const MOTIF_RHYTHM_CATALOG_VERSION_V1 = "nightdrive.motif-rhythm.v1" as const;

export const MOTIF_RHYTHM_TEMPLATE_IDS_V1 = Object.freeze([
  "sparse-4",
  "steady-6",
  "active-8",
] as const);

export const MOTIF_REGISTER_BANDS_V1 = Object.freeze(["lower", "middle", "upper"] as const);
export const MOTIF_TENSION_MODES_V1 = Object.freeze(["chordal", "diatonic-passing"] as const);
export const MOTIF_PHRASE4_DISPLACEMENTS_V1 = Object.freeze([
  "none",
  "earlier-480",
  "later-480",
] as const);
export const MOTIF_PHRASE_ROLES_V1 = Object.freeze([
  "identity",
  "motif-form-repetition",
  "harmony-aware-transposition",
  "contour-preserving-response",
] as const);

export type MotifRhythmTemplateIdV1 = (typeof MOTIF_RHYTHM_TEMPLATE_IDS_V1)[number];
export type MotifRegisterBandV1 = (typeof MOTIF_REGISTER_BANDS_V1)[number];
export type MotifTensionModeV1 = (typeof MOTIF_TENSION_MODES_V1)[number];
export type MotifPhrase4DisplacementV1 = (typeof MOTIF_PHRASE4_DISPLACEMENTS_V1)[number];
export type MotifPhraseRoleV1 = (typeof MOTIF_PHRASE_ROLES_V1)[number];
export type MotifDurationTicksV1 = 480 | 960;

export type MotifRhythmTemplateV1 = Readonly<{
  relativeOnsetGridIndices: readonly number[];
  durationsTicks: readonly MotifDurationTicksV1[];
  contourOffsets: readonly number[];
  displacementEventOrdinal: number;
}>;

function freezeTemplate(
  relativeOnsetGridIndices: readonly number[],
  durationsTicks: readonly MotifDurationTicksV1[],
  contourOffsets: readonly number[],
  displacementEventOrdinal: number,
): MotifRhythmTemplateV1 {
  return Object.freeze({
    relativeOnsetGridIndices: Object.freeze([...relativeOnsetGridIndices]),
    durationsTicks: Object.freeze([...durationsTicks]),
    contourOffsets: Object.freeze([...contourOffsets]),
    displacementEventOrdinal,
  });
}

export const MOTIF_RHYTHM_CATALOG_V1 = Object.freeze({
  "sparse-4": freezeTemplate([0, 4, 8, 12], [960, 960, 960, 960], [0, 1, 2, 0], 1),
  "steady-6": freezeTemplate(
    [0, 2, 4, 7, 10, 14],
    [960, 480, 960, 480, 960, 960],
    [0, 1, 2, 1, 2, 0],
    3,
  ),
  "active-8": freezeTemplate(
    [0, 2, 4, 6, 8, 10, 12, 14],
    [480, 480, 480, 480, 480, 480, 480, 480],
    [0, 1, 2, 3, 2, 3, 1, 0],
    3,
  ),
} satisfies Readonly<Record<MotifRhythmTemplateIdV1, MotifRhythmTemplateV1>>);

export function getMotifRhythmTemplateV1(
  templateId: MotifRhythmTemplateIdV1,
): MotifRhythmTemplateV1 {
  if (!Object.hasOwn(MOTIF_RHYTHM_CATALOG_V1, templateId)) {
    throw new Error("Motif rhythm catalog invariant failed.");
  }

  return MOTIF_RHYTHM_CATALOG_V1[templateId];
}
