# curve-curvature-guided: changes r1 to r2 (6 steps, same structure)

- [besedilo] Summary and step 1 add purpose: road and railway curves, a jump in curvature felt as a jolt; step 1 says "predstavljaj si, da je krivulja cesta"; step 5 adds the transition curve (prehodnica). Reason: round-2 finding 2, reluctant "why care".
- [besedilo] Anchoring: step 1 names the readout "v levem zgornjem kotu grafa" with the real label »Ukrivljenost κ« (sl.ts `curvature_kappa_value`); step 3 names the line »Krivinski polmer R«; T is the solid arrow, N the dashed one, both tagged with letters (CurvatureOverlay.ts); inflection shows the dashed line and the status text. Reason: finding 1, struggling.
- [struktura] Step 2: angle φ and the "read, subtract" task removed; the student watches arrow T turn. Reason: reluctant quit at the angle chore, struggling "five symbols".
- [struktura] Step 3: formula block removed. The student multiplies κ and R at both ends and finds 1; R=1/|κ| appears only in the reveal, with |κ| explained. Reason: curious and reluctant "formula before wonder".
- [besedilo] Step 5 opens with "Na grafu je zdaj druga krivulja"; the S-curve start is t=0.2 as before. Reason: struggling "scene changes without warning".
- [besedilo] Step 6 now starts "Zakaj ...? Zato, ker ...", answering the hook through the third control point (the true cause: kappa(0) is proportional to its distance from the line through the first two points). Reason: finding 3.

## Unconfirmed labels

- Control points: the demo creates them without explicit names and point labels are on by default; their on-screen names are not confirmed, so the text identifies them by order and coordinates.
- The slider »Parameter t« is in the Edit group (code comment); that the tab is called »Uredi« is inferred from sl.ts `edit`.

## Runtime proposals

- Replace the generic "Končni prizor je pripravljen" screen with a per-lesson closing text (field `closing`), so the payoff and challenge can sit there instead of in the last step.
- Offer a per-step highlight of the readout (or a "Opazuj na grafu" frame action) so text can point at the corner readout.

**Handler math check (2026-11-08):** \(\kappa(0)=\tfrac{2}{3}\,|\Delta b_0\times\Delta b_1|/|\Delta b_0|^3=\tfrac23\) for \((0,0),(1,0),(2,1),(3,3)\). It depends only on \(b_0,b_1,b_2\), so the step-4 reveal ("četrta točka ne vpliva") is correct. \(\kappa(1)=\tfrac23\cdot1/5^{3/2}\approx0{,}060\), and the radius ratio \(5^{3/2}\approx11{,}2\) matches "približno 11-krat". The recap's "Zato, ker" is true but partial: the end is flat mainly because the last polygon leg is long (\(|\Delta b_2|=\sqrt5\)). That is an acceptable simplification and the owner may choose to keep it.
