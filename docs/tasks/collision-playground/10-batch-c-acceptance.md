# CP10 — Batch C acceptance

Source: spec [Acceptance criteria](../../specs/collision-playground.md#acceptance-criteria) 1–8 for polygons, and [Release batches](../../specs/collision-playground.md#release-batches). Batch C. Kind: handler (F6).

1. **Matrix.** In `docs/reviews/collision-playground/batch-c-acceptance.md`, write one row per criterion with its evidence (test name, measurement or smoke record).
2. **Containment and smoothness** (criteria 2 and 4): `just collision-containment` on `/bezeg-2.0/learn/convexity-hulls` in polygon mode, desktop and 4× throttled 390×844, with the same thresholds as CP7:
   - long animation frames;
   - p95 of scroll and link input to next paint ≤ 100 ms;
   - switch latency;
   - draw median at the sweep limit.

   Run the lifecycle mode on the chapter as well. Extend the script for the polygon block if needed. A miss goes to the owner before release.
3. **Pause and lifecycle** (criteria 3 and 6) for the polygon block. Use the same evidence as CP7. Hidden-tab evidence may stay unit-only, as recorded for batch B.
4. **Checks.** Run `just check`. Then run a bilingual smoke through `bezeg-smoke` (Sonnet first pass): `/bezeg-2.0/learn/convexity-hulls` with keyboard and 390×844 touch on the polygon controls, and the circle blocks of `/bezeg-2.0/learn/sweep-algorithms` as a regression check.
5. **Records.** Record the measurements in the performance results and link them from the performance plan. Update the task table and the stream file. Hosted CI must be green after the push.
