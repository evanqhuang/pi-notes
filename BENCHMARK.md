# Exploratory Notes A/B benchmark

This document reports an exploratory long-horizon evaluation of `pi-notes`.
It is intentionally more conservative than a product benchmark: the run found
useful case evidence, but several harness and experimental-design defects mean
that it does **not** identify a causal productivity or quality effect.

## Executive summary

- Harness: `harness-1789204569100-83132b78`
- Run window: 2026-09-12 through 2026-09-13
- Model: local `qwen38-main/qwen3.8-27b`, medium thinking
- Scenarios: 12, each run once without Notes and once with Notes
- Arms: 24 total; 23 exited normally and one Notes-present arm timed out
- Completed pairs: 11; one pair was censored by the timeout
- Primary conclusion: **hypothesis-generating evidence only**

Across the 11 pairs in which both arms completed, Notes-present was faster in
7 and slower in 4. The mean paired duration difference was -8.81 minutes and
the median was -17.38 minutes. Those pooled figures combine two repositories,
different implementations, and conditionally comparable HostelHawk runs; they
must not be interpreted as an average Notes treatment effect.

A read-only audit of the retained changes judged Notes-present stronger in six
scenarios, Notes-absent stronger in two, mixed or inconclusive in three, and
the timed-out Notes-present scenario unfinished. This audit was not blinded,
did not execute an independent acceptance suite, and is separate from the
telemetry results.

The benchmark did establish several actionable facts:

1. Notes was present and active only in the intended arm and was used in every
   Notes-present scenario.
2. Agents executed `checkpoint_notes` 55 times: 38 checkpoints committed and
   17 calls were rejected for invalid payloads.
3. Fifty provider generations, 2.1% of Notes-present requests, contained only
   checkpoint work.
4. All 41 observed compactions succeeded. Notes-present did not show lower
   repetition or post-compaction rediscovery in this single-run sample.
5. The current report pairing, dirty-start detection, verification
   classification, and cache telemetry all require fixes before a controlled
   rerun.

## Research question

The evaluation asked whether a compact, session-local durable handoff helps a
local model complete long engineering tasks more efficiently and reliably,
especially after compaction or a late change in requirements.

The intervention was the Notes tool surface:

- **Notes-absent:** `pi-notes` was omitted entirely. The arm did not use
  `/notes off`, because that would leave the package and its policy in context.
- **Notes-present:** `pi-notes` was loaded and active, including
  `checkpoint_notes` and its static policy.

Both arms otherwise used the same scenario prompt, model, thinking level,
compaction fingerprint, target commit, and local-only execution policy.

## Benchmark design

Eight scenarios targeted the Records Dashboard baseline
`696115bf11aaa58dd5a69e417d968bf778815c16`. Four targeted the HostelHawk
baseline `615448114a0a951b349bbdf1a3b89cae2fabb05c`.

The harness created a detached worktree and fresh Pi session for each arm. It
ran all arms sequentially, always Notes-absent before Notes-present, with a
three-hour execution timeout. The recorder captured bounded, sanitized events
for requests, tools, verification-like commands, checkpoint activity,
compaction, and token usage. Raw session transcripts and private reasoning are
not part of this report.

The 12 scenarios exercised:

- durable CRUD workflows and exports;
- refresh, retry, lifecycle, and operator-control behavior;
- recorded-document and provenance workflows;
- architecture investigation and late requirement changes;
- failure recovery; and
- implementation followed by independent review and remediation.

## Evidence tiers

The report keeps four kinds of evidence separate:

1. **Run validity:** matching configuration, clean or conditional start,
   complete shutdown, timeout, and recorder integrity.
2. **Efficiency telemetry:** wall time, requests, tools, errors, and tokens.
3. **Mechanism telemetry:** checkpointing, compaction, repetition, and
   rediscovery.
4. **Implementation evidence:** retained diff, requirement coverage, tests,
   documentation, and final verification claims.

Only the first three are machine-derived. Implementation verdicts are
read-only artifact judgments and are not independent acceptance results.

## Run disposition

| Cohort | Pairs | Disposition |
| --- | ---: | --- |
| Clean Records | 7 | Both arms completed with clean starts |
| Records provenance monitor | 1 | Notes-present timed out at three hours |
| HostelHawk | 4 | Both arms completed; automated reports excluded them for `dirty-start` |

Both source checkouts were recorded as `sourceDirty=true`, which means their
main working directories contained uncommitted files. Those files were not
copied into the detached evaluation worktrees. The separate per-run
`dirtyStart` field was false for every Records arm and true for every
HostelHawk arm.

The HostelHawk `dirtyStart` exclusion is likely a harness artifact. The harness
created an untracked `node_modules` symlink before the recorder ran
`git status`. HostelHawk ignores `node_modules/` directories but not the bare
symlink, so all eight HostelHawk arms received `dirtyStart=true`. Both arms of
every pair still used the same commit and task hash.

For that reason, HostelHawk is manually comparable as conditional evidence,
but it is reported separately from the clean Records cohort.

No arm emitted the recorder's `goal_progress({ status: "done" })` completion
signal. That signal is optional and observational; its absence is not evidence
that all 24 implementations failed.

## Efficiency results

All deltas below are Notes-present minus Notes-absent. Negative time, request,
tool, and token deltas indicate less work in the Notes-present trajectory.

### Clean Records cohort

| Scenario | Duration | Turns | Tools | Tool errors |
| --- | ---: | ---: | ---: | ---: |
| Saved due-diligence case file | -17.38 min | -3 | -15 | 0 |
| County-record refresh | -25.31 min | -83 | -60 | -11 |
| Recorded-document search | +3.21 min | -4 | -13 | -3 |
| Owner-request lifecycle | -28.29 min | -1 | +12 | +8 |
| Agent-task operations | -33.96 min | -89 | -65 | -2 |
| Screening comparison and retry | -7.04 min | +48 | +40 | +3 |
| Investigation bundle export | +24.18 min | +18 | +32 | +10 |
| **Mean paired delta** | **-12.09 min** | **-16.29** | **-9.86** | **+0.71** |
| **Median paired delta** | **-17.38 min** | **-3** | **-13** | **0** |

Notes-present was faster in five of seven clean completed pairs. Mean input
tokens fell by 1.752 million and mean output tokens by 13,224 per pair. These
means are sensitive to individual scenarios: agent-task operations alone
contributed an 11.407 million input-token reduction.

### Timed-out Records pair

The Notes-present provenance-monitor arm reached the fixed three-hour limit
and was terminated by the harness with exit code 143. It ended without a
normal recorder shutdown or final report.

Before termination it had made 321 provider requests and 349 tool calls,
compared with 183 requests and 212 tools in Notes-absent. It consumed 32.327
million input tokens versus 18.313 million. This is a reliability outcome and
must not be dropped or converted into a completed duration delta.

### Conditional HostelHawk cohort

| Scenario | Duration | Turns | Tools | Tool errors |
| --- | ---: | ---: | ---: | ---: |
| Multi-phase architecture investigation | +9.87 min | +11 | +12 | +3 |
| Late requirement change | -89.38 min | -75 | -89 | +2 |
| Failure-recovery hardening | -33.43 min | -90 | -85 | -2 |
| Implementation review and remediation | +100.63 min | +119 | +130 | +31 |
| **Mean paired delta** | **-3.08 min** | **-8.75** | **-8.00** | **+8.50** |
| **Median paired delta** | **-11.78 min** | **-32** | **-36.50** | **+2.50** |

This cohort is dominated by opposing outliers. Removing the implementation
review changes the mean duration delta from -3.08 to -37.65 minutes. The late
requirement run was much faster with Notes but appears to have traded some
original-scope completeness for deeper compatibility work. The implementation
review delivered broader remediation with Notes but at 3.36 times the runtime.

### Overall usage

| Metric | Notes-absent | Notes-present |
| --- | ---: | ---: |
| Provider requests | 2,402 | 2,391 |
| Tool calls | 2,802 | 2,838 |
| Tool errors | 88 | 140 |
| Input tokens | 231,331,864 | 229,848,996 |
| Output tokens | 1,895,579 | 1,839,948 |
| Reported total tokens | 233,227,443 | 231,688,944 |

The combined run reported 464,916,387 logical tokens. Output already includes
reasoning tokens and must not be double-counted.

Cache-read and cache-write fields were zero in every arm because the active
local server did not expose prompt-token detail telemetry. Zero therefore
means **unavailable telemetry**, not demonstrated absence of prefix caching.
Exact cached-versus-uncached usage and equivalent billing cannot be recovered
for this run.

## Notes mechanism results

### Checkpoint execution

Notes-absent made no checkpoint calls. Every Notes-present scenario used the
tool.

| Scenario | Executions | Committed | Invalid |
| --- | ---: | ---: | ---: |
| Saved due-diligence case file | 5 | 3 | 2 |
| County-record refresh | 4 | 4 | 0 |
| Recorded-document search | 4 | 3 | 1 |
| Owner-request lifecycle | 4 | 3 | 1 |
| Agent-task operations | 4 | 3 | 1 |
| Screening comparison and retry | 6 | 6 | 0 |
| Provenance drift monitor | 13 | 8 | 5 |
| Investigation bundle export | 2 | 1 | 1 |
| Multi-phase architecture investigation | 3 | 3 | 0 |
| Late requirement change | 2 | 2 | 0 |
| Failure-recovery hardening | 6 | 1 | 5 |
| Implementation review and remediation | 2 | 1 | 1 |
| **Total** | **55** | **38** | **17** |

The 17 rejected calls were malformed payloads, usually a list field supplied
as a string or a required field omitted. This 30.9% invalid-call rate is a
tool-usability defect worth addressing before measuring checkpoint benefit.

The evaluator's `checkpoint_attempt` hook saw only the 38 schema-valid calls.
Calls rejected by generic tool validation never reached that hook. Generated
reports therefore showed zero checkpoint failures even though 17 executions
failed. Future telemetry must count tool execution and validation rejection,
not only accepted checkpoint attempts.

Fifty Notes-present generations contained only checkpoint work, or 2.09 per
100 provider requests. There were no ambient `notes_reminder` events in either
arm, so the observed checkpoint overhead was not reminder-driven.

### Compaction and continuity

| Metric | Notes-absent | Notes-present |
| --- | ---: | ---: |
| Compaction attempts | 21 | 20 |
| Successful compactions | 21 | 20 |
| Failed compactions | 0 | 0 |
| Mean recorded recovery | 69.49 s | 62.82 s |
| Repeated tool calls | 44 (1.83/100 requests) | 69 (2.89/100) |
| Post-compaction rediscoveries | 40 (1.67/100) | 49 (2.05/100) |

The clean Records pairs averaged exactly the same number of compactions in
both arms. Notes-present had slightly faster recorded recovery overall, but
more repetition and rediscovery. Scenario trajectories and compaction timing
differed, so these observations do not establish mediation or a Notes effect.

The implementation-review Notes-present arm had one threshold compaction. It
succeeded and recorded recovery after 43 seconds. A preliminary audit that
listed this as a failure was checked against the event stream and corrected.

## Implementation evidence

The following verdicts come from a read-only comparison of prompts, retained
worktree changes, and recorded verification evidence. They are useful case
studies, but they were not blinded and no independent evaluator reran the
acceptance criteria.

| Scenario | Artifact verdict | Evidence summary |
| --- | --- | --- |
| Saved case file | Notes-absent stronger | Clearer deterministic export and richer case-file contract; Notes-present had broader UI but less visible findings/export coverage. |
| County refresh | Notes-present stronger | More focused worker/UI coverage with durable lifecycle and compare-and-swap semantics; login redirect still dropped the original target. |
| Recorded-document search | Mixed | Notes-present added useful revision and polling behavior, but lacked a final completion report and UI E2E remained auth-blocked. |
| Owner-request lifecycle | Notes-present stronger | Added terminal send-failure handling, bounded budgets, cancellation, key scoping, UI, and broader integration coverage. |
| Agent-task operations | Notes-present stronger | Stronger operator authorization, privacy projection, audit trail, proxy gating, pagination, and UI; live browser authorization remained unverified. |
| Screening comparison/retry | Mixed, slightly favoring Notes-present | Added current-state policy checks and comparison UI, but both arms implemented different contracts and Notes-present E2E self-skipped. |
| Provenance drift monitor | Notes-absent stronger | Notes-present produced a larger unfinished change and timed out without final verification. |
| Investigation bundle export | Notes-present stronger | Coherent durable artifact/export path and explicit route-context remediation; complete integration evidence was limited by emulator contention. |
| Multi-phase architecture | Notes-absent stronger | Both were partial; Notes-absent retained broader database, scraper, cache, and integration coverage. |
| Late requirement change | Mixed | Notes-present targeted legacy compatibility well but had less visible evidence for the original full CRUD/UI scope. |
| Failure recovery | Notes-present stronger | Smaller, explicit failed-alert-delivery contract with focused transition and SQL tests; no live database run was available. |
| Implementation review | Notes-present stronger at disproportionate cost | Added quota enforcement, row locking, conflict behavior, concurrency evidence, and remediation, but incurred extensive retry and diagnostic churn. |

Conservative summary:

- Notes-present stronger: 6 scenarios
- Notes-absent stronger: 2 scenarios
- Mixed or inconclusive: 3 scenarios
- Notes-present unfinished due to timeout: 1 scenario

Speed and artifact quality did not move together. Of the six scenarios judged
stronger with Notes, four were faster and two were slower. One of the two
Notes-weaker outcomes was nevertheless faster. This reinforces that telemetry
cannot substitute for an independent quality evaluator.

## Implementation-review outlier

The largest regression was implementation review and remediation:

- duration: +100.63 minutes;
- turns: +119;
- tools: +130;
- tool errors: +31;
- input tokens: +12.875 million;
- repeated tool calls: +22; and
- post-compaction rediscoveries: +9.

The extra work was not only empty churn. The Notes-present result added a
per-account favorites quota, transactional row locking, conflict behavior,
broader server/component tests, and an explicit audit that found and remediated
two concrete gaps.

The quality gain was not proportional to the cost. The trajectory included
three attempted subagent launches—two blocked before launch and one started in
the background—followed by three premature result checks that all found the
agent still running. The telemetry does not isolate a defensible subagent wait
cost. It also included 13 failed edit operations and repeated exact-pattern
repair scripts. Nineteen of the 22 events labeled `test:error` were Python
`pattern not found` assertions from edit/check scripts. The other three were
inspection or chained shell commands that were also classified lexically;
none establishes that a product test suite ran and failed. One invalid
checkpoint call and one successful compaction added smaller overhead.

The supported interpretation is that Notes-present followed a broader,
more exhaustive remediation path and then executed it inefficiently. The
single trajectory cannot determine whether Notes caused either the additional
quality work or the churn.

## Measurement defects and limitations

### Confirmed harness defects

1. **Cross-worktree repository identity broke pairing.** The experiment key
   hashes the resolved worktree root. Each arm therefore received a different
   experiment key despite matching commits. Scenario reporting selected the
   first arm's key and silently omitted the second, producing zero generated
   pairs. This report reconstructed pairs manually by scenario and arm.
2. **Dirty-start detection included setup artifacts.** The recorder captured
   Git status after the harness created dependency and environment symlinks.
   This excluded all HostelHawk arms for an untracked dependency symlink.
3. **Checkpoint failures were undercounted.** Schema-invalid calls failed
   before `checkpoint_attempt`, so the report missed 17 failed executions.
4. **Verification classification was lexical.** Commands containing words
   such as `test`, `check`, or `build` were counted as verification even when
   they were search or edit scripts. A non-error tool result was generally
   treated as success without validating a prescribed gate.
5. **General tool errors were omitted from pair reports.** Live activity had
   them, but `ReportRow` and `PairDelta` did not.
6. **Missing cache telemetry was coerced to zero.** The report had no
   availability indicator and could not distinguish missing data from a real
   zero.

### Experimental limitations

- Only one stochastic replicate was run per arm and scenario.
- Notes-absent always ran first, confounding Notes with cache warming, server
  state, filesystem state, and time.
- The two arms could choose materially different implementations.
- Shared dependency and environment symlinks weakened isolation.
- One Notes-present arm timed out and must be treated as a failure or censored
  observation, not silently excluded.
- The agent wrote its own tests and reported its own completion. There was no
  predeclared, independent correctness oracle.
- Runtime identity omitted Pi version, full extension/tool inventory,
  model-server build, sampling settings, dependency snapshot, and external
  service state.
- Harness wall time and evaluator session time began at different points.

These limitations prevent significance tests, confidence intervals, pooled
event-level regressions, or a causal estimate from this run. Turns and tool
events are not independent samples. Trimming the timeout or the two large
HostelHawk outliers would be post hoc and misleading.

## Interpretation

Publication-safe conclusion:

> Across 12 heterogeneous long-horizon engineering scenarios, the harness
> generated case evidence that agents actively used durable Notes and, in
> several cases, produced stronger retained implementations with fewer turns
> or less time. Other cases showed substantial checkpoint validation failures,
> increased repetition, a timeout, and one severe efficiency regression.
> Because assignment was sequential, replication was single-run,
> implementations differed, and telemetry/pairing defects affected the
> record, the run does not identify a causal productivity, reliability, or
> quality effect of `pi-notes`.

The practical value of this run is diagnostic. It identified scenarios worth
repeating, exposed tool-schema and harness defects, and produced concrete
hypotheses:

- concise checkpoints may help some agents preserve task structure and reduce
  search or implementation work;
- checkpoint-only turns and malformed payloads can erase those gains;
- Notes may encourage broader review behavior in some trajectories; and
- continuity benefit should be evaluated with objective post-run quality, not
  inferred from compaction or self-reported verification.

## Required rerun

Before making a product claim:

1. Use a canonical repository identity and explicit
   `scenario × replicate × pair` identifiers.
2. Capture baseline cleanliness before injecting setup artifacts, and record
   setup-generated changes separately.
3. Randomize or counterbalance arm order within each scenario and replicate.
4. Run at least five paired replicates per scenario; use more for timeout-prone
   or high-variance tasks.
5. Pin and hash Pi, extension revisions, tool surface, system prompt,
   dependencies, model-server build, model checkpoint, sampling parameters,
   context settings, and external-service state.
6. Use isolated immutable dependencies, environment files, databases, and
   server/cache state per arm.
7. Predeclare timeouts, exclusions, primary outcomes, and scenario-specific
   acceptance tests. Count timeouts as outcomes.
8. Run an independent evaluator against each retained diff in a fresh
   worktree. Use blinded reviewers and a fixed quality rubric.
9. Record structured command identity, exit code, signal, timeout, and
   framework result instead of lexical verification classification.
10. Record cache-telemetry availability, cached and uncached input, reasoning
    output, retry attempts, adaptive reasoning changes, and tool-error classes.
11. Count malformed checkpoint executions and test a simpler schema or better
    corrective guidance before measuring checkpoint reliability.
12. Report paired per-scenario effects, ranges, missingness, and repository
    strata. Do not pool events as independent observations.

## Artifact policy

The durable report records the harness ID, baseline commits, scenario names,
and derived measurements. Generated manifests, event streams, worktree diffs,
and session logs remain local evaluation artifacts. Machine-local absolute
paths and raw transcripts are deliberately omitted because they are not
portable and may contain prompts, tool arguments, local paths, or private
reasoning.
