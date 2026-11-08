# CP9 — Polygon mode, overlay and convexity chapter block

Source: spec [Interaction and presentation](../../specs/collision-playground.md#interaction-and-presentation) (batch C bullet), [Chapter integration](../../specs/collision-playground.md#chapter-integration) (batch C), [Terms](../../specs/collision-playground.md#terms-settled-in-cp6-by-choosing-new-terms), criteria 5, 7 and 8 for polygons. Batch C. Kind: engineering + UI/accessibility review; notation test.

**Owned paths:** `src/learning/playground/collisions/`, the `collisions` cases in `src/learning/chapter/orderedContent.ts`, `src/learning/content/convexityChapter.ts`, the collision key block in `src/localization/{sl,en}.ts`, `scripts/collision-step-benchmark/`, and the docs below. Circle *Run* and *Look underneath* keep their behaviour.

**Settled decisions (handler, 2026-11-08):**

- **Protocol.** `init` gains `shape: 'circle' | 'polygon'` (default `'circle'`). `CollisionOverlay` gains `'hulls'` and `'pieces'`. The snapshot carries the per-body template indices and the scale for a polygon world. The main thread draws outlines from the pure `polygonTemplates` module, so no geometry crosses the worker boundary.
- **Block.** `{kind: 'playground'; playground: 'collisions'; mode: 'polygons'}` is a new typed pair. The component gets `shape="polygon"`.
- **Overlay control.** A three-option switch *box* / *hull* / *convex pieces*. It is keyboard operable with 44 px coarse-pointer targets. The selected stage's outlines are drawn, and touching bodies keep the ring cue. Distinguish the stages by dash style and not only by colour.
- **Readouts.** Pairs removed by the boxes, by the hulls and by the pieces, plus hull tests and piece tests per step. The live-region rule is unchanged: it speaks only after reader actions.
- **Placement.** The default is the `convex-hull` section, after the guided example: "hull as a cheap proxy". Confirm or change the placement, and record it and the reason in the spec's Chapter integration. Link to it from `bezier-hulls` with one sentence if that fits.
- **Limits.** Extend `just collision-step-bench` with a polygon cell set. Set the polygon limits by the CP3 rule (naive ≤ 250 ms, sweep ≤ 8 ms, cap 5 000 on the throttled profile) and record them in the spec's Bounded cost. `MAX_COUNT` becomes per shape and method.

**Prose.** Bilingual, one-shot ([one-shot text](../../specs/new-lesson-families.md#one-shot-lesson-text--owner-decision-2026-10-31)). It needs one invitation before the block and a short passage after it: a concave object, its box and its hull; the separating-axis test for convex shapes; why a concave shape is split into convex pieces; and what each stage removes. Introduce *test ločilne osi* and *razdelitev na konveksne dele* with the English gloss on first mention. Follow the AGENTS.md lesson-prose notation rules. `lessonMathNotation.test.ts` must pass unchanged.

**Docs:** `capabilities.md`, `ui-functionality.md`, and the convexity spec's placement (one sentence and a link). Mark the batch C terms as used in the spec's Terms table.

**Checks (observe a failure for each new assertion):**

- Component tests: polygon mode sends `shape: 'polygon'`; the overlay switch sends `setOverlay`; the removed-pair readouts match the counters; live-region and reduced-motion behaviour as for circles; the no-worker fallback renders.
- `just unit src/learning`, `npx tsc --noEmit --pretty false`, `just lint` on touched files, `just build`.
- Chapter check through `bezeg-smoke` (Haiku), both languages: `/bezeg-2.0/learn/convexity-hulls` shows the polygon block in its section, and the overlay switch and readouts work with the keyboard. `/bezeg-2.0/learn/sweep-algorithms` still shows both circle blocks.

**Return** ≤ 300 words: placement decision, limits measured, test counts, observed failures. Bulky output goes to `docs/reviews/collision-playground/cp9-notes.md`.
