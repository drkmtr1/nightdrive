# Dependency register

## Policy

Direct versions are exact and npm's lockfile freezes the transitive graph. Updates require current support/license/security review, clean `npm ci`, `npm ls`, `npm audit`, full validation, and this register in the same change. No dependency is present for deferred music, MIDI, audio, persistence, Supabase, AI, or deployment features.

## Runtime and package manager

| Tool | Version | Status and rationale | Replacement/removal |
|---|---:|---|---|
| Node.js | 24.21.0 | Current LTS selected for local/CI parity and support through April 2028; permissive Node.js license. Security patches within major 24 require prompt validation. | Move to the next LTS through an ADR/toolchain PR; Next requires Node-compatible runtime. |
| npm | 11.19.0 | Stable version bundled with selected Node; Artistic-2.0. Produces lockfile v3 and reproducible `npm ci`. | Upgrade within the supported line or replace package manager through a reviewed lockfile/workflow migration. |

## Application dependencies

| Dependency | Version | Purpose | License/support/security | Bundle/runtime impact and exit path |
|---|---:|---|---|---|
| `next` | 16.3.4 | App Router, server rendering/build, routes, and production server. | MIT; 16.3 is Active LTS. Track monthly security releases and framework advisories. | Core web/server framework and largest dependency. Web adapter can migrate to another framework while domain modules remain plain TypeScript. |
| `react` | 19.3.0 | Declarative component model required by Next. | MIT; current stable line paired with Next. Avoid unsafe HTML and unnecessary client state. | Client/server component runtime. Removed only with framework replacement. |
| `react-dom` | 19.3.0 | React DOM renderer required by Next and component tests. | MIT; version-matched to React. | Browser/server rendering runtime; removed with React/framework replacement. |
| `midi-file` | 1.2.4 | Commodity Standard MIDI File Format 1 byte encoding behind the isolated Stage 5B2a adapter. | MIT; no runtime dependencies; exact version pinned and covered by dependency/audit gates. | Adapter-only runtime dependency; replaceable without changing the Nightdrive-owned MIDI IR or canonical semantics. |

## Development dependencies

| Dependency | Version | Purpose | License/support/security | Impact and exit path |
|---|---:|---|---|---|
| `@biomejs/biome` | 2.5.12 | Maintained formatter and linter for TS/TSX/JS/JSON/CSS. | MIT OR Apache-2.0; current stable. Native optional binary is lockfile/platform sensitive, covered by clean-install CI. | Development/CI only; replaces separate formatter/lint plugin graph. Can migrate to another checked formatter/linter. |
| `typescript` | 7.0.2 | Strict static contracts and standalone type gate. | Apache-2.0; current stable and validated by `next build`. Compiler updates can expose soundness/config changes. | Development/build only; TypeScript source remains portable JavaScript after compilation. |
| `vitest` | 5.0.0 | Fast unit/component/route test runner with TypeScript support. | MIT; current stable, Node 24 compatible. Native/transitive runner bindings require clean-install verification. | Development/CI only; tests use common assertions and can migrate to another runner. |
| `jsdom` | 29.1.1 | DOM environment for component and accessibility tests. | MIT; current compatible release for Node 24. It is not a real browser and cannot validate layout/color/audio. | Test only; replace with browser tests when behavior requires rendering fidelity. |
| `@testing-library/react` | 16.3.3 | User-oriented React component queries/rendering. | MIT; maintained current release. | Test only; limits tests to observable behavior and can be replaced with browser tests. |
| `@testing-library/dom` | 10.4.1 | Explicit peer/runtime for Testing Library DOM queries. | MIT; maintained stable release. | Test only; removed with Testing Library. |
| `@testing-library/jest-dom` | 7.0.1 | Accessible DOM assertion matchers integrated with Vitest. | MIT; maintained stable release. | Test only; assertions can be replaced with native DOM checks. |
| `axe-core` | 4.13.0 | Automated baseline accessibility rules over rendered shell markup. | MPL-2.0; maintained Deque engine. Automated checks are incomplete and do not replace manual review. | Test only; can be replaced by another standards-based scanner, with rule baselines reviewed. |
| `@types/node` | 24.13.4 | Node 24 API types for configuration/routes/tests. | MIT; DefinitelyTyped release aligned to Node 24. | Type-only development dependency; update with runtime policy. |
| `@types/react` | 19.3.0 | React TypeScript declarations. | MIT; version-aligned with React. | Type-only; removed with React/TypeScript. |
| `@types/react-dom` | 19.3.0 | React DOM TypeScript declarations. | MIT; version-aligned with React DOM. | Type-only; removed with React DOM/TypeScript. |

## Rejected foundation dependencies

- ESLint 10.10.0: current stable but outside peer ranges of the Next.js 16.3 lint plugin graph during validation.
- ESLint 9.39.5: peer-compatible but emitted a deprecation/no-longer-supported warning during installation.
- Prettier and `eslint-config-prettier`: unnecessary after selecting Biome.
- Tailwind CSS, component libraries, state managers, schema libraries, Playwright, Supabase, Vercel SDKs, AI SDKs, and audio packages: no Stage 2A requirement justifies them. Additional MIDI packages remain deferred; Stage 5B2a uses only the approved `midi-file` adapter dependency.

## Stage 5 MIDI dependency spike

The completed Stage 5A spike evaluated `midi-file` `1.2.4` and `midi-writer-js` `3.2.1` under `spikes/midi-dependency`; `midi-file` `1.2.4` is now the approved production dependency for Stage 5B2a, isolated behind `src/midi/adapter`, while `midi-writer-js` remains rejected. The evidence and recommendation are recorded in [MIDI dependency spike](reviews/MIDI_DEPENDENCY_SPIKE.md). Any later dependency adoption must repeat security/audit review and update this register only after explicit approval.
