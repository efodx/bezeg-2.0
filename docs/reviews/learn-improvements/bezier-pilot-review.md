# Bézier pilot review

Final narrow recheck against the updated section 5 and current bilingual copy; no tests or browser checks run.

The notation finding is resolved: the parameter prompt now names the left and right endpoints, and the Bernstein prompt spells out “one” and “zero.” I found no other undelimited variables or formulas in the changed copy. The parameter post-activity text now compares what one parameter value means across different curves; the affine post-activity text distinguishes reshaping through one control from applying one map to all controls. Both are focused interpretations and are equivalent in Slovenian and English.

The ordering concern is resolved by the spec’s explicit boundary: the earlier parameter activity remains before the derivation because point selection precedes construction; the quadratic derivation comes before the repeated-interpolation quartic exploration and explicitly bridges back to five controls.

No remaining finding in this narrow recheck. The earlier mathematical review found the quadratic expansion, cubic midpoint rows and weights, partition-of-unity argument, representation-degree caveat, convex-hull claim, affine argument, and activity/control descriptions accurate. Browser usability and final acceptance checks remain outside this review.
