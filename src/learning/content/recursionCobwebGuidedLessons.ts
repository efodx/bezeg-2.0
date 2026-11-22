/**
 * Guided lessons of the recursion family, batch B (docs/specs/recursion-growth-lessons.md): RG2, the cobweb of the line and of the cosine, and RG4, the cobweb of the logistic rule,
 * both on `recursion-cobweb` (RecursionCobwebGraph). Each is the lesson of one section of the recursion chapter (the chapter registry adapts them on request; the lesson catalog holds
 * none, as it keeps one lesson per Demonstration). Scenes use only the `recursion` actions the cobweb graph registers (`set-map`, `set-params`, `set-start`, `set-step`) and every
 * scene starts from the Demonstration default and names what it sets. The graph shows everything at step 0 (the verdict in the status, the fixed point, the slope and the shape in
 * the rows), so every predicting step opens on the previous parameters, asks for a prediction about a change and then names the control that makes the change. Every number the text
 * quotes is a readout of the graph for that scene, a value the learner reads after an action the text asks for, or stated arithmetic; the numbers are listed per step in
 * docs/reviews/feature-streams/families-prep/notes/f3-rec-b.md.
 */
import type {LessonAction} from '../model';
import type {FrameUx} from '../../uxPicks/declare/graphUx';
import type {FormulaBlock, GuidedLesson, GuidedLessonFrame, GuidedLessonStep, LessonScene, LocalizedText} from './guidedLessons';

const text = (sl: string, en: string): LocalizedText => ({sl, en});
const frame = (id: string, kind: GuidedLessonFrame['kind'], ux?: FrameUx): GuidedLessonFrame => ux ? {id, kind, ux} : {id, kind};

interface StepContent {
    readonly id: string;
    readonly order: number;
    readonly title: LocalizedText;
    readonly purpose: LocalizedText;
    readonly explanation: LocalizedText;
    readonly formulaIds: readonly string[];
    readonly observationPrompt: LocalizedText;
    readonly expectedObservations: readonly LocalizedText[];
    readonly scene: LessonScene;
    /** Per-frame declarations (see {@link FrameUx}). */
    readonly ux?: {readonly explanation?: FrameUx; readonly observation?: FrameUx};
}

const step = ({ux, ...content}: StepContent): GuidedLessonStep => ({
    ...content,
    frames: [frame(`${content.id}-explanation`, 'explanation', ux?.explanation), frame(`${content.id}-observation`, 'observation', ux?.observation)],
});

/** The stored cobweb fields a scene may set: the map, m = M/20, c = C/10, r = R/10 (5..29), x0 = X/100 and the drawn step (0..60). */
export interface CobwebSceneSpec {
    readonly map?: 'affine' | 'cosine' | 'logistic';
    readonly M?: number;
    readonly C?: number;
    readonly R?: number;
    readonly X?: number;
    readonly step?: number;
}

/** The Demonstration default R: a `set-params` with R = 15 on the logistic map changes nothing and so would leave the chooser notice about the start in the status. */
const DEFAULT_R = 15;

/**
 * The actions of a cobweb scene: the Demonstration default, then the map (the start falls back as the map chooser does), the parameters, the start and the step. On the logistic map
 * with R = 15 the parameter is first set to 12, so that the write of R changes the state and the notice "the start is set to 0,1" of the chooser is gone from the status.
 */
export const cobwebSceneActions = (id: string, spec: CobwebSceneSpec): LessonAction[] => {
    const params = {...(spec.M !== undefined ? {M: spec.M} : {}), ...(spec.C !== undefined ? {C: spec.C} : {}), ...(spec.R !== undefined ? {R: spec.R} : {})};
    return [
        {kind: 'prepared-scene', sceneId: id, source: 'demonstration-default'},
        ...(spec.map !== undefined ? [{kind: 'recursion', operation: 'set-map', map: spec.map} as const] : []),
        ...(spec.map === 'logistic' && spec.R === DEFAULT_R ? [{kind: 'recursion', operation: 'set-params', R: 12} as const] : []),
        ...(Object.keys(params).length > 0 ? [{kind: 'recursion', operation: 'set-params', ...params} as const] : []),
        ...(spec.X !== undefined ? [{kind: 'recursion', operation: 'set-start', X: spec.X} as const] : []),
        ...(spec.step !== undefined ? [{kind: 'recursion', operation: 'set-step', step: spec.step} as const] : []),
    ];
};

const cobwebScene = (id: string, spec: CobwebSceneSpec, sl: string, en: string): LessonScene =>
    ({id, basedOn: 'demonstration-default', actions: cobwebSceneActions(id, spec), expectedState: text(sl, en)});

/**
 * RG2: the Demonstration default (m = 0,5, c = 1, x0 = 0) opens steps 1, 2, 3, 6 and 7. The learner types m = -0,8, c = 9, x0 = 1 (RG2_SPIRAL, the opening of step 4), then m = -1,2,
 * c = 10, x0 = 4,6 (RG2_OUT, the opening of step 5); in step 5 only m is typed. RG2_COSINE is the state after the learner chooses the cosine in step 6.
 */
export const RG2_DEFAULT = {} as const;
export const RG2_SPIRAL = {M: -16, C: 90, X: 100} as const;
export const RG2_OUT = {M: -24, C: 100, X: 460} as const;
export const RG2_COSINE = {map: 'cosine'} as const;
export const RG2_EXPLORE = RG2_DEFAULT;

/**
 * RG4: logistic, start 0,1. Step 1 opens on r = 1,2 and the learner types r = 1,5 (RG4_STAIRCASE, the opening of steps 2, 3 and 6); then r = 2,5 (RG4_SPIRAL, the opening of step 4), r = 2,9
 * (RG4_SLOW, the opening of step 5), r = 0,8 and r = 1 (RG4_EXTINCTION, RG4_BORDER); in step 6 the learner types r = 2,2 and r = 1,1.
 */
export const RG4_START = {map: 'logistic', R: 12} as const;
export const RG4_STAIRCASE = {map: 'logistic', R: 15} as const;
export const RG4_SPIRAL = {map: 'logistic', R: 25} as const;
export const RG4_SLOW = {map: 'logistic', R: 29} as const;
export const RG4_EXTINCTION = {map: 'logistic', R: 8} as const;
export const RG4_BORDER = {map: 'logistic', R: 10} as const;
export const RG4_SLOPE = {map: 'logistic', R: 22} as const;
export const RG4_EXPLORE = RG4_STAIRCASE;

// ---- RG2 -------------------------------------------------------------------------------------------------------------------------

const rg2Formulas: readonly FormulaBlock[] = [
    {
        id: 'affine-fixed-point',
        latex: 'x_{n+1}=m\\,x_n+c,\\qquad x^*=m\\,x^*+c\\ \\Longrightarrow\\ x^*=\\frac{c}{1-m}\\quad(m\\ne1)',
        notation: text(
            '\\(m\\) je naklon premice, \\(c\\) prosti člen, \\(x_n\\) \\(n\\)-ti iterat (začetek je \\(x_0\\)) in \\(x^*\\) negibna točka, to je točka, v kateri premica seka diagonalo \\(y=x\\).',
            '\\(m\\) is the slope of the line, \\(c\\) the intercept, \\(x_n\\) the \\(n\\)-th iterate (the start is \\(x_0\\)) and \\(x^*\\) the fixed point, the point where the line meets the diagonal \\(y=x\\).',
        ),
        explanation: text(
            'Negibna točka se pri pravilu ne premakne, zato mora veljati \\(x^*=m\\,x^*+c\\). Če \\(x^*\\) izrazimo, dobimo \\(x^*=\\tfrac{c}{1-m}\\); pri \\(m=1\\) deljenje ni mogoče.',
            'A fixed point is not moved by the rule, so \\(x^*=m\\,x^*+c\\) must hold. Solving for \\(x^*\\) gives \\(x^*=\\tfrac{c}{1-m}\\); for \\(m=1\\) the division is not possible.',
        ),
    },
    {
        id: 'affine-error',
        latex: 'x_{n+1}-x^*=m\\,(x_n-x^*),\\qquad x_n-x^*=m^{\\,n}\\,(x_0-x^*)',
        notation: text(
            'Razlika \\(x_n-x^*\\) je napaka: za koliko je \\(n\\)-ti iterat od negibne točke.',
            'The difference \\(x_n-x^*\\) is the error: how far the \\(n\\)-th iterate is from the fixed point.',
        ),
        explanation: text(
            'Argument: od \\(x_{n+1}=m\\,x_n+c\\) odštejemo \\(x^*=m\\,x^*+c\\) in dobimo \\(x_{n+1}-x^*=m\\,(x_n-x^*)\\). Napaka se v vsakem koraku pomnoži z \\(m\\), po \\(n\\) korakih zato z \\(m^n\\). Obrazec velja za vsako premico z \\(m\\ne1\\) in vsak začetek.',
            'Argument: subtract \\(x^*=m\\,x^*+c\\) from \\(x_{n+1}=m\\,x_n+c\\) and \\(x_{n+1}-x^*=m\\,(x_n-x^*)\\) follows. The error is multiplied by \\(m\\) in every step, so by \\(m^n\\) after \\(n\\) steps. The formula holds for every line with \\(m\\ne1\\) and every start.',
        ),
    },
];

const rg2Steps: readonly GuidedLessonStep[] = [
    step({
        id: 'rg2-line-diagonal', order: 1,
        ux: {explanation: {open: ['readouts', 'legend'], highlight: ['slope', 'fixed']}, observation: {open: ['readouts']}},
        title: text('Premica, diagonala in en korak', 'The line, the diagonal and one step'),
        purpose: text('Napovedati prve iterate, preden jih graf pokaže.', 'Predicting the first iterates before the graph shows them.'),
        explanation: text(
            'Pravilo \\(x_{n+1}=m\\,x_n+c\\) ponavljamo: iz \\(x_n\\) dobimo \\(x_{n+1}\\). Graf kaže premico \\(y=0{,}5\\,x+1\\) in diagonalo \\(y=x\\). Pajkova mreža naredi en korak takole: iz točke \\(x_n\\) na diagonali pojdi navpično do premice, višina je \\(x_{n+1}\\), nato vodoravno nazaj do diagonale, da je \\(x_{n+1}\\) nov začetek. Negibna točka \\(x^*\\) je tam, kjer premica seka diagonalo: iz \\(x=0{,}5\\,x+1\\) dobimo \\(x^*=\\tfrac{1}{1-0{,}5}=2\\). Začetek je \\(x_0=0\\) in noben korak še ni narisan. Napoved: izračunaj \\(x_1\\), \\(x_2\\) in \\(x_3\\). Napoved zapiši, nato \\(3\\)-krat pritisni Naslednji korak.',
            'The rule \\(x_{n+1}=m\\,x_n+c\\) is applied again and again: from \\(x_n\\) we get \\(x_{n+1}\\). The graph shows the line \\(y=0.5\\,x+1\\) and the diagonal \\(y=x\\). The cobweb makes one step like this: from the point \\(x_n\\) on the diagonal go vertically to the line, its height is \\(x_{n+1}\\), then horizontally back to the diagonal, so that \\(x_{n+1}\\) is the new start. The fixed point \\(x^*\\) is where the line meets the diagonal: from \\(x=0.5\\,x+1\\) we get \\(x^*=\\tfrac{1}{1-0.5}=2\\). The start is \\(x_0=0\\) and no step is drawn yet. Prediction: compute \\(x_1\\), \\(x_2\\) and \\(x_3\\). Write the prediction down, then press Next step \\(3\\) times.',
        ),
        formulaIds: ['affine-fixed-point'],
        observationPrompt: text('Zapiši napoved za \\(x_1\\), \\(x_2\\), \\(x_3\\); nato \\(3\\)-krat pritisni Naslednji korak in preberi odčitek Iterat \\(x_3\\).', 'Write down your prediction for \\(x_1\\), \\(x_2\\), \\(x_3\\); then press Next step \\(3\\) times and read the readout Iterate \\(x_3\\).'),
        expectedObservations: [text('Iterati so \\(1;\\ 1{,}5;\\ 1{,}75\\): naraščajo proti \\(x^*=2\\) in ga ne prestopijo; mreža ima obliko stopnic.', 'The iterates are \\(1;\\ 1.5;\\ 1.75\\): they increase towards \\(x^*=2\\) and do not cross it; the cobweb is a staircase.')],
        scene: cobwebScene('rg2-line-diagonal-scene', RG2_DEFAULT,
            'Premica \\(m=0{,}5\\), \\(c=1\\), \\(x_0=0\\), korak \\(0\\): \\(x^*=2\\), naklon \\(0{,}5\\), stopnice.',
            'The line \\(m=0.5\\), \\(c=1\\), \\(x_0=0\\), step \\(0\\): \\(x^*=2\\), slope \\(0.5\\), a staircase.'),
    }),
    step({
        id: 'rg2-play', order: 2,
        ux: {observation: {open: ['readouts']}},
        title: text('Koliko korakov do bližine', 'How many steps to get close'),
        purpose: text('Z napako, ki se v vsakem koraku pomnoži z \\(m\\), napovedati število korakov.', 'Using the error that is multiplied by \\(m\\) in every step to predict a number of steps.'),
        explanation: text(
            'Argument: ker je \\(x^*=m\\,x^*+c\\), je \\(x_{n+1}-x^*=m\\,(x_n-x^*)\\). Napaka, to je razdalja do \\(x^*\\), se v vsakem koraku pomnoži z \\(m\\), po \\(n\\) korakih je \\(x_n-x^*=m^n\\,(x_0-x^*)\\). Obrazec velja za vsako premico z \\(m\\neq1\\) (takrat \\(x^*\\) obstaja); izpeljemo ga z odštevanjem enačb. Tu je \\(m=0{,}5\\) in \\(x_0-x^*=0-2=-2\\). Napoved: pri katerem koraku \\(n\\) je \\(x_n\\) prvič od \\(x^*\\) oddaljen za manj kot \\(0{,}001\\)? Reši neenačbo, napoved zapiši, nato pritiskaj Naslednji korak ali pritisni Predvajaj in Premor. Če greš predaleč, pritisni Ponastavi.',
            'Argument: since \\(x^*=m\\,x^*+c\\), we have \\(x_{n+1}-x^*=m\\,(x_n-x^*)\\). The error, the distance to \\(x^*\\), is multiplied by \\(m\\) in every step, and after \\(n\\) steps \\(x_n-x^*=m^n\\,(x_0-x^*)\\). The formula holds for every line with \\(m\\neq1\\) (then \\(x^*\\) exists); it follows by subtracting the equations. Here \\(m=0.5\\) and \\(x_0-x^*=0-2=-2\\). Prediction: at which step \\(n\\) is \\(x_n\\) for the first time closer than \\(0.001\\) to \\(x^*\\)? Solve the inequality, write the prediction down, then press Next step repeatedly or press Play and Pause. If you go too far, press Reset.',
        ),
        formulaIds: ['affine-error'],
        observationPrompt: text('Zapiši napoved za \\(n\\), nato pritiskaj Naslednji korak in preberi števec ter odčitek Iterat \\(x_n\\).', 'Write down your prediction for \\(n\\), then press Next step repeatedly and read the counter and the readout Iterate \\(x_n\\).'),
        expectedObservations: [text('Pri \\(n=11\\) je \\(x_{11}=1{,}999023\\) (izračunano); napaka je \\(2\\cdot0{,}5^{11}\\), približno \\(0{,}000977\\), pri \\(n=10\\) je \\(2\\cdot0{,}5^{10}\\), približno \\(0{,}001953\\), še prevelika.', 'At \\(n=11\\) we have \\(x_{11}=1.999023\\) (computed); the error is \\(2\\cdot0.5^{11}\\), approximately \\(0.000977\\), while at \\(n=10\\) it is \\(2\\cdot0.5^{10}\\), approximately \\(0.001953\\), still too large.')],
        scene: cobwebScene('rg2-play-scene', RG2_DEFAULT,
            'Premica \\(m=0{,}5\\), \\(c=1\\), \\(x_0=0\\), korak \\(0\\); po \\(11\\) korakih \\(x_{11}=1{,}999023\\) (izračunano).',
            'The line \\(m=0.5\\), \\(c=1\\), \\(x_0=0\\), step \\(0\\); after \\(11\\) steps \\(x_{11}=1.999023\\) (computed).'),
    }),
    step({
        id: 'rg2-negative-slope', order: 3,
        ux: {observation: {open: ['readouts']}},
        title: text('Naklon pod ničlo', 'A slope below zero'),
        purpose: text('Napovedati, kaj se zgodi, ko je \\(m\\) negativen.', 'Predicting what happens when \\(m\\) is negative.'),
        explanation: text(
            'Doslej je bil naklon pozitiven. Preizkusimo premico z \\(m=-0{,}8\\), \\(c=9\\) in začetkom \\(x_0=1\\). Z obrazcema iz prejšnjih korakov izračunaj \\(x^*\\) in napovej: na kateri strani \\(x^*\\) pristane \\(x_1\\)? Se mreža še približuje \\(x^*\\)? Je za bližino \\(0{,}001\\) potrebnih manj ali več kot \\(11\\) korakov? Napoved zapiši. Nato v polja Naklon \\(m\\), Prosti člen \\(c\\) in Začetek \\(x_0\\) vpiši \\(-0{,}8\\), \\(9\\) in \\(1\\), preberi Negibna točka \\(x^*\\) in Oblika mreže ter \\(4\\)-krat pritisni Naslednji korak. Nazadnje pritisni Predvajaj, da se mreža nariše do konca.',
            'So far the slope was positive. Try the line with \\(m=-0.8\\), \\(c=9\\) and the start \\(x_0=1\\). With the formulas of the previous steps compute \\(x^*\\) and predict: on which side of \\(x^*\\) does \\(x_1\\) land? Does the cobweb still approach \\(x^*\\)? Are fewer or more than \\(11\\) steps needed to get within \\(0.001\\)? Write the prediction down. Then type \\(-0.8\\), \\(9\\) and \\(1\\) into the fields Slope \\(m\\), Intercept \\(c\\) and Start \\(x_0\\), read Fixed point \\(x^*\\) and Shape of the cobweb, and press Next step \\(4\\) times. Finally press Play to draw the cobweb to the end.',
        ),
        formulaIds: ['affine-fixed-point', 'affine-error'],
        observationPrompt: text('Zapiši napoved, nato vpiši vrednosti in primerjaj odčitke Iterat \\(x_1\\) do \\(x_4\\) in Iterat \\(x_{60}\\) z napovedjo.', 'Write down the prediction, then type the values and compare the readouts Iterate \\(x_1\\) to \\(x_4\\) and Iterate \\(x_{60}\\) with it.'),
        expectedObservations: [text('\\(x^*=5\\), spirala; \\(x_1=8{,}2\\), \\(x_2=2{,}44\\), \\(x_3=7{,}048\\), \\(x_4=3{,}3616\\), iterati se izmenjujejo okoli \\(x^*\\); \\(x_{11}\\approx 5{,}343597\\) še ni znotraj \\(0{,}001\\), \\(x_{38}\\approx 4{,}999169\\) je, \\(x_{60}\\) je približno \\(4{,}999994\\).', '\\(x^*=5\\), a spiral; \\(x_1=8.2\\), \\(x_2=2.44\\), \\(x_3=7.048\\), \\(x_4=3.3616\\), the iterates alternate around \\(x^*\\); \\(x_{11}\\approx 5.343597\\) is not yet within \\(0.001\\), \\(x_{38}\\approx 4.999169\\) is, \\(x_{60}\\) is approximately \\(4.999994\\).')],
        scene: cobwebScene('rg2-negative-slope-scene', RG2_DEFAULT,
            'Premica \\(m=0{,}5\\), \\(c=1\\), \\(x_0=0\\), korak \\(0\\); učenec vpiše \\(m=-0{,}8\\), \\(c=9\\), \\(x_0=1\\).',
            'The line \\(m=0.5\\), \\(c=1\\), \\(x_0=0\\), step \\(0\\); the learner types \\(m=-0.8\\), \\(c=9\\), \\(x_0=1\\).'),
    }),
    step({
        id: 'rg2-repelling', order: 4,
        ux: {observation: {open: ['readouts']}},
        title: text('Naklon \\(-1{,}2\\)', 'The slope \\(-1.2\\)'),
        purpose: text('Z napako, pomnoženo z \\(m\\), napovedati obnašanje mreže, ko začetek leži blizu \\(x^*\\).', 'Using the error multiplied by \\(m\\) to predict the behaviour of the cobweb when the start is close to \\(x^*\\).'),
        explanation: text(
            'Zdaj je prikazana premica \\(m=-0{,}8\\), \\(c=9\\), \\(x_0=1\\). Spremenimo jo v \\(m=-1{,}2\\), \\(c=10\\), \\(x_0=4{,}6\\). Izračunaj \\(x^*=\\tfrac{10}{1-(-1{,}2)}\\) kot ulomek in oceni, kako daleč od njega je \\(x_0\\). Napoved: je napaka po vsakem koraku manjša ali večja kot prej, in na kateri strani \\(x^*\\) je \\(x_1\\)? Začetek je blizu \\(x^*\\); kaj naredi mreža po \\(60\\) korakih? Napoved zapiši. Nato vpiši \\(-1{,}2\\), \\(10\\) in \\(4{,}6\\) v polja Naklon \\(m\\), Prosti člen \\(c\\) in Začetek \\(x_0\\), \\(4\\)-krat pritisni Naslednji korak in nazadnje Predvajaj.',
            'The line \\(m=-0.8\\), \\(c=9\\), \\(x_0=1\\) is shown. Change it to \\(m=-1.2\\), \\(c=10\\), \\(x_0=4.6\\). Compute \\(x^*=\\tfrac{10}{1-(-1.2)}\\) as a fraction and estimate how far \\(x_0\\) is from it. Prediction: is the error after every step smaller or larger than before, and on which side of \\(x^*\\) is \\(x_1\\)? The start is close to \\(x^*\\); what does the cobweb do after \\(60\\) steps? Write the prediction down. Then type \\(-1.2\\), \\(10\\) and \\(4.6\\) into the fields Slope \\(m\\), Intercept \\(c\\) and Start \\(x_0\\), press Next step \\(4\\) times and finally Play.',
        ),
        formulaIds: ['affine-error'],
        observationPrompt: text('Zapiši napoved, nato vpiši vrednosti in preberi Negibna točka \\(x^*\\), Iterat \\(x_1\\) do \\(x_4\\) ter na koncu Iterat \\(x_{60}\\).', 'Write down the prediction, then type the values and read Fixed point \\(x^*\\), Iterate \\(x_1\\) to \\(x_4\\) and finally Iterate \\(x_{60}\\).'),
        expectedObservations: [text('\\(x^*=\\tfrac{50}{11}\\), približno \\(4{,}545455\\), odbojna; \\(x_1=4{,}48\\), \\(x_2=4{,}624\\), \\(x_3=4{,}4512\\), \\(x_4=4{,}65856\\): odmiki od \\(x^*\\) se izmenjujejo in rastejo s faktorjem \\(1{,}2\\); \\(x_{60}\\) je približno \\(3078{,}046237\\).', '\\(x^*=\\tfrac{50}{11}\\), approximately \\(4.545455\\), repelling; \\(x_1=4.48\\), \\(x_2=4.624\\), \\(x_3=4.4512\\), \\(x_4=4.65856\\): the distances from \\(x^*\\) alternate in sign and grow by the factor \\(1.2\\); \\(x_{60}\\) is approximately \\(3078.046237\\).')],
        scene: cobwebScene('rg2-repelling-scene', RG2_SPIRAL,
            'Premica \\(m=-0{,}8\\), \\(c=9\\), \\(x_0=1\\), korak \\(0\\); učenec vpiše \\(m=-1{,}2\\), \\(c=10\\), \\(x_0=4{,}6\\).',
            'The line \\(m=-0.8\\), \\(c=9\\), \\(x_0=1\\), step \\(0\\); the learner types \\(m=-1.2\\), \\(c=10\\), \\(x_0=4.6\\).'),
    }),
    step({
        id: 'rg2-borderline', order: 5,
        ux: {observation: {open: ['readouts']}},
        title: text('Naklon \\(-1\\) in \\(1\\)', 'The slopes \\(-1\\) and \\(1\\)'),
        purpose: text('Napovedati, kaj se zgodi na meji \\(\\lvert m\\rvert=1\\).', 'Predicting what happens on the boundary \\(\\lvert m\\rvert=1\\).'),
        explanation: text(
            'Prikazana je premica \\(m=-1{,}2\\), \\(c=10\\), \\(x_0=4{,}6\\). Spremeni samo naklon, \\(c\\) in \\(x_0\\) ostaneta. Najprej napovej za \\(m=-1\\): koliko je \\(x^*\\), kaj naredijo \\(x_1\\), \\(x_2\\), \\(x_3\\) in kako se napaka spremeni v enem koraku? Napoved zapiši, nato v polje Naklon \\(m\\) vpiši \\(-1\\), preberi stanje in Obliko mreže ter \\(3\\)-krat pritisni Naslednji korak. Nato napovej za \\(m=1\\): ali ima obrazec \\(x^*=\\tfrac{c}{1-m}\\) smisel in kaj dodaja vsak korak? Vpiši \\(1\\) in nato še \\(c=0\\) in preberi stanje. Graf oznako določi iz celoštevilskih parametrov \\(m\\) in \\(c\\), ne iz izračunanih iteratov.',
            'The line \\(m=-1.2\\), \\(c=10\\), \\(x_0=4.6\\) is shown. Change only the slope; \\(c\\) and \\(x_0\\) stay. First predict for \\(m=-1\\): what is \\(x^*\\), what do \\(x_1\\), \\(x_2\\), \\(x_3\\) do, and how does the error change in one step? Write the prediction down, then type \\(-1\\) into the field Slope \\(m\\), read the status and the Shape of the cobweb and press Next step \\(3\\) times. Then predict for \\(m=1\\): does the formula \\(x^*=\\tfrac{c}{1-m}\\) make sense and what does every step add? Type \\(1\\) and then also \\(c=0\\) and read the status. The graph decides the label from the whole-number parameters \\(m\\) and \\(c\\), not from the computed iterates.',
        ),
        formulaIds: ['affine-fixed-point', 'affine-error'],
        observationPrompt: text('Zapiši napoved, nato vpiši \\(m=-1\\), nato \\(m=1\\), nato \\(c=0\\) in pri vsakem preberi stanje.', 'Write down the prediction, then type \\(m=-1\\), then \\(m=1\\), then \\(c=0\\) and read the status each time.'),
        expectedObservations: [text('\\(m=-1\\): Dvojni cikel, \\(x^*=5\\), zaprt kvadrat, iterati \\(5{,}4;\\ 4{,}6;\\ 5{,}4\\), napaka se samo obrne. \\(m=1\\), \\(c=10\\): Negibne točke ni, vsak korak doda \\(c=10\\). \\(m=1\\), \\(c=0\\): Vsaka točka je negibna.', '\\(m=-1\\): 2-cycle, \\(x^*=5\\), a closed square, the iterates \\(5.4;\\ 4.6;\\ 5.4\\), the error only changes sign. \\(m=1\\), \\(c=10\\): There is no fixed point, every step adds \\(c=10\\). \\(m=1\\), \\(c=0\\): Every point is fixed.')],
        scene: cobwebScene('rg2-borderline-scene', RG2_OUT,
            'Premica \\(m=-1{,}2\\), \\(c=10\\), \\(x_0=4{,}6\\), korak \\(0\\); učenec vpiše \\(m=-1\\), nato \\(m=1\\), nato \\(c=0\\).',
            'The line \\(m=-1.2\\), \\(c=10\\), \\(x_0=4.6\\), step \\(0\\); the learner types \\(m=-1\\), then \\(m=1\\), then \\(c=0\\).'),
    }),
    step({
        id: 'rg2-cosine', order: 6,
        ux: {observation: {open: ['readouts']}},
        title: text('Krivulja namesto premice', 'A curve instead of a line'),
        purpose: text('Napovedati, kako naklon pri negibni točki krivulje nadomesti \\(m\\), in to preveriti na kosinusu.', 'Predicting how the slope at the fixed point of a curve takes the place of \\(m\\), and checking it on the cosine.'),
        explanation: text(
            'Preslikava ni nujno premica. Za \\(f(x)=\\cos x\\) negibne točke ne moremo izraziti z obrazcem: \\(x^*\\) je rešitev enačbe \\(\\cos x=x\\), graf jo izračuna številsko. Blizu \\(x^*\\) je krivulja skoraj enaka svoji tangenti z naklonom \\(f^{\\prime}(x^*)=-\\sin x^*\\); kar pri premici velja za \\(\\lvert m\\rvert<1\\), velja blizu \\(x^*\\) približno tudi za krivuljo z \\(\\lvert f^{\\prime}(x^*)\\rvert<1\\). To je lokalna trditev in ponazoritev, ne dokaz za vse začetke. Pogled grafa se ne spremeni sam; približaš ga z gumbom Približaj graf. Napoved: se mreža kosinusa približuje \\(x^*\\) in ali ima obliko stopnic ali spirale? Napoved zapiši, nato v seznamu Preslikava izberi Kosinus \\(x\\mapsto\\cos x\\), preberi Negibna točka \\(x^*\\) in Naklon pri negibni točki (izračunano) in \\(8\\)-krat pritisni Naslednji korak.',
            'The map need not be a line. For \\(f(x)=\\cos x\\) the fixed point cannot be given by a formula: \\(x^*\\) solves the equation \\(\\cos x=x\\), and the graph computes it numerically. Near \\(x^*\\) the curve is almost its tangent line with the slope \\(f^{\\prime}(x^*)=-\\sin x^*\\); what holds for a line with \\(\\lvert m\\rvert<1\\) holds approximately near \\(x^*\\) for a curve with \\(\\lvert f^{\\prime}(x^*)\\rvert<1\\) too. This is a local statement and an illustration, not a proof for all starts. The view of the graph does not change by itself; zoom in with the button Zoom in. Prediction: does the cobweb of the cosine approach \\(x^*\\), and is its shape a staircase or a spiral? Write the prediction down, then choose Cosine \\(x\\mapsto\\cos x\\) in the list Map, read Fixed point \\(x^*\\) and Slope at the fixed point (computed) and press Next step \\(8\\) times.',
        ),
        formulaIds: [],
        observationPrompt: text('Zapiši napoved, nato izberi Kosinus, preberi odčitka in primerjaj Iterat \\(x_8\\) z \\(x^*\\); primerjaj velikost naklona z \\(0{,}8\\) iz koraka \\(3\\).', 'Write down the prediction, then choose Cosine, read the two readouts and compare Iterate \\(x_8\\) with \\(x^*\\); compare the size of the slope with \\(0.8\\) from step \\(3\\).'),
        expectedObservations: [text('\\(x^*\\) je približno \\(0{,}739085\\), naklon približno \\(-0{,}673612\\) (izračunano), spirala; \\(x_8\\approx 0{,}722102\\), \\(x_{11}\\approx 0{,}744237\\), \\(x_{60}=0{,}739085\\). Velikost naklona je manjša od \\(0{,}8\\), zato se napaka blizu \\(x^*\\) zmanjšuje hitreje.', '\\(x^*\\) is approximately \\(0.739085\\), the slope approximately \\(-0.673612\\) (computed), a spiral; \\(x_8\\approx 0.722102\\), \\(x_{11}\\approx 0.744237\\), \\(x_{60}=0.739085\\). The size of the slope is smaller than \\(0.8\\), so the error near \\(x^*\\) shrinks faster.')],
        scene: cobwebScene('rg2-cosine-scene', RG2_DEFAULT,
            'Premica \\(m=0{,}5\\), \\(c=1\\), \\(x_0=0\\), korak \\(0\\); učenec izbere kosinus (začetek ostane \\(x_0=0\\)).',
            'The line \\(m=0.5\\), \\(c=1\\), \\(x_0=0\\), step \\(0\\); the learner chooses the cosine (the start stays \\(x_0=0\\)).'),
    }),
    step({
        id: 'rg2-explore', order: 7,
        ux: {observation: {open: ['readouts']}},
        title: text('Prosto raziskovanje', 'Free exploration'),
        purpose: text('Preizkusiti odločilni naklon na svojih primerih.', 'Trying the deciding slope on your own examples.'),
        explanation: text(
            'Zdaj je prikazana premica \\(m=0{,}5\\), \\(c=1\\), \\(x_0=0\\). Spreminjaj naklon, prosti člen in začetek, preklopi na kosinus ali logistično preslikavo in napovej, preden pritisneš Naslednji korak ali Predvajaj. Pri premici velja argument z napako, ki se pomnoži z \\(m\\); pri krivulji je pogled na naklon pri negibni točki lokalen in ponazoritev. Začetek lahko tudi povlečeš po diagonali.',
            'The line \\(m=0.5\\), \\(c=1\\), \\(x_0=0\\) is shown now. Change the slope, the intercept and the start, switch to the cosine or to the logistic map and predict before pressing Next step or Play. For a line the argument with the error multiplied by \\(m\\) applies; for a curve the view through the slope at the fixed point is local and an illustration. You can also drag the start along the diagonal.',
        ),
        formulaIds: [],
        observationPrompt: text('Poišči premico, katere mreža je zaprt kvadrat, in premico, katere mreža se oddaljuje od \\(x^*\\) v eno smer; nato izberi kosinus z začetkom \\(0{,}5\\) in preveri, kam se približuje.', 'Find a line whose cobweb is a closed square and a line whose cobweb moves away from \\(x^*\\) in one direction; then choose the cosine with the start \\(0.5\\) and check where it approaches.'),
        expectedObservations: [text('Zaprt kvadrat: \\(m=-1\\) in začetek, ki ni \\(x^*\\), npr. \\(c=6\\), \\(x_0=1\\): \\(1;\\ 5;\\ 1;\\ 5\\). Oddaljevanje: \\(m=1{,}5\\), \\(c=-1\\), \\(x_0=2{,}1\\): \\(2{,}1;\\ 2{,}15;\\ 2{,}225\\). Kosinus z \\(x_0=0{,}5\\): \\(x_4\\approx 0{,}694778\\), proti istemu \\(x^*\\).', 'Closed square: \\(m=-1\\) and a start that is not \\(x^*\\), e.g. \\(c=6\\), \\(x_0=1\\): \\(1;\\ 5;\\ 1;\\ 5\\). Moving away: \\(m=1.5\\), \\(c=-1\\), \\(x_0=2.1\\): \\(2.1;\\ 2.15;\\ 2.225\\). The cosine with \\(x_0=0.5\\): \\(x_4\\approx 0.694778\\), towards the same \\(x^*\\).')],
        scene: cobwebScene('rg2-explore-scene', RG2_EXPLORE,
            'Premica \\(m=0{,}5\\), \\(c=1\\), \\(x_0=0\\), korak \\(0\\), nevtralno stanje za raziskovanje.',
            'The line \\(m=0.5\\), \\(c=1\\), \\(x_0=0\\), step \\(0\\), a neutral state for exploring.'),
    }),
];

// ---- RG4 -------------------------------------------------------------------------------------------------------------------------

const rg4Formulas: readonly FormulaBlock[] = [
    {
        id: 'logistic-slope',
        latex: 'x_{n+1}=r\\,x_n(1-x_n),\\qquad x^*=1-\\frac1r,\\qquad f^{\\prime}(x)=r\\,(1-2x),\\qquad f^{\\prime}(x^*)=2-r',
        notation: text(
            '\\(r\\) je hitrost rasti, \\(x_n\\) delež kapacitete, \\(x^*\\) negibna točka, \\(f^{\\prime}\\) odvod preslikave \\(f(x)=r\\,x(1-x)\\) in \\(f^{\\prime}(x^*)\\) naklon krivulje v negibni točki.',
            '\\(r\\) is the growth rate, \\(x_n\\) the share of the capacity, \\(x^*\\) the fixed point, \\(f^{\\prime}\\) the derivative of the map \\(f(x)=r\\,x(1-x)\\) and \\(f^{\\prime}(x^*)\\) the slope of the curve at the fixed point.',
        ),
        explanation: text(
            'Iz \\(x=r\\,x(1-x)\\) dobimo \\(x=0\\) ali \\(1=r\\,(1-x)\\), torej \\(x^*=1-\\tfrac1r\\). Odvod je \\(f^{\\prime}(x)=r-2rx\\), pri \\(x^*\\) pa \\(r\\,(1-2+\\tfrac2r)=2-r\\). Za blizke začetke velja približno \\(x_{n+1}-x^*\\approx(2-r)\\,(x_n-x^*)\\), kakor pri premici z \\(m=2-r\\). Ta približek je lokalen in ponazoritev, ne dokaz.',
            'From \\(x=r\\,x(1-x)\\) we get \\(x=0\\) or \\(1=r\\,(1-x)\\), so \\(x^*=1-\\tfrac1r\\). The derivative is \\(f^{\\prime}(x)=r-2rx\\), and at \\(x^*\\) it is \\(r\\,(1-2+\\tfrac2r)=2-r\\). For nearby starts \\(x_{n+1}-x^*\\approx(2-r)\\,(x_n-x^*)\\) holds approximately, as for a line with \\(m=2-r\\). This approximation is local and an illustration, not a proof.',
        ),
    },
];

const rg4Steps: readonly GuidedLessonStep[] = [
    step({
        id: 'rg4-rule', order: 1,
        ux: {observation: {open: ['readouts']}},
        title: text('Rast, ki se ustavlja', 'Growth that slows down'),
        purpose: text('Napovedati, kje se rast ustavi, ko \\(r\\) raste.', 'Predicting where growth stops when \\(r\\) grows.'),
        explanation: text(
            'Naj bo \\(x_n\\) delež kapacitete, ki je zapolnjen, in \\(x_{n+1}=r\\,x_n(1-x_n)\\). Faktor \\(r\\) pomeni rast, faktor \\(1-x_n\\) jo zavira, ko se \\(x_n\\) bliža \\(1\\). Krivulja \\(y=r\\,x(1-x)\\) je parabola, diagonala je \\(y=x\\) in mreža se nariše kakor pri premici. Zdaj je \\(r=1{,}2\\) in \\(x_0=0{,}1\\); odčitek Negibna točka \\(x^*\\) kaže, kje se rast ustavi pri tem \\(r\\). Napoved: kje se ustavi pri \\(r=1{,}5\\), višje ali nižje kot pri \\(r=1{,}2\\), in približno kje? Napoved zapiši, nato v polje Parameter \\(r\\) vpiši \\(1{,}5\\) in preberi Negibna točka \\(x^*\\).',
            'Let \\(x_n\\) be the share of the capacity that is filled and \\(x_{n+1}=r\\,x_n(1-x_n)\\). The factor \\(r\\) is the growth, the factor \\(1-x_n\\) slows it down when \\(x_n\\) approaches \\(1\\). The curve \\(y=r\\,x(1-x)\\) is a parabola, the diagonal is \\(y=x\\), and the cobweb is drawn as for a line. Now \\(r=1.2\\) and \\(x_0=0.1\\); the readout Fixed point \\(x^*\\) shows where growth stops for this \\(r\\). Prediction: where does it stop for \\(r=1.5\\), higher or lower than for \\(r=1.2\\), and roughly where? Write the prediction down, then type \\(1.5\\) into the field Parameter \\(r\\) and read Fixed point \\(x^*\\).',
        ),
        formulaIds: [],
        observationPrompt: text('Zapiši napoved, nato vpiši \\(r=1{,}5\\) in primerjaj odčitek Negibna točka \\(x^*\\) z napovedjo.', 'Write down the prediction, then type \\(r=1.5\\) and compare the readout Fixed point \\(x^*\\) with it.'),
        expectedObservations: [text('Pri \\(r=1{,}2\\) je \\(x^*=\\tfrac16\\), približno \\(0{,}166667\\); pri \\(r=1{,}5\\) je \\(x^*=\\tfrac13\\), približno \\(0{,}333333\\): višje.', 'For \\(r=1.2\\) we have \\(x^*=\\tfrac16\\), approximately \\(0.166667\\); for \\(r=1.5\\) we have \\(x^*=\\tfrac13\\), approximately \\(0.333333\\): higher.')],
        scene: cobwebScene('rg4-rule-scene', RG4_START,
            'Logistična preslikava \\(r=1{,}2\\), \\(x_0=0{,}1\\), korak \\(0\\): \\(x^*=\\tfrac16\\), približno \\(0{,}166667\\), naklon \\(0{,}8\\); učenec vpiše \\(r=1{,}5\\).',
            'The logistic map \\(r=1.2\\), \\(x_0=0.1\\), step \\(0\\): \\(x^*=\\tfrac16\\), approximately \\(0.166667\\), slope \\(0.8\\); the learner types \\(r=1.5\\).'),
    }),
    step({
        id: 'rg4-staircase', order: 2,
        ux: {explanation: {open: ['readouts'], highlight: ['fixed']}, observation: {open: ['readouts']}},
        title: text('Mreža pri \\(r=1{,}5\\)', 'The cobweb at \\(r=1.5\\)'),
        purpose: text('Napovedati pot iteratov do negibne točke.', 'Predicting the path of the iterates to the fixed point.'),
        explanation: text(
            'Zdaj je \\(r=1{,}5\\), \\(x_0=0{,}1\\) in negibna točka je \\(x^*=\\tfrac13\\). Prvi korak izračunaš v glavi: \\(x_1=1{,}5\\cdot0{,}1\\cdot(1-0{,}1)\\). Napoved: izračunaj še \\(x_2\\) in oceni, koliko manjka \\(x_4\\) do \\(x^*\\). Napoved zapiši, nato \\(4\\)-krat pritisni Naslednji korak in preberi Iterat \\(x_4\\), potem pritisni Predvajaj in preberi Iterat \\(x_{11}\\) in Oblika mreže.',
            'Now \\(r=1.5\\), \\(x_0=0.1\\) and the fixed point is \\(x^*=\\tfrac13\\). Compute the first step in your head: \\(x_1=1.5\\cdot0.1\\cdot(1-0.1)\\). Prediction: compute \\(x_2\\) as well and estimate how far \\(x_4\\) is still from \\(x^*\\). Write the prediction down, then press Next step \\(4\\) times and read Iterate \\(x_4\\), then press Play and read Iterate \\(x_{11}\\) and Shape of the cobweb.',
        ),
        formulaIds: [],
        observationPrompt: text('Zapiši napoved za \\(x_1\\), \\(x_2\\) in \\(x_4\\), nato preberi Iterat \\(x_4\\), Iterat \\(x_{11}\\) in Obliko mreže.', 'Write down the prediction for \\(x_1\\), \\(x_2\\) and \\(x_4\\), then read Iterate \\(x_4\\), Iterate \\(x_{11}\\) and Shape of the cobweb.'),
        expectedObservations: [text('\\(x_1=0{,}135\\), \\(x_2\\approx 0{,}175163\\), \\(x_3\\approx 0{,}216721\\), \\(x_4\\approx 0{,}254629\\); \\(x_{11}\\approx 0{,}332305\\), še pod \\(\\tfrac13\\); stopnice, naklon \\(0{,}5\\).', '\\(x_1=0.135\\), \\(x_2\\approx 0.175163\\), \\(x_3\\approx 0.216721\\), \\(x_4\\approx 0.254629\\); \\(x_{11}\\approx 0.332305\\), still below \\(\\tfrac13\\); a staircase, slope \\(0.5\\).')],
        scene: cobwebScene('rg4-staircase-scene', RG4_STAIRCASE,
            'Logistična preslikava \\(r=1{,}5\\), \\(x_0=0{,}1\\), korak \\(0\\): \\(x^*=\\tfrac13\\), naklon \\(0{,}5\\), stopnice.',
            'The logistic map \\(r=1.5\\), \\(x_0=0.1\\), step \\(0\\): \\(x^*=\\tfrac13\\), slope \\(0.5\\), a staircase.'),
    }),
    step({
        id: 'rg4-spiral', order: 3,
        ux: {observation: {open: ['readouts']}},
        title: text('Večji \\(r\\)', 'A larger \\(r\\)'),
        purpose: text('Z lego negibne točke glede na vrh parabole napovedati obliko mreže.', 'Using the position of the fixed point relative to the vertex of the parabola to predict the shape of the cobweb.'),
        explanation: text(
            'Parabola \\(y=r\\,x(1-x)\\) ima vrh pri \\(x=\\tfrac12\\); levo od njega narašča, desno pada. Pri \\(r=1{,}5\\) je bila mreža stopnice. Napoved za \\(r=2{,}5\\): ali je \\(x^*\\) levo ali desno od vrha, ali krivulja pri \\(x^*\\) narašča ali pada in kakšna bo oblika mreže? Napoved zapiši, nato v polje Parameter \\(r\\) vpiši \\(2{,}5\\), preberi Negibna točka \\(x^*\\) in Oblika mreže in \\(4\\)-krat pritisni Naslednji korak. Nato pritisni Predvajaj in preberi Iterat \\(x_{11}\\).',
            'The parabola \\(y=r\\,x(1-x)\\) has its vertex at \\(x=\\tfrac12\\); to the left of it it rises, to the right it falls. For \\(r=1.5\\) the cobweb was a staircase. Prediction for \\(r=2.5\\): is \\(x^*\\) left or right of the vertex, does the curve rise or fall at \\(x^*\\), and what will the shape of the cobweb be? Write the prediction down, then type \\(2.5\\) into the field Parameter \\(r\\), read Fixed point \\(x^*\\) and Shape of the cobweb and press Next step \\(4\\) times. Then press Play and read Iterate \\(x_{11}\\).',
        ),
        formulaIds: [],
        observationPrompt: text('Zapiši napoved, nato vpiši \\(r=2{,}5\\) in preberi Negibna točka \\(x^*\\), Obliko mreže in Iterat \\(x_1\\) do \\(x_4\\).', 'Write down the prediction, then type \\(r=2.5\\) and read Fixed point \\(x^*\\), Shape of the cobweb and Iterate \\(x_1\\) to \\(x_4\\).'),
        expectedObservations: [text('\\(x^*=\\tfrac35\\), desno od vrha, naklon \\(-0{,}5\\), spirala; \\(x_1=0{,}225\\), \\(x_2\\approx 0{,}435938\\), \\(x_3\\approx 0{,}61474\\), \\(x_4\\approx 0{,}592087\\) (izmenjujejo se okoli \\(0{,}6\\)); \\(x_{11}\\approx 0{,}60006\\).', '\\(x^*=\\tfrac35\\), right of the vertex, slope \\(-0.5\\), a spiral; \\(x_1=0.225\\), \\(x_2\\approx 0.435938\\), \\(x_3\\approx 0.61474\\), \\(x_4\\approx 0.592087\\) (alternating around \\(0.6\\)); \\(x_{11}\\approx 0.60006\\).')],
        scene: cobwebScene('rg4-spiral-scene', RG4_STAIRCASE,
            'Logistična preslikava \\(r=1{,}5\\), \\(x_0=0{,}1\\), korak \\(0\\); učenec vpiše \\(r=2{,}5\\).',
            'The logistic map \\(r=1.5\\), \\(x_0=0.1\\), step \\(0\\); the learner types \\(r=2.5\\).'),
    }),
    step({
        id: 'rg4-slow-spiral', order: 4,
        ux: {observation: {open: ['readouts']}},
        title: text('Mreža pri \\(r=2{,}9\\)', 'The cobweb at \\(r=2.9\\)'),
        purpose: text('Napovedati hitrost približevanja pri večjem \\(r\\) in ločiti limito od zadnjega iterata.', 'Predicting the speed of the approach for a larger \\(r\\) and separating the limit from the last iterate.'),
        explanation: text(
            'Zdaj je \\(r=2{,}5\\) in spirala je že pri \\(x_{11}\\) skoraj pri \\(x^*\\). Napoved za \\(r=2{,}9\\): ali se mreža še približuje negibni točki, je približevanje hitrejše ali počasnejše kot pri \\(r=2{,}5\\) in ali bo \\(x_{60}\\) enak \\(x^*\\)? Napoved zapiši, nato vpiši \\(2{,}9\\) v polje Parameter \\(r\\), preberi Negibna točka \\(x^*\\) in Naklon pri negibni točki ter pritisni Predvajaj, da se mreža nariše do konca.',
            'Now \\(r=2.5\\) and the spiral is already close to \\(x^*\\) at \\(x_{11}\\). Prediction for \\(r=2.9\\): does the cobweb still approach the fixed point, is the approach faster or slower than for \\(r=2.5\\), and will \\(x_{60}\\) equal \\(x^*\\)? Write the prediction down, then type \\(2.9\\) into the field Parameter \\(r\\), read Fixed point \\(x^*\\) and Slope at the fixed point and press Play to draw the cobweb to the end.',
        ),
        formulaIds: [],
        observationPrompt: text('Zapiši napoved, nato vpiši \\(r=2{,}9\\) in primerjaj Iterat \\(x_{11}\\), \\(x_{38}\\) in \\(x_{60}\\) z odčitkom Negibna točka \\(x^*\\).', 'Write down the prediction, then type \\(r=2.9\\) and compare Iterate \\(x_{11}\\), \\(x_{38}\\) and \\(x_{60}\\) with the readout Fixed point \\(x^*\\).'),
        expectedObservations: [text('\\(x^*=\\tfrac{19}{29}\\), približno \\(0{,}655172\\), naklon \\(-0{,}9\\), spirala; \\(x_{11}\\approx 0{,}678306\\), \\(x_{38}\\approx 0{,}653811\\), \\(x_{60}\\approx 0{,}655039\\): po \\(60\\) korakih še ni pri \\(x^*\\), razlika je približno \\(0{,}00013\\).', '\\(x^*=\\tfrac{19}{29}\\), approximately \\(0.655172\\), slope \\(-0.9\\), a spiral; \\(x_{11}\\approx 0.678306\\), \\(x_{38}\\approx 0.653811\\), \\(x_{60}\\approx 0.655039\\): after \\(60\\) steps it is not yet at \\(x^*\\), the difference is approximately \\(0.00013\\).')],
        scene: cobwebScene('rg4-slow-spiral-scene', RG4_SPIRAL,
            'Logistična preslikava \\(r=2{,}5\\), \\(x_0=0{,}1\\), korak \\(0\\): \\(x^*=\\tfrac35\\), naklon \\(-0{,}5\\); učenec vpiše \\(r=2{,}9\\).',
            'The logistic map \\(r=2.5\\), \\(x_0=0.1\\), step \\(0\\): \\(x^*=\\tfrac35\\), slope \\(-0.5\\); the learner types \\(r=2.9\\).'),
    }),
    step({
        id: 'rg4-extinction', order: 5,
        ux: {observation: {open: ['readouts']}},
        title: text('Majhen \\(r\\)', 'A small \\(r\\)'),
        purpose: text('Napovedati, kaj se zgodi pri \\(r<1\\), in meji \\(r=1\\), kjer naklon ne odloči.', 'Predicting what happens for \\(r<1\\) and on the boundary \\(r=1\\), where the slope does not decide.'),
        explanation: text(
            'Zdaj je \\(r=2{,}9\\), \\(x_0=0{,}1\\). Napoved za \\(r=0{,}8\\): ali obstaja negibna točka v intervalu med \\(0\\) in \\(1\\), ki ni \\(0\\)? Kam gredo iterati? Napoved zapiši, nato vpiši \\(0{,}8\\) v polje Parameter \\(r\\), preberi stanje, Negibna točka \\(x^*\\) in Naklon pri negibni točki ter pritisni Predvajaj. Nato napovej še za \\(r=1\\): naklon pri \\(0\\) je zdaj \\(1\\); ali iterati dosežejo \\(0\\) po \\(60\\) korakih? Vpiši \\(1\\), pritisni Predvajaj in preberi stanje in Iterat \\(x_{60}\\).',
            'Now \\(r=2.9\\), \\(x_0=0.1\\). Prediction for \\(r=0.8\\): is there a fixed point in the interval between \\(0\\) and \\(1\\) other than \\(0\\)? Where do the iterates go? Write the prediction down, then type \\(0.8\\) into the field Parameter \\(r\\), read the status, Fixed point \\(x^*\\) and Slope at the fixed point and press Play. Then predict for \\(r=1\\) too: the slope at \\(0\\) is \\(1\\) now; do the iterates reach \\(0\\) after \\(60\\) steps? Type \\(1\\), press Play and read the status and Iterate \\(x_{60}\\).',
        ),
        formulaIds: [],
        observationPrompt: text('Zapiši napoved, nato vpiši \\(r=0{,}8\\) in nato \\(r=1\\) ter pri obeh preberi stanje, \\(x^*\\) in naklon.', 'Write down the prediction, then type \\(r=0.8\\) and then \\(r=1\\) and read the status, \\(x^*\\) and the slope for both.'),
        expectedObservations: [text('\\(r=0{,}8\\): Izumrtje, \\(x^*=0\\), naklon \\(0{,}8\\); \\(x_1=0{,}072\\), \\(x_4\\approx 0{,}031071\\), \\(x_{11}\\approx 0{,}00579\\), \\(x_{60}\\) se izpiše kot \\(0\\) (izračunano). \\(r=1\\): naklon \\(1\\), naklon ne odloči; \\(x_{11}\\approx 0{,}045851\\), \\(x_{60}\\approx 0{,}013885\\): približevanje \\(0\\) je počasno.', '\\(r=0.8\\): Extinction, \\(x^*=0\\), slope \\(0.8\\); \\(x_1=0.072\\), \\(x_4\\approx 0.031071\\), \\(x_{11}\\approx 0.00579\\), \\(x_{60}\\) is shown as \\(0\\) (computed). \\(r=1\\): slope \\(1\\), the slope does not decide; \\(x_{11}\\approx 0.045851\\), \\(x_{60}\\approx 0.013885\\): the approach to \\(0\\) is slow.')],
        scene: cobwebScene('rg4-extinction-scene', RG4_SLOW,
            'Logistična preslikava \\(r=2{,}9\\), \\(x_0=0{,}1\\), korak \\(0\\): \\(x^*=\\tfrac{19}{29}\\), naklon \\(-0{,}9\\); učenec vpiše \\(r=0{,}8\\), nato \\(r=1\\).',
            'The logistic map \\(r=2.9\\), \\(x_0=0.1\\), step \\(0\\): \\(x^*=\\tfrac{19}{29}\\), slope \\(-0.9\\); the learner types \\(r=0.8\\), then \\(r=1\\).'),
    }),
    step({
        id: 'rg4-slope', order: 6,
        ux: {observation: {open: ['readouts']}},
        title: text('Naklon v negibni točki', 'The slope at the fixed point'),
        purpose: text('Z odvodom izračunati naklon v negibni točki in ga primerjati z odčitkom.', 'Computing the slope at the fixed point with the derivative and comparing it with the readout.'),
        explanation: text(
            'Odvod preslikave \\(f(x)=r\\,x(1-x)\\) je \\(f^{\\prime}(x)=r\\,(1-2x)\\), negibna točka je \\(x^*=1-\\tfrac1r\\). Blizu \\(x^*\\) se preslikava obnaša približno kakor premica z \\(m=f^{\\prime}(x^*)\\); to je lokalna ponazoritev, kakor pri kosinusu, in ne dokaz. Napoved: izračunaj \\(f^{\\prime}(x^*)\\) za \\(r=2{,}2\\); ali bo mreža stopnice ali spirala? Napoved zapiši, nato vpiši \\(2{,}2\\) v polje Parameter \\(r\\) in preberi Naklon pri negibni točki. Nato napovej naklon za \\(r=1{,}1\\), vpiši ga in primerjaj velikost obeh naklonov. Pravilo, da se bližnji iterati približujejo \\(x^*\\), če je \\(\\lvert f^{\\prime}(x^*)\\rvert<1\\), je ponazorjeno na primerih, ne dokazano.',
            'The derivative of the map \\(f(x)=r\\,x(1-x)\\) is \\(f^{\\prime}(x)=r\\,(1-2x)\\), and the fixed point is \\(x^*=1-\\tfrac1r\\). Near \\(x^*\\) the map behaves approximately like a line with \\(m=f^{\\prime}(x^*)\\); this is a local illustration, as for the cosine, and not a proof. Prediction: compute \\(f^{\\prime}(x^*)\\) for \\(r=2.2\\); will the cobweb be a staircase or a spiral? Write the prediction down, then type \\(2.2\\) into the field Parameter \\(r\\) and read Slope at the fixed point. Then predict the slope for \\(r=1.1\\), type it in and compare the sizes of the two slopes. The rule that nearby iterates approach \\(x^*\\) if \\(\\lvert f^{\\prime}(x^*)\\rvert<1\\) is illustrated on examples, not proved.',
        ),
        formulaIds: [],
        observationPrompt: text('Zapiši napoved za naklon pri \\(r=2{,}2\\) in \\(r=1{,}1\\), nato ju vpiši in primerjaj z odčitkom Naklon pri negibni točki.', 'Write down the prediction for the slope at \\(r=2.2\\) and \\(r=1.1\\), then type them in and compare with the readout Slope at the fixed point.'),
        expectedObservations: [text('\\(r=2{,}2\\): \\(x^*=\\tfrac{6}{11}\\), približno \\(0{,}545455\\), naklon \\(2-2{,}2=-0{,}2\\), spirala. \\(r=1{,}1\\): \\(x^*\\) približno \\(0{,}090909\\), naklon \\(2-1{,}1=0{,}9\\). Pravilo \\(\\lvert 2-r\\rvert<1\\), to je \\(1<r<3\\), se ujema z odčitkoma.', '\\(r=2.2\\): \\(x^*=\\tfrac{6}{11}\\), approximately \\(0.545455\\), slope \\(2-2.2=-0.2\\), a spiral. \\(r=1.1\\): \\(x^*\\) approximately \\(0.090909\\), slope \\(2-1.1=0.9\\). The rule \\(\\lvert 2-r\\rvert<1\\), that is \\(1<r<3\\), agrees with both readouts.')],
        scene: cobwebScene('rg4-slope-scene', RG4_STAIRCASE,
            'Logistična preslikava \\(r=1{,}5\\), \\(x_0=0{,}1\\), korak \\(0\\); učenec vpiše \\(r=2{,}2\\), nato \\(r=1{,}1\\).',
            'The logistic map \\(r=1.5\\), \\(x_0=0.1\\), step \\(0\\); the learner types \\(r=2.2\\), then \\(r=1.1\\).'),
    }),
    step({
        id: 'rg4-explore', order: 7,
        ux: {observation: {open: ['readouts']}},
        title: text('Prosto raziskovanje', 'Free exploration'),
        purpose: text('Preizkusiti naklon \\(2-r\\) na svojih vrednostih \\(r\\).', 'Trying the slope \\(2-r\\) on your own values of \\(r\\).'),
        explanation: text(
            'Zdaj je \\(r=1{,}5\\), \\(x_0=0{,}1\\). Graf dovoli \\(r\\) do \\(2{,}9\\). Spreminjaj \\(r\\) in začetek ter napovej obliko mreže in naklon, preden ju prebereš. Pri večjem \\(r\\) se mreža obnaša drugače; to ta lekcija ne obravnava, obravnava ga druga tema (fazni portreti).',
            'Now \\(r=1.5\\), \\(x_0=0.1\\). The graph allows \\(r\\) up to \\(2.9\\). Change \\(r\\) and the start, and predict the shape of the cobweb and the slope before reading them. For a larger \\(r\\) the cobweb behaves differently; this lesson does not treat that, another topic does (phase portraits).',
        ),
        formulaIds: ['logistic-slope'],
        observationPrompt: text('Poišči dve vrednosti \\(r\\) z enako velikostjo naklona pri negibni točki, pri katerih je oblika mreže različna.', 'Find two values of \\(r\\) with the same size of the slope at the fixed point for which the shape of the cobweb differs.'),
        expectedObservations: [text('Npr. \\(r=1{,}1\\) (naklon \\(0{,}9\\), stopnice) in \\(r=2{,}9\\) (naklon \\(-0{,}9\\), spirala); splošno \\(r\\) in \\(4-r\\) imata naklona \\(2-r\\) in \\(r-2\\).', 'E.g. \\(r=1.1\\) (slope \\(0.9\\), a staircase) and \\(r=2.9\\) (slope \\(-0.9\\), a spiral); in general \\(r\\) and \\(4-r\\) have the slopes \\(2-r\\) and \\(r-2\\).')],
        scene: cobwebScene('rg4-explore-scene', RG4_EXPLORE,
            'Logistična preslikava \\(r=1{,}5\\), \\(x_0=0{,}1\\), korak \\(0\\), nevtralno stanje za raziskovanje.',
            'The logistic map \\(r=1.5\\), \\(x_0=0.1\\), step \\(0\\), a neutral state for exploring.'),
    }),
];

// ---- Lessons ---------------------------------------------------------------------------------------------------------------------

const sources: GuidedLesson['sources'] = [
    {
        id: 'bezeg-recursion-cobweb-implementation',
        citation: 'Bezeg source: src/recursion/ (the iteration kernel) and src/graphs/recursion/RecursionCobwebGraph.tsx.',
        implementationCorrespondence: 'A scene sets the map and the stored whole-number fields of the cobweb graph (m = M/20, c = C/10, r = R/10, x0 = X/100) and the drawn step; every number is a readout of that graph (iterates are computed in double precision, the fixed point of the line and of the logistic map follows from the whole-number parameters), the text quotes only values of those scenes, values the learner reads after an action the text asks for, or stated arithmetic. The slope at the fixed point of the cosine is computed, not exact; the classification of the line is decided by M and C, not by the iterates.',
    },
];

const rg2: GuidedLesson = {
    demonstrationId: 'recursion-cobweb',
    title: text('Pajkova mreža premice in krivulje', 'The cobweb of a line and of a curve'),
    summary: text(
        'Pravilo \\(x_{n+1}=f(x_n)\\) narišemo kot pajkovo mrežo med krivuljo in diagonalo \\(y=x\\). Raziščemo premico \\(x\\mapsto m\\,x+c\\) in kosinus ter opazujemo, kam gredo iterati blizu negibne točke.',
        'The rule \\(x_{n+1}=f(x_n)\\) is drawn as a cobweb between the curve and the diagonal \\(y=x\\). We explore the line \\(x\\mapsto m\\,x+c\\) and the cosine and watch where the iterates near the fixed point go.',
    ),
    prerequisites: [text('Aritmetično in geometrijsko zaporedje (prva lekcija poglavja) in pojem negibne točke.', 'Arithmetic and geometric sequences (the first lesson of the chapter) and the notion of a fixed point.')],
    learningGoals: [
        text('Znaš s pajkovo mrežo pojasniti en korak pravila in poiskati negibno točko premice kot presečišče z diagonalo.', 'Can explain one step of the rule with the cobweb and find the fixed point of a line as its meeting with the diagonal.'),
        text('Veš, da je pri premici napaka v vsakem koraku pomnožena z \\(m\\), zato se iterati približujejo pri \\(\\lvert m\\rvert<1\\) in oddaljujejo pri \\(\\lvert m\\rvert>1\\); pri \\(m=-1\\) je dvojni cikel (argument).', 'Know that for a line the error is multiplied by \\(m\\) in every step, so the iterates approach for \\(\\lvert m\\rvert<1\\) and move away for \\(\\lvert m\\rvert>1\\); \\(m=-1\\) gives a 2-cycle (argument).'),
        text('Veš, da pri krivulji naklon v negibni točki lokalno nadomesti \\(m\\), in da je kosinus ponazoritev, ne dokaz.', 'Know that for a curve the slope at the fixed point replaces \\(m\\) locally, and that the cosine is an illustration, not a proof.'),
    ],
    formulaBlocks: rg2Formulas,
    workedExamples: [],
    steps: rg2Steps,
    sources,
    edgeCases: [
        text('Pri \\(m=1\\) in \\(c\\ne0\\) negibne točke ni, pri \\(m=1\\) in \\(c=0\\) je vsaka točka negibna. Pri \\(m=-1\\) se iterati izmenjujejo med dvema vrednostma, razen če je začetek \\(x^*\\).', 'For \\(m=1\\) and \\(c\\ne0\\) there is no fixed point, for \\(m=1\\) and \\(c=0\\) every point is fixed. For \\(m=-1\\) the iterates alternate between two values unless the start is \\(x^*\\).'),
        text('Iterati so izračunani z decimalkami; razvrstitev (približevanje, oddaljevanje, dvojni cikel) določata celoštevilska \\(m\\) in \\(c\\), ne vrednosti iteratov. Naklon kosinusa je izračunan.', 'The iterates are computed with decimals; the classification (approach, moving away, 2-cycle) is decided by the whole-number \\(m\\) and \\(c\\), not by the values of the iterates. The slope of the cosine is computed.'),
        text('Pogled grafa ni prilagojen negibni točki; povečava je učenčeva.', 'The view of the graph is not framed on the fixed point; zooming is left to the learner.'),
    ],
    unresolvedQuestions: [],
};

const rg4: GuidedLesson = {
    demonstrationId: 'recursion-cobweb',
    title: text('Rast z omejitvijo: pajkova mreža logistične preslikave', 'Growth with a limit: the cobweb of the logistic map'),
    summary: text(
        'Rast, ki se ob kapaciteti ustavlja, opišemo s pravilom \\(x_{n+1}=r\\,x_n(1-x_n)\\). Pajkova mreža pokaže, kam gredo iterati pri različnih \\(r\\), in kaj pove naklon krivulje v negibni točki.',
        'Growth that slows down near a capacity is described by the rule \\(x_{n+1}=r\\,x_n(1-x_n)\\). The cobweb shows where the iterates go for different \\(r\\) and what the slope of the curve at the fixed point says.',
    ),
    prerequisites: [text('Pajkova mreža premice in krivulje (prejšnja lekcija) in odvod polinoma.', 'The cobweb of a line and of a curve (the previous lesson) and the derivative of a polynomial.')],
    learningGoals: [
        text('Veš, da se pri \\(1<r<3\\) rast ustavi pri \\(x^*=1-\\tfrac1r\\), in znaš na pajkovi mreži pokazati, zakaj.', 'Know that for \\(1<r<3\\) growth stops at \\(x^*=1-\\tfrac1r\\) and can show why on the cobweb.'),
        text('Znaš izračunati naklon \\(2-r\\) v negibni točki in z njim napovedati obliko mreže (stopnice za \\(r<2\\), spirala za \\(r>2\\)) (ponazoritev).', 'Can compute the slope \\(2-r\\) at the fixed point and use it to predict the shape of the cobweb (staircase for \\(r<2\\), spiral for \\(r>2\\)) (illustration).'),
        text('Veš, da pri \\(r<1\\) rast ugasne in da pri \\(r=1\\) naklon \\(1\\) ne odloči.', 'Know that for \\(r<1\\) growth dies out and that for \\(r=1\\) the slope \\(1\\) does not decide.'),
    ],
    formulaBlocks: rg4Formulas,
    workedExamples: [],
    steps: rg4Steps,
    sources,
    edgeCases: [
        text('Za \\(r\\ge3\\) lekcija ne trdi ničesar; graf dovoli \\(r\\) do \\(2{,}9\\). Pri \\(r=1\\) je negibna točka \\(0\\) z naklonom \\(1\\) in se iterati približujejo počasi.', 'For \\(r\\ge3\\) the lesson claims nothing; the graph allows \\(r\\) up to \\(2.9\\). For \\(r=1\\) the fixed point is \\(0\\) with the slope \\(1\\) and the iterates approach slowly.'),
        text('Pri \\(r=2{,}9\\) \\(x_{60}\\) še ni enak \\(x^*\\); limita je negibna točka, ne zadnji iterat. Kriterij \\(\\lvert2-r\\rvert<1\\) je lokalna ponazoritev.', 'For \\(r=2.9\\) the value \\(x_{60}\\) is not yet equal to \\(x^*\\); the limit is the fixed point, not the last iterate. The criterion \\(\\lvert2-r\\rvert<1\\) is a local illustration.'),
    ],
    unresolvedQuestions: [],
};

export const recursionCobwebLesson: GuidedLesson = rg2;
export const recursionLogisticLesson: GuidedLesson = rg4;
