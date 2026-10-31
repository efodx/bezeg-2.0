# Projective conic constants benchmark

Node benchmark for the two measured constants of the projective conic family ([ADR 0033](../../docs/adr/0033-projective-conics-exact-kernel-and-family.md) sections 2 and 3; results in its measurement addendum): `DEFAULT_SAMPLE_DENSITY` (`src/projective/conicSampler.ts`) and `DIRECTION_BOUND` (`src/projective/conicPencil.ts`). It adds no app route and changes nothing under `src/`; it imports the sampler, the pencil, and the K2 and K3 models read-only, so it can be rerun after the sampler changes.

## Run

```powershell
node scripts/projective-conic-benchmark/build.cjs
node scripts/projective-conic-benchmark/run.cjs [results.json] [summary.md]   # or: just projective-conic-bench
```

`build.cjs` bundles `bench.ts` with Vite (SSR mode) into `.benchmark-output/projective-conic/bench.mjs`. `run.cjs` runs it in Node and writes a JSON file and a markdown summary (default `.benchmark-output/projective-conic/projective-conic-bench.{json,md}`, git-ignored), recording the Node version, CPU, OS, and git HEAD. It takes about a minute and uses no test slot. Keep the machine idle. Typecheck: `npx tsc --noEmit --pretty false -p scripts/projective-conic-benchmark/tsconfig.json`.

## Method

- **A. Density sweep** (180 to 1440): `sampleConic` for each K2 and K3 conic in the 24 by 21 view; median and p95 over 25 runs after 5 warm-ups; total vertex count; and the largest deviation of a segment midpoint `m` from the conic, estimated as `|f(m)| / |grad f(m)|` and converted to px for a 24-unit-wide view drawn 1000 px and 1920 px wide. Nodes of a line pair (zero gradient) are skipped. A density that throws is recorded as an error row.
- **B. Bound sweep** (8 to 32): the direction table is rebuilt here with the same rule as `buildTable`, and `secondIntersection` is called directly for each K2 conic and handle. Reported: table size, largest angle gap between consecutive directions, reachable count (finite, `|x| <= 11.8`, `|y| <= 10.3`), the on-screen gap in px at 1000 px between consecutive reachable points in table order (cyclic; also "adjacent" gaps that count only table-adjacent pairs that are both reachable), the cold cost of all six handle lists (conic switch work), and the largest bit length of a normalized reachable handle coordinate.
- **C. Interactions at the current constants**: K2 drag (`dragHandle` + `evaluatePascal`, 240 pointer positions on a circle of radius 4 around each handle base, 5 recorded passes per handle after a warm-up pass); K3 drag (`moveP` + `evaluatePolePolar`, 240 positions on a Lissajous path, 30 recorded passes); conic switch (`setConic` + evaluate + `sampleConic`, plus for K2 a cold computation of the six reachable lists through `handlePoint`, because the module cache of `reachableIndices` cannot be cleared). The reachable-list cache is warm during the drags, as in the app.

## Not covered

Browser frames, SVG or JSXGraph work, React renders, MathJax, touch, and a classroom device. Sampling runs on mount and conic switch only (the graphs cache the polyline), so only the switch rows include it. The deviation estimate is first order and ignores view clipping artifacts. Wall-clock numbers depend on the machine.
