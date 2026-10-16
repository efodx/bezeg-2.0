/**
 * Guided lessons of the Analysis family (ADR 0011, docs/specs/analysis-guided-lessons.md).
 * Each analysis topic appends its lesson to `analysisGuidedLessons` and its id to GUIDED_LESSON_AVAILABLE_IDS.
 *
 * Iterative lessons drive the graph with `run-bisection-command` scene actions (one `next-step` per revealed step), so a
 * scene shows the state after k steps and the learner presses the graph's own Next step to reveal the next one after
 * predicting it. The lesson frame therefore needs no playback controls of its own.
 *
 * The mean value lesson drives its graph with the generic function actions (`set-function-parameter` mvt-a/mvt-b/mvt-c,
 * `set-function-choice` mean-value-example and `show-function-element` matching-points); the learner presses the graph's own
 * Show matching point to reveal a result after predicting it, except in the step that reveals the prediction of the previous one.
 *
 * The accumulation lesson uses the same generic actions (`set-function-parameter` accum-a/accum-x, `set-function-choice`
 * accumulation-function and `show-function-element` accumulation-curve); the learner presses the graph's own Show accumulation A
 * after predicting, except in the steps whose point is the revealed curve or its tangent.
 *
 * The Darboux lesson uses the same generic actions (`set-function-parameter` darboux-a/darboux-b/darboux-n, `set-function-choice`
 * darboux-example and `show-function-element` lower-sum/upper-sum). A prediction step hides both sums and the learner presses the
 * graph's own Show lower sum / Show upper sum after predicting; the revealing step shows them. Refining is the graph's own
 * button or `darboux-n`.
 *
 * The extrema lesson uses the same generic actions (`set-function-parameter` extrema-a/extrema-b, `set-function-choice`
 * extrema-example and `show-function-element` extrema-classification). A prediction step hides the classification and the learner
 * presses the graph's own Show classification after predicting; the revealing steps show it.
 *
 * The convexity lesson uses the same generic actions (`set-function-parameter` convexity-a/convexity-b/convexity-t,
 * `set-function-choice` convexity-example and `show-function-element` second-derivative). A prediction step hides the second
 * derivative and the learner presses the graph's own Show second derivative after predicting; the revealing steps show it.
 *
 * The Taylor lesson uses the same generic actions (`set-function-parameter` taylor-center/taylor-degree/taylor-x, `set-function-choice`
 * taylor-example and `show-function-element` taylor-bound). A prediction step hides the error bound and the learner changes the degree
 * or presses the graph's own Show error bound after predicting; the revealing steps show it.
 *
 * The sequence lesson uses the generic actions (`set-function-parameter` sequence-epsilon/sequence-limit/sequence-threshold,
 * `set-function-choice` sequence-example and `show-function-element` sequence-certificate) and `run-sequence-command` (one `next-step`
 * per extra term a scene shows). A prediction step hides the certificate and the learner presses the graph's own Show certificate
 * after predicting; only the step that explains the least working threshold shows it.
 *
 * The fixed-point lesson uses the generic actions (`set-function-parameter` fixed-point-x0/fixed-point-digits, `set-function-choice`
 * fixed-point-example and `show-function-element` fixed-point-bound) and `run-fixed-point-command` (one `next-step` per iteration step
 * a scene shows). A prediction step hides the error bound and the learner presses the graph's own Next step or Show error bound after
 * predicting; only the step that explains the contraction of the first map shows the bound.
 *
 * The uniform convergence lesson uses the generic actions (`set-function-parameter` uniform-r/uniform-n/uniform-x/uniform-epsilon,
 * `set-function-choice` uniform-example and `show-function-element` uniform-supremum); the index n is a plain parameter, so there is no
 * playback command. A prediction step hides the supremum and the learner presses the graph's own Show supremum after predicting;
 * only the step that explains the shared N on the smaller domain shows it. Every domain change (uniform-r) starts a new comparison.
 */
import type {FunctionParameterName} from '../model';
import type {BisectionExampleId} from '../../analysis/bisection';
import type {MeanValueExampleId} from '../../analysis/meanValue';
import type {FunctionId} from '../../analysis/functions';
import type {DarbouxExampleId} from '../../analysis/darboux';
import type {ExtremaExampleId} from '../../analysis/extrema';
import type {ConvexityExampleId} from '../../analysis/convexity';
import type {TaylorExampleId} from '../../analysis/taylor';
import type {SequenceExampleId} from '../../analysis/sequence';
import type {FixedPointExampleId} from '../../analysis/fixedPoint';
import type {UniformExampleId} from '../../analysis/uniformConvergence';
import type {GuidedLesson, GuidedLessonFrame, GuidedLessonFrameKind, LocalizedText, SceneAction} from './guidedLessons';

const text = (sl: string, en: string): LocalizedText => ({sl, en});
const frame = (id: string, kind: GuidedLessonFrameKind): GuidedLessonFrame => ({id, kind});
const parameter = (name: FunctionParameterName, value: number): SceneAction => ({name: 'set-function-parameter', value: {name, value}});
const bisectionExample = (value: BisectionExampleId): SceneAction => ({
    name: 'set-function-choice', value: {name: 'bisection-example', value},
});
/** The scene shows the state after `count` revealed steps. */
const steps = (count: number): SceneAction[] => Array.from({length: count}, () => ({name: 'run-bisection-command', value: 'next-step'}));

const bisection: GuidedLesson = {
    demonstrationId: 'bisection',
    title: text('Bisekcija in izrek o vmesni vrednosti', 'Bisection and the intermediate value theorem'),
    summary: text(
        'Če je zvezna funkcija \\(f\\) v krajiščih intervala \\([a,b]\\) različno predznačena, ima v njem vsaj eno ničlo. Bisekcija interval razpolavlja in vedno obdrži polovico z nasprotnima predznakoma v krajiščih, zato se ničli približuje, ne da bi jo izgubila.',
        'If a continuous function \\(f\\) has opposite signs at the endpoints of the interval \\([a,b]\\), the interval contains at least one root. Bisection halves the interval and always keeps the half with opposite signs at its endpoints, so it closes in on a root without losing it.',
    ),
    prerequisites: [
        text('Potrebno je poznavanje zveznosti funkcije in odčitavanja vrednosti funkcije z grafa.', 'Assumes familiarity with the continuity of a function and with reading function values off a graph.'),
        text('Potrebno je razumevanje intervalov \\([a,b]\\) in predznaka števila.', 'Assumes an understanding of intervals \\([a,b]\\) and of the sign of a number.'),
    ],
    learningGoals: [
        text(
            'Pri \\(f(x)=x^2-2\\) na \\([1,2]\\) izračunaš razpolovišča \\(1{,}5\\), \\(1{,}25\\), \\(1{,}375\\) z vrednostmi \\(0{,}25\\), \\(-0{,}4375\\), \\(-0{,}109375\\) in vnaprej napoveš zadržano polovico.',
            'For \\(f(x)=x^2-2\\) on \\([1,2]\\) compute the midpoints \\(1.5\\), \\(1.25\\), \\(1.375\\) with values \\(0.25\\), \\(-0.4375\\), \\(-0.109375\\) and predict the retained half in advance.',
        ),
        text(
            'Razložiš, zakaj zveznost in nasprotna predznaka v krajiščih zagotavljata obstoj ničle, ne pa njene enoličnosti.',
            'Explain why continuity and opposite signs at the endpoints guarantee that a root exists, but not that it is unique.',
        ),
        text(
            'Z nezvezno funkcijo s skokom pokažeš, zakaj je zveznost potrebna, in ločiš natančno ničlo od približka.',
            'Use a discontinuous function with a jump to show why continuity is needed, and tell an exact root from an approximation.',
        ),
    ],
    formulaBlocks: [
        {
            id: 'bisection-ivt',
            latex: 'f\\in C[a,b],\\ f(a)\\,f(b)<0\\ \\Longrightarrow\\ \\exists\\,c\\in(a,b):\\ f(c)=0',
            notation: text(
                'Zapis \\(f\\in C[a,b]\\) pomeni, da je \\(f\\) zvezna na \\([a,b]\\); pogoj \\(f(a)\\,f(b)<0\\) pomeni nasprotna predznaka v krajiščih.',
                'The notation \\(f\\in C[a,b]\\) means that \\(f\\) is continuous on \\([a,b]\\); the condition \\(f(a)\\,f(b)<0\\) means opposite signs at the endpoints.',
            ),
            explanation: text(
                'To je izrek o vmesni vrednosti za vrednost \\(0\\): zvezna funkcija med vrednostma različnih predznakov ne more preskočiti ničle. Izrek zagotavlja vsaj eno ničlo \\(c\\), ne pa, da je ena sama.',
                'This is the intermediate value theorem for the value \\(0\\): a continuous function between values of different signs cannot skip zero. The theorem guarantees at least one root \\(c\\), not that there is only one.',
            ),
        },
        {
            id: 'bisection-midpoint-width',
            latex: 'm=\\frac{a+b}{2},\\qquad b_k-a_k=\\frac{b_0-a_0}{2^k}',
            notation: text(
                'Število \\(m\\) je razpolovišče intervala \\([a,b]\\); \\([a_k,b_k]\\) je interval po \\(k\\) korakih, \\([a_0,b_0]\\) pa začetni interval.',
                'The number \\(m\\) is the midpoint of the interval \\([a,b]\\); \\([a_k,b_k]\\) is the interval after \\(k\\) steps and \\([a_0,b_0]\\) is the initial interval.',
            ),
            explanation: text(
                'Vsak korak obdrži eno polovico, zato se širina intervala prepolovi in je po \\(k\\) korakih enaka \\(\\frac{b_0-a_0}{2^k}\\).',
                'Each step keeps one half, so the width of the interval halves and equals \\(\\frac{b_0-a_0}{2^k}\\) after \\(k\\) steps.',
            ),
        },
        {
            id: 'bisection-sign-invariant',
            latex: 'f(a_k)\\,f(b_k)<0,\\qquad k=0,1,2,\\dots',
            notation: text(
                'Pogoj velja za začetni interval in po vsakem koraku, razen če je razpolovišče natanko ničla.',
                'The condition holds for the initial interval and after every step, unless the midpoint is exactly a root.',
            ),
            explanation: text(
                'Razpolovišče zamenja tisto krajišče, katerega vrednost ima enak predznak kot \\(f(m)\\). Tako imata vrednosti v krajiščih zadržane polovice še vedno nasprotna predznaka in ničla ostane v njej.',
                'The midpoint replaces the endpoint whose value has the same sign as \\(f(m)\\). The values at the endpoints of the retained half therefore still have opposite signs, and the root stays inside.',
            ),
        },
    ],
    workedExamples: [
        {
            id: 'bisection-x2-minus-2',
            title: text('Prvi trije koraki za \\(f(x)=x^2-2\\) na \\([1,2]\\)', 'The first three steps for \\(f(x)=x^2-2\\) on \\([1,2]\\)'),
            calculationLatex: 'm_1=\\frac32,\\ f(m_1)=\\frac14;\\quad m_2=\\frac54,\\ f(m_2)=-\\frac{7}{16};\\quad m_3=\\frac{11}{8},\\ f(m_3)=-\\frac{7}{64}',
            resultLatex: '[a_3,b_3]=\\left[\\frac{11}{8},\\frac32\\right],\\qquad b_3-a_3=\\frac18',
            check: text(
                'Vrednosti \\(\\frac14=0{,}25\\), \\(-\\frac{7}{16}=-0{,}4375\\) in \\(-\\frac{7}{64}=-0{,}109375\\) se ujemajo z odčitki \\(f(m)\\). Zadržani intervali \\([1;\\,1{,}5]\\), \\([1{,}25;\\,1{,}5]\\) in \\([1{,}375;\\,1{,}5]\\) imajo širine \\(0{,}5\\), \\(0{,}25\\) in \\(0{,}125\\).',
                'The values \\(\\frac14=0.25\\), \\(-\\frac{7}{16}=-0.4375\\) and \\(-\\frac{7}{64}=-0.109375\\) agree with the \\(f(m)\\) readouts. The retained intervals \\([1,\\,1.5]\\), \\([1.25,\\,1.5]\\) and \\([1.375,\\,1.5]\\) have widths \\(0.5\\), \\(0.25\\) and \\(0.125\\).',
            ),
        },
    ],
    steps: [
        {
            id: 'bisection-bracket-step', order: 1,
            title: text('Interval z ničlo', 'An interval around a root'),
            purpose: text('Prebrati predznaka v krajiščih in povezati zveznost z obstojem ničle.', 'Reading the signs at the endpoints and linking continuity to the existence of a root.'),
            explanation: text(
                'Funkcija \\(f(x)=x^2-2\\) je zvezna, na krajiščih intervala \\([1,2]\\) pa je \\(f(1)=-1<0\\) in \\(f(2)=2>0\\). Zvezna funkcija ne more preskočiti vrednosti \\(0\\), zato po izreku o vmesni vrednosti v intervalu leži vsaj ena ničla. Izrek zagotavlja obstoj, ne pa enoličnosti: ničel je lahko več. Bisekcija ničlo išče tako, da interval razpolavlja in vedno obdrži polovico, v kateri imata vrednosti v krajiščih še vedno nasprotna predznaka.',
                'The function \\(f(x)=x^2-2\\) is continuous, and at the ends of the interval \\([1,2]\\) we have \\(f(1)=-1<0\\) and \\(f(2)=2>0\\). A continuous function cannot skip the value \\(0\\), so by the intermediate value theorem the interval contains at least one root. The theorem guarantees existence, not uniqueness: there may be several roots. Bisection looks for a root by halving the interval and always keeping the half in which the endpoint values still have opposite signs.',
            ),
            formulaIds: ['bisection-ivt'], learnerInteraction: 'observe',
            frames: [frame('bisection-bracket-explanation', 'explanation'), frame('bisection-bracket-observation', 'observation')],
            observationPrompt: text(
                'Preberi odčitka \\(f(a)\\) in \\(f(b)\\). Napovej, v kateri polovici, \\([1;\\,1{,}5]\\) ali \\([1{,}5;\\,2]\\), leži ničla, in šele nato pritisni Naslednji korak.',
                'Read the readouts \\(f(a)\\) and \\(f(b)\\). Predict which half, \\([1,\\,1.5]\\) or \\([1.5,\\,2]\\), holds the root, and only then press Next step.',
            ),
            expectedObservations: [text(
                'Pri koraku \\(0\\) je \\(f(1)=-1\\) in \\(f(2)=2\\): predznaka sta nasprotna, razpolovišče pa še ni razkrito.',
                'At step \\(0\\) we have \\(f(1)=-1\\) and \\(f(2)=2\\): the signs are opposite, and the midpoint is not revealed yet.',
            )],
            scene: {
                id: 'bisection-default', basedOn: 'demonstration-default',
                actions: [],
                expectedState: text(
                    'Prikazan je \\(f(x)=x^2-2\\) na \\([1,2]\\) pri koraku \\(0\\): \\(f(1)=-1\\), \\(f(2)=2\\), širina \\(1\\); predvajanje je ustavljeno.',
                    'The graph of \\(f(x)=x^2-2\\) on \\([1,2]\\) is shown at step \\(0\\): \\(f(1)=-1\\), \\(f(2)=2\\), width \\(1\\); playback is stopped.',
                ),
            },
        },
        {
            id: 'bisection-first-step', order: 2,
            title: text('Prvi korak: razpolovišče', 'First step: the midpoint'),
            purpose: text('Razpolovišče in predznak njegove vrednosti določita zadržano polovico.', 'The midpoint and the sign of its value decide the retained half.'),
            explanation: text(
                'Razpolovišče intervala \\([1,2]\\) je \\(m=\\frac{1+2}{2}=1{,}5\\) in \\(f(1{,}5)=1{,}5^2-2=0{,}25>0\\). Vrednost \\(f(1)=-1\\) je negativna, \\(f(1{,}5)\\) pa pozitivna, zato imata vrednosti v krajiščih leve polovice \\([1;\\,1{,}5]\\) nasprotna predznaka in v njej leži ničla. Desno polovico zavržemo. Širina se je prepolovila z \\(1\\) na \\(0{,}5\\).',
                'The midpoint of the interval \\([1,2]\\) is \\(m=\\frac{1+2}{2}=1.5\\) and \\(f(1.5)=1.5^2-2=0.25>0\\). The value \\(f(1)=-1\\) is negative and \\(f(1.5)\\) is positive, so the values at the endpoints of the left half \\([1,\\,1.5]\\) have opposite signs and a root lies in it. We discard the right half. The width has halved from \\(1\\) to \\(0.5\\).',
            ),
            formulaIds: ['bisection-midpoint-width'], learnerInteraction: 'adjust-construction-parameter',
            frames: [frame('bisection-first-step-explanation', 'explanation'), frame('bisection-first-step-observation', 'observation')],
            observationPrompt: text(
                'Napovej, katero polovico intervala \\([1;\\,1{,}5]\\) bo obdržal naslednji korak, in pritisni Naslednji korak, da preveriš.',
                'Predict which half of the interval \\([1,\\,1.5]\\) the next step will keep, and press Next step to check.',
            ),
            expectedObservations: [text(
                'Pri koraku \\(1\\) je \\(m=1{,}5\\), \\(f(m)=0{,}25\\), zadržana je leva polovica \\([1;\\,1{,}5]\\), širina pa \\(0{,}5\\).',
                'At step \\(1\\) we have \\(m=1.5\\), \\(f(m)=0.25\\), the left half \\([1,\\,1.5]\\) is retained and the width is \\(0.5\\).',
            )],
            scene: {
                id: 'bisection-first-step-scene', basedOn: 'demonstration-default',
                actions: steps(1),
                expectedState: text(
                    'Pri koraku \\(1\\): \\(m=1{,}5\\), \\(f(m)=0{,}25\\), zadržana leva polovica \\([1;\\,1{,}5]\\), širina \\(0{,}5\\).',
                    'At step \\(1\\): \\(m=1.5\\), \\(f(m)=0.25\\), the left half \\([1,\\,1.5]\\) retained, width \\(0.5\\).',
                ),
            },
        },
        {
            id: 'bisection-three-steps', order: 3,
            title: text('Trije koraki', 'Three steps'),
            purpose: text('Opaziti, da se širina polovi in da predznaka v krajiščih ostaneta nasprotna.', 'Observing that the width halves and that the endpoint signs stay opposite.'),
            explanation: text(
                'V koraku 2 je \\(m=1{,}25\\) in \\(f(1{,}25)=-0{,}4375<0\\), kar je enak predznak kot pri \\(f(1)\\), zato obdržimo desno polovico \\([1{,}25;\\,1{,}5]\\). V koraku 3 je \\(m=1{,}375\\) in \\(f(1{,}375)=-0{,}109375<0\\), zato obdržimo \\([1{,}375;\\,1{,}5]\\) s širino \\(0{,}125\\). Pravilo: razpolovišče zamenja tisto krajišče, katerega vrednost ima enak predznak. Zato imata vrednosti v krajiščih po vsakem koraku še vedno nasprotna predznaka, širina po \\(k\\) korakih pa je \\(\\frac{1}{2^k}\\).',
                'In step 2 we have \\(m=1.25\\) and \\(f(1.25)=-0.4375<0\\), the same sign as \\(f(1)\\), so we keep the right half \\([1.25,\\,1.5]\\). In step 3 we have \\(m=1.375\\) and \\(f(1.375)=-0.109375<0\\), so we keep \\([1.375,\\,1.5]\\) with width \\(0.125\\). The rule: the midpoint replaces the endpoint whose value has the same sign. The values at the endpoints therefore still have opposite signs after every step, and the width after \\(k\\) steps is \\(\\frac{1}{2^k}\\).',
            ),
            formulaIds: ['bisection-midpoint-width', 'bisection-sign-invariant'], workedExampleId: 'bisection-x2-minus-2', learnerInteraction: 'adjust-construction-parameter',
            frames: [frame('bisection-three-steps-explanation', 'explanation'), frame('bisection-three-steps-calculation', 'calculation'), frame('bisection-three-steps-observation', 'observation')],
            observationPrompt: text(
                'Po vsakem koraku primerjaj predznaka \\(f(a)\\) in \\(f(b)\\). Napovej predznak vrednosti v naslednjem razpolovišču \\(1{,}4375\\) in pritisni Naslednji korak.',
                'After every step compare the signs of \\(f(a)\\) and \\(f(b)\\). Predict the sign of the value at the next midpoint \\(1.4375\\) and press Next step.',
            ),
            expectedObservations: [text(
                'Pri koraku \\(3\\) je \\(f(a)<0\\) in \\(f(b)>0\\); razpolovišča \\(1{,}5\\), \\(1{,}25\\), \\(1{,}375\\) imajo vrednosti \\(0{,}25\\), \\(-0{,}4375\\), \\(-0{,}109375\\), širina pa je \\(0{,}125\\).',
                'At step \\(3\\) we have \\(f(a)<0\\) and \\(f(b)>0\\); the midpoints \\(1.5\\), \\(1.25\\), \\(1.375\\) have values \\(0.25\\), \\(-0.4375\\), \\(-0.109375\\) and the width is \\(0.125\\).',
            )],
            scene: {
                id: 'bisection-three-steps-scene', basedOn: 'demonstration-default',
                actions: steps(3),
                expectedState: text(
                    'Pri koraku \\(3\\): interval \\([1{,}375;\\,1{,}5]\\), razpolovišča \\(1{,}5\\), \\(1{,}25\\), \\(1{,}375\\), širina \\(0{,}125\\).',
                    'At step \\(3\\): the interval \\([1.375,\\,1.5]\\), midpoints \\(1.5\\), \\(1.25\\), \\(1.375\\), width \\(0.125\\).',
                ),
            },
        },
        {
            id: 'bisection-exact-or-approximate', order: 4,
            title: text('Natančna ničla ali približek?', 'An exact root or an approximation?'),
            purpose: text('Ločiti natančno ničlo od približka in vedeti, kdaj se iteracija ustavi.', 'Telling an exact root from an approximation and knowing when the iteration stops.'),
            explanation: text(
                'Po \\(5\\) korakih leži ničla \\(\\sqrt{2}\\approx1{,}41421\\) v intervalu \\([1{,}40625;\\,1{,}4375]\\) s širino \\(\\frac{1}{32}=0{,}03125\\). Število \\(\\sqrt{2}\\) je iracionalno, zato nobeno razpolovišče ni natančna ničla: \\(f(m)\\) je lahko zelo majhna, nikoli pa ni natanko \\(0\\). Iteracija se ustavi, ko je \\(f(m)=0\\) natanko (na primer pri \\(x^3-x\\)), ko se razpolovišče v dvojni natančnosti ujame s krajiščem ali ko je dosežena omejitev \\(60\\) korakov. Zadnji dve ustavitvi ne pomenita natančne ničle, ampak omejitev računalniškega zapisa števil in korakov.',
                'After \\(5\\) steps the root \\(\\sqrt{2}\\approx1.41421\\) lies in the interval \\([1.40625,\\,1.4375]\\) of width \\(\\frac{1}{32}=0.03125\\). The number \\(\\sqrt{2}\\) is irrational, so no midpoint is an exact root: \\(f(m)\\) can be very small, but it is never exactly \\(0\\). The iteration stops when \\(f(m)=0\\) exactly (for example for \\(x^3-x\\)), when the midpoint equals an endpoint in double precision, or when the limit of \\(60\\) steps is reached. The last two stops do not mean an exact root; they are limits of computer number representation and of the number of steps.',
            ),
            formulaIds: [], learnerInteraction: 'adjust-construction-parameter',
            frames: [frame('bisection-exact-explanation', 'explanation'), frame('bisection-exact-observation', 'observation')],
            observationPrompt: text(
                'Pritisni Predvajaj in opazuj širino intervala. Kdaj se iteracija ustavi in kaj o tem pravi sporočilo o stanju? Premor predvajanje ustavi, Ponastavi iteracijo pa ga vrne na začetek.',
                'Press Play and watch the interval width. When does the iteration stop, and what does the status message say about it? Pause stops playback and Reset iteration returns to the start.',
            ),
            expectedObservations: [text(
                'Pri koraku \\(5\\) je interval \\([1{,}40625;\\,1{,}4375]\\) s širino \\(0{,}03125\\); \\(f(m)\\) ni natanko \\(0\\), zato stanje ne govori o natančni ničli.',
                'At step \\(5\\) the interval is \\([1.40625,\\,1.4375]\\) with width \\(0.03125\\); \\(f(m)\\) is not exactly \\(0\\), so the status does not speak of an exact root.',
            )],
            scene: {
                id: 'bisection-exact-scene', basedOn: 'demonstration-default',
                actions: steps(5),
                expectedState: text(
                    'Pri koraku \\(5\\): interval \\([1{,}40625;\\,1{,}4375]\\), širina \\(0{,}03125\\); predvajanje je ustavljeno.',
                    'At step \\(5\\): the interval \\([1.40625,\\,1.4375]\\), width \\(0.03125\\); playback is stopped.',
                ),
            },
        },
        {
            id: 'bisection-counterexample-step', order: 5,
            title: text('Nezvezna funkcija: predpostavka ne drži', 'A discontinuous function: the hypothesis fails'),
            purpose: text('Pokazati, da je zveznost potreben pogoj izreka.', 'Showing that continuity is a necessary condition of the theorem.'),
            explanation: text(
                'Naj bo \\(f(x)=-1\\) za \\(x<0\\) in \\(f(x)=1\\) sicer. Na \\([-1,1]\\) je \\(f(-1)=-1\\) in \\(f(1)=1\\), predznaka sta torej nasprotna, vendar \\(f\\) pri \\(x=0\\) skoči z \\(-1\\) na \\(1\\) in ne zavzame nobene vmesne vrednosti. Funkcija nima nobene ničle. Predpostavka izreka o zveznosti ni izpolnjena, zato ničla ni zagotovljena; graf je narisan iz dveh ločenih kosov z odprtim in zapolnjenim krogcem pri skoku. Bisekcija se lahko še vedno izvaja, a se stiska proti skoku pri \\(x=0\\), kjer \\(f(m)\\) ni nikoli \\(0\\).',
                'Let \\(f(x)=-1\\) for \\(x<0\\) and \\(f(x)=1\\) otherwise. On \\([-1,1]\\) we have \\(f(-1)=-1\\) and \\(f(1)=1\\), so the signs are opposite, but \\(f\\) jumps from \\(-1\\) to \\(1\\) at \\(x=0\\) and takes no value in between. The function has no root at all. The continuity hypothesis of the theorem is not satisfied, so a root is not guaranteed; the graph is drawn from two separate pieces with an open and a filled circle at the jump. Bisection can still run, but it closes in on the jump at \\(x=0\\), where \\(f(m)\\) is never \\(0\\).',
            ),
            formulaIds: ['bisection-ivt'], learnerInteraction: 'adjust-construction-parameter',
            frames: [frame('bisection-counterexample-explanation', 'explanation'), frame('bisection-counterexample-observation', 'observation')],
            observationPrompt: text(
                'Napovej, kam se bodo stiskala razpolovišča in ali bo \\(f(m)\\) kdaj enak \\(0\\); nato pritisni Naslednji korak in preberi sporočilo o stanju.',
                'Predict where the midpoints will close in and whether \\(f(m)\\) will ever equal \\(0\\); then press Next step and read the status message.',
            ),
            expectedObservations: [text(
                'Pri koraku \\(3\\) je interval \\([-0{,}25;\\,0]\\) s širino \\(0{,}25\\); stanje navaja, da predpostavka izreka ni izpolnjena, \\(f(m)\\) pa je vedno \\(-1\\) ali \\(1\\).',
                'At step \\(3\\) the interval is \\([-0.25,\\,0]\\) with width \\(0.25\\); the status says that the theorem hypothesis is not satisfied, and \\(f(m)\\) is always \\(-1\\) or \\(1\\).',
            )],
            scene: {
                id: 'bisection-counterexample-scene', basedOn: 'demonstration-default',
                actions: [bisectionExample('sign-step'), ...steps(3)],
                expectedState: text(
                    'Pri koraku \\(3\\) za funkcijo s skokom: interval \\([-0{,}25;\\,0]\\), širina \\(0{,}25\\), predpostavka izreka ni izpolnjena.',
                    'At step \\(3\\) for the function with a jump: the interval \\([-0.25,\\,0]\\), width \\(0.25\\), the theorem hypothesis is not satisfied.',
                ),
            },
        },
        {
            id: 'bisection-free-exploration', order: 6,
            title: text('Več ničel in samostojno raziskovanje', 'Several roots and free exploration'),
            purpose: text('Obstoj ničle brez enoličnosti in prehod v samostojno raziskovanje.', 'Existence of a root without uniqueness, and the handoff to free exploration.'),
            explanation: text(
                'Funkcija \\(f(x)=x^3-x\\) ima tri ničle \\(-1\\), \\(0\\) in \\(1\\). Na intervalu \\([-1{,}5;\\,2]\\) je \\(f(-1{,}5)=-1{,}875<0\\) in \\(f(2)=6>0\\), zato izrek zagotavlja vsaj eno ničlo, v resnici pa so v njem vse tri. Bisekcija najde le eno od njih; katero, je odvisno od izbire krajišč. Zdaj raziskuj sam: zamenjaj primer ali krajišči, pritisni Naslednji korak ali Predvajaj in preveri, kdaj interval še vsebuje ničlo (f ima v krajiščih nasprotna predznaka) in kam se bisekcija stiska.',
                'The function \\(f(x)=x^3-x\\) has three roots \\(-1\\), \\(0\\) and \\(1\\). On the interval \\([-1.5,\\,2]\\) we have \\(f(-1.5)=-1.875<0\\) and \\(f(2)=6>0\\), so the theorem guarantees at least one root, and in fact all three lie in it. Bisection finds only one of them; which one depends on the choice of endpoints. Now explore on your own: change the example or the endpoints, press Next step or Play, and check when the interval is a bracket and where bisection closes in.',
            ),
            formulaIds: ['bisection-sign-invariant'], learnerInteraction: 'adjust-construction-parameter',
            frames: [frame('bisection-free-explanation', 'explanation'), frame('bisection-free-observation', 'observation')],
            observationPrompt: text(
                'Poskusi krajišči \\(a=-1{,}5\\) in \\(b=2\\) ter druge pare. Katero ničlo najde bisekcija in kdaj ničla ni zagotovljena?',
                'Try the endpoints \\(a=-1.5\\) and \\(b=2\\) and other pairs. Which root does bisection find, and when is a root not guaranteed?',
            ),
            expectedObservations: [text(
                'Pri \\(a=-1{,}5\\) in \\(b=2\\) imata vrednosti v krajiščih nasprotna predznaka; bisekcija se stiska proti ničli \\(1\\), drugi dve ničli pa ostaneta neodkriti.',
                'For \\(a=-1.5\\) and \\(b=2\\) the values at the endpoints have opposite signs; bisection closes in on the root \\(1\\), and the other two roots stay undiscovered.',
            )],
            scene: {
                id: 'bisection-free-scene', basedOn: 'demonstration-default',
                actions: [bisectionExample('cubic'), parameter('bisect-a', -1.5)],
                expectedState: text(
                    'Prikazan je \\(f(x)=x^3-x\\) na \\([-1{,}5;\\,2]\\) pri koraku \\(0\\): \\(f(-1{,}5)=-1{,}875\\), \\(f(2)=6\\).',
                    'The graph of \\(f(x)=x^3-x\\) on \\([-1.5,\\,2]\\) is shown at step \\(0\\): \\(f(-1.5)=-1.875\\), \\(f(2)=6\\).',
                ),
            },
        },
    ],
    sources: [
        {
            id: 'globevnik-brojan-analiza-1',
            citation: 'Globevnik, J., Brojan, M. Analiza I, Fakulteta za matematiko in fiziko, Univerza v Ljubljani, §3.5 (printed pp. 80–82).',
            supports: ['the intermediate value theorem', 'the bisection method on a bracket', 'existence of a zero without uniqueness'],
        },
        {
            id: 'bezeg-bisection-implementation',
            citation: 'Bezeg source: src/analysis/bisection.ts, src/analysis/bisectionModel.ts and src/graphs/functions/BisectionGraph.tsx.',
            supports: ['midpoints 1.5, 1.25, 1.375 with values 0.25, -0.4375, -0.109375', 'exact endpoint and midpoint roots', 'floating-point stagnation and the 60-step limit', 'the sign step as a discontinuous example'],
            implementationCorrespondence: 'The history is recomputed from the example, the endpoints and the step; Next step and playback run the same transition, and a lesson scene applies run-bisection-command next-step once per revealed step.',
        },
    ],
    edgeCases: [
        text(
            'Če imata \\(f(a)\\) in \\(f(b)\\) isti predznak, izrek ne zagotavlja ničle v \\([a,b]\\); aplikacija bisekcije ne začne in to pove. Če je krajišče natančna ničla, iteracija ni potrebna.',
            'If \\(f(a)\\) and \\(f(b)\\) have the same sign, the theorem does not guarantee a root in \\([a,b]\\); the app does not start bisection and says so. If an endpoint is an exact root, no iteration is needed.',
        ),
        text(
            'Če je razpolovišče natančna ničla, \\(f(m)=0\\), se iteracija ustavi in ničlo imenuje natančno; pri \\(x^2-2\\) se to ne zgodi, ker je \\(\\sqrt{2}\\) iracionalno število.',
            'If a midpoint is an exact root, \\(f(m)=0\\), the iteration stops and calls the root exact; for \\(x^2-2\\) this never happens, because \\(\\sqrt{2}\\) is an irrational number.',
        ),
        text(
            'Pri funkciji s skokom imata lahko \\(f(a)\\) in \\(f(b)\\) nasprotna predznaka, a ničle ni; zato aplikacija izrecno navede, da predpostavka izreka ni izpolnjena.',
            'For a function with a jump, \\(f(a)\\) and \\(f(b)\\) can have opposite signs while no root exists; the app therefore states explicitly that the theorem hypothesis is not satisfied.',
        ),
    ],
    unresolvedQuestions: [
        text(
            'Pred classroom-ready pregledom je treba potrditi, ali naj lekcija omeni tudi, da bisekcija pri večkratni ničli sode stopnje ne najde intervala z nasprotnima predznakoma v krajiščih.',
            'Before classroom-ready review, confirm whether the lesson should also mention that bisection finds no bracket at a root of even multiplicity.',
        ),
    ],
};

const meanValueExample = (value: MeanValueExampleId): SceneAction => ({
    name: 'set-function-choice', value: {name: 'mean-value-example', value},
});
const matchingPoints = (visible: boolean): SceneAction => ({
    name: 'show-function-element', value: {name: 'matching-points', value: visible},
});

const meanValue: GuidedLesson = {
    demonstrationId: 'mean-value',
    title: text('Izrek o povprečni vrednosti', 'Mean value theorem'),
    summary: text(
        'Če je funkcija \\(f\\) zvezna na \\([a,b]\\) in odvedljiva na \\((a,b)\\), obstaja vsaj ena točka \\(c\\in(a,b)\\), v kateri je tangenta vzporedna sekanti skozi krajišči: naklon \\(f^{\\prime}(c)\\) je enak naklonu sekante. Takih točk je lahko več, če pa odvedljivost odpove, jih ni nujno nobene.',
        'If a function \\(f\\) is continuous on \\([a,b]\\) and differentiable on \\((a,b)\\), there is at least one point \\(c\\in(a,b)\\) at which the tangent is parallel to the secant through the endpoints: the slope \\(f^{\\prime}(c)\\) equals the secant slope. There can be several such points, and if differentiability fails there need not be any.',
    ),
    prerequisites: [
        text(
            'Potrebno je razumevanje zveznosti funkcije na zaprtem intervalu \\([a,b]\\) in odvedljivosti funkcije na odprtem intervalu \\((a,b)\\).',
            'Assumes an understanding of continuity on a closed interval \\([a,b]\\) and of differentiability on an open interval \\((a,b)\\).',
        ),
        text(
            'Potrebno je poznavanje naklona sekante \\(\\frac{f(b)-f(a)}{b-a}\\) in tangente kot premice z naklonom \\(f^{\\prime}(c)\\).',
            'Assumes familiarity with the secant slope \\(\\frac{f(b)-f(a)}{b-a}\\) and with the tangent as the line of slope \\(f^{\\prime}(c)\\).',
        ),
    ],
    learningGoals: [
        text(
            'Pri \\(f(x)=x^2\\) na \\([0,2]\\) napoveš, pri kateri točki \\(c\\) se naklon tangente ujame z naklonom sekante \\(2\\), in napoved preveriš z ujemajočo točko \\(c=1\\).',
            'For \\(f(x)=x^2\\) on \\([0,2]\\) predict at which point \\(c\\) the tangent slope equals the secant slope \\(2\\), and check the prediction against the matching point \\(c=1\\).',
        ),
        text(
            'Premikaš \\(c\\) neodvisno od krajišč \\(a\\) in \\(b\\) ter opaziš, da se sekanta ne premakne, razlika naklonov pa menja predznak.',
            'Move \\(c\\) independently of the endpoints \\(a\\) and \\(b\\) and observe that the secant stays put while the slope difference changes sign.',
        ),
        text(
            'Pri \\(x^3\\) na \\([-1,1]\\) najdeš dve ujemajoči točki \\(c=\\pm\\frac{1}{\\sqrt3}\\), pri \\(|x|\\) pa pojasniš, zakaj ujemajoče točke ni: odvedljivost odpove v \\(0\\).',
            'For \\(x^3\\) on \\([-1,1]\\) find the two matching points \\(c=\\pm\\frac{1}{\\sqrt3}\\), and for \\(|x|\\) explain why there is none: differentiability fails at \\(0\\).',
        ),
    ],
    formulaBlocks: [
        {
            id: 'mean-value-statement',
            latex: 'f\\in C[a,b],\\ f\\in D(a,b)\\ \\Longrightarrow\\ \\exists\\,c\\in(a,b):\\ f^{\\prime}(c)=\\frac{f(b)-f(a)}{b-a}',
            notation: text(
                'Zapis \\(f\\in C[a,b]\\) pomeni, da je \\(f\\) zvezna na \\([a,b]\\); zapis \\(f\\in D(a,b)\\) pomeni, da je \\(f\\) odvedljiva v vsaki točki odprtega intervala \\((a,b)\\).',
                'The notation \\(f\\in C[a,b]\\) means that \\(f\\) is continuous on \\([a,b]\\); the notation \\(f\\in D(a,b)\\) means that \\(f\\) is differentiable at every point of the open interval \\((a,b)\\).',
            ),
            explanation: text(
                'Izrek zagotavlja vsaj eno točko \\(c\\), v kateri je naklon tangente enak naklonu sekante, ne pa, da je ena sama. Pogoj odvedljivosti je bistven: brez njega ujemajoče točke ni nujno.',
                'The theorem guarantees at least one point \\(c\\) at which the tangent slope equals the secant slope, not that there is only one. The differentiability condition is essential: without it a matching point need not exist.',
            ),
        },
        {
            id: 'mean-value-slopes',
            latex: 'm_{\\mathrm{sec}}=\\frac{f(b)-f(a)}{b-a},\\qquad m_{\\mathrm{tan}}=f^{\\prime}(c),\\qquad m_{\\mathrm{tan}}-m_{\\mathrm{sec}}=0',
            notation: text(
                'Število \\(m_{\\mathrm{sec}}\\) je naklon sekante skozi \\((a,f(a))\\) in \\((b,f(b))\\), število \\(m_{\\mathrm{tan}}\\) pa naklon tangente v točki \\(c\\).',
                'The number \\(m_{\\mathrm{sec}}\\) is the slope of the secant through \\((a,f(a))\\) and \\((b,f(b))\\), and \\(m_{\\mathrm{tan}}\\) is the slope of the tangent at the point \\(c\\).',
            ),
            explanation: text(
                'Ujemajoča točka je ničla razlike \\(m_{\\mathrm{tan}}-m_{\\mathrm{sec}}\\). Aplikacija jo prikaže kot odčitek in ob njej označi, kdaj se naklona ujemata znotraj tolerance; to je številčna primerjava, ne dokaz.',
                'A matching point is a zero of the difference \\(m_{\\mathrm{tan}}-m_{\\mathrm{sec}}\\). The app shows it as a readout and states when the slopes agree within a tolerance; that is a numerical comparison, not a proof.',
            ),
        },
        {
            id: 'mean-value-power-matches',
            latex: 'x^2:\\ c=\\frac{a+b}{2};\\qquad x^3:\\ c=\\pm\\sqrt{\\frac{a^2+ab+b^2}{3}}',
            notation: text(
                'Za \\(x^2\\) je naklon sekante \\(a+b\\), za \\(x^3\\) pa \\(a^2+ab+b^2\\); enačbi \\(2c=a+b\\) in \\(3c^2=a^2+ab+b^2\\) dasta ujemajoče točke.',
                'For \\(x^2\\) the secant slope is \\(a+b\\), and for \\(x^3\\) it is \\(a^2+ab+b^2\\); the equations \\(2c=a+b\\) and \\(3c^2=a^2+ab+b^2\\) give the matching points.',
            ),
            explanation: text(
                'Pri \\(x^2\\) je ujemajoča točka vedno središče intervala. Pri \\(x^3\\) sta ujemajoči točki simetrični glede na \\(0\\); v interval \\((a,b)\\) padeta le tisti, ki v njem ležita, zato jih je lahko ena ali dve.',
                'For \\(x^2\\) the matching point is always the midpoint of the interval. For \\(x^3\\) the two candidates are symmetric about \\(0\\); only those that lie in \\((a,b)\\) count, so there can be one or two.',
            ),
        },
    ],
    workedExamples: [
        {
            id: 'mean-value-x2-example',
            title: text('Funkcija \\(f(x)=x^2\\) na \\([0,2]\\)', 'The function \\(f(x)=x^2\\) on \\([0,2]\\)'),
            calculationLatex: 'm_{\\mathrm{sec}}=\\frac{2^2-0^2}{2-0}=2,\\qquad f^{\\prime}(c)=2c=2\\ \\Longrightarrow\\ c=1',
            resultLatex: 'c=1\\in(0,2),\\qquad f(c)=1',
            check: text(
                'Tangenta v točki \\((1,1)\\) ima naklon \\(2\\), enako kot sekanta skozi \\((0,0)\\) in \\((2,4)\\); odčitek razlike je \\(0\\). Točka \\(c=1\\) je središče intervala \\((0,2)\\).',
                'The tangent at the point \\((1,1)\\) has slope \\(2\\), the same as the secant through \\((0,0)\\) and \\((2,4)\\); the difference readout is \\(0\\). The point \\(c=1\\) is the midpoint of the interval \\((0,2)\\).',
            ),
        },
        {
            id: 'mean-value-x3-example',
            title: text('Funkcija \\(f(x)=x^3\\) na \\([-1,1]\\)', 'The function \\(f(x)=x^3\\) on \\([-1,1]\\)'),
            calculationLatex: 'm_{\\mathrm{sec}}=\\frac{1^3-(-1)^3}{1-(-1)}=1,\\qquad 3c^2=1\\ \\Longrightarrow\\ c=\\pm\\frac{1}{\\sqrt3}',
            resultLatex: 'c_1=-\\frac{1}{\\sqrt3},\\qquad c_2=\\frac{1}{\\sqrt3}',
            check: text(
                'Obe točki ležita v \\((-1,1)\\): \\(\\frac{1}{\\sqrt3}\\approx0{,}5774\\). V obeh je \\(f^{\\prime}(c)=3c^2=1\\), kar je enako naklonu sekante; v točki \\(c=0\\) je naklon tangente \\(0\\) in razlika \\(-1\\).',
                'Both points lie in \\((-1,1)\\): \\(\\frac{1}{\\sqrt3}\\approx0.5774\\). At both, \\(f^{\\prime}(c)=3c^2=1\\), which equals the secant slope; at the point \\(c=0\\) the tangent slope is \\(0\\) and the difference is \\(-1\\).',
            ),
        },
        {
            id: 'mean-value-abs-example',
            title: text('Funkcija \\(f(x)=|x|\\) na \\([-1,1]\\)', 'The function \\(f(x)=|x|\\) on \\([-1,1]\\)'),
            calculationLatex: 'm_{\\mathrm{sec}}=\\frac{|1|-|-1|}{1-(-1)}=0,\\qquad f^{\\prime}(x)=-1\\ (x<0),\\quad f^{\\prime}(x)=1\\ (x>0)',
            resultLatex: '\\left|f^{\\prime}(x)\\right|=1\\ne0\\quad(x\\ne0)',
            check: text(
                'Naklon sekante je \\(0\\), odvod pa je \\(\\pm1\\) povsod, kjer obstaja; v točki \\(x=0\\) ne obstaja. Zato nobena točka z odvodom ne ujame naklona \\(0\\), kot v aplikaciji pove stanje brez ujemajoče točke.',
                'The secant slope is \\(0\\), while the derivative is \\(\\pm1\\) wherever it exists, and it does not exist at \\(x=0\\). So no point with a derivative achieves the slope \\(0\\), as the app states when it reports no matching point.',
            ),
        },
    ],
    steps: [
        {
            id: 'mean-value-prerequisites-step', order: 1,
            title: text('Sekanta in tangenta', 'The secant and the tangent'),
            purpose: text('Povezati naklon sekante z naklonom tangente v neodvisni točki.', 'Linking the secant slope to the tangent slope at an independent point.'),
            explanation: text(
                'Funkcija \\(f(x)=x^2\\) je zvezna na \\([0,2]\\) in odvedljiva na \\((0,2)\\). Sekanta povezuje točki \\((0,f(0))\\) in \\((2,f(2))\\) in ima naklon \\(\\frac{f(2)-f(0)}{2-0}=\\frac{4-0}{2}=2\\). Tangenta v točki \\(c\\in(0,2)\\) ima naklon \\(f^{\\prime}(c)=2c\\); pri \\(c=0{,}5\\) je ta naklon \\(1\\), razlika med naklonom tangente in naklonom sekante pa \\(-1\\). Krajišči \\(a\\) in \\(b\\) ter točko \\(c\\) premikaš vsako zase, vedno pa velja \\(a<c<b\\). Izrek o povprečni vrednosti trdi, da pri zvezni in na \\((a,b)\\) odvedljivi funkciji obstaja vsaj ena točka \\(c\\), v kateri sta naklona enaka.',
                'The function \\(f(x)=x^2\\) is continuous on \\([0,2]\\) and differentiable on \\((0,2)\\). The secant joins the points \\((0,f(0))\\) and \\((2,f(2))\\) and has slope \\(\\frac{f(2)-f(0)}{2-0}=\\frac{4-0}{2}=2\\). The tangent at a point \\(c\\in(0,2)\\) has slope \\(f^{\\prime}(c)=2c\\); at \\(c=0.5\\) this slope is \\(1\\), and the difference between the tangent slope and the secant slope is \\(-1\\). You move the endpoints \\(a\\) and \\(b\\) and the point \\(c\\) separately, and \\(a<c<b\\) always holds. The mean value theorem says that for a function that is continuous and differentiable on \\((a,b)\\) there is at least one point \\(c\\) at which the two slopes are equal.',
            ),
            formulaIds: ['mean-value-statement', 'mean-value-slopes'], learnerInteraction: 'observe',
            frames: [frame('mean-value-prerequisites-explanation', 'explanation'), frame('mean-value-prerequisites-observation', 'observation')],
            observationPrompt: text(
                'Preberi naklon sekante in naklon tangente. Napovej, pri kateri vrednosti \\(c\\) sta naklona enaka, in šele nato pritisni Pokaži ujemajočo točko.',
                'Read the secant slope and the tangent slope. Predict at which value of \\(c\\) the slopes are equal, and only then press Show matching point.',
            ),
            expectedObservations: [text(
                'Pri \\(c=0{,}5\\) je naklon sekante \\(2\\), naklon tangente \\(1\\) in razlika \\(-1\\); ujemajoča točka še ni razkrita.',
                'At \\(c=0.5\\) the secant slope is \\(2\\), the tangent slope is \\(1\\) and the difference is \\(-1\\); the matching point is not revealed yet.',
            )],
            scene: {
                id: 'mean-value-default', basedOn: 'demonstration-default',
                actions: [],
                expectedState: text(
                    'Prikazan je \\(f(x)=x^2\\) na \\([0,2]\\) s točko \\(c=0{,}5\\): naklon sekante \\(2\\), naklon tangente \\(1\\), razlika \\(-1\\); ujemajoča točka je skrita.',
                    'The graph of \\(f(x)=x^2\\) on \\([0,2]\\) is shown with the point \\(c=0.5\\): secant slope \\(2\\), tangent slope \\(1\\), difference \\(-1\\); the matching point is hidden.',
                ),
            },
        },
        {
            id: 'mean-value-reveal-step', order: 2,
            title: text('Ujemajoča točka \\(c=1\\)', 'The matching point \\(c=1\\)'),
            purpose: text('Primerjati napoved z ujemajočo točko, ki jo da formula.', 'Comparing the prediction with the matching point that the formula gives.'),
            explanation: text(
                'Pri \\(f(x)=x^2\\) mora veljati \\(2c=2\\), torej \\(c=1\\). Ko pokažeš ujemajočo točko, se na grafu pojavi obroček v \\((1,1)\\), črtkana tangenta v njem pa je vzporedna sekanti. Pri \\(c=1\\) se naklon tangente \\(2\\) ujame z naklonom sekante \\(2\\) in je razlika \\(0\\). Prikazano ujemanje je številčna primerjava prikazanih števil in ne dokaz: izrek zagotavlja, da ujemajoča točka obstaja, gumb pa jo izračuna po formuli.',
                'For \\(f(x)=x^2\\) we need \\(2c=2\\), so \\(c=1\\). When you show the matching point, a ring appears on the graph at \\((1,1)\\), and the dashed tangent through it is parallel to the secant. At \\(c=1\\) the tangent slope \\(2\\) equals the secant slope \\(2\\) and the difference is \\(0\\). The displayed agreement is a numerical comparison of the displayed numbers and not a proof: the theorem guarantees that a matching point exists, and the button computes it by formula.',
            ),
            formulaIds: ['mean-value-slopes', 'mean-value-power-matches'], workedExampleId: 'mean-value-x2-example', learnerInteraction: 'adjust-construction-parameter',
            frames: [frame('mean-value-reveal-explanation', 'explanation'), frame('mean-value-reveal-calculation', 'calculation'), frame('mean-value-reveal-observation', 'observation')],
            observationPrompt: text(
                'Primerjaj razkrito točko z napovedjo. Nato premakni \\(c\\) stran od \\(1\\) in opazuj, kako se razlika naklonov spremeni; krajišči \\(a\\) in \\(b\\) pri tem ostaneta.',
                'Compare the revealed point with your prediction. Then move \\(c\\) away from \\(1\\) and watch how the slope difference changes; the endpoints \\(a\\) and \\(b\\) stay where they are.',
            ),
            expectedObservations: [text(
                'Pri \\(c=1\\) sta naklona tangente in sekante enaka \\(2\\), razlika je \\(0\\), ujemajoča točka pa \\(1\\).',
                'At \\(c=1\\) the tangent and secant slopes are both \\(2\\), the difference is \\(0\\) and the matching point is \\(1\\).',
            )],
            scene: {
                id: 'mean-value-reveal-scene', basedOn: 'demonstration-default',
                actions: [parameter('mvt-c', 1), matchingPoints(true)],
                expectedState: text(
                    'Pri \\(f(x)=x^2\\) na \\([0,2]\\) je \\(c=1\\): naklona \\(2\\) in \\(2\\), razlika \\(0\\); ujemajoča točka \\(1\\) je razkrita.',
                    'For \\(f(x)=x^2\\) on \\([0,2]\\) we have \\(c=1\\): slopes \\(2\\) and \\(2\\), difference \\(0\\); the matching point \\(1\\) is revealed.',
                ),
            },
        },
        {
            id: 'mean-value-move-c-step', order: 3,
            title: text('Točka \\(c\\) je neodvisna od krajišč', 'The point \\(c\\) is independent of the endpoints'),
            purpose: text('Opaziti, da \\(c\\) ne premakne sekante, razlika naklonov pa menja predznak.', 'Observing that \\(c\\) does not move the secant while the slope difference changes sign.'),
            explanation: text(
                'Premakni \\(c\\) v \\(1{,}5\\): naklon tangente je \\(2c=3\\) in razlika \\(1\\) je pozitivna. Pri \\(c=0{,}5\\) je bila razlika \\(-1\\); ker je \\(2c-2\\) zvezna funkcija, mora imeti vmes vrednost \\(0\\), in to je pri \\(c=1\\). Sekanta se pri premikanju \\(c\\) ne premakne, ker \\(c\\) ne vpliva na krajišči \\(a\\) in \\(b\\). Če spreminjaš krajišči, ostane \\(c\\) v \\((a,b)\\): vrednost, ki bi pogoj \\(a<c<b\\) prekršila, aplikacija zavrne, zato najprej premakni \\(c\\).',
                'Move \\(c\\) to \\(1.5\\): the tangent slope is \\(2c=3\\) and the difference \\(1\\) is positive. At \\(c=0.5\\) the difference was \\(-1\\); since \\(2c-2\\) is a continuous function, it must take the value \\(0\\) in between, and that happens at \\(c=1\\). The secant does not move when you move \\(c\\), because \\(c\\) does not affect the endpoints \\(a\\) and \\(b\\). When you change the endpoints, \\(c\\) stays in \\((a,b)\\): a value that would break the condition \\(a<c<b\\) is rejected by the app, so move \\(c\\) first.',
            ),
            formulaIds: ['mean-value-slopes'], learnerInteraction: 'adjust-construction-parameter',
            frames: [frame('mean-value-move-c-explanation', 'explanation'), frame('mean-value-move-c-observation', 'observation')],
            observationPrompt: text(
                'Povleci točko \\(c\\) po osi \\(x\\) ali jo vnesi v polje. Opazuj, da se krajišči in sekanta ne premakneta, razlika naklonov pa menja predznak.',
                'Drag the point \\(c\\) along the \\(x\\)-axis or type it into the field. Notice that the endpoints and the secant do not move while the slope difference changes sign.',
            ),
            expectedObservations: [text(
                'Pri \\(c=1{,}5\\) je naklon tangente \\(3\\), razlika \\(1\\); naklon sekante \\(2\\) in krajišči \\(a=0\\), \\(b=2\\) so nespremenjeni.',
                'At \\(c=1.5\\) the tangent slope is \\(3\\) and the difference is \\(1\\); the secant slope \\(2\\) and the endpoints \\(a=0\\), \\(b=2\\) are unchanged.',
            )],
            scene: {
                id: 'mean-value-move-c-scene', basedOn: 'demonstration-default',
                actions: [parameter('mvt-c', 1.5)],
                expectedState: text(
                    'Pri \\(f(x)=x^2\\) na \\([0,2]\\) je \\(c=1{,}5\\): naklon tangente \\(3\\), naklon sekante \\(2\\), razlika \\(1\\); ujemajoča točka je skrita.',
                    'For \\(f(x)=x^2\\) on \\([0,2]\\) we have \\(c=1.5\\): tangent slope \\(3\\), secant slope \\(2\\), difference \\(1\\); the matching point is hidden.',
                ),
            },
        },
        {
            id: 'mean-value-cube-step', order: 4,
            title: text('Več ujemajočih točk: \\(x^3\\) na \\([-1,1]\\)', 'Several matching points: \\(x^3\\) on \\([-1,1]\\)'),
            purpose: text('Videti, da izrek zagotavlja vsaj eno ujemajočo točko, ne pa ene same.', 'Seeing that the theorem guarantees at least one matching point, not exactly one.'),
            explanation: text(
                'Pri \\(f(x)=x^3\\) na \\([-1,1]\\) je naklon sekante \\(\\frac{1-(-1)}{1-(-1)}=1\\). Iščemo \\(3c^2=1\\), torej \\(c=\\pm\\frac{1}{\\sqrt3}\\approx\\pm0{,}5774\\): ujemajoči točki sta dve, obe v \\((-1,1)\\). Izrek zagotavlja vsaj eno ujemajočo točko, ne pa, da je samo ena. Pri \\(c=0\\) je naklon tangente \\(0\\), razlika \\(-1\\) in tangenta je vodoravna, zato se naklona tam ne ujemata.',
                'For \\(f(x)=x^3\\) on \\([-1,1]\\) the secant slope is \\(\\frac{1-(-1)}{1-(-1)}=1\\). We need \\(3c^2=1\\), so \\(c=\\pm\\frac{1}{\\sqrt3}\\approx\\pm0.5774\\): there are two matching points, both in \\((-1,1)\\). The theorem guarantees at least one matching point, not that there is only one. At \\(c=0\\) the tangent slope is \\(0\\), the difference is \\(-1\\) and the tangent is horizontal, so the slopes do not agree there.',
            ),
            formulaIds: ['mean-value-power-matches'], workedExampleId: 'mean-value-x3-example', learnerInteraction: 'adjust-construction-parameter',
            frames: [frame('mean-value-cube-explanation', 'explanation'), frame('mean-value-cube-calculation', 'calculation'), frame('mean-value-cube-observation', 'observation')],
            observationPrompt: text(
                'Napovej, koliko ujemajočih točk ima \\(x^3\\) na tem intervalu, in nato pritisni Pokaži ujemajočo točko.',
                'Predict how many matching points \\(x^3\\) has on this interval, and then press Show matching point.',
            ),
            expectedObservations: [text(
                'Po pritisku sta razkrita dva obročka pri \\(c=-0{,}5774\\) in \\(c=0{,}5774\\); naklon sekante je \\(1\\) in naklon tangente \\(3c^2=1\\) pri obeh.',
                'After the press two rings are revealed at \\(c=-0.5774\\) and \\(c=0.5774\\); the secant slope is \\(1\\) and the tangent slope \\(3c^2=1\\) at both.',
            )],
            scene: {
                id: 'mean-value-cube-scene', basedOn: 'demonstration-default',
                actions: [meanValueExample('cube')],
                expectedState: text(
                    'Prikazan je \\(f(x)=x^3\\) na \\([-1,1]\\) s točko \\(c=0\\): naklon sekante \\(1\\), naklon tangente \\(0\\), razlika \\(-1\\); ujemajoči točki sta skriti.',
                    'The graph of \\(f(x)=x^3\\) on \\([-1,1]\\) is shown with the point \\(c=0\\): secant slope \\(1\\), tangent slope \\(0\\), difference \\(-1\\); the matching points are hidden.',
                ),
            },
        },
        {
            id: 'mean-value-abs-step', order: 5,
            title: text('Brez odvedljivosti ni zagotovila: \\(|x|\\) na \\([-1,1]\\)', 'Without differentiability there is no guarantee: \\(|x|\\) on \\([-1,1]\\)'),
            purpose: text('Pokazati, da je odvedljivost potreben pogoj izreka.', 'Showing that differentiability is a necessary condition of the theorem.'),
            explanation: text(
                'Funkcija \\(f(x)=|x|\\) je zvezna na \\([-1,1]\\), a v točki \\(0\\) ni odvedljiva: graf ima ostri prelom. Naklon sekante je \\(\\frac{|1|-|-1|}{1-(-1)}=0\\), odvod pa je \\(-1\\) levo od \\(0\\) in \\(1\\) desno od \\(0\\), nikoli \\(0\\). Nobena točka, v kateri odvod obstaja, torej ne ujame naklona sekante. V točki \\(c=0\\) odvod ne obstaja, zato tangente ni: aplikacija je ne nariše in naklona tangente ne prikaže, ne pa da bi ga izmislila ali pokazala neskončnost. Izrek tu ne trdi nasprotnega, ker predpostavka odvedljivosti na \\((-1,1)\\) ni izpolnjena.',
                'The function \\(f(x)=|x|\\) is continuous on \\([-1,1]\\) but not differentiable at the point \\(0\\): its graph has a corner. The secant slope is \\(\\frac{|1|-|-1|}{1-(-1)}=0\\), while the derivative is \\(-1\\) to the left of \\(0\\) and \\(1\\) to the right of \\(0\\), never \\(0\\). So no point at which the derivative exists achieves the secant slope. At the point \\(c=0\\) the derivative does not exist, so there is no tangent: the app draws none and shows no tangent slope, rather than inventing one or showing infinity. The theorem does not claim the opposite here, because its hypothesis of differentiability on \\((-1,1)\\) is not satisfied.',
            ),
            formulaIds: ['mean-value-statement'], workedExampleId: 'mean-value-abs-example', learnerInteraction: 'adjust-construction-parameter',
            frames: [frame('mean-value-abs-explanation', 'explanation'), frame('mean-value-abs-calculation', 'calculation'), frame('mean-value-abs-observation', 'observation')],
            observationPrompt: text(
                'Napovej, ali ima \\(|x|\\) na \\([-1,1]\\) ujemajočo točko, in nato pritisni Pokaži ujemajočo točko in preberi stanje. Nato premakni \\(c\\) s kota in opazuj naklon tangente.',
                'Predict whether \\(|x|\\) has a matching point on \\([-1,1]\\), then press Show matching point and read the status. Then move \\(c\\) off the corner and watch the tangent slope.',
            ),
            expectedObservations: [text(
                'Pri \\(c=0\\) tangente ni in naklon tangente ne obstaja; po pritisku stanje pove, da ujemajoče točke ni, ker predpostavka izreka ni izpolnjena; naklon sekante je \\(0\\).',
                'At \\(c=0\\) there is no tangent and the tangent slope does not exist; after the press the status says that there is no matching point because the hypothesis of the theorem is not satisfied; the secant slope is \\(0\\).',
            )],
            scene: {
                id: 'mean-value-abs-scene', basedOn: 'demonstration-default',
                actions: [meanValueExample('abs'), parameter('mvt-c', 0)],
                expectedState: text(
                    'Prikazan je \\(f(x)=|x|\\) na \\([-1,1]\\) s točko \\(c=0\\) v kotu: naklon sekante \\(0\\), tangente in naklona tangente ni; ujemajoče točke so skrite.',
                    'The graph of \\(f(x)=|x|\\) on \\([-1,1]\\) is shown with the point \\(c=0\\) at the corner: secant slope \\(0\\), no tangent and no tangent slope; the matching points are hidden.',
                ),
            },
        },
        {
            id: 'mean-value-free-exploration', order: 6,
            title: text('Ujemajoč interval in samostojno raziskovanje', 'A matching interval and free exploration'),
            purpose: text('Videti ujemajoči interval in preiti v samostojno raziskovanje.', 'Seeing a matching interval, and the handoff to free exploration.'),
            explanation: text(
                'Funkcija \\(|x|\\) na \\([0,1]\\) je odvedljiva na \\((0,1)\\), kjer je odvod \\(1\\), naklon sekante pa je \\(\\frac{1-0}{1-0}=1\\): ujema se vsaka točka intervala \\((0,1)\\). Izrek zagotavlja vsaj eno ujemajočo točko, ne le ene; aplikacija ujemajoči interval prikaže kot debelo črto na osi \\(x\\). Zdaj raziskuj sam: zamenjaj primer, premakni \\(a\\), \\(b\\) in \\(c\\) ter preveri, kdaj ujemajočih točk ni, kdaj je ena, kdaj sta dve in kdaj se ujema ves interval.',
                'The function \\(|x|\\) on \\([0,1]\\) is differentiable on \\((0,1)\\), where the derivative is \\(1\\), and the secant slope is \\(\\frac{1-0}{1-0}=1\\): every point of the interval \\((0,1)\\) matches. The theorem guarantees at least one matching point, not exactly one; the app shows a matching interval as a thick line on the \\(x\\)-axis. Now explore on your own: change the example, move \\(a\\), \\(b\\) and \\(c\\), and check when there is no matching point, when there is one, when there are two and when the whole interval matches.',
            ),
            formulaIds: ['mean-value-statement'], learnerInteraction: 'adjust-construction-parameter',
            frames: [frame('mean-value-free-explanation', 'explanation'), frame('mean-value-free-observation', 'observation')],
            observationPrompt: text(
                'Napovej, katere točke ujemajo pri \\(|x|\\) na \\([0,1]\\), in nato pritisni Pokaži ujemajočo točko. Nato poskusi \\(x^2\\) in \\(x^3\\) na drugih intervalih.',
                'Predict which points match for \\(|x|\\) on \\([0,1]\\), and then press Show matching point. Then try \\(x^2\\) and \\(x^3\\) on other intervals.',
            ),
            expectedObservations: [text(
                'Pri \\(|x|\\) na \\([0,1]\\) sta naklona tangente in sekante enaka \\(1\\); po pritisku se ujema vsaka točka intervala \\((0,1)\\), ki je označen z debelo črto.',
                'For \\(|x|\\) on \\([0,1]\\) the tangent and secant slopes are both \\(1\\); after the press every point of the interval \\((0,1)\\) matches, marked by a thick line.',
            )],
            scene: {
                id: 'mean-value-free-scene', basedOn: 'demonstration-default',
                actions: [meanValueExample('abs'), parameter('mvt-a', 0)],
                expectedState: text(
                    'Prikazan je \\(f(x)=|x|\\) na \\([0,1]\\) s točko \\(c=0{,}5\\): naklona tangente in sekante \\(1\\), razlika \\(0\\); ujemajoči interval je skrit.',
                    'The graph of \\(f(x)=|x|\\) on \\([0,1]\\) is shown with the point \\(c=0.5\\): tangent and secant slopes \\(1\\), difference \\(0\\); the matching interval is hidden.',
                ),
            },
        },
    ],
    sources: [
        {
            id: 'globevnik-brojan-analiza-1-mean-value',
            citation: 'Globevnik, J., Brojan, M. Analiza I, Fakulteta za matematiko in fiziko, Univerza v Ljubljani, §4.4 (printed pp. 115–117).',
            supports: ['the mean value theorem and its hypotheses', 'the reading of the theorem as a tangent parallel to the secant', 'existence of a matching point without uniqueness'],
        },
        {
            id: 'bezeg-mean-value-implementation',
            citation: 'Bezeg source: src/analysis/meanValue.ts, src/analysis/meanValueModel.ts and src/graphs/functions/MeanValueGraph.tsx.',
            supports: ['x^2 on [0, 2] matches at c = 1', 'x^3 on [-1, 1] matches at c = +-1/sqrt(3)', '|x| on [-1, 1] has secant slope 0 and no matching point', 'an undefined derivative at a corner and no tangent there'],
            implementationCorrespondence: 'The matching points are computed analytically from the example, a and b and are never stored; c is an independent model field with a < c < b enforced by every setter, and a lesson scene applies set-function-parameter and show-function-element actions through those setters in one synchronous tick.',
        },
    ],
    edgeCases: [
        text(
            'Vrednost, ki bi prekršila \\(a<c<b\\) ali presegla območje \\([-4,4]\\), aplikacija zavrne in model ostane nespremenjen; krajišča ni mogoče premakniti čez \\(c\\), zato je treba najprej premakniti \\(c\\).',
            'A value that would break \\(a<c<b\\) or leave the range \\([-4,4]\\) is rejected by the app and the model stays unchanged; an endpoint cannot be moved past \\(c\\), so move \\(c\\) first.',
        ),
        text(
            'V kotu funkcije \\(|x|\\) pri \\(x=0\\) odvod ne obstaja: tangente ni, naklon tangente in razlika naklonov pa nista število, ampak sta označena kot neobstoječa; nikoli ni prikazana neskončnost.',
            'At the corner of \\(|x|\\) at \\(x=0\\) the derivative does not exist: there is no tangent, and the tangent slope and the slope difference are not numbers but are marked as nonexistent; infinity is never shown.',
        ),
        text(
            'Pri \\(|x|\\) na intervalu na eni strani kota se ujema vsaka točka odprtega intervala, ne le izolirane točke; aplikacija to pove in označi interval.',
            'For \\(|x|\\) on an interval on one side of the corner every point of the open interval matches, not just isolated points; the app states this and marks the interval.',
        ),
    ],
    unresolvedQuestions: [
        text(
            'Pred classroom-ready pregledom je treba potrditi, ali naj lekcija omeni tudi Rollov izrek kot poseben primer, ko je \\(f(a)=f(b)\\).',
            'Before classroom-ready review, confirm whether the lesson should also mention Rolle\'s theorem as the special case \\(f(a)=f(b)\\).',
        ),
    ],
};

const accumulationFunction = (value: FunctionId): SceneAction => ({
    name: 'set-function-choice', value: {name: 'accumulation-function', value},
});
const accumulationCurve = (visible: boolean): SceneAction => ({
    name: 'show-function-element', value: {name: 'accumulation-curve', value: visible},
});

const accumulation: GuidedLesson = {
    demonstrationId: 'accumulation',
    title: text('Akumulirani integral in osnovni izrek', 'The accumulated integral and the fundamental theorem'),
    summary: text(
        'Akumulacija \\(A(x)=\\int_a^x f(t)\\,dt\\) je določeni integral s predznakom od spodnje meje \\(a\\) do točke \\(x\\). Deli grafa pod osjo \\(x\\) štejejo negativno, pri \\(x<a\\) pa se orientacija obrne. Če je \\(f\\) zvezna v točki \\(x\\), je \\(A^{\\prime}(x)=f(x)\\): naklon tangente na \\(A\\) je višina grafa funkcije \\(f\\).',
        'The accumulation \\(A(x)=\\int_a^x f(t)\\,dt\\) is the signed definite integral from the lower bound \\(a\\) to the point \\(x\\). Parts of the graph below the \\(x\\)-axis count as negative, and for \\(x<a\\) the orientation reverses. If \\(f\\) is continuous at the point \\(x\\), then \\(A^{\\prime}(x)=f(x)\\): the slope of the tangent to \\(A\\) is the height of the graph of \\(f\\).',
    ),
    prerequisites: [
        text(
            'Potrebno je razumevanje določenega integrala s predznakom \\(\\int_a^b f(x)\\,dx\\), pri katerem deli grafa pod osjo \\(x\\) štejejo negativno.',
            'Assumes an understanding of the signed definite integral \\(\\int_a^b f(x)\\,dx\\), in which parts of the graph below the \\(x\\)-axis count as negative.',
        ),
        text(
            'Potrebno je poznavanje odvoda funkcije kot naklona tangente in zvezne funkcije.',
            'Assumes familiarity with the derivative as the slope of the tangent and with continuous functions.',
        ),
    ],
    learningGoals: [
        text(
            'Pri \\(f(x)=\\sin x\\) in \\(a=0\\) iz osenčenega območja napoveš \\(A(2)\\) in napoved preveriš: \\(A(2)=1-\\cos 2\\approx1{,}4161\\); nato odčitaš \\(A(\\pi)=2\\) in \\(A(2\\pi)=0\\).',
            'For \\(f(x)=\\sin x\\) and \\(a=0\\) predict \\(A(2)\\) from the shaded region and check the prediction: \\(A(2)=1-\\cos 2\\approx1.4161\\); then read off \\(A(\\pi)=2\\) and \\(A(2\\pi)=0\\).',
        ),
        text(
            'Pojasniš, zakaj deli grafa pod osjo \\(x\\) akumulacijo zmanjšujejo in zakaj je pri \\(x<a\\) vrednost \\(A(x)=-\\int_x^a f(t)\\,dt\\).',
            'Explain why parts of the graph below the \\(x\\)-axis decrease the accumulation and why \\(A(x)=-\\int_x^a f(t)\\,dt\\) for \\(x<a\\).',
        ),
        text(
            'Povežeš naklon tangente na \\(A\\) z vrednostjo \\(f(x)\\) in imenuješ zveznost funkcije \\(f\\) kot zadostni pogoj za \\(A^{\\prime}(x)=f(x)\\).',
            'Connect the slope of the tangent to \\(A\\) with the value \\(f(x)\\) and name continuity of \\(f\\) as a sufficient condition for \\(A^{\\prime}(x)=f(x)\\).',
        ),
    ],
    formulaBlocks: [
        {
            id: 'accumulation-definition',
            latex: 'A(x)=\\int_a^x f(t)\\,dt=F(x)-F(a)',
            notation: text(
                'Funkcija \\(F\\) je poljubna primitivna funkcija funkcije \\(f\\), spodnja meja \\(a\\) je pritrjena, točka \\(x\\) pa se premika.',
                'The function \\(F\\) is any antiderivative of \\(f\\), the lower bound \\(a\\) is fixed, and the point \\(x\\) moves.',
            ),
            explanation: text(
                'Pri \\(x=a\\) je območje prazno in \\(A(a)=0\\). Aplikacija vrednost izračuna po formuli \\(F(x)-F(a)\\) in ne s seštevanjem pravokotnikov.',
                'At \\(x=a\\) the region is empty and \\(A(a)=0\\). The app computes the value by the formula \\(F(x)-F(a)\\) and not by adding rectangles.',
            ),
        },
        {
            id: 'accumulation-signed',
            latex: 'A(x)=\\int_a^x f(t)\\,dt,\\qquad x<a:\\ A(x)=-\\int_x^a f(t)\\,dt',
            notation: text(
                'Integral je usmerjen od \\(a\\) proti \\(x\\): če je \\(x<a\\), je pot obrnjena in integral zamenja predznak.',
                'The integral is oriented from \\(a\\) towards \\(x\\): if \\(x<a\\) the path is reversed and the integral changes sign.',
            ),
            explanation: text(
                'Deli grafa \\(f\\) pod osjo \\(x\\) prispevajo negativno, ko je \\(x>a\\), in pozitivno, ko je \\(x<a\\). Zato vrednost \\(A(x)\\) ni geometrijska ploščina, ampak ploščina s predznakom.',
                'Parts of the graph of \\(f\\) below the \\(x\\)-axis contribute negatively when \\(x>a\\) and positively when \\(x<a\\). So the value \\(A(x)\\) is not the geometric area but a signed area.',
            ),
        },
        {
            id: 'accumulation-derivative',
            latex: 'A^{\\prime}(x)=\\lim_{h\\to0}\\frac{A(x+h)-A(x)}{h}=\\lim_{h\\to0}\\frac1h\\int_x^{x+h}f(t)\\,dt=f(x)',
            notation: text(
                'Količnik \\(\\frac{A(x+h)-A(x)}{h}\\) je povprečna višina grafa \\(f\\) na kratkem odseku od \\(x\\) do \\(x+h\\).',
                'The quotient \\(\\frac{A(x+h)-A(x)}{h}\\) is the average height of the graph of \\(f\\) over the short stretch from \\(x\\) to \\(x+h\\).',
            ),
            explanation: text(
                'Če je \\(f\\) zvezna v točki \\(x\\), se povprečna višina pri \\(h\\to0\\) približa vrednosti \\(f(x)\\), zato je \\(A^{\\prime}(x)=f(x)\\). Zveznost je zadostni pogoj; pri funkciji s skokom v \\(x\\) zveza lahko odpove.',
                'If \\(f\\) is continuous at the point \\(x\\), the average height approaches \\(f(x)\\) as \\(h\\to0\\), so \\(A^{\\prime}(x)=f(x)\\). Continuity is a sufficient condition; for a function with a jump at \\(x\\) the relation can fail.',
            ),
        },
        {
            id: 'accumulation-sine',
            latex: 'A(x)=\\int_0^x\\sin t\\,dt=1-\\cos x,\\qquad A(0)=0,\\ A(\\pi)=2,\\ A(2\\pi)=0',
            notation: text(
                'Primitivna funkcija funkcije \\(\\sin t\\) je \\(-\\cos t\\), zato je \\(A(x)=-\\cos x+\\cos 0=1-\\cos x\\).',
                'An antiderivative of \\(\\sin t\\) is \\(-\\cos t\\), so \\(A(x)=-\\cos x+\\cos 0=1-\\cos x\\).',
            ),
            explanation: text(
                'Akumulacija naraste od \\(0\\) do \\(2\\) na \\([0,\\pi]\\), kjer je \\(\\sin t\\ge0\\), in pade nazaj na \\(0\\) na \\([\\pi,2\\pi]\\), kjer je \\(\\sin t\\le0\\).',
                'The accumulation grows from \\(0\\) to \\(2\\) on \\([0,\\pi]\\), where \\(\\sin t\\ge0\\), and falls back to \\(0\\) on \\([\\pi,2\\pi]\\), where \\(\\sin t\\le0\\).',
            ),
        },
    ],
    workedExamples: [
        {
            id: 'accumulation-sin-example',
            title: text('Funkcija \\(f(x)=\\sin x\\) in \\(a=0\\)', 'The function \\(f(x)=\\sin x\\) and \\(a=0\\)'),
            calculationLatex: 'A(x)=-\\cos x+\\cos 0=1-\\cos x,\\qquad A(2)=1-\\cos 2',
            resultLatex: 'A(0)=0,\\qquad A(\\pi)=1-\\cos\\pi=2,\\qquad A(2\\pi)=1-\\cos 2\\pi=0',
            check: text(
                'Na \\([0,\\pi]\\) je \\(\\sin t\\ge0\\), zato \\(A\\) narašča od \\(0\\) do \\(2\\); na \\([\\pi,2\\pi]\\) je \\(\\sin t\\le0\\), zato \\(A\\) pada nazaj na \\(0\\). Aplikacija pri \\(x=2\\) pokaže vrednost \\(1{,}4161\\).',
                'On \\([0,\\pi]\\) we have \\(\\sin t\\ge0\\), so \\(A\\) increases from \\(0\\) to \\(2\\); on \\([\\pi,2\\pi]\\) we have \\(\\sin t\\le0\\), so \\(A\\) falls back to \\(0\\). At \\(x=2\\) the app shows the value \\(1.4161\\).',
            ),
        },
        {
            id: 'accumulation-reversed-example',
            title: text('Obrnjena orientacija: \\(a=2\\) in \\(x=0\\)', 'Reversed orientation: \\(a=2\\) and \\(x=0\\)'),
            calculationLatex: 'A(0)=-\\int_0^2\\sin t\\,dt=-(1-\\cos 2)',
            resultLatex: 'A(0)=\\cos 2-1',
            check: text(
                'Osenčeno območje je enako kot pri \\(a=0\\) in \\(x=2\\) in leži nad osjo, vrednost \\(A(0)=\\cos 2-1\\approx-1{,}4161\\) pa je negativna, ker je \\(x<a\\). Aplikacija pokaže \\(-1{,}4161\\).',
                'The shaded region is the same as for \\(a=0\\) and \\(x=2\\) and lies above the axis, while the value \\(A(0)=\\cos 2-1\\approx-1.4161\\) is negative because \\(x<a\\). The app shows \\(-1.4161\\).',
            ),
        },
        {
            id: 'accumulation-derivative-example',
            title: text('Naklon tangente v točki \\(x=\\frac{\\pi}{2}\\)', 'The tangent slope at the point \\(x=\\frac{\\pi}{2}\\)'),
            calculationLatex: 'A^{\\prime}(x)=\\sin x,\\qquad A^{\\prime}\\!\\left(\\frac{\\pi}{2}\\right)=\\sin\\frac{\\pi}{2}=1',
            resultLatex: 'A\\!\\left(\\frac{\\pi}{2}\\right)=1-\\cos\\frac{\\pi}{2}=1',
            check: text(
                'Pri \\(x=\\frac{\\pi}{2}\\approx1{,}5708\\) je \\(f(x)=1\\), tangenta na \\(A\\) ima naklon \\(1\\) in \\(A(x)=1\\); enak naklon da odvod \\(1-\\cos x\\), to je \\(\\sin x\\).',
                'At \\(x=\\frac{\\pi}{2}\\approx1.5708\\) we have \\(f(x)=1\\), the tangent to \\(A\\) has slope \\(1\\) and \\(A(x)=1\\); the derivative of \\(1-\\cos x\\), which is \\(\\sin x\\), gives the same slope.',
            ),
        },
    ],
    steps: [
        {
            id: 'accumulation-prerequisites-step', order: 1,
            title: text('Osenčeno območje in napoved', 'The shaded region and a prediction'),
            purpose: text(
                'Povezati osenčeno območje med \\(a\\) in \\(x\\) z vrednostjo akumulacije, še preden jo vidimo.',
                'Linking the shaded region between \\(a\\) and \\(x\\) to the value of the accumulation before seeing it.',
            ),
            explanation: text(
                'Funkcija \\(f(x)=\\sin x\\) je zvezna, spodnja meja je \\(a=0\\) in točka je \\(x=2\\). Akumulacija \\(A(x)=\\int_a^x f(t)\\,dt\\) je integral s predznakom od \\(a\\) do \\(x\\): osenčeno območje med grafom in osjo \\(x\\) šteje pozitivno nad osjo (oznaka +) in negativno pod njo (oznaka −). Krivulja \\(A\\) je za zdaj skrita. Pri \\(x=2\\) leži vse območje nad osjo, ker je \\(\\sin t>0\\) za \\(t\\in(0,2)\\), zato mora biti \\(A(2)\\) pozitivna in manjša od \\(2\\), kolikor meri celoten lok sinusa nad \\([0,\\pi]\\).',
                'The function \\(f(x)=\\sin x\\) is continuous, the lower bound is \\(a=0\\) and the point is \\(x=2\\). The accumulation \\(A(x)=\\int_a^x f(t)\\,dt\\) is the signed integral from \\(a\\) to \\(x\\): the shaded region between the graph and the \\(x\\)-axis counts as positive above the axis (marked +) and as negative below it (marked −). The curve \\(A\\) is hidden for now. At \\(x=2\\) the whole region lies above the axis, because \\(\\sin t>0\\) for \\(t\\in(0,2)\\), so \\(A(2)\\) must be positive and smaller than \\(2\\), the measure of the whole arc of the sine over \\([0,\\pi]\\).',
            ),
            formulaIds: ['accumulation-definition', 'accumulation-signed'], learnerInteraction: 'observe',
            frames: [frame('accumulation-prerequisites-explanation', 'explanation'), frame('accumulation-prerequisites-observation', 'observation')],
            observationPrompt: text(
                'Napovej predznak in približno velikost \\(A(2)\\) iz osenčenega območja in šele nato pritisni Pokaži akumulacijo A.',
                'Predict the sign and approximate size of \\(A(2)\\) from the shaded region, and only then press Show accumulation A.',
            ),
            expectedObservations: [text(
                'Akumulacija je skrita: odčitki za \\(A(x)\\) in \\(A^{\\prime}(x)\\) kažejo, da sta skrita; prikazana je le vrednost \\(f(2)=\\sin 2\\approx0{,}9093\\).',
                'The accumulation is hidden: the readouts for \\(A(x)\\) and \\(A^{\\prime}(x)\\) say that they are hidden; only the value \\(f(2)=\\sin 2\\approx0.9093\\) is shown.',
            )],
            scene: {
                id: 'accumulation-default', basedOn: 'demonstration-default',
                actions: [],
                expectedState: text(
                    'Prikazan je \\(f(x)=\\sin x\\) z \\(a=0\\) in \\(x=2\\): osenčeno območje je nad osjo, akumulacija \\(A\\) je skrita.',
                    'The graph of \\(f(x)=\\sin x\\) is shown with \\(a=0\\) and \\(x=2\\): the shaded region is above the axis, and the accumulation \\(A\\) is hidden.',
                ),
            },
        },
        {
            id: 'accumulation-reveal-step', order: 2,
            title: text('Akumulacija \\(A\\) in \\(A(0)=0\\)', 'The accumulation \\(A\\) and \\(A(0)=0\\)'),
            purpose: text(
                'Primerjati napoved z vrednostjo \\(A(2)\\), ki jo da formula.',
                'Comparing the prediction with the value \\(A(2)\\) that the formula gives.',
            ),
            explanation: text(
                'Primitivna funkcija funkcije \\(\\sin t\\) je \\(-\\cos t\\), zato je \\(A(x)=-\\cos x+\\cos 0=1-\\cos x\\) in \\(A(2)=1-\\cos 2\\approx1{,}4161\\). Ko pokažeš akumulacijo, se nariše črtkana krivulja \\(A\\) in njena točka pri \\(x=2\\); tangenta na \\(A\\) ima tam naklon \\(f(2)\\approx0{,}9093\\). Pri \\(x=a\\) je območje prazno in \\(A(a)=0\\), zato se krivulja \\(A\\) začne v točki \\((0,0)\\). Prikazana vrednost je določeni integral s predznakom, ne geometrijska ploščina.',
                'An antiderivative of \\(\\sin t\\) is \\(-\\cos t\\), so \\(A(x)=-\\cos x+\\cos 0=1-\\cos x\\) and \\(A(2)=1-\\cos 2\\approx1.4161\\). When you show the accumulation, the dashed curve \\(A\\) is drawn together with its point at \\(x=2\\); the tangent to \\(A\\) there has slope \\(f(2)\\approx0.9093\\). At \\(x=a\\) the region is empty and \\(A(a)=0\\), so the curve \\(A\\) starts at the point \\((0,0)\\). The displayed value is the signed definite integral, not the geometric area.',
            ),
            formulaIds: ['accumulation-definition', 'accumulation-sine'], workedExampleId: 'accumulation-sin-example', learnerInteraction: 'adjust-construction-parameter',
            frames: [frame('accumulation-reveal-explanation', 'explanation'), frame('accumulation-reveal-calculation', 'calculation'), frame('accumulation-reveal-observation', 'observation')],
            observationPrompt: text(
                'Primerjaj prikazano vrednost \\(A(2)\\) z napovedjo. Nato povleci točko \\(x\\) po osi \\(x\\) in opazuj, kako se točka na krivulji \\(A\\) premika.',
                'Compare the shown value \\(A(2)\\) with your prediction. Then drag the point \\(x\\) along the \\(x\\)-axis and watch the point on the curve \\(A\\) move.',
            ),
            expectedObservations: [text(
                'Pri \\(x=2\\) je \\(A(2)\\approx1{,}4161\\), naklon tangente na \\(A\\) je \\(0{,}9093\\) in osenčeno območje je nad osjo.',
                'At \\(x=2\\) we have \\(A(2)\\approx1.4161\\), the slope of the tangent to \\(A\\) is \\(0.9093\\) and the shaded region is above the axis.',
            )],
            scene: {
                id: 'accumulation-reveal-scene', basedOn: 'demonstration-default',
                actions: [accumulationCurve(true)],
                expectedState: text(
                    'Pri \\(f(x)=\\sin x\\), \\(a=0\\) in \\(x=2\\) je \\(A(2)\\approx1{,}4161\\); akumulacija \\(A\\) je pokazana.',
                    'For \\(f(x)=\\sin x\\), \\(a=0\\) and \\(x=2\\) we have \\(A(2)\\approx1.4161\\); the accumulation \\(A\\) is shown.',
                ),
            },
        },
        {
            id: 'accumulation-pi-step', order: 3,
            title: text('Cel lok sinusa: \\(A(\\pi)=2\\)', 'The whole arc of the sine: \\(A(\\pi)=2\\)'),
            purpose: text(
                'Napovedati vrednost akumulacije, ko območje zajame celoten lok sinusa nad osjo.',
                'Predicting the value of the accumulation when the region covers the whole arc of the sine above the axis.',
            ),
            explanation: text(
                'Pri \\(x=\\pi\\) osenčeno območje zajame cel lok sinusa nad osjo, od \\(0\\) do \\(\\pi\\). Njegova vrednost je \\(A(\\pi)=1-\\cos\\pi=2\\), kar je znani rezultat \\(\\int_0^{\\pi}\\sin t\\,dt=2\\). Akumulacija \\(A\\) je do \\(x=\\pi\\) naraščala, ker je \\(\\sin t>0\\) na \\((0,\\pi)\\); v točki \\(x=\\pi\\) doseže lokalni maksimum \\(2\\), ki je tudi največja vrednost \\(A\\) na \\([0,2\\pi]\\); tam je \\(f(\\pi)=0\\) in njena tangenta je vodoravna.',
                'At \\(x=\\pi\\) the shaded region covers the whole arc of the sine above the axis, from \\(0\\) to \\(\\pi\\). Its value is \\(A(\\pi)=1-\\cos\\pi=2\\), the well-known result \\(\\int_0^{\\pi}\\sin t\\,dt=2\\). The accumulation \\(A\\) increased up to \\(x=\\pi\\), because \\(\\sin t>0\\) on \\((0,\\pi)\\); at the point \\(x=\\pi\\) it reaches a local maximum \\(2\\), which is also the largest value of \\(A\\) on \\([0,2\\pi]\\); there \\(f(\\pi)=0\\) and its tangent is horizontal.',
            ),
            formulaIds: ['accumulation-sine'], learnerInteraction: 'adjust-construction-parameter',
            frames: [frame('accumulation-pi-explanation', 'explanation'), frame('accumulation-pi-observation', 'observation')],
            observationPrompt: text(
                'Napovej \\(A(\\pi)\\) in šele nato pritisni Pokaži akumulacijo A. Nato preveri, da je tangenta na \\(A\\) v točki \\(x=\\pi\\) vodoravna.',
                'Predict \\(A(\\pi)\\), and only then press Show accumulation A. Then check that the tangent to \\(A\\) at the point \\(x=\\pi\\) is horizontal.',
            ),
            expectedObservations: [text(
                'Po pritisku je \\(A(\\pi)=2\\), \\(f(\\pi)=0\\) in naklon tangente na \\(A\\) je \\(0\\).',
                'After the press we have \\(A(\\pi)=2\\), \\(f(\\pi)=0\\) and the slope of the tangent to \\(A\\) is \\(0\\).',
            )],
            scene: {
                id: 'accumulation-pi-scene', basedOn: 'demonstration-default',
                actions: [parameter('accum-x', Math.PI)],
                expectedState: text(
                    'Pri \\(f(x)=\\sin x\\), \\(a=0\\) in \\(x=\\pi\\) je osenčen cel lok sinusa nad osjo; akumulacija \\(A\\) je skrita.',
                    'For \\(f(x)=\\sin x\\), \\(a=0\\) and \\(x=\\pi\\) the whole arc of the sine above the axis is shaded; the accumulation \\(A\\) is hidden.',
                ),
            },
        },
        {
            id: 'accumulation-negative-step', order: 4,
            title: text('Negativen integrand zmanjšuje akumulacijo: \\(A(2\\pi)=0\\)', 'A negative integrand decreases the accumulation: \\(A(2\\pi)=0\\)'),
            purpose: text(
                'Videti, da del grafa pod osjo vrednost akumulacije zmanjša.',
                'Seeing that a part of the graph below the axis decreases the value of the accumulation.',
            ),
            explanation: text(
                'Pri \\(x=2\\pi\\) osenčeno območje obsega dva loka: prvi nad osjo prispeva \\(+2\\), drugi pod osjo pa \\(-2\\). Na \\((\\pi,2\\pi)\\) je \\(\\sin t<0\\), zato akumulacija \\(A\\) pada od \\(2\\) nazaj na \\(A(2\\pi)=1-\\cos 2\\pi=0\\). Ničla ne pomeni, da območja ni: vrednost je integral s predznakom in ne geometrijska ploščina, ki bi bila \\(4\\). Odčitka prispevkov delov nad osjo in pod osjo kažeta \\(2\\) in \\(-2\\).',
                'At \\(x=2\\pi\\) the shaded region consists of two arcs: the first above the axis contributes \\(+2\\) and the second below the axis contributes \\(-2\\). On \\((\\pi,2\\pi)\\) we have \\(\\sin t<0\\), so the accumulation \\(A\\) falls from \\(2\\) back to \\(A(2\\pi)=1-\\cos 2\\pi=0\\). A zero does not mean that there is no region: the value is a signed integral and not the geometric area, which would be \\(4\\). The readouts for the parts above and below the axis show \\(2\\) and \\(-2\\).',
            ),
            formulaIds: ['accumulation-signed', 'accumulation-sine'], learnerInteraction: 'adjust-construction-parameter',
            frames: [frame('accumulation-negative-explanation', 'explanation'), frame('accumulation-negative-observation', 'observation')],
            observationPrompt: text(
                'Napovej \\(A(2\\pi)\\): koliko prispeva lok nad osjo in koliko lok pod njo? Šele nato pritisni Pokaži akumulacijo A.',
                'Predict \\(A(2\\pi)\\): how much does the arc above the axis contribute and how much the arc below it? Only then press Show accumulation A.',
            ),
            expectedObservations: [text(
                'Po pritisku je \\(A(2\\pi)=0\\); prispevek dela nad osjo je \\(2\\), dela pod osjo \\(-2\\); krivulja \\(A\\) je med \\(\\pi\\) in \\(2\\pi\\) padala.',
                'After the press we have \\(A(2\\pi)=0\\); the contribution of the part above the axis is \\(2\\) and of the part below the axis \\(-2\\); the curve \\(A\\) fell between \\(\\pi\\) and \\(2\\pi\\).',
            )],
            scene: {
                id: 'accumulation-negative-scene', basedOn: 'demonstration-default',
                actions: [parameter('accum-x', 2 * Math.PI)],
                expectedState: text(
                    'Pri \\(f(x)=\\sin x\\), \\(a=0\\) in \\(x=2\\pi\\) sta osenčena lok nad osjo (+) in lok pod osjo (−); akumulacija \\(A\\) je skrita.',
                    'For \\(f(x)=\\sin x\\), \\(a=0\\) and \\(x=2\\pi\\) the arc above the axis (+) and the arc below the axis (−) are shaded; the accumulation \\(A\\) is hidden.',
                ),
            },
        },
        {
            id: 'accumulation-reversed-step', order: 5,
            title: text('Točka \\(x\\) levo od \\(a\\)', 'The point \\(x\\) to the left of \\(a\\)'),
            purpose: text(
                'Opaziti, da zamenjava smeri integriranja zamenja predznak vrednosti.',
                'Observing that reversing the direction of integration reverses the sign of the value.',
            ),
            explanation: text(
                'Zdaj je \\(a=2\\) in \\(x=0\\). Integral je usmerjen od \\(a\\) proti \\(x\\), zato je \\(A(x)=-\\int_x^a f(t)\\,dt\\) in \\(A(0)=-\\int_0^2\\sin t\\,dt\\), to je \\(-(1-\\cos 2)\\approx-1{,}4161\\). Osenčeno območje je enako kot pri \\(x=2\\) in leži nad osjo, vrednost pa je vseeno negativna, ker je smer obrnjena. To ni protislovje s prejšnjimi koraki: formula \\(F(x)-F(a)\\) velja za vsak \\(x\\), tudi za \\(x<a\\).',
                'Now \\(a=2\\) and \\(x=0\\). The integral is oriented from \\(a\\) towards \\(x\\), so \\(A(x)=-\\int_x^a f(t)\\,dt\\) and \\(A(0)=-\\int_0^2\\sin t\\,dt\\), which is \\(-(1-\\cos 2)\\approx-1.4161\\). The shaded region is the same as for \\(x=2\\) and lies above the axis, yet the value is negative because the direction is reversed. This does not contradict the previous steps: the formula \\(F(x)-F(a)\\) holds for every \\(x\\), also for \\(x<a\\).',
            ),
            formulaIds: ['accumulation-signed'], workedExampleId: 'accumulation-reversed-example', learnerInteraction: 'adjust-construction-parameter',
            frames: [frame('accumulation-reversed-explanation', 'explanation'), frame('accumulation-reversed-calculation', 'calculation'), frame('accumulation-reversed-observation', 'observation')],
            observationPrompt: text(
                'Napovej predznak \\(A(0)\\), ko je \\(x<a\\), in šele nato pritisni Pokaži akumulacijo A. Nato povleci \\(x\\) čez \\(a\\) in opazuj, kje se predznak obrne.',
                'Predict the sign of \\(A(0)\\) when \\(x<a\\), and only then press Show accumulation A. Then drag \\(x\\) across \\(a\\) and watch where the sign reverses.',
            ),
            expectedObservations: [text(
                'Po pritisku je \\(A(0)\\approx-1{,}4161\\); osenčeno območje je nad osjo, stanje pa pove, da \\(x\\) leži levo od \\(a\\).',
                'After the press we have \\(A(0)\\approx-1.4161\\); the shaded region is above the axis, and the status says that \\(x\\) lies left of \\(a\\).',
            )],
            scene: {
                id: 'accumulation-reversed-scene', basedOn: 'demonstration-default',
                actions: [parameter('accum-a', 2), parameter('accum-x', 0)],
                expectedState: text(
                    'Pri \\(f(x)=\\sin x\\), \\(a=2\\) in \\(x=0\\) je osenčeno območje nad osjo; akumulacija \\(A\\) je skrita.',
                    'For \\(f(x)=\\sin x\\), \\(a=2\\) and \\(x=0\\) the shaded region is above the axis; the accumulation \\(A\\) is hidden.',
                ),
            },
        },
        {
            id: 'accumulation-derivative-step', order: 6,
            title: text('Odvod akumulacije: \\(A^{\\prime}(x)=f(x)\\)', 'The derivative of the accumulation: \\(A^{\\prime}(x)=f(x)\\)'),
            purpose: text(
                'Povezati naklon tangente na \\(A\\) z višino grafa \\(f\\) in imenovati zadostni pogoj.',
                'Linking the tangent slope of \\(A\\) with the height of the graph of \\(f\\) and naming the sufficient condition.',
            ),
            explanation: text(
                'Pri \\(x=\\frac{\\pi}{2}\\) je \\(f(x)=\\sin\\frac{\\pi}{2}=1\\) in tangenta na \\(A\\) ima naklon \\(1\\); res je \\(A(x)=1-\\cos x\\) in \\(A^{\\prime}(x)=\\sin x\\). Zveza velja, ker je integrand \\(f\\) zvezen v točki \\(x\\): zveznost je zadostni pogoj, da je \\(A\\) v točki \\(x\\) odvedljiva z odvodom \\(f(x)\\). Odvod akumulacije ni ploščina, ampak višina grafa \\(f\\): kjer je \\(f>0\\), akumulacija narašča, kjer je \\(f<0\\), pada, in kjer je \\(f=0\\), ima vodoravno tangento. Aplikacija odčitek naklona izračuna po formuli \\(f(x)\\).',
                'At \\(x=\\frac{\\pi}{2}\\) we have \\(f(x)=\\sin\\frac{\\pi}{2}=1\\) and the tangent to \\(A\\) has slope \\(1\\); indeed \\(A(x)=1-\\cos x\\) and \\(A^{\\prime}(x)=\\sin x\\). The relation holds because the integrand \\(f\\) is continuous at the point \\(x\\): continuity is a sufficient condition for \\(A\\) to be differentiable at \\(x\\) with derivative \\(f(x)\\). The derivative of the accumulation is not an area but the height of the graph of \\(f\\): where \\(f>0\\) the accumulation increases, where \\(f<0\\) it decreases, and where \\(f=0\\) it has a horizontal tangent. The app computes the slope readout by the formula \\(f(x)\\).',
            ),
            formulaIds: ['accumulation-derivative', 'accumulation-sine'], workedExampleId: 'accumulation-derivative-example', learnerInteraction: 'adjust-construction-parameter',
            frames: [frame('accumulation-derivative-explanation', 'explanation'), frame('accumulation-derivative-calculation', 'calculation'), frame('accumulation-derivative-observation', 'observation')],
            observationPrompt: text(
                'Povleci \\(x\\) po osi \\(x\\) in primerjaj naklon tangente na \\(A\\) z višino grafa \\(f\\) v isti točki. Kje je naklon pozitiven, kje negativen in kje \\(0\\)?',
                'Drag \\(x\\) along the \\(x\\)-axis and compare the slope of the tangent to \\(A\\) with the height of the graph of \\(f\\) at the same point. Where is the slope positive, where negative and where \\(0\\)?',
            ),
            expectedObservations: [text(
                'Pri \\(x=\\frac{\\pi}{2}\\) je naklon tangente na \\(A\\) enak \\(f(x)=1\\) in \\(A(x)=1\\); stanje pove, da \\(A\\) narašča.',
                'At \\(x=\\frac{\\pi}{2}\\) the slope of the tangent to \\(A\\) equals \\(f(x)=1\\) and \\(A(x)=1\\); the status says that \\(A\\) is increasing.',
            )],
            scene: {
                id: 'accumulation-derivative-scene', basedOn: 'demonstration-default',
                actions: [parameter('accum-x', Math.PI / 2), accumulationCurve(true)],
                expectedState: text(
                    'Pri \\(f(x)=\\sin x\\), \\(a=0\\) in \\(x=\\frac{\\pi}{2}\\) je \\(A(x)=1\\) in tangenta na \\(A\\) ima naklon \\(1\\); akumulacija \\(A\\) je pokazana.',
                    'For \\(f(x)=\\sin x\\), \\(a=0\\) and \\(x=\\frac{\\pi}{2}\\) we have \\(A(x)=1\\) and the tangent to \\(A\\) has slope \\(1\\); the accumulation \\(A\\) is shown.',
                ),
            },
        },
        {
            id: 'accumulation-free-exploration', order: 7,
            title: text('Samostojno raziskovanje: \\(x^2\\) in \\(e^x\\)', 'Free exploration: \\(x^2\\) and \\(e^x\\)'),
            purpose: text('Preiti v samostojno raziskovanje z drugima funkcijama.', 'The handoff to free exploration with the other two functions.'),
            explanation: text(
                'Zdaj raziskuj sam: zamenjaj funkcijo, premakni \\(a\\) in \\(x\\) ter vsakič najprej napovej \\(A(x)\\). Pri \\(f(x)=x^2\\) in \\(a=0\\) je \\(A(x)=\\frac{x^3}{3}\\), zato je \\(A(2)=\\frac{8}{3}\\approx2{,}6667\\), naklon tangente na \\(A\\) pa \\(f(2)=4\\). Poskusi tudi \\(e^x\\), kjer je \\(A(x)=e^x-e^a\\). Funkciji \\(x^2\\) in \\(e^x\\) nista nikoli negativni, zato \\(A\\) pri \\(x>a\\) nikoli ne pada; pri \\(\\sin x\\) pada, kjer je \\(f<0\\).',
                'Now explore on your own: change the function, move \\(a\\) and \\(x\\), and each time predict \\(A(x)\\) first. For \\(f(x)=x^2\\) and \\(a=0\\) we have \\(A(x)=\\frac{x^3}{3}\\), so \\(A(2)=\\frac{8}{3}\\approx2.6667\\) and the tangent to \\(A\\) has slope \\(f(2)=4\\). Also try \\(e^x\\), where \\(A(x)=e^x-e^a\\). The functions \\(x^2\\) and \\(e^x\\) are never negative, so \\(A\\) never decreases for \\(x>a\\); for \\(\\sin x\\) it decreases where \\(f<0\\).',
            ),
            formulaIds: ['accumulation-definition', 'accumulation-derivative'], learnerInteraction: 'adjust-construction-parameter',
            frames: [frame('accumulation-free-explanation', 'explanation'), frame('accumulation-free-observation', 'observation')],
            observationPrompt: text(
                'Napovej \\(A(2)\\) za \\(x^2\\) in šele nato pritisni Pokaži akumulacijo A. Nato zamenjaj funkcijo ter premakni \\(a\\) in \\(x\\), tudi tako, da je \\(x<a\\).',
                'Predict \\(A(2)\\) for \\(x^2\\), and only then press Show accumulation A. Then change the function and move \\(a\\) and \\(x\\), also so that \\(x<a\\).',
            ),
            expectedObservations: [text(
                'Po pritisku je pri \\(x^2\\) vrednost \\(A(2)\\approx2{,}6667\\) in naklon tangente na \\(A\\) je \\(4\\); stanje pove, da \\(A\\) narašča.',
                'After the press, for \\(x^2\\) we have \\(A(2)\\approx2.6667\\) and the slope of the tangent to \\(A\\) is \\(4\\); the status says that \\(A\\) is increasing.',
            )],
            scene: {
                id: 'accumulation-free-scene', basedOn: 'demonstration-default',
                actions: [accumulationFunction('square')],
                expectedState: text(
                    'Prikazan je \\(f(x)=x^2\\) z \\(a=0\\) in \\(x=2\\): osenčeno območje je nad osjo, akumulacija \\(A\\) je skrita.',
                    'The graph of \\(f(x)=x^2\\) is shown with \\(a=0\\) and \\(x=2\\): the shaded region is above the axis, and the accumulation \\(A\\) is hidden.',
                ),
            },
        },
    ],
    sources: [
        {
            id: 'globevnik-brojan-analiza-1-accumulation',
            citation: 'Globevnik, J., Brojan, M. Analiza I, Fakulteta za matematiko in fiziko, Univerza v Ljubljani, §§5.5–5.6 (printed pp. 175–180).',
            supports: ['the integral as a function of its upper bound', 'the derivative of the accumulation at a point of continuity of the integrand', 'the oriented definite integral and its change of sign when the bounds are exchanged'],
        },
        {
            id: 'bezeg-accumulation-implementation',
            citation: 'Bezeg source: src/analysis/accumulation.ts, src/analysis/accumulationModel.ts and src/graphs/functions/AccumulationGraph.tsx.',
            supports: ['A(0) = 0, A(pi) = 2, A(2 pi) = 0 for sin with a = 0', 'A(2) = 1 - cos 2 for sin with a = 0', 'A(0) = cos 2 - 1 for sin with a = 2', 'the tangent slope of A at x equals f(x)', 'A(2) = 8/3 for x^2 with a = 0'],
            implementationCorrespondence: 'A(x) is evaluated exactly as F(x) - F(a) from the catalogue antiderivative, so the orientation for x < a follows from the formula; the tangent slope is f(x); the shaded stretches are split at the zeros of sin; and a lesson scene applies set-function-parameter, set-function-choice and show-function-element actions through the same setters as the controls in one synchronous tick.',
        },
    ],
    edgeCases: [
        text(
            'Vrednost \\(a\\) ali \\(x\\) zunaj območja \\([-7,7]\\) aplikacija zavrne in model ostane nespremenjen; datoteka s takšno vrednostjo se ne uvozi in sporoči območje, ki ga je treba uporabiti.',
            'A value of \\(a\\) or \\(x\\) outside the range \\([-7,7]\\) is rejected by the app and the model stays unchanged; a file with such a value is not imported and the error names the range to use.',
        ),
        text(
            'Dokler je akumulacija skrita, so skriti tudi odčitki \\(A(x)\\), \\(A^{\\prime}(x)\\) in prispevkov delov, krivulja \\(A\\) in njena tangenta, da napoved ni predčasno razkrita; osenčeno območje in vrednost \\(f(x)\\) ostaneta vidna.',
            'While the accumulation is hidden, the readouts for \\(A(x)\\), \\(A^{\\prime}(x)\\) and the contributions of the parts, the curve \\(A\\) and its tangent are hidden too, so that the prediction is not given away early; the shaded region and the value \\(f(x)\\) stay visible.',
        ),
        text(
            'Pri \\(x=a\\) je osenčeno območje prazno in \\(A(x)=0\\); pri \\(x<a\\) je vrednost \\(A(x)=-\\int_x^a f(t)\\,dt\\) in stanje to pove. Odčitek nikoli ne pokaže geometrijske ploščine kot integrala.',
            'At \\(x=a\\) the shaded region is empty and \\(A(x)=0\\); for \\(x<a\\) the value is \\(A(x)=-\\int_x^a f(t)\\,dt\\) and the status says so. A readout never shows the geometric area as the integral.',
        ),
    ],
    unresolvedQuestions: [
        text(
            'Pred pregledom za uporabo v razredu je treba potrditi, ali naj lekcija pokaže tudi integrand s skokom, pri katerem zveza \\(A^{\\prime}(x)=f(x)\\) v točki skoka odpove.',
            'Before classroom-ready review, confirm whether the lesson should also show an integrand with a jump, at which the relation \\(A^{\\prime}(x)=f(x)\\) fails at the point of the jump.',
        ),
    ],
};

const darbouxExample = (value: DarbouxExampleId): SceneAction => ({
    name: 'set-function-choice', value: {name: 'darboux-example', value},
});
const lowerSum = (visible: boolean): SceneAction => ({
    name: 'show-function-element', value: {name: 'lower-sum', value: visible},
});
const upperSum = (visible: boolean): SceneAction => ({
    name: 'show-function-element', value: {name: 'upper-sum', value: visible},
});

const darboux: GuidedLesson = {
    demonstrationId: 'darboux',
    title: text('Darbouxove vsote', 'Darboux sums'),
    summary: text(
        'Razdelitev intervala \\([a,b]\\) na dele določa spodnjo vsoto \\(L\\) iz infimumov funkcije na delih in zgornjo vsoto \\(U\\) iz supremumov. Za vsako razdelitev velja \\(L\\le\\int_a^b f(x)\\,dx\\le U\\), z gostitvijo razdelitve pa se \\(L\\) ne zmanjša in \\(U\\) se ne poveča. Infimum in supremum na delu nista nujno vrednosti v krajiščih dela.',
        'A partition of the interval \\([a,b]\\) into parts defines the lower sum \\(L\\) from the infima of the function on the parts and the upper sum \\(U\\) from the suprema. For every partition \\(L\\le\\int_a^b f(x)\\,dx\\le U\\), and refining the partition does not decrease \\(L\\) and does not increase \\(U\\). The infimum and the supremum on a part are not necessarily values at the endpoints of the part.',
    ),
    prerequisites: [
        text(
            'Potrebno je razumevanje razdelitve intervala na dele, določenega integrala kot števila med spodnjimi in zgornjimi ocenami ter neenačb.',
            'Assumes an understanding of a partition of an interval into parts, of the definite integral as a number between lower and upper estimates, and of inequalities.',
        ),
        text(
            'Potrebno je poznavanje infimuma (največje spodnje meje) in supremuma (najmanjše zgornje meje) množice vrednosti funkcije.',
            'Assumes familiarity with the infimum (greatest lower bound) and the supremum (least upper bound) of a set of function values.',
        ),
    ],
    learningGoals: [
        text(
            'Pri \\(f(x)=x^2\\) na \\([0,2]\\) z \\(n=4\\) deli napoveš spodnjo in zgornjo vsoto ter preveriš \\(1{,}75\\le\\frac83\\le3{,}75\\).',
            'For \\(f(x)=x^2\\) on \\([0,2]\\) with \\(n=4\\) parts predict the lower and the upper sum, and check \\(1.75\\le\\frac83\\le3.75\\).',
        ),
        text(
            'Pri gostitvi razdelitve opaziš, da se \\(L\\) ne zmanjša, \\(U\\) ne poveča, integral pa ostane med njima.',
            'When the partition is refined, observe that \\(L\\) never decreases, \\(U\\) never increases, and the integral stays between them.',
        ),
        text(
            'Pri \\(\\sin x\\) na \\([0,\\pi]\\) pojasniš, zakaj je supremum \\(1\\) v notranji točki \\(\\frac{\\pi}{2}\\) in zakaj vrednost v levem krajišču ni zgornja meja.',
            'For \\(\\sin x\\) on \\([0,\\pi]\\) explain why the supremum is \\(1\\) at the interior point \\(\\frac{\\pi}{2}\\) and why the value at the left endpoint is not an upper bound.',
        ),
    ],
    formulaBlocks: [
        {
            id: 'darboux-sums',
            latex: 'L=\\sum_{i=1}^{n} m_i\\,\\Delta x,\\qquad U=\\sum_{i=1}^{n} M_i\\,\\Delta x,\\qquad m_i=\\inf_{[x_{i-1},\\,x_i]} f,\\quad M_i=\\sup_{[x_{i-1},\\,x_i]} f,\\quad \\Delta x=\\frac{b-a}{n}',
            notation: text(
                'Točke \\(a=x_0<x_1<\\dots<x_n=b\\) so delilne točke razdelitve na \\(n\\) enakih delov širine \\(\\Delta x\\); \\(m_i\\) je infimum in \\(M_i\\) supremum funkcije \\(f\\) na \\(i\\)-tem delu \\([x_{i-1},x_i]\\).',
                'The points \\(a=x_0<x_1<\\dots<x_n=b\\) are the dividing points of the partition into \\(n\\) equal parts of width \\(\\Delta x\\); \\(m_i\\) is the infimum and \\(M_i\\) the supremum of \\(f\\) on the \\(i\\)-th part \\([x_{i-1},x_i]\\).',
            ),
            explanation: text(
                'Spodnja vsota \\(L\\) sešteje ploščine pravokotnikov višine \\(m_i\\), zgornja vsota \\(U\\) pa pravokotnikov višine \\(M_i\\). To nista vsoti vrednosti v levih ali desnih krajiščih: infimum in supremum sta lahko tudi v notranji točki dela.',
                'The lower sum \\(L\\) adds the areas of rectangles of height \\(m_i\\), and the upper sum \\(U\\) those of height \\(M_i\\). They are not sums of values at the left or right endpoints: the infimum and the supremum can lie at an interior point of a part.',
            ),
        },
        {
            id: 'darboux-bounds',
            latex: 'L\\le\\int_a^b f(x)\\,dx\\le U,\\qquad L\\le L^{\\prime}\\le\\int_a^b f(x)\\,dx\\le U^{\\prime}\\le U',
            notation: text(
                'Števili \\(L^{\\prime}\\) in \\(U^{\\prime}\\) sta vsoti gostejše razdelitve, ki vsebuje vse delilne točke prejšnje.',
                'The numbers \\(L^{\\prime}\\) and \\(U^{\\prime}\\) are the sums of a finer partition that contains all the dividing points of the previous one.',
            ),
            explanation: text(
                'Vsak del gostejše razdelitve leži v enem delu prejšnje, zato je njegov infimum večji ali enak in njegov supremum manjši ali enak. Integral je za vsako razdelitev ujet med \\(L\\) in \\(U\\). Aplikacija ti to pokaže na primerih, ne dokaže.',
                'Every part of the finer partition lies in one part of the previous one, so its infimum is greater or equal and its supremum is less or equal. For every partition the integral is trapped between \\(L\\) and \\(U\\). The app shows this on examples; it does not prove it.',
            ),
        },
    ],
    workedExamples: [
        {
            id: 'darboux-square-example',
            title: text('Funkcija \\(f(x)=x^2\\) na \\([0,2]\\) z \\(n=4\\)', 'The function \\(f(x)=x^2\\) on \\([0,2]\\) with \\(n=4\\)'),
            calculationLatex: '\\Delta x=\\frac12,\\quad L=\\frac12\\left(0+\\frac14+1+\\frac94\\right)=\\frac74,\\quad U=\\frac12\\left(\\frac14+1+\\frac94+4\\right)=\\frac{15}{4},\\quad \\int_0^2 x^2\\,dx=\\frac83',
            resultLatex: '\\frac74\\le\\frac83\\le\\frac{15}{4}',
            check: text(
                'Funkcija \\(x^2\\) na \\([0,2]\\) narašča, zato je infimum na vsakem delu v levem krajišču in supremum v desnem; to velja za to funkcijo na tem intervalu in ne splošno. Razlika \\(U-L=2\\) je enaka \\(\\Delta x\\,\\bigl(f(2)-f(0)\\bigr)=\\frac12\\cdot4\\).',
                'The function \\(x^2\\) is increasing on \\([0,2]\\), so the infimum on every part is at the left endpoint and the supremum at the right one; this holds for this function on this interval and not in general. The gap \\(U-L=2\\) equals \\(\\Delta x\\,\\bigl(f(2)-f(0)\\bigr)=\\frac12\\cdot4\\).',
            ),
        },
        {
            id: 'darboux-sine-example',
            title: text('Funkcija \\(f(x)=\\sin x\\) na \\([0,\\pi]\\) z \\(n=1\\)', 'The function \\(f(x)=\\sin x\\) on \\([0,\\pi]\\) with \\(n=1\\)'),
            calculationLatex: 'm=\\inf_{[0,\\pi]}\\sin x=0,\\quad M=\\sup_{[0,\\pi]}\\sin x=\\sin\\frac{\\pi}{2}=1,\\quad L=0\\cdot\\pi=0,\\quad U=1\\cdot\\pi=\\pi,\\quad \\int_0^{\\pi}\\sin x\\,dx=2',
            resultLatex: '0\\le2\\le\\pi',
            check: text(
                'Supremum \\(1\\) je dosežen v notranji točki \\(\\frac{\\pi}{2}\\), kjer je \\(\\cos\\frac{\\pi}{2}=0\\), ne v krajiščih, kjer je \\(\\sin x=0\\). Vrednost v levem krajišču bi dala \\(0\\cdot\\pi=0<2\\), kar ni zgornja ocena integrala.',
                'The supremum \\(1\\) is attained at the interior point \\(\\frac{\\pi}{2}\\), where \\(\\cos\\frac{\\pi}{2}=0\\), not at the endpoints, where \\(\\sin x=0\\). The value at the left endpoint would give \\(0\\cdot\\pi=0<2\\), which is not an upper estimate of the integral.',
            ),
        },
    ],
    steps: [
        {
            id: 'darboux-prerequisites-step', order: 1,
            title: text('Razdelitev, infimum in supremum', 'The partition, the infimum and the supremum'),
            purpose: text('Pripraviti razdelitev, infimum in supremum, preden se vsoti pokažeta.', 'Preparing the partition, the infimum and the supremum before the sums are shown.'),
            explanation: text(
                'Interval \\([0,2]\\) razdelimo na \\(n=4\\) enake dele širine \\(\\Delta x=\\frac{2-0}{4}=\\frac12\\) z delilnimi točkami \\(0,\\frac12,1,\\frac32,2\\). Na vsakem delu je infimum \\(m_i\\) največja spodnja meja vrednosti funkcije \\(f(x)=x^2\\), supremum \\(M_i\\) pa najmanjša zgornja meja. Spodnja vsota je \\(L=\\sum m_i\\,\\Delta x\\), zgornja pa \\(U=\\sum M_i\\,\\Delta x\\). Obe vsoti sta zdaj skriti; vidiš le delilne točke in natančni integral.',
                'The interval \\([0,2]\\) is split into \\(n=4\\) equal parts of width \\(\\Delta x=\\frac{2-0}{4}=\\frac12\\) with the dividing points \\(0,\\frac12,1,\\frac32,2\\). On every part the infimum \\(m_i\\) is the greatest lower bound of the values of \\(f(x)=x^2\\), and the supremum \\(M_i\\) is the least upper bound. The lower sum is \\(L=\\sum m_i\\,\\Delta x\\) and the upper sum is \\(U=\\sum M_i\\,\\Delta x\\). Both sums are hidden now; you see only the dividing points and the exact integral.',
            ),
            formulaIds: ['darboux-sums'], learnerInteraction: 'observe',
            frames: [frame('darboux-prerequisites-explanation', 'explanation'), frame('darboux-prerequisites-observation', 'observation')],
            observationPrompt: text(
                'Napovej infimum in supremum na vsakem delu, nato vsoti \\(L\\) in \\(U\\) ter ali integral leži med njima; šele nato pritisni Pokaži spodnjo vsoto in Pokaži zgornjo vsoto.',
                'Predict the infimum and the supremum on each part, then the sums \\(L\\) and \\(U\\) and whether the integral lies between them; only then press Show lower sum and Show upper sum.',
            ),
            expectedObservations: [text(
                'Vidni so štirje deli širine \\(0{,}5\\), vsoti sta skriti, natančni integral pa je \\(2{,}6667\\).',
                'Four parts of width \\(0.5\\) are visible, the sums are hidden, and the exact integral is \\(2.6667\\).',
            )],
            scene: {
                id: 'darboux-prerequisites-scene', basedOn: 'demonstration-default',
                actions: [lowerSum(false), upperSum(false)],
                expectedState: text(
                    'Prikazan je \\(f(x)=x^2\\) na \\([0,2]\\) z \\(n=4\\) deli; spodnja in zgornja vsota sta skriti, integral je \\(\\frac83\\).',
                    'The graph of \\(f(x)=x^2\\) on \\([0,2]\\) is shown with \\(n=4\\) parts; the lower and the upper sum are hidden, and the integral is \\(\\frac83\\).',
                ),
            },
        },
        {
            id: 'darboux-bounds-step', order: 2,
            title: text('Integral je ujet: \\(1{,}75\\le\\frac83\\le3{,}75\\)', 'The integral is trapped: \\(1.75\\le\\frac83\\le3.75\\)'),
            purpose: text('Primerjati napoved z vsotama in videti, da integral leži med njima.', 'Comparing the prediction with the sums and seeing that the integral lies between them.'),
            explanation: text(
                'Infimumi na delih so \\(0,\\frac14,1,\\frac94\\), supremumi pa \\(\\frac14,1,\\frac94,4\\). Zato je \\(L=\\frac12\\left(0+\\frac14+1+\\frac94\\right)=\\frac74=1{,}75\\) in \\(U=\\frac12\\left(\\frac14+1+\\frac94+4\\right)\\) \\(=\\frac{15}{4}=3{,}75\\), integral pa je \\(\\int_0^2 x^2\\,dx=\\frac83\\approx2{,}6667\\). Torej \\(1{,}75\\le\\frac83\\le3{,}75\\). Polni pravokotniki so spodnja vsota, pravokotniki s črtkanim robom zgornja. Ker \\(x^2\\) na \\([0,2]\\) narašča, sta infimum in supremum v krajiščih delov; pri drugih funkcijah to ne velja (korak 5).',
                'The infima on the parts are \\(0,\\frac14,1,\\frac94\\) and the suprema are \\(\\frac14,1,\\frac94,4\\). So \\(L=\\frac12\\left(0+\\frac14+1+\\frac94\\right)=\\frac74=1.75\\) and \\(U=\\frac12\\left(\\frac14+1+\\frac94+4\\right)\\) \\(=\\frac{15}{4}=3.75\\), while the integral is \\(\\int_0^2 x^2\\,dx=\\frac83\\approx2.6667\\). Hence \\(1.75\\le\\frac83\\le3.75\\). The filled rectangles are the lower sum and the rectangles with a dashed outline are the upper sum. Because \\(x^2\\) is increasing on \\([0,2]\\), the infimum and the supremum are at the endpoints of the parts; for other functions this does not hold (step 5).',
            ),
            formulaIds: ['darboux-sums', 'darboux-bounds'], workedExampleId: 'darboux-square-example', learnerInteraction: 'observe',
            frames: [frame('darboux-bounds-explanation', 'explanation'), frame('darboux-bounds-calculation', 'calculation'), frame('darboux-bounds-observation', 'observation')],
            observationPrompt: text(
                'Primerjaj odčitka \\(L\\) in \\(U\\) z napovedjo. Preveri, da integral leži med njima, in preberi razliko \\(U-L\\).',
                'Compare the readouts \\(L\\) and \\(U\\) with your prediction. Check that the integral lies between them and read the gap \\(U-L\\).',
            ),
            expectedObservations: [text(
                'Odčitki so \\(L=1{,}75\\), \\(U=3{,}75\\), integral \\(2{,}6667\\) in razlika \\(U-L=2\\); stanje pove, da integral leži med vsotama.',
                'The readouts are \\(L=1.75\\), \\(U=3.75\\), integral \\(2.6667\\) and gap \\(U-L=2\\); the status says that the integral lies between the sums.',
            )],
            scene: {
                id: 'darboux-bounds-scene', basedOn: 'demonstration-default',
                actions: [lowerSum(true), upperSum(true)],
                expectedState: text(
                    'Pri \\(f(x)=x^2\\) na \\([0,2]\\) z \\(n=4\\) sta prikazani \\(L=1{,}75\\) in \\(U=3{,}75\\), integral je \\(\\frac83\\).',
                    'For \\(f(x)=x^2\\) on \\([0,2]\\) with \\(n=4\\), \\(L=1.75\\) and \\(U=3.75\\) are shown, and the integral is \\(\\frac83\\).',
                ),
            },
        },
        {
            id: 'darboux-refine-step', order: 3,
            title: text('Gostitev razdelitve', 'Refining the partition'),
            purpose: text('Videti, da se z gostitvijo \\(L\\) veča, \\(U\\) manjša in integral ostane med njima.', 'Seeing that refining makes \\(L\\) increase, \\(U\\) decrease, and the integral stay between them.'),
            explanation: text(
                'Gostitev razpolovi vsak del: iz \\(n=4\\) postane \\(n=8\\) in \\(\\Delta x=\\frac14\\). Nove vsote so \\(L=2{,}1875\\) in \\(U=3{,}1875\\), prej pa sta bili \\(1{,}75\\) in \\(3{,}75\\). Spodnja vsota se je povečala, zgornja zmanjšala, integral \\(2{,}6667\\) pa je še vedno med njima. Del, ki je polovica starega, ima infimum večji ali enak in supremum manjši ali enak staremu, zato se \\(L\\) ne zmanjša in \\(U\\) se ne poveča. Pri naraščajoči funkciji je razlika \\(U-L=\\Delta x\\,\\bigl(f(b)-f(a)\\bigr)\\) \\(=\\frac2n\\cdot4=\\frac8n\\), torej se pri \\(n=8\\) zmanjša na \\(1\\).',
                'Refining bisects every part: \\(n=4\\) becomes \\(n=8\\) and \\(\\Delta x=\\frac14\\). The new sums are \\(L=2.1875\\) and \\(U=3.1875\\), whereas before they were \\(1.75\\) and \\(3.75\\). The lower sum increased, the upper sum decreased, and the integral \\(2.6667\\) is still between them. A half of an old part has an infimum greater or equal and a supremum less or equal than the old one, so \\(L\\) does not decrease and \\(U\\) does not increase. For an increasing function the gap is \\(U-L=\\Delta x\\,\\bigl(f(b)-f(a)\\bigr)\\) \\(=\\frac2n\\cdot4=\\frac8n\\), so for \\(n=8\\) it shrinks to \\(1\\).',
            ),
            formulaIds: ['darboux-bounds'], learnerInteraction: 'adjust-construction-parameter',
            frames: [frame('darboux-refine-explanation', 'explanation'), frame('darboux-refine-observation', 'observation')],
            observationPrompt: text(
                'Napovej, kaj se zgodi z \\(L\\) in \\(U\\), ko še enkrat pritisneš Zgosti razdelitev (\\(n=16\\)), in nato pritiskaj gumb do omejitve; opazuj, kako se razlika \\(U-L\\) zmanjšuje.',
                'Predict what happens to \\(L\\) and \\(U\\) when you press Refine the partition once more (\\(n=16\\)), and then keep pressing the button up to the limit; watch the gap \\(U-L\\) shrink.',
            ),
            expectedObservations: [text(
                'Pri \\(n=8\\) je \\(L=2{,}1875\\), \\(U=3{,}1875\\); pri \\(n=16\\) je \\(L=2{,}4219\\), \\(U=2{,}9219\\); integral \\(2{,}6667\\) ostane med njima.',
                'At \\(n=8\\), \\(L=2.1875\\) and \\(U=3.1875\\); at \\(n=16\\), \\(L=2.4219\\) and \\(U=2.9219\\); the integral \\(2.6667\\) stays between them.',
            )],
            scene: {
                id: 'darboux-refine-scene', basedOn: 'demonstration-default',
                actions: [parameter('darboux-n', 8)],
                expectedState: text(
                    'Pri \\(f(x)=x^2\\) na \\([0,2]\\) z \\(n=8\\) sta prikazani \\(L=2{,}1875\\) in \\(U=3{,}1875\\); razlika je \\(1\\).',
                    'For \\(f(x)=x^2\\) on \\([0,2]\\) with \\(n=8\\), \\(L=2.1875\\) and \\(U=3.1875\\) are shown; the gap is \\(1\\).',
                ),
            },
        },
        {
            id: 'darboux-sine-step', order: 4,
            title: text('Supremum v notranji točki: \\(\\sin x\\) na \\([0,\\pi]\\)', 'A supremum at an interior point: \\(\\sin x\\) on \\([0,\\pi]\\)'),
            purpose: text('Napovedati supremum na delu, kjer ni v krajišču.', 'Predicting a supremum on a part where it is not at an endpoint.'),
            explanation: text(
                'Zamenjamo primer: \\(f(x)=\\sin x\\) na \\([0,\\pi]\\) z enim samim delom, \\(n=1\\). V obeh krajiščih je \\(\\sin x=0\\), vmes pa je funkcija pozitivna. Infimum je zato \\(0\\), supremum pa ni \\(0\\): funkcija zraste in se spet vrne. Največ doseže v točki, kjer je odvod \\(\\cos x\\) enak \\(0\\), to je pri \\(\\frac{\\pi}{2}\\). Vsoti sta zdaj skriti.',
                'We switch the example: \\(f(x)=\\sin x\\) on \\([0,\\pi]\\) with a single part, \\(n=1\\). At both endpoints \\(\\sin x=0\\), and in between the function is positive. So the infimum is \\(0\\), but the supremum is not \\(0\\): the function rises and comes back. It attains its maximum at a point where the derivative \\(\\cos x\\) equals \\(0\\), which is \\(\\frac{\\pi}{2}\\). The sums are hidden now.',
            ),
            formulaIds: ['darboux-sums'], learnerInteraction: 'observe',
            frames: [frame('darboux-sine-explanation', 'explanation'), frame('darboux-sine-observation', 'observation')],
            observationPrompt: text(
                'Napovej infimum in supremum na celotnem intervalu \\([0,\\pi]\\) ter vsoti \\(L\\) in \\(U\\); šele nato pritisni Pokaži spodnjo vsoto in Pokaži zgornjo vsoto.',
                'Predict the infimum and the supremum on the whole interval \\([0,\\pi]\\) and the sums \\(L\\) and \\(U\\); only then press Show lower sum and Show upper sum.',
            ),
            expectedObservations: [text(
                'Prikazan je en sam del \\([0,\\pi]\\), vsoti sta skriti, natančni integral je \\(2\\).',
                'A single part \\([0,\\pi]\\) is shown, the sums are hidden, and the exact integral is \\(2\\).',
            )],
            scene: {
                id: 'darboux-sine-scene', basedOn: 'demonstration-default',
                actions: [darbouxExample('sine'), parameter('darboux-b', Math.PI), parameter('darboux-n', 1), lowerSum(false), upperSum(false)],
                expectedState: text(
                    'Prikazan je \\(f(x)=\\sin x\\) na \\([0,\\pi]\\) z \\(n=1\\); vsoti sta skriti, integral je \\(2\\).',
                    'The graph of \\(f(x)=\\sin x\\) on \\([0,\\pi]\\) is shown with \\(n=1\\); the sums are hidden, and the integral is \\(2\\).',
                ),
            },
        },
        {
            id: 'darboux-sine-reveal-step', order: 5,
            title: text('Supremum \\(1\\) in vrednost v krajišču', 'The supremum \\(1\\) and the value at an endpoint'),
            purpose: text('Primerjati supremum z vrednostjo v krajišču in videti, zakaj vzorec ni zgornja meja.', 'Comparing the supremum with the value at an endpoint and seeing why a sample is not an upper bound.'),
            explanation: text(
                'Spodnja vsota je \\(L=0\\cdot\\pi=0\\), zgornja pa \\(U=1\\cdot\\pi=\\pi\\approx3{,}1416\\), integral je \\(\\int_0^{\\pi}\\sin x\\,dx=2\\), torej \\(0\\le2\\le\\pi\\). Supremum \\(1\\) je dosežen pri \\(\\frac{\\pi}{2}\\), v notranjosti dela. Če bi namesto supremuma vzeli vrednost v levem krajišču, \\(f(0)=0\\), bi dobili \\(0\\cdot\\pi=0\\), kar je manj od integrala \\(2\\) in zato ni zgornja ocena. Vrednost v krajišču torej ni supremum, zato aplikacija vsot ne imenuje levi ali desni vzorec. Supremum izračuna natančno iz vrednosti v krajiščih dela in točk \\(\\frac{\\pi}{2}+k\\pi\\), kjer je \\(\\cos x=0\\), brez vzorčenja.',
                'The lower sum is \\(L=0\\cdot\\pi=0\\) and the upper sum is \\(U=1\\cdot\\pi=\\pi\\approx3.1416\\), the integral is \\(\\int_0^{\\pi}\\sin x\\,dx=2\\), so \\(0\\le2\\le\\pi\\). The supremum \\(1\\) is attained at \\(\\frac{\\pi}{2}\\), in the interior of the part. If we took the value at the left endpoint, \\(f(0)=0\\), instead of the supremum, we would get \\(0\\cdot\\pi=0\\), which is less than the integral \\(2\\) and so is not an upper estimate. A value at an endpoint is therefore not the supremum, which is why the app does not call these sums left or right samples. It computes the supremum exactly from the values at the endpoints of the part and the points \\(\\frac{\\pi}{2}+k\\pi\\) where \\(\\cos x=0\\), without sampling.',
            ),
            formulaIds: ['darboux-sums', 'darboux-bounds'], workedExampleId: 'darboux-sine-example', learnerInteraction: 'observe',
            frames: [frame('darboux-sine-reveal-explanation', 'explanation'), frame('darboux-sine-reveal-calculation', 'calculation'), frame('darboux-sine-reveal-observation', 'observation')],
            observationPrompt: text(
                'Primerjaj odčitka z napovedjo. Nato pritisni Zgosti razdelitev in opazuj, kje v delih je supremum, ko so deli še vedno široki.',
                'Compare the readouts with your prediction. Then press Refine the partition and watch where the supremum lies in the parts while they are still wide.',
            ),
            expectedObservations: [text(
                'Odčitki so \\(L=0\\), \\(U=3{,}1416\\), integral \\(2\\) in razlika \\(3{,}1416\\); integral leži med vsotama.',
                'The readouts are \\(L=0\\), \\(U=3.1416\\), integral \\(2\\) and gap \\(3.1416\\); the integral lies between the sums.',
            )],
            scene: {
                id: 'darboux-sine-reveal-scene', basedOn: 'demonstration-default',
                actions: [darbouxExample('sine'), parameter('darboux-b', Math.PI), parameter('darboux-n', 1), lowerSum(true), upperSum(true)],
                expectedState: text(
                    'Pri \\(f(x)=\\sin x\\) na \\([0,\\pi]\\) z \\(n=1\\) sta prikazani \\(L=0\\) in \\(U=\\pi\\), integral je \\(2\\).',
                    'For \\(f(x)=\\sin x\\) on \\([0,\\pi]\\) with \\(n=1\\), \\(L=0\\) and \\(U=\\pi\\) are shown, and the integral is \\(2\\).',
                ),
            },
        },
        {
            id: 'darboux-free-exploration', order: 6,
            title: text('Samostojno raziskovanje', 'Free exploration'),
            purpose: text('Preiti v samostojno raziskovanje z vsotami s predznakom.', 'Handing over to free exploration with signed sums.'),
            explanation: text(
                'Pri \\(f(x)=\\sin x\\) na \\([0,2\\pi]\\) z \\(n=4\\) je \\(\\Delta x=\\frac{\\pi}{2}\\). Infimumi na delih so \\(0,0,-1,-1\\), supremumi \\(1,1,0,0\\), zato je \\(L=-\\pi\\approx-3{,}1416\\), \\(U=\\pi\\approx3{,}1416\\), integral pa \\(0\\). Vsote štejejo s predznakom: pravokotniki pod osjo prispevajo negativno. Zdaj raziskuj sam: zamenjaj primer, premakni \\(a\\) in \\(b\\), spremeni \\(n\\) in zgoščaj, dokler gumb ne postane nedostopen pri \\(n=128\\); preveri, da integral vedno leži med \\(L\\) in \\(U\\).',
                'For \\(f(x)=\\sin x\\) on \\([0,2\\pi]\\) with \\(n=4\\), \\(\\Delta x=\\frac{\\pi}{2}\\). The infima on the parts are \\(0,0,-1,-1\\) and the suprema are \\(1,1,0,0\\), so \\(L=-\\pi\\approx-3.1416\\), \\(U=\\pi\\approx3.1416\\) and the integral is \\(0\\). The sums are signed: rectangles below the axis contribute negatively. Now explore on your own: change the example, move \\(a\\) and \\(b\\), change \\(n\\) and keep refining until the button becomes unavailable at \\(n=128\\); check that the integral always lies between \\(L\\) and \\(U\\).',
            ),
            formulaIds: ['darboux-sums', 'darboux-bounds'], learnerInteraction: 'adjust-construction-parameter',
            frames: [frame('darboux-free-explanation', 'explanation'), frame('darboux-free-observation', 'observation')],
            observationPrompt: text(
                'Napovej vsoti \\(L\\) in \\(U\\) za \\(\\sin x\\) na \\([0,2\\pi]\\) z \\(n=4\\), nato pritisni Pokaži spodnjo vsoto in Pokaži zgornjo vsoto. Nato preizkusi \\(x^2\\) na drugih intervalih.',
                'Predict the sums \\(L\\) and \\(U\\) for \\(\\sin x\\) on \\([0,2\\pi]\\) with \\(n=4\\), then press Show lower sum and Show upper sum. Then try \\(x^2\\) on other intervals.',
            ),
            expectedObservations: [text(
                'Po pritisku sta \\(L=-3{,}1416\\) in \\(U=3{,}1416\\), integral je \\(0\\), razlika pa \\(6{,}2832\\).',
                'After the press \\(L=-3.1416\\) and \\(U=3.1416\\), the integral is \\(0\\) and the gap is \\(6.2832\\).',
            )],
            scene: {
                id: 'darboux-free-scene', basedOn: 'demonstration-default',
                actions: [darbouxExample('sine'), lowerSum(false), upperSum(false)],
                expectedState: text(
                    'Prikazan je \\(f(x)=\\sin x\\) na \\([0,2\\pi]\\) z \\(n=4\\); vsoti sta skriti, integral je \\(0\\).',
                    'The graph of \\(f(x)=\\sin x\\) on \\([0,2\\pi]\\) is shown with \\(n=4\\); the sums are hidden, and the integral is \\(0\\).',
                ),
            },
        },
    ],
    sources: [
        {
            id: 'globevnik-brojan-analiza-1-darboux',
            citation: 'Globevnik, J., Brojan, M. Analiza I, Fakulteta za matematiko in fiziko, Univerza v Ljubljani, §5.3 (printed pp. 161–170).',
            supports: ['lower and upper sums from the infimum and supremum of a bounded function on the parts of a partition', 'the integral lies between every lower sum and every upper sum', 'refining a partition does not decrease lower sums or increase upper sums'],
        },
        {
            id: 'bezeg-darboux-implementation',
            citation: 'Bezeg source: src/analysis/darboux.ts, src/analysis/darbouxModel.ts and src/graphs/functions/DarbouxGraph.tsx.',
            supports: ['x^2 on [0, 2] with n = 4 has L = 7/4 and U = 15/4 around the integral 8/3', 'sin x on [0, pi] with n = 1 has infimum 0, supremum 1 at pi/2, L = 0 and U = pi around the integral 2', 'sin x on [0, 2 pi] with n = 4 has L = -pi and U = pi around the integral 0'],
            implementationCorrespondence: 'The infimum and supremum of every part are the minimum and maximum of f over the endpoint values and the critical points inside the part (0 for x^2, pi/2 + k pi for sin x), listed analytically and never sampled; the exact integral is F(b) - F(a) from an antiderivative; Refine doubles n so the partition is nested; and a lesson scene applies set-function-parameter, set-function-choice and show-function-element actions through the same setters as the controls in one synchronous tick.',
        },
    ],
    edgeCases: [
        text(
            'Vrednost \\(a\\) ali \\(b\\) zunaj območja \\([-7,7]\\), krajišči z \\(a\\ge b\\) in število delov, ki ni celo število od \\(1\\) do \\(128\\), aplikacija zavrne in model ostane nespremenjen; datoteka s takšno vrednostjo se ne uvozi in pove, kaj popraviti.',
            'A value of \\(a\\) or \\(b\\) outside the range \\([-7,7]\\), endpoints with \\(a\\ge b\\), and a number of parts that is not an integer from \\(1\\) to \\(128\\) are rejected by the app and the model stays unchanged; a file with such a value is not imported and says what to correct.',
        ),
        text(
            'Pri \\(n=128\\) gostitve ni mogoče nadaljevati; gumb je nedostopen z razlago, število delov pa lahko še vedno spremeniš v polju.',
            'At \\(n=128\\) the partition cannot be refined further; the button is unavailable with an explanation, and the number of parts can still be changed in the field.',
        ),
        text(
            'Dokler je vsota skrita, so skriti tudi njen odčitek, njeni pravokotniki in razlika \\(U-L\\), da napoved ni predčasno razkrita; delilne točke in natančni integral ostanejo vidni.',
            'While a sum is hidden, its readout, its rectangles and the gap \\(U-L\\) are hidden too, so that the prediction is not given away; the dividing points and the exact integral stay visible.',
        ),
    ],
    unresolvedQuestions: [
        text(
            'Pred pregledom za uporabo v razredu je treba potrditi, ali naj lekcija pokaže tudi funkcijo, ki ni integrabilna po Riemannu, pri kateri se spodnji in zgornji integral ne ujemata.',
            'Before classroom-ready review, confirm whether the lesson should also show a function that is not Riemann integrable, for which the lower and the upper integral differ.',
        ),
    ],
};

const extremaChoice = (value: ExtremaExampleId): SceneAction => ({
    name: 'set-function-choice', value: {name: 'extrema-example', value},
});
const classification = (visible: boolean): SceneAction => ({
    name: 'show-function-element', value: {name: 'extrema-classification', value: visible},
});

const extrema: GuidedLesson = {
    demonstrationId: 'extrema',
    title: text('Lokalni in globalni ekstremi', 'Local and global extrema'),
    summary: text(
        'Na zaprtem intervalu \\([a,b]\\) so kandidati za ekstrem krajišči, stacionarne točke (\\(f^{\\prime}(x)=0\\)) in točke, kjer odvod ne obstaja. Predznak odvoda na delih med kandidati pove, ali je kandidat lokalni minimum, lokalni maksimum ali nobeno od obeh; lokalni ekstremi so glede na izbrani interval, v krajišču pa primerjamo le eno stran. Globalna ekstrema dobimo s primerjavo vrednosti vseh kandidatov, pri izenačenju so vsi izenačeni kandidati globalni.',
        'On a closed interval \\([a,b]\\) the candidates for an extremum are the endpoints, the stationary points (\\(f^{\\prime}(x)=0\\)) and the points where the derivative does not exist. The sign of the derivative on the pieces between the candidates tells whether a candidate is a local minimum, a local maximum or neither; local extrema are relative to the selected interval, and at an endpoint only one side is compared. The global extrema come from comparing the values at all candidates, and in a tie every tied candidate is global.',
    ),
    prerequisites: [
        text(
            'Potrebno je razumevanje odvoda kot naklona tangente in zveze med predznakom odvoda ter naraščanjem in padanjem funkcije.',
            'Assumes an understanding of the derivative as the slope of the tangent and of the link between the sign of the derivative and the function increasing or decreasing.',
        ),
        text(
            'Potrebno je poznavanje zaprtega intervala \\([a,b]\\) in funkcij \\(x^2\\), \\(x^3\\), \\(|x|\\) in \\(\\sin x\\) ter točk, kjer odvod ne obstaja.',
            'Assumes familiarity with a closed interval \\([a,b]\\), with the functions \\(x^2\\), \\(x^3\\), \\(|x|\\) and \\(\\sin x\\), and with points where the derivative does not exist.',
        ),
    ],
    learningGoals: [
        text(
            'Pri \\(f(x)=x^2\\) na \\([-1,2]\\) napoveš lokalne in globalne ekstreme ter pojasniš, zakaj je krajišče \\(-1\\) lokalni maksimum glede na interval, čeprav ni globalni.',
            'For \\(f(x)=x^2\\) on \\([-1,2]\\) predict the local and global extrema and explain why the endpoint \\(-1\\) is a local maximum relative to the interval although it is not global.',
        ),
        text(
            'Pri \\(x^3\\) v točki \\(0\\) in pri \\(|x|\\) v točki \\(0\\) pojasniš, da ničla odvoda še ne zagotovi ekstrema, ekstrem pa je lahko tudi tam, kjer odvod ne obstaja.',
            'For \\(x^3\\) at \\(0\\) and for \\(|x|\\) at \\(0\\) explain that a zero of the derivative does not guarantee an extremum, while an extremum can lie where the derivative does not exist.',
        ),
        text(
            'Pri \\(\\sin x\\) na \\([0,\\pi]\\) prepoznaš izenačenje: obe krajišči imata isto najmanjšo vrednost \\(0\\), zato sta obe globalna minimuma.',
            'For \\(\\sin x\\) on \\([0,\\pi]\\) recognize the tie: both endpoints have the same least value \\(0\\), so both are global minima.',
        ),
    ],
    formulaBlocks: [
        {
            id: 'extrema-candidates',
            latex: 'C=\\{a,\\,b\\}\\cup S\\cup K,\\qquad S=\\{x\\in(a,b):\\ f^{\\prime}(x)=0\\}',
            notation: text(
                'Množica \\(C\\) je množica kandidatov na intervalu \\([a,b]\\): krajišči, množica \\(S\\) stacionarnih točk in množica \\(K\\) kotov, to je točk, kjer je \\(f\\) zvezna, odvod pa ne obstaja.',
                'The set \\(C\\) is the set of candidates on the interval \\([a,b]\\): the endpoints, the set \\(S\\) of stationary points and the set \\(K\\) of corners, that is, points where \\(f\\) is continuous but the derivative does not exist.',
            ),
            explanation: text(
                'Ekstrem zvezne funkcije na zaprtem intervalu je vedno v enem od kandidatov, zato zadošča primerjati vrednosti v njih. Vsi kandidati pa niso ekstremi: to pokaže predznak odvoda na sosednjih delih.',
                'An extremum of a continuous function on a closed interval is always at one of the candidates, so it is enough to compare the values there. Not every candidate is an extremum, though: the sign of the derivative on the neighbouring pieces shows which are.',
            ),
        },
        {
            id: 'extrema-classification',
            latex: '(-,+):\\ \\min,\\qquad (+,-):\\ \\max,\\qquad (+,+),\\ (-,-):\\ \\varnothing',
            notation: text(
                'Par znakov je predznak odvoda na delu levo in na delu desno od kandidata; \\(\\min\\) pomeni lokalni minimum, \\(\\max\\) lokalni maksimum, \\(\\varnothing\\) pa da kandidat ni lokalni ekstrem. V krajišču je en sam znak: pri levem krajišču \\(a\\) znak \\(+\\) pomeni lokalni minimum in \\(-\\) lokalni maksimum, pri desnem krajišču \\(b\\) obratno.',
                'The pair of signs is the sign of the derivative on the piece to the left and on the piece to the right of the candidate; \\(\\min\\) means a local minimum, \\(\\max\\) a local maximum and \\(\\varnothing\\) that the candidate is not a local extremum. An endpoint has a single sign: at the left endpoint \\(a\\) the sign \\(+\\) means a local minimum and \\(-\\) a local maximum, at the right endpoint \\(b\\) the other way round.',
            ),
            explanation: text(
                'Lokalni ekstremi so glede na izbrani interval: za krajišče primerjamo vrednosti samo na strani, ki leži v intervalu. Točka je globalni minimum (maksimum), če je njena vrednost najmanjša (največja) med vrednostmi vseh kandidatov; če jo doseže več kandidatov, so vsi globalni.',
                'Local extrema are relative to the selected interval: for an endpoint only the values on the side that lies in the interval are compared. A point is a global minimum (maximum) if its value is the least (greatest) among the values at all candidates; if several candidates attain it, all of them are global.',
            ),
        },
    ],
    workedExamples: [
        {
            id: 'extrema-square-example',
            title: text('Funkcija \\(f(x)=x^2\\) na \\([-1,2]\\)', 'The function \\(f(x)=x^2\\) on \\([-1,2]\\)'),
            calculationLatex: 'f(-1)=1,\\quad f(0)=0,\\quad f(2)=4,\\qquad f^{\\prime}(x)=2x:\\quad (-1,0)\\mapsto -,\\quad (0,2)\\mapsto +',
            resultLatex: '\\min f=f(0)=0,\\qquad \\max f=f(2)=4',
            check: text(
                'Kandidati so \\(-1\\), \\(0\\) in \\(2\\). Krajišče \\(-1\\) ima desno od sebe padanje, zato je lokalni maksimum glede na interval, ni pa globalni, ker je \\(1<4\\). Na vsej premici \\(-1\\) ne bi bil lokalni maksimum, saj je \\(f(-1{,}1)=1{,}21>1\\).',
                'The candidates are \\(-1\\), \\(0\\) and \\(2\\). The endpoint \\(-1\\) has a decrease to its right, so it is a local maximum relative to the interval, but not global because \\(1<4\\). On the whole real line \\(-1\\) would not be a local maximum, since \\(f(-1.1)=1.21>1\\).',
            ),
        },
        {
            id: 'extrema-sine-tie-example',
            title: text('Funkcija \\(f(x)=\\sin x\\) na \\([0,\\pi]\\)', 'The function \\(f(x)=\\sin x\\) on \\([0,\\pi]\\)'),
            calculationLatex: 'f(0)=f(\\pi)=0,\\quad f\\!\\left(\\tfrac{\\pi}{2}\\right)=1,\\qquad f^{\\prime}(x)=\\cos x:\\quad \\left(0,\\tfrac{\\pi}{2}\\right)\\mapsto +,\\quad \\left(\\tfrac{\\pi}{2},\\pi\\right)\\mapsto -',
            resultLatex: '\\min f=f(0)=f(\\pi)=0,\\qquad \\max f=f\\!\\left(\\tfrac{\\pi}{2}\\right)=1',
            check: text(
                'Levo krajišče ima desno od sebe naraščanje, desno krajišče pa levo od sebe padanje, zato sta obe krajišči lokalna minimuma glede na interval. Ker imata isto vrednost \\(0\\), ki je najmanjša med vrednostmi kandidatov, sta obe globalna minimuma.',
                'The left endpoint has an increase to its right and the right endpoint has a decrease to its left, so both endpoints are local minima relative to the interval. Since they have the same value \\(0\\), which is the least among the values of the candidates, both are global minima.',
            ),
        },
    ],
    steps: [
        {
            id: 'extrema-prerequisites-step', order: 1,
            title: text('Kandidati na zaprtem intervalu', 'Candidates on a closed interval'),
            purpose: text('Pripraviti kandidate in dogovor o lokalnih ekstremih, preden se klasifikacija pokaže.', 'Preparing the candidates and the convention about local extrema before the classification is shown.'),
            explanation: text(
                'Opazujemo \\(f(x)=x^2\\) na zaprtem intervalu \\([-1,2]\\). Kandidati so krajišči \\(-1\\) in \\(2\\), stacionarna točka \\(0\\), kjer je \\(f^{\\prime}(x)=2x=0\\), in točke, kjer odvod ne obstaja; teh tu ni. Na vrhu grafa je predznak odvoda na vsakem delu med kandidati: \\(-\\) na \\((-1,0)\\) in \\(+\\) na \\((0,2)\\). Dogovor: lokalni ekstremi so glede na izbrani interval, zato v krajišču primerjamo vrednosti samo na strani, ki leži v intervalu. Klasifikacija je zdaj skrita; kandidati so označeni, a še ne razvrščeni.',
                'We look at \\(f(x)=x^2\\) on the closed interval \\([-1,2]\\). The candidates are the endpoints \\(-1\\) and \\(2\\), the stationary point \\(0\\) where \\(f^{\\prime}(x)=2x=0\\), and the points where the derivative does not exist; there are none here. At the top of the graph is the sign of the derivative on each piece between the candidates: \\(-\\) on \\((-1,0)\\) and \\(+\\) on \\((0,2)\\). The convention: local extrema are relative to the selected interval, so at an endpoint the values are compared only on the side that lies in the interval. The classification is hidden now; the candidates are marked but not yet sorted.',
            ),
            formulaIds: ['extrema-candidates'], learnerInteraction: 'observe',
            frames: [frame('extrema-prerequisites-explanation', 'explanation'), frame('extrema-prerequisites-observation', 'observation')],
            observationPrompt: text(
                'Napovej, kateri kandidati so lokalni minimumi ali maksimumi glede na interval in v katerem kandidatu sta globalna najmanjša in največja vrednost; šele nato pritisni Pokaži klasifikacijo.',
                'Predict which candidates are local minima or maxima relative to the interval and at which candidates the global least and greatest values lie; only then press Show classification.',
            ),
            expectedObservations: [text(
                'Označeni so trije kandidati, \\(-1\\), \\(0\\) in \\(2\\), zgoraj sta znaka \\(-\\) in \\(+\\), klasifikacija je skrita.',
                'Three candidates, \\(-1\\), \\(0\\) and \\(2\\), are marked, the signs \\(-\\) and \\(+\\) are at the top, and the classification is hidden.',
            )],
            scene: {
                id: 'extrema-prerequisites-scene', basedOn: 'demonstration-default',
                actions: [classification(false)],
                expectedState: text(
                    'Prikazan je \\(f(x)=x^2\\) na \\([-1,2]\\) s kandidati \\(-1\\), \\(0\\), \\(2\\); klasifikacija je skrita.',
                    'The graph of \\(f(x)=x^2\\) on \\([-1,2]\\) is shown with the candidates \\(-1\\), \\(0\\), \\(2\\); the classification is hidden.',
                ),
            },
        },
        {
            id: 'extrema-square-step', order: 2,
            title: text('Globalni maksimum v krajišču: \\(x^2\\) na \\([-1,2]\\)', 'A global maximum at an endpoint: \\(x^2\\) on \\([-1,2]\\)'),
            purpose: text('Primerjati napoved s klasifikacijo in razumeti lokalni ekstrem v krajišču.', 'Comparing the prediction with the classification and understanding a local extremum at an endpoint.'),
            explanation: text(
                'Vrednosti v kandidatih so \\(f(-1)=1\\), \\(f(0)=0\\) in \\(f(2)=4\\). Odvod je negativen na \\((-1,0)\\) in pozitiven na \\((0,2)\\), zato je \\(0\\) lokalni minimum in tudi globalni minimum z vrednostjo \\(0\\). Desno krajišče \\(2\\) ima levo od sebe naraščanje, zato je lokalni maksimum, in ker je \\(4\\) največja vrednost med kandidati, tudi globalni maksimum. Levo krajišče \\(-1\\) ima desno od sebe padanje, zato je lokalni maksimum glede na interval z vrednostjo \\(1\\), ni pa globalni, ker je \\(1<4\\). Na vsej premici \\(-1\\) ne bi bil lokalni maksimum, saj je \\(f(-1{,}1)=1{,}21>1\\); glede na interval \\([-1,2]\\) pa je.',
                'The values at the candidates are \\(f(-1)=1\\), \\(f(0)=0\\) and \\(f(2)=4\\). The derivative is negative on \\((-1,0)\\) and positive on \\((0,2)\\), so \\(0\\) is a local minimum and also the global minimum with value \\(0\\). The right endpoint \\(2\\) has an increase to its left, so it is a local maximum, and since \\(4\\) is the greatest value among the candidates, also the global maximum. The left endpoint \\(-1\\) has a decrease to its right, so it is a local maximum relative to the interval with value \\(1\\), but not global because \\(1<4\\). On the whole real line \\(-1\\) would not be a local maximum, since \\(f(-1.1)=1.21>1\\); relative to the interval \\([-1,2]\\) it is.',
            ),
            formulaIds: ['extrema-candidates', 'extrema-classification'], workedExampleId: 'extrema-square-example', learnerInteraction: 'observe',
            frames: [frame('extrema-square-explanation', 'explanation'), frame('extrema-square-calculation', 'calculation'), frame('extrema-square-observation', 'observation')],
            observationPrompt: text(
                'Primerjaj oznake z napovedjo. Preberi, kateri kandidati so globalni, in pojasni, zakaj je \\(-1\\) lokalni maksimum, čeprav ni največja vrednost.',
                'Compare the labels with your prediction. Read which candidates are global and explain why \\(-1\\) is a local maximum although it is not the greatest value.',
            ),
            expectedObservations: [text(
                'Globalni minimum je \\(0\\) pri \\(x=0\\), globalni maksimum \\(4\\) pri \\(x=2\\), krajišče \\(-1\\) pa je lokalni maksimum.',
                'The global minimum is \\(0\\) at \\(x=0\\), the global maximum is \\(4\\) at \\(x=2\\), and the endpoint \\(-1\\) is a local maximum.',
            )],
            scene: {
                id: 'extrema-square-scene', basedOn: 'demonstration-default',
                actions: [classification(true)],
                expectedState: text(
                    'Pri \\(f(x)=x^2\\) na \\([-1,2]\\) je klasifikacija prikazana: globalni minimum \\(0\\) pri \\(0\\), globalni maksimum \\(4\\) pri \\(2\\).',
                    'For \\(f(x)=x^2\\) on \\([-1,2]\\) the classification is shown: the global minimum \\(0\\) at \\(0\\), the global maximum \\(4\\) at \\(2\\).',
                ),
            },
        },
        {
            id: 'extrema-cube-step', order: 3,
            title: text('Stacionarna točka: \\(x^3\\) na \\([-1,1]\\)', 'A stationary point: \\(x^3\\) on \\([-1,1]\\)'),
            purpose: text('Napovedati, ali ničla odvoda pomeni ekstrem.', 'Predicting whether a zero of the derivative means an extremum.'),
            explanation: text(
                'Zamenjamo primer: \\(f(x)=x^3\\) na \\([-1,1]\\). Odvod \\(f^{\\prime}(x)=3x^2\\) je \\(0\\) pri \\(x=0\\), torej je \\(0\\) stacionarna točka. Na vrhu grafa preberi predznak odvoda na obeh straneh točke \\(0\\) in primerjaj vrednosti \\(f(-1)\\), \\(f(0)\\) in \\(f(1)\\). Klasifikacija je skrita.',
                'We switch the example: \\(f(x)=x^3\\) on \\([-1,1]\\). The derivative \\(f^{\\prime}(x)=3x^2\\) is \\(0\\) at \\(x=0\\), so \\(0\\) is a stationary point. At the top of the graph read the sign of the derivative on both sides of the point \\(0\\) and compare the values \\(f(-1)\\), \\(f(0)\\) and \\(f(1)\\). The classification is hidden.',
            ),
            formulaIds: ['extrema-classification'], learnerInteraction: 'observe',
            frames: [frame('extrema-cube-explanation', 'explanation'), frame('extrema-cube-observation', 'observation')],
            observationPrompt: text(
                'Napovej, ali je stacionarna točka \\(0\\) lokalni ekstrem in v katerih kandidatih sta globalna najmanjša in največja vrednost; šele nato pritisni Pokaži klasifikacijo.',
                'Predict whether the stationary point \\(0\\) is a local extremum and at which candidates the global least and greatest values lie; only then press Show classification.',
            ),
            expectedObservations: [text(
                'Po pritisku \\(0\\) ni lokalni ekstrem, ker je odvod na obeh straneh pozitiven; globalni minimum \\(-1\\) je v krajišču \\(-1\\), globalni maksimum \\(1\\) v krajišču \\(1\\).',
                'After the press \\(0\\) is not a local extremum because the derivative is positive on both sides; the global minimum \\(-1\\) is at the endpoint \\(-1\\) and the global maximum \\(1\\) at the endpoint \\(1\\).',
            )],
            scene: {
                id: 'extrema-cube-scene', basedOn: 'demonstration-default',
                actions: [extremaChoice('cube'), classification(false)],
                expectedState: text(
                    'Prikazan je \\(f(x)=x^3\\) na \\([-1,1]\\) z znakoma \\(+\\) in \\(+\\); klasifikacija je skrita.',
                    'The graph of \\(f(x)=x^3\\) on \\([-1,1]\\) is shown with the signs \\(+\\) and \\(+\\); the classification is hidden.',
                ),
            },
        },
        {
            id: 'extrema-abs-step', order: 4,
            title: text('Ostri vogal brez odvoda: \\(|x|\\) na \\([-1,1]\\)', 'A corner without a derivative: \\(|x|\\) on \\([-1,1]\\)'),
            purpose: text('Napovedati, ali je ekstrem lahko tam, kjer odvod ne obstaja, in kaj se zgodi pri izenačenju.', 'Predicting whether an extremum can lie where the derivative does not exist, and what happens in a tie.'),
            explanation: text(
                'Prejšnji primer je pokazal, da ničla odvoda še ne pomeni ekstrema: pri \\(x^3\\) je odvod na obeh straneh točke \\(0\\) pozitiven, zato \\(0\\) ni lokalni ekstrem. Zdaj \\(f(x)=|x|\\) na \\([-1,1]\\). V točki \\(0\\) je ostri vogal: odvod \\(f^{\\prime}(0)\\) ne obstaja, levo od nje je \\(f^{\\prime}=-1\\), desno pa \\(f^{\\prime}=1\\). Kandidati so še krajišči \\(-1\\) in \\(1\\). Klasifikacija je skrita.',
                'The previous example showed that a zero of the derivative does not mean an extremum: for \\(x^3\\) the derivative is positive on both sides of the point \\(0\\), so \\(0\\) is not a local extremum. Now \\(f(x)=|x|\\) on \\([-1,1]\\). At the point \\(0\\) there is a corner: the derivative \\(f^{\\prime}(0)\\) does not exist, to its left \\(f^{\\prime}=-1\\) and to its right \\(f^{\\prime}=1\\). The other candidates are the endpoints \\(-1\\) and \\(1\\). The classification is hidden.',
            ),
            formulaIds: ['extrema-candidates', 'extrema-classification'], learnerInteraction: 'observe',
            frames: [frame('extrema-abs-explanation', 'explanation'), frame('extrema-abs-observation', 'observation')],
            observationPrompt: text(
                'Napovej, ali je ostri vogal pri \\(0\\) ekstrem, čeprav odvod ne obstaja, in kateri kandidati so globalni (pazi na izenačenje); šele nato pritisni Pokaži klasifikacijo.',
                'Predict whether the corner \\(0\\) is an extremum although the derivative does not exist, and which candidates are global (watch for a tie); only then press Show classification.',
            ),
            expectedObservations: [text(
                'Po pritisku je \\(0\\) lokalni in globalni minimum z vrednostjo \\(0\\); krajišči \\(-1\\) in \\(1\\) imata obe vrednost \\(1\\), sta lokalna maksimuma in obe globalna (izenačenje).',
                'After the press \\(0\\) is a local and global minimum with value \\(0\\); the endpoints \\(-1\\) and \\(1\\) both have value \\(1\\), are local maxima and are both global (a tie).',
            )],
            scene: {
                id: 'extrema-abs-scene', basedOn: 'demonstration-default',
                actions: [extremaChoice('abs'), classification(false)],
                expectedState: text(
                    'Prikazan je \\(f(x)=|x|\\) na \\([-1,1]\\) s kotom v \\(0\\) in znakoma \\(-\\) in \\(+\\); klasifikacija je skrita.',
                    'The graph of \\(f(x)=|x|\\) on \\([-1,1]\\) is shown with a corner at \\(0\\) and the signs \\(-\\) and \\(+\\); the classification is hidden.',
                ),
            },
        },
        {
            id: 'extrema-sine-step', order: 5,
            title: text('Več kandidatov: \\(\\sin x\\) na \\([-4,4]\\)', 'Several candidates: \\(\\sin x\\) on \\([-4,4]\\)'),
            purpose: text('Napovedati ekstreme, kadar je več stacionarnih točk in vrednosti v krajiščih vplivajo na izbiro.', 'Predicting extrema when there are several stationary points and the endpoint values matter.'),
            explanation: text(
                'Pri \\(|x|\\) je ekstrem v ostrem vogalu, kjer odvod ne obstaja, in krajišči sta se izenačili. Zdaj \\(f(x)=\\sin x\\) na \\([-4,4]\\). Odvod \\(\\cos x\\) je \\(0\\) pri \\(-\\frac{\\pi}{2}\\) in \\(\\frac{\\pi}{2}\\), v krajiščih pa je \\(f(-4)\\approx0{,}7568\\) in \\(f(4)\\approx-0{,}7568\\). Pri globalnih ekstremih je treba primerjati tudi vrednosti v krajiščih. Klasifikacija je skrita.',
                'For \\(|x|\\) the extremum is at a corner where the derivative does not exist, and the endpoints tied. Now \\(f(x)=\\sin x\\) on \\([-4,4]\\). The derivative \\(\\cos x\\) is \\(0\\) at \\(-\\frac{\\pi}{2}\\) and \\(\\frac{\\pi}{2}\\), and at the endpoints \\(f(-4)\\approx0.7568\\) and \\(f(4)\\approx-0.7568\\). For the global extrema the values at the endpoints must be compared too. The classification is hidden.',
            ),
            formulaIds: ['extrema-candidates', 'extrema-classification'], learnerInteraction: 'observe',
            frames: [frame('extrema-sine-explanation', 'explanation'), frame('extrema-sine-observation', 'observation')],
            observationPrompt: text(
                'Napovej, kateri od štirih kandidatov so lokalni ekstremi glede na interval in ali je kakšno krajišče globalni ekstrem; šele nato pritisni Pokaži klasifikacijo.',
                'Predict which of the four candidates are local extrema relative to the interval and whether an endpoint is a global extremum; only then press Show classification.',
            ),
            expectedObservations: [text(
                'Po pritisku je globalni maksimum \\(1\\) pri \\(\\frac{\\pi}{2}\\) in globalni minimum \\(-1\\) pri \\(-\\frac{\\pi}{2}\\); krajišče \\(-4\\) je lokalni maksimum, krajišče \\(4\\) pa lokalni minimum, nobeno ni globalno.',
                'After the press the global maximum is \\(1\\) at \\(\\frac{\\pi}{2}\\) and the global minimum is \\(-1\\) at \\(-\\frac{\\pi}{2}\\); the endpoint \\(-4\\) is a local maximum and the endpoint \\(4\\) a local minimum, neither is global.',
            )],
            scene: {
                id: 'extrema-sine-scene', basedOn: 'demonstration-default',
                actions: [extremaChoice('sine'), classification(false)],
                expectedState: text(
                    'Prikazan je \\(f(x)=\\sin x\\) na \\([-4,4]\\) s štirimi kandidati; klasifikacija je skrita.',
                    'The graph of \\(f(x)=\\sin x\\) on \\([-4,4]\\) is shown with four candidates; the classification is hidden.',
                ),
            },
        },
        {
            id: 'extrema-tie-step', order: 6,
            title: text('Izenačenje v krajiščih: \\(\\sin x\\) na \\([0,\\pi]\\)', 'A tie at the endpoints: \\(\\sin x\\) on \\([0,\\pi]\\)'),
            purpose: text('Napovedati globalna ekstrema, kadar imata obe krajišči isto vrednost.', 'Predicting the global extrema when both endpoints have the same value.'),
            explanation: text(
                'Na \\([-4,4]\\) nobeno krajišče ni bilo globalni ekstrem. Interval zožimo na \\([0,\\pi]\\), torej \\(a=0\\) in \\(b=\\pi\\). Odvod \\(\\cos x\\) je tu \\(0\\) samo pri \\(\\frac{\\pi}{2}\\), v krajiščih pa je \\(f(0)=f(\\pi)=0\\). Klasifikacija je skrita.',
                'On \\([-4,4]\\) no endpoint was a global extremum. We narrow the interval to \\([0,\\pi]\\), that is \\(a=0\\) and \\(b=\\pi\\). The derivative \\(\\cos x\\) is \\(0\\) here only at \\(\\frac{\\pi}{2}\\), and at the endpoints \\(f(0)=f(\\pi)=0\\). The classification is hidden.',
            ),
            formulaIds: ['extrema-classification'], learnerInteraction: 'adjust-construction-parameter',
            frames: [frame('extrema-tie-explanation', 'explanation'), frame('extrema-tie-observation', 'observation')],
            observationPrompt: text(
                'Napovej, ali je krajišče lahko lokalni minimum, kateri kandidati so globalni minimumi in kateri je globalni maksimum; šele nato pritisni Pokaži klasifikacijo.',
                'Predict whether an endpoint can be a local minimum, which candidates are the global minima and which is the global maximum; only then press Show classification.',
            ),
            expectedObservations: [text(
                'Označeni so trije kandidati, \\(0\\), \\(\\frac{\\pi}{2}\\) in \\(\\pi\\), zgoraj sta znaka \\(+\\) in \\(-\\), klasifikacija je skrita.',
                'Three candidates, \\(0\\), \\(\\frac{\\pi}{2}\\) and \\(\\pi\\), are marked, the signs \\(+\\) and \\(-\\) are at the top, and the classification is hidden.',
            )],
            scene: {
                id: 'extrema-tie-scene', basedOn: 'demonstration-default',
                actions: [extremaChoice('sine'), parameter('extrema-a', 0), parameter('extrema-b', Math.PI), classification(false)],
                expectedState: text(
                    'Prikazan je \\(f(x)=\\sin x\\) na \\([0,\\pi]\\) s tremi kandidati; klasifikacija je skrita.',
                    'The graph of \\(f(x)=\\sin x\\) on \\([0,\\pi]\\) is shown with three candidates; the classification is hidden.',
                ),
            },
        },
        {
            id: 'extrema-free-exploration', order: 7,
            title: text('Izenačenje in samostojno raziskovanje', 'The tie and free exploration'),
            purpose: text('Razkriti izenačenje in preiti v samostojno raziskovanje.', 'Revealing the tie and handing over to free exploration.'),
            explanation: text(
                'Vrednosti so \\(f(0)=f(\\pi)=0\\) in \\(f\\left(\\frac{\\pi}{2}\\right)=1\\). Odvod je pozitiven na \\(\\left(0,\\frac{\\pi}{2}\\right)\\) in negativen na \\(\\left(\\frac{\\pi}{2},\\pi\\right)\\). Levo krajišče ima desno od sebe naraščanje, desno krajišče pa levo od sebe padanje, zato sta obe krajišči lokalna minimuma glede na interval. Obe imata isto najmanjšo vrednost \\(0\\), zato sta obe globalna minimuma; globalni maksimum \\(1\\) je v notranji točki \\(\\frac{\\pi}{2}\\). Zdaj raziskuj sam: zamenjaj primer, premakni \\(a\\) in \\(b\\), skrij klasifikacijo in napovej, preden jo pokažeš; poišči interval, pri katerem je krajišče globalni ekstrem, in interval, pri katerem ni.',
                'The values are \\(f(0)=f(\\pi)=0\\) and \\(f\\left(\\frac{\\pi}{2}\\right)=1\\). The derivative is positive on \\(\\left(0,\\frac{\\pi}{2}\\right)\\) and negative on \\(\\left(\\frac{\\pi}{2},\\pi\\right)\\). The left endpoint has an increase to its right and the right endpoint has a decrease to its left, so both endpoints are local minima relative to the interval. Both have the same least value \\(0\\), so both are global minima; the global maximum \\(1\\) is at the interior point \\(\\frac{\\pi}{2}\\). Now explore on your own: change the example, move \\(a\\) and \\(b\\), hide the classification and predict before you show it; find an interval where an endpoint is a global extremum and one where it is not.',
            ),
            formulaIds: ['extrema-candidates', 'extrema-classification'], workedExampleId: 'extrema-sine-tie-example', learnerInteraction: 'adjust-construction-parameter',
            frames: [frame('extrema-free-explanation', 'explanation'), frame('extrema-free-calculation', 'calculation'), frame('extrema-free-observation', 'observation')],
            observationPrompt: text(
                'Primerjaj oznake z napovedjo. Nato skrij klasifikacijo, izberi drug primer ali interval in napovej, preden jo spet pokažeš.',
                'Compare the labels with your prediction. Then hide the classification, choose another example or interval, and predict before you show it again.',
            ),
            expectedObservations: [text(
                'Krajišči \\(0\\) in \\(\\pi\\) sta lokalna in globalna minimuma z vrednostjo \\(0\\) (izenačenje), \\(\\frac{\\pi}{2}\\) je lokalni in globalni maksimum z vrednostjo \\(1\\).',
                'The endpoints \\(0\\) and \\(\\pi\\) are local and global minima with value \\(0\\) (a tie), and \\(\\frac{\\pi}{2}\\) is a local and global maximum with value \\(1\\).',
            )],
            scene: {
                id: 'extrema-free-scene', basedOn: 'demonstration-default',
                actions: [extremaChoice('sine'), parameter('extrema-a', 0), parameter('extrema-b', Math.PI), classification(true)],
                expectedState: text(
                    'Pri \\(f(x)=\\sin x\\) na \\([0,\\pi]\\) je klasifikacija prikazana: globalni minimum \\(0\\) v obeh krajiščih, globalni maksimum \\(1\\) pri \\(\\frac{\\pi}{2}\\).',
                    'For \\(f(x)=\\sin x\\) on \\([0,\\pi]\\) the classification is shown: the global minimum \\(0\\) at both endpoints, the global maximum \\(1\\) at \\(\\frac{\\pi}{2}\\).',
                ),
            },
        },
    ],
    sources: [
        {
            id: 'globevnik-brojan-analiza-1-extrema',
            citation: 'Globevnik, J., Brojan, M. Analiza I, Fakulteta za matematiko in fiziko, Univerza v Ljubljani, chapter on the applications of the derivative (local extrema).',
            supports: ['a stationary point has derivative zero and is not necessarily a local extremum', 'the sign of the derivative on the two sides of a point decides whether it is a local minimum, a local maximum or neither', 'the extrema of a continuous function on a closed interval are attained at the endpoints, at stationary points or at points where the derivative does not exist'],
        },
        {
            id: 'bezeg-extrema-implementation',
            citation: 'Bezeg source: src/analysis/extrema.ts, src/analysis/extremaModel.ts and src/graphs/functions/ExtremaGraph.tsx.',
            supports: ['x^2 on [-1, 2] has global minimum 0 at 0, global maximum 4 at 2 and the local maximum 1 at -1 relative to the interval', 'x^3 on [-1, 1] has the stationary point 0, which is not a local extremum', '|x| on [-1, 1] has the corner 0 as global minimum and the tied endpoints -1 and 1 as global maxima', 'sin x on [0, pi] has the endpoints 0 and pi tied as global minima with value 0 and the global maximum 1 at pi/2'],
            implementationCorrespondence: 'The candidates are the endpoints, the stationary points and the corners, listed analytically (cos x = 0 at pi/2 + k pi) and never sampled; the derivative sign on each piece is the analytic derivative at an interior point of the piece; a local extremum is classified relative to the selected interval with one-sided neighbourhoods at the endpoints; the global extrema compare the values at all candidates with a tolerance far below the display precision, so tied candidates are all global; and a lesson scene applies set-function-parameter, set-function-choice and show-function-element actions through the same setters as the controls in one synchronous tick.',
        },
    ],
    edgeCases: [
        text(
            'Vrednost \\(a\\) ali \\(b\\) zunaj območja \\([-4,4]\\) in krajišči z \\(a\\ge b\\) aplikacija zavrne in model ostane nespremenjen; datoteka s takšno vrednostjo se ne uvozi in pove, kaj popraviti.',
            'A value of \\(a\\) or \\(b\\) outside the range \\([-4,4]\\) and endpoints with \\(a\\ge b\\) are rejected by the app and the model stays unchanged; a file with such a value is not imported and says what to correct.',
        ),
        text(
            'Če je krajišče hkrati stacionarna točka ali ostri vogal (na primer \\(a=0\\) pri \\(x^2\\)), ostane eno samo krajišče in se ne podvoji; njegova klasifikacija upošteva samo stran znotraj intervala.',
            'If an endpoint is also a stationary point or a corner (for example \\(a=0\\) for \\(x^2\\)), it stays a single endpoint and is not duplicated; its classification uses only the side inside the interval.',
        ),
        text(
            'Dokler je klasifikacija skrita, so skrite tudi globalne ekstremne vrednosti in njihove črte, da napoved ni predčasno razkrita; kandidati in predznaki odvoda ostanejo vidni.',
            'While the classification is hidden, the global extreme values and their lines are hidden too, so that the prediction is not given away; the candidates and the derivative signs stay visible.',
        ),
    ],
    unresolvedQuestions: [
        text(
            'Pred pregledom za uporabo v razredu je treba potrditi natančen razdelek v viru in ali naj lekcija po lekciji o konveksnosti doda še preizkus z drugim odvodom.',
            'Before classroom-ready review, confirm the exact section in the source and whether the lesson should add the second-derivative test once the convexity lesson exists.',
        ),
    ],
};

const convexityChoice = (value: ConvexityExampleId): SceneAction => ({
    name: 'set-function-choice', value: {name: 'convexity-example', value},
});
const secondDerivative = (visible: boolean): SceneAction => ({
    name: 'show-function-element', value: {name: 'second-derivative', value: visible},
});

const convexity: GuidedLesson = {
    demonstrationId: 'convexity',
    title: text('Konveksnost in konkavnost', 'Convexity and concavity'),
    summary: text(
        'Funkcija je konveksna na intervalu, če graf na vsakem podintervalu leži na tetivi ali pod njo, in konkavna, če leži na tetivi ali nad njo. Če je drugi odvod \\(f^{\\prime\\prime}\\) na \\([a,b]\\) nenegativen, je funkcija tam konveksna in graf leži tudi na vsaki tangenti s točko dotika v \\([a,b]\\) ali nad njo; če je nepozitiven, sta obe neenakosti obrnjeni. Če \\(f^{\\prime\\prime}\\) na intervalu spremeni predznak, o tetivi in tangenti ne trdimo ničesar, točka spremembe predznaka pa je prevojna točka. Ničla drugega odvoda sama še ni prevoj: \\(x^4\\) ima \\(f^{\\prime\\prime}(0)=0\\), a \\(f^{\\prime\\prime}\\) ostane nenegativen.',
        'A function is convex on an interval if on every subinterval the graph lies on or below the chord, and concave if it lies on or above the chord. If the second derivative \\(f^{\\prime\\prime}\\) is nonnegative on \\([a,b]\\), the function is convex there and the graph also lies on or above every tangent whose point of tangency is in \\([a,b]\\); if it is nonpositive, both inequalities are reversed. If \\(f^{\\prime\\prime}\\) changes sign on the interval, nothing is claimed about the chord or the tangent, and a point where the sign changes is an inflection point. A zero of the second derivative alone is not an inflection: \\(x^4\\) has \\(f^{\\prime\\prime}(0)=0\\), yet \\(f^{\\prime\\prime}\\) stays nonnegative.',
    ),
    prerequisites: [
        text(
            'Potrebno je razumevanje odvoda kot naklona tangente in tetive (sekante) kot premice skozi dve točki grafa; drugi odvod \\(f^{\\prime\\prime}\\) je odvod odvoda \\(f^{\\prime}\\).',
            'Assumes an understanding of the derivative as the slope of the tangent and of a chord (secant) as the line through two points of the graph; the second derivative \\(f^{\\prime\\prime}\\) is the derivative of the derivative \\(f^{\\prime}\\).',
        ),
        text(
            'Potrebno je poznavanje funkcij \\(x^2\\), \\(x^3\\) in \\(x^4\\), njihovih odvodov ter razcepa kvadratnih izrazov in neenačb s produktom.',
            'Assumes familiarity with the functions \\(x^2\\), \\(x^3\\) and \\(x^4\\), their derivatives, and with factoring quadratic expressions and product inequalities.',
        ),
    ],
    learningGoals: [
        text(
            'Pri \\(f(x)=x^2\\) na \\([-1;1{,}5]\\) napoveš, da graf leži na tetivi ali pod njo in na tangenti ali nad njo, ter to utemeljiš z \\(f^{\\prime\\prime}=2\\ge0\\).',
            'For \\(f(x)=x^2\\) on \\([-1,1.5]\\) predict that the graph lies on or below the chord and on or above the tangent, and justify it with \\(f^{\\prime\\prime}=2\\ge0\\).',
        ),
        text(
            'Pri \\(x^3\\) prepoznaš, da \\(f^{\\prime\\prime}=6x\\) v \\(0\\) spremeni predznak: na intervalu z \\(0\\) v notranjosti ni trditve, na \\([0,2]\\) je funkcija konveksna, na \\([-2,0]\\) pa konkavna.',
            'For \\(x^3\\) recognize that \\(f^{\\prime\\prime}=6x\\) changes sign at \\(0\\): on an interval with \\(0\\) in its interior there is no claim, on \\([0,2]\\) the function is convex and on \\([-2,0]\\) concave.',
        ),
        text(
            'Pri \\(x^4\\) pojasniš, da \\(f^{\\prime\\prime}(0)=0\\) še ne pomeni prevoja, ker \\(f^{\\prime\\prime}=12x^2\\) ne spremeni predznaka.',
            'For \\(x^4\\) explain that \\(f^{\\prime\\prime}(0)=0\\) does not mean an inflection, because \\(f^{\\prime\\prime}=12x^2\\) does not change sign.',
        ),
    ],
    formulaBlocks: [
        {
            id: 'convexity-chord',
            latex: 'f(x)\\le f(a)+\\frac{f(b)-f(a)}{b-a}\\,(x-a),\\qquad x\\in[a,b]',
            notation: text(
                'Desna stran je tetiva grafa med točkama \\((a,f(a))\\) in \\((b,f(b))\\); neenakost pove, da graf na \\([a,b]\\) leži na tetivi ali pod njo.',
                'The right-hand side is the chord of the graph between the points \\((a,f(a))\\) and \\((b,f(b))\\); the inequality says that on \\([a,b]\\) the graph lies on or below the chord.',
            ),
            explanation: text(
                'Funkcija je konveksna na intervalu, če ta neenakost velja za vsak podinterval \\([a,b]\\); konkavna je, če za vsak podinterval velja obratna neenakost.',
                'A function is convex on an interval if this inequality holds for every subinterval \\([a,b]\\); it is concave if the reverse inequality holds for every subinterval.',
            ),
        },
        {
            id: 'convexity-tangent',
            latex: 'f(x)\\ge f(t)+f^{\\prime}(t)\\,(x-t),\\qquad x,\\,t\\in[a,b]',
            notation: text(
                'Desna stran je tangenta na graf v točki \\((t,f(t))\\); neenakost pove, da graf na \\([a,b]\\) leži na tangenti ali nad njo.',
                'The right-hand side is the tangent to the graph at the point \\((t,f(t))\\); the inequality says that on \\([a,b]\\) the graph lies on or above the tangent.',
            ),
            explanation: text(
                'To velja za konveksno funkcijo in točko dotika \\(t\\) znotraj \\([a,b]\\); za konkavno funkcijo je neenakost obrnjena. Za \\(t\\) zunaj \\([a,b]\\) hipoteza ne zadošča in aplikacija ne trdi ničesar.',
                'This holds for a convex function and a point of tangency \\(t\\) inside \\([a,b]\\); for a concave function the inequality is reversed. For \\(t\\) outside \\([a,b]\\) the hypothesis is not enough and the app claims nothing.',
            ),
        },
        {
            id: 'convexity-second-derivative',
            latex: 'f^{\\prime\\prime}\\ge0\\ \\text{on}\\ [a,b]\\ \\Rightarrow\\ f\\ \\text{convex},\\qquad f^{\\prime\\prime}\\le0\\ \\text{on}\\ [a,b]\\ \\Rightarrow\\ f\\ \\text{concave}',
            notation: text(
                'Za dvakrat odvedljivo funkcijo \\(f\\) predznak drugega odvoda \\(f^{\\prime\\prime}\\) na \\([a,b]\\) pove, ali je \\(f\\) tam konveksna ali konkavna.',
                'For a twice differentiable function \\(f\\), the sign of the second derivative \\(f^{\\prime\\prime}\\) on \\([a,b]\\) tells whether \\(f\\) is convex or concave there.',
            ),
            explanation: text(
                'Če \\(f^{\\prime\\prime}\\) na \\([a,b]\\) spremeni predznak, ne velja nobena od obeh implikacij in o tetivi ter tangenti ne trdimo ničesar.',
                'If \\(f^{\\prime\\prime}\\) changes sign on \\([a,b]\\), neither implication applies and nothing is claimed about the chord or the tangent.',
            ),
        },
        {
            id: 'convexity-inflection',
            latex: 'f^{\\prime\\prime}\\ \\text{changes sign at}\\ c\\ \\Rightarrow\\ c\\ \\text{is an inflection point},\\qquad f^{\\prime\\prime}(c)=0\\ \\not\\Rightarrow\\ \\text{inflection}',
            notation: text(
                'Točka \\(c\\) je prevojna, kadar se v njej predznak drugega odvoda \\(f^{\\prime\\prime}\\) spremeni; \\(f^{\\prime\\prime}(c)=0\\) tega ne zagotovi.',
                'A point \\(c\\) is an inflection point when the sign of the second derivative \\(f^{\\prime\\prime}\\) changes there; \\(f^{\\prime\\prime}(c)=0\\) does not guarantee it.',
            ),
            explanation: text(
                'Pri \\(x^3\\) je \\(f^{\\prime\\prime}=6x\\) levo od \\(0\\) negativen in desno pozitiven, zato je \\(0\\) prevojna točka. Pri \\(x^4\\) je \\(f^{\\prime\\prime}=12x^2\\) v \\(0\\) enak \\(0\\), a povsod nenegativen, zato prevoja ni.',
                'For \\(x^3\\) the value \\(f^{\\prime\\prime}=6x\\) is negative to the left of \\(0\\) and positive to the right, so \\(0\\) is an inflection point. For \\(x^4\\) the value \\(f^{\\prime\\prime}=12x^2\\) equals \\(0\\) at \\(0\\) but is nonnegative everywhere, so there is no inflection.',
            ),
        },
    ],
    workedExamples: [
        {
            id: 'convexity-chord-example',
            title: text('Tetiva funkcije \\(f(x)=x^2\\) na \\([-1;1{,}5]\\)', 'The chord of \\(f(x)=x^2\\) on \\([-1,1.5]\\)'),
            calculationLatex: 'f(-1)=1,\\quad f\\!\\left(\\tfrac32\\right)=\\tfrac94,\\qquad m=\\frac{\\tfrac94-1}{\\tfrac52}=\\tfrac12,\\qquad y=\\tfrac12x+\\tfrac32',
            resultLatex: 'f(x)-\\left(\\tfrac12x+\\tfrac32\\right)=(x+1)\\left(x-\\tfrac32\\right)\\le0\\ \\text{on}\\ \\left[-1,\\tfrac32\\right],\\qquad f^{\\prime\\prime}=2\\ge0',
            check: text(
                'Produkt \\((x+1)(x-1{,}5)\\) je nepozitiven med ničlama \\(-1\\) in \\(1{,}5\\), torej graf leži na tetivi ali pod njo. Ujemanje z \\(f^{\\prime\\prime}=2\\ge0\\) ni naključje: tako izreka drugega odvoda in tetive pravita.',
                'The product \\((x+1)(x-1.5)\\) is nonpositive between its zeros \\(-1\\) and \\(1.5\\), so the graph lies on or below the chord. The agreement with \\(f^{\\prime\\prime}=2\\ge0\\) is no accident: it is what the criterion with the second derivative says.',
            ),
        },
        {
            id: 'convexity-tangent-example',
            title: text('Tangenta funkcije \\(f(x)=x^2\\) v točki \\(t=0{,}5\\)', 'The tangent of \\(f(x)=x^2\\) at \\(t=0.5\\)'),
            calculationLatex: 'f\\!\\left(\\tfrac12\\right)=\\tfrac14,\\quad f^{\\prime}\\!\\left(\\tfrac12\\right)=1,\\qquad y=\\tfrac14+1\\cdot\\left(x-\\tfrac12\\right)=x-\\tfrac14',
            resultLatex: 'f(x)-\\left(x-\\tfrac14\\right)=\\left(x-\\tfrac12\\right)^2\\ge0',
            check: text(
                'Kvadrat ni nikoli negativen, zato graf leži na tangenti ali nad njo, enakost je le v točki dotika \\(x=0{,}5\\). Za konkavno funkcijo \\(-x^2\\) je razlika \\(-\\left(x-0{,}5\\right)^2\\le0\\).',
                'A square is never negative, so the graph lies on or above the tangent, with equality only at the point of tangency \\(x=0.5\\). For the concave function \\(-x^2\\) the difference is \\(-\\left(x-0.5\\right)^2\\le0\\).',
            ),
        },
        {
            id: 'convexity-quartic-example',
            title: text('Funkcija \\(f(x)=x^4\\) na \\([-1,1]\\)', 'The function \\(f(x)=x^4\\) on \\([-1,1]\\)'),
            calculationLatex: 'f^{\\prime\\prime}(x)=12x^2,\\quad f^{\\prime\\prime}(0)=0,\\qquad f(x)-1=(x^2-1)(x^2+1)\\le0\\ \\text{on}\\ [-1,1]',
            resultLatex: 'f^{\\prime\\prime}\\ge0\\ \\text{on}\\ [-1,1]\\ \\Rightarrow\\ f\\ \\text{convex, no inflection at}\\ 0',
            check: text(
                'Tetiva med \\(-1\\) in \\(1\\) je premica \\(y=1\\), graf \\(x^4\\le1\\) pa leži pod njo. Drugi odvod \\(12x^2\\) je v \\(0\\) enak \\(0\\), vendar je povsod nenegativen, zato se predznak ne spremeni in prevoja ni.',
                'The chord between \\(-1\\) and \\(1\\) is the line \\(y=1\\), and the graph \\(x^4\\le1\\) lies below it. The second derivative \\(12x^2\\) equals \\(0\\) at \\(0\\) but is nonnegative everywhere, so the sign does not change and there is no inflection.',
            ),
        },
    ],
    steps: [
        {
            id: 'convexity-prerequisites-step', order: 1,
            title: text('Tetiva, tangenta in drugi odvod', 'Chord, tangent and the second derivative'),
            purpose: text('Pripraviti pojme in napoved, preden se drugi odvod pokaže.', 'Preparing the terms and a prediction before the second derivative is shown.'),
            explanation: text(
                'Funkcija je konveksna na intervalu, če graf na njem med poljubnima dvema svojima točkama nikjer ne leži nad tetivo, ki ju povezuje, in konkavna, če nikjer ne leži pod njo. Drugi odvod \\(f^{\\prime\\prime}\\) je odvod odvoda \\(f^{\\prime}\\): pove, kako se spreminja naklon tangente. Opazujemo \\(f(x)=x^2\\) na \\([-1;1{,}5]\\). Modra polna črta je tetiva med točkama grafa nad \\(a=-1\\) in \\(b=1{,}5\\), oranžna črtkana črta pa tangenta v točki \\(t=0{,}5\\). Drugi odvod je skrit, zato sklepa še ni.',
                'A function is convex on an interval if on it the graph never lies above a chord joining two of its points, between those two points, and concave if the graph never lies below a chord. The second derivative \\(f^{\\prime\\prime}\\) is the derivative of the derivative \\(f^{\\prime}\\): it tells how the slope of the tangent changes. We look at \\(f(x)=x^2\\) on \\([-1,1.5]\\). The blue solid line is the chord between the points of the graph above \\(a=-1\\) and \\(b=1.5\\), and the orange dashed line is the tangent at \\(t=0.5\\). The second derivative is hidden, so there is no verdict yet.',
            ),
            formulaIds: ['convexity-chord'], learnerInteraction: 'observe',
            frames: [frame('convexity-prerequisites-explanation', 'explanation'), frame('convexity-prerequisites-observation', 'observation')],
            observationPrompt: text(
                'Napovej, ali graf na \\([a,b]\\) leži pod ali nad tetivo in nad ali pod tangento; šele nato pritisni Pokaži drugi odvod.',
                'Predict whether the graph on \\([a,b]\\) lies below or above the chord and above or below the tangent; only then press Show second derivative.',
            ),
            expectedObservations: [text(
                'Narisani sta tetiva in tangenta, drugi odvod in sklep pa sta skrita.',
                'The chord and the tangent are drawn; the second derivative and the verdict are hidden.',
            )],
            scene: {
                id: 'convexity-prerequisites-scene', basedOn: 'demonstration-default',
                actions: [secondDerivative(false)],
                expectedState: text(
                    'Prikazan je \\(f(x)=x^2\\) na \\([-1;1{,}5]\\) s tetivo in tangento v \\(t=0{,}5\\); drugi odvod je skrit.',
                    'The graph of \\(f(x)=x^2\\) on \\([-1,1.5]\\) is shown with the chord and the tangent at \\(t=0.5\\); the second derivative is hidden.',
                ),
            },
        },
        {
            id: 'convexity-chord-step', order: 2,
            title: text('Tetiva: \\(x^2\\) je konveksna', 'The chord: \\(x^2\\) is convex'),
            purpose: text('Primerjati napoved z neenakostjo in jo povezati z drugim odvodom.', 'Comparing the prediction with the inequality and linking it to the second derivative.'),
            explanation: text(
                'Tetiva poteka skozi točki \\((-1,1)\\) in \\((1{,}5;\\,2{,}25)\\), zato ima naklon \\(\\frac{2{,}25-1}{2{,}5}=0{,}5\\) in enačbo \\(y=0{,}5x+1{,}5\\). Razlika \\(f(x)-(0{,}5x+1{,}5)\\) je enaka \\(x^2-0{,}5x-1{,}5\\), kar je \\((x+1)(x-1{,}5)\\), in je na \\([-1;1{,}5]\\) nepozitivna, zato graf leži na tetivi ali pod njo. To se ujema z drugim odvodom: \\(f^{\\prime\\prime}(x)=2\\ge0\\), zato je \\(x^2\\) konveksna. Aplikacija sklep izpelje iz predznaka \\(f^{\\prime\\prime}\\) na \\([a,b]\\), ne iz vzorčenja grafa.',
                'The chord passes through the points \\((-1,1)\\) and \\((1.5,\\,2.25)\\), so its slope is \\(\\frac{2.25-1}{2.5}=0.5\\) and its equation is \\(y=0.5x+1.5\\). The difference \\(f(x)-(0.5x+1.5)\\) equals \\(x^2-0.5x-1.5\\), which is \\((x+1)(x-1.5)\\), and it is nonpositive on \\([-1,1.5]\\), so the graph lies on or below the chord. This agrees with the second derivative: \\(f^{\\prime\\prime}(x)=2\\ge0\\), so \\(x^2\\) is convex. The app derives the verdict from the sign of \\(f^{\\prime\\prime}\\) on \\([a,b]\\), not by sampling the graph.',
            ),
            formulaIds: ['convexity-chord', 'convexity-second-derivative'], workedExampleId: 'convexity-chord-example', learnerInteraction: 'observe',
            frames: [frame('convexity-chord-explanation', 'explanation'), frame('convexity-chord-calculation', 'calculation'), frame('convexity-chord-observation', 'observation')],
            observationPrompt: text(
                'Primerjaj sklep z napovedjo: preberi znak \\(f^{\\prime\\prime}\\) na vrhu grafa in vrstico o legi grafa pod podnapisom.',
                'Compare the verdict with your prediction: read the sign of \\(f^{\\prime\\prime}\\) at the top of the graph and the line about the position of the graph in the caption.',
            ),
            expectedObservations: [text(
                'Zgoraj je znak \\(+\\), sklep je »konveksna na \\([a,b]\\)«: graf leži na tetivi ali pod njo in na tangenti ali nad njo.',
                'The sign \\(+\\) is at the top and the verdict is "convex on \\([a,b]\\)": the graph lies on or below the chord and on or above the tangent.',
            )],
            scene: {
                id: 'convexity-chord-scene', basedOn: 'demonstration-default',
                actions: [secondDerivative(true)],
                expectedState: text(
                    'Pri \\(f(x)=x^2\\) na \\([-1;1{,}5]\\) je drugi odvod prikazan: znak \\(+\\), sklep »konveksna«.',
                    'For \\(f(x)=x^2\\) on \\([-1,1.5]\\) the second derivative is shown: the sign \\(+\\) and the verdict "convex".',
                ),
            },
        },
        {
            id: 'convexity-tangent-step', order: 3,
            title: text('Tangenta in točka zunaj intervala', 'The tangent and a point outside the interval'),
            purpose: text('Primerjati graf s tangento in videti, kdaj trditve ne smemo izreči.', 'Comparing the graph with the tangent and seeing when the claim must not be made.'),
            explanation: text(
                'Tangenta v \\(t=0{,}5\\) ima naklon \\(f^{\\prime}(0{,}5)=1\\) in enačbo \\(y=x-0{,}25\\). Razlika \\(f(x)-(x-0{,}25)\\) je enaka \\(x^2-x+0{,}25\\), kar je \\((x-0{,}5)^2\\), in nikjer ni negativna, zato graf leži na tangenti ali nad njo. Pri konveksni funkciji to velja za vsako tangento s točko dotika v \\([a,b]\\). Zdaj premakni \\(t\\) desno od \\(b\\), na primer v \\(1{,}8\\): aplikacija o tangenti ne trdi več ničesar, ker \\(t\\) ni v \\([a,b]\\), čeprav je za \\(x^2\\) razlika \\((x-1{,}8)^2\\) še vedno nenegativna. Trditev smemo izreči le tam, kjer hipoteza to dovoljuje.',
                'The tangent at \\(t=0.5\\) has slope \\(f^{\\prime}(0.5)=1\\) and equation \\(y=x-0.25\\). The difference \\(f(x)-(x-0.25)\\) equals \\(x^2-x+0.25\\), which is \\((x-0.5)^2\\), and it is never negative, so the graph lies on or above the tangent. For a convex function this holds for every tangent whose point of tangency is in \\([a,b]\\). Now move \\(t\\) to the right of \\(b\\), for example to \\(1.8\\): the app no longer claims anything about the tangent, because \\(t\\) is not in \\([a,b]\\), although for \\(x^2\\) the difference \\((x-1.8)^2\\) is still nonnegative. A claim may be made only where the hypothesis allows it.',
            ),
            formulaIds: ['convexity-tangent'], workedExampleId: 'convexity-tangent-example', learnerInteraction: 'adjust-construction-parameter',
            frames: [frame('convexity-tangent-explanation', 'explanation'), frame('convexity-tangent-calculation', 'calculation'), frame('convexity-tangent-observation', 'observation')],
            observationPrompt: text(
                'Premakni \\(t\\) iz \\([a,b]\\) ven in preberi, kaj se zgodi z vrstico o tangenti v odčitkih; nato \\(t\\) vrni v \\([a,b]\\).',
                'Move \\(t\\) out of \\([a,b]\\) and read what happens to the tangent line in the readouts; then bring \\(t\\) back into \\([a,b]\\).',
            ),
            expectedObservations: [text(
                'Za \\(t\\) v \\([a,b]\\) piše, da graf leži na tangenti ali nad njo; za \\(t=1{,}8\\) piše »brez trditve: \\(t\\) je zunaj \\([a,b]\\)« in zapisano je, da za tangento ni trditve.',
                'For \\(t\\) in \\([a,b]\\) the readout says the graph lies on or above the tangent; for \\(t=1.8\\) it says "no claim: \\(t\\) lies outside \\([a,b]\\)" and states that nothing is claimed about the tangent.',
            )],
            scene: {
                id: 'convexity-tangent-scene', basedOn: 'demonstration-default',
                actions: [secondDerivative(true)],
                expectedState: text(
                    'Pri \\(f(x)=x^2\\) na \\([-1;1{,}5]\\) in \\(t=0{,}5\\) je drugi odvod prikazan; tangenta je \\(y=x-0{,}25\\).',
                    'For \\(f(x)=x^2\\) on \\([-1,1.5]\\) and \\(t=0.5\\) the second derivative is shown; the tangent is \\(y=x-0.25\\).',
                ),
            },
        },
        {
            id: 'convexity-negative-step', order: 4,
            title: text('Obrnjeni neenakosti: \\(-x^2\\)', 'Both inequalities reversed: \\(-x^2\\)'),
            purpose: text('Napovedati, kaj se zgodi z obema primerjavama, ko je funkcija konkavna.', 'Predicting what happens to both comparisons when the function is concave.'),
            explanation: text(
                'Zamenjamo primer: \\(f(x)=-x^2\\) na istem intervalu \\([-1;1{,}5]\\). Graf je zrcalna slika prejšnjega čez os \\(x\\), zato se lahko obrneta obe primerjavi. Odvod je \\(f^{\\prime}(x)=-2x\\), drugi odvod pa je tu konstanta. Drugi odvod je skrit.',
                'We switch the example: \\(f(x)=-x^2\\) on the same interval \\([-1,1.5]\\). Its graph is the mirror image of the previous one in the \\(x\\)-axis, so both comparisons may reverse. The derivative is \\(f^{\\prime}(x)=-2x\\), and the second derivative is a constant here. The second derivative is hidden.',
            ),
            formulaIds: ['convexity-second-derivative'], learnerInteraction: 'observe',
            frames: [frame('convexity-negative-explanation', 'explanation'), frame('convexity-negative-observation', 'observation')],
            observationPrompt: text(
                'Napovej, ali graf zdaj leži nad ali pod tetivo, nad ali pod tangento in kakšen je predznak \\(f^{\\prime\\prime}\\); šele nato pritisni Pokaži drugi odvod.',
                'Predict whether the graph now lies above or below the chord, above or below the tangent, and what the sign of \\(f^{\\prime\\prime}\\) is; only then press Show second derivative.',
            ),
            expectedObservations: [text(
                'Po pritisku je zgoraj znak \\(-\\), sklep je »konkavna na \\([a,b]\\)«: graf leži na tetivi ali nad njo in na tangenti ali pod njo.',
                'After the press the sign \\(-\\) is at the top and the verdict is "concave on \\([a,b]\\)": the graph lies on or above the chord and on or below the tangent.',
            )],
            scene: {
                id: 'convexity-negative-scene', basedOn: 'demonstration-default',
                actions: [convexityChoice('negSquare'), secondDerivative(false)],
                expectedState: text(
                    'Prikazan je \\(f(x)=-x^2\\) na \\([-1;1{,}5]\\) s tetivo in tangento; drugi odvod je skrit.',
                    'The graph of \\(f(x)=-x^2\\) on \\([-1,1.5]\\) is shown with the chord and the tangent; the second derivative is hidden.',
                ),
            },
        },
        {
            id: 'convexity-cube-step', order: 5,
            title: text('Sprememba predznaka: \\(x^3\\)', 'A sign change: \\(x^3\\)'),
            purpose: text('Napovedati, kdaj trditve o tetivi ni, in najti interval, kjer jo je mogoče izreči.', 'Predicting when no claim about the chord exists and finding an interval where one can be made.'),
            explanation: text(
                'Pri \\(-x^2\\) je \\(f^{\\prime\\prime}=-2\\le0\\), zato je funkcija konkavna: tetiva je \\(y=-0{,}5x-1{,}5\\), razlika \\(f(x)-(-0{,}5x-1{,}5)\\) je enaka \\(-(x+1)(x-1{,}5)\\) in je nenegativna, razlika s tangento \\(y=-x+0{,}25\\) pa je \\(-(x-0{,}5)^2\\le0\\). Zdaj \\(f(x)=x^3\\) na \\([-1;1{,}5]\\): drugi odvod \\(f^{\\prime\\prime}(x)=6x\\) je levo od \\(0\\) negativen in desno pozitiven. Drugi odvod je skrit.',
                'For \\(-x^2\\) we have \\(f^{\\prime\\prime}=-2\\le0\\), so the function is concave: the chord is \\(y=-0.5x-1.5\\), the difference \\(f(x)-(-0.5x-1.5)\\) equals \\(-(x+1)(x-1.5)\\) and is nonnegative, and the difference with the tangent \\(y=-x+0.25\\) is \\(-(x-0.5)^2\\le0\\). Now \\(f(x)=x^3\\) on \\([-1,1.5]\\): the second derivative \\(f^{\\prime\\prime}(x)=6x\\) is negative to the left of \\(0\\) and positive to the right. The second derivative is hidden.',
            ),
            formulaIds: ['convexity-second-derivative', 'convexity-inflection'], learnerInteraction: 'adjust-construction-parameter',
            frames: [frame('convexity-cube-explanation', 'explanation'), frame('convexity-cube-observation', 'observation')],
            observationPrompt: text(
                'Napovej, ali lahko za ta interval izrečemo trditev o tetivi; šele nato pritisni Pokaži drugi odvod. Nato postavi \\(a=0\\) in \\(b=2\\), potem \\(a=-2\\) in \\(b=0\\).',
                'Predict whether a claim about the chord can be made for this interval; only then press Show second derivative. Then set \\(a=0\\) and \\(b=2\\), and afterwards \\(a=-2\\) and \\(b=0\\).',
            ),
            expectedObservations: [text(
                'Po pritisku je zgoraj znak \\(-\\) levo in \\(+\\) desno od \\(0\\), prevojna točka je pri \\(x=0\\) in sklep je »brez trditve: \\(f^{\\prime\\prime}\\) spremeni predznak na \\([a,b]\\)«. Na \\([0,2]\\) je funkcija konveksna, na \\([-2,0]\\) konkavna.',
                'After the press the sign \\(-\\) is at the top left of \\(0\\) and \\(+\\) to the right, the inflection point is at \\(x=0\\), and the verdict is "no claim: \\(f^{\\prime\\prime}\\) changes sign on \\([a,b]\\)". On \\([0,2]\\) the function is convex, on \\([-2,0]\\) concave.',
            )],
            scene: {
                id: 'convexity-cube-scene', basedOn: 'demonstration-default',
                actions: [convexityChoice('cube'), secondDerivative(false)],
                expectedState: text(
                    'Prikazan je \\(f(x)=x^3\\) na \\([-1;1{,}5]\\) s tetivo in tangento; drugi odvod je skrit.',
                    'The graph of \\(f(x)=x^3\\) on \\([-1,1.5]\\) is shown with the chord and the tangent; the second derivative is hidden.',
                ),
            },
        },
        {
            id: 'convexity-quartic-step', order: 6,
            title: text('Ničla drugega odvoda: \\(x^4\\)', 'A zero of the second derivative: \\(x^4\\)'),
            purpose: text('Napovedati, ali ničla drugega odvoda pomeni prevoj.', 'Predicting whether a zero of the second derivative means an inflection.'),
            explanation: text(
                'Pri \\(x^3\\) na \\([-1;1{,}5]\\) je tetiva \\(y=1{,}75x+0{,}75\\) in razlika \\(f(x)-(1{,}75x+0{,}75)\\) je enaka \\((x+1)(x+0{,}5)(x-1{,}5)\\) in je pozitivna na \\((-1;-0{,}5)\\) in negativna na \\((-0{,}5;1{,}5)\\): graf je na enem delu nad tetivo in na drugem pod njo, zato trditve ni. Zdaj \\(f(x)=x^4\\) na \\([-1,1]\\): drugi odvod \\(f^{\\prime\\prime}(x)=12x^2\\) je v \\(0\\) enak \\(0\\). Drugi odvod je skrit.',
                'For \\(x^3\\) on \\([-1,1.5]\\) the chord is \\(y=1.75x+0.75\\) and the difference \\(f(x)-(1.75x+0.75)\\) equals \\((x+1)(x+0.5)(x-1.5)\\) and is positive on \\((-1,-0.5)\\) and negative on \\((-0.5,1.5)\\): on one part the graph is above the chord and on another below it, so there is no claim. Now \\(f(x)=x^4\\) on \\([-1,1]\\): the second derivative \\(f^{\\prime\\prime}(x)=12x^2\\) equals \\(0\\) at \\(0\\). The second derivative is hidden.',
            ),
            formulaIds: ['convexity-inflection'], learnerInteraction: 'observe',
            frames: [frame('convexity-quartic-explanation', 'explanation'), frame('convexity-quartic-observation', 'observation')],
            observationPrompt: text(
                'Napovej, ali ima \\(x^4\\) v \\(0\\) prevojno točko, čeprav je tam \\(f^{\\prime\\prime}(0)=0\\), in kakšen je sklep za \\([-1,1]\\); šele nato pritisni Pokaži drugi odvod.',
                'Predict whether \\(x^4\\) has an inflection point at \\(0\\) although \\(f^{\\prime\\prime}(0)=0\\) there, and what the verdict for \\([-1,1]\\) is; only then press Show second derivative.',
            ),
            expectedObservations: [text(
                'Po pritisku sta zgoraj znaka \\(+\\) in \\(+\\) z znakom \\(0\\) vmes, prevojne točke ni, sklep je »konveksna na \\([a,b]\\)«.',
                'After the press the signs \\(+\\) and \\(+\\) are at the top with a \\(0\\) between them, there is no inflection point, and the verdict is "convex on \\([a,b]\\)".',
            )],
            scene: {
                id: 'convexity-quartic-scene', basedOn: 'demonstration-default',
                actions: [convexityChoice('quartic'), secondDerivative(false)],
                expectedState: text(
                    'Prikazan je \\(f(x)=x^4\\) na \\([-1,1]\\) s tetivo in tangento; drugi odvod je skrit.',
                    'The graph of \\(f(x)=x^4\\) on \\([-1,1]\\) is shown with the chord and the tangent; the second derivative is hidden.',
                ),
            },
        },
        {
            id: 'convexity-free-exploration', order: 7,
            title: text('Brez prevoja in samostojno raziskovanje', 'No inflection and free exploration'),
            purpose: text('Razkriti, da \\(x^4\\) nima prevoja, in preiti v samostojno raziskovanje.', 'Revealing that \\(x^4\\) has no inflection and handing over to free exploration.'),
            explanation: text(
                'Tetiva med \\(-1\\) in \\(1\\) je \\(y=1\\) in razlika \\(x^4-1=(x^2-1)(x^2+1)\\) je na \\([-1,1]\\) nepozitivna. Tangenta v \\(t=0{,}5\\) je \\(y=0{,}5x-0{,}1875\\) in razlika \\((x-0{,}5)^2(x^2+x+0{,}75)\\) je nenegativna, ker ima drugi faktor negativno diskriminanto. Drugi odvod \\(12x^2\\) je v \\(0\\) enak \\(0\\), a nikjer ni negativen: predznak se ne spremeni, zato je \\(x^4\\) konveksna in prevoja v \\(0\\) ni. Ničla drugega odvoda torej ni dovolj; potrebna je sprememba predznaka, kakršna je pri \\(x^3\\). Zdaj raziskuj sam: zamenjaj primer, premakni \\(a\\), \\(b\\) in \\(t\\), skrij drugi odvod in napovej, preden ga pokažeš; poišči interval, kjer je trditev mogoča, in interval, kjer je ni.',
                'The chord between \\(-1\\) and \\(1\\) is \\(y=1\\), and the difference \\(x^4-1=(x^2-1)(x^2+1)\\) is nonpositive on \\([-1,1]\\). The tangent at \\(t=0.5\\) is \\(y=0.5x-0.1875\\), and the difference \\((x-0.5)^2(x^2+x+0.75)\\) is nonnegative because the second factor has a negative discriminant. The second derivative \\(12x^2\\) equals \\(0\\) at \\(0\\) but is never negative: the sign does not change, so \\(x^4\\) is convex and there is no inflection at \\(0\\). A zero of the second derivative is therefore not enough; a change of sign is needed, as for \\(x^3\\). Now explore on your own: change the example, move \\(a\\), \\(b\\) and \\(t\\), hide the second derivative and predict before you show it; find an interval where a claim is possible and one where it is not.',
            ),
            formulaIds: ['convexity-second-derivative', 'convexity-inflection'], workedExampleId: 'convexity-quartic-example', learnerInteraction: 'adjust-construction-parameter',
            frames: [frame('convexity-free-explanation', 'explanation'), frame('convexity-free-calculation', 'calculation'), frame('convexity-free-observation', 'observation')],
            observationPrompt: text(
                'Primerjaj sklep z napovedjo. Nato skrij drugi odvod, izberi drug primer ali interval in napovej, preden ga spet pokažeš.',
                'Compare the verdict with your prediction. Then hide the second derivative, choose another example or interval, and predict before you show it again.',
            ),
            expectedObservations: [text(
                'Zgoraj sta znaka \\(+\\) in \\(+\\) z znakom \\(0\\) vmes, prevojne točke ni, zapisano je, da je \\(f^{\\prime\\prime}\\) pri \\(x=0\\) enak \\(0\\), a ohrani predznak; sklep je »konveksna«.',
                'The signs \\(+\\) and \\(+\\) are at the top with a \\(0\\) between them, there is no inflection point, a note says that \\(f^{\\prime\\prime}\\) equals \\(0\\) at \\(x=0\\) but keeps its sign, and the verdict is "convex".',
            )],
            scene: {
                id: 'convexity-free-scene', basedOn: 'demonstration-default',
                actions: [convexityChoice('quartic'), secondDerivative(true)],
                expectedState: text(
                    'Pri \\(f(x)=x^4\\) na \\([-1,1]\\) je drugi odvod prikazan: znaka \\(+\\) in \\(+\\), brez prevoja, sklep »konveksna«.',
                    'For \\(f(x)=x^4\\) on \\([-1,1]\\) the second derivative is shown: the signs \\(+\\) and \\(+\\), no inflection, the verdict "convex".',
                ),
            },
        },
    ],
    sources: [
        {
            id: 'globevnik-brojan-analiza-1-convexity',
            citation: 'Globevnik, J., Brojan, M. Analiza I, Fakulteta za matematiko in fiziko, Univerza v Ljubljani, §4.6 (printed pp. 123–126).',
            supports: ['a function is convex on an interval when its graph lies on or below every chord and concave when it lies on or above', 'a twice differentiable function with a nonnegative (nonpositive) second derivative on an interval is convex (concave) there', 'an inflection point is a point where the sign of the second derivative changes; f\'\'(c) = 0 alone does not make c an inflection point'],
        },
        {
            id: 'bezeg-convexity-implementation',
            citation: 'Bezeg source: src/analysis/convexity.ts, src/analysis/convexityModel.ts and src/graphs/functions/ConvexityGraph.tsx.',
            supports: ['x^2 on [-1, 1.5] has chord y = 0.5x + 1.5 and f(x) - chord(x) = (x + 1)(x - 1.5) <= 0, with f\'\' = 2 >= 0', 'the tangent of x^2 at 0.5 is y = x - 0.25 with f(x) - tangent(x) = (x - 0.5)^2 >= 0', 'x^3 has f\'\'(x) = 6x, which changes sign at 0: no claim on [-1, 1.5], convex on [0, 2], concave on [-2, 0]', 'x^4 on [-1, 1] is convex with f\'\'(0) = 0 and no inflection point'],
            implementationCorrespondence: 'The verdict for [a, b] comes from the closed-form sign of f\'\' on the interval (nonnegative, nonpositive or changing), never from sampling the graph; no claim is made when the sign changes on [a, b], and the claim about the tangent is made only when t lies in [a, b]; the sign strip splits the view at the zeros of f\'\' and the inflection points are those zeros where the sign changes; a lesson scene applies set-function-parameter, set-function-choice and show-function-element actions through the same setters as the controls in one synchronous tick.',
        },
    ],
    edgeCases: [
        text(
            'Vrednost \\(a\\), \\(b\\) ali \\(t\\) zunaj območja \\([-2,2]\\) in krajišči z \\(a\\ge b\\) aplikacija zavrne in model ostane nespremenjen; datoteka s takšno vrednostjo se ne uvozi in pove, kaj popraviti. Točka \\(t\\) je neodvisna od \\(a\\) in \\(b\\).',
            'A value of \\(a\\), \\(b\\) or \\(t\\) outside the range \\([-2,2]\\) and endpoints with \\(a\\ge b\\) are rejected by the app and the model stays unchanged; a file with such a value is not imported and says what to correct. The point \\(t\\) is independent of \\(a\\) and \\(b\\).',
        ),
        text(
            'Če \\(f^{\\prime\\prime}\\) na \\([a,b]\\) spremeni predznak ali če \\(t\\) ni v \\([a,b]\\), aplikacija ne izreče ustrezne trditve in navede razlog, tudi če graf po naključju leži na eni strani premice.',
            'If \\(f^{\\prime\\prime}\\) changes sign on \\([a,b]\\) or \\(t\\) is not in \\([a,b]\\), the app does not make the corresponding claim and gives the reason, even if the graph happens to lie on one side of the line.',
        ),
        text(
            'Dokler je drugi odvod skrit, so skriti tudi predznaki \\(f^{\\prime\\prime}\\), prevojna točka in sklepi, da napoved ni predčasno razkrita; tetiva in tangenta ostaneta narisani.',
            'While the second derivative is hidden, the signs of \\(f^{\\prime\\prime}\\), the inflection point and the verdicts are hidden too, so that the prediction is not given away; the chord and the tangent stay drawn.',
        ),
    ],
    unresolvedQuestions: [
        text(
            'Pred pregledom za uporabo v razredu je treba potrditi razdelek §4.6 in strani v viru (povzeto po poročilu o kandidatih, ne preverjeno v PDF) ter ali naj lekcija doda še tangentno neenakost za konkavne funkcije in strogo konveksnost.',
            'Before classroom-ready review, confirm the section §4.6 and its pages in the source (taken from the candidate report, not checked in the PDF) and whether the lesson should also add the tangent inequality for concave functions and strict convexity.',
        ),
    ],
};

const taylorChoice = (value: TaylorExampleId): SceneAction => ({
    name: 'set-function-choice', value: {name: 'taylor-example', value},
});
const taylorBound = (visible: boolean): SceneAction => ({
    name: 'show-function-element', value: {name: 'taylor-bound', value: visible},
});

const taylor: GuidedLesson = {
    demonstrationId: 'taylor',
    title: text('Taylorjev polinom in napaka približka', 'Taylor polynomial and the error of the approximation'),
    summary: text(
        'Taylorjev polinom \\(T_n\\) stopnje \\(n\\) funkcije \\(f\\) okoli središča \\(c\\) je končna vsota \\(\\sum_{k=0}^{n}\\frac{f^{(k)}(c)}{k!}(x-c)^k\\); obstaja vedno, kadar ima \\(f\\) v \\(c\\) odvode do stopnje \\(n\\). Če je \\(f\\) med \\(c\\) in \\(x\\) \\((n+1)\\)-krat odvedljiva, ima napaka \\(f(x)-T_n(x)\\) Lagrangeevo obliko \\(\\frac{f^{(n+1)}(\\xi)}{(n+1)!}(x-c)^{n+1}\\) za neki \\(\\xi\\) med \\(c\\) in \\(x\\), zato velja ocena \\(|f(x)-T_n(x)|\\le\\frac{M\\,|x-c|^{n+1}}{(n+1)!}\\), če je \\(M\\) zgornja meja za \\(|f^{(n+1)}|\\) med \\(c\\) in \\(x\\). To je pomembno ločiti od neskončne Taylorjeve vrste: pri \\(e^x\\) in \\(\\sin x\\) vrsta konvergira k \\(f\\) povsod, pri \\(\\frac{1}{1-x}\\) le za \\(|x-c|<1-c\\), pri gladki funkciji \\(e^{-1/x}\\) (za \\(x>0\\), sicer \\(0\\)) pa so vsi koeficienti v \\(0\\) enaki \\(0\\), zato vrsta konvergira k \\(0\\), ne k \\(f\\).',
        'The Taylor polynomial \\(T_n\\) of degree \\(n\\) of a function \\(f\\) about a center \\(c\\) is the finite sum \\(\\sum_{k=0}^{n}\\frac{f^{(k)}(c)}{k!}(x-c)^k\\); it exists whenever \\(f\\) has derivatives at \\(c\\) up to order \\(n\\). If \\(f\\) is \\((n+1)\\)-times differentiable between \\(c\\) and \\(x\\), the error \\(f(x)-T_n(x)\\) has the Lagrange form \\(\\frac{f^{(n+1)}(\\xi)}{(n+1)!}(x-c)^{n+1}\\) for some \\(\\xi\\) between \\(c\\) and \\(x\\), hence the bound \\(|f(x)-T_n(x)|\\le\\frac{M\\,|x-c|^{n+1}}{(n+1)!}\\) when \\(M\\) is an upper bound for \\(|f^{(n+1)}|\\) between \\(c\\) and \\(x\\). This must be kept apart from the infinite Taylor series: for \\(e^x\\) and \\(\\sin x\\) the series converges to \\(f\\) everywhere, for \\(\\frac{1}{1-x}\\) only for \\(|x-c|<1-c\\), and for the smooth function \\(e^{-1/x}\\) (for \\(x>0\\), otherwise \\(0\\)) all coefficients at \\(0\\) equal \\(0\\), so the series converges to \\(0\\), not to \\(f\\).',
    ),
    prerequisites: [
        text(
            'Potrebno je poznavanje višjih odvodov \\(f^{\\prime}\\), \\(f^{\\prime\\prime}\\), \\(f^{(k)}\\) in fakultet \\(k!\\) ter odvodov funkcij \\(e^x\\), \\(\\sin x\\) in \\(\\frac{1}{1-x}\\).',
            'Assumes familiarity with higher derivatives \\(f^{\\prime}\\), \\(f^{\\prime\\prime}\\), \\(f^{(k)}\\) and factorials \\(k!\\), and with the derivatives of \\(e^x\\), \\(\\sin x\\) and \\(\\frac{1}{1-x}\\).',
        ),
        text(
            'Potrebno je razumevanje geometrijske vrste in pojma konvergence zaporedja delnih vsot.',
            'Assumes an understanding of the geometric series and of convergence of a sequence of partial sums.',
        ),
    ],
    learningGoals: [
        text(
            'Pri \\(e^x\\) okoli \\(0\\) v točki \\(x=1\\) primerjaš \\(T_1(1)=2\\), \\(T_3(1)=\\frac83\\) in \\(T_6(1)=\\frac{1957}{720}\\) z \\(e\\) in napoveš, kako se napaka spreminja s stopnjo.',
            'For \\(e^x\\) about \\(0\\) at \\(x=1\\) compare \\(T_1(1)=2\\), \\(T_3(1)=\\frac83\\) and \\(T_6(1)=\\frac{1957}{720}\\) with \\(e\\) and predict how the error changes with the degree.',
        ),
        text(
            'Z Lagrangeevo oceno utemeljiš, da napaka ne presega \\(\\frac{M\\,|x-c|^{n+1}}{(n+1)!}\\), in poveš, kaj je \\(M\\) pri \\(e^x\\) in pri \\(\\sin x\\).',
            'Use the Lagrange bound to justify that the error does not exceed \\(\\frac{M\\,|x-c|^{n+1}}{(n+1)!}\\), and state what \\(M\\) is for \\(e^x\\) and for \\(\\sin x\\).',
        ),
        text(
            'Pri \\(\\frac{1}{1-x}\\) okoli \\(0\\) v točki \\(x=-1{,}5\\) ugotoviš, da višja stopnja napako poveča, ker \\(x\\) ne leži v \\(|x|<1\\).',
            'For \\(\\frac{1}{1-x}\\) about \\(0\\) at \\(x=-1.5\\) find that a higher degree increases the error, because \\(x\\) does not lie in \\(|x|<1\\).',
        ),
        text(
            'Pri funkciji \\(e^{-1/x}\\) za \\(x>0\\) (sicer \\(0\\)) pojasniš, da so vsi koeficienti v \\(0\\) enaki \\(0\\), a je \\(f(1)>0\\): vrsta konvergira, vendar ne k \\(f\\).',
            'For the function \\(e^{-1/x}\\) for \\(x>0\\) (otherwise \\(0\\)) explain that all coefficients at \\(0\\) are \\(0\\) while \\(f(1)>0\\): the series converges, but not to \\(f\\).',
        ),
    ],
    formulaBlocks: [
        {
            id: 'taylor-polynomial',
            latex: 'T_n(x)=\\sum_{k=0}^{n}\\frac{f^{(k)}(c)}{k!}\\,(x-c)^k',
            notation: text(
                'Število \\(c\\) je središče, \\(n\\) stopnja, \\(f^{(k)}(c)\\) odvod stopnje \\(k\\) v \\(c\\), \\(k!\\) fakulteta; člen z \\(k=0\\) je \\(f(c)\\).',
                'The number \\(c\\) is the center, \\(n\\) the degree, \\(f^{(k)}(c)\\) the derivative of order \\(k\\) at \\(c\\) and \\(k!\\) a factorial; the term with \\(k=0\\) is \\(f(c)\\).',
            ),
            explanation: text(
                '\\(T_n\\) je polinom stopnje največ \\(n\\), ki se v \\(c\\) z \\(f\\) ujema v vrednosti in vseh odvodih do stopnje \\(n\\). Je končna vsota in obstaja pri vsakem \\(n\\), ne glede na to, ali neskončna vrsta konvergira.',
                '\\(T_n\\) is the polynomial of degree at most \\(n\\) that agrees with \\(f\\) at \\(c\\) in value and in all derivatives up to order \\(n\\). It is a finite sum and exists for every \\(n\\), whether or not the infinite series converges.',
            ),
        },
        {
            id: 'taylor-lagrange',
            latex: '|f(x)-T_n(x)|\\le\\frac{M\\,|x-c|^{n+1}}{(n+1)!},\\qquad M\\ge\\left|f^{(n+1)}(t)\\right|\\ \\text{for all}\\ t\\ \\text{between}\\ c\\ \\text{and}\\ x',
            notation: text(
                'Število \\(M\\) je zgornja meja za absolutno vrednost odvoda stopnje \\(n+1\\) na daljici med \\(c\\) in \\(x\\).',
                'The number \\(M\\) is an upper bound for the absolute value of the derivative of order \\(n+1\\) on the segment between \\(c\\) and \\(x\\).',
            ),
            explanation: text(
                'Ocena sledi iz Lagrangeeve oblike ostanka \\(\\frac{f^{(n+1)}(\\xi)}{(n+1)!}(x-c)^{n+1}\\). Velja le ob predpostavki o \\(M\\): pri \\(e^x\\) je \\(M=\\max(e^c,e^x)\\), ker je \\(e^t\\) naraščajoča, pri \\(\\sin x\\) je \\(M=1\\), ker je vsak odvod enak \\(\\pm\\sin x\\) ali \\(\\pm\\cos x\\).',
                'The bound follows from the Lagrange form of the remainder \\(\\frac{f^{(n+1)}(\\xi)}{(n+1)!}(x-c)^{n+1}\\). It holds only under the assumption on \\(M\\): for \\(e^x\\) take \\(M=\\max(e^c,e^x)\\), because \\(e^t\\) is increasing; for \\(\\sin x\\) take \\(M=1\\), because every derivative is \\(\\pm\\sin x\\) or \\(\\pm\\cos x\\).',
            ),
        },
        {
            id: 'taylor-geometric',
            latex: '\\frac{1}{1-x}-T_n(x)=\\frac{x^{n+1}}{1-x}\\quad(c=0),\\qquad T_n(x)=\\sum_{k=0}^{n}x^k',
            notation: text(
                'Pri središču \\(c=0\\) so vsi koeficienti funkcije \\(\\frac{1}{1-x}\\) enaki \\(1\\), \\(T_n\\) pa je delna vsota geometrijske vrste.',
                'With center \\(c=0\\) every coefficient of \\(\\frac{1}{1-x}\\) equals \\(1\\), and \\(T_n\\) is a partial sum of the geometric series.',
            ),
            explanation: text(
                'Za \\(|x|<1\\) gre \\(x^{n+1}\\to0\\) in napaka pada k \\(0\\); za \\(|x|>1\\) gre \\(|x|^{n+1}\\to\\infty\\) in napaka z večanjem stopnje raste. Splošno vrsta okoli \\(c\\) konvergira natanko za \\(|x-c|<1-c\\).',
                'For \\(|x|<1\\) we have \\(x^{n+1}\\to0\\) and the error falls to \\(0\\); for \\(|x|>1\\) we have \\(|x|^{n+1}\\to\\infty\\) and the error grows with the degree. In general the series about \\(c\\) converges exactly for \\(|x-c|<1-c\\).',
            ),
        },
        {
            id: 'taylor-flat',
            latex: 'f(x)=\\begin{cases}e^{-1/x}&x>0\\\\0&x\\le0\\end{cases},\\qquad f^{(k)}(0)=0\\ \\text{for every}\\ k',
            notation: text(
                'Funkcija je neskončnokrat odvedljiva tudi v \\(0\\), vsi njeni odvodi v \\(0\\) pa so enaki \\(0\\).',
                'The function is infinitely differentiable also at \\(0\\), and all its derivatives at \\(0\\) equal \\(0\\).',
            ),
            explanation: text(
                'Zato je \\(T_n=0\\) pri vsaki stopnji in Taylorjeva vrsta v \\(0\\) je identično \\(0\\). Konvergira, a za \\(x>0\\) ne k \\(f\\), saj je tam \\(f(x)=e^{-1/x}>0\\).',
                'Hence \\(T_n=0\\) at every degree and the Taylor series at \\(0\\) is identically \\(0\\). It converges, but for \\(x>0\\) not to \\(f\\), because there \\(f(x)=e^{-1/x}>0\\).',
            ),
        },
    ],
    workedExamples: [
        {
            id: 'taylor-exp-example',
            title: text('Funkcija \\(e^x\\) okoli \\(0\\) v točki \\(x=1\\)', 'The function \\(e^x\\) about \\(0\\) at \\(x=1\\)'),
            calculationLatex: 'T_3(1)=1+1+\\tfrac12+\\tfrac16=\\tfrac83,\\quad T_6(1)=\\tfrac83+\\tfrac1{24}+\\tfrac1{120}+\\tfrac1{720}=\\tfrac{1957}{720},\\qquad M=\\max(e^0,e^1)=e<3',
            resultLatex: '0\\le e-T_6(1)\\le\\frac{e}{7!}=\\frac{e}{5040}',
            check: text(
                'Velja \\(e\\approx2{,}71828\\), \\(T_6(1)\\approx2{,}71806\\), zato je dejanska napaka približno \\(0{,}000226\\), ocena \\(\\frac{e}{5040}\\) pa približno \\(0{,}000539\\) in je nad napako. Ocena je zgornja meja, ne vrednost napake.',
                'We have \\(e\\approx2.71828\\) and \\(T_6(1)\\approx2.71806\\), so the actual error is about \\(0.000226\\), while the bound \\(\\frac{e}{5040}\\) is about \\(0.000539\\) and lies above the error. The bound is an upper limit, not the value of the error.',
            ),
        },
        {
            id: 'taylor-sine-example',
            title: text('Funkcija \\(\\sin x\\) okoli \\(0\\) v točki \\(x=2\\)', 'The function \\(\\sin x\\) about \\(0\\) at \\(x=2\\)'),
            calculationLatex: 'T_3(2)=2-\\frac{2^3}{3!}=2-\\frac86=\\frac23,\\qquad M=1,\\quad \\frac{2^{4}}{4!}=\\frac{16}{24}=\\frac23',
            resultLatex: '|\\sin 2-T_3(2)|\\le\\frac23',
            check: text(
                'Velja \\(\\sin2\\approx0{,}9093\\), zato je napaka približno \\(0{,}2426\\), ocena pa \\(0{,}6667\\). Za \\(n=5\\) je \\(T_5(2)=\\frac{14}{15}\\), napaka približno \\(0{,}0240\\) in ocena \\(\\frac{2^6}{6!}=\\frac{4}{45}\\approx0{,}0889\\).',
                'We have \\(\\sin2\\approx0.9093\\), so the error is about \\(0.2426\\) and the bound \\(0.6667\\). For \\(n=5\\), \\(T_5(2)=\\frac{14}{15}\\), the error is about \\(0.0240\\) and the bound \\(\\frac{2^6}{6!}=\\frac{4}{45}\\approx0.0889\\).',
            ),
        },
        {
            id: 'taylor-geometric-example',
            title: text('Funkcija \\(\\frac{1}{1-x}\\) okoli \\(0\\) v točki \\(x=-1{,}5\\)', 'The function \\(\\frac{1}{1-x}\\) about \\(0\\) at \\(x=-1.5\\)'),
            calculationLatex: 'f(-\\tfrac32)=\\tfrac25,\\qquad f(x)-T_n(x)=\\frac{x^{n+1}}{1-x}=\\frac{\\left(-\\tfrac32\\right)^{n+1}}{\\tfrac52}',
            resultLatex: '\\left|f-T_1\\right|=\\tfrac{9}{10},\\quad \\left|f-T_3\\right|=\\tfrac{81}{40},\\quad \\left|f-T_5\\right|=\\tfrac{729}{160}',
            check: text(
                'Napaka je po vrsti \\(0{,}9\\), \\(2{,}025\\) in približno \\(4{,}556\\): z večanjem stopnje narašča, ker je \\(\\left|-\\tfrac32\\right|>1\\). Pri \\(x=0{,}5\\) je napaka \\(\\frac{0{,}5^{n+1}}{0{,}5}\\), torej \\(0{,}125\\) pri \\(n=3\\) in \\(0{,}03125\\) pri \\(n=5\\).',
                'The error is \\(0.9\\), \\(2.025\\) and about \\(4.556\\) in turn: it grows with the degree because \\(\\left|-\\tfrac32\\right|>1\\). At \\(x=0.5\\) the error is \\(\\frac{0.5^{n+1}}{0.5}\\), that is \\(0.125\\) at \\(n=3\\) and \\(0.03125\\) at \\(n=5\\).',
            ),
        },
        {
            id: 'taylor-flat-example',
            title: text('Gladka funkcija \\(e^{-1/x}\\) v točki \\(x=1\\)', 'The smooth function \\(e^{-1/x}\\) at \\(x=1\\)'),
            calculationLatex: 'f^{(k)}(0)=0\\ \\Rightarrow\\ T_n(1)=0,\\qquad f(1)=e^{-1}=\\frac1e',
            resultLatex: 'f(1)-T_n(1)=\\frac1e>0\\quad\\text{for every}\\ n',
            check: text(
                'Velja \\(e^{-1}\\approx0{,}3679\\): napaka je pri vsaki stopnji ista, ker se \\(T_n\\) s stopnjo ne spremeni. Vrsta konvergira (k \\(0\\)), vendar ne k \\(f\\).',
                'We have \\(e^{-1}\\approx0.3679\\): the error is the same at every degree because \\(T_n\\) does not change with the degree. The series converges (to \\(0\\)), but not to \\(f\\).',
            ),
        },
    ],
    steps: [
        {
            id: 'taylor-prerequisites-step', order: 1,
            title: text('Višji odvodi in polinom \\(T_n\\)', 'Higher derivatives and the polynomial \\(T_n\\)'),
            purpose: text('Pripraviti pojme in napoved, preden se ocena napake pokaže.', 'Preparing the terms and a prediction before the error bound is shown.'),
            explanation: text(
                'Taylorjev polinom \\(T_n(x)\\) je vsota členov \\(\\frac{f^{(k)}(c)}{k!}(x-c)^k\\) za \\(k=0,\\dots,n\\). Sestavimo ga iz višjih odvodov \\(f^{(k)}(c)\\) in fakultet \\(k!\\). Pri \\(f(x)=e^x\\) je vsak odvod enak \\(e^x\\), zato so koeficienti okoli \\(c=0\\) enaki \\(\\frac{1}{k!}\\). Opazujemo točko \\(x=1\\) in stopnjo \\(n=1\\): \\(T_1(1)=1+1=2\\), prava vrednost pa je \\(e\\approx2{,}7183\\), torej je napaka približno \\(0{,}7183\\). Polna črta je \\(f\\), črtkana \\(T_n\\), navpična črta pri \\(x\\) pa napaka. Ocena napake je skrita.',
                'The Taylor polynomial \\(T_n(x)\\) is the sum of the terms \\(\\frac{f^{(k)}(c)}{k!}(x-c)^k\\) for \\(k=0,\\dots,n\\). It is built from higher derivatives \\(f^{(k)}(c)\\) and factorials \\(k!\\). For \\(f(x)=e^x\\) every derivative equals \\(e^x\\), so the coefficients about \\(c=0\\) are \\(\\frac{1}{k!}\\). We look at the point \\(x=1\\) and degree \\(n=1\\): \\(T_1(1)=1+1=2\\), while the true value is \\(e\\approx2.7183\\), so the error is about \\(0.7183\\). The solid line is \\(f\\), the dashed line is \\(T_n\\) and the vertical line at \\(x\\) is the error. The error bound is hidden.',
            ),
            formulaIds: ['taylor-polynomial'], learnerInteraction: 'observe',
            frames: [frame('taylor-prerequisites-explanation', 'explanation'), frame('taylor-prerequisites-observation', 'observation')],
            observationPrompt: text(
                'Napovej, kako se napaka v točki \\(x=1\\) spremeni, ko stopnjo \\(n\\) povečaš na \\(3\\) in na \\(6\\) (gumb +); šele nato pritisni Pokaži oceno napake.',
                'Predict how the error at \\(x=1\\) changes when you raise the degree \\(n\\) to \\(3\\) and to \\(6\\) (the + button); only then press Show error bound.',
            ),
            expectedObservations: [text(
                'Pri \\(n=1\\) je \\(T_1(1)=2\\) in napaka približno \\(0{,}7183\\); ocena napake je skrita.',
                'At \\(n=1\\), \\(T_1(1)=2\\) and the error is about \\(0.7183\\); the error bound is hidden.',
            )],
            scene: {
                id: 'taylor-prerequisites-scene', basedOn: 'demonstration-default',
                actions: [taylorBound(false)],
                expectedState: text(
                    'Prikazan je \\(e^x\\) okoli \\(c=0\\) s polinomom stopnje \\(n=1\\) v točki \\(x=1\\); ocena napake je skrita.',
                    'The graph of \\(e^x\\) about \\(c=0\\) is shown with the polynomial of degree \\(n=1\\) at \\(x=1\\); the error bound is hidden.',
                ),
            },
        },
        {
            id: 'taylor-exp-step', order: 2,
            title: text('Višja stopnja in Lagrangeeva ocena', 'A higher degree and the Lagrange bound'),
            purpose: text('Primerjati napoved z vrednostmi in oceno napake.', 'Comparing the prediction with the values and the error bound.'),
            explanation: text(
                'Pri \\(n=3\\) je \\(T_3(1)=1+1+\\frac12+\\frac16\\) \\(=\\frac83\\approx2{,}6667\\), pri \\(n=6\\) pa \\(T_6(1)=\\frac{1957}{720}\\approx2{,}7181\\): napaka pada od približno \\(0{,}7183\\) prek \\(0{,}0516\\) do približno \\(0{,}000226\\). Zdaj je prikazana še Lagrangeeva ocena. Predpostavka je, da je \\(M\\) zgornja meja za \\(|f^{(n+1)}|\\) med \\(c\\) in \\(x\\); pri \\(e^x\\) je to \\(M=\\max(e^c,e^x)=e<3\\), ker je \\(e^t\\) naraščajoča. Pri \\(n=6\\) je ocena \\(\\frac{e}{7!}\\approx0{,}000539\\), kar je nad dejansko napako \\(0{,}000226\\).',
                'At \\(n=3\\), \\(T_3(1)=1+1+\\frac12+\\frac16\\) \\(=\\frac83\\approx2.6667\\), and at \\(n=6\\), \\(T_6(1)=\\frac{1957}{720}\\approx2.7181\\): the error falls from about \\(0.7183\\) through \\(0.0516\\) to about \\(0.000226\\). The Lagrange bound is now shown as well. The assumption is that \\(M\\) is an upper bound for \\(|f^{(n+1)}|\\) between \\(c\\) and \\(x\\); for \\(e^x\\) this is \\(M=\\max(e^c,e^x)=e<3\\), because \\(e^t\\) is increasing. At \\(n=6\\) the bound is \\(\\frac{e}{7!}\\approx0.000539\\), which lies above the actual error \\(0.000226\\).',
            ),
            formulaIds: ['taylor-polynomial', 'taylor-lagrange'], workedExampleId: 'taylor-exp-example', learnerInteraction: 'observe',
            frames: [frame('taylor-exp-explanation', 'explanation'), frame('taylor-exp-calculation', 'calculation'), frame('taylor-exp-observation', 'observation')],
            observationPrompt: text(
                'Primerjaj z napovedjo: preberi \\(T_6(1)\\), absolutno napako in oceno napake v odčitkih ter predpostavko ocene; nato stopnjo zmanjšaj in opazuj, kako se spremenita napaka in ocena.',
                'Compare with your prediction: read \\(T_6(1)\\), the absolute error and the error bound in the readouts together with the assumption of the bound; then lower the degree and watch how the error and the bound change.',
            ),
            expectedObservations: [text(
                'Pri \\(n=6\\) je \\(T_6(1)\\approx2{,}7181\\), absolutna napaka približno \\(0{,}000226\\) in ocena približno \\(0{,}000539\\); ocena je večja od napake.',
                'At \\(n=6\\), \\(T_6(1)\\approx2.7181\\), the absolute error is about \\(0.000226\\) and the bound about \\(0.000539\\); the bound exceeds the error.',
            )],
            scene: {
                id: 'taylor-exp-scene', basedOn: 'demonstration-default',
                actions: [parameter('taylor-degree', 6), taylorBound(true)],
                expectedState: text(
                    'Prikazan je \\(e^x\\) okoli \\(c=0\\) s polinomom stopnje \\(n=6\\) v \\(x=1\\); ocena napake je prikazana.',
                    'The graph of \\(e^x\\) about \\(c=0\\) is shown with the polynomial of degree \\(n=6\\) at \\(x=1\\); the error bound is shown.',
                ),
            },
        },
        {
            id: 'taylor-sine-prediction-step', order: 3,
            title: text('Funkcija \\(\\sin x\\): napoved', 'The function \\(\\sin x\\): a prediction'),
            purpose: text('Napovedati oceno napake, preden se pokaže.', 'Predicting the error bound before it is shown.'),
            explanation: text(
                'Odvodi funkcije \\(\\sin x\\) se ponavljajo: \\(\\sin x\\), \\(\\cos x\\), \\(-\\sin x\\), \\(-\\cos x\\). V središču \\(c=0\\) so vrednosti \\(0\\), \\(1\\), \\(0\\), \\(-1\\), zato ima \\(T_n\\) le lihe potence. Pri \\(e^x\\) smo videli, da je ocena nad napako: \\(M=e\\) omejuje vse odvode \\(e^t\\) za \\(t\\) med \\(0\\) in \\(1\\) (Lagrangeeva oblika ostanka). Zdaj opazujemo \\(\\sin x\\) v točki \\(x=2\\) pri \\(n=3\\); ocena napake je skrita.',
                'The derivatives of \\(\\sin x\\) repeat: \\(\\sin x\\), \\(\\cos x\\), \\(-\\sin x\\), \\(-\\cos x\\). At the center \\(c=0\\) their values are \\(0\\), \\(1\\), \\(0\\), \\(-1\\), so \\(T_n\\) has only odd powers. For \\(e^x\\) we saw that the bound lies above the error: \\(M=e\\) bounds every derivative \\(e^t\\) for \\(t\\) between \\(0\\) and \\(1\\) (the Lagrange form of the remainder). Now we look at \\(\\sin x\\) at the point \\(x=2\\) with \\(n=3\\); the error bound is hidden.',
            ),
            formulaIds: ['taylor-polynomial'], learnerInteraction: 'observe',
            frames: [frame('taylor-sine-prediction-explanation', 'explanation'), frame('taylor-sine-prediction-observation', 'observation')],
            observationPrompt: text(
                'Napovej, ali je pri \\(n=3\\) napaka v \\(x=2\\) večja od \\(0{,}1\\) in kolikšna bi bila ocena \\(\\frac{|x-c|^{n+1}}{(n+1)!}\\); šele nato pritisni Pokaži oceno napake.',
                'Predict whether at \\(n=3\\) the error at \\(x=2\\) is larger than \\(0.1\\) and what the bound \\(\\frac{|x-c|^{n+1}}{(n+1)!}\\) would be; only then press Show error bound.',
            ),
            expectedObservations: [text(
                'Prikazani sta \\(T_3(2)\\approx0{,}6667\\) in \\(\\sin2\\approx0{,}9093\\), napaka je približno \\(0{,}2426\\); ocena napake je skrita.',
                'The values \\(T_3(2)\\approx0.6667\\) and \\(\\sin2\\approx0.9093\\) are shown, the error is about \\(0.2426\\); the error bound is hidden.',
            )],
            scene: {
                id: 'taylor-sine-prediction-scene', basedOn: 'demonstration-default',
                actions: [taylorChoice('sine'), taylorBound(false)],
                expectedState: text(
                    'Prikazan je \\(\\sin x\\) okoli \\(c=0\\) s polinomom stopnje \\(n=3\\) v \\(x=2\\); ocena napake je skrita.',
                    'The graph of \\(\\sin x\\) about \\(c=0\\) is shown with the polynomial of degree \\(n=3\\) at \\(x=2\\); the error bound is hidden.',
                ),
            },
        },
        {
            id: 'taylor-sine-step', order: 4,
            title: text('Ocena \\(\\frac{|x-c|^{n+1}}{(n+1)!}\\) za \\(\\sin x\\)', 'The bound \\(\\frac{|x-c|^{n+1}}{(n+1)!}\\) for \\(\\sin x\\)'),
            purpose: text('Primerjati napoved z oceno z \\(M=1\\).', 'Comparing the prediction with the bound with \\(M=1\\).'),
            explanation: text(
                'Pri \\(n=3\\) je \\(T_3(2)=2-\\frac{2^3}{3!}\\) \\(=2-\\frac86=\\frac23\\approx0{,}6667\\), \\(\\sin2\\approx0{,}9093\\) in napaka približno \\(0{,}2426\\). Predpostavka ocene: vsak odvod funkcije \\(\\sin x\\) je \\(\\pm\\sin x\\) ali \\(\\pm\\cos x\\), zato je \\(M=1\\) in ocena je \\(\\frac{|x-c|^{n+1}}{(n+1)!}=\\frac{2^4}{4!}\\) \\(=\\frac{16}{24}=\\frac23\\). Ocena je nad napako, vendar zelo groba. S stopnjo \\(n=5\\) se napaka zmanjša na približno \\(0{,}0240\\), ocena pa na \\(\\frac{2^6}{6!}\\approx0{,}0889\\).',
                'At \\(n=3\\), \\(T_3(2)=2-\\frac{2^3}{3!}\\) \\(=2-\\frac86=\\frac23\\approx0.6667\\), \\(\\sin2\\approx0.9093\\) and the error is about \\(0.2426\\). The assumption of the bound: every derivative of \\(\\sin x\\) is \\(\\pm\\sin x\\) or \\(\\pm\\cos x\\), so \\(M=1\\) and the bound is \\(\\frac{|x-c|^{n+1}}{(n+1)!}=\\frac{2^4}{4!}\\) \\(=\\frac{16}{24}=\\frac23\\). The bound lies above the error, but it is very rough. With degree \\(n=5\\) the error drops to about \\(0.0240\\) and the bound to \\(\\frac{2^6}{6!}\\approx0.0889\\).',
            ),
            formulaIds: ['taylor-lagrange'], workedExampleId: 'taylor-sine-example', learnerInteraction: 'adjust-construction-parameter',
            frames: [frame('taylor-sine-explanation', 'explanation'), frame('taylor-sine-calculation', 'calculation'), frame('taylor-sine-observation', 'observation')],
            observationPrompt: text(
                'Primerjaj z napovedjo. Nato povečaj stopnjo na \\(5\\) in preberi novo napako in oceno; poskusi še drugo središče \\(c\\), na primer \\(c=1\\).',
                'Compare with your prediction. Then raise the degree to \\(5\\) and read the new error and bound; also try another center \\(c\\), for example \\(c=1\\).',
            ),
            expectedObservations: [text(
                'Pri \\(n=3\\) je ocena napake \\(\\frac23\\approx0{,}6667\\) in napaka približno \\(0{,}2426\\); predpostavka ocene je \\(M=1\\).',
                'At \\(n=3\\) the error bound is \\(\\frac23\\approx0.6667\\) and the error about \\(0.2426\\); the assumption of the bound is \\(M=1\\).',
            )],
            scene: {
                id: 'taylor-sine-scene', basedOn: 'demonstration-default',
                actions: [taylorChoice('sine'), taylorBound(true)],
                expectedState: text(
                    'Prikazan je \\(\\sin x\\) okoli \\(c=0\\) s polinomom stopnje \\(n=3\\) v \\(x=2\\); ocena napake je prikazana.',
                    'The graph of \\(\\sin x\\) about \\(c=0\\) is shown with the polynomial of degree \\(n=3\\) at \\(x=2\\); the error bound is shown.',
                ),
            },
        },
        {
            id: 'taylor-geometric-step', order: 5,
            title: text('Zunaj konvergenčnega intervala: \\(\\frac{1}{1-x}\\)', 'Outside the convergence interval: \\(\\frac{1}{1-x}\\)'),
            purpose: text('Napovedati, da višja stopnja ne pomeni vedno boljšega približka.', 'Predicting that a higher degree does not always mean a better approximation.'),
            explanation: text(
                'Pri \\(\\sin x\\) smo za \\(n=5\\) dobili manjšo napako kot za \\(n=3\\). Ali to velja vedno? Opazujemo \\(f(x)=\\frac{1}{1-x}\\) okoli \\(c=0\\); koeficienti so vsi \\(1\\), \\(T_n\\) je delna vsota geometrijske vrste. Točka je \\(x=-1{,}5\\), kjer je \\(f(-1{,}5)=\\frac{1}{2{,}5}=0{,}4\\), stopnja je \\(n=1\\). Na osi \\(x\\) je odebeljena črta konvergenčni interval vrste, to je \\(|x-c|<1-c\\), torej tu med \\(-1\\) in \\(1\\). Točka \\(x\\) je zunaj njega.',
                'For \\(\\sin x\\) degree \\(n=5\\) gave a smaller error than \\(n=3\\). Is that always so? We look at \\(f(x)=\\frac{1}{1-x}\\) about \\(c=0\\); all coefficients are \\(1\\) and \\(T_n\\) is a partial sum of the geometric series. The point is \\(x=-1.5\\), where \\(f(-1.5)=\\frac{1}{2.5}=0.4\\), and the degree is \\(n=1\\). The thick line on the \\(x\\)-axis is the convergence interval of the series, that is \\(|x-c|<1-c\\), here between \\(-1\\) and \\(1\\). The point \\(x\\) is outside it.',
            ),
            formulaIds: ['taylor-geometric'], learnerInteraction: 'adjust-construction-parameter',
            frames: [frame('taylor-geometric-explanation', 'explanation'), frame('taylor-geometric-observation', 'observation')],
            observationPrompt: text(
                'Napovej, ali bo napaka v \\(x=-1{,}5\\) manjša, če stopnjo povečaš na \\(3\\) in na \\(5\\) (gumb +); nato stopnjo povečaj in preberi absolutno napako. Nazadnje premakni \\(x\\) na \\(0{,}5\\) in primerjaj.',
                'Predict whether the error at \\(x=-1.5\\) becomes smaller if you raise the degree to \\(3\\) and to \\(5\\) (the + button); then raise the degree and read the absolute error. Finally move \\(x\\) to \\(0.5\\) and compare.',
            ),
            expectedObservations: [text(
                'Pri \\(n=1\\) je \\(T_1(-1{,}5)=-0{,}5\\) in napaka \\(0{,}9\\); stanje piše, da je \\(x\\) zunaj konvergenčnega intervala.',
                'At \\(n=1\\), \\(T_1(-1.5)=-0.5\\) and the error is \\(0.9\\); the status says that \\(x\\) is outside the convergence interval.',
            )],
            scene: {
                id: 'taylor-geometric-scene', basedOn: 'demonstration-default',
                actions: [taylorChoice('geometric'), parameter('taylor-x', -1.5), parameter('taylor-degree', 1), taylorBound(false)],
                expectedState: text(
                    'Prikazan je \\(\\frac{1}{1-x}\\) okoli \\(c=0\\) s polinomom stopnje \\(n=1\\) v \\(x=-1{,}5\\), zunaj konvergenčnega intervala; ocena napake je skrita.',
                    'The graph of \\(\\frac{1}{1-x}\\) about \\(c=0\\) is shown with the polynomial of degree \\(n=1\\) at \\(x=-1.5\\), outside the convergence interval; the error bound is hidden.',
                ),
            },
        },
        {
            id: 'taylor-flat-prediction-step', order: 6,
            title: text('Gladka funkcija z vsemi koeficienti \\(0\\)', 'A smooth function with all coefficients \\(0\\)'),
            purpose: text('Napovedati, kaj stori Taylorjev polinom, ko so vsi odvodi v središču \\(0\\).', 'Predicting what the Taylor polynomial does when all derivatives at the center are \\(0\\).'),
            explanation: text(
                'Zunaj konvergenčnega intervala napaka narašča: \\(f-T_n=\\frac{x^{n+1}}{1-x}\\) \\(=\\frac{(-1{,}5)^{n+1}}{2{,}5}\\), torej \\(0{,}9\\) pri \\(n=1\\), \\(2{,}025\\) pri \\(n=3\\) in približno \\(4{,}556\\) pri \\(n=5\\); znotraj, pri \\(x=0{,}5\\), pa pada, na primer \\(0{,}125\\) pri \\(n=3\\) in \\(0{,}03125\\) pri \\(n=5\\). Zdaj gladka funkcija \\(f(x)=e^{-1/x}\\) za \\(x>0\\) in \\(f(x)=0\\) za \\(x\\le0\\) okoli središča \\(c=0\\), ki je tu stalno. Njeni odvodi v \\(0\\) so vsi \\(0\\). Opazujemo točko \\(x=1\\).',
                'Outside the convergence interval the error grows: \\(f-T_n=\\frac{x^{n+1}}{1-x}\\) \\(=\\frac{(-1.5)^{n+1}}{2.5}\\), that is \\(0.9\\) at \\(n=1\\), \\(2.025\\) at \\(n=3\\) and about \\(4.556\\) at \\(n=5\\); inside, at \\(x=0.5\\), it falls, for example \\(0.125\\) at \\(n=3\\) and \\(0.03125\\) at \\(n=5\\). Now the smooth function \\(f(x)=e^{-1/x}\\) for \\(x>0\\) and \\(f(x)=0\\) for \\(x\\le0\\) about the center \\(c=0\\), which is fixed here. Its derivatives at \\(0\\) are all \\(0\\). We look at the point \\(x=1\\).',
            ),
            formulaIds: ['taylor-flat'], learnerInteraction: 'observe',
            frames: [frame('taylor-flat-prediction-explanation', 'explanation'), frame('taylor-flat-prediction-observation', 'observation')],
            observationPrompt: text(
                'Napovej, ali se bo \\(T_n(1)\\) z večanjem stopnje približal \\(f(1)\\); povečaj stopnjo in preveri. Šele nato pritisni Pokaži oceno napake in preberi, kaj aplikacija pove o oceni.',
                'Predict whether \\(T_n(1)\\) approaches \\(f(1)\\) as the degree grows; raise the degree and check. Only then press Show error bound and read what the app says about the bound.',
            ),
            expectedObservations: [text(
                'Pri vsaki stopnji je \\(T_n(1)=0\\), \\(f(1)\\approx0{,}3679\\) in napaka je ista; ocena napake je skrita.',
                'At every degree \\(T_n(1)=0\\), \\(f(1)\\approx0.3679\\) and the error is the same; the error bound is hidden.',
            )],
            scene: {
                id: 'taylor-flat-prediction-scene', basedOn: 'demonstration-default',
                actions: [taylorChoice('flat'), taylorBound(false)],
                expectedState: text(
                    'Prikazana je gladka funkcija \\(e^{-1/x}\\) za \\(x>0\\) okoli \\(c=0\\) s polinomom stopnje \\(n=3\\) v \\(x=1\\); ocena napake je skrita.',
                    'The smooth function \\(e^{-1/x}\\) for \\(x>0\\) about \\(c=0\\) is shown with the polynomial of degree \\(n=3\\) at \\(x=1\\); the error bound is hidden.',
                ),
            },
        },
        {
            id: 'taylor-free-exploration', order: 7,
            title: text('Približek ni vrsta in samostojno raziskovanje', 'An approximation is not a series, and free exploration'),
            purpose: text('Ločiti končni približek od konvergence vrste in preiti v samostojno raziskovanje.', 'Separating the finite approximation from convergence of the series and handing over to free exploration.'),
            explanation: text(
                'Pri \\(f(x)=e^{-1/x}\\) je \\(T_n(1)=0\\) pri vsakem \\(n\\), \\(f(1)=e^{-1}\\approx0{,}3679\\), napaka pa je pri vsaki stopnji \\(0{,}3679\\). Vsi koeficienti v \\(0\\) so \\(0\\), vrsta je identično \\(0\\) in konvergira, a k \\(0\\), ne k \\(f\\). Ocena napake ni prikazana: odvodi v \\(c=0\\) so vsi \\(0\\), zato iz njih ne dobimo meje za ostanek, mejo za \\(|f^{(n+1)}|\\) bi morali poiskati iz odvodov drugje, tega pa aplikacija ne modelira. Ločimo torej dvoje: končni polinom \\(T_n\\) vedno obstaja, kako dobro približa \\(f\\) v \\(x\\), pa pove napaka ali, kadar jo imamo, ocena; neskončna vrsta pa konvergira povsod pri \\(e^x\\) in \\(\\sin x\\), pri \\(\\frac{1}{1-x}\\) le za \\(|x-c|<1-c\\), pri tej funkciji pa k napačni vrednosti. Zdaj raziskuj sam: zamenjaj primer, premakni \\(c\\) in \\(x\\), spreminjaj stopnjo in napovej napako, preden pokažeš oceno.',
                'For \\(f(x)=e^{-1/x}\\), \\(T_n(1)=0\\) for every \\(n\\), \\(f(1)=e^{-1}\\approx0.3679\\), and the error is \\(0.3679\\) at every degree. All coefficients at \\(0\\) are \\(0\\), the series is identically \\(0\\) and converges, but to \\(0\\), not to \\(f\\). The error bound is not shown: the derivatives at \\(c=0\\) are all \\(0\\) and give no limit for the remainder; a limit for \\(|f^{(n+1)}|\\) would have to come from derivatives elsewhere, which the app does not model. So two things are kept apart: the finite polynomial \\(T_n\\) always exists, and how well it approximates \\(f\\) at \\(x\\) is told by the error or, where there is one, the bound; the infinite series converges everywhere for \\(e^x\\) and \\(\\sin x\\), for \\(\\frac{1}{1-x}\\) only for \\(|x-c|<1-c\\), and for this function to the wrong value. Now explore on your own: change the example, move \\(c\\) and \\(x\\), change the degree and predict the error before you show the bound.',
            ),
            formulaIds: ['taylor-flat', 'taylor-lagrange'], workedExampleId: 'taylor-flat-example', learnerInteraction: 'adjust-construction-parameter',
            frames: [frame('taylor-free-explanation', 'explanation'), frame('taylor-free-calculation', 'calculation'), frame('taylor-free-observation', 'observation')],
            observationPrompt: text(
                'Preberi, zakaj ocena napake ni prikazana. Nato skrij oceno, izberi drug primer ali središče in napovej, preden jo spet pokažeš.',
                'Read why the error bound is not shown. Then hide the bound, choose another example or center and predict before you show it again.',
            ),
            expectedObservations: [text(
                'Pri \\(n=3\\) je \\(T_n(1)=0\\), napaka je \\(f(1)\\approx0{,}3679\\), pri oceni napake piše, da je ni, in stanje pojasni razlog; vrsta konvergira k \\(0\\), ne k \\(f\\).',
                'At \\(n=3\\), \\(T_n(1)=0\\) and the error is \\(f(1)\\approx0.3679\\); the bound row says there is none and the status explains why; the series converges to \\(0\\), not to \\(f\\).',
            )],
            scene: {
                id: 'taylor-free-scene', basedOn: 'demonstration-default',
                actions: [taylorChoice('flat'), taylorBound(true)],
                expectedState: text(
                    'Prikazana je gladka funkcija \\(e^{-1/x}\\) okoli \\(c=0\\) z \\(T_3(1)=0\\); ocena napake je zahtevana, a ni na voljo.',
                    'The smooth function \\(e^{-1/x}\\) about \\(c=0\\) is shown with \\(T_3(1)=0\\); the error bound is requested but not available.',
                ),
            },
        },
    ],
    sources: [
        {
            id: 'globevnik-brojan-analiza-1-taylor',
            citation: 'Globevnik, J., Brojan, M. Analiza I, Fakulteta za matematiko in fiziko, Univerza v Ljubljani, §§7.1 and 7.3 (printed pp. 251–260).',
            supports: ['the Taylor polynomial of degree n about c is the sum of f^(k)(c)/k! (x - c)^k for k = 0..n', 'the remainder has the Lagrange form f^(n+1)(xi)/(n+1)! (x - c)^(n+1) for some xi between c and x', 'the Taylor series of a function need not converge to the function'],
        },
        {
            id: 'bezeg-taylor-implementation',
            citation: 'Bezeg source: src/analysis/taylor.ts, src/analysis/taylorModel.ts and src/graphs/functions/TaylorGraph.tsx.',
            supports: ['e^x about 0 at x = 1 has T_1(1) = 2, T_3(1) = 8/3 and T_6(1) = 1957/720 with error bound e/7! >= the actual error', 'sin x about 0 at x = 2 has T_3(2) = 2/3, error about 0.2426 and bound 2^4/4! = 2/3 (M = 1)', '1/(1 - x) about 0 at x = -1.5 has error (-1.5)^(n+1)/2.5, with absolute values 0.9, 2.025 and about 4.556 at n = 1, 3, 5', 'the flat function has T_n = 0 for every n and f(1) = e^-1 > 0, and no derivative bound is offered'],
            implementationCorrespondence: 'Coefficients are closed forms, never symbolic differentiation; T_n is evaluated in Horner form and the error as f(x) - T_n(x); the Lagrange bound uses M = max(e^c, e^x) for e^x, M = 1 for sin x and (n+1)!/(1 - max(c, x))^(n+2) for 1/(1 - x), and none for the flat function; the convergence interval |x - c| < 1 - c is shown for 1/(1 - x) only; a lesson scene applies set-function-parameter, set-function-choice and show-function-element actions through the same setters as the controls in one synchronous tick.',
        },
    ],
    edgeCases: [
        text(
            'Središče, točka \\(x\\) ali stopnja zunaj območja primera (stopnja je celo število od \\(0\\) do \\(10\\); pri \\(\\frac{1}{1-x}\\) središče \\(c\\in[-1;0{,}5]\\) in \\(x\\le0{,}95\\); pri gladki funkciji je središče stalno \\(0\\)) se zavrnejo, model ostane nespremenjen, datoteka s takšno vrednostjo pa se ne uvozi in pove, kaj popraviti.',
            'A center, point \\(x\\) or degree outside the range of the example (the degree is an integer from \\(0\\) to \\(10\\); for \\(\\frac{1}{1-x}\\) the center \\(c\\in[-1,0.5]\\) and \\(x\\le0.95\\); for the smooth function the center is fixed at \\(0\\)) is rejected and the model stays unchanged; a file with such a value is not imported and says what to correct.',
        ),
        text(
            'Pri \\(x\\) na robu konvergenčnega intervala, \\(x=2c-1\\), vrsta \\(\\frac{1}{1-x}\\) ne konvergira, zato aplikacija piše, da je \\(x\\) zunaj; napaka tam z večanjem stopnje ne pada.',
            'At \\(x\\) on the edge of the convergence interval, \\(x=2c-1\\), the series of \\(\\frac{1}{1-x}\\) does not converge, so the app says that \\(x\\) is outside; the error there does not fall as the degree grows.',
        ),
        text(
            'Napake pod \\(10^{-12}\\) so zaradi zaokroževanja prikazane kot \\(0\\); ocena napake je vedno vsaj tako velika kot dejanska napaka, kadar je prikazana.',
            'Errors below \\(10^{-12}\\) are shown as \\(0\\) because of rounding; the bound, when shown, is always at least as large as the actual error.',
        ),
    ],
    unresolvedQuestions: [
        text(
            'Pred pregledom za uporabo v razredu je treba potrditi razdelka §7.1 in §7.3 ter strani v viru (povzeto po poročilu o kandidatih, ne preverjeno v PDF) in ali naj lekcija doda še Peanovo obliko ostanka ter Taylorjeve vrste z drugimi središči.',
            'Before classroom-ready review, confirm the sections §7.1 and §7.3 and their pages in the source (taken from the candidate report, not checked in the PDF) and whether the lesson should also add the Peano form of the remainder and Taylor series about other centers.',
        ),
    ],
};

const sequenceChoice = (value: SequenceExampleId): SceneAction => ({
    name: 'set-function-choice', value: {name: 'sequence-example', value},
});
const sequenceCertificate = (visible: boolean): SceneAction => ({
    name: 'show-function-element', value: {name: 'sequence-certificate', value: visible},
});
/** The scene shows `count` revealed terms (a scene starts from the default scene, which shows one term). */
const terms = (count: number): SceneAction[] => Array.from({length: count - 1}, () => ({name: 'run-sequence-command', value: 'next-step'}));

const sequence: GuidedLesson = {
    demonstrationId: 'sequence',
    title: text('Konvergenca zaporedja: ε in N', 'Convergence of a sequence: ε and N'),
    summary: text(
        'Zaporedje \\(a_n\\) konvergira k \\(L\\), če za vsak \\(\\varepsilon>0\\) obstaja \\(N\\), od katerega naprej vsi členi ležijo v pasu širine \\(2\\varepsilon\\) okoli \\(L\\). Certifikat izhaja iz obrazca zaporedja, ne iz prikazanih členov, končno okno členov pa konvergence ne dokaže.',
        'A sequence \\(a_n\\) converges to \\(L\\) if for every \\(\\varepsilon>0\\) there is an \\(N\\) from which on all terms lie in the band of width \\(2\\varepsilon\\) around \\(L\\). The certificate comes from the formula of the sequence, not from the shown terms, and a finite window of terms does not prove convergence.',
    ),
    prerequisites: [
        text('Potrebno je razumevanje zaporedja z indeksom \\(n\\ge1\\) in njegovih členov \\(a_n\\).', 'Assumes an understanding of a sequence with index \\(n\\ge1\\) and its terms \\(a_n\\).'),
        text('Potrebno je poznavanje absolutne vrednosti kot razdalje \\(|a-b|\\) in računanja z neenačbami.', 'Assumes familiarity with the absolute value as the distance \\(|a-b|\\) and with working with inequalities.'),
    ],
    learningGoals: [
        text(
            'Pri \\(a_n=\\frac1n\\) in \\(\\varepsilon=0{,}1\\) ugotoviš, da \\(N=5\\) ne deluje (pri \\(n=5\\) je \\(a_5=0{,}2\\)), da \\(N=10\\) ne deluje (\\(a_{10}=0{,}1\\) je na robu pasu) in da je najmanjši delujoči \\(N\\) enak \\(11\\).',
            'For \\(a_n=\\frac1n\\) and \\(\\varepsilon=0.1\\) find that \\(N=5\\) does not work (at \\(n=5\\), \\(a_5=0.2\\)), that \\(N=10\\) does not work (\\(a_{10}=0.1\\) is on the edge of the band) and that the least working \\(N\\) is \\(11\\).',
        ),
        text(
            'Z obrazcem \\(\\left\\lfloor\\frac1\\varepsilon\\right\\rfloor+1\\) izračunaš \\(N=101\\) za \\(\\varepsilon=0{,}01\\), čeprav je to onkraj vseh prikazanih členov, in razložiš, zakaj certifikat kljub temu velja.',
            'Use the formula \\(\\left\\lfloor\\frac1\\varepsilon\\right\\rfloor+1\\) to compute \\(N=101\\) for \\(\\varepsilon=0.01\\), even though it lies beyond all shown terms, and explain why the certificate still holds.',
        ),
        text(
            'Razložiš, zakaj končno okno členov ni certifikat: pri \\((-1)^n\\), \\(L=0\\) in \\(\\varepsilon>1\\) so vsi členi v pasu, a zaporedje ne konvergira, pri \\(n\\) pa nobeden \\(N\\) ne deluje.',
            'Explain why a finite window of terms is no certificate: for \\((-1)^n\\), \\(L=0\\) and \\(\\varepsilon>1\\) all terms lie in the band while the sequence does not converge, and for \\(n\\) no \\(N\\) works.',
        ),
        text(
            'Ločiš pravo limito od kandidata \\(L\\), ki ni limita.',
            'Tell the true limit from a candidate \\(L\\) that is not the limit.',
        ),
    ],
    formulaBlocks: [
        {
            id: 'sequence-definition',
            latex: 'a_n\\to L\\iff\\forall\\,\\varepsilon>0\\ \\exists\\,N',
            notation: text(
                'Zapis \\(a_n\\to L\\) pomeni, da zaporedje konvergira k \\(L\\); \\(\\forall\\) pomeni »za vsak«, \\(\\exists\\) pa »obstaja«; \\(N\\) je prag, od katerega naprej so členi blizu \\(L\\).',
                'The notation \\(a_n\\to L\\) means that the sequence converges to \\(L\\); \\(\\forall\\) means "for every" and \\(\\exists\\) means "there is"; \\(N\\) is the threshold from which on the terms are close to \\(L\\).',
            ),
            explanation: text(
                'Vrstni red kvantifikatorjev je pomemben: najprej je izbran \\(\\varepsilon\\), šele nato poiščemo \\(N\\), ki je odvisen od \\(\\varepsilon\\). Pogoj \\(|a_n-L|<\\varepsilon\\) pomeni, da \\(a_n\\) leži v pasu \\((L-\\varepsilon,L+\\varepsilon)\\), in mora veljati za vsak \\(n\\ge N\\), ne le za nekatere.',
                'The order of the quantifiers matters: first \\(\\varepsilon\\) is chosen, only then do we look for an \\(N\\), which may depend on \\(\\varepsilon\\). The condition \\(|a_n-L|<\\varepsilon\\) means that \\(a_n\\) lies in the band \\((L-\\varepsilon,L+\\varepsilon)\\), and it must hold for every \\(n\\ge N\\), not only for some.',
            ),
        },
        {
            id: 'sequence-definition-condition',
            latex: '\\forall\\,n\\ge N:\\ |a_n-L|<\\varepsilon',
            notation: text(
                'Pogoj \\(|a_n-L|<\\varepsilon\\) pove, da je člen \\(a_n\\) od \\(L\\) oddaljen za manj kot \\(\\varepsilon\\); veljati mora za vsak indeks \\(n\\ge N\\).',
                'The condition \\(|a_n-L|<\\varepsilon\\) says that the term \\(a_n\\) is closer to \\(L\\) than \\(\\varepsilon\\); it must hold for every index \\(n\\ge N\\).',
            ),
            explanation: text(
                'Pogoj mora veljati za vse \\(n\\ge N\\), ne le za nekatere: zato od indeksa \\(N\\) naprej \\(a_n\\) leži v pasu \\((L-\\varepsilon,L+\\varepsilon)\\).',
                'The condition must hold for all \\(n\\ge N\\), not only for some: so from the index \\(N\\) on, \\(a_n\\) lies in the band \\((L-\\varepsilon,L+\\varepsilon)\\).',
            ),
        },
        {
            id: 'sequence-reciprocal-threshold',
            latex: '\\begin{aligned}n\\ge N&\\Longrightarrow\\left|\\tfrac1n-0\\right|\\le\\tfrac1N,\\\\\\tfrac1N<\\varepsilon&\\iff N\\varepsilon>1,\\\\N_{\\min}&=\\left\\lfloor\\tfrac1\\varepsilon\\right\\rfloor+1\\end{aligned}',
            notation: text(
                'Velja za \\(a_n=\\frac1n\\) in \\(a_n=\\frac{(-1)^n}{n}\\) z \\(L=0\\), saj je v obeh primerih \\(|a_n-0|=\\frac1n\\). Število \\(N_{\\min}\\) je najmanjši delujoči prag.',
                'It holds for \\(a_n=\\frac1n\\) and \\(a_n=\\frac{(-1)^n}{n}\\) with \\(L=0\\), because in both cases \\(|a_n-0|=\\frac1n\\). The number \\(N_{\\min}\\) is the least working threshold.',
            ),
            explanation: text(
                'Za \\(n\\ge N\\) je \\(\\frac1n\\le\\frac1N\\), \\(N\\) pa deluje natanko tedaj, ko je \\(\\frac1N<\\varepsilon\\), to je \\(N\\varepsilon>1\\). Najmanjše celo število, ki to izpolni, je \\(\\left\\lfloor\\frac1\\varepsilon\\right\\rfloor+1\\); če je \\(\\frac1\\varepsilon\\) celo število, ga sam \\(\\frac1\\varepsilon\\) ne izpolni, ker je neenakost stroga.',
                'For \\(n\\ge N\\) we have \\(\\frac1n\\le\\frac1N\\), and \\(N\\) works exactly when \\(\\frac1N<\\varepsilon\\), that is \\(N\\varepsilon>1\\). The least integer that satisfies it is \\(\\left\\lfloor\\frac1\\varepsilon\\right\\rfloor+1\\); if \\(\\frac1\\varepsilon\\) is an integer, \\(\\frac1\\varepsilon\\) itself does not satisfy it, because the inequality is strict.',
            ),
        },
        {
            id: 'sequence-oscillating',
            latex: 'a_n\\in\\{-1,1\\}',
            notation: text(
                'Zaporedje \\((-1)^n\\) zavzame samo vrednosti \\(-1\\) in \\(1\\).',
                'The sequence \\((-1)^n\\) takes only the values \\(-1\\) and \\(1\\).',
            ),
            explanation: text(
                'Vsaka od obeh vrednosti se pojavi za vsakim \\(N\\).',
                'Each of the two values appears beyond every \\(N\\).',
            ),
        },
        {
            id: 'sequence-oscillating-distance',
            latex: '\\max\\{|1-L|,\\,|-1-L|\\}=1+|L|',
            notation: text(
                'Večja od razdalj teh dveh vrednosti do \\(L\\) je \\(1+|L|\\).',
                'The larger of the distances of these two values to \\(L\\) is \\(1+|L|\\).',
            ),
            explanation: text(
                'Vsaka od vrednosti se pojavi za vsakim \\(N\\). Če je \\(\\varepsilon\\le1+|L|\\), tista, ki je dlje od \\(L\\), ni v pasu, zato noben \\(N\\) ne deluje. Šele ko je \\(\\varepsilon>1+|L|\\), sta obe v pasu, a to je en sam \\(\\varepsilon\\) in ne dokazuje konvergence.',
                'Each of the values appears beyond every \\(N\\). If \\(\\varepsilon\\le1+|L|\\), the one farther from \\(L\\) is not in the band, so no \\(N\\) works. Only when \\(\\varepsilon>1+|L|\\) are both in the band, but that is a single \\(\\varepsilon\\) and does not prove convergence.',
            ),
        },
        {
            id: 'sequence-unbounded',
            latex: 'a_n=n>L+\\varepsilon\\quad\\text{for every}\\ n>L+\\varepsilon',
            notation: text(
                'Za poljuben \\(L\\) in \\(\\varepsilon>0\\) členi \\(a_n=n\\) od nekega indeksa naprej presežejo zgornji rob pasu.',
                'For any \\(L\\) and \\(\\varepsilon>0\\) the terms \\(a_n=n\\) exceed the upper edge of the band from some index on.',
            ),
            explanation: text(
                'Od indeksa \\(\\lfloor L+\\varepsilon\\rfloor+1\\) naprej je vsak člen nad pasom, zato noben \\(N\\) ne deluje in zaporedje ne konvergira k nobenemu \\(L\\).',
                'From the index \\(\\lfloor L+\\varepsilon\\rfloor+1\\) on, every term is above the band, so no \\(N\\) works and the sequence converges to no \\(L\\).',
            ),
        },
    ],
    workedExamples: [
        {
            id: 'sequence-reciprocal-example',
            title: text('Zaporedje \\(\\frac1n\\) pri \\(\\varepsilon=0{,}1\\)', 'The sequence \\(\\frac1n\\) at \\(\\varepsilon=0.1\\)'),
            calculationLatex: '\\varepsilon=\\tfrac1{10}:\\qquad N\\varepsilon>1\\iff N>10,\\qquad N_{\\min}=\\left\\lfloor10\\right\\rfloor+1=11',
            resultLatex: '\\left|a_{10}\\right|=\\tfrac1{10}=\\varepsilon,\\qquad\\left|a_n\\right|\\le\\tfrac1{11}<\\tfrac1{10}\\ \\ (n\\ge11)',
            check: text(
                'Člen \\(a_{10}=0{,}1\\) je natanko na robu pasu, pas pa je odprt, zato \\(N=10\\) ne deluje. Od \\(n=11\\) naprej velja \\(a_n\\le\\frac1{11}\\approx0{,}0909<0{,}1\\); od dvanajstih prikazanih členov sta v pasu \\(a_{11}\\) in \\(a_{12}\\). Pri \\(\\varepsilon=0{,}01\\) bi bil \\(N_{\\min}=101\\).',
                'The term \\(a_{10}=0.1\\) lies exactly on the edge of the band, and the band is open, so \\(N=10\\) does not work. From \\(n=11\\) on we have \\(a_n\\le\\frac1{11}\\approx0.0909<0.1\\); of the twelve shown terms, \\(a_{11}\\) and \\(a_{12}\\) are in the band. At \\(\\varepsilon=0.01\\) we would have \\(N_{\\min}=101\\).',
            ),
        },
    ],
    steps: [
        {
            id: 'sequence-definition-step', order: 1,
            title: text('Definicija z \\(\\varepsilon\\) in \\(N\\)', 'The definition with \\(\\varepsilon\\) and \\(N\\)'),
            purpose: text('Povezati kvantifikatorje definicije s pasom in napovedati prag \\(N\\), preden se pokaže certifikat.', 'Linking the quantifiers of the definition to the band and predicting the threshold \\(N\\) before the certificate is shown.'),
            explanation: text(
                'Zaporedje \\(a_n=\\frac1n\\) ima neskončno mnogo členov: \\(1\\), \\(\\frac12\\), \\(\\frac13\\), … Kandidat za limito je \\(L=0\\). Definicija pravi: za vsak \\(\\varepsilon>0\\) obstaja \\(N\\), da je \\(|a_n-L|<\\varepsilon\\) za vsak \\(n\\ge N\\). Najprej je izbran \\(\\varepsilon\\), šele nato iščemo \\(N\\), ki je odvisen od njega, pogoj pa mora veljati za vse \\(n\\ge N\\). Na grafu je zeleno osenčen pas med \\(L-\\varepsilon\\) in \\(L+\\varepsilon\\), pri izbranem \\(\\varepsilon=0{,}1\\) torej med \\(-0{,}1\\) in \\(0{,}1\\). Člen v pasu je poln krogec, člen izven njega križec. Prikazanih je prvih osem členov, nobeden ni v pasu, certifikat pa je skrit.',
                'The sequence \\(a_n=\\frac1n\\) has infinitely many terms: \\(1\\), \\(\\frac12\\), \\(\\frac13\\), … The candidate limit is \\(L=0\\). The definition says: for every \\(\\varepsilon>0\\) there is an \\(N\\) such that \\(|a_n-L|<\\varepsilon\\) for every \\(n\\ge N\\). First \\(\\varepsilon\\) is chosen, only then do we look for an \\(N\\) that depends on it, and the condition must hold for all \\(n\\ge N\\). The graph shows the band between \\(L-\\varepsilon\\) and \\(L+\\varepsilon\\) shaded, so for the chosen \\(\\varepsilon=0.1\\) between \\(-0.1\\) and \\(0.1\\). A term inside the band is a filled circle, a term outside it a cross. The first eight terms are shown, none is in the band, and the certificate is hidden.',
            ),
            formulaIds: ['sequence-definition', 'sequence-definition-condition'], learnerInteraction: 'adjust-construction-parameter',
            frames: [frame('sequence-definition-explanation', 'explanation'), frame('sequence-definition-observation', 'observation')],
            observationPrompt: text(
                'Napovej, ali bo \\(N=5\\) deloval za \\(\\varepsilon=0{,}1\\), torej ali je \\(|a_n|<0{,}1\\) za vsak \\(n\\ge5\\); poskusi tudi druge vrednosti v polju Prag N in šele nato pritisni Pokaži certifikat.',
                'Predict whether \\(N=5\\) works for \\(\\varepsilon=0.1\\), that is whether \\(|a_n|<0.1\\) for every \\(n\\ge5\\); also try other values in the Threshold N field, and only then press Show certificate.',
            ),
            expectedObservations: [
                text(
                    'Prikazanih je osem členov, nobeden ni v pasu; certifikat je skrit.',
                    'Eight terms are shown, none is in the band; the certificate is hidden.',
                ),
                text(
                    'Pri \\(N=5\\) certifikat pove, da \\(N\\) ne deluje: pri \\(n=5\\) je \\(|a_5|=0{,}2\\ge\\varepsilon\\); najmanjši delujoči \\(N\\) je \\(11\\).',
                    'At \\(N=5\\) the certificate says that \\(N\\) does not work: at \\(n=5\\), \\(|a_5|=0.2\\ge\\varepsilon\\); the least working \\(N\\) is \\(11\\).',
                ),
            ],
            scene: {
                id: 'sequence-definition-scene', basedOn: 'demonstration-default',
                actions: [...terms(8), sequenceCertificate(false)],
                expectedState: text(
                    'Prikazano je zaporedje \\(\\frac1n\\) z \\(\\varepsilon=0{,}1\\), \\(L=0\\) in \\(N=5\\); prikazanih je osem členov, nobeden ni v pasu, certifikat je skrit.',
                    'The sequence \\(\\frac1n\\) is shown with \\(\\varepsilon=0.1\\), \\(L=0\\) and \\(N=5\\); eight terms are shown, none is in the band, and the certificate is hidden.',
                ),
            },
        },
        {
            id: 'sequence-threshold-step', order: 2,
            title: text('Najmanjši delujoči \\(N\\) za \\(\\varepsilon=0{,}1\\)', 'The least working \\(N\\) for \\(\\varepsilon=0.1\\)'),
            purpose: text('Primerjati napoved s certifikatom, izračunanim po obrazcu.', 'Comparing the prediction with the certificate computed from the formula.'),
            explanation: text(
                'Pri \\(N=5\\) je certifikat povedal, da \\(N\\) ne deluje: pri \\(n=5\\) je člen \\(0{,}2\\) izven pasu. Zdaj je izbran \\(N=11\\) in certifikat je prikazan. Za \\(n\\ge N\\) velja \\(\\left|\\frac1n-0\\right|\\le\\frac1N\\), neenakost \\(\\frac1N<\\varepsilon\\) pa je enakovredna \\(N\\varepsilon>1\\). Pri \\(N=11\\) je \\(N\\varepsilon=1{,}1>1\\), zato \\(11\\) deluje. Pri \\(N=10\\) je \\(N\\varepsilon=1\\), kar ni več od \\(1\\): člen \\(a_{10}=0{,}1\\) leži natanko na robu pasu, pas pa je odprt, zato \\(10\\) ne deluje. Najmanjši delujoči \\(N\\) je torej \\(\\left\\lfloor\\frac1\\varepsilon\\right\\rfloor+1=11\\). Od dvanajstih prikazanih členov sta v pasu zadnja dva; certifikat pa velja za vsak \\(n\\ge11\\), tudi za neprikazane člene.',
                'At \\(N=5\\) the certificate said that \\(N\\) does not work: at \\(n=5\\) the term \\(0.2\\) is outside the band. Now \\(N=11\\) is chosen and the certificate is shown. For \\(n\\ge N\\) we have \\(\\left|\\frac1n-0\\right|\\le\\frac1N\\), and the inequality \\(\\frac1N<\\varepsilon\\) is equivalent to \\(N\\varepsilon>1\\). At \\(N=11\\), \\(N\\varepsilon=1.1>1\\), so \\(11\\) works. At \\(N=10\\), \\(N\\varepsilon=1\\), which is not more than \\(1\\): the term \\(a_{10}=0.1\\) lies exactly on the edge of the band, and the band is open, so \\(10\\) does not work. The least working \\(N\\) is therefore \\(\\left\\lfloor\\frac1\\varepsilon\\right\\rfloor+1=11\\). Of the twelve shown terms the last two are in the band; the certificate holds for every \\(n\\ge11\\), also for terms that are not shown.',
            ),
            formulaIds: ['sequence-definition', 'sequence-definition-condition', 'sequence-reciprocal-threshold'], workedExampleId: 'sequence-reciprocal-example', learnerInteraction: 'adjust-construction-parameter',
            frames: [frame('sequence-threshold-explanation', 'explanation'), frame('sequence-threshold-calculation', 'calculation'), frame('sequence-threshold-observation', 'observation')],
            observationPrompt: text(
                'Preberi najmanjši delujoči \\(N\\) in oceno v odčitkih. Nato v polje vnesi \\(N=10\\), preberi, zakaj ne deluje, in se vrni na \\(N=11\\).',
                'Read the least working \\(N\\) and the bound in the readouts. Then enter \\(N=10\\) in the field, read why it does not work, and return to \\(N=11\\).',
            ),
            expectedObservations: [text(
                'Pri \\(N=11\\) certifikat pove, da \\(N\\) deluje; najmanjši delujoči \\(N\\) je \\(11\\), ocena je \\(\\frac1{11}\\approx0{,}0909\\), v pasu sta \\(2\\) od \\(12\\) prikazanih členov. Pri \\(N=10\\) certifikat pove, da \\(N\\) ne deluje, ker je \\(|a_{10}|=0{,}1=\\varepsilon\\).',
                'At \\(N=11\\) the certificate says that \\(N\\) works; the least working \\(N\\) is \\(11\\), the bound is \\(\\frac1{11}\\approx0.0909\\), and \\(2\\) of the \\(12\\) shown terms are in the band. At \\(N=10\\) the certificate says that \\(N\\) does not work, because \\(|a_{10}|=0.1=\\varepsilon\\).',
            )],
            scene: {
                id: 'sequence-threshold-scene', basedOn: 'demonstration-default',
                actions: [...terms(12), parameter('sequence-threshold', 11), sequenceCertificate(true)],
                expectedState: text(
                    'Prikazano je zaporedje \\(\\frac1n\\) z \\(\\varepsilon=0{,}1\\), \\(L=0\\) in \\(N=11\\); prikazanih je dvanajst členov, od tega dva v pasu, certifikat je prikazan.',
                    'The sequence \\(\\frac1n\\) is shown with \\(\\varepsilon=0.1\\), \\(L=0\\) and \\(N=11\\); twelve terms are shown, two of them in the band, and the certificate is shown.',
                ),
            },
        },
        {
            id: 'sequence-small-epsilon-step', order: 3,
            title: text('Manjši \\(\\varepsilon\\): \\(N\\) onkraj prikazanih členov', 'A smaller \\(\\varepsilon\\): \\(N\\) beyond the shown terms'),
            purpose: text('Napovedati prag po obrazcu in videti, da certifikat velja tudi za člene, ki jih ni na grafu.', 'Predicting the threshold from the formula and seeing that the certificate holds also for terms that are not on the graph.'),
            explanation: text(
                'Pri \\(\\varepsilon=0{,}1\\) je \\(N=11\\) deloval in je bil najmanjši delujoči. Zdaj je \\(\\varepsilon=0{,}01\\), pas je desetkrat ožji. Prikazanih je vseh štirideset členov, ki jih aplikacija nariše, in noben ni v pasu: najmanjši, \\(a_{40}=0{,}025\\), je še vedno nad \\(0{,}01\\). Po obrazcu je \\(N_{\\min}=\\left\\lfloor\\frac1\\varepsilon\\right\\rfloor+1=101\\), to je daleč onkraj prikazanih členov. Ali certifikata zato ni mogoče izdati? Mogoče je: izhaja iz obrazca \\(a_n=\\frac1n\\), ne iz prikazanih členov, in velja za vsak \\(n\\ge N\\), tudi za člene, ki jih ne vidimo. Končno okno členov, ki ga narišemo, pa nikoli ni dokaz.',
                'At \\(\\varepsilon=0.1\\), \\(N=11\\) worked and was the least working one. Now \\(\\varepsilon=0.01\\) and the band is ten times narrower. All forty terms the app draws are shown and none is in the band: the smallest, \\(a_{40}=0.025\\), is still above \\(0.01\\). By the formula \\(N_{\\min}=\\left\\lfloor\\frac1\\varepsilon\\right\\rfloor+1=101\\), far beyond the shown terms. Does that mean no certificate can be given? It can: it comes from the formula \\(a_n=\\frac1n\\), not from the shown terms, and it holds for every \\(n\\ge N\\), also for terms we cannot see. A finite window of terms that we draw, however, is never a proof.',
            ),
            formulaIds: ['sequence-reciprocal-threshold'], learnerInteraction: 'adjust-construction-parameter',
            frames: [frame('sequence-small-epsilon-explanation', 'explanation'), frame('sequence-small-epsilon-observation', 'observation')],
            observationPrompt: text(
                'Po obrazcu izračunaj najmanjši delujoči \\(N\\) za \\(\\varepsilon=0{,}01\\), napovej, ali bo med prikazanimi členi, vnesi ga v polje Prag N in šele nato pritisni Pokaži certifikat. Nato vnesi še \\(N=100\\).',
                'Compute the least working \\(N\\) for \\(\\varepsilon=0.01\\) from the formula, predict whether it will be among the shown terms, enter it in the Threshold N field, and only then press Show certificate. Then also enter \\(N=100\\).',
            ),
            expectedObservations: [
                text(
                    'Prikazanih je štirideset členov, nobeden ni v pasu; certifikat je skrit.',
                    'Forty terms are shown, none is in the band; the certificate is hidden.',
                ),
                text(
                    'Pri \\(N=101\\) certifikat pove, da \\(N\\) deluje; najmanjši delujoči \\(N\\) je \\(101\\), onkraj vseh štirideset prikazanih členov, ocena je \\(\\frac1{101}\\approx0{,}0099\\). Pri \\(N=100\\) ne deluje, ker je \\(|a_{100}|=0{,}01=\\varepsilon\\).',
                    'At \\(N=101\\) the certificate says that \\(N\\) works; the least working \\(N\\) is \\(101\\), beyond all forty shown terms, and the bound is \\(\\frac1{101}\\approx0.0099\\). At \\(N=100\\) it does not work, because \\(|a_{100}|=0.01=\\varepsilon\\).',
                ),
            ],
            scene: {
                id: 'sequence-small-epsilon-scene', basedOn: 'demonstration-default',
                actions: [parameter('sequence-epsilon', 0.01), ...terms(40), sequenceCertificate(false)],
                expectedState: text(
                    'Prikazano je zaporedje \\(\\frac1n\\) z \\(\\varepsilon=0{,}01\\), \\(L=0\\) in \\(N=5\\); prikazanih je štirideset členov, nobeden ni v pasu, certifikat je skrit.',
                    'The sequence \\(\\frac1n\\) is shown with \\(\\varepsilon=0.01\\), \\(L=0\\) and \\(N=5\\); forty terms are shown, none is in the band, and the certificate is hidden.',
                ),
            },
        },
        {
            id: 'sequence-alternating-step', order: 4,
            title: text('Izmenično zaporedje \\(\\frac{(-1)^n}{n}\\)', 'The alternating sequence \\(\\frac{(-1)^n}{n}\\)'),
            purpose: text('Ugotoviti, da prag določa razdalja do limite in ne predznak člena.', 'Finding that the distance to the limit, not the sign of the term, determines the threshold.'),
            explanation: text(
                'Pri \\(\\varepsilon=0{,}01\\) je \\(N=101\\) deloval, čeprav je onkraj prikazanih členov: obrazec \\(\\left|\\frac1n-0\\right|\\le\\frac1N<\\varepsilon\\) velja za vsak \\(n\\ge101\\). Zdaj členi menjajo predznak: \\(a_n=\\frac{(-1)^n}{n}\\) je \\(-1\\), \\(\\frac12\\), \\(-\\frac13\\), … in leži zdaj pod, zdaj nad \\(L=0\\). Definicija pa meri razdaljo \\(|a_n-L|\\), ta je enaka \\(\\frac1n\\) kot prej, zato je enak tudi najmanjši delujoči \\(N=\\left\\lfloor\\frac1\\varepsilon\\right\\rfloor+1\\). Opazujemo \\(\\varepsilon=0{,}1\\); prikazanih je dvanajst členov, v pasu sta zadnja dva.',
                'At \\(\\varepsilon=0.01\\), \\(N=101\\) worked although it is beyond the shown terms: the formula \\(\\left|\\frac1n-0\\right|\\le\\frac1N<\\varepsilon\\) holds for every \\(n\\ge101\\). Now the terms change sign: \\(a_n=\\frac{(-1)^n}{n}\\) is \\(-1\\), \\(\\frac12\\), \\(-\\frac13\\), … and lies now below, now above \\(L=0\\). The definition, however, measures the distance \\(|a_n-L|\\), which equals \\(\\frac1n\\) as before, so the least working \\(N=\\left\\lfloor\\frac1\\varepsilon\\right\\rfloor+1\\) is the same too. We look at \\(\\varepsilon=0.1\\); twelve terms are shown, the last two are in the band.',
            ),
            formulaIds: ['sequence-reciprocal-threshold'], learnerInteraction: 'adjust-construction-parameter',
            frames: [frame('sequence-alternating-explanation', 'explanation'), frame('sequence-alternating-observation', 'observation')],
            observationPrompt: text(
                'Napovej, ali je najmanjši delujoči \\(N\\) pri \\(\\varepsilon=0{,}1\\) enak kot pri \\(\\frac1n\\); vnesi ga v polje Prag N in šele nato pritisni Pokaži certifikat.',
                'Predict whether the least working \\(N\\) at \\(\\varepsilon=0.1\\) is the same as for \\(\\frac1n\\); enter it in the Threshold N field, and only then press Show certificate.',
            ),
            expectedObservations: [
                text(
                    'Prikazanih je dvanajst členov, ki se izmenjujejo okoli \\(0\\); v pasu sta \\(2\\) od \\(12\\); certifikat je skrit.',
                    'Twelve terms are shown, alternating around \\(0\\); \\(2\\) of \\(12\\) are in the band; the certificate is hidden.',
                ),
                text(
                    'Pri \\(N=11\\) certifikat pove, da \\(N\\) deluje; najmanjši delujoči \\(N\\) je \\(11\\), enak kot pri \\(\\frac1n\\).',
                    'At \\(N=11\\) the certificate says that \\(N\\) works; the least working \\(N\\) is \\(11\\), the same as for \\(\\frac1n\\).',
                ),
            ],
            scene: {
                id: 'sequence-alternating-scene', basedOn: 'demonstration-default',
                actions: [sequenceChoice('alternating-reciprocal'), ...terms(12), sequenceCertificate(false)],
                expectedState: text(
                    'Prikazano je zaporedje \\(\\frac{(-1)^n}{n}\\) z \\(\\varepsilon=0{,}1\\), \\(L=0\\) in \\(N=5\\); prikazanih je dvanajst členov, od tega dva v pasu, certifikat je skrit.',
                    'The sequence \\(\\frac{(-1)^n}{n}\\) is shown with \\(\\varepsilon=0.1\\), \\(L=0\\) and \\(N=5\\); twelve terms are shown, two of them in the band, and the certificate is hidden.',
                ),
            },
        },
        {
            id: 'sequence-oscillation-step', order: 5,
            title: text('Zaporedje \\((-1)^n\\): končno okno ni certifikat', 'The sequence \\((-1)^n\\): a finite window is no certificate'),
            purpose: text('Ločiti pas, ki zajame prikazane člene, od certifikata konvergence.', 'Separating a band that contains the shown terms from a certificate of convergence.'),
            explanation: text(
                'Pri \\(\\frac{(-1)^n}{n}\\) je razdalja do \\(0\\) enaka kot pri \\(\\frac1n\\), zato je enak tudi prag. Zaporedje \\(a_n=(-1)^n\\) pa zavzame le vrednosti \\(-1\\) in \\(1\\), vsaka se ponovi za vsakim \\(N\\). Pri \\(L=0\\) in \\(\\varepsilon=1{,}5\\) sta obe vrednosti v pasu, zato je vseh dvanajst prikazanih členov znotraj. Zaporedje kljub temu ne konvergira k \\(0\\): ta \\(\\varepsilon\\) je izpolnjen, definicija pa zahteva \\(N\\) za vsak \\(\\varepsilon>0\\). Za \\(\\varepsilon\\le1\\) nobena od vrednosti ni v pasu. Splošno je od vrednosti \\(-1\\) in \\(1\\) tista, ki je dlje od \\(L\\), oddaljena za \\(1+|L|\\), zato noben \\(N\\) ne deluje, kadar je \\(\\varepsilon\\le1+|L|\\). Pas, ki zajame končno okno členov, torej ni dokaz.',
                'For \\(\\frac{(-1)^n}{n}\\) the distance to \\(0\\) is the same as for \\(\\frac1n\\), so the threshold is the same. The sequence \\(a_n=(-1)^n\\), however, takes only the values \\(-1\\) and \\(1\\), and each recurs beyond every \\(N\\). At \\(L=0\\) and \\(\\varepsilon=1.5\\) both values are in the band, so all twelve shown terms are inside. The sequence still does not converge to \\(0\\): this \\(\\varepsilon\\) is satisfied, but the definition requires an \\(N\\) for every \\(\\varepsilon>0\\). For \\(\\varepsilon\\le1\\) neither value is in the band. In general, the one of the values \\(-1\\) and \\(1\\) that is farther from \\(L\\) is at distance \\(1+|L|\\), so no \\(N\\) works when \\(\\varepsilon\\le1+|L|\\). A band that contains a finite window of terms is therefore no proof.',
            ),
            formulaIds: ['sequence-oscillating', 'sequence-oscillating-distance'], learnerInteraction: 'adjust-construction-parameter',
            frames: [frame('sequence-oscillation-explanation', 'explanation'), frame('sequence-oscillation-observation', 'observation')],
            observationPrompt: text(
                'Napovej, ali pas, ki zajame vseh dvanajst prikazanih členov, dokazuje konvergenco k \\(0\\); pritisni Pokaži certifikat, nato zmanjšaj \\(\\varepsilon\\) na \\(0{,}5\\) in preberi razliko v stanju.',
                'Predict whether a band that contains all twelve shown terms proves convergence to \\(0\\); press Show certificate, then lower \\(\\varepsilon\\) to \\(0.5\\) and read the difference in the status.',
            ),
            expectedObservations: [
                text(
                    'Pri \\(\\varepsilon=1{,}5\\) je vseh \\(12\\) od \\(12\\) prikazanih členov v pasu; certifikat je skrit.',
                    'At \\(\\varepsilon=1.5\\) all \\(12\\) of the \\(12\\) shown terms are in the band; the certificate is hidden.',
                ),
                text(
                    'Po pritisku na Pokaži certifikat stanje pove, da je izpolnjen le ta \\(\\varepsilon\\); pri \\(\\varepsilon=0{,}5\\) pove, da certifikata ni, ker sta vrednosti \\(-1\\) in \\(1\\) izven pasu (razdalja \\(1\\ge\\varepsilon\\)), in nobeden od dvanajstih členov ni v pasu.',
                    'After Show certificate the status says that only this \\(\\varepsilon\\) is satisfied; at \\(\\varepsilon=0.5\\) it says there is no certificate, because the values \\(-1\\) and \\(1\\) are outside the band (distance \\(1\\ge\\varepsilon\\)), and none of the twelve terms is in the band.',
                ),
            ],
            scene: {
                id: 'sequence-oscillation-scene', basedOn: 'demonstration-default',
                actions: [sequenceChoice('alternating-sign'), parameter('sequence-epsilon', 1.5), ...terms(12), sequenceCertificate(false)],
                expectedState: text(
                    'Prikazano je zaporedje \\((-1)^n\\) z \\(\\varepsilon=1{,}5\\), \\(L=0\\) in \\(N=5\\); prikazanih je dvanajst členov, vsi v pasu, certifikat je skrit.',
                    'The sequence \\((-1)^n\\) is shown with \\(\\varepsilon=1.5\\), \\(L=0\\) and \\(N=5\\); twelve terms are shown, all in the band, and the certificate is hidden.',
                ),
            },
        },
        {
            id: 'sequence-unbounded-step', order: 6,
            title: text('Zaporedje \\(n\\): členi pas zapustijo', 'The sequence \\(n\\): the terms leave the band'),
            purpose: text('Napovedati, da pri neomejenem zaporedju noben kandidat \\(L\\) ne deluje.', 'Predicting that for an unbounded sequence no candidate \\(L\\) works.'),
            explanation: text(
                'Pri \\((-1)^n\\) vrednosti ostanejo omejene, a se ne ustalijo. Zaporedje \\(a_n=n\\) pa raste čez vse meje. Za poljuben \\(L\\) in \\(\\varepsilon>0\\) velja \\(a_n=n>L+\\varepsilon\\) za vsak \\(n>L+\\varepsilon\\), zato členi pas za vedno zapustijo in noben \\(N\\) ne deluje. Opazujemo \\(L=0\\) in \\(\\varepsilon=0{,}5\\): že prvi člen \\(a_1=1\\) je izven pasu in nobeden od dvanajstih prikazanih členov ni v njem. Pri nobenem drugem kandidatu \\(L\\) ni drugače, saj člen \\(n\\) prej ali slej preseže \\(L+\\varepsilon\\).',
                'For \\((-1)^n\\) the values stay bounded but do not settle. The sequence \\(a_n=n\\) grows beyond all bounds. For any \\(L\\) and \\(\\varepsilon>0\\) we have \\(a_n=n>L+\\varepsilon\\) for every \\(n>L+\\varepsilon\\), so the terms leave the band for good and no \\(N\\) works. We look at \\(L=0\\) and \\(\\varepsilon=0.5\\): already the first term \\(a_1=1\\) is outside the band and none of the twelve shown terms is in it. No other candidate \\(L\\) changes that, since the term \\(n\\) sooner or later exceeds \\(L+\\varepsilon\\).',
            ),
            formulaIds: ['sequence-unbounded'], learnerInteraction: 'adjust-construction-parameter',
            frames: [frame('sequence-unbounded-explanation', 'explanation'), frame('sequence-unbounded-observation', 'observation')],
            observationPrompt: text(
                'Napovej, ali kak \\(N\\) deluje, če kandidata \\(L\\) premakneš na \\(2\\); pritisni Pokaži certifikat in preberi, od katerega indeksa naprej členi trajno zapustijo pas.',
                'Predict whether any \\(N\\) works if you move the candidate \\(L\\) to \\(2\\); press Show certificate and read from which index on the terms leave the band for good.',
            ),
            expectedObservations: [
                text(
                    'Pri \\(L=0\\) in \\(\\varepsilon=0{,}5\\) nobeden od dvanajstih prikazanih členov ni v pasu; certifikat je skrit.',
                    'At \\(L=0\\) and \\(\\varepsilon=0.5\\) none of the twelve shown terms is in the band; the certificate is hidden.',
                ),
                text(
                    'Stanje pove, da je \\(a_n=n\\) večji od \\(L+\\varepsilon\\) za vsak \\(n\\ge1\\); po premiku na \\(L=2\\) za vsak \\(n\\ge3\\); noben \\(N\\) ne deluje.',
                    'The status says that \\(a_n=n\\) exceeds \\(L+\\varepsilon\\) for every \\(n\\ge1\\); after moving to \\(L=2\\), for every \\(n\\ge3\\); no \\(N\\) works.',
                ),
            ],
            scene: {
                id: 'sequence-unbounded-scene', basedOn: 'demonstration-default',
                actions: [sequenceChoice('natural'), ...terms(12), sequenceCertificate(false)],
                expectedState: text(
                    'Prikazano je zaporedje \\(n\\) z \\(\\varepsilon=0{,}5\\), \\(L=0\\) in \\(N=5\\); prikazanih je dvanajst členov, nobeden ni v pasu, certifikat je skrit.',
                    'The sequence \\(n\\) is shown with \\(\\varepsilon=0.5\\), \\(L=0\\) and \\(N=5\\); twelve terms are shown, none is in the band, and the certificate is hidden.',
                ),
            },
        },
        {
            id: 'sequence-free-exploration', order: 7,
            title: text('Kandidat za limito in samostojno raziskovanje', 'A candidate limit, and free exploration'),
            purpose: text('Ločiti limito od kandidata \\(L\\) in preiti v samostojno raziskovanje.', 'Separating the limit from a candidate \\(L\\) and handing over to free exploration.'),
            explanation: text(
                'Pri \\(a_n=n\\) noben \\(L\\) ne deluje. Pri konvergentnem zaporedju je kandidat \\(L\\) pomemben: certifikat velja le za pravo limito. Pri \\(\\frac1n\\) je limita \\(0\\); če izberemo \\(L=0{,}5\\), pas okoli \\(0{,}5\\) pri dovolj majhnem \\(\\varepsilon\\) ne zajame členov od nobenega \\(N\\) naprej, zato aplikacija pove, da \\(L\\) ni limita. Povzetek: konvergenca je trditev o vseh členih od \\(N\\) naprej za vsak \\(\\varepsilon\\); obrazec zaporedja jo utemelji, prikazani členi pa je ne dokažejo. Zdaj raziskuj sam: izberi primer, spreminjaj \\(\\varepsilon\\), \\(L\\) in \\(N\\), pritisni Naslednji korak ali Predvajaj in napovej, preden pokažeš certifikat.',
                'For \\(a_n=n\\) no \\(L\\) works. For a convergent sequence the candidate \\(L\\) matters: the certificate holds only for the true limit. For \\(\\frac1n\\) the limit is \\(0\\); if we choose \\(L=0.5\\), the band around \\(0.5\\) with a small enough \\(\\varepsilon\\) does not contain the terms from any \\(N\\) on, so the app says that \\(L\\) is not the limit. In summary: convergence is a statement about all terms from \\(N\\) on, for every \\(\\varepsilon\\); the formula of the sequence justifies it and the shown terms do not prove it. Now explore on your own: choose an example, change \\(\\varepsilon\\), \\(L\\) and \\(N\\), press Next step or Play, and predict before you show the certificate.',
            ),
            formulaIds: ['sequence-definition', 'sequence-definition-condition'], learnerInteraction: 'adjust-construction-parameter',
            frames: [frame('sequence-free-explanation', 'explanation'), frame('sequence-free-observation', 'observation')],
            observationPrompt: text(
                'Napovej, ali je \\(L=0{,}5\\) limita zaporedja \\(\\frac1n\\); vnesi ga v polje in pritisni Pokaži certifikat. Nato skrij certifikat, izberi drug primer in napovej, preden ga spet pokažeš.',
                'Predict whether \\(L=0.5\\) is the limit of the sequence \\(\\frac1n\\); enter it in the field and press Show certificate. Then hide the certificate, choose another example and predict before you show it again.',
            ),
            expectedObservations: [text(
                'Pri \\(N=11\\), \\(\\varepsilon=0{,}1\\) in \\(L=0\\) certifikat pove, da \\(N\\) deluje; pri \\(L=0{,}5\\) pove, da \\(L\\) ni limita in da je limita \\(0\\).',
                'At \\(N=11\\), \\(\\varepsilon=0.1\\) and \\(L=0\\) the certificate says that \\(N\\) works; at \\(L=0.5\\) it says that \\(L\\) is not the limit and that the limit is \\(0\\).',
            )],
            scene: {
                id: 'sequence-free-scene', basedOn: 'demonstration-default',
                actions: [parameter('sequence-threshold', 11), ...terms(12), sequenceCertificate(false)],
                expectedState: text(
                    'Prikazano je zaporedje \\(\\frac1n\\) z \\(\\varepsilon=0{,}1\\), \\(L=0\\) in \\(N=11\\); prikazanih je dvanajst členov, certifikat je skrit.',
                    'The sequence \\(\\frac1n\\) is shown with \\(\\varepsilon=0.1\\), \\(L=0\\) and \\(N=11\\); twelve terms are shown, and the certificate is hidden.',
                ),
            },
        },
    ],
    sources: [
        {
            id: 'globevnik-brojan-analiza-1-sequences',
            citation: 'Globevnik, J., Brojan, M. Analiza I, Fakulteta za matematiko in fiziko, Univerza v Ljubljani, §§2.4 and 2.5 (printed pp. 36–44).',
            supports: ['a sequence a_n converges to L if for every epsilon > 0 there is an N such that |a_n - L| < epsilon for every n >= N', 'the order of the quantifiers: epsilon first, then N depending on epsilon', 'the sequence (-1)^n does not converge', 'a sequence that is not bounded does not converge'],
        },
        {
            id: 'bezeg-sequence-implementation',
            citation: 'Bezeg source: src/analysis/sequence.ts, src/analysis/sequenceModel.ts and src/graphs/functions/SequenceGraph.tsx.',
            supports: ['1/n and (-1)^n/n have |a_n - 0| = 1/n, so N works exactly when N epsilon > 1 and the least working N is floor(1/epsilon) + 1: 11 for epsilon = 0.1 and 101 for epsilon = 0.01', 'a_10 = 0.1 = epsilon is on the edge of the band and outside the open band', '(-1)^n has the farther of the values 1 and -1 at distance 1 + |L| from L, so no N works for epsilon <= 1 + |L|; for L = 0 and epsilon = 1.5 all terms are in the band', 'a_n = n exceeds L + epsilon for every n > L + epsilon, so no N works'],
            implementationCorrespondence: 'Epsilon is handled as an integer count of hundredths, so N epsilon > 1 and N_min are exact integer arithmetic; the certificate is computed from the formula of the named example and never from the shown terms (the revealed terms only decide what is drawn and whether N lies beyond them); a lesson scene applies set-function-parameter, set-function-choice, show-function-element and run-sequence-command actions through the same setters as the controls in one synchronous tick.',
        },
    ],
    edgeCases: [
        text(
            'Širina pasu \\(\\varepsilon\\) mora biti večkratnik števila \\(0{,}01\\) med \\(0{,}01\\) in \\(2\\), kandidat \\(L\\) število med \\(-2\\) in \\(2\\), prag \\(N\\) celo število od \\(1\\) do \\(1000\\); vrednost zunaj območja se zavrne, model ostane nespremenjen, datoteka s takšno vrednostjo pa se ne uvozi in pove, kaj popraviti.',
            'The band width \\(\\varepsilon\\) must be a multiple of \\(0.01\\) between \\(0.01\\) and \\(2\\), the candidate \\(L\\) a number between \\(-2\\) and \\(2\\), the threshold \\(N\\) an integer from \\(1\\) to \\(1000\\); a value outside the range is rejected and the model stays unchanged, and a file with such a value is not imported and says what to correct.',
        ),
        text(
            'Člen na robu pasu, \\(|a_n-L|=\\varepsilon\\), ni v pasu, ker je neenakost v definiciji stroga; pri \\(\\varepsilon=0{,}1\\) je zato \\(N=10\\) prenizek, \\(N=11\\) pa zadostuje.',
            'A term on the edge of the band, \\(|a_n-L|=\\varepsilon\\), is not in the band, because the inequality in the definition is strict; at \\(\\varepsilon=0.1\\), \\(N=10\\) is therefore too small and \\(N=11\\) suffices.',
        ),
        text(
            'Aplikacija nariše največ štirideset členov, prag \\(N\\) pa je lahko do \\(1000\\) in tudi onkraj prikazanih členov; certifikat je vedno izračunan iz obrazca zaporedja, nikoli iz prikazanih členov.',
            'The app draws at most forty terms, while the threshold \\(N\\) can be up to \\(1000\\) and also lie beyond the shown terms; the certificate is always computed from the formula of the sequence, never from the shown terms.',
        ),
        text(
            'Pri \\((-1)^n\\) en sam \\(\\varepsilon>1+|L|\\) zajame vse člene, a konvergence ne dokaže; za \\(\\varepsilon\\le1+|L|\\) noben \\(N\\) ne deluje.',
            'For \\((-1)^n\\) a single \\(\\varepsilon>1+|L|\\) contains all terms but does not prove convergence; for \\(\\varepsilon\\le1+|L|\\) no \\(N\\) works.',
        ),
    ],
    unresolvedQuestions: [
        text(
            'Pred pregledom za uporabo v razredu je treba potrditi razdelka §2.4 in §2.5 ter strani v viru (povzeto po poročilu o kandidatih, ne preverjeno v PDF) in ali naj lekcija doda še enoličnost limite, omejenost konvergentnega zaporedja in Cauchyjev pogoj.',
            'Before classroom-ready review, confirm the sections §2.4 and §2.5 and their pages in the source (taken from the candidate report, not checked in the PDF) and whether the lesson should also add the uniqueness of the limit, the boundedness of a convergent sequence and the Cauchy condition.',
        ),
    ],
};

const fixedPointChoice = (value: FixedPointExampleId): SceneAction => ({
    name: 'set-function-choice', value: {name: 'fixed-point-example', value},
});
const fixedPointBound = (visible: boolean): SceneAction => ({
    name: 'show-function-element', value: {name: 'fixed-point-bound', value: visible},
});
/** The scene shows the state after `count` iteration steps (a scene starts from the default scene at step 0). */
const iterates = (count: number): SceneAction[] => Array.from({length: count}, () => ({name: 'run-fixed-point-command', value: 'next-step'}));

const fixedPoint: GuidedLesson = {
    demonstrationId: 'fixed-point',
    title: text('Negibna točka in iteracija', 'Fixed-point iteration and contractions'),
    summary: text(
        'Iteracija \\(x_{k+1}=T(x_k)\\) se na grafu kaže kot pajkova mreža med krivuljo \\(y=T(x)\\) in diagonalo \\(y=x\\). Če \\(T\\) zaprt interval \\([a;\\,b]\\) slika vase in je skrčitev s faktorjem \\(q<1\\), ima natanko eno negibno točko, iteracija iz vsakega začetka konvergira k njej in veljata oceni napake a priori in a posteriori. Ustavitev pri pragu ali enaki zaokroženi vrednosti ne dokažeta, da je približek natančna negibna točka. Če pogoji ne držijo, izrek ne daje zaključka, kar ni isto kot divergenca: pri \\(1-x\\) vidimo dvocikel.',
        'The iteration \\(x_{k+1}=T(x_k)\\) appears on the graph as a cobweb between the curve \\(y=T(x)\\) and the diagonal \\(y=x\\). If \\(T\\) maps a closed interval \\([a,b]\\) into itself and is a contraction with factor \\(q<1\\), it has exactly one fixed point, the iteration converges to it from every start, and the a priori and a posteriori error bounds hold. Stopping at a threshold or seeing equal rounded values does not prove that an iterate is an exact fixed point. If the hypotheses fail, the theorem gives no conclusion, which is not the same as divergence: for \\(1-x\\) we see a two-cycle.',
    ),
    prerequisites: [
        text(
            'Potrebno je razumevanje sestavljanja funkcij, \\(T(T(x))\\), in konvergence zaporedja (lekcija o konvergenci zaporedja).',
            'Assumes an understanding of composition of functions, \\(T(T(x))\\), and of convergence of a sequence (the sequence convergence lesson).',
        ),
        text(
            'Potrebno je poznavanje izreka o povprečni vrednosti: odvod omejuje razliko \\(|T(x)-T(y)|\\).',
            'Assumes familiarity with the mean value theorem: the derivative bounds the difference \\(|T(x)-T(y)|\\).',
        ),
    ],
    learningGoals: [
        text(
            'Pri \\(T(x)=\\frac{x+1}{2}\\) iz \\(x_0=0\\) napoveš \\(x_2=\\frac34\\) in razložiš pajkovo mrežo kot navpično in nato vodoravno črto.',
            'For \\(T(x)=\\frac{x+1}{2}\\) from \\(x_0=0\\) predict \\(x_2=\\frac34\\) and explain the cobweb as a vertical and then a horizontal segment.',
        ),
        text(
            'Navedeš pogoje izreka (zaprt interval, \\(T([a;\\,b])\\subseteq[a;\\,b]\\), \\(q<1\\)) in jih preveriš pri \\(\\frac{x+1}{2}\\) in \\(\\cos x\\).',
            'State the hypotheses of the theorem (a closed interval, \\(T([a,b])\\subseteq[a,b]\\), \\(q<1\\)) and check them for \\(\\frac{x+1}{2}\\) and \\(\\cos x\\).',
        ),
        text(
            'Uporabiš oceni a priori in a posteriori ter pojasniš, zakaj ustavitev pri pragu ali enaki zaokroženi vrednosti ne dokaže natančne negibne točke.',
            'Use the a priori and a posteriori bounds and explain why stopping at a threshold or equal rounded values does not prove an exact fixed point.',
        ),
        text(
            'Razložiš dvocikel pri \\(1-x\\) in zakaj nedržanje pogoja izreka ne dokazuje divergence.',
            'Explain the two-cycle of \\(1-x\\) and why a failing hypothesis does not prove divergence.',
        ),
    ],
    formulaBlocks: [
        {
            id: 'fixed-point-iteration',
            latex: 'x_{k+1}=T(x_k),\\qquad T(x^*)=x^*',
            notation: text(
                'Zaporedje \\(x_k\\) je iteracija preslikave \\(T\\) z začetkom \\(x_0\\); točka \\(x^*\\) je negibna točka, rešitev enačbe \\(T(x)=x\\).',
                'The sequence \\(x_k\\) is the iteration of the map \\(T\\) from the start \\(x_0\\); the point \\(x^*\\) is a fixed point, a solution of \\(T(x)=x\\).',
            ),
            explanation: text(
                'Negibna točka je presečišče krivulje \\(y=T(x)\\) z diagonalo \\(y=x\\). Pajkova mreža iz točke \\((x_k,x_k)\\) na diagonali gre navpično do krivulje, v točko \\((x_k,T(x_k))\\), nato vodoravno nazaj do diagonale, v točko \\((x_{k+1},x_{k+1})\\).',
                'A fixed point is an intersection of the curve \\(y=T(x)\\) with the diagonal \\(y=x\\). The cobweb goes from the point \\((x_k,x_k)\\) on the diagonal vertically to the curve, to \\((x_k,T(x_k))\\), and then horizontally back to the diagonal, to \\((x_{k+1},x_{k+1})\\).',
            ),
        },
        {
            id: 'fixed-point-contraction',
            latex: 'T([a,b])\\subseteq[a,b]',
            notation: text(
                'Interval \\([a;\\,b]\\) je zaprt, torej poln; pogoj pravi, da \\(T\\) interval slika vase.',
                'The interval \\([a,b]\\) is closed, hence complete; the condition says that \\(T\\) maps the interval into itself.',
            ),
            explanation: text(
                'Brez tega pogoja bi iteracija lahko zapustila interval, na katerem velja drugi pogoj.',
                'Without this condition the iteration could leave the interval on which the second condition holds.',
            ),
        },
        {
            id: 'fixed-point-contraction-factor',
            latex: '|T(x)-T(y)|\\le q\\,|x-y|,\\quad q<1',
            notation: text(
                'Drugi pogoj pravi, da je \\(T\\) skrčitev s faktorjem \\(q\\).',
                'The second condition says that \\(T\\) is a contraction with factor \\(q\\).',
            ),
            explanation: text(
                'Po izreku o povprečni vrednosti drugi pogoj sledi iz \\(|T\'(x)|\\le q\\) na intervalu. Takrat ima \\(T\\) na \\([a;\\,b]\\) natanko eno negibno točko in iteracija iz vsakega začetka v \\([a;\\,b]\\) konvergira k njej. Pri \\(\\frac{x+1}{2}\\) je \\(q=\\frac12\\), pri \\(\\cos x\\) na \\([0;\\,1]\\) pa \\(q=\\sin 1\\).',
                'By the mean value theorem the second condition follows from \\(|T\'(x)|\\le q\\) on the interval. Then \\(T\\) has exactly one fixed point in \\([a,b]\\) and the iteration converges to it from every start in \\([a,b]\\). For \\(\\frac{x+1}{2}\\) we have \\(q=\\frac12\\), and for \\(\\cos x\\) on \\([0,1]\\) we have \\(q=\\sin 1\\).',
            ),
        },
        {
            id: 'fixed-point-bounds',
            latex: '\\begin{aligned}|x_k-x^*|&\\le\\frac{q^k}{1-q}\\,|x_1-x_0|,\\\\|x_k-x^*|&\\le\\frac{q}{1-q}\\,|x_k-x_{k-1}|\\end{aligned}',
            notation: text(
                'Prva ocena je a priori: zadošča začetek in prvi korak. Druga je a posteriori: zadošča zadnji korak. Obe sta zagotovljeni le, kadar je \\(T\\) skrčitev na zaprtem intervalu, ki ga slika vase.',
                'The first bound is a priori: the start and the first step are enough. The second is a posteriori: the last step is enough. Both are guaranteed only when \\(T\\) is a contraction on a closed interval that it maps into itself.',
            ),
            explanation: text(
                'Ocena je zgornja meja napake in ne njena vrednost: dejanska napaka je lahko veliko manjša. Prag \\(10^{-d}\\) v aplikaciji ustavi iteracijo, ko je ocena a posteriori manjša od njega.',
                'A bound is an upper limit for the error, not its value: the actual error may be much smaller. The threshold \\(10^{-d}\\) in the app stops the iteration when the a posteriori bound falls below it.',
            ),
        },
        {
            id: 'fixed-point-reflection',
            latex: 'T(x)=1-x,\\qquad T(T(x))=x',
            notation: text(
                'Preslikava \\(1-x\\) slika \\([0;\\,1]\\) vase in zamenja krajišči, njena negibna točka je \\(\\frac12\\).',
                'The map \\(1-x\\) maps \\([0,1]\\) into itself and swaps the endpoints; its fixed point is \\(\\frac12\\).',
            ),
            explanation: text(
                'Iz \\(T(T(x))=x\\) neposredno vidimo, da iz začetka \\(x_0\\ne\\frac12\\) iteracija izmenično zavzema \\(x_0\\) in \\(1-x_0\\).',
                'From \\(T(T(x))=x\\) we see directly that from a start \\(x_0\\ne\\frac12\\) the iteration alternates between \\(x_0\\) and \\(1-x_0\\).',
            ),
        },
        {
            id: 'fixed-point-reflection-derivative',
            latex: '|T\'(x)|=1',
            notation: text(
                'Absolutna vrednost odvoda \\(T\'(x)=-1\\) je \\(1\\), zato \\(T\\) ni skrčitev.',
                'The derivative \\(T\'(x)=-1\\) has absolute value \\(1\\), so \\(T\\) is not a contraction.',
            ),
            explanation: text(
                'Ker je \\(|T\'(x)|=1\\), ni \\(q<1\\) in izrek o skrčitvi ne da zaključka ali ocene.',
                'Since \\(|T\'(x)|=1\\), there is no \\(q<1\\) and the contraction theorem gives no conclusion and no bound.',
            ),
        },
    ],
    workedExamples: [
        {
            id: 'fixed-point-affine-example',
            title: text('Preslikava \\(\\frac{x+1}{2}\\) iz \\(x_0=0\\) pri pragu \\(10^{-3}\\)', 'The map \\(\\frac{x+1}{2}\\) from \\(x_0=0\\) at the threshold \\(10^{-3}\\)'),
            calculationLatex: 'x_k=1-2^{-k},\\qquad\\frac{q}{1-q}\\,|x_k-x_{k-1}|=2^{-k}',
            resultLatex: '2^{-10}=\\tfrac1{1024}<10^{-3}\\le\\tfrac1{512}=2^{-9}',
            check: text(
                'Pri \\(q=\\frac12\\) je \\(\\frac{q}{1-q}=1\\) in \\(|x_k-x_{k-1}|=2^{-k}\\), zato je ocena a posteriori enaka \\(2^{-k}\\), prav toliko pa je tudi dejanska napaka \\(|x_k-1|\\). Pri \\(k=9\\) je \\(2^{-9}\\approx0{,}00195\\) še nad pragom, pri \\(k=10\\) je \\(2^{-10}\\approx0{,}000977\\) pod njim, zato se iteracija ustavi pri koraku \\(10\\). Pri koraku \\(3\\) je ocena \\(0{,}125\\).',
                'With \\(q=\\frac12\\) we have \\(\\frac{q}{1-q}=1\\) and \\(|x_k-x_{k-1}|=2^{-k}\\), so the a posteriori bound equals \\(2^{-k}\\), and so does the actual error \\(|x_k-1|\\). At \\(k=9\\), \\(2^{-9}\\approx0.00195\\) is still above the threshold, at \\(k=10\\), \\(2^{-10}\\approx0.000977\\) is below it, so the iteration stops at step \\(10\\). At step \\(3\\) the bound is \\(0.125\\).',
            ),
        },
    ],
    steps: [
        {
            id: 'fixed-point-cobweb-step', order: 1,
            title: text('Negibna točka in pajkova mreža', 'A fixed point and the cobweb'),
            purpose: text('Povezati iteracijo \\(x_{k+1}=T(x_k)\\) s presečiščem krivulje in diagonale ter z risanjem pajkove mreže.', 'Linking the iteration \\(x_{k+1}=T(x_k)\\) to the intersection of the curve and the diagonal and to the way the cobweb is drawn.'),
            explanation: text(
                'Preslikava \\(T(x)=\\frac{x+1}{2}\\) slika interval \\([0;\\,2]\\) vase. Negibna točka \\(x^*\\) reši \\(T(x^*)=x^*\\): na grafu je to presečišče krivulje \\(y=T(x)\\) z diagonalo \\(y=x\\), označeno s križcem, tu \\(x^*=1\\). Iteracija izhaja iz začetka \\(x_0\\) in računa \\(x_{k+1}=T(x_k)\\); vsak približek je vrednost sestavljene preslikave, \\(x_2=T(T(x_0))\\), zaporedje \\(x_k\\) pa je običajno zaporedje, zato je njegova konvergenca isto vprašanje kot v lekciji o zaporedjih. Pajkova mreža iz točke \\((x_k,x_k)\\) na diagonali gre navpično do krivulje, nato vodoravno nazaj do diagonale. Zdaj je prikazan le začetek \\(x_0=0\\) pri koraku \\(0\\); korak \\(0\\) še nima črt.',
                'The map \\(T(x)=\\frac{x+1}{2}\\) maps the interval \\([0,2]\\) into itself. A fixed point \\(x^*\\) solves \\(T(x^*)=x^*\\): on the graph it is the intersection of the curve \\(y=T(x)\\) with the diagonal \\(y=x\\), marked by a cross, here \\(x^*=1\\). The iteration starts at \\(x_0\\) and computes \\(x_{k+1}=T(x_k)\\); every iterate is a value of a composed map, \\(x_2=T(T(x_0))\\), and the sequence \\(x_k\\) is an ordinary sequence, so its convergence is the same question as in the lesson on sequences. The cobweb goes from the point \\((x_k,x_k)\\) on the diagonal vertically to the curve and then horizontally back to the diagonal. Now only the start \\(x_0=0\\) is shown at step \\(0\\); step \\(0\\) has no segments yet.',
            ),
            formulaIds: ['fixed-point-iteration'], learnerInteraction: 'adjust-construction-parameter',
            frames: [frame('fixed-point-cobweb-explanation', 'explanation'), frame('fixed-point-cobweb-observation', 'observation')],
            observationPrompt: text(
                'Poišči križec na diagonali in preberi, kje je negibna točka. Izračunaj \\(T(0)\\) in napovej, kje bo končala prva navpična črta, nato pritisni Naslednji korak.',
                'Find the cross on the diagonal and read where the fixed point is. Compute \\(T(0)\\) and predict where the first vertical segment ends, then press Next step.',
            ),
            expectedObservations: [
                text(
                    'Križec je pri \\(x^*=1\\); začetek je \\(x_0=0\\), korak je \\(0\\), črt mreže še ni.',
                    'The cross is at \\(x^*=1\\); the start is \\(x_0=0\\), the step is \\(0\\) and there are no cobweb segments yet.',
                ),
                text(
                    'Po pritisku na Naslednji korak je korak \\(1\\) in \\(x_1=T(0)=\\frac12\\): navpična črta od \\((0,0)\\) do \\((0,\\frac12)\\), vodoravna do \\((\\frac12,\\frac12)\\).',
                    'After Next step the step is \\(1\\) and \\(x_1=T(0)=\\frac12\\): a vertical segment from \\((0,0)\\) to \\((0,\\frac12)\\), a horizontal one to \\((\\frac12,\\frac12)\\).',
                ),
            ],
            scene: {
                id: 'fixed-point-cobweb-scene', basedOn: 'demonstration-default',
                actions: [fixedPointBound(false)],
                expectedState: text(
                    'Prikazana je preslikava \\(\\frac{x+1}{2}\\) na \\([0;\\,2]\\) z začetkom \\(x_0=0\\), korakom \\(0\\), natančnostjo \\(d=3\\) in skrito oceno napake.',
                    'The map \\(\\frac{x+1}{2}\\) on \\([0,2]\\) is shown with the start \\(x_0=0\\), step \\(0\\), tolerance \\(d=3\\) and a hidden error bound.',
                ),
            },
        },
        {
            id: 'fixed-point-next-iterate-step', order: 2,
            title: text('Napoved naslednjega približka', 'Predicting the next iterate'),
            purpose: text('Napovedati naslednji približek iz grafa, preden ga aplikacija izračuna.', 'Predicting the next iterate from the graph before the app computes it.'),
            explanation: text(
                'Prvi korak je dal \\(x_1=\\frac12\\). Naslednji približek je \\(x_2=T(x_1)\\): iz točke \\((\\frac12,\\frac12)\\) na diagonali gremo navpično do krivulje, nato vodoravno do diagonale. Višina krivulje pri \\(x=\\frac12\\) je \\(T(\\frac12)\\), ta višina pa je tudi novi približek. Napovej ga, preden pritisneš Naslednji korak, nato pritisni še enkrat in napovej \\(x_3\\). Opazuj tudi razdaljo do negibne točke \\(1\\): pri \\(x_1\\) je \\(\\frac12\\), pri \\(x_2\\) manj.',
                'The first step gave \\(x_1=\\frac12\\). The next iterate is \\(x_2=T(x_1)\\): from the point \\((\\frac12,\\frac12)\\) on the diagonal we go vertically to the curve and then horizontally to the diagonal. The height of the curve at \\(x=\\frac12\\) is \\(T(\\frac12)\\), and that height is also the new iterate. Predict it before you press Next step, then press again and predict \\(x_3\\). Also watch the distance to the fixed point \\(1\\): at \\(x_1\\) it is \\(\\frac12\\), at \\(x_2\\) it is less.',
            ),
            formulaIds: ['fixed-point-iteration'], learnerInteraction: 'adjust-construction-parameter',
            frames: [frame('fixed-point-next-explanation', 'explanation'), frame('fixed-point-next-observation', 'observation')],
            observationPrompt: text(
                'Napovej \\(x_2\\) in to, ali je razdalja do negibne točke po tem koraku večja ali manjša; šele nato pritisni Naslednji korak. Nato napovej še \\(x_3\\).',
                'Predict \\(x_2\\) and whether the distance to the fixed point is larger or smaller after this step; only then press Next step. Then predict \\(x_3\\) as well.',
            ),
            expectedObservations: [
                text(
                    'Prikazan je korak \\(1\\) z \\(x_1=0{,}5\\); ocena napake je skrita.',
                    'Step \\(1\\) is shown with \\(x_1=0.5\\); the error bound is hidden.',
                ),
                text(
                    'Po prvem pritisku je \\(x_2=T(\\frac12)=0{,}75\\), navpična črta do \\((\\frac12,\\frac34)\\), vodoravna do \\((\\frac34,\\frac34)\\); po drugem je \\(x_3=0{,}875\\). Razdalja do \\(1\\) se vsakič razpolovi: \\(0{,}5\\), \\(0{,}25\\), \\(0{,}125\\).',
                    'After the first press \\(x_2=T(\\frac12)=0.75\\), a vertical segment to \\((\\frac12,\\frac34)\\), a horizontal one to \\((\\frac34,\\frac34)\\); after the second \\(x_3=0.875\\). The distance to \\(1\\) halves every time: \\(0.5\\), \\(0.25\\), \\(0.125\\).',
                ),
            ],
            scene: {
                id: 'fixed-point-next-scene', basedOn: 'demonstration-default',
                actions: [...iterates(1), fixedPointBound(false)],
                expectedState: text(
                    'Prikazana je preslikava \\(\\frac{x+1}{2}\\) z začetkom \\(x_0=0\\) pri koraku \\(1\\), \\(x_1=0{,}5\\), z natančnostjo \\(d=3\\) in skrito oceno napake.',
                    'The map \\(\\frac{x+1}{2}\\) is shown with the start \\(x_0=0\\) at step \\(1\\), \\(x_1=0.5\\), tolerance \\(d=3\\) and a hidden error bound.',
                ),
            },
        },
        {
            id: 'fixed-point-contraction-step', order: 3,
            title: text('Skrčitev \\(q=\\frac12\\), ocena in prag', 'The contraction \\(q=\\frac12\\), the bound and the threshold'),
            purpose: text('Povezati faktor skrčitve z razpolavljanjem napake, z ocenama napake in s pragom, pri katerem se iteracija ustavi.', 'Linking the contraction factor to the halving of the error, to the error bounds and to the threshold at which the iteration stops.'),
            explanation: text(
                'Pri \\(T(x)=\\frac{x+1}{2}\\) je \\(|T\'(x)|=\\frac12\\), zato po izreku o povprečni vrednosti razdalja slik \\(|T(x)-T(y)|\\) ni večja od \\(q|x-y|\\) s \\(q=\\frac12\\). Skupaj s tem, da \\(T\\) zaprt interval \\([0;\\,2]\\) slika vase (slika je \\([\\frac12;\\,\\frac32]\\)), je to skrčitev. Zato ima natanko eno negibno točko in iteracija iz vsakega začetka konvergira k njej. Ocena napake je zdaj prikazana: pri koraku \\(3\\) sta obe oceni enaki \\(0{,}125\\), enako pa je tudi dejanska napaka, ker je \\(x_k=1-2^{-k}\\). Debela črta na osi \\(x\\) je interval okoli \\(x_3\\), ki gotovo vsebuje \\(x^*\\). Pri pragu \\(10^{-3}\\) se iteracija ustavi, ko je ocena a posteriori manjša od njega, to je pri koraku \\(10\\). To pove, da je napaka pod pragom, ne da je približek natančno \\(1\\).',
                'For \\(T(x)=\\frac{x+1}{2}\\) we have \\(|T\'(x)|=\\frac12\\), so by the mean value theorem the distance of the images \\(|T(x)-T(y)|\\) is at most \\(q|x-y|\\) with \\(q=\\frac12\\). Together with the fact that \\(T\\) maps the closed interval \\([0,2]\\) into itself (the image is \\([\\frac12,\\frac32]\\)), this is a contraction. So it has exactly one fixed point and the iteration converges to it from every start. The error bound is now shown: at step \\(3\\) both bounds equal \\(0.125\\), and so does the actual error, because \\(x_k=1-2^{-k}\\). The thick line on the \\(x\\)-axis is an interval around \\(x_3\\) that is sure to contain \\(x^*\\). At the threshold \\(10^{-3}\\) the iteration stops when the a posteriori bound falls below it, which is at step \\(10\\). This says the error is below the threshold, not that the iterate is exactly \\(1\\).',
            ),
            formulaIds: ['fixed-point-contraction', 'fixed-point-contraction-factor', 'fixed-point-bounds'], workedExampleId: 'fixed-point-affine-example', learnerInteraction: 'adjust-construction-parameter',
            frames: [frame('fixed-point-contraction-explanation', 'explanation'), frame('fixed-point-contraction-calculation', 'calculation'), frame('fixed-point-contraction-observation', 'observation')],
            observationPrompt: text(
                'Preberi \\(q\\), pogoje izreka in obe oceni. Napovej, pri katerem koraku se predvajanje ustavi pri pragu \\(10^{-3}\\), pritisni Predvajaj in primerjaj; nato nastavi natančnost \\(d=6\\) in napovej še enkrat.',
                'Read \\(q\\), the hypotheses of the theorem and both bounds. Predict at which step playback stops at the threshold \\(10^{-3}\\), press Play and compare; then set the tolerance to \\(d=6\\) and predict again.',
            ),
            expectedObservations: [
                text(
                    'Pri koraku \\(3\\) je \\(q=0{,}5\\), obe oceni sta \\(0{,}125\\), pogoji izreka so našteti (zaprt interval, \\(T\\) slika \\([0;\\,2]\\) vase, \\(|T\'|=\\frac12\\)).',
                    'At step \\(3\\), \\(q=0.5\\), both bounds are \\(0.125\\), and the hypotheses of the theorem are listed (a closed interval, \\(T\\) maps \\([0,2]\\) into itself, \\(|T\'|=\\frac12\\)).',
                ),
                text(
                    'Predvajanje se pri \\(d=3\\) ustavi pri koraku \\(10\\) z razlogom »ocena a posteriori pod pragom«; pri \\(d=6\\) se ustavi pri koraku \\(20\\), ker je \\(2^{-20}\\approx9{,}5\\cdot10^{-7}\\) pod pragom \\(10^{-6}\\), \\(2^{-19}\\) pa ne.',
                    'At \\(d=3\\) playback stops at step \\(10\\) with the reason "a posteriori bound below the threshold"; at \\(d=6\\) it stops at step \\(20\\), because \\(2^{-20}\\approx9.5\\cdot10^{-7}\\) is below the threshold \\(10^{-6}\\) and \\(2^{-19}\\) is not.',
                ),
            ],
            scene: {
                id: 'fixed-point-contraction-scene', basedOn: 'demonstration-default',
                actions: [...iterates(3), fixedPointBound(true)],
                expectedState: text(
                    'Prikazana je preslikava \\(\\frac{x+1}{2}\\) z začetkom \\(x_0=0\\) pri koraku \\(3\\), \\(x_3=0{,}875\\), z natančnostjo \\(d=3\\) in prikazano oceno napake.',
                    'The map \\(\\frac{x+1}{2}\\) is shown with the start \\(x_0=0\\) at step \\(3\\), \\(x_3=0.875\\), tolerance \\(d=3\\) and the error bound shown.',
                ),
            },
        },
        {
            id: 'fixed-point-cosine-step', order: 4,
            title: text('Preslikava \\(\\cos x\\) na \\([0;\\,1]\\)', 'The map \\(\\cos x\\) on \\([0,1]\\)'),
            purpose: text('Preveriti pogoje izreka pri preslikavi, ki ni linearna, in primerjati oceno z dejansko napako.', 'Checking the hypotheses of the theorem for a map that is not linear and comparing the bound with the actual error.'),
            explanation: text(
                'Preslikava \\(T(x)=\\cos x\\) na \\([0;\\,1]\\): \\(\\cos\\) je tu padajoč, zato slika \\([0;\\,1]\\) v \\([\\cos1;\\,1]\\), to je podmnožica intervala. Za odvod velja \\(|T\'(x)|=\\sin x\\) in \\(\\sin x\\le\\sin1\\), zato je \\(q=\\sin1\\), kar je približno \\(0{,}8415\\) in manj od \\(1\\). Vsi pogoji izreka so izpolnjeni, zato je negibna točka ena sama, \\(x^*\\approx0{,}739085\\), in iteracija konvergira k njej. Ker je \\(q\\) blizu \\(1\\), je konvergenca počasnejša kot pri prejšnji preslikavi. Prikazan je korak \\(8\\) z \\(x_8\\approx0{,}722102\\), dejanska napaka je približno \\(0{,}017\\). Ocena napake je skrita; napovej, ali bo ocena pri tem koraku manjša ali večja od dejanske napake.',
                'For the map \\(T(x)=\\cos x\\) on \\([0,1]\\): \\(\\cos\\) is decreasing there, so it maps \\([0,1]\\) to \\([\\cos1,1]\\), a subset of the interval. For the derivative we have \\(|T\'(x)|=\\sin x\\) and \\(\\sin x\\le\\sin1\\), so \\(q=\\sin1\\), which is about \\(0.8415\\) and less than \\(1\\). All hypotheses of the theorem hold, so there is exactly one fixed point, \\(x^*\\approx0.739085\\), and the iteration converges to it. Because \\(q\\) is close to \\(1\\), the convergence is slower than for the previous map. Step \\(8\\) is shown with \\(x_8\\approx0.722102\\), and the actual error is about \\(0.017\\). The error bound is hidden; predict whether the bound at this step is smaller or larger than the actual error.',
            ),
            formulaIds: ['fixed-point-contraction', 'fixed-point-contraction-factor', 'fixed-point-bounds'], learnerInteraction: 'adjust-construction-parameter',
            frames: [frame('fixed-point-cosine-explanation', 'explanation'), frame('fixed-point-cosine-observation', 'observation')],
            observationPrompt: text(
                'Napovej, ali je ocena napake pri koraku \\(8\\) manjša ali večja od dejanske napake \\(0{,}017\\); pritisni Pokaži oceno napake, preberi pogoje izreka in obe oceni. Nato pritisni Predvajaj in preberi, kdaj se ustavi pri pragu \\(10^{-3}\\).',
                'Predict whether the error bound at step \\(8\\) is smaller or larger than the actual error \\(0.017\\); press Show error bound, read the hypotheses of the theorem and both bounds. Then press Play and read when it stops at the threshold \\(10^{-3}\\).',
            ),
            expectedObservations: [
                text(
                    'Pri koraku \\(8\\) je \\(x_8\\approx0{,}722102\\); ocena napake je skrita.',
                    'At step \\(8\\), \\(x_8\\approx0.722102\\); the error bound is hidden.',
                ),
                text(
                    'Po pritisku na Pokaži oceno napake je \\(q\\approx0{,}8415\\), ocena a posteriori je približno \\(0{,}2222\\), ocena a priori približno \\(1{,}586\\); obe sta nad dejansko napako \\(0{,}017\\), torej veljata, a sta ohlapni. Predvajanje se pri \\(d=3\\) ustavi pri koraku \\(22\\).',
                    'After Show error bound, \\(q\\approx0.8415\\), the a posteriori bound is about \\(0.2222\\) and the a priori bound about \\(1.586\\); both are above the actual error \\(0.017\\), so they hold but are loose. At \\(d=3\\) playback stops at step \\(22\\).',
                ),
            ],
            scene: {
                id: 'fixed-point-cosine-scene', basedOn: 'demonstration-default',
                actions: [fixedPointChoice('cosine'), ...iterates(8), fixedPointBound(false)],
                expectedState: text(
                    'Prikazana je preslikava \\(\\cos x\\) na \\([0;\\,1]\\) z začetkom \\(x_0=0\\) pri koraku \\(8\\), z natančnostjo \\(d=3\\) in skrito oceno napake.',
                    'The map \\(\\cos x\\) on \\([0,1]\\) is shown with the start \\(x_0=0\\) at step \\(8\\), tolerance \\(d=3\\) and a hidden error bound.',
                ),
            },
        },
        {
            id: 'fixed-point-rounding-step', order: 5,
            title: text('Ustavitev ni dokaz natančne negibne točke', 'A stop is no proof of an exact fixed point'),
            purpose: text('Ločiti ustavitev pri pragu in zaokroževanje od natančne negibne točke.', 'Separating a stop at a threshold, and rounding, from an exact fixed point.'),
            explanation: text(
                'Pri natančnosti \\(d=8\\) se iteracija za \\(\\frac{x+1}{2}\\) ustavi pri koraku \\(27\\), ko je ocena a posteriori manjša od \\(10^{-8}\\). Odčitek približka \\(x_{27}\\) je na šest decimalk zaokrožen na \\(1\\), a \\(x_{27}=1-2^{-27}\\) ni enak \\(1\\): napaka je \\(2^{-27}\\approx7{,}45\\cdot10^{-9}\\). Zaokrožena vrednost, ki je enaka \\(1\\), in ustavitev pri pragu torej ne dokažeta, da je približek natančna negibna točka. Enako velja, če bi v računalniku dva zaporedna približka postala enaka: aplikacija bi to povedala kot zaokroževanje in ne kot dokaz. Natančna negibna točka je le začetek, ki ga po obrazcu poznamo, na primer \\(x_0=1\\) pri tej preslikavi, saj je \\(T(1)=1\\). Prikazan je korak \\(27\\) in ocena napake je skrita.',
                'At the tolerance \\(d=8\\) the iteration for \\(\\frac{x+1}{2}\\) stops at step \\(27\\), when the a posteriori bound falls below \\(10^{-8}\\). The readout of the iterate \\(x_{27}\\) is rounded to \\(1\\) at six decimals, but \\(x_{27}=1-2^{-27}\\) is not equal to \\(1\\): the error is \\(2^{-27}\\approx7.45\\cdot10^{-9}\\). A rounded value equal to \\(1\\) and a stop at a threshold therefore do not prove that the iterate is an exact fixed point. The same holds if two consecutive iterates became equal in the computer: the app would report that as rounding, not as a proof. An exact fixed point is only a start that we know from the formula, for example \\(x_0=1\\) for this map, since \\(T(1)=1\\). Step \\(27\\) is shown and the error bound is hidden.',
            ),
            formulaIds: ['fixed-point-bounds'], learnerInteraction: 'adjust-construction-parameter',
            frames: [frame('fixed-point-rounding-explanation', 'explanation'), frame('fixed-point-rounding-observation', 'observation')],
            observationPrompt: text(
                'Napovej, ali je \\(x_{27}\\) natančno \\(1\\), ker ga odčitek kaže kot \\(1\\); pritisni Pokaži oceno napake in preberi oceno. Nato vnesi \\(x_0=1\\) in preberi, zakaj se iteracija ne premakne.',
                'Predict whether \\(x_{27}\\) is exactly \\(1\\) because the readout shows \\(1\\); press Show error bound and read the bound. Then enter \\(x_0=1\\) and read why the iteration does not move.',
            ),
            expectedObservations: [
                text(
                    'Pri koraku \\(27\\) odčitek približka kaže \\(1\\), konec iteracije pa je »ocena a posteriori pod pragom«.',
                    'At step \\(27\\) the readout of the iterate shows \\(1\\) and the end of the iteration is "a posteriori bound below the threshold".',
                ),
                text(
                    'Po pritisku na Pokaži oceno napake je ocena približno \\(7{,}451\\cdot10^{-9}\\), torej večja od \\(0\\). Pri \\(x_0=1\\) iteracija ostane pri koraku \\(0\\), ker je začetek znana negibna točka.',
                    'After Show error bound the bound is about \\(7.451\\cdot10^{-9}\\), so greater than \\(0\\). For \\(x_0=1\\) the iteration stays at step \\(0\\), because the start is a known fixed point.',
                ),
            ],
            scene: {
                id: 'fixed-point-rounding-scene', basedOn: 'demonstration-default',
                actions: [parameter('fixed-point-digits', 8), ...iterates(27), fixedPointBound(false)],
                expectedState: text(
                    'Prikazana je preslikava \\(\\frac{x+1}{2}\\) z začetkom \\(x_0=0\\) pri koraku \\(27\\), z natančnostjo \\(d=8\\) in skrito oceno napake; iteracija se je ustavila pri pragu.',
                    'The map \\(\\frac{x+1}{2}\\) is shown with the start \\(x_0=0\\) at step \\(27\\), tolerance \\(d=8\\) and a hidden error bound; the iteration has stopped at the threshold.',
                ),
            },
        },
        {
            id: 'fixed-point-reflection-step', order: 6,
            title: text('Preslikava \\(1-x\\): dvocikel', 'The map \\(1-x\\): a two-cycle'),
            purpose: text('Videti, da iteracija preslikave \\(1-x\\) ne konvergira (dvocikel) in da nedržanje pogoja ni dokaz divergence.', 'Seeing that the iteration of \\(1-x\\) does not converge (a two-cycle) and that a failing hypothesis is not a proof of divergence.'),
            explanation: text(
                'Preslikava \\(T(x)=1-x\\) slika \\([0;\\,1]\\) vase, saj zamenja krajišči, in njena negibna točka je \\(\\frac12\\). Vendar je \\(|T\'(x)|=1\\), zato ni \\(q<1\\) in izrek o skrčitvi ne da zaključka ne ocene napake. Iz \\(x_0=0{,}2\\) dobimo \\(0{,}8\\), \\(0{,}2\\), \\(0{,}8\\), …: dvocikel, ker je \\(T(T(x))=x\\). Iteracija se ne približa \\(\\frac12\\), razen če začnemo natanko v njej. Prikazan je korak \\(4\\) in ocene napake ni. Nedržanje pogoja izreka samo po sebi divergence ne dokazuje: izrek preprosto ne daje zaključka. Pri tej preslikavi dvocikel vidimo neposredno iz \\(T(T(x))=x\\); pri drugi preslikavi z \\(q\\ge1\\) bi iteracija lahko tudi konvergirala. Predvajanje bi se ustavilo šele pri meji \\(60\\) korakov.',
                'The map \\(T(x)=1-x\\) maps \\([0,1]\\) into itself, because it swaps the endpoints, and its fixed point is \\(\\frac12\\). But \\(|T\'(x)|=1\\), so there is no \\(q<1\\) and the contraction theorem gives neither a conclusion nor an error bound. From \\(x_0=0.2\\) we get \\(0.8\\), \\(0.2\\), \\(0.8\\), …: a two-cycle, because \\(T(T(x))=x\\). The iteration does not approach \\(\\frac12\\) unless it starts exactly there. Step \\(4\\) is shown and there is no error bound. A failing hypothesis does not by itself prove divergence: the theorem simply gives no conclusion. For this map we see the two-cycle directly from \\(T(T(x))=x\\); for another map with \\(q\\ge1\\) the iteration might even converge. Playback would stop only at the limit of \\(60\\) steps.',
            ),
            formulaIds: ['fixed-point-reflection', 'fixed-point-reflection-derivative'], learnerInteraction: 'adjust-construction-parameter',
            frames: [frame('fixed-point-reflection-explanation', 'explanation'), frame('fixed-point-reflection-observation', 'observation')],
            observationPrompt: text(
                'Napovej, kam se približuje iteracija iz \\(x_0=0{,}2\\); pritisni Pokaži oceno napake in preberi, zakaj ocene ni. Nato vnesi \\(x_0=0{,}5\\) in primerjaj.',
                'Predict where the iteration from \\(x_0=0.2\\) is heading; press Show error bound and read why there is no bound. Then enter \\(x_0=0.5\\) and compare.',
            ),
            expectedObservations: [
                text(
                    'Pri koraku \\(4\\) so približki izmenično \\(0{,}2\\) in \\(0{,}8\\) (dvocikel); ocena napake je skrita.',
                    'At step \\(4\\) the iterates alternate between \\(0.2\\) and \\(0.8\\) (a two-cycle); the error bound is hidden.',
                ),
                text(
                    'Po pritisku na Pokaži oceno napake aplikacija pove, da ocene ni, ker je \\(|T\'|=1\\), in ne trdi, da iteracija divergira. Pri \\(x_0=0{,}5\\) se iteracija ne premakne, ker je začetek znana negibna točka.',
                    'After Show error bound the app says there is no bound because \\(|T\'|=1\\), and it does not claim that the iteration diverges. For \\(x_0=0.5\\) the iteration does not move, because the start is a known fixed point.',
                ),
            ],
            scene: {
                id: 'fixed-point-reflection-scene', basedOn: 'demonstration-default',
                actions: [fixedPointChoice('reflection'), ...iterates(4), fixedPointBound(false)],
                expectedState: text(
                    'Prikazana je preslikava \\(1-x\\) na \\([0;\\,1]\\) z začetkom \\(x_0=0{,}2\\) pri koraku \\(4\\), z natančnostjo \\(d=3\\) in skrito oceno napake; približki izmenjujejo \\(0{,}2\\) in \\(0{,}8\\).',
                    'The map \\(1-x\\) on \\([0,1]\\) is shown with the start \\(x_0=0.2\\) at step \\(4\\), tolerance \\(d=3\\) and a hidden error bound; the iterates alternate between \\(0.2\\) and \\(0.8\\).',
                ),
            },
        },
        {
            id: 'fixed-point-free-exploration', order: 7,
            title: text('Povzetek in samostojno raziskovanje', 'Summary and free exploration'),
            purpose: text('Povzeti pogoje izreka in preiti v samostojno raziskovanje.', 'Summarizing the hypotheses of the theorem and handing over to free exploration.'),
            explanation: text(
                'Povzetek: če \\(T\\) zaprt interval \\([a;\\,b]\\) slika vase in je skrčitev (razdalja slik \\(|T(x)-T(y)|\\) je največ \\(q|x-y|\\) za nek \\(q<1\\)), ima natanko eno negibno točko, iteracija iz vsakega začetka konvergira k njej in veljata oceni a priori in a posteriori. Če kateri od pogojev ne drži, izrek ne daje zaključka; to ni isto kot divergenca. Ustavitev pri pragu pove, da je ocena manjša od praga, in ne dokaže natančne negibne točke. Zdaj je izbran \\(\\cos x\\) z začetkom \\(x_0=1\\). Raziskuj sam: izberi preslikavo, spreminjaj začetek in natančnost, pritisni Naslednji korak ali Predvajaj in napovej, preden pokažeš oceno napake.',
                'Summary: if \\(T\\) maps a closed interval \\([a,b]\\) into itself and is a contraction (the distance of the images \\(|T(x)-T(y)|\\) is at most \\(q|x-y|\\) for some \\(q<1\\)), it has exactly one fixed point, the iteration converges to it from every start, and the a priori and a posteriori bounds hold. If one of the hypotheses fails, the theorem gives no conclusion; that is not the same as divergence. A stop at a threshold says the bound is below the threshold and does not prove an exact fixed point. Now \\(\\cos x\\) is chosen with the start \\(x_0=1\\). Explore on your own: choose a map, change the start and the tolerance, press Next step or Play, and predict before you show the error bound.',
            ),
            formulaIds: ['fixed-point-contraction', 'fixed-point-contraction-factor'], learnerInteraction: 'adjust-construction-parameter',
            frames: [frame('fixed-point-free-explanation', 'explanation'), frame('fixed-point-free-observation', 'observation')],
            observationPrompt: text(
                'Napovej, ali iteracija iz \\(x_0=1\\) konvergira k isti negibni točki kot iz \\(x_0=0\\); pritisni Predvajaj in preberi razlog ustavitve. Nato izberi drugo preslikavo in napovej, preden pokažeš oceno napake.',
                'Predict whether the iteration from \\(x_0=1\\) converges to the same fixed point as from \\(x_0=0\\); press Play and read the reason it stops. Then choose another map and predict before you show the error bound.',
            ),
            expectedObservations: [text(
                'Iz \\(x_0=1\\) se iteracija pri \\(d=3\\) ustavi pri koraku \\(21\\) s približkom \\(x_{21}\\approx0{,}739018\\), blizu \\(x^*\\approx0{,}739085\\); razlog je »ocena a posteriori pod pragom«, ocena pa je približno \\(0{,}000882\\).',
                'From \\(x_0=1\\) the iteration at \\(d=3\\) stops at step \\(21\\) with the iterate \\(x_{21}\\approx0.739018\\), close to \\(x^*\\approx0.739085\\); the reason is "a posteriori bound below the threshold" and the bound is about \\(0.000882\\).',
            )],
            scene: {
                id: 'fixed-point-free-scene', basedOn: 'demonstration-default',
                actions: [fixedPointChoice('cosine'), parameter('fixed-point-x0', 1), fixedPointBound(false)],
                expectedState: text(
                    'Prikazana je preslikava \\(\\cos x\\) na \\([0;\\,1]\\) z začetkom \\(x_0=1\\) pri koraku \\(0\\), z natančnostjo \\(d=3\\) in skrito oceno napake.',
                    'The map \\(\\cos x\\) on \\([0,1]\\) is shown with the start \\(x_0=1\\) at step \\(0\\), tolerance \\(d=3\\) and a hidden error bound.',
                ),
            },
        },
    ],
    sources: [
        {
            id: 'globevnik-brojan-analiza-1-fixed-point',
            citation: 'Globevnik, J., Brojan, M. Analiza I, Fakulteta za matematiko in fiziko, Univerza v Ljubljani, §8.6 (printed pp. 284–286).',
            supports: ['a contraction of a complete metric space has exactly one fixed point and the iteration converges to it from every start', 'the iteration x_{k+1} = T(x_k) and its error estimates a priori and a posteriori', 'a map with |T\'| <= q < 1 on a closed interval that it maps into itself is a contraction (mean value theorem)'],
        },
        {
            id: 'bezeg-fixed-point-implementation',
            citation: 'Bezeg source: src/analysis/fixedPoint.ts, src/analysis/fixedPointModel.ts and src/graphs/functions/FixedPointGraph.tsx.',
            supports: ['(x + 1)/2 on [0, 2] has the fixed point 1 and q = 1/2, x_k = 1 - 2^-k from x_0 = 0, and the a posteriori bound equals 2^-k, so the threshold 10^-3 stops at step 10 and 10^-6 at step 20', 'cos x on [0, 1] maps into [cos 1, 1] with |T\'| = sin x <= sin 1 = q, fixed point about 0.7390851332', '1 - x on [0, 1] has |T\'| = 1 and no q < 1; from a start other than 1/2 it alternates between x_0 and 1 - x_0', 'at d = 8 the affine iteration stops at step 27 with the error 2^-27, about 7.45e-9, although the six-decimal readout shows 1'],
            implementationCorrespondence: 'The history is recomputed from the example, the start x_0 (on the 0.01 grid, handed to the model as exact hundredths), the step count and the tolerance digits, never from stored arrays; the error bounds exist only where q < 1; the tolerance compares the a posteriori bound; the reflection example iterates in integer hundredths, so its two-cycle is exact; only a start equal to a known fixed point is called the fixed point, and equal floating-point iterates are reported as stagnation, never as an exact fixed point; a lesson scene applies set-function-parameter, set-function-choice, show-function-element and run-fixed-point-command actions through the same setters as the controls in one synchronous tick.',
        },
    ],
    edgeCases: [
        text(
            'Začetek \\(x_0\\) mora biti večkratnik števila \\(0{,}01\\) znotraj intervala primera, število števk \\(d\\) celo število od \\(1\\) do \\(8\\); vrednost zunaj območja se zavrne, model ostane nespremenjen, datoteka s takšno vrednostjo pa se ne uvozi in pove, kaj popraviti.',
            'The start \\(x_0\\) must be a multiple of \\(0.01\\) inside the interval of the example, the number of digits \\(d\\) an integer from \\(1\\) to \\(8\\); a value outside the range is rejected and the model stays unchanged, and a file with such a value is not imported and says what to correct.',
        ),
        text(
            'Če je začetek znana negibna točka (\\(1\\) pri \\(\\frac{x+1}{2}\\), \\(\\frac12\\) pri \\(1-x\\)), se iteracija ne premakne; samo takrat aplikacija reče, da je približek negibna točka.',
            'If the start is a known fixed point (\\(1\\) for \\(\\frac{x+1}{2}\\), \\(\\frac12\\) for \\(1-x\\)), the iteration does not move; only then does the app say that the iterate is the fixed point.',
        ),
        text(
            'Pri \\(1-x\\) ocen napake ni in predvajanje se ustavi šele pri meji \\(60\\) korakov; dvocikel je zaznan natančno, ker se račun izvaja v celih stotinkah.',
            'For \\(1-x\\) there are no error bounds and playback stops only at the limit of \\(60\\) steps; the two-cycle is detected exactly because the computation runs in integer hundredths.',
        ),
        text(
            'Pri vseh primerih in natančnosti do \\(d=8\\) se iteracija ustavi pri pragu, preden bi se dva zaporedna približka v računalniku izenačila; zastoj zaradi zaokroževanja je v aplikaciji obravnavan kot pojasnilo in ne kot dokaz.',
            'For all examples and tolerances up to \\(d=8\\) the iteration stops at the threshold before two consecutive iterates become equal in the computer; stagnation due to rounding is treated in the app as an explanation and never as a proof.',
        ),
    ],
    unresolvedQuestions: [
        text(
            'Pred pregledom za uporabo v razredu je treba potrditi razdelek §8.6 in strani v viru (povzeto po poročilu o kandidatih, ne preverjeno v PDF) in ali naj lekcija doda še dokaz enoličnosti negibne točke, Banachov izrek v splošnem metričnem prostoru in Newtonovo metodo kot iteracijo.',
            'Before classroom-ready review, confirm the section §8.6 and its pages in the source (taken from the candidate report, not checked in the PDF) and whether the lesson should also add a proof of the uniqueness of the fixed point, the Banach theorem in a general metric space and Newton\'s method as an iteration.',
        ),
    ],
};

const uniformChoice = (value: UniformExampleId): SceneAction => ({
    name: 'set-function-choice', value: {name: 'uniform-example', value},
});
const uniformSupremumShown = (visible: boolean): SceneAction => ({
    name: 'show-function-element', value: {name: 'uniform-supremum', value: visible},
});

const uniformConvergence: GuidedLesson = {
    demonstrationId: 'uniform-convergence',
    title: text('Enakomerna konvergenca: en skupni prag za vse točke', 'Uniform convergence: one shared threshold for all points'),
    summary: text(
        'Zaporedje funkcij \\(f_n\\) konvergira točkovno k \\(f\\), če za vsak \\(x\\) in \\(\\varepsilon>0\\) obstaja \\(N(x)\\) z \\(|f_n(x)-f(x)|<\\varepsilon\\) za \\(n\\ge N(x)\\); konvergira enakomerno na območju, če en \\(N\\) deluje za vse točke območja hkrati. Pri \\(x^n\\) na \\([0;\\,r]\\), \\(r<1\\), je supremum napake \\(r^n\\) in skupni \\(N\\) obstaja, na \\([0;\\,1]\\) pa je supremum \\(1\\) za vsak \\(n\\), ni dosežen in skupnega \\(N\\) ni. Sprememba območja je nova primerjava. Pri \\(\\frac xn\\) na \\([0;\\,1]\\) je supremum \\(\\frac1n\\) in skupni \\(N\\) je \\(\\left\\lfloor\\frac1\\varepsilon\\right\\rfloor+1\\). Enakomernosti se ne sklepa iz vzorčenih napak, ampak iz supremuma po obrazcu.',
        'A sequence of functions \\(f_n\\) converges pointwise to \\(f\\) if for every \\(x\\) and \\(\\varepsilon>0\\) there is an \\(N(x)\\) with \\(|f_n(x)-f(x)|<\\varepsilon\\) for \\(n\\ge N(x)\\); it converges uniformly on a domain if one \\(N\\) works for all points of the domain at once. For \\(x^n\\) on \\([0,\\,r]\\), \\(r<1\\), the supremum error is \\(r^n\\) and a shared \\(N\\) exists, while on \\([0,1]\\) the supremum is \\(1\\) for every \\(n\\), is not attained, and there is no shared \\(N\\). Changing the domain is a new comparison. For \\(\\frac xn\\) on \\([0,1]\\) the supremum is \\(\\frac1n\\) and the shared \\(N\\) is \\(\\left\\lfloor\\frac1\\varepsilon\\right\\rfloor+1\\). Uniformity is never inferred from sampled errors, but from the supremum given by the formula.',
    ),
    prerequisites: [
        text('Potrebno je razumevanje konvergence zaporedja števil z \\(\\varepsilon\\) in \\(N\\) (lekcija Konvergenca zaporedja).', 'Assumes an understanding of the convergence of a sequence of numbers with \\(\\varepsilon\\) and \\(N\\) (the lesson Convergence of a sequence).'),
        text('Potrebno je poznavanje supremuma kot najmanjše zgornje meje množice števil.', 'Assumes familiarity with the supremum as the least upper bound of a set of numbers.'),
        text('Potrebno je poznavanje potenčne funkcije \\(x^n\\) na \\([0;\\,1]\\) in naraščanja funkcije.', 'Assumes familiarity with the power function \\(x^n\\) on \\([0,1]\\) and with an increasing function.'),
    ],
    learningGoals: [
        text(
            'Pri \\(x^n\\) na \\([0;\\,0{,}8]\\) in \\(\\varepsilon=0{,}1\\) ločiš točkovni prag \\(N(x)\\), ki je odvisen od točke (\\(N(0{,}5)=4\\)), od skupnega \\(N=11\\), ki deluje za vse točke hkrati.',
            'For \\(x^n\\) on \\([0,\\,0.8]\\) and \\(\\varepsilon=0.1\\) tell the pointwise threshold \\(N(x)\\), which depends on the point (\\(N(0.5)=4\\)), from the shared \\(N=11\\), which works for all points at once.',
        ),
        text(
            'Izračunaš supremum napake \\(0{,}8^n\\) in utemeljiš, da je dosežen v krajišču \\(x=0{,}8\\), skupni \\(N\\) pa je najmanjši \\(n\\) z \\(0{,}8^n<\\varepsilon\\).',
            'Compute the supremum error \\(0.8^n\\), justify that it is attained at the endpoint \\(x=0.8\\), and that the shared \\(N\\) is the least \\(n\\) with \\(0.8^n<\\varepsilon\\).',
        ),
        text(
            'Na \\([0;\\,1]\\) ugotoviš, da prag \\(N(x)\\) raste čez vse meje, ko gre \\(x\\to1\\), da je supremum \\(1\\) za vsak \\(n\\) in nedosežen ter da skupnega \\(N\\) ni.',
            'On \\([0,1]\\) find that the threshold \\(N(x)\\) grows without bound as \\(x\\to1\\), that the supremum is \\(1\\) for every \\(n\\) and not attained, and that there is no shared \\(N\\).',
        ),
        text(
            'Razložiš, zakaj je sprememba območja nova primerjava, in pri \\(\\frac xn\\) na \\([0;\\,1]\\) izračunaš skupni \\(N=\\left\\lfloor\\frac1\\varepsilon\\right\\rfloor+1\\).',
            'Explain why changing the domain is a new comparison, and for \\(\\frac xn\\) on \\([0,1]\\) compute the shared \\(N=\\left\\lfloor\\frac1\\varepsilon\\right\\rfloor+1\\).',
        ),
    ],
    formulaBlocks: [
        {
            id: 'uniform-definition',
            latex: '\\forall x\\ \\forall\\varepsilon>0\\ \\exists N(x,\\varepsilon)\\ \\forall n\\ge N:\\ |f_n(x)-f(x)|<\\varepsilon',
            notation: text(
                'Točkovna konvergenca: \\(f_n\\) so funkcije, \\(f\\) je limita, \\(N(x,\\varepsilon)\\) pa je prag, ki sme biti odvisen od točke.',
                'Pointwise convergence: \\(f_n\\) are the functions, \\(f\\) is the limit and \\(N(x,\\varepsilon)\\) is a threshold that may depend on the point.',
            ),
            explanation: text(
                'Pri točkovni konvergenci je \\(N\\) izbran po točki \\(x\\).',
                'For pointwise convergence \\(N\\) is chosen after the point \\(x\\).',
            ),
        },
        {
            id: 'uniform-definition-uniform',
            latex: '\\forall\\varepsilon>0\\ \\exists N(\\varepsilon)\\ \\forall n\\ge N\\ \\forall x\\in D:\\ |f_n(x)-f(x)|<\\varepsilon',
            notation: text(
                'Enakomerna konvergenca: množica \\(D\\) je območje, \\(N(\\varepsilon)\\) pa je en prag za vse točke območja.',
                'Uniform convergence: the set \\(D\\) is the domain and \\(N(\\varepsilon)\\) is one threshold for all points of the domain.',
            ),
            explanation: text(
                'Razlika je v vrstnem redu kvantifikatorjev: pri točkovni konvergenci je \\(N\\) izbran po točki \\(x\\), pri enakomerni pa pred točko, zato mora veljati za vse \\(x\\) iz \\(D\\) hkrati. Če velja pogoj za enakomerno konvergenco, velja tudi točkovni, obratno pa ne.',
                'The difference lies in the order of the quantifiers: for pointwise convergence \\(N\\) is chosen after the point \\(x\\), for uniform convergence before it, so it has to hold for all \\(x\\) in \\(D\\) at once. Uniform convergence implies pointwise convergence, but not the other way round.',
            ),
        },
        {
            id: 'uniform-power-supremum',
            latex: '\\begin{aligned}\\sup_{0\\le x\\le r}x^n&=r^n\\quad(0<r<1),\\\\\\sup_{0\\le x\\le1}|x^n-f(x)|&=\\sup_{0\\le x<1}x^n=1\\end{aligned}',
            notation: text(
                'Prva vrstica velja za \\(0<r<1\\), druga za \\(r=1\\). Pri \\(f_n(x)=x^n\\) je limita \\(f(x)=0\\) za \\(x<1\\) in \\(f(1)=1\\); \\(\\sup\\) je supremum, najmanjša zgornja meja vrednosti napake po vseh točkah območja.',
                'The first line holds for \\(0<r<1\\), the second for \\(r=1\\). For \\(f_n(x)=x^n\\) the limit is \\(f(x)=0\\) for \\(x<1\\) and \\(f(1)=1\\); \\(\\sup\\) is the supremum, the least upper bound of the error values over all points of the domain.',
            ),
            explanation: text(
                'Funkcija \\(x^n\\) narašča, zato je na \\([0;\\,r]\\) z \\(r<1\\) napaka največja v krajišču in enaka \\(r^n\\). Na \\([0;\\,1]\\) je napaka pri \\(x=1\\) enaka \\(0\\), za \\(x<1\\) pa je \\(x^n<1\\) in se pri \\(x\\to1\\) poljubno približa \\(1\\): supremum je \\(1\\) za vsak \\(n\\) in ga nobena točka ne doseže.',
                'The function \\(x^n\\) is increasing, so on \\([0,\\,r]\\) with \\(r<1\\) the error is largest at the endpoint and equals \\(r^n\\). On \\([0,1]\\) the error at \\(x=1\\) is \\(0\\), while for \\(x<1\\) we have \\(x^n<1\\), and as \\(x\\to1\\) it comes arbitrarily close to \\(1\\): the supremum is \\(1\\) for every \\(n\\) and no point attains it.',
            ),
        },
        {
            id: 'uniform-power-threshold',
            latex: '\\begin{aligned}a^n<\\varepsilon&\\iff n>\\frac{\\ln\\varepsilon}{\\ln a}\\quad(0<a<1),\\\\N&=\\left\\lfloor\\frac{\\ln\\varepsilon}{\\ln a}\\right\\rfloor+1\\end{aligned}',
            notation: text(
                'Število \\(a\\) je \\(x\\) pri točkovnem pragu \\(N(x,\\varepsilon)\\) in \\(r\\) pri skupnem pragu \\(N(\\varepsilon)\\); \\(\\ln\\) je naravni logaritem, \\(\\lfloor\\cdot\\rfloor\\) celi del.',
                'The number \\(a\\) is \\(x\\) for the pointwise threshold \\(N(x,\\varepsilon)\\) and \\(r\\) for the shared threshold \\(N(\\varepsilon)\\); \\(\\ln\\) is the natural logarithm and \\(\\lfloor\\cdot\\rfloor\\) the floor.',
            ),
            explanation: text(
                'Ker je \\(\\ln a<0\\), se pri deljenju z njim neenakost obrne. Najmanjši celi \\(n\\), večji od količnika, je njegov celi del plus \\(1\\). Ko gre \\(a\\to1\\), gre \\(\\ln a\\to0\\), zato prag raste čez vse meje. Aplikacija prag izračuna z računom s celimi števili, logaritem le predlaga izhodišče.',
                'Since \\(\\ln a<0\\), the inequality reverses when dividing by it. The least integer \\(n\\) above the quotient is its floor plus \\(1\\). As \\(a\\to1\\), \\(\\ln a\\to0\\), so the threshold grows without bound. The app computes the threshold with integer arithmetic; the logarithm only proposes a starting value.',
            ),
        },
        {
            id: 'uniform-scaled',
            latex: '\\sup_{0\\le x\\le1}\\frac xn=\\frac1n',
            notation: text(
                'Pri \\(f_n(x)=\\frac xn\\) je limita \\(f(x)=0\\) na celem območju \\([0;\\,1]\\), brez skoka.',
                'For \\(f_n(x)=\\frac xn\\) the limit is \\(f(x)=0\\) on the whole domain \\([0,1]\\), without a jump.',
            ),
            explanation: text(
                'Napaka \\(\\frac xn\\) narašča z \\(x\\), zato je največja pri \\(x=1\\) in tam enaka \\(\\frac1n\\), ki je odvisna le od \\(n\\) in ne od točke. Pogoj \\(\\frac1n<\\varepsilon\\) torej določa en skupni \\(N\\) za vse \\(x\\).',
                'The error \\(\\frac xn\\) increases with \\(x\\), so it is largest at \\(x=1\\), where it equals \\(\\frac1n\\), which depends only on \\(n\\) and not on the point. The condition \\(\\frac1n<\\varepsilon\\) therefore gives one shared \\(N\\) for all \\(x\\).',
            ),
        },
        {
            id: 'uniform-scaled-threshold',
            latex: '\\frac1n<\\varepsilon\\iff n>\\frac1\\varepsilon,\\qquad N=\\left\\lfloor\\frac1\\varepsilon\\right\\rfloor+1',
            notation: text(
                'Pogoj \\(\\frac1n<\\varepsilon\\) določa najmanjši skupni \\(N\\); \\(\\lfloor\\cdot\\rfloor\\) je celi del.',
                'The condition \\(\\frac1n<\\varepsilon\\) determines the least shared \\(N\\); \\(\\lfloor\\cdot\\rfloor\\) is the floor.',
            ),
            explanation: text(
                'Pogoj \\(\\frac1n<\\varepsilon\\) je enakovreden \\(n>\\frac1\\varepsilon\\), najmanjše tako celo število pa je \\(\\left\\lfloor\\frac1\\varepsilon\\right\\rfloor+1\\).',
                'The condition \\(\\frac1n<\\varepsilon\\) is equivalent to \\(n>\\frac1\\varepsilon\\), and the least such integer is \\(\\left\\lfloor\\frac1\\varepsilon\\right\\rfloor+1\\).',
            ),
        },
    ],
    workedExamples: [
        {
            id: 'uniform-shared-n-example',
            title: text('Skupni \\(N\\) za \\(x^n\\) na \\([0;\\,0{,}8]\\) pri \\(\\varepsilon=0{,}1\\)', 'The shared \\(N\\) for \\(x^n\\) on \\([0,\\,0.8]\\) at \\(\\varepsilon=0.1\\)'),
            calculationLatex: '\\left(\\tfrac45\\right)^{10}=\\tfrac{1048576}{9765625}>\\tfrac1{10},\\qquad\\left(\\tfrac45\\right)^{11}=\\tfrac{4194304}{48828125}<\\tfrac1{10}',
            resultLatex: 'N=11:\\quad\\sup_{0\\le x\\le4/5}\\left|x^n\\right|=\\left(\\tfrac45\\right)^n<\\tfrac1{10}\\ \\ (n\\ge11)',
            check: text(
                'Ker je \\(0{,}8^n\\) padajoče v \\(n\\), iz \\(0{,}8^{11}\\approx0{,}0859<0{,}1\\) sledi isto za vsak večji \\(n\\); \\(0{,}8^{10}\\approx0{,}1074\\) pa še ni manjše od \\(0{,}1\\). Pri \\(n\\ge11\\) torej velja \\(|x^n-0|<0{,}1\\) za vsak \\(x\\in[0;\\,0{,}8]\\) hkrati. Obrazec \\(\\frac{\\ln0{,}1}{\\ln0{,}8}\\approx10{,}32\\) da isti \\(N=\\lfloor10{,}32\\rfloor+1=11\\).',
                'Since \\(0.8^n\\) is decreasing in \\(n\\), \\(0.8^{11}\\approx0.0859<0.1\\) gives the same for every larger \\(n\\); \\(0.8^{10}\\approx0.1074\\) is not yet below \\(0.1\\). For \\(n\\ge11\\) we therefore have \\(|x^n-0|<0.1\\) for every \\(x\\in[0,\\,0.8]\\) at once. The formula \\(\\frac{\\ln0.1}{\\ln0.8}\\approx10.32\\) gives the same \\(N=\\lfloor10.32\\rfloor+1=11\\).',
            ),
        },
    ],
    steps: [
        {
            id: 'uniform-pointwise-step', order: 1,
            title: text('Točkovna napaka in prag \\(N(x)\\) na \\([0;\\,0{,}8]\\)', 'The pointwise error and the threshold \\(N(x)\\) on \\([0,\\,0.8]\\)'),
            purpose: text('Povezati točkovno napako pri izbrani točki z njenim pragom \\(N(x)\\), preden vprašamo po vseh točkah hkrati.', 'Linking the pointwise error at a chosen point to its threshold \\(N(x)\\) before asking about all points at once.'),
            explanation: text(
                'Opazujemo funkcije \\(f_n(x)=x^n\\) na območju \\([0;\\,0{,}8]\\). Za vsak \\(x\\) iz območja gre \\(x^n\\) proti \\(0\\), zato je limita \\(f(x)=0\\). Okoli limite je pas širine \\(\\varepsilon=0{,}1\\) na vsako stran. Izbrana točka \\(x=0{,}5\\) ima napako \\(|f_n(x)-f(x)|\\); pri \\(n=2\\) je ta \\(0{,}25\\), kar je izven pasu. Točkovni prag \\(N(x)\\) je najmanjši \\(n\\), pri katerem je napaka v tej točki manjša od \\(\\varepsilon\\), in za večje \\(n\\) ostane manjša. Prag je odvisen od točke: z drugim \\(x\\) dobimo lahko drug \\(N(x)\\). Supremum je skrit, saj tu opazujemo le eno točko naenkrat.',
                'We look at the functions \\(f_n(x)=x^n\\) on the domain \\([0,\\,0.8]\\). For every \\(x\\) in the domain \\(x^n\\) tends to \\(0\\), so the limit is \\(f(x)=0\\). Around the limit there is a band of width \\(\\varepsilon=0.1\\) on each side. The chosen point \\(x=0.5\\) has the error \\(|f_n(x)-f(x)|\\); at \\(n=2\\) it is \\(0.25\\), which is outside the band. The pointwise threshold \\(N(x)\\) is the least \\(n\\) for which the error at this point is below \\(\\varepsilon\\), and for larger \\(n\\) it stays below. The threshold depends on the point: with a different \\(x\\) we may get a different \\(N(x)\\). The supremum is hidden, since here we look at one point at a time.',
            ),
            formulaIds: ['uniform-definition', 'uniform-definition-uniform'], learnerInteraction: 'adjust-construction-parameter',
            frames: [frame('uniform-pointwise-explanation', 'explanation'), frame('uniform-pointwise-observation', 'observation')],
            observationPrompt: text(
                'Napovej, pri katerem najmanjšem \\(n\\) je napaka v točki \\(x=0{,}5\\) manjša od \\(\\varepsilon=0{,}1\\), in preveri z gumboma − in + ali s poljem Indeks n. Nato vnesi \\(x=0{,}8\\) v polje Točka x in primerjaj prag \\(N(x)\\).',
                'Predict the least \\(n\\) for which the error at \\(x=0.5\\) is below \\(\\varepsilon=0.1\\), and check with the − and + buttons or the Index n field. Then enter \\(x=0.8\\) in the Point x field and compare the threshold \\(N(x)\\).',
            ),
            expectedObservations: [
                text(
                    'Pri \\(n=2\\) je \\(f_2(0{,}5)=0{,}25\\) in napaka \\(0{,}25\\) ni manjša od \\(\\varepsilon\\); točkovni prag je \\(N(0{,}5)=4\\), saj je \\(0{,}5^4=0{,}0625<0{,}1\\), \\(0{,}5^3=0{,}125\\) pa ne.',
                    'At \\(n=2\\), \\(f_2(0.5)=0.25\\) and the error \\(0.25\\) is not below \\(\\varepsilon\\); the pointwise threshold is \\(N(0.5)=4\\), since \\(0.5^4=0.0625<0.1\\) while \\(0.5^3=0.125\\) is not.',
                ),
                text(
                    'Pri \\(x=0{,}8\\) je prag \\(N(0{,}8)=11\\): bliže krajišču območja je prag večji. Supremum je skrit.',
                    'At \\(x=0.8\\) the threshold is \\(N(0.8)=11\\): closer to the end of the domain the threshold is larger. The supremum is hidden.',
                ),
            ],
            scene: {
                id: 'uniform-pointwise-scene', basedOn: 'demonstration-default',
                actions: [parameter('uniform-n', 2), uniformSupremumShown(false)],
                expectedState: text(
                    'Prikazano je \\(x^n\\) na \\([0;\\,0{,}8]\\) z \\(n=2\\), \\(x=0{,}5\\) in \\(\\varepsilon=0{,}1\\); supremum je skrit.',
                    'The function \\(x^n\\) is shown on \\([0,\\,0.8]\\) with \\(n=2\\), \\(x=0.5\\) and \\(\\varepsilon=0.1\\); the supremum is hidden.',
                ),
            },
        },
        {
            id: 'uniform-supremum-step', order: 2,
            title: text('Supremum napake in skupni \\(N\\): napoved', 'The supremum error and the shared \\(N\\): a prediction'),
            purpose: text('Napovedati, kje je napaka na celem območju največja in ali en \\(N\\) deluje za vse točke, preden se pokaže supremum.', 'Predicting where the error over the whole domain is largest and whether one \\(N\\) works for all points, before the supremum is shown.'),
            explanation: text(
                'Točkovni prag je bil odvisen od točke: \\(N(0{,}5)=4\\), \\(N(0{,}8)=11\\). Enakomerna konvergenca zahteva več: en sam \\(N\\), ki deluje za vse \\(x\\) iz \\([0;\\,0{,}8]\\) hkrati, torej \\(|f_n(x)-f(x)|<\\varepsilon\\) za vsak \\(n\\ge N\\) in vsak \\(x\\). Zato nas ne zanima več ena točka, ampak največja napaka na celem območju, supremum \\(\\sup|f_n-f|\\). Izbran je \\(n=5\\). Vprašanji sta: katera točka območja ima največjo napako in koliko je ta, ter najmanj kolikšen \\(n\\) naredi vse napake manjše od \\(\\varepsilon=0{,}1\\). Supremum se računa po obrazcu, ne iz vzorčenih točk.',
                'The pointwise threshold depended on the point: \\(N(0.5)=4\\), \\(N(0.8)=11\\). Uniform convergence asks for more: a single \\(N\\) that works for all \\(x\\) in \\([0,\\,0.8]\\) at once, that is \\(|f_n(x)-f(x)|<\\varepsilon\\) for every \\(n\\ge N\\) and every \\(x\\). So we are no longer interested in one point but in the largest error over the whole domain, the supremum \\(\\sup|f_n-f|\\). The chosen index is \\(n=5\\). The questions are: which point of the domain has the largest error and how large it is, and what the least \\(n\\) is that makes all errors below \\(\\varepsilon=0.1\\). The supremum is computed from the formula, not from sampled points.',
            ),
            formulaIds: ['uniform-definition', 'uniform-definition-uniform'], learnerInteraction: 'adjust-construction-parameter',
            frames: [frame('uniform-supremum-explanation', 'explanation'), frame('uniform-supremum-observation', 'observation')],
            observationPrompt: text(
                'Napovej, katera točka ima pri \\(n=5\\) največjo napako in koliko je ta, ter najmanj kolikšen \\(n\\) naredi vse napake manjše od \\(\\varepsilon=0{,}1\\); šele nato pritisni Pokaži supremum.',
                'Predict which point has the largest error at \\(n=5\\) and how large it is, and the least \\(n\\) that makes all errors below \\(\\varepsilon=0.1\\); only then press Show supremum.',
            ),
            expectedObservations: [
                text(
                    'Supremum napake je \\(0{,}8^5=0{,}32768\\), dosežen v krajišču \\(x=0{,}8\\).',
                    'The supremum error is \\(0.8^5=0.32768\\), attained at the endpoint \\(x=0.8\\).',
                ),
                text(
                    'Skupni \\(N=11\\): \\(0{,}8^{10}\\approx0{,}1074\\) še ni manjši od \\(0{,}1\\), \\(0{,}8^{11}\\approx0{,}0859\\) pa je. Pri \\(n=5\\) supremum ni manjši od \\(\\varepsilon\\).',
                    'The shared \\(N=11\\): \\(0.8^{10}\\approx0.1074\\) is not yet below \\(0.1\\), while \\(0.8^{11}\\approx0.0859\\) is. At \\(n=5\\) the supremum is not below \\(\\varepsilon\\).',
                ),
            ],
            scene: {
                id: 'uniform-supremum-scene', basedOn: 'demonstration-default',
                actions: [uniformSupremumShown(false)],
                expectedState: text(
                    'Prikazano je \\(x^n\\) na \\([0;\\,0{,}8]\\) z \\(n=5\\), \\(x=0{,}5\\) in \\(\\varepsilon=0{,}1\\); supremum je skrit.',
                    'The function \\(x^n\\) is shown on \\([0,\\,0.8]\\) with \\(n=5\\), \\(x=0.5\\) and \\(\\varepsilon=0.1\\); the supremum is hidden.',
                ),
            },
        },
        {
            id: 'uniform-shared-n-step', order: 3,
            title: text('Skupni \\(N\\) na \\([0;\\,0{,}8]\\)', 'The shared \\(N\\) on \\([0,\\,0.8]\\)'),
            purpose: text('Primerjati napoved s supremumom, izračunanim po obrazcu, in videti, da en \\(N\\) deluje za vse točke.', 'Comparing the prediction with the supremum computed from the formula and seeing that one \\(N\\) works for all points.'),
            explanation: text(
                'Iz napovedi: pri \\(n=5\\) je supremum \\(0{,}32768\\) v krajišču \\(x=0{,}8\\) in skupni \\(N=11\\). Zdaj je izbran \\(n=11\\) in supremum je prikazan. Ker \\(x^n\\) narašča, je na \\([0;\\,r]\\) z \\(r<1\\) napaka največja v krajišču: \\(\\sup=r^n\\), dosežen pri \\(x=r\\). Pogoj \\(r^n<\\varepsilon\\) je enakovreden \\(n>\\frac{\\ln\\varepsilon}{\\ln r}\\), najmanjši tak \\(n\\) pa je v okviru Obrazci; pri \\(r=0{,}8\\) in \\(\\varepsilon=0{,}1\\) je \\(11\\). Supremum je pri \\(n=11\\) manjši od \\(\\varepsilon\\), zato ves graf \\(f_n\\) leži v pasu, in to velja za vsak \\(n\\ge11\\). Prag ni odvisen od točke \\(x\\): to je enakomerna konvergenca na \\([0;\\,0{,}8]\\).',
                'From the prediction: at \\(n=5\\) the supremum is \\(0.32768\\) at the endpoint \\(x=0.8\\) and the shared \\(N=11\\). Now \\(n=11\\) is chosen and the supremum is shown. Since \\(x^n\\) is increasing, on \\([0,\\,r]\\) with \\(r<1\\) the error is largest at the endpoint: \\(\\sup=r^n\\), attained at \\(x=r\\). The condition \\(r^n<\\varepsilon\\) is equivalent to \\(n>\\frac{\\ln\\varepsilon}{\\ln r}\\), and the least such \\(n\\) is in the Formulas frame; for \\(r=0.8\\) and \\(\\varepsilon=0.1\\) it is \\(11\\). At \\(n=11\\) the supremum is below \\(\\varepsilon\\), so the whole graph of \\(f_n\\) lies in the band, and this holds for every \\(n\\ge11\\). The threshold does not depend on the point \\(x\\): this is uniform convergence on \\([0,\\,0.8]\\).',
            ),
            formulaIds: ['uniform-power-supremum', 'uniform-power-threshold'], workedExampleId: 'uniform-shared-n-example', learnerInteraction: 'adjust-construction-parameter',
            frames: [frame('uniform-shared-n-explanation', 'explanation'), frame('uniform-shared-n-calculation', 'calculation'), frame('uniform-shared-n-observation', 'observation')],
            observationPrompt: text(
                'Preberi supremum, skupni \\(N\\) in stanje v odčitkih. Nato zmanjšaj \\(n\\) na \\(10\\) in preberi, zakaj ta \\(n\\) še ne deluje za vse točke hkrati.',
                'Read the supremum, the shared \\(N\\) and the status in the readouts. Then lower \\(n\\) to \\(10\\) and read why this \\(n\\) does not yet work for all points at once.',
            ),
            expectedObservations: [text(
                'Pri \\(n=11\\) je supremum \\(0{,}8^{11}\\approx0{,}0859\\), dosežen pri \\(x=0{,}8\\), skupni \\(N=11\\) in ves graf \\(f_n\\) leži znotraj pasu. Pri \\(n=10\\) je supremum \\(\\approx0{,}1074\\) in ni manjši od \\(\\varepsilon\\).',
                'At \\(n=11\\) the supremum is \\(0.8^{11}\\approx0.0859\\), attained at \\(x=0.8\\), the shared \\(N=11\\), and the whole graph of \\(f_n\\) lies inside the band. At \\(n=10\\) the supremum is \\(\\approx0.1074\\) and is not below \\(\\varepsilon\\).',
            )],
            scene: {
                id: 'uniform-shared-n-scene', basedOn: 'demonstration-default',
                actions: [parameter('uniform-n', 11), uniformSupremumShown(true)],
                expectedState: text(
                    'Prikazano je \\(x^n\\) na \\([0;\\,0{,}8]\\) z \\(n=11\\), \\(x=0{,}5\\) in \\(\\varepsilon=0{,}1\\); supremum je prikazan.',
                    'The function \\(x^n\\) is shown on \\([0,\\,0.8]\\) with \\(n=11\\), \\(x=0.5\\) and \\(\\varepsilon=0.1\\); the supremum is shown.',
                ),
            },
        },
        {
            id: 'uniform-whole-interval-step', order: 4,
            title: text('Isti funkciji na \\([0;\\,1]\\): prag \\(N(x)\\) raste', 'The same functions on \\([0,1]\\): the threshold \\(N(x)\\) grows'),
            purpose: text('Videti, da točkovni prag na \\([0;\\,1]\\) raste čez vse meje, ko gre \\(x\\) proti \\(1\\).', 'Seeing that on \\([0,1]\\) the pointwise threshold grows without bound as \\(x\\) approaches \\(1\\).'),
            explanation: text(
                'Na \\([0;\\,0{,}8]\\) je en \\(N=11\\) deloval za vse točke. Zdaj je območje \\([0;\\,1]\\), funkcije \\(x^n\\) pa so iste. Limita je \\(f(x)=0\\) za \\(x<1\\) in \\(f(1)=1\\), pri vsakem \\(x\\) je konvergenca še vedno točkovna. Prag \\(N(x)\\) pa je odvisen od točke: pri \\(x=0{,}5\\) je \\(4\\), bliže \\(1\\) je večji. Pogoj \\(x^n<\\varepsilon\\) je enakovreden \\(n>\\frac{\\ln\\varepsilon}{\\ln x}\\), imenovalec pa gre proti \\(0\\), ko gre \\(x\\to1\\). Izbrana je točka \\(x=0{,}9\\) in \\(n=5\\), kjer je napaka \\(0{,}9^5=0{,}59049\\), daleč izven pasu. Supremum je spet skrit.',
                'On \\([0,\\,0.8]\\) one \\(N=11\\) worked for all points. Now the domain is \\([0,1]\\) and the functions \\(x^n\\) are the same. The limit is \\(f(x)=0\\) for \\(x<1\\) and \\(f(1)=1\\), and at each \\(x\\) the convergence is still pointwise. The threshold \\(N(x)\\), however, depends on the point: at \\(x=0.5\\) it is \\(4\\), closer to \\(1\\) it is larger. The condition \\(x^n<\\varepsilon\\) is equivalent to \\(n>\\frac{\\ln\\varepsilon}{\\ln x}\\), and the denominator tends to \\(0\\) as \\(x\\to1\\). The chosen point is \\(x=0.9\\) with \\(n=5\\), where the error \\(0.9^5=0.59049\\) is far outside the band. The supremum is hidden again.',
            ),
            formulaIds: ['uniform-power-threshold'], learnerInteraction: 'adjust-construction-parameter',
            frames: [frame('uniform-whole-interval-explanation', 'explanation'), frame('uniform-whole-interval-observation', 'observation')],
            observationPrompt: text(
                'Napovej točkovni prag \\(N(0{,}9)\\) in \\(N(0{,}99)\\) pri \\(\\varepsilon=0{,}1\\); preveri pri \\(x=0{,}9\\) in nato vnesi \\(x=0{,}99\\) v polje Točka x.',
                'Predict the pointwise thresholds \\(N(0.9)\\) and \\(N(0.99)\\) at \\(\\varepsilon=0.1\\); check at \\(x=0.9\\) and then enter \\(x=0.99\\) in the Point x field.',
            ),
            expectedObservations: [
                text(
                    'Pri \\(x=0{,}9\\) je napaka \\(0{,}59049\\) in točkovni prag \\(N(0{,}9)=22\\); supremum je skrit.',
                    'At \\(x=0.9\\) the error is \\(0.59049\\) and the pointwise threshold is \\(N(0.9)=22\\); the supremum is hidden.',
                ),
                text(
                    'Pri \\(x=0{,}99\\) je \\(N(0{,}99)=230\\), nad največjim izbirnim \\(n=50\\); odčitek to pove in praga ne skrajša. Prag torej ni omejen z nobenim \\(n\\) za vse točke.',
                    'At \\(x=0.99\\) the threshold is \\(N(0.99)=230\\), beyond the largest selectable \\(n=50\\); the readout says so and does not shorten it. So no single \\(n\\) bounds the threshold for all points.',
                ),
            ],
            scene: {
                id: 'uniform-whole-interval-scene', basedOn: 'demonstration-default',
                actions: [parameter('uniform-r', 1), parameter('uniform-x', 0.9), uniformSupremumShown(false)],
                expectedState: text(
                    'Prikazano je \\(x^n\\) na \\([0;\\,1]\\) z \\(n=5\\), \\(x=0{,}9\\) in \\(\\varepsilon=0{,}1\\); limita ima skok pri \\(x=1\\), supremum je skrit.',
                    'The function \\(x^n\\) is shown on \\([0,1]\\) with \\(n=5\\), \\(x=0.9\\) and \\(\\varepsilon=0.1\\); the limit has a jump at \\(x=1\\), and the supremum is hidden.',
                ),
            },
        },
        {
            id: 'uniform-supremum-one-step', order: 5,
            title: text('Supremum \\(1\\) za vsak \\(n\\), ni dosežen', 'The supremum is \\(1\\) for every \\(n\\), not attained'),
            purpose: text('Napovedati, da na \\([0;\\,1]\\) noben \\(n\\) ne deluje za vse točke, in razumeti skok limite.', 'Predicting that on \\([0,1]\\) no \\(n\\) works for all points, and understanding the jump of the limit.'),
            explanation: text(
                'Funkcije \\(x^n\\) so zvezne, limita pa ima pri \\(x=1\\) skok. Na grafu je limita narisana v dveh kosih: črtkana črta \\(y=0\\) na \\([0,1)\\) z odprtim krogcem pri \\((1,0)\\), kar je vrednost, ki je limita ne zavzame, in poln krogec pri \\((1,1)\\) kot osamljena vrednost; skoka ne povezujemo. Izbrana sta \\(n=10\\) in točka \\(x=0{,}9\\), kjer je napaka \\(0{,}9^{10}\\approx0{,}35\\), bliže \\(1\\) pa je še večja. Vprašanje ni več, kolikšen je prag pri eni točki, ampak ali obstaja supremum pod \\(\\varepsilon\\) in zato en \\(N\\) za vse točke, tudi pri večjih \\(n\\).',
                'The functions \\(x^n\\) are continuous, but the limit has a jump at \\(x=1\\). On the graph the limit is drawn in two pieces: the dashed line \\(y=0\\) on \\([0,1)\\) with an open circle at \\((1,0)\\), a value the limit does not take, and a filled circle at \\((1,1)\\) as an isolated value; the jump is not joined. The chosen values are \\(n=10\\) and the point \\(x=0.9\\), where the error \\(0.9^{10}\\approx0.35\\) and closer to \\(1\\) it is larger. The question is no longer the threshold at one point, but whether the supremum can be below \\(\\varepsilon\\) and therefore one \\(N\\) for all points, also for larger \\(n\\).',
            ),
            formulaIds: ['uniform-power-supremum'], learnerInteraction: 'adjust-construction-parameter',
            frames: [frame('uniform-supremum-one-explanation', 'explanation'), frame('uniform-supremum-one-observation', 'observation')],
            observationPrompt: text(
                'Napovej supremum napake pri \\(n=10\\), ali je dosežen in ali obstaja skupni \\(N\\); povečaj \\(n\\) in preveri, ali se napoved spremeni; šele nato pritisni Pokaži supremum.',
                'Predict the supremum error at \\(n=10\\), whether it is attained and whether a shared \\(N\\) exists; increase \\(n\\) and check whether the prediction changes; only then press Show supremum.',
            ),
            expectedObservations: [
                text(
                    'Supremum je \\(1\\) in ni dosežen: za \\(x<1\\) je \\(x^n<1\\), pri \\(x=1\\) je napaka \\(0\\), blizu \\(x=1\\) pa se napaka približa \\(1\\). Skupnega \\(N\\) ni.',
                    'The supremum is \\(1\\) and not attained: for \\(x<1\\) we have \\(x^n<1\\), at \\(x=1\\) the error is \\(0\\), and near \\(x=1\\) the error approaches \\(1\\). There is no shared \\(N\\).',
                ),
                text(
                    'Supremum je \\(1\\) pri vsakem \\(n\\), tudi pri \\(n=50\\): konvergenca na \\([0;\\,1]\\) torej ni enakomerna, čeprav je pri vsakem \\(x\\) točkovna.',
                    'The supremum is \\(1\\) at every \\(n\\), also at \\(n=50\\): the convergence on \\([0,1]\\) is therefore not uniform, although it is pointwise at every \\(x\\).',
                ),
            ],
            scene: {
                id: 'uniform-supremum-one-scene', basedOn: 'demonstration-default',
                actions: [parameter('uniform-r', 1), parameter('uniform-x', 0.9), parameter('uniform-n', 10), uniformSupremumShown(false)],
                expectedState: text(
                    'Prikazano je \\(x^n\\) na \\([0;\\,1]\\) z \\(n=10\\), \\(x=0{,}9\\) in \\(\\varepsilon=0{,}1\\); supremum je skrit.',
                    'The function \\(x^n\\) is shown on \\([0,1]\\) with \\(n=10\\), \\(x=0.9\\) and \\(\\varepsilon=0.1\\); the supremum is hidden.',
                ),
            },
        },
        {
            id: 'uniform-domain-change-step', order: 6,
            title: text('Sprememba območja je nova primerjava', 'A domain change is a new comparison'),
            purpose: text('Ločiti enakomerno konvergenco na \\([0;\\,r]\\) od enakomerne konvergence na \\([0;\\,1]\\) in napovedati skupni \\(N\\) pri \\(r\\) blizu \\(1\\).', 'Separating uniform convergence on \\([0,\\,r]\\) from uniform convergence on \\([0,1]\\) and predicting the shared \\(N\\) for \\(r\\) close to \\(1\\).'),
            explanation: text(
                'Na \\([0;\\,1]\\) skupnega \\(N\\) ni, na \\([0;\\,0{,}8]\\) pa je bil \\(N=11\\). Zdaj je območje \\([0;\\,0{,}95]\\). To je nova primerjava: drugo območje, drug supremum \\(0{,}95^n\\) in drug skupni \\(N\\); ni nadaljevanje konvergence na prvotnem območju. Ko \\(r\\) raste proti \\(1\\), skupni \\(N\\) raste čez vse meje. Enakomerna konvergenca na vsakem \\([0;\\,r]\\) z \\(r<1\\) torej ne pomeni enakomerne konvergence na \\([0;\\,1]\\). Izbrana sta \\(r=0{,}95\\) in \\(n=44\\), supremum je skrit. Spremeniti \\(r\\) je mogoče le, če točka \\(x\\) ostane v \\([0;\\,r]\\); sicer aplikacija spremembo zavrne in prosi, naj najprej premakneš \\(x\\).',
                'On \\([0,1]\\) there is no shared \\(N\\), while on \\([0,\\,0.8]\\) it was \\(N=11\\). Now the domain is \\([0,\\,0.95]\\). This is a new comparison: a different domain, a different supremum \\(0.95^n\\) and a different shared \\(N\\); it is not a continuation of convergence on the original domain. As \\(r\\) grows towards \\(1\\), the shared \\(N\\) grows without bound. Uniform convergence on every \\([0,\\,r]\\) with \\(r<1\\) therefore does not mean uniform convergence on \\([0,1]\\). The chosen values are \\(r=0.95\\) and \\(n=44\\), and the supremum is hidden. \\(r\\) can be changed only if the point \\(x\\) stays in \\([0,\\,r]\\); otherwise the app rejects the change and asks you to move \\(x\\) first.',
            ),
            formulaIds: ['uniform-power-threshold'], learnerInteraction: 'adjust-construction-parameter',
            frames: [frame('uniform-domain-change-explanation', 'explanation'), frame('uniform-domain-change-observation', 'observation')],
            observationPrompt: text(
                'Napovej skupni \\(N\\) za \\(r=0{,}95\\) in \\(\\varepsilon=0{,}1\\); pritisni Pokaži supremum, nato povečaj \\(n\\) na \\(45\\) in preberi stanje. Nazadnje v polje Konec območja r vnesi \\(1\\) in primerjaj.',
                'Predict the shared \\(N\\) for \\(r=0.95\\) and \\(\\varepsilon=0.1\\); press Show supremum, then increase \\(n\\) to \\(45\\) and read the status. Finally enter \\(1\\) in the Domain end r field and compare.',
            ),
            expectedObservations: [
                text(
                    'Pri \\(n=44\\) je supremum \\(0{,}95^{44}\\approx0{,}1047\\), dosežen pri \\(x=0{,}95\\), in ni manjši od \\(\\varepsilon\\); skupni \\(N=45\\), saj je \\(0{,}95^{45}\\approx0{,}0994<0{,}1\\).',
                    'At \\(n=44\\) the supremum is \\(0.95^{44}\\approx0.1047\\), attained at \\(x=0.95\\), and is not below \\(\\varepsilon\\); the shared \\(N=45\\), since \\(0.95^{45}\\approx0.0994<0.1\\).',
                ),
                text(
                    'Pri \\(r=1\\) skupnega \\(N\\) ni več: supremum je \\(1\\) in ni dosežen. Skupni \\(N\\) je \\(11\\) pri \\(r=0{,}8\\), \\(45\\) pri \\(r=0{,}95\\) in ga ni pri \\(r=1\\).',
                    'At \\(r=1\\) there is no shared \\(N\\) any more: the supremum is \\(1\\) and not attained. The shared \\(N\\) is \\(11\\) at \\(r=0.8\\), \\(45\\) at \\(r=0.95\\) and does not exist at \\(r=1\\).',
                ),
            ],
            scene: {
                id: 'uniform-domain-change-scene', basedOn: 'demonstration-default',
                actions: [parameter('uniform-r', 0.95), parameter('uniform-n', 44), uniformSupremumShown(false)],
                expectedState: text(
                    'Prikazano je \\(x^n\\) na \\([0;\\,0{,}95]\\) z \\(n=44\\), \\(x=0{,}5\\) in \\(\\varepsilon=0{,}1\\); supremum je skrit.',
                    'The function \\(x^n\\) is shown on \\([0,\\,0.95]\\) with \\(n=44\\), \\(x=0.5\\) and \\(\\varepsilon=0.1\\); the supremum is hidden.',
                ),
            },
        },
        {
            id: 'uniform-free-exploration', order: 7,
            title: text('Primer \\(\\frac xn\\) na \\([0;\\,1]\\) in samostojno raziskovanje', 'The example \\(\\frac xn\\) on \\([0,1]\\), and free exploration'),
            purpose: text('Videti enakomerno konvergenco na \\([0;\\,1]\\) in preiti v samostojno raziskovanje.', 'Seeing uniform convergence on \\([0,1]\\) and handing over to free exploration.'),
            explanation: text(
                'Doslej so funkcije \\(x^n\\) na \\([0;\\,1]\\) konvergirale točkovno, a ne enakomerno. Zdaj je prikazan drug primer: \\(f_n(x)=\\frac xn\\) na \\([0;\\,1]\\) z limito \\(f(x)=0\\) povsod, brez skoka. Pri \\(n=5\\), \\(x=0{,}5\\) in \\(\\varepsilon=0{,}1\\) je točkovna napaka \\(0{,}1\\). Pomisli, kje na \\([0;\\,1]\\) je napaka največja in ali je njena velikost odvisna le od \\(n\\). Povzetek: enakomerna konvergenca zahteva en \\(N\\) za vse točke območja hkrati; zanj odloča supremum napake po obrazcu, ne vzorčene vrednosti; sprememba območja je nova primerjava. Zdaj raziskuj sam: izberi primer, spreminjaj \\(r\\), \\(n\\), \\(x\\) in \\(\\varepsilon\\) ter napovej, preden pokažeš supremum.',
                'So far the functions \\(x^n\\) on \\([0,1]\\) converged pointwise but not uniformly. Now another example is shown: \\(f_n(x)=\\frac xn\\) on \\([0,1]\\) with the limit \\(f(x)=0\\) everywhere, without a jump. At \\(n=5\\), \\(x=0.5\\) and \\(\\varepsilon=0.1\\) the pointwise error is \\(0.1\\). Think about where on \\([0,1]\\) the error is largest and whether its size depends only on \\(n\\). In summary: uniform convergence requires one \\(N\\) for all points of the domain at once; the supremum error from the formula decides it, not sampled values; a change of domain is a new comparison. Now explore on your own: choose an example, change \\(r\\), \\(n\\), \\(x\\) and \\(\\varepsilon\\), and predict before you show the supremum.',
            ),
            formulaIds: ['uniform-scaled', 'uniform-scaled-threshold'], learnerInteraction: 'adjust-construction-parameter',
            frames: [frame('uniform-free-explanation', 'explanation'), frame('uniform-free-observation', 'observation')],
            observationPrompt: text(
                'Napovej supremum napake in skupni \\(N\\) za \\(\\frac xn\\) pri \\(n=5\\) in \\(\\varepsilon=0{,}1\\); pritisni Pokaži supremum. Nato skrij supremum, izberi drug primer in napovej, preden ga spet pokažeš.',
                'Predict the supremum error and the shared \\(N\\) for \\(\\frac xn\\) at \\(n=5\\) and \\(\\varepsilon=0.1\\); press Show supremum. Then hide the supremum, choose another example and predict before you show it again.',
            ),
            expectedObservations: [
                text(
                    'Supremum je \\(\\frac15=0{,}2\\), dosežen v krajišču \\(x=1\\); skupni \\(N=11\\), saj je \\(\\frac1{11}<0{,}1\\) in \\(\\frac1{10}\\) ni. Pri \\(n\\ge11\\) ves graf \\(f_n\\) leži znotraj pasu.',
                    'The supremum is \\(\\frac15=0.2\\), attained at the endpoint \\(x=1\\); the shared \\(N=11\\), since \\(\\frac1{11}<0.1\\) and \\(\\frac1{10}\\) is not. For \\(n\\ge11\\) the whole graph of \\(f_n\\) lies inside the band.',
                ),
                text(
                    'Točkovni prag pri \\(x=0{,}5\\) je \\(N(0{,}5)=6\\), skupni \\(N=11\\) pa velja za vse točke hkrati. Po spremembi primera na \\(x^n\\) se naloži njegova privzeta nastavitev.',
                    'The pointwise threshold at \\(x=0.5\\) is \\(N(0.5)=6\\), while the shared \\(N=11\\) holds for all points at once. After changing the example to \\(x^n\\) its default setting is loaded.',
                ),
            ],
            scene: {
                id: 'uniform-free-scene', basedOn: 'demonstration-default',
                actions: [uniformChoice('scaled'), uniformSupremumShown(false)],
                expectedState: text(
                    'Prikazano je \\(\\frac xn\\) na \\([0;\\,1]\\) z \\(n=5\\), \\(x=0{,}5\\) in \\(\\varepsilon=0{,}1\\); supremum je skrit.',
                    'The function \\(\\frac xn\\) is shown on \\([0,1]\\) with \\(n=5\\), \\(x=0.5\\) and \\(\\varepsilon=0.1\\); the supremum is hidden.',
                ),
            },
        },
    ],
    sources: [
        {
            id: 'globevnik-brojan-analiza-1-uniform-convergence',
            citation: 'Globevnik, J., Brojan, M. Analiza I, Fakulteta za matematiko in fiziko, Univerza v Ljubljani, §§6.7 and 6.8 (printed pp. 237–242).',
            supports: ['pointwise convergence of a sequence of functions and uniform convergence on a set', 'uniform convergence is described by the supremum of |f_n - f| tending to 0', 'x^n converges pointwise on [0, 1] but not uniformly, and uniformly on [0, r] for r < 1'],
        },
        {
            id: 'bezeg-uniform-convergence-implementation',
            citation: 'Bezeg source: src/analysis/uniformConvergence.ts, src/analysis/uniformConvergenceModel.ts and src/graphs/functions/UniformConvergenceGraph.tsx.',
            supports: ['sup of |x^n - f| on [0, r], r < 1, is r^n attained at x = r; 0.8^5 = 0.32768', 'on [0, 1] the limit is 0 for x < 1 and 1 at x = 1, and the supremum of the error is 1 for every n and not attained', 'sup of x/n on [0, 1] is 1/n attained at x = 1 and the shared N is floor(1/epsilon) + 1', 'the shared N for x^n on [0, r] is 11 at r = 0.8, 45 at r = 0.95 and does not exist at r = 1 (epsilon = 0.1); the pointwise N(0.99) = 230'],
            implementationCorrespondence: 'The inputs r, x and epsilon live on decimal grids, so every threshold is computed with exact integer (BigInt) arithmetic and a logarithm only proposes a starting value; the supremum is a closed form per example and never a maximum over sampled points; the limit is drawn from separate pieces (a half-open segment, an open circle and an isolated point) so the jump is never joined; a threshold beyond the selectable n is reported and not truncated; a change of r that would leave the chosen x outside the domain is rejected and never clamped; a lesson scene applies set-function-parameter, set-function-choice and show-function-element actions through the same setters as the controls in one synchronous tick.',
        },
    ],
    edgeCases: [
        text(
            'Konec območja \\(r\\) mora biti večkratnik števila \\(0{,}05\\) med \\(0{,}1\\) in \\(1\\), točka \\(x\\) in toleranca \\(\\varepsilon\\) večkratnika števila \\(0{,}01\\), indeks \\(n\\) celo število od \\(1\\) do \\(50\\); vrednost zunaj mreže ali območja se zavrne, model ostane nespremenjen, datoteka s takšno vrednostjo pa se ne uvozi in pove, kaj popraviti.',
            'The domain end \\(r\\) must be a multiple of \\(0.05\\) between \\(0.1\\) and \\(1\\), the point \\(x\\) and the tolerance \\(\\varepsilon\\) multiples of \\(0.01\\), the index \\(n\\) an integer from \\(1\\) to \\(50\\); a value off the grid or outside the range is rejected and the model stays unchanged, and a file with such a value is not imported and says what to correct.',
        ),
        text(
            'Spremembe \\(r\\) pod trenutno točko \\(x\\) aplikacija ne prilagodi sama: zavrne jo in pove, da je treba najprej premakniti \\(x\\), saj bi sicer tiho spremenila izbrano točko.',
            'A change of \\(r\\) below the current point \\(x\\) is not adjusted by the app: it is rejected with the instruction to move \\(x\\) first, since otherwise it would silently change the chosen point.',
        ),
        text(
            'Skupni in točkovni \\(N\\) sta lahko večja od največjega izbirnega \\(n=50\\) (skupni do \\(90\\) pri \\(x^n\\) in do \\(101\\) pri \\(\\frac xn\\), točkovni do \\(459\\)); odčitek pove pravo število in da je nad mejo, ne skrajša ga.',
            'The shared and the pointwise \\(N\\) can exceed the largest selectable \\(n=50\\) (the shared one up to \\(90\\) for \\(x^n\\) and \\(101\\) for \\(\\frac xn\\), the pointwise one up to \\(459\\)); the readout gives the true number and says that it is beyond the limit, and does not shorten it.',
        ),
        text(
            'Skupni \\(N\\) je najmanjši \\(n\\), pri katerem je napaka manjša od \\(\\varepsilon\\) pri vseh \\(x\\) hkrati za vse večje indekse. Pri \\(x^n\\) na \\([0;\\,1]\\) je supremum napake \\(1\\) in ni dosežen. Za \\(\\varepsilon<1\\) skupnega \\(N\\) ni; pri \\(\\varepsilon=1\\) je supremum enak \\(\\varepsilon\\), a ni dosežen, zato je vsaka napaka manjša od \\(1\\) in deluje \\(N=1\\).',
            'The shared \\(N\\) is the least \\(n\\) such that the error is below \\(\\varepsilon\\) at every \\(x\\) at once for all larger indices. For \\(x^n\\) on \\([0,1]\\) the supremum of the error is \\(1\\) and is not attained. For \\(\\varepsilon<1\\) there is no shared \\(N\\); at \\(\\varepsilon=1\\) the supremum equals \\(\\varepsilon\\) but is not attained, so every error is below \\(1\\) and \\(N=1\\) works.',
        ),
    ],
    unresolvedQuestions: [
        text(
            'Pred pregledom za uporabo v razredu je treba potrditi razdelka §6.7 in §6.8 ter strani v viru (povzeto po poročilu o kandidatih, ne preverjeno v PDF) in ali naj lekcija doda še izrek, da je enakomerna limita zveznih funkcij zvezna, in Weierstrassov kriterij za vrste.',
            'Before classroom-ready review, confirm the sections §6.7 and §6.8 and their pages in the source (taken from the candidate report, not checked in the PDF) and whether the lesson should also add the theorem that a uniform limit of continuous functions is continuous, and the Weierstrass criterion for series.',
        ),
    ],
};

/** Lessons of the Analysis family, in teaching order. */
export const analysisGuidedLessons: readonly GuidedLesson[] = [bisection, meanValue, accumulation, darboux, extrema, convexity, taylor, sequence, uniformConvergence, fixedPoint];
