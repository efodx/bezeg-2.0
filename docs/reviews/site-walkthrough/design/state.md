# State: site walkthrough, design session (package C)

Rewritten 2026-11-14 by handler 1, after implementing the owner's picks.

## For the owner

**Ready to look at:** a production preview of the changed pages, <http://desktop-a0j72sv.tail2032db.ts.net:4332/bezeg-2.0/>.

| Look at | Where |
| --- | --- |
| Homepage: "Izbor demonstracij", six picture cards drawn per visit (reload for another six), second button to learning | `/bezeg-2.0/` |
| Chapter numbers everywhere and side botanicals (window at least 1600 px wide) | `/bezeg-2.0/learn/convexity-hulls`, `/bezeg-2.0/learn/bezier-curves` |
| Guided example Back button as an outline | `/bezeg-2.0/analysis/darboux?learn=1`, then Naprej |
| Presets panel: list of saved states, inline save, row menu, backup section | `/bezeg-2.0/analysis/darboux`, tab Shrani |

**Choices only you can make:** none. You confirmed on 2026-11-14, after seeing the preview, that the outline Back button stays and that the presets wording is fine as built ("Shranjena stanja" for the list, "prednastavitve" for the tab heading and the file buttons).

The mockup gallery is no longer served; its source and images are in `docs/reviews/site-walkthrough/design/` (`index.html`, `img/`).

## What is implemented

All picks recorded in `docs/specs/site-walkthrough-design.md` under "Owner decisions".

| Intake | Change | Commit on the branch |
| --- | --- | --- |
| L04 | Back button outline | `9ebdcc4a` |
| L01, L05 | Shared `ChapterSectionHeading`; contents numbers always on and hidden from assistive technology; botanicals on `/learn/<chapter>`; `side-botanicals.md` decision 16 | `7c09b9d1`, `83b0ee2c` |
| P01, P02 | Presets list panel, inline save, rename, overwrite, delete with inline confirmation, backup section; `PresetService.renamePreset` | `b6873cf0` |
| H02, H03 | Pool module `src/homeDemonstrationPool.ts`, per-visit draw, picture cards, no arrows or counter | `f17f31dd` |
| H02, H04 | Label key `demonstration_selection`; second button `all_learning_content` | `1f31fab4` |
| G07 | Passed to `graphs` and recorded | docs only |

Published on `master` as `a6dd7a97` on 2026-11-14 (fourth gate attempt); the CI browser smoke for that revision passed, so the changes are deployed. The commit ids in the table are the pre-rebase ids on this branch.

## Verification so far

- Unit: focused files per slice pass; `just typecheck` passes on the combined tree.
- Screenshots in `docs/reviews/site-walkthrough/design/shots/` (`shots.mjs`): home at 1440, 1024, 390; chapters at 2560, 1920, 1600 and 1280 (no decoration); lesson panel; presets panel at 310 px and phone. No horizontal overflow and no page errors.
- Browser smoke: the edited specs passed per test before the label rename (home, demonstration-motion, workflows, curve-ownership, the Farin guided lesson). A rerun of `home` and `demonstrations` after the rename was started; see `.command-logs/design-smoke-home.log`.

## Open

1. The objective's shipped part is complete; what follows are follow-ups, none needing an owner choice.
2. Not covered: no browser spec drives preset rename, overwrite or delete (unit tests do); the controls sweep `ragged-buttons` detector was not run on the new panel; the "fits the target widths" home smoke test was not rerun locally.
3. `src/graphs/base/ResetButton.tsx` is unused after the presets change; remove it or reuse it.
4. Any single-segment `/learn/<unknown>` path also shows the botanicals beside the error page.
5. `convexity` can join the homepage pool once G06 is fixed; the pool is one list.
6. The import and figure-batch dialogs keep their old style, and the figure batch was not moved beside the image export.

## Next: follow-ups the owner asked to continue (2026-11-14), for handler 2

Handler 1 reached its context budget and hands these over. None needs an owner choice. Suggested slices, smallest first:

1. Remove the unused `src/graphs/base/ResetButton.tsx` (confirm with Grep that nothing imports it, including tests and fixtures).
2. Botanicals only on real chapters: `showsSideBotanicals` in `src/sideBotanicals/SideBotanicals.tsx` accepts any `/bezeg-2.0/learn/<segment>`. Either the chapter page that renders the error state omits `data-content-column` (the decoration then measures no column and renders nothing, with no chapter list in the main bundle), or the route check gets the chapter ids. Prefer the first; add a test.
3. Browser smoke for the preset row actions: rename, overwrite and delete with inline confirmation, in `tests/workflows.smoke.spec.cjs` beside the save test. Selectors: `li[data-preset-id]`, `button.preset-row-select`, `button.preset-row-menu`, `.preset-rename-input`, `.preset-confirm-cancel`. Tell the worker to lint `tests/`.
4. Controls sweep on the new panel: `node scripts/controls-sweep/sweep.cjs --port <dev port> --workers 3` (see `docs/controls.md`); the `ragged-buttons` detector is the one to watch. Fix what it reports.
5. Import and figure-batch dialogs in the site's style (gallery option P01 A shows the look: `img/p01-a-restyled-dialog.png`), and move the figure-batch button beside the image export in the same tab (`BaseGraph.tsx` renders `SaveImage` under `export_figure`). These are the remaining parts of the owner-approved P02 proposal; record them in the spec's acceptance section when done.
6. `convexity` joins `src/homeDemonstrationPool.ts` only after the `graphs` session fixes G06; check its state note, do not wait on it.

Lessons from this run: a change to `BaseGraph.tsx` makes the publish gate select most unit tests, and the gate queues for a test slot (hours when other sessions publish), so batch slices into one gate. Workers must lint every file they edit, including `tests/`, and Grep other tests for names and roles they change.

## Running processes

- `just preview 4332` serves the build of this tree; `tailscale serve --http=4332` publishes it. Rebuild with `just build` after further changes.
- This worktree's `node_modules` is a junction to the main checkout's.

## Session rule

The owner chooses design options; the handler does not implement a design choice ahead of his pick. Routine engineering choices inside a picked option stay with the handler. No successor is launched while the work waits on the owner.
