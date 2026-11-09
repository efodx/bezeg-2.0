# Wave 3 slice D1 brief: reveal button, Linear map switches, angle slider

Read `w3-common-brief.md` first (it reuses `w2-pa-common-brief.md` by section). Slice id for logs and evidence: `d1`.

## Rows (from `w3-triage.md`)

C11-01 (18 buttons in 15 files), C11-02, C13-01, and C13-03 (survey only): decisions 59 and 60.

## Owned paths

- New `src/inputs/RevealButton.tsx` and its test (shared control owner for this wave); `src/inputs/Slider.tsx` only to add an exported angle preset (or a new `src/inputs/AngleSlider.tsx`, your choice; record why).
- The 15 files of C11-01 (complex, functions and the rest listed in the triage row), `src/graphs/linear/LinearMapGraph.tsx`, `src/graphs/compgeo/SimsonLinePanel.tsx`, `InversionPanel.tsx`, `InscribedAnglePanel.tsx`, and tests beside them; `sl.ts`/`en.ts` shared (common brief).

The other worker (slice P1) owns `src/graphs/base/controls/PlaybackButtons*` and the De Casteljau, arc length and parametric curve graphs. Do not touch those.

## Work

1. `RevealButton` per decision 59: props `revealed`, `showLabel`, `hideLabel`, `onToggle`, `action` (rendered as `data-action`), renders `data-revealed`, no `aria-pressed`; it uses the same button styling the reveal buttons have today. Test: label swap, `data-revealed`, `onToggle`, no `aria-pressed`.
2. Replace all 18 raw reveal buttons with it. Labels, `data-action` values, group wrappers and model setters stay as they are. Before you start, confirm the 18 by `grep -rn 'data-revealed' src --include=*.tsx`; add any the triage missed and list them.
3. Linear map probe, curve and square toggles (`LinearMapGraph.tsx:382-384`) become `OnOffSwitch`es (display settings, decision 59). Keep their model fields and any lesson actions that set them.
4. Angle slider per decision 60 for the three compgeo panels; behaviour identical (same min, max, step, big step, cyclic, decimals, field decimals).
5. C13-03: check whether the BinomialNormal exact field is already a `Slider` with its optional exact field; record the answer in your evidence file, change nothing there.

## Accepted visible changes

None expected except the Linear map toggles' switch look. List any other in your return.

## Checks

Beyond the common checks: `just unit` on the touched graphs' tests and the function, complex and linear lesson tests that click reveal buttons (find them with `grep -rl 'toggle-' src --include=*.test.tsx` and the lesson action names). If an e2e test under `tests/` or `e2e/` locates a reveal button by role and `pressed`, name it (do not run it).
