# Engineering Review Playbook

## Purpose

Reusable, read-only engineering checkpoints for milestone-gated software
projects. Reviews inspect evidence and report findings; they do **not**
implement corrections. After REVISE, a separate bounded, contract-determined
correction may follow under standing execution authority. A finding
that exposes an unresolved consequential decision stops for Product Owner input.

## Core rules

-   Inspect before changing.
-   Prefer authoritative repository docs, verified code/tests, Git
    state, and current milestone evidence.
-   Report evidence-backed findings only.
-   Do not weaken tests or requirements to make a review pass.
-   Preserve accepted architecture unless evidence justifies change.
-   Trigger reviews by risk and accumulated change, not mechanically.

## Default severity

`BLOCKER` --- stop until resolved.\
`MUST FIX BEFORE NEXT MILESTONE` --- corrective work required before
proceeding.\
`SHOULD FIX SOON` --- real risk/debt, non-blocking now.\
`ACCEPTABLE / DEFERRED` --- known issue not worth fixing now.\
`NO ISSUE` --- reviewed area is healthy.

For substantive findings include ID, severity, files/components,
evidence, impact, recommended action, and whether it blocks progress.

------------------------------------------------------------------------

# 1. Milestone Integrity Audit

**When:** About every 3--5 meaningful milestones or before a major phase
change.

``` text
Conduct a read-only Milestone Integrity Audit of this project. Do not modify anything.

Read the authoritative project documentation, architecture decisions, requirements,
roadmap, test strategy, and relevant implementation. Compare documented project
state against verified repository state.

Audit repository/Git integrity, documentation drift, architecture conformance,
requirements vs implementation, API/contract consistency, determinism where
applicable, test quality, dependency health, build-vs-buy decisions, code quality,
security/secret hygiene, scope creep, technical debt, and roadmap accuracy.

Run the project's existing validation suite where appropriate.

Classify findings: BLOCKER, MUST FIX BEFORE NEXT MILESTONE, SHOULD FIX SOON,
ACCEPTABLE / DEFERRED, or NO ISSUE. For each finding provide evidence, affected
files/components, impact, recommended correction, and whether it blocks progress.

Finish with: Executive Assessment; Validation Results; Findings; Technical Debt
Inventory; Recommended Corrective Actions; Safe-to-Defer Items; Readiness for Next
Milestone; Suggested Next Milestone.

Do not implement fixes. Stop after the audit.
```

# 2. Architecture Conformance Review

**When:** After architectural changes or a major subsystem/boundary is
introduced.

``` text
Conduct a read-only Architecture Conformance Review. Do not modify code or docs.
Read authoritative architecture documents and accepted decisions first.

Inspect module/layer boundaries, dependency direction, separation of concerns,
domain/application/infrastructure boundaries, framework leakage, vendor coupling,
persistence/API boundaries, state and canonical-data ownership, AI vs deterministic
responsibilities if applicable, error/security boundaries, cross-module imports,
duplicated sources of truth, premature abstractions, and undocumented architecture.

Distinguish genuine violation, harmless implementation detail, reasonable debt, and
stale architecture documentation. Provide repository evidence for every finding.
Classify: BLOCKER, MUST FIX, SHOULD FIX, ACCEPTABLE.

Do not redesign merely because another architecture is fashionable. Finish with an
architecture health assessment and whether development should continue. Do not fix.
```

# 3. Requirements Traceability Review

**When:** Major phase boundaries and before releases.

``` text
Conduct a Requirements Traceability Review. Do not modify the repository.

Identify authoritative product/functional/non-functional requirements, acceptance
criteria, architecture decisions, and roadmap milestones. Trace each requirement:
Requirement -> Architecture/design -> Implementation -> Tests -> Acceptance evidence.

Create a matrix: Requirement ID | Summary | Implementation | Test/evidence | Status |
Finding. Statuses: IMPLEMENTED AND VERIFIED, IMPLEMENTED BUT WEAKLY VERIFIED,
PARTIALLY IMPLEMENTED, NOT IMPLEMENTED, IMPLEMENTED WITHOUT REQUIREMENT, CONFLICT.

Identify requirements without implementation/tests, unauthorized implementation,
acceptance criteria lacking evidence, obsolete requirements, and contradictions.
Do not assume passing tests prove requirement satisfaction.

Finish with Traceability Assessment, Missing Evidence, Unauthorized Implementation,
Requirement Conflicts, Recommended Corrections, and Readiness to Continue. Do not fix.
```

# 4. Test Quality and Regression Audit

**When:** After substantial functionality or several implementation
milestones.

``` text
Conduct a read-only Test Quality and Regression Audit. Do not modify tests or code.
Review test strategy, requirements, acceptance criteria, implementation, and tests.

Evaluate happy paths, invalid inputs, boundaries, invariants, determinism, ordering,
immutability, serialization, errors, integration boundaries, regressions,
security-sensitive behavior, and failure recovery where applicable.

Identify tests that duplicate production logic, test implementation details, use weak
assertions/excessive mocking, are redundant/flaky/environment-sensitive, or miss
accepted behavior. Identify important behavior with no tests. Do not chase arbitrary
coverage percentages; prioritize behavioral confidence.

Classify: CRITICAL COVERAGE GAP, IMPORTANT COVERAGE GAP, TEST QUALITY ISSUE,
OPTIONAL IMPROVEMENT, NO ISSUE. Finish with the highest-value missing evidence.
Do not write tests.
```

# 5. Dependency and Build-vs-Buy Review

**When:** Before standardized/commodity functionality and periodically
as dependencies grow.

``` text
Conduct a read-only Dependency and Build-vs-Buy Review. Do not install, remove,
upgrade, or replace anything.

Inspect current dependencies, custom implementations, upcoming roadmap capabilities,
and architecture boundaries. Classify relevant functionality as project-specific
domain logic, commodity/standardized functionality, or mixed.

Evaluate dependencies for purpose, maintenance, license, security, runtime/type
support, bundle/runtime cost, transitives, API stability, pinning, replaceability,
and canonical-boundary impact. Identify unnecessary/overlapping dependencies,
adapter candidates, substantial commodity functionality being reinvented, and domain
logic that should remain locally owned.

Identify upcoming capabilities that require dependency research before implementation.
Do not replace small deterministic project-specific logic merely because a library has
similar helpers.

Finish with Current Dependency Health, Build-vs-Buy Findings, Custom Code Worth
Preserving, Future Library Evaluation Points, Dependency Risks, Recommended Actions.
```

# 6. Security and Threat-Model Review

**When:** Auth, persistence, uploads, external APIs/tools, sensitive
data, or deployment enter scope; again before release.

``` text
Conduct a read-only Security and Threat-Model Review. Do not modify the repository.
Understand users, sensitive assets, authentication, authorization, data flows,
external services, trust boundaries, and deployment environment.

Inspect secrets/credentials, authn/authz, object access, input validation, injection,
file/path handling, XSS, CSRF/SSRF where applicable, redirects, API exposure,
permissions, environment variables, dependency vulnerabilities, sensitive logging,
AI prompt/tool injection where applicable, abuse/rate limits, and insecure defaults.

Create: Asset | Threat | Attack surface | Existing mitigation | Residual risk |
Recommended mitigation. Classify CRITICAL/HIGH/MEDIUM/LOW/INFORMATIONAL and separate
theoretical risks from demonstrated weaknesses. Finish with security readiness.
Do not fix.
```

# 7. Data Model and Persistence Review

**When:** Before important schema commitments and after substantial
schema changes.

``` text
Conduct a read-only Data Model and Persistence Review. Do not modify database/schema.
Read requirements, architecture, accepted data model, migrations, persistence code,
and authorization rules.

Evaluate entities, ownership, relationships, keys, nullability, uniqueness,
constraints, normalization, canonical-state ownership, timestamps/versioning,
migrations, indexes, query patterns, transactions, deletion, concurrency,
audit/history, authorization/RLS, retention, and sensitive information.

Find cases where application code compensates for missing database constraints and
schema decisions that will become expensive later. Classify by severity/migration
risk. Finish with Data Model Health, Integrity Risks, Migration Risks, Performance
Risks, Authorization Findings, Recommended Corrections, Readiness to Continue.
Do not change schema/data.
```

# 8. API and Interface Contract Review

**When:** After new APIs, serialized formats, provider adapters, or
major module interfaces.

``` text
Conduct a read-only API and Interface Contract Review. Do not modify code.
Identify important interfaces among frontend/backend, application/domain, services,
persistence adapters, external APIs, AI providers, jobs, file formats, and serialized
state.

Evaluate schemas, type consistency, validation, versioning, error semantics,
optional/null behavior, compatibility, idempotency/pagination where applicable,
auth boundaries, deterministic serialization, and coupling. Identify implicit
contracts needing definition and duplicated/competing schemas.

Classify findings by severity. Do not redesign without evidence of a problem. Return
contract-health assessment and prioritized recommendations.
```

# 9. Performance and Scalability Review

**When:** Only after representative workflows exist.

``` text
Conduct an evidence-driven Performance and Scalability Review. Do not optimize yet.
Identify important real-world workflows. Inspect network, database, rendering,
computation, serialization, files, external APIs, AI inference, caching, memory,
bundle size, and concurrency. Use existing profiling/benchmarking tools when safe.

Distinguish MEASURED BOTTLENECK, LIKELY BOTTLENECK, THEORETICAL CONCERN, NO CURRENT
ISSUE. Do not recommend optimization based only on theoretical scale.

For measured problems report workload, measurement, bottleneck, likely cause, user
impact, proposed experiment, and success threshold. State which optimizations should
not be done yet. Finish with performance readiness. Do not optimize.
```

# 10. UX and Accessibility Review

**When:** Once an end-to-end workflow is usable and before user-facing
releases.

``` text
Conduct a UX and Accessibility Review. Do not redesign or modify the app.
Identify primary users, goal, workflow, expected skill level, and constraints.
Walk through the app from the user's perspective.

Evaluate time to first useful result, navigation, cognitive load, unnecessary steps,
terminology, errors, empty/loading states, recovery, discoverability, keyboard/focus,
semantic HTML, labels, contrast, screen readers, responsive behavior, and relevant
accessibility standards.

Separate FUNCTIONAL BLOCKER, USABILITY PROBLEM, ACCESSIBILITY PROBLEM, POLISH,
PERSONAL PREFERENCE. Avoid cosmetic redesign for novelty. Prioritize measurable
friction/accessibility improvements. Finish with the five highest-value improvements.
Do not implement them.
```

# 11. Technical Debt Review

**When:** Every several milestones or at phase boundaries.

``` text
Conduct a read-only Technical Debt Review. Do not refactor.
Inspect implementation, tests, architecture, docs, and roadmap for evidence-backed
debt: duplication, brittle abstractions, oversized modules, unclear ownership, dead
code, TODO/FIXME/HACK items, workarounds, weak typing, missing validation, poor
testability, stale docs, dependency/migration debt, and architectural shortcuts.

For each candidate answer: What is it? What evidence proves it? What future work does
it hinder? Cost of leaving it? Cost/risk of fixing now? When should it be addressed?

Classify FIX NOW, FIX BEFORE <milestone>, MONITOR, ACCEPTABLE DEBT, NOT ACTUALLY DEBT.
Do not create cleanup merely because code could look nicer. Finish with prioritized
debt register. Do not implement.
```

# 12. Scope and Roadmap Alignment Review

**When:** Phase boundaries or after material product/roadmap changes.

``` text
Conduct a read-only Scope and Roadmap Alignment Review. Do not modify the project.
Read product spec, scope/non-goals, roadmap, architecture decisions, implementation,
and milestone history.

Determine what was planned, implemented, remains, was deferred, was added without
authorization, and may no longer be necessary. Identify SCOPE CREEP, MISSING REQUIRED
WORK, STALE ROADMAP ITEM, PREMATURE IMPLEMENTATION, VALID DEFERRED WORK, VALID CURRENT
WORK.

Do not preserve roadmap items merely because they are old, and do not remove accepted
scope merely because it is difficult. Recommend changes only from evidence or changed
product requirements.

Finish with Current Scope Health, Completed, Remaining, Deferred, Scope Creep, Stale
Roadmap Items, Recommended Roadmap Adjustments, Recommended Next Milestone. Do not fix.
```

# 13. Release Readiness Review

**When:** Before beta, staging promotion, production, or a consequential
version.

``` text
Conduct a Release Readiness Review. Do not deploy or modify anything.
Evaluate requirements, acceptance criteria, blockers, tests/integration tests,
security, accessibility, performance, migrations, environment config, secrets,
observability/logging, error handling, backup/recovery where applicable, rollback,
dependencies, deployment config, docs, and known limitations.

Create a checklist using PASS, FAIL, NOT APPLICABLE, NOT VERIFIED. Passing tests alone
do not imply release readiness. Identify every release blocker explicitly.

Conclude with exactly one: GO, CONDITIONAL GO, or NO-GO. If CONDITIONAL GO, state the
exact conditions. Do not deploy.
```

# 14. Post-Milestone Engineering Retrospective

**When:** End of a major phase or after a sequence with significant
rework.

``` text
Conduct an engineering retrospective for the completed project phase. Do not modify
the repository. Review the original milestone plan, implementation sequence, PR
history, revisions/rework, defects, architecture decisions, test failures,
documentation drift, dependency decisions, and audit findings.

Determine: What worked? What caused repeated rework? What could have been caught
earlier? Were milestones sized correctly? Were contracts/tests/docs/architecture and
dependency decisions handled at the right time? Did agents exceed scope? Did review
gates catch meaningful problems?

Separate isolated mistakes from recurring process problems. Recommend no more than
five concrete process improvements. Do not change product architecture merely to
improve process.

Finish with What Worked, Sources of Rework, Recurring Failure Patterns, Improvements
for Next Phase, Practices to Preserve.
```

------------------------------------------------------------------------

# Recommended Cadence

## Normal development

`DEFINE/RESEARCH → DOCUMENT → SMALL IMPLEMENTATION TASK → TEST → REPORT → REVIEW → PASS/REVISE/BLOCK → NEXT REPOSITORY-ELIGIBLE BOUNDED TASK`

## Every \~3--5 meaningful milestones

Consider the Milestone Integrity Audit, plus Test Quality and/or
Technical Debt reviews when their surfaces have materially grown.

## When crossing a technical boundary

-   architecture/subsystem change → Architecture Conformance Review
-   database/persistence → Data Model and Persistence Review
-   API/interface → API and Interface Contract Review
-   auth/files/external tools/sensitive data → Security Review
-   standardized/commodity capability → Dependency and Build-vs-Buy
    Review
-   usable end-to-end UI → UX and Accessibility Review
-   representative workload → Performance and Scalability Review

## Major phase boundary

Consider Requirements Traceability, Scope/Roadmap Alignment, Technical
Debt, and Engineering Retrospective reviews.

## Before release

Run Release Readiness. Relevant security, UX/accessibility, performance,
data/migration, requirements, and dependency concerns should already be
reviewed or explicitly included in the release gate.

------------------------------------------------------------------------

# Review Selection Prompt

``` text
Review the current state of this software project and determine which engineering
review from the Engineering Review Playbook should be run next.

Do not perform the review yet.

Inspect the current milestone, recently completed work, upcoming roadmap work, known
risks, and accumulated changes. Choose the smallest review or combination justified
by current risk. Do not recommend reviews mechanically based on elapsed time.

For each recommendation state why it is needed now, what risk it addresses, what
evidence triggered it, and whether it should happen before or after the next milestone.
Also state which reviews would be premature or unnecessary now.

Stop after recommending the review plan.
```

# Corrective-Work Rule

After a review: independently verify substantive findings; reject false
positives and preference-only findings; reconcile against authoritative
requirements/architecture; issue PASS/REVISE/BLOCK. REVISE may lead to the
smallest separate contract-determined correction under standing execution
authority; validate and review that correction before continuing. BLOCKED may
lead to a separate, objectively determined prerequisite assessment or
specification. Stop for Product Owner input when a consequential decision is
unresolved.

# Maintaining This Playbook

Keep this file generic and reusable. Project-specific architecture,
commands, tools, requirements, severity exceptions, and milestone state
belong in each project's repository. Update the playbook only when
repeated experience shows that a review is missing, redundant, mistimed,
or insufficiently precise.
