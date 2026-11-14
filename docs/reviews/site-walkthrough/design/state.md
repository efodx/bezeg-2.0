# State: site walkthrough, design session (package C)

Rewritten 2026-11-14 by handler 2, after the follow-ups to the owner's picks.

## For the owner

**Ready to look at:** a production preview of the changed pages, <http://desktop-a0j72sv.tail2032db.ts.net:4332/bezeg-2.0/>.

| Look at | Where |
| --- | --- |
| Homepage: "Izbor demonstracij", six picture cards drawn per visit (reload for another six), second button to learning | `/bezeg-2.0/` |
| Chapter numbers everywhere and side botanicals (window at least 1600 px wide) | `/bezeg-2.0/learn/convexity-hulls`, `/bezeg-2.0/learn/bezier-curves` |
| Guided example Back button as an outline | `/bezeg-2.0/analysis/darboux?learn=1`, then Naprej |
| Presets panel: list of saved states, inline save, row menu, backup section | `/bezeg-2.0/analysis/darboux`, tab Shrani |
| New in the follow-ups: "Uvozi prednastavitve" and "Generiraj slike za prednastavitve" open dialogs in the site's style; the second button now sits under "Izvoz slike", below SVG and PNG | same tab |

**Choices only you can make:** none; nothing waits on you. You confirmed on 2026-11-14, after seeing the preview, that the outline Back button stays and that the presets wording is fine as built ("Shranjena stanja" for the list, "prednastavitve" for the tab heading and the file buttons).

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
| P02 | Unused `ResetButton` removed; `convexity` in the homepage pool (G06 is fixed); test that unknown `/learn/<segment>` paths get no botanicals (the error page has no marked column, so no code change was needed) | `fa878aff` |
| P02 | Browser smoke for preset rename, overwrite and delete with inline confirmation | `4f171d54` |
| P01, P02 | Import and figure-batch dialogs share the `bezeg-dialog` style; figure-batch dialog in `src/graphs/base/PresetFigureBatchDialog.tsx`, its button in the image export group | `a93a664c` |

The first batch is on `master` as `a6dd7a97`; the follow-ups were published as `513a0c22` on 2026-11-14 (first gate attempt, about 17 minutes). The commit ids in the table are the pre-rebase ids on this branch. Check CI for the follow-ups with `just ci 513a0c22`.

## Verification

- First batch: as recorded in the spec's acceptance section; CI browser smoke passed for `a6dd7a97`.
- Follow-ups: focused unit files, typecheck, full lint, build; `tests/home.smoke.spec.cjs` and `tests/workflows.smoke.spec.cjs` on the committed build (8 passed); controls sweep on 9 routes (`darboux`, `bezier/curve`, patches) with 0 hits, `ragged-buttons` included; screenshots in `shots/` (`dialog-*.png`, `panel-export-*.png`) viewed by the handler at 1440, 390 and 310 px.
- Not covered: surface-view routes were not opened in a browser after the button move (a unit test on the tensor patch covers its place); rename validation errors and keyboard-only use of the row menu are not driven in the browser; the sweep ran with no saved presets in the list.

## Open

Nothing is queued. The six follow-ups of 2026-11-14 are done and the package's objective is complete. Two observations, neither asked for:

1. "Izvozi prednastavitve" and "Uvozi prednastavitve" wrap to two lines at inspector width (310 px); they did before this work.
2. The file field in the import dialog shows the browser's own "Choose File" text, which follows the browser language, not the app's.

## Lessons

A change to `BaseGraph.tsx` makes the publish gate select most unit tests; batch slices into one gate. `smoke-built` needs `build/` to match the sources, so a worker that runs it cannot share the tree with a worker editing `src/`: run them in sequence. Workers lint every file they edit, including `tests/`, and Grep other tests for names and roles they change.

## Running processes

- `just preview 4332` serves the build of this tree; `tailscale serve --http=4332` publishes it. Rebuild with `just build` after further changes.
- This worktree's `node_modules` is a junction to the main checkout's.

## Session rule

The owner chooses design options; the handler does not implement a design choice ahead of his pick. Routine engineering choices inside a picked option stay with the handler. No successor is launched while the work waits on the owner.
