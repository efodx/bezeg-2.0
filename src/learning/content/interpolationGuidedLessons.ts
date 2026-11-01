/**
 * Guided lessons of the Interpolation and approximation family (docs/specs/interpolation-approximation-lessons.md): I1,
 * Lagrange interpolation versus Bézier approximation. The text is a one-shot draft (docs/specs/new-lesson-families.md,
 * "One-shot lesson text"): every value it quotes is the readout of the scene it belongs to, and
 * `interpolationGuidedLessons.test.ts` checks that against the real graph and the kernel in `src/analysis/interpolation.ts`.
 * Scenes use the `interpolation` (`set-rule`, `set-overlay`, `add-point`) and `parameter` (`t`, the shared position s) actions.
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

export const interpolationGuidedLessons: readonly GuidedLesson[] = [lagrangeLesson];
