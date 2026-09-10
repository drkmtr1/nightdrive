# Synth profile and recipe model

## Purpose and boundary

Synth recipes help a producer recreate a role using instruments they own. They are structured targets plus explanation, not automated VST control. Initial candidates are Phase Plant, GForce Prophet-5, and justified FL Studio stock instruments; exact versions require verification during Stage 15.

## Synth profile

A versioned profile describes manufacturer/product/version scope; oscillator types/count and vocabulary; mixer/noise; filter types/routing; envelopes; LFO/modulation sources/destinations; unison/voice behavior; effects; normalized parameter names, units/ranges, and mapping notes; unsupported features; source/provenance/license; review date.

Do not guess proprietary parameter names. Values may be exact, normalized, categorical, or descriptive according to verified capabilities, and the type must say which.

## Recipe

A recipe contains schema/version, target synth profile version, musical role, intent tags, oscillator/mixer/filter/amplitude/modulation/effect/routing blocks, performance controls, safe gain note, ordered setup steps, expected sonic result, alternatives, assumptions, and links to composition observations. Structured data is authoritative; narrative is derived and schema-grounded.

## Validation and adaptation

Validate every referenced control against the profile, unit/range, modulation route, and required capability. Generic recipes use portable concepts and explicitly state manual mapping. Adapting between synths maps capabilities deterministically where possible and flags missing/approximate controls; AI cannot invent a mapping.

## Evaluation

Human review checks reproducibility of setup, role fit, actionability, correct vocabulary, unsafe level/routing advice, and whether the result approximates the described intent. Preserve synth/plugin version and reviewer notes. No recipe application or VST automation is in Version 1.
