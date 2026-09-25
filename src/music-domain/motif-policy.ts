import type {
  MotifPhrase4DisplacementV1,
  MotifPhraseRoleV1,
  MotifRegisterBandV1,
  MotifRhythmTemplateIdV1,
  MotifTensionModeV1,
} from "./motif-catalog";
import type { MotifProfileDataVersionV1 } from "./motif-profile-configuration";

export const MOTIF_POLICY_VERSION_V1 = "nightdrive.motif-policy.v1" as const;

export type ResolvedMotifPlanV1 = Readonly<{
  policyVersion: typeof MOTIF_POLICY_VERSION_V1;
  profileVersion: MotifProfileDataVersionV1;
  rhythmTemplate: MotifRhythmTemplateIdV1;
  registerBand: MotifRegisterBandV1;
  tensionMode: MotifTensionModeV1;
  phrase4Displacement: MotifPhrase4DisplacementV1;
  contourOffsets: readonly number[];
  phraseRoles: readonly [
    MotifPhraseRoleV1,
    MotifPhraseRoleV1,
    MotifPhraseRoleV1,
    MotifPhraseRoleV1,
  ];
}>;
