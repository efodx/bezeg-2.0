# Learn UI stream: handler handoff 10

Date: 2026-11-01. Handler 8 stops at its 150k context threshold. Earlier context: [handoff 9](handler-handoff-9.md). Source: [spec](../../../specs/guided-example-highlights.md), [tasks](../../../tasks/guided-example-highlights/README.md), [stream record](../../../tasks/feature-streams/learn-ui.md#3-guided-example-highlights).

Branch `worktree-stream-learn-ui` in `.claude/worktrees/stream-learn-ui`; everything is pushed to `master` through `f904beb6`.

## Done this session

- Rechecked 03b on the rebased HEAD (`just check` passed at `7fe8b449`) and pushed it.
- **04 part A** (ph-curves, parametrization) and **04 part B** (functions-and-calculus) pushed. Details, repairs and checks are in the stream file rows. Each part was fully recaptured; every changed PNG was viewed against its alt text and caption.
- Workers: 04a-1 Sonnet (151k tokens, 71 tools; it spent its budget on prose plus a draft spline solver), 04a-2 (78k, 41), 04a-3 (74k, 32), 04b (142k, 65; stopped by the budget after writing every item). Worker handoffs: `04a-worker-handoff-1.md`, `04b-worker-handoff-1.md`.

## Next, in order

1. **04 part C: `analysis`** (audit section "analysis", figure rows 27–29; prose `familyChapters.ts` "captured poster" paragraph). One Sonnet worker. Reuse the 04b brief shape: order the work as recipes+checks, then copy, then figures/prose, so a partial hand-off leaves whole items.
2. Smoke for batch 04 (four chapters, SL+EN, 1280 and 390, launch/return), on `SMOKE_PORT=4312`, with one `bezeg-smoke` Sonnet worker. Then write `docs/reviews/guided-example-highlights/batch-b-note.md` (evidence and gaps for task 05).
3. Task 06 (Bézier patches; the capture runner must handle the SVG surface view, `scripts/surface-view-evidence.cjs`).
4. Task 05 (acceptance, `just check`), which opens `G-HL`.
5. D10 (quintic card d = −2.5) is still open with the owner. The image shows only a short offset piece with the self-crossing loop at the upper left; the rest lies outside the view.

## Lessons for briefs

- Frame ids carry `-observation` / `-explanation` suffixes; family cards use `instruction`/`observe`.
- `expectChange: false` is valid only when the frame's board equals the start scene. Capture fails both ways, so a kept-start highlight goes on the first frame.
- Workers cannot see the board, so their `curveCount` and `expectChange` values are guesses until capture. Budget one handler repair cycle per part.
- `just unit src/learning/content` takes 4–9 minutes; workers time out on it, so the handler should run it.

## Settings

Opus handler, `--permission-mode auto`, `--effort medium`; workers `bezeg-worker` Sonnet; smoke `bezeg-smoke` Sonnet; capture preview `just preview 4387` (stopped at handoff; restart it after `just build`). `do-log` records for handlers 3–8 are still unwritten.
