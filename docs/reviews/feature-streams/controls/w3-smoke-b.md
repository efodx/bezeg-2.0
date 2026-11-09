# Wave 3 smoke, Group B (reveals, Linear map switches, angle sliders) - PARTIAL

Status: partial. Stopped at the project budget signal (HANDOFF). Coverage gaps are listed below.

## Run details

- Preview: `http://localhost:4327/bezeg-2.0/`, production build of commit `d0a72a48` (not started or stopped by this worker; ownership per handler brief).
- Checkout: worktree `stream-controls`, HEAD `d0a72a48`, dirty (docs only: `state.md`, `shared-graph-controls.md`, untracked `w3-*` review files).
- Browser: Playwright Chromium headless shell, desktop 1280x800; mobile 390x844 with `hasTouch`/`isMobile`.
- Script and capture: `.command-logs/w3-smoke-b/run.cjs` (final run), `results.jsonl`, `run.log`, screenshots `*-desktop.png` and `*-390.png`. `probe.cjs` is a one-off DOM probe.
- Elapsed: about 35 minutes including three superseded runs (board selector and locator bugs, fixed).
- Cleanup: the final run closed every context and the browser in `finally` and exited 0. No process from this run remains.
- Console: only `console` error and `pageerror` events were captured; none on any route.

## Route x check (final run)

| Route | 1 load | 2 control | 3 unavail. | 4 keyboard | 5 language |
| --- | --- | --- | --- | --- | --- |
| /analysis/taylor | passed | reveal passed | n/a | passed (Tab x31, Enter, Space) | passed |
| /analysis/darboux | passed | 2 reveals passed | n/a | passed | passed |
| /analysis/mean-value | passed | passed | n/a | passed | passed |
| /analysis/sequence | passed | passed (board unchanged, see note) | n/a | passed | passed |
| /complex-multiplication | passed | 2 reveals passed | n/a | passed | passed |
| /complex-roots | passed | 3 reveals passed | n/a | passed | passed |
| /linear-map | passed | 3 switches passed (board changed) | n/a | passed (Space toggles) | passed |
| /simson-line | passed | angle passed (arrows, Shift, Page, field Enter, wrap) | n/a | passed (arrows) | passed |
| /inscribed-angle | passed | angle passed | n/a | passed | passed |
| /inversion | passed | BLOCKED (field locator timed out) | not run | not run | not run |

Mobile 390x844 touch:

| Route | Check | Result |
| --- | --- | --- |
| /analysis/taylor | reveal 324x44, hit-test ok, tap toggles | passed |
| /analysis/taylor | horizontal overflow | 0 px, passed |
| /inversion | horizontal overflow | 0 px, passed |
| /inversion | angle slider reachable | FAILED as measured: range not visible (`h=n/a`, hit=false) after scroll with 3 s timeout |

## Failures and gaps

1. `/inversion` angle slider at 390x844: the range is not visible or reachable in the measured state. Repro: open `/inversion` at 390x844 with touch, scroll to the range. Needs a manual look; it may sit in a collapsed disclosure, which would make this a measurement artifact.
2. `/inversion` desktop check 2 (angle): the degree field locator (nearest ancestor with a text input) timed out, so checks 2 (angle), 4 and 5 did not run for this route. Coverage gap. Rerun with a corrected field locator.
3. `/analysis/taylor` mobile "angle slider" line in the run is a script misapplication: Taylor's range is a parameter slider, not an angle slider. Treat as not applicable.
4. `/analysis/sequence`: reveal toggles the label and the `data-revealed` state, but the `svg` inside `.workspace-graph` does not change. The result may render outside that element. Not verified against the board; reported as observed.
5. Reveal results on mobile: only `/analysis/taylor` covered. The brief's second 390x844 route for Group B is `/inversion`, which has no reveal, so the 44 px reveal check is covered once.
6. Check 3 is marked n/a for all routes, as the Group B brief has no unavailable state.
7. The board-change test uses a hash of `.workspace-graph svg` outerHTML. A change reported as "board changed" is evidence of a change; "UNCHANGED" is not proof that nothing changed on a non-SVG surface.
8. The language check compares reveal labels, switch labels and slider labels, plus reveal state. It does not check the full inspector text.

## Not covered

- Not verified: mathematical correctness of the revealed results.
- Not covered: `/inversion` checks 2 (angle), 4 and 5 (see gap 2).
- Not covered: physical-device behavior, comprehensive accessibility (focus visibility was measured as `outline solid 3px` only).
