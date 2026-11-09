# Wave 2 slice K2: B-spline panels

Read `w2-fc-common-brief.md` first; it holds role, scope limits, shared files, test rules, checks and return format. Read `w2-k1.md` (slice K1's evidence) for the typed-path findings and any `CountSetter` addition.

**Owned:** `src/graphs/curves/bspline/**` (Basis, Blossom, Extraction, Insertion, Nurbs, DeBoor graphs and scenes, `KnotEditor.tsx`, models) and their tests. Nobody else edits these this round. Do not edit `src/inputs/**` or `src/graphs/base/**`.

**Work (inventory rows 87–93; typed paths 179–184):**
- **Degree choosers (C26, decision 10).** The degree `ChoiceSelect`s in Basis, Blossom and DeBoor become `CountSetter` with `onSet`, the same range and the same refusals. Blossom's offered degrees depend on the point count (degree ≤ points − 1, degrees 2 and 3): the unavailable step states why (the `CountSetter` limit reason). Lesson actions that set the degree must still work.
- **Local Reset (C9).** Blossom's "Back to the default" goes (task 0 decision 1); the host Reset gives the default. Extraction, Insertion and Nurbs "Back to the example" is the listed exception "Reset example": give the three one label and one key, the same as Voronoi's (`vor_example_reset`, "Reset example" / Slovenian as in `sl.ts`); move the key to a shared name only if that is the repository's pattern for shared labels, else reuse a new `bsp_example_reset` with the same text and say why. DeBoor's level Reset is already the playback Reset.
- **Readouts and notices (C21, C22).** Basis's `role="status"` readout becomes the graph's one `LiveReadout` (`useStatusReadout`/`StatusLive` in `src/graphs/base/controls/`; use `settled` because knot drags change it every frame); its `role="alert"` notice, Insertion's and Nurbs's `role="alert"` refusals go through a `RefusalChannel` per graph and the shared `guard` (`src/graphs/base/controls/guard.ts`; precedent: `BaseFunctionGraph.refusals`, decision 17). DeBoor's `role=status aria-live` status becomes its `LiveReadout`, muted while playing. Typed-field checks stay in the field hint (decision 14).
- **Typed point paths (task 0 decision 4).** Blossom, Extraction, Insertion, Nurbs and DeBoor have draggable control points with no typed path. Give each the shared point list (`PointListInput`, task 2 decision 29) for coordinates, editing only, with no add or remove unless the board already offers it; typed values outside ±10⁶ refused (decision 30). Follow what K1 found about the curve workspace list. If a scene's model cannot take a typed point without a model change, stop for that board and report.
- **Knot editor.** It stays a listed exception (C4). Check only that its fields refuse with the stated range and that a knot-marker drag refused by a mathematical rule states its reason (decision 17); report gaps rather than rewriting it.

**Lessons:** B-spline lessons set degree, knots, weights and examples; run their lesson unit tests.

**Evidence file:** `w2-k2.md`. **Handoff note:** `w2-k2-handoff.md`.
