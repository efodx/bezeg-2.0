/**
 * Guided lessons of the analytic-lines family, batches A and B (docs/specs/analytic-lines-lessons.md): L1, the forms of a line, L2, the normal vector,
 * parallel and perpendicular, L3, the dot product and the angle between lines, and L4, the distance from a point to a line, all on `line-geometry` (LineGeometryGraph). Each is the lesson of one section of the analytic-lines chapter
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
    readonly mode: 'forms' | 'normal' | 'angle' | 'distance';
    readonly P: LineScenePoint;
    readonly Q: LineScenePoint;
    readonly R?: LineScenePoint;
    readonly S?: LineScenePoint;
    readonly T?: LineScenePoint;
}

/** The actions of a scene: the Demonstration default, then the mode and one `set-points` naming every handle of the spec. */
export const lineSceneActions = (id: string, spec: LineSceneSpec): LessonAction[] => {
    const point = ([x, y]: LineScenePoint) => ({x, y});
    return [
        {kind: 'prepared-scene', sceneId: id, source: 'demonstration-default'},
        {kind: 'lines', operation: 'set-mode', mode: spec.mode},
        {
            kind: 'lines', operation: 'set-points',
            points: {P: point(spec.P), Q: point(spec.Q), ...(spec.R ? {R: point(spec.R)} : {}), ...(spec.S ? {S: point(spec.S)} : {}), ...(spec.T ? {T: point(spec.T)} : {})},
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

// ---- L3 --------------------------------------------------------------------------------------------------------------------------

const l3Formulas: readonly FormulaBlock[] = [
    {
        id: 'dot-and-cross',
        latex: '\\vec u\\cdot\\vec v=u_xv_x+u_yv_y,\\qquad \\vec u\\times\\vec v=u_xv_y-u_yv_x',
        notation: text(
            '\\(\\vec u=\\overrightarrow{PQ}\\) in \\(\\vec v=\\overrightarrow{RS}\\) sta smerna vektorja prve in druge premice.',
            '\\(\\vec u=\\overrightarrow{PQ}\\) and \\(\\vec v=\\overrightarrow{RS}\\) are the direction vectors of the first and the second line.',
        ),
        explanation: text(
            'Definicija: skalarni produkt je \\(\\vec u\\cdot\\vec v=u_xv_x+u_yv_y\\), determinanta obeh vektorjev pa je \\(\\vec u\\times\\vec v=u_xv_y-u_yv_x\\). Za kot \\(\\varphi\\) med vektorjema velja \\(\\vec u\\cdot\\vec v=|\\vec u||\\vec v|\\cos\\varphi\\) in \\(\\vec u\\times\\vec v=|\\vec u||\\vec v|\\sin\\varphi\\).',
            'Definition: the dot product is \\(\\vec u\\cdot\\vec v=u_xv_x+u_yv_y\\), and the expression \\(\\vec u\\times\\vec v=u_xv_y-u_yv_x\\) is the determinant of the two vectors. For the angle \\(\\varphi\\) between the vectors, \\(\\vec u\\cdot\\vec v=|\\vec u||\\vec v|\\cos\\varphi\\) and \\(\\vec u\\times\\vec v=|\\vec u||\\vec v|\\sin\\varphi\\).',
        ),
    },
    {
        id: 'angle-between-lines',
        latex: '\\tan\\theta=\\frac{|\\vec u\\times\\vec v|}{|\\vec u\\cdot\\vec v|},\\qquad \\cos\\theta=\\frac{|\\vec u\\cdot\\vec v|}{|\\vec u||\\vec v|}',
        notation: text(
            '\\(\\theta\\) je kot med premicama, \\(0^\\circ\\le\\theta\\le90^\\circ\\). Formula za \\(\\tan\\theta\\) velja, kadar je \\(\\vec u\\cdot\\vec v\\ne0\\); pri \\(\\vec u\\cdot\\vec v=0\\) sta premici pravokotni, \\(\\theta=90^\\circ\\).',
            '\\(\\theta\\) is the angle between the lines, \\(0^\\circ\\le\\theta\\le90^\\circ\\). The formula for \\(\\tan\\theta\\) holds when \\(\\vec u\\cdot\\vec v\\ne0\\); at \\(\\vec u\\cdot\\vec v=0\\) the lines are perpendicular, \\(\\theta=90^\\circ\\).',
        ),
        explanation: text(
            'Dogovor: kot med premicama je ostri kot, ali pravi kot, zato v formulah nastopata absolutni vrednosti. Argument: iz \\(\\vec u\\cdot\\vec v=|\\vec u||\\vec v|\\cos\\varphi\\) in \\(\\vec u\\times\\vec v=|\\vec u||\\vec v|\\sin\\varphi\\) sledi \\(\\tan\\varphi=\\tfrac{\\vec u\\times\\vec v}{\\vec u\\cdot\\vec v}\\), \\(\\theta\\) pa dobimo iz \\(\\varphi\\) z odstranitvijo predznakov. Graf kot izračuna iz celoštevilskih \\(\\vec u\\cdot\\vec v\\) in \\(\\vec u\\times\\vec v\\).',
            'Convention: the angle between lines is the acute angle, or the right angle, which is why the formulas contain absolute values. Argument: from \\(\\vec u\\cdot\\vec v=|\\vec u||\\vec v|\\cos\\varphi\\) and \\(\\vec u\\times\\vec v=|\\vec u||\\vec v|\\sin\\varphi\\) it follows that \\(\\tan\\varphi=\\tfrac{\\vec u\\times\\vec v}{\\vec u\\cdot\\vec v}\\), and \\(\\theta\\) comes from \\(\\varphi\\) by dropping the signs. The graph computes the angle from the integers \\(\\vec u\\cdot\\vec v\\) and \\(\\vec u\\times\\vec v\\).',
        ),
    },
    {
        id: 'cosine-rule-vectors',
        latex: '|\\vec u-\\vec v|^2=|\\vec u|^2+|\\vec v|^2-2\\,\\vec u\\cdot\\vec v',
        notation: text(
            'Kosinusni izrek za trikotnik s stranicami \\(\\vec u\\), \\(\\vec v\\) in \\(\\vec u-\\vec v\\).',
            'The law of cosines for the triangle with sides \\(\\vec u\\), \\(\\vec v\\) and \\(\\vec u-\\vec v\\).',
        ),
        explanation: text(
            'Izrek: \\(|\\vec u-\\vec v|^2=(\\vec u-\\vec v)\\cdot(\\vec u-\\vec v)=\\vec u\\cdot\\vec u-2\\,\\vec u\\cdot\\vec v+\\vec v\\cdot\\vec v=|\\vec u|^2+|\\vec v|^2-2\\,\\vec u\\cdot\\vec v\\). Ker je \\(\\vec u\\cdot\\vec v=|\\vec u||\\vec v|\\cos\\varphi\\), je to kosinusni izrek \\(c^2=a^2+b^2-2ab\\cos\\varphi\\). Številčni primeri v odčitku so le posamezni primeri tega izreka.',
            'Theorem: \\(|\\vec u-\\vec v|^2=(\\vec u-\\vec v)\\cdot(\\vec u-\\vec v)=\\vec u\\cdot\\vec u-2\\,\\vec u\\cdot\\vec v+\\vec v\\cdot\\vec v=|\\vec u|^2+|\\vec v|^2-2\\,\\vec u\\cdot\\vec v\\). Since \\(\\vec u\\cdot\\vec v=|\\vec u||\\vec v|\\cos\\varphi\\), this is the law of cosines \\(c^2=a^2+b^2-2ab\\cos\\varphi\\). The numbers in the readout are single instances of this theorem.',
        ),
    },
];

const l3Examples: readonly WorkedExample[] = [
    {
        id: 'l3-angle-4-1-and-1-3',
        title: text('Kot med smerema \\((4,1)\\) in \\((1,3)\\)', 'The angle between the directions \\((4,1)\\) and \\((1,3)\\)'),
        calculationLatex: '\\vec u\\cdot\\vec v=4\\cdot1+1\\cdot3=7,\\ \\ \\vec u\\times\\vec v=4\\cdot3-1\\cdot1=11,\\ \\ \\tan\\theta=\\frac{11}{7}',
        resultLatex: '\\theta\\approx57{,}5288^\\circ',
        check: text(
            'Kot je približno \\(57{,}5288^\\circ\\), zaokrožen na štiri decimalke. Preverek s kosinusnim izrekom: \\(\\vec u-\\vec v=(3,-2)\\), \\(|\\vec u-\\vec v|^2=9+4=13\\) in \\(|\\vec u|^2+|\\vec v|^2-2\\,\\vec u\\cdot\\vec v=17+10-14=13\\).',
            'The angle is approximately \\(57.5288^\\circ\\), rounded to four decimals. Check with the law of cosines: \\(\\vec u-\\vec v=(3,-2)\\), \\(|\\vec u-\\vec v|^2=9+4=13\\) and \\(|\\vec u|^2+|\\vec v|^2-2\\,\\vec u\\cdot\\vec v=17+10-14=13\\).',
        ),
    },
];

const l3Steps: readonly GuidedLessonStep[] = [
    step({
        id: 'l3-predict', order: 1,
        title: text('Napoved kota', 'Predicting the angle'),
        purpose: text('Napovedati kot med premicama iz njunih smeri, preden ga odčitamo.', 'Predicting the angle between two lines from their directions before reading it.'),
        explanation: text(
            'Premica \\(\\ell\\) gre skozi \\(P=(-2,1)\\) in \\(Q=(0,2)\\), njen smerni vektor je \\(\\vec u=\\overrightarrow{PQ}=(2,1)\\). Premica \\(m\\) gre skozi \\(R=(0,2)\\) in \\(S=(1,5)\\), njen smerni vektor je \\(\\vec v=\\overrightarrow{RS}=(1,3)\\). Premici se sekata v \\((0,2)\\). Preden prebereš odčitek, napovej kot med premicama: s skico smeri \\((2,1)\\) in \\((1,3)\\) oceni velikost kota in ugotovi, ali je skalarni produkt pozitiven.',
            'The line \\(\\ell\\) passes through \\(P=(-2,1)\\) and \\(Q=(0,2)\\), its direction vector is \\(\\vec u=\\overrightarrow{PQ}=(2,1)\\). The line \\(m\\) passes through \\(R=(0,2)\\) and \\(S=(1,5)\\), its direction vector is \\(\\vec v=\\overrightarrow{RS}=(1,3)\\). The lines meet at \\((0,2)\\). Before reading the readout, predict the angle between the lines: sketch the directions \\((2,1)\\) and \\((1,3)\\), estimate the size of the angle and work out whether the dot product is positive.',
        ),
        formulaIds: ['dot-and-cross', 'angle-between-lines'],
        observationPrompt: text('Zapiši napoved, nato preberi skalarni produkt, determinanto \\(\\vec u\\times\\vec v\\) in kot v odčitku.', 'Write down your prediction, then read the dot product, the expression \\(\\vec u\\times\\vec v\\) and the angle in the readout.'),
        expectedObservations: [text(
            'Skalarni produkt je \\(5\\), determinanta \\(\\vec u\\times\\vec v\\) je \\(5\\), kot med premicama je \\(45^\\circ\\); kosinusni izrek: \\(5=5+10-2\\cdot5\\).',
            'The dot product is \\(5\\), the expression \\(\\vec u\\times\\vec v\\) is \\(5\\), the angle between the lines is \\(45^\\circ\\); the law of cosines: \\(5=5+10-2\\cdot5\\).',
        )],
        scene: scene('l3-predict-scene', {mode: 'angle', P: [-2, 1], Q: [0, 2], R: [0, 2], S: [1, 5]},
            'Smerna vektorja sta \\(\\vec u=(2,1)\\) in \\(\\vec v=(1,3)\\); \\(\\vec u\\cdot\\vec v=5\\), \\(\\vec u\\times\\vec v=5\\), kot med premicama je \\(45^\\circ\\).',
            'The direction vectors are \\(\\vec u=(2,1)\\) and \\(\\vec v=(1,3)\\); \\(\\vec u\\cdot\\vec v=5\\), \\(\\vec u\\times\\vec v=5\\), the angle between the lines is \\(45^\\circ\\).'),
    }),
    step({
        id: 'l3-other-direction', order: 2,
        title: text('Druga smer', 'Another direction'),
        purpose: text('Izračunati kot s skalarnim produktom in determinanto \\(\\vec u\\times\\vec v\\) ter ga preveriti s kosinusnim izrekom.', 'Computing an angle with the dot product and the expression \\(\\vec u\\times\\vec v\\) and checking it with the law of cosines.'),
        explanation: text(
            'Premakni \\(Q\\) v \\((2,2)\\), \\(P=(-2,1)\\) ostane; premakni \\(R\\) v \\((-2,1)\\) in \\(S\\) v \\((-1,4)\\): zdaj je \\(\\vec u=(4,1)\\) in \\(\\vec v=(1,3)\\), obe premici pa gresta skozi \\(P\\). Kot izračunamo iz celoštevilskih vrednosti, ne iz skice. Isti vektorji morajo ustrezati tudi kosinusnemu izreku; to je izrek, številčni preverek pa le primer.',
            'Move \\(Q\\) to \\((2,2)\\), keeping \\(P=(-2,1)\\); move \\(R\\) to \\((-2,1)\\) and \\(S\\) to \\((-1,4)\\): now \\(\\vec u=(4,1)\\) and \\(\\vec v=(1,3)\\), and both lines pass through \\(P\\). We compute the angle from integer values, not from a sketch. The same vectors must also fit the law of cosines; that is a theorem, and the numeric check is only an instance.',
        ),
        formulaIds: ['angle-between-lines', 'cosine-rule-vectors'],
        workedExampleId: 'l3-angle-4-1-and-1-3',
        observationPrompt: text('Primerjaj račun z odčitkom: skalarni produkt, determinanto \\(\\vec u\\times\\vec v\\), kot in vrstico kosinusnega izreka.', 'Compare the calculation with the readout: the dot product, the expression \\(\\vec u\\times\\vec v\\), the angle and the row of the law of cosines.'),
        expectedObservations: [text(
            'Skalarni produkt je \\(7\\), determinanta \\(\\vec u\\times\\vec v\\) je \\(11\\), kot je približno \\(57{,}5288^\\circ\\); kosinusni izrek: \\(13=17+10-2\\cdot7\\).',
            'The dot product is \\(7\\), the expression \\(\\vec u\\times\\vec v\\) is \\(11\\), the angle is approximately \\(57.5288^\\circ\\); the law of cosines: \\(13=17+10-2\\cdot7\\).',
        )],
        scene: scene('l3-other-direction-scene', {mode: 'angle', P: [-2, 1], Q: [2, 2], R: [-2, 1], S: [-1, 4]},
            'Smerna vektorja sta \\(\\vec u=(4,1)\\) in \\(\\vec v=(1,3)\\); \\(\\vec u\\cdot\\vec v=7\\), \\(\\vec u\\times\\vec v=11\\), kot med premicama je približno \\(57{,}5288^\\circ\\).',
            'The direction vectors are \\(\\vec u=(4,1)\\) and \\(\\vec v=(1,3)\\); \\(\\vec u\\cdot\\vec v=7\\), \\(\\vec u\\times\\vec v=11\\), the angle between the lines is approximately \\(57.5288^\\circ\\).'),
    }),
    step({
        id: 'l3-swap', order: 3,
        title: text('Zamenjaj \\(R\\) in \\(S\\)', 'Swap \\(R\\) and \\(S\\)'),
        purpose: text('Napovedati, kaj se zgodi s skalarnim produktom, determinanto in kotom med premicama, ko zamenjamo točki druge premice.', 'Predicting what happens to the dot product, the determinant and the angle between the lines when the points of the second line are swapped.'),
        explanation: text(
            'Vrni \\(P=(-2,1)\\), \\(Q=(0,2)\\), tako da je \\(\\vec u=(2,1)\\), in zamenjaj točki druge premice: \\(R=(1,5)\\), \\(S=(0,2)\\). Premica \\(m\\) je ista kot prej, smerni vektor \\(\\overrightarrow{RS}=(-1,-3)\\) pa kaže v nasprotno smer. Preden prebereš odčitek, napovej, kaj se zgodi s skalarnim produktom, z determinanto \\(\\vec u\\times\\vec v\\) in s kotom med premicama.',
            'Return to \\(P=(-2,1)\\), \\(Q=(0,2)\\), so that \\(\\vec u=(2,1)\\), and swap the points of the second line: \\(R=(1,5)\\), \\(S=(0,2)\\). The line \\(m\\) is the same as before, while the direction vector \\(\\overrightarrow{RS}=(-1,-3)\\) points the opposite way. Before reading the readout, predict what happens to the dot product, to the expression \\(\\vec u\\times\\vec v\\) and to the angle between the lines.',
        ),
        formulaIds: ['dot-and-cross', 'angle-between-lines'],
        observationPrompt: text('Zapiši napoved, nato primerjaj odčitek s prejšnjim.', 'Write down your prediction, then compare the readout with the previous one.'),
        expectedObservations: [text(
            'Skalarni produkt je \\(-5\\) in determinanta \\(\\vec u\\times\\vec v\\) je \\(-5\\). Kot med vektorjema je \\(135^\\circ\\), saj je \\(\\cos\\varphi=\\tfrac{-5}{\\sqrt5\\sqrt{10}}=-\\tfrac1{\\sqrt2}\\); kot med premicama je še vedno \\(45^\\circ\\), ostri kot, ki dopolni \\(135^\\circ\\) do \\(180^\\circ\\); kosinusni izrek: \\(25=5+10-2\\cdot(-5)\\).',
            'The dot product is \\(-5\\) and the expression \\(\\vec u\\times\\vec v\\) is \\(-5\\). The angle between the vectors is \\(135^\\circ\\), since \\(\\cos\\varphi=\\tfrac{-5}{\\sqrt5\\sqrt{10}}=-\\tfrac1{\\sqrt2}\\); the angle between the lines is still \\(45^\\circ\\), the acute angle, the supplement of \\(135^\\circ\\) to \\(180^\\circ\\); the law of cosines: \\(25=5+10-2\\cdot(-5)\\).',
        )],
        scene: scene('l3-swap-scene', {mode: 'angle', P: [-2, 1], Q: [0, 2], R: [1, 5], S: [0, 2]},
            'Smerna vektorja sta \\(\\vec u=(2,1)\\) in \\(\\vec v=(-1,-3)\\); \\(\\vec u\\cdot\\vec v=-5\\), \\(\\vec u\\times\\vec v=-5\\), kot med premicama je \\(45^\\circ\\).',
            'The direction vectors are \\(\\vec u=(2,1)\\) and \\(\\vec v=(-1,-3)\\); \\(\\vec u\\cdot\\vec v=-5\\), \\(\\vec u\\times\\vec v=-5\\), the angle between the lines is \\(45^\\circ\\).'),
    }),
    step({
        id: 'l3-perpendicular', order: 4,
        title: text('Še ena lega druge premice', 'One more position of the second line'),
        purpose: text('Napovedati skalarni produkt, kot med premicama in obliko kosinusnega izreka za novo lego točke \\(S\\).', 'Predicting the dot product, the angle between the lines and the shape of the law of cosines for the new position of the point \\(S\\).'),
        explanation: text(
            'Pusti \\(\\vec u=(2,1)\\) in \\(R=(0,2)\\), točko \\(S\\) pa premakni v \\((-1,4)\\): zdaj je \\(\\vec v=\\overrightarrow{RS}=(-1,2)\\). Preden prebereš odčitek, izračunaj skalarni produkt \\(\\vec u\\cdot\\vec v\\) in napovej kot med premicama ter obliko kosinusnega izreka.',
            'Keep \\(\\vec u=(2,1)\\) and \\(R=(0,2)\\), and move the point \\(S\\) to \\((-1,4)\\): now \\(\\vec v=\\overrightarrow{RS}=(-1,2)\\). Before reading the readout, work out the dot product \\(\\vec u\\cdot\\vec v\\) and predict the angle between the lines and the shape of the law of cosines.',
        ),
        formulaIds: ['angle-between-lines', 'cosine-rule-vectors'],
        observationPrompt: text('Zapiši napoved, nato preberi kot, stanje in vrstico kosinusnega izreka.', 'Write down your prediction, then read the angle, the status and the row of the law of cosines.'),
        expectedObservations: [text(
            'Skalarni produkt je \\(0\\), kot je \\(90^\\circ\\) in stanje pravi, da sta premici pravokotni; kosinusni izrek je \\(10=5+5\\), to je Pitagorov izrek.',
            'The dot product is \\(0\\), the angle is \\(90^\\circ\\) and the status says the lines are perpendicular; the law of cosines is \\(10=5+5\\), the Pythagorean theorem.',
        )],
        scene: scene('l3-perpendicular-scene', {mode: 'angle', P: [-2, 1], Q: [0, 2], R: [0, 2], S: [-1, 4]},
            'Smerna vektorja sta \\(\\vec u=(2,1)\\) in \\(\\vec v=(-1,2)\\); \\(\\vec u\\cdot\\vec v=0\\), \\(\\vec u\\times\\vec v=5\\), kot med premicama je \\(90^\\circ\\).',
            'The direction vectors are \\(\\vec u=(2,1)\\) and \\(\\vec v=(-1,2)\\); \\(\\vec u\\cdot\\vec v=0\\), \\(\\vec u\\times\\vec v=5\\), the angle between the lines is \\(90^\\circ\\).'),
    }),
    step({
        id: 'l3-free', order: 5,
        title: text('Raziskovanje', 'Free exploration'),
        purpose: text('Samostojno poiskati vzporedni in pravokotni premici ter opazovati kosinusni izrek.', 'Finding parallel and perpendicular lines on your own and watching the law of cosines.'),
        explanation: text(
            'Premikaj vse štiri točke sam. Zanima nas, kdaj je determinanta \\(\\vec u\\times\\vec v\\) enak \\(0\\), kdaj je skalarni produkt enak \\(0\\) in kakšen je v teh primerih kot med premicama.',
            'Move all four points yourself. We are interested in when the expression \\(\\vec u\\times\\vec v\\) is \\(0\\), when the dot product is \\(0\\), and what the angle between the lines is in those cases.',
        ),
        formulaIds: ['angle-between-lines'],
        observationPrompt: text('Poišči po eno lego, v kateri je \\(\\vec u\\times\\vec v=0\\), in eno, v kateri je \\(\\vec u\\cdot\\vec v=0\\), ter preberi kot.', 'Find one position where \\(\\vec u\\times\\vec v=0\\) and one where \\(\\vec u\\cdot\\vec v=0\\), and read the angle.'),
        expectedObservations: [text(
            'Kadar je \\(\\vec u\\times\\vec v=0\\), je kot \\(0^\\circ\\) in premici sta vzporedni; kadar je \\(\\vec u\\cdot\\vec v=0\\), je kot \\(90^\\circ\\) in premici sta pravokotni. Kosinusni izrek velja v vsaki legi.',
            'When \\(\\vec u\\times\\vec v=0\\) the angle is \\(0^\\circ\\) and the lines are parallel; when \\(\\vec u\\cdot\\vec v=0\\) the angle is \\(90^\\circ\\) and the lines are perpendicular. The law of cosines holds in every position.',
        )],
        scene: scene('l3-free-scene', {mode: 'angle', P: [-2, 1], Q: [0, 2], R: [0, 2], S: [1, 5]},
            'Začetna lega: \\(\\vec u=(2,1)\\), \\(\\vec v=(1,3)\\), kot med premicama je \\(45^\\circ\\).',
            'Starting position: \\(\\vec u=(2,1)\\), \\(\\vec v=(1,3)\\), the angle between the lines is \\(45^\\circ\\).'),
    }),
];

// ---- L4 --------------------------------------------------------------------------------------------------------------------------

const l4Formulas: readonly FormulaBlock[] = [
    {
        id: 'distance-definition',
        latex: 'd=|FT|',
        notation: text(
            '\\(F\\) je nožišče pravokotnice iz točke \\(T\\) na premico \\(\\ell\\).',
            '\\(F\\) is the foot of the perpendicular from the point \\(T\\) to the line \\(\\ell\\).',
        ),
        explanation: text(
            'Definicija: nožišče pravokotnice je točka \\(F\\) premice \\(\\ell\\), za katero je \\(FT\\perp\\ell\\). Razdalja točke od premice je dolžina daljice \\(FT\\).',
            'Definition: the foot of the perpendicular is the point \\(F\\) of the line \\(\\ell\\) for which \\(FT\\perp\\ell\\). The distance from a point to a line is the length of the segment \\(FT\\).',
        ),
    },
    {
        id: 'distance-formula',
        latex: 'd=\\frac{|ax_T+by_T-c|}{\\sqrt{a^2+b^2}}=\\frac{|\\overrightarrow{PT}\\cdot\\vec n|}{|\\vec n|}',
        notation: text(
            '\\(ax+by=c\\) je premica \\(\\ell\\), \\(\\vec n=(a,b)\\) njen normalni vektor, \\(P\\) poljubna točka premice, \\(T=(x_T,y_T)\\) dana točka; odčitek izraz \\(ax_T+by_T-c\\) imenuje vrednost v točki \\(T\\).',
            '\\(ax+by=c\\) is the line \\(\\ell\\), \\(\\vec n=(a,b)\\) its normal vector, \\(P\\) any point of the line, \\(T=(x_T,y_T)\\) the given point; the readout calls the expression \\(ax_T+by_T-c\\) the value at \\(T\\).',
        ),
        explanation: text(
            'Argument: ker \\(P\\) leži na \\(\\ell\\), je \\(ax_P+by_P=c\\), zato je \\(\\overrightarrow{PT}\\cdot\\vec n=a(x_T-x_P)+b(y_T-y_P)=ax_T+by_T-c\\). Vektor \\(\\overrightarrow{PT}\\) je vsota \\(\\overrightarrow{PF}+\\overrightarrow{FT}\\); \\(\\overrightarrow{PF}\\) leži vzdolž \\(\\ell\\), zato je \\(\\overrightarrow{PF}\\cdot\\vec n=0\\) in \\(\\overrightarrow{PT}\\cdot\\vec n=\\overrightarrow{FT}\\cdot\\vec n\\). Vektor \\(\\overrightarrow{FT}\\) je vzporeden z \\(\\vec n\\), zato je \\(|\\overrightarrow{FT}\\cdot\\vec n|=|FT||\\vec n|\\). Dolžina pravokotne projekcije \\(\\overrightarrow{PT}\\) na normalo je torej \\(d=\\tfrac{|\\overrightarrow{PT}\\cdot\\vec n|}{|\\vec n|}\\), kar je formula iz formul za maturo.',
            'Argument: since \\(P\\) lies on \\(\\ell\\), \\(ax_P+by_P=c\\), so \\(\\overrightarrow{PT}\\cdot\\vec n=a(x_T-x_P)+b(y_T-y_P)=ax_T+by_T-c\\). The vector \\(\\overrightarrow{PT}\\) is the sum \\(\\overrightarrow{PF}+\\overrightarrow{FT}\\); \\(\\overrightarrow{PF}\\) lies along \\(\\ell\\), so \\(\\overrightarrow{PF}\\cdot\\vec n=0\\) and \\(\\overrightarrow{PT}\\cdot\\vec n=\\overrightarrow{FT}\\cdot\\vec n\\). The vector \\(\\overrightarrow{FT}\\) is parallel to \\(\\vec n\\), so \\(|\\overrightarrow{FT}\\cdot\\vec n|=|FT||\\vec n|\\). The length of the orthogonal projection of \\(\\overrightarrow{PT}\\) on the normal is therefore \\(d=\\tfrac{|\\overrightarrow{PT}\\cdot\\vec n|}{|\\vec n|}\\), the formula of the formula sheet.',
        ),
    },
];

const l4Examples: readonly WorkedExample[] = [
    {
        id: 'l4-distance-of-t',
        title: text('Razdalja točke \\(T=(3,-2)\\) od premice \\(x-2y=-4\\)', 'The distance of the point \\(T=(3,-2)\\) from the line \\(x-2y=-4\\)'),
        calculationLatex: '\\overrightarrow{PT}=(5,-3),\\ \\ \\vec n=(1,-2),\\ \\ \\overrightarrow{PT}\\cdot\\vec n=5+6=11,\\ \\ |\\vec n|=\\sqrt5',
        resultLatex: 'd=\\frac{11}{\\sqrt5}=\\sqrt{\\frac{121}{5}}\\approx4{,}9193',
        check: text(
            'Vektor \\(\\overrightarrow{PT}\\) od \\(P=(-2,1)\\) do \\(T=(3,-2)\\) je \\((5,-3)\\). Preverek: \\(3-2\\cdot(-2)-(-4)=11\\) je isto število kot \\(\\overrightarrow{PT}\\cdot\\vec n\\). Razdalja je \\(\\tfrac{11}{\\sqrt5}\\), kar je približno \\(4{,}9193\\); natančno je \\(d^2=\\tfrac{121}{5}\\). Projekcija \\(\\overrightarrow{PT}\\) na normalo je \\(\\tfrac{11}{5}\\vec n=(\\tfrac{11}{5},-\\tfrac{22}{5})\\) in nožišče je \\(F=T-\\tfrac{11}{5}\\vec n=(\\tfrac45,\\tfrac{12}{5})\\).',
            'The vector \\(\\overrightarrow{PT}\\) from \\(P=(-2,1)\\) to \\(T=(3,-2)\\) is \\((5,-3)\\). Check: \\(3-2\\cdot(-2)-(-4)=11\\) is the same number as \\(\\overrightarrow{PT}\\cdot\\vec n\\). The distance is \\(\\tfrac{11}{\\sqrt5}\\), approximately \\(4.9193\\); exactly, \\(d^2=\\tfrac{121}{5}\\). The projection of \\(\\overrightarrow{PT}\\) on the normal is \\(\\tfrac{11}{5}\\vec n=(\\tfrac{11}{5},-\\tfrac{22}{5})\\) and the foot is \\(F=T-\\tfrac{11}{5}\\vec n=(\\tfrac45,\\tfrac{12}{5})\\).',
        ),
    },
];

const l4Steps: readonly GuidedLessonStep[] = [
    step({
        id: 'l4-predict', order: 1,
        title: text('Napoved nožišča', 'Predicting the foot'),
        purpose: text('Napovedati, kje na premici je nožišče pravokotnice, preden ga odčitamo.', 'Predicting where on the line the foot of the perpendicular lies before reading it.'),
        explanation: text(
            'Premica \\(\\ell\\) gre skozi \\(P=(-2,1)\\) in \\(Q=(4,4)\\), to je \\(x-2y=-4\\), točka je \\(T=(3,-2)\\). Preden prebereš odčitek, ugotovi, kje na \\(\\ell\\) leži nožišče \\(F\\), in kakšen kot naredi daljica \\(FT\\) s premico \\(\\ell\\).',
            'The line \\(\\ell\\) passes through \\(P=(-2,1)\\) and \\(Q=(4,4)\\), that is \\(x-2y=-4\\), the point is \\(T=(3,-2)\\). Before reading the readout, work out where on \\(\\ell\\) the foot \\(F\\) lies and what angle the segment \\(FT\\) makes with the line \\(\\ell\\).',
        ),
        formulaIds: ['distance-definition'],
        observationPrompt: text('Zapiši napoved, nato preberi nožišče in razdaljo v odčitku in poglej pravi kot na grafu.', 'Write down your prediction, then read the foot and the distance in the readout and look at the right angle on the graph.'),
        expectedObservations: [text(
            'Nožišče je \\(F=(\\tfrac45,\\tfrac{12}{5})\\), daljica \\(FT\\) je pravokotna na \\(\\ell\\); \\(d^2=\\tfrac{121}{5}\\), \\(d\\approx4{,}9193\\).',
            'The foot is \\(F=(\\tfrac45,\\tfrac{12}{5})\\), the segment \\(FT\\) is perpendicular to \\(\\ell\\); \\(d^2=\\tfrac{121}{5}\\), \\(d\\approx4.9193\\).',
        )],
        scene: scene('l4-predict-scene', {mode: 'distance', P: [-2, 1], Q: [4, 4], T: [3, -2]},
            'Premica je \\(x-2y=-4\\), točka je \\(T=(3,-2)\\); nožišče je \\(F=(\\tfrac45,\\tfrac{12}{5})\\), \\(d^2=\\tfrac{121}{5}\\), \\(d\\approx4{,}9193\\).',
            'The line is \\(x-2y=-4\\), the point is \\(T=(3,-2)\\); the foot is \\(F=(\\tfrac45,\\tfrac{12}{5})\\), \\(d^2=\\tfrac{121}{5}\\), \\(d\\approx4.9193\\).'),
    }),
    step({
        id: 'l4-other-side', order: 2,
        title: text('Točka na drugi strani', 'A point on the other side'),
        purpose: text('Napovedati predznak vrednosti v točki \\(T\\) in obnašanje razdalje, ko točka preide na drugo stran premice.', 'Predicting the sign of the value at \\(T\\) and the behaviour of the distance when the point crosses to the other side of the line.'),
        explanation: text(
            'Premakni \\(T\\) v \\((-3,4)\\), na drugo stran premice \\(\\ell: x-2y=-4\\); \\(P\\) in \\(Q\\) ostaneta. Vrednost v točki \\(T\\) je izraz \\(ax_T+by_T-c\\). Preden prebereš odčitek, napovej predznak te vrednosti in ali se pravi kot pri nožišču ohrani.',
            'Move \\(T\\) to \\((-3,4)\\), to the other side of the line \\(\\ell: x-2y=-4\\); \\(P\\) and \\(Q\\) stay. The value at \\(T\\) is the expression \\(ax_T+by_T-c\\). Before reading the readout, predict the sign of that value and whether the right angle at the foot is kept.',
        ),
        formulaIds: ['distance-definition', 'distance-formula'],
        observationPrompt: text('Zapiši napoved, nato preberi vrednost, razdaljo in nožišče.', 'Write down your prediction, then read the value, the distance and the foot.'),
        expectedObservations: [text(
            'Vrednost je \\(-7\\), \\(d^2=\\tfrac{49}{5}\\), \\(d\\approx3{,}1305\\), nožišče je \\(F=(-\\tfrac85,\\tfrac65)\\); pravi kot pri \\(F\\) ostane, razdalja pa je pozitivna.',
            'The value is \\(-7\\), \\(d^2=\\tfrac{49}{5}\\), \\(d\\approx3.1305\\), the foot is \\(F=(-\\tfrac85,\\tfrac65)\\); the right angle at \\(F\\) stays, and the distance is positive.',
        )],
        scene: scene('l4-other-side-scene', {mode: 'distance', P: [-2, 1], Q: [4, 4], T: [-3, 4]},
            'Točka je \\(T=(-3,4)\\); vrednost je \\(-7\\), \\(d^2=\\tfrac{49}{5}\\), \\(d\\approx3{,}1305\\), nožišče je \\(F=(-\\tfrac85,\\tfrac65)\\).',
            'The point is \\(T=(-3,4)\\); the value is \\(-7\\), \\(d^2=\\tfrac{49}{5}\\), \\(d\\approx3.1305\\), the foot is \\(F=(-\\tfrac85,\\tfrac65)\\).'),
    }),
    step({
        id: 'l4-projection', order: 3,
        title: text('Razdalja kot projekcija', 'The distance as a projection'),
        purpose: text('Videti, da je razdalja dolžina pravokotne projekcije vektorja \\(\\overrightarrow{PT}\\) na normalo.', 'Seeing that the distance is the length of the orthogonal projection of \\(\\overrightarrow{PT}\\) on the normal.'),
        explanation: text(
            'Vrni \\(T=(3,-2)\\). Vektor \\(\\overrightarrow{PT}\\) vodi od točke \\(P\\) premice do \\(T\\). Njegova pravokotna projekcija na normalo \\(\\vec n=(1,-2)\\) je vektor, ki gre od nožišča \\(F\\) do \\(T\\). Dolžino te projekcije izračunamo kot \\(\\tfrac{|\\overrightarrow{PT}\\cdot\\vec n|}{|\\vec n|}\\); primer je v računu spodaj.',
            'Return to \\(T=(3,-2)\\). The vector \\(\\overrightarrow{PT}\\) leads from the point \\(P\\) of the line to \\(T\\). Its orthogonal projection on the normal \\(\\vec n=(1,-2)\\) is the vector that goes from the foot \\(F\\) to \\(T\\). We compute the length of this projection as \\(\\tfrac{|\\overrightarrow{PT}\\cdot\\vec n|}{|\\vec n|}\\); the example is in the calculation below.',
        ),
        formulaIds: ['distance-formula'],
        workedExampleId: 'l4-distance-of-t',
        observationPrompt: text('Preberi vrstice za vektor \\(PT\\), \\(PT\\cdot n\\) in projekcijo ter primerjaj z računom.', 'Read the rows for the vector \\(PT\\), \\(PT\\cdot n\\) and the projection, and compare them with the calculation.'),
        expectedObservations: [text(
            'Vektor \\(PT\\) je \\((5,-3)\\), \\(PT\\cdot n=11\\), projekcija je \\((\\tfrac{11}{5},-\\tfrac{22}{5})\\) in je vektor od \\(F\\) do \\(T\\).',
            'The vector \\(PT\\) is \\((5,-3)\\), \\(PT\\cdot n=11\\), the projection is \\((\\tfrac{11}{5},-\\tfrac{22}{5})\\) and is the vector from \\(F\\) to \\(T\\).',
        )],
        scene: scene('l4-projection-scene', {mode: 'distance', P: [-2, 1], Q: [4, 4], T: [3, -2]},
            'Vektor \\(PT\\) je \\((5,-3)\\), \\(PT\\cdot n=11\\), projekcija je \\((\\tfrac{11}{5},-\\tfrac{22}{5})\\), \\(d^2=\\tfrac{121}{5}\\).',
            'The vector \\(PT\\) is \\((5,-3)\\), \\(PT\\cdot n=11\\), the projection is \\((\\tfrac{11}{5},-\\tfrac{22}{5})\\), \\(d^2=\\tfrac{121}{5}\\).'),
    }),
    step({
        id: 'l4-on-line', order: 4,
        title: text('Točka na premici', 'A point on the line'),
        purpose: text('Napovedati vrednost v točki \\(T\\) in razdaljo za novo lego točke \\(T\\).', 'Predicting the value at \\(T\\) and the distance for the new position of the point \\(T\\).'),
        explanation: text(
            'Premakni \\(T\\) v \\((2,3)\\); \\(P\\) in \\(Q\\) ostaneta, premica je \\(\\ell: x-2y=-4\\). Preden prebereš odčitek, ugotovi, ali \\(T\\) leži na \\(\\ell\\), in napovej vrednost \\(ax_T+by_T-c\\) ter razdaljo. Odčitek razdalje je zaokrožen; natančno odločitev daje vrednost \\(ax_T+by_T-c\\) (in z njo \\(d^2\\)).',
            'Move \\(T\\) to \\((2,3)\\); \\(P\\) and \\(Q\\) stay, the line is \\(\\ell: x-2y=-4\\). Before reading the readout, decide whether \\(T\\) lies on \\(\\ell\\) and predict the value \\(ax_T+by_T-c\\) and the distance. The distance readout is rounded; the exact decision is the value \\(ax_T+by_T-c\\) (and with it \\(d^2\\)).',
        ),
        formulaIds: ['distance-definition', 'distance-formula'],
        observationPrompt: text('Zapiši napoved, nato preberi vrednost, razdaljo in stanje; poišči še eno mrežno točko na \\(\\ell\\).', 'Write down your prediction, then read the value, the distance and the status; find one more grid point on \\(\\ell\\).'),
        expectedObservations: [text(
            'Vrednost je \\(0\\), zato je razdalja natanko \\(0\\) (zaokroženi odčitek pokaže »≈ 0«), in stanje pravi, da točka leži na premici.',
            'The value is \\(0\\), so the distance is exactly \\(0\\) (the rounded readout shows "≈ 0"), and the status says the point lies on the line.',
        )],
        scene: scene('l4-on-line-scene', {mode: 'distance', P: [-2, 1], Q: [4, 4], T: [2, 3]},
            'Točka je \\(T=(2,3)\\); vrednost je \\(0\\), razdalja je \\(0\\).',
            'The point is \\(T=(2,3)\\); the value is \\(0\\), the distance is \\(0\\).'),
    }),
    step({
        id: 'l4-free', order: 5,
        title: text('Raziskovanje', 'Free exploration'),
        purpose: text('Samostojno premikati premico in točko ter opazovati razdaljo.', 'Moving the line and the point on your own and watching the distance.'),
        explanation: text(
            'Premikaj \\(P\\), \\(Q\\) in \\(T\\) sam. Poseben primer je vodoravna premica, pri kateri imata \\(P\\) in \\(Q\\) enako ordinato: poskusi napovedati razdaljo, preden jo prebereš.',
            'Move \\(P\\), \\(Q\\) and \\(T\\) yourself. A special case is a horizontal line, where \\(P\\) and \\(Q\\) have the same ordinate: try to predict the distance before you read it.',
        ),
        formulaIds: ['distance-formula'],
        observationPrompt: text('Postavi \\(P\\) in \\(Q\\) na isto ordinato in primerjaj \\(d\\) z razliko ordinat točke \\(T\\) in premice.', 'Put \\(P\\) and \\(Q\\) at the same ordinate and compare \\(d\\) with the difference between the ordinates of \\(T\\) and the line.'),
        expectedObservations: [text(
            'Pri vodoravni premici \\(y=y_0\\) je \\(d=|y_T-y_0|\\); na primer za \\(P=(-2,1)\\), \\(Q=(4,1)\\), \\(T=(3,4)\\) je \\(d^2=9\\) in \\(d=3\\).',
            'For a horizontal line \\(y=y_0\\), \\(d=|y_T-y_0|\\); for example for \\(P=(-2,1)\\), \\(Q=(4,1)\\), \\(T=(3,4)\\), \\(d^2=9\\) and \\(d=3\\).',
        )],
        scene: scene('l4-free-scene', {mode: 'distance', P: [-2, 1], Q: [4, 4], T: [3, -2]},
            'Začetna lega: \\(\\ell: x-2y=-4\\), \\(T=(3,-2)\\), \\(d^2=\\tfrac{121}{5}\\).',
            'Starting position: \\(\\ell: x-2y=-4\\), \\(T=(3,-2)\\), \\(d^2=\\tfrac{121}{5}\\).'),
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

const implementationSource: GuidedLesson['sources'][number] = {
    id: 'bezeg-line-geometry-implementation',
    citation: 'Bezeg source: src/compgeo/lineForms.ts, src/graphs/lines/lineGeometryModel.ts and src/graphs/lines/LineGeometryGraph.tsx.',
    implementationCorrespondence: 'A scene sets the graph\'s mode and its integer handle fields; the text quotes only values of those scenes or plain arithmetic (labelled calculation), and the angle and the distance are computed from exact integer or rational values of the line kernel.',
};

const l3: GuidedLesson = {
    demonstrationId: 'line-geometry',
    title: text('Skalarni produkt in kot med premicama', 'Dot product and the angle between lines'),
    summary: text(
        'Skalarni produkt smernih vektorjev \\(\\vec u\\cdot\\vec v\\) in determinanto \\(\\vec u\\times\\vec v\\) določata kot med premicama; kosinusni izrek \\(|\\vec u-\\vec v|^2=|\\vec u|^2+|\\vec v|^2-2\\,\\vec u\\cdot\\vec v\\) je isto dejstvo. Kot med premicama je po dogovoru ostri kot.',
        'The dot product of the direction vectors \\(\\vec u\\cdot\\vec v\\) and the expression \\(\\vec u\\times\\vec v\\) determine the angle between lines; the law of cosines \\(|\\vec u-\\vec v|^2=|\\vec u|^2+|\\vec v|^2-2\\,\\vec u\\cdot\\vec v\\) is the same fact. By convention the angle between lines is the acute one.',
    ),
    prerequisites: [text('Lekcija o normalnem vektorju, vzporednosti in pravokotnosti ter skalarni produkt vektorjev.', 'The lesson on the normal vector, parallel and perpendicular lines, and the dot product of vectors.')],
    learningGoals: [
        text('Iz smernih vektorjev izračunaš skalarni produkt, determinanto \\(\\vec u\\times\\vec v\\) in kot med premicama.', 'Compute the dot product, the expression \\(\\vec u\\times\\vec v\\) and the angle between lines from the direction vectors.'),
        text('Veš, da obrnjen smerni vektor ne spremeni kota med premicama, ker je kot po dogovoru ostri.', 'Know that a reversed direction vector does not change the angle between the lines, because the angle is the acute one by convention.'),
        text('Izpelješ kosinusni izrek za vektorje in ga preveriš na primeru.', 'Derive the law of cosines for vectors and check it on an example.'),
    ],
    formulaBlocks: l3Formulas,
    workedExamples: l3Examples,
    steps: l3Steps,
    sources: [
        {
            id: 'matura-catalogue-kot-med-premicama',
            citation: 'Predmetni izpitni katalog za splošno maturo, matematika (M-MAT-2026), poglavje 4.10.1 Enačbe premice v ravnini (kot med premicama) in poglavje 4.8 Vektorji (skalarni produkt). Cited from the text extraction of the catalogue.',
            implementationCorrespondence: 'The lesson follows the topic list: the angle between lines from the dot product of direction vectors, taken as the acute angle by convention.',
        },
        implementationSource,
    ],
    edgeCases: [
        text('Če točki \\(P\\) in \\(Q\\) ali \\(R\\) in \\(S\\) sovpadata, premice ni in graf to sporoči.', 'If the points \\(P\\) and \\(Q\\), or \\(R\\) and \\(S\\), coincide there is no line and the graph says so.'),
        text('Vzporedni premici: determinanta \\(\\vec u\\times\\vec v\\) je \\(0\\), kot je \\(0^\\circ\\) in loka ni.', 'Parallel lines: the expression \\(\\vec u\\times\\vec v\\) is \\(0\\), the angle is \\(0^\\circ\\) and there is no arc.'),
        text('Če se premici sekata zunaj prikaza, loka ni, odčitek kota pa velja.', 'If the lines meet outside the view there is no arc, while the angle readout stays valid.'),
    ],
    unresolvedQuestions: [],
};

const l4: GuidedLesson = {
    demonstrationId: 'line-geometry',
    title: text('Razdalja točke od premice', 'Distance from a point to a line'),
    summary: text(
        'Razdalja točke \\(T\\) od premice \\(ax+by=c\\) je dolžina pravokotne projekcije vektorja \\(\\overrightarrow{PT}\\) na normalo, \\(d=\\tfrac{|ax_T+by_T-c|}{\\sqrt{a^2+b^2}}\\), in je dolžina daljice od nožišča pravokotnice \\(F\\) do \\(T\\).',
        'The distance of a point \\(T\\) from the line \\(ax+by=c\\) is the length of the orthogonal projection of \\(\\overrightarrow{PT}\\) on the normal, \\(d=\\tfrac{|ax_T+by_T-c|}{\\sqrt{a^2+b^2}}\\), and the length of the segment from the foot of the perpendicular \\(F\\) to \\(T\\).',
    ),
    prerequisites: [text('Lekcija o normalnem vektorju in skalarni produkt vektorjev.', 'The lesson on the normal vector and the dot product of vectors.')],
    learningGoals: [
        text('Razložiš, da je razdalja točke od premice dolžina projekcije vektorja \\(\\overrightarrow{PT}\\) na normalo.', 'Explain that the distance from a point to a line is the length of the projection of \\(\\overrightarrow{PT}\\) on the normal.'),
        text('Izračunaš razdaljo in nožišče pravokotnice za dano premico in točko.', 'Compute the distance and the foot of the perpendicular for a given line and point.'),
        text('Veš, da je razdalja točke na premici enaka \\(0\\), vrednost izraza \\(ax_T+by_T-c\\) pa ima lahko obe predznaka.', 'Know that the distance of a point on the line is \\(0\\), while the value of \\(ax_T+by_T-c\\) can have either sign.'),
    ],
    formulaBlocks: l4Formulas,
    workedExamples: l4Examples,
    steps: l4Steps,
    sources: [
        {
            id: 'matura-formula-sheet-distance',
            citation: 'Formule za splošno maturo iz matematike (M-MAT-2026), stran 40: razdalja točke od premice. Cited from the text extraction of the formula sheet.',
            implementationCorrespondence: 'The lesson derives the formula of the formula sheet as the length of the orthogonal projection of the vector from P to T on the normal vector and shows the foot of the perpendicular.',
        },
        implementationSource,
    ],
    edgeCases: [
        text('Če točki \\(P\\) in \\(Q\\) sovpadata, premice ni in graf to sporoči.', 'If the points \\(P\\) and \\(Q\\) coincide there is no line and the graph says so.'),
        text('Če točka \\(T\\) leži na premici, je razdalja \\(0\\) in pravega kota ni.', 'If the point \\(T\\) lies on the line, the distance is \\(0\\) and there is no right angle.'),
        text('Nožišče zunaj prikaza ni narisano, njegove koordinate pa so v odčitku.', 'A foot outside the view is not drawn, while its coordinates stay in the readout.'),
    ],
    unresolvedQuestions: [],
};

export const lineFormsLesson: GuidedLesson = l1;
export const lineNormalLesson: GuidedLesson = l2;
export const lineAngleLesson: GuidedLesson = l3;
export const lineDistanceLesson: GuidedLesson = l4;
