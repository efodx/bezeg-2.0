# Task 2 assertion inventory (shared lesson interactions)

Sources read at HEAD 9bbfff7. `GL` = `tests/guided-lessons.smoke.spec.cjs` 2661 lines at 9bbfff7; line numbers refer to that revision, 45 rows. `GA` = `tests/lesson-graph-access.smoke.spec.cjs`. `LEC` = `tests/lesson-experience-checks.cjs` (required from GL:2661, so it runs inside the GL spec file, Taylor only). `GLU` = `src/learning/runtime/GuidedLesson.test.tsx`. `LS` = `src/learning/runtime/LessonSession.test.ts`. `DW` = `src/graphs/base/DemonstrationWorkspace.test.tsx`.

Row sets: all 45 rows (`LESSONS`, GL:2148); EXIT_SAMPLE = 7 rows (GL:2151: linear-function, repeated-subdivision, farin, spline-c1, ph-cubic, decasteljau, bisection); SHARED_RUNTIME_ROWS = 3 (GL:2169: bernstein, farin, spline-g1); extrapolation and decasteljau are single-row files; `h.failOnRuntimeErrors()` at GL:44 and GA:4.

| Behaviour | Location (file:line, test name) | Runs per lesson row or once (which rows) | Real browser or unit | Exact assertion (short) |
|---|---|---|---|---|
| Frame transition Next/Back | GL:2177 `sl: ?learn=1 walks every frame...` | per row, 45 rows (sl) | browser | Next click on each frame; progress label changes; every step visited; frames >= minFrames |
| Frame transition Next/Back | GL:2226 `en: Exit restores...` short Back/Next block | 7 rows (EXIT_SAMPLE) | browser | one-frame move changes progress; opposite move returns to same label |
| Frame transition Next/Back | GA:34 Taylor test, Continue step | once (taylor) | browser | Continue advances step number +1 |
| Frame transition Next/Back | LS:74 `moves through explicit frames before changing steps` | unit | unit | snapshot status/stepIndex/frameIndex content->explore->content |
| Frame transition Next/Back | GLU:362 `Back from an observation overlay returns to the previous frame` | unit | unit | Prejšnji okvir from Opazuj returns to Izračun |
| Back losslessness | GL:2343 `Shared lesson runtime / Back is lossless...` | 3 rows (bernstein, farin, spline-g1), en | browser | Back through every frame: label equals recorded trail, probe per frame; Back disabled at start; forward replay equals trail; completes |
| Back losslessness | GL:2415 `Bernstein extras / Back all the way to the first frame` | once (bernstein) | browser | forward 3, back 2, forward 2 returns to same label; back x3 gives first; Back disabled |
| Back losslessness | GL:2377 `Bernstein extras / stacked-area step...` | once (bernstein) | browser | 5 round trips: stacked curve count and step-3 count each stay constant |
| Back losslessness | GL:2226 (short Back block, 7 rows) | 7 rows | browser | see row above (one-frame only, not walk) |
| Observe button + graph unlock | GL:2177, observe branch, line 2195 | per row, every observation frame | browser | after Observe: `section.workspace-graph` data-lesson-locked not 'true' |
| Observe button + graph unlock | GL:2571 `Observation flow / visible instructions lock...` | once (extrapolation, en) | browser | locked true before; false after Observe; true after reopen; true on next frame |
| Observe button + graph unlock | GL:2622 `Observation flow / Next on the last observation frame...` | once (extrapolation) | browser | completion panel visible and graph unlocked |
| Observe button + graph unlock | GA:34, lines 54-59 | once (taylor) | browser | after Observe: lesson gone, not locked; Degree n input enabled |
| Observe button + graph unlock | GLU:242 `keeps the graph locked while instructions are visible...` | unit | unit | onModeChange last call content/explore/content/complete |
| Observe button + graph unlock | GLU:163 (`does not pause playback...`) and GLU:404 | unit | unit | Observe on a frame with no playback issues no animation command |
| Observe button + graph unlock | DW:108, 126-145, 157, 195 | unit (DemonstrationWorkspace, component) | unit | region data-lesson-locked true/absent around Observe and Exit |
| Compact tab size (>=44 px) | GL:2177 observe branch, line 2196-2198 | per row, observation frames | browser | reopen tab boundingBox width and height >= 44 |
| Compact tab size (>=44 px) | GA:94 `lesson actions stay reachable...` lines 130-140 | once (taylor, 390 px) | browser | tab width, height >= 44; overlaps board; receives pointer hit |
| Compact tab size | LEC: none | - | - | not asserted (LEC sizes are degree stepper and inspector tabs, LEC:61-72) |
| Reopen identity (same frame) | GL:2177 observe branch, line 2202 | per row, observation frames | browser | progress after reopen equals observed label |
| Reopen identity (same frame) | GL:2571 | once (extrapolation) | browser | progress unchanged after reopen; Next advances +1 step |
| Reopen identity (same frame) | GA:34, lines 71-74 | once (taylor) | browser | progress unchanged; degree 8 kept; board `toEqual` edited snapshot (id, view, size, objects) |
| Reopen identity (edits, reading, board) | LEC:7 `same-frame reading position survives math reflow` | once (taylor, en, 1100x540) | browser | after hide and reopen: progress same; reading scrollTop ~ before |
| Reopen identity (edits, board) | GA:94, lines 158-159 | once (taylor, presentation reopen) | browser | board id and view unchanged after reopen in presentation |
| Reopen identity (edits, board) | GA:34 exit, lines 85-90 | once (taylor) | browser | exit restores entry bound statuses, board id, view, size, object count |
| Reopen identity (reading, board) | GLU:121, 159, 179, 207 | unit | unit | same frame; scrollTop 140 kept; narrow scrollTo 420; new frame resets to 0; panel focused, scene untouched |
| Reopen identity | GLU:499 `typesets mathematics again when hidden observation instructions reopen` | unit | unit | typesetPromise called after reopen |
| Reopen identity | DW:178 `minimized lesson exposes one focused reopen tab` | unit | unit | tab in layer and workspace, focused; overlay removed |
| Next hit-test / pointer reach | GL:2177 observe branch, 2205-2214 | per row, observation frames only | browser | elementFromPoint at Next centre is Next (or inside it) |
| Next hit-test / pointer reach | GL:2220 | per row (45, via sl walk) | browser | blocked list empty |
| Next hit-test / pointer reach | GL:2177 non-observation frames, `nextButton().click()` (GL:2214) | per row | browser | implicit: Playwright click actionability (hit-test) |
| Next hit-test / pointer reach | GL:2275 narrow viewport, lines 2305-2316 | per row, math/notation frames at 390x844 | browser | `.click({timeout:4000})` succeeds; failure recorded and expect blocked = [] |
| Next hit-test / pointer reach | LEC:103-106 | once (taylor, 14 variants) | browser | hide, exit, Next at top/middle/bottom: el contains elementFromPoint centre |
| Exit dialog: Continue focus | GL:2226-2252 | 7 rows (EXIT_SAMPLE) | browser | dialog visible; Continue lesson button focused |
| Exit dialog: Continue focus | LEC:140-141 | once (taylor, 14 variants) | browser | Continue lesson focused on open (GL:2251) |
| Exit dialog: Escape keeps frame | GL:2226 (Escape at 2252, progress check 2253) | 7 rows | browser | Escape hides dialog; progress unchanged |
| Exit dialog: Escape keeps frame | LEC:146-150 | once (taylor, 14 variants) | browser | dialog hidden; exit button focused; URL, progress, board id unchanged |
| Exit dialog: Escape keeps frame | GLU:285 `exit dialog keeps reading open on Escape...` | unit | unit | Escape closes dialog; heading Prvi korak visible; background inert removed; onClose not called; invoker focused |
| Exit dialog: confirm | GL:2226 `exitAndConfirm` helper (helpers:174) | 7 rows | browser | panel count 0 after confirm |
| Exit dialog: confirm | GA:185-186 (touch test) | once (taylor, touch) | browser | tap Exit and restore graph closes dialog and panel |
| Exit dialog: confirm | GLU:113 (first test, Continue lesson click) | unit | unit | Continue lesson does not call close; Exit and restore graph calls close |
| Exit dialog: failed restore | GLU:308 `failed checkpoint restoration keeps the lesson and dialog` | unit | unit | alert text; dialog and heading stay; onClose not called |
| Focus handoff / trap | GL:2571 (observation flow) | once (extrapolation) | browser | panel has focus after load; reopen tab focused after Observe; panel focused after reopen and after Next |
| Focus handoff / trap | GL:2571, Presentation Escape block | once (extrapolation) | browser | Escape from Presentation button hides panel, focuses reopen tab |
| Focus handoff / trap | LEC:142-145 | once (taylor, 14 variants) | browser | Shift+Tab from Continue wraps to last dialog button; Tab returns to Continue |
| Focus handoff / trap | GLU:207 `rapidly reopening during the closing handoff...` | unit | unit | tab focused on close; panel inert then not; panel focused after reopen |
| Focus handoff / trap | GLU:285 | unit | unit | background control inert while dialog open |
| Focus handoff / trap | DW:108 `...exits with focus restored` | unit | unit | focus restored on exit |
| Keyboard navigation (Tab+Enter) | GL:2336 `Next is reachable via Tab and activated with Enter` | 3 rows (bernstein, farin, spline-g1) | browser | Tab up to 60 presses reaches Next; Enter advances (helper pressNextWithKeyboard, helpers:214) |
| Keyboard navigation (focus+Enter) | GL:2571 `pressOn` | once (extrapolation) | browser | Observe, reopen, Next each via focus + Enter |
| Keyboard navigation (focus+Enter) | GL:2177 `pressOn` on observation frames | per row, observation frames only | browser | Observe, reopen, Next each via focus + Enter |
| Keyboard navigation (Escape) | GL:2571 Escape block; LEC:146 | once each | browser | see Escape rows above |
| Keyboard navigation | GLU:431 `uses Next as the only forward lesson command` | unit | unit | Razišči v grafu absent; Naslednji okvir visible |
| Escape hides instructions | GL:2571 Presentation Escape block | once (extrapolation) | browser | Escape hides panel; graph unlocked; reopen tab focused |
| Escape hides instructions | GLU:265 `Escape from outside the panel hides instructions...` | unit | unit | keydown defaultPrevented; panel removed; mode explore; onClose not called |
| Language switch during lesson | GL:2328 `header language switch re-titles the open lesson` | 3 rows (bernstein, farin, spline-g1), sl to en | browser | lesson heading equals en title; exit button visible |
| Language switch during lesson | GLU:89 `offers content-first navigation and preserves step identity when language changes` | unit | unit | Korak 1 od 2 becomes Step 2 of 2 after switch; Exit labels follow language |
| Language switch during lesson | DW:225 `language changes preserve the current learning prompt...` | unit | unit | prompt kept; draft controls mounted |
| Cancellation (dialog Escape / Continue) | GL:2226 (7 rows) | 7 rows | browser | see Exit dialog rows |
| Cancellation | LEC:146-150 | taylor, 14 variants | browser | Escape cancels; URL and board unchanged |
| Cancellation | GLU:89 Continue lesson click (GLU:113) and GLU:285 | unit | unit | onClose not called |
| Completion retains final scene | GL:2458 `?learn=1 steps through to completion...` | once (rational elevation) | browser | after closing completion: boardStats equal completed snapshot (GL:2494) |
| Completion retains final scene | GL:2177 completion | per row | browser | only lesson panel contains "Lesson complete" text (GL:2219); scene not compared |
| Completion retains final scene | GLU:343 completion test | unit | unit | `.guided-lesson-complete` class; Next completes after reopen |
| Completion retains final scene | LS:91 `exit restores captured state while completion retains final scene` | unit | unit | value unchanged on complete and closed; restoreState called once |
| Exit rollback vs completion | GL:2226 (7 rows) | 7 rows | browser | assertUserState after Exit; re-entry x2 with stable board counts (GL:2271) |
| Exit rollback vs completion | GL:2429 `exit restores degree 1 / stacked off` | once (bernstein) | browser | degree 1 and stacked off after exit; object total stable over 3 re-entries |
| Exit rollback vs completion | GA:34 | once (taylor) | browser | see Reopen identity rows |
| Exit rollback | LS:165, 181, 196, 225 (absent scene, empty scene, capture failure, disposed graph) | unit | unit | restore or no-apply paths |
| Reduced motion | none in browser | - | - | no emulateMedia(prefers-reduced-motion) in any lesson spec |
| Reduced motion | GLU:209 stubs matchMedia matches false | unit | unit | only the non-reduced value; GuidedLesson.tsx:107-108 reduced branch never asserted |
| Non-reduced motion (handoff timing) | GLU:207 | unit | unit | fake timers; closing and opening phases |
| Touch | GA:164-192 `touch learners can hide, reopen by touch, and explicitly exit` | once (taylor, 390x844, isMobile, hasTouch) | browser | tap Hide; panel gone; tap reopen; same board id; tap Exit; dialog; tap Exit and restore graph |
| Animation / playback | GL:2635 `playback pauses when instructions reopen and Next advances` | once (decasteljau, en) | browser | t slider frozen while behind overlay; no playback behind next overlay |
| Animation / playback | GLU:373 `pauses graph animation when hiding instructions and reopening does not restart it` | unit | unit | pause on Observe; no second play on reopen |
| Animation / playback | GLU:404 `does not pause playback that the observation never started` | unit | unit | no animation command |
| Animation / playback | GLU:499 typeset on reopen | unit | unit | typesetPromise called again |
| Runtime-error handling | GL:44 and GA:4 `failOnRuntimeErrors` | all browser tests in both files | browser | pageerror and console.error collected; expect [] |
| Runtime-error handling | LS:141 rollback failure surfaced; LS:206 restore failure not applied; LS:216 failed action restores checkpoint then reports | unit | unit | error surfaced; next scene not applied |
| Runtime-error handling | GLU:308 | unit | unit | alert role present with restore message |
| Runtime-error handling | browser failure injection | none | - | no browser test forces a restore or action failure |

## Repeated per row (run for all 45 rows, sl walk GL:2177 plus narrow GL:2275)

1. GL:2177 deep link: lesson heading equals sl title; Back disabled at start (GL:2178-2180).
2. GL:2177 every visited step number equals 1..steps (GL:2222); frames >= minFrames (GL:2223).
3. GL:2177 observation branch: data-lesson-locked not 'true' after Observe (GL:2195); tab >= 44x44 (GL:2198-2200); reopen keeps progress label (GL:2202); Next centre hit-test (GL:2205-2214, blocked list GL:2220).
4. GL:2177 completion text "Lesson complete" (GL:2219) and offscreen-points check (GL:2221).
5. GL:2275 narrow 390 px: Next and Exit inside the viewport; no horizontal overflow on math/notation frames; pointer click on Next succeeds (GL:2305-2316).

Also repeated: GL:2226 Exit/re-entry on 7 rows only; GL:2336, 2343 on 3 rows only.

## Gaps (no owner, or only one narrow owner)

- Reduced motion: no browser test; GuidedLesson.tsx:107-108 reduced branch has no test with matches true (GLU:209 stubs false).
- Touch: one Taylor test only (GA:164). No touch on observation frames, Next, or the reopen tab for any other row.
- Keyboard: Back via keyboard and Exit via keyboard are not asserted; Enter on Exit is not asserted; Escape from the dialog runs only on 7 rows and taylor.
- Language switch: browser asserts only the heading on 3 rows; no switch during an observation overlay or an open dialog in browser.
- Runtime-error handling: no browser failure injection; only the global console/pageerror hook.
- Completion retaining the final scene: browser only on rational elevation (GL:2494); other rows check text only.
- Exit rollback in browser: 7 rows (EXIT_SAMPLE) plus bernstein and taylor.
- Compact tab size: browser only on rows with observation frames (per row) and taylor at 390; no unit test asserts tab size.
- Playback: browser only on decasteljau (GL:2635); no playback check on other animated rows.
- Dialog focus trap: browser only on taylor (LEC:142-145); unit covers inert background only.
- Reading position on reopen: browser only on taylor (LEC:7); unit at GLU:159/179.

## Counts (behaviour rows above)

16 behaviour rows: one owner = 1 (touch, GA:164); none = 1 (reduced motion); several = 14. Escape-hides-instructions has two owners (GL:2571, GLU:265), and is counted as several.
