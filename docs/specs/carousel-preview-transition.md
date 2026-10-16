# Calm carousel preview transition

Status: implementation authorized on 2026-10-16.

The homepage preview flashes when selection changes: its keyed image remounts and animates from zero opacity, exposing the card background. A local Chromium reproduction measured opacity 0.347 shortly after selecting the second choice, even with its image fully loaded.

## Acceptance criteria

- Keep the preview background and layout stable; blend between the existing mathematical images over roughly 300 ms without a blank interval or vertical entrance motion.
- Show the first preview immediately. Rapid manual choices must settle on the latest choice without stale images or queued transitions.
- Reduced motion switches images immediately. Preserve six-second autoplay, pauses, manual takeover, keyboard access, selected copy/actions, routes, and image proportions.
- Scope changes to homepage presentation; preserve unrelated working-tree changes.

## Verification

Run existing homepage component tests, TypeScript checking, and a production build. Use focused browser validation under the smoke-tester skill: sample image coverage during transitions, exercise automatic/manual/rapid selection and reduced motion, and review desktop and narrow layouts. No new mathematical checks are needed because existing artwork and graph behavior are unchanged.

## Results

The six decorative previews remain mounted inside one opaque stage and blend with a 300 ms opacity transition. There are no added timers or listeners. Reduced motion disables the transition.

On the development preview of the working checkout, Chromium checks passed at 1440 × 900 and 390 × 844: first preview immediately opaque; six-second autoplay; combined image opacity at least 0.999999 during sampled manual transition frames; stable stage dimensions; rapid choices settle on the last choice; manual takeover prevents further autoplay; keyboard arrows; reduced-motion immediate selection; no horizontal document overflow or runtime errors. Screenshots were visually reviewed. This is focused browser validation for a homepage-only presentation change, not a full smoke run or physical-device check.

All eight existing homepage tests, TypeScript checking, and the production build passed. The build retains dependency Sass, chunk-size, and JSXGraph eval warnings. The initial checkout contained unrelated changes; they are excluded from this fix.
