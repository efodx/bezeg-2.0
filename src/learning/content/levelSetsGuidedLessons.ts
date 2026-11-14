/**
 * Guided lessons of the level-sets family, batch A (docs/specs/level-sets-optimization-lessons.md): LS5, linear programming, on `linear-program` (LinearProgramGraph). The scenes use
 * only the `levelsets` actions the graph registers (`set-constraints`, `set-objective`, `set-sweep`) and every scene starts from the Demonstration default (x + 2y <= 8, 3x + y <= 9,
 * maximize 3x + 2y, the line 3x + 2y = 9) and names what it sets. Every number the text quotes is a readout of the graph for that scene, an exact value computed in the same step, or a
 * value the learner reads after an action the text asks for; the numbers are listed per step in docs/reviews/feature-streams/families-prep/notes/f3-ls-a.md. The vertex coordinates
 * and values are exact (the graph solves in rationals); "the optimum is at a vertex" is stated as a theorem with its short argument, the sliding line is the illustration.
 * The contour lessons (LS1 to LS4) belong to later batches and the contour graph.
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

/** One user row `a x + b y <= c`; x >= 0 and y >= 0 are always added by the graph. */
export interface LpSceneRow {
    readonly a: number;
    readonly b: number;
    readonly c: number;
}

/** What a linear-program scene sets on top of the Demonstration default: the rows, the objective `p x + q y` and the value k of the line `p x + q y = k`. */
export interface LevelSetsSceneSpec {
    readonly constraints?: readonly LpSceneRow[];
    readonly objective?: {readonly p: number; readonly q: number};
    readonly sweep?: number;
}

/** The actions of a linear-program scene: the Demonstration default, then the rows, the objective and the sweep value. */
export const levelSetsSceneActions = (id: string, spec: LevelSetsSceneSpec): LessonAction[] => [
    {kind: 'prepared-scene', sceneId: id, source: 'demonstration-default'},
    ...(spec.constraints !== undefined ? [{kind: 'levelsets', operation: 'set-constraints', constraints: spec.constraints} as const] : []),
    ...(spec.objective !== undefined ? [{kind: 'levelsets', operation: 'set-objective', ...spec.objective} as const] : []),
    ...(spec.sweep !== undefined ? [{kind: 'levelsets', operation: 'set-sweep', sweep: spec.sweep} as const] : []),
];

const lpScene = (id: string, spec: LevelSetsSceneSpec, sl: string, en: string): LessonScene =>
    ({id, basedOn: 'demonstration-default', actions: levelSetsSceneActions(id, spec), expectedState: text(sl, en)});

/** The Demonstration default: x + 2y <= 8, 3x + y <= 9, maximize 3x + 2y, line at k = 9. */
export const LS5_REGION = {} as const;
export const LS5_LINE_SIX = {sweep: 6} as const;
export const LS5_LINE_TWELVE = {sweep: 12} as const;
export const LS5_WALK = {} as const;
export const LS5_PARALLEL = {objective: {p: 1, q: 2}, sweep: 8} as const;
/** x + y <= 4, x + 3y <= 6, x <= 3 (and x, y >= 0): three constraints are tight at (3; 1). */
export const LS5_DEGENERATE_ROWS: readonly LpSceneRow[] = [{a: 1, b: 1, c: 4}, {a: 1, b: 3, c: 6}, {a: 1, b: 0, c: 3}];
export const LS5_DEGENERATE = {constraints: LS5_DEGENERATE_ROWS, sweep: 11} as const;
/** x - y <= 2 with the objective x + y: the region reaches infinity along (1; 1). */
export const LS5_UNBOUNDED = {constraints: [{a: 1, b: -1, c: 2}], objective: {p: 1, q: 1}} as const;

// ---- LS5 -------------------------------------------------------------------------------------------------------------------------

const ls5Formulas: readonly FormulaBlock[] = [
    {
        id: 'lp-model',
        latex: '\\max\\,(px+qy),\\quad a_ix+b_iy\\le c_i,\\ x\\ge0,\\ y\\ge0',
        notation: text(
            '\\(p\\) in \\(q\\) sta koeficienta kriterijske funkcije \\(px+qy\\), vrstica \\(a_ix+b_iy\\le c_i\\) je \\(i\\)-ti omejitveni pogoj; množica točk, ki izpolnjujejo vse pogoje, je dopustna množica (dopustno območje).',
            '\\(p\\) and \\(q\\) are the coefficients of the objective function \\(px+qy\\), the row \\(a_ix+b_iy\\le c_i\\) is the \\(i\\)-th constraint; the set of points that satisfy all of them is the feasible set (feasible region).',
        ),
        explanation: text(
            'Vsaka neenačba \\(a_ix+b_iy\\le c_i\\) določa polravnino, presek polravnin je konveksen mnogokotnik (ali prazna množica ali neomejeno območje). Iščemo točko tega območja z največjo vrednostjo \\(px+qy\\).',
            'Each inequality \\(a_ix+b_iy\\le c_i\\) defines a half-plane, and the intersection of half-planes is a convex polygon (or empty, or an unbounded region). We look for the point of this region with the largest value of \\(px+qy\\).',
        ),
    },
    {
        id: 'lp-vertex',
        latex: 'f(A+t(B-A))=(1-t)\\,f(A)+t\\,f(B),\\qquad 0\\le t\\le1',
        notation: text(
            '\\(f(x,y)=px+qy\\) je kriterijska funkcija, \\(A\\) in \\(B\\) sta krajišči daljice, \\(t\\) pa parameter točke na njej.',
            '\\(f(x,y)=px+qy\\) is the objective function, \\(A\\) and \\(B\\) are the endpoints of a segment and \\(t\\) is the parameter of a point on it.',
        ),
        explanation: text(
            'Izrek: največja vrednost linearne funkcije na konveksnem mnogokotniku je v oglišču. Argument: na daljici je \\(f\\) tehtano povprečje svojih vrednosti v krajiščih, zato je med \\(f(A)\\) in \\(f(B)\\), največ pa je v krajišču. Vsaka točka mnogokotnika je tehtano povprečje oglišč, zato je \\(f\\) tam največ \\(\\max f\\) po ogliščih. Premica, ki drsi, je ponazoritev tega izreka.',
            'Theorem: the largest value of a linear function on a convex polygon is at a vertex. Argument: on a segment \\(f\\) is a weighted average of its values at the endpoints, so it lies between \\(f(A)\\) and \\(f(B)\\) and is largest at an endpoint. Every point of the polygon is a weighted average of the vertices, so \\(f\\) there is at most \\(\\max f\\) over the vertices. The sliding line illustrates this theorem.',
        ),
    },
];

const ls5Examples: readonly WorkedExample[] = [
    {
        id: 'ls5-vertices',
        title: text('Vrednosti \\(3x+2y\\) v ogliščih', 'The values of \\(3x+2y\\) at the vertices'),
        calculationLatex: '3\\cdot0+2\\cdot0=0,\\quad 3\\cdot3+2\\cdot0=9,\\quad 3\\cdot2+2\\cdot3=12,\\quad 3\\cdot0+2\\cdot4=8',
        resultLatex: '\\max(3x+2y)=12,\\quad (x,y)=(2,3)',
        check: text(
            'Odčitki grafa za oglišča \\((0;\\ 0)\\), \\((3;\\ 0)\\), \\((2;\\ 3)\\) in \\((0;\\ 4)\\) so \\(0\\), \\(9\\), \\(12\\) in \\(8\\); največja vrednost je \\(12\\) v oglišču \\((2;\\ 3)\\).',
            'The readouts of the graph for the vertices \\((0,\\ 0)\\), \\((3,\\ 0)\\), \\((2,\\ 3)\\) and \\((0,\\ 4)\\) are \\(0\\), \\(9\\), \\(12\\) and \\(8\\); the largest value is \\(12\\) at the vertex \\((2,\\ 3)\\).',
        ),
    },
    {
        id: 'ls5-edge',
        title: text('Vrednosti \\(x+2y\\) ob stranici', 'The values of \\(x+2y\\) along a side'),
        calculationLatex: '1\\cdot2+2\\cdot3=8,\\quad 1\\cdot0+2\\cdot4=8',
        resultLatex: '(x,y)=(0,4)+t\\,(2,-1),\\quad 0\\le t\\le1',
        check: text(
            'Premica \\(x+2y=8\\) je tudi meja pogoja \\(x+2y\\le8\\): oglišči \\((2;\\ 3)\\) in \\((0;\\ 4)\\) imata isto vrednost \\(8\\), zato jo ima vsaka točka daljice med njima.',
            'The line \\(x+2y=8\\) is also the boundary of the constraint \\(x+2y\\le8\\): the vertices \\((2,\\ 3)\\) and \\((0,\\ 4)\\) have the same value \\(8\\), so every point of the segment between them has it.',
        ),
    },
];

const ls5Steps: readonly GuidedLessonStep[] = [
    step({
        id: 'ls5-region', order: 1,
        title: text('Dopustno območje', 'The feasible region'),
        purpose: text('Napovedati oglišča mnogokotnika, ki ga določajo neenačbe, preden jih graf pokaže.', 'Predicting the vertices of the polygon given by the inequalities before the graph shows them.'),
        explanation: text(
            'Imamo omejitvena pogoja \\(x+2y\\le8\\) in \\(3x+y\\le9\\) ter vedno \\(x\\ge0\\), \\(y\\ge0\\). Vsak pogoj določa polravnino, dopustno območje je njihov presek, konveksen mnogokotnik. Preden pogledaš odčitke, zapiši, kje po tvoje so njegova oglišča. Argument: oglišče je dopustno presečišče dveh mejnih premic, na primer \\(3x+y=9\\) z osjo \\(y=0\\) ali \\(x+2y=8\\) z \\(3x+y=9\\).',
            'We have the constraints \\(x+2y\\le8\\) and \\(3x+y\\le9\\) and always \\(x\\ge0\\), \\(y\\ge0\\). Each constraint defines a half-plane, and the feasible region is their intersection, a convex polygon. Before you look at the readouts, write down where you think its vertices are. Argument: a vertex is a feasible intersection of two boundary lines, for example \\(3x+y=9\\) with the axis \\(y=0\\), or \\(x+2y=8\\) with \\(3x+y=9\\).',
        ),
        formulaIds: ['lp-model'],
        observationPrompt: text('V odčitku preberi Število oglišč in Oglišče 1 do 4 ter jih primerjaj z napovedjo.', 'In the readout read Number of vertices and Vertex 1 to 4 and compare them with your prediction.'),
        expectedObservations: [text(
            'Območje je omejen mnogokotnik s \\(4\\) oglišči \\((0;\\ 0)\\), \\((3;\\ 0)\\), \\((2;\\ 3)\\) in \\((0;\\ 4)\\); v vsakem sta tesna \\(2\\) pogoja.',
            'The region is a bounded polygon with \\(4\\) vertices \\((0,\\ 0)\\), \\((3,\\ 0)\\), \\((2,\\ 3)\\) and \\((0,\\ 4)\\); \\(2\\) constraints are tight at each.',
        )],
        scene: lpScene('ls5-region-scene', LS5_REGION,
            'Dopustno območje \\(x+2y\\le8\\), \\(3x+y\\le9\\), \\(x,y\\ge0\\): omejen mnogokotnik s \\(4\\) oglišči \\((0;\\ 0)\\), \\((3;\\ 0)\\), \\((2;\\ 3)\\), \\((0;\\ 4)\\).',
            'Feasible region \\(x+2y\\le8\\), \\(3x+y\\le9\\), \\(x,y\\ge0\\): a bounded polygon with \\(4\\) vertices \\((0,\\ 0)\\), \\((3,\\ 0)\\), \\((2,\\ 3)\\), \\((0,\\ 4)\\).'),
    }),
    step({
        id: 'ls5-line', order: 2,
        title: text('Premica kriterijske funkcije', 'The line of the objective'),
        purpose: text('Napovedati, kaj se zgodi s premico \\(3x+2y=k\\), ko večamo \\(k\\).', 'Predicting what happens to the line \\(3x+2y=k\\) as \\(k\\) grows.'),
        explanation: text(
            'Iščemo največjo vrednost kriterijske funkcije \\(3x+2y\\). Točke z isto vrednostjo \\(k\\) ležijo na premici \\(3x+2y=k\\); različni \\(k\\) dajo vzporedne premice. Zdaj je \\(k=6\\) in premica seka območje. Zapiši napoved: kam se premakne premica, ko \\(k\\) povečuješ, in kdaj zapusti območje? To je ponazoritev, ne dokaz.',
            'We look for the largest value of the objective function \\(3x+2y\\). The points with the same value \\(k\\) lie on the line \\(3x+2y=k\\); different \\(k\\) give parallel lines. Now \\(k=6\\) and the line crosses the region. Write down a prediction: where does the line move as you increase \\(k\\), and when does it leave the region? This is an illustration, not a proof.',
        ),
        formulaIds: [],
        observationPrompt: text('Z drsnikom Vrednost k premice cilja nastavi \\(9\\) in nato \\(12\\) ter opazuj, kam se premakne črtkana premica.', 'With the slider Value k of the objective line set \\(9\\) and then \\(12\\) and watch where the dashed line moves.'),
        expectedObservations: [text(
            'Pri \\(k=6\\) odčitek Premica cilja pri izbranem k kaže \\(3x+2y=6\\); pri \\(k=9\\) gre premica skozi oglišče \\((3;\\ 0)\\), pri \\(k=12\\) skozi \\((2;\\ 3)\\).',
            'At \\(k=6\\) the readout Objective line at the chosen k shows \\(3x+2y=6\\); at \\(k=9\\) the line passes through the vertex \\((3,\\ 0)\\), at \\(k=12\\) through \\((2,\\ 3)\\).',
        )],
        scene: lpScene('ls5-line-scene', LS5_LINE_SIX,
            'Kriterijska funkcija \\(3x+2y\\), premica \\(3x+2y=6\\) seka dopustno območje.',
            'Objective \\(3x+2y\\), the line \\(3x+2y=6\\) crosses the feasible region.'),
    }),
    step({
        id: 'ls5-last-touch', order: 3,
        title: text('Zadnji dotik je oglišče', 'The last touch is a vertex'),
        purpose: text('Videti, da največjo vrednost dosežemo v oglišču, in znati povedati zakaj.', 'Seeing that the largest value is reached at a vertex and being able to say why.'),
        explanation: text(
            'Pri \\(k=12\\) premica \\(3x+2y=12\\) se območja le dotika v oglišču \\((2;\\ 3)\\). Vrednosti v ogliščih so \\(0\\), \\(9\\), \\(12\\) in \\(8\\), največja je \\(12\\). Izrek: največja vrednost linearne funkcije na konveksnem mnogokotniku je v oglišču; na daljici je \\(f\\) tehtano povprečje vrednosti v krajiščih, zato ne preseže večje od obeh. Zato pri \\(k=13\\) premica območja ne zadene več, vendar je to ponazoritev: argument je izrek.',
            'At \\(k=12\\) the line \\(3x+2y=12\\) only touches it at the vertex \\((2,\\ 3)\\). The values at the vertices are \\(0\\), \\(9\\), \\(12\\) and \\(8\\), and the largest is \\(12\\). Theorem: the largest value of a linear function on a convex polygon is at a vertex; on a segment \\(f\\) is a weighted average of the values at the endpoints, so it does not exceed the larger of the two. So at \\(k=13\\) the line no longer meets the region, but this is an illustration: the argument is the theorem.',
        ),
        formulaIds: ['lp-vertex'],
        workedExampleId: 'ls5-vertices',
        observationPrompt: text('Preberi Največja vrednost (točno) in Optimalna točka; nato z drsnikom nastavi \\(k=13\\) in preveri, da premica ne seka več dopustnega območja.', 'Read Largest value (exact) and Optimal point; then set \\(k=13\\) with the slider and check that the line no longer crosses the feasible region.'),
        expectedObservations: [text(
            'Največja vrednost je \\(12\\) v točki \\((2;\\ 3)\\); odčitek Premica cilja skozi optimum je \\(3x+2y=12\\), enaka premici pri \\(k=12\\).',
            'The largest value is \\(12\\) at the point \\((2,\\ 3)\\); the readout Objective line through the optimum is \\(3x+2y=12\\), the same as the line at \\(k=12\\).',
        )],
        scene: lpScene('ls5-last-touch-scene', LS5_LINE_TWELVE,
            'Premica \\(3x+2y=12\\) se dopustnega območja dotika v oglišču \\((2;\\ 3)\\); največja vrednost \\(12\\); vrednosti v ogliščih \\(0\\), \\(9\\), \\(12\\), \\(8\\).',
            'The line \\(3x+2y=12\\) touches the feasible region at the vertex \\((2,\\ 3)\\); the largest value is \\(12\\); the values at the vertices are \\(0\\), \\(9\\), \\(12\\), \\(8\\).'),
    }),
    step({
        id: 'ls5-walk', order: 4,
        title: text('Sprehod po ogliščih', 'The walk along the vertices'),
        purpose: text('Napovedati, v katero sosednje oglišče se splača iti, in kdaj se sprehod ustavi.', 'Predicting which neighbouring vertex is worth moving to and when the walk stops.'),
        explanation: text(
            'Ker je optimum v oglišču, lahko po ogliščih hodimo: iz začetnega oglišča \\((0;\\ 0)\\) pojdemo v boljše sosednje oglišče, simpleksna metoda dela podobno. Sosedi izhodišča sta \\((3;\\ 0)\\) z vrednostjo \\(9\\) in \\((0;\\ 4)\\) z vrednostjo \\(8\\). Zapiši napoved, kam bo šel sprehod prvi in kam drugi korak. Ker \\(9>8\\), gre v \\((3;\\ 0)\\) in od tam v \\((2;\\ 3)\\) z vrednostjo \\(12\\); sosedi \\((3;\\ 0)\\) in \\((0;\\ 4)\\) sta slabša, zato se ustavi.',
            'Since the optimum is at a vertex, we can walk along the vertices: from the starting vertex \\((0,\\ 0)\\) we move to a better neighbouring vertex, and the simplex method works in a similar way. The neighbours of the origin are \\((3,\\ 0)\\) with value \\(9\\) and \\((0,\\ 4)\\) with value \\(8\\). Write down a prediction of the first and the second move. Since \\(9>8\\), the walk goes to \\((3,\\ 0)\\) and from there to \\((2,\\ 3)\\) with value \\(12\\); both neighbours \\((3,\\ 0)\\) and \\((0,\\ 4)\\) are worse, so it stops.',
        ),
        formulaIds: [],
        observationPrompt: text('Preberi Sprehod, točka 0 do 2 in primerjaj vrednosti cilja.', 'Read Walk, point 0 to 2 and compare the objective values.'),
        expectedObservations: [text(
            'Sprehod je \\((0;\\ 0)\\) z vrednostjo \\(0\\), \\((3;\\ 0)\\) z \\(9\\) in \\((2;\\ 3)\\) z \\(12\\).',
            'The walk is \\((0,\\ 0)\\) with value \\(0\\), \\((3,\\ 0)\\) with \\(9\\) and \\((2,\\ 3)\\) with \\(12\\).',
        )],
        scene: lpScene('ls5-walk-scene', LS5_WALK,
            'Sprehod po ogliščih \\((0;\\ 0)\\to(3;\\ 0)\\to(2;\\ 3)\\) z vrednostmi cilja \\(0\\), \\(9\\), \\(12\\); v \\((2;\\ 3)\\) se ustavi.',
            'The walk along the vertices \\((0,\\ 0)\\to(3,\\ 0)\\to(2,\\ 3)\\) with objective values \\(0\\), \\(9\\), \\(12\\); it stops at \\((2,\\ 3)\\).'),
    }),
    step({
        id: 'ls5-parallel', order: 5,
        title: text('Premica vzporedna stranici', 'A line parallel to a side'),
        purpose: text('Napovedati, kaj se zgodi, ko je kriterijska funkcija vzporedna eni stranici mnogokotnika.', 'Predicting what happens when the objective is parallel to one side of the polygon.'),
        explanation: text(
            'Zamenjamo kriterijsko funkcijo z \\(x+2y\\): njene premice so vzporedne meji \\(x+2y=8\\). Zapiši napoved: ali je največja vrednost še v enem samem oglišču? Vrednosti v ogliščih so \\(0\\), \\(3\\), \\(8\\) in \\(8\\): oglišči \\((2;\\ 3)\\) in \\((0;\\ 4)\\) imata isto vrednost, zato jo ima vsaka točka daljice med njima. Optimum je lahko daljica, a vsebuje oglišče, v resnici obe krajišči.',
            'We replace the objective with \\(x+2y\\): its lines are parallel to the boundary \\(x+2y=8\\). Write down a prediction: is the largest value still at a single vertex? The values at the vertices are \\(0\\), \\(3\\), \\(8\\) and \\(8\\): the vertices \\((2,\\ 3)\\) and \\((0,\\ 4)\\) have the same value, so every point of the segment between them has it. The optimum can be a segment, but it still contains a vertex, in fact both endpoints.',
        ),
        formulaIds: [],
        workedExampleId: 'ls5-edge',
        observationPrompt: text('Preberi Stanje (točno), Optimalna točka in Sprehod; kje se sprehod ustavi?', 'Read Status (exact), Optimal point and Walk; where does the walk stop?'),
        expectedObservations: [text(
            'Stanje je optimalna daljica z vrednostjo \\(8\\) med \\((0;\\ 4)\\) in \\((2;\\ 3)\\); sprehod je \\((0;\\ 0)\\to(0;\\ 4)\\) in se ustavi ob enakem sosedu.',
            'The status is an optimal segment with value \\(8\\) between \\((0,\\ 4)\\) and \\((2,\\ 3)\\); the walk is \\((0,\\ 0)\\to(0,\\ 4)\\) and it stops beside an equal neighbour.',
        )],
        scene: lpScene('ls5-parallel-scene', LS5_PARALLEL,
            'Kriterijska funkcija \\(x+2y\\), premica \\(x+2y=8\\): optimalna daljica od \\((0;\\ 4)\\) do \\((2;\\ 3)\\), vrednost \\(8\\); vrednosti v ogliščih \\(0\\), \\(3\\), \\(8\\), \\(8\\).',
            'Objective \\(x+2y\\), the line \\(x+2y=8\\): an optimal segment from \\((0,\\ 4)\\) to \\((2,\\ 3)\\), value \\(8\\); the values at the vertices are \\(0\\), \\(3\\), \\(8\\), \\(8\\).'),
    }),
    step({
        id: 'ls5-degenerate', order: 6,
        title: text('Izrojeno oglišče', 'A degenerate vertex'),
        purpose: text('Napovedati, v katerem oglišču se stikajo trije pogoji, in prepoznati odvečni pogoj.', 'Predicting at which vertex three constraints meet and recognising the redundant constraint.'),
        explanation: text(
            'Vzemimo pogoje \\(x+y\\le4\\), \\(x+3y\\le6\\), \\(x\\le3\\) in \\(x,y\\ge0\\). Zapiši napoved, koliko oglišč ima območje in v katerem so tesni vsi trije pogoji. Oglišča so \\((0;\\ 0)\\), \\((3;\\ 0)\\), \\((3;\\ 1)\\) in \\((0;\\ 2)\\) z vrednostmi \\(3x+2y\\) enakimi \\(0\\), \\(9\\), \\(11\\), \\(4\\). V \\((3;\\ 1)\\) so tesni \\(3\\) pogoji. Pogoj \\(x+y\\le4\\) je odvečen: iz \\(x\\le3\\) in \\(y\\le\\tfrac{6-x}{3}\\) sledi \\(x+y\\le\\tfrac{2x+6}{3}\\le4\\). Brez njega je območje isto.',
            'Take the constraints \\(x+y\\le4\\), \\(x+3y\\le6\\), \\(x\\le3\\) and \\(x,y\\ge0\\). Write down a prediction of how many vertices the region has and at which one all three constraints are tight. The vertices are \\((0,\\ 0)\\), \\((3,\\ 0)\\), \\((3,\\ 1)\\) and \\((0,\\ 2)\\) with values of \\(3x+2y\\) equal to \\(0\\), \\(9\\), \\(11\\), \\(4\\). At \\((3,\\ 1)\\) \\(3\\) constraints are tight. The constraint \\(x+y\\le4\\) is redundant: from \\(x\\le3\\) and \\(y\\le\\tfrac{6-x}{3}\\) it follows that \\(x+y\\le\\tfrac{2x+6}{3}\\le4\\). Without it the region is the same.',
        ),
        formulaIds: [],
        observationPrompt: text('Preberi Oglišče 1 do 4 (zadnji podatek je število tesnih pogojev) in Sprehod; nato razmisli, katerega pogoja ne potrebuješ, da bi bilo območje isto.', 'Read Vertex 1 to 4 (the last item is the number of tight constraints) and Walk; then think about which constraint is not needed for the region to stay the same.'),
        expectedObservations: [text(
            'V oglišču \\((3;\\ 1)\\) je število tesnih pogojev \\(3\\), drugod \\(2\\); največja vrednost je \\(11\\) v \\((3;\\ 1)\\), sprehod je \\((0;\\ 0)\\to(3;\\ 0)\\to(3;\\ 1)\\).',
            'At the vertex \\((3,\\ 1)\\) the number of tight constraints is \\(3\\), elsewhere \\(2\\); the largest value is \\(11\\) at \\((3,\\ 1)\\), the walk is \\((0,\\ 0)\\to(3,\\ 0)\\to(3,\\ 1)\\).',
        )],
        scene: lpScene('ls5-degenerate-scene', LS5_DEGENERATE,
            'Pogoji \\(x+y\\le4\\), \\(x+3y\\le6\\), \\(x\\le3\\): oglišča \\((0;\\ 0)\\), \\((3;\\ 0)\\), \\((3;\\ 1)\\), \\((0;\\ 2)\\); v \\((3;\\ 1)\\) so tesni \\(3\\) pogoji; največja vrednost \\(3x+2y\\) je \\(11\\).',
            'Constraints \\(x+y\\le4\\), \\(x+3y\\le6\\), \\(x\\le3\\): vertices \\((0,\\ 0)\\), \\((3,\\ 0)\\), \\((3,\\ 1)\\), \\((0,\\ 2)\\); \\(3\\) constraints are tight at \\((3,\\ 1)\\); the largest value of \\(3x+2y\\) is \\(11\\).'),
    }),
    step({
        id: 'ls5-unbounded', order: 7,
        title: text('Neomejen primer in raziskovanje', 'The unbounded case and free exploration'),
        purpose: text('Napovedati, kdaj cilj nima največje vrednosti, in nato prosto raziskovati.', 'Predicting when the objective has no largest value and then exploring freely.'),
        explanation: text(
            'Pri pogoju \\(x-y\\le2\\) (in \\(x,y\\ge0\\)) območje ni omejeno: točke \\((t;\\ t)\\) so vse dopustne, vrednost \\(x+y=2t\\) pa raste čez vsako mejo. Graf zato izpiše stanje, da cilj ni omejen, in smer rasti \\((1;\\ 1)\\); simpleksnega sprehoda ni, saj območje ni omejen mnogokotnik. Argument s tehtanim povprečjem pokrije omejen mnogokotnik; na neomejenem območju največje vrednosti morda ni, kot tu, in če jo ima, je še vedno v oglišču. Zapiši napoved: kaj izpiše graf, če pogoj spremeniš v \\(x+y\\le-1\\)? Nato raziskuj sam z drugimi pogoji in drugo smerjo \\((p;\\ q)\\).',
            'With the constraint \\(x-y\\le2\\) (and \\(x,y\\ge0\\)) the region is unbounded: the points \\((t,\\ t)\\) are all feasible and the value \\(x+y=2t\\) grows beyond every bound. So the graph states that the objective is unbounded and gives the direction of growth \\((1,\\ 1)\\); there is no simplex walk, since the region is not a bounded polygon. The weighted-average argument covers a bounded polygon; on an unbounded region the objective may have no largest value, as here, and when it has one, it is still at a vertex. Write down a prediction: what does the graph say if you change the constraint to \\(x+y\\le-1\\)? Then explore on your own with other constraints and another direction \\((p,\\ q)\\).',
        ),
        formulaIds: [],
        observationPrompt: text('Preberi Stanje in Smer rasti brez meje; nato v pogoju 1 z drsnikoma nastavi \\(b=1\\) in \\(c=-1\\) ter preberi stanje. Nato spreminjaj pogoje in smer po želji.', 'Read Status and Direction of unbounded growth; then in constraint 1 set \\(b=1\\) and \\(c=-1\\) with the sliders and read the status. Then change the constraints and the direction as you like.'),
        expectedObservations: [text(
            'Območje je neomejeno z \\(2\\) oglišči \\((0;\\ 0)\\) in \\((2;\\ 0)\\); stanje: cilj ni omejen, smer \\((1;\\ 1)\\). Po spremembi v \\(x+y\\le-1\\) graf izpiše, da dopustnega območja ni (prazno območje, optimuma ni).',
            'The region is unbounded with \\(2\\) vertices \\((0,\\ 0)\\) and \\((2,\\ 0)\\); status: the objective is unbounded, direction \\((1,\\ 1)\\). After the change to \\(x+y\\le-1\\) the graph says there is no feasible region (empty region, no optimum).',
        )],
        scene: lpScene('ls5-unbounded-scene', LS5_UNBOUNDED,
            'Pogoj \\(x-y\\le2\\), cilj \\(x+y\\): neomejeno območje, oglišči \\((0;\\ 0)\\) in \\((2;\\ 0)\\), cilj ni omejen v smeri \\((1;\\ 1)\\); sprehoda ni.',
            'Constraint \\(x-y\\le2\\), objective \\(x+y\\): an unbounded region, vertices \\((0,\\ 0)\\) and \\((2,\\ 0)\\), the objective is unbounded in the direction \\((1,\\ 1)\\); there is no walk.'),
    }),
];

const sources: GuidedLesson['sources'] = [
    {
        id: 'bezeg-levelsets-implementation',
        citation: 'Bezeg source: src/optimization/ (rational linear-programming kernel, state model) and src/graphs/levelsets/LinearProgramGraph.tsx.',
        implementationCorrespondence: 'A scene sets the user rows, the objective coefficients and the value k of the line of the linear-program graph; every vertex, value, status and walk point is an exact rational readout of that graph, and the walk moves to the better neighbouring vertex until neither is better. The sliding line is an illustration; the theorem on the vertex is stated with its argument.',
    },
];

const ls5: GuidedLesson = {
    demonstrationId: 'linear-program',
    title: text('Linearno programiranje', 'Linear programming'),
    summary: text(
        'Sistem linearnih neenačb določa konveksen mnogokotnik, največja vrednost linearne kriterijske funkcije pa je v njegovem oglišču; sprehod po ogliščih jo najde. Optimum je lahko cela daljica, območje je lahko neomejeno ali prazno, v izrojenem (degeneriranem) oglišču pa se stikajo trije pogoji.',
        'A system of linear inequalities defines a convex polygon, and the largest value of a linear objective function is at one of its vertices; a walk along the vertices finds it. The optimum can be a whole segment, the region can be unbounded or empty, and three constraints can meet at a degenerate vertex.',
    ),
    prerequisites: [text('Linearna funkcija in linearna neenačba v ravnini (polravnina), sistem linearnih neenačb.', 'A linear function and a linear inequality in the plane (half-plane), a system of linear inequalities.')],
    learningGoals: [
        text('Znaš iz neenačb določiti oglišča dopustnega območja in vrednosti kriterijske funkcije v njih.', 'Can find the vertices of the feasible region from the inequalities and the values of the objective function at them.'),
        text('Veš, da je največja vrednost linearne funkcije na omejenem mnogokotniku v oglišču, in znaš povedati zakaj; premica, ki drsi, je le ponazoritev.', 'Know that the largest value of a linear function on a bounded polygon is at a vertex and can say why; the sliding line is only an illustration.'),
        text('Znaš prepoznati optimalno daljico, izrojeno oglišče, neomejen cilj in prazno območje.', 'Can recognise an optimal segment, a degenerate vertex, an unbounded objective and an empty region.'),
    ],
    formulaBlocks: ls5Formulas,
    workedExamples: ls5Examples,
    steps: ls5Steps,
    sources,
    edgeCases: [
        text('Pri neomejenem območju največje vrednosti morda ni; če jo ima, je še vedno v oglišču, argument s tehtanim povprečjem pa velja za omejen mnogokotnik.', 'With an unbounded region there may be no largest value; when there is one it is still at a vertex, but the weighted-average argument covers a bounded polygon.'),
        text('Pri \\(p=0\\) in \\(q=0\\) je kriterijska funkcija povsod \\(0\\) in je optimalna vsaka dopustna točka; premice cilja ni.', 'With \\(p=0\\) and \\(q=0\\) the objective is \\(0\\) everywhere and every feasible point is optimal; there is no objective line.'),
        text('Koeficienti in desne strani so cela števila v mejah, ki jih pove graf; oglišča so točna ulomka, v tej lekciji pa so cela števila.', 'Coefficients and right-hand sides are integers within the limits the graph states; vertices are exact fractions, but in this lesson they are whole numbers.'),
    ],
    unresolvedQuestions: [],
};

export const linearProgrammingLesson: GuidedLesson = ls5;
