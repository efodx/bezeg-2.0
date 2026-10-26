# Rational preview catalog smoke check

- Checkout: C:\Users\NonFriedMotherBoard\.codex\worktrees\rational-preview-fixes\bezeg, HEAD ad37517.
- Starting state: dirty per handler assignment (capture scripts/docs, four catalog PNG/WebM pairs, and manifest). git status in this linked worktree returned "fatal: this operation must be run in a work tree", so I relied on that supplied inventory.
- Preview: existing task-owned local production build at http://127.0.0.1:4396/bezeg-2.0/demonstrations; handler confirmed the preview index matches the local build.
- Browser: headless Playwright Chromium 156.0.8078.4. Viewports: 1440×1000, 390×844, then 1440×1000.
- Timing: task start 2026-10-26 14:56:01 UTC; report complete 2026-10-26 15:01:08 UTC; elapsed 5m 07s.

| Selected check | Status | Evidence |
|---|---|---|
| Catalog entry | Passed | 45 catalog cards rendered at the demonstrations route. |
| Bezier baseline | Passed | Poster decoded at 720×440; 4-second preview played, muted and looping. |
| Rational/PH desktop previews | Passed | rational, rational-decasteljau, ph-cubic, and ph-quintic posters decoded at 720×440; each 4-second 720×440 preview played and advanced. |
| 390px target cards | Passed | All four posters and previews decoded/played; document width stayed 390px with no horizontal overflow. |
| Reduced motion | Passed | All four target posters decoded; no video element or video source was mounted. |
| Keyboard focus and navigation | Passed | Rational card showed visible keyboard focus, mounted and advanced its preview; Enter followed its actual href /bezeg-2.0/rational/base. Reproduction showed the “Rational Bézier curve” heading and visible #jgbox. The first harness attempt guessed /rational/curve and timed out; the observed card route satisfies the selected destination behavior. |
| Runtime/assets | Passed | Zero console errors, page errors, failed requests, or same-origin HTTP responses ≥400. |

Other catalog navigation, graph editing, lessons, presets, inspector keyboard workflows, touch hardware, and full smoke suite were skipped as outside this assigned preview-asset scope. This run does not establish mathematical correctness or physical-device behavior.

Cleanup: Chromium was closed and browser-local language state was confined to its temporary context. The task-owned preview server was left running. The runner/reproduction helpers and failure screenshot remain under ignored .command-logs/; no source files were changed.