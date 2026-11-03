# Geometry stream: handler handoff 39

Written 2026-11-03 by handler 39 (Opus 5.5, auto, effort medium). Continues [handoff 38](handler-handoff-38.md). Stream file: [geometry](../../../tasks/feature-streams/geometry.md). Reason: context soft threshold (175k).

## Done this run (on `origin/master`)

1. **Sweep 21 accepted** (S2 chapter sections, C3 and C4 owned by the sweep chapter). Commit `65fbad83`; [record](../../sweep-algorithms/21-acceptance.md).
   - Checks: full unit, build, Sonnet engineering review, and `just smoke-lesson monotone-partition monotone-triangulation` (4/4).
   - Chapter-page browser check in sl and en, including the return link.
   - The review's minor note was fixed: the unreleased-lessons scan now blanks only the link paths.
2. **Lint fix** `6754e336`: my sweep 21 probe script had a useless escape, which put a lint error on master for one push. **Check hosted CI** for `65fbad83` (it may have failed lint), `6754e336` and `ea8bb9ba`. Fix any failure before pushing anything else.
3. **T3 22/24a accepted** (Voronoi lesson B4, its actions, and the `voronoi` chapter section). Commits `2fae5c2d` and the recount `ea8bb9ba`; [record](../../triangulation-voronoi/22-acceptance.md).
   - Checks: full unit, build, lint, Sonnet engineering review, `just smoke-lesson voronoi` (2/2), and a browser check. The browser check covered a live language switch, a keyboard-only walk, spoiler hiding, the chapter return link and an old-Preset import.
   - Fixed in integration: the worker's smoke regex held literal backspace characters, so it could never match. The cause was `\b` written through a Python string; the 23a brief warns about it. A stale overlays comment was also fixed.
   - Preset compatibility is recorded in task 22, and it is forward-only. A new export stores `overlays.diagram`, which an older build rejects. Old files import and show the diagram.
   - Keyboard notes about the shared lesson runtime are in the record. Focus goes to the lesson section after each advance, so reaching Next takes many Tabs. One shell element has no focus ring. Neither came from this diff.

## Next steps, exactly

1. Check hosted CI (item 2 above).
2. **T3 23a**: dispatch from the ready brief [23a-brief.md](../../triangulation-voronoi/23a-brief.md), which covers `set-mode`, lesson B5 and the registration edits. Use `bezeg-worker` (Sonnet), `isolation: worktree`, branched from master at or after `ea8bb9ba`. Then write a **23b** brief: the dedicated lesson test file (task 23 item 3), one mutation per assertion, and the `voronoi-degenerate` smoke row. 23b can continue in 23a's worktree.
3. **T3 24b**: the `voronoi-degenerate` chapter section (task 24, the B5 half). It removes `voronoi-degenerate` from `CHAPTER_LINK_PENDING` and adds ownership. It depends on 23.
4. **S2 F6** (handler; it can run alongside 23a): the sweep S2 acceptance gate for C3 and C4, from the sweep spec's release batches. Run `just check` at a stable checkpoint, smoke the `monotone-partition` and `monotone-triangulation` routes in both languages, and check hosted CI. Use [f6-t2-acceptance.md](f6-t2-acceptance.md) as the template.
5. **T3 F6** after 24b.
6. Worktree cleanup, which needs the owner because `--force` and `-D` were refused before:
   - the three agent worktrees from handoff 37;
   - `agent-af2dc5620c0302f21` (sweep 21) and `agent-ab6e252dd83a77fd9` (22), both now integrated;
   - branches `worktree-agent-ae1c6730a8e760de2` and `t3-20-backup`.

## Risks and lessons

- **Counts conflict on every rebase** while other streams add lessons: `authoredChapterCoverage` (now 107), `guidedExamplePreviewCopy` (93 lessons, 100 entries), `CHAPTER_LINK_PENDING` and the lessonless list in `lessonCatalog.test.ts`. After a rebase, run `just unit src/learning` and recount from the failure message. A clean text merge can still leave a stale number.
- **Write regex escapes such as `\b` with Edit or Write**, never inside a Python or shell string passed through Bash. The tool path turned `\b` into a backspace. `grep -c $'\x08'` finds it.
- **Smoke vs preview port:** `just smoke-lesson` starts its own server on `SMOKE_PORT`. Stop your own `just preview 4313` before running it.
- **Lint the evidence folders before pushing.** `just lint` covers `docs/reviews/**/*.cjs`, and smoke workers' probe scripts have failed it twice. Run `just lint` after copying evidence in.
- The other lessons from handoff 38 still apply: measure compgeo overlays in the browser at the point limit, and split lesson briefs in two.

## Live processes

None. The preview on 4313 was stopped, and every worker returned.

## Settings to keep

- Handler: Opus, permission mode auto, effort medium. Self-watch at `--until 175000` (owner override), then `--until 215000`.
- Workers: `bezeg-worker` (Sonnet), `isolation: worktree`, at most two at once, budget watcher at 135k, then `HANDOFF`. Reviews: `bezeg-reviewer` (Sonnet). Smoke: `bezeg-smoke` with `model: sonnet`.
- Successor launch, from the stream worktree: `claude --bg -n "geometry handler 41" --agent claude --model opus --permission-mode auto --effort medium "<prompt>"`. The successor starts its own successor the same way and tells it to do the same.
