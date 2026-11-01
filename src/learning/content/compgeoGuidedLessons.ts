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
const overlay = (name: 'grid' | 'turn' | 'fan' | 'lattice' | 'values', visible: boolean): LessonAction => ({kind: 'point-set', operation: 'set-overlay', overlay: name, visible});
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

export const compgeoGuidedLessons: readonly GuidedLesson[] = [orientation, polygonArea];
