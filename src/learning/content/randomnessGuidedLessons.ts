/**
 * Guided lessons of the randomness family, batch A (docs/specs/randomness-simulation-lessons.md): RS1, the Galton board against the binomial law, and RS2, the law of large numbers,
 * both on `prob-simulation` (SimulationGraph). Each is the lesson of one section of the randomness chapter (the chapter registry adapts them on request; the lesson catalog holds
 * none, as it keeps one lesson per Demonstration). Scenes use only the `random` actions the graph registers (`set-mode`, `set-run`, `set-overlay`, `set-position`) and every scene
 * starts from the Demonstration default (the Galton board, 10 rows, p = 1/2, 1000 balls, seed 42, all shown) and names what it sets. Every number the text quotes is a readout of the
 * graph for that scene, an exact value of the law shown in the same step, or a value the learner reads after an action the text asks for; the numbers are listed per step in
 * docs/reviews/feature-streams/families-prep/notes/f3-rand-a.md. A simulated tally is always stated as the result of one run with its seed, never as proof; the exact bars and the
 * exact band are the arguments, the heap and the running frequency are illustrations. The graph overlays one second seed, so RS2 step 5 compares two runs.
 */
import type {LessonAction} from '../model';
import type {FormulaBlock, GuidedLesson, GuidedLessonFrame, GuidedLessonStep, LessonScene, LocalizedText, WorkedExample} from './guidedLessons';

const text = (sl: string, en: string): LocalizedText => ({sl, en});
const frame = (id: string, kind: GuidedLessonFrame['kind']): GuidedLessonFrame => ({id, kind});

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
    frames: [
        frame(`${content.id}-explanation`, 'explanation'),
        ...(content.workedExampleId ? [frame(`${content.id}-calculation`, 'calculation')] : []),
        frame(`${content.id}-observation`, 'observation'),
    ],
});

/** The stored run fields a scene may set (the percent is a multiple of 5; setting `n` shows everything). */
export interface RandomnessSceneRun {
    readonly seed?: number;
    readonly n?: number;
    readonly rows?: number;
    readonly pPercent?: number;
}

/** What a simulation scene sets: the mode (the Demonstration default is the Galton board), the run fields, the second seed and the playback position (a stop of the playback). */
export interface RandomnessSceneSpec {
    readonly mode?: 'galton' | 'frequency';
    readonly run?: RandomnessSceneRun;
    readonly overlay?: {readonly seed2?: number};
    readonly position?: number;
}

/** The actions of a simulation scene: the Demonstration default, the mode, the run fields, the second run, then the position. */
export const randomnessSceneActions = (id: string, spec: RandomnessSceneSpec): LessonAction[] => [
    {kind: 'prepared-scene', sceneId: id, source: 'demonstration-default'},
    ...(spec.mode !== undefined ? [{kind: 'random', operation: 'set-mode', mode: spec.mode} as const] : []),
    ...(spec.run !== undefined ? [{kind: 'random', operation: 'set-run', ...spec.run} as const] : []),
    ...(spec.overlay !== undefined ? [{kind: 'random', operation: 'set-overlay', overlay: true, ...spec.overlay} as const] : []),
    ...(spec.position !== undefined ? [{kind: 'random', operation: 'set-position', shown: spec.position} as const] : []),
];

const randomScene = (id: string, spec: RandomnessSceneSpec, sl: string, en: string): LessonScene =>
    ({id, basedOn: 'demonstration-default', actions: randomnessSceneActions(id, spec), expectedState: text(sl, en)});

/** RS1: 10 rows, p = 1/2, seed 42 are the Demonstration default; the steps differ in the balls shown, the seed, the percent and the count. */
export const RS1_ONE_BALL = {position: 1} as const;
export const RS1_TEN_BALLS = {position: 10} as const;
export const RS1_HUNDRED_BALLS = {position: 100} as const;
export const RS1_THOUSAND_BALLS = {} as const;
export const RS1_OTHER_SEED = {run: {seed: 43}} as const;
export const RS1_SKEWED = {run: {pPercent: 30}} as const;
export const RS1_EXPLORE = {run: {n: 100000}} as const;

/** RS2: the fair coin, seed 42; the step 5 scene overlays seed 43; the exploration is seed 7. */
export const RS2_TEN_TOSSES = {mode: 'frequency', run: {n: 10}} as const;
export const RS2_HUNDRED_TOSSES = {mode: 'frequency', run: {n: 100}} as const;
export const RS2_THOUSAND_TOSSES = {mode: 'frequency', run: {n: 1000}} as const;
export const RS2_TEN_THOUSAND_TOSSES = {mode: 'frequency'} as const;
export const RS2_TWO_SEEDS = {mode: 'frequency', overlay: {seed2: 43}} as const;
export const RS2_EXPLORE = {mode: 'frequency', run: {seed: 7}} as const;

// ---- RS1 -------------------------------------------------------------------------------------------------------------------------

const rs1Formulas: readonly FormulaBlock[] = [
    {
        id: 'galton-law',
        latex: 'P_k=\\binom{n}{k}\\,p^{k}(1-p)^{n-k},\\qquad P_k=\\binom{n}{k}\\,2^{-n}\\quad\\left(p=\\tfrac12\\right)',
        notation: text(
            '\\(n\\) je število vrst klinov, \\(k\\) številka predala (število zavojev v desno), \\(p\\) verjetnost zavoja v desno in \\(P_k\\) verjetnost, da kroglica pristane v predalu \\(k\\).',
            '\\(n\\) is the number of rows of pegs, \\(k\\) the number of the slot (the number of bounces to the right), \\(p\\) the chance of a bounce to the right and \\(P_k\\) the chance that a ball lands in slot \\(k\\).',
        ),
        explanation: text(
            'Pot kroglice je zaporedje \\(n\\) zavojev levo ali desno. Pri \\(p=\\tfrac12\\) je vseh \\(2^n\\) poti enako verjetnih, v predal \\(k\\) pa vodi natanko \\(\\binom nk\\) poti (izberemo, pri katerih \\(k\\) klinih zavije desno). Zato je \\(P_k=\\binom nk\\,2^{-n}\\). Pri splošnem \\(p\\) ima vsaka taka pot verjetnost \\(p^k(1-p)^{n-k}\\). Stolpci zakona so ta števila, izračunana, ne izmerjena.',
            'The path of a ball is a sequence of \\(n\\) bounces left or right. For \\(p=\\tfrac12\\) all \\(2^n\\) paths are equally likely, and exactly \\(\\binom nk\\) paths lead to slot \\(k\\) (choose at which \\(k\\) pegs the ball bounces right). So \\(P_k=\\binom nk\\,2^{-n}\\). For a general \\(p\\) each such path has chance \\(p^k(1-p)^{n-k}\\). The bars of the law are these numbers, computed, not measured.',
        ),
    },
    {
        id: 'galton-gap',
        latex: '\\frac{N_k}{N}-P_k,\\qquad \\sqrt{\\frac{P_k\\,(1-P_k)}{N}}',
        notation: text(
            '\\(N\\) je število kroglic, \\(N_k\\) število kroglic v predalu \\(k\\), torej \\(\\tfrac{N_k}{N}\\) delež kroglic v njem; drugi izraz je običajno odstopanje tega deleža od \\(P_k\\).',
            '\\(N\\) is the number of balls, \\(N_k\\) the number of balls in slot \\(k\\), so \\(\\tfrac{N_k}{N}\\) is the share of balls in it; the second expression is the typical deviation of this share from \\(P_k\\).',
        ),
        explanation: text(
            'Ker pot vsake kroglice odloči naključje, se delež \\(\\tfrac{N_k}{N}\\) od \\(P_k\\) praviloma razlikuje. Običajna velikost razlike je \\(\\sqrt{P_k(1-P_k)/N}\\) in se z večanjem \\(N\\) manjša, a se zagotovo ne izniči: kopica je ponazoritev, stolpci zakona pa argument.',
            'Because chance decides the path of every ball, the share \\(\\tfrac{N_k}{N}\\) usually differs from \\(P_k\\). The usual size of the difference is \\(\\sqrt{P_k(1-P_k)/N}\\) and shrinks as \\(N\\) grows, but it does not vanish for sure: the heap is the illustration, the bars of the law are the argument.',
        ),
    },
];

const rs1Examples: readonly WorkedExample[] = [
    {
        id: 'rs1-middle',
        title: text('Srednji predal pri \\(10\\) vrstah', 'The middle slot with \\(10\\) rows'),
        calculationLatex: '\\binom{10}{5}=252,\\qquad P_5=\\frac{252}{2^{10}}=\\frac{252}{1024}',
        resultLatex: 'P_5=0{,}24609375',
        check: text(
            'Odčitek zakona je \\(0{,}2461\\); to je zaokrožena natančna vrednost \\(\\tfrac{252}{1024}\\), ki ima končni decimalni zapis \\(0{,}24609375\\). Od \\(1024\\) enako verjetnih poti jih \\(252\\) vodi v predal \\(5\\).',
            'The readout of the law is \\(0.2461\\); this is the rounded exact value \\(\\tfrac{252}{1024}\\), which has the finite decimal expansion \\(0.24609375\\). Of the \\(1024\\) equally likely paths, \\(252\\) lead to slot \\(5\\).',
        ),
    },
    {
        id: 'rs1-gap',
        title: text('Razlika pri \\(1000\\) kroglicah', 'The gap with \\(1000\\) balls'),
        calculationLatex: '\\frac{229}{1000}-0{,}2461=-0{,}0171,\\qquad \\sqrt{\\frac{0{,}2461\\cdot0{,}7539}{1000}}\\approx0{,}0136',
        resultLatex: '\\left|\\frac{N_5}{N}-P_5\\right|\\approx0{,}0171',
        check: text(
            'Odčitka grafa sta delež \\(0{,}229\\) in običajno odstopanje \\(\\pm\\,0{,}0136\\). Razlika \\(0{,}0171\\) je približno \\(1{,}3\\)-kratnik običajnega odstopanja: tako razliko pri \\(1000\\) kroglicah pričakujemo, ni napaka grafa.',
            'The readouts of the graph are the share \\(0.229\\) and the typical deviation \\(\\pm\\,0.0136\\). The gap \\(0.0171\\) is about \\(1.3\\) times the typical deviation: with \\(1000\\) balls such a gap is expected, it is not an error of the graph.',
        ),
    },
];

const rs1Steps: readonly GuidedLessonStep[] = [
    step({
        id: 'rs1-one-ball', order: 1,
        title: text('Ena kroglica, \\(10\\) klinov', 'One ball, \\(10\\) pegs'),
        purpose: text('Napovedati predal, v katerega pade kroglica, preden ga graf pokaže.', 'Predicting the slot in which the ball lands before the graph shows it.'),
        explanation: text(
            'Kroglica pade skozi \\(10\\) vrst klinov. Na vsakem klinu z enako verjetnostjo zavije levo ali desno. Predal \\(k\\) pomeni \\(k\\) zavojev v desno, predalov je \\(11\\), od \\(0\\) do \\(10\\). Graf kaže pot kroglice (ponazoritev); črtkana črta so stolpci zakona, ki jih bomo primerjali v tretjem koraku. Zapiši, v kateri predal bo po tvoji napovedi padla kroglica, nato pritisni Ponovi in Naslednji korak. Z začetnim semenom \\(42\\) (seme generatorja je število, ki določi celoten naključni potek) kroglica pristane v predalu \\(1\\), kar je malo verjeten izid: verjetnost je \\(\\tfrac{10}{1024}\\), približno \\(0{,}0098\\). Rezultat ene kroglice je zgolj en rezultat in o zakonu ne pove skoraj nič.',
            'A ball falls through \\(10\\) rows of pegs. At every peg it bounces left or right with equal chance. Slot \\(k\\) means \\(k\\) bounces to the right; there are \\(11\\) slots, from \\(0\\) to \\(10\\). The graph shows the path of the ball (an illustration); the dashed line shows the bars of the law, which we compare in step 3. Write down which slot you expect the ball to land in, then press Replay and Next step. With the starting seed \\(42\\) (the generator seed is a number that fixes the whole random course) the ball lands in slot \\(1\\), which is an unlikely outcome: its chance is \\(\\tfrac{10}{1024}\\), about \\(0.0098\\). The result of one ball is just one result and says almost nothing about the law.',
        ),
        formulaIds: [],
        observationPrompt: text('Pritisni Ponovi in Naslednji korak ter v odčitku Število kroglic po predalih poišči predal z eno kroglico.', 'Press Replay and Next step and find the slot with one ball in the readout Balls per slot.'),
        expectedObservations: [text('Z začetnim semenom \\(42\\) je ena kroglica v predalu \\(1\\); drugi predali imajo \\(0\\).', 'With the starting seed \\(42\\) one ball is in slot \\(1\\); the other slots have \\(0\\).')],
        scene: randomScene('rs1-one-ball-scene', RS1_ONE_BALL,
            'Galtonova deska, \\(10\\) vrst, \\(p=\\tfrac12\\), seme \\(42\\): prikazana je \\(1\\) kroglica od \\(1000\\), v predalu \\(1\\).',
            'Galton board, \\(10\\) rows, \\(p=\\tfrac12\\), seed \\(42\\): \\(1\\) ball of \\(1000\\) is shown, in slot \\(1\\).'),
    }),
    step({
        id: 'rs1-ten-balls', order: 2,
        title: text('Deset kroglic: kopica', 'Ten balls: the heap'),
        purpose: text('Videti, da se kopica pri majhnem številu kroglic še ne drži oblike.', 'Seeing that with few balls the heap does not yet follow a shape.'),
        explanation: text(
            'Naslednji korak prikaže več kroglic: iz \\(1\\) v \\(2\\), \\(5\\) in \\(10\\) (trikrat pritisni Naslednji korak). Kroglice se kopičijo v predalih in nastane kopica (ponazoritev). Z začetnim semenom \\(42\\) je po \\(10\\) kroglicah v predalih \\(1;\\ 3;\\ 5;\\ 6;\\ 7\\) po \\(1;\\ 3;\\ 3;\\ 1;\\ 2\\) kroglice, v predalu \\(4\\) pa nobene, čeprav bi po zakonu tam pričakovali največ (približno \\(2{,}1\\)). Pri tako malo kroglicah je kopica še nepravilna; to je rezultat ene izvedbe in ne pravilo.',
            'The next step shows more balls: from \\(1\\) to \\(2\\), \\(5\\) and \\(10\\) (press Next step three times). The balls pile up in the slots and form a heap (an illustration). With the starting seed \\(42\\) there are, after \\(10\\) balls, \\(1;\\ 3;\\ 3;\\ 1;\\ 2\\) balls in the slots \\(1;\\ 3;\\ 5;\\ 6;\\ 7\\) and none in slot \\(4\\), although by the law that slot has the largest expected count (about \\(2.1\\)). With so few balls the heap is still irregular; this is the result of one run and not a rule.',
        ),
        formulaIds: [],
        observationPrompt: text('Napovej, kako bi izgledala kopica pri \\(10\\) kroglicah, nato preberi Število kroglic po predalih.', 'Predict what the heap of \\(10\\) balls looks like, then read Balls per slot.'),
        expectedObservations: [text('Po \\(10\\) kroglicah: \\(0;\\ 1;\\ 0;\\ 3;\\ 0;\\ 3;\\ 1;\\ 2;\\ 0;\\ 0;\\ 0\\); največji razmik med deležem in zakonom je \\(0{,}2051\\).', 'After \\(10\\) balls: \\(0;\\ 1;\\ 0;\\ 3;\\ 0;\\ 3;\\ 1;\\ 2;\\ 0;\\ 0;\\ 0\\); the largest gap between share and law is \\(0.2051\\).')],
        scene: randomScene('rs1-ten-balls-scene', RS1_TEN_BALLS,
            'Galtonova deska, seme \\(42\\): \\(10\\) kroglic od \\(1000\\); po predalih \\(0;\\ 1;\\ 0;\\ 3;\\ 0;\\ 3;\\ 1;\\ 2;\\ 0;\\ 0;\\ 0\\), največji razmik \\(0{,}2051\\).',
            'Galton board, seed \\(42\\): \\(10\\) balls of \\(1000\\); per slot \\(0;\\ 1;\\ 0;\\ 3;\\ 0;\\ 3;\\ 1;\\ 2;\\ 0;\\ 0;\\ 0\\), largest gap \\(0.2051\\).'),
    }),
    step({
        id: 'rs1-bars', order: 3,
        title: text('Stolpci zakona', 'The bars of the law'),
        purpose: text('Ločiti izračunane stolpce, ki so argument, od kopice, ki je ponazoritev.', 'Telling the computed bars, which are the argument, from the heap, which is the illustration.'),
        explanation: text(
            'Črtkani stolpci so natančni: vsaka kroglica ima \\(2^{10}=1024\\) enako verjetnih poti, v predal \\(5\\) jih vodi \\(\\binom{10}{5}=252\\), zato je \\(P_5=\\tfrac{252}{1024}=0{,}24609375\\). Argument: stolpci so izračunani iz zakona, naključje jih ne spremeni. Kopica je ponazoritev: pri \\(100\\) kroglicah z istim semenom so v predalih \\(0;\\ 1;\\ 2;\\ 12;\\ 27;\\ 25;\\ 18;\\ 11;\\ 2;\\ 2;\\ 0\\) kroglice, zakon pa pričakuje približno \\(0{,}1;\\ 1;\\ 4{,}4;\\ 11{,}7;\\ 20{,}5;\\ 24{,}6;\\ 20{,}5;\\ 11{,}7;\\ 4{,}4;\\ 1;\\ 0{,}1\\). Kopica se že približuje stolpcem, a se z njimi ne ujema; to je rezultat ene izvedbe.',
            'The dashed bars are exact: every ball has \\(2^{10}=1024\\) equally likely paths, \\(\\binom{10}{5}=252\\) of them lead to slot \\(5\\), so \\(P_5=\\tfrac{252}{1024}=0.24609375\\). Argument: the bars are computed from the law, chance does not change them. The heap is an illustration: with \\(100\\) balls and the same seed the slots hold \\(0;\\ 1;\\ 2;\\ 12;\\ 27;\\ 25;\\ 18;\\ 11;\\ 2;\\ 2;\\ 0\\) balls, and the law expects about \\(0.1;\\ 1;\\ 4.4;\\ 11.7;\\ 20.5;\\ 24.6;\\ 20.5;\\ 11.7;\\ 4.4;\\ 1;\\ 0.1\\). The heap already approaches the bars but does not match them; this is the result of one run.',
        ),
        formulaIds: ['galton-law'],
        workedExampleId: 'rs1-middle',
        observationPrompt: text('Primerjaj Število kroglic po predalih in Pričakovano po predalih; ugotovi, kje sta si najbližja in kje najdlje.', 'Compare Balls per slot and Expected per slot; find where they are closest and where they are furthest apart.'),
        expectedObservations: [text('Po \\(100\\) kroglicah: delež srednjega predala \\(0{,}25\\), po zakonu \\(0{,}2461\\); največji razmik \\(0{,}0649\\).', 'After \\(100\\) balls: the share of the middle slot is \\(0.25\\), by the law \\(0.2461\\); the largest gap is \\(0.0649\\).')],
        scene: randomScene('rs1-bars-scene', RS1_HUNDRED_BALLS,
            'Galtonova deska, seme \\(42\\): \\(100\\) kroglic od \\(1000\\); po predalih \\(0;\\ 1;\\ 2;\\ 12;\\ 27;\\ 25;\\ 18;\\ 11;\\ 2;\\ 2;\\ 0\\), največji razmik \\(0{,}0649\\).',
            'Galton board, seed \\(42\\): \\(100\\) balls of \\(1000\\); per slot \\(0;\\ 1;\\ 2;\\ 12;\\ 27;\\ 25;\\ 18;\\ 11;\\ 2;\\ 2;\\ 0\\), largest gap \\(0.0649\\).'),
    }),
    step({
        id: 'rs1-thousand', order: 4,
        title: text('Tisoč kroglic: kako daleč od stolpca?', 'A thousand balls: how far from the bar?'),
        purpose: text('Napovedati, koliko se delež srednjega predala razlikuje od \\(0{,}2461\\), in videti, da je razlika pričakovana.', 'Predicting how far the share of the middle slot is from \\(0.2461\\) and seeing that the gap is expected.'),
        explanation: text(
            'Zapiši napoved: kolikšen delež od \\(1000\\) kroglic bo v predalu \\(5\\) in za koliko se bo razlikoval od \\(0{,}2461\\)? Nato nadaljuj do \\(1000\\) kroglic (Predvajaj). Z začetnim semenom \\(42\\) je v predalu \\(5\\) \\(229\\) kroglic, torej delež \\(0{,}229\\); zakon pričakuje \\(246{,}1\\) kroglic. Razlika \\(0{,}0171\\) je malo več kot običajno odstopanje \\(0{,}0136\\), zato je kopica nekoliko drugačna od stolpcev, pa to pričakujemo. Ponazoritev ni natančna slika argumenta: razlika je zgolj rezultat tega zagona, ne napaka.',
            'Write down a prediction: what share of the \\(1000\\) balls will be in slot \\(5\\), and by how much will it differ from \\(0.2461\\)? Then continue to \\(1000\\) balls (Play). With the starting seed \\(42\\) slot \\(5\\) holds \\(229\\) balls, a share of \\(0.229\\); the law expects \\(246.1\\) balls. The gap \\(0.0171\\) is a little more than the typical deviation \\(0.0136\\), so the heap differs somewhat from the bars, and this is expected. An illustration is not an exact picture of the argument: the gap is just the result of this run, not an error.',
        ),
        formulaIds: ['galton-gap'],
        workedExampleId: 'rs1-gap',
        observationPrompt: text('Preberi odčitek Predal 5. Nato v polje Število kroglic vpiši \\(100\\), \\(10000\\) in \\(100000\\) ter si zapiši Največji razmik med deležem in zakonom; na koncu vpiši spet \\(1000\\).', 'Read the readout Slot 5. Then type \\(100\\), \\(10000\\) and \\(100000\\) into the field Number of balls and write down the Largest gap between share and law; finally type \\(1000\\) again.'),
        expectedObservations: [text('Po predalih \\(0;\\ 12;\\ 38;\\ 118;\\ 218;\\ 229;\\ 207;\\ 125;\\ 42;\\ 11;\\ 0\\); največji razmik \\(0{,}0171\\). Pri \\(100\\), \\(10000\\), \\(100000\\) kroglicah je največji razmik z istim semenom \\(0{,}0649\\), \\(0{,}0079\\), \\(0{,}0011\\); po vrnitvi na \\(1000\\) je kopica spet enaka.', 'Per slot \\(0;\\ 12;\\ 38;\\ 118;\\ 218;\\ 229;\\ 207;\\ 125;\\ 42;\\ 11;\\ 0\\); largest gap \\(0.0171\\). With \\(100\\), \\(10000\\), \\(100000\\) balls and the same seed the largest gap is \\(0.0649\\), \\(0.0079\\), \\(0.0011\\); after returning to \\(1000\\) the heap is the same again.')],
        scene: randomScene('rs1-thousand-scene', RS1_THOUSAND_BALLS,
            'Galtonova deska, seme \\(42\\): \\(1000\\) kroglic; po predalih \\(0;\\ 12;\\ 38;\\ 118;\\ 218;\\ 229;\\ 207;\\ 125;\\ 42;\\ 11;\\ 0\\), predal \\(5\\): delež \\(0{,}229\\), po zakonu \\(0{,}2461\\), običajno odstopanje \\(0{,}0136\\); največji razmik \\(0{,}0171\\).',
            'Galton board, seed \\(42\\): \\(1000\\) balls; per slot \\(0;\\ 12;\\ 38;\\ 118;\\ 218;\\ 229;\\ 207;\\ 125;\\ 42;\\ 11;\\ 0\\), slot \\(5\\): share \\(0.229\\), by the law \\(0.2461\\), typical deviation \\(0.0136\\); largest gap \\(0.0171\\).'),
    }),
    step({
        id: 'rs1-seed', order: 5,
        title: text('Isto seme, drugo seme', 'The same seed, another seed'),
        purpose: text('Ločiti ponovitev iste kopice od nove kopice in videti, da se stolpci zakona ne spremenijo.', 'Telling a replay of the same heap from a new heap and seeing that the bars of the law do not change.'),
        explanation: text(
            'Seme določa celotno zaporedje naključnih odločitev. Pritisni Ponovi in Predvajaj: z istim semenom dobiš natančno isto kopico, saj naključje stroja ni naključje v pravem pomenu, ampak zaporedje, ki ga določa seme. Zdaj je nastavljeno seme \\(43\\): po predalih \\(1;\\ 12;\\ 49;\\ 126;\\ 220;\\ 241;\\ 211;\\ 97;\\ 33;\\ 10;\\ 0\\) kroglic, delež srednjega predala \\(0{,}241\\), največji razmik \\(0{,}0202\\). Kopica je drugačna, stolpci zakona pa so enaki: kopica je ponazoritev tega zagona, stolpci so argument. Če v polje Seme generatorja spet vpišeš \\(42\\), se vrne kopica iz četrtega koraka.',
            'The seed fixes the whole sequence of random decisions. Press Replay and Play: with the same seed you get exactly the same heap, because the machine\'s chance is a sequence fixed by the seed. The seed is now \\(43\\): the slots hold \\(1;\\ 12;\\ 49;\\ 126;\\ 220;\\ 241;\\ 211;\\ 97;\\ 33;\\ 10;\\ 0\\) balls, the share of the middle slot is \\(0.241\\), the largest gap \\(0.0202\\). The heap is different, but the bars of the law are the same: the heap is the illustration of this run, the bars are the argument. If you type \\(42\\) into the field Generator seed again, the heap of step 4 returns.',
        ),
        formulaIds: [],
        observationPrompt: text('Pritisni Ponovi in Predvajaj in preveri, da je končna kopica ista; nato vpiši seme \\(42\\) in primerjaj s četrtim korakom.', 'Press Replay and Play and check that the final heap is the same; then type seed \\(42\\) and compare with step 4.'),
        expectedObservations: [text('Seme \\(43\\), \\(1000\\) kroglic: \\(1;\\ 12;\\ 49;\\ 126;\\ 220;\\ 241;\\ 211;\\ 97;\\ 33;\\ 10;\\ 0\\); stolpci zakona nespremenjeni.', 'Seed \\(43\\), \\(1000\\) balls: \\(1;\\ 12;\\ 49;\\ 126;\\ 220;\\ 241;\\ 211;\\ 97;\\ 33;\\ 10;\\ 0\\); the bars of the law unchanged.')],
        scene: randomScene('rs1-seed-scene', RS1_OTHER_SEED,
            'Galtonova deska, seme \\(43\\), \\(1000\\) kroglic: po predalih \\(1;\\ 12;\\ 49;\\ 126;\\ 220;\\ 241;\\ 211;\\ 97;\\ 33;\\ 10;\\ 0\\), delež srednjega predala \\(0{,}241\\), največji razmik \\(0{,}0202\\).',
            'Galton board, seed \\(43\\), \\(1000\\) balls: per slot \\(1;\\ 12;\\ 49;\\ 126;\\ 220;\\ 241;\\ 211;\\ 97;\\ 33;\\ 10;\\ 0\\), share of the middle slot \\(0.241\\), largest gap \\(0.0202\\).'),
    }),
    step({
        id: 'rs1-p', order: 6,
        title: text('Drugačna verjetnost zavoja', 'A different chance of bouncing'),
        purpose: text('Napovedati, kam se premakne najvišji stolpec, ko \\(p\\) ni \\(\\tfrac12\\).', 'Predicting where the tallest bar moves when \\(p\\) is not \\(\\tfrac12\\).'),
        explanation: text(
            'Če kroglica zavije desno z verjetnostjo \\(p=0{,}3\\), so poti v levo verjetnejše. Zapiši napoved, kje bo najvišji stolpec. Argument: \\(P_k=\\binom{10}{k}\\,0{,}3^{k}\\,0{,}7^{10-k}\\) je največji pri \\(k=3\\), kjer je \\(P_3\\approx0{,}2668\\). Z začetnim semenom \\(42\\) kopica sledi stolpcem: po predalih \\(31;\\ 121;\\ 223;\\ 273;\\ 206;\\ 104;\\ 28;\\ 14;\\ 0;\\ 0;\\ 0\\), zakon pa pričakuje približno \\(28{,}2;\\ 121{,}1;\\ 233{,}5;\\ 266{,}8;\\ 200{,}1;\\ 102{,}9;\\ 36{,}8;\\ 9;\\ 1{,}4;\\ 0{,}1;\\ 0\\). Pri \\(k=7\\) je kroglic \\(14\\) namesto približno \\(9\\): razlike v posameznih predalih so običajne.',
            'If the ball bounces right with chance \\(p=0.3\\), paths to the left are more likely. Write down where you expect the tallest bar. Argument: \\(P_k=\\binom{10}{k}\\,0.3^{k}\\,0.7^{10-k}\\) is largest at \\(k=3\\), where \\(P_3\\approx0.2668\\). With the starting seed \\(42\\) the heap follows the bars: per slot \\(31;\\ 121;\\ 223;\\ 273;\\ 206;\\ 104;\\ 28;\\ 14;\\ 0;\\ 0;\\ 0\\), while the law expects about \\(28.2;\\ 121.1;\\ 233.5;\\ 266.8;\\ 200.1;\\ 102.9;\\ 36.8;\\ 9;\\ 1.4;\\ 0.1;\\ 0\\). Slot \\(7\\) holds \\(14\\) balls instead of about \\(9\\): differences in single slots are usual.',
        ),
        formulaIds: ['galton-law'],
        observationPrompt: text('Z drsnikom Verjetnost desno (%) spreminjaj vrednost po \\(5\\,\\%\\) (npr. \\(35\\) in \\(70\\)) in opazuj, kam se premakneta stolpec in kopica.', 'With the slider Probability of going right (%) change the value in steps of \\(5\\,\\%\\) (for example \\(35\\) and \\(70\\)) and watch where the bar and the heap move.'),
        expectedObservations: [text('Pri \\(30\\,\\%\\) je najvišji stolpec v predalu \\(3\\): delež \\(0{,}273\\), po zakonu \\(0{,}2668\\); največji razmik \\(0{,}0105\\). Pri \\(35\\,\\%\\) je v predalu \\(3\\) delež \\(0{,}258\\), po zakonu \\(0{,}2522\\); pri \\(70\\,\\%\\) je v predalu \\(7\\) delež \\(0{,}266\\), po zakonu \\(0{,}2668\\).', 'At \\(30\\,\\%\\) the tallest bar is in slot \\(3\\): share \\(0.273\\), by the law \\(0.2668\\); largest gap \\(0.0105\\). At \\(35\\,\\%\\) slot \\(3\\) has share \\(0.258\\), by the law \\(0.2522\\); at \\(70\\,\\%\\) slot \\(7\\) has share \\(0.266\\), by the law \\(0.2668\\).')],
        scene: randomScene('rs1-p-scene', RS1_SKEWED,
            'Galtonova deska, \\(p=0{,}3\\), seme \\(42\\), \\(1000\\) kroglic: po predalih \\(31;\\ 121;\\ 223;\\ 273;\\ 206;\\ 104;\\ 28;\\ 14;\\ 0;\\ 0;\\ 0\\), predal \\(3\\): delež \\(0{,}273\\), po zakonu \\(0{,}2668\\); največji razmik \\(0{,}0105\\).',
            'Galton board, \\(p=0.3\\), seed \\(42\\), \\(1000\\) balls: per slot \\(31;\\ 121;\\ 223;\\ 273;\\ 206;\\ 104;\\ 28;\\ 14;\\ 0;\\ 0;\\ 0\\), slot \\(3\\): share \\(0.273\\), by the law \\(0.2668\\); largest gap \\(0.0105\\).'),
    }),
    step({
        id: 'rs1-explore', order: 7,
        title: text('Raziskovanje', 'Free exploration'),
        purpose: text('Sam spreminjati število kroglic, vrst, verjetnost in seme ter napovedati razmik, preden ga preveriš.', 'Changing the number of balls, rows, the chance and the seed yourself and predicting the gap before checking it.'),
        explanation: text(
            'Spreminjaj število kroglic, vrst klinov, verjetnost in seme ter pred vsako spremembo napovej, kje bo najvišji stolpec in kako velik bo največji razmik. Zdaj je prikazanih \\(100000\\) kroglic z semenom \\(42\\): po predalih \\(102;\\ 1009;\\ 4439;\\ 11765;\\ 20395;\\ 24547;\\ 20586;\\ 11636;\\ 4422;\\ 1003;\\ 96\\), največji razmik le \\(0{,}0011\\). Kopica je zdaj komaj ločljiva od stolpcev, a bi z drugim semenom ostala nekoliko drugačna: razlika se z večanjem števila kroglic praviloma manjša, ne izgine. Pri tako velikem številu kroglic lahko graf nekaj časa računa.',
            'Change the number of balls, the number of rows of pegs, the chance and the seed, and before each change predict where the tallest bar will be and how large the largest gap will be. Now \\(100000\\) balls with seed \\(42\\) are shown: per slot \\(102;\\ 1009;\\ 4439;\\ 11765;\\ 20395;\\ 24547;\\ 20586;\\ 11636;\\ 4422;\\ 1003;\\ 96\\), the largest gap only \\(0.0011\\). The heap is now hardly distinguishable from the bars, but with another seed it would still differ a little: the gap usually shrinks as the number of balls grows, and does not vanish. With so many balls the graph may take a moment to compute.',
        ),
        formulaIds: [],
        observationPrompt: text('Spremeni število vrst klinov in verjetnost, napovej najvišji stolpec in preveri odčitek; nato primerjaj dva različna semena pri istem številu kroglic.', 'Change the number of rows and the chance, predict the tallest bar and check the readout; then compare two different seeds with the same number of balls.'),
        expectedObservations: [text('Pri \\(100000\\) kroglicah in semenu \\(42\\) je največji razmik \\(0{,}0011\\); delež srednjega predala \\(0{,}2455\\), po zakonu \\(0{,}2461\\).', 'With \\(100000\\) balls and seed \\(42\\) the largest gap is \\(0.0011\\); the share of the middle slot is \\(0.2455\\), by the law \\(0.2461\\).')],
        scene: randomScene('rs1-explore-scene', RS1_EXPLORE,
            'Galtonova deska, seme \\(42\\), \\(100000\\) kroglic: po predalih \\(102;\\ 1009;\\ 4439;\\ 11765;\\ 20395;\\ 24547;\\ 20586;\\ 11636;\\ 4422;\\ 1003;\\ 96\\), največji razmik \\(0{,}0011\\).',
            'Galton board, seed \\(42\\), \\(100000\\) balls: per slot \\(102;\\ 1009;\\ 4439;\\ 11765;\\ 20395;\\ 24547;\\ 20586;\\ 11636;\\ 4422;\\ 1003;\\ 96\\), largest gap \\(0.0011\\).'),
    }),
];

// ---- RS2 -------------------------------------------------------------------------------------------------------------------------

const rs2Formulas: readonly FormulaBlock[] = [
    {
        id: 'frequency',
        latex: 'f=\\frac{h}{n},\\qquad d=h-\\frac{n}{2},\\qquad \\sqrt{\\frac{\\tfrac12\\cdot\\tfrac12}{n}}=\\frac{1}{2\\sqrt n}',
        notation: text(
            '\\(n\\) je število metov, \\(h\\) število grbov, \\(f\\) relativna frekvenca grbov, \\(d\\) število grbov nad polovico metov; zadnji izraz je običajno odstopanje frekvence \\(f\\) od \\(\\tfrac12\\).',
            '\\(n\\) is the number of tosses, \\(h\\) the number of heads, \\(f\\) the relative frequency of heads, \\(d\\) the number of heads above half of the tosses; the last expression is the typical deviation of the frequency \\(f\\) from \\(\\tfrac12\\).',
        ),
        explanation: text(
            'Relativna frekvenca \\(f=\\tfrac hn\\) pove, kolikšen del metov je grb. Pri pošteni kovanci je običajno odstopanje frekvence od \\(\\tfrac12\\) enako \\(\\tfrac{1}{2\\sqrt n}\\), torej se z večanjem \\(n\\) manjša. Število grbov nad polovico, \\(d\\), ima običajno velikost \\(\\tfrac{\\sqrt n}{2}\\), in ta raste. Obe trditvi sta posledici istega zakona.',
            'The relative frequency \\(f=\\tfrac hn\\) tells what share of the tosses are heads. For a fair coin the typical deviation of the frequency from \\(\\tfrac12\\) is \\(\\tfrac{1}{2\\sqrt n}\\), so it shrinks as \\(n\\) grows. The number of heads above half, \\(d\\), has typical size \\(\\tfrac{\\sqrt n}{2}\\), and this grows. Both statements are consequences of the same law.',
        ),
    },
    {
        id: 'exact-band',
        latex: 'P\\bigl(\\lvert 2H-n\\rvert\\le w\\bigr)=\\sum_{\\lvert 2k-n\\rvert\\le w}\\binom{n}{k}\\,2^{-n}\\ \\ge\\ 0{,}95',
        notation: text(
            '\\(H\\) je število grbov v \\(n\\) metih, \\(k\\) preteče možne vrednosti \\(H\\), \\(w\\) je najmanjše število iste parnosti kot \\(n\\), pri katerem vsota doseže \\(0{,}95\\); pas \\(\\tfrac n2\\pm\\tfrac w2\\) je pas \\(95\\,\\%\\).',
            '\\(H\\) is the number of heads in \\(n\\) tosses, \\(k\\) runs through the possible values of \\(H\\), \\(w\\) is the smallest number with the same parity as \\(n\\) for which the sum reaches \\(0.95\\); the band \\(\\tfrac n2\\pm\\tfrac w2\\) is the \\(95\\,\\%\\) band.',
        ),
        explanation: text(
            'Pas \\(95\\,\\%\\) ni približek z normalno krivuljo: izračunan je s točno vsoto členov \\(\\binom nk 2^{-n}\\). Pove, med katerima številoma grbov se konča vsaj \\(95\\,\\%\\) vseh zagonov; pri največ \\(5\\,\\%\\) zagonov se konča zunaj, kar ni napaka. Argument je pas, ki se oži (v deležih), ne en zagon.',
            'The \\(95\\,\\%\\) band is not an approximation with the normal curve: it is computed with the exact sum of the terms \\(\\binom nk 2^{-n}\\). It says between which numbers of heads at least \\(95\\,\\%\\) of all runs end; in at most \\(5\\,\\%\\) of the runs the result ends outside, which is no error. The argument is the narrowing band (in shares), not a single run.',
        ),
    },
];

const rs2Examples: readonly WorkedExample[] = [
    {
        id: 'rs2-sizes',
        title: text('Običajno odstopanje pri \\(100\\) in \\(10000\\) metih', 'The typical deviation with \\(100\\) and \\(10000\\) tosses'),
        calculationLatex: '\\frac{1}{2\\sqrt{100}}=0{,}05,\\qquad \\frac{1}{2\\sqrt{10000}}=0{,}005,\\qquad \\frac{\\sqrt{10000}}{2}=50',
        resultLatex: '0{,}05\\ \\to\\ 0{,}005,\\qquad 5\\ \\to\\ 50',
        check: text(
            'Odčitka grafa za običajno odstopanje deleža sta \\(0{,}05\\) in \\(0{,}005\\). Stokrat več metov odstopanje frekvence zmanjša desetkrat, a odstopanje števila grbov poveča z \\(\\tfrac{\\sqrt{100}}{2}=5\\) na \\(50\\).',
            'The readouts of the graph for the typical deviation of the share are \\(0.05\\) and \\(0.005\\). A hundred times as many tosses makes the deviation of the frequency ten times smaller but increases the deviation of the number of heads from \\(\\tfrac{\\sqrt{100}}{2}=5\\) to \\(50\\).',
        ),
    },
];

const rs2Steps: readonly GuidedLessonStep[] = [
    step({
        id: 'rs2-ten', order: 1,
        title: text('Deset metov kovanca', 'Ten coin tosses'),
        purpose: text('Napovedati, kje bo frekvenca po \\(100\\) metih, preden se pokaže.', 'Predicting where the frequency will be after \\(100\\) tosses before it appears.'),
        explanation: text(
            'Pošten kovanec vržemo \\(10\\)-krat; relativna frekvenca grbov je \\(f=\\tfrac hn\\), delež metov, ki so grb. Z začetnim semenom \\(42\\) (seme generatorja je število, ki določi celoten naključni potek) je \\(h=1\\) grb in \\(f=0{,}1\\), daleč od \\(\\tfrac12\\). Graf kaže, kako se \\(f\\) giblje med vsakim metom (ponazoritev); črta \\(\\tfrac12\\) je pričakovana vrednost. Zapiši, kje bo po tvoji napovedi \\(f\\) po \\(100\\) metih. Rezultat \\(10\\) metov je rezultat enega zagona; z drugim semenom bi bil drugačen.',
            'A fair coin is tossed \\(10\\) times; the relative frequency of heads is \\(f=\\tfrac hn\\), the share of tosses that are heads. With the starting seed \\(42\\) (the generator seed is a number that fixes the whole random course) there is \\(h=1\\) head and \\(f=0.1\\), far from \\(\\tfrac12\\). The graph shows how \\(f\\) moves with every toss (an illustration); the line \\(\\tfrac12\\) is the expected value. Write down where you expect \\(f\\) to be after \\(100\\) tosses. The result of \\(10\\) tosses is the result of one run; with another seed it would be different.',
        ),
        formulaIds: ['frequency'],
        observationPrompt: text('Preberi Število grbov in Relativno frekvenco grbov; nato zapiši napoved za \\(100\\) metov.', 'Read Number of heads and Relative frequency of heads; then write down your prediction for \\(100\\) tosses.'),
        expectedObservations: [text('Po \\(10\\) metih \\(1\\) grb, \\(f=0{,}1\\); grbov več kot pol metov \\(-4\\); pas \\(95\\,\\%\\) od \\(2\\) do \\(8\\) grbov.', 'After \\(10\\) tosses \\(1\\) head, \\(f=0.1\\); heads above half the tosses \\(-4\\); the \\(95\\,\\%\\) band from \\(2\\) to \\(8\\) heads.')],
        scene: randomScene('rs2-ten-scene', RS2_TEN_TOSSES,
            'Kovanec, seme \\(42\\), \\(10\\) metov: \\(1\\) grb, \\(f=0{,}1\\), grbov več kot pol metov \\(-4\\); pas \\(95\\,\\%\\) od \\(2\\) do \\(8\\).',
            'Coin, seed \\(42\\), \\(10\\) tosses: \\(1\\) head, \\(f=0.1\\), heads above half the tosses \\(-4\\); the \\(95\\,\\%\\) band from \\(2\\) to \\(8\\).'),
    }),
    step({
        id: 'rs2-hundred', order: 2,
        title: text('Sto metov', 'A hundred tosses'),
        purpose: text('Primerjati napoved z odčitkom in videti, da frekvenca ne hiti k \\(\\tfrac12\\) po nekem pravilu.', 'Comparing the prediction with the readout and seeing that the frequency does not hurry to \\(\\tfrac12\\) by some rule.'),
        explanation: text(
            'Z istim semenom je po \\(100\\) metih \\(h=45\\) grbov in \\(f=0{,}45\\): bližje \\(\\tfrac12\\) kakor po \\(10\\) metih. Kovanec nima spomina, zato ne popravlja prejšnjih metov; frekvenca se približa tako, da novi meti "razredčijo" začetne. Pas \\(95\\,\\%\\) je zdaj od \\(40\\) do \\(60\\) grbov, torej \\(\\tfrac12\\pm0{,}1\\) v deležih. Natančno: verjetnost, da se število grbov od \\(50\\) razlikuje za \\(10\\) ali več, je približno \\(0{,}0569\\) (vsota natančnih členov \\(\\binom{100}{k}2^{-100}\\)); torej take zagone pričakujemo približno enkrat na \\(18\\).',
            'With the same seed there are \\(h=45\\) heads after \\(100\\) tosses and \\(f=0.45\\): closer to \\(\\tfrac12\\) than after \\(10\\) tosses. The coin has no memory and does not make up for earlier tosses; the frequency approaches because new tosses "dilute" the first ones. The \\(95\\,\\%\\) band is now from \\(40\\) to \\(60\\) heads, so \\(\\tfrac12\\pm0.1\\) in shares. Exactly: the chance that the number of heads differs from \\(50\\) by \\(10\\) or more is about \\(0.0569\\) (a sum of the exact terms \\(\\binom{100}{k}2^{-100}\\)); so we expect such runs about once in \\(18\\).',
        ),
        formulaIds: ['frequency'],
        observationPrompt: text('Primerjaj \\(f\\) z napovedjo in preberi odčitek Pas \\(95\\,\\%\\) za število grbov.', 'Compare \\(f\\) with your prediction and read the readout \\(95\\,\\%\\) band for the number of heads.'),
        expectedObservations: [text('Po \\(100\\) metih \\(45\\) grbov, \\(f=0{,}45\\), grbov več kot pol metov \\(-5\\); pas od \\(40\\) do \\(60\\) (\\(\\pm10\\)).', 'After \\(100\\) tosses \\(45\\) heads, \\(f=0.45\\), heads above half the tosses \\(-5\\); the band from \\(40\\) to \\(60\\) (\\(\\pm10\\)).')],
        scene: randomScene('rs2-hundred-scene', RS2_HUNDRED_TOSSES,
            'Kovanec, seme \\(42\\), \\(100\\) metov: \\(45\\) grbov, \\(f=0{,}45\\), grbov več kot pol metov \\(-5\\); pas \\(95\\,\\%\\) od \\(40\\) do \\(60\\), običajno odstopanje deleža \\(0{,}05\\).',
            'Coin, seed \\(42\\), \\(100\\) tosses: \\(45\\) heads, \\(f=0.45\\), heads above half the tosses \\(-5\\); the \\(95\\,\\%\\) band from \\(40\\) to \\(60\\), typical deviation of the share \\(0.05\\).'),
    }),
    step({
        id: 'rs2-thousand', order: 3,
        title: text('Tisoč metov: lijak se zapira', 'A thousand tosses: the funnel closes'),
        purpose: text('Videti, da se pas \\(95\\,\\%\\) v deležih oži, in ločiti argument od zagona.', 'Seeing that the \\(95\\,\\%\\) band narrows in shares and telling the argument from the run.'),
        explanation: text(
            'Argument: pas \\(95\\,\\%\\) je izračunan s točnimi členi binomske porazdelitve, ne po normalni formuli. Po \\(1000\\) metih je od \\(469\\) do \\(531\\) grbov, torej \\(\\tfrac12\\pm0{,}031\\) v deležih; pri \\(100\\) metih je bil \\(\\tfrac12\\pm0{,}1\\), pri \\(10\\) metih \\(\\tfrac12\\pm0{,}3\\). Črta frekvence s semenom \\(42\\) je ponazoritev: \\(h=493\\) in \\(f=0{,}493\\). Verjetnost, da je \\(f\\) od \\(\\tfrac12\\) oddaljena \\(0{,}1\\) ali več, torej da je \\(h\\) vsaj \\(100\\) od \\(500\\), je približno \\(2{,}7\\cdot10^{-10}\\); to je skoraj nikoli, a ne nemogoče.',
            'Argument: the \\(95\\,\\%\\) band is computed from the exact terms of the binomial law, not by a normal formula. After \\(1000\\) tosses it is from \\(469\\) to \\(531\\) heads, so \\(\\tfrac12\\pm0.031\\) in shares; with \\(100\\) tosses it was \\(\\tfrac12\\pm0.1\\), with \\(10\\) tosses \\(\\tfrac12\\pm0.3\\). The frequency line with seed \\(42\\) is an illustration: \\(h=493\\) and \\(f=0.493\\). The chance that \\(f\\) is \\(0.1\\) or more away from \\(\\tfrac12\\), that is, that \\(h\\) is at least \\(100\\) away from \\(500\\), is about \\(2.7\\cdot10^{-10}\\); that is almost never, but not impossible.',
        ),
        formulaIds: ['exact-band'],
        observationPrompt: text('V polju Število metov izmenično vpisuj \\(10\\), \\(100\\) in \\(1000\\) ter opazuj, kako se oži pas \\(95\\,\\%\\) in kje je črta frekvence.', 'In the field Number of tosses alternately type \\(10\\), \\(100\\) and \\(1000\\) and watch how the \\(95\\,\\%\\) band narrows and where the frequency line is.'),
        expectedObservations: [text('Po \\(1000\\) metih \\(493\\) grbov, \\(f=0{,}493\\); pas od \\(469\\) do \\(531\\) (\\(\\pm31\\)), običajno odstopanje deleža \\(0{,}0158\\).', 'After \\(1000\\) tosses \\(493\\) heads, \\(f=0.493\\); the band from \\(469\\) to \\(531\\) (\\(\\pm31\\)), typical deviation of the share \\(0.0158\\).')],
        scene: randomScene('rs2-thousand-scene', RS2_THOUSAND_TOSSES,
            'Kovanec, seme \\(42\\), \\(1000\\) metov: \\(493\\) grbov, \\(f=0{,}493\\), grbov več kot pol metov \\(-7\\); pas \\(95\\,\\%\\) od \\(469\\) do \\(531\\), običajno odstopanje deleža \\(0{,}0158\\).',
            'Coin, seed \\(42\\), \\(1000\\) tosses: \\(493\\) heads, \\(f=0.493\\), heads above half the tosses \\(-7\\); the \\(95\\,\\%\\) band from \\(469\\) to \\(531\\), typical deviation of the share \\(0.0158\\).'),
    }),
    step({
        id: 'rs2-count', order: 4,
        title: text('Število grbov se ne izravna', 'The number of heads does not even out'),
        purpose: text('Ločiti frekvenco, ki se umiri, od števila grbov nad polovico, ki se ne.', 'Telling the frequency, which settles, from the number of heads above half, which does not.'),
        explanation: text(
            'Drugi graf kaže \\(d=h-\\tfrac n2\\), število grbov nad polovico metov, z istim pasom \\(95\\,\\%\\), izraženim v grbih. Argument: pas v grbih se širi, ne oži: pri \\(10\\), \\(100\\), \\(1000\\) in \\(10000\\) metih je \\(\\pm3\\), \\(\\pm10\\), \\(\\pm31\\) in \\(\\pm98\\), približno dvakrat \\(\\tfrac{\\sqrt n}{2}\\). Frekvenca se umiri, ker je \\(\\tfrac{d}{n}\\) vse manjše, ne ker bi se \\(d\\) vračal v nič. Zagon s semenom \\(42\\) ostane blizu: po \\(10000\\) metih je \\(h=5011\\), \\(f=0{,}5011\\) in \\(d=11\\), znotraj pasu \\(\\pm98\\); to je zgolj rezultat tega zagona. Po zakonu je običajna velikost \\(d\\) pri \\(10000\\) metih \\(50\\) (glej račun).',
            'The second plot shows \\(d=h-\\tfrac n2\\), the number of heads above half the tosses, with the same \\(95\\,\\%\\) band expressed in heads. Argument: the band in heads widens, it does not narrow: with \\(10\\), \\(100\\), \\(1000\\) and \\(10000\\) tosses it is \\(\\pm3\\), \\(\\pm10\\), \\(\\pm31\\) and \\(\\pm98\\), about twice \\(\\tfrac{\\sqrt n}{2}\\). The frequency settles because \\(\\tfrac{d}{n}\\) gets smaller, not because \\(d\\) returns to zero. The run with seed \\(42\\) stays close: after \\(10000\\) tosses \\(h=5011\\), \\(f=0.5011\\) and \\(d=11\\), inside the band \\(\\pm98\\); this is merely the result of this run. By the law the usual size of \\(d\\) with \\(10000\\) tosses is \\(50\\) (see the calculation).',
        ),
        formulaIds: ['frequency'],
        workedExampleId: 'rs2-sizes',
        observationPrompt: text('V polju Seme generatorja poskusi \\(7\\) in \\(43\\) ter pri vsakem preberi \\(f\\) in število grbov nad polovico.', 'In the field Generator seed try \\(7\\) and \\(43\\) and read \\(f\\) and the number of heads above half for each.'),
        expectedObservations: [text('Seme \\(42\\): \\(5011\\) grbov, \\(f=0{,}5011\\), \\(d=11\\). Seme \\(7\\): \\(5037\\), \\(f=0{,}5037\\), \\(d=37\\). Seme \\(43\\): \\(4872\\), \\(f=0{,}4872\\), \\(d=-128\\), zunaj pasu \\(\\pm98\\), čeprav je \\(f\\) blizu \\(\\tfrac12\\).', 'Seed \\(42\\): \\(5011\\) heads, \\(f=0.5011\\), \\(d=11\\). Seed \\(7\\): \\(5037\\), \\(f=0.5037\\), \\(d=37\\). Seed \\(43\\): \\(4872\\), \\(f=0.4872\\), \\(d=-128\\), outside the band \\(\\pm98\\), although \\(f\\) is close to \\(\\tfrac12\\).')],
        scene: randomScene('rs2-count-scene', RS2_TEN_THOUSAND_TOSSES,
            'Kovanec, seme \\(42\\), \\(10000\\) metov: \\(5011\\) grbov, \\(f=0{,}5011\\), grbov več kot pol metov \\(11\\); pas \\(95\\,\\%\\) od \\(4902\\) do \\(5098\\), običajno odstopanje deleža \\(0{,}005\\).',
            'Coin, seed \\(42\\), \\(10000\\) tosses: \\(5011\\) heads, \\(f=0.5011\\), heads above half the tosses \\(11\\); the \\(95\\,\\%\\) band from \\(4902\\) to \\(5098\\), typical deviation of the share \\(0.005\\).'),
    }),
    step({
        id: 'rs2-seeds', order: 5,
        title: text('Dva zagona hkrati', 'Two runs at once'),
        purpose: text('Primerjati dva zagona z različnima semenoma in videti, da oba padeta v isti lijak.', 'Comparing two runs with different seeds and seeing that both fall into the same funnel.'),
        explanation: text(
            'Vklopljeno je primerjanje s semenom \\(43\\), narisano s pikčasto črto; seme \\(42\\) ostane polna črta. Zagona sta si pri majhnih \\(n\\) zelo različna (pri \\(10\\) metih \\(1\\) in \\(3\\) grbi), pri \\(10000\\) metih sta obe frekvenci blizu \\(\\tfrac12\\): \\(0{,}5011\\) in \\(0{,}4872\\). Pas \\(95\\,\\%\\) je isti za oba. Seme \\(43\\) ima \\(4872\\) grbov, to je \\(128\\) pod polovico in zunaj pasu \\(\\pm98\\); tako se konča zunaj pasu največ približno \\(1\\) od \\(20\\) zagonov, kar je pričakovano, ne napaka. Dva zagona nista dokaz, le ponazoritev; drugi zagon lahko spremeniš v polju Drugo seme (z izbiro drugega semena se prejšnje nadomesti).',
            'Comparison with seed \\(43\\) is switched on and drawn with a dotted line; seed \\(42\\) stays a solid line. The runs differ a lot for small \\(n\\) (with \\(10\\) tosses \\(1\\) and \\(3\\) heads), with \\(10000\\) tosses both frequencies are close to \\(\\tfrac12\\): \\(0.5011\\) and \\(0.4872\\). The \\(95\\,\\%\\) band is the same for both. Seed \\(43\\) has \\(4872\\) heads, that is \\(128\\) below half and outside the band \\(\\pm98\\); at most about \\(1\\) run in \\(20\\) ends outside the band, which is expected, not an error. Two runs are no proof, only an illustration; you can change the second run in the field Second seed (choosing another seed replaces the previous one).',
        ),
        formulaIds: ['exact-band'],
        observationPrompt: text('Preberi vrstico Seme \\(43\\), nato v polju Drugo seme poskusi še druga semena in preštej, kolikokrat padeta zagona zunaj pasu.', 'Read the row Seed \\(43\\), then try other seeds in the field Second seed and count how often a run falls outside the band.'),
        expectedObservations: [text('Seme \\(43\\), \\(10000\\) metov: \\(4872\\) grbov; seme \\(42\\): \\(5011\\) grbov; pas \\(95\\,\\%\\) od \\(4902\\) do \\(5098\\).', 'Seed \\(43\\), \\(10000\\) tosses: \\(4872\\) heads; seed \\(42\\): \\(5011\\) heads; the \\(95\\,\\%\\) band from \\(4902\\) to \\(5098\\).')],
        scene: randomScene('rs2-seeds-scene', RS2_TWO_SEEDS,
            'Kovanec, \\(10000\\) metov, seme \\(42\\) (polna črta) in seme \\(43\\) (pikčasta): \\(5011\\) in \\(4872\\) grbov; pas \\(95\\,\\%\\) od \\(4902\\) do \\(5098\\).',
            'Coin, \\(10000\\) tosses, seed \\(42\\) (solid) and seed \\(43\\) (dotted): \\(5011\\) and \\(4872\\) heads; the \\(95\\,\\%\\) band from \\(4902\\) to \\(5098\\).'),
    }),
    step({
        id: 'rs2-explore', order: 6,
        title: text('Raziskovanje', 'Free exploration'),
        purpose: text('Sam preizkusiti semena in število metov ter napovedati, kje bo frekvenca, preden se pokaže.', 'Trying seeds and numbers of tosses yourself and predicting where the frequency will be before it appears.'),
        explanation: text(
            'Preizkusi semena in število metov; pred vsakim zagonom napovej, ali bo \\(f\\) znotraj pasu \\(95\\,\\%\\) in ali bo število grbov nad polovico večje ali manjše kakor prej. Zdaj je prikazano seme \\(7\\): \\(5037\\) grbov in \\(f=0{,}5037\\) po \\(10000\\) metih, znotraj pasu od \\(4902\\) do \\(5098\\). Pri vsakem semenu je rezultat zgolj en zagon; zakon velikih števil ne pravi, da se kovanec vrača k polovici, ampak da je frekvenca pri velikem \\(n\\) po zakonu blizu \\(\\tfrac12\\).',
            'Try seeds and numbers of tosses; before each run predict whether \\(f\\) will be inside the \\(95\\,\\%\\) band and whether the number of heads above half will be larger or smaller than before. Seed \\(7\\) is shown now: \\(5037\\) heads and \\(f=0.5037\\) after \\(10000\\) tosses, inside the band from \\(4902\\) to \\(5098\\). With every seed the result is just one run; the law of large numbers does not say that a coin returns to half, but that for large \\(n\\) the frequency is by the law close to \\(\\tfrac12\\).',
        ),
        formulaIds: [],
        observationPrompt: text('Spreminjaj seme in število metov in primerjaj vsak zagon s pasom \\(95\\,\\%\\) v grbih.', 'Change the seed and the number of tosses and compare each run with the \\(95\\,\\%\\) band in heads.'),
        expectedObservations: [text('Seme \\(7\\), \\(10000\\) metov: \\(5037\\) grbov, \\(f=0{,}5037\\), grbov več kot pol metov \\(37\\); pas od \\(4902\\) do \\(5098\\).', 'Seed \\(7\\), \\(10000\\) tosses: \\(5037\\) heads, \\(f=0.5037\\), heads above half the tosses \\(37\\); the band from \\(4902\\) to \\(5098\\).')],
        scene: randomScene('rs2-explore-scene', RS2_EXPLORE,
            'Kovanec, seme \\(7\\), \\(10000\\) metov: \\(5037\\) grbov, \\(f=0{,}5037\\), grbov več kot pol metov \\(37\\); pas \\(95\\,\\%\\) od \\(4902\\) do \\(5098\\).',
            'Coin, seed \\(7\\), \\(10000\\) tosses: \\(5037\\) heads, \\(f=0.5037\\), heads above half the tosses \\(37\\); the \\(95\\,\\%\\) band from \\(4902\\) to \\(5098\\).'),
    }),
];

// ---- Lessons ---------------------------------------------------------------------------------------------------------------------

const sources: GuidedLesson['sources'] = [
    {
        id: 'bezeg-randomness-implementation',
        citation: 'Bezeg source: src/random/ (generator, runners, exact comparators, state model) and src/graphs/random/SimulationGraph.tsx.',
        implementationCorrespondence: 'A scene sets the mode, the run fields (seed, trials, rows, percent), the second seed and the playback position of the simulation graph; every simulated tally is a readout of that graph for the stated seed (integer counts, exact), and the bars of the law and the band are exact binomial values computed in double precision, so quoted decimals are approximate.',
    },
];

const rs1: GuidedLesson = {
    demonstrationId: 'prob-simulation',
    title: text('Galtonova deska proti binomski porazdelitvi', 'The Galton board against the binomial law'),
    summary: text(
        'Kroglica na vsakem od \\(n\\) klinov z enako verjetnostjo zavije levo ali desno in pristane v predalu \\(k\\) z verjetnostjo \\(\\binom nk 2^{-n}\\). Kopica kroglic je ponazoritev in se od natančnih stolpcev razlikuje, a manj, če kroglic več; stolpci so argument.',
        'At each of \\(n\\) pegs a ball bounces left or right with equal chance and lands in slot \\(k\\) with probability \\(\\binom nk 2^{-n}\\). The heap of balls is an illustration and differs from the exact bars, but less so with more balls; the bars are the argument.',
    ),
    prerequisites: [text('Štetje poti in binomski koeficienti (Pascalov trikotnik); naslednja je lekcija o približku binomske porazdelitve z normalno.', 'Counting paths and binomial coefficients (Pascal\'s triangle); the lesson on the normal approximation of the binomial law follows.')],
    learningGoals: [
        text('Znaš izračunati verjetnost predala \\(P_k=\\binom nk 2^{-n}\\) in ju razložiti s štetjem poti.', 'Can compute the probability of a slot \\(P_k=\\binom nk 2^{-n}\\) and explain it by counting paths.'),
        text('Veš, da je kopica naključna, stolpci zakona pa niso, in da razlika \\(0{,}0171\\) pri \\(1000\\) kroglicah ni napaka.', 'Know that the heap is random and the bars of the law are not, and that a gap of \\(0.0171\\) with \\(1000\\) balls is no error.'),
        text('Veš, da isto seme da isto kopico, drugo seme drugo, stolpci pa so enaki.', 'Know that the same seed gives the same heap, another seed another one, and the bars are the same.'),
    ],
    formulaBlocks: rs1Formulas,
    workedExamples: rs1Examples,
    steps: rs1Steps,
    sources,
    edgeCases: [
        text('Pri \\(p\\ne\\tfrac12\\) poti niso enako verjetne; velja \\(P_k=\\binom nk p^k(1-p)^{n-k}\\). Vrednosti \\(p\\) so pri grafu večkratniki \\(5\\,\\%\\).', 'For \\(p\\ne\\tfrac12\\) paths are not equally likely; \\(P_k=\\binom nk p^k(1-p)^{n-k}\\) holds. The graph allows only multiples of \\(5\\,\\%\\) for \\(p\\).'),
        text('Narisanih je le prvih \\(10\\) poti, odčitki pa štejejo vse prikazane kroglice. Rezultati ene izvedbe s semenom \\(42\\) niso dokaz zakona.', 'Only the first \\(10\\) paths are drawn, while the readouts count all balls shown. The results of one run with seed \\(42\\) are no proof of the law.'),
        text('Stolpci zakona so izračunani z decimalkami, zato so odčitani deleži približni; števila kroglic so cela števila.', 'The bars of the law are computed with decimals, so the quoted shares are approximate; the ball counts are whole numbers.'),
    ],
    unresolvedQuestions: [],
};

const rs2: GuidedLesson = {
    demonstrationId: 'prob-simulation',
    title: text('Zakon velikih števil', 'The law of large numbers'),
    summary: text(
        'Relativna frekvenca grbov pri pošteni kovanci se pri velikem številu metov ustali blizu \\(\\tfrac12\\), pas \\(95\\,\\%\\) pa se oži kakor \\(\\tfrac{1}{\\sqrt n}\\). Število grbov nad polovico se ne izravna, saj njegov običajni razpon raste kakor \\(\\sqrt n\\).',
        'The relative frequency of heads for a fair coin settles near \\(\\tfrac12\\) for a large number of tosses, and the \\(95\\,\\%\\) band narrows like \\(\\tfrac{1}{\\sqrt n}\\). The number of heads above half does not even out, because its usual spread grows like \\(\\sqrt n\\).',
    ),
    prerequisites: [text('Verjetnost in relativna frekvenca (empirična in matematična verjetnost); lekcija o centralnem limitnem izreku sledi.', 'Probability and relative frequency (empirical and mathematical probability); the lesson on the central limit theorem follows.')],
    learningGoals: [
        text('Znaš razložiti, da se frekvenca \\(f=\\tfrac hn\\) umiri, število grbov nad polovico \\(d=h-\\tfrac n2\\) pa ne.', 'Can explain that the frequency \\(f=\\tfrac hn\\) settles, but the number of heads above half \\(d=h-\\tfrac n2\\) does not.'),
        text('Veš, da je pas \\(95\\,\\%\\) izračunan iz točnih binomskih členov in da je zagon zunaj pasu pričakovan pri največ približno enem od dvajsetih zagonov.', 'Know that the \\(95\\,\\%\\) band is computed from exact binomial terms and that a run outside the band is expected for at most about one run in twenty.'),
        text('Veš, da kovanec nima spomina in da zakon ne pravi, da se frekvenca nujno vrne k \\(\\tfrac12\\).', 'Know that a coin has no memory and that the law does not say the frequency must return to \\(\\tfrac12\\).'),
    ],
    formulaBlocks: rs2Formulas,
    workedExamples: rs2Examples,
    steps: rs2Steps,
    sources,
    edgeCases: [
        text('Pri majhnem \\(n\\) je pas grob: pri \\(n=10\\) pokrije več kot \\(95\\,\\%\\), saj so možna le cela števila grbov.', 'For small \\(n\\) the band is coarse: with \\(n=10\\) it covers more than \\(95\\,\\%\\), since only whole numbers of heads are possible.'),
        text('Graf kaže največ dva zagona hkrati; trije ali več zagonov niso prikazani naenkrat. Rezultati posameznih semen niso dokaz zakona.', 'The graph shows at most two runs at once; three or more runs are not shown together. The results of single seeds are no proof of the law.'),
        text('Odčitki za pas in običajno odstopanje so izračunani z decimalkami in so približni; števila grbov so cela števila.', 'The readouts of the band and the typical deviation are computed with decimals and are approximate; the numbers of heads are whole numbers.'),
    ],
    unresolvedQuestions: [],
};

export const randomnessGaltonLesson: GuidedLesson = rs1;
export const randomnessLargeNumbersLesson: GuidedLesson = rs2;
