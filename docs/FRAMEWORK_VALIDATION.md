# Stage 2A framework validation

## Decision

Next.js with strict TypeScript is suitable for Nightdrive's web application boundary. ADR-003 is accepted based on the evidence below. This validates an application shell, not any music-domain behavior or hosted environment.

## Evaluated baseline

- Node.js `24.21.0` LTS and bundled npm `11.19.0`.
- Next.js `16.3.4` Active LTS with App Router and default Turbopack/Node runtime.
- React and React DOM `19.3.0`.
- TypeScript `7.0.2` with strict checking and no emit.
- A single root application, not a workspace/monorepo.

The official [Next.js installation guidance](https://nextjs.org/docs/app/getting-started/installation) supports Windows, App Router, TypeScript, npm, and Node.js 20.9 or newer. The [Next.js release channel](https://nextjs.org/blog) identifies the 16.3 line as Active LTS. Node.js documents 24 as LTS with support through April 2028 in its [Node 22 to 24 migration guidance](https://nodejs.org/en/blog/migrations/v22-to-v24).

## Suitability evidence

| Criterion | Evidence and consequence |
|---|---|
| Desktop-first workstation UI | React composition, CSS grid/responsive primitives, and explicit client components support a dense future workstation. The Stage 2A shell reflows from two columns to one without introducing a component library. |
| Strong TypeScript contracts | Next has first-class TypeScript integration. `strict`, `noEmit`, bundler resolution, typed routes, and a standalone `tsc` CI gate pass with TypeScript 7.0.2. |
| Framework-independent music core | Nothing requires domain code under `src/app`. Dependency direction is documented: future plain TypeScript domain modules may be imported by web adapters; they may not import Next/React/DOM/provider APIs. |
| Deterministic browser/server execution | Plain ECMAScript/TypeScript can execute in both environments. Explicit adapter boundaries and later cross-runtime fixtures are still required; framework rendering state is not canonical state. |
| Future MIDI serialization | Standard typed arrays and pure serialization can remain outside Next. A route or client download adapter can deliver derived bytes later without making the framework the serializer. No MIDI dependency was added. |
| Future Web Audio | Browser APIs are available behind explicit client components. Server Components remain the default so Web Audio cannot leak into server/domain modules accidentally. No audio code or dependency was added. |
| Accessible interactive controls | Semantic React output, CSS focus tokens, Testing Library, axe-core, and framework state conventions support accessible controls. The shell test and manual token/keyboard review establish only a baseline. |
| Testability | Vitest exercises components and route handlers without a server; an optimized build can be started for real HTTP route/header/404 smoke tests. Framework and pure-domain tests can remain separate. |
| Vercel compatibility | Next.js is natively supported by the planned provider. No Vercel resource or provider-only package/configuration was created, retaining self-hosting options. |
| Bundle/runtime boundaries | Server Components are default, `"use client"` is limited to the error recovery boundary, and the build reports static/dynamic routes. Future browser-only dependencies must be isolated and measured. |
| Long-term maintainability | Active-LTS Next, LTS Node, stable releases, exact direct pins, a lockfile, 0 audit findings, and CI provide a support/update path. No canary/experimental capability is enabled. |
| Avoiding framework coupling | One small `src/app` adapter is less structural overhead than a speculative workspace. Extraction remains possible because domain import restrictions are explicit before domain code exists. |

## Alternatives and findings

A Vite SPA plus separate API would make browser code direct but would add a second deployment/server shape before it is needed. Remix provides a similar full-stack boundary but offers no demonstrated advantage for this scope. A native desktop shell would align with FL Studio's environment but reduce accessibility/deployment simplicity and is unnecessary for standard MIDI handoff.

ESLint 10.10.0 and TypeScript 7.0.2 were initially evaluated together with `eslint-config-next`. That dependency graph was invalid because maintained Next lint plugins had not declared ESLint 10 or TypeScript 7 support, while the compatible ESLint 9 line emitted its own deprecation notice. Nightdrive therefore uses the current stable Biome formatter/linter and retains TypeScript 7.0.2; the resulting dependency graph is valid and substantially smaller. No peer override is accepted.

## Validation results

- Native ARM64 Node 24.21.0/npm 11.19.0 clean install: passed; 0 vulnerabilities and no unreviewed install scripts.
- Formatting, lint, strict type check: passed.
- Component, accessibility, and route tests: 3 passed across 2 files.
- Next.js optimized production build: passed; `/` is static, `/api/health/live` is dynamic.
- Production HTTP smoke: home 200, health 200/non-cacheable, missing route 404 with recovery link, baseline security headers present.
- Documentation validation and Git whitespace checks are required before delivery.

## Revisit triggers

Reopen ADR-003 if cross-runtime determinism fails; Web Audio scheduling cannot be isolated; MIDI download/runtime constraints require framework contamination; accessible workstation controls are materially blocked; Vercel portability becomes unacceptable; or the selected LTS/framework line approaches end of support.
