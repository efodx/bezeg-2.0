# Combinatorics: BigInt counts, a 12-step enumeration cap, two graphs

Accepted on 2026-11-10 (F0 of the [combinatorics spec](../specs/combinatorics-lessons.md), stream `families-prep`). It records the spec's three ADR decisions.

## 1. BigInt for every count

Every count (factorial, binomial, variations, multinomial, lattice paths, Pascal rows, expansion coefficients) is a `bigint`. Readouts show the exact digits, with thousands separators added only for display. Presets store counts nowhere. Where a number must be stored, such as an input, it is a small validated integer, and any large value is a decimal string. Doubles are used only for probabilities and bar heights, which are labelled computed.

The reason is that a double Pascal recurrence is exact only up to row 56. From row 57 entries pass \(2^{53}\), and \(\binom{60}{30}=118264581564861424\) comes out as \(118264581564861420\). The tests include this value.

Alternatives:

- Doubles with a warning above \(2^{53}\). This shows wrong digits in a family whose subject is exact counting.
- BigInt only above a threshold. This creates two code paths and a boundary that must be tested in both.

## 2. Enumeration cap of 12 steps

`enumeratePaths(a, b)` draws every path while \(a+b\le12\), which is at most \(\binom{12}{6}=924\) paths, and throws above that. The graph then shows only the count and tells the learner the cap ("prikažemo vse poti do 12 korakov"). The cap is an exported kernel constant. Performance is measured at 924 drawn paths before the drawing approach is chosen.

Alternatives:

- A cap by path count, at most 3432 (\(n=14\)). Whether a target is drawn would then depend on its shape rather than on the step count the learner sees.
- Never enumerating and sampling instead. This loses the one-to-one picture that CB1 and CB3 argue from.

## 3. Two graphs

There are two new graphs. `LatticePathGraph` serves CB1, CB3 and CB4 and has a triangle view. `CountingTreeGraph` serves CB2 and the CB5 table. Each holds its own validated state. Routes are placed in the catalog at F2b; the proposal is a new *Kombinatorika* family next to the probability routes. Bernstein and binomial routes are unchanged and are only linked from CB5.

Alternatives:

- One graph with modes. It would mix a lattice state with a tree and table state that share no handles.
- Extending `BernsteinGraph` or the binomial graph. This would change existing routes and stored Presets.

## Consequences

- Additive only. No route, Preset or existing graph changes.
- The pure kernel lives in `src/combinatorics/`, free of React, JSXGraph and localization. `src/analysis/distributions.ts` stays double-based, and the kernel is its exact oracle in tests only.
- F2a waits on Controls step 5, because paged lists and steppers are what that step sweeps ([boundary](../tasks/feature-streams/families-prep.md#boundary-with-the-controls-stream-owner-decision-2026-11-10)).
