# W3 R1f UI/a11y review (7e925b59)

1. ReadoutList (ReadoutParts.tsx:17-28): all four compgeo users (Voronoi, Delaunay, Triangulation) pass sentence rows, so only the `ul` branch runs; `aria-label` names it, visible text unchanged. No heading association (aria-labelledby) - label is a separate string. The `dl` branch has no compgeo consumer and `aria-label` on a bare `dl` is weakly exposed; it relies on `.function-readout-row/dt/dd` rules in functions/FunctionReadout.css (not imported by ReadoutParts.css; ReadoutParts.css:1 only zeroes margin). Latent: a chunk without FunctionReadout loads unstyled rows.
2. ReadoutHeading h3 (:33) matches h2 "Tools" (DemonstrationWorkspace.tsx:246) and FunctionReadout h3. Ear clipping result title changes from `h3.inspector-help` to `.inspector-reveals-title`: visible change (larger, bolder, ink colour), intended.
3. ReadoutHelp (:38): plain `p.inspector-help`; sole use Ear clipping reversed note. Fine, content now in LiveReadout.
4. ReadoutScrollTable (:42-57): no consumer yet (dead until used). Logic OK: tabIndex, role=region, name only when scrolling; focus ring in CSS:3. Not checkable in browser; ResizeObserver cleanup fine. Note: first render has scrolls=false, layout effect corrects before paint.
5. CSS: no change visible for the compgeo ul lists (no rules for readout-list-sentences). Euler/Simson/Notable lists keep pointset-list. No coarse/200% effect found.
6. Chips: still `.pointset-status` p.inspector-help, visually unchanged; they lose live semantics, one LiveReadout per graph (euler-live, simson-live, notable-live) carries the same state sentence = single sentence. LiveReadout placed last in the group; check it is visually hidden. Not browser-verified.
7. StepCounter (StepCounter.tsx): "Korak k od n" (sl.ts:2447), "Dogodek k od n" (sl.ts:99), en "Step/Event k of n": consistent. Key `hulltrace_step_counter` keeps hull-specific name (cosmetic). Non-compgeo `*_board_progress` counters not migrated here (out of this commit).

Not verified: browser rendering, screen reader output.
