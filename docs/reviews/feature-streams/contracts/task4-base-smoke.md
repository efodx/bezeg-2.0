# Task 4 base smoke (production build, d07f58c8 dirty)
Suite: 494 passed, 1 failed (bspline-nurbs sl walk: net::ERR_NO_BUFFER_SPACE, panel never appeared). Isolated rerun `SMOKE_PORT=4318 just smoke-lesson bspline-nurbs` passed.
Browser checks (scripts in .claude/jobs/pw/, preview on 4320): routes linear, binomial-normal, taylor, fourier-series, complex-reciprocal/roots/multiplication, linear-map, bisection, geometric-series: edit, drag, language, reset OK, no console errors.
Preset round trip + export (flat graphState, no model key; extra top-level "data" key present) + import OK on linear and binomial-normal. Lesson Next/Back/exit OK on linear, taylor. Remount OK on 5 pairs.
