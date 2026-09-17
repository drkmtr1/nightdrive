# Stage 7 Arpeggiator FL Studio listening-setup reproducibility

## Purpose and status

This document records the completed manual reproducibility checkpoint for the
Stage 7 Arpeggiator evaluation listening setup. The Stage 7 baseline evaluation
protocol is accepted and merged through PR #103. This setup record is
documentation-only, accepted and merged through PR #104, and records product-owner observations;
Codex did not independently control or open FL Studio. It does not generate
Stage 7 MIDI, fixtures, audio, or listening results.

The setup is intended to remain fixed for the separately authorized Stage 7
fixture-serialization and artifact-generation work. The external `.flp` file
is not repository content.

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

## Existing MIDI import

Only the accepted Stage 5 interoperability fixture was imported; no Stage 7
fixture was generated or used:

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

## Routing and final template

Product-owner observation established that:

- The imported Chords channel was replaced/routed to FL Keys.
- The imported Arp channel was replaced/routed to 3xOsc.
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

## External template save/reopen

The product owner manually:

1. removed all imported MIDI note data;
2. removed Bass and Lead;
3. retained FL Keys and 3xOsc;
4. retained mixer assignments;
5. retained `0 dB` Chords, Arp, and Master faders;
6. retained empty effect slots;
7. retained 120 BPM and 4/4;
8. saved `Nightdrive.flp`;
9. closed and reopened it; and
10. confirmed the listed settings remained preserved.

The exact external template is:

- Path: `C:\Users\WILLI\OneDrive\Documents\Image-Line\FL Studio\Audio\FL Studio\Projects\Nightdrive\Nightdrive.flp`
- Size: `48228` bytes
- SHA-256: `9F991E97ED56D1615EC1E71153224F919A62B1AC0356AA4B013DCE8893CA2210`
- Last-write timestamp observed: `2026-09-16T16:08:36.2376158-10:00`
- Stored in Git: no; the file is outside the Nightdrive repository

The hash and metadata above were read without modifying the file. This setup
record does not claim that Codex independently opened or verified FL Studio.

## Evidence provenance

Evidence classes are intentionally separated:

- **Static machine evidence:** executable, plugin, preset, and local-template
  identities and hashes.
- **Official Image-Line documentation:** [MIDI Import options](https://www.image-line.com/fl-studio-learning/fl-studio-online-manual/html/automation_midiimport.htm), [FL Keys](https://www.image-line.com/fl-studio-learning-content/fl-studio-online-manual/html/plugins/FL%20Keys.htm), [3xOsc](https://cluster.image-line.com/fl-studio-learning/fl-studio-online-manual/html/plugins/3x%20Osc.htm), [Channel Settings and FST state](https://www.image-line.com/fl-studio-learning/fl-studio-online-manual/html/chansettings.htm), [Browser preset defaults](https://www.image-line.com/fl-studio-learning/fl-studio-online-manual/html/browser.htm), and [Master clipping semantics](https://www.image-line.com/fl-studio-learning/fl-studio-online-manual/html/mixer_levelsandmixing.htm).
- **Manual product-owner observation:** plugin UI/preset state, import-dialog
  configuration, tempo/meter, routing, mixer/effects state, Master peak, and
  template save/reopen preservation.

These classes must not be blurred into automated or Codex-run listening
evidence.

## Scope and next gate

This checkpoint changes no production or evaluation code, tests, generator
policy, MIDI assembler/serializer, dependencies, or canonical contract. It
does not generate Stage 7 MIDI or fixtures, execute presentation
randomization, perform Stage 7 listening, define numeric acceptance
thresholds, implement browser audio, or implement aggregate provenance. MIA-003
and the deferred UI Visual Reference Gate remain unchanged.

After this setup record is accepted, the next separately authorized milestone
is deterministic Stage 7 fixture serialization/generation preparation. That
future work may instantiate the frozen 28-case matrix, execute deterministic
presentation ordering, serialize with the accepted existing serializer, and
create derived evaluation artifacts and metadata. Human listening remains a
later separately authorized gate.
