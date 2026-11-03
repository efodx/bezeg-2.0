# F6 acceptance: sweep S2 (C3, C4)

Handler: geometry handler 40 (Opus 5.5), 2026-11-03. Spec: [sweep-line algorithms](../../../specs/sweep-algorithms-lessons.md) C3, C4 and its [batch-wide gate](../../../specs/sweep-algorithms-lessons.md#batch-wide-acceptance-gate). Tasks: [sweep 14–21](../../../tasks/sweep-algorithms/README.md). Procedure: as the [T2 record](f6-t2-acceptance.md).

**State: accepted 2026-11-03.** The release condition holds: S1 was released on 2026-11-02 ([record](f6-t1-s1-acceptance.md)), and so was Triangulation T1, which C4 compares with. ADR 0035 (S0) is accepted. S3 (C5 Fortune) is next in the sweep family, and it needs T3 accepted first.

## Evidence

- **Criterion-to-test matrix:** [f6-s2-evidence-matrix.md](f6-s2-evidence-matrix.md). A Sonnet `bezeg-reviewer` read the files at `3b5c93c1` without running them. Of 53 rows, 40 were covered, 10 partial and 3 missing. Random tests stay within the spec bound (n ≤ 15, 250 polygons each, 183 of them with equal-height ties).
- **Gaps, fixed in `358a2a67`:**
  - **Lesson text tests.** A Sonnet `bezeg-worker` added `compgeoMonotoneLessons.test.ts` and extended both lesson-action host tests. In sl and en they check:
    - the quoted C3 and C4 numbers against the kernel and the panel;
    - the C3 tie rule and the three-collinear refusal;
    - the C4 partition-first statement, the ear-clipping contrast, the growth statement given as an illustration, and no claimed saving (piece 1: 7 > 3);
    - the EN panel growth strings.

    Each of the 18 assertions failed under a deliberate mutation, and every mutation was restored ([logs](../../sweep-algorithms/), `f6-gaps-mut-*.log`). No lesson text was missing.
  - **Documentation.** `docs/capabilities.md` gains rows for both routes. `GLOSSARY.md` gains Monotone polygon, Vertex type and Helper, with the spec's Slovenian terms, which the lessons use. The stale "registered without a lesson yet" sentence in `docs/current-architecture.md` is corrected.
  - **"Links the ear-clipping lesson"** (task 20) is met by naming the lesson in the step text. The lesson model has prerequisite text but no link field, and every compgeo lesson names related lessons the same way. Real links live in the chapter sections, and the sweep chapter links the ear-clipping section.
- **Slovenian number agreement, fixed in this record's commit.** The smoke found "Kos 2 ima 4 oglišč in dobi 2 trikotnikov". Slovenian needs dual and paucal forms, so the readout `monotonetri_piece_info` now reads "Kos 2: število oglišč 4, število trikotnikov 2", which is correct for every count. The C4 lesson quotes the readout and was updated with it, as were the host tests. Focused suites pass ([log](f6-s2-plural-unit.log)).
- **`just check`** at `3b5c93c1` (dirty only with untracked logs and the docs edits): typecheck, lint, 9399 unit tests passed and 7 skipped in 521 files, and the production build ([log](f6-s2-check.log)). After the gap tests: the focused unit run, tsc and lint ([logs](f6-s2-gaps-unit.log)). `just lint` passed after the smoke evidence was copied in ([log](f6-s2-lint.log)).
- **Bilingual smoke:** [f6-s2-smoke.md](f6-s2-smoke.md). A Sonnet `bezeg-smoke` ran against the production preview on port 4313, built from `3b5c93c1`. Result: 22 cells passed, 0 failed, 0 blocked, 0 skipped, with no console or page errors. Both routes covered:
  - deep link and reload;
  - Next, Play and Pause, with auto-stop at the end; MT crosses the phase boundary;
  - an edit resets the trace to step 0;
  - the three refusals, with their exact messages and no trace objects;
  - keyboard-only use with a focus ring;
  - SVG and PNG export in sl and en, with vertex types and chains in the SVG;
  - Preset save, reopen and delete;
  - lesson walks in sl and en: C3 step 2 hides the vertex types, Back works, and Exit restores the graph;
  - a live sl→en switch;
  - the chapter page and return links in both languages;
  - 1280×720 and 390×844 without horizontal scroll.
- **Hosted CI:** `3b5c93c1` passed every job. The run for this record's push is reported in the stream row.

## Gaps and notes

- Refusal texts name vertices "v2" while board labels say "P2". The kernel and the lesson use v-indices consistently, so this is a possible later wording choice, not an acceptance gap.
- The lesson scene replaces an edited vertex and restores it on exit (shared runtime, as in T1 and T2).
- Not exercised: touch, text enlargement, a measured drag (the spec has no performance clause for C3/C4), and a full read of the MT growth text in the live-switch check (a scan for Slovenian found none).
