# Highlights 05 full chapter smoke brief (handoff-v12)

- **Role:** smoke, read-only toward `src/`. Write only under `docs/reviews/guided-example-highlights/acceptance-smoke/` (scripts, screenshots, `report.md`).
- **Goal:** browser evidence for spec [guided-example-highlights.md](../../../specs/guided-example-highlights.md) H5, H6 and H7 across all nine chapters, after the `figure` ordered-content kind was deleted (task 05).
- **Preview:** handler-owned production preview at `http://127.0.0.1:4387/bezeg-2.0`, build of revision `12d5aadb` (worktree dirty only in docs/inventory JSON). Do not start or stop it. Do not run `just build`. Use Playwright through a Node script under your output folder; Chromium from the repo's installed Playwright (`node_modules`). No bare `npx playwright test` suites.
- **Chapters (routes `/bezeg-2.0/learn/<id>`):** `bezier-curves`, `foundations`, `rational-curves`, `splines`, `ph-curves`, `parametrization`, `functions-and-calculus`, `analysis`, `bezier-patches` (verify the last id on the Learn landing page if it 404s).

## Checks

1. Every chapter, SL and EN: zero section figures (no `<figure>` in section bodies other than guided-example cards; record the selector you used); every guided-example card has a decoded image (`naturalWidth > 0`), non-empty alt text and a caption; total card count (expected 67). No raw TeX (`\(`, `\frac`, `\mathbf` etc.) in visible text; no console or page errors.
2. Live switch: on two chapters change language with the app's switcher, without reload; card alt text and captions change language.
3. Viewports: desktop 1440×900, projection 1920×1080 (or 1280×800 at deviceScaleFactor 1.5), narrow 390×844, and 200% text (CSS `html{font-size:200%}` or zoom) at 390 and 1280. Check no horizontal overflow (`scrollWidth <= clientWidth`), card image uncropped with ratio about 21:13, image beside the copy at desktop/projection and stacked above it at 390.
4. Launch/return: at least one guided-example launch per chapter (nine), with at least three in SL. After launch the example opens from its starting scene (board visible). "Return to chapter" / "Nazaj v poglavje" returns to the owning section with focus on the launching link.
5. Keyboard: on two chapters, reach a card's launch link with Tab only, open it with Enter, return with keyboard, and confirm focus lands on the launching link.
6. Back/Forward: after a launch, browser Back returns to the chapter section; Forward reopens the example.
7. Catalog guidance entry: from a Demonstration page in the catalog (`/bezeg-2.0/demonstrations`), follow its link into a chapter/guided example if one exists (e.g. Bézier, PH); confirm it reaches the intended section or example. If no such link exists, report that.
8. Lightbox: open at least one card image enlargement per chapter if the card offers one (click/Enter on the image); confirm it opens, shows the image, closes with Escape and restores focus. If cards have no lightbox, report that.

Take screenshots of: each chapter's first card at 1440 SL, three chapters at 390 and 390 at 200%, projection for two chapters, one lightbox, and one EN live-switch state. Name them `<chapter>-<viewport>-<lang>.png`.

## Return

`report.md` in the output folder: a table of check × chapter with pass/fail/not covered, failures with URL, viewport and screenshot path, and gaps. Reply with ≤250 words summarizing failures and gaps, plus the report path. Budget: about 30 turns; on `HANDOFF` stop and write what you have to `report.md`. Read at most ~150 lines per call; send script output to log files in the output folder.
