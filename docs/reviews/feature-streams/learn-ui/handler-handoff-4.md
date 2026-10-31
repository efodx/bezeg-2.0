# Learn UI stream: handler handoff 4

Date: 2026-10-31. Handler 3 (Opus 5.5, `--permission-mode auto`, `--effort medium`) continued after handoff 3 at the owner's "continue". The stream is **stopped for owner decisions**, and no successor was launched.

## Done this session

| Item | Commit | Evidence |
| --- | --- | --- |
| PG4b smoke-repair recheck | — | Build `e6fd618`, Chromium at 390×844 touch and 1440×900. Inspect shows the 6-anchor example on a first visit and draw shows 0. No P/joint label overlap, no errors. Screenshot checked: all labels legible, the C0 unclipped, the C1 labels clear of the caption. |
| PG4a + PG4b + section 1 accepted, pushed | `774207c4`…`8f23b566` | After the rebase, 789 playground, content and chapter unit tests passed and `tsc` was clean. |
| CI fix | `9ecde47a` | Hosted smoke on `8f23b566` failed `standalone-learning` "reading at 390px and enlarged text" and `unified-learning` "bezier-curves: production deep link…". The page was 468–510 px wide because the non-wrapping anchor-type group widened the playground grid. Fix: the group wraps and the grid column is `minmax(0, 1fr)`. A probe (`pg4b-smoke/o.js`) gives width 390 in SL and EN. `just smoke-built` of both spec files passed. **Hosted browser smoke green on `9ecde47a`.** |
| Highlights audit 00 (redo) | this push | Two `bezeg-worker` Sonnet passes; [highlight-audit.md](../guided-example-highlights/highlight-audit.md) covers 67 examples and 29 figures. Handler checked the inventory method and the owner-decision section. Worker 2 did not run browser checks; fixture values it inferred are marked "confirm" for task 01. |

## Owner decisions needed (audit "Owner decisions", D1–D12 with D7 dropped)

D1 changes scope to 67 examples, 29 figures and nine chapters, including the Bézier patches chapter. D2: drop the 12 patch figures, which duplicate the card images; patch cards get highlight recipes. D3: a parametrization section left without a card. D4: no example shows the 4×3 net. D5: five figure states no prompt can reach. D6: patch examples with several candidate pictures. D8: the task 01 samples. D9: the two quartic activities share one scene. D10: the PH singularity cards need a distance from the fixture. D11: figures 25/26, and rewriting `familyChapters.ts:409`. D12: predict-then-reveal cards show the answer. Each item has a recommendation in the audit.

## Next, after the owner answers

1. Record the decisions in the spec ([guided-example-highlights.md](../../../specs/guided-example-highlights.md)): counts, scope, and the accepted dispositions. Update tasks 01–05 to match.
2. Set `Run state: active`, push, and start tasks 01 ∥ 02 (at most two workers, fewer while memory is low). Then do 03 ∥ 04 under the shared-file rules, and 05. `G-HL` opens when 01 and 05 are accepted.
3. Section 1 F6: run `just check` at a stable checkpoint.

## Open items

- `do-log` records are still unwritten for handler 2's and handler 3's dispatches: perf, smoke and two audit workers, all Sonnet medium. None needed `HANDOFF`; audit worker 1 returned partial at its turn budget.
- The smoke and perf scripts under `docs/reviews/feature-streams/learn-ui/pg4b-smoke/` are committed; their screenshots are local only.
- A lesson from the CI failure: browser smoke briefs for UI on chapter pages should name the 390 px / 200% text overflow check (`tests/lesson-smoke-helpers.cjs` `noHorizontalOverflow`).

## Settings to keep

Opus handler, `--permission-mode auto`, `--effort medium`. Workers: `bezeg-worker` Sonnet 5.5 medium; reviews `bezeg-reviewer` Sonnet; smoke `bezeg-smoke` with `SMOKE_PORT=4312`.
