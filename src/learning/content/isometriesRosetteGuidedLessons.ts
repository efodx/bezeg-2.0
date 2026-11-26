/**
 * Guided lesson L4 of the isometries family (docs/specs/isometries-lessons.md, batch C): rosettes, on `isometries` (IsometryGraph).
 * Scenes use only the `isometry` actions `set-mode` (rosette) and `set-rosette` (the count n, the mirrors switch and the point of the figure), and every scene starts from
 * the Demonstration default and names n, the mirrors switch and the point. The centre of the rosette is the origin. The orders and the numbers of distinct images the text
 * quotes are exact integers read from the graph's rows; the coordinates of the images are computed approximations.
 */
import type {LessonAction} from '../model';
import type {FormulaBlock, GuidedLesson, GuidedLessonFrame, GuidedLessonStep, LessonScene, LocalizedText} from './guidedLessons';
import {frameDeclarer, type FrameDeclaration} from '../../graphs/base/declare/graphDeclaration';
import type {IsometryIds} from '../../graphs/isometry/IsometryGraph';

const text = (sl: string, en: string): LocalizedText => ({sl, en});
const frame = (id: string, kind: GuidedLessonFrame['kind'], declare?: FrameDeclaration): GuidedLessonFrame => ({id, kind, ...(declare ? {declare} : {})});
const f = frameDeclarer<IsometryIds>();

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
    /** What the observation frame highlights and asks the learner to use (task 08). */
    readonly declare?: FrameDeclaration;
}

const step = ({declare, ...content}: StepContent): GuidedLessonStep => ({
    ...content,
    frames: [frame(`${content.id}-explanation`, 'explanation'), frame(`${content.id}-observation`, 'observation', declare)],
});

/** What a scene sets: the number of rotations n, whether the mirrors are on, and the point of the figure (grid coordinates). */
export interface RosetteSceneSpec {
    readonly n: number;
    readonly mirrors: boolean;
    readonly point: readonly [x: number, y: number];
}

/** The actions of a scene: the Demonstration default, `set-mode` rosette, then `set-rosette` naming n, the mirrors switch and the point. */
export const rosetteSceneActions = (id: string, spec: RosetteSceneSpec): LessonAction[] => [
    {kind: 'prepared-scene', sceneId: id, source: 'demonstration-default'},
    {kind: 'isometry', operation: 'set-mode', mode: 'rosette'},
    {kind: 'isometry', operation: 'set-rosette', n: spec.n, mirrors: spec.mirrors, point: {x: spec.point[0], y: spec.point[1]}},
];

const scene = (id: string, spec: RosetteSceneSpec, sl: string, en: string): LessonScene =>
    ({id, basedOn: 'demonstration-default', actions: rosetteSceneActions(id, spec), expectedState: text(sl, en)});

// ---- Numbers the text quotes (the tests read each from the graph's rows) -------------------------------------------------------------

/** Step 1 opens at n = 4 and the learner sets n = 5; the point (4, 1) is generic for every n of the lesson. */
export const L4_OPEN_N = 4;
export const L4_TARGET_N = 5;
export const L4_POINT: readonly [number, number] = [4, 1];
/** C5 has 5 motions and D5 has 10 (n and 2n); the point (4, 1) has as many distinct images as there are motions. */
export const L4_ORDER_CYCLIC = 5;
export const L4_ORDER_DIHEDRAL = 10;
/** Step 3: the point (4, 0) on the x axis, a mirror of D5, has 5 distinct images from 10 motions; the centre (0, 0) has one. */
export const L4_MIRROR_POINT: readonly [number, number] = [4, 0];
export const L4_DISTINCT_ON_MIRROR = 5;
export const L4_CENTRE_POINT: readonly [number, number] = [0, 0];
export const L4_DISTINCT_AT_CENTRE = 1;
/** Step 4 opens at n = 6 without mirrors at (3, 2); the free suggestions quote n = 4 with a point on a mirror, (4, 0) or (4, 4): 4 distinct images from 8 motions. */
export const L4_FREE_N = 6;
export const L4_FREE_POINT: readonly [number, number] = [3, 2];
export const L4_FREE_MIRROR_N = 4;
export const L4_FREE_MIRROR_POINTS: readonly (readonly [number, number])[] = [[4, 0], [4, 4]];
export const L4_FREE_MIRROR_ORDER = 8;
export const L4_FREE_MIRROR_DISTINCT = 4;
/** The free suggestion n = 12 with mirrors at (3, 2): 24 motions and 24 distinct images. */
export const L4_FREE_BIG_N = 12;
export const L4_FREE_BIG_ORDER = 24;

const formulas: readonly FormulaBlock[] = [
    {
        id: 'rosette-rotation',
        latex: '\\rho_{j\\varphi}(P)=O+R_{j\\varphi}\\,(P-O),\\qquad \\varphi=\\frac{360^\\circ}{n}',
        notation: text(
            '\\(O\\) je središče rozete (izhodišče), \\(P\\) točka lika, \\(R_{j\\varphi}\\) matrika vrtenja za kot \\(j\\varphi\\), \\(j\\) celo število in \\(\\rho_{j\\varphi}(P)\\) slika točke \\(P\\).',
            '\\(O\\) is the centre of the rosette (the origin), \\(P\\) a point of the figure, \\(R_{j\\varphi}\\) the rotation matrix for the angle \\(j\\varphi\\), \\(j\\) an integer and \\(\\rho_{j\\varphi}(P)\\) the image of the point \\(P\\).',
        ),
        explanation: text(
            'Definicija: rozeta z \\(n\\) vrteži se ujame sama s seboj ob vrtenjih okoli središča za večkratnike kota \\(\\varphi=\\tfrac{360^\\circ}{n}\\); ta gibanja tvorijo ciklično grupo \\(C_n\\). Identiteta (\\(j=0\\)) je tudi gibanje.',
            'Definition: a rosette with \\(n\\) rotations maps onto itself under the rotations about the centre by multiples of the angle \\(\\varphi=\\tfrac{360^\\circ}{n}\\); these motions form the cyclic group \\(C_n\\). The identity (\\(j=0\\)) is also a motion.',
        ),
    },
    {
        id: 'rosette-mirrored',
        latex: '\\sigma_m\\circ\\rho_{j\\varphi}',
        notation: text(
            '\\(\\sigma_m\\) je zrcaljenje v enem od zrcal \\(m\\) skozi središče, \\(\\rho_{j\\varphi}\\) vrtež iz prejšnje formule; najprej deluje vrtež.',
            '\\(\\sigma_m\\) is the reflection in one of the mirrors \\(m\\) through the centre and \\(\\rho_{j\\varphi}\\) the rotation of the previous formula; the rotation acts first.',
        ),
        explanation: text(
            'Definicija: če ima rozeta tudi zrcala skozi središče, so njena gibanja vrteži \\(\\rho_{j\\varphi}\\) in zrcaljenja \\(\\sigma_m\\circ\\rho_{j\\varphi}\\); skupaj tvorijo diedrsko grupo \\(D_n\\).',
            'Definition: if the rosette also has mirrors through the centre, its motions are the rotations \\(\\rho_{j\\varphi}\\) and the reflections \\(\\sigma_m\\circ\\rho_{j\\varphi}\\); together they form the dihedral group \\(D_n\\).',
        ),
    },
];

const steps: readonly GuidedLessonStep[] = [
    step({
        id: 'l4-rotations', order: 1,
        declare: f({highlight: ['group', 'order', 'distinct'], uses: ['isometry-n']}),
        title: text('Vrtenje okoli središča', 'Rotating about the centre'),
        purpose: text('Napovedati število gibanj in slik pri rozeti brez zrcal, preden ga odčitamo.', 'Predicting the numbers of motions and images of a rosette without mirrors before reading them.'),
        explanation: text(
            'Rozeta je lik s središčem, ki se ob vrtenjih okoli središča za večkratnike kota \\(\\varphi=\\tfrac{360^\\circ}{n}\\) ujame sam s seboj. Središče je izhodišče \\((0,0)\\). Na grafu je rozeta z \\(n=4\\) in točko lika \\((4,1)\\), brez zrcal; slike točke so njene podobe pri gibanjih rozete. Preden spremeniš \\(n\\), napovej za \\(n=5\\) (vrtenje za \\(72^\\circ\\)): koliko gibanj ima rozeta (vrtež za \\(0^\\circ\\) je tudi gibanje) in koliko različnih slik ima točka, vsakič z razlogom.',
            'A rosette is a figure with a centre that maps onto itself under the rotations about the centre by multiples of the angle \\(\\varphi=\\tfrac{360^\\circ}{n}\\). The centre is the origin \\((0,0)\\). The graph shows a rosette with \\(n=4\\) and the point of the figure \\((4,1)\\), without mirrors; the images of the point are its copies under the motions of the rosette. Before you change \\(n\\), predict for \\(n=5\\) (a rotation by \\(72^\\circ\\)): how many motions the rosette has (the rotation by \\(0^\\circ\\) is also a motion) and how many distinct images the point has, each with a reason.',
        ),
        formulaIds: ['rosette-rotation'],
        observationPrompt: text(
            'Zapiši napoved z razlogom. Nato nastavi Število vrtežev n na 5 in primerjaj z besedilom v odčitkih ter z vrsticami Grupa, Red grupe (število gibanj) in Število različnih slik točke (izračunano).',
            'Write down your prediction with the reason. Then set Number of rotations n to 5 and compare with the text in the readouts and with the rows Group, Order of the group (number of motions) and Distinct images of the point (computed).',
        ),
        expectedObservations: [
            text(
                'Pri \\(n=5\\) ima rozeta 5 gibanj in točka 5 različnih slik; grupa je ciklična grupa \\(C_5\\). Slike so vrtenja točke \\((4,1)\\) za \\(0^\\circ\\), \\(72^\\circ\\), \\(144^\\circ\\), \\(216^\\circ\\) in \\(288^\\circ\\) okoli središča: ležijo na isti krožnici okoli središča in imajo različne kote, zato se nobeni dve ne ujemata. Slika 2 je približno \\((0{,}285;\\,4{,}1132)\\): koordinate slik so izračunani približki, števili gibanj in slik pa sta natančni.',
                'For \\(n=5\\) the rosette has 5 motions and the point has 5 distinct images; the group is the cyclic group \\(C_5\\). The images are the rotations of the point \\((4,1)\\) by \\(0^\\circ\\), \\(72^\\circ\\), \\(144^\\circ\\), \\(216^\\circ\\) and \\(288^\\circ\\) about the centre: they lie on the same circle about the centre at different angles, so no two coincide. Image 2 is about \\((0.285,\\,4.1132)\\): the coordinates of the images are computed approximations, while the numbers of motions and images are exact.',
            ),
        ],
        scene: scene('l4-rotations-scene', {n: L4_OPEN_N, mirrors: false, point: L4_POINT},
            'Rozeta z \\(n=4\\) brez zrcal, točka \\((4,1)\\); ciklična grupa \\(C_4\\), 4 gibanja, 4 različne slike.',
            'A rosette with \\(n=4\\) without mirrors, point \\((4,1)\\); the cyclic group \\(C_4\\), 4 motions, 4 distinct images.'),
    }),
    step({
        id: 'l4-mirrors', order: 2,
        declare: f({highlight: ['group', 'order'], uses: ['rosette-mirrors']}),
        title: text('Rozeta z zrcali', 'A rosette with mirrors'),
        purpose: text('Napovedati število gibanj in navadnih ter zrcaljenih slik, ko rozeta dobi zrcala.', 'Predicting the number of motions and of direct and mirrored images when the rosette gets mirrors.'),
        explanation: text(
            'Rozeta ima zdaj \\(n=5\\), točko \\((4,1)\\) in nima zrcal. Če ima rozeta še zrcala skozi središče, so med njenimi gibanji tudi zrcaljenja, vsa gibanja skupaj pa tvorijo diedrsko grupo \\(D_n\\). Slike, ki jih da vrtež, graf nariše s krožci, zrcaljene slike pa z rombi. Preden vklopiš zrcala, napovej: koliko gibanj ima rozeta z zrcali in koliko je med slikami točke navadnih (krožcev) in koliko zrcaljenih (rombov).',
            'The rosette now has \\(n=5\\), the point \\((4,1)\\) and no mirrors. If the rosette also has mirrors through the centre, its motions include reflections, and all the motions together form the dihedral group \\(D_n\\). The graph draws the images made by a rotation as circles and the reflected images as diamonds. Before you switch the mirrors on, predict: how many motions the rosette has with mirrors, and how many of the images of the point are direct (circles) and how many reflected (diamonds).',
        ),
        formulaIds: ['rosette-mirrored'],
        observationPrompt: text(
            'Zapiši napoved z razlogom. Nato vklopi stikalo Zrcala (diedrska grupa) in primerjaj z besedilom v odčitkih, z vrsticama Grupa in Red grupe (število gibanj) ter s krožci in rombi na grafu.',
            'Write down your prediction with the reason. Then switch on Mirrors (dihedral group) and compare with the text in the readouts, with the rows Group and Order of the group (number of motions), and with the circles and diamonds on the graph.',
        ),
        expectedObservations: [
            text(
                'Z zrcali ima rozeta 10 gibanj: 5 vrtežev in 5 zrcaljenj; grupa je diedrska grupa \\(D_5\\), točka ima 10 različnih slik. Vrtež ohrani orientacijo, zrcaljenje jo obrne, zato je 5 slik navadnih (krožci) in 5 zrcaljenih (rombi). Okoli središča se krožci in rombi izmenjujejo.',
                'With mirrors the rosette has 10 motions: 5 rotations and 5 reflections; the group is the dihedral group \\(D_5\\) and the point has 10 distinct images. A rotation keeps the orientation and a reflection reverses it, so 5 images are direct (circles) and 5 reflected (diamonds). Around the centre the circles and diamonds alternate.',
            ),
        ],
        scene: scene('l4-mirrors-scene', {n: L4_TARGET_N, mirrors: false, point: L4_POINT},
            'Rozeta z \\(n=5\\) brez zrcal, točka \\((4,1)\\); ciklična grupa \\(C_5\\), 5 gibanj, 5 različnih slik.',
            'A rosette with \\(n=5\\) without mirrors, point \\((4,1)\\); the cyclic group \\(C_5\\), 5 motions, 5 distinct images.'),
    }),
    step({
        id: 'l4-on-mirror', order: 3,
        declare: f({highlight: ['distinct']}),
        title: text('Točka na zrcalu in središče', 'A point on a mirror and the centre'),
        purpose: text('Napovedati, koliko različnih slik ima točka na zrcalu in točka v središču, in v središču.', 'Predicting how many distinct images a point on a mirror and the point at the centre have.'),
        explanation: text(
            'Rozeta ima \\(n=5\\) in zrcala; točka \\((4,1)\\) ne leži na nobenem zrcalu. Zrcala so narisana na grafu; eno od njih je os \\(x\\). Premakni točko lika na os \\(x\\) v \\((4,0)\\) in nato v središče \\((0,0)\\). Preden premakneš točko, napovej za vsako od obeh točk, koliko različnih slik ima, in zakaj.',
            'The rosette has \\(n=5\\) and mirrors; the point \\((4,1)\\) lies on no mirror. The mirrors are drawn on the graph; one of them is the \\(x\\) axis. Move the point of the figure onto the \\(x\\) axis to \\((4,0)\\) and then to the centre \\((0,0)\\). Before you move the point, predict for each of the two points how many distinct images it has, and why.',
        ),
        formulaIds: [],
        observationPrompt: text(
            'Zapiši obe napovedi z razlogoma. Nato v skupini Točka lika nastavi \\(x=4\\) in \\(y=0\\) (točko lahko tudi povlečeš) in primerjaj z besedilom v odčitkih ter z vrstico Število različnih slik točke (izračunano). Nato nastavi še \\(x=0\\) in \\(y=0\\) ter primerjaj znova.',
            'Write down both predictions with the reasons. Then in the group Point of the figure set \\(x=4\\) and \\(y=0\\) (you can also drag the point) and compare with the text in the readouts and with the row Distinct images of the point (computed). Then set \\(x=0\\) and \\(y=0\\) and compare again.',
        ),
        expectedObservations: [
            text(
                'V \\((4,0)\\) je različnih slik 5 od 10 gibanj: zrcaljenje v osi \\(x\\) pusti točko na mestu, zato vsaki sliki pripadata dve gibanji in se slike združijo v pare (Slika 2 je enaka Sliki 1). V središču \\((0,0)\\) vsa gibanja pustijo točko na mestu, zato je slika ena sama; red grupe je še vedno 10.',
                'At \\((4,0)\\) there are 5 distinct images from 10 motions: the reflection in the \\(x\\) axis leaves the point where it is, so two motions belong to each image and the images join in pairs (Image 2 equals Image 1). At the centre \\((0,0)\\) every motion leaves the point where it is, so there is a single image; the order of the group is still 10.',
            ),
        ],
        scene: scene('l4-on-mirror-scene', {n: L4_TARGET_N, mirrors: true, point: L4_POINT},
            'Rozeta z \\(n=5\\) in zrcali, točka \\((4,1)\\); diedrska grupa \\(D_5\\), 10 gibanj, 10 različnih slik.',
            'A rosette with \\(n=5\\) and mirrors, point \\((4,1)\\); the dihedral group \\(D_5\\), 10 motions, 10 distinct images.'),
    }),
    step({
        id: 'l4-free', order: 4,
        declare: f({highlight: ['order', 'distinct'], uses: ['isometry-n', 'rosette-mirrors']}),
        title: text('Prosto raziskovanje', 'Try for yourself'),
        purpose: text('Sami primerjati red grupe s številom različnih slik pri različnih \\(n\\) in legah točke.', 'Comparing the order of the group with the number of distinct images for different values of \\(n\\) and positions of the point.'),
        explanation: text(
            'Zdaj po svoje izbiraj število vrtežev, zrcala in točko lika. Poskusi na primer \\(n=12\\) z zrcali ali \\(n=1\\), pa točko na zrcalu pri \\(n=4\\) (na primer \\((4,0)\\) ali \\((4,4)\\)).',
            'Now choose the number of rotations, the mirrors and the point of the figure yourself. Try for example \\(n=12\\) with mirrors or \\(n=1\\), and a point on a mirror for \\(n=4\\) (for example \\((4,0)\\) or \\((4,4)\\)).',
        ),
        formulaIds: ['rosette-rotation', 'rosette-mirrored'],
        observationPrompt: text(
            'Poišči, kdaj je število različnih slik manjše od reda grupe in koliko je takrat; za vsak poskus zapiši red grupe in število različnih slik.',
            'Find when the number of distinct images is smaller than the order of the group and how many there are then; for each trial write down the order of the group and the number of distinct images.',
        ),
        expectedObservations: [
            text(
                'Pri točki, ki ni središče in ne leži na zrcalu, je različnih slik toliko kot gibanj (pri \\(n=12\\) z zrcali v \\((3,2)\\): 24 od 24). Točka, ki ni središče, leži na kvečjemu enem zrcalu, zato jo pusti na mestu le eno zrcaljenje poleg identitete: pri \\(n=4\\) z zrcali v \\((4,0)\\) in \\((4,4)\\) je slik 4 od 8 gibanj, v središču pa 1.',
                'For a point that is not the centre and lies on no mirror, there are as many distinct images as motions (for \\(n=12\\) with mirrors at \\((3,2)\\): 24 of 24). A point that is not the centre lies on at most one mirror, so apart from the identity only one reflection leaves it where it is: for \\(n=4\\) with mirrors at \\((4,0)\\) and \\((4,4)\\) there are 4 images from 8 motions, and at the centre 1.',
            ),
        ],
        scene: scene('l4-free-scene', {n: L4_FREE_N, mirrors: false, point: L4_FREE_POINT},
            'Rozeta z \\(n=6\\) brez zrcal, točka \\((3,2)\\); ciklična grupa \\(C_6\\), 6 gibanj, 6 različnih slik.',
            'A rosette with \\(n=6\\) without mirrors, point \\((3,2)\\); the cyclic group \\(C_6\\), 6 motions, 6 distinct images.'),
    }),
];

export const rosetteLesson: GuidedLesson = {
    demonstrationId: 'isometries',
    title: text('Rozete', 'Rosettes'),
    summary: text(
        'Simetrije lika okoli središča tvorijo ciklično grupo \\(C_n\\), če so to le vrteži, ali diedrsko grupo \\(D_n\\), če so zraven še zrcaljenja. Gibanja štejemo s slikami točke lika.',
        'The symmetries of a figure about a centre form a cyclic group \\(C_n\\) if they are only rotations, or a dihedral group \\(D_n\\) if reflections are included. The motions are counted by the images of a point of the figure.',
    ),
    prerequisites: [text('Lekcije o dveh zrcalih in o razvrščanju gibanj ter orientacija.', 'The lessons on two mirrors and on classifying motions, and orientation.')],
    learningGoals: [
        text('Napoveš število gibanj rozete brez zrcal in z zrcali iz števila vrtežev \\(n\\).', 'Predict the number of motions of a rosette without and with mirrors from the number of rotations \\(n\\).'),
        text('Veš, da so slike točke pri zrcalih navadne ali zrcaljene, in koliko jih je vsake vrste.', 'Know that with mirrors the images of a point are direct or reflected, and how many there are of each kind.'),
        text('Veš, da ima točka na zrcalu manj različnih slik kot je gibanj, točka v središču pa le eno.', 'Know that a point on a mirror has fewer distinct images than there are motions, and the point at the centre has only one.'),
    ],
    formulaBlocks: formulas,
    workedExamples: [],
    steps,
    sources: [
        {
            id: 'bezeg-rosette-implementation',
            citation: 'Bezeg source: src/isometry/rosette.ts, src/isometry/isometryModel.ts and src/graphs/isometry/IsometryGraph.tsx.',
            implementationCorrespondence: 'A scene sets the graph\'s mode to rosette, the number of rotations n, the mirrors switch and the grid point of the figure; the text quotes only integers read from those scenes (orders and counts of distinct images) and plain arithmetic. The coordinates of the images are computed approximations.',
        },
    ],
    edgeCases: [
        text('Pri \\(n=1\\) je ciklična grupa \\(C_1\\) sama identiteta, z zrcalom pa je diedrska grupa \\(D_1\\) z dvema gibanjema.', 'For \\(n=1\\) the cyclic group \\(C_1\\) is the identity alone, and with a mirror the dihedral group \\(D_1\\) has two motions.'),
        text('Središče rozete pustijo na mestu vsa gibanja, zato ima eno sliko.', 'Every motion leaves the centre of the rosette where it is, so it has one image.'),
        text('Koordinate slik so izračunani približki; število gibanj in različnih slik sta natančni.', 'The coordinates of the images are computed approximations; the numbers of motions and of distinct images are exact.'),
    ],
    unresolvedQuestions: [],
};
