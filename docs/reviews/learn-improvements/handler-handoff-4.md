# Learn improvements — handler successor 4

## Objective and authorization

Continue the owner's instruction to execute every task in local `docs/tasks/learn-improvements/README.md` in order, using fresh successors at repository context boundaries. Owner is away and delegated remaining decisions; no optional approval gates. Follow AGENTS.md. Canonical acceptance is `docs/specs/learn-improvements.md`. Tasks 1–5 and Task 6a Foundations are now accepted and pushed. Do not redo them.

Handler closeout begins at latest 148516 request-input tokens, approaching the 150k boundary. All workers finished; no source changes remain outstanding.

## Checkout and Git

- Primary checkout `C:/Users/NonFriedMotherBoard/IdeaProjects/bezeg`, branch `master`, saved project `6466c495-4851-4845-83b4-a5801d449d35` verified by `list_projects` in this chat.
- Accepted application HEAD `f441d75 feat: explain Foundations with app figures and investigations`, fast-forward pushed to origin/master. Previous accepted `75536ec feat: refine the Bézier chapter teaching sequence` also pushed.
- `75536ec` GitHub Browser smoke succeeded: https://github.com/efodx/bezeg-2.0/actions/runs/40251747562 . The first immediate CI lookup for `f441d75` found no run yet; check it after dispatch. Local checks passed as below. A documentation handoff commit may follow; inspect actual HEAD.
- **`docs/tasks/learn-improvements/README.md` remains UNTRACKED/LOCAL ONLY. NEVER stage or push it.** No other dirty files remain after the accepted application commit. Preserve the local task plan and backup branch `codex/learn-improvements-local-plan`.

## Task 5 accepted closure

Final source review and earlier 13 focused tests/exact tsc/lint/build/18 standalone browser tests remained sufficient. This handler completed only missing browser evidence with a fresh Luna max worker. It saved seven interpolation flow/card captures and checked SL/EN desktop/narrow/200% formulas/captions, degree-two→three basis count three→four with finite samples summing to one, affine translation then scale on controls and curve about the same center, and exact settled natural Tab/Enter return offset/focus. Handler visually reviewed five representative captures. No app repair required; initial locale-specific affine selector corrected. Report: `bezier-pilot-browser.md`; prior source review `bezier-pilot-review.md`. Worker completed at 134166 input. Task 5 accepted/committed/pushed as `75536ec`.

## Task 6a Foundations accepted

`f441d75` adds:

- Radians defined by signed arc length on the unit circle before cos/sin and polar form; zero-factor/undefined argument and modulo-full-turn qualifications; transitions from weights to point combinations and complex multiplication to transformations.
- Typed optional `FamilyChapterFigure`, `FamilyChapterSection.figures`, and `investigationPrompts` in `src/learning/content/familyChapters.ts`, with an optional seventh `section(...)` extras argument. Shared `FamilyChapterPage.tsx` renders figures and prompt paragraphs; guided labels appear only for prompted links opening `?learn=1`. Unchanged family chapter output follows its existing path.
- Foundations figures reuse `demonstrationPreviewAssets` for `bernstein` and `complex-multiplication`; source PNGs/recipes already reproducible. Cubic basis capture is explicitly distinguished from quadratic arithmetic. Multiplication caption describes `(1+i)i=-1+i`, matching capture. Natural-language alts contain no raw TeX.
- New renderer regression and notation scanning for caption/prompt fields. Renderer-disable mutation failed expected two figures/got zero; restored tests passed.

Evidence:

- Final 24 tests/3 files: `.command-logs/2026-10-26T01-05-02-450Z-97872-0a5d5dc9.log`; exact `npx tsc --noEmit --pretty false` passed after final correction; lint `.command-logs/2026-10-26T01-05-32-320Z-104092-8a53eda3.log`; build `.command-logs/2026-10-26T01-05-35-802Z-105400-b99d390d.log` (dirty75536ec, usual dependency/bundle warnings).
- Independent math/bilingual and engineering/UI reviews passed: `foundations-math-review.md`, `foundations-reader-review.md`. Math review corrected principal argument wording to modulo `2π` in both languages, then rechecked. Handler caught explicit radian-definition and natural-language alt issues before final checks. Implementation note `foundations-worker.md`.
- Delegated `just smoke-built tests/unified-learning.smoke.spec.cjs --port 4395 --workers=2`: 9/9 passed; `.command-logs/2026-10-26T01-07-25-663Z-20188-133889b9.log`. Worker also saved/checked SL desktop figure/prose section.
- Worker spent context on UI/AX inventory and a direct harness guessed English alt text; watcher signalled136587, HANDOFF relayed, partial note/cleanup retained. Handler completed corrected direct script in8seconds, then re-ran after adding settled current-section aria marker before screenshots (no app repair).
- Handler script/evidence: ignored `.command-logs/foundations-handler-final.cjs`, `.json`, `.log`. Eight evidence groups cover English switch/hash refresh; image decoding and caption/prompt MathJax; no reader boards/errors; 1440/1024/390 at100%, 390at200% no page overflow; narrow keyboard contents; Bernstein degree2→3 live count3→4 and partition-of-unity samples; actual complex operands/product after argument/modulus edits. Live states: `z=(1,1),w=(0,1),zw=(-1,1)` → `w=(1,0),zw=(1,1)` → `w=(0,2),zw=(-2,2)`. Finite/nonempty geometry required throughout. Zero runtime errors.
- Handler reviewed source PNGs, SL desktop section and final `foundations-handler-1440-100-en.png`, `foundations-handler-390-100-en.png`, `foundations-handler-390-200-en.png`, `foundations-handler-narrow-200-prompt-en.png`. Final browser report `foundations-browser.md` includes both initial partial and explicit accepted completion.

The chapter links currently open guided lessons; the direct graph tests explicitly chose **Exit and restore graph** to reach free controls. This is accurately labeled and source-reviewed, but Task 7 still owns making the distinction/journey clearer. No prepared numerical activity scene is claimed for family links. Physical devices/projectors and comprehensive accessibility remain outside the scoped evidence.

## Next steps in order

1. Check GitHub Browser smoke for `f441d75`; if failed, inspect before attributing anything. Do not rerun accepted checks without new concern.
2. **Task 6b Rational curves is next. Its bounded acceptance is ALREADY DEFINED in `docs/specs/learn-improvements.md` §6b, committed before implementation. No Rational app edit has started.** Use shared typed figures/prompts and keep this content-only if possible.
   - Audit asks to fill omitted conic identity algebra. A compact valid route: let `a=1-t`, `b=t`, `q=√2ab`; `X=a²+q`, `Y=b²+q`, `D=a²+b²+q`; expansion gives `X²+Y²-D²=q²-2a²b²=0`. Keep positive denominator and interval/domain assumptions; independently verify.
   - Handler already viewed catalog `rational.png` (weighted cubic, selected middle weight2, all other weights1) and `circle.png` (three-arc full circle/support polygons). Recipes `scripts/demonstration-preview-recipes.cjs` entries `rational`/`circle`. Reuse with accurate captions that distinguish cubic from worked quadratic and three arcs from worked quarter-circle. No need new raster capture unless content demands it.
   - Seven demo IDs/routes all retain links: rational, rational-decasteljau, rational-elevation, rational-extrapolation, rational-subdivision, farin, circle. Give each occurrence specific bilingual action/notice/meaning using supported controls. Preserve positive-weight/denominator caveat outside unit interval. Focused tests/review/build + targeted browser weight/piece-count changes per §6b.
3. Then define bounded acceptance and implement each remaining chapter separately in order: **Splines, PH curves, Parametrization, Functions/calculus, Analysis**. See `content-audit.md` prioritized findings. Splines local unit-scaled derivative parameters; PH integrate position and initial point; Parametrization chord/knot heuristic and wrong graph link; calculus continuity quantifiers; Analysis uniform convergence quantifiers. Add meaningful app figures and specific investigations using the shared extension; do not force identical teaching templates.
4. Confirmed Parametrization mismatch: weighted-knot section must link `spline-parameterization`, not single-curve `weighted-parameterization`; spans use endpoint chord distances, not arc lengths. Explain alpha choices as timing heuristic, not arc-length parametrization.
5. Task7 reading/exploration journey, then Task8 final Slovenian-first editorial/math/English equivalence and production-browser matrix (refresh/language/history/exact return). Preserve stable routes/activity contracts or explicitly document breaks. Do not stop after family chapter edits.

## Processes, routing, and context

All workers finished and watchers consumed. Handler stopped previews4393(session47977) and4394(session54761). Browser worker terminated failedscript session22187; suite4395runner session58655 exited successfully. No live preview/process ownership transfers. Current build bytes match final Foundations source (build provenance uses dirty75536ec before acceptance commit); rebuild after next app edits.

Read workflow routing/budgets before dispatch. Fresh `gpt-6-luna` high implementation/review; max browser. Workers do not delegate or Git. Start watcher per worker and relay HANDOFF at135k. This handler latest148516input before closeout. Implementation118753/123010repair; math66209/68402recheck; engineering57276; browser136587signal. Source/evaluation notes recorded, no inferred runtime model settings/cumulative usage.

Use `just --list` first at verification boundaries. **All loopback/Playwright shell calls use `sandbox_permissions=require_escalated` from first attempt.** Git writes/push also need escalation because sandbox sees `.git` read-only. Preview syntax is `just preview 4394` (positional port); smoke runner syntax `--port 4395` (separate argument). Prefer direct Playwright scripts for named gaps: repeated UI inventories consumed most browser context before a few-second harness closed the checks. Make accessible selectors source-based; `NumberInput` uses label/role spinbutton, not necessarily aria-label. Complex polar edits snap Cartesian coordinates to grid: compare actual live operands, never an ideal unrounded point. Wait for settled scrolling/state before screenshots/offset evidence.

Local task plan is still untracked; never stage it. Owner authorization includes continued decisions and successor chats, so proceed without optional approval gates.
