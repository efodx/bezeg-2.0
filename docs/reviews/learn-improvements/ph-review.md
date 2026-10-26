# PH content review

Review of the PH-only `familyChapters.ts` / `familyChapters.test.ts` diff at `d9107fa`.

No blockers found. The worked example is internally consistent: integrating \(z'(t)=(1+it)^2\) from the origin gives \(r(t)=(t-t^3/3,t^2)\), endpoints \((0,0)\) and \((2/3,1)\), speed \(1+t^2\) on \([0,1]\), and length \(4/3\). The translation statement preserves derivative, speed, and length; the signed-speed caveat is correct. Both languages convey the same derivation and qualifications.

The offset definition uses a clearly chosen left normal, restricts it to regular points, and correctly treats opposite signs and \(d=0\). It does not claim offsets are generally polynomial. It distinguishes source-curve regularity from offset cusps and self-intersections, and does not claim the source PH property guarantees global offset regularity.

Control/link correspondence checked against `BasePhBezierCurveGraph` and `PhBezierCurveControls`: Display exposes the offset toggle; Edit exposes distance and count only after offsets are enabled. The separate hodograph board displays the generating points; the prose does not promise a plotted hodograph or a loaded worked example. Catalog recipes use one offset at `d=0.35` / `d=0.5`; viewed captures match green source, blue offset and orange points, with the quintic offset outside. Captions distinguish both captures from the origin-based calculation.

The added test is non-vacuous: worker evidence records that the new test failed before the content change at the missing `arc-length-problem/ph-cubic` Slovenian prompt. Assertions also pin key worked values, both figure assets, bilingual captions and offset caveats. Review was source/math/control/image focused; no browser or build run was needed for this review.

Follow-up: the handler identified an ambiguous pre-existing sentence equating squared speed with the squared modulus of the generating polynomial. Independent re-review confirmed that for z'=w², |z'|²=|w|⁴ whereas speed=|z'|=|w|². The handler's bilingual replacement writes w=a+ib and speed=|z'|=|w|²=a²+b² explicitly. This closes the source finding; final tests/build and bilingual browser typesetting were repeated.
