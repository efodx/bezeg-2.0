/**
 * Guided lessons of the phase-portraits family, batch C (docs/specs/phase-portraits-lessons.md): PP4, the logistic map beyond r = 3, and PP5, the bifurcation diagram, both on
 * `logistic-map` (LogisticMapGraph). The scenes use only the `phase` actions the graph registers (`set-r`, `set-seed`, `set-step`) and every scene starts from the Demonstration default
 * (r = 2,9, x0 = 0,2, no step drawn) and names what it sets. Every number the text quotes is a readout of the graph for that scene, an exact value computed in the same step, or a value the
 * learner reads after an action the text asks for; the numbers are listed per step in docs/reviews/feature-streams/families-prep/notes/f3-pp-c.md. Fixed point and 2-cycle statements are
 * exact (the multipliers 2 - r and 4 + 2r - r^2); every higher period, every orbit value and the diagram are computed in double precision and said so; for r past 3,56995 the graph makes
 * no period claim and the text does not either. A property seen at one r or one start is stated for that r and that start only. The phase-plane lessons (PP1 to PP3) belong to later batches.
 */
import type {LessonAction} from '../model';
import type {FormulaBlock, GuidedLesson, GuidedLessonFrame, GuidedLessonStep, LessonScene, LocalizedText, WorkedExample} from './guidedLessons';

/** The lesson text is written once with decimal commas in math (`{,}`); the English text gets decimal points. */
const text = (sl: string, en: string): LocalizedText => ({sl, en: en.replace(/\{,\}/g, '.')});
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

/** What a logistic-map scene sets on top of the Demonstration default: the stored integers `R` (r times 100), `X` (x0 times 100) and the number of drawn cobweb steps. */
export interface PhaseSceneSpec {
    readonly R?: number;
    readonly X?: number;
    readonly step?: number;
}

/** The actions of a logistic-map scene: the Demonstration default, then r, the start and the step count. */
export const phasePortraitsSceneActions = (id: string, spec: PhaseSceneSpec): LessonAction[] => [
    {kind: 'prepared-scene', sceneId: id, source: 'demonstration-default'},
    ...(spec.R !== undefined ? [{kind: 'phase', operation: 'set-r', R: spec.R} as const] : []),
    ...(spec.X !== undefined ? [{kind: 'phase', operation: 'set-seed', X: spec.X} as const] : []),
    ...(spec.step !== undefined ? [{kind: 'phase', operation: 'set-step', step: spec.step} as const] : []),
];

const phaseScene = (id: string, spec: PhaseSceneSpec, sl: string, en: string): LessonScene =>
    ({id, basedOn: 'demonstration-default', actions: phasePortraitsSceneActions(id, spec), expectedState: text(sl, en)});

/** PP4. The Demonstration default is r = 2,9, x0 = 0,2, step 0. */
export const PP4_SETTLES = {R: 290, step: 20} as const;
export const PP4_NEUTRAL = {R: 300, step: 20} as const;
export const PP4_TWO_CYCLE = {R: 310, step: 59} as const;
export const PP4_FOUR_CYCLE = {R: 350, step: 56} as const;
export const PP4_EIGHT_CYCLE = {R: 355, step: 52} as const;
export const PP4_CHAOS = {R: 400, step: 5} as const;
export const PP4_FREE = {R: 350} as const;
/** PP5. */
export const PP5_BRANCH = {R: 290} as const;
export const PP5_FIRST_SPLIT = {R: 300} as const;
export const PP5_FASTER = {R: 345} as const;
export const PP5_WINDOW = {R: 383, step: 54} as const;
export const PP5_FREE = {R: 390} as const;

// ---- Formulas and worked examples --------------------------------------------------------------------------------------------------

const formulas: readonly FormulaBlock[] = [
    {
        id: 'logistic-fixed',
        latex: 'f(x)=rx(1-x),\\quad x^{*}=1-\\frac1r,\\quad f^{\\prime}(x^{*})=2-r',
        notation: text(
            '\\(f\\) je logistična preslikava, \\(r\\) njen parameter, \\(x^{*}\\) negibna točka (\\(f(x^{*})=x^{*}\\)) in \\(f^{\\prime}(x^{*})\\) množitelj negibne točke.',
            '\\(f\\) is the logistic map, \\(r\\) its parameter, \\(x^{*}\\) the fixed point (\\(f(x^{*})=x^{*}\\)) and \\(f^{\\prime}(x^{*})\\) the multiplier of the fixed point.',
        ),
        explanation: text(
            'Iteracija je zaporedje \\(x_{n+1}=f(x_n)\\). Negibna točka privlači, če je \\(|f^{\\prime}(x^{*})|<1\\), in odbija, če je \\(|f^{\\prime}(x^{*})|>1\\); pri \\(|f^{\\prime}(x^{*})|=1\\) odvod ne odloči. Ker je \\(f^{\\prime}(x^{*})=2-r\\), negibna točka privlači natanko za \\(1<r<3\\). To je račun z odvodom, cobweb (pajkova mreža) ga ponazori.',
            'The iteration is the sequence \\(x_{n+1}=f(x_n)\\). A fixed point attracts when \\(|f^{\\prime}(x^{*})|<1\\) and repels when \\(|f^{\\prime}(x^{*})|>1\\); at \\(|f^{\\prime}(x^{*})|=1\\) the derivative does not decide. Since \\(f^{\\prime}(x^{*})=2-r\\), the fixed point attracts exactly for \\(1<r<3\\). This is a derivative computation; the cobweb illustrates it.',
        ),
    },
    {
        id: 'logistic-two-cycle',
        latex: 'x_{1,2}=\\frac{(r+1)\\pm\\sqrt{(r+1)(r-3)}}{2r},\\quad m=f^{\\prime}(x_1)f^{\\prime}(x_2)=4+2r-r^{2}',
        notation: text(
            '\\(x_1\\) in \\(x_2\\) sta točki dvocikla (\\(f(x_1)=x_2\\), \\(f(x_2)=x_1\\)), \\(m\\) je množitelj dvocikla.',
            '\\(x_1\\) and \\(x_2\\) are the points of the 2-cycle (\\(f(x_1)=x_2\\), \\(f(x_2)=x_1\\)) and \\(m\\) is the multiplier of the 2-cycle.',
        ),
        explanation: text(
            'Argument: iz \\(f(f(x))=x\\) po deljenju z negibno točko ostane kvadratna enačba \\(r^{2}x^{2}-r(r+1)x+(r+1)=0\\) z vsoto korenov \\((r+1)/r\\) in produktom \\((r+1)/r^{2}\\). Realna korena obstajata za \\(r>3\\). Množitelj je \\(r^{2}(1-2x_1)(1-2x_2)=r^{2}-2r(r+1)+4(r+1)=4+2r-r^{2}\\). Dvocikel privlači, če je \\(|m|<1\\); za \\(r>3\\) je \\(m<1\\), zato privlači natanko, dokler je \\(m>-1\\), to je za \\(r<1+\\sqrt6\\).',
            'Argument: from \\(f(f(x))=x\\), after dividing out the fixed point, the quadratic \\(r^{2}x^{2}-r(r+1)x+(r+1)=0\\) remains, with sum of roots \\((r+1)/r\\) and product \\((r+1)/r^{2}\\). Real roots exist for \\(r>3\\). The multiplier is \\(r^{2}(1-2x_1)(1-2x_2)=r^{2}-2r(r+1)+4(r+1)=4+2r-r^{2}\\). The 2-cycle attracts when \\(|m|<1\\); for \\(r>3\\) we have \\(m<1\\), so it attracts exactly while \\(m>-1\\), that is for \\(r<1+\\sqrt6\\).',
        ),
    },
    {
        id: 'logistic-doublings',
        latex: 'r_1=3,\\quad r_2=1+\\sqrt6,\\quad \\delta_n=\\frac{r_{n+1}-r_n}{r_{n+2}-r_{n+1}}',
        notation: text(
            '\\(r_n\\) je parameter, pri katerem se perioda \\(2^{n-1}\\) podvoji v \\(2^{n}\\); \\(\\delta_n\\) je razmerje zaporednih razmakov med podvojitvami.',
            '\\(r_n\\) is the parameter at which the period \\(2^{n-1}\\) doubles to \\(2^{n}\\); \\(\\delta_n\\) is the ratio of consecutive gaps between doublings.',
        ),
        explanation: text(
            'Prvi dve podvojitvi sta točni: \\(r_1=3\\) (množitelj negibne točke \\(-1\\)) in \\(r_2=1+\\sqrt6\\) (množitelj dvocikla \\(-1\\)). Naslednje so le številske: \\(r_3\\) in \\(r_4\\) sta izračunani zunaj aplikacije (Newtonova metoda na pogoju, da je množitelj cikla \\(-1\\)), zato sta približni. Razmerja \\(\\delta_n\\) so približno \\(4{,}75\\) in \\(4{,}66\\); znana mejna vrednost, približno \\(4{,}669\\), je navedena, ne izračunana v aplikaciji.',
            'The first two doublings are exact: \\(r_1=3\\) (multiplier of the fixed point \\(-1\\)) and \\(r_2=1+\\sqrt6\\) (multiplier of the 2-cycle \\(-1\\)). The next are only numerical: \\(r_3\\) and \\(r_4\\) were computed outside the app (Newton\'s method on the condition that the multiplier of the cycle is \\(-1\\)), so they are approximate. The ratios \\(\\delta_n\\) are about \\(4{,}75\\) and \\(4{,}66\\); the known limit, about \\(4{,}669\\), is cited, not computed in the app.',
        ),
    },
];

const examples: readonly WorkedExample[] = [
    {
        id: 'pp4-two-cycle',
        title: text('Dvocikel pri \\(r=3{,}1\\)', 'The 2-cycle at \\(r=3{,}1\\)'),
        calculationLatex: 'x_{1,2}=\\frac{4{,}1\\pm\\sqrt{0{,}41}}{6{,}2}=\\frac{4{,}1\\pm0{,}6403124}{6{,}2},\\quad m=4+2\\cdot3{,}1-3{,}1^{2}',
        resultLatex: 'x_1\\approx0{,}558014,\\quad x_2\\approx0{,}764567,\\quad m=0{,}59',
        check: text(
            'Odčitek Dvocikel pri \\(r=3{,}1\\) kaže \\(0{,}558014\\leftrightarrow0{,}764567\\) in Množitelj dvocikla \\(0{,}59\\); ker je \\(|0{,}59|<1\\), dvocikel privlači (točen test), vrednosti pa so zaokrožene na šest decimalk.',
            'The readout 2-cycle at \\(r=3{,}1\\) shows \\(0{,}558014\\leftrightarrow0{,}764567\\) and Multiplier of the 2-cycle \\(0{,}59\\); since \\(|0{,}59|<1\\) the 2-cycle attracts (an exact test), and the values are rounded to six decimals.',
        ),
    },
    {
        id: 'pp5-ratios',
        title: text('Razmerja razmakov med podvojitvami', 'The ratios of the gaps between doublings'),
        calculationLatex: 'r_2-r_1=\\sqrt6-2\\approx0{,}449490,\\quad r_3-r_2\\approx0{,}094601,\\quad r_4-r_3\\approx0{,}020317',
        resultLatex: '\\delta_1\\approx\\frac{0{,}449490}{0{,}094601}\\approx4{,}75,\\quad \\delta_2\\approx\\frac{0{,}094601}{0{,}020317}\\approx4{,}66',
        check: text(
            'Vrednosti \\(r_3\\approx3{,}544090\\) in \\(r_4\\approx3{,}564407\\) sta številski, izračunani zunaj aplikacije; \\(r_1=3\\) in \\(r_2=1+\\sqrt6\\approx3{,}449490\\) sta točni. Razmerji sta približni in ne dokazujeta mejne vrednosti.',
            'The values \\(r_3\\approx3{,}544090\\) and \\(r_4\\approx3{,}564407\\) are numerical, computed outside the app; \\(r_1=3\\) and \\(r_2=1+\\sqrt6\\approx3{,}449490\\) are exact. The ratios are approximate and do not prove the limit.',
        ),
    },
];

// ---- PP4 ---------------------------------------------------------------------------------------------------------------------------

const pp4Steps: readonly GuidedLessonStep[] = [
    step({
        id: 'pp4-settles', order: 1,
        title: text('Pri \\(r=2{,}9\\) se orbita umiri', 'At \\(r=2{,}9\\) the orbit settles'),
        purpose: text('Napovedati, kam se iteracija umiri, in to preveriti z množiteljem negibne točke.', 'Predicting where the iteration settles and checking it with the multiplier of the fixed point.'),
        explanation: text(
            'Preslikava \\(f(x)=rx(1-x)\\) pri \\(r=2{,}9\\) in začetku \\(x_0=0{,}2\\) ima negibno točko \\(x^{*}=1-1/r\\). Cobweb (pajkova mreža) kaže prvih \\(20\\) korakov: od krivulje navpično, od diagonale vodoravno. Preden pogledaš odčitke, zapiši, h kateri vrednosti po tvoje gre \\(x_n\\) in ali se približuje z ene strani ali izmenično. Argument je množitelj \\(2-r=-0{,}9\\): \\(|{-0{,}9}|<1\\), zato negibna točka privlači. Cobweb je ponazoritev.',
            'The map \\(f(x)=rx(1-x)\\) at \\(r=2{,}9\\) and start \\(x_0=0{,}2\\) has the fixed point \\(x^{*}=1-1/r\\). The cobweb shows the first \\(20\\) steps: vertically to the curve, horizontally to the diagonal. Before you look at the readouts, write down which value you think \\(x_n\\) approaches and whether it approaches from one side or alternately. The argument is the multiplier \\(2-r=-0{,}9\\): \\(|{-0{,}9}|<1\\), so the fixed point attracts. The cobweb is an illustration.',
        ),
        formulaIds: ['logistic-fixed'],
        observationPrompt: text(
            'Preberi Negibna točka, Množitelj negibne točke in Perioda. Nato pritiskaj Naslednji korak ali Predvajaj do koraka \\(60\\) in preberi \\(x_{60}\\).',
            'Read Fixed point, Multiplier of the fixed point and Period. Then press Next step or Play up to step \\(60\\) and read \\(x_{60}\\).',
        ),
        expectedObservations: [text(
            'Negibna točka je \\(0{,}655172\\), množitelj \\(-0{,}9\\), perioda \\(1\\) (izračunano). Pri koraku \\(20\\) je \\(x_{20}=0{,}66383\\), pri koraku \\(60\\) pa \\(x_{60}=0{,}655302\\): vrednosti so okoli negibne točke in se ji približujejo.',
            'The fixed point is \\(0{,}655172\\), the multiplier \\(-0{,}9\\), the period \\(1\\) (computed). At step \\(20\\) we have \\(x_{20}=0{,}66383\\), and at step \\(60\\) \\(x_{60}=0{,}655302\\): the values lie around the fixed point and approach it.',
        )],
        scene: phaseScene('pp4-settles-scene', PP4_SETTLES,
            'Pri \\(r=2{,}9\\), \\(x_0=0{,}2\\) je narisanih \\(20\\) korakov, \\(x_{20}=0{,}66383\\); negibna točka \\(0{,}655172\\) z množiteljem \\(-0{,}9\\) privlači, perioda \\(1\\) (izračunano).',
            'At \\(r=2{,}9\\), \\(x_0=0{,}2\\) the \\(20\\) steps are drawn, \\(x_{20}=0{,}66383\\); the fixed point \\(0{,}655172\\) with multiplier \\(-0{,}9\\) attracts, period \\(1\\) (computed).'),
    }),
    step({
        id: 'pp4-neutral', order: 2,
        title: text('Pri \\(r=3\\) je množitelj \\(-1\\)', 'At \\(r=3\\) the multiplier is \\(-1\\)'),
        purpose: text('Napovedati, kaj se zgodi, ko je množitelj negibne točke po absolutni vrednosti natanko \\(1\\).', 'Predicting what happens when the multiplier of the fixed point has absolute value exactly \\(1\\).'),
        explanation: text(
            'Pri \\(r=3\\) je \\(f^{\\prime}(x^{*})=2-r=-1\\) natanko, torej \\(|f^{\\prime}(x^{*})|=1\\): test z odvodom ne pove ničesar. Zapiši napoved: ali bo \\(x_n\\) po \\(60\\) korakih pri negibni točki \\(x^{*}=2/3\\)? To je ponazoritev, odgovor v odčitkih je izračunan, ni dokaz.',
            'At \\(r=3\\) we have \\(f^{\\prime}(x^{*})=2-r=-1\\) exactly, so \\(|f^{\\prime}(x^{*})|=1\\): the derivative test says nothing. Write down a prediction: will \\(x_n\\) be at the fixed point \\(x^{*}=2/3\\) after \\(60\\) steps? This is an illustration; the answer in the readouts is computed, not a proof.',
        ),
        formulaIds: ['logistic-fixed'],
        observationPrompt: text(
            'Preberi Množitelj negibne točke in Perioda. Pritiskaj Naslednji korak do koraka \\(60\\) in primerjaj \\(x_{60}\\) z negibno točko.',
            'Read Multiplier of the fixed point and Period. Press Next step up to step \\(60\\) and compare \\(x_{60}\\) with the fixed point.',
        ),
        expectedObservations: [text(
            'Množitelj je \\(-1\\) in odčitek Perioda pravi, da do \\(64\\) ni najdena (izračunano). Pri koraku \\(20\\) je \\(x_{20}=0{,}709631\\), pri koraku \\(60\\) pa \\(x_{60}=0{,}694147\\), še vedno ne pri negibni točki \\(0{,}666667\\): v teh \\(60\\) korakih je približevanje počasno.',
            'The multiplier is \\(-1\\) and the readout Period says none was found up to \\(64\\) (computed). At step \\(20\\) we have \\(x_{20}=0{,}709631\\), and at step \\(60\\) \\(x_{60}=0{,}694147\\), still not at the fixed point \\(0{,}666667\\): within these \\(60\\) steps the approach is slow.',
        )],
        scene: phaseScene('pp4-neutral-scene', PP4_NEUTRAL,
            'Pri \\(r=3\\), \\(x_0=0{,}2\\) je narisanih \\(20\\) korakov, \\(x_{20}=0{,}709631\\); množitelj negibne točke \\(0{,}666667\\) je natanko \\(-1\\), perioda ni najdena do \\(64\\).',
            'At \\(r=3\\), \\(x_0=0{,}2\\) the \\(20\\) steps are drawn, \\(x_{20}=0{,}709631\\); the multiplier of the fixed point \\(0{,}666667\\) is exactly \\(-1\\), no period found up to \\(64\\).'),
    }),
    step({
        id: 'pp4-two-cycle', order: 3,
        title: text('Pri \\(r=3{,}1\\) nastane dvocikel', 'At \\(r=3{,}1\\) a 2-cycle appears'),
        purpose: text('Napovedati, kaj se zgodi z orbito, ko negibna točka odbija, in izračunati dvocikel.', 'Predicting what the orbit does once the fixed point repels, and computing the 2-cycle.'),
        explanation: text(
            'Pri \\(r=3{,}1\\) je množitelj negibne točke \\(2-r=-1{,}1\\), torej \\(|{-1{,}1}|>1\\) in negibna točka odbija. Zapiši napoved: kam gre orbita zdaj? Argument: enačba \\(f(f(x))=x\\) ima poleg negibne točke še dve rešitvi, \\(x_1\\) in \\(x_2\\), s \\(f(x_1)=x_2\\) in \\(f(x_2)=x_1\\), množitelj te dvojice pa je \\(m=4+2r-r^{2}=0{,}59\\), torej \\(|m|<1\\) in dvocikel privlači. Točno to pokaže račun v zgledu; cobweb je le ponazoritev.',
            'At \\(r=3{,}1\\) the multiplier of the fixed point is \\(2-r=-1{,}1\\), so \\(|{-1{,}1}|>1\\) and the fixed point repels. Write down a prediction: where does the orbit go now? Argument: the equation \\(f(f(x))=x\\) has two more solutions besides the fixed point, \\(x_1\\) and \\(x_2\\), with \\(f(x_1)=x_2\\) and \\(f(x_2)=x_1\\), and the multiplier of this pair is \\(m=4+2r-r^{2}=0{,}59\\), so \\(|m|<1\\) and the 2-cycle attracts. The computation in the example shows exactly this; the cobweb is only an illustration.',
        ),
        formulaIds: ['logistic-two-cycle'],
        workedExampleId: 'pp4-two-cycle',
        observationPrompt: text(
            'Preberi Dvocikel, Množitelj dvocikla in Perioda; nato enkrat pritisni Naslednji korak in primerjaj \\(x_{60}\\) z \\(x_{59}\\).',
            'Read 2-cycle, Multiplier of the 2-cycle and Period; then press Next step once and compare \\(x_{60}\\) with \\(x_{59}\\).',
        ),
        expectedObservations: [text(
            'Dvocikel je \\(0{,}558014\\leftrightarrow0{,}764567\\) z množiteljem \\(0{,}59\\), negibna točka \\(0{,}677419\\) odbija (\\(-1{,}1\\)), perioda \\(2\\) (izračunano). Pri koraku \\(59\\) je \\(x_{59}=0{,}558014\\), pri koraku \\(60\\) pa \\(x_{60}=0{,}764567\\): orbita izmenično obiskuje obe točki dvocikla.',
            'The 2-cycle is \\(0{,}558014\\leftrightarrow0{,}764567\\) with multiplier \\(0{,}59\\), the fixed point \\(0{,}677419\\) repels (\\(-1{,}1\\)), period \\(2\\) (computed). At step \\(59\\) we have \\(x_{59}=0{,}558014\\) and at step \\(60\\) \\(x_{60}=0{,}764567\\): the orbit visits the two points of the 2-cycle in turn.',
        )],
        scene: phaseScene('pp4-two-cycle-scene', PP4_TWO_CYCLE,
            'Pri \\(r=3{,}1\\), \\(x_0=0{,}2\\) je narisanih \\(59\\) korakov, \\(x_{59}=0{,}558014\\); dvocikel \\(0{,}558014\\leftrightarrow0{,}764567\\) z množiteljem \\(0{,}59\\) privlači, negibna točka \\(0{,}677419\\) odbija.',
            'At \\(r=3{,}1\\), \\(x_0=0{,}2\\) the \\(59\\) steps are drawn, \\(x_{59}=0{,}558014\\); the 2-cycle \\(0{,}558014\\leftrightarrow0{,}764567\\) with multiplier \\(0{,}59\\) attracts, the fixed point \\(0{,}677419\\) repels.'),
    }),
    step({
        id: 'pp4-four-cycle', order: 4,
        title: text('Dvocikel odpove: štiricikel', 'The 2-cycle fails: a 4-cycle'),
        purpose: text('Napovedati, kdaj dvocikel preneha privlačiti, in prebrati štiri vrednosti, ki se ponavljajo.', 'Predicting when the 2-cycle stops attracting and reading the four values that repeat.'),
        explanation: text(
            'Množitelj dvocikla \\(m=4+2r-r^{2}\\) pade pod \\(-1\\) pri \\(r=1+\\sqrt6\\approx3{,}449490\\) (točno: \\(m=-1\\) natanko tedaj); za \\(r\\) med \\(1+\\sqrt6\\) in \\(4\\) dvocikel odbija. Na primer pri \\(r=3{,}5\\) je \\(m=-1{,}25\\). Zapiši napoved, kaj orbita stori zdaj. Kaj stori orbita, graf izračuna: perioda \\(4\\) je izračunana (toleranca \\(10^{-9}\\)), ne točna.',
            'The multiplier of the 2-cycle \\(m=4+2r-r^{2}\\) falls below \\(-1\\) at \\(r=1+\\sqrt6\\approx3{,}449490\\) (exactly: \\(m=-1\\) precisely then); for \\(r\\) between \\(1+\\sqrt6\\) and \\(4\\) the 2-cycle repels. For example at \\(r=3{,}5\\) we have \\(m=-1{,}25\\). Write down a prediction of what the orbit does now. What the orbit does is computed by the graph: the period \\(4\\) is computed (tolerance \\(10^{-9}\\)), not exact.',
        ),
        formulaIds: ['logistic-two-cycle'],
        observationPrompt: text(
            'Pritisni Naslednji korak štirikrat in zapiši \\(x_{57}\\) do \\(x_{60}\\); primerjaj \\(x_{60}\\) z \\(x_{56}\\). Nato v polje Parameter r vpiši \\(3{,}46\\) in preberi Množitelj dvocikla in Perioda.',
            'Press Next step four times and write down \\(x_{57}\\) to \\(x_{60}\\); compare \\(x_{60}\\) with \\(x_{56}\\). Then type \\(3{,}46\\) in the field Parameter r and read Multiplier of the 2-cycle and Period.',
        ),
        expectedObservations: [text(
            'Pri \\(r=3{,}5\\) je \\(x_{56}=0{,}826941\\), nato \\(x_{57}=0{,}500884\\), \\(x_{58}=0{,}874997\\), \\(x_{59}=0{,}38282\\), \\(x_{60}=0{,}826941\\): štiri vrednosti se ponavljajo, perioda \\(4\\) (izračunano), množitelj dvocikla \\(-1{,}25\\). Pri \\(r=3{,}46\\) je množitelj dvocikla \\(-1{,}0516\\) in perioda \\(4\\) (izračunano).',
            'At \\(r=3{,}5\\) we have \\(x_{56}=0{,}826941\\), then \\(x_{57}=0{,}500884\\), \\(x_{58}=0{,}874997\\), \\(x_{59}=0{,}38282\\), \\(x_{60}=0{,}826941\\): four values repeat, period \\(4\\) (computed), multiplier of the 2-cycle \\(-1{,}25\\). At \\(r=3{,}46\\) the multiplier of the 2-cycle is \\(-1{,}0516\\) and the period \\(4\\) (computed).',
        )],
        scene: phaseScene('pp4-four-cycle-scene', PP4_FOUR_CYCLE,
            'Pri \\(r=3{,}5\\), \\(x_0=0{,}2\\) je narisanih \\(56\\) korakov, \\(x_{56}=0{,}826941\\); množitelj dvocikla \\(-1{,}25\\), perioda \\(4\\) (izračunano).',
            'At \\(r=3{,}5\\), \\(x_0=0{,}2\\) the \\(56\\) steps are drawn, \\(x_{56}=0{,}826941\\); multiplier of the 2-cycle \\(-1{,}25\\), period \\(4\\) (computed).'),
    }),
    step({
        id: 'pp4-eight-cycle', order: 5,
        title: text('Perioda \\(8\\) in naprej', 'Period \\(8\\) and beyond'),
        purpose: text('Napovedati, kje se perioda spet podvoji, in videti, da se to ponavlja.', 'Predicting where the period doubles again and seeing that it keeps happening.'),
        explanation: text(
            'Perioda \\(2\\), \\(4\\), \\(8\\), \\(16\\)... se podvaja, vsakič pri manjšem prirastku \\(r\\). Pri \\(r=3{,}55\\) pokaže odčitek periodo \\(8\\) (izračunano). Zapiši napoved: pri katerem \\(r\\) med \\(3{,}54\\) in \\(3{,}55\\) se je perioda \\(4\\) spremenila v \\(8\\)? Odčitki so le računski; po koraku \\(60\\) se osem vrednosti še ne ujema na šest decimalk.',
            'The period \\(2\\), \\(4\\), \\(8\\), \\(16\\)... keeps doubling, each time over a smaller increase of \\(r\\). At \\(r=3{,}55\\) the readout shows period \\(8\\) (computed). Write down a prediction: at which \\(r\\) between \\(3{,}54\\) and \\(3{,}55\\) did the period \\(4\\) change to \\(8\\)? The readouts are only computed; after step \\(60\\) the eight values do not yet agree to six decimals.',
        ),
        formulaIds: [],
        observationPrompt: text(
            'V polje Parameter r vpiši \\(3{,}54\\) in preberi Perioda, nato \\(3{,}55\\), nato \\(3{,}57\\) in preberi Perioda in Opomba. Pri \\(3{,}55\\) primerjaj \\(x_{52}\\) in \\(x_{60}\\).',
            'In the field Parameter r type \\(3{,}54\\) and read Period, then \\(3{,}55\\), then \\(3{,}57\\) and read Period and Note. At \\(3{,}55\\) compare \\(x_{52}\\) and \\(x_{60}\\).',
        ),
        expectedObservations: [text(
            'Pri \\(3{,}54\\) je perioda \\(4\\), pri \\(3{,}55\\) je \\(8\\) (obe izračunani). Pri \\(3{,}55\\) je \\(x_{52}=0{,}812682\\) in \\(x_{60}=0{,}812668\\), razlika je okoli \\(1{,}4\\cdot10^{-5}\\). Pri \\(3{,}57\\), večjem od \\(3{,}56995\\), odčitek Perioda ne trdi ničesar.',
            'At \\(3{,}54\\) the period is \\(4\\), at \\(3{,}55\\) it is \\(8\\) (both computed). At \\(3{,}55\\) we have \\(x_{52}=0{,}812682\\) and \\(x_{60}=0{,}812668\\), a difference of about \\(1{,}4\\cdot10^{-5}\\). At \\(3{,}57\\), larger than \\(3{,}56995\\), the readout Period makes no claim.',
        )],
        scene: phaseScene('pp4-eight-cycle-scene', PP4_EIGHT_CYCLE,
            'Pri \\(r=3{,}55\\), \\(x_0=0{,}2\\) je narisanih \\(52\\) korakov, \\(x_{52}=0{,}812682\\); perioda \\(8\\) (izračunano).',
            'At \\(r=3{,}55\\), \\(x_0=0{,}2\\) the \\(52\\) steps are drawn, \\(x_{52}=0{,}812682\\); period \\(8\\) (computed).'),
    }),
    step({
        id: 'pp4-chaos', order: 6,
        title: text('Pri \\(r=4\\) se bližnja začetka razmakneta', 'At \\(r=4\\) two close starts separate'),
        purpose: text('Napovedati, kaj se zgodi z dvema skoraj enakima začetkoma, in poznati mejo računskih orbit.', 'Predicting what happens to two almost equal starts and knowing the limit of computed orbits.'),
        explanation: text(
            'Pri \\(r=4\\) odčitek Perioda ne trdi nič, ker je \\(r\\) večji od \\(3{,}56995\\), in tudi dvocikel in negibna točka ne privlačita (množitelja \\(-4\\) in \\(-2\\)). Zapiši napoved: kako se po petih korakih razlikujeta orbiti z začetkoma \\(0{,}2\\) in \\(0{,}21\\)? Graf pozna le začetke na mreži \\(0{,}01\\): začetka, ki bi bila \\(10^{-10}\\) narazen, ne moreš nastaviti, zato ta par sam še ne pokaže občutljive odvisnosti od začetka. Računske vrednosti so dvojna natančnost: graf pravi, da so pri \\(r=4\\) po približno \\(50\\) korakih dolge orbite zaradi končne natančnosti nezanesljive, zato \\(x_{60}\\) ni zanesljivo število.',
            'At \\(r=4\\) the readout Period claims nothing, since \\(r\\) is larger than \\(3{,}56995\\), and neither the 2-cycle nor the fixed point attracts (multipliers \\(-4\\) and \\(-2\\)). Write down a prediction: how do the orbits with starts \\(0{,}2\\) and \\(0{,}21\\) differ after five steps? The graph only knows starts on the grid \\(0{,}01\\): starts \\(10^{-10}\\) apart cannot be set, so this pair alone does not yet show sensitive dependence on the start. The computed values are in double precision: the graph says that at \\(r=4\\) long orbits are unreliable after about \\(50\\) steps because of finite precision, so \\(x_{60}\\) is not a reliable number.',
        ),
        formulaIds: [],
        observationPrompt: text(
            'Preberi \\(x_5\\), nato v polje Začetek \\(x_0\\) vpiši \\(0{,}21\\) in spet preberi \\(x_5\\) (število narisanih korakov se pri spremembi začetka ohrani). Pritisni Ponastavi, dvakrat pritisni Naslednji korak in preberi \\(x_1\\) in \\(x_2\\); nato spet vpiši \\(0{,}2\\) in ju preberi še za ta začetek.',
            'Read \\(x_5\\), then type \\(0{,}21\\) in the field Start \\(x_0\\) and read \\(x_5\\) again (the number of drawn steps is kept when the start changes). Press Reset, press Next step twice and read \\(x_1\\) and \\(x_2\\); then type \\(0{,}2\\) again and read them for that start too.',
        ),
        expectedObservations: [text(
            'Pri začetku \\(0{,}2\\) je \\(x_5=0{,}585421\\), pri \\(0{,}21\\) je \\(x_5=0{,}209062\\): razlika je okoli \\(0{,}38\\), čeprav sta začetka \\(0{,}01\\) narazen. Za začetka \\(0{,}2\\) in \\(0{,}21\\) je \\(x_1=0{,}64\\) in \\(0{,}6636\\), \\(x_2=0{,}9216\\) in \\(0{,}89294\\). To velja za ta dva začetka: razlika ne naraste pri vsakem koraku (pri \\(x_8\\) sta \\(0{,}401974\\) in \\(0{,}37345\\)).',
            'With start \\(0{,}2\\) we have \\(x_5=0{,}585421\\), with \\(0{,}21\\) we have \\(x_5=0{,}209062\\): the difference is about \\(0{,}38\\), although the starts are \\(0{,}01\\) apart. For the starts \\(0{,}2\\) and \\(0{,}21\\) we have \\(x_1=0{,}64\\) and \\(0{,}6636\\), \\(x_2=0{,}9216\\) and \\(0{,}89294\\). This holds for these two starts: the difference does not grow at every step (at \\(x_8\\) they are \\(0{,}401974\\) and \\(0{,}37345\\)).',
        )],
        scene: phaseScene('pp4-chaos-scene', PP4_CHAOS,
            'Pri \\(r=4\\), \\(x_0=0{,}2\\) je narisanih \\(5\\) korakov, \\(x_5=0{,}585421\\); odčitek Perioda ne trdi ničesar, množitelja \\(-2\\) in \\(-4\\).',
            'At \\(r=4\\), \\(x_0=0{,}2\\) the \\(5\\) steps are drawn, \\(x_5=0{,}585421\\); the readout Period claims nothing, multipliers \\(-2\\) and \\(-4\\).'),
    }),
    step({
        id: 'pp4-free', order: 7,
        title: text('Prosto raziskovanje', 'Free exploration'),
        purpose: text('Samostojno poiskati, kje se obnašanje orbite spremeni, in ločiti točno od izračunanega.', 'Finding on your own where the behaviour of the orbit changes and telling exact from computed.'),
        explanation: text(
            'Zdaj raziskuj sam. Spreminjaj \\(r\\) in začetek, narisano število korakov pa z Naslednji korak ali Predvajaj. Preberi Perioda pri \\(r=3{,}55\\), \\(3{,}56\\) in \\(3{,}57\\), poišči največji \\(r\\) na mreži \\(0{,}01\\), pri katerem odčitek še pokaže število, in razloži, zakaj se \\(16\\) na tej mreži nikoli ne pojavi. Ločuj: vrsta negibne točke in dvocikla je točna, perioda in vrednosti \\(x_n\\) so izračunane.',
            'Now explore on your own. Change \\(r\\) and the start, and the number of drawn steps with Next step or Play. Read Period at \\(r=3{,}55\\), \\(3{,}56\\) and \\(3{,}57\\), find the largest \\(r\\) on the grid \\(0{,}01\\) at which the readout still shows a number, and explain why \\(16\\) never appears on this grid. Keep apart: the kind of the fixed point and of the 2-cycle is exact, the period and the values \\(x_n\\) are computed.',
        ),
        formulaIds: [],
        observationPrompt: text(
            'V polje Parameter r vpiši \\(3{,}55\\), \\(3{,}56\\) in \\(3{,}57\\) in vsakič preberi Perioda in Opomba; zapiši, kaj je točno in kaj izračunano ter zakaj se \\(16\\) ne pojavi.',
            'In the field Parameter r type \\(3{,}55\\), \\(3{,}56\\) and \\(3{,}57\\) and each time read Period and Note; write down what is exact and what is computed and why \\(16\\) does not appear.',
        ),
        expectedObservations: [text(
            'Pri \\(3{,}55\\) in \\(3{,}56\\) je perioda \\(8\\), pri \\(3{,}57\\) odčitek Perioda ne trdi ničesar: največji \\(r\\) na mreži s številom je \\(3{,}56\\). Perioda \\(16\\) se začne pri \\(r_4\\approx3{,}564407\\), med mrežnima točkama \\(3{,}56\\) in \\(3{,}57\\), zato je na tej mreži ne vidiš. Vrsta negibne točke in dvocikla je točna, perioda in vrednosti \\(x_n\\) so izračunane.',
            'At \\(3{,}55\\) and \\(3{,}56\\) the period is \\(8\\), at \\(3{,}57\\) the readout Period claims nothing: the largest \\(r\\) on the grid with a number is \\(3{,}56\\). The period \\(16\\) begins at \\(r_4\\approx3{,}564407\\), between the grid points \\(3{,}56\\) and \\(3{,}57\\), so you do not see it on this grid. The kind of the fixed point and of the 2-cycle is exact, the period and the values \\(x_n\\) are computed.',
        )],
        scene: phaseScene('pp4-free-scene', PP4_FREE,
            'Pri \\(r=3{,}5\\), \\(x_0=0{,}2\\) ni narisanega nobenega koraka; perioda \\(4\\) (izračunano); \\(r\\) in začetek sta prosta.',
            'At \\(r=3{,}5\\), \\(x_0=0{,}2\\) no step is drawn; period \\(4\\) (computed); \\(r\\) and the start are free.'),
    }),
];

// ---- PP5 ---------------------------------------------------------------------------------------------------------------------------

const pp5Steps: readonly GuidedLessonStep[] = [
    step({
        id: 'pp5-branch', order: 1,
        title: text('Ena veja', 'A single branch'),
        purpose: text('Povezati dolgoročno vrednost \\(x\\) v diagramu z negibno točko in kazalec z \\(r\\).', 'Connecting the long-run value of \\(x\\) in the diagram with the fixed point and the cursor with \\(r\\).'),
        explanation: text(
            'Bifurkacijski diagram kaže dolgoročne vrednosti \\(x\\) za vsak \\(r\\) od \\(2{,}5\\) do \\(4\\): za vsak \\(r\\) odstranimo začetne korake in narišemo, kje orbita potem leži. Kazalec stoji pri stolpcu diagrama, ki je najbližji \\(r\\), in odčitek navede \\(r\\) tega stolpca, ne vpisanega \\(r\\). Zapiši napoved: na kateri višini je veja pri \\(r=2{,}9\\)? Diagram je ponazoritev, izračunana z dvojno natančnostjo.',
            'The bifurcation diagram shows the long-run values of \\(x\\) for each \\(r\\) from \\(2{,}5\\) to \\(4\\): for each \\(r\\) the first steps are dropped and where the orbit lies afterwards is drawn. The cursor stands at the diagram column nearest to \\(r\\), and the readout gives the \\(r\\) of that column, not the typed \\(r\\). Write down a prediction: at what height is the branch at \\(r=2{,}9\\)? The diagram is an illustration, computed in double precision.',
        ),
        formulaIds: ['logistic-fixed'],
        observationPrompt: text(
            'Preberi Negibna točka in Stolpec diagrama pri kazalcu ter primerjaj višino kazalca na veji z negibno točko.',
            'Read Fixed point and Diagram column at the cursor and compare the height of the cursor on the branch with the fixed point.',
        ),
        expectedObservations: [text(
            'Negibna točka je \\(0{,}655172\\), perioda \\(1\\) (izračunano); kazalec stoji pri stolpcu \\(r=2{,}8985\\) (stolpec \\(107\\) od \\(400\\)), ne pri \\(2{,}9\\).',
            'The fixed point is \\(0{,}655172\\), the period \\(1\\) (computed); the cursor stands at the column \\(r=2{,}8985\\) (column \\(107\\) of \\(400\\)), not at \\(2{,}9\\).',
        )],
        scene: phaseScene('pp5-branch-scene', PP5_BRANCH,
            'Pri \\(r=2{,}9\\) kazalec stoji pri stolpcu \\(r=2{,}8985\\) na eni veji; negibna točka \\(0{,}655172\\), perioda \\(1\\) (izračunano).',
            'At \\(r=2{,}9\\) the cursor stands at the column \\(r=2{,}8985\\) on a single branch; the fixed point \\(0{,}655172\\), period \\(1\\) (computed).'),
    }),
    step({
        id: 'pp5-first-split', order: 2,
        title: text('Prvi razcep pri \\(r=3\\)', 'The first split at \\(r=3\\)'),
        purpose: text('Napovedati, kaj naredi veja po razcepu, in prebrati obe novi vrednosti.', 'Predicting what the branch does after the split and reading the two new values.'),
        explanation: text(
            'Črtkana navpična oznaka pri \\(r=3\\) je točna: tam je množitelj negibne točke \\(2-r=-1\\). Zapiši napoved: ali se veja za oznako nadaljuje, ali se razcepi, in kam gre vsaka nova veja? Argument za razcep je račun dvocikla iz zgleda PP4: za \\(r>3\\) ima \\(f(f(x))=x\\) še dve rešitvi.',
            'The dashed vertical mark at \\(r=3\\) is exact: there the multiplier of the fixed point is \\(2-r=-1\\). Write down a prediction: does the branch continue past the mark or does it split, and where does each new branch go? The argument for the split is the 2-cycle computation of PP4: for \\(r>3\\) the equation \\(f(f(x))=x\\) has two more solutions.',
        ),
        formulaIds: ['logistic-two-cycle'],
        observationPrompt: text(
            'V polje Parameter r vpiši \\(3{,}1\\) in preberi Dvocikel, Perioda in Stolpec diagrama pri kazalcu; kazalec stoji na dveh vejah.',
            'Type \\(3{,}1\\) in the field Parameter r and read 2-cycle, Period and Diagram column at the cursor; the cursor stands on two branches.',
        ),
        expectedObservations: [text(
            'Pri \\(r=3\\) je množitelj \\(-1\\), stolpec \\(r=3\\) in perioda ni najdena do \\(64\\) (izračunano). Pri \\(r=3{,}1\\) je dvocikel \\(0{,}558014\\leftrightarrow0{,}764567\\), perioda \\(2\\) (izračunano), stolpec \\(r=3{,}1015\\): dve veji.',
            'At \\(r=3\\) the multiplier is \\(-1\\), the column is \\(r=3\\) and no period is found up to \\(64\\) (computed). At \\(r=3{,}1\\) the 2-cycle is \\(0{,}558014\\leftrightarrow0{,}764567\\), period \\(2\\) (computed), column \\(r=3{,}1015\\): two branches.',
        )],
        scene: phaseScene('pp5-first-split-scene', PP5_FIRST_SPLIT,
            'Pri \\(r=3\\) kazalec stoji natanko na oznaki prvega razcepa; množitelj negibne točke \\(-1\\), stolpec \\(r=3\\).',
            'At \\(r=3\\) the cursor stands exactly on the mark of the first split; multiplier of the fixed point \\(-1\\), column \\(r=3\\).'),
    }),
    step({
        id: 'pp5-faster', order: 3,
        title: text('Razcepi so vedno bližje', 'The splits come faster'),
        purpose: text('Napovedati, kje je drugi razcep, in primerjati razmake med razcepi.', 'Predicting where the second split is and comparing the gaps between splits.'),
        explanation: text(
            'Drugi razcep je pri \\(r=1+\\sqrt6\\approx3{,}449490\\), kjer je množitelj dvocikla natanko \\(-1\\) (točno). Zapiši napoved, ali sta pri \\(r=3{,}44\\) in \\(3{,}45\\) še dve veji ali že štiri. Razmaki med razcepi se krčijo: razmerji sta približno \\(4{,}75\\) in \\(4{,}66\\), \\(r_3\\) in \\(r_4\\) pa sta številska, izračunana zunaj aplikacije. Diagram je ponazoritev; razmerja ne dokazujejo mejne vrednosti.',
            'The second split is at \\(r=1+\\sqrt6\\approx3{,}449490\\), where the multiplier of the 2-cycle is exactly \\(-1\\) (exact). Write down a prediction whether at \\(r=3{,}44\\) and \\(3{,}45\\) there are still two branches or already four. The gaps between splits shrink: the ratios are about \\(4{,}75\\) and \\(4{,}66\\), and \\(r_3\\) and \\(r_4\\) are numerical, computed outside the app. The diagram is an illustration; the ratios do not prove the limit.',
        ),
        formulaIds: ['logistic-doublings'],
        workedExampleId: 'pp5-ratios',
        observationPrompt: text(
            'V polje Parameter r vpiši \\(3{,}44\\) in preberi Množitelj dvocikla in Perioda; nato \\(3{,}45\\) in preberi isto.',
            'Type \\(3{,}44\\) in the field Parameter r and read Multiplier of the 2-cycle and Period; then \\(3{,}45\\) and read the same.',
        ),
        expectedObservations: [text(
            'Pri \\(3{,}44\\) je množitelj dvocikla \\(-0{,}9536\\), perioda \\(2\\), stolpec \\(r=3{,}4398\\); pri \\(3{,}45\\) je \\(-1{,}0025\\), perioda \\(4\\), stolpec \\(r=3{,}4511\\) (perioda je izračunana). Število \\(1+\\sqrt6\\) leži med \\(3{,}44\\) in \\(3{,}45\\).',
            'At \\(3{,}44\\) the multiplier of the 2-cycle is \\(-0{,}9536\\), the period \\(2\\), the column \\(r=3{,}4398\\); at \\(3{,}45\\) it is \\(-1{,}0025\\), the period \\(4\\), the column \\(r=3{,}4511\\) (the period is computed). The number \\(1+\\sqrt6\\) lies between \\(3{,}44\\) and \\(3{,}45\\).',
        )],
        scene: phaseScene('pp5-faster-scene', PP5_FASTER,
            'Pri \\(r=3{,}45\\) je množitelj dvocikla \\(-1{,}0025\\), perioda \\(4\\) (izračunano), stolpec \\(r=3{,}4511\\); oznaka \\(1+\\sqrt6\\) je tik pred kazalcem.',
            'At \\(r=3{,}45\\) the multiplier of the 2-cycle is \\(-1{,}0025\\), the period \\(4\\) (computed), the column \\(r=3{,}4511\\); the mark \\(1+\\sqrt6\\) is just before the cursor.'),
    }),
    step({
        id: 'pp5-window', order: 4,
        title: text('Kaotični pas in okno', 'The chaotic band and a window'),
        purpose: text('Napovedati, ali ima kaotični pas povsod enak videz, in prebrati okno v enem primeru.', 'Predicting whether the chaotic band looks the same everywhere and reading a window in one case.'),
        explanation: text(
            'Za \\(r\\) nad \\(3{,}56995\\) (navedeno, ne izračunano v aplikaciji) graf periode ne trdi več, v diagramu pa so svetle proge, okna. Zapiši napoved: kaj pokažejo zadnji koraki pri \\(r=3{,}83\\) in kaj pri \\(r=3{,}82\\)? To je opis ene slike, ne dokaz o intervalu \\(r\\): pri \\(r=3{,}83\\) in začetku \\(0{,}2\\) preberemo, kaj se ponavlja.',
            'For \\(r\\) above \\(3{,}56995\\) (cited, not computed in the app) the graph no longer claims periods, and in the diagram there are light strips, windows. Write down a prediction: what do the last steps show at \\(r=3{,}83\\) and what at \\(r=3{,}82\\)? This describes one picture, not a statement about an interval of \\(r\\): at \\(r=3{,}83\\) and start \\(0{,}2\\) we read what repeats.',
        ),
        formulaIds: [],
        observationPrompt: text(
            'Pritisni Naslednji korak šestkrat in zapiši \\(x_{54}\\) do \\(x_{60}\\). Nato vpiši začetek \\(0{,}8\\) in preberi \\(x_{60}\\). Potem vpiši \\(r=3{,}82\\), spet začetek \\(0{,}2\\), in preberi \\(x_{57}\\) in \\(x_{60}\\).',
            'Press Next step six times and write down \\(x_{54}\\) to \\(x_{60}\\). Then type the start \\(0{,}8\\) and read \\(x_{60}\\). Then type \\(r=3{,}82\\) and the start \\(0{,}2\\) again and read \\(x_{57}\\) and \\(x_{60}\\).',
        ),
        expectedObservations: [text(
            'Pri \\(r=3{,}83\\), začetku \\(0{,}2\\) se tri vrednosti ponavljajo: \\(x_{54}=x_{57}=x_{60}=0{,}504667\\), \\(x_{55}=x_{58}=0{,}957417\\), \\(x_{56}=x_{59}=0{,}156149\\); pri začetku \\(0{,}8\\) je spet \\(x_{60}=0{,}504667\\). Pri \\(r=3{,}82\\) je \\(x_{57}=0{,}8626\\) in \\(x_{60}=0{,}193532\\): v teh korakih se nič ne ponovi. Odčitek Perioda ne trdi ničesar; periodo \\(3\\) bi bilo treba računsko preveriti zunaj tega odčitka.',
            'At \\(r=3{,}83\\), start \\(0{,}2\\) three values repeat: \\(x_{54}=x_{57}=x_{60}=0{,}504667\\), \\(x_{55}=x_{58}=0{,}957417\\), \\(x_{56}=x_{59}=0{,}156149\\); with the start \\(0{,}8\\) again \\(x_{60}=0{,}504667\\). At \\(r=3{,}82\\) we have \\(x_{57}=0{,}8626\\) and \\(x_{60}=0{,}193532\\): in these steps nothing repeats. The readout Period claims nothing; a period \\(3\\) would have to be checked computationally outside this readout.',
        )],
        scene: phaseScene('pp5-window-scene', PP5_WINDOW,
            'Pri \\(r=3{,}83\\), \\(x_0=0{,}2\\) je narisanih \\(54\\) korakov, \\(x_{54}=0{,}504667\\); odčitek Perioda ne trdi ničesar.',
            'At \\(r=3{,}83\\), \\(x_0=0{,}2\\) the \\(54\\) steps are drawn, \\(x_{54}=0{,}504667\\); the readout Period claims nothing.'),
    }),
    step({
        id: 'pp5-free', order: 5,
        title: text('Prosto raziskovanje', 'Free exploration'),
        purpose: text('Samostojno sprehoditi \\(r\\) po diagramu in ločiti točno od izračunanega.', 'Walking \\(r\\) along the diagram on your own and telling exact from computed.'),
        explanation: text(
            'Zdaj raziskuj sam: premikaj \\(r\\) po celotnem diagramu, pritiskaj Naslednji korak in opazuj, kje kazalec stoji na eni, dveh, štirih vejah in kje ob svetlih progah. Zapiši, katere trditve v odčitkih so točne (vrsta negibne točke in dvocikla, oznaki \\(3\\) in \\(1+\\sqrt6\\)) in katere izračunane (perioda od \\(4\\) naprej, vrednosti \\(x_n\\), celoten diagram).',
            'Now explore on your own: move \\(r\\) along the whole diagram, press Next step and watch where the cursor stands on one, two, four branches and where beside the light strips. Write down which statements in the readouts are exact (the kind of the fixed point and of the 2-cycle, the marks \\(3\\) and \\(1+\\sqrt6\\)) and which are computed (the period from \\(4\\) on, the values \\(x_n\\), the whole diagram).',
        ),
        formulaIds: [],
        observationPrompt: text(
            'Poišči \\(r\\), pri katerem kazalec stoji na štirih vejah, in \\(r\\), pri katerem odčitek Perioda ne trdi ničesar; zapiši oba stolpca \\(r\\).',
            'Find an \\(r\\) at which the cursor stands on four branches and an \\(r\\) at which the readout Period claims nothing; write down both column values of \\(r\\).',
        ),
        expectedObservations: [text(
            'Štiri veje so pri \\(r=3{,}5\\) (perioda \\(4\\), izračunano); pri \\(r=3{,}9\\) odčitek Perioda ne trdi ničesar, stolpec je \\(r=3{,}8985\\).',
            'Four branches occur at \\(r=3{,}5\\) (period \\(4\\), computed); at \\(r=3{,}9\\) the readout Period claims nothing, the column is \\(r=3{,}8985\\).',
        )],
        scene: phaseScene('pp5-free-scene', PP5_FREE,
            'Pri \\(r=3{,}9\\), \\(x_0=0{,}2\\) ni narisanega nobenega koraka; odčitek Perioda ne trdi ničesar, stolpec \\(r=3{,}8985\\); \\(r\\) in začetek sta prosta.',
            'At \\(r=3{,}9\\), \\(x_0=0{,}2\\) no step is drawn; the readout Period claims nothing, the column \\(r=3{,}8985\\); \\(r\\) and the start are free.'),
    }),
];

// ---- The lessons -------------------------------------------------------------------------------------------------------------------

const sources: GuidedLesson['sources'] = [
    {
        id: 'bezeg-phase-implementation',
        citation: 'Bezeg source: src/dynamics/logistic.ts (the exact fixed-point and 2-cycle tests, the period detector), src/dynamics/bifurcation.ts (the raster) and src/graphs/dynamics/LogisticMapGraph.tsx.',
        implementationCorrespondence: 'A scene sets r, the start and the number of drawn cobweb steps of the logistic-map graph; the fixed point, the 2-cycle and their multipliers are exact, the periods and orbit values are computed in double precision with a stated tolerance, the diagram is a precomputed raster drawn once, and for r past 3,56995 the graph makes no period claim. The cobweb and the diagram illustrate the multiplier arguments; they are not proofs.',
    },
];

const edgeCasesOf = (extra: readonly LocalizedText[]): readonly LocalizedText[] => [
    text('Pri \\(r\\) nad \\(3{,}56995\\) graf periode ne trdi; vrednosti \\(x_n\\) so izračunane v dvojni natančnosti in pri \\(r=4\\) po približno \\(50\\) korakih ne ustrezajo več pravi orbiti.',
        'For \\(r\\) above \\(3{,}56995\\) the graph claims no period; the values \\(x_n\\) are computed in double precision and at \\(r=4\\) after about \\(50\\) steps they no longer match the true orbit.'),
    text('\\(r\\) in začetek sta na mreži \\(0{,}01\\); vrednosti zunaj nje graf zavrne.', '\\(r\\) and the start are on the grid \\(0{,}01\\); the graph refuses values outside it.'),
    ...extra,
];

const logisticMap: GuidedLesson = {
    demonstrationId: 'logistic-map',
    title: text('Logistična preslikava za \\(r>3\\)', 'The logistic map beyond \\(r=3\\)'),
    summary: text(
        'Negibna točka logistične preslikave pri \\(r=3\\) izgubi stabilnost, nastane dvocikel, nato štiricikel, osemcikel in nepravilno obnašanje. Točna sta množitelja negibne točke in dvocikla, višje periode so izračunane.',
        'The fixed point of the logistic map loses stability at \\(r=3\\), a 2-cycle appears, then a 4-cycle, an 8-cycle and irregular behaviour. The multipliers of the fixed point and of the 2-cycle are exact; higher periods are computed.',
    ),
    prerequisites: [text('Iteracija funkcije, negibna točka, cobweb (pajkova mreža).', 'Iterating a function, a fixed point, the cobweb.')],
    learningGoals: [
        text('Znaš z množiteljem utemeljiti, kdaj negibna točka in dvocikel privlačita.', 'Can use the multiplier to say when the fixed point and the 2-cycle attract.'),
        text('Ločiš točne trditve od izračunanih in veš, da pri \\(r\\) nad \\(3{,}56995\\) graf periode ne trdi.', 'Can tell exact statements from computed ones and know that above \\(3{,}56995\\) the graph claims no period.'),
    ],
    formulaBlocks: formulas.slice(0, 2),
    workedExamples: examples.slice(0, 1),
    steps: pp4Steps,
    sources,
    edgeCases: edgeCasesOf([]),
    unresolvedQuestions: [],
};

const bifurcation: GuidedLesson = {
    demonstrationId: 'logistic-map',
    title: text('Bifurkacijski diagram', 'The bifurcation diagram'),
    summary: text(
        'Diagram prikaže dolgoročne vrednosti \\(x\\) za vsak \\(r\\): eno vejo, razcepe pri \\(3\\) in \\(1+\\sqrt6\\), vedno bližje drug drugemu, in kaotični pas z okni. Diagram je ponazoritev, izračunana v dvojni natančnosti.',
        'The diagram shows the long-run values of \\(x\\) for each \\(r\\): one branch, splits at \\(3\\) and \\(1+\\sqrt6\\) and ever closer ones, and a chaotic band with windows. The diagram is an illustration computed in double precision.',
    ),
    prerequisites: [text('Logistična preslikava za \\(r>3\\) (PP4).', 'The logistic map beyond \\(r=3\\) (PP4).')],
    learningGoals: [
        text('Znaš prebrati razcepe v diagramu in jih povezati s kazalcem in odčitki.', 'Can read the splits in the diagram and connect them with the cursor and the readouts.'),
        text('Veš, kaj je točno (oznaki \\(3\\) in \\(1+\\sqrt6\\)) in kaj številsko (višji razcepi, razmerja, okna).', 'Know what is exact (the marks \\(3\\) and \\(1+\\sqrt6\\)) and what numerical (the higher splits, the ratios, the windows).'),
    ],
    formulaBlocks: [formulas[0], formulas[1], formulas[2]],
    workedExamples: examples.slice(1),
    steps: pp5Steps,
    sources,
    edgeCases: edgeCasesOf([]),
    unresolvedQuestions: [],
};

export const logisticMapLesson: GuidedLesson = logisticMap;
export const bifurcationLesson: GuidedLesson = bifurcation;
