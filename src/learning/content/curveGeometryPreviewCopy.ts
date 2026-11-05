import type {GuidedExamplePreviewCopy} from './guidedExamplePreviewCopy';

const copy = (altSl: string, altEn: string, captionSl: string, captionEn: string): GuidedExamplePreviewCopy => ({
    alt: {sl: altSl, en: altEn},
    caption: {sl: captionSl, en: captionEn},
});

/** Describes the prepared opening scenes of the Curve geometry chapter (L1 cycloid at t=0, L2 cubic at t=0.5, L3 cubic with the comb hidden, L4 parabola at t=0.75), keyed by example id. */
export const curveGeometryPreviewCopy = {
    'curve-geometry.curve-parametric.curve-parametric': copy('Krog s polmerom \\(1\\), ki se kotali po osi \\(x\\), z označeno točko v izhodišču pri \\(t=0\\).', 'A circle of radius \\(1\\) rolling along the \\(x\\) axis, with the marked point at the origin at \\(t=0\\).', 'Napovej pot označene točke, preden pritisneš Predvajaj.', 'Predict the path of the marked point before you press Play.'),
    'curve-geometry.curve-curvature.curve-curvature': copy('Kubična Bézierjeva krivulja s kontrolnimi točkami \\((0,0)\\), \\((1,0)\\), \\((2,1)\\), \\((3,3)\\) pri \\(t=0{,}5\\); okvir in krožnica sta skrita.', 'A cubic Bézier curve with the control points \\((0,0)\\), \\((1,0)\\), \\((2,1)\\), \\((3,3)\\) at \\(t=0.5\\); the frame and the circle are hidden.', 'Napovej, kateri konec se bolj zavije.', 'Predict which end bends more.'),
    'curve-geometry.curve-comb.curve-comb': copy('Kubična Bézierjeva krivulja s kontrolnimi točkami \\((0,0)\\), \\((1,0)\\), \\((2,1)\\), \\((3,3)\\); glavnik ukrivljenosti je skrit.', 'A cubic Bézier curve with the control points \\((0,0)\\), \\((1,0)\\), \\((2,1)\\), \\((3,3)\\); the curvature comb is hidden.', 'Napovej, kje je krivulja najbolj ravna.', 'Predict where the curve is flattest.'),
    'curve-geometry.curve-evolute.curve-evolute': copy('Parabola \\(y=x^2\\) s krivinsko krožnico pri \\(t=0{,}75\\); sled evolute je skrita.', 'The parabola \\(y=x^2\\) with the osculating circle at \\(t=0.75\\); the trace of the evolute is hidden.', 'Napovej, kam gre središče krožnice.', 'Predict where the centre of the circle goes.'),
} as const satisfies Record<string, GuidedExamplePreviewCopy>;
