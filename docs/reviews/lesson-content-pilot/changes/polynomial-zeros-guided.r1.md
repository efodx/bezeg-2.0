# polynomial-zeros-guided: changes r0 to r1 (7 steps to 6)

- [besedilo] Summary replaced by the hook question ("Ali to lahko napoveš že iz zapisa?"); the rule paragraph (derivative, degree, p(0)) removed. Reason: finding 1, all three zeros reviews.
- [struktura] Old step 1 (sign prediction, factor argument in the text) replaced by step 1: find which zero crosses and which touches, guess what in the formula decides. Scene unchanged. Reason: finding 1; zeros reluctant "answer given before I predict".
- [struktura] Old step 2 (pre-moved simple zero) replaced by step 2: the student merges zero -2 onto 1 (drag or the position field) after predicting the multiplicity and crossing. Uses the existing default scene, no pre-move. Reason: finding 5; zeros struggling "no action asked", curious "I did not move it".
- [struktura] Old step 4 (triple zero, shown as a ready scene) merged into step 2 above; the `triple` example is no longer used. Reason: same findings.
- [besedilo] Step 3 (derivative) cut to one idea: slope zero means flat, touch or flat crossing. p'', local minimum and the x=-1 aside removed from the explanation; one parenthetical about x=-1 stays in the reveal because the dashed curve shows it. Calculation frame removed. Reason: finding 8, zeros reluctant quit at old step 3.
- [struktura] New step 4: apply the rule to the degree-five polynomial before looking (old step 5 observation turned into a prediction); the multiplicities are in the formula, not the text. Reason: finding 4.
- [besedilo] Step 5 (ends): limit notation and "vodilni člen" replaced by plain "k and the degree"; prediction, then reveal. Reason: zeros struggling "gre p(x)→-∞".
- [struktura] Old step 6 (y-intercept, calculation frame) dropped. Reason: finding 8, zeros curious and struggling "off-topic". The y-intercept stays visible in the readout.
- [struktura] Old step 7 replaced by the payoff: recap of the three rules with the product form, and a challenge (remove the simple zero to get touching only), with a reveal. The long merge instruction is gone. Reason: finding 2.

## Runtime proposals

- None required. All scenes use existing `polynomial-example`, `poly-zero-N` and derivative actions; the challenge uses the zero-list controls (»Odstrani ničlo 1«, »Ničla 1: položaj x«).
- Unverified: that the zero list numbers zeros in order of position, as the old scenes imply (zero 1 = -2).
- The decision to drop the y-intercept is the writer's; the product-form block `poly-intercept` becomes unused.
