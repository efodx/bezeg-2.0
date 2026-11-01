/**
 * Guided lessons of the Computational geometry family: convexity and hulls (docs/specs/convexity-hulls-lessons.md, A1, A2, A4) and ear clipping (docs/specs/triangulation-voronoi-lessons.md, B1) and the interval sweep (docs/specs/sweep-algorithms-lessons.md, C1).
 * The text is a one-shot draft (docs/specs/new-lesson-families.md, "One-shot lesson text"): every value it quotes is the readout of
 * the scene it belongs to, and `compgeoGuidedLessons.test.ts` checks that against the real graphs. The scenes use only the
 * `point-set` actions, so a scene is a function of its actions and the lesson default.
 */
import type {LessonAction, LessonPoint, LessonViewBox} from '../model';
import type {PointSetOverlayName} from '../../compgeo/pointSetModel';
import type {GuidedLesson, GuidedLessonFrame, GuidedLessonFrameKind, LessonScene, LocalizedText} from './guidedLessons';

const text = (sl: string, en: string): LocalizedText => ({sl, en});
const frame = (id: string, kind: GuidedLessonFrameKind): GuidedLessonFrame => ({id, kind});

const points = (list: readonly LessonPoint[]): LessonAction => ({kind: 'point-set', operation: 'set-points', mode: 'points', points: list});
const polygon = (list: readonly LessonPoint[]): LessonAction => ({kind: 'point-set', operation: 'set-points', mode: 'polygon', closed: true, points: list});
const overlay = (name: PointSetOverlayName, visible: boolean): LessonAction => ({kind: 'point-set', operation: 'set-overlay', overlay: name, visible});
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

/**
 * Ear clipping lesson (docs/specs/triangulation-voronoi-lessons.md, B1). The scenes use the `point-set` actions and the
 * `algorithm-trace` animation of `EarClippingGraph`; `compgeoEarClippingLesson.test.ts` checks every quoted value against the
 * real graph's readout. Trace events of the notched pentagon: 12 events, the first ear tested at event 3 (step 4 of 12), clipped at
 * event 5, the last triangle at event 10 and `done` at event 11.
 */
export const EAR_TRACE_STEPS = {firstEarTest: 3, firstEarClipped: 5, notchedEnd: 11} as const;

/** Example 2 of spec B1, the comb: n = 11, 9 triangles, 8 diagonals, colour classes 4, 4, 3 and three guards. */
export const EAR_COMB: readonly LessonPoint[] = [[0, 0], [18, 0], [16, 2], [15, 6], [14, 2], [10, 2], [9, 6], [8, 2], [4, 2], [3, 6], [2, 2]];

type EarOverlay = 'trace' | 'reflex' | 'triangulation' | 'colouring' | 'guards';
const EAR_OVERLAYS: readonly EarOverlay[] = ['trace', 'reflex', 'triangulation', 'colouring', 'guards'];
const setTraceStep = (step: number | 'end'): LessonAction => ({kind: 'point-set', operation: 'set-trace-step', step});
/** The polygon's bounding box with a margin of 1.5, so every scene frames its own polygon (the comb reaches x = 18). */
export const earView = (list: readonly LessonPoint[]): LessonViewBox => {
    const xs = list.map(([x]) => x), ys = list.map(([, y]) => y);
    return [Math.min(...xs) - 1.5, Math.max(...ys) + 1.5, Math.max(...xs) + 1.5, Math.min(...ys) - 1.5];
};
/** An ear clipping scene framed on its polygon: the polygon (which returns to step 0 and pauses), exactly the listed overlays, then the step actions. */
const earScene = (id: string, list: readonly LessonPoint[], shown: readonly EarOverlay[], steps: readonly LessonAction[], sl: string, en: string): LessonScene =>
    ({id, basedOn: 'demonstration-default', view: earView(list), actions: [polygon(list), ...EAR_OVERLAYS.map(name => overlay(name, shown.includes(name))), ...steps], expectedState: text(sl, en)});

const earClipping: GuidedLesson = {
    demonstrationId: 'ear-clipping',
    title: text('Rezanje ušes in izrek o galeriji', 'Ear clipping and the art gallery theorem'),
    summary: text(
        'Vsak enostaven večkotnik z \\(n\\) oglišči lahko razrežemo na \\(n-2\\) trikotnikov, če znova in znova odrežemo uho; Fiskovo 3-barvanje oglišč nato pokaže, da zadošča \\(\\lfloor n/3\\rfloor\\) stražarjev.',
        'Every simple polygon with \\(n\\) vertices can be cut into \\(n-2\\) triangles by clipping an ear again and again; Fisk\'s 3-colouring of the vertices then shows that \\(\\lfloor n/3\\rfloor\\) guards are enough.',
    ),
    prerequisites: [
        text('Potrebna je lekcija o orientaciji treh točk: predznak vrednosti \\(D\\) pove levi ali desni zavoj.', 'The lesson on the orientation of three points is required: the sign of \\(D\\) tells a left or a right turn.'),
    ],
    learningGoals: [
        text('Razložiš, kdaj je oglišče uho, in to preveriš z orientacijo in preizkusom, ali je v trikotniku kako drugo oglišče.', 'Explain when a vertex is an ear, and check it with the orientation and the test whether another vertex lies in the triangle.'),
        text('Prešteješ trikotnike in diagonale triangulacije: \\(n-2\\) in \\(n-3\\).', 'Count the triangles and diagonals of a triangulation: \\(n-2\\) and \\(n-3\\).'),
        text('Z Fiskovim 3-barvanjem utemeljiš, da zadošča \\(\\lfloor n/3\\rfloor\\) stražarjev, in vidiš, da pri glavniku manj ne zadošča.', 'Use Fisk\'s 3-colouring to justify that \\(\\lfloor n/3\\rfloor\\) guards suffice, and see that for the comb fewer do not.'),
    ],
    formulaBlocks: [
        {
            id: 'ear-test-rule',
            latex: 'D(a,b,c)=(b_x-a_x)(c_y-a_y)-(b_y-a_y)(c_x-a_x)>0',
            notation: text(
                '\\(a\\), \\(b\\), \\(c\\) so zaporedna oglišča večkotnika v nasprotni smeri urinega kazalca; \\(b\\) je preizkušano oglišče, \\(D\\) pa orientacija trojice.',
                '\\(a\\), \\(b\\), \\(c\\) are consecutive vertices of the polygon in counter-clockwise order; \\(b\\) is the tested vertex and \\(D\\) is the orientation of the triple.',
            ),
            explanation: text(
                'Oglišče \\(b\\) je uho, če je izbočeno, to je \\(D(a,b,c)>0\\), in če v trikotniku \\(abc\\) (robovi so všteti) ni nobenega drugega oglišča večkotnika. Uho odrežemo in postopek ponovimo na večkotniku z enim ogliščem manj.',
                'The vertex \\(b\\) is an ear if it is convex, that is \\(D(a,b,c)>0\\), and no other vertex of the polygon lies in the triangle \\(abc\\) (its boundary counts). We clip the ear and repeat on the polygon with one vertex fewer.',
            ),
        },
        {
            id: 'ear-gallery-counts',
            latex: 'T=n-2,\\qquad d=n-3,\\qquad g=\\lfloor n/3\\rfloor',
            notation: text(
                '\\(n\\) je število oglišč, \\(T\\) število trikotnikov, \\(d\\) število diagonal in \\(g\\) število stražarjev.',
                '\\(n\\) is the number of vertices, \\(T\\) the number of triangles, \\(d\\) the number of diagonals and \\(g\\) the number of guards.',
            ),
            explanation: text(
                'Vsako odrezano uho zmanjša število oglišč za \\(1\\), zadnji trikotnik pa ima \\(3\\) oglišča, zato je trikotnikov \\(n-2\\). Triangulacija ima \\(n\\) robov večkotnika in \\(3(n-2)\\) strani trikotnikov, ki jih robovi štejejo enkrat, diagonale pa dvakrat; zato je diagonal \\(n-3\\). Oglišča triangulacije lahko pobarvamo s tremi barvami tako, da ima vsak trikotnik vse tri barve (Fisk); najmanjši barvni razred ima največ \\(\\lfloor n/3\\rfloor\\) oglišč in vsak trikotnik vsebuje oglišče iz njega.',
                'Every clipped ear lowers the number of vertices by \\(1\\) and the last triangle has \\(3\\) vertices, so there are \\(n-2\\) triangles. A triangulation has \\(n\\) polygon edges and \\(3(n-2)\\) triangle sides, where the edges count once and the diagonals twice; hence there are \\(n-3\\) diagonals. The vertices of a triangulation can be coloured with three colours so that every triangle has all three colours (Fisk); the smallest colour class has at most \\(\\lfloor n/3\\rfloor\\) vertices and every triangle contains a vertex of it.',
            ),
        },
    ],
    workedExamples: [
        {
            id: 'ear-first-ear-example',
            title: text('Prvo uho: \\((6,0)\\), \\((6,4)\\), \\((3,2)\\)', 'The first ear: \\((6,0)\\), \\((6,4)\\), \\((3,2)\\)'),
            calculationLatex: 'D=(6-6)(2-0)-(4-0)(3-6)=0+12',
            resultLatex: 'D=12',
            check: text(
                'Vrednost \\(D=12>0\\) pove, da je oglišče \\((6,4)\\) izbočeno; v trikotniku ni drugih oglišč, zato izpis pokaže, da je to uho.',
                'The value \\(D=12>0\\) says that the vertex \\((6,4)\\) is convex; no other vertex lies in the triangle, so the readout says that it is an ear.',
            ),
        },
        {
            id: 'ear-count-example',
            title: text('Število trikotnikov, diagonal in stražarjev', 'The number of triangles, diagonals and guards'),
            calculationLatex: 'n=5:\\; T=5-2=3,\\; d=5-3=2,\\; g=\\lfloor5/3\\rfloor=1',
            resultLatex: 'T=3,\\; d=2,\\; g=1',
            check: text(
                'Izpis pod grafom pokaže \\(3\\) trikotnike, \\(2\\) diagonali in enega stražarja.',
                'The result under the graph shows \\(3\\) triangles, \\(2\\) diagonals and one guard.',
            ),
        },
        {
            id: 'ear-comb-example',
            title: text('Glavnik z \\(11\\) oglišči', 'The comb with \\(11\\) vertices'),
            calculationLatex: 'n=11:\\; T=9,\\; d=8,\\; g=\\lfloor11/3\\rfloor=3',
            resultLatex: 'T=9,\\; d=8,\\; g=3',
            check: text(
                'Izpis pokaže \\(9\\) trikotnikov, \\(8\\) diagonal, barvne razrede \\(4\\), \\(4\\), \\(3\\) in tri stražarje.',
                'The result shows \\(9\\) triangles, \\(8\\) diagonals, the colour classes \\(4\\), \\(4\\), \\(3\\) and three guards.',
            ),
        },
    ],
    steps: [
        {
            id: 'earclip-polygon', order: 1,
            title: text('Petkotnik z zarezo', 'The notched pentagon'),
            purpose: text('Spoznati večkotnik in njegovo vbočeno oglišče.', 'Meeting the polygon and its reflex vertex.'),
            explanation: text(
                'Večkotnik ima oglišča \\((0,0)\\), \\((6,0)\\), \\((6,4)\\), \\((3,2)\\), \\((0,4)\\) in ploščino \\(18\\). Oglišče \\((3,2)\\) je vbočeno (reflektno): tam se rob zavije v desno, notranji kot pa je večji od \\(180^\\circ\\). Označeno je z rombom; ostala štiri oglišča so izbočena. Uho je izbočeno oglišče, v trikotniku katerega in njegovih sosed ni nobenega drugega oglišča. Rezanje ušes večkotnik razreže na trikotnike tako, da vedno odreže eno uho.',
                'The polygon has the vertices \\((0,0)\\), \\((6,0)\\), \\((6,4)\\), \\((3,2)\\), \\((0,4)\\) and area \\(18\\). The vertex \\((3,2)\\) is reflex: there the boundary turns right and the interior angle is larger than \\(180^\\circ\\). It is marked with a diamond; the other four vertices are convex. An ear is a convex vertex such that no other vertex lies in the triangle of it and its two neighbours. Ear clipping cuts the polygon into triangles by always clipping off one ear.',
            ),
            formulaIds: ['ear-test-rule'],
            frames: [frame('earclip-polygon-explanation', 'explanation'), frame('earclip-polygon-observation', 'observation')],
            observationPrompt: text('Poišči vbočeno oglišče in ugotovi, kateri vogali večkotnika so izbočeni.', 'Find the reflex vertex and say which corners of the polygon are convex.'),
            expectedObservations: [text('Označeno je natanko eno vbočeno oglišče, \\((3,2)\\); sled je na koraku \\(1\\) od \\(12\\) in še nič ni odrezano.', 'Exactly one reflex vertex, \\((3,2)\\), is marked; the trace is at step \\(1\\) of \\(12\\) and nothing is clipped yet.')],
            scene: earScene('earclip-polygon', AREA_NOTCHED_PENTAGON, ['trace', 'reflex'], [],
                'Petkotnik z zarezo je na koraku \\(1\\) od \\(12\\); vbočeno oglišče \\((3,2)\\) je označeno.',
                'The notched pentagon is at step \\(1\\) of \\(12\\); the reflex vertex \\((3,2)\\) is marked.'),
        },
        {
            id: 'earclip-predict', order: 2,
            title: text('Napovej uho', 'Predict an ear'),
            purpose: text('Pred razkritjem napovedati, katero oglišče je uho.', 'Predicting which vertex is an ear before the reveal.'),
            explanation: text(
                'Preden prikažeš preizkuse, napovej: katero oglišče lahko odrežemo kot uho? Namig: oglišči \\((0,0)\\) in \\((6,0)\\) imata v trikotniku s sosedama vbočeno oglišče \\((3,2)\\); ali je zato še lahko uho?',
                'Before you show the tests, predict: which vertex can be clipped off as an ear? Hint: the vertices \\((0,0)\\) and \\((6,0)\\) have the reflex vertex \\((3,2)\\) in the triangle with their neighbours; can either still be an ear?',
            ),
            formulaIds: ['ear-test-rule'],
            frames: [frame('earclip-predict-explanation', 'explanation'), frame('earclip-predict-observation', 'observation')],
            observationPrompt: text('Zapiši oglišče, ki ga lahko odrežemo, in utemelji.', 'Write down the vertex that can be clipped and give your reason.'),
            expectedObservations: [text('Preizkusi in odrezani trikotniki so skriti, zato napoved še ni preverjena; v naslednjem koraku jo primerjamo.', 'The tests and the clipped triangles are hidden, so the prediction is not yet checked; the next step compares it.')],
            scene: earScene('earclip-predict', AREA_NOTCHED_PENTAGON, ['reflex'], [],
                'Preizkusi so skriti; vbočeno oglišče \\((3,2)\\) je še vedno označeno.',
                'The tests are hidden; the reflex vertex \\((3,2)\\) is still marked.'),
        },
        {
            id: 'earclip-first-ear', order: 3,
            title: text('Prvo uho', 'The first ear'),
            purpose: text('Slediti preizkusom ušes po korakih.', 'Following the ear tests step by step.'),
            explanation: text(
                'Pravilo: oglišča preizkušamo po vrsti od najnižje številke naprej, v nasprotni smeri urinega kazalca, in odrežemo prvo uho. Tri pritiske na Naslednji korak so že narejeni. Oglišči \\(P_1=(0,0)\\) in \\(P_2=(6,0)\\) nista ušesi, ker v njunem trikotniku leži \\(P_4=(3,2)\\). Izpis pokaže „Korak 4 od 12“, preizkušano oglišče \\(P_3\\) s trikotnikom \\(P_2\\,P_3\\,P_4\\) in sporočilo, da je to uho: trikotnik \\((6,0)\\), \\((6,4)\\), \\((3,2)\\). Pritisni Naslednji korak še dvakrat in uho je odrezano; števec odrezanih trikotnikov pokaže \\(1\\).',
                'The rule: we test the vertices in order from the lowest number onwards, counter-clockwise, and clip the first ear. Three presses of Next step are already done. The vertices \\(P_1=(0,0)\\) and \\(P_2=(6,0)\\) are not ears, because \\(P_4=(3,2)\\) lies in their triangle. The readout shows “Step 4 of 12”, the tested vertex \\(P_3\\) with the triangle \\(P_2\\,P_3\\,P_4\\) and the message that it is an ear: the triangle \\((6,0)\\), \\((6,4)\\), \\((3,2)\\). Press Next step twice more and the ear is clipped; the counter of clipped triangles shows \\(1\\).',
            ),
            formulaIds: ['ear-test-rule'], workedExampleId: 'ear-first-ear-example',
            frames: [frame('earclip-first-ear-explanation', 'explanation'), frame('earclip-first-ear-calculation', 'calculation'), frame('earclip-first-ear-observation', 'observation')],
            observationPrompt: text('Pritiskaj Naslednji korak in pri vsakem preizkusu povej, ali je oglišče uho in zakaj ne.', 'Press Next step and, at each test, say whether the vertex is an ear and why not.'),
            expectedObservations: [text('Prvi dve oglišči zavrne vbočeno oglišče \\(P_4\\) v trikotniku; prvo uho je \\(P_3=(6,4)\\) in po dveh pritiskih je odrezan prvi trikotnik.', 'The first two vertices are rejected because the reflex vertex \\(P_4\\) lies in the triangle; the first ear is \\(P_3=(6,4)\\) and after two presses the first triangle is clipped.')],
            scene: earScene('earclip-first-ear', AREA_NOTCHED_PENTAGON, ['trace', 'reflex'], nextSteps(EAR_TRACE_STEPS.firstEarTest),
                'Sled je na koraku \\(4\\) od \\(12\\): preizkušano oglišče \\(P_3\\) je uho s trikotnikom \\((6,0)\\), \\((6,4)\\), \\((3,2)\\).',
                'The trace is at step \\(4\\) of \\(12\\): the tested vertex \\(P_3\\) is an ear with the triangle \\((6,0)\\), \\((6,4)\\), \\((3,2)\\).'),
        },
        {
            id: 'earclip-triangulation', order: 4,
            title: text('Triangulacija', 'The triangulation'),
            purpose: text('Prešteti trikotnike in diagonale končne triangulacije.', 'Counting the triangles and diagonals of the finished triangulation.'),
            explanation: text(
                'Sled je izvedena do konca (korak \\(12\\) od \\(12\\)). Uho \\((0,0)\\), \\((6,0)\\), \\((3,2)\\) je drugi odrezani trikotnik, ostane trikotnik \\((0,0)\\), \\((3,2)\\), \\((0,4)\\). Pri \\(n=5\\) ogliščih je trikotnikov \\(n-2=3\\), diagonal pa \\(n-3=2\\); izpis pod grafom pokaže ti dve števili. Obe diagonali izhajata iz vbočenega oglišča \\((3,2)\\).',
                'The trace has run to the end (step \\(12\\) of \\(12\\)). The ear \\((0,0)\\), \\((6,0)\\), \\((3,2)\\) is the second clipped triangle and the triangle \\((0,0)\\), \\((3,2)\\), \\((0,4)\\) remains. With \\(n=5\\) vertices there are \\(n-2=3\\) triangles and \\(n-3=2\\) diagonals; the result under the graph shows these two numbers. Both diagonals start at the reflex vertex \\((3,2)\\).',
            ),
            formulaIds: ['ear-gallery-counts'], workedExampleId: 'ear-count-example',
            frames: [frame('earclip-triangulation-explanation', 'explanation'), frame('earclip-triangulation-calculation', 'calculation'), frame('earclip-triangulation-observation', 'observation')],
            observationPrompt: text('Preštej trikotnike in diagonale na grafu in primerjaj s formulama.', 'Count the triangles and diagonals on the graph and compare them with the formulas.'),
            expectedObservations: [text('Izpis pokaže \\(3\\) trikotnike in \\(2\\) diagonali, kar je \\(n-2\\) in \\(n-3\\) za \\(n=5\\).', 'The result shows \\(3\\) triangles and \\(2\\) diagonals, which is \\(n-2\\) and \\(n-3\\) for \\(n=5\\).')],
            scene: earScene('earclip-triangulation', AREA_NOTCHED_PENTAGON, ['trace', 'reflex', 'triangulation'], [setTraceStep('end')],
                'Sled je na koncu: \\(3\\) trikotniki in \\(2\\) diagonali.',
                'The trace is at its end: \\(3\\) triangles and \\(2\\) diagonals.'),
        },
        {
            id: 'earclip-colouring', order: 5,
            title: text('Fiskovo 3-barvanje', 'Fisk\'s 3-colouring'),
            purpose: text('Pobarvati oglišča tako, da ima vsak trikotnik vse tri barve.', 'Colouring the vertices so that every triangle has all three colours.'),
            explanation: text(
                'Začni pri enem trikotniku in mu daj barve \\(A\\), \\(B\\), \\(C\\); od tam se sprehodi od trikotnika do trikotnika čez diagonale. Sosednja trikotnika si delita dve oglišči, tretjemu pa pripade edina preostala barva. Graf pokaže razrede: \\(A=\\{(0,0),(6,4)\\}\\), \\(B=\\{(3,2)\\}\\), \\(C=\\{(6,0),(0,4)\\}\\). Izpis pove velikosti \\(2\\), \\(1\\), \\(2\\). Črke ob ogliščih ne zahtevajo barvnega vida.',
                'Start at one triangle and give it the colours \\(A\\), \\(B\\), \\(C\\); from there walk from triangle to triangle across the diagonals. Neighbouring triangles share two vertices, and the third gets the only remaining colour. The graph shows the classes: \\(A=\\{(0,0),(6,4)\\}\\), \\(B=\\{(3,2)\\}\\), \\(C=\\{(6,0),(0,4)\\}\\). The result gives the sizes \\(2\\), \\(1\\), \\(2\\). The letters at the vertices do not need colour vision.',
            ),
            formulaIds: ['ear-gallery-counts'],
            frames: [frame('earclip-colouring-explanation', 'explanation'), frame('earclip-colouring-observation', 'observation')],
            observationPrompt: text('Preveri, da ima vsak od treh trikotnikov oglišča \\(A\\), \\(B\\) in \\(C\\).', 'Check that each of the three triangles has a vertex \\(A\\), a vertex \\(B\\) and a vertex \\(C\\).'),
            expectedObservations: [text('Barvni razredi so velikosti \\(2\\), \\(1\\), \\(2\\); najmanjši je \\(B=\\{(3,2)\\}\\).', 'The colour classes have sizes \\(2\\), \\(1\\), \\(2\\); the smallest is \\(B=\\{(3,2)\\}\\).')],
            scene: earScene('earclip-colouring', AREA_NOTCHED_PENTAGON, ['trace', 'reflex', 'triangulation', 'colouring'], [setTraceStep('end')],
                'Oglišča so pobarvana s črkami \\(A\\), \\(B\\), \\(C\\); razredi imajo velikosti \\(2\\), \\(1\\), \\(2\\).',
                'The vertices are marked with the letters \\(A\\), \\(B\\), \\(C\\); the classes have sizes \\(2\\), \\(1\\), \\(2\\).'),
        },
        {
            id: 'earclip-guards', order: 6,
            title: text('Stražar in njegov pogled', 'The guard and its view'),
            purpose: text('Najmanjši barvni razred postaviti za stražarje.', 'Placing guards on the smallest colour class.'),
            explanation: text(
                'Vsak trikotnik vsebuje oglišče iz vsakega razreda, zato stražar v oglišču najmanjšega razreda vidi vse trikotnike, ki to oglišče vsebujejo, torej vse trikotnike. Najmanjši razred je \\(B=\\{(3,2)\\}\\) z \\(1=\\lfloor5/3\\rfloor\\) ogliščem. Stražar stoji v \\((3,2)\\), krog ga označuje, osenčen pogled pa pokriva vse tri trikotnike: en stražar vidi celoten večkotnik. To je izrek o galeriji: za \\(n\\) oglišč zadošča \\(\\lfloor n/3\\rfloor\\) stražarjev.',
                'Every triangle contains a vertex of every class, so a guard at a vertex of the smallest class sees all the triangles that contain that vertex, that is, all the triangles. The smallest class is \\(B=\\{(3,2)\\}\\) with \\(1=\\lfloor5/3\\rfloor\\) vertex. The guard stands at \\((3,2)\\), a ring marks it, and the shaded view covers all three triangles: one guard sees the whole polygon. This is the art gallery theorem: for \\(n\\) vertices, \\(\\lfloor n/3\\rfloor\\) guards suffice.',
            ),
            formulaIds: ['ear-gallery-counts'], workedExampleId: 'ear-count-example',
            frames: [frame('earclip-guards-explanation', 'explanation'), frame('earclip-guards-calculation', 'calculation'), frame('earclip-guards-observation', 'observation')],
            observationPrompt: text('Preveri, da osenčen pogled pokriva ves večkotnik.', 'Check that the shaded view covers the whole polygon.'),
            expectedObservations: [text('Izpis pokaže enega stražarja v oglišču \\(P_4=(3,2)\\) in njegov pogled pokriva vse tri trikotnike.', 'The result shows one guard at the vertex \\(P_4=(3,2)\\) and its view covers all three triangles.')],
            scene: earScene('earclip-guards', AREA_NOTCHED_PENTAGON, ['trace', 'reflex', 'triangulation', 'colouring', 'guards'], [setTraceStep('end')],
                'Stražar stoji v \\((3,2)\\) in vidi vse tri trikotnike: \\(1=\\lfloor5/3\\rfloor\\).',
                'The guard stands at \\((3,2)\\) and sees all three triangles: \\(1=\\lfloor5/3\\rfloor\\).'),
        },
        {
            id: 'earclip-comb', order: 7,
            title: text('Glavnik in prosto raziskovanje', 'The comb and free exploration'),
            purpose: text('Videti, da so trije stražarji pri glavniku potrebni, nato samostojno raziskovati.', 'Seeing that three guards are necessary for the comb, then exploring on your own.'),
            explanation: text(
                'Glavnik ima \\(n=11\\) oglišč. Izpis pokaže \\(9\\) trikotnikov, \\(8\\) diagonal, barvne razrede velikosti \\(4\\), \\(4\\), \\(3\\) in tri stražarje: \\(3=\\lfloor11/3\\rfloor\\). Pri tem večkotniku so trije stražarji tudi potrebni: tri konice \\((3,6)\\), \\((9,6)\\), \\((15,6)\\) so v ločenih klinih, zato nobena točka ne vidi več kot ene od njih. To velja za ta glavnik; Fiskov izrek daje le zadostno število in za druge večkotnike ne pove najmanjšega števila stražarjev. Zdaj dodajaj, odstranjuj in premikaj oglišča. Vsaka sprememba vrne sled na korak \\(1\\) in ustavi predvajanje; večkotnik v smeri urinega kazalca se za rezanje obrne, shranjen pa ostane nespremenjen.',
                'The comb has \\(n=11\\) vertices. The result shows \\(9\\) triangles, \\(8\\) diagonals, colour classes of sizes \\(4\\), \\(4\\), \\(3\\) and three guards: \\(3=\\lfloor11/3\\rfloor\\). For this polygon three guards are also necessary: the three tips \\((3,6)\\), \\((9,6)\\), \\((15,6)\\) lie in separate wedges, so no point sees more than one of them. This holds for this comb; Fisk\'s theorem gives only a sufficient number and does not tell the minimum number of guards for other polygons. Now add, remove and move vertices. Every edit returns the trace to step \\(1\\) and stops playback; a clockwise polygon is reversed for the clipping, while the stored polygon stays unchanged.',
            ),
            formulaIds: ['ear-gallery-counts'], workedExampleId: 'ear-comb-example',
            frames: [frame('earclip-comb-explanation', 'explanation'), frame('earclip-comb-calculation', 'calculation'), frame('earclip-comb-observation', 'observation')],
            observationPrompt: text('Premakni oglišče konice glavnika in preveri, ali število stražarjev ostane isto.', 'Move a tip vertex of the comb and check whether the number of guards stays the same.'),
            expectedObservations: [text('Pri glavniku so razredi velikosti \\(4\\), \\(4\\), \\(3\\) in stražarji trije; vsaka sprememba večkotnika ponastavi sled na korak \\(1\\).', 'For the comb the classes have sizes \\(4\\), \\(4\\), \\(3\\) and there are three guards; every edit of the polygon returns the trace to step \\(1\\).')],
            scene: earScene('earclip-comb', EAR_COMB, ['trace', 'reflex', 'triangulation', 'colouring', 'guards'], [setTraceStep('end')],
                'Glavnik: \\(9\\) trikotnikov, \\(8\\) diagonal, razredi \\(4\\), \\(4\\), \\(3\\) in tri stražarji; predvajanje je ustavljeno.',
                'The comb: \\(9\\) triangles, \\(8\\) diagonals, classes \\(4\\), \\(4\\), \\(3\\) and three guards; playback is stopped.'),
        },
    ],
    sources: [
        {id: 'berg-triangulation', citation: 'de Berg, M., Cheong, O., van Kreveld, M., Overmars, M. Computational Geometry: Algorithms and Applications, 3rd ed., Chapter 3 (polygon triangulation and the art gallery theorem).'},
        {id: 'fisk-1978', citation: 'Fisk, S. A short proof of Chvátal\'s watchman theorem, Journal of Combinatorial Theory B 24 (1978), 374. DOI 10.1016/0095-8956(78)90059-X.'},
        {id: 'meisters-1975', citation: 'Meisters, G. H. Polygons have ears, American Mathematical Monthly 82 (1975), 648-651.'},
        {
            id: 'bezeg-ear-implementation',
            citation: 'Bezeg source: src/compgeo/earClipping.ts, src/graphs/compgeo/earClippingRun.ts and src/graphs/compgeo/EarClippingGraph.tsx.',
            implementationCorrespondence: 'The trace tests the vertices by the exact integer orientation, treats a vertex on the triangle boundary as blocking, and takes the first ear by the lowest vertex number, counter-clockwise; a lesson scene sets the polygon, the overlays and the step with the point-set actions (set-trace-step) and presses Next step with the algorithm-trace animation actions, the same transitions as the buttons.',
        },
    ],
    edgeCases: [
        text('Večkotnik, katerega stranice se sekajo ali dotikajo, in tri zaporedna kolinearna oglišča se zavrnejo s sporočilom; rezanje ušes zahteva enostaven večkotnik z izbočenimi ušesi.', 'A polygon whose sides cross or touch, and three consecutive collinear vertices, are refused with a message; ear clipping needs a simple polygon with strictly convex ears.'),
        text('Fiskov izrek daje le zadostno število stražarjev \\(\\lfloor n/3\\rfloor\\); najmanjše število pri drugih večkotnikih je lahko manjše in ga ta lekcija ne določa.', 'Fisk\'s theorem gives only the sufficient number \\(\\lfloor n/3\\rfloor\\) of guards; the minimum for other polygons can be smaller and this lesson does not determine it.'),
    ],
    unresolvedQuestions: [],
};

/**
 * Interval sweep lesson (docs/specs/sweep-algorithms-lessons.md, C1). The scenes use the `point-set` actions (`set-points` in
 * intervals mode, `set-trace-step`) and the `algorithm-trace` animation of `IntervalSweepGraph`; `compgeoIntervalSweepLesson.test.ts`
 * checks every quoted value against the real graph's readout. The trace of the spec example has 26 steps ("Korak k od 26" is the
 * trace index k - 1): index 6 is the third entering event (open 3), index 20 the entering of e (all five pairs found), index 25 `done`.
 */
export const INTERVAL_TRACE_STEPS = {thirdEnter: 6, pairsFound: 20} as const;

/** The spec example of C1 and the second sample of the Demonstration (a zero-length interval c = [3, 3]). */
export const INTERVAL_EXAMPLE: readonly (readonly [number, number])[] = [[0, 4], [2, 7], [3, 5], [6, 9], [8, 10]];
export const INTERVAL_SAMPLE_2: readonly (readonly [number, number])[] = [[0, 3], [3, 6], [3, 3], [5, 8]];

/** The `set-points` action of intervals mode: interval k sits on row k + 1, both endpoints on that row. */
const intervals = (list: readonly (readonly [number, number])[]): LessonAction =>
    ({kind: 'point-set', operation: 'set-points', mode: 'intervals', points: list.flatMap(([lo, hi], k): LessonPoint[] => [[lo, k + 1], [hi, k + 1]])});
/** The intervals' bounding box with a margin of 1: rows 1..n, so the view is x from lo - 1 to hi + 1 and y from 0 to n + 1. */
export const intervalView = (list: readonly (readonly [number, number])[]): LessonViewBox =>
    [Math.min(...list.map(([lo]) => lo)) - 1, list.length + 1, Math.max(...list.map(([, hi]) => hi)) + 1, 0];
/** A sweep scene framed on its intervals: the intervals (which return to step 0 and pause), then the step actions. */
const sweepScene = (id: string, list: readonly (readonly [number, number])[], steps: readonly LessonAction[], sl: string, en: string): LessonScene =>
    ({id, basedOn: 'demonstration-default', view: intervalView(list), actions: [intervals(list), ...steps], expectedState: text(sl, en)});

const intervalSweep: GuidedLesson = {
    demonstrationId: 'interval-sweep',
    title: text('Pometanje intervalov', 'Interval sweep'),
    summary: text(
        'Navpična pometalna premica, ki potuje po osi \\(x\\), in razvrščena vrsta dogodkov spremenita vprašanje „kateri intervali se prekrivajo“ v zaporedje majhnih sprememb stanja.',
        'A vertical sweep line travelling along the \\(x\\)-axis, together with a sorted event queue, turns the question "which intervals overlap" into a sequence of tiny status updates.',
    ),
    prerequisites: [
        text('Zadostuje branje števil na številski premici; druge lekcije niso potrebne.', 'Reading numbers on a number line is enough; no other lesson is required.'),
    ],
    learningGoals: [
        text('Razložiš, kaj sta dogodek in stanje pometalne premice, in slediš vrsti dogodkov.', 'Explain what an event and the status of the sweep line are, and follow the event queue.'),
        text('Iz števila odprtih intervalov po vsakem dogodku odčitaš največje število intervalov s skupno točko.', 'Read the largest number of intervals sharing a point off the number of open intervals after each event.'),
        text('Poveš pravilo pri enaki koordinati (vstop pred izstopom) in primerjaš število najdenih parov z \\(\\binom{n}{2}\\).', 'State the rule at equal coordinates (entering before leaving) and compare the pairs found with \\(\\binom{n}{2}\\).'),
    ],
    formulaBlocks: [
        {
            id: 'interval-open-count',
            latex: 'k(x)=\\#\\{\\,i : l_i\\le x\\le r_i\\,\\}',
            notation: text(
                '\\(l_i\\) in \\(r_i\\) sta levo in desno krajišče intervala \\(i\\); \\(k(x)\\) je število intervalov, ki vsebujejo točko \\(x\\) (odprtih intervalov).',
                '\\(l_i\\) and \\(r_i\\) are the left and right endpoints of interval \\(i\\); \\(k(x)\\) is the number of intervals that contain the point \\(x\\) (the open intervals).',
            ),
            explanation: text(
                'Vrednost \\(k\\) se spremeni le v krajiščih: vstop (\\(x^+\\)) jo poveča za \\(1\\), izstop (\\(x^-\\)) zmanjša za \\(1\\). Zato je največje število intervalov s skupno točko enako največji vrednosti \\(k\\) po dogodkih. Pri enaki koordinati obdelamo vstope pred izstopi, ker so intervali zaprti in se dotikajoča intervala štejeta za prekrivajoča.',
                'The value \\(k\\) changes only at endpoints: an entering event (\\(x^+\\)) raises it by \\(1\\), a leaving event (\\(x^-\\)) lowers it by \\(1\\). So the largest number of intervals sharing a point equals the largest value of \\(k\\) after the events. At equal coordinates entering events are handled before leaving events, because the intervals are closed and two touching intervals count as overlapping.',
            ),
        },
        {
            id: 'interval-pair-count',
            latex: '\\binom{n}{2}=\\frac{n(n-1)}{2}',
            notation: text(
                '\\(n\\) je število intervalov; \\(\\binom{n}{2}\\) je število vseh parov, ki bi jih preizkusili brez pometanja.',
                '\\(n\\) is the number of intervals; \\(\\binom{n}{2}\\) is the number of all pairs that would be tested without sweeping.',
            ),
            explanation: text(
                'Pri pometanju se par sporoči, ko interval vstopi, medtem ko je drugi odprt, zato je vsak par sporočen natanko enkrat. Za \\(n=5\\) je vseh parov \\(\\binom{5}{2}=10\\), prekrivajočih pa je le \\(5\\).',
                'In the sweep a pair is reported when an interval enters while another is open, so every pair is reported exactly once. For \\(n=5\\) there are \\(\\binom{5}{2}=10\\) pairs in all, and only \\(5\\) of them overlap.',
            ),
        },
    ],
    workedExamples: [
        {
            id: 'interval-depth-example',
            title: text('Število odprtih intervalov po dogodkih', 'The open count after each event'),
            calculationLatex: '0^+,2^+,3^+,4^-,5^-,6^+,7^-,8^+,9^-,10^-:\\; 1,2,3,2,1,2,1,2,1,0',
            resultLatex: 'k_{\\max}=3\\text{ on }[3,4]',
            check: text(
                'Izpis „Odprtih po dogodkih“ navaja ta števila, izpis „Največ odprtih“ pa pove \\(3\\) na \\([3, 4]\\).',
                'The readout "Open after each event" lists these numbers, and the readout "Most open" says \\(3\\) on \\([3, 4]\\).',
            ),
        },
        {
            id: 'interval-pairs-example',
            title: text('Pari proti vsem parom', 'Pairs against all pairs'),
            calculationLatex: '\\binom{5}{2}=\\frac{5\\cdot4}{2}=10',
            resultLatex: '5\\text{ of }10',
            check: text(
                'Izpis pove „Najdenih parov: 5; vseh parov bi preizkusili: 10“.',
                'The readout says "Pairs found: 5; testing all pairs would take 10 tests".',
            ),
        },
    ],
    steps: [
        {
            id: 'intervalsweep-intervals', order: 1,
            title: text('Pet intervalov', 'Five intervals'),
            purpose: text('Spoznati intervale in vprašanje, na katero odgovarja pometanje.', 'Meeting the intervals and the question the sweep answers.'),
            explanation: text(
                'Na osi \\(x\\) je pet intervalov \\(a=[0,4]\\), \\(b=[2,7]\\), \\(c=[3,5]\\), \\(d=[6,9]\\), \\(e=[8,10]\\); vsak je v svoji vrstici, da se na sliki ne prekrivajo. Zanima nas, kateri pari imajo skupno točko in koliko intervalov ima največ skupno točko. Pometalna premica je navpična premica, ki se pomika od leve proti desni. Stoji pri \\(x=0\\), izpis pokaže „Korak 1 od 26“ in odprtih intervalov je \\(0\\); predvajanje je ustavljeno.',
                'On the \\(x\\)-axis there are five intervals \\(a=[0,4]\\), \\(b=[2,7]\\), \\(c=[3,5]\\), \\(d=[6,9]\\), \\(e=[8,10]\\); each is in its own row so that they do not overlap in the picture. We ask which pairs share a point and how many intervals share a point at most. The sweep line is a vertical line that moves from left to right. It stands at \\(x=0\\), the readout shows "Step 1 of 26" and there are \\(0\\) open intervals; playback is stopped.',
            ),
            formulaIds: ['interval-open-count'],
            frames: [frame('intervalsweep-intervals-explanation', 'explanation'), frame('intervalsweep-intervals-observation', 'observation')],
            observationPrompt: text('Poglej intervale in z očmi poišči pare, ki se prekrivajo.', 'Look at the intervals and find, by eye, the pairs that overlap.'),
            expectedObservations: [text('Sledi je na koraku \\(1\\) od \\(26\\), odprtih intervalov je \\(0\\) in noben par še ni najden.', 'The trace is at step \\(1\\) of \\(26\\), there are \\(0\\) open intervals and no pair is found yet.')],
            scene: sweepScene('intervalsweep-intervals', INTERVAL_EXAMPLE, [],
                'Pet intervalov; sledi je na koraku \\(1\\) od \\(26\\), odprtih intervalov je \\(0\\).',
                'Five intervals; the trace is at step \\(1\\) of \\(26\\) and there are \\(0\\) open intervals.'),
        },
        {
            id: 'intervalsweep-predict', order: 2,
            title: text('Napovej največ', 'Predict the maximum'),
            purpose: text('Pred razkritjem napovedati največje število intervalov s skupno točko.', 'Predicting the largest number of intervals that share a point before the reveal.'),
            explanation: text(
                'Preden premakneš pometalno premico, napovej: največ koliko intervalov ima skupno točko? Namig: poišči točko na osi \\(x\\), kjer navpična črta prereže največ vrstic. Sled je še na koraku \\(1\\) od \\(26\\), zato števila odprtih intervalov še ne poznamo.',
                'Before you move the sweep line, predict: at most how many intervals share a point? Hint: find the point on the \\(x\\)-axis where a vertical line cuts the most rows. The trace is still at step \\(1\\) of \\(26\\), so the open counts are not known yet.',
            ),
            formulaIds: ['interval-open-count'],
            frames: [frame('intervalsweep-predict-explanation', 'explanation'), frame('intervalsweep-predict-observation', 'observation')],
            observationPrompt: text('Zapiši število in točko \\(x\\), kjer po tvoji presoji leži največ intervalov.', 'Write down the number and the point \\(x\\) where, in your view, the most intervals lie.'),
            expectedObservations: [text('Napoved še ni preverjena; sledi je na koraku \\(1\\) od \\(26\\) in jo primerjamo v naslednjem koraku.', 'The prediction is not checked yet; the trace is at step \\(1\\) of \\(26\\) and the next step compares it.')],
            scene: sweepScene('intervalsweep-predict', INTERVAL_EXAMPLE, [],
                'Sled je na koraku \\(1\\) od \\(26\\); odprtih intervalov je \\(0\\).',
                'The trace is at step \\(1\\) of \\(26\\); there are \\(0\\) open intervals.'),
        },
        {
            id: 'intervalsweep-events', order: 3,
            title: text('Dogodki in stanje', 'Events and status'),
            purpose: text('Slediti dogodkom in stanju pometalne premice po korakih.', 'Following the events and the status of the sweep line step by step.'),
            explanation: text(
                'Dogodki so krajišča intervalov; vrsta dogodkov jih hrani po vrsti: \\(0^+,2^+,3^+,4^-,5^-,6^+,7^-,8^+,9^-,10^-\\), pri čemer \\(x^+\\) pomeni vstop in \\(x^-\\) izstop. Pometalna premica skoči na prvi dogodek v vrsti in ga obdela; stanje pa so intervali, ki jih premica trenutno seka. Pravilo pri enaki koordinati: vstop se obdela pred izstopom, ker so intervali zaprti. Šest pritiskov na Naslednji korak je že narejenih: premica stoji pri \\(x=3\\), v stanju so \\(a\\), \\(b\\), \\(c\\), odprtih intervalov je \\(3\\), izpis „Odprtih po dogodkih“ pa pokaže \\(1, 2, 3\\) (korak \\(7\\) od \\(26\\)).',
                'The events are the endpoints of the intervals; the event queue keeps them in order: \\(0^+,2^+,3^+,4^-,5^-,6^+,7^-,8^+,9^-,10^-\\), where \\(x^+\\) means entering and \\(x^-\\) leaving. The sweep line jumps to the first event in the queue and handles it; the status is the set of intervals the line currently cuts. The rule at equal coordinates: an entering event is handled before a leaving event, because the intervals are closed. Six presses of Next step are already done: the line stands at \\(x=3\\), the status holds \\(a\\), \\(b\\), \\(c\\), there are \\(3\\) open intervals, and the readout "Open after each event" shows \\(1, 2, 3\\) (step \\(7\\) of \\(26\\)).',
            ),
            formulaIds: ['interval-open-count'], workedExampleId: 'interval-depth-example',
            frames: [frame('intervalsweep-events-explanation', 'explanation'), frame('intervalsweep-events-calculation', 'calculation'), frame('intervalsweep-events-observation', 'observation')],
            observationPrompt: text('Pritiskaj Naslednji korak in pri vsakem dogodku povej, ali stanje naraste ali se skrči.', 'Press Next step and, at each event, say whether the status grows or shrinks.'),
            expectedObservations: [text('Po treh vstopih je premica pri \\(x=3\\) in odprta so \\(3\\) intervali; izstop \\(4^-\\) bo število zmanjšal na \\(2\\).', 'After three entering events the line is at \\(x=3\\) and \\(3\\) intervals are open; the leaving event \\(4^-\\) will lower the number to \\(2\\).')],
            scene: sweepScene('intervalsweep-events', INTERVAL_EXAMPLE, nextSteps(INTERVAL_TRACE_STEPS.thirdEnter),
                'Sled je na koraku \\(7\\) od \\(26\\): premica pri \\(x=3\\), odprta so \\(3\\) intervali, po dogodkih \\(1, 2, 3\\).',
                'The trace is at step \\(7\\) of \\(26\\): the line is at \\(x=3\\), \\(3\\) intervals are open, after the events \\(1, 2, 3\\).'),
        },
        {
            id: 'intervalsweep-pairs', order: 4,
            title: text('Pari in največ', 'Pairs and the maximum'),
            purpose: text('Odčitati prekrivajoče pare, ko se pojavijo, in največje število odprtih intervalov.', 'Reading off the overlapping pairs as they appear, and the largest open count.'),
            explanation: text(
                'Par se sporoči, ko interval vstopi, medtem ko je drugi odprt: ko vstopi \\(b\\), je \\(a\\) odprt in nastane par \\(ab\\); ko vstopi \\(c\\), sta odprta \\(a\\) in \\(b\\), zato nastaneta \\(ac\\) in \\(bc\\). Dvajset pritiskov na Naslednji korak je že narejenih: premica je pri \\(x=8\\), \\(e\\) je ravnokar vstopil in sporočen je par \\(de\\). Izpis pokaže „Korak 21 od 26“, prekrivajoči pari doslej so \\(5\\): \\(ab, ac, bc, bd, de\\); po dogodkih so odprta števila \\(1, 2, 3, 2, 1, 2, 1, 2\\), največ odprtih doslej pa je \\(3\\).',
                'A pair is reported when an interval enters while another is open: when \\(b\\) enters, \\(a\\) is open and the pair \\(ab\\) appears; when \\(c\\) enters, \\(a\\) and \\(b\\) are open, so \\(ac\\) and \\(bc\\) appear. Twenty presses of Next step are already done: the line is at \\(x=8\\), \\(e\\) has just entered and the pair \\(de\\) is reported. The readout shows "Step 21 of 26", the overlapping pairs so far are \\(5\\): \\(ab, ac, bc, bd, de\\); the open counts after the events are \\(1, 2, 3, 2, 1, 2, 1, 2\\) and the largest open count so far is \\(3\\).',
            ),
            formulaIds: ['interval-open-count'], workedExampleId: 'interval-depth-example',
            frames: [frame('intervalsweep-pairs-explanation', 'explanation'), frame('intervalsweep-pairs-calculation', 'calculation'), frame('intervalsweep-pairs-observation', 'observation')],
            observationPrompt: text('Preveri, da vsak par na seznamu res ima skupno točko, in poišči par, ki ga na seznamu ni.', 'Check that every pair on the list really shares a point, and find a pair that is not on the list.'),
            expectedObservations: [text('Pet parov \\(ab, ac, bc, bd, de\\) ima skupno točko; največ odprtih doslej je \\(3\\), na koraku \\(21\\) od \\(26\\).', 'The five pairs \\(ab, ac, bc, bd, de\\) share a point; the largest open count so far is \\(3\\), at step \\(21\\) of \\(26\\).')],
            scene: sweepScene('intervalsweep-pairs', INTERVAL_EXAMPLE, nextSteps(INTERVAL_TRACE_STEPS.pairsFound),
                'Sled je na koraku \\(21\\) od \\(26\\): najdenih je \\(5\\) parov \\(ab, ac, bc, bd, de\\), največ odprtih doslej \\(3\\).',
                'The trace is at step \\(21\\) of \\(26\\): \\(5\\) pairs \\(ab, ac, bc, bd, de\\) are found, the largest open count so far is \\(3\\).'),
        },
        {
            id: 'intervalsweep-compare', order: 5,
            title: text('Pari proti vsem parom', 'Pairs against all pairs'),
            purpose: text('Primerjati rezultat pometanja s preizkusom vseh parov.', 'Comparing the result of the sweep with testing all pairs.'),
            explanation: text(
                'Sled je izvedena do konca (korak \\(26\\) od \\(26\\)). Števila odprtih intervalov po vseh dogodkih so \\(1, 2, 3, 2, 1, 2, 1, 2, 1, 0\\); največ jih je \\(3\\), in sicer na \\([3, 4]\\), kjer se prekrivajo \\(a\\), \\(b\\), \\(c\\). Najdenih je \\(5\\) parov, brez pometanja pa bi preizkusili vseh \\(\\binom{5}{2}=10\\) parov. Izpis pove „Najdenih parov: 5; vseh parov bi preizkusili: 10“. Pri petih intervalih je razlika majhna; pri več sto intervalih bi bila velika.',
                'The trace has run to the end (step \\(26\\) of \\(26\\)). The open counts after all the events are \\(1, 2, 3, 2, 1, 2, 1, 2, 1, 0\\); the largest is \\(3\\), on \\([3, 4]\\), where \\(a\\), \\(b\\), \\(c\\) overlap. \\(5\\) pairs are found, whereas without sweeping all \\(\\binom{5}{2}=10\\) pairs would be tested. The readout says "Pairs found: 5; testing all pairs would take 10 tests". With five intervals the difference is small; with hundreds of intervals it would be large.',
            ),
            formulaIds: ['interval-pair-count'], workedExampleId: 'interval-pairs-example',
            frames: [frame('intervalsweep-compare-explanation', 'explanation'), frame('intervalsweep-compare-calculation', 'calculation'), frame('intervalsweep-compare-observation', 'observation')],
            observationPrompt: text('Primerjaj najdene pare s številom vseh parov in preveri svojo napoved največjega števila.', 'Compare the pairs found with the number of all pairs, and check your prediction of the maximum.'),
            expectedObservations: [text('Največ odprtih je \\(3\\) na \\([3, 4]\\); najdenih je \\(5\\) parov od \\(10\\).', 'The most open is \\(3\\) on \\([3, 4]\\); \\(5\\) pairs are found out of \\(10\\).')],
            scene: sweepScene('intervalsweep-compare', INTERVAL_EXAMPLE, [setTraceStep('end')],
                'Sled je na koraku \\(26\\) od \\(26\\): največ odprtih \\(3\\) na \\([3, 4]\\), najdenih parov \\(5\\) od \\(10\\).',
                'The trace is at step \\(26\\) of \\(26\\): the most open is \\(3\\) on \\([3, 4]\\), \\(5\\) pairs found out of \\(10\\).'),
        },
        {
            id: 'intervalsweep-rotated', order: 6,
            title: text('Ista zamisel, zasukana', 'The same idea, rotated'),
            purpose: text('Videti, da isti trije sestavni deli delujejo tudi v ravnini.', 'Seeing that the same three ingredients work in the plane as well.'),
            explanation: text(
                'Isto zamisel lahko zasukamo: dogodki niso več števila na premici, ampak točke v ravnini, stanje pa je razvrščen seznam predmetov, ki jih pometalna premica seka. Pri intervalih je stanje množica odprtih intervalov, pri daljicah pa bo urejen seznam daljic od leve proti desni. Prizor je isti kot v prejšnjem koraku (korak \\(26\\) od \\(26\\), največ odprtih \\(3\\) na \\([3, 4]\\)): vrsta dogodkov je prazna, stanje je prazno in vse pare smo našli brez preizkusa vseh \\(10\\) parov. Ta korak je le besedilo; naslednja lekcija o presečiščih daljic uporabi isto zamisel.',
                'The same idea can be rotated: the events are no longer numbers on a line but points of the plane, and the status is a sorted list of the objects the sweep line cuts. For intervals the status is the set of open intervals; for segments it will be an ordered list of segments from left to right. The scene is the same as in the previous step (step \\(26\\) of \\(26\\), the most open \\(3\\) on \\([3, 4]\\)): the event queue is empty, the status is empty and all the pairs were found without testing all \\(10\\) pairs. This step is text only; the next lesson, on segment intersections, uses the same idea.',
            ),
            formulaIds: ['interval-pair-count'],
            frames: [frame('intervalsweep-rotated-explanation', 'explanation'), frame('intervalsweep-rotated-observation', 'observation')],
            observationPrompt: text('Povej, kaj bi bilo v ravnini dogodek in kaj stanje pometalne premice.', 'Say what an event and what the status of the sweep line would be in the plane.'),
            expectedObservations: [text('Prizor je ostal na koraku \\(26\\) od \\(26\\); vrsta dogodkov in stanje sta prazna.', 'The scene stayed at step \\(26\\) of \\(26\\); the event queue and the status are empty.')],
            scene: sweepScene('intervalsweep-rotated', INTERVAL_EXAMPLE, [setTraceStep('end')],
                'Sled je na koraku \\(26\\) od \\(26\\); vrsta dogodkov in stanje sta prazna.',
                'The trace is at step \\(26\\) of \\(26\\); the event queue and the status are empty.'),
        },
        {
            id: 'intervalsweep-explore', order: 7,
            title: text('Prosto raziskovanje', 'Free exploration'),
            purpose: text('Samostojno preizkusiti pometanje, tudi na intervalu dolžine nič.', 'Trying the sweep on your own, including an interval of length zero.'),
            explanation: text(
                'Prizor ima drugi vzorec: \\(a=[0,3]\\), \\(b=[3,6]\\), \\(c=[3,3]\\), \\(d=[5,8]\\). Interval \\(c\\) ima dolžino nič in leži v točki \\(x=3\\), kjer se \\(a\\) konča in \\(b\\) začne. Sled je na koraku \\(1\\) od \\(21\\) in predvajanje je ustavljeno. Če sled izvedeš do konca, najde štiri pare \\(ab, ac, bc, bd\\) od \\(\\binom{4}{2}=6\\) in največ odprtih je \\(3\\) na \\([3, 3]\\): vstopa pridejo pred izstopi, zato se v točki \\(x=3\\) vsi trije hkrati odprejo. Dodajaj intervale, premikaj krajišča (tudi s tipkovnico) in opazuj, kako se pari spreminjajo; vsaka sprememba vrne sled na začetek.',
                'The scene has the second sample: \\(a=[0,3]\\), \\(b=[3,6]\\), \\(c=[3,3]\\), \\(d=[5,8]\\). The interval \\(c\\) has length zero and lies at the point \\(x=3\\), where \\(a\\) ends and \\(b\\) begins. The trace is at step \\(1\\) of \\(21\\) and playback is stopped. If you run the trace to the end, it finds four pairs \\(ab, ac, bc, bd\\) out of \\(\\binom{4}{2}=6\\) and the most open is \\(3\\) on \\([3, 3]\\): entering events come before leaving events, so at \\(x=3\\) all three are open at once. Add intervals, move the endpoints (also with the keyboard) and watch how the pairs change; every edit returns the trace to its start.',
            ),
            formulaIds: ['interval-open-count', 'interval-pair-count'],
            frames: [frame('intervalsweep-explore-explanation', 'explanation'), frame('intervalsweep-explore-observation', 'observation')],
            observationPrompt: text('Premakni krajišče intervala \\(d\\) levo čez \\(x=3\\) in preveri, kako se spremenita število parov in največje število odprtih.', 'Move an endpoint of the interval \\(d\\) left past \\(x=3\\) and check how the number of pairs and the largest open count change.'),
            expectedObservations: [text('Pri drugem vzorcu sled na začetku kaže korak \\(1\\) od \\(21\\); na koncu so \\(4\\) pari od \\(6\\) in največ \\(3\\) odprtih na \\([3, 3]\\).', 'For the second sample the trace starts at step \\(1\\) of \\(21\\); at the end there are \\(4\\) pairs out of \\(6\\) and the most open is \\(3\\) on \\([3, 3]\\).')],
            scene: sweepScene('intervalsweep-explore', INTERVAL_SAMPLE_2, [],
                'Drugi vzorec: sled je na koraku \\(1\\) od \\(21\\); predvajanje je ustavljeno.',
                'The second sample: the trace is at step \\(1\\) of \\(21\\); playback is stopped.'),
        },
    ],
    sources: [
        {id: 'berg-sweep', citation: 'de Berg, M., Cheong, O., van Kreveld, M., Overmars, M. Computational Geometry: Algorithms and Applications, 3rd ed., Chapter 2 (line segment intersection; the plane sweep).'},
        {
            id: 'bezeg-interval-sweep-implementation',
            citation: 'Bezeg source: src/compgeo/sweep/intervalSweep.ts, src/graphs/compgeo/intervalSweepRun.ts and src/graphs/compgeo/IntervalSweepGraph.tsx.',
            implementationCorrespondence: 'The trace sorts the endpoints with entering events before leaving events at an equal coordinate (closed intervals), reports a pair when an interval enters while another is open, and counts the open intervals after each endpoint; a lesson scene sets the intervals and the step with the point-set actions (set-points in intervals mode, set-trace-step) and presses Next step with the algorithm-trace animation actions, the same transition as the button, and playback is never started by a scene.',
        },
    ],
    edgeCases: [
        text('Zaprta intervala, ki se dotikata v eni točki, ali interval dolžine nič v krajišču drugega, se štejeta za prekrivajoča; pari so vseeno sporočeni natanko enkrat.', 'Closed intervals that touch in one point, or a zero-length interval on an endpoint of another, count as overlapping; every pair is still reported exactly once.'),
        text('Pometanje sprejme največ deset intervalov z mrežnimi krajišči; neveljaven vnos se zavrne s sporočilom.', 'The sweep accepts at most ten intervals with grid endpoints; an invalid input is refused with a message.'),
    ],
    unresolvedQuestions: [],
};

/**
 * Segment-intersections lesson (docs/specs/sweep-algorithms-lessons.md, C2). The scenes use the `point-set` actions (`set-points`
 * in segments mode, `set-trace-step`) of `BentleyOttmannGraph`; `BentleyOttmannLessonActions.host.test.tsx` checks every quoted
 * value against the real graph's readout. Segments are named like the board labels, s1..s4 (the spec's s_0..s_3). The default
 * example has 47 trace steps ("Korak k od 47" is the trace index k - 1) and 13 events: index 9 queues the first crossing, index 11
 * is the status after all four upper endpoints, index 16 the first swap, index 46 `done` (5 crossings, 9 neighbour tests against
 * 6 pairs). The degenerate example has 25 steps; index 15 is the swap at (2,2) after one report of all four segments.
 */
export const SEGMENT_TRACE_STEPS = {queued: 9, allInserted: 11, firstSwap: 16, degenerateSwap: 15} as const;

/** The default example of C2 (s1..s4) and the degenerate example (a, b, c, d through (2,2)), as [ax, ay, bx, by]. */
export const SEGMENT_EXAMPLE: readonly (readonly [number, number, number, number])[] = [[0, 0, 6, 4], [0, 4, 6, 0], [1, -1, 2, 5], [4, 5, 5, -1]];
export const SEGMENT_DEGENERATE: readonly (readonly [number, number, number, number])[] = [[0, 0, 4, 4], [0, 4, 4, 0], [0, 2, 4, 2], [2, 0, 2, 4]];

/** The `set-points` action of segments mode: segment k is the pair of consecutive points 2k, 2k + 1. */
const segments = (list: readonly (readonly [number, number, number, number])[]): LessonAction =>
    ({kind: 'point-set', operation: 'set-points', mode: 'segments', points: list.flatMap(([ax, ay, bx, by]): LessonPoint[] => [[ax, ay], [bx, by]])});
/** The segments' bounding box with a margin of 1: x from the least to the greatest endpoint, y likewise (default example: x -1..7, y -2..6). */
export const segmentView = (list: readonly (readonly [number, number, number, number])[]): LessonViewBox => {
    const xs = list.flatMap(([ax, , bx]) => [ax, bx]);
    const ys = list.flatMap(([, ay, , by]) => [ay, by]);
    return [Math.min(...xs) - 1, Math.max(...ys) + 1, Math.max(...xs) + 1, Math.min(...ys) - 1];
};
/** A segment-sweep scene framed on its segments: the segments (which return to step 0 and pause), then the step actions. */
const segmentScene = (id: string, list: readonly (readonly [number, number, number, number])[], steps: readonly LessonAction[], sl: string, en: string): LessonScene =>
    ({id, basedOn: 'demonstration-default', view: segmentView(list), actions: [segments(list), ...steps], expectedState: text(sl, en)});

const segmentIntersections: GuidedLesson = {
    demonstrationId: 'segment-intersections',
    title: text('Presečišča daljic', 'Segment intersections'),
    summary: text(
        'Pometalna premica gre navzdol po ravnini, stanje hrani daljice po vrsti od leve proti desni, presečišča pa najdemo s preizkusom samo sosednjih daljic.',
        'A sweep line moving down the plane, a status that keeps the segments in order from left to right, and crossings found by testing only neighbouring segments.',
    ),
    prerequisites: [
        text('Lekcija Pometanje intervalov (vrsta dogodkov in stanje) ter lekcija Orientacija treh točk.', 'The lesson Interval sweep (event queue and status) and the lesson Orientation of three points.'),
    ],
    learningGoals: [
        text('Slediš vrsti dogodkov in stanju: kdaj daljica vstopi, izstopi ali zamenja mesto s sosedo.', 'Follow the event queue and the status: when a segment enters, leaves or swaps places with a neighbour.'),
        text('Razložiš, zakaj zadostuje preizkusiti samo sosednji daljici, in prešteješ preizkuse.', 'Explain why testing only neighbouring segments is enough, and count the tests.'),
        text('Primerjaš število preizkusov s številom vseh parov \\(\\binom{n}{2}\\) in poveš mejo \\(O((n+k)\\log n)\\).', 'Compare the number of tests with the number of all pairs \\(\\binom{n}{2}\\) and state the bound \\(O((n+k)\\log n)\\).'),
    ],
    formulaBlocks: [
        {
            id: 'segment-sweep-bound',
            latex: 'O\\bigl((n+k)\\log n\\bigr)',
            notation: text(
                '\\(n\\) je število daljic, \\(k\\) je število presečišč, ki jih pometanje najde (velikost izhoda).',
                '\\(n\\) is the number of segments and \\(k\\) is the number of crossings the sweep finds (the size of the output).',
            ),
            explanation: text(
                'Dogodkov je \\(2n\\) krajišč in \\(k\\) presečišč, vsak dogodek obdelamo v času \\(O(\\log n)\\), ker vrsto dogodkov in stanje hranimo urejena. Pri majhnem \\(n\\) in velikem \\(k\\) pometanje ne prihrani nič; prihranek se pokaže pri velikem \\(n\\) in majhnem \\(k\\), saj preizkus vseh parov vedno stane \\(\\binom{n}{2}\\).',
                'The events are the \\(2n\\) endpoints and the \\(k\\) crossings, and each event is handled in time \\(O(\\log n)\\) because the event queue and the status are kept sorted. For small \\(n\\) and large \\(k\\) the sweep saves nothing; the saving shows when \\(n\\) is large and \\(k\\) small, since testing all pairs always costs \\(\\binom{n}{2}\\).',
            ),
        },
        {
            id: 'segment-pair-count',
            latex: '\\binom{n}{2}=\\frac{n(n-1)}{2}',
            notation: text(
                '\\(n\\) je število daljic; \\(\\binom{n}{2}\\) je število vseh parov daljic.',
                '\\(n\\) is the number of segments; \\(\\binom{n}{2}\\) is the number of all pairs of segments.',
            ),
            explanation: text(
                'Za \\(n=4\\) je vseh parov \\(\\binom{4}{2}=6\\). Pometanje na tem primeru preizkusi \\(9\\) parov sosednjih daljic, torej več kot \\(6\\): ker je \\(n\\) majhen in ima vsak par presečišče, ni ničesar za prihraniti.',
                'For \\(n=4\\) there are \\(\\binom{4}{2}=6\\) pairs. On this example the sweep tests \\(9\\) pairs of neighbouring segments, more than \\(6\\): \\(n\\) is small and nearly every pair crosses, so there is nothing to save.',
            ),
        },
    ],
    workedExamples: [
        {
            id: 'segment-crossing-example',
            title: text('Prvo presečišče \\(s_2\\) in \\(s_3\\)', 'The first crossing of \\(s_2\\) and \\(s_3\\)'),
            calculationLatex: '4-\\tfrac23x=6x-7\\;\\Rightarrow\\;x=\\tfrac{33}{20},\\quad y=6\\cdot\\tfrac{33}{20}-7=\\tfrac{29}{10}',
            resultLatex: '\\bigl(\\tfrac{33}{20},\\tfrac{29}{10}\\bigr)',
            check: text(
                'Izpis „Presečišča doslej“ navaja točko \\(33/20\\) in \\(29/10\\) z daljicama s2, s3.',
                'The readout "Intersection points so far" lists the point \\(33/20\\), \\(29/10\\) with the segments s2, s3.',
            ),
        },
        {
            id: 'segment-tests-example',
            title: text('Preizkusi proti vsem parom', 'Tests against all pairs'),
            calculationLatex: '\\binom{4}{2}=\\frac{4\\cdot3}{2}=6,\\qquad 9>6',
            resultLatex: '9\\text{ neighbour tests},\\ 6\\text{ pairs}',
            check: text(
                'Izpis pove „Preizkusov sosednjih daljic doslej: 9; preizkus vseh parov bi jih imel 6“.',
                'The readout says "Neighbour tests so far: 9; testing all pairs would take 6".',
            ),
        },
    ],
    steps: [
        {
            id: 'segint-segments', order: 1,
            title: text('Štiri daljice', 'Four segments'),
            purpose: text('Spoznati daljice in vprašanje, na katero odgovarja pometanje.', 'Meeting the segments and the question the sweep answers.'),
            explanation: text(
                'Na sliki so štiri daljice: \\(s_1\\) od \\((0,0)\\) do \\((6,4)\\), \\(s_2\\) od \\((0,4)\\) do \\((6,0)\\), \\(s_3\\) od \\((1,-1)\\) do \\((2,5)\\) in \\(s_4\\) od \\((4,5)\\) do \\((5,-1)\\). Iščemo vsa presečišča. Preizkus vseh parov bi bil \\(\\binom{4}{2}=6\\) preizkusov; pometalna premica pa gre od zgoraj navzdol in preizkuša samo daljici, ki sta si v stanju sosednji. Izpis kaže „Korak 1 od 47“, preizkusov doslej je \\(0\\) in presečišč še ni.',
                'The picture shows four segments: \\(s_1\\) from \\((0,0)\\) to \\((6,4)\\), \\(s_2\\) from \\((0,4)\\) to \\((6,0)\\), \\(s_3\\) from \\((1,-1)\\) to \\((2,5)\\) and \\(s_4\\) from \\((4,5)\\) to \\((5,-1)\\). We look for all the crossings. Testing all pairs would take \\(\\binom{4}{2}=6\\) tests; the sweep line instead goes from top to bottom and tests only the segments that are neighbours in the status. The readout shows "Step 1 of 47", there are \\(0\\) tests so far and no crossings yet.',
            ),
            formulaIds: ['segment-pair-count'],
            frames: [frame('segint-segments-explanation', 'explanation'), frame('segint-segments-observation', 'observation')],
            observationPrompt: text('Poglej daljice in z očmi poišči pare, ki se sekajo.', 'Look at the segments and find, by eye, the pairs that cross.'),
            expectedObservations: [text('Sled je na koraku \\(1\\) od \\(47\\), preizkusov je \\(0\\) od \\(6\\) možnih parov in presečišč še ni.', 'The trace is at step \\(1\\) of \\(47\\), there are \\(0\\) tests against \\(6\\) possible pairs and no crossings yet.')],
            scene: segmentScene('segint-segments', SEGMENT_EXAMPLE, [],
                'Štiri daljice; sled je na koraku \\(1\\) od \\(47\\), preizkusov \\(0\\), presečišč še ni.',
                'Four segments; the trace is at step \\(1\\) of \\(47\\), \\(0\\) tests, no crossings yet.'),
        },
        {
            id: 'segint-predict', order: 2,
            title: text('Napovej presečišča', 'Predict the crossings'),
            purpose: text('Pred razkritjem napovedati število presečišč in pare, ki se sekajo.', 'Predicting the number of crossings and the pairs that cross before the reveal.'),
            explanation: text(
                'Preden premakneš pometalno premico, napovej: koliko presečišč je in kateri pari daljic se sekajo? Namig: vsaka daljica se lahko seka z vsemi tremi drugimi, zato je največ \\(6\\) presečišč. Sled je še na koraku \\(1\\) od \\(47\\), zato presečišč še ne poznamo.',
                'Before you move the sweep line, predict: how many crossings are there and which pairs of segments cross? Hint: each segment can cross each of the other three, so there are at most \\(6\\) crossings. The trace is still at step \\(1\\) of \\(47\\), so no crossing is known yet.',
            ),
            formulaIds: ['segment-pair-count'],
            frames: [frame('segint-predict-explanation', 'explanation'), frame('segint-predict-observation', 'observation')],
            observationPrompt: text('Zapiši število presečišč in pare, ki se po tvoji presoji sekajo.', 'Write down the number of crossings and the pairs that, in your view, cross.'),
            expectedObservations: [text('Napoved še ni preverjena; sled je na koraku \\(1\\) od \\(47\\) in jo primerjamo v naslednjih korakih.', 'The prediction is not checked yet; the trace is at step \\(1\\) of \\(47\\) and the next steps compare it.')],
            scene: segmentScene('segint-predict', SEGMENT_EXAMPLE, [],
                'Sled je na koraku \\(1\\) od \\(47\\); presečišč še ni.',
                'The trace is at step \\(1\\) of \\(47\\); no crossings yet.'),
        },
        {
            id: 'segint-insert', order: 3,
            title: text('Vrsta dogodkov in stanje', 'Event queue and status'),
            purpose: text('Slediti vstavljanju zgornjih krajišč v stanje po vrstnem redu na pometalni premici.', 'Following the upper endpoints being inserted into the status in the order along the sweep line.'),
            explanation: text(
                'Vrsta dogodkov hrani krajišča od zgoraj navzdol, pri enaki višini od leve proti desni. Pometalna premica skoči na prvi dogodek in ga obdela: zgornje krajišče vstavi daljico v stanje na mesto, ki ga določa vrstni red vzdolž premice. Zgornja krajišča so \\((2,5)\\) za \\(s_3\\), \\((4,5)\\) za \\(s_4\\), \\((0,4)\\) za \\(s_2\\) in \\((6,4)\\) za \\(s_1\\). Enajst korakov je že narejenih: premica je pri \\(y=4\\), izpis kaže „Korak 12 od 47“ in stanje od leve proti desni je \\(s_2, s_3, s_4, s_1\\). Preizkusov sosednjih daljic je doslej \\(2\\).',
                'The event queue keeps the endpoints from top to bottom, from left to right at equal height. The sweep line jumps to the first event and handles it: an upper endpoint inserts the segment into the status at the place given by the order along the line. The upper endpoints are \\((2,5)\\) for \\(s_3\\), \\((4,5)\\) for \\(s_4\\), \\((0,4)\\) for \\(s_2\\) and \\((6,4)\\) for \\(s_1\\). Eleven steps are already done: the line is at \\(y=4\\), the readout shows "Step 12 of 47" and the status from left to right is \\(s_2, s_3, s_4, s_1\\). There have been \\(2\\) neighbour tests so far.',
            ),
            formulaIds: ['segment-sweep-bound'],
            frames: [frame('segint-insert-explanation', 'explanation'), frame('segint-insert-observation', 'observation')],
            observationPrompt: text('Pritiskaj Naslednji korak in pri vsakem vstavljanju povej, kje v stanju je nova daljica.', 'Press Next step and, at each insertion, say where in the status the new segment goes.'),
            expectedObservations: [text('Po štirih vstopih je stanje \\(s_2, s_3, s_4, s_1\\) in preizkusov sosednjih daljic je \\(2\\).', 'After four insertions the status is \\(s_2, s_3, s_4, s_1\\) and there have been \\(2\\) neighbour tests.')],
            scene: segmentScene('segint-insert', SEGMENT_EXAMPLE, [setTraceStep(SEGMENT_TRACE_STEPS.allInserted)],
                'Sled je na koraku \\(12\\) od \\(47\\): stanje \\(s_2, s_3, s_4, s_1\\), preizkusov sosednjih daljic \\(2\\).',
                'The trace is at step \\(12\\) of \\(47\\): status \\(s_2, s_3, s_4, s_1\\), \\(2\\) neighbour tests.'),
        },
        {
            id: 'segint-neighbours', order: 4,
            title: text('Preizkus sosednjih daljic', 'Testing neighbours'),
            purpose: text('Videti, da se po vsakem vstavljanju preizkusijo samo nove sosednje daljice in da se najdeno presečišče v vrsto uvrsti enkrat.', 'Seeing that after each insertion only the new neighbours are tested and a crossing found is queued once.'),
            explanation: text(
                'Ob vstavljanju ali odstranjevanju se preizkusijo samo novi sosednji pari, ne vsi. Ko je \\(s_2\\) vstopila levo od \\(s_3\\), sta postali sosednji \\(s_2\\) in \\(s_3\\); preizkus je pokazal, da se sekata pod pometalno premico, zato je njuno presečišče \\(\\bigl(\\tfrac{33}{20},\\tfrac{29}{10}\\bigr)=(1{,}65;\\,2{,}9)\\) prišlo v vrsto dogodkov, in to samo enkrat. Izpis kaže „Korak 10 od 47“ in preizkusov je \\(2\\). Presečišče izračunamo iz \\(4-\\tfrac23x=6x-7\\).',
                'On an insertion or a removal only the new neighbouring pairs are tested, not all pairs. When \\(s_2\\) entered to the left of \\(s_3\\), the segments \\(s_2\\) and \\(s_3\\) became neighbours; the test showed that they meet below the sweep line, so their crossing \\(\\bigl(\\tfrac{33}{20},\\tfrac{29}{10}\\bigr)=(1.65,\\,2.9)\\) was queued as an event, and only once. The readout shows "Step 10 of 47" and there have been \\(2\\) tests. The crossing follows from \\(4-\\tfrac23x=6x-7\\).',
            ),
            formulaIds: ['segment-sweep-bound'], workedExampleId: 'segment-crossing-example',
            frames: [frame('segint-neighbours-explanation', 'explanation'), frame('segint-neighbours-calculation', 'calculation'), frame('segint-neighbours-observation', 'observation')],
            observationPrompt: text('Poišči v stanju sosednji daljici, ki ju je zadnji preizkus obravnaval, in preveri, da sta v vrsti dogodkov presečišče in naslednji dogodek.', 'Find in the status the neighbouring segments the last test looked at, and check that the crossing is now in the event queue.'),
            expectedObservations: [text('Po drugem preizkusu je presečišče \\(s_2\\) in \\(s_3\\) v vrsti dogodkov, preizkusov je \\(2\\) in nobeno presečišče še ni sporočeno.', 'After the second test the crossing of \\(s_2\\) and \\(s_3\\) is in the event queue, there have been \\(2\\) tests and no crossing is reported yet.')],
            scene: segmentScene('segint-neighbours', SEGMENT_EXAMPLE, [setTraceStep(SEGMENT_TRACE_STEPS.queued)],
                'Sled je na koraku \\(10\\) od \\(47\\): presečišče \\(\\bigl(\\tfrac{33}{20},\\tfrac{29}{10}\\bigr)\\) je v vrsti dogodkov, preizkusov \\(2\\).',
                'The trace is at step \\(10\\) of \\(47\\): the crossing \\(\\bigl(\\tfrac{33}{20},\\tfrac{29}{10}\\bigr)\\) is in the event queue, \\(2\\) tests.'),
        },
        {
            id: 'segint-swap', order: 5,
            title: text('Zamenjava pri presečišču', 'The swap at a crossing'),
            purpose: text('Videti, da sta pri presečišču daljici v stanju zamenjani.', 'Seeing the two segments swapped in the status at a crossing.'),
            explanation: text(
                'Pri presečišču se vrstni red daljic vzdolž premice obrne. Dogodek presečišča \\(\\bigl(\\tfrac{33}{20},\\tfrac{29}{10}\\bigr)\\) sporoči par \\(s_2, s_3\\) in ju zamenja: stanje je prej bilo \\(s_2, s_3, s_4, s_1\\), zdaj pa je \\(s_3, s_2, s_4, s_1\\). Izpis kaže „Korak 17 od 47“, presečišč doslej je \\(1\\) in preizkusov \\(3\\). Po zamenjavi je nov sosed daljice \\(s_2\\) daljica \\(s_4\\), zato sledi preizkus tega para.',
                'At a crossing the order of the segments along the line reverses. The crossing event \\(\\bigl(\\tfrac{33}{20},\\tfrac{29}{10}\\bigr)\\) reports the pair \\(s_2, s_3\\) and swaps them: the status was \\(s_2, s_3, s_4, s_1\\) and is now \\(s_3, s_2, s_4, s_1\\). The readout shows "Step 17 of 47", \\(1\\) crossing so far and \\(3\\) tests. After the swap \\(s_2\\) has a new neighbour, \\(s_4\\), so a test of that pair follows.',
            ),
            formulaIds: ['segment-sweep-bound'],
            frames: [frame('segint-swap-explanation', 'explanation'), frame('segint-swap-observation', 'observation')],
            observationPrompt: text('Primerjaj vrstni red daljic v stanju pred zamenjavo in po njej.', 'Compare the order of the segments in the status before and after the swap.'),
            expectedObservations: [text('Po zamenjavi je stanje \\(s_3, s_2, s_4, s_1\\), najdeno je \\(1\\) presečišče in preizkusov je \\(3\\).', 'After the swap the status is \\(s_3, s_2, s_4, s_1\\), \\(1\\) crossing is found and there have been \\(3\\) tests.')],
            scene: segmentScene('segint-swap', SEGMENT_EXAMPLE, [setTraceStep(SEGMENT_TRACE_STEPS.firstSwap)],
                'Sled je na koraku \\(17\\) od \\(47\\): stanje \\(s_3, s_2, s_4, s_1\\), \\(1\\) presečišče, preizkusov \\(3\\).',
                'The trace is at step \\(17\\) of \\(47\\): status \\(s_3, s_2, s_4, s_1\\), \\(1\\) crossing, \\(3\\) tests.'),
        },
        {
            id: 'segint-summary', order: 6,
            title: text('Povzetek in meja', 'Summary and the bound'),
            purpose: text('Primerjati število preizkusov s številom vseh parov in razumeti mejo \\(O((n+k)\\log n)\\).', 'Comparing the number of tests with the number of all pairs and understanding the bound \\(O((n+k)\\log n)\\).'),
            explanation: text(
                'Sled je izvedena do konca (korak \\(47\\) od \\(47\\)). Obdelanih je \\(13\\) dogodkov (\\(8\\) krajišč in \\(5\\) presečišč) in najdenih je \\(5\\) presečišč: \\(\\bigl(\\tfrac{33}{20},\\tfrac{29}{10}\\bigr)\\), \\(\\bigl(\\tfrac{87}{20},\\tfrac{29}{10}\\bigr)\\), \\((3,2)\\), \\(\\bigl(\\tfrac{21}{16},\\tfrac78\\bigr)\\) in \\(\\bigl(\\tfrac{75}{16},\\tfrac78\\bigr)\\). Preizkusov sosednjih daljic je bilo \\(9\\), preizkus vseh parov pa bi jih imel \\(\\binom{4}{2}=6\\): na tem majhnem primeru je pometanje dražje, ne cenejše. Prihranek se pokaže pri velikem \\(n\\) in majhnem \\(k\\): čas je \\(O((n+k)\\log n)\\), kjer je \\(k\\) število presečišč, vseh parov pa je \\(\\binom{n}{2}\\).',
                'The trace has run to the end (step \\(47\\) of \\(47\\)). \\(13\\) events were handled (\\(8\\) endpoints and \\(5\\) crossings) and \\(5\\) crossings were found: \\(\\bigl(\\tfrac{33}{20},\\tfrac{29}{10}\\bigr)\\), \\(\\bigl(\\tfrac{87}{20},\\tfrac{29}{10}\\bigr)\\), \\((3,2)\\), \\(\\bigl(\\tfrac{21}{16},\\tfrac78\\bigr)\\) and \\(\\bigl(\\tfrac{75}{16},\\tfrac78\\bigr)\\). There were \\(9\\) neighbour tests, whereas testing all pairs would take \\(\\binom{4}{2}=6\\): on this small example the sweep costs more, not less. The saving appears when \\(n\\) is large and \\(k\\) small: the time is \\(O((n+k)\\log n)\\), where \\(k\\) is the number of crossings, whereas all pairs number \\(\\binom{n}{2}\\).',
            ),
            formulaIds: ['segment-sweep-bound', 'segment-pair-count'], workedExampleId: 'segment-tests-example',
            frames: [frame('segint-summary-explanation', 'explanation'), frame('segint-summary-calculation', 'calculation'), frame('segint-summary-observation', 'observation')],
            observationPrompt: text('Primerjaj število preizkusov s številom vseh parov in preveri svojo napoved presečišč.', 'Compare the number of tests with the number of all pairs, and check your prediction of the crossings.'),
            expectedObservations: [text('Obdelanih je \\(13\\) dogodkov, najdenih \\(5\\) presečišč, preizkusov sosednjih daljic \\(9\\) proti \\(6\\) parom.', '\\(13\\) events are handled, \\(5\\) crossings found, \\(9\\) neighbour tests against \\(6\\) pairs.')],
            scene: segmentScene('segint-summary', SEGMENT_EXAMPLE, [setTraceStep('end')],
                'Sled je na koraku \\(47\\) od \\(47\\): \\(13\\) dogodkov, \\(5\\) presečišč, preizkusov \\(9\\) proti \\(6\\) parom.',
                'The trace is at step \\(47\\) of \\(47\\): \\(13\\) events, \\(5\\) crossings, \\(9\\) tests against \\(6\\) pairs.'),
        },
        {
            id: 'segint-explore', order: 7,
            title: text('Prosto raziskovanje', 'Free exploration'),
            purpose: text('Samostojno preizkusiti pometanje, tudi ko gre več daljic skozi isto točko.', 'Trying the sweep on your own, including several segments through one point.'),
            explanation: text(
                'Prizor ima izrojen primer: \\(s_1\\) od \\((0,0)\\) do \\((4,4)\\), \\(s_2\\) od \\((0,4)\\) do \\((4,0)\\), \\(s_3\\) od \\((0,2)\\) do \\((4,2)\\) in navpična \\(s_4\\) od \\((2,0)\\) do \\((2,4)\\) gredo vse skozi \\((2,2)\\). Pometanje sporoči eno presečišče z vsemi štirimi daljicami in njihov vrstni red v stanju obrne v enem koraku: stanje \\(s_3, s_2, s_4, s_1\\) postane \\(s_1, s_4, s_2, s_3\\). Izpis kaže „Korak 16 od 25“, presečišč je \\(1\\) in preizkusov \\(3\\). Zdaj premikaj krajišča ali dodajaj daljice in opazuj stanje.',
                'The scene has a degenerate example: \\(s_1\\) from \\((0,0)\\) to \\((4,4)\\), \\(s_2\\) from \\((0,4)\\) to \\((4,0)\\), \\(s_3\\) from \\((0,2)\\) to \\((4,2)\\) and the vertical \\(s_4\\) from \\((2,0)\\) to \\((2,4)\\) all pass through \\((2,2)\\). The sweep reports one crossing with all four segments and reverses their order in the status in one step: the status \\(s_3, s_2, s_4, s_1\\) becomes \\(s_1, s_4, s_2, s_3\\). The readout shows "Step 16 of 25", \\(1\\) crossing and \\(3\\) tests. Now move the endpoints or add segments and watch the status.',
            ),
            formulaIds: ['segment-sweep-bound', 'segment-pair-count'],
            frames: [frame('segint-explore-explanation', 'explanation'), frame('segint-explore-observation', 'observation')],
            observationPrompt: text('Premakni krajišče daljice \\(s_3\\), da ne gre več skozi \\((2,2)\\), in preveri, koliko presečišč je zdaj.', 'Move an endpoint of the segment \\(s_3\\) so that it no longer passes through \\((2,2)\\), and check how many crossings there are now.'),
            expectedObservations: [text('Pri izrojenem primeru je sled na koraku \\(16\\) od \\(25\\): eno presečišče z vsemi štirimi daljicami, stanje \\(s_1, s_4, s_2, s_3\\), preizkusov \\(3\\).', 'In the degenerate example the trace is at step \\(16\\) of \\(25\\): one crossing with all four segments, status \\(s_1, s_4, s_2, s_3\\), \\(3\\) tests.')],
            scene: segmentScene('segint-explore', SEGMENT_DEGENERATE, [setTraceStep(SEGMENT_TRACE_STEPS.degenerateSwap)],
                'Izrojen primer: sled je na koraku \\(16\\) od \\(25\\), eno presečišče \\((2,2)\\) z vsemi štirimi daljicami, preizkusov \\(3\\).',
                'The degenerate example: the trace is at step \\(16\\) of \\(25\\), one crossing \\((2,2)\\) with all four segments, \\(3\\) tests.'),
        },
    ],
    sources: [
        {id: 'berg-sweep-segments', citation: 'de Berg, M., Cheong, O., van Kreveld, M., Overmars, M. Computational Geometry: Algorithms and Applications, 3rd ed., Section 2.1 (line segment intersection; the Bentley-Ottmann sweep).'},
        {
            id: 'bezeg-segment-sweep-implementation',
            citation: 'Bezeg source: src/compgeo/sweep/, src/graphs/compgeo/bentleyOttmannRun.ts and src/graphs/compgeo/BentleyOttmannGraph.tsx.',
            implementationCorrespondence: 'The trace pops events from top to bottom (left to right at equal height), keeps the status sorted along the sweep line with exact rational comparisons, tests only the new neighbouring pairs after an insertion, a removal or a swap, queues each crossing once, and reports a point once with all segments through it; a lesson scene sets the segments and the step with the point-set actions (set-points in segments mode, set-trace-step), and playback is never started by a scene.',
        },
    ],
    edgeCases: [
        text('Če gre več daljic skozi isto točko, se točka sporoči enkrat z vsemi daljicami, njihov vrstni red v stanju pa se obrne v enem koraku.', 'When several segments pass through one point, the point is reported once with all the segments, and their order in the status reverses in one step.'),
        text('Daljici, ki se prekrivata v daljici, ne v točki, pometanje zavrne s sporočilom; pometanje sprejme največ dvanajst daljic z mrežnimi krajišči.', 'Two segments that overlap in a segment, not in a point, are refused with a message; the sweep accepts at most twelve segments with grid endpoints.'),
    ],
    unresolvedQuestions: [],
};

export const compgeoGuidedLessons: readonly GuidedLesson[] = [orientation, polygonArea, convexHull, earClipping, intervalSweep, segmentIntersections];
