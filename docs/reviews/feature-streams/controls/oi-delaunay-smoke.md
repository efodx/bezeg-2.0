# Delaunay single live readout: browser smoke

Scope: Delaunay (`/bezeg-2.0/compgeo/delaunay`) and point-set triangulation (`/bezeg-2.0/compgeo/point-set-triangulation`), Slovenian and English.
Target: `http://localhost:4327/bezeg-2.0/` (production preview, started by the handler). The worker did not verify that this preview serves the stream-controls checkout. Checkout HEAD at review time was `9d6722f2`; working-tree dirty state was not captured (git status timed out).
Browser: Playwright Chromium, headless, 1280x800, fresh context per route and language. No page errors or console errors in any run.
Evidence: `.command-logs/oi-del-smoke/out2-{sl,en}/result.log` and `out3-{sl,en}/result.log` (worker directory).

| # | Check | SL | EN |
|---|---|---|---|
| 1 | Delaunay: exactly one polite readout, alert only during refusal | FAIL | FAIL |
| 2 | Add a site (Add mode, board click): event sentence in readout and visible event paragraph | PASS | PASS |
| 2b | Move a site (drag): event sentence appears | NOT SHOWN (no sentence; step count changes only) | NOT SHOWN |
| 3 | Next step and Play/Pause update the readout | PASS | PASS |
| 4 | Flip with no edge: refusal text shown | PASS | PASS |
| 4b | Flip with no edge: refusal in a `role="alert"` | FAIL (0 alerts; refusal is in a `role="status"` polite region) | FAIL |
| 5 | Point-set triangulation: one live readout, event text updates | FAIL on "exactly one" (2 visible polite regions at rest); PASS on event update via add | same |

Details:
- Check 1: at rest the Delaunay inspector has 2 visible polite regions with non-zero size. One is the readout (`data-delaunay-live`). The other is the always-present `role="status" aria-live="polite"` div in the playback group (`PlaybackButtons`), empty unless a blocked press shows a reason. The DOM also holds 18 empty, zero-size inspector live nodes. A refusal adds a third visible polite region. The count is therefore not "exactly one polite readout".
- Check 2: adding a site through Add mode and a board click produced "Točka P5 leži zunaj ovojnice ..." (EN: "Point P5 lies outside the hull ..."). The same text appeared in the readout and in `data-triangulation="event"`. A drag move did not produce an event sentence on either route; this is observed behaviour, not a failure of the event wiring.
- Check 3: Next step moved "Korak 1 od 4" to "Korak 2 od 4" and the readout followed. During Play the readout was empty (muted), steps advanced from 2 to 4, and after Pause the readout showed the current step with the event sentence.
- Check 4: a disabled flip-edge button ("Zamenjaj rob" / "Flip edge") with no edge selected showed "Najprej izberite rob, ki ga želite zamenjati." / "Choose the edge to flip first." in `data-triangulation="refusal-slot"`. That node sits inside a `role="status" aria-live="polite"` region. No `role="alert"` appeared, so the alert-only refusal design is not in the DOM.
- Check 5: on point-set triangulation, adding a point by click updated the single readout and the event paragraph with identical text (PASS). The "exactly one" count failed for the same reason as check 1: the readout plus a second visible polite region (likely the empty refusal slot; not identified further). The triangulation route also had no event for a drag.

Coverage limits: one refusal case (flip without an edge) on Delaunay; no fortune or other routes; no screenshots taken; no mathematical checks; no physical-device or touch checks; no keyboard-only pass.

Cleanup: the worker's browser contexts and Node scripts all exited; no servers were started or stopped.

## Handler reading (2026-11-10)

Accepted. The change removes the inherited triangulation readout's live region on Delaunay; the only `data-*-live` readout left there is `data-delaunay-live`, as intended by decision 18. The second visible polite region is the playback group's status line (`PlaybackButtons`, step 6), a notice region present on every playback route including point-set triangulation, not a second readout. Refusals render in the existing `refusal-slot` status region, unchanged by this fix; whether a refusal should be `role=alert` is not decided here and stays an open question.
