/**
 * Guided lesson N4 of the Numerical methods family (docs/specs/numerical-methods-lessons.md, section N4): the trapezoid and Simpson rules on
 * the `quadrature` Demonstration. A sibling of numericalMethodsGuidedLessons.ts, which passed 600 lines. The text is a one-shot draft
 * (docs/specs/new-lesson-families.md, "One-shot lesson text"): every number it quotes is a value of the scene it belongs to or of an
 * explicitly named change of n, and `numericalQuadratureGuidedLesson.test.ts` checks that against the real graph and an independent loop.
 * Scenes use the `function-choice` actions `quadrature-function` and `quadrature-rule` and the `function-parameter` actions `quadrature-a`,
 * `quadrature-b` and `quadrature-n`. A scene never gives Simpson an odd n: `quadratureScene` throws on one, so that is a content error and
 * never a silent change of n by the graph (which would raise it by one when the rule is switched).
 */
import type {LessonAction} from '../model';
import type {GuidedLesson, GuidedLessonFrame, GuidedLessonFrameKind, GuidedLessonStep, LessonScene, LocalizedText} from './guidedLessons';

const text = (sl: string, en: string): LocalizedText => ({sl, en});
const frame = (id: string, kind: GuidedLessonFrameKind): GuidedLessonFrame => ({id, kind});

type QuadratureFunction = 'square' | 'sin' | 'exp';
type Rule = 'trapezoid' | 'simpson';

/** The default scene is sin on [0, pi] with the trapezoid rule and n = 2; a scene sets the function, the bounds, n and then the rule. */
const quadratureScene = (
    id: string, rule: Rule, fn: QuadratureFunction, a: number, b: number, n: number, sl: string, en: string,
): LessonScene => {
    if (rule === 'simpson' && n % 2 !== 0) throw new Error(`Scene ${id}: Simpson needs an even n, got ${n}.`);
    const bounds: LessonAction[] = [
        {kind: 'function-parameter', name: 'quadrature-a', value: a},
        {kind: 'function-parameter', name: 'quadrature-b', value: b},
    ];
    const actions: LessonAction[] = [
        {kind: 'prepared-scene', sceneId: id, source: 'demonstration-default'},
        {kind: 'function-choice', name: 'quadrature-function', value: fn},
        // The default b is pi: moving a first would break a < b only when a is at least pi.
        ...(a >= Math.PI ? bounds.reverse() : bounds),
        {kind: 'function-parameter', name: 'quadrature-n', value: n},
        {kind: 'function-choice', name: 'quadrature-rule', value: rule},
    ];
    return {id, basedOn: 'demonstration-default', actions, expectedState: text(sl, en)};
};

interface StepContent {
    readonly id: string;
    readonly order: number;
    readonly title: LocalizedText;
    readonly purpose: LocalizedText;
    readonly explanation: LocalizedText;
    readonly formulaIds: readonly string[];
    readonly workedExampleId?: string;
    readonly observationPrompt: LocalizedText;
    readonly expectedObservations: readonly LocalizedText[];
    readonly scene: LessonScene;
}

const step = (content: StepContent): GuidedLessonStep => ({
    ...content,
    frames: [frame(`${content.id}-explanation`, 'explanation'), frame(`${content.id}-observation`, 'observation')],
});

const quadratureLesson: GuidedLesson = {
    demonstrationId: 'quadrature',
    title: text('Trapezno in Simpsonovo pravilo', 'The trapezoid and Simpson rules'),
    summary: text(
        'Trapezno pravilo nadomesti graf na vsakem podintervalu s tetivo, Simpsonovo pravilo pa na vsakem paru podintervalov s parabolo skozi tri točke grafa. Na gladkih funkcijah se napaka trapeznega pravila zmanjša približno na četrtino, ko podvojimo \\(n\\), napaka Simpsonovega pravila pa približno na šestnajstino. Ti razmerji sta opazovani na gladkih primerih; izreka o redu napake \\(h^2\\) in \\(h^4\\) zahtevata gladkost funkcije. Simpsonovo pravilo je natančno za polinome do tretje stopnje.',
        'The trapezoid rule replaces the graph on every subinterval by a chord, and the Simpson rule replaces it on every pair of subintervals by a parabola through three points of the graph. On smooth functions the error of the trapezoid rule falls to about a quarter when \\(n\\) is doubled, and the error of the Simpson rule to about a sixteenth. These ratios are observed on smooth examples; the theorems on the error orders \\(h^2\\) and \\(h^4\\) need the function to be smooth. The Simpson rule is exact for polynomials up to degree three.',
    ),
    prerequisites: [
        text('Potrebno je poznavanje določenega integrala kot ploščine in Riemannovih vsot iz lekcije o določenem integralu.', 'Assumes the definite integral as an area and Riemann sums from the lesson on the definite integral.'),
        text('Priporočena je lekcija o Taylorjevi vrsti, ki razloži, od kod pridejo redi napake.', 'The lesson on the Taylor series is recommended; it explains where the error orders come from.'),
    ],
    learningGoals: [
        text('Izračunaš trapezni približek integrala in iz napake pri \\(n\\) napoveš napako pri \\(2n\\).', 'Compute a trapezoid approximation of an integral and predict the error at \\(2n\\) from the error at \\(n\\).'),
        text('Z razmerjem napak opaziš, da se napaka trapeznega pravila približno deli s \\(4\\), napaka Simpsonovega pa s \\(16\\), in veš, da je prvo razmerje pri Simpsonovem pravilu \\(20{,}7\\), ne \\(16\\).', 'Read off the ratio of the errors that the error of the trapezoid rule is divided by about \\(4\\) and that of the Simpson rule by about \\(16\\), and know that the first Simpson ratio is \\(20.7\\), not \\(16\\).'),
        text('Razložiš, zakaj Simpsonovo pravilo potrebuje sodo število podintervalov, in preveriš, da je točno za \\(x^2\\).', 'Explain why the Simpson rule needs an even number of subintervals, and check that it is exact for \\(x^2\\).'),
        text('Redova napake \\(h^2\\) in \\(h^4\\) povežeš z izrekoma, ki zahtevata gladkost funkcije, in ju ločiš od opazovanih razmerij.', 'Connect the error orders \\(h^2\\) and \\(h^4\\) to theorems that need a smooth function, and separate them from the observed ratios.'),
    ],
    formulaBlocks: [
        {
            id: 'trapezoid-rule',
            latex: 'T_n=h\\left(\\tfrac12f(x_0)+f(x_1)+\\dots+f(x_{n-1})+\\tfrac12f(x_n)\\right),\\qquad h=\\frac{b-a}{n}',
            notation: text(
                '\\(x_i=a+ih\\) so delilne točke, \\(n\\) število podintervalov in \\(h\\) njihova širina.',
                '\\(x_i=a+ih\\) are the division points, \\(n\\) is the number of subintervals and \\(h\\) is their width.',
            ),
            explanation: text(
                'Na podintervalu \\([x_{i-1},x_i]\\) je ploščina trapeza pod tetivo enaka \\(\\tfrac h2\\,(f(x_{i-1})+f(x_i))\\); vsota teh ploščin je \\(T_n\\). Izrek: če je \\(f\\) dvakrat zvezno odvedljiva na \\([a,b]\\), je \\(\\left|\\int_a^bf\\,dx-T_n\\right|\\le\\dfrac{(b-a)\\,h^2}{12}\\max|f\'\'|\\), napaka je torej reda \\(h^2\\).',
                'On the subinterval \\([x_{i-1},x_i]\\) the area of the trapezoid under the chord is \\(\\tfrac h2\\,(f(x_{i-1})+f(x_i))\\); the sum of these areas is \\(T_n\\). Theorem: if \\(f\\) is twice continuously differentiable on \\([a,b]\\), then \\(\\left|\\int_a^bf\\,dx-T_n\\right|\\le\\dfrac{(b-a)\\,h^2}{12}\\max|f\'\'|\\), so the error is of order \\(h^2\\).',
            ),
        },
        {
            id: 'simpson-rule',
            latex: 'S_n=\\frac h3\\left(f(x_0)+4f(x_1)+2f(x_2)+4f(x_3)+\\dots+2f(x_{n-2})+4f(x_{n-1})+f(x_n)\\right),\\qquad n\\text{ even}',
            notation: text(
                'Ista oznaka kot pri trapeznem pravilu; \\(n\\) mora biti sodo, uteži \\(4\\) in \\(2\\) se izmenjujeta.',
                'The same notation as for the trapezoid rule; \\(n\\) must be even, and the weights \\(4\\) and \\(2\\) alternate.',
            ),
            explanation: text(
                'Parabola skozi točke grafa pri \\(x_{2j}\\), \\(x_{2j+1}\\) in \\(x_{2j+2}\\) ima pod seboj ploščino \\(\\tfrac h3\\,(f(x_{2j})+4f(x_{2j+1})+f(x_{2j+2}))\\). Izrek: če je \\(f\\) štirikrat zvezno odvedljiva na \\([a,b]\\), je \\(\\left|\\int_a^bf\\,dx-S_n\\right|\\le\\dfrac{(b-a)\\,h^4}{180}\\max|f^{(4)}|\\), napaka je reda \\(h^4\\); za polinome do tretje stopnje je \\(f^{(4)}=0\\) in je pravilo natančno.',
                'The parabola through the points of the graph at \\(x_{2j}\\), \\(x_{2j+1}\\) and \\(x_{2j+2}\\) has the area \\(\\tfrac h3\\,(f(x_{2j})+4f(x_{2j+1})+f(x_{2j+2}))\\) under it. Theorem: if \\(f\\) is four times continuously differentiable on \\([a,b]\\), then \\(\\left|\\int_a^bf\\,dx-S_n\\right|\\le\\dfrac{(b-a)\\,h^4}{180}\\max|f^{(4)}|\\), so the error is of order \\(h^4\\); for polynomials up to degree three \\(f^{(4)}=0\\) and the rule is exact.',
            ),
        },
    ],
    workedExamples: [
        {
            id: 'trapezoid-two',
            title: text('Trapezno pravilo za \\(\\sin x\\) na \\([0,\\pi]\\), \\(n=2\\)', 'The trapezoid rule for \\(\\sin x\\) on \\([0,\\pi]\\), \\(n=2\\)'),
            calculationLatex: 'T_2=\\frac\\pi2\\left(\\tfrac12\\cdot0+1+\\tfrac12\\cdot0\\right)=\\frac\\pi2',
            resultLatex: '1{,}5708',
            check: text(
                'Delilne točke so \\(0\\), \\(\\tfrac\\pi2\\) in \\(\\pi\\), vrednosti \\(\\sin\\) pa \\(0\\), \\(1\\) in \\(0\\). Približek je \\(\\tfrac\\pi2=1{,}5708\\), natančna vrednost je \\(2\\), napaka \\(0{,}4292\\).',
                'The division points are \\(0\\), \\(\\tfrac\\pi2\\) and \\(\\pi\\), and the values of \\(\\sin\\) are \\(0\\), \\(1\\) and \\(0\\). The approximation is \\(\\tfrac\\pi2=1.5708\\), the exact value is \\(2\\), the error \\(0.4292\\).',
            ),
        },
        {
            id: 'simpson-two',
            title: text('Simpsonovo pravilo za \\(\\sin x\\) na \\([0,\\pi]\\), \\(n=2\\)', 'The Simpson rule for \\(\\sin x\\) on \\([0,\\pi]\\), \\(n=2\\)'),
            calculationLatex: 'S_2=\\frac{\\pi/2}{3}\\left(0+4\\cdot1+0\\right)=\\frac{2\\pi}3',
            resultLatex: '2{,}0944',
            check: text(
                'Ena parabola teče skozi točke \\((0,0)\\), \\((\\tfrac\\pi2,1)\\) in \\((\\pi,0)\\). Približek je \\(\\tfrac{2\\pi}3=2{,}0944\\), napaka \\(0{,}0944\\).',
                'One parabola runs through the points \\((0,0)\\), \\((\\tfrac\\pi2,1)\\) and \\((\\pi,0)\\). The approximation is \\(\\tfrac{2\\pi}3=2.0944\\), the error \\(0.0944\\).',
            ),
        },
    ],
    steps: [
        step({
            id: 'trapezoid-predict', order: 1,
            title: text('Trapezno pravilo pri \\(n=2\\)', 'The trapezoid rule at \\(n=2\\)'),
            purpose: text('Videti ploščino pod grafom in trapezni približek ter napovedati napako pri \\(n=4\\).', 'Seeing the area under the graph and the trapezoid approximation, and predicting the error at \\(n=4\\).'),
            explanation: text(
                'Natančna vrednost integrala \\(\\int_0^\\pi\\sin x\\,dx\\) je \\(2\\). Pri \\(n=2\\) graf nadomestita dve tetivi, trapeza pa imata skupaj ploščino \\(T_2=\\tfrac\\pi2=1{,}5708\\). Absolutna napaka je \\(0{,}4292\\). Napovej, kolikšna bo napaka, ko \\(n\\) podvojimo na \\(4\\).',
                'The exact value of the integral \\(\\int_0^\\pi\\sin x\\,dx\\) is \\(2\\). At \\(n=2\\) the graph is replaced by two chords, and the two trapezoids have the total area \\(T_2=\\tfrac\\pi2=1.5708\\). The absolute error is \\(0.4292\\). Predict the error when \\(n\\) is doubled to \\(4\\).',
            ),
            formulaIds: ['trapezoid-rule'], workedExampleId: 'trapezoid-two',
            observationPrompt: text('Zapiši napoved za napako pri \\(n=4\\), nato poveči \\(n\\) in primerjaj.', 'Write down a prediction for the error at \\(n=4\\), then increase \\(n\\) and compare.'),
            expectedObservations: [text('Pri \\(n=2\\) je približek \\(1{,}5708\\), natančna vrednost \\(2\\) in napaka \\(0{,}4292\\).', 'At \\(n=2\\) the approximation is \\(1.5708\\), the exact value \\(2\\) and the error \\(0.4292\\).')],
            scene: quadratureScene('quadrature-trapezoid-two', 'trapezoid', 'sin', 0, Math.PI, 2,
                'Trapezno pravilo, \\(\\sin x\\) na \\([0,\\pi]\\), \\(n=2\\): približek \\(1{,}5708\\), natančna vrednost \\(2\\), napaka \\(0{,}4292\\).',
                'The trapezoid rule, \\(\\sin x\\) on \\([0,\\pi]\\), \\(n=2\\): approximation \\(1.5708\\), exact value \\(2\\), error \\(0.4292\\).'),
        }),
        step({
            id: 'trapezoid-halve', order: 2,
            title: text('Podvojitev \\(n\\) pri trapeznem pravilu', 'Doubling \\(n\\) in the trapezoid rule'),
            purpose: text('Prebrati napako in razmerje napak pri \\(n=4\\) ter ga primerjati z napovedjo.', 'Reading the error and the ratio of the errors at \\(n=4\\) and comparing it with the prediction.'),
            explanation: text(
                'Pri \\(n=4\\) je približek \\(1{,}8961\\) in napaka \\(0{,}1039\\). Razmerje napak, napaka pri \\(n=2\\) deljena z napako pri \\(n=4\\), je \\(0{,}4292/0{,}1039=4{,}13\\). Pri \\(n=8\\) je napaka \\(0{,}0258\\) in razmerje \\(4{,}03\\). To sta opazovanji na enem gladkem primeru; izrek o redu \\(h^2\\) trdi, da je napaka omejena z \\(\\tfrac{(b-a)h^2}{12}\\max|f\'\'|\\), kar velja za dvakrat zvezno odvedljive funkcije.',
                'At \\(n=4\\) the approximation is \\(1.8961\\) and the error \\(0.1039\\). The ratio of the errors, the error at \\(n=2\\) divided by the error at \\(n=4\\), is \\(0.4292/0.1039=4.13\\). At \\(n=8\\) the error is \\(0.0258\\) and the ratio \\(4.03\\). These are observations on one smooth example; the theorem on the order \\(h^2\\) says that the error is bounded by \\(\\tfrac{(b-a)h^2}{12}\\max|f\'\'|\\), which holds for twice continuously differentiable functions.',
            ),
            formulaIds: ['trapezoid-rule'],
            observationPrompt: text('Nastavi \\(n=8\\) in preberi napako in razmerje.', 'Set \\(n=8\\) and read the error and the ratio.'),
            expectedObservations: [text('Pri \\(n=4\\) je napaka \\(0{,}1039\\) in razmerje \\(4{,}13\\); pri \\(n=8\\) je napaka \\(0{,}0258\\) in razmerje \\(4{,}03\\).', 'At \\(n=4\\) the error is \\(0.1039\\) and the ratio \\(4.13\\); at \\(n=8\\) the error is \\(0.0258\\) and the ratio \\(4.03\\).')],
            scene: quadratureScene('quadrature-trapezoid-four', 'trapezoid', 'sin', 0, Math.PI, 4,
                'Trapezno pravilo, \\(\\sin x\\) na \\([0,\\pi]\\), \\(n=4\\): približek \\(1{,}8961\\), napaka \\(0{,}1039\\), razmerje napak \\(4{,}13\\).',
                'The trapezoid rule, \\(\\sin x\\) on \\([0,\\pi]\\), \\(n=4\\): approximation \\(1.8961\\), error \\(0.1039\\), ratio of the errors \\(4.13\\).'),
        }),
        step({
            id: 'simpson-parabolas', order: 3,
            title: text('Simpsonovo pravilo: parabole', 'The Simpson rule: parabolas'),
            purpose: text('Videti parabole skozi tri točke grafa in prvo razmerje napak pri Simpsonovem pravilu.', 'Seeing the parabolas through three points of the graph and the first ratio of the errors for the Simpson rule.'),
            explanation: text(
                'Pri \\(n=4\\) Simpsonovo pravilo nadomesti graf na prvih dveh podintervalih z eno parabolo skozi tri točke grafa, na drugih dveh pa z drugo. Približek je \\(2{,}0046\\), napaka \\(0{,}00456\\), kar je od trapezne napake \\(0{,}1039\\) pri istem \\(n\\) manj kot za faktor \\(20\\). Razmerje napak je \\(0{,}0944/0{,}00456=20{,}7\\); prvo razmerje pri Simpsonovem pravilu torej ni \\(16\\), saj \\(n=2\\) še ni dovolj velik za asimptotsko obnašanje.',
                'At \\(n=4\\) the Simpson rule replaces the graph on the first two subintervals by one parabola through three points of the graph, and on the other two by another. The approximation is \\(2.0046\\), the error \\(0.00456\\), which is smaller than the trapezoid error \\(0.1039\\) at the same \\(n\\) by more than a factor of \\(20\\). The ratio of the errors is \\(0.0944/0.00456=20.7\\); the first Simpson ratio is therefore not \\(16\\), because \\(n=2\\) is not yet large enough for the asymptotic behaviour.',
            ),
            formulaIds: ['simpson-rule'], workedExampleId: 'simpson-two',
            observationPrompt: text('Preklapljaj med pravilema pri \\(n=4\\) in primerjaj napaki.', 'Switch between the two rules at \\(n=4\\) and compare the errors.'),
            expectedObservations: [text('Pri \\(n=4\\) je napaka Simpsonovega pravila \\(0{,}00456\\), razmerje napak pa \\(20{,}7\\).', 'At \\(n=4\\) the error of the Simpson rule is \\(0.00456\\) and the ratio of the errors is \\(20.7\\).')],
            scene: quadratureScene('quadrature-simpson-four', 'simpson', 'sin', 0, Math.PI, 4,
                'Simpsonovo pravilo, \\(\\sin x\\) na \\([0,\\pi]\\), \\(n=4\\): približek \\(2{,}0046\\), napaka \\(0{,}00456\\), razmerje napak \\(20{,}7\\).',
                'The Simpson rule, \\(\\sin x\\) on \\([0,\\pi]\\), \\(n=4\\): approximation \\(2.0046\\), error \\(0.00456\\), ratio of the errors \\(20.7\\).'),
        }),
        step({
            id: 'simpson-halve', order: 4,
            title: text('Podvojitev \\(n\\) pri Simpsonovem pravilu', 'Doubling \\(n\\) in the Simpson rule'),
            purpose: text('Prebrati razmerje napak pri \\(n=8\\) in ga primerjati s \\(16\\).', 'Reading the ratio of the errors at \\(n=8\\) and comparing it with \\(16\\).'),
            explanation: text(
                'Pri \\(n=8\\) je približek \\(2{,}0003\\), napaka \\(0{,}0002692\\) in razmerje napak \\(0{,}00456/0{,}0002692=16{,}9\\). Pri \\(n=16\\) je napaka Simpsonovega pravila \\(1{,}66\\cdot10^{-5}\\) in razmerje \\(16{,}2\\), trapezna napaka pa \\(0{,}00643\\). Razmerja se približujejo \\(16\\), kot napoveduje red \\(h^4\\); to je opazovanje na gladki funkciji \\(\\sin x\\), izrek pa zahteva štirikrat zvezno odvedljivo funkcijo.',
                'At \\(n=8\\) the approximation is \\(2.0003\\), the error \\(0.0002692\\) and the ratio of the errors \\(0.00456/0.0002692=16.9\\). At \\(n=16\\) the error of the Simpson rule is \\(1.66\\cdot10^{-5}\\) and the ratio \\(16.2\\), while the trapezoid error is \\(0.00643\\). The ratios approach \\(16\\), as the order \\(h^4\\) predicts; this is an observation on the smooth function \\(\\sin x\\), and the theorem needs a four times continuously differentiable function.',
            ),
            formulaIds: ['simpson-rule'],
            observationPrompt: text('Nastavi \\(n=16\\) in preberi napako ter razmerje.', 'Set \\(n=16\\) and read the error and the ratio.'),
            expectedObservations: [text('Pri \\(n=8\\) je razmerje napak \\(16{,}9\\), pri \\(n=16\\) pa \\(16{,}2\\), napaka pa \\(1{,}66\\cdot10^{-5}\\).', 'At \\(n=8\\) the ratio of the errors is \\(16.9\\) and at \\(n=16\\) it is \\(16.2\\), with the error \\(1.66\\cdot10^{-5}\\).')],
            scene: quadratureScene('quadrature-simpson-eight', 'simpson', 'sin', 0, Math.PI, 8,
                'Simpsonovo pravilo, \\(\\sin x\\) na \\([0,\\pi]\\), \\(n=8\\): približek \\(2{,}0003\\), napaka \\(0{,}000269\\), razmerje napak \\(16{,}9\\).',
                'The Simpson rule, \\(\\sin x\\) on \\([0,\\pi]\\), \\(n=8\\): approximation \\(2.0003\\), error \\(0.000269\\), ratio of the errors \\(16.9\\).'),
        }),
        step({
            id: 'simpson-exact', order: 5,
            title: text('Natančnost za \\(x^2\\)', 'Exactness for \\(x^2\\)'),
            purpose: text('Videti, da je Simpsonovo pravilo za kvadratno funkcijo natančno.', 'Seeing that the Simpson rule is exact for a quadratic function.'),
            explanation: text(
                'Za \\(\\int_0^3x^2\\,dx=9\\) da Simpsonovo pravilo že pri \\(n=2\\) približek \\(9\\) in napako \\(0\\) do zaokrožitve. Parabola skozi tri točke grafa \\(x^2\\) je kar \\(x^2\\). Ker je \\(f^{(4)}=0\\) za vsak polinom do tretje stopnje, izrek o napaki pove isto za kubične polinome; v tej lekciji je na voljo samo \\(x^2\\). Trapezno pravilo ima pri istem \\(n\\) napako \\(1{,}125\\).',
                'For \\(\\int_0^3x^2\\,dx=9\\) the Simpson rule already gives the approximation \\(9\\) and the error \\(0\\) up to rounding at \\(n=2\\). The parabola through three points of the graph of \\(x^2\\) is \\(x^2\\) itself. Since \\(f^{(4)}=0\\) for every polynomial up to degree three, the error theorem says the same for cubic polynomials; only \\(x^2\\) is available in this lesson. The trapezoid rule has the error \\(1.125\\) at the same \\(n\\).',
            ),
            formulaIds: ['simpson-rule'],
            observationPrompt: text('Preklopi na trapezno pravilo in primerjaj napako, nato spremeni \\(n\\).', 'Switch to the trapezoid rule and compare the error, then change \\(n\\).'),
            expectedObservations: [text('Pri \\(x^2\\) na \\([0,3]\\) je Simpsonov približek \\(9\\), napaka \\(0\\) do zaokrožitve, trapezna napaka pri \\(n=2\\) pa \\(1{,}125\\).', 'For \\(x^2\\) on \\([0,3]\\) the Simpson approximation is \\(9\\), the error \\(0\\) up to rounding, and the trapezoid error at \\(n=2\\) is \\(1.125\\).')],
            scene: quadratureScene('quadrature-simpson-square', 'simpson', 'square', 0, 3, 2,
                'Simpsonovo pravilo, \\(x^2\\) na \\([0,3]\\), \\(n=2\\): približek \\(9\\), natančna vrednost \\(9\\), napaka \\(0\\) do zaokrožitve.',
                'The Simpson rule, \\(x^2\\) on \\([0,3]\\), \\(n=2\\): approximation \\(9\\), exact value \\(9\\), error \\(0\\) up to rounding.'),
        }),
        step({
            id: 'simpson-even', order: 6,
            title: text('Zakaj je \\(n\\) sodo', 'Why \\(n\\) is even'),
            purpose: text('Razumeti, da ena parabola potrebuje dva podintervala.', 'Understanding that one parabola needs two subintervals.'),
            explanation: text(
                'Parabola je določena s tremi točkami, torej pokrije dva sosednja podintervala. Pri \\(n=2\\) je ena parabola skozi \\((0,0)\\), \\((\\tfrac\\pi2,1)\\) in \\((\\pi,0)\\), približek je \\(S_2=\\tfrac{2\\pi}3=2{,}0944\\) in napaka \\(0{,}0944\\). Pri lihem \\(n\\) bi en podinterval ostal brez para, zato je pri Simpsonovem pravilu \\(n\\) sodo: drsnik se premika za \\(2\\), lihega \\(n\\) ni mogoče vnesti, pri preklopu s trapeznega pravila z lihim \\(n\\) pa graf \\(n\\) poveča za \\(1\\) in to izrecno sporoči.',
                'A parabola is determined by three points, so it covers two neighbouring subintervals. At \\(n=2\\) there is one parabola through \\((0,0)\\), \\((\\tfrac\\pi2,1)\\) and \\((\\pi,0)\\), the approximation is \\(S_2=\\tfrac{2\\pi}3=2.0944\\) and the error \\(0.0944\\). With an odd \\(n\\) one subinterval would be left without a partner, so for the Simpson rule \\(n\\) is even: the slider moves by \\(2\\), an odd \\(n\\) cannot be entered, and when the rule is switched from the trapezoid rule with an odd \\(n\\) the graph raises \\(n\\) by \\(1\\) and says so.',
            ),
            formulaIds: ['simpson-rule'],
            observationPrompt: text('V številsko polje ob drsniku poskusi vpisati liho \\(n\\) pri Simpsonovem pravilu in preberi sporočilo.', 'Try to type an odd \\(n\\) for the Simpson rule into the number field next to the slider and read the message.'),
            expectedObservations: [text('Pri \\(n=2\\) je ena parabola, približek \\(2{,}0944\\) in napaka \\(0{,}0944\\); lihega \\(n\\) graf zavrne.', 'At \\(n=2\\) there is one parabola, the approximation is \\(2.0944\\) and the error \\(0.0944\\); the graph rejects an odd \\(n\\).')],
            scene: quadratureScene('quadrature-simpson-even', 'simpson', 'sin', 0, Math.PI, 2,
                'Simpsonovo pravilo, \\(\\sin x\\) na \\([0,\\pi]\\), \\(n=2\\): ena parabola, približek \\(2{,}0944\\), napaka \\(0{,}0944\\).',
                'The Simpson rule, \\(\\sin x\\) on \\([0,\\pi]\\), \\(n=2\\): one parabola, approximation \\(2.0944\\), error \\(0.0944\\).'),
        }),
        step({
            id: 'quadrature-explore', order: 7,
            title: text('Prosto raziskovanje', 'Free exploration'),
            purpose: text('Samostojno raziskovati obe pravili.', 'Exploring both rules on your own.'),
            explanation: text(
                'Vrnjeni sta privzeta funkcija \\(\\sin x\\) na \\([0,\\pi]\\) in trapezno pravilo pri \\(n=2\\); vse je prosto za raziskovanje. Zamenjaj funkcijo, premakni meji, spremeni \\(n\\) in pravilo ter opazuj razmerje napak. Razmerji \\(4\\) in \\(16\\) sta opazovani na gladkih primerih in se pri majhnem \\(n\\) še ne pokažeta.',
                'The default function \\(\\sin x\\) on \\([0,\\pi]\\) and the trapezoid rule at \\(n=2\\) are restored; everything is free to explore. Change the function, move the bounds, change \\(n\\) and the rule, and watch the ratio of the errors. The ratios \\(4\\) and \\(16\\) are observed on smooth examples and do not yet show at a small \\(n\\).',
            ),
            formulaIds: ['trapezoid-rule', 'simpson-rule'],
            observationPrompt: text('Poišči funkcijo ali meji, pri katerih se razmerje napak najbolj razlikuje od \\(4\\) oziroma \\(16\\).', 'Find a function or bounds for which the ratio of the errors differs most from \\(4\\) or \\(16\\).'),
            expectedObservations: [text('Pri \\(n=2\\) trapezno pravilo za \\(\\sin x\\) na \\([0,\\pi]\\) da napako \\(0{,}4292\\).', 'At \\(n=2\\) the trapezoid rule for \\(\\sin x\\) on \\([0,\\pi]\\) gives the error \\(0.4292\\).')],
            scene: quadratureScene('quadrature-explore-free', 'trapezoid', 'sin', 0, Math.PI, 2,
                'Trapezno pravilo, \\(\\sin x\\) na \\([0,\\pi]\\), \\(n=2\\); vse je prosto za raziskovanje.',
                'The trapezoid rule, \\(\\sin x\\) on \\([0,\\pi]\\), \\(n=2\\); everything is free to explore.'),
        }),
    ],
    sources: [
        {
            id: 'burden-faires-composite-rules',
            citation: 'R. L. Burden, J. D. Faires, Numerical Analysis, section "Composite Numerical Integration": error bounds of the composite trapezoid rule (order h^2, f twice continuously differentiable) and the composite Simpson rule (order h^4, f four times continuously differentiable).',
        },
        {
            id: 'bezeg-quadrature-implementation',
            citation: 'Bezeg source: src/analysis/quadrature.ts, src/analysis/quadratureModel.ts and src/graphs/functions/QuadratureGraph.tsx.',
            implementationCorrespondence: 'The model computes the approximation, the exact value from the antiderivative, the absolute error and the ratio of the error at n/2 to the error at n (from the errors as displayed, four significant digits); a scene sets the function, the bounds, n and the rule.',
        },
    ],
    edgeCases: [
        text('Simpsonovo pravilo potrebuje sodo \\(n\\) od \\(2\\) do \\(150\\); lihega \\(n\\) graf zavrne in ga nikoli ne zaokroži. Trapezno pravilo dopušča vsak \\(n\\) od \\(1\\) do \\(150\\).', 'The Simpson rule needs an even \\(n\\) from \\(2\\) to \\(150\\); the graph rejects an odd \\(n\\) and never rounds it. The trapezoid rule allows every \\(n\\) from \\(1\\) to \\(150\\).'),
        text('Če je napaka \\(0\\) do zaokrožitve, razmerja napak ni.', 'If the error is \\(0\\) up to rounding, there is no ratio of the errors.'),
        text('Razmerje napak primerja napako pri \\(n/2\\) z napako pri \\(n\\); če \\(n/2\\) ni veljaven za pravilo, razmerja ni.', 'The ratio of the errors compares the error at \\(n/2\\) with the error at \\(n\\); if \\(n/2\\) is not valid for the rule, there is no ratio.'),
    ],
    unresolvedQuestions: [],
};

export const quadratureGuidedLessons: readonly GuidedLesson[] = [quadratureLesson];
