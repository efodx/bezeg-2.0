/**
 * Guided lessons of the Interpolation and approximation family (docs/specs/interpolation-approximation-lessons.md): I1,
 * Lagrange interpolation versus Bézier approximation, and I3, Hermite and Catmull-Rom curves. The text is a one-shot draft (docs/specs/new-lesson-families.md,
 * "One-shot lesson text"): every value it quotes is the readout of the scene it belongs to, and
 * `interpolationGuidedLessons.test.ts` checks that against the real graph and the kernel in `src/analysis/interpolation.ts`.
 * I1 scenes use the `interpolation` (`set-rule`, `set-overlay`, `add-point`) and `parameter` (`t`, the shared position s) actions;
 * I3 scenes use the `hermite` action (`set-mode`, `set-rule`, `set-tension`, `set-overlay`, `add-point`).
 */
import type {LessonAction} from '../model';
import type {GuidedLesson, GuidedLessonFrame, GuidedLessonFrameKind, LessonScene, LocalizedText} from './guidedLessons';

const text = (sl: string, en: string): LocalizedText => ({sl, en});
const frame = (id: string, kind: GuidedLessonFrameKind): GuidedLessonFrame => ({id, kind});

/** A scene from the default four points: the parameter rule, the overlays, the shared position s, then optionally a fifth point. */
const interpolationScene = (
    id: string, overlays: {hull: boolean; bezier: boolean; basis: boolean}, position: number, sl: string, en: string, extraPoint = false,
): LessonScene => {
    const actions: LessonAction[] = [
        {kind: 'prepared-scene', sceneId: id, source: 'demonstration-default'},
        {kind: 'interpolation', operation: 'set-rule', rule: 'uniform'},
        {kind: 'interpolation', operation: 'set-overlay', overlay: 'hull', visible: overlays.hull},
        {kind: 'interpolation', operation: 'set-overlay', overlay: 'bezier', visible: overlays.bezier},
        {kind: 'interpolation', operation: 'set-overlay', overlay: 'basis', visible: overlays.basis},
        {kind: 'parameter', name: 't', value: position},
        ...(extraPoint ? [{kind: 'interpolation', operation: 'add-point'} as const] : []),
    ];
    return {id, basedOn: 'demonstration-default', actions, expectedState: text(sl, en)};
};

const lagrangeLesson: GuidedLesson = {
    demonstrationId: 'interp-lagrange',
    title: text('Skozi točke ali blizu njih', 'Through the points or near them'),
    summary: text(
        'Interpolacija zahteva, da krivulja poteka skozi dane točke; aproksimacija se jim le približa. Lagrangeev interpolacijski polinom gre skozi vse točke, a lahko izstopi iz njihove konveksne ovojnice, Bézierova krivulja z istimi točkami kot kontrolnimi pa ovojnice nikoli ne zapusti.',
        'Interpolation requires the curve to pass through the given points; approximation only comes near them. The Lagrange interpolation polynomial passes through every point but can leave their convex hull, while the Bézier curve with the same points as control points never leaves it.',
    ),
    prerequisites: [
        text('Potrebno je poznavanje Bézierovih krivulj: algoritem de Casteljau in konveksna ovojnica kontrolnih točk.', 'Assumes the Bézier curves chapter: the de Casteljau algorithm and the convex hull of the control points.'),
        text('Potrebno je razumevanje parametrične krivulje: točka \\(P(t)\\) se giblje, ko se spreminja parameter \\(t\\).', 'Assumes the idea of a parametric curve: a point \\(P(t)\\) moves as the parameter \\(t\\) changes.'),
    ],
    learningGoals: [
        text('Razlikuješ interpolacijo (skozi točke) in aproksimacijo (blizu točk) ter navedeš, kaj vsaka zagotavlja.', 'Tell interpolation (through the points) from approximation (near the points) and say what each guarantees.'),
        text('Preveriš, da so uteži Lagrangeevega polinoma lahko negativne, zato krivulja izstopi iz konveksne ovojnice.', 'Check that the weights of the Lagrange polynomial can be negative, so the curve leaves the convex hull.'),
        text('Primerjaš Lagrangeeve bazne polinome z Bernsteinovimi in razložiš, zakaj sta oba globalna.', 'Compare the Lagrange basis polynomials with the Bernstein polynomials and explain why both are global.'),
    ],
    formulaBlocks: [
        {
            id: 'lagrange-basis',
            latex: 'P(t)=\\sum_{j=0}^{n}\\ell_j(t)\\,P_j,\\qquad \\ell_j(t)=\\prod_{k\\ne j}\\frac{t-t_k}{t_j-t_k},\\qquad \\sum_{j=0}^{n}\\ell_j(t)=1',
            notation: text(
                '\\(P_j\\) so interpolacijske točke, \\(t_j\\) njihovi parametri (tu \\(0,1,2,3\\)), \\(\\ell_j\\) bazni polinomi.',
                '\\(P_j\\) are the interpolation points, \\(t_j\\) their parameters (here \\(0,1,2,3\\)) and \\(\\ell_j\\) the basis polynomials.',
            ),
            explanation: text(
                'Polinom \\(\\ell_j\\) ima v \\(t_j\\) vrednost \\(1\\), v drugih parametrih pa \\(0\\), zato krivulja gre skozi vse točke. Uteži se vedno seštejejo v \\(1\\), a so lahko negativne.',
                'The polynomial \\(\\ell_j\\) has the value \\(1\\) at \\(t_j\\) and \\(0\\) at the other parameters, so the curve passes through every point. The weights always add up to \\(1\\), but they can be negative.',
            ),
        },
        {
            id: 'bernstein-weights',
            latex: 'B(s)=\\sum_{j=0}^{n}\\binom{n}{j}s^j(1-s)^{n-j}\\,P_j',
            notation: text(
                '\\(s\\in[0,1]\\) je isti položaj na obeh krivuljah, \\(n+1\\) število točk.',
                '\\(s\\in[0,1]\\) is the same position on both curves and \\(n+1\\) the number of points.',
            ),
            explanation: text(
                'Bernsteinove uteži so na \\([0,1]\\) nenegativne in se seštejejo v \\(1\\), zato je vsaka točka krivulje konveksna kombinacija točk \\(P_j\\) in leži v njihovi konveksni ovojnici.',
                'The Bernstein weights are non-negative on \\([0,1]\\) and add up to \\(1\\), so every point of the curve is a convex combination of the points \\(P_j\\) and lies in their convex hull.',
            ),
        },
    ],
    workedExamples: [
        {
            id: 'lagrange-midpoint-example',
            title: text('Sredina krivulje pri \\(t=3/2\\)', 'The middle of the curve at \\(t=3/2\\)'),
            calculationLatex: '\\ell_0\\!\\left(\\tfrac32\\right)=\\frac{\\tfrac12\\cdot(-\\tfrac12)\\cdot(-\\tfrac32)}{(-1)(-2)(-3)}=-\\tfrac1{16},\\qquad P\\!\\left(\\tfrac32\\right)=-\\tfrac1{16}P_0+\\tfrac9{16}P_1+\\tfrac9{16}P_2-\\tfrac1{16}P_3',
            resultLatex: 'P\\!\\left(\\tfrac32\\right)=(2,\\;2{,}8125)',
            check: text(
                'Izpis pod grafom pri \\(s=0{,}5\\) pokaže uteži \\(-0{,}0625;\\ 0{,}5625;\\ 0{,}5625;\\ -0{,}0625\\) in točko \\((2;\\ 2{,}8125)\\).',
                'The readout at \\(s=0.5\\) shows the weights \\(-0.0625;\\ 0.5625;\\ 0.5625;\\ -0.0625\\) and the point \\((2;\\ 2.8125)\\).',
            ),
        },
    ],
    steps: [
        {
            id: 'interp-predict-hull', order: 1,
            title: text('Ali ostane v ovojnici?', 'Does it stay inside the hull?'),
            purpose: text('Pred razkritjem napovedati, ali krivulja skozi štiri točke ostane v njihovi ovojnici.', 'Predicting, before the reveal, whether a curve through four points stays inside their hull.'),
            explanation: text(
                'Na grafu so točke \\(P_0=(0,0)\\), \\(P_1=(1,2)\\), \\(P_2=(3,3)\\), \\(P_3=(4,0)\\) in Lagrangeeva krivulja skoznje s parametri \\(t=0,1,2,3\\). Konveksna ovojnica je še skrita. Napovej: ali krivulja, ki gre skozi vse štiri točke, ostane znotraj njihove konveksne ovojnice?',
                'The graph shows the points \\(P_0=(0,0)\\), \\(P_1=(1,2)\\), \\(P_2=(3,3)\\), \\(P_3=(4,0)\\) and the Lagrange curve through them with the parameters \\(t=0,1,2,3\\). The convex hull is still hidden. Predict: does a curve through all four points stay inside their convex hull?',
            ),
            formulaIds: ['lagrange-basis'],
            frames: [frame('interp-predict-hull-explanation', 'explanation'), frame('interp-predict-hull-observation', 'observation')],
            observationPrompt: text('Obleci si napoved o ovojnici, preden jo prikažeš v naslednjem koraku.', 'Commit to your prediction about the hull before the next step shows it.'),
            expectedObservations: [text('Krivulja gre skozi vse štiri točke; ali pri tem ostane v ovojnici, še ne vidiš.', 'The curve passes through all four points; whether it stays in the hull you cannot see yet.')],
            scene: interpolationScene('interp-predict-hull-start', {hull: false, bezier: false, basis: false}, 0.5,
                'Samo Lagrangeeva krivulja skozi točke; pri \\(s=0{,}5\\), torej \\(t=3/2\\), je točka \\((2;\\ 2{,}8125)\\).',
                'Only the Lagrange curve through the points; at \\(s=0.5\\), that is \\(t=3/2\\), the point is \\((2;\\ 2.8125)\\).'),
        },
        {
            id: 'interp-hull-reveal', order: 2,
            title: text('Krivulja izstopi', 'The curve leaves the hull'),
            purpose: text('Pokazati konveksno ovojnico in videti, da interpolacijska krivulja izstopi iz nje.', 'Showing the convex hull and seeing the interpolating curve leave it.'),
            explanation: text(
                'Ovojnica je zdaj narisana. Pri \\(s=5/6\\), torej \\(t=5/2\\), so uteži \\(0{,}0625;\\ -0{,}3125;\\ 0{,}9375;\\ 0{,}3125\\) in točka \\((3{,}75;\\ 2{,}1875)\\). Ker je ena utež negativna, ni konveksna kombinacija, točka pa leži desno od roba med \\(P_2\\) in \\(P_3\\), zunaj ovojnice. Napovej, v katero smer moraš povleči \\(P_2\\), da krivulja izstopi še bolj, nato jo povleci.',
                'The hull is now drawn. At \\(s=5/6\\), that is \\(t=5/2\\), the weights are \\(0.0625;\\ -0.3125;\\ 0.9375;\\ 0.3125\\) and the point is \\((3.75;\\ 2.1875)\\). One weight is negative, so it is not a convex combination, and the point lies to the right of the edge between \\(P_2\\) and \\(P_3\\), outside the hull. Predict in which direction to drag \\(P_2\\) so that the curve leaves further out, then drag it.',
            ),
            formulaIds: ['lagrange-basis'],
            frames: [frame('interp-hull-reveal-explanation', 'explanation'), frame('interp-hull-reveal-observation', 'observation')],
            observationPrompt: text('Premakni drsnik \\(s\\) in poišči del krivulje zunaj ovojnice; nato povleci točko, da krivulja izstopi še bolj.', 'Move the \\(s\\) slider and find the part of the curve outside the hull; then drag a point to push the curve out further.'),
            expectedObservations: [text('Krivulja gre skozi vse točke, vendar izstopi iz ovojnice ob robu med \\(P_2\\) in \\(P_3\\).', 'The curve passes through every point but leaves the hull near the edge between \\(P_2\\) and \\(P_3\\).')],
            scene: interpolationScene('interp-hull-reveal-outside', {hull: true, bezier: false, basis: false}, 5 / 6,
                'Ovojnica je prikazana; pri \\(s=5/6\\) je Lagrangeeva točka \\((3{,}75;\\ 2{,}1875)\\), zunaj ovojnice.',
                'The hull is shown; at \\(s=5/6\\) the Lagrange point is \\((3.75;\\ 2.1875)\\), outside the hull.'),
        },
        {
            id: 'interp-bezier', order: 3,
            title: text('Bézierova krivulja z istimi točkami', 'The Bézier curve on the same points'),
            purpose: text('Primerjati Bézierovo aproksimacijo z interpolacijo na istem položaju \\(s\\).', 'Comparing the Bézier approximation with the interpolation at the same position \\(s\\).'),
            explanation: text(
                'Črtkana krivulja je Bézierova krivulja s točkami \\(P_0,\\dots,P_3\\) kot kontrolnimi. Pri \\(s=1/2\\) ima Bernsteinove uteži \\(\\tfrac18,\\tfrac38,\\tfrac38,\\tfrac18\\) in točko \\((2;\\ 1{,}875)\\), medtem ko je Lagrangeeva točka \\((2;\\ 2{,}8125)\\). Napovej, katera krivulja gre skozi \\(P_1\\), in preveri na grafu.',
                'The dashed curve is the Bézier curve with \\(P_0,\\dots,P_3\\) as control points. At \\(s=1/2\\) it has the Bernstein weights \\(\\tfrac18,\\tfrac38,\\tfrac38,\\tfrac18\\) and the point \\((2;\\ 1.875)\\), while the Lagrange point is \\((2;\\ 2.8125)\\). Predict which curve passes through \\(P_1\\), then check on the graph.',
            ),
            formulaIds: ['bernstein-weights'], workedExampleId: 'lagrange-midpoint-example',
            frames: [frame('interp-bezier-explanation', 'explanation'), frame('interp-bezier-calculation', 'calculation'), frame('interp-bezier-observation', 'observation')],
            observationPrompt: text('Premakni \\(s\\) od \\(0\\) do \\(1\\) in preveri, da Bézierova točka ves čas ostane v ovojnici.', 'Move \\(s\\) from \\(0\\) to \\(1\\) and check that the Bézier point stays inside the hull the whole time.'),
            expectedObservations: [text('Lagrangeeva krivulja gre skozi vse štiri točke, Bézierova samo skozi \\(P_0\\) in \\(P_3\\); Bézierova ostane v ovojnici.', 'The Lagrange curve passes through all four points, the Bézier curve only through \\(P_0\\) and \\(P_3\\); the Bézier curve stays in the hull.')],
            scene: interpolationScene('interp-bezier-middle', {hull: true, bezier: true, basis: false}, 0.5,
                'Obe krivulji pri \\(s=0{,}5\\): Lagrange \\((2;\\ 2{,}8125)\\), Bézier \\((2;\\ 1{,}875)\\).',
                'Both curves at \\(s=0.5\\): Lagrange \\((2;\\ 2.8125)\\), Bézier \\((2;\\ 1.875)\\).'),
        },
        {
            id: 'interp-basis', order: 4,
            title: text('Bazni polinomi', 'Basis polynomials'),
            purpose: text('Primerjati Lagrangeeve in Bernsteinove bazne polinome ter brati uteži pri izbranem položaju.', 'Comparing the Lagrange and Bernstein basis polynomials and reading the weights at a chosen position.'),
            explanation: text(
                'Prikazana sta grafa baznih polinomov. Vsak Lagrangeev polinom ima v svojem parametru vrednost \\(1\\), v drugih \\(0\\), vmes pa seže pod \\(0\\); Bernsteinovi so povsod nenegativni. Pri \\(s=1/6\\), torej \\(t=1/2\\), so Lagrangeeve uteži \\(0{,}3125;\\ 0{,}9375;\\ -0{,}3125;\\ 0{,}0625\\). Napovej, katera utež je negativna, in jo poišči na grafu.',
                'The graphs of the basis polynomials are shown. Each Lagrange polynomial has the value \\(1\\) at its own parameter and \\(0\\) at the others, but dips below \\(0\\) in between; the Bernstein polynomials are non-negative everywhere. At \\(s=1/6\\), that is \\(t=1/2\\), the Lagrange weights are \\(0.3125;\\ 0.9375;\\ -0.3125;\\ 0.0625\\). Predict which weight is negative and find it on the graph.',
            ),
            formulaIds: ['lagrange-basis', 'bernstein-weights'],
            frames: [frame('interp-basis-explanation', 'explanation'), frame('interp-basis-observation', 'observation')],
            observationPrompt: text('Premakni \\(s\\) in opazuj, kdaj ima kateri Lagrangeev polinom negativno vrednost.', 'Move \\(s\\) and watch when each Lagrange polynomial takes a negative value.'),
            expectedObservations: [text('Pri \\(t=1/2\\) je tretja utež \\(-0{,}3125\\); uteži se še vedno seštejejo v \\(1\\).', 'At \\(t=1/2\\) the third weight is \\(-0.3125\\); the weights still add up to \\(1\\).')],
            scene: interpolationScene('interp-basis-sixth', {hull: true, bezier: true, basis: true}, 1 / 6,
                'Bazna grafa sta prikazana; pri \\(s=1/6\\) so Lagrangeeve uteži \\(0{,}3125;\\ 0{,}9375;\\ -0{,}3125;\\ 0{,}0625\\).',
                'The basis plots are shown; at \\(s=1/6\\) the Lagrange weights are \\(0.3125;\\ 0.9375;\\ -0.3125;\\ 0.0625\\).'),
        },
        {
            id: 'interp-global', order: 5,
            title: text('Globalni vpliv točke', 'The global effect of a point'),
            purpose: text('Pred razkritjem napovedati, kako premik ene točke vpliva na oddaljene dele obeh krivulj.', 'Predicting, before the reveal, how moving one point affects distant parts of both curves.'),
            explanation: text(
                'Obe krivulji sta polinoma cele stopnje, zato nobena utež ni povsod enaka \\(0\\). Napovej: če povlečeš \\(P_0\\), ali se bo spremenil tudi konec pri \\(P_3\\) na Lagrangeevi in na Bézierovi krivulji? Potem povleci \\(P_0\\) in primerjaj.',
                'Both curves are polynomials of the full degree, so no weight is identically \\(0\\). Predict: if you drag \\(P_0\\), will the end near \\(P_3\\) change on the Lagrange curve and on the Bézier curve? Then drag \\(P_0\\) and compare.',
            ),
            formulaIds: ['lagrange-basis', 'bernstein-weights'],
            frames: [frame('interp-global-explanation', 'explanation'), frame('interp-global-observation', 'observation')],
            observationPrompt: text('Povleci \\(P_0\\) in opazuj oba konca obeh krivulj.', 'Drag \\(P_0\\) and watch both ends of both curves.'),
            expectedObservations: [text('Obe krivulji se spremenita po vsej dolžini, tudi blizu \\(P_3\\); krajišči \\(P_0\\) in \\(P_3\\) ostaneta na krivuljah.', 'Both curves change along their whole length, also near \\(P_3\\); the end points \\(P_0\\) and \\(P_3\\) stay on the curves.')],
            scene: interpolationScene('interp-global-start', {hull: true, bezier: true, basis: false}, 0.5,
                'Začetni položaj za vlečenje: obe krivulji pri \\(s=0{,}5\\), Lagrange \\((2;\\ 2{,}8125)\\), Bézier \\((2;\\ 1{,}875)\\).',
                'The starting position for dragging: both curves at \\(s=0.5\\), Lagrange \\((2;\\ 2.8125)\\), Bézier \\((2;\\ 1.875)\\).'),
        },
        {
            id: 'interp-fifth-point', order: 6,
            title: text('Peta točka', 'A fifth point'),
            purpose: text('Dodati peto točko in videti, kako se spremenita obe krivulji.', 'Adding a fifth point and seeing how both curves change.'),
            explanation: text(
                'Dodana je točka \\(P_4=(5,0)\\). Lagrangeev polinom ima zdaj stopnjo \\(4\\) in parametre \\(t=0,\\dots,4\\), Bézierova krivulja pa tudi stopnjo \\(4\\). Napovej, ali bo Lagrangeeva krivulja še vedno šla skozi prvih štiri točke, in preveri.',
                'The point \\(P_4=(5,0)\\) has been added. The Lagrange polynomial now has degree \\(4\\) and the parameters \\(t=0,\\dots,4\\), and the Bézier curve has degree \\(4\\) too. Predict whether the Lagrange curve still passes through the first four points, then check.',
            ),
            formulaIds: ['lagrange-basis'],
            frames: [frame('interp-fifth-point-explanation', 'explanation'), frame('interp-fifth-point-observation', 'observation')],
            observationPrompt: text('Povleci novo točko in primerjaj, kako se spremenita obe krivulji.', 'Drag the new point and compare how both curves change.'),
            expectedObservations: [text('Lagrangeeva krivulja gre skozi vseh pet točk, a se celotna oblika spremeni; Bézierova krivulja ostane v ovojnici novih točk.', 'The Lagrange curve passes through all five points, but its whole shape changes; the Bézier curve stays in the hull of the new points.')],
            scene: interpolationScene('interp-fifth-point-added', {hull: true, bezier: true, basis: false}, 0.5,
                'Pet točk, \\(P_4=(5,0)\\); Lagrangeeva krivulja gre skozi vseh pet.',
                'Five points, \\(P_4=(5,0)\\); the Lagrange curve passes through all five.', true),
        },
        {
            id: 'interp-explore', order: 7,
            title: text('Prosto raziskovanje', 'Free exploration'),
            purpose: text('Samostojno premikati točke, spreminjati njihovo število in primerjati krivulji.', 'Moving the points, changing their number and comparing the curves on your own.'),
            explanation: text(
                'Štiri točke so spet na začetnem mestu. Premikaj jih, dodajaj ali odstranjuj točke, preklopi parametre med enakomernimi in po dolžini tetiv ter opazuj, kdaj Lagrangeeva krivulja izstopi iz ovojnice in kdaj Bézierova ne.',
                'The four points are back at their starting place. Move them, add or remove points, switch the parameters between uniform and chord length, and watch when the Lagrange curve leaves the hull and when the Bézier curve does not.',
            ),
            formulaIds: ['lagrange-basis', 'bernstein-weights'],
            frames: [frame('interp-explore-explanation', 'explanation'), frame('interp-explore-observation', 'observation')],
            observationPrompt: text('Poišči razporeditev točk, pri kateri Lagrangeeva krivulja najmočneje izstopi iz ovojnice.', 'Find an arrangement of the points where the Lagrange curve leaves the hull the most.'),
            expectedObservations: [text('Bézierova krivulja nikoli ne zapusti ovojnice; Lagrangeeva jo pogosto, zlasti ob krajiščih.', 'The Bézier curve never leaves the hull; the Lagrange curve often does, especially near the ends.')],
            scene: interpolationScene('interp-explore-start', {hull: false, bezier: true, basis: false}, 0.5,
                'Štiri točke in obe krivulji pri \\(s=0{,}5\\); vse je prosto za raziskovanje.',
                'Four points and both curves at \\(s=0.5\\); everything is free to explore.'),
        },
    ],
    sources: [
        {id: 'farin-curves', citation: 'Farin, G. Curves and Surfaces for CAGD, 5th ed., chapters on polynomial interpolation and Bézier curves (convex hull property).'},
        {id: 'berrut-trefethen', citation: 'Berrut, J.-P. and Trefethen, L. N. Barycentric Lagrange interpolation. SIAM Review 46 (2004).'},
        {
            id: 'bezeg-interpolation-implementation',
            citation: 'Bezeg source: src/analysis/interpolation.ts, src/graphs/curves/interpolation/interpolationModel.ts and InterpolationGraph.tsx.',
            implementationCorrespondence: 'All values come from the interpolation kernel; a lesson scene sets the parameter rule, the overlays and a fifth point with the interpolation action and the shared position s with the parameter action named t.',
        },
    ],
    edgeCases: [
        text('Dve točki z enakim parametrom bi povzročili deljenje z nič; graf takšen premik zavrne in to izpiše.', 'Two points with the same parameter would divide by zero; the graph refuses such a move and says so.'),
        text('Točk je lahko največ \\(12\\); dodajanje pri največjem številu ne naredi ničesar.', 'There can be at most \\(12\\) points; adding one at the maximum does nothing.'),
    ],
    unresolvedQuestions: [],
};

/** A scene from the default four points: mode, parameter rule, tension, overlays, then optionally more points at the Add button's places. */
const hermiteScene = (
    id: string, mode: 'catmull-rom' | 'hermite', overlays: {tangents: boolean; bezier: boolean}, extraPoints: number, sl: string, en: string,
): LessonScene => {
    const actions: LessonAction[] = [
        {kind: 'prepared-scene', sceneId: id, source: 'demonstration-default'},
        {kind: 'hermite', operation: 'set-rule', rule: 'uniform'},
        // The tension is set before the mode: it has no effect in Hermite mode, and the switch copies the tension-scaled tangents.
        {kind: 'hermite', operation: 'set-tension', value: 1},
        {kind: 'hermite', operation: 'set-mode', mode},
        {kind: 'hermite', operation: 'set-overlay', overlay: 'tangents', visible: overlays.tangents},
        {kind: 'hermite', operation: 'set-overlay', overlay: 'bezier', visible: overlays.bezier},
        ...Array.from({length: extraPoints}, () => ({kind: 'hermite', operation: 'add-point'}) as const),
    ];
    return {id, basedOn: 'demonstration-default', actions, expectedState: text(sl, en)};
};

const hermiteLesson: GuidedLesson = {
    demonstrationId: 'interp-hermite',
    title: text('Hermiteova interpolacija in Catmull-Romov zlepek', 'Hermite interpolation and the Catmull-Rom spline'),
    summary: text(
        'Hermiteova interpolacija predpiše v vsaki interpolacijski točki lego in tangento in da lokalno krivuljo razreda \\(C^1\\). Catmull-Romov zlepek tangente izbere iz sosednjih točk, zato ostane krivulja skozi vse točke, premik ene točke pa spremeni le nekaj sosednjih odsekov.',
        'Hermite interpolation prescribes a position and a tangent at every interpolation point and gives a local \\(C^1\\) curve. The Catmull-Rom spline chooses the tangents from the neighbouring points, so the curve passes through every point and moving one point changes only a few neighbouring segments.',
    ),
    prerequisites: [
        text('Potrebno je poznavanje zlepkov iz poglavja o zlepkih: tangentna zveznost \\(C^1\\) in kubični Bézierjevi odseki.', 'Assumes the splines chapter: tangent continuity \\(C^1\\) and cubic Bézier segments.'),
        text('Potrebna je lekcija o Lagrangeevi interpolaciji: tam krivulja skozi točke ni lokalna.', 'Assumes the Lagrange interpolation lesson: there the curve through the points is not local.'),
    ],
    learningGoals: [
        text('Napoveš obliko kubičnega Hermiteovega odseka iz leg in tangent v krajiščih in jo pretvoriš v Bézierjeve kontrolne točke.', 'Predict the shape of a cubic Hermite segment from the positions and tangents at its ends and convert it to Bézier control points.'),
        text('Izračunaš tangento Catmull-Romovega zlepka iz sosednjih točk in veš, da so tangente v krajiščih enostranske.', 'Compute a Catmull-Rom tangent from the neighbouring points and know that the end tangents are one-sided.'),
        text('Razložiš, zakaj je zlepek zvezen razreda \\(C^1\\), a drugi odvodi se v točkah na splošno razlikujejo, in zakaj je lokalen.', 'Explain why the spline is \\(C^1\\) but its second derivatives generally differ at the points, and why it is local.'),
    ],
    formulaBlocks: [
        {
            id: 'hermite-bezier',
            latex: 'Q_0=P_i,\\quad Q_1=P_i+\\tfrac13 h_i m_i,\\quad Q_2=P_{i+1}-\\tfrac13 h_i m_{i+1},\\quad Q_3=P_{i+1},\\qquad h_i=t_{i+1}-t_i',
            notation: text(
                '\\(P_i\\) so interpolacijske točke, \\(m_i\\) tangente (odvodi po skupnem parametru \\(t\\)), \\(t_i\\) parametri točk in \\(Q_j\\) kontrolne točke Bézierjevega odseka.',
                '\\(P_i\\) are the interpolation points, \\(m_i\\) the tangents (derivatives with respect to the common parameter \\(t\\)), \\(t_i\\) the parameters of the points and \\(Q_j\\) the control points of the Bézier segment.',
            ),
            explanation: text(
                'Odsek je kubični Hermiteov polinom z lokalnima tangentama \\(h_i m_i\\), enak Bézierjevemu odseku s kontrolnimi točkami \\(Q_j\\). Pri enakomernih parametrih je \\(h_i=1\\) in so točki \\(P_i+\\tfrac13 m_i\\) ter \\(P_{i+1}-\\tfrac13 m_{i+1}\\); sicer lokalno tangento določa še \\(h_i\\).',
                'The segment is a cubic Hermite polynomial with the local tangents \\(h_i m_i\\), equal to the Bézier segment with the control points \\(Q_j\\). With uniform parameters \\(h_i=1\\) and the points are \\(P_i+\\tfrac13 m_i\\) and \\(P_{i+1}-\\tfrac13 m_{i+1}\\); otherwise \\(h_i\\) scales the local tangent too.',
            ),
        },
        {
            id: 'catmull-rom-tangent',
            latex: 'm_i=\\frac{P_{i+1}-P_{i-1}}{t_{i+1}-t_{i-1}},\\qquad m_i=\\tfrac12\\,(P_{i+1}-P_{i-1})\\ \\text{(uniform)}',
            notation: text(
                'V krajiščih velja enostranska razlika: \\(m_0=(P_1-P_0)/(t_1-t_0)\\). Napetost tangente le pomnoži.',
                'At the ends the one-sided difference is used: \\(m_0=(P_1-P_0)/(t_1-t_0)\\). The tension just multiplies the tangents.',
            ),
            explanation: text(
                'Tangenta v točki je vzporedna tetivi med sosednjima točkama. Zato na njen odsek vplivata le najbližji sosedi: premik notranje točke spremeni tangenti v obeh sosedih, sama točka pa se premakne, torej se spremenijo največ štirje odseki.',
                'The tangent at a point is parallel to the chord between its two neighbours. So only the nearest neighbours enter a segment: moving an interior point changes the tangents at both neighbours and moves the point itself, hence at most four segments change.',
            ),
        },
    ],
    workedExamples: [
        {
            id: 'hermite-midpoint-example',
            title: text('Sredina odseka od \\(P_1\\) do \\(P_2\\)', 'The middle of the segment from \\(P_1\\) to \\(P_2\\)'),
            calculationLatex: 'P\\!\\left(\\tfrac12\\right)=\\tfrac12(P_1+P_2)+\\tfrac18(m_1-m_2)=\\left(2,\\,\\tfrac52\\right)+\\tfrac18\\,(0,\\,\\tfrac52)',
            resultLatex: 'P\\!\\left(\\tfrac12\\right)=(2,\\;2{,}8125)',
            check: text(
                'Pri enakomernih parametrih ima Catmull-Romov zlepek na sredini odseka uteži \\(-\\tfrac1{16},\\tfrac9{16},\\tfrac9{16},-\\tfrac1{16}\\) za \\(P_0,\\dots,P_3\\), kar je ista točka \\((2;\\ 2{,}8125)\\) kot pri Lagrangeevi krivulji skozi iste štiri točke.',
                'With uniform parameters the Catmull-Rom spline has the weights \\(-\\tfrac1{16},\\tfrac9{16},\\tfrac9{16},-\\tfrac1{16}\\) for \\(P_0,\\dots,P_3\\) at the middle of the segment, which is the same point \\((2;\\ 2.8125)\\) as the Lagrange curve through the same four points.',
            ),
        },
    ],
    steps: [
        {
            id: 'hermite-predict-segment', order: 1,
            title: text('Dve točki in dve tangenti', 'Two points and two tangents'),
            purpose: text('Pred razkritjem napovedati obliko krivulje med dvema točkama z danima tangentama.', 'Predicting, before the reveal, the shape of the curve between two points with given tangents.'),
            explanation: text(
                'Graf je v Hermiteovem načinu: vsaka interpolacijska točka ima puščico tangente. Odsek od \\(P_1=(1,2)\\) do \\(P_2=(3,3)\\) izhaja iz \\(P_1\\) s tangento \\((1{,}5;\\ 1{,}5)\\) in prihaja v \\(P_2\\) s tangento \\((1{,}5;\\ -1)\\). Napovej: ali bo krivulja ob prihodu v \\(P_2\\) šla nad točko ali pod njo, preden se obrne? Potem opazuj odsek.',
                'The graph is in Hermite mode: every interpolation point has a tangent arrow. The segment from \\(P_1=(1,2)\\) to \\(P_2=(3,3)\\) leaves \\(P_1\\) with the tangent \\((1.5;\\ 1.5)\\) and arrives at \\(P_2\\) with the tangent \\((1.5;\\ -1)\\). Predict: will the curve arrive at \\(P_2\\) above the point or below it before it turns? Then watch the segment.',
            ),
            formulaIds: ['hermite-bezier'],
            frames: [frame('hermite-predict-segment-explanation', 'explanation'), frame('hermite-predict-segment-observation', 'observation')],
            observationPrompt: text('Pred razkritjem si zamisli odsek: kje je njegov najvišji del glede na \\(P_2\\)?', 'Before the reveal picture the segment: where is its highest part relative to \\(P_2\\)?'),
            expectedObservations: [text('Odsek gre skozi obe točki in se ob vsaki dotika svoje tangente; zadnja tangenta kaže navzdol, zato krivulja v \\(P_2\\) pada.', 'The segment passes through both points and touches its tangent at each; the last tangent points down, so the curve is falling at \\(P_2\\).')],
            scene: hermiteScene('hermite-predict-segment-start', 'hermite', {tangents: true, bezier: false}, 0,
                'Hermiteov način s tangentami \\((1;\\ 2)\\), \\((1{,}5;\\ 1{,}5)\\), \\((1{,}5;\\ -1)\\), \\((1;\\ -3)\\) v štirih točkah.',
                'Hermite mode with the tangents \\((1;\\ 2)\\), \\((1.5;\\ 1.5)\\), \\((1.5;\\ -1)\\), \\((1;\\ -3)\\) at the four points.'),
        },
        {
            id: 'hermite-handle', order: 2,
            title: text('Ročica tangente in Bézierjeva oblika', 'The tangent handle and the Bézier form'),
            purpose: text('Povleči ročico tangente in videti, da Hermiteov odsek isto krivuljo opiše z Bézierjevimi kontrolnimi točkami.', 'Dragging a tangent handle and seeing that the Hermite segment describes the same curve with Bézier control points.'),
            explanation: text(
                'Prikazani so kontrolni poligoni Bézierjevih odsekov. Pri enakomernih parametrih je \\(h_i=1\\), zato odsek od \\(P_1\\) do \\(P_2\\) dobi kontrolni točki \\(P_1+\\tfrac13 m_1=(1{,}5;\\ 2{,}5)\\) in \\(P_2-\\tfrac13 m_2=(2{,}5;\\ 3{,}333)\\). Splošna oblika je \\(P_i+\\tfrac13 h_i m_i\\); enaka zapisu \\(P_i+\\tfrac13 m_i\\) je le pri \\(h_i=1\\). Sredina odseka je \\(\\tfrac12(P_1+P_2)+\\tfrac18(m_1-m_2)=(2;\\ 2{,}8125)\\). Napovej, kaj se zgodi z odsekom, če ročico pri \\(P_1\\) podaljšaš na dvojno dolžino, in jo povleci.',
                'The control polygons of the Bézier segments are shown. With uniform parameters \\(h_i=1\\), so the segment from \\(P_1\\) to \\(P_2\\) has the control points \\(P_1+\\tfrac13 m_1=(1.5;\\ 2.5)\\) and \\(P_2-\\tfrac13 m_2=(2.5;\\ 3.333)\\). The general form is \\(P_i+\\tfrac13 h_i m_i\\); it equals \\(P_i+\\tfrac13 m_i\\) only when \\(h_i=1\\). The middle of the segment is \\(\\tfrac12(P_1+P_2)+\\tfrac18(m_1-m_2)=(2;\\ 2.8125)\\). Predict what happens to the segment if you stretch the handle at \\(P_1\\) to twice its length, then drag it.',
            ),
            formulaIds: ['hermite-bezier'], workedExampleId: 'hermite-midpoint-example',
            frames: [frame('hermite-handle-explanation', 'explanation'), frame('hermite-handle-calculation', 'calculation'), frame('hermite-handle-observation', 'observation')],
            observationPrompt: text('Povleci konico puščice tangente pri \\(P_1\\) in opazuj, kako se premikata kontrolni točki.', 'Drag the tip of the tangent arrow at \\(P_1\\) and watch how the control points move.'),
            expectedObservations: [text('Kontrolna točka sledi tangenti, krivulja pa ostane skozi obe točki; spremeni se le oblika odseka ob \\(P_1\\).', 'The control point follows the tangent while the curve still passes through both points; only the segments next to \\(P_1\\) change shape.')],
            scene: hermiteScene('hermite-handle-bezier', 'hermite', {tangents: true, bezier: true}, 0,
                'Hermiteov način z Bézierovima kontrolnima točkama \\((1{,}5;\\ 2{,}5)\\) in \\((2{,}5;\\ 3{,}333)\\) na odseku od \\(P_1\\) do \\(P_2\\).',
                'Hermite mode with the Bézier control points \\((1.5;\\ 2.5)\\) and \\((2.5;\\ 3.333)\\) on the segment from \\(P_1\\) to \\(P_2\\).'),
        },
        {
            id: 'hermite-catmull-rom', order: 3,
            title: text('Tangente iz sosednjih točk', 'Tangents from the neighbours'),
            purpose: text('Pred razkritjem napovedati tangento, ki da gladko verigo, in razkriti Catmull-Romovo izbiro.', 'Predicting, before the reveal, the tangent that makes a smooth chain, and revealing the Catmull-Rom choice.'),
            explanation: text(
                'Zdaj tangent ne izbiraš: graf je v načinu Catmull-Rom. Napovej, kakšna je tangenta v \\(P_1=(1,2)\\), če naj bo vzporedna tetivi med sosedama \\(P_0\\) in \\(P_2\\) in imeti polovično dolžino. Preveri: \\(m_1=\\tfrac12(P_2-P_0)=(1{,}5;\\ 1{,}5)\\), v \\(P_2\\) pa \\(m_2=\\tfrac12(P_3-P_1)=(1{,}5;\\ -1)\\). Tangenti v krajiščih sta enostranski: \\(m_0=P_1-P_0=(1;\\ 2)\\) in \\(m_3=P_3-P_2=(1;\\ -3)\\), ker nimata drugega soseda. Sredina odseka je spet \\((2;\\ 2{,}8125)\\), isto kot pri Lagrangeevi krivulji, ker so uteži pri enakomernih parametrih \\(-\\tfrac1{16},\\tfrac9{16},\\tfrac9{16},-\\tfrac1{16}\\).',
                'You no longer choose the tangents: the graph is in Catmull-Rom mode. Predict the tangent at \\(P_1=(1,2)\\) if it is to be parallel to the chord between the neighbours \\(P_0\\) and \\(P_2\\) and half as long. Check: \\(m_1=\\tfrac12(P_2-P_0)=(1.5;\\ 1.5)\\), and at \\(P_2\\) it is \\(m_2=\\tfrac12(P_3-P_1)=(1.5;\\ -1)\\). The tangents at the ends are one-sided: \\(m_0=P_1-P_0=(1;\\ 2)\\) and \\(m_3=P_3-P_2=(1;\\ -3)\\), since they have only one neighbour. The middle of the segment is again \\((2;\\ 2.8125)\\), the same as for the Lagrange curve, because with uniform parameters the weights are \\(-\\tfrac1{16},\\tfrac9{16},\\tfrac9{16},-\\tfrac1{16}\\).',
            ),
            formulaIds: ['catmull-rom-tangent'], workedExampleId: 'hermite-midpoint-example',
            frames: [frame('hermite-catmull-rom-explanation', 'explanation'), frame('hermite-catmull-rom-calculation', 'calculation'), frame('hermite-catmull-rom-observation', 'observation')],
            observationPrompt: text('Povleci \\(P_1\\) in opazuj, kako se obe sosednji tangenti prilagodita.', 'Drag \\(P_1\\) and watch how the neighbouring tangents adjust.'),
            expectedObservations: [text('Puščica v \\(P_1\\) je vedno vzporedna tetivi \\(P_0P_2\\); krivulja ostane gladka v vsaki točki.', 'The arrow at \\(P_1\\) is always parallel to the chord \\(P_0P_2\\); the curve stays smooth at every point.')],
            scene: hermiteScene('hermite-catmull-rom-start', 'catmull-rom', {tangents: true, bezier: false}, 0,
                'Catmull-Romov način, napetost \\(1\\); tangenta v \\(P_1\\) je \\((1{,}5;\\ 1{,}5)\\), v \\(P_2\\) je \\((1{,}5;\\ -1)\\).',
                'Catmull-Rom mode, tension \\(1\\); the tangent at \\(P_1\\) is \\((1.5;\\ 1.5)\\), at \\(P_2\\) it is \\((1.5;\\ -1)\\).'),
        },
        {
            id: 'hermite-locality', order: 4,
            title: text('Lokalnost', 'Locality'),
            purpose: text('Pred razkritjem napovedati, koliko odsekov spremeni premik ene točke.', 'Predicting, before the reveal, how many segments moving one point changes.'),
            explanation: text(
                'Točk je šest in odsekov pet. Napovej: koliko odsekov se spremeni, če povlečeš tretjo točko \\(P_2\\)? Za razliko od Lagrangeeve krivulje ne vse. Tangenti se spremenita v \\(P_1\\) in \\(P_3\\), točka \\(P_2\\) pa se premakne, zato se spremenijo štirje odseki, od \\(P_0\\) do \\(P_4\\); zadnji odsek od \\(P_4\\) do \\(P_5\\) ostane nespremenjen. Splošno: premik ene točke spremeni največ štiri odseke, ne dveh, ker se spremenijo tudi tangente obeh sosedov. Premik prve ali zadnje točke spremeni le dva odseka.',
                'There are six points and five segments. Predict: how many segments change if you drag the third point \\(P_2\\)? Unlike the Lagrange curve, not all of them. The tangents change at \\(P_1\\) and \\(P_3\\), and \\(P_2\\) itself moves, so four segments change, from \\(P_0\\) to \\(P_4\\); the last segment from \\(P_4\\) to \\(P_5\\) stays the same. In general moving one point changes at most four segments, not two, because the tangents of both neighbours change as well. Moving the first or the last point changes only two segments.',
            ),
            formulaIds: ['catmull-rom-tangent'],
            frames: [frame('hermite-locality-explanation', 'explanation'), frame('hermite-locality-observation', 'observation')],
            observationPrompt: text('Povleci \\(P_2\\) in preštej odseke, ki se premaknejo; nato povleci \\(P_5\\).', 'Drag \\(P_2\\) and count the segments that move; then drag \\(P_5\\).'),
            expectedObservations: [text('Pri \\(P_2\\) se premakne štiri od petih odsekov, pri \\(P_5\\) pa dva.', 'Four of the five segments move for \\(P_2\\) and two for \\(P_5\\).')],
            scene: hermiteScene('hermite-locality-six', 'catmull-rom', {tangents: true, bezier: false}, 2,
                'Šest točk, \\(P_4=(5,0)\\) in \\(P_5=(6,0)\\) sta dodani; Catmull-Romov način.',
                'Six points, \\(P_4=(5,0)\\) and \\(P_5=(6,0)\\) added; Catmull-Rom mode.'),
        },
        {
            id: 'hermite-c1-only', order: 5,
            title: text('Samo \\(C^1\\), ne \\(C^2\\)', 'Only \\(C^1\\), not \\(C^2\\)'),
            purpose: text('Pred razkritjem napovedati, ali se drugi odvod v točki ujema, in primerjati z globalnim kubičnim zlepkom.', 'Predicting, before the reveal, whether the second derivative matches at a point, and comparing with the global cubic spline.'),
            explanation: text(
                'Kubični zlepek iz poglavja o zlepkih je razreda \\(C^2\\), a globalen: ena točka vpliva na vse odseke. Catmull-Romov zlepek je lokalen, a je samo razreda \\(C^1\\). Napovej: ali sta drugi odvod levo in desno od \\(P_1\\) enaka? Pri enakomernih parametrih je levo \\((2;\\ -2)\\), desno \\((3;\\ 2)\\): prvi odvod se ujema, drugi ne. Tangente so v vseh točkah enake z obeh strani, zato ni vogalov, ukrivljenost pa se v točki skokovito spremeni.',
                'The cubic spline from the splines chapter is \\(C^2\\) but global: one point affects every segment. The Catmull-Rom spline is local but only \\(C^1\\). Predict: are the second derivatives to the left and right of \\(P_1\\) equal? With uniform parameters it is \\((2;\\ -2)\\) on the left and \\((3;\\ 2)\\) on the right: the first derivative matches, the second does not. The tangents agree from both sides at every point, so there are no corners, but the curvature jumps at a point.',
            ),
            formulaIds: ['catmull-rom-tangent', 'hermite-bezier'],
            frames: [frame('hermite-c1-only-explanation', 'explanation'), frame('hermite-c1-only-observation', 'observation')],
            observationPrompt: text('Poišči točko, v kateri se ukrivljenost krivulje najbolj skokovito spremeni.', 'Find a point where the curvature of the curve changes most abruptly.'),
            expectedObservations: [text('Krivulja nima vogalov, drugi odvod pa se v točkah na splošno razlikuje z obeh strani.', 'The curve has no corners, but the second derivative generally differs between the two sides of a point.')],
            scene: hermiteScene('hermite-c1-only-pieces', 'catmull-rom', {tangents: true, bezier: true}, 0,
                'Catmull-Romov način z Bézierovimi odseki; v \\(P_1\\) je drugi odvod levo \\((2;\\ -2)\\), desno \\((3;\\ 2)\\).',
                'Catmull-Rom mode with the Bézier pieces; at \\(P_1\\) the second derivative is \\((2;\\ -2)\\) on the left and \\((3;\\ 2)\\) on the right.'),
        },
        {
            id: 'hermite-explore', order: 6,
            title: text('Prosto raziskovanje', 'Free exploration'),
            purpose: text('Samostojno spreminjati napetost, pravilo parametrov in način ter primerjati krivulje.', 'Changing the tension, the parameter rule and the mode on your own and comparing the curves.'),
            explanation: text(
                'Štiri točke so spet na začetnem mestu. Premikaj točke, spreminjaj napetost, ki množi vse Catmull-Romove tangente (pri \\(0\\) krivulja teče po daljicah med točkami), in preklopi enakomerne parametre na parametre po dolžini tetiv. V Hermiteovem načinu preklop pravila preoblikuje lokalne tangente \\(h_i m_i\\) in zato spremeni obliko krivulje. Pri nekaterih razporeditvah točk lahko enakomerni parametri povzročijo prenihaj ali zanko; poskusi jo najti.',
                'The four points are back at their starting place. Move the points, change the tension, which multiplies all Catmull-Rom tangents (at \\(0\\) the curve runs along the segments between the points), and switch the uniform parameters to chord-length parameters. In Hermite mode a rule switch rescales the local tangents \\(h_i m_i\\) and therefore changes the shape of the curve. For some arrangements of the points uniform parameters can cause overshoot or a loop; try to find one.',
            ),
            formulaIds: ['catmull-rom-tangent', 'hermite-bezier'],
            frames: [frame('hermite-explore-explanation', 'explanation'), frame('hermite-explore-observation', 'observation')],
            observationPrompt: text('Poišči razporeditev točk, pri kateri enakomerni parametri dajo prenihaj, in preveri, ali parametri po tetivah to omilijo.', 'Find an arrangement of the points where uniform parameters overshoot, and check whether chord-length parameters tame it.'),
            expectedObservations: [text('Napetost spremeni dolžino tangent, pravilo parametrov pa čas, v katerem krivulja preteče odseke; oboje vpliva na obliko.', 'The tension changes the length of the tangents and the parameter rule the time the curve spends on each segment; both affect the shape.')],
            scene: hermiteScene('hermite-explore-start', 'catmull-rom', {tangents: true, bezier: false}, 0,
                'Štiri točke, Catmull-Romov način, napetost \\(1\\), enakomerni parametri; vse je prosto za raziskovanje.',
                'Four points, Catmull-Rom mode, tension \\(1\\), uniform parameters; everything is free to explore.'),
        },
    ],
    sources: [
        {id: 'farin-curves-hermite', citation: 'Farin, G. Curves and Surfaces for CAGD, 5th ed., chapters on cubic Hermite and Bézier forms.'},
        {id: 'catmull-rom-1974', citation: 'Catmull, E. and Rom, R. A class of local interpolating splines. In Computer Aided Geometric Design, Academic Press (1974).'},
        {
            id: 'bezeg-hermite-implementation',
            citation: 'Bezeg source: src/analysis/hermite.ts, src/graphs/curves/hermite/hermiteModel.ts and HermiteGraph.tsx.',
            implementationCorrespondence: 'All values come from the Hermite kernel; a lesson scene sets the mode, parameter rule, tension, overlays and extra points with the hermite action.',
        },
    ],
    edgeCases: [
        text('Dve zaporedni točki z enakim položajem (ničelna tetiva) graf zavrne in to izpiše, ker parametra po tetivah ne bi bila različna.', 'Two consecutive points at the same position (a zero chord) are refused by the graph with a message, since chord-length parameters would not be distinct.'),
        text('Točk je lahko največ \\(12\\); dodajanje pri največjem številu ne naredi ničesar.', 'There can be at most \\(12\\) points; adding one at the maximum does nothing.'),
    ],
    unresolvedQuestions: [],
};

export const interpolationGuidedLessons: readonly GuidedLesson[] = [lagrangeLesson, hermiteLesson];
