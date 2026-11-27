# Math choice control tasks

Source and acceptance: [math choice control](../../specs/math-choice-control.md). Requested by the owner on 2026-11-27.

**Status: not started; owner: later.** Nothing here is scheduled. Do not begin without the owner's go-ahead and answers to the spec's open questions.

## Steps

| Step | Task | Status |
| --- | --- | --- |
| 1 | Confirm the call-site list: open each unverified option list in the spec, record formula or plain text | not started |
| 2 | Prototype `MathChoice` in `src/inputs/` on the Taylor panel: listbox/combobox roles, keyboard, outside-click and Escape | not started |
| 3 | MathJax in trigger and list through `typesetMath`, with flat-text fallback while loading and on failure | not started |
| 4 | `custom` option, `reason`, `help` and the full-text-under-the-control rule, matching `ChoiceSelect` | not started |
| 5 | Unit and interaction tests; keyboard-only walk; accessible-name check | not started |
| 6 | Touch and small screens; `just shot --width 310 --selector <panel>` closed, open and long formula, in both languages | not started |
| 7 | Migrate the confirmed formula call sites, then the verified ones; keep `sl.ts` and `en.ts` in lockstep | not started |
| 8 | Catalogue entry and screenshot in `docs/controls.md`; browser smoke routes; close-out against the spec's acceptance | not started |

Steps 2 to 4 are one worker; step 7 can split by graph family after step 6 passes.
