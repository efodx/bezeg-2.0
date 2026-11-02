# PS-A-2a: `prob-density` graph (lesson P1), evidence

Source: [task plan](../../tasks/probability-statistics/README.md), [spec P1](../../specs/probability-statistics-lessons.md#p1-density-and-probability-as-area-gostota-in-verjetnost-kot-ploščina). Date 2026-11-02, curves handler 27. Not registered: no route, catalog entry, `graphFactories` entry or lesson. Only the Preset collection key `prob-density` is new (listed in `PENDING_ROUTE_KEYS` of `PresetCatalog.test.tsx`).

## Files

- `src/analysis/densityAreaModel.ts` (+ `.test.ts`, 40 tests): model `{mu, sigma, a, b}`, check/parse/edit rules (issues are data), `densityAreaView` (probability from `normalProbability`, \(z_a\), \(z_b\), interval kind), `densityAreaFill` (one closed polygon), `fitDensityView`. All mathematics comes from `distributions.ts` (PS-1a); `FUNCTION_IDS` is untouched.
- `src/graphs/functions/DensityAreaGraph.tsx` (extends `BaseFunctionGraph`), `densityAreaMessages.ts`, `DensityAreaGraph.host.test.tsx` (25 tests).
- `functionPresetCollections.ts`: `prob-density` with a diagnosis built on `checkDensityAreaModel` (flat numbers, so the catalog's export→import contract needs no custom `checkGraphState`; a host test passes the exported `graphState` through it).
- `sl.ts`, `en.ts`: 31 `prob_density_*` keys in lockstep.

## Decisions

- Limits: \(\mu\in[-200,200]\), \(\sigma\in[0{,}1;\,20]\), \(a,b\in[-400,400]\) absolute (\(400=200+10\cdot20\)), so changing \(\mu\) or \(\sigma\) never invalidates a stored bound. Import rejects with the field and the limit; nothing is clamped. A drag snaps to 0.01; a typed value is stored as typed.
- \(a>b\): empty interval, probability 0, status text, nothing drawn. \(a=b\): probability 0 and a status that a single value has probability 0. Thin: narrower than 2 % of \(\sigma\).
- The fill is one closed polygon of 240 trapezoid strips over \([a,b]\cap[\mu-10\sigma,\mu+10\sigma]\): the object count does not depend on the data.
- Example select (N(0; 1) with \(a=-1,b=1\); N(100; 15) with \(a=85,b=130\); "custom") and a fit-view button (\(\mu\pm4\sigma\)). The view does not follow slider drags.
- No lesson parameters yet: the lesson slice (PS-A-3) must extend the closed lesson parameter names with \(\mu\), \(\sigma\) and decide whether a fit-view lesson action is needed.

## Mutation checks (worker; observed failing, then restored)

Tail via CDF difference (1 fail), drag step 0.1 (1), thin fraction 0.2 (2), no \(\pm10\sigma\) cut (1), \(\sigma=0\) accepted (7), check ignores \(b\) (4), \(a>b\) misclassified (3), no scene sync (3), \(z\) with \(\sigma^2\) (3), fit view \(\pm3\sigma\) (4).

## Review

Sonnet `bezeg-reviewer` (engineering, UI, spec P1): no blocking findings. Ownership and disposal, state mirrors, constant fill count, Preset conventions, typed localization, decimal commas and P1 acceptance 1–4 and 6 confirmed with named tests. Handler fixes:

- The status is now a persistent `role="status" aria-live="polite"` container, as in the sibling graphs, asserted in the host test.
- P1 acceptance 5: the note now says that 68,27 / 95,45 / 99,73 % is a known property of the normal law (by standardization), which dragging only illustrates.
- The second area row is labelled "the same area as a share of the whole".
- The Slovenian "a je večji od b" became "meja a je večja od meje b" (and the English matches).

The reviewer's point that \(k=2,3\) are not asserted was wrong (`densityAreaModel.test.ts`, `test.each` for \(k=1,2,3\)). The `erf` agreement over \([-6,6]\) belongs to the PS-1a kernel tests (reference values at 0.1–6 and a sweep over \([-6,6]\)).

## Checks

On `da1877d3` plus the diff: `npx tsc --noEmit --pretty false`, `just lint src/graphs src/analysis`, `just unit src/graphs/base/presets src/graphs/functions src/analysis src/localization` (141 s; before the review fixes), `just build`. After the fixes: `just unit` on the two density test files, `src/localization` and `src/graphs/base/presets`, tsc, lint and build again: all passed.

## Gaps

- No browser check until registration (PS-A-2b).
- Drag performance is not measured; the 240-strip fill is the same order of size as `DefiniteIntegralGraph`.
