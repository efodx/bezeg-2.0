# linear-maps Batch D slice 1: actions and L6/L7 lesson content (worker note, partial at HANDOFF)

## Written
- `src/learning/model.ts`: `set-start` (`start: readonly [number, number]`) and `step` (`count?: number`, optional because the kernel defaults it to 1) join the `linear-map` union.
- `src/graphs/linear/LinearMapGraph.tsx`: local `LinearMapIterationAction` removed; `applyLinearMapAction` takes the shared union; `validateSetStart`/`validateStep` still run before any write. `LinearMapIteration.host.test.tsx` needed no change (it passes actions as `never`).
- `src/learning/content/linearMapsChapterLessons.ts`: helper `start(v)`, `mode` widened to `iterate`/`tracedet`; `linearMapPowerMethodLesson` (`linear-map-power-method`, 7 steps: power-first, power-settle, power-stretch, power-other-eigenvector, power-no-settling, power-flip, power-explore) and `linearMapStabilityLesson` (`linear-map-trace-determinant`, 7 steps: td-plane, td-parabola, td-triangle, td-edges, td-flow, td-vertex, td-explore), sl + en, framed steps. No `stepTo` helper was needed: no scene uses a step above 0 (every scene opens at step 0).
- Probe test deleted. Probe output: `.command-logs/lm-d/probe.txt` (sl and en readouts per opening and per control).

## Observed (probe)
- `step` is relative (adds `count`, 1..30); `set-example`, `set-matrix`, `set-mode`, `set-start` do not reset it; the prepared scene opens at step 0. Changing the view mode keeps start and step.
- Basis mode has no step buttons; `iterate` has "Naslednji korak" / "Predvajaj" / "Ponastavi" (reset returns the step to 0, keeps start; disabled at 0). `tracedet` has no step controls and draws no orbit.
- `iterate` at step 0 already shows: dominant line, angle readout (45 deg for E, (1,0)), ratio 0,4, status `dominant` (or `other-eigenvector`, `rotating`, `equal-moduli`, `scalar`, `defective`). `settled` appears at k=5 for E.
- Graph stretch at step k is |A^k v0|/|A^(k-1) v0|, so the spec's n is graph k = n+1: k=2 5,099; k=3 5,0915; k=4 5,0437; k=5 5,0185; k=8 5,0012; k=9 5,0005. Angle errors E, (1,0): 45; 18,43; 7,13; 2,79; 1,11; 0,44 (k=0..5); 0,01 at k=9. Rayleigh 4, 5, 5,0769 at k=0,1,2.
- Kernel: E perturbed start (1+1e-6, -2+1e-6) first reaches under 1 deg at k=20.
- tracedet statuses: M (1, 3/16, 1/4) inside, flow not stable; -E (-7,10,9) outside, flow stable, `td-range`; W=(1/2)Z (1,1/2,-1) inside; R (0,1,-4) edge; diag(2,1/2) (5/2,1,9/4) outside; S (2,1,0) edge; E (7,10,9) outside, `td-range`; identity (2,1,0) edge (the default scene opens on the vertex).
- Drags in tracedet (companion status appears): (1,0.25) gives Delta 0; (1,0.5) Delta -1; (1,0) edge eigenvalue 1; (-1,0) edge eigenvalue -1; (0,1) edge (delta 1); (3,3) outside.
- Other: -E iterates (-4,-2),(18,14),(-86,-78); diag(4,1) start (1,1) settles at k=3 (ratio 0,25); S start (0,1): (10,1) at k=10, angle 5,71 deg, (30,1) 1,91 deg at k=30, status `defective`.

## Numbers per step and what each opening shows
L6: 1 basis, E, (1,0): grid only; predicts the direction (1,1). 2 iterate, E, (1,0), k=0: shows the dominant line, angle 45, ratio 0,4 (step 1's answer and step 3's ratio are visible); predicts k=5. 3 basis: derives stretch 5 and ratio 0,4 from the decomposition. 4 basis, E, (1,-2): predicts it stays (status `other-eigenvector` is hidden until the mode switch). 5 basis, R, (1,0); spiral Z typed by the learner. 6 basis, Q=[[0,3],[3,0]], (1,0). 7 iterate, identity (status `scalar`).
L7: 1 basis, Z (tau 2, delta 2, Delta -4). 2 tracedet, W (already shows `inside` for W). 3 basis, M, start (4,0). 4 tracedet, M. 5 basis, -E, (1,0). 6 basis, S, (0,1). 7 tracedet, identity.

## Deviations
- Spec L7 step 3 "the L6 orbit is shown": tracedet draws no orbit (F2a), so the orbit is read in the iterate mode after the learner switches.
- Spec L6 step 5 (R and the spiral) is one step with two prompts; Z is typed by the learner (no example id).
- No `stepTo` helper (see Written).

## Still to do
- Lesson tests (next slice): reuse the numbers above; chapter, registry, preview, smoke specs, docs, terms table entry untouched.
- Native review of the Slovenian text.

## Doubts
- The `iterate` and `tracedet` views show their answers at once, so the check of steps 2 and 3 (ratio 0,4 visible from step 1 on) and td-parabola (W's `inside` status visible before the triangle is explained) are not blind predictions; step 3 of each lesson is framed as derive-then-check.
- td-edges prompt contains a hint (p(1), p(-1)). The learner types Z's columns by the a1/a2 fields, whose labels carry subscripts, so the prose names them as "the numeric fields for the columns" rather than quoting them.

## Checks run
- `npx tsc --noEmit --pretty false`: clean (`.command-logs/lm-d/s1-tsc.log` empty).
- `just unit src/graphs/linear src/learning/content/linearMapsChapter.test.ts src/learning/content/lessonMathNotation.test.ts`: passed (`s1-unit.log`). The new lessons are not in those tests' lists, so the notation test did not scan them.
- Backslash count 0 (`s1-backslash.txt`); LF check on the lessons file 0 CR.
- Not run: lesson tests for L6/L7, build, smoke, the notation heuristics on the new lessons.

## Slice 1b: tests
- `src/learning/content/linearMapsChapter.test.ts` (appended after the L3/L4 block): per-step opening expectation tables `powerExpectations`/`stabilityExpectations`; scene run in one synchronous tick from a dragged state (matrix, ellipse mode, start) in sl and en (matrix, mode, start, step, readouts, statuses); every scene opens at step 0 after a pressed "Next step"; basis-mode openings carry no iteration/trace-determinant answers; frame shape; pmatrix separators; `set-start`/`step` through the shared union (invalid payloads throw and leave the model unchanged, one synchronous multi-action chain); "numbers in the L6 prose" and "numbers in the L7 prose" blocks recomputed from `deriveIteration`/`iterateAt`/`deriveTraceDet`/`discreteStabilityTD`/`classifyEigen`.
- `src/learning/content/lessonMathNotation.test.ts`: both lessons added to the `linearMapsChapterLessons` module scan and two more `'linear-map'` ids to the demonstration list. The notation test reports no findings for them.
- `LinearMapIteration.host.test.tsx`: unchanged (lists the older lessons only by name for a preset check; not required).
- Checks: `just unit src/learning/content src/graphs/linear` passed (`s1-unit.log`); red evidence `s1-red.log` (changed `0.44` to `0.45` and the ratio `0,4` to `0,5`: two failures; restored, `s1-unit-final.log` passed); `npx tsc --noEmit --pretty false` clean (`s1-tsc.log` empty); LF 0 CR.
- Prose findings: every number quoted in L6/L7 matched the kernel. One wording note: the spec's (2094, 2062) is the step-5 iterate, not quoted in the prose (the prose lists up to (422, 406)). Eigenvalues of -E come out of `classifyEigen` as [-2, -5] (order differs from the prose's "-5 and -2"; order is not meaningful).
- Not verified: the perturbed-start k = 20 claim is checked in the test by an independent float loop, not by the graph; no browser, build or smoke run; Slovenian wording not reviewed.

## Slice 2: chapter join and wiring

### Written
- Registry sections `power-method` (L6) and `trace-determinant` (L7); chapter sections (theorem, example, special cases, how to use; sl and en) and an extended `purpose`. Chapter examples avoid the lessons' prediction answers: L6 uses the symmetric matrix with columns (2,1),(1,2) and start (1,0) (error arctan 3^-k, below 1 degree first at k = 4, recomputed by a node loop); L7 uses diag(1/2,1/4), diag(2,0) and the pair (3,2) with two matrices.
- Preview copy rows for both ids; PNGs captured and viewed (E grid for L6, Z grid for L7). `scripts/generate-guided-example-inventory.cjs`: `linearMapsExpectedFor` now also accepts one explicit `set-matrix` instead of a named example (L7 opens on Z, which has no example id); a test line added in its `.test.cjs`; inventory JSON regenerated (6 examples).
- Test lists updated: linearMapsChapter.test (structure, owners, links), lessonLookup.characterization (owners, rows), lessonLookup.isolation (owners 4 to 6), guidedExamplePreviews.test, authoredChapterCoverage.test (reference count 175 to 177), familyChapters.test (linear-maps minimum 6), smoke spec (6), chapterOwnedLessons comment. localization.md (two rows), task 11 status line, task README row 11.

### Outcome
- tsc clean (`s2-tsc.log` empty); `just unit src/learning src/graphs/linear` passed (`s2-unit2.log`; the first run `s2-unit.log` found 4 pinned counts, fixed); red evidence `s2-red.log` (5 failures before the registry edit); build passed (`s2-build.log`); `just smoke-lesson linear-map` passed (`s2-smoke.log`); `node --test scripts/generate-guided-example-inventory.test.cjs` 27 pass; backslash count 0 in both files; LF checked on all touched text files; port 4387 closed.

### Not verified
- `tests/unified-learning.smoke.spec.cjs` (6 sections) not run; no red run for it or for authoredChapterCoverage/isolation (count pins found by the green run). Slovenian chapter text not natively reviewed. `purpose` and section prose not smoke-read in the browser.
