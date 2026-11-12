/**
 * Guided lessons of the analytic-lines family, batch A (docs/specs/analytic-lines-lessons.md): L1, the forms of a line, and L2, the normal vector,
 * parallel and perpendicular, both on `line-geometry` (LineGeometryGraph). Each is the lesson of one section of the analytic-lines chapter
 * (analyticLinesChapterRegistry.ts adapts them on request; the lesson catalog itself holds none, as it keeps one lesson per Demonstration). Scenes use only
 * the `lines` actions LineGeometryGraph registers (`set-mode`, `set-points`) and every scene starts from the Demonstration default and names the mode and
 * the handles it states. `analyticLinesGuidedLessons.test.ts` reads each number the text quotes back from the real graph's readouts and recomputes it
 * with plain integer arithmetic (not the line kernel).
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

/** A handle position on the integer grid [-8, 8]. */
export type LineScenePoint = readonly [x: number, y: number];

/** What a scene sets: the mode and the handles it names; every other handle keeps the Demonstration default. */
export interface LineSceneSpec {
    readonly mode: 'forms' | 'normal';
    readonly P: LineScenePoint;
    readonly Q: LineScenePoint;
    readonly R?: LineScenePoint;
    readonly S?: LineScenePoint;
}

/** The actions of a scene: the Demonstration default, then the mode and one `set-points` naming every handle of the spec. */
export const lineSceneActions = (id: string, spec: LineSceneSpec): LessonAction[] => {
    const point = ([x, y]: LineScenePoint) => ({x, y});
    return [
        {kind: 'prepared-scene', sceneId: id, source: 'demonstration-default'},
        {kind: 'lines', operation: 'set-mode', mode: spec.mode},
        {
            kind: 'lines', operation: 'set-points',
            points: {P: point(spec.P), Q: point(spec.Q), ...(spec.R ? {R: point(spec.R)} : {}), ...(spec.S ? {S: point(spec.S)} : {})},
        },
    ];
};

const scene = (id: string, spec: LineSceneSpec, sl: string, en: string): LessonScene =>
    ({id, basedOn: 'demonstration-default', actions: lineSceneActions(id, spec), expectedState: text(sl, en)});

// ---- L1 --------------------------------------------------------------------------------------------------------------------------

const l1Formulas: readonly FormulaBlock[] = [
    {
        id: 'implicit-form',
        latex: 'ax+by=c',
        notation: text(
            '\\(a\\), \\(b\\) in \\(c\\) so cela števila, \\(a\\) in \\(b\\) nista hkrati \\(0\\); trojici \\((a,b,c)\\) in \\((\\lambda a,\\lambda b,\\lambda c)\\) opisujeta isto premico.',
            '\\(a\\), \\(b\\) and \\(c\\) are integers, \\(a\\) and \\(b\\) are not both \\(0\\); the triples \\((a,b,c)\\) and \\((\\lambda a,\\lambda b,\\lambda c)\\) describe the same line.',
        ),
        explanation: text(
            'Definicija: implicitna oblika enačbe premice je \\(ax+by=c\\). Premica skozi točki \\(P\\) in \\(Q\\) ima \\(a=q_y-p_y\\), \\(b=p_x-q_x\\) in \\(c=ap_x+bp_y\\). Okrajšamo jo z največjim skupnim deliteljem in izberemo predznak tako, da je prvi neničelni koeficient pozitiven; tako imata enaki premici enake koeficiente. Oblika velja za vsako premico, tudi navpično.',
            'Definition: the implicit form of the equation of a line is \\(ax+by=c\\). The line through the points \\(P\\) and \\(Q\\) has \\(a=q_y-p_y\\), \\(b=p_x-q_x\\) and \\(c=ap_x+bp_y\\). It is reduced by the greatest common divisor and the sign is chosen so that the first nonzero coefficient is positive; then equal lines have equal coefficients. The form holds for every line, vertical ones too.',
        ),
    },
    {
        id: 'explicit-form',
        latex: 'y=kx+n',
        notation: text(
            '\\(k\\) je smerni koeficient (naklon), \\(n\\) začetna vrednost, ordinata presečišča z osjo \\(y\\).',
            '\\(k\\) is the slope and \\(n\\) the initial value, the ordinate where the line meets the y-axis.',
        ),
        explanation: text(
            'Definicija: eksplicitna oblika je graf funkcije \\(y=kx+n\\). Funkcija vsakemu \\(x\\) priredi en \\(y\\), zato navpična premica ni graf nobene funkcije in eksplicitne oblike nima. Iz implicitne oblike za \\(b\\ne0\\) dobimo \\(k=-\\tfrac ab\\) in \\(n=\\tfrac cb\\).',
            'Definition: the explicit form is the graph of a function \\(y=kx+n\\). A function assigns one \\(y\\) to each \\(x\\), so a vertical line is the graph of no function and has no explicit form. From the implicit form, for \\(b\\ne0\\), we get \\(k=-\\tfrac ab\\) and \\(n=\\tfrac cb\\).',
        ),
    },
    {
        id: 'intercept-form',
        latex: '\\frac{x}{m}+\\frac{y}{n}=1',
        notation: text(
            '\\(m\\) in \\(n\\) sta odseka premice na oseh \\(x\\) in \\(y\\); oba morata biti različna od \\(0\\).',
            '\\(m\\) and \\(n\\) are the intercepts of the line on the x-axis and the y-axis; both must be nonzero.',
        ),
        explanation: text(
            'Definicija: odsekovna oblika je \\(\\tfrac xm+\\tfrac yn=1\\). Ker v imenovalcu nista dovoljeni ničli, je ni za premico skozi izhodišče (oba odseka sta \\(0\\)) in ne za premico, vzporedno z osjo (en odsek ne obstaja). Implicitna oblika ostane veljavna povsod, zato je zanesljivejša od obeh drugih.',
            'Definition: the intercept form is \\(\\tfrac xm+\\tfrac yn=1\\). Since zero is not allowed in a denominator, it does not exist for a line through the origin (both intercepts are \\(0\\)) nor for a line parallel to an axis (one intercept does not exist). The implicit form stays valid everywhere, so it is the more reliable of the three.',
        ),
    },
];

const l1Examples: readonly WorkedExample[] = [
    {
        id: 'l1-slope-and-implicit',
        title: text('Premica skozi \\(P=(-2,1)\\) in \\(Q=(4,-1)\\)', 'The line through \\(P=(-2,1)\\) and \\(Q=(4,-1)\\)'),
        calculationLatex: 'a=-1-1=-2,\\ \\ b=-2-4=-6,\\ \\ c=(-2)(-2)+(-6)(1)=-2',
        resultLatex: '-2x-6y=-2\\ \\Longrightarrow\\ x+3y=1',
        check: text(
            'Koeficiente \\((-2,-6,-2)\\) delimo z največjim skupnim deliteljem \\(2\\) in zamenjamo predznak, tako da je prvi koeficient pozitiven: \\(x+3y=1\\). Preverek: \\(P\\) da \\(-2+3=1\\), \\(Q\\) da \\(4-3=1\\). Iz \\(b=3\\) sledi \\(k=-\\tfrac13\\) in \\(n=\\tfrac13\\); odseka sta \\(1\\) in \\(\\tfrac13\\).',
            'We divide the coefficients \\((-2,-6,-2)\\) by the greatest common divisor \\(2\\) and change the sign so that the first coefficient is positive: \\(x+3y=1\\). Check: \\(P\\) gives \\(-2+3=1\\), \\(Q\\) gives \\(4-3=1\\). From \\(b=3\\) we get \\(k=-\\tfrac13\\) and \\(n=\\tfrac13\\); the intercepts are \\(1\\) and \\(\\tfrac13\\).',
        ),
    },
];

const l1Steps: readonly GuidedLessonStep[] = [
    step({
        id: 'l1-predict', order: 1,
        title: text('Napoved naklona', 'Predicting the slope'),
        purpose: text('Napovedati smerni koeficient premice skozi dve točki, preden ga odčitamo.', 'Predicting the slope of the line through two points before reading it.'),
        explanation: text(
            'Premica \\(\\ell\\) gre skozi točki \\(P=(-2,1)\\) in \\(Q=(4,4)\\). Od \\(P\\) do \\(Q\\) gremo za \\(6\\) v desno in za \\(3\\) navzgor. Preden prebereš eksplicitno obliko, napovej smerni koeficient \\(k\\) in vrednost \\(n\\), kjer premica seka os \\(y\\). Smerni koeficient je kvocient \\(\\tfrac{3}{6}=\\tfrac12\\).',
            'The line \\(\\ell\\) passes through the points \\(P=(-2,1)\\) and \\(Q=(4,4)\\). From \\(P\\) to \\(Q\\) we go \\(6\\) to the right and \\(3\\) up. Before reading the explicit form, predict the slope \\(k\\) and the value \\(n\\) where the line meets the y-axis. The slope is the quotient \\(\\tfrac{3}{6}=\\tfrac12\\).',
        ),
        formulaIds: ['explicit-form'],
        observationPrompt: text('Zapiši svojo napoved, nato preberi vse štiri oblike v odčitku.', 'Write down your prediction, then read all four forms in the readout.'),
        expectedObservations: [text('Eksplicitna oblika je \\(y=\\tfrac12x+2\\), implicitna \\(x-2y=-4\\), odseka sta \\(-4\\) in \\(2\\).', 'The explicit form is \\(y=\\tfrac12x+2\\), the implicit form \\(x-2y=-4\\), the intercepts are \\(-4\\) and \\(2\\).')],
        scene: scene('l1-predict-scene', {mode: 'forms', P: [-2, 1], Q: [4, 4]},
            'Točki sta \\(P=(-2,1)\\) in \\(Q=(4,4)\\); neokrajšana oblika je \\(3x-6y=-12\\), okrajšana \\(x-2y=-4\\), eksplicitna \\(y=\\tfrac12x+2\\), odseka \\(-4\\) in \\(2\\).',
            'The points are \\(P=(-2,1)\\) and \\(Q=(4,4)\\); the unreduced form is \\(3x-6y=-12\\), the reduced \\(x-2y=-4\\), the explicit \\(y=\\tfrac12x+2\\), the intercepts \\(-4\\) and \\(2\\).'),
    }),
    step({
        id: 'l1-drag', order: 2,
        title: text('Premakni točko \\(Q\\)', 'Move the point \\(Q\\)'),
        purpose: text('Videti, da vse oblike opisujejo isto premico in se skupaj spreminjajo.', 'Seeing that all forms describe the same line and change together.'),
        explanation: text(
            'Premakni \\(Q\\) v \\((4,-1)\\). Od \\(P=(-2,1)\\) gremo za \\(6\\) v desno in za \\(2\\) navzdol, zato je \\(k=-\\tfrac13\\). Neokrajšana oblika \\(-2x-6y=-2\\) in okrajšana \\(x+3y=1\\) opisujeta isto premico; eksplicitna oblika je \\(y=-\\tfrac13x+\\tfrac13\\), odseka sta \\(1\\) in \\(\\tfrac13\\). Dvotočkovna oblika uporablja točki, ki ju premikaš, ostale tri oblike pa so izračunane iz nje. To je ponazoritev: drug par točk bi dal enake odnose med oblikami.',
            'Move \\(Q\\) to \\((4,-1)\\). From \\(P=(-2,1)\\) we go \\(6\\) to the right and \\(2\\) down, so \\(k=-\\tfrac13\\). The unreduced form \\(-2x-6y=-2\\) and the reduced form \\(x+3y=1\\) describe the same line; the explicit form is \\(y=-\\tfrac13x+\\tfrac13\\), the intercepts are \\(1\\) and \\(\\tfrac13\\). The two-point form uses the points you move, and the other three forms are computed from it. This is an illustration: another pair of points would give the same relations between the forms.',
        ),
        formulaIds: ['implicit-form'],
        workedExampleId: 'l1-slope-and-implicit',
        observationPrompt: text('Premikaj \\(Q\\) po mreži in opazuj, kako se vse oblike spreminjajo skupaj.', 'Move \\(Q\\) along the grid and watch all the forms change together.'),
        expectedObservations: [text('Pri \\(Q=(4,-1)\\) je okrajšana oblika \\(x+3y=1\\), smerni koeficient \\(-\\tfrac13\\).', 'At \\(Q=(4,-1)\\) the reduced form is \\(x+3y=1\\), the slope \\(-\\tfrac13\\).')],
        scene: scene('l1-drag-scene', {mode: 'forms', P: [-2, 1], Q: [4, -1]},
            'Točki sta \\(P=(-2,1)\\) in \\(Q=(4,-1)\\); neokrajšana oblika je \\(-2x-6y=-2\\), okrajšana \\(x+3y=1\\), eksplicitna \\(y=-\\tfrac13x+\\tfrac13\\).',
            'The points are \\(P=(-2,1)\\) and \\(Q=(4,-1)\\); the unreduced form is \\(-2x-6y=-2\\), the reduced \\(x+3y=1\\), the explicit \\(y=-\\tfrac13x+\\tfrac13\\).'),
    }),
    step({
        id: 'l1-vertical', order: 3,
        title: text('Navpična premica', 'A vertical line'),
        purpose: text('Videti, da eksplicitna oblika odpove pri navpični premici, implicitna pa ne.', 'Seeing that the explicit form fails for a vertical line while the implicit form does not.'),
        explanation: text(
            'Postavi \\(Q\\) nad \\(P\\): \\(P=(3,-1)\\), \\(Q=(3,5)\\). Premica je navpična, \\(x=3\\). Eksplicitna oblika je graf funkcije, funkcija pa vsakemu \\(x\\) priredi en \\(y\\); navpična premica ima pri \\(x=3\\) vse vrednosti \\(y\\), zato eksplicitne oblike ni in smerni koeficient ni določen. Implicitna oblika \\(x=3\\) (to je \\(1x+0y=3\\)) ostane veljavna. Tudi odsekovne oblike ni, ker premica ne seka osi \\(y\\).',
            'Put \\(Q\\) above \\(P\\): \\(P=(3,-1)\\), \\(Q=(3,5)\\). The line is vertical, \\(x=3\\). The explicit form is the graph of a function, and a function assigns one \\(y\\) to each \\(x\\); the vertical line has every \\(y\\) at \\(x=3\\), so there is no explicit form and the slope is undefined. The implicit form \\(x=3\\) (that is \\(1x+0y=3\\)) stays valid. There is no intercept form either, because the line does not meet the y-axis.',
        ),
        formulaIds: ['explicit-form'],
        observationPrompt: text('Preberi, katere vrstice odčitka imajo vrednost in katere pišejo, da je ni.', 'Read which rows of the readout have a value and which say there is none.'),
        expectedObservations: [text('Implicitna oblika je \\(x=3\\); eksplicitne oblike in dvotočkovne oblike ni, odčitek pa pove, da je premica navpična.', 'The implicit form is \\(x=3\\); there is no explicit form or two-point form, and the readout says the line is vertical.')],
        scene: scene('l1-vertical-scene', {mode: 'forms', P: [3, -1], Q: [3, 5]},
            'Točki sta \\(P=(3,-1)\\) in \\(Q=(3,5)\\); implicitna oblika je \\(x=3\\), eksplicitne oblike ni.',
            'The points are \\(P=(3,-1)\\) and \\(Q=(3,5)\\); the implicit form is \\(x=3\\), there is no explicit form.'),
    }),
    step({
        id: 'l1-origin', order: 4,
        title: text('Premica skozi izhodišče', 'A line through the origin'),
        purpose: text('Videti, da odsekovna oblika odpove, ko sta oba odseka \\(0\\).', 'Seeing that the intercept form fails when both intercepts are \\(0\\).'),
        explanation: text(
            'Postavi \\(Q\\) v \\((4,-2)\\), \\(P=(-2,1)\\) ostane. Premica je \\(x+2y=0\\), \\(y=-\\tfrac12x\\), in gre skozi izhodišče: oba odseka sta \\(0\\). Odsekovna oblika \\(\\tfrac xm+\\tfrac yn=1\\) bi zahtevala deljenje z \\(0\\), zato je ni; implicitna in eksplicitna oblika obstajata. Premica, vzporedna z osjo, odsekovne oblike tudi nima.',
            'Put \\(Q\\) at \\((4,-2)\\), keeping \\(P=(-2,1)\\). The line is \\(x+2y=0\\), \\(y=-\\tfrac12x\\), and passes through the origin: both intercepts are \\(0\\). The intercept form \\(\\tfrac xm+\\tfrac yn=1\\) would need division by \\(0\\), so it does not exist; the implicit and explicit forms do. A line parallel to an axis has no intercept form either.',
        ),
        formulaIds: ['intercept-form'],
        observationPrompt: text('Preberi vrstico odsekovne oblike in primerjaj z vrsticama implicitne in eksplicitne oblike.', 'Read the intercept-form row and compare it with the implicit and explicit rows.'),
        expectedObservations: [text('Odsekovne oblike ni, ker gre premica skozi izhodišče; implicitna oblika je \\(x+2y=0\\).', 'There is no intercept form because the line passes through the origin; the implicit form is \\(x+2y=0\\).')],
        scene: scene('l1-origin-scene', {mode: 'forms', P: [-2, 1], Q: [4, -2]},
            'Točki sta \\(P=(-2,1)\\) in \\(Q=(4,-2)\\); implicitna oblika je \\(x+2y=0\\), eksplicitna \\(y=-\\tfrac12x\\), odsekovne oblike ni.',
            'The points are \\(P=(-2,1)\\) and \\(Q=(4,-2)\\); the implicit form is \\(x+2y=0\\), the explicit \\(y=-\\tfrac12x\\), there is no intercept form.'),
    }),
    step({
        id: 'l1-free', order: 5,
        title: text('Ista premica, drugi točki', 'The same line, other points'),
        purpose: text('Videti, da različna para točk dasta isto okrajšano obliko.', 'Seeing that different pairs of points give the same reduced form.'),
        explanation: text(
            'Točki \\(P=(-4,0)\\) in \\(Q=(4,4)\\) ležita na isti premici \\(\\ell\\) kot na začetku. Neokrajšana oblika je \\(4x-8y=-16\\) in je drugačna kot prej, okrajšana je spet \\(x-2y=-4\\). Zato lahko enaki premici primerjamo po okrajšanih koeficientih: dve premici sta enaki natanko tedaj, ko se ujemata \\(a\\), \\(b\\) in \\(c\\). Zdaj premikaj točki sam in preizkusi vse štiri oblike, tudi navpično premico in premico skozi izhodišče.',
            'The points \\(P=(-4,0)\\) and \\(Q=(4,4)\\) lie on the same line \\(\\ell\\) as at the start. The unreduced form is \\(4x-8y=-16\\), different from before, and the reduced form is again \\(x-2y=-4\\). So equal lines can be compared by their reduced coefficients: two lines are equal exactly when \\(a\\), \\(b\\) and \\(c\\) agree. Now move the points yourself and try all four forms, the vertical line and the line through the origin too.',
        ),
        formulaIds: ['implicit-form'],
        observationPrompt: text('Poišči še en par točk na isti premici in primerjaj obe vrstici implicitne oblike.', 'Find one more pair of points on the same line and compare the two implicit-form rows.'),
        expectedObservations: [text('Neokrajšana oblika se spreminja, okrajšana ostane \\(x-2y=-4\\).', 'The unreduced form changes, the reduced form stays \\(x-2y=-4\\).')],
        scene: scene('l1-free-scene', {mode: 'forms', P: [-4, 0], Q: [4, 4]},
            'Točki sta \\(P=(-4,0)\\) in \\(Q=(4,4)\\); neokrajšana oblika je \\(4x-8y=-16\\), okrajšana \\(x-2y=-4\\).',
            'The points are \\(P=(-4,0)\\) and \\(Q=(4,4)\\); the unreduced form is \\(4x-8y=-16\\), the reduced \\(x-2y=-4\\).'),
    }),
];

// ---- L2 --------------------------------------------------------------------------------------------------------------------------

const l2Formulas: readonly FormulaBlock[] = [
    {
        id: 'normal-vector',
        latex: '\\vec n=(a,b)',
        notation: text(
            '\\(\\vec n\\) je normalni vektor premice \\(ax+by=c\\); smerni vektor je \\(\\vec d=(-b,a)\\).',
            '\\(\\vec n\\) is the normal vector of the line \\(ax+by=c\\); the direction vector is \\(\\vec d=(-b,a)\\).',
        ),
        explanation: text(
            'Argument: točki \\(X\\) in \\(Y\\) premice \\(ax+by=c\\) dasta \\(a(x_Y-x_X)+b(y_Y-y_X)=0\\), to je \\((a,b)\\cdot\\overrightarrow{XY}=0\\). Vektor \\((a,b)\\) je torej pravokoten na vsak vektor vzdolž premice. Zato je normalni vektor, smerni vektor pa je \\((-b,a)\\), ker je \\((a,b)\\cdot(-b,a)=0\\).',
            'Argument: two points \\(X\\) and \\(Y\\) of the line \\(ax+by=c\\) give \\(a(x_Y-x_X)+b(y_Y-y_X)=0\\), that is \\((a,b)\\cdot\\overrightarrow{XY}=0\\). So the vector \\((a,b)\\) is perpendicular to every vector along the line. That makes it the normal vector, and the direction vector is \\((-b,a)\\) because \\((a,b)\\cdot(-b,a)=0\\).',
        ),
    },
    {
        id: 'parallel-perpendicular',
        latex: '\\ell_1\\parallel\\ell_2\\iff a_1b_2-a_2b_1=0,\\qquad \\ell_1\\perp\\ell_2\\iff a_1a_2+b_1b_2=0',
        notation: text(
            '\\((a_1,b_1)\\) in \\((a_2,b_2)\\) sta normalna vektorja premic \\(\\ell_1\\) in \\(\\ell_2\\).',
            '\\((a_1,b_1)\\) and \\((a_2,b_2)\\) are the normal vectors of the lines \\(\\ell_1\\) and \\(\\ell_2\\).',
        ),
        explanation: text(
            'Definicija: premici sta pravokotni, kadar je skalarni produkt njunih smernih vektorjev (in zato normalnih vektorjev) enak \\(0\\). Premici sta vzporedni, kadar sta normalna vektorja sorazmerna, to je \\(a_1b_2-a_2b_1=0\\). Obe odločitvi sta natančni, ker uporabljata le celoštevilske koeficiente. Zmnožek smernih koeficientov \\(k_1k_2=-1\\) je posledica za nenavpični premici; pri navpični in vodoravni premici ne obstaja, skalarni produkt pa deluje.',
            'Definition: two lines are perpendicular when the dot product of their direction vectors (and hence of their normal vectors) is \\(0\\). They are parallel when the normal vectors are proportional, that is \\(a_1b_2-a_2b_1=0\\). Both decisions are exact because they use only integer coefficients. The product of the slopes \\(k_1k_2=-1\\) is a corollary for non-vertical lines; for a vertical and a horizontal line it does not exist, while the dot product works.',
        ),
    },
];

const l2Examples: readonly WorkedExample[] = [
    {
        id: 'l2-perpendicular-through-t',
        title: text('Pravokotnica na \\(\\ell\\) skozi \\(T=(3,-2)\\)', 'The perpendicular to \\(\\ell\\) through \\(T=(3,-2)\\)'),
        calculationLatex: '\\vec n_\\ell=(1,-2)\\ \\Rightarrow\\ \\vec d=(2,1)\\ \\Rightarrow\\ \\vec n_m=(2,1),\\ \\ c=2\\cdot3+1\\cdot(-2)',
        resultLatex: '2x+y=4',
        check: text(
            'Smerni vektor premice \\(\\ell: x-2y=-4\\) je \\((2,1)\\); pravokotnica ima ta vektor za normalni vektor, torej \\(2x+y=c\\). Točka \\(T\\) da \\(c=2\\cdot3-2=4\\). Preverek: skalarni produkt normal je \\(1\\cdot2+(-2)\\cdot1=0\\); smerna koeficienta \\(\\tfrac12\\) in \\(-2\\) dasta produkt \\(-1\\).',
            'The direction vector of the line \\(\\ell: x-2y=-4\\) is \\((2,1)\\); the perpendicular has this vector as its normal vector, so \\(2x+y=c\\). The point \\(T\\) gives \\(c=2\\cdot3-2=4\\). Check: the dot product of the normals is \\(1\\cdot2+(-2)\\cdot1=0\\); the slopes \\(\\tfrac12\\) and \\(-2\\) have product \\(-1\\).',
        ),
    },
];

const l2Steps: readonly GuidedLessonStep[] = [
    step({
        id: 'l2-predict', order: 1,
        title: text('Napoved normale', 'Predicting the normal'),
        purpose: text('Napovedati normalni vektor premice iz njenih koeficientov.', 'Predicting the normal vector of a line from its coefficients.'),
        explanation: text(
            'Prva premica \\(\\ell\\) skozi \\(P=(-2,1)\\) in \\(Q=(4,4)\\) je \\(x-2y=-4\\). Druga premica \\(m\\) skozi \\(R=(3,-2)\\) in \\(S=(5,-2)\\) je vodoravna, \\(y=-2\\). Preden prebereš normalna vektorja, napovej normalni vektor premice \\(\\ell\\): to so koeficienti pred \\(x\\) in \\(y\\), torej \\((1,-2)\\). Vektor \\((1,-2)\\) in smer premice \\((2,1)\\) imata skalarni produkt \\(2-2=0\\).',
            'The first line \\(\\ell\\) through \\(P=(-2,1)\\) and \\(Q=(4,4)\\) is \\(x-2y=-4\\). The second line \\(m\\) through \\(R=(3,-2)\\) and \\(S=(5,-2)\\) is horizontal, \\(y=-2\\). Before reading the normal vectors, predict the normal vector of \\(\\ell\\): it is the coefficients of \\(x\\) and \\(y\\), so \\((1,-2)\\). The vector \\((1,-2)\\) and the direction of the line \\((2,1)\\) have dot product \\(2-2=0\\).',
        ),
        formulaIds: ['normal-vector'],
        observationPrompt: text('Zapiši napoved, nato preberi normalna vektorja in lego premic v odčitku.', 'Write down your prediction, then read the normal vectors and the relative position in the readout.'),
        expectedObservations: [text('Normalna vektorja sta \\((1,-2)\\) in \\((0,1)\\); premici nista ne vzporedni ne pravokotni.', 'The normal vectors are \\((1,-2)\\) and \\((0,1)\\); the lines are neither parallel nor perpendicular.')],
        scene: scene('l2-predict-scene', {mode: 'normal', P: [-2, 1], Q: [4, 4], R: [3, -2], S: [5, -2]},
            'Premica \\(\\ell\\) je \\(x-2y=-4\\) z normalo \\((1,-2)\\), premica \\(m\\) je \\(y=-2\\) z normalo \\((0,1)\\); \\(a_1b_2-a_2b_1=1\\), \\(a_1a_2+b_1b_2=-2\\), premici nista ne vzporedni ne pravokotni.',
            'The line \\(\\ell\\) is \\(x-2y=-4\\) with normal \\((1,-2)\\), the line \\(m\\) is \\(y=-2\\) with normal \\((0,1)\\); \\(a_1b_2-a_2b_1=1\\), \\(a_1a_2+b_1b_2=-2\\), the lines are neither parallel nor perpendicular.'),
    }),
    step({
        id: 'l2-perpendicular', order: 2,
        title: text('Pravokotnica', 'The perpendicular'),
        purpose: text('Premakniti drugo premico, da stanje pove, da sta pravokotni.', 'Moving the second line until the status says the lines are perpendicular.'),
        explanation: text(
            'Premakni \\(S\\) v \\((2,0)\\), \\(R=(3,-2)\\) ostane. Premica \\(m\\) je \\(2x+y=4\\) z normalo \\((2,1)\\). Skalarni produkt normal je \\(1\\cdot2+(-2)\\cdot1=0\\), zato sta premici po definiciji pravokotni; izraz \\(a_1b_2-a_2b_1=5\\) ni \\(0\\), zato nista vzporedni. Smerna koeficienta \\(\\tfrac12\\) in \\(-2\\) imata produkt \\(-1\\), kar je posledica definicije. Stanje je ponazoritev definicije, ne dokaz.',
            'Move \\(S\\) to \\((2,0)\\), keeping \\(R=(3,-2)\\). The line \\(m\\) is \\(2x+y=4\\) with normal \\((2,1)\\). The dot product of the normals is \\(1\\cdot2+(-2)\\cdot1=0\\), so by definition the lines are perpendicular; the expression \\(a_1b_2-a_2b_1=5\\) is not \\(0\\), so they are not parallel. The slopes \\(\\tfrac12\\) and \\(-2\\) have product \\(-1\\), a corollary of the definition. The status illustrates the definition; it is not a proof.',
        ),
        formulaIds: ['parallel-perpendicular'],
        workedExampleId: 'l2-perpendicular-through-t',
        observationPrompt: text('Premikaj \\(S\\) in opazuj, pri katerih legah stanje pove, da sta premici pravokotni.', 'Move \\(S\\) and watch at which positions the status says the lines are perpendicular.'),
        expectedObservations: [text('Pri \\(S=(2,0)\\) je skalarni produkt \\(0\\) in stanje pove, da sta premici pravokotni.', 'At \\(S=(2,0)\\) the dot product is \\(0\\) and the status says the lines are perpendicular.')],
        scene: scene('l2-perpendicular-scene', {mode: 'normal', P: [-2, 1], Q: [4, 4], R: [3, -2], S: [2, 0]},
            'Premica \\(m\\) je \\(2x+y=4\\) z normalo \\((2,1)\\); \\(a_1b_2-a_2b_1=5\\), \\(a_1a_2+b_1b_2=0\\), zmnožek smernih koeficientov je \\(-1\\), premici sta pravokotni.',
            'The line \\(m\\) is \\(2x+y=4\\) with normal \\((2,1)\\); \\(a_1b_2-a_2b_1=5\\), \\(a_1a_2+b_1b_2=0\\), the product of the slopes is \\(-1\\), the lines are perpendicular.'),
    }),
    step({
        id: 'l2-vertical-horizontal', order: 3,
        title: text('Navpična in vodoravna premica', 'A vertical and a horizontal line'),
        purpose: text('Videti, da pravokotnost drži, tudi kadar zmnožek smernih koeficientov ne obstaja.', 'Seeing that perpendicularity holds even when the product of the slopes does not exist.'),
        explanation: text(
            'Premica \\(\\ell\\) skozi \\(P=(3,-1)\\) in \\(Q=(3,5)\\) je navpična, \\(x=3\\), premica \\(m\\) skozi \\(R=(-2,2)\\) in \\(S=(4,2)\\) je vodoravna, \\(y=2\\). Navpična premica nima smernega koeficienta, zato zmnožka \\(k_1k_2\\) ni. Normali sta \\((1,0)\\) in \\((0,1)\\), njun skalarni produkt je \\(1\\cdot0+0\\cdot1=0\\): premici sta pravokotni. Definicija s skalarnim produktom torej ne odpove, pravilo z zmnožkom odpove.',
            'The line \\(\\ell\\) through \\(P=(3,-1)\\) and \\(Q=(3,5)\\) is vertical, \\(x=3\\), the line \\(m\\) through \\(R=(-2,2)\\) and \\(S=(4,2)\\) is horizontal, \\(y=2\\). A vertical line has no slope, so the product \\(k_1k_2\\) does not exist. The normals are \\((1,0)\\) and \\((0,1)\\), their dot product is \\(1\\cdot0+0\\cdot1=0\\): the lines are perpendicular. So the definition by the dot product does not fail, while the rule with the product fails.',
        ),
        formulaIds: ['parallel-perpendicular'],
        observationPrompt: text('Preberi vrstico zmnožka smernih koeficientov in vrstico skalarnega produkta.', 'Read the row of the product of the slopes and the row of the dot product.'),
        expectedObservations: [text('Zmnožka smernih koeficientov ni, skalarni produkt je \\(0\\) in stanje je pravokotni.', 'The product of the slopes does not exist, the dot product is \\(0\\) and the status is perpendicular.')],
        scene: scene('l2-vertical-horizontal-scene', {mode: 'normal', P: [3, -1], Q: [3, 5], R: [-2, 2], S: [4, 2]},
            'Premica \\(\\ell\\) je \\(x=3\\) z normalo \\((1,0)\\), premica \\(m\\) je \\(y=2\\) z normalo \\((0,1)\\); zmnožka smernih koeficientov ni, \\(a_1a_2+b_1b_2=0\\), premici sta pravokotni.',
            'The line \\(\\ell\\) is \\(x=3\\) with normal \\((1,0)\\), the line \\(m\\) is \\(y=2\\) with normal \\((0,1)\\); there is no product of slopes, \\(a_1a_2+b_1b_2=0\\), the lines are perpendicular.'),
    }),
    step({
        id: 'l2-parallel', order: 4,
        title: text('Vzporedni premici', 'Parallel lines'),
        purpose: text('Videti, da sta premici z enakima normalama in različnima \\(c\\) vzporedni.', 'Seeing that lines with proportional normals and different \\(c\\) are parallel.'),
        explanation: text(
            'Vrni \\(\\ell\\) na \\(P=(-2,1)\\), \\(Q=(4,4)\\), to je \\(x-2y=-4\\), in postavi \\(R=(3,0)\\), \\(S=(5,1)\\), kar je \\(x-2y=3\\). Normali sta enaki, \\((1,-2)\\), in \\(a_1b_2-a_2b_1=1\\cdot(-2)-1\\cdot(-2)=0\\), zato sta premici vzporedni. Desni strani \\(-4\\) in \\(3\\) sta različni, zato premici ne sovpadata. Smerna koeficienta sta enaka \\(\\tfrac12\\), njun zmnožek je \\(\\tfrac14\\), ne \\(-1\\); skalarni produkt \\(1+4=5\\) ni \\(0\\).',
            'Return \\(\\ell\\) to \\(P=(-2,1)\\), \\(Q=(4,4)\\), that is \\(x-2y=-4\\), and put \\(R=(3,0)\\), \\(S=(5,1)\\), which is \\(x-2y=3\\). The normals are equal, \\((1,-2)\\), and \\(a_1b_2-a_2b_1=1\\cdot(-2)-1\\cdot(-2)=0\\), so the lines are parallel. The right-hand sides \\(-4\\) and \\(3\\) differ, so the lines do not coincide. The slopes are both \\(\\tfrac12\\), their product is \\(\\tfrac14\\), not \\(-1\\); the dot product \\(1+4=5\\) is not \\(0\\).',
        ),
        formulaIds: ['parallel-perpendicular'],
        observationPrompt: text('Premakni \\(R\\) in \\(S\\) tako, da ostane \\(a_1b_2-a_2b_1=0\\), in primerjaj desni strani.', 'Move \\(R\\) and \\(S\\) so that \\(a_1b_2-a_2b_1=0\\) stays true, and compare the right-hand sides.'),
        expectedObservations: [text('Normali sta enaki, izraz \\(a_1b_2-a_2b_1\\) je \\(0\\) in premici sta vzporedni.', 'The normals are equal, the expression \\(a_1b_2-a_2b_1\\) is \\(0\\) and the lines are parallel.')],
        scene: scene('l2-parallel-scene', {mode: 'normal', P: [-2, 1], Q: [4, 4], R: [3, 0], S: [5, 1]},
            'Premica \\(m\\) je \\(x-2y=3\\) z normalo \\((1,-2)\\); \\(a_1b_2-a_2b_1=0\\), \\(a_1a_2+b_1b_2=5\\), zmnožek smernih koeficientov je \\(\\tfrac14\\), premici sta vzporedni.',
            'The line \\(m\\) is \\(x-2y=3\\) with normal \\((1,-2)\\); \\(a_1b_2-a_2b_1=0\\), \\(a_1a_2+b_1b_2=5\\), the product of the slopes is \\(\\tfrac14\\), the lines are parallel.'),
    }),
    step({
        id: 'l2-free', order: 5,
        title: text('Sovpadajoči premici', 'Coinciding lines'),
        purpose: text('Videti, da stanje loči sovpadanje od vzporednosti, nato raziskati sam.', 'Seeing that the status tells coincidence from parallelism, then exploring alone.'),
        explanation: text(
            'Postavi \\(R=(0,2)\\), \\(S=(2,3)\\): obe točki ležita na \\(x-2y=-4\\), zato \\(m\\) in \\(\\ell\\) sovpadata. Še vedno je \\(a_1b_2-a_2b_1=0\\), vendar stanje pove, da premici sovpadata, ne le da sta vzporedni; to loči desna stran \\(c\\). Zdaj premikaj vse štiri točke sam in poišči lege, pri katerih je stanje vzporedni, pravokotni, sovpadata in ne vzporedni ne pravokotni.',
            'Put \\(R=(0,2)\\), \\(S=(2,3)\\): both points lie on \\(x-2y=-4\\), so \\(m\\) and \\(\\ell\\) coincide. Still \\(a_1b_2-a_2b_1=0\\), but the status says the lines coincide, not only that they are parallel; the right-hand side \\(c\\) tells them apart. Now move all four points yourself and find positions where the status is parallel, perpendicular, coincide and neither.',
        ),
        formulaIds: ['parallel-perpendicular'],
        observationPrompt: text('Poišči po en primer za vsako od štirih stanj.', 'Find one example of each of the four statuses.'),
        expectedObservations: [text('Pri sovpadajočih premicah je \\(a_1b_2-a_2b_1=0\\), enaki sta tudi okrajšani implicitni obliki.', 'For coinciding lines \\(a_1b_2-a_2b_1=0\\), and the reduced implicit forms are equal too.')],
        scene: scene('l2-free-scene', {mode: 'normal', P: [-2, 1], Q: [4, 4], R: [0, 2], S: [2, 3]},
            'Premica \\(m\\) je \\(x-2y=-4\\), enaka kot \\(\\ell\\); \\(a_1b_2-a_2b_1=0\\), \\(a_1a_2+b_1b_2=5\\), premici sovpadata.',
            'The line \\(m\\) is \\(x-2y=-4\\), equal to \\(\\ell\\); \\(a_1b_2-a_2b_1=0\\), \\(a_1a_2+b_1b_2=5\\), the lines coincide.'),
    }),
];

const sources: GuidedLesson['sources'] = [
    {
        id: 'matura-catalogue-premica',
        citation: 'Predmetni izpitni katalog za splošno maturo, matematika (M-MAT-2026), poglavje 4.10.1 Enačbe premice v ravnini in poglavje 4.8 Vektorji (utemelji pravokotnost in vzporednost vektorjev). Cited from the text extraction of the catalogue.',
        implementationCorrespondence: 'The lessons follow the topic list: the implicit, explicit and intercept forms, the normal vector, and parallel and perpendicular lines by the dot product of vectors; the decisions are exact on integer coefficients.',
    },
    {
        id: 'bezeg-line-geometry-implementation',
        citation: 'Bezeg source: src/compgeo/lineForms.ts, src/graphs/lines/lineGeometryModel.ts and src/graphs/lines/LineGeometryGraph.tsx.',
        implementationCorrespondence: 'A scene sets the graph\'s mode and its integer handle fields; the text quotes only values of those scenes or plain arithmetic (labelled calculation), and analyticLinesGuidedLessons.test.ts recomputes them with integer arithmetic and reads the readouts of the real graph.',
    },
];

const l1: GuidedLesson = {
    demonstrationId: 'line-geometry',
    title: text('Oblike enačbe premice', 'Forms of a line'),
    summary: text(
        'Ista premica ima več enakovrednih zapisov: dvotočkovno, implicitno \\(ax+by=c\\), eksplicitno \\(y=kx+n\\) in odsekovno \\(\\tfrac xm+\\tfrac yn=1\\). Vsaka od zadnjih dveh kje odpove, implicitna ne.',
        'One line has several equivalent forms: the two-point form, the implicit \\(ax+by=c\\), the explicit \\(y=kx+n\\) and the intercept form \\(\\tfrac xm+\\tfrac yn=1\\). Each of the last two fails somewhere; the implicit form does not.',
    ),
    prerequisites: [text('Linearna funkcija: smerni koeficient in začetna vrednost, ter koordinatni sistem.', 'The linear function: slope and initial value, and the coordinate plane.')],
    learningGoals: [
        text('Iz dveh točk zapišeš implicitno obliko premice in jo okrajšaš do enolične oblike.', 'Write the implicit form of a line from two points and reduce it to a unique form.'),
        text('Preveriš, da so implicitna, eksplicitna in odsekovna oblika enakovredne, in poveš, kdaj katera odpove.', 'Check that the implicit, explicit and intercept forms are equivalent and say when each fails.'),
        text('Utemeljiš, zakaj navpična premica nima eksplicitne oblike.', 'Explain why a vertical line has no explicit form.'),
    ],
    formulaBlocks: l1Formulas,
    workedExamples: l1Examples,
    steps: l1Steps,
    sources,
    edgeCases: [
        text('Če točki \\(P\\) in \\(Q\\) sovpadata, premice ni in graf to sporoči; nobena oblika ni izpisana.', 'If the points \\(P\\) and \\(Q\\) coincide there is no line and the graph says so; no form is written.'),
        text('Navpična premica: eksplicitne in dvotočkovne oblike ni; implicitna oblika velja.', 'A vertical line: there is no explicit or two-point form; the implicit form holds.'),
        text('Premica skozi izhodišče ali vzporedna z osjo: odsekovne oblike ni.', 'A line through the origin or parallel to an axis: there is no intercept form.'),
    ],
    unresolvedQuestions: [],
};

const l2: GuidedLesson = {
    demonstrationId: 'line-geometry',
    title: text('Normalni vektor, vzporednost in pravokotnost', 'Normal vector, parallel and perpendicular'),
    summary: text(
        'Koeficienta \\((a,b)\\) premice \\(ax+by=c\\) sta normalni vektor. Premici sta vzporedni, kadar je \\(a_1b_2-a_2b_1=0\\), in pravokotni, kadar je \\(a_1a_2+b_1b_2=0\\); obe odločitvi sta natančni.',
        'The coefficients \\((a,b)\\) of the line \\(ax+by=c\\) are a normal vector. Two lines are parallel when \\(a_1b_2-a_2b_1=0\\) and perpendicular when \\(a_1a_2+b_1b_2=0\\); both decisions are exact.',
    ),
    prerequisites: [text('Lekcija o oblikah enačbe premice in skalarni produkt vektorjev.', 'The lesson on the forms of a line and the dot product of vectors.')],
    learningGoals: [
        text('Prebereš normalni in smerni vektor iz enačbe premice.', 'Read the normal and direction vectors from the equation of a line.'),
        text('Odločiš vzporednost in pravokotnost z \\(a_1b_2-a_2b_1\\) in \\(a_1a_2+b_1b_2\\).', 'Decide parallelism and perpendicularity with \\(a_1b_2-a_2b_1\\) and \\(a_1a_2+b_1b_2\\).'),
        text('Veš, da pravilo \\(k_1k_2=-1\\) ne zajame navpične in vodoravne premice, skalarni produkt pa jo.', 'Know that the rule \\(k_1k_2=-1\\) misses a vertical and a horizontal line while the dot product covers them.'),
    ],
    formulaBlocks: l2Formulas,
    workedExamples: l2Examples,
    steps: l2Steps,
    sources,
    edgeCases: [
        text('Če točki \\(R\\) in \\(S\\) sovpadata, druge premice ni in graf to sporoči.', 'If the points \\(R\\) and \\(S\\) coincide there is no second line and the graph says so.'),
        text('Sovpadajoči premici sta tudi vzporedni; graf ju označi kot sovpadajoči.', 'Coinciding lines are also parallel; the graph reports them as coinciding.'),
        text('Zmnožek smernih koeficientov obstaja le, kadar nobena premica ni navpična.', 'The product of the slopes exists only when neither line is vertical.'),
    ],
    unresolvedQuestions: [],
};

export const lineFormsLesson: GuidedLesson = l1;
export const lineNormalLesson: GuidedLesson = l2;
