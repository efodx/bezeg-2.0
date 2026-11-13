# F3 combinatorics Batch B, slice 1 (actions and content) - worker note

## Written
- `src/learning/model.ts` (~446-456): `set-expansion {n, c}` added; `split?: boolean` on `set-lattice-display`; comment updated.
- `src/graphs/combinatorics/LatticePathGraph.tsx` `applyCombinatoricsAction` (~513-545): `set-expansion` and `split` handled through `parseLatticeState` before any write, nothing snapped; absent `split` keeps the switch. Doc comment updated.
- `CountingTreeGraph.tsx:600` throws for `set-expansion`.
- Tests: `LatticePathLessonActions.host.test.tsx` (set-expansion control equivalence, other fields untouched, split equivalence and "absent = unchanged", invalid actions, extended synchronous sequence); `CountingTreeLessonActions.host.test.tsx` (throw).
- `src/learning/content/combinatoricsGuidedLessons.ts`: `LatticeSceneSpec.split`, `expansionSceneActions`, CB3 (6 steps, `cb3Steps` ~468) and CB4 (7 steps, ~604), exports `pascalIdentityLesson`, `binomialTheoremLesson`. Not wired into the chapter or registry.

## Observed
- `just unit src/graphs/combinatorics src/combinatorics src/learning/content`: 115 files, 1780 tests passed (includes `lessonMathNotation.test.ts`); log `host-full.log`.
- Red: with the `set-expansion` case disabled, 4 tests failed (`host-red.log`). The split change shares the `set-lattice-display` case; it has no separate red run.
- `npx tsc --noEmit --pretty false`: exit 0 (`tsc.log`). Single-backslash delimiters in the lesson file: 0 (`backslash.txt`).
- Probe (`probe.txt`, sl and en, per step: state, status, readouts, strings table); probe test deleted.

## Numbers per step (probed)
- CB3: (4,3) last step D/G = 20 and 15, sum 35, formula (7 nad 4); partition step same, split on; triangle (4,3): row 7 place 4, 35 = 20 + 15; (6,0): row 6 place 6, 1, edge (right parent "-"); (3,2): row 5 place 3, 10 = 6 + 4; (2,3): row 5 place 2, 10 = 4 + 6; free: (5,3) 56 = 35 + 21.
- CB4: n=2,c=1: 1;2;1 sum 4; n=3,c=1: 8 strings, groups 1,3,3,1; n=4,c=1: 16 strings, 1,4,6,4,1; n=5,c=1: 1,5,10,10,5,1 sum 32; n=5,c=2: 1,10,40,80,80,32 sum 243 = 3^5; n=6,c=2: 1,12,60,160,240,192,64 sum 729, no strings table.
- Triangle entry for target (a,b): row a+b, place a (the graph's status; (4,3) is C(7,4), equal to C(7,3)).

## Deviations
- CB3: spec steps 2 and 3 merged into one step (the partition argument and the neighbour points), a step on the identity with the edge case added, so 6 steps. The spec's "click an entry" is "enter a and b".
- CB4: spec step 2 and 3 kept; steps 1-4 use c = 1 so the group sizes equal the coefficients.

## Doubts
- The paths view shows the last-step readouts (20, 15, sum) even with the split off, so CB3 step 1 asks the prediction "before reading the readouts". The CB4 scenes open with the strings table and coefficients visible; prompts say "before you read/count".
- CB4 step 5 opens on c = 1 and asks the learner to set c = 2, so the (x+2)^5 readouts appear after the learner's action.
- Slovenian wording is one-shot and not reviewed by a native speaker.

## Still to do (slice 2)
Chapter, registry, ownership, test lists, smoke; prose review of both lessons.

## Slice 2: chapter join and wiring

### Written
- `combinatoricsChapterRegistry.ts`: sections `pascal-identity`, `binomial-theorem` on `lattice-paths`, ids `lattice-paths-cb3`, `lattice-paths-cb4`.
- `combinatoricsChapter.ts`: two sections (4 paragraphs, formula, example each, sl and en); file comment updated. Prose examples avoid the lesson predictions ((4,3) split; (a+b)^2, n=3/4 string counts, (x+2)^5 coefficient and sum): used (4,2) 15 = 5 + 10, (a+b)^6 a^4b^2 = 15, (x+3)^4 = 1,12,54,108,81 sum 256.
- Tests: `authoredChapterCoverage.test.ts` (demonstration mapping by section id, count 171 to 173), `familyChapters.test.ts:104` (combinatorics minimum 4), `lessonMathNotation.test.ts` (CB3, CB4 in set and expected ids), `tests/unified-learning.smoke.spec.cjs:76` (combinatorics 4). `familyChapters.ts`, `chapterOwnedLessons.ts`, `guidedExamplePreviewCopy.ts` and the lookup/catalog tests needed no change.
- `docs/localization.md`: Pascalova identiteta, binomski izrek, niz crk (handler-unreviewed). Task 05 status and README row "F3 in progress". `registration.ts` comment CB1 to CB4.

### Outcome
- Red before source edit (`s2-red.log`): `authoredChapterCoverage` and `familyChapters` failed (2). The `lessonMathNotation` list edit cannot fail first: the scan test reads the module and the lessons already existed.
- `npx tsc --noEmit --pretty false`: exit 0 (`s2-tsc.log`). `just unit src/learning src/graphs/combinatorics`: passed (`s2-unit.log`, no counts printed). `just build`: passed (`s2-build.log`). `just smoke-lesson lattice-paths`: passed (`s2-smoke.log`). Single-backslash delimiters in the chapter: 0 (`s2-backslash.txt`).

### Not verified
- No browser look at the new chapter sections; Slovenian prose unreviewed by a native speaker; full unified-learning smoke not run.

## Slice 3: review fixes and tests

### Written
- `combinatoricsGuidedLessons.ts`: neutral opening scenes with the entry named by field label ("Koraki desno (a)", "Potenca n" ...): `cb3-predict` opens (2,2), `cb3-rows` (2,1); `cb4-square` n=1, `cb4-strings` n=2, `cb4-collect` n=1, `cb4-four` n=3, `cb4-sum` n=4, c=2. Explanations ask, then tell the learner what to enter; answers stay in `expectedObservations`; the coefficient list was removed from `cb4-sum`; the `cb4-four` title no longer says 16.
- `cb3-identity`: edge sentences removed (the prediction at (6,0) stays, asking also whether the identity applies); the edge claim and `pascal-identity` block moved to `cb3-explore`. `cb4-collect`: binomial-theorem block moved to `cb4-four`.
- `LatticePathLessonActions.host.test.tsx`: the final assertion is now "split true, absent split leaves it true".
- `combinatoricsGuidedLessons.test.ts`: CB3/CB4 block (ownership, control-character scan, sl/en digit parity, binomial values, BigInt expansion by repeated multiplication, scenes sl and en out of order and twice, quoted numbers readable, opening without answer then entry reveals it for 7 prediction steps, other prompt entries, prediction ordering and summary).

### Observed
- Green: `s3-unit.log` (just unit combinatoricsGuidedLessons, lessonMathNotation, graphs/combinatorics passed); `s3-tsc.log` exit 0; single-backslash delimiters 0 (`s3-backslash.txt`).
- Red: `s3-content-red.log` (cb4-sum scene changed to n=5: 6 content tests failed); `s3-host-red.log` (split ignored: 4 host tests failed); `s3-host-red2.log` (absent split resets to false: the new assertion fails, 1 test).
- Probe appended to `probe.txt` (also `probe-s3.txt`); probe test deleted.

### Not run
Sweeps, build, smoke, browser look at the new openings; Slovenian wording unreviewed.

## Handler review (handler 15)
- Sonnet review of slice 1 (`.command-logs/f3-comb-b/review.md`, `check.js` with BigInt binomials and repeated polynomial multiplication): every number confirmed. One blocking finding: six steps opened with their answer in the readouts or the strings table; slice 3 reopened them on neutral states and also applied the three minor fixes and the host-test fix. The free step of CB4 stays as written.
- Handler fix: the CB4 summary (rendered before step 1) stated that the coefficient is the binomial coefficient, which answered the counting predictions of steps 3 and 4; it now names the activity only.
- Accepted: the chapter sections state the identity and the theorem with their arguments on other examples ((4,2), (a+b)^6, (x+3)^4), the exposition-then-activity pattern of Batch A; step 4 shows the theorem block as a tool for its computed prediction.
- Checks (`.command-logs/f3-comb-b/h-*.log`): `just unit src/learning src/graphs/combinatorics src/combinatorics`, the six sweeps set to `lattice-paths` with `just unit src/graphs/base src/learning/runtime`, `just check-changed` (with build) and `just smoke-lesson lattice-paths` all passed; after the summary fix the combinatorics content and notation tests passed again (`h-unit2.log`).
