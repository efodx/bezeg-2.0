/**
 * Guided lessons of the level-sets family, batch B (docs/specs/level-sets-optimization-lessons.md): LS1, surface and level sets, and LS2, the gradient is perpendicular to the level
 * set, both on `contour-map` (ContourMapGraph). Each is the lesson of one section of the level-sets chapter (the chapter registry adapts them on request). Scenes use only the
 * `levelsets` actions the contour graph registers (`set-function`, `set-level`, `set-probe`, `set-mode`, `set-numeric`) and every scene starts from the Demonstration default (bowl,
 * level-sets mode, c = 1, one level set, probe (0,6; 0,8)) and names what it sets. The graph shows the gradient, its length, the tangent and the dot product at once in gradient mode and
 * none of them in level-sets mode, so a predicting step opens in level-sets mode (or on the previous function or value), asks for a prediction and then names the control that makes
 * the change. Every number the text quotes is a readout of the graph for that scene, a value the learner reads after an action the text asks for, or stated arithmetic; the numbers are
 * listed per step in docs/reviews/feature-streams/families-prep/notes/f3-ls-b.md. That the gradient is perpendicular to the level set is a theorem (the chain rule); the arrow and the
 * tangent in the picture are an illustration.
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
 * What a contour scene sets on top of the Demonstration default (bowl, level-sets, level 8 = c 1, one level set, probe 12, 16 = (0,6; 0,8)): the function, the level L (c = L/8),
 * the count of level sets (1..9, spread upward from c), the probe (X, Y) (1/20) , the mode and the numeric estimate.
 */
export interface ContourSceneSpec {
    readonly fn?: 'bowl' | 'saddle' | 'valley' | 'hills' | 'product';
    readonly level?: number;
    readonly levelCount?: number;
    readonly probe?: readonly [number, number];
    readonly mode?: 'level-sets' | 'gradient';
    readonly numeric?: boolean;
}

/** The actions of a contour scene: the Demonstration default, then the function (the probe falls back as the chooser does), the level, the probe, the mode and the numeric estimate. */
export const contourSceneActions = (id: string, spec: ContourSceneSpec): LessonAction[] => [
    {kind: 'prepared-scene', sceneId: id, source: 'demonstration-default'},
    ...(spec.fn !== undefined ? [{kind: 'levelsets', operation: 'set-function', fn: spec.fn} as const] : []),
    ...(spec.level !== undefined || spec.levelCount !== undefined
        ? [{kind: 'levelsets', operation: 'set-level', ...(spec.level !== undefined ? {level: spec.level} : {}), ...(spec.levelCount !== undefined ? {levelCount: spec.levelCount} : {})} as const]
        : []),
    ...(spec.probe !== undefined ? [{kind: 'levelsets', operation: 'set-probe', X: spec.probe[0], Y: spec.probe[1]} as const] : []),
    ...(spec.mode !== undefined ? [{kind: 'levelsets', operation: 'set-mode', mode: spec.mode} as const] : []),
    ...(spec.numeric !== undefined ? [{kind: 'levelsets', operation: 'set-numeric', numeric: spec.numeric} as const] : []),
];

const contourScene = (id: string, spec: ContourSceneSpec, sl: string, en: string): LessonScene =>
    ({id, basedOn: 'demonstration-default', actions: contourSceneActions(id, spec), expectedState: text(sl, en)});

/**
 * LS1, all in level-sets mode. The bowl at c = 1 (LS1_BOWL) opens step 1; the learner sets three level sets (LS1_BOWL_THREE, the opening of step 2), types the probe (1; 0,5)
 * (LS1_BOWL_PROBE, the opening of step 3), chooses the valley (LS1_VALLEY, the opening of step 4), chooses the saddle and c = 0 (LS1_SADDLE, the opening of step 5), chooses the hills
 * (LS1_HILLS_ZERO) and types c = 0,625 (LS1_HILLS), then c = -0,875 (LS1_HILLS_MIN) and c = 1 (LS1_HILLS_ONE). Step 6 opens on the Demonstration default.
 */
export const LS1_BOWL = {} as const;
export const LS1_BOWL_THREE = {levelCount: 3} as const;
export const LS1_BOWL_PROBE = {levelCount: 3, probe: [20, 10]} as const;
export const LS1_VALLEY = {fn: 'valley', levelCount: 3, probe: [20, 10]} as const;
export const LS1_SADDLE = {fn: 'saddle', level: 0, levelCount: 3, probe: [20, 10]} as const;
export const LS1_HILLS_ZERO = {fn: 'hills', level: 0, levelCount: 3, probe: [20, 10]} as const;
export const LS1_HILLS = {fn: 'hills', level: 5, levelCount: 3, probe: [20, 10]} as const;
export const LS1_HILLS_MIN = {fn: 'hills', level: -7, levelCount: 3, probe: [20, 10]} as const;
export const LS1_HILLS_ONE = {fn: 'hills', level: 8, levelCount: 3, probe: [20, 10]} as const;
export const LS1_EXPLORE = {} as const;

/**
 * LS2. Steps 1 to 4 open in level-sets mode, so that the gradient, the tangent and the dot product are hidden until the learner switches the mode. LS2_BOWL (the default) opens step 1
 * and LS2_BOWL_GRADIENT is the state after the switch; LS2_SADDLE opens step 2 and LS2_SADDLE_GRADIENT follows; LS2_VALLEY opens step 3, LS2_VALLEY_ALONG is the switch to gradient
 * at (1; 0) and LS2_VALLEY_ACROSS the probe typed to (0; 1); LS2_HILLS opens step 4 (the probe next to the maximum), LS2_HILLS_NEAR the switch, LS2_HILLS_ORIGIN the probe typed to
 * (0; 0); LS2_NUMERIC_OPEN opens step 5 (gradient mode, probe (1; 1)) and LS2_NUMERIC ticks the estimate. Step 6 opens on the Demonstration default.
 */
export const LS2_BOWL = {} as const;
export const LS2_BOWL_GRADIENT = {mode: 'gradient'} as const;
export const LS2_SADDLE = {fn: 'saddle', level: 0, probe: [20, 20]} as const;
export const LS2_SADDLE_GRADIENT = {fn: 'saddle', level: 0, probe: [20, 20], mode: 'gradient'} as const;
export const LS2_VALLEY = {fn: 'valley', probe: [20, 0]} as const;
export const LS2_VALLEY_ALONG = {fn: 'valley', probe: [20, 0], mode: 'gradient'} as const;
export const LS2_VALLEY_ACROSS = {fn: 'valley', probe: [0, 20], mode: 'gradient'} as const;
export const LS2_HILLS = {fn: 'hills', level: 5, probe: [31, 31]} as const;
export const LS2_HILLS_NEAR = {fn: 'hills', level: 5, probe: [31, 31], mode: 'gradient'} as const;
export const LS2_HILLS_ORIGIN = {fn: 'hills', level: 5, probe: [0, 0], mode: 'gradient'} as const;
export const LS2_NUMERIC_OPEN = {fn: 'hills', level: 5, probe: [20, 20], mode: 'gradient'} as const;
export const LS2_NUMERIC = {fn: 'hills', level: 5, probe: [20, 20], mode: 'gradient', numeric: true} as const;
export const LS2_EXPLORE = {} as const;

// ---- LS1 -------------------------------------------------------------------------------------------------------------------------

const ls1Formulas: readonly FormulaBlock[] = [
    {
        id: 'level-set',
        latex: '\\{(x,y):\\ f(x,y)=c\\}',
        notation: text(
            '\\(f(x,y)\\) je funkcija dveh spremenljivk, \\(c\\) je izbrana vrednost (višina ploskve \\(z=f(x,y)\\)), množica pa je nivojnica pri \\(c\\).',
            '\\(f(x,y)\\) is a function of two variables, \\(c\\) is a chosen value (a height of the surface \\(z=f(x,y)\\)) and the set is the level set at \\(c\\).',
        ),
        explanation: text(
            'Nivojnica pri \\(c\\) je po definiciji množica točk ravnine, v katerih ima \\(f\\) vrednost \\(c\\); nad njimi ima ploskev višino \\(c\\). Graf nivojnico izračuna na mreži in jo nariše z daljicami, zato je narisana krivulja približek (ponazoritev), enačba \\(f=c\\) pa velja po definiciji.',
            'The level set at \\(c\\) is by definition the set of points of the plane where \\(f\\) has the value \\(c\\); above them the surface has the height \\(c\\). The graph computes the level set on a grid and draws it with segments, so the drawn curve is an approximation (an illustration), while the equation \\(f=c\\) holds by definition.',
        ),
    },
];

const ls1Steps: readonly GuidedLessonStep[] = [
    step({
        id: 'ls1-bowl', order: 1,
        title: text('Skleda in nivojnica', 'The bowl and a level set'),
        purpose: text('Napovedati nivojnice za več vrednosti \\(c\\), preden jih graf nariše.', 'Predicting the level sets for several values of \\(c\\) before the graph draws them.'),
        explanation: text(
            'Funkcija dveh spremenljivk \\(f(x,y)\\) določa ploskev \\(z=f(x,y)\\). Nivojnica pri vrednosti \\(c\\) je množica točk ravnine, v katerih ima \\(f\\) vrednost \\(c\\). Graf kaže skledo \\(f(x,y)=x^2+y^2\\) in eno nivojnico pri \\(c=1\\). Preden dodaš nivojnice, zapiši napoved: kakšna krivulja je nivojnica pri \\(c=2\\) in kakšna pri \\(c=3\\), kje leži glede na nivojnico pri \\(c=1\\) in ali so razmiki med njimi enaki?',
            'A function of two variables \\(f(x,y)\\) defines a surface \\(z=f(x,y)\\). The level set at the value \\(c\\) is the set of points of the plane where \\(f\\) has the value \\(c\\). The graph shows the bowl \\(f(x,y)=x^2+y^2\\) and one level set at \\(c=1\\). Before you add level sets, write down a prediction: what curve is the level set at \\(c=2\\) and what curve at \\(c=3\\), where does it lie relative to the level set at \\(c=1\\), and are the gaps between them equal?',
        ),
        formulaIds: ['level-set'],
        observationPrompt: text(
            'Zapiši napoved. Nato z gumbom Več nivojnic nastavi Število nivojnic na \\(3\\) (dvakrat pritisni), v odčitku preberi Vrednost c in primerjaj narisane nivojnice z napovedjo.',
            'Write down your prediction. Then with the button More level sets set Number of level sets to \\(3\\) (press it twice), read Value c in the readout and compare the drawn level sets with your prediction.',
        ),
        expectedObservations: [text(
            'Odčitek Vrednost c kaže od 1 do 3 v korakih po 1. Nivojnice so krožnice \\(x^2+y^2=c\\) s polmeri \\(1\\), \\(\\sqrt2\\approx1{,}414\\) in \\(\\sqrt3\\approx1{,}732\\), vse s središčem v \\((0;\\ 0)\\). Razmika med njimi sta \\(\\approx0{,}414\\) in \\(\\approx0{,}318\\), torej se manjšata: vrednost se med sosednjima nivojnicama poveča za isto število \\(1\\), zato bližje nivojnice pomenijo hitrejše naraščanje ploskve.',
            'The readout Value c shows from 1 to 3 in steps of 1. The level sets are the circles \\(x^2+y^2=c\\) with radii \\(1\\), \\(\\sqrt2\\approx1.414\\) and \\(\\sqrt3\\approx1.732\\), all centred at \\((0,\\ 0)\\). The gaps between them are \\(\\approx0.414\\) and \\(\\approx0.318\\), so they shrink: the value rises by the same \\(1\\) between neighbouring level sets, so closer level sets mean that the surface rises faster.',
        )],
        scene: contourScene('ls1-bowl-scene', LS1_BOWL,
            'Skleda \\(x^2+y^2\\), ena nivojnica pri \\(c=1\\), sonda v \\((0{,}6;\\ 0{,}8)\\), način Nivojnice.',
            'The bowl \\(x^2+y^2\\), one level set at \\(c=1\\), the probe at \\((0.6,\\ 0.8)\\), the mode Level sets.'),
    }),
    step({
        id: 'ls1-probe', order: 2,
        title: text('Sonda', 'The probe'),
        purpose: text('Napovedati vrednost \\(f\\) v sondi in nivojnico skozi sondo.', 'Predicting the value of \\(f\\) at the probe and the level set through the probe.'),
        explanation: text(
            'Sonda je točka, ki jo premikaš; graf kaže vrednost \\(f\\) v njej in črtkano nivojnico skozi njo. Zdaj stoji v \\((0{,}6;\\ 0{,}8)\\), kjer je odčitek Vrednost f v sondi enak \\(1\\), narisane pa so nivojnice pri \\(c=1\\), \\(2\\) in \\(3\\). Preden sondo premakneš v \\((1;\\ 0{,}5)\\), izračunaj \\(f(1,\\ 0{,}5)\\) po formuli in napovej, kje bo črtkana nivojnica glede na polne.',
            'The probe is a point that you move; the graph shows the value of \\(f\\) there and the dashed level set through it. Now it stands at \\((0.6,\\ 0.8)\\), where the readout Value of f at the probe is \\(1\\), and the level sets at \\(c=1\\), \\(2\\) and \\(3\\) are drawn. Before you move the probe to \\((1,\\ 0.5)\\), compute \\(f(1,\\ 0.5)\\) from the formula and predict where the dashed level set will lie relative to the solid ones.',
        ),
        formulaIds: [],
        observationPrompt: text(
            'V polji Sonda vpiši \\(x=1\\) in \\(y=0{,}5\\) (ali povleci sondo na ta položaj), preberi Vrednost f v sondi in primerjaj črtkano nivojnico z napovedjo.',
            'In the box Probe enter \\(x=1\\) and \\(y=0.5\\) (or drag the probe there), read Value of f at the probe and compare the dashed level set with your prediction.',
        ),
        expectedObservations: [text(
            'Vrednost f v sondi je \\(1{,}25\\), ker je \\(1^2+0{,}5^2=1{,}25\\). Črtkana nivojnica je krožnica s polmerom \\(\\sqrt{1{,}25}\\approx1{,}118\\), med polnima nivojnicama pri \\(c=1\\) in \\(c=2\\). Skozi vsako točko ravnine poteka nivojnica pri \\(c=f(P)\\), zato črtkana črta sledi sondi.',
            'The value of f at the probe is \\(1.25\\), because \\(1^2+0.5^2=1.25\\). The dashed level set is a circle with radius \\(\\sqrt{1.25}\\approx1.118\\), between the solid level sets at \\(c=1\\) and \\(c=2\\). A level set at \\(c=f(P)\\) passes through every point \\(P\\) of the plane, so the dashed line follows the probe.',
        )],
        scene: contourScene('ls1-probe-scene', LS1_BOWL_THREE,
            'Skleda, nivojnice pri \\(c=1\\), \\(2\\), \\(3\\), sonda v \\((0{,}6;\\ 0{,}8)\\), kjer je \\(f=1\\).',
            'The bowl, level sets at \\(c=1\\), \\(2\\), \\(3\\), the probe at \\((0.6,\\ 0.8)\\), where \\(f=1\\).'),
    }),
    step({
        id: 'ls1-valley', order: 3,
        title: text('Dolina', 'The valley'),
        purpose: text('Napovedati, kje nivojnica seka osi, preden izbereš drugo funkcijo.', 'Predicting where a level set meets the axes before you choose another function.'),
        explanation: text(
            'Graf kaže skledo, nivojnice pri \\(c=1\\), \\(2\\), \\(3\\) in sondo v \\((1;\\ 0{,}5)\\). Funkcija Dolina je \\(f(x,y)=x^2+10y^2\\). Preden jo izbereš, izračunaj, kje nivojnica \\(f=1\\) seka os \\(x\\) (to je \\(y=0\\)) in kje os \\(y\\) (to je \\(x=0\\)), in napovej, kakšno krivuljo dobiš v primerjavi s krožnico.',
            'The graph shows the bowl, the level sets at \\(c=1\\), \\(2\\), \\(3\\) and the probe at \\((1,\\ 0.5)\\). The function Valley is \\(f(x,y)=x^2+10y^2\\). Before you choose it, compute where the level set \\(f=1\\) meets the \\(x\\)-axis (that is \\(y=0\\)) and the \\(y\\)-axis (that is \\(x=0\\)), and predict what curve you get compared with a circle.',
        ),
        formulaIds: [],
        observationPrompt: text(
            'V polju Funkcija izberi Dolina: x² + 10y² in primerjaj narisane nivojnice z napovedjo.',
            'In the box Function choose Valley: x² + 10y² and compare the drawn level sets with your prediction.',
        ),
        expectedObservations: [text(
            'Na osi \\(x\\) je \\(x^2=1\\), torej \\(x=\\pm1\\); na osi \\(y\\) je \\(10y^2=1\\), torej \\(y=\\pm1/\\sqrt{10}\\approx\\pm0{,}316\\). Nivojnice so gnezdene elipse s polosema \\(\\sqrt c\\) in \\(\\sqrt{c/10}\\) (za vsak \\(c>0\\)), razmerje polosi je \\(\\sqrt{10}\\approx3{,}162\\): v smeri \\(y\\) so elipse ožje.',
            'On the \\(x\\)-axis \\(x^2=1\\), so \\(x=\\pm1\\); on the \\(y\\)-axis \\(10y^2=1\\), so \\(y=\\pm1/\\sqrt{10}\\approx\\pm0.316\\). The level sets are nested ellipses with semi-axes \\(\\sqrt c\\) and \\(\\sqrt{c/10}\\) (for every \\(c>0\\)), the ratio of the semi-axes is \\(\\sqrt{10}\\approx3.162\\): the ellipses are narrower in the \\(y\\) direction.',
        )],
        scene: contourScene('ls1-valley-scene', LS1_BOWL_PROBE,
            'Skleda, nivojnice pri \\(c=1\\), \\(2\\), \\(3\\), sonda v \\((1;\\ 0{,}5)\\), kjer je \\(f=1{,}25\\).',
            'The bowl, level sets at \\(c=1\\), \\(2\\), \\(3\\), the probe at \\((1,\\ 0.5)\\), where \\(f=1.25\\).'),
    }),
    step({
        id: 'ls1-saddle', order: 4,
        title: text('Sedlo', 'The saddle'),
        purpose: text('Napovedati nivojnico sedla pri \\(c=0\\), preden jo graf nariše.', 'Predicting the level set of the saddle at \\(c=0\\) before the graph draws it.'),
        explanation: text(
            'Graf kaže dolino z nivojnicami pri \\(c=1\\), \\(2\\), \\(3\\). Funkcija Sedlo je \\(f(x,y)=x^2-y^2\\). Preden jo izbereš in nastaviš \\(c=0\\), reši enačbo \\(x^2-y^2=0\\) in napovej, kakšna množica to je in kaj se zgodi v točki \\((0;\\ 0)\\). Status nivojnice ne poimenuje: povej, kaj pokaže slika.',
            'The graph shows the valley with level sets at \\(c=1\\), \\(2\\), \\(3\\). The function Saddle is \\(f(x,y)=x^2-y^2\\). Before you choose it and set \\(c=0\\), solve the equation \\(x^2-y^2=0\\) and predict what set it is and what happens at the point \\((0,\\ 0)\\). The status does not name the level set: say what the picture shows.',
        ),
        formulaIds: [],
        observationPrompt: text(
            'Izberi Funkcija Sedlo: x² − y², nato v polju Vrednost nivojnice c vpiši \\(0\\) in primerjaj narisane nivojnice z napovedjo.',
            'Choose Function Saddle: x² − y², then in the box Level value c enter \\(0\\) and compare the drawn level sets with your prediction.',
        ),
        expectedObservations: [text(
            'Odčitek Vrednost c kaže od 0 do 2 v korakih po 1. Pri \\(c=0\\) je \\(x^2-y^2=(x-y)(x+y)=0\\), torej \\(y=x\\) ali \\(y=-x\\): slika kaže dve črti, ki se križata v \\((0;\\ 0)\\). Pri \\(c=1\\) in \\(c=2\\) je \\(x^2=y^2+c\\), torej \\(|x|\\ge\\sqrt c\\): vsaka nivojnica ima dve veji, levo in desno. V \\((0;\\ 0)\\) je \\(f(x,0)=x^2\\ge0\\) in \\(f(0,y)=-y^2\\le0\\): ploskev tam narašča v smeri \\(x\\) in pada v smeri \\(y\\), kar je sedlo; nivojnica se v njem križa.',
            'The readout Value c shows from 0 to 2 in steps of 1. At \\(c=0\\), \\(x^2-y^2=(x-y)(x+y)=0\\), so \\(y=x\\) or \\(y=-x\\): the picture shows two lines that cross at \\((0,\\ 0)\\). At \\(c=1\\) and \\(c=2\\), \\(x^2=y^2+c\\), so \\(|x|\\ge\\sqrt c\\): each level set has two branches, left and right. At \\((0,\\ 0)\\), \\(f(x,0)=x^2\\ge0\\) and \\(f(0,y)=-y^2\\le0\\): the surface rises along \\(x\\) and falls along \\(y\\), which is a saddle; the level set crosses itself there.',
        )],
        scene: contourScene('ls1-saddle-scene', LS1_VALLEY,
            'Dolina \\(x^2+10y^2\\), nivojnice pri \\(c=1\\), \\(2\\), \\(3\\), sonda v \\((1;\\ 0{,}5)\\), kjer je \\(f=3{,}5\\).',
            'The valley \\(x^2+10y^2\\), level sets at \\(c=1\\), \\(2\\), \\(3\\), the probe at \\((1,\\ 0.5)\\), where \\(f=3.5\\).'),
    }),
    step({
        id: 'ls1-hills', order: 5,
        title: text('Griči', 'The hills'),
        purpose: text('Napovedati, pri katerih vrednostih \\(c\\) funkcija \\(\\sin x\\sin y\\) sploh ima nivojnico, in najti maksimume, minimume in sedla.', 'Predicting for which values \\(c\\) the function \\(\\sin x\\sin y\\) has a level set at all, and finding maxima, minima and saddles.'),
        explanation: text(
            'Funkcija Griči je \\(f(x,y)=\\sin x\\sin y\\) na kvadratu od \\(-4\\) do \\(4\\). Graf kaže sedlo z nivojnicami pri \\(c=0\\), \\(1\\), \\(2\\). Preden izbereš Griče, napovej: ali ima \\(f\\) nivojnico pri \\(c=0\\) in kakšno (išči točke, kjer je \\(\\sin x=0\\) ali \\(\\sin y=0\\)), ali jo ima pri \\(c=1\\) in ali jo ima pri \\(c=2\\)?',
            'The function Hills is \\(f(x,y)=\\sin x\\sin y\\) on the square from \\(-4\\) to \\(4\\). The graph shows the saddle with level sets at \\(c=0\\), \\(1\\), \\(2\\). Before you choose Hills, predict: does \\(f\\) have a level set at \\(c=0\\) and what does it look like (look for the points where \\(\\sin x=0\\) or \\(\\sin y=0\\)), does it have one at \\(c=1\\), and does it have one at \\(c=2\\)?',
        ),
        formulaIds: [],
        observationPrompt: text(
            'Izberi Funkcija Griči: sin x · sin y in preglej nivojnice pri \\(c=0\\). Nato v polju Vrednost nivojnice c vpiši \\(0{,}625\\), nato \\(-0{,}875\\), nato \\(1\\) in na koncu še \\(2\\); pri vsakem preberi odčitek Vrednost c in poglej narisano.',
            'Choose Function Hills: sin x · sin y and look at the level sets at \\(c=0\\). Then in the box Level value c enter \\(0.625\\), then \\(-0.875\\), then \\(1\\) and finally \\(2\\) too; at each read the readout Value c and look at the drawing.',
        ),
        expectedObservations: [text(
            'Pri \\(c=0\\) je \\(\\sin x\\sin y=0\\), ko je \\(x=k\\pi\\) ali \\(y=m\\pi\\): slika kaže mrežo črt, ki se križajo; križišča, na primer \\((0;\\ 0)\\), so sedla. Pri \\(c=0{,}625\\) (odčitek od 0,625 do 0,875 v korakih po 0,125) so zaprte krivulje okrog maksimumov \\((\\pi/2,\\ \\pi/2)\\) in \\((-\\pi/2,\\ -\\pi/2)\\), kjer je \\(f=1\\); pri \\(c=-0{,}875\\) (od −0,875 do −0,625) okrog minimumov \\((\\pi/2,\\ -\\pi/2)\\) in \\((-\\pi/2,\\ \\pi/2)\\), kjer je \\(f=-1\\). Pri \\(c=1\\) je Dolžina nivojnice \\(0\\): množica \\(f=1\\) so le izolirane točke (maksimumi), ki jih vzorčena slika ne nariše; pri \\(c=2\\) odčitek Vrednost c kaže od 2 do 2,25 v korakih po 0,125, Dolžina nivojnice je \\(0\\) in polne nivojnice ni nobene, ostane le črtkana nivojnica skozi sondo: množica \\(f=2\\) je prazna, ker \\(\\sin x\\sin y\\) ne preseže \\(1\\). Slika je ponazoritev; majhna nivojnica znotraj ene celice mreže bi se lahko izgubila.',
            'At \\(c=0\\), \\(\\sin x\\sin y=0\\) when \\(x=k\\pi\\) or \\(y=m\\pi\\): the picture shows a grid of lines that cross; the crossings, for example \\((0,\\ 0)\\), are saddles. At \\(c=0.625\\) (readout from 0.625 to 0.875 in steps of 0.125) there are closed curves around the maxima \\((\\pi/2,\\ \\pi/2)\\) and \\((-\\pi/2,\\ -\\pi/2)\\), where \\(f=1\\); at \\(c=-0.875\\) (from −0.875 to −0.625) around the minima \\((\\pi/2,\\ -\\pi/2)\\) and \\((-\\pi/2,\\ \\pi/2)\\), where \\(f=-1\\). At \\(c=1\\) the Length of the level set is \\(0\\): the set \\(f=1\\) is only isolated points (the maxima), which the sampled picture does not draw; at \\(c=2\\) the readout Value c shows from 2 to 2.25 in steps of 0.125, the Length of the level set is \\(0\\) and no solid level set is drawn, only the dashed level set through the probe stays: the set \\(f=2\\) is empty, because \\(\\sin x\\sin y\\) does not exceed \\(1\\). The picture is an illustration; a small level set inside one grid cell could be lost.',
        )],
        scene: contourScene('ls1-hills-scene', LS1_SADDLE,
            'Sedlo \\(x^2-y^2\\), nivojnice pri \\(c=0\\), \\(1\\), \\(2\\), sonda v \\((1;\\ 0{,}5)\\), kjer je \\(f=0{,}75\\).',
            'The saddle \\(x^2-y^2\\), level sets at \\(c=0\\), \\(1\\), \\(2\\), the probe at \\((1,\\ 0.5)\\), where \\(f=0.75\\).'),
    }),
    step({
        id: 'ls1-explore', order: 6,
        title: text('Prosto raziskovanje', 'Free exploration'),
        purpose: text('Preizkusiti naučeno na funkciji, ki je lekcija ne obravnava.', 'Trying what you have learned on a function the lesson did not cover.'),
        explanation: text(
            'Graf je spet v začetnem stanju (Skleda, \\(c=1\\), ena nivojnica). Izberi Produkt: x · y, nastavi Število nivojnic na \\(3\\) in napovej, kakšne krivulje so nivojnice \\(xy=c\\) za \\(c>0\\) in kakšna je nivojnica pri \\(c=0\\). Nato premikaj sondo in opazuj Vrednost f v sondi ter črtkano nivojnico. Preizkusi tudi druge funkcije in vrednosti \\(c\\): kje so nivojnice goste, kje redke in kje se križajo?',
            'The graph is back in its starting state (Bowl, \\(c=1\\), one level set). Choose Product: x · y, set Number of level sets to \\(3\\) and predict what curves the level sets \\(xy=c\\) are for \\(c>0\\) and what the level set at \\(c=0\\) is. Then move the probe and watch Value of f at the probe and the dashed level set. Try other functions and values of \\(c\\) too: where are the level sets dense, where sparse, and where do they cross?',
        ),
        formulaIds: [],
        observationPrompt: text(
            'Preizkusi napoved za Produkt, nato raziskuj sam; nič ni treba vpisati.',
            'Test your prediction for Product, then explore on your own; nothing has to be entered.',
        ),
        expectedObservations: [text(
            'Pri produktu so nivojnice za \\(c>0\\) hiperbole \\(y=c/x\\) v prvem in tretjem kvadrantu (graf kaže del v oknu), pri \\(c=0\\) osi \\(x=0\\) in \\(y=0\\), ki se križata v \\((0;\\ 0)\\), sedlu. Vsaka točka ravnine leži na nivojnici pri \\(c=f(P)\\).',
            'For the product the level sets for \\(c>0\\) are hyperbolas \\(y=c/x\\) in the first and third quadrant (the graph shows the part in the window); at \\(c=0\\) they are the axes \\(x=0\\) and \\(y=0\\), which cross at \\((0,\\ 0)\\), a saddle. Every point \\(P\\) of the plane lies on the level set at \\(c=f(P)\\).',
        )],
        scene: contourScene('ls1-explore-scene', LS1_EXPLORE,
            'Začetno stanje: skleda, \\(c=1\\), ena nivojnica, sonda v \\((0{,}6;\\ 0{,}8)\\); vse nastavitve so proste.',
            'The starting state: the bowl, \\(c=1\\), one level set, the probe at \\((0.6,\\ 0.8)\\); every setting is free.'),
    }),
];

// ---- LS2 -------------------------------------------------------------------------------------------------------------------------

const ls2Formulas: readonly FormulaBlock[] = [
    {
        id: 'gradient',
        latex: '\\nabla f=\\left(\\frac{\\partial f}{\\partial x},\\ \\frac{\\partial f}{\\partial y}\\right)',
        notation: text(
            '\\(\\nabla f\\) je gradient funkcije \\(f(x,y)\\), \\(\\partial f/\\partial x\\) je odvod po \\(x\\) pri konstantnem \\(y\\), \\(\\partial f/\\partial y\\) pa odvod po \\(y\\) pri konstantnem \\(x\\).',
            '\\(\\nabla f\\) is the gradient of the function \\(f(x,y)\\), \\(\\partial f/\\partial x\\) is the derivative in \\(x\\) with \\(y\\) held constant and \\(\\partial f/\\partial y\\) is the derivative in \\(y\\) with \\(x\\) held constant.',
        ),
        explanation: text(
            'Gradient je vektor, ki ga izračunamo v vsaki točki. Kjer ni ničeln, kaže v smer najhitrejšega naraščanja \\(f\\), njegova dolžina pa pove, kako hitro \\(f\\) narašča v tej smeri.',
            'The gradient is a vector computed at every point. Where it is not zero, it points in the direction of the fastest increase of \\(f\\), and its length tells how fast \\(f\\) increases in that direction.',
        ),
    },
    {
        id: 'chain-rule',
        latex: '\\frac{d}{dt}f(\\gamma(t))=\\nabla f(\\gamma(t))\\cdot\\gamma^{\\prime}(t)',
        notation: text(
            '\\(\\gamma(t)\\) je odvedljiva krivulja v ravnini, \\(\\gamma^{\\prime}(t)\\) njen odvod (smer gibanja), pika pomeni skalarni produkt.',
            '\\(\\gamma(t)\\) is a differentiable curve in the plane, \\(\\gamma^{\\prime}(t)\\) is its derivative (the direction of motion) and the dot is the dot product.',
        ),
        explanation: text(
            'Izrek (verižno pravilo): za odvedljivo \\(f\\) velja zgornja enakost. Če \\(\\gamma\\) leži na nivojnici pri \\(c\\), je \\(f(\\gamma(t))=c\\) konstanta, njen odvod je \\(0\\), zato je \\(\\nabla f\\cdot\\gamma^{\\prime}=0\\): gradient je pravokoten na smer nivojnice, kadar je \\(\\gamma^{\\prime}\\ne0\\). To je dokaz; puščica in tangenta v grafu sta le ponazoritev.',
            'Theorem (the chain rule): for a differentiable \\(f\\) the equality above holds. If \\(\\gamma\\) lies on the level set at \\(c\\), then \\(f(\\gamma(t))=c\\) is constant, its derivative is \\(0\\), and so \\(\\nabla f\\cdot\\gamma^{\\prime}=0\\): the gradient is perpendicular to the direction of the level set, when \\(\\gamma^{\\prime}\\ne0\\). This is a proof; the arrow and the tangent in the graph are only an illustration.',
        ),
    },
    {
        id: 'central-difference',
        latex: '\\frac{\\partial f}{\\partial x}\\approx\\frac{f(x+h,y)-f(x-h,y)}{2h}',
        notation: text(
            '\\(h\\) je majhen korak (v grafu \\(h=0{,}01\\)); enako ocenimo \\(\\partial f/\\partial y\\) s točkama \\(y\\pm h\\).',
            '\\(h\\) is a small step (in the graph \\(h=0.01\\)); \\(\\partial f/\\partial y\\) is estimated the same way with the points \\(y\\pm h\\).',
        ),
        explanation: text(
            'Centralna razlika oceni odvod iz dveh vrednosti \\(f\\), ne da bi \\(f\\) odvajali. Ocena je izračunan približek, točni gradient pa graf izračuna po formuli.',
            'The central difference estimates a derivative from two values of \\(f\\) without differentiating \\(f\\). The estimate is a computed approximation, while the graph computes the exact gradient from a formula.',
        ),
    },
];

const ls2Steps: readonly GuidedLessonStep[] = [
    step({
        id: 'ls2-bowl', order: 1,
        title: text('Gradient na skledi', 'The gradient on the bowl'),
        purpose: text('Izračunati gradient v sondi na roke in napovedati njegovo lego glede na nivojnico, preden ga graf pokaže.', 'Computing the gradient at the probe by hand and predicting its position relative to the level set before the graph shows it.'),
        explanation: text(
            'Graf kaže skledo \\(f=x^2+y^2\\), sondo v \\((0{,}6;\\ 0{,}8)\\) in nivojnico skozi njo; gradient je zdaj skrit. Izračunaj \\(\\nabla f\\) v sondi na roke in napovej, v katero smer kaže glede na nivojnico in kako dolg je.',
            'The graph shows the bowl \\(f=x^2+y^2\\), the probe at \\((0.6,\\ 0.8)\\) and the level set through it; the gradient is hidden for now. Compute \\(\\nabla f\\) at the probe by hand and predict which way it points relative to the level set and how long it is.',
        ),
        formulaIds: ['gradient'],
        observationPrompt: text(
            'Zapiši napoved. Nato v polju Način izberi Gradient in primerjaj status ter odčitke Gradient (točno), Tangenta nivojnice in Skalarni produkt gradienta in tangente z napovedjo.',
            'Write down your prediction. Then in the box Mode choose Gradient and compare the status and the readouts Gradient (exact), Tangent of the level set and Dot product of the gradient and the tangent with your prediction.',
        ),
        expectedObservations: [text(
            'Status kaže, da je v točki \\((0{,}6;\\ 0{,}8)\\) gradient \\((1{,}2;\\ 1{,}6)\\), dolžina \\(2\\), in da je pravokoten na nivojnico. To ustreza \\(\\nabla f=(2x,\\ 2y)\\) in \\(\\sqrt{1{,}2^2+1{,}6^2}=\\sqrt4=2\\); gradient je dvakratnik krajevnega vektorja sonde, torej kaže stran od središča. Tangenta je \\((-0{,}8;\\ 0{,}6)\\), skalarni produkt je \\(0\\).',
            'The status says that at the point \\((0.6,\\ 0.8)\\) the gradient is \\((1.2,\\ 1.6)\\), length \\(2\\), and that it is perpendicular to the level set. This matches \\(\\nabla f=(2x,\\ 2y)\\) and \\(\\sqrt{1.2^2+1.6^2}=\\sqrt4=2\\); the gradient is twice the position vector of the probe, so it points away from the centre. The tangent is \\((-0.8,\\ 0.6)\\) and the dot product is \\(0\\).',
        )],
        scene: contourScene('ls2-bowl-scene', LS2_BOWL,
            'Skleda \\(x^2+y^2\\), \\(c=1\\), sonda v \\((0{,}6;\\ 0{,}8)\\), način Nivojnice: gradient je skrit.',
            'The bowl \\(x^2+y^2\\), \\(c=1\\), the probe at \\((0.6,\\ 0.8)\\), the mode Level sets: the gradient is hidden.'),
    }),
    step({
        id: 'ls2-tangent', order: 2,
        title: text('Gradient in tangenta', 'The gradient and the tangent'),
        purpose: text('Z izrekom določiti tangento nivojnice iz gradienta, preden jo graf pokaže.', 'Using the theorem to find the tangent of the level set from the gradient before the graph shows it.'),
        explanation: text(
            'Graf kaže sedlo \\(f=x^2-y^2\\) pri \\(c=0\\) in sondo v \\((1;\\ 1)\\), ki leži na nivojnici; gradient in tangenta sta skrita. Izrek (verižno pravilo): če \\(\\gamma\\) teče po nivojnici, je \\(\\nabla f\\cdot\\gamma^{\\prime}=0\\). Uporabi ga: izračunaj \\(\\nabla f\\) v \\((1;\\ 1)\\) in iz njega določi smer tangente nivojnice (do predznaka natančno). Napovej tudi, koliko bo skalarni produkt gradienta in tangente. Črtkana nivojnica skozi sondo je že narisana, zato korak preveri izrek na sliki.',
            'The graph shows the saddle \\(f=x^2-y^2\\) at \\(c=0\\) and the probe at \\((1,\\ 1)\\), which lies on the level set; the gradient and the tangent are hidden. Theorem (the chain rule): if \\(\\gamma\\) runs along a level set, then \\(\\nabla f\\cdot\\gamma^{\\prime}=0\\). Use it: compute \\(\\nabla f\\) at \\((1,\\ 1)\\) and from it find the direction of the tangent of the level set (up to sign). Also predict the dot product of the gradient and the tangent. The dashed level set through the probe is already drawn, so the step checks the theorem against the picture.',
        ),
        formulaIds: ['chain-rule'],
        observationPrompt: text(
            'Zapiši napoved. Nato v polju Način izberi Gradient in primerjaj Gradient (točno), Tangenta nivojnice in Skalarni produkt gradienta in tangente z napovedjo.',
            'Write down your prediction. Then in the box Mode choose Gradient and compare Gradient (exact), Tangent of the level set and Dot product of the gradient and the tangent with your prediction.',
        ),
        expectedObservations: [text(
            'Gradient je \\((2;\\ -2)\\) (po formuli \\((2x,\\ -2y)\\)), dolžina \\(2{,}8284\\approx2\\sqrt2\\). Pravokotna smer nanj je \\((1;\\ 1)\\): graf kaže tangento \\((0{,}7071068;\\ 0{,}7071068)\\) in skalarni produkt \\(0\\), kar ustreza \\(2\\cdot1+(-2)\\cdot1=0\\). Smer tangente je do predznaka natančno določena z izrekom; slika to le ponazori.',
            'The gradient is \\((2,\\ -2)\\) (from the formula \\((2x,\\ -2y)\\)), length \\(2.8284\\approx2\\sqrt2\\). The direction perpendicular to it is \\((1,\\ 1)\\): the graph shows the tangent \\((0.7071068,\\ 0.7071068)\\) and the dot product \\(0\\), which matches \\(2\\cdot1+(-2)\\cdot1=0\\). The direction of the tangent is determined up to sign by the theorem; the picture only illustrates it.',
        )],
        scene: contourScene('ls2-tangent-scene', LS2_SADDLE,
            'Sedlo \\(x^2-y^2\\), \\(c=0\\), sonda v \\((1;\\ 1)\\), kjer je \\(f=0\\), način Nivojnice: gradient in tangenta sta skrita.',
            'The saddle \\(x^2-y^2\\), \\(c=0\\), the probe at \\((1,\\ 1)\\), where \\(f=0\\), the mode Level sets: the gradient and the tangent are hidden.'),
    }),
    step({
        id: 'ls2-valley', order: 3,
        title: text('Dolina', 'The valley'),
        purpose: text('Napovedati gradient v dveh točkah, enako oddaljenih od izhodišča, in primerjati njuni dolžini.', 'Predicting the gradient at two points at the same distance from the origin and comparing their lengths.'),
        explanation: text(
            'Graf kaže dolino \\(f=x^2+10y^2\\) pri \\(c=1\\) in sondo v \\((1;\\ 0)\\) na osi \\(x\\); gradient je skrit. Dolžina gradienta pove strmino. Izračunaj gradient v \\((1;\\ 0)\\) in v \\((0;\\ 1)\\) na osi \\(y\\) in napovej, v kateri točki je gradient daljši in kolikokrat.',
            'The graph shows the valley \\(f=x^2+10y^2\\) at \\(c=1\\) and the probe at \\((1,\\ 0)\\) on the \\(x\\)-axis; the gradient is hidden. The length of the gradient tells the steepness. Compute the gradient at \\((1,\\ 0)\\) and at \\((0,\\ 1)\\) on the \\(y\\)-axis and predict at which point the gradient is longer and by what factor.',
        ),
        formulaIds: [],
        observationPrompt: text(
            'V polju Način izberi Gradient in preberi Gradient (točno) v \\((1;\\ 0)\\). Nato v polju Sonda vpiši \\(x=0\\), \\(y=1\\) in preberi znova; primerjaj z napovedjo.',
            'In the box Mode choose Gradient and read Gradient (exact) at \\((1,\\ 0)\\). Then in the box Probe enter \\(x=0\\), \\(y=1\\) and read again; compare with your prediction.',
        ),
        expectedObservations: [text(
            'V \\((1;\\ 0)\\) je gradient \\((2;\\ 0)\\), dolžina \\(2\\), tangenta \\((0;\\ 1)\\); v \\((0;\\ 1)\\) je gradient \\((0;\\ 20)\\), dolžina \\(20\\), tangenta \\((-1;\\ 0)\\). To ustreza \\(\\nabla f=(2x,\\ 20y)\\). V teh dveh točkah je gradient v smeri \\(y\\) desetkrat daljši: dolina je čez (v smeri \\(y\\)) strmejša kot vzdolž (v smeri \\(x\\)); v obeh točkah je gradient pravokoten na tangento.',
            'At \\((1,\\ 0)\\) the gradient is \\((2,\\ 0)\\), length \\(2\\), tangent \\((0,\\ 1)\\); at \\((0,\\ 1)\\) the gradient is \\((0,\\ 20)\\), length \\(20\\), tangent \\((-1,\\ 0)\\). This matches \\(\\nabla f=(2x,\\ 20y)\\). At these two points the gradient in the \\(y\\) direction is ten times longer: the valley is steeper across (in the \\(y\\) direction) than along (in the \\(x\\) direction); at both points the gradient is perpendicular to the tangent.',
        )],
        scene: contourScene('ls2-valley-scene', LS2_VALLEY,
            'Dolina \\(x^2+10y^2\\), \\(c=1\\), sonda v \\((1;\\ 0)\\), kjer je \\(f=1\\), način Nivojnice: gradient je skrit.',
            'The valley \\(x^2+10y^2\\), \\(c=1\\), the probe at \\((1,\\ 0)\\), where \\(f=1\\), the mode Level sets: the gradient is hidden.'),
    }),
    step({
        id: 'ls2-hills', order: 4,
        title: text('Griči', 'The hills'),
        purpose: text('Napovedati dolžino gradienta ob vrhu in v točki \\((0;\\ 0)\\), kjer je nivojnica mreža.', 'Predicting the length of the gradient near a peak and at the point \\((0,\\ 0)\\), where the level set is a grid.'),
        explanation: text(
            'Griči so \\(f=\\sin x\\sin y\\) z \\(\\nabla f=(\\cos x\\sin y,\\ \\sin x\\cos y)\\). Sonda stoji v \\((1{,}55;\\ 1{,}55)\\); gradient je skrit. Izračunaj \\(\\nabla f\\) v tej točki in napovej, ali bo gradient tu dolg ali kratek in zakaj. Nato napovej, kaj bo status kazal v točki \\((0;\\ 0)\\).',
            'The hills are \\(f=\\sin x\\sin y\\) with \\(\\nabla f=(\\cos x\\sin y,\\ \\sin x\\cos y)\\). The probe stands at \\((1.55,\\ 1.55)\\); the gradient is hidden. Compute \\(\\nabla f\\) at this point and predict whether the gradient is long or short here and why. Then predict what the status will show at the point \\((0,\\ 0)\\).',
        ),
        formulaIds: [],
        observationPrompt: text(
            'V polju Način izberi Gradient in preberi status ter Dolžino gradienta. Nato v polju Sonda vpiši \\(x=0\\), \\(y=0\\) in preberi status; primerjaj z napovedjo.',
            'In the box Mode choose Gradient and read the status and the Length of the gradient. Then in the box Probe enter \\(x=0\\), \\(y=0\\) and read the status; compare with your prediction.',
        ),
        expectedObservations: [text(
            'V \\((1{,}55;\\ 1{,}55)\\), tik ob vrhu, kjer je Vrednost f v sondi \\(0{,}999568\\), je gradient približno \\((0{,}0208;\\ 0{,}0208)\\), dolžina približno \\(0{,}0294\\): puščica je zelo kratka, vendar ni ničelna, ker vrh \\((\\pi/2,\\ \\pi/2)\\) ni na mreži sonde (korak \\(0{,}05\\)). V samem vrhu je \\(\\nabla f=(0;\\ 0)\\) natančno, ker je \\(\\cos(\\pi/2)=0\\). V \\((0;\\ 0)\\) status kaže, da je gradient ničeln in da tangente nivojnice ni; ta točka je sedlo, ne vrh: ničeln gradient je potreben pogoj za lokalni ekstrem, ne zadosten.',
            'At \\((1.55,\\ 1.55)\\), right next to the peak, where Value of f at the probe is \\(0.999568\\), the gradient is about \\((0.0208,\\ 0.0208)\\), length about \\(0.0294\\): the arrow is very short but not zero, because the peak \\((\\pi/2,\\ \\pi/2)\\) is not on the grid of the probe (step \\(0.05\\)). At the peak itself \\(\\nabla f=(0,\\ 0)\\) exactly, because \\(\\cos(\\pi/2)=0\\). At \\((0,\\ 0)\\) the status says that the gradient is zero and that the level set has no tangent; this point is a saddle, not a peak: a zero gradient is a necessary condition for a local extremum, not a sufficient one.',
        )],
        scene: contourScene('ls2-hills-scene', LS2_HILLS,
            'Griči \\(\\sin x\\sin y\\), \\(c=0{,}625\\), sonda v \\((1{,}55;\\ 1{,}55)\\), kjer je \\(f=0{,}999568\\), način Nivojnice: gradient je skrit.',
            'The hills \\(\\sin x\\sin y\\), \\(c=0.625\\), the probe at \\((1.55,\\ 1.55)\\), where \\(f=0.999568\\), the mode Level sets: the gradient is hidden.'),
    }),
    step({
        id: 'ls2-numeric', order: 5,
        title: text('Numerična ocena gradienta', 'The numeric estimate of the gradient'),
        purpose: text('Napovedati, kako natančna je ocena s centralno razliko pri \\(h=0{,}01\\), preden jo graf pokaže.', 'Predicting how accurate the central-difference estimate at \\(h=0.01\\) is before the graph shows it.'),
        explanation: text(
            'Gradient lahko ocenimo tudi brez odvajanja: vsak parcialni odvod ocenimo iz dveh vrednosti \\(f\\), pri \\(x\\pm h\\) oziroma \\(y\\pm h\\). Graf kaže griče, sondo v \\((1;\\ 1)\\) in točni gradient (odčitek Gradient (točno)). Napovej, na koliko decimalk se bo ocena pri \\(h=0{,}01\\) ujemala s točnim gradientom.',
            'The gradient can also be estimated without differentiating: each partial derivative is estimated from two values of \\(f\\), at \\(x\\pm h\\) or \\(y\\pm h\\). The graph shows the hills, the probe at \\((1,\\ 1)\\) and the exact gradient (the readout Gradient (exact)). Predict to how many decimals the estimate at \\(h=0.01\\) will agree with the exact gradient.',
        ),
        formulaIds: ['central-difference'],
        observationPrompt: text(
            'Obkljukaj Pokaži numerično oceno gradienta in primerjaj odčitka Ocena gradienta (centralna razlika, \\(h=0{,}01\\), izračunano) in Napaka ocene z napovedjo.',
            'Tick Show the numeric gradient estimate and compare the readouts Gradient estimate (central difference, \\(h=0.01\\), computed) and Error of the estimate with your prediction.',
        ),
        expectedObservations: [text(
            'Ocena je \\((0{,}4546411;\\ 0{,}4546411)\\), točni gradient \\((0{,}4546487;\\ 0{,}4546487)\\): ujemata se v \\(5\\) decimalkah (\\(0{,}45464\\)), vsaka komponenta se razlikuje za \\(0{,}0000076\\), odčitek Napaka ocene je \\(0{,}0000076\\). Napaka centralne razlike je pri gladki funkciji reda \\(h^2\\): \\(\\tfrac{h^2}{6}\\,|f_{xxx}|=\\tfrac{0{,}01^2}{6}\\cdot0{,}4546\\approx7{,}6\\cdot10^{-6}\\), kar se ujema. Ocena je izračunan približek, točni gradient je izračunan po formuli.',
            'The estimate is \\((0.4546411,\\ 0.4546411)\\), the exact gradient \\((0.4546487,\\ 0.4546487)\\): they agree in \\(5\\) decimals (\\(0.45464\\)), each component differs by \\(0.0000076\\), and the readout Error of the estimate is \\(0.0000076\\). For a smooth function the error of the central difference is of order \\(h^2\\): \\(\\tfrac{h^2}{6}\\,|f_{xxx}|=\\tfrac{0.01^2}{6}\\cdot0.4546\\approx7.6\\cdot10^{-6}\\), which matches. The estimate is a computed approximation, the exact gradient is computed from a formula.',
        )],
        scene: contourScene('ls2-numeric-scene', LS2_NUMERIC_OPEN,
            'Griči \\(\\sin x\\sin y\\), \\(c=0{,}625\\), sonda v \\((1;\\ 1)\\), način Gradient, numerična ocena izklopljena; točni gradient je \\((0{,}4546487;\\ 0{,}4546487)\\).',
            'The hills \\(\\sin x\\sin y\\), \\(c=0.625\\), the probe at \\((1,\\ 1)\\), the mode Gradient, the numeric estimate off; the exact gradient is \\((0.4546487,\\ 0.4546487)\\).'),
    }),
    step({
        id: 'ls2-explore', order: 6,
        title: text('Prosto raziskovanje', 'Free exploration'),
        purpose: text('Preizkusiti naučeno na funkciji, ki je lekcija ne obravnava.', 'Trying what you have learned on a function the lesson did not cover.'),
        explanation: text(
            'Graf je spet v začetnem stanju (Skleda, \\(c=1\\), način Nivojnice). Izberi Produkt: x · y, v polju Sonda vpiši \\(x=1\\), \\(y=1\\) in izračunaj \\(\\nabla f\\) na roke, preden izbereš Gradient. Nato premikaj sondo po vseh funkcijah in išči točke, kjer je gradient dolg, kratek ali ničeln.',
            'The graph is back in its starting state (Bowl, \\(c=1\\), the mode Level sets). Choose Product: x · y, in the box Probe enter \\(x=1\\), \\(y=1\\) and compute \\(\\nabla f\\) by hand before you choose Gradient. Then move the probe over all the functions and look for points where the gradient is long, short or zero.',
        ),
        formulaIds: [],
        observationPrompt: text(
            'Preizkusi napoved za Produkt, nato raziskuj sam; nič ni treba vpisati.',
            'Test your prediction for Product, then explore on your own; nothing has to be entered.',
        ),
        expectedObservations: [text(
            'Za produkt je \\(\\nabla f=(y,\\ x)\\): v \\((1;\\ 1)\\) graf kaže gradient \\((1;\\ 1)\\), dolžino približno \\(1{,}4142\\), tangento \\((-0{,}7071068;\\ 0{,}7071068)\\) in skalarni produkt \\(0\\). Ničeln gradient na mreži sonde najdeš na primer v \\((0;\\ 0)\\).',
            'For the product \\(\\nabla f=(y,\\ x)\\): at \\((1,\\ 1)\\) the graph shows the gradient \\((1,\\ 1)\\), length about \\(1.4142\\), tangent \\((-0.7071068,\\ 0.7071068)\\) and dot product \\(0\\). A zero gradient on the grid of the probe is found, for example, at \\((0,\\ 0)\\).',
        )],
        scene: contourScene('ls2-explore-scene', LS2_EXPLORE,
            'Začetno stanje: skleda, \\(c=1\\), sonda v \\((0{,}6;\\ 0{,}8)\\), način Nivojnice; vse nastavitve so proste.',
            'The starting state: the bowl, \\(c=1\\), the probe at \\((0.6,\\ 0.8)\\), the mode Level sets; every setting is free.'),
    }),
];

// ---- the lessons -------------------------------------------------------------------------------------------------------------------

const sources: GuidedLesson['sources'] = [
    {
        id: 'bezeg-levelsets-contour-implementation',
        citation: 'Bezeg source: src/levelsets/ (contour sampling, gradient and tangent, central difference) and src/graphs/levelsets/ContourMapGraph.tsx.',
        implementationCorrespondence: 'A scene sets the function, the level c and the number of level sets, the probe and the mode of the contour graph; every level set is a sampled approximation on a grid (an illustration), the gradient is computed exactly from a formula, and the central-difference estimate is a computed approximation with its error shown. That the gradient is perpendicular to the level set is the chain-rule theorem, not a measurement.',
    },
];

const ls1: GuidedLesson = {
    demonstrationId: 'contour-map',
    title: text('Ploskev in nivojnice', 'Surface and level sets'),
    summary: text(
        'Funkcija dveh spremenljivk določa ploskev, nivojnica pri vrednosti \\(c\\) pa je množica točk ravnine, kjer ima funkcija vrednost \\(c\\). Pregledamo nivojnice sklede, doline, sedla in gričev ter sondo, ki pokaže, katera nivojnica poteka skozi izbrano točko.',
        'A function of two variables defines a surface, and the level set at the value \\(c\\) is the set of points of the plane where the function has the value \\(c\\). We look at the level sets of the bowl, the valley, the saddle and the hills, and at a probe that shows which level set passes through a chosen point.',
    ),
    prerequisites: [text('Funkcija ene spremenljivke in graf; krožnica in elipsa v ravnini.', 'A function of one variable and its graph; the circle and the ellipse in the plane.')],
    learningGoals: [
        text('Znaš za dano funkcijo in vrednost \\(c\\) napovedati nivojnico in jo primerjati z narisano.', 'Can predict the level set for a given function and value \\(c\\) and compare it with the drawn one.'),
        text('Veš, da skozi vsako točko poteka nivojnica pri \\(c=f(P)\\), in da bližje nivojnice pri enakih korakih \\(c\\) pomenijo hitrejše naraščanje ploskve.', 'Know that a level set at \\(c=f(P)\\) passes through every point \\(P\\), and that closer level sets at equal steps of \\(c\\) mean that the surface rises faster.'),
        text('Znaš poiskati maksimume, minimume in sedla na sliki nivojnic in veš, da je slika ponazoritev.', 'Can find maxima, minima and saddles in a picture of level sets and know that the picture is an illustration.'),
    ],
    formulaBlocks: ls1Formulas,
    workedExamples: [],
    steps: ls1Steps,
    sources,
    edgeCases: [
        text('Nivojnica je narisana z daljicami na mreži; značilnost, manjša od ene celice, se lahko izgubi, zlasti pri vrednosti blizu kritične (pri gričih \\(c=1\\)).', 'The level set is drawn with segments on a grid; a feature smaller than one cell can be lost, especially at a value near a critical one (on the hills \\(c=1\\)).'),
        text('Korak med vrednostmi več nivojnic je odvisen od funkcije (pri skledi \\(1\\), pri gričih \\(0{,}125\\)); odčitek Vrednost c ga vedno pove.', 'The step between the values of several level sets depends on the function (\\(1\\) for the bowl, \\(0.125\\) for the hills); the readout Value c always states it.'),
    ],
    unresolvedQuestions: [],
};

const ls2: GuidedLesson = {
    demonstrationId: 'contour-map',
    title: text('Gradient in nivojnica', 'The gradient and the level set'),
    summary: text(
        'Gradient funkcije dveh spremenljivk je vektor parcialnih odvodov. V izbrani točki ga primerjamo z nivojnico skozi to točko in s tangento nanjo, pogledamo, kaj pove njegova dolžina, in ga primerjamo z oceno s centralno razliko.',
        'The gradient of a function of two variables is the vector of its partial derivatives. At a chosen point we compare it with the level set through that point and with the tangent to it, see what its length tells, and compare it with the central-difference estimate.',
    ),
    prerequisites: [
        text('Nivojnice funkcije dveh spremenljivk (lekcija Ploskev in nivojnice); parcialni odvod.', 'The level sets of a function of two variables (the lesson Surface and level sets); the partial derivative.'),
        text('Skalarni produkt dveh vektorjev v ravnini.', 'The dot product of two vectors in the plane.'),
    ],
    learningGoals: [
        text('Znaš gradient v točki izračunati na roke in ga primerjati z odčitkom grafa.', 'Can compute the gradient at a point by hand and compare it with the readout of the graph.'),
        text('Veš, da je gradient pravokoten na nivojnico (verižno pravilo), da kaže v smer najhitrejšega naraščanja in da dolžina pove strmino; puščica in tangenta v grafu sta le ponazoritev.', 'Know that the gradient is perpendicular to the level set (the chain rule), that it points in the direction of the fastest increase and that its length tells the steepness; the arrow and the tangent in the graph are only an illustration.'),
        text('Veš, da je ničeln gradient potreben, ne zadosten pogoj za lokalni ekstrem, in znaš oceniti napako numerične ocene gradienta.', 'Know that a zero gradient is a necessary but not a sufficient condition for a local extremum, and can judge the error of a numeric estimate of the gradient.'),
    ],
    formulaBlocks: ls2Formulas,
    workedExamples: [],
    steps: ls2Steps,
    sources,
    edgeCases: [
        text('Kjer je gradient ničeln (na mreži sonde na primer v \\((0;\\ 0)\\)), tangente nivojnice ni in izrek o pravokotnosti ne pove nič.', 'Where the gradient is zero (on the grid of the probe, for example at \\((0,\\ 0)\\)), the level set has no tangent and the perpendicularity theorem says nothing.'),
        text('Vrhovi gričev \\((\\pi/2,\\ \\pi/2)\\) niso na mreži sonde (korak \\(0{,}05\\)); gradient je tam ničeln po formuli, ob njih pa je majhen, ne ničeln.', 'The peaks of the hills \\((\\pi/2,\\ \\pi/2)\\) are not on the grid of the probe (step \\(0.05\\)); the gradient is zero there by the formula, and near them it is small, not zero.'),
        text('Puščice so v grafu lahko skrajšane (odčitek Dolžina puščic); dolžina gradienta je v odčitku Dolžina gradienta.', 'The arrows in the graph can be shortened (the readout Length of the arrows); the length of the gradient is in the readout Length of the gradient.'),
    ],
    unresolvedQuestions: [],
};

export const levelSetsSurfaceLesson: GuidedLesson = ls1;
export const levelSetsGradientLesson: GuidedLesson = ls2;
