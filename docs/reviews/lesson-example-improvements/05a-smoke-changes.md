# 05a smoke spec changes (for the handler to apply)

File: `tests/guided-lessons.smoke.spec.cjs` (not edited by the worker). Both lessons now open with 3 samples set by scene actions, so `samplesByStep` step 1 is 3, not the route default 10. Step counts (5), `exitStep: 3` (still 3 samples) and `reentryStep: 4` stay valid; `assertBaseline` (route default 10 after exit) is unaffected.

Weighted row (`weighted`, id `param-weighted`):

```
-    samplesByStep: [10, 3, 3, 3, 20],
+    samplesByStep: [3, 3, 3, 10, 20],
```

Uniform row (`uniformPh`, id `param-uniform-ph`):

```
-    samplesByStep: [10, 10, 3, 20, 10],
+    samplesByStep: [3, 3, 3, 10, 10],
```

Step ids changed (weighted): `wp-default`/`wp-rule` scene ids replaced; steps are now `wp-same-curve`, `wp-quarter-calculation`, `wp-symmetry-step`, `wp-density-ten` (new), `wp-density`. Uniform step ids are unchanged; scene ids `up-uniform-twenty-scene` and `up-weighted-quarter` became `up-uniform-ten-scene` and `up-weighted-contrast-ten`. Nothing in the spec references these ids.

Manual smoke points: weighted step 4 shows 10 markers at alpha 1/4; uniform step 1 shows weighted mode with 3 markers (mode select must read Weighted); uniform step 4 switches to Uniform at 10, step 5 back to Weighted alpha 1/2 at 10.
