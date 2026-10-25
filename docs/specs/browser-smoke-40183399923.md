# Browser smoke run 40183399923 repair

## Scope

Repair the three failures in [the failed job](https://github.com/efodx/bezeg-2.0/actions/runs/40183399923/job/121139012401), based on `28d27da`. Preserve routes, Presets, mathematical behavior, existing assertions and unrelated working-tree changes.

## Acceptance

- Rational/base and Bézier/decasteljau editing checks add a real point, drag that same point, then delete it, verifying board geometry after each action. Determine whether the failure is interaction behavior or test targeting before changing it.
- Taylor lesson reading at 320px and 200% text size stays within the document width in Slovenian and English. Header/footer actions retain usable targets, text and pointer access. Fix actual overflow rather than hiding it at the document root.
- Preserve existing lesson navigation, scene ownership and hide/exit behavior, under the lesson experience and curve editing mode specifications.
- Capture failing evidence before the repair (including repeated execution or a deterministic trigger for intermittent behavior), then pass focused repetitions, relevant unit/type checks and the production build. Run the required browser smoke checks and record coverage limits.

## Initial evidence

CI: rational/base point count was 13 after deletion instead of 12; both small-enlarged lesson checks reported document overflow. All four selected local scenarios passed once on the unchanged production build, so the failures require timing/environment investigation before a repair.

## Repair and evidence

- The original curve test subsequently failed on both routes. It reused the requested drag destination as the deletion target. The repaired test tracks the added board point by ID, checks that it moved, recomputes its current screen coordinates before each interaction, checks that the same point was removed, and retains the final board-point-count assertion. Six consecutive focused runs passed before integration.
- The unchanged mobile inspector uses a fixed 64px title reservation beside an absolutely positioned collapse action. At 320px and 200% text the new non-overlap assertion failed: title bounds x29–291 overlapped button bounds x203–297. The mobile override places the action in normal flow below the title. The original document-width assertion remains, with element metrics on failure; no root overflow clipping is added.
- `just check` on the integrated source with `npm ci` dependencies passed TypeScript, ESLint, all 166 unit files / 3,429 tests, and the production build. Existing build warnings remain. Logs are local under `.command-logs/`.
- The original CI document-width failure itself did not reproduce locally: Windows Chromium reported 320px document width. The heading collision reproduced independently and is fixed; Linux CI must confirm the original width failure is resolved.
- A temporary forced-scroll curve probe also failed and was removed from the final test. Its cause was not classified; the repair does not establish support for every arbitrary scroll timing. No mathematical implementation, routes or stored Presets changed.
- Integrated production Chromium suite: all 276 tests passed, including both curve-editing cases, both 320px/200% reading cases, shared lesson runtime, navigation, persistence and route checks (`just smoke-built --port 4399 --workers=4`, 10.6 minutes). The handler reviewed the small diff; mathematical implementation is unchanged.
- The four affected cases passed three repetitions (12 executions). A corrected handler Playwright check at 320px/200% in both languages verified actual pointer collapse/reopen of `#inspector-content`, 320px document width before/after, no header overlap, targets over 44px, and no page/console errors. Both rendered header captures were inspected. The worker's first custom checker incorrectly expected tabs to hide; that expectation was corrected to the component's content region before accepting the check.
