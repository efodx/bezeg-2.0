/**
 * Guided lesson of the B-spline basis Demonstration (docs/specs/b-splines-nurbs-lessons.md, L1). The text is a one-shot draft
 * (docs/specs/new-lesson-families.md, "One-shot lesson text"): every value it quotes is a readout of the scene it belongs to, and
 * `bsplineBasisGuidedLessons.test.tsx` checks that against the real graph and the kernel in `src/bezeg/impl/curve/bspline.ts`.
 * Scenes are `lesson-fixture` scenes whose fixture carries the degree and the knot vector (`LessonCurveFixture.knots`; the fixture
 * points are placeholders, one per basis function) followed by the `parameter` action `t`.
 */
import type {LessonAction, LessonCurveFixture, LessonViewBox} from '../model';
import type {GuidedLesson, GuidedLessonFrame, GuidedLessonFrameKind, LessonScene, LocalizedText} from './guidedLessons';

const text = (sl: string, en: string): LocalizedText => ({sl, en});
const frame = (id: string, kind: GuidedLessonFrameKind): GuidedLessonFrame => ({id, kind});

/** The default lesson vector of L1: quadratic, four basis functions. */
export const BASIS_LESSON_KNOTS: readonly number[] = [0, 0, 0, 1, 2, 2, 2];

/** A view that fits the knot span the way the graph's own fit does (12 percent padding, values from -0.55 to 1.65). */
const viewFor = (knots: readonly number[]): LessonViewBox => {
    const low = Math.min(...knots), high = Math.max(...knots);
    const pad = 0.12 * ((high - low) || 1);
    return [low - pad, 1.65, high + pad, -0.55];
};

/** A basis-plot scene: degree and knots in the fixture (one placeholder point per function), then the slider parameter `t`. */
const basisScene = (id: string, degree: number, knots: readonly number[], t: number, sl: string, en: string): LessonScene => {
    const curve: LessonCurveFixture = {degree, knots, points: knots.slice(0, knots.length - degree - 1).map((_, i) => [i, 0] as const)};
    const actions: LessonAction[] = [{kind: 'parameter', name: 't', value: t}];
    return {id, basedOn: 'lesson-fixture', curve, view: viewFor(knots), actions, expectedState: text(sl, en)};
};

const basisLesson: GuidedLesson = {
    demonstrationId: 'bspline-basis',
    title: text('Bazne funkcije B-zlepka', 'The B-spline basis functions'),
    summary: text(
        'B-zlepek je vsota lokalnih grbin: vsaka bazna funkcija \\(N_{i,k}\\) je različna od nič le na odseku \\([u_i,u_{i+k+1})\\), vozli določajo, kje grbine ležijo, in v vsaki točki se grbine seštejejo v \\(1\\).',
        'A B-spline is a sum of local bumps: each basis function \\(N_{i,k}\\) is nonzero only on the span \\([u_i,u_{i+k+1})\\), the knots decide where the bumps live, and at every point the bumps add up to \\(1\\).',
    ),
    prerequisites: [
        text('Potrebno je poznavanje Bernsteinovih baznih funkcij in odsekoma polinomskih funkcij iz poglavij o Bézierjevih krivuljah in zlepkih.', 'Assumes the Bernstein basis functions and piecewise polynomial functions from the Bézier curves and splines chapters.'),
    ],
    learningGoals: [
        text('Pojasniš, da je vsaka bazna funkcija B-zlepka lokalna: stopnje \\(k\\) je različna od nič na največ \\(k+1\\) vozelnih razmikih.', 'Explain that every B-spline basis function is local: of degree \\(k\\) it is nonzero on at most \\(k+1\\) knot spans.'),
        text('Preveriš, da je v vsaki točki natanko \\(k+1\\) vrednosti različnih od nič in da je njihova vsota \\(1\\).', 'Check that exactly \\(k+1\\) values are nonzero at every point and that they sum to \\(1\\).'),
        text('Veš, da pri vozelnem vektorju \\((0,0,0,1,1,1)\\) bazne funkcije B-zlepka postanejo Bernsteinove.', 'Know that for the knot vector \\((0,0,0,1,1,1)\\) the B-spline basis functions become the Bernstein functions.'),
    ],
    formulaBlocks: [
        {
            id: 'bspline-cox-de-boor',
            latex: 'N_{i,0}(t)=\\begin{cases}1,&u_i\\le t<u_{i+1}\\\\0,&\\text{otherwise}\\end{cases},\\quad N_{i,k}(t)=\\frac{t-u_i}{u_{i+k}-u_i}N_{i,k-1}(t)+\\frac{u_{i+k+1}-t}{u_{i+k+1}-u_{i+1}}N_{i+1,k-1}(t)',
            notation: text(
                '\\(u_0\\le u_1\\le\\dots\\) so vozli, \\(k\\) je stopnja, \\(N_{i,k}\\) je \\(i\\)-ta bazna funkcija. Člen z imenovalcem \\(0\\) izpustimo.',
                '\\(u_0\\le u_1\\le\\dots\\) are the knots, \\(k\\) is the degree and \\(N_{i,k}\\) is the \\(i\\)-th basis function. A term with denominator \\(0\\) is left out.',
            ),
            explanation: text(
                'Funkcija stopnje \\(0\\) je indikator odseka; vsaka višja stopnja je tehtano povprečje dveh nižjih, zato je \\(N_{i,k}\\) različna od nič le na \\([u_i,u_{i+k+1})\\) in se na vsakem odseku vozlov ujema s polinomom stopnje \\(k\\). Stopnje \\(0\\) program ne ponuja, vidiš pa stopnje \\(1\\) do \\(3\\).',
                'The function of degree \\(0\\) is the indicator of a span; every higher degree is a weighted average of two lower ones, so \\(N_{i,k}\\) is nonzero only on \\([u_i,u_{i+k+1})\\) and agrees with a polynomial of degree \\(k\\) on each knot span. The app does not offer degree \\(0\\); you see degrees \\(1\\) to \\(3\\).',
            ),
        },
    ],
    workedExamples: [
        {
            id: 'bspline-basis-half-example',
            title: text('Vrednosti pri \\(t=\\tfrac12\\)', 'The values at \\(t=\\tfrac12\\)'),
            calculationLatex: 'N_{0,2}=(1-t)^2,\\ N_{1,2}=t(1-t)+\\tfrac{2-t}{2}\\,t,\\ N_{2,2}=\\tfrac{t^2}{2}\\quad\\text{pri }t=\\tfrac12',
            resultLatex: '(N_{0,2},N_{1,2},N_{2,2},N_{3,2})=(0{,}25;\\ 0{,}625;\\ 0{,}125;\\ 0)',
            check: text(
                'Pri \\(t=\\tfrac12\\) je odsek \\([0,1)\\), zato so aktivne tri funkcije \\(N_{0,2}\\), \\(N_{1,2}\\), \\(N_{2,2}\\); \\(N_{3,2}\\) ima nosilec \\([1,2]\\) in je \\(0\\). Vsota je \\(0{,}25+0{,}625+0{,}125=1\\); isto pokaže polje v plošči.',
                'At \\(t=\\tfrac12\\) the span is \\([0,1)\\), so three functions \\(N_{0,2}\\), \\(N_{1,2}\\), \\(N_{2,2}\\) are active; \\(N_{3,2}\\) has support \\([1,2]\\) and is \\(0\\). The sum is \\(0.25+0.625+0.125=1\\); the readout in the panel shows the same.',
            ),
        },
    ],
    steps: [
        {
            id: 'bspline-basis-hat', order: 1,
            title: text('Ena grbina stopnje \\(1\\)', 'One bump of degree \\(1\\)'),
            purpose: text('Pred razkritjem napovedati obliko ene bazne funkcije stopnje \\(1\\) in nato stopenj \\(2\\) in \\(3\\).', 'Predicting, before the reveal, the shape of one degree \\(1\\) basis function and then of degrees \\(2\\) and \\(3\\).'),
            explanation: text(
                'Prikazane so bazne funkcije stopnje \\(1\\) z vozli \\((0,0,1,2,2)\\). Napovej obliko funkcije \\(N_{1,1}\\), ki ima vozle \\(0\\), \\(1\\), \\(2\\): trikotnik (klobuk) z vrhom \\(1\\) pri \\(t=1\\) in nosilcem \\([0,2]\\). Stopnja \\(0\\) bi bila stopnica na enem odseku; ko v plošči izbereš stopnjo \\(2\\) in \\(3\\), se grbina razširi čez več odsekov in postane gladkejša.',
                'The degree \\(1\\) basis functions with knots \\((0,0,1,2,2)\\) are shown. Predict the shape of \\(N_{1,1}\\), which has the knots \\(0\\), \\(1\\), \\(2\\): a triangle (hat) with peak \\(1\\) at \\(t=1\\) and support \\([0,2]\\). Degree \\(0\\) would be a step on one span; when you pick degree \\(2\\) and \\(3\\) in the panel, the bump widens over more spans and becomes smoother.',
            ),
            formulaIds: ['bspline-cox-de-boor'],
            frames: [frame('bspline-basis-hat-explanation', 'explanation'), frame('bspline-basis-hat-observation', 'observation')],
            observationPrompt: text('Izberi stopnjo \\(2\\) in \\(3\\) in opazuj, na koliko odsekih je ena grbina različna od nič.', 'Pick degree \\(2\\) and \\(3\\) and watch how many spans one bump is nonzero on.'),
            expectedObservations: [text('Bazna funkcija stopnje \\(k\\) je različna od nič na \\(k+1\\) odsekih: pri stopnji \\(1\\) na dveh, pri \\(2\\) na treh, pri \\(3\\) na štirih.', 'A basis function of degree \\(k\\) is nonzero on \\(k+1\\) spans: two for degree \\(1\\), three for \\(2\\), four for \\(3\\).')],
            scene: basisScene('bspline-basis-hat-degree-1', 1, [0, 0, 1, 2, 2], 1,
                'Stopnja \\(1\\), vozli \\((0,0,1,2,2)\\), \\(t=1\\): vrednosti \\(N_{0,1},N_{1,1},N_{2,1}\\) so \\(0;\\ 1;\\ 0\\).',
                'Degree \\(1\\), knots \\((0,0,1,2,2)\\), \\(t=1\\): the values \\(N_{0,1},N_{1,1},N_{2,1}\\) are \\(0;\\ 1;\\ 0\\).'),
        },
        {
            id: 'bspline-basis-slide', order: 2,
            title: text('Drsnik \\(t\\) in vsota \\(1\\)', 'The slider \\(t\\) and the sum \\(1\\)'),
            purpose: text('Pred razkritjem napovedati, koliko vrednosti je pri \\(t=\\tfrac12\\) različnih od nič in kolikšna je njihova vsota.', 'Predicting, before the reveal, how many values are nonzero at \\(t=\\tfrac12\\) and what their sum is.'),
            explanation: text(
                'Zdaj je stopnja \\(2\\) z vozli \\((0,0,0,1,2,2,2)\\) in štirimi baznimi funkcijami. Napovej: koliko od štirih vrednosti je pri \\(t=\\tfrac12\\) različnih od nič in kolikšna je vsota? Prav je \\(k+1=3\\), vsota pa je \\(1\\): vrednosti so \\(0{,}25\\), \\(0{,}625\\), \\(0{,}125\\) in \\(0\\). Premikaj drsnik \\(t\\) in glej, kako se vrednosti med seboj prelivajo.',
                'Now the degree is \\(2\\) with knots \\((0,0,0,1,2,2,2)\\) and four basis functions. Predict: how many of the four values are nonzero at \\(t=\\tfrac12\\) and what is their sum? It is \\(k+1=3\\) and the sum is \\(1\\): the values are \\(0.25\\), \\(0.625\\), \\(0.125\\) and \\(0\\). Move the slider \\(t\\) and watch the values flow into each other.',
            ),
            formulaIds: ['bspline-cox-de-boor'], workedExampleId: 'bspline-basis-half-example',
            frames: [frame('bspline-basis-slide-explanation', 'explanation'), frame('bspline-basis-slide-calculation', 'calculation'), frame('bspline-basis-slide-observation', 'observation')],
            observationPrompt: text('Premakni \\(t\\) in preveri, da je vsota vseh vrednosti vedno \\(1\\).', 'Move \\(t\\) and check that the sum of all values is always \\(1\\).'),
            expectedObservations: [text('Pri \\(t=\\tfrac12\\) so aktivne tri funkcije z vrednostmi \\(0{,}25\\), \\(0{,}625\\), \\(0{,}125\\), vsota je \\(1\\); pri \\(t=1\\) sta \\(0{,}5\\) in \\(0{,}5\\).', 'At \\(t=\\tfrac12\\) three functions are active with the values \\(0.25\\), \\(0.625\\), \\(0.125\\) and the sum is \\(1\\); at \\(t=1\\) they are \\(0.5\\) and \\(0.5\\).')],
            scene: basisScene('bspline-basis-slide-half', 2, BASIS_LESSON_KNOTS, 0.5,
                'Stopnja \\(2\\), vozli \\((0,0,0,1,2,2,2)\\), \\(t=\\tfrac12\\): vrednosti \\(0{,}25;\\ 0{,}625;\\ 0{,}125;\\ 0\\), vsota \\(1\\).',
                'Degree \\(2\\), knots \\((0,0,0,1,2,2,2)\\), \\(t=\\tfrac12\\): the values \\(0.25;\\ 0.625;\\ 0.125;\\ 0\\), sum \\(1\\).'),
        },
        {
            id: 'bspline-basis-mirror', order: 3,
            title: text('Katere funkcije so aktivne pri \\(t=\\tfrac32\\)?', 'Which functions are active at \\(t=\\tfrac32\\)?'),
            purpose: text('Pred razkritjem napovedati, katere bazne funkcije so pri \\(t=\\tfrac32\\) različne od nič, in videti zrcalno sliko vrednosti pri \\(t=\\tfrac12\\).', 'Predicting, before the reveal, which basis functions are nonzero at \\(t=\\tfrac32\\), and seeing the mirror image of the values at \\(t=\\tfrac12\\).'),
            explanation: text(
                'Vozli so simetrični glede na \\(t=1\\). Napovej: katere od \\(N_{0,2}\\), \\(N_{1,2}\\), \\(N_{2,2}\\), \\(N_{3,2}\\) so pri \\(t=\\tfrac32\\) različne od nič? Točka leži na odseku \\([1,2)\\), zato \\(N_{1,2}\\), \\(N_{2,2}\\), \\(N_{3,2}\\); \\(N_{0,2}\\) je \\(0\\). Vrednosti so \\(0\\), \\(0{,}125\\), \\(0{,}625\\), \\(0{,}25\\), torej zrcalna slika vrednosti pri \\(t=\\tfrac12\\).',
                'The knots are symmetric about \\(t=1\\). Predict: which of \\(N_{0,2}\\), \\(N_{1,2}\\), \\(N_{2,2}\\), \\(N_{3,2}\\) are nonzero at \\(t=\\tfrac32\\)? The point lies on the span \\([1,2)\\), so \\(N_{1,2}\\), \\(N_{2,2}\\), \\(N_{3,2}\\); \\(N_{0,2}\\) is \\(0\\). The values are \\(0\\), \\(0.125\\), \\(0.625\\), \\(0.25\\), the mirror image of the values at \\(t=\\tfrac12\\).',
            ),
            formulaIds: ['bspline-cox-de-boor'],
            frames: [frame('bspline-basis-mirror-explanation', 'explanation'), frame('bspline-basis-mirror-observation', 'observation')],
            observationPrompt: text('Premakni \\(t\\) čez vozel \\(1\\) in opazuj, kako ena funkcija izgine in druga se pojavi.', 'Move \\(t\\) across the knot \\(1\\) and watch one function leave and another enter.'),
            expectedObservations: [text('Pri \\(t=1\\) sta aktivni \\(N_{1,2}\\) in \\(N_{2,2}\\) z vrednostma \\(0{,}5\\) in \\(0{,}5\\); pri \\(t=\\tfrac32\\) so \\(0;\\ 0{,}125;\\ 0{,}625;\\ 0{,}25\\).', 'At \\(t=1\\) the functions \\(N_{1,2}\\) and \\(N_{2,2}\\) are active with the values \\(0.5\\) and \\(0.5\\); at \\(t=\\tfrac32\\) they are \\(0;\\ 0.125;\\ 0.625;\\ 0.25\\).')],
            scene: basisScene('bspline-basis-mirror-three-halves', 2, BASIS_LESSON_KNOTS, 1.5,
                'Stopnja \\(2\\), vozli \\((0,0,0,1,2,2,2)\\), \\(t=\\tfrac32\\): vrednosti \\(0;\\ 0{,}125;\\ 0{,}625;\\ 0{,}25\\), vsota \\(1\\).',
                'Degree \\(2\\), knots \\((0,0,0,1,2,2,2)\\), \\(t=\\tfrac32\\): the values \\(0;\\ 0.125;\\ 0.625;\\ 0.25\\), sum \\(1\\).'),
        },
        {
            id: 'bspline-basis-locality', order: 4,
            title: text('Premik enega notranjega vozla', 'Moving one interior knot'),
            purpose: text('Pred razkritjem napovedati, katere bazne funkcije se spremenijo, ko premakneš en notranji vozel (lokalnost).', 'Predicting, before the reveal, which basis functions change when one interior knot is moved (locality).'),
            explanation: text(
                'Vozli \\((0,0,0,1,2,3,4,4,4)\\) dajo šest funkcij stopnje \\(2\\); prikazan je vektor, v katerem je vozel \\(u_5=3\\) premaknjen na \\(3{,}5\\). Napovej: katere funkcije se zaradi tega spremenijo? Samo tiste, katerih nosilec \\([u_i,u_{i+3}]\\) vsebuje \\(u_5\\), torej \\(N_{2,2}\\) do \\(N_{5,2}\\); \\(N_{0,2}\\) in \\(N_{1,2}\\) ostaneta enaki. Pri \\(t=\\tfrac52\\) se vrednosti \\(0{,}125;\\ 0{,}75;\\ 0{,}125\\) spremenijo v \\(\\tfrac4{15}\\approx0{,}267;\\ 0{,}65;\\ \\tfrac1{12}\\approx0{,}083\\), vsota ostane \\(1\\).',
                'The knots \\((0,0,0,1,2,3,4,4,4)\\) give six functions of degree \\(2\\); the vector shown has the knot \\(u_5=3\\) moved to \\(3.5\\). Predict: which functions change because of it? Only those whose support \\([u_i,u_{i+3}]\\) contains \\(u_5\\), that is \\(N_{2,2}\\) to \\(N_{5,2}\\); \\(N_{0,2}\\) and \\(N_{1,2}\\) stay the same. At \\(t=\\tfrac52\\) the values \\(0.125;\\ 0.75;\\ 0.125\\) change to \\(\\tfrac4{15}\\approx0.267;\\ 0.65;\\ \\tfrac1{12}\\approx0.083\\), and the sum stays \\(1\\).',
            ),
            formulaIds: ['bspline-cox-de-boor'],
            frames: [frame('bspline-basis-locality-explanation', 'explanation'), frame('bspline-basis-locality-observation', 'observation')],
            observationPrompt: text('Povleci ali vpiši drug notranji vozel in preveri, da se levi funkciji ne premakneta.', 'Drag or type another interior knot and check that the left-hand functions do not move.'),
            expectedObservations: [text('Spremenijo se le funkcije, katerih nosilec vsebuje premaknjeni vozel; vsota ostane \\(1\\).', 'Only the functions whose support contains the moved knot change; the sum stays \\(1\\).')],
            scene: basisScene('bspline-basis-locality-moved', 2, [0, 0, 0, 1, 2, 3.5, 4, 4, 4], 2.5,
                'Stopnja \\(2\\), vozli \\((0,0,0,1,2,3{,}5,4,4,4)\\), \\(t=\\tfrac52\\): vrednosti \\(0;\\ 0;\\ 0{,}267;\\ 0{,}65;\\ 0{,}083;\\ 0\\).',
                'Degree \\(2\\), knots \\((0,0,0,1,2,3.5,4,4,4)\\), \\(t=\\tfrac52\\): the values \\(0;\\ 0;\\ 0.267;\\ 0.65;\\ 0.083;\\ 0\\).'),
        },
        {
            id: 'bspline-basis-bernstein', order: 5,
            title: text('Vozelni vektor \\((0,0,0,1,1,1)\\) in Bernstein', 'The knot vector \\((0,0,0,1,1,1)\\) and Bernstein'),
            purpose: text('Pred razkritjem napovedati, katere funkcije dobimo, ko ostanejo samo začetni in končni vozli, in jih primerjati z Bernsteinovimi.', 'Predicting, before the reveal, which functions appear when only the end knots are left, and comparing them with the Bernstein functions.'),
            explanation: text(
                'Vozelni vektor \\((0,0,0,1,1,1)\\) nima notranjih vozlov in ima tri bazne funkcije stopnje \\(2\\). Napovej: katere znane funkcije so to? Bernsteinove \\(B_0^2=(1-t)^2\\), \\(B_1^2=2t(1-t)\\), \\(B_2^2=t^2\\). Pri \\(t=\\tfrac12\\) so vrednosti \\(0{,}25;\\ 0{,}5;\\ 0{,}25\\). B-zlepek brez notranjih vozlov je torej Bézierjeva krivulja.',
                'The knot vector \\((0,0,0,1,1,1)\\) has no interior knots and three basis functions of degree \\(2\\). Predict: which familiar functions are these? The Bernstein functions \\(B_0^2=(1-t)^2\\), \\(B_1^2=2t(1-t)\\), \\(B_2^2=t^2\\). At \\(t=\\tfrac12\\) the values are \\(0.25;\\ 0.5;\\ 0.25\\). A B-spline without interior knots is therefore a Bézier curve.',
            ),
            formulaIds: ['bspline-cox-de-boor'],
            frames: [frame('bspline-basis-bernstein-explanation', 'explanation'), frame('bspline-basis-bernstein-observation', 'observation')],
            observationPrompt: text('Primerjaj tri grbine z Bernsteinovimi baznimi funkcijami stopnje \\(2\\).', 'Compare the three bumps with the Bernstein basis functions of degree \\(2\\).'),
            expectedObservations: [text('Grafi se ujemajo z \\(B_0^2\\), \\(B_1^2\\), \\(B_2^2\\); vsota je povsod \\(1\\).', 'The graphs agree with \\(B_0^2\\), \\(B_1^2\\), \\(B_2^2\\); the sum is \\(1\\) everywhere.')],
            scene: basisScene('bspline-basis-bernstein-bezier', 2, [0, 0, 0, 1, 1, 1], 0.5,
                'Stopnja \\(2\\), vozli \\((0,0,0,1,1,1)\\), \\(t=\\tfrac12\\): vrednosti \\(0{,}25;\\ 0{,}5;\\ 0{,}25\\), kot pri Bernsteinovih funkcijah.',
                'Degree \\(2\\), knots \\((0,0,0,1,1,1)\\), \\(t=\\tfrac12\\): the values \\(0.25;\\ 0.5;\\ 0.25\\), as for the Bernstein functions.'),
        },
        {
            id: 'bspline-basis-explore', order: 6,
            title: text('Prosto raziskovanje', 'Free exploration'),
            purpose: text('Samostojno spreminjati stopnjo, vozle in parameter ter preklapljati pritrjen vozelni vektor.', 'Changing the degree, the knots and the parameter on your own, and switching the clamped knot vector.'),
            explanation: text(
                'Spet je stopnja \\(2\\) z vozli \\((0,0,0,1,2,2,2)\\). Spreminjaj stopnjo, vpisuj ali vleci vozle, preklopi pritrjen vozelni vektor in premikaj \\(t\\). Poskusi večkratne vozle: vozel z večkratnostjo \\(m\\) zniža gladkost funkcij v njem. Pri enakomernem vektorju kubične funkcije v vozlu dajo vrednosti \\(\\tfrac16;\\ \\tfrac46;\\ \\tfrac16\\).',
                'The degree is \\(2\\) again with knots \\((0,0,0,1,2,2,2)\\). Change the degree, type or drag the knots, toggle the clamped knot vector and move \\(t\\). Try repeated knots: a knot of multiplicity \\(m\\) lowers the smoothness of the functions there. For a uniform vector the cubic functions at a knot give the values \\(\\tfrac16;\\ \\tfrac46;\\ \\tfrac16\\).',
            ),
            formulaIds: ['bspline-cox-de-boor'],
            frames: [frame('bspline-basis-explore-explanation', 'explanation'), frame('bspline-basis-explore-observation', 'observation')],
            observationPrompt: text('Preklopi na nepritrjen enakomeren vektor in poišči vrednosti pri vozlu.', 'Switch to the unclamped uniform vector and find the values at a knot.'),
            expectedObservations: [text('Vsota ostane \\(1\\) znotraj definicijskega območja; ob večkratnem vozlu se ena grbina na tem mestu zoži.', 'The sum stays \\(1\\) inside the domain; at a repeated knot one bump narrows there.')],
            scene: basisScene('bspline-basis-explore-start', 2, BASIS_LESSON_KNOTS, 0.5,
                'Privzeta stopnja \\(2\\), vozli \\((0,0,0,1,2,2,2)\\), \\(t=\\tfrac12\\); vse je prosto za raziskovanje.',
                'The default degree \\(2\\), knots \\((0,0,0,1,2,2,2)\\), \\(t=\\tfrac12\\); everything is free to explore.'),
        },
    ],
    sources: [
        {id: 'deboor-1978', citation: 'de Boor, C. A Practical Guide to Splines. Springer (1978).'},
        {id: 'farin-bspline', citation: 'Farin, G. Curves and Surfaces for CAGD, 5th ed., the chapter on B-splines.'},
        {
            id: 'bezeg-bspline-basis-implementation',
            citation: 'Bezeg source: src/bezeg/impl/curve/bspline.ts and src/graphs/curves/bspline/BSplineBasisGraph.tsx.',
            implementationCorrespondence: 'All values come from the Cox-de Boor kernel; a lesson scene sets the degree and knot vector with a curve fixture and the slider with the parameter action t.',
        },
    ],
    edgeCases: [
        text('Pri vozlu z večkratnostjo \\(k+1\\) je vrednost v tem vozlu desna limita, funkcija pa je lahko tam nezvezna.', 'At a knot of multiplicity \\(k+1\\) the value at the knot is the right limit, and the function may be discontinuous there.'),
        text('Nepravilen vozelni vektor (padajoč ali napačne dolžine) program zavrne z razlago in prejšnji prizor ostane.', 'An invalid knot vector (decreasing or of the wrong length) is refused with an explanation and the previous scene stays.'),
    ],
    unresolvedQuestions: [],
};

export const bsplineBasisGuidedLessons: readonly GuidedLesson[] = [basisLesson];
