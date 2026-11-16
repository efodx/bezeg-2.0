/**
 * Guided lesson RS4 of the randomness family (docs/specs/randomness-simulation-lessons.md): the random walk and the root of n, on `prob-simulation` (SimulationGraph).
 * Scenes use the `random` actions of `randomnessSceneActions` (randomnessGuidedLessons.ts) and every scene starts from the Demonstration default and names what it sets
 * (the walk mode, the run fields, the playback position). The exact standard deviation sqrt(n) of the position (variances of independent steps add), the exact probability
 * of ending at 0 and the exact law (a shifted binomial, drawn dashed behind the histogram) are the arguments; the walks and the statistics of one run are the illustration,
 * always stated as the result of one run with its seed. Every number the text quotes is a readout of the graph for that scene (probe: .command-logs/rand-b/probe.txt and
 * probe2-rs4.txt), arithmetic stated in the text, or a value the learner reads after an action the text asks for; the numbers are listed per step in
 * docs/reviews/feature-streams/families-prep/notes/f3-rand-b.md. The steps are predict-then-make: the opening shows a different state from the one the prompt asks the
 * learner to produce, and the result of a step is stated in the explanation of the next one.
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

/** RS4: seed 42 and 100 steps per walk are the Demonstration default of the walk mode; the steps differ in the number of walks, the playback position and (the exploration) seed and steps. */
export const RS4_ONE_WALK_NOT_DRAWN = {mode: 'walk', run: {n: 1}, position: 0} as const;
export const RS4_ONE_WALK = {mode: 'walk', run: {n: 1}} as const;
export const RS4_TEN_WALKS = {mode: 'walk', run: {n: 10}} as const;
export const RS4_PARITY_START = {mode: 'walk', run: {n: 1000}} as const;
export const RS4_DOUBLING_START = {mode: 'walk', run: {n: 1000}} as const;
export const RS4_EXPLORE = {mode: 'walk', run: {seed: 7, n: 1000, walkSteps: 400}} as const;

const rs4Formulas: readonly FormulaBlock[] = [
    {
        id: 'walk-sqrt',
        latex: 'S_n=X_1+X_2+\\dots+X_n,\\qquad \\operatorname{Var}(S_n)=n,\\qquad \\sigma_{S_n}=\\sqrt n',
        notation: text(
            '\\(X_i\\) je \\(i\\)-ti korak, \\(+1\\) ali \\(-1\\), vsak z verjetnostjo \\(\\tfrac12\\) in neodvisen od drugih, \\(S_n\\) položaj po \\(n\\) korakih, \\(\\operatorname{Var}\\) varianca in \\(\\sigma_{S_n}\\) standardni odklon položaja.',
            '\\(X_i\\) is the \\(i\\)-th step, \\(+1\\) or \\(-1\\), each with chance \\(\\tfrac12\\) and independent of the others, \\(S_n\\) the position after \\(n\\) steps, \\(\\operatorname{Var}\\) the variance and \\(\\sigma_{S_n}\\) the standard deviation of the position.',
        ),
        explanation: text(
            'Vsak korak ima povprečje \\(0\\) in varianco \\(1\\) (\\(X_i^2=1\\)). Variance neodvisnih spremenljivk se seštevajo, zato ima položaj \\(S_n\\) povprečje \\(0\\) in varianco \\(n\\), torej standardni odklon \\(\\sqrt n\\), ne \\(n\\). Vrednost je izračunana, ne izmerjena; koren povprečja kvadratov položaja po več sprehodih jo ocenjuje, ker je povprečje položaja \\(0\\).',
            'Each step has mean \\(0\\) and variance \\(1\\) (\\(X_i^2=1\\)). The variances of independent variables add, so the position \\(S_n\\) has mean \\(0\\) and variance \\(n\\), hence standard deviation \\(\\sqrt n\\), not \\(n\\). The value is computed, not measured; the root mean square position over many walks estimates it, because the mean position is \\(0\\).',
        ),
    },
    {
        id: 'walk-law',
        latex: 'S_n=2K-n,\\quad K\\sim\\operatorname{Bin}\\!\\left(n,\\tfrac12\\right),\\qquad P(S_n=2k-n)=\\binom{n}{k}2^{-n}',
        notation: text(
            '\\(K\\) je število korakov \\(+1\\) med \\(n\\) koraki, \\(\\operatorname{Bin}\\) binomska porazdelitev, \\(k\\) možna vrednost števila \\(K\\) in \\(\\binom nk\\) število zaporedij korakov z \\(k\\) koraki \\(+1\\).',
            '\\(K\\) is the number of steps \\(+1\\) among the \\(n\\) steps, \\(\\operatorname{Bin}\\) the binomial distribution, \\(k\\) a possible value of \\(K\\) and \\(\\binom nk\\) the number of sequences of steps with \\(k\\) steps \\(+1\\).',
        ),
        explanation: text(
            'Če je med \\(n\\) koraki \\(k\\) korakov \\(+1\\), je položaj \\(k-(n-k)=2k-n\\). Vseh \\(2^n\\) zaporedij korakov je enako verjetnih, \\(k\\) korakov \\(+1\\) pa ima natanko \\(\\binom nk\\) zaporedij; to je binomska porazdelitev, premaknjena in raztegnjena v položaje \\(2k-n\\). Konec je pri \\(0\\), ko je \\(2k-n=0\\), to je \\(k=\\tfrac n2\\). Stolpci zakona v grafu so ta števila.',
            'If among \\(n\\) steps there are \\(k\\) steps \\(+1\\), the position is \\(k-(n-k)=2k-n\\). All \\(2^n\\) sequences of steps are equally likely and exactly \\(\\binom nk\\) of them have \\(k\\) steps \\(+1\\); this is the binomial distribution, shifted and stretched onto the positions \\(2k-n\\). The end is at \\(0\\) when \\(2k-n=0\\), that is \\(k=\\tfrac n2\\). The bars of the law in the graph are these numbers.',
        ),
    },
];

const rs4Examples: readonly WorkedExample[] = [
    {
        id: 'rs4-zero',
        title: text('Konec pri \\(0\\) po \\(100\\) korakih', 'Ending at \\(0\\) after \\(100\\) steps'),
        calculationLatex: 'P(S_{100}=0)=\\binom{100}{50}2^{-100}\\approx0{,}0796,\\qquad 1000\\cdot0{,}0796\\approx79{,}6,\\qquad \\sqrt{1000\\cdot0{,}0796\\cdot0{,}9204}\\approx8{,}6',
        resultLatex: 'N_0\\approx79{,}6\\pm8{,}6',
        check: text(
            'Odčitek Sprehodov, ki se končajo v izhodišču stoji pri \\(1000\\) sprehodih s \\(100\\) koraki ob pričakovani vrednosti \\(79{,}6\\) (izračunani iz \\(P(S_{100}=0)\\), ne izmerjeni). Število takih sprehodov je med sprehodi neodvisno, zato je binomsko z odklonom približno \\(8{,}6\\): zagon običajno zgreši pričakovano vrednost za nekaj enot, ne pade natanko nanjo.',
            'The readout Walks ending at the origin, with \\(1000\\) walks of \\(100\\) steps, stands beside the expected value \\(79.6\\) (computed from \\(P(S_{100}=0)\\), not measured). The walks are independent, so the number of such walks is binomial with a deviation of about \\(8.6\\): a run usually misses the expected value by a few units, it does not land exactly on it.',
        ),
    },
];

const rs4Steps: readonly GuidedLessonStep[] = [
    step({
        id: 'rs4-one-walk', order: 1,
        title: text('En sprehod', 'One walk'),
        purpose: text('Napovedati, kje se konča en sprehod s \\(100\\) koraki, preden se nariše.', 'Predicting where one walk of \\(100\\) steps ends before it is drawn.'),
        explanation: text(
            'Slučajni sprehod: sprehajalec začne pri \\(0\\) na številski premici in v vsakem koraku skoči za \\(+1\\) ali \\(-1\\), vsako z verjetnostjo \\(\\tfrac12\\), neodvisno od prejšnjih korakov. Sprehod ima \\(100\\) korakov. Če bi bili vsi koraki \\(+1\\), bi sprehod končal pri \\(100\\), če bi bili vsi \\(-1\\), pri \\(-100\\). Nastavljeno je seme \\(42\\) (seme generatorja je število, ki določi celoten naključni potek), število sprehodov je \\(1\\) in nobeden še ni narisan, zato so odčitki sprehoda \\(0\\).',
            'A random walk: the walker starts at \\(0\\) on a number line and in every step jumps by \\(+1\\) or \\(-1\\), each with chance \\(\\tfrac12\\), independently of the earlier steps. A walk has \\(100\\) steps. If all steps were \\(+1\\) the walk would end at \\(100\\), if all were \\(-1\\), at \\(-100\\). The seed is \\(42\\) (the generator seed is a number that fixes the whole random course), the number of walks is \\(1\\) and none is drawn yet, so the readouts of the walk are \\(0\\).',
        ),
        formulaIds: [],
        observationPrompt: text(
            'Napovej, kje bo končal sprehod s \\(100\\) koraki: blizu \\(\\pm100\\), blizu \\(0\\) ali kje vmes. Zapiši približen končni položaj in razlog. Nato pritisni Predvajaj (ali Naslednji korak) in primerjaj napoved z narisanim sprehodom in z odčitkom Povprečje razdalje od izhodišča, ki je pri enem sprehodu razdalja njegovega konca od \\(0\\).',
            'Predict where the walk of \\(100\\) steps will end: near \\(\\pm100\\), near \\(0\\) or somewhere in between. Write down an approximate end position and the reason. Then press Play (or Next step) and compare your prediction with the drawn walk and with the readout Mean distance from the origin, which for one walk is the distance of its end from \\(0\\).',
        ),
        expectedObservations: [text(
            'Seme \\(42\\), \\(1\\) sprehod: konča pri \\(+10\\); Povprečje razdalje od izhodišča \\(10\\), Koren povprečja kvadratov položaja \\(10\\), Sprehodov, ki se končajo v izhodišču \\(0\\).',
            'Seed \\(42\\), \\(1\\) walk: it ends at \\(+10\\); Mean distance from the origin \\(10\\), Root mean square position \\(10\\), Walks ending at the origin \\(0\\).',
        )],
        scene: randomScene('rs4-one-walk-scene', RS4_ONE_WALK_NOT_DRAWN,
            'Slučajni sprehod, seme \\(42\\), \\(100\\) korakov, \\(1\\) sprehod, nobeden še ni narisan: Prikazano \\(0\\) od \\(1\\), odčitki sprehoda so \\(0\\).',
            'Random walk, seed \\(42\\), \\(100\\) steps, \\(1\\) walk, none drawn yet: Shown \\(0\\) of \\(1\\), the readouts of the walk are \\(0\\).'),
    }),
    step({
        id: 'rs4-ten-walks', order: 2,
        title: text('Deset sprehodov', 'Ten walks'),
        purpose: text('Napovedati, kako se razpršijo konci desetih sprehodov, in jih primerjati z narisanimi sprehodi.', 'Predicting how the ends of ten walks spread and comparing them with the drawn walks.'),
        explanation: text(
            'Zdaj je narisan en sprehod (seme \\(42\\)): konča pri \\(+10\\), odčitek Povprečje razdalje od izhodišča je \\(10\\). To je en zagon z enim semenom in nič več: z drugimi koraki bi sprehod končal drugje. Da vidimo, kaj je za sprehode običajno, jih potrebujemo več, vse s \\(100\\) koraki. Graf nariše prvih nekaj sprehodov (ponazoritev; podnapis Narisani prvi sprehodi), odčitki pa štejejo vse sprehode zagona. Prekinjeni črti Običajna širina sprehodov sta narisani že zdaj; njun pomen razložimo v naslednjem koraku. Tudi vrednosti po zakonu ob odčitkih so izračunane primerjave, ne izid zagona; zato napoved najprej zapiši in jo šele nato primerjaj.',
            'One walk is drawn now (seed \\(42\\)): it ends at \\(+10\\), the readout Mean distance from the origin is \\(10\\). This is one run with one seed and nothing more: with other steps the walk would end elsewhere. To see what is usual for walks we need more of them, all with \\(100\\) steps. The graph draws the first few walks (an illustration; the caption First walks drawn), while the readouts count all the walks of the run. The dashed lines Typical width of the walks are already drawn; their meaning is explained in the next step. The values by the law beside the readouts are computed comparisons too, not the result of the run; so write your prediction down first and only then compare.',
        ),
        formulaIds: [],
        observationPrompt: text(
            'Napovej, kje bo končalo deset sprehodov s \\(100\\) koraki: ali bodo vsi blizu istega položaja, ali bodo razpršeni po vsej širini od \\(-100\\) do \\(100\\) ali kako drugače. Zapiši približen razpon končnih položajev in razlog. Nato v polju Število sprehodov vpiši \\(10\\) in primerjaj z narisanimi sprehodi, s prekinjenima črtama (Običajna širina sprehodov) in z odčitkoma Koren povprečja kvadratov položaja ter Sprehodov, ki se končajo v izhodišču.',
            'Predict where ten walks of \\(100\\) steps will end: will they all be near the same position, spread over the whole width from \\(-100\\) to \\(100\\), or some other way. Write down an approximate range of end positions and the reason. Then type \\(10\\) in the field Number of walks and compare with the drawn walks, with the dashed lines (Typical width of the walks) and with the readouts Root mean square position and Walks ending at the origin.',
        ),
        expectedObservations: [text(
            'Seme \\(42\\), \\(10\\) sprehodov: Koren povprečja kvadratov položaja \\(10{,}68\\), po zakonu \\(10\\); Povprečje razdalje od izhodišča \\(9{,}4\\), po zakonu \\(7{,}9589\\); Sprehodov, ki se končajo v izhodišču \\(0\\), pričakovano \\(0{,}8\\).',
            'Seed \\(42\\), \\(10\\) walks: Root mean square position \\(10.68\\), by the law \\(10\\); Mean distance from the origin \\(9.4\\), by the law \\(7.9589\\); Walks ending at the origin \\(0\\), expected \\(0.8\\).',
        )],
        scene: randomScene('rs4-ten-walks-scene', RS4_ONE_WALK,
            'Slučajni sprehod, seme \\(42\\), \\(100\\) korakov, \\(1\\) sprehod, narisan: Prikazano \\(1\\) od \\(1\\), Povprečje razdalje od izhodišča \\(10\\), po zakonu \\(7{,}9589\\), Koren povprečja kvadratov položaja \\(10\\), po zakonu \\(10\\).',
            'Random walk, seed \\(42\\), \\(100\\) steps, \\(1\\) walk, drawn: Shown \\(1\\) of \\(1\\), Mean distance from the origin \\(10\\), by the law \\(7.9589\\), Root mean square position \\(10\\), by the law \\(10\\).'),
    }),
    step({
        id: 'rs4-law', order: 3,
        title: text('Zakon konca sprehoda', 'The law of where a walk ends'),
        purpose: text('Z računom pojasniti, zakaj je običajna razdalja \\(\\sqrt n\\), in napovedati odčitke pri \\(1000\\) sprehodih.', 'Explaining by calculation why the usual distance is \\(\\sqrt n\\), and predicting the readouts with \\(1000\\) walks.'),
        explanation: text(
            'Deset sprehodov (seme \\(42\\)): Koren povprečja kvadratov položaja je \\(10{,}68\\), Povprečje razdalje od izhodišča \\(9{,}4\\), nobeden ne konča pri \\(0\\). Konci torej niso blizu \\(\\pm100\\), a se razlikujejo. Zakaj, pove račun: konec je vsota \\(100\\) neodvisnih korakov \\(\\pm1\\), vsak ima varianco \\(1\\), variance pa se seštevajo, zato ima konec varianco \\(100\\) in standardni odklon \\(\\sqrt{100}=10\\); po \\(n\\) korakih je odklon \\(\\sqrt n\\). Prekinjeni črti Običajna širina sprehodov sta \\(\\pm\\sqrt k\\) po \\(k\\) korakih, narisani iz tega točnega odklona. Prav tako je točen zakon konca: konec je \\(2K-n\\), kjer je \\(K\\) število korakov \\(+1\\) in je \\(K\\) binomsko; ta zakon je v grafu narisan prekinjeno (Pričakovano po zakonu) za histogramom (Kje se sprehodi končajo). Argument sta račun in zakon, sprehodi so ponazoritev. Odklon \\(\\sqrt n\\) je koren povprečja kvadratov položaja; povprečna razdalja od izhodišča je manjša, po zakonu \\(7{,}9589\\) pri \\(100\\) korakih, približno \\(\\sqrt{2n/\\pi}\\approx0{,}8\\sqrt n\\).',
            'Ten walks (seed \\(42\\)): Root mean square position is \\(10.68\\), Mean distance from the origin \\(9.4\\), and none ends at \\(0\\). So the ends are not near \\(\\pm100\\), yet they differ. A calculation says why: the end is a sum of \\(100\\) independent steps \\(\\pm1\\), each has variance \\(1\\), and variances add, so the end has variance \\(100\\) and standard deviation \\(\\sqrt{100}=10\\); after \\(n\\) steps the deviation is \\(\\sqrt n\\). The dashed lines Typical width of the walks are \\(\\pm\\sqrt k\\) after \\(k\\) steps, drawn from this exact deviation. The law of the end is exact as well: the end is \\(2K-n\\), where \\(K\\) is the number of steps \\(+1\\) and \\(K\\) is binomial; this law is drawn dashed (Expected by the law) behind the histogram (Where the walks end). The argument is the calculation and the law, the walks are the illustration. The deviation \\(\\sqrt n\\) is the root mean square position; the mean distance from the origin is smaller, by the law \\(7.9589\\) at \\(100\\) steps, about \\(\\sqrt{2n/\\pi}\\approx0.8\\sqrt n\\).',
        ),
        formulaIds: ['walk-sqrt', 'walk-law'],
        observationPrompt: text(
            'Iz zakona konca napovej, koliko od \\(1000\\) sprehodov se bo približno končalo pri \\(0\\), in ali bo Koren povprečja kvadratov položaja natanko \\(10\\) ali le blizu \\(10\\); zapiši napoved in razlog. Nato v polju Število sprehodov vpiši \\(1000\\) in primerjaj z odčitki Koren povprečja kvadratov položaja, Povprečje razdalje od izhodišča in Sprehodov, ki se končajo v izhodišču ter s histogramom proti prekinjenemu zakonu.',
            'From the law of the end predict about how many of \\(1000\\) walks will end at \\(0\\), and whether the Root mean square position will be exactly \\(10\\) or only near \\(10\\); write down the prediction and the reason. Then type \\(1000\\) in the field Number of walks and compare with the readouts Root mean square position, Mean distance from the origin and Walks ending at the origin, and the histogram with the dashed law.',
        ),
        expectedObservations: [text(
            'Seme \\(42\\), \\(1000\\) sprehodov po \\(100\\) korakov: Koren povprečja kvadratov položaja \\(10{,}31\\), po zakonu \\(10\\); Povprečje razdalje od izhodišča \\(8{,}218\\), po zakonu \\(7{,}9589\\); Sprehodov, ki se končajo v izhodišču \\(68\\), pričakovano \\(79{,}6\\).',
            'Seed \\(42\\), \\(1000\\) walks of \\(100\\) steps: Root mean square position \\(10.31\\), by the law \\(10\\); Mean distance from the origin \\(8.218\\), by the law \\(7.9589\\); Walks ending at the origin \\(68\\), expected \\(79.6\\).',
        )],
        scene: randomScene('rs4-law-scene', RS4_TEN_WALKS,
            'Slučajni sprehod, seme \\(42\\), \\(100\\) korakov, \\(10\\) sprehodov, vsi prikazani: Koren povprečja kvadratov položaja \\(10{,}68\\), po zakonu \\(10\\); Povprečje razdalje od izhodišča \\(9{,}4\\), po zakonu \\(7{,}9589\\); Sprehodov, ki se končajo v izhodišču \\(0\\), pričakovano \\(0{,}8\\).',
            'Random walk, seed \\(42\\), \\(100\\) steps, \\(10\\) walks, all shown: Root mean square position \\(10.68\\), by the law \\(10\\); Mean distance from the origin \\(9.4\\), by the law \\(7.9589\\); Walks ending at the origin \\(0\\), expected \\(0.8\\).'),
    }),
    step({
        id: 'rs4-parity', order: 4,
        title: text('Sodo in liho število korakov', 'An even and an odd number of steps'),
        purpose: text('Napovedati, koliko sprehodov z lihim številom korakov konča pri \\(0\\).', 'Predicting how many walks with an odd number of steps end at \\(0\\).'),
        explanation: text(
            'Pri \\(1000\\) sprehodih s \\(100\\) koraki (seme \\(42\\)) je Koren povprečja kvadratov položaja \\(10{,}31\\) ob zakonu \\(10\\), Povprečje razdalje od izhodišča \\(8{,}218\\) ob zakonu \\(7{,}9589\\), pri \\(0\\) pa se jih konča \\(68\\) ob pričakovanih \\(79{,}6\\). Ujemanje je dobro, a ni natančno: to je en zagon, razlika do zakona je naključje zagona. Vračanje v izhodišče je pogosto: pri \\(100\\) korakih se približno \\(8\\,\\%\\) sprehodov konča pri \\(0\\) (\\(P\\approx0{,}0796\\)).',
            'With \\(1000\\) walks of \\(100\\) steps (seed \\(42\\)) the Root mean square position is \\(10.31\\) beside the law \\(10\\), the Mean distance from the origin \\(8.218\\) beside the law \\(7.9589\\), and \\(68\\) walks end at \\(0\\) against the expected \\(79.6\\). The agreement is good but not exact: this is one run, the difference from the law is the chance of the run. Returning to the origin is common: with \\(100\\) steps about \\(8\\,\\%\\) of the walks end at \\(0\\) (\\(P\\approx0.0796\\)).',
        ),
        formulaIds: [],
        workedExampleId: 'rs4-zero',
        observationPrompt: text(
            'Napovej, koliko od \\(1000\\) sprehodov bo končalo pri \\(0\\), če ima vsak sprehod \\(99\\) korakov namesto \\(100\\), in zakaj. Nato v polju Korakov na sprehod vpiši \\(99\\) in primerjaj z odčitkom Sprehodov, ki se končajo v izhodišču in s položaji stolpcev histograma.',
            'Predict how many of the \\(1000\\) walks will end at \\(0\\) if each walk has \\(99\\) steps instead of \\(100\\), and why. Then type \\(99\\) in the field Steps per walk and compare with the readout Walks ending at the origin and with the positions of the bars of the histogram.',
        ),
        expectedObservations: [text(
            'Seme \\(42\\), \\(1000\\) sprehodov po \\(99\\) korakov: Koren povprečja kvadratov položaja \\(10{,}15\\), po zakonu \\(9{,}95\\); Povprečje razdalje od izhodišča \\(8{,}19\\), po zakonu \\(7{,}9589\\); Sprehodov, ki se končajo v izhodišču \\(0\\), s pojasnilom, da se pri lihem številu korakov ne morejo končati v izhodišču.',
            'Seed \\(42\\), \\(1000\\) walks of \\(99\\) steps: Root mean square position \\(10.15\\), by the law \\(9.95\\); Mean distance from the origin \\(8.19\\), by the law \\(7.9589\\); Walks ending at the origin \\(0\\), with the note that with an odd number of steps a walk cannot end at the origin.',
        )],
        scene: randomScene('rs4-parity-scene', RS4_PARITY_START,
            'Slučajni sprehod, seme \\(42\\), \\(100\\) korakov, \\(1000\\) sprehodov, vsi prikazani: Koren povprečja kvadratov položaja \\(10{,}31\\), po zakonu \\(10\\); Povprečje razdalje od izhodišča \\(8{,}218\\), po zakonu \\(7{,}9589\\); Sprehodov, ki se končajo v izhodišču \\(68\\), pričakovano \\(79{,}6\\).',
            'Random walk, seed \\(42\\), \\(100\\) steps, \\(1000\\) walks, all shown: Root mean square position \\(10.31\\), by the law \\(10\\); Mean distance from the origin \\(8.218\\), by the law \\(7.9589\\); Walks ending at the origin \\(68\\), expected \\(79.6\\).'),
    }),
    step({
        id: 'rs4-doubling', order: 5,
        title: text('Dvakrat več korakov', 'Twice as many steps'),
        purpose: text('Napovedati koren povprečja kvadratov položaja po \\(200\\) korakih iz zakona \\(\\sqrt n\\) in ga primerjati z zagonom.', 'Predicting the root mean square position after \\(200\\) steps from the law \\(\\sqrt n\\) and comparing it with the run.'),
        explanation: text(
            'Pri \\(99\\) korakih ni nobenega sprehoda s koncem pri \\(0\\) (seme \\(42\\), \\(1000\\) sprehodov). To ni naključje zagona: vsak korak spremeni parnost položaja, zato je po lihem številu korakov položaj lih in \\(0\\) ni mogoč, po sodem številu korakov pa je položaj sod. Koren povprečja kvadratov je pri \\(99\\) korakih \\(10{,}15\\) ob zakonu \\(\\sqrt{99}\\approx9{,}95\\), podobno kot pri \\(100\\) korakih. Spet sta nastavljena \\(100\\) korakov in \\(1000\\) sprehodov, kjer je Koren povprečja kvadratov položaja \\(10{,}31\\) ob zakonu \\(10=\\sqrt{100}\\). Odklon je po \\(n\\) korakih \\(\\sqrt n\\).',
            'With \\(99\\) steps no walk ends at \\(0\\) (seed \\(42\\), \\(1000\\) walks). This is not chance of the run: every step changes the parity of the position, so after an odd number of steps the position is odd and \\(0\\) is impossible, while after an even number of steps the position is even. The Root mean square position with \\(99\\) steps is \\(10.15\\) beside the law \\(\\sqrt{99}\\approx9.95\\), similar to \\(100\\) steps. Again \\(100\\) steps and \\(1000\\) walks are set, where the Root mean square position is \\(10.31\\) beside the law \\(10=\\sqrt{100}\\). The deviation after \\(n\\) steps is \\(\\sqrt n\\).',
        ),
        formulaIds: ['walk-sqrt'],
        observationPrompt: text(
            'Napovej Koren povprečja kvadratov položaja po \\(200\\) korakih namesto \\(100\\): ali bo približno dvakrat večji kot zdaj ali večji za kak drug faktor? Zapiši število in račun. Nato v polju Korakov na sprehod vpiši \\(200\\) in primerjaj z odčitkoma Koren povprečja kvadratov položaja in Povprečje razdalje od izhodišča, vsakim z vrednostjo po zakonu.',
            'Predict the Root mean square position after \\(200\\) steps instead of \\(100\\): will it be about twice as large as now or larger by some other factor? Write down the number and the calculation. Then type \\(200\\) in the field Steps per walk and compare with the readouts Root mean square position and Mean distance from the origin, each with its value by the law.',
        ),
        expectedObservations: [text(
            'Seme \\(42\\), \\(1000\\) sprehodov po \\(200\\) korakov: Koren povprečja kvadratov položaja \\(13{,}78\\), po zakonu \\(14{,}14\\); Povprečje razdalje od izhodišča \\(11{,}086\\), po zakonu \\(11{,}2697\\); Sprehodov, ki se končajo v izhodišču \\(56\\), pričakovano \\(56{,}3\\).',
            'Seed \\(42\\), \\(1000\\) walks of \\(200\\) steps: Root mean square position \\(13.78\\), by the law \\(14.14\\); Mean distance from the origin \\(11.086\\), by the law \\(11.2697\\); Walks ending at the origin \\(56\\), expected \\(56.3\\).',
        )],
        scene: randomScene('rs4-doubling-scene', RS4_DOUBLING_START,
            'Slučajni sprehod, seme \\(42\\), \\(100\\) korakov, \\(1000\\) sprehodov, vsi prikazani: Koren povprečja kvadratov položaja \\(10{,}31\\), po zakonu \\(10\\); Povprečje razdalje od izhodišča \\(8{,}218\\), po zakonu \\(7{,}9589\\).',
            'Random walk, seed \\(42\\), \\(100\\) steps, \\(1000\\) walks, all shown: Root mean square position \\(10.31\\), by the law \\(10\\); Mean distance from the origin \\(8.218\\), by the law \\(7.9589\\).'),
    }),
    step({
        id: 'rs4-explore', order: 6,
        title: text('Preizkušaj sam', 'Explore on your own'),
        purpose: text('Prosto raziskovanje z napovedjo po zakonu \\(\\sqrt n\\) pri drugih semenih, številih korakov in sprehodov.', 'Free exploration with a prediction from the law \\(\\sqrt n\\) for other seeds, numbers of steps and walks.'),
        explanation: text(
            'Pri \\(200\\) korakih (seme \\(42\\), \\(1000\\) sprehodov) je Koren povprečja kvadratov položaja \\(13{,}78\\) ob zakonu \\(10\\sqrt2\\approx14{,}14\\), Povprečje razdalje od izhodišča \\(11{,}086\\) ob zakonu \\(11{,}2697\\). Razmerje v tem zagonu \\(\\tfrac{13{,}78}{10{,}31}\\approx1{,}34\\) je manjše od \\(\\sqrt2\\approx1{,}41\\): števili sta izmerjeni in se od zakona razlikujeta zaradi naključja zagona. Razmerje zakona je točno \\(\\tfrac{\\sqrt{200}}{\\sqrt{100}}=\\sqrt2\\), ne \\(2\\): dvakrat več korakov razširi običajno razdaljo \\(\\sqrt2\\)-krat. Zdaj je nastavljeno seme \\(7\\), \\(400\\) korakov in \\(1000\\) sprehodov.',
            'With \\(200\\) steps (seed \\(42\\), \\(1000\\) walks) the Root mean square position is \\(13.78\\) beside the law \\(10\\sqrt2\\approx14.14\\), the Mean distance from the origin \\(11.086\\) beside the law \\(11.2697\\). The ratio in this run \\(\\tfrac{13.78}{10.31}\\approx1.34\\) is smaller than \\(\\sqrt2\\approx1.41\\): the numbers are measured and differ from the law by the chance of the run. The ratio of the law is exactly \\(\\tfrac{\\sqrt{200}}{\\sqrt{100}}=\\sqrt2\\), not \\(2\\): twice as many steps widen the usual distance \\(\\sqrt2\\) times. Now the seed \\(7\\), \\(400\\) steps and \\(1000\\) walks are set.',
        ),
        formulaIds: ['walk-sqrt', 'walk-law'],
        observationPrompt: text(
            'Preizkušaj sam. Nastavljeno je seme \\(7\\), \\(400\\) korakov in \\(1000\\) sprehodov; odčitek Koren povprečja kvadratov položaja je \\(18{,}99\\) ob zakonu \\(20=\\sqrt{400}\\). Spreminjaj Seme generatorja, Korakov na sprehod in Število sprehodov; za vsako nastavitev najprej napovej odčitek iz \\(\\sqrt n\\), nato ga preveri. Opazuj, da je odčitek v enem zagonu blizu zakona, a se od njega razlikuje, in da konci sprehodov sledijo prekinjenemu zakonu.',
            'Explore on your own. The seed \\(7\\), \\(400\\) steps and \\(1000\\) walks are set; the readout Root mean square position is \\(18.99\\) beside the law \\(20=\\sqrt{400}\\). Change Generator seed, Steps per walk and Number of walks; for each setting first predict the readout from \\(\\sqrt n\\), then check it. Watch that in one run the readout is near the law yet differs from it, and that the ends of the walks follow the dashed law.',
        ),
        expectedObservations: [text(
            'Seme \\(7\\), \\(1000\\) sprehodov po \\(400\\) korakov: Koren povprečja kvadratov položaja \\(18{,}99\\), po zakonu \\(20\\); Povprečje razdalje od izhodišča \\(15{,}174\\), po zakonu \\(15{,}9477\\); Sprehodov, ki se končajo v izhodišču \\(45\\), pričakovano \\(39{,}9\\).',
            'Seed \\(7\\), \\(1000\\) walks of \\(400\\) steps: Root mean square position \\(18.99\\), by the law \\(20\\); Mean distance from the origin \\(15.174\\), by the law \\(15.9477\\); Walks ending at the origin \\(45\\), expected \\(39.9\\).',
        )],
        scene: randomScene('rs4-explore-scene', RS4_EXPLORE,
            'Slučajni sprehod, seme \\(7\\), \\(400\\) korakov, \\(1000\\) sprehodov, vsi prikazani: Koren povprečja kvadratov položaja \\(18{,}99\\), po zakonu \\(20\\); Povprečje razdalje od izhodišča \\(15{,}174\\), po zakonu \\(15{,}9477\\); Sprehodov, ki se končajo v izhodišču \\(45\\), pričakovano \\(39{,}9\\).',
            'Random walk, seed \\(7\\), \\(400\\) steps, \\(1000\\) walks, all shown: Root mean square position \\(18.99\\), by the law \\(20\\); Mean distance from the origin \\(15.174\\), by the law \\(15.9477\\); Walks ending at the origin \\(45\\), expected \\(39.9\\).'),
    }),
];

const sources: GuidedLesson['sources'] = [
    {
        id: 'bezeg-randomness-implementation',
        citation: 'Bezeg source: src/random/ (generator, runners, exact comparators, state model) and src/graphs/random/SimulationGraph.tsx.',
        implementationCorrespondence: 'A scene sets the walk mode, the run fields (seed, number of walks, steps per walk) and the playback position of the simulation graph; every simulated count is a readout of that graph for the stated seed (integer counts, exact), the root mean square and the mean distance are computed in double precision from the end positions, and the values by the law (the root of the number of steps, the mean distance, the expected number of walks ending at the origin, the dashed histogram) are exact comparators computed from the shifted binomial law, so quoted decimals are approximate.',
    },
];

export const rs4Lesson: GuidedLesson = {
    demonstrationId: 'prob-simulation',
    title: text('Slučajni sprehod in \\(\\sqrt n\\)', 'The random walk and \\(\\sqrt n\\)'),
    summary: text(
        'Slučajni sprehod s koraki \\(+1\\) in \\(-1\\): kako daleč od izhodišča pride sprehajalec po \\(n\\) korakih in kako pogosto se vrne vanj. Točen račun odklona in točen zakon konca (premaknjena binomska porazdelitev) sta argument, narisani sprehodi in odčitki zagona so ponazoritev.',
        'A random walk with steps \\(+1\\) and \\(-1\\): how far from the origin the walker gets after \\(n\\) steps and how often it returns there. The exact calculation of the deviation and the exact law of the end (a shifted binomial distribution) are the argument, the drawn walks and the readouts of a run are the illustration.',
    ),
    prerequisites: [text('Povprečje in varianca, neodvisni dogodki, binomska porazdelitev (Galtonova deska).', 'Mean and variance, independent events, the binomial distribution (the Galton board).')],
    learningGoals: [
        text('Znaš pojasniti, zakaj je standardni odklon položaja po \\(n\\) korakih \\(\\sqrt n\\): variance neodvisnih korakov se seštevajo.', 'Can explain why the standard deviation of the position after \\(n\\) steps is \\(\\sqrt n\\): the variances of independent steps add.'),
        text('Veš, da je konec sprehoda binomski, premaknjen na položaje \\(2k-n\\), da je vračanje v izhodišče pogosto in da je pri lihem številu korakov nemogoče.', 'Know that the end of a walk is binomial, shifted onto the positions \\(2k-n\\), that returning to the origin is common and that it is impossible after an odd number of steps.'),
        text('Znaš napovedati odčitek iz zakona \\(\\sqrt n\\) in ga primerjati z zagonom, ki se od zakona običajno nekoliko razlikuje.', 'Can predict a readout from the law \\(\\sqrt n\\) and compare it with a run, which usually differs somewhat from the law.'),
    ],
    formulaBlocks: rs4Formulas,
    workedExamples: rs4Examples,
    steps: rs4Steps,
    sources,
    edgeCases: [
        text('Pri \\(1\\) sprehodu je Koren povprečja kvadratov položaja kar razdalja njegovega konca; en sprehod ne pove, kaj je običajno.', 'With \\(1\\) walk the Root mean square position is just the distance of its end; one walk does not say what is usual.'),
        text('Pri lihem številu korakov se sprehod ne more končati pri \\(0\\); odčitek je tam \\(0\\) in graf to pojasni.', 'With an odd number of steps a walk cannot end at \\(0\\); the readout is \\(0\\) there and the graph says why.'),
        text('Narisanih je le prvih nekaj sprehodov, odčitki pa štejejo vse sprehode zagona. Odčitki in histogram so rezultat enega zagona s navedenim semenom, ne dokaz; točen zakon je argument.', 'Only the first few walks are drawn, while the readouts count all the walks of the run. The readouts and the histogram are the result of one run with its seed, not a proof; the exact law is the argument.'),
    ],
    unresolvedQuestions: [],
};
