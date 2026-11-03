# School function zero-drag benchmark

Node benchmark of dragging one zero in the S3 polynomial-zeros and S4 rational-function graphs (school function graphs 06 F2a; results in the measurement addendum of [ADR 0026](../../docs/adr/0026-school-function-catalogue.md)). It adds no route and changes nothing under `src/`; it imports the models and `plotPieces` read-only.

```powershell
node scripts/school-function-drag-benchmark/build.cjs
node scripts/school-function-drag-benchmark/run.cjs [results.json] [summary.md]   # or: just school-function-drag-bench
```

Output defaults to `.benchmark-output/school-function-drag/` (git-ignored). Typecheck: `npx tsc --noEmit --pretty false -p scripts/school-function-drag-benchmark/tsconfig.json`. Per move: the model edit, the facts, `plotPieces` at the graph's default view and sample count (600, and 300), and for S3 the 400-sample derivative curve. Browser frames, JSXGraph and React are not covered.
