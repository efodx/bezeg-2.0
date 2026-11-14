# Botanical studio repair: state note (2026-11-14)

Worktree `.claude/worktrees/studio-repair`, branch `worktree-studio-repair`. The round is implemented and committed; one handler did all of it, with no workers. Settings to keep: model `claude-fable-5-2`, permission mode `auto`.

## Owner directions, verbatim

1. "Check what changed in 'Refine Home and demonstration workspace as a botanical studio.' I think that it turned out awful, I want you to check it out and tell me if you agree or disagree and why."
2. "okay, do it" (answering the proposal: "keep the workspace chrome and undo the width cap, the phone header wrap and the Home hero scale").
3. "also, I think before it looked a bit more fun, you can use inspiration from the homepage to make it a bit more fun, but still the graph and tools are main content of course" (about the Demonstration workspace).
4. "make the limit 80% higher", "for all fable sessions" (handler budget; published as `00efc4f1`).

## Accepted work

Three commits on this branch, by subject; the spec section [Repair round and workspace character](../../specs/botanical-studio-refinement.md#repair-round-and-workspace-character-2026-11-14) holds measurements, decisions and rejected alternatives.

- `fix: workspace width, phone header and Home hero scale after the botanical studio pass`
- `feat: paper, sheets and an elder branch give the workspace its character back`
- `docs: botanical studio repair round and workspace character; state note`

## Checks run

- `just check-changed` on the final code: typecheck, lint, affected unit tests and production build passed.
- Browser, Vite dev server, Slovenian and English: Home at 390, 724, 1024, 1440 and 1920px; header at 320, 360, 390 and 700px; `/complex-multiplication` at 390, 1024, 1280, 1440 and 1920px, in Presentation, and `/probability/summary` (the longest title) at 1180 and 1440px. No horizontal overflow; the branch touches neither title nor buttons.
- Browser smoke and the publish result are reported in the handler's closing message and by `just ci`.

## Open items

- Owner review of the workspace character. The `feat:` commit can be reverted alone; the spec and DESIGN.md paragraphs about paper, shadow, branch and lesson colour then need the same revert.
- The lesson panel toolbar moves 13px between frames at 320px with 200% Verdana text in English when the header is one row shorter (see the spec's phone header repair). This round leaves the header below 360px as it was; the lesson runtime's owner decides the fix.
- Outside this round: the family label under the Home featured title; the Home grid and green rail removed by `4e844f56`.
- `tests/curve-ownership.smoke.spec.cjs:194` still depends on the board width at 1280px (898px). This round leaves every viewport up to 1328px unchanged for that reason.

## Handoff rule

At a context handoff, rewrite this note, commit and push it, then start the successor with `claude --bg` as in `docs/agent-workflow.md` (handler budget, step 6) and pass this rule on.
