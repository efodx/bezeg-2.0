/**
 * Guided lesson of the blossom (polar form) Demonstration (docs/specs/b-splines-nurbs-lessons.md, L6). The text is a one-shot draft
 * (docs/specs/new-lesson-families.md, "One-shot lesson text"): every value it quotes is a readout of the scene it belongs to, and
 * `bsplineBlossomGuidedLessons.test.tsx` checks that against the real graph and the kernel in `src/bezeg/impl/curve/bspline`.
 * Scenes are `lesson-fixture` scenes whose fixture carries the L2 quadratic (degree, knot vector, four points), so the segment
 * [0,1) and the starting arguments are the same on every visit, followed by `blossom` actions that call the graph's own setters.
 */
import type {LessonAction, LessonCurveFixture, LessonViewBox} from '../model';
import type {GuidedLesson, GuidedLessonFrame, GuidedLessonFrameKind, LessonScene, LocalizedText} from './guidedLessons';

const text = (sl: string, en: string): LocalizedText => ({sl, en});
const frame = (id: string, kind: GuidedLessonFrameKind): GuidedLessonFrame => ({id, kind});

/** The L2 quadratic: knots (0,0,0,1,2,2,2), points (0,0), (1,2), (3,2), (4,0). */
export const BLOSSOM_FIXTURE: LessonCurveFixture = {degree: 2, knots: [0, 0, 0, 1, 2, 2, 2], points: [[0, 0], [1, 2], [3, 2], [4, 0]]};
/** The arguments (a, b) the steps set. */
export const BLOSSOM_PREDICT_ARGS: readonly number[] = [0, 1];
export const BLOSSOM_PAIR_ARGS: readonly number[] = [0.25, 0.75];
export const BLOSSOM_DIAGONAL_ARGS: readonly number[] = [0.5, 0.5];
export const BLOSSOM_SWAPPED_ARGS: readonly number[] = [0.75, 0.25];

const VIEW: LessonViewBox = [-1.5, 3.5, 5.5, -1.5];

const blossomScene = (id: string, actions: readonly LessonAction[], sl: string, en: string): LessonScene =>
    ({id, basedOn: 'lesson-fixture', curve: BLOSSOM_FIXTURE, view: VIEW, actions, expectedState: text(sl, en)});
const setArgs = (args: readonly number[]): LessonAction => ({kind: 'blossom', operation: 'set-args', args});
const setBezier = (visible: boolean): LessonAction => ({kind: 'blossom', operation: 'set-bezier', visible});

const blossomLesson: GuidedLesson = {
    demonstrationId: 'bspline-blossom',
    title: text('Cvetenje (polarna oblika)', 'Blossoming (polar form)'),
    summary: text(
        'Cvetenje, imenovano tudi polarna oblika, dodeli kvadratnemu odseku B-zlepka simetrično funkcijo \\(f(a,b)\\) dveh argumentov. Pri vozlih \\((0,0,0,1,2,2,2)\\) in točkah \\((0,0)\\), \\((1,2)\\), \\((3,2)\\), \\((4,0)\\) so kontrolne točke vrednosti \\(f\\) v vozlih, točka krivulje pa je \\(f(t,t)\\).',
        'The blossom, also called the polar form, gives a quadratic piece of a B-spline a symmetric function \\(f(a,b)\\) of two arguments. For the knots \\((0,0,0,1,2,2,2)\\) and the points \\((0,0)\\), \\((1,2)\\), \\((3,2)\\), \\((4,0)\\) the control points are the values of \\(f\\) at the knots, and a curve point is \\(f(t,t)\\).',
    ),
    prerequisites: [
        text('Potrebni sta lekciji o krivulji B-zlepka z de Boorovim postopkom in o Bézierjevem izvlečku.', 'Assumes the lessons on the B-spline curve with de Boor\'s algorithm and on Bézier extraction.'),
    ],
    learningGoals: [
        text('Veš, da ena simetrična funkcija \\(f\\) vsebuje kontrolne točke, točke de Boorovega trikotnika in točke krivulje.', 'Know that one symmetric function \\(f\\) holds the control points, the points of de Boor\'s triangle and the curve points.'),
        text('Znaš izračunati \\(f(a,b)\\) z dvema zaporednima interpolacijama in prebrati \\(f(t,t)\\) kot točko krivulje.', 'Can compute \\(f(a,b)\\) by two successive interpolations and read \\(f(t,t)\\) as a curve point.'),
        text('Iz \\(f\\) znaš prebrati Bézierove točke odseka: \\(f(u_j,u_j)\\), \\(f(u_j,u_{j+1})\\), \\(f(u_{j+1},u_{j+1})\\).', 'Can read the Bézier points of a segment off \\(f\\): \\(f(u_j,u_j)\\), \\(f(u_j,u_{j+1})\\), \\(f(u_{j+1},u_{j+1})\\).'),
    ],
    formulaBlocks: [
        {
            id: 'bspline-blossom-f-controls',
            latex: String.raw`d_i=f(u_{i+1},u_{i+2})`,
            notation: text(
                'Kontrolna točka \\(d_i\\) kvadratnega B-zlepka z vozli \\(u_k\\) je vrednost \\(f\\) v dveh zaporednih vozlih \\(u_{i+1}\\) in \\(u_{i+2}\\).',
                'The control point \\(d_i\\) of a quadratic B-spline with the knots \\(u_k\\) is the value of \\(f\\) at the two consecutive knots \\(u_{i+1}\\) and \\(u_{i+2}\\).',
            ),
            explanation: text(
                'Za vozle \\((0,0,0,1,2,2,2)\\) je \\(f(0,0)=(0,0)\\), \\(f(0,1)=(1,2)\\), \\(f(1,2)=(3,2)\\) in \\(f(2,2)=(4,0)\\).',
                'For the knots \\((0,0,0,1,2,2,2)\\) we get \\(f(0,0)=(0,0)\\), \\(f(0,1)=(1,2)\\), \\(f(1,2)=(3,2)\\) and \\(f(2,2)=(4,0)\\).',
            ),
        },
        {
            id: 'bspline-blossom-f-symmetry',
            latex: String.raw`f(a,b)=f(b,a),\qquad C(t)=f(t,t)`,
            notation: text(
                'Argumenta \\(a\\) in \\(b\\) lahko zamenjamo, točko krivulje pa dobimo z enakima argumentoma.',
                'The arguments \\(a\\) and \\(b\\) can be swapped, and a curve point is obtained with equal arguments.',
            ),
            explanation: text(
                'Simetrija pomeni, da vrstni red interpolacij ne vpliva na rezultat. Pri \\(a=b=t\\) trikotnik postane de Boorov postopek.',
                'Symmetry means that the order of the interpolations does not change the result. With \\(a=b=t\\) the triangle becomes de Boor\'s algorithm.',
            ),
        },
        {
            id: 'bspline-blossom-f-bezier',
            latex: String.raw`f(u_j,u_j),\quad f(u_j,u_{j+1}),\quad f(u_{j+1},u_{j+1})`,
            notation: text(
                'Bézierove točke odseka \\([u_j,u_{j+1}]\\) so vrednosti \\(f\\) v krajiščih odseka.',
                'The Bézier points of the segment \\([u_j,u_{j+1}]\\) are the values of \\(f\\) at the ends of the segment.',
            ),
            explanation: text(
                'Za odsek \\([0,1]\\) so to točke \\((0,0)\\), \\((1,2)\\) in \\((2,2)\\).',
                'For the segment \\([0,1]\\) these are the points \\((0,0)\\), \\((1,2)\\) and \\((2,2)\\).',
            ),
        },
    ],
    workedExamples: [
        {
            id: 'bspline-blossom-pair-example',
            title: text('\\(f(\\tfrac14,\\tfrac34)\\) z dvema interpolacijama', '\\(f(\\tfrac14,\\tfrac34)\\) by two interpolations'),
            calculationLatex: String.raw`\tfrac34(0,0)+\tfrac14(1,2)=(\tfrac14,\tfrac12),\quad \tfrac78(1,2)+\tfrac18(3,2)=(\tfrac54,2),\quad \tfrac14(\tfrac14,\tfrac12)+\tfrac34(\tfrac54,2)`,
            resultLatex: String.raw`f(\tfrac14,\tfrac34)=(1;\,1{,}625)`,
            check: text(
                'Prva interpolacija z argumentom \\(a=\\tfrac14\\) da točki \\((0{,}25;\\,0{,}5)\\) in \\((1{,}25;\\,2)\\), druga z argumentom \\(b=\\tfrac34\\) med njima pa \\((1;\\,1{,}625)\\).',
                'The first interpolation with the argument \\(a=\\tfrac14\\) gives the points \\((0.25,\\,0.5)\\) and \\((1.25,\\,2)\\), the second one with \\(b=\\tfrac34\\) between them gives \\((1,\\,1.625)\\).',
            ),
        },
    ],
    steps: [
        {
            id: 'bspline-blossom-predict', order: 1,
            title: text('Kje je \\(f(0,1)\\)?', 'Where is \\(f(0,1)\\)?'),
            purpose: text('Pred razkritjem napovedati, katera točka na sliki je \\(f(0,1)\\).', 'Predicting, before the reveal, which point of the picture is \\(f(0,1)\\).'),
            explanation: text(
                'Narisan je kvadratni B-zlepek z vozli \\((0,0,0,1,2,2,2)\\) in točkami \\((0,0)\\), \\((1,2)\\), \\((3,2)\\), \\((4,0)\\); izbran je odsek \\([0,1)\\), argumenta sta \\(a=0\\) in \\(b=1\\). Napovej: katera točka je \\(f(0,1)\\)? Kontrolna točka \\(d_i\\) je \\(f(u_{i+1},u_{i+2})\\), vozla \\(0\\) in \\(1\\) pa sta prav \\(u_2\\) in \\(u_3\\), zato je \\(f(0,1)\\) druga kontrolna točka \\((1,2)\\).',
                'A quadratic B-spline with the knots \\((0,0,0,1,2,2,2)\\) and the points \\((0,0)\\), \\((1,2)\\), \\((3,2)\\), \\((4,0)\\) is drawn; the segment \\([0,1)\\) is chosen and the arguments are \\(a=0\\) and \\(b=1\\). Predict: which point is \\(f(0,1)\\)? The control point \\(d_i\\) is \\(f(u_{i+1},u_{i+2})\\), and the knots \\(0\\) and \\(1\\) are exactly \\(u_2\\) and \\(u_3\\), so \\(f(0,1)\\) is the second control point \\((1,2)\\).',
            ),
            formulaIds: ['bspline-blossom-f-controls'],
            frames: [frame('bspline-blossom-predict-explanation', 'explanation'), frame('bspline-blossom-predict-observation', 'observation')],
            observationPrompt: text('Preberi vrednost \\(f(0;1)\\) v inšpektorju.', 'Read the value \\(f(0;1)\\) in the inspector.'),
            expectedObservations: [text('\\(f(0;1)=(1;2)\\), druga kontrolna točka.', '\\(f(0;1)=(1;2)\\), the second control point.')],
            scene: blossomScene('bspline-blossom-predict-controls', [setBezier(false), setArgs(BLOSSOM_PREDICT_ARGS)],
                'Odsek \\([0,1)\\), \\(a=0\\), \\(b=1\\): \\(f(0;1)=(1;2)\\); Bézierove točke so skrite.',
                'Segment \\([0,1)\\), \\(a=0\\), \\(b=1\\): \\(f(0;1)=(1;2)\\); the Bézier points are hidden.'),
        },
        {
            id: 'bspline-blossom-pair', order: 2,
            title: text('Poljuben par \\((a,b)\\)', 'Any pair \\((a,b)\\)'),
            purpose: text('Izračunati \\(f(a,b)\\) z dvema interpolacijama.', 'Computing \\(f(a,b)\\) by two interpolations.'),
            explanation: text(
                'Izberi poljuben par argumentov, na primer \\(a=\\tfrac14\\) in \\(b=\\tfrac34\\). Prva interpolacija z argumentom \\(a\\) med sosednjimi kontrolnimi točkami da dve točki, \\((0{,}25;\\,0{,}5)\\) in \\((1{,}25;\\,2)\\); druga z argumentom \\(b\\) med njima da \\(f(\\tfrac14,\\tfrac34)=(1;\\,1{,}625)\\). Isti trikotnik kaže slika.',
                'Choose any pair of arguments, for example \\(a=\\tfrac14\\) and \\(b=\\tfrac34\\). The first interpolation with the argument \\(a\\) between neighbouring control points gives two points, \\((0.25,\\,0.5)\\) and \\((1.25,\\,2)\\); the second one with \\(b\\) between them gives \\(f(\\tfrac14,\\tfrac34)=(1,\\,1.625)\\). The picture shows the same triangle.',
            ),
            formulaIds: ['bspline-blossom-f-controls'], workedExampleId: 'bspline-blossom-pair-example',
            frames: [frame('bspline-blossom-pair-explanation', 'explanation'), frame('bspline-blossom-pair-calculation', 'calculation'), frame('bspline-blossom-pair-observation', 'observation')],
            observationPrompt: text('Poišči obe vmesni točki in končno točko trikotnika.', 'Find both intermediate points and the final point of the triangle.'),
            expectedObservations: [text('Vmesni točki \\((0{,}25;\\,0{,}5)\\) in \\((1{,}25;\\,2)\\), končna točka \\((1;\\,1{,}625)\\).', 'The intermediate points \\((0.25,\\,0.5)\\) and \\((1.25,\\,2)\\), the final point \\((1,\\,1.625)\\).')],
            scene: blossomScene('bspline-blossom-pair-triangle', [setBezier(false), setArgs(BLOSSOM_PAIR_ARGS)],
                '\\(a=\\tfrac14\\), \\(b=\\tfrac34\\): \\(f(\\tfrac14,\\tfrac34)=(1;\\,1{,}625)\\).',
                '\\(a=\\tfrac14\\), \\(b=\\tfrac34\\): \\(f(\\tfrac14,\\tfrac34)=(1,\\,1.625)\\).'),
        },
        {
            id: 'bspline-blossom-diagonal', order: 3,
            title: text('Enaka argumenta dasta točko krivulje', 'Equal arguments give the curve point'),
            purpose: text('Videti, da je \\(f(t,t)\\) točka krivulje.', 'Seeing that \\(f(t,t)\\) is the curve point.'),
            explanation: text(
                'Nastavi \\(a=b=\\tfrac12\\). Trikotnik je zdaj de Boorov trikotnik pri \\(t=\\tfrac12\\): vmesni točki \\((0{,}5;\\,1)\\) in \\((1{,}5;\\,2)\\), končna točka \\(f(\\tfrac12,\\tfrac12)=(1;\\,1{,}5)\\) pa je točka krivulje \\(C(\\tfrac12)\\). Točka \\(t=\\tfrac12\\) leži v izbranem odseku \\([0,1)\\), zato inšpektor pokaže, da sta vrednosti enaki.',
                'Set \\(a=b=\\tfrac12\\). The triangle is now de Boor\'s triangle at \\(t=\\tfrac12\\): the intermediate points are \\((0.5,\\,1)\\) and \\((1.5,\\,2)\\), and the final point \\(f(\\tfrac12,\\tfrac12)=(1,\\,1.5)\\) is the curve point \\(C(\\tfrac12)\\). The point \\(t=\\tfrac12\\) lies in the chosen segment \\([0,1)\\), so the inspector reports that the two values are equal.',
            ),
            formulaIds: ['bspline-blossom-f-symmetry'],
            frames: [frame('bspline-blossom-diagonal-explanation', 'explanation'), frame('bspline-blossom-diagonal-observation', 'observation')],
            observationPrompt: text('Preberi, ali je \\(f(t,t)\\) enaka točki krivulje.', 'Read whether \\(f(t,t)\\) equals the curve point.'),
            expectedObservations: [text('\\(f(\\tfrac12,\\tfrac12)=C(\\tfrac12)=(1;\\,1{,}5)\\).', '\\(f(\\tfrac12,\\tfrac12)=C(\\tfrac12)=(1;\\,1.5)\\).')],
            scene: blossomScene('bspline-blossom-diagonal-curve', [setBezier(false), setArgs(BLOSSOM_DIAGONAL_ARGS)],
                '\\(a=b=\\tfrac12\\): \\(f(\\tfrac12,\\tfrac12)=(1;\\,1{,}5)\\), enaka točki krivulje.',
                '\\(a=b=\\tfrac12\\): \\(f(\\tfrac12,\\tfrac12)=(1,\\,1.5)\\), equal to the curve point.'),
        },
        {
            id: 'bspline-blossom-symmetry', order: 4,
            title: text('Simetrija \\(f(a,b)=f(b,a)\\)', 'Symmetry \\(f(a,b)=f(b,a)\\)'),
            purpose: text('Videti, da zamenjava argumentov ne spremeni vrednosti, čeprav sta vmesni točki različni.', 'Seeing that swapping the arguments does not change the value, although the intermediate points differ.'),
            explanation: text(
                'Zamenjaj argumenta iz drugega koraka: \\(a=\\tfrac34\\) in \\(b=\\tfrac14\\). Vmesni točki sta zdaj \\((0{,}75;\\,1{,}5)\\) in \\((1{,}75;\\,2)\\), končna točka pa je spet \\((1;\\,1{,}625)\\). Inšpektor pokaže obrnjen vrstni red in razliko med vrstnimi redi, ki je \\(0\\).',
                'Swap the arguments of the second step: \\(a=\\tfrac34\\) and \\(b=\\tfrac14\\). The intermediate points are now \\((0.75,\\,1.5)\\) and \\((1.75,\\,2)\\), and the final point is again \\((1,\\,1.625)\\). The inspector shows the reversed order and the difference between the orders, which is \\(0\\).',
            ),
            formulaIds: ['bspline-blossom-f-symmetry'],
            frames: [frame('bspline-blossom-symmetry-explanation', 'explanation'), frame('bspline-blossom-symmetry-observation', 'observation')],
            observationPrompt: text('Primerjaj \\(f(a,b)\\) in \\(f(b,a)\\) v inšpektorju.', 'Compare \\(f(a,b)\\) and \\(f(b,a)\\) in the inspector.'),
            expectedObservations: [text('Obe vrednosti sta \\((1;\\,1{,}625)\\), razlika je \\(0\\).', 'Both values are \\((1,\\,1.625)\\); the difference is \\(0\\).')],
            scene: blossomScene('bspline-blossom-symmetry-swapped', [setBezier(false), setArgs(BLOSSOM_SWAPPED_ARGS)],
                '\\(a=\\tfrac34\\), \\(b=\\tfrac14\\): \\(f(\\tfrac34,\\tfrac14)=(1;\\,1{,}625)\\), enako kot pri zamenjanih argumentih.',
                '\\(a=\\tfrac34\\), \\(b=\\tfrac14\\): \\(f(\\tfrac34,\\tfrac14)=(1,\\,1.625)\\), the same as with the arguments swapped.'),
        },
        {
            id: 'bspline-blossom-bezier', order: 5,
            title: text('Bézierove točke odseka', 'The Bézier points of a segment'),
            purpose: text('Iz \\(f\\) prebrati Bézierove točke odseka.', 'Reading the Bézier points of a segment off \\(f\\).'),
            explanation: text(
                'Vklopi Bézierove točke odseka. Za odsek \\([0,1]\\) so to \\(f(0,0)=(0,0)\\), \\(f(0,1)=(1,2)\\) in \\(f(1,1)=(2,2)\\). Pri teh podatkih je krivulja ena sama parabola, zato so to tudi Bézierove točke krivulje na \\([0,1]\\).',
                'Switch on the Bézier points of the segment. For the segment \\([0,1]\\) they are \\(f(0,0)=(0,0)\\), \\(f(0,1)=(1,2)\\) and \\(f(1,1)=(2,2)\\). With this data the whole curve is a single parabola, so these are also the Bézier points of the curve on \\([0,1]\\).',
            ),
            formulaIds: ['bspline-blossom-f-bezier'],
            frames: [frame('bspline-blossom-bezier-explanation', 'explanation'), frame('bspline-blossom-bezier-observation', 'observation')],
            observationPrompt: text('Preberi tri Bézierove točke odseka.', 'Read the three Bézier points of the segment.'),
            expectedObservations: [text('\\((0;\\,0)\\), \\((1;\\,2)\\) in \\((2;\\,2)\\).', '\\((0;\\,0)\\), \\((1;\\,2)\\) and \\((2;\\,2)\\).')],
            scene: blossomScene('bspline-blossom-bezier-points', [setBezier(true), setArgs(BLOSSOM_PREDICT_ARGS)],
                'Odsek \\([0,1)\\), Bézierove točke \\((0;\\,0)\\), \\((1;\\,2)\\), \\((2;\\,2)\\).',
                'Segment \\([0,1)\\), the Bézier points \\((0,\\,0)\\), \\((1,\\,2)\\), \\((2,\\,2)\\).'),
        },
        {
            id: 'bspline-blossom-explore', order: 6,
            title: text('Prosto raziskovanje', 'Free exploration'),
            purpose: text('Samostojno spreminjati argumente, odsek in stopnjo.', 'Changing the arguments, the segment and the degree on your own.'),
            explanation: text(
                'Spet je privzeta krivulja. Premikaj argumente, izberi drugi odsek \\([1,2)\\), preklopi na stopnjo \\(3\\) ali premakni kontrolno točko in opazuj, kako se trikotnik, simetrija in Bézierove točke spreminjajo. Gumb »Ponastavi« vrne začetno stanje.',
                'The default curve is back. Move the arguments, choose the other segment \\([1,2)\\), switch to degree \\(3\\) or drag a control point and watch how the triangle, the symmetry and the Bézier points change. The “Reset” button returns the starting state.',
            ),
            formulaIds: ['bspline-blossom-f-controls', 'bspline-blossom-f-symmetry', 'bspline-blossom-f-bezier'],
            frames: [frame('bspline-blossom-explore-explanation', 'explanation'), frame('bspline-blossom-explore-observation', 'observation')],
            observationPrompt: text('Poišči par argumentov, pri katerem je \\(f\\) enaka točki krivulje.', 'Find a pair of arguments for which \\(f\\) equals the curve point.'),
            expectedObservations: [text('Pri enakih argumentih v izbranem odseku je \\(f(t,t)\\) enaka točki krivulje.', 'With equal arguments inside the chosen segment, \\(f(t,t)\\) equals the curve point.')],
            scene: blossomScene('bspline-blossom-explore-start', [setBezier(true)],
                'Privzeta krivulja, odsek \\([0,1)\\), \\(a=0\\), \\(b=\\tfrac12\\); vse je prosto za raziskovanje.',
                'The default curve, segment \\([0,1)\\), \\(a=0\\), \\(b=\\tfrac12\\); everything is free to explore.'),
        },
    ],
    sources: [
        {id: 'ramshaw-blossoming', citation: 'Ramshaw, L. Blossoming: A Connect-the-Dots Approach to Splines. Digital Systems Research Center, 1987.'},
        {id: 'farin-blossoms', citation: 'Farin, G. Curves and Surfaces for CAGD, 5th ed., the chapters on blossoming and B-splines.'},
        {
            id: 'bezeg-bspline-blossom-implementation',
            citation: 'Bezeg source: src/graphs/curves/bspline/BSplineBlossomGraph.tsx and bsplineBlossomModel.ts.',
            implementationCorrespondence: 'A lesson scene sets the degree, knots and points with a curve fixture and edits the arguments and the Bézier switch with the blossom actions set-args and set-bezier, which call the setters the controls use. The value, the triangle and the Bézier points come from the kernel\'s blossom in src/bezeg/impl/curve/bspline.',
        },
    ],
    edgeCases: [
        text('Argumenti tečejo po vsem definicijskem območju, ne le po izbranem odseku; zunaj odseka inšpektor loči, ali \\(f(t,t)\\) sovpada s krivuljo, jo le razširja ali krivulja tam ni zvezna.', 'The arguments run over the whole domain, not only over the chosen segment; outside it the inspector tells whether \\(f(t,t)\\) coincides with the curve, only extends it or the curve is discontinuous there.'),
        text('Ponujeni sta samo stopnji \\(2\\) in \\(3\\).', 'Only the degrees \\(2\\) and \\(3\\) are offered.'),
    ],
    unresolvedQuestions: [],
};

export const bsplineBlossomGuidedLessons: readonly GuidedLesson[] = [blossomLesson];
