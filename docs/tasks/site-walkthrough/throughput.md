# Site walkthrough queue: throughput (package A)

Session `throughput` of the [site walkthrough](../../specs/site-walkthrough-intake-2026-11-14.md#sessions-2026-11-14), intake items T01–T05. Source spec: [verification throughput, phase 8](../../specs/verification-throughput.md#phase-8-remeasure-after-phases-07-local-waiting-first-owner-report-2026-11-14). State: [state note](../../reviews/site-walkthrough/throughput/state.md).

Rule for this queue, from the owner on 2026-11-14: the session measures and proposes. It changes no script, test slot, publish gate, CI workflow, test, handler card or worker brief wording until the owner approves that specific change. Which checks run when is his decision (intake decision 8).

| # | Step | Status |
| --- | --- | --- |
| 1 | 8a: measure local runs, the four representative changes, hosted runs, the `docs:` pushes and cost against value; write [the remeasure note](../../reviews/verification-throughput/remeasure-2026-11-14.md) | Done 2026-11-14 |
| 2 | 8b: ranked proposal and the routine / full policy (T03), in the state note under "For the owner" | Done 2026-11-14; waits for the owner |
| 3 | Implement each approved change: name the wait, measure before and after on the same representative change, record what still guards a narrowed check | Not started; needs approval per change |
| 4 | Write the approved routine / full policy into [the command guide](../../commands.md); name the daily run's reader | Reader named 2026-11-14 (the handlers; card, workflow and command guide). The policy table waits for the owner's answer on the slice tier |
| 5 | Close phase 8: acceptance V1–V5 met or given a recorded reason | V1 and V5 met by step 1; V2–V4 follow steps 3 and 4 |
