# CI history: browser-smoke.yml on master (collected 2026-11-08)

Sources: `gh run list` (last 100 and last 400 master runs; 400 runs span 2026-11-02 07:13Z to 2026-11-08 12:00Z),
`gh run view --json jobs` for 28 recent completed runs (17 full, 11 docs-only), `gh run view --log-failed` for all 28
failed runs in the 400, git log of following commits, and local `.command-logs/`.
Raw data in this folder: `runs.json`, `runs400.json`, `jobs/*.json`, `fail/*.log`, `fail-summary.txt`, `next-commits.txt`, `local3.txt`.

## 1. Run outcomes and wall clock

| Window | Runs | Success | Cancelled (superseded) | Failure |
|---|---|---|---|---|
| last 100 (~36 h) | 100 | 78 | 17 (17%) | 5 (5%) |
| last 400 (~6 days) | 400 | 275 | 97 (24%) | 28 (7%) |

Success runs split into full runs and docs-only runs (scope job skips everything else, ~0.4 min).

| Window | Full successful runs | Median | p90 | Max | Docs-only runs |
|---|---|---|---|---|---|
| last 100 | 50 | 10.6 min | 13.8 min | 24.0 min | 28 (0.4 min) |
| last 400 | 159 | 12.2 min | 15.0 min | 24.0 min | 116 (0.4 min) |

Cancelled runs ran a median 7.2 min before being superseded (about 726 wall-minutes of cancelled runs in 6 days).
Failed runs take the same ~10 min (the smoke gate waits for every job).

## 2. Per-job durations (17 full runs, minutes)

| Job | Median | Max | Main step (median) |
|---|---|---|---|
| scope | 0.28 | 0.35 | checkout 13 s |
| checks | 2.23 | 2.53 | npm ci 39 s, tsc 41 s, lint 30 s |
| unit (1) | **9.53** | 13.35 | vitest 518 s (max 722) |
| unit (2) | 6.85 | 9.67 | vitest 353 s |
| unit (3) | 8.68 | 9.77 | vitest 426 s |
| build | 1.28 | 2.18 | npm ci 44 s |
| chromium lessons-1 | 5.73 | 6.02 | playwright 268 s |
| chromium lessons-2 | 6.27 | 6.93 | playwright 305 s |
| chromium lessons-3 | 4.67 | 5.95 | playwright 208 s |
| chromium other-specs | 6.28 | 8.03 | playwright 305 s (max 403) |
| smoke (gate) | 0.05 | | |
| deploy | 0.18 | | |

- Critical path: **unit (1)** finished last among pre-gate jobs in 11 of 17 full runs; unit (3) in 4, unit (2) in 1,
  chromium lessons-2 in 1. Chromium path = build 1.3 + chromium ~6.3 = ~7.6 min, about 2 min shorter than unit (1).
- Unit shards are unbalanced: shard 1 runs ~2.7 min longer than shard 2 (518 s vs 353 s of Vitest).
- npm ci costs 39-45 s in each of 9 jobs (~6.5 runner-min per full run). Install Chromium: 9 s median (cache hit).
- Sum of job medians: ~52 runner-minutes per full run.
- Start of first job to smoke gate: median 9.4 min; queue delay small.

## 3. Failure classification (all 28 failed runs, 2026-11-02 .. 11-08)

Categories: (a) real regression fixed by a code commit; (a-lint) lint error fixed in code;
(c) stale expectation: test lists/counts/contract tables or selectors not updated for an intended change, fixed by a
test commit; (c-asset) generated asset or provenance not recaptured, fixed by regenerating data; (b) flaky/timeout;
(d) infra.

| Run | Head | Failed job(s) | Failing test | Class | Resolved by |
|---|---|---|---|---|---|
| 41404923863 | 70491e6c | unit 2 | GraphTransientState.part4 inscribed-angle rollback | c | 62ad3616 test |
| 41431454866 | ef4f8f21 | other-specs | demonstrations.smoke:114 provenance interp-subdivision | c-asset | bbcd8a34 poster capture |
| 41433556719 | 9bede337 | other-specs | same | c-asset | same |
| 41437547157 | a142bf70 | other-specs | same | c-asset | same |
| 41441375191 | e762b621 | other-specs | same | c-asset | same |
| 41442928082 | 1ed73370 | other-specs | same | c-asset | same |
| 41444026530 | 45e65db6 | unit 1, other-specs | Routes.test route count (+ provenance) | c | 380b2a0e test |
| 41517322471 | 0dda6376 | unit 2 | PresetCatalog (interp-least-squares key) | c | 58aff938, 95a8e3e5 test |
| 41536578409 | 5ef8c821 | unit 1, 2 | GraphTransientState.part2/3 projective Preset keys | c | 5b1a01f8 test |
| 41571874578 | 65fbad83 | checks | lint no-useless-escape (probe script) | a-lint | 6754e336 |
| 41578946493 | f2ecb13c | lessons-1 | rational-function: points outside lesson view | **a** | 11926a7d, 0aa19043 fix |
| 41579583362 | 0c773135 | unit 2, lessons-1 | prob-summary rollback contract + rational-function | c + a | 7601ea6a test; 0aa19043 |
| 41580863143 | eed10ca6 | unit 2, lessons-1 | same | c + a | same |
| 41582298301 | 0aa19043 | unit 1, 2 | prob-summary rollback + guidedExamplePreviews S4 card | c (+c-asset) | 7601ea6a; 8601b0b2 recapture |
| 41584845703 | 7b8ac495 | unit 2 | prob-summary rollback contract | c | 7601ea6a test |
| 41586412506 | fca39858 | unit 2 | rollback + PresetCatalog | c | 7601ea6a, 37a4922f |
| 41588305392 | 7601ea6a | unit 2 | PresetCatalog counts (P4/P5) | c | 37a4922f test |
| 41590409905 | 3e711627 | unit 2 | same | c | same |
| 41593436905 | 7e4e8c23 | unit 2 | same | c | same |
| 41957027953 | 1db51752 | lessons-2 | repeated-subdivision exit/re-enter, 150 s timeout | b | none (passed next run) |
| 42168744598 | 32556619 | unit 3 | PresetCatalog (compgeo-bezier-clipping) | c | 54c528f5 test |
| 42233940859 | c3671955 | unit 1 | GraphTransientState.part4 bspline-nurbs figure batch (curve n=491 vs 516) | **a** | 0be8f98f, 8f197e8b NURBS scene per mount |
| 42308870860 | d01a221a | unit 1 | mathAltText: LaTeX left in card alt text | **a** | 39084ff0 fix |
| 42325596620 | 5825ceba | lessons-3 | lesson-experience-checks toolbar position after frame change | **a** | 325d36ec fix |
| 42326388640 | 0c581578 | lessons-3 | same | **a** | same |
| 42404388618 | b91fbe77 | other-specs | demonstrations.smoke:54 catalogue, 60 s timeout | b / budget | aa16b1fe test timeout raised |
| 42460836483 | c8f48cd1 | checks | lint no-useless-escape compgeo-traces.cjs | a-lint | folded into 1a4d6956 |
| 42475921993 | 2fc4a346 | other-specs, lessons-2 | 8 specs + ph-cubic wait for removed `.point-coordinate-editor` | c (selectors) | **unresolved**: 97d22db4 removed PointCoordinateEditor; later runs are docs-only, so chromium never re-ran and master shows green |

Summary by run (primary class, mixed runs counted under both where noted):

| Class | Runs | Distinct causes |
|---|---|---|
| (a) real behavior regression | 5 (+2 mixed) | 4: rational-function view, NURBS rebuild, alt text, toolbar position |
| (a-lint) | 2 | 2 |
| (c) stale contract/count/selector expectation | 12 | 8 |
| (c-asset) generated asset/provenance drift | 5 | 2 |
| (b) flaky / timeout | 2 | 2 |
| (d) infra | 0 | 0 |

- About a quarter of failing runs (7 of 28) caught real user-visible bugs; ~60% (17) were cross-stream bookkeeping:
  route/Preset/lesson count tables, transient-state contract lists, and posters/provenance that new registrations
  must update. Git history shows many more such commits landing before CI ("test: recount ... after rebase").
- True flake rate is low: 2 of ~303 completed runs (0.7%). No infra failures.
- Several failures repeat over consecutive pushes (provenance x5, PresetCatalog x4, rollback x5) because parallel
  streams kept pushing before the fix landed; runs, not causes, inflate the count.
- Docs-only runs mask red state: after 42475921993 the next four runs were docs-only and green, while the chromium
  failure is still present on master code.

Most frequent failing files (runs):
1. `src/graphs/base/GraphTransientState.part{2,3,4}.test.tsx` - 9
2. `src/graphs/base/presets/PresetCatalog.test.tsx` - 7
3. `tests/demonstrations.smoke.spec.cjs` - 7 (6 provenance, 1 timeout)
4. `tests/guided-lessons.smoke.spec.cjs` - 5 (rational-function x3, repeated-subdivision, ph-cubic)
5. `tests/lesson-experience-checks.cjs` - 2
6. one each: Routes.test.tsx, guidedExamplePreviews.test.ts, mathAltText.test.ts, curve-ownership/library-picker/
   workflows/standalone-learning smoke (same run)

Log noise: every unit log carries thousands of `TypeError: window.matchMedia is not a function` and
`The surface view could not start. Error: no webgl` lines (non-failing); failed unit logs are 6-20 MB.

## 4. Local `.command-logs/`

709 entries, 511 parsable timestamped runner logs. The runner's summary line (`<scope>: passed in Ns`) goes to stdout,
not the log, so scope and duration are inferred from the logged argv and the Vitest/Playwright summary. Coverage is
heavily skewed to 2026-10-18..10-28; only a handful of logs from November remain (older or pruned), so the trend is
weak.

| Kind | Logs | Notes |
|---|---|---|
| vitest | 177 | 132 focused runs (median 4 s, 22 failed = 17%); full runs below |
| playwright | 110 | full-ish runs (>=150 tests): 10-20 median 246 s, 10-21 228 s, 10-23 276 s; 5 of 9 had failures |
| tsc | 104 | 18 with `error TS` |
| build | 98 | median 4-8 s by log mtime in October, 13 s on 11-07 (mtime-based, approximate) |
| lint | 21 | |

Full unit runs (>=150 files): 10-20 median 135 s (153 files), 10-21 143 s, 10-27 103 s (156 files),
11-03 981 s (560 files, one run, likely under the shared test-slot queue). The test suite grew ~3.6x in files in two
weeks; docs/commands.md records a 269 s full `just unit` at 10 workers and 483-584 s each for four concurrent runs.
CI Vitest time is consistent: 3 shards totalling ~21 runner-min.
