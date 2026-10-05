# AI-assisted engineering execution

This document governs execution mechanics for AI-assisted engineering work. It does not define product scope, architecture, milestone eligibility, requirements, testing policy, architectural decisions, or project state. Those remain owned by their existing authoritative documents.

This is a thin execution layer for the existing [operating contract](../AGENTS.md), [development workflow](DEVELOPMENT_WORKFLOW.md), and [coding-agent rules](CODING_AGENT_RULES.md), not a parallel source of authority. Follow the existing source-of-truth rule in AGENTS.md; repository truth outranks conversation assumptions. Accepted domain contracts and typed deterministic musical ownership remain unchanged. Material conflicts require a stop, not an inferred resolution.

One bounded engineering task is performed at a time. Once the Product Owner directs work on Nightdrive, standing execution authority permits Codex to reconcile repository truth, select and prepare successive repository-eligible bounded tasks, and perform routine operational steps during the active session without asking for another acknowledgement. Mechanical publication, merge, Git reconciliation, and post-merge coordination bookkeeping may be bundled when no new product, architecture, contract, roadmap, acceptance, scope, or implementation judgment is required. This permits larger operational chunks, not larger engineering chunks; completion never makes the next capability eligible by itself.

Task-specific STOP and no-publication boundaries remain binding within that task. A later eligible bounded task may begin under standing authority after its own precheck; standing authority never overrides an explicit scope exclusion or an unresolved consequential decision.

Codex prepares the compact [task packet](templates/CODEX_TASK.md) for each bounded task and uses the [result template](templates/CODEX_RESULT.md) for evidence and resumable checkpoints. Templates organize scope and eligibility; they do not expand either. A separate ChatGPT-authored prompt is not required for every routine transition.

## Roles

### Product Owner

Retains final authority over product direction, architecture changes, consequential contract changes, roadmap/stage policy, scope changes, and publication/merge policy. Standing execution authority follows those accepted policies; it does not transfer consequential decisions to an agent.

### ChatGPT

Provides independent exact-head review when the candidate establishes or changes consequential authority outside the [settled-contract dedicated-reviewer substitution gate](#settled-contract-dedicated-reviewer-substitution), and helps with genuinely unresolved blockers through an available review channel. ChatGPT does not override accepted repository contracts or routinely author every task packet. An exact-head PASS may lead to publication and merge under standing authority only when the reviewed tuple, required checks, accepted merge method, and current repository eligibility all hold.

### Codex

Leads routine engineering execution: reconciles current authority and Git state, selects and records one eligible bounded task, confirms contract maturity, prepares its own task packet, implements or investigates within scope, validates, self-reviews preliminarily, and prepares exact-head evidence for independent review. After PASS it may perform permitted publication, CI, merge, and reconciliation, then select the next independently eligible task during the active session. Codex does not approve its own final candidate, make future roadmap work eligible, or decide architecture changes, scope expansion, contract redefinition, or unrelated cleanup.

## Task classifications

- **ASSESS:** Read-only investigation of facts, repository state, root cause, feasibility, or evidence. It does not itself include corrective implementation; a contract-determined correction may follow as a separate eligible bounded task. When a formal engineering review is warranted, use the appropriate [Engineering Review Playbook](ENGINEERING_REVIEW_PLAYBOOK.md) procedure.
- **SPECIFY:** Resolve or document behavior, contracts, ownership, error semantics, deterministic policy, or another eligible implementation prerequisite. It does not itself include runtime implementation. Architectural decisions continue to use [DECISIONS.md](DECISIONS.md).
- **IMPLEMENT:** Implement sufficiently specified, repository-eligible behavior within its bounded scope. Implementation must not silently become specification.

## Risk classifications

- **R0 — Mechanical:** Fully defined changes such as documentation-only reconciliation, formatting, mechanical renames, or repetitive edits. A documentation task that changes a contract is not automatically R0.
- **R1 — Bounded implementation:** An accepted contract exists, expected scope is known, blast radius is limited, no architecture change is expected, and no public contract is redefined.
- **R2 — Contract-sensitive behavior:** Work may affect deterministic output, replay, PRNG use, serialization, error taxonomy or precedence, compatibility, public API semantics, canonical state, or persistent representation. Confirm specification before implementation.
- **R3 — Architectural:** Work concerns module ownership, cross-stage boundaries, public architecture, persistent-state ownership, major abstractions, canonical data ownership, or major external integration boundaries. Resolve architecture before implementation.

Risk determines execution/review rigor, not eligibility. These classes do not replace the playbook's review categories, findings severities, or procedures. No risk class bypasses authoritative scope, contracts, validation, or milestone boundaries.

## Default execution lifecycle

For nontrivial repository-eligible work, Codex uses this loop, with each engineering task bounded separately:

1. **RECONCILE:** Read current authority and coordination state; verify branch/base, worktree/index, existing work, stashes, and review status.
2. **SELECT ONE TASK:** Establish eligibility from accepted prerequisites; record type, risk, objective, allowed scope, acceptance criteria, validation, and stop conditions in the existing task packet.

During **RECONCILE** and **SELECT ONE TASK**, make a lightweight, evidence-based consideration of whether current or upcoming work warrants one of the existing read-only reviews in the [Engineering Review Playbook](ENGINEERING_REVIEW_PLAYBOOK.md). Consider material accumulated change, accepted or OPEN findings, technical or milestone boundaries, evidence/qualification, security, dependency, cross-platform, and repeated-rework risk. Select or recommend only the smallest review proportionate to demonstrated need; otherwise continue normal task selection. Do not trigger a review solely because time elapsed, a milestone count, or a recurring schedule. This consideration does not make work eligible, close findings, change review authority, or override existing exact-head review, CI, protected-integration, or Product Owner boundaries.

3. **CONFIRM CONTRACT:** ASSESS stays read-only; SPECIFY records only what authority determines; IMPLEMENT requires a sufficiently defined accepted contract. An agent cannot write a new binding contract, declare it accepted itself, and immediately implement it.
4. **EXECUTE AND VALIDATE:** Work within the bounded scope. Use focused checks during iteration and all required validation before the final candidate. Fix supported defects within the accepted contract without a separate external review for every local edit.

During corrective `SPECIFY` or `IMPLEMENT` execution, if evidence indicates material expansion—or material uncertainty whether the response remains within its originally justified scope or complexity—within the task or cumulatively across its corrective chain, stop expansion and reassess under the [Playbook's materiality, proportionality, and corrective-scope boundaries](ENGINEERING_REVIEW_PLAYBOOK.md#materiality-proportionality-and-corrective-scope-boundaries). Use the original task packet and existing review/result, Git, and coordination evidence; do not create a tracking system or recurring report. This is event-triggered, not a per-edit, per-tool, per-test, per-commit, timer, or file-count check. Continue only when existing authority supports the still-proportionate bounded remedy; otherwise use the Playbook's existing treatment and the existing separate-prerequisite, `BLOCKED`, or Product Owner escalation path as applicable.
5. **PREPARE BOUNDED CANDIDATE:** Self-review against requirements and scope, resolve supported local findings, rerun affected checks, and prepare one complete exact-head local candidate and evidence handoff.
6. **INDEPENDENT REVIEW:** Stop at the required review boundary. PASS applies only to the reviewed base/head/scope; REVISE permits a separate bounded contract-determined correction and a new exact head; BLOCKED permits an objectively determined prerequisite ASSESS/SPECIFY task or a stop for consequential judgment.
7. **CHECKPOINT OR INTEGRATE:** After ADR-031's protected activation, preserve an eligible PASSed local checkpoint and continue only when successor eligibility and required local evidence hold. At the recorded integration boundary, freeze and independently review the complete cumulative candidate against the actual target base; obtain applicable final Product Owner acceptance, then verify the tuple/base, actual required PR checks/artifacts and protected merge. Until activation, use the currently binding publication lifecycle.
8. **RECONCILE / CONTINUE:** Verify checkpoint ancestry/state, or merged contents and protected ancestry when integration occurred, and material coordination accuracy. Select the next already-eligible bounded task unless a task-specific stop or review boundary applies. If none is eligible, report the gate without inventing scope.

Apply only actions permitted by the task type; R0 does not bypass an applicable review or acceptance gate. PASS, REVISE, and BLOCKED are workflow states, not permission requests. Neither a merge nor a recommendation makes the next capability eligible. Stop for an unresolved consequential Product Owner decision.

## Local reviewed checkpoints and integration boundaries

This section implements [ADR-031](DECISIONS.md#adr-031--local-reviewed-checkpoints-and-milestone-level-integration) prospectively only after that governance change completes current consequential external PASS, explicit exact-tuple Product Owner acceptance and protected integration. It cannot activate or review itself. Existing explicitly integration-gated contracts/tasks keep their lifecycle.

Record an intended milestone-level integration boundary for ordinary product work in the existing task/state evidence. A meaningful independently eligible sub-milestone or earlier boundary requires a coherent capability, concrete cumulative scope/coupling risk, required earlier remote CI/accepted gate, or explicit Product Owner direction. A task, command, specification or bookkeeping completion does not automatically make a PR eligible; do not relabel micro-tasks to reproduce task-by-task publication.

Distinguish unreviewed local candidate, independently PASSed local checkpoint, exact-tuple Product Owner-accepted specification for local development, frozen final integration candidate, and protected integration. These are evidence states in existing task/result/handoff mechanisms, not a new registry. A local checkpoint requires its own complete applicable review, satisfied required local checks and resolved applicable blocking findings. Pending required PR CI is recorded separately; it is never reported as executed. If a task needs remote evidence before continuation, establish the earlier integration boundary instead.

A future independently eligible internal-development specification may explicitly adopt limited local authority after required consequential independent PASS, required local checks and explicit exact-tuple Product Owner acceptance for local development. Only then select a separate bounded LOCAL implementation task. SPECIFY never includes implementation; the author cannot self-accept. Record exact contract tuple/blobs, acceptance scope and required evidence. Local acceptance is not CI success, main integration, milestone/product acceptance, qualification, deployment or release. Uncertain acceptance/lifecycle fails closed. Governance/reviewer/security policy, qualification/capture/custody/freeze or formal acceptance-evidence authority, deployment/release and explicitly integration-gated tasks receive no automatic shortcut. Required permissions, Build-vs-Buy and dependency/external-system gates remain in force.

Track the remote integration baseline separately from the current task's local base. Record candidate head/tree/scope, preceding checkpoint/contract tuples and ancestry, review/acceptance receipts, applicable unresolved findings, local validation and pending remote evidence. A later task may use an approved local checkpoint as its base only when independently eligible. Preserve the checkpoint commit and its historical tuple; its PASS or Product Owner acceptance never approves a descendant. A changed contract requires new consequential review/acceptance. Required local validation failures or unavailable evidence remain blocking for the affected prerequisite; CI later does not excuse them.

Before publication inspect the complete cumulative actual-target-base-to-final-head diff, candidate content, cross-task interactions and findings under the existing review playbook. Reuse verified unchanged evidence with explicit provenance; do not aggregate earlier PASS results into final approval or inspect only the last task delta. A cumulative candidate containing new consequential contract/governing authority retains required external review and final exact-tuple Product Owner acceptance. Local specification acceptances establish historical local-development authority only. Any final candidate change reopens applicable cumulative review/acceptance before publication.

## Codex execution settings

For every substantive task, Codex records a task-specific model/effort recommendation and the effective settings when observable. Prefer the lowest-capability available model and lowest reasoning effort reasonably likely to succeed, considering ambiguity, contract maturity, deterministic/replay/serialization sensitivity, debugging difficulty, cross-file reasoning, complexity, and required judgment. Prefer increasing effort before escalating model capability when the same model remains capable.

The task packet retains an `## CODEX EXECUTION SETTINGS` block with verified selectable labels when available, rationale, and a specific escalation-or-stop condition. Record how settings were configured for a new execution when supported; distinguish recommendation, requested settings, and observed effective settings. A prompt naming a model or effort does not itself switch the running execution. If availability, configuration, or effective settings cannot be verified, state that limitation and assess whether the current execution is sufficient; if it is insufficient, stop with a resumable checkpoint. Do not invent labels, claim a switch, or establish a permanent default.

Codex records the settings and limitations for Product Owner visibility. Missing rationale or escalation conditions make a substantive packet incomplete. Selecting settings does not expand eligibility or change Product Owner authority; displaying the packet creates no acknowledgement gate. Tool approvals, sandboxing, credentials, branch protection, and access controls remain in force.

## Codex precheck

Before implementation, verify as applicable the current branch, expected base SHA or authoritative base ref, working-tree/index state, governing documents, expected file scope, required contract maturity, and compatibility of task instructions with current repository truth. Preserve existing work and stashes. For meaningful implementation, explicitly report precheck success before editing; report the actual base and any in-scope existing work being preserved.

## Stop conditions

Stop and report `BLOCKED` when:

- authoritative documents conflict materially;
- the expected base does not match;
- unexpected working-tree state makes the task unsafe;
- required behavior is underspecified or architecture must be decided;
- completion requires files outside the bounded eligible scope;
- a public or canonical contract must change unexpectedly;
- tests contradict accepted governing requirements;
- the task conflicts with current milestone eligibility or would violate [SCOPE.md](SCOPE.md);
- dependency adoption requires unresolved Build-vs-Buy or architecture review;
- requested work is materially broader than the bounded eligible task.

A correct stop is valid engineering behavior. BLOCKED does not automatically request human permission: if repository truth identifies a bounded read-only investigation or prerequisite, select it as a separate eligible task. For an unresolved consequential choice, report the evidence, precise question, viable alternatives and tradeoffs, and a recommendation when justified. Repeated attempts without new evidence or progress require a checkpoint and technical escalation, not an indefinite retry loop. Do not silently repair or expand scope.

## Scope discipline

Apply AGENTS.md's one-bounded-task rule. Correct supported defects within the current accepted contract and allowed scope during local iteration, then rerun affected validation before final review. Do not perform opportunistic refactoring, renaming, API redesign, documentation cleanup, dependency changes, abstractions for future work, out-of-scope defect fixes, or preparation for later roadmap stages. Report unrelated discoveries separately; an out-of-scope correction requires its own bounded eligible task.

## Compact handoffs

Templates optimize communication, not evidence. Use the shortest report that completely proves the task: group related facts when that improves clarity, and omit template-only sections only when they are genuinely inapplicable and omission cannot hide a consequential impact. Explicit task requirements and AGENTS.md always win. Higher-risk work naturally requires more evidence than R0 work. A compact result must still preserve applicable repository state, scope, validation, review, publication, authority, and next-gate evidence; ASSESS, SPECIFY, and BLOCKED work should report the evidence appropriate to that type rather than imitate an implementation report.

## Build-vs-Buy

Every implementation task subject to the [AGENTS.md dependency evaluation gate](../AGENTS.md#build-vs-buy--dependency-evaluation-gate) must satisfy its existing evaluation and reporting requirements. This workflow does not replace or duplicate that gate.

## Reviews

Formal review procedures remain owned by the [Engineering Review Playbook](ENGINEERING_REVIEW_PLAYBOOK.md). Select review rigor based on risk and change, and select reviewer authority primarily by whether the candidate changes governing authority or only implements settled authority. Reviews remain read-only. Preserve independent exact-head review before publication of nontrivial implementation candidates. Codex self-review is preliminary and never substitutes for required independent acceptance. A qualified separate Codex reviewer may satisfy that review only through the gate below; an external reviewer remains required when the candidate establishes or changes reserved consequential authority. A REVISE finding may lead automatically to a subsequent bounded contract-determined correction; a finding requiring consequential judgment stops for Product Owner input. No risk or implementation-category label grants self-approval or an automatic-merge exemption.

For an exact-head review handoff, freeze the applicable review-base commit, candidate commit and tree, changed-file scope, governing authority, and applicable OPEN findings before review. After ADR-031 activation distinguish the current task's local review base and remote integration baseline; final integration review uses the actual target-base commit and complete cumulative scope. The read-only reviewer inspects immutable candidate content and returns the [playbook's contract-first result](ENGINEERING_REVIEW_PLAYBOOK.md#contract-first-exact-head-review), including obligation and permissive-path dispositions. Keep material finding details in existing review/result evidence with stable IDs, origin tuple, affected paths/blobs where practical, and closure evidence; put only current coordination impact in `PROJECT_STATE.md`. During RECONCILE and before readiness or publication, compare affected content and behavior with OPEN findings. A new SHA, base, or branch does not close an unchanged finding. Missing review fields, unresolved applicable violations, unverified material obligations, or incomplete candidate evidence preclude PASS. This procedure does not itself authorize a separate Codex reviewer to provide required independent acceptance.

## Settled-contract dedicated-reviewer substitution

A qualified, separate Codex reviewer may satisfy required independent exact-head review when all of the following hold:

1. The governing behavior, contract, scope, and validation are accepted and sufficiently defined.
2. The candidate only implements, verifies, integrates, or corrects behavior under that settled authority.
3. The candidate does not create, change, weaken, reinterpret, or supersede the governing authority.
4. No unresolved Product Owner choice exists.
5. The reviewer can inspect the complete immutable candidate and applicable authority.
6. The contract-first review protocol and finding-continuity requirements can be satisfied.
7. Required validation, CI, and evidence remain independently enforceable.
8. No repository authority explicitly reserves the exact decision for external review.

Reviewer routing is determined primarily by decision authority, not implementation difficulty, risk label, or category. R2/R3, deterministic, evidence-heavy, qualification, canonical, provenance/custody, CI/configuration, security-sensitive, and fail-closed implementation can use the dedicated reviewer when every eligibility condition above holds. The author records the eligibility basis in the task packet before invoking the reviewer. The author and reviewer must run in separate contexts; author self-review never qualifies.

External ChatGPT or Product Owner review remains required when the candidate itself establishes or changes consequential authority, including product requirements or subjective product/musical acceptance; architecture or architectural decisions; accepted behavioral or public contracts; roadmap or material scope; reviewer authority or review/validation policy; weakening, removal, bypass, or material redefinition of a quality/evidence gate; consequential security, trust, or permission policy; dependency policy not determined by accepted authority; release/deployment policy or a consequential production-release decision; conflicting authoritative documents; unresolved reviewer/engineer disagreement; an incomplete, `NOT VERIFIED`, uncertain, or otherwise non-PASS review; a genuine Product Owner choice; or any decision explicitly reserved externally. Classification labels alone do not establish this boundary.

An applicable OPEN finding does not by itself require external review. When it concerns implementation under a settled accepted contract, the dedicated reviewer loads the durable finding record, inspects affected blob and behavior continuity, verifies the correction against accepted authority, and explicitly returns `OPEN | RESOLVED | SUPERSEDED` with evidence. PASS is forbidden while an applicable blocking finding remains `OPEN` or `NOT VERIFIED`. If disposition requires changing accepted authority or making a reserved consequential decision, route externally.

For an eligible candidate, invoke the dedicated Codex `exec review` path demonstrated in qualification. The qualified configuration requests `gpt-6-sol`/high effort, a read-only sandbox, and disabled approvals; a different configuration needs separate qualification. Verify effective settings from an execution receipt rather than the prompt or the reviewer's self-report. Supply a neutral request containing the immutable base/head/tree/scope, governing accepted authority, applicable prior findings and validation evidence, and the [contract-first playbook](ENGINEERING_REVIEW_PLAYBOOK.md#contract-first-exact-head-review); do not supply a desired verdict or let a candidate summary replace source inspection. Retain the invocation/settings/sandbox receipt, complete reviewer result, inspected-object evidence, and validation limitations. The receiving agent independently verifies the current tuple, every required result field, materially complete obligation and permissive-path audits, adversarial-test review, and prior-finding disposition. Only a complete PASS with no material `VIOLATED` or `NOT VERIFIED` obligation and no applicable blocking finding satisfies review. REVISE returns to a bounded contract-determined correction and re-review when authority remains settled. BLOCKED, missing or unverifiable settings, incomplete content/result, uncertain eligibility, or a reserved decision routes to the applicable external boundary, never to inferred PASS.

Material changes to the reviewer model, invocation, sandbox enforcement, review protocol, or a failed qualification control suspend substitution until new independent qualification is accepted. The reviewer cannot approve changes to this gate or its own qualification. Even a valid PASS remains bound to the reviewed base/head/tree/scope and leaves current-base assessment, required CI/evidence, Product Owner-set Git policy, and merge checks intact. The required main protections remain: pull request; `Documentation / validate` and `Runtime foundation / validate`; no bypass actors; deletion protection; and non-fast-forward/force-push protection. After the independently reviewed routine-workflow implementation is protected-integrated, the live ruleset must set `strict_required_status_checks_policy` to `false`; until that separate ruleset change is applied and verified, the currently active ruleset remains authoritative. Strict freshness removal does not make a stale branch automatically mergeable: every stale candidate still requires the bounded base-movement assessment below. A dedicated-reviewer PASS does not replace those protections; after PASS and successful checks, Codex may merge and reconcile automatically only when repository policy otherwise permits.

### Standing dedicated-review material egress

**CANDIDATE.** This exact standing egress authorization becomes binding only after consequential external exact-head review PASS, then explicit Product Owner acceptance of that exact reviewed tuple, followed by protected integration. External PASS is technical approval only. Until every condition is satisfied, it is not authority and cannot authorize transmission to review the candidate that introduces it. No status-only post-review mutation is required for the accepted rule to take effect.

After it is binding, this is a repository- and purpose-scoped data-transmission authorization only. It permits a fresh, per-invocation, minimum-necessary, provenance-known material set solely to the OpenAI Codex API used by the qualified dedicated `exec review` workflow in this section: `gpt-6-sol` at high effort, a read-only sandbox, and disabled approvals. It authorizes neither a different provider or destination nor any purpose other than independent contract-first exact-head review of a separately eligible settled-contract candidate. The invocation must still satisfy every substitution condition above and preserve all external-review boundaries.

Before each permitted transmission, prepare and retain an itemized egress receipt that binds the Nightdrive repository and frozen tuple, and records each material item or Git object, its relevance to that tuple, its source and provenance, its SHA-256 and byte length where applicable, the verified destination and review purpose, the requested qualified configuration, the eligibility basis, and the exclusion audit. The exclusion audit records only the disposition, never excluded values. The receipt is the exposure allowlist: every prompt, tool argument, attachment, sandbox mount, or reviewer-facing workspace item must be receipt-listed, and the reviewer workspace may expose only receipt-listed material. Read-only access does not permit broad checkout or worktree discovery. The receipt may include only what the reviewer needs to inspect the exact candidate and its authority:

- the exact base/head/tree, changed-file scope, and the minimum Git object or patch evidence needed to verify their relationship;
- complete candidate content for that scope, normally a full-index base-to-head patch or the authoritative equivalent, never a summary or silently partial packet;
- the accepted governing contracts, review procedure, applicable OPEN-finding records, and source material necessary to assess the candidate against them; and
- sanitized validation receipts and other task-specific evidence necessary to assess a material obligation or stated limitation.

Do not transmit secrets; `.env` contents; credentials, API keys, tokens, passwords, cookies, or session/authentication material; environment-variable values; credential-store contents; deferred stash contents; unrelated local files, logs, diagnostics, or repository material; personal data unrelated to Nightdrive; material from another repository or project; connected-account data; or unauthorized private external material. Categorically exclude `.git/config`, reflogs, raw object databases or object bundles, local absolute paths, author/committer identity data, signing material, broad worktree or history discovery, and Git metadata beyond the declared non-sensitive base/head/tree/scope/ancestry/patch evidence. A Codex-generated review artifact outside the repository may be included only when its receipt demonstrates that it derives solely from otherwise permitted Nightdrive material and that it contains none of the excluded content.

If classification, provenance, purpose, destination, eligibility, or exclusion status is uncertain, fail closed: do not transmit the item and request explicit Product Owner authorization identifying the specific material, destination, and purpose. If excluded material would be required for complete exact-head review, do not substitute a redacted or incomplete packet and represent the review as PASS. A new candidate SHA or contract-determined corrective head requires fresh per-invocation classification and a fresh immutable base/head/tree/scope review; this standing egress authorization does not make a task eligible, carry technical PASS between tuples, expand reviewer authority, weaken finding continuity, bypass external or Product Owner boundaries, or authorize CI, protected merge, deployment, or release.

After invocation, retain the effective reviewer settings and sandbox receipt, complete reviewer result, and inspection-completeness disposition. After valid egress, a qualified reviewer sandbox or read-access failure is a reviewer execution/access failure. Preserve the candidate and route it as `BLOCKED` through the existing external-review policy; it is not a reason to request duplicate Product Owner transmission authorization for the same already-permitted tuple. A material reviewer, model, invocation, sandbox, or qualification change remains governed by the suspension rule above.

| Scenario | Required egress result |
| --- | --- |
| Ordinary tracked Nightdrive source or documentation candidate | Allow only the receipt's minimum necessary material when the candidate independently satisfies the settled-contract substitution gate. |
| Contract-determined corrective head | Allow only after fresh tuple, provenance, purpose, and eligibility classification; require renewed immutable exact-head review. |
| Codex-generated review packet outside the repository | Allow only when the receipt proves that it derives solely from permitted Nightdrive material and contains no excluded content. |
| Minimum Git metadata for tuple, scope, or ancestry verification | Allow only declared non-sensitive base/head/tree/scope/ancestry/patch facts; deny configuration, identity, signing, reflog, raw-object, broad-history, and local-path material. |
| Secrets, `.env` contents, credentials, tokens, passwords, cookies, session/authentication material, or credential stores | Deny. |
| Environment-variable values | Deny. |
| Deferred stash contents | Deny. |
| Unrelated local logs, diagnostics, files, or broad worktree material | Deny. |
| Material from another repository or project, connected-account data, or unrelated personal files | Deny. |
| Unknown provenance or unauthorized private external material | Fail closed; request explicit Product Owner authorization for the identified material, destination, and purpose. |
| Non-OpenAI destination or provider | Deny; require separate explicit Product Owner authorization. |
| Non-review purpose, including debugging, publication, deployment, release, or training | Deny; require separate explicit Product Owner authorization. |
| This policy candidate before the lifecycle conditions above are satisfied | Deny under this policy; consequential external exact-head review remains required. |
| Qualified reviewer cannot inspect already-permitted material | Preserve the immutable tuple; record `BLOCKED` reviewer execution/access failure and route through the existing external-review policy without duplicate egress authorization. |

Use these routing controls when validating this gate:

| Scenario | Required route |
| --- | --- |
| Routine R1 implementation under a settled contract | Qualified dedicated reviewer |
| Complex R2 deterministic implementation under a settled contract | Qualified dedicated reviewer |
| Qualification-harness implementation under a settled qualification contract | Qualified dedicated reviewer |
| Canonical or provenance implementation under a settled contract | Qualified dedicated reviewer |
| Correction of an OPEN implementation finding under a settled contract | Qualified dedicated reviewer, with explicit finding disposition |
| New architecture decision | External review |
| Behavioral-contract change | External review |
| Reviewer-authority or review-policy change | External review |
| Proposed weakening of a validation or evidence gate | External review |
| Unresolved disagreement or material `NOT VERIFIED` result | External review |
| Subjective musical or product acceptance | Product Owner |
| Protected publication after dedicated PASS | Required CI/evidence, then protected merge automatically when otherwise eligible |

## USER ACTION REQUIRED handoff

Whenever Codex returns control instead of continuing routine repository-eligible work automatically, the terminal or checkpoint result must end with exactly one `## USER ACTION REQUIRED` section. It is a Product Owner interface, not a new approval gate. Do not stop merely to emit `NONE`; when routine work can continue within the execution, continue.

Use this exact structure:

```text
## USER ACTION REQUIRED

Type: NONE | EXTERNAL REVIEW | PRODUCT OWNER DECISION | ACCESS/ENVIRONMENT | TECHNICAL BLOCKER | NO ELIGIBLE WORK

Why: <plain-language reason execution stopped>

Action: <exact action the Product Owner should take>

Provide: <exact files, SHAs, evidence, decision, access action, or NONE>

Return to Codex with: <exact result, answer, evidence, or NONE>

Can I just say `continue`? YES | NO — <one concise explanation>
```

- `NONE`: no substantive Product Owner action is required, but the environment or session returned control while eligible work remains. `Action`, `Provide`, and `Return to Codex with` may be `NONE`; the final answer is `YES`.
- `EXTERNAL REVIEW`: identify the review type, exact base/head/tree when required, exact patch/evidence files, request `PASS | REVISE | BLOCKED`, and state exactly what result/evidence must return. The final answer is `NO`.
- `PRODUCT OWNER DECISION`: state the precise reserved decision, viable options, material tradeoffs, a supported recommendation, and exact answer format. Do not use it for ceremonial authorization. The final answer is `NO`.
- `ACCESS/ENVIRONMENT`: identify the unavailable minimum credential, permission, account action, hardware/runtime, or external capability and the exact action needed. The final answer is `NO` unless the condition is already satisfied and only resumption remains.
- `TECHNICAL BLOCKER`: use only after repository-eligible investigation/correction is exhausted. State the demonstrated blocker, evidence, attempts, why automatic progression is unsafe, and exact assistance/evidence needed.
- `NO ELIGIBLE WORK`: state the absent roadmap, product, or scope prerequisite; do not manufacture eligibility.

For every type, use plain language and make the required action explicit. Phrases such as “next gate,” “separately gated,” “requires authorization,” or “BLOCKED” do not suffice without the concrete action. If execution is continuing internally and no result is being returned, no interim footer is required. Omission from a returned terminal/checkpoint result is a result-format defect.

## Implementation review evidence

Full implementation approval requires inspectable candidate content, not only a commit SHA, changed-file names, an implementation summary, reported validation, or a Codex PASS. The review evidence must identify the exact reviewed-base/head tuple and scope already required by this workflow.

For a nontrivial local-only committed candidate that the reviewer cannot fetch, Codex normally generates the complete equivalent of `git diff --full-index <base>..<head>`, including new files, as a standalone `.patch` artifact outside the repository working tree. It does not commit, push, place in the PR, or print the patch contents inline by default. The result reports base/head, patch path or filename, byte size, SHA-256, changed-file count, completeness, and confirmation of complete full-index base-to-head coverage. Supply the patch through an available review channel; if no such channel is available, preserve a resumable checkpoint and stop at the review boundary. Do not assume Codex can contact this ChatGPT conversation automatically. An uncommitted candidate must return complete working-tree/index candidate evidence; this does not require committing or pushing unreviewed work. If the candidate is already remotely fetchable and the reviewer actually obtains the complete relevant contents from an authoritative source, Codex identifies that source and need not redundantly create the patch.

A genuinely small, easily inspectable diff may be supplied inline when that is more efficient, including when the task or reviewer explicitly requests inline evidence. Otherwise, substantial/nontrivial complete evidence defaults to the standalone patch. Partial or silently truncated evidence cannot support full exact-head implementation approval. New text files require full content in the diff/artifact. Binary or otherwise non-inline-reviewable artifacts require exact metadata/hash and an available artifact or source, with limitations disclosed. Candidate-content evidence remains separate from tests, validation, scope, architecture/contract, and CI evidence.

If the reviewer has not inspected the actual candidate contents, the result must say that review is summary-only, candidate inspection is incomplete, or review is blocked pending evidence. It must not represent technical approval as full exact-head implementation approval. Evidence transfer alone does not satisfy exact-head review; publication and merge still require repository eligibility, a valid reviewed tuple, required checks, and accepted Git policy.

## Reviewed-head rule

Once exact-head review passes, preserve the exact reviewed commit/tree/scope. After ADR-031 activation, a reviewed local checkpoint remains valid evidence for its unchanged historical tuple while a separately eligible successor creates a new candidate; that descendant has no inherited PASS. Do not amend, rebase, squash or replace checkpoint identities silently. For a frozen final integration candidate, any later commit, formatting, documentation/code change or uncommitted modification creates a new unreviewed head/state and prevents publication until renewed applicable review. Before ADR-031 activation the existing task-level publication rule remains in force.

Record the approved SHA and reviewed scope in publication evidence. This rule supplements existing Git/PR practice; it does not override branch, CI, or Product Owner-set merge policy. A valid exact-head PASS can progress under standing execution authority without another acknowledgement.

## Reviewed-base binding and integration tuple

For work intended for publication, technical approval is bound to an inspectable review tuple, recorded in the task and result evidence. After ADR-031 activation, distinguish each local checkpoint tuple from the separately reviewed cumulative integration tuple:

- reviewed target-base SHA/ref used for the review;
- reviewed implementation-head SHA;
- reviewed file scope;
- relevant review, validation, and CI/check evidence.

For a local checkpoint additionally record the current task's local-base SHA and the remote integration baseline separately, checkpoint ancestry and applicable contract/acceptance evidence. The local base need not equal remote main. The final cumulative integration review uses the actual target base; no local-base label substitutes for target-base assessment or transfers earlier approval.

This tuple establishes what was technically reviewed. Publication and merge may proceed under standing execution authority only after exact-head PASS, current-base/scope checks, required CI, accepted merge policy, and repository eligibility all hold.

Immediately before publication or merge, verify the current remote target branch against the reviewed target base. If it still equals the reviewed target base, continue under the existing exact-head, scope, CI, and merge-policy gates. If it has advanced, stop normal publication and perform a bounded impact assessment before proceeding. Do not automatically rebase, merge the target branch into the implementation branch, cherry-pick into a replacement commit, assume an unchanged head remains approved, or merge merely because there is no textual conflict.

The bounded assessment determines whether reviewed files or relevant contracts changed, integration semantics or conflicts exist, prior validation remains applicable, refreshed validation/review is required, or a replacement implementation commit is needed. A replacement, amended, or rebased implementation commit is a new unreviewed head under the reviewed-head rule. Refreshed work is proportional to the observed impact; target-base movement does not by itself require full reimplementation or a new architecture review.

The reviewed implementation-head SHA and the resulting merge-commit SHA are distinct objects when the accepted merge method creates a merge commit. Do not require them to be equal. Post-merge evidence instead verifies the reviewed head is in the resulting target-branch ancestry, the accepted target-base/integration state was used, the merged change corresponds to the reviewed scope, and no out-of-scope changes entered through publication.

Routine unattended merging remains ineligible unless accepted server-side protections enforce the required checks and merge policy; a reviewer qualification result alone cannot supply that enforcement. Verify live protections before relying on them. This condition is separate from reviewer authority and does not change the existing standing, checked publication flow.

## Implementation/publication separation

### Implementation gate

For nontrivial implementation tasks, Codex performs precheck, implements the bounded eligible scope, validates, and preliminarily self-reviews. It may make several local corrections within that one task before preparing the final reviewed candidate. It commits locally when the task permits, reports exact evidence and the resulting SHA, and stops at the required independent review boundary. A no-commit task stops with its validated working tree instead; later commit preservation remains a separate bounded action.

### Publication gate

After applicable exact-head PASS and required acceptance, Codex may publish under standing authority only at the recorded [integration boundary](DEVELOPMENT_WORKFLOW.md#github-publication-threshold), with eligibility and accepted Git policy satisfied. After ADR-031 activation this is the independently reviewed complete cumulative candidate, not merely a locally PASSed task. Record actual reviewed target base, final head/tree, full scope, local checkpoint evidence, relevant validation/check evidence and expected target state. Verify live target, branch/head, PR head and unchanged cumulative scope before pushing only reviewed work and creating/updating the PR. Inspect required CI jobs/commands/logs/artifacts; a green status alone is insufficient. Classify the complete cumulative PR diff using the existing CI policy. Confirm checks, base assessment, accepted merge method and reviewed scope before merge, retaining reviewed-head/checkpoint ancestry. On CI failure leave unmerged, inspect actual evidence, correct only settled behavior as a bounded local task, and renew applicable complete-candidate review/acceptance before publishing the new head. Never push an unreviewed correction for another CI attempt. Base movement/conflicts retain bounded assessment or stop.

The same operational flow may continue through deterministic post-merge reconciliation when task-specific restrictions do not exclude it: verify the merged scope, reviewed-head ancestry, required PR checks, and material coordination staleness. Do not automatically rerun full CI or historical qualification evidence on `push: main` solely because the already-validated PR was integrated, unless an accepted task-specific contract requires it. Make only mechanically determined coordination edits. Create a separate reviewed integration candidate only when the coordination change independently meets the publication threshold; do not publish immaterial history or bookkeeping. The reviewed implementation candidate remains frozen throughout.

Bundled reconciliation is permitted only when no new product, architecture, contract, error-semantic, roadmap-ordering, acceptance, scope, implementation, corrective, substantive-test, dependency, or configuration judgment is required and authoritative documents do not conflict. Otherwise stop and report `BLOCKED`; never infer the next engineering capability or repair the candidate. Any next engineering task must independently satisfy repository eligibility.

This split is not required for trivial tasks where existing repository practice allows a simpler flow. It never permits bypassing required review, CI, or accepted merge policy.

## Routine GitHub CI and protected-main policy

The required PR check contexts remain `Documentation / validate` and `Runtime foundation / validate`. Routine validation for these workflows runs on pull requests; do not repeat the full pipelines on `push: main` solely because an already-validated PR was integrated. A task-specific accepted qualification, release, deployment, or evidence contract may separately require post-merge execution.

Classify the complete PR change set conservatively using built-in Git/GitHub information. Clearly Markdown-only changes run documentation validation and applicable diff/format checks. The Runtime workflow must still produce its required context with an explicit successful `runtime validation not applicable to this diff` result, without Node/npm setup, dependency installation, runtime tests, builds, or historical qualification execution. Any runtime/source, test/evaluation, package/lockfile, script, workflow, runtime/configuration, mixed, or unknown change takes the pinned full-runtime validation path. Unknown or consequential configuration changes fail toward full validation; no third-party classification action is added.

Cancel obsolete in-progress PR workflow runs when a newer commit supersedes them, using GitHub-native concurrency and no third-party action. Routine PR or merge validation does not regenerate or upload accepted First Playable or Stage 7 AC-004 frozen qualification artifacts. Preserve their historical evidence and normal regression tests; execute qualification/requalification evidence only when an accepted task or release/qualification contract requires it, a relevant qualified boundary materially changes, or an explicitly authorized qualification workflow invokes it. This changes routine CI scope, not the accepted evidence or tests.

After the policy becomes binding and the separately reviewed routine-workflow implementation is protected-integrated, update the live main ruleset to retain the PR requirement, both required contexts, deletion and non-fast-forward protections, and no bypass actors, while setting `strict_required_status_checks_policy` to `false`. Verify the resulting live ruleset. Until it is actually updated and verified, use the existing live setting.

## Post-merge reconciliation

Keep [PROJECT_STATE.md](../PROJECT_STATE.md) materially accurate locally, distinguishing integrated capability from unpublished checkpoint/batch work. After ADR-031 activation prepare necessary related coordination before final cumulative review, using wording truthful before/after merge and Git/result evidence for actual integration identity. Do not add coordination after final PASS without renewed review. After merge verify ancestry, merged scope, CI evidence and material staleness. Do not create a standalone PR just to replace awaiting-review wording, record a PR/merge SHA or repeat an already-binding fact. A genuinely misleading integrated gate requires a bounded reviewed correction even if immediate publication is necessary. Preserve ROADMAP's capabilities/gates without accumulating history; permanent authority stays in its owners. Before activation retain current reconciliation mechanics. Task-specific restrictions and consequential judgments still stop; successor eligibility must be independently established.

## Root-cause discipline and resumption

Investigate failures from observed commands, paths, logs, and artifacts. Do not call a check incorrect merely because it failed, invent the cause of dirty paths or missing evidence, or weaken assertions, allowlists, custody, or validation to obtain PASS. Reuse inspected evidence until relevant files, contracts, or refs change; avoid identical retries without new evidence or a justified transient cause.

Keep a compact checkpoint in the existing task/result evidence: bounded task, remote integration baseline, actual local base/head/tree/scope, checkpoint ancestry, worktree/index, accepted contracts and exact review/acceptance receipts, completed/failed/pending validation, unresolved findings, intended integration boundary and next safe action. Record unpublished status and recovery/backup limits; a local-only commit has no verified remote backup. Session end does not force a PR or authorize an automatic unreviewed push/new backup service. Resume only after verifying live refs, exact local chain/ancestry, working state, contract/receipt validity and outstanding evidence. A materially large/coupled batch or needed earlier remote gate invokes the existing bounded assessment/decision path. Git owns history and PROJECT_STATE coordination; do not assume session automation or external review access that is unavailable.
