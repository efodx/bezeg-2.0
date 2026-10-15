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
 */
import type {FunctionParameterName} from '../model';
import type {BisectionExampleId} from '../../analysis/bisection';
import type {MeanValueExampleId} from '../../analysis/meanValue';
import type {FunctionId} from '../../analysis/functions';
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
                'Funkcija \\(f(x)=x^3-x\\) ima tri ničle \\(-1\\), \\(0\\) in \\(1\\). Na intervalu \\([-1{,}5;\\,2]\\) je \\(f(-1{,}5)=-1{,}875<0\\) in \\(f(2)=6>0\\), zato izrek zagotavlja vsaj eno ničlo, v resnici pa so v njem vse tri. Bisekcija najde le eno od njih; katero, je odvisno od izbire krajišč. Zdaj raziskuj sam: zamenjaj primer ali krajišči, pritisni Naslednji korak ali Predvajaj in preveri, kdaj je interval zaklet in kam se bisekcija stiska.',
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
            'Pred classroom-ready pregledom je treba potrditi, ali naj lekcija omeni tudi, da bisekcija pri večkratni ničli sode stopnje ne najde zaklenega intervala.',
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
                'Funkcija \\(f(x)=|x|\\) je zvezna na \\([-1,1]\\), a v točki \\(0\\) ni odvedljiva: graf ima kot. Naklon sekante je \\(\\frac{|1|-|-1|}{1-(-1)}=0\\), odvod pa je \\(-1\\) levo od \\(0\\) in \\(1\\) desno od \\(0\\), nikoli \\(0\\). Nobena točka, v kateri odvod obstaja, torej ne ujame naklona sekante. V točki \\(c=0\\) odvod ne obstaja, zato tangente ni: aplikacija je ne nariše in naklona tangente ne prikaže, ne pa da bi ga izmislila ali pokazala neskončnost. Izrek tu ne trdi nasprotnega, ker predpostavka odvedljivosti na \\((-1,1)\\) ni izpolnjena.',
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
                'Pri \\(x=\\pi\\) osenčeno območje zajame cel lok sinusa nad osjo, od \\(0\\) do \\(\\pi\\). Njegova vrednost je \\(A(\\pi)=1-\\cos\\pi=2\\), kar je znani rezultat \\(\\int_0^{\\pi}\\sin t\\,dt=2\\). Akumulacija \\(A\\) je do \\(x=\\pi\\) naraščala, ker je \\(\\sin t>0\\) na \\((0,\\pi)\\); v točki \\(x=\\pi\\) doseže najvišjo vrednost \\(2\\), kjer je \\(f(\\pi)=0\\) in je njena tangenta vodoravna.',
                'At \\(x=\\pi\\) the shaded region covers the whole arc of the sine above the axis, from \\(0\\) to \\(\\pi\\). Its value is \\(A(\\pi)=1-\\cos\\pi=2\\), the well-known result \\(\\int_0^{\\pi}\\sin t\\,dt=2\\). The accumulation \\(A\\) increased up to \\(x=\\pi\\), because \\(\\sin t>0\\) on \\((0,\\pi)\\); at the point \\(x=\\pi\\) it reaches its highest value \\(2\\), where \\(f(\\pi)=0\\) and its tangent is horizontal.',
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
                'Zdaj je \\(a=2\\) in \\(x=0\\). Integral je usmerjen od \\(a\\) proti \\(x\\), zato je \\(A(x)=-\\int_x^a f(t)\\,dt\\) in \\(A(0)=-\\int_0^2\\sin t\\,dt=-(1-\\cos 2)\\approx-1{,}4161\\). Osenčeno območje je enako kot pri \\(x=2\\) in leži nad osjo, vrednost pa je vseeno negativna, ker je smer obrnjena. To ni protislovje s prejšnjimi koraki: formula \\(F(x)-F(a)\\) velja za vsak \\(x\\), tudi za \\(x<a\\).',
                'Now \\(a=2\\) and \\(x=0\\). The integral is oriented from \\(a\\) towards \\(x\\), so \\(A(x)=-\\int_x^a f(t)\\,dt\\) and \\(A(0)=-\\int_0^2\\sin t\\,dt=-(1-\\cos 2)\\approx-1.4161\\). The shaded region is the same as for \\(x=2\\) and lies above the axis, yet the value is negative because the direction is reversed. This does not contradict the previous steps: the formula \\(F(x)-F(a)\\) holds for every \\(x\\), also for \\(x<a\\).',
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

/** Lessons of the Analysis family, in teaching order. */
export const analysisGuidedLessons: readonly GuidedLesson[] = [bisection, meanValue, accumulation];
