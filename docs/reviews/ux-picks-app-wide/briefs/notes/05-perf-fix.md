# 05 perf fix note

Done: production rerun (the 45-48 long tasks were dev only; production 1-3), profile/trace attribution, bounds read once per drag (RangePuck.tsx), constant entry width in RangePuck/CountPuck/pucks.css with tests, unit (src/workspace src/graphs/base) pass, eslint 0, build ok, measure-05 3 runs 4x and 1x. Full write-up: measure/RESULTS-05-perf-fix.md.
Open: input delay median 38-41 vs 35 target (like-for-like with master via pointermove stamp: 34-35); cost is the per-write wide React render + graph redraw. CountPuck entry slot rect not browser-checked. ReadoutsBody.tsx:82 forced layout per row per render (not owned).
