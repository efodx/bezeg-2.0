/**
 * Guided lessons of the solids family, batch A (docs/specs/solids-volumes-lessons.md): SV1, plane sections of the cube, and SV2, plane sections of prisms and pyramids, both on `solids`
 * (SolidsGraph, section mode). The scenes use only the `solids` actions the graph registers (`set-solid`, `set-mode`, `set-plane`, `set-camera`) and every scene starts from the
 * Demonstration default and names what it sets. The plane is n . x = d: the normal has integer components from -4 to 4 and the offset d moves in steps of 1/4 (the stored offset is 4 d).
 * The graph's cube is the unit cube (edge 1), the prism is a 2 x 2 square of height 3 and the pyramid has a 4 x 4 base and height 4 with the base at z = -2 and the apex at (0, 0, 2), so the
 * spec's numbers hold unchanged. Every number the text quotes is a readout of the graph for that scene (probed, docs/reviews/feature-streams/families-prep/notes/f3-sol-a.md) or an
 * exact value computed in the same step. The shapes the learner sees are illustrations of the planes tried; the arguments are SV1 step 5 (six faces) and SV2 step 3 (similar triangles
 * in the drawn axial section).
 */
import type {LessonAction} from '../model';
import type {FormulaBlock, GuidedLesson, GuidedLessonFrame, GuidedLessonStep, LessonScene, LocalizedText, WorkedExample} from './guidedLessons';

/** The lesson text is written once with decimal commas in math (`{,}`); the English text gets decimal points. */
const text = (sl: string, en: string): LocalizedText => ({sl, en: en.replace(/\{,\}/g, '.')});
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

/** What a section scene sets on top of the Demonstration default: the solid, the normal, the stored offset (4 d) and optionally a camera preset. */
export interface SolidsSceneSpec {
    readonly solid: 'cube' | 'square-prism' | 'square-pyramid';
    readonly normal: readonly [number, number, number];
    readonly offset: number;
    readonly view?: 'front' | 'top' | 'side' | 'isometric';
}

/** The actions of a section scene: the Demonstration default, then solid, mode, plane and camera preset. */
export const solidsSceneActions = (id: string, spec: SolidsSceneSpec): LessonAction[] => [
    {kind: 'prepared-scene', sceneId: id, source: 'demonstration-default'},
    {kind: 'solids', operation: 'set-solid', solid: spec.solid},
    {kind: 'solids', operation: 'set-mode', mode: 'section'},
    {kind: 'solids', operation: 'set-plane', normal: spec.normal, offset: spec.offset},
    ...(spec.view !== undefined ? [{kind: 'solids', operation: 'set-camera', view: spec.view} as const] : []),
];

const solidsScene = (id: string, spec: SolidsSceneSpec, sl: string, en: string): LessonScene =>
    ({id, basedOn: 'demonstration-default', actions: solidsSceneActions(id, spec), expectedState: text(sl, en)});

/** SV1 (the cube). The stored offset is 4 d: z = 0,5 is 2, x + y = 1 is 4, x + y + z = 1,25 is 5, x + y + z = 1,5 is 6, 2x + 3y + 4z = 4 is 16. */
export const SV1_PARALLEL: SolidsSceneSpec = {solid: 'cube', normal: [0, 0, 1], offset: 2};
export const SV1_TILT: SolidsSceneSpec = {solid: 'cube', normal: [1, 1, 0], offset: 4};
export const SV1_DIAGONAL: SolidsSceneSpec = {solid: 'cube', normal: [1, 1, 1], offset: 2};
export const SV1_CORNERS: SolidsSceneSpec = {solid: 'cube', normal: [1, 1, 1], offset: 5};
export const SV1_ARGUMENT: SolidsSceneSpec = {solid: 'cube', normal: [2, 3, 4], offset: 16};
export const SV1_FREE: SolidsSceneSpec = {solid: 'cube', normal: [1, 1, 1], offset: 6};
/** SV2 (the prism and the pyramid). The pyramid base is at z = -2, so the plane z = d is d + 2 above it; the apex is at d = 2. */
export const SV2_PRISM: SolidsSceneSpec = {solid: 'square-prism', normal: [0, 0, 1], offset: 0};
export const SV2_PYRAMID: SolidsSceneSpec = {solid: 'square-pyramid', normal: [0, 0, 1], offset: -4};
export const SV2_SIMILAR: SolidsSceneSpec = {solid: 'square-pyramid', normal: [0, 0, 1], offset: 0, view: 'front'};
export const SV2_APEX: SolidsSceneSpec = {solid: 'square-pyramid', normal: [1, 0, 0], offset: 0};
export const SV2_PENTAGON: SolidsSceneSpec = {solid: 'square-pyramid', normal: [1, 1, 1], offset: 0};
export const SV2_FREE: SolidsSceneSpec = {solid: 'square-pyramid', normal: [1, 1, 1], offset: -4};

// ---- Formulas and worked examples --------------------------------------------------------------------------------------------------

const formulas: readonly FormulaBlock[] = [
    {
        id: 'solids-plane',
        latex: 'n_{1}x+n_{2}y+n_{3}z=d',
        notation: text(
            '\\(n_1\\), \\(n_2\\), \\(n_3\\) so celoštevilske komponente normale (od \\(-4\\) do \\(4\\), ne vse ničelne), \\(d\\) je odmik ravnine (korak \\(0{,}25\\)).',
            '\\(n_1\\), \\(n_2\\), \\(n_3\\) are the integer components of the normal (from \\(-4\\) to \\(4\\), not all zero) and \\(d\\) is the offset of the plane (step \\(0{,}25\\)).',
        ),
        explanation: text(
            'Ravnina je množica točk \\((x,y,z)\\), ki izpolnjujejo to enačbo. Presek telesa z ravnino je mnogokotnik, katerega oglišča so točke, kjer ravnina seka robove telesa ali gre skozi njegova oglišča.',
            'The plane is the set of points \\((x,y,z)\\) that satisfy this equation. The section of a solid by the plane is a polygon whose corners are the points where the plane meets the edges of the solid or passes through its vertices.',
        ),
    },
    {
        id: 'solids-similar',
        latex: 'A(h)=\\left(\\frac{H-h}{H}\\right)^{2}B',
        notation: text(
            '\\(B\\) je ploščina osnovne ploskve piramide, \\(H\\) njena višina, \\(h\\) višina vodoravne ravnine nad osnovno ploskvijo in \\(A(h)\\) ploščina preseka.',
            '\\(B\\) is the area of the base of the pyramid, \\(H\\) its height, \\(h\\) the height of the horizontal plane above the base and \\(A(h)\\) the area of the section.',
        ),
        explanation: text(
            'Argument: osni presek piramide je trikotnik z osnovnico \\(a\\) in višino \\(H\\); vodoravna ravnina ga seka v daljici, vzporedni osnovnici. Daljica odreže podoben trikotnik z višino \\(H-h\\), zato je njena dolžina \\(a\\,\\frac{H-h}{H}\\). Presek je kvadrat s to stranico, njegova ploščina je kvadrat dolžine, torej \\(\\left(\\frac{H-h}{H}\\right)^{2}a^{2}\\), in \\(a^{2}=B\\).',
            'Argument: the axial section of the pyramid is a triangle with base \\(a\\) and height \\(H\\); the horizontal plane meets it in a segment parallel to the base. The segment cuts off a similar triangle of height \\(H-h\\), so its length is \\(a\\,\\frac{H-h}{H}\\). The section is a square with this side, its area is the square of the length, that is \\(\\left(\\frac{H-h}{H}\\right)^{2}a^{2}\\), and \\(a^{2}=B\\).',
        ),
    },
];

const examples: readonly WorkedExample[] = [
    {
        id: 'sv1-hexagon',
        title: text('Pravilni šestkotnik pri \\(x+y+z=1{,}5\\)', 'The regular hexagon at \\(x+y+z=1{,}5\\)'),
        calculationLatex: 's=\\sqrt{\\left(\\frac12\\right)^{2}+\\left(\\frac12\\right)^{2}}=\\frac{\\sqrt2}{2},\\quad A=\\frac{3\\sqrt3}{2}s^{2}=\\frac{3\\sqrt3}{2}\\cdot\\frac12',
        resultLatex: 'A=\\frac{3\\sqrt3}{4}\\approx1{,}29904',
        check: text(
            'Šest presečišč so razpolovišča šestih robov: na robu, kjer sta dve koordinati \\(0\\) ali \\(1\\), je tretja \\(0{,}5\\). Sosednji razpolovišči sta oddaljeni \\(\\frac{\\sqrt2}{2}\\), zato je šestkotnik pravilen. Odčitek Ploščina preseka kaže \\(1{,}29904\\), kar se ujema z vrednostjo, zaokroženo na pet decimalk.',
            'The six cut points are the midpoints of six edges: on an edge where two coordinates are \\(0\\) or \\(1\\), the third is \\(0{,}5\\). Adjacent midpoints are \\(\\frac{\\sqrt2}{2}\\) apart, so the hexagon is regular. The readout Area of the section shows \\(1{,}29904\\), which agrees with the value rounded to five decimals.',
        ),
    },
    {
        id: 'sv2-scale',
        title: text('Presek piramide na višini \\(1\\)', 'The section of the pyramid at height \\(1\\)'),
        calculationLatex: 'A(1)=\\left(\\frac{4-1}{4}\\right)^{2}\\cdot16=\\left(\\frac34\\right)^{2}\\cdot16',
        resultLatex: 'A(1)=\\frac{9}{16}\\cdot16=9',
        check: text(
            'Odčitek Ploščina preseka pri odmiku \\(-1\\) kaže \\(9\\). Stranica kvadrata je \\(3\\), torej tri četrtine osnovnice.',
            'The readout Area of the section at offset \\(-1\\) shows \\(9\\). The side of the square is \\(3\\), that is three quarters of the base.',
        ),
    },
];

// ---- SV1 ---------------------------------------------------------------------------------------------------------------------------

const sv1Steps: readonly GuidedLessonStep[] = [
    step({
        id: 'sv1-parallel', order: 1,
        title: text('Ravnina, vzporedna ploskvi', 'A plane parallel to a face'),
        purpose: text('Napovedati lik, ki ga reže ravnina, vzporedna ploskvi kocke.', 'Predicting the shape cut by a plane parallel to a face of the cube.'),
        explanation: text(
            'Kocka v grafu ima rob \\(1\\). Ravnina z normalo \\((0,0,1)\\) je ravnina \\(z=d\\), kjer je \\(d\\) odmik ravnine; zdaj je \\(d=0{,}5\\). Zapiši napoved: kakšen lik in kolikšno ploščino ima presek pri \\(d=0{,}5\\) in kaj se spremeni pri \\(d=0{,}25\\)? Slika kaže en odmik naenkrat, zato je ponazoritev in ne dokaz za vse odmike.',
            'The cube in the graph has edge \\(1\\). The plane with normal \\((0,0,1)\\) is the plane \\(z=d\\), where \\(d\\) is the offset of the plane; now \\(d=0{,}5\\). Write down a prediction: what shape and what area does the section have at \\(d=0{,}5\\), and what changes at \\(d=0{,}25\\)? The picture shows one offset at a time, so it is an illustration and not a proof for all offsets.',
        ),
        formulaIds: [],
        observationPrompt: text(
            'Preberi Presek, Število stranic preseka, Ploščina preseka in Prostornina spodnjega dela (mreža) pri odmiku ravnine \\(0{,}5\\); nato z drsnikom Odmik ravnine nastavi \\(0{,}25\\) in preberi iste odčitke.',
            'Read Section, Sides of the section, Area of the section and Volume of the lower part (mesh) at plane offset \\(0{,}5\\); then set the slider Plane offset to \\(0{,}25\\) and read the same readouts.',
        ),
        expectedObservations: [text(
            'Pri \\(0{,}5\\) je presek mnogokotnik s \\(4\\) stranicami in ploščino \\(1\\), prostornina spodnjega dela je \\(0{,}5\\). Pri \\(0{,}25\\) so \\(4\\) stranice in ploščina je spet \\(1\\), prostornina spodnjega dela pa \\(0{,}25\\): lik se ne spremeni, spodnji del se skrči.',
            'At \\(0{,}5\\) the section is a polygon with \\(4\\) sides and area \\(1\\), and the volume of the lower part is \\(0{,}5\\). At \\(0{,}25\\) the sides are \\(4\\) and the area is \\(1\\) again, and the volume of the lower part is \\(0{,}25\\): the shape does not change, the lower part shrinks.',
        )],
        scene: solidsScene('sv1-parallel-scene', SV1_PARALLEL,
            'Kocka, normala \\((0,0,1)\\), odmik \\(0{,}5\\): presek ima \\(4\\) stranice in ploščino \\(1\\), prostornina spodnjega dela \\(0{,}5\\).',
            'Cube, normal \\((0,0,1)\\), offset \\(0{,}5\\): the section has \\(4\\) sides and area \\(1\\), the volume of the lower part is \\(0{,}5\\).'),
    }),
    step({
        id: 'sv1-tilt', order: 2,
        title: text('Nagnjena ravnina', 'A tilted plane'),
        purpose: text('Napovedati, kako se presek spremeni, ko ravnino nagneš.', 'Predicting how the section changes when the plane is tilted.'),
        explanation: text(
            'Normala \\((1,1,0)\\) z odmikom \\(1\\) pomeni ravnino \\(x+y=1\\). Zapiši napoved: ali je presek še kvadrat s ploščino \\(1\\), kot pri vzporedni ravnini? Kaj pričakuješ za število stranic in za ploščino? Odčitke preveri pri opazovanju, ki sledi. To je en primer in ne pravilo za vsak nagib.',
            'The normal \\((1,1,0)\\) with offset \\(1\\) is the plane \\(x+y=1\\). Write down a prediction: is the section still a square with area \\(1\\), as for the parallel plane? What do you expect for the number of sides and for the area? Check the readouts in the observation that follows. This is one example and not a rule for every tilt.',
        ),
        formulaIds: ['solids-plane'],
        observationPrompt: text(
            'Nastavi komponente normale na \\(1\\), \\(1\\), \\(0\\) in Odmik ravnine na \\(1\\); preberi Ploščina preseka in vrstice Presečišče. Nato nastavi normalo \\(1\\), \\(2\\), \\(2\\) in odmik \\(1{,}5\\) ter spet preberi.',
            'Set the normal components to \\(1\\), \\(1\\), \\(0\\) and Plane offset to \\(1\\); read Area of the section and the rows Cut point. Then set the normal to \\(1\\), \\(2\\), \\(2\\) and the offset to \\(1{,}5\\) and read again.',
        ),
        expectedObservations: [text(
            'Pri normali \\((1,1,0)\\) in odmiku \\(1\\) so \\(4\\) stranice, ploščina je približno \\(1{,}41421\\) in vsa štiri presečišča so v ogliščih \\(2\\), \\(3\\), \\(7\\) in \\(6\\); noben rob ni prerezan v notranji točki. Pri normali \\((1,2,2)\\) in odmiku \\(1{,}5\\) so \\(4\\) stranice, ploščina je \\(0{,}75\\) in vsa štiri presečišča so na robovih (med \\(1\\) in \\(5\\), \\(2\\) in \\(6\\), \\(2\\) in \\(4\\), \\(1\\) in \\(3\\)).',
            'With normal \\((1,1,0)\\) and offset \\(1\\) there are \\(4\\) sides, the area is approximately \\(1{,}41421\\) and all four cut points are at vertices \\(2\\), \\(3\\), \\(7\\) and \\(6\\); no edge is cut in an interior point. With normal \\((1,2,2)\\) and offset \\(1{,}5\\) there are \\(4\\) sides, the area is \\(0{,}75\\) and all four cut points are on edges (between \\(1\\) and \\(5\\), \\(2\\) and \\(6\\), \\(2\\) and \\(4\\), \\(1\\) and \\(3\\)).',
        )],
        scene: solidsScene('sv1-tilt-scene', SV1_TILT,
            'Kocka, normala \\((1,1,0)\\), odmik \\(1\\): \\(4\\) stranice, ploščina približno \\(1{,}41421\\), presečišča v ogliščih \\(2\\), \\(3\\), \\(7\\), \\(6\\).',
            'Cube, normal \\((1,1,0)\\), offset \\(1\\): \\(4\\) sides, area approximately \\(1{,}41421\\), cut points at vertices \\(2\\), \\(3\\), \\(7\\), \\(6\\).'),
    }),
    step({
        id: 'sv1-diagonal', order: 3,
        title: text('Ravnina potuje vzdolž diagonale', 'The plane slides along the diagonal'),
        purpose: text('Napovedati lik pri odmiku \\(1{,}5\\) in videti, kako se število stranic spreminja z odmikom.', 'Predicting the shape at offset \\(1{,}5\\) and seeing how the number of sides changes with the offset.'),
        explanation: text(
            'Normala \\((1,1,1)\\) kaže vzdolž telesne diagonale kocke; ravnina \\(x+y+z=d\\) gre pri \\(d=0\\) skozi oglišče \\((0,0,0)\\) in pri \\(d=3\\) skozi nasprotno oglišče \\((1,1,1)\\). Pri \\(d=0{,}5\\) odreže trikotnik s ploščino približno \\(0{,}21651\\). Zapiši napoved: kakšen mnogokotnik in kakšno ploščino pričakuješ pri \\(d=1{,}5\\), na sredi poti? Nato odmik povečuj in beleži, pri katerih odmikih se število stranic spremeni.',
            'The normal \\((1,1,1)\\) points along a space diagonal of the cube; the plane \\(x+y+z=d\\) passes through the vertex \\((0,0,0)\\) at \\(d=0\\) and through the opposite vertex \\((1,1,1)\\) at \\(d=3\\). At \\(d=0{,}5\\) it cuts off a triangle of area approximately \\(0{,}21651\\). Write down a prediction: what polygon and what area do you expect at \\(d=1{,}5\\), halfway along? Then increase the offset and note at which offsets the number of sides changes.',
        ),
        formulaIds: ['solids-plane'],
        observationPrompt: text(
            'Odmik ravnine nastavi na \\(0{,}5\\), \\(1\\), \\(1{,}25\\), \\(1{,}5\\), \\(2\\) in \\(3\\) in pri vsakem preberi Število stranic preseka in Ploščina preseka. Pri \\(1{,}5\\) preberi tudi Prostornina spodnjega dela (mreža).',
            'Set the plane offset to \\(0{,}5\\), \\(1\\), \\(1{,}25\\), \\(1{,}5\\), \\(2\\) and \\(3\\) and at each read Sides of the section and Area of the section. At \\(1{,}5\\) also read Volume of the lower part (mesh).',
        ),
        expectedObservations: [text(
            'Pri \\(0{,}5\\): \\(3\\) stranice, ploščina približno \\(0{,}21651\\). Pri \\(1\\): \\(3\\) stranice, ploščina približno \\(0{,}86603\\) (ravnina gre skozi tri oglišča). Pri \\(1{,}25\\): \\(6\\) stranic, približno \\(1{,}19078\\). Pri \\(1{,}5\\): \\(6\\) stranic, približno \\(1{,}29904\\), prostornina spodnjega dela \\(0{,}5\\); šestkotnik razloži zgled v naslednjem koraku. Pri \\(2\\): \\(3\\) stranice, približno \\(0{,}86603\\). Pri \\(3\\): presek je točka (oglišče \\(8\\)). Med preizkušenimi odmiki je ploščina največja pri \\(1{,}5\\).',
            'At \\(0{,}5\\): \\(3\\) sides, area approximately \\(0{,}21651\\). At \\(1\\): \\(3\\) sides, area approximately \\(0{,}86603\\) (the plane passes through three vertices). At \\(1{,}25\\): \\(6\\) sides, approximately \\(1{,}19078\\). At \\(1{,}5\\): \\(6\\) sides, approximately \\(1{,}29904\\), volume of the lower part \\(0{,}5\\); the worked example in the next step explains the hexagon. At \\(2\\): \\(3\\) sides, approximately \\(0{,}86603\\). At \\(3\\): the section is a point (vertex \\(8\\)). Among the offsets tried the area is largest at \\(1{,}5\\).',
        )],
        scene: solidsScene('sv1-diagonal-scene', SV1_DIAGONAL,
            'Kocka, normala \\((1,1,1)\\), odmik \\(0{,}5\\): trikotnik s ploščino približno \\(0{,}21651\\); odmik se povečuje in presek se spreminja.',
            'Cube, normal \\((1,1,1)\\), offset \\(0{,}5\\): a triangle of area approximately \\(0{,}21651\\); the offset increases and the section changes.'),
    }),
    step({
        id: 'sv1-corners', order: 4,
        title: text('Oglišča preseka ležijo na robovih ali v ogliščih', 'The corners of the section lie on edges or at vertices'),
        purpose: text('Povezati vsako oglišče preseka z robom ali ogliščem kocke, na katerem leži.', 'Connecting each corner of the section with the edge or vertex of the cube it lies on.'),
        explanation: text(
            'Vsako oglišče preseka je točka, kjer ravnina seka rob kocke, ali oglišče kocke, skozi katero gre. Pike v sliki so ta presečišča, številke so oglišča kocke. Pri normali \\((1,1,1)\\) in odmiku \\(1{,}25\\) vrstice Presečišče povedo, na katerem robu leži vsako. Zapiši napoved: koliko robov prereže ravnina pri odmiku \\(1\\)?',
            'Each corner of the section is a point where the plane meets an edge of the cube, or a vertex of the cube it passes through. The dots in the picture are these cut points and the numbers are the vertices of the cube. With normal \\((1,1,1)\\) and offset \\(1{,}25\\) the rows Cut point say which edge each lies on. Write down a prediction: how many edges does the plane cut at offset \\(1\\)?',
        ),
        formulaIds: [],
        workedExampleId: 'sv1-hexagon',
        observationPrompt: text(
            'Preberi vseh šest vrstic Presečišče pri odmiku \\(1{,}25\\) in zapiši robove. Nato nastavi odmik \\(1\\) in preberi vrstice znova.',
            'Read all six rows Cut point at offset \\(1{,}25\\) and write down the edges. Then set the offset to \\(1\\) and read the rows again.',
        ),
        expectedObservations: [text(
            'Pri \\(1{,}25\\) je šest presečišč, vsa na robovih: med oglišči \\(3\\) in \\(7\\), \\(5\\) in \\(7\\), \\(5\\) in \\(6\\), \\(2\\) in \\(6\\), \\(2\\) in \\(4\\), \\(3\\) in \\(4\\); presek je šestkotnik s ploščino približno \\(1{,}19078\\). Pri odmiku \\(1\\) so tri presečišča, vsa v ogliščih \\(2\\), \\(3\\) in \\(5\\): noben rob ni prerezan v notranji točki, presek je trikotnik s ploščino približno \\(0{,}86603\\).',
            'At \\(1{,}25\\) there are six cut points, all on edges: between vertices \\(3\\) and \\(7\\), \\(5\\) and \\(7\\), \\(5\\) and \\(6\\), \\(2\\) and \\(6\\), \\(2\\) and \\(4\\), \\(3\\) and \\(4\\); the section is a hexagon of area approximately \\(1{,}19078\\). At offset \\(1\\) there are three cut points, all at vertices \\(2\\), \\(3\\) and \\(5\\): no edge is cut in an interior point, and the section is a triangle of area approximately \\(0{,}86603\\).',
        )],
        scene: solidsScene('sv1-corners-scene', SV1_CORNERS,
            'Kocka, normala \\((1,1,1)\\), odmik \\(1{,}25\\): šestkotnik s ploščino približno \\(1{,}19078\\), vseh šest presečišč na robovih.',
            'Cube, normal \\((1,1,1)\\), offset \\(1{,}25\\): a hexagon of area approximately \\(1{,}19078\\), all six cut points on edges.'),
    }),
    step({
        id: 'sv1-argument', order: 5,
        title: text('Največ stranic preseka', 'The most sides of a section'),
        purpose: text('Napovedati največje število stranic preseka in to utemeljiti.', 'Predicting the largest number of sides of a section and giving the reason.'),
        explanation: text(
            'Presek kocke z ravnino je mnogokotnik, katerega stranice ležijo v ploskvah kocke. Zapiši napoved: koliko stranic ima lahko presek največ? Nato na grafu poskusi najti presek s sedmimi stranicami; argument sledi po poskusu.',
            'A section of the cube by a plane is a polygon whose sides lie in faces of the cube. Write down a prediction: what is the largest number of sides a section can have? Then try on the graph to find a section with seven sides; the argument follows after the attempt.',
        ),
        formulaIds: [],
        observationPrompt: text(
            'Nastavi normalo \\(2\\), \\(3\\), \\(4\\) in odmik \\(4\\), nato \\(4{,}5\\); preberi Število stranic preseka. Potem poskusi z drugimi normalami (komponente od \\(-4\\) do \\(4\\)) in odmiki najti presek s \\(7\\) stranicami.',
            'Set the normal to \\(2\\), \\(3\\), \\(4\\) and the offset to \\(4\\), then \\(4{,}5\\); read Sides of the section. Then try other normals (components from \\(-4\\) to \\(4\\)) and offsets to find a section with \\(7\\) sides.',
        ),
        expectedObservations: [text(
            'Pri normali \\((2,3,4)\\) in odmiku \\(4\\) je petkotnik s ploščino približno \\(1{,}2341\\) (štiri presečišča na robovih, eno v oglišču \\(5\\)); pri odmiku \\(4{,}5\\) je šestkotnik s ploščino približno \\(1{,}2902\\). Argument: če ravnina ne vsebuje ploskve, ravnino vsake ploskve seka v premici ali pa je ne seka, zato seka ploskev v največ eni daljici, saj je ploskev konveksna; če ravnina vsebuje ploskev, je presek ta ploskev, kvadrat s štirimi stranicami. Vsaka stranica preseka leži v eni ploskvi, kocka pa ima šest ploskev, zato ima presek največ šest stranic in presek s sedmimi stranicami ne obstaja. Poskusi na grafu so le ponazoritev: če sedemkotnika ne najdeš, ga to še ne izključuje, izključi ga argument o ploskvah.',
            'With normal \\((2,3,4)\\) and offset \\(4\\) the section is a pentagon of area approximately \\(1{,}2341\\) (four cut points on edges, one at vertex \\(5\\)); at offset \\(4{,}5\\) it is a hexagon of area approximately \\(1{,}2902\\). Argument: if the plane does not contain a face, it meets the plane of each face in a line or not at all, so it meets the face in at most one segment, since a face is convex; if the plane contains a face, the section is that face, a square with four sides. Each side of the section lies in one face and the cube has six faces, so the section has at most six sides and a section with seven sides does not exist. Trying planes on the graph is only an illustration: not finding a heptagon does not exclude it, the argument about the faces does.',
        )],
        scene: solidsScene('sv1-argument-scene', SV1_ARGUMENT,
            'Kocka, normala \\((2,3,4)\\), odmik \\(4\\): petkotnik s ploščino približno \\(1{,}2341\\), eno presečišče v oglišču \\(5\\), štiri na robovih.',
            'Cube, normal \\((2,3,4)\\), offset \\(4\\): a pentagon of area approximately \\(1{,}2341\\), one cut point at vertex \\(5\\), four on edges.'),
    }),
    step({
        id: 'sv1-free', order: 6,
        title: text('Prosto raziskovanje', 'Free exploration'),
        purpose: text('Sam poiskati ravnine za vse štiri možne preseke.', 'Finding planes for all four possible sections on your own.'),
        explanation: text(
            'Normala, odmik in pogled so zdaj tvoji. Poišči ravnino, ki da trikotnik, štirikotnik, petkotnik in šestkotnik, ter zapiši normalo in odmik za vsakega. Pomisli, katere ploskve ravnina seka, in preveri s presečišči.',
            'The normal, the offset and the view are now yours. Find a plane that gives a triangle, a quadrilateral, a pentagon and a hexagon, and write down the normal and offset for each. Think about which faces the plane meets, and check with the cut points.',
        ),
        formulaIds: [],
        observationPrompt: text(
            'Zapiši normalo in odmik za trikotnik, štirikotnik, petkotnik in šestkotnik ter ploščino vsakega.',
            'Write down the normal and offset for a triangle, a quadrilateral, a pentagon and a hexagon, and the area of each.',
        ),
        expectedObservations: [text(
            'Na primer: trikotnik pri normali \\((1,1,1)\\) in odmiku \\(0{,}5\\) (ploščina približno \\(0{,}21651\\)); štirikotnik pri \\((0,0,1)\\) in \\(0{,}5\\) (\\(1\\)); petkotnik pri \\((2,3,4)\\) in \\(4\\) (približno \\(1{,}2341\\)); šestkotnik pri \\((1,1,1)\\) in \\(1{,}5\\) (približno \\(1{,}29904\\)).',
            'For example: a triangle at normal \\((1,1,1)\\) and offset \\(0{,}5\\) (area approximately \\(0{,}21651\\)); a quadrilateral at \\((0,0,1)\\) and \\(0{,}5\\) (\\(1\\)); a pentagon at \\((2,3,4)\\) and \\(4\\) (approximately \\(1{,}2341\\)); a hexagon at \\((1,1,1)\\) and \\(1{,}5\\) (approximately \\(1{,}29904\\)).',
        )],
        scene: solidsScene('sv1-free-scene', SV1_FREE,
            'Kocka, normala \\((1,1,1)\\), odmik \\(1{,}5\\): šestkotnik s ploščino približno \\(1{,}29904\\); normala, odmik in pogled so prosti.',
            'Cube, normal \\((1,1,1)\\), offset \\(1{,}5\\): a hexagon of area approximately \\(1{,}29904\\); the normal, the offset and the view are free.'),
    }),
];

// ---- SV2 ---------------------------------------------------------------------------------------------------------------------------

const sv2Steps: readonly GuidedLessonStep[] = [
    step({
        id: 'sv2-prism', order: 1,
        title: text('Vodoravni presek prizme', 'The horizontal section of a prism'),
        purpose: text('Videti, da se ploščina vodoravnega preseka prizme ne spremeni, in napovedati, kaj naredi piramida.', 'Seeing that the area of a horizontal section of a prism does not change, and predicting what a pyramid does.'),
        explanation: text(
            'Štiristrana prizma ima kvadratno osnovno ploskev s stranico \\(2\\) in višino \\(3\\); njena prostornina je \\(12\\). Ravnina z normalo \\((0,0,1)\\) je vodoravna in vzporedna osnovni ploskvi. Pri prizmi so stranski robovi vzporedni, zato je vsak vodoravni presek premaknjena kopija osnovne ploskve: to je razlog, odčitki pa so ponazoritev na nekaj višinah. Zapiši napoved za piramido: ali se ploščina vodoravnega preseka pri premiku ravnine navzgor spremeni?',
            'The square prism has a square base with side \\(2\\) and height \\(3\\); its volume is \\(12\\). The plane with normal \\((0,0,1)\\) is horizontal and parallel to the base. In a prism the lateral edges are parallel, so every horizontal section is a translated copy of the base: that is the reason, and the readouts are an illustration at a few heights. Write down a prediction for the pyramid: does the area of a horizontal section change as the plane moves up?',
        ),
        formulaIds: [],
        observationPrompt: text(
            'Odmik ravnine nastavi na \\(-1\\), \\(0\\) in \\(1\\) in pri vsakem preberi Ploščina preseka in Prostornina spodnjega dela (mreža).',
            'Set the plane offset to \\(-1\\), \\(0\\) and \\(1\\) and at each read Area of the section and Volume of the lower part (mesh).',
        ),
        expectedObservations: [text(
            'Pri vseh treh odmikih ima presek \\(4\\) stranice in ploščino \\(4\\), enako kot osnovna ploskev; prostornina spodnjega dela je \\(2\\), \\(6\\) in \\(10\\). Ploščina se pri prizmi ne spremeni.',
            'At all three offsets the section has \\(4\\) sides and area \\(4\\), the same as the base; the volume of the lower part is \\(2\\), \\(6\\) and \\(10\\). For the prism the area does not change.',
        )],
        scene: solidsScene('sv2-prism-scene', SV2_PRISM,
            'Štiristrana prizma, normala \\((0,0,1)\\), odmik \\(0\\): presek ima \\(4\\) stranice in ploščino \\(4\\), prostornina spodnjega dela \\(6\\).',
            'Square prism, normal \\((0,0,1)\\), offset \\(0\\): the section has \\(4\\) sides and area \\(4\\), the volume of the lower part is \\(6\\).'),
    }),
    step({
        id: 'sv2-pyramid', order: 2,
        title: text('Presek piramide se manjša', 'The section of the pyramid shrinks'),
        purpose: text('Primerjati napoved za piramido z odčitki.', 'Comparing the prediction for the pyramid with the readouts.'),
        explanation: text(
            'Štiristrana piramida ima kvadratno osnovno ploskev s stranico \\(4\\) (ploščina \\(16\\)) v ravnini \\(z=-2\\) in vrh na višini \\(z=2\\), torej višino \\(4\\); prostornina je \\(\\frac{64}{3}\\approx21{,}333\\). Vodoravna ravnina z odmikom \\(d\\) je \\(d+2\\) nad osnovno ploskvijo. Zapiši napoved: kolikšna je ploščina preseka pri odmiku \\(-1\\) (višina \\(1\\) nad osnovno ploskvijo), \\(0\\) in \\(1\\)?',
            'The square pyramid has a square base with side \\(4\\) (area \\(16\\)) in the plane \\(z=-2\\) and its apex at \\(z=2\\), so its height is \\(4\\); its volume is \\(\\frac{64}{3}\\approx21{,}333\\). The horizontal plane with offset \\(d\\) is \\(d+2\\) above the base. Write down a prediction: what is the area of the section at offset \\(-1\\) (height \\(1\\) above the base), \\(0\\) and \\(1\\)?',
        ),
        formulaIds: [],
        observationPrompt: text(
            'Nastavi odmik \\(-1\\), \\(0\\) in \\(1\\) ter preberi Ploščina preseka in Število stranic preseka; nato še odmik \\(-2\\) (ravnina v osnovni ploskvi) in \\(2\\) (vrh).',
            'Set the offset to \\(-1\\), \\(0\\) and \\(1\\) and read Area of the section and Sides of the section; then the offset \\(-2\\) (the plane in the base) and \\(2\\) (the apex).',
        ),
        expectedObservations: [text(
            'Pri \\(-1\\) so \\(4\\) stranice in ploščina \\(9\\); pri \\(0\\) \\(4\\) stranice in \\(4\\); pri \\(1\\) \\(4\\) stranice in \\(1\\). Pri \\(-2\\) je presek osnovna ploskev s ploščino \\(16\\), pri \\(2\\) točka (vrh, oglišče \\(5\\)). Ploščina pada, ko se ravnina bliža vrhu. Če je presek kvadrat, so stranice \\(3\\), \\(2\\) in \\(1\\), saj je \\(9=3^{2}\\), \\(4=2^{2}\\) in \\(1=1^{2}\\).',
            'At \\(-1\\) there are \\(4\\) sides and the area is \\(9\\); at \\(0\\) \\(4\\) sides and \\(4\\); at \\(1\\) \\(4\\) sides and \\(1\\). At \\(-2\\) the section is the base with area \\(16\\), at \\(2\\) a point (the apex, vertex \\(5\\)). The area falls as the plane nears the apex. If the section is a square, its sides are \\(3\\), \\(2\\) and \\(1\\), since \\(9=3^{2}\\), \\(4=2^{2}\\) and \\(1=1^{2}\\).',
        )],
        scene: solidsScene('sv2-pyramid-scene', SV2_PYRAMID,
            'Štiristrana piramida, normala \\((0,0,1)\\), odmik \\(-1\\): presek ima \\(4\\) stranice in ploščino \\(9\\).',
            'Square pyramid, normal \\((0,0,1)\\), offset \\(-1\\): the section has \\(4\\) sides and area \\(9\\).'),
    }),
    step({
        id: 'sv2-similar', order: 3,
        title: text('Polovična višina, četrtina ploščine', 'Half the height, a quarter of the area'),
        purpose: text('Utemeljiti zmanjševanje ploščine s podobnima trikotnikoma v osnem preseku.', 'Giving the reason for the shrinking area with similar triangles in the axial section.'),
        explanation: text(
            'Argument. Pogled spredaj kaže osni presek piramide: trikotnik, ki ga ravnina \\(y=0\\) (skozi os, vzporedna robu osnovne ploskve) reže iz piramide, z osnovnico \\(4\\) in višino \\(4\\). Ta trikotnik je narisan poleg preseka, skupaj z daljico, kjer ga seka vodoravna ravnina; daljica je vzporedna osnovnici in odreže podoben trikotnik. Razmerje podobnosti je razmerje višin, na višini \\(h\\) nad osnovno ploskvijo \\(\\frac{4-h}{4}\\). Presek je kvadrat s to stranico, zato se ploščina pomnoži s kvadratom razmerja. Pri polovični višini (\\(h=2\\), odmik \\(0\\)) je daljica \\(2\\) in ploščina \\(4\\), četrtina od \\(16\\). Odčitki so le preverjanje na treh odmikih.',
            'Argument. The front view shows the axial section of the pyramid: the triangle the plane \\(y=0\\) (through the axis, parallel to an edge of the base) cuts from the pyramid, with base \\(4\\) and height \\(4\\). This triangle is drawn beside the section, together with the segment where the horizontal plane meets it; the segment is parallel to the base and cuts off a similar triangle. The ratio of similarity is the ratio of the heights, at height \\(h\\) above the base \\(\\frac{4-h}{4}\\). The section is a square with this side, so the area is multiplied by the square of the ratio. At half the height (\\(h=2\\), offset \\(0\\)) the segment is \\(2\\) and the area \\(4\\), a quarter of \\(16\\). The readouts only check this at three offsets.',
        ),
        formulaIds: ['solids-similar'],
        workedExampleId: 'sv2-scale',
        observationPrompt: text(
            'Poišči narisani osni trikotnik in daljico v njem pri odmiku \\(0\\) ter oceni, kolikokrat je daljica krajša od osnovnice. Zapiši napoved ploščine pri odmiku \\(-1\\) (\\(h=1\\)) in \\(1\\) (\\(h=3\\)) po formuli, nato ju preberi.',
            'Find the drawn axial triangle and the segment in it at offset \\(0\\) and estimate how many times shorter the segment is than the base. Write down a prediction of the area at offset \\(-1\\) (\\(h=1\\)) and \\(1\\) (\\(h=3\\)) from the formula, then read them.',
        ),
        expectedObservations: [text(
            'Daljica je polovica osnovnice, ploščina pri odmiku \\(0\\) je \\(4\\), četrtina od \\(16\\). Napoved pri \\(-1\\) je \\(\\left(\\frac34\\right)^{2}\\cdot16=9\\), pri \\(1\\) je \\(\\left(\\frac14\\right)^{2}\\cdot16=1\\); odčitka sta \\(9\\) in \\(1\\).',
            'The segment is half the base, and the area at offset \\(0\\) is \\(4\\), a quarter of \\(16\\). The prediction at \\(-1\\) is \\(\\left(\\frac34\\right)^{2}\\cdot16=9\\), at \\(1\\) it is \\(\\left(\\frac14\\right)^{2}\\cdot16=1\\); the readouts are \\(9\\) and \\(1\\).',
        )],
        scene: solidsScene('sv2-similar-scene', SV2_SIMILAR,
            'Štiristrana piramida, normala \\((0,0,1)\\), odmik \\(0\\), pogled spredaj: presek ima \\(4\\) stranice in ploščino \\(4\\); narisan je osni trikotnik z daljico.',
            'Square pyramid, normal \\((0,0,1)\\), offset \\(0\\), front view: the section has \\(4\\) sides and area \\(4\\); the axial triangle with its segment is drawn.'),
    }),
    step({
        id: 'sv2-apex', order: 4,
        title: text('Ravnina skozi vrh', 'A plane through the apex'),
        purpose: text('Napovedati lik, ki ga reže ravnina skozi vrh.', 'Predicting the shape cut by a plane through the apex.'),
        explanation: text(
            'Vse stranske ploskve piramide se stikajo v vrhu. Če ravnina gre skozi vrh in seka osnovno ploskev v daljici, reže stranske ploskve v daljicah iz vrha, tretja stran leži v osnovni ploskvi: presek je trikotnik. Normala \\((1,0,0)\\) z odmikom \\(0\\) gre skozi vrh in os. Zapiši napoved: kakšen lik in kolikšno ploščino ima presek? Odčitaj osnovnico in višino iz osnega preseka. Ravnina skozi vrh pa seka osnovno ploskev ali pa ne; zadnji primer to pokaže.',
            'All lateral faces of the pyramid meet at the apex. If a plane passes through the apex and meets the base in a segment, it cuts the lateral faces in segments from the apex, and the third side lies in the base: the section is a triangle. The normal \\((1,0,0)\\) with offset \\(0\\) passes through the apex and the axis. Write down a prediction: what shape and what area does the section have? Read the base and the height from the axial section. A plane through the apex may or may not meet the base; the last case shows this.',
        ),
        formulaIds: [],
        observationPrompt: text(
            'Nastavi normalo \\((1,0,0)\\) in odmik \\(0\\) ter preberi. Nato normalo \\((1,1,0)\\) in odmik \\(0\\), nato normalo \\((1,2,1)\\) in odmik \\(2\\) (gre skozi vrh \\((0,0,2)\\), saj je \\(1\\cdot0+2\\cdot0+1\\cdot2=2\\)). Nazadnje normalo \\((1,0,1)\\) in odmik \\(2\\).',
            'Set the normal \\((1,0,0)\\) and offset \\(0\\) and read. Then the normal \\((1,1,0)\\) and offset \\(0\\), then the normal \\((1,2,1)\\) and offset \\(2\\) (it passes through the apex \\((0,0,2)\\), since \\(1\\cdot0+2\\cdot0+1\\cdot2=2\\)). Last the normal \\((1,0,1)\\) and offset \\(2\\).',
        ),
        expectedObservations: [text(
            'Normala \\((1,0,0)\\), odmik \\(0\\): trikotnik s ploščino \\(8=\\frac12\\cdot4\\cdot4\\), presečišča so vrh (oglišče \\(5\\)) in robova med \\(1\\) in \\(2\\) ter \\(3\\) in \\(4\\). Normala \\((1,1,0)\\), odmik \\(0\\): trikotnik s ploščino približno \\(11{,}31371\\), presečišča v ogliščih \\(2\\), \\(4\\) in \\(5\\). Normala \\((1,2,1)\\), odmik \\(2\\): trikotnik s ploščino približno \\(4{,}89898\\). Normala \\((1,0,1)\\), odmik \\(2\\): presek je točka (vrh): ravnina gre skozi vrh, osnovne ploskve pa ne seka, zato trikotnika ni.',
            'Normal \\((1,0,0)\\), offset \\(0\\): a triangle of area \\(8=\\frac12\\cdot4\\cdot4\\), the cut points are the apex (vertex \\(5\\)) and the edges between \\(1\\) and \\(2\\) and between \\(3\\) and \\(4\\). Normal \\((1,1,0)\\), offset \\(0\\): a triangle of area approximately \\(11{,}31371\\), cut points at vertices \\(2\\), \\(4\\) and \\(5\\). Normal \\((1,2,1)\\), offset \\(2\\): a triangle of area approximately \\(4{,}89898\\). Normal \\((1,0,1)\\), offset \\(2\\): the section is a point (the apex): the plane passes through the apex but does not meet the base, so there is no triangle.',
        )],
        scene: solidsScene('sv2-apex-scene', SV2_APEX,
            'Štiristrana piramida, normala \\((1,0,0)\\), odmik \\(0\\): trikotnik s ploščino \\(8\\), eno presečišče je vrh (oglišče \\(5\\)).',
            'Square pyramid, normal \\((1,0,0)\\), offset \\(0\\): a triangle of area \\(8\\), one cut point is the apex (vertex \\(5\\)).'),
    }),
    step({
        id: 'sv2-pentagon', order: 5,
        title: text('Nagnjena ravnina skozi piramido', 'A tilted plane through the pyramid'),
        purpose: text('Napovedati največje število stranic preseka piramide in ga utemeljiti.', 'Predicting the largest number of sides of a section of the pyramid and giving the reason.'),
        explanation: text(
            'Argument. Piramida ima pet ploskev (osnovno in štiri stranske), ravnina, ki nobene ne vsebuje, pa seka vsako v največ eni daljici (če vsebuje ploskev, je presek ta ploskev). Presek ima zato največ pet stranic. Ravnina, ki ne gre skozi vrh in seka osnovno ploskev ter vse štiri stranske ploskve, da petkotnik. Zapiši napoved: pri katerih odmikih za normalo \\((1,1,1)\\) je presek petkotnik? Poskusi na grafu so ponazoritev, argument o ploskvah je utemeljitev.',
            'Argument. The pyramid has five faces (the base and four lateral faces), and a plane that contains none of them meets each in at most one segment (if it contains a face, the section is that face). The section therefore has at most five sides. A plane that does not pass through the apex and meets the base and all four lateral faces gives a pentagon. Write down a prediction: at which offsets with normal \\((1,1,1)\\) is the section a pentagon? Trying planes on the graph is an illustration, the argument about the faces is the reason.',
        ),
        formulaIds: ['solids-plane'],
        observationPrompt: text(
            'Pri normali \\((1,1,1)\\) nastavi odmik \\(-1{,}75\\), \\(-1{,}5\\), \\(-1\\), \\(-0{,}5\\), \\(0\\), \\(0{,}5\\), \\(1\\), \\(1{,}5\\) in \\(1{,}75\\) in preberi Število stranic preseka; nato \\(-2\\) in \\(2\\). Potem poskusi normali \\((2,3,4)\\) in \\((1,1,2)\\) z odmikom \\(0\\).',
            'With normal \\((1,1,1)\\) set the offset to \\(-1{,}75\\), \\(-1{,}5\\), \\(-1\\), \\(-0{,}5\\), \\(0\\), \\(0{,}5\\), \\(1\\), \\(1{,}5\\) and \\(1{,}75\\) and read Sides of the section; then \\(-2\\) and \\(2\\). Then try the normals \\((2,3,4)\\) and \\((1,1,2)\\) with offset \\(0\\).',
        ),
        expectedObservations: [text(
            'Pri vseh naštetih odmikih od \\(-1{,}75\\) do \\(1{,}75\\) je presek petkotnik; pri odmiku \\(0\\) ima ploščino približno \\(8{,}66025\\), prostornina spodnjega dela je približno \\(15{,}33333\\). Pri \\(-2\\) je trikotnik s ploščino približno \\(6{,}9282\\), pri \\(2\\) daljica. Normala \\((2,3,4)\\) z odmikom \\(0\\) da petkotnik (ploščina približno \\(7{,}78076\\)), normala \\((1,1,2)\\) pa štirikotnik (približno \\(6{,}53197\\)): nagib sam petkotnika ne zagotavlja. Šestkotnika ne dobiš, ker ima piramida pet ploskev.',
            'At all the listed offsets from \\(-1{,}75\\) to \\(1{,}75\\) the section is a pentagon; at offset \\(0\\) its area is approximately \\(8{,}66025\\) and the volume of the lower part approximately \\(15{,}33333\\). At \\(-2\\) it is a triangle of area approximately \\(6{,}9282\\), at \\(2\\) a segment. The normal \\((2,3,4)\\) with offset \\(0\\) gives a pentagon (area approximately \\(7{,}78076\\)), the normal \\((1,1,2)\\) a quadrilateral (approximately \\(6{,}53197\\)): the tilt alone does not guarantee a pentagon. You do not get a hexagon, because the pyramid has five faces.',
        )],
        scene: solidsScene('sv2-pentagon-scene', SV2_PENTAGON,
            'Štiristrana piramida, normala \\((1,1,1)\\), odmik \\(0\\): petkotnik s ploščino približno \\(8{,}66025\\).',
            'Square pyramid, normal \\((1,1,1)\\), offset \\(0\\): a pentagon of area approximately \\(8{,}66025\\).'),
    }),
    step({
        id: 'sv2-free', order: 6,
        title: text('Prosto raziskovanje', 'Free exploration'),
        purpose: text('Sam poiskati trikotnik, štirikotnik in petkotnik v piramidi.', 'Finding a triangle, a quadrilateral and a pentagon in the pyramid on your own.'),
        explanation: text(
            'Telo, normala, odmik in pogled so zdaj tvoji. Poišči ravnine za trikotnik, štirikotnik in petkotnik v piramidi in zapiši, katere ploskve ravnina seka. Poskusi tudi s prizmo in primerjaj z odčitki.',
            'The solid, the normal, the offset and the view are now yours. Find planes for a triangle, a quadrilateral and a pentagon in the pyramid and write down which faces the plane meets. Try the prism too and compare with the readouts.',
        ),
        formulaIds: [],
        observationPrompt: text(
            'Zapiši normalo in odmik za trikotnik, štirikotnik in petkotnik v piramidi ter ploščino vsakega.',
            'Write down the normal and offset for a triangle, a quadrilateral and a pentagon in the pyramid, and the area of each.',
        ),
        expectedObservations: [text(
            'Na primer: trikotnik pri normali \\((1,0,0)\\) in odmiku \\(0\\) (ploščina \\(8\\)); štirikotnik pri \\((0,0,1)\\) in \\(0\\) (\\(4\\)); petkotnik pri \\((1,1,1)\\) in \\(0\\) (približno \\(8{,}66025\\)).',
            'For example: a triangle at normal \\((1,0,0)\\) and offset \\(0\\) (area \\(8\\)); a quadrilateral at \\((0,0,1)\\) and \\(0\\) (\\(4\\)); a pentagon at \\((1,1,1)\\) and \\(0\\) (approximately \\(8{,}66025\\)).',
        )],
        scene: solidsScene('sv2-free-scene', SV2_FREE,
            'Štiristrana piramida, normala \\((1,1,1)\\), odmik \\(-1\\): petkotnik s ploščino približno \\(9{,}09327\\); telo, normala, odmik in pogled so prosti.',
            'Square pyramid, normal \\((1,1,1)\\), offset \\(-1\\): a pentagon of area approximately \\(9{,}09327\\); the solid, the normal, the offset and the view are free.'),
    }),
];

// ---- The lessons -------------------------------------------------------------------------------------------------------------------

const sources: GuidedLesson['sources'] = [
    {
        id: 'bezeg-solids-implementation',
        citation: 'Bezeg source: src/solids/section.ts (the integer-grid plane section and the clipped mesh), src/solids/volume.ts (the area of the section from its loop, the mesh volume) and src/graphs/solids/SolidsGraph.tsx.',
        implementationCorrespondence: 'A scene sets the solid, the section mode, the plane normal and offset and a camera preset of the solids graph; the section, its side count, area and kept volume are computed from the integer-grid signs and the cut points and read out as text.',
    },
];

const edgeCases: readonly LocalizedText[] = [
    text('Odmik ravnine je na mreži \\(0{,}25\\) in normala ima celoštevilske komponente od \\(-4\\) do \\(4\\); vrednosti zunaj nje graf zavrne.', 'The offset of the plane is on the grid \\(0{,}25\\) and the normal has integer components from \\(-4\\) to \\(4\\); the graph refuses values outside it.'),
    text('Ravnina, ki vsebuje ploskev telesa, da za presek to ploskev; ravnina, ki se telesa dotakne v točki ali daljici, da točko ali daljico.', 'A plane that contains a face of the solid gives that face as the section; a plane that touches the solid in a point or a segment gives a point or a segment.'),
];

const cubeSections: GuidedLesson = {
    demonstrationId: 'solids',
    title: text('Ravninski preseki kocke', 'Plane sections of the cube'),
    summary: text(
        'Ravnina prereže kocko v mnogokotniku, katerega oglišča so točke, kjer ravnina seka robove. Presek je lahko trikotnik, štirikotnik, petkotnik ali šestkotnik, sedemkotnik pa ne, ker ima kocka šest ploskev.',
        'A plane cuts the cube in a polygon whose corners are the points where the plane meets the edges. The section can be a triangle, a quadrilateral, a pentagon or a hexagon, but not a heptagon, because the cube has six faces.',
    ),
    prerequisites: [text('Ravninski liki, ravnina v prostoru.', 'Plane figures, a plane in space.')],
    learningGoals: [
        text('Znaš prebrati, katere robove in oglišča kocke ravnina seka in kakšen mnogokotnik nastane.', 'Can read which edges and vertices of the cube the plane meets and which polygon results.'),
        text('Znaš utemeljiti, da presek kocke nima več kot šest stranic.', 'Can explain why a section of the cube has at most six sides.'),
    ],
    formulaBlocks: [formulas[0]],
    workedExamples: [examples[0]],
    steps: sv1Steps,
    sources,
    edgeCases,
    unresolvedQuestions: [],
};

const prismPyramidSections: GuidedLesson = {
    demonstrationId: 'solids',
    title: text('Ravninski preseki prizme in piramide', 'Plane sections of prisms and pyramids'),
    summary: text(
        'Vodoravni presek prizme je skladen osnovni ploskvi. Vodoravni presek piramide je podoben osnovni ploskvi z razmerjem \\(\\frac{H-h}{H}\\), ploščina pa je pomnožena z njegovim kvadratom. Ravnina skozi vrh, ki seka osnovno ploskev, da trikotnik, nagnjena ravnina največ petkotnik.',
        'A horizontal section of a prism is congruent to the base. A horizontal section of a pyramid is similar to the base with ratio \\(\\frac{H-h}{H}\\), and the area is multiplied by its square. A plane through the apex that meets the base gives a triangle, a tilted plane at most a pentagon.',
    ),
    prerequisites: [text('Ravninski preseki kocke, podobni trikotniki.', 'Plane sections of the cube, similar triangles.')],
    learningGoals: [
        text('Znaš utemeljiti s podobnima trikotnikoma, da se ploščina vodoravnega preseka piramide spreminja s kvadratom razmerja višin.', 'Can use similar triangles to explain that the area of a horizontal section of a pyramid changes with the square of the ratio of heights.'),
        text('Znaš napovedati, kdaj je presek piramide trikotnik in da ima največ pet stranic.', 'Can predict when a section of the pyramid is a triangle and that it has at most five sides.'),
    ],
    formulaBlocks: [formulas[0], formulas[1]],
    workedExamples: [examples[1]],
    steps: sv2Steps,
    sources,
    edgeCases,
    unresolvedQuestions: [],
};

export const cubeSectionsLesson: GuidedLesson = cubeSections;
export const prismPyramidSectionsLesson: GuidedLesson = prismPyramidSections;
