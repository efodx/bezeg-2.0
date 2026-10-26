# Content acceptance: guided examples

The content acceptance rule is a prompt-to-scene match: the family prompt, chapter/section owner, demonstration, initial graph, and prepared actions must describe the same activity. The matrix checks all 78 keyed prompt/section rows against their real graph. [The inventory](content-acceptance-inventory.md) records each full prompt, prepared scene, extra actions and whether the scene supplies an exact starting state or expects the learner to manipulate named controls.

The inventory caught one concrete mismatch. The authored first scenes for `spline-cn` and `spline-c2` pre-enabled point labels, although the family prompt asks the learner to enable them or hide computed points. The family examples now start with labels hidden. The respective authored multi-frame lessons keep their authored labels.

The exact starting states checked in graph state are continuity at \(a=1\); derivative at \(f(x)=x^2,x_0=1,h=1\); the left sum for \(x^2\) on \([0,2]\) with four rectangles; arc length on \([0,\pi]\) with one chord; and the spline fixture showing the two parabolas joined at \((1,1)\). The spline graph check also confirms matching first derivatives and matching second derivatives on both sides of the join.

Canonical links reject extra segments, incorrect chapter owners, and activity section/demo pairs that do not exist. Temporarily removing both exact-segment guards made the extra-segment regression fail.

Validation: `just unit src/learning/chapter/guidedExamples.test.ts src/learning/content/guidedExampleScenes.test.tsx` passed (84 tests) and `just typecheck` passed. The first malformed-route run used an invalid test fixture: `decasteljau` does own a repeated-interpolation activity in the interpolation section. The fixture was corrected to a section with no matching activity.
