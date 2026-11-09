# w2-p handoff (partial, budget signal)

State: all five projective panels are migrated; lint of `src/graphs/projective` and `eslint.config.mjs` passed; `just unit src/graphs/projective` passed 225 tests before the last two test additions. After them the FivePoint and ThreeViews host test files were run: ThreeViews passes (12). The FivePoint file (new out-of-range test, which asserts a message matching `/območj|med/i`) was not re-run after the fix to the ThreeViews label; rerun it. Typecheck showed only other workers' errors, none in projective (run before the last test additions).

Done:
- Controls: CrossRatio (two PointListInput, integer, selectable), FivePoint (ChoiceSelect x4, BooleanField checkbox, PointListInput grid 1/15), PolePolar (ChoiceSelect example, conic, finite/ideal; PointListInput; zero direction refused with a message), Pascal (ChoiceSelect x3, SelectablePointButton, per-row `data-pascal-index` readout "Indeks v tabeli: N"), ThreeViews (Slider x2, BooleanField).
- Removed the 4 projective files from `controlExemptions`. Localization in sl/en: added `projective_point_named`, `*_points_*`, `projective_k3_direction_title/point_title/direction_zero`, `projective_k2_table_index/order_custom`, `projective_three_views_slider_rejected/angle_unavailable/angle_rejected`; removed unused coordinate, direction, `k1_select` and `angle_value` keys; changed `slider_label` to "(c)".
- Tests: new `src/graphs/projective/controlsTest.ts` (chooseOption, typeNumber); Lesson and Graph host tests updated to selects and lists (field names are now "Točka A, x", "P, x", "P, dx").

Not done / unverified:
- Evidence file `w2-p.md` not written; no mutation or pre-change failure evidence recorded beyond: the pre-change code fails the new Pascal readout test (no `data-pascal-index`) and the PolePolar off-grid test (1.23 was ignored before, now rounded to 1.2) by construction, not observed.
- Test-time delta: before 63.9 s (17 files, 242 tests); after about 73 s under load (225 tests), not comparable.
- Not run: lint after the last test edits, full projective unit rerun, smoke, English check beyond the existing language-switch tests.

Proposals for the handler:
- `Slider` has no `unavailableReason`; the ThreeViews angle slider uses native `disabled` plus `help` stating the reason. Smallest change: an `unavailableReason` prop like `NumberInput`'s.
- `Slider` aria-valuetext lost "°" and "c =" (the unit is in the label). Rejected alternative: `formatValue`, which removes the exact field.
- Off-step typed values on the ThreeViews sliders are refused with a hint (Slider has no `grid`), which differs from decision 8 (snap with notice).
- Pascal readout shows the raw 0-based table index on every row, not only the selected one.
