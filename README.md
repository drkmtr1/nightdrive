# Nightdrive

Nightdrive is a planned composition and production-assistance workstation for synthwave, darkwave, dark synthwave, cyberpunk, and midtempo electronic music. It will help a producer turn intent into coherent, inspectable, editable, explainable musical building blocks and export them as standard MIDI for FL Studio.

The Version 1 north star is one excellent workflow: create, audition, adjust, vary, and export a coherent 8-bar section containing chords, bass, arpeggio, and a lead motif. Nightdrive assists; the producer owns the creative result.

## Current status

**Stage 1 — documentation and architecture. No production application has been implemented.** No dependencies, Supabase resources, Vercel project, or AI/ML models are created by this stage.

Start with:

- [Project overview](docs/PROJECT_OVERVIEW.md)
- [Version 1 scope](docs/SCOPE.md)
- [Requirements](docs/REQUIREMENTS.md)
- [Acceptance criteria](docs/ACCEPTANCE_CRITERIA.md)
- [Architecture](docs/ARCHITECTURE.md)
- [Roadmap](docs/ROADMAP.md)
- [Operating rules](AGENTS.md)

## Repository baseline

The 2026-09-09 Stage 1 inspection found that both the provided local directory and the public `drkmtr1/nightdrive` GitHub remote were empty; the remote had no default branch. There was no current branch, history, code, test, package/dependency configuration, Supabase configuration, Vercel configuration, or documentation to preserve or reconcile. The brief's phrase “existing repository” therefore means an existing empty GitHub repository, not an existing implementation. This documentation is the first project foundation.

## Guiding architecture

Natural-language interpretation and explanation are separated from canonical music generation. A deterministic, versioned, seeded music engine owns theory, timing, voicing, pattern generation, and MIDI serialization. AI may propose validated parameters and explain structured state, but cannot directly author canonical notes or mutate stored compositions.

## Contributing

Read [AGENTS.md](AGENTS.md), [Development workflow](docs/DEVELOPMENT_WORKFLOW.md), and [Coding-agent rules](docs/CODING_AGENT_RULES.md). Work only within an explicitly authorized roadmap stage.
