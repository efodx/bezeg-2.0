# Functions stream: handler handoff 14

Handler 14 (Opus 5.5, `--permission-mode auto`, `--effort medium`) wrote this note on 2026-11-02 at the 150k soft threshold. `G-FN`, `G-REG` and `G-HL` are open. `Run state: active`.

## State

- **Worktree:** `.claude/worktrees/stream-functions`, branch `worktree-stream-functions`, at `2847fd83` = `origin/master` when written. The `node_modules` junction points to the main install; delete it before removing the worktree.
- **Pushed to `master` this session.** Each commit was rebased onto `origin/master` and rechecked with typecheck, the focused unit set (`src/learning/content src/learning/chapter src/learning/LearningPage.test.tsx`), `just build`, the `unified-learning` rows for the new chapter and its neighbour, and `smoke-lesson` for the owned lessons in SL and EN:
  - `29a55b03` numerical 05 F4: chapter `numerical-methods` (sections `numerical-idea`, `root-finding`).
  - `0526e515` school 05 F4: chapter `school-function-graphs` after `functions-and-calculus` (sections `function-transformation`, `function-inverse`).
  - `2847fd83` Fourier 04 F4: chapter `fourier-series`, last in the `functions` strand (sections `fourier-idea`, `fourier-series`).
  - Each one is a breaking change of the interim example id. The commit message and the family task file record it.
- **Handler review:** I recomputed every number quoted in the chapter prose in Python, independently of the kernels. All matched. I replaced EN `{.}` decimals with a plain `.` (EN lessons use `1.5`). I fixed the smoke `chapters` order list for the school chapter: it must equal the rendered order, which follows registration order in `familyChapters.ts`.
- **Count facts after `fe8be6b0`:** every chapter has a poster (`POSTER_PENDING` is empty), so `LearningPage.test.tsx` family, heading and thumbnail counts all equal the chapter count, now 18. The coverage test expects 18 chapters and 83 references.
- **Briefs:** `briefs/numerical-05-f4.md`, `school-05-f4.md` and `fourier-04-f4.md` (untracked). Each worker finished in 23–50 turns at 77–94k, with no handoff needed.

## Next, in order

1. **F5 media** per family: the catalog preview clip if the task asks, the chapter card images, and the highlight recipes for the three new example ids per [guided example highlights](../../../specs/guided-example-highlights.md), in `src/learning/chapter/guidedExampleHighlights.ts` + expectations + manifest. Model on commit `158aeb84` (analysis highlight recipes). Run only while no other worker runs, and regenerate the manifest with its script after rebasing. Check `docs/tasks/feature-streams/geometry.md` notes first in case another stream has claimed a capture.
2. **F6 gates** per family: `just check`, smoke of the family routes in SL and EN with a live switch, hosted CI.
3. **Projective 06 F3–F6.**

## Deferred items (low)

- `docs/capabilities.md:3` and `:197` still say "eight chapters"; Learn now has 18. This was stale before this session. Fix it in one docs commit, possibly at F6.
- Handoff 13's deferred items still stand (Fourier scenes cannot zoom; the uniform-convergence link is prose plus a `sources` entry).

## Settings to keep

Successor `--agent claude --model opus --permission-mode auto --effort medium`. Workers `bezeg-worker` Sonnet `medium`; smoke `bezeg-smoke`; port 4315. Heavy checks with `BEZEG_MEMORY_FLOOR_GB=0.5`, in the foreground. Point worker logs at the job tmp folder, never `docs/`. Never force-push; push only `HEAD:master`.
