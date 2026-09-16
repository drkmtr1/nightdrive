// @vitest-environment node

import { describe, expect, it, vi } from "vitest";

vi.mock("./arpeggiator-policy-configuration", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./arpeggiator-policy-configuration")>();
  return {
    ...actual,
    SHARED_ARP_POLICY_CONFIGURATION_V1: Object.freeze({
      ...actual.SHARED_ARP_POLICY_CONFIGURATION_V1,
      compatibleProfileDataVersion: "nightdrive.genre-profile.arpeggiator.future-test",
    }),
  };
});

import { ARP_ERROR_CODES, ArpValueError } from "./arpeggiator";
import {
  ARP_POLICY_VERSION_V1,
  ARP_PROFILE_DATA_VERSION_V1,
} from "./arpeggiator-policy-configuration";
import {
  COMPONENT_SEED_DERIVATION_VERSION_V1,
  generateArpEventsWithPolicyV1,
} from "./arpeggiator-policy-generator";
import { HARMONY_PROFILE_IDS } from "./harmony";
import { PRNG_ALGORITHM_ID } from "./prng";

describe("Stage 7C profile/policy compatibility precedence", () => {
  it("rejects an unsupported policy version before evaluating pair compatibility", () => {
    try {
      generateArpEventsWithPolicyV1({
        progression: undefined,
        range: undefined,
        intent: { energy: "medium", complexity: "medium" },
        profile: {
          id: HARMONY_PROFILE_IDS.classicSynthwave,
          version: ARP_PROFILE_DATA_VERSION_V1,
        },
        policy: { version: "future" },
        seedDerivation: { version: COMPONENT_SEED_DERIVATION_VERSION_V1 },
        prng: { version: PRNG_ALGORITHM_ID },
        rootSeed: 0,
      } as never);
      throw new Error("Expected an ArpValueError.");
    } catch (error) {
      expect(error).toBeInstanceOf(ArpValueError);
      expect(error).toMatchObject({
        code: ARP_ERROR_CODES.unsupportedArpPolicyVersion,
        field: "policy.version",
      });
    }
  });

  it("rejects an individually supported but undeclared pair before an invalid root seed", () => {
    try {
      generateArpEventsWithPolicyV1({
        progression: undefined,
        range: undefined,
        intent: { energy: "medium", complexity: "medium" },
        profile: {
          id: HARMONY_PROFILE_IDS.classicSynthwave,
          version: ARP_PROFILE_DATA_VERSION_V1,
        },
        policy: { version: ARP_POLICY_VERSION_V1 },
        seedDerivation: { version: COMPONENT_SEED_DERIVATION_VERSION_V1 },
        prng: { version: PRNG_ALGORITHM_ID },
        rootSeed: -1,
      } as never);
      throw new Error("Expected an ArpValueError.");
    } catch (error) {
      expect(error).toBeInstanceOf(ArpValueError);
      expect(error).toMatchObject({
        code: ARP_ERROR_CODES.incompatibleArpProfilePolicy,
        field: "policy.version",
      });
    }
  });
});
