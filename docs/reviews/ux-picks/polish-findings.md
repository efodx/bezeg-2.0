# UX picks — impeccable polish pass 1 (2026-11-21)

Polish of the kept picks (b1, a1, a19, a3, a29, boardText, dockTools) before planning them app-wide. Evidence: a browser pass at 1440×900, 1024×768 and 390×844 (touch), screenshots and logs in `C:\Users\1337Hacker\Desktop\bezeg-ux-picks\polish\` (outside Git). Contrast measured ≥ 6.46:1 everywhere; no console errors beyond dev-server 404s.

## Owner decisions

- Graph cards: start folded on phones, and solve it generically so more cards can be added: cards dock themselves inside the graph (dock regions along its edges, stacking instead of overlapping), float when dragged, and dock again near a region or on double-click.
- a3 sweep: "Stay in view" — the oscillation swings only over the values that keep the graph on the board.
- Pucks on phones: a row under the graph, built as a generic tray that can carry more objects later.

## Findings and the fix taken

| # | Pick | Finding | Fix |
|---|---|---|---|
| 1 | a1/a3, boardText | Phone targets: ∿ 24px, count −/+ 26px, card grip 16×18, toggle 22px | ≥44px on coarse pointers, ≥24px desktop; SVG icons replace glyphs |
| 2 | boardText | Phone: legend and text cards overlap each other and cover the curve | BoardDock host: docked regions, phone chips (one open at a time) |
| 3 | a3 | Sweep runs c to ±20 within a second; curve leaves the view | Probe-based in-view interval, calmer speed |
| 4 | a1 | Typed out-of-range value turns red with no reason; previews stay while typing | Inline range message; previews hidden while editing |
| 5 | a1 | Drag ruler ~720×80px covers curve and axis labels | Compact ruler anchored to the puck |
| 6 | a19 | Hover tip hides the row's number field | Tip placed clear of the field |
| 7 | a29 | Track target 57×3px; two boxes on count −/+ hover; count wording on a range puck | ≥12px hit area; one box; wording per kind |
| 8 | dockTools | Docked tab is ~53 Tab presses away (after the tools in DOM) | Rendered before the tools in focus order |
| 9 | b1 | Text card shows intermediate values ("f(x)+0,0045") during a morph | Text card holds settled content until the morph ends |
| 10 | a1 | Pucks cover the curve on phones | Phone tray under the board |

Not taken: a card the learner drags over the tools covers them (their own placement).

## Result

- Dock host `src/uxPicks/dock/` (`BoardDock`, `DockItem`, `DockCard`, authored icons): regions `top-start`, `top-end`, `bottom`, `tray`; a new card is one `<DockCard kind title what region>` line. Cards float when dragged and dock again within 48px of the top rail or on a double-click of the head. Phone: cards start as chips, one open at a time; pucks in the tray under the board with ≥44px buttons.
- a3 probes 21 values when a sweep starts and swings over the contiguous in-view run (≥40% of the start's visible points); c on transformations now swings −10..16 instead of ±20. Counts are not probed.
- Impeccable detector: 47 advisory findings, all literal colours and radii outside DESIGN.md tokens in the prototype CSS. Left for the app-wide implementation, which should build these on `--bezeg-shell-*` / `--bezeg-control-*` tokens (or add documented ones).

## Open after pass 1

- Live lesson morph with the text card's hold not watched in a browser; dock not checked in Presentation mode or on a very short board.
- Counts (Bernstein degree) still sweep their whole range.
- Docked lesson tab: 35 Tab presses (now just before the tools; the header, graph toolbar and pucks come first).
