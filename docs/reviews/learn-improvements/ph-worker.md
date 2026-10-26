# PH content worker evidence

Implementation covers only `src/learning/content/familyChapters.ts` and its focused content tests. The worked example now integrates both velocity components from the origin, gives the endpoint values, verifies speed and length, distinguishes cubic position from quadratic hodograph, and explains translation. Offset prose defines a chosen left normal at regular points, explains signed and zero distances, allows the opposite convention to swap signs, and avoids promising polynomial offsets or global regularity. Prompts cover every PH graph-link occurrence with localized tab names and actions supported by the actual controls; the generating-point editor is explicitly distinguished from a plotted hodograph.

Figures reuse `src/images/demonstrations/catalog/ph-cubic.png` and `ph-quintic.png`, through `demonstrationPreviewAssets`. The capture recipes in `scripts/demonstration-preview-recipes.cjs` set one offset at `d=0.35` for `ph-cubic` and `d=0.5` for `ph-quintic`. The captured scenes show a green source curve, blue offset, and orange points; the quintic is a hook with its offset outside. Captions identify these as catalog examples separate from the worked origin-based curve. No capture was regenerated.

The new PH acceptance test failed before content changes with `arc-length-problem/ph-cubic Slovenian prompt: expected undefined to be truthy`, confirming missing prompt coverage. Final checks passed:

- `just unit src/learning/content/familyChapters.test.ts src/learning/content/lessonMathNotation.test.ts`
- `npx tsc --noEmit --pretty false`
- `just lint src/learning/content/familyChapters.ts src/learning/content/familyChapters.test.ts`

The production build, browser review, and independent mathematical/content review remain with the handler. The pre-existing untracked `docs/tasks/learn-improvements/README.md` was preserved.
