# Stage 7 Arpeggiator evaluation results

## Status and boundary

The Stage 7 baseline evaluation is completed, locked, and documented. It is an exploratory single-reviewer baseline, not a population claim or final Stage 7 acceptance. The runtime-conformance diagnostic found no defect in the inspected valid execution path. Individual usability and seed stability passed; Energy and Complexity intent sensitivity remain REVISE/open. No policy tuning, new data version, new policy version, aggregate provenance, or Stage 8 work is authorized by these results.

## Locked evidence identity

| Evidence | SHA-256 |
|---|---|
| Pass 1 workbook | `7a7383421c1767f5b867b5f2f2e64ff26a6d2682de84adc075ddb1ed11f678a3` |
| Pass 1 responses | `67a7de3b65f64441c990e2de9df607e9b863728b46e672027de723008518c94b` |
| Pass 1 lock record | `ef65e7eec7c0aec28e366a3b66b260df5480e520f6c7b3bbc0ca526f2318a2f2` |
| Pass 2 workbook | `b666a4368d60bdcc64f8d55be1dbb421270da94627d42c3273adde25b3709635` |
| Pass 2 responses | `a0c8d8e1594cff47bcecff50d93777ed11b50468a918f00cae5bc3e2a08bd0fa` |
| Pass 2 lock record | `e9d81f5e73f3fc421d4f09c95d30a915fb05dd0b4be1bff563f0bc6c91ead677` |
| Baseline package evidence | `e136c37e6297ddde68265955dbbcb50684a2904cbe3511f7f8694eed99e55ab3` |
| Pass 2 reveal | `885555ecf9656b029679fa4cad95c6493ec599859be5a611b8bc4adc75ec1081` |
| Pass 2 package | `c72fecf815db54101be67a6f86596de3c8d9ed060b9b5d17130f16937756b3db` |
| Corrected FST | `BAF5D3D8AEA2084C252C47A72FFD9239EBF35BFBBD32818BC0FAF1993DCCA1DE` |
| Corrected FLP | `77B8FD4417ACB12069E3A1DED3F369B5EC37038AF2D0841D7F0F1BBA84D1D9AB` |

## Human baseline

All 28 Pass 1 rows were `Clear` / `Yes` / `Yes` / `Yes` / `Yes` / `Yes`, with no severe issue. ND7-001 had prior non-scored setup exposure and is not pristine first-exposure evidence. The reviewer found no broken timing, unusable traversal, register problem, masking problem, repetition problem, or general unusability.

Pass 2 found Energy `Counterintuitive` for Dark Synthwave, Classic Synthwave, and Midtempo Cyberpunk, and `Clearly yes` for Darkwave. Complexity was `Counterintuitive` for all four profiles. Seed relatedness was `Clearly same profile` for Dark Synthwave, Classic Synthwave, and Midtempo Cyberpunk, and `Mostly same` for Darkwave. Cross-profile output was `Clearly distinguishable`, but differing Harmony contexts prevent attributing that distinction to Arpeggiator policy alone.

## Deterministic diagnostic

The valid runtime path passed inspection: all 500 constructed candidate lists match the accepted element-wise additions, ordering, and lack of normalization; component-seed derivation, five-draw Mulberry32 schedule, modulo selection, and projector ownership conform; and all 28 public outputs reconcile with baseline MIDI. This is not a certification of every negative path.

Six structural duplicate pairs were exact for plan, events, Arp track, and full MIDI bytes: Dark Synthwave Energy very-low = very-high; Midtempo Cyberpunk Energy very-low = medium; Dark Synthwave Complexity very-low = very-high; Classic Synthwave Complexity medium = very-high; Darkwave Complexity very-low = medium; and Darkwave seed 1 = seed 2. Expected Harmony/Chord equality inside comparison panels is not an Arpeggiator-policy defect.

Across 6,144 public calls (four profiles, root seeds `0..255`, three Energy conditions at medium Complexity, and three Complexity conditions at medium Energy), 1,183 plans (19.25%) and 1,188 event sequences (19.34%) matched another condition. The five-event difference is the accepted Midtempo Cyberpunk projection collapse: Complexity very-low versus very-high with up-down/down-up and `alternating-rest-on` emits only positions where both directions choose the middle pitch. This is accepted behavior, not a runtime defect or primary concern. Medium/medium seed diversity was Dark Synthwave 43 plans/43 events, Classic Synthwave 45/45, Darkwave 60/60, and Midtempo Cyberpunk 46/44; a Darkwave seed collision is a selection collision, not a seed-isolation failure.

Energy sensitivity was broad for Dark Synthwave, Classic Synthwave, and Darkwave; Darkwave is the positive human control. Dark Synthwave seed `0` very-low = very-high and medium–very-high collided for 119/256 seeds (46.5%). Classic Synthwave seed `0` placed very-low above medium and medium lowest, with medium–very-high collisions for 91/256 seeds (35.5%). Midtempo Cyberpunk had seed `0` very-low = medium and very-low–medium collisions for 32/256 seeds (12.5%).

Complexity is the higher-priority concern. Dark Synthwave primarily changes octave/direction and has very-low–very-high collisions for 78/256 seeds (30.5%). Classic Synthwave changes direction only and has very-low–medium 119/256 (46.5%), medium–very-high 101/256 (39.5%), very-low–very-high 96/256 (37.5%), and all-three 49/256 (19.1%) collisions. Darkwave changes octave/direction/mask with very-low–medium collisions for 63/256 seeds (24.6%). Midtempo Cyberpunk changes octave/direction/mask; its seed-0 human ranking was inverted, and its five rare projection collapses are described above.

## Engineering disposition

| Question | Disposition |
|---|---|
| Inspected runtime conformance | PASS; no defect identified |
| Individual usability | PASS for this single-reviewer baseline |
| Seed stability | PASS |
| Cross-profile Chords + Arp distinguishability | PASS, with Harmony-context caveat |
| Energy intent control | REVISE; bounded investigation required |
| Complexity intent control | REVISE; higher-priority bounded investigation required |
| Stage 7 | REVISE/open; not complete |

No more listening is authorized before the bounded policy-design investigation. Any future candidate policy requires a separately authorized deterministic and human comparative evaluation.

## Next research question

Determine whether improved Energy/Complexity intent control can be achieved by either: (A) a new immutable genre-profile Arpeggiator data version using the existing selection algorithm; or (B) an accepted policy semantics/decision-ownership change that is too narrow, especially for Complexity, and therefore requires a new policy version. This record does not answer that question, name a successor version, or propose weights.
