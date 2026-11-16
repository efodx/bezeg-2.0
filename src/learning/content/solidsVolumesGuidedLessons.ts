/**
 * Guided lessons of the solids family, batch B (docs/specs/solids-volumes-lessons.md): SV3, Cavalieri's principle, on `solids` (SolidsGraph, stack mode). The scenes use only the
 * `solids` actions the graph registers (`set-solid`, `set-mode`, `set-shear`, `set-discs`, `set-cursor`) and every scene starts from the Demonstration default.
 * Stack mode holds two pairs: a solid and its sheared copy (the square prism 2 x 2 x 3, volume 12), whose slice areas stay equal, and a cone and a cylinder of equal height, whose slice
 * areas differ. The shear is stored in units of 1/4 (the slider shows 6 as 1,5: the top moves sideways by that much against the bottom) and the cursor in 1/40 of the height (10, 20, 30
 * are 25 %, 50 %, 75 %). The first frame of every scene already shows readouts, so each predicting step opens on the state before the change it asks for. Every number the text quotes
 * is a readout of the graph (probed, .command-logs/solids-b/probe.txt and probe2-sv3.txt) or exact arithmetic in the same step. The one-height comparison is an illustration; the argument
 * is that the shear moves each horizontal slice sideways as a whole.
 */
import type {LessonAction} from '../model';
import type {FormulaBlock, GuidedLesson, GuidedLessonFrame, GuidedLessonStep, LessonScene, LocalizedText} from './guidedLessons';

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
    readonly observationPrompt: LocalizedText;
    readonly expectedObservations: readonly LocalizedText[];
    readonly scene: LessonScene;
}

const step = (content: StepContent): GuidedLessonStep => ({
    ...content,
    frames: [
        frame(`${content.id}-explanation`, 'explanation'),
        frame(`${content.id}-observation`, 'observation'),
    ],
});

/** What a stack scene sets on top of the Demonstration default: the solid and optionally shear (stored, 1/4 units; not for the cone), slab count, cursor (1/40 of the height). */
export interface SolidsStackSpec {
    readonly solid: 'cube' | 'square-prism' | 'cone';
    readonly shear?: number;
    readonly discs?: number;
    readonly cursor?: number;
}

/** The actions of a stack scene: the Demonstration default, then mode, solid and the fields the spec names. */
export const solidsStackActions = (id: string, spec: SolidsStackSpec): LessonAction[] => [
    {kind: 'prepared-scene', sceneId: id, source: 'demonstration-default'},
    {kind: 'solids', operation: 'set-mode', mode: 'stack'},
    {kind: 'solids', operation: 'set-solid', solid: spec.solid},
    ...(spec.shear !== undefined ? [{kind: 'solids', operation: 'set-shear', shear: spec.shear} as const] : []),
    ...(spec.discs !== undefined ? [{kind: 'solids', operation: 'set-discs', discs: spec.discs} as const] : []),
    ...(spec.cursor !== undefined ? [{kind: 'solids', operation: 'set-cursor', cursor: spec.cursor} as const] : []),
];

const solidsStackScene = (id: string, spec: SolidsStackSpec, sl: string, en: string): LessonScene =>
    ({id, basedOn: 'demonstration-default', actions: solidsStackActions(id, spec), expectedState: text(sl, en)});

/** SV3. Shear 6 is 1,5 on the slider, 12 is 3; cursor 20 is 50 %. The prism has height 3 (z from -1,5 to 1,5), the cone height 4. Steps 1-3 open at
 * `SV3_STRAIGHT` (no shear note on screen); `SV3_SHEARED` and `SV3_STEEP` are the states the learner produces. */
export const SV3_STRAIGHT: SolidsStackSpec = {solid: 'square-prism', shear: 0, cursor: 20};
export const SV3_SHEARED: SolidsStackSpec = {solid: 'square-prism', shear: 6, cursor: 20};
export const SV3_STEEP: SolidsStackSpec = {solid: 'square-prism', shear: 12, cursor: 20};
export const SV3_FAILING: SolidsStackSpec = {solid: 'cone', cursor: 20};
export const SV3_FREE: SolidsStackSpec = {solid: 'square-prism', shear: 6, discs: 12, cursor: 20};

// ---- Formulas ----------------------------------------------------------------------------------------------------------------------

const formulas: readonly FormulaBlock[] = [
    {
        id: 'solids-cavalieri',
        latex: '\\left(A_{1}(z)=A_{2}(z)\\ \\text{for every } z\\right)\\Rightarrow V_{1}=V_{2}',
        notation: text(
            '\\(A_1(z)\\) in \\(A_2(z)\\) sta ploščini preseka prvega in drugega telesa z vodoravno ravnino na višini \\(z\\); obe telesi ležita med istima vodoravnima ravninama. \\(V_1\\) in \\(V_2\\) sta prostornini.',
            '\\(A_1(z)\\) and \\(A_2(z)\\) are the areas of the sections of the first and second solid by the horizontal plane at height \\(z\\); both solids lie between the same two horizontal planes. \\(V_1\\) and \\(V_2\\) are the volumes.',
        ),
        explanation: text(
            'Cavalierijevo pravilo. Predpostavka: telesi ležita med istima vodoravnima ravninama in imata na vsaki višini enaki ploščini preseka. Sklep: telesi imata enaki prostornini. Pravilo govori le v to smer: če se ploščini preseka razlikujeta, pravilo o prostorninah ne pove nič, ne da so enaki in ne da so različni.',
            'The Cavalieri principle. Hypothesis: the solids lie between the same two horizontal planes and have equal section areas at every height. Conclusion: the solids have equal volumes. The principle goes in this direction only: if the section areas differ, it says nothing about the volumes, neither that they are equal nor that they differ.',
        ),
    },
];

// ---- SV3 ---------------------------------------------------------------------------------------------------------------------------

const sv3Steps: readonly GuidedLessonStep[] = [
    step({
        id: 'sv3-stack', order: 1,
        title: text('Sklad plošč in poševni sklad', 'A stack of slabs and a slanted stack'),
        purpose: text('Napovedati, kaj se zgodi s prostornino sklada, ko ga poševno potisnemo.', 'Predicting what happens to the volume of a stack when it is pushed slanted.'),
        explanation: text(
            'Štiristrana prizma z osnovno ploskvijo \\(2\\times2\\) in višino \\(3\\) je razrezana na vodoravne plošče. Graf kaže dva sklada: prvi je raven, drugi je njegova kopija, ki jo drsnik Strižba pomika vstran. Zdaj je Strižba \\(0\\), zato sta oba sklada ravna in enaka. Vrstici Prostornina sta tako enaki že zato, napoved pa se ne nanaša na to stanje. Zapiši napoved: ali se prostornina poševnega sklada spremeni, ko Strižbo nastaviš na \\(1{,}5\\)? Utemelji ploščo za ploščo: kaj se zgodi z vsako ploščo, ko jo premakneš vstran?',
            'The square prism with a \\(2\\times2\\) base and height \\(3\\) is cut into horizontal slabs. The graph shows two stacks: the first is straight, the second is its copy, which the slider Shear moves sideways. Now Shear is \\(0\\), so both stacks are straight and equal. The two Volume rows are equal for that reason alone, and the prediction does not concern this state. Write down a prediction: does the volume of the slanted stack change when you set Shear to \\(1{,}5\\)? Give the reason slab by slab: what happens to each slab when you push it sideways?',
        ),
        formulaIds: [],
        observationPrompt: text(
            'Z drsnikom Strižba nastavi \\(1{,}5\\) in preberi vrstice Prostornina: ravno telo in Prostornina: poševno telo (mreža in natančno). Primerjaj z napovedjo in opiši, kaj se je zgodilo s ploščami.',
            'Set the slider Shear to \\(1{,}5\\) and read the rows Volume: straight solid and Volume: oblique solid (mesh and exact). Compare with your prediction and describe what happened to the slabs.',
        ),
        expectedObservations: [text(
            'Pri Strižbi \\(1{,}5\\) so vse štiri vrstice Prostornina še vedno \\(12\\), čeprav je drugi sklad poševen: obrisi plošč so premaknjeni vstran, vsaka plošča je enako velika kot prej. Pod odčitki se pokaže opomba o strižbi.',
            'At Shear \\(1{,}5\\) all four Volume rows are still \\(12\\), although the second stack is slanted: the slab outlines are moved sideways, each slab is as large as before. A note about the shear appears under the readouts.',
        )],
        scene: solidsStackScene('sv3-stack-scene', SV3_STRAIGHT,
            'Štiristrana prizma, način Cavalierijevo pravilo, Strižba \\(0\\), višina rezine \\(50\\,\\%\\): obe prostornini sta \\(12\\), obe ploščini rezine \\(4\\).',
            'Square prism, Cavalieri mode, Shear \\(0\\), slice height \\(50\\,\\%\\): both volumes are \\(12\\), both slice areas \\(4\\).'),
    }),
    step({
        id: 'sv3-shear', order: 2,
        title: text('Strižba na obe strani', 'Shearing both ways'),
        purpose: text('Preizkusiti napoved še pri drugih strižbah.', 'Testing the prediction at other shears.'),
        explanation: text(
            'Graf je spet pri Strižbi \\(0\\), oba sklada sta ravna. Strižba pove, za koliko se zgornja ploskev drugega sklada premakne vstran glede na spodnjo. Ploščini rezin pri izbrani višini (vrstici Ploščina rezine) se izpišeta pod odčitki. Zapiši napoved za dve nastavitvi, preden ju preizkusiš: za \\(-1{,}5\\) (na drugo stran) in za \\(3\\) (največja strižba). V katero smer in kako daleč se premakne zgornja plošča? Kaj se zgodi z vrsticama Ploščina rezine in z vrsticami Prostornina? Napoved utemelji.',
            'The graph is back at Shear \\(0\\), both stacks are straight. Shear says how far the top face of the second stack moves sideways against the bottom. The slice areas at the chosen height (the rows Slice area) are listed under the readouts. Write down a prediction for two settings before trying them: for \\(-1{,}5\\) (to the other side) and for \\(3\\) (the largest shear). In which direction and how far does the top slab move? What happens to the Slice area rows and to the Volume rows? Give a reason.',
        ),
        formulaIds: [],
        observationPrompt: text(
            'Nastavi Strižbo \\(-1{,}5\\) in nato \\(3\\); pri vsaki nastavitvi preberi obe vrstici Ploščina rezine in vse vrstice Prostornina ter opazuj obrise plošč.',
            'Set Shear to \\(-1{,}5\\) and then \\(3\\); at each setting read both Slice area rows and all Volume rows, and watch the slab outlines.',
        ),
        expectedObservations: [text(
            'Pri \\(-1{,}5\\) se zgornja plošča premakne za \\(1{,}5\\) na drugo stran, pri \\(3\\) za \\(3\\) v prvotno smer; vmesne plošče se premaknejo sorazmerno manj. Obe ploščini rezine ostaneta \\(4\\) in vse vrstice Prostornina ostanejo \\(12\\). Večja strižba telo bolj nagne, a ne spremeni ploščine rezine ne prostornine.',
            'At \\(-1{,}5\\) the top slab moves by \\(1{,}5\\) to the other side, at \\(3\\) by \\(3\\) in the first direction; the slabs in between move proportionally less. Both slice areas stay \\(4\\) and all Volume rows stay \\(12\\). A larger shear tilts the solid more, but changes neither the slice area nor the volume.',
        )],
        scene: solidsStackScene('sv3-shear-scene', SV3_STRAIGHT,
            'Štiristrana prizma, Strižba \\(0\\), višina rezine \\(50\\,\\%\\): ploščini rezine \\(4\\) in \\(4\\), prostornine \\(12\\); opombe o strižbi ni.',
            'Square prism, Shear \\(0\\), slice height \\(50\\,\\%\\): slice areas \\(4\\) and \\(4\\), volumes \\(12\\); no shear note.'),
    }),
    step({
        id: 'sv3-slices', order: 3,
        title: text('Rezino za rezino', 'Slice by slice'),
        purpose: text('Ločiti ponazoritev na eni višini od argumenta za vse višine.', 'Telling an illustration at one height from an argument for all heights.'),
        explanation: text(
            'Graf je spet pri Strižbi \\(0\\), višina primerjane rezine je \\(50\\,\\%\\) višine telesa (višina rezin \\(0\\)). Zapiši napoved: kakšni sta ploščini rezin pri \\(25\\,\\%\\) in pri \\(75\\,\\%\\) višine telesa, ko je strižba največja (\\(3\\))? Utemelji z opisom, kaj strižba naredi z eno vodoravno rezino.',
            'The graph is back at Shear \\(0\\), and the height of the compared slice is \\(50\\,\\%\\) of the height of the solid (height of the slices \\(0\\)). Write down a prediction: what are the slice areas at \\(25\\,\\%\\) and at \\(75\\,\\%\\) of the height when the shear is largest (\\(3\\))? Give the reason by describing what the shear does to one horizontal slice.',
        ),
        formulaIds: [],
        observationPrompt: text(
            'Strižbo nastavi na \\(3\\). Nato z drsnikom Višina primerjane rezine nastavi \\(25\\) in \\(75\\) in pri vsaki višini preberi Višina rezin in obe vrstici Ploščina rezine.',
            'Set Shear to \\(3\\). Then set the slider Height of the compared slice to \\(25\\) and \\(75\\) and at each height read Height of the slices and both Slice area rows.',
        ),
        expectedObservations: [
            text(
                'Višina rezin je \\(-0{,}75\\) in \\(0{,}75\\), ploščini rezin sta pri obeh višinah \\(4\\) in \\(4\\). Tri višine so ponazoritev, ne dokaz: preveri le te tri.',
                'The height of the slices is \\(-0{,}75\\) and \\(0{,}75\\), and the slice areas are \\(4\\) and \\(4\\) at both heights. Three heights are an illustration, not a proof: they check only these three.',
            ),
            text(
                'Argument za vse višine: strižba vsako vodoravno rezino premakne vstran kot celoto, zato je rezina drugega sklada na vsaki višini premaknjena kopija rezine prvega sklada. Premaknjen lik ima enako ploščino, zato sta ploščini rezin enaki na vsaki višini. To je predpostavka Cavalierijevega pravila v naslednjem koraku.',
                'Argument for all heights: the shear moves each horizontal slice sideways as a whole, so at every height the slice of the second stack is a translated copy of the slice of the first. A translated shape has the same area, so the slice areas are equal at every height. This is the hypothesis of the Cavalieri principle in the next step.',
            ),
        ],
        scene: solidsStackScene('sv3-slices-scene', SV3_STRAIGHT,
            'Štiristrana prizma, Strižba \\(0\\), višina rezine \\(50\\,\\%\\): višina rezin \\(0\\), ploščini rezine \\(4\\) in \\(4\\); opombe o strižbi ni.',
            'Square prism, Shear \\(0\\), slice height \\(50\\,\\%\\): height of the slices \\(0\\), slice areas \\(4\\) and \\(4\\); no shear note.'),
    }),
    step({
        id: 'sv3-failing', order: 4,
        title: text('Stožec in valj', 'A cone and a cylinder'),
        purpose: text('Preizkusiti, kaj sledi, če se ploščini rezin razlikujeta.', 'Testing what follows when the slice areas differ.'),
        explanation: text(
            'Graf zdaj kaže stožec (levo) in valj (desno) z enako višino \\(4\\) in enakim polmerom osnovne ploskve \\(3\\). Drsnika Strižba pri tem paru ni (telesi se ne strižeta). Vrh stožca je zgoraj. Pri \\(50\\,\\%\\) višine vrstici Ploščina rezine kažeta približno \\(7{,}04841\\) in \\(28{,}19366\\), torej je rezina stožca četrtina rezine valja. Zapiši napoved: kolikšen del ploščine rezine valja je ploščina rezine stožca pri \\(25\\,\\%\\) in pri \\(75\\,\\%\\) višine? Utemelji s polmerom rezine stožca, ki se proti vrhu enakomerno manjša.',
            'The graph now shows a cone (left) and a cylinder (right) of the same height \\(4\\) and the same base radius \\(3\\). There is no Shear slider for this pair (the solids are not sheared). The apex of the cone is at the top. At \\(50\\,\\%\\) of the height the Slice area rows show about \\(7{,}04841\\) and \\(28{,}19366\\), so the slice of the cone is a quarter of the slice of the cylinder. Write down a prediction: what fraction of the slice area of the cylinder is the slice area of the cone at \\(25\\,\\%\\) and at \\(75\\,\\%\\) of the height? Give the reason by the radius of the slice of the cone, which shrinks evenly towards the apex.',
        ),
        formulaIds: [],
        observationPrompt: text(
            'Višino primerjane rezine nastavi na \\(25\\) in \\(75\\) ter pri vsaki preberi obe vrstici Ploščina rezine in izračunaj razmerje. Nato se vprašaj: kaj lahko iz primerjave rezin sklepaš o prostorninah, ko sta ploščini različni? Preberi vrstici Prostornina: stožec (natančno) in Prostornina: valj (natančno) ter opombo pod odčitki.',
            'Set the height of the compared slice to \\(25\\) and \\(75\\), read both Slice area rows at each and compute the ratio. Then ask: what can you conclude about the volumes from comparing slices when the areas differ? Read the rows Volume: cone (exact) and Volume: cylinder (exact) and the note under the readouts.',
        ),
        expectedObservations: [
            text(
                'Ploščina rezine stožca je približno \\(15{,}85893\\), \\(7{,}04841\\) in \\(1{,}7621\\), ploščina rezine valja je na vseh treh višinah \\(28{,}19366\\): ploščini se razlikujeta na vsaki od teh višin. Pri deležu višine \\(t\\) je polmer rezine stožca \\(3(1-t)\\), zato je razmerje ploščin \\((1-t)^2\\): \\(\\tfrac{9}{16}\\) pri \\(25\\,\\%\\) in \\(\\tfrac{1}{16}\\) pri \\(75\\,\\%\\). Odčitki so vrednosti mreže (48-kotnik, zato malo pod \\(9\\pi\\approx28{,}27433\\) za valj).',
                'The slice area of the cone is about \\(15{,}85893\\), \\(7{,}04841\\) and \\(1{,}7621\\), and that of the cylinder is \\(28{,}19366\\) at all three heights: the areas differ at each of these heights. At the fraction \\(t\\) of the height the radius of the slice of the cone is \\(3(1-t)\\), so the ratio of the areas is \\((1-t)^2\\): \\(\\tfrac{9}{16}\\) at \\(25\\,\\%\\) and \\(\\tfrac{1}{16}\\) at \\(75\\,\\%\\). The readouts are mesh values (a 48-gon, so slightly under \\(9\\pi\\approx28{,}27433\\) for the cylinder).',
            ),
            text(
                'Natančni prostornini sta \\(12\\pi\\approx37{,}69911\\) (stožec) in \\(36\\pi\\approx113{,}09734\\) (valj). Da se tu razlikujeta, ni posledica različnih ploščin: pravilo ima za predpostavko enaki ploščini na vsaki višini, ki tu ni izpolnjena, zato ne pove nič, ne da sta prostornini enaki ne da sta različni.',
                'The exact volumes are \\(12\\pi\\approx37{,}69911\\) (cone) and \\(36\\pi\\approx113{,}09734\\) (cylinder). That they differ here is not a consequence of the different areas: the principle has equal areas at every height as its hypothesis, which fails here, so it says nothing, neither that the volumes are equal nor that they differ.',
            ),
        ],
        scene: solidsStackScene('sv3-failing-scene', SV3_FAILING,
            'Stožec (levo) in valj (desno), višina rezine \\(50\\,\\%\\): ploščini rezine približno \\(7{,}04841\\) in \\(28{,}19366\\), natančni prostornini \\(37{,}69911\\) in \\(113{,}09734\\).',
            'Cone (left) and cylinder (right), slice height \\(50\\,\\%\\): slice areas about \\(7{,}04841\\) and \\(28{,}19366\\), exact volumes \\(37{,}69911\\) and \\(113{,}09734\\).'),
    }),
    step({
        id: 'sv3-free', order: 5,
        title: text('Prosto raziskovanje', 'Free exploration'),
        purpose: text('Sami preizkusiti, kaj štetje plošč, strižba in izbira telesa spremenijo.', 'Trying what the number of slabs, the shear and the choice of solid change.'),
        explanation: text(
            'Graf kaže sklad dvanajstih plošč (Število plošč je \\(12\\)) in Strižbo \\(1{,}5\\); to je kot dva sklada dvanajstih kovancev, ravno in poševno, le s kvadratnimi ploščami. Cavalierijevo pravilo je zdaj v obliki predpostavke in sklepa. Zapiši napoved, preden kaj spremeniš: ali se vrstice Prostornina spremenijo, če Število plošč nastaviš na \\(3\\)? In kaj, če za Telo izbereš kocko?',
            'The graph shows a stack of twelve slabs (Number of slabs is \\(12\\)) and Shear \\(1{,}5\\); it is like two stacks of twelve coins, straight and slanted, only with square slabs. The Cavalieri principle is now stated as a hypothesis and a conclusion. Write down a prediction before you change anything: do the Volume rows change if you set Number of slabs to \\(3\\)? And if you choose the cube as the Solid?',
        ),
        formulaIds: ['solids-cavalieri'],
        observationPrompt: text(
            'Preizkusi Število plošč, Strižbo, Višino primerjane rezine in izbiro Telo (kocka, štiristrana prizma, stožec). Pri vsaki spremembi preberi vrstice Prostornina in Ploščina rezine ter se vprašaj, katera predpostavka pravila velja.',
            'Try Number of slabs, Shear, Height of the compared slice and the choice of Solid (cube, square prism, cone). After each change read the Volume and Slice area rows and ask which hypothesis of the principle holds.',
        ),
        expectedObservations: [text(
            'Število plošč spremeni le število obrisov plošč: vrstice Prostornina ostanejo enake. Pri kocki in prizmi strižba ne spremeni ne ploščine rezine ne prostornine; pri stožcu in valju ploščini rezin nista enaki in pravilo ne pove nič o prostorninah.',
            'The number of slabs only changes the number of slab outlines: the Volume rows stay the same. For the cube and the prism the shear changes neither the slice area nor the volume; for the cone and the cylinder the slice areas are not equal and the principle says nothing about the volumes.',
        )],
        scene: solidsStackScene('sv3-free-scene', SV3_FREE,
            'Štiristrana prizma, Strižba \\(1{,}5\\), Število plošč \\(12\\), višina rezine \\(50\\,\\%\\): prostornini \\(12\\), ploščini rezine \\(4\\).',
            'Square prism, Shear \\(1{,}5\\), Number of slabs \\(12\\), slice height \\(50\\,\\%\\): volumes \\(12\\), slice areas \\(4\\).'),
    }),
];

const sources: GuidedLesson['sources'] = [
    {
        id: 'bezeg-solids-implementation',
        citation: 'Bezeg source: src/solids/ (the solid meshes, the shear, the section area from its loop, the mesh volume) and src/graphs/solids/SolidsGraph.tsx, stack mode.',
        implementationCorrespondence: 'A scene sets the stack mode, the solid, the shear in units of 1/4, the number of slabs and the height of the compared slice; the volumes come from signed tetrahedra of the mesh (the exact values from formulas) and the slice areas from the section loop at the chosen height.',
    },
];

const edgeCases: readonly LocalizedText[] = [
    text('Strižba je na mreži \\(0{,}25\\) od \\(-3\\) do \\(3\\); pri stožcu in valju je ni. Višina primerjane rezine je od \\(2{,}5\\,\\%\\) do \\(97{,}5\\,\\%\\) v korakih \\(2{,}5\\,\\%\\); Število plošč je od \\(1\\) do \\(60\\).', 'Shear is on the grid \\(0{,}25\\) from \\(-3\\) to \\(3\\); the cone and cylinder pair has none. The height of the compared slice runs from \\(2{,}5\\,\\%\\) to \\(97{,}5\\,\\%\\) in steps of \\(2{,}5\\,\\%\\); Number of slabs runs from \\(1\\) to \\(60\\).'),
    text('Prostornine mreže stožca in valja so malo pod natančnimi, ker mreža nadomesti krog z včrtanim \\(48\\)-kotnikom.', 'The mesh volumes of the cone and the cylinder are slightly below the exact ones, because the mesh replaces the circle with an inscribed \\(48\\)-gon.'),
];

const solidsCavalieri: GuidedLesson = {
    demonstrationId: 'solids',
    title: text('Cavalierijevo pravilo', 'The Cavalieri principle'),
    summary: text(
        'Telo razrežemo na vodoravne plošče, poševno kopijo dobimo s strižbo, rezine primerjamo po ploščini in preverimo, kdaj iz primerjave rezin sledi kaj o prostornini in kdaj ne. Primerjamo štiristrano prizmo in njeno poševno kopijo ter stožec in valj.',
        'A solid is cut into horizontal slabs, a slanted copy is made by a shear, slices are compared by area, and we check when comparing slices tells anything about volume and when it does not. We compare a square prism with its slanted copy and a cone with a cylinder.',
    ),
    prerequisites: [text('Prostornina prizme in valja, ploščina lika.', 'The volume of a prism and a cylinder, the area of a shape.')],
    learningGoals: [
        text('Znaš napovedati, da strižba ne spremeni prostornine, in to utemeljiti s premikom vsake rezine.', 'Can predict that a shear does not change the volume and justify it by the sideways move of every slice.'),
        text('Znaš povedati Cavalierijevo pravilo kot predpostavko in sklep ter razložiti, zakaj pri različnih ploščinah rezin ne sledi nič.', 'Can state the Cavalieri principle as a hypothesis and a conclusion and explain why nothing follows when the slice areas differ.'),
    ],
    formulaBlocks: [formulas[0]],
    workedExamples: [],
    steps: sv3Steps,
    sources,
    edgeCases,
    unresolvedQuestions: [],
};

export const solidsCavalieriLesson: GuidedLesson = solidsCavalieri;

// ---- SV4 ---------------------------------------------------------------------------------------------------------------------------
// SV4, the volumes of the pyramid and the cone, on `solids` in volume mode (the unit cube, optionally cut into three pyramids; the square pyramid 4 x 4 x 4) and in revolve mode (the cone
// r = 3, h = 4 turned about the x axis and cut into midpoint discs, `solidsScene.ts:328`). Every number the text quotes is a readout (.command-logs/solids-b/probe.txt, probe2-sv4.txt) or
// exact arithmetic in the same step. The cube cut is a readout; the argument that the three pyramids are congruent and fill the cube is made in step 3.

/** What a volume or revolve scene sets on top of the Demonstration default: the mode, the solid and optionally the cube cut, the revolve axis and the disc count. */
export interface SolidsVolumeSpec {
    readonly mode: 'volume' | 'revolve';
    readonly solid: 'cube' | 'square-pyramid' | 'cone';
    readonly pyramids?: boolean;
    readonly axis?: 'x' | 'y';
    readonly discs?: number;
}

/** The actions of a volume or revolve scene: the Demonstration default, then mode, solid and the fields the spec names (the cube cut last, since it applies to the cube in volume mode only). */
export const solidsVolumeActions = (id: string, spec: SolidsVolumeSpec): LessonAction[] => [
    {kind: 'prepared-scene', sceneId: id, source: 'demonstration-default'},
    {kind: 'solids', operation: 'set-mode', mode: spec.mode},
    {kind: 'solids', operation: 'set-solid', solid: spec.solid},
    ...(spec.axis !== undefined ? [{kind: 'solids', operation: 'set-axis', axis: spec.axis} as const] : []),
    ...(spec.discs !== undefined ? [{kind: 'solids', operation: 'set-discs', discs: spec.discs} as const] : []),
    ...(spec.pyramids !== undefined ? [{kind: 'solids', operation: 'set-pyramids', pyramids: spec.pyramids} as const] : []),
];

const solidsVolumeScene = (id: string, spec: SolidsVolumeSpec, sl: string, en: string): LessonScene =>
    ({id, basedOn: 'demonstration-default', actions: solidsVolumeActions(id, spec), expectedState: text(sl, en)});

/** SV4. The unit cube (volume 1), the cube cut into three pyramids (each 1/3), the cone r = 3, h = 4 turned about the x axis (4 discs, then 10 for the free step). */
export const SV4_CUBE: SolidsVolumeSpec = {mode: 'volume', solid: 'cube'};
export const SV4_SPLIT: SolidsVolumeSpec = {mode: 'volume', solid: 'cube', pyramids: true};
export const SV4_CONE: SolidsVolumeSpec = {mode: 'revolve', solid: 'cone', axis: 'x', discs: 4};
export const SV4_FREE: SolidsVolumeSpec = {mode: 'revolve', solid: 'cone', axis: 'x', discs: 10};

const sv4Formulas: readonly FormulaBlock[] = [
    {
        id: 'solids-pyramid-volume',
        latex: 'V=\\frac{1}{3}\\,B\\,h',
        notation: text(
            '\\(V\\) je prostornina piramide, \\(B\\) ploščina njene osnovne ploskve in \\(h\\) njena višina (razdalja vrha od ravnine osnovne ploskve).',
            '\\(V\\) is the volume of the pyramid, \\(B\\) the area of its base and \\(h\\) its height (the distance of the apex from the plane of the base).',
        ),
        explanation: text(
            'Prostornina piramide je tretjina prostornine prizme z isto osnovno ploskvijo in isto višino. Za kocko in tri piramide s skupnim vrhom je to izpeljano v prejšnjem koraku; razširitev na druge osnovne ploskve je navedena, tu ni dokazana.',
            'The volume of a pyramid is a third of the volume of the prism with the same base and the same height. For the cube and three pyramids with a common apex it is derived in the previous step; the extension to other bases is stated, not proved.',
        ),
    },
    {
        id: 'solids-disc-sum',
        latex: 'S_{n}=\\sum_{k=1}^{n}\\pi\\left(\\frac{3x_{k}}{4}\\right)^{2}\\cdot\\frac{4}{n},\\qquad x_{k}=\\left(k-\\frac{1}{2}\\right)\\frac{4}{n}',
        notation: text(
            '\\(S_n\\) je vsota prostornin \\(n\\) diskov debeline \\(\\tfrac4n\\); \\(x_k\\) je sredina \\(k\\)-tega odseka intervala \\([0,4]\\), \\(\\tfrac{3x_k}{4}\\) pa polmer diska na tej sredini.',
            '\\(S_n\\) is the sum of the volumes of \\(n\\) discs of thickness \\(\\tfrac4n\\); \\(x_k\\) is the midpoint of the \\(k\\)-th part of the interval \\([0,4]\\), and \\(\\tfrac{3x_k}{4}\\) is the radius of the disc at that midpoint.',
        ),
        explanation: text(
            'Vsota diskov za stožec s polmerom osnovne ploskve \\(3\\) in višino \\(4\\), zavrten okoli osi \\(x\\), po sredinskem pravilu. Je približek prostornine z valji, ne argument za tretjino.',
            'The disc sum for the cone with base radius \\(3\\) and height \\(4\\), turned about the \\(x\\) axis, by the midpoint rule. It is an approximation of the volume by cylinders, not an argument for the third.',
        ),
    },
];

const sv4Steps: readonly GuidedLessonStep[] = [
    step({
        id: 'sv4-cube', order: 1,
        title: text('Kocka in tri piramide', 'The cube and three pyramids'),
        purpose: text('Napovedati prostornino ene piramide, ki je del kocke.', 'Predicting the volume of one pyramid that is a part of the cube.'),
        explanation: text(
            'Graf kaže enotsko kocko (rob \\(1\\)) v načinu Prostornina telesa; stikalo Razreži kocko na tri piramide je izklopljeno. Kocko je mogoče razrezati na tri skladne piramide s skupnim vrhom \\((1,1,1)\\); njihove osnovne ploskve so ploskve kocke \\(x=0\\), \\(y=0\\) in \\(z=0\\). Vsaka ima osnovno ploskev ploščine \\(B=1\\) in višino \\(h=1\\) (razdalja vrha od ravnine osnovne ploskve), prizma z isto osnovno ploskvijo in višino pa ima prostornino \\(B\\cdot h=1\\). Zapiši napoved: kolikšna je prostornina ene od teh treh piramid in kako se primerja z \\(B\\cdot h\\)? Utemelji brez formule za prostornino piramide.',
            'The graph shows the unit cube (edge \\(1\\)) in the mode Volume of a solid; the switch Cut the cube into three pyramids is off. The cube can be cut into three congruent pyramids with the common apex \\((1,1,1)\\); their bases are the faces \\(x=0\\), \\(y=0\\) and \\(z=0\\) of the cube. Each has a base of area \\(B=1\\) and height \\(h=1\\) (the distance of the apex from the plane of the base), and the prism with the same base and height has volume \\(B\\cdot h=1\\). Write down a prediction: what is the volume of one of these three pyramids and how does it compare with \\(B\\cdot h\\)? Give a reason without the formula for the volume of a pyramid.',
        ),
        formulaIds: [],
        observationPrompt: text(
            'Preberi vrstici Prostornina (mreža) in Prostornina (natančno) za kocko. Zapiši napoved za prostornino ene piramide in razlog; v naslednjem koraku jo preveriš.',
            'Read the rows Volume (mesh) and Volume (exact) for the cube. Write down your prediction for the volume of one pyramid and the reason; you check it in the next step.',
        ),
        expectedObservations: [text(
            'Obe vrstici kažeta \\(1\\), prostornino cele kocke. Prostornine posamezne piramide graf zdaj še ne kaže; preveriš jo v naslednjem koraku.',
            'Both rows show \\(1\\), the volume of the whole cube. The graph does not show the volume of a single pyramid yet; you check it in the next step.',
        )],
        scene: solidsVolumeScene('sv4-cube-scene', SV4_CUBE,
            'Kocka, način Prostornina telesa, stikalo izklopljeno: obe prostornini \\(1\\).',
            'Cube, mode Volume of a solid, switch off: both volumes \\(1\\).'),
    }),
    step({
        id: 'sv4-split', order: 2,
        title: text('Kocka, razrezana na piramide', 'The cube cut into pyramids'),
        purpose: text('Primerjati napoved z odčitki treh piramid.', 'Comparing the prediction with the readouts of the three pyramids.'),
        explanation: text(
            'Stikalo Razreži kocko na tri piramide je še izklopljeno. Ko ga vklopiš, graf nariše tri piramide, vsako pomaknjeno navzven za četrtino njene višine, in vsaki prikaže prostornino mreže. Zapiši še eno napoved: ali premik navzven spremeni prostornino katere od piramid in kaj bo kazala vrstica Vsota prostornin treh piramid v primerjavi s prostornino kocke \\(1\\)? Utemelji.',
            'The switch Cut the cube into three pyramids is still off. When you turn it on, the graph draws three pyramids, each pulled outward by a quarter of its height, and shows the mesh volume of each. Write down one more prediction: does the move outward change the volume of any pyramid, and what will the row Sum of the three pyramid volumes show compared with the volume \\(1\\) of the cube? Give a reason.',
        ),
        formulaIds: [],
        observationPrompt: text(
            'Vklopi stikalo Razreži kocko na tri piramide. Preberi vrstice Piramida 1: prostornina mreže, Piramida 2 in Piramida 3 ter Vsota prostornin treh piramid; primerjaj z obema napovedma.',
            'Turn on the switch Cut the cube into three pyramids. Read the rows Pyramid 1: volume (mesh), Pyramid 2 and Pyramid 3, and Sum of the three pyramid volumes; compare with both predictions.',
        ),
        expectedObservations: [text(
            'Vsaka od treh piramid ima prostornino mreže približno \\(0{,}33333\\) (to je \\(\\tfrac13\\), zaokroženo), vsota treh pa je \\(1\\), prostornina kocke. Premik navzven prostornin ne spremeni: vsaka piramida je le pomaknjena, ne spremenjena. Tri enake prostornine z vsoto \\(1\\) so tri tretjine, a ali so piramide res skladne in kocko res napolnijo, pokaže šele naslednji korak.',
            'Each of the three pyramids has a mesh volume of about \\(0{,}33333\\) (that is \\(\\tfrac13\\), rounded), and the sum of the three is \\(1\\), the volume of the cube. The move outward changes no volume: each pyramid is only moved, not changed. Three equal volumes with sum \\(1\\) are three thirds, but whether the pyramids really are congruent and really fill the cube is shown only in the next step.',
        )],
        scene: solidsVolumeScene('sv4-split-scene', SV4_CUBE,
            'Kocka, način Prostornina telesa, stikalo izklopljeno: obe prostornini \\(1\\).',
            'Cube, mode Volume of a solid, switch off: both volumes \\(1\\).'),
    }),
    step({
        id: 'sv4-argument', order: 3,
        title: text('Zakaj so piramide skladne', 'Why the pyramids are congruent'),
        purpose: text('Ločiti odčitek od argumenta, da so piramide skladne in kocko napolnijo brez prekrivanja.', 'Telling a readout from the argument that the pyramids are congruent and fill the cube without overlap.'),
        explanation: text(
            'Zdaj so piramide razmaknjene in odčitki so vrednosti mreže. To je odčitek, ne argument; tudi opomba pod odčitki in pomoč stikala to le trdita. Točka \\((0{,}5;\\,0{,}2;\\,0{,}9)\\) leži v kocki. Zapiši napoved: v kateri od treh piramid (osnovna ploskev \\(x=0\\), \\(y=0\\) ali \\(z=0\\)) leži? Ali lahko kaka točka kocke leži v dveh piramidah ali v nobeni? In kako bi pokazal, da sta dve od piramid skladni?',
            'Now the pyramids are pulled apart and the readouts are mesh values. That is a readout, not an argument; the note under the readouts and the help of the switch only assert it too. The point \\((0{,}5;\\,0{,}2;\\,0{,}9)\\) lies in the cube. Write down a prediction: in which of the three pyramids (base \\(x=0\\), \\(y=0\\) or \\(z=0\\)) does it lie? Can a point of the cube lie in two pyramids, or in none? And how would you show that two of the pyramids are congruent?',
        ),
        formulaIds: [],
        observationPrompt: text(
            'Preberi vrstice Piramida 1, 2 in 3 ter Vsota prostornin treh piramid. Zapiši argument: kdaj točka leži v piramidi z osnovno ploskvijo \\(x=0\\), zakaj sta dve piramidi skladni in zakaj se ne prekrivata.',
            'Read the rows Pyramid 1, 2 and 3 and Sum of the three pyramid volumes. Write down the argument: when does a point lie in the pyramid with base \\(x=0\\), why are two pyramids congruent and why do they not overlap.',
        ),
        expectedObservations: [
            text(
                'Piramida z osnovno ploskvijo \\(x=0\\) in vrhom \\((1,1,1)\\) vsebuje točke kocke z \\(y\\ge x\\) in \\(z\\ge x\\): na višini \\(x\\) je njen presek kvadrat \\([x,1]\\times[x,1]\\), ki se do vrha skrči v točko. Piramida z osnovno ploskvijo \\(y=0\\) vsebuje točke z \\(x\\ge y\\) in \\(z\\ge y\\), tretja točke z \\(x\\ge z\\) in \\(y\\ge z\\). Točka \\((0{,}5;\\,0{,}2;\\,0{,}9)\\) ima najmanjšo koordinato \\(y=0{,}2\\), zato leži v piramidi z osnovno ploskvijo \\(y=0\\).',
                'The pyramid with base \\(x=0\\) and apex \\((1,1,1)\\) contains the points of the cube with \\(y\\ge x\\) and \\(z\\ge x\\): at height \\(x\\) its section is the square \\([x,1]\\times[x,1]\\), which shrinks to a point at the apex. The pyramid with base \\(y=0\\) contains the points with \\(x\\ge y\\) and \\(z\\ge y\\), the third the points with \\(x\\ge z\\) and \\(y\\ge z\\). The point \\((0{,}5;\\,0{,}2;\\,0{,}9)\\) has the smallest coordinate \\(y=0{,}2\\), so it lies in the pyramid with base \\(y=0\\).',
            ),
            text(
                'Argument: vsaka točka kocke ima najmanjšo koordinato in leži v piramidi, katere osnovna ploskev je pripadajoča ploskev kocke; če sta dve koordinati enaki najmanjši, je točka na skupni meji, ki nima prostornine. Piramide zato kocko napolnijo brez prekrivanja. Zamenjava koordinat \\(x\\) in \\(y\\) je zrcaljenje, ohranja prostornino in preslika piramido z osnovno ploskvijo \\(x=0\\) v piramido z osnovno ploskvijo \\(y=0\\); podobno za druge pare. Piramide so torej skladne in imajo enake prostornine, tri enake prostornine z vsoto \\(1\\) pa so vsaka \\(\\tfrac13\\), kar je \\(\\tfrac13\\cdot B\\cdot h\\) za \\(B=1\\), \\(h=1\\).',
                'Argument: every point of the cube has a smallest coordinate and lies in the pyramid whose base is the matching face of the cube; if two coordinates are equally smallest, the point is on a shared boundary, which has no volume. So the pyramids fill the cube without overlap. Swapping the coordinates \\(x\\) and \\(y\\) is a reflection, preserves volume and maps the pyramid with base \\(x=0\\) onto the pyramid with base \\(y=0\\); likewise for the other pairs. So the pyramids are congruent and have equal volumes, and three equal volumes with sum \\(1\\) are \\(\\tfrac13=\\tfrac13\\cdot B\\cdot h\\) for \\(B=1\\), \\(h=1\\).',
            ),
            text(
                'Razširitev, tu ne dokazana: raztegi koordinat s faktorji \\(a\\), \\(b\\), \\(c\\) pomnožijo vsako prostornino z \\(abc\\), pa tudi \\(B\\cdot h\\), zato \\(V=\\tfrac13Bh\\) velja za vsako piramido s pravokotno osnovno ploskvijo in vrhom nad ogliščem. Za druge osnovne ploskve in vrh drugje velja po Cavalierijevem pravilu: rezina na višini \\(z\\) je osnovna ploskev, pomanjšana s faktorjem \\(1-\\tfrac zh\\), torej ima ploščino \\(B\\left(1-\\tfrac zh\\right)^2\\), ki je za enaka \\(B\\) in \\(h\\) enaka na vsaki višini.',
                'An extension, not proved here: stretching the coordinates by factors \\(a\\), \\(b\\), \\(c\\) multiplies every volume by \\(abc\\), and \\(B\\cdot h\\) too, so \\(V=\\tfrac13Bh\\) holds for every pyramid with a rectangular base and the apex above a vertex. For other bases and an apex elsewhere it follows from the Cavalieri principle: the slice at height \\(z\\) is the base scaled by the factor \\(1-\\tfrac zh\\), so it has area \\(B\\left(1-\\tfrac zh\\right)^2\\), which is the same at every height for equal \\(B\\) and \\(h\\).',
            ),
        ],
        scene: solidsVolumeScene('sv4-argument-scene', SV4_SPLIT,
            'Kocka, način Prostornina telesa, stikalo vklopljeno: Piramida 1, 2, 3 po približno \\(0{,}33333\\), vsota \\(1\\).',
            'Cube, mode Volume of a solid, switch on: Pyramid 1, 2, 3 about \\(0{,}33333\\) each, sum \\(1\\).'),
    }),
    step({
        id: 'sv4-square-pyramid', order: 4,
        title: text('Štiristrana piramida', 'A square pyramid'),
        purpose: text('Preizkusiti formulo na piramidi, ki ni del kocke.', 'Testing the formula on a pyramid that is not a part of the cube.'),
        explanation: text(
            'Graf še kaže kocko in tri piramide. Štiristrana piramida v izbiri Telo ima kvadratno osnovno ploskev s stranico \\(4\\) in višino \\(4\\); njen vrh je nad središčem osnovne ploskve, ne nad ogliščem. Zapiši napoved: kolikšno prostornino da formula \\(\\tfrac13Bh\\) za to piramido in kaj pričakuješ v vrsticah Prostornina (mreža) in Prostornina (natančno)? Kaj pomeni, da je vrh nad središčem, za formulo, ki smo jo utemeljili za kocko?',
            'The graph still shows the cube and three pyramids. The Square pyramid in the choice Solid has a square base of side \\(4\\) and height \\(4\\); its apex is above the centre of the base, not above a vertex. Write down a prediction: what volume does the formula \\(\\tfrac13Bh\\) give for this pyramid, and what do you expect in the rows Volume (mesh) and Volume (exact)? What does the apex being above the centre mean for the formula we justified for the cube?',
        ),
        formulaIds: ['solids-pyramid-volume'],
        observationPrompt: text(
            'V izbiri Telo izberi Štiristrana piramida (način Prostornina telesa ostane). Preberi obe vrstici Prostornina in ju primerjaj z napovedjo.',
            'In the choice Solid pick Square pyramid (the mode Volume of a solid stays). Read both Volume rows and compare them with your prediction.',
        ),
        expectedObservations: [text(
            'Obe vrstici kažeta približno \\(21{,}33333\\), natančno \\(\\tfrac{64}{3}\\): \\(B=16\\), \\(h=4\\) in \\(\\tfrac13\\cdot16\\cdot4=\\tfrac{64}{3}\\). Formula velja tudi za piramido z vrhom nad središčem, kar je skladno z razširitvijo iz prejšnjega koraka; en primer to potrjuje, ne dokazuje. Stikalo Razreži kocko na tri piramide je zdaj nedostopno, ker velja le za kocko.',
            'Both rows show about \\(21{,}33333\\), exactly \\(\\tfrac{64}{3}\\): \\(B=16\\), \\(h=4\\) and \\(\\tfrac13\\cdot16\\cdot4=\\tfrac{64}{3}\\). The formula holds for a pyramid with the apex above the centre as well, which agrees with the extension in the previous step; one example confirms it, it does not prove it. The switch Cut the cube into three pyramids is now unavailable, because it applies to the cube only.',
        )],
        scene: solidsVolumeScene('sv4-square-pyramid-scene', SV4_SPLIT,
            'Kocka, način Prostornina telesa, stikalo vklopljeno: Piramida 1, 2, 3 po približno \\(0{,}33333\\), vsota \\(1\\).',
            'Cube, mode Volume of a solid, switch on: Pyramid 1, 2, 3 about \\(0{,}33333\\) each, sum \\(1\\).'),
    }),
    step({
        id: 'sv4-cone', order: 5,
        title: text('Stožec kot sklad diskov', 'The cone as a stack of discs'),
        purpose: text('Napovedati, kako se vsota diskov približuje prostornini.', 'Predicting how the disc sum approaches the volume.'),
        explanation: text(
            'Stožec s polmerom osnovne ploskve \\(3\\) in višino \\(4\\) nastane z vrtenjem daljice \\(y=\\tfrac{3x}{4}\\), \\(0\\le x\\le4\\), okoli osi \\(x\\). Razrežemo ga na \\(n\\) diskov debeline \\(\\tfrac4n\\); polmer diska je vrednost \\(\\tfrac{3x}{4}\\) na sredini njegovega odseka. Zdaj je Število diskov \\(4\\), vsota diskov je približno \\(37{,}11006\\), natančna prostornina pa \\(12\\pi\\approx37{,}69911\\). Zapiši napoved: kaj se zgodi z vsoto diskov, ko Število diskov nastaviš na \\(10\\) in nato na \\(60\\)? Ali raste ali pada, ali ostane pod natančno vrednostjo in kako blizu ji pride? Utemelji.',
            'The cone with base radius \\(3\\) and height \\(4\\) is made by turning the segment \\(y=\\tfrac{3x}{4}\\), \\(0\\le x\\le4\\), about the \\(x\\) axis. It is cut into \\(n\\) discs of thickness \\(\\tfrac4n\\); the radius of a disc is the value of \\(\\tfrac{3x}{4}\\) at the midpoint of its part. Now Number of discs is \\(4\\), the sum of the discs is about \\(37{,}11006\\) and the exact volume is \\(12\\pi\\approx37{,}69911\\). Write down a prediction: what happens to the sum of the discs when you set Number of discs to \\(10\\) and then to \\(60\\)? Does it grow or fall, does it stay below the exact value, and how close does it come? Give a reason.',
        ),
        formulaIds: ['solids-disc-sum'],
        observationPrompt: text(
            'Z drsnikom Število diskov nastavi \\(10\\) in nato \\(60\\). Pri vsaki nastavitvi preberi vrstico Vsota diskov in jo primerjaj z vrstico Prostornina (natančno).',
            'With the slider Number of discs set \\(10\\) and then \\(60\\). At each setting read the row Sum of discs and compare it with the row Volume (exact).',
        ),
        expectedObservations: [
            text(
                'Vsota diskov je približno \\(37{,}11006\\) pri \\(4\\), \\(37{,}60486\\) pri \\(10\\) in \\(37{,}69649\\) pri \\(60\\) diskih: raste in ostane pod \\(12\\pi\\approx37{,}69911\\), razlika pa se manjša. Pri tem stožcu je tako, ker je \\(x^2\\) konveksna funkcija in sredinsko pravilo zanjo podcenjuje; to ne velja za vsako funkcijo.',
                'The sum of the discs is about \\(37{,}11006\\) at \\(4\\), \\(37{,}60486\\) at \\(10\\) and \\(37{,}69649\\) at \\(60\\) discs: it grows and stays below \\(12\\pi\\approx37{,}69911\\), and the gap shrinks. For this cone that is so because \\(x^2\\) is a convex function and the midpoint rule underestimates it; that does not hold for every function.',
            ),
            text(
                'Natančna vrednost se ujema s formulo \\(\\tfrac13Bh\\) za \\(B=9\\pi\\), \\(h=4\\): \\(12\\pi\\). Vrstica Prostornina (mreža) ostane približno \\(37{,}59154\\), ne glede na število diskov: to je prostornina mreže z včrtanim \\(48\\)-kotnikom, ne vsota diskov. Drsnik ne ponuja več kot \\(60\\) diskov.',
                'The exact value agrees with the formula \\(\\tfrac13Bh\\) for \\(B=9\\pi\\), \\(h=4\\): \\(12\\pi\\). The row Volume (mesh) stays at about \\(37{,}59154\\) whatever the number of discs: that is the volume of the mesh with an inscribed \\(48\\)-gon, not the disc sum. The slider offers no more than \\(60\\) discs.',
            ),
        ],
        scene: solidsVolumeScene('sv4-cone-scene', SV4_CONE,
            'Stožec, način Vrtenina, os \\(x\\), Število diskov \\(4\\): vsota diskov približno \\(37{,}11006\\), natančna prostornina \\(37{,}69911\\).',
            'Cone, mode Solid of revolution, \\(x\\) axis, Number of discs \\(4\\): sum of discs about \\(37{,}11006\\), exact volume \\(37{,}69911\\).'),
    }),
    step({
        id: 'sv4-free', order: 6,
        title: text('Prosto raziskovanje', 'Free exploration'),
        purpose: text('Sami preizkusiti, kaj os vrtenja, število diskov in izbira telesa spremenijo.', 'Trying what the axis, the number of discs and the choice of solid change.'),
        explanation: text(
            'Graf kaže stožec, vrtenje okoli osi \\(x\\), Število diskov \\(10\\) (vsota diskov približno \\(37{,}60486\\)). Zapiši napoved, preden kaj spremeniš: kaj se zgodi z vsoto, če Os vrtenja nastaviš na os y, torej isti lik pod daljico zavrtiš okoli druge osi? Telo ni več stožec, vrstica se imenuje Vsota obročev. Ali bo vsota še vedno pod natančno prostornino? Utemelji.',
            'The graph shows the cone turned about the \\(x\\) axis with Number of discs \\(10\\) (sum of discs about \\(37{,}60486\\)). Write down a prediction before you change anything: what happens to the sum if you set Axis of rotation to the y-axis, that is turn the same shape under the segment about the other axis? The solid is no longer a cone, and the row is called Sum of washers. Will the sum still be below the exact volume? Give a reason.',
        ),
        formulaIds: [],
        observationPrompt: text(
            'Preizkusi Os vrtenja (os x, os y) in Število diskov (od \\(1\\) do \\(60\\)); v načinu Prostornina telesa poskusi še druga telesa in stikalo Razreži kocko na tri piramide. Pri vsaki spremembi preberi vrstice Prostornina in vsoto ter primerjaj z napovedjo.',
            'Try Axis of rotation (x-axis, y-axis) and Number of discs (from \\(1\\) to \\(60\\)); in the mode Volume of a solid try the other solids and the switch Cut the cube into three pyramids. After each change read the Volume rows and the sum and compare with your prediction.',
        ),
        expectedObservations: [text(
            'Pri osi y je natančna prostornina \\(32\\pi\\approx100{,}53096\\), vsota obročev pa približno \\(101{,}31636\\) pri \\(4\\), \\(100{,}65663\\) pri \\(10\\) in \\(100{,}53446\\) pri \\(60\\): zdaj je vsota nad natančno vrednostjo in se ji približuje od zgoraj. Smer napake sredinskega pravila je torej odvisna od telesa: pri tem liku pod pri osi \\(x\\), nad pri osi \\(y\\).',
            'About the y-axis the exact volume is \\(32\\pi\\approx100{,}53096\\), and the sum of washers is about \\(101{,}31636\\) at \\(4\\), \\(100{,}65663\\) at \\(10\\) and \\(100{,}53446\\) at \\(60\\): now the sum is above the exact value and approaches it from above. So the direction of the error of the midpoint rule depends on the solid: for this shape below about the \\(x\\) axis, above about the \\(y\\) axis.',
        )],
        scene: solidsVolumeScene('sv4-free-scene', SV4_FREE,
            'Stožec, način Vrtenina, os \\(x\\), Število diskov \\(10\\): vsota diskov približno \\(37{,}60486\\), natančna prostornina \\(37{,}69911\\).',
            'Cone, mode Solid of revolution, \\(x\\) axis, Number of discs \\(10\\): sum of discs about \\(37{,}60486\\), exact volume \\(37{,}69911\\).'),
    }),
];

const sv4Sources: GuidedLesson['sources'] = [
    {
        id: 'bezeg-solids-implementation-sv4',
        citation: 'Bezeg source: src/solids/ (the cube cut into three pyramids, the mesh volume, the exact volumes, the disc sums) and src/graphs/solids/SolidsGraph.tsx, volume and revolve modes.',
        implementationCorrespondence: 'A scene sets the mode, the solid, the cube cut, the axis and the number of discs; the pyramid volumes come from signed tetrahedra of the three pyramid meshes, the disc sum from the midpoint rule on the profile, the exact values from formulas.',
    },
];

const sv4EdgeCases: readonly LocalizedText[] = [
    text('Stikalo Razreži kocko na tri piramide velja le za kocko v načinu Prostornina telesa; pri drugih telesih in načinih je nedostopno. Število diskov je od \\(1\\) do \\(60\\); \\(100\\) diskov ni na voljo.', 'The switch Cut the cube into three pyramids applies only to the cube in the mode Volume of a solid; it is unavailable for other solids and modes. Number of discs runs from \\(1\\) to \\(60\\); \\(100\\) discs are not available.'),
    text('Prostornina mreže stožca je malo pod natančno, ker mreža nadomesti krog z včrtanim \\(48\\)-kotnikom.', 'The mesh volume of the cone is slightly below the exact one, because the mesh replaces the circle with an inscribed \\(48\\)-gon.'),
];

const solidsPyramidCone: GuidedLesson = {
    demonstrationId: 'solids',
    title: text('Prostornina piramide in stožca', 'The volume of the pyramid and the cone'),
    summary: text(
        'Enotsko kocko razrežemo na tri skladne piramide s skupnim vrhom, iz tega utemeljimo prostornino piramide, jo preverimo na štiristrani piramidi in stožec obravnavamo kot sklad diskov, katerih vsota se približuje natančni prostornini.',
        'The unit cube is cut into three congruent pyramids with a common apex, the volume of a pyramid is justified from that, checked on a square pyramid, and the cone is treated as a stack of discs whose sum approaches the exact volume.',
    ),
    prerequisites: [text('Prostornina prizme in valja, ploščina kvadrata in kroga.', 'The volume of a prism and a cylinder, the area of a square and a circle.')],
    learningGoals: [
        text('Znaš utemeljiti, da so tri piramide v kocki skladne in kocko napolnijo, zato ima vsaka tretjino prostornine.', 'Can justify that the three pyramids in the cube are congruent and fill it, so each has a third of the volume.'),
        text('Znaš povedati, da \\(V=\\tfrac13Bh\\) za druge osnovne ploskve sledi iz razširitve, in prebrati, kako se vsota diskov približuje prostornini stožca.', 'Can say that \\(V=\\tfrac13Bh\\) for other bases follows from an extension, and read how the disc sum approaches the volume of the cone.'),
    ],
    formulaBlocks: sv4Formulas,
    workedExamples: [],
    steps: sv4Steps,
    sources: sv4Sources,
    edgeCases: sv4EdgeCases,
    unresolvedQuestions: [],
};

export const solidsPyramidConeLesson: GuidedLesson = solidsPyramidCone;
