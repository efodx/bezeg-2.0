# 08 strip overlaps lesson card: cause and fix

Cause: `src/workspace/presenter/BoardCards.tsx:344-346` measured strip slots with `offsetWidth` (integer). Inverse slots are 150.14 + 120 + 120
wide; rounded 150 gave a strip width 438 while the real row needs 438.14, so the browser wrapped the third puck while the layout counted
one row (h 79): the wrapped row rose over the lesson card. Layout rules were fine.

Fix: `src/workspace/pucks/measureSlot.ts` (sub-pixel remainder rounded up), used in BoardCards.tsx. Test `measureSlot.test.ts`.
Browser: `docs/reviews/ux-picks-app-wide/smoke/08-strip-overlap/` (before.log used the strip container box, which hid the wrap; after.log
uses the union of the slot boxes).
