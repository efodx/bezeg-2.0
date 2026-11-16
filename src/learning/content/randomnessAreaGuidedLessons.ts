/**
 * Guided lesson RS3 of the randomness family (docs/specs/randomness-simulation-lessons.md): Monte Carlo area and the number pi, on `prob-simulation` (SimulationGraph).
 * Scenes use the `random` actions of `randomnessSceneActions` (randomnessGuidedLessons.ts) and every scene starts from the Demonstration default and names what it sets
 * (the area mode, the run fields, the playback position). The area argument (the chance of a point in the quarter circle is pi/4) and the exact standard error
 * 4 sqrt(p (1 - p) / n) are the arguments; the points and the estimates of one run are the illustration, always stated as the result of one run with its seed. Every number the
 * text quotes is a readout of the graph for that scene (probe: .command-logs/rand-b/probe.txt and probe2-rs3.txt), arithmetic stated in the text, or a value the learner reads
 * after an action the text asks for; the numbers are listed per step in docs/reviews/feature-streams/families-prep/notes/f3-rand-b.md. The steps are predict-then-make: the
 * opening shows a different state from the one the prompt asks the learner to produce.
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

/** RS3: seed 42 and the quarter circle are the Demonstration default; the steps differ in the points drawn, the count, the shape and the seed. */
export const RS3_EMPTY_SQUARE = {mode: 'area', run: {n: 100}, position: 0} as const;
export const RS3_HUNDRED_POINTS = {mode: 'area', run: {n: 100}} as const;
export const RS3_ERROR_SCALE = {mode: 'area', run: {n: 100}} as const;
export const RS3_TEN_THOUSAND_POINTS = {mode: 'area', run: {n: 10000}} as const;
export const RS3_WHOLE_CIRCLE_START = {mode: 'area', run: {n: 1000}} as const;
export const RS3_EXPLORE = {mode: 'area', run: {seed: 7, n: 1000, areaShape: 'disc'}} as const;

const rs3Formulas: readonly FormulaBlock[] = [
    {
        id: 'mc-share',
        latex: 'p=\\frac{\\pi}{4},\\qquad \\hat p=\\frac{N}{n},\\qquad \\hat\\pi=4\\hat p=\\frac{4N}{n}',
        notation: text(
            '\\(n\\) je število točk, \\(N\\) število točk v krogu, \\(p=\\tfrac\\pi4\\) verjetnost, da točka pade v krog, \\(\\hat p\\) delež točk v krogu v zagonu in \\(\\hat\\pi\\) ocena števila \\(\\pi\\).',
            '\\(n\\) is the number of points, \\(N\\) the number of points in the circle, \\(p=\\tfrac\\pi4\\) the chance that a point lands in the circle, \\(\\hat p\\) the share of points in the circle in a run and \\(\\hat\\pi\\) the estimate of \\(\\pi\\).',
        ),
        explanation: text(
            'Ploščina četrtine kroga s polmerom \\(1\\) je \\(\\tfrac\\pi4\\), ploščina kvadrata je \\(1\\), zato je \\(p=\\tfrac\\pi4\\), približno \\(0{,}7854\\). Delež \\(\\hat p\\) je naključen in ocenjuje \\(p\\); ocena \\(\\hat\\pi=4\\hat p\\) ocenjuje \\(\\pi\\). Vrednost \\(p\\) je izračunana iz ploščin, delež \\(\\hat p\\) je izmerjen v zagonu.',
            'The area of a quarter circle with radius \\(1\\) is \\(\\tfrac\\pi4\\), the area of the square is \\(1\\), so \\(p=\\tfrac\\pi4\\), about \\(0.7854\\). The share \\(\\hat p\\) is random and estimates \\(p\\); the estimate \\(\\hat\\pi=4\\hat p\\) estimates \\(\\pi\\). The value \\(p\\) is computed from areas, the share \\(\\hat p\\) is measured in a run.',
        ),
    },
    {
        id: 'mc-se',
        latex: '\\sigma_{\\hat\\pi}=4\\sqrt{\\frac{p(1-p)}{n}},\\qquad p=\\frac{\\pi}{4}',
        notation: text(
            '\\(n\\) je število točk, \\(p=\\tfrac\\pi4\\) verjetnost, da točka pade v krog, in \\(\\sigma_{\\hat\\pi}\\) običajno odstopanje ocene \\(\\hat\\pi\\) od \\(\\pi\\) (standardni odklon ocene).',
            '\\(n\\) is the number of points, \\(p=\\tfrac\\pi4\\) the chance that a point lands in the circle and \\(\\sigma_{\\hat\\pi}\\) the typical deviation of the estimate \\(\\hat\\pi\\) from \\(\\pi\\) (the standard deviation of the estimate).',
        ),
        explanation: text(
            'Točke so neodvisne in vsaka je v krogu z verjetnostjo \\(p\\), zato ima delež \\(\\hat p\\) varianco \\(\\tfrac{p(1-p)}{n}\\) in standardni odklon \\(\\sqrt{\\tfrac{p(1-p)}{n}}\\). Ocena \\(\\hat\\pi=4\\hat p\\) ima štirikrat večji odklon. Vrednost je izračunana iz \\(p\\) in \\(n\\), ne iz zagona; zagon je od \\(\\pi\\) običajno oddaljen za eno ali dve taki odstopanji, redko več.',
            'The points are independent and each is in the circle with chance \\(p\\), so the share \\(\\hat p\\) has variance \\(\\tfrac{p(1-p)}{n}\\) and standard deviation \\(\\sqrt{\\tfrac{p(1-p)}{n}}\\). The estimate \\(\\hat\\pi=4\\hat p\\) has a deviation four times as large. The value is computed from \\(p\\) and \\(n\\), not from a run; a run is usually one or two such deviations away from \\(\\pi\\), rarely more.',
        ),
    },
];

const rs3Examples: readonly WorkedExample[] = [
    {
        id: 'rs3-se',
        title: text('Običajno odstopanje pri \\(100\\) točkah', 'The typical deviation with \\(100\\) points'),
        calculationLatex: '4\\sqrt{\\frac{p(1-p)}{n}}=4\\sqrt{\\frac{0{,}7854\\cdot0{,}2146}{100}}\\approx4\\sqrt{0{,}0016855}\\approx4\\cdot0{,}04105',
        resultLatex: '\\sigma_{\\hat\\pi}\\approx0{,}1642',
        check: text(
            'Odčitek Običajno odstopanje ocene pri \\(100\\) točkah je \\(\\pm\\,0{,}1642\\): isto število, izračunano iz \\(p=\\tfrac\\pi4\\) in \\(n=100\\), brez točk.',
            'The readout Typical deviation of the estimate with \\(100\\) points is \\(\\pm\\,0.1642\\): the same number, computed from \\(p=\\tfrac\\pi4\\) and \\(n=100\\), without any points.',
        ),
    },
];

const rs3Steps: readonly GuidedLessonStep[] = [
    step({
        id: 'rs3-square', order: 1,
        title: text('Kvadrat in četrtina kroga', 'The square and the quarter circle'),
        purpose: text('Napovedati delež točk v krogu iz ploščin, preden se točke narišejo.', 'Predicting the share of points in the circle from areas before the points are drawn.'),
        explanation: text(
            'Naključne točke mečemo v enotski kvadrat s stranico \\(1\\). Točka \\((x,y)\\) je v četrtini kroga, če je \\(x^2+y^2<1\\); graf to preveri s celimi števili brez zaokroževanja. Točke so enakomerno razporejene po kvadratu, zato je verjetnost, da točka pade v krog, enaka razmerju ploščine četrtine kroga s polmerom \\(1\\) in ploščine kvadrata. Ocena števila \\(\\pi\\) je štirikratnik deleža točk, ki so v krogu. Nastavljeno je seme \\(42\\) (seme generatorja je število, ki določi celoten naključni potek), število točk je \\(100\\) in nobena točka še ni narisana, zato so odčitki prazni.',
            'Random points are thrown into the unit square with side \\(1\\). A point \\((x,y)\\) is in the quarter circle when \\(x^2+y^2<1\\); the graph checks this with whole numbers, without rounding. The points are spread evenly over the square, so the chance that a point lands in the circle is the ratio of the area of the quarter circle with radius \\(1\\) to the area of the square. The estimate of \\(\\pi\\) is four times the share of points that are in the circle. The seed is \\(42\\) (the generator seed is a number that fixes the whole random course), the number of points is \\(100\\) and no point is drawn yet, so the readouts are empty.',
        ),
        formulaIds: [],
        observationPrompt: text(
            'Iz ploščin izračunaj, kolikšen delež točk bo v krogu, ter zapiši, koliko od \\(100\\) točk jih po tvoji napovedi pade v krog in kolikšno oceno števila \\(\\pi\\) to da. Nato pritisni Predvajaj (ali večkrat Naslednji korak), dokler Prikazano ne pokaže \\(100\\) od \\(100\\), in primerjaj napoved z odčitkoma Točk v krogu in Ocena števila \\(\\pi\\).',
            'From the areas work out what share of the points will be in the circle, and write down how many of the \\(100\\) points you expect to land in it and what estimate of \\(\\pi\\) that gives. Then press Play (or Next step several times) until Shown reads \\(100\\) of \\(100\\), and compare your prediction with the readouts Points in the circle and Estimate of \\(\\pi\\).',
        ),
        expectedObservations: [text(
            'Seme \\(42\\), \\(100\\) točk: \\(76\\) v krogu, delež \\(0{,}76\\), ocena \\(3{,}04\\), napaka \\(-0{,}1016\\), običajno odstopanje \\(\\pm\\,0{,}1642\\).',
            'Seed \\(42\\), \\(100\\) points: \\(76\\) in the circle, share \\(0.76\\), estimate \\(3.04\\), error \\(-0.1016\\), typical deviation \\(\\pm\\,0.1642\\).',
        )],
        scene: randomScene('rs3-square-scene', RS3_EMPTY_SQUARE,
            'Točke v kvadratu, seme \\(42\\), \\(100\\) točk, nobena še ni narisana: Prikazano \\(0\\) od \\(100\\), Točk v krogu \\(0\\) od \\(0\\), odčitki so \\(0\\).',
            'Points in the square, seed \\(42\\), \\(100\\) points, none drawn yet: Shown \\(0\\) of \\(100\\), Points in the circle \\(0\\) of \\(0\\), the readouts are \\(0\\).'),
    }),
    step({
        id: 'rs3-more-points', order: 2,
        title: text('Sto točk, deset tisoč točk', 'A hundred points, ten thousand points'),
        purpose: text('Napovedati oceno števila \\(\\pi\\) pri \\(10000\\) točkah in jo primerjati z odčitkom.', 'Predicting the estimate of \\(\\pi\\) with \\(10000\\) points and comparing it with the readout.'),
        explanation: text(
            'Zdaj je prikazanih vseh \\(100\\) točk (seme \\(42\\)): \\(76\\) jih je v krogu, delež je \\(0{,}76\\), ocena števila \\(\\pi\\) je \\(3{,}04\\) in napaka ocene (ocena minus \\(\\pi\\)) je \\(-0{,}1016\\). To je rezultat enega zagona s tem semenom, ne lastnost metode: z drugimi točkami bi bil drugačen. Naključje odloči, katere točke padejo v krog, zato se delež \\(\\hat p=\\tfrac Nn\\) od prave vrednosti \\(\\tfrac\\pi4\\) praviloma razlikuje. Graf nariše največ \\(300\\) točk (ponazoritev), odčitki pa štejejo vse točke zagona.',
            'All \\(100\\) points are shown now (seed \\(42\\)): \\(76\\) of them are in the circle, the share is \\(0.76\\), the estimate of \\(\\pi\\) is \\(3.04\\) and the error of the estimate (the estimate minus \\(\\pi\\)) is \\(-0.1016\\). This is the result of one run with this seed, not a property of the method: with other points it would be different. Chance decides which points land in the circle, so the share \\(\\hat p=\\tfrac Nn\\) usually differs from the true value \\(\\tfrac\\pi4\\). The graph draws at most \\(300\\) points (an illustration), while the readouts count all the points of the run.',
        ),
        formulaIds: ['mc-share'],
        observationPrompt: text(
            'Napovej, ali bo ocena števila \\(\\pi\\) po \\(10000\\) točkah bližje \\(\\pi\\) kot zdaj in za približno koliko se bo še zmotila; zapiši napoved in razlog. Nato v polju Število točk vpiši \\(10000\\) in primerjaj z odčitkoma Ocena števila \\(\\pi\\) in Napaka ocene.',
            'Predict whether the estimate of \\(\\pi\\) after \\(10000\\) points will be closer to \\(\\pi\\) than now and roughly by how much it will still be off; write down the prediction and the reason. Then type \\(10000\\) in the field Number of points and compare with the readouts Estimate of \\(\\pi\\) and Error of the estimate.',
        ),
        expectedObservations: [text(
            'Seme \\(42\\), \\(10000\\) točk: \\(7833\\) v krogu, delež \\(0{,}7833\\), ocena \\(3{,}1332\\), napaka \\(-0{,}0084\\), običajno odstopanje \\(\\pm\\,0{,}0164\\); narisanih je prvih \\(300\\) točk.',
            'Seed \\(42\\), \\(10000\\) points: \\(7833\\) in the circle, share \\(0.7833\\), estimate \\(3.1332\\), error \\(-0.0084\\), typical deviation \\(\\pm\\,0.0164\\); the first \\(300\\) points are drawn.',
        )],
        scene: randomScene('rs3-more-points-scene', RS3_HUNDRED_POINTS,
            'Točke v kvadratu, seme \\(42\\), \\(100\\) točk, vse prikazane: \\(76\\) v krogu, delež \\(0{,}76\\), ocena \\(3{,}04\\), napaka \\(-0{,}1016\\), običajno odstopanje \\(\\pm\\,0{,}1642\\).',
            'Points in the square, seed \\(42\\), \\(100\\) points, all shown: \\(76\\) in the circle, share \\(0.76\\), estimate \\(3.04\\), error \\(-0.1016\\), typical deviation \\(\\pm\\,0.1642\\).'),
    }),
    step({
        id: 'rs3-error-scale', order: 3,
        title: text('Merilo napake', 'The scale of the error'),
        purpose: text('Iz formule napovedati, kako se običajno odstopanje ocene spreminja s številom točk, in preveriti pri grafu.', 'Predicting from the formula how the typical deviation of the estimate changes with the number of points, then checking on the graph.'),
        explanation: text(
            'Napaka posameznega zagona je naključna, njeno običajno merilo pa je znano natančno: izračunamo ga s formulo (argument), točke so le ponazoritev. Zdaj je \\(n=100\\), seme \\(42\\), in odčitek Običajno odstopanje ocene je \\(\\pm\\,0{,}1642\\). Račun spodaj pokaže, kako pridemo do njega iz \\(p=\\tfrac\\pi4\\) in \\(n=100\\). Število točk \\(n\\) stoji v formuli pod korenom.',
            'The error of a single run is random, but its usual scale is known exactly: it is computed with a formula (the argument), the points are only an illustration. Now \\(n=100\\), the seed is \\(42\\), and the readout Typical deviation of the estimate is \\(\\pm\\,0.1642\\). The calculation below shows how it follows from \\(p=\\tfrac\\pi4\\) and \\(n=100\\). The number of points \\(n\\) stands under the root in the formula.',
        ),
        formulaIds: ['mc-se'],
        workedExampleId: 'rs3-se',
        observationPrompt: text(
            'Iz formule napovej, kolikšno bo Običajno odstopanje ocene pri \\(1000\\) in pri \\(10000\\) točkah, in zapiši razlog. Nato v polju Število točk vpiši najprej \\(1000\\), nato \\(10000\\) in primerjaj z odčitkom.',
            'From the formula predict what the Typical deviation of the estimate will be with \\(1000\\) and with \\(10000\\) points, and write down the reason. Then in the field Number of points type first \\(1000\\), then \\(10000\\), and compare with the readout.',
        ),
        expectedObservations: [text(
            'Seme \\(42\\): \\(n=1000\\): \\(779\\) v krogu, ocena \\(3{,}116\\), običajno odstopanje \\(\\pm\\,0{,}0519\\); \\(n=10000\\): ocena \\(3{,}1332\\), običajno odstopanje \\(\\pm\\,0{,}0164\\).',
            'Seed \\(42\\): \\(n=1000\\): \\(779\\) in the circle, estimate \\(3.116\\), typical deviation \\(\\pm\\,0.0519\\); \\(n=10000\\): estimate \\(3.1332\\), typical deviation \\(\\pm\\,0.0164\\).',
        )],
        scene: randomScene('rs3-error-scale-scene', RS3_ERROR_SCALE,
            'Točke v kvadratu, seme \\(42\\), \\(100\\) točk, vse prikazane: ocena \\(3{,}04\\), običajno odstopanje \\(\\pm\\,0{,}1642\\).',
            'Points in the square, seed \\(42\\), \\(100\\) points, all shown: estimate \\(3.04\\), typical deviation \\(\\pm\\,0.1642\\).'),
    }),
    step({
        id: 'rs3-replay-seeds', order: 4,
        title: text('Ponovitev in druga semena', 'Replay and other seeds'),
        purpose: text('Napovedati, da isto seme da isti zagon, drugo seme pa oceno, ki se od prave vrednosti razlikuje za približno običajno odstopanje.', 'Predicting that the same seed gives the same run and another seed gives an estimate that is off by about the typical deviation.'),
        explanation: text(
            'Od \\(100\\) do \\(10000\\) točk je \\(100\\)-krat več točk, običajno odstopanje pa je \\(10\\)-krat manjše: \\(0{,}1642\\) in \\(0{,}0164\\) (pri \\(1000\\) točkah je \\(0{,}0519\\), to je \\(\\sqrt{10}\\)-krat manj kot pri \\(100\\)). Ena decimalka več natančnosti torej zahteva približno \\(100\\)-krat več točk, zato je Monte Carlo slab način za izračun števila \\(\\pi\\). Metoda Monte Carlo, ocenjevanje z naključnimi poskusi, je uporabna za območja, za katera formule za ploščino ni. Zdaj je prikazan zagon s semenom \\(42\\) in \\(10000\\) točkami: ocena \\(3{,}1332\\).',
            'From \\(100\\) to \\(10000\\) points is \\(100\\) times as many points, and the typical deviation is \\(10\\) times smaller: \\(0.1642\\) and \\(0.0164\\) (with \\(1000\\) points it is \\(0.0519\\), which is \\(\\sqrt{10}\\) times smaller than with \\(100\\)). One more decimal digit of accuracy therefore costs about \\(100\\) times as many points, which is why Monte Carlo is a poor way to compute \\(\\pi\\). The Monte Carlo method, estimating by random trials, is useful for regions with no formula for the area. A run with seed \\(42\\) and \\(10000\\) points is shown now: estimate \\(3.1332\\).',
        ),
        formulaIds: [],
        observationPrompt: text(
            'Napovej, ali bodo po ponovitvi z istim semenom odčitki enaki: pritisni Ponovi, nato Predvajaj in počakaj, da Prikazano pokaže \\(10000\\) od \\(10000\\). Nato napovej, za koliko se bo ocena z drugim semenom razlikovala od \\(\\pi\\) (primerjaj z odstopanjem \\(\\pm\\,0{,}0164\\)), v polju Seme generatorja vpiši \\(7\\) in primerjaj; nazadnje poskusi še \\(43\\).',
            'Predict whether the readouts will be the same after a replay with the same seed: press Replay, then Play, and wait until Shown reads \\(10000\\) of \\(10000\\). Then predict how far the estimate with another seed will be from \\(\\pi\\) (compare with the deviation \\(\\pm\\,0.0164\\)), type \\(7\\) in the field Generator seed and compare; finally try \\(43\\).',
        ),
        expectedObservations: [text(
            'Po ponovitvi s semenom \\(42\\) isti odčitki (\\(7833\\), \\(3{,}1332\\)). Seme \\(7\\): \\(7858\\) v krogu, ocena \\(3{,}1432\\), napaka \\(+0{,}0016\\). Seme \\(43\\): \\(7741\\), ocena \\(3{,}0964\\), napaka \\(-0{,}0452\\), približno \\(2{,}8\\)-kratnik običajnega odstopanja.',
            'After a replay with seed \\(42\\) the same readouts (\\(7833\\), \\(3.1332\\)). Seed \\(7\\): \\(7858\\) in the circle, estimate \\(3.1432\\), error \\(+0.0016\\). Seed \\(43\\): \\(7741\\), estimate \\(3.0964\\), error \\(-0.0452\\), about \\(2.8\\) times the typical deviation.',
        )],
        scene: randomScene('rs3-replay-seeds-scene', RS3_TEN_THOUSAND_POINTS,
            'Točke v kvadratu, seme \\(42\\), \\(10000\\) točk, vse prikazane: \\(7833\\) v krogu, ocena \\(3{,}1332\\), napaka \\(-0{,}0084\\), običajno odstopanje \\(\\pm\\,0{,}0164\\).',
            'Points in the square, seed \\(42\\), \\(10000\\) points, all shown: \\(7833\\) in the circle, estimate \\(3.1332\\), error \\(-0.0084\\), typical deviation \\(\\pm\\,0.0164\\).'),
    }),
    step({
        id: 'rs3-whole-circle', order: 5,
        title: text('Cel krog v kvadratu', 'A whole circle in a square'),
        purpose: text('Iz ploščin napovedati, kaj se zgodi z deležem točk v krogu, če oblika postane cel krog.', 'Predicting from areas what happens to the share of points in the circle when the shape becomes a whole circle.'),
        explanation: text(
            'Zagon s semenom \\(42\\) in \\(1000\\) točkami: \\(779\\) točk je v krogu, ocena je \\(3{,}116\\), napaka \\(-0{,}0256\\). V prejšnjem koraku je seme \\(7\\) dalo oceno \\(3{,}1432\\), seme \\(43\\) pa \\(3{,}0964\\) z napako \\(-0{,}0452\\), približno \\(2{,}8\\)-kratnikom običajnega odstopanja: tako oddaljeni zagoni so redki, a se zgodijo, in niso napaka grafa. Isto idejo lahko uporabimo za cel krog s polmerom \\(1\\), ki leži v kvadratu s stranico \\(2\\) (ploščina kvadrata je \\(4\\)).',
            'A run with seed \\(42\\) and \\(1000\\) points: \\(779\\) points are in the circle, the estimate is \\(3.116\\), the error \\(-0.0256\\). In the previous step seed \\(7\\) gave the estimate \\(3.1432\\) and seed \\(43\\) gave \\(3.0964\\) with the error \\(-0.0452\\), about \\(2.8\\) times the typical deviation: runs that far off are rare, but they happen, and they are no error of the graph. The same idea works for a whole circle with radius \\(1\\) lying in a square with side \\(2\\) (the area of the square is \\(4\\)).',
        ),
        formulaIds: [],
        observationPrompt: text(
            'Iz ploščin kroga in kvadrata s stranico \\(2\\) napovej, kolikšen delež točk bo v krogu in kaj se bo zgodilo z odčitki Točk v krogu in Ocena števila \\(\\pi\\); zapiši razlog. Nato pri Oblika izberi Cel krog v kvadratu, primerjaj in preberi podnapis grafa.',
            'From the areas of the circle and of the square with side \\(2\\) predict what share of the points will be in the circle and what will happen to the readouts Points in the circle and Estimate of \\(\\pi\\); write down the reason. Then choose Whole circle in a square at Shape, compare and read the caption of the graph.',
        ),
        expectedObservations: [text(
            'Seme \\(42\\), \\(1000\\) točk, cel krog: isti odčitki kot pri četrtini (\\(779\\) v krogu, ocena \\(3{,}116\\), običajno odstopanje \\(\\pm\\,0{,}0519\\)); podnapis pove, da je ista vzorčna četrtina zrcaljena v štiri četrtine.',
            'Seed \\(42\\), \\(1000\\) points, whole circle: the same readouts as for the quarter (\\(779\\) in the circle, estimate \\(3.116\\), typical deviation \\(\\pm\\,0.0519\\)); the caption says the same sample quarter is mirrored into four quarters.',
        )],
        scene: randomScene('rs3-whole-circle-scene', RS3_WHOLE_CIRCLE_START,
            'Točke v kvadratu, četrtina kroga, seme \\(42\\), \\(1000\\) točk, vse prikazane: \\(779\\) v krogu, ocena \\(3{,}116\\), napaka \\(-0{,}0256\\), običajno odstopanje \\(\\pm\\,0{,}0519\\).',
            'Points in the square, quarter circle, seed \\(42\\), \\(1000\\) points, all shown: \\(779\\) in the circle, estimate \\(3.116\\), error \\(-0.0256\\), typical deviation \\(\\pm\\,0.0519\\).'),
    }),
    step({
        id: 'rs3-explore', order: 6,
        title: text('Raziskovanje', 'Free exploration'),
        purpose: text('Sam preizkusiti semena, število točk in obliko ter pred vsako spremembo napovedati odčitek.', 'Trying seeds, numbers of points and the shape yourself and predicting a readout before each change.'),
        explanation: text(
            'Pri celem krogu je ploščina kroga \\(\\pi\\), ploščina kvadrata \\(4\\), razmerje je spet \\(\\tfrac\\pi4\\), zato se delež ne spremeni. Odčitki so v prejšnjem koraku ostali enaki zato, ker graf zrcali isto vzorčno četrtino v štiri četrtine, torej ni novih neodvisnih točk; da je delež \\(\\tfrac\\pi4\\), povesta ploščina in simetrija, ne enakost odčitkov. Prikazano je seme \\(7\\), \\(1000\\) točk, cel krog: \\(774\\) točk v krogu, ocena \\(3{,}096\\), napaka \\(-0{,}0456\\), običajno odstopanje \\(\\pm\\,0{,}0519\\). Pred vsako spremembo napovej odčitek in primerjaj. Graf ponuja le obliki z znano ploščino, da lahko oceno primerjaš s pravo vrednostjo; Monte Carlo pa je uporaben tam, kjer take vrednosti ni.',
            'For a whole circle the area of the circle is \\(\\pi\\), the area of the square is \\(4\\), the ratio is again \\(\\tfrac\\pi4\\), so the share does not change. The readouts stayed the same in the previous step because the graph mirrors the same sample quarter into four quarters, so there are no new independent points; that the share is \\(\\tfrac\\pi4\\) is told by area and symmetry, not by the equal readouts. Seed \\(7\\), \\(1000\\) points, whole circle is shown: \\(774\\) points in the circle, estimate \\(3.096\\), error \\(-0.0456\\), typical deviation \\(\\pm\\,0.0519\\). Before each change predict a readout and compare. The graph offers only shapes with a known area so that you can compare the estimate with the true value; Monte Carlo is useful where there is no such value.',
        ),
        formulaIds: [],
        observationPrompt: text(
            'Spreminjaj seme, število točk in obliko; pred vsako spremembo napovej Običajno odstopanje ocene in približno napako ter primerjaj z odčitkoma.',
            'Change the seed, the number of points and the shape; before each change predict the Typical deviation of the estimate and roughly the error, and compare with the readouts.',
        ),
        expectedObservations: [text(
            'Seme \\(7\\), \\(1000\\) točk, cel krog: \\(774\\) v krogu, delež \\(0{,}774\\), ocena \\(3{,}096\\), napaka \\(-0{,}0456\\), običajno odstopanje \\(\\pm\\,0{,}0519\\).',
            'Seed \\(7\\), \\(1000\\) points, whole circle: \\(774\\) in the circle, share \\(0.774\\), estimate \\(3.096\\), error \\(-0.0456\\), typical deviation \\(\\pm\\,0.0519\\).',
        )],
        scene: randomScene('rs3-explore-scene', RS3_EXPLORE,
            'Točke v kvadratu, cel krog, seme \\(7\\), \\(1000\\) točk: \\(774\\) v krogu, delež \\(0{,}774\\), ocena \\(3{,}096\\), napaka \\(-0{,}0456\\), običajno odstopanje \\(\\pm\\,0{,}0519\\).',
            'Points in the square, whole circle, seed \\(7\\), \\(1000\\) points: \\(774\\) in the circle, share \\(0.774\\), estimate \\(3.096\\), error \\(-0.0456\\), typical deviation \\(\\pm\\,0.0519\\).'),
    }),
];

const sources: GuidedLesson['sources'] = [
    {
        id: 'bezeg-randomness-implementation',
        citation: 'Bezeg source: src/random/ (generator, runners, exact comparators, state model) and src/graphs/random/SimulationGraph.tsx.',
        implementationCorrespondence: 'A scene sets the area mode, the run fields (seed, number of points, shape) and the playback position of the simulation graph; every simulated count is a readout of that graph for the stated seed (integer counts, exact: the inside test is integer arithmetic), and the estimate, the error and the typical deviation are computed in double precision, so quoted decimals are approximate.',
    },
];

export const rs3Lesson: GuidedLesson = {
    demonstrationId: 'prob-simulation',
    title: text('Monte Carlo: ploščina in število \\(\\pi\\)', 'Monte Carlo: area and the number \\(\\pi\\)'),
    summary: text(
        'Naključne točke v enotskem kvadratu: delež točk v četrtini kroga ocenjuje \\(\\tfrac\\pi4\\), štirikratnik deleža pa število \\(\\pi\\). Ploščine povedo, kaj ocenjujemo, točna formula pove, kako daleč je ocena običajno od prave vrednosti; zagon s točkami je ponazoritev.',
        'Random points in the unit square: the share of points in a quarter circle estimates \\(\\tfrac\\pi4\\), and four times the share estimates \\(\\pi\\). Areas say what is estimated, an exact formula says how far the estimate usually is from the true value; a run of points is an illustration.',
    ),
    prerequisites: [text('Ploščina kroga in kvadrata; verjetnost kot razmerje ploščin.', 'The area of a circle and of a square; probability as a ratio of areas.')],
    learningGoals: [
        text('Znaš iz ploščin izračunati verjetnost, da točka pade v četrtino kroga, in iz deleža točk oceniti \\(\\pi\\).', 'Can compute from areas the chance that a point lands in a quarter circle, and estimate \\(\\pi\\) from the share of points.'),
        text('Veš, da je običajno odstopanje ocene \\(4\\sqrt{p(1-p)/n}\\) in da \\(100\\)-krat več točk to odstopanje zmanjša \\(10\\)-krat.', 'Know that the typical deviation of the estimate is \\(4\\sqrt{p(1-p)/n}\\) and that \\(100\\) times as many points make it \\(10\\) times smaller.'),
        text('Veš, da je Monte Carlo slab način za izračun števila \\(\\pi\\) in da je uporaben za območja brez formule za ploščino; zagon z istim semenom je enak, drugo seme da drugačno oceno.', 'Know that Monte Carlo is a poor way to compute \\(\\pi\\) and that it is useful for regions without an area formula; a run with the same seed is the same, another seed gives another estimate.'),
    ],
    formulaBlocks: rs3Formulas,
    workedExamples: rs3Examples,
    steps: rs3Steps,
    sources,
    edgeCases: [
        text('Pri \\(n=1\\) je ocena \\(0\\) ali \\(4\\); običajno odstopanje je tam večje od \\(1\\), zato ocena nič ne pove.', 'With \\(n=1\\) the estimate is \\(0\\) or \\(4\\); the typical deviation is larger than \\(1\\) there, so the estimate says nothing.'),
        text('Narisanih je največ \\(300\\) točk, odčitki pa štejejo vse točke zagona. Pri celem krogu je narisana ista vzorčna četrtina, zrcaljena v štiri četrtine.', 'At most \\(300\\) points are drawn, while the readouts count all the points of the run. For the whole circle the same sample quarter is drawn, mirrored into four quarters.'),
        text('Pri \\(100\\) točkah seme \\(43\\) da isto število točk v krogu kot seme \\(42\\); ocene iz enega zagona niso dokaz vrednosti \\(\\pi\\). Odčitki ocene, napake in odstopanja so decimalni in približni, števila točk so cela.', 'With \\(100\\) points seed \\(43\\) gives the same number of points in the circle as seed \\(42\\); estimates from one run are no proof of the value of \\(\\pi\\). The readouts of the estimate, the error and the deviation are decimals and approximate, the point counts are whole numbers.'),
    ],
    unresolvedQuestions: [],
};
