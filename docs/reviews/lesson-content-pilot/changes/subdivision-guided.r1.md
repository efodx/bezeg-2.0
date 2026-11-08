# subdivision-guided: changes r0 to r1

Hook: "Ali lahko Bézierjevo krivuljo razrežeš na dva kosa, ki sta spet Bézierjevi krivulji, ne da bi se oblika spremenila?" (merged-findings, subdivision hook). Steps 5 to 4.

- [besedilo] Title and summary pose the question; summary no longer states the result. Reason: finding 1, 4a in all reviews.
- [besedilo] Step 1: the recurrence \(b_i^r\) is replaced by a plain description of the scheme (midpoints of midpoints). Reason: reluctant and struggling quit point, finding 3.
- [struktura] Old steps 1 and 3 merged into new step 1: follow the left edge of the scheme and count the points, instead of "count rows" and hunting coordinates. Reason: reluctant fix 2, struggling fix 3, finding 6.
- [struktura] Old step 4 becomes step 2 with an action: predict, then press the Subdiviziraj button. The scene no longer pre-cuts; the student cuts. Frame order is explanation, observation, calculation (worked example optional, after the experiment). Reason: reluctant fix 2, curious fix 2, finding 4.
- [struktura] Old step 2 (slider) and old step 5 (uneven cut) merged into new step 3: predict which piece is shorter, then cut at \(t=0{,}3\). The scene no longer cuts. Slider ranges, "t postavi na 1" and the scheme hiding are dropped. Reason: finding 7, curious "step 5 packs three ideas".
- [besedilo] The reparametrization formula moves to an optional calculation frame in step 3; the "(−2,02; 0,78)" value is dropped. Reason: findings 3 and 6, struggling "step 2 notation".
- [struktura] New step 4: answers the hook in three sentences, adds one use ("tesneje se prilega"), and gives a challenge (move a control point of the left piece next to the joint). Reason: finding 2, all three "Ending 1", "4c purpose".
- [besedilo] Single spelling "shema de Casteljauja". Reason: curious and struggling "Tone".

## Runtime proposals / assumptions

- Step 2 and 3 scenes use existing actions only (subdivision-parameter 0,5 and 0,3, no subdivide). Step 4 uses subdivision-parameter 0,5 plus subdivide.
- Assumes the right-hand side is labelled "oranžni del" as in r0 and that control points of the pieces can be dragged (edge case in the source says so). Not verified in the browser.
- The step 4 claim "tesneje se prilega" is visible only after the cut; a proposal is a later highlight of the new polygons in step 4.
