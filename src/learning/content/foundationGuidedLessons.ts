/**
 * Guided lessons of the Foundations family: Bernstein basis functions, rational degree elevation and complex multiplication.
 *
 * The complex multiplication lesson uses the generic function actions (`set-function-parameter` complex-z-re/complex-z-im/complex-w-re/
 * complex-w-im, `set-function-choice` complex-example and `show-function-element` complex-product/complex-arguments); the polar
 * parameters complex-w-modulus/complex-w-argument are available to scenes but not needed by this lesson. A prediction step hides the
 * product and the learner presses the graph's own Show product after predicting; only the step that explains the reduction modulo 2 pi
 * shows it. The `general` example needs no reduction, so that step sets its own operands (z = w = -1 + i).
 */
import type {FunctionParameterName} from '../model';
import type {ComplexExampleId} from '../../analysis/complex';
import type {GuidedLesson, GuidedLessonFrame, GuidedLessonFrameKind, LocalizedText, SceneAction} from './guidedLessons';

const text = (sl: string, en: string): LocalizedText => ({sl, en});
const frame = (id: string, kind: GuidedLessonFrameKind, formulaIds?: readonly string[]): GuidedLessonFrame => ({id, kind, formulaIds});
const complexParameter = (name: FunctionParameterName, value: number): SceneAction => ({name: 'set-function-parameter', value: {name, value}});
const complexExample = (value: ComplexExampleId): SceneAction => ({name: 'set-function-choice', value: {name: 'complex-example', value}});
const complexProduct = (visible: boolean): SceneAction => ({name: 'show-function-element', value: {name: 'complex-product', value: visible}});
const complexArguments = (visible: boolean): SceneAction => ({name: 'show-function-element', value: {name: 'complex-arguments', value: visible}});

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

const complexMultiplication: GuidedLesson = {
    demonstrationId: 'complex-multiplication',
    title: text('Kompleksno množenje: vrtež in raztegnitev', 'Complex multiplication: rotation and scaling'),
    summary: text(
        'Kompleksno število je točka v ravnini. Pri množenju se moduli pomnožijo, argumenti pa seštejejo (po modulu \\(2\\pi\\)): množenje s številom \\(w\\) zavrti točko za \\(\\arg w\\) in jo raztegne za \\(|w|\\).',
        'A complex number is a point in the plane. When two numbers are multiplied, the moduli multiply and the arguments add (modulo \\(2\\pi\\)): multiplying by \\(w\\) rotates the point by \\(\\arg w\\) and scales it by \\(|w|\\).',
    ),
    prerequisites: [
        text('Potrebno je poznavanje kartezičnih koordinat točke v ravnini.', 'Assumes familiarity with the Cartesian coordinates of a point in the plane.'),
        text('Priporočeno je, da veš, kaj sta sinus in kosinus kota; števila \\(i\\), modula in argumenta lekcija vpelje.', 'It helps to know the sine and cosine of an angle; the lesson introduces the number \\(i\\), the modulus and the argument.'),
    ],
    learningGoals: [
        text('Izračunaš \\((1+i)\\,i=-1+i\\) in to razložiš kot vrtež za \\(\\tfrac\\pi2\\).', 'Compute \\((1+i)\\,i=-1+i\\) and explain it as a rotation by \\(\\tfrac\\pi2\\).'),
        text('Množenje z \\(1\\), z \\(-1\\) in s pozitivnim realnim številom opišeš kot mirovanje, vrtež za \\(\\pi\\) in raztegnitev.', 'Describe multiplication by \\(1\\), by \\(-1\\) and by a positive real number as staying put, a rotation by \\(\\pi\\) and a scaling.'),
        text('Uporabiš pravili \\(|zw|=|z||w|\\) in \\(\\arg zw\\equiv\\arg z+\\arg w\\) ter vsoto argumentov po potrebi zmanjšaš za \\(2\\pi\\).', 'Use the rules \\(|zw|=|z||w|\\) and \\(\\arg zw\\equiv\\arg z+\\arg w\\) and reduce the sum of the arguments by \\(2\\pi\\) when needed.'),
        text('Razložiš, zakaj je pri \\(0\\) zmnožek \\(0\\), argument pa ni definiran.', 'Explain why the product with \\(0\\) is \\(0\\) while its argument is undefined.'),
    ],
    formulaBlocks: [
        {
            id: 'complex-product-formula',
            latex: '(a+bi)(c+di)=(ac-bd)+(ad+bc)\\,i',
            notation: text(
                'Števili \\(z=a+bi\\) in \\(w=c+di\\) imata realna dela \\(a\\), \\(c\\) in imaginarna dela \\(b\\), \\(d\\).',
                'The numbers \\(z=a+bi\\) and \\(w=c+di\\) have real parts \\(a\\), \\(c\\) and imaginary parts \\(b\\), \\(d\\).',
            ),
            explanation: text(
                'Zmnožek dobimo z razpletom oklepajev in lastnostjo \\(i^2=-1\\). Aplikacija ga izračuna natančno iz koordinat na mreži.',
                'The product follows by expanding the brackets and using \\(i^2=-1\\). The app computes it exactly from the grid coordinates.',
            ),
        },
        {
            id: 'complex-imaginary-unit',
            latex: 'i^2=-1',
            notation: text(
                'Število \\(i\\) je točka \\((0,1)\\) in velja \\(i^2=-1\\).',
                'The number \\(i\\) is the point \\((0,1)\\) and \\(i^2=-1\\).',
            ),
            explanation: text(
                'Lastnost \\(i^2=-1\\) pretvori člen \\(bd\\,i^2\\) v \\(-bd\\).',
                'The property \\(i^2=-1\\) turns the term \\(bd\\,i^2\\) into \\(-bd\\).',
            ),
        },
        {
            id: 'complex-polar-form',
            latex: 'z=r(\\cos\\varphi+i\\sin\\varphi)',
            notation: text(
                'Število \\(z\\) zapišemo z modulom \\(r\\) in argumentom \\(\\varphi\\).',
                'The number \\(z\\) is written with the modulus \\(r\\) and the argument \\(\\varphi\\).',
            ),
            explanation: text(
                'To je polarna oblika števila \\(z=a+bi\\).',
                'This is the polar form of the number \\(z=a+bi\\).',
            ),
        },
        {
            id: 'complex-polar-modulus',
            latex: 'r=|z|=\\sqrt{a^2+b^2},\\quad\\varphi=\\arg z',
            notation: text(
                'Modul \\(r\\) je razdalja točke od izhodišča, argument \\(\\varphi\\) pa kot od pozitivne realne osi, v radianih, v \\((-\\pi,\\pi]\\).',
                'The modulus \\(r\\) is the distance of the point from the origin and the argument \\(\\varphi\\) is the angle from the positive real axis, in radians, in \\((-\\pi,\\pi]\\).',
            ),
            explanation: text(
                'Za \\(z=0\\) argument ne obstaja, saj izhodišče nima smeri. Aplikacija zato piše, da ni definiran, in ne \\(0\\).',
                'For \\(z=0\\) the argument does not exist, since the origin has no direction. The app therefore says that it is undefined and not \\(0\\).',
            ),
        },
        {
            id: 'complex-modulus-argument-rule',
            latex: '|zw|=|z|\\,|w|',
            notation: text(
                'Modul zmnožka je zmnožek modulov.',
                'The modulus of the product is the product of the moduli.',
            ),
            explanation: text(
                'Moduli se pomnožijo.',
                'The moduli multiply.',
            ),
        },
        {
            id: 'complex-argument-rule',
            latex: '\\arg(zw)\\equiv\\arg z+\\arg w\\pmod{2\\pi}',
            notation: text(
                'Znak \\(\\equiv\\) pomeni enakost do večkratnika kota \\(2\\pi\\).',
                'The sign \\(\\equiv\\) means equality up to a multiple of \\(2\\pi\\).',
            ),
            explanation: text(
                'Pomnožita se polarni obliki \\(z=r(\\cos\\varphi+i\\sin\\varphi)\\) in \\(w=s(\\cos\\psi+i\\sin\\psi)\\): moduli se pomnožijo, argumenta se seštejeta (adicijska izreka). Zato je množenje z \\(w\\) vrtež za \\(\\arg w\\) in raztegnitev za \\(|w|\\).',
                'Multiply the polar forms \\(z=r(\\cos\\varphi+i\\sin\\varphi)\\) and \\(w=s(\\cos\\psi+i\\sin\\psi)\\): the moduli multiply and the arguments add (the addition theorems). So multiplying by \\(w\\) rotates by \\(\\arg w\\) and scales by \\(|w|\\).',
            ),
        },
        {
            id: 'complex-argument-reduction',
            latex: '\\arg(zw)=\\arg z+\\arg w-2\\pi k\\in(-\\pi,\\pi]',
            notation: text(
                'Glavna vrednost argumenta zmnožka leži v \\((-\\pi,\\pi]\\).',
                'The principal value of the argument of the product lies in \\((-\\pi,\\pi]\\).',
            ),
            explanation: text(
                'Vsota dveh argumentov lahko preseže \\(\\pi\\) ali pade na \\(-\\pi\\) ali pod. Kot je potem enak kotu, ki se od vsote razlikuje za \\(2\\pi\\), in prav ta leži v \\((-\\pi,\\pi]\\).',
                'The sum of two arguments can exceed \\(\\pi\\) or fall to \\(-\\pi\\) or below. The angle is then the one that differs from the sum by \\(2\\pi\\), and that one lies in \\((-\\pi,\\pi]\\).',
            ),
        },
        {
            id: 'complex-argument-reduction-k',
            latex: 'k\\in\\{-1,0,1\\}',
            notation: text(
                'Celo število \\(k\\) izbere število polnih obratov, pri katerem je argument spet glavna vrednost.',
                'The integer \\(k\\) chooses the number of full turns that brings the argument back to its principal value.',
            ),
            explanation: text(
                'Če vsota argumentov leži v \\((-\\pi,\\pi]\\), je \\(k=0\\); nad \\(\\pi\\) je \\(k=1\\), pri \\(-\\pi\\) ali pod njim pa \\(k=-1\\).',
                'If the sum of the arguments lies in \\((-\\pi,\\pi]\\), then \\(k=0\\); above \\(\\pi\\) it is \\(k=1\\), and at \\(-\\pi\\) or below it is \\(k=-1\\).',
            ),
        },
        {
            id: 'complex-zero-product',
            latex: 'z\\cdot0=0,\\qquad |z\\cdot0|=|z|\\cdot0=0',
            notation: text(
                'Število \\(0\\) je izhodišče; množenje z njim vsako točko pošlje v izhodišče.',
                'The number \\(0\\) is the origin; multiplying by it sends every point to the origin.',
            ),
            explanation: text(
                'Moduli se še vedno množijo, argumenta pa ni: izhodišče nima smeri, zato pravilo za argumente tu ne pove ničesar.',
                'The moduli still multiply, but there is no argument: the origin has no direction, so the rule for arguments says nothing here.',
            ),
        },
    ],
    workedExamples: [
        {
            id: 'complex-reduction-example',
            title: text('Kvadrat števila \\(-1+i\\)', 'The square of \\(-1+i\\)'),
            calculationLatex: '(-1+i)^2=1-2i+i^2=-2i,\\qquad \\tfrac{3\\pi}{4}+\\tfrac{3\\pi}{4}=\\tfrac{3\\pi}{2},\\quad \\tfrac{3\\pi}{2}-2\\pi=-\\tfrac{\\pi}{2}',
            resultLatex: 'zw=-2i,\\qquad |zw|=\\sqrt2\\cdot\\sqrt2=2,\\qquad \\arg(zw)=-\\tfrac{\\pi}{2}',
            check: text(
                'Vsota argumentov \\(\\tfrac{3\\pi}{2}\\) je večja od \\(\\pi\\), zato ji odštejemo \\(2\\pi\\) in dobimo \\(-\\tfrac\\pi2\\). To je res argument števila \\(-2i\\), ki leži na negativni imaginarni osi; modul \\(2\\) je zmnožek modulov.',
                'The sum of the arguments \\(\\tfrac{3\\pi}{2}\\) exceeds \\(\\pi\\), so we subtract \\(2\\pi\\) and get \\(-\\tfrac\\pi2\\). That is indeed the argument of \\(-2i\\), which lies on the negative imaginary axis; the modulus \\(2\\) is the product of the moduli.',
            ),
        },
    ],
    steps: [
        {
            id: 'complex-point-step', order: 1,
            title: text('Kompleksno število kot točka', 'A complex number as a point'),
            purpose: text('Povezati zapis \\(a+bi\\) s točko, modulom in argumentom.', 'Linking the form \\(a+bi\\) to a point, a modulus and an argument.'),
            explanation: text(
                'Število \\(a+bi\\) ustreza točki \\((a,b)\\) v ravnini: \\(a\\) je realni, \\(b\\) imaginarni del. Število \\(i\\) je točka \\((0,1)\\) in velja \\(i^2=-1\\). Modul \\(|z|\\) je razdalja od izhodišča, argument \\(\\arg z\\) pa kot od pozitivne realne osi do puščice. Na grafu sta \\(z=1+i\\) (krog) in \\(w=i\\) (kvadrat), loka kažeta njuna argumenta. Zmnožek je še skrit.',
                'The number \\(a+bi\\) corresponds to the point \\((a,b)\\) in the plane: \\(a\\) is the real and \\(b\\) the imaginary part. The number \\(i\\) is the point \\((0,1)\\) and \\(i^2=-1\\). The modulus \\(|z|\\) is the distance from the origin and the argument \\(\\arg z\\) is the angle from the positive real axis to the arrow. The graph shows \\(z=1+i\\) (circle) and \\(w=i\\) (square), and the arcs show their arguments. The product is still hidden.',
            ),
            formulaIds: ['complex-polar-form', 'complex-polar-modulus'],
            frames: [frame('complex-point-explanation', 'explanation'), frame('complex-point-observation', 'observation')],
            learnerInteraction: 'observe',
            observationPrompt: text(
                'Preberi v odčitkih modul in argument števil \\(z\\) in \\(w\\). Nato povleci \\(z\\) in opazuj, kako se spreminjata.',
                'Read the modulus and the argument of \\(z\\) and \\(w\\) in the readouts. Then drag \\(z\\) and watch how they change.',
            ),
            expectedObservations: [text(
                '\\(|z|=\\sqrt2\\approx1{,}4142\\) in \\(\\arg z=\\tfrac\\pi4\\); \\(|w|=1\\) in \\(\\arg w=\\tfrac\\pi2\\). Zmnožek je skrit.',
                '\\(|z|=\\sqrt2\\approx1.4142\\) and \\(\\arg z=\\tfrac\\pi4\\); \\(|w|=1\\) and \\(\\arg w=\\tfrac\\pi2\\). The product is hidden.',
            )],
            scene: {
                id: 'complex-point-scene', basedOn: 'demonstration-default',
                actions: [complexExample('rotation-i'), complexProduct(false), complexArguments(true)],
                expectedState: text(
                    'Prikazana sta \\(z=1+i\\) in \\(w=i\\) z loki argumentov; zmnožek je skrit.',
                    'The numbers \\(z=1+i\\) and \\(w=i\\) are shown with their argument arcs; the product is hidden.',
                ),
            },
        },
        {
            id: 'complex-rotation-i-step', order: 2,
            title: text('Množenje z \\(i\\): napoved', 'Multiplying by \\(i\\): a prediction'),
            purpose: text('Napovedati, kam pade \\((1+i)\\,i\\), preden se zmnožek pokaže.', 'Predicting where \\((1+i)\\,i\\) lands before the product is shown.'),
            explanation: text(
                'Število \\(i\\) ima modul \\(1\\) in argument \\(\\tfrac\\pi2\\). Če se moduli množijo in argumenti seštevajo, mora zmnožek \\(zi\\) imeti enak modul kot \\(z\\) in argument za \\(\\tfrac\\pi2\\) večji. Napovej točko \\(zw\\) za \\(z=1+i\\), \\(w=i\\), nato pritisni Pokaži zmnožek.',
                'The number \\(i\\) has modulus \\(1\\) and argument \\(\\tfrac\\pi2\\). If moduli multiply and arguments add, the product \\(zi\\) must have the same modulus as \\(z\\) and an argument larger by \\(\\tfrac\\pi2\\). Predict the point \\(zw\\) for \\(z=1+i\\), \\(w=i\\), then press Show product.',
            ),
            formulaIds: ['complex-product-formula', 'complex-imaginary-unit', 'complex-modulus-argument-rule', 'complex-argument-rule'],
            frames: [frame('complex-rotation-i-explanation', 'explanation'), frame('complex-rotation-i-observation', 'observation')],
            learnerInteraction: 'adjust-construction-parameter',
            observationPrompt: text(
                'Napovej koordinate, modul in argument števila \\(zw\\); šele nato pritisni Pokaži zmnožek in primerjaj.',
                'Predict the coordinates, the modulus and the argument of \\(zw\\); only then press Show product and compare.',
            ),
            expectedObservations: [text(
                '\\(zw=-1+i\\), \\(|zw|=\\sqrt2\\) in \\(\\arg zw=\\tfrac{3\\pi}{4}=\\tfrac\\pi4+\\tfrac\\pi2\\): puščica se je zavrtela za \\(\\tfrac\\pi2\\), dolžina je ostala.',
                '\\(zw=-1+i\\), \\(|zw|=\\sqrt2\\) and \\(\\arg zw=\\tfrac{3\\pi}{4}=\\tfrac\\pi4+\\tfrac\\pi2\\): the arrow rotated by \\(\\tfrac\\pi2\\) and kept its length.',
            )],
            scene: {
                id: 'complex-rotation-i-scene', basedOn: 'demonstration-default',
                actions: [complexExample('rotation-i'), complexProduct(false), complexArguments(true)],
                expectedState: text(
                    'Prikazana sta \\(z=1+i\\) in \\(w=i\\); zmnožek je skrit.',
                    'The numbers \\(z=1+i\\) and \\(w=i\\) are shown; the product is hidden.',
                ),
            },
        },
        {
            id: 'complex-one-minus-one-step', order: 3,
            title: text('Množenje z \\(1\\) in z \\(-1\\)', 'Multiplying by \\(1\\) and by \\(-1\\)'),
            purpose: text('Videti, da je množenje z \\(1\\) mirovanje, z \\(-1\\) pa vrtež za \\(\\pi\\).', 'Seeing that multiplying by \\(1\\) leaves the point, and by \\(-1\\) rotates it by \\(\\pi\\).'),
            explanation: text(
                'Prejšnji korak je dal \\((1+i)\\,i=-1+i\\). Število \\(1\\) ima modul \\(1\\) in argument \\(0\\), zato \\(z\\cdot1=z\\). Število \\(-1\\) ima modul \\(1\\) in argument \\(\\pi\\), zato \\(z\\cdot(-1)=-z\\): točka se prezrcali čez izhodišče. Na grafu je zdaj \\(w=-1\\). Vsota argumentov \\(\\tfrac{5\\pi}{4}\\) je zunaj \\((-\\pi,\\pi]\\); to razloži šesti korak.',
                'The previous step gave \\((1+i)\\,i=-1+i\\). The number \\(1\\) has modulus \\(1\\) and argument \\(0\\), so \\(z\\cdot1=z\\). The number \\(-1\\) has modulus \\(1\\) and argument \\(\\pi\\), so \\(z\\cdot(-1)=-z\\): the point is reflected through the origin. The graph now shows \\(w=-1\\). The sum of the arguments \\(\\tfrac{5\\pi}{4}\\) lies outside \\((-\\pi,\\pi]\\); step 6 explains this.',
            ),
            formulaIds: ['complex-modulus-argument-rule', 'complex-argument-rule'],
            frames: [frame('complex-one-minus-one-explanation', 'explanation'), frame('complex-one-minus-one-observation', 'observation')],
            learnerInteraction: 'adjust-construction-parameter',
            observationPrompt: text(
                'Napovej \\(zw\\) za \\(w=-1\\) in pritisni Pokaži zmnožek. Nato izberi primer Množenje z 1 in napovej še ta zmnožek.',
                'Predict \\(zw\\) for \\(w=-1\\) and press Show product. Then choose the example Multiply by 1 and predict that product too.',
            ),
            expectedObservations: [
                text('Pri \\(w=-1\\) je \\(zw=-1-i\\), \\(|zw|=\\sqrt2\\): točka je prezrcaljena čez izhodišče.', 'For \\(w=-1\\), \\(zw=-1-i\\) and \\(|zw|=\\sqrt2\\): the point is reflected through the origin.'),
                text('Pri \\(w=1\\) je \\(zw=z=1+i\\): točka ostane.', 'For \\(w=1\\), \\(zw=z=1+i\\): the point stays.'),
            ],
            scene: {
                id: 'complex-one-minus-one-scene', basedOn: 'demonstration-default',
                actions: [complexExample('negation'), complexProduct(false), complexArguments(true)],
                expectedState: text(
                    'Prikazana sta \\(z=1+i\\) in \\(w=-1\\); zmnožek je skrit.',
                    'The numbers \\(z=1+i\\) and \\(w=-1\\) are shown; the product is hidden.',
                ),
            },
        },
        {
            id: 'complex-scaling-step', order: 4,
            title: text('Pozitivno realno število \\(2\\)', 'The positive real number \\(2\\)'),
            purpose: text('Videti raztegnitev brez vrteža.', 'Seeing scaling without rotation.'),
            explanation: text(
                'Število \\(2\\) leži na pozitivni realni osi: modul je \\(2\\), argument \\(0\\). Argument se zato ne spremeni, modul pa se podvoji: \\(2z\\) kaže v isto smer kot \\(z\\), le dvakrat dlje. Na grafu je \\(w=2\\); zmnožek je skrit.',
                'The number \\(2\\) lies on the positive real axis: its modulus is \\(2\\) and its argument is \\(0\\). The argument therefore does not change and the modulus doubles: \\(2z\\) points the same way as \\(z\\), twice as far. The graph shows \\(w=2\\); the product is hidden.',
            ),
            formulaIds: ['complex-modulus-argument-rule', 'complex-argument-rule'],
            frames: [frame('complex-scaling-explanation', 'explanation'), frame('complex-scaling-observation', 'observation')],
            learnerInteraction: 'adjust-construction-parameter',
            observationPrompt: text(
                'Napovej koordinate, modul in argument števila \\(zw\\); pritisni Pokaži zmnožek in primerjaj z argumentom števila \\(z\\).',
                'Predict the coordinates, the modulus and the argument of \\(zw\\); press Show product and compare with the argument of \\(z\\).',
            ),
            expectedObservations: [text(
                '\\(zw=2+2i\\), \\(|zw|=2\\sqrt2\\approx2{,}8284\\) in \\(\\arg zw=\\tfrac\\pi4=\\arg z\\): ista smer, dvakratna dolžina.',
                '\\(zw=2+2i\\), \\(|zw|=2\\sqrt2\\approx2.8284\\) and \\(\\arg zw=\\tfrac\\pi4=\\arg z\\): the same direction, twice the length.',
            )],
            scene: {
                id: 'complex-scaling-scene', basedOn: 'demonstration-default',
                actions: [complexExample('scaling'), complexProduct(false), complexArguments(true)],
                expectedState: text(
                    'Prikazana sta \\(z=1+i\\) in \\(w=2\\); zmnožek je skrit.',
                    'The numbers \\(z=1+i\\) and \\(w=2\\) are shown; the product is hidden.',
                ),
            },
        },
        {
            id: 'complex-general-step', order: 5,
            title: text('Splošno število: vrtež in raztegnitev', 'A general number: rotation and scaling'),
            purpose: text('Združiti vrtež in raztegnitev v enem množenju.', 'Combining rotation and scaling in one multiplication.'),
            explanation: text(
                'Zdaj je \\(w=1+i\\), tako da imata \\(z\\) in \\(w\\) modul \\(\\sqrt2\\) in argument \\(\\tfrac\\pi4\\). Množenje z \\(w\\) zavrti za \\(\\tfrac\\pi4\\) in raztegne za \\(\\sqrt2\\). Napovej, kam pade \\(zw\\), preden pritisneš Pokaži zmnožek.',
                'Now \\(w=1+i\\), so \\(z\\) and \\(w\\) both have modulus \\(\\sqrt2\\) and argument \\(\\tfrac\\pi4\\). Multiplying by \\(w\\) rotates by \\(\\tfrac\\pi4\\) and scales by \\(\\sqrt2\\). Predict where \\(zw\\) lands before you press Show product.',
            ),
            formulaIds: ['complex-product-formula', 'complex-imaginary-unit', 'complex-modulus-argument-rule', 'complex-argument-rule'],
            frames: [frame('complex-general-explanation', 'explanation'), frame('complex-general-observation', 'observation')],
            learnerInteraction: 'adjust-construction-parameter',
            observationPrompt: text(
                'Napovej modul in argument števila \\(zw\\) iz pravil, nato pritisni Pokaži zmnožek. Preveri še z razpletom \\((1+i)^2\\).',
                'Predict the modulus and the argument of \\(zw\\) from the rules, then press Show product. Check also by expanding \\((1+i)^2\\).',
            ),
            expectedObservations: [text(
                '\\(zw=2i\\), \\(|zw|=\\sqrt2\\cdot\\sqrt2=2\\) in \\(\\arg zw=\\tfrac\\pi4+\\tfrac\\pi4=\\tfrac\\pi2\\); razplet da \\(1+2i+i^2=2i\\).',
                '\\(zw=2i\\), \\(|zw|=\\sqrt2\\cdot\\sqrt2=2\\) and \\(\\arg zw=\\tfrac\\pi4+\\tfrac\\pi4=\\tfrac\\pi2\\); the expansion gives \\(1+2i+i^2=2i\\).',
            )],
            scene: {
                id: 'complex-general-scene', basedOn: 'demonstration-default',
                actions: [complexExample('general'), complexProduct(false), complexArguments(true)],
                expectedState: text(
                    'Prikazana sta \\(z=1+i\\) in \\(w=1+i\\); zmnožek je skrit.',
                    'The numbers \\(z=1+i\\) and \\(w=1+i\\) are shown; the product is hidden.',
                ),
            },
        },
        {
            id: 'complex-reduction-step', order: 6,
            title: text('Argumenti po modulu \\(2\\pi\\)', 'Arguments modulo \\(2\\pi\\)'),
            purpose: text('Razumeti, zakaj se vsota argumentov včasih zmanjša za \\(2\\pi\\).', 'Understanding why the sum of the arguments is sometimes reduced by \\(2\\pi\\).'),
            explanation: text(
                'Zdaj je \\(z=w=-1+i\\), oba z modulom \\(\\sqrt2\\) in argumentom \\(\\tfrac{3\\pi}{4}\\). Vsota argumentov je \\(\\tfrac{3\\pi}{2}\\) in leži zunaj \\((-\\pi,\\pi]\\). Argument zmnožka je glavna vrednost, zato odštejemo \\(2\\pi\\): \\(\\arg zw=-\\tfrac\\pi2\\). Zmnožek je tu že prikazan, odčitek pa navede zmanjšanje.',
                'Now \\(z=w=-1+i\\), both with modulus \\(\\sqrt2\\) and argument \\(\\tfrac{3\\pi}{4}\\). The sum of the arguments is \\(\\tfrac{3\\pi}{2}\\) and lies outside \\((-\\pi,\\pi]\\). The argument of the product is the principal value, so we subtract \\(2\\pi\\): \\(\\arg zw=-\\tfrac\\pi2\\). The product is already shown here, and the readout states the reduction.',
            ),
            formulaIds: ['complex-argument-reduction', 'complex-argument-reduction-k'], workedExampleId: 'complex-reduction-example',
            frames: [frame('complex-reduction-explanation', 'explanation'), frame('complex-reduction-calculation', 'calculation'), frame('complex-reduction-observation', 'observation')],
            learnerInteraction: 'adjust-construction-parameter',
            observationPrompt: text(
                'Preberi vsoto argumentov in stanje pod odčitki. Nato povleci \\(w\\) tako, da vsota argumentov pade nazaj v \\((-\\pi,\\pi]\\), in opazuj, kdaj stanje navede zmanjšanje.',
                'Read the sum of the arguments and the status under the readouts. Then drag \\(w\\) so that the sum of the arguments falls back into \\((-\\pi,\\pi]\\) and watch when the status mentions the reduction.',
            ),
            expectedObservations: [text(
                'Vsota argumentov \\(\\tfrac{3\\pi}{2}\\) se zmanjša v \\(-\\tfrac\\pi2\\); \\(zw=-2i\\) in \\(|zw|=2\\).',
                'The sum of the arguments \\(\\tfrac{3\\pi}{2}\\) is reduced to \\(-\\tfrac\\pi2\\); \\(zw=-2i\\) and \\(|zw|=2\\).',
            )],
            scene: {
                id: 'complex-reduction-scene', basedOn: 'demonstration-default',
                actions: [
                    complexExample('general'), complexParameter('complex-z-re', -1), complexParameter('complex-w-re', -1),
                    complexProduct(true), complexArguments(true),
                ],
                expectedState: text(
                    'Prikazani so \\(z=-1+i\\), \\(w=-1+i\\), zmnožek \\(-2i\\) in loki argumentov.',
                    'The numbers \\(z=-1+i\\) and \\(w=-1+i\\), the product \\(-2i\\) and the argument arcs are shown.',
                ),
            },
        },
        {
            id: 'complex-zero-step', order: 7,
            title: text('Množenje z \\(0\\) in samostojno raziskovanje', 'Multiplying by \\(0\\) and exploring on your own'),
            purpose: text('Razumeti, da je zmnožek z \\(0\\) izhodišče brez argumenta, in nadaljevati samostojno.', 'Understanding that the product with \\(0\\) is the origin with no argument, and continuing independently.'),
            explanation: text(
                'Zdaj je \\(w=0\\). Modul se množi, \\(|zw|=|z|\\cdot0=0\\), zato je \\(zw=0\\) za vsak \\(z\\). Izhodišče nima smeri, zato argument števila \\(0\\) ni definiran; aplikacija zato ne piše \\(0\\), ampak da ni definiran, polje za argument števila \\(w\\) pa je onemogočeno. Povzetek: moduli se množijo, argumenti seštevajo po modulu \\(2\\pi\\), število \\(0\\) pa vsako točko preslika v izhodišče. Zdaj raziskuj sam: povleci \\(z\\) in \\(w\\), vnesi koordinate ali polarni modul in argument števila \\(w\\) ter napovej, preden pokažeš zmnožek.',
                'Now \\(w=0\\). The modulus multiplies, \\(|zw|=|z|\\cdot0=0\\), so \\(zw=0\\) for every \\(z\\). The origin has no direction, so the argument of \\(0\\) is undefined; the app therefore does not write \\(0\\) but says that it is undefined, and the argument field of \\(w\\) is disabled. In summary: moduli multiply, arguments add modulo \\(2\\pi\\), and the number \\(0\\) collapses a point to the origin. Now explore on your own: drag \\(z\\) and \\(w\\), type coordinates or the polar modulus and argument of \\(w\\), and predict before you show the product.',
            ),
            formulaIds: ['complex-zero-product'],
            frames: [frame('complex-zero-explanation', 'explanation'), frame('complex-zero-observation', 'observation')],
            learnerInteraction: 'adjust-construction-parameter',
            observationPrompt: text(
                'Napovej \\(zw\\) in njegov argument, nato pritisni Pokaži zmnožek in preberi stanje. Nato vnesi modul števila \\(w\\) nad \\(0\\) in opazuj, kam se postavi \\(w\\).',
                'Predict \\(zw\\) and its argument, then press Show product and read the status. Then enter a modulus of \\(w\\) above \\(0\\) and watch where \\(w\\) is placed.',
            ),
            expectedObservations: [text(
                '\\(zw=0\\), \\(|zw|=0\\) in argument števila \\(zw\\) ni definiran, ne \\(0\\). Modul nad \\(0\\) postavi \\(w\\) na pozitivno realno os.',
                '\\(zw=0\\), \\(|zw|=0\\) and the argument of \\(zw\\) is undefined, not \\(0\\). A modulus above \\(0\\) places \\(w\\) on the positive real axis.',
            )],
            scene: {
                id: 'complex-zero-scene', basedOn: 'demonstration-default',
                actions: [complexExample('zero'), complexProduct(false), complexArguments(true)],
                expectedState: text(
                    'Prikazana sta \\(z=1+i\\) in \\(w=0\\); zmnožek je skrit.',
                    'The numbers \\(z=1+i\\) and \\(w=0\\) are shown; the product is hidden.',
                ),
            },
        },
    ],
    sources: [
        {
            id: 'globevnik-brojan-analiza-1-complex-multiplication',
            citation: 'Globevnik, J., Brojan, M. Analiza I, Fakulteta za matematiko in fiziko, Univerza v Ljubljani, §1.7.1 (printed pp. 28–30).',
            supports: ['complex numbers as points of the plane', 'polar form, modulus and argument', 'multiplication multiplies moduli and adds arguments'],
        },
        {
            id: 'bezeg-complex-multiplication-implementation',
            citation: 'Bezeg source: src/analysis/complex.ts, src/analysis/complexModel.ts and src/graphs/complex/ComplexMultiplicationGraph.tsx.',
            supports: ['(1+i)i = -1+i', '(1+i)^2 = 2i, modulus 2, argument pi/2', '(-1+i)^2 = -2i, argument sum 3pi/2 reduced to -pi/2', 'the argument of 0 is undefined'],
            implementationCorrespondence: 'Operand coordinates are multiples of 0.05 in [-2, 2], so products are computed in exact integer units of 1/20 and a real or zero product has an exactly zero imaginary part; the principal argument is atan2 in (-pi, pi] and is undefined (never 0) for 0; polar input for w is rounded to the nearest grid point and rejected when it leaves the square or falls to the origin; a lesson scene applies set-function-parameter, set-function-choice and show-function-element actions through the same setters as the controls in one synchronous tick.',
        },
    ],
    edgeCases: [
        text(
            'Koordinate števil \\(z\\) in \\(w\\) morajo biti večkratniki števila \\(0{,}05\\) med \\(-2\\) in \\(2\\); drugačna vrednost se zavrne in model ostane nespremenjen, datoteka z njo pa se ne uvozi in pove, kaj popraviti.',
            'The coordinates of \\(z\\) and \\(w\\) must be multiples of \\(0.05\\) between \\(-2\\) and \\(2\\); any other value is rejected and the model stays unchanged, and a file with such a value is not imported and says what to correct.',
        ),
        text(
            'Polarni vnos števila \\(w\\) izbere najbližjo točko mreže \\(0{,}05\\); polji nato kažeta polarno obliko zaokroženega števila. Vnos, ki bi \\(w\\) zaokrožil v \\(0\\) ali ven iz kvadrata, se zavrne.',
            'A polar input for \\(w\\) selects the nearest point of the \\(0.05\\) grid; the fields then show the polar form of the rounded number. An input that would round \\(w\\) to \\(0\\) or out of the square is rejected.',
        ),
        text(
            'Argument števila \\(0\\) ni definiran in se nikoli ne prikaže kot \\(0\\); pri \\(w=0\\) je polje za argument onemogočeno z razlago.',
            'The argument of \\(0\\) is undefined and is never shown as \\(0\\); with \\(w=0\\) the argument field is disabled with an explanation.',
        ),
        text(
            'Zmnožek z modulom do \\(8\\) lahko leži zunaj privzetega pogleda; plošča to pove, pogled pa lahko pomanjšaš.',
            'A product with a modulus up to \\(8\\) can lie outside the default view; the board says so and you can zoom out.',
        ),
    ],
    unresolvedQuestions: [
        text(
            'Pred pregledom za uporabo v razredu je treba potrditi razdelek §1.7.1 in strani v viru (povzeto po poročilu o kandidatih, ne preverjeno v PDF), slovensko izrazje (vrtež, raztegnitev) ter ali naj lekcija doda stopinje, Moivrov obrazec in korene enote.',
            'Before classroom-ready review, confirm the section §1.7.1 and its pages in the source (taken from the candidate report, not checked in the PDF), the Slovenian terms (vrtež, raztegnitev), and whether the lesson should add degrees, de Moivre\'s formula and roots of unity.',
        ),
    ],
};

export const foundationGuidedLessons: readonly GuidedLesson[] = [bernstein, complexMultiplication, rationalElevation];
