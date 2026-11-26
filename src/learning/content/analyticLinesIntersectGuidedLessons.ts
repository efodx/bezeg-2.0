/**
 * Guided lesson of the analytic-lines family, batch C (docs/specs/analytic-lines-lessons.md): L5, intersections of two lines and of a line and a circle, on
 * `line-geometry` (LineGeometryGraph) in its intersect mode. Scenes use only the `lines` actions the graph registers (`set-mode`, `set-target`,
 * `set-points`); every scene starts from the Demonstration default and names the mode, the target and every handle it states, the hidden ones too
 * (the circle handles O and B are written while the target is still the second line, as the target select keeps the handles). Each predicting step opens on
 * a state that is not the answer: the learner predicts the effect of a change, then makes it with the fields the prose names.
 */
import type {LessonAction} from '../model';
import {frameDeclarer, type FrameDeclaration} from '../../graphs/base/declare/graphDeclaration';
import type {LineGeometryIds} from '../../graphs/lines/LineGeometryGraph';
import type {FormulaBlock, GuidedLesson, GuidedLessonFrame, GuidedLessonStep, LessonScene, LocalizedText, WorkedExample} from './guidedLessons';

const text = (sl: string, en: string): LocalizedText => ({sl, en});
const frame = (id: string, kind: GuidedLessonFrame['kind'], declare?: FrameDeclaration): GuidedLessonFrame => ({id, kind, ...(declare ? {declare} : {})});
const f = frameDeclarer<LineGeometryIds>();

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
    /** What the observation frame highlights or opens (task 08). */
    readonly declare?: FrameDeclaration;
}

const step = ({declare, ...content}: StepContent): GuidedLessonStep => ({
    ...content,
    frames: [
        frame(`${content.id}-explanation`, 'explanation'),
        ...(content.workedExampleId ? [frame(`${content.id}-calculation`, 'calculation')] : []),
        frame(`${content.id}-observation`, 'observation', declare),
    ],
});

/** A handle position on the integer grid [-8, 8]. */
export type LineIntersectPoint = readonly [x: number, y: number];

/** What an intersect scene sets: the target and all six handles (P, Q the first line, R, S the second line, O, B the circle). */
export interface LineIntersectSceneSpec {
    readonly target: 'lines' | 'circle';
    readonly P: LineIntersectPoint;
    readonly Q: LineIntersectPoint;
    readonly R: LineIntersectPoint;
    readonly S: LineIntersectPoint;
    readonly O: LineIntersectPoint;
    readonly B: LineIntersectPoint;
}

/** The actions of a scene: the Demonstration default, `set-mode` intersect, `set-target`, then one `set-points` naming all six handles. */
export const lineIntersectSceneActions = (id: string, spec: LineIntersectSceneSpec): LessonAction[] => {
    const point = ([x, y]: LineIntersectPoint) => ({x, y});
    return [
        {kind: 'prepared-scene', sceneId: id, source: 'demonstration-default'},
        {kind: 'lines', operation: 'set-mode', mode: 'intersect'},
        {kind: 'lines', operation: 'set-target', target: spec.target},
        {
            kind: 'lines', operation: 'set-points',
            points: {P: point(spec.P), Q: point(spec.Q), R: point(spec.R), S: point(spec.S), O: point(spec.O), B: point(spec.B)},
        },
    ];
};

const scene = (id: string, spec: LineIntersectSceneSpec, sl: string, en: string): LessonScene =>
    ({id, basedOn: 'demonstration-default', actions: lineIntersectSceneActions(id, spec), expectedState: text(sl, en)});

// Openings of the steps (the states the scenes build) and the states the learner makes from them.
/** Step 1 opening: l is x - 2y = -4, m is x - y = 0, meeting at (4, 4); the learner makes R = (2, 0), S = (0, 4) (L5_MEETING_MADE). */
export const L5_MEETING_SCENE: LineIntersectSceneSpec = {target: 'lines', P: [-4, 0], Q: [0, 2], R: [0, 0], S: [2, 2], O: [1, 0], B: [3, 2]};
export const L5_MEETING_MADE: LineIntersectSceneSpec = {...L5_MEETING_SCENE, R: [2, 0], S: [0, 4]};
/** Step 2 opening: m is 2x + y = 4; the learner makes S = (0, -1) (parallel, L5_PARALLEL_MADE), then R = (-4, 0), S = (-6, -1) (the same line, L5_SAME_MADE). */
export const L5_PARALLEL_SCENE: LineIntersectSceneSpec = L5_MEETING_MADE;
export const L5_PARALLEL_MADE: LineIntersectSceneSpec = {...L5_PARALLEL_SCENE, S: [0, -1]};
export const L5_SAME_MADE: LineIntersectSceneSpec = {...L5_PARALLEL_SCENE, R: [-4, 0], S: [-6, -1]};
/** Step 3 opening: target lines (circle O = (1, 0), B = (3, 2) written but hidden); the learner chooses the target circle (L5_CIRCLE_MADE). */
export const L5_CIRCLE_SCENE: LineIntersectSceneSpec = L5_MEETING_MADE;
export const L5_CIRCLE_MADE: LineIntersectSceneSpec = {...L5_CIRCLE_SCENE, target: 'circle'};
/** Step 4 opening: target circle, B = (3, 2); the learner makes B = (3, 1) (tangent, L5_TANGENT_MADE), then B = (3, 0) (no common point, L5_NONE_MADE). */
export const L5_TANGENT_SCENE: LineIntersectSceneSpec = L5_CIRCLE_MADE;
export const L5_TANGENT_MADE: LineIntersectSceneSpec = {...L5_TANGENT_SCENE, B: [3, 1]};
export const L5_NONE_MADE: LineIntersectSceneSpec = {...L5_TANGENT_SCENE, B: [3, 0]};
/** Step 5, free exploration, opening: the Demonstration default handles on the intersect mode, target the second line. */
export const L5_FREE_SCENE: LineIntersectSceneSpec = {target: 'lines', P: [-2, 1], Q: [4, 4], R: [3, -2], S: [2, 0], O: [1, 0], B: [3, 1]};
/** The suggestion of the free step: target circle, P = (-2, 3), Q = (2, 3) (y = 3), B = (4, 0). */
export const L5_FREE_MADE: LineIntersectSceneSpec = {...L5_FREE_SCENE, target: 'circle', P: [-2, 3], Q: [2, 3], B: [4, 0]};

// ---- L5 --------------------------------------------------------------------------------------------------------------------------

const l5Formulas: readonly FormulaBlock[] = [
    {
        id: 'lines-meet',
        latex: 'x=\\frac{c_1b_2-c_2b_1}{D},\\ \\ y=\\frac{a_1c_2-a_2c_1}{D},\\ \\ D=a_1b_2-a_2b_1\\ne0',
        notation: text(
            '\\(a_1x+b_1y=c_1\\) je prva premica \\(\\ell\\), \\(a_2x+b_2y=c_2\\) druga premica \\(m\\); \\(D\\) je izraz \\(a_1b_2-a_2b_1\\) iz lekcije o normalnem vektorju.',
            '\\(a_1x+b_1y=c_1\\) is the first line \\(\\ell\\), \\(a_2x+b_2y=c_2\\) the second line \\(m\\); \\(D\\) is the expression \\(a_1b_2-a_2b_1\\) from the lesson on the normal vector.',
        ),
        explanation: text(
            'Argument: prvo enačbo pomnožimo z \\(b_2\\), drugo z \\(b_1\\) in odštejemo; \\(y\\) izpade in ostane \\((a_1b_2-a_2b_1)x=c_1b_2-c_2b_1\\). Podobno izločimo \\(x\\): \\((a_1b_2-a_2b_1)y=a_1c_2-a_2c_1\\). Če je \\(D\\ne0\\), je rešitev ena sama, torej se premici sekata v natanko eni točki. Koordinati sta ulomka s skupnim imenovalcem \\(D\\), zato je presečišče celoštevilskih premic racionalna točka.',
            'Argument: multiply the first equation by \\(b_2\\), the second by \\(b_1\\) and subtract; \\(y\\) drops out and \\((a_1b_2-a_2b_1)x=c_1b_2-c_2b_1\\) remains. Likewise eliminating \\(x\\) gives \\((a_1b_2-a_2b_1)y=a_1c_2-a_2c_1\\). If \\(D\\ne0\\) the solution is unique, so the lines meet in exactly one point. Both coordinates are fractions with the common denominator \\(D\\), so the meeting point of lines with integer coefficients is a rational point.',
        ),
    },
    {
        id: 'parallel-or-same',
        latex: 'D=0:\\ \\ (a_2,b_2)=\\lambda(a_1,b_1),\\ \\ c_2=\\lambda c_1',
        notation: text(
            '\\(\\lambda\\) je število, različno od \\(0\\); \\((a_1,b_1)\\) in \\((a_2,b_2)\\) sta normali premic. Ko velja tudi \\(c_2=\\lambda c_1\\), premici sovpadata.',
            '\\(\\lambda\\) is a number other than \\(0\\); \\((a_1,b_1)\\) and \\((a_2,b_2)\\) are the normals of the lines. When \\(c_2=\\lambda c_1\\) holds as well, the lines coincide.',
        ),
        explanation: text(
            'Definicija: premici sta vzporedni, ko imata isto smer in nobene skupne točke, in sovpadata, ko imata vse točke skupne. Če je \\(D=0\\), sta normali sorazmerni, zato premici nimata ene same skupne točke: ali sta vzporedni ali pa sovpadata. Odloči desna stran: pri \\((a_2,b_2)=\\lambda(a_1,b_1)\\) premici sovpadata natanko tedaj, ko je tudi \\(c_2=\\lambda c_1\\). Pri okrajšanih implicitnih oblikah (prva lekcija) so trojice koeficientov enakih premic enake.',
            'Definition: lines are parallel when they have the same direction and no common point, and they coincide when all their points are common. If \\(D=0\\) the normals are proportional, so the lines do not share exactly one point: they are either parallel or the same. The right-hand side decides: for \\((a_2,b_2)=\\lambda(a_1,b_1)\\) the lines coincide exactly when \\(c_2=\\lambda c_1\\) as well. With the reduced implicit forms (the first lesson) equal lines have equal triples of coefficients.',
        ),
    },
    {
        id: 'line-circle-quadratic',
        latex: '\\alpha y^2+\\beta y+\\gamma=0,\\ \\ D=\\beta^2-4\\alpha\\gamma,\\ \\ D>0:2,\\ D=0:1,\\ D<0:0',
        notation: text(
            '\\(\\alpha y^2+\\beta y+\\gamma=0\\) je kvadratna enačba, ki jo dobimo, ko enačbo premice vstavimo v enačbo krožnice \\((x-x_0)^2+(y-y_0)^2=r^2\\); \\(D\\) je njena diskriminanta, desno je število skupnih točk.',
            '\\(\\alpha y^2+\\beta y+\\gamma=0\\) is the quadratic equation obtained by substituting the equation of the line into the equation of the circle \\((x-x_0)^2+(y-y_0)^2=r^2\\); \\(D\\) is its discriminant, on the right is the number of common points.',
        ),
        explanation: text(
            'Argument: točka leži na premici in na krožnici natanko tedaj, ko ustreza obema enačbama. Če iz enačbe premice izrazimo eno spremenljivko in jo vstavimo v enačbo krožnice, dobimo kvadratno enačbo v drugi spremenljivki. Vsaka njena rešitev da natanko eno skupno točko, zato je skupnih točk dve, ena ali nobena, kakor ima enačba dve, eno (dvojno) ali nobene realne rešitve, torej glede na predznak diskriminante \\(D\\). Odločitev je natančen račun; slika jo ponazori. Odčitek »Diskriminanta« ima pri tej premici isti predznak kot \\(D\\) (je njegova četrtina), zato odloča enako.',
            'Argument: a point lies on the line and on the circle exactly when it satisfies both equations. Expressing one variable from the equation of the line and substituting it into the equation of the circle gives a quadratic equation in the other variable. Each of its solutions gives exactly one common point, so there are two, one or no common points, as the equation has two, one (double) or no real solutions, that is by the sign of the discriminant \\(D\\). The decision is an exact calculation; the picture illustrates it. For this line the readout "Discriminant" has the same sign as \\(D\\) (it is its quarter), so it decides the same.',
        ),
    },
    {
        id: 'tangent-condition',
        latex: 'd=\\frac{|s|}{\\sqrt{a^2+b^2}},\\ \\ s=ax_0+by_0-c,\\ \\ (a^2+b^2)r^2-s^2=0\\ \\Longleftrightarrow\\ d=r',
        notation: text(
            '\\(ax+by=c\\) je premica \\(\\ell\\), \\(O=(x_0,y_0)\\) središče krožnice s polmerom \\(r\\), \\(d\\) razdalja središča od \\(\\ell\\); odčitek diskriminante je izraz \\((a^2+b^2)r^2-s^2\\).',
            '\\(ax+by=c\\) is the line \\(\\ell\\), \\(O=(x_0,y_0)\\) the centre of the circle with radius \\(r\\), \\(d\\) the distance of the centre from \\(\\ell\\); the discriminant readout is the expression \\((a^2+b^2)r^2-s^2\\).',
        ),
        explanation: text(
            'Argument: naj bo \\(F\\) nožišče pravokotnice iz \\(O\\) na \\(\\ell\\), \\(|OF|=d\\) (lekcija o razdalji). Za vsako točko \\(X\\) premice \\(\\ell\\) je po Pitagorovem izreku \\(|OX|^2=d^2+|FX|^2\\). Točka \\(X\\) je na krožnici, ko je \\(|OX|=r\\), torej ko je \\(|FX|^2=r^2-d^2\\). Pri \\(r>d\\) sta rešitvi dve (po ena na vsaki strani točke \\(F\\)), pri \\(r=d\\) ena sama, \\(X=F\\), pri \\(r<d\\) nobena. Premica je tangenta, ko ima s krožnico natanko eno skupno točko, to je pri \\(r=d\\), in se dotika v točki \\(F\\). Ker je \\(d^2=\\tfrac{s^2}{a^2+b^2}\\), je \\(r^2=d^2\\) enako kot \\((a^2+b^2)r^2-s^2=0\\), kar je diskriminanta \\(0\\). Odloča račun; da se premica na sliki dotika, je le ponazoritev.',
            'Argument: let \\(F\\) be the foot of the perpendicular from \\(O\\) to \\(\\ell\\), \\(|OF|=d\\) (the lesson on distance). For every point \\(X\\) of \\(\\ell\\) the Pythagorean theorem gives \\(|OX|^2=d^2+|FX|^2\\). The point \\(X\\) is on the circle when \\(|OX|=r\\), that is when \\(|FX|^2=r^2-d^2\\). For \\(r>d\\) there are two solutions (one on each side of \\(F\\)), for \\(r=d\\) exactly one, \\(X=F\\), for \\(r<d\\) none. A line is tangent when it has exactly one common point with the circle, that is for \\(r=d\\), and it touches at the point \\(F\\). Since \\(d^2=\\tfrac{s^2}{a^2+b^2}\\), \\(r^2=d^2\\) is the same as \\((a^2+b^2)r^2-s^2=0\\), which is discriminant \\(0\\). The calculation decides; that the line touches in the picture is only an illustration.',
        ),
    },
];

const l5Examples: readonly WorkedExample[] = [
    {
        id: 'l5-elimination',
        title: text('Presečišče premic \\(x-2y=-4\\) in \\(x-y=0\\)', 'The meeting point of the lines \\(x-2y=-4\\) and \\(x-y=0\\)'),
        calculationLatex: '(x-y)-(x-2y)=0-(-4)\\ \\Longrightarrow\\ y=4,\\ \\ x=y=4',
        resultLatex: '(4,4)',
        check: text(
            'Odštejemo prvo enačbo od druge: \\(x\\) izpade in ostane \\(y=4\\); iz \\(x-y=0\\) je \\(x=4\\). Preverek: \\(4-2\\cdot4=-4\\) in \\(4-4=0\\). Tako rešiš tudi sistem iz naloge; izraza \\(D\\) za ta primer ni treba računati, ker se koeficienta pri \\(x\\) ujemata.',
            'Subtract the first equation from the second: \\(x\\) drops out and \\(y=4\\) remains; from \\(x-y=0\\) we get \\(x=4\\). Check: \\(4-2\\cdot4=-4\\) and \\(4-4=0\\). This is also how to solve the system of the task; the expression \\(D\\) need not be computed for this case, because the coefficients of \\(x\\) agree.',
        ),
    },
    {
        id: 'l5-line-circle',
        title: text('Premica \\(x-2y=-4\\) in krožnica s središčem \\((1,0)\\) in \\(r^2=10\\)', 'The line \\(x-2y=-4\\) and the circle with centre \\((1,0)\\) and \\(r^2=10\\)'),
        calculationLatex: 'x=2y-4,\\ \\ (2y-5)^2+y^2=10\\ \\Longrightarrow\\ 5y^2-20y+15=0\\ \\Longrightarrow\\ y^2-4y+3=0',
        resultLatex: '(-2,1),\\ (2,3)',
        check: text(
            'Iz \\(x-2y=-4\\) je \\(x=2y-4\\), zato je \\(x-1=2y-5\\). Diskriminanta je \\(D=(-20)^2-4\\cdot5\\cdot15=100>0\\), zato sta rešitvi dve: \\(y=1\\) in \\(y=3\\), točki sta \\((-2,1)\\) in \\((2,3)\\). Preverek: \\((-2-1)^2+1^2=10\\) in \\((2-1)^2+3^2=10\\); obe točki ležita na premici: \\(-2-2\\cdot1=-4\\), \\(2-2\\cdot3=-4\\). Isti račun naredi pri nalogi, le z drugim \\(r^2\\).',
            'From \\(x-2y=-4\\) we get \\(x=2y-4\\), so \\(x-1=2y-5\\). The discriminant is \\(D=(-20)^2-4\\cdot5\\cdot15=100>0\\), so there are two solutions: \\(y=1\\) and \\(y=3\\), the points are \\((-2,1)\\) and \\((2,3)\\). Check: \\((-2-1)^2+1^2=10\\) and \\((2-1)^2+3^2=10\\); both points lie on the line: \\(-2-2\\cdot1=-4\\), \\(2-2\\cdot3=-4\\). Do the same calculation in the task, only with another \\(r^2\\).',
        ),
    },
];

const l5Steps: readonly GuidedLessonStep[] = [
    step({
        id: 'l5-meeting', order: 1,
        declare: f({highlight: ['point', 'point-approx']}),
        title: text('Presečišče dveh premic', 'The meeting point of two lines'),
        purpose: text('Izračunati presečišče dveh premic na roko, preden ga graf izpiše, in primerjati.', 'Computing the meeting point of two lines by hand before the graph shows it, and comparing.'),
        explanation: text(
            'Prva premica je \\(\\ell: x-2y=-4\\) skozi \\(P=(-4,0)\\) in \\(Q=(0,2)\\); druga premica \\(m\\) gre zdaj skozi \\(R=(0,0)\\) in \\(S=(2,2)\\), graf pa izpiše njuno presečišče. Zdaj naj bo \\(m\\) premica \\(2x+y=4\\). Preden karkoli premakneš, reši sistem \\(x-2y=-4\\), \\(2x+y=4\\) na papirju (po vzoru računa spodaj ali z izrazom \\(D\\)) in zapiši presečišče. Potem v skupini »Druga premica \\(m\\)« popravi polja: \\(x\\) v vrstici \\(R\\) na \\(2\\), \\(x\\) v vrstici \\(S\\) na \\(0\\) in \\(y\\) v vrstici \\(S\\) na \\(4\\); \\(y\\) v vrstici \\(R\\) ostane \\(0\\). Stanje se spremeni po vsaki spremembi.',
            'The first line is \\(\\ell: x-2y=-4\\) through \\(P=(-4,0)\\) and \\(Q=(0,2)\\); the second line \\(m\\) now goes through \\(R=(0,0)\\) and \\(S=(2,2)\\), and the graph shows their meeting point. Now let \\(m\\) be the line \\(2x+y=4\\). Before you move anything, solve the system \\(x-2y=-4\\), \\(2x+y=4\\) on paper (following the calculation below or with the expression \\(D\\)) and write down the meeting point. Then in the group "Second line \\(m\\)" change the fields: \\(x\\) in the row \\(R\\) to \\(2\\), \\(x\\) in the row \\(S\\) to \\(0\\) and \\(y\\) in the row \\(S\\) to \\(4\\); \\(y\\) in the row \\(R\\) stays \\(0\\). The status changes after every change.',
        ),
        formulaIds: ['lines-meet'],
        workedExampleId: 'l5-elimination',
        observationPrompt: text(
            'Zapiši svoje presečišče, nato popravi polja in primerjaj z vrstico »Presečišče« in z vrstico »Presečišče (približno)«.',
            'Write down your meeting point, then change the fields and compare it with the row "Intersection" and the row "Intersection (approximate)".',
        ),
        expectedObservations: [text(
            'Odčitek je \\((\\tfrac45,\\tfrac{12}{5})\\), približno \\((0{,}8;\\,2{,}4)\\), druga premica je \\(2x+y=4\\). Vmes: po \\(x\\) v vrstici \\(R\\) je \\(m\\) premica \\(x=2\\) s presečiščem \\((2,3)\\), po \\(x\\) v vrstici \\(S\\) je \\(x+y=2\\) s presečiščem \\((0,2)\\).',
            'The readout is \\((\\tfrac45,\\tfrac{12}{5})\\), approximately \\((0.8,\\,2.4)\\), the second line is \\(2x+y=4\\). On the way: after \\(x\\) in the row \\(R\\), \\(m\\) is the line \\(x=2\\) with the meeting point \\((2,3)\\), after \\(x\\) in the row \\(S\\) it is \\(x+y=2\\) with the meeting point \\((0,2)\\).',
        )],
        scene: scene('l5-meeting-scene', L5_MEETING_SCENE,
            'Premici \\(x-2y=-4\\) in \\(x-y=0\\) se sekata v \\((4,4)\\).',
            'The lines \\(x-2y=-4\\) and \\(x-y=0\\) meet at \\((4,4)\\).'),
    }),
    step({
        id: 'l5-parallel-same', order: 2,
        declare: f({highlight: ['point']}),
        title: text('Vzporedni in enaki premici', 'Parallel and equal lines'),
        purpose: text('Napovedati lego druge premice, pri kateri je vzporedna in pri kateri sovpada s prvo, in jo nastaviti.', 'Predicting the position of the second line at which it is parallel to and at which it coincides with the first, and setting it.'),
        explanation: text(
            'Druga premica je zdaj \\(m: 2x+y=4\\) skozi \\(R=(2,0)\\) in \\(S=(0,4)\\), prva je \\(\\ell: x-2y=-4\\). Napovej dvoje. (1) \\(R\\) in abscisa točke \\(S\\) ostaneta: katero ordinato mora imeti \\(S=(0,y)\\), da je \\(m\\) vzporedna z \\(\\ell\\)? Normala premice \\(\\ell\\) je \\((1,-2)\\); normalo premice \\(m\\) izračunaj iz \\(R\\) in \\(S\\) kot v prvi lekciji in zahtevaj, da sta normali sorazmerni. (2) Ko je \\(m\\) vzporedna, pomakni obe točki \\(R\\) in \\(S\\) vodoravno za isto število. Za koliko ju premakneš, da \\(m\\) sovpade z \\(\\ell\\)? Pri premiku za \\(t\\) v desno se vrednost izraza \\(x-2y\\) vsake točke spremeni za \\(t\\). Nato popravi \\(y\\) v vrstici \\(S\\) na napovedano ordinato in preberi stanje; potem popravi še \\(x\\) v vrsticah \\(R\\) in \\(S\\) in znova preberi stanje.',
            'The second line is now \\(m: 2x+y=4\\) through \\(R=(2,0)\\) and \\(S=(0,4)\\), the first is \\(\\ell: x-2y=-4\\). Predict two things. (1) \\(R\\) and the abscissa of \\(S\\) stay: which ordinate must \\(S=(0,y)\\) have for \\(m\\) to be parallel to \\(\\ell\\)? The normal of \\(\\ell\\) is \\((1,-2)\\); compute the normal of \\(m\\) from \\(R\\) and \\(S\\) as in the first lesson and require the normals to be proportional. (2) Once \\(m\\) is parallel, move both points \\(R\\) and \\(S\\) horizontally by the same number. By how much so that it coincides with \\(\\ell\\)? Moving by \\(t\\) to the right changes the value of the expression \\(x-2y\\) of every point by \\(t\\). Then change \\(y\\) in the row \\(S\\) to the ordinate you predicted and read the status; then change \\(x\\) in the rows \\(R\\) and \\(S\\) as well and read the status again.',
        ),
        formulaIds: ['lines-meet', 'parallel-or-same'],
        observationPrompt: text(
            'Zapiši obe napovedi, nato popravi polja in preberi stanje in desno stran druge premice po prvem in po drugem premiku; primerjaj desni strani obeh premic.',
            'Write down both predictions, then change the fields and read the status and the right-hand side of the second line after the first and after the second move; compare the right-hand sides of the two lines.',
        ),
        expectedObservations: [text(
            'Pri \\(S=(0,-1)\\) je \\(m: x-2y=2\\), stanje je »Premici sta vzporedni in se ne sekata.«, presečišče je »ni«; desni strani \\(2\\) in \\(-4\\) se razlikujeta. Če najprej popraviš \\(x\\) v vrstici \\(R\\) na \\(-4\\), je \\(m: x+4y=-4\\) s presečiščem \\((-4,0)\\). Pri \\(R=(-4,0)\\), \\(S=(-6,-1)\\) je \\(m: x-2y=-4\\) enaka \\(\\ell\\): »Premici sovpadata, skupnih točk je neskončno mnogo.«, presečišče je »neskončno mnogo«.',
            'For \\(S=(0,-1)\\) it is \\(m: x-2y=2\\), the status is "The lines are parallel and do not meet.", the intersection is "none"; the right-hand sides \\(2\\) and \\(-4\\) differ. If you first change \\(x\\) in the row \\(R\\) to \\(-4\\), \\(m\\) is \\(x+4y=-4\\) with the meeting point \\((-4,0)\\). For \\(R=(-4,0)\\), \\(S=(-6,-1)\\), \\(m: x-2y=-4\\) equals \\(\\ell\\): "The lines coincide, they share infinitely many points.", the intersection is "infinitely many".',
        )],
        scene: scene('l5-parallel-same-scene', L5_PARALLEL_SCENE,
            'Premici \\(x-2y=-4\\) in \\(2x+y=4\\) se sekata v \\((\\tfrac45,\\tfrac{12}{5})\\).',
            'The lines \\(x-2y=-4\\) and \\(2x+y=4\\) meet at \\((\\tfrac45,\\tfrac{12}{5})\\).'),
    }),
    step({
        id: 'l5-line-circle', order: 3,
        declare: f({uses: ['lines-target']}),
        title: text('Premica in krožnica', 'A line and a circle'),
        purpose: text('Napovedati število skupnih točk premice in krožnice s kvadratno enačbo, nato izbrati krožnico in primerjati.', 'Predicting the number of common points of a line and a circle with a quadratic equation, then choosing the circle and comparing.'),
        explanation: text(
            'Premica je spet \\(\\ell: x-2y=-4\\). Krožnica ima središče \\(O=(1,0)\\) in gre skozi \\(B=(3,2)\\); točki sta že nastavljeni, vidni pa bosta, ko izbereš krožnico. Preden jo izbereš, izračunaj \\(r^2=|OB|^2\\), vstavi \\(x=2y-4\\) v enačbo krožnice \\((x-1)^2+y^2=r^2\\), izračunaj diskriminanto dobljene kvadratne enačbe in napovej, koliko skupnih točk imata premica in krožnica; če jih je, izračunaj tudi njuni koordinati. Postopek kaže račun spodaj za drug \\(r^2\\). Nato v izbiri »Presečišče premice z« izberi »krožnico«.',
            'The line is again \\(\\ell: x-2y=-4\\). The circle has the centre \\(O=(1,0)\\) and goes through \\(B=(3,2)\\); the points are already set, and they will be visible when you choose the circle. Before choosing it, compute \\(r^2=|OB|^2\\), substitute \\(x=2y-4\\) into the equation of the circle \\((x-1)^2+y^2=r^2\\), compute the discriminant of the resulting quadratic equation and predict how many common points the line and the circle have; if there are any, also compute their coordinates. The procedure is shown by the calculation below for another \\(r^2\\). Then in the select "Intersect the line with" choose "a circle".',
        ),
        formulaIds: ['line-circle-quadratic'],
        workedExampleId: 'l5-line-circle',
        observationPrompt: text(
            'Zapiši napoved, izberi krožnico in preberi stanje, diskriminanto in vrstici »Presečišče 1« in »Presečišče 2«; preveri eno točko v enačbi krožnice.',
            'Write down your prediction, choose the circle and read the status, the discriminant and the rows "Intersection 1" and "Intersection 2"; check one point in the equation of the circle.',
        ),
        expectedObservations: [text(
            'Pri \\(r^2=8\\) je \\(5y^2-20y+17=0\\), \\(D=60\\) (odčitek diskriminante je \\(15\\), četrtina), zato sta skupni točki dve: z \\(s=\\tfrac{\\sqrt{15}}5\\) sta \\((-2s,\\,2-s)\\approx(-1{,}5492;\\,1{,}2254)\\) in \\((2s,\\,2+s)\\approx(1{,}5492;\\,2{,}7746)\\). Preverek: \\(s^2=\\tfrac35\\) in \\((2s-1)^2+(2+s)^2=5s^2+5=8\\).',
            'For \\(r^2=8\\), \\(5y^2-20y+17=0\\), \\(D=60\\) (the discriminant readout is \\(15\\), a quarter), so there are two common points: with \\(s=\\tfrac{\\sqrt{15}}5\\) they are \\((-2s,\\,2-s)\\approx(-1.5492,\\,1.2254)\\) and \\((2s,\\,2+s)\\approx(1.5492,\\,2.7746)\\). Check: \\(s^2=\\tfrac35\\) and \\((2s-1)^2+(2+s)^2=5s^2+5=8\\).',
        )],
        scene: scene('l5-line-circle-scene', L5_CIRCLE_SCENE,
            'Druga premica je \\(2x+y=4\\); krožnica \\(O=(1,0)\\), \\(B=(3,2)\\) je nastavljena, a skrita; po izbiri krožnice sta skupni točki dve.',
            'The second line is \\(2x+y=4\\); the circle \\(O=(1,0)\\), \\(B=(3,2)\\) is set but hidden; after choosing the circle there are two common points.'),
    }),
    step({
        id: 'l5-tangent', order: 4,
        declare: f({highlight: ['discriminant', 'count']}),
        title: text('Tangenta in polmer', 'The tangent and the radius'),
        purpose: text('Napovedati polmer, pri katerem se premica dotika krožnice, ga nastaviti in napovedati še primer brez skupne točke.', 'Predicting the radius at which the line touches the circle, setting it, and predicting a case without a common point.'),
        explanation: text(
            'Izbrana je krožnica \\(O=(1,0)\\), \\(B=(3,2)\\), premica je \\(\\ell: x-2y=-4\\) in seka krožnico v dveh točkah. Premica je tangenta natanko tedaj, ko ima s krožnico eno skupno točko, in odloča račun, ne slika. Napovej (a) kolikšen \\(r^2\\) naredi \\(\\ell\\) za tangento: uporabi razdaljo \\(d\\) središča \\(O\\) od \\(\\ell\\) iz lekcije o razdalji; vrednosti \\(s\\) in \\(a^2+b^2\\) sta v vrsticah »Vrednost \\(ax_0+by_0-c\\) v središču \\(O\\)« in »\\(a^2+b^2\\)«; (b) kje je dotikališče (nožišče pravokotnice iz \\(O\\) na \\(\\ell\\)); (c) katero mrežno točko \\(B\\) z izračunanim \\(r^2\\) postaviš. Nato v skupini »Krožnica: središče \\(O\\) in točka \\(B\\)« popravi polje \\(B\\) in preberi stanje. Nazadnje napovej, koliko skupnih točk bo pri \\(B=(3,0)\\), in poskusi.',
            'The circle \\(O=(1,0)\\), \\(B=(3,2)\\) is chosen, the line is \\(\\ell: x-2y=-4\\) and it meets the circle in two points. The line is tangent exactly when it has one common point with the circle, and the calculation decides, not the picture. Predict (a) what \\(r^2\\) makes \\(\\ell\\) a tangent: use the distance \\(d\\) of the centre \\(O\\) from \\(\\ell\\) from the lesson on distance; the values \\(s\\) and \\(a^2+b^2\\) are in the rows "Value \\(ax_0+by_0-c\\) at the centre \\(O\\)" and "\\(a^2+b^2\\)"; (b) where the point of tangency is (the foot of the perpendicular from \\(O\\) to \\(\\ell\\)); (c) which grid point \\(B\\) with the computed \\(r^2\\) you will set. Then in the group "Circle: centre \\(O\\) and point \\(B\\)" change the field of \\(B\\) and read the status. Finally predict how many common points there are for \\(B=(3,0)\\), and try it.',
        ),
        formulaIds: ['tangent-condition', 'line-circle-quadratic'],
        observationPrompt: text(
            'Zapiši napovedi, nato popravi \\(B\\) in preberi stanje, \\(r^2\\), diskriminanto, število presečišč in dotikališče; potem poskusi še \\(B=(3,0)\\).',
            'Write down your predictions, then change \\(B\\) and read the status, \\(r^2\\), the discriminant, the number of intersections and the point of tangency; then also try \\(B=(3,0)\\).',
        ),
        expectedObservations: [text(
            'Razdalja je \\(d=\\tfrac{5}{\\sqrt5}=\\sqrt5\\), zato je \\(r^2=5\\); dotikališče je \\((1,0)-\\tfrac55(1,-2)=(0,2)\\). Mrežne točke z \\(r^2=5\\) so na primer \\((3,1)\\), \\((2,2)\\), \\((0,2)\\) (vsaka je ena sprememba polja iz \\((3,2)\\)). Pri \\(B=(3,1)\\): »Premica je tangenta krožnice v točki« in \\((0;2)\\), \\(r^2=5\\), diskriminanta \\(0\\), število presečišč \\(1\\), dotikališče \\((0;2)\\). Pri \\(B=(3,0)\\) je \\(r^2=4<5\\): »Premica ne seka krožnice (diskriminanta −5).«, število presečišč \\(0\\).',
            'The distance is \\(d=\\tfrac{5}{\\sqrt5}=\\sqrt5\\), so \\(r^2=5\\); the point of tangency is \\((1,0)-\\tfrac55(1,-2)=(0,2)\\). Grid points with \\(r^2=5\\) are for example \\((3,1)\\), \\((2,2)\\), \\((0,2)\\) (each one field change from \\((3,2)\\)). For \\(B=(3,1)\\): "The line is tangent to the circle at the point" and \\((0,2)\\), \\(r^2=5\\), discriminant \\(0\\), number of intersections \\(1\\), point of tangency \\((0,2)\\). For \\(B=(3,0)\\), \\(r^2=4<5\\): "The line does not meet the circle (discriminant −5).", number of intersections \\(0\\).',
        )],
        scene: scene('l5-tangent-scene', L5_TANGENT_SCENE,
            'Krožnica \\(O=(1,0)\\), \\(B=(3,2)\\), \\(r^2=8\\): dve skupni točki s premico \\(x-2y=-4\\).',
            'The circle \\(O=(1,0)\\), \\(B=(3,2)\\), \\(r^2=8\\): two common points with the line \\(x-2y=-4\\).'),
    }),
    step({
        id: 'l5-free', order: 5,
        declare: f({open: ['readouts']}),
        title: text('Raziskovanje', 'Free exploration'),
        purpose: text('Samostojno premikati premici in krožnico ter napovedati stanje.', 'Moving the lines and the circle on your own and predicting the status.'),
        explanation: text(
            'Premikaj \\(P\\), \\(Q\\), \\(R\\), \\(S\\), \\(O\\) in \\(B\\) samostojno; krožnico izbereš v izbiri »Presečišče premice z«. Poskusi: izberi krožnico, postavi prvo premico vodoravno, \\(P=(-2,3)\\) in \\(Q=(2,3)\\), in poišči mrežno točko \\(B\\), pri kateri je ta premica tangenta krožnice s središčem \\(O=(1,0)\\); napovej jo z razdaljo, preden jo postaviš. Pazi na posebne primere: če \\(P\\) in \\(Q\\) (ali \\(R\\) in \\(S\\)) sovpadata, premice ni, če sovpadata \\(O\\) in \\(B\\), je polmer \\(0\\) in krožnice ni.',
            'Move \\(P\\), \\(Q\\), \\(R\\), \\(S\\), \\(O\\) and \\(B\\) yourself; you choose the circle in the select "Intersect the line with". Try this: choose the circle, put the first line horizontal, \\(P=(-2,3)\\) and \\(Q=(2,3)\\), and find a grid point \\(B\\) at which this line is tangent to the circle with the centre \\(O=(1,0)\\); predict it with the distance before you set it. Watch for special cases: if \\(P\\) and \\(Q\\) (or \\(R\\) and \\(S\\)) coincide there is no line, and if \\(O\\) and \\(B\\) coincide the radius is \\(0\\) and there is no circle.',
        ),
        formulaIds: ['tangent-condition'],
        observationPrompt: text(
            'Zapiši napoved, nato preberi \\(r^2\\), diskriminanto in dotikališče; poskusi še z dvema premicama: v izbiri »Presečišče premice z« spet izberi »drugo premico« in poišči \\(R\\) in \\(S\\) tako, da premici sovpadata.',
            'Write down your prediction, then read \\(r^2\\), the discriminant and the point of tangency; also try two lines: in the select "Intersect the line with" choose "a second line" again and find \\(R\\) and \\(S\\) so that the lines coincide.',
        ),
        expectedObservations: [text(
            'Za \\(y=3\\) je razdalja središča \\(O=(1,0)\\) enaka \\(3\\), zato je tangenta pri \\(r^2=9\\), na primer \\(B=(4,0)\\): »Premica je tangenta krožnice v točki« in \\((1;3)\\), diskriminanta \\(0\\).',
            'For \\(y=3\\) the distance of the centre \\(O=(1,0)\\) is \\(3\\), so it is tangent at \\(r^2=9\\), for example \\(B=(4,0)\\): "The line is tangent to the circle at the point" and \\((1,3)\\), discriminant \\(0\\).',
        )],
        scene: scene('l5-free-scene', L5_FREE_SCENE,
            'Začetna lega: \\(\\ell: x-2y=-4\\), \\(m: 2x+y=4\\); krožnica \\(O=(1,0)\\), \\(B=(3,1)\\) je nastavljena, a skrita.',
            'Starting position: \\(\\ell: x-2y=-4\\), \\(m: 2x+y=4\\); the circle \\(O=(1,0)\\), \\(B=(3,1)\\) is set but hidden.'),
    }),
];

const sources: GuidedLesson['sources'] = [
    {
        id: 'matura-catalogue-premica-presecisce',
        citation: 'Predmetni izpitni katalog za splošno maturo, matematika (M-MAT-2026), poglavje 4.10.1 Enačbe premice v ravnini in poglavje 4.9 (razdalja med točkama). Cited from the text extraction of the catalogue.',
        implementationCorrespondence: 'The lesson follows the topic list for the intersection of two lines (a system of two linear equations, parallel and equal lines decided on integer coefficients); the line and the circle part is a Bezeg extension of the same analytic-geometry topic, decided by the discriminant and the distance of the centre.',
    },
    {
        id: 'bezeg-line-geometry-implementation',
        citation: 'Bezeg source: src/compgeo/lineForms.ts, src/graphs/lines/lineGeometryModel.ts and src/graphs/lines/LineGeometryGraph.tsx.',
        implementationCorrespondence: 'A scene sets the graph\'s mode, target and its integer handle fields; the text quotes only values of those scenes or plain arithmetic (labelled calculation), and the meeting point, the relation and the common points are computed from exact integer or rational values of the line kernel.',
    },
];

export const lineIntersectionsLesson: GuidedLesson = {
    demonstrationId: 'line-geometry',
    title: text('Presečišča premic in krožnice', 'Intersections of lines and of a line and a circle'),
    summary: text(
        'Dve premici se sekata v eni točki, nimata skupne točke ali sovpadata; to odloči izraz \\(D=a_1b_2-a_2b_1\\) in pri \\(D=0\\) desna stran. Premica in krožnica imata dve, eno ali nobene skupne točke, kakor je diskriminanta kvadratne enačbe pozitivna, \\(0\\) ali negativna.',
        'Two lines meet in one point, have no common point or coincide; this is decided by the expression \\(D=a_1b_2-a_2b_1\\) and, for \\(D=0\\), by the right-hand side. A line and a circle have two, one or no common points, as the discriminant of a quadratic equation is positive, \\(0\\) or negative.',
    ),
    prerequisites: [text('Lekciji o oblikah enačbe premice in o normalnem vektorju ter razdalja točke od premice.', 'The lessons on the forms of a line and on the normal vector, and the distance from a point to a line.')],
    learningGoals: [
        text('Izračunaš presečišče dveh premic iz implicitnih oblik in preveriš rezultat z grafom.', 'Compute the meeting point of two lines from the implicit forms and check the result with the graph.'),
        text('Z izrazom \\(D\\) in desnima stranema ločiš sekajoči se, vzporedni in sovpadajoči premici.', 'Tell intersecting, parallel and coincident lines apart with the expression \\(D\\) and the right-hand sides.'),
        text('Z diskriminanto ali z razdaljo središča od premice odločiš, ali premica seka krožnico, se je dotika ali je mimo nje, in poiščeš dotikališče.', 'Decide with the discriminant or with the distance of the centre from the line whether the line meets the circle, touches it or misses it, and find the point of tangency.'),
    ],
    formulaBlocks: l5Formulas,
    workedExamples: l5Examples,
    steps: l5Steps,
    sources,
    edgeCases: [
        text('Če točki \\(P\\) in \\(Q\\) ali \\(R\\) in \\(S\\) sovpadata, premice ni in graf to sporoči.', 'If the points \\(P\\) and \\(Q\\), or \\(R\\) and \\(S\\), coincide there is no line and the graph says so.'),
        text('Če \\(O\\) in \\(B\\) sovpadata, je polmer \\(0\\) in krožnice ni; graf to sporoči.', 'If \\(O\\) and \\(B\\) coincide the radius is \\(0\\) and there is no circle; the graph says so.'),
        text('Presečišče zunaj prikaza ni narisano, njegove koordinate pa so v odčitku.', 'An intersection outside the view is not drawn, while its coordinates stay in the readout.'),
    ],
    unresolvedQuestions: [],
};
