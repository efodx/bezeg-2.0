/**
 * Guided lessons of the Computational geometry family, convexity and hulls batch (docs/specs/convexity-hulls-lessons.md, A1 and A2).
 * The text is a one-shot draft (docs/specs/new-lesson-families.md, "One-shot lesson text"): every value it quotes is the readout of
 * the scene it belongs to, and `compgeoGuidedLessons.test.ts` checks that against the real graphs. The scenes use only the
 * `point-set` actions, so a scene is a function of its actions and the lesson default.
 */
import type {LessonAction, LessonPoint} from '../model';
import type {GuidedLesson, GuidedLessonFrame, GuidedLessonFrameKind, LessonScene, LocalizedText} from './guidedLessons';

const text = (sl: string, en: string): LocalizedText => ({sl, en});
const frame = (id: string, kind: GuidedLessonFrameKind): GuidedLessonFrame => ({id, kind});

const points = (list: readonly LessonPoint[]): LessonAction => ({kind: 'point-set', operation: 'set-points', mode: 'points', points: list});
const polygon = (list: readonly LessonPoint[]): LessonAction => ({kind: 'point-set', operation: 'set-points', mode: 'polygon', closed: true, points: list});
const overlay = (name: 'grid' | 'turn' | 'fan' | 'lattice' | 'values' | 'trace' | 'hull', visible: boolean): LessonAction => ({kind: 'point-set', operation: 'set-overlay', overlay: name, visible});
const algorithm = (name: 'monotone-chain' | 'slow-edge-test' | 'gift-wrapping'): LessonAction => ({kind: 'point-set', operation: 'set-algorithm', algorithm: name});
/** `count` Next-step presses of the hull trace; the actions run in one tick, like the button presses they stand for. */
const nextSteps = (count: number): LessonAction[] => Array.from({length: count}, (): LessonAction => ({kind: 'animation', animationId: 'algorithm-trace', command: 'next-step'}));

/**
 * Trace positions on the hull sample (HULL_TRACE_SAMPLE_1) that the convex-hull scenes and texts quote; the test derives each from the
 * real trace. Monotone chain: the test of (2, 0) with value -2 is event 5 and the removal of (1, 1) event 6; the collinear test of (2, 5)
 * with value 0 is event 11 and the removal of (2, 2) event 12. Slow edge test: 74 events. Gift wrapping: 42 events, the first wrap at event 7.
 */
export const HULL_TRACE_STEPS = {popTest: 5, collinearTest: 11, slowEnd: 73, wrapFirst: 7, wrapEnd: 41} as const;
const scene = (id: string, actions: readonly LessonAction[], sl: string, en: string): LessonScene =>
    ({id, basedOn: 'demonstration-default', actions, expectedState: text(sl, en)});

/** The orientation scenes: p = (0, 0), q = (4, 0) and a movable r. */
export const ORIENTATION_P_Q: readonly LessonPoint[] = [[0, 0], [4, 0]];
export const ORIENTATION_R_LEFT: LessonPoint = [3, 2];
export const ORIENTATION_R_RIGHT: LessonPoint = [3, -2];
export const ORIENTATION_R_COLLINEAR: LessonPoint = [2, 0];

/** The hull pentagon (doubled area 42, B = 8, I = 18), its reversed order (v0 stays first), the notched pentagon (36, 16, 11) and a bow tie. */
export const AREA_HULL_PENTAGON: readonly LessonPoint[] = [[-1, 3], [0, 0], [4, 0], [5, 3], [2, 5]];
export const AREA_HULL_PENTAGON_REVERSED: readonly LessonPoint[] = [[-1, 3], [2, 5], [5, 3], [4, 0], [0, 0]];
export const AREA_NOTCHED_PENTAGON: readonly LessonPoint[] = [[0, 0], [6, 0], [6, 4], [3, 2], [0, 4]];
export const AREA_BOW_TIE: readonly LessonPoint[] = [[0, 0], [4, 4], [4, 0], [0, 4]];

const orientation: GuidedLesson = {
    demonstrationId: 'orientation',
    title: text('Orientacija treh točk', 'Orientation of three points'),
    summary: text(
        'Predznak vrednosti \\(D=(q_x-p_x)(r_y-p_y)-(q_y-p_y)(r_x-p_x)\\) pove, ali točke \\(p\\), \\(q\\), \\(r\\) zavijajo v levo ali v desno; vrednost \\(0\\) pomeni, da so kolinearne.',
        'The sign of \\(D=(q_x-p_x)(r_y-p_y)-(q_y-p_y)(r_x-p_x)\\) tells whether the points \\(p\\), \\(q\\), \\(r\\) turn left or right; the value \\(0\\) means they are collinear.',
    ),
    prerequisites: [
        text('Potrebno je poznavanje koordinat in vektorjev v ravnini.', 'Assumes familiarity with coordinates and vectors in the plane.'),
        text('Priporočeno, vendar ne nujno, je poznavanje afinih in konveksnih kombinacij iz poglavja o Bézierjevih krivuljah.', 'Familiarity with affine and convex combinations from the Bézier chapter helps but is not required.'),
    ],
    learningGoals: [
        text('Izračunaš vrednost \\(D\\) za tri točke in iz njenega predznaka določiš levi ali desni zavoj.', 'Compute \\(D\\) for three points and decide a left or right turn from its sign.'),
        text('Razložiš, zakaj \\(D=0\\) pomeni, da \\(r\\) leži na premici \\(pq\\).', 'Explain why \\(D=0\\) means that \\(r\\) lies on the line \\(pq\\).'),
        text('Vrednost \\(D\\) povežeš z dvojno predznačeno ploščino trikotnika \\(pqr\\).', 'Connect \\(D\\) with twice the signed area of the triangle \\(pqr\\).'),
    ],
    formulaBlocks: [
        {
            id: 'orientation-determinant',
            latex: 'D=(q_x-p_x)(r_y-p_y)-(q_y-p_y)(r_x-p_x)',
            notation: text(
                '\\(p\\), \\(q\\), \\(r\\) so točke s koordinatama \\((x,y)\\); \\(D\\) je celo število, če so koordinate cele.',
                '\\(p\\), \\(q\\), \\(r\\) are points with coordinates \\((x,y)\\); \\(D\\) is an integer when the coordinates are integers.',
            ),
            explanation: text(
                'To je determinanta vektorjev \\(q-p\\) in \\(r-p\\). Če je \\(D>0\\), je zavoj levi (nasprotno od smeri urinega kazalca), če je \\(D<0\\), desni, pri \\(D=0\\) pa so točke kolinearne.',
                'It is the determinant of the vectors \\(q-p\\) and \\(r-p\\). If \\(D>0\\) the turn is left (counter-clockwise), if \\(D<0\\) it is right, and for \\(D=0\\) the points are collinear.',
            ),
        },
        {
            id: 'orientation-area',
            latex: 'D=2\\cdot\\operatorname{area}_{\\pm}(pqr)',
            notation: text(
                '\\(\\operatorname{area}_{\\pm}\\) je predznačena ploščina: pozitivna za levi zavoj, negativna za desnega.',
                '\\(\\operatorname{area}_{\\pm}\\) is the signed area: positive for a left turn, negative for a right turn.',
            ),
            explanation: text(
                'Vrednost \\(D\\) je dvojna predznačena ploščina trikotnika \\(pqr\\). Zamenjava dveh točk obrne zavoj in zato zamenja predznak vrednosti \\(D\\).',
                'The value \\(D\\) is twice the signed area of the triangle \\(pqr\\). Swapping two points reverses the turn and therefore negates \\(D\\).',
            ),
        },
    ],
    workedExamples: [
        {
            id: 'orientation-example',
            title: text('Točke \\(p=(0,0)\\), \\(q=(4,0)\\), \\(r=(3,2)\\)', 'The points \\(p=(0,0)\\), \\(q=(4,0)\\), \\(r=(3,2)\\)'),
            calculationLatex: 'D=(4-0)(2-0)-(0-0)(3-0)=8-0',
            resultLatex: 'D=+8',
            check: text(
                'Odčitek pod grafom pokaže \\(+8\\) in levi zavoj, kar se ujema z izračunom.',
                'The readout under the graph shows \\(+8\\) and a left turn, which matches the calculation.',
            ),
        },
    ],
    steps: [
        {
            id: 'orientation-line', order: 1,
            title: text('Točki \\(p\\) in \\(q\\) ter premica \\(pq\\)', 'The points \\(p\\) and \\(q\\) and the line \\(pq\\)'),
            purpose: text('Spoznati, da premica \\(pq\\) loči ravnino na dve strani.', 'Seeing that the line \\(pq\\) splits the plane into two sides.'),
            explanation: text(
                'Točki \\(p=(0,0)\\) in \\(q=(4,0)\\) določata premico \\(pq\\), ki je na grafu črtkana. Tretja točka \\(r\\) leži na levi strani premice, na desni strani ali na njej; orientacija treh točk pove, katera od teh možnosti velja.',
                'The points \\(p=(0,0)\\) and \\(q=(4,0)\\) determine the line \\(pq\\), drawn dashed on the graph. A third point \\(r\\) lies on the left of the line, on the right, or on it; the orientation of three points tells which one it is.',
            ),
            formulaIds: ['orientation-determinant'],
            frames: [frame('orientation-line-explanation', 'explanation'), frame('orientation-line-observation', 'observation')],
            observationPrompt: text('Premakni \\(q\\) in opazuj, kako se premica \\(pq\\) vrti okoli \\(p\\).', 'Move \\(q\\) and watch the line \\(pq\\) turn around \\(p\\).'),
            expectedObservations: [text('Premica vedno poteka skozi obe točki; tretje točke še ni, zato odčitek še ne pokaže zavoja.', 'The line always passes through both points; there is no third point yet, so the readout shows no turn.')],
            scene: scene('orientation-line', [points(ORIENTATION_P_Q), overlay('turn', true), overlay('values', true)],
                'Narisani sta točki \\(p=(0,0)\\) in \\(q=(4,0)\\) ter premica \\(pq\\); tretje točke še ni.',
                'The points \\(p=(0,0)\\) and \\(q=(4,0)\\) and the line \\(pq\\) are drawn; there is no third point yet.'),
        },
        {
            id: 'orientation-predict', order: 2,
            title: text('Napovej stran točke \\(r\\)', 'Predict the side of \\(r\\)'),
            purpose: text('Pred izračunom napovedati zavoj.', 'Predicting the turn before computing it.'),
            explanation: text(
                'Dodali smo točko \\(r=(3,2)\\). Preden prikažeš barvno sled zavoja, napovej: ali \\(r\\) leži na levi ali na desni strani premice \\(pq\\), če gledamo od \\(p\\) proti \\(q\\)? Številske vrednosti so v tem koraku skrite.',
                'We added the point \\(r=(3,2)\\). Before you reveal the shaded turn, predict: is \\(r\\) on the left or on the right of the line \\(pq\\) when looking from \\(p\\) towards \\(q\\)? The numeric values are hidden in this step.',
            ),
            formulaIds: [],
            frames: [frame('orientation-predict-explanation', 'explanation'), frame('orientation-predict-observation', 'observation')],
            observationPrompt: text('Reci naglas, ali je zavoj \\(p\\to q\\to r\\) levi ali desni.', 'Say aloud whether the turn \\(p\\to q\\to r\\) is left or right.'),
            expectedObservations: [text('Točka \\(r\\) je nad premico, torej na levi strani smeri od \\(p\\) proti \\(q\\); v naslednjem koraku to preverimo.', 'The point \\(r\\) is above the line, so on the left of the direction from \\(p\\) to \\(q\\); the next step checks this.')],
            scene: scene('orientation-predict', [points([...ORIENTATION_P_Q, ORIENTATION_R_LEFT]), overlay('turn', false), overlay('values', false)],
                'Točke \\(p=(0,0)\\), \\(q=(4,0)\\) in \\(r=(3,2)\\) so narisane; prikaz zavoja je skrit.',
                'The points \\(p=(0,0)\\), \\(q=(4,0)\\) and \\(r=(3,2)\\) are drawn; the turn display is hidden.'),
        },
        {
            id: 'orientation-reveal', order: 3,
            title: text('Vrednost in predznak', 'The value and the sign'),
            purpose: text('Izračunati \\(D\\) in preveriti napoved.', 'Computing \\(D\\) and checking the prediction.'),
            explanation: text(
                'Za \\(p=(0,0)\\), \\(q=(4,0)\\), \\(r=(3,2)\\) je \\(D=(4-0)(2-0)-(0-0)(3-0)=8\\). Vrednost je pozitivna, zato je zavoj levi; trikotnik je obarvan in na grafu piše \\(+8\\).',
                'For \\(p=(0,0)\\), \\(q=(4,0)\\), \\(r=(3,2)\\) we get \\(D=(4-0)(2-0)-(0-0)(3-0)=8\\). The value is positive, so the turn is left; the triangle is shaded and the graph shows \\(+8\\).',
            ),
            formulaIds: ['orientation-determinant'], workedExampleId: 'orientation-example',
            frames: [frame('orientation-reveal-explanation', 'explanation'), frame('orientation-reveal-calculation', 'calculation'), frame('orientation-reveal-observation', 'observation')],
            observationPrompt: text('Primerjaj izpis na grafu z izračunom \\(D\\).', 'Compare the text on the graph with your computation of \\(D\\).'),
            expectedObservations: [text('Graf pokaže \\(+8\\) in levi zavoj, kar je enako izračunani vrednosti.', 'The graph shows \\(+8\\) and a left turn, equal to the computed value.')],
            scene: scene('orientation-reveal', [points([...ORIENTATION_P_Q, ORIENTATION_R_LEFT]), overlay('turn', true), overlay('values', true)],
                'Trikotnik \\(pqr\\) je obarvan za levi zavoj, vrednost je \\(+8\\).',
                'The triangle \\(pqr\\) is shaded for a left turn and the value is \\(+8\\).'),
        },
        {
            id: 'orientation-flip', order: 4,
            title: text('Premik čez premico', 'Moving across the line'),
            purpose: text('Videti, da se predznak obrne točno na premici.', 'Seeing that the sign flips exactly at the line.'),
            explanation: text(
                'Če točko \\(r\\) prestaviš na \\((3,-2)\\), je pod premico in je \\(D=-8\\): desni zavoj. Na premici sami, na primer pri \\(r=(2,0)\\), je \\(D=0\\) in točke so kolinearne. Povleci \\(r\\) navzgor in navzdol čez premico, da vidiš prehod.',
                'If you move \\(r\\) to \\((3,-2)\\), it is below the line and \\(D=-8\\): a right turn. On the line itself, for example at \\(r=(2,0)\\), we get \\(D=0\\) and the points are collinear. Drag \\(r\\) up and down across the line to see the change.',
            ),
            formulaIds: ['orientation-determinant'],
            frames: [frame('orientation-flip-explanation', 'explanation'), frame('orientation-flip-observation', 'observation')],
            observationPrompt: text('Povleci \\(r\\) čez premico in opazuj predznak in besedo za zavoj.', 'Drag \\(r\\) across the line and watch the sign and the word for the turn.'),
            expectedObservations: [text('Pod premico je vrednost \\(-8\\) (desni zavoj), na premici \\(0\\) (kolinearne točke), nad njo \\(+8\\) (levi zavoj).', 'Below the line the value is \\(-8\\) (right turn), on the line \\(0\\) (collinear), above it \\(+8\\) (left turn).')],
            scene: scene('orientation-flip', [points([...ORIENTATION_P_Q, ORIENTATION_R_RIGHT]), overlay('turn', true), overlay('values', true)],
                'Točka \\(r=(3,-2)\\) je pod premico; zavoj je desni, vrednost je \\(-8\\).',
                'The point \\(r=(3,-2)\\) is below the line; the turn is right and the value is \\(-8\\).'),
        },
        {
            id: 'orientation-area-step', order: 5,
            title: text('Dvojna ploščina trikotnika', 'Twice the area of the triangle'),
            purpose: text('Povezati \\(D\\) s ploščino trikotnika.', 'Linking \\(D\\) with the area of the triangle.'),
            explanation: text(
                'Trikotnik \\(pqr\\) z \\(r=(3,2)\\) ima osnovnico \\(4\\) in višino \\(2\\), torej ploščino \\(4\\). Dvojna ploščina je \\(8\\) in je enaka \\(D\\); pri desnem zavoju je predznak negativen. Isti račun se v ploščini večkotnika ponovi za vsak trikotnik.',
                'The triangle \\(pqr\\) with \\(r=(3,2)\\) has base \\(4\\) and height \\(2\\), so its area is \\(4\\). Twice the area is \\(8\\), equal to \\(D\\); for a right turn the sign is negative. The same computation repeats for every triangle in the area of a polygon.',
            ),
            formulaIds: ['orientation-area'],
            frames: [frame('orientation-area-step-explanation', 'explanation'), frame('orientation-area-step-observation', 'observation')],
            observationPrompt: text('Preštej kvadratke trikotnika in pomnoži ploščino z \\(2\\).', 'Count the squares of the triangle and multiply the area by \\(2\\).'),
            expectedObservations: [text('Ploščina je \\(4\\), njen dvakratnik \\(8\\) pa je enak izpisani vrednosti \\(+8\\).', 'The area is \\(4\\), and twice it, \\(8\\), equals the displayed value \\(+8\\).')],
            scene: scene('orientation-area-step', [points([...ORIENTATION_P_Q, ORIENTATION_R_LEFT]), overlay('turn', true), overlay('grid', true), overlay('values', true)],
                'Mreža je vklopljena, da lahko preštejemo ploščino trikotnika \\(4\\); vrednost je \\(+8\\).',
                'The grid is on so the area \\(4\\) of the triangle can be counted; the value is \\(+8\\).'),
        },
        {
            id: 'orientation-explore', order: 6,
            title: text('Prosto raziskovanje', 'Free exploration'),
            purpose: text('Samostojno preizkusiti zavoje in izrojen primer.', 'Trying turns and the degenerate case on your own.'),
            explanation: text(
                'Točka \\(r\\) je zdaj na premici, pri \\((2,0)\\), zato je \\(D=0\\) in točke so kolinearne. Premikaj vse tri točke (tudi s tipkovnico), poišči druge kolinearne lege in preizkusi, da zamenjava dveh točk obrne predznak.',
                'The point \\(r\\) is now on the line, at \\((2,0)\\), so \\(D=0\\) and the points are collinear. Move all three points (also with the keyboard), find other collinear positions, and check that swapping two points reverses the sign.',
            ),
            formulaIds: ['orientation-determinant', 'orientation-area'],
            frames: [frame('orientation-explore-explanation', 'explanation'), frame('orientation-explore-observation', 'observation')],
            observationPrompt: text('Poišči tri kolinearne točke, ki niso vse na osi \\(x\\).', 'Find three collinear points that are not all on the \\(x\\)-axis.'),
            expectedObservations: [text('Pri vseh kolinearnih legah izpis pokaže \\(0\\) in besedo kolinearne točke.', 'In every collinear position the readout shows \\(0\\) and the word collinear.')],
            scene: scene('orientation-explore', [points([...ORIENTATION_P_Q, ORIENTATION_R_COLLINEAR]), overlay('turn', true), overlay('values', true)],
                'Točka \\(r=(2,0)\\) je na premici \\(pq\\); vrednost je \\(0\\) in točke so kolinearne.',
                'The point \\(r=(2,0)\\) is on the line \\(pq\\); the value is \\(0\\) and the points are collinear.'),
        },
    ],
    sources: [
        {id: 'berg-orientation', citation: 'de Berg, M., Cheong, O., van Kreveld, M., Overmars, M. Computational Geometry: Algorithms and Applications, 3rd ed., Chapter 1.'},
        {
            id: 'bezeg-orientation-implementation',
            citation: 'Bezeg source: src/compgeo/predicates.ts, src/graphs/compgeo/orientationReadout.ts and src/graphs/compgeo/OrientationGraph.tsx.',
            implementationCorrespondence: 'The graph shows the exact integer determinant of the first three points; a lesson scene replaces the points and the turn overlay with the point-set actions in one synchronous tick, and scene points must be on the integer grid.',
        },
    ],
    edgeCases: [
        text('Pri \\(D=0\\) so točke kolinearne; to je izrojen primer in ga izpis označi z besedo, ne le z barvo.', 'For \\(D=0\\) the points are collinear; this is a degenerate case and the readout marks it with a word, not only a colour.'),
    ],
    unresolvedQuestions: [],
};

const polygonArea: GuidedLesson = {
    demonstrationId: 'polygon-area',
    title: text('Ploščina večkotnika in Pickov izrek', 'Polygon area and Pick\'s theorem'),
    summary: text(
        'Ploščina večkotnika je vsota predznačenih ploščin trikotnikov (obrazec z determinantami, shoelace); predznak pove smer obhoda, Pickov izrek pa ploščino poveže z mrežnimi točkami.',
        'The area of a polygon is a sum of signed triangle areas (the shoelace formula); the sign gives the direction of travel, and Pick\'s theorem relates the area to lattice points.',
    ),
    prerequisites: [
        text('Potrebno je razumevanje orientacije treh točk iz prejšnje lekcije.', 'Assumes the orientation of three points from the previous lesson.'),
    ],
    learningGoals: [
        text('Ploščino večkotnika izračunaš kot polovico vsote \\(x_iy_{i+1}-x_{i+1}y_i\\).', 'Compute the area of a polygon as half the sum of \\(x_iy_{i+1}-x_{i+1}y_i\\).'),
        text('Iz predznaka vsote ugotoviš smer obhoda oglišč.', 'Read the direction of travel of the vertices from the sign of the sum.'),
        text('Prešteješ robne in notranje mrežne točke ter preveriš Pickov izrek.', 'Count boundary and interior lattice points and check Pick\'s theorem.'),
        text('Razložiš, zakaj pri večkotniku s presečišči vsota ni ploščina.', 'Explain why for a self-intersecting polygon the sum is not an area.'),
    ],
    formulaBlocks: [
        {
            id: 'area-shoelace',
            latex: 'A=\\tfrac12\\sum_{i=0}^{n-1}\\left(x_iy_{i+1}-x_{i+1}y_i\\right),\\qquad (x_n,y_n)=(x_0,y_0)',
            notation: text(
                '\\((x_i,y_i)\\) so oglišča po vrsti; vsota brez faktorja \\(\\tfrac12\\) je dvojna predznačena ploščina.',
                '\\((x_i,y_i)\\) are the vertices in order; the sum without the factor \\(\\tfrac12\\) is twice the signed area.',
            ),
            explanation: text(
                'Vsak člen je dvojna predznačena ploščina trikotnika iz izhodišča; pri vsoti se deli zunaj večkotnika odštejejo. Pozitivna vsota pomeni obhod v nasprotni smeri urinega kazalca.',
                'Each term is twice the signed area of a triangle from the origin; the parts outside the polygon cancel in the sum. A positive sum means travel counter-clockwise.',
            ),
        },
        {
            id: 'area-pick',
            latex: 'A=I+\\frac{B}{2}-1',
            notation: text(
                '\\(I\\) je število notranjih, \\(B\\) pa število robnih mrežnih točk enostavnega večkotnika z oglišči v mreži.',
                '\\(I\\) is the number of interior and \\(B\\) the number of boundary lattice points of a simple polygon with vertices on the lattice.',
            ),
            explanation: text(
                'Število \\(B\\) dobimo kot vsoto največjih skupnih deliteljev razlik koordinat po robovih. Notranje točke preštejemo neodvisno in nato primerjamo \\(2I+B-2\\) z dvojno ploščino.',
                'The number \\(B\\) is the sum of the gcds of the coordinate differences along the edges. The interior points are counted independently and \\(2I+B-2\\) is then compared with twice the area.',
            ),
        },
    ],
    workedExamples: [
        {
            id: 'area-shoelace-example',
            title: text('Petkotnik \\((-1,3),(0,0),(4,0),(5,3),(2,5)\\)', 'The pentagon \\((-1,3),(0,0),(4,0),(5,3),(2,5)\\)'),
            calculationLatex: '0+0+12+19+11=42,\\qquad A=\\tfrac{42}{2}',
            resultLatex: 'A=21',
            check: text(
                'Odčitek pod grafom pokaže dvojno predznačeno ploščino \\(42\\) in ploščino \\(21\\).',
                'The readout under the graph shows the doubled signed area \\(42\\) and the area \\(21\\).',
            ),
        },
        {
            id: 'area-pick-example',
            title: text('Petkotnik z zarezo \\((0,0),(6,0),(6,4),(3,2),(0,4)\\)', 'The notched pentagon \\((0,0),(6,0),(6,4),(3,2),(0,4)\\)'),
            calculationLatex: '2I+B-2=2\\cdot11+16-2=36',
            resultLatex: 'A=\\tfrac{36}{2}=18',
            check: text(
                'Odčitek pokaže \\(B=16\\), \\(I=11\\) in dvojno ploščino \\(36\\), torej \\(2I+B-2\\) se ujema.',
                'The readout shows \\(B=16\\), \\(I=11\\) and the doubled area \\(36\\), so \\(2I+B-2\\) agrees.',
            ),
        },
    ],
    steps: [
        {
            id: 'area-fan', order: 1,
            title: text('Trikotniki iz prvega oglišča', 'Triangles from the first vertex'),
            purpose: text('Večkotnik razrezati na trikotnike.', 'Cutting the polygon into triangles.'),
            explanation: text(
                'Petkotnik z oglišči \\((-1,3),(0,0),(4,0),(5,3),(2,5)\\) razrežemo na trikotnike iz prvega oglišča. Vsak trikotnik ima dvojno predznačeno ploščino \\(D\\), kakor v prejšnji lekciji.',
                'The pentagon with vertices \\((-1,3),(0,0),(4,0),(5,3),(2,5)\\) is cut into triangles from the first vertex. Each triangle has a doubled signed area \\(D\\), as in the previous lesson.',
            ),
            formulaIds: ['area-shoelace'],
            frames: [frame('area-fan-explanation', 'explanation'), frame('area-fan-observation', 'observation')],
            observationPrompt: text('Koliko trikotnikov nastane in ali skupaj pokrijejo ves petkotnik?', 'How many triangles are there, and do they cover the whole pentagon together?'),
            expectedObservations: [text('Trije trikotniki iz prvega oglišča skupaj pokrijejo petkotnik brez prekrivanja, zato je ploščina petkotnika vsota njihovih ploščin. Številske vrednosti so v tem koraku skrite.', 'Three triangles from the first vertex cover the pentagon without overlapping, so the area of the pentagon is the sum of their areas. The numeric values are hidden in this step.')],
            scene: scene('area-fan', [polygon(AREA_HULL_PENTAGON), overlay('fan', true), overlay('lattice', false), overlay('values', false)],
                'Petkotnik je razrezan na tri trikotnike iz prvega oglišča; številske vrednosti so skrite.',
                'The pentagon is cut into three triangles from the first vertex; the numeric values are hidden.'),
        },
        {
            id: 'area-predict', order: 2,
            title: text('Napovej ploščino', 'Predict the area'),
            purpose: text('Oceniti ploščino pred izračunom.', 'Estimating the area before computing it.'),
            explanation: text(
                'Trikotniki so skriti, mreža je vklopljena. Preštej kvadratke in oceni ploščino petkotnika, preden jo izračunamo. Številske vrednosti so v tem koraku skrite.',
                'The triangles are hidden and the grid is on. Count squares and estimate the area of the pentagon before we compute it. The numeric values are hidden in this step.',
            ),
            formulaIds: [],
            frames: [frame('area-predict-explanation', 'explanation'), frame('area-predict-observation', 'observation')],
            observationPrompt: text('Zapiši svojo oceno ploščine.', 'Write down your estimate of the area.'),
            expectedObservations: [text('Petkotnik je širok \\(6\\) in visok \\(5\\), zato je ploščina manjša od \\(30\\); naslednji korak pokaže natančno vrednost \\(21\\).', 'The pentagon is \\(6\\) wide and \\(5\\) tall, so its area is less than \\(30\\); the next step shows the exact value \\(21\\).')],
            scene: scene('area-predict', [polygon(AREA_HULL_PENTAGON), overlay('fan', false), overlay('lattice', false), overlay('grid', true), overlay('values', false)],
                'Petkotnik je narisan z mrežo, brez trikotnikov in mrežnih točk.',
                'The pentagon is drawn with the grid, without triangles and lattice points.'),
        },
        {
            id: 'area-shoelace-step', order: 3,
            title: text('Obrazec z determinantami (shoelace)', 'The shoelace formula'),
            purpose: text('Ploščino izračunati z vsoto \\(x_iy_{i+1}-x_{i+1}y_i\\).', 'Computing the area with the sum of \\(x_iy_{i+1}-x_{i+1}y_i\\).'),
            explanation: text(
                'Vsota \\(x_iy_{i+1}-x_{i+1}y_i\\) po vseh robovih je \\(0+0+12+19+11=42\\), ploščina pa polovica: \\(A=21\\). Vsota je pozitivna, ker si oglišča sledijo v nasprotni smeri urinega kazalca.',
                'The sum of \\(x_iy_{i+1}-x_{i+1}y_i\\) over all edges is \\(0+0+12+19+11=42\\), and the area is half of it: \\(A=21\\). The sum is positive because the vertices follow each other counter-clockwise.',
            ),
            formulaIds: ['area-shoelace'], workedExampleId: 'area-shoelace-example',
            frames: [frame('area-shoelace-step-explanation', 'explanation'), frame('area-shoelace-step-calculation', 'calculation'), frame('area-shoelace-step-observation', 'observation')],
            observationPrompt: text('Primerjaj napoved z izpisano ploščino.', 'Compare your prediction with the displayed area.'),
            expectedObservations: [text('Izpis pokaže dvojno predznačeno ploščino \\(42\\) in ploščino \\(21\\).', 'The readout shows the doubled signed area \\(42\\) and the area \\(21\\).')],
            scene: scene('area-shoelace-step', [polygon(AREA_HULL_PENTAGON), overlay('fan', true), overlay('lattice', false), overlay('values', true)],
                'Dvojna predznačena ploščina je \\(42\\), ploščina \\(21\\), obhod v nasprotni smeri urinega kazalca.',
                'The doubled signed area is \\(42\\), the area is \\(21\\), and the travel is counter-clockwise.'),
        },
        {
            id: 'area-reverse', order: 4,
            title: text('Obrnjen vrstni red', 'Reversed order'),
            purpose: text('Videti, da predznak pove smer obhoda.', 'Seeing that the sign gives the direction of travel.'),
            explanation: text(
                'Če isti petkotnik obhodimo v obratnem vrstnem redu, se vsi členi zamenjajo po predznaku in je vsota \\(-42\\). Ploščina \\(21\\) ostane, saj je ploščina absolutna vrednost; predznak zdaj pove obhod v smeri urinega kazalca.',
                'If we travel round the same pentagon in the opposite order, every term changes sign and the sum is \\(-42\\). The area \\(21\\) stays, since the area is the absolute value; the sign now says the travel is clockwise.',
            ),
            formulaIds: ['area-shoelace'],
            frames: [frame('area-reverse-explanation', 'explanation'), frame('area-reverse-observation', 'observation')],
            observationPrompt: text('Pritisni Obrni vrstni red in opazuj predznak.', 'Press Reverse order and watch the sign.'),
            expectedObservations: [text('Dvojna predznačena ploščina je \\(-42\\), ploščina pa še vedno \\(21\\).', 'The doubled signed area is \\(-42\\), and the area is still \\(21\\).')],
            scene: scene('area-reverse', [polygon(AREA_HULL_PENTAGON_REVERSED), overlay('fan', true), overlay('lattice', false), overlay('values', true)],
                'Oglišča so v obratnem vrstnem redu: dvojna predznačena ploščina je \\(-42\\), ploščina \\(21\\).',
                'The vertices are in reverse order: the doubled signed area is \\(-42\\) and the area is \\(21\\).'),
        },
        {
            id: 'area-pick-step', order: 5,
            title: text('Pickov izrek', 'Pick\'s theorem'),
            purpose: text('Ploščino primerjati s številom robnih in notranjih mrežnih točk.', 'Comparing the area with the numbers of boundary and interior lattice points.'),
            explanation: text(
                'Petkotnik z zarezo \\((0,0),(6,0),(6,4),(3,2),(0,4)\\) ima \\(B=16\\) robnih in \\(I=11\\) notranjih mrežnih točk. Tedaj je \\(2I+B-2=2\\cdot11+16-2=36\\), kar je enako dvojni ploščini; torej je \\(A=11+8-1=18\\). Prejšnji petkotnik ima \\(B=8\\) in \\(I=18\\), torej \\(18+4-1=21\\).',
                'The notched pentagon \\((0,0),(6,0),(6,4),(3,2),(0,4)\\) has \\(B=16\\) boundary and \\(I=11\\) interior lattice points. Then \\(2I+B-2=2\\cdot11+16-2=36\\), equal to the doubled area; so \\(A=11+8-1=18\\). The previous pentagon has \\(B=8\\) and \\(I=18\\), so \\(18+4-1=21\\).',
            ),
            formulaIds: ['area-pick'], workedExampleId: 'area-pick-example',
            frames: [frame('area-pick-step-explanation', 'explanation'), frame('area-pick-step-calculation', 'calculation'), frame('area-pick-step-observation', 'observation')],
            observationPrompt: text('Preštej robne in notranje točke ter primerjaj z izpisom.', 'Count the boundary and interior points and compare with the readout.'),
            expectedObservations: [text('Izpis pokaže \\(B=16\\), \\(I=11\\), dvojno ploščino \\(36\\) in ujemanje s Pickovim izrekom.', 'The readout shows \\(B=16\\), \\(I=11\\), the doubled area \\(36\\), and the agreement with Pick\'s theorem.')],
            scene: scene('area-pick-step', [polygon(AREA_NOTCHED_PENTAGON), overlay('fan', false), overlay('lattice', true), overlay('values', true)],
                'Mrežne točke so označene: \\(B=16\\), \\(I=11\\), dvojna ploščina \\(36\\).',
                'The lattice points are marked: \\(B=16\\), \\(I=11\\), doubled area \\(36\\).'),
        },
        {
            id: 'area-self-intersecting', order: 6,
            title: text('Večkotnik s presečiščem', 'A self-intersecting polygon'),
            purpose: text('Spoznati, kdaj vsota ni ploščina.', 'Learning when the sum is not an area.'),
            explanation: text(
                'Pri metuljčku z oglišči \\((0,0),(4,4),(4,0),(0,4)\\) se rob seka sam s sabo. Vsota je \\(0\\), čeprav lik ni brez ploščine: dva dela imata nasprotni smeri obhoda in se odštejeta. Vsota je zato predznačena vsota ovojnega števila in ploščine, ne ploščina, in Pickovega izreka ne ponudimo.',
                'In the bow tie with vertices \\((0,0),(4,4),(4,0),(0,4)\\) the boundary crosses itself. The sum is \\(0\\) although the figure has area: the two parts have opposite directions of travel and cancel. The sum is therefore a signed sum of winding number times area, not an area, and Pick\'s theorem is not offered.',
            ),
            formulaIds: ['area-shoelace'],
            frames: [frame('area-self-intersecting-explanation', 'explanation'), frame('area-self-intersecting-observation', 'observation')],
            observationPrompt: text('Premakni eno oglišče in opazuj, kdaj se izpis spremeni v ploščino.', 'Move one vertex and watch when the readout changes back to an area.'),
            expectedObservations: [text('Izpis pokaže predznačeno vsoto \\(0\\) z opombo, da večkotnik ni enostaven.', 'The readout shows the signed sum \\(0\\) with a note that the polygon is not simple.')],
            scene: scene('area-self-intersecting', [polygon(AREA_BOW_TIE), overlay('fan', true), overlay('lattice', false), overlay('values', true)],
                'Večkotnik se seka sam s sabo: predznačena vsota je \\(0\\), Pickovega izreka ni.',
                'The polygon crosses itself: the signed sum is \\(0\\) and there is no Pick\'s theorem.'),
        },
        {
            id: 'area-explore', order: 7,
            title: text('Prosto raziskovanje', 'Free exploration'),
            purpose: text('Samostojno preizkusiti ploščino in Pickov izrek.', 'Trying area and Pick\'s theorem on your own.'),
            explanation: text(
                'Spet je petkotnik s ploščino \\(21\\), \\(B=8\\) in \\(I=18\\), s trikotniki in mrežnimi točkami. Premikaj oglišča po mreži, dodajaj jih ali jih odstrani in opazuj, kdaj se Pickov izrek ujema in kdaj izpis ne ponudi ploščine.',
                'The pentagon with area \\(21\\), \\(B=8\\) and \\(I=18\\) is back, with triangles and lattice points. Move vertices on the grid, add or remove them, and watch when Pick\'s theorem agrees and when the readout offers no area.',
            ),
            formulaIds: ['area-shoelace', 'area-pick'],
            frames: [frame('area-explore-explanation', 'explanation'), frame('area-explore-observation', 'observation')],
            observationPrompt: text('Poišči večkotnik, katerega ploščina je celo število, in drugega, katerega ni.', 'Find a polygon whose area is a whole number and another whose is not.'),
            expectedObservations: [text('Pri vsakem enostavnem večkotniku se \\(2I+B-2\\) ujema z dvojno ploščino.', 'For every simple polygon, \\(2I+B-2\\) agrees with the doubled area.')],
            scene: scene('area-explore', [polygon(AREA_HULL_PENTAGON), overlay('fan', true), overlay('lattice', true), overlay('values', true)],
                'Petkotnik s ploščino \\(21\\), \\(B=8\\) in \\(I=18\\) je prikazan s trikotniki in mrežnimi točkami.',
                'The pentagon with area \\(21\\), \\(B=8\\) and \\(I=18\\) is shown with triangles and lattice points.'),
        },
    ],
    sources: [
        {id: 'berg-area', citation: 'de Berg, M., Cheong, O., van Kreveld, M., Overmars, M. Computational Geometry: Algorithms and Applications, 3rd ed., Chapter 1.'},
        {id: 'pick-1899', citation: 'Pick, G. Geometrisches zur Zahlenlehre, 1899.'},
        {
            id: 'bezeg-area-implementation',
            citation: 'Bezeg source: src/compgeo/polygonMeasures.ts, src/graphs/compgeo/areaReadout.ts and src/graphs/compgeo/PolygonAreaGraph.tsx.',
            implementationCorrespondence: 'The boundary count uses edge gcds and the interior count is a separate scan, so Pick\'s value is compared with the area, not derived from it; a lesson scene replaces the vertices and the overlays with the point-set actions in one synchronous tick, and scene points must be on the integer grid.',
        },
    ],
    edgeCases: [
        text('Pri večkotniku s presečišči vsota ni ploščina in Pickov izrek ne velja.', 'For a self-intersecting polygon the sum is not an area and Pick\'s theorem does not apply.'),
    ],
    unresolvedQuestions: [],
};

const convexHull: GuidedLesson = {
    demonstrationId: 'convex-hull',
    title: text('Konveksna ovojnica', 'Convex hull'),
    summary: text(
        'Konveksno ovojnico devetih točk zgradimo z orientacijskimi preizkusi na tri načine: s počasnim preizkusom robov (\\(504\\) preizkusov), z monotono verigo (\\(23\\)) in z ovijanjem (\\(35\\)); vsi dobijo isto ovojnico s petimi oglišči.',
        'We build the convex hull of nine points from orientation tests in three ways: the slow edge test (\\(504\\) tests), the monotone chain (\\(23\\)) and gift wrapping (\\(35\\)); all of them give the same hull with five vertices.',
    ),
    prerequisites: [
        text('Potrebna je lekcija o orientaciji treh točk: predznak vrednosti \\(D\\) pove levi ali desni zavoj.', 'The lesson on the orientation of three points is required: the sign of \\(D\\) tells a left or a right turn.'),
        text('Priporočeno, vendar ne nujno, je poznavanje konveksne ovojnice kontrolnega poligona iz poglavja o Bézierjevih krivuljah.', 'Familiarity with the convex hull of a control polygon from the Bézier chapter helps but is not required.'),
    ],
    learningGoals: [
        text('Pojasniš, kdaj je usmerjen par točk rob ovojnice, in to preveriš z orientacijskimi preizkusi.', 'Explain when a directed pair of points is a hull edge, and check it with orientation tests.'),
        text('Slediš monotoni verigi po korakih in razložiš, zakaj desni zavoj in kolinearne točke odstranijo srednjo točko.', 'Follow the monotone chain step by step and explain why a right turn and collinear points remove the middle point.'),
        text('Primerjaš število orientacijskih preizkusov treh algoritmov na istih točkah.', 'Compare the number of orientation tests of the three algorithms on the same points.'),
    ],
    formulaBlocks: [
        {
            id: 'hull-edge-rule',
            latex: 'D(a,b,c)=(b_x-a_x)(c_y-a_y)-(b_y-a_y)(c_x-a_x)',
            notation: text(
                '\\(a\\), \\(b\\), \\(c\\) so točke z celimi koordinatami; \\(D>0\\) pomeni levi zavoj, \\(D<0\\) desnega, \\(D=0\\) kolinearne točke.',
                '\\(a\\), \\(b\\), \\(c\\) are points with integer coordinates; \\(D>0\\) means a left turn, \\(D<0\\) a right turn and \\(D=0\\) collinear points.',
            ),
            explanation: text(
                'Usmerjen par \\((a,b)\\) je rob ovojnice (v nasprotni smeri urinega kazalca), če za vsako drugo točko \\(c\\) velja \\(D(a,b,c)>0\\) ali pa \\(c\\) leži na daljici \\(ab\\). Vsi trije algoritmi uporabljajo samo ta preizkus.',
                'A directed pair \\((a,b)\\) is a hull edge (counter-clockwise) if for every other point \\(c\\) we have \\(D(a,b,c)>0\\) or \\(c\\) lies on the segment \\(ab\\). All three algorithms use only this test.',
            ),
        },
        {
            id: 'hull-test-counts',
            latex: 'T_{\\text{slow}}=n(n-1)(n-2),\\qquad T_{\\text{wrap}}=h\\,(n-2)',
            notation: text(
                '\\(n\\) je število točk, \\(h\\) število ovojničnih oglišč, \\(T\\) število orientacijskih preizkusov.',
                '\\(n\\) is the number of points, \\(h\\) the number of hull vertices and \\(T\\) the number of orientation tests.',
            ),
            explanation: text(
                'Počasni preizkus preveri vsak od \\(n(n-1)\\) urejenih parov z vsemi drugimi \\(n-2\\) točkami. Ovijanje pri vsakem od \\(h\\) ovojev primerja preostalih \\(n-2\\) točk s kandidatom. Monotona veriga potrebuje na teh točkah \\(23\\) preizkusov.',
                'The slow test checks each of the \\(n(n-1)\\) ordered pairs against the other \\(n-2\\) points. Gift wrapping, in each of its \\(h\\) wraps, compares the remaining \\(n-2\\) points with the candidate. The monotone chain needs \\(23\\) tests on these points.',
            ),
        },
    ],
    workedExamples: [
        {
            id: 'hull-pop-example',
            title: text('Desni zavoj: točke \\((0,0)\\), \\((1,1)\\), \\((2,0)\\)', 'A right turn: the points \\((0,0)\\), \\((1,1)\\), \\((2,0)\\)'),
            calculationLatex: 'D=(1-0)(0-0)-(1-0)(2-0)=0-2',
            resultLatex: 'D=-2',
            check: text(
                'Ko monotona veriga preizkusi točko \\((2,0)\\), izpis pokaže \\(-2\\): desni zavoj, zato točko \\((1,1)\\) odstrani.',
                'When the monotone chain tests the point \\((2,0)\\), the readout shows \\(-2\\): a right turn, so it removes the point \\((1,1)\\).',
            ),
        },
        {
            id: 'hull-collinear-example',
            title: text('Kolinearne točke \\((2,0)\\), \\((2,2)\\), \\((2,5)\\)', 'The collinear points \\((2,0)\\), \\((2,2)\\), \\((2,5)\\)'),
            calculationLatex: 'D=(2-2)(5-0)-(2-0)(2-2)=0-0',
            resultLatex: 'D=0',
            check: text(
                'Pri preizkusu točke \\((2,5)\\) izpis pokaže \\(0\\): točke so kolinearne in veriga srednjo točko \\((2,2)\\) odstrani.',
                'When the point \\((2,5)\\) is tested the readout shows \\(0\\): the points are collinear and the chain removes the middle point \\((2,2)\\).',
            ),
        },
        {
            id: 'hull-count-example',
            title: text('Število preizkusov', 'The number of tests'),
            calculationLatex: 'T_{\\text{slow}}=9\\cdot8\\cdot7=504,\\quad T_{\\text{wrap}}=5\\cdot7=35',
            resultLatex: 'T_{\\text{slow}}=504,\\; T_{\\text{wrap}}=35',
            check: text(
                'Vrstica s števili pod grafom pokaže \\(504\\) za počasni preizkus in \\(35\\) za ovijanje.',
                'The row of counts under the graph shows \\(504\\) for the slow test and \\(35\\) for gift wrapping.',
            ),
        },
    ],
    steps: [
        {
            id: 'hull-slow-intro', order: 1,
            title: text('Počasen preizkus robov', 'The slow edge test'),
            purpose: text('Spoznati definicijo roba ovojnice.', 'Meeting the definition of a hull edge.'),
            explanation: text(
                'Imamo devet točk. Usmerjen par \\((a,b)\\) je rob ovojnice, če so vse druge točke levo od njega ali na daljici \\(ab\\). Počasen preizkus to preveri za vsak urejen par: \\(9\\cdot8=72\\) parov, vsakega z \\(7\\) drugimi točkami. To je učni algoritem, ne priporočen način.',
                'We have nine points. A directed pair \\((a,b)\\) is a hull edge if all the other points are to its left or on the segment \\(ab\\). The slow test checks this for every ordered pair: \\(9\\cdot8=72\\) pairs, each against \\(7\\) other points. It is a teaching algorithm, not a recommended method.',
            ),
            formulaIds: ['hull-edge-rule'],
            frames: [frame('hull-slow-intro-explanation', 'explanation'), frame('hull-slow-intro-observation', 'observation')],
            observationPrompt: text('Poglej, katere točke so po tvoji presoji na robu množice.', 'Look at which points seem to you to be on the outside of the set.'),
            expectedObservations: [text('Sled je na začetku (korak \\(1\\)) in nobenega roba še ni sprejetega.', 'The trace is at its start (step \\(1\\)) and no edge has been accepted yet.')],
            scene: scene('hull-slow-intro', [algorithm('slow-edge-test'), overlay('trace', true), overlay('hull', true)],
                'Izbran je počasen preizkus robov na devetih točkah; sled je na koraku \\(1\\).',
                'The slow edge test is selected on the nine points; the trace is at step \\(1\\).'),
        },
        {
            id: 'hull-slow-predict', order: 2,
            title: text('Napovej robove', 'Predict the edges'),
            purpose: text('Pred razkritjem napovedati, kateri pari so robovi.', 'Predicting which pairs are edges before the reveal.'),
            explanation: text(
                'Preden prikažeš sled, napovej: koliko usmerjenih parov ima vse druge točke levo ali na daljici? Namig: točka \\((2,0)\\) leži na daljici med \\((0,0)\\) in \\((4,0)\\); ali je zato par \\((0,0)\\), \\((4,0)\\) še vedno rob?',
                'Before you show the trace, predict: how many directed pairs have all other points on the left or on the segment? Hint: the point \\((2,0)\\) lies on the segment between \\((0,0)\\) and \\((4,0)\\); is the pair \\((0,0)\\), \\((4,0)\\) still an edge?',
            ),
            formulaIds: ['hull-edge-rule'],
            frames: [frame('hull-slow-predict-explanation', 'explanation'), frame('hull-slow-predict-observation', 'observation')],
            observationPrompt: text('Zapiši število robov, ki jih pričakuješ.', 'Write down the number of edges you expect.'),
            expectedObservations: [text('Sled in ovojnica sta skrita, zato napoved še ni preverjena; v naslednjem koraku jo primerjamo.', 'The trace and the hull are hidden, so the prediction is not yet checked; the next step compares it.')],
            scene: scene('hull-slow-predict', [algorithm('slow-edge-test'), overlay('trace', false), overlay('hull', false)],
                'Sled in ovojnica sta skrita; počasen preizkus je na koraku \\(1\\).',
                'The trace and the hull are hidden; the slow test is at step \\(1\\).'),
        },
        {
            id: 'hull-slow-reveal', order: 3,
            title: text('Razkritje robov', 'Revealing the edges'),
            purpose: text('Preveriti napoved in prešteti preizkuse.', 'Checking the prediction and counting the tests.'),
            explanation: text(
                'Sled je izvedena do konca: sprejetih je \\(5\\) usmerjenih robov in uporabljenih je \\(9\\cdot8\\cdot7=504\\) orientacijskih preizkusov. Par \\((0,0)\\), \\((4,0)\\) je rob, ker točka \\((2,0)\\) leži na daljici; ta točka pa ni oglišče ovojnice.',
                'The trace has run to the end: \\(5\\) directed edges are accepted and \\(9\\cdot8\\cdot7=504\\) orientation tests were used. The pair \\((0,0)\\), \\((4,0)\\) is an edge because \\((2,0)\\) lies on the segment; that point is not a hull vertex.',
            ),
            formulaIds: ['hull-test-counts'], workedExampleId: 'hull-count-example',
            frames: [frame('hull-slow-reveal-explanation', 'explanation'), frame('hull-slow-reveal-calculation', 'calculation'), frame('hull-slow-reveal-observation', 'observation')],
            observationPrompt: text('Primerjaj število robov z napovedjo in preberi števec preizkusov.', 'Compare the number of edges with your prediction and read the test counter.'),
            expectedObservations: [text('Števec pokaže \\(504\\), narisanih je pet robov in ovojnica ima pet oglišč.', 'The counter shows \\(504\\), five edges are drawn and the hull has five vertices.')],
            scene: scene('hull-slow-reveal', [algorithm('slow-edge-test'), overlay('trace', true), overlay('hull', true), ...nextSteps(HULL_TRACE_STEPS.slowEnd)],
                'Počasen preizkus je na koncu: \\(5\\) sprejetih robov in \\(504\\) preizkusov.',
                'The slow test is at its end: \\(5\\) accepted edges and \\(504\\) tests.'),
        },
        {
            id: 'hull-monotone-chain', order: 4,
            title: text('Monotona veriga', 'The monotone chain'),
            purpose: text('Slediti vstavljanju in odstranjevanju točk po korakih.', 'Following the pushes and the removals step by step.'),
            explanation: text(
                'Točke uredimo po \\(x\\), nato po \\(y\\) in jih dodajamo spodnji verigi. Po petih korakih (že narejenih) izpis pokaže preizkus točke \\((2,0)\\) z vrednostjo \\(-2\\): desni zavoj. Pritisni Naslednji korak še enkrat in točka \\((1,1)\\) izpade. Nadaljuj do enajstega koraka: pri točki \\((2,5)\\) je vrednost \\(0\\), točke so kolinearne, in z enim korakom več izpade še \\((2,2)\\), ker ni oglišče.',
                'We sort the points by \\(x\\), then by \\(y\\), and add them to the lower chain. After five steps (already done) the readout shows the test of the point \\((2,0)\\) with value \\(-2\\): a right turn. Press Next step once more and the point \\((1,1)\\) is removed. Continue to step eleven: at the point \\((2,5)\\) the value is \\(0\\), the points are collinear, and one more step removes \\((2,2)\\), because it is not a vertex.',
            ),
            formulaIds: ['hull-edge-rule'], workedExampleId: 'hull-pop-example',
            frames: [frame('hull-monotone-chain-explanation', 'explanation'), frame('hull-monotone-chain-calculation', 'calculation'), frame('hull-monotone-chain-observation', 'observation')],
            observationPrompt: text('Pritiskaj Naslednji korak in pri vsakem preizkusu povej, ali točka ostane ali izpade.', 'Press Next step and, at each test, say whether the point stays or is removed.'),
            expectedObservations: [text('Vrednost \\(-2\\) pri točki \\((2,0)\\) odstrani \\((1,1)\\); vrednost \\(0\\) pri točki \\((2,5)\\) odstrani \\((2,2)\\). Odstranitev pri vrednosti natanko \\(0\\) pokaže, da kolinearne točke potrebujejo pravilo.', 'The value \\(-2\\) at the point \\((2,0)\\) removes \\((1,1)\\); the value \\(0\\) at the point \\((2,5)\\) removes \\((2,2)\\). The removal on a value of exactly \\(0\\) shows why collinear points need a rule.')],
            scene: scene('hull-monotone-chain', [algorithm('monotone-chain'), overlay('trace', true), overlay('hull', true), ...nextSteps(HULL_TRACE_STEPS.popTest)],
                'Monotona veriga je po petih korakih: izpis pokaže preizkus točke \\((2,0)\\) z vrednostjo \\(-2\\).',
                'The monotone chain is after five steps: the readout shows the test of the point \\((2,0)\\) with value \\(-2\\).'),
        },
        {
            id: 'hull-gift-wrapping', order: 5,
            title: text('Ovijanje', 'Gift wrapping'),
            purpose: text('Primerjati drugačen algoritem na istih točkah.', 'Comparing a different algorithm on the same points.'),
            explanation: text(
                'Ovijanje začne pri skrajno levi točki \\((-1,3)\\). Za prvi ovoj vzame prvo od ostalih osmih točk za kandidata in z \\(7\\) preizkusi primerja preostale točke; kandidat po tem je naslednje oglišče, \\((0,0)\\). Isto ponovi za vsako oglišče, torej petkrat.',
                'Gift wrapping starts at the leftmost point \\((-1,3)\\). For the first wrap it takes the first of the other eight points as the candidate and compares the remaining points with it in \\(7\\) tests; the candidate after that is the next vertex, \\((0,0)\\). It repeats this for every vertex, so five times.',
            ),
            formulaIds: ['hull-test-counts'],
            frames: [frame('hull-gift-wrapping-explanation', 'explanation'), frame('hull-gift-wrapping-observation', 'observation')],
            observationPrompt: text('Pritiskaj Naslednji korak in opazuj, kako kandidat potuje med točkami.', 'Press Next step and watch the candidate travel among the points.'),
            expectedObservations: [text('Po sedmih preizkusih je prvi rob \\((-1,3)\\to(0,0)\\) sprejet.', 'After seven tests the first edge \\((-1,3)\\to(0,0)\\) is accepted.')],
            scene: scene('hull-gift-wrapping', [algorithm('gift-wrapping'), overlay('trace', true), overlay('hull', true), ...nextSteps(HULL_TRACE_STEPS.wrapFirst)],
                'Ovijanje je po prvem ovoju: sprejet je rob \\((-1,3)\\to(0,0)\\) po \\(7\\) preizkusih.',
                'Gift wrapping is after the first wrap: the edge \\((-1,3)\\to(0,0)\\) is accepted after \\(7\\) tests.'),
        },
        {
            id: 'hull-counts', order: 6,
            title: text('Primerjava števila preizkusov', 'Comparing the test counts'),
            purpose: text('Primerjati ceno treh algoritmov na istih točkah.', 'Comparing the cost of the three algorithms on the same points.'),
            explanation: text(
                'Ovijanje je zdaj končano: pet ovojev po \\(7\\) preizkusov je \\(35\\). Vrstica s števili pod grafom navaja vse tri: počasen preizkus \\(504\\), monotona veriga \\(23\\), ovijanje \\(35\\). Vsi trije dobijo isto ovojnico s petimi oglišči. Ovijanje je odvisno od števila oglišč \\(h\\), počasen preizkus raste kot \\(n^3\\).',
                'Gift wrapping is now finished: five wraps of \\(7\\) tests make \\(35\\). The row of counts under the graph lists all three: slow test \\(504\\), monotone chain \\(23\\), gift wrapping \\(35\\). All three get the same hull with five vertices. Gift wrapping depends on the number of hull vertices \\(h\\), while the slow test grows like \\(n^3\\).',
            ),
            formulaIds: ['hull-test-counts'], workedExampleId: 'hull-count-example',
            frames: [frame('hull-counts-explanation', 'explanation'), frame('hull-counts-calculation', 'calculation'), frame('hull-counts-observation', 'observation')],
            observationPrompt: text('Preberi vrstico s števili in določi, kateri algoritem potrebuje najmanj preizkusov.', 'Read the row of counts and say which algorithm needs the fewest tests.'),
            expectedObservations: [text('Najmanj preizkusov (\\(23\\)) potrebuje monotona veriga; vsi trije končajo z ovojnico s petimi oglišči.', 'The monotone chain needs the fewest tests (\\(23\\)); all three end with a five-vertex hull.')],
            scene: scene('hull-counts', [algorithm('gift-wrapping'), overlay('trace', true), overlay('hull', true), ...nextSteps(HULL_TRACE_STEPS.wrapEnd)],
                'Ovijanje je končano: \\(35\\) preizkusov, ovojnica s petimi oglišči; vrstica s števili navaja \\(504\\), \\(23\\) in \\(35\\).',
                'Gift wrapping is finished: \\(35\\) tests and a hull with five vertices; the row of counts lists \\(504\\), \\(23\\) and \\(35\\).'),
        },
        {
            id: 'hull-explore', order: 7,
            title: text('Prosto raziskovanje', 'Free exploration'),
            purpose: text('Samostojno preizkusiti algoritme in izrojene primere.', 'Trying the algorithms and degenerate cases on your own.'),
            explanation: text(
                'Sled je na začetku in predvajanje je ustavljeno. Dodajaj, odstranjuj in premikaj točke (tudi s tipkovnico), zamenjaj algoritem in opazuj, kako se števila preizkusov spremenijo. Poskusi dodati točko na rob ovojnice ali vse točke na eno premico.',
                'The trace is at its start and playback is stopped. Add, remove and move points (also with the keyboard), switch the algorithm and watch how the test counts change. Try adding a point on a hull edge, or putting all the points on one line.',
            ),
            formulaIds: ['hull-edge-rule', 'hull-test-counts'],
            frames: [frame('hull-explore-explanation', 'explanation'), frame('hull-explore-observation', 'observation')],
            observationPrompt: text('Dodaj točko na rob ovojnice in preveri, ali postane oglišče.', 'Add a point on a hull edge and check whether it becomes a vertex.'),
            expectedObservations: [text('Točka na robu ovojnice ni oglišče; vsaka sprememba točk ponastavi sled na korak \\(1\\) in ustavi predvajanje.', 'A point on a hull edge is not a vertex; every edit returns the trace to step \\(1\\) and stops playback.')],
            scene: scene('hull-explore', [algorithm('monotone-chain'), overlay('trace', true), overlay('hull', true)],
                'Monotona veriga je na koraku \\(1\\) na devetih točkah; predvajanje je ustavljeno.',
                'The monotone chain is at step \\(1\\) on the nine points; playback is stopped.'),
        },
    ],
    sources: [
        {id: 'berg-hull', citation: 'de Berg, M., Cheong, O., van Kreveld, M., Overmars, M. Computational Geometry: Algorithms and Applications, 3rd ed., Chapter 1.'},
        {id: 'andrew-1979', citation: 'Andrew, A. M. Another efficient algorithm for convex hulls in two dimensions, Information Processing Letters 9 (1979).'},
        {id: 'jarvis-1973', citation: 'Jarvis, R. A. On the identification of the convex hull of a finite set of points in the plane, Information Processing Letters 2 (1973).'},
        {
            id: 'bezeg-hull-implementation',
            citation: 'Bezeg source: src/compgeo/predicates.ts, src/graphs/compgeo/hullTraceRun.ts and src/graphs/compgeo/HullTraceGraph.tsx.',
            implementationCorrespondence: 'All three traces use the exact integer orientation test and count every test; a lesson scene selects the algorithm and presses Next step with the algorithm-trace animation actions in one synchronous tick, the same transition as the button, and playback is never started by a scene.',
        },
    ],
    edgeCases: [
        text('Kolinearne točke: monotona veriga pri vrednosti \\(0\\) srednjo točko odstrani, zato točke na robu niso oglišča.', 'Collinear points: at the value \\(0\\) the monotone chain removes the middle point, so points on an edge are not vertices.'),
    ],
    unresolvedQuestions: [],
};

export const compgeoGuidedLessons: readonly GuidedLesson[] = [orientation, polygonArea, convexHull];
