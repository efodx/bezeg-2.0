# Bézier patches basics smoke checkpoint (H26)

This is partial browser evidence for the supplied frozen preview, not a full smoke pass.

- Checkout: `.claude/worktrees/bezier-patches-r2`; HEAD `e917d2caac4962e96e9129773c46c83d8eeba1b9`; worktree was already dirty with patch and learning sources/tests plus untracked worker files.
- Target: `http://127.0.0.1:4394/bezeg-2.0`, supplied local production preview. Handler provenance: frozen build from `e917d2c` plus the inherited dirty files and registry/sequence modules. No rebuild was run; later source edits are outside this checkpoint.
- Browser: installed Playwright, Chromium 156.0.8078.4, headless; viewport 1440×900; first full script attempt took 16.3 seconds.
- Console/page errors: none observed. The app initially showed its MathJax wait screen; waiting for the visible lesson then loaded it.
- Cleanup: the script closed its isolated browser context and Chromium process. The handler preview (session 48463) was left running. No user storage was touched.
- Artifacts: [.claude/scratch/bezier-patches-basics-h26/smoke.cjs](../../.claude/scratch/bezier-patches-basics-h26/smoke.cjs), [results.json](../../.claude/scratch/bezier-patches-basics-h26/results.json), and [curve-before-play.png](../../.claude/scratch/bezier-patches-basics-h26/curve-before-play.png).

| Check | Status | Evidence |
|---|---|---|
| Chapter prerequisite link | Passed | Clicked the Bézier-curve prerequisite; it opened `/learn/bezier-curves` with the curve chapter heading. |
| Four basics card routes and ownership | Passed | Clicked all four cards from their sections. Each URL exactly matched `/patches/tensor?example=lesson.bezier-patches.<section>.patch-tensor`; each lesson owner label named that section. |
| Return to chapter: invoker focus and section scroll | Failed at first sample; settle recheck needed | Keyboard Enter returned to the right card and restored focus to its ID. At the immediate URL-change sample, `scrollY=212` while the link top ranged from 1465 to 3746 px, so the focused link was outside the viewport. The script did not wait for MathJax/layout restoration to settle; persistence of the offscreen state is unverified. |
| Initial curve lesson graph | Passed | The initial “Krivulja se premika” frame showed a nonempty tensor owner, a visible canvas, a visible graph prompt, framed bounds, and all six control points in-frustum. The published camera was `az=.72, el=.48, distance=5.5, target=[0,0,0]`; the owner sample was `[[-1,-1,0],[0,-1,-0.125],[1,0.875,0]]`. |
| Curve sweep playback controls | Blocked | After hiding the instructions on the initial frame, the expected visible `.guided-lesson-animation-controls` group did not appear within 10 seconds. No Play, Pause, Stop, or Replay action was exercised. The script stopped here rather than invoking graph internals. |
| Four frame sequences to completion, desktop SL and 390px EN | Skipped | Handoff arrived before these checks. No mobile, touch, English, or numerical slider readout result is claimed. |
| Exit restoration, reset, and navigation/remount cleanup | Skipped | These depend on completing the sweep lifecycle and were not reached. |

To finish the assigned smoke, first identify the visible user path that exposes the authored `patch-v-sweep` controls; if none exists, report that as unavailable. Then exercise the sweep and record the changing/frozen parameter value plus useful before/during screenshots; check Stop, Replay, exit restoration, reset, and route remount. Complete both two-frame lesson sequences for all four canonical routes in desktop Slovenian and 390px English, checking prompts, parameter readouts, surface-owner/framing attributes, completion, and narrow-screen overflow. Finally repeat the chapter-return scroll check after the chapter's math/layout work has settled.
