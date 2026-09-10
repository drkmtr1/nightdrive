# Nightdrive

Nightdrive is a planned composition and production-assistance workstation for synthwave, darkwave, dark synthwave, cyberpunk, and midtempo electronic music. It will help a producer turn intent into coherent, inspectable, editable, explainable musical building blocks and export them as standard MIDI for FL Studio.

The Version 1 north star is one excellent workflow: create, audition, adjust, vary, and export a coherent 8-bar section containing chords, bass, arpeggio, and a lead motif. Nightdrive assists; the producer owns the creative result.

## Current status

**Stage 3B2b1 — scale formula foundations.** The repository contains the merged Stage 2A, Stage 3A, Stage 3B1, and Stage 3B2a foundations plus six immutable canonical scale formulas, zero-based scale degrees, tonic-relative pitch-class projection, exact membership, and deterministic serialization.

Note spelling, octave labels, interval names/quality, keys, chords, PRNG/hash, MIDI export, transposition workflows, generation, audio, persistence, authentication, Supabase, AI, Vercel, and deployment remain intentionally unimplemented.

Start with:

- [Project overview](docs/PROJECT_OVERVIEW.md)
- [Version 1 scope](docs/SCOPE.md)
- [Requirements](docs/REQUIREMENTS.md)
- [Acceptance criteria](docs/ACCEPTANCE_CRITERIA.md)
- [Architecture](docs/ARCHITECTURE.md)
- [Roadmap](docs/ROADMAP.md)
- [Framework validation](docs/FRAMEWORK_VALIDATION.md)
- [Dependency register](docs/DEPENDENCIES.md)
- [Operating rules](AGENTS.md)

## Local foundation

Use Node.js `24.21.0` LTS and npm `11.19.0` as recorded in `.nvmrc` and `package.json`.

```powershell
npm ci
npm run validate
npm run dev
```

The local shell is then available at `http://localhost:3000`; liveness is `GET /api/health/live`. See [Deployment](docs/DEPLOYMENT.md) for environment policy. Running locally does not provision or deploy anything.

The Stage 3A API is exported from `src/music-domain`. Internal musical positions are zero-based. The exclusive 8-bar section boundary is tick `30720`, represented only as `{ bar: 8, beat: 0, tickWithinBeat: 0 }`; it is a valid event end but never a valid event start.

Stage 3B1 exports pitch identity from the same boundary. `PitchClass` is exactly numeric semitone class `0..11`, and `MidiPitch` is exactly MIDI note number `0..127`. Enharmonic names and octave-number conventions are display/theory projections, not canonical pitch identity.

Stage 3B2a adds signed chromatic displacement only: positive intervals move upward, negative intervals move downward, and zero is valid. Values are not reduced modulo 12 and do not encode traditional interval names or notation semantics.

## Repository baseline

The 2026-09-09 Stage 1 inspection found that both the provided local directory and the public `drkmtr1/nightdrive` GitHub remote were empty; the remote had no default branch. Stage 1 established the documentation foundation and was squash-merged to `main` as `74c16cf`. Stage 2A began from that clean merged commit.

## Guiding architecture

Natural-language interpretation and explanation are separated from canonical music generation. A deterministic, versioned, seeded music engine owns theory, timing, voicing, pattern generation, and MIDI serialization. AI may propose validated parameters and explain structured state, but cannot directly author canonical notes or mutate stored compositions.

## Contributing

Read [AGENTS.md](AGENTS.md), [Development workflow](docs/DEVELOPMENT_WORKFLOW.md), and [Coding-agent rules](docs/CODING_AGENT_RULES.md). Work only within an explicitly authorized roadmap stage.
