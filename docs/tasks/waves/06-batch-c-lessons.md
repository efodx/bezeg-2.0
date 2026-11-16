# 06 Batch C: WV4–WV5 lessons (F3–F6)

Source: [waves spec](../../specs/waves-sampling-lessons.md), concept contracts WV4–WV5, and the [batch-wide acceptance gate](../../specs/waves-sampling-lessons.md#batch-wide-acceptance-gate). Graph: the waves graph, route `/functions/waves`. Depends on 05 (Batch B released).

Slices F3–F6 as in [04](04-batch-a-lessons.md); the lessons join the chapter of task 04.

Acceptance: the spec's acceptance for WV4–WV5; every number quoted in lesson text matches the scene; scene actions tested in one synchronous sequence and restore on exit returns the free state; notation test, `tsc`, scene sweeps and the production build pass; the trigonometric function and Fourier routes behave as before.

Status: F3 WV4 and WV5 written and joined, F4 cards captured, sampling layout fixed (`9e4fb39f`), F5 no new clip, F6 gate passed (handler 36: `just check` green at `9941c536`, live smoke `.command-logs/waves-c/smoke/report.md`, gate smoke `.command-logs/waves-c/f6/report.md` 8/8 with Batch C extras, layout recheck `.command-logs/waves-c/recheck/report.md`); waves family complete (A-C).
