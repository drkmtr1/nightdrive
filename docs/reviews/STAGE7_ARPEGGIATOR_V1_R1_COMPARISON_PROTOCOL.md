# Stage 7 matched V1/R1 comparison protocol

## Authority, identity, and status

Protocol identity: `nightdrive.stage7-arpeggiator-v1-r1-comparison.v1`.

Status: specification complete, review-pending. The Product Owner approved Option C roots/burden, a Product Owner musical-acceptance path, and qualitative disposition permitting mixed or unchanged findings. This document freezes the resulting design for review; artifact generation and listening are not yet authorized. R1 is not musically accepted and Stage 7 is not complete.

This protocol implements the comparison gate in [ADR-021](../DECISIONS.md#adr-021--retain-profile-data-ownership-for-the-stage-7-intent-comparison), under the [evaluation plan](../EVALUATION_PLAN.md) and [testing strategy](../TESTING_STRATEGY.md#stage-7-successor-compatibility-and-accepted-r1-dataset--future-gates). It does not change ADR-019/020/021, runtime, musical semantics, or R1. The original `nightdrive.stage7-arpeggiator-evaluation.v1` [baseline protocol](STAGE7_ARPEGGIATOR_EVALUATION_PROTOCOL.md) and [locked results](STAGE7_ARPEGGIATOR_EVALUATION_RESULTS.md) remain immutable historical evidence, not superseded or rerun as new baseline evidence. Their usability anchors and setup controls are incorporated below; their 28-fixture matrix and reveal procedure do not replace this comparison's matrix and staged reveal.

The question is whether unchanged R1/V2 improves useful perceived Energy activity/intensity and coherent Complexity intricacy/variation, with acceptable individual usability and recognizably related seed behavior. Audible difference alone is insufficient. This is single-reviewer, product-specific Product Owner evidence: no population preference, genre authenticity, complete-song/mix quality, statistical generalization, universal monotonicity, zero-collision, or universal R1-dominance claim follows.

## Matched source and replay contract

Use the four [golden-case source records](STAGE7_ARPEGGIATOR_GOLDEN_CASES.md) in this canonical order: `dark-synthwave-chorus-001`, `classic-synthwave-chorus-001`, `darkwave-verse-001`, `cyberpunk-build-001`. These map to Dark Synthwave, Classic Synthwave, Darkwave, and Midtempo Cyberpunk respectively. Reconstruct their exact existing Harmony template/version, tonic `0`, scale, selected voicings, and inclusive Arp range `0..127`; introduce no new Harmony context. Section-role labels remain metadata.

Every matched pair holds identical Harmony, profile ID, tonic, scale, range, Energy, Complexity, root, component-seed derivation, PRNG, Chords, transport, and listening setup. Only accepted profile/policy lineage differs:

| Lineage | Public operation | Profile-data identity | Policy identity |
|---|---|---|---|
| V1 | `generateArpEventsWithPolicyV1` | `nightdrive.genre-profile.arpeggiator.v1` | `nightdrive.arpeggiator-policy.v1` |
| R1 | `generateArpEventsWithPolicyV2` | `nightdrive.genre-profile.arpeggiator.v2` | `nightdrive.arpeggiator-policy.v2` |

Both require `nightdrive.seed-derivation.component.v1`, fixed internal component `arpeggiator`, and `nightdrive.prng.mulberry32.v1`. Preserve the five draws in rate, octave-range, direction, mask, gate order, including singleton decisions. Use the accepted public operations, assembler, and serializer; no alternate musical selection or projection path is permitted. The [R1 record](STAGE7_ARPEGGIATOR_V2_CALIBRATION.md) owns the literals and research fingerprint `b6f7ee16f33cf649ae2c6f06e4b5eecf859409b1917e2bc641323857fc1956e8`; do not copy or retune its tables here.

Reuse the [audition-artifact contract](STAGE7_ARPEGGIATOR_AUDITION_ARTIFACT.md): conductor/Chords/Arp only, 960 PPQ, 4/4, eight bars ending at tick `30720`, 120 BPM, note-on velocity `100`, Chords channel `0`, Arp channel `2`, and no program/instrument/effect messages. Within a pair, Chords and conductor data must be identical. Cross-profile Harmony differences prevent attributing cross-profile differences solely to Arpeggiator policy. Historical runtime-unimplemented wording in earlier checkpoints does not override the accepted public operations recorded in current project state.

## Frozen roots and intent matrix

Complete-panel roots, in order: `0`, `2048`, `2049`. Additional medium/medium seed-relatedness roots, in order: `1`, `2`. V1 and R1 always share the root within a pair. No replacement, root search, output-based exclusion, or tuning is permitted after commitment, including for unfavorable, identical, or invalid-to-audition outcomes.

Root `0` provides baseline continuity. The original V1 endpoint/M/M fixtures at root `0` and M/M fixtures at roots `1,2` have baseline listening exposure; this does not imply every new intermediate condition was heard. Roots `0..2047` are documented examined research evidence. Roots `2048,2049` are the first two integers beyond that range and are prospectively committed before this comparison's generation/listening, not guaranteed untouched historical holdouts. The custodian records known prior exposure per source fixture as YES/NO/UNKNOWN with explanation; the blind workbook records only the evaluator's self-reported recognition/exposure, never prefilled lineage-identifying exposure. Reconcile both after reveal. Unfamiliarity must not be inferred from an opaque label. R1-REV-001 remains PARTIALLY CLOSED: historical search, finalist selection, and no-retuning chronology remain unreproduced.

Levels are ordered `very-low`, `low`, `medium`, `high`, `very-high`; below, VL/L/M/H/VH are exact aliases. At each complete-panel root and profile, use these nine distinct `(Energy, Complexity)` conditions in canonical order:

`(VL,M), (L,M), (M,M), (H,M), (VH,M), (M,VL), (M,L), (M,H), (M,VH)`.

The Energy panel uses all five Energy levels at Complexity M. The Complexity panel uses all five Complexity levels at Energy M. Each evaluates VL-to-L, L-to-M, M-to-H, H-to-VH and overall control; overall interpretation also records VL/M/VH continuity. Medium/medium is one fixture per lineage/profile/root reused across panels, not duplicated in the source matrix. Seed panels use M/M at roots `0,1,2` for each profile and lineage; roots `2048,2049` are not substituted into that seed panel.

## Regression panels and mandatory limitations

The [accepted calibration regression table](STAGE7_ARPEGGIATOR_V2_CALIBRATION.md#deterministic-research-evidence-and-limitations) defines nine Midtempo adjacent event-collision regressions, each measured over roots `1024..2047`. Retain those aggregate facts in the evidence report even when the approved human roots do not exhibit them. Two relationships already belong to the main Complexity panel at Energy M: M-to-H (`53 -> 61`) and H-to-VH (`60 -> 61`). Add the following seven two-level panels at each complete-panel root, in this exact canonical order:

| ID | Varying axis | Fixed other level | Ordered levels | Historical V1 -> R1 collisions / 1024 |
|---|---|---|---|---|
| X1 | Energy | Complexity VL | L, M | 166 -> 180 |
| X2 | Energy | Complexity L | L, M | 170 -> 194 |
| X3 | Energy | Complexity H | L, M | 167 -> 182 |
| X4 | Complexity | Energy L | VL, L | 40 -> 46 |
| X5 | Complexity | Energy H | VL, L | 55 -> 56 |
| X6 | Complexity | Energy H | M, H | 59 -> 71 |
| X7 | Complexity | Energy VH | H, VH | 76 -> 80 |

Unioning their conditions with Midtempo's nine main conditions adds exactly eight `(Energy, Complexity)` tuples, ordered `(L,VL), (L,L), (L,H), (H,VL), (H,L), (H,H), (VH,H), (VH,VH)`. Reuse fixtures across panels. Coverage is of all documented regression relationships, not a guarantee that every sampled root exhibits the aggregate regression. Do not search for a more favorable or more dramatic example.

The results must explicitly disposition Midtempo root-zero M/VH Energy equality; Classic Synthwave compressed VL/L Energy and intermediate Complexity limitations; Darkwave VL/VH Complexity event collisions `66/1024 -> 70/1024`; all nine Midtempo regressions; and the five historical V1 Midtempo projection collapses on roots `0..255` described in the locked results and accepted diagnostic. The latter reflect different plans yielding equal events under accepted masking/projection, not a runtime defect. Include the unchanged Darkwave Energy control and medium/medium anchors. No sampled absence erases a historical limitation; no collision count, pitch-span, note-count, entropy, or plan-diversity measure becomes a musical score.

## Counts and burden

| Source group | Calculation | Versioned fixtures |
|---|---|---:|
| Main axes | 4 profiles x 3 roots x 9 conditions x 2 lineages | 216 |
| Additional Midtempo conditions | 3 roots x 8 conditions x 2 lineages | 48 |
| Additional seed-relatedness conditions | 4 profiles x 2 roots x 2 lineages | 16 |
| Total | 140 source units, each with V1 and R1 | 280 |

Equal output bytes do not remove a source unit or versioned fixture. There are 24 main panels (4 profiles x 3 roots x 2 axes), 21 extra panels (3 roots x 7), and 4 seed panels: 49 total. Main panels yield 96 adjacent comparative judgments; extra panels add 21. These are repeated/correlated observations, not independent statistical trials.

At 120 BPM each eight-bar rendition takes 16 seconds. Pass 1 minimum is `280 x 16 = 4480` seconds. Pass 2 minimum is `(24 x 10 + 21 x 4 + 4 x 6) x 16 = 5568` seconds, because every panel presents both lineages and its ordered levels/roots once, including reused fixtures. Total is `10048` seconds = **167 minutes 28 seconds**. This excludes imports, resets, ratings, breaks, invalid trials, transitions, and optional replay. Both complete passes with every allowed repeat would double raw playback; no precise real-world completion time is promised.

## Concealed mapping and deterministic presentation

The custodian, not the listening evaluator, holds source identities, lineage mapping, randomization inputs, and machine results until the specified reveal. Evaluator-facing materials contain no V1/R1 labels, source filenames, profile/policy versions, hashes that identify lineage, hidden worksheets/comments, or ordering recipe. Public availability of source or prior familiarity can weaken blinding: instruct the evaluator not to reconstruct the mapping or inspect generator output/code, record suspected recognition or accidental disclosure, and never claim guaranteed perceptual blinding. Disclosure is an incident, not grounds for replacing a root.

Canonical source units are: first profiles in golden-case order, then complete roots in the order above, then nine main tuples; next Midtempo complete roots then eight extra tuples; finally profiles then additional roots `1,2` at M/M. Expand each unit as V1 then R1 to form 280 records. The concealed source key binds protocol, golden-case ID, Energy, Complexity, decimal root, and lineage; the full record additionally binds Harmony and all replay/setup identities. No musical data is encoded in opaque labels.

Use three independent presentation-only `nightdrive.prng.mulberry32.v1` streams, initialized once per package: individual order seed `0`, panel order seed `1`, and A/B assignment seed `2`. None derives a component seed, shares state with generation, or changes musical roots. Each shuffle is descending Fisher-Yates: for `i = length - 1` down to `1`, consume one uint32, set `j = output % (i + 1)`, and swap indices `i,j`. No rejection sampling, reseeding during a shuffle, ambient randomness, or manual reordering.

1. Shuffle the 280-record canonical list with stream 0. Assign `ND7C-001` through `ND7C-280` in shuffled order and use these `.mid` filenames for both passes. Pass 1 contains exactly 140 fixtures per lineage with no lineage grouping imposed.
2. Form canonical panels: profiles, then complete roots, then Energy and Complexity; then Midtempo roots, then X1 through X7; then four seed panels in profile order. Before panel shuffling, assign panel-local A/B roles with stream 2: shuffle a 24-item pool containing 12 V1 and then 12 R1 entries for main-panel A roles; next shuffle a 21-item pool containing 11 V1 and then 10 R1 for extra-panel A roles; next shuffle a four-item pool containing two V1 and then two R1 for seed-panel A roles. Consume this one stream continuously across the three pools. B is always the other lineage. Assign each pool to its stratum's canonical panels in order.
3. Shuffle the complete 49-panel list with stream 1 and assign opaque panel IDs `ND7C-P001` through `ND7C-P049`. A/B is consistent within a panel, not a global lineage alias. Present A first then B at each ordered level/root. Thus each panel stratum is balanced as evenly as possible: 25 V1-first versus 24 R1-first panels overall. This is panel first-position balance, not a claim of independent observations or balanced recognition.

Freeze the complete mapping and orders before output inspection/listening. The concealed mapping links each opaque fixture and panel/role to the source unit and full lineage. Duplicate bytes remain separate labels and judgments; do not remove, rename, or consolidate them to reveal equality. MIDI uses only accepted generic Conductor/Chords/Arp names and no source/version metadata. Metadata/file/workbook inspection must verify no additional identity leakage.

## Pass 1: individual usability and lock

Use the baseline protocol's [exact eight Pass 1 fields and anchors](STAGE7_ARPEGGIATOR_EVALUATION_PROTOCOL.md#exact-pass-1-fields-and-response-anchors), incorporated unchanged: Arp clarity; rhythmic fit; pattern coherence; register fit; repetition usability; keep/develop; severe issue; comment. Preserve its exact categorical vocabularies and explanation requirements, including Obscured/Marginal handling and Not assessable. No numeric scores or profile/section plausibility score is added.

Present all 280 fixtures independently in ND7C order, with one uninterrupted initial listen and at most one complete replay before locking the row. No A/B comparison, deliberate replay of completed rows, external reference music, or source/lineage reveal. Record reviewer expertise/context, consent, session UTC times, monitoring environment, per-fixture prior exposure, playback/replay counts, incidents, and row status. Status begins Incomplete and becomes Complete only when required fields/explanations exist; record invalid attempts separately. Use the corrected [listening setup](STAGE7_ARPEGGIATOR_LISTENING_SETUP.md#stage-7-blind-fixture-piano-roll-import-and-reset) for every rendition, including resets between repeats.

Keep instruments, 0 dB faders, effects-free routing, 120 BPM/4/4, and monitoring level fixed. Close without saving and reopen the empty corrected template between renditions; verify the exact Chords/Arp imports and setup. Setup-invalid trials produce no musical rating: record incident, reset, retry the same opaque fixture. Persistent apparatus problems stop the session without substituting fixtures or changing the setup silently. Setup-valid musical problems remain evidence. Stop when fatigue affects judgment and take a planned break at least halfway through each long session; continue the frozen order over as many sessions as needed.

After all 280 rows are complete, validate them, preserve the original workbook/form and normalized JSON responses, hash both, and declare Pass 1 LOCKED in a dated lock record. Only then release the Pass 2 grouping: profile/context, ordered intent settings or seed roots, panel-local A/B roles, and opaque file references. Keep actual lineage, diagnostic outcomes, and source mapping concealed. Do not revise Pass 1 after grouped listening; clerical corrections are append-only amendments preserving originals.

## Pass 2: comparisons and response instrument

Follow ND7C-P order. For each panel, perform the full sequence A then B at each ascending intent level or seed `0,1,2`. One complete panel presentation plus at most one complete repeat is allowed; the repeat uses the same order. Direct A/B comparison is permitted within these complete presentations, not unlimited looping or selected-fragment replay. Main panels contain ten renditions, extra panels four, seed panels six. Apply the same import/reset, setup-validity, fatigue, and incident rules; a validity-affecting interruption invalidates that attempt and requires the same panel to restart after reset. Record playback counts. No additional roots or ad hoc panels.

For each main panel record four adjacent comparisons, an overall axis comparison including endpoint interpretation, and a usability-tradeoff comparison. Each extra panel records its specified adjacent comparison and usability tradeoff. Every comparison uses this exact symmetric vocabulary:

| Response | Anchor |
|---|---|
| A clearly better | A provides a convincing, materially useful advantage on the stated criterion. |
| A somewhat better | A provides a modest but useful advantage with qualifications. |
| No meaningful difference | Neither provides a useful advantage; differences may be audible but immaterial. |
| B somewhat better | B provides a modest but useful advantage with qualifications. |
| B clearly better | B provides a convincing, materially useful advantage on the stated criterion. |
| Mixed/tradeoff | Advantages and disadvantages prevent a single directional judgment. |
| Not assessable | Reliable evidence is insufficient to judge; this is not a tie. |

Energy means useful and convincing low-to-high control of perceived Arp activity/intensity while remaining usable. Complexity means useful and convincing low-to-high control of coherent intricacy/variation while remaining usable, never note count, pitch span, entropy, collisions, or raw plan diversity alone. Usability means material the producer would retain/develop, considering incoherence, masking/register, repetition, and timing/density/gate problems. For every comparative response require a concise explanation naming the relevant levels/roles and audible evidence; there is no neutral-explanation exemption. Equal or improved distinction without useful control does not earn a better response.

Also record each role's overall axis tendency using the baseline Energy/Complexity anchors Clearly yes, Somewhat, Unclear, Counterintuitive, plus Not assessable for insufficient reliable perception. This prevents equal-but-poor control from being mistaken for adequate control. For seed panels, use the baseline seed anchors unchanged for each role: Clearly same profile, Mostly same, Mixed, Materially inconsistent; add Not assessable only when reliable perception is insufficient. Ask whether roots remain recognizably related and useful, not whether every root is unique. Record a comparative seed-relatedness response and a usability tradeoff on the symmetric scale, both explained. No cross-profile genre score is collected.

Complete and lock all 49 panel responses with normalized export and exact hashes before revealing lineage. Reveal via a separate dated record binding both locks and the concealed mapping hash. Preserve original A/B judgments and derive V1/R1 interpretations from the mapping; never overwrite labels/responses retrospectively. After reveal, disposition the full known-limitations ledger against the locked evidence without additional listening or edited blind judgments. Missing/Not assessable evidence remains explicit; inadequate evidence pauses the acceptance decision and requires separately authorized follow-up, not an invented rating.

## Machine gates and future artifact ownership

Before artifact generation, require accepted protocol and separate generation authorization, a frozen input-only source manifest/design lock, and a deterministic evidence report binding the exact generating commit/toolchain and authoritative source-document hashes. Output lengths/hashes are not claimed in this input lock; the later generated manifest references it and adds output evidence without overwriting it. Recompute the R1 fingerprint by the calibration record's specified JSON method. Bind exact V1/V2 pairs, golden contexts, approved roots, all intent tuples/panels, seed derivation/PRNG, presentation seeds/algorithms, instrument, invalid-trial rules, and setup identities. Retained evidence may be referenced only with its source commit and applicability explained; distinguish it from newly executed checks.

The report must establish literal R1 data and all 500 candidate lists, exact compatibility routing and V1 replay isolation, unchanged five draws/selector/projector, 40 medium source rows, 20 medium/medium lists, and 25 Darkwave Energy lists. Retain reproducible plan/event collision evidence with denominators, contexts/range/root sets, all nine regressions, and projection-collapse explanation; no research rerun or musical-improvement percentage is introduced. Related AC-004/011/013 deterministic evidence remains scoped to replay/event conformance, not full Stage 7 acceptance.

Before listening, a separately reviewed package lock must additionally prove exact 280 fixtures/140 pairs/49 panels; bijective labels/roles; prescribed shuffles; repeated byte-identical outputs; semantic public-output-to-MIDI mapping; matching Chords/transport within pairs; absence of lineage metadata; and exact hashes/lengths of current materialized bytes. Equal-source anchors must remain equal; failure blocks execution without repairing the study by selection. Use existing assembler/serializer ownership and accepted MIDI validation; the baseline-only fixture builder must not be silently repurposed or its closed 28-fixture contract changed. Any necessary evaluation tooling is a separately authorized implementation within the later package task, never new musical runtime in this specification.

| Future artifact | Owner / required content and custody |
|---|---|
| `manifest.json` | Custodian source manifest: protocol/source refs and hashes, generating SHA/toolchain, full ordered source tuples and versions, counts, canonical plan/events evidence, MIDI lengths/hashes. Reference authoritative tables rather than duplicating a second source of truth. |
| `presentation.json` | Concealed mapping: every source/lineage to opaque fixture, each panel/role, all three stream identities/seeds, frozen orders and balance checks. Keep outside evaluator handoffs. |
| Blind MIDI package and `blind-manifest.json` | Only ND7C MIDI names, ordered opaque IDs, completeness/length information; no lineage/source identity or revealing hashes in evaluator-facing metadata. Custodian retains hashes. |
| Pass 1 and Pass 2 workbooks/forms | Only fields/anchors and metadata appropriate to that pass; no hidden source/lineage information. Pass 2 grouping is released only after Pass 1 lock. |
| `deterministic-evidence.json` and setup reference | Custodian machine report and exact setup record bindings; not musical judgments. Bind corrected FST SHA-256 `baf5d3d8aea2084c252c47a72ffd9239ebf35bfbbd32818bc0faf1993dcca1de` and FLP `77b8fd4417acb12069e3a1ded3f369b5ec37038af2d0841d7f0f1bba84d1d9ab`; verify files against the authoritative setup record before execution. |
| Design/package lock records | UTC identity, protocol and source/generating commits, inventory, exact-byte SHA-256 and lengths, validation disposition, setup refs; each lock hashes predecessors, never itself. Package lock follows generation/review and is required before listening. |
| Response exports and Pass 1/Pass 2 lock records | Preserve exact completed original workbooks/forms plus normalized JSON, hashes, row completeness, reviewer/context/session/exposure records and incident references. Pass 2 lock references Pass 1 lock. |
| Reveal record | Timestamp, mapping hash, both response locks, authorized reveal and deterministic A/B-to-lineage interpretation. |
| Amendment/incident record | Append-only originals/reasons/corrections; invalid attempts, apparatus failures, fatigue interruptions, recognition/disclosure; never erase unfavorable results. |
| Final results report | All profile/axis and intermediate findings, usability, seed relatedness, limitations, machine context, locks, and explicit Product Owner rationale/disposition. |

Future evidence JSON uses UTF-8 without BOM, LF, documented stable key/array order, and repeatable serialization; freeze the emitted schema/order in the separately reviewed package tooling before generation. Follow the existing package evidence digest pattern: ordinal-sort `/` relative paths, hash exact bytes, hash UTF-8 lines `<path>\t<lowercase-sha256>\n`. Inventory scope is explicit and excludes the lock that stores its digest to avoid self-reference. Separate blind handoffs from authoritative manifests/mappings and preserve locked baseline files/hashes. These are derived evaluation records, not aggregate musical provenance or new persistence schemas. No MIDI, audio, workbook, mapping, or package is generated by this task.

## Product Owner disposition and subsequent gates

Report all four profile x Energy and four profile x Complexity findings separately across roots, every adjacent relationship, usability findings, seed-relatedness findings, and every material mixed/unchanged/regressive result. Preserve individual explanations and Not assessable coverage gaps. No aggregate musical score, collision threshold, majority-of-roots rule, automatic percentage, or all-profiles-must-improve rule applies. Darkwave Energy and medium/medium are expected preservation controls. Machine conformance is binary; musical disposition is qualitative Product Owner judgment:

- **ACCEPT R1:** Complete evidence supports sufficiently useful Energy/Complexity intent control for Nightdrive, and all material mixed/unchanged/regressive findings are understood and acceptable with explicit rationale.
- **REVISE:** Evidence is useful but one or more musical deficiencies materially prevent acceptance; subsequent corrective work requires separate authorization.
- **REJECT / REVISIT ADR-021:** Evidence indicates the existing profile-data representation cannot provide sufficiently useful control, requiring renewed assessment under ADR-021's revisit condition. A poor sample alone does not establish an architectural conclusion or authorize changing semantics.

Product Owner-only acceptance is bounded product-specific musical evidence, still exploratory with respect to general listeners. Prior V1 exposure, possible recognition, fixed Harmony/range/setup, limited roots, and correlated/reused stimuli limit interpretation. No disposition reconstructs historical search/finalist/no-retuning chronology: R1-REV-001 remains PARTIALLY CLOSED. MIA-003 remains deferred/non-blocking. ACCEPT R1 does not automatically close Stage 7, aggregate provenance, Stage 8, or unrelated gates; Stage 8 remains unauthorized.

Sequence: protocol specification -> review and separately authorized publication -> separately authorized deterministic package preparation/artifact generation (including any bounded evaluation-tooling prerequisite) -> package review/lock -> separately authorized listening -> results review/Product Owner disposition. The immediate gate is review of this specification. No tuning, new weights/data/policy version, listening, artifacts, runtime, provenance, or later-stage work is authorized by this document.
