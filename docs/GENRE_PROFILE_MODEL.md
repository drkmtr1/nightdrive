# Genre profile model

## Purpose

A genre profile is versioned structured configuration that bounds deterministic choices; it is not a claim that a genre has one objective formula. Initial profiles are Dark Synthwave, Classic Synthwave, Darkwave, and Midtempo Cyberpunk.

## Shape

A published immutable profile version includes stable ID/name/version/status; supported scales/keys and weighted defaults; BPM guidance as soft validated ranges; section mappings; harmonic templates/degrees/cadence/tension; voicing ranges/width/movement; allowed bass/arp archetypes and parameter bounds; motif range/density/leap/repetition rules; energy/complexity mappings; explanation labels; evaluation cases; provenance/authorship/license; engine/schema compatibility.

Weights are normalized by deterministic code and consumed with the explicit seed. Object key or database row order never determines a choice. Hard constraints, soft preferences, and display copy are separate.

## Mood and section mapping

Mood descriptors map to a small versioned parameter vocabulary (for example tension, brightness, density, register, rhythmic aggression). Section type maps to bounded energy/density/voicing/motif behaviors. AI may propose these parameters but cannot add unknown dimensions or bypass profile bounds.

## Stage 7C Arpeggiator policy candidates

The Stage 7C policy resolver may select only from the allowed set in the active immutable profile version. Preferred sets rank or weight allowed candidates; they do not bypass Arpeggiator validation. These candidates are Nightdrive policy hypotheses for structured evaluation, not claims that a genre has one objectively correct formula.

| Profile | Rate allowed / preferred | Direction allowed / preferred | Octave range allowed / preferred | Density tendency | Gate tendency |
|---|---|---|---|---|---|
| Dark Synthwave | `eighth`, `sixteenth` / `sixteenth` | `down`, `down-up`, `up-down` / `down-up`, `down` | `1`, `2` / `2` | medium-high to full | short to medium |
| Classic Synthwave | `eighth`, `sixteenth` / `sixteenth` | `up`, `up-down`, `down-up` / `up`, `up-down` | `1`, `2` / `2` | high to full | medium-short |
| Darkwave | `quarter`, `eighth` / `eighth` | `up`, `down`, `up-down` / `up`, `down` | `1`, `2` / `1` | sparse to medium | medium to long |
| Midtempo Cyberpunk | `eighth`, `sixteenth` / both allowed values pending evaluated weighting | all four V1 directions / `down-up`, `up-down` | `1`, `2` / both allowed values pending evaluated weighting | patterned or syncopated medium-high | short |

Rate, direction, and octave entries above are bounded candidate sets. Density and gate descriptions are qualitative tendencies only: they are not canonical mask IDs, exact `gateTicks`, weights, probabilities, or executable mappings. The exact V1 mask catalog, gate candidates, candidate order, and integer weights require a separately reviewed contract and deterministic fixtures before implementation.

Energy and complexity operate only through these profile bounds. Higher Classic Synthwave energy may bias toward sixteenth rate, octave range `2`, and fuller masks. Higher Darkwave energy should bias density before widening the register. Higher Midtempo Cyberpunk complexity may bias mask complexity rather than merely note count. No numeric threshold or input scale is invented here; exact mappings require the authoritative energy/complexity domain and profile-version review. These inputs never mutate canonical notes directly.

## Governance

Profile changes create new versions and require deterministic fixtures plus structured musical review. Historical generation retains the exact version. Do not add dozens of genres; a new profile requires user need, distinct rule evidence, evaluation cases, maintenance owner, and roadmap/scope approval.

## Failure behavior

Unsupported combinations return an explanation and closest valid choices; they are not silently coerced. If hard profile constraints yield no valid candidate, generation returns a structured unsatisfiable error with constraint codes.
