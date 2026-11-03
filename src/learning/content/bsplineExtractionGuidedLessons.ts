/**
 * Guided lesson of the Bezier extraction Demonstration (docs/specs/b-splines-nurbs-lessons.md, L4). The text is a one-shot draft
 * (docs/specs/new-lesson-families.md, "One-shot lesson text"): every value it quotes is a readout of the scene it belongs to, and
 * `bsplineExtractionGuidedLessons.test.tsx` checks that against the real graph and the kernel in `src/bezeg/impl/curve/bspline`.
 * Scenes are `lesson-fixture` scenes whose fixture carries the degree, the knot vector and the control points, optionally followed by
 * a `bezier-extraction` `move-point` action. Opening a piece in the Bezier Demonstration is a router handoff (ADR 0038): no scene
 * action navigates, step 3 only points at the inspector button.
 */
import type {LessonAction, LessonCurveFixture, LessonViewBox} from '../model';
import type {GuidedLesson, GuidedLessonFrame, GuidedLessonFrameKind, LessonScene, LocalizedText} from './guidedLessons';

const text = (sl: string, en: string): LocalizedText => ({sl, en});
const frame = (id: string, kind: GuidedLessonFrameKind): GuidedLessonFrame => ({id, kind});

/** The L2 quadratic and the L3 cubic, as in the spec. */
export const EXTRACTION_QUADRATIC_FIXTURE: LessonCurveFixture = {degree: 2, knots: [0, 0, 0, 1, 2, 2, 2], points: [[0, 0], [1, 2], [3, 2], [4, 0]]};
export const EXTRACTION_CUBIC_FIXTURE: LessonCurveFixture = {
    degree: 3, knots: [0, 0, 0, 0, 1, 2, 2, 3, 3, 3, 3], points: [[0, 0], [1, 2], [2, 3], [3, 1], [4, 1], [5, 3], [6, 0]],
};
/** The control point step 4 moves: index 2 of the cubic, from (2, 3) to this position. Its support is (0, 2): pieces 1 and 2 change, piece 3 does not. */
export const EXTRACTION_MOVED_INDEX = 2;
export const EXTRACTION_MOVED_TO: readonly [number, number] = [2, 4];

const VIEW: LessonViewBox = [-1.5, 4.5, 6.5, -1.5];

const extractionScene = (id: string, curve: LessonCurveFixture, actions: readonly LessonAction[], sl: string, en: string): LessonScene =>
    ({id, basedOn: 'lesson-fixture', curve, view: VIEW, actions, expectedState: text(sl, en)});

const extractionLesson: GuidedLesson = {
    demonstrationId: 'bspline-extraction',
    title: text('Izvlek Bézierjevih odsekov', 'Bézier extraction'),
    summary: text(
        'Z vstavljanjem vozlov do večkratnosti \\(k\\) se B-zlepek stopnje \\(k\\) razdeli na navadne Bézierjeve odseke. Število odsekov je število različnih notranjih vozlov in ena, premik kontrolne točke pa spremeni le odseke v njenem nosilcu.',
        'Inserting knots up to multiplicity \\(k\\) splits a B-spline of degree \\(k\\) into ordinary Bézier pieces. The number of pieces is the number of distinct interior knots plus one, and moving a control point changes only the pieces in its support.',
    ),
    prerequisites: [
        text('Potrebno je vstavljanje vozla (prejšnja lekcija) in Bézierjeva krivulja iz poglavja o Bézierjevih krivuljah.', 'Assumes knot insertion (the previous lesson) and the Bézier curve from the Bézier chapter.'),
    ],
    learningGoals: [
        text('Preštej Bézierjeve odseke iz vozelnega vektorja in preveri, da je število enako številu različnih notranjih vozlov in ena.', 'Count the Bézier pieces from the knot vector and check that the number is the number of distinct interior knots plus one.'),
        text('Izračunaš novo stično točko dveh odsekov kot utežno sredino kontrolnih točk.', 'Work out the new junction point of two pieces as a weighted mean of control points.'),
        text('Veš, da premik kontrolne točke spremeni le odseke, ki ležijo v njenem nosilcu, in da lahko vsak odsek odpreš kot navadno Bézierjevo krivuljo.', 'Know that moving a control point changes only the pieces in its support, and that each piece can be opened as an ordinary Bézier curve.'),
    ],
    formulaBlocks: [
        {
            id: 'bspline-extraction-junction',
            latex: 'b_2=b_0\'=(1-\\alpha)\\,P_1+\\alpha\\,P_2,\\quad \\alpha=\\frac{1-0}{2-0}=\\tfrac12',
            notation: text(
                'Vozel \\(u=1\\) vstavimo, dokler nima večkratnosti \\(k=2\\); točka \\(b_2\\) je zadnja točka prvega odseka, \\(b_0\'\\) prva točka drugega.',
                'The knot \\(u=1\\) is inserted until its multiplicity is \\(k=2\\); \\(b_2\\) is the last point of the first piece and \\(b_0\'\\) the first point of the second.',
            ),
            explanation: text(
                'Stična točka je točka na daljici \\(P_1P_2\\), ki jo določa razmerje vozlov \\(\\tfrac{1-0}{2-0}\\). Pri točkah \\((1;2)\\) in \\((3;2)\\) je to \\((2;2)\\), skupno krajišče obeh odsekov.',
                'The junction is the point on the segment \\(P_1P_2\\) given by the knot ratio \\(\\tfrac{1-0}{2-0}\\). For the points \\((1;2)\\) and \\((3;2)\\) it is \\((2;2)\\), the common end point of both pieces.',
            ),
        },
        {
            id: 'bspline-extraction-count',
            latex: 'm=r+1',
            notation: text('Število odsekov je \\(m\\), število različnih notranjih vozlov pa \\(r\\). Štejemo le notranje vozle, torej tiste med prvim in zadnjim krajnim vozlom; večkratnost vozla ne šteje.', 'The number of pieces is \\(m\\) and the number of distinct interior knots is \\(r\\). Only interior knots count, that is, those strictly between the end knots; the multiplicity of a knot does not matter.'),
            explanation: text(
                'Vsak različen notranji vozel loči dva sosednja odseka, zato je odsekov za ena več kot teh vozlov.',
                'Each distinct interior knot separates two neighbouring pieces, so there is one more piece than such knots.',
            ),
        },
    ],
    workedExamples: [
        {
            id: 'bspline-extraction-junction-example',
            title: text('Stična točka kvadratnega primera', 'The junction of the quadratic example'),
            calculationLatex: 'b_2=\\tfrac12(1,2)+\\tfrac12(3,2)',
            resultLatex: 'b_2=b_0\'=(2,2)',
            check: text(
                'Odseka sta \\((0;0)\\), \\((1;2)\\), \\((2;2)\\) na \\([0,1]\\) in \\((2;2)\\), \\((3;2)\\), \\((4;0)\\) na \\([1,2]\\). Prvi odsek se konča v točki \\((2;2)\\), drugi se začne v njej.',
                'The pieces are \\((0;0)\\), \\((1;2)\\), \\((2;2)\\) on \\([0,1]\\) and \\((2;2)\\), \\((3;2)\\), \\((4;0)\\) on \\([1,2]\\). The first piece ends at \\((2;2)\\) and the second starts there.',
            ),
        },
    ],
    steps: [
        {
            id: 'bspline-extraction-predict', order: 1,
            title: text('Koliko odsekov ima krivulja?', 'How many pieces does the curve have?'),
            purpose: text('Pred razkritjem napovedati število Bézierjevih odsekov iz vozelnega vektorja.', 'Predicting, before the reveal, the number of Bézier pieces from the knot vector.'),
            explanation: text(
                'Krivulja stopnje \\(2\\) ima vozle \\((0,0,0,1,2,2,2)\\) in štiri kontrolne točke. Napovej: iz koliko Bézierjevih odsekov je sestavljena? Odgovor je \\(2\\): en odsek na \\([0,1]\\) in drugi na \\([1,2]\\).',
                'The curve of degree \\(2\\) has the knots \\((0,0,0,1,2,2,2)\\) and four control points. Predict: how many Bézier pieces is it made of? The answer is \\(2\\): one piece on \\([0,1]\\) and another on \\([1,2]\\).',
            ),
            formulaIds: ['bspline-extraction-count'],
            frames: [frame('bspline-extraction-predict-explanation', 'explanation'), frame('bspline-extraction-predict-observation', 'observation')],
            observationPrompt: text('Preberi število odsekov v seznamu Bézierjevih odsekov.', 'Read the number of pieces in the list of Bézier pieces.'),
            expectedObservations: [text('Število odsekov je \\(2\\), odseka sta obarvana različno.', 'The number of pieces is \\(2\\) and the pieces have different colours.')],
            scene: extractionScene('bspline-extraction-predict-start', EXTRACTION_QUADRATIC_FIXTURE, [],
                'Stopnja \\(2\\), vozli \\((0,0,0,1,2,2,2)\\), točke \\((0,0)\\), \\((1,2)\\), \\((3,2)\\), \\((4,0)\\); število odsekov je \\(2\\).',
                'Degree \\(2\\), knots \\((0,0,0,1,2,2,2)\\), points \\((0,0)\\), \\((1,2)\\), \\((3,2)\\), \\((4,0)\\); the number of pieces is \\(2\\).'),
        },
        {
            id: 'bspline-extraction-pieces', order: 2,
            title: text('Izvleci odseka', 'Extract the pieces'),
            purpose: text('Pred razkritjem napovedati kontrolne točke obeh odsekov in njuno stično točko.', 'Predicting, before the reveal, the control points of both pieces and their junction.'),
            explanation: text(
                'Vozel \\(u=1\\) vstavimo, dokler nima večkratnosti \\(2\\). Napovej: kje je stična točka? Nova točka leži na daljici med \\((1;2)\\) in \\((3;2)\\) v razmerju \\(\\tfrac{1-0}{2-0}=\\tfrac12\\), torej v točki \\((2;2)\\). Prvi odsek ima točke \\((0;0)\\), \\((1;2)\\), \\((2;2)\\), drugi pa \\((2;2)\\), \\((3;2)\\), \\((4;0)\\).',
                'The knot \\(u=1\\) is inserted until its multiplicity is \\(2\\). Predict: where is the junction? The new point lies on the segment between \\((1;2)\\) and \\((3;2)\\) in the ratio \\(\\tfrac{1-0}{2-0}=\\tfrac12\\), that is, at \\((2;2)\\). The first piece has the points \\((0;0)\\), \\((1;2)\\), \\((2;2)\\), the second \\((2;2)\\), \\((3;2)\\), \\((4;0)\\).',
            ),
            formulaIds: ['bspline-extraction-junction'], workedExampleId: 'bspline-extraction-junction-example',
            frames: [frame('bspline-extraction-pieces-explanation', 'explanation'), frame('bspline-extraction-pieces-calculation', 'calculation'), frame('bspline-extraction-pieces-observation', 'observation')],
            observationPrompt: text('Poišči točko, v kateri se stikata barvi obeh odsekov.', 'Find the point where the colours of the two pieces meet.'),
            expectedObservations: [text('Odseka se stikata v točki \\((2;2)\\), ki je zadnja točka prvega in prva točka drugega odseka.', 'The pieces meet at \\((2;2)\\), which is the last point of the first piece and the first point of the second.')],
            scene: extractionScene('bspline-extraction-pieces-quadratic', EXTRACTION_QUADRATIC_FIXTURE, [],
                'Odseka \\((0,0)\\), \\((1,2)\\), \\((2,2)\\) na \\([0,1]\\) in \\((2,2)\\), \\((3,2)\\), \\((4,0)\\) na \\([1,2]\\), vsak v svoji barvi.',
                'The pieces \\((0,0)\\), \\((1,2)\\), \\((2,2)\\) on \\([0,1]\\) and \\((2,2)\\), \\((3,2)\\), \\((4,0)\\) on \\([1,2]\\), each in its own colour.'),
        },
        {
            id: 'bspline-extraction-open', order: 3,
            title: text('Odpri odsek kot Bézierjevo krivuljo', 'Open a piece as a Bézier curve'),
            purpose: text('Odsek odpreti v navadnem Bézierjevem prikazu in videti, da je to Bézierjeva krivulja svojih točk.', 'Opening a piece in the ordinary Bézier Demonstration and seeing that it is a Bézier curve of its points.'),
            explanation: text(
                'Pri odseku v seznamu pritisni gumb »Odpri kot Bézierjevo krivuljo«. Odpre se prikaz Bézierjeva krivulja s tremi točkami tega odseka, na primer \\((0;0)\\), \\((1;2)\\), \\((2;2)\\) za prvi odsek. Brskalnikov gumb Nazaj te vrne na izvleček, ki se začne znova pri primeru. Napovej: kako se Bézierjeva krivulja teh točk ujema z delom B-zlepka na \\([0,1]\\)? Ujema se povsem.',
                'Press the button “Open as Bézier curve” beside a piece in the list. The Bézier curve Demonstration opens with the three points of that piece, for example \\((0;0)\\), \\((1;2)\\), \\((2;2)\\) for the first piece. The browser Back button returns you to the extraction, which starts again from the example. Predict: how does the Bézier curve of those points compare with the part of the B-spline on \\([0,1]\\)? They coincide exactly.',
            ),
            formulaIds: ['bspline-extraction-junction'],
            frames: [frame('bspline-extraction-open-explanation', 'explanation'), frame('bspline-extraction-open-observation', 'observation')],
            observationPrompt: text('Poišči gumb »Odpri kot Bézierjevo krivuljo« pri odseku in preveri, da je omogočen.', 'Find the “Open as Bézier curve” button beside a piece and check that it is enabled.'),
            expectedObservations: [text('Pri vsakem od odsekov je gumb za odpiranje kot Bézierjeve krivulje; odsek \\(1\\) ima točke \\((0;0)\\), \\((1;2)\\), \\((2;2)\\).', 'Each piece has a button to open it as a Bézier curve; piece \\(1\\) has the points \\((0;0)\\), \\((1;2)\\), \\((2;2)\\).')],
            scene: extractionScene('bspline-extraction-open-quadratic', EXTRACTION_QUADRATIC_FIXTURE, [],
                'Isti kvadratni primer z dvema odsekoma; pri vsakem odseku je gumb za odpiranje kot Bézierjeve krivulje.',
                'The same quadratic example with two pieces; each piece has a button to open it as a Bézier curve.'),
        },
        {
            id: 'bspline-extraction-move', order: 4,
            title: text('Premakni točko, spremenijo se le nekateri odseki', 'Move a point and only some pieces change'),
            purpose: text('Pred razkritjem napovedati, kateri odseki kubične krivulje se spremenijo ob premiku ene kontrolne točke.', 'Predicting, before the reveal, which pieces of the cubic change when one control point is moved.'),
            explanation: text(
                'Kubična krivulja ima vozle \\((0,0,0,0,1,2,2,3,3,3,3)\\) in tri odseke na \\([0,1]\\), \\([1,2]\\) in \\([2,3]\\). Točko \\(P_2=(2;3)\\) premaknemo v \\((2;4)\\). Napovej: kateri odseki se spremenijo? Točka \\(P_2\\) vpliva le na del krivulje na \\((0,2)\\), zato se spremenita odseka \\(1\\) in \\(2\\), odsek \\(3\\) s točkami \\((3{,}5;1)\\), \\((4;1)\\), \\((5;3)\\), \\((6;0)\\) pa ostane isti.',
                'The cubic has the knots \\((0,0,0,0,1,2,2,3,3,3,3)\\) and three pieces on \\([0,1]\\), \\([1,2]\\) and \\([2,3]\\). The point \\(P_2=(2;3)\\) is moved to \\((2;4)\\). Predict: which pieces change? The point \\(P_2\\) influences only the part of the curve on \\((0,2)\\), so pieces \\(1\\) and \\(2\\) change, while piece \\(3\\) with the points \\((3.5;1)\\), \\((4;1)\\), \\((5;3)\\), \\((6;0)\\) stays the same.',
            ),
            formulaIds: ['bspline-extraction-count'],
            frames: [frame('bspline-extraction-move-explanation', 'explanation'), frame('bspline-extraction-move-observation', 'observation')],
            observationPrompt: text('Poišči odseke z oznako »spremenjen« in jih primerjaj s tretjim odsekom.', 'Find the pieces marked “changed” and compare them with the third piece.'),
            expectedObservations: [text('Spremenjena sta odseka \\(1\\) in \\(2\\); odsek \\(3\\) ima še vedno točke \\((3{,}5;1)\\), \\((4;1)\\), \\((5;3)\\), \\((6;0)\\).', 'Pieces \\(1\\) and \\(2\\) are marked changed; piece \\(3\\) still has the points \\((3.5;1)\\), \\((4;1)\\), \\((5;3)\\), \\((6;0)\\).')],
            scene: extractionScene('bspline-extraction-move-cubic', EXTRACTION_CUBIC_FIXTURE,
                [{kind: 'bezier-extraction', operation: 'move-point', index: EXTRACTION_MOVED_INDEX, to: EXTRACTION_MOVED_TO}],
                'Kubična krivulja, točka \\(P_2\\) je premaknjena iz \\((2;3)\\) v \\((2;4)\\); odseka \\(1\\) in \\(2\\) sta označena kot spremenjena, odsek \\(3\\) ni.',
                'The cubic with \\(P_2\\) moved from \\((2;3)\\) to \\((2;4)\\); pieces \\(1\\) and \\(2\\) are marked changed and piece \\(3\\) is not.'),
        },
        {
            id: 'bspline-extraction-count', order: 5,
            title: text('Število odsekov in notranji vozli', 'The piece count and the interior knots'),
            purpose: text('Pred razkritjem napovedati število odsekov kubične krivulje in ga primerjati s številom različnih notranjih vozlov.', 'Predicting, before the reveal, the number of pieces of the cubic and comparing it with the number of distinct interior knots.'),
            explanation: text(
                'Kubična krivulja ima notranja vozla \\(u=1\\) in \\(u=2\\) (dvojni vozel šteje enkrat). Napovej: koliko odsekov ima? Različni notranji vozli so \\(2\\), odsekov je \\(2+1=3\\). Kvadratni primer ima en različni notranji vozel \\(u=1\\) in \\(1+1=2\\) odseka.',
                'The cubic has the interior knots \\(u=1\\) and \\(u=2\\) (the double knot counts once). Predict: how many pieces does it have? There are \\(2\\) distinct interior knots and \\(2+1=3\\) pieces. The quadratic example has one distinct interior knot \\(u=1\\) and \\(1+1=2\\) pieces.',
            ),
            formulaIds: ['bspline-extraction-count'],
            frames: [frame('bspline-extraction-count-explanation', 'explanation'), frame('bspline-extraction-count-observation', 'observation')],
            observationPrompt: text('Primerjaj število odsekov s številom različnih notranjih vozlov v urejevalniku vozlov.', 'Compare the number of pieces with the number of distinct interior knots in the knot editor.'),
            expectedObservations: [text('Število odsekov je \\(3\\); notranja vozla sta \\(1\\) in \\(2\\), torej \\(2+1\\).', 'The number of pieces is \\(3\\); the interior knots are \\(1\\) and \\(2\\), so \\(2+1\\).')],
            scene: extractionScene('bspline-extraction-count-cubic', EXTRACTION_CUBIC_FIXTURE, [],
                'Kubična krivulja z vozli \\((0,0,0,0,1,2,2,3,3,3,3)\\) in tremi odseki: \\([0,1]\\), \\([1,2]\\), \\([2,3]\\).',
                'The cubic with the knots \\((0,0,0,0,1,2,2,3,3,3,3)\\) and three pieces: \\([0,1]\\), \\([1,2]\\), \\([2,3]\\).'),
        },
        {
            id: 'bspline-extraction-explore', order: 6,
            title: text('Prosto raziskovanje', 'Free exploration'),
            purpose: text('Samostojno vleči točke, spreminjaj vozle in opazuj odseke.', 'Dragging points, editing knots and watching the pieces on your own.'),
            explanation: text(
                'Spet je privzeta kvadratna krivulja. Vleci kontrolne točke in poglej, kateri odseki se spremenijo, spremeni vozel in preštej odseke ali enega od odsekov odpri kot Bézierjevo krivuljo. Gumb »Nazaj na primer« vrne začetne vozle in točke.',
                'The default quadratic curve is back. Drag control points and see which pieces change, edit a knot and count the pieces, or open one of the pieces as a Bézier curve. The “Back to the example” button returns to the original knots and points.',
            ),
            formulaIds: ['bspline-extraction-junction', 'bspline-extraction-count'],
            frames: [frame('bspline-extraction-explore-explanation', 'explanation'), frame('bspline-extraction-explore-observation', 'observation')],
            observationPrompt: text('Preveri, da število odsekov ostane enako število različnih notranjih vozlov in ena.', 'Check that the number of pieces stays equal to the number of distinct interior knots plus one.'),
            expectedObservations: [text('Premik točke ne spremeni števila odsekov; spremeni ga le sprememba vozlov.', 'Moving a point does not change the number of pieces; only editing the knots does.')],
            scene: extractionScene('bspline-extraction-explore-start', EXTRACTION_QUADRATIC_FIXTURE, [],
                'Privzeta kvadratna krivulja z vozli \\((0,0,0,1,2,2,2)\\); vse je prosto za raziskovanje.',
                'The default quadratic curve with the knots \\((0,0,0,1,2,2,2)\\); everything is free to explore.'),
        },
    ],
    sources: [
        {id: 'boehm-1980', citation: 'Boehm, W. Inserting new knots into B-spline curves. Computer-Aided Design 12 (1980), 199-201.'},
        {id: 'farin-bspline', citation: 'Farin, G. Curves and Surfaces for CAGD, 5th ed., the chapter on B-splines.'},
        {
            id: 'bezeg-bspline-extraction-implementation',
            citation: 'Bezeg source: src/bezeg/impl/curve/bspline/ and src/graphs/curves/bspline/BSplineExtractionGraph.tsx.',
            implementationCorrespondence: 'The pieces come from the kernel\'s bezierPieces; a lesson scene sets degree, knots and points with a curve fixture and moves a control point with the bezier-extraction action move-point, which marks the affected pieces as a drag does. Opening a piece in the Bézier Demonstration is a router handoff (ADR 0038) done by the inspector button, not by a scene action.',
        },
    ],
    edgeCases: [
        text('Če ima vozel že večkratnost \\(k+1\\), je krivulja tam prekinjena; izvlek to obravnava brez deljenja z nič in odsek je še vedno Bézierjev odsek.', 'If a knot already has multiplicity \\(k+1\\) the curve has a break there; the extraction handles it without division by zero and each piece is still a Bézier piece.'),
        text('Gumb za odpiranje kot Bézierjevo krivuljo odpre prikaz Bézierjeva krivulja; brskalnikov gumb Nazaj vrne na izvlek.', 'The button to open as a Bézier curve opens the Bézier curve Demonstration; the browser Back button returns to the extraction.'),
    ],
    unresolvedQuestions: [],
};

export const bsplineExtractionGuidedLessons: readonly GuidedLesson[] = [extractionLesson];
