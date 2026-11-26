/**
 * Guided lesson of the recursion family, batch C (docs/specs/recursion-growth-lessons.md): RG5, exponential data and their natural logarithm, on `recursion-growth` (GrowthGraph).
 * It is the lesson of one section of the recursion chapter (the chapter registry adapts it on request; the lesson catalog holds none, as it keeps one lesson per Demonstration).
 * Scenes use only the `recursion` actions the graph registers (`set-map`, `set-interest`, `set-log`) and every scene starts from the Demonstration default and names what it sets.
 * The graph shows every readout of the logarithm panel at once, so each predicting step opens on the state before a change, asks for a prediction, names the control to change and
 * then asks to compare. The vertical axis of the logarithm panel is ln y on an ordinary scale, never a logarithmic axis (ADR 0052 section 3). Every number the text quotes is a
 * readout of the graph for that scene, a value the learner reads after an action the text asks for, or stated arithmetic; the numbers are listed per step in
 * docs/reviews/feature-streams/families-prep/notes/f3-rec-c.md.
 */
import type {LessonAction} from '../model';
import {frameDeclarer, type FrameDeclaration} from '../../graphs/base/declare/graphDeclaration';
import type {GrowthIds} from '../../graphs/recursion/GrowthGraph';
import type {FormulaBlock, GuidedLesson, GuidedLessonFrame, GuidedLessonStep, LessonScene, LocalizedText, WorkedExample} from './guidedLessons';
import type {RecursionSceneInterest} from './recursionGuidedLessons';

const text = (sl: string, en: string): LocalizedText => ({sl, en});
const frame = (id: string, kind: GuidedLessonFrame['kind'], declare?: FrameDeclaration): GuidedLessonFrame => ({id, kind, ...(declare ? {declare} : {})});
const growthFrame = frameDeclarer<GrowthIds>();

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
    /** What the observation frame asks the learner to use (the board pucks, the Orodja controls). */
    readonly observationFrame?: FrameDeclaration;
}

const step = (content: StepContent): GuidedLessonStep => ({
    ...content,
    frames: [
        frame(`${content.id}-explanation`, 'explanation'),
        ...(content.workedExampleId ? [frame(`${content.id}-calculation`, 'calculation')] : []),
        frame(`${content.id}-observation`, 'observation', content.observationFrame),
    ],
});

/** The stored logarithm-panel fields a scene may set (logQ is q times 100, y0 a whole number). */
export interface RecursionSceneLog {
    readonly y0?: number;
    readonly logQ?: number;
    readonly logModel?: 'exponential' | 'power';
}

/** What an RG5 scene sets: the panel (the Demonstration default is the sequence panel), the interest fields or the logarithm-panel fields. */
export interface RecursionLogSceneSpec {
    readonly panel?: 'interest' | 'log';
    readonly interest?: RecursionSceneInterest;
    readonly log?: RecursionSceneLog;
}

/** The actions of an RG5 scene: the Demonstration default, the panel, then the interest fields and the logarithm fields. */
export const recursionLogSceneActions = (id: string, spec: RecursionLogSceneSpec): LessonAction[] => [
    {kind: 'prepared-scene', sceneId: id, source: 'demonstration-default'},
    ...(spec.panel !== undefined ? [{kind: 'recursion', operation: 'set-map', panel: spec.panel} as const] : []),
    ...(spec.interest !== undefined ? [{kind: 'recursion', operation: 'set-interest', ...spec.interest} as const] : []),
    ...(spec.log !== undefined ? [{kind: 'recursion', operation: 'set-log', ...spec.log} as const] : []),
];

const logScene = (id: string, spec: RecursionLogSceneSpec, sl: string, en: string): LessonScene =>
    ({id, basedOn: 'demonstration-default', actions: recursionLogSceneActions(id, spec), expectedState: text(sl, en)});

/**
 * RG5: 1000 at 5 % yearly (stored rate 10) for 10 years on the interest panel (steps 1 and 2; the stored y0 = 1000 and logQ = 105 stay at their defaults), then the logarithm
 * panel with y0 = 1000 and q = 1,05 (stored 105) for steps 3 to 5; the learner changes y0 to 100, q to 2 (200) and 0,5 (50) and the model to power. Step 6 is the same
 * neutral logarithm state.
 */
export const RG5_INTEREST = {panel: 'interest', interest: {capital: 1000, rate: 10, years: 10, parts: 1}} as const;
export const RG5_LOG = {panel: 'log', log: {y0: 1000, logQ: 105, logModel: 'exponential'}} as const;
export const RG5_EXPLORE = {panel: 'log', log: {y0: 1000, logQ: 105, logModel: 'exponential'}} as const;

// ---- RG5 -------------------------------------------------------------------------------------------------------------------------

const rg5Formulas: readonly FormulaBlock[] = [
    {
        id: 'log-line',
        latex: 'y_n=y_0\\,q^n\\ \\Longrightarrow\\ \\ln y_n=\\ln y_0+n\\,\\ln q',
        notation: text(
            '\\(y_0\\) je začetna vrednost, \\(q>0\\) faktor rasti, \\(n\\) število korakov in \\(\\ln\\) naravni logaritem, torej logaritem pri osnovi \\(e\\).',
            '\\(y_0\\) is the starting value, \\(q>0\\) the growth factor, \\(n\\) the number of steps and \\(\\ln\\) the natural logarithm, that is the logarithm to the base \\(e\\).',
        ),
        explanation: text(
            'Logaritem produkta je vsota logaritmov, \\(\\ln(ab)=\\ln a+\\ln b\\), in \\(\\ln(q^n)=n\\ln q\\). Zato je \\(\\ln y_n=\\ln y_0+n\\ln q\\), izraz oblike (konstanta) + \\(n\\cdot\\)(konstanta): točke \\((n,\\ln y_n)\\) ležijo na premici. To je argument, ne ponazoritev in ne prilagajanje.',
            'The logarithm of a product is the sum of the logarithms, \\(\\ln(ab)=\\ln a+\\ln b\\), and \\(\\ln(q^n)=n\\ln q\\). So \\(\\ln y_n=\\ln y_0+n\\ln q\\), an expression of the form (a constant) + \\(n\\cdot\\)(a constant): the points \\((n,\\ln y_n)\\) lie on a line. This is an argument, not an illustration and not a fit.',
        ),
    },
    {
        id: 'log-slope',
        latex: '\\ln y_{n+1}-\\ln y_n=\\ln q,\\qquad q=e^{\\ln q},\\qquad \\log_{10}y_n=\\log_{10}y_0+n\\log_{10}q',
        notation: text(
            'Leva stran je naklon med sosednjima točkama (razlika \\(\\ln y\\), ko se \\(n\\) poveča za \\(1\\)); \\(\\log_{10}\\) je desetiški logaritem.',
            'The left side is the slope between neighbouring points (the difference of \\(\\ln y\\) when \\(n\\) increases by \\(1\\)); \\(\\log_{10}\\) is the decimal logarithm.',
        ),
        explanation: text(
            'Iz prejšnjega obrazca sledi \\(\\ln y_{n+1}-\\ln y_n=\\ln q\\) za vsak \\(n\\): naklon je natančna razlika, ne prilagoditev. Faktor rasti dobimo nazaj kot \\(q=e^{\\text{naklon}}\\). Enako velja pri desetiških logaritmih z naklonom \\(\\log_{10}q\\); graf prikazuje naravne.',
            'The previous formula gives \\(\\ln y_{n+1}-\\ln y_n=\\ln q\\) for every \\(n\\): the slope is an exact difference, not a fit. The growth factor comes back as \\(q=e^{\\text{slope}}\\). The same holds for decimal logarithms with the slope \\(\\log_{10}q\\); the graph shows natural ones.',
        ),
    },
    {
        id: 'power-contrast',
        latex: 'y_n=y_0\\,n^2\\ \\Longrightarrow\\ \\ln y_{n+1}-\\ln y_n=2\\ln\\frac{n+1}{n}',
        notation: text(
            '\\(y_0\\) je začetna vrednost in \\(n\\ge1\\) število; razlika na desni je naklon med točkama pri \\(n\\) in \\(n+1\\).',
            '\\(y_0\\) is the starting value and \\(n\\ge1\\) a number; the difference on the right is the slope between the points at \\(n\\) and \\(n+1\\).',
        ),
        explanation: text(
            'Tu je \\(\\ln y_n=\\ln y_0+2\\ln n\\) in razlika sosednjih točk \\(2\\ln\\tfrac{n+1}{n}\\) se z \\(n\\) spreminja, ker se razmerje \\(\\tfrac{n+1}{n}\\) manjša proti \\(1\\). Zato točke ne ležijo na premici. Potenčni model je ponazoritev razlike, ne drugi izrek.',
            'Here \\(\\ln y_n=\\ln y_0+2\\ln n\\) and the difference of neighbouring points \\(2\\ln\\tfrac{n+1}{n}\\) changes with \\(n\\), because the ratio \\(\\tfrac{n+1}{n}\\) decreases towards \\(1\\). So the points do not lie on a line. The power model is an illustration of a contrast, not a second theorem.',
        ),
    },
];

const rg5Examples: readonly WorkedExample[] = [
    {
        id: 'rg5-line',
        title: text('\\(1000\\cdot1{,}05^{10}\\) in njegov logaritem', '\\(1000\\cdot1.05^{10}\\) and its logarithm'),
        calculationLatex: '\\ln y_{10}=\\ln1000+10\\,\\ln1{,}05',
        resultLatex: '\\ln y_{10}\\approx6{,}907755+0{,}487902=7{,}395657',
        check: text(
            'Graf piše \\(7{,}395657\\) (izračunano) in naklon \\(0{,}04879\\); drugi sumand je \\(10\\ln1{,}05\\approx0{,}487902\\), desetkratnik natančnega naklona. Pri desetiških logaritmih je \\(\\log_{10}1{,}05\\approx0{,}0211893\\) in \\(\\log_{10}y_{10}=3+10\\cdot0{,}0211893=3{,}211893\\) (izračun, ne odčitek).',
            'The graph writes \\(7.395657\\) (computed) and the slope \\(0.04879\\); the second term is \\(10\\ln1.05\\approx0.487902\\), ten times the exact slope. With decimal logarithms \\(\\log_{10}1.05\\approx0.0211893\\) and \\(\\log_{10}y_{10}=3+10\\cdot0.0211893=3.211893\\) (a calculation, not a readout).',
        ),
    },
    {
        id: 'rg5-power',
        title: text('Naklona potenčnega modela', 'The two slopes of the power model'),
        calculationLatex: '2\\ln2,\\qquad 2\\ln\\frac{11}{10}',
        resultLatex: '2\\ln2\\approx1{,}386294,\\qquad 2\\ln1{,}1\\approx0{,}19062',
        check: text(
            'Graf piše \\(1{,}386294\\) za prvi korak in \\(0{,}19062\\) za zadnji korak; oba se ujemata z obrazcem pri \\(n=1\\) in \\(n=10\\).',
            'The graph writes \\(1.386294\\) for the first step and \\(0.19062\\) for the last step; both agree with the formula at \\(n=1\\) and \\(n=10\\).',
        ),
    },
];

const rg5Steps: readonly GuidedLessonStep[] = [
    step({
        id: 'rg5-ordinary', order: 1,
        title: text('Obrestovanje na navadni osi', 'Interest on an ordinary axis'),
        purpose: text('Napovedati rast eksponentnih podatkov z računom iz pravila.', 'Predicting the growth of exponential data by computing from the rule.'),
        explanation: text(
            'Glavnica \\(1000\\) evrov se obrestuje po \\(5\\,\\%\\) letno, obračun je letni. Graf riše več modelov; bereš krivuljo z oznako Obrestno obrestovanje, njene vrednosti ob celih letih so podatki \\(y_n\\) po \\(n\\) letih. Napoved: s pravilom, ne z grafa, izračunaj, koliko je razmerje \\(\\tfrac{y_{n+1}}{y_n}\\) dveh zaporednih letnih vrednosti in koliko evrov se vrednost poveča v prvem in koliko v drugem letu. Nato preberi vrednost po \\(10\\) letih in jo primerjaj z \\(1000\\cdot1{,}05^{10}\\).',
            'A capital of \\(1000\\) euros earns \\(5\\,\\%\\) a year, compounded yearly. The graph draws several models; you read the curve labelled Compound interest, and its values at whole years are the data \\(y_n\\) after \\(n\\) years. Prediction: using the rule, not the graph, compute the ratio \\(\\tfrac{y_{n+1}}{y_n}\\) of two successive yearly values and how many euros the value grows in the first and how many in the second year. Then read the value after \\(10\\) years and compare it with \\(1000\\cdot1.05^{10}\\).',
        ),
        formulaIds: [],
        observationPrompt: text('Zapiši razmerje zaporednih vrednosti ter prirastka prvega in drugega leta; nato preberi Obrestno obrestovanje po \\(10\\) letih.', 'Write down the ratio of successive values and the growth in the first and the second year; then read Compound interest after \\(10\\) years.'),
        expectedObservations: [text('Razmerje je \\(1{,}05\\) za vsak par; prirastek je \\(50\\) evrov v prvem in \\(52{,}50\\) evra v drugem letu, torej ni stalen. Po \\(10\\) letih graf piše \\(1628{,}89\\); krivulja se navzgor krivi.', 'The ratio is \\(1.05\\) for every pair; the growth is \\(50\\) euros in the first and \\(52.50\\) euros in the second year, so it is not constant. After \\(10\\) years the graph writes \\(1628.89\\); the curve bends upward.')],
        scene: logScene('rg5-ordinary-scene', RG5_INTEREST,
            'Obrestovanje, \\(1000\\) pri \\(5\\,\\%\\) za \\(10\\) let, letno obračunavanje: obrestno \\(1628{,}89\\).',
            'Interest, \\(1000\\) at \\(5\\,\\%\\) for \\(10\\) years, yearly compounding: compound \\(1628.89\\).'),
    }),
    step({
        id: 'rg5-predict-log', order: 2,
        observationFrame: growthFrame({uses: ['growth-panel']}),
        title: text('Vrednosti zamenjamo z logaritmi', 'Replacing the values by their logarithms'),
        purpose: text('Napovedati sliko točk \\((n,\\ln y_n)\\), preden jo graf pokaže.', 'Predicting the picture of the points \\((n,\\ln y_n)\\) before the graph shows it.'),
        explanation: text(
            'Isti podatki, \\(y_n=1000\\cdot1{,}05^n\\), so zdaj narisani na navadni osi. Napoved: vsako vrednost \\(y_n\\) nadomestimo z naravnim logaritmom \\(\\ln y_n\\) in narišemo točke \\((n,\\ln y_n)\\). Ali bodo točke ležale na krivulji ali na premici? Če na premici, kolikšen bo njen naklon približno (namig: kaj vemo o razmerju zaporednih vrednosti)? V izbirniku Prikaz izberi Logaritem y in primerjaj s svojo napovedjo.',
            'The same data, \\(y_n=1000\\cdot1.05^n\\), are drawn on an ordinary axis. Prediction: replace every value \\(y_n\\) by its natural logarithm \\(\\ln y_n\\) and draw the points \\((n,\\ln y_n)\\). Will the points lie on a curve or on a line? If on a line, roughly what slope will it have (hint: what do we know about the ratio of successive values)? In the chooser View pick Logarithm of y and compare with your prediction.',
        ),
        formulaIds: [],
        observationPrompt: text('Zapiši napoved, nato na plošči pri grafu v izbirniku Prikaz izberi Logaritem y in preberi stanje ter naklon.', 'Write down your prediction, then pick Logarithm of y on the board chooser View and read the status and the slope.'),
        expectedObservations: [text('Točke ležijo na premici z naklonom \\(0{,}04879\\); stanje piše tudi \\(\\ln q=0{,}04879\\) in \\(q\\approx1{,}05\\).', 'The points lie on a line with slope \\(0.04879\\); the status also writes \\(\\ln q=0.04879\\) and \\(q\\approx1.05\\).')],
        scene: logScene('rg5-predict-log-scene', RG5_INTEREST,
            'Obrestovanje, \\(1000\\) pri \\(5\\,\\%\\) za \\(10\\) let, letno obračunavanje, kakor v prvem koraku.',
            'Interest, \\(1000\\) at \\(5\\,\\%\\) for \\(10\\) years, yearly compounding, as in the first step.'),
    }),
    step({
        id: 'rg5-line', order: 3,
        observationFrame: growthFrame({open: ['tools']}),
        title: text('Zakaj takšna slika', 'Why this picture'),
        purpose: text('Utemeljiti sliko iz obrazca in napovedati učinek začetne vrednosti.', 'Justifying the picture from the formula and predicting the effect of the starting value.'),
        explanation: text(
            'Prikaz Logaritem y kaže \\(y_0=1000\\) in \\(q=1{,}05\\). Argument: \\(\\ln(y_0q^n)=\\ln y_0+n\\ln q\\), ker je logaritem produkta vsota logaritmov. Naklon med točkama je natančna razlika \\(\\ln y_{n+1}-\\ln y_n\\), ne prilagoditev. Graf piše \\(\\ln y_{10}=7{,}395657\\), pri čemer je \\(\\ln1000\\approx6{,}907755\\). Napoved: kaj se zgodi s točkami, če se začetna vrednost zmanjša na \\(100\\)? Za koliko se premakne premica in ali se naklon spremeni? Izračunaj nov \\(\\ln y_{10}\\) iz obrazca. Nato na drsniku Začetna vrednost vpiši \\(100\\).',
            'The logarithm panel shows \\(y_0=1000\\) and \\(q=1.05\\). Argument: \\(\\ln(y_0q^n)=\\ln y_0+n\\ln q\\), because the logarithm of a product is the sum of the logarithms. The slope between two points is the exact difference \\(\\ln y_{n+1}-\\ln y_n\\), not a fit. The graph writes \\(\\ln y_{10}=7.395657\\), where \\(\\ln1000\\approx6.907755\\). Prediction: what happens to the points if the starting value decreases to \\(100\\)? By how much does the line move and does its slope change? Compute the new \\(\\ln y_{10}\\) from the formula. Then type \\(100\\) into the slider Starting value.',
        ),
        formulaIds: ['log-line'],
        workedExampleId: 'rg5-line',
        observationPrompt: text('Zapiši napoved, nato na drsniku Začetna vrednost vpiši \\(100\\) in preberi naklon ter vrednost \\(\\ln y_{10}\\) v odčitkih.', 'Write down your prediction, then type \\(100\\) into the slider Starting value and read the slope and the value of \\(\\ln y_{10}\\).'),
        expectedObservations: [text('Premica se spusti za \\(\\ln10\\approx2{,}302585\\): \\(\\ln y_{10}\\) je \\(5{,}093072\\) namesto \\(7{,}395657\\); naklon ostane \\(0{,}04879\\).', 'The line drops by \\(\\ln10\\approx2.302585\\): \\(\\ln y_{10}\\) is \\(5.093072\\) instead of \\(7.395657\\); the slope stays \\(0.04879\\).')],
        scene: logScene('rg5-line-scene', RG5_LOG,
            'Prikaz Logaritem y, \\(y_0=1000\\), \\(q=1{,}05\\), eksponentni model: naklon \\(0{,}04879\\), \\(\\ln y_{10}=7{,}395657\\).',
            'Logarithm panel, \\(y_0=1000\\), \\(q=1.05\\), exponential model: slope \\(0.04879\\), \\(\\ln y_{10}=7.395657\\).'),
    }),
    step({
        id: 'rg5-slope', order: 4,
        observationFrame: growthFrame({uses: ['growth-logq']}),
        title: text('Naklon in faktor rasti', 'The slope and the growth factor'),
        purpose: text('Napovedati naklon pri drugih faktorjih in iz naklona prebrati \\(q\\).', 'Predicting the slope for other factors and reading \\(q\\) from the slope.'),
        explanation: text(
            'Pri \\(q=1{,}05\\) je naklon \\(0{,}04879\\), kar je \\(\\ln1{,}05\\) po zaokrožitvi na pet decimalk. Argument: \\(\\ln y_{n+1}-\\ln y_n=\\ln q\\) za vsak \\(n\\), zato naklon pove \\(\\ln q\\), faktor rasti pa je \\(q=e^{\\text{naklon}}\\). Napoved: kolikšen bo naklon pri \\(q=2\\) in kolikšen pri \\(q=0{,}5\\)? Ali bo predznak enak? Na drsniku Faktor rasti q nastavi \\(2\\), nato \\(0{,}5\\). Vrstica q iz naklona je preizkus tvoje napovedi, ne odgovor, ki ga najprej poiščeš.',
            'At \\(q=1.05\\) the slope is \\(0.04879\\), which is \\(\\ln1.05\\) rounded to five decimals. Argument: \\(\\ln y_{n+1}-\\ln y_n=\\ln q\\) for every \\(n\\), so the slope tells \\(\\ln q\\), and the growth factor is \\(q=e^{\\text{slope}}\\). Prediction: what will the slope be at \\(q=2\\) and what at \\(q=0.5\\)? Will the sign be the same? On the slider Growth factor q set \\(2\\), then \\(0.5\\). The row q from the slope (e to the slope) is a check on your prediction, not the answer you look for first.',
        ),
        formulaIds: ['log-slope'],
        observationPrompt: text('Zapiši napovedana naklona, nato na kazalcu Faktor rasti nastavi \\(2\\) in \\(0{,}5\\) ter preberi naklon in vrstico q iz naklona.', 'Write down both predicted slopes, then set \\(2\\) and \\(0.5\\) on the board control Growth factor and read the slope and the row q from the slope.'),
        expectedObservations: [text('Pri \\(q=2\\) je naklon \\(0{,}693147\\) (\\(\\ln2\\)) in q iz naklona \\(2\\); pri \\(q=0{,}5\\) je naklon \\(-0{,}693147\\), torej negativen, in q iz naklona \\(0{,}5\\).', 'At \\(q=2\\) the slope is \\(0.693147\\) (\\(\\ln2\\)) and q from the slope \\(2\\); at \\(q=0.5\\) the slope is \\(-0.693147\\), negative, and q from the slope \\(0.5\\).')],
        scene: logScene('rg5-slope-scene', RG5_LOG,
            'Prikaz Logaritem y, \\(y_0=1000\\), \\(q=1{,}05\\), eksponentni model: naklon \\(0{,}04879\\), q iz naklona \\(1{,}05\\).',
            'Logarithm panel, \\(y_0=1000\\), \\(q=1.05\\), exponential model: slope \\(0.04879\\), q from the slope \\(1.05\\).'),
    }),
    step({
        id: 'rg5-power', order: 5,
        observationFrame: growthFrame({uses: ['growth-model']}),
        title: text('Potenčna rast za primerjavo', 'Power growth for comparison'),
        purpose: text('Napovedati, ali potenčni model da premico, in primerjati s pravim razlogom.', 'Predicting whether the power model gives a line and comparing it with the reason.'),
        explanation: text(
            'Za primerjavo vzamemo podatke \\(y_n=1000\\,n^2\\), ki tudi rastejo, a po potenci in ne po faktorju. To je ponazoritev razlike, ne drugi izrek. Napoved: ali točke \\((n,\\ln y_n)\\) ležijo na premici? Če ne, kateri korak ima večji naklon, prvi ali zadnji? V izbirniku Model izberi Potenčni in primerjaj naklon prvega in zadnjega koraka.',
            'For comparison take the data \\(y_n=1000\\,n^2\\), which also grow, but by a power rather than by a factor. This is an illustration of a contrast, not a second theorem. Prediction: do the points \\((n,\\ln y_n)\\) lie on a line? If not, which step has the larger slope, the first or the last? In the chooser Model pick Power and compare the slopes of the first and the last step.',
        ),
        // The contrast formula and the two-slope example answer this step's prediction, so they are shown in the next step, after the reveal.
        formulaIds: [],
        observationPrompt: text('Zapiši napoved, nato na plošči pri grafu v izbirniku Model izberi Potenčni in preberi stanje ter Naklon prvega koraka in Naklon zadnjega koraka.', 'Write down your prediction, then pick Power on the board chooser Model and read the status and the Slope of the first step and the Slope of the last step.'),
        expectedObservations: [text('Točke niso na premici: naklon prvega koraka je \\(1{,}386294\\), zadnjega \\(0{,}19062\\); vrstica Točke na premici? piše ne.', 'The points are not on a line: the slope of the first step is \\(1.386294\\), of the last step \\(0.19062\\); the row Points on a line? writes no.')],
        scene: logScene('rg5-power-scene', RG5_LOG,
            'Prikaz Logaritem y, \\(y_0=1000\\), \\(q=1{,}05\\), eksponentni model: točke ležijo na premici z naklonom \\(0{,}04879\\).',
            'Logarithm panel, \\(y_0=1000\\), \\(q=1.05\\), exponential model: the points lie on a line with slope \\(0.04879\\).'),
    }),
    step({
        id: 'rg5-explore', order: 6,
        title: text('Prosto raziskovanje', 'Free exploration'),
        purpose: text('Preizkusiti zvezo med \\(q\\) in naklonom na svojih številih.', 'Testing the link between \\(q\\) and the slope on your own numbers.'),
        explanation: text(
            'Spreminjaj začetno vrednost, faktor rasti in model ter napovej naklon, preden ga prebereš. Zdaj je prikazano \\(y_0=1000\\) in \\(q=1{,}05\\). Pri \\(q=1\\) je \\(\\ln q=0\\), torej točke ležijo na vodoravni premici; pri \\(q>1\\) je naklon pozitiven, pri \\(q<1\\) je negativen. Premik \\(y_0\\) premakne premico, naklona ne spremeni. Vse to velja za eksponentni model; pri potenčnem premice ni.',
            'Change the starting value, the growth factor and the model and predict the slope before you read it. Now \\(y_0=1000\\) and \\(q=1.05\\) are shown. At \\(q=1\\) we have \\(\\ln q=0\\), so the points lie on a horizontal line; for \\(q>1\\) the slope is positive, for \\(q<1\\) it is negative. Changing \\(y_0\\) moves the line without changing the slope. All this holds for the exponential model; the power model gives no line.',
        ),
        formulaIds: ['power-contrast'],
        workedExampleId: 'rg5-power',
        observationPrompt: text('Poišči faktor rasti, pri katerem se vrednost vsak korak podvoji, in tistega, pri katerem se razpolovi; napovej naklona in ju preveri.', 'Find the growth factor at which the value doubles every step and the one at which it halves; predict the slopes and check them.'),
        expectedObservations: [text('Podvojitev: \\(q=2\\), naklon \\(0{,}693147\\); razpolovitev: \\(q=0{,}5\\), naklon \\(-0{,}693147\\). Pri \\(q=1\\) je naklon \\(0\\).', 'Doubling: \\(q=2\\), slope \\(0.693147\\); halving: \\(q=0.5\\), slope \\(-0.693147\\). At \\(q=1\\) the slope is \\(0\\).')],
        scene: logScene('rg5-explore-scene', RG5_EXPLORE,
            'Prikaz Logaritem y, \\(y_0=1000\\), \\(q=1{,}05\\), eksponentni model: naklon \\(0{,}04879\\).',
            'Logarithm panel, \\(y_0=1000\\), \\(q=1.05\\), exponential model: slope \\(0.04879\\).'),
    }),
];

// ---- Lesson ----------------------------------------------------------------------------------------------------------------------

const sources: GuidedLesson['sources'] = [
    {
        id: 'bezeg-recursion-implementation',
        citation: 'Bezeg source: src/recursion/ (sequences, interest, logarithm panel, state model) and src/graphs/recursion/GrowthGraph.tsx.',
        implementationCorrespondence: 'A scene sets the panel and the stored fields of the growth graph; every number is a readout of that graph (whole numbers exact, decimals computed in double precision), the text quotes only values of those scenes, values the learner reads after an action the text asks for, or stated arithmetic. The vertical axis of the logarithm panel is ln y on an ordinary scale, not a true logarithmic scale; the slope through exact points is an exact difference quotient, not a fit.',
    },
];

export const recursionLogScaleLesson: GuidedLesson = {
    demonstrationId: 'recursion-growth',
    title: text('Eksponentni podatki in njihov logaritem', 'Exponential data and their logarithm'),
    summary: text(
        'Podatke \\(y_n=y_0q^n\\) primerjamo z njihovimi naravnimi logaritmi \\(\\ln y_n\\): kakšno sliko dajo točke \\((n,\\ln y_n)\\), kaj pove naklon in kaj se zgodi pri potenčnih podatkih \\(y_n=y_0n^2\\).',
        'We compare the data \\(y_n=y_0q^n\\) with their natural logarithms \\(\\ln y_n\\): what picture the points \\((n,\\ln y_n)\\) make, what the slope tells, and what happens for the power data \\(y_n=y_0n^2\\).',
    ),
    prerequisites: [text('Lekciji o zaporedjih in o obrestnem obrestovanju (prvi dve lekciji poglavja) ter pojem logaritma.', 'The lessons on sequences and on compound interest (the first two lessons of the chapter) and the notion of a logarithm.')],
    learningGoals: [
        text('Znaš utemeljiti, da \\(y_n=y_0q^n\\) da \\(\\ln y_n=\\ln y_0+n\\ln q\\), torej točke na premici.', 'Can justify that \\(y_n=y_0q^n\\) gives \\(\\ln y_n=\\ln y_0+n\\ln q\\), that is points on a line.'),
        text('Iz naklona znaš prebrati \\(\\ln q\\) in faktor rasti \\(q=e^{\\text{naklon}}\\).', 'Can read \\(\\ln q\\) from the slope and the growth factor \\(q=e^{\\text{slope}}\\).'),
        text('Znaš primerjati eksponentno in potenčno rast na prikazu \\(\\ln y\\) in veš, da je navpična os \\(\\ln y\\) na navadnem merilu.', 'Can compare exponential and power growth on the \\(\\ln y\\) panel and know that the vertical axis is \\(\\ln y\\) on an ordinary scale.'),
    ],
    formulaBlocks: rg5Formulas,
    workedExamples: rg5Examples,
    steps: rg5Steps,
    sources,
    edgeCases: [
        text('Pri \\(q=1\\) je naklon \\(0\\) in točke ležijo na vodoravni premici; pri \\(q<1\\) je naklon negativen. Faktor \\(q\\) mora biti pozitiven, saj \\(\\ln q\\) sicer ni definiran.', 'At \\(q=1\\) the slope is \\(0\\) and the points lie on a horizontal line; for \\(q<1\\) the slope is negative. The factor \\(q\\) must be positive, since otherwise \\(\\ln q\\) is not defined.'),
        text('Navpična os kaže \\(\\ln y\\) na navadnem merilu in ni pravo logaritemsko merilo. Vrednosti so izračunane z decimalkami, zato so naklon in \\(q\\) iz naklona približni.', 'The vertical axis shows \\(\\ln y\\) on an ordinary scale and is not a true logarithmic scale. Values are computed with decimals, so the slope and q from the slope are approximate.'),
        text('Izbrani primer \\(1000\\cdot1{,}05^n\\) je ponazoritev; obrazec velja za vsak \\(y_0>0\\) in \\(q>0\\). Potenčni model je le primerjava.', 'The chosen example \\(1000\\cdot1.05^n\\) is an illustration; the formula holds for every \\(y_0>0\\) and \\(q>0\\). The power model is only a comparison.'),
    ],
    unresolvedQuestions: [],
};
