# First Playable Linux harness review finding

This record preserves a material unresolved finding for exact-head review continuity. It does not approve or correct the harness, qualify an environment, or replace the accepted [testing contract](../TESTING_STRATEGY.md#first-playable-qualification-repository-integrity).

| Field | Evidence |
| --- | --- |
| Finding | `FP-LINUX-002` |
| Status | `OPEN` |
| Origin reviewed base | `58e4494f4ea5584ad617d2d73d481947aa9c0e78` |
| Origin reviewed head | `e0c8ac89cad8f21f9815f0e491ed8a5d9fab5e65` |
| Affected source | `src/evaluation/first-playable-linux-evidence.ts`, Git blob `079fbcd54143ed60aac084da7391dfe606a38ec9` |
| Affected test | `src/evaluation/first-playable-linux-evidence.test.ts`, Git blob `ef98371b53a3194c073975ea0ab15e4cd68ab2f9` |
| Contract basis | `docs/TESTING_STRATEGY.md` requires ignored scratch, caches, or outputs to have an established non-input role for the actual invocation and says Git ignore matching alone grants no exemption. |
| Finding | The harness's ignored-state classification permits generic path/category exemptions without establishing their non-input role for the actual invocation. The candidate test accepts one such category, so that test does not independently justify the permission. |
| Continuity | Candidate `908da2c57f3896e840d10cfd8308a42e85d0735a` retains both affected blobs unchanged despite its different base and commit. The finding therefore remains applicable. |
| Resolution evidence | None. Closure requires a separately reviewed, contract-conformant correction with affected-content and invocation evidence; a new commit or branch alone does not close it. |

The broader pinned Windows/Linux qualification remains NOT STARTED. This record does not adjudicate other preliminary review comments or authorize First Playable code changes.
