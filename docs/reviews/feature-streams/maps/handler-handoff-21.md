# Maps stream: handler handoff 21 (closing)

Written 2026-11-02 by handler 21 (Opus 5.5, `auto`, effort `medium`), continuing [handoff 20](handler-handoff-20.md). `Run state: complete`. No successor is launched.

## Done this session (all on `master`)

- **08 F3+F4** (`560a3024`, rebased): lesson T5 `inversion`, chapter section, lesson action kind `inversion`. Both optional review items applied (record check on `set-x`, Slovenian connector). The "Inversion extras" smoke now hides the instructions first: the tools panel is inert while lesson text is shown. Rebase conflicts with `quadrature`, the least-squares lesson and the projective K4/K5 ids were mechanical (opt-out lists, chapter reference count 98, preview copy counts 84/91).
- **08 F5** (`697739a9`): `inversion` poster recipe (example "circle not through the centre"). The recipe evidence now records JSXGraph circles. The example and focus selects got an `aria-label`.
- **08 F6**: tsc, full `just lint` and `just unit`, `just build`, `just smoke-lesson inversion`, and a Sonnet browser smoke ([brief](../../triangle-geometry/08-f6-smoke-brief.md), 8/8 pass, no console errors). Hosted CI passed at `5b1a01f8`.
- **Master repair** (`5b1a01f8`): CI on `5ef8c821` failed because `f58a7cba` (Functions) left `projective-five-point` and `projective-three-views` out of `PRESET_DATA_STATE_KEYS`. The test-only fix is noted to Functions in `maps.md`.

## Left for others

- The posters for `inversion` and the earlier Maps ids are in Curves' joint capture (claim in `curves.md`). That capture drops them from `POSTER_PENDING`.
- `node --test scripts/demonstration-preview-capture.test.cjs` fails locally only in "real VP9 encoding ... color metadata" (local ffmpeg reports no `bt709`). It is unrelated to recipes and not seen in CI.
- Content nits: T5 step 7 loads X = C, so its prompt "take X towards C" starts at C. The handoff-17 nits are also still open.
- Carried over: `NO_SYNCHRONOUS_SCENE_CHANGE` still lists `inversion`; Geometry's `PointSetGraph` vertex-name hook is still missing; the stale `origin/maps-*` branches are for the owner to delete.
