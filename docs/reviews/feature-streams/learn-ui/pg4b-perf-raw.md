# PG4b playground drag, raw runs (2026-10-31, commit 577ae08)

Output of `node scripts/playground-perf.cjs` (3 runs per case; intervals in ms; samples are frames inside the drag after 15 warm-up frames).

```
{"case":"draw, no overlays, desktop","run":1,"samples":313,"median":16.7,"p95":16.7,"max":16.8}
{"case":"draw, no overlays, desktop","run":2,"samples":313,"median":16.7,"p95":16.7,"max":16.8}
{"case":"draw, no overlays, desktop","run":3,"samples":309,"median":16.7,"p95":16.8,"max":16.8}
{"case":"inspect, all overlays, desktop","run":1,"samples":375,"median":16.7,"p95":16.7,"max":16.8}
{"case":"inspect, all overlays, desktop","run":2,"samples":460,"median":16.7,"p95":16.8,"max":16.8}
{"case":"inspect, all overlays, desktop","run":3,"samples":433,"median":16.7,"p95":16.8,"max":16.8}
{"case":"draw, no overlays, 390x844 4x CPU","run":1,"samples":592,"median":16.7,"p95":16.8,"max":83.4}
{"case":"draw, no overlays, 390x844 4x CPU","run":2,"samples":492,"median":16.7,"p95":16.8,"max":66.7}
{"case":"draw, no overlays, 390x844 4x CPU","run":3,"samples":447,"median":16.7,"p95":16.8,"max":33.4}
{"case":"inspect, all overlays, 390x844 4x CPU","run":1,"samples":721,"median":16.7,"p95":33.4,"max":66.7}
{"case":"inspect, all overlays, 390x844 4x CPU","run":2,"samples":719,"median":16.7,"p95":50,"max":100}
{"case":"inspect, all overlays, 390x844 4x CPU","run":3,"samples":725,"median":16.7,"p95":49.9,"max":83.4}

case | median ms (range) | p95 ms (range) | samples per run
draw, no overlays, desktop | 16.7 (16.7-16.7) | 16.7 (16.7-16.8) | 313/313/309
inspect, all overlays, desktop | 16.7 (16.7-16.7) | 16.8 (16.7-16.8) | 375/460/433
draw, no overlays, 390x844 4x CPU | 16.7 (16.7-16.7) | 16.8 (16.8-16.8) | 592/492/447
inspect, all overlays, 390x844 4x CPU | 16.7 (16.7-16.7) | 49.9 (33.4-50.0) | 721/719/725
```

Failure demonstrations: `PERF_BREAK_SEED=1` exits 1 with `seeded drawing did not load: 0 anchors rendered, expected 20`; `PERF_STEPS=3 PERF_DRAG_MS=10` exits 1 with `only 0 frame samples (< 60)`.
