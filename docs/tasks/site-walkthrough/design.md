# Site walkthrough queue: design (package C)

Source spec: [site walkthrough design](../../specs/site-walkthrough-design.md). State note: [state](../../reviews/site-walkthrough/design/state.md).

| # | Slice | Intake | State |
| --- | --- | --- | --- |
| 1 | Mockup gallery with a recommendation per item and epicycles subject candidates | all, G07 | Done 2026-11-14 |
| 2 | Proposal spec with draft acceptance criteria | all | Done 2026-11-14 |
| 3 | Owner picks an option per item | all | Done 2026-11-14; recorded in the spec |
| 4 | L04 Back button: outline only | L04 | Implemented by the handler; needs screenshot and publish |
| 5 | L01 numbers everywhere through a shared heading component | L01 | Worker running (with 6) |
| 6 | L05 botanicals on chapter pages; reversal recorded in `side-botanicals.md` | L05 | Worker running (with 5) |
| 7 | P01 B and P02: presets list panel with inline save, row menu, backup section | P01, P02 | Worker running |
| 8 | Homepage carousel: pool, per-visit draw, picture cards | H02, H03 | Worker running; does not touch `WelcomePage.*` |
| 9 | Homepage label "Izbor demonstracij" and the second button to learning | H02, H04 | Waits for `polish` slice 3 (footer, header brand) on `master` |
| 10 | Browser smoke names for the presets panel under `tests/` | P02 | After 7 |
| 11 | G07 subjects passed to `graphs` | G07 | Sent 2026-11-14 |
