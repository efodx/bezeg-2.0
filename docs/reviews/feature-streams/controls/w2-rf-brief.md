# Wave 2 repair RF: functions review findings

Read `w2-fc-common-brief.md` (rules, checks, return). Findings: `w2-fr.md` (functions review) and `w2-fcu.md` items 5–6. The sweep is committed (`d7752af6`); your changes are a repair on top.

**Owned:** `src/graphs/functions/**` and tests, `src/graphs/base/controls/guard.ts` and `guard.test.ts` (one optional addition), the function keys in `sl.ts`/`en.ts`. Worker RK edits `src/inputs/BooleanField.tsx`/`OnOffSwitch.tsx` and, in `RungeInterpolationGraph.tsx`, only the semicircle switch's props: re-read that file before each edit and leave that switch to RK.

**Handler decisions:**
1. **A typed value is refused in one place: its field (decision 14).** For handlers wired to a typed field (`NumberInput` `onChange`, `Slider`'s exact field, `CountSetter` `onSet`) a model refusal returns `false` so the field shows its hint, and nothing goes to the `RefusalChannel`; an accepted value still clears the channel. Add the smallest helper to `guard.ts` for this (for example `guardField(channel, fn)`: clears on accept, returns false on `DomainError` without refusing), with a `guard.test.ts` case that fails first. Selects, buttons, steppers' −/+ and drags keep `guard` and the channel. Apply to every site in `w2-fr.md` finding 1 and Epicycle `attempt` where it serves a typed field. Add one test that a typed cross-field refusal (UniformConvergence x/r) shows in exactly one place.
2. **Specific typed hints come back.** Pass the model's hint (`darboux_n_rejected_hint`, `fourier_n_rejected_hint`, and the Taylor, Uniform, Runge equivalents if they exist) as `CountSetter`'s `rejectedHint`; restore an assertion for it (Darboux).
3. **Darboux** uses `guard` instead of `ignoreOutOfDomain`; the Refine reason appears once (keep the visible help paragraph linked to the `UnavailableButton`; the blocked press does not also refuse into the channel, or the help paragraph goes: pick one and say which).
4. **Epicycle `attemptDrag`:** a reason-less `DomainError` stays silent, as at HEAD; no raw English message.
5. **Weak assertions:** Epicycle `expect(refusal()).not.toBe('')` asserts the message; Quadrature's null check keeps a positive companion in the same test.
6. **ConicFocal:** `conic_weight_needs_bridge` shown once (`reasonShownElsewhere` on one of the two controls, or one linked help). **Label:** the matched-weight button reads "Nastavi prilegajočo utež" / "Set the matching weight" (new key named after the text; old deleted).

**Checks:** `just unit src/graphs/functions src/graphs/base/controls`, function lesson unit tests (`src/learning` files naming taylor, uniform, fourier, runge, darboux, epicycle, conic, zeros, rational), `just lint` and `just typecheck`. Observed failure first for each new assertion (deliberate mutation; never `git stash`). Append evidence to `w2-f3.md` under "Repair RF". Return ≤250 words.
