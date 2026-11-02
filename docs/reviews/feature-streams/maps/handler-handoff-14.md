# Maps stream: handler handoff 14

Written 2026-11-02 by handler 14 (Opus 5.5, `auto`, effort `medium`) at the 150k context threshold. Gates: `G-REG` and `G-CG` open, `G-HL` closed. `Run state: active`. Worktree `.claude/worktrees/stream-maps`, branch `worktree-stream-maps` (equal to `origin/master` at handoff). The remote branch `origin/worktree-stream-maps` is stale and has diverged; push to `master` only. `origin/maps-06-f2a` is a leftover copy of F2a that is already on master and can be deleted by the owner.

## Done this session (all on `origin/master`)

- `f71125a1` **05 F6 checks:**
  - `just check` passed at `0cceafb2`, and hosted CI passed for that commit.
  - `just smoke-lesson triangle-centres inscribed-angle` passed.
  - A `bezeg-smoke` (Sonnet) run covered both routes and lessons: the collinear example in SL and EN with a live switch, keyboard-only use, dragging (the glider keeps the inscribed angle at half the central angle), and 390×844 touch emulation. There was no horizontal scroll and no console errors.
  - F6 waits only on the posters from the shared capture.
- `a1ebb14d` **06 F2a**: `EulerLineGraph`, a sibling of the T1 graph.
  - Model in `src/compgeo/eulerLineModel.ts`. Panel, text and Preset collection are in `src/graphs/compgeo/`, with the Preset key `compgeo-euler-line`.
  - The graph was reviewed for engineering and mathematics (Sonnet; it recomputed every spec value) and for UI and localization (Haiku).
  - Handler repairs:
    - The Euler line is anchored on G.
    - Slovenian calls G *težišče*.
    - Clearer distinct-count and equilateral copy.
    - The nine-points label names the marker shapes.
  - The full unit suite passed at the pre-rebase `641d923f`.
  - Drag with all overlays on (jsdom): median 33.0 ms per step.
- `70491e6c`: the F2b brief, `docs/reviews/triangle-geometry/06-f2b-brief.md`.
- `b6ed1795` **06 F2b**: the `euler-line` Demonstration at `/bezeg-2.0/euler-line`.
  - It is lessonless, `POSTER_PENDING`, and its Preset collection is in import.
  - The transient-state contract lists it with `NO_SYNCHRONOUS_SCENE_CHANGE` and `PRESET_DATA_STATE_KEYS`.
  - Temporary chapter-link exemptions in `familyChapters.test.ts` (`CHAPTER_LINK_PENDING`) and `triangleGeometryChapter.test.ts` stay until F4; remove them then.
  - Checks: tsc; focused unit tests (localization, catalog, routes, presets, learning content); the `euler-line` contracts (`BEZEG_TRANSIENT_STATE=euler-line`); `just build`; lint.
  - **No browser check of `/euler-line` yet.**

## Known red on master

- `GraphTransientState.part4` › `inscribed-angle` › "a rollback within one tick leaves the board drawn for the restored scene before the host commits" fails at `70491e6c`, so it predates F2b.
  - The restored `t` is 0.8, but 0.3 was expected.
  - Reproduce with `BEZEG_TRANSIENT_STATE=inscribed-angle just unit src/graphs/base/GraphTransientState.part`.
  - Local runs mount only a sample, so the failure shows only with that variable or in CI.
  - `inscribed-angle` is a Maps graph, so Maps owns the fix: diagnose it first, before F3. Log: `.command-logs/t06-f2b/unit-base-ia2.log`.

## Next, in order

1. Fix the `inscribed-angle` rollback failure above. Then open `/bezeg-2.0/euler-line` once in a browser in SL and EN, as a quick check of the F2b route.
2. **06 F3+F4**: lesson T3 under spec §T3 (steps 1–7, the near-equilateral instability stated, theorems with a source, drags labelled illustrations). Add the chapter section `euler-line` in `triangleGeometryChapter.ts`, preview copy in `guidedExamplePreviewCopy.ts`, and remove both F2b exemptions. Follow 05 F3+F4 (`96c0b2c9`) as the template.
3. **06 F5–F6**: the poster recipe (as in `35fe9a2a`), then the gate: `just check`, then a smoke of the route and lesson in both languages that also confirms T1 and T2 are unchanged.

## Open items carried over

- Geometry has not added the `PointSetGraph` vertex-name hook, so the panels still show "A (P1)".
- In the lessons, `set-points` scenes show "custom" in the example selector.
- The memory reaper stopped background commands once this session. Restart them only when the user asks.

## Settings to keep

Opus 5.5 handler, `--permission-mode auto`, `--effort medium`. Workers: `bezeg-worker` Sonnet 5.5 `medium`. Reviewers: `bezeg-reviewer` Sonnet for engineering and mathematics, Haiku for UI and localization. Smoke: `bezeg-smoke` Sonnet on port 4316.
