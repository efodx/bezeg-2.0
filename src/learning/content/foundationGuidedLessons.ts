import type {GuidedLesson, GuidedLessonFrame, GuidedLessonFrameKind, LocalizedText} from './guidedLessons';

const text = (sl: string, en: string): LocalizedText => ({sl, en});
const frame = (id: string, kind: GuidedLessonFrameKind, formulaIds?: readonly string[]): GuidedLessonFrame => ({id, kind, formulaIds});

const bernstein: GuidedLesson = {
    demonstrationId: 'bernstein',
    title: text('Bernsteinove bazne funkcije', 'Bernstein basis functions'),
    summary: text(
        'Bernsteinove funkcije stopnje \\(n\\) so utežni faktorji kontrolnih točk; so nenegativne na \\([0,1]\\) in se vedno seštejejo v 1.',
        'Bernstein functions of degree \\(n\\) are the blending weights of control points; they are nonnegative on \\([0,1]\\) and always sum to 1.',
    ),
    prerequisites: [
        text('Potrebno je osnovno poznavanje polinomov in intervala \\([0,1]\\).', 'Assumes familiarity with polynomials and the interval \\([0,1]\\).'),
        text('Priporočeno je, da veš, da Bézierjeva krivulja kontrolne točke utežno povpreči.', 'It helps to know that a Bézier curve takes a weighted average of its control points.'),
    ],
    learningGoals: [
        text('Zapišeš Bernsteinovo funkcijo \\(B^n_i(t)\\) in poveš, koliko jih ima stopnja \\(n\\).', 'Write the Bernstein function \\(B^n_i(t)\\) and state how many functions degree \\(n\\) has.'),
        text('Izračunaš vrednosti vseh funkcij stopnje 3 pri \\(t=\\tfrac{1}{2}\\).', 'Compute the values of all degree 3 functions at \\(t=\\tfrac{1}{2}\\).'),
        text('Razložiš, zakaj je vsota funkcij enaka 1 in kako to pokaže naloženi ploščinski grafikon.', 'Explain why the functions sum to 1 and how the stacked-area view shows it.'),
    ],
    formulaBlocks: [
        {
            id: 'bernstein-definition',
            latex: 'B^n_i(t)=\\binom{n}{i}t^i(1-t)^{n-i},\\qquad i=0,\\dots,n',
            notation: text(
                'Stopnja \\(n\\) ima \\(n+1\\) funkcij \\(B^n_0,\\ldots,B^n_n\\); indeks \\(i\\) pove, kolikokrat nastopi faktor \\(t\\).',
                'Degree \\(n\\) has \\(n+1\\) functions \\(B^n_0,\\ldots,B^n_n\\); the index \\(i\\) counts how many factors of \\(t\\) appear.',
            ),
            explanation: text(
                'Števec na grafu prikazuje stopnjo \\(n\\). Stopnja 3 ima štiri funkcije, stopnja 1 pa dve: \\(1-t\\) in \\(t\\).',
                'The counter on the graph shows the degree \\(n\\). Degree 3 has four functions, and degree 1 has two: \\(1-t\\) and \\(t\\).',
            ),
        },
        {
            id: 'bernstein-nonnegativity',
            latex: 'B^n_i(t)\\ge 0,\\qquad 0\\le t\\le 1',
            notation: text(
                'Na \\([0,1]\\) sta \\(t\\) in \\(1-t\\) nenegativna, zato je nenegativen tudi vsak njun produkt.',
                'On \\([0,1]\\) both \\(t\\) and \\(1-t\\) are nonnegative, so every product of them is nonnegative as well.',
            ),
            explanation: text(
                'Zato je vsaka točka krivulje utežno povprečje kontrolnih točk z nenegativnimi utežmi.',
                'Hence every curve point is a weighted average of the control points with nonnegative weights.',
            ),
        },
        {
            id: 'bernstein-partition-of-unity',
            latex: '\\sum_{i=0}^{n}B^n_i(t)=\\bigl(t+(1-t)\\bigr)^n=1',
            notation: text(
                'Vsota vseh \\(n+1\\) funkcij je pri vsakem \\(t\\) enaka 1 (binomski izrek).',
                'The sum of all \\(n+1\\) functions equals 1 for every \\(t\\) (binomial theorem).',
            ),
            explanation: text(
                'To je razčlenitev enote: uteži se vedno seštejejo v 1, zato je točka krivulje res utežno povprečje kontrolnih točk.',
                'This is the partition of unity: the weights always add up to 1, so a curve point really is a weighted average of the control points.',
            ),
        },
    ],
    workedExamples: [
        {
            id: 'bernstein-cubic-half',
            title: text('Kubične funkcije pri \\(t=\\tfrac{1}{2}\\)', 'Cubic functions at \\(t=\\tfrac{1}{2}\\)'),
            calculationLatex: 'B^3_i(1/2)=\\binom3i\\left(\\tfrac12\\right)^3,\\quad i=0,1,2,3',
            resultLatex: '\\left(\\tfrac18,\\tfrac38,\\tfrac38,\\tfrac18\\right),\\qquad \\tfrac18+\\tfrac38+\\tfrac38+\\tfrac18=1',
            check: text(
                'Pri \\(t=\\tfrac{1}{2}\\) odčitaj štiri vrednosti \\(\\tfrac{1}{8}\\), \\(\\tfrac{3}{8}\\), \\(\\tfrac{3}{8}\\), \\(\\tfrac{1}{8}\\) in preveri, da je njihova vsota 1.',
                'At \\(t=\\tfrac{1}{2}\\) read the four values \\(\\tfrac{1}{8}\\), \\(\\tfrac{3}{8}\\), \\(\\tfrac{3}{8}\\), \\(\\tfrac{1}{8}\\) and check that they sum to 1.',
            ),
        },
    ],
    steps: [
        {
            id: 'bernstein-basis-functions', order: 1,
            title: text('Dve funkciji stopnje 1', 'Two functions of degree 1'),
            purpose: text('Spoznavanje najpreprostejše Bernsteinove baze.', 'Meeting the simplest Bernstein basis.'),
            explanation: text(
                'Stopnja 1 ima dve funkciji: \\(B^1_0(t)=1-t\\) in \\(B^1_1(t)=t\\). Ena pada, druga narašča, skupaj pa dasta 1.',
                'Degree 1 has two functions: \\(B^1_0(t)=1-t\\) and \\(B^1_1(t)=t\\). One decreases, the other increases, and together they give 1.',
            ),
            formulaIds: ['bernstein-definition'],
            frames: [frame('bernstein-basis-functions-explanation', 'explanation'), frame('bernstein-basis-functions-observation', 'observation')],
            learnerInteraction: 'observe',
            observationPrompt: text('Preštej funkcije na grafu, ugotovi, katera pada in katera narašča, in poišči, kje se srečata.', 'Count the functions on the graph, find which one decreases and which increases, and locate where they meet.'),
            expectedObservations: [text('Prikazani sta dve funkciji stopnje 1, ena pada in ena narašča; srečata se pri \\(t=\\tfrac{1}{2}\\) na višini \\(\\tfrac{1}{2}\\).', 'Two degree 1 functions are shown, one decreasing and one increasing; they meet at \\(t=\\tfrac{1}{2}\\) at height \\(\\tfrac{1}{2}\\).')],
            scene: {
                id: 'bernstein-degree-one', basedOn: 'demonstration-default',
                actions: [],
                expectedState: text('Prikazani sta funkciji \\(1-t\\) in \\(t\\) brez naloženega ploščinskega grafikona.', 'The functions \\(1-t\\) and \\(t\\) are shown without the stacked-area view.'),
            },
        },
        {
            id: 'bernstein-degree-count', order: 2,
            title: text('Stopnja določa število funkcij', 'Degree sets the number of functions'),
            purpose: text('Povezava stopnje \\(n\\) s številom \\(n+1\\) funkcij.', 'Linking degree \\(n\\) with the \\(n+1\\) functions.'),
            explanation: text(
                'Pri stopnji 3 je \\(B^3_i(t)=\\binom{3}{i}t^i(1-t)^{3-i}\\) za \\(i=0,1,2,3\\), torej so štiri funkcije. Vse so nenegativne na \\([0,1]\\).',
                'At degree 3 we have \\(B^3_i(t)=\\binom{3}{i}t^i(1-t)^{3-i}\\) for \\(i=0,1,2,3\\), so there are four functions. All are nonnegative on \\([0,1]\\).',
            ),
            formulaIds: ['bernstein-definition', 'bernstein-nonnegativity'],
            frames: [frame('bernstein-degree-count-explanation', 'explanation'), frame('bernstein-degree-count-observation', 'observation')],
            learnerInteraction: 'observe',
            observationPrompt: text('Preštej funkcije pri stopnji 3 in preveri, da nobena ne gre pod 0.', 'Count the functions at degree 3 and check that none goes below 0.'),
            expectedObservations: [text('Prikazane so štiri funkcije, vse ležijo na osi \\(t\\) ali nad njo.', 'Four functions are shown, all lying on or above the \\(t\\)-axis.')],
            scene: {
                id: 'bernstein-degree-three', basedOn: 'demonstration-default',
                actions: [{name: 'set-bernstein-degree', value: 3}],
                expectedState: text('Prikazane so štiri funkcije stopnje 3.', 'Four degree 3 functions are shown.'),
            },
        },
        {
            id: 'bernstein-calculation', order: 3,
            title: text('Vrednosti pri \\(t=\\tfrac{1}{2}\\)', 'Values at \\(t=\\tfrac{1}{2}\\)'),
            purpose: text('Izračun vseh vrednosti in njihove vsote.', 'Computing all the values and their sum.'),
            explanation: text(
                'Pri \\(t=\\tfrac{1}{2}\\) je \\(t^i(1-t)^{3-i}=\\tfrac{1}{8}\\) za vsak \\(i\\), binomski koeficienti 1, 3, 3, 1 pa dajo \\(\\tfrac{1}{8}\\), \\(\\tfrac{3}{8}\\), \\(\\tfrac{3}{8}\\) in \\(\\tfrac{1}{8}\\).',
                'At \\(t=\\tfrac{1}{2}\\) we have \\(t^i(1-t)^{3-i}=\\tfrac{1}{8}\\) for every \\(i\\), and the binomial coefficients 1, 3, 3, 1 give \\(\\tfrac{1}{8}\\), \\(\\tfrac{3}{8}\\), \\(\\tfrac{3}{8}\\) and \\(\\tfrac{1}{8}\\).',
            ),
            formulaIds: ['bernstein-definition', 'bernstein-partition-of-unity'],
            frames: [frame('bernstein-calculation-explanation', 'explanation'), frame('bernstein-calculation-calculation', 'calculation'), frame('bernstein-calculation-observation', 'observation')],
            workedExampleId: 'bernstein-cubic-half',
            learnerInteraction: 'observe',
            observationPrompt: text('Pri \\(t=\\tfrac{1}{2}\\) primerjaj višine štirih krivulj z izračunanimi vrednostmi.', 'At \\(t=\\tfrac{1}{2}\\) compare the heights of the four curves with the computed values.'),
            expectedObservations: [text('Srednji funkciji dosežeta \\(\\tfrac{3}{8}\\), zunanji \\(\\tfrac{1}{8}\\), vsota je 1.', 'The middle two functions reach \\(\\tfrac{3}{8}\\), the outer two \\(\\tfrac{1}{8}\\), and the sum is 1.')],
            scene: {
                id: 'bernstein-calculation-scene', basedOn: 'demonstration-default',
                actions: [{name: 'set-bernstein-degree', value: 3}],
                expectedState: text('Štiri kubične funkcije so pripravljene za odčitavanje pri \\(t=\\tfrac{1}{2}\\).', 'The four cubic functions are ready for reading at \\(t=\\tfrac{1}{2}\\).'),
            },
        },
        {
            id: 'bernstein-stacked-area', order: 4,
            title: text('Vsota je enaka 1', 'The sum equals 1'),
            purpose: text('Vsoto funkcij povezati z višino 1.', 'Connecting the sum of the functions with height 1.'),
            explanation: text(
                'V naloženem ploščinskem grafikonu so funkcije zložene druga na drugo. To je ista vsota kot v formuli, ne drug model: zgornji rob je pri vsakem \\(t\\) na višini 1.',
                'The stacked-area view piles the functions on top of each other. It shows the same sum as in the formula, not a second model: the top edge is at height 1 for every \\(t\\).',
            ),
            formulaIds: ['bernstein-partition-of-unity'],
            frames: [frame('bernstein-stacked-area-explanation', 'explanation'), frame('bernstein-stacked-area-observation', 'observation')],
            learnerInteraction: 'observe',
            observationPrompt: text('Poglej zgornji rob naloženih ploščin in ga primerjaj z višino 1.', 'Look at the top edge of the stacked areas and compare it with height 1.'),
            expectedObservations: [text('Zgornji rob ostane na višini 1 na celotnem intervalu \\([0,1]\\).', 'The top edge stays at height 1 over the whole interval \\([0,1]\\).')],
            scene: {
                id: 'bernstein-stacked-scene', basedOn: 'demonstration-default',
                actions: [{name: 'set-bernstein-degree', value: 3}, {name: 'show-bernstein-stacked-area', value: true}],
                expectedState: text('Štiri kubične funkcije so prikazane kot naložene ploščine do višine 1.', 'The four cubic functions are shown as stacked areas up to height 1.'),
            },
        },
        {
            id: 'bernstein-analysis', order: 5,
            title: text('Višja stopnja, enaka vsota', 'Higher degree, same sum'),
            purpose: text('Preverjanje, da vsota ostane 1 tudi pri drugi stopnji.', 'Checking that the sum stays 1 at another degree.'),
            explanation: text(
                'Stopnja 5 ima šest funkcij, vsaka je ožja, vsota pa je še vedno 1. Poskusi tudi druge stopnje.',
                'Degree 5 has six functions, each one narrower, yet the sum is still 1. Try other degrees too.',
            ),
            formulaIds: ['bernstein-definition', 'bernstein-partition-of-unity'],
            frames: [frame('bernstein-analysis-explanation', 'explanation'), frame('bernstein-analysis-observation', 'observation')],
            learnerInteraction: 'observe',
            observationPrompt: text('Spreminjaj stopnjo in preštej funkcije; preveri, ali zgornji rob ostane na višini 1.', 'Change the degree, count the functions, and check whether the top edge stays at height 1.'),
            expectedObservations: [text('Stopnja \\(n\\) ima \\(n+1\\) funkcij, zgornji rob je vedno na višini 1.', 'Degree \\(n\\) has \\(n+1\\) functions and the top edge is always at height 1.')],
            scene: {
                id: 'bernstein-analysis-scene', basedOn: 'demonstration-default',
                actions: [{name: 'set-bernstein-degree', value: 5}, {name: 'show-bernstein-stacked-area', value: true}],
                expectedState: text('Šest funkcij stopnje 5 je prikazanih kot naložene ploščine.', 'Six degree 5 functions are shown as stacked areas.'),
            },
        },
    ],
    sources: [
        {
            id: 'farin-bernstein-basis',
            citation: 'Farin, G. Curves and Surfaces for CAGD: A Practical Guide, 5th ed., Morgan Kaufmann, 2002.',
            supports: ['Bernstein polynomials', 'nonnegativity on [0,1]', 'partition of unity'],
            implementationCorrespondence: 'The graph evaluates B^n_i(t)=C(n,i)t^i(1-t)^(n-i) for the displayed degree n.',
        },
        {
            id: 'pbp-bernstein-basis',
            citation: 'Prautzsch, H., Boehm, W., Paluszny, M. Bézier and B-Spline Techniques, Springer, 2002.',
            supports: ['Bernstein basis properties', 'binomial theorem and partition of unity'],
        },
        {
            id: 'bezeg-bernstein-implementation',
            citation: 'Bezeg source: src/graphs/bernstein/BernsteinGraph.tsx.',
            supports: ['basis-function graph', 'degree counter', 'stacked-area view'],
        },
    ],
    edgeCases: [
        text('Vsota je enaka 1 za vsak \\(t\\), nenegativnost pa velja le na \\([0,1]\\); zunaj intervala so nekatere funkcije negativne.', 'The sum is 1 for every \\(t\\), but nonnegativity holds only on \\([0,1]\\); outside it some functions are negative.'),
        text('Stopnja 0 ima samo funkcijo \\(B^0_0(t)=1\\); graf omogoča stopnje od 0 do 5.', 'Degree 0 has only the function \\(B^0_0(t)=1\\); the graph supports degrees 0 to 5.'),
    ],
    unresolvedQuestions: [
        text('Pred classroom-ready pregledom je treba potrditi, ali naj učenci vrednosti pri \\(t=\\tfrac{1}{2}\\) sami izračunajo ali jih najprej samo odčitajo.', 'Before classroom-ready review, confirm whether students should compute the values at \\(t=\\tfrac{1}{2}\\) or first only read them off.'),
    ],
};

const rationalElevation: GuidedLesson = {
    demonstrationId: 'rational-elevation',
    title: text('Višanje stopnje racionalne krivulje', 'Degree elevation of a rational curve'),
    summary: text(
        'Racionalno višanje stopnje je navadno višanje stopnje homogenih točk \\((w_iP_i,\\,w_i)\\): spremenijo se kontrolne točke in uteži, krivulja pa ostane ista.',
        'Rational degree elevation is ordinary degree elevation of the homogeneous points \\((w_iP_i,\\,w_i)\\): control points and weights change, while the curve stays the same.',
    ),
    prerequisites: [
        text('Potrebno je poznavanje višanja stopnje polinomske Bézierjeve krivulje.', 'Assumes familiarity with degree elevation of a polynomial Bézier curve.'),
        text('Potrebno je razumevanje, da utež spreminja vpliv kontrolne točke na racionalno krivuljo.', 'Assumes that a weight changes the influence of a control point on a rational curve.'),
    ],
    learningGoals: [
        text('Razložiš, zakaj višanje stopnje racionalne krivulje spremeni tudi uteži.', 'Explain why rational degree elevation changes the weights as well.'),
        text('Izračunaš nove uteži in kontrolne točke za privzeto krivuljo.', 'Compute the new weights and control points for the default curve.'),
        text('Ločiš racionalno višanje od polinomskega mešanja istih točk.', 'Distinguish rational elevation from the polynomial blend of the same points.'),
    ],
    formulaBlocks: [
        {
            id: 'rational-elevation-homogeneous',
            latex: '\\hat P_i=(w_iP_i,\\,w_i),\\qquad \\hat Q_i=\\frac{i}{n+1}\\hat P_{i-1}+\\left(1-\\frac{i}{n+1}\\right)\\hat P_i',
            notation: text(
                'Racionalno višanje je polinomsko višanje homogenih točk, nato pa sledi projekcija nazaj v ravnino.',
                'Rational elevation is polynomial elevation of the homogeneous points, followed by projection back to the plane.',
            ),
            explanation: text(
                'Stara stopnja je \\(n\\), nova \\(n+1\\); krajišči in njuni uteži ostanejo enaki.',
                'The old degree is \\(n\\) and the new degree is \\(n+1\\); the endpoints and their weights stay the same.',
            ),
        },
        {
            id: 'rational-elevation-weights-points',
            latex: "w'_i=\\frac{i}{n+1}w_{i-1}+\\left(1-\\frac{i}{n+1}\\right)w_i,\\qquad Q_i=\\frac{\\frac{i}{n+1}w_{i-1}P_{i-1}+\\left(1-\\frac{i}{n+1}\\right)w_iP_i}{w'_i}",
            notation: text(
                'Nova utež je povprečje starih uteži, nova točka pa povprečje uteženih starih točk, deljeno z novo utežjo.',
                'The new weight is an average of old weights, and the new point is an average of weighted old points divided by the new weight.',
            ),
            explanation: text(
                'Točka \\(Q_i\\) je zato na splošno drugačna od polinomskega povprečja \\(P_{i-1}\\) in \\(P_i\\), razen če sta uteži enaki.',
                'The point \\(Q_i\\) is therefore in general different from the polynomial blend of \\(P_{i-1}\\) and \\(P_i\\), unless the two weights are equal.',
            ),
        },
        {
            id: 'rational-elevation-shape-invariance',
            latex: '\\widetilde{R}(t)=R(t),\\qquad 0\\le t\\le1',
            notation: text(
                'Višana predstavitev nariše isto krivuljo kot prvotna.',
                'The elevated representation traces the same curve as the original.',
            ),
            explanation: text(
                'Za pozitivne uteži je projekcija dobro določena; ničelne ali negativne uteži niso del te raziskave.',
                'For positive weights the projection is well defined; zero or negative weights are outside this exploration.',
            ),
        },
    ],
    workedExamples: [
        {
            id: 'rational-elevation-default-example',
            title: text('Eno višanje privzete krivulje', 'One elevation of the default curve'),
            calculationLatex: "P=(-4,-3),(-3,3),(3,3),(4,-3),\\ w=(1,2,1,1);\\ w'_1=\\tfrac14\\cdot1+\\tfrac34\\cdot2",
            resultLatex: "w'=\\left(1,\\tfrac74,\\tfrac32,1,1\\right),\\ Q_1=\\left(-\\tfrac{22}{7},\\tfrac{15}{7}\\right),\\ Q_2=(-1,3),\\ Q_3=\\left(\\tfrac{13}{4},\\tfrac32\\right)",
            check: text(
                '\\(Q_1=\\left(-\\tfrac{22}{7},\\,\\tfrac{15}{7}\\right)\\) se razlikuje od neuteženega povprečja \\(\\left(-3{,}25;\\,1{,}5\\right)\\), ker ima \\(P_1\\) večjo utež; preveri tudi, da krivulja ostane enaka.',
                '\\(Q_1=\\left(-\\tfrac{22}{7},\\,\\tfrac{15}{7}\\right)\\) differs from the unweighted blend \\(\\left(-3.25,\\,1.5\\right)\\) because \\(P_1\\) has the larger weight; also check that the curve stays the same.',
            ),
        },
    ],
    steps: [
        {
            id: 'rational-elevation-weights', order: 1,
            title: text('Točke in uteži', 'Points and weights'),
            purpose: text('Spoznavanje začetne racionalne predstavitve.', 'Meeting the starting rational representation.'),
            explanation: text(
                'Privzeta krivulja ima štiri kontrolne točke in uteži \\(\\left(1,\\,2,\\,1,\\,1\\right)\\). Večja utež druge točke krivuljo potegne proti njej.',
                'The default curve has four control points and weights \\(\\left(1,\\,2,\\,1,\\,1\\right)\\). The larger weight of the second point pulls the curve toward it.',
            ),
            formulaIds: ['rational-elevation-shape-invariance'],
            frames: [frame('rational-elevation-weights-explanation', 'explanation'), frame('rational-elevation-weights-observation', 'observation')],
            learnerInteraction: 'observe',
            observationPrompt: text('Preberi uteži ob kontrolnih točkah in opiši obliko krivulje.', 'Read the weights next to the control points and describe the curve shape.'),
            expectedObservations: [text('Štiri točke imajo uteži 1, 2, 1, 1.', 'Four points carry the weights 1, 2, 1, 1.')],
            scene: {
                id: 'rational-elevation-default', basedOn: 'demonstration-default',
                actions: [{name: 'show-control-polygon', value: true}, {name: 'show-weights', value: true}],
                expectedState: text('Privzeta racionalna krivulja z utežmi in kontrolnim poligonom je vidna.', 'The default rational curve with its weights and control polygon is visible.'),
            },
        },
        {
            id: 'rational-elevation-homogeneous-view', order: 2,
            title: text('Homogene točke', 'Homogeneous points'),
            purpose: text('Razumevanje, zakaj se uteži pri višanju spremenijo.', 'Understanding why the weights change under elevation.'),
            explanation: text(
                'Točko \\(P_i\\) z utežjo \\(w_i\\) zapišemo kot \\((w_iP_i,\\,w_i)\\). Stopnjo teh točk višamo kot pri polinomski krivulji, nato delimo z novo utežjo. Zato se spremenijo tako točke kot uteži.',
                'A point \\(P_i\\) with weight \\(w_i\\) is written as \\((w_iP_i,\\,w_i)\\). We elevate these points as for a polynomial curve, then divide by the new weight. So both points and weights change.',
            ),
            formulaIds: ['rational-elevation-homogeneous', 'rational-elevation-weights-points'],
            frames: [frame('rational-elevation-homogeneous-view-explanation', 'explanation'), frame('rational-elevation-homogeneous-view-observation', 'observation')],
            learnerInteraction: 'observe',
            observationPrompt: text('Predvidi, koliko točk in uteži bo imela višana krivulja.', 'Predict how many points and weights the elevated curve will have.'),
            expectedObservations: [text('Nova krivulja ima pet točk in pet uteži.', 'The new curve has five points and five weights.')],
            scene: {
                id: 'rational-elevation-homogeneous-scene', basedOn: 'demonstration-default',
                actions: [{name: 'show-control-polygon', value: true}, {name: 'show-weights', value: true}],
                expectedState: text('Prvotna krivulja z utežmi je pred višanjem še vedno prikazana.', 'The original curve with its weights is still shown before elevation.'),
            },
        },
        {
            id: 'rational-elevation-once', order: 3,
            title: text('Eno višanje', 'One elevation'),
            purpose: text('Opazovanje nove stopnje, točk in uteži.', 'Observing the new degree, points, and weights.'),
            explanation: text(
                'Po enem višanju ima krivulja stopnjo 4 in pet točk z utežmi \\(\\left(1,\\,\\tfrac{7}{4},\\,\\tfrac{3}{2},\\,1,\\,1\\right)\\). Krajišči ostaneta, oblika krivulje pa se ne spremeni.',
                'After one elevation the curve has degree 4 and five points with weights \\(\\left(1,\\,\\tfrac{7}{4},\\,\\tfrac{3}{2},\\,1,\\,1\\right)\\). The endpoints stay, and the curve shape does not change.',
            ),
            formulaIds: ['rational-elevation-weights-points'],
            frames: [frame('rational-elevation-once-explanation', 'explanation'), frame('rational-elevation-once-observation', 'observation')],
            learnerInteraction: 'observe',
            observationPrompt: text('Primerjaj število točk, uteži in obliko krivulje s prvotno.', 'Compare the number of points, the weights, and the curve shape with the original.'),
            expectedObservations: [text('Pet točk, nove uteži, krivulja je na istem mestu.', 'Five points, new weights, and the curve is in the same place.')],
            scene: {
                id: 'rational-elevation-raised', basedOn: 'demonstration-default',
                actions: [{name: 'show-control-polygon', value: true}, {name: 'show-weights', value: true}, {name: 'elevate-degree', value: true}],
                expectedState: text('Prikazana je stopnja 4 z novimi točkami in utežmi.', 'Degree 4 is shown with the new points and weights.'),
            },
        },
        {
            id: 'rational-elevation-calculation', order: 4,
            title: text('Primerjava z neuteženim povprečjem', 'Comparison with the unweighted blend'),
            purpose: text('Ločiti racionalno višanje od polinomskega.', 'Telling rational elevation apart from polynomial elevation.'),
            explanation: text(
                'Polinomsko višanje bi dalo \\(Q_1=\\left(-3{,}25;\\,1{,}5\\right)\\), racionalno pa \\(Q_1=\\left(-\\tfrac{22}{7},\\,\\tfrac{15}{7}\\right)\\), ker ima \\(P_1\\) večjo utež. Če bi točke premaknili po polinomski formuli, bi se krivulja spremenila.',
                'Polynomial elevation would give \\(Q_1=\\left(-3.25,\\,1.5\\right)\\), but rational elevation gives \\(Q_1=\\left(-\\tfrac{22}{7},\\,\\tfrac{15}{7}\\right)\\), because \\(P_1\\) has the larger weight. Moving the points by the polynomial formula would change the curve.',
            ),
            formulaIds: ['rational-elevation-weights-points'],
            frames: [frame('rational-elevation-calculation-explanation', 'explanation'), frame('rational-elevation-calculation-calculation', 'calculation'), frame('rational-elevation-calculation-observation', 'observation')],
            workedExampleId: 'rational-elevation-default-example',
            learnerInteraction: 'observe',
            observationPrompt: text('Preveri položaj \\(Q_1\\) in uteži ob višani krivulji.', 'Check the position of \\(Q_1\\) and the weights on the elevated curve.'),
            expectedObservations: [text('\\(Q_1\\) ni v \\(\\left(-3{,}25;\\,1{,}5\\right)\\); uteži so 1, \\(\\tfrac{7}{4}\\), \\(\\tfrac{3}{2}\\), 1, 1.', '\\(Q_1\\) is not at \\(\\left(-3.25,\\,1.5\\right)\\); the weights are 1, \\(\\tfrac{7}{4}\\), \\(\\tfrac{3}{2}\\), 1, 1.')],
            scene: {
                id: 'rational-elevation-calculation-scene', basedOn: 'demonstration-default',
                actions: [{name: 'show-control-polygon', value: true}, {name: 'show-weights', value: true}, {name: 'elevate-degree', value: true}],
                expectedState: text('Enkrat višana krivulja je pripravljena za preverjanje točk in uteži.', 'The once-elevated curve is ready for checking points and weights.'),
            },
        },
        {
            id: 'rational-elevation-twice', order: 5,
            title: text('Ponovno višanje', 'Elevating again'),
            purpose: text('Preverjanje, da krivulja ostane enaka tudi po več višanjih.', 'Checking that the curve stays the same after several elevations.'),
            explanation: text(
                'Drugo višanje uporabi uteži, ki se trenutno uporabljajo za izračun, in da stopnjo 5 s šestimi točkami. Krivulja je še vedno ista, če so uteži pozitivne.',
                'The second elevation uses the weights currently used for evaluation and gives degree 5 with six points. The curve is still the same as long as the weights are positive.',
            ),
            formulaIds: ['rational-elevation-shape-invariance'],
            frames: [frame('rational-elevation-twice-explanation', 'explanation'), frame('rational-elevation-twice-observation', 'observation')],
            learnerInteraction: 'observe',
            observationPrompt: text('Primerjaj obliko krivulje po drugem višanju s prvotno in preštej točke.', 'Compare the curve shape after the second elevation with the original and count the points.'),
            expectedObservations: [text('Šest točk, krivulja je na istem mestu kot na začetku.', 'Six points, and the curve is in the same place as at the start.')],
            scene: {
                id: 'rational-elevation-twice-scene', basedOn: 'demonstration-default',
                actions: [{name: 'show-control-polygon', value: true}, {name: 'show-weights', value: true}, {name: 'elevate-degree', value: true}, {name: 'elevate-degree', value: true}],
                expectedState: text('Prikazana je stopnja 5 s šestimi točkami in utežmi.', 'Degree 5 is shown with six points and weights.'),
            },
        },
    ],
    sources: [
        {
            id: 'farin-rational-elevation',
            citation: 'Farin, G. Curves and Surfaces for CAGD: A Practical Guide, 5th ed., Morgan Kaufmann, 2002.',
            supports: ['rational Bézier curves', 'homogeneous coordinates', 'degree elevation'],
            implementationCorrespondence: 'RationalBezierCurve.elevate() elevates (w_iP_i, w_i) and divides by the new weight.',
        },
        {
            id: 'pbp-rational-elevation',
            citation: 'Prautzsch, H., Boehm, W., Paluszny, M. Bézier and B-Spline Techniques, Springer, 2002.',
            supports: ['degree elevation of rational Bézier curves', 'projective invariance'],
        },
        {
            id: 'bezeg-rational-elevation-implementation',
            citation: 'Bezeg source: src/graphs/curves/rational/RationalElevationGraph.tsx and src/bezeg/impl/curve/rational-bezier-curve.ts.',
            supports: ['default points and weights', 'degree elevation action', 'weight labels'],
        },
    ],
    edgeCases: [
        text('Zveze veljajo za pozitivne uteži; pri ničelnih ali negativnih utežeh projekcija ni vedno določena.', 'The relations are stated for positive weights; with zero or negative weights the projection is not always defined.'),
        text('Nove točke in uteži so drugačna predstavitev iste krivulje; nove notranje točke ne ležijo nujno na krivulji.', 'The new points and weights are another representation of the same curve; the new interior points do not necessarily lie on the curve.'),
    ],
    unresolvedQuestions: [
        text('Pred classroom-ready pregledom je treba potrditi, ali naj učenci višanje najprej opazujejo ali ga računajo ročno, in preveriti slovensko izrazje za homogene točke.', 'Before classroom-ready review, confirm whether students should first observe elevation or calculate it by hand, and review the Slovenian terminology for homogeneous points.'),
    ],
};

export const foundationGuidedLessons: readonly GuidedLesson[] = [bernstein, rationalElevation];
