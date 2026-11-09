# Lesson writer model comparison: results

[Pilot results](../../lesson-content-pilot.md) · [writer brief](writer-brief.md) · [reviewer brief](../reviewer-brief.md) · [cost log](cost-log.md) · 2026-11-08

The owner asked whether better writer models produce better lesson text, and asked to keep the best rewrites for judging. Five writer configurations each rewrote the four pilot lessons once, from the same inputs: the r0 script, the round-1 reviews and style brief v2. Blind persona reviewers then scored every draft. This is text only: nothing has been checked in the browser and nothing in `src/` has changed.

## Configurations

| Config | Writer | Notes |
| --- | --- | --- |
| w-a | Opus, effort high | Planned all four lessons in a run that hit the budget, then wrote each lesson from that plan in a fresh run. |
| w-b | Sonnet, effort high | Wrote three lessons in one run and zeros in a second run. |
| w-c | Haiku, effort max | No source access (budget). Labels came from the r0 *Na grafu* lines and the listed screen facts. |
| w-d | Fable, effort low | One lesson per run. |
| w-e | Sonnet, effort medium | Baseline: the project's routine worker setting. One lesson per run. |

The reviewers were Sonnet medium agents with the unchanged reviewer brief, plus one note: the generic finish screen is app chrome, so Ending is scored on the last step. They saw only config letters, never models. Each reviewer agent scored four drafts, one per lesson and each from a different config, so no reviewer saw two versions of the same lesson. Every draft was scored once by each persona: 60 reviews from 15 agents.

## Scores

Mean weighted score out of 27 (struggling/curious/reluctant in brackets).

| Config | `bezier-pilot` | `subdivision-guided` | `curve-curvature-guided` | `polynomial-zeros-guided` | Mean |
| --- | --- | --- | --- | --- | --- |
| w-a Opus high | 22.7 (21/25/22) | 18.3 (17/19/19) | 20.7 (19/22/21) | 21.7 (22/21/22) | 20.8 |
| w-b Sonnet high | 22.3 (20/24/23) | **22.0** (24/22/20) | 21.7 (21/23/21) | **23.7** (24/25/22) | **22.4** |
| w-c Haiku max | 21.0 (21/22/20) | 17.7 (17/18/18) | 20.7 (20/22/20) | 23.3 (23/24/23) | 20.7 |
| w-d Fable low | **23.0** (23/24/22) | 21.7 (20/23/22) | **22.7** (23/25/20) | 22.3 (21/23/23) | **22.4** |
| w-e Sonnet medium | 21.7 (19/22/24) | 18.7 (18/19/19) | 21.0 (21/22/20) | 22.3 (21/22/24) | 20.9 |
| *r0, current lesson* | *14.7* | *14.0* | *16.0* | *14.3* | *14.8* |
| *Pilot final (iterated)* | *22.0 (r3)* | *19.7 (r2)* | *22.7 (r3)* | *24.3 (r1)* | *22.2* |

Every single-shot rewrite beats r0, by 4 to 9 points. Among writers, Sonnet high and Fable low lead the baseline by 1.5 points. Opus high and Haiku max land on the baseline. Most of the gap comes from subdivision, where the leaders score 22 and the rest 18.

## How noisy are the scores?

**Persona agreement.** On each text, the three personas usually agree within 1–3 points, as in the pilot. The widest spreads here are 5 points (w-d curvature 20–25, w-e bezier 19–24).

**Repeat scoring.** Three fresh reviewers, one per persona, re-scored the four r0 scripts with the round-1 instructions (`repeat/`):

| Lesson | Struggling (round 1 → repeat) | Curious | Reluctant |
| --- | --- | --- | --- |
| `bezier-pilot` | 15 → 15 | 15 → 15 | 14 → 15 |
| `subdivision-guided` | 13 → 14 | 15 → 15 | 14 → 15 |
| `curve-curvature-guided` | 15 → 18 | 18 → 19 | 15 → 18 |
| `polynomial-zeros-guided` | 14 → 14 | 15 → 16 | 14 → 15 |

The same persona scoring the same text differs by 1.0 point on average (maximum 3), and never scored lower on the repeat. Expect roughly ±1 per review, and ±3 occasionally on a text with a debatable step (curvature). Lesson means over three personas are steadier: they moved by 0 to 2.3 points.

**What the noise allows.** The 1.5-point lead of Sonnet high and Fable low (mean of 12 reviews each) is larger than reviewer noise, but small. It rests on one draft per writer per lesson, and how much a writer varies between runs was not measured. A single lucky or unlucky draft moves a lesson mean by 3 to 4 points, as Opus and Sonnet medium on subdivision show. The ranking of the top two is a tie. "Opus is no better than the baseline" is as firm as this design can make it. "Sonnet high and Fable low are a little better" is suggestive, not proven.

## Cost

Dollar estimates at Anthropic's list API prices ([pricing page](https://platform.claude.com/docs/en/about-claude/pricing), read 2026-11-09). Token counts come from every request in each subagent transcript, split into input, cache writes, cache reads and output, and include failed attempts. Cache writes are priced at the 5-minute rate. Haiku 5.5 is priced per request at its tier: prompts over 100k tokens pay the higher rate.

| Model | Input | Cache write | Cache read | Output (per MTok) |
| --- | --- | --- | --- | --- |
| Opus 5.5 | $4 | $5 | $0.20 | $20 |
| Sonnet 5.5 | $2 | $2.50 | $0.10 | $10 |
| Haiku 5.5 (≤100k / >100k prompt) | $0.10 / $0.50 | $0.125 / $0.625 | $0.01 / $0.05 | $0.50 / $2.50 |
| Fable 5.1 | $10 | $12.50 | $0.25 | $50 |

| Config | Total, 4 lessons | Per lesson | Mean score | Wall time | Failed runs |
| --- | --- | --- | --- | --- | --- |
| w-a Opus high | $4.93 | $1.23 | 20.8 | 41 min | 1 (planning run at the budget, $2.11) |
| w-b Sonnet high | $1.51 | $0.38 | 22.4 | 31 min | 0 (one run fit three lessons) |
| w-c Haiku max | $0.83 | $0.21 | 20.7 | 50 min | 2, plus a no-source workaround |
| w-d Fable low | $4.01 | $1.00 | 22.4 | 25 min | 0 |
| w-e Sonnet medium | $0.51 | $0.13 | 20.9 | 13 min | 0 |

Scoring costs about $0.17 per review agent, or roughly $0.15 for all three personas on one draft. All 60 reviews plus the repeat check cost $3.43, and the source check of the four best drafts cost $0.53. These are list prices; a subscription bills differently, but the ratios between models hold. Haiku max spent its money on reasoning output (93k–132k output tokens per lesson). It hit its 78k context budget three times before a run with no source access fit one lesson.

## Verdict: are better writer models worth it?

- **Opus high: no.** At $1.23 per lesson it is the most expensive, and it scored on the baseline. Its subdivision draft was the weakest after Haiku's. One caveat: Opus planned in a run that hit the budget and wrote from that plan, so a clean one-lesson-per-run Opus was not tested.
- **Haiku max: no.** It is cheap ($0.21 per lesson) but slow and fragile: it needed the no-source workaround, failed twice, and scored on the baseline. Its zeros draft was strong (23.3), but its subdivision draft scored lowest of all.
- **Sonnet high: yes, for first drafts.** It ties for the best score and costs $0.38 per lesson, $0.25 more than the baseline.
- **Fable low: no.** It ties Sonnet high on score at 2.6 times the price ($1.00 per lesson).
- **The review loop matters more than the writer.** A single-shot rewrite from round-1 reviews already scores in the range the pilot's iterated rewrites reached. Going from r0 to a rewrite gains 6 to 8 points on average; changing the writer moves 1 to 2. Keep the blind persona loop and spend extra on a better writer only for the first draft.

**Recommendation:** use Sonnet high as the lesson writer for new families. Keep Sonnet medium for repair rounds. Do not use Opus, Fable or Haiku for lesson prose. Every writer is cheap next to the review loop's value: a full rewrite and its three blind reviews cost under $1 with Sonnet high. To make the lead firm, score a second Sonnet high and Sonnet medium draft of subdivision (about $1).

## Best rewrites

The top-scoring draft per lesson, copied to [`best/`](best/) for the owner's judgement. All drafts are kept in `drafts/<config>/`.

| Lesson | File | Writer | Score | Runner-up |
| --- | --- | --- | --- | --- |
| `bezier-pilot` | [best/bezier-pilot.md](best/bezier-pilot.md) | Fable low (w-d) | 23.0 | Opus high 22.7 |
| `subdivision-guided` | [best/subdivision-guided.md](best/subdivision-guided.md) | Sonnet high (w-b) | 22.0 | Fable low 21.7 |
| `curve-curvature-guided` | [best/curve-curvature-guided.md](best/curve-curvature-guided.md) | Fable low (w-d) | 22.7 | Sonnet high 21.7 |
| `polynomial-zeros-guided` | [best/polynomial-zeros-guided.md](best/polynomial-zeros-guided.md) | Sonnet high (w-b) | 23.7 | Haiku max 23.3 |

The files in `best/` are the writers' text, unedited, so they show what each model produced. A read-only correctness check (Sonnet medium, against source) found:

- **bezier-pilot, subdivision-guided:** no mathematics or label errors. Not confirmed: that the pieces' control points can be dragged after a cut (subdivision step 5).
- **curve-curvature-guided:** all numbers correct. **Blocker:** step 2 calls "Smerni kot tangente φ" a new readout row, and step 3 treats R the same way. The readout always shows κ, R and φ together (`CurvatureOverlay.ts:168-181`). Minor: the step 4 calculation writes κ(0) with x as the parameter, while the slider sits at t=0,5.
- **polynomial-zeros-guided:** mathematics correct. **Blocker:** step 3 sends the student to the "Pravilo" row to read crossing or touching, but that row shows only the equation. Crossing appears in the "Ničla N" rows. Minor: step 1 says every zero has a multiplicity label, but only multiple zeros do (`PolynomialZerosGraph.tsx:198`). Step 3's "kamor koli ju povlečeš" fails when the zeros merge into a triple zero. Step 7's suggestion to reach 1, 1, 3 by dragging cannot work, because merging only removes zeros.

None of these errors would change the persona scores: the reviewers judged experience from the script and could not see the screen. Every draft from any model needs this source check before it ships.

## Defect in the shipped curvature lesson

The current `curve-curvature-guided` lesson says that N points into the bend (`scripts/curve-curvature-guided.r0.md:39`: "normala \(N\), ki kaže na stran, kamor se krivulja zavija"). That is false for κ<0: the app's κ is signed (positive for a left turn) and N is the left normal \((-T_y,T_x)\), so on a right turn N points out of the bend (`src/bezeg/impl/curve/curvature.ts`). Writers were warned, and a search of the drafts found no repetition of the claim. Fix the shipped text whenever the lesson is next edited.

## Confounds

- One draft per writer per lesson; run-to-run writer variance is unmeasured.
- Writer conditions differ: Opus wrote from a plan made in an over-budget run, Haiku had no source access, and Sonnet high wrote three lessons in one run.
- The reviewers are Sonnet medium, the same family as two writer configs, so a family preference is possible.
- The pilot's iterated scores came from different reviewer sessions; repeat scoring drifted upward by about 1 point, so compare across sessions with care.
- Writers could read the round-1 reviews, so every draft is a round-1 rewrite, not a cold rewrite.
