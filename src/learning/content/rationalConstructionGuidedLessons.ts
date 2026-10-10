import type {
    ContentSource,
    GuidedLesson,
    GuidedLessonFrame,
    GuidedLessonStep,
    LearnerInteraction,
    LessonScene,
    LocalizedText,
    SceneAction,
    SceneActionValue,
    SupportedSceneActionName,
} from './guidedLessons';
import type {FormulaBlock, WorkedExample} from './guidedLessons';

/**
 * Cohort E lessons for `decasteljau-alternative`, `farin` and `circle`.
 *
 * Subject source: K. Štampar, "Orodje za grafični prikaz lastnosti Bézierjevih in PH krivulj",
 * master's thesis, University of Ljubljana (FMF/FRI), 2024 (thesis page p is PDF page p + 10).
 * The circle lesson is not in the thesis; it uses the standard rational quadratic arc.
 */

const text = (sl: string, en: string): LocalizedText => ({sl, en});

const sceneActionOf = (name: SupportedSceneActionName, value: SceneActionValue): SceneAction => ({name, value});
const decasteljauT = (value: number): SceneAction => ({name: 'set-decasteljau-parameter', value});

const scene = (id: string, actions: readonly SceneAction[], sl: string, en: string): LessonScene => ({
    id,
    basedOn: 'demonstration-default',
    actions,
    expectedState: text(sl, en),
});

type StepSpec = Readonly<{
    id: string;
    order: number;
    title: LocalizedText;
    purpose: LocalizedText;
    explanation: LocalizedText;
    formulaIds: readonly string[];
    workedExampleId?: string;
    learnerInteraction: LearnerInteraction;
    observationPrompt: LocalizedText;
    expectedObservations: readonly LocalizedText[];
    scene: LessonScene;
}>;

/** Builds the linear Explanation -> (Calculation) -> Observation frame rhythm of a step. */
const step = (spec: StepSpec): GuidedLessonStep => {
    const frames: GuidedLessonFrame[] = [{id: `${spec.id}-explanation`, kind: 'explanation'}];
    if (spec.workedExampleId) frames.push({id: `${spec.id}-calculation`, kind: 'calculation'});
    frames.push({id: `${spec.id}-observation`, kind: 'observation'});
    return {...spec, frames};
};

const thesisSource = (supports: readonly string[], implementationCorrespondence?: string): ContentSource => ({
    id: 'stampar-thesis-2024',
    citation: 'Štampar, K. Orodje za grafični prikaz lastnosti Bézierjevih in PH krivulj, magistrsko delo, Univerza v Ljubljani, FMF/FRI, 2024.',
    supports,
    ...(implementationCorrespondence ? {implementationCorrespondence} : {}),
});

const farinSource = (supports: readonly string[]): ContentSource => ({
    id: 'farin-cagd-rational',
    citation: 'Farin, G. Curves and Surfaces for CAGD: A Practical Guide, 5th ed., Morgan Kaufmann, 2002.',
    supports,
});

// ---------------------------------------------------------------------------------------------
// decasteljau-alternative
// ---------------------------------------------------------------------------------------------

const alternativeFormulas: readonly FormulaBlock[] = [
    {
        id: 'da-recursion',
        latex: 'B_{[p_0,\\dots,p_n]}(t)=(1-t)\\,B_{[p_0,\\dots,p_{n-1}]}(t)+t\\,B_{[p_1,\\dots,p_n]}(t)',
        notation: text(
            '\\(B_{[p_0,\\dots,p_n]}\\) je Bézierjeva krivulja s kontrolnimi točkami \\(p_0,\\dots,p_n\\); desni krivulji imata po eno kontrolno točko manj.',
            'The curve \\(B_{[p_0,\\dots,p_n]}\\) is the Bézier curve with control points \\(p_0,\\dots,p_n\\); the two curves on the right have one control point fewer.',
        ),
        explanation: text(
            'Točka krivulje stopnje \\(n\\) je pri vsakem \\(t\\) tehtano povprečje dveh točk krivulj stopnje \\(n-1\\) (Izrek 2.13, str. 8).',
            'A point of a degree \\(n\\) curve is, for every \\(t\\), a weighted average of two points of degree \\(n-1\\) curves (Theorem 2.13, p. 8).',
        ),
    },
    {
        id: 'da-quartic',
        latex: 'B(t)=(1-t)\\,C_1(t)+t\\,C_2(t),\\qquad C_1=B_{[p_0,p_1,p_2,p_3]},\\quad C_2=B_{[p_1,p_2,p_3,p_4]}',
        notation: text(
            'Privzeta krivulja ima pet kontrolnih točk, torej je stopnje 4; \\(C_1\\) in \\(C_2\\) sta pomožni kubični krivulji, ki ju graf nariše.',
            'The default curve has five control points, so it has degree 4; \\(C_1\\) and \\(C_2\\) are the two helper cubic curves that the graph draws.',
        ),
        explanation: text(
            'Daljica med točkama \\(C_1(t)\\) in \\(C_2(t)\\) vsebuje točko \\(B(t)\\); razmerje delov je \\(t:(1-t)\\).',
            'The segment between \\(C_1(t)\\) and \\(C_2(t)\\) contains the point \\(B(t)\\); it splits it in the ratio \\(t:(1-t)\\).',
        ),
    },
    {
        id: 'da-scheme-link',
        latex: 'p_i^r(t)=B_{[p_i,\\dots,p_{i+r}]}(t),\\qquad p_0^n(t)=(1-t)\\,p_0^{n-1}(t)+t\\,p_1^{n-1}(t)',
        notation: text(
            'Točke \\(p_i^r(t)\\) so vmesne točke običajne De Casteljaujeve sheme (str. 9).',
            'The points \\(p_i^r(t)\\) are the intermediate points of the ordinary de Casteljau scheme (p. 9).',
        ),
        explanation: text(
            'Zadnji korak sheme je prav ta rekurzija: točki \\(p_0^{n-1}(t)\\) in \\(p_1^{n-1}(t)\\) sta točki obeh pomožnih krivulj.',
            'The last step of the scheme is exactly this recursion: \\(p_0^{n-1}(t)\\) and \\(p_1^{n-1}(t)\\) are the points of the two helper curves.',
        ),
    },
];

const alternativeExamples: readonly WorkedExample[] = [
    {
        id: 'da-half',
        title: text('Primer: \\(t=\\tfrac12\\)', 'Example: \\(t=\\tfrac12\\)'),
        calculationLatex: 'p=(-4,-3),(-3,2),(0,3),(3,2),(4,-3);\\quad C_1\\bigl(\\tfrac12\\bigr)=\\tfrac18\\,(p_0+3p_1+3p_2+p_3)=\\bigl(-\\tfrac54,\\tfrac74\\bigr);\\quad C_2\\bigl(\\tfrac12\\bigr)=\\tfrac18\\,(p_1+3p_2+3p_3+p_4)=\\bigl(\\tfrac54,\\tfrac74\\bigr)',
        resultLatex: 'B\\bigl(\\tfrac12\\bigr)=\\tfrac12\\,C_1\\bigl(\\tfrac12\\bigr)+\\tfrac12\\,C_2\\bigl(\\tfrac12\\bigr)=\\bigl(0,\\tfrac74\\bigr)',
        check: text(
            'Pomožni točki \\(\\bigl(-\\tfrac54,\\tfrac74\\bigr)\\) in \\(\\bigl(\\tfrac54,\\tfrac74\\bigr)\\) sta zrcalni sliki, zato je \\(B(\\tfrac12)\\) na njuni sredini, na simetrijski osi.',
            'The helper points \\(\\bigl(-\\tfrac54,\\tfrac74\\bigr)\\) and \\(\\bigl(\\tfrac54,\\tfrac74\\bigr)\\) are mirror images, so \\(B(\\tfrac12)\\) is at their midpoint, on the symmetry axis.',
        ),
    },
    {
        id: 'da-quarter',
        title: text('Primer: \\(t=\\tfrac14\\)', 'Example: \\(t=\\tfrac14\\)'),
        calculationLatex: 'C_1\\bigl(\\tfrac14\\bigr)=\\tfrac1{64}\\,(27p_0+27p_1+9p_2+p_3)=\\bigl(-\\tfrac{93}{32},\\tfrac1{32}\\bigr);\\quad C_2\\bigl(\\tfrac14\\bigr)=\\tfrac1{64}\\,(27p_1+27p_2+9p_3+p_4)=\\bigl(-\\tfrac{25}{32},\\tfrac{75}{32}\\bigr)',
        resultLatex: 'B\\bigl(\\tfrac14\\bigr)=\\tfrac34\\,C_1\\bigl(\\tfrac14\\bigr)+\\tfrac14\\,C_2\\bigl(\\tfrac14\\bigr)=\\bigl(-\\tfrac{19}{8},\\tfrac{39}{64}\\bigr)',
        check: text(
            'Decimalno: \\(C_1\\approx(-2{,}906;\\ 0{,}031)\\), \\(C_2\\approx(-0{,}781;\\ 2{,}344)\\), \\(B\\approx(-2{,}375;\\ 0{,}609)\\). Točka \\(B\\) je bliže \\(C_1\\), ker je \\(t<\\tfrac12\\).',
            'In decimals: \\(C_1\\approx(-2.906,\\ 0.031)\\), \\(C_2\\approx(-0.781,\\ 2.344)\\), \\(B\\approx(-2.375,\\ 0.609)\\). The point \\(B\\) is nearer to \\(C_1\\) because \\(t<\\tfrac12\\).',
        ),
    },
];

const decasteljauAlternative: GuidedLesson = {
    demonstrationId: 'decasteljau-alternative',
    title: text('Alternativna De Casteljaujeva rekurzija', 'The alternative de Casteljau recursion'),
    summary: text(
        'Točko Bézierjeve krivulje stopnje \\(n\\) dobimo kot tehtano povprečje točk dveh krivulj stopnje \\(n-1\\): prva uporabi vse kontrolne točke razen zadnje, druga vse razen prve. Graf to pokaže na krivulji stopnje 4 z dvema pomožnima kubičnima krivuljama.',
        'A point of a Bézier curve of degree \\(n\\) is a weighted average of points of two curves of degree \\(n-1\\): the first uses all control points except the last, the second all except the first. The graph shows this on a degree 4 curve with two helper cubic curves.',
    ),
    prerequisites: [
        text('Potrebno je poznavanje Bézierjeve krivulje \\(B(t)\\) in običajne De Casteljaujeve sheme.', 'Assumes familiarity with a Bézier curve \\(B(t)\\) and the ordinary de Casteljau scheme.'),
        text('Priporočeno je, da znaš izračunati točko kubične krivulje z Bernsteinovimi polinomi.', 'It helps to know how to evaluate a point of a cubic curve with Bernstein polynomials.'),
    ],
    learningGoals: [
        text('Zapišeš rekurzivno zvezo iz Izreka 2.13 in poveš, katere kontrolne točke uporabljata obe krivulji nižje stopnje.', 'Write the recursion of Theorem 2.13 and state which control points the two lower degree curves use.'),
        text('Izračunaš točko krivulje stopnje 4 pri danem \\(t\\) iz točk obeh pomožnih kubičnih krivulj.', 'Compute a point of the degree 4 curve at a given \\(t\\) from the points of the two helper cubic curves.'),
        text('Povežeš to rekurzijo z zadnjim korakom običajne De Casteljaujeve sheme.', 'Connect this recursion with the last step of the ordinary de Casteljau scheme.'),
    ],
    formulaBlocks: alternativeFormulas,
    workedExamples: alternativeExamples,
    steps: [
        step({
            id: 'da-two-cubics', order: 1,
            title: text('Krivulja stopnje 4 in dve kubični', 'A quartic and two cubics'),
            purpose: text('Spoznati pomožni krivulji in njuni kontrolni točki.', 'Meeting the two helper curves and their control points.'),
            explanation: text(
                'Privzeta krivulja ima pet kontrolnih točk \\(p_0,\\dots,p_4\\). Prva pomožna kubična krivulja uporabi \\(p_0,\\dots,p_3\\), druga \\(p_1,\\dots,p_4\\). Graf ju nariše v različnih barvah, med njunima točkama pri izbranem \\(t\\) pa potegne daljico.',
                'The default curve has five control points \\(p_0,\\dots,p_4\\). The first helper cubic curve uses \\(p_0,\\dots,p_3\\), the second \\(p_1,\\dots,p_4\\). The graph draws them in different colors and, at the chosen \\(t\\), draws a segment between their points.',
            ),
            formulaIds: ['da-quartic'],
            learnerInteraction: 'observe',
            observationPrompt: text('Poišči obe pomožni krivulji in daljico med njunima točkama; ugotovi, kje na daljici leži točka krivulje stopnje 4.', 'Find both helper curves and the segment between their points; decide where on the segment the point of the degree 4 curve lies.'),
            expectedObservations: [text('Vidni sta dve kubični krivulji, daljica med njunima točkama in točka glavne krivulje na tej daljici.', 'Two cubic curves are visible, a segment between their points, and the point of the main curve on that segment.')],
            scene: scene('da-default', [], 'Privzeta krivulja stopnje 4 z obema pomožnima krivuljama pri \\(t=\\tfrac12\\).', 'The default degree 4 curve with both helper curves at \\(t=\\tfrac12\\).'),
        }),
        step({
            id: 'da-recursion-half', order: 2,
            title: text('Rekurzija pri \\(t=\\tfrac12\\)', 'The recursion at \\(t=\\tfrac12\\)'),
            purpose: text('Izračunati točko krivulje iz točk obeh pomožnih krivulj.', 'Computing the curve point from the points of both helper curves.'),
            explanation: text(
                'Izrek 2.13 pravi, da je \\(B(t)=(1-t)\\,C_1(t)+t\\,C_2(t)\\). Pri \\(t=\\tfrac12\\) sta uteži enaki, torej je točka \\(B\\) na sredini daljice med \\(C_1\\) in \\(C_2\\).',
                'Theorem 2.13 says \\(B(t)=(1-t)\\,C_1(t)+t\\,C_2(t)\\). At \\(t=\\tfrac12\\) the weights are equal, so the point \\(B\\) is at the midpoint of the segment between \\(C_1\\) and \\(C_2\\).',
            ),
            formulaIds: ['da-recursion', 'da-quartic'],
            workedExampleId: 'da-half',
            learnerInteraction: 'observe',
            observationPrompt: text('Preveri na grafu, da je glavna točka na sredini daljice med pomožnima točkama.', 'Check on the graph that the main point is at the middle of the segment between the helper points.'),
            expectedObservations: [text('Pomožni točki sta na isti višini in glavna točka je na sredini med njima, na simetrijski osi.', 'The helper points are at the same height and the main point is midway between them, on the symmetry axis.')],
            scene: scene('da-half', [decasteljauT(0.5)], 'Parameter je \\(t=\\tfrac12\\).', 'The parameter is \\(t=\\tfrac12\\).'),
        }),
        step({
            id: 'da-recursion-quarter', order: 3,
            title: text('Neenaki uteži pri \\(t=\\tfrac14\\)', 'Unequal weights at \\(t=\\tfrac14\\)'),
            purpose: text('Videti, da utež \\(1-t\\) in utež \\(t\\) premakneta točko po daljici.', 'Seeing that the weights \\(1-t\\) and \\(t\\) slide the point along the segment.'),
            explanation: text(
                'Pri \\(t=\\tfrac14\\) ima prva pomožna točka utež \\(\\tfrac34\\), druga le \\(\\tfrac14\\), zato je \\(B\\) bliže točki \\(C_1\\). Razdalja od \\(C_1\\) do \\(B\\) je \\(t\\)-krat dolžina daljice.',
                'At \\(t=\\tfrac14\\) the first helper point has weight \\(\\tfrac34\\) and the second only \\(\\tfrac14\\), so \\(B\\) is nearer to \\(C_1\\). The distance from \\(C_1\\) to \\(B\\) is \\(t\\) times the length of the segment.',
            ),
            formulaIds: ['da-quartic'],
            workedExampleId: 'da-quarter',
            learnerInteraction: 'adjust-construction-parameter',
            observationPrompt: text('Premakni drsnik \\(t\\) in spremljaj, kako glavna točka drsi po daljici od \\(C_1\\) proti \\(C_2\\).', 'Move the \\(t\\) slider and watch the main point slide along the segment from \\(C_1\\) toward \\(C_2\\).'),
            expectedObservations: [text('Pri \\(t=\\tfrac14\\) je glavna točka na četrtini daljice, od prve pomožne točke gledano.', 'At \\(t=\\tfrac14\\) the main point is a quarter of the way along the segment, seen from the first helper point.')],
            scene: scene('da-quarter', [decasteljauT(0.25)], 'Parameter je \\(t=\\tfrac14\\).', 'The parameter is \\(t=\\tfrac14\\).'),
        }),
        step({
            id: 'da-symmetry', order: 4,
            title: text('Zrcalna slika pri \\(t=\\tfrac34\\)', 'The mirror image at \\(t=\\tfrac34\\)'),
            purpose: text('Uporabiti simetrijo privzete krivulje za napoved.', 'Using the symmetry of the default curve to predict a result.'),
            explanation: text(
                'Točke \\(p_0,\\dots,p_4\\) so simetrične glede na os \\(y\\), zato je \\(C_2(\\tfrac34)\\) zrcalna slika točke \\(C_1(\\tfrac14)\\) in obratno. Točka \\(B(\\tfrac34)\\) je zrcalna slika točke \\(B(\\tfrac14)\\), torej približno \\((2{,}375;\\ 0{,}609)\\).',
                'The points \\(p_0,\\dots,p_4\\) are symmetric about the \\(y\\)-axis, so \\(C_2(\\tfrac34)\\) is the mirror image of \\(C_1(\\tfrac14)\\) and vice versa. The point \\(B(\\tfrac34)\\) is the mirror image of \\(B(\\tfrac14)\\), that is about \\((2.375,\\ 0.609)\\).',
            ),
            formulaIds: ['da-quartic'],
            learnerInteraction: 'adjust-construction-parameter',
            observationPrompt: text('Primerjaj sliko s prejšnjim korakom: kam sta se preselili obe pomožni točki in glavna točka?', 'Compare the picture with the previous step: where did the two helper points and the main point move?'),
            expectedObservations: [text('Slika je zrcalna slika prejšnje, glavna točka je desno od osi in bliže drugi pomožni točki.', 'The picture is the mirror image of the previous one; the main point is right of the axis and nearer to the second helper point.')],
            scene: scene('da-three-quarters', [decasteljauT(0.75)], 'Parameter je \\(t=\\tfrac34\\).', 'The parameter is \\(t=\\tfrac34\\).'),
        }),
        step({
            id: 'da-scheme-connection', order: 5,
            title: text('Zadnji korak sheme', 'The last step of the scheme'),
            purpose: text('Povezati alternativno rekurzijo z običajno De Casteljaujevo shemo.', 'Connecting the alternative recursion to the ordinary de Casteljau scheme.'),
            explanation: text(
                'V običajni shemi je \\(p_i^r(t)=B_{[p_i,\\dots,p_{i+r}]}(t)\\) in \\(p_0^n(t)=(1-t)\\,p_0^{n-1}(t)+t\\,p_1^{n-1}(t)\\). Pri \\(n=4\\) sta \\(p_0^3(t)=C_1(t)\\) in \\(p_1^3(t)=C_2(t)\\) predzadnja vrstica sheme: pomožni točki sta torej točki iz predzadnje vrstice, ena rekurzivna stopnja pa je zadnji korak sheme.',
                'In the ordinary scheme \\(p_i^r(t)=B_{[p_i,\\dots,p_{i+r}]}(t)\\) and \\(p_0^n(t)=(1-t)\\,p_0^{n-1}(t)+t\\,p_1^{n-1}(t)\\). For \\(n=4\\), \\(p_0^3(t)=C_1(t)\\) and \\(p_1^3(t)=C_2(t)\\) form the second to last row of the scheme: the helper points are the points of that row, and one level of recursion is the last step of the scheme.',
            ),
            formulaIds: ['da-scheme-link'],
            learnerInteraction: 'observe',
            observationPrompt: text('Pomisli, kako bi bila vsaka pomožna krivulja spet razstavljena na dve krivulji stopnje 2, in koliko kontrolnih točk uporabi vsaka.', 'Think about how each helper curve would again split into two curves of degree 2, and how many control points each uses.'),
            expectedObservations: [text('Vsaka kubična krivulja bi se razstavila na dve kvadratni, ta postopek pa ponavlja običajna shema vse do ene same točke.', 'Each cubic curve would split into two quadratic ones, and the ordinary scheme repeats this process down to a single point.')],
            scene: scene('da-scheme', [decasteljauT(0.5)], 'Parameter je spet \\(t=\\tfrac12\\).', 'The parameter is again \\(t=\\tfrac12\\).'),
        }),
    ],
    sources: [
        thesisSource(['Theorem 2.13 (recursion, p. 8)', 'Figure 6 (p. 8)', 'de Casteljau scheme and Algorithm 1 (p. 9)']),
        farinSource(['de Casteljau algorithm as repeated linear interpolation', 'degree-lowering recursion of Bézier curves']),
        {
            id: 'bezeg-decasteljau-alternative-implementation',
            citation: 'Bezeg source: src/graphs/curves/bezier/DecasteljauGraph2.tsx and src/bezeg/impl/curve/polynomial-bezier-curve.ts.',
            supports: ['default quartic and its two helper cubics', 'parameter slider', 'segment between helper points'],
            implementationCorrespondence: 'generateInterpolatingBezierCurves slices the control points of the first curve at offsets 0 and 1 into two PolynomialBezierCurve helpers of one degree less, and draws the points at the parameter t and the segment between them.',
        },
    ],
    edgeCases: [
        text('Pri \\(t=0\\) sta pomožni točki \\(p_0\\) in \\(p_1\\), pri \\(t=1\\) pa \\(p_3\\) in \\(p_4\\); krivulja se začne in konča v krajiščih, pomožni krivulji pa ne.', 'At \\(t=0\\) the helper points are \\(p_0\\) and \\(p_1\\), at \\(t=1\\) they are \\(p_3\\) and \\(p_4\\); the curve starts and ends at its end points, the helper curves do not.'),
        text('Če premakneš kontrolno točko, se pomožni krivulji pri novem \\(t\\) preračunata, rekurzija pa ostane enaka.', 'If a control point moves, the helper curves are recomputed at the new \\(t\\), while the recursion stays the same.'),
    ],
    unresolvedQuestions: [
        text('Pred classroom-ready pregledom je treba potrditi slovensko poimenovanje »pomožna krivulja« in poimenovanje pripadajočih točk v aplikaciji.', 'Before classroom-ready review, confirm the Slovenian term for the helper curves and the naming of their points in the app.'),
    ],
};

// ---------------------------------------------------------------------------------------------
// farin
// ---------------------------------------------------------------------------------------------

const farinFormulas: readonly FormulaBlock[] = [
    {
        id: 'farin-points',
        latex: 'f_i=\\frac{w_i}{w_i+w_{i+1}}\\,p_i+\\frac{w_{i+1}}{w_i+w_{i+1}}\\,p_{i+1},\\qquad \\frac{\\lVert f_i-p_i\\rVert}{\\lVert f_i-p_{i+1}\\rVert}=\\frac{w_{i+1}}{w_i}',
        notation: text(
            '\\(p_i\\) so kontrolne točke, \\(w_i\\) pozitivne uteži, \\(f_i\\) pa Farinova točka \\(i\\)-te daljice kontrolnega poligona.',
            'The \\(p_i\\) are control points, the \\(w_i\\) positive weights, and \\(f_i\\) is the Farin point of the \\(i\\)-th edge of the control polygon.',
        ),
        explanation: text(
            'Farinova točka deli daljico \\(p_ip_{i+1}\\) v razmerju \\(w_{i+1}:w_i\\) in je bliže točki z večjo utežjo (§3.2, str. 17).',
            'A Farin point divides the edge \\(p_ip_{i+1}\\) in the ratio \\(w_{i+1}:w_i\\) and is nearer to the point with the larger weight (§3.2, p. 17).',
        ),
    },
    {
        id: 'farin-weights',
        latex: 'w_0=1,\\qquad w_{i+1}=w_i\\,\\frac{\\lVert f_i-p_i\\rVert}{\\lVert f_i-p_{i+1}\\rVert}',
        notation: text(
            'Prvo utež lahko brez škode za krivuljo izberemo za 1; ostale sledijo ena za drugo iz Farinovih točk.',
            'The first weight can be chosen as 1 without changing the curve; the others follow one after another from the Farin points.',
        ),
        explanation: text(
            'Premik Farinove točke zato spremeni utež \\(w_{i+1}\\) in vse naslednje uteži (str. 18).',
            'Moving a Farin point therefore changes the weight \\(w_{i+1}\\) and all following weights (p. 18).',
        ),
    },
    {
        id: 'farin-standard-form',
        latex: '\\tilde w_i=\\frac{w_i}{\\sqrt[n]{w_n^{\\,i}\\,w_0^{\\,n-i}}},\\qquad \\varphi(t)=\\frac{t}{\\rho(1-t)+t},\\quad \\rho=\\sqrt[n]{\\frac{w_n}{w_0}}',
        notation: text(
            '\\(n\\) je stopnja krivulje, \\(\\tilde w_i\\) so standardizirane uteži, \\(\\varphi\\) pa preparametrizacija, ki jo uporabi dokaz Izreka 3.2 (str. 16).',
            'Here \\(n\\) is the degree of the curve, the \\(\\tilde w_i\\) are the standardized weights, and \\(\\varphi\\) is the reparameterization used in the proof of Theorem 3.2 (p. 16).',
        ),
        explanation: text(
            'Po standardizaciji velja \\(\\tilde w_0=\\tilde w_n=1\\) (standardna oblika, Opomba 3.4). Krivulja ima iste točke, spremeni se le njena parametrizacija.',
            'After standardization \\(\\tilde w_0=\\tilde w_n=1\\) (standard form, Remark 3.4). The curve has the same points; only its parameterization changes.',
        ),
    },
];

const farinExamples: readonly WorkedExample[] = [
    {
        id: 'farin-default-points',
        title: text('Primer: Farinove točke privzete krivulje', 'Example: the Farin points of the default curve'),
        calculationLatex: 'p=(-4,-3),(-3,3),(3,3),(4,-3),\\quad w=(1,2,1,1);\\quad f_0=\\tfrac13\\,p_0+\\tfrac23\\,p_1,\\ \\ f_1=\\tfrac23\\,p_1+\\tfrac13\\,p_2,\\ \\ f_2=\\tfrac12\\,p_2+\\tfrac12\\,p_3',
        resultLatex: 'f_0=\\bigl(-\\tfrac{10}3,1\\bigr),\\quad f_1=(-1,3),\\quad f_2=\\bigl(\\tfrac72,0\\bigr)',
        check: text(
            'Točka \\(f_0\\) je bliže \\(p_1\\), ker je \\(w_1=2\\) večja od \\(w_0=1\\); točka \\(f_2\\) je na sredini, ker je \\(w_3=w_2\\).',
            'The point \\(f_0\\) is nearer to \\(p_1\\) because \\(w_1=2\\) is larger than \\(w_0=1\\); the point \\(f_2\\) is at the midpoint because \\(w_3=w_2\\).',
        ),
    },
    {
        id: 'farin-recover-weights',
        title: text('Primer: uteži iz Farinovih točk', 'Example: weights from the Farin points'),
        calculationLatex: '\\frac{\\lVert f_0-p_0\\rVert}{\\lVert f_0-p_1\\rVert}=2,\\quad \\frac{\\lVert f_1-p_1\\rVert}{\\lVert f_1-p_2\\rVert}=\\tfrac12,\\quad \\frac{\\lVert f_2-p_2\\rVert}{\\lVert f_2-p_3\\rVert}=1;\\qquad w_1=1\\cdot2,\\ \\ w_2=2\\cdot\\tfrac12,\\ \\ w_3=1\\cdot1',
        resultLatex: 'w=(1,2,1,1)',
        check: text(
            'Dobili smo privzete uteži, torej velja obratna pot: uteži določajo Farinove točke in Farinove točke natanko določajo uteži.',
            'We get the default weights back, so the way also works in reverse: the weights determine the Farin points and the Farin points determine the weights exactly.',
        ),
    },
    {
        id: 'farin-equal-ratios',
        title: text('Primer: uteži \\(1,3,9,27\\)', 'Example: the weights \\(1,3,9,27\\)'),
        calculationLatex: 'w=(1,3,9,27):\\quad f_i=\\tfrac14\\,p_i+\\tfrac34\\,p_{i+1};\\qquad f_0=\\bigl(-\\tfrac{13}4,\\tfrac32\\bigr),\\quad f_1=\\bigl(\\tfrac32,3\\bigr),\\quad f_2=\\bigl(\\tfrac{15}4,-\\tfrac32\\bigr)',
        resultLatex: '\\text{all ratios }w_{i+1}:w_i=3:1,\\quad f_i\\text{ divides }p_ip_{i+1}\\text{ in }3:1',
        check: text(
            'Vse Farinove točke so enako oddaljene od svojih daljic, ker so vsa razmerja \\(w_{i+1}:w_i\\) enaka 3.',
            'All Farin points sit at the same relative place on their edges because every ratio \\(w_{i+1}:w_i\\) equals 3.',
        ),
    },
    {
        id: 'farin-standardize',
        title: text('Primer: standardizacija uteži \\(1,3,9,27\\)', 'Example: standardizing the weights \\(1,3,9,27\\)'),
        calculationLatex: 'n=3,\\ \\rho=\\sqrt[3]{27}=3,\\ \\tilde w_i=\\frac{w_i}{\\sqrt[3]{27^{i}}}=\\frac{3^i}{3^i}=1;\\qquad \\varphi(t)=\\frac{t}{3-2t}',
        resultLatex: '\\tilde w=(1,1,1,1),\\qquad R_w(s)=B\\Bigl(\\frac{3s}{1+2s}\\Bigr),\\quad R_w\\bigl(\\tfrac12\\bigr)=B\\bigl(\\tfrac34\\bigr)=\\bigl(\\tfrac{79}{32},\\tfrac38\\bigr)',
        check: text(
            'Enake uteži dajo polinomsko Bézierjevo krivuljo z istimi kontrolnimi točkami. Točka \\(R_w(\\tfrac12)\\) leži na tej krivulji pri \\(t=\\tfrac34\\), torej krivulja ostane ista, spremeni se le parametrizacija.',
            'Equal weights give the polynomial Bézier curve with the same control points. The point \\(R_w(\\tfrac12)\\) lies on that curve at \\(t=\\tfrac34\\), so the curve stays the same and only the parameterization changes.',
        ),
    },
];

const farinLesson: GuidedLesson = {
    demonstrationId: 'farin',
    title: text('Farinove točke in uteži', 'Farin points and weights'),
    summary: text(
        'Farinove točke so točke na daljicah kontrolnega poligona, ki delijo daljice v razmerju sosednjih uteži. Z njimi uteži racionalne Bézierjeve krivulje urejamo geometrijsko, s standardno obliko pa jih poenotimo, ne da bi se krivulja spremenila.',
        'Farin points are points on the edges of the control polygon that divide the edges in the ratio of neighbouring weights. With them the weights of a rational Bézier curve are edited geometrically, and standard form unifies them without changing the curve.',
    ),
    prerequisites: [
        text('Potrebno je poznavanje racionalne Bézierjeve krivulje z utežmi \\(w_i\\) (Definicija 3.1).', 'Assumes familiarity with a rational Bézier curve with weights \\(w_i\\) (Definition 3.1).'),
        text('Priporočeno je, da veš, kako utež vleče krivuljo proti svoji kontrolni točki.', 'It helps to know how a weight pulls the curve toward its control point.'),
    ],
    learningGoals: [
        text('Izračunaš Farinove točke iz kontrolnih točk in uteži ter iz njih rekurzivno povrneš uteži z \\(w_0=1\\).', 'Compute the Farin points from control points and weights and recover the weights from them recursively with \\(w_0=1\\).'),
        text('Poveš, zakaj imajo enake utežne razmerja geometrijske uteži, na primer \\(1,3,9,27\\).', 'State why equal ratios give geometric weights such as \\(1,3,9,27\\).'),
        text('Pojasniš standardno obliko \\(w_0=w_n=1\\) in da standardizacija krivulje ne premakne, ampak le preparametrizira.', 'Explain standard form \\(w_0=w_n=1\\) and that standardization does not move the curve but only reparameterizes it.'),
    ],
    formulaBlocks: farinFormulas,
    workedExamples: farinExamples,
    steps: [
        step({
            id: 'farin-show-weights', order: 1,
            title: text('Uteži na kontrolnih točkah', 'Weights on the control points'),
            purpose: text('Pogledati privzete uteži in njihov učinek na krivuljo.', 'Looking at the default weights and their effect on the curve.'),
            explanation: text(
                'Racionalna Bézierjeva krivulja ima pri vsaki kontrolni točki utež \\(w_i>0\\). Privzeta krivulja ima uteži \\(1,2,1,1\\): druga kontrolna točka ima dvojno utež in krivuljo vleče bliže k sebi.',
                'A rational Bézier curve has a weight \\(w_i>0\\) at each control point. The default curve has weights \\(1,2,1,1\\): the second control point has double weight and pulls the curve closer to itself.',
            ),
            formulaIds: [],
            learnerInteraction: 'observe',
            observationPrompt: text('Preberi uteži ob kontrolnih točkah in poišči točko z največjo utežjo.', 'Read the weights next to the control points and find the point with the largest weight.'),
            expectedObservations: [text('Ob točkah so vidne uteži \\(1,2,1,1\\); največja utež je pri drugi kontrolni točki, ki krivuljo vleče k sebi.', 'The weights \\(1,2,1,1\\) are shown next to the points; the largest weight is at the second control point, which pulls the curve toward it.')],
            scene: scene('farin-weights', [{name: 'show-weights', value: true}], 'Uteži so prikazane ob kontrolnih točkah; Farinove točke še niso.', 'The weights are shown next to the control points; the Farin points are not yet.'),
        }),
        step({
            id: 'farin-show-points', order: 2,
            title: text('Farinove točke na daljicah', 'Farin points on the edges'),
            purpose: text('Izračunati Farinove točke iz kontrolnih točk in uteži.', 'Computing the Farin points from control points and weights.'),
            explanation: text(
                'Farinova točka \\(f_i\\) leži na daljici \\(p_ip_{i+1}\\) in jo deli v razmerju \\(w_{i+1}:w_i\\) (§3.2, str. 17). Za privzeto krivuljo dobimo \\(f_0\\), \\(f_1\\), \\(f_2\\), kot kaže račun. Ko so Farinove točke prikazane, so kontrolne točke zaklenjene in jih ni mogoče neposredno vleči.',
                'The Farin point \\(f_i\\) lies on the edge \\(p_ip_{i+1}\\) and divides it in the ratio \\(w_{i+1}:w_i\\) (§3.2, p. 17). For the default curve we get \\(f_0\\), \\(f_1\\), \\(f_2\\) as the calculation shows. While Farin points are shown, the control points are locked and cannot be dragged directly.',
            ),
            formulaIds: ['farin-points'],
            workedExampleId: 'farin-default-points',
            learnerInteraction: 'observe',
            observationPrompt: text('Ugotovi, kateri točki daljic je Farinova točka bliže in zakaj je zadnja natanko na sredini.', 'Find which end of each edge the Farin point is nearer to and why the last one sits exactly at the midpoint.'),
            expectedObservations: [text('Prva in druga Farinova točka sta bliže drugi kontrolni točki (z utežjo 2), tretja je na sredini zadnje daljice.', 'The first and the second Farin point are nearer to the second control point (weight 2), and the third is at the midpoint of the last edge.')],
            scene: scene('farin-points', [{name: 'show-weights', value: true}, sceneActionOf('show-farin-points', true)], 'Prikazane so uteži in Farinove točke; kontrolne točke so zaklenjene.', 'The weights and the Farin points are shown; the control points are locked.'),
        }),
        step({
            id: 'farin-recover-weights', order: 3,
            title: text('Uteži iz Farinovih točk', 'Weights from the Farin points'),
            purpose: text('Spoznati, da Farinove točke natanko določajo uteži.', 'Seeing that the Farin points determine the weights exactly.'),
            explanation: text(
                'Ker razmerje \\(\\lVert f_i-p_i\\rVert:\\lVert f_i-p_{i+1}\\rVert\\) je \\(w_{i+1}:w_i\\), lahko pri \\(w_0=1\\) uteži izračunamo ena za drugo: \\(w_{i+1}=w_i\\,\\lVert f_i-p_i\\rVert/\\lVert f_i-p_{i+1}\\rVert\\) (str. 18). Zato premik Farinove točke spremeni utež in tudi vse naslednje.',
                'Since the ratio \\(\\lVert f_i-p_i\\rVert:\\lVert f_i-p_{i+1}\\rVert\\) equals \\(w_{i+1}:w_i\\), with \\(w_0=1\\) the weights can be computed one after another: \\(w_{i+1}=w_i\\,\\lVert f_i-p_i\\rVert/\\lVert f_i-p_{i+1}\\rVert\\) (p. 18). So moving a Farin point changes one weight and all weights after it.',
            ),
            formulaIds: ['farin-weights'],
            workedExampleId: 'farin-recover-weights',
            learnerInteraction: 'drag-control-point',
            observationPrompt: text('Povleci Farinovo točko po njeni daljici in opazuj, kako se spremeni utež ob njej in uteži za njo.', 'Drag a Farin point along its edge and watch how the weight beside it and the weights after it change.'),
            expectedObservations: [text('Ko se Farinova točka približa točki \\(p_{i+1}\\), se utež \\(w_{i+1}\\) poveča in krivulja se približa tej točki.', 'As a Farin point moves toward \\(p_{i+1}\\), the weight \\(w_{i+1}\\) increases and the curve moves toward that point.')],
            scene: scene('farin-recover', [{name: 'show-weights', value: true}, sceneActionOf('show-farin-points', true)], 'Prikazane so uteži in Farinove točke z izhodiščnimi utežmi.', 'The weights and the Farin points are shown with the starting weights.'),
        }),
        step({
            id: 'farin-geometric-weights', order: 4,
            title: text('Enaki premiki Farinovih točk', 'Equal shifts of all Farin points'),
            purpose: text('Videti krivuljo z geometrijskimi utežmi \\(1,3,9,27\\).', 'Seeing the curve with geometric weights \\(1,3,9,27\\).'),
            explanation: text(
                'Če vse Farinove točke premaknemo tako, da vse daljice razdelijo v razmerju \\(3:1\\), so uteži \\(1,3,9,27\\) (Slika 18a, str. 19). Za privzete kontrolne točke so Farinove točke tedaj \\(f_0\\), \\(f_1\\), \\(f_2\\) iz računa. Uteži so zelo različne, a krivulja je videti kot običajna Bézierjeva krivulja.',
                'If all Farin points are moved so that every edge is divided in the ratio \\(3:1\\), the weights are \\(1,3,9,27\\) (Figure 18a, p. 19). For the default control points the Farin points are then \\(f_0\\), \\(f_1\\), \\(f_2\\) from the calculation. The weights are very different, yet the curve looks like an ordinary Bézier curve.',
            ),
            formulaIds: ['farin-points', 'farin-weights'],
            workedExampleId: 'farin-equal-ratios',
            learnerInteraction: 'observe',
            observationPrompt: text('Preberi uteži ob kontrolnih točkah in primerjaj obliko krivulje s privzeto, ki jo druga kontrolna točka vleče navzgor.', 'Read the weights next to the control points and compare the curve shape with the default one, which the second control point pulls upward.'),
            expectedObservations: [text('Uteži so \\(1,3,9,27\\); krivulja ima obliko polinomske Bézierjeve krivulje z istimi kontrolnimi točkami in je nižja kot privzeta, vse Farinove točke pa so na isti relativni legi na svojih daljicah.', 'The weights are \\(1,3,9,27\\); the curve has the shape of the polynomial Bézier curve with the same control points and is lower than the default one, and all Farin points sit at the same relative place on their edges.')],
            scene: scene('farin-geometric', [{name: 'show-weights', value: true}, sceneActionOf('show-farin-points', true), sceneActionOf('set-rational-weights', [1, 3, 9, 27])], 'Uteži so \\(1,3,9,27\\) in Farinove točke so prikazane.', 'The weights are \\(1,3,9,27\\) and the Farin points are shown.'),
        }),
        step({
            id: 'farin-standard-form', order: 5,
            title: text('Standardna oblika', 'Standard form'),
            purpose: text('Standardizirati uteži in preveriti, da se krivulja ne spremeni.', 'Standardizing the weights and checking that the curve does not change.'),
            explanation: text(
                'Izrek 3.2 (str. 16) pravi, da lahko uteži preparametriziramo tako, da je \\(w_0=w_n=1\\); to je standardna oblika. Uteži \\(1,3,9,27\\) postanejo \\(1,1,1,1\\), krivulja pa ostane enaka (Slika 18, str. 19). Privzete uteži \\(1,2,1,1\\) so že standardne.',
                'Theorem 3.2 (p. 16) says the weights can be reparameterized so that \\(w_0=w_n=1\\); this is standard form. The weights \\(1,3,9,27\\) become \\(1,1,1,1\\) and the curve stays the same (Figure 18, p. 19). The default weights \\(1,2,1,1\\) are already standard.',
            ),
            formulaIds: ['farin-standard-form'],
            workedExampleId: 'farin-standardize',
            learnerInteraction: 'observe',
            observationPrompt: text('Primerjaj uteži in obliko krivulje pred standardizacijo in po njej.', 'Compare the weights and the curve shape before and after standardization.'),
            expectedObservations: [text('Uteži so po standardizaciji vse enake 1, oblika krivulje pa je enaka kot prej.', 'After standardization all weights equal 1 and the curve shape is the same as before.')],
            scene: scene('farin-standard', [{name: 'show-weights', value: true}, sceneActionOf('show-farin-points', true), sceneActionOf('set-rational-weights', [1, 3, 9, 27]), sceneActionOf('set-standard-form', true)], 'Standardna oblika je vklopljena; prikazane uteži so \\(1,1,1,1\\).', 'Standard form is on; the displayed weights are \\(1,1,1,1\\).'),
        }),
    ],
    sources: [
        thesisSource(['Definition 3.1 (p. 15)', 'Theorem 3.2 and Remark 3.4 (standard form, p. 16)', 'Section 3.2 Farin points and weight recursion (pp. 17-18)', 'Figures 17 and 18 (p. 19)'], 'RationalBezierCurve.standardize divides w_i by (w_n^i * w_0^(n-i))^(1/n) when standard form is on; JXGRationalBezierCurve.showFarinPoints builds the Farin points and the weights follow from their ratios.'),
        farinSource(['rational Bézier curves and weights', 'Farin points as a geometric weight interface']),
        {
            id: 'bezeg-farin-implementation',
            citation: 'Bezeg source: src/graphs/curves/rational/FarinPointsCurveGraph.tsx, src/graphs/curves/object/JXGRationalBezierCurve.ts and src/bezeg/impl/curve/rational-bezier-curve.ts.',
            supports: ['Farin points switch', 'weights switch', 'standard form switch', 'default weights 1, 2, 1, 1'],
            implementationCorrespondence: 'While Farin points are shown, FarinPointsCurveGraph fixes the control points and disables direct input, so weights change only through the Farin points; getWeights() returns the standardized weights when standard form is on, and the lesson restores the effective weights.',
        },
    ],
    edgeCases: [
        text('Ko so Farinove točke prikazane, kontrolnih točk ni mogoče vleči; za premik kontrolne točke Farinove točke najprej skrij.', 'While Farin points are shown, control points cannot be dragged; hide the Farin points first to move a control point.'),
        text('Vse uteži morajo biti končne in pozitivne; z \\(w_i\\le0\\) Farinove točke in razmerja niso več smiselni.', 'All weights must be finite and positive; with \\(w_i\\le0\\) the Farin points and ratios are no longer meaningful.'),
        text('Standardna oblika spremeni le prikazane uteži in parametrizacijo, ne oblike krivulje; pri \\(w_0=w_n=1\\) ni nobene spremembe.', 'Standard form changes only the displayed weights and the parameterization, not the curve shape; with \\(w_0=w_n=1\\) nothing changes.'),
    ],
    unresolvedQuestions: [
        text('Pred classroom-ready pregledom je treba potrditi slovenska izraza »Farinove točke« in »standardna oblika« ter prikaz uteži v aplikaciji.', 'Before classroom-ready review, confirm the Slovenian terms "Farinove točke" and "standardna oblika" and the display of weights in the app.'),
    ],
};

// ---------------------------------------------------------------------------------------------
// circle
// ---------------------------------------------------------------------------------------------

const circleFormulas: readonly FormulaBlock[] = [
    {
        id: 'circle-arc',
        latex: '\\alpha=\\frac{\\pi}{n},\\qquad w=(1,\\cos\\alpha,1),\\qquad \\lVert OQ_1\\rVert=\\frac{r}{\\cos\\alpha},\\quad r=3',
        notation: text(
            '\\(n\\) je število kosov, \\(\\alpha\\) polovični kot enega loka (\\(2\\alpha=\\tfrac{2\\pi}{n}\\)), \\(Q_0,Q_1,Q_2\\) kontrolne točke kosa, \\(O\\) središče kroga, \\(r=3\\) polmer.',
            'Here \\(n\\) is the number of pieces, \\(\\alpha\\) is the half-angle of one arc (\\(2\\alpha=\\tfrac{2\\pi}{n}\\)), \\(Q_0,Q_1,Q_2\\) are the control points of a piece, \\(O\\) is the center and \\(r=3\\) the radius.',
        ),
        explanation: text(
            'Točki \\(Q_0\\) in \\(Q_2\\) sta na krožnici, srednja točka \\(Q_1\\) pa je presečišče tangent v njiju; kontrolni trikotnik je enakokrak.',
            'The points \\(Q_0\\) and \\(Q_2\\) are on the circle and the middle point \\(Q_1\\) is the intersection of the tangents at them; the control triangle is isosceles.',
        ),
    },
    {
        id: 'circle-midpoint',
        latex: 'B\\bigl(\\tfrac12\\bigr)=\\frac{Q_0+2\\cos\\alpha\\,Q_1+Q_2}{2+2\\cos\\alpha},\\qquad \\lVert OB\\bigl(\\tfrac12\\bigr)\\rVert=r',
        notation: text(
            'Točka \\(B(\\tfrac12)\\) je sredina loka; s \\(u\\) označimo enotski vektor proti sredini loka.',
            'The point \\(B(\\tfrac12)\\) is the middle of the arc; let \\(u\\) be the unit vector toward the middle of the arc.',
        ),
        explanation: text(
            'Velja \\(Q_0+Q_2=2r\\cos\\alpha\\,u\\) in \\(Q_1=\\tfrac{r}{\\cos\\alpha}\\,u\\), zato je števec \\(2r(1+\\cos\\alpha)\\,u\\) in rezultat \\(r\\,u\\). Utež \\(\\cos\\alpha\\) je torej ravno prava, da leži sredina loka na krožnici.',
            'We have \\(Q_0+Q_2=2r\\cos\\alpha\\,u\\) and \\(Q_1=\\tfrac{r}{\\cos\\alpha}\\,u\\), so the numerator is \\(2r(1+\\cos\\alpha)\\,u\\) and the result is \\(r\\,u\\). The weight \\(\\cos\\alpha\\) is exactly the value that places the middle of the arc on the circle.',
        ),
    },
];

const circleExamples: readonly WorkedExample[] = [
    {
        id: 'circle-three',
        title: text('Primer: \\(n=3\\)', 'Example: \\(n=3\\)'),
        calculationLatex: 'n=3:\\quad \\alpha=\\tfrac{\\pi}3,\\quad \\cos\\alpha=\\tfrac12,\\quad \\lVert OQ_1\\rVert=\\frac{3}{1/2}=6',
        resultLatex: 'w=\\bigl(1,\\tfrac12,1\\bigr),\\qquad \\lVert OQ_1\\rVert=6',
        check: text(
            'Vsak lok je 120°, srednja točka je dvakrat dlje od središča kot krožnica.',
            'Each arc is 120 degrees and the middle point is twice as far from the center as the circle.',
        ),
    },
    {
        id: 'circle-four',
        title: text('Primer: \\(n=4\\)', 'Example: \\(n=4\\)'),
        calculationLatex: 'n=4:\\quad \\alpha=\\tfrac{\\pi}4,\\quad \\cos\\alpha=\\tfrac{\\sqrt2}2,\\quad \\lVert OQ_1\\rVert=\\frac{3}{\\sqrt2/2}=3\\sqrt2\\approx4{,}243',
        resultLatex: 'w=\\bigl(1,\\tfrac{\\sqrt2}2,1\\bigr),\\qquad \\lVert OQ_1\\rVert=3\\sqrt2',
        check: text(
            'Vsak lok je 90° in kontrolni trikotnik ima pri \\(Q_1\\) pravi kot; središče, \\(Q_0\\) in \\(Q_1\\) tvorijo enakokraki pravokotni trikotnik.',
            'Each arc is 90 degrees and the control triangle has a right angle at \\(Q_1\\); the center, \\(Q_0\\) and \\(Q_1\\) form an isosceles right triangle.',
        ),
    },
    {
        id: 'circle-six',
        title: text('Primer: \\(n=6\\)', 'Example: \\(n=6\\)'),
        calculationLatex: 'n=6:\\quad \\alpha=\\tfrac{\\pi}6,\\quad \\cos\\alpha=\\tfrac{\\sqrt3}2,\\quad \\lVert OQ_1\\rVert=\\frac{3}{\\sqrt3/2}=2\\sqrt3\\approx3{,}464',
        resultLatex: 'w=\\bigl(1,\\tfrac{\\sqrt3}2,1\\bigr),\\qquad \\lVert OQ_1\\rVert=2\\sqrt3',
        check: text(
            'Vsak lok je 60°; srednja utež \\(\\tfrac{\\sqrt3}2\\approx0{,}866\\) je že blizu 1 in srednja točka blizu krožnice.',
            'Each arc is 60 degrees; the middle weight \\(\\tfrac{\\sqrt3}2\\approx0.866\\) is already close to 1 and the middle point close to the circle.',
        ),
    },
];

const circleLesson: GuidedLesson = {
    demonstrationId: 'circle',
    title: text('Krog iz \\(n\\) racionalnih kosov', 'A circle from \\(n\\) rational pieces'),
    summary: text(
        'Krožni lok natančno predstavlja racionalna kvadratna Bézierjeva krivulja z utežmi \\(1,\\cos\\alpha,1\\), kjer je \\(\\alpha\\) polovični kot loka. Krog je sestavljen iz \\(n\\) takih kosov s kotom \\(\\tfrac{2\\pi}{n}\\), zato je vsaka točka na razdalji 3 od središča.',
        'A circular arc is represented exactly by a rational quadratic Bézier curve with weights \\(1,\\cos\\alpha,1\\), where \\(\\alpha\\) is the half-angle of the arc. A circle is assembled from \\(n\\) such pieces with angle \\(\\tfrac{2\\pi}{n}\\), so every point is at distance 3 from the center.',
    ),
    prerequisites: [
        text('Potrebno je poznavanje racionalne Bézierjeve krivulje z utežmi.', 'Assumes familiarity with a rational Bézier curve with weights.'),
        text('Priporočeno je poznavanje kosinusa in tangente na krožnico.', 'It helps to know the cosine and the tangent to a circle.'),
    ],
    learningGoals: [
        text('Izračunaš srednjo utež \\(\\cos\\tfrac{\\pi}{n}\\) in razdaljo srednje kontrolne točke \\(\\tfrac{3}{\\cos(\\pi/n)}\\) za dani \\(n\\).', 'Compute the middle weight \\(\\cos\\tfrac{\\pi}{n}\\) and the distance of the middle control point \\(\\tfrac{3}{\\cos(\\pi/n)}\\) for a given \\(n\\).'),
        text('Pojasniš, zakaj sosednja kosa delita krajišče in tangento.', 'Explain why neighbouring pieces share an end point and a tangent.'),
        text('Poveš, zakaj mora biti \\(n\\ge3\\) in zakaj krog ni polinomska krivulja.', 'State why \\(n\\ge3\\) is required and why a circle is not a polynomial curve.'),
    ],
    formulaBlocks: circleFormulas,
    workedExamples: circleExamples,
    steps: [
        step({
            id: 'circle-default', order: 1,
            title: text('Krog iz treh kosov', 'A circle from three pieces'),
            purpose: text('Videti krog, sestavljen iz kosov, in njihove kontrolne točke.', 'Seeing the circle assembled from pieces and their control points.'),
            explanation: text(
                'Privzeti graf nariše krog s polmerom 3 iz treh racionalnih kvadratnih kosov. Vsak kos je lok 120°, njegove kontrolne točke pa so dve točki na krožnici in presečišče tangent v njiju zunaj kroga.',
                'The default graph draws a circle of radius 3 from three rational quadratic pieces. Each piece is a 120 degree arc, and its control points are two points on the circle and the intersection of the tangents at them outside the circle.',
            ),
            formulaIds: [],
            learnerInteraction: 'observe',
            observationPrompt: text('Preštej kose in poišči točke, kjer se sosednja kosa stikata; poišči tudi kontrolne točke zunaj kroga.', 'Count the pieces, find the points where neighbouring pieces meet, and find the control points outside the circle.'),
            expectedObservations: [text('Vidni so trije loki, ki se stikajo v treh točkah na krožnici, tri srednje kontrolne točke pa so zunaj kroga.', 'Three arcs are visible, meeting at three points on the circle, and three middle control points lie outside the circle.')],
            scene: scene('circle-default', [], 'Krog je sestavljen iz treh kosov.', 'The circle is assembled from three pieces.'),
        }),
        step({
            id: 'circle-one-arc', order: 2,
            title: text('En lok in njegova utež', 'One arc and its weight'),
            purpose: text('Izpeljati utež in lego srednje točke iz enakokrakega trikotnika.', 'Deriving the weight and the position of the middle point from an isosceles triangle.'),
            explanation: text(
                'Kontrolni trikotnik loka je enakokrak, ker sta tangenti v krajiščih enako dolgi. Tangenta je pravokotna na polmer, zato je srednja točka na razdalji \\(\\tfrac{r}{\\cos\\alpha}\\) od središča, njena utež pa \\(\\cos\\alpha\\). Pri \\(n=3\\) je \\(\\alpha=\\tfrac\\pi3\\), utež \\(\\tfrac12\\) in razdalja 6.',
                'The control triangle of the arc is isosceles because the tangents at the end points have equal length. A tangent is perpendicular to the radius, so the middle point is at distance \\(\\tfrac{r}{\\cos\\alpha}\\) from the center and its weight is \\(\\cos\\alpha\\). For \\(n=3\\), \\(\\alpha=\\tfrac\\pi3\\), the weight is \\(\\tfrac12\\) and the distance is 6.',
            ),
            formulaIds: ['circle-arc', 'circle-midpoint'],
            workedExampleId: 'circle-three',
            learnerInteraction: 'observe',
            observationPrompt: text('Izberi en lok in preveri, da sta stranici kontrolnega trikotnika pri srednji točki enako dolgi.', 'Pick one arc and check that the two sides of its control triangle at the middle point have equal length.'),
            expectedObservations: [text('Srednja točka je daleč zunaj kroga, ker je lok dolg 120°; stranici trikotnika sta enako dolgi.', 'The middle point is far outside the circle because the arc is 120 degrees; the two sides of the triangle are equally long.')],
            scene: scene('circle-three', [sceneActionOf('set-circle-pieces', 3)], 'Krog ima tri kose.', 'The circle has three pieces.'),
        }),
        step({
            id: 'circle-four', order: 3,
            title: text('Štirje kosi', 'Four pieces'),
            purpose: text('Primerjati utež in razdaljo pri \\(n=4\\) s prejšnjima.', 'Comparing the weight and distance at \\(n=4\\) with the previous ones.'),
            explanation: text(
                'Pri štirih kosih je vsak lok četrtina kroga, \\(\\alpha=\\tfrac\\pi4\\), srednja utež je \\(\\tfrac{\\sqrt2}2\\) in srednja točka je na razdalji \\(3\\sqrt2\\). Krajišča kosov so pri tem na oseh in srednje točke na kotih kvadrata.',
                'With four pieces every arc is a quarter of the circle, \\(\\alpha=\\tfrac\\pi4\\), the middle weight is \\(\\tfrac{\\sqrt2}2\\) and the middle point is at distance \\(3\\sqrt2\\). The end points of the pieces are on the axes and the middle points are at the corners of a square.',
            ),
            formulaIds: ['circle-arc'],
            workedExampleId: 'circle-four',
            learnerInteraction: 'adjust-construction-parameter',
            observationPrompt: text('Primerjaj, kako daleč od krožnice so srednje točke pri štirih kosih v primerjavi s tremi.', 'Compare how far from the circle the middle points are with four pieces than with three.'),
            expectedObservations: [text('Srednje točke so bližje krožnici kot pri treh kosih, njihova utež pa je večja.', 'The middle points are closer to the circle than with three pieces and their weight is larger.')],
            scene: scene('circle-four', [sceneActionOf('set-circle-pieces', 4)], 'Krog ima štiri kose.', 'The circle has four pieces.'),
        }),
        step({
            id: 'circle-six', order: 4,
            title: text('Šest kosov', 'Six pieces'),
            purpose: text('Videti, da se utež z večanjem \\(n\\) bliža 1.', 'Seeing that the weight approaches 1 as \\(n\\) grows.'),
            explanation: text(
                'Pri šestih kosih je \\(\\alpha=\\tfrac\\pi6\\), utež je \\(\\tfrac{\\sqrt3}2\\) in srednja točka je na razdalji \\(2\\sqrt3\\). Sosednja kosa se stikata v skupni točki in imata tam skupno tangento: stranici kontrolnih trikotnikov ob stiku ležita na isti premici, pravokotni na polmer.',
                'With six pieces \\(\\alpha=\\tfrac\\pi6\\), the weight is \\(\\tfrac{\\sqrt3}2\\) and the middle point is at distance \\(2\\sqrt3\\). Neighbouring pieces meet in a common point with a common tangent there: the sides of the control triangles at the joint lie on the same line, perpendicular to the radius.',
            ),
            formulaIds: ['circle-arc', 'circle-midpoint'],
            workedExampleId: 'circle-six',
            learnerInteraction: 'adjust-construction-parameter',
            observationPrompt: text('Preveri, da v stiku dveh kosov pride krivulja z ene strani in odide na drugo brez ostrega vogala.', 'Check that at the joint of two pieces the curve arrives from one side and leaves on the other without a sharp corner.'),
            expectedObservations: [text('V stikih ni vogalov, srednje točke so še bližje krožnici in vsaka točka krivulje je na razdalji 3 od središča.', 'There are no corners at the joints, the middle points are even closer to the circle and every curve point is at distance 3 from the center.')],
            scene: scene('circle-six', [sceneActionOf('set-circle-pieces', 6)], 'Krog ima šest kosov.', 'The circle has six pieces.'),
        }),
        step({
            id: 'circle-why-three', order: 5,
            title: text('Zakaj najmanj trije kosi', 'Why at least three pieces'),
            purpose: text('Razumeti omejitev \\(n\\ge3\\) in da polinomska krivulja kroga ne zmore.', 'Understanding the limit \\(n\\ge3\\) and that no polynomial curve can represent a circle.'),
            explanation: text(
                'Pri \\(n=2\\) je polovični kot \\(\\tfrac\\pi2\\), \\(\\cos\\tfrac\\pi2=0\\) in srednja točka je v neskončnosti, zato mora biti vsak lok krajši od polkroga, graf pa dovoli \\(n\\) od 3 do 12. Pri 12 kosih je utež \\(\\cos\\tfrac\\pi{12}\\approx0{,}966\\) in srednja točka je na razdalji okoli \\(3{,}106\\). Natančen krog z eno samo polinomsko krivuljo ni mogoč, zato so uteži nujne.',
                'For \\(n=2\\) the half-angle is \\(\\tfrac\\pi2\\), \\(\\cos\\tfrac\\pi2=0\\) and the middle point is at infinity, so every arc must be shorter than a half circle, and the graph allows \\(n\\) from 3 to 12. With 12 pieces the weight is \\(\\cos\\tfrac\\pi{12}\\approx0.966\\) and the middle point is at a distance of about \\(3.106\\). An exact circle is impossible with a single polynomial curve, so the weights are essential.',
            ),
            formulaIds: ['circle-arc'],
            learnerInteraction: 'adjust-construction-parameter',
            observationPrompt: text('Primerjaj lego srednjih točk pri 12 kosih z lego pri treh kosih in preveri, da je krog še vedno natančen.', 'Compare the position of the middle points with 12 pieces to that with three pieces and check that the circle is still exact.'),
            expectedObservations: [text('Srednje točke so tik ob krožnici, utež je skoraj 1, a krog je enako natančen kot pri treh kosih.', 'The middle points are right next to the circle, the weight is nearly 1, yet the circle is exactly as accurate as with three pieces.')],
            scene: scene('circle-twelve', [sceneActionOf('set-circle-pieces', 12)], 'Krog ima dvanajst kosov.', 'The circle has twelve pieces.'),
        }),
    ],
    sources: [
        farinSource(['rational quadratic circular arc', 'weight cos(alpha) and the tangent-intersection middle point']),
        {
            id: 'piegl-tiller-nurbs-book',
            citation: 'Piegl, L., Tiller, W. The NURBS Book, 2nd ed., Springer, 1997 (chapter on conics and circles).',
            supports: ['representing a circle with rational quadratic arcs', 'arcs of less than 180 degrees', 'a circle is not a polynomial curve'],
        },
        {
            id: 'bezeg-circle-implementation',
            citation: 'Bezeg source: src/graphs/curves/rational/RationalBezierCurveCircleGraphN.tsx.',
            supports: ['number of pieces control', 'radius 3', 'minimum 3 and maximum 12 pieces'],
            implementationCorrespondence: 'generateCurves(n) builds n pieces with alpha = pi / n, even points at radius 3, odd points at radius 3 / cos(alpha) and weights (1, cos(alpha), 1); MIN_CIRCLE_PIECES = 3 avoids the degenerate n = 2.',
        },
    ],
    edgeCases: [
        text('Pri \\(n=2\\) je \\(\\cos\\tfrac\\pi2=0\\): srednja točka je v neskončnosti, zato je najmanjša vrednost v grafu 3.', 'For \\(n=2\\) we have \\(\\cos\\tfrac\\pi2=0\\): the middle point is at infinity, so the graph\'s minimum is 3.'),
        text('Če premakneš kontrolno točko, kos ni več natančen krožni lok; lekcija opisuje privzeto sliko po izbiri števila kosov.', 'If a control point is moved, the piece is no longer an exact circular arc; the lesson describes the picture produced by choosing the number of pieces.'),
    ],
    unresolvedQuestions: [
        text('Pred classroom-ready pregledom je treba potrditi slovenske izraze »krožni lok« in »enakokraki kontrolni trikotnik« ter navedbo vira za konike.', 'Before classroom-ready review, confirm the Slovenian terms for "circular arc" and "isosceles control triangle" and the source citation for conics.'),
    ],
};

export const rationalConstructionGuidedLessons: readonly GuidedLesson[] = [decasteljauAlternative, farinLesson, circleLesson];
