# Integrated compact chapter smoke

Run: 2026-10-26 09:39:28–09:44:26 UTC (about 5 minutes). Checkout: `C:\Users\NonFriedMotherBoard\.codex\worktrees\compact-chapter-exploration\bezeg`, HEAD `e313c002c1449e329539b2f70193e93e65c5f0b8`. The tree was clean at start. The supplied handler-owned preview `http://127.0.0.1:4393/bezeg-2.0` returned HTTP 200; handler reported its production build matches this revision. Headless Playwright Chromium.

| Check | Status | Observed evidence |
| --- | --- | --- |
| Foundations free exploration card and ordinary return | Passed | Opened `bernstein?explore=foundations.why-weights.bernstein`; `#jgbox` showed SVG path geometry. Returned to `/learn/foundations#why-weights`; the `Zakaj uteži?` heading was visible and focused (`why-weights-heading`). |
| Foundations section-owned guided lesson and history | Passed | Opened with `learn=1&learnChapter=foundations&learnSection=why-weights`; lesson and graph scene were visible, with zero family-investigation prompts. Its reading link returned to the exact section and focused heading. Back restored the guided workspace; Forward restored the section and heading focus. |
| Bézier prepared shape-control keyboard launch and return | Passed | Enter on `#activity-shape-control` opened `bezier/curve?chapter=bezier-curves&activity=shape-control`; board geometry appeared and “Continue reading” received focus. Enter returned to `#control-points` and focused the launch card; Forward restored the activity and return-button focus. |
| Chapter layout matrix | Passed (16/16) | Foundations and Bézier at 1440/390 px, Slovenian/English, and 100/200% root text. Sections, primary activity actions, and figures were present; document width matched viewport and sampled action/figure bounds stayed inside it. |
| Console/runtime errors in flow checks | Passed | No console errors or page errors observed. |

One early Bézier locator attempt used an English label while the isolated UI was Slovenian; selecting English explicitly made the keyboard flow pass. The browser context closed cleanly. No presets or preview processes were changed. This covers only the named workflows and viewport layouts; no physical-device or mathematical validation was performed. At final status, handler-owned modifications include `docs/agent-workflow/evaluation-log.md` and `implementation.md`; this report is the only smoke-owned file change.
