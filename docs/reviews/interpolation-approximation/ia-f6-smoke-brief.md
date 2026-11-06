# IA-F6 browser pass: brief (handoff-v12)

- **Role:** smoke, family gate. No source edits, no commits, no pushes. Write only the report and captures named below.
- **Goal:** the browser part of the family 3 gate, which never ran: routes I1 to I5, their chapter and two prompts changed for it. Spec: `docs/specs/interpolation-approximation-lessons.md`. Audit: `docs/reviews/interpolation-approximation/ia-f6-criterion-audit.md`.
- **Scope:** `/bezeg-2.0/learn/interpolation`, `/bezeg-2.0/interpolation/{lagrange,runge,hermite,least-squares,subdivision}`. Not the full checklist. Follow `.agents/skills/smoke-tester/SKILL.md` and the relevant rows of `docs/smoke-tests.md`.
- **Context:** the handler owns the preview on `http://127.0.0.1:4314/bezeg-2.0`, already running a provenance-checked production build of the revision named in the dispatch message. Do not build or stop it. Run Playwright from a script under the job tmp folder named in the dispatch message, and end every script with `browser.close()` in a `finally`, so that no process stays behind. Watch page errors, console errors and failed requests on every page, and say which pages were not watched.
- **Not needed:** the handler runs each lesson's smoke row separately. Walk lessons only where a check says so.
- **Math is typeset lazily:** chapter math appears as raw `\(...\)` until it scrolls into view. Scroll first and wait before calling text raw.

## Checks

1. **Chapter, Slovenian then English.** Six sections, five cards. Every image has non-zero `naturalWidth`. Each card opens its own lesson on the first frame. In the Hermite section, read the sentence with \((0,0)\), \((8,0)\), \((9,0)\), \((9,8)\): quote it in both languages and say whether its math is typeset.
2. **G3 example on the route.** On `/bezeg-2.0/interpolation/hermite`, Catmull-Rom mode, tension 1, uniform parameters, set the four points to \((0,0),(8,0),(9,0),(9,8)\) with the typed point fields. Fit the view if the page offers it. Take a screenshot zoomed to the middle piece and **view it**: is the loop visible? Then set *Parametri točk* to *Po dolžini tetiv*, screenshot and view: is the loop gone? If the board data is reachable, report the lowest \(y\) of the curve (about \(-0.593\) and \(-0.132\)).
3. **Hermite route prompt.** Follow the prompt as a student, in both languages: it names *Vrsta krivulje* / *Curve type*. Quote it, confirm that the control has that name, choose the Hermite curve and drag a tangent handle: the curve changes. Switch back to Catmull-Rom. Report whether anything the prompt says cannot be done.
4. **Controls the chapter strings name.** These strings are not displayed, but they must stay true. Confirm these exist with these exact labels: *Število interpolacijskih točk* can reach six on the Hermite route, *Ročna premica* on the least-squares route can be turned on and set by hand.
5. **Lesson text changed.** Reach these frames and quote the text: the Lagrange lesson's observation prompt about the hull, the subdivision lesson's prompt about the corner at \(P_1\), the least-squares prompt about \(y=2\), and the Hermite free step's expected observation with the four points. Say whether the math is typeset.
6. **Each route, Slovenian then English, 1440×900.** Default scene draws, the main control acts: drag a point on I1, I3, I4, I5; change the degree or node rule on I2. Report one observed value each. Live language switch on each: text changes, the board does not move.
7. **Keyboard and 200% text.** On `hermite` and `least-squares`: Tab from the top, report whether all controls can be reached and focus is visible. At 1440×900 and 390×844 with the root font size at 200%, report `scrollWidth` against the viewport and any clipped text.
8. **Phone, 390×844.** On `lagrange` and `subdivision`: no horizontal overflow, a touch drag moves a point. Say what you could not do.
9. **Preset round trip and disposal.** On `hermite`: drag, save a Preset, change, restore; points and mode return. Go between `hermite` and `least-squares` three times with a drag each: no page error, and point counts on the board stay stable.

## Return

Reply in at most 40 lines: one line per check (passed, failed, not run) with the observed value. Put any failure first, with the expected and the observed value. A failure of expectation is not always a defect: if the brief's expectation may be the wrong one, say so. Write the full report to `docs/reviews/interpolation-approximation/ia-f6-smoke.md` and screenshots to the job tmp folder named in the dispatch message. Do not commit.

Budget: past about 30 turns, or on `HANDOFF`, stop, write what you have to that report, and return it as partial.
