# Board workspace: the kept UX picks, rebuilt app-wide

Status: accepted by the owner on 2026-11-22, revised the same day after a second independent review (see the last section), and the revision's three owner points were confirmed by him. Implementation not started. The prototype preview on port 4460 was stopped on 2026-11-22 at the owner's request; restart it with the command in `docs/reviews/ux-picks/state.md` ("Where") when a task needs the reference. Tasks: [docs/tasks/ux-picks-app-wide](../tasks/ux-picks-app-wide/README.md). First part, already drafted: [parameter writes](parameter-writes.md). Decisions: ADRs [0062](../adr/0062-rebuild-ux-picks-on-master.md), [0063](../adr/0063-cards-on-the-board.md), [0064](../adr/0064-source-tagged-scene-writes.md), [0065](../adr/0065-graphs-declare-presenters-render.md).

## Purpose

The owner kept nine prototypes from the `ux-picks` branch and wants them in the app for every graph (direction of 2026-11-21; only the ghost controls c11/b15 are dropped). This spec says what is built on `master`, in what order, and how it is accepted.

| Pick | What the learner gets |
| --- | --- |
| a1 | Every slider and count is a puck on the board: drag, type, arrow keys, undo of a track jump |
| a19, a29 | Hovering a track or a count's − / + shows the graph at that value before the click |
| a3 | A parameter can move by itself (sweep a range, step a count) |
| b1 | Lesson Back and Next glide the graph into the new scene |
| boardText | Formula, readouts (Odčitki) and legend (Legenda) are cards on the board |
| toolsCard, dockTools | The tools (Orodja) and the Guided lesson are cards on the board; the graph has the full width |
| viewDirector | The view moves so that the content sits in the board area free of cards |

## Owner decisions (2026-11-22, planning session)

1. Rebuild from `master`'s code, slice by slice, with the prototype as reference; do not ship the prototype code. Use what the prototype taught to fix its problems in the architecture.
2. Work in progress stays off `master`; only finished work is carried there, and it is live when it lands. No feature switch.
3. toolsCard, viewDirector and the overnight "decide and log" changes are kept.
4. Cards sit on the board. The "beside the graph" rule is removed. Card places are global, one set for the whole app.
5. ADR 0061 is reversed: the lesson card may sit on the board.
6. All graphs are converted. The conversion must run efficiently with parallel workers.
7. Aim high on quality, but do not loop on a critique score.
8. Phones may get their own controls, tools and lesson design. The architecture must let a phone presenter supply its own controls. Pucks are a good direction there. The phone redesign comes last. Until then phone layouts are not a target and phone checks are not maintained for the changed workspace.
9. The prototype is frozen at `aff6df6c` (`ux-picks`, R30, the last prototype code change: the fuzzer fixes). The plan refers to that commit.
10. The rebuild may improve on the prototype's UI and UX, not only reproduce it. "The docking is nice and a feature I want, but it could feel better/smoother."
11. Controls other than sliders and counts (choices, toggles, point lists, text entry) are placed with taste, graph by graph: some belong on the board as a puck or a standalone control, others stay in Orodja.
12. A sweep swings a narrower range than the whole slider by default.
13. Legenda's default place (bottom right on the prototype) is adjusted during the graph passes where it covers data.

Earlier owner rules that stay in force: the learner's input always wins over anything that moves; a learner press during a Back/Next morph ends the morph at once; reading frames never lock pucks, and "Povrni" appears when the graph differs from the frame; the learner's own fold and placement always win over defaults; "Samodejno" turns automatic view fitting on and off; nothing is inferred from prose or the DOM, graphs and lesson frames declare.

## What the prototype taught

Each row is a class of defects that cost repeated fix rounds on the prototype, and the structural answer in the rebuild. Sources: `docs/reviews/ux-picks/state.md` (handler logs), `trial-report.md`, `view-fit.md`, and the fuzzer runs in `Desktop/bezeg-ux-picks/night/fuzz/final/`.

| Problem on the prototype | Evidence | Answer in the rebuild |
| --- | --- | --- |
| About six writers of one parameter and a value mirror that lags | sweep ignoring input (R21), flicker between sweep and preview restore (R22), fuzzer "typed 4.5 shows 17,4" | One synchronous store, every write tagged with its source, leases for animations (requirement A2) |
| Previews write the live board and restore | hover CLS ≈ 1.0, board refits per hover (`recentlyProbed` delay), 13-20 long tasks on expensive graphs | Previews are computed off the live state (A3) |
| The view has several writers too | view drift 36 → 52 → 74, double glides, bisection step skipped after a pan | The view is a store key under the same arbiter; intent and fitted view are separate values (A2, A5) |
| Layout is measured after paint by several observers | Orodja opens tall then shrinks (R27), "Več" bar outside its card, Povrni pill unknown to the fit, width ratchets, cards settling mid-glide | One pure layout function run before paint; the director reads its result (A4) |
| Each graph gates on a flag and repeats markup | 34 files call `pickOn`; three contract retrofits across converted graphs | No flag. The declaration is the only path for a converted graph (A1) |
| Declarations checked by eye | frames highlight rows a scene hides; legend entries not drawn; row ids misspelt | Ids are typed per graph and a contract test runs every lesson scene against the declaration (A1, C3) |
| Parameter identity added per control | `paramKey` missing on shared inputs, local wrappers, registry keyed by strings | A parameter is declared once; the tools control, the puck and the preview come from that declaration (A1) |
| One layout stretched to phones | tap-catcher blocked pucks, 1.5 lines of lesson text, coarse scrub | Presenters per form factor over the same declaration (A6, ADR 0065) |
| Checks tried one action at a time | owner found the sweep bug by hand | Fuzzer and "interrupt what moves" in the repo's checks (C1) |
| Conversion was slow | see "Converting all graphs" | Frozen contract, inventory, machine checks, worktree lanes |

## Architecture requirements

**A1. Graphs declare; nothing is guessed.** A graph declares its parameters (key, kind `range` or `count`, range, step, format, label, help), formula, readout groups and rows, legend entries, section cards, the card that holds its main action, and the content marks the view keeps visible. The starting point is `GraphUx` at the frozen commit (`src/uxPicks/declare/graphUx.ts`), with these changes: parameters carry their own range and format instead of pointing at a rendered control; row, legend, card and control ids are a per-graph string union, and each lesson content file builds its frames with a builder typed by that union, so a frame that names an unknown id fails the type check (`LessonFrame` itself stays non-generic; no central id map); parameter keys reuse the existing lesson vocabulary `FUNCTION_PARAMETER_NAMES` where a name exists; a legend entry takes its colour and visibility from the drawn object it names. The declaration is a pure function of the scene state. It lives outside React and JSXGraph.

Parameter kinds are not limited to `range` and `count`. The contract also covers `choice` (a few named options) and `toggle`, and each declared parameter says where it is shown: on the board (a puck, or a standalone board control for kinds a puck does not suit) or in Orodja. Where a control goes is a judgement per graph (decision 11), guided by the conversion guide: on the board when the learner changes it often while watching the graph and it fits a puck's size; in Orodja when it is setup, rarely changed, or large (point lists, function entry). The pilots set the first examples. Every kind writes through the same store.

**A2. One arbiter over the graphs' own setters.** As [parameter writes](parameter-writes.md) specifies. On `master` a graph already changes a parameter through its own validated setter, shared by the tools control, lesson actions and board-dragged points; the rebuild keeps those setters and makes every call run inside a named source that an arbiter decides between. Existing playback (`AnimationDriver`) is an `animation` writer like a sweep. The view gets the same treatment through an adapter, because JSXGraph owns the bounding box: the intended view (from the graph, the lesson, Reset, a preset, or the learner's pan and zoom) and the fitted view are stored separately, a fit never reads a fitted view, a learner pan is recognised by its gesture and not by timing, and a preset stores the intent.

**A3. Previews never write live state.** The mechanism (geometry from state, or a shadow board) is chosen by measurement in task 02, before the contract is frozen, because geometry from state adds work to every graph's conversion; it is recorded in an ADR. Part of a curve graph's scene lives outside its state object (board points, De Casteljau's live parameter), so "unchanged" is judged on the graph's preset export, not on the state reference. Graphs whose redraw costs more than the frame budget get the idle back-off the prototype measured (capture after a pointer rest, latest value wins).

**A4. One layout function.** A pure function takes the board size, the cards present (each with a measured natural size and a minimum), the stored placements and folds, the card budget and the lesson frame's opened cards. It returns every card's rectangle, fold state and cut height, the pucks strip's rectangle and the free rectangle. It runs before paint. Card components render the result and measure nothing themselves. Overflow cues, the Povrni pill and the lesson card's whole-line snap are inputs to it, not overlays added afterwards.

Natural sizes need a render, and card content has typeset math that MathJax loads and typesets asynchronously. The protocol: a card's content is rendered in a hidden measure pass; a card is first shown only after its math is typeset and fonts are ready; the layout runs once more when a typeset or font event changes a measured size, as one glide. No other code path re-measures. Unit tests of the layout function use fixture sizes.

**A5. One motion per step.** A lesson step, a card move or a released parameter starts at most one glide of scene and view together, driven by one clock, ended by any higher-priority write. Reduced motion jumps.

**A6. Presenters.** The desktop presenter (cards on the board, pucks strip) and the phone presenter consume A1 and A2 only. Neither reads the other's DOM. A phone presenter may render a parameter with a control of its own.

**A7. Stored layout.** One versioned, validated browser-local record holds placements, folds and "Samodejno" for the whole app. An unreadable or older record falls back to defaults without an error. No route or preset format changes. The prototype's storage keys are not read.

**A8. Text.** Every string goes through the `sl` and `en` catalogs in lockstep. The prototype's inline Slovenian is the source for the Slovenian wording. Catalog entries that embed a value in a sentence are split where a row needs the name alone.

**A9. A frame's controls are in reach.** A lesson frame declares the controls and actions its text asks the learner to use (typed ids, like its highlighted rows). When the frame opens, each of them is visible and operable without the learner opening or unfolding anything: either it is on the board, or the frame opens Orodja at that control's section, which then counts in the card budget. Actions a graph offers (for example Taylor's "Pokaži oceno napake", bisection's "Naslednji korak") are part of the declaration for this purpose. This replaces the prototype's per-graph `firstCard: 'tools'`.

**A10. Wide boards.** Default card places are bounded by a maximum span, not only by the board's edges: on a board wider than that span the default anchors sit inside a centred band, so the lesson card, the content and Odčitki stay within one glance. The learner's own placements are not constrained.

## Independent review of the prototype (2026-11-22)

An independent agent reviewed the Taylor lesson on the frozen prototype at 1440×900 and 3440×1440 and found the redesign sound (warm palette, serif headings, prominent graph, readable link between controls and mathematics). Its three findings are answered in the plan:

| Finding | Answer |
| --- | --- |
| Step 1, part 3 of 5 tells the learner to press "Pokaži oceno napake", which is inside the folded Orodja | A9; task 02 (frames declare the controls they use, contract test), task 04 (the layout honours it) |
| At 3440×1440 the lesson card and Odčitki are about 2,590 px apart | A10; task 03 |
| In Presentation mode at 1440×900 the title and header push the graph's bottom and the pucks strip below the fold | Task 04 (Presentation header) |

It also reported the development preview requesting `/bezeg-2.0/bezeg-2.0/history-entry-bridge.js` (HTML answered, "Unexpected token '<'"). This predates the picks and exists on `master`; task 01 fixes it so the fuzzer's "no page errors" invariant needs no exception. Behaviour it verified and the rebuild must keep is listed in task 04's acceptance.

## Room to improve on the prototype

The prototype fixes *what* each feature is. *How it feels* is open in every stage (decision 10).

- **Fixed:** the feature set in "Purpose", the owner decisions and rules listed above, and the architecture requirements. A worker does not drop or reverse one of these; a proposal to change one goes to the owner.
- **Open:** motion (timing, easing, what glides and what snaps), drag feel and drop targets' look, hit areas, spacing and density, card and puck visuals within the elderflower identity, wording, default places, and how overflow and folding are shown. Workers are expected to make these better than the prototype where they see how, starting with the docking.
- **How an improvement is accepted:** each of stages 03 to 07 has a "feel" slice after its behaviour is in place. Its brief names the prototype's known rough spots, points to the impeccable skill (`~/.claude/skills/impeccable/SKILL.md`), and asks for a short before/after note with a recording or frame sequence against the prototype preview. The handler plays with it for a minute, then shows the owner on a tailnet preview. The owner's reaction decides; there is no score to reach.
- **Bound:** a feel slice changes presentation and motion, not the store, the declaration contract or the layout function's inputs and outputs. One round of owner feedback per stage is planned; more only if he asks.

## Stages

Each stage is one task file and passes its own acceptance before the next depends on it. Planning files stay on `ux-picks`. Code is built on a work branch cut from `master` (the prototype's tree differs from `master` in about 100 shared files, so rebuild commits made on top of it would not apply to `master`), and a stage is carried to `master` only when it is finished and accepted; there it is live, behind no switch. Stages 03 to 07 are built and proven on eight pilot graphs: Taylor, transformations and De Casteljau (the prototype's pilots; De Casteljau has playback) plus linear map (seven modes), phase portrait (expensive redraw), one graph whose lesson uses the legacy `step()` builder, one surface demonstration (WebGL and a camera, not a 2D bounding box) and one point-set graph where the learner clicks the board to add points (cards must not swallow those clicks).

| # | Stage | Depends on |
| --- | --- | --- |
| 01 | Source-tagged parameter writes over the graphs' setters | — |
| 01b | View adapter (intent and fitted view) | 01 |
| 01c | Fuzzer and probe in the repo | — |
| 02 | Declaration contract, contract tests, preview mechanism decision, conversion inventory and check tooling | 01 |
| 03 | Layout function, board cards (Odčitki, Legenda, sections), stored layout | 02 |
| 04 | Orodja and the lesson card as board cards; card budget; slim header | 03 |
| 05 | Pucks | 01, 03 |
| 06 | Previews and sweeps | 05 |
| 07 | Lesson morph and view director | 01b, 03, 04, 05 |
| 08 | Convert all demonstrations (parallel lanes) | 02 to 07 on `master` |
| 09 | Phone presenter (own spec, written with the owner) | 08 |
| 10 | Remove the old paths; documentation | 08, 09 |

Stages 01 to 02 show a learner nothing new and reach `master` one by one. Stages 03 to 07 reach `master` together, as one release, when all are accepted on the pilots: landing 04 alone would take the tools column from every graph before pucks and the view fit exist. From that release until stage 08 finishes, an undeclared graph falls back to its present panels inside an Orodja card that starts open, with its own view logic and no fit. That mixed period is accepted (decision 2). Every stage that changes the workspace migrates the desktop tests that describe it in the same publish, because CI deploys only when every job passes.

Until stage 09, phones get whatever the desktop presenter gives at a narrow width. Phone-specific unit, smoke and browser checks that the changed workspace breaks are skipped with a reference to task 09, not repaired; each skip is listed in that task file so stage 09 replaces or restores it. Checks unrelated to the workspace (routes, landing pages, catalog) keep running on phone sizes.

## Converting all graphs

The unit of conversion is the registered demonstration, not the graph file. The independent review counted 138 registered demonstrations (about 141 concrete classes); 29 graph files carry a prototype declaration to port; 96 graph files use a slider or count; 68 lesson content files. The inventory script of task 02 produces the authoritative list. (An earlier draft said 116, which counted graph files extending a base class.)

Facts that shape the lanes, from the review: lesson files do not partition the demonstrations (one lesson file covers 16, fifteen cover three or more, and 11 demonstrations span several files); 18 shared panel files hold sliders (for example `src/graphs/base/controls/BezierCurveControls.tsx`); `BaseFunctionGraph` has 35 subclasses; catalog keys are type checked, so a lane cannot pass `tsc` with a new string unless its key exists.

Why it was slow on the prototype, from the logs:

1. The contract changed while graphs were being converted (legend links, `valueTex`, `formulaLabel`, removal of hand-written focus), so converted graphs were retrofitted three times.
2. Every graph had to keep the old UI exact behind a flag.
3. Row ids, catalog keys, highlight rules and legend visibility were checked by eye, by the worker and again by the handler from screenshots.
4. All sessions edited one worktree and one preview, so hot reloads and stale modules disturbed each other's checks, and sessions queued on shared lesson files.
5. Shared gaps (inputs without a key, lessons built with the legacy `step()`, sentence catalog keys) were met and worked around graph by graph.

The method in task 08:

- **Freeze first.** Stage 08 starts only when stages 02 to 07 are accepted on the eight pilots and released. A contract change after that is a blocker for the handler, not something a converter works around.
- **Inventory.** A script lists, per graph: its controls with ranges, readout rows with their catalog keys, legend entries, board captions, its lesson file and the frames naming values, and its blocker class. This is the [item-batch blocker triage](../tasks/feature-streams/README.md#item-batches). One worker clears the shared blockers before any lane starts.
- **Machine checks.** One command per demonstration runs the contract test (ids, every lesson scene against the declaration, legend against drawn objects), a parity test and a browser probe (no page errors, puck drag, lesson walk, board cover). Parity uses golden values: before a demonstration's old panel is removed, the tool records the values it shows over sampled states; the declaration must reproduce them. The worker's report is that command's summary.
- **Shared code first.** Shared panels and base classes (`BaseFunctionGraph`, the 18 shared control panels) are converted by the handler's own workers before the lanes start, so a lane never edits a file another lane's demonstrations use.
- **Lanes.** Demonstrations are grouped into connected components over shared files (graph file, lesson files, panels, tests); a component is never split across lanes. Three lanes run at once, each in its own worktree and branch with its own dev server. Catalog keys a lane needs are listed by the inventory and added by the handler before the round starts; a lane that finds it needs another key reports it and does not edit the catalogs. The handler merges a lane when its checks are green and publishes per round.
- **Estimate.** Unknown until measured. The trial (12 conversions, all "accept with fixes", about 50k context per graph in a long session) kept the old UI, edited no tests and wrote no catalog keys, so it understates this work; plan two or three demonstrations per Sonnet session, which gives roughly 45 to 65 sessions for the demonstrations left after the pilots and shared code. Round one's measured time, context and repairs replace this figure before round two.

## Acceptance criteria

1. Every demonstration declares itself through A1; none renders a readout, legend, or range, count, choice or toggle control of its own outside the declaration (controls that stay in Orodja by decision 11, such as point lists and function entry, are exempt and listed by the inventory), and a search finds no pick flag, param registry mirror or `setRaw`.
2. [Parameter writes](parameter-writes.md) acceptance 1 to 5 hold, the untagged-write check passes across the all-graph suites, and the view is covered by the same kind of unit tests (a learner gesture ends a director glide; a fit never changes the stored intent; a preset stores the intent).
2a. Existing playback and a sweep never move the same key at once, and a learner write stops either.
3. The layout function has unit tests without a DOM for: budget on first view (two open cards from 1200 px, one below), fold before clip, whole-row cuts, the learner's stored fold winning, and a frame's opened cards. In the browser, opening, folding and dropping a card reaches its final rectangle with no intermediate size (frame sampling).
4. The contract test passes for every graph and every lesson frame, and for every frame each control it declares as used is visible and operable when the frame opens, at 1440×900 and 1024×768, with the default layout (browser check on the pilots; for all frames a unit test that the layout opens the card holding each used control, with fixture sizes).
4a. At 3440×1440 with the default layout, the lesson card and Odčitki are within the maximum span of A10 on the pilots, and the plot is not smaller than at 1440×900.
5. Fuzzer: 50 seeds per pilot route and 5 seeds per other route pass invariants I1 to I5. The findings F1 to F3 in [parameter writes](parameter-writes.md#fuzzer-findings-feeding-this-spec) each have a test: a sweep's probe values painted (A → B → A); a probe's restore overwriting a typed or dragged value; the JSXGraph "reading 'handler'" page error from a board listener that unsubscribes inside its own event. On the prototype they were patched in R30 and only the minimised cases were rerun; the full seed matrix has never passed, so the first full pass is this rebuild's.
6. Jank probe on the pilots at 1440×900 and 1024×768, quiet machine, against the thresholds in the ported checklist: no long task in a puck drag, sweep CLS under the threshold, puck width drift 0, at most one glide per lesson step, Back returns to the step's view within 2 %. Taylor and phase portrait are also run at 4× CPU throttle and reported.
7. Keyboard: every puck, card move, fold and lesson control is reachable and operable; card moves and resets are announced. Reduced motion: no glide.
8. A changed panel is looked at as a screenshot at 310 px card width before acceptance (AGENTS.md).
9. Board cover by cards is measured per pilot route and reported against the 35 % target. It is a reported number, not a gate.
10. Critique: each of stages 03 to 07 gets at most two rounds with the impeccable method's rubric on the fixed main path. Every P1 is fixed; P2s are fixed or logged in the task file with a reason. The work does not wait for a score.
11. Phones: no acceptance before stage 09 beyond "the page loads without a page error"; the skipped phone checks are listed in task 09. After stage 09: its own spec's criteria.
11a. The existing desktop unit and smoke suites pass at every publish, migrated where they described the tools column; no desktop check is skipped.
11b. Presets and file import and export round-trip as before; figure export shows the graph without cards; Uredi (editing) mode, Presentation mode, chapter activity pages, surface demonstrations and point-set graphs each work with the card layout (pilot or named check in tasks 03 and 04).
12. Documentation matches: DESIGN.md (no fixed 310 px inspector column), the controls catalogue (pucks, cards), architecture, the smoke checklist, ADR 0061 marked superseded.

## Out of scope

- Ghost controls (c11, b15).
- Changes to graph geometry or mathematics, except a preview path that needs geometry from a state.
- Replacing JSXGraph, or any build-tool change.
- New lessons or lesson prose changes beyond frame declarations.

## Breaking changes and user impact

- The workspace layout changes for every graph: the tools column is gone, tools and lesson are cards on the board, sliders appear as pucks. A learner's muscle memory for the tools column no longer applies.
- No route changes. No preset format change. A new browser-local layout record is added.
- Graph code: every parameter is bound to its setter and written inside a named source; `board.setBoundingBox` is called only by the view adapter.
- Touching a control of a parameter that is playing stops the playback (today the two can fight).

- Phones are worse than today between the first workspace stage reaching `master` and stage 09 (decision 8).

## Open questions for the owner

None at present. Stage 09 opens with its own design questions.

Decided by the owner on 2026-11-22 after the second review: one mover per parameter (where playback exists, the puck shows Play and no ∿); touching a control of a playing parameter stops the playback; stages 03 to 07 reach `master` together as one release.

## Second independent review (2026-11-22)

A read-only reviewer checked this plan against `master`'s code. Its findings changed: requirement A2 and task 01 (writes go through the graphs' existing setters; existing playback and board-dragged points are writers), the new tasks 01b (view adapter) and 01c (tooling, which lived outside Git), A4's measurement protocol, the preview decision moving to task 02, the 03-to-07 release going to `master` together with a fallback for undeclared graphs, desktop test migration, the conversion unit, counts, lanes and estimate, two more pilots, and typed ids through per-file builders.
