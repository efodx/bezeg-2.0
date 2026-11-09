# W3 R2a evidence
Observed failures (fix reverted, test run, restored); logs `.command-logs/w3-r2a-mut-*.log`:
- Voronoi atExample overlays (new test): failed with old delaunay-only check.
- ResetExampleButton reason: failed with reason forced undefined.
- ChoiceSelect refused-change status (new) and aria-disabled: each failed when removed.
- Linear map identity reason: failed with reason forced undefined.
- ComplexRoots CountSetter onSet: failed with onSet a no-op.
- B-spline Insertion/Extraction/Nurbs availability (new tests): failed with atOrigin forced true.
- P2b end guard (new test, restore-to-end outside advance): failed (with the existing empty-run test) when `|| this.atEnd` was removed from nextStep/play.
