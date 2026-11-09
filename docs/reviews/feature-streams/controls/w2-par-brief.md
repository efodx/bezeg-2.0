# Wave 2 review: patches sweep, engineering, accessibility and mathematical meaning

`bezeg-reviewer`, read-only. Do not edit files. Report findings with `file:line`, severity (high, medium, low) and the expected behaviour.

**Diff:** commit `3c4be65e` in `.claude/worktrees/stream-controls` (`git show --stat 3c4be65e`, then `git show 3c4be65e -- <file>` by file). Read the committed version with `git show 3c4be65e:<path>`: another worker is temporarily mutating source files in the working tree for test evidence, so the working tree may differ.

**Sources:** briefs `w2-pa-common-brief.md`, `w2-pa1-brief.md`, `w2-pa2-brief.md`; evidence `w2-pa1.md`, `w2-pa2.md` (all in `docs/reviews/feature-streams/controls/`); spec `docs/specs/shared-graph-controls.md` sections *Likely exceptions* (three patch rows) and decisions 2, 4, 9, 10, 13, 14, 18, 38, 46, 48.

**Check:**
1. `PatchPointChooser`: works for all four call shapes; choosing an axis while none is selected fills the other axis sensibly; "none" on any axis clears; option values never collide with the empty value; labels name each axis in Slovenian and English.
2. `PatchPointEditor` (`PointListInput`, one row): commit on Enter or blur; an untouched axis keeps the exact unrounded value; an empty or non-finite draft is refused in the field hint; editors keyed by index only, so focus survives a commit and the shown values still update after a drag or lesson action changes the point; the new heading `point_coordinates_keyboard_editing` inside the editor is not a duplicate of the group heading; `pointLocked` still replaces the editor.
3. Starting-patch and Join scene selects: `startingPatchIndex` (Tensor, Triangular) and `joinSceneIndex` match exactly the starting nets (row/column layout of the flat preset net vs the 2-D state net), the "custom" entry appears only when nothing matches, choosing the shown entry does nothing, Presets and lesson actions that were valid at HEAD still load. Derivatives corner select: choosing a corner sets the same (u, v) the old buttons did; "not at a corner" is not selectable as an action or does nothing.
4. `SurfaceCameraPanel`: same ranges, steps, decimals and actions as the three old copies; height switch and help placement unchanged; `readOnly` capstone still hides them.
5. Unavailable and announcements: Subdivision Elevate states its reason (decision 13); Join alpha `unavailableReason`; Coons and Derivatives status lines have no live role and one settled `LiveReadout` each; no other `role="status"`/`aria-live` left on visible patch groups; no native `disabled`.
6. Degrees: `CountSetter` ranges equal the old option lists; a refused typed degree shows in the field hint only (decision 46).
7. Mathematical meaning: nets, degrees, evaluations, subdivision and join constructions unchanged.
8. Tests: each migrated graph has one thin wiring check; duplicate control-mechanics cases deleted; weak assertions flagged.
9. Localization: `sl.ts`/`en.ts` in lockstep; removed keys `apply_coordinates`, `enter_finite_numeric_coordinates` have no remaining caller; new keys `patch_starting_custom`, `patch_join_scene_custom`, `patch_derivatives_corner_none` read well in Slovenian.

**Checks you may run:** `just typecheck`, `just lint <paths>` only (the unit tests would run against a mutated tree). Log to `.command-logs/w2-par-*.log`.

**Return:** at most 400 words, findings ordered by severity; full list in `docs/reviews/feature-streams/controls/w2-par.md`.
