/**
 * Guided lessons of the Analysis family (ADR 0011, docs/specs/analysis-guided-lessons.md).
 * Each analysis topic appends its lesson to `analysisGuidedLessons` and its id to GUIDED_LESSON_AVAILABLE_IDS.
 *
 * Iterative lessons drive the graph with `run-bisection-command` scene actions (one `next-step` per revealed step), so a
 * scene shows the state after k steps and the learner presses the graph's own Next step to reveal the next one after
 * predicting it. The lesson frame therefore needs no playback controls of its own.
 */
import type {FunctionParameterName} from '../model';
import type {BisectionExampleId} from '../../analysis/bisection';
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

/** Lessons of the Analysis family, in teaching order. */
export const analysisGuidedLessons: readonly GuidedLesson[] = [bisection];
