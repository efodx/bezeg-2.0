/**
 * Guided lesson RS5 of the randomness family (docs/specs/randomness-simulation-lessons.md): the two-state Markov chain, on `prob-simulation` (SimulationGraph).
 * Scenes use the `random` actions of `randomnessSceneActions` (randomnessGuidedLessons.ts) and every scene starts from the Demonstration default and names what it sets
 * (the Markov mode, the run fields, the playback position). The exact stationary distribution (pi P = pi), the exact probability of state A after k steps
 * (p_k = pi_A + (p_0 - pi_A)(1 - a - b)^k) and the second eigenvalue are the arguments; the share of time of one run is the illustration, always stated with its seed.
 * Every number the text quotes is a readout of the graph for that scene (probe: .command-logs/rand-c/probe.txt, probe-after.txt, probe2.txt), arithmetic stated in the
 * text, or a value the learner reads after an action the text asks for; the numbers are listed per step in docs/reviews/feature-streams/families-prep/notes/f3-rand-c.md.
 * The steps are predict-then-make: the opening shows a different state from the one the prompt asks the learner to produce, and the result of a step is stated in the
 * explanation of the next one.
 */
import type {FormulaBlock, GuidedLesson, GuidedLessonFrame, GuidedLessonStep, LessonScene, LocalizedText, WorkedExample} from './guidedLessons';
import {frameDeclarer, type FrameDeclaration} from '../../graphs/base/declare/graphDeclaration';
import type {SimulationIds} from '../../graphs/random/SimulationGraph';
import {randomnessSceneActions} from './randomnessGuidedLessons';
import type {RandomnessSceneSpec} from './randomnessGuidedLessons';

const text = (sl: string, en: string): LocalizedText => ({sl, en});
const frame = (id: string, kind: GuidedLessonFrame['kind'], declare?: FrameDeclaration): GuidedLessonFrame => ({id, kind, ...(declare ? {declare} : {})});
/** Typed by the simulation's declaration ids: an unknown control fails the type check. */
const simulationFrame = frameDeclarer<SimulationIds>();
/** The controls (pucks) each step's observation asks the learner to set. */
const USES: Readonly<Record<string, readonly SimulationIds['param'][]>> = {
    'rs5-longer': ['random-n'],
    'rs5-start-b': ['random-start'],
    'rs5-rates': ['random-a', 'random-b', 'random-n'],
    'rs5-edges': ['random-a', 'random-b'],
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
    frames: [
        frame(`${content.id}-explanation`, 'explanation'),
        ...(content.workedExampleId ? [frame(`${content.id}-calculation`, 'calculation')] : []),
        frame(`${content.id}-observation`, 'observation', USES[content.id] ? simulationFrame({uses: USES[content.id]}) : undefined),
    ],
});

const randomScene = (id: string, spec: RandomnessSceneSpec, sl: string, en: string): LessonScene =>
    ({id, basedOn: 'demonstration-default', actions: randomnessSceneActions(id, spec), expectedState: text(sl, en)});

/** RS5: seed 42 and start in A are the Demonstration default of the Markov mode (a 30 %, b 60 %, 10 000 steps); the steps differ in a, b, the number of steps and the playback position. */
export const RS5_EQUAL_CHANCES = {mode: 'markov', run: {markovA: 50, markovB: 50, n: 100}} as const;
export const RS5_HUNDRED_STEPS = {mode: 'markov', run: {n: 100}} as const;
export const RS5_HUNDRED_NOT_STARTED = {mode: 'markov', run: {n: 100}, position: 0} as const;
export const RS5_START_IN_A = {mode: 'markov'} as const;
export const RS5_RATES_START = {mode: 'markov', run: {n: 100}} as const;
export const RS5_EDGE_START = {mode: 'markov', run: {n: 100}} as const;
export const RS5_EXPLORE = {mode: 'markov', run: {seed: 7, markovA: 20, markovB: 40, markovStart: 1}} as const;

const rs5Formulas: readonly FormulaBlock[] = [
    {
        id: 'markov-stationary',
        latex: 'P=\\begin{pmatrix}1-a&a\\\\b&1-b\\end{pmatrix},\\qquad \\pi P=\\pi,\\quad \\pi=\\left(\\frac{b}{a+b},\\frac{a}{a+b}\\right)',
        notation: text(
            '\\(P\\) je matrika prehodov (vrstica je trenutno stanje A ali B), \\(a\\) verjetnost prehoda iz A v B, \\(b\\) verjetnost prehoda iz B v A in \\(\\pi\\) vrstica verjetnosti stanj A in B.',
            '\\(P\\) is the transition matrix (a row is the current state A or B), \\(a\\) the probability of moving from A to B, \\(b\\) the probability of moving from B to A and \\(\\pi\\) the row of the probabilities of the states A and B.',
        ),
        explanation: text(
            'Stacionarna porazdelitev je porazdelitev, ki se po enem koraku ne spremeni: \\(\\pi P=\\pi\\). Za dve stanji ima rešitev (z vsoto \\(1\\)) obliko \\(\\left(\\tfrac{b}{a+b},\\tfrac{a}{a+b}\\right)\\); je izračunana iz \\(a\\) in \\(b\\), ne izmerjena.',
            'A stationary distribution is one that does not change after one step: \\(\\pi P=\\pi\\). For two states the solution (with sum \\(1\\)) is \\(\\left(\\tfrac{b}{a+b},\\tfrac{a}{a+b}\\right)\\); it is computed from \\(a\\) and \\(b\\), not measured.',
        ),
    },
    {
        id: 'markov-exact',
        latex: 'p_{k+1}=(1-a)\\,p_k+b\\,(1-p_k)=(1-a-b)\\,p_k+b,\\qquad p_k=\\pi_A+(p_0-\\pi_A)\\,\\lambda^k,\\quad \\lambda=1-a-b',
        notation: text(
            '\\(p_k\\) je verjetnost, da je veriga po \\(k\\) korakih v stanju A, \\(p_0\\) je \\(1\\) pri začetku v A in \\(0\\) pri začetku v B, \\(\\pi_A=\\tfrac{b}{a+b}\\) je prvi člen stacionarne porazdelitve in \\(\\lambda\\) druga lastna vrednost matrike \\(P\\).',
            '\\(p_k\\) is the probability that the chain is in state A after \\(k\\) steps, \\(p_0\\) is \\(1\\) when starting in A and \\(0\\) when starting in B, \\(\\pi_A=\\tfrac{b}{a+b}\\) is the first entry of the stationary distribution and \\(\\lambda\\) the second eigenvalue of the matrix \\(P\\).',
        ),
        explanation: text(
            'V stanju A smo po \\(k+1\\) korakih, če smo bili v A in ostali (\\(1-a\\)) ali smo bili v B in prešli (\\(b\\)): to je prva enačba. Ker je \\(1-p_k\\) verjetnost stanja B, sledi \\(p_{k+1}=\\lambda p_k+b\\). Razdalja do \\(\\pi_A\\) se zato v vsakem koraku pomnoži z \\(\\lambda\\): \\(p_{k+1}-\\pi_A=\\lambda\\,(p_k-\\pi_A)\\), od koder je druga enačba. Pri \\(|\\lambda|<1\\) razdalja pada geometrijsko (hitreje, če je \\(|\\lambda|\\) manjši). Argument je račun, ne zagon.',
            'The chain is in state A after \\(k+1\\) steps if it was in A and stayed (\\(1-a\\)) or was in B and moved (\\(b\\)): this is the first equation. Since \\(1-p_k\\) is the probability of state B, \\(p_{k+1}=\\lambda p_k+b\\) follows. So the distance to \\(\\pi_A\\) is multiplied by \\(\\lambda\\) in every step: \\(p_{k+1}-\\pi_A=\\lambda\\,(p_k-\\pi_A)\\), which gives the second equation. For \\(|\\lambda|<1\\) the distance falls geometrically (faster if \\(|\\lambda|\\) is smaller). The argument is the calculation, not a run.',
        ),
    },
];

const rs5Examples: readonly WorkedExample[] = [
    {
        id: 'rs5-check',
        title: text('Preverjanje \\(\\pi P=\\pi\\) za \\(a=0{,}3\\), \\(b=0{,}6\\)', 'Checking \\(\\pi P=\\pi\\) for \\(a=0.3\\), \\(b=0.6\\)'),
        calculationLatex: '\\pi=\\left(\\tfrac{0{,}6}{0{,}9},\\tfrac{0{,}3}{0{,}9}\\right)=\\left(\\tfrac23,\\tfrac13\\right),\\quad \\tfrac23\\cdot0{,}7+\\tfrac13\\cdot0{,}6=\\tfrac{1{,}4+0{,}6}{3}=\\tfrac23,\\quad \\tfrac23\\cdot0{,}3+\\tfrac13\\cdot0{,}4=\\tfrac{0{,}6+0{,}4}{3}=\\tfrac13',
        resultLatex: '\\pi P=\\pi',
        check: text(
            'Obe komponenti sta po enem koraku nespremenjeni, zato je \\(\\left(\\tfrac23,\\tfrac13\\right)\\) res stacionarna porazdelitev: točna lastna vrstica, ne ocena iz zagona. V odčitku Stacionarna porazdelitev (A; B) je zaokrožena na \\(0{,}6667;\\ 0{,}3333\\).',
            'Both components are unchanged after one step, so \\(\\left(\\tfrac23,\\tfrac13\\right)\\) is indeed the stationary distribution: an exact left eigenvector, not an estimate from a run. In the readout Stationary distribution (A; B) it is rounded to \\(0.6667;\\ 0.3333\\).',
        ),
    },
];

const rs5Steps: readonly GuidedLessonStep[] = [
    step({
        id: 'rs5-two-states', order: 1,
        title: text('Dve stanji in dve puščici', 'Two states and two arrows'),
        purpose: text('Napovedati, v katerem stanju veriga preživi več časa, ko sta verjetnosti prehodov različni.', 'Predicting which state the chain spends more time in when the two transition probabilities differ.'),
        explanation: text(
            'Markovska veriga z dvema stanjema: v vsakem koraku je veriga v stanju A ali B in naslednje stanje izbere le glede na trenutno, ne glede na pot do njega. Puščice v grafu kažejo verjetnosti prehodov: \\(a\\) je verjetnost prehoda iz A v B in \\(b\\) iz B v A, z verjetnostjo \\(1-a\\) veriga ostane v A in z \\(1-b\\) v B. Zdaj je \\(a=b=0{,}5\\) (v krmilnikih \\(50\\,\\%\\)), začetno stanje je A, seme je \\(42\\) in število korakov verige \\(100\\). Delež časa v stanju A je delež prikazanih korakov, po katerih je veriga v A (začetno stanje se ne šteje), in je v tem zagonu \\(0{,}46\\) (en zagon z enim semenom, nič več).',
            'A Markov chain with two states: in every step the chain is in state A or B and chooses the next state only from the current one, not from the way it got there. The arrows in the graph show the transition probabilities: \\(a\\) is the probability of moving from A to B and \\(b\\) from B to A; with probability \\(1-a\\) the chain stays in A and with \\(1-b\\) in B. Now \\(a=b=0.5\\) (the controls read \\(50\\,\\%\\)), the starting state is A, the seed is \\(42\\) and the number of chain steps is \\(100\\). Share of time in state A is the share of the steps shown after which the chain is in A (the starting state is not counted) and is \\(0.46\\) in this run (one run with one seed, nothing more).',
        ),
        formulaIds: [],
        observationPrompt: text(
            'Napovej: če je verjetnost prehoda iz A v B \\(0{,}3\\) in iz B v A \\(0{,}6\\), v katerem stanju bo veriga preživela več časa in kolikšen približno bo delež časa v A? Zapiši število in razlog. Nato v krmilnik Prehod A v B vpiši \\(30\\), v krmilnik Prehod B v A vpiši \\(60\\) in primerjaj z odčitkom Delež časa v stanju A, z odčitkom Stacionarna porazdelitev (A; B) in s črto Stacionarna porazdelitev v grafu.',
            'Predict: if the probability of moving from A to B is \\(0.3\\) and from B to A is \\(0.6\\), which state will the chain spend more time in, and roughly what will the share of time in A be? Write down the number and the reason. Then type \\(30\\) in the control A to B, type \\(60\\) in the control B to A and compare with the readout Share of time in state A, with the readout Stationary distribution (A; B) and with the line Stationary distribution in the graph.',
        ),
        expectedObservations: [text(
            'Seme \\(42\\), \\(100\\) korakov, začetek v A, \\(a=30\\,\\%\\), \\(b=60\\,\\%\\): Delež časa v stanju A \\(0{,}71\\); Stacionarna porazdelitev (A; B) \\(0{,}6667;\\ 0{,}3333\\); Druga lastna vrednost \\(0{,}1\\); Običajno odstopanje deleža (približno) \\(\\pm 0{,}0521\\).',
            'Seed \\(42\\), \\(100\\) steps, start in A, \\(a=30\\,\\%\\), \\(b=60\\,\\%\\): Share of time in state A \\(0.71\\); Stationary distribution (A; B) \\(0.6667;\\ 0.3333\\); Second eigenvalue \\(0.1\\); Typical deviation of the share (approximately) \\(\\pm 0.0521\\).',
        )],
        scene: randomScene('rs5-two-states-scene', RS5_EQUAL_CHANCES,
            'Markovska veriga, seme \\(42\\), \\(100\\) korakov, začetek v A, \\(a=b=50\\,\\%\\), vsi koraki prikazani: Delež časa v stanju A \\(0{,}46\\); Stacionarna porazdelitev (A; B) \\(0{,}5;\\ 0{,}5\\); Druga lastna vrednost \\(0\\).',
            'Markov chain, seed \\(42\\), \\(100\\) steps, start in A, \\(a=b=50\\,\\%\\), all steps shown: Share of time in state A \\(0.46\\); Stationary distribution (A; B) \\(0.5;\\ 0.5\\); Second eigenvalue \\(0\\).'),
    }),
    step({
        id: 'rs5-longer', order: 2,
        title: text('Simulacija z več koraki', 'Simulating more steps'),
        purpose: text('Napovedati, kako blizu stacionarni porazdelitvi je delež časa po \\(10\\,000\\) korakih.', 'Predicting how close the share of time is to the stationary distribution after \\(10\\,000\\) steps.'),
        explanation: text(
            'Pri \\(a=0{,}3\\) in \\(b=0{,}6\\) (seme \\(42\\), \\(100\\) korakov) je Delež časa v stanju A \\(0{,}71\\), Stacionarna porazdelitev (A; B) pa \\(0{,}6667;\\ 0{,}3333\\). Veriga torej preživi več časa v A, in razlog je preprost račun: A zapusti z verjetnostjo \\(0{,}3\\), zato v njem povprečno ostane \\(\\tfrac1{0{,}3}\\approx3{,}3\\) korakov, B pa zapusti z verjetnostjo \\(0{,}6\\) in v njem ostane povprečno \\(\\tfrac1{0{,}6}\\approx1{,}7\\) korakov; razmerje je \\(2:1\\), delež časa v A je \\(\\tfrac23\\). Delež iz zagona \\(0{,}71\\) pa ni natanko \\(\\tfrac23\\): zagon ima le \\(100\\) korakov. Odčitek Običajno odstopanje deleža (približno) je približna ocena, kako daleč od izračunane vrednosti je delež običajno; ni dokaz in ne meja. Zdaj je spet nastavljenih \\(100\\) korakov z istim semenom.',
            'With \\(a=0.3\\) and \\(b=0.6\\) (seed \\(42\\), \\(100\\) steps) Share of time in state A is \\(0.71\\) and Stationary distribution (A; B) is \\(0.6667;\\ 0.3333\\). So the chain spends more time in A, and the reason is a simple calculation: it leaves A with probability \\(0.3\\), so it stays there \\(\\tfrac1{0.3}\\approx3.3\\) steps on average, and it leaves B with probability \\(0.6\\), so it stays there \\(\\tfrac1{0.6}\\approx1.7\\) steps on average; the ratio is \\(2:1\\), the share of time in A is \\(\\tfrac23\\). The share from the run, \\(0.71\\), is not exactly \\(\\tfrac23\\): the run has only \\(100\\) steps. The readout Typical deviation of the share (approximately) is an approximate estimate of how far from the computed value the share usually is; it is not a proof and not a bound. Now \\(100\\) steps with the same seed are set again.',
        ),
        formulaIds: [],
        observationPrompt: text(
            'Napovej, v kakšnem razponu okoli \\(\\tfrac23\\) bo Delež časa v stanju A po \\(10\\,000\\) korakih, in zakaj se razlika od \\(\\tfrac23\\) zmanjša (pomisli, kaj odčitek Običajno odstopanje deleža (približno) pove pri \\(100\\) korakih). Zapiši razpon. Nato v krmilnik Koraki verige vpiši \\(10000\\) in primerjaj z odčitkoma Delež časa v stanju A ter Običajno odstopanje deleža (približno). Po želji vpiši še \\(1000\\).',
            'Predict the range around \\(\\tfrac23\\) in which Share of time in state A will lie after \\(10\\,000\\) steps, and why the difference from \\(\\tfrac23\\) shrinks (think what the readout Typical deviation of the share (approximately) says at \\(100\\) steps). Write down the range. Then type \\(10000\\) in the control Chain steps and compare with the readouts Share of time in state A and Typical deviation of the share (approximately). If you like, type \\(1000\\) as well.',
        ),
        expectedObservations: [text(
            'Seme \\(42\\), a \\(30\\,\\%\\), b \\(60\\,\\%\\), \\(10\\,000\\) korakov: Delež časa v stanju A \\(0{,}6713\\); Običajno odstopanje deleža (približno) \\(\\pm 0{,}0052\\); pri \\(1000\\) korakih \\(0{,}66\\), \\(\\pm 0{,}0165\\).',
            'Seed \\(42\\), a \\(30\\,\\%\\), b \\(60\\,\\%\\), \\(10\\,000\\) steps: Share of time in state A \\(0.6713\\); Typical deviation of the share (approximately) \\(\\pm 0.0052\\); with \\(1000\\) steps \\(0.66\\), \\(\\pm 0.0165\\).',
        )],
        scene: randomScene('rs5-longer-scene', RS5_HUNDRED_STEPS,
            'Markovska veriga, seme \\(42\\), \\(100\\) korakov, začetek v A, a \\(30\\,\\%\\), b \\(60\\,\\%\\), vsi koraki prikazani: Delež časa v stanju A \\(0{,}71\\); Stacionarna porazdelitev (A; B) \\(0{,}6667;\\ 0{,}3333\\); Običajno odstopanje deleža (približno) \\(\\pm 0{,}0521\\).',
            'Markov chain, seed \\(42\\), \\(100\\) steps, start in A, a \\(30\\,\\%\\), b \\(60\\,\\%\\), all steps shown: Share of time in state A \\(0.71\\); Stationary distribution (A; B) \\(0.6667;\\ 0.3333\\); Typical deviation of the share (approximately) \\(\\pm 0.0521\\).'),
    }),
    step({
        id: 'rs5-exact', order: 3,
        title: text('Točna porazdelitev po \\(k\\) korakih', 'The exact distribution after \\(k\\) steps'),
        purpose: text('Z računom pokazati, da se verjetnost stanja A po \\(k\\) korakih hitro približa stacionarni vrednosti, in jo primerjati z vrstico v odčitkih.', 'Showing by calculation that the probability of state A after \\(k\\) steps quickly approaches the stationary value, and comparing it with the readout row.'),
        explanation: text(
            'Pri \\(10\\,000\\) korakih (seme \\(42\\)) je Delež časa v stanju A \\(0{,}6713\\) ob odstopanju \\(\\pm 0{,}0052\\): blizu \\(\\tfrac23\\), a ne natanko. To je en zagon; argument ni zagon, ampak račun. Označimo z \\(p_k\\) verjetnost, da je veriga po \\(k\\) korakih v A; iz formule je \\(p_k=\\tfrac23+\\left(p_0-\\tfrac23\\right)\\lambda^k\\) z \\(\\lambda=1-a-b\\). Pri začetku v A je \\(p_0=1\\). Vrstica Verjetnost stanja A po korakih (točno) je ta račun pri \\(k\\), enakem odčitku Prikazano, in velja po \\(k\\) prehodih; Delež časa v stanju A pa je delež enega zagona, zato je pri Prikazano \\(1\\) lahko le \\(0\\) ali \\(1\\); črtkana krivulja Verjetnost stanja A po k korakih, začetek v A je narisana za ves zagon, tudi pri Prikazano \\(0\\), kjer vrstica kaže črtico. Stacionarna porazdelitev je preverjena z \\(\\pi P=\\pi\\) spodaj. Zdaj je Prikazano \\(0\\) od \\(100\\): nič še ni prikazano.',
            'With \\(10\\,000\\) steps (seed \\(42\\)) Share of time in state A is \\(0.6713\\) with deviation \\(\\pm 0.0052\\): near \\(\\tfrac23\\), but not exactly. This is one run; the argument is not a run but a calculation. Let \\(p_k\\) be the probability that the chain is in A after \\(k\\) steps; by the formula \\(p_k=\\tfrac23+\\left(p_0-\\tfrac23\\right)\\lambda^k\\) with \\(\\lambda=1-a-b\\). Starting in A, \\(p_0=1\\). The row Probability of state A after k steps (exact) is this calculation for \\(k\\) equal to the readout Shown and holds after \\(k\\) transitions; Share of time in state A, however, is the share of one run, so at Shown \\(1\\) it can only be \\(0\\) or \\(1\\); the dashed curve Probability of state A after k steps, starting in A is drawn for the whole run, also at Shown \\(0\\), where the row shows a dash. The stationary distribution is checked with \\(\\pi P=\\pi\\) below. Now Shown is \\(0\\) of \\(100\\): nothing is shown yet.',
        ),
        formulaIds: ['markov-stationary', 'markov-exact'],
        workedExampleId: 'rs5-check',
        observationPrompt: text(
            'Iz formule izračunaj, za koliko se \\(p_5\\) razlikuje od \\(\\tfrac23\\) pri \\(a=0{,}3\\), \\(b=0{,}6\\) in začetku v A, ter napovej, kaj bo vrstica Verjetnost stanja A po korakih (točno) kazala pri \\(k=1\\), \\(k=2\\) in \\(k=5\\). Nato trikrat pritisni Naslednji korak (predvajanje se ustavi pri \\(1\\), \\(2\\) in \\(5\\)) in po vsakem pritisku preberi vrstico; primerjaj tudi z odčitkom Delež časa v stanju A, ki je delež enega zagona in ne verjetnost.',
            'From the formula compute how far \\(p_5\\) is from \\(\\tfrac23\\) for \\(a=0.3\\), \\(b=0.6\\) and start in A, and predict what the row Probability of state A after k steps (exact) will show at \\(k=1\\), \\(k=2\\) and \\(k=5\\). Then press Next step three times (the playback stops at \\(1\\), \\(2\\) and \\(5\\)) and read the row after each press; also compare with the readout Share of time in state A, which is the share of one run and not a probability.',
        ),
        expectedObservations: [text(
            'Prikazano \\(1\\), \\(2\\), \\(5\\): Verjetnost stanja A po korakih (točno) \\(0{,}7\\), \\(0{,}67\\), \\(0{,}66667\\) (\\(p_5-\\tfrac23=\\tfrac13\\cdot0{,}1^5\\approx3{,}3\\cdot10^{-6}\\)); Delež časa v stanju A je v tem zagonu (seme \\(42\\)) pri vseh treh \\(1\\).',
            'Shown \\(1\\), \\(2\\), \\(5\\): Probability of state A after k steps (exact) \\(0.7\\), \\(0.67\\), \\(0.66667\\) (\\(p_5-\\tfrac23=\\tfrac13\\cdot0.1^5\\approx3.3\\cdot10^{-6}\\)); Share of time in state A is \\(1\\) at all three in this run (seed \\(42\\)).',
        )],
        scene: randomScene('rs5-exact-scene', RS5_HUNDRED_NOT_STARTED,
            'Markovska veriga, seme \\(42\\), \\(100\\) korakov, začetek v A, a \\(30\\,\\%\\), b \\(60\\,\\%\\), Prikazano \\(0\\) od \\(100\\): Stacionarna porazdelitev (A; B) \\(0{,}6667;\\ 0{,}3333\\) in Druga lastna vrednost \\(0{,}1\\) sta že prikazani, vrstica Verjetnost stanja A po korakih (točno) kaže črtico.',
            'Markov chain, seed \\(42\\), \\(100\\) steps, start in A, a \\(30\\,\\%\\), b \\(60\\,\\%\\), Shown \\(0\\) of \\(100\\): Stationary distribution (A; B) \\(0.6667;\\ 0.3333\\) and Second eigenvalue \\(0.1\\) are already shown, the row Probability of state A after k steps (exact) shows a dash.'),
    }),
    step({
        id: 'rs5-start-b', order: 4,
        title: text('Začetek v stanju B', 'Starting in state B'),
        purpose: text('Napovedati, ali začetno stanje spremeni delež časa po dolgem času, in izračunati \\(p_1\\) pri začetku v B.', 'Predicting whether the starting state changes the share of time in the long run, and computing \\(p_1\\) when starting in B.'),
        explanation: text(
            'Pri začetku v A vrstica Verjetnost stanja A po korakih (točno) kaže \\(0{,}7\\) pri \\(k=1\\), \\(0{,}67\\) pri \\(k=2\\) in \\(0{,}66667\\) pri \\(k=5\\). Po petih korakih je razlika do \\(\\tfrac23\\) enaka \\(\\tfrac13\\cdot0{,}1^5\\approx3{,}3\\cdot10^{-6}\\), torej se pet decimalk že ujema. Zdaj je nastavljen začetek v A in \\(10\\,000\\) korakov (seme \\(42\\)): Delež časa v stanju A je \\(0{,}6713\\). Začetno stanje vstopa v formulo \\(p_k=\\pi_A+(p_0-\\pi_A)\\lambda^k\\) prek \\(p_0\\).',
            'Starting in A the row Probability of state A after k steps (exact) shows \\(0.7\\) at \\(k=1\\), \\(0.67\\) at \\(k=2\\) and \\(0.66667\\) at \\(k=5\\). After five steps the difference from \\(\\tfrac23\\) is \\(\\tfrac13\\cdot0.1^5\\approx3.3\\cdot10^{-6}\\), so five decimals already agree. Now the start in A and \\(10\\,000\\) steps (seed \\(42\\)) are set: Share of time in state A is \\(0.6713\\). The starting state enters the formula \\(p_k=\\pi_A+(p_0-\\pi_A)\\lambda^k\\) through \\(p_0\\).',
        ),
        formulaIds: ['markov-exact'],
        observationPrompt: text(
            'Napovej, ali bo Delež časa v stanju A po \\(10\\,000\\) korakih drugačen, če veriga začne v B, in zakaj; iz formule z \\(p_0=0\\) izračunaj še, koliko bo vrstica Verjetnost stanja A po korakih (točno) kazala pri \\(k=1\\). Nato v krmilniku Začetno stanje izberi B in primerjaj Delež časa v stanju A z \\(0{,}6713\\). Po želji pritisni Ponovi in nato Naslednji korak ter preberi vrstico pri \\(k=1\\).',
            'Predict whether Share of time in state A after \\(10\\,000\\) steps will differ if the chain starts in B, and why; from the formula with \\(p_0=0\\) also compute what the row Probability of state A after k steps (exact) will show at \\(k=1\\). Then choose B in the control Starting state and compare Share of time in state A with \\(0.6713\\). If you like, press Replay and then Next step and read the row at \\(k=1\\).',
        ),
        expectedObservations: [text(
            'Seme \\(42\\), \\(10\\,000\\) korakov, začetek v B: Delež časa v stanju A \\(0{,}6712\\); Stacionarna porazdelitev (A; B) \\(0{,}6667;\\ 0{,}3333\\) kot prej. Po Ponovi in Naslednji korak: Prikazano \\(1\\), Verjetnost stanja A po korakih (točno) \\(0{,}6\\) (\\(p_1=\\tfrac23-\\tfrac23\\cdot0{,}1=0{,}6\\)), Delež časa v stanju A \\(0\\).',
            'Seed \\(42\\), \\(10\\,000\\) steps, start in B: Share of time in state A \\(0.6712\\); Stationary distribution (A; B) \\(0.6667;\\ 0.3333\\) as before. After Replay and Next step: Shown \\(1\\), Probability of state A after k steps (exact) \\(0.6\\) (\\(p_1=\\tfrac23-\\tfrac23\\cdot0.1=0.6\\)), Share of time in state A \\(0\\).',
        )],
        scene: randomScene('rs5-start-b-scene', RS5_START_IN_A,
            'Markovska veriga, seme \\(42\\), \\(10\\,000\\) korakov, začetek v A, a \\(30\\,\\%\\), b \\(60\\,\\%\\), vsi koraki prikazani: Delež časa v stanju A \\(0{,}6713\\); Stacionarna porazdelitev (A; B) \\(0{,}6667;\\ 0{,}3333\\).',
            'Markov chain, seed \\(42\\), \\(10\\,000\\) steps, start in A, a \\(30\\,\\%\\), b \\(60\\,\\%\\), all steps shown: Share of time in state A \\(0.6713\\); Stationary distribution (A; B) \\(0.6667;\\ 0.3333\\).'),
    }),
    step({
        id: 'rs5-rates', order: 5,
        title: text('Druga lastna vrednost in hitrost', 'The second eigenvalue and the speed'),
        purpose: text('Napovedati mejo in hitrost umirjanja za nov par \\(a\\), \\(b\\) iz formul \\(\\tfrac{b}{a+b}\\) in \\(1-a-b\\).', 'Predicting the limit and the speed of settling for a new pair \\(a\\), \\(b\\) from the formulas \\(\\tfrac{b}{a+b}\\) and \\(1-a-b\\).'),
        explanation: text(
            'Pri začetku v B je Delež časa v stanju A po \\(10\\,000\\) korakih \\(0{,}6712\\) (seme \\(42\\)), pri začetku v A \\(0{,}6713\\): razlika je en korak od \\(10\\,000\\), meja je ista. Začetek spremeni le začetek poti: pri začetku v B je \\(p_1=0{,}6\\), pri začetku v A \\(0{,}7\\). Od para \\(a\\), \\(b\\) pa sta odvisna meja \\(\\pi_A=\\tfrac{b}{a+b}\\) in hitrost, ki jo določa Druga lastna vrednost \\(\\lambda=1-a-b\\): razdalja do meje se v vsakem koraku pomnoži z \\(\\lambda\\). Zdaj je spet začetek v A, \\(a=0{,}3\\), \\(b=0{,}6\\) in \\(100\\) korakov (seme \\(42\\)), kjer je \\(\\lambda=0{,}1\\).',
            'Starting in B, Share of time in state A after \\(10\\,000\\) steps is \\(0.6712\\) (seed \\(42\\)), starting in A it is \\(0.6713\\): the difference is one step out of \\(10\\,000\\), the limit is the same. The start changes only the beginning of the path: starting in B \\(p_1=0.6\\), starting in A \\(0.7\\). The pair \\(a\\), \\(b\\) determines the limit \\(\\pi_A=\\tfrac{b}{a+b}\\) and the speed, which is set by the Second eigenvalue \\(\\lambda=1-a-b\\): the distance to the limit is multiplied by \\(\\lambda\\) in every step. Now the start in A, \\(a=0.3\\), \\(b=0.6\\) and \\(100\\) steps (seed \\(42\\)) are set again, where \\(\\lambda=0.1\\).',
        ),
        formulaIds: ['markov-stationary', 'markov-exact'],
        observationPrompt: text(
            'Napovej za \\(a=b=0{,}1\\) (v krmilnikih \\(10\\)): kolikšna je meja in ali bo Delež časa v stanju A po \\(100\\) korakih že blizu nje (izračunaj \\(\\lambda\\)). Nastavi oba krmilnika Prehod A v B in Prehod B v A na \\(10\\), primerjaj z odčitki, nato v krmilnik Koraki verige vpiši \\(10000\\). Nato napovej še mejo in predznak \\(\\lambda\\) za \\(a=0{,}8\\), \\(b=0{,}9\\) (krmilnika \\(80\\) in \\(90\\)); nastavi ju. Za to nastavitev pritisni Ponovi in trikrat Naslednji korak ter preberi vrstico Verjetnost stanja A po korakih (točno) pri \\(k=1\\), \\(2\\), \\(5\\): ali se približuje meji z ene strani ali ne?',
            'Predict for \\(a=b=0.1\\) (the controls read \\(10\\)): the limit, and whether Share of time in state A will already be near it after \\(100\\) steps (compute \\(\\lambda\\)). Set both controls A to B and B to A to \\(10\\), compare with the readouts, then type \\(10000\\) in the control Chain steps. Then predict the limit and the sign of \\(\\lambda\\) for \\(a=0.8\\), \\(b=0.9\\) (controls \\(80\\) and \\(90\\)); set them. For this setting press Replay and Next step three times and read the row Probability of state A after k steps (exact) at \\(k=1\\), \\(2\\), \\(5\\): does it approach the limit from one side or not?',
        ),
        expectedObservations: [text(
            'Seme \\(42\\), \\(a=b=10\\,\\%\\): Stacionarna porazdelitev \\(0{,}5;\\ 0{,}5\\), Druga lastna vrednost \\(0{,}8\\); pri \\(100\\) korakih Delež časa v stanju A \\(0{,}72\\), pri \\(10\\,000\\) korakih \\(0{,}5051\\). \\(a=80\\,\\%\\), \\(b=90\\,\\%\\): Stacionarna porazdelitev \\(0{,}5294;\\ 0{,}4706\\), Druga lastna vrednost \\(-0{,}7\\), Delež časa v stanju A \\(0{,}5295\\) pri \\(10\\,000\\) korakih; vrstica Verjetnost stanja A po korakih (točno) \\(0{,}2\\), \\(0{,}76\\), \\(0{,}45032\\) pri \\(k=1\\), \\(2\\), \\(5\\) (izmenično pod in nad mejo).',
            'Seed \\(42\\), \\(a=b=10\\,\\%\\): Stationary distribution \\(0.5;\\ 0.5\\), Second eigenvalue \\(0.8\\); with \\(100\\) steps Share of time in state A \\(0.72\\), with \\(10\\,000\\) steps \\(0.5051\\). \\(a=80\\,\\%\\), \\(b=90\\,\\%\\): Stationary distribution \\(0.5294;\\ 0.4706\\), Second eigenvalue \\(-0.7\\), Share of time in state A \\(0.5295\\) with \\(10\\,000\\) steps; the row Probability of state A after k steps (exact) \\(0.2\\), \\(0.76\\), \\(0.45032\\) at \\(k=1\\), \\(2\\), \\(5\\) (alternately below and above the limit).',
        )],
        scene: randomScene('rs5-rates-scene', RS5_RATES_START,
            'Markovska veriga, seme \\(42\\), \\(100\\) korakov, začetek v A, a \\(30\\,\\%\\), b \\(60\\,\\%\\), vsi koraki prikazani: Delež časa v stanju A \\(0{,}71\\); Stacionarna porazdelitev (A; B) \\(0{,}6667;\\ 0{,}3333\\); Druga lastna vrednost \\(0{,}1\\).',
            'Markov chain, seed \\(42\\), \\(100\\) steps, start in A, a \\(30\\,\\%\\), b \\(60\\,\\%\\), all steps shown: Share of time in state A \\(0.71\\); Stationary distribution (A; B) \\(0.6667;\\ 0.3333\\); Second eigenvalue \\(0.1\\).'),
    }),
    step({
        id: 'rs5-edges', order: 6,
        title: text('Skrajna primera', 'Two edge cases'),
        purpose: text('Napovedati, kaj se zgodi pri \\(a=b=0\\) in \\(a=b=1\\), kjer formula ne daje enolične meje ali se verjetnost stanja A ne ustali.', 'Predicting what happens for \\(a=b=0\\) and \\(a=b=1\\), where the formula gives no unique limit or the probability of state A does not settle.'),
        explanation: text(
            'Pri \\(a=b=0{,}1\\) je meja \\(0{,}5\\) in \\(\\lambda=0{,}8\\): po \\(100\\) korakih je delež \\(0{,}72\\) še daleč, po \\(10\\,000\\) pa \\(0{,}5051\\) (seme \\(42\\)); majhna \\(a+b\\) pomeni počasno umirjanje. Pri \\(a=0{,}8\\), \\(b=0{,}9\\) je meja \\(\\tfrac{90}{170}\\approx0{,}5294\\), \\(\\lambda=1-0{,}8-0{,}9=-0{,}7\\), vrstica pa preskakuje čez mejo: \\(0{,}2\\), \\(0{,}76\\), \\(0{,}45032\\). Zdaj so spet nastavljeni \\(a=0{,}3\\), \\(b=0{,}6\\), začetek v A in \\(100\\) korakov (seme \\(42\\)). Graf za oba skrajna primera sam zapiše opombo; napoved zapiši, preden jo prebereš.',
            'With \\(a=b=0.1\\) the limit is \\(0.5\\) and \\(\\lambda=0.8\\): after \\(100\\) steps the share \\(0.72\\) is still far, after \\(10\\,000\\) it is \\(0.5051\\) (seed \\(42\\)); a small \\(a+b\\) means slow settling. With \\(a=0.8\\), \\(b=0.9\\) the limit is \\(\\tfrac{90}{170}\\approx0.5294\\), \\(\\lambda=1-0.8-0.9=-0.7\\), and the row jumps across the limit: \\(0.2\\), \\(0.76\\), \\(0.45032\\). Now \\(a=0.3\\), \\(b=0.6\\), start in A and \\(100\\) steps (seed \\(42\\)) are set again. For both extreme cases the graph writes a note itself; write down your prediction before you read it.',
        ),
        formulaIds: ['markov-stationary', 'markov-exact'],
        observationPrompt: text(
            'Napovej za \\(a=b=0\\): kam gre veriga, ki začne v A, in ali ima enolično stacionarno porazdelitev. Nastavi oba krmilnika na \\(0\\) in preberi odčitke Delež časa v stanju A, Stacionarna porazdelitev (A; B), Druga lastna vrednost ter opombo pod njimi. Nato napovej za \\(a=b=1\\) (krmilnika \\(100\\)): ali se Delež časa v stanju A ustali, ali se ustali Verjetnost stanja A po korakih (točno) in kakšna je \\(\\lambda\\). Nastavi oba krmilnika na \\(100\\), preberi odčitke in opombo ter pritisni Ponovi in trikrat Naslednji korak (pri \\(k=1\\), \\(2\\), \\(5\\)).',
            'Predict for \\(a=b=0\\): where the chain starting in A goes, and whether it has a unique stationary distribution. Set both controls to \\(0\\) and read the readouts Share of time in state A, Stationary distribution (A; B), Second eigenvalue and the note under them. Then predict for \\(a=b=1\\) (controls \\(100\\)): whether Share of time in state A settles, whether Probability of state A after k steps (exact) settles, and what \\(\\lambda\\) is. Set both controls to \\(100\\), read the readouts and the note, and press Replay and Next step three times (at \\(k=1\\), \\(2\\), \\(5\\)).',
        ),
        expectedObservations: [text(
            'Seme \\(42\\), \\(100\\) korakov: pri \\(a=b=0\\) Delež časa v stanju A \\(1\\), Stacionarna porazdelitev (A; B) ni enolična, Druga lastna vrednost \\(1\\); opomba: Veriga ostane v začetnem stanju, zato stacionarna porazdelitev ni enolična. Pri \\(a=b=100\\,\\%\\) Delež časa v stanju A \\(0{,}5\\), Stacionarna porazdelitev (A; B) \\(0{,}5;\\ 0{,}5\\), Druga lastna vrednost \\(-1\\); opomba: Veriga izmenjuje stanji, zato se delež časa ustali, verjetnost stanja A po k korakih pa ne (perioda 2); vrstica Verjetnost stanja A po korakih (točno) je \\(0\\) pri \\(k=1\\), \\(1\\) pri \\(k=2\\), \\(0\\) pri \\(k=5\\).',
            'Seed \\(42\\), \\(100\\) steps: with \\(a=b=0\\) Share of time in state A \\(1\\), Stationary distribution (A; B) not unique, Second eigenvalue \\(1\\); note: The chain stays in its starting state, so the stationary distribution is not unique. With \\(a=b=100\\,\\%\\) Share of time in state A \\(0.5\\), Stationary distribution (A; B) \\(0.5;\\ 0.5\\), Second eigenvalue \\(-1\\); note: The chain alternates between the states, so the share of time settles but the probability of state A after k steps does not (period 2); the row Probability of state A after k steps (exact) is \\(0\\) at \\(k=1\\), \\(1\\) at \\(k=2\\), \\(0\\) at \\(k=5\\).',
        )],
        scene: randomScene('rs5-edges-scene', RS5_EDGE_START,
            'Markovska veriga, seme \\(42\\), \\(100\\) korakov, začetek v A, a \\(30\\,\\%\\), b \\(60\\,\\%\\), vsi koraki prikazani: Delež časa v stanju A \\(0{,}71\\); Stacionarna porazdelitev (A; B) \\(0{,}6667;\\ 0{,}3333\\); Druga lastna vrednost \\(0{,}1\\); brez opombe.',
            'Markov chain, seed \\(42\\), \\(100\\) steps, start in A, a \\(30\\,\\%\\), b \\(60\\,\\%\\), all steps shown: Share of time in state A \\(0.71\\); Stationary distribution (A; B) \\(0.6667;\\ 0.3333\\); Second eigenvalue \\(0.1\\); no note.'),
    }),
    step({
        id: 'rs5-explore', order: 7,
        title: text('Preizkušaj sam', 'Explore on your own'),
        purpose: text('Prosto raziskovanje: za vsak par \\(a\\), \\(b\\) napovedati mejo in hitrost ter ju preveriti.', 'Free exploration: for every pair \\(a\\), \\(b\\) predicting the limit and the speed and checking them.'),
        explanation: text(
            'Pri \\(a=b=0\\) veriga ostane v začetnem stanju in stacionarna porazdelitev ni enolična; pri \\(a=b=1\\) veriga izmenjuje stanji, delež časa se ustali pri \\(\\tfrac12\\), verjetnost stanja A po \\(k\\) korakih pa pri začetku v A preskakuje med \\(1\\) in \\(0\\) (\\(\\lambda=-1\\), perioda \\(2\\)). V vseh drugih primerih velja \\(|\\lambda|<1\\), meja je \\(\\tfrac{b}{a+b}\\) in ni odvisna od začetka. Zdaj so nastavljeni seme \\(7\\), \\(a=0{,}2\\), \\(b=0{,}4\\), začetek v B in \\(10\\,000\\) korakov.',
            'With \\(a=b=0\\) the chain stays in its starting state and the stationary distribution is not unique; with \\(a=b=1\\) the chain alternates between the states, the share of time settles at \\(\\tfrac12\\) while the probability of state A after \\(k\\) steps, starting in A, jumps between \\(1\\) and \\(0\\) (\\(\\lambda=-1\\), period \\(2\\)). In all other cases \\(|\\lambda|<1\\), the limit is \\(\\tfrac{b}{a+b}\\) and does not depend on the start. Now the seed \\(7\\), \\(a=0.2\\), \\(b=0.4\\), start in B and \\(10\\,000\\) steps are set.',
        ),
        formulaIds: ['markov-stationary', 'markov-exact'],
        observationPrompt: text(
            'Preizkušaj sam. Nastavljeni so seme \\(7\\), \\(a=20\\,\\%\\), \\(b=40\\,\\%\\), začetek v B in \\(10\\,000\\) korakov: Delež časa v stanju A je \\(0{,}6765\\) ob Stacionarna porazdelitev (A; B) \\(0{,}6667;\\ 0{,}3333\\) in Druga lastna vrednost \\(0{,}4\\). Spreminjaj Prehod A v B, Prehod B v A, Začetno stanje, Seme generatorja in Koraki verige; za vsako nastavitev najprej napovej mejo \\(\\tfrac{b}{a+b}\\) in predznak ter velikost \\(\\lambda\\), nato preveri. Opazuj, da je delež enega zagona blizu izračunane meje, a ni enak, in da razdalja \\(p_k\\) do meje pade za faktor \\(|\\lambda|\\) na korak.',
            'Explore on your own. The seed \\(7\\), \\(a=20\\,\\%\\), \\(b=40\\,\\%\\), start in B and \\(10\\,000\\) steps are set: Share of time in state A is \\(0.6765\\) beside Stationary distribution (A; B) \\(0.6667;\\ 0.3333\\) and Second eigenvalue \\(0.4\\). Change A to B, B to A, Starting state, Generator seed and Chain steps; for each setting first predict the limit \\(\\tfrac{b}{a+b}\\) and the sign and size of \\(\\lambda\\), then check. Watch that the share of one run is near the computed limit but not equal to it, and that the distance of \\(p_k\\) to the limit falls by the factor \\(|\\lambda|\\) per step.',
        ),
        expectedObservations: [text(
            'Seme \\(7\\), a \\(20\\,\\%\\), b \\(40\\,\\%\\), začetek v B, \\(10\\,000\\) korakov: Delež časa v stanju A \\(0{,}6765\\); Stacionarna porazdelitev (A; B) \\(0{,}6667;\\ 0{,}3333\\); Druga lastna vrednost \\(0{,}4\\); pri \\(100\\) korakih \\(0{,}69\\).',
            'Seed \\(7\\), a \\(20\\,\\%\\), b \\(40\\,\\%\\), start in B, \\(10\\,000\\) steps: Share of time in state A \\(0.6765\\); Stationary distribution (A; B) \\(0.6667;\\ 0.3333\\); Second eigenvalue \\(0.4\\); with \\(100\\) steps \\(0.69\\).',
        )],
        scene: randomScene('rs5-explore-scene', RS5_EXPLORE,
            'Markovska veriga, seme \\(7\\), \\(10\\,000\\) korakov, začetek v B, a \\(20\\,\\%\\), b \\(40\\,\\%\\), vsi koraki prikazani: Delež časa v stanju A \\(0{,}6765\\); Stacionarna porazdelitev (A; B) \\(0{,}6667;\\ 0{,}3333\\); Druga lastna vrednost \\(0{,}4\\).',
            'Markov chain, seed \\(7\\), \\(10\\,000\\) steps, start in B, a \\(20\\,\\%\\), b \\(40\\,\\%\\), all steps shown: Share of time in state A \\(0.6765\\); Stationary distribution (A; B) \\(0.6667;\\ 0.3333\\); Second eigenvalue \\(0.4\\).'),
    }),
];

const sources: GuidedLesson['sources'] = [
    {
        id: 'bezeg-randomness-implementation',
        citation: 'Bezeg source: src/random/ (generator, runners, exact comparators, state model) and src/graphs/random/SimulationGraph.tsx.',
        implementationCorrespondence: 'A scene sets the Markov mode, the run fields (seed, number of chain steps, the transition percents a and b in multiples of 5, the starting state) and the playback position of the simulation graph; the share of time of a run is an integer count over the steps shown (the state after each transition; the starting state is not counted), the transitions are integer comparisons on integer draws against thresholds from the percent grid, and the stationary distribution, the second eigenvalue (one minus the two transition probabilities) and the probability of state A after k steps (matrix recursion in double precision) are exact comparators, so quoted decimals are rounded.',
    },
];

export const rs5Lesson: GuidedLesson = {
    demonstrationId: 'prob-simulation',
    title: text('Markovska veriga z dvema stanjema', 'The two-state Markov chain'),
    summary: text(
        'Veriga, ki v vsakem koraku preskoči med stanjema A in B z danima verjetnostma: kje preživi več časa, ali je meja odvisna od začetka in kaj določa hitrost umirjanja. Točen račun (stacionarna porazdelitev \\(\\pi P=\\pi\\), verjetnost stanja A po \\(k\\) korakih in druga lastna vrednost) je argument, delež časa v zagonu je ponazoritev.',
        'A chain that moves between the states A and B with given probabilities in every step: where it spends more time, whether the limit depends on the start and what sets the speed of settling. The exact calculation (the stationary distribution \\(\\pi P=\\pi\\), the probability of state A after \\(k\\) steps and the second eigenvalue) is the argument, the share of time in a run is the illustration.',
    ),
    prerequisites: [text('Verjetnost in pogojna verjetnost, geometrijsko zaporedje, množenje vrstice z matriko.', 'Probability and conditional probability, geometric sequences, multiplying a row by a matrix.')],
    learningGoals: [
        text('Znaš napovedati, v katerem stanju veriga preživi več časa, in mejo izračunati iz \\(\\tfrac{b}{a+b}\\), ne iz zagona.', 'Can predict which state the chain spends more time in and compute the limit from \\(\\tfrac{b}{a+b}\\), not from a run.'),
        text('Veš, da meja ni odvisna od začetnega stanja, hitrost pa določa \\(\\lambda=1-a-b\\): razdalja do meje se v vsakem koraku pomnoži z \\(\\lambda\\).', 'Know that the limit does not depend on the starting state and that the speed is set by \\(\\lambda=1-a-b\\): the distance to the limit is multiplied by \\(\\lambda\\) in every step.'),
        text('Znaš pojasniti oba skrajna primera: \\(a=b=0\\) (ni enolične meje) in \\(a=b=1\\) (delež časa se ustali, verjetnost stanja A ne).', 'Can explain both extreme cases: \\(a=b=0\\) (no unique limit) and \\(a=b=1\\) (the share of time settles, the probability of state A does not).'),
    ],
    formulaBlocks: rs5Formulas,
    workedExamples: rs5Examples,
    steps: rs5Steps,
    sources,
    edgeCases: [
        text('Pri \\(a=b=0\\) veriga ostane v začetnem stanju, formula \\(\\tfrac{b}{a+b}\\) daje \\(\\tfrac00\\) in graf zapiše, da stacionarna porazdelitev ni enolična.', 'With \\(a=b=0\\) the chain stays in its starting state, the formula \\(\\tfrac{b}{a+b}\\) gives \\(\\tfrac00\\) and the graph states that the stationary distribution is not unique.'),
        text('Pri \\(a=b=1\\) je \\(\\lambda=-1\\) in perioda \\(2\\): delež časa se ustali pri \\(\\tfrac12\\), verjetnost stanja A po \\(k\\) korakih pa se ne.', 'With \\(a=b=1\\) we have \\(\\lambda=-1\\) and period \\(2\\): the share of time settles at \\(\\tfrac12\\), the probability of state A after \\(k\\) steps does not.'),
        text('Odčitek Običajno odstopanje deleža (približno) je približna ocena, ne meja; delež enega zagona je ponazoritev, točna je izračunana vrednost.', 'The readout Typical deviation of the share (approximately) is an approximate estimate, not a bound; the share of one run is an illustration, the computed value is exact.'),
    ],
    unresolvedQuestions: [],
};
