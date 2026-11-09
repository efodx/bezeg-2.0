# Wave 2 slice PA2: surface camera panel, subdivision, join, triangular, derivatives

Read `w2-pa-common-brief.md` first; it holds role, scope limits, shared files, test rules, checks and return format.

**Owned:** new `src/graphs/patches/SurfaceCameraPanel.tsx` with its test; the camera group of `TensorPatchDisplayPanel` in `TensorPatchPanels.tsx` (lines about 190–206, plus the helpers `radToDeg`, `azimuthDegrees`, `MAX_ELEVATION_DEGREES` that move to the new file); worker PA1 edits the rest of that file at the same time: re-read before each edit and touch only your region. In `CoonsPatchPanels.tsx` and `TriangularPatchPanels.tsx`: the camera groups, and in Triangular also the degree select and the starting-patch row; not their index selects or `PointEditor` (the next slice). `TensorSubdivisionPanels.tsx`, `TensorDerivativesPanels.tsx`, `TensorJoinPanels.tsx` except its B-point chooser and `PointEditor` block (lines about 95–120). Their graphs and test files where the controls you change are read.

**Work (inventory rows TensorSubdivision, TensorJoin, CoonsPatch, TriangularPatch, TensorDerivatives; listed exceptions "Surface camera panel with Reset view", "TensorJoin Back to the two patches"):**
- **One camera panel (C20 exception).** `SurfaceCameraPanel` replaces the three copies: the four camera preset buttons, Reset view, azimuth and elevation `Slider`s with the same ranges, steps and decimals, plus an optional extra slot (TensorPatch's height-drag switch and help stay in its group, after the sliders, as now; `readOnly` still hides them). Same keys, same actions; a test of the panel and one real-graph case.
- **Degrees (decision 10).** Triangular's `DEGREES` select and Join's B-degree selects → `CountSetter` with the same ranges.
- **Starting patch and scene rows (decision 4).** Triangular's starting-patch `Button` row and Join's scene `Button` row → `ChoiceSelect`, with decision 38's "custom" entry while the model matches no example (if the row selects a scene or mode rather than an example, apply decision 9 and say which). Join's "Back to the two patches" stays a button (listed exception: it leaves the capstone mode).
- **Subdivision Elevate (C6, decision 13).** Native `disabled` with a `role=status` help → `UnavailableButton` with the reason.
- **Derivatives.** The corner button group → `ChoiceSelect` per decision 9 unless the chosen corner must stay visible as a pressed group (then keep it and say why); the `role=status` degeneracy line → decision 18/48 pattern (visible text, one `LiveReadout` if it must be announced).

**Lessons:** `patchChapterJoinsTriangular.ts`, `coonsGuidedLessons.ts` and `patchChapter.ts` may quote the buttons you change; list each text you update.

**Evidence file:** `w2-pa2.md`. **Handoff note:** `w2-pa2-handoff.md` (both in `docs/reviews/feature-streams/controls/`).
