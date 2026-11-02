/**
 * Guided lesson of the de Boor Demonstration (docs/specs/b-splines-nurbs-lessons.md, L2). The text is a one-shot draft
 * (docs/specs/new-lesson-families.md, "One-shot lesson text"): every value it quotes is a readout of the scene it belongs to, and
 * `bsplineDeBoorGuidedLessons.test.tsx` checks that against the real graph and the kernel in `src/bezeg/impl/curve/bspline`.
 * Scenes are `lesson-fixture` scenes whose fixture carries the degree, the knot vector and the control points, followed by the
 * `parameter` action `t` and, to reveal the triangle, `animation` `deboor` `next-step` actions (one level each).
 */
import type {LessonAction, LessonCurveFixture, LessonViewBox} from '../model';
import type {GuidedLesson, GuidedLessonFrame, GuidedLessonFrameKind, LessonScene, LocalizedText} from './guidedLessons';

const text = (sl: string, en: string): LocalizedText => ({sl, en});
const frame = (id: string, kind: GuidedLessonFrameKind): GuidedLessonFrame => ({id, kind});

/** The lesson vector, degree and control points of L2 (the graph's own defaults). */
export const DEBOOR_LESSON_KNOTS: readonly number[] = [0, 0, 0, 1, 2, 2, 2];
export const DEBOOR_LESSON_DEGREE = 2;
export const DEBOOR_LESSON_POINTS: readonly (readonly [number, number])[] = [[0, 0], [1, 2], [3, 2], [4, 0]];
/** P0 as the locality step leaves it. */
export const DEBOOR_MOVED_P0: readonly [number, number] = [0, 1];

const VIEW: LessonViewBox = [-1.5, 3.5, 5.5, -1.5];

/** A de Boor scene: the fixture, the slider `t`, then `levels` next-step actions (level 0 when zero). */
const deBoorScene = (id: string, points: readonly (readonly [number, number])[], t: number, levels: number, sl: string, en: string): LessonScene => {
    const curve: LessonCurveFixture = {degree: DEBOOR_LESSON_DEGREE, knots: DEBOOR_LESSON_KNOTS, points};
    const actions: LessonAction[] = [{kind: 'parameter', name: 't', value: t}];
    for (let level = 0; level < levels; level++) actions.push({kind: 'animation', animationId: 'deboor', command: 'next-step'});
    return {id, basedOn: 'lesson-fixture', curve, view: VIEW, actions, expectedState: text(sl, en)};
};

const deBoorLesson: GuidedLesson = {
    demonstrationId: 'bspline-deboor',
    title: text('Krivulja B-zlepka in de Boorov postopek', 'The B-spline curve and de Boor\'s algorithm'),
    summary: text(
        'Točka krivulje B-zlepka je ponavljana linearna interpolacija \\(k+1\\) aktivnih kontrolnih točk, kot pri de Casteljauju, le da razmerja \\(\\alpha\\) izhajajo iz vozlov. Zato vsaka kontrolna točka vpliva le na del krivulje.',
        'A point of a B-spline curve is a repeated linear interpolation of \\(k+1\\) active control points, as in de Casteljau, except that the ratios \\(\\alpha\\) come from the knots. That is why each control point influences only a part of the curve.',
    ),
    prerequisites: [
        text('Potrebno je poznavanje baznih funkcij B-zlepka (prejšnja lekcija) in de Casteljaujevega postopka iz poglavja o Bézierjevih krivuljah.', 'Assumes the B-spline basis functions (the previous lesson) and de Casteljau\'s algorithm from the Bézier curves chapter.'),
    ],
    learningGoals: [
        text('Pojasniš, da je točka krivulje pri \\(t\\) odvisna le od \\(k+1\\) aktivnih kontrolnih točk vozelnega razpona, v katerem leži \\(t\\).', 'Explain that the curve point at \\(t\\) depends only on the \\(k+1\\) active control points of the knot span containing \\(t\\).'),
        text('Izračunaš trikotnik de Boorovega postopka z razmerji \\(\\alpha\\) iz vozlov.', 'Work out the triangle of de Boor\'s algorithm with the ratios \\(\\alpha\\) taken from the knots.'),
        text('Veš, da premik ene kontrolne točke spremeni krivuljo le na razponih, kjer je ta točka aktivna (lokalni nadzor).', 'Know that moving one control point changes the curve only on the spans where that point is active (local control).'),
    ],
    formulaBlocks: [
        {
            id: 'bspline-deboor-recurrence',
            latex: 'P_j^{0}=P_j,\\quad P_j^{r}=(1-\\alpha_j^{r})\\,P_{j-1}^{r-1}+\\alpha_j^{r}\\,P_j^{r-1},\\quad \\alpha_j^{r}=\\frac{t-u_j}{u_{j+k+1-r}-u_j}',
            notation: text(
                '\\(t\\) leži na razponu \\([u_s,u_{s+1})\\); \\(r=1,\\dots,k\\) in \\(j=s-k+r,\\dots,s\\). Točka krivulje je \\(P_s^{k}\\).',
                '\\(t\\) lies in the span \\([u_s,u_{s+1})\\); \\(r=1,\\dots,k\\) and \\(j=s-k+r,\\dots,s\\). The curve point is \\(P_s^{k}\\).',
            ),
            explanation: text(
                'Začnemo z \\(k+1\\) aktivnimi točkami \\(P_{s-k},\\dots,P_s\\). Na vsaki ravni vsak par sosednjih točk nadomestimo z eno točko na daljici med njima; razmerje \\(\\alpha\\) je razdalja \\(t\\) od vozla, deljena z razdaljo dveh vozlov. Pri vozlih \\((0,0,0,1,1,1)\\) je \\(\\alpha=t\\) in postopek je de Casteljaujev.',
                'We start with the \\(k+1\\) active points \\(P_{s-k},\\dots,P_s\\). On each level every pair of neighbours is replaced by one point on the segment between them; the ratio \\(\\alpha\\) is the distance of \\(t\\) from a knot divided by the distance of two knots. For the knots \\((0,0,0,1,1,1)\\) we get \\(\\alpha=t\\) and the algorithm is de Casteljau\'s.',
            ),
        },
    ],
    workedExamples: [
        {
            id: 'bspline-deboor-half-example',
            title: text('Trikotnik pri \\(t=\\tfrac12\\)', 'The triangle at \\(t=\\tfrac12\\)'),
            calculationLatex: '\\alpha_1^1=\\tfrac{1/2-0}{1-0}=\\tfrac12,\\ \\alpha_2^1=\\tfrac{1/2-0}{2-0}=\\tfrac14,\\ \\alpha_2^2=\\tfrac{1/2-0}{1-0}=\\tfrac12',
            resultLatex: 'P_2^{2}=\\tfrac12\\,(0{,}5;\\,1)+\\tfrac12\\,(1{,}5;\\,2)=(1;\\,1{,}5)',
            check: text(
                'Aktivne točke so \\(P_0=(0;0)\\), \\(P_1=(1;2)\\), \\(P_2=(3;2)\\). Raven \\(1\\): \\(P_1^1=(0{,}5;1)\\) in \\(P_2^1=(1{,}5;2)\\); raven \\(2\\): \\((1;1{,}5)\\). Isto pokaže polje v plošči.',
                'The active points are \\(P_0=(0;0)\\), \\(P_1=(1;2)\\), \\(P_2=(3;2)\\). Level \\(1\\): \\(P_1^1=(0.5;1)\\) and \\(P_2^1=(1.5;2)\\); level \\(2\\): \\((1;1.5)\\). The readout in the panel shows the same.',
            ),
        },
    ],
    steps: [
        {
            id: 'bspline-deboor-predict', order: 1,
            title: text('Katere točke štejejo pri \\(t=\\tfrac12\\)?', 'Which points matter at \\(t=\\tfrac12\\)?'),
            purpose: text('Pred razkritjem napovedati, katere kontrolne točke vplivajo na točko krivulje pri \\(t=\\tfrac12\\).', 'Predicting, before the reveal, which control points influence the curve point at \\(t=\\tfrac12\\).'),
            explanation: text(
                'Krivulja stopnje \\(2\\) ima štiri kontrolne točke \\(P_0,\\dots,P_3\\) in vozle \\((0,0,0,1,2,2,2)\\). Napovej: katere točke vplivajo na točko krivulje pri \\(t=\\tfrac12\\)? Parameter leži na razponu \\([0,1)\\), zato le \\(k+1=3\\) točke \\(P_0\\), \\(P_1\\), \\(P_2\\); \\(P_3\\) nanjo ne vpliva.',
                'The curve of degree \\(2\\) has four control points \\(P_0,\\dots,P_3\\) and the knots \\((0,0,0,1,2,2,2)\\). Predict: which points influence the curve point at \\(t=\\tfrac12\\)? The parameter lies in the span \\([0,1)\\), so only \\(k+1=3\\) points \\(P_0\\), \\(P_1\\), \\(P_2\\); \\(P_3\\) does not influence it.',
            ),
            formulaIds: ['bspline-deboor-recurrence'],
            frames: [frame('bspline-deboor-predict-explanation', 'explanation'), frame('bspline-deboor-predict-observation', 'observation')],
            observationPrompt: text('Poglej obroče okoli aktivnih točk in preveri, da \\(P_3\\) nima obroča.', 'Look at the rings around the active points and check that \\(P_3\\) has none.'),
            expectedObservations: [text('Obroči so na \\(P_0\\), \\(P_1\\), \\(P_2\\); točka krivulje pri \\(t=\\tfrac12\\) je \\((1;1{,}5)\\).', 'The rings sit on \\(P_0\\), \\(P_1\\), \\(P_2\\); the curve point at \\(t=\\tfrac12\\) is \\((1;1.5)\\).')],
            scene: deBoorScene('bspline-deboor-predict-half', DEBOOR_LESSON_POINTS, 0.5, 0,
                'Stopnja \\(2\\), vozli \\((0,0,0,1,2,2,2)\\), \\(t=\\tfrac12\\), raven \\(0\\): aktivne točke \\(P_0\\), \\(P_1\\), \\(P_2\\).',
                'Degree \\(2\\), knots \\((0,0,0,1,2,2,2)\\), \\(t=\\tfrac12\\), level \\(0\\): the active points are \\(P_0\\), \\(P_1\\), \\(P_2\\).'),
        },
        {
            id: 'bspline-deboor-slide', order: 2,
            title: text('Drsnik \\(t\\) in aktivne točke', 'The slider \\(t\\) and the active points'),
            purpose: text('Pred razkritjem napovedati, katere tri točke so aktivne pri \\(t=\\tfrac32\\), in videti, kako se aktivna trojica premakne.', 'Predicting, before the reveal, which three points are active at \\(t=\\tfrac32\\), and seeing the active triple move.'),
            explanation: text(
                'Premakni drsnik \\(t\\) čez vozel \\(1\\). Napovej: katere točke so aktivne pri \\(t=\\tfrac32\\)? Parameter leži na razponu \\([1,2)\\), zato \\(P_1\\), \\(P_2\\), \\(P_3\\); \\(P_0\\) ne šteje več. Točka krivulje je tam \\((3;1{,}5)\\), pri \\(t=1\\) pa \\((2;2)\\).',
                'Move the slider \\(t\\) across the knot \\(1\\). Predict: which points are active at \\(t=\\tfrac32\\)? The parameter lies in the span \\([1,2)\\), so \\(P_1\\), \\(P_2\\), \\(P_3\\); \\(P_0\\) no longer counts. The curve point there is \\((3;1.5)\\), and at \\(t=1\\) it is \\((2;2)\\).',
            ),
            formulaIds: ['bspline-deboor-recurrence'],
            frames: [frame('bspline-deboor-slide-explanation', 'explanation'), frame('bspline-deboor-slide-observation', 'observation')],
            observationPrompt: text('Premakni \\(t\\) čez \\(1\\) in opazuj, kako obroč preskoči s \\(P_0\\) na \\(P_3\\).', 'Move \\(t\\) across \\(1\\) and watch the ring jump from \\(P_0\\) to \\(P_3\\).'),
            expectedObservations: [text('Vedno so natanko tri točke z obročem; do \\(t=1\\) so to \\(P_0\\), \\(P_1\\), \\(P_2\\), nato \\(P_1\\), \\(P_2\\), \\(P_3\\).', 'There are always exactly three points with a ring; up to \\(t=1\\) they are \\(P_0\\), \\(P_1\\), \\(P_2\\), then \\(P_1\\), \\(P_2\\), \\(P_3\\).')],
            scene: deBoorScene('bspline-deboor-slide-three-halves', DEBOOR_LESSON_POINTS, 1.5, 0,
                'Stopnja \\(2\\), \\(t=\\tfrac32\\), raven \\(0\\): aktivne točke \\(P_1\\), \\(P_2\\), \\(P_3\\).',
                'Degree \\(2\\), \\(t=\\tfrac32\\), level \\(0\\): the active points are \\(P_1\\), \\(P_2\\), \\(P_3\\).'),
        },
        {
            id: 'bspline-deboor-triangle', order: 3,
            title: text('Trikotnik in razmerja \\(\\alpha\\)', 'The triangle and the ratios \\(\\alpha\\)'),
            purpose: text('Pred razkritjem napovedati, kje leži točka krivulje, ko trikotnik izračunamo do konca, in odčitati vsako razmerje \\(\\alpha\\).', 'Predicting, before the reveal, where the curve point lies when the triangle is finished, and reading every ratio \\(\\alpha\\).'),
            explanation: text(
                'Spet je \\(t=\\tfrac12\\) in trikotnik je prikazan do konca. Napovej: kje je točka krivulje? Na prvi ravni dobimo \\((0{,}5;1)\\) z \\(\\alpha=\\tfrac12\\) in \\((1{,}5;2)\\) z \\(\\alpha=\\tfrac14\\), na drugi ravni pa \\((1;1{,}5)\\) z \\(\\alpha=\\tfrac12\\). Razmerja niso enaka, ker so razmiki vozlov različni. Pritisni gumb za ponastavitev ravni in nato za naslednjo raven, da vidiš trikotnik nastajati.',
                'Again \\(t=\\tfrac12\\) and the triangle is shown to the end. Predict: where is the curve point? Level \\(1\\) gives \\((0.5;1)\\) with \\(\\alpha=\\tfrac12\\) and \\((1.5;2)\\) with \\(\\alpha=\\tfrac14\\), level \\(2\\) gives \\((1;1.5)\\) with \\(\\alpha=\\tfrac12\\). The ratios differ because the knot spacings differ. Press the reset-levels button and then the next-level button to watch the triangle being built.',
            ),
            formulaIds: ['bspline-deboor-recurrence'], workedExampleId: 'bspline-deboor-half-example',
            frames: [frame('bspline-deboor-triangle-explanation', 'explanation'), frame('bspline-deboor-triangle-calculation', 'calculation'), frame('bspline-deboor-triangle-observation', 'observation')],
            observationPrompt: text('Ponastavi ravni in jih razkrij ena po ena; preberi \\(\\alpha\\) v plošči.', 'Reset the levels and reveal them one by one; read \\(\\alpha\\) in the panel.'),
            expectedObservations: [text('Raven \\(1\\) ima dve točki, raven \\(2\\) eno: točko krivulje \\((1;1{,}5)\\), ki leži na daljici med \\((0{,}5;1)\\) in \\((1{,}5;2)\\).', 'Level \\(1\\) has two points and level \\(2\\) one: the curve point \\((1;1.5)\\), which lies on the segment between \\((0.5;1)\\) and \\((1.5;2)\\).')],
            scene: deBoorScene('bspline-deboor-triangle-half', DEBOOR_LESSON_POINTS, 0.5, 2,
                'Stopnja \\(2\\), \\(t=\\tfrac12\\), prikazani sta ravni \\(1\\) in \\(2\\): \\((0{,}5;1)\\), \\((1{,}5;2)\\) in točka krivulje \\((1;1{,}5)\\).',
                'Degree \\(2\\), \\(t=\\tfrac12\\), levels \\(1\\) and \\(2\\) shown: \\((0.5;1)\\), \\((1.5;2)\\) and the curve point \\((1;1.5)\\).'),
        },
        {
            id: 'bspline-deboor-local', order: 4,
            title: text('Premik \\(P_0\\)', 'Moving \\(P_0\\)'),
            purpose: text('Pred razkritjem napovedati, kje se krivulja spremeni, ko premaknemo \\(P_0\\) (lokalni nadzor).', 'Predicting, before the reveal, where the curve changes when \\(P_0\\) is moved (local control).'),
            explanation: text(
                'Točka \\(P_0\\) je premaknjena v \\((0;1)\\). Napovej: kje se krivulja spremeni? Točka \\(P_0\\) je aktivna le na razponu \\([0,1)\\), zato se krivulja za \\(t>1\\) ne premakne: pri \\(t=\\tfrac32\\) je točka še vedno \\((3;1{,}5)\\), saj \\(P_0\\) ni med aktivnimi točkami. Pri \\(t=\\tfrac12\\) bi se točka premaknila iz \\((1;1{,}5)\\) v \\((1;1{,}75)\\). Povleci \\(P_0\\) sam in opazuj.',
                'The point \\(P_0\\) has been moved to \\((0;1)\\). Predict: where does the curve change? The point \\(P_0\\) is active only on the span \\([0,1)\\), so the curve for \\(t>1\\) does not move: at \\(t=\\tfrac32\\) the point is still \\((3;1.5)\\), since \\(P_0\\) is not among the active points. At \\(t=\\tfrac12\\) the point would move from \\((1;1.5)\\) to \\((1;1.75)\\). Drag \\(P_0\\) yourself and watch.',
            ),
            formulaIds: ['bspline-deboor-recurrence'],
            frames: [frame('bspline-deboor-local-explanation', 'explanation'), frame('bspline-deboor-local-observation', 'observation')],
            observationPrompt: text('Povleci \\(P_0\\) in preveri, da se desni del krivulje ne premakne.', 'Drag \\(P_0\\) and check that the right part of the curve does not move.'),
            expectedObservations: [text('Le krivulja na razponu \\([0,1)\\) sledi \\(P_0\\); del za \\(t>1\\) ostane, kjer je.', 'Only the curve on the span \\([0,1)\\) follows \\(P_0\\); the part for \\(t>1\\) stays where it is.')],
            scene: deBoorScene('bspline-deboor-local-moved', [DEBOOR_MOVED_P0, ...DEBOOR_LESSON_POINTS.slice(1)], 1.5, 2,
                'Točka \\(P_0=(0;1)\\), \\(t=\\tfrac32\\): aktivne so \\(P_1\\), \\(P_2\\), \\(P_3\\), točka krivulje je še vedno \\((3;1{,}5)\\).',
                'The point \\(P_0=(0;1)\\), \\(t=\\tfrac32\\): the active points are \\(P_1\\), \\(P_2\\), \\(P_3\\) and the curve point is still \\((3;1.5)\\).'),
        },
        {
            id: 'bspline-deboor-pieces', order: 5,
            title: text('Koliko kosov ima krivulja?', 'How many pieces does the curve have?'),
            purpose: text('Pred razkritjem napovedati število polinomskih kosov krivulje in jih povezati z vozelnimi razponi.', 'Predicting, before the reveal, the number of polynomial pieces of the curve and relating them to the knot spans.'),
            explanation: text(
                'Parameter je pri vozlu \\(t=1\\). Napovej: iz koliko polinomskih kosov je krivulja? Vozli \\((0,0,0,1,2,2,2)\\) imajo dva razpona z dolžino več kot \\(0\\), to sta \\([0,1)\\) in \\([1,2)\\), zato ima krivulja dva kosa stopnje \\(2\\). Spojita se v točki \\((2;2)\\), ki pripada \\(t=1\\).',
                'The parameter is at the knot \\(t=1\\). Predict: how many polynomial pieces does the curve have? The knots \\((0,0,0,1,2,2,2)\\) have two spans of length greater than \\(0\\), namely \\([0,1)\\) and \\([1,2)\\), so the curve has two pieces of degree \\(2\\). They join at the point \\((2;2)\\), which belongs to \\(t=1\\).',
            ),
            formulaIds: ['bspline-deboor-recurrence'],
            frames: [frame('bspline-deboor-pieces-explanation', 'explanation'), frame('bspline-deboor-pieces-observation', 'observation')],
            observationPrompt: text('Premakni \\(t\\) mimo \\(1\\) in poišči spoj dveh kosov.', 'Move \\(t\\) past \\(1\\) and find the join of the two pieces.'),
            expectedObservations: [text('Dva kosa se stikata pri \\(t=1\\) v točki \\((2;2)\\); več razponov bi pomenilo več kosov.', 'Two pieces meet at \\(t=1\\) in the point \\((2;2)\\); more spans would mean more pieces.')],
            scene: deBoorScene('bspline-deboor-pieces-knot', DEBOOR_LESSON_POINTS, 1, 2,
                'Stopnja \\(2\\), \\(t=1\\), prikazan je celoten trikotnik: točka krivulje je \\((2;2)\\).',
                'Degree \\(2\\), \\(t=1\\), the whole triangle is shown: the curve point is \\((2;2)\\).'),
        },
        {
            id: 'bspline-deboor-explore', order: 6,
            title: text('Prosto raziskovanje', 'Free exploration'),
            purpose: text('Samostojno vleči točke, spreminjati vozle, stopnjo in parameter ter opazovati trikotnik.', 'Dragging points, changing the knots, the degree and the parameter on your own and watching the triangle.'),
            explanation: text(
                'Spet je privzeta krivulja stopnje \\(2\\) pri \\(t=\\tfrac12\\). Vleci kontrolne točke, dodaj točko, spremeni stopnjo ali vpiši vozel. Poskusi vozle \\((0,0,0,1,1,1)\\) s tremi točkami: trikotnik postane de Casteljaujev.',
                'The default curve of degree \\(2\\) at \\(t=\\tfrac12\\) is back. Drag the control points, add a point, change the degree or type a knot. Try the knots \\((0,0,0,1,1,1)\\) with three points: the triangle becomes de Casteljau\'s.',
            ),
            formulaIds: ['bspline-deboor-recurrence'],
            frames: [frame('bspline-deboor-explore-explanation', 'explanation'), frame('bspline-deboor-explore-observation', 'observation')],
            observationPrompt: text('Preveri, da točka krivulje vedno leži v ovojnici aktivnih točk.', 'Check that the curve point always lies in the hull of the active points.'),
            expectedObservations: [text('Točka krivulje vedno leži v konveksni ovojnici \\(k+1\\) aktivnih točk.', 'The curve point always lies in the convex hull of the \\(k+1\\) active points.')],
            scene: deBoorScene('bspline-deboor-explore-start', DEBOOR_LESSON_POINTS, 0.5, 0,
                'Privzeta krivulja stopnje \\(2\\) pri \\(t=\\tfrac12\\); vse je prosto za raziskovanje.',
                'The default curve of degree \\(2\\) at \\(t=\\tfrac12\\); everything is free to explore.'),
        },
    ],
    sources: [
        {id: 'deboor-1978', citation: 'de Boor, C. A Practical Guide to Splines. Springer (1978).'},
        {id: 'farin-bspline', citation: 'Farin, G. Curves and Surfaces for CAGD, 5th ed., the chapter on B-splines.'},
        {
            id: 'bezeg-bspline-deboor-implementation',
            citation: 'Bezeg source: src/bezeg/impl/curve/bspline/deboor.ts and src/graphs/curves/bspline/DeBoorGraph.tsx.',
            implementationCorrespondence: 'All points and ratios come from the de Boor triangle of the kernel; a lesson scene sets degree, knots and points with a curve fixture, the slider with the parameter action t and the revealed levels with animation deboor next-step.',
        },
    ],
    edgeCases: [
        text('Pri vozlu z večkratnostjo \\(k+1\\) je krivulja lahko nezvezna; točka pri tem vozlu je desna limita.', 'At a knot of multiplicity \\(k+1\\) the curve may be discontinuous; the point at that knot is the right limit.'),
        text('Nepravilen vozelni vektor ali premalo točk program zavrne z razlago in prejšnji prizor ostane.', 'An invalid knot vector or too few points is refused with an explanation and the previous scene stays.'),
    ],
    unresolvedQuestions: [],
};

export const bsplineDeBoorGuidedLessons: readonly GuidedLesson[] = [deBoorLesson];
