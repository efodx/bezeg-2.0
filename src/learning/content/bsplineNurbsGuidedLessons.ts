/**
 * Guided lesson of the NURBS circle Demonstration (docs/specs/b-splines-nurbs-lessons.md, L5). The text is a one-shot draft
 * (docs/specs/new-lesson-families.md, "One-shot lesson text"): every value it quotes is a readout of the scene it belongs to, and
 * `bsplineNurbsGuidedLessons.test.tsx` checks that against the real graph and the kernel in `src/bezeg/impl/curve/bspline`.
 * Scenes are `lesson-fixture` scenes whose fixture carries the degree, the knot vector, the nine points and the weights (so the
 * example, the Reset target and the slider start are the same on every visit), optionally followed by `nurbs-circle` actions.
 * Comparing with the four-arc circle of the rational-curves chapter is text only: no scene action navigates.
 */
import type {LessonAction, LessonCurveFixture, LessonViewBox} from '../model';
import type {GuidedLesson, GuidedLessonFrame, GuidedLessonFrameKind, LessonScene, LocalizedText} from './guidedLessons';

const text = (sl: string, en: string): LocalizedText => ({sl, en});
const frame = (id: string, kind: GuidedLessonFrameKind): GuidedLessonFrame => ({id, kind});

const CORNER = Math.SQRT1_2;
const NURBS_POINTS: LessonCurveFixture['points'] = [[1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1], [0, -1], [1, -1], [1, 0]];
const NURBS_KNOTS = [0, 0, 0, 0.25, 0.25, 0.5, 0.5, 0.75, 0.75, 1, 1, 1];
/** The spec's defaults: corner weights √2/2 (indices 1, 3, 5, 7). */
export const NURBS_CIRCLE_FIXTURE: LessonCurveFixture = {degree: 2, knots: NURBS_KNOTS, points: NURBS_POINTS, weights: NURBS_POINTS.map((_, i) => i % 2 === 1 ? CORNER : 1)};
/** The same nine points and knots with unit weights: a polynomial B-spline. */
export const NURBS_UNIT_FIXTURE: LessonCurveFixture = {degree: 2, knots: NURBS_KNOTS, points: NURBS_POINTS, weights: NURBS_POINTS.map(() => 1)};
/** The corner weights step 3 sets, one action each. */
export const NURBS_CORNER_INDICES: readonly number[] = [1, 3, 5, 7];
export const NURBS_T_SIXTEENTH = 1 / 16;
export const NURBS_T_EIGHTH = 1 / 8;

const VIEW: LessonViewBox = [-2, 2, 2, -2];

const nurbsScene = (id: string, curve: LessonCurveFixture, actions: readonly LessonAction[], sl: string, en: string): LessonScene =>
    ({id, basedOn: 'lesson-fixture', curve, view: VIEW, actions, expectedState: text(sl, en)});
const setT = (value: number): LessonAction => ({kind: 'nurbs-circle', operation: 'set-t', value});
const setWeight = (index: number, value: number): LessonAction => ({kind: 'nurbs-circle', operation: 'set-weight', index, value});

const nurbsLesson: GuidedLesson = {
    demonstrationId: 'bspline-nurbs',
    title: text('NURBS in krog', 'NURBS and the circle'),
    summary: text(
        'B-zlepek z utežmi je NURBS. Kvadratni NURBS na devetih točkah z vozelnim vektorjem \\((0,0,0,\\tfrac14,\\tfrac14,\\tfrac12,\\tfrac12,\\tfrac34,\\tfrac34,1,1,1)\\) in utežmi \\(\\tfrac{\\sqrt2}2\\) v ogliščih je natančno enotska krožnica, vendar parameter ni sorazmeren s kotom.',
        'A B-spline with weights is a NURBS. A quadratic NURBS on nine points with the knot vector \\((0,0,0,\\tfrac14,\\tfrac14,\\tfrac12,\\tfrac12,\\tfrac34,\\tfrac34,1,1,1)\\) and weights \\(\\tfrac{\\sqrt2}2\\) at the corners is exactly the unit circle, but the parameter is not proportional to the angle.',
    ),
    prerequisites: [
        text('Potrebno je vstavljanje vozla (lekcija o vstavljanju vozlov) in poglavje o racionalnih Bézierjevih krivuljah (uteži, četrtina krožnice).', 'Assumes knot insertion (the lesson on inserting knots) and the chapter on rational Bézier curves (weights, the quarter arc).'),
    ],
    learningGoals: [
        text('Veš, da noben polinomski B-zlepek ni krožnica, in znaš to pokazati z največjim odmikom od enotske krožnice.', 'Know that no polynomial B-spline is a circle, and show it with the maximum deviation from the unit circle.'),
        text('Uteži \\(\\tfrac{\\sqrt2}2\\) v ogliščih pretvorijo kvadratni B-zlepek na teh točkah v natančno krožnico, eno samo krivuljo z enim vozelnim vektorjem.', 'Weights \\(\\tfrac{\\sqrt2}2\\) at the corners turn the quadratic B-spline on these points into an exact circle, one single curve with one knot vector.'),
        text('Razločiš natančnost v vzorčenih točkah od dokaza in veš, da NURBS krog ni enakomeren po kotu.', 'Tell exactness at sampled points from a proof, and know that the NURBS circle is not uniform in the angle.'),
    ],
    formulaBlocks: [
        {
            id: 'bspline-nurbs-rational',
            latex: String.raw`C(t)=\frac{\sum_i w_i\,N_{i,2}(t)\,P_i}{\sum_i w_i\,N_{i,2}(t)}`,
            notation: text(
                'Točke \\(P_i\\), uteži \\(w_i>0\\) in bazne funkcije \\(N_{i,2}\\) stopnje \\(2\\) z danim vozelnim vektorjem. Pri vseh \\(w_i=1\\) je imenovalec \\(1\\) in ostane polinomski B-zlepek.',
                'The points \\(P_i\\), the weights \\(w_i>0\\) and the basis functions \\(N_{i,2}\\) of degree \\(2\\) on the given knot vector. With all \\(w_i=1\\) the denominator is \\(1\\) and the polynomial B-spline remains.',
            ),
            explanation: text(
                'Točka NURBS je utežena sredina kontrolnih točk, deljena z vsoto uteženih baznih funkcij. Če vse uteži pomnožimo z istim pozitivnim številom, se krivulja ne spremeni.',
                'A NURBS point is the weighted mean of the control points, divided by the sum of the weighted basis functions. Scaling all weights by the same positive number leaves the curve unchanged.',
            ),
        },
        {
            id: 'bspline-nurbs-error',
            latex: String.raw`E=\max_{t}\bigl|\,\lVert C(t)\rVert-1\,\bigr|`,
            notation: text(
                'Največji odmik \\(E\\) od enotske krožnice, izmerjen v \\(1001\\) enakomerno razporejenih vrednostih parametra \\(t\\).',
                'The maximum deviation \\(E\\) from the unit circle, measured at \\(1001\\) evenly spaced values of the parameter \\(t\\).',
            ),
            explanation: text(
                'Če je \\(E\\) blizu \\(0\\), vzorčene točke ležijo na krožnici. To kaže natančnost v teh točkah; dokaz je racionalna identiteta iz poglavja o racionalnih Bézierjevih krivuljah.',
                'If \\(E\\) is near \\(0\\), the sampled points lie on the circle. This shows exactness at those points; the proof is the rational identity from the chapter on rational Bézier curves.',
            ),
        },
    ],
    workedExamples: [
        {
            id: 'bspline-nurbs-angle-example',
            title: text('Točka pri \\(t=\\tfrac1{16}\\)', 'The point at \\(t=\\tfrac1{16}\\)'),
            calculationLatex: String.raw`C(\tfrac1{16})=\frac{\tfrac9{16}(1,0)+\tfrac6{16}\tfrac{\sqrt2}2(1,1)+\tfrac1{16}(0,1)}{\tfrac9{16}+\tfrac6{16}\tfrac{\sqrt2}2+\tfrac1{16}}`,
            resultLatex: String.raw`C(\tfrac1{16})=(0{,}92979;\,0{,}36809),\quad \varphi=21{,}598^\circ`,
            check: text(
                'Na prvem loku, \\([0,\\tfrac14]\\), je lokalni parameter \\(s=\\tfrac14\\) in Bernsteinove vrednosti so \\(\\tfrac9{16},\\tfrac6{16},\\tfrac1{16}\\). Točka je \\((0{,}92979;\\,0{,}36809)\\), njen kot pa \\(21{,}598^\\circ\\), ne \\(22{,}5^\\circ\\).',
                'On the first arc, \\([0,\\tfrac14]\\), the local parameter is \\(s=\\tfrac14\\) and the Bernstein values are \\(\\tfrac9{16},\\tfrac6{16},\\tfrac1{16}\\). The point is \\((0.92979,\\,0.36809)\\) and its angle is \\(21.598^\\circ\\), not \\(22.5^\\circ\\).',
            ),
        },
    ],
    steps: [
        {
            id: 'bspline-nurbs-predict', order: 1,
            title: text('Ali je lahko polinomski B-zlepek krog?', 'Can a polynomial B-spline be a circle?'),
            purpose: text('Pred razkritjem napovedati, ali lahko polinomski B-zlepek natanko sovpada s krožnico.', 'Predicting, before the reveal, whether a polynomial B-spline can coincide exactly with a circle.'),
            explanation: text(
                'Narisan je kvadratni B-zlepek na devetih točkah ob enotski krožnici, vse uteži so \\(1\\). Napovej: ali lahko kak polinomski B-zlepek natanko sovpada s krožnico? Ne more: polinomski odsek ne more imeti stalne razdalje od središča. Največji odmik \\(E\\) je približno \\(6{,}07\\cdot10^{-2}\\).',
                'A quadratic B-spline on nine points is drawn beside the unit circle, with all weights \\(1\\). Predict: can any polynomial B-spline coincide exactly with a circle? It cannot: a polynomial piece cannot keep a constant distance from the centre. The maximum deviation \\(E\\) is about \\(6.07\\cdot10^{-2}\\).',
            ),
            formulaIds: ['bspline-nurbs-error'],
            frames: [frame('bspline-nurbs-predict-explanation', 'explanation'), frame('bspline-nurbs-predict-observation', 'observation')],
            observationPrompt: text('Preberi največji odmik od enotske krožnice.', 'Read the maximum deviation from the unit circle.'),
            expectedObservations: [text('Največji odmik je približno \\(6{,}07\\cdot10^{-2}\\), krivulja ni krožnica.', 'The maximum deviation is about \\(6.07\\cdot10^{-2}\\); the curve is not a circle.')],
            scene: nurbsScene('bspline-nurbs-predict-unit', NURBS_UNIT_FIXTURE, [],
                'Devet točk, enotske uteži, krožnica vidna; največji odmik je približno \\(6{,}07\\cdot10^{-2}\\).',
                'Nine points, unit weights, the circle visible; the maximum deviation is about \\(6.07\\cdot10^{-2}\\).'),
        },
        {
            id: 'bspline-nurbs-polynomial', order: 2,
            title: text('Polinomska različica istih točk', 'The polynomial version of the same points'),
            purpose: text('Pogledati, kje polinomska različica zapusti krožnico.', 'Looking at where the polynomial version leaves the circle.'),
            explanation: text(
                'Točke in vozelni vektor so isti, uteži so enotske. Pri \\(t=\\tfrac18\\) je točka krivulje \\((0{,}75;\\,0{,}75)\\), razdalja od središča je približno \\(1{,}0607\\), torej je krivulja tam zunaj krožnice. Odmik \\(E\\) je večji od \\(10^{-2}\\) in ne izgine, dokler ostanejo kontrolne točke iste.',
                'The points and the knot vector are the same, the weights are unit weights. At \\(t=\\tfrac18\\) the curve point is \\((0.75,\\,0.75)\\), its distance from the centre is about \\(1.0607\\), so the curve is outside the circle there. The deviation \\(E\\) is larger than \\(10^{-2}\\) and does not vanish while the control points stay the same.',
            ),
            formulaIds: ['bspline-nurbs-error'],
            frames: [frame('bspline-nurbs-polynomial-explanation', 'explanation'), frame('bspline-nurbs-polynomial-observation', 'observation')],
            observationPrompt: text('Preberi točko \\(C(t)\\) pri \\(t=\\tfrac18\\) in jo primerjaj s točko \\((\\tfrac{\\sqrt2}2,\\tfrac{\\sqrt2}2)\\) na krožnici.', 'Read the point \\(C(t)\\) at \\(t=\\tfrac18\\) and compare it with the point \\((\\tfrac{\\sqrt2}2,\\tfrac{\\sqrt2}2)\\) on the circle.'),
            expectedObservations: [text('Točka je \\((0{,}75;\\,0{,}75)\\) pri kotu \\(45^\\circ\\), zunaj krožnice.', 'The point is \\((0.75,\\,0.75)\\) at the angle \\(45^\\circ\\), outside the circle.')],
            scene: nurbsScene('bspline-nurbs-polynomial-eighth', NURBS_UNIT_FIXTURE, [setT(NURBS_T_EIGHTH)],
                'Enotske uteži, \\(t=\\tfrac18\\): točka \\((0{,}75;\\,0{,}75)\\) pri kotu \\(45^\\circ\\), odmik \\(E\\) približno \\(6{,}07\\cdot10^{-2}\\).',
                'Unit weights, \\(t=\\tfrac18\\): the point \\((0.75,\\,0.75)\\) at the angle \\(45^\\circ\\), the deviation \\(E\\) about \\(6.07\\cdot10^{-2}\\).'),
        },
        {
            id: 'bspline-nurbs-weights', order: 3,
            title: text('Uteži \\(\\tfrac{\\sqrt2}2\\) v ogliščih', 'Weights \\(\\tfrac{\\sqrt2}2\\) at the corners'),
            purpose: text('Videti, da uteži v ogliščih odmik zmanjšajo na zaokrožitveno napako.', 'Seeing that weights at the corners reduce the deviation to rounding error.'),
            explanation: text(
                'Utež vsake druge točke (druge, četrte, šeste in osme) nastavimo na \\(\\tfrac{\\sqrt2}2\\). Krivulja ni več polinomska, odmik \\(E\\) pa pade pod \\(10^{-12}\\), to je na zaokrožitveno napako. Pri \\(t=\\tfrac18\\) je točka \\((\\tfrac{\\sqrt2}2,\\tfrac{\\sqrt2}2)\\). Vzorci kažejo, da točke ležijo na krožnici; to ni dokaz.',
                'The weight of every second point (the second, fourth, sixth and eighth) is set to \\(\\tfrac{\\sqrt2}2\\). The curve is no longer polynomial, and the deviation \\(E\\) falls below \\(10^{-12}\\), which is rounding error. At \\(t=\\tfrac18\\) the point is \\((\\tfrac{\\sqrt2}2,\\tfrac{\\sqrt2}2)\\). The samples show that the points lie on the circle; that is not a proof.',
            ),
            formulaIds: ['bspline-nurbs-rational', 'bspline-nurbs-error'],
            frames: [frame('bspline-nurbs-weights-explanation', 'explanation'), frame('bspline-nurbs-weights-observation', 'observation')],
            observationPrompt: text('Preberi največji odmik in točko pri \\(t=\\tfrac18\\).', 'Read the maximum deviation and the point at \\(t=\\tfrac18\\).'),
            expectedObservations: [text('Odmik je pod \\(10^{-12}\\); točka je \\((0{,}70711;\\,0{,}70711)\\) pri kotu \\(45^\\circ\\).', 'The deviation is below \\(10^{-12}\\); the point is \\((0.70711,\\,0.70711)\\) at the angle \\(45^\\circ\\).')],
            scene: nurbsScene('bspline-nurbs-weights-corners', NURBS_UNIT_FIXTURE,
                [...NURBS_CORNER_INDICES.map(index => setWeight(index, CORNER)), setT(NURBS_T_EIGHTH)],
                'Uteži \\(2\\), \\(4\\), \\(6\\) in \\(8\\) so \\(\\tfrac{\\sqrt2}2\\); odmik \\(E\\) je pod \\(10^{-12}\\), točka pri \\(t=\\tfrac18\\) je \\((0{,}70711;\\,0{,}70711)\\).',
                'Weights \\(2\\), \\(4\\), \\(6\\) and \\(8\\) are \\(\\tfrac{\\sqrt2}2\\); the deviation \\(E\\) is below \\(10^{-12}\\) and the point at \\(t=\\tfrac18\\) is \\((0.70711,\\,0.70711)\\).'),
        },
        {
            id: 'bspline-nurbs-angle', order: 4,
            title: text('Kje je točka pri \\(t=\\tfrac1{16}\\)?', 'Where is the point at \\(t=\\tfrac1{16}\\)?'),
            purpose: text('Pred razkritjem napovedati kot točke pri \\(t=\\tfrac1{16}\\) in spoznati, da parameter ni sorazmeren s kotom.', 'Predicting, before the reveal, the angle of the point at \\(t=\\tfrac1{16}\\) and learning that the parameter is not proportional to the angle.'),
            explanation: text(
                'Prvi lok pokriva četrtino kroga na \\([0,\\tfrac14]\\), torej \\(t=\\tfrac1{16}\\) leži na četrtini tega loka. Napovej: kolikšen je kot točke? Naiven odgovor je \\(22{,}5^\\circ\\). Točka pa je \\((0{,}92979;\\,0{,}36809)\\) pri kotu \\(21{,}598^\\circ\\). Pri \\(t=\\tfrac18\\) je kot res \\(45^\\circ\\). Krožnica je natančna, parametrizacija pa ni enakomerna po kotu.',
                'The first arc covers a quarter of the circle on \\([0,\\tfrac14]\\), so \\(t=\\tfrac1{16}\\) lies a quarter of the way along it. Predict: what is the angle of the point? The naive answer is \\(22.5^\\circ\\). The point is \\((0.92979,\\,0.36809)\\) at the angle \\(21.598^\\circ\\). At \\(t=\\tfrac18\\) the angle really is \\(45^\\circ\\). The circle is exact but the parametrization is not uniform in the angle.',
            ),
            formulaIds: ['bspline-nurbs-rational'], workedExampleId: 'bspline-nurbs-angle-example',
            frames: [frame('bspline-nurbs-angle-explanation', 'explanation'), frame('bspline-nurbs-angle-calculation', 'calculation'), frame('bspline-nurbs-angle-observation', 'observation')],
            observationPrompt: text('Preberi točko in kot v inšpektorju pri \\(t=\\tfrac1{16}\\).', 'Read the point and the angle in the inspector at \\(t=\\tfrac1{16}\\).'),
            expectedObservations: [text('Točka je \\((0{,}92979;\\,0{,}36809)\\) pri kotu \\(21{,}598^\\circ\\), ne pri \\(22{,}5^\\circ\\).', 'The point is \\((0.92979,\\,0.36809)\\) at the angle \\(21.598^\\circ\\), not \\(22.5^\\circ\\).')],
            scene: nurbsScene('bspline-nurbs-angle-sixteenth', NURBS_CIRCLE_FIXTURE, [setT(NURBS_T_SIXTEENTH)],
                'NURBS krog, \\(t=\\tfrac1{16}\\): točka \\((0{,}92979;\\,0{,}36809)\\) pri kotu \\(21{,}598^\\circ\\); odmik \\(E\\) je pod \\(10^{-12}\\).',
                'The NURBS circle at \\(t=\\tfrac1{16}\\): the point \\((0.92979,\\,0.36809)\\) at the angle \\(21.598^\\circ\\); the deviation \\(E\\) is below \\(10^{-12}\\).'),
        },
        {
            id: 'bspline-nurbs-compare', order: 5,
            title: text('Ena krivulja ali štirje loki', 'One curve or four arcs'),
            purpose: text('Primerjati NURBS krog s krožnico iz štirih lokov v poglavju o racionalnih Bézierjevih krivuljah in ločiti sliko od dokaza.', 'Comparing the NURBS circle with the four-arc circle of the rational Bézier chapter, and telling the picture from the proof.'),
            explanation: text(
                'Prikaz »Krožnica iz n delov« v poglavju o racionalnih Bézierjevih krivuljah sestavi isto krožnico iz štirih zlepljenih lokov. Tu je ista krožnica ena sama krivulja z enim vozelnim vektorjem, v katerem so notranji vozli \\(\\tfrac14\\), \\(\\tfrac12\\) in \\(\\tfrac34\\) dvojni. Slika kaže natančnost le v vzorčenih vrednostih parametra; dokaz je racionalna identiteta iz poglavja o racionalnih Bézierjevih krivuljah. Vzorčenje samo ne dokaže ničesar.',
                'The Demonstration “Circle from n pieces” in the chapter on rational Bézier curves builds the same circle from four joined arcs. Here the same circle is one single curve with one knot vector in which the interior knots \\(\\tfrac14\\), \\(\\tfrac12\\) and \\(\\tfrac34\\) are double. The picture illustrates exactness only at the sampled parameters; the proof is the rational identity from the chapter on rational Bézier curves. Sampling alone does not prove it.',
            ),
            formulaIds: ['bspline-nurbs-error'],
            frames: [frame('bspline-nurbs-compare-explanation', 'explanation'), frame('bspline-nurbs-compare-observation', 'observation')],
            observationPrompt: text('Preštej dvojne notranje vozle \\(\\tfrac14\\), \\(\\tfrac12\\), \\(\\tfrac34\\) in poišči stike lokov na krožnici.', 'Count the double interior knots \\(\\tfrac14\\), \\(\\tfrac12\\), \\(\\tfrac34\\) and find where the arcs join on the circle.'),
            expectedObservations: [text('Trije dvojni notranji vozli ločijo štiri loke; krožnica je ena krivulja.', 'Three double interior knots separate four arcs; the circle is one curve.')],
            scene: nurbsScene('bspline-nurbs-compare-circle', NURBS_CIRCLE_FIXTURE, [setT(NURBS_T_SIXTEENTH), {kind: 'nurbs-circle', operation: 'set-circle', visible: true}],
                'NURBS krog z vidno enotsko krožnico; odmik \\(E\\) je pod \\(10^{-12}\\).',
                'The NURBS circle with the unit circle visible; the deviation \\(E\\) is below \\(10^{-12}\\).'),
        },
        {
            id: 'bspline-nurbs-explore', order: 6,
            title: text('Prosto raziskovanje', 'Free exploration'),
            purpose: text('Samostojno spreminjati uteži in opazovati odmik.', 'Changing the weights on your own and watching the deviation.'),
            explanation: text(
                'Spet je NURBS krog. Spremeni eno utež, na primer drugo, in poglej, kako se poveča odmik \\(E\\); vse uteži hkrati pomnoži z istim številom in preveri, da se krivulja ne spremeni. Utež mora biti pozitivna. Gumb »Ponastavi primer« vrne začetne uteži.',
                'The NURBS circle is back. Change one weight, for example the second, and see how the deviation \\(E\\) grows; multiply all weights by the same number and check that the curve does not change. A weight must be positive. The “Reset example” button returns the original weights.',
            ),
            formulaIds: ['bspline-nurbs-rational', 'bspline-nurbs-error'],
            frames: [frame('bspline-nurbs-explore-explanation', 'explanation'), frame('bspline-nurbs-explore-observation', 'observation')],
            observationPrompt: text('Spremeni utež in primerjaj odmik \\(E\\) z vrednostjo pred spremembo.', 'Change a weight and compare the deviation \\(E\\) with its value before the change.'),
            expectedObservations: [text('Vsaka sprememba ene uteži odmik poveča nad zaokrožitveno napako; nepozitivna utež je zavrnjena z razlogom.', 'Any change of a single weight raises the deviation above rounding error; a nonpositive weight is refused with the reason.')],
            scene: nurbsScene('bspline-nurbs-explore-start', NURBS_CIRCLE_FIXTURE, [setT(NURBS_T_SIXTEENTH)],
                'NURBS krog s privzetimi utežmi; vse je prosto za raziskovanje.',
                'The NURBS circle with the default weights; everything is free to explore.'),
        },
    ],
    sources: [
        {id: 'piegl-tiller-nurbs', citation: 'Piegl, L., Tiller, W. The NURBS Book, 2nd ed. Springer, 1997, the chapter on NURBS curves and the representation of circles.'},
        {id: 'farin-nurbs', citation: 'Farin, G. Curves and Surfaces for CAGD, 5th ed., the chapters on rational B-splines and conics.'},
        {
            id: 'bezeg-bspline-nurbs-implementation',
            citation: 'Bezeg source: src/graphs/curves/bspline/BSplineNurbsGraph.tsx and bsplineNurbsModel.ts.',
            implementationCorrespondence: 'The radial error is the maximum of |‖C(t)‖ − 1| over 1001 evenly spaced parameters; a lesson scene sets the nine points, knots and weights with a curve fixture and edits weights and the slider with the nurbs-circle actions set-weight and set-t, which call the setters the controls use.',
        },
    ],
    edgeCases: [
        text('Vse uteži morajo biti pozitivne; nepozitivna utež je zavrnjena z razlogom, krivulja pa ostane.', 'All weights must be positive; a nonpositive weight is refused with the reason and the curve stays as it was.'),
        text('Natančnost v vzorcih ni dokaz: tisoč točk na krožnici še ne pomeni, da je krivulja krožnica; dokaz je racionalna identiteta.', 'Exactness at samples is not a proof: a thousand points on the circle do not mean the curve is a circle; the proof is the rational identity.'),
    ],
    unresolvedQuestions: [],
};

export const bsplineNurbsGuidedLessons: readonly GuidedLesson[] = [nurbsLesson];
