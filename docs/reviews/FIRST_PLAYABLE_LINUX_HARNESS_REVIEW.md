# First Playable Linux harness review finding

This record preserves the origin and reviewed resolution of a material finding for exact-head review continuity. It does not replace the accepted [testing contract](../TESTING_STRATEGY.md#first-playable-qualification-repository-integrity) or broaden the completed qualification.

| Field | Evidence |
| --- | --- |
| Finding ID | `FP-LINUX-002` |
| Status | `RESOLVED` |
| Origin reviewed base | `080381de0d95c9e1eeed9fbb4152633aac6c8ac5` |
| Origin reviewed head | `e0c8ac89cad8f21f9815f0e491ed8a5d9fab5e65` |
| Affected source | `src/evaluation/first-playable-linux-evidence.ts`, Git blob `079fbcd54143ed60aac084da7391dfe606a38ec9` |
| Affected test | `src/evaluation/first-playable-linux-evidence.test.ts`, Git blob `ef98371b53a3194c073975ea0ab15e4cd68ab2f9` |
| Contract basis | `docs/TESTING_STRATEGY.md` requires ignored scratch, caches, or outputs to have an established non-input role for the actual invocation and says Git ignore matching alone grants no exemption. |
| Finding summary | The harness's ignored-state classification permits generic path/category exemptions without establishing their non-input role for the actual invocation. The candidate test accepts one such category, so that test does not independently justify the permission. |
| Continuity | Candidate `908da2c57f3896e840d10cfd8308a42e85d0735a` retains both affected blobs unchanged despite its different base and commit. The finding therefore remains applicable. |
| Resolution evidence | Exact-head-reviewed candidate `82e528f248d8d4a43ed86bfc3766bcf29de1ab79`, integrated through PR #212, removes the generic ignored-path exemptions. Its harness fails closed on unexplained ignored inputs or resolution influences, while the workflow runs qualification after locked dependency installation and before validation/build outputs. The reviewed Linux artifact and later Windows artifact both report repository-integrity PASS under that behavior. |

The broader pinned Windows/Linux representation/replay qualification is complete and recorded in the [platform qualification record](FIRST_PLAYABLE_PLATFORM_QUALIFICATION.md). That completion does not change this finding's historical origin or affected blobs and does not authorize later First Playable capabilities.
