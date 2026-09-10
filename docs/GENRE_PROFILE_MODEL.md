# Genre profile model

## Purpose

A genre profile is versioned structured configuration that bounds deterministic choices; it is not a claim that a genre has one objective formula. Initial profiles are Dark Synthwave, Classic Synthwave, Darkwave, and Midtempo Cyberpunk.

## Shape

A published immutable profile version includes stable ID/name/version/status; supported scales/keys and weighted defaults; BPM guidance as soft validated ranges; section mappings; harmonic templates/degrees/cadence/tension; voicing ranges/width/movement; allowed bass/arp archetypes and parameter bounds; motif range/density/leap/repetition rules; energy/complexity mappings; explanation labels; evaluation cases; provenance/authorship/license; engine/schema compatibility.

Weights are normalized by deterministic code and consumed with the explicit seed. Object key or database row order never determines a choice. Hard constraints, soft preferences, and display copy are separate.

## Mood and section mapping

Mood descriptors map to a small versioned parameter vocabulary (for example tension, brightness, density, register, rhythmic aggression). Section type maps to bounded energy/density/voicing/motif behaviors. AI may propose these parameters but cannot add unknown dimensions or bypass profile bounds.

## Governance

Profile changes create new versions and require deterministic fixtures plus structured musical review. Historical generation retains the exact version. Do not add dozens of genres; a new profile requires user need, distinct rule evidence, evaluation cases, maintenance owner, and roadmap/scope approval.

## Failure behavior

Unsupported combinations return an explanation and closest valid choices; they are not silently coerced. If hard profile constraints yield no valid candidate, generation returns a structured unsatisfiable error with constraint codes.
