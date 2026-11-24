# 05 toggle and choice pucks: verification done

## Built earlier
Contract (`puck` on choice parameters/actions, `MAX_CHOICE_PUCK_OPTIONS`), TogglePuck/ChoicePuck/ActionPucks, strip items, CSS, harness `puckControl`/`puckOption`/`chooseOnPuck`; applied to Taylor show-error, linear map conic/pivot, phase system/equilibrium, Coons shown + linked corners, De Casteljau full-curve, triangle centres. New `togglePucks.test.tsx`. Docs: controls.md, converting-a-graph.md.

## This pass
- guidedLessons.ts:588 dropped `open: ['tools']` (kept `uses`); `src/learning/content` unit green.
- Slovenian `*_short` labels reuse existing terms/symbols (Linearni, Nihalo, Spirala, (0, 0), (π, 0), Lc, Ld, B, S): unchanged.
- eslint on all changed/new files: one error (unused `m` in phasePortraitsGuidedLessons.test.ts pp3Ui, renamed `_m`); now 0.
- `just build` ok. 04-strip-overlap-check at 1440 and 1024: 0 overlaps; its one "failing" frame (i=12) is the completion frame (no Next button), a script artefact.
- phase-portrait-linearization sl desktop: strip (812x248 at 1280x720, board 411 high) covered the lesson card and Next. Fix: boardLayout.ts `layoutBoard` rule 2h, a last-resort beside layout that lets right/centre columns fold their last open card; unit test in boardLayout.test.ts fails without it. After: strip x=435 beside the lesson card (33..427).
- `just smoke-lesson` green: phase-portrait-linearization, linear-map-composition, taylor, patch-coons, decasteljau, triangle-centres.
- Scratch scripts deleted.
