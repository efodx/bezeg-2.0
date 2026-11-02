/**
 * Guided lessons of the Interpolation and approximation family (docs/specs/interpolation-approximation-lessons.md): I1,
 * Lagrange interpolation versus Bézier approximation, I2, the Runge phenomenon and Chebyshev nodes, I3, Hermite and Catmull-Rom curves, and I5, Chaikin and four-point subdivision. The text is a one-shot draft (docs/specs/new-lesson-families.md,
 * "One-shot lesson text"): every value it quotes is the readout of the scene it belongs to, and
 * `interpolationGuidedLessons.test.ts` checks that against the real graph and the kernel in `src/analysis/interpolation.ts`.
 * I1 scenes use the `interpolation` (`set-rule`, `set-overlay`, `add-point`) and `parameter` (`t`, the shared position s) actions;
 * I2 scenes use the `runge` action (`set-function`, `set-degree`, `set-rule`, `set-overlay`);
 * I3 scenes use the `hermite` action (`set-mode`, `set-rule`, `set-tension`, `set-overlay`, `add-point`);
 * I5 scenes use the `subdivision` action (`set-rule`, `set-closed`, `set-overlay`) and the `animation` action `next-step` of `interp-subdivision-rounds`.
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

/**
 * A subdivision scene from the default open polygon (0,0), (1,2), (3,3), (4,0): the rule, whether the polygon is closed, the limit overlay,
 * then `rounds` Next-step commands. Switching the rule returns to round 0 and every one of these actions pauses playback, so a scene never
 * starts playing.
 */
const subdivisionScene = (
    id: string, rule: 'chaikin' | 'four-point', closed: boolean, limit: boolean, rounds: number, sl: string, en: string,
): LessonScene => {
    const actions: LessonAction[] = [
        {kind: 'prepared-scene', sceneId: id, source: 'demonstration-default'},
        {kind: 'subdivision', operation: 'set-rule', rule},
        {kind: 'subdivision', operation: 'set-closed', closed},
        {kind: 'subdivision', operation: 'set-overlay', overlay: 'limit', visible: limit},
        ...Array.from({length: rounds}, () => ({kind: 'animation', animationId: 'interp-subdivision-rounds', command: 'next-step'}) as const),
    ];
    return {id, basedOn: 'demonstration-default', actions, expectedState: text(sl, en)};
};

const subdivisionLesson: GuidedLesson = {
    demonstrationId: 'interp-subdivision',
    title: text('Subdivizijske krivulje: Chaikinovo in štiritočkovno pravilo', 'Subdivision curves: the Chaikin and four-point rules'),
    summary: text(
        'Subdivizijska krivulja nastane z večkratnim ponavljanjem lokalnega pravila na poligonu. Chaikinovo pravilo odreže oglišča in da v limiti kvadratni B-zlepek, ki le približa točke. Štiritočkovno pravilo ohrani vsa stara oglišča in vstavi nova, zato limita poteka skozi vse začetne točke.',
        'A subdivision curve arises by repeating a local rule on a polygon. The Chaikin rule cuts the corners off and its limit is the quadratic B-spline, which only approximates the points. The four-point rule keeps every old vertex and inserts new ones, so its limit passes through all the starting points.',
    ),
    prerequisites: [
        text('Potrebno je poznavanje subdivizije Bézierjeve krivulje iz poglavja o Bézierjevih krivuljah.', 'Assumes the subdivision of a Bézier curve from the Bézier curves chapter.'),
        text('Priporočena sta lekciji o enakomernem kvadratnem B-zlepku in o Hermiteovi interpolaciji.', 'The lessons on the uniform quadratic B-spline and on Hermite interpolation are recommended.'),
    ],
    learningGoals: [
        text('Napoveš, kaj Chaikinovo in štiritočkovno pravilo naredita s poligonom, in izračunaš nova oglišča prvega koraka.', 'Predict what the Chaikin and four-point rules do to a polygon and compute the new vertices of the first step.'),
        text('Razložiš, zakaj je limita Chaikinovega pravila enakomerni kvadratni B-zlepek razreda \\(C^1\\).', 'Explain why the limit of the Chaikin rule is the uniform quadratic B-spline, of class \\(C^1\\).'),
        text('Primerjaš pravili: aproksimacija proti interpolaciji, ohranitev starih oglišč in prenihaj.', 'Compare the rules: approximation versus interpolation, keeping the old vertices, and overshoot.'),
    ],
    formulaBlocks: [
        {
            id: 'chaikin-rule',
            latex: 'Q_{2i}=\\tfrac34P_i+\\tfrac14P_{i+1},\\qquad Q_{2i+1}=\\tfrac14P_i+\\tfrac34P_{i+1}',
            notation: text(
                '\\(P_i\\) so oglišča poligona, \\(Q_j\\) oglišča naslednjega koraka. Vsaka stranica \\(P_iP_{i+1}\\) da dve novi oglišči, ki jo razdelita na četrtine.',
                '\\(P_i\\) are the vertices of the polygon and \\(Q_j\\) the vertices of the next step. Every edge \\(P_iP_{i+1}\\) gives two new vertices that cut it in quarters.',
            ),
            explanation: text(
                'Zaprt poligon z \\(n\\) oglišči ima po \\(k\\) korakih \\(2^k n\\) oglišč. Odprt poligon obdrži prvo in zadnje oglišče, zato ima \\(2(n-1)+2=2n\\) oglišč po koraku in tudi \\(2^k n\\) po \\(k\\) korakih.',
                'A closed polygon with \\(n\\) vertices has \\(2^k n\\) vertices after \\(k\\) steps. An open polygon keeps its first and last vertex, so it has \\(2(n-1)+2=2n\\) vertices after one step and also \\(2^k n\\) after \\(k\\) steps.',
            ),
        },
        {
            id: 'four-point-rule',
            latex: 'Q_{2i}=P_i,\\qquad Q_{2i+1}=\\frac{-P_{i-1}+9P_i+9P_{i+1}-P_{i+2}}{16}=\\left(\\tfrac12+w\\right)(P_i+P_{i+1})-w\\,(P_{i-1}+P_{i+2}),\\quad w=\\tfrac1{16}',
            notation: text(
                'Staro oglišče \\(P_i\\) ostane, na vsaki stranici \\(P_iP_{i+1}\\) pa se vstavi novo oglišče \\(Q_{2i+1}\\), ki ga določijo štiri zaporedna oglišča.',
                'The old vertex \\(P_i\\) stays and on every edge \\(P_iP_{i+1}\\) a new vertex \\(Q_{2i+1}\\) is inserted, determined by four consecutive vertices.',
            ),
            explanation: text(
                'Pravilo potrebuje soseda na vsaki strani stranice. Pri odprtem poligonu ju prva in zadnja stranica nimata, zato graf na ti dve stranici vstavi kar razpolovišče stranice; vsa stara oglišča ostanejo. Zaprt poligon ima po \\(k\\) korakih \\(2^k n\\) oglišč, odprt pa \\(2^k(n-1)+1\\).',
                'The rule needs a neighbour on each side of the edge. In an open polygon the first and last edge lack one, so the graph inserts the plain midpoint of the edge on those two edges; every old vertex stays. A closed polygon has \\(2^k n\\) vertices after \\(k\\) steps and an open one \\(2^k(n-1)+1\\).',
            ),
        },
    ],
    workedExamples: [
        {
            id: 'chaikin-b-spline-example',
            title: text('Sredina Chaikinovih točk in kvadratni B-zlepek', 'The midpoint of the Chaikin points and the quadratic B-spline'),
            calculationLatex: '\\tfrac12\\left[\\left(\\tfrac14P_0+\\tfrac34P_1\\right)+\\left(\\tfrac34P_1+\\tfrac14P_2\\right)\\right]=\\tfrac18P_0+\\tfrac34P_1+\\tfrac18P_2',
            resultLatex: '\\left(1{,}125,\\;1{,}875\\right)',
            check: text(
                'Za \\(P_0=(0,0)\\), \\(P_1=(1,2)\\), \\(P_2=(3,3)\\) sta Chaikinovi točki \\((0{,}75;\\ 1{,}5)\\) in \\((1{,}5;\\ 2{,}25)\\), njuna sredina pa je \\((1{,}125;\\ 1{,}875)\\). To je točka enakomernega kvadratnega B-zlepka s kontrolnimi točkami \\(P_0,P_1,P_2\\) pri parametru \\(\\tfrac12\\).',
                'For \\(P_0=(0,0)\\), \\(P_1=(1,2)\\), \\(P_2=(3,3)\\) the Chaikin points are \\((0.75;\\ 1.5)\\) and \\((1.5;\\ 2.25)\\) and their midpoint is \\((1.125;\\ 1.875)\\). This is the point of the uniform quadratic B-spline with control points \\(P_0,P_1,P_2\\) at the parameter \\(\\tfrac12\\).',
            ),
        },
    ],
    steps: [
        {
            id: 'subdivision-predict', order: 1,
            title: text('Odrezani vogali', 'Corners cut off'),
            purpose: text('Pred razkritjem napovedati obliko, proti kateri se Chaikinovo pravilo približuje.', 'Predicting, before the reveal, the shape the Chaikin rule approaches.'),
            explanation: text(
                'Graf kaže odprt poligon \\((0,0)\\), \\((1,2)\\), \\((3,3)\\), \\((4,0)\\) in Chaikinovo pravilo; prikazan je začetni poligon, nobenega koraka subdivizije še ni. Pravilo vsako stranico nadomesti z dvema točkama, ki ležita na četrtini in treh četrtinah stranice, in prvo ter zadnjo točko obdrži. Napovej: kakšna bo oblika po zelo veliko korakih? Bo imela vogale, bo šla skozi vse štiri točke?',
                'The graph shows the open polygon \\((0,0)\\), \\((1,2)\\), \\((3,3)\\), \\((4,0)\\) and the Chaikin rule; the starting polygon is shown and no subdivision step has been taken yet. The rule replaces every edge by two points at one quarter and three quarters of the edge and keeps the first and last point. Predict: what shape will it have after very many steps? Will it have corners, will it pass through all four points?',
            ),
            formulaIds: ['chaikin-rule'],
            frames: [frame('subdivision-predict-explanation', 'explanation'), frame('subdivision-predict-observation', 'observation')],
            observationPrompt: text('Pred razkritjem si zamisli, kam se premakne vogal pri \\(P_1\\), ko ga rezemo znova in znova.', 'Before the reveal imagine where the corner at \\(P_1\\) goes when it is cut again and again.'),
            expectedObservations: [text('Poligon ima štiri oglišča in tri stranice; vogali v \\(P_1\\) in \\(P_2\\) bodo odrezani.', 'The polygon has four vertices and three edges; the corners at \\(P_1\\) and \\(P_2\\) will be cut off.')],
            scene: subdivisionScene('subdivision-predict-start', 'chaikin', false, false, 0,
                'Chaikinovo pravilo, odprt poligon, korak \\(0\\) od \\(6\\), \\(4\\) oglišča; predvajanje je ustavljeno.',
                'The Chaikin rule, open polygon, step \\(0\\) of \\(6\\), \\(4\\) vertices; playback is stopped.'),
        },
        {
            id: 'subdivision-chaikin-rounds', order: 2,
            title: text('Koraki Chaikinovega pravila', 'Steps of the Chaikin rule'),
            purpose: text('Pred razkritjem napovedati novi točki prvega koraka in število oglišč v naslednjih korakih.', 'Predicting, before the reveal, the two new points of the first step and the vertex counts of the next steps.'),
            explanation: text(
                'Prikazan je prvi korak. Napovej: kje sta novi točki na stranici \\(P_1P_2\\) od \\((1,2)\\) do \\((3,3)\\)? Preveri: \\(\\tfrac34P_1+\\tfrac14P_2=(1{,}5;\\ 2{,}25)\\) in \\(\\tfrac14P_1+\\tfrac34P_2=(2{,}5;\\ 2{,}75)\\). Število oglišč se podvoji: \\(4\\), \\(8\\), \\(16\\), \\(32\\). Pritiskaj Naslednji korak ali Predvajaj; korakov je največ \\(6\\), nato sta oba gumba končana.',
                'The first step is shown. Predict: where are the two new points on the edge \\(P_1P_2\\) from \\((1,2)\\) to \\((3,3)\\)? Check: \\(\\tfrac34P_1+\\tfrac14P_2=(1.5;\\ 2.25)\\) and \\(\\tfrac14P_1+\\tfrac34P_2=(2.5;\\ 2.75)\\). The number of vertices doubles: \\(4\\), \\(8\\), \\(16\\), \\(32\\). Press Next step or Play; there are at most \\(6\\) steps, after which both buttons are finished.',
            ),
            formulaIds: ['chaikin-rule'],
            frames: [frame('subdivision-chaikin-rounds-explanation', 'explanation'), frame('subdivision-chaikin-rounds-observation', 'observation')],
            animation: {animationId: 'interp-subdivision-rounds'},
            observationPrompt: text('Pritisni Naslednji korak in pri vsakem koraku preberi število oglišč; nato poskusi Predvajaj.', 'Press Next step and read the number of vertices at each step; then try Play.'),
            expectedObservations: [text('Število oglišč se pri vsakem koraku podvoji, poligon pa postaja vse bolj gladek in ne gre več skozi \\(P_1\\) in \\(P_2\\).', 'The number of vertices doubles at each step and the polygon gets smoother; it no longer passes through \\(P_1\\) and \\(P_2\\).')],
            scene: subdivisionScene('subdivision-chaikin-step1', 'chaikin', false, false, 1,
                'Chaikinovo pravilo, korak \\(1\\) od \\(6\\), \\(8\\) oglišč; stranico \\(P_1P_2\\) nadomestita točki \\((1{,}5;\\ 2{,}25)\\) in \\((2{,}5;\\ 2{,}75)\\).',
                'The Chaikin rule, step \\(1\\) of \\(6\\), \\(8\\) vertices; the edge \\(P_1P_2\\) is replaced by the points \\((1.5;\\ 2.25)\\) and \\((2.5;\\ 2.75)\\).'),
        },
        {
            id: 'subdivision-limit', order: 3,
            title: text('Limita je kvadratni B-zlepek', 'The limit is the quadratic B-spline'),
            purpose: text('Pred razkritjem napovedati, na kateri krivulji ležijo Chaikinove točke, in preveriti sredino odseka.', 'Predicting, before the reveal, which curve the Chaikin points lie on, and checking the middle of a piece.'),
            explanation: text(
                'Prikazana je limitna krivulja. Napovej: ali leže točke koraka na njej ali zunaj nje? Chaikinovi točki \\(\\tfrac14P_0+\\tfrac34P_1=(0{,}75;\\ 1{,}5)\\) in \\(\\tfrac34P_1+\\tfrac14P_2=(1{,}5;\\ 2{,}25)\\) imata sredino \\((1{,}125;\\ 1{,}875)\\), kar je enako \\(\\tfrac18P_0+\\tfrac34P_1+\\tfrac18P_2\\), točki enakomernega kvadratnega B-zlepka pri parametru \\(\\tfrac12\\). Limita Chaikinovega pravila je zato ta B-zlepek in je razreda \\(C^1\\). Pri odprtem poligonu ima tudi ravna odseka od \\(P_0\\) do razpolovišča stranice \\(P_0P_1\\) in od razpolovišča zadnje stranice do zadnje točke.',
                'The limit curve is shown. Predict: do the points of the step lie on it or outside it? The Chaikin points \\(\\tfrac14P_0+\\tfrac34P_1=(0.75;\\ 1.5)\\) and \\(\\tfrac34P_1+\\tfrac14P_2=(1.5;\\ 2.25)\\) have the midpoint \\((1.125;\\ 1.875)\\), which equals \\(\\tfrac18P_0+\\tfrac34P_1+\\tfrac18P_2\\), the point of the uniform quadratic B-spline at the parameter \\(\\tfrac12\\). The limit of the Chaikin rule is therefore this B-spline and is of class \\(C^1\\). For an open polygon it also has straight pieces from \\(P_0\\) to the midpoint of the edge \\(P_0P_1\\) and from the midpoint of the last edge to the last point.',
            ),
            formulaIds: ['chaikin-rule'], workedExampleId: 'chaikin-b-spline-example',
            frames: [frame('subdivision-limit-explanation', 'explanation'), frame('subdivision-limit-calculation', 'calculation'), frame('subdivision-limit-observation', 'observation')],
            observationPrompt: text('Pritisni Naslednji korak in opazuj, kako se oglišča približujejo prikazani limitni krivulji.', 'Press Next step and watch the vertices approach the limit curve shown.'),
            expectedObservations: [text('Oglišča vsakega koraka ležijo vse bližje limitni krivulji; krivulja nima vogalov.', 'The vertices of each step lie closer and closer to the limit curve; the curve has no corners.')],
            scene: subdivisionScene('subdivision-limit-overlay', 'chaikin', false, true, 2,
                'Chaikinovo pravilo, korak \\(2\\) od \\(6\\), \\(16\\) oglišč, prikazana limitna krivulja (kvadratni B-zlepek).',
                'The Chaikin rule, step \\(2\\) of \\(6\\), \\(16\\) vertices, the limit curve (quadratic B-spline) shown.'),
        },
        {
            id: 'subdivision-four-point', order: 4,
            title: text('Štiritočkovno pravilo ohrani točke', 'The four-point rule keeps the points'),
            purpose: text('Pred razkritjem napovedati, ali se stara oglišča premaknejo, in razkriti, da ostanejo.', 'Predicting, before the reveal, whether the old vertices move, and revealing that they stay.'),
            explanation: text(
                'Zdaj je izbrano štiritočkovno pravilo na istem poligonu, korak \\(0\\). Napovej: ali se bodo stara oglišča po koraku premaknila, kot pri Chaikinovem pravilu? Preveri na stranici \\(P_1P_2\\): vstavljena točka je \\(\\tfrac{1}{16}(-P_0+9P_1+9P_2-P_3)=(2;\\ 2{,}8125)\\). Na prvi in zadnji stranici pravilo nima soseda na eni strani, zato graf vstavi razpolovišči \\((0{,}5;\\ 1)\\) in \\((3{,}5;\\ 1{,}5)\\). Po prvem koraku je oglišč \\(7\\), vsa štiri stara so med njimi.',
                'The four-point rule is now selected on the same polygon, step \\(0\\). Predict: will the old vertices move after a step, as with the Chaikin rule? Check on the edge \\(P_1P_2\\): the inserted point is \\(\\tfrac{1}{16}(-P_0+9P_1+9P_2-P_3)=(2;\\ 2.8125)\\). On the first and last edge the rule lacks a neighbour on one side, so the graph inserts the midpoints \\((0.5;\\ 1)\\) and \\((3.5;\\ 1.5)\\). After the first step there are \\(7\\) vertices and all four old ones are among them.',
            ),
            formulaIds: ['four-point-rule'],
            frames: [frame('subdivision-four-point-explanation', 'explanation'), frame('subdivision-four-point-observation', 'observation')],
            animation: {animationId: 'interp-subdivision-rounds'},
            observationPrompt: text('Pritisni Naslednji korak in preveri, da so \\(P_0,\\dots,P_3\\) še vedno med oglišči.', 'Press Next step and check that \\(P_0,\\dots,P_3\\) are still among the vertices.'),
            expectedObservations: [text('Stara oglišča se ne premaknejo; vstavljena točka med \\(P_1\\) in \\(P_2\\) je \\((2;\\ 2{,}8125)\\), krivulja pa je v limiti skozi vse začetne točke.', 'The old vertices do not move; the point inserted between \\(P_1\\) and \\(P_2\\) is \\((2;\\ 2.8125)\\) and the limit curve passes through all the starting points.')],
            scene: subdivisionScene('subdivision-four-point-start', 'four-point', false, false, 0,
                'Štiritočkovno pravilo, odprt poligon, korak \\(0\\) od \\(6\\), \\(4\\) oglišča.',
                'The four-point rule, open polygon, step \\(0\\) of \\(6\\), \\(4\\) vertices.'),
        },
        {
            id: 'subdivision-compare', order: 5,
            title: text('Gladkost in prenihaj', 'Smoothness and overshoot'),
            purpose: text('Pred razkritjem napovedati, katero pravilo lahko zapusti ovojnico točk, in primerjati gladkost.', 'Predicting, before the reveal, which rule can leave the hull of the points, and comparing smoothness.'),
            explanation: text(
                'Prikazan je drugi korak štiritočkovnega pravila, \\(13\\) oglišč. Napovej: katero od obeh pravil lahko vstavi točko zunaj konveksne ovojnice začetnih točk? Vsaka Chaikinova točka je konveksna kombinacija dveh sosednjih oglišč, zato ovojnice nikoli ne zapusti. Pri štiritočkovnem pravilu sta uteži \\(-\\tfrac1{16}\\) negativni, zato lahko pride do prenihaja: če so \\(P_0,P_1,P_2\\) na premici in \\(P_3\\) nad njo, pade vstavljena točka med \\(P_1\\) in \\(P_2\\) pod to premico. Limita Chaikinovega pravila je razreda \\(C^1\\). Za štiritočkovno pravilo z \\(w=\\tfrac1{16}\\) je limita razreda \\(C^1\\) (Dyn, Gregory in Levin, CAGD 4, 1987); več kot \\(C^1\\) tu ne trdimo.',
                'The second step of the four-point rule is shown, \\(13\\) vertices. Predict: which of the two rules can insert a point outside the convex hull of the starting points? Every Chaikin point is a convex combination of two neighbouring vertices, so it never leaves the hull. In the four-point rule the weights \\(-\\tfrac1{16}\\) are negative, so overshoot can happen: if \\(P_0,P_1,P_2\\) are on a line and \\(P_3\\) is above it, the point inserted between \\(P_1\\) and \\(P_2\\) falls below that line. The limit of the Chaikin rule is of class \\(C^1\\). For the four-point rule with \\(w=\\tfrac1{16}\\), the limit is of class \\(C^1\\) (Dyn, Gregory and Levin, CAGD 4, 1987); we claim no more than \\(C^1\\) here.',
            ),
            formulaIds: ['four-point-rule', 'chaikin-rule'],
            frames: [frame('subdivision-compare-explanation', 'explanation'), frame('subdivision-compare-observation', 'observation')],
            observationPrompt: text('Povleci \\(P_3\\) nad premico skozi \\(P_0,P_1,P_2\\) in primerjaj obe pravili.', 'Drag \\(P_3\\) above the line through \\(P_0,P_1,P_2\\) and compare the two rules.'),
            expectedObservations: [text('Chaikinova krivulja ostane znotraj ovojnice točk in jih zgladi; štiritočkovna gre skozi vse točke, a lahko zaniha čez ovojnico.', 'The Chaikin curve stays inside the hull of the points and smooths them; the four-point curve passes through all the points but can swing outside the hull.')],
            scene: subdivisionScene('subdivision-compare-four-point', 'four-point', false, false, 2,
                'Štiritočkovno pravilo, korak \\(2\\) od \\(6\\), \\(13\\) oglišč.',
                'The four-point rule, step \\(2\\) of \\(6\\), \\(13\\) vertices.'),
        },
        {
            id: 'subdivision-explore', order: 6,
            title: text('Prosto raziskovanje', 'Free exploration'),
            purpose: text('Samostojno raziskovati sklenjen poligon in obe pravili.', 'Exploring a closed polygon and both rules on your own.'),
            explanation: text(
                'Poligon je zdaj sklenjen, Chaikinovo pravilo, korak \\(3\\) od \\(6\\). Sklenjen poligon z \\(n=4\\) oglišči ima po \\(k\\) korakih \\(2^k n\\) oglišč, zdaj \\(32\\), pri obeh pravilih. Premikaj točke, dodajaj in odstranjuj jih (sklenjen poligon jih potrebuje vsaj \\(3\\)), preklapljaj pravilo, odprtost in limitno krivuljo ter predvajaj do največ \\(6\\) korakov. Ponastavi poligon vrne prvotne točke in korak \\(0\\).',
                'The polygon is now closed, the Chaikin rule, step \\(3\\) of \\(6\\). A closed polygon with \\(n=4\\) vertices has \\(2^k n\\) vertices after \\(k\\) steps, now \\(32\\), for both rules. Move the points, add and remove them (a closed polygon needs at least \\(3\\)), switch the rule, the open or closed polygon and the limit curve, and play up to \\(6\\) steps. Reset polygon returns the original points and step \\(0\\).',
            ),
            formulaIds: ['chaikin-rule', 'four-point-rule'],
            frames: [frame('subdivision-explore-explanation', 'explanation'), frame('subdivision-explore-observation', 'observation')],
            animation: {animationId: 'interp-subdivision-rounds'},
            observationPrompt: text('Poišči poligon, pri katerem štiritočkovno pravilo očitno zaniha čez ovojnico, Chaikinovo pa ne.', 'Find a polygon where the four-point rule visibly swings outside the hull and the Chaikin rule does not.'),
            expectedObservations: [text('Pri sklenjenem poligonu ni krajišč, zato obe pravili povsod uporabita isto pravilo in imata \\(2^k n\\) oglišč.', 'A closed polygon has no ends, so both rules apply the same formula everywhere and have \\(2^k n\\) vertices.')],
            scene: subdivisionScene('subdivision-explore-closed', 'chaikin', true, false, 3,
                'Sklenjen poligon z \\(4\\) točkami, Chaikinovo pravilo, korak \\(3\\) od \\(6\\), \\(32\\) oglišč; vse je prosto za raziskovanje.',
                'A closed polygon with \\(4\\) points, the Chaikin rule, step \\(3\\) of \\(6\\), \\(32\\) vertices; everything is free to explore.'),
        },
    ],
    sources: [
        {id: 'chaikin-1974', citation: 'Chaikin, G. M. An algorithm for high-speed curve generation. Computer Graphics and Image Processing 3 (1974) 346-349.'},
        {id: 'riesenfeld-1975', citation: 'Riesenfeld, R. F. On Chaikin\'s algorithm. Computer Graphics and Image Processing 4 (1975) 304-310.'},
        {id: 'dyn-gregory-levin-1987', citation: 'Dyn, N., Gregory, J. A. and Levin, D. A 4-point interpolatory subdivision scheme for curve design. Computer Aided Geometric Design 4 (1987) 257-268.'},
        {
            id: 'bezeg-subdivision-implementation',
            citation: 'Bezeg source: src/analysis/subdivision.ts, src/bezeg/impl/curve/bspline/uniform.ts and src/graphs/curves/subdivisionCurves/.',
            implementationCorrespondence: 'The Chaikin step and the quadratic B-spline are the kernels of the B-spline family; the four-point step and the round cap are in subdivision.ts. A scene sets the rule, the closed flag, the limit overlay and the steps with the subdivision and animation actions.',
        },
    ],
    edgeCases: [
        text('Največ \\(6\\) korakov subdivizije; po šestem sta Naslednji korak in Predvajaj končana, Ponastavi poligon začne znova.', 'There are at most \\(6\\) subdivision steps; after the sixth, Next step and Play are finished and Reset polygon starts over.'),
        text('Sklenjen poligon potrebuje vsaj \\(3\\) točke; graf zavrne zapiranje ali odstranitev, ki bi to kršila, in to izpiše.', 'A closed polygon needs at least \\(3\\) points; the graph refuses closing or removing a point that would break this and says so.'),
    ],
    unresolvedQuestions: [],
};

/**
 * A scene of the Runge lesson from the default model (the Runge function, n = 10, equispaced nodes, error curve shown, no semicircle): the
 * function, the degree, the node rule and the two display switches. Every action pauses nothing and runs synchronously.
 */
const rungeScene = (
    id: string, degree: number, rule: 'equispaced' | 'chebyshev', error: boolean, semicircle: boolean, sl: string, en: string,
    functionId: 'runge' | 'abs' | 'sine' = 'runge',
): LessonScene => {
    const actions: LessonAction[] = [
        {kind: 'prepared-scene', sceneId: id, source: 'demonstration-default'},
        {kind: 'runge', operation: 'set-function', function: functionId},
        {kind: 'runge', operation: 'set-degree', value: degree},
        {kind: 'runge', operation: 'set-rule', rule},
        {kind: 'runge', operation: 'set-overlay', overlay: 'error', visible: error},
        {kind: 'runge', operation: 'set-overlay', overlay: 'semicircle', visible: semicircle},
    ];
    return {id, basedOn: 'demonstration-default', actions, expectedState: text(sl, en)};
};

const rungeLesson: GuidedLesson = {
    demonstrationId: 'interp-runge',
    title: text('Rungejev pojav in Čebiševe točke', 'The Runge phenomenon and Chebyshev nodes'),
    summary: text(
        'Več enakomerno razporejenih interpolacijskih točk ne da vedno boljšega interpolacijskega polinoma: pri funkciji \\(f(x)=\\frac1{1+25x^2}\\) napaka ob krajiščih intervala z višanjem stopnje raste. Čebiševe točke so ob krajiščih gostejše in pri isti funkciji napako zmanjšajo. To pokažemo za to funkcijo, ne za vsako.',
        'More equally spaced interpolation nodes do not always give a better interpolation polynomial: for \\(f(x)=\\frac1{1+25x^2}\\) the error near the ends of the interval grows as the degree is raised. Chebyshev nodes are denser near the ends and reduce the error for the same function. This is shown for this function, not for every function.',
    ),
    prerequisites: [
        text('Potrebna je lekcija o Taylorjevem polinomu iz poglavja o analizi: večja stopnja polinoma ne pomeni nujno manjše napake.', 'Assumes the Taylor polynomial lesson from the analysis chapter: a higher degree does not necessarily mean a smaller error.'),
        text('Potrebna je lekcija o Lagrangeevi interpolaciji (Skozi točke ali blizu njih): interpolacijski polinom gre skozi vse točke.', 'Assumes the Lagrange interpolation lesson (Through the points or near them): the interpolation polynomial passes through every point.'),
    ],
    learningGoals: [
        text('Napoveš, kaj se zgodi z napako interpolacijskega polinoma, ko pri enakomerno razporejenih točkah višaš stopnjo, in ugotoviš, kje je napaka največja.', 'Predict what happens to the error of the interpolation polynomial when you raise the degree with equally spaced nodes, and find where the error is largest.'),
        text('Razložiš, da Čebiševe točke najmanjšajo največjo vrednost vozliščnega polinoma, ne napake pri vsaki stopnji.', 'Explain that Chebyshev nodes minimise the maximum of the node polynomial, not the error at every degree.'),
        text('Ločiš, kaj dokazujejo številke na mreži (en primer, končno število stopenj) in kaj ne (divergenco za vsako funkcijo, pravo največjo napako).', 'Tell what the numbers on the grid prove (one example, finitely many degrees) and what they do not (divergence for every function, the true maximum error).'),
    ],
    formulaBlocks: [
        {
            id: 'node-polynomial',
            latex: 'f(x)-p(x)=\\frac{f^{(n+1)}(\\xi)}{(n+1)!}\\,\\omega(x),\\qquad \\omega(x)=\\prod_{j=0}^{n}(x-x_j),\\qquad x_j=\\cos\\frac{(2j+1)\\pi}{2(n+1)}',
            notation: text(
                '\\(p\\) je interpolacijski polinom stopnje \\(n\\) skozi \\(n+1\\) točk \\(x_j\\), \\(\\omega\\) je vozliščni polinom, \\(\\xi\\) neka točka intervala. Zadnji izraz so Čebiševe točke prve vrste.',
                '\\(p\\) is the interpolation polynomial of degree \\(n\\) through the \\(n+1\\) nodes \\(x_j\\), \\(\\omega\\) is the node polynomial and \\(\\xi\\) some point of the interval. The last expression gives the Chebyshev nodes of the first kind.',
            ),
            explanation: text(
                'Napaka je produkt dveh delov: odvoda \\(f^{(n+1)}\\), ki ga točke ne spremenijo, in vozliščnega polinoma \\(\\omega\\), ki ga določajo točke. Čebiševe točke prve vrste najmanjšajo \\(\\max|\\omega|\\) na \\([-1,1]\\); ta največja vrednost je \\(2^{-n}\\). To ne pomeni, da je napaka pri vsaki stopnji najmanjša, saj je odvod \\(f^{(n+1)}\\) tudi del napake.',
                'The error is a product of two parts: the derivative \\(f^{(n+1)}\\), which the nodes do not change, and the node polynomial \\(\\omega\\), which the nodes determine. The Chebyshev nodes of the first kind minimise \\(\\max|\\omega|\\) on \\([-1,1]\\); that maximum is \\(2^{-n}\\). This does not mean the error is smallest at every degree, since the derivative \\(f^{(n+1)}\\) is also part of the error.',
            ),
        },
    ],
    workedExamples: [],
    steps: [
        {
            id: 'runge-predict', order: 1,
            title: text('Več točk, boljši polinom?', 'More nodes, a better polynomial?'),
            purpose: text('Pred razkritjem napovedati, kako se napaka spreminja z višanjem stopnje.', 'Predicting, before the reveal, how the error changes as the degree grows.'),
            explanation: text(
                'Graf kaže funkcijo \\(f(x)=\\frac1{1+25x^2}\\) (bleda krivulja) in njen interpolacijski polinom \\(p\\) stopnje \\(n=6\\) skozi \\(n+1=7\\) enakomerno razporejenih točk na \\([-1,1]\\). Krivulja napake je skrita. Napovej: ko stopnjo višamo, torej dodajamo točke, ali se bo polinom \\(p\\) vedno bolj prilegal funkciji \\(f\\) na vsem intervalu, ali bo kje slabši?',
                'The graph shows the function \\(f(x)=\\frac1{1+25x^2}\\) (the faint curve) and its interpolation polynomial \\(p\\) of degree \\(n=6\\) through \\(n+1=7\\) equally spaced nodes on \\([-1,1]\\). The error curve is hidden. Predict: as the degree is raised, that is as nodes are added, will the polynomial \\(p\\) fit \\(f\\) better and better on the whole interval, or will it be worse somewhere?',
            ),
            formulaIds: ['node-polynomial'],
            frames: [frame('runge-predict-explanation', 'explanation'), frame('runge-predict-observation', 'observation')],
            observationPrompt: text('Pred razkritjem se odloči: ali napaka pada povsod, ali samo v sredini, ali narašča ob krajiščih?', 'Before the reveal decide: does the error fall everywhere, only in the middle, or grow near the ends?'),
            expectedObservations: [text('Pri \\(n=6\\) polinom že nekoliko niha okoli funkcije; kaj se zgodi pri večji stopnji, napoveš ti.', 'At \\(n=6\\) the polynomial already wobbles a little around the function; what happens at a higher degree is your prediction.')],
            scene: rungeScene('runge-predict-start', 6, 'equispaced', false, false,
                'Rungejeva funkcija, stopnja \\(6\\), \\(7\\) enakomerno razporejenih točk; krivulja napake je skrita.',
                'The Runge function, degree \\(6\\), \\(7\\) equally spaced nodes; the error curve is hidden.'),
        },
        {
            id: 'runge-raise-degree', order: 2,
            title: text('Višanje stopnje', 'Raising the degree'),
            purpose: text('Pred razkritjem napovedati, kje polinom zaniha, in stopnjo višati korak za korakom.', 'Predicting, before the reveal, where the polynomial swings, and raising the degree step by step.'),
            explanation: text(
                'Prikazana je stopnja \\(n=10\\), \\(11\\) enakomerno razporejenih točk. Napovej: v sredini intervala ali ob krajiščih bo polinom \\(p\\) najbolj odstopal od \\(f\\)? Nato s tipko plus višaj stopnjo do \\(15\\) in \\(20\\) in opazuj krajišči \\(x=\\pm1\\). Zanihanja ob krajiščih rastejo, čeprav polinom vedno gre skozi vse točke.',
                'Degree \\(n=10\\) is shown, \\(11\\) equally spaced nodes. Predict: will the polynomial \\(p\\) differ most from \\(f\\) in the middle of the interval or near the ends? Then raise the degree with the plus button to \\(15\\) and \\(20\\) and watch the ends \\(x=\\pm1\\). The swings near the ends grow, even though the polynomial always passes through every node.',
            ),
            formulaIds: ['node-polynomial'],
            frames: [frame('runge-raise-degree-explanation', 'explanation'), frame('runge-raise-degree-observation', 'observation')],
            observationPrompt: text('Višaj stopnjo za nekaj korakov in opazuj, kako se spreminja polinom ob krajiščih.', 'Raise the degree a few steps and watch how the polynomial changes near the ends.'),
            expectedObservations: [text('V sredini se polinom z višanjem stopnje približuje funkciji, ob krajiščih pa zaniha vedno bolj.', 'In the middle the polynomial approaches the function as the degree rises, but near the ends it swings more and more.')],
            scene: rungeScene('runge-raise-degree-n10', 10, 'equispaced', false, false,
                'Rungejeva funkcija, stopnja \\(10\\), \\(11\\) enakomerno razporejenih točk; krivulja napake je skrita.',
                'The Runge function, degree \\(10\\), \\(11\\) equally spaced nodes; the error curve is hidden.'),
        },
        {
            id: 'runge-error-curve', order: 3,
            title: text('Krivulja napake in njen maksimum', 'The error curve and its maximum'),
            purpose: text('Pred razkritjem napovedati, kje je napaka največja, in odčitati največjo napako na mreži.', 'Predicting, before the reveal, where the error is largest, and reading the largest error on the grid.'),
            explanation: text(
                'Prikazana je krivulja napake \\(|f-p|\\) pri \\(n=10\\) in križec na njenem največjem mestu. Napovej: pri katerem \\(x\\) bo napaka največja? Odčitek je največja napaka na mreži \\(1{,}916\\) pri \\(x=0{,}9402\\) (napaka je soda funkcija, zato tudi pri \\(x=-0{,}9402\\)), torej tik ob krajišču. To je največja vrednost v \\(20001\\) točkah mreže, ne prava zgornja meja napake. Polinom je ob krajišču napačen skoraj za dve enoti, čeprav \\(f\\) nikjer ne preseže \\(1\\). Ali napaka z višanjem stopnje res raste, primerjaš v petem koraku; številka velja le za to funkcijo \\(f\\).',
                'The error curve \\(|f-p|\\) at \\(n=10\\) is shown, with a cross at its largest point. Predict: at which \\(x\\) will the error be largest? The readout is the grid maximum error \\(1.916\\) at \\(x=0.9402\\) (the error is an even function, so also at \\(x=-0.9402\\)), right next to an end. It is the largest value over the \\(20001\\) points of the grid, not the true supremum of the error. The polynomial is off by almost two units near the end, although \\(f\\) never exceeds \\(1\\). Whether the error really grows with the degree you compare in step 5; the number holds only for this function \\(f\\).',
            ),
            formulaIds: ['node-polynomial'],
            frames: [frame('runge-error-curve-explanation', 'explanation'), frame('runge-error-curve-observation', 'observation')],
            observationPrompt: text('Preberi največjo napako na mreži in mesto, kjer nastopi, ter jo primerjaj z največjo vrednostjo \\(f\\).', 'Read the grid maximum error and the place where it occurs, and compare it with the largest value of \\(f\\).'),
            expectedObservations: [text('Največja napaka na mreži je \\(1{,}916\\) pri \\(x=0{,}9402\\), ob krajišču intervala.', 'The grid maximum error is \\(1.916\\) at \\(x=0.9402\\), near an end of the interval.')],
            scene: rungeScene('runge-error-curve-n10', 10, 'equispaced', true, false,
                'Rungejeva funkcija, stopnja \\(10\\), enakomerno razporejene točke; največja napaka na mreži \\(1{,}916\\) pri \\(x=0{,}9402\\).',
                'The Runge function, degree \\(10\\), equally spaced nodes; the grid maximum error is \\(1.916\\) at \\(x=0.9402\\).'),
        },
        {
            id: 'runge-chebyshev', order: 4,
            title: text('Čebiševe točke', 'Chebyshev nodes'),
            purpose: text('Pred razkritjem napovedati, kakšna razporeditev točk pomaga, in razkriti Čebiševe točke.', 'Predicting, before the reveal, which placement of nodes helps, and revealing the Chebyshev nodes.'),
            explanation: text(
                'Napaka je ob krajiščih velika, zato napovej, kakšna razporeditev točk bi pomagala: gostejše točke v sredini ali ob krajiščih? Prikazane so Čebiševe točke prve vrste \\(x_j=\\cos\\frac{(2j+1)\\pi}{2(n+1)}\\) pri \\(n=10\\): to so pravokotne projekcije enakomerno razporejenih točk na polkrogu na os \\(x\\), zato so ob krajiščih gostejše. Največja napaka na mreži je zdaj \\(0{,}1092\\), ne več \\(1{,}916\\). Čebiševe točke najmanjšajo največjo vrednost vozliščnega polinoma \\(\\prod(x-x_j)\\) na \\([-1,1]\\), ne napake pri vsaki stopnji; pri tej funkciji in tej stopnji napako zares zmanjšajo.',
                'The error is large near the ends, so predict which placement of nodes would help: denser in the middle or denser near the ends? The Chebyshev nodes of the first kind \\(x_j=\\cos\\frac{(2j+1)\\pi}{2(n+1)}\\) at \\(n=10\\) are shown: they are the projections onto the \\(x\\)-axis of equally spaced points on a semicircle, so they are denser near the ends. The grid maximum error is now \\(0.1092\\), no longer \\(1.916\\). Chebyshev nodes minimise the maximum of the node polynomial \\(\\prod(x-x_j)\\) on \\([-1,1]\\), not the error at every degree; for this function and this degree they do reduce the error.',
            ),
            formulaIds: ['node-polynomial'],
            frames: [frame('runge-chebyshev-explanation', 'explanation'), frame('runge-chebyshev-observation', 'observation')],
            observationPrompt: text('Primerjaj polinom in krivuljo napake z enakomerno razporeditvijo in preberi novo največjo napako na mreži.', 'Compare the polynomial and the error curve with the equally spaced placement and read the new grid maximum error.'),
            expectedObservations: [text('Točke se ob krajiščih zgostijo, polinom ostane blizu \\(f\\) po vsem intervalu, največja napaka na mreži je \\(0{,}1092\\).', 'The nodes crowd together near the ends, the polynomial stays close to \\(f\\) on the whole interval and the grid maximum error is \\(0.1092\\).')],
            scene: rungeScene('runge-chebyshev-n10', 10, 'chebyshev', true, true,
                'Rungejeva funkcija, stopnja \\(10\\), Čebiševe točke prve vrste s polkrogom; največja napaka na mreži \\(0{,}1092\\).',
                'The Runge function, degree \\(10\\), Chebyshev nodes of the first kind with the semicircle; the grid maximum error is \\(0.1092\\).'),
        },
        {
            id: 'runge-compare', order: 5,
            title: text('Primerjava maksimumov', 'Comparing the maxima'),
            purpose: text('Pred razkritjem napovedati, kaj se zgodi pri stopnji \\(20\\), in primerjati obe razporeditvi.', 'Predicting, before the reveal, what happens at degree \\(20\\), and comparing the two placements.'),
            explanation: text(
                'Prikazana je stopnja \\(n=20\\) z enakomerno razporejenimi točkami. Napovej: ali bo največja napaka na mreži pri \\(n=20\\) manjša ali večja kot pri \\(n=10\\)? Odčitek je \\(59{,}82\\), krivulja napake pa je zunaj prikaza. Pri enakomernih točkah so največje napake \\(1{,}916\\), \\(2{,}108\\) in \\(59{,}82\\) pri \\(n=10\\), \\(15\\) in \\(20\\). Preklopi na Čebiševe točke in primerjaj: \\(0{,}1092\\), \\(0{,}08311\\) in \\(0{,}01533\\). To so številke za to funkcijo in te tri stopnje na mreži; ne dokazujejo, kaj se zgodi pri \\(n\\to\\infty\\), in ne za vsako funkcijo. Pri Čebiševih točkah druge vrste so številke drugačne, zato lekcija vedno navede vrsto.',
                'Degree \\(n=20\\) is shown with equally spaced nodes. Predict: will the grid maximum error at \\(n=20\\) be smaller or larger than at \\(n=10\\)? The readout is \\(59.82\\) and the error curve lies outside the view. With equally spaced nodes the maximum errors are \\(1.916\\), \\(2.108\\) and \\(59.82\\) at \\(n=10\\), \\(15\\) and \\(20\\). Switch to Chebyshev nodes and compare: \\(0.1092\\), \\(0.08311\\) and \\(0.01533\\). These are numbers for this function and these three degrees on the grid; they do not prove what happens as \\(n\\to\\infty\\), nor for every function. For Chebyshev nodes of the second kind the numbers differ, so the lesson always names the kind.',
            ),
            formulaIds: ['node-polynomial'],
            frames: [frame('runge-compare-explanation', 'explanation'), frame('runge-compare-observation', 'observation')],
            observationPrompt: text('Preklopi med enakomernimi in Čebiševimi točkami ter pri stopnjah \\(10\\), \\(15\\) in \\(20\\) preberi največjo napako na mreži.', 'Switch between equally spaced and Chebyshev nodes and read the grid maximum error at degrees \\(10\\), \\(15\\) and \\(20\\).'),
            expectedObservations: [text('Enakomerne točke: \\(1{,}916\\), \\(2{,}108\\), \\(59{,}82\\); Čebiševe točke: \\(0{,}1092\\), \\(0{,}08311\\), \\(0{,}01533\\).', 'Equally spaced nodes: \\(1.916\\), \\(2.108\\), \\(59.82\\); Chebyshev nodes: \\(0.1092\\), \\(0.08311\\), \\(0.01533\\).')],
            scene: rungeScene('runge-compare-n20', 20, 'equispaced', true, false,
                'Rungejeva funkcija, stopnja \\(20\\), enakomerno razporejene točke; največja napaka na mreži \\(59{,}82\\), križec je zunaj prikaza.',
                'The Runge function, degree \\(20\\), equally spaced nodes; the grid maximum error is \\(59.82\\), the cross is outside the view.'),
        },
        {
            id: 'runge-explore', order: 6,
            title: text('Prosto raziskovanje', 'Free exploration'),
            purpose: text('Samostojno spreminjati funkcijo, stopnjo in razporeditev točk.', 'Changing the function, the degree and the node rule on your own.'),
            explanation: text(
                'Graf je spet na začetku: Rungejeva funkcija, stopnja \\(10\\), enakomerno razporejene točke. Zamenjaj funkcijo z \\(|x|\\) ali \\(\\sin x\\), višaj stopnjo do \\(40\\) in izberi razporeditev točk. Pri \\(\\sin x\\) je polinom že pri nizki stopnji skoraj enak funkciji; to je primerjava, ki kaže, da Rungejev pojav ni lastnost vsake funkcije. Največja napaka na mreži je vedno le največja vrednost na mreži.',
                'The graph is back at the start: the Runge function, degree \\(10\\), equally spaced nodes. Change the function to \\(|x|\\) or \\(\\sin x\\), raise the degree up to \\(40\\) and choose the node rule. For \\(\\sin x\\) the polynomial is nearly equal to the function already at a low degree; this is a contrast that shows the Runge phenomenon is not a property of every function. The grid maximum error is always only the largest value on the grid.',
            ),
            formulaIds: ['node-polynomial'],
            frames: [frame('runge-explore-explanation', 'explanation'), frame('runge-explore-observation', 'observation')],
            observationPrompt: text('Zamenjaj funkcijo s \\(\\sin x\\), nato z \\(|x|\\), in primerjaj, kako se največja napaka na mreži spreminja s stopnjo pri obeh razporeditvah.', 'Change the function to \\(\\sin x\\), then to \\(|x|\\), and compare how the grid maximum error changes with the degree for both placements.'),
            expectedObservations: [text('Pri \\(\\sin x\\) napaka z višanjem stopnje hitro pada pri obeh razporeditvah; Rungejev pojav je odvisen od funkcije.', 'For \\(\\sin x\\) the error falls quickly with the degree for both placements; the Runge phenomenon depends on the function.')],
            scene: rungeScene('runge-explore-default', 10, 'equispaced', true, false,
                'Rungejeva funkcija, stopnja \\(10\\), enakomerno razporejene točke; vse je prosto za raziskovanje.',
                'The Runge function, degree \\(10\\), equally spaced nodes; everything is free to explore.'),
        },
    ],
    sources: [
        {id: 'runge-1901', citation: 'Runge, C. Über empirische Funktionen und die Interpolation zwischen äquidistanten Ordinaten. Zeitschrift für Mathematik und Physik 46 (1901) 224-243.'},
        {id: 'berrut-trefethen-runge', citation: 'Berrut, J.-P. and Trefethen, L. N. Barycentric Lagrange interpolation. SIAM Review 46 (2004).'},
        {
            id: 'bezeg-runge-implementation',
            citation: 'Bezeg source: src/analysis/interpolation.ts, src/analysis/rungeInterpolationModel.ts and src/graphs/functions/RungeInterpolationGraph.tsx.',
            implementationCorrespondence: 'The polynomial is evaluated with the barycentric formula and the maximum error is taken over a grid of 20001 points; a lesson scene sets the function, the degree, the node rule and the two display switches with the runge action.',
        },
    ],
    edgeCases: [
        text('Stopnja je celo število od \\(1\\) do \\(40\\); drugačna vrednost je zavrnjena z izpisanim sporočilom in se ne zaokroži.', 'The degree is a whole number from \\(1\\) to \\(40\\); another value is refused with a message and not rounded.'),
        text('Polkrog je viden le pri Čebiševih točkah; pri enakomernih točkah je stikalo onemogočeno.', 'The semicircle is visible only with Chebyshev nodes; with equally spaced nodes the switch is disabled.'),
    ],
    unresolvedQuestions: [],
};

export const interpolationGuidedLessons: readonly GuidedLesson[] = [lagrangeLesson, rungeLesson, hermiteLesson, subdivisionLesson];
