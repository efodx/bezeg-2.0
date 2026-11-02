# Review 16 (math/readouts): monotone partition graph

Verdict: no blocker. Types, reason texts (both languages), status order, diagonals, pieces/balance, step indexing check out.

## Should
- monotonePartitionRun.ts:10-12, :107-111 (view); MonotonePartitionControls.tsx status list: at the pop of a regular vertex with interior to its left and no merge helper, the kernel attaches setHelper to the pop event, so the panel shows the helper already as v while the note only says "process vertex v". With a merge helper the old helper shows at the pop and the new one one step later (after the diagonal). Inconsistent between cases, and the spec step (4)/(5) reads "status holds edge with helper; diagonals drawn at the event". The view shows kernel state faithfully, so it is not wrong, but it misleads: the new helper appears before the status search/diagonal check. Expected: either a one-line panel/doc note, or (kernel owner) attach the helper change after the search. Documented only in code comment and a test, not to the student.
- monotonePartitionRun.test.ts:61-71: the clockwise test only checks type counts and diagonals length, not that diagonals equal the forward run's under index mapping (i -> n-1-i). Acceptance 4/spec "clockwise gives same diagonals" is unasserted.

## Nit
- sl.ts:1886-1890 / en.ts:1887-1891 reason texts say "below/above" though the kernel means "later/earlier in processing order"; at equal height (horizontal edge) the neighbour is not geometrically below. order_rule states the tie rule but the reason line does not; could append or link.
- Edge names for clockwise input: edge ek runs k -> k-1 (kernel ccw successor), while refusal messages name input edges k -> k+1. Consistent inside the run (edgeEnds), but differs from the refusal convention.

## Checked, no finding
- Types shown = result.types / partitionStateAt; current-vertex edges (own edge id=v, incoming pred(v), edges whose helper is v) match kernel edge ids incl. reversed (pred/succ same as kernel).
- Reason texts: start/end convex, split/merge reflex, regular one above/one below; correct in sl and en.
- Status order left to right from sweepState status; step i/N = trace index, N = length-1, step 0 = phase, last = done.
- Summary pieces = run.pieces.length and diagonals = run.diagonals.length; balance from typeCounts, computed not hard-coded.
- Not verified: ran no tests/browser.
