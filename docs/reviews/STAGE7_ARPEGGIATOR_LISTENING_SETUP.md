# Stage 7 Arpeggiator FL Studio listening-setup reproducibility

## Purpose and status

This document records the completed manual correction checkpoint for the Stage 7
Arpeggiator evaluation listening setup. The Stage 7 baseline evaluation
protocol is accepted and merged through PR #103. The original listening-setup
checkpoint is documentation-only and accepted and merged through PR #104; its
factory 3xOsc reference remains historical evidence. During non-scored setup
validation with ND7-001, the product owner found that the factory 3xOsc
`Default.fst` state was insufficiently audible and established the corrected
preset/template state recorded below. This correction is implemented manually,
documented here, and accepted and merged through PR #106. A subsequent
Evaluation Integrity Audit is complete; the consolidated execution protocol
correction is documentation-only and review-pending. Pass 1 remains BLOCKED
and no rating exists. Codex did not independently control or open FL Studio. This
document does not generate Stage 7 MIDI, fixtures, audio, or listening results.

The corrected setup is intended to remain fixed for the separately authorized
Stage 7 listening work. The external `.flp` and `.fst` files are not repository
content.

## Environment identity

Static machine evidence:

- Product: FL Studio 2025
- Build: `25.2.2.5154`
- Executable: `C:\Program Files\Image-Line\FL Studio 2025\FL64.exe`
- Executable architecture: x64
- Windows host architecture: ARM64
- Executable SHA-256: `6F6D935549EC86B45C88F5007EC27FA6AD9216408F08963E0DBDAE48275B192F`
- Edition: not established by the available evidence

## Instrument references

### FL Keys

Static identity:

- Plugin: FL Keys
- DLL version: `1.1.81.0`
- DLL: `C:\Program Files\Image-Line\FL Studio 2025\Plugins\Fruity\Generators\FL Keys\FL Keys_x64.dll`
- DLL SHA-256: `67C0B1715E45FCF16E482439BD64FD9D2E78F060066DE38C1932BD13C141A386`
- Factory preset: `default.fst`
- Preset path: `C:\Program Files\Image-Line\FL Studio 2025\Data\Patches\Plugin presets\Generators\FL Keys\default.fst`
- Preset SHA-256: `A688D4854FA96AB6866C2E42CEEEB1F986AE0B9C546EE0C8E536D2A89125E8F6`

Product-owner observation:

- The factory preset was explicitly loaded and FL Keys displayed preset
  `default`.
- The visible internal piano state displayed `Piano (FL)`.
- No manual sound-design changes were made.
- The final empty template was closed and reopened, and the FL Keys state
  remained preserved.
- This is not a claim that a second independent FST reload test occurred.

### 3xOsc

#### Historical factory reference

Static identity:

- Plugin: 3xOsc
- DLL: `C:\Program Files\Image-Line\FL Studio 2025\Plugins\Fruity\Generators\3x Osc\3x Osc_x64.dll`
- DLL SHA-256: `0102A4F3B14D259F76CAE55784D302D7F51E6F4BDF9E2488960727AE3C7D3E23`
- Windows version resource: none established
- Factory preset: `Default.fst`
- Preset path: `C:\Program Files\Image-Line\FL Studio 2025\Data\Patches\Plugin presets\Generators\3x Osc\Default.fst`
- Preset SHA-256: `3F233DAC63B8CCEFA6988D0782068BB934EF91AEF2EEFD5AEDD2A0DC47A03BFE`

Product-owner observation:

- The factory `Default.fst` state was explicitly loaded.
- Visual evidence established a stable pitched oscillator configuration
  suitable for objective setup reproducibility.
- No custom patch was designed, and no Stage 7 output influenced the choice.
- Exact parameter values are not claimed beyond what the captured visual
  evidence established.
- The final empty template close/reopen preserved the 3xOsc state.
- This factory state is superseded for Stage 7 listening by the corrected
  product-owner-created preset below; it remains historical setup evidence.

#### Corrected Stage 7 listening preset (accepted through PR #106)

Static identity:

- Preset: `Nightdrive Stage7 Neutral Arp.fst`
- Preset path: `C:\Users\WILLI\OneDrive\Documents\Image-Line\FL Studio\Audio\FL Studio\Presets\Plugin presets\Generators\3x Osc\Nightdrive Stage7 Neutral Arp.fst`
- Size: `717` bytes
- SHA-256: `BAF5D3D8AEA2084C252C47A72FFD9239EBF35BFBBD32818BC0FAF1993DCCA1DE`
- Last-write timestamp observed (UTC): `2026-09-17T03:54:19.8276864Z`

The product owner established the smallest usable candidate state by changing
only these oscillator controls from the candidate/default state:

- Oscillator 1 waveform: square
- Oscillator 1 coarse: `0`
- Oscillator 2 waveform: sine
- Oscillator 2 coarse: `0`
- Oscillator 3 waveform: sine
- Oscillator 3 coarse: `0`

Other controls were intentionally left unchanged from the candidate/default
state; no additional exact values are established here. This corrected preset
was used only for non-scored setup validation with ND7-001. The product owner
reported that the Arp was clearly audible alongside Chords; no rating was
recorded.

## Historical Stage 5 MIDI import — not the Stage 7 procedure

The following earlier import established the template's historical Stage 5
setup. Its All tracks/FLEX/Start new project settings must **not** be used
for the Stage 7 blind fixture procedure below:

- Path: `src/midi/fixtures/stage-5c1-interoperability.mid`
- SHA-256: `230D6C7EB67EAA512B61F381D6255276F8B575367EE9BC4C634E1F94EB53CE2D`

The current-build import dialog was manually configured as follows:

- Which tracks: All tracks
- Channels: 1–16
- Channel type: FLEX
- Start new project: enabled
- Create one channel per track: enabled
- Realign events: disabled
- Set mixer tracks for new channels: enabled
- Import time signatures: enabled
- Import zero velocity notes: disabled

Observed after import:

- Chords, Bass, Arp, and Lead lanes were present.
- Conductor metadata did not create a musical Channel Rack instrument.
- Project tempo was 120 BPM and time signature was 4/4.

This record does not claim more detailed timing or velocity round-trip evidence
than was manually observed; the accepted Stage 5 automated and interoperability
evidence remains authoritative for deeper MIDI semantics.

## Stage 7 blind fixture Piano-roll import and reset

The product owner manually validated this exact procedure with ND7-001 before
Pass 1. That fixture was heard repeatedly for setup verification but was not
scored. For **every** opaque fixture, begin with the corrected empty
`Nightdrive.flp` and the corresponding blind `ND7-###.mid` file:

1. Open the FL Keys Piano roll. From its Piano roll menu choose
   **File → Import MIDI file...** and select the blind file. Under
   **Which Tracks to Import**, select **Chords only**. Set **Blend with existing
   data**, **Realign events**, **Import time signatures**, and **Import zero
   velocity notes** all **OFF**, then accept.
2. Open the corrected 3xOsc Piano roll. Choose **File → Import MIDI file...**
   and select the **same** blind file. Select **Arp only** under
   **Which Tracks to Import**. Keep the same four options **OFF**, then accept.
3. Before listening, confirm FL Keys remains Chords; 3xOsc remains
   `Nightdrive Stage7 Neutral Arp`; no FLEX channel appears; both Chords and
   Arp notes exist; Chords, Arp, and Master faders are `0 dB`; no effects are
   present; tempo is `120 BPM`; and meter is `4/4`. A deviation invalidates
   the trial—do not record a musical judgment.
4. After the fixture, close the project **without saving**. Reopen the
   corrected empty `Nightdrive.flp`, verify both Piano rolls are empty and
   the corrected instruments and setup remain intact, then proceed to the
   next opaque fixture. On failure, discard the invalid trial, reset from
   the clean template, and retry the **same label**.

The detailed Pass 1 listening, response, and lock rules are owned by the
[evaluation protocol](STAGE7_ARPEGGIATOR_EVALUATION_PROTOCOL.md).

## Routing and final template

Product-owner observation established that:

- The imported Chords channel was replaced/routed to FL Keys.
- The imported Arp channel was replaced/routed to 3xOsc.
- The corrected `Nightdrive Stage7 Neutral Arp.fst` was loaded into the empty
  Nightdrive template.
- Imported note data remained present after replacement.
- The final empty template removed all Stage 5 MIDI note data, Bass, and Lead.
- FL Keys and 3xOsc remained with their mixer assignments.
- Both instrument channels contain no evaluation MIDI notes.

## Mixer and clipping baseline

The final accepted baseline has:

- Chords / FL Keys fader: `0 dB`
- Arp / 3xOsc fader: `0 dB`
- Master fader: `0 dB`
- Chords effects: none
- Arp effects: none
- Master effects: none
- Ordinary routing to Master
- No evaluation automation or effects

Using only the accepted Stage 5 interoperability fixture, the observed Master
peak was `-1.4 dB`. Under the official FL Studio rule, a Master peak above
`0 dB` indicates clipping risk. No clipping was observed and no global Master
reduction was required; the accepted baseline Master remains `0 dB`.

The `-1.4 dB` observation is not a guaranteed peak for future Stage 7 fixtures.
The listening protocol still requires the fixed setup and playback volume to be
monitored consistently during each review session.

During non-scored setup validation with ND7-001 using the corrected preset, the
product owner reported that the Arp was clearly audible alongside Chords, a
Master peak of `-2.22 dB`, and no clipping. This is playback-apparatus evidence
only: ND7-001 was not rated, the baseline MIDI package was not defective, and
the canonical Arp events and serialized bytes were unchanged.

## External template save/reopen

The product owner manually:

1. removed all imported MIDI note data;
2. removed Bass and Lead;
3. loaded the corrected `Nightdrive Stage7 Neutral Arp.fst` into 3xOsc;
4. retained FL Keys and 3xOsc;
5. retained mixer assignments;
6. retained `0 dB` Chords, Arp, and Master faders;
7. retained empty effect slots;
8. retained 120 BPM and 4/4;
9. removed any ND7 MIDI from the template;
10. saved `Nightdrive.flp`;
11. closed and reopened it; and
12. confirmed the corrected state remained preserved.

The earlier accepted template state is retained as historical evidence:

- Previous SHA-256: `9F991E97ED56D1615EC1E71153224F919A62B1AC0356AA4B013DCE8893CA2210`
- Previous last-write timestamp observed: `2026-09-16T16:08:36.2376158-10:00`

The corrected external template is:

- Path: `C:\Users\WILLI\OneDrive\Documents\Image-Line\FL Studio\Audio\FL Studio\Projects\Nightdrive\Nightdrive.flp`
- Size: `48228` bytes
- SHA-256: `77B8FD4417ACB12069E3A1DED3F369B5EC37038AF2D0841D7F0F1BBA84D1D9AB`
- Last-write timestamp observed (UTC): `2026-09-17T03:58:32.4997296Z`
- Stored in Git: no; the file is outside the Nightdrive repository

The previous hash is superseded for Stage 7 listening because the product owner
intentionally updated the Arp instrument state. The corrected hash and metadata
were read without modifying the file. This setup record does not claim that
Codex independently opened or verified FL Studio.

## Evidence provenance

Evidence classes are intentionally separated:

- **Static machine evidence:** executable, plugin, preset, and local-template
  identities and hashes.
- **Corrected setup static evidence:** the exact corrected `.fst` and `.flp`
  paths, sizes, hashes, and timestamps above.
- **Official Image-Line documentation:** [MIDI Import options](https://www.image-line.com/fl-studio-learning/fl-studio-online-manual/html/automation_midiimport.htm), [FL Keys](https://www.image-line.com/fl-studio-learning-content/fl-studio-online-manual/html/plugins/FL%20Keys.htm), [3xOsc](https://cluster.image-line.com/fl-studio-learning/fl-studio-online-manual/html/plugins/3x%20Osc.htm), [Channel Settings and FST state](https://www.image-line.com/fl-studio-learning/fl-studio-online-manual/html/chansettings.htm), [Browser preset defaults](https://www.image-line.com/fl-studio-learning/fl-studio-online-manual/html/browser.htm), and [Master clipping semantics](https://www.image-line.com/fl-studio-learning/fl-studio-online-manual/html/mixer_levelsandmixing.htm).
- **Manual product-owner observation:** plugin UI/preset state, import-dialog
  configuration, tempo/meter, routing, mixer/effects state, Master peak, and
  template save/reopen preservation.

These classes must not be blurred into automated or Codex-run listening
evidence.

## Scope and next gate

This checkpoint changes no production or evaluation code, tests, generator
policy, MIDI assembler/serializer, dependencies, or canonical contract. It
does not regenerate the accepted Stage 7 baseline package, execute presentation
randomization, perform Stage 7 listening, define numeric acceptance thresholds,
implement browser audio, or implement aggregate provenance. ND7-001 was used
only for non-scored setup validation; no Pass 1 score exists. MIA-003 and the
deferred UI Visual Reference Gate remain unchanged.

The corrected setup is accepted through PR #106. The consolidated evaluation
protocol correction is review-pending; Pass 1 remains BLOCKED until it is
reviewed and merged, the final workbook and blind-only handoff are prepared,
and evaluation is separately authorized. No Pass 1 work has begun.
