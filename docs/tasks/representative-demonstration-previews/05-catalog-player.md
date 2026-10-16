# 05 Share visible looping previews

Source: [spec](../../specs/representative-demonstration-previews.md), owner revision of 2026-10-16 and acceptance 10.

Use one graph-free preview component for catalog, workspace picker and selected homepage carousel layer. Reuse generated poster and motion maps; preserve carousel choices, layout and six-second advancement.

Visible eligible clips loop muted and inline without playback controls. Multiple visible clips may run concurrently. Offscreen, hidden-document and reduced-motion previews have no attached video source. Keep the poster until the first video frame is available and on failure. Each visible session owns cleanup and ignores stale events. Preserve decoded-poster loading, first-three eager/native-lazy behavior and navigation.

Checks cover intersection and visibility gating, reduced motion, failure/rejection, stale events, resource release, concurrent playback, native decoding and shared carousel URLs. Integrated evidence and coverage limits are recorded in [release verification](release-results.md).
