# 3. Browser verification and docs

Source: [spec](../../specs/side-botanicals.md).

## Gaps left by step 1

- Reduced motion has only been checked through CSS rules and unit tests. Check it in a real browser: emulate `prefers-reduced-motion: reduce` and confirm nothing moves (and, after task 1, that the branches are fully grown).
- Nobody ran the smoke checklist ([smoke tests](../../smoke-tests.md)) for the three routes. Run a named-route smoke on `/bezeg-2.0/`, `/bezeg-2.0/demonstrations` and `/bezeg-2.0/learn` at 3440, 1920 and 1280px. Check that the decoration appears only at 1600px and wider, that content stays clickable, there is no horizontal scroll, and the header and carousel work.
- Performance was measured only headless (about 8 fps without a GPU, the same before and after the floret shimmer). The owner reports it smooth on their ultrawide. Record one GPU-backed measurement: Chrome performance panel, 5 s idle on `/bezeg-2.0/learn` at 3440, scripting and paint time per frame. If paint dominates, the fallback is to draw each animated group once as a bitmap and only move the bitmaps.

## Docs

- Set the spec status to "step 1 complete" with the commit list. Mark acceptance as met or open per criterion.
- Mention `SideBotanicals` in the app-shell part of the architecture or capabilities doc (search for where `AppHeader` is described).
- Decide whether the owner's playground (`bezeg-side-botanicals-mockup/playground.html` on the owner's desktop) should become a dev-only route or script in the repository, so the settings stay tunable. Owner's call; ask.
