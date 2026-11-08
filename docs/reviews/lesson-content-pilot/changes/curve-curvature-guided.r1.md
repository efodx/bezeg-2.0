# curve-curvature-guided: changes r0 to r1 (7 steps to 6)

- [besedilo] Summary rewritten as the hook ("Zakaj se začetek bolj zavije, in kako to izmerimo?"). Definitions and "Frenetov koordinatni sistem" removed. Reason: shared finding 1, curvature reluctant and struggling intro quits.
- [besedilo] Step 1: prompt now asks for a prediction then a slider reading; the t=0.5 value (0.2357) and the kappa formula removed; the reveal gives a ratio, not two values. Reason: findings 4 and 6; curvature struggling "x', y''" quit.
- [struktura] Old steps 2 and 3 reworked: step 2 now has the frame (T, N) shown from t=0 and asks for the change of the angle on the first and last quarter of t (exact: phi = atan 2t, so about 26.6 and 7.1 degrees); the answer is no longer in the prompt. Reason: finding 4 (curvature curious "Spoiled"), finding 5.
- [besedilo] Step 3 (circle): only the formula R = 1/|kappa| kept; centre formula c = r + N/kappa removed (centre described in words). The R prediction is a prompt with the answer in the reveal. Reason: finding 3, curvature reluctant "formula c=r+... unmotivated".
- [struktura] Old step 4 (parabola, x=0 and x=1, with calculation frame) removed; the parabola now appears only in the last step. Reason: curvature struggling and reluctant "number wall, x to t mapping", finding 6.
- [struktura] Old step 5 (endpoint formula with calculation frame) replaced by new step 4 "Zakaj je začetek bolj zavit?": drag the third control point and watch kappa at t=0; no formula, no calculation frame. It answers the hook. Reason: reluctant quit at old step 5; finding 3.
- [struktura] Inflection moved after the endpoint step (step 5); it starts at t=0.2 so the answer t=0.5 is not shown; "Poskusi tudi premikati kontrolne točke" dropped. Reason: finding 5; curvature curious.
- [struktura] Last step is now the payoff: a four-sentence recap answering the hook, plus a challenge with a reveal. Reason: finding 2.
- [besedilo] Correction: r0's reveal "bližje ko je srednja točka krivulji, večja je ukrivljenost v temenu" is false for the default parabola (control points (-1,1), (0,-1), (1,1): kappa(t=0.5) = 1 - c for the middle point (0,c)). r1 states the right direction (lower middle point, larger kappa).

## Runtime proposals

- None required. All scenes use existing parameter, curve-visibility and fixture actions.
- Optional: a second chapter or optional step could carry the dropped endpoint formula kappa(0) = (n-1)/n * h/a^2 and the centre formula; the lesson goals "preveriš formulo za krajišče" and "središče" are no longer covered by the guided steps.
- Unverified: whether control points show labels (b_0, ...), so the script names points by order and coordinates.

**Handler check (2026-11-08):** With control points \((-1,1),(0,c),(1,1)\): \(x'=2\), \(x''=0\), \(y'(1/2)=0\), \(y''=4-4c\). That gives \(\kappa(1/2)=2(4-4c)/2^3=1-c\), so \(\kappa=2\) at the default \(c=-1\). The middle point is \((1-c)/2\) from the vertex, so curvature grows as the middle point moves *away* from the curve. The r0 reveal is false, and its prompt ("poišči položaj, pri katerem je ukrivljenost največja") has no maximum. This is a defect in the shipped lesson regardless of the pilot.
