import type {LessonAction, LessonCurveFixture, LessonViewBox} from '../model';
import type {GuidedLesson, GuidedLessonFrame, GuidedLessonFrameKind, LessonScene, LocalizedText} from './guidedLessons';

const text = (sl: string, en: string): LocalizedText => ({sl, en});
const frame = (id: string, kind: GuidedLessonFrameKind, formulaIds?: readonly string[]): GuidedLessonFrame => ({id, kind, formulaIds});

/**
 * Rational De Casteljau fixtures at t=1/2. Quadratic P=(-4,-3),(0,3),(4,-3): w=(1,1,1) gives rows (-2,0),(2,0) and B=(0,0);
 * w=(1,2,1) lifts to Q=(-4,-3,1),(0,6,2),(4,-3,1), row 1 (-2,3/2,3/2),(2,3/2,3/2), Q^(2)=(0,3/2,3/2), B=(0,1).
 * Cubic P=(-4,-3),(-3,3),(3,3),(4,-3): w=(1,1,1,1) gives B=(0,3/2); w=(1,2,1,1) gives Q^(3)=(-9/8,21/8,11/8), B=(-9/11,21/11).
 */
const rationalDecasteljauView: LessonViewBox = [-6, 5, 6, -4.5];
const quadraticFixture = (weights: readonly number[]): LessonCurveFixture => ({points: [[-4, -3], [0, 3], [4, -3]], weights});
const cubicFixture = (weights: readonly number[]): LessonCurveFixture => ({points: [[-4, -3], [-3, 3], [3, 3], [4, -3]], weights});
const rationalDecasteljauScene = (id: string, curve: LessonCurveFixture, actions: readonly LessonAction[], sl: string, en: string): LessonScene => ({
    id, basedOn: 'lesson-fixture', curve, view: rationalDecasteljauView, actions, expectedState: text(sl, en),
});
const RATIONAL_DECASTELJAU_ACTIONS: readonly LessonAction[] = [
    {kind: 'curve-visibility', target: 'decasteljau-scheme', visible: true},
    {kind: 'curve-visibility', target: 'weights', visible: true},
    {kind: 'parameter', name: 't', value: 0.5},
];

const rationalDecasteljau: GuidedLesson = {
    demonstrationId: 'rational-decasteljau',
    title: text('Racionalna De Casteljaujeva konstrukcija', 'Rational De Casteljau construction'),
    summary: text(
        'Racionalna konstrukcija uporablja utežene kontrolne točke v homogenih koordinatah in jih nato projicira nazaj v ravnino; najprej jo vidiš pri enakih utežeh, kjer je enaka navadni, nato pa pri spremenjeni uteži.',
        'The rational construction interpolates weighted control points in homogeneous coordinates and then projects them back to the plane; you first see it with equal weights, where it equals the ordinary one, and then with a changed weight.',
    ),
    prerequisites: [
        text('Potrebno je osnovno poznavanje linearne interpolacije in Bézierjevih kontrolnih točk.', 'Assumes familiarity with linear interpolation and Bézier control points.'),
        text('Potrebno je razumevanje, da utež spreminja vpliv kontrolne točke.', 'Assumes that a weight changes the influence of a control point.'),
    ],
    learningGoals: [
        text('Razložiš, zakaj racionalna krivulja potrebuje uteži in homogen zapis.', 'Explain why rational curves use weights and a homogeneous representation.'),
        text('Prebereš vrstico racionalne De Casteljaujeve konstrukcije pri \\(t=\\tfrac{1}{2}\\) in opaziš, da pri enakih utežeh zadnja koordinata ostane \\(1\\).', 'Read a row of the rational De Casteljau construction at \\(t=\\tfrac{1}{2}\\) and notice that with equal weights the last coordinate stays \\(1\\).'),
        text('Povežeš končno projekcijo konstrukcije z vrednostjo racionalne Bézierjeve krivulje.', 'Connect the final projection of the construction with the value of a rational Bézier curve.'),
    ],
    formulaBlocks: [
        {
            id: 'rational-weighted-form',
            latex: '\\mathbf{B}(t)=\\frac{\\sum_{i=0}^{n}b_{i,n}(t)w_iP_i}{\\sum_{i=0}^{n}b_{i,n}(t)w_i}',
            notation: text(
                'Števec je utežena vsota kontrolnih točk, imenovalec pa normalizira skupni vpliv uteži.',
                'The numerator is a weighted sum of control points; the denominator normalizes the total weight.',
            ),
            explanation: text(
                'Če so vse uteži enake, dobimo navadno Bézierjevo krivuljo. Različne pozitivne uteži spremenijo vpliv kontrolnih točk.',
                'Equal weights give the ordinary Bézier curve. Different positive weights change the influence of the control points.',
            ),
        },
        {
            id: 'rational-homogeneous-row',
            latex: 'Q_i^{(0)}=(w_iP_i,w_i),\\qquad Q_i^{(r)}(t)=(1-t)Q_i^{(r-1)}(t)+tQ_{i+1}^{(r-1)}(t)',
            notation: text(
                'Točka \\(P_i\\) se dvigne v homogeno točko \\((w_iP_i,w_i)\\); interpolacija poteka v treh koordinatah.',
                'The point \\(P_i\\) is lifted to \\((w_iP_i,w_i)\\); interpolation then happens in three coordinates.',
            ),
            explanation: text(
                'Prvi dve koordinati nosita utežen položaj, zadnja pa utež. V vsaki vrstici se vse tri koordinate interpolirajo skupaj.',
                'The first two coordinates carry the weighted position and the last carries the weight. All three coordinates are interpolated together in each row.',
            ),
        },
        {
            id: 'rational-projection',
            latex: 'Q_0^{(n)}(t)=(A_x,A_y,\\lambda),\\qquad \\mathbf{B}(t)=\\left(\\frac{A_x}{\\lambda},\\frac{A_y}{\\lambda}\\right)',
            notation: text(
                'Končna homogena točka se projicira v ravnino z deljenjem prvih dveh koordinat z zadnjo.',
                'The final homogeneous point is projected to the plane by dividing its first two coordinates by the last.',
            ),
            explanation: text(
                'Projekcija je zadnji korak konstrukcije. Pri \\(\\lambda=0\\) vrednost ni določena, zato mora regularnost ostati vidna.',
                'Projection is the final construction step. When \\(\\lambda=0\\), the value is undefined, so regularity must remain explicit.',
            ),
        },
    ],
    workedExamples: [
        {
            id: 'rational-decasteljau-quadratic',
            title: text('Kvadratna krivulja z utežmi \\((1,2,1)\\) pri \\(t=\\tfrac{1}{2}\\)', 'Quadratic curve with weights \\((1,2,1)\\) at \\(t=\\tfrac{1}{2}\\)'),
            calculationLatex: 'P=(-4,-3),(0,3),(4,-3),\\quad w=(1,2,1),\\quad Q^{(0)}=(-4,-3,1),(0,6,2),(4,-3,1),\\quad Q^{(1)}=(-2,3/2,3/2),(2,3/2,3/2)',
            resultLatex: 'Q^{(2)}=(0,3/2,3/2),\\quad\\mathbf{B}(1/2)=\\frac{(0,3/2)}{3/2}=(0,1)',
            check: text(
                'Pri enakih utežeh \\((1,1,1)\\) ostane zadnja koordinata \\(1\\) in dobimo navadno točko \\((0,0)\\); utež \\(2\\) jo dvigne na \\((0,1)\\).',
                'With equal weights \\((1,1,1)\\) the last coordinate stays \\(1\\) and we get the ordinary point \\((0,0)\\); the weight \\(2\\) lifts it to \\((0,1)\\).',
            ),
        },
        {
            id: 'rational-decasteljau-midpoint',
            title: text('Kubična krivulja z utežmi \\((1,2,1,1)\\) pri \\(t=1/2\\)', 'Cubic curve with weights \\((1,2,1,1)\\) at \\(t=1/2\\)'),
            calculationLatex: 'P=(-4,-3),(-3,3),(3,3),(4,-3),\\quad w=(1,2,1,1),\\quad Q^{(0)}=(-4,-3,1),(-6,6,2),(3,3,1),(4,-3,1),\\quad Q^{(1)}=(-5,3/2,3/2),(-3/2,9/2,3/2),(7/2,0,1),\\quad Q^{(2)}=(-13/4,3,3/2),(1,9/4,5/4)',
            resultLatex: 'Q^{(3)}=(-9/8,21/8,11/8),\\quad\\mathbf{B}(1/2)=\\frac{(-9/8,21/8)}{11/8}=(-9/11,21/11)',
            check: text(
                'Rezultat preveri z zadnjo točko konstrukcije in z neodvisnim izračunom utežene Bernsteinove oblike. Pri enakih utežeh \\((1,1,1,1)\\) je rezultat navadna točka \\((0,3/2)\\).',
                'Check the result against the final construction point and an independent weighted Bernstein calculation. With equal weights \\((1,1,1,1)\\) the result is the ordinary point \\((0,3/2)\\).',
            ),
        },
    ],
    steps: [
        {
            id: 'rational-decasteljau-idea', order: 1,
            title: text('Enake uteži: navadna konstrukcija', 'Equal weights: the ordinary construction'),
            purpose: text('Začeti z znano konstrukcijo, da je vpliv uteži viden kot sprememba.', 'Starting from the familiar construction so that the effect of a weight is visible as a change.'),
            explanation: text(
                'Začnemo s kvadratno krivuljo s kontrolnimi točkami \\((-4,-3),(0,3),(4,-3)\\), da je izračun krajši. Pri utežeh \\((1,1,1)\\) so homogene točke \\((-4,-3,1),(0,3,1),(4,-3,1)\\); zadnja koordinata ostane \\(1\\), prvi dve pa se interpolirata kot pri navadni De Casteljaujevi konstrukciji: pri \\(t=\\tfrac{1}{2}\\) dobimo \\((-2,0)\\), \\((2,0)\\) in končno točko \\((0,0)\\).',
                'We start with a quadratic curve with control points \\((-4,-3),(0,3),(4,-3)\\) to keep the calculation short. With the weights \\((1,1,1)\\) the homogeneous points are \\((-4,-3,1),(0,3,1),(4,-3,1)\\); the last coordinate stays \\(1\\) and the first two are interpolated exactly as in the ordinary De Casteljau construction: at \\(t=\\tfrac{1}{2}\\) we get \\((-2,0)\\), \\((2,0)\\) and the final point \\((0,0)\\).',
            ),
            formulaIds: ['rational-weighted-form'],
            frames: [frame('rational-decasteljau-idea-explanation', 'explanation'), frame('rational-decasteljau-idea-observation', 'observation')],
            scene: rationalDecasteljauScene(
                'rational-decasteljau-default', quadraticFixture([1, 1, 1]), RATIONAL_DECASTELJAU_ACTIONS,
                'Kvadratna krivulja z utežmi \\((1,1,1)\\) in konstrukcija pri \\(t=\\tfrac{1}{2}\\) sta vidni; končna točka je \\((0,0)\\).',
                'The quadratic curve with weights \\((1,1,1)\\) and its construction at \\(t=\\tfrac{1}{2}\\) are visible; the final point is \\((0,0)\\).',
            ),
            observationPrompt: text('Preberi uteži in končno točko konstrukcije; to je primerjalna točka za naslednja koraka.', 'Read the weights and the final point of the construction; it is the reference point for the next steps.'),
            expectedObservations: [text('Vse uteži so \\(1\\) in konstrukcija je navadna; končna točka je \\((0,0)\\).', 'All weights are \\(1\\) and the construction is ordinary; the final point is \\((0,0)\\).')],
        },
        {
            id: 'rational-decasteljau-homogeneous', order: 2,
            title: text('Interpolacija v homogenih koordinatah', 'Interpolation in homogeneous coordinates'),
            purpose: text('Razumevanje, kaj se interpolira v posamezni vrstici, ko utež ni povsod \\(1\\).', 'Understanding what is interpolated in each row once the weight is not \\(1\\) everywhere.'),
            explanation: text(
                'Spremenimo samo srednjo utež na \\(2\\): točke so še vedno \\((-4,-3),(0,3),(4,-3)\\), homogene točke pa \\((-4,-3,1),(0,6,2),(4,-3,1)\\). Prva vrstica pri \\(t=\\tfrac{1}{2}\\) je \\((-2,\\tfrac{3}{2},\\tfrac{3}{2})\\) in \\((2,\\tfrac{3}{2},\\tfrac{3}{2})\\); zadnja koordinata se je spremenila že v prvi vrstici.',
                'We change only the middle weight to \\(2\\): the points are still \\((-4,-3),(0,3),(4,-3)\\), but the homogeneous points are \\((-4,-3,1),(0,6,2),(4,-3,1)\\). At \\(t=\\tfrac{1}{2}\\) the first row is \\((-2,\\tfrac{3}{2},\\tfrac{3}{2})\\) and \\((2,\\tfrac{3}{2},\\tfrac{3}{2})\\); the last coordinate already changed in the first row.',
            ),
            formulaIds: ['rational-homogeneous-row'],
            frames: [frame('rational-decasteljau-homogeneous-explanation', 'explanation', ['rational-homogeneous-row']), frame('rational-decasteljau-homogeneous-observation', 'observation')],
            animation: {animationId: 'decasteljau'},
            scene: rationalDecasteljauScene(
                'rational-decasteljau-quadratic-weighted', quadraticFixture([1, 2, 1]), RATIONAL_DECASTELJAU_ACTIONS,
                'Konstrukcija kvadratne krivulje z utežmi \\((1,2,1)\\) je prikazana pri \\(t=\\tfrac{1}{2}\\); vse homogene koordinate se interpolirajo skupaj.',
                'The construction of the quadratic curve with weights \\((1,2,1)\\) is shown at \\(t=\\tfrac{1}{2}\\); all homogeneous coordinates are interpolated together.',
            ),
            observationPrompt: text('Predvajaj konstrukcijo in poišči vrstico, v kateri se začne spreminjati tudi zadnja, utežna koordinata.', 'Play the construction and identify the row in which the final, weight coordinate also changes.'),
            expectedObservations: [text('Zadnja koordinata se spremeni že v prvi vrstici (\\(\\tfrac{3}{2}\\)); konstrukcija se konča z eno homogeno točko.', 'The last coordinate changes already in the first row (\\(\\tfrac{3}{2}\\)); the construction ends in one homogeneous point.')],
        },
        {
            id: 'rational-decasteljau-projection', order: 3,
            title: text('Projekcija v ravnino', 'Projection to the plane'),
            purpose: text('Povezava zadnje homogene točke z dejansko točko na krivulji.', 'Connecting the final homogeneous point with the actual curve point.'),
            explanation: text(
                'Končna točka konstrukcije je \\((0,\\tfrac{3}{2},\\tfrac{3}{2})\\) in še ni zapisana v navadnih koordinatah. Prvi dve koordinati delimo z zadnjo in dobimo točko racionalne krivulje \\((0,1)\\); pri enakih utežeh je bila ta točka \\((0,0)\\).',
                'The final construction point is \\((0,\\tfrac{3}{2},\\tfrac{3}{2})\\) and is not yet in ordinary coordinates. Divide its first two coordinates by the last to obtain the rational curve point \\((0,1)\\); with equal weights this point was \\((0,0)\\).',
            ),
            formulaIds: ['rational-projection'],
            frames: [frame('rational-decasteljau-projection-explanation', 'explanation'), frame('rational-decasteljau-projection-calculation', 'calculation'), frame('rational-decasteljau-projection-observation', 'observation')],
            workedExampleId: 'rational-decasteljau-quadratic',
            scene: rationalDecasteljauScene(
                'rational-decasteljau-quadratic-projection', quadraticFixture([1, 2, 1]), RATIONAL_DECASTELJAU_ACTIONS,
                'Končna konstrukcijska točka pri \\(t=\\tfrac{1}{2}\\) je projekcija točke \\((0,1)\\).',
                'The final construction point at \\(t=\\tfrac{1}{2}\\) is the projection of the point \\((0,1)\\).',
            ),
            observationPrompt: text('Primerjaj izračunano točko \\((0,1)\\) s končno točko konstrukcije in s točko \\((0,0)\\) pri enakih utežeh.', 'Compare the calculated point \\((0,1)\\) with the final construction point and with the point \\((0,0)\\) for equal weights.'),
            expectedObservations: [text('Po projekciji končna točka konstrukcije sovpada s točko racionalne krivulje; ta je višje kot pri enakih utežeh.', 'After projection, the final construction point coincides with the point on the rational curve; it is higher than for equal weights.')],
        },
        {
            id: 'rational-decasteljau-cubic-equal', order: 4,
            title: text('Kubična krivulja z enakimi utežmi', 'The cubic curve with equal weights'),
            purpose: text('Prenos zamisli na kubično krivuljo in njen navadni primerjalnik.', 'Carrying the idea over to the cubic curve and its ordinary counterpart.'),
            explanation: text(
                'Kubična krivulja s točkami \\((-4,-3),(-3,3),(3,3),(4,-3)\\) in utežmi \\((1,1,1,1)\\) ima pri \\(t=\\tfrac{1}{2}\\) vrstice \\((-\\tfrac{7}{2},0),(0,3),(\\tfrac{7}{2},0)\\), nato \\((-\\tfrac{7}{4},\\tfrac{3}{2}),(\\tfrac{7}{4},\\tfrac{3}{2})\\) in končno točko \\((0,\\tfrac{3}{2})\\), zadnja koordinata pa je povsod \\(1\\). To je navadna Bézierjeva krivulja.',
                'The cubic curve with points \\((-4,-3),(-3,3),(3,3),(4,-3)\\) and weights \\((1,1,1,1)\\) has at \\(t=\\tfrac{1}{2}\\) the rows \\((-\\tfrac{7}{2},0),(0,3),(\\tfrac{7}{2},0)\\), then \\((-\\tfrac{7}{4},\\tfrac{3}{2}),(\\tfrac{7}{4},\\tfrac{3}{2})\\) and the final point \\((0,\\tfrac{3}{2})\\), while the last coordinate is \\(1\\) everywhere. This is the ordinary Bézier curve.',
            ),
            formulaIds: ['rational-weighted-form'],
            frames: [frame('rational-decasteljau-cubic-equal-explanation', 'explanation'), frame('rational-decasteljau-cubic-equal-observation', 'observation')],
            observationPrompt: text('Preveri, da je zadnja koordinata v vseh vrsticah \\(1\\), in preberi končno točko \\((0,\\tfrac{3}{2})\\).', 'Check that the last coordinate is \\(1\\) in every row, and read the final point \\((0,\\tfrac{3}{2})\\).'),
            expectedObservations: [text('Pri enakih utežeh ni deljenja z drugo vrednostjo kot \\(1\\); konstrukcija je navadna.', 'With equal weights there is no division by anything other than \\(1\\); the construction is ordinary.')],
            scene: rationalDecasteljauScene(
                'rational-decasteljau-cubic-equal', cubicFixture([1, 1, 1, 1]), RATIONAL_DECASTELJAU_ACTIONS,
                'Kubična krivulja z utežmi \\((1,1,1,1)\\) in konstrukcija pri \\(t=\\tfrac{1}{2}\\) sta vidni.',
                'The cubic curve with weights \\((1,1,1,1)\\) and its construction at \\(t=\\tfrac{1}{2}\\) are visible.',
            ),
        },
        {
            id: 'rational-decasteljau-weight-effect', order: 5,
            title: text('Vpliv spremembe uteži', 'Effect of changing a weight'),
            purpose: text('Opazovanje spremembe oblike brez spremembe kontrolnega poligona.', 'Observing a shape change without changing the control polygon.'),
            explanation: text(
                'Druga utež se spremeni z \\(1\\) na \\(2\\), točke ostanejo. Homogene točke so \\((-4,-3,1),(-6,6,2),(3,3,1),(4,-3,1)\\), prvi dve vrstici pri \\(t=\\tfrac{1}{2}\\) imata zadnjo koordinato \\(\\tfrac{3}{2}\\), \\(\\tfrac{3}{2}\\), \\(1\\) in nato \\(\\tfrac{3}{2}\\), \\(\\tfrac{5}{4}\\), končna točka pa je \\((-\\tfrac{9}{8},\\tfrac{21}{8},\\tfrac{11}{8})\\). Po projekciji je rezultat \\(\\left(-\\tfrac{9}{11},\\,\\tfrac{21}{11}\\right)\\), tj. pomaknjen od \\((0,\\tfrac{3}{2})\\) proti točki z večjo utežjo.',
                'The second weight changes from \\(1\\) to \\(2\\); the points stay. The homogeneous points are \\((-4,-3,1),(-6,6,2),(3,3,1),(4,-3,1)\\); the first two rows at \\(t=\\tfrac{1}{2}\\) have last coordinates \\(\\tfrac{3}{2}\\), \\(\\tfrac{3}{2}\\), \\(1\\) and then \\(\\tfrac{3}{2}\\), \\(\\tfrac{5}{4}\\), and the final point is \\((-\\tfrac{9}{8},\\tfrac{21}{8},\\tfrac{11}{8})\\). After projection the result is \\(\\left(-\\tfrac{9}{11},\\,\\tfrac{21}{11}\\right)\\), moved from \\((0,\\tfrac{3}{2})\\) toward the point with the larger weight.',
            ),
            formulaIds: ['rational-weighted-form', 'rational-projection'],
            frames: [frame('rational-decasteljau-weight-effect-explanation', 'explanation'), frame('rational-decasteljau-weight-effect-calculation', 'calculation'), frame('rational-decasteljau-weight-effect-observation', 'observation')],
            workedExampleId: 'rational-decasteljau-midpoint',
            observationPrompt: text('Primerjaj izračunano točko \\(\\left(-\\tfrac{9}{11},\\,\\tfrac{21}{11}\\right)\\) s končno točko konstrukcije in s točko \\((0,\\tfrac{3}{2})\\) pri enakih utežeh.', 'Compare the calculated point \\(\\left(-\\tfrac{9}{11},\\,\\tfrac{21}{11}\\right)\\) with the final construction point and with the point \\((0,\\tfrac{3}{2})\\) for equal weights.'),
            expectedObservations: [text('Kontrolni poligon je isti, konstrukcijska točka pa je zaradi večje druge uteži bližje \\(P_1\\); po projekciji sovpada s točko krivulje.', 'The control polygon is the same, but because of the larger second weight the construction point is closer to \\(P_1\\); after projection it coincides with the curve point.')],
            scene: rationalDecasteljauScene(
                'rational-decasteljau-weight-exploration', cubicFixture([1, 2, 1, 1]), RATIONAL_DECASTELJAU_ACTIONS,
                'Kubična krivulja z utežmi \\((1,2,1,1)\\) in konstrukcija pri \\(t=\\tfrac{1}{2}\\) sta vidni.',
                'The cubic curve with weights \\((1,2,1,1)\\) and its construction at \\(t=\\tfrac{1}{2}\\) are visible.',
            ),
        },
        {
            id: 'rational-decasteljau-analysis', order: 6,
            title: text('Samostojna analiza', 'Independent analysis'),
            purpose: text('Povezava uteži, konstrukcije in projekcije v poljubni nastavitvi.', 'Connecting weights, construction, and projection in an arbitrary configuration.'),
            explanation: text(
                'Racionalna De Casteljaujeva konstrukcija je rekurzivni način izračuna iste racionalne krivulje, kot jo določa utežena Bernsteinova oblika.',
                'The rational De Casteljau construction recursively evaluates the same rational curve defined by the weighted Bernstein form.',
            ),
            formulaIds: ['rational-weighted-form', 'rational-projection'],
            frames: [frame('rational-decasteljau-analysis-explanation', 'explanation'), frame('rational-decasteljau-analysis-observation', 'observation')],
            observationPrompt: text('Izberi parameter in utež ter preveri, ali se konstrukcija in projekcija še ujemata.', 'Choose a parameter and a weight, then check whether the construction and projection still agree.'),
            expectedObservations: [text('Pri regularni nastavitvi se zadnja projekcija ujema z vrednostjo racionalne krivulje.', 'For a regular configuration, the final projection agrees with the rational curve value.')],
            scene: rationalDecasteljauScene(
                'rational-decasteljau-analysis', cubicFixture([1, 2, 1, 1]), RATIONAL_DECASTELJAU_ACTIONS,
                'Kubična krivulja z utežmi \\((1,2,1,1)\\) in konstrukcija ostaneta vidni za samostojno spreminjanje.',
                'The cubic curve with weights \\((1,2,1,1)\\) and its construction stay visible for free changes.',
            ),
        },
    ],
    sources: [
        {
            id: 'farin-rational-bezier',
            citation: 'Farin, G. Curves and Surfaces for CAGD: A Practical Guide, 5th ed., Morgan Kaufmann, 2002.',
            implementationCorrespondence: 'The repository evaluates rational curves by lifting weighted points to three coordinates, applying polynomial De Casteljau recursion, and projecting the result in src/bezeg/impl/curve/rational-bezier-curve.ts.',
        },
        {
            id: 'bezeg-rational-decasteljau-implementation',
            citation: 'Bezeg source: src/bezeg/impl/curve/rational-bezier-curve.ts, src/graphs/curves/object/JXGRationalBezierCurve.ts, and src/graphs/curves/rational/RationalDecasteljauGraph.tsx.',
        },
    ],
    edgeCases: [
        text('Pri ničelnem končnem imenovalcu projekcija ni določena; graf lahko prikaže neveljavne koordinate.', 'When the final denominator is zero, the projection is undefined; the graph may show invalid coordinates.'),
        text('Negativne ali ničelne uteži zahtevajo posebno razlago in niso del običajne začetne raziskave.', 'Negative or zero weights require special discussion and are outside the ordinary introductory exploration.'),
    ],
    unresolvedQuestions: [
        text('Pred classroom-ready pregledom je treba potrditi, ali naj učenci uteži spreminjajo neposredno ali naj najprej samo berejo konstrukcijo.', 'Before classroom-ready review, confirm whether students should edit weights immediately or first only read the construction.'),
    ],
};

const elevation: GuidedLesson = {
    demonstrationId: 'elevation',
    title: text('Višanje stopnje brez spremembe krivulje', 'Degree elevation without changing the curve'),
    summary: text(
        'Višanje stopnje doda kontrolno točko, vendar predstavlja isto Bézierjevo krivuljo.',
        'Degree elevation adds a control point while representing the same Bézier curve.',
    ),
    prerequisites: [
        text('Potrebno je osnovno poznavanje Bézierjevih kontrolnih točk in parametra \\(t\\).', 'Assumes familiarity with Bézier control points and the parameter \\(t\\).'),
        text('Potrebno je razlikovati stopnjo krivulje od števila kontrolnih točk.', 'Assumes the distinction between curve degree and the number of control points.'),
    ],
    learningGoals: [
        text('Povežeš stopnjo krivulje s številom kontrolnih točk.', 'Connect the degree of a curve with its number of control points.'),
        text('Izračunaš nove kontrolne točke pri višanju stopnje.', 'Calculate the new control points after degree elevation.'),
        text('Preveriš, da se vrednosti, krajišči in oblika krivulje ohranijo.', 'Check that curve values, endpoints, and shape are preserved.'),
    ],
    formulaBlocks: [
        {
            id: 'elevation-control-points',
            latex: 'Q_0=P_0,\\quad Q_{n+1}=P_n,\\quad Q_i=\\frac{i}{n+1}P_{i-1}+\\left(1-\\frac{i}{n+1}\\right)P_i',
            notation: text(
                'Nova notranja kontrolna točka je linearna kombinacija dveh sosednjih starih točk.',
                'Each new interior control point is a linear combination of two neighboring old points.',
            ),
            explanation: text(
                'Ko je stara stopnja \\(n\\), ima nova krivulja stopnjo \\(n+1\\) in \\(n+2\\) kontrolnih točk. Krajišči ostaneta enaki.',
                'When the old degree is \\(n\\), the new curve has degree \\(n+1\\) and \\(n+2\\) control points. The endpoints stay the same.',
            ),
        },
        {
            id: 'elevation-shape-invariance',
            latex: '\\widetilde{B}(t)=B(t),\\qquad 0\\le t\\le1',
            notation: text(
                'Višanje stopnje spremeni predstavitev, ne pa točk, ki jih krivulja izriše.',
                'Degree elevation changes the representation, not the points traced by the curve.',
            ),
            explanation: text(
                'Nova Bernsteinova oblika ima iste vrednosti za vsak parameter v običajnem intervalu.',
                'The new Bernstein form has the same value for every parameter in the ordinary interval.',
            ),
        },
    ],
    workedExamples: [
        {
            id: 'elevation-cubic-example',
            title: text('Višanje privzete kubične krivulje', 'Elevating the default cubic curve'),
            calculationLatex: 'P_0=(-4,-2),P_1=(-3,3),P_2=(2,3),P_3=(3,-2)',
            resultLatex: 'Q=(-4,-2),\\left(-\\frac{13}{4},\\frac74\\right),\\left(-\\frac12,3\\right),\\left(\\frac94,\\frac74\\right),(3,-2)',
            check: text(
                'Pri \\(t=\\tfrac{1}{2}\\) ostane vrednost \\(B(\\tfrac{1}{2})=\\left(-\\tfrac{1}{2},\\,\\tfrac{7}{4}\\right)\\); preveri jo pred in po višanju stopnje.',
                'At \\(t=\\tfrac{1}{2}\\) the value remains \\(B(\\tfrac{1}{2})=\\left(-\\tfrac{1}{2},\\,\\tfrac{7}{4}\\right)\\); check it before and after elevation.',
            ),
        },
    ],
    steps: [
        {
            id: 'elevation-degree', order: 1,
            title: text('Stopnja in kontrolne točke', 'Degree and control points'),
            purpose: text('Razlikovanje med geometrijo krivulje in njeno predstavitvijo.', 'Distinguishing the curve geometry from its representation.'),
            explanation: text(
                'Kubična Bézierjeva krivulja ima štiri kontrolne točke. Višanje stopnje bo dodalo peto točko, vendar naj bi narisana krivulja ostala ista. Polni poligon \\(P_0,\\dots,P_3\\) pripada krivulji, črtkani poligon s petimi točkami \\(Q_0,\\dots,Q_4\\) pa je poligon višane predstavitve iste krivulje.',
                'A cubic Bézier curve has four control points. Degree elevation will add a fifth point, while the drawn curve should stay the same. The solid polygon \\(P_0,\\dots,P_3\\) belongs to the curve; the dashed five-point polygon \\(Q_0,\\dots,Q_4\\) is the polygon of the elevated representation of the same curve.',
            ),
            formulaIds: ['elevation-shape-invariance'],
            frames: [frame('elevation-degree-explanation', 'explanation'), frame('elevation-degree-observation', 'observation')],
            observationPrompt: text('Preštej točke polnega in črtkanega poligona ter ugotovi, kateri od njiju določa krivuljo, ki jo trenutno vlečeš.', 'Count the points of the solid and the dashed polygon and decide which of them defines the curve you are currently dragging.'),
            expectedObservations: [text('Polni poligon ima štiri točke (stopnja 3), črtkani pet; krivulja je ena sama.', 'The solid polygon has four points (degree 3), the dashed one five; there is a single curve.')],
            scene: {
                id: 'elevation-default', basedOn: 'demonstration-default',
                actions: [{kind: 'curve-visibility', target: 'control-polygon', visible: true}],
                expectedState: text('Privzeta kubična krivulja z njenim polnim poligonom in črtkanim poligonom višane predstavitve sta vidna.', 'The default cubic curve with its solid polygon and the dashed polygon of the elevated representation are visible.'),
            },
        },
        {
            id: 'elevation-formula', order: 2,
            title: text('Nove kontrolne točke', 'New control points'),
            purpose: text('Uporaba formule za konstrukcijo višje stopnje.', 'Using the formula to construct the higher degree.'),
            explanation: text(
                'Notranje točke \\(Q_i\\) so izračunane iz sosednjih \\(P_i\\). Krajišči \\(Q_0\\) in \\(Q_4\\) se ujemata s starima krajiščema.',
                'The interior points \\(Q_i\\) are calculated from neighboring \\(P_i\\). The endpoints \\(Q_0\\) and \\(Q_4\\) equal the old endpoints.',
            ),
            formulaIds: ['elevation-control-points'],
            frames: [frame('elevation-formula-explanation', 'explanation'), frame('elevation-formula-observation', 'observation')],
            observationPrompt: text('Primerjaj polni poligon \\(P\\) s črtkanim \\(Q\\): kje se ujemata in kje se razlikujeta?', 'Compare the solid polygon \\(P\\) with the dashed polygon \\(Q\\): where do they agree and where do they differ?'),
            expectedObservations: [text('Črtkani poligon ima eno točko več, krajišči \\(Q_0=P_0\\) in \\(Q_4=P_3\\) pa sta skupni.', 'The dashed polygon has one more point, while the endpoints \\(Q_0=P_0\\) and \\(Q_4=P_3\\) are shared.')],
            scene: {
                id: 'elevation-both-polygons', basedOn: 'demonstration-default',
                actions: [{kind: 'curve-visibility', target: 'control-polygon', visible: true}],
                expectedState: text('Polni poligon (štiri točke) in črtkani poligon višane predstavitve (pet točk) sta prikazana skupaj; krivulja je še stopnje 3.', 'The solid polygon (four points) and the dashed polygon of the elevated representation (five points) are shown together; the curve is still of degree 3.'),
            },
        },
        {
            id: 'elevation-calculation', order: 3,
            title: text('Preverjanje vrednosti', 'Checking a curve value'),
            purpose: text('Primerjava numerične vrednosti pred in po višanju stopnje.', 'Comparing a numerical value before and after elevation.'),
            explanation: text(
                'Formula za višanje stopnje je izbrana tako, da se Bernsteinove uteži prerazporedijo brez spremembe končne točke krivulje.',
                'The elevation formula redistributes the Bernstein weights without changing the final curve point.',
            ),
            formulaIds: ['elevation-control-points', 'elevation-shape-invariance'],
            frames: [frame('elevation-calculation-explanation', 'explanation'), frame('elevation-calculation-calculation', 'calculation'), frame('elevation-calculation-observation', 'observation')],
            workedExampleId: 'elevation-cubic-example',
            observationPrompt: text('Preveri vrednost pri \\(t=\\tfrac{1}{2}\\) na obeh predstavitvah.', 'Check the value at \\(t=\\tfrac{1}{2}\\) in both representations.'),
            expectedObservations: [text('Vrednost \\(\\left(-\\tfrac{1}{2},\\,\\tfrac{7}{4}\\right)\\) se ohrani, čeprav je kontrolni poligon drugačen.', 'The value \\(\\left(-\\tfrac{1}{2},\\,\\tfrac{7}{4}\\right)\\) is preserved even though the control polygon is different.')],
            scene: {
                id: 'elevation-calculation-scene', basedOn: 'demonstration-default',
                actions: [{kind: 'curve-visibility', target: 'control-polygon', visible: true}, {kind: 'curve-evaluation', parameter: 0.5}],
                expectedState: text('Oba poligona in točka \\(B(\\tfrac{1}{2})\\) sta prikazana; točka leži na krivulji, ne glede na to, kateri poligon jo določa.', 'Both polygons and the point \\(B(\\tfrac{1}{2})\\) are shown; the point lies on the curve whichever polygon defines it.'),
            },
        },
        {
            id: 'elevation-analysis', order: 4,
            title: text('Samostojna primerjava', 'Independent comparison'),
            purpose: text('Preverjanje ohranjene geometrije z več parametri.', 'Checking preserved geometry at several parameters.'),
            explanation: text(
                'Višanje stopnje je uporabno, ko želimo enotno stopnjo ali dodatne kontrolne točke, ne da bi spremenili geometrijo krivulje. Po pritisku na gumb je polni poligon prejšnji črtkani \\(Q\\); novi črtkani poligon prikazuje naslednje višanje in ni prvotni \\(P\\).',
                'Degree elevation is useful when a common degree or extra control points are needed without changing the curve geometry. After pressing the button the solid polygon is the former dashed \\(Q\\); the new dashed polygon previews the next elevation and is not the original \\(P\\).',
            ),
            formulaIds: ['elevation-shape-invariance'],
            frames: [frame('elevation-analysis-explanation', 'explanation'), frame('elevation-analysis-observation', 'observation')],
            observationPrompt: text('Izberi več vrednosti \\(t\\) in preveri, ali se oblika in krajišči ujemajo.', 'Choose several \\(t\\) values and check whether the shape and endpoints agree.'),
            expectedObservations: [text('Pri običajnem intervalu se ujemajo vse preverjene točke, ne samo sredina.', 'All checked points agree on the ordinary interval, not only the midpoint.')],
            scene: {
                id: 'elevation-analysis-scene', basedOn: 'demonstration-default',
                actions: [{kind: 'curve-visibility', target: 'control-polygon', visible: true}, {kind: 'degree-elevation'}, {kind: 'curve-evaluation', parameter: 0.75}],
                expectedState: text('Krivulja je zdaj stopnje 4: polni poligon je prejšnji črtkani \\(Q\\), črtkani poligon kaže naslednje višanje na stopnjo 5.', 'The curve now has degree 4: the solid polygon is the former dashed \\(Q\\), the dashed polygon previews the next elevation to degree 5.'),
            },
        },
    ],
    sources: [
        {
            id: 'farin-degree-elevation',
            citation: 'Farin, G. Curves and Surfaces for CAGD: A Practical Guide, 5th ed., Morgan Kaufmann, 2002.',
            implementationCorrespondence: 'The degree-elevation recurrence is implemented by the curve model and exposed by JXGBezierCurve.elevate().',
        },
        {
            id: 'bezeg-elevation-implementation',
            citation: 'Bezeg source: src/graphs/curves/bezier/ElevationGraph.tsx and src/graphs/curves/object/JXGBezierCurve.ts.',
        },
    ],
    edgeCases: [
        text('Višanje stopnje ne pomeni, da so nove notranje kontrolne točke na prvotni krivulji.', 'Degree elevation does not mean that the new interior control points lie on the original curve.'),
        text('Preverjanje velja za isto geometrijsko krivuljo; dodatne točke spremenijo predstavitev in kontrolni poligon.', 'The check concerns the same geometric curve; the extra points change the representation and control polygon.'),
        text('Po višanju graf prikaže le polni poligon nove predstavitve; prvotni poligon \\(P\\) ni več narisan, zato ju je mogoče primerjati le pred višanjem, ko je črtkani poligon pregled.', 'After elevation the graph draws only the new representation\'s solid polygon; the original \\(P\\) is no longer drawn, so the two can be compared together only before elevating, when the dashed polygon is a preview.'),
    ],
    unresolvedQuestions: [
        text('Pred classroom-ready pregledom je treba potrditi, ali naj učenci nove kontrolne točke izračunajo ročno ali jih najprej samo opazujejo.', 'Before classroom-ready review, confirm whether students should calculate the new control points by hand or first only observe them.'),
    ],
};

export const additionalGuidedLessons: readonly GuidedLesson[] = [rationalDecasteljau, elevation];
