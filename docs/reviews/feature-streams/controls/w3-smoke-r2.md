# W3 smoke recheck R2

- Preview: http://localhost:4327/bezeg-2.0/ (production-style preview, responded HTTP 200 at run start; not started or stopped by this run)
- Checkout: `.claude/worktrees/stream-controls`, HEAD 30376aa5, working tree clean at start
- Browser: Playwright Chromium headless, 1280x800, locale sl-SI, fresh context per route, Slovenian UI
- Scripts and evidence: `.command-logs/w3-smoke-r2/` (run.cjs, results.json, run.log, probe*.cjs/log, screenshots)
- Cleanup: each browser context closed in `finally`; no app data created or changed

## Results

| # | Route / check | Status | Observed evidence |
| --- | --- | --- | --- |
| 1 | euler-method, next-step to last, extra press | Passed | `next-step` clicked 2 times until `aria-disabled="true"`. Readout at last: "Prikazan je 1. korak od 2" (step 2 of 2 shown in readout before the extra press). Button focused (`data-action=next-step` is activeElement) before and after an Enter press. One Enter press made "Ni več korakov." appear once in visible text and in a status region. Readout before and after the press identical (no wrap to step 1). Errors: none. |
| 2 | sweep-algorithms, Inspect group "Korakanje po pometanju" | Passed | One matching group. DOM order: Prejšnji korak (previous-step, aria-disabled true), Naslednji korak (next-step), Predvajaj (play-pause, data-playing false), Nova razporeditev (new-arrangement). Tab from Previous: next-step, play-pause, new-arrangement. Play presses: before false, after true; before true, after false. Errors: none. |
| 3 | voronoi, Reset example unavailable, enable by overlay toggle, press | Partial / blocked | On load: one "Ponastavi primer" button, aria-disabled="true", title "Prizor je že enak primeru.". Not completed: the overlay toggle could not be identified. The Prikaz group (opened by the "Prikaz" button, aria-pressed true) contains only a Slovenian-axes select (Brez/Osi/Osi in mreža/Osi in mreža in črtice/Vse), spinbutton and range input; no switch or checkbox. Toggling that select was not performed because it is not verified as the "diagram overlay switch". Enable and re-disable steps unverified. |
| 4 | point-set-triangulation, edge select after "Počisti vse točke" | Failed (announcement part) | Select "Izbrani rob" is a `SELECT` with aria-disabled="true", value "" before and after ArrowDown; focus stays on the select; ArrowDown does not change the value (pass). The text "Ni robov za izbiro." is visible once in the page (`P` inside a FORM and `div[role=group]`), but no `role=status` or `aria-live=polite` element contains it: 8 role=status elements exist and none holds this text, before or after ArrowDown. Expected: announced once in a polite status region; observed: not announced through one. Repro: open /bezeg-2.0/compgeo/point-set-triangulation, Slovenian UI, press "Počisti vse točke", focus the Izbrani rob select, press ArrowDown, then inspect role=status/aria-live elements. |

## Failures first

1. Item 4: the unavailable-edge reason is visible but not inside a polite status region, so it is not announced as the brief requires. Screenshot: `.command-logs/w3-smoke-r2/item4-triangulation-edge.png`.

## Coverage gaps

- Item 3 incomplete (see above): the overlay switch must be named by the handler or the brief before the enable/disable sequence can be checked.
- Item 2 Tab order was checked from the Previous button; no visible-focus assessment.
- No screenshots were opened by this worker; they are capture-only.
- Single headless run per check; no repeat runs.
