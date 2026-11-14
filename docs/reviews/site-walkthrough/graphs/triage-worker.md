# Triage worker note (batch T)

Stopped after the full pass, not at a partial one: the HANDOFF signal arrived when the table was generated and written. Result: `blocker-triage.md` (118 rows, grouped by batch).

Not covered: the 7 surface captures were not scraped (spec and poster only); `voronoi-degenerate` and `epicycles` could not be read because their recipe actions fail on the 4333 build (no button "Trapez" / "Povečaj N za 1"); `affine`'s control kind was not examined; "frame loses" is judged from the readout text and the spec reason, not from each row's lesson quote. The recipe-scene scrape used a 1440×850 context at scale 1 and not the capture's exact context, so a text object clipped out of the 720×440 frame can appear in the table.

Scratch under `.command-logs/h2-triage/` (scripts, scrape JSON, generator). No source file was edited.
