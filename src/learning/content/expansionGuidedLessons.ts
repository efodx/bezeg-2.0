import type {LessonAction, LessonCurveFixture, LessonViewBox} from '../model';
import type {GuidedLesson, GuidedLessonFrame, GuidedLessonFrameKind, LessonScene, LocalizedText} from './guidedLessons';

const text = (sl: string, en: string): LocalizedText => ({sl, en});
const frame = (id: string, kind: GuidedLessonFrameKind, formulaIds?: readonly string[]): GuidedLessonFrame => ({id, kind, formulaIds});
const scene = (id: string, actions: readonly LessonAction[], sl: string, en: string) => ({
    id, basedOn: 'demonstration-default' as const, actions, expectedState: text(sl, en),
});

/** Quintic PH lesson fixture: P_0=(-2,-1), w_0=2, w_1=2+i, w_2=1+i, so w(t)=(2-t^2)+i(2t-t^2), speed 4-4t^3+2t^4, arc length 17/5. */
const phQuinticFixture: LessonCurveFixture = {points: [[-2, -1]], hodographs: [[2, 0], [2, 1], [1, 1]]};
const phQuinticView: LessonViewBox = [-3, 2.2, 2.5, -2.6];
const phQuinticScene = (id: string, actions: readonly LessonAction[], sl: string, en: string): LessonScene => ({
    id, basedOn: 'lesson-fixture', curve: phQuinticFixture, view: phQuinticView, actions, expectedState: text(sl, en),
});

/**
 * Rational lesson fixtures: P=(-4,-3),(-3,3),(3,3),(4,-3) at the fixed comparison parameter t=1/2, b(1/2)=(1,3,3,1)/8.
 * w=(1,1,1,1): B=(0,3/2), the ordinary Bézier point; w=(1,2,1,1): B=(-9/11,21/11); w=(1,4,1,1): B=(-27/17,39/17).
 * The endpoints (-4,-3) and (4,-3) do not depend on the weights; the share of P_1 at t=1/2 is 3w_1/(5+3w_1)=3/8, 6/11, 12/17.
 */
const rationalView: LessonViewBox = [-6, 5, 6, -4.5];
const rationalFixture = (weights: readonly number[]): LessonCurveFixture => ({points: [[-4, -3], [-3, 3], [3, 3], [4, -3]], weights});
const rationalScene = (id: string, weights: readonly number[], actions: readonly LessonAction[], sl: string, en: string): LessonScene => ({
    id, basedOn: 'lesson-fixture', curve: rationalFixture(weights), view: rationalView, actions, expectedState: text(sl, en),
});
const RATIONAL_ACTIONS: readonly LessonAction[] = [{kind: 'curve-visibility', target: 'control-polygon', visible: true}, {kind: 'curve-visibility', target: 'weights', visible: true}, {kind: 'curve-evaluation', parameter: 0.5}];

const rational: GuidedLesson = {
    demonstrationId: 'rational',
    title: text('Racionalna Bézierjeva krivulja', 'Rational Bézier curve'),
    summary: text(
        'Pri istih kontrolnih točkah in istem parametru primerjaj uteži \\((1,1,1,1)\\), \\((1,2,1,1)\\) in \\((1,4,1,1)\\) ter preveri, da druga utež premakne točko krivulje, ne pa krajišč.',
        'With the same control points and the same parameter, compare the weights \\((1,1,1,1)\\), \\((1,2,1,1)\\) and \\((1,4,1,1)\\) and check that the second weight moves the curve point but not the endpoints.',
    ),
    prerequisites: [
        text('Potrebno je osnovno poznavanje Bézierjevih kontrolnih točk in Bernsteinovih polinomov.', 'Assumes familiarity with Bézier control points and Bernstein polynomials.'),
        text('Potrebno je razlikovati kontrolni poligon od dejanske krivulje.', 'Assumes the distinction between a control polygon and the curve itself.'),
    ],
    learningGoals: [
        text('Prepoznaš, da enake uteži dajo navadno Bézierjevo krivuljo.', 'Recognize that equal weights give an ordinary Bézier curve.'),
        text('Izračunaš racionalno vrednost pri \\(t=\\tfrac{1}{2}\\) za različne uteži pri istih kontrolnih točkah.', 'Calculate the rational value at \\(t=\\tfrac{1}{2}\\) for different weights and the same control points.'),
        text('Razložiš, da druga utež povečuje vpliv točke \\(P_1\\), krajišči pa ostaneta enaki.', 'Explain that the second weight increases the influence of \\(P_1\\) while the endpoints stay the same.'),
    ],
    formulaBlocks: [
        {
            id: 'rational-base-weighted-form',
            latex: '\\mathbf{B}(t)=\\frac{\\sum_{i=0}^{n}b_{i,n}(t)w_iP_i}{\\sum_{i=0}^{n}b_{i,n}(t)w_i}',
            notation: text('Uteži nastopajo v števcu in imenovalcu; imenovalec normalizira skupni vpliv.', 'Weights occur in the numerator and denominator; the denominator normalizes their total influence.'),
            explanation: text('Pri enakih utežeh dobimo navadno Bézierjevo krivuljo. Pri različnih pozitivnih utežeh se vpliv kontrolnih točk spremeni.', 'Equal weights give an ordinary Bézier curve. Different positive weights change the influence of the control points.'),
        },
        {
            id: 'rational-base-equal-weights',
            latex: 'w_0=\\cdots=w_n\\Longrightarrow\\mathbf{B}(t)=\\sum_{i=0}^{n}b_{i,n}(t)P_i',
            notation: text('Če so vse uteži enake, se skupni faktor pokrajša.', 'When all weights are equal, the common factor cancels.'),
            explanation: text('Racionalna oblika vsebuje navadno Bézierjevo obliko kot poseben primer.', 'The rational form contains the ordinary Bézier form as a special case.'),
        },
        {
            id: 'rational-base-second-weight',
            latex: '\\frac{3w_1}{1+3w_1+3+1}=\\frac{3w_1}{5+3w_1}=\\frac38,\\ \\frac6{11},\\ \\frac{12}{17}\\quad(w_1=1,2,4)',
            notation: text('Delež točke \\(P_1\\) pri \\(t=\\tfrac{1}{2}\\), če so druge uteži enake \\(1\\): števec je \\(3w_1\\), imenovalec \\(5+3w_1\\).', 'The share of \\(P_1\\) at \\(t=\\tfrac{1}{2}\\) when the other weights equal \\(1\\): the numerator is \\(3w_1\\), the denominator \\(5+3w_1\\).'),
            explanation: text('Večja utež \\(w_1\\) poveča delež točke \\(P_1\\), vendar ostane ta delež pod \\(1\\) pri vsaki končni uteži.', 'A larger \\(w_1\\) raises the share of \\(P_1\\), although the share stays below \\(1\\) for every finite weight.'),
        },
        {
            id: 'rational-base-endpoints',
            latex: '\\mathbf{B}(0)=P_0,\\qquad\\mathbf{B}(1)=P_n',
            notation: text('Krajišči sta določeni s prvo in zadnjo kontrolno točko, če je ustrezna utež regularna.', 'The endpoints are determined by the first and last control points when the corresponding weight is regular.'),
            explanation: text('Pri \\(t=0\\) je števec \\(w_0P_0\\), imenovalec \\(w_0\\); utež se pokrajša. Podobno pri \\(t=1\\). Druga utež tu ne nastopa.', 'At \\(t=0\\) the numerator is \\(w_0P_0\\) and the denominator \\(w_0\\); the weight cancels. The same holds at \\(t=1\\). The second weight does not occur there.'),
        },
    ],
    workedExamples: [
        {
            id: 'rational-base-equal',
            title: text('Enake uteži \\((1,1,1,1)\\) pri \\(t=\\tfrac{1}{2}\\)', 'Equal weights \\((1,1,1,1)\\) at \\(t=\\tfrac{1}{2}\\)'),
            calculationLatex: 'P=(-4,-3),(-3,3),(3,3),(4,-3),\\quad w=(1,1,1,1),\\quad b(1/2)=(1/8,3/8,3/8,1/8)',
            resultLatex: '\\mathbf{B}(1/2)=\\frac{(0,3/2)}{1}=(0,3/2)',
            check: text('Imenovalec je \\(1\\), zato je rezultat navadna Bézierjeva točka \\(\\left(0,\\,\\tfrac{3}{2}\\right)\\).', 'The denominator is \\(1\\), so the result is the ordinary Bézier point \\(\\left(0,\\,\\tfrac{3}{2}\\right)\\).'),
        },
        {
            id: 'rational-base-midpoint',
            title: text('Uteži \\((1,2,1,1)\\) pri \\(t=\\tfrac{1}{2}\\)', 'Weights \\((1,2,1,1)\\) at \\(t=\\tfrac{1}{2}\\)'),
            calculationLatex: 'P=(-4,-3),(-3,3),(3,3),(4,-3),\\quad w=(1,2,1,1),\\quad b(1/2)=(1/8,3/8,3/8,1/8)',
            resultLatex: '\\mathbf{B}(1/2)=\\frac{(-9/8,21/8)}{11/8}=(-9/11,21/11)',
            check: text('Primerjaj izračun z označeno točko na grafu in z racionalno De Casteljaujevo konstrukcijo.', 'Compare the calculation with the marked graph point and the rational De Casteljau construction.'),
        },
        {
            id: 'rational-base-heavy',
            title: text('Uteži \\((1,4,1,1)\\) pri \\(t=\\tfrac{1}{2}\\)', 'Weights \\((1,4,1,1)\\) at \\(t=\\tfrac{1}{2}\\)'),
            calculationLatex: 'P=(-4,-3),(-3,3),(3,3),(4,-3),\\quad w=(1,4,1,1),\\quad b(1/2)=(1/8,3/8,3/8,1/8)',
            resultLatex: '\\mathbf{B}(1/2)=\\frac{(-27/8,39/8)}{17/8}=(-27/17,39/17)',
            check: text('Točka se je še bolj približala točki \\(P_1=(-3,3)\\); kontrolni poligon in krajišči so enaki kot prej.', 'The point has moved even closer to \\(P_1=(-3,3)\\); the control polygon and the endpoints are the same as before.'),
        },
    ],
    steps: [
        {
            id: 'rational-base-weights', order: 1,
            title: text('Enake uteži: navadna krivulja', 'Equal weights: the ordinary curve'),
            purpose: text('Začeti z znano Bézierjevo krivuljo, da je vpliv uteži viden kot sprememba.', 'Starting from the familiar Bézier curve so that the effect of weights is visible as a change.'),
            explanation: text('Kontrolne točke so \\(\\left(-4,\\,-3\\right)\\), \\(\\left(-3,\\,3\\right)\\), \\(\\left(3,\\,3\\right)\\), \\(\\left(4,\\,-3\\right)\\); do konca lekcije ostanejo na istih mestih, parameter pa je vedno \\(t=\\tfrac{1}{2}\\). Pri utežeh \\(\\left(1,\\,1,\\,1,\\,1\\right)\\) je imenovalec \\(1\\) in dobimo navadno Bézierjevo krivuljo z označeno točko \\(\\left(0,\\,\\tfrac{3}{2}\\right)\\).', 'The control points are \\(\\left(-4,\\,-3\\right)\\), \\(\\left(-3,\\,3\\right)\\), \\(\\left(3,\\,3\\right)\\), \\(\\left(4,\\,-3\\right)\\); they stay in place until the end of the lesson, and the parameter is always \\(t=\\tfrac{1}{2}\\). With the weights \\(\\left(1,\\,1,\\,1,\\,1\\right)\\) the denominator is \\(1\\) and we get the ordinary Bézier curve with the marked point \\(\\left(0,\\,\\tfrac{3}{2}\\right)\\).'),
            formulaIds: ['rational-base-weighted-form', 'rational-base-equal-weights'],
            frames: [frame('rational-base-weights-explanation', 'explanation', ['rational-base-equal-weights']), frame('rational-base-weights-calculation', 'calculation'), frame('rational-base-weights-observation', 'observation')],
            workedExampleId: 'rational-base-equal',
            observationPrompt: text('Preberi uteži in označi točko \\(\\left(0,\\,\\tfrac{3}{2}\\right)\\); to je primerjalna točka za naslednja koraka.', 'Read the weights and find the point \\(\\left(0,\\,\\tfrac{3}{2}\\right)\\); it is the reference point for the next two steps.'),
            expectedObservations: [text('Vse uteži so \\(1\\), označena točka je \\(\\left(0,\\,\\tfrac{3}{2}\\right)\\), kot pri navadni Bézierjevi krivulji.', 'All weights are \\(1\\) and the marked point is \\(\\left(0,\\,\\tfrac{3}{2}\\right)\\), as for an ordinary Bézier curve.')],
            scene: rationalScene('rational-base-default', [1, 1, 1, 1], RATIONAL_ACTIONS, 'Uteži \\((1,1,1,1)\\), poligon in \\(B(\\tfrac{1}{2})\\) so vidni.', 'The weights \\((1,1,1,1)\\), the polygon and \\(B(\\tfrac{1}{2})\\) are visible.'),
        },
        {
            id: 'rational-base-evaluation', order: 2,
            title: text('Druga utež \\(2\\)', 'Second weight \\(2\\)'),
            purpose: text('Povezava formule z označeno točko, ko se spremeni ena utež.', 'Connecting the formula with the marked point when one weight changes.'),
            explanation: text('Utež \\(w_1\\) se poveča z \\(1\\) na \\(2\\), vse drugo ostane. Utežene Bernsteinove vrednosti so\\(\\left(\\tfrac{1}{8},\\,\\tfrac{6}{8},\\,\\tfrac{3}{8},\\,\\tfrac{1}{8}\\right)\\) z vsoto \\(\\tfrac{11}{8}\\), zato je delež točke \\(P_1\\) enak \\(\\tfrac{6}{11}\\) namesto \\(\\tfrac{3}{8}\\) in točka \\(\\left(-\\tfrac{9}{11},\\,\\tfrac{21}{11}\\right)\\) se pomakne proti \\(P_1\\).', 'The weight \\(w_1\\) grows from \\(1\\) to \\(2\\), everything else stays. The weighted Bernstein values are\\(\\left(\\tfrac{1}{8},\\,\\tfrac{6}{8},\\,\\tfrac{3}{8},\\,\\tfrac{1}{8}\\right)\\) with sum \\(\\tfrac{11}{8}\\), so the share of \\(P_1\\) is \\(\\tfrac{6}{11}\\) instead of \\(\\tfrac{3}{8}\\) and the point \\(\\left(-\\tfrac{9}{11},\\,\\tfrac{21}{11}\\right)\\) moves toward \\(P_1\\).'),
            formulaIds: ['rational-base-weighted-form', 'rational-base-second-weight'],
            frames: [frame('rational-base-evaluation-explanation', 'explanation', ['rational-base-weighted-form']), frame('rational-base-evaluation-calculation', 'calculation'), frame('rational-base-evaluation-observation', 'observation')],
            workedExampleId: 'rational-base-midpoint',
            observationPrompt: text('Preveri, ali se izračunana točka \\(\\left(-\\tfrac{9}{11},\\,\\tfrac{21}{11}\\right)\\) ujema z označeno točko, in primerjaj jo s prejšnjo točko \\(\\left(0,\\,\\tfrac{3}{2}\\right)\\).', 'Check whether the calculated point \\(\\left(-\\tfrac{9}{11},\\,\\tfrac{21}{11}\\right)\\) matches the marked point, and compare it with the previous point \\(\\left(0,\\,\\tfrac{3}{2}\\right)\\).'),
            expectedObservations: [text('Kontrolni poligon je isti, označena točka pa je višje in bližje \\(P_1\\); imenovalec ni več \\(1\\), ampak \\(\\tfrac{11}{8}\\).', 'The control polygon is the same, but the marked point is higher and closer to \\(P_1\\); the denominator is no longer \\(1\\) but \\(\\tfrac{11}{8}\\).')],
            scene: rationalScene('rational-base-midpoint', [1, 2, 1, 1], RATIONAL_ACTIONS, 'Uteži \\((1,2,1,1)\\) in \\(B(\\tfrac{1}{2})\\) so pripravljene za preverjanje.', 'The weights \\((1,2,1,1)\\) and \\(B(\\tfrac{1}{2})\\) are ready for checking.'),
        },
        {
            id: 'rational-base-heavy', order: 3,
            title: text('Druga utež \\(4\\)', 'Second weight \\(4\\)'),
            purpose: text('Videti, da večja utež še bolj približa točko, ne da bi premaknila kontrolne točke.', 'Seeing that a larger weight pulls the point further without moving the control points.'),
            explanation: text('Pri \\(w_1=4\\) so utežene vrednosti\\(\\tfrac{1}{8},\\,\\tfrac{12}{8},\\,\\tfrac{3}{8},\\,\\tfrac{1}{8}\\) z vsoto \\(\\tfrac{17}{8}\\). Delež točke \\(P_1\\) je \\(\\tfrac{12}{17}\\), označena točka pa \\(\\left(-\\tfrac{27}{17},\\,\\tfrac{39}{17}\\right)\\). Delež je rastel z \\(\\tfrac{3}{8}\\) prek \\(\\tfrac{6}{11}\\) do \\(\\tfrac{12}{17}\\).', 'For \\(w_1=4\\) the weighted values are\\(\\tfrac{1}{8},\\,\\tfrac{12}{8},\\,\\tfrac{3}{8},\\,\\tfrac{1}{8}\\) with sum \\(\\tfrac{17}{8}\\). The share of \\(P_1\\) is \\(\\tfrac{12}{17}\\) and the marked point is \\(\\left(-\\tfrac{27}{17},\\,\\tfrac{39}{17}\\right)\\). The share grew from \\(\\tfrac{3}{8}\\) through \\(\\tfrac{6}{11}\\) to \\(\\tfrac{12}{17}\\).'),
            formulaIds: ['rational-base-second-weight'],
            frames: [frame('rational-base-heavy-explanation', 'explanation', ['rational-base-second-weight']), frame('rational-base-heavy-calculation', 'calculation'), frame('rational-base-heavy-observation', 'observation')],
            workedExampleId: 'rational-base-heavy',
            observationPrompt: text('Primerjaj tri označene točke \\(\\left(0,\\,\\tfrac{3}{2}\\right)\\), \\(\\left(-\\tfrac{9}{11},\\,\\tfrac{21}{11}\\right)\\) in \\(\\left(-\\tfrac{27}{17},\\,\\tfrac{39}{17}\\right)\\).', 'Compare the three marked points \\(\\left(0,\\,\\tfrac{3}{2}\\right)\\), \\(\\left(-\\tfrac{9}{11},\\,\\tfrac{21}{11}\\right)\\) and \\(\\left(-\\tfrac{27}{17},\\,\\tfrac{39}{17}\\right)\\).'),
            expectedObservations: [text('Točka se z naraščajočo utežjo pomika proti \\(P_1=(-3,3)\\), vendar ga ne doseže.', 'The point moves toward \\(P_1=(-3,3)\\) as the weight grows, but never reaches it.')],
            scene: rationalScene('rational-base-heavy', [1, 4, 1, 1], RATIONAL_ACTIONS, 'Uteži \\((1,4,1,1)\\) in \\(B(\\tfrac{1}{2})\\) so pripravljene za primerjavo.', 'The weights \\((1,4,1,1)\\) and \\(B(\\tfrac{1}{2})\\) are ready for comparison.'),
        },
        {
            id: 'rational-base-endpoints', order: 4,
            title: text('Krajišči ostaneta določeni', 'The endpoints remain determined'),
            purpose: text('Preverjanje, da druga utež ne vpliva na krajišči.', 'Checking that the second weight does not affect the endpoints.'),
            explanation: text('Pri \\(t=0\\) in \\(t=1\\) preživi samo prvi oziroma zadnji Bernsteinov člen in njegova utež se pokrajša. Zato je pri utežeh \\((1,1,1,1)\\), \\((1,2,1,1)\\) in \\((1,4,1,1)\\) začetek vedno \\(P_0=(-4,-3)\\), konec pa \\(P_3=(4,-3)\\); druga utež vpliva le na notranji potek.', 'At \\(t=0\\) and \\(t=1\\) only the first or last Bernstein term survives and its weight cancels. So for the weights \\((1,1,1,1)\\), \\((1,2,1,1)\\) and \\((1,4,1,1)\\) the start is always \\(P_0=(-4,-3)\\) and the end \\(P_3=(4,-3)\\); the second weight only affects the interior.'),
            formulaIds: ['rational-base-endpoints'],
            frames: [frame('rational-base-endpoints-explanation', 'explanation'), frame('rational-base-endpoints-observation', 'observation')],
            observationPrompt: text('Primerjaj začetek in konec krivulje s točkama \\(P_0\\) in \\(P_3\\) pri utežeh \\((1,4,1,1)\\).', 'Compare the start and end of the curve with \\(P_0\\) and \\(P_3\\) for the weights \\((1,4,1,1)\\).'),
            expectedObservations: [text('Krivulja se začne v \\((-4,-3)\\) in konča v \\((4,-3)\\), kljub veliki drugi uteži.', 'The curve starts at \\((-4,-3)\\) and ends at \\((4,-3)\\) despite the large second weight.')],
            scene: rationalScene('rational-base-endpoint-check', [1, 4, 1, 1], RATIONAL_ACTIONS, 'Uteži \\((1,4,1,1)\\); krajišči sta v \\(P_0\\) in \\(P_3\\), označena točka je pri \\(t=\\tfrac{1}{2}\\).', 'The weights \\((1,4,1,1)\\); the endpoints are at \\(P_0\\) and \\(P_3\\), and the marked point is at \\(t=\\tfrac{1}{2}\\).'),
        },
        {
            id: 'rational-base-analysis', order: 5,
            title: text('Samostojna analiza uteži', 'Independent weight analysis'),
            purpose: text('Povezava uteži, parametra in položaja točke.', 'Connecting weights, parameter, and point position.'),
            explanation: text('Začni z utežmi \\((1,1,1,1)\\) in jih spreminjaj. Premik uteži ne premakne kontrolnega poligona, spremeni pa vrednost \\(B(\\tfrac{1}{2})\\).', 'Start from the weights \\((1,1,1,1)\\) and change them. Changing a weight does not move the control polygon but changes the value \\(B(\\tfrac{1}{2})\\).'),
            formulaIds: ['rational-base-weighted-form', 'rational-base-equal-weights'],
            frames: [frame('rational-base-analysis-explanation', 'explanation'), frame('rational-base-analysis-observation', 'observation')],
            observationPrompt: text('Nastavi drugo utež na \\(2\\) in nato na \\(4\\) ter preveri, ali dobiš točki iz prejšnjih korakov; nato poskusi še tretjo utež.', 'Set the second weight to \\(2\\) and then to \\(4\\) and check that you get the points from the previous steps; then try the third weight.'),
            expectedObservations: [text('Razlaga mora povezati položaj, Bernsteinov faktor in utež, ne samo videza krivulje.', 'The explanation should connect position, the Bernstein factor, and the weight—not only the curve’s appearance.')],
            scene: rationalScene('rational-base-analysis', [1, 1, 1, 1], RATIONAL_ACTIONS, 'Končna scena se začne pri enakih utežeh; poligon, uteži in točka pri \\(t=\\tfrac{1}{2}\\) so vidni.', 'The final scene starts from equal weights; the polygon, weights, and the point at \\(t=\\tfrac{1}{2}\\) are visible.'),
        },
    ],
    sources: [
        {id: 'farin-rational-base', citation: 'Farin, G. Curves and Surfaces for CAGD: A Practical Guide, 5th ed., Morgan Kaufmann, 2002.', implementationCorrespondence: 'The repository evaluates the rational curve with weighted Bernstein terms in src/bezeg/impl/curve/rational-bezier-curve.ts.'},
        {id: 'bezeg-rational-base', citation: 'Bezeg source: src/graphs/curves/rational/RationalBezierCurveGraph.tsx and src/graphs/curves/object/JXGRationalBezierCurve.ts.'},
    ],
    edgeCases: [
        text('Negativne ali ničelne uteži lahko povzročijo nedoločeno projekcijo in niso del te uvodne scene.', 'Negative or zero weights can produce an undefined projection and are outside this introductory scene.'),
        text('Pri enakih utežeh se racionalna oblika reducira na navadno Bézierjevo krivuljo.', 'With equal weights the rational form reduces to the ordinary Bézier curve.'),
    ],
    unresolvedQuestions: [text('Pred classroom-ready pregledom potrdi, ali naj bo neposredno urejanje uteži ločen napredni korak.', 'Before classroom-ready review, confirm whether direct weight editing should be a separate advanced step.')],
};

const phQuintic: GuidedLesson = {
    demonstrationId: 'ph-quintic',
    title: text('Kvintična PH-krivulja', 'Quintic PH curve'),
    summary: text('Poveži tri generatorje hodografa, polinomsko hitrost in odmično krivuljo.', 'Connect three hodograph generators, polynomial speed, and an offset curve.'),
    prerequisites: [
        text('Potrebno je osnovno poznavanje vektorjev in odvoda parametrične krivulje.', 'Assumes basic familiarity with vectors and derivatives of parametric curves.'),
        text('Potrebno je razumeti, da je odmik dodatna konstrukcija in ne nova osnovna krivulja.', 'Assumes that an offset is an additional construction, not a new base curve.'),
    ],
    learningGoals: [
        text('Povežeš število generatorjev z lihim stopnjam PH-krivulje.', 'Connect the number of generators with the odd degree of a PH curve.'),
        text('Izračunaš polinomsko hitrost iz hodografa.', 'Calculate polynomial speed from the hodograph.'),
        text('Razložiš vpliv predznaka in velikosti odmika.', 'Explain the effect of offset sign and magnitude.'),
    ],
    formulaBlocks: [
        {id: 'ph-quintic-degree', latex: 'm=3\\Longrightarrow\\deg r=2m-1=5', notation: text('Trije generatorji določijo kvintično PH-krivuljo.', 'Three generators determine a quintic PH curve.'), explanation: text('Stopnja je ena manj kot dvakratno število generatorjev.', 'The degree is one less than twice the number of generators.')},
        {id: 'ph-quintic-hodograph', latex: 'w(t)=\\sum_{i=0}^{2}b_{i,2}(t)w_i,\\qquad r\'(t)=w(t)^2', notation: text('Hodograf se kvadrira v kompleksni predstavitvi odvoda.', 'The hodograph is squared in the complex representation of the derivative.'), explanation: text('Kvadrat ne pomeni navadnega skalarnega kvadrata; uporablja se kompleksno množenje ravninskih vektorjev.', 'The square is not an ordinary scalar square; it uses complex multiplication of planar vectors.')},
        {id: 'ph-quintic-speed', latex: '\\|r\'(t)\\|=\\|w(t)\\|^2', notation: text('Hitrost je kvadrat dolžine hodografa.', 'Speed is the square of the hodograph length.'), explanation: text('Zato je hitrost polinom in jo lahko preverimo brez numeričnega odvajanja izrisa.', 'The speed is therefore polynomial and can be checked without numerically differentiating the drawing.')},
        {id: 'ph-quintic-offset', latex: 'r_d(t)=r(t)+d\\,n(t),\\qquad n(t)=\\frac{\\left(y\'(t),\\,-x\'(t)\\right)}{\\|r\'(t)\\|}', notation: text('Odmik uporablja razdaljo \\(d\\) in enotsko normalo \\(n(t)\\) desno od smeri potovanja; \\(d>0\\) je desna, \\(d<0\\) leva stran.', 'The offset uses distance \\(d\\) and the unit normal \\(n(t)\\) to the right of the direction of travel; \\(d>0\\) is the right side and \\(d<0\\) the left.'), explanation: text('Osnovna PH-krivulja ostane enaka, medtem ko se doda odmična konstrukcija; ta je regularna, dokler je \\(1+d\\kappa>0\\) za predznačeno ukrivljenost \\(\\kappa\\).', 'The base PH curve stays the same while an offset construction is added; the offset is regular while \\(1+d\\kappa>0\\) for the signed curvature \\(\\kappa\\).')},
    ],
    workedExamples: [{
        id: 'ph-quintic-speed-midpoint', title: text('Hitrost in dolžina loka', 'Speed and arc length'),
        calculationLatex: 'w(t)=(2-t^2)+i(2t-t^2),\\;\\;w(\\tfrac12)=\\tfrac14\\cdot2+\\tfrac12(2+i)+\\tfrac14(1+i)=\\tfrac74+\\tfrac34i,\\;\\;\\|r\'(\\tfrac12)\\|=\\tfrac{49}{16}+\\tfrac{9}{16}=\\tfrac{29}{8},\\;\\;L=\\int_0^1\\left(4-4t^3+2t^4\\right)dt',
        resultLatex: '\\text{speed}(t)=4-4t^3+2t^4,\\quad \\text{speed}(\\tfrac12)=\\tfrac{29}{8},\\quad L=4-1+\\tfrac25=\\tfrac{17}{5}=3.4',
        check: text('Dolžina loka \\(\\tfrac{17}{5}\\) se ujema z odčitkom na grafu; primerjaj jo s hodografom in ne z vizualno dolžino odseka.', 'The arc length \\(\\tfrac{17}{5}\\) matches the readout on the graph; compare it with the hodograph, not with the visual length of a segment.'),
    }],
    steps: [
        {
            id: 'ph-quintic-degree', order: 1, title: text('Tri generatorji, stopnja pet', 'Three generators, degree five'),
            purpose: text('Razumevanje vhodnih podatkov kvintične PH-krivulje.', 'Understanding the inputs of the quintic PH curve.'),
            explanation: text('Scena začne s \\(P_0=\\left(-2,\\,-1\\right)\\) in tremi generatorji \\(w_0=2\\), \\(w_1=2+i\\), \\(w_2=1+i\\), torej \\(w(t)=(2-t^2)+i(2t-t^2)\\).', 'The scene starts with \\(P_0=\\left(-2,\\,-1\\right)\\) and three generators \\(w_0=2\\), \\(w_1=2+i\\), \\(w_2=1+i\\), so \\(w(t)=(2-t^2)+i(2t-t^2)\\).'),
            formulaIds: ['ph-quintic-degree'], frames: [frame('ph-quintic-degree-explanation', 'explanation'), frame('ph-quintic-degree-observation', 'observation')],
            observationPrompt: text('Preštej generatorje in poveži njihovo število s stopnjo krivulje. Preveri, da je \\(w_0-2w_1+w_2=-1-i\\) različno od nič.', 'Count the generators and connect their number with the curve degree. Check that \\(w_0-2w_1+w_2=-1-i\\) is nonzero.'),
            expectedObservations: [text('Trije generatorji dajo stopnjo 5; generatorji so vhod, večina kontrolnih točk krivulje pa je izpeljana. Ker \\(w_0-2w_1+w_2\\) ni nič, hodograf ni linearen in krivulja je res kvintična, ne zgolj kubična.', 'Three generators give degree 5; the generators are inputs, while most curve control points are derived. Because \\(w_0-2w_1+w_2\\) is nonzero the hodograph is not linear, so the curve is genuinely quintic rather than merely cubic.')],
            scene: phQuinticScene('ph-quintic-default', [], 'Scena vsebuje šest kontrolnih točk od \\(\\left(-2,\\,-1\\right)\\) do \\(\\left(\\tfrac13,\\,\\tfrac{16}{15}\\right)\\), brez odmika.', 'The scene contains six control points from \\(\\left(-2,\\,-1\\right)\\) to \\(\\left(\\tfrac13,\\,\\tfrac{16}{15}\\right)\\), without an offset.'),
        },
        {
            id: 'ph-quintic-speed', order: 2, title: text('Hodograf določa hitrost', 'The hodograph determines speed'),
            purpose: text('Povezava hodografa z odvodom in hitrostjo.', 'Connecting the hodograph with the derivative and speed.'),
            explanation: text('Pri \\(t=\\tfrac{1}{2}\\) se trije generatorji zmešajo z Bernsteinovimi faktorji stopnje 2; nato kvadrat norme določi hitrost.', 'At \\(t=\\tfrac{1}{2}\\) the three generators mix with degree-two Bernstein factors; the squared norm then gives speed.'),
            formulaIds: ['ph-quintic-hodograph', 'ph-quintic-speed'], frames: [frame('ph-quintic-speed-explanation', 'explanation'), frame('ph-quintic-speed-calculation', 'calculation'), frame('ph-quintic-speed-observation', 'observation')], workedExampleId: 'ph-quintic-speed-midpoint',
            observationPrompt: text('Preveri hitrost \\(\\tfrac{29}{8}\\) z izračunom srednjega hodografa in primerjaj njen potek: pri \\(t=0\\) je \\(4\\), pri \\(t=1\\) pa \\(2\\).', 'Check the speed \\(\\tfrac{29}{8}\\) by calculating the midpoint hodograph and compare its course: it is \\(4\\) at \\(t=0\\) and \\(2\\) at \\(t=1\\).'),
            expectedObservations: [text('Hitrost \\(4-4t^3+2t^4\\) je kvadrat dolžine hodografa, ne dolžina osnovne krivulje; njen integral da dolžino loka \\(\\tfrac{17}{5}=3{,}4\\), kar kaže tudi odčitek na grafu.', 'The speed \\(4-4t^3+2t^4\\) is the squared length of the hodograph, not the length of the base curve; its integral gives the arc length \\(\\tfrac{17}{5}=3.4\\), which the readout on the graph also shows.')],
            scene: phQuinticScene('ph-quintic-speed-scene', [{kind: 'curve-evaluation', parameter: 0.5}], 'Označena je srednja točka osnovne krivulje, kjer je \\(w(\\tfrac12)=\\tfrac74+\\tfrac34i\\).', 'The midpoint of the base curve is marked, where \\(w(\\tfrac12)=\\tfrac74+\\tfrac34i\\).'),
        },
        {
            id: 'ph-quintic-offset-positive', order: 3, title: text('Pozitiven odmik', 'Positive offset'),
            purpose: text('Razlikovanje osnovne in odmične krivulje.', 'Distinguishing the base curve from its offset.'),
            explanation: text('Pri \\(d=0{,}5\\) runtime prikaže odmično krivuljo, osnovna PH-krivulja pa ostane ista.', 'At \\(d=0.5\\) the runtime shows an offset curve while the base PH curve stays the same.'),
            formulaIds: ['ph-quintic-offset'], frames: [frame('ph-quintic-offset-positive-explanation', 'explanation'), frame('ph-quintic-offset-positive-observation', 'observation')],
            observationPrompt: text('Primerjaj osnovno krivuljo in odmik pri \\(d=0{,}5\\).', 'Compare the base curve and the offset at \\(d=0.5\\).'),
            expectedObservations: [text('Odmik je dodatna konstrukcija; generatorji in osnovna krivulja se ne zamenjajo.', 'The offset is an additional construction; the generators and base curve are not replaced.')],
            scene: phQuinticScene('ph-quintic-offset-positive', [{kind: 'parameter', name: 'offset-distance', value: 0.5}, {kind: 'curve-visibility', target: 'offset-curve', visible: true}], 'Prikazan je odmik pri \\(d=0{,}5\\), na desni (spodnji) strani krivulje.', 'The offset at \\(d=0.5\\) is shown, on the right (lower) side of the curve.'),
        },
        {
            id: 'ph-quintic-offset-sign', order: 4, title: text('Predznak odmika', 'Offset sign'),
            purpose: text('Opazovanje spremembe strani odmika.', 'Observing the change of offset side.'),
            explanation: text('Negativen \\(d\\) izbere nasprotno stran normalne smeri, to je notranjo stran zavoja. Krivulja se povsod obrača v levo, njena ukrivljenost je največ \\(1\\) (pri \\(t=1\\)), zato je odmik na levi regularen le pri \\(|d|<1\\); pri \\(d=-1\\) bi dobili ostan. Osnovna krivulja ostane nespremenjena.', 'A negative \\(d\\) selects the opposite normal side, the inner side of the bend. The curve turns left everywhere and its curvature is at most \\(1\\) (at \\(t=1\\)), so the offset on the left is regular only for \\(|d|<1\\); at \\(d=-1\\) a cusp would appear. The base curve stays unchanged.'),
            formulaIds: ['ph-quintic-offset'], frames: [frame('ph-quintic-offset-sign-explanation', 'explanation'), frame('ph-quintic-offset-sign-observation', 'observation')],
            observationPrompt: text('Primerjaj odmika pri \\(d=0{,}5\\) in \\(d=-0{,}5\\) ter opiši nespremenjeni del.', 'Compare \\(d=0.5\\) and \\(d=-0.5\\) and describe what does not change.'),
            expectedObservations: [text('Predznak spremeni stran odmika, ne pa stopnje ali vhodnih generatorjev.', 'The sign changes the offset side, not the degree or input generators.')],
            scene: phQuinticScene('ph-quintic-offset-negative', [{kind: 'parameter', name: 'offset-distance', value: -0.5}, {kind: 'curve-visibility', target: 'offset-curve', visible: true}], 'Prikazan je odmik pri \\(d=-0{,}5\\), na levi (zgornji) strani krivulje.', 'The offset at \\(d=-0.5\\) is shown, on the left (upper) side of the curve.'),
        },
        {
            id: 'ph-quintic-analysis', order: 5, title: text('Samostojna analiza', 'Independent analysis'),
            purpose: text('Povezava generatorjev, hitrosti in odmika.', 'Connecting generators, speed, and offset.'),
            explanation: text('Pri prostem raziskovanju loči, kaj določa osnovno krivuljo, kaj določa hitrost in kaj je samo odmični prikaz.', 'During free exploration, distinguish what determines the base curve, speed, and the offset display.'),
            formulaIds: ['ph-quintic-hodograph', 'ph-quintic-speed'], frames: [frame('ph-quintic-analysis-explanation', 'explanation'), frame('ph-quintic-analysis-observation', 'observation')],
            observationPrompt: text('Izberi razdaljo odmika in razloži, kateri podatki ostanejo nespremenjeni.', 'Choose an offset distance and explain which data remain unchanged.'),
            expectedObservations: [text('Generatorji določajo PH-krivuljo in hitrost; \\(d\\) določa odmični prikaz.', 'The generators determine the PH curve and speed; \\(d\\) determines the offset display.')],
            scene: phQuinticScene('ph-quintic-analysis-scene', [{kind: 'parameter', name: 'offset-distance', value: 1}, {kind: 'curve-visibility', target: 'offset-curve', visible: true}], 'Končna scena prikazuje odmik pri \\(d=1\\) na zunanji strani zavoja, kjer je odmik vedno regularen.', 'The final scene shows the offset at \\(d=1\\) on the outer side of the bend, where the offset is always regular.'),
        },
    ],
    sources: [
        {id: 'farouki-ph-quintic', citation: 'Farouki, R. T. Pythagorean-Hodograph Curves: Algebra and Geometry Inseparable, Springer, 2008.', implementationCorrespondence: 'The repository constructs degree 2m-1 PH curves from m generators in src/bezeg/impl/curve/ph-bezier-curve.ts.'},
        {id: 'bezeg-ph-quintic', citation: 'Bezeg source: src/graphs/curves/ph/QuinticPhBezierCurveGraph.tsx, src/graphs/curves/ph/BasePhBezierCurveGraph.tsx, and src/graphs/curves/object/JXGPHBezierCurve.ts.'},
    ],
    edgeCases: [
        text('Če hodograf izgine, regularnost in normalna smer odmika nista zagotovljeni.', 'If the hodograph vanishes, regularity and a normal offset direction are not guaranteed.'),
        text('Najmanjši polmer ukrivljenosti te krivulje je \\(1\\) (pri \\(t=1\\)); odmik na levi strani pri \\(d=-1\\) bi imel tam ostan, zato lekcija uporablja \\(d=-0{,}5\\).', 'The smallest radius of curvature of this curve is \\(1\\) (at \\(t=1\\)); the offset on the left at \\(d=-1\\) would have a cusp there, so the lesson uses \\(d=-0.5\\).'),
        text('Odmik ni dokaz, da sta dve krivulji povsod na enaki vizualni razdalji v projekciji zaslona.', 'An offset is not evidence that two curves are at equal visual distance in screen projection everywhere.'),
    ],
    unresolvedQuestions: [text('Pred classroom-ready pregledom preveri, ali želiš vključiti sekundarni graf generatorjev kot ločeno dejavnost.', 'Before classroom-ready review, decide whether the secondary generator graph should be a separate activity.')],
};

/**
 * Affine lesson fixture: an asymmetric cubic whose marked point B(1/2)=(3,7/4) is far from the origin. The graph rotates about
 * the mean of the control points and scales about the centre of their bounding box; both are (3,1) here
 * (AbstractPointControlledCurve.transform / scale / rotate).
 */
const affineFixture: LessonCurveFixture = {points: [[1, 0], [2, 3], [4, 2], [5, -1]]};
const affineView: LessonViewBox = [-5, 7, 9, -5];
const affineScene = (id: string, actions: readonly LessonAction[], sl: string, en: string): LessonScene => ({
    id, basedOn: 'lesson-fixture', curve: affineFixture, view: affineView, actions, expectedState: text(sl, en),
});
const QUARTER_TURN = Math.PI / 2;

const affine: GuidedLesson = {
    demonstrationId: 'affine',
    title: text('Afine transformacije Bézierjeve krivulje', 'Affine transformations of a Bézier curve'),
    summary: text('Preveri, kako premik, četrtinski obrat in merilo delujejo na kontrolne točke in krivuljo ter kje je središče obrata in merila.', 'Check how translation, a quarter-turn and scaling act on control points and the curve, and where the centre of the turn and of the scaling is.'),
    prerequisites: [
        text('Potrebno je osnovno poznavanje linearnih transformacij ravnine.', 'Assumes basic familiarity with planar linear transformations.'),
        text('Potrebno je poznavanje Bézierjevega vrednotenja kot utežene vsote kontrolnih točk.', 'Assumes Bézier evaluation as a weighted sum of control points.'),
    ],
    learningGoals: [
        text('Prepoznaš, da afina transformacija deluje na vse kontrolne točke.', 'Recognize that an affine transformation acts on every control point.'),
        text('Preveriš komutativnost transformacije in vrednotenja.', 'Check that transformation and evaluation commute.'),
        text('Poveš, okoli katere točke graf zavrti in poveča krivuljo.', 'State about which point the graph turns and scales the curve.'),
        text('Ločiš spremembo lege ali merila od spremembe stopnje krivulje.', 'Distinguish a change of position or scale from a change of curve degree.'),
    ],
    formulaBlocks: [
        {id: 'affine-map', latex: 'T(P)=AP+b', notation: text('Afina preslikava je linearni del \\(A\\) in premik \\(b\\).', 'An affine map consists of a linear part \\(A\\) and translation \\(b\\).'), explanation: text('Premik, četrtinski obrat in enakomerno merilo v tej lekciji so afine preslikave, ki uporabljajo isto pravilo za vse kontrolne točke.', 'The translation, quarter-turn and uniform scaling used in this lesson are affine maps that apply the same rule to every control point.')},
        {id: 'affine-pivot', latex: 'T_c(P)=c+A(P-c)=AP+(c-Ac),\\qquad A_{90^\\circ}(x,y)=(-y,x)', notation: text('Obrat in merilo okoli središča \\(c\\): najprej odštejemo \\(c\\), uporabimo \\(A\\), nato spet prištejemo \\(c\\).', 'Turning and scaling about a centre \\(c\\): subtract \\(c\\), apply \\(A\\), then add \\(c\\) again.'), explanation: text('Graf zavrti krivuljo okoli povprečja kontrolnih točk, ne okoli izhodišča, merilo pa spremeni okoli središča pravokotnika, ki objame kontrolne točke. Pri tej krivulji sta obe središči \\((3,1)\\).', 'The graph turns the curve about the mean of the control points, not about the origin, and scales it about the centre of the rectangle that encloses the control points. For this curve both centres are \\((3,1)\\).')},
        {id: 'affine-bezier-commutation', latex: 'T(B(t))=T\\left(\\sum_i b_{i,n}(t)P_i\\right)=\\sum_i b_{i,n}(t)T(P_i)', notation: text('Afina preslikava lahko gre skozi Bernsteinovo vsoto.', 'An affine map can pass through the Bernstein sum.'), explanation: text('Zato lahko transformiraš kontrolne točke ali najprej izračunaš točko krivulje in dobiš isti rezultat.', 'Therefore you can transform the control points or first compute the curve point and obtain the same result.')},
        {id: 'affine-degree-invariant', latex: '\\deg(T(B))=\\deg(B),\\qquad t\\in[0,1]', notation: text('Afina transformacija ne spremeni stopnje ali parametričnega intervala.', 'An affine transformation does not change degree or parameter interval.'), explanation: text('Spremeni se geometrijska lega oziroma merilo, ne pa število Bernsteinovih členov.', 'The geometric position or scale changes, not the number of Bernstein terms.')},
    ],
    workedExamples: [
        {
            id: 'affine-translation-midpoint', title: text('Premik za \\((-2,-1)\\) pri \\(t=\\tfrac{1}{2}\\)', 'Translation by \\((-2,-1)\\) at \\(t=\\tfrac{1}{2}\\)'),
            calculationLatex: 'P=(1,0),(2,3),(4,2),(5,-1);\\quad B(1/2)=\\tfrac18\\,(P_0+3P_1+3P_2+P_3)=(3,7/4);\\quad T(x,y)=(x-2,y-1)',
            resultLatex: 'T(B(1/2))=(1,3/4)=B_T(1/2),\\qquad T(P)=(-1,-1),(0,2),(2,1),(3,-2)',
            check: text('Točka \\(B(\\tfrac{1}{2})\\) se premakne za isti vektor kot vse kontrolne točke; isto vrednost da vrednotenje premaknjenih kontrolnih točk.', 'The point \\(B(\\tfrac{1}{2})\\) moves by the same vector as every control point; evaluating the moved control points gives the same value.'),
        },
        {
            id: 'affine-quarter-turn-midpoint', title: text('Četrtinski obrat okoli \\((3,1)\\) pri \\(t=\\tfrac{1}{2}\\)', 'Quarter-turn about \\((3,1)\\) at \\(t=\\tfrac{1}{2}\\)'),
            calculationLatex: 'c=(3,1),\\quad T(P)=c+(-(y-1),\\,x-3);\\quad T(P)=(4,-1),(1,0),(2,2),(5,3)',
            resultLatex: 'T(B(1/2))=(3,1)+(-3/4,\\,0)=(9/4,\\,1)=B_T(1/2)',
            check: text('Obrat okoli izhodišča bi dal \\(\\left(-\\tfrac{7}{4},\\,3\\right)\\); graf prikaže \\(\\left(\\tfrac{9}{4},\\,1\\right)\\), ker je središče obrata \\((3,1)\\).', 'A turn about the origin would give \\(\\left(-\\tfrac{7}{4},\\,3\\right)\\); the graph shows \\(\\left(\\tfrac{9}{4},\\,1\\right)\\) because the centre of the turn is \\((3,1)\\).'),
        },
        {
            id: 'affine-scale-midpoint', title: text('Merilo \\(2\\) okoli \\((3,1)\\) pri \\(t=\\tfrac{1}{2}\\)', 'Scale \\(2\\) about \\((3,1)\\) at \\(t=\\tfrac{1}{2}\\)'),
            calculationLatex: 'T(P)=c+2(P-c);\\quad T(P)=(-1,-1),(1,5),(5,3),(7,-3)',
            resultLatex: 'T(B(1/2))=(3,1)+2\\,(0,3/4)=(3,5/2)=B_T(1/2)',
            check: text('Točka \\((3,\\tfrac{7}{4})\\) je nad središčem \\((3,1)\\) in se od njega oddalji dvakrat; središče samo ostane na mestu.', 'The point \\((3,\\tfrac{7}{4})\\) lies above the centre \\((3,1)\\) and moves twice as far from it; the centre itself stays put.'),
        },
    ],
    steps: [
        {
            id: 'affine-map', order: 1, title: text('Kaj je afina transformacija?', 'What is an affine transformation?'),
            purpose: text('Razlikovanje linearnega dela in premika.', 'Distinguishing the linear part from translation.'),
            explanation: text('Začnemo s kubično krivuljo s kontrolnimi točkami \\((1,0),(2,3),(4,2),(5,-1)\\). Ni zrcalno simetrična, označena točka \\(B(\\tfrac{1}{2})=\\left(3,\\tfrac{7}{4}\\right)\\) pa je daleč od izhodišča. Afina preslikava lahko spremeni lego, orientacijo ali merilo krivulje, vendar uporablja isto preslikavo za vse kontrolne točke.', 'We start with a cubic curve with control points \\((1,0),(2,3),(4,2),(5,-1)\\). It is not mirror symmetric, and the marked point \\(B(\\tfrac{1}{2})=\\left(3,\\tfrac{7}{4}\\right)\\) is far from the origin. An affine map can change position, orientation, or scale while using the same map for every control point.'),
            formulaIds: ['affine-map', 'affine-degree-invariant'], frames: [frame('affine-map-explanation', 'explanation'), frame('affine-map-observation', 'observation')],
            observationPrompt: text('Preštej kontrolne točke, poišči izhodišče in označeno točko ter opiši, kaj se lahko spremeni brez spremembe stopnje.', 'Count the control points, find the origin and the marked point, and describe what can change without changing degree.'),
            expectedObservations: [text('Krivulja je kubična s štirimi kontrolnimi točkami; označena točka je desno od izhodišča in transformacija stopnje ne spremeni.', 'The curve is cubic with four control points; the marked point is right of the origin and a transformation does not change the degree.')],
            scene: affineScene('affine-default', [{kind: 'curve-visibility', target: 'control-polygon', visible: true}, {kind: 'curve-evaluation', parameter: 0.5}], 'Asimetrična kubična krivulja, kontrolni poligon in \\(B(\\tfrac{1}{2})\\) so vidni.', 'The asymmetric cubic curve, control polygon, and \\(B(\\tfrac{1}{2})\\) are visible.'),
        },
        {
            id: 'affine-translation', order: 2, title: text('Premik skozi Bernsteinovo vsoto', 'Translation through the Bernstein sum'),
            purpose: text('Preverjanje afine komutativnosti na konkretnem primeru.', 'Checking affine commutation in a concrete example.'),
            explanation: text('Premik za \\((-2,-1)\\) doda isti vektor vsaki kontrolni točki in tudi vrednosti \\(B(t)\\).', 'Translating by \\((-2,-1)\\) adds the same vector to every control point and to \\(B(t)\\).'),
            formulaIds: ['affine-bezier-commutation'], frames: [frame('affine-translation-explanation', 'explanation', ['affine-bezier-commutation']), frame('affine-translation-calculation', 'calculation'), frame('affine-translation-observation', 'observation')], workedExampleId: 'affine-translation-midpoint',
            observationPrompt: text('Preveri, ali se \\(B(\\tfrac{1}{2})\\) premakne za isti vektor kot kontrolne točke.', 'Check whether \\(B(\\tfrac{1}{2})\\) moves by the same vector as the control points.'),
            expectedObservations: [text('Po premiku je \\(B_T(\\tfrac{1}{2})=\\left(1,\\,\\tfrac{3}{4}\\right)\\), kar je \\(T(B(\\tfrac{1}{2}))\\).', 'After translation \\(B_T(\\tfrac{1}{2})=\\left(1,\\,\\tfrac{3}{4}\\right)\\), which equals \\(T(B(\\tfrac{1}{2}))\\).')],
            scene: affineScene('affine-translation-left-down', [{kind: 'curve-visibility', target: 'control-polygon', visible: true}, {kind: 'affine-transform', operation: 'translate-x', value: -2}, {kind: 'affine-transform', operation: 'translate-y', value: -1}, {kind: 'curve-evaluation', parameter: 0.5}], 'Krivulja je premaknjena za \\(2\\) v levo in \\(1\\) navzdol.', 'The curve is translated \\(2\\) to the left and \\(1\\) down.'),
        },
        {
            id: 'affine-quarter-turn', order: 3, title: text('Četrtinski obrat okoli središča', 'A quarter-turn about its centre'),
            purpose: text('Ugotoviti, okoli katere točke graf zavrti krivuljo.', 'Finding the point about which the graph turns the curve.'),
            explanation: text('Obrat za \\(90^\\circ\\) v pozitivni smeri (proti urinemu kazalcu) graf izvede okoli povprečja kontrolnih točk, pri tej krivulji okoli \\((3,1)\\), in ne okoli izhodišča. Nove kontrolne točke so \\((4,-1),(1,0),(2,2),(5,3)\\).', 'The graph performs a \\(90^\\circ\\) turn in the positive (counter-clockwise) direction about the mean of the control points, here \\((3,1)\\), and not about the origin. The new control points are \\((4,-1),(1,0),(2,2),(5,3)\\).'),
            formulaIds: ['affine-pivot', 'affine-bezier-commutation'], frames: [frame('affine-quarter-turn-explanation', 'explanation', ['affine-pivot']), frame('affine-quarter-turn-calculation', 'calculation'), frame('affine-quarter-turn-observation', 'observation')], workedExampleId: 'affine-quarter-turn-midpoint',
            observationPrompt: text('Poišči točko, ki jo obrat pusti pri miru, in preveri, da \\(B(\\tfrac{1}{2})\\) ni obrnjena okoli izhodišča.', 'Find the point the turn leaves fixed and check that \\(B(\\tfrac{1}{2})\\) was not turned about the origin.'),
            expectedObservations: [text('Poligon se zavrti okoli \\((3,1)\\), označena točka je pri \\(\\left(\\tfrac{9}{4},\\,1\\right)\\), ne pri \\(\\left(-\\tfrac{7}{4},\\,3\\right)\\).', 'The polygon turns about \\((3,1)\\); the marked point is at \\(\\left(\\tfrac{9}{4},\\,1\\right)\\), not at \\(\\left(-\\tfrac{7}{4},\\,3\\right)\\).')],
            scene: affineScene('affine-quarter-turn', [{kind: 'curve-visibility', target: 'control-polygon', visible: true}, {kind: 'affine-transform', operation: 'rotate', value: QUARTER_TURN}, {kind: 'curve-evaluation', parameter: 0.5}], 'Krivulja je zasukana za četrtinski obrat okoli povprečja kontrolnih točk.', 'The curve is turned a quarter-turn about the mean of its control points.'),
        },
        {
            id: 'affine-scale', order: 4, title: text('Merilo brez spremembe stopnje', 'Scale without changing degree'),
            purpose: text('Opazovanje spremembe velikosti in nespremenjene parametrične strukture.', 'Observing a size change with unchanged parametric structure.'),
            explanation: text('Enakomerno merilo \\(2\\) razteguje krivuljo od središča pravokotnika, ki objame kontrolne točke, pri tej krivulji od \\((3,1)\\). Ne spremeni števila kontrolnih točk ali intervala \\(t\\). Nove kontrolne točke so \\((-1,-1),(1,5),(5,3),(7,-3)\\).', 'Uniform scale \\(2\\) stretches the curve from the centre of the rectangle that encloses the control points, here \\((3,1)\\). It does not change the number of control points or the \\(t\\) interval. The new control points are \\((-1,-1),(1,5),(5,3),(7,-3)\\).'),
            formulaIds: ['affine-pivot', 'affine-degree-invariant'], frames: [frame('affine-scale-explanation', 'explanation'), frame('affine-scale-calculation', 'calculation'), frame('affine-scale-observation', 'observation')], workedExampleId: 'affine-scale-midpoint',
            observationPrompt: text('Primerjaj stopnjo, število točk in oddaljenost označene točke od središča \\((3,1)\\) pred in po spremembi merila.', 'Compare degree, point count, and the distance of the marked point from the centre \\((3,1)\\) before and after scaling.'),
            expectedObservations: [text('Merilo podvoji oddaljenost od središča (označena točka je pri \\(\\left(3,\\,\\tfrac{5}{2}\\right)\\)), ne pa stopnje ali števila Bernsteinovih členov.', 'Scaling doubles the distance from the centre (the marked point is at \\(\\left(3,\\,\\tfrac{5}{2}\\right)\\)) but not the degree or the number of Bernstein terms.')],
            scene: affineScene('affine-scale-up', [{kind: 'curve-visibility', target: 'control-polygon', visible: true}, {kind: 'affine-transform', operation: 'scale', value: 2}, {kind: 'curve-evaluation', parameter: 0.5}], 'Krivulja je povečana z merilom \\(2\\).', 'The curve is enlarged by scale \\(2\\).'),
        },
        {
            id: 'affine-analysis', order: 5, title: text('Samostojna primerjava', 'Independent comparison'),
            purpose: text('Uporaba afine komutativnosti pri sestavljeni transformaciji.', 'Using affine commutation for a composed transformation.'),
            explanation: text('Sestavljena transformacija (premik, obrat, merilo) je spet afina preslikava, zato se transformirane kontrolne točke še vedno ujemajo z označeno vrednostjo krivulje. Središče obrata in merila se premika skupaj s krivuljo.', 'The composed transformation (translation, turn, scaling) is again an affine map, so the transformed control points still agree with the marked curve value. The centre of the turn and of the scaling moves with the curve.'),
            formulaIds: ['affine-bezier-commutation'], frames: [frame('affine-analysis-explanation', 'explanation'), frame('affine-analysis-observation', 'observation')],
            observationPrompt: text('Izberi transformacijo in preveri en parameter, za katerega lahko utemeljiš rezultat.', 'Choose a transformation and check one parameter value whose result you can justify.'),
            expectedObservations: [text('Transformacija vrednosti in transformirano vrednotenje kontrolnih točk se ujemata.', 'Transforming the value and evaluating transformed control points agree.')],
            scene: affineScene('affine-composed', [{kind: 'curve-visibility', target: 'control-polygon', visible: true}, {kind: 'affine-transform', operation: 'translate-x', value: -2}, {kind: 'affine-transform', operation: 'translate-y', value: -1}, {kind: 'affine-transform', operation: 'rotate', value: QUARTER_TURN}, {kind: 'affine-transform', operation: 'scale', value: 2}, {kind: 'curve-evaluation', parameter: 0.75}], 'Prikazani so premik, četrtinski obrat in merilo \\(2\\) skupaj, označena točka je pri \\(t=\\tfrac{3}{4}\\).', 'Translation, quarter-turn and scale \\(2\\) are shown together, the marked point is at \\(t=\\tfrac{3}{4}\\).'),
        },
    ],
    sources: [
        {id: 'farin-affine-bezier', citation: 'Farin, G. Curves and Surfaces for CAGD: A Practical Guide, 5th ed., Morgan Kaufmann, 2002.', implementationCorrespondence: 'The implementation transforms the point-controlled curve while evaluating the same Bernstein representation.'},
        {id: 'bezeg-affine', citation: 'Bezeg source: src/graphs/curves/bezier/AffineTransformsBezierCurveGraph.tsx and src/bezeg/impl/curve/abstract-point-controlled-curve.ts.', implementationCorrespondence: 'rotate() calls transform() without a centre, so the pivot is the mean of the control points; scale() uses the centre of the control points\' bounding box; moveFor() adds a vector.'},
    ],
    edgeCases: [
        text('Afina transformacija lahko spremeni lego ali merilo, vendar ne sme ustvariti nove stopnje.', 'An affine transformation can change position or scale, but it does not create a new degree.'),
        text('Obrat in zrcaljenje graf izvede okoli povprečja kontrolnih točk, merilo pa okoli središča pravokotnika, ki objame kontrolne točke; pri splošni krivulji se središči razlikujeta (tu se ujemata v \\((3,1)\\)).', 'The graph turns and reflects about the mean of the control points and scales about the centre of the rectangle enclosing them; for a general curve these differ (here they coincide at \\((3,1)\\)).'),
    ],
    unresolvedQuestions: [text('Središče obrata in merila graf ne nariše; pred ločeno lekcijo za vrtenje in zrcaljenje preveri, ali ga je treba prikazati ali izbrati.', 'The graph does not draw the centre of the turn and the scaling; before a separate rotation and reflection lesson, decide whether it should be shown or chosen.')],
};

export const expansionGuidedLessons: readonly GuidedLesson[] = [rational, phQuintic, affine];
