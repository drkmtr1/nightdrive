# First Playable platform qualification

## Disposition

**PASS — representation/replay qualification complete for the accepted Windows ARM64 and Linux x64 matrix.**

The twelve frozen First Playable vectors ran unchanged in fresh processes under exact Node `24.21.0` and npm `11.19.0`. Both platform members passed repository integrity, frozen-artifact custody, all 61 portable tracked-source Git-blob checks, all 61 applicable historical-checkout relationship checks, replay, verifier, and production-to-oracle comparisons. The exact cross-platform comparison found no difference in canonical component values, all five serialized JSON strings, decoded UTF-8 bytes and lengths, component hashes, `resultHash` values, final-byte fingerprints, replay results, frozen identities, or provenance.

This is representation/replay evidence for the accepted First Playable canonical boundary. It is not independent musical proof, a population or listening claim, browser evidence, playback/audio evidence, UI evidence, or authority for Stage 8 or Stage 9.

## Reviewed implementation and runtime identity

| Evidence | Identity |
| --- | --- |
| Integrated implementation | PRs #212, #214, and #215; final main commit `416bc578f18aa644fe48b60ad059c9dfc8552e6e` |
| Final implementation tree | `7c640667dbd77807c82f3dbe3e713055469bcfe1` |
| Linux tested commit | PR #215 merge-test commit `5ded128d740297348851d19645a467e1cac9ec74` |
| Linux tested tree | `7c640667dbd77807c82f3dbe3e713055469bcfe1`, exactly equal to the final implementation tree |
| Windows tested commit/tree | `416bc578f18aa644fe48b60ad059c9dfc8552e6e` / `7c640667dbd77807c82f3dbe3e713055469bcfe1` |
| Linux environment | GitHub Actions Linux x64, workflow run `36124041816`, Node `24.21.0`, npm `11.19.0` |
| Windows environment | Supported local Windows ARM64 host, Windows release `10.0.26200`, process and host architecture `arm64`, Node `24.21.0`, npm `11.19.0` |

The differing tested commit SHAs do not represent differing runtime content: the Linux merge-test commit and final main commit have the same complete Git tree. The cross-platform comparison therefore covers one exact implementation tree.

## Artifact custody

| Artifact | Byte length | SHA-256 | Disposition |
| --- | ---: | --- | --- |
| Linux qualification evidence | 5,408,145 | `5554d8272bf9051cd4d3eee108d6ecf91fad1f4c54514524c1b266d4200354a5` | `PASS` |
| Windows ARM64 qualification evidence | 5,398,082 | `3350df1055d0942315be395e9b22b1a063a7deb51eae39a4f459e0bc09af9243` | `PASS` |
| Exact cross-platform comparison report | 5,247 | `fbea8f90c6d0f926132b28593c243c5faa0fdae3ea9d4e7c6b91719f91f80524` | `PASS`, 12 vectors |
| Initial Windows npm-resolution preflight | 1,988 | `c8f8f9983e418168a55c43a663713f4a57a2870bb980f3b72b1103d786a3197a` | Expected fail-closed evidence; no rows ran |
| Ordinary Windows checkout frozen-custody preflight | 2,355 | `939640881907aa3b18531df4c6cf76743dc0d4aeb3eb32f67352bc99e41b31ec` | Expected fail-closed MIA-003 byte mismatch; no rows ran |

The two failure artifacts are retained evidence that preflight blocked execution instead of repairing, normalizing, exempting, or rebaselining an input. The successful Windows run used a clean full-history checkout created with `core.autocrlf=false` before checkout. Its reference manifest matched the accepted 61,686-byte identity `087a23f06a1bbe5dd834b6c533de0c9a5aef9228c719667390d33458ac514a28`, and its source records matched the accepted 124,275-byte identity `3a067218a0dd9d992e236ccff5fab839fa8c14b832c3436718453f305fda1946`. This preserves MIA-003 as deferred/non-blocking and authorizes no remediation.

## Execution and comparison evidence

- Each platform executed four timezone/locale runs, twelve rows per run, and one fresh process per row: 48 successful process records and 48 successful vector rows per platform.
- Every process exited zero with empty stderr and recorded the required runtime/environment facts.
- Both platform artifacts recorded all five frozen generated-artifact identities, all 61 portable tracked Git-blob identities, and all 61 applicable historical checkout relationships as passing.
- The Windows historical checkout evidence recorded 55 `lf-to-crlf` and six `raw-git-blob` relationships without treating today's checkout as the historical capture.
- Independent consequential evidence review inspected the artifact bytes and identities, 192 tracked worktree files against the tested commit, all 96 process records, all 96 result rows, decoded base64 payload bytes and digests, custody dispositions, same-tree reconciliation, and the exact comparison. It returned `PASS` with no finding.
- A fresh `npm run validate` after the Windows qualification passed formatting for 132 files, lint for 132 files, typecheck, 53 test files with four skipped, 1,037 tests with eight skipped, documentation checks for 30 required and 49 Markdown files, production build, and `git diff --check`.

## Contract reconciliation and limits

This evidence satisfies the First Playable platform execution and zero-tolerance comparison gate defined by the accepted testing strategy for the declared Windows ARM64 and Linux x64 matrix. It supports the representation/replay obligations associated with AC-004 / NFR-001 for this canonical boundary without changing those requirements, the frozen source/reference/oracle artifacts, or ADR-024.

The frozen snapshots remain evidence of accepted upstream component behavior rather than independent musical truth. Hash agreement does not replace the retained byte comparisons, and production agreement does not re-accept or rebaseline the oracle. MIA-003 remains deferred/non-blocking. PR #184 remains preserved as historical failed-candidate evidence, and PR #205 remains separate historical/open harness work. Browser canonical generation, playback/audio, UI, persistence, Stage 8, Stage 9, and later product sequencing remain unauthorized.
