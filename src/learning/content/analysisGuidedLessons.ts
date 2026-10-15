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
 */
import type {FunctionParameterName} from '../model';
import type {BisectionExampleId} from '../../analysis/bisection';
import type {MeanValueExampleId} from '../../analysis/meanValue';
import type {FunctionId} from '../../analysis/functions';
import type {DarbouxExampleId} from '../../analysis/darboux';
import type {ExtremaExampleId} from '../../analysis/extrema';
import type {ConvexityExampleId} from '../../analysis/convexity';
import type {TaylorExampleId} from '../../analysis/taylor';
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
                'Taylorjev polinom \\(T_n(x)=\\sum_{k=0}^{n}\\frac{f^{(k)}(c)}{k!}(x-c)^k\\) sestavimo iz višjih odvodov \\(f^{(k)}(c)\\) in fakultet \\(k!\\). Pri \\(f(x)=e^x\\) je vsak odvod enak \\(e^x\\), zato so koeficienti okoli \\(c=0\\) enaki \\(\\frac{1}{k!}\\). Opazujemo točko \\(x=1\\) in stopnjo \\(n=1\\): \\(T_1(1)=1+1=2\\), prava vrednost pa je \\(e\\approx2{,}7183\\), torej je napaka približno \\(0{,}7183\\). Polna črta je \\(f\\), črtkana \\(T_n\\), navpična črta pri \\(x\\) pa napaka. Ocena napake je skrita.',
                'The Taylor polynomial \\(T_n(x)=\\sum_{k=0}^{n}\\frac{f^{(k)}(c)}{k!}(x-c)^k\\) is built from higher derivatives \\(f^{(k)}(c)\\) and factorials \\(k!\\). For \\(f(x)=e^x\\) every derivative equals \\(e^x\\), so the coefficients about \\(c=0\\) are \\(\\frac{1}{k!}\\). We look at the point \\(x=1\\) and degree \\(n=1\\): \\(T_1(1)=1+1=2\\), while the true value is \\(e\\approx2.7183\\), so the error is about \\(0.7183\\). The solid line is \\(f\\), the dashed line is \\(T_n\\) and the vertical line at \\(x\\) is the error. The error bound is hidden.',
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

/** Lessons of the Analysis family, in teaching order. */
export const analysisGuidedLessons: readonly GuidedLesson[] = [bisection, meanValue, accumulation, darboux, extrema, convexity, taylor];
