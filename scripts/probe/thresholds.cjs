// Jank-probe thresholds, ported from the UX-picks prototype (docs/specs/ux-picks-app-wide.md, acceptance 6).
// Frame gaps are rAF-to-rAF in ms. Under CPU throttle the frame limits double and long tasks are only reported.
module.exports = function thresholds(throttle) {
  const slow = throttle > 1;
  return {
    frameP95Ms: slow ? 40 : 20,
    frameMaxMs: slow ? 100 : 50,
    longTasksOver50: slow ? null : 0, // null = reported, not judged
    cls: 0.02,
    flickerEvents: 0,
    valueWidthDriftPx: 1,
    glidesPerStep: 1,
    settleMs: 900,
    backReturnPct: 2,
    coverPct: 35,
  };
};
