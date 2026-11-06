# IA-F6: family 3 gate

**Passed locally; hosted CI of this push is not yet read.** Family 3 (I1 to I5) closes when that run succeeds. Handler 68, 2026-11-06. Audit: [criterion audit](ia-f6-criterion-audit.md). Browser: [report](ia-f6-smoke.md), [brief](ia-f6-smoke-brief.md).

## Audit gaps

| Gap | Disposition |
| --- | --- |
| G1, Hermite prompts | The route prompt is displayed and was wrong for the default mode: fixed, `a8c66fa8`, it names *Vrsta krivulje*. The chapter string is not displayed (see below); corrected too |
| G2, I4 chapter prompt | Not displayed; corrected, `a8c66fa8`. The route prompt was already true |
| G3, I3 acceptance 2 | Closed, `a8c66fa8`, `1f93be07`: the example below is in the chapter and the lesson's free step, with kernel and prose tests |
| G4, weak pins | Closed for I3 and I4, `a8c66fa8`: the pins read their own section |
| G5, G6 | Carried, low. No real-board test of I1's board text after a language change; nothing fails if the plotted curve moves to a monomial solve |

**Chapter prompts are displayed nowhere.** A script read the chapter, both routes and both `?explore=` URLs on a production build: neither I3 nor I4 `investigationPrompts` string appeared. Chapter cards show the lesson's first observation prompt, and `?explore=` opens the route. The code still reads the strings, so they stay true.

## The G3 example

Points \((0,0),(8,0),(9,0),(9,8)\), tension 1. On the middle piece \(y(u)=m(u^3-u^2)\), lowest at \(u=\tfrac23\).

| Parameters | \(m\) | Lowest \(y\) | Loop |
| --- | --- | --- | --- |
| Uniform | \(4\) | \(-\tfrac{16}{27}\approx-0.593\) | Yes: the sampled curve crosses itself |
| Chord length | \(\tfrac89\) | \(-\tfrac{32}{243}\approx-0.132\) | No: \(x\) increases along the piece |

The browser pass viewed both on the route: a loop, then none. The board's sampled lowest points were \(-0.584\) and \(-0.1317\); the uniform value is above the exact one because the board samples coarsely.

Typing the points from the first leaves Point 4 at \((9,0)\) for a moment, on top of Point 3, so the move is refused with the `role="alert"` notice. That is the zero-chord rule, not a defect, so the lesson says to start from the last point.

## Found by this gate

- **Point rows overflowed at 200% text.** Fixed, `1f93be07`: 568 px rows past a 280 px panel, on all five routes that share `PointListInput`. `least-squares` and `correlation` scrolled the page (1660 against 1440), all five at 390 wide (596 against 390). Rows were 4 px over at normal size too. Measured on the production build of `1f93be07`: every row ends at its panel's edge at 1440 and 390, at 100% and 200%, and stays 40 px tall at 100%.
- **`expectedObservations` are rendered by nothing.** A sentence added there first was invisible; it moved to the observation prompt. See the [owner note](../feature-streams/curves/handler-handoff-68.md#open-for-the-owner).
- **Three Slovenian slips on chapter cards.** Fixed, `a8c66fa8`: "Obleci si napoved", "rezemo", "ravnino" for a line.

## Browser pass

Production preview of `a8c66fa8`, clean, by `bezeg-smoke` Sonnet. No page error, console error or failed request. Seven of nine checks passed outright. Check 7's overflow is fixed above, and the page was not walked again after that fix. Check 9 restored mode and points, but its saved drag moved a tangent handle, so saved points equalled the defaults. Notable results:

| Check | Result |
| --- | --- |
| Chapter, SL and EN | Six sections, five cards, each opens its lesson on the first frame; the new sentence typeset |
| Route prompt followed as a student | Possible in both languages |
| Each route | Main control acts; a live language switch leaves the board unchanged, on all five |
| Keyboard | Focus visible; 36 of 37 and 34 of 36 focusable elements reached, the gaps not investigated |
| Phone 390×844 | No overflow on `lagrange` and `subdivision`; a touch drag moved a point |
| Disposal | Three route round trips with drags: object counts stable |

`1f93be07` was not walked: its lesson prompt text and the row layout were checked by unit tests and the measurement above.

## Carried polish

- At 200% text the shared slider value box passes the panel on `lagrange` (page 412 against 390 at phone width; at 1440 it passes the panel without page overflow). The same box is in [AB-C-6's polish](../advanced-bezier/ab-c-6-gate.md#carried-polish).
- *Vrsta krivulje* truncates its value at 200% text ("Catmull-Romov").
- I1's chapter string does not name the hull toggle (not displayed).

## Checks

| Check | Revision | Result |
| --- | --- | --- |
| `just check` | `1f93be07`, clean | Exit 0, 1093 s, build passed |
| `just smoke-lesson` for the five lessons | `a8c66fa8` | Passed |
| Hosted CI | This push | **Not yet read** |
| Hosted CI | `44da1664` | Success: run 42206706487. Conclusion read, not each job. Closes handoff 67's item |

## Not covered

Pinch zoom, touch on tangent handles, the drawn manual line, a Preset with moved points, a screen reader, other browsers.
