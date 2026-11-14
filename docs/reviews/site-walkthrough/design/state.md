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

**Choices only you can make:** none blocking. Two things to say if you disagree:

1. Presets wording: the list is headed "Shranjena stanja" while the tab heading and the file buttons keep "prednastavitve". Say if you want one word throughout.
2. The Back button outline looks almost the same as before, because the lesson panel is nearly white. The sage tint (option B in the gallery) is the visible alternative.

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

Publish: one background gate for the six commits (`publish-1f31fab4-19de20`), started 2026-11-14. Check `just publish --status`; the previous gate for the first two slices failed on `LearningPage.test.tsx` (contents link names), fixed by `83b0ee2c`.

## Verification so far

- Unit: focused files per slice pass; `just typecheck` passes on the combined tree.
- Screenshots in `docs/reviews/site-walkthrough/design/shots/` (`shots.mjs`): home at 1440, 1024, 390; chapters at 2560, 1920, 1600 and 1280 (no decoration); lesson panel; presets panel at 310 px and phone. No horizontal overflow and no page errors.
- Browser smoke: the edited specs passed per test before the label rename (home, demonstration-motion, workflows, curve-ownership, the Farin guided lesson). A rerun of `home` and `demonstrations` after the rename was started; see `.command-logs/design-smoke-home.log`.

## Open

1. Confirm the publish result and the CI run (`just ci <sha>`); CI runs the whole browser smoke.
2. Not covered: no browser spec drives preset rename, overwrite or delete (unit tests do); the controls sweep `ragged-buttons` detector was not run on the new panel; the "fits the target widths" home smoke test was not rerun locally.
3. `src/graphs/base/ResetButton.tsx` is unused after the presets change; remove it or reuse it.
4. Any single-segment `/learn/<unknown>` path also shows the botanicals beside the error page.
5. `convexity` can join the homepage pool once G06 is fixed; the pool is one list.
6. Evaluation entries for the four worker dispatches are not yet written.

## Running processes

- `just preview 4332` serves the build of this tree; `tailscale serve --http=4332` publishes it. Rebuild with `just build` after further changes.
- This worktree's `node_modules` is a junction to the main checkout's.

## Session rule

The owner chooses design options; the handler does not implement a design choice ahead of his pick. Routine engineering choices inside a picked option stay with the handler. No successor is launched while the work waits on the owner.
