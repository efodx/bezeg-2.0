# bezier-pilot: changes r1 to r2

Structure unchanged (4 steps). Source for each line: round-2 findings.

- [besedilo] Summary opens with a real use (fonts, pen tool) and asks "skozi koliko točk gre", not "gre skozi samo dve". Reason: rule 12, reluctant fix 3, purpose finding.
- [besedilo] Points are named \(p_0\) to \(p_3\), as the graph labels them (PointStyles `pi`). Reason: anchoring finding.
- [besedilo] Step 2 says the start points are corners of a rectangle, so the hull is a rectangle, and that the hull changes when points move. Reason: reluctant, "the rectangle does not match the rubber band".
- [besedilo] Step 3: "vleče" replaced by "vpliva" and "teža" defined in words; the point is named by its on-screen label \(B(\tfrac12)\); the prompt asks for a prediction first and a similar drag distance for both points; "uteženo povprečje" is defined in the calculation frame. Reason: struggling "vleče", curious fix 2, reluctant fix 2.
- [besedilo] Step 4 recap starts "Skozi dve od štirih točk" and ties back to the hook (rule 13). Reason: finding 3.
- [struktura] Step 4 challenge changed from "points on a line" to "swap \(p_1\) and \(p_2\) so the polygon sides cross": the curve forms a loop but stays in the hull. Reason: reluctant "the line challenge is busywork".

## Runtime proposals

- Konec screen: allow a lesson-specific closing line and next step (for example a recap sentence and a link to the next lesson), replacing the generic "Končni prizor je pripravljen". Reason: finding 4, caps Ending at 2.
- Optional: draw thicker segments from \(B(\tfrac12)\) to each control point in step 3, proportional to the weight.

## Not confirmed

Whether the lesson graph labels points `p_i` (lowercase) rather than `P_i`; the hull colour; the position of the hull on screen.
