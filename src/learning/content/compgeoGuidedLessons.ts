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
 * Point-set triangulation lesson (docs/specs/triangulation-voronoi-lessons.md, B2). The scenes use the `point-set` actions
 * (`set-points`, `set-overlay`, `set-triangulation`, `flip-edge`, `select-edge`) of `TriangulationGraph`;
 * `compgeoPointSetTriangulationLesson.test.ts` checks every quoted value against the real graph's readout. The points are labelled
 * P1 to P7 on the graph (index + 1), so the prose says P1 to P7 where the spec says p0 to p6.
 */
export const TRI_EXAMPLE_POINTS: readonly LessonPoint[] = [[0, 0], [8, 0], [9, 6], [4, 8], [-1, 5], [3, 3], [6, 3]];
/** The starting triangulation T0 of the example, by point index. */
export const TRI_T0: readonly (readonly [number, number, number])[] = [[1, 2, 6], [1, 5, 4], [1, 6, 5], [2, 3, 4], [4, 0, 1], [4, 5, 6], [6, 2, 4]];
/** The Delaunay triangulation of the example, by point index (taken from `delaunayTriangulation`; the test recomputes it). */
export const TRI_DELAUNAY: readonly (readonly [number, number, number])[] = [[4, 0, 5], [5, 3, 4], [0, 1, 5], [5, 6, 3], [1, 6, 5], [1, 2, 6], [2, 3, 6]];
/** The flipped edge of step 4 (P2-P5, legal) and the edge it shows refused (P2-P7, not a convex quadrilateral). */
export const TRI_FLIP_EDGE: readonly [number, number] = [1, 4];
export const TRI_REFUSED_EDGE: readonly [number, number] = [1, 6];
/** Step 5: one point inside a triangle (P8) and one outside the hull (P9). */
export const TRI_INSIDE_POINT: LessonPoint = [6, 2];
export const TRI_OUTSIDE_POINT: LessonPoint = [10, 1];
/** The nine points of the hull lesson (sample 1): k = 6 with one collinear boundary point. */
export const TRI_NINE_POINTS: readonly LessonPoint[] = [[2, 2], [4, 0], [0, 0], [5, 3], [2, 5], [-1, 3], [3, 1], [2, 0], [1, 1]];

type TriOverlay = 'triangulation' | 'edges' | 'angles';
const TRI_OVERLAYS: readonly TriOverlay[] = ['triangulation', 'edges', 'angles'];
const setTriangulation = (triangles: readonly (readonly [number, number, number])[]): LessonAction => ({kind: 'point-set', operation: 'set-triangulation', triangles});
const flipEdge = (edge: readonly [number, number]): LessonAction => ({kind: 'point-set', operation: 'flip-edge', edge});
const selectEdge = (edge: readonly [number, number]): LessonAction => ({kind: 'point-set', operation: 'select-edge', edge});
/** A triangulation scene framed on its points: the points, exactly the listed overlays, then the step actions. */
const triScene = (id: string, list: readonly LessonPoint[], shown: readonly TriOverlay[], steps: readonly LessonAction[], sl: string, en: string): LessonScene =>
    ({id, basedOn: 'demonstration-default', view: earView(list), actions: [points(list), ...TRI_OVERLAYS.map(name => overlay(name, shown.includes(name))), ...steps], expectedState: text(sl, en)});

const pointSetTriangulation: GuidedLesson = {
    demonstrationId: 'point-set-triangulation',
    title: text('Triangulacija množice točk', 'Triangulating a set of points'),
    summary: text(
        'Vse triangulacije iste množice \\(n\\) točk, od katerih jih je \\(k\\) na robu konveksne ovojnice, imajo \\(2n-2-k\\) trikotnikov in \\(3n-3-k\\) robov; zamenjava roba spremeni trikotnike, ne pa teh števil.',
        'All triangulations of the same set of \\(n\\) points, \\(k\\) of which lie on the boundary of the convex hull, have \\(2n-2-k\\) triangles and \\(3n-3-k\\) edges; flipping an edge changes the triangles but not these numbers.',
    ),
    prerequisites: [
        text('Potrebna je lekcija o konveksni ovojnici: število \\(k\\) točk na robu ovojnice pove število trikotnikov.', 'The lesson on the convex hull is required: the number \\(k\\) of points on the hull boundary gives the number of triangles.'),
        text('Priporočeno je znanje iz lekcije o rezanju ušes, kjer spoznamo, kaj je triangulacija.', 'Recommended is the lesson on ear clipping, which shows what a triangulation is.'),
    ],
    learningGoals: [
        text('Prešteješ trikotnike in robove triangulacije množice točk s formulama \\(2n-2-k\\) in \\(3n-3-k\\).', 'Count the triangles and edges of a triangulation of a point set with the formulas \\(2n-2-k\\) and \\(3n-3-k\\).'),
        text('Z zamenjavo roba spremeniš triangulacijo in ugotoviš, da se števila ne spremenijo; razložiš, zakaj nekaterih robov ni mogoče zamenjati.', 'Flip an edge to change the triangulation, find that the counts stay the same, and explain why some edges cannot be flipped.'),
        text('Primerjaš najmanjši kot dveh triangulacij iste množice točk.', 'Compare the smallest angle of two triangulations of the same point set.'),
    ],
    formulaBlocks: [
        {
            id: 'tri-count-formula',
            latex: 'T=2n-2-k,\\qquad E=3n-3-k',
            notation: text(
                '\\(n\\) je število točk, \\(k\\) število točk na robu konveksne ovojnice (štejejo tudi kolinearne), \\(T\\) število trikotnikov in \\(E\\) število robov.',
                '\\(n\\) is the number of points, \\(k\\) the number of points on the boundary of the convex hull (collinear ones count too), \\(T\\) the number of triangles and \\(E\\) the number of edges.',
            ),
            explanation: text(
                'Vsota notranjih kotov vseh trikotnikov je \\(180^\\circ\\,T\\). Vsaka od \\(n-k\\) točk v notranjosti prispeva \\(360^\\circ\\), vse točke na robu ovojnice skupaj pa \\(180^\\circ(k-2)\\), kolikor je vsota kotov konveksnega \\(k\\)-kotnika. Zato je \\(180^\\circ\\,T=360^\\circ(n-k)+180^\\circ(k-2)\\), torej \\(T=2n-2-k\\). Vsak trikotnik ima tri stranice, notranji rob jih deli z dvema trikotnikoma, rob ovojnice pa z enim; zato je \\(3T=2E-k\\) in \\(E=3n-3-k\\).',
                'The sum of the interior angles of all triangles is \\(180^\\circ\\,T\\). Each of the \\(n-k\\) interior points contributes \\(360^\\circ\\), and all the points on the hull boundary together contribute \\(180^\\circ(k-2)\\), the angle sum of a convex \\(k\\)-gon. Hence \\(180^\\circ\\,T=360^\\circ(n-k)+180^\\circ(k-2)\\), so \\(T=2n-2-k\\). Each triangle has three sides; an interior edge is shared by two triangles and a hull edge by one, so \\(3T=2E-k\\) and \\(E=3n-3-k\\).',
            ),
        },
    ],
    workedExamples: [
        {
            id: 'tri-count-example',
            title: text('Sedem točk, \\(k=5\\)', 'Seven points, \\(k=5\\)'),
            calculationLatex: 'n=7,\\; k=5:\\; T=2\\cdot7-2-5,\\; E=3\\cdot7-3-5',
            resultLatex: 'T=7,\\; E=13',
            check: text(
                'Izpis pod grafom pokaže \\(7\\) trikotnikov in \\(13\\) robov, od tega \\(8\\) notranjih in \\(5\\) na ovojnici.',
                'The readout under the graph shows \\(7\\) triangles and \\(13\\) edges, of which \\(8\\) are interior and \\(5\\) on the hull.',
            ),
        },
        {
            id: 'tri-nine-example',
            title: text('Devet točk, \\(k=6\\)', 'Nine points, \\(k=6\\)'),
            calculationLatex: 'n=9,\\; k=6:\\; T=2\\cdot9-2-6,\\; E=3\\cdot9-3-6',
            resultLatex: 'T=10,\\; E=18',
            check: text(
                'Na robu ovojnice je \\(6\\) točk, od tega ena kolinearna, in izpis pokaže \\(10\\) trikotnikov in \\(18\\) robov.',
                'There are \\(6\\) points on the hull boundary, one of them collinear, and the readout shows \\(10\\) triangles and \\(18\\) edges.',
            ),
        },
    ],
    steps: [
        {
            id: 'tri-points', order: 1,
            title: text('Množica točk', 'The set of points'),
            purpose: text('Spoznati množico točk, ki jo bomo triangulirali.', 'Meeting the set of points that we will triangulate.'),
            explanation: text(
                'Imamo \\(n=7\\) točk \\(P_1,\\dots,P_7\\) s celoštevilskimi koordinatami; nobene tri niso kolinearne. Triangulacija jih poveže z daljicami, ki se ne sekajo, tako da množico razreže na trikotnike, ki pokrijejo konveksno ovojnico. Zaenkrat je triangulacija skrita.',
                'We have \\(n=7\\) points \\(P_1,\\dots,P_7\\) with integer coordinates; no three are collinear. A triangulation joins them by segments that do not cross, cutting the set into triangles that cover the convex hull. For now the triangulation is hidden.',
            ),
            formulaIds: ['tri-count-formula'],
            frames: [frame('tri-points-explanation', 'explanation'), frame('tri-points-observation', 'observation')],
            observationPrompt: text('Določi, katere točke ležijo na robu konveksne ovojnice.', 'Say which points lie on the boundary of the convex hull.'),
            expectedObservations: [text('Na robu ovojnice je pet točk, \\(P_5,P_1,P_2,P_3,P_4\\); točki \\(P_6\\) in \\(P_7\\) sta v notranjosti.', 'Five points lie on the hull boundary, \\(P_5,P_1,P_2,P_3,P_4\\); the points \\(P_6\\) and \\(P_7\\) are inside.')],
            scene: triScene('tri-points', TRI_EXAMPLE_POINTS, [], [],
                'Na grafu je sedem točk; triangulacija je skrita.',
                'The graph shows seven points; the triangulation is hidden.'),
        },
        {
            id: 'tri-predict', order: 2,
            title: text('Napovej število trikotnikov', 'Predict the number of triangles'),
            purpose: text('Pred razkritjem napovedati število trikotnikov.', 'Predicting the number of triangles before the reveal.'),
            explanation: text(
                'Preden prikažeš triangulacijo, napovej: koliko trikotnikov ima? Namig: vsota notranjih kotov vseh trikotnikov je \\(180^\\circ\\) krat njihovo število; točke v notranjosti prispevajo po \\(360^\\circ\\), točke na robu ovojnice pa so pri vsaki triangulaciji enake.',
                'Before you show the triangulation, predict: how many triangles does it have? Hint: the sum of all interior angles is \\(180^\\circ\\) times the number of triangles; interior points contribute \\(360^\\circ\\) each, and the points on the hull are the same in every triangulation.',
            ),
            formulaIds: ['tri-count-formula'],
            frames: [frame('tri-predict-explanation', 'explanation'), frame('tri-predict-observation', 'observation')],
            observationPrompt: text('Zapiši število trikotnikov in utemelji.', 'Write down the number of triangles and give your reason.'),
            expectedObservations: [text('Triangulacija je še skrita, zato napoved še ni preverjena; v naslednjem koraku jo primerjamo z izpisom.', 'The triangulation is still hidden, so the prediction is not yet checked; the next step compares it with the readout.')],
            scene: triScene('tri-predict', TRI_EXAMPLE_POINTS, [], [],
                'Triangulacija je še skrita; napoved se preveri v naslednjem koraku.',
                'The triangulation is still hidden; the prediction is checked in the next step.'),
        },
        {
            id: 'tri-t0', order: 3,
            title: text('Začetna triangulacija T0', 'The starting triangulation T0'),
            purpose: text('Prešteti trikotnike in robe in jih primerjati s formulo.', 'Counting the triangles and edges and comparing them with the formula.'),
            explanation: text(
                'Graf prikazuje triangulacijo T0. Na robu ovojnice je \\(k=5\\) točk, zato je trikotnikov \\(2n-2-k=2\\cdot7-2-5=7\\). Robov je \\(3n-3-k=13\\), od tega \\(8\\) notranjih in \\(5\\) na ovojnici. Najmanjši kot v T0 je \\(1{,}91^\\circ\\); to številko bomo primerjali v šestem koraku.',
                'The graph shows the triangulation T0. There are \\(k=5\\) points on the hull boundary, so the number of triangles is \\(2n-2-k=2\\cdot7-2-5=7\\). There are \\(3n-3-k=13\\) edges, \\(8\\) interior and \\(5\\) on the hull. The smallest angle in T0 is \\(1.91^\\circ\\); we compare this number in step 6.',
            ),
            formulaIds: ['tri-count-formula'], workedExampleId: 'tri-count-example',
            frames: [frame('tri-t0-explanation', 'explanation'), frame('tri-t0-calculation', 'calculation'), frame('tri-t0-observation', 'observation')],
            observationPrompt: text('Preštej trikotnike na grafu in primerjaj s svojo napovedjo.', 'Count the triangles on the graph and compare them with your prediction.'),
            expectedObservations: [text('Izpis pokaže \\(7\\) trikotnikov, \\(13\\) robov (\\(8\\) notranjih) in \\(k=5\\); najmanjši kot je \\(1{,}91^\\circ\\).', 'The readout shows \\(7\\) triangles, \\(13\\) edges (\\(8\\) interior) and \\(k=5\\); the smallest angle is \\(1.91^\\circ\\).')],
            scene: triScene('tri-t0', TRI_EXAMPLE_POINTS, ['triangulation', 'angles'], [setTriangulation(TRI_T0)],
                'T0 ima \\(7\\) trikotnikov in \\(13\\) robov, od tega \\(8\\) notranjih; najmanjši kot je \\(1{,}91^\\circ\\).',
                'T0 has \\(7\\) triangles and \\(13\\) edges, \\(8\\) of them interior; the smallest angle is \\(1.91^\\circ\\).'),
        },
        {
            id: 'tri-flip', order: 4,
            title: text('Zamenjava roba', 'Flipping an edge'),
            purpose: text('Videti, da zamenjava roba ne spremeni števil, in da nekaterih robov ni mogoče zamenjati.', 'Seeing that a flip leaves the counts unchanged, and that some edges cannot be flipped.'),
            explanation: text(
                'Rob \\(P_2P_5\\) je diagonala izbočenega štirikotnika, zato ga zamenjamo z drugo diagonalo \\(P_1P_6\\). Trikotniki so drugačni, števila pa ostanejo: še vedno \\(7\\) trikotnikov, \\(13\\) robov, od tega \\(8\\) notranjih. Zamenjava je mogoča le, če je štirikotnik izbočen. Rob \\(P_2P_7\\) je zdaj izbran: pritisni Zamenjaj rob in izpis pojasni, da trikotnika ob njem ne tvorita izbočenega štirikotnika, zato se nič ne spremeni.',
                'The edge \\(P_2P_5\\) is a diagonal of a convex quadrilateral, so we replace it with the other diagonal \\(P_1P_6\\). The triangles differ but the counts stay: still \\(7\\) triangles and \\(13\\) edges, \\(8\\) of them interior. A flip is possible only when the quadrilateral is convex. The edge \\(P_2P_7\\) is now selected: press Flip edge and the readout explains that the two triangles beside it do not form a convex quadrilateral, so nothing changes.',
            ),
            formulaIds: ['tri-count-formula'],
            frames: [frame('tri-flip-explanation', 'explanation'), frame('tri-flip-observation', 'observation')],
            observationPrompt: text('Pritisni Zamenjaj rob in preberi, zakaj zamenjava ni mogoča; nato izberi drug rob in ga zamenjaj.', 'Press Flip edge and read why the flip is not possible; then select another edge and flip it.'),
            expectedObservations: [text('Po zamenjavi so števila ista: \\(7\\) trikotnikov, \\(13\\) robov, \\(8\\) notranjih; rob \\(P_2P_7\\) zavrnejo, ker štirikotnik ni izbočen.', 'After the flip the counts are the same: \\(7\\) triangles, \\(13\\) edges, \\(8\\) interior; the edge \\(P_2P_7\\) is refused because the quadrilateral is not convex.')],
            scene: triScene('tri-flip', TRI_EXAMPLE_POINTS, ['triangulation', 'edges', 'angles'], [setTriangulation(TRI_T0), flipEdge(TRI_FLIP_EDGE), selectEdge(TRI_REFUSED_EDGE)],
                'Po zamenjavi \\(P_2P_5\\) je še vedno \\(7\\) trikotnikov in \\(13\\) robov; rob \\(P_2P_7\\) je izbran.',
                'After flipping \\(P_2P_5\\) there are still \\(7\\) triangles and \\(13\\) edges; the edge \\(P_2P_7\\) is selected.'),
        },
        {
            id: 'tri-add', order: 5,
            title: text('Dodajanje točk', 'Adding points'),
            purpose: text('Videti, kako dodana točka spremeni število trikotnikov.', 'Seeing how an added point changes the number of triangles.'),
            explanation: text(
                'Dodamo točko \\(P_8=(6,2)\\) v notranjost trikotnika: razdeli ga na tri, torej trikotnikov je \\(7+2=9\\). Nato dodamo še točko \\(P_9=(10,1)\\) zunaj ovojnice. Vidna je ena stranica ovojnice, zato se doda en trikotnik, \\(k\\) pa naraste na \\(6\\). Izpis pokaže \\(n=9\\), \\(k=6\\) in \\(2\\cdot9-2-6=10\\) trikotnikov.',
                'We add the point \\(P_8=(6,2)\\) inside a triangle: it splits it into three, so the number of triangles is \\(7+2=9\\). Then we add the point \\(P_9=(10,1)\\) outside the hull. One hull side is visible, so one triangle is added and \\(k\\) grows to \\(6\\). The readout shows \\(n=9\\), \\(k=6\\) and \\(2\\cdot9-2-6=10\\) triangles.',
            ),
            formulaIds: ['tri-count-formula'],
            frames: [frame('tri-add-explanation', 'explanation'), frame('tri-add-observation', 'observation')],
            observationPrompt: text('Povleci ali dodaj točko in preveri, da število trikotnikov ostane enako \\(2n-2-k\\).', 'Drag or add a point and check that the number of triangles stays equal to \\(2n-2-k\\).'),
            expectedObservations: [text('Točka znotraj doda \\(2\\) trikotnika, točka zunaj en trikotnik; skupaj \\(10\\) trikotnikov pri \\(n=9\\) in \\(k=6\\).', 'A point inside adds \\(2\\) triangles, a point outside one triangle; together \\(10\\) triangles with \\(n=9\\) and \\(k=6\\).')],
            scene: triScene('tri-add', [...TRI_EXAMPLE_POINTS, TRI_INSIDE_POINT, TRI_OUTSIDE_POINT], ['triangulation'], [],
                'Z dodanima točkama \\(P_8\\) in \\(P_9\\) je \\(n=9\\), \\(k=6\\) in \\(10\\) trikotnikov.',
                'With the added points \\(P_8\\) and \\(P_9\\) there are \\(n=9\\), \\(k=6\\) and \\(10\\) triangles.'),
        },
        {
            id: 'tri-delaunay', order: 6,
            title: text('Dve triangulaciji: najmanjši kot', 'Two triangulations: the smallest angle'),
            purpose: text('Primerjati najmanjši kot T0 in Delaunayeve triangulacije iste množice.', 'Comparing the smallest angle of T0 and the Delaunay triangulation of the same set.'),
            explanation: text(
                'Isto množico sedmih točk smo prej triangulirali s T0, kjer je najmanjši kot \\(1{,}91^\\circ\\). Zdaj graf kaže Delaunayevo triangulacijo: tudi ta ima \\(7\\) trikotnikov in \\(13\\) robov, najmanjši kot pa je \\(25{,}35^\\circ\\). Števila so ista, kakovost trikotnikov pa ne. Kako pridemo do take triangulacije, pokaže lekcija o Delaunayevi triangulaciji.',
                'Earlier we triangulated the same seven points with T0, whose smallest angle is \\(1.91^\\circ\\). The graph now shows the Delaunay triangulation: it too has \\(7\\) triangles and \\(13\\) edges, but its smallest angle is \\(25.35^\\circ\\). The counts agree, the quality of the triangles does not. The lesson on the Delaunay triangulation shows how to reach such a triangulation.',
            ),
            formulaIds: ['tri-count-formula'],
            frames: [frame('tri-delaunay-explanation', 'explanation'), frame('tri-delaunay-observation', 'observation')],
            observationPrompt: text('Primerjaj najmanjši kot v izpisu s tistim iz tretjega koraka.', 'Compare the smallest angle in the readout with the one from step 3.'),
            expectedObservations: [text('Izpis pokaže \\(7\\) trikotnikov, \\(13\\) robov in najmanjši kot \\(25{,}35^\\circ\\), v T0 pa je bil \\(1{,}91^\\circ\\).', 'The readout shows \\(7\\) triangles, \\(13\\) edges and a smallest angle of \\(25.35^\\circ\\), whereas in T0 it was \\(1.91^\\circ\\).')],
            scene: triScene('tri-delaunay', TRI_EXAMPLE_POINTS, ['triangulation', 'angles'], [setTriangulation(TRI_DELAUNAY)],
                'Delaunayeva triangulacija ima \\(7\\) trikotnikov, \\(13\\) robov in najmanjši kot \\(25{,}35^\\circ\\).',
                'The Delaunay triangulation has \\(7\\) triangles, \\(13\\) edges and a smallest angle of \\(25.35^\\circ\\).'),
        },
        {
            id: 'tri-nine', order: 7,
            title: text('Devet točk in prosto raziskovanje', 'Nine points and free exploration'),
            purpose: text('Videti, da kolinearne točke na robu štejejo v \\(k\\), nato samostojno raziskovati.', 'Seeing that collinear boundary points count in \\(k\\), then exploring on your own.'),
            explanation: text(
                'Devet točk iz lekcije o konveksni ovojnici ima na robu ovojnice \\(k=6\\) točk: pet oglišč in eno kolinearno točko na stranici. Kolinearna točka šteje v \\(k\\), zato je trikotnikov \\(2\\cdot9-2-6=10\\) in robov \\(3\\cdot9-3-6=18\\). Zdaj lahko premikaš in dodajaš točke ter zamenjuješ robove.',
                'The nine points of the convex hull lesson have \\(k=6\\) points on the hull boundary: five corners and one collinear point on a side. The collinear point counts in \\(k\\), so there are \\(2\\cdot9-2-6=10\\) triangles and \\(3\\cdot9-3-6=18\\) edges. Now you can move and add points and flip edges.',
            ),
            formulaIds: ['tri-count-formula'], workedExampleId: 'tri-nine-example',
            frames: [frame('tri-nine-explanation', 'explanation'), frame('tri-nine-calculation', 'calculation'), frame('tri-nine-observation', 'observation')],
            observationPrompt: text('Premakni kolinearno točko s stranice ovojnice v notranjost in preveri, kaj se zgodi s \\(k\\) in številom trikotnikov.', 'Move the collinear point from the hull side into the interior and check what happens to \\(k\\) and the number of triangles.'),
            expectedObservations: [text('Izpis pokaže \\(k=6\\), \\(10\\) trikotnikov in \\(18\\) robov, od tega \\(12\\) notranjih.', 'The readout shows \\(k=6\\), \\(10\\) triangles and \\(18\\) edges, \\(12\\) of them interior.')],
            scene: triScene('tri-nine', TRI_NINE_POINTS, ['triangulation', 'angles'], [],
                'Devet točk: \\(k=6\\), \\(10\\) trikotnikov in \\(18\\) robov.',
                'Nine points: \\(k=6\\), \\(10\\) triangles and \\(18\\) edges.'),
        },
    ],
    sources: [
        {id: 'berg-triangulation-points', citation: 'de Berg, M., Cheong, O., van Kreveld, M., Overmars, M. Computational Geometry: Algorithms and Applications, 3rd ed., Chapter 9 (triangulations of point sets and the edge flip).'},
        {
            id: 'bezeg-triangulation-implementation',
            citation: 'Bezeg source: src/compgeo/triangulation.ts, src/compgeo/pointInsertion.ts and src/graphs/compgeo/TriangulationGraph.tsx.',
            implementationCorrespondence: 'The counts come from the triangle list of the scene; a flip is refused for a hull edge or a non-convex quadrilateral by the exact integer orientation, and a lesson scene sets the triangulation with set-triangulation, flip-edge and select-edge.',
        },
    ],
    edgeCases: [
        text('Kolinearne točke na robu ovojnice štejejo v \\(k\\), izpis pa jih navede posebej; skrajni primer so vse točke na isti premici, kjer triangulacije ni.', 'Collinear points on the hull boundary count in \\(k\\) and the readout lists them separately; the extreme case is all points on one line, where there is no triangulation.'),
        text('Zamenjava roba spremeni najmanjši kot, ne pa števila trikotnikov in robov; ta lekcija ne trdi, da je kateri koli rob najboljša izbira.', 'A flip changes the smallest angle but not the numbers of triangles and edges; this lesson does not claim that any particular edge is the best choice.'),
    ],
    unresolvedQuestions: [],
};

/**
 * Delaunay lesson (docs/specs/triangulation-voronoi-lessons.md, B3). The scenes use the `point-set` actions (`set-points`,
 * `set-triangulation`, `set-trace-step`, `select-triangle`) of `DelaunayGraph`; `compgeoDelaunayLesson.test.ts` checks every
 * quoted value against the real graph's readout or the kernel (`circumcircle`, `runDelaunay`). The panel names the points 1-based, so
 * the spec's p1p4, p2p4, p4p6 are P2P5, P3P5, P5P7 here, and the quad a, b, c, d are P1, P2, P3, P4.
 */
export const DELAUNAY_QUAD: readonly LessonPoint[] = [[0, 0], [4, 0], [5, 3], [0, 2]];
/** The quad's start (diagonal ac) and the unit square (four cocircular points) with the same triangle list. */
export const DELAUNAY_QUAD_START: readonly (readonly [number, number, number])[] = [[0, 1, 2], [0, 2, 3]];
export const DELAUNAY_SQUARE: readonly LessonPoint[] = [[0, 0], [1, 0], [1, 1], [0, 1]];
/** Trace steps of the quad (events: phase, test ac, flip, test bd, done) and of the unit square (phase, test, done). */
export const DELAUNAY_TRACE_STEPS = {testAc: 1, testBd: 3, sevenFirstTest: 1} as const;
/** The three illegal edges of T0 on the seven points (0-based index pairs, P2P5, P3P5, P5P7) and the trace steps at which the Lawson trace tests them as illegal. */
export const DELAUNAY_ILLEGAL_EDGES: readonly (readonly [number, number])[] = [[1, 4], [2, 4], [4, 6]];
export const DELAUNAY_ILLEGAL_STEPS: readonly number[] = [1, 6, 14];
/** The quad view: the circle through a, b, c reaches y about 5.4 (the graph's own initial view). */
const DELAUNAY_QUAD_VIEW: LessonViewBox = [-2, 6, 7, -1.5];
/** A Delaunay scene framed on its points: the points, exactly the listed overlays, the starting triangulation (back to step 0, paused), then the step actions. */
const delScene = (id: string, list: readonly LessonPoint[], triangles: readonly (readonly [number, number, number])[], shown: readonly TriOverlay[], view: LessonViewBox, steps: readonly LessonAction[], sl: string, en: string): LessonScene =>
    ({id, basedOn: 'demonstration-default', view, actions: [points(list), ...TRI_OVERLAYS.map(name => overlay(name, shown.includes(name))), setTriangulation(triangles), ...steps], expectedState: text(sl, en)});
const selectTriangle = (triangle: number | null): LessonAction => ({kind: 'point-set', operation: 'select-triangle', triangle});

const delaunay: GuidedLesson = {
    demonstrationId: 'delaunay',
    title: text('Delaunayeva triangulacija in Lawsonove zamenjave', 'Delaunay triangulation and Lawson flips'),
    summary: text(
        'Rob triangulacije je neustrezen, če leži nasprotno oglišče sosednjega trikotnika znotraj očrtane krožnice; zamenjava neustreznega roba poveča najmanjši kot, ko pa ni več neustreznih robov, imamo Delaunayevo triangulacijo.',
        'An edge of a triangulation is illegal if the opposite vertex of the neighbouring triangle lies inside the circumcircle; flipping an illegal edge raises the smallest angle, and when no illegal edge is left we have the Delaunay triangulation.',
    ),
    prerequisites: [
        text('Potrebna je lekcija o triangulaciji množice točk: zamenjava roba in najmanjši kot dveh triangulacij.', 'The lesson on triangulating a set of points is required: the edge flip and the smallest angle of two triangulations.'),
        text('Priporočena je lekcija o orientaciji treh točk, ker predznak preizkusa krožnice predpostavlja trikotnik v pozitivni smeri.', 'Recommended is the lesson on the orientation of three points, because the sign of the circle test assumes a counter-clockwise triangle.'),
    ],
    learningGoals: [
        text('S preizkusom krožnice (determinanto) ugotoviš, ali je rob triangulacije ustrezen ali neustrezen.', 'Use the circle test (a determinant) to decide whether an edge of a triangulation is legal or illegal.'),
        text('Z zamenjavami neustreznih robov povečaš najmanjši kot in pride do Delaunayeve triangulacije; razložiš, zakaj zamenjava nikoli ne odpove.', 'Flip illegal edges to raise the smallest angle until you reach the Delaunay triangulation, and explain why a flip never fails.'),
        text('Na enotskem kvadratu razložiš, zakaj pri štirih točkah na isti krožnici Delaunayeva triangulacija ni enolična.', 'On the unit square explain why the Delaunay triangulation is not unique when four points lie on one circle.'),
    ],
    formulaBlocks: [
        {
            id: 'del-incircle-formula',
            latex: 'D=\\begin{vmatrix}a_x-d_x&a_y-d_y&(a_x-d_x)^2+(a_y-d_y)^2\\\\b_x-d_x&b_y-d_y&(b_x-d_x)^2+(b_y-d_y)^2\\\\c_x-d_x&c_y-d_y&(c_x-d_x)^2+(c_y-d_y)^2\\end{vmatrix}',
            notation: text(
                'Točke \\(a\\), \\(b\\), \\(c\\) so v pozitivni smeri, \\(d\\) je preizkušana točka. \\(D>0\\): \\(d\\) je znotraj očrtane krožnice trikotnika \\(abc\\); \\(D=0\\): na krožnici; \\(D<0\\): zunaj.',
                'The points \\(a\\), \\(b\\), \\(c\\) are counter-clockwise and \\(d\\) is the tested point. \\(D>0\\): \\(d\\) is inside the circumcircle of \\(abc\\); \\(D=0\\): on it; \\(D<0\\): outside.',
            ),
            explanation: text(
                'Rob \\(ac\\) štirikotnika \\(abcd\\) je neustrezen natanko tedaj, ko je \\(D>0\\); rob je ustrezen za \\(D\\le0\\), zato se pri \\(D=0\\) ne zamenja. Determinanta je celo število pri celoštevilskih koordinatah, zato je preizkus natančen.',
                'The edge \\(ac\\) of the quadrilateral \\(abcd\\) is illegal exactly when \\(D>0\\); it is legal for \\(D\\le0\\), so it is not flipped at \\(D=0\\). With integer coordinates the determinant is an integer, so the test is exact.',
            ),
        },
    ],
    workedExamples: [
        {
            id: 'del-circle-example',
            title: text('Štirikotnik \\(abcd\\)', 'The quadrilateral \\(abcd\\)'),
            calculationLatex: 'D=0\\cdot(-72)+2\\cdot4+4\\cdot14',
            resultLatex: 'D=64',
            check: text(
                'Izpis pod grafom pokaže vrednost preizkusa krožnice \\(+64\\) pri robu \\(P_1P_3\\).',
                'The readout under the graph shows the circle test value \\(+64\\) for the edge \\(P_1P_3\\).',
            ),
        },
        {
            id: 'del-square-example',
            title: text('Enotski kvadrat', 'The unit square'),
            calculationLatex: 'D=0\\cdot(-1)+1\\cdot(-1)+1\\cdot1',
            resultLatex: 'D=0',
            check: text(
                'Izpis pod grafom pokaže vrednost preizkusa krožnice \\(0\\): točka je na krožnici.',
                'The readout under the graph shows the circle test value \\(0\\): the point is on the circle.',
            ),
        },
    ],
    steps: [
        {
            id: 'del-quad', order: 1,
            title: text('Štirikotnik z diagonalo', 'A quadrilateral with a diagonal'),
            purpose: text('Spoznati štirikotnik in njegovi dve triangulaciji.', 'Meeting the quadrilateral and its two triangulations.'),
            explanation: text(
                'Štirikotnik ima oglišča \\(a=P_1=(0,0)\\), \\(b=P_2=(4,0)\\), \\(c=P_3=(5,3)\\) in \\(d=P_4=(0,2)\\); tako jih imenuje izpis pod grafom. Trikotnika \\(abc\\) in \\(acd\\) ga triangulirata z diagonalo \\(ac=P_1P_3\\). Druga možnost je diagonala \\(bd=P_2P_4\\). Katera triangulacija je boljša?',
                'The quadrilateral has the vertices \\(a=P_1=(0,0)\\), \\(b=P_2=(4,0)\\), \\(c=P_3=(5,3)\\) and \\(d=P_4=(0,2)\\); this is how the readout under the graph names them. The triangles \\(abc\\) and \\(acd\\) triangulate it with the diagonal \\(ac=P_1P_3\\). The other possibility is the diagonal \\(bd=P_2P_4\\). Which triangulation is better?',
            ),
            formulaIds: ['del-incircle-formula'],
            frames: [frame('del-quad-explanation', 'explanation'), frame('del-quad-observation', 'observation')],
            observationPrompt: text('Ugotovi, katera diagonala je narisana, in oceni, ali bi bila druga boljša.', 'Find which diagonal is drawn and guess whether the other would be better.'),
            expectedObservations: [text('Narisana je diagonala \\(P_1P_3\\); druga možnost je \\(P_2P_4\\).', 'The diagonal \\(P_1P_3\\) is drawn; the other possibility is \\(P_2P_4\\).')],
            scene: delScene('del-quad', DELAUNAY_QUAD, DELAUNAY_QUAD_START, ['triangulation'], DELAUNAY_QUAD_VIEW, [],
                'Štirikotnik \\(P_1P_2P_3P_4\\) z diagonalo \\(P_1P_3\\); algoritem je ustavljen.',
                'The quadrilateral \\(P_1P_2P_3P_4\\) with the diagonal \\(P_1P_3\\); the algorithm is stopped.'),
        },
        {
            id: 'del-predict', order: 2,
            title: text('Napovej: je \\(d\\) znotraj krožnice?', 'Predict: is \\(d\\) inside the circle?'),
            purpose: text('Pred izračunom napovedati, ali je točka znotraj krožnice.', 'Predicting before the calculation whether the point is inside the circle.'),
            explanation: text(
                'Skozi \\(a\\), \\(b\\) in \\(c\\) gre natanko ena krožnica. Napovej: ali je \\(d\\) znotraj nje, na njej ali zunaj? Odgovor pove, ali je diagonala \\(ac\\) ustrezna. Graf zaenkrat ne kaže krožnice, v izpisu pa je vrstica o neustreznih robih, ki odgovor že izda; ne beri je še.',
                'Exactly one circle passes through \\(a\\), \\(b\\) and \\(c\\). Predict: is \\(d\\) inside it, on it or outside? The answer tells whether the diagonal \\(ac\\) is legal. The graph shows no circle yet, but the readout has a line about illegal edges that already gives the answer away; do not read it yet.',
            ),
            formulaIds: ['del-incircle-formula'],
            frames: [frame('del-predict-explanation', 'explanation'), frame('del-predict-observation', 'observation')],
            observationPrompt: text('Zapiši napoved in utemelji.', 'Write down your prediction and give your reason.'),
            expectedObservations: [text('Napoved še ni preverjena; v naslednjem koraku jo primerjamo z izračunom.', 'The prediction is not yet checked; the next step compares it with the calculation.')],
            scene: delScene('del-predict', DELAUNAY_QUAD, DELAUNAY_QUAD_START, ['triangulation'], DELAUNAY_QUAD_VIEW, [],
                'Krožnica še ni prikazana; napoved se preveri v naslednjem koraku.',
                'The circle is not shown yet; the prediction is checked in the next step.'),
        },
        {
            id: 'del-circle', order: 3,
            title: text('Očrtana krožnica in determinanta', 'The circumcircle and the determinant'),
            purpose: text('Izračunati, da je \\(d\\) znotraj krožnice \\(abc\\), in iz tega sklepati, da je \\(ac\\) neustrezen.', 'Calculating that \\(d\\) is inside the circle \\(abc\\) and concluding that \\(ac\\) is illegal.'),
            explanation: text(
                'Graf preizkuša rob \\(ac\\) in riše očrtano krožnico trikotnika \\(abc\\). Izračunamo jo: središče \\(S\\) ima \\(x=2\\), ker je enako oddaljeno od \\(a\\) in \\(b\\); iz \\(|c-S|^2=|a-S|^2\\) dobimo \\(S=(2,\\tfrac{7}{3})\\) in \\(r^2=\\tfrac{85}{9}\\). Središče in polmer graf ne izpiše. Za točko \\(d\\) je \\(|d-S|^2=\\tfrac{37}{9}<\\tfrac{85}{9}\\), zato je znotraj krožnice. Determinanta je \\(D=+64\\), kar izpis pokaže kot vrednost preizkusa krožnice \\(+64\\), zato je rob \\(ac\\) neustrezen.',
                'The graph tests the edge \\(ac\\) and draws the circumcircle of the triangle \\(abc\\). We compute it: the centre \\(S\\) has \\(x=2\\), because it is equally far from \\(a\\) and \\(b\\); from \\(|c-S|^2=|a-S|^2\\) we get \\(S=(2,\\tfrac{7}{3})\\) and \\(r^2=\\tfrac{85}{9}\\). The graph does not print the centre or the radius. For the point \\(d\\), \\(|d-S|^2=\\tfrac{37}{9}<\\tfrac{85}{9}\\), so it is inside the circle. The determinant is \\(D=+64\\), which the readout shows as the circle test value \\(+64\\), so the edge \\(ac\\) is illegal.',
            ),
            formulaIds: ['del-incircle-formula'], workedExampleId: 'del-circle-example',
            frames: [frame('del-circle-explanation', 'explanation'), frame('del-circle-calculation', 'calculation'), frame('del-circle-observation', 'observation')],
            observationPrompt: text('Primerjaj napoved z grafom: je \\(d\\) znotraj narisane krožnice?', 'Compare your prediction with the graph: is \\(d\\) inside the drawn circle?'),
            expectedObservations: [text('Točka \\(d\\) je znotraj krožnice, izpis pokaže vrednost \\(+64\\) in \\(1\\) neustrezen rob.', 'The point \\(d\\) is inside the circle, the readout shows the value \\(+64\\) and \\(1\\) illegal edge.')],
            scene: delScene('del-circle', DELAUNAY_QUAD, DELAUNAY_QUAD_START, ['triangulation'], DELAUNAY_QUAD_VIEW, [setTraceStep(DELAUNAY_TRACE_STEPS.testAc)],
                'Preizkus roba \\(P_1P_3\\): krožnica \\(abc\\) vsebuje \\(d\\), vrednost je \\(+64\\) in rob je neustrezen.',
                'The test of the edge \\(P_1P_3\\): the circle \\(abc\\) contains \\(d\\), the value is \\(+64\\) and the edge is illegal.'),
        },
        {
            id: 'del-flip', order: 4,
            title: text('Zamenjava na \\(bd\\)', 'The flip to \\(bd\\)'),
            purpose: text('Videti, da je novi rob ustrezen in da se najmanjši kot poveča.', 'Seeing that the new edge is legal and the smallest angle grows.'),
            explanation: text(
                'Neustrezni rob \\(ac\\) zamenjamo z drugo diagonalo \\(bd=P_2P_4\\). Zdaj graf preizkuša \\(bd\\): vrednost je \\(-64\\), točka je zunaj krožnice. Izberi oba trikotnika na seznamu: preizkus čez rob \\(P_2P_4\\) da v obeh primerih \\(-64\\), rob je torej ustrezen. Najmanjši kot se je povečal z \\(19{,}65^\\circ\\) na \\(26{,}57^\\circ\\); oba seznama kotov, prej in zdaj, sta pod grafom in se pri prvem kotu prvič razlikujeta navzgor.',
                'We replace the illegal edge \\(ac\\) with the other diagonal \\(bd=P_2P_4\\). The graph now tests \\(bd\\): the value is \\(-64\\), the point is outside the circle. Select both triangles in the list: the test across the edge \\(P_2P_4\\) gives \\(-64\\) both times, so the edge is legal. The smallest angle grew from \\(19.65^\\circ\\) to \\(26.57^\\circ\\); the two angle lists, before and now, are under the graph and differ upward at the first angle.',
            ),
            formulaIds: ['del-incircle-formula'],
            frames: [frame('del-flip-explanation', 'explanation'), frame('del-flip-observation', 'observation')],
            observationPrompt: text('Preberi najmanjša kota in oba seznama kotov; izberi še drugi trikotnik in preberi njegov preizkus.', 'Read the two smallest angles and both angle lists; select the other triangle too and read its test.'),
            expectedObservations: [text('Najmanjši kot je \\(26{,}57^\\circ\\) (na začetku \\(19{,}65^\\circ\\)), vrednost preizkusa roba \\(P_2P_4\\) je \\(-64\\) iz obeh strani.', 'The smallest angle is \\(26.57^\\circ\\) (at the start \\(19.65^\\circ\\)), and the test value of the edge \\(P_2P_4\\) is \\(-64\\) from both sides.')],
            scene: delScene('del-flip', DELAUNAY_QUAD, DELAUNAY_QUAD_START, ['triangulation', 'angles'], DELAUNAY_QUAD_VIEW, [setTraceStep(DELAUNAY_TRACE_STEPS.testBd), selectTriangle(0)],
                'Po zamenjavi je diagonala \\(P_2P_4\\) ustrezna (\\(-64\\)); najmanjši kot je \\(26{,}57^\\circ\\), prej \\(19{,}65^\\circ\\).',
                'After the flip the diagonal \\(P_2P_4\\) is legal (\\(-64\\)); the smallest angle is \\(26.57^\\circ\\), before it was \\(19.65^\\circ\\).'),
        },
        {
            id: 'del-seven', order: 5,
            title: text('Sedem točk: neustrezni robovi', 'Seven points: the illegal edges'),
            purpose: text('V znani triangulaciji T0 poiskati neustrezne robove.', 'Finding the illegal edges in the familiar triangulation T0.'),
            explanation: text(
                'Sedem točk \\(P_1,\\dots,P_7\\) iz lekcije o triangulaciji množice točk s triangulacijo T0. Graf črtkano označi neustrezne robe: \\(P_2P_5\\), \\(P_3P_5\\) in \\(P_5P_7\\); izpis pokaže, da so \\(3\\), najmanjši kot v T0 pa je \\(1{,}91^\\circ\\). Vsi drugi notranji robovi so ustrezni.',
                'The seven points \\(P_1,\\dots,P_7\\) of the lesson on triangulating a set of points, with the triangulation T0. The graph marks the illegal edges with a dashed line: \\(P_2P_5\\), \\(P_3P_5\\) and \\(P_5P_7\\); the readout shows that there are \\(3\\) of them, and the smallest angle in T0 is \\(1.91^\\circ\\). All other interior edges are legal.',
            ),
            formulaIds: ['del-incircle-formula'],
            frames: [frame('del-seven-explanation', 'explanation'), frame('del-seven-observation', 'observation')],
            observationPrompt: text('Poišči tri črtkane robe na grafu in preberi njihovo število v izpisu.', 'Find the three dashed edges on the graph and read their number in the readout.'),
            expectedObservations: [text('Izpis pokaže \\(3\\) neustrezne robe in najmanjši kot \\(1{,}91^\\circ\\).', 'The readout shows \\(3\\) illegal edges and a smallest angle of \\(1.91^\\circ\\).')],
            scene: delScene('del-seven', TRI_EXAMPLE_POINTS, TRI_T0, ['triangulation', 'angles'], earView(TRI_EXAMPLE_POINTS), [],
                'T0 ima \\(3\\) neustrezne robe, \\(P_2P_5\\), \\(P_3P_5\\) in \\(P_5P_7\\); najmanjši kot je \\(1{,}91^\\circ\\).',
                'T0 has \\(3\\) illegal edges, \\(P_2P_5\\), \\(P_3P_5\\) and \\(P_5P_7\\); the smallest angle is \\(1.91^\\circ\\).'),
        },
        {
            id: 'del-flips', order: 6,
            title: text('Naslednji korak: tri zamenjave', 'Next step: three flips'),
            purpose: text('Z zaporednimi zamenjavami priti do Delaunayeve triangulacije.', 'Reaching the Delaunay triangulation by successive flips.'),
            explanation: text(
                'Pritiskaj Naslednji korak. Algoritem po vrsti preizkuša notranje robe in prvi neustrezni rob zamenja, nato začne znova. Po treh zamenjavah (izpis: Zamenjav doslej: 3) ni več neustreznih robov, najmanjši kot pa je \\(25{,}35^\\circ\\) namesto \\(1{,}91^\\circ\\). Zamenjava nikoli ne odpove: pri neustreznem robu je štirikotnik vedno izbočen (de Berg, Cheong, van Kreveld in Overmars, Computational Geometry, 9. poglavje). Rezultat je Delaunayeva triangulacija; ker nobene štiri točke niso na isti krožnici, je enolična.',
                'Press Next step. The algorithm tests the interior edges in order and flips the first illegal one, then starts again. After three flips (readout: Flips so far: 3) no illegal edge is left, and the smallest angle is \\(25.35^\\circ\\) instead of \\(1.91^\\circ\\). A flip never fails: the quadrilateral of an illegal edge is always convex (de Berg, Cheong, van Kreveld and Overmars, Computational Geometry, chapter 9). The result is the Delaunay triangulation; since no four points lie on one circle, it is unique.',
            ),
            formulaIds: ['del-incircle-formula'],
            frames: [frame('del-flips-explanation', 'explanation'), frame('del-flips-observation', 'observation')],
            observationPrompt: text('Pritisni Naslednji korak, dokler se algoritem ne konča, in preberi število zamenjav ter najmanjši kot.', 'Press Next step until the algorithm finishes and read the number of flips and the smallest angle.'),
            expectedObservations: [text('Izpis pokaže \\(3\\) zamenjave, \\(0\\) neustreznih robov in najmanjši kot \\(25{,}35^\\circ\\) (na začetku \\(1{,}91^\\circ\\)).', 'The readout shows \\(3\\) flips, \\(0\\) illegal edges and a smallest angle of \\(25.35^\\circ\\) (at the start \\(1.91^\\circ\\)).')],
            scene: delScene('del-flips', TRI_EXAMPLE_POINTS, TRI_T0, ['triangulation', 'angles'], earView(TRI_EXAMPLE_POINTS), [setTraceStep(DELAUNAY_TRACE_STEPS.sevenFirstTest)],
                'Preizkus roba \\(P_2P_5\\) je prvi korak; po treh zamenjavah je najmanjši kot \\(25{,}35^\\circ\\).',
                'The test of the edge \\(P_2P_5\\) is the first step; after three flips the smallest angle is \\(25.35^\\circ\\).'),
        },
        {
            id: 'del-square', order: 7,
            title: text('Enotski kvadrat in prosto raziskovanje', 'The unit square and free exploration'),
            purpose: text('Videti, da pri štirih točkah na isti krožnici triangulacija ni enolična, nato samostojno raziskovati.', 'Seeing that with four points on one circle the triangulation is not unique, then exploring on your own.'),
            explanation: text(
                'Enotski kvadrat \\((0,0),(1,0),(1,1),(0,1)\\) ima vse štiri točke na isti krožnici. Preizkus roba \\(P_1P_3\\) da \\(D=0\\): točka je na krožnici, rob je ustrezen in se ne zamenja. Tudi druga diagonala \\(P_2P_4\\) je ustrezna, zato imata obe triangulaciji lastnost Delaunayeve: triangulacija ni enolična, graf pa to na koncu izpiše. Zdaj raziskuj sam: povleci točke ali naloži primer; sled se ob vsaki spremembi preračuna, zamenjan rob pa lahko spet postane neustrezen. Kako Delaunayeva triangulacija določa Voronojev diagram, pokaže lekcija o Voronojevem diagramu.',
                'The unit square \\((0,0),(1,0),(1,1),(0,1)\\) has all four points on one circle. The test of the edge \\(P_1P_3\\) gives \\(D=0\\): the point is on the circle, the edge is legal and is not flipped. The other diagonal \\(P_2P_4\\) is legal too, so both triangulations are Delaunay: the triangulation is not unique, and the graph says so at the end. Now explore on your own: drag the points or load an example; the trace is recomputed after every change, and a flipped edge may become illegal again. The lesson on the Voronoi diagram shows how the Delaunay triangulation determines it.',
            ),
            formulaIds: ['del-incircle-formula'], workedExampleId: 'del-square-example',
            frames: [frame('del-square-explanation', 'explanation'), frame('del-square-calculation', 'calculation'), frame('del-square-observation', 'observation')],
            observationPrompt: text('Pritisni Naslednji korak do konca in preberi, ali je triangulacija enolična; premakni eno točko kvadrata s krožnice in poglej, kaj se zgodi.', 'Press Next step to the end and read whether the triangulation is unique; move one point of the square off the circle and see what happens.'),
            expectedObservations: [text('Vrednost preizkusa je \\(0\\), zamenjav ni, na koncu izpis pravi, da triangulacija ni enolična.', 'The test value is \\(0\\), there are no flips, and at the end the readout says the triangulation is not unique.')],
            scene: delScene('del-square', DELAUNAY_SQUARE, DELAUNAY_QUAD_START, ['triangulation'], earView(DELAUNAY_SQUARE), [setTraceStep(DELAUNAY_TRACE_STEPS.testAc)],
                'Enotski kvadrat: preizkus roba \\(P_1P_3\\) da \\(0\\), rob je ustrezen.',
                'The unit square: the test of the edge \\(P_1P_3\\) gives \\(0\\), the edge is legal.'),
        },
    ],
    sources: [
        {id: 'berg-delaunay', citation: 'de Berg, M., Cheong, O., van Kreveld, M., Overmars, M. Computational Geometry: Algorithms and Applications, 3rd ed., Chapter 9 (Delaunay triangulations, legal edges and the edge flip).'},
        {
            id: 'bezeg-delaunay-implementation',
            citation: 'Bezeg source: src/compgeo/delaunay.ts, src/compgeo/predicates.ts and src/graphs/compgeo/DelaunayGraph.tsx.',
            implementationCorrespondence: 'The trace scans the interior edges in lexicographic order of their point indices, tests each with the exact integer incircle determinant, flips the first edge with a positive value and starts again; a lesson scene sets the points and the starting triangulation, then moves the trace with set-trace-step and select-triangle. The circle is drawn from the exact rational centre and radius.',
        },
    ],
    edgeCases: [
        text('Pri štirih točkah na isti krožnici je determinanta \\(0\\), oba roba sta ustrezna in Delaunayeva triangulacija ni enolična; algoritem teh robov ne zamenja.', 'For four points on one circle the determinant is \\(0\\), both edges are legal and the Delaunay triangulation is not unique; the algorithm does not flip these edges.'),
        text('Lekcija ne trdi, da je vsaka triangulacija z največjim najmanjšim kotom Delaunayeva; trdi le, da zamenjave povečajo seznam kotov in se ustavijo.', 'The lesson does not claim that every triangulation with the largest smallest angle is Delaunay; it only claims that the flips raise the angle list and stop.'),
    ],
    unresolvedQuestions: [],
};

/**
 * Voronoi lesson (docs/specs/triangulation-voronoi-lessons.md, B4). The scenes use the `point-set` actions (`set-points`,
 * `set-overlay` with the `diagram` and `delaunay` switches, `select-site`, `set-construction`, `set-query-point`,
 * `select-triangle`) of `VoronoiGraph`; `compgeoVoronoiLesson.test.ts` checks every quoted value against the real graph's readout
 * or the kernel (`voronoiFromDelaunay`). The panel names the sites 1-based, so the spec's p5 and p6 are P6 and P7 here and its
 * triangle (0,1,5) is P1P2P6.
 */
/** The site whose cell is predicted and built (the spec's p5, 0-based index 5, named P6) and the spec's triangle (0,1,5) as an index into the graph's Delaunay triangles. */
export const VORONOI_CELL_SITE = 5;
export const VORONOI_TRIANGLE_INDEX = 2;
/** What step 4 quotes: the readout of the whole diagram of the seven points. */
export const VORONOI_COUNTS = {vertices: 7, finite: 8, rays: 5, bounded: 2, unbounded: 5} as const;
/** The vertex step 5 quotes: the circumcentre of the triangle P1P2P6. */
export const VORONOI_QUOTED_VERTEX: readonly [number, number] = [4, -1];
/** The query point of steps 1 to 6 (nearest site P1, so it gives nothing away about P6) and the default of step 7 (inside the cell of P6). */
export const VORONOI_QUERY_AWAY: readonly [number, number] = [-2, 1];
export const VORONOI_QUERY_FREE: readonly [number, number] = [4, 2];
/** Room for the vertices (the lowest is y = -1) and the start of the rays. */
const VORONOI_VIEW: LessonViewBox = [-3, 10, 12, -3];
const selectSite = (site: number | null): LessonAction => ({kind: 'point-set', operation: 'select-site', site});
const setConstruction = (count: number | 'end'): LessonAction => ({kind: 'point-set', operation: 'set-construction', count});
const setQueryPoint = (point: readonly [number, number]): LessonAction => ({kind: 'point-set', operation: 'set-query-point', point});
/** A Voronoi scene framed on the seven points: the points, exactly the listed overlays, no chosen site, the query point, then the step actions. */
const voronoiScene = (id: string, shown: readonly ('diagram' | 'delaunay')[], query: readonly [number, number], steps: readonly LessonAction[], sl: string, en: string): LessonScene =>
    ({id, basedOn: 'demonstration-default', view: VORONOI_VIEW, expectedState: text(sl, en),
        actions: [points(TRI_EXAMPLE_POINTS), overlay('grid', false), overlay('diagram', shown.includes('diagram')), overlay('delaunay', shown.includes('delaunay')),
            selectSite(null), setQueryPoint(query), ...steps]});

const voronoi: GuidedLesson = {
    demonstrationId: 'voronoi',
    title: text('Voronojev diagram in dualnost', 'The Voronoi diagram and duality'),
    summary: text(
        'Celica mesta je množica točk, ki so temu mestu bliže kot vsakemu drugemu; njena oglišča so središča očrtanih krožnic Delaunayevih trikotnikov, Delaunayeva triangulacija pa je dual diagrama.',
        'The cell of a site is the set of points nearer to it than to any other site; its vertices are the circumcentres of the Delaunay triangles, and the Delaunay triangulation is the dual of the diagram.',
    ),
    prerequisites: [
        text('Potrebna je lekcija o Delaunayevi triangulaciji: očrtana krožnica trikotnika in prazna krožnica.', 'The lesson on the Delaunay triangulation is required: the circumcircle of a triangle and the empty circle.'),
        text('Priporočena je lekcija o triangulaciji množice točk, ker uporabimo isti primer sedmih točk.', 'Recommended is the lesson on triangulating a set of points, because it uses the same example of seven points.'),
    ],
    learningGoals: [
        text('Celico mesta razložiš kot množico točk, ki so temu mestu bliže kot vsakemu drugemu, in jo sestaviš s presekom polravnin.', 'Explain the cell of a site as the set of points nearer to that site than to any other, and build it as an intersection of half-planes.'),
        text('Prebereš oglišča, končne robove in poltrake diagrama ter ločiš omejene in neomejene celice.', 'Read the vertices, finite edges and rays of the diagram and tell bounded cells from unbounded ones.'),
        text('Razložiš dualnost: oglišče diagrama je središče očrtane krožnice Delaunayevega trikotnika, notranji rob triangulacije ustreza končnemu robu, rob ovojnice pa poltraku.', 'Explain duality: a vertex of the diagram is the circumcentre of a Delaunay triangle, an interior edge of the triangulation matches a finite edge and a hull edge matches a ray.'),
    ],
    formulaBlocks: [
        {
            id: 'vor-cell-formula',
            latex: 'C_i=\\{X\\;:\\;|XP_i|\\le|XP_j|\\ \\forall j\\}',
            notation: text(
                '\\(C_i\\) je celica mesta \\(P_i\\), \\(|XP_i|\\) razdalja od točke \\(X\\) do mesta \\(P_i\\). Meja med celicama \\(C_i\\) in \\(C_j\\) leži na simetrali daljice \\(P_iP_j\\); Voronojevo oglišče je točka, ki je enako oddaljena od vsaj treh mest.',
                '\\(C_i\\) is the cell of the site \\(P_i\\) and \\(|XP_i|\\) is the distance from the point \\(X\\) to \\(P_i\\). The border between \\(C_i\\) and \\(C_j\\) lies on the perpendicular bisector of the segment \\(P_iP_j\\); a Voronoi vertex is a point equally far from at least three sites.',
            ),
            explanation: text(
                'Celica je presek polravnin: za vsak drugi \\(P_j\\) polravnina točk, ki so bližje \\(P_i\\) kot \\(P_j\\). Zato je vsaka celica konveksna, graf pa jo gradi simetralo za simetralo. Središče očrtane krožnice trikotnika \\(P_iP_jP_k\\) je enako oddaljeno od vseh treh oglišč; če krožnica ne vsebuje drugega mesta, nobeno mesto ni bližje in točka je Voronojevo oglišče.',
                'A cell is an intersection of half-planes: for every other \\(P_j\\), the half-plane of points nearer to \\(P_i\\) than to \\(P_j\\). So every cell is convex, and the graph builds it bisector by bisector. The circumcentre of the triangle \\(P_iP_jP_k\\) is equally far from all three corners; if its circle contains no other site, no site is nearer and the point is a Voronoi vertex.',
            ),
        },
    ],
    workedExamples: [
        {
            id: 'vor-vertex-example',
            title: text('Oglišče trikotnika \\(P_1P_2P_6\\)', 'The vertex of the triangle \\(P_1P_2P_6\\)'),
            calculationLatex: '|VP_1|^2=4^2+(-1)^2,\\ |VP_2|^2=(4-8)^2+(-1)^2,\\ |VP_6|^2=(4-3)^2+(-1-3)^2',
            resultLatex: '|VP_1|^2=|VP_2|^2=|VP_6|^2=17',
            check: text(
                'Izpis pod grafom pri izbranem trikotniku \\(P_1P_2P_6\\) pokaže središče očrtane krožnice \\((4,-1)\\) kot Voronojevo oglišče, enako oddaljeno od mest \\(P_1\\), \\(P_2\\) in \\(P_6\\).',
                'With the triangle \\(P_1P_2P_6\\) selected, the readout under the graph shows the circumcentre \\((4,-1)\\) as a Voronoi vertex equally far from the sites \\(P_1\\), \\(P_2\\) and \\(P_6\\).',
            ),
        },
    ],
    steps: [
        {
            id: 'vor-sites', order: 1,
            title: text('Sedem mest', 'Seven sites'),
            purpose: text('Spoznati mesta in vprašanje, na katero odgovarja diagram.', 'Meeting the sites and the question the diagram answers.'),
            explanation: text(
                'Isti primer sedmih točk kot v prejšnjih lekcijah zdaj imenujemo mesta: \\(P_1=(0,0)\\), \\(P_2=(8,0)\\), \\(P_3=(9,6)\\), \\(P_4=(4,8)\\), \\(P_5=(-1,5)\\), \\(P_6=(3,3)\\) in \\(P_7=(6,3)\\). Voronojev diagram vsakemu mestu dodeli celico: točke ravnine, ki so temu mestu bliže kot vsakemu drugemu. Diagrama zaenkrat ni na grafu in izpis ga ne našteva.',
                'The same seven points as in the earlier lessons are now called sites: \\(P_1=(0,0)\\), \\(P_2=(8,0)\\), \\(P_3=(9,6)\\), \\(P_4=(4,8)\\), \\(P_5=(-1,5)\\), \\(P_6=(3,3)\\) and \\(P_7=(6,3)\\). The Voronoi diagram gives every site a cell: the points of the plane nearer to that site than to any other. The diagram is not on the graph yet and the readout does not list it.',
            ),
            formulaIds: ['vor-cell-formula'],
            frames: [frame('vor-sites-explanation', 'explanation'), frame('vor-sites-observation', 'observation')],
            observationPrompt: text('Preberi imena mest na grafu in ugotovi, katera ležijo na robu množice in katera znotraj.', 'Read the names of the sites on the graph and find which lie on the edge of the set and which inside.'),
            expectedObservations: [text('Na grafu je sedem mest brez diagrama; \\(P_6\\) in \\(P_7\\) ležita znotraj ostalih.', 'The graph shows seven sites and no diagram; \\(P_6\\) and \\(P_7\\) lie inside the others.')],
            scene: voronoiScene('vor-sites', [], VORONOI_QUERY_AWAY, [],
                'Sedem mest \\(P_1\\), ..., \\(P_7\\); diagram je skrit.',
                'The seven sites \\(P_1\\), ..., \\(P_7\\); the diagram is hidden.'),
        },
        {
            id: 'vor-predict', order: 2,
            title: text('Napovej: območje mesta \\(P_6\\)', 'Predict: the region of \\(P_6\\)'),
            purpose: text('Pred gradnjo napovedati, kje so točke, ki so bližje \\(P_6\\) kot vsakemu drugemu mestu.', 'Predicting before the construction where the points nearer to \\(P_6\\) than to any other site lie.'),
            explanation: text(
                'Skiciraj območje točk, ki so bližje mestu \\(P_6\\) kot vsakemu drugemu mestu. Ali je omejeno ali sega v neskončnost? Kje bi potekale njegove meje? Namig: točka na meji med \\(P_6\\) in sosedom je enako oddaljena od obeh. Graf še ne kaže nobene celice in izpis nobenega števila oglišč, robov ali celic; odgovor poišči sam.',
                'Sketch the region of points nearer to the site \\(P_6\\) than to any other site. Is it bounded or does it reach infinity? Where would its borders run? Hint: a point on the border between \\(P_6\\) and a neighbour is equally far from both. The graph shows no cell yet and the readout no number of vertices, edges or cells; find the answer yourself.',
            ),
            formulaIds: ['vor-cell-formula'],
            frames: [frame('vor-predict-explanation', 'explanation'), frame('vor-predict-observation', 'observation')],
            observationPrompt: text('Zapiši napoved in utemelji.', 'Write down your prediction and give your reason.'),
            expectedObservations: [text('Napoved še ni preverjena; v naslednjem koraku jo primerjamo z gradnjo celice.', 'The prediction is not yet checked; the next step compares it with the construction of the cell.')],
            scene: voronoiScene('vor-predict', [], VORONOI_QUERY_AWAY, [],
                'Celica še ni prikazana; napoved se preveri v naslednjem koraku.',
                'The cell is not shown yet; the prediction is checked in the next step.'),
        },
        {
            id: 'vor-cell', order: 3,
            title: text('Celica mesta \\(P_6\\) s simetralami', 'The cell of \\(P_6\\) by bisectors'),
            purpose: text('Celico sestaviti kot presek polravnin in jo primerjati z napovedjo.', 'Building the cell as an intersection of half-planes and comparing it with the prediction.'),
            explanation: text(
                'Mesto \\(P_6\\) je izbrano. Pritiskaj Pokaži simetralo: vsaka simetrala daljice med \\(P_6\\) in drugim mestom razdeli ravnino na polravnino, ki je bližje \\(P_6\\), in polravnino, ki je bližje drugemu mestu. Graf obdrži polravnino mesta \\(P_6\\) in prikaže, kaj ostane. Ko so uporabljene vse simetrale, je ostanek celica mesta \\(P_6\\). Primerjaj jo z napovedjo; diagram drugih celic je še skrit.',
                'The site \\(P_6\\) is selected. Press Show bisector: each perpendicular bisector of the segment between \\(P_6\\) and another site splits the plane into the half-plane nearer to \\(P_6\\) and the half-plane nearer to the other site. The graph keeps the half-plane of \\(P_6\\) and shows what remains. When all bisectors are applied, what remains is the cell of \\(P_6\\). Compare it with your prediction; the diagram of the other cells is still hidden.',
            ),
            formulaIds: ['vor-cell-formula'],
            frames: [frame('vor-cell-explanation', 'explanation'), frame('vor-cell-observation', 'observation')],
            observationPrompt: text('Pritisni Pokaži simetralo, dokler izpis ne pove, da so uporabljene vse simetrale, in primerjaj ostanek z napovedjo.', 'Press Show bisector until the readout says all bisectors are applied and compare what remains with your prediction.'),
            expectedObservations: [text('Po zadnji simetrali ostane omejen večkotnik, celica mesta \\(P_6\\); izpis pove, da je presek polravnin celica.', 'After the last bisector a bounded polygon remains, the cell of \\(P_6\\); the readout says the intersection of the half-planes is the cell.')],
            scene: voronoiScene('vor-cell', [], VORONOI_QUERY_AWAY, [selectSite(VORONOI_CELL_SITE), setConstruction(0)],
                'Celica mesta \\(P_6\\): začetek gradnje, še brez simetral; diagram je skrit.',
                'The cell of \\(P_6\\): the start of the construction, no bisectors yet; the diagram is hidden.'),
        },
        {
            id: 'vor-diagram', order: 4,
            title: text('Vse celice', 'All cells'),
            purpose: text('Prebrati število oglišč, robov in poltrakov ter ločiti omejene in neomejene celice.', 'Reading the number of vertices, edges and rays and telling bounded cells from unbounded ones.'),
            explanation: text(
                'Zdaj graf kaže celoten diagram. Izpis našteje \\(7\\) Voronojevih oglišč, \\(8\\) končnih robov in \\(5\\) poltrakov. Celice petih mest na robu množice, \\(P_1\\), \\(P_2\\), \\(P_3\\), \\(P_4\\) in \\(P_5\\), so neomejene: poltraki nadaljujejo njihove meje do neskončnosti. Celici mest \\(P_6\\) in \\(P_7\\), ki ležita znotraj, sta omejeni (izpis: omejenih celic \\(2\\), neomejenih \\(5\\)).',
                'The graph now shows the whole diagram. The readout counts \\(7\\) Voronoi vertices, \\(8\\) finite edges and \\(5\\) rays. The cells of the five sites on the edge of the set, \\(P_1\\), \\(P_2\\), \\(P_3\\), \\(P_4\\) and \\(P_5\\), are unbounded: rays continue their borders to infinity. The cells of \\(P_6\\) and \\(P_7\\), which lie inside, are bounded (readout: bounded cells \\(2\\), unbounded cells \\(5\\)).',
            ),
            formulaIds: ['vor-cell-formula'],
            frames: [frame('vor-diagram-explanation', 'explanation'), frame('vor-diagram-observation', 'observation')],
            observationPrompt: text('Preberi števila v izpisu in poišči na grafu poltrake, ki kažejo, da celica sega v neskončnost.', 'Read the numbers in the readout and find on the graph the rays that show a cell reaching infinity.'),
            expectedObservations: [text('Izpis pokaže \\(7\\) oglišč, \\(8\\) končnih robov, \\(5\\) poltrakov, \\(2\\) omejeni in \\(5\\) neomejenih celic; celica mesta \\(P_6\\) je enaka tisti iz prejšnjega koraka.', 'The readout shows \\(7\\) vertices, \\(8\\) finite edges, \\(5\\) rays, \\(2\\) bounded and \\(5\\) unbounded cells; the cell of \\(P_6\\) equals the one from the previous step.')],
            scene: voronoiScene('vor-diagram', ['diagram'], VORONOI_QUERY_AWAY, [],
                'Diagram ima \\(7\\) oglišč, \\(8\\) končnih robov in \\(5\\) poltrakov; \\(2\\) celici sta omejeni, \\(5\\) neomejenih.',
                'The diagram has \\(7\\) vertices, \\(8\\) finite edges and \\(5\\) rays; \\(2\\) cells are bounded, \\(5\\) unbounded.'),
        },
        {
            id: 'vor-dual', order: 5,
            title: text('Dualnost: trikotnik in njegovo oglišče', 'Duality: a triangle and its vertex'),
            purpose: text('Videti, da je oglišče diagrama središče očrtane krožnice Delaunayevega trikotnika.', 'Seeing that a vertex of the diagram is the circumcentre of a Delaunay triangle.'),
            explanation: text(
                'Vklopili smo Delaunayevo triangulacijo istih mest. Izbran je trikotnik \\(P_1P_2P_6\\): središče njegove očrtane krožnice je \\((4,-1)\\), graf ga označi kot Voronojevo oglišče. Računsko: kvadrat razdalje od \\((4,-1)\\) do vsakega od \\(P_1\\), \\(P_2\\) in \\(P_6\\) je \\(17\\). Notranji robovi triangulacije (\\(8\\)) ustrezajo končnim robom diagrama, robovi ovojnice (\\(5\\)) poltrakom. To je dualnost. Slika nekaj mest dualnost ilustrira, ne dokazuje; dokaz sloni na lastnosti prazne krožnice Delaunayeve triangulacije.',
                'The Delaunay triangulation of the same sites is switched on. The triangle \\(P_1P_2P_6\\) is selected: the centre of its circumcircle is \\((4,-1)\\), and the graph marks it as a Voronoi vertex. By calculation: the squared distance from \\((4,-1)\\) to each of \\(P_1\\), \\(P_2\\) and \\(P_6\\) is \\(17\\). The interior edges of the triangulation (\\(8\\)) match the finite edges of the diagram, the hull edges (\\(5\\)) match the rays. This is duality. A picture of a few sites illustrates duality and does not prove it; the proof rests on the empty-circle property of the Delaunay triangulation.',
            ),
            formulaIds: ['vor-cell-formula'], workedExampleId: 'vor-vertex-example',
            frames: [frame('vor-dual-explanation', 'explanation'), frame('vor-dual-calculation', 'calculation'), frame('vor-dual-observation', 'observation')],
            observationPrompt: text('Izberi še en trikotnik na seznamu in preveri, da je njegovo središče očrtane krožnice oglišče diagrama.', 'Select another triangle in the list and check that the centre of its circumcircle is a vertex of the diagram.'),
            expectedObservations: [text('Izpis pri trikotniku \\(P_1P_2P_6\\) pokaže središče \\((4,-1)\\) kot Voronojevo oglišče, enako oddaljeno od mest \\(P_1\\), \\(P_2\\) in \\(P_6\\).', 'For the triangle \\(P_1P_2P_6\\) the readout shows the centre \\((4,-1)\\) as a Voronoi vertex equally far from the sites \\(P_1\\), \\(P_2\\) and \\(P_6\\).')],
            scene: voronoiScene('vor-dual', ['diagram', 'delaunay'], VORONOI_QUERY_AWAY, [{kind: 'point-set', operation: 'select-triangle', triangle: VORONOI_TRIANGLE_INDEX}],
                'Trikotnik \\(P_1P_2P_6\\) ima središče očrtane krožnice \\((4,-1)\\), to je Voronojevo oglišče.',
                'The triangle \\(P_1P_2P_6\\) has circumcentre \\((4,-1)\\), which is a Voronoi vertex.'),
        },
        {
            id: 'vor-drag', order: 6,
            title: text('Povleci mesto', 'Drag a site'),
            purpose: text('Opazovati, kako se oba diagrama spreminjata skupaj.', 'Watching both diagrams change together.'),
            explanation: text(
                'Povleci eno mesto, na primer \\(P_7\\), in opazuj oba diagrama hkrati. Ko se premaknejo mesta trikotnika, se premakne tudi središče njegove očrtane krožnice, torej Voronojevo oglišče; ko se rob triangulacije zamenja, se spremeni tudi, katere celice se stikajo. Pri vsakem položaju velja isto: oglišča diagrama so središča očrtanih krožnic Delaunayevih trikotnikov.',
                'Drag one site, for example \\(P_7\\), and watch both diagrams at once. When the sites of a triangle move, the centre of its circumcircle moves too, which is a Voronoi vertex; when an edge of the triangulation flips, which cells touch changes as well. At every position the same holds: the vertices of the diagram are the circumcentres of the Delaunay triangles.',
            ),
            formulaIds: ['vor-cell-formula'],
            frames: [frame('vor-drag-explanation', 'explanation'), frame('vor-drag-observation', 'observation')],
            observationPrompt: text('Povleci mesto in poišči položaj, pri katerem se zamenja rob triangulacije; kaj se zgodi z diagramom?', 'Drag a site and find a position where an edge of the triangulation flips; what happens to the diagram?'),
            expectedObservations: [text('Oglišča diagrama in trikotniki se premikajo skupaj; ob zamenjavi roba se spremeni stik celic.', 'The vertices of the diagram and the triangles move together; when an edge flips, which cells touch changes.')],
            scene: voronoiScene('vor-drag', ['diagram', 'delaunay'], VORONOI_QUERY_AWAY, [],
                'Diagram in Delaunayeva triangulacija sta prikazana; povleci mesto.',
                'The diagram and the Delaunay triangulation are shown; drag a site.'),
        },
        {
            id: 'vor-explore', order: 7,
            title: text('Prosto raziskovanje: točka poizvedbe', 'Free exploration: the query point'),
            purpose: text('Samostojno raziskati, katero mesto je najbližje točki.', 'Exploring on your own which site is nearest to a point.'),
            explanation: text(
                'Točka poizvedbe je zdaj v celici mesta \\(P_6\\). Povleci jo, vtipkaj koordinate ali uporabi gumbe s puščicami: izpis imenuje najbližje mesto in poudari njegovo celico. Na meji dveh celic sta najbližji dve mesti, v Voronojevem oglišču pa vsaj tri. Premikaj tudi mesta in išči, kdaj je celica omejena in kdaj ne.',
                'The query point is now in the cell of \\(P_6\\). Drag it, type its coordinates or use the arrow buttons: the readout names the nearest site and highlights its cell. On the border of two cells two sites are nearest, at a Voronoi vertex at least three. Move the sites too and look for when a cell is bounded and when not.',
            ),
            formulaIds: ['vor-cell-formula'],
            frames: [frame('vor-explore-explanation', 'explanation'), frame('vor-explore-observation', 'observation')],
            observationPrompt: text('Postavi točko poizvedbe na mejo dveh celic in preberi, katera mesta izpis imenuje.', 'Put the query point on the border of two cells and read which sites the readout names.'),
            expectedObservations: [text('Na meji izpis imenuje dve enako oddaljeni mesti; v celici mesta \\(P_6\\) imenuje \\(P_6\\).', 'On a border the readout names two equally near sites; inside the cell of \\(P_6\\) it names \\(P_6\\).')],
            scene: voronoiScene('vor-explore', ['diagram', 'delaunay'], VORONOI_QUERY_FREE, [],
                'Točka poizvedbe \\((4,2)\\) je v celici mesta \\(P_6\\); izpis imenuje \\(P_6\\).',
                'The query point \\((4,2)\\) is in the cell of \\(P_6\\); the readout names \\(P_6\\).'),
        },
    ],
    sources: [
        {id: 'berg-voronoi', citation: 'de Berg, M., Cheong, O., van Kreveld, M., Overmars, M. Computational Geometry: Algorithms and Applications, 3rd ed., Chapter 7 (Voronoi diagrams) and Chapter 9 (the Delaunay graph as the dual of the Voronoi diagram).'},
        {
            id: 'bezeg-voronoi-implementation',
            citation: 'Bezeg source: src/compgeo/voronoi.ts, src/compgeo/delaunay.ts and src/graphs/compgeo/VoronoiGraph.tsx.',
            implementationCorrespondence: 'The diagram is derived from the Delaunay triangulation (`voronoiFromDelaunay`): each vertex is the exact circumcentre of a triangle, each interior edge gives a finite edge and each hull edge a ray; a lesson scene sets the sites, the overlay switches, the chosen site, the number of bisectors and the query point, and the readouts are computed from the same exact values.',
        },
    ],
    edgeCases: [
        text('Slika sedmih mest dualnost ilustrira in je ne dokazuje; lekcija ne trdi, da velja za vsako množico mest, in ne obravnava izrojenih primerov (štiri mesta na isti krožnici, vsa mesta na premici).', 'A picture of seven sites illustrates duality and does not prove it; the lesson does not claim it for every set of sites and does not treat degenerate cases (four sites on one circle, all sites on a line).'),
        text('Diagram je neomejen, graf pa ga prikaže le v vidnem delu: poltraki se ob spremembi pogleda znova obrežejo.', 'The diagram is unbounded and the graph draws only the visible part: the rays are clipped again when the view changes.'),
    ],
    unresolvedQuestions: [],
};

/**
 * Degenerate sites lesson (docs/specs/triangulation-voronoi-lessons.md, B5). The scenes use the `point-set` actions `set-mode`,
 * `set-points` and `set-overlay` of `DegenerateSitesGraph`; the quoted values are the readouts of the real graph (the
 * four-point readout and the diagram counts) and are checked in `compgeoVoronoiDegenerateLesson.test.ts`. The examples are those
 * of `degenerateSitesPresets.ts`: `near` (P4 moves from (1,-5) to (0,-5)), `collinear`, the unit square and the trapezoid.
 */
/** The near-circle quadruple of step 1 to 4: P1, P2, P3 lie on the circle of radius 5 about the origin; P4 is one grid step off it (D = -30) or on it (D = 0). */
export const DEGENERATE_NEAR_OFF: readonly LessonPoint[] = [[5, 0], [3, 4], [-4, 3], [1, -5]];
export const DEGENERATE_NEAR_ON: readonly LessonPoint[] = [[5, 0], [3, 4], [-4, 3], [0, -5]];
/** Five sites on the line y = x / 2 (step 5). */
export const DEGENERATE_COLLINEAR: readonly LessonPoint[] = [[-4, -2], [-2, -1], [0, 0], [2, 1], [4, 2]];
/** The cocircular examples of step 7: the unit square, and the symmetric trapezoid (D = 0 for both). */
export const DEGENERATE_SQUARE: readonly LessonPoint[] = [[0, 0], [1, 0], [1, 1], [0, 1]];
export const DEGENERATE_TRAPEZOID: readonly LessonPoint[] = [[0, 0], [8, 0], [9, 5], [-1, 5]];
const DEGENERATE_NEAR_VIEW: LessonViewBox = [-8, 8, 8, -8];
const DEGENERATE_COLLINEAR_VIEW: LessonViewBox = [-7, 5, 7, -5];
const DEGENERATE_TRAPEZOID_VIEW: LessonViewBox = [-4, 9, 12, -4];
const setMode = (mode: 'sites' | 'four-point'): LessonAction => ({kind: 'point-set', operation: 'set-mode', mode});
/**
 * A degenerate-sites scene: the mode first (a scene is a function of its actions, so the mode is always named; `four-point` needs
 * exactly four sites and the lesson default has four), then the points, the diagram switched as listed and the Delaunay overlay off.
 */
const degenerateScene = (id: string, mode: 'sites' | 'four-point', list: readonly LessonPoint[], diagram: boolean, view: LessonViewBox, sl: string, en: string): LessonScene =>
    ({id, basedOn: 'demonstration-default', view, expectedState: text(sl, en),
        actions: [setMode(mode), points(list), overlay('grid', false), overlay('diagram', diagram), overlay('delaunay', false)]});

const voronoiDegenerate: GuidedLesson = {
    demonstrationId: 'voronoi-degenerate',
    title: text('Izrojena mesta: kocirkularne in kolinearne točke', 'Degenerate sites: cocircular and collinear points'),
    summary: text(
        'Štiri kocirkularne točke dajo Voronojevo oglišče stopnje \\(4\\) in Delaunayevo triangulacijo, ki ni enolična; mesta na premici dajo vzporedne pasove brez oglišč in brez triangulacije.',
        'Four cocircular points give a Voronoi vertex of degree \\(4\\) and a Delaunay triangulation that is not unique; sites on a line give parallel strips with no vertices and no triangulation.',
    ),
    prerequisites: [
        text('Potrebna je lekcija o Delaunayevi triangulaciji: prazna krožnica in zamenjava roba.', 'The lesson on the Delaunay triangulation is required: the empty circle and the edge flip.'),
        text('Potrebna je lekcija o Voronojevem diagramu: celice, oglišča in dualnost.', 'The lesson on the Voronoi diagram is required: cells, vertices and duality.'),
    ],
    learningGoals: [
        text('Napoveš število Voronojevih oglišč štirih točk in jo preveriš z izpisom.', 'Predict the number of Voronoi vertices of four points and check it against the readout.'),
        text('Pojasniš, kaj se zgodi z Voronojevim ogliščem in Delaunayevo triangulacijo, ko točka leži natanko na krožnici skozi tri druge.', 'Explain what happens to the Voronoi vertex and the Delaunay triangulation when a point lies exactly on the circle through three others.'),
        text('Razložiš, zakaj ležijo celice kolinearnih mest v vzporednih pasovih brez oglišč in zakaj tedaj ni triangulacije.', 'Explain why the cells of collinear sites are parallel strips with no vertices and why there is then no triangulation.'),
    ],
    formulaBlocks: [
        {
            id: 'deg-incircle-formula',
            latex: 'D=\\det\\begin{pmatrix}a_x-d_x&a_y-d_y&(a_x-d_x)^2+(a_y-d_y)^2\\\\b_x-d_x&b_y-d_y&(b_x-d_x)^2+(b_y-d_y)^2\\\\c_x-d_x&c_y-d_y&(c_x-d_x)^2+(c_y-d_y)^2\\end{pmatrix}',
            notation: text(
                '\\(a\\), \\(b\\), \\(c\\) so točke v nasprotni smeri urnega kazalca, \\(d\\) je četrta točka. \\(D>0\\): \\(d\\) leži znotraj krožnice skozi \\(a\\), \\(b\\), \\(c\\); \\(D<0\\): zunaj; \\(D=0\\): natanko na njej, točke so kocirkularne.',
                '\\(a\\), \\(b\\), \\(c\\) are points in counter-clockwise order and \\(d\\) is the fourth point. \\(D>0\\): \\(d\\) lies inside the circle through \\(a\\), \\(b\\), \\(c\\); \\(D<0\\): outside; \\(D=0\\): exactly on it, so the points are cocircular.',
            ),
            explanation: text(
                'Diagonala štirikotnika je dovoljena, kadar nasprotna točka ne leži strogo znotraj očrtane krožnice trikotnika, torej kadar je \\(D\\le0\\). Pri \\(D=0\\) sta dovoljeni obe diagonali. Vse koordinate so cela števila, zato je \\(D\\) celo število in vrednost \\(0\\) je dosegljiva natančno.',
                'A diagonal of the quadrilateral is legal when the opposite point does not lie strictly inside the circumcircle of the triangle, that is when \\(D\\le0\\). At \\(D=0\\) both diagonals are legal. All coordinates are integers, so \\(D\\) is an integer and the value \\(0\\) is reachable exactly.',
            ),
        },
    ],
    workedExamples: [
        {
            id: 'deg-incircle-example',
            title: text('Določilka za \\(P_1,P_2,P_3\\) in \\(P_4=(1,-5)\\)', 'The determinant for \\(P_1,P_2,P_3\\) and \\(P_4=(1,-5)\\)'),
            calculationLatex: '\\begin{vmatrix}4&5&41\\\\2&9&85\\\\-5&8&89\\end{vmatrix}=4(801-680)-5(178+425)+41(16+45)=484-3015+2501',
            resultLatex: 'D=-30',
            check: text(
                'Izpis pod grafom pove \\(D=-30\\): točka \\(P_4\\) leži zunaj krožnice skozi \\(P_1\\), \\(P_2\\), \\(P_3\\). Pri \\(P_4=(0,-5)\\) je ista določilka \\(0\\).',
                'The readout under the graph says \\(D=-30\\): the point \\(P_4\\) lies outside the circle through \\(P_1\\), \\(P_2\\), \\(P_3\\). For \\(P_4=(0,-5)\\) the same determinant is \\(0\\).',
            ),
        },
    ],
    steps: [
        {
            id: 'deg-near', order: 1,
            title: text('Štiri točke blizu krožnice', 'Four points near a circle'),
            purpose: text('Spoznati štiri točke, ki so skoraj, a ne povsem kocirkularne.', 'Meeting four points that are almost, but not quite, cocircular.'),
            explanation: text(
                'Štiri mesta: \\(P_1=(5,0)\\), \\(P_2=(3,4)\\), \\(P_3=(-4,3)\\) in \\(P_4=(1,-5)\\). Prva tri ležijo na krožnici s polmerom \\(5\\) okoli izhodišča, \\(P_4\\) je od te krožnice oddaljena za korak mreže. Graf je v načinu Mesta, diagram je skrit in izpis ne našteva ničesar o njem.',
                'Four sites: \\(P_1=(5,0)\\), \\(P_2=(3,4)\\), \\(P_3=(-4,3)\\) and \\(P_4=(1,-5)\\). The first three lie on the circle of radius \\(5\\) about the origin; \\(P_4\\) is one grid step away from that circle. The graph is in the Sites mode, the diagram is hidden and the readout lists nothing about it.',
            ),
            formulaIds: ['deg-incircle-formula'],
            frames: [frame('deg-near-explanation', 'explanation'), frame('deg-near-observation', 'observation')],
            observationPrompt: text('Preberi koordinate štirih mest in oceni, ali \\(P_4\\) leži znotraj ali zunaj krožnice skozi ostala tri.', 'Read the coordinates of the four sites and judge whether \\(P_4\\) lies inside or outside the circle through the other three.'),
            expectedObservations: [text('Na grafu so štiri mesta brez diagrama; \\(P_4\\) je blizu krožnice, a ni na njej.', 'The graph shows four sites and no diagram; \\(P_4\\) is near the circle but not on it.')],
            scene: degenerateScene('deg-near', 'sites', DEGENERATE_NEAR_OFF, false, DEGENERATE_NEAR_VIEW,
                'Štiri mesta \\(P_1\\), ..., \\(P_4\\) v načinu Mesta; diagram je skrit.',
                'The four sites \\(P_1\\), ..., \\(P_4\\) in the Sites mode; the diagram is hidden.'),
        },
        {
            id: 'deg-predict', order: 2,
            title: text('Napovej: koliko Voronojevih oglišč?', 'Predict: how many Voronoi vertices?'),
            purpose: text('Pred prikazom napovedati število oglišč diagrama štirih točk.', 'Predicting before the display the number of vertices of the diagram of four points.'),
            explanation: text(
                'Vsako Voronojevo oglišče je središče krožnice skozi tri mesta, ki ne vsebuje četrtega. Koliko takih krožnic imajo te štiri točke? Ali je odgovor odvisen od tega, da \\(P_4\\) ne leži na krožnici skozi ostala tri? Graf še ne kaže diagrama in izpis nobenega števila oglišč; odgovor zapiši sam.',
                'Every Voronoi vertex is the centre of a circle through three sites that contains no fourth site. How many such circles do these four points have? Does the answer depend on \\(P_4\\) not lying on the circle through the other three? The graph does not show the diagram yet and the readout no number of vertices; write down your answer.',
            ),
            formulaIds: ['deg-incircle-formula'],
            frames: [frame('deg-predict-explanation', 'explanation'), frame('deg-predict-observation', 'observation')],
            observationPrompt: text('Zapiši napoved števila oglišč in utemelji.', 'Write down your prediction of the number of vertices and give your reason.'),
            expectedObservations: [text('Napoved še ni preverjena; v naslednjih korakih jo primerjamo z izpisom.', 'The prediction is not yet checked; the next steps compare it with the readout.')],
            scene: degenerateScene('deg-predict', 'sites', DEGENERATE_NEAR_OFF, false, DEGENERATE_NEAR_VIEW,
                'Diagram še ni prikazan; napoved se preveri pozneje.',
                'The diagram is not shown yet; the prediction is checked later.'),
        },
        {
            id: 'deg-on', order: 3,
            title: text('Točka na krožnici', 'A point on the circle'),
            purpose: text('Videti, da kocirkularne točke dajo eno oglišče stopnje \\(4\\) in dve dovoljeni diagonali.', 'Seeing that cocircular points give one vertex of degree \\(4\\) and two legal diagonals.'),
            explanation: text(
                'Graf je zdaj v načinu Štiri točke, diagram je viden, \\(P_4\\) pa je premaknjena z \\((1,-5)\\) na \\((0,-5)\\), natanko na krožnico. Izpis pove \\(D=0\\), eno Voronojevo oglišče s stopnjo \\(4\\) in da sta obe diagonali, \\(P_1\\)–\\(P_3\\) in \\(P_2\\)–\\(P_4\\), dovoljeni. Delaunayeva triangulacija zato ni enolična.',
                'The graph is now in the Four points mode, the diagram is visible and \\(P_4\\) has moved from \\((1,-5)\\) to \\((0,-5)\\), exactly onto the circle. The readout says \\(D=0\\), one Voronoi vertex of degree \\(4\\), and that both diagonals, \\(P_1\\)–\\(P_3\\) and \\(P_2\\)–\\(P_4\\), are legal. The Delaunay triangulation is therefore not unique.',
            ),
            formulaIds: ['deg-incircle-formula'], workedExampleId: 'deg-incircle-example',
            frames: [frame('deg-on-explanation', 'explanation'), frame('deg-on-calculation', 'calculation'), frame('deg-on-observation', 'observation')],
            observationPrompt: text('Primerjaj število oglišč z napovedjo in preberi stopnjo oglišča in obe diagonali.', 'Compare the number of vertices with your prediction and read the degree of the vertex and both diagonals.'),
            expectedObservations: [text('Izpis pokaže \\(D=0\\), \\(1\\) oglišče s stopnjo \\(4\\) in obe diagonali dovoljeni.', 'The readout shows \\(D=0\\), \\(1\\) vertex of degree \\(4\\) and both diagonals legal.')],
            scene: degenerateScene('deg-on', 'four-point', DEGENERATE_NEAR_ON, true, DEGENERATE_NEAR_VIEW,
                'Točka \\(P_4=(0,-5)\\) leži na krožnici: \\(D=0\\), \\(1\\) oglišče stopnje \\(4\\), obe diagonali sta dovoljeni.',
                'The point \\(P_4=(0,-5)\\) lies on the circle: \\(D=0\\), \\(1\\) vertex of degree \\(4\\), both diagonals legal.'),
        },
        {
            id: 'deg-off', order: 4,
            title: text('Točka za korak stran od krožnice', 'A point one step off the circle'),
            purpose: text('Videti, da se oglišče stopnje \\(4\\) razcepi na dve oglišči in ena diagonala postane edina dovoljena.', 'Seeing the vertex of degree \\(4\\) split into two vertices and one diagonal become the only legal one.'),
            explanation: text(
                '\\(P_4\\) je spet na \\((1,-5)\\), korak stran od krožnice. Izpis pove \\(D=-30\\): \\(P_4\\) leži zunaj krožnice skozi \\(P_1\\), \\(P_2\\), \\(P_3\\). Voronojevi oglišči sta zdaj \\(2\\), obe stopnje \\(3\\), in dovoljena je samo diagonala \\(P_1\\)–\\(P_3\\), zato je triangulacija enolična. Že en korak mreže loči eno oglišče stopnje \\(4\\) od dveh oglišč stopnje \\(3\\).',
                '\\(P_4\\) is back at \\((1,-5)\\), one step off the circle. The readout says \\(D=-30\\): \\(P_4\\) lies outside the circle through \\(P_1\\), \\(P_2\\), \\(P_3\\). There are now \\(2\\) Voronoi vertices, both of degree \\(3\\), and only the diagonal \\(P_1\\)–\\(P_3\\) is legal, so the triangulation is unique. A single grid step separates one vertex of degree \\(4\\) from two vertices of degree \\(3\\).',
            ),
            formulaIds: ['deg-incircle-formula'], workedExampleId: 'deg-incircle-example',
            frames: [frame('deg-off-explanation', 'explanation'), frame('deg-off-calculation', 'calculation'), frame('deg-off-observation', 'observation')],
            observationPrompt: text('Primerjaj zgradnjo prejšnjega koraka: kaj se je zgodilo z oglišči in diagonalama?', 'Compare with the previous step: what happened to the vertices and the diagonals?'),
            expectedObservations: [text('Izpis pokaže \\(D=-30\\), \\(2\\) oglišči s stopnjama \\(3\\) in \\(3\\) in samo diagonalo \\(P_1\\)–\\(P_3\\) kot dovoljeno.', 'The readout shows \\(D=-30\\), \\(2\\) vertices of degrees \\(3\\) and \\(3\\), and only the diagonal \\(P_1\\)–\\(P_3\\) as legal.')],
            scene: degenerateScene('deg-off', 'four-point', DEGENERATE_NEAR_OFF, true, DEGENERATE_NEAR_VIEW,
                'Točka \\(P_4=(1,-5)\\) je zunaj krožnice: \\(D=-30\\), \\(2\\) oglišči stopnje \\(3\\), samo diagonala \\(P_1\\)–\\(P_3\\) je dovoljena.',
                'The point \\(P_4=(1,-5)\\) is outside the circle: \\(D=-30\\), \\(2\\) vertices of degree \\(3\\), only the diagonal \\(P_1\\)–\\(P_3\\) is legal.'),
        },
        {
            id: 'deg-collinear', order: 5,
            title: text('Mesta na premici', 'Collinear sites'),
            purpose: text('Videti, da imajo kolinearna mesta pasove brez oglišč in nimajo triangulacije.', 'Seeing that collinear sites have strips with no vertices and no triangulation.'),
            explanation: text(
                'Pet mest leži na premici \\(y=x/2\\): \\((-4,-2)\\), \\((-2,-1)\\), \\((0,0)\\), \\((2,1)\\) in \\((4,2)\\). Simetrale sosednjih mest so vzporedne, zato celice niso večkotniki, ampak pasovi. Izpis našteje \\(0\\) oglišč in \\(4\\) premice, graf pa pove, da triangulacije ni: tri točke na premici ne tvorijo trikotnika. Pet mest ni v načinu Štiri točke, zato je graf v načinu Mesta.',
                'Five sites lie on the line \\(y=x/2\\): \\((-4,-2)\\), \\((-2,-1)\\), \\((0,0)\\), \\((2,1)\\) and \\((4,2)\\). The bisectors of neighbouring sites are parallel, so the cells are strips, not polygons. The readout counts \\(0\\) vertices and \\(4\\) lines, and the graph says there is no triangulation: three points on a line do not form a triangle. Five sites do not fit the Four points mode, so the graph is in the Sites mode.',
            ),
            formulaIds: [],
            frames: [frame('deg-collinear-explanation', 'explanation'), frame('deg-collinear-observation', 'observation')],
            observationPrompt: text('Preštej premice na grafu in preberi sporočilo pod njim.', 'Count the lines on the graph and read the message under it.'),
            expectedObservations: [text('Izpis pokaže \\(0\\) oglišč in \\(4\\) premice, sporočilo pa pove, da triangulacije ni.', 'The readout shows \\(0\\) vertices and \\(4\\) lines, and the message says there is no triangulation.')],
            scene: degenerateScene('deg-collinear', 'sites', DEGENERATE_COLLINEAR, true, DEGENERATE_COLLINEAR_VIEW,
                'Pet kolinearnih mest: \\(0\\) oglišč, \\(4\\) premice, triangulacije ni.',
                'Five collinear sites: \\(0\\) vertices, \\(4\\) lines, no triangulation.'),
        },
        {
            id: 'deg-convention', order: 6,
            title: text('Dogovor in mreža', 'The convention and the grid'),
            purpose: text('Razumeti dogovor, ki ga lekcija uporablja, in zakaj je natančna ničla dosegljiva.', 'Understanding the convention the lesson uses and why an exact zero is reachable.'),
            explanation: text(
                'Dogovor: diagonala je dovoljena, kadar je \\(D\\le0\\); pri kocirkularnih mestih sta zato dovoljeni obe. Mesta ležijo na celoštevilski mreži, zato je \\(D\\) celo število in natančna ničla je dosegljiva: pri \\(P_4=(0,-5)\\) je \\(D=0\\), pri \\((1,-5)\\) pa \\(D=-30\\). Pri poljubno natančnem premiku točke bi bila ničla skoraj nikoli dosežena. Pri štirih kocirkularnih mestih ima Voronojevo oglišče stopnjo \\(4\\) in dual ni triangulacija, ampak ima štirikotno lice; Delaunayeva triangulacija je enolična le, kadar nobene štiri točke niso kocirkularne.',
                'The convention: a diagonal is legal when \\(D\\le0\\); for cocircular sites both are therefore legal. The sites lie on an integer grid, so \\(D\\) is an integer and an exact zero is reachable: at \\(P_4=(0,-5)\\) we get \\(D=0\\), at \\((1,-5)\\) we get \\(D=-30\\). For a point moving with unlimited precision a zero would almost never be hit. With four cocircular sites the Voronoi vertex has degree \\(4\\) and the dual is not a triangulation but has a quadrilateral face; the Delaunay triangulation is unique only when no four points are cocircular.',
            ),
            formulaIds: ['deg-incircle-formula'],
            frames: [frame('deg-convention-explanation', 'explanation'), frame('deg-convention-observation', 'observation')],
            observationPrompt: text('Povleci \\(P_4\\) po mreži in poišči položaj, pri katerem izpis pove \\(D=0\\).', 'Drag \\(P_4\\) along the grid and find a position where the readout says \\(D=0\\).'),
            expectedObservations: [text('Pri \\(P_4=(0,-5)\\) izpis pove \\(D=0\\) in obe diagonali sta dovoljeni; pri sosednjih točkah mreže je \\(D\\) različen od \\(0\\).', 'At \\(P_4=(0,-5)\\) the readout says \\(D=0\\) and both diagonals are legal; at the neighbouring grid points \\(D\\) differs from \\(0\\).')],
            scene: degenerateScene('deg-convention', 'four-point', DEGENERATE_NEAR_ON, true, DEGENERATE_NEAR_VIEW,
                'Točka \\(P_4=(0,-5)\\): \\(D=0\\), obe diagonali sta dovoljeni po dogovoru \\(D\\le0\\).',
                'The point \\(P_4=(0,-5)\\): \\(D=0\\), both diagonals are legal by the convention \\(D\\le0\\).'),
        },
        {
            id: 'deg-explore', order: 7,
            title: text('Prosto raziskovanje: kvadrat in trapez', 'Free exploration: the square and the trapezoid'),
            purpose: text('Samostojno raziskati kocirkularne primere in jih pokvariti.', 'Exploring cocircular examples on your own and breaking them.'),
            explanation: text(
                'Graf kaže trapez \\((0,0)\\), \\((8,0)\\), \\((9,5)\\), \\((-1,5)\\), ki je kocirkularen: \\(D=0\\). Pritisni primer Kvadrat za enotski kvadrat \\((0,0)\\), \\((1,0)\\), \\((1,1)\\), \\((0,1)\\), kjer je prav tako \\(D=0\\). Povleci točko za korak mreže in opazuj, kako se eno oglišče stopnje \\(4\\) razcepi; ali znaš sam najti še kakšno kocirkularno četverico?',
                'The graph shows the trapezoid \\((0,0)\\), \\((8,0)\\), \\((9,5)\\), \\((-1,5)\\), which is cocircular: \\(D=0\\). Press the Square example for the unit square \\((0,0)\\), \\((1,0)\\), \\((1,1)\\), \\((0,1)\\), where \\(D=0\\) as well. Drag a point one grid step and watch the one vertex of degree \\(4\\) split; can you find another cocircular quadruple yourself?',
            ),
            formulaIds: ['deg-incircle-formula'],
            frames: [frame('deg-explore-explanation', 'explanation'), frame('deg-explore-observation', 'observation')],
            observationPrompt: text('Premakni eno točko trapeza za korak mreže in preberi, kaj izpis pove o določilki in diagonalah.', 'Move one point of the trapezoid by one grid step and read what the readout says about the determinant and the diagonals.'),
            expectedObservations: [text('Trapez in kvadrat imata \\(D=0\\), eno oglišče stopnje \\(4\\) in obe diagonali dovoljeni; po premiku za korak je \\(D\\ne0\\) in dovoljena je ena diagonala.', 'The trapezoid and the square have \\(D=0\\), one vertex of degree \\(4\\) and both diagonals legal; after a one-step move \\(D\\ne0\\) and one diagonal is legal.')],
            scene: degenerateScene('deg-explore', 'four-point', DEGENERATE_TRAPEZOID, true, DEGENERATE_TRAPEZOID_VIEW,
                'Trapez \\((0,0)\\), \\((8,0)\\), \\((9,5)\\), \\((-1,5)\\): \\(D=0\\), \\(1\\) oglišče stopnje \\(4\\), obe diagonali sta dovoljeni.',
                'The trapezoid \\((0,0)\\), \\((8,0)\\), \\((9,5)\\), \\((-1,5)\\): \\(D=0\\), \\(1\\) vertex of degree \\(4\\), both diagonals legal.'),
        },
    ],
    sources: [
        {id: 'berg-degenerate', citation: 'de Berg, M., Cheong, O., van Kreveld, M., Overmars, M. Computational Geometry: Algorithms and Applications, 3rd ed., Chapter 9 (Delaunay triangulations: degenerate cases and uniqueness).'},
        {
            id: 'bezeg-degenerate-implementation',
            citation: 'Bezeg source: src/compgeo/predicates.ts (`incircleValue`), src/graphs/compgeo/degenerateSites.ts and src/graphs/compgeo/DegenerateSitesGraph.tsx.',
            implementationCorrespondence: 'The determinant is the exact `incircleValue` of three counter-clockwise sites and the fourth; the diagram counts come from `voronoiFromDelaunay`; a lesson scene sets the mode with the `set-mode` action, the sites with `set-points` and the diagram with `set-overlay`.',
        },
    ],
    edgeCases: [
        text('Lekcija obravnava štiri točke in pet kolinearnih mest; ne trdi, da se vsaka množica mest obnaša tako, in ne uči Fortunovega algoritma.', 'The lesson treats four points and five collinear sites; it does not claim that every set of sites behaves this way and does not teach Fortune\'s algorithm.'),
        text('Natančna ničla je dosegljiva le zato, ker so koordinate na celoštevilski mreži; z zaokroženimi decimalnimi števili bi bili kocirkularni primeri redko natančno kocirkularni.', 'An exact zero is reachable only because the coordinates are on an integer grid; with rounded decimal numbers cocircular examples would rarely be exactly cocircular.'),
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

/**
 * Monotone-partition lesson (docs/specs/sweep-algorithms-lessons.md, C3). The scenes use the `point-set` actions (`set-points` in
 * polygon mode, `set-trace-step`) of `MonotonePartitionGraph`; `MonotonePartitionLessonActions.host.test.tsx` checks every quoted value
 * against the real graph's readout. The vertices are named like the board and the readout, v1..v6 (the spec's list order). The first
 * example has 15 trace steps ("Korak k od 14" is the trace index k, the last index 14 is `done`): index 5 pops the merge vertex (8,5),
 * index 6 makes it the helper of the left edge, index 8 adds the diagonal v2-v5, index 14 is the finished partition. The second example
 * has 21 trace steps; index 20 is `done` with the diagonals v5-v7 and v3-v5 and three pieces of areas 10, 42 and 6.
 */
export const MONOTONE_TRACE_STEPS = {classified: 5, helper: 6, diagonal: 8, done: 14, secondDone: 20} as const;

/** The first example of C3 (one split vertex whose helper is the merge vertex) and the second (two merge vertices, no split). */
export const MONOTONE_EXAMPLE_1: readonly LessonPoint[] = [[0, 0], [4, 3], [8, 0], [12, 8], [8, 5], [4, 8]];
export const MONOTONE_EXAMPLE_2: readonly LessonPoint[] = [[4, 0], [10, 2], [8, 5], [12, 9], [7, 7], [5, 12], [3, 7], [0, 9], [2, 4]];

/** The polygon's bounding box with a margin of 1 (first example: x -1..13, y -1..9). */
export const monotoneView = (list: readonly LessonPoint[]): LessonViewBox => {
    const xs = list.map(([x]) => x);
    const ys = list.map(([, y]) => y);
    return [Math.min(...xs) - 1, Math.max(...ys) + 1, Math.max(...xs) + 1, Math.min(...ys) - 1];
};
/** A partition scene framed on its polygon: the polygon (which returns to step 0 and pauses), then the step actions. */
const monotoneScene = (id: string, list: readonly LessonPoint[], steps: readonly LessonAction[], sl: string, en: string): LessonScene =>
    ({id, basedOn: 'demonstration-default', view: monotoneView(list), actions: [polygon(list), ...steps], expectedState: text(sl, en)});

const monotonePartition: GuidedLesson = {
    demonstrationId: 'monotone-partition',
    title: text('Razdelitev na monotone večkotnike', 'Partitioning into monotone polygons'),
    summary: text(
        'Pometalna premica gre po večkotniku od zgoraj navzdol, razvrsti oglišča in z diagonalami od razcepnih in zlivnih oglišč razdeli večkotnik na dele, monotone glede na os \\(y\\).',
        'A sweep line goes down the polygon, classifies the vertices and, with diagonals from the split and merge vertices, cuts the polygon into pieces that are monotone with respect to the \\(y\\)-axis.',
    ),
    prerequisites: [
        text('Lekcija Pometanje intervalov (vrsta dogodkov in stanje) ter lekcija Orientacija treh točk.', 'The lesson Interval sweep (event queue and status) and the lesson Orientation of three points.'),
    ],
    learningGoals: [
        text('Razvrstiš oglišča v začetna, končna, razcepna, zlivna in navadna in poveš, katera kvarijo monotonost.', 'Classify the vertices as start, end, split, merge or regular and say which ones break monotonicity.'),
        text('Razložiš, zakaj ima razcepno oglišče diagonalo do pomočnika roba levo od njega in zakaj zlivno oglišče postane pomočnik.', 'Explain why a split vertex gets a diagonal to the helper of the edge to its left, and why a merge vertex becomes a helper.'),
        text('Preveriš, da je kosov \\(1\\) več kot diagonal, in da je vsak kos monoton.', 'Check that the number of pieces is one more than the number of diagonals, and that every piece is monotone.'),
    ],
    formulaBlocks: [
        {
            id: 'monotone-piece-count',
            latex: 'p=d+1',
            notation: text(
                '\\(d\\) je število dodanih diagonal, \\(p\\) je število kosov.',
                '\\(d\\) is the number of diagonals added and \\(p\\) is the number of pieces.',
            ),
            explanation: text(
                'Vsaka diagonala, ki seka notranjost enostavnega večkotnika od oglišča do oglišča, razdeli en kos na dva, zato kosov ni več kot diagonal plus ena. Pri prvem primeru je \\(d=1\\), torej \\(p=2\\).',
                'Each diagonal that runs inside a simple polygon from vertex to vertex cuts one piece into two, so the number of pieces is the number of diagonals plus one. In the first example \\(d=1\\), so \\(p=2\\).',
            ),
        },
        {
            id: 'monotone-type-balance',
            latex: 'n_{\\text{start}}+n_{\\text{split}}=n_{\\text{end}}+n_{\\text{merge}}',
            notation: text(
                '\\(n_{\\text{start}}\\), \\(n_{\\text{split}}\\), \\(n_{\\text{end}}\\) in \\(n_{\\text{merge}}\\) so števila začetnih, razcepnih, končnih in zlivnih oglišč.',
                '\\(n_{\\text{start}}\\), \\(n_{\\text{split}}\\), \\(n_{\\text{end}}\\) and \\(n_{\\text{merge}}\\) are the numbers of start, split, end and merge vertices.',
            ),
            explanation: text(
                'Pri pometanju navzdol se območje pod premico začne in konča enako mnogokrat: vsako začetno in razcepno oglišče odpre en nov odsek premice znotraj večkotnika, vsako končno in zlivno ga zapre. V prvem primeru je \\(2+1=2+1\\).',
                'While the line moves down, the stretches of the line inside the polygon are opened and closed equally often: every start and split vertex opens a new stretch, every end and merge vertex closes one. In the first example \\(2+1=2+1\\).',
            ),
        },
    ],
    workedExamples: [
        {
            id: 'monotone-piece-area-example',
            title: text('Ploščina prvega kosa', 'The area of the first piece'),
            calculationLatex: '2A=(0\\cdot3-4\\cdot0)+(4\\cdot5-8\\cdot3)+(8\\cdot8-4\\cdot5)+(4\\cdot0-0\\cdot8)=0-4+44+0=40',
            resultLatex: 'A=20',
            check: text(
                'Kos \\((0,0),(4,3),(8,5),(4,8)\\) ima po obrazcu za ploščino ploščino \\(20\\); drugi kos ima tudi \\(20\\), skupaj \\(40\\) kot cel večkotnik. Izpis pove „Kosov je 2 = število diagonal (1) + 1“.',
                'The piece \\((0,0),(4,3),(8,5),(4,8)\\) has area \\(20\\) by the area formula; the second piece also has \\(20\\), together \\(40\\) like the whole polygon. The readout says "Pieces: 2 = number of diagonals (1) + 1".',
            ),
        },
    ],
    steps: [
        {
            id: 'monpart-polygon', order: 1,
            title: text('Večkotnik', 'The polygon'),
            purpose: text('Spoznati večkotnik in vprašanje, kaj pomeni biti monoton glede na os \\(y\\).', 'Meeting the polygon and the question of what it means to be monotone with respect to the \\(y\\)-axis.'),
            explanation: text(
                'Večkotnik ima oglišča \\((0,0)\\), \\((4,3)\\), \\((8,0)\\), \\((12,8)\\), \\((8,5)\\) in \\((4,8)\\) ter ploščino \\(40\\). Je monoton glede na os \\(y\\), če vsaka vodoravna premica seka večkotnik v eni sami daljici. Ta večkotnik ni monoton: vodoravna premica pri \\(y=2\\) ga seka v dveh ločenih daljicah, ker je oglišče \\((4,3)\\) vdrtina od spodaj. Pometalna premica je na vrhu in sled je na koraku \\(0\\) od \\(14\\).',
                'The polygon has the vertices \\((0,0)\\), \\((4,3)\\), \\((8,0)\\), \\((12,8)\\), \\((8,5)\\) and \\((4,8)\\) and area \\(40\\). It is monotone with respect to the \\(y\\)-axis if every horizontal line meets it in a single segment. This polygon is not monotone: the horizontal line at \\(y=2\\) meets it in two separate segments, because the vertex \\((4,3)\\) is a dent from below. The sweep line is at the top and the trace is at step \\(0\\) of \\(14\\).',
            ),
            formulaIds: ['monotone-piece-count'],
            frames: [frame('monpart-polygon-explanation', 'explanation'), frame('monpart-polygon-observation', 'observation')],
            observationPrompt: text('Poglej večkotnik in poišči mesta, kjer bi vodoravna premica presekala večkotnik v več kot eni daljici.', 'Look at the polygon and find the places where a horizontal line would meet it in more than one segment.'),
            expectedObservations: [text('Sled je na koraku \\(0\\) od \\(14\\), diagonal še ni in vrste oglišč še niso razkrite.', 'The trace is at step \\(0\\) of \\(14\\), there are no diagonals yet and the vertex types are not revealed.')],
            scene: monotoneScene('monpart-polygon', MONOTONE_EXAMPLE_1, [],
                'Večkotnik; sled je na koraku \\(0\\) od \\(14\\), diagonal še ni.',
                'The polygon; the trace is at step \\(0\\) of \\(14\\), no diagonals yet.'),
        },
        {
            id: 'monpart-predict', order: 2,
            title: text('Napovej težavna oglišča', 'Predict the troublesome vertices'),
            purpose: text('Pred razkritjem napovedati, katera oglišča kvarijo monotonost.', 'Predicting, before the reveal, which vertices break monotonicity.'),
            explanation: text(
                'Preden pritisneš Naslednji korak, napovej: pri katerih ogliščih pometalna premica „razcepi“ območje na dva dela ali ga „zlije“ v enega? Namig: iščeš oglišča, kjer sta obe sosednji oglišči na isti strani (obe zgoraj ali obe spodaj) in je notranji kot večji od \\(\\pi\\). Sled je še na koraku \\(0\\) od \\(14\\).',
                'Before you press Next step, predict: at which vertices does the sweep line "split" the region into two or "merge" two into one? Hint: look for vertices whose two neighbours are on the same side (both above or both below) and whose interior angle is greater than \\(\\pi\\). The trace is still at step \\(0\\) of \\(14\\).',
            ),
            formulaIds: ['monotone-type-balance'],
            frames: [frame('monpart-predict-explanation', 'explanation'), frame('monpart-predict-observation', 'observation')],
            observationPrompt: text('Zapiši oglišča, za katera meniš, da kvarijo monotonost.', 'Write down the vertices you think break monotonicity.'),
            expectedObservations: [text('Napoved še ni preverjena; sled je na koraku \\(0\\) od \\(14\\) in jo primerjamo v naslednjih korakih.', 'The prediction is not checked yet; the trace is at step \\(0\\) of \\(14\\) and the next steps compare it.')],
            scene: monotoneScene('monpart-predict', MONOTONE_EXAMPLE_1, [],
                'Sled je na koraku \\(0\\) od \\(14\\); vrste oglišč še niso razkrite.',
                'The trace is at step \\(0\\) of \\(14\\); the vertex types are not revealed yet.'),
        },
        {
            id: 'monpart-classify', order: 3,
            title: text('Vrste oglišč', 'Vertex types'),
            purpose: text('Videti, kako pometanje razvrsti oglišča po sosedih in notranjem kotu.', 'Seeing how the sweep classifies the vertices by their neighbours and interior angle.'),
            explanation: text(
                'Oglišča obdelamo od zgoraj navzdol, pri enaki višini najprej tisto z manjšim \\(x\\). Tako sta prva \\((4,8)\\) in \\((12,8)\\), obe začetni: oba soseda sta pod njima in notranji kot je manjši od \\(\\pi\\). Tretje je \\((8,5)\\): oba soseda sta nad njim in notranji kot je večji od \\(\\pi\\), zato je zlivno. Sled je na koraku \\(5\\) od \\(14\\); v stanju sta robova \\(e_6\\) od \\((4,8)\\) in \\(e_4\\) od \\((12,8)\\), ki omejujeta notranjost z leve. Tri zaporedna kolinearna oglišča program zavrne, ker zanje vrsta ni določena.',
                'The vertices are handled from top to bottom, at equal height the one with the smaller \\(x\\) first. So the first two are \\((4,8)\\) and \\((12,8)\\), both start vertices: both neighbours are below them and the interior angle is smaller than \\(\\pi\\). The third is \\((8,5)\\): both neighbours are above it and the interior angle is greater than \\(\\pi\\), so it is a merge vertex. The trace is at step \\(5\\) of \\(14\\); the status holds the edges \\(e_6\\) from \\((4,8)\\) and \\(e_4\\) from \\((12,8)\\), which bound the interior on the left. Three consecutive collinear vertices are refused, because their type is not defined.',
            ),
            formulaIds: ['monotone-type-balance'],
            frames: [frame('monpart-classify-explanation', 'explanation'), frame('monpart-classify-observation', 'observation')],
            observationPrompt: text('Pritiskaj Naslednji korak in pri vsakem obdelanem oglišču preberi vrsto in razlog v izpisu.', 'Press Next step and, at each vertex handled, read its type and the reason in the readout.'),
            expectedObservations: [text('Po treh obdelanih ogliščih je zadnje, \\(v_5=(8,5)\\), zlivno; stanje ima dva roba, \\(e_6\\) in \\(e_4\\), in diagonal še ni.', 'After three vertices handled, the last one, \\(v_5=(8,5)\\), is a merge vertex; the status has two edges, \\(e_6\\) and \\(e_4\\), and there are no diagonals yet.')],
            scene: monotoneScene('monpart-classify', MONOTONE_EXAMPLE_1, [setTraceStep(MONOTONE_TRACE_STEPS.classified)],
                'Sled je na koraku \\(5\\) od \\(14\\): oglišče \\(v_5=(8,5)\\) je zlivno, stanje \\(e_6, e_4\\), diagonal še ni.',
                'The trace is at step \\(5\\) of \\(14\\): the vertex \\(v_5=(8,5)\\) is a merge vertex, status \\(e_6, e_4\\), no diagonals yet.'),
        },
        {
            id: 'monpart-helper', order: 4,
            title: text('Pomočnik roba', 'The helper of an edge'),
            purpose: text('Razumeti, da zlivno oglišče postane pomočnik levega roba in da si stanje zapomni pomočnika vsakega roba.', 'Understanding that a merge vertex becomes the helper of the left edge and that the status remembers a helper for every edge.'),
            explanation: text(
                'Stanje hrani robe levo od notranjosti, vsakega s pomočnikom: najnižjim doslej obdelanim ogliščem, ki ga lahko povežemo z robom, ne da bi prečkali večkotnik. Ko je obdelano zlivno oglišče \\((8,5)\\), rob \\(e_4\\) izstopi iz stanja, levi rob \\(e_6\\) pa dobi za pomočnika \\((8,5)\\). Sled je na koraku \\(6\\) od \\(14\\); stanje ima en rob, \\(e_6\\), s pomočnikom \\(v_5\\).',
                'The status holds the edges on the left of the interior, each with a helper: the lowest vertex handled so far that can be joined to the edge without crossing the polygon. When the merge vertex \\((8,5)\\) is handled, the edge \\(e_4\\) leaves the status and the left edge \\(e_6\\) gets \\((8,5)\\) as its helper. The trace is at step \\(6\\) of \\(14\\); the status has one edge, \\(e_6\\), with the helper \\(v_5\\).',
            ),
            formulaIds: ['monotone-type-balance'],
            frames: [frame('monpart-helper-explanation', 'explanation'), frame('monpart-helper-observation', 'observation')],
            observationPrompt: text('V seznamu stanja poišči rob \\(e_6\\) in njegovega pomočnika.', 'In the status list find the edge \\(e_6\\) and its helper.'),
            expectedObservations: [text('Stanje je \\(e_6\\) s pomočnikom \\(v_5=(8,5)\\); diagonal še ni.', 'The status is \\(e_6\\) with the helper \\(v_5=(8,5)\\); there are no diagonals yet.')],
            scene: monotoneScene('monpart-helper', MONOTONE_EXAMPLE_1, [setTraceStep(MONOTONE_TRACE_STEPS.helper)],
                'Sled je na koraku \\(6\\) od \\(14\\): stanje \\(e_6\\) s pomočnikom \\(v_5=(8,5)\\), diagonal še ni.',
                'The trace is at step \\(6\\) of \\(14\\): status \\(e_6\\) with the helper \\(v_5=(8,5)\\), no diagonals yet.'),
        },
        {
            id: 'monpart-diagonal', order: 5,
            title: text('Diagonala od razcepnega oglišča', 'The diagonal from the split vertex'),
            purpose: text('Videti, da razcepno oglišče dobi diagonalo do pomočnika levega roba.', 'Seeing that a split vertex gets a diagonal to the helper of the left edge.'),
            explanation: text(
                'Naslednje je oglišče \\((4,3)\\): oba soseda sta pod njim in notranji kot je večji od \\(\\pi\\), zato je razcepno. Premica ga razcepi, zato ga povežemo s pomočnikom roba levo od njega, to je z zlivnim ogliščem \\((8,5)\\). Dodana je diagonala \\((4,3)(8,5)\\). Sled je na koraku \\(8\\) od \\(14\\) in izpis navaja eno diagonalo \\(v_2\\)–\\(v_5\\).',
                'Next comes the vertex \\((4,3)\\): both neighbours are below it and the interior angle is greater than \\(\\pi\\), so it is a split vertex. The line splits there, so we join it to the helper of the edge on its left, the merge vertex \\((8,5)\\). The diagonal \\((4,3)(8,5)\\) is added. The trace is at step \\(8\\) of \\(14\\) and the readout lists one diagonal \\(v_2\\)–\\(v_5\\).',
            ),
            formulaIds: ['monotone-piece-count'],
            frames: [frame('monpart-diagonal-explanation', 'explanation'), frame('monpart-diagonal-observation', 'observation')],
            observationPrompt: text('Poglej, katero oglišče je pomočnik in kam leži diagonala glede na obe oglišči.', 'Look at which vertex is the helper and where the diagonal lies relative to both vertices.'),
            expectedObservations: [text('Diagonal je \\(1\\): \\(v_2\\)–\\(v_5\\), torej \\((4,3)(8,5)\\); stanje je \\(e_6\\) s pomočnikom \\(v_2\\).', 'There is \\(1\\) diagonal: \\(v_2\\)–\\(v_5\\), that is \\((4,3)(8,5)\\); the status is \\(e_6\\) with the helper \\(v_2\\).')],
            scene: monotoneScene('monpart-diagonal', MONOTONE_EXAMPLE_1, [setTraceStep(MONOTONE_TRACE_STEPS.diagonal)],
                'Sled je na koraku \\(8\\) od \\(14\\): diagonala \\(v_2\\)–\\(v_5\\), to je \\((4,3)(8,5)\\).',
                'The trace is at step \\(8\\) of \\(14\\): the diagonal \\(v_2\\)–\\(v_5\\), that is \\((4,3)(8,5)\\).'),
        },
        {
            id: 'monpart-pieces', order: 6,
            title: text('Dva monotona kosa', 'Two monotone pieces'),
            purpose: text('Preveriti, da diagonala razdeli večkotnik na dva monotona kosa in da prešteti kosi ustrezajo diagonalam.', 'Checking that the diagonal cuts the polygon into two monotone pieces and that the number of pieces matches the diagonals.'),
            explanation: text(
                'Sled je izvedena do konca (korak \\(14\\) od \\(14\\)). Večkotnik je razdeljen na kosa \\((0,0),(4,3),(8,5),(4,8)\\) in \\((4,3),(8,0),(12,8),(8,5)\\), vsak s ploščino \\(20\\), skupaj \\(40\\). Vsak kos je monoton glede na os \\(y\\): vodoravna premica ga seka v eni daljici. Kosov je \\(2=1+1\\). Začetnih in razcepnih oglišč je \\(2+1=3\\), končnih in zlivnih prav tako \\(2+1=3\\).',
                'The trace has run to the end (step \\(14\\) of \\(14\\)). The polygon is cut into the pieces \\((0,0),(4,3),(8,5),(4,8)\\) and \\((4,3),(8,0),(12,8),(8,5)\\), each of area \\(20\\), together \\(40\\). Each piece is monotone with respect to the \\(y\\)-axis: a horizontal line meets it in one segment. There are \\(2=1+1\\) pieces. There are \\(2+1=3\\) start and split vertices and also \\(2+1=3\\) end and merge vertices.',
            ),
            formulaIds: ['monotone-piece-count', 'monotone-type-balance'], workedExampleId: 'monotone-piece-area-example',
            frames: [frame('monpart-pieces-explanation', 'explanation'), frame('monpart-pieces-calculation', 'calculation'), frame('monpart-pieces-observation', 'observation')],
            observationPrompt: text('Preveri, da se ploščini kosov seštejeta v ploščino večkotnika, in primerjaj izpis z napovedjo.', 'Check that the areas of the pieces add up to the area of the polygon, and compare the readout with your prediction.'),
            expectedObservations: [text('Kosov je \\(2\\) = število diagonal (\\(1\\)) + \\(1\\); oglišč je začetnih \\(2\\), končnih \\(2\\), razcepnih \\(1\\), zlivnih \\(1\\), navadnih \\(0\\).', 'There are \\(2\\) pieces = number of diagonals (\\(1\\)) + \\(1\\); the vertices are \\(2\\) start, \\(2\\) end, \\(1\\) split, \\(1\\) merge and \\(0\\) regular.')],
            scene: monotoneScene('monpart-pieces', MONOTONE_EXAMPLE_1, [setTraceStep('end')],
                'Sled je na koraku \\(14\\) od \\(14\\): \\(2\\) kosa, vsak ploščine \\(20\\), \\(1\\) diagonala.',
                'The trace is at step \\(14\\) of \\(14\\): \\(2\\) pieces, each of area \\(20\\), \\(1\\) diagonal.'),
        },
        {
            id: 'monpart-merge-only', order: 7,
            title: text('Samo zlivni oglišči', 'Only merge vertices'),
            purpose: text('Videti na drugem primeru, da tudi zlivno oglišče samo potrebuje diagonalo.', 'Seeing on the second example that a merge vertex alone also needs a diagonal.'),
            explanation: text(
                'Drugi večkotnik ima devet oglišč, tri začetna, eno končno, tri navadna in dve zlivni, razcepnih pa nobenega. Kljub temu ni monoton in zlivni oglišči \\((3,7)\\) in \\((7,7)\\) potrebujeta diagonali: \\((7,7)\\) se poveže z \\((3,7)\\), pomočnikom levega roba, nato pa se oglišče \\((8,5)\\) poveže z \\((7,7)\\). Oglišči \\((3,7)\\) in \\((7,7)\\) sta enako visoko, zato velja pravilo: najprej manjši \\(x\\). Sled je na koraku \\(20\\) od \\(20\\): \\(2\\) diagonali, \\(3\\) kosi s ploščinami \\(10\\), \\(42\\) in \\(6\\), skupaj \\(58\\).',
                'The second polygon has nine vertices: three start, one end, three regular and two merge vertices, and no split vertex. It is still not monotone, and the merge vertices \\((3,7)\\) and \\((7,7)\\) need diagonals: \\((7,7)\\) is joined to \\((3,7)\\), the helper of the left edge, and then the vertex \\((8,5)\\) is joined to \\((7,7)\\). The vertices \\((3,7)\\) and \\((7,7)\\) are at equal height, so the tie rule applies: smaller \\(x\\) first. The trace is at step \\(20\\) of \\(20\\): \\(2\\) diagonals, \\(3\\) pieces of areas \\(10\\), \\(42\\) and \\(6\\), together \\(58\\).',
            ),
            formulaIds: ['monotone-piece-count', 'monotone-type-balance'],
            frames: [frame('monpart-merge-only-explanation', 'explanation'), frame('monpart-merge-only-observation', 'observation')],
            observationPrompt: text('Preštej zlivna oglišča in diagonale in preveri, da je kosov za ena več kot diagonal.', 'Count the merge vertices and the diagonals and check that the number of pieces is one more than the number of diagonals.'),
            expectedObservations: [text('Začetnih je \\(3\\), končnih \\(1\\), razcepnih \\(0\\), zlivnih \\(2\\), navadnih \\(3\\); diagonali sta \\(v_5\\)–\\(v_7\\) in \\(v_3\\)–\\(v_5\\), kosov je \\(3=2+1\\).', 'There are \\(3\\) start, \\(1\\) end, \\(0\\) split, \\(2\\) merge and \\(3\\) regular vertices; the diagonals are \\(v_5\\)–\\(v_7\\) and \\(v_3\\)–\\(v_5\\), and there are \\(3=2+1\\) pieces.')],
            scene: monotoneScene('monpart-merge-only', MONOTONE_EXAMPLE_2, [setTraceStep(MONOTONE_TRACE_STEPS.secondDone)],
                'Drugi primer: sled je na koraku \\(20\\) od \\(20\\), diagonali \\(v_5\\)–\\(v_7\\) in \\(v_3\\)–\\(v_5\\), \\(3\\) kosi.',
                'The second example: the trace is at step \\(20\\) of \\(20\\), diagonals \\(v_5\\)–\\(v_7\\) and \\(v_3\\)–\\(v_5\\), \\(3\\) pieces.'),
        },
        {
            id: 'monpart-explore', order: 8,
            title: text('Prosto raziskovanje', 'Free exploration'),
            purpose: text('Samostojno preizkusiti razdelitev na svojem večkotniku.', 'Trying the partition on a polygon of your own.'),
            explanation: text(
                'Premikaj oglišča večkotnika \\((0,0)\\), \\((4,3)\\), \\((8,0)\\), \\((12,8)\\), \\((8,5)\\), \\((4,8)\\) po mreži in pritiskaj Naslednji korak. Sled se ob vsaki spremembi vrne na začetek. Pri enaki višini oglišča obdelamo od leve proti desni. Če premakneš oglišče tako, da so tri zaporedna oglišča na isti premici, ali tako, da se robova sekata, razdelitev zavrne in izpis pove, kaj popraviti.',
                'Move the vertices of the polygon \\((0,0)\\), \\((4,3)\\), \\((8,0)\\), \\((12,8)\\), \\((8,5)\\), \\((4,8)\\) on the grid and press Next step. The trace returns to the start after every change. Vertices at equal height are handled from left to right. If you move a vertex so that three consecutive vertices lie on one line, or so that two edges cross, the partition is refused and the readout says what to fix.',
            ),
            formulaIds: ['monotone-piece-count', 'monotone-type-balance'],
            frames: [frame('monpart-explore-explanation', 'explanation'), frame('monpart-explore-observation', 'observation')],
            observationPrompt: text('Premakni eno oglišče in pred pritiskom na Naslednji korak napovej, katera oglišča bodo razcepna ali zlivna.', 'Move one vertex and, before pressing Next step, predict which vertices will be split or merge vertices.'),
            expectedObservations: [text('Pri začetnem večkotniku je sled na koraku \\(0\\) od \\(14\\); po končanem pometanju je diagonala \\(1\\) in kosa \\(2\\).', 'For the starting polygon the trace is at step \\(0\\) of \\(14\\); after the sweep is done there is \\(1\\) diagonal and \\(2\\) pieces.')],
            scene: monotoneScene('monpart-explore', MONOTONE_EXAMPLE_1, [],
                'Začetni večkotnik; sled je na koraku \\(0\\) od \\(14\\).',
                'The starting polygon; the trace is at step \\(0\\) of \\(14\\).'),
        },
    ],
    sources: [
        {id: 'berg-monotone-partition', citation: 'de Berg, M., Cheong, O., van Kreveld, M., Overmars, M. Computational Geometry: Algorithms and Applications, 3rd ed., Section 3.2 (partitioning a polygon into monotone pieces).'},
        {
            id: 'bezeg-monotone-partition-implementation',
            citation: 'Bezeg source: src/compgeo/sweep/, src/graphs/compgeo/monotonePartitionRun.ts and src/graphs/compgeo/MonotonePartitionGraph.tsx.',
            implementationCorrespondence: 'The trace pops the vertices from top to bottom (smaller x first at equal height), classifies each by its neighbours and interior angle, keeps the left edges with their helpers in the status and adds a diagonal at a split vertex and at a merge or regular vertex whose helper is a merge vertex; a polygon with three consecutive collinear vertices or crossing edges is refused with a message.',
        },
    ],
    edgeCases: [
        text('Oglišča na isti višini obdelamo od leve proti desni; tri zaporedna kolinearna oglišča in neenostavni večkotniki se zavrnejo s sporočilom.', 'Vertices at the same height are handled from left to right; three consecutive collinear vertices and non-simple polygons are refused with a message.'),
        text('Večkotnik v smeri urnega kazalca se pred razdelitvijo obrne; shranjeni večkotnik se ne spremeni.', 'A clockwise polygon is reversed before the partition; the stored polygon does not change.'),
    ],
    unresolvedQuestions: [],
};

/**
 * Monotone-triangulation lesson (docs/specs/sweep-algorithms-lessons.md, C4). It runs the whole method on the C3 polygon: the trace of
 * `MonotoneTriangulationGraph` has 44 steps; index 14 is the end of the partition (the diagonal v2-v5 and two pieces), indices 15 to 28 triangulate
 * piece 1 (v6, v5, v2, v1 from top to bottom) and indices 29 to 43 piece 2. `MonotoneTriangulationLessonActions.host.test.tsx` checks every
 * quoted value against the real graph's readout. Index 15 pops the top vertex v6 of piece 1; index 19 pops v2 with the stack v6, v5; index 21 is
 * the visibility test of v2 against v6 (inside, orientation positive); index 23 adds the diagonal v2-v6; index 28 has finished piece 1 (two
 * triangles); index 43 is the finished triangulation (four triangles, diagonals v2-v5, v2-v6, v3-v5) with the counters 11 and 21.
 */
export const MONOTONE_TRIANGULATION_TRACE_STEPS = {partitionDone: 14, topVertex: 15, predict: 19, test: 21, diagonal: 23, pieceDone: 28, done: 43} as const;

const monotoneTriangulation: GuidedLesson = {
    demonstrationId: 'monotone-triangulation',
    title: text('Triangulacija monotonega večkotnika', 'Triangulating a monotone polygon'),
    summary: text(
        'Monoton večkotnik se s skladom in enim prehodom od zgoraj navzdol razreže na trikotnike; ob koncu primerjamo število izračunov predikatov z rezanjem ušes.',
        'A monotone polygon is cut into triangles by one pass from top to bottom with a stack; at the end we compare the number of predicate evaluations with ear clipping.',
    ),
    prerequisites: [
        text('Lekcija Razdelitev na monotone večkotnike (kosi, diagonale) in lekcija Rezanje ušes in izrek o galeriji (primerjava na koncu).', 'The lesson Partitioning into monotone polygons (pieces, diagonals) and the lesson Ear clipping and the art gallery theorem (the comparison at the end).'),
    ],
    learningGoals: [
        text('Za vsako oglišče kosa poveš, ali je na levi ali desni verigi, in napoveš, ali ga lahko povežemo z vrhom sklada.', 'Say for every vertex of a piece whether it is on the left or the right chain, and predict whether it can be joined to the stack.'),
        text('Slediš skladu in preizkusu orientacije in razložiš, kdaj se doda diagonala.', 'Follow the stack and the orientation test and explain when a diagonal is added.'),
        text('Preveriš, da kos z \\(n\\) oglišči dobi \\(n-2\\) trikotnikov, in ločiš, kaj primerjava majhnih števil pokaže in česa ne dokaže.', 'Check that a piece with \\(n\\) vertices gets \\(n-2\\) triangles, and tell what a comparison of small counts shows and what it does not prove.'),
    ],
    formulaBlocks: [
        {
            id: 'monotone-triangle-count',
            latex: 't=n-2,\\quad d=n-3',
            notation: text(
                '\\(n\\) je število oglišč, \\(t\\) število trikotnikov in \\(d\\) število diagonal triangulacije.',
                '\\(n\\) is the number of vertices, \\(t\\) the number of triangles and \\(d\\) the number of diagonals of the triangulation.',
            ),
            explanation: text(
                'Vsota notranjih kotov večkotnika z \\(n\\) oglišči je \\((n-2)\\pi\\), kot trikotnika pa \\(\\pi\\), zato je trikotnikov \\(n-2\\). Vsak trikotnik ima tri stranice, rob večkotnika pripada enemu trikotniku, diagonala dvema, zato je \\(3t=n+2d\\) in \\(d=n-3\\). Pri kosu s \\(4\\) oglišči je \\(t=2\\), pri celem večkotniku s \\(6\\) oglišči \\(t=4\\) in \\(d=3\\).',
                'The interior angles of a polygon with \\(n\\) vertices add up to \\((n-2)\\pi\\) and a triangle has angle sum \\(\\pi\\), so there are \\(n-2\\) triangles. Every triangle has three sides, a polygon edge belongs to one triangle and a diagonal to two, so \\(3t=n+2d\\) and \\(d=n-3\\). A piece with \\(4\\) vertices has \\(t=2\\); the whole polygon with \\(6\\) vertices has \\(t=4\\) and \\(d=3\\).',
            ),
        },
        {
            id: 'monotone-growth',
            latex: 'T_{\\text{ear}}=O(n^2),\\quad T_{\\text{monotone}}=O(n\\log n)',
            notation: text(
                '\\(T\\) je število izračunov predikatov pri \\(n\\) ogliščih; \\(O(\\cdot)\\) opisuje rast pri velikem \\(n\\).',
                '\\(T\\) is the number of predicate evaluations for \\(n\\) vertices; \\(O(\\cdot)\\) describes the growth for large \\(n\\).',
            ),
            explanation: text(
                'Rezanje ušes mora za vsako oglišče preveriti ušesa, zato je skupaj \\(O(n^2)\\). Pri enem monotonem kosu je po razvrstitvi oglišč po višini dovolj en prehod s skladom, to je \\(O(n)\\); cela metoda z razdelitvijo je \\(O(n\\log n)\\). Število na majhnem večkotniku to ponazori, ne dokaže.',
                'Ear clipping has to test the ears again and again, so it needs \\(O(n^2)\\) in all. For one monotone piece, after the vertices are sorted by height, a single pass with the stack is enough, which is \\(O(n)\\); the whole method with the partition is \\(O(n\\log n)\\). A count on a small polygon illustrates this, it does not prove it.',
            ),
        },
    ],
    workedExamples: [
        {
            id: 'monotone-triangle-count-example',
            title: text('Trikotniki cele triangulacije', 'The triangles of the whole triangulation'),
            calculationLatex: 't=n-2=6-2=4,\\quad d=n-3=6-3=3',
            resultLatex: 't=4,\\ d=3',
            check: text(
                'Izpis pove, da je trikotnikov \\(4=n-2\\) pri \\(n=6\\), in našteje tri diagonale \\(v_2\\)–\\(v_5\\), \\(v_2\\)–\\(v_6\\) in \\(v_3\\)–\\(v_5\\): ena je iz razdelitve, po ena pa iz vsakega kosa.',
                'The readout says there are \\(4=n-2\\) triangles with \\(n=6\\), and lists three diagonals \\(v_2\\)–\\(v_5\\), \\(v_2\\)–\\(v_6\\) and \\(v_3\\)–\\(v_5\\): one from the partition and one from each piece.',
            ),
        },
    ],
    steps: [
        {
            id: 'montri-piece', order: 1,
            title: text('Monoton kos in njegovi verigi', 'A monotone piece and its chains'),
            purpose: text('Spoznati kos, ki ga bomo triangulirali, njegova oglišča od zgoraj navzdol in verigi.', 'Meeting the piece we will triangulate, its vertices from top to bottom and its two chains.'),
            explanation: text(
                'Večkotnik iz prejšnje lekcije ima oglišča \\((0,0)\\), \\((4,3)\\), \\((8,0)\\), \\((12,8)\\), \\((8,5)\\) in \\((4,8)\\). Razdelitev je že dodala diagonalo \\(v_2\\)–\\(v_5\\) in ga razdelila na dva monotona kosa; sled je pri koraku \\(15\\) od \\(43\\), ko se začne triangulacija prvega kosa. Prvi kos je \\((0,0),(4,3),(8,5),(4,8)\\) in ima \\(4\\) oglišča, zato dobi \\(2\\) trikotnika. Oglišča kosa od zgoraj navzdol so \\(v_6\\) (zgornje oglišče), \\(v_5\\) in \\(v_2\\) (desna veriga) ter \\(v_1\\) (spodnje oglišče); levo verigo tvori samo rob od \\(v_6\\) do \\(v_1\\). Sklad je še prazen.',
                'The polygon of the previous lesson has the vertices \\((0,0)\\), \\((4,3)\\), \\((8,0)\\), \\((12,8)\\), \\((8,5)\\) and \\((4,8)\\). The partition has already added the diagonal \\(v_2\\)–\\(v_5\\) and cut it into two monotone pieces; the trace is at step \\(15\\) of \\(43\\), where the triangulation of the first piece begins. The first piece is \\((0,0),(4,3),(8,5),(4,8)\\) and has \\(4\\) vertices, so it gets \\(2\\) triangles. The vertices of the piece from top to bottom are \\(v_6\\) (top vertex), \\(v_5\\) and \\(v_2\\) (right chain) and \\(v_1\\) (bottom vertex); the left chain is just the edge from \\(v_6\\) to \\(v_1\\). The stack is still empty.',
            ),
            formulaIds: ['monotone-triangle-count'],
            frames: [frame('montri-piece-explanation', 'explanation'), frame('montri-piece-observation', 'observation')],
            observationPrompt: text('V seznamu oglišč kosa preberi oznako verige pri vsakem oglišču in preveri, da je vsako oglišče nižje od prejšnjega.', 'In the list of the piece\'s vertices read the chain label of each vertex and check that every vertex is lower than the one before.'),
            expectedObservations: [text('Seznam je \\(v_6\\) zgornje oglišče, \\(v_5\\) desna veriga, \\(v_2\\) desna veriga, \\(v_1\\) spodnje oglišče; sklad je prazen, trikotnikov doslej \\(0\\).', 'The list is \\(v_6\\) top vertex, \\(v_5\\) right chain, \\(v_2\\) right chain, \\(v_1\\) bottom vertex; the stack is empty, triangles so far \\(0\\).')],
            scene: monotoneScene('montri-piece', MONOTONE_EXAMPLE_1, [setTraceStep(MONOTONE_TRIANGULATION_TRACE_STEPS.topVertex)],
                'Sled je na koraku \\(15\\) od \\(43\\): kos \\(1\\) ima \\(4\\) oglišča, obdelano je zgornje oglišče \\(v_6\\), sklad je prazen.',
                'The trace is at step \\(15\\) of \\(43\\): piece \\(1\\) has \\(4\\) vertices, the top vertex \\(v_6\\) is handled, the stack is empty.'),
        },
        {
            id: 'montri-predict', order: 2,
            title: text('Napovej povezavo', 'Predict the connection'),
            purpose: text('Pred razkritjem preizkusa napovedati, ali lahko naslednje oglišče povežemo z oglišči na skladu.', 'Predicting, before the test is revealed, whether the next vertex can be joined to the vertices on the stack.'),
            explanation: text(
                'Sled je pri koraku \\(19\\) od \\(43\\): obdelano je oglišče \\(v_2\\) na desni verigi, na skladu pa sta \\(v_6\\) in \\(v_5\\) (od spodaj navzgor). Preden pritisneš Naslednji korak, napovej: ali lahko \\(v_2\\) povežemo z \\(v_6\\), ne da bi diagonala zapustila kos? Namig: poglej, ali \\(v_5\\) leži na desni ali na levi strani premice od \\(v_2\\) do \\(v_6\\); preizkus orientacije to pove z znakom. Preizkus še ni prikazan.',
                'The trace is at step \\(19\\) of \\(43\\): the vertex \\(v_2\\) on the right chain is handled and the stack holds \\(v_6\\) and \\(v_5\\) (bottom to top). Before you press Next step, predict: can \\(v_2\\) be joined to \\(v_6\\) without the diagonal leaving the piece? Hint: look at whether \\(v_5\\) lies to the right or to the left of the line from \\(v_2\\) to \\(v_6\\); the orientation test tells it by its sign. The test is not shown yet.',
            ),
            formulaIds: ['monotone-triangle-count'],
            frames: [frame('montri-predict-explanation', 'explanation'), frame('montri-predict-observation', 'observation')],
            observationPrompt: text('Zapiši napoved: ali bo diagonala \\(v_2\\)–\\(v_6\\) znotraj kosa?', 'Write down your prediction: will the diagonal \\(v_2\\)–\\(v_6\\) be inside the piece?'),
            expectedObservations: [text('Sklad je \\(v_6\\), \\(v_5\\); preizkus še ni prikazan, trikotnikov doslej \\(0\\).', 'The stack is \\(v_6\\), \\(v_5\\); the test is not shown yet, triangles so far \\(0\\).')],
            scene: monotoneScene('montri-predict', MONOTONE_EXAMPLE_1, [setTraceStep(MONOTONE_TRIANGULATION_TRACE_STEPS.predict)],
                'Sled je na koraku \\(19\\) od \\(43\\): obdelano je oglišče \\(v_2\\) (desna veriga), sklad je \\(v_6\\), \\(v_5\\); preizkus še ni prikazan.',
                'The trace is at step \\(19\\) of \\(43\\): the vertex \\(v_2\\) (right chain) is handled, the stack is \\(v_6\\), \\(v_5\\); the test is not shown yet.'),
        },
        {
            id: 'montri-test', order: 3,
            title: text('Preizkus orientacije', 'The orientation test'),
            purpose: text('Videti, kako sklad in preizkus orientacije odločita, ali diagonala leži znotraj kosa.', 'Seeing how the stack and the orientation test decide whether a diagonal lies inside the piece.'),
            explanation: text(
                'Oglišče \\(v_2\\) je na isti verigi kot vrh sklada \\(v_5\\), zato \\(v_5\\) zapusti sklad (korak \\(20\\)) in preizkusimo, ali lahko \\(v_2\\) povežemo z naslednjim na skladu, to je z \\(v_6\\). Korak \\(21\\) od \\(43\\) prikaže preizkus: diagonala \\(v_2\\)–\\(v_6\\) leži znotraj kosa, ker je orientacija pozitivna. Če bi bila orientacija nič ali negativna, bi diagonala zapustila kos, sklad pa se ne bi več krajšal. Na skladu je zdaj samo \\(v_6\\).',
                'The vertex \\(v_2\\) is on the same chain as the top of the stack \\(v_5\\), so \\(v_5\\) leaves the stack (step \\(20\\)) and we test whether \\(v_2\\) can be joined to the next vertex on the stack, \\(v_6\\). Step \\(21\\) of \\(43\\) shows the test: the diagonal \\(v_2\\)–\\(v_6\\) lies inside the piece, because the orientation is positive. If the orientation were zero or negative, the diagonal would leave the piece and the stack would not be reduced further. Now only \\(v_6\\) is on the stack.',
            ),
            formulaIds: ['monotone-triangle-count'],
            frames: [frame('montri-test-explanation', 'explanation'), frame('montri-test-observation', 'observation')],
            observationPrompt: text('Primerjaj napoved s preizkusom in poglej, katero oglišče je zdaj na skladu.', 'Compare your prediction with the test and look at which vertex is on the stack now.'),
            expectedObservations: [text('Preizkus: oglišči \\(v_2\\) in \\(v_6\\), diagonala je znotraj; sklad je \\(v_6\\).', 'The test: vertices \\(v_2\\) and \\(v_6\\), the diagonal is inside; the stack is \\(v_6\\).')],
            scene: monotoneScene('montri-test', MONOTONE_EXAMPLE_1, [setTraceStep(MONOTONE_TRIANGULATION_TRACE_STEPS.test)],
                'Sled je na koraku \\(21\\) od \\(43\\): preizkus oglišč \\(v_2\\) in \\(v_6\\), diagonala je znotraj, sklad je \\(v_6\\).',
                'The trace is at step \\(21\\) of \\(43\\): the test of the vertices \\(v_2\\) and \\(v_6\\), the diagonal is inside, the stack is \\(v_6\\).'),
        },
        {
            id: 'montri-diagonal', order: 4,
            title: text('Diagonala in prvi trikotnik', 'The diagonal and the first triangle'),
            purpose: text('Videti, da uspešen preizkus doda diagonalo in zaključi trikotnik.', 'Seeing that a successful test adds a diagonal and finishes a triangle.'),
            explanation: text(
                'Ker je preizkus uspel, \\(v_6\\) zapusti sklad in doda se diagonala \\(v_2\\)–\\(v_6\\) (korak \\(23\\) od \\(43\\)). Skupaj z ogliščema \\(v_5\\) in \\(v_6\\) iz prejšnjih korakov je s tem zaključen prvi trikotnik, trikotnikov doslej je \\(1\\). Diagonali sta zdaj dve: \\(v_2\\)–\\(v_5\\) iz razdelitve in nova \\(v_2\\)–\\(v_6\\). Sklad je prazen; naslednja koraka ponovno dasta na sklad \\(v_6\\) in \\(v_2\\).',
                'Because the test succeeded, \\(v_6\\) leaves the stack and the diagonal \\(v_2\\)–\\(v_6\\) is added (step \\(23\\) of \\(43\\)). Together with the vertices \\(v_5\\) and \\(v_6\\) from the earlier steps, this finishes the first triangle, so the triangles so far are \\(1\\). There are now two diagonals: \\(v_2\\)–\\(v_5\\) from the partition and the new \\(v_2\\)–\\(v_6\\). The stack is empty; the next two steps push \\(v_6\\) and \\(v_2\\) again.',
            ),
            formulaIds: ['monotone-triangle-count'],
            frames: [frame('montri-diagonal-explanation', 'explanation'), frame('montri-diagonal-observation', 'observation')],
            observationPrompt: text('Preštej diagonale na grafu in v izpisu in preveri, koliko trikotnikov je zaključenih.', 'Count the diagonals on the graph and in the readout and check how many triangles are finished.'),
            expectedObservations: [text('Diagonali sta \\(2\\): \\(v_2\\)–\\(v_5\\) in \\(v_2\\)–\\(v_6\\); trikotnikov doslej \\(1\\); sklad je prazen.', 'There are \\(2\\) diagonals: \\(v_2\\)–\\(v_5\\) and \\(v_2\\)–\\(v_6\\); triangles so far \\(1\\); the stack is empty.')],
            scene: monotoneScene('montri-diagonal', MONOTONE_EXAMPLE_1, [setTraceStep(MONOTONE_TRIANGULATION_TRACE_STEPS.diagonal)],
                'Sled je na koraku \\(23\\) od \\(43\\): dodana je diagonala \\(v_2\\)–\\(v_6\\), diagonali sta \\(2\\), trikotnikov doslej \\(1\\).',
                'The trace is at step \\(23\\) of \\(43\\): the diagonal \\(v_2\\)–\\(v_6\\) is added, there are \\(2\\) diagonals, triangles so far \\(1\\).'),
        },
        {
            id: 'montri-count', order: 5,
            title: text('Končan kos: n − 2 trikotnikov', 'A finished piece: n − 2 triangles'),
            purpose: text('Preveriti, da ima triangulirani kos \\(n-2\\) trikotnikov.', 'Checking that the triangulated piece has \\(n-2\\) triangles.'),
            explanation: text(
                'Pri koraku \\(28\\) od \\(43\\) je prvi kos končan: sklad je prazen, trikotnikov doslej je \\(2\\), kar je \\(n-2\\) pri \\(n=4\\). Drugi kos \\((4,3),(8,0),(12,8),(8,5)\\) ima prav tako \\(4\\) oglišča; ko pritisneš Naslednji korak, izpis pove „Kos 2: število oglišč 4, število trikotnikov 2“. Vsak kos z \\(n\\) oglišči da \\(n-2\\) trikotnikov, ne glede na to, koliko preizkusov je uspelo ali ne.',
                'At step \\(28\\) of \\(43\\) the first piece is finished: the stack is empty and the triangles so far are \\(2\\), which is \\(n-2\\) for \\(n=4\\). The second piece \\((4,3),(8,0),(12,8),(8,5)\\) also has \\(4\\) vertices; after you press Next step the readout says "Piece 2 has 4 vertices and gets 2 triangles". Every piece with \\(n\\) vertices gives \\(n-2\\) triangles, however many tests succeed or fail.',
            ),
            formulaIds: ['monotone-triangle-count'],
            frames: [frame('montri-count-explanation', 'explanation'), frame('montri-count-observation', 'observation')],
            observationPrompt: text('Preštej trikotnike prvega kosa na grafu in jih primerjaj z \\(n-2\\).', 'Count the triangles of the first piece on the graph and compare them with \\(n-2\\).'),
            expectedObservations: [text('Trikotnikov doslej \\(2\\), diagonali sta \\(2\\), sklad je prazen; kos \\(1\\) ima \\(4\\) oglišča.', 'Triangles so far \\(2\\), there are \\(2\\) diagonals, the stack is empty; piece \\(1\\) has \\(4\\) vertices.')],
            scene: monotoneScene('montri-count', MONOTONE_EXAMPLE_1, [setTraceStep(MONOTONE_TRIANGULATION_TRACE_STEPS.pieceDone)],
                'Sled je na koraku \\(28\\) od \\(43\\): prvi kos je končan, trikotnikov doslej \\(2\\), sklad je prazen.',
                'The trace is at step \\(28\\) of \\(43\\): the first piece is finished, triangles so far \\(2\\), the stack is empty.'),
        },
        {
            id: 'montri-compare', order: 6,
            title: text('Primerjava z rezanjem ušes', 'Comparison with ear clipping'),
            purpose: text('Primerjati število izračunov predikatov obeh metod na istem večkotniku in razumeti, kaj število pove.', 'Comparing the number of predicate evaluations of the two methods on the same polygon and understanding what the count says.'),
            explanation: text(
                'Pri koraku \\(43\\) od \\(43\\) je triangulacija končana: \\(4\\) trikotniki, to je \\(n-2\\) pri \\(n=6\\), in \\(3\\) diagonale \\(v_2\\)–\\(v_5\\), \\(v_2\\)–\\(v_6\\), \\(v_3\\)–\\(v_5\\). Izpis primerja izračune predikatov: monotona metoda (razdelitev in triangulacija) jih potrebuje \\(11\\), rezanje ušes na istem večkotniku (lekcija Rezanje ušes) pa \\(21\\). Pri rezanju ušes narašča število kot \\(O(n^2)\\); pri enem monotonem kosu je po razvrstitvi oglišč \\(O(n)\\), pri celi metodi \\(O(n\\log n)\\). Pazi: število na majhnem večkotniku to ponazori, ne dokaže. Na štirikotniku \\((0,0),(4,3),(8,5),(4,8)\\) samem je razmerje obrnjeno: monotona metoda ima \\(7\\), rezanje ušes \\(3\\). Prednost monotone metode se pokaže šele pri velikem \\(n\\).',
                'At step \\(43\\) of \\(43\\) the triangulation is finished: \\(4\\) triangles, which is \\(n-2\\) for \\(n=6\\), and \\(3\\) diagonals \\(v_2\\)–\\(v_5\\), \\(v_2\\)–\\(v_6\\), \\(v_3\\)–\\(v_5\\). The readout compares predicate evaluations: the monotone method (partition and triangulation) needs \\(11\\), ear clipping on the same polygon (see the lesson Ear clipping) needs \\(21\\). Ear clipping grows like \\(O(n^2)\\); one monotone piece takes \\(O(n)\\) after the vertices are sorted, the whole method \\(O(n\\log n)\\). Take care: a count on a small polygon illustrates this, it does not prove it. On the quadrilateral \\((0,0),(4,3),(8,5),(4,8)\\) alone the order is reversed: the monotone method has \\(7\\) and ear clipping \\(3\\). The advantage of the monotone method shows only for large \\(n\\).',
            ),
            formulaIds: ['monotone-triangle-count', 'monotone-growth'], workedExampleId: 'monotone-triangle-count-example',
            frames: [frame('montri-compare-explanation', 'explanation'), frame('montri-compare-calculation', 'calculation'), frame('montri-compare-observation', 'observation')],
            observationPrompt: text('Preberi obe števili v primerjalni plošči in ju primerjaj z izjavo o rasti.', 'Read both numbers in the comparison panel and compare them with the growth statement.'),
            expectedObservations: [text('Trikotnikov: \\(4=n-2\\) pri \\(n=6\\); diagonale \\(3\\); monotona metoda \\(11\\) izračunov predikatov, rezanje ušes \\(21\\).', 'Triangles: \\(4=n-2\\) with \\(n=6\\); \\(3\\) diagonals; the monotone method \\(11\\) predicate evaluations, ear clipping \\(21\\).')],
            scene: monotoneScene('montri-compare', MONOTONE_EXAMPLE_1, [setTraceStep('end')],
                'Sled je na koraku \\(43\\) od \\(43\\): \\(4\\) trikotniki, \\(3\\) diagonale, monotona metoda \\(11\\) izračunov predikatov, rezanje ušes \\(21\\).',
                'The trace is at step \\(43\\) of \\(43\\): \\(4\\) triangles, \\(3\\) diagonals, the monotone method \\(11\\) predicate evaluations, ear clipping \\(21\\).'),
        },
        {
            id: 'montri-explore', order: 7,
            title: text('Prosto raziskovanje', 'Free exploration'),
            purpose: text('Samostojno preizkusiti triangulacijo na svojem večkotniku.', 'Trying the triangulation on a polygon of your own.'),
            explanation: text(
                'Premikaj oglišča večkotnika \\((0,0)\\), \\((4,3)\\), \\((8,0)\\), \\((12,8)\\), \\((8,5)\\), \\((4,8)\\) po mreži in pritiskaj Naslednji korak. Večkotnik, ki ni monoton, se najprej razdeli na monotone kose (koraki do konca razdelitve), šele nato se vsak kos triangulira; večkotnik, ki je že monoton, ima en kos in nobene diagonale iz razdelitve. Sled se ob vsaki spremembi vrne na začetek. Tri zaporedna kolinearna oglišča in neenostavni večkotniki se zavrnejo s sporočilom.',
                'Move the vertices of the polygon \\((0,0)\\), \\((4,3)\\), \\((8,0)\\), \\((12,8)\\), \\((8,5)\\), \\((4,8)\\) on the grid and press Next step. A polygon that is not monotone is partitioned into monotone pieces first (the steps up to the end of the partition), and only then is every piece triangulated; a polygon that is already monotone has one piece and no diagonal from the partition. The trace returns to the start after every change. Three consecutive collinear vertices and non-simple polygons are refused with a message.',
            ),
            formulaIds: ['monotone-triangle-count', 'monotone-growth'],
            frames: [frame('montri-explore-explanation', 'explanation'), frame('montri-explore-observation', 'observation')],
            observationPrompt: text('Premakni eno oglišče in pred koncem napovej, koliko trikotnikov in diagonal bo imela triangulacija.', 'Move one vertex and, before the end, predict how many triangles and diagonals the triangulation will have.'),
            expectedObservations: [text('Pri začetnem večkotniku je sled na koraku \\(0\\) od \\(43\\); ob koncu je \\(4\\) trikotnikov in \\(3\\) diagonale.', 'For the starting polygon the trace is at step \\(0\\) of \\(43\\); at the end there are \\(4\\) triangles and \\(3\\) diagonals.')],
            scene: monotoneScene('montri-explore', MONOTONE_EXAMPLE_1, [],
                'Začetni večkotnik; sled je na koraku \\(0\\) od \\(43\\), razdelitev je prva.',
                'The starting polygon; the trace is at step \\(0\\) of \\(43\\), the partition comes first.'),
        },
    ],
    sources: [
        {id: 'berg-monotone-triangulation', citation: 'de Berg, M., Cheong, O., van Kreveld, M., Overmars, M. Computational Geometry: Algorithms and Applications, 3rd ed., Section 3.3 (triangulating a monotone polygon).'},
        {
            id: 'bezeg-monotone-triangulation-implementation',
            citation: 'Bezeg source: src/compgeo/sweep/monotoneTriangulation.ts, src/graphs/compgeo/monotoneTriangulationRun.ts and src/graphs/compgeo/MonotoneTriangulationGraph.tsx.',
            implementationCorrespondence: 'The trace runs the partition of the monotone-partition lesson, then for every piece the stack algorithm: the vertices of a piece are handled from top to bottom, a vertex on the chain opposite to the top of the stack is joined to every stack vertex, a vertex on the same chain is joined to the stack vertices for which the orientation test is positive. Every test is one exact orientation evaluation, counted as a predicate; the ear-clipping count is the one of the ear-clipping kernel on the same polygon.',
        },
    ],
    edgeCases: [
        text('Večkotnik, ki je že monoton, ima en kos in razdelitev ne doda diagonale; kos z \\(n\\) oglišči da vedno \\(n-2\\) trikotnikov.', 'A polygon that is already monotone has one piece and the partition adds no diagonal; a piece with \\(n\\) vertices always gives \\(n-2\\) triangles.'),
        text('Tri zaporedna kolinearna oglišča in neenostavni večkotniki se zavrnejo s sporočilom; večkotnik v smeri urnega kazalca se pred obdelavo obrne.', 'Three consecutive collinear vertices and non-simple polygons are refused with a message; a clockwise polygon is reversed before the processing.'),
    ],
    unresolvedQuestions: [],
};

export const compgeoGuidedLessons: readonly GuidedLesson[] = [orientation, polygonArea, convexHull, earClipping, pointSetTriangulation, delaunay, voronoi, voronoiDegenerate, intervalSweep, segmentIntersections, monotonePartition, monotoneTriangulation];
