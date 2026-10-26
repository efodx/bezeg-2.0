# Renderer closeout engineering/spec review

Read-only independent review of the current prototype/harness diff, focused verifiers, ADR0018, completed measurement report and tasks05–14, against base `e044790`. Browser/dependency work was excluded; summaries and focused source were reviewed.

One low-severity finding: drag `samples[].state` logged index0 even when the verified narrow Three target was index1. Full raw event snapshots, expected-index final movement, exactly-one-index and fixed-camera checks remain valid, as do timing summaries. The handler corrected the logging expression and disclosed the old raw convenience-field limitation without rewriting historical data or claiming a timing rerun. A focused source-path regression with distinct indices confirms the selected point is now logged; restoring the old expression returns the wrong coordinates.

No material overclaim was found in the reviewed ADR, measurements or tasks05–14. Teapot skips/repeated iso settings, host-contaminated continuous frames, prototype scope and remaining production budgets are disclosed. Handler additionally checked the earlier corrected teapot centroid independently and demonstrated that disabling the mesh-hide probe yields zero differences. The review did not run browsers, establish physical-device behavior or declare production integration accepted.
