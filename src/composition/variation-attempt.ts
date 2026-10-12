// Compatibility entry. Full proof and private value construction share the
// invocation-local composition continuation; no raw constructor is exported.
export {
  serializeVariationAttemptV1,
  VARIATION_ATTEMPT_SCHEMA_V1,
  type VariationAttemptV1,
  VariationAttemptValueError,
  verifyVariationAttemptV1,
} from "./variation-original-state";
