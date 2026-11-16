/**
 * Guided lesson RS6 of the randomness family (docs/specs/randomness-simulation-lessons.md): confidence intervals that miss about 5 % of the time, on `prob-simulation`
 * (SimulationGraph). Scenes use the `random` actions of `randomnessSceneActions` (randomnessGuidedLessons.ts) and every scene starts from the Demonstration default and
 * names what it sets (the interval mode, the run fields, the playback position). The exact coverage (integer convolution, 0,95030 for samples of 36) and the exact binomial
 * law of the number of misses are the arguments; the intervals and the miss counts of a run are the illustration, always stated with their seed. Prose never says "95 %
 * probability that the mean is in this interval": the method covers in about 95 % of repetitions. Every number the text quotes is a readout of the graph for that scene
 * (probe: .command-logs/rand-c/probe.txt, probe-after.txt, probe2.txt), arithmetic stated in the text, or a value the learner reads after an action the text asks for;
 * the numbers are listed per step in docs/reviews/feature-streams/families-prep/notes/f3-rand-c.md. The steps are predict-then-make: the opening shows a different
 * state from the one the prompt asks the learner to produce, and the result of a step is stated in the explanation of the next one.
 */
import type {FormulaBlock, GuidedLesson, GuidedLessonFrame, GuidedLessonStep, LessonScene, LocalizedText, WorkedExample} from './guidedLessons';
import {randomnessSceneActions} from './randomnessGuidedLessons';
import type {RandomnessSceneSpec} from './randomnessGuidedLessons';

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

const randomScene = (id: string, spec: RandomnessSceneSpec, sl: string, en: string): LessonScene =>
    ({id, basedOn: 'demonstration-default', actions: randomnessSceneActions(id, spec), expectedState: text(sl, en)});

/** RS6: seed 42 and the sample size 36 are the Demonstration default of the interval mode (100 intervals); the steps differ in the number of intervals, the playback position, the sample size and (the exploration) seed. */
export const RS6_ONE_NOT_DRAWN = {mode: 'interval', run: {n: 1}, position: 0} as const;
export const RS6_TWENTY_NOT_DRAWN = {mode: 'interval', run: {n: 20}, position: 0} as const;
export const RS6_HUNDRED_NOT_DRAWN = {mode: 'interval', run: {n: 100}, position: 0} as const;
export const RS6_HUNDRED = {mode: 'interval'} as const;
export const RS6_LONG_RUN = {mode: 'interval', run: {n: 10000}} as const;
export const RS6_EXPLORE = {mode: 'interval', run: {seed: 7, sampleSize: 25, n: 100}} as const;

const rs6Formulas: readonly FormulaBlock[] = [
    {
        id: 'interval-half-width',
        latex: '\\mu=49{,}5,\\quad \\sigma^2=\\frac{100^2-1}{12}=833{,}25,\\quad \\sigma\\approx28{,}87,\\qquad \\bar x\\pm1{,}96\\,\\frac{\\sigma}{\\sqrt{36}},\\quad 1{,}96\\cdot\\frac{28{,}866}{6}\\approx9{,}4296',
        notation: text(
            '\\(\\mu\\) je prava sredina populacije celih števil \\(0,\\dots,99\\), \\(\\sigma^2\\) njena varianca, \\(\\sigma\\) standardni odklon, \\(\\bar x\\) povprečje vzorca \\(36\\) neodvisnih žrebanj in \\(1{,}96\\) število, ki ga imenujemo kvantil normalne porazdelitve za \\(95\\,\\%\\).',
            '\\(\\mu\\) is the true mean of the population of the whole numbers \\(0,\\dots,99\\), \\(\\sigma^2\\) its variance, \\(\\sigma\\) the standard deviation, \\(\\bar x\\) the mean of a sample of \\(36\\) independent draws and \\(1.96\\) the number called the normal quantile for \\(95\\,\\%\\).',
        ),
        explanation: text(
            'Populacija so cela števila od \\(0\\) do \\(99\\), vsako enako verjetno: povprečje je \\(49{,}5\\), varianca \\(\\tfrac{100^2-1}{12}=833{,}25\\). Interval zaupanja za sredino iz vzorca \\(36\\) žrebanj je \\(\\bar x\\pm1{,}96\\,\\tfrac{\\sigma}{\\sqrt{36}}\\) (standardni odklon \\(\\sigma\\) je tu znan); njegova polovična širina je \\(9{,}4296\\), enaka za vse vzorce. Interval pokrije pravo sredino, če je \\(|\\bar x-49{,}5|\\le9{,}4296\\), sicer jo zgreši.',
            'The population is the whole numbers from \\(0\\) to \\(99\\), each equally likely: the mean is \\(49.5\\), the variance \\(\\tfrac{100^2-1}{12}=833.25\\). The confidence interval for the mean from a sample of \\(36\\) draws is \\(\\bar x\\pm1.96\\,\\tfrac{\\sigma}{\\sqrt{36}}\\) (the standard deviation \\(\\sigma\\) is known here); its half-width is \\(9.4296\\), the same for all samples. The interval covers the true mean if \\(|\\bar x-49.5|\\le9.4296\\), otherwise it misses it.',
        ),
    },
    {
        id: 'interval-exact',
        latex: '|\\bar x-49{,}5|\\le9{,}4296\\iff|S-1782|\\le339,\\qquad S=X_1+\\dots+X_{36},\\quad 36\\cdot49{,}5=1782,\\quad 36\\cdot9{,}4296\\ldots\\approx339{,}465',
        notation: text(
            '\\(S\\) je vsota \\(36\\) žrebanj \\(X_1,\\dots,X_{36}\\), vsako celo število od \\(0\\) do \\(99\\).',
            '\\(S\\) is the sum of the \\(36\\) draws \\(X_1,\\dots,X_{36}\\), each a whole number from \\(0\\) to \\(99\\).',
        ),
        explanation: text(
            'Vsota \\(S\\) je celo število, zato je pokritost celoštevilski test: pokrije natanko tedaj, ko je \\(|S-1782|\\le339\\) (celega števila med \\(339\\) in \\(339{,}465\\) ni, zato ni mejnega primera). Verjetnost pokritja je izračunana tako, da se verjetnosti žrebanja \\(36\\)-krat zvijejo (konvolucija celih števil); za vzorec \\(36\\) je \\(0{,}95030\\), ne natanko \\(0{,}95\\). Odčitek Verjetnost, da interval pokrije pravo sredino (točno) kaže to vrednost, ne izmerjene.',
            'The sum \\(S\\) is a whole number, so coverage is an integer test: the interval covers exactly when \\(|S-1782|\\le339\\) (there is no whole number between \\(339\\) and \\(339.465\\), so there is no tie). The probability of covering is computed by convolving the probabilities of one draw \\(36\\) times (integer convolution); for a sample of \\(36\\) it is \\(0.95030\\), not exactly \\(0.95\\). The readout Probability that an interval covers the true mean (exact) shows this value, not a measured one.',
        ),
    },
    {
        id: 'miss-law',
        latex: 'q=1-0{,}95030=0{,}04970,\\qquad M\\sim\\operatorname{Bin}(m,q),\\qquad P(M=j)=\\binom mj q^j(1-q)^{m-j},\\qquad E(M)=mq',
        notation: text(
            '\\(q\\) je verjetnost, da en interval zgreši, \\(m\\) število intervalov, \\(M\\) število intervalov, ki zgrešijo, \\(\\operatorname{Bin}\\) binomska porazdelitev in \\(\\binom mj\\) število načinov, da je med \\(m\\) intervali natanko \\(j\\) takih, ki zgrešijo.',
            '\\(q\\) is the probability that one interval misses, \\(m\\) the number of intervals, \\(M\\) the number of intervals that miss, \\(\\operatorname{Bin}\\) the binomial distribution and \\(\\binom mj\\) the number of ways that exactly \\(j\\) of the \\(m\\) intervals miss.',
        ),
        explanation: text(
            'Vzorci so neodvisni, vsak interval zgreši z isto verjetnostjo \\(q=0{,}04970\\), zato je število zgrešenih med \\(m\\) intervali binomsko. Uporabljena je izračunana vrednost \\(q\\), ne okroglih \\(0{,}05\\). Stolpci Zgrešenih po zakonu v grafu so ta števila, polna črta Ta poskus je število zgrešenih v zagonu. Zakon je argument, zagon je ena izvedba.',
            'The samples are independent and every interval misses with the same probability \\(q=0.04970\\), so the number of misses among \\(m\\) intervals is binomial. The computed value of \\(q\\) is used, not the round \\(0.05\\). The bars Misses by the law in the graph are these numbers, the solid line This run is the number of misses in the run. The law is the argument, the run is one realisation.',
        ),
    },
];

const rs6Examples: readonly WorkedExample[] = [
    {
        id: 'rs6-two-misses',
        title: text('Kako redko je \\(2\\) ali manj zgrešenih med \\(100\\) intervali?', 'How rare is \\(2\\) or fewer misses among \\(100\\) intervals?'),
        calculationLatex: 'm=100,\\ q=0{,}0497:\\quad P(M=0)\\approx0{,}0061,\\ P(M=1)\\approx0{,}0320,\\ P(M=2)\\approx0{,}0827,\\quad P(M\\le2)\\approx0{,}1208',
        resultLatex: 'P(M\\le2)\\approx0{,}1208',
        check: text(
            'Vsota treh členov binomskega zakona je približno \\(0{,}1208\\), torej je \\(2\\) ali manj zgrešenih med \\(100\\) intervali približno enkrat v \\(8\\) ponovitvah: nenavadno ni, a tudi ne pogosto, pričakovana vrednost je \\(mq\\approx5\\). Izračunano iz zakona, ne izmerjeno.',
            'The sum of three terms of the binomial law is about \\(0.1208\\), so \\(2\\) or fewer misses among \\(100\\) intervals happens about once in \\(8\\) repetitions: not unusual, but not common either, the expected value is \\(mq\\approx5\\). Computed from the law, not measured.',
        ),
    },
];

const rs6Steps: readonly GuidedLessonStep[] = [
    step({
        id: 'rs6-one-interval', order: 1,
        title: text('En interval', 'One interval'),
        purpose: text('Napovedati, ali en interval pokrije pravo sredino, in videti, kaj en interval pove.', 'Predicting whether one interval covers the true mean and seeing what one interval says.'),
        explanation: text(
            'Populacija so cela števila od \\(0\\) do \\(99\\), vsako enako verjetno; njena prava sredina je \\(49{,}5\\) (v grafu črtkana črta Prava sredina). Iz vzorca \\(36\\) žrebanj izračunamo povprečje \\(\\bar x\\) in narišemo interval \\(\\bar x\\pm9{,}4296\\), kjer je \\(9{,}4296=1{,}96\\,\\tfrac{\\sigma}{\\sqrt{36}}\\) (odčitek Polovična širina intervala). Zelen interval pokrije pravo sredino, jantarni interval z oznako Zgreši jo zgreši. Zdaj je nastavljeno seme \\(42\\), število intervalov \\(1\\) in Prikazano \\(0\\) od \\(1\\): noben interval še ni narisan, odčitka Verjetnost, da interval pokrije pravo sredino (točno) in Delež zgrešenih po zakonu pa sta že izračunana.',
            'The population is the whole numbers from \\(0\\) to \\(99\\), each equally likely; its true mean is \\(49.5\\) (the dashed line True mean in the graph). From a sample of \\(36\\) draws we compute the mean \\(\\bar x\\) and draw the interval \\(\\bar x\\pm9.4296\\), where \\(9.4296=1.96\\,\\tfrac{\\sigma}{\\sqrt{36}}\\) (the readout Half-width of an interval). A green interval covers the true mean, an amber interval with the flag Misses misses it. Now the seed is \\(42\\), the number of intervals is \\(1\\) and Shown is \\(0\\) of \\(1\\): no interval is drawn yet, while the readouts Probability that an interval covers the true mean (exact) and Share that miss by the law are already computed.',
        ),
        formulaIds: ['interval-half-width'],
        observationPrompt: text(
            'Napovej: ali bo prvi interval pokril pravo sredino \\(49{,}5\\) in kako prepričan si v to; zapiši razlog. Nato pritisni Naslednji korak in primerjaj z barvo intervala, oznako Zgreši in odčitkom Intervalov, ki zgrešijo. Premisli, kaj ti en interval pove o tem, kako dobro deluje postopek.',
            'Predict whether the first interval will cover the true mean \\(49.5\\) and how sure you are; write down the reason. Then press Next step and compare with the colour of the interval, the flag Misses and the readout Intervals that miss. Think about what one interval tells you about how well the procedure works.',
        ),
        expectedObservations: [text(
            'Seme \\(42\\), velikost vzorca \\(36\\), \\(1\\) interval: Prikazano \\(1\\) od \\(1\\), Intervalov, ki zgrešijo \\(0\\) od \\(1\\) (interval je zelen, pokrije \\(49{,}5\\)); Polovična širina intervala \\(9{,}4296\\); Verjetnost, da interval pokrije pravo sredino (točno) \\(0{,}95030\\).',
            'Seed \\(42\\), sample size \\(36\\), \\(1\\) interval: Shown \\(1\\) of \\(1\\), Intervals that miss \\(0\\) of \\(1\\) (the interval is green, it covers \\(49.5\\)); Half-width of an interval \\(9.4296\\); Probability that an interval covers the true mean (exact) \\(0.95030\\).',
        )],
        scene: randomScene('rs6-one-interval-scene', RS6_ONE_NOT_DRAWN,
            'Intervali zaupanja, seme \\(42\\), velikost vzorca \\(36\\), \\(1\\) interval, noben še ni narisan: Prikazano \\(0\\) od \\(1\\); Polovična širina intervala \\(9{,}4296\\); Verjetnost, da interval pokrije pravo sredino (točno) \\(0{,}95030\\); Delež zgrešenih po zakonu \\(4{,}97\\,\\%\\).',
            'Confidence intervals, seed \\(42\\), sample size \\(36\\), \\(1\\) interval, none drawn yet: Shown \\(0\\) of \\(1\\); Half-width of an interval \\(9.4296\\); Probability that an interval covers the true mean (exact) \\(0.95030\\); Share that miss by the law \\(4.97\\,\\%\\).'),
    }),
    step({
        id: 'rs6-twenty', order: 2,
        title: text('Dvajset intervalov', 'Twenty intervals'),
        purpose: text('Napovedati, koliko od \\(20\\) intervalov zgreši, in primerjati z zagonom.', 'Predicting how many of \\(20\\) intervals miss and comparing with the run.'),
        explanation: text(
            'Prvi interval (seme \\(42\\)) pokrije \\(49{,}5\\): Intervalov, ki zgrešijo \\(0\\) od \\(1\\). Ta rezultat ne pove ničesar o postopku, saj en interval pokrije ali zgreši. Odčitka Verjetnost, da interval pokrije pravo sredino (točno) in Delež zgrešenih po zakonu stojita že na začetku: pokritost je \\(0{,}95030\\), delež zgrešenih \\(4{,}97\\,\\%\\) (izračunano po formuli spodaj in ne izmerjeno). Zdaj je nastavljeno \\(20\\) intervalov in Prikazano \\(0\\) od \\(20\\); odčitek Pričakovano zgrešenih še kaže \\(0 \\pm 0\\), ker ni prikazanih intervalov.',
            'The first interval (seed \\(42\\)) covers \\(49.5\\): Intervals that miss \\(0\\) of \\(1\\). This result says nothing about the procedure, since one interval either covers or misses. The readouts Probability that an interval covers the true mean (exact) and Share that miss by the law stand there from the start: coverage is \\(0.95030\\), the share that miss \\(4.97\\,\\%\\) (computed by the formula below, not measured). Now \\(20\\) intervals and Shown \\(0\\) of \\(20\\) are set; the readout Expected misses still shows \\(0 \\pm 0\\), because no intervals are shown.',
        ),
        formulaIds: ['interval-exact'],
        observationPrompt: text(
            'Iz verjetnosti zgrešitve \\(0{,}0497\\) napovej, koliko od \\(20\\) intervalov zgreši (izračunaj \\(20\\cdot0{,}0497\\)); zapiši število in razlog. Nato pritisni Predvajaj (ali Naslednji korak do konca) in primerjaj z odčitkoma Intervalov, ki zgrešijo in Pričakovano zgrešenih ter z jantarnimi intervali. Po želji nastavi Seme generatorja na \\(43\\) in nato na \\(7\\) in poglej, kako se število zgrešenih spremeni.',
            'From the miss probability \\(0.0497\\) predict how many of \\(20\\) intervals miss (compute \\(20\\cdot0.0497\\)); write down the number and the reason. Then press Play (or Next step to the end) and compare with the readouts Intervals that miss and Expected misses and with the amber intervals. If you like, set Generator seed to \\(43\\) and then to \\(7\\) and see how the number of misses changes.',
        ),
        expectedObservations: [text(
            'Seme \\(42\\), \\(20\\) intervalov: Intervalov, ki zgrešijo \\(0\\) od \\(20\\); Pričakovano zgrešenih \\(1 \\pm 1\\) (\\(20\\cdot0{,}0497\\approx0{,}99\\)). Seme \\(43\\): \\(3\\) od \\(20\\); seme \\(7\\): \\(1\\) od \\(20\\).',
            'Seed \\(42\\), \\(20\\) intervals: Intervals that miss \\(0\\) of \\(20\\); Expected misses \\(1 \\pm 1\\) (\\(20\\cdot0.0497\\approx0.99\\)). Seed \\(43\\): \\(3\\) of \\(20\\); seed \\(7\\): \\(1\\) of \\(20\\).',
        )],
        scene: randomScene('rs6-twenty-scene', RS6_TWENTY_NOT_DRAWN,
            'Intervali zaupanja, seme \\(42\\), velikost vzorca \\(36\\), \\(20\\) intervalov, noben še ni narisan: Prikazano \\(0\\) od \\(20\\); Intervalov, ki zgrešijo \\(0\\) od \\(0\\); Pričakovano zgrešenih \\(0 \\pm 0\\); Delež zgrešenih po zakonu \\(4{,}97\\,\\%\\).',
            'Confidence intervals, seed \\(42\\), sample size \\(36\\), \\(20\\) intervals, none drawn yet: Shown \\(0\\) of \\(20\\); Intervals that miss \\(0\\) of \\(0\\); Expected misses \\(0 \\pm 0\\); Share that miss by the law \\(4.97\\,\\%\\).'),
    }),
    step({
        id: 'rs6-hundred', order: 3,
        title: text('Sto intervalov in zakon zgrešenih', 'A hundred intervals and the law of misses'),
        purpose: text('Z binomskim zakonom pojasniti, koliko od \\(100\\) intervalov zgreši, in primerjati zagon z zakonom.', 'Explaining with the binomial law how many of \\(100\\) intervals miss and comparing the run with the law.'),
        explanation: text(
            'Pri \\(20\\) intervalih (seme \\(42\\)) nobeden ne zgreši (\\(0\\) od \\(20\\)), kar je ob pričakovanih \\(1 \\pm 1\\) povsem običajno; z drugim semenom je zgrešenih lahko več (seme \\(43\\): \\(3\\), seme \\(7\\): \\(1\\)). Število zgrešenih je naključno in njegov zakon je izračunan: zgrešenih je binomsko s \\(q=1-0{,}95030=0{,}04970\\), ne \\(0{,}05\\). Zakon je argument, intervali in številka v zagonu so ponazoritev. Zdaj je nastavljeno \\(100\\) intervalov in Prikazano \\(0\\) od \\(100\\); graf bo ob predvajanju risal stolpce zakona in polno črto Ta poskus.',
            'With \\(20\\) intervals (seed \\(42\\)) none misses (\\(0\\) of \\(20\\)), which is quite ordinary beside the expected \\(1 \\pm 1\\); with another seed more can miss (seed \\(43\\): \\(3\\), seed \\(7\\): \\(1\\)). The number of misses is random and its law is computed: the number of misses is binomial with \\(q=1-0.95030=0.04970\\), not \\(0.05\\). The law is the argument, the intervals and the count in a run are the illustration. Now \\(100\\) intervals and Shown \\(0\\) of \\(100\\) are set; while it plays the graph draws the bars of the law and the solid line This run.',
        ),
        formulaIds: ['miss-law'],
        observationPrompt: text(
            'Napovej, koliko od \\(100\\) intervalov bo zgrešilo in v kakšnem razponu je to še običajno (pomisli na \\(mq\\) in na to, da se število od zagona do zagona spreminja); zapiši razpon in razlog. Nato pritisni Predvajaj (ali Naslednji korak do konca) in primerjaj število zgrešenih z odčitkom Pričakovano zgrešenih, s stolpci Zgrešenih po zakonu in s polno črto Ta poskus.',
            'Predict how many of \\(100\\) intervals will miss and in what range that is still usual (think of \\(mq\\) and of the number changing from run to run); write down the range and the reason. Then press Play (or Next step to the end) and compare the number of misses with the readout Expected misses, with the bars Misses by the law and with the solid line This run.',
        ),
        expectedObservations: [text(
            'Seme \\(42\\), \\(100\\) intervalov: Intervalov, ki zgrešijo \\(2\\) od \\(100\\) (intervala \\(21\\) in \\(28\\)); Delež zgrešenih intervalov \\(2\\,\\%\\); Delež zgrešenih po zakonu \\(4{,}97\\,\\%\\); Pričakovano zgrešenih \\(5 \\pm 2{,}2\\); podnapis Ta poskus: zgrešenih je \\(2\\) (polna črta).',
            'Seed \\(42\\), \\(100\\) intervals: Intervals that miss \\(2\\) of \\(100\\) (intervals \\(21\\) and \\(28\\)); Share of intervals that miss \\(2\\,\\%\\); Share that miss by the law \\(4.97\\,\\%\\); Expected misses \\(5 \\pm 2.2\\); the caption This run: \\(2\\) missed (solid line).',
        )],
        scene: randomScene('rs6-hundred-scene', RS6_HUNDRED_NOT_DRAWN,
            'Intervali zaupanja, seme \\(42\\), velikost vzorca \\(36\\), \\(100\\) intervalov, noben še ni narisan: Prikazano \\(0\\) od \\(100\\); Intervalov, ki zgrešijo \\(0\\) od \\(0\\); Delež zgrešenih po zakonu \\(4{,}97\\,\\%\\).',
            'Confidence intervals, seed \\(42\\), sample size \\(36\\), \\(100\\) intervals, none drawn yet: Shown \\(0\\) of \\(100\\); Intervals that miss \\(0\\) of \\(0\\); Share that miss by the law \\(4.97\\,\\%\\).'),
    }),
    step({
        id: 'rs6-long', order: 4,
        title: text('Deset tisoč intervalov', 'Ten thousand intervals'),
        purpose: text('Napovedati, h kateri vrednosti se približa delež zgrešenih pri \\(10\\,000\\) intervalih.', 'Predicting which value the share of misses approaches with \\(10\\,000\\) intervals.'),
        explanation: text(
            'Pri \\(100\\) intervalih (seme \\(42\\)) sta zgrešena \\(2\\) (intervala \\(21\\) in \\(28\\)), pričakovano pa jih je \\(5 \\pm 2{,}2\\). Ali je \\(2\\) nenavadno, pove zakon, ne občutek: \\(P(M\\le2)\\approx0{,}1208\\), kar je približno vsakih osem ponovitev (izračun spodaj). Zdaj je nastavljeno \\(100\\) intervalov, vsi prikazani, Delež zgrešenih intervalov je \\(2\\,\\%\\) (en zagon z enim semenom). Delež zgrešenih po zakonu je \\(4{,}97\\,\\%\\) in je izračunan: to je vrednost, ki jo delež zagona približuje, ne vrednost, ki bi jo zagon zagotovil.',
            'With \\(100\\) intervals (seed \\(42\\)) \\(2\\) miss (intervals \\(21\\) and \\(28\\)), while \\(5 \\pm 2.2\\) are expected. Whether \\(2\\) is unusual is told by the law, not by a feeling: \\(P(M\\le2)\\approx0.1208\\), roughly once in eight repetitions (the calculation is below). Now \\(100\\) intervals are set, all shown, and Share of intervals that miss is \\(2\\,\\%\\) (one run with one seed). The Share that miss by the law is \\(4.97\\,\\%\\) and is computed: it is the value the share of a run approaches, not a value that a run guarantees.',
        ),
        formulaIds: ['miss-law'],
        workedExampleId: 'rs6-two-misses',
        observationPrompt: text(
            'Napovej, kolikšen bo Delež zgrešenih intervalov pri \\(10\\,000\\) intervalih (v odstotkih na dve decimalki) in v katerem razponu okoli računane vrednosti; zapiši razlog (pomisli, kaj se z \\(m\\) zgodi z odstopanjem \\(\\sqrt{mq(1-q)}\\)). Nato v polje Število intervalov vpiši \\(10000\\) in primerjaj z odčitki Delež zgrešenih intervalov, Delež zgrešenih po zakonu in Pričakovano zgrešenih. Opazi, da graf nariše le prvih \\(100\\) intervalov, odčitki pa štejejo vse.',
            'Predict Share of intervals that miss with \\(10\\,000\\) intervals (in percent to two decimals) and in what range around the computed value; write down the reason (think what happens to the deviation \\(\\sqrt{mq(1-q)}\\) as \\(m\\) grows). Then type \\(10000\\) in the field Number of intervals and compare with the readouts Share of intervals that miss, Share that miss by the law and Expected misses. Notice that the graph draws only the first \\(100\\) intervals while the readouts count all of them.',
        ),
        expectedObservations: [text(
            'Seme \\(42\\), \\(10\\,000\\) intervalov: Intervalov, ki zgrešijo \\(524\\) od \\(10\\,000\\); Delež zgrešenih intervalov \\(5{,}24\\,\\%\\); Delež zgrešenih po zakonu \\(4{,}97\\,\\%\\); Verjetnost, da interval pokrije pravo sredino (točno) \\(0{,}95030\\); Pričakovano zgrešenih \\(497 \\pm 21{,}7\\) (\\(524\\) je približno \\(1{,}2\\) odstopanja nad \\(497\\)); podnapis Narisani prvi intervali: \\(100\\).',
            'Seed \\(42\\), \\(10\\,000\\) intervals: Intervals that miss \\(524\\) of \\(10\\,000\\); Share of intervals that miss \\(5.24\\,\\%\\); Share that miss by the law \\(4.97\\,\\%\\); Probability that an interval covers the true mean (exact) \\(0.95030\\); Expected misses \\(497 \\pm 21.7\\) (\\(524\\) is about \\(1.2\\) deviations above \\(497\\)); the caption First intervals drawn: \\(100\\).',
        )],
        scene: randomScene('rs6-long-scene', RS6_HUNDRED,
            'Intervali zaupanja, seme \\(42\\), velikost vzorca \\(36\\), \\(100\\) intervalov, vsi prikazani: Intervalov, ki zgrešijo \\(2\\) od \\(100\\); Delež zgrešenih intervalov \\(2\\,\\%\\); Delež zgrešenih po zakonu \\(4{,}97\\,\\%\\); Pričakovano zgrešenih \\(5 \\pm 2{,}2\\).',
            'Confidence intervals, seed \\(42\\), sample size \\(36\\), \\(100\\) intervals, all shown: Intervals that miss \\(2\\) of \\(100\\); Share of intervals that miss \\(2\\,\\%\\); Share that miss by the law \\(4.97\\,\\%\\); Expected misses \\(5 \\pm 2.2\\).'),
    }),
    step({
        id: 'rs6-sample-size', order: 5,
        title: text('Velikost vzorca', 'Sample size'),
        purpose: text('Napovedati, kako velikost vzorca spremeni širino intervalov in delež zgrešenih.', 'Predicting how the sample size changes the width of the intervals and the share of misses.'),
        explanation: text(
            'Pri \\(10\\,000\\) intervalih (seme \\(42\\)) zgreši \\(524\\), to je \\(5{,}24\\,\\%\\), po zakonu pa \\(4{,}97\\,\\%\\): zagon je blizu računane vrednosti, a ni enak njej, razlika je v okviru odstopanja \\(\\pm21{,}7\\). Delež zagona pri \\(10\\,000\\) intervalih je boljša ocena kot pri \\(100\\), a ocena ostane ocena; zakon je izračunan. Zdaj sta nastavljena vzorec \\(36\\) in \\(10\\,000\\) intervalov. Polovična širina \\(1{,}96\\,\\tfrac{\\sigma}{\\sqrt{n}}\\) je odvisna od velikosti vzorca \\(n\\); najmanjši dovoljeni vzorec je \\(16\\), ker se majhni vzorci obnašajo drugače (npr. en sam podatek vedno pokrije).',
            'With \\(10\\,000\\) intervals (seed \\(42\\)) \\(524\\) miss, that is \\(5.24\\,\\%\\), while by the law it is \\(4.97\\,\\%\\): the run is near the computed value but not equal to it, the difference is within the deviation \\(\\pm21.7\\). The share of a run with \\(10\\,000\\) intervals is a better estimate than with \\(100\\), but an estimate stays an estimate; the law is computed. Now the sample \\(36\\) and \\(10\\,000\\) intervals are set. The half-width \\(1.96\\,\\tfrac{\\sigma}{\\sqrt{n}}\\) depends on the sample size \\(n\\); the smallest allowed sample is \\(16\\), because small samples behave differently (for example a single value always covers).',
        ),
        formulaIds: ['interval-half-width', 'interval-exact'],
        observationPrompt: text(
            'Napovej, kaj se z vzorcem \\(16\\) in nato \\(100\\) zgodi s Polovična širina intervala (izračunaj iz \\(\\tfrac{1}{\\sqrt n}\\) glede na vzorec \\(36\\)) in kaj z deležem zgrešenih; zapiši številki in razlog. Nato v polje Velikost vzorca vpiši \\(16\\), nato \\(100\\) in pri vsakem primerjaj z odčitki Polovična širina intervala, Verjetnost, da interval pokrije pravo sredino (točno), Delež zgrešenih po zakonu in Delež zgrešenih intervalov.',
            'Predict what happens with the sample \\(16\\) and then \\(100\\) to Half-width of an interval (compute it from \\(\\tfrac{1}{\\sqrt n}\\) relative to the sample \\(36\\)) and to the share of misses; write down both numbers and the reason. Then type \\(16\\) and then \\(100\\) in the field Sample size and compare with the readouts Half-width of an interval, Probability that an interval covers the true mean (exact), Share that miss by the law and Share of intervals that miss each time.',
        ),
        expectedObservations: [text(
            'Seme \\(42\\), \\(10\\,000\\) intervalov: vzorec \\(16\\): Polovična širina intervala \\(14{,}1444\\), pokritost \\(0{,}95083\\), Delež zgrešenih po zakonu \\(4{,}92\\,\\%\\), Delež zgrešenih intervalov \\(5{,}44\\,\\%\\) (\\(544\\)). Vzorec \\(100\\): \\(5{,}6577\\), pokritost \\(0{,}94999\\), po zakonu \\(5\\,\\%\\), \\(5{,}29\\,\\%\\) (\\(529\\)).',
            'Seed \\(42\\), \\(10\\,000\\) intervals: sample \\(16\\): Half-width of an interval \\(14.1444\\), coverage \\(0.95083\\), Share that miss by the law \\(4.92\\,\\%\\), Share of intervals that miss \\(5.44\\,\\%\\) (\\(544\\)). Sample \\(100\\): \\(5.6577\\), coverage \\(0.94999\\), by the law \\(5\\,\\%\\), \\(5.29\\,\\%\\) (\\(529\\)).',
        )],
        scene: randomScene('rs6-sample-size-scene', RS6_LONG_RUN,
            'Intervali zaupanja, seme \\(42\\), velikost vzorca \\(36\\), \\(10\\,000\\) intervalov, vsi prikazani: Polovična širina intervala \\(9{,}4296\\); Delež zgrešenih intervalov \\(5{,}24\\,\\%\\); Delež zgrešenih po zakonu \\(4{,}97\\,\\%\\); Verjetnost, da interval pokrije pravo sredino (točno) \\(0{,}95030\\).',
            'Confidence intervals, seed \\(42\\), sample size \\(36\\), \\(10\\,000\\) intervals, all shown: Half-width of an interval \\(9.4296\\); Share of intervals that miss \\(5.24\\,\\%\\); Share that miss by the law \\(4.97\\,\\%\\); Probability that an interval covers the true mean (exact) \\(0.95030\\).'),
    }),
    step({
        id: 'rs6-explore', order: 6,
        title: text('Preizkušaj sam', 'Explore on your own'),
        purpose: text('Prosto raziskovanje: za vsako nastavitev napovedati širino in število zgrešenih iz zakona ter preveriti.', 'Free exploration: for every setting predicting the width and the number of misses from the law and checking.'),
        explanation: text(
            'Z vzorcem \\(16\\) so intervali širši (polovična širina \\(14{,}1444\\)), s \\(100\\) ožji (\\(5{,}6577\\)), delež zgrešenih po zakonu pa je skoraj enak: \\(4{,}92\\,\\%\\), \\(4{,}97\\,\\%\\) in \\(5\\,\\%\\) (pokritost \\(0{,}95083\\), \\(0{,}95030\\), \\(0{,}94999\\)). Širina sledi \\(\\tfrac{1}{\\sqrt n}\\), delež zgrešenih pa ostane blizu \\(5\\,\\%\\), ker se z vzorcem krči tudi odstopanje povprečja vzorca. V zagonu (seme \\(42\\), \\(10\\,000\\) intervalov) so deleži \\(5{,}44\\,\\%\\) in \\(5{,}29\\,\\%\\): blizu zakona, a ne enaki. Zdaj so nastavljeni seme \\(7\\), vzorec \\(25\\) in \\(100\\) intervalov.',
            'With the sample \\(16\\) the intervals are wider (half-width \\(14.1444\\)), with \\(100\\) narrower (\\(5.6577\\)), while the share that miss by the law is nearly the same: \\(4.92\\,\\%\\), \\(4.97\\,\\%\\) and \\(5\\,\\%\\) (coverage \\(0.95083\\), \\(0.95030\\), \\(0.94999\\)). The width follows \\(\\tfrac{1}{\\sqrt n}\\), while the share of misses stays near \\(5\\,\\%\\), because the deviation of the sample mean shrinks with the sample too. In the run (seed \\(42\\), \\(10\\,000\\) intervals) the shares are \\(5.44\\,\\%\\) and \\(5.29\\,\\%\\): near the law but not equal to it. Now the seed \\(7\\), the sample \\(25\\) and \\(100\\) intervals are set.',
        ),
        formulaIds: ['interval-half-width', 'interval-exact', 'miss-law'],
        observationPrompt: text(
            'Preizkušaj sam. Nastavljeni so seme \\(7\\), vzorec \\(25\\) in \\(100\\) intervalov: Intervalov, ki zgrešijo \\(6\\) od \\(100\\), Polovična širina intervala \\(11{,}3155\\) in Delež zgrešenih po zakonu \\(4{,}95\\,\\%\\). Spreminjaj Seme generatorja, Velikost vzorca in Število intervalov; za vsako nastavitev najprej napovej širino iz \\(\\tfrac{1}{\\sqrt n}\\) in število zgrešenih iz zakona, nato preveri. Opazuj, da je en zagon blizu zakona, a od njega odstopa, in da zakon ni dokaz o tem, kateri interval zgreši.',
            'Explore on your own. The seed \\(7\\), the sample \\(25\\) and \\(100\\) intervals are set: Intervals that miss \\(6\\) of \\(100\\), Half-width of an interval \\(11.3155\\) and Share that miss by the law \\(4.95\\,\\%\\). Change Generator seed, Sample size and Number of intervals; for each setting first predict the width from \\(\\tfrac{1}{\\sqrt n}\\) and the number of misses from the law, then check. Watch that one run is near the law but differs from it, and that the law does not say which interval misses.',
        ),
        expectedObservations: [text(
            'Seme \\(7\\), vzorec \\(25\\), \\(100\\) intervalov: Intervalov, ki zgrešijo \\(6\\) od \\(100\\); Delež zgrešenih intervalov \\(6\\,\\%\\); Delež zgrešenih po zakonu \\(4{,}95\\,\\%\\); Verjetnost, da interval pokrije pravo sredino (točno) \\(0{,}95049\\); Pričakovano zgrešenih \\(5 \\pm 2{,}2\\); Polovična širina intervala \\(11{,}3155\\).',
            'Seed \\(7\\), sample \\(25\\), \\(100\\) intervals: Intervals that miss \\(6\\) of \\(100\\); Share of intervals that miss \\(6\\,\\%\\); Share that miss by the law \\(4.95\\,\\%\\); Probability that an interval covers the true mean (exact) \\(0.95049\\); Expected misses \\(5 \\pm 2.2\\); Half-width of an interval \\(11.3155\\).',
        )],
        scene: randomScene('rs6-explore-scene', RS6_EXPLORE,
            'Intervali zaupanja, seme \\(7\\), velikost vzorca \\(25\\), \\(100\\) intervalov, vsi prikazani: Intervalov, ki zgrešijo \\(6\\) od \\(100\\); Delež zgrešenih intervalov \\(6\\,\\%\\); Delež zgrešenih po zakonu \\(4{,}95\\,\\%\\); Polovična širina intervala \\(11{,}3155\\).',
            'Confidence intervals, seed \\(7\\), sample size \\(25\\), \\(100\\) intervals, all shown: Intervals that miss \\(6\\) of \\(100\\); Share of intervals that miss \\(6\\,\\%\\); Share that miss by the law \\(4.95\\,\\%\\); Half-width of an interval \\(11.3155\\).'),
    }),
];

const sources: GuidedLesson['sources'] = [
    {
        id: 'bezeg-randomness-implementation',
        citation: 'Bezeg source: src/random/ (generator, runners, exact comparators, state model) and src/graphs/random/SimulationGraph.tsx.',
        implementationCorrespondence: 'A scene sets the interval mode, the run fields (seed, number of intervals, sample size) and the playback position of the simulation graph; the population is the whole numbers 0 to 99, every draw is an integer, an interval covers the true mean exactly when the integer sum of the sample is within the half-width times the sample size, rounded down, of the sample size times the true mean (for a sample of 36 draws within 339 of 1782, no tie case), the miss counts of a run are integer counts, and the coverage (integer convolution) and the binomial law of the number of misses are exact comparators computed in double precision, so quoted decimals are rounded.',
    },
];

export const rs6Lesson: GuidedLesson = {
    demonstrationId: 'prob-simulation',
    title: text('Intervali zaupanja, ki včasih zgrešijo', 'Confidence intervals that sometimes miss'),
    summary: text(
        'Interval zaupanja je postopek: če ga ponavljamo na novih vzorcih, pokrije pravo sredino v približno \\(95\\,\\%\\) ponovitev, torej jo približno vsak dvajseti zgreši, in kateri, odloča naključje. Točen račun pokritosti in binomski zakon števila zgrešenih sta argument, narisani intervali in štetje v zagonu sta ponazoritev.',
        'A confidence interval is a procedure: repeated on fresh samples it covers the true mean in about \\(95\\,\\%\\) of the repetitions, so about every twentieth one misses it, and which ones is decided by chance. The exact calculation of the coverage and the binomial law of the number of misses are the argument, the drawn intervals and the counts in a run are the illustration.',
    ),
    prerequisites: [text('Povprečje, varianca in standardni odklon, binomska porazdelitev.', 'Mean, variance and standard deviation, the binomial distribution.')],
    learningGoals: [
        text('Znaš pojasniti, da je \\(95\\,\\%\\) lastnost postopka ob ponavljanju, ne verjetnost, da je povprečje v posameznem že narisanem intervalu.', 'Can explain that \\(95\\,\\%\\) is a property of the procedure under repetition, not the probability that the mean is in one interval already drawn.'),
        text('Veš, da je število zgrešenih intervalov binomsko z izračunano verjetnostjo zgrešitve \\(0{,}0497\\) in znaš z njim presoditi, ali je zagon nenavaden.', 'Know that the number of missed intervals is binomial with the computed miss probability \\(0.0497\\) and can use it to judge whether a run is unusual.'),
        text('Znaš napovedati, kako velikost vzorca spremeni širino intervalov (\\(\\tfrac{1}{\\sqrt n}\\)) in da delež zgrešenih ostane skoraj enak.', 'Can predict how the sample size changes the width of the intervals (\\(\\tfrac{1}{\\sqrt n}\\)) and that the share of misses stays nearly the same.'),
    ],
    formulaBlocks: rs6Formulas,
    workedExamples: rs6Examples,
    steps: rs6Steps,
    sources,
    edgeCases: [
        text('En interval ne pove ničesar o postopku: pokrije ali zgreši, \\(0\\) ali \\(1\\) zgrešenih od \\(1\\).', 'One interval says nothing about the procedure: it covers or misses, \\(0\\) or \\(1\\) misses out of \\(1\\).'),
        text('Narisanih je le prvih \\(100\\) intervalov, odčitki pa štejejo vse intervale zagona. Zagon je ena izvedba z navedenim semenom, ne dokaz; točen zakon je argument.', 'Only the first \\(100\\) intervals are drawn, while the readouts count all the intervals of the run. A run is one realisation with its seed, not a proof; the exact law is the argument.'),
        text('Vzorci manjši od \\(16\\) niso dovoljeni, ker se majhni vzorci obnašajo drugače (en sam podatek vedno pokrije).', 'Samples smaller than \\(16\\) are not allowed, because small samples behave differently (a single value always covers).'),
    ],
    unresolvedQuestions: [],
};
