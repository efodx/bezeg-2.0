# 09a handoff (partial)

State: items 1, 2, 4, 5, 6, 7, 8 implemented; sideLists() hook returns null (item 3 left to the side-list worker).
Remaining: refusal-draws-objects mutation (M3 did not fail: a refused run has no position, so the mutation changed nothing; use a mutation that draws the sweep-line for a refused run), just build (not run), performance measurement and 09-perf.md (not done).
Files: src/graphs/compgeo/{BentleyOttmannGraph.tsx, BentleyOttmannControls.tsx, bentleyOttmannRun.ts, bentleyOttmannRun.test.ts, bentleyOttmannPresetCollection.ts, BentleyOttmannGraph.host.test.tsx}; bentleyottmann_* block after intervalsweep_invalid_mode in sl.ts and en.ts.
Checks: just unit src/graphs/compgeo --maxWorkers=2 passed; tsc clean; lint on touched files passed (logs 09a-*.log).
Mutations observed failing: wrong status order (M1, 2 tests), counter +1 (M2, 1 test), edit not resetting step (M4, 2 tests). All restored (diff vs backup clean).
Notes: segment names are s1-based (match board labels), spec says s_0; one helper segmentName in bentleyOttmannRun.ts. Default example makes 9 neighbour tests vs 6 pairs (spec step 6 implies fewer). Kernel trace matches spec's 13 events and statuses. Step 0 = after initial schedules (leading schedule events folded).
