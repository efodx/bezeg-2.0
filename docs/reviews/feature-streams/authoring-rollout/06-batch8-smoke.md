# Batch 8 smoke: curve-geometry family registration

Production build from `8ba679bb` (clean; `8ba679bb` is HEAD and descends from `5947d7b3`, the local curve-geometry registration commit named in the brief). Command: `just build` (log `.command-logs/batch8-build.log`, provenance log `.command-logs/2026-11-12T11-28-27-313Z-7368-6d60e767.log`). The build passed (`exit=0`); its warnings are the existing Sass deprecation notices, unrelated to this change. Then `just smoke-built --port 4331 --workers=2 --grep "$G"`. The grep is saved in `.command-logs/batch8-grep.txt`:

`(^| )(curve-parametric|curve-curvature|curve-comb|curve-evolute|curve-offset|curve-envelope)( |$)|the catalogue shows every demonstration|catalog filters combine|generated preview mapping and provenance`

Wrapper log: `.command-logs/batch8-smoke.log` (`smoke-built: passed in 33.4s`, `exit=0`). Playwright run log: `.command-logs/2026-11-12T11-28-38-153Z-5956-0c5eb2d0.log` (`21 passed`, no failed, skipped, or flaky lines). The build was reused from the same clean revision. The preview was the harness-owned production preview on `http://127.0.0.1:4331/bezeg-2.0`.

Registered paths checked (from `src/graphs/curves/geometry/registration.ts`): `curve-parametric` `/bezeg-2.0/curve-geometry/parametric`, `curve-curvature` `/bezeg-2.0/curve-geometry/curvature`, `curve-comb` `/bezeg-2.0/curve-geometry/comb`, `curve-evolute` `/bezeg-2.0/curve-geometry/evolute`, `curve-offset` `/bezeg-2.0/curve-geometry/offset`, `curve-envelope` `/bezeg-2.0/curve-geometry/envelope`.

Result: 21 passed, 0 failed, 0 skipped, 0 flaky. The run log contains no failure lines.

Selected rows (21 total):
- Catalog (3): "the catalogue shows every demonstration in teaching order...", "generated preview mapping and provenance...", "catalog filters combine topic and forgiving search...". All pass.
- Demonstrations (6): `curve-parametric`, `curve-curvature`, `curve-comb`, `curve-evolute`, `curve-offset`, `curve-envelope` each render heading, graph and inspector. All pass.
- Lesson walks (12): Slovenian `?learn=1` walk (pointer clicks on Next, completes) and English 390x844 walk (points in view, math inside viewport, Next pointer-click) for each of the six IDs. All pass.

Unrelated rows: none selected. The anchored regex matched only the six IDs and the three catalog rows; `curve-kinematics` and `mechanics-descent` were not run as rows.

Order check (curve-geometry family, six IDs before `curve-kinematics` and `mechanics-descent`): result PASS on source evidence, with the catalog test as a runtime consistency check.
- Source: `src/demonstrations.ts` line 135 spreads `...curveGeometryDemonstrationRows` before `...kinematicsDemonstrationRows` and `...mechanicsDemonstrationRows`. The `definitions` array sets the within-family order, and the catalog builds each family with `demonstrations.filter(entry => entry.family === family.id)`, which preserves that order. `curve-kinematics` (`src/graphs/curves/kinematics/registration.ts`) and `mechanics-descent` (`src/graphs/mechanics/registration.ts`) both use family `/bezeg-2.0/curve-geometry`, the same family as the six IDs (`src/demonstrations.ts` line 37).
- Runtime: the catalog test (`tests/demonstrations.smoke.spec.cjs` line 76) asserts that rendered card titles equal `catalogEntries` (families flattened in order) and it passed. This confirms rendered order matches the composed order. The test does not assert specific IDs, so the ID-level ordering comes from the source reading, not from a runtime assertion.

Not covered:
- Lesson exit for any of the six IDs (`Lesson <id> exit` tests were not selected, per the brief's grep).
- Preset import/export of the six curve-geometry collections (`src/graphs/curves/geometry/collections.ts`). No harness row was selected for them. Import behaviour is covered only by unit tests, if any exist for this family.
- Preset UI on the six routes: no harness check was run.
- Console and page errors on the demonstration rows: the demonstration tests do not capture them, so those rows establish render only. Lesson walks fail on runtime errors, and they passed.
- Drag or slider interaction on these routes; only route load, render and lesson walks ran.
- Catalog controls at 390, 724 and 1440 px (`catalog controls remain readable...`) and the other catalog tests (topic history, deep links, card-back restore) were not selected.
- The `curve-kinematics` and `mechanics-descent` rows themselves were not smoked; only their order relative to the six IDs was checked.
- No diff-level comparison against pre-registration behaviour was made.
