/**
 * Guided lessons of the level-sets family, batch C (docs/specs/level-sets-optimization-lessons.md): LS3, gradient descent, and LS4, Lagrange multipliers, both on `contour-map`
 * (ContourMapGraph). Each is the lesson of one section of the level-sets chapter (the chapter registry adapts them on request). Scenes use the `levelsets` actions the contour graph
 * registers (`set-function`, `set-level`, `set-probe`, `set-mode`, `set-numeric` of batch B and `set-start`, `set-step`, `set-constraint` of batch C) and every scene starts from the
 * Demonstration default (bowl, level-sets mode, c = 1, one level set, probe (0,6; 0,8), start (2; 1), H = 3, line x + 2y = 5 at T = 4, circle x² + y² = 2 at K = 6) and names what it sets.
 * No action sets the step counter of the descent: the learner presses Naslednji korak or moves the descent step slider, and a scene opens at step 0.
 *
 * Hiding devices. The descent mode shows its behaviour row, its status and the "first step with f < 0,000001" row at once, and the Lagrange mode shows the point of tangency of the
 * line (and the tangent count of the circle) at once. So LS3 is "predict the effect of a change, then make it": each step opens on the previous step's descent state, asks for a
 * prediction, names the control with its exact label and asks the learner to make the change. LS4 steps 1 and 4 open in level-sets mode (the constraint is stored but neither drawn nor
 * named there, so the prose names it) and the learner switches the mode to the constrained extremum after the prediction. Every number the text quotes is a readout of the graph for
 * that scene (docs/reviews/feature-streams/families-prep/notes/f3-ls-c.md lists them per step with the source), a value the learner reads after an action the text asks for, or stated
 * arithmetic. That the descent converges for 0 < h < 2/L is a theorem for quadratic functions (the argument is the factor 1 - 20h); that the gradients are parallel at a constrained
 * extremum is a necessary condition (Lagrange); the paths and arrows in the picture are an illustration.
 */
import type {LessonAction} from '../model';
import type {FormulaBlock, GuidedLesson, GuidedLessonFrame, GuidedLessonStep, LessonScene, LocalizedText} from './guidedLessons';

const text = (sl: string, en: string): LocalizedText => ({sl, en});
const frame = (id: string, kind: GuidedLessonFrame['kind']): GuidedLessonFrame => ({id, kind});

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
}

const step = (content: StepContent): GuidedLessonStep => ({
    ...content,
    frames: [frame(`${content.id}-explanation`, 'explanation'), frame(`${content.id}-observation`, 'observation')],
});

/**
 * What an optimization scene sets on top of the Demonstration default: the function, the level L (c = L/8) and the count of level sets (1..9), the descent start (X, Y) (1/4), the step H
 * (1..30), the constraint with its parameters T (the line, x = T/4) and K (the circle, angle 2πK/48) and the mode.
 */
export interface OptimizationSceneSpec {
    readonly fn?: 'bowl' | 'saddle' | 'valley' | 'hills' | 'product';
    readonly level?: number;
    readonly levelCount?: number;
    readonly start?: readonly [number, number];
    readonly step?: number;
    readonly constraint?: 'line' | 'circle';
    readonly lineParam?: number;
    readonly circleParam?: number;
    readonly mode?: 'level-sets' | 'gradient' | 'descent' | 'lagrange';
}

/**
 * The actions of an optimization scene: the Demonstration default, then the function (the start and the probe fall back as the chooser does), the level, the start, the step, the
 * constraint and the mode. The constraint comes after the function because the chooser of the function changes the stored constraint when the line is not available (hills).
 */
export const optimizationSceneActions = (id: string, spec: OptimizationSceneSpec): LessonAction[] => [
    {kind: 'prepared-scene', sceneId: id, source: 'demonstration-default'},
    ...(spec.fn !== undefined ? [{kind: 'levelsets', operation: 'set-function', fn: spec.fn} as const] : []),
    ...(spec.level !== undefined || spec.levelCount !== undefined
        ? [{kind: 'levelsets', operation: 'set-level', ...(spec.level !== undefined ? {level: spec.level} : {}), ...(spec.levelCount !== undefined ? {levelCount: spec.levelCount} : {})} as const]
        : []),
    ...(spec.start !== undefined ? [{kind: 'levelsets', operation: 'set-start', X: spec.start[0], Y: spec.start[1]} as const] : []),
    ...(spec.step !== undefined ? [{kind: 'levelsets', operation: 'set-step', step: spec.step} as const] : []),
    ...(spec.constraint !== undefined || spec.lineParam !== undefined || spec.circleParam !== undefined
        ? [{
            kind: 'levelsets', operation: 'set-constraint',
            ...(spec.constraint !== undefined ? {constraint: spec.constraint} : {}),
            ...(spec.lineParam !== undefined ? {lineParam: spec.lineParam} : {}),
            ...(spec.circleParam !== undefined ? {circleParam: spec.circleParam} : {}),
        } as const]
        : []),
    ...(spec.mode !== undefined ? [{kind: 'levelsets', operation: 'set-mode', mode: spec.mode} as const] : []),
];

const optimizationScene = (id: string, spec: OptimizationSceneSpec, sl: string, en: string): LessonScene =>
    ({id, basedOn: 'demonstration-default', actions: optimizationSceneActions(id, spec), expectedState: text(sl, en)});

/**
 * LS3, all in the mode Gradientni spust except the last step. The start is (2; 1) (X 8, Y 4) and the step counter 0 in every opening. LS3_BOWL (H = 3) opens steps 1 and 2; the learner
 * chooses the valley, which gives LS3_VALLEY (H = 3, the opening of step 3); the step slider to 9 gives LS3_VALLEY_9 (the opening of step 4), to 10 LS3_VALLEY_10 (step 5) and to 11
 * LS3_VALLEY_11 (step 6); typing P0, y = 0 there gives LS3_VALLEY_AXIS (start (2; 0), H = 11). Step 7 opens on the Demonstration default.
 */
export const LS3_BOWL = {mode: 'descent', start: [8, 4], step: 3} as const;
export const LS3_VALLEY = {fn: 'valley', mode: 'descent', start: [8, 4], step: 3} as const;
export const LS3_VALLEY_9 = {fn: 'valley', mode: 'descent', start: [8, 4], step: 9} as const;
export const LS3_VALLEY_10 = {fn: 'valley', mode: 'descent', start: [8, 4], step: 10} as const;
export const LS3_VALLEY_11 = {fn: 'valley', mode: 'descent', start: [8, 4], step: 11} as const;
export const LS3_VALLEY_AXIS = {fn: 'valley', mode: 'descent', start: [8, 0], step: 11} as const;
export const LS3_EXPLORE = {} as const;

/**
 * LS4. LS4_BOWL_LINE (level-sets mode, the bowl, three level sets, the line x + 2y = 5 stored with the point at T = 0, x = 0) opens step 1; the learner switches the mode, which gives
 * LS4_BOWL_LINE_LAGRANGE (the opening of step 3, the point at (0; 2,5)); typing x = 1 (T = 4) gives LS4_BOWL_TOUCH. LS4_PRODUCT_CIRCLE (level-sets mode, the product with the
 * level sets c = 0, 1, 2, the circle x² + y² = 2 stored with the point at K = 0) opens step 4; the switch gives LS4_PRODUCT_LAGRANGE and the angle steps K = 6, 18, 30, 42 the four
 * tangency points (LS4_PRODUCT_K6, _K18, _K30, _K42). Step 5 opens on the Demonstration default.
 */
export const LS4_BOWL_LINE = {levelCount: 3, constraint: 'line', lineParam: 0, mode: 'level-sets'} as const;
export const LS4_BOWL_LINE_LAGRANGE = {levelCount: 3, constraint: 'line', lineParam: 0, mode: 'lagrange'} as const;
export const LS4_BOWL_TOUCH = {levelCount: 3, constraint: 'line', lineParam: 4, mode: 'lagrange'} as const;
export const LS4_PRODUCT_CIRCLE = {fn: 'product', level: 0, levelCount: 3, constraint: 'circle', circleParam: 0, mode: 'level-sets'} as const;
export const LS4_PRODUCT_LAGRANGE = {fn: 'product', level: 0, levelCount: 3, constraint: 'circle', circleParam: 0, mode: 'lagrange'} as const;
export const LS4_PRODUCT_K6 = {fn: 'product', level: 0, levelCount: 3, constraint: 'circle', circleParam: 6, mode: 'lagrange'} as const;
export const LS4_PRODUCT_K18 = {fn: 'product', level: 0, levelCount: 3, constraint: 'circle', circleParam: 18, mode: 'lagrange'} as const;
export const LS4_PRODUCT_K30 = {fn: 'product', level: 0, levelCount: 3, constraint: 'circle', circleParam: 30, mode: 'lagrange'} as const;
export const LS4_PRODUCT_K42 = {fn: 'product', level: 0, levelCount: 3, constraint: 'circle', circleParam: 42, mode: 'lagrange'} as const;
export const LS4_EXPLORE = {} as const;

/** The labels of the graph's controls and readouts as the lesson text quotes them (symbols in math, as the notation rules ask; the displayed text is the label of the graph). */
const LAB = {
    mode: text('Način', 'Mode'),
    descent: text('Gradientni spust', 'Gradient descent'),
    lagrange: text('Vezani ekstrem', 'Constrained extremum'),
    levelSets: text('Nivojnice', 'Level sets'),
    fn: text('Funkcija', 'Function'),
    valley: text('Dolina: \\(x^2+10y^2\\)', 'Valley: \\(x^2+10y^2\\)'),
    step: text('Korak \\(h\\) (\\(H=100h\\))', 'Step \\(h\\) (\\(H=100h\\))'),
    next: text('Naslednji korak', 'Next step'),
    playStep: text('Korak spusta', 'Descent step'),
    p0y: text('\\(P_0\\), \\(y\\)', '\\(P_0\\), \\(y\\)'),
    point: text('Točka \\(p_k\\)', 'Point \\(p_k\\)'),
    valueF: text('Vrednost \\(f\\) v točki', 'Value of \\(f\\) at the point'),
    first: text('Prvi korak z \\(f<0{,}000001\\)', 'First step with \\(f<0.000001\\)'),
    behaviour: text('Obnašanje', 'Behaviour'),
    end: text('Konec izračuna', 'End of the computation'),
    lineX: text('Točka na premici, \\(x\\)', 'Point on the line, \\(x\\)'),
    circleAngle: text('Točka na krožnici, kot', 'Point on the circle, angle'),
    tangent: text('Dotikališče (točno)', 'Point of tangency (exact)'),
    touch: text('Dotikanje', 'Tangency'),
    gradF: text('Gradient funkcije \\(f\\)', 'Gradient of \\(f\\)'),
    gradG: text('Gradient veznega pogoja \\(g\\)', 'Gradient of the constraint \\(g\\)'),
    angles: text('Koti s približnim dotikom', 'Nearly tangent angles'),
    constraint: text('Vezni pogoj', 'Constraint'),
    pointC: text('Točka na veznem pogoju', 'Point on the constraint'),
};

// ---- LS3 -------------------------------------------------------------------------------------------------------------------------

const ls3Formulas: readonly FormulaBlock[] = [
    {
        id: 'descent-step',
        latex: 'p_{k+1}=p_k-h\\,\\nabla f(p_k)',
        notation: text(
            '\\(p_k\\) je točka po \\(k\\) korakih, \\(p_0\\) je začetek, \\(h\\) je korak (graf ga zapiše kot \\(H=100h\\)) in \\(\\nabla f\\) je gradient funkcije \\(f\\).',
            '\\(p_k\\) is the point after \\(k\\) steps, \\(p_0\\) is the start, \\(h\\) is the step (the graph writes it as \\(H=100h\\)) and \\(\\nabla f\\) is the gradient of \\(f\\).',
        ),
        explanation: text(
            'Gradient kaže v smer najhitrejšega naraščanja, zato se z odštevanjem gradienta pomikamo v smer najhitrejšega padanja. Vsak korak je izračunan po tej formuli; graf točke izpiše na šest decimalk in izračuna največ \\(200\\) korakov, pot je torej izračunana, ne dokazana.',
            'The gradient points in the direction of the fastest increase, so subtracting it moves us in the direction of the fastest decrease. Every step is computed by this formula; the graph shows the points to six decimals and computes at most \\(200\\) steps, so the path is computed, not proved.',
        ),
    },
    {
        id: 'valley-factors',
        latex: 'x_{k+1}=(1-2h)\\,x_k,\\qquad y_{k+1}=(1-20h)\\,y_k',
        notation: text(
            'Za dolino \\(f(x,y)=x^2+10y^2\\) je \\(\\nabla f=(2x,\\ 20y)\\); \\(x_k\\) in \\(y_k\\) sta koordinati točke \\(p_k\\).',
            'For the valley \\(f(x,y)=x^2+10y^2\\) we have \\(\\nabla f=(2x,\\ 20y)\\); \\(x_k\\) and \\(y_k\\) are the coordinates of the point \\(p_k\\).',
        ),
        explanation: text(
            'Vsaka koordinata se v enem koraku pomnoži s svojim faktorjem, zato je \\(x_k=(1-2h)^k x_0\\) in \\(y_k=(1-20h)^k y_0\\).',
            'Each coordinate is multiplied by its own factor in one step, so \\(x_k=(1-2h)^k x_0\\) and \\(y_k=(1-20h)^k y_0\\).',
        ),
    },
    {
        id: 'threshold',
        latex: '0<h<\\frac{2}{L}',
        notation: text(
            '\\(h\\) je korak, \\(L\\) pa največje od števil, s katerimi se \\(h\\) množi v faktorjih \\(1-ah\\) (pri dolini sta to števili \\(a\\) v faktorjih zgoraj).',
            '\\(h\\) is the step and \\(L\\) is the largest of the numbers by which \\(h\\) is multiplied in the factors \\(1-ah\\) (for the valley these are the numbers \\(a\\) in the factors above).',
        ),
        explanation: text(
            'Koordinata se približuje \\(0\\), če je absolutna vrednost njenega faktorja manjša od \\(1\\); če je faktor negativen, koordinata v vsakem koraku zamenja predznak. Izrek za kvadratne funkcije: spust konvergira k minimumu iz vsakega začetka natanko tedaj, ko je \\(0<h<2/L\\), kjer je \\(L\\) največja lastna vrednost matrike drugih odvodov. Dokaz je v faktorjih \\(1-2h\\) in \\(1-20h\\); cik-cak v grafu je le ponazoritev. Za funkcije, ki niso kvadratne, izrek ne velja kot tak.',
            'A coordinate approaches \\(0\\) if the absolute value of its factor is smaller than \\(1\\); if the factor is negative, the coordinate changes its sign in every step. A theorem for quadratic functions: the descent converges to the minimum from every start exactly when \\(0<h<2/L\\), where \\(L\\) is the largest eigenvalue of the matrix of second derivatives. The proof is in the factors \\(1-2h\\) and \\(1-20h\\); the zig-zag in the graph is only an illustration. For functions that are not quadratic the theorem does not hold as stated.',
        ),
    },
];

const ls3Steps: readonly GuidedLessonStep[] = [
    step({
        id: 'ls3-bowl', order: 1,
        title: text('Skleda in spust', 'The bowl and the descent'),
        purpose: text('Napovedati smer prvega koraka in obliko poti gradientnega spusta, preden ju graf nariše.', 'Predicting the direction of the first step and the shape of the path of gradient descent before the graph draws them.'),
        explanation: text(
            'Gradientni spust se iz začetne točke \\(p_0\\) pomika po formuli spodaj. Graf je v načinu Gradientni spust: skleda \\(f(x,y)=x^2+y^2\\), začetek \\((2;\\ 1)\\), korak \\(H=3\\), torej \\(h=0{,}03\\), števec korakov je na \\(0\\). Preden pritisneš Naslednji korak, izračunaj \\(\\nabla f(2,\\ 1)\\) in zapiši napoved: kam kaže prvi korak in kakšna je oblika cele poti, ravna ali ukrivljena?',
            'Gradient descent moves from the start \\(p_0\\) by the formula below. The graph is in the mode Gradient descent: the bowl \\(f(x,y)=x^2+y^2\\), the start \\((2,\\ 1)\\), the step \\(H=3\\), so \\(h=0.03\\), and the step counter is at \\(0\\). Before you press Next step, compute \\(\\nabla f(2,\\ 1)\\) and write down a prediction: where does the first step point and what is the shape of the whole path, straight or curved?',
        ),
        formulaIds: ['descent-step'],
        observationPrompt: text(
            `Zapiši napoved. Nato trikrat pritisni ${LAB.next.sl}, vsakič preberi ${LAB.point.sl} in ${LAB.valueF.sl} ter primerjaj narisano pot z napovedjo.`,
            `Write down your prediction. Then press ${LAB.next.en} three times, each time read ${LAB.point.en} and ${LAB.valueF.en}, and compare the drawn path with your prediction.`,
        ),
        expectedObservations: [text(
            'Točke so \\(p_1=(1{,}88;\\ 0{,}94)\\), \\(p_2=(1{,}7672;\\ 0{,}8836)\\) in \\(p_3=(1{,}661168;\\ 0{,}830584)\\), vrednosti \\(f\\) pa \\(4{,}418\\), \\(3{,}903745\\) in \\(3{,}449349\\). Gradient je \\(\\nabla f=(2x,\\ 2y)\\), zato je \\(p_{k+1}=(1-2h)\\,p_k=0{,}94\\,p_k\\): vsak korak skrči točko proti \\((0;\\ 0)\\) za isti faktor \\(0{,}94\\), pot je torej del premice skozi \\((2;\\ 1)\\) in \\((0;\\ 0)\\), vrednost \\(f\\) pa se v vsakem koraku pomnoži z \\(0{,}94^2=0{,}8836\\).',
            'The points are \\(p_1=(1.88,\\ 0.94)\\), \\(p_2=(1.7672,\\ 0.8836)\\) and \\(p_3=(1.661168,\\ 0.830584)\\), and the values of \\(f\\) are \\(4.418\\), \\(3.903745\\) and \\(3.449349\\). The gradient is \\(\\nabla f=(2x,\\ 2y)\\), so \\(p_{k+1}=(1-2h)\\,p_k=0.94\\,p_k\\): every step shrinks the point towards \\((0,\\ 0)\\) by the same factor \\(0.94\\), so the path is a part of the line through \\((2,\\ 1)\\) and \\((0,\\ 0)\\) and the value of \\(f\\) is multiplied by \\(0.94^2=0.8836\\) in every step.',
        )],
        scene: optimizationScene('ls3-bowl-scene', LS3_BOWL,
            'Skleda \\(x^2+y^2\\), način Gradientni spust, začetek \\((2;\\ 1)\\), \\(H=3\\), števec korakov \\(0\\).',
            'The bowl \\(x^2+y^2\\), the mode Gradient descent, the start \\((2,\\ 1)\\), \\(H=3\\), the step counter \\(0\\).'),
    }),
    step({
        id: 'ls3-valley', order: 2,
        title: text('Dolina', 'The valley'),
        purpose: text('Napovedati, kako strma funkcija v eni smeri spremeni pot spusta pri istem začetku in koraku.', 'Predicting how a function that is steep in one direction changes the path of the descent at the same start and step.'),
        explanation: text(
            'Začetek \\((2;\\ 1)\\) in korak \\(H=3\\) ostaneta, funkcija pa se zamenja z dolino \\(f(x,y)=x^2+10y^2\\), ki ima gradient \\(\\nabla f=(2x,\\ 20y)\\). Zapiši napoved: ali bo prvi korak spet kazal proti \\((0;\\ 0)\\), katera koordinata se bo po treh korakih bolj približala \\(0\\) in ali bo pot še vedno ravna?',
            'The start \\((2,\\ 1)\\) and the step \\(H=3\\) stay, and the function is replaced with the valley \\(f(x,y)=x^2+10y^2\\), whose gradient is \\(\\nabla f=(2x,\\ 20y)\\). Write down a prediction: will the first step again point towards \\((0,\\ 0)\\), which coordinate will be closer to \\(0\\) after three steps and will the path still be straight?',
        ),
        formulaIds: [],
        observationPrompt: text(
            `Zapiši napoved. Nato v izbirniku ${LAB.fn.sl} izberi ${LAB.valley.sl} (začetek in korak ostaneta), trikrat pritisni ${LAB.next.sl} in preberi ${LAB.point.sl}, ${LAB.valueF.sl} in ${LAB.first.sl}.`,
            `Write down your prediction. Then in the chooser ${LAB.fn.en} choose ${LAB.valley.en} (the start and the step stay), press ${LAB.next.en} three times and read ${LAB.point.en}, ${LAB.valueF.en} and ${LAB.first.en}.`,
        ),
        expectedObservations: [text(
            'Po izbiri doline je \\(p_0=(2;\\ 1)\\) in \\(f=14\\); po treh korakih so točke \\((1{,}88;\\ 0{,}4)\\), \\((1{,}7672;\\ 0{,}16)\\) in \\((1{,}661168;\\ 0{,}064)\\), vrednosti \\(f\\) pa \\(5{,}1344\\), \\(3{,}378996\\) in \\(2{,}800439\\). Koordinati se množita z različnima faktorjema: \\(x\\) z \\(1-2h=0{,}94\\) (počasi, kot pri skledi), \\(y\\) z \\(1-20h=0{,}4\\) (hitro). Prvi korak zato ne kaže proti \\((0;\\ 0)\\), pot se ukrivi proti osi \\(x\\) in po njej počasi drsi proti \\((0;\\ 0)\\). Odčitek ' + LAB.first.sl + ' je tu \\(123\\) (pri skledi \\(125\\)): počasna koordinata \\(x\\) določa, kdaj je \\(f\\) dovolj majhen.',
            'After choosing the valley we have \\(p_0=(2,\\ 1)\\) and \\(f=14\\); after three steps the points are \\((1.88,\\ 0.4)\\), \\((1.7672,\\ 0.16)\\) and \\((1.661168,\\ 0.064)\\) and the values of \\(f\\) are \\(5.1344\\), \\(3.378996\\) and \\(2.800439\\). The coordinates are multiplied by different factors: \\(x\\) by \\(1-2h=0.94\\) (slowly, as for the bowl), \\(y\\) by \\(1-20h=0.4\\) (fast). So the first step does not point towards \\((0,\\ 0)\\), the path bends towards the \\(x\\) axis and slides along it slowly towards \\((0,\\ 0)\\). The readout ' + LAB.first.en + ' is \\(123\\) here (\\(125\\) for the bowl): the slow coordinate \\(x\\) decides when \\(f\\) is small enough.',
        )],
        scene: optimizationScene('ls3-valley-scene', LS3_BOWL,
            'Skleda \\(x^2+y^2\\), način Gradientni spust, začetek \\((2;\\ 1)\\), \\(H=3\\), števec korakov \\(0\\); učenec izbere dolino.',
            'The bowl \\(x^2+y^2\\), the mode Gradient descent, the start \\((2,\\ 1)\\), \\(H=3\\), the step counter \\(0\\); the learner chooses the valley.'),
    }),
    step({
        id: 'ls3-step-9', order: 3,
        title: text('Večji korak', 'A larger step'),
        purpose: text('Napovedati iz faktorjev, kaj večji korak stori s potjo po dolini.', 'Predicting from the factors what a larger step does to the path along the valley.'),
        explanation: text(
            'Pri dolini je faktor za \\(x\\) enak \\(1-2h\\) in za \\(y\\) enak \\(1-20h\\) (formula spodaj). Zdaj je \\(H=3\\), torej \\(h=0{,}03\\), in pot po počasni koordinati \\(x\\) drsi proti \\((0;\\ 0)\\). Zapiši napoved za večji korak \\(H=9\\), torej \\(h=0{,}09\\): izračunaj oba faktorja, določi predznak in velikost faktorja za \\(y\\) ter napovej, ali bo pot ostala gladka in ali bo \\(x\\) padal hitreje ali počasneje kot pri \\(H=3\\).',
            'For the valley the factor for \\(x\\) is \\(1-2h\\) and for \\(y\\) it is \\(1-20h\\) (the formula below). Now \\(H=3\\), so \\(h=0.03\\), and the path slides towards \\((0,\\ 0)\\) along the slow coordinate \\(x\\). Write down a prediction for a larger step \\(H=9\\), so \\(h=0.09\\): compute both factors, determine the sign and the size of the factor for \\(y\\) and predict whether the path stays smooth and whether \\(x\\) falls faster or slower than at \\(H=3\\).',
        ),
        formulaIds: ['valley-factors'],
        observationPrompt: text(
            `Zapiši napoved. Nato v polje ${LAB.step.sl} vpiši \\(9\\), trikrat pritisni ${LAB.next.sl}, preberi ${LAB.point.sl} in ${LAB.valueF.sl} ter preberi ${LAB.behaviour.sl} in ${LAB.first.sl}.`,
            `Write down your prediction. Then in the field ${LAB.step.en} enter \\(9\\), press ${LAB.next.en} three times, read ${LAB.point.en} and ${LAB.valueF.en}, and read ${LAB.behaviour.en} and ${LAB.first.en}.`,
        ),
        expectedObservations: [text(
            'Faktorja sta \\(1-2h=0{,}82\\) in \\(1-20h=-0{,}8\\). Točke so \\((1{,}64;\\ -0{,}8)\\), \\((1{,}3448;\\ 0{,}64)\\) in \\((1{,}102736;\\ -0{,}512)\\), vrednosti \\(f\\) pa \\(9{,}0896\\), \\(5{,}904487\\) in \\(3{,}837467\\). Koordinata \\(y\\) v vsakem koraku zamenja predznak in se skrči na \\(0{,}8\\) prejšnje velikosti, zato pot cik-cak preskakuje čez os \\(x\\) in se vseeno približuje \\((0;\\ 0)\\); odčitek ' + LAB.behaviour.sl + ' pravi, da pot konvergira k \\((0;\\ 0)\\). Koordinata \\(x\\) pada hitreje kot pri \\(H=3\\) in odčitek ' + LAB.first.sl + ' je \\(40\\) namesto \\(123\\).',
            'The factors are \\(1-2h=0.82\\) and \\(1-20h=-0.8\\). The points are \\((1.64,\\ -0.8)\\), \\((1.3448,\\ 0.64)\\) and \\((1.102736,\\ -0.512)\\) and the values of \\(f\\) are \\(9.0896\\), \\(5.904487\\) and \\(3.837467\\). The coordinate \\(y\\) changes its sign in every step and shrinks to \\(0.8\\) of its previous size, so the path zig-zags across the \\(x\\) axis and still approaches \\((0,\\ 0)\\); the readout ' + LAB.behaviour.en + ' says that the path converges to \\((0,\\ 0)\\). The coordinate \\(x\\) falls faster than at \\(H=3\\) and the readout ' + LAB.first.en + ' is \\(40\\) instead of \\(123\\).',
        )],
        scene: optimizationScene('ls3-step-9-scene', LS3_VALLEY,
            'Dolina \\(x^2+10y^2\\), način Gradientni spust, začetek \\((2;\\ 1)\\), \\(H=3\\), števec korakov \\(0\\); učenec nastavi \\(H=9\\).',
            'The valley \\(x^2+10y^2\\), the mode Gradient descent, the start \\((2,\\ 1)\\), \\(H=3\\), the step counter \\(0\\); the learner sets \\(H=9\\).'),
    }),
    step({
        id: 'ls3-step-10', order: 4,
        title: text('Še večji korak', 'A still larger step'),
        purpose: text('Napovedati iz faktorja, kaj se zgodi s koordinato \\(y\\) in vrednostjo \\(f\\) pri še večjem koraku.', 'Predicting from the factor what happens to the coordinate \\(y\\) and the value of \\(f\\) at a still larger step.'),
        explanation: text(
            'Pri \\(H=9\\) se je \\(y\\) v vsakem koraku skrčil na \\(0{,}8\\) prejšnje velikosti. Zdaj poskusi \\(H=10\\), torej \\(h=0{,}1\\). Izračunaj faktor za \\(y\\) in zapiši napoved: kaj se po mnogih korakih dogaja s \\(y\\) in kaj z \\(x\\), in ali se bo vrednost \\(f\\) ustalila pri \\(0\\)?',
            'At \\(H=9\\) the coordinate \\(y\\) shrank to \\(0.8\\) of its previous size in every step. Now try \\(H=10\\), so \\(h=0.1\\). Compute the factor for \\(y\\) and write down a prediction: what happens to \\(y\\) and to \\(x\\) after many steps, and will the value of \\(f\\) settle at \\(0\\)?',
        ),
        formulaIds: [],
        observationPrompt: text(
            `Zapiši napoved. Nato v polje ${LAB.step.sl} vpiši \\(10\\), trikrat pritisni ${LAB.next.sl} in preberi ${LAB.point.sl} ter ${LAB.valueF.sl}; nato v polje ${LAB.playStep.sl} vpiši \\(200\\) in preberi isto ter ${LAB.first.sl} in ${LAB.behaviour.sl}.`,
            `Write down your prediction. Then in the field ${LAB.step.en} enter \\(10\\), press ${LAB.next.en} three times and read ${LAB.point.en} and ${LAB.valueF.en}; then in the field ${LAB.playStep.en} enter \\(200\\) and read the same, and ${LAB.first.en} and ${LAB.behaviour.en}.`,
        ),
        expectedObservations: [text(
            'Faktor za \\(y\\) je \\(1-20h=-1\\), za \\(x\\) pa \\(1-2h=0{,}8\\). Po treh korakih so točke \\((1{,}6;\\ -1)\\), \\((1{,}28;\\ 1)\\) in \\((1{,}024;\\ -1)\\), vrednosti \\(f\\) pa \\(12{,}56\\), \\(11{,}6384\\) in \\(11{,}048576\\). Koordinata \\(y\\) ostane za vedno \\(1\\) ali \\(-1\\), \\(x\\) gre proti \\(0\\): pri koraku \\(200\\) je \\(p_{200}=(0;\\ 1)\\) in \\(f=10\\), ne \\(0\\). Odčitek ' + LAB.first.sl + ' pravi, da ni dosežen v \\(200\\) korakih, odčitek ' + LAB.behaviour.sl + ' pa, da \\(y\\) niha med dvema vrednostma.',
            'The factor for \\(y\\) is \\(1-20h=-1\\) and for \\(x\\) it is \\(1-2h=0.8\\). After three steps the points are \\((1.6,\\ -1)\\), \\((1.28,\\ 1)\\) and \\((1.024,\\ -1)\\) and the values of \\(f\\) are \\(12.56\\), \\(11.6384\\) and \\(11.048576\\). The coordinate \\(y\\) stays \\(1\\) or \\(-1\\) for ever, \\(x\\) goes to \\(0\\): at step \\(200\\) we have \\(p_{200}=(0,\\ 1)\\) and \\(f=10\\), not \\(0\\). The readout ' + LAB.first.en + ' says that it is not reached in \\(200\\) steps and the readout ' + LAB.behaviour.en + ' says that \\(y\\) oscillates between two values.',
        )],
        scene: optimizationScene('ls3-step-10-scene', LS3_VALLEY_9,
            'Dolina \\(x^2+10y^2\\), način Gradientni spust, začetek \\((2;\\ 1)\\), \\(H=9\\), števec korakov \\(0\\); učenec nastavi \\(H=10\\).',
            'The valley \\(x^2+10y^2\\), the mode Gradient descent, the start \\((2,\\ 1)\\), \\(H=9\\), the step counter \\(0\\); the learner sets \\(H=10\\).'),
    }),
    step({
        id: 'ls3-step-11', order: 5,
        title: text('Največji korak', 'The largest step'),
        purpose: text('Napovedati iz faktorja, kaj se zgodi, ko je korak še malo večji.', 'Predicting from the factor what happens when the step is a little larger still.'),
        explanation: text(
            'Pri \\(H=10\\) je koordinata \\(y\\) ostala \\(\\pm1\\). Zdaj poskusi \\(H=11\\), torej \\(h=0{,}11\\). Izračunaj faktor za \\(y\\) in zapiši napoved: kaj se zgodi z velikostjo \\(y\\), z vrednostjo \\(f\\) in s potjo ter ali bo graf pot lahko narisal do konca izračuna.',
            'At \\(H=10\\) the coordinate \\(y\\) stayed \\(\\pm1\\). Now try \\(H=11\\), so \\(h=0.11\\). Compute the factor for \\(y\\) and write down a prediction: what happens to the size of \\(y\\), to the value of \\(f\\) and to the path, and will the graph be able to draw the path to the end of the computation.',
        ),
        formulaIds: [],
        observationPrompt: text(
            `Zapiši napoved. Nato v polje ${LAB.step.sl} vpiši \\(11\\), trikrat pritisni ${LAB.next.sl} in preberi ${LAB.point.sl} ter ${LAB.valueF.sl}; nato v polje ${LAB.playStep.sl} vpiši \\(75\\) in preberi isto ter ${LAB.end.sl} in ${LAB.behaviour.sl}.`,
            `Write down your prediction. Then in the field ${LAB.step.en} enter \\(11\\), press ${LAB.next.en} three times and read ${LAB.point.en} and ${LAB.valueF.en}; then in the field ${LAB.playStep.en} enter \\(75\\) and read the same, and ${LAB.end.en} and ${LAB.behaviour.en}.`,
        ),
        expectedObservations: [text(
            'Faktor za \\(y\\) je \\(1-20h=-1{,}2\\). Po treh korakih so točke \\((1{,}56;\\ -1{,}2)\\), \\((1{,}2168;\\ 1{,}44)\\) in \\((0{,}949104;\\ -1{,}728)\\), vrednosti \\(f\\) pa \\(16{,}8336\\), \\(22{,}216602\\) in \\(30{,}760638\\): vrednost \\(f\\) narašča. Graf konča izračun pri koraku \\(75\\) (odčitek ' + LAB.end.sl + ': pot je ušla predaleč), kjer je \\(p_{75}=(0;\\ -868147{,}369314)\\), kar je \\(1{,}2^{75}\\approx8{,}68\\cdot10^5\\). Odčitek ' + LAB.behaviour.sl + ' pravi, da pot divergira.',
            'The factor for \\(y\\) is \\(1-20h=-1.2\\). After three steps the points are \\((1.56,\\ -1.2)\\), \\((1.2168,\\ 1.44)\\) and \\((0.949104,\\ -1.728)\\) and the values of \\(f\\) are \\(16.8336\\), \\(22.216602\\) and \\(30.760638\\): the value of \\(f\\) grows. The graph ends the computation at step \\(75\\) (the readout ' + LAB.end.en + ': the path went too far), where \\(p_{75}=(0,\\ -868147.369314)\\), which is \\(1.2^{75}\\approx8.68\\cdot10^5\\). The readout ' + LAB.behaviour.en + ' says that the path diverges.',
        )],
        scene: optimizationScene('ls3-step-11-scene', LS3_VALLEY_10,
            'Dolina \\(x^2+10y^2\\), način Gradientni spust, začetek \\((2;\\ 1)\\), \\(H=10\\), števec korakov \\(0\\); učenec nastavi \\(H=11\\).',
            'The valley \\(x^2+10y^2\\), the mode Gradient descent, the start \\((2,\\ 1)\\), \\(H=10\\), the step counter \\(0\\); the learner sets \\(H=11\\).'),
    }),
    step({
        id: 'ls3-threshold', order: 6,
        title: text('Prag koraka', 'The step threshold'),
        purpose: text('Napovedati prag koraka iz faktorja in preizkusiti, da začetek na osi \\(x\\) prag zaobide.', 'Predicting the threshold of the step from the factor and testing that a start on the \\(x\\) axis avoids it.'),
        explanation: text(
            'Pri korakih \\(H=9\\), \\(10\\) in \\(11\\) si videl tri različna vedenja koordinate \\(y\\). Zapiši dve napovedi. Prva: kakšen pogoj za faktor \\(1-20h\\) zagotovi, da se \\(y\\) skrči, in za katere cele \\(H\\) je izpolnjen. Druga: kaj se zgodi pri \\(H=11\\), če je začetek na osi \\(x\\), torej \\(y_0=0\\), kar je začetek \\((2;\\ 0)\\). Pogoj in izrek o pragu sta v formuli spodaj.',
            'At the steps \\(H=9\\), \\(10\\) and \\(11\\) you saw three different behaviours of the coordinate \\(y\\). Write down two predictions. The first: what condition on the factor \\(1-20h\\) makes \\(y\\) shrink, and for which whole numbers \\(H\\) it holds. The second: what happens at \\(H=11\\) if the start is on the \\(x\\) axis, so \\(y_0=0\\), which is the start \\((2,\\ 0)\\). The condition and the theorem about the threshold are in the formula below.',
        ),
        formulaIds: ['threshold'],
        observationPrompt: text(
            `Zapiši obe napovedi in primerjaj prvo z odčitki iz korakov 3 do 5. Nato v polje ${LAB.p0y.sl} vpiši \\(0\\) (\\(H\\) ostane \\(11\\)), trikrat pritisni ${LAB.next.sl} in preberi ${LAB.first.sl} in ${LAB.behaviour.sl}.`,
            `Write down both predictions and compare the first with the readouts of steps 3 to 5. Then in the field ${LAB.p0y.en} enter \\(0\\) (\\(H\\) stays \\(11\\)), press ${LAB.next.en} three times and read ${LAB.first.en} and ${LAB.behaviour.en}.`,
        ),
        expectedObservations: [text(
            'Velja \\(\\lvert1-20h\\rvert<1\\) natanko za \\(0<h<0{,}1\\), torej za \\(H=1,\\ldots,9\\); pri \\(H=10\\) je faktor \\(-1\\), pri \\(H>10\\) pa je njegova absolutna vrednost večja od \\(1\\), kar se ujema z odčitki \\(H=9\\), \\(10\\) in \\(11\\). Meja \\(h=2/L=0{,}1\\) je izrek za kvadratne funkcije z \\(L=20\\); cik-cak v grafu je ponazoritev, dokaz je faktor. Za začetek \\((2;\\ 0)\\) je \\(y_k=0\\) pri vsakem koraku, zato ostane le \\(x\\) s faktorjem \\(1-2h=0{,}78\\): točke so \\((1{,}56;\\ 0)\\), \\((1{,}2168;\\ 0)\\) in \\((0{,}949104;\\ 0)\\), vrednosti \\(f\\) pa \\(2{,}4336\\), \\(1{,}480602\\) in \\(0{,}900798\\). Odčitek ' + LAB.first.sl + ' je \\(31\\) in odčitek ' + LAB.behaviour.sl + ' pravi, da pot konvergira k \\((0;\\ 0)\\), čeprav je \\(H=11\\).',
            'We have \\(\\lvert1-20h\\rvert<1\\) exactly for \\(0<h<0.1\\), so for \\(H=1,\\ldots,9\\); at \\(H=10\\) the factor is \\(-1\\) and at \\(H>10\\) its absolute value is larger than \\(1\\), which agrees with the readouts for \\(H=9\\), \\(10\\) and \\(11\\). The boundary \\(h=2/L=0.1\\) is the theorem for quadratic functions with \\(L=20\\); the zig-zag in the graph is an illustration, the proof is the factor. For the start \\((2,\\ 0)\\) we have \\(y_k=0\\) at every step, so only \\(x\\) remains with the factor \\(1-2h=0.78\\): the points are \\((1.56,\\ 0)\\), \\((1.2168,\\ 0)\\) and \\((0.949104,\\ 0)\\) and the values of \\(f\\) are \\(2.4336\\), \\(1.480602\\) and \\(0.900798\\). The readout ' + LAB.first.en + ' is \\(31\\) and the readout ' + LAB.behaviour.en + ' says that the path converges to \\((0,\\ 0)\\), although \\(H=11\\).',
        )],
        scene: optimizationScene('ls3-threshold-scene', LS3_VALLEY_11,
            'Dolina \\(x^2+10y^2\\), način Gradientni spust, začetek \\((2;\\ 1)\\), \\(H=11\\), števec korakov \\(0\\); učenec vpiše \\(y_0=0\\).',
            'The valley \\(x^2+10y^2\\), the mode Gradient descent, the start \\((2,\\ 1)\\), \\(H=11\\), the step counter \\(0\\); the learner enters \\(y_0=0\\).'),
    }),
    step({
        id: 'ls3-explore', order: 7,
        title: text('Raziskovanje', 'Exploration'),
        purpose: text('Samostojno preizkusiti napoved za dolino in videti, česa graf za druge funkcije ne trdi.', 'Testing the prediction for the valley on your own and seeing what the graph does not claim for other functions.'),
        explanation: text(
            `Graf je spet v začetnem stanju (Skleda, način ${LAB.levelSets.sl}). Izberi način ${LAB.descent.sl} in preizkusi napoved za dolino pri več začetkih in korakih: izrek o pragu velja za kvadratno dolino, torej za \\(1\\le H\\le9\\) pot konvergira, pri \\(H=10\\) \\(y\\) niha, pri \\(H>10\\) pa pot divergira, razen če je \\(y_0=0\\): tedaj pot konvergira pri vsakem \\(H\\), ki ga graf ponuja. Pri skledi in gričih graf nariše le pot in ne trdi, ali konvergira; griči imajo več kritičnih točk in pot je odvisna od začetka, odčitka ${LAB.first.sl} pa tam ne jemlji kot merila konvergence, ker \\(f\\) pade tudi pod \\(0\\).`,
            `The graph is back in its starting state (Bowl, the mode ${LAB.levelSets.en}). Choose the mode ${LAB.descent.en} and test the prediction for the valley at several starts and steps: the theorem about the threshold holds for the quadratic valley, so for \\(1\\le H\\le9\\) the path converges, at \\(H=10\\) \\(y\\) oscillates and at \\(H>10\\) the path diverges, unless \\(y_0=0\\): then the path converges at every \\(H\\) the graph offers. For the bowl and the hills the graph draws only the path and makes no claim about convergence; the hills have several critical points and the path depends on the start, and the readout ${LAB.first.en} is not a measure of convergence there, because \\(f\\) also falls below \\(0\\).`,
        ),
        formulaIds: [],
        observationPrompt: text(
            'Preizkusi napoved za dolino, nato raziskuj samostojno; nič ni treba vpisati.',
            'Test your prediction for the valley, then explore on your own; nothing has to be entered.',
        ),
        expectedObservations: [text(
            'Pri gričih, začetku \\((2;\\ 1)\\) in \\(H=3\\) je po treh korakih \\(p_3=(2{,}031922;\\ 0{,}954997)\\) in \\(f=0{,}73105\\); po \\(200\\) korakih je pot pri \\((1{,}601125;\\ -1{,}532)\\), kjer je \\(f=-0{,}998788\\). Odčitek ' + LAB.behaviour.sl + ' tam pove le, da je narisana pot in da ne trdimo, ali konvergira.',
            'For the hills, the start \\((2,\\ 1)\\) and \\(H=3\\) we have \\(p_3=(2.031922,\\ 0.954997)\\) and \\(f=0.73105\\) after three steps; after \\(200\\) steps the path is at \\((1.601125,\\ -1.532)\\), where \\(f=-0.998788\\). The readout ' + LAB.behaviour.en + ' says there only that the path is drawn and that we make no claim about convergence.',
        )],
        scene: optimizationScene('ls3-explore-scene', LS3_EXPLORE,
            'Začetno stanje: skleda, \\(c=1\\), sonda v \\((0{,}6;\\ 0{,}8)\\), način Nivojnice; vse nastavitve so proste.',
            'The starting state: the bowl, \\(c=1\\), the probe at \\((0.6,\\ 0.8)\\), the mode Level sets; every setting is free.'),
    }),
];

// ---- LS4 -------------------------------------------------------------------------------------------------------------------------

const ls4Formulas: readonly FormulaBlock[] = [
    {
        id: 'lagrange-condition',
        latex: '\\nabla f=\\lambda\\,\\nabla g',
        notation: text(
            '\\(f\\) je funkcija, katere ekstrem iščemo, \\(g\\) je funkcija veznega pogoja (pogoj je \\(g=\\text{konstanta}\\)), \\(\\nabla f\\) in \\(\\nabla g\\) sta njuna gradienta, \\(\\lambda\\) pa število.',
            '\\(f\\) is the function whose extremum we look for, \\(g\\) is the function of the constraint (the constraint is \\(g=\\text{constant}\\)), \\(\\nabla f\\) and \\(\\nabla g\\) are their gradients and \\(\\lambda\\) is a number.',
        ),
        explanation: text(
            'Izrek (Lagrange): če ima \\(f\\) na veznem pogoju ekstrem v točki, kjer je \\(\\nabla g\\ne0\\), sta v njej gradienta vzporedna, torej velja zgornja enačba. To je potreben pogoj, ne zadosten: pove, kje iskati, ne pa, ali je v točki največja ali najmanjša vrednost ali nobena. Gradienta in nivojnica v grafu sta le ponazoritev.',
            'A theorem (Lagrange): if \\(f\\) has an extremum on the constraint at a point where \\(\\nabla g\\ne0\\), the two gradients are parallel there, so the equation above holds. The condition is necessary, not sufficient: it says where to look, not whether the point gives a maximum, a minimum or neither. The gradients and the level set in the graph are only an illustration.',
        ),
    },
];

const ls4Steps: readonly GuidedLessonStep[] = [
    step({
        id: 'ls4-line', order: 1,
        title: text('Funkcija na premici', 'A function on a line'),
        purpose: text('Napovedati, v kateri točki premice je vrednost \\(f\\) najmanjša, preden graf izpiše točko.', 'Predicting at which point of a line the value of \\(f\\) is smallest before the graph shows the point.'),
        explanation: text(
            `Graf je v načinu ${LAB.levelSets.sl}: skleda \\(f(x,y)=x^2+y^2\\) in nivojnice pri \\(c=1,\\ 2,\\ 3\\) v oknu od \\(-2\\) do \\(2\\). Vezni pogoj, premica \\(x+2y=5\\), v tem načinu ni narisana in večinoma poteka zunaj okna, zato si jo skiciraj. Zapiši napoved: v kateri točki premice je \\(f\\) najmanjša in kolikšna je tam.`,
            `The graph is in the mode ${LAB.levelSets.en}: the bowl \\(f(x,y)=x^2+y^2\\) and the level sets at \\(c=1,\\ 2,\\ 3\\) in the window from \\(-2\\) to \\(2\\). The constraint, the line \\(x+2y=5\\), is not drawn in this mode and mostly runs outside the window, so sketch it. Write down a prediction: at which point of the line is \\(f\\) smallest and what is its value there.`,
        ),
        formulaIds: [],
        observationPrompt: text(
            `Zapiši napoved. Nato v izbirniku ${LAB.mode.sl} izberi ${LAB.lagrange.sl}, premakni drsnik ${LAB.lineX.sl} (ali vleci točko po premici) in preberi ${LAB.valueF.sl} pri \\(x=0\\), \\(1\\) in \\(2\\).`,
            `Write down your prediction. Then in the chooser ${LAB.mode.en} choose ${LAB.lagrange.en}, move the slider ${LAB.lineX.en} (or drag the point along the line) and read ${LAB.valueF.en} at \\(x=0\\), \\(1\\) and \\(2\\).`,
        ),
        expectedObservations: [text(
            'Točka na premici je \\((x;\\ (5-x)/2)\\), zato je \\(f=x^2+\\bigl((5-x)/2\\bigr)^2=5+1{,}25\\,(x-1)^2\\). Pri \\(x=0\\) je točka \\((0;\\ 2{,}5)\\) in \\(f=6{,}25\\), pri \\(x=2\\) je \\((2;\\ 1{,}5)\\) in \\(f=6{,}25\\), pri \\(x=1\\) pa \\((1;\\ 2)\\) in \\(f=5\\), kar je najmanj: za vsak drug \\(x\\) je \\(f>5\\). Graf ob preklopu v ' + LAB.lagrange.sl + ' izpiše tudi vrstico ' + LAB.tangent.sl + ' z vrednostjo \\((1;\\ 2)\\).',
            'A point of the line is \\((x,\\ (5-x)/2)\\), so \\(f=x^2+\\bigl((5-x)/2\\bigr)^2=5+1.25\\,(x-1)^2\\). At \\(x=0\\) the point is \\((0,\\ 2.5)\\) and \\(f=6.25\\), at \\(x=2\\) it is \\((2,\\ 1.5)\\) and \\(f=6.25\\), and at \\(x=1\\) it is \\((1,\\ 2)\\) and \\(f=5\\), which is the smallest: for every other \\(x\\) we have \\(f>5\\). On switching to ' + LAB.lagrange.en + ' the graph also shows the row ' + LAB.tangent.en + ' with the value \\((1,\\ 2)\\).',
        )],
        scene: optimizationScene('ls4-line-scene', LS4_BOWL_LINE,
            'Skleda \\(x^2+y^2\\), način Nivojnice, nivojnice pri \\(c=1,\\ 2,\\ 3\\), okno od \\(-2\\) do \\(2\\); vezni pogoj \\(x+2y=5\\) je shranjen s točko pri \\(x=0\\), a ni narisan; učenec preklopi v Vezani ekstrem.',
            'The bowl \\(x^2+y^2\\), the mode Level sets, the level sets at \\(c=1,\\ 2,\\ 3\\), the window from \\(-2\\) to \\(2\\); the constraint \\(x+2y=5\\) is stored with the point at \\(x=0\\) but not drawn; the learner switches to Constrained extremum.'),
    }),
    step({
        id: 'ls4-touch', order: 2,
        title: text('Nivojnica in premica', 'The level set and the line'),
        purpose: text('Napovedati, koliko skupnih točk ima nivojnica skozi točko premice s premico, in najti vrednost, pri kateri je ena.', 'Predicting how many points the level set through a point of the line shares with the line, and finding the value at which it is one.'),
        explanation: text(
            `Graf je spet v načinu ${LAB.levelSets.sl} z nivojnicami pri \\(c=1,\\ 2,\\ 3\\); premica \\(x+2y=5\\) ni narisana. Točka premice pri \\(x=0\\), \\((0;\\ 2{,}5)\\), ima \\(f=6{,}25\\); nivojnica \\(f=6{,}25\\) skozi njo ni narisana. Zapiši dve napovedi: koliko skupnih točk ima ta nivojnica s premico (vrednost \\(f\\) pri \\(x=2\\) iz prejšnjega koraka ti pomaga) in pri kateri vrednosti \\(f\\) ima nivojnica s premico natanko eno skupno točko (vstavi \\(y=(5-x)/2\\) v \\(f\\) in poišči, kdaj ima enačba eno rešitev).`,
            `The graph is back in the mode ${LAB.levelSets.en} with the level sets at \\(c=1,\\ 2,\\ 3\\); the line \\(x+2y=5\\) is not drawn. The point of the line at \\(x=0\\), \\((0,\\ 2.5)\\), has \\(f=6.25\\); the level set \\(f=6.25\\) through it is not drawn. Write down two predictions: how many points this level set shares with the line (the value of \\(f\\) at \\(x=2\\) from the previous step helps) and at which value of \\(f\\) the level set shares exactly one point with the line (substitute \\(y=(5-x)/2\\) into \\(f\\) and find when the equation has one solution).`,
        ),
        formulaIds: [],
        observationPrompt: text(
            `Zapiši napovedi. Nato v izbirniku ${LAB.mode.sl} izberi ${LAB.lagrange.sl}, primerjaj črtkano nivojnico skozi točko s premico, v polje ${LAB.lineX.sl} vpiši \\(1\\) in preberi ${LAB.pointC.sl}, ${LAB.valueF.sl} in ${LAB.tangent.sl}.`,
            `Write down your predictions. Then in the chooser ${LAB.mode.en} choose ${LAB.lagrange.en}, compare the dashed level set through the point with the line, enter \\(1\\) in the field ${LAB.lineX.en} and read ${LAB.pointC.en}, ${LAB.valueF.en} and ${LAB.tangent.en}.`,
        ),
        expectedObservations: [text(
            'Nivojnica \\(f=6{,}25\\) je krožnica s polmerom \\(2{,}5\\), ki seka premico v dveh točkah, \\((0;\\ 2{,}5)\\) in \\((2;\\ 1{,}5)\\). Pri \\(x=1\\) je točka \\((1;\\ 2)\\) in \\(f=5\\): nivojnica \\(f=5\\) se premice le dotakne (premica leži sicer zunaj nje), vsaka nivojnica z manjšim \\(f\\) pa premice sploh ne doseže. Vrstica ' + LAB.tangent.sl + ' ima pri vsakem \\(x\\) vrednost \\((1;\\ 2)\\); to je točen izračun, ne ocena.',
            'The level set \\(f=6.25\\) is a circle of radius \\(2.5\\) that cuts the line in two points, \\((0,\\ 2.5)\\) and \\((2,\\ 1.5)\\). At \\(x=1\\) the point is \\((1,\\ 2)\\) and \\(f=5\\): the level set \\(f=5\\) only touches the line (the line otherwise lies outside it), and every level set with a smaller \\(f\\) does not reach the line at all. The row ' + LAB.tangent.en + ' has the value \\((1,\\ 2)\\) at every \\(x\\); this is an exact computation, not an estimate.',
        )],
        scene: optimizationScene('ls4-touch-scene', LS4_BOWL_LINE,
            'Skleda \\(x^2+y^2\\), način Nivojnice, nivojnice pri \\(c=1,\\ 2,\\ 3\\); premica \\(x+2y=5\\) je shranjena s točko pri \\(x=0\\), \\((0;\\ 2{,}5)\\), a ni narisana; učenec preklopi v Vezani ekstrem in vpiše \\(x=1\\).',
            'The bowl \\(x^2+y^2\\), the mode Level sets, the level sets at \\(c=1,\\ 2,\\ 3\\); the line \\(x+2y=5\\) is stored with the point at \\(x=0\\), \\((0,\\ 2.5)\\), but not drawn; the learner switches to Constrained extremum and enters \\(x=1\\).'),
    }),
    step({
        id: 'ls4-gradients', order: 3,
        title: text('Gradienta', 'The two gradients'),
        purpose: text('Napovedati iz formul, kakšna sta gradienta funkcij \\(f\\) in \\(g\\) v točki \\((1;\\ 2)\\) in kako sta povezana.', 'Predicting from the formulas what the gradients of \\(f\\) and \\(g\\) are at the point \\((1,\\ 2)\\) and how they are related.'),
        explanation: text(
            `Vezni pogoj zapišemo kot \\(g(x,y)=x+2y\\) (pogoj je \\(g=5\\)). Točka je na premici pri \\(x=0\\) in gradienta sta v njej \\(\\nabla f=(0;\\ 5)\\) in \\(\\nabla g=(1;\\ 2)\\), ki nista vzporedna. Zapiši napoved za točko \\((1;\\ 2)\\): izračunaj \\(\\nabla f\\) in \\(\\nabla g\\) in ugotovi, ali sta vzporedna in s katerim številom \\(\\lambda\\) velja enačba spodaj.`,
            `We write the constraint as \\(g(x,y)=x+2y\\) (the constraint is \\(g=5\\)). The point is on the line at \\(x=0\\) and the gradients there are \\(\\nabla f=(0,\\ 5)\\) and \\(\\nabla g=(1,\\ 2)\\), which are not parallel. Write down a prediction for the point \\((1,\\ 2)\\): compute \\(\\nabla f\\) and \\(\\nabla g\\) and determine whether they are parallel and with which number \\(\\lambda\\) the equation below holds.`,
        ),
        formulaIds: ['lagrange-condition'],
        observationPrompt: text(
            `Zapiši napoved. Nato v polje ${LAB.lineX.sl} vpiši \\(1\\) in preberi ${LAB.gradF.sl}, ${LAB.gradG.sl} in ${LAB.touch.sl}; nato vpiši še \\(2\\) in primerjaj ${LAB.touch.sl}.`,
            `Write down your prediction. Then in the field ${LAB.lineX.en} enter \\(1\\) and read ${LAB.gradF.en}, ${LAB.gradG.en} and ${LAB.touch.en}; then enter \\(2\\) as well and compare ${LAB.touch.en}.`,
        ),
        expectedObservations: [text(
            'Pri \\(x=1\\) je \\(\\nabla f=(2;\\ 4)\\), \\(\\nabla g=(1;\\ 2)\\), torej \\(\\nabla f=2\\,\\nabla g\\) in \\(\\lambda=2\\); vrstica ' + LAB.touch.sl + ' pove, da sta gradienta vzporedna, \\(\\lambda=2\\) (točno). Pri \\(x=2\\) je \\(\\nabla f=(4;\\ 3)\\) in \\(\\nabla g=(1;\\ 2)\\), determinanta je \\(5\\), gradienta nista vzporedna. Pri \\(x=0\\) je determinanta \\(-5\\), pri \\(x=1\\) je \\(0\\) (po računu je enaka \\(5x-5\\)). Enačba velja na veznem pogoju v točki ekstrema (izrek, potreben pogoj); puščice v grafu so ponazoritev.',
            'At \\(x=1\\) we have \\(\\nabla f=(2,\\ 4)\\), \\(\\nabla g=(1,\\ 2)\\), so \\(\\nabla f=2\\,\\nabla g\\) and \\(\\lambda=2\\); the row ' + LAB.touch.en + ' says that the gradients are parallel, \\(\\lambda=2\\) (exact). At \\(x=2\\) we have \\(\\nabla f=(4,\\ 3)\\) and \\(\\nabla g=(1,\\ 2)\\), the determinant is \\(5\\), and the gradients are not parallel. At \\(x=0\\) the determinant is \\(-5\\) and at \\(x=1\\) it is \\(0\\) (by computation it equals \\(5x-5\\)). The equation holds on the constraint at the point of an extremum (a theorem, a necessary condition); the arrows in the graph are an illustration.',
        )],
        scene: optimizationScene('ls4-gradients-scene', LS4_BOWL_LINE_LAGRANGE,
            'Skleda \\(x^2+y^2\\), način Vezani ekstrem, premica \\(x+2y=5\\), točka pri \\(x=0\\); učenec vpiše \\(x=1\\) in nato \\(x=2\\).',
            'The bowl \\(x^2+y^2\\), the mode Constrained extremum, the line \\(x+2y=5\\), the point at \\(x=0\\); the learner enters \\(x=1\\) and then \\(x=2\\).'),
    }),
    step({
        id: 'ls4-circle', order: 4,
        title: text('Produkt na krožnici', 'A product on a circle'),
        purpose: text('Napovedati, kje na krožnici je produkt \\(xy\\) največji in najmanjši in v koliko točkah se nivojnica dotika krožnice.', 'Predicting where on a circle the product \\(xy\\) is largest and smallest and at how many points a level set touches the circle.'),
        explanation: text(
            `Graf je v načinu ${LAB.levelSets.sl}: funkcija \\(f(x,y)=xy\\) z nivojnicami pri \\(c=0,\\ 1,\\ 2\\) v oknu od \\(-2\\) do \\(2\\). Vezni pogoj, krožnica \\(x^2+y^2=2\\) s polmerom približno \\(1{,}41\\), v tem načinu ni narisana. Zapiši napoved: v katerih točkah krožnice je \\(xy\\) največji in v katerih najmanjši, kolikšni sta ti vrednosti in v koliko točkah se nivojnica funkcije \\(f\\) dotika krožnice.`,
            `The graph is in the mode ${LAB.levelSets.en}: the function \\(f(x,y)=xy\\) with the level sets at \\(c=0,\\ 1,\\ 2\\) in the window from \\(-2\\) to \\(2\\). The constraint, the circle \\(x^2+y^2=2\\) of radius about \\(1.41\\), is not drawn in this mode. Write down a prediction: at which points of the circle is \\(xy\\) largest and at which smallest, what are these values and at how many points does a level set of \\(f\\) touch the circle.`,
        ),
        formulaIds: [],
        observationPrompt: text(
            `Zapiši napoved. Nato v izbirniku ${LAB.mode.sl} izberi ${LAB.lagrange.sl} in pri drsniku ${LAB.circleAngle.sl} (kot je izpisan v stopinjah) nastavi kote \\(45^\\circ\\), \\(135^\\circ\\), \\(225^\\circ\\) in \\(315^\\circ\\) ter še \\(0^\\circ\\); pri vsakem preberi ${LAB.pointC.sl}, ${LAB.valueF.sl} in ${LAB.touch.sl} (ali sta gradienta vzporedna). Preberi še ${LAB.angles.sl}.`,
            `Write down your prediction. Then in the chooser ${LAB.mode.en} choose ${LAB.lagrange.en} and at the slider ${LAB.circleAngle.en} (the angle is shown in degrees) set the angles \\(45^\\circ\\), \\(135^\\circ\\), \\(225^\\circ\\) and \\(315^\\circ\\) and also \\(0^\\circ\\); at each read ${LAB.pointC.en}, ${LAB.valueF.en} and ${LAB.touch.en} (whether the gradients are parallel). Also read ${LAB.angles.en}.`,
        ),
        expectedObservations: [text(
            'Pri \\(45^\\circ\\) je točka \\((1;\\ 1)\\) in \\(f=1\\), pri \\(135^\\circ\\) \\((-1;\\ 1)\\) in \\(f=-1\\), pri \\(225^\\circ\\) \\((-1;\\ -1)\\) in \\(f=1\\), pri \\(315^\\circ\\) \\((1;\\ -1)\\) in \\(f=-1\\); povsod graf pravi, da sta gradienta približno vzporedna, \\(\\lvert\\sin\\rvert=0\\) (izračunano, toleranca \\(\\lvert\\sin\\rvert<0{,}01\\)), in ' + LAB.angles.sl + ' je \\(4\\) od \\(48\\) kotov. Največja vrednost \\(1\\) je torej v \\((1;\\ 1)\\) in \\((-1;\\ -1)\\), najmanjša \\(-1\\) pa v \\((1;\\ -1)\\) in \\((-1;\\ 1)\\). Pri \\(0^\\circ\\), \\(90^\\circ\\), \\(180^\\circ\\) in \\(270^\\circ\\) je \\(f=0\\) in gradienta nista vzporedna (\\(\\lvert\\sin\\rvert=1\\)). Dotik je na vseh štirih točkah enak pogoj, zato po njem ne ločimo največjega od najmanjšega; dotik, ki ni ne eno ne drugo, imenujemo le: \\(f=x^3\\) na premici \\(y=0\\) ima v \\((0;\\ 0)\\) enačbo \\(\\nabla f=\\lambda\\nabla g\\) z \\(\\lambda=0\\), a tam ni ekstrema (graf tega ne nariše).',
            'At \\(45^\\circ\\) the point is \\((1,\\ 1)\\) and \\(f=1\\), at \\(135^\\circ\\) \\((-1,\\ 1)\\) and \\(f=-1\\), at \\(225^\\circ\\) \\((-1,\\ -1)\\) and \\(f=1\\), at \\(315^\\circ\\) \\((1,\\ -1)\\) and \\(f=-1\\); everywhere the graph says that the gradients are nearly parallel, \\(\\lvert\\sin\\rvert=0\\) (computed, tolerance \\(\\lvert\\sin\\rvert<0.01\\)), and ' + LAB.angles.en + ' is \\(4\\) of \\(48\\) angles. So the largest value \\(1\\) is at \\((1,\\ 1)\\) and \\((-1,\\ -1)\\), and the smallest \\(-1\\) at \\((1,\\ -1)\\) and \\((-1,\\ 1)\\). At \\(0^\\circ\\), \\(90^\\circ\\), \\(180^\\circ\\) and \\(270^\\circ\\) we have \\(f=0\\) and the gradients are not parallel (\\(\\lvert\\sin\\rvert=1\\)). The tangency is the same condition at all four points, so it does not tell the largest from the smallest; a tangency that is neither one is only named: \\(f=x^3\\) on the line \\(y=0\\) satisfies \\(\\nabla f=\\lambda\\nabla g\\) with \\(\\lambda=0\\) at \\((0,\\ 0)\\), yet there is no extremum (the graph does not draw this).',
        )],
        scene: optimizationScene('ls4-circle-scene', LS4_PRODUCT_CIRCLE,
            'Produkt \\(xy\\), način Nivojnice, nivojnice pri \\(c=0,\\ 1,\\ 2\\), okno od \\(-2\\) do \\(2\\); krožnica \\(x^2+y^2=2\\) je shranjena s točko pri kotu \\(0^\\circ\\), a ni narisana; učenec preklopi v Vezani ekstrem in nastavlja kot.',
            'The product \\(xy\\), the mode Level sets, the level sets at \\(c=0,\\ 1,\\ 2\\), the window from \\(-2\\) to \\(2\\); the circle \\(x^2+y^2=2\\) is stored with the point at the angle \\(0^\\circ\\) but not drawn; the learner switches to Constrained extremum and sets the angle.'),
    }),
    step({
        id: 'ls4-explore', order: 5,
        title: text('Raziskovanje', 'Exploration'),
        purpose: text('Samostojno preizkusiti, kje sta gradienta vzporedna, in videti, kaj dotik pove in česa ne.', 'Testing on your own where the gradients are parallel and seeing what the tangency tells and what it does not.'),
        explanation: text(
            `Graf je spet v začetnem stanju (Skleda, način ${LAB.levelSets.sl}). Izberi način ${LAB.lagrange.sl}, nato izbiraj funkcijo (${LAB.fn.sl}) in vezni pogoj (${LAB.constraint.sl}) ter premikaj točko po veznem pogoju. Pri vsaki izbiri poišči dotikališča in preveri, da sta tam gradienta vzporedna, in primerjaj vrednosti \\(f\\) v njih: dotik je potreben pogoj za ekstrem, ne zadosten, in iz njega ne vidiš, ali je vrednost največja, najmanjša ali nobena.`,
            `The graph is back in its starting state (Bowl, the mode ${LAB.levelSets.en}). Choose the mode ${LAB.lagrange.en}, then choose the function (${LAB.fn.en}) and the constraint (${LAB.constraint.en}) and move the point along the constraint. For each choice find the points of tangency and check that the gradients are parallel there, and compare the values of \\(f\\) at them: tangency is a necessary condition for an extremum, not a sufficient one, and from it alone you cannot see whether the value is a maximum, a minimum or neither.`,
        ),
        formulaIds: [],
        observationPrompt: text(
            'Raziskuj samostojno; nič ni treba vpisati.',
            'Explore on your own; nothing has to be entered.',
        ),
        expectedObservations: [text(
            'V vsaki izbiri je točka na veznem pogoju in vrstica ' + LAB.touch.sl + ' pove, ali sta gradienta vzporedna; pri krožnici graf dotik oceni (približno), pri premici je točen.',
            'In every choice the point is on the constraint and the row ' + LAB.touch.en + ' says whether the gradients are parallel; on the circle the graph estimates the tangency (approximately), on the line it is exact.',
        )],
        scene: optimizationScene('ls4-explore-scene', LS4_EXPLORE,
            'Začetno stanje: skleda, \\(c=1\\), sonda v \\((0{,}6;\\ 0{,}8)\\), način Nivojnice; vse nastavitve so proste.',
            'The starting state: the bowl, \\(c=1\\), the probe at \\((0.6,\\ 0.8)\\), the mode Level sets; every setting is free.'),
    }),
];

// ---- the lessons -------------------------------------------------------------------------------------------------------------------

const sources: GuidedLesson['sources'] = [
    {
        id: 'bezeg-levelsets-optimization-implementation',
        citation: 'Bezeg source: src/levelsets/ (descent iterates, descent classification, constrained point and tangency test) and src/graphs/levelsets/ContourMapGraph.tsx.',
        implementationCorrespondence: 'A scene sets the function, the levels, the descent start and step, the constraint with its parameter and the mode of the contour graph. The descent iterates are computed by the formula and shown to six decimals (at most 200 steps); that the descent on the quadratic valley converges exactly below a step threshold is a theorem proved by the per-coordinate factors, and the path in the graph is an illustration. The tangency on the line is an exact test; on the circle it is an approximation with a stated tolerance on the sine of the angle between the gradients. That the gradients are parallel at a constrained extremum is the Lagrange necessary condition, not a sufficient one; the contour and the arrows are an illustration.',
    },
];

const ls3: GuidedLesson = {
    demonstrationId: 'contour-map',
    title: text('Gradientni spust', 'Gradient descent'),
    summary: text(
        'Gradientni spust se iz začetne točke v vsakem koraku pomakne proti najhitrejšemu padanju funkcije. Napovemo pot na skledi, pogledamo, kako dolina z različnima strminama spremeni pot, in korak povečujemo, dokler pot ne preneha konvergirati.',
        'Gradient descent moves from a start point in every step in the direction of the fastest decrease of the function. We predict the path on the bowl, see how a valley with two different steepnesses changes the path, and increase the step until the path stops converging.',
    ),
    prerequisites: [
        text('Gradient funkcije dveh spremenljivk (lekcija Gradient in nivojnica).', 'The gradient of a function of two variables (the lesson The gradient and the level set).'),
        text('Geometrijsko zaporedje in njegov kvocient.', 'A geometric sequence and its ratio.'),
    ],
    learningGoals: [
        text('Znaš iz formule napovedati prvi korak in obliko poti gradientnega spusta ter jo primerjati z narisano.', 'Can predict the first step and the shape of the path of gradient descent from the formula and compare it with the drawn one.'),
        text('Znaš za kvadratno dolino iz faktorjev \\(1-2h\\) in \\(1-20h\\) izračunati, kdaj pot konvergira, niha ali divergira, in veš, da o koraku odloča izrek, cik-cak v grafu pa je le ponazoritev.', 'Can compute from the factors \\(1-2h\\) and \\(1-20h\\) for the quadratic valley when the path converges, oscillates or diverges, and know that a theorem decides about the step and the zig-zag in the graph is only an illustration.'),
        text('Veš, da izrek velja za kvadratne funkcije in da za druge funkcije graf ne trdi ničesar o konvergenci.', 'Know that the theorem holds for quadratic functions and that for other functions the graph claims nothing about convergence.'),
    ],
    formulaBlocks: ls3Formulas,
    workedExamples: [],
    steps: ls3Steps,
    sources,
    edgeCases: [
        text('Če je začetek na osi \\(x\\) doline (\\(y_0=0\\)), se \\(y\\) ne spremeni in pot konvergira tudi pri velikih korakih; prag, nad katerim pot divergira, velja za začetke z \\(y_0\\ne0\\).', 'If the start is on the \\(x\\) axis of the valley (\\(y_0=0\\)), \\(y\\) does not change and the path converges also for large steps; the threshold beyond which the path diverges holds for starts with \\(y_0\\ne0\\).'),
        text('Pri gričih in skledi graf nariše le pot in ne trdi, ali konvergira; odčitek Prvi korak z \\(f<0{,}000001\\) ni merilo konvergence, ker lahko \\(f\\) pade tudi pod \\(0\\).', 'For the hills and the bowl the graph draws only the path and makes no claim about convergence; the readout First step with \\(f<0.000001\\) is not a measure of convergence, because \\(f\\) can also fall below \\(0\\).'),
        text('Izračun se konča po \\(200\\) korakih ali prej, ko pot uide predaleč; pot je izračunana, ne dokazana.', 'The computation ends after \\(200\\) steps or earlier when the path goes too far; the path is computed, not proved.'),
    ],
    unresolvedQuestions: [],
};

const ls4: GuidedLesson = {
    demonstrationId: 'contour-map',
    title: text('Lagrangeevi multiplikatorji', 'Lagrange multipliers'),
    summary: text(
        'Iščemo ekstrem funkcije na veznem pogoju. Na premici in na krožnici poiščemo točke, v katerih se nivojnica funkcije dotika veznega pogoja, in pogledamo, da sta tam gradienta funkcije in veznega pogoja vzporedna.',
        'We look for an extremum of a function on a constraint. On a line and on a circle we find the points where a level set of the function touches the constraint, and see that the gradients of the function and of the constraint are parallel there.',
    ),
    prerequisites: [
        text('Gradient in nivojnica (lekciji Gradient in nivojnica ter Gradientni spust); premica in krožnica v ravnini.', 'The gradient and the level set (the lessons The gradient and the level set, and Gradient descent); a line and a circle in the plane.'),
    ],
    learningGoals: [
        text('Znaš napovedati, v kateri točki veznega pogoja je funkcija najmanjša ali največja, in napoved primerjati z odčitki grafa.', 'Can predict at which point of a constraint a function is smallest or largest and compare the prediction with the readouts of the graph.'),
        text('Veš, da je vzporednost gradientov, \\(\\nabla f=\\lambda\\nabla g\\), potreben pogoj za ekstrem na veznem pogoju (izrek), ne pa zadosten, in da ne loči največjega od najmanjšega; slika je ponazoritev.', 'Know that parallel gradients, \\(\\nabla f=\\lambda\\nabla g\\), are a necessary condition for an extremum on a constraint (a theorem) but not a sufficient one and that they do not tell the largest from the smallest; the picture is an illustration.'),
    ],
    formulaBlocks: ls4Formulas,
    workedExamples: [],
    steps: ls4Steps,
    sources,
    edgeCases: [
        text('Na krožnici graf dotik oceni na mreži \\(48\\) kotov s toleranco \\(\\lvert\\sin\\rvert<0{,}01\\), zato izpiše "približno vzporedna"; na premici je dotik točen.', 'On the circle the graph estimates the tangency on a grid of \\(48\\) angles with the tolerance \\(\\lvert\\sin\\rvert<0.01\\), so it says "nearly parallel"; on the line the tangency is exact.'),
        text('Če je \\(\\nabla g=0\\), izrek ne velja; takšnih veznih pogojev graf ne ponuja.', 'If \\(\\nabla g=0\\) the theorem does not apply; the graph does not offer such constraints.'),
    ],
    unresolvedQuestions: [],
};

export const levelSetsDescentLesson: GuidedLesson = ls3;
export const levelSetsLagrangeLesson: GuidedLesson = ls4;
