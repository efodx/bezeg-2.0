# Site walkthrough queue: throughput (package A)

Session `throughput` of the [site walkthrough](../../specs/site-walkthrough-intake-2026-11-14.md#sessions-2026-11-14), intake items T01–T05. Source spec: [verification throughput, phase 8](../../specs/verification-throughput.md#phase-8-remeasure-after-phases-07-local-waiting-first-owner-report-2026-11-14). State: [state note](../../reviews/site-walkthrough/throughput/state.md).

Rule for this queue, from the owner on 2026-11-14: the session measures and proposes. It changes no script, test slot, publish gate, CI workflow, test, handler card or worker brief wording until the owner approves that specific change. Which checks run when is his decision (intake decision 8).

| # | Step | Status |
| --- | --- | --- |
| 1 | 8a: measure local runs, the four representative changes, hosted runs, the `docs:` pushes and cost against value; write [the remeasure note](../../reviews/verification-throughput/remeasure-2026-11-14.md) | Done 2026-11-14 |
| 2 | 8b: ranked proposal and the routine / full policy (T03), in the state note under "For the owner" | Done 2026-11-14; approved by the owner the same day |
| 3 | Implement the approved changes in the state note's order (1, 3, 7, 8, 2, 4, timing of 6, 10, 5, 9): name the wait, measure before and after on the same representative change, record what still guards a narrowed check | In progress. Handler 2 committed 7, 1, 3, 8, 10 and 2; handler 3 reviewed and committed 4 (`4c3518d9`). 6 (timing), 5 and 9 remain. The slot change of 6 goes back to the owner with its timing |
| 4 | Write the approved routine / full policy into [the command guide](../../commands.md); name the daily run's reader | Done 2026-11-14: reader named (the handlers) and the policy table written under "Routine and full verification" |
| 5 | Close phase 8: acceptance V1–V5 met or given a recorded reason | V1 and V5 met by step 1; V2–V4 follow steps 3 and 4 |
