# Lesson example improvements run: usage — 2026-10-25

The owner asked why the lesson-example-improvements run (tasks 00–08, Claude handler on Opus 5.5, brief handoff-v10) reached the five-hour session limit twice. Figures come from the handler and worker transcripts; costs use list API rates (Opus $5/$25, Sonnet $3/$15, Haiku $1/$5 per million input/output, cache reads at a tenth) as relative weights, since plan limits are unpublished.

| | Requests | Cache reads | Output | Peak input | Est. cost |
| --- | --- | --- | --- | --- | --- |
| Handler (Opus) | 280 | 73.6M | 165k | 458k | ~$47 |
| 25 workers (Sonnet, one Haiku) | 803 | 68.1M | 866k | 86–161k each | ~$46 |

Findings:

- The handler never shed context: it started at 45k (a whole-spec read), passed 200k after 17 minutes, and ended at 458k. Its turns averaged 263k of re-read input; cache reads were ~$37 of its cost.
- Both limit hits came at about $54–55 of estimated usage per window. The first window was already ~$31 used by five other Opus sessions; the run then spent ~$23 in 22 minutes (workers $14, handler $9). The second window held only this run: ~$55 in 38 minutes (handler $29, workers $27).
- Six or seven concurrent workers compressed spending, not total usage.
- The handler sent `HANDOFF` to 18 of 19 implementation workers, turning about ten tasks into 25 workers that each started at ~39k. Workers crossed the 135k signal at a median of turn 26 (range 10–47), well under the 40-turn sizing.
- Resuming after a limit reset re-writes each live context to the cache once (~$1.4 for the handler at ~220k, ~$1 for two workers): about 5% of a window.

Changes in handoff-v11: slices sized to about 20 turns with a lower turn fallback, at most three concurrent workers, and a Claude handler context budget (soft 150k, hard 190k) with an automatic successor.
