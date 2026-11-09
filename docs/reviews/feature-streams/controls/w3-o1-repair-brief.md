# Wave 3 O1 repair brief (handoff-v13)

Read `w3-common-brief.md` (it reuses `w2-pa-common-brief.md` by section). Slice id: `o1r`. Findings: `w3-review-o1.md` in this folder; the slice's matrix is in `w3-o1.md`. Owned: `src/graphs/base/controls/BezierCurveControls.tsx`, `CurveOperationPanel.test.tsx`, `src/graphs/base/DemonstrationWorkspace.css` (only the `.operation-group` rules), `sl.ts`/`en.ts` (Edit tool only, for item 5). Another worker (R1f) edits compgeo files and new readout parts in `src/graphs/base/controls/`; do not touch those. Record an observed failure for each new assertion in `w3-o1r.md`.

1. **Scheme hidden by cleanup (medium, :88-99):** `useCurvePreviews`' cleanup must hide only previews this hook showed; a De Casteljau scheme shown by a lesson or the user (and the `permanentPreview` command rows that never turned one on) stays. Test: show the scheme from outside, unmount the panel, the scheme is still shown.
2. **Stale `shrinkT` (:79):** reset it on a curve switch in the `[curve]` effect. Test.
3. **Shorten end parameter (matrix row P2):** restore the shared adapter `subdivisionT` as Shorten's end parameter, as before the slice, so a Preset's `subdivisionT` sets it again. Test with a Preset/restore of `subdivisionT`.
4. **Weak Apply test (medium):** replace "the apply button clears a pressed preview" with one that fails without `previews?.clear()` (render `CurveOperation` directly with a no-op `onApplied`, press Preview then Apply, assert `aria-pressed="false"` and the preview hidden, or a spy ordering `hide` before the operation).
5. **Collapsed disclosure keeps its preview (UI low):** closing an operation's disclosure clears that operation's pressed preview. Align the Slovenian terms: the preview label uses the same verb as the action ("Skrči" → "Predogled krčenja" or the action's noun; check `docs/localization.md#choosing-new-terms`), and the English pair likewise.
6. **Dead CSS:** delete the unused `.operation-group` rules in `DemonstrationWorkspace.css` (about lines 80, 163, 164, 348) after `grep -rn "operation-group" src tests` confirms no use.

Checks: `just typecheck`, `just lint` on touched files, `just unit src/graphs/base/controls src/graphs/curves`. Return ≤200 words.
