/**
 * Guided lesson of the knot insertion Demonstration (docs/specs/b-splines-nurbs-lessons.md, L3). The text is a one-shot draft
 * (docs/specs/new-lesson-families.md, "One-shot lesson text"): every value it quotes is a readout of the scene it belongs to, and
 * `bsplineInsertionGuidedLessons.test.tsx` checks that against the real graph and the kernel in `src/bezeg/impl/curve/bspline`.
 * Scenes are `lesson-fixture` scenes whose fixture carries the degree, the knot vector and the control points, followed by
 * `knot-insertion` actions (`set-comb` the curvature comb, then `insert` a knot value).
 */
import type {LessonAction, LessonCurveFixture, LessonViewBox} from '../model';
import type {GuidedLesson, GuidedLessonFrame, GuidedLessonFrameKind, LessonScene, LocalizedText} from './guidedLessons';

const text = (sl: string, en: string): LocalizedText => ({sl, en});
const frame = (id: string, kind: GuidedLessonFrameKind): GuidedLessonFrame => ({id, kind});

/** The L2 quadratic (the graph's own quadratic example) and the L3 continuity cubic, as in the spec. */
export const INSERTION_QUADRATIC_FIXTURE: LessonCurveFixture = {degree: 2, knots: [0, 0, 0, 1, 2, 2, 2], points: [[0, 0], [1, 2], [3, 2], [4, 0]]};
export const INSERTION_CUBIC_FIXTURE: LessonCurveFixture = {
    degree: 3, knots: [0, 0, 0, 0, 1, 2, 2, 3, 3, 3, 3], points: [[0, 0], [1, 2], [2, 3], [3, 1], [4, 1], [5, 3], [6, 0]],
};

const VIEW: LessonViewBox = [-1.5, 3.5, 6.5, -1.5];

/** An insertion scene: the fixture, the comb on or off, then the knots to insert in order. */
const insertionScene = (id: string, curve: LessonCurveFixture, comb: boolean, inserts: readonly number[], sl: string, en: string): LessonScene => {
    const actions: LessonAction[] = [{kind: 'knot-insertion', operation: 'set-comb', visible: comb}];
    for (const value of inserts) actions.push({kind: 'knot-insertion', operation: 'insert', value});
    return {id, basedOn: 'lesson-fixture', curve, view: VIEW, actions, expectedState: text(sl, en)};
};

const insertionLesson: GuidedLesson = {
    demonstrationId: 'bspline-insertion',
    title: text('Vstavljanje vozla in večkratnost', 'Knot insertion and multiplicity'),
    summary: text(
        'Vstavljanje vozla spremeni kontrolni poligon, krivulje pa ne. Vozel večkratnosti \\(m\\) zniža zveznost na \\(C^{k-m}\\): pri kubični krivulji z dvojnim vozlom ostane tangenta zvezna, ukrivljenost \\(\\kappa\\) pa skoči.',
        'Inserting a knot changes the control polygon but not the curve. A knot of multiplicity \\(m\\) lowers the continuity to \\(C^{k-m}\\): for a cubic with a double knot the tangent stays continuous while the curvature \\(\\kappa\\) jumps.',
    ),
    prerequisites: [
        text('Potrebna sta de Boorov postopek (prejšnja lekcija) in pojem ukrivljenosti \\(\\kappa\\) iz poglavja o ukrivljenosti.', 'Assumes de Boor\'s algorithm (the previous lesson) and the curvature \\(\\kappa\\) from the curvature chapter.'),
    ],
    learningGoals: [
        text('Pojasniš, da vstavljanje vozla doda kontrolno točko in spremeni poligon, krivulja pa ostane ista.', 'Explain that inserting a knot adds a control point and changes the polygon while the curve stays the same.'),
        text('Izračunaš novi točki Boehmovega koraka in ju prepoznaš kot točki prve ravni de Boorovega postopka.', 'Work out the two new points of a Boehm step and recognise them as the level-1 points of de Boor\'s algorithm.'),
        text('Iz večkratnosti vozla napoveš zveznost \\(C^{k-m}\\) in odčitaš skok ukrivljenosti pri dvojnem vozlu.', 'Predict the continuity \\(C^{k-m}\\) from the multiplicity of a knot and read the curvature jump at a double knot.'),
    ],
    formulaBlocks: [
        {
            id: 'bspline-insertion-boehm',
            latex: 'Q_j=(1-\\alpha_j)\\,P_{j-1}+\\alpha_j\\,P_j,\\quad \\alpha_j=\\frac{x-u_j}{u_{j+k}-u_j},\\quad j=s-k+1,\\dots,s',
            notation: text(
                'Vstavljeni vozel \\(x\\) leži na razponu \\([u_s,u_{s+1})\\); ostale kontrolne točke ostanejo, točke \\(P_{s-k+1},\\dots,P_{s-1}\\) pa nadomestijo \\(Q_{s-k+1},\\dots,Q_s\\), kar doda eno točko.',
                'The inserted knot \\(x\\) lies in the span \\([u_s,u_{s+1})\\); the other control points stay, and \\(Q_{s-k+1},\\dots,Q_s\\) replace \\(P_{s-k+1},\\dots,P_{s-1}\\), which adds one point.',
            ),
            explanation: text(
                'Vsaka nova točka leži na daljici med dvema sosednjima starima točkama, kot točka prve ravni de Boorovega postopka. Krivulja se ne spremeni, ker nova baza in nove točke dasta isto vsoto.',
                'Each new point lies on the segment between two neighbouring old points, like a level-1 point of de Boor\'s algorithm. The curve does not change because the new basis and the new points give the same sum.',
            ),
        },
        {
            id: 'bspline-insertion-continuity',
            latex: 'C^{\\,k-m}',
            notation: text(
                'Stopnja je \\(k\\), večkratnost vozla pa \\(m\\).',
                'The degree is \\(k\\) and the multiplicity of the knot is \\(m\\).',
            ),
            explanation: text(
                'Pri vozlu večkratnosti \\(m\\) se ujemajo odvodi do reda \\(k-m\\); odvod reda \\(k-m+1\\) se lahko razlikuje. Pri kubični krivulji z dvojnim vozlom (\\(k=3\\), \\(m=2\\)) se tangenta (prvi odvod) ujema, drugi odvod, s tem pa ukrivljenost \\(\\kappa\\), se lahko razlikuje.',
                'At a knot of multiplicity \\(m\\) the derivatives up to order \\(k-m\\) agree; the derivative of order \\(k-m+1\\) can differ. For a cubic with a double knot (\\(k=3\\), \\(m=2\\)) the tangent (first derivative) agrees while the second derivative, and so the curvature \\(\\kappa\\), can differ.',
            ),
        },
    ],
    workedExamples: [
        {
            id: 'bspline-insertion-half-example',
            title: text('Vstavljanje \\(u=\\tfrac12\\)', 'Inserting \\(u=\\tfrac12\\)'),
            calculationLatex: '\\alpha_1=\\tfrac{1/2-0}{1-0}=\\tfrac12,\\ \\alpha_2=\\tfrac{1/2-0}{2-0}=\\tfrac14',
            resultLatex: 'Q_1=(0{,}5;\\,1),\\ Q_2=(1{,}5;\\,2)',
            check: text(
                'Točka \\(Q_1\\) leži na sredini daljice \\(P_0P_1\\), točka \\(Q_2\\) pa na četrtini daljice \\(P_1P_2\\). To sta točki prve ravni de Boorovega postopka pri \\(t=\\tfrac12\\); točka krivulje \\((1;1{,}5)\\) je sredina daljice med njima.',
                'The point \\(Q_1\\) is the midpoint of \\(P_0P_1\\) and \\(Q_2\\) lies a quarter of the way along \\(P_1P_2\\). They are the level-1 points of de Boor\'s algorithm at \\(t=\\tfrac12\\); the curve point \\((1;1.5)\\) is the midpoint of the segment between them.',
            ),
        },
    ],
    steps: [
        {
            id: 'bspline-insertion-predict', order: 1,
            title: text('Kaj stori vstavljanje vozla?', 'What does inserting a knot do?'),
            purpose: text('Pred razkritjem napovedati, kaj se zgodi s krivuljo in kaj s kontrolnim poligonom, ko vstavimo vozel.', 'Predicting, before the reveal, what happens to the curve and to the control polygon when a knot is inserted.'),
            explanation: text(
                'Krivulja stopnje \\(2\\) ima vozle \\((0,0,0,1,2,2,2)\\) in štiri kontrolne točke. Napovej: kaj se zgodi s krivuljo, ko vstavimo nov vozel, in kaj s kontrolnim poligonom? Krivulja se ne spremeni, kontrolnih točk pa je ena več, ker ima vozelni vektor en vozel več.',
                'The curve of degree \\(2\\) has the knots \\((0,0,0,1,2,2,2)\\) and four control points. Predict: what happens to the curve when a new knot is inserted, and what to the control polygon? The curve does not change, but there is one more control point because the knot vector has one more knot.',
            ),
            formulaIds: ['bspline-insertion-boehm'],
            frames: [frame('bspline-insertion-predict-explanation', 'explanation'), frame('bspline-insertion-predict-observation', 'observation')],
            observationPrompt: text('Preštej kontrolne točke in poglej seznam večkratnosti; po vstavitvi bo točk za eno več.', 'Count the control points and look at the multiplicity list; after an insertion there will be one more point.'),
            expectedObservations: [text('Štiri kontrolne točke in en notranji vozel \\(u=1\\) z večkratnostjo \\(1\\) (zveznost \\(C^1\\)).', 'Four control points and one interior knot \\(u=1\\) of multiplicity \\(1\\) (continuity \\(C^1\\)).')],
            scene: insertionScene('bspline-insertion-predict-start', INSERTION_QUADRATIC_FIXTURE, true, [],
                'Stopnja \\(2\\), vozli \\((0,0,0,1,2,2,2)\\), točke \\((0,0)\\), \\((1,2)\\), \\((3,2)\\), \\((4,0)\\); notranji vozel \\(u=1\\) ima večkratnost \\(1\\).',
                'Degree \\(2\\), knots \\((0,0,0,1,2,2,2)\\), points \\((0,0)\\), \\((1,2)\\), \\((3,2)\\), \\((4,0)\\); the interior knot \\(u=1\\) has multiplicity \\(1\\).'),
        },
        {
            id: 'bspline-insertion-one', order: 2,
            title: text('Vstavi \\(u=1\\)', 'Insert \\(u=1\\)'),
            purpose: text('Pred razkritjem napovedati, kje so nove kontrolne točke, ko vstavimo že obstoječi vozel \\(u=1\\), in opaziti, da je krivulja ista.', 'Predicting, before the reveal, where the new control points are when the existing knot \\(u=1\\) is inserted, and noticing that the curve is the same.'),
            explanation: text(
                'Vstavi vozel \\(u=1\\), ki je že v vozelnem vektorju. Napovej: kje so nove kontrolne točke? Točka \\(P_2=(3;2)\\) se razdeli na \\((2;2)\\) in \\((3;2)\\), zato so točke \\((0;0)\\), \\((1;2)\\), \\((2;2)\\), \\((3;2)\\), \\((4;0)\\). Vozel \\(u=1\\) ima zdaj večkratnost \\(2\\), krivulja pa je natanko ista.',
                'Insert the knot \\(u=1\\), which is already in the knot vector. Predict: where are the new control points? The point \\(P_2=(3;2)\\) splits into \\((2;2)\\) and \\((3;2)\\), so the points are \\((0;0)\\), \\((1;2)\\), \\((2;2)\\), \\((3;2)\\), \\((4;0)\\). The knot \\(u=1\\) now has multiplicity \\(2\\), and the curve is exactly the same.',
            ),
            formulaIds: ['bspline-insertion-boehm'],
            frames: [frame('bspline-insertion-one-explanation', 'explanation'), frame('bspline-insertion-one-observation', 'observation')],
            observationPrompt: text('Primerjaj bledi stari poligon z novim in preveri, da krivulja ostane na istem mestu.', 'Compare the faded old polygon with the new one and check that the curve stays in the same place.'),
            expectedObservations: [text('Pet točk \\((0;0)\\), \\((1;2)\\), \\((2;2)\\), \\((3;2)\\), \\((4;0)\\); krivulja se ni premaknila in skok ukrivljenosti pri \\(u=1\\) je še vedno \\(0\\).', 'Five points \\((0;0)\\), \\((1;2)\\), \\((2;2)\\), \\((3;2)\\), \\((4;0)\\); the curve did not move and the curvature jump at \\(u=1\\) is still \\(0\\).')],
            scene: insertionScene('bspline-insertion-one-knot', INSERTION_QUADRATIC_FIXTURE, true, [1],
                'Vstavljen \\(u=1\\): vozli \\((0,0,0,1,1,2,2,2)\\), točke \\((0,0)\\), \\((1,2)\\), \\((2,2)\\), \\((3,2)\\), \\((4,0)\\); vozel \\(u=1\\) ima večkratnost \\(2\\).',
                'Inserted \\(u=1\\): knots \\((0,0,0,1,1,2,2,2)\\), points \\((0,0)\\), \\((1,2)\\), \\((2,2)\\), \\((3,2)\\), \\((4,0)\\); the knot \\(u=1\\) has multiplicity \\(2\\).'),
        },
        {
            id: 'bspline-insertion-half', order: 3,
            title: text('Vstavi \\(u=\\tfrac12\\)', 'Insert \\(u=\\tfrac12\\)'),
            purpose: text('Pred razkritjem napovedati novi kontrolni točki pri vstavitvi \\(u=\\tfrac12\\) in ju primerjati z ravnjo de Boorovega postopka.', 'Predicting, before the reveal, the two new control points when \\(u=\\tfrac12\\) is inserted and comparing them with the de Boor level.'),
            explanation: text(
                'Spet začni z izvirno krivuljo in vstavi \\(u=\\tfrac12\\). Napovej: kje sta novi točki? Dobimo vozle \\((0,0,0,\\tfrac12,1,2,2,2)\\) in točke \\((0;0)\\), \\((0{,}5;1)\\), \\((1{,}5;2)\\), \\((3;2)\\), \\((4;0)\\). Točki \\((0{,}5;1)\\) in \\((1{,}5;2)\\) sta točki prve ravni de Boorovega postopka pri \\(t=\\tfrac12\\), točka krivulje \\((1;1{,}5)\\) pa leži na daljici med njima.',
                'Start again from the original curve and insert \\(u=\\tfrac12\\). Predict: where are the two new points? The knots become \\((0,0,0,\\tfrac12,1,2,2,2)\\) and the points \\((0;0)\\), \\((0.5;1)\\), \\((1.5;2)\\), \\((3;2)\\), \\((4;0)\\). The points \\((0.5;1)\\) and \\((1.5;2)\\) are the level-1 points of de Boor\'s algorithm at \\(t=\\tfrac12\\), and the curve point \\((1;1.5)\\) lies on the segment between them.',
            ),
            formulaIds: ['bspline-insertion-boehm'], workedExampleId: 'bspline-insertion-half-example',
            frames: [frame('bspline-insertion-half-explanation', 'explanation'), frame('bspline-insertion-half-calculation', 'calculation'), frame('bspline-insertion-half-observation', 'observation')],
            observationPrompt: text('Preveri, da bledi poligon vsebuje staro točko \\(P_1=(1;2)\\), ki jo novi poligon nadomesti s \\(Q_1\\) in \\(Q_2\\).', 'Check that the faded polygon contains the old point \\(P_1=(1;2)\\), which the new polygon replaces by \\(Q_1\\) and \\(Q_2\\).'),
            expectedObservations: [text('Pet točk; vozla \\(u=\\tfrac12\\) in \\(u=1\\) imata vsak večkratnost \\(1\\); krivulja je ista kot prej.', 'Five points; the knots \\(u=\\tfrac12\\) and \\(u=1\\) each have multiplicity \\(1\\); the curve is the same as before.')],
            scene: insertionScene('bspline-insertion-half-knot', INSERTION_QUADRATIC_FIXTURE, true, [0.5],
                'Vstavljen \\(u=\\tfrac12\\): vozli \\((0,0,0,\\tfrac12,1,2,2,2)\\), točke \\((0,0)\\), \\((0{,}5;1)\\), \\((1{,}5;2)\\), \\((3,2)\\), \\((4,0)\\).',
                'Inserted \\(u=\\tfrac12\\): knots \\((0,0,0,\\tfrac12,1,2,2,2)\\), points \\((0,0)\\), \\((0.5;1)\\), \\((1.5;2)\\), \\((3,2)\\), \\((4,0)\\).'),
        },
        {
            id: 'bspline-insertion-double', order: 4,
            title: text('Enojni in dvojni vozel pri kubični krivulji', 'A simple and a double knot on the cubic'),
            purpose: text('Pred razkritjem napovedati, kateri odvod se lahko pri dvojnem vozlu prelomi, in primerjati dvojni vozel \\(u=2\\) z enojnim \\(u=1\\).', 'Predicting, before the reveal, which derivative can break at a double knot, and comparing the double knot \\(u=2\\) with the simple knot \\(u=1\\).'),
            explanation: text(
                'Preklopi na kubični primer. Vozel \\(u=2\\) je že dvojni, vozel \\(u=1\\) pa enojni; dvojnega vozla z vstavljanjem ne dobiš, ker privzete točke niso rezultat take vstavitve. Napovej: kateri odvod se lahko prelomi pri dvojnem vozlu? Pri \\(k=3\\) in \\(m=2\\) je zveznost \\(C^{k-m}=C^1\\): tangenta se ujema, drugi odvod, s tem pa ukrivljenost \\(\\kappa\\), se lahko razlikuje. Pri enojnem vozlu je zveznost \\(C^2\\).',
                'Switch to the cubic example. The knot \\(u=2\\) is already double and the knot \\(u=1\\) is simple; inserting does not create the double knot, because the default points are not the result of such an insertion. Predict: which derivative can break at a double knot? For \\(k=3\\) and \\(m=2\\) the continuity is \\(C^{k-m}=C^1\\): the tangent agrees, while the second derivative, and so the curvature \\(\\kappa\\), can differ. At the simple knot the continuity is \\(C^2\\).',
            ),
            formulaIds: ['bspline-insertion-continuity'],
            frames: [frame('bspline-insertion-double-explanation', 'explanation'), frame('bspline-insertion-double-observation', 'observation')],
            observationPrompt: text('Preberi seznam večkratnosti: kateri vozel ima katero zveznost?', 'Read the multiplicity list: which knot has which continuity?'),
            expectedObservations: [text('Vozel \\(u=1\\) ima večkratnost \\(1\\) in zveznost \\(C^2\\), vozel \\(u=2\\) večkratnost \\(2\\) in zveznost \\(C^1\\).', 'The knot \\(u=1\\) has multiplicity \\(1\\) and continuity \\(C^2\\), the knot \\(u=2\\) multiplicity \\(2\\) and continuity \\(C^1\\).')],
            scene: insertionScene('bspline-insertion-double-cubic', INSERTION_CUBIC_FIXTURE, false, [],
                'Kubična krivulja z vozli \\((0,0,0,0,1,2,2,3,3,3,3)\\) in sedmimi točkami; \\(u=1\\) je enojni, \\(u=2\\) dvojni vozel; glavnik je skrit.',
                'The cubic with the knots \\((0,0,0,0,1,2,2,3,3,3,3)\\) and seven points; \\(u=1\\) is a simple and \\(u=2\\) a double knot; the comb is hidden.'),
        },
        {
            id: 'bspline-insertion-comb', order: 5,
            title: text('Glavnik ukrivljenosti in skok', 'The curvature comb and the jump'),
            purpose: text('Pred razkritjem napovedati, kje glavnik ukrivljenosti skoči, in odčitati ukrivljenost na obeh straneh vozla.', 'Predicting, before the reveal, where the curvature comb jumps, and reading the curvature on both sides of a knot.'),
            explanation: text(
                'Pokaži glavnik ukrivljenosti. Napovej: pri katerem vozlu glavnik skoči? Pri enojnem vozlu \\(u=1\\) je \\(\\kappa=-1{,}4311\\) na obeh straneh. Pri dvojnem vozlu \\(u=2\\) skoči z \\(\\tfrac83\\approx2{,}6667\\) na \\(\\tfrac{16}3\\approx5{,}3333\\), tangenta \\((1{,}5;0)\\) pa je na obeh straneh ista.',
                'Show the curvature comb. Predict: at which knot does the comb jump? At the simple knot \\(u=1\\) we have \\(\\kappa=-1.4311\\) on both sides. At the double knot \\(u=2\\) it jumps from \\(\\tfrac83\\approx2.6667\\) to \\(\\tfrac{16}3\\approx5.3333\\), while the tangent \\((1.5;0)\\) is the same on both sides.',
            ),
            formulaIds: ['bspline-insertion-continuity'],
            frames: [frame('bspline-insertion-comb-explanation', 'explanation'), frame('bspline-insertion-comb-observation', 'observation')],
            observationPrompt: text('Preberi seznam skokov ukrivljenosti v vozlih in poišči vrstico, kjer skok ni \\(0\\).', 'Read the list of curvature jumps at the knots and find the row where the jump is not \\(0\\).'),
            expectedObservations: [text('Pri \\(u=1\\) je skok \\(0\\); pri \\(u=2\\) je skok \\(2{,}6667\\) in tangenta je zvezna.', 'At \\(u=1\\) the jump is \\(0\\); at \\(u=2\\) the jump is \\(2.6667\\) and the tangent is continuous.')],
            scene: insertionScene('bspline-insertion-comb-cubic', INSERTION_CUBIC_FIXTURE, true, [],
                'Ista kubična krivulja z glavnikom: \\(\\kappa\\) pri \\(u=1\\) je \\(-1{,}4311\\) na obeh straneh, pri \\(u=2\\) skoči z \\(2{,}6667\\) na \\(5{,}3333\\).',
                'The same cubic with the comb: \\(\\kappa\\) at \\(u=1\\) is \\(-1.4311\\) on both sides, and at \\(u=2\\) it jumps from \\(2.6667\\) to \\(5.3333\\).'),
        },
        {
            id: 'bspline-insertion-explore', order: 6,
            title: text('Prosto raziskovanje', 'Free exploration'),
            purpose: text('Samostojno vstavljati vozle, vleči točke in opazovati poligon, večkratnosti ter glavnik.', 'Inserting knots, dragging points and watching the polygon, the multiplicities and the comb on your own.'),
            explanation: text(
                'Spet je privzeta kvadratna krivulja. Vstavi vozel, vstavi ga še enkrat, dokler ne doseže največje večkratnosti, ali vpiši vrednost zunaj definicijskega območja in preberi razlog za zavrnitev. Gumb Nazaj na primer vrne začetne vozle in točke.',
                'The default quadratic curve is back. Insert a knot, insert it again until it reaches the largest multiplicity, or type a value outside the domain and read the reason for the refusal. The Back to the example button returns to the original knots and points.',
            ),
            formulaIds: ['bspline-insertion-boehm', 'bspline-insertion-continuity'],
            frames: [frame('bspline-insertion-explore-explanation', 'explanation'), frame('bspline-insertion-explore-observation', 'observation')],
            observationPrompt: text('Preveri, da vstavljanje nikoli ne spremeni krivulje, večkratnost pa le zniža zveznost v vozlu.', 'Check that inserting never changes the curve, while the multiplicity only lowers the continuity at the knot.'),
            expectedObservations: [text('Krivulja ostane enaka; večji \\(m\\) pomeni nižjo zveznost \\(C^{k-m}\\).', 'The curve stays the same; a larger \\(m\\) means a lower continuity \\(C^{k-m}\\).')],
            scene: insertionScene('bspline-insertion-explore-start', INSERTION_QUADRATIC_FIXTURE, true, [],
                'Privzeta kvadratna krivulja z vozli \\((0,0,0,1,2,2,2)\\); vse je prosto za raziskovanje.',
                'The default quadratic curve with the knots \\((0,0,0,1,2,2,2)\\); everything is free to explore.'),
        },
    ],
    sources: [
        {id: 'boehm-1980', citation: 'Boehm, W. Inserting new knots into B-spline curves. Computer-Aided Design 12 (1980), 199-201.'},
        {id: 'farin-bspline', citation: 'Farin, G. Curves and Surfaces for CAGD, 5th ed., the chapter on B-splines.'},
        {
            id: 'bezeg-bspline-insertion-implementation',
            citation: 'Bezeg source: src/bezeg/impl/curve/bspline/ and src/graphs/curves/bspline/BSplineInsertionGraph.tsx.',
            implementationCorrespondence: 'The inserted points come from the kernel\'s insertKnot and the curvature on each side of a knot from the per-span sources; a lesson scene sets degree, knots and points with a curve fixture, inserts a knot with the knot-insertion action insert and shows or hides the comb with set-comb.',
        },
    ],
    edgeCases: [
        text('Vozel zunaj definicijskega območja ali nad večkratnostjo \\(k+1\\) program zavrne z razlago in nič se ne spremeni.', 'A knot outside the domain or above the multiplicity \\(k+1\\) is refused with an explanation and nothing changes.'),
        text('Večkratnost \\(m\\) daje zveznost \\(C^{k-m}\\) kot splošno oceno; pri posebnih legah točk je krivulja lahko gladkejša.', 'The multiplicity \\(m\\) gives \\(C^{k-m}\\) as the general bound; for special positions of the points the curve can be smoother.'),
    ],
    unresolvedQuestions: [],
};

export const bsplineInsertionGuidedLessons: readonly GuidedLesson[] = [insertionLesson];
