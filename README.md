# Nightdrive

Nightdrive is a planned composition and production-assistance workstation for synthwave, darkwave, dark synthwave, cyberpunk, and midtempo electronic music. It will help a producer turn intent into coherent, inspectable, editable, explainable musical building blocks and export them as standard MIDI for FL Studio.

The Version 1 north star is one excellent workflow: create, audition, adjust, vary, and export a coherent 8-bar section containing chords, bass, arpeggio, and a lead motif. Nightdrive assists; the producer owns the creative result.

## Current status

**Stage 2A — application/toolchain foundation.** The repository contains a minimal accessible Next.js shell, a liveness route, strict TypeScript, formatting/linting, component and accessibility tests, production-build validation, and CI. Composition tools are intentionally not implemented.

No music-domain logic, MIDI/audio functionality, persistence, authentication, Supabase configuration, AI integration, Vercel resource, or deployment exists.

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

## Repository baseline

The 2026-09-09 Stage 1 inspection found that both the provided local directory and the public `drkmtr1/nightdrive` GitHub remote were empty; the remote had no default branch. Stage 1 established the documentation foundation and was squash-merged to `main` as `74c16cf`. Stage 2A began from that clean merged commit.

## Guiding architecture

Natural-language interpretation and explanation are separated from canonical music generation. A deterministic, versioned, seeded music engine owns theory, timing, voicing, pattern generation, and MIDI serialization. AI may propose validated parameters and explain structured state, but cannot directly author canonical notes or mutate stored compositions.

## Contributing

Read [AGENTS.md](AGENTS.md), [Development workflow](docs/DEVELOPMENT_WORKFLOW.md), and [Coding-agent rules](docs/CODING_AGENT_RULES.md). Work only within an explicitly authorized roadmap stage.
