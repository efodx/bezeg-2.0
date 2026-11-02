# 12b perf note (jsdom harness, 40 points, 20 moves)
- store write + retriangulate only (movePointTo, no React/board): 0.9-1.3 ms per move.
- geometry alone: createTriangulation 0.36 ms, incrementalTriangulation 0.52 ms, angleVector 0.13 ms.
- full move through act (React panel + board redraw, shimmed JSXGraph): 75-84 ms plain, 141 ms with edges+angles overlays.
- creating the ~76 edge curves alone: 37 ms per redraw in the harness.
The harness figure is dominated by jsdom/JSXGraph object creation; a browser drag measurement was not taken. The automated test asserts only the model-edit path (<16 ms).
