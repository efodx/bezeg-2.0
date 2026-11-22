# Brief: classify every bounding-box write (task 01b, slice 1)

Handoff-v13. Role: `bezeg-worker`, Sonnet medium. Read-only on `src/`; you write one file.

## Goal

Source: `docs/tasks/ux-picks-app-wide/01b-view-adapter.md` slice 1; background in `docs/reviews/ux-picks/view-fit.md` (skim the headings only). The handler will decide one rule per class from your table, so the table must be complete and each row's class justified by the code, not guessed from names.

Find every call that sets a JSXGraph board's view in `src/` (not tests): `setBoundingBox(`, plus any `zoomIn`/`zoomOut`/`zoom100`/`zoomElements`/`moveOrigin`/`setZoom` or a direct `board.keepaspectratio`/`boundingBox` assignment if present (report those separately). Count them first by search; the task file says about 149 `setBoundingBox(` sites in 81 files on master.

For each site: file:line, enclosing function or method, which board (main board, a secondary board such as a hodograph, a thumbnail or export board), and one class:

- `initial`: first view of a new board or mount;
- `follows-parameter`: inside a parameter or example setter, or code a setter calls (name the setter);
- `reset`: Reset or default-scene reload;
- `preset`: Preset select, import or restore (incl. `importBoardState`);
- `lesson`: a lesson scene, checkpoint restore or lesson view (`applyLessonView`, `restoreLessonState`);
- `fit`: fit-to-points or a fit/"show all" button;
- `resize`: a container resize or aspect correction;
- `export`: figure export or capture;
- `other`: anything else, with one line saying what it is.

When one helper sets the view for many callers (for example a shared fit function), list the helper once and list its callers by class underneath.

## Output

`docs/reviews/ux-picks-app-wide/view-sites.md`: a short summary first (counts per class and per board kind, helpers that funnel many callers, anything surprising), then the table grouped by file. Keep it factual.

## Rules

Edit nothing else. Never create, remove or modify a worktree or `node_modules`. Send independent searches and reads in one message; read by line range. Create the file with Write.

## Return (at most 300 words)

The counts per class, the funnelling helpers with `file:line`, the `other` rows, and anything that contradicts the task file's description of master. Handoff note if stopped early: `docs/reviews/ux-picks-app-wide/notes/01b-view-sites.md`.
