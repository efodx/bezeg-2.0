/**
 * Guided lessons of the isometries family, batches A and B (docs/specs/isometries-lessons.md): L1, two mirrors, L2, classifying a motion, and L3, central dilation and similarity, all on
 * `isometries` (IsometryGraph). Each is the lesson of one section of the isometries chapter (isometriesChapterRegistry.ts adapts them on request;
 * the lesson catalog itself holds none, as it keeps one lesson per Demonstration). Scenes use only the `isometry` action IsometryGraph registers
 * (`set-mode`, `set-mirror-count`, `set-mirrors`, `set-dilation`) and every scene starts from the Demonstration default and names the mode and every mirror it states. `isometriesGuidedLessons.test.ts`
 * reads each number the text quotes back from the real graph's readouts and recomputes it with plain integer arithmetic (not the isometry kernel).
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

/** A mirror as the two grid points it passes through, each an integer in [-16, 16]. */
export type MirrorPoints = readonly [px: number, py: number, qx: number, qy: number];

/** What a scene sets: the mode, the number of mirrors (classify) and the mirrors it names; every other mirror keeps the Demonstration default. */
export interface IsometrySceneSpec {
    readonly mode: 'mirrors' | 'classify';
    readonly motionLength?: 1 | 2 | 3;
    readonly mirrors: Readonly<Partial<Record<'1' | '2' | '3', MirrorPoints>>>;
}

/** The actions of a scene: the Demonstration default, `set-mode`, `set-mirror-count` when the spec has one, then `set-mirrors` naming every mirror of the spec. */
export const isometrySceneActions = (id: string, spec: IsometrySceneSpec): LessonAction[] => {
    const mirror = ([px, py, qx, qy]: MirrorPoints) => ({p: {x: px, y: py}, q: {x: qx, y: qy}});
    const mirrors: {[name in '1' | '2' | '3']?: ReturnType<typeof mirror>} = {};
    for (const name of ['1', '2', '3'] as const) {
        const points = spec.mirrors[name];
        if (points) mirrors[name] = mirror(points);
    }
    return [
        {kind: 'prepared-scene', sceneId: id, source: 'demonstration-default'},
        {kind: 'isometry', operation: 'set-mode', mode: spec.mode},
        ...(spec.motionLength ? [{kind: 'isometry', operation: 'set-mirror-count', count: spec.motionLength} as const] : []),
        {kind: 'isometry', operation: 'set-mirrors', mirrors},
    ];
};

const scene = (id: string, spec: IsometrySceneSpec, sl: string, en: string): LessonScene =>
    ({id, basedOn: 'demonstration-default', actions: isometrySceneActions(id, spec), expectedState: text(sl, en)});

// ---- L1 --------------------------------------------------------------------------------------------------------------------------

const l1Formulas: readonly FormulaBlock[] = [
    {
        id: 'reflection-matrix',
        latex: '\\sigma_w=\\frac{1}{w\\cdot w}\\begin{pmatrix}w_x^2-w_y^2&2w_xw_y\\\\2w_xw_y&w_y^2-w_x^2\\end{pmatrix}',
        notation: text(
            '\\(\\sigma_w\\) je zrcaljenje v premici skozi izhodišče s smernim vektorjem \\(w=(w_x,w_y)\\); \\(w\\cdot w=w_x^2+w_y^2\\).',
            '\\(\\sigma_w\\) is the reflection in the line through the origin with direction vector \\(w=(w_x,w_y)\\); \\(w\\cdot w=w_x^2+w_y^2\\).',
        ),
        explanation: text(
            'Definicija: zrcaljenje v zrcalu ohrani razdaljo točke od zrcala in jo prenese na drugo stran. Če zrcalo poteka skozi mrežni točki, ima matrika zrcaljenja racionalne vnose, zato so slike natančne.',
            'Definition: a reflection in a mirror keeps the distance of a point from the mirror and carries it to the other side. When the mirror passes through two grid points, the reflection matrix has rational entries, so the images are exact.',
        ),
    },
    {
        id: 'two-mirrors',
        latex: '\\sigma_2\\circ\\sigma_1=\\rho_{2\\varphi}',
        notation: text(
            '\\(\\sigma_1\\) in \\(\\sigma_2\\) sta zrcaljenji v prvem in drugem zrcalu, \\(\\varphi\\) je kot med zrcaloma, \\(\\rho_{2\\varphi}\\) je vrtež za kot \\(2\\varphi\\) okoli presečišča zrcal. Najprej deluje \\(\\sigma_1\\).',
            '\\(\\sigma_1\\) and \\(\\sigma_2\\) are the reflections in the first and the second mirror, \\(\\varphi\\) is the angle between the mirrors and \\(\\rho_{2\\varphi}\\) is the rotation by \\(2\\varphi\\) about the meeting point of the mirrors. \\(\\sigma_1\\) acts first.',
        ),
        explanation: text(
            'Izrek: dve zrcaljenji v zrcalih, ki se sekata v točki \\(O\\), sta skupaj vrtež okoli \\(O\\) za dvakratnik kota med zrcaloma. Premikanje zrcal na sliki je ponazoritev izreka na eni legi, ne dokaz.',
            'Theorem: two reflections in mirrors that meet at a point \\(O\\) together make a rotation about \\(O\\) by twice the angle between the mirrors. Moving the mirrors in the figure illustrates the theorem on one instance; it is not a proof.',
        ),
    },
    {
        id: 'parallel-mirrors',
        latex: '\\sigma_2\\circ\\sigma_1=T_{2\\vec d}',
        notation: text(
            '\\(\\vec d\\) je vektor od prvega zrcala do drugega, pravokoten nanju; \\(T_{2\\vec d}\\) je vzporedni premik za \\(2\\vec d\\).',
            '\\(\\vec d\\) is the vector from the first mirror to the second, perpendicular to both; \\(T_{2\\vec d}\\) is the translation by \\(2\\vec d\\).',
        ),
        explanation: text(
            'Izrek: dve zrcaljenji v vzporednih zrcalih sta skupaj vzporedni premik za dvakratnik razdalje med zrcaloma, pravokotno na zrcali. Vzporednost je odločena natančno z vektorskim produktom smernih vektorjev.',
            'Theorem: two reflections in parallel mirrors together make a translation by twice the distance between the mirrors, perpendicular to the mirrors. Parallelism is decided exactly with the cross product of the direction vectors.',
        ),
    },
];

const l1Examples: readonly WorkedExample[] = [
    {
        id: 'l1-second-reflection',
        title: text('Slika točke \\((3,-1)\\) v drugem zrcalu', 'The image of the point \\((3,-1)\\) in the second mirror'),
        calculationLatex: 'w=(2,1),\\ \\ \\tfrac15\\begin{pmatrix}3&4\\\\4&-3\\end{pmatrix}\\begin{pmatrix}3\\\\-1\\end{pmatrix}=\\tfrac15\\begin{pmatrix}9-4\\\\12+3\\end{pmatrix}',
        resultLatex: '(1,3)',
        check: text(
            'Drugo zrcalo poteka skozi \\((0,0)\\) in \\((2,1)\\), zato je \\(w=(2,1)\\), \\(w\\cdot w=5\\) in \\(w_x^2-w_y^2=3\\), \\(2w_xw_y=4\\). Preverek: središče daljice med \\((3,-1)\\) in \\((1,3)\\) je \\((2,1)\\) in leži na zrcalu.',
            'The second mirror passes through \\((0,0)\\) and \\((2,1)\\), so \\(w=(2,1)\\), \\(w\\cdot w=5\\) and \\(w_x^2-w_y^2=3\\), \\(2w_xw_y=4\\). Check: the midpoint of the segment between \\((3,-1)\\) and \\((1,3)\\) is \\((2,1)\\), which lies on the mirror.',
        ),
    },
];

const l1Steps: readonly GuidedLessonStep[] = [
    step({
        id: 'l1-first-image', order: 1,
        title: text('Napoved prve slike', 'Predicting the first image'),
        purpose: text('Napovedati sliko oglišča v prvem zrcalu, preden jo odčitamo.', 'Predicting the image of a vertex in the first mirror before reading it.'),
        explanation: text(
            'Lik je trikotnik z oglišči \\((3,1)\\), \\((5,1)\\), \\((3,4)\\), oglišča si sledijo v nasprotni smeri urnega kazalca. Prvo zrcalo poteka skozi \\((0,0)\\) in \\((1,0)\\), to je os \\(x\\). Preden prebereš odčitek, napovej sliko oglišča \\((3,1)\\): zrcaljenje ohrani \\(x\\) in obrne predznak \\(y\\).',
            'The motif is the triangle with vertices \\((3,1)\\), \\((5,1)\\), \\((3,4)\\), listed counterclockwise. The first mirror passes through \\((0,0)\\) and \\((1,0)\\), that is the x-axis. Before reading the readout, predict the image of the vertex \\((3,1)\\): the reflection keeps \\(x\\) and changes the sign of \\(y\\).',
        ),
        formulaIds: ['reflection-matrix'],
        observationPrompt: text('Zapiši svojo napoved in jo primerjaj z vrstico prvega oglišča po prvem zrcalu.', 'Write down your prediction and compare it with the row of the first vertex after the first mirror.'),
        expectedObservations: [text('Slika oglišča \\((3,1)\\) v prvem zrcalu je \\((3,-1)\\).', 'The image of the vertex \\((3,1)\\) in the first mirror is \\((3,-1)\\).')],
        scene: scene('l1-first-image-scene', {mode: 'mirrors', mirrors: {'1': [0, 0, 1, 0], '2': [0, 0, 2, 1]}},
            'Zrcali gresta skozi \\((0,0),(1,0)\\) in \\((0,0),(2,1)\\); prvo oglišče po prvem zrcalu je \\((3,-1)\\).',
            'The mirrors pass through \\((0,0),(1,0)\\) and \\((0,0),(2,1)\\); the first vertex after the first mirror is \\((3,-1)\\).'),
    }),
    step({
        id: 'l1-second-image', order: 2,
        title: text('Druga slika in sestavljeno gibanje', 'The second image and the composite motion'),
        purpose: text('Videti, da dve zrcaljenji skupaj dasta vrtež.', 'Seeing that two reflections together make a rotation.'),
        explanation: text(
            'Drugo zrcalo poteka skozi \\((0,0)\\) in \\((2,1)\\). Točka \\((3,-1)\\) se v njem preslika v \\((1,3)\\). Sestavljeno gibanje je vrtež okoli presečišča zrcal \\((0,0)\\) za kot približno \\(53{,}13^\\circ\\); kot med zrcaloma je približno \\(26{,}57^\\circ\\), vrtež pa je za dvakratnik. Kota sta izračunana, razred gibanja pa je določen natančno. Orientacija slike je ohranjena: oglišča si še vedno sledijo v nasprotni smeri urnega kazalca.',
            'The second mirror passes through \\((0,0)\\) and \\((2,1)\\). The point \\((3,-1)\\) is mapped to \\((1,3)\\) in it. The composite motion is a rotation about the meeting point of the mirrors \\((0,0)\\) by about \\(53.13^\\circ\\); the angle between the mirrors is about \\(26.57^\\circ\\), and the rotation is by twice that. The angles are computed, the class of the motion is exact. The orientation of the image is kept: the vertices are still listed counterclockwise.',
        ),
        formulaIds: ['two-mirrors'],
        workedExampleId: 'l1-second-reflection',
        observationPrompt: text('Preberi razred gibanja, središče, kot vrtenja in kot med zrcaloma ter primerjaj kota.', 'Read the class of the motion, the centre, the angle of rotation and the angle between the mirrors, and compare the angles.'),
        expectedObservations: [text('Središče vrteža je \\((0,0)\\), kot vrtenja je \\(53{,}13^\\circ\\), kot med zrcaloma \\(26{,}57^\\circ\\), prvo oglišče na koncu pa \\((1,3)\\).', 'The centre of the rotation is \\((0,0)\\), the angle of rotation is \\(53.13^\\circ\\), the angle between the mirrors \\(26.57^\\circ\\), and the first vertex at the end is \\((1,3)\\).')],
        scene: scene('l1-second-image-scene', {mode: 'mirrors', mirrors: {'1': [0, 0, 1, 0], '2': [0, 0, 2, 1]}},
            'Zrcali gresta skozi \\((0,0),(1,0)\\) in \\((0,0),(2,1)\\); gibanje je vrtež okoli \\((0,0)\\) za \\(53{,}13^\\circ\\), kot med zrcaloma je \\(26{,}57^\\circ\\), prvo oglišče na koncu je \\((1,3)\\).',
            'The mirrors pass through \\((0,0),(1,0)\\) and \\((0,0),(2,1)\\); the motion is a rotation about \\((0,0)\\) by \\(53.13^\\circ\\), the angle between the mirrors is \\(26.57^\\circ\\), the first vertex at the end is \\((1,3)\\).'),
    }),
    step({
        id: 'l1-turn-mirror', order: 3,
        title: text('Zasuk drugega zrcala', 'Turning the second mirror'),
        purpose: text('Napovedati, kam se sestavljeno gibanje premakne, ko drugo zrcalo zavrtimo.', 'Predicting how the composite motion changes when the second mirror is turned.'),
        explanation: text(
            'Drugo zrcalo zavrti tako, da poteka skozi \\((0,0)\\) in \\((1,1)\\); kot med zrcaloma je zdaj \\(45^\\circ\\). Napovej kot vrtenja in sliko oglišča \\((3,1)\\). Po izreku je vrtež za dvakratnik kota med zrcaloma, to je \\(90^\\circ\\), in vrtež za pravi kot preslika \\((3,1)\\) v \\((-1,3)\\).',
            'Turn the second mirror so that it passes through \\((0,0)\\) and \\((1,1)\\); the angle between the mirrors is now \\(45^\\circ\\). Predict the angle of rotation and the image of the vertex \\((3,1)\\). By the theorem the rotation is by twice the angle between the mirrors, that is \\(90^\\circ\\), and a rotation by a right angle maps \\((3,1)\\) to \\((-1,3)\\).',
        ),
        formulaIds: ['two-mirrors'],
        observationPrompt: text('Primerjaj napoved z vrsticama kota vrtenja in prvega oglišča na koncu.', 'Compare your prediction with the rows of the angle of rotation and of the first vertex at the end.'),
        expectedObservations: [text('Kot vrtenja je \\(90^\\circ\\), kot med zrcaloma \\(45^\\circ\\), prvo oglišče na koncu \\((-1,3)\\).', 'The angle of rotation is \\(90^\\circ\\), the angle between the mirrors \\(45^\\circ\\), the first vertex at the end \\((-1,3)\\).')],
        scene: scene('l1-turn-mirror-scene', {mode: 'mirrors', mirrors: {'1': [0, 0, 1, 0], '2': [0, 0, 1, 1]}},
            'Zrcali gresta skozi \\((0,0),(1,0)\\) in \\((0,0),(1,1)\\); kot vrtenja je \\(90^\\circ\\), kot med zrcaloma \\(45^\\circ\\), prvo oglišče na koncu \\((-1,3)\\).',
            'The mirrors pass through \\((0,0),(1,0)\\) and \\((0,0),(1,1)\\); the angle of rotation is \\(90^\\circ\\), the angle between the mirrors \\(45^\\circ\\), the first vertex at the end \\((-1,3)\\).'),
    }),
    step({
        id: 'l1-parallel', order: 4,
        title: text('Vzporedni zrcali', 'Parallel mirrors'),
        purpose: text('Videti, da vzporedni zrcali dasta vzporedni premik.', 'Seeing that parallel mirrors make a translation.'),
        explanation: text(
            'Zrcali naj bosta vzporedni: prvo poteka skozi \\((0,0)\\) in \\((0,1)\\), to je \\(x=0\\), drugo skozi \\((3,0)\\) in \\((3,1)\\), to je \\(x=3\\). Presečišča ni, zato vrtež ne obstaja. Točka \\((3,1)\\) gre v \\((-3,1)\\) in nato v \\((9,1)\\): sestavljeno gibanje je vzporedni premik za vektor \\((6,0)\\), to je dvakrat razdalja \\(3\\) med zrcaloma. Negibnih točk ni. Vzporednost je odločena natančno: vektorski produkt smernih vektorjev je \\(0\\).',
            'Let the mirrors be parallel: the first passes through \\((0,0)\\) and \\((0,1)\\), that is \\(x=0\\), the second through \\((3,0)\\) and \\((3,1)\\), that is \\(x=3\\). They do not meet, so there is no rotation. The point \\((3,1)\\) goes to \\((-3,1)\\) and then to \\((9,1)\\): the composite motion is a translation by the vector \\((6,0)\\), twice the distance \\(3\\) between the mirrors. There are no fixed points. Parallelism is decided exactly: the cross product of the direction vectors is \\(0\\).',
        ),
        formulaIds: ['parallel-mirrors'],
        observationPrompt: text('Preberi razred gibanja in vektor premika ter premakni drugo zrcalo na \\(x=4\\).', 'Read the class of the motion and the translation vector, then move the second mirror to \\(x=4\\).'),
        expectedObservations: [text('Gibanje je vzporedni premik za \\((6,0)\\), negibnih točk ni, prvo oglišče na koncu je \\((9,1)\\).', 'The motion is a translation by \\((6,0)\\), there are no fixed points, the first vertex at the end is \\((9,1)\\).')],
        scene: scene('l1-parallel-scene', {mode: 'mirrors', mirrors: {'1': [0, 0, 0, 1], '2': [3, 0, 3, 1]}},
            'Zrcali gresta skozi \\((0,0),(0,1)\\) in \\((3,0),(3,1)\\); gibanje je vzporedni premik za \\((6,0)\\), prvo oglišče na koncu je \\((9,1)\\).',
            'The mirrors pass through \\((0,0),(0,1)\\) and \\((3,0),(3,1)\\); the motion is a translation by \\((6,0)\\), the first vertex at the end is \\((9,1)\\).'),
    }),
    step({
        id: 'l1-free', order: 5,
        title: text('Vrstni red zrcal', 'The order of the mirrors'),
        purpose: text('Videti, da zamenjava zrcal obrne smer vrteža, in preizkusiti lastna zrcala.', 'Seeing that swapping the mirrors reverses the direction of the rotation, and trying mirrors of your own.'),
        explanation: text(
            'Zamenjaj vrstni red zrcal iz drugega koraka: prvo poteka skozi \\((0,0)\\) in \\((2,1)\\), drugo skozi \\((0,0)\\) in \\((1,0)\\). Središče vrteža je spet \\((0,0)\\), kot pa je zdaj \\(-53{,}13^\\circ\\): vrtež je v nasprotno smer. Vrstni red zrcal torej šteje. Zdaj premikaj točke zrcal sam: poišči lege, pri katerih je kot \\(90^\\circ\\), in lege, pri katerih se gibanje spremeni v vzporedni premik.',
            'Swap the order of the mirrors of the second step: the first passes through \\((0,0)\\) and \\((2,1)\\), the second through \\((0,0)\\) and \\((1,0)\\). The centre of the rotation is again \\((0,0)\\), but the angle is now \\(-53.13^\\circ\\): the rotation turns the other way. So the order of the mirrors matters. Now move the points of the mirrors yourself: find positions with the angle \\(90^\\circ\\), and positions where the motion becomes a translation.',
        ),
        formulaIds: ['two-mirrors'],
        observationPrompt: text('Poišči zrcali, ki dasta vrtež za \\(90^\\circ\\), in zrcali, ki dasta vzporedni premik.', 'Find mirrors that give a rotation by \\(90^\\circ\\) and mirrors that give a translation.'),
        expectedObservations: [text('Z zamenjanima zrcaloma je kot vrtenja \\(-53{,}13^\\circ\\), središče ostane \\((0,0)\\).', 'With the mirrors swapped the angle of rotation is \\(-53.13^\\circ\\), the centre stays \\((0,0)\\).')],
        scene: scene('l1-free-scene', {mode: 'mirrors', mirrors: {'1': [0, 0, 2, 1], '2': [0, 0, 1, 0]}},
            'Zrcali gresta skozi \\((0,0),(2,1)\\) in \\((0,0),(1,0)\\); gibanje je vrtež okoli \\((0,0)\\) za \\(-53{,}13^\\circ\\).',
            'The mirrors pass through \\((0,0),(2,1)\\) and \\((0,0),(1,0)\\); the motion is a rotation about \\((0,0)\\) by \\(-53.13^\\circ\\).'),
    }),
];

// ---- L2 --------------------------------------------------------------------------------------------------------------------------

const l2Formulas: readonly FormulaBlock[] = [
    {
        id: 'orientation',
        latex: '\\det A=\\pm1,\\qquad \\det(\\sigma_n\\circ\\dots\\circ\\sigma_1)=(-1)^n',
        notation: text(
            '\\(A\\) je linearni del gibanja, \\(\\sigma_1,\\dots,\\sigma_n\\) so zrcaljenja; \\(\\det A=1\\) ohrani orientacijo, \\(\\det A=-1\\) jo obrne.',
            '\\(A\\) is the linear part of the motion, \\(\\sigma_1,\\dots,\\sigma_n\\) are reflections; \\(\\det A=1\\) keeps the orientation, \\(\\det A=-1\\) reverses it.',
        ),
        explanation: text(
            'Definicija: orientacija trikotnika je smer, v kateri si sledijo oglišča (nasprotno od urnega kazalca ali v smeri urnega kazalca). Zrcaljenje orientacijo obrne, zato sodo število zrcal orientacijo ohrani, liho jo obrne.',
            'Definition: the orientation of a triangle is the direction in which its vertices are listed (counterclockwise or clockwise). A reflection reverses the orientation, so an even number of mirrors keeps it and an odd number reverses it.',
        ),
    },
    {
        id: 'classes',
        latex: 'A^{T}A=I,\\qquad \\det A=\\pm1',
        notation: text(
            'Izometrija ima ortogonalni linearni del \\(A\\); \\(\\det A=1\\) pripada vzporednemu premiku in vrtežu, \\(\\det A=-1\\) zrcaljenju in zrcalnemu zdrsu.',
            'An isometry has an orthogonal linear part \\(A\\); \\(\\det A=1\\) belongs to a translation and a rotation, \\(\\det A=-1\\) to a reflection and a glide reflection.',
        ),
        explanation: text(
            'Izrek: vsaka izometrija ravnine je vzporedni premik, vrtež, zrcaljenje ali zrcalni zdrs (zrcaljenje, ki mu sledi premik vzdolž osi), identiteta je poseben vzporedni premik. Orientacija in negibne točke ločijo vrste: ohranjena orientacija brez negibnih točk je vzporedni premik, z eno negibno točko vrtež; obrnjena orientacija z vsemi točkami na premici je zrcaljenje, brez negibnih točk zrcalni zdrs.',
            'Theorem: every isometry of the plane is a translation, a rotation, a reflection or a glide reflection (a reflection followed by a translation along the axis); the identity is a special translation. Orientation and fixed points tell the kinds apart: a kept orientation with no fixed points is a translation, with one fixed point a rotation; a reversed orientation with a line of fixed points is a reflection, with no fixed points a glide reflection.',
        ),
    },
];

const l2Examples: readonly WorkedExample[] = [
    {
        id: 'l2-rotation-centre',
        title: text('Središče vrteža iz negibne točke', 'The centre of the rotation from the fixed point'),
        calculationLatex: '(x,y)\\mapsto(3-y,\\ x+1),\\ \\ x=3-y,\\ y=x+1\\ \\Rightarrow\\ x=3-(x+1)',
        resultLatex: '(x,y)=(1,2)',
        check: text(
            'Obe zrcali gresta skozi \\((1,2)\\), zato je gibanje vrtež za \\(90^\\circ\\) okoli te točke, v koordinatah \\((x,y)\\mapsto(3-y,x+1)\\). Negibna točka reši \\(x=3-y\\), \\(y=x+1\\), torej \\(2x=2\\). Preverek: \\((3,1)\\) gre v \\((2,4)\\), razdalji do središča sta enaki, \\(\\sqrt5\\).',
            'Both mirrors pass through \\((1,2)\\), so the motion is a rotation by \\(90^\\circ\\) about that point, in coordinates \\((x,y)\\mapsto(3-y,x+1)\\). The fixed point solves \\(x=3-y\\), \\(y=x+1\\), so \\(2x=2\\). Check: \\((3,1)\\) goes to \\((2,4)\\), the distances to the centre are equal, \\(\\sqrt5\\).',
        ),
    },
    {
        id: 'l2-glide-no-fixed-point',
        title: text('Zrcalni zdrs nima negibne točke', 'A glide reflection has no fixed point'),
        calculationLatex: '(x,y)\\mapsto(y+2,\\ x+2),\\ \\ x=y+2,\\ y=x+2\\ \\Rightarrow\\ x=x+4',
        resultLatex: '0=4',
        check: text(
            'Premik za \\((2,2)\\) in zrcaljenje v \\(y=x\\) dasta \\((x,y)\\mapsto(y+2,x+2)\\); točka \\((3,1)\\) gre v \\((3,5)\\). Enačbi za negibno točko dasta protislovje \\(0=4\\), zato negibne točke ni; os \\(y=x\\) se le preslika vase.',
            'The translation by \\((2,2)\\) and the reflection in \\(y=x\\) give \\((x,y)\\mapsto(y+2,x+2)\\); the point \\((3,1)\\) goes to \\((3,5)\\). The equations of a fixed point give the contradiction \\(0=4\\), so there is no fixed point; the axis \\(y=x\\) is only mapped onto itself.',
        ),
    },
];

const l2Steps: readonly GuidedLessonStep[] = [
    step({
        id: 'l2-reflection', order: 1,
        title: text('Napoved orientacije pri enem zrcalu', 'Predicting the orientation after one mirror'),
        purpose: text('Napovedati, ali zrcaljenje ohrani zaporedje oglišč v nasprotni smeri urnega kazalca.', 'Predicting whether a reflection keeps the vertices in counterclockwise order.'),
        explanation: text(
            'Gibanje je eno samo zrcaljenje v premici \\(y=x-1\\), to je v zrcalu skozi \\((1,0)\\) in \\((2,1)\\). Lik \\((3,1)\\), \\((5,1)\\), \\((3,4)\\) je v nasprotni smeri urnega kazalca. Preden prebereš odčitek, napovej: ali slika ohrani to zaporedje? Zrcaljenje je \\((x,y)\\mapsto(y+1,x-1)\\), slike oglišč so \\((2,2)\\), \\((2,4)\\), \\((5,2)\\) in te si sledijo v smeri urnega kazalca. Negibne točke so vse točke zrcala.',
            'The motion is a single reflection in the line \\(y=x-1\\), that is in the mirror through \\((1,0)\\) and \\((2,1)\\). The motif \\((3,1)\\), \\((5,1)\\), \\((3,4)\\) is counterclockwise. Before reading the readout, predict: does the image keep this order? The reflection is \\((x,y)\\mapsto(y+1,x-1)\\), the images of the vertices are \\((2,2)\\), \\((2,4)\\), \\((5,2)\\), and they are listed clockwise. The fixed points are all points of the mirror.',
        ),
        formulaIds: ['orientation'],
        observationPrompt: text('Zapiši napoved, nato preberi orientacijo slike in negibne točke.', 'Write down your prediction, then read the orientation of the image and the fixed points.'),
        expectedObservations: [text('Gibanje je zrcaljenje, orientacija slike je obrnjena, negibne točke so vse točke na eni premici, prvo oglišče pride v \\((2,2)\\).', 'The motion is a reflection, the orientation of the image is reversed, the fixed points are all points on one line, the first vertex goes to \\((2,2)\\).')],
        scene: scene('l2-reflection-scene', {mode: 'classify', motionLength: 1, mirrors: {'1': [1, 0, 2, 1]}},
            'Eno zrcalo skozi \\((1,0),(2,1)\\); gibanje je zrcaljenje, os \\(x-y=1\\), orientacija obrnjena, prvo oglišče gre v \\((2,2)\\).',
            'One mirror through \\((1,0),(2,1)\\); the motion is a reflection, the axis \\(x-y=1\\), the orientation reversed, the first vertex goes to \\((2,2)\\).'),
    }),
    step({
        id: 'l2-two-mirrors', order: 2,
        title: text('Dve zrcali sta vrtež', 'Two mirrors make a rotation'),
        purpose: text('Videti, da dve zrcali, ki se sekata, ohranita orientacijo in imata eno negibno točko.', 'Seeing that two mirrors that meet keep the orientation and have one fixed point.'),
        explanation: text(
            'Zdaj sta dve zrcali: prvo skozi \\((1,2)\\) in \\((2,2)\\), to je \\(y=2\\), drugo skozi \\((1,2)\\) in \\((2,3)\\), to je \\(y=x+1\\). Kot med njima je \\(45^\\circ\\), gibanje je vrtež za \\(90^\\circ\\) okoli presečišča \\((1,2)\\). Sodo število zrcal orientacijo ohrani, vrtež ima natanko eno negibno točko, središče.',
            'Now there are two mirrors: the first through \\((1,2)\\) and \\((2,2)\\), that is \\(y=2\\), the second through \\((1,2)\\) and \\((2,3)\\), that is \\(y=x+1\\). The angle between them is \\(45^\\circ\\), the motion is a rotation by \\(90^\\circ\\) about the meeting point \\((1,2)\\). An even number of mirrors keeps the orientation, and a rotation has exactly one fixed point, its centre.',
        ),
        formulaIds: ['orientation'],
        workedExampleId: 'l2-rotation-centre',
        observationPrompt: text('Preberi središče, kot vrtenja, negibne točke in orientacijo.', 'Read the centre, the angle of rotation, the fixed points and the orientation.'),
        expectedObservations: [text('Središče vrteža je \\((1,2)\\), kot \\(90^\\circ\\), negibna točka je ena, orientacija ohranjena, prvo oglišče na koncu je \\((2,4)\\).', 'The centre of the rotation is \\((1,2)\\), the angle \\(90^\\circ\\), there is one fixed point, the orientation is kept, the first vertex at the end is \\((2,4)\\).')],
        scene: scene('l2-two-mirrors-scene', {mode: 'classify', motionLength: 2, mirrors: {'1': [1, 2, 2, 2], '2': [1, 2, 2, 3]}},
            'Dve zrcali skozi \\((1,2),(2,2)\\) in \\((1,2),(2,3)\\); gibanje je vrtež okoli \\((1,2)\\) za \\(90^\\circ\\), orientacija ohranjena, prvo oglišče na koncu je \\((2,4)\\).',
            'Two mirrors through \\((1,2),(2,2)\\) and \\((1,2),(2,3)\\); the motion is a rotation about \\((1,2)\\) by \\(90^\\circ\\), the orientation kept, the first vertex at the end is \\((2,4)\\).'),
    }),
    step({
        id: 'l2-three-mirrors', order: 3,
        title: text('Tri zrcala dajo zrcalni zdrs', 'Three mirrors make a glide reflection'),
        purpose: text('Videti, da tri zrcala lahko dajo zrcaljenje s premikom vzdolž osi.', 'Seeing that three mirrors can make a reflection with a translation along the axis.'),
        explanation: text(
            'Trije zrcali: \\(y=-x\\) skozi \\((0,0)\\) in \\((1,-1)\\), \\(x+y=2\\) skozi \\((1,1)\\) in \\((2,0)\\) ter \\(y=x\\) skozi \\((0,0)\\) in \\((1,1)\\). Prvi dve sta vzporedni in dasta vzporedni premik za \\((2,2)\\), tretja pa zrcali v premici, vzporedni temu premiku. Tako dobimo zrcalni zdrs \\((x,y)\\mapsto(y+2,x+2)\\) z osjo \\(y=x\\) in vektorjem \\((2,2)\\). Liho število zrcal orientacijo obrne, negibnih točk ni.',
            'Three mirrors: \\(y=-x\\) through \\((0,0)\\) and \\((1,-1)\\), \\(x+y=2\\) through \\((1,1)\\) and \\((2,0)\\), and \\(y=x\\) through \\((0,0)\\) and \\((1,1)\\). The first two are parallel and make a translation by \\((2,2)\\), and the third reflects in a line parallel to this translation. So we get the glide reflection \\((x,y)\\mapsto(y+2,x+2)\\) with the axis \\(y=x\\) and the vector \\((2,2)\\). An odd number of mirrors reverses the orientation, and there are no fixed points.',
        ),
        formulaIds: ['classes'],
        workedExampleId: 'l2-glide-no-fixed-point',
        observationPrompt: text('Preberi razred gibanja, os, vektor premika in negibne točke.', 'Read the class of the motion, the axis, the translation vector and the fixed points.'),
        expectedObservations: [text('Gibanje je zrcalni zdrs, os \\(x-y=0\\), vektor \\((2,2)\\), negibnih točk ni, orientacija obrnjena, prvo oglišče na koncu je \\((3,5)\\).', 'The motion is a glide reflection, the axis \\(x-y=0\\), the vector \\((2,2)\\), there are no fixed points, the orientation is reversed, the first vertex at the end is \\((3,5)\\).')],
        scene: scene('l2-three-mirrors-scene', {mode: 'classify', motionLength: 3, mirrors: {'1': [0, 0, 1, -1], '2': [1, 1, 2, 0], '3': [0, 0, 1, 1]}},
            'Tri zrcala skozi \\((0,0),(1,-1)\\), \\((1,1),(2,0)\\) in \\((0,0),(1,1)\\); gibanje je zrcalni zdrs z osjo \\(x-y=0\\) in vektorjem \\((2,2)\\), prvo oglišče na koncu je \\((3,5)\\).',
            'Three mirrors through \\((0,0),(1,-1)\\), \\((1,1),(2,0)\\) and \\((0,0),(1,1)\\); the motion is a glide reflection with the axis \\(x-y=0\\) and the vector \\((2,2)\\), the first vertex at the end is \\((3,5)\\).'),
    }),
    step({
        id: 'l2-fixed-points', order: 4,
        title: text('Negibne točke razkrijejo razred', 'Fixed points reveal the class'),
        purpose: text('Razločiti štiri razrede po orientaciji in negibnih točkah.', 'Telling the four classes apart by orientation and fixed points.'),
        explanation: text(
            'Zdaj sta dve vodoravni zrcali, \\(y=0\\) in \\(y=2\\): gibanje je vzporedni premik za \\((0,4)\\), orientacija je ohranjena, negibnih točk ni. Tako imamo vse štiri razrede: vzporedni premik (ohranjena orientacija, nobene negibne točke), vrtež (ohranjena, ena), zrcaljenje (obrnjena, vse točke na eni premici) in zrcalni zdrs (obrnjena, nobene). Z izbiro gibanja v seznamu preberi negibne točke in orientacijo za vrtež, zrcalni zdrs in zrcaljenje.',
            'Now there are two horizontal mirrors, \\(y=0\\) and \\(y=2\\): the motion is a translation by \\((0,4)\\), the orientation is kept, there are no fixed points. So we have all four classes: a translation (orientation kept, no fixed points), a rotation (kept, one), a reflection (reversed, all points of a line) and a glide reflection (reversed, none). Choose a motion from the list and read the fixed points and the orientation for the rotation, the glide reflection and the reflection.',
        ),
        formulaIds: ['classes'],
        observationPrompt: text('Zapolni preglednico štirih razredov z orientacijo in negibnimi točkami, ki ju odčitaš.', 'Fill in a table of the four classes with the orientation and fixed points you read.'),
        expectedObservations: [text('Vzporedni premik za \\((0,4)\\): negibnih točk ni, orientacija ohranjena, prvo oglišče na koncu je \\((3,5)\\).', 'A translation by \\((0,4)\\): there are no fixed points, the orientation is kept, the first vertex at the end is \\((3,5)\\).')],
        scene: scene('l2-fixed-points-scene', {mode: 'classify', motionLength: 2, mirrors: {'1': [0, 0, 1, 0], '2': [0, 2, 1, 2]}},
            'Dve zrcali skozi \\((0,0),(1,0)\\) in \\((0,2),(1,2)\\); gibanje je vzporedni premik za \\((0,4)\\), negibnih točk ni, orientacija ohranjena, prvo oglišče na koncu je \\((3,5)\\).',
            'Two mirrors through \\((0,0),(1,0)\\) and \\((0,2),(1,2)\\); the motion is a translation by \\((0,4)\\), there are no fixed points, the orientation is kept, the first vertex at the end is \\((3,5)\\).'),
    }),
    step({
        id: 'l2-free', order: 5,
        title: text('Tri zrcala skozi isto točko', 'Three mirrors through one point'),
        purpose: text('Preizkusiti lastna zrcala in videti, da tri zrcala niso vedno zrcalni zdrs.', 'Trying mirrors of your own and seeing that three mirrors are not always a glide reflection.'),
        explanation: text(
            'Tri zrcala skozi izhodišče: \\(x\\)-os, \\(y=x\\) in \\(y\\)-os dajo zrcaljenje v premici \\(y=x\\): orientacija je obrnjena, vse točke osi so negibne, premika vzdolž osi ni. Zdaj premakni eno točko tretjega zrcala, da zrcali ne gredo več skozi isto točko, in opazuj, kdaj se zrcaljenje spremeni v zrcalni zdrs. Ugotovitev na enem primeru je ponazoritev, izrek pa pove, da je vsako gibanje ene od štirih vrst.',
            'Three mirrors through the origin: the x-axis, \\(y=x\\) and the y-axis make the reflection in the line \\(y=x\\): the orientation is reversed, all points of the axis are fixed, there is no translation along the axis. Now move one point of the third mirror so that the mirrors no longer pass through the same point, and watch when the reflection turns into a glide reflection. A finding on one example illustrates, the theorem says that every motion is one of the four kinds.',
        ),
        formulaIds: ['classes'],
        observationPrompt: text('Poišči lege tretjega zrcala, pri katerih je gibanje zrcaljenje, in lege, pri katerih je zrcalni zdrs.', 'Find positions of the third mirror where the motion is a reflection and positions where it is a glide reflection.'),
        expectedObservations: [text('Gibanje je zrcaljenje z osjo \\(x-y=0\\), orientacija obrnjena, prvo oglišče na koncu je \\((1,3)\\).', 'The motion is a reflection with the axis \\(x-y=0\\), the orientation reversed, the first vertex at the end is \\((1,3)\\).')],
        scene: scene('l2-free-scene', {mode: 'classify', motionLength: 3, mirrors: {'1': [0, 0, 1, 0], '2': [0, 0, 1, 1], '3': [0, 0, 0, 1]}},
            'Tri zrcala skozi \\((0,0),(1,0)\\), \\((0,0),(1,1)\\) in \\((0,0),(0,1)\\); gibanje je zrcaljenje z osjo \\(x-y=0\\), orientacija obrnjena, prvo oglišče na koncu je \\((1,3)\\).',
            'Three mirrors through \\((0,0),(1,0)\\), \\((0,0),(1,1)\\) and \\((0,0),(0,1)\\); the motion is a reflection with the axis \\(x-y=0\\), the orientation reversed, the first vertex at the end is \\((1,3)\\).'),
    }),
];

// ---- L3 --------------------------------------------------------------------------------------------------------------------------

/** What an L3 scene sets: the dilation centre, the ratio `k` and the turn about the centre; the motif is the Demonstration's triangle (0,0), (4,0), (0,3). */
export interface IsometryDilationSceneSpec {
    readonly centre: readonly [x: number, y: number];
    readonly k: number;
    readonly turn: 'r0' | 'pythagorean';
}

/** The actions of an L3 scene: the Demonstration default, `set-mode` similarity, then `set-dilation` naming the centre, the ratio and the turn. */
export const isometryDilationSceneActions = (id: string, spec: IsometryDilationSceneSpec): LessonAction[] => [
    {kind: 'prepared-scene', sceneId: id, source: 'demonstration-default'},
    {kind: 'isometry', operation: 'set-mode', mode: 'similarity'},
    {kind: 'isometry', operation: 'set-dilation', centre: {x: spec.centre[0], y: spec.centre[1]}, k: spec.k, turn: spec.turn},
];

const dilationScene = (id: string, spec: IsometryDilationSceneSpec, sl: string, en: string): LessonScene =>
    ({id, basedOn: 'demonstration-default', actions: isometryDilationSceneActions(id, spec), expectedState: text(sl, en)});

const l3Formulas: readonly FormulaBlock[] = [
    {
        id: 'dilation',
        latex: 'P\'=C+k\\,(P-C)',
        notation: text(
            '\\(C\\) je središče raztega, \\(k\\) razmerje, \\(P\\) točka in \\(P\'\\) njena slika.',
            '\\(C\\) is the centre of the dilation, \\(k\\) the ratio, \\(P\\) a point and \\(P\'\\) its image.',
        ),
        explanation: text(
            'Definicija: središčni razteg s središčem \\(C\\) in razmerjem \\(k\\) pošlje točko \\(P\\) v točko \\(P\'\\) na premici \\(CP\\), tako da je \\(\\overrightarrow{CP\'}=k\\,\\overrightarrow{CP}\\). Središče je negibno. Razmerje je večkratnik števila \\(1/4\\) z \\(0<|k|\\le4\\).',
            'Definition: the central dilation with centre \\(C\\) and ratio \\(k\\) sends a point \\(P\\) to the point \\(P\'\\) on the line \\(CP\\) with \\(\\overrightarrow{CP\'}=k\\,\\overrightarrow{CP}\\). The centre is fixed. The ratio is a multiple of \\(1/4\\) with \\(0<|k|\\le4\\).',
        ),
    },
    {
        id: 'similarity',
        latex: 'P\'=C+A\\,(P-C),\\qquad A=k\\begin{pmatrix}\\cos\\varphi&-\\sin\\varphi\\\\\\sin\\varphi&\\cos\\varphi\\end{pmatrix}',
        notation: text(
            '\\(\\varphi\\) je kot vrtenja okoli središča \\(C\\); matrika \\(A\\) je razteg z \\(k\\), ki mu sledi vrtež.',
            '\\(\\varphi\\) is the angle of the rotation about the centre \\(C\\); the matrix \\(A\\) is the dilation by \\(k\\) followed by the rotation.',
        ),
        explanation: text(
            'Definicija: podobnost je razteg, sestavljen z izometrijo. Tukaj je izometrija vrtež okoli središča raztega. Podobnost ohrani kote in razmerja dolžin, dolžine pomnoži z \\(|k|\\), ploščine pa s \\(k^2\\).',
            'Definition: a similarity is a dilation composed with an isometry. Here the isometry is a rotation about the centre of the dilation. A similarity keeps angles and ratios of lengths, multiplies lengths by \\(|k|\\) and areas by \\(k^2\\).',
        ),
    },
];

const l3Examples: readonly WorkedExample[] = [
    {
        id: 'l3-similarity-vertex',
        title: text('Slika oglišča \\((0,0)\\) pri podobnosti', 'The image of the vertex \\((0,0)\\) under the similarity'),
        calculationLatex: 'A=\\begin{pmatrix}\\tfrac9{10}&-\\tfrac65\\\\\\tfrac65&\\tfrac9{10}\\end{pmatrix},\\ \\ A\\begin{pmatrix}-1\\\\-1\\end{pmatrix}=\\begin{pmatrix}-\\tfrac9{10}+\\tfrac65\\\\-\\tfrac65-\\tfrac9{10}\\end{pmatrix}=\\begin{pmatrix}\\tfrac3{10}\\\\-\\tfrac{21}{10}\\end{pmatrix}',
        resultLatex: '(\\tfrac{13}{10},-\\tfrac{11}{10})',
        check: text(
            'Središče je \\(C=(1,1)\\), zato je \\(P-C=(-1,-1)\\); \\(A=\\tfrac32\\cdot\\tfrac15\\begin{pmatrix}3&-4\\\\4&3\\end{pmatrix}\\). Slika je \\(C+A(P-C)=(1+\\tfrac3{10},1-\\tfrac{21}{10})\\). Preverek: dolžina \\(|P-C|=\\sqrt2\\) se pomnoži s \\(\\tfrac32\\), saj je \\(\\tfrac9{100}+\\tfrac{441}{100}=\\tfrac{450}{100}=\\tfrac92=\\bigl(\\tfrac32\\bigr)^2\\cdot2\\).',
            'The centre is \\(C=(1,1)\\), so \\(P-C=(-1,-1)\\); \\(A=\\tfrac32\\cdot\\tfrac15\\begin{pmatrix}3&-4\\\\4&3\\end{pmatrix}\\). The image is \\(C+A(P-C)=(1+\\tfrac3{10},1-\\tfrac{21}{10})\\). Check: the length \\(|P-C|=\\sqrt2\\) is multiplied by \\(\\tfrac32\\), since \\(\\tfrac9{100}+\\tfrac{441}{100}=\\tfrac{450}{100}=\\tfrac92=\\bigl(\\tfrac32\\bigr)^2\\cdot2\\).',
        ),
    },
];

const l3Steps: readonly GuidedLessonStep[] = [
    step({
        id: 'l3-image', order: 1,
        title: text('Napoved slike oglišča', 'Predicting the image of a vertex'),
        purpose: text('Napovedati sliko oglišča pri raztegu, preden jo odčitamo.', 'Predicting the image of a vertex under a dilation before reading it.'),
        explanation: text(
            'Lik je trikotnik z oglišči \\((0,0)\\), \\((4,0)\\), \\((0,3)\\), oglišča si sledijo v nasprotni smeri urnega kazalca. Središče raztega je \\(C=(1,1)\\), razmerje \\(k=\\tfrac32\\). Preden prebereš odčitek, napovej sliko prvega oglišča \\((0,0)\\) po formuli \\(P\'=C+k\\,(P-C)\\).',
            'The motif is the triangle with vertices \\((0,0)\\), \\((4,0)\\), \\((0,3)\\), listed counterclockwise. The centre of the dilation is \\(C=(1,1)\\), the ratio \\(k=\\tfrac32\\). Before reading the readout, predict the image of the first vertex \\((0,0)\\) with the formula \\(P\'=C+k\\,(P-C)\\).',
        ),
        formulaIds: ['dilation'],
        observationPrompt: text('Zapiši svojo napoved in jo primerjaj z vrstico slike oglišča 1.', 'Write down your prediction and compare it with the row of the image of vertex 1.'),
        expectedObservations: [text('Slika oglišča \\((0,0)\\) je \\((-\\tfrac12,-\\tfrac12)\\); negibna točka je središče \\((1,1)\\).', 'The image of the vertex \\((0,0)\\) is \\((-\\tfrac12,-\\tfrac12)\\); the fixed point is the centre \\((1,1)\\).')],
        scene: dilationScene('l3-image-scene', {centre: [1, 1], k: 1.5, turn: 'r0'},
            'Središče \\((1,1)\\), \\(k=\\tfrac32\\), brez vrtenja; slika oglišča 1 je \\((-\\tfrac12,-\\tfrac12)\\), negibna točka \\((1,1)\\).',
            'Centre \\((1,1)\\), \\(k=\\tfrac32\\), no turn; the image of vertex 1 is \\((-\\tfrac12,-\\tfrac12)\\), the fixed point \\((1,1)\\).'),
    }),
    step({
        id: 'l3-ratio', order: 2,
        title: text('Razmerje \\(k\\) in ploščine', 'The ratio \\(k\\) and the areas'),
        purpose: text('Videti, kako razteg spremeni dolžine in ploščine.', 'Seeing how a dilation changes lengths and areas.'),
        explanation: text(
            'Razteg dolžine pomnoži z \\(|k|\\) in ohrani kote, zato je podoben lik enake oblike. Zdaj je \\(k=3\\), središče je še vedno \\((1,1)\\); poskusi tudi druge vrednosti \\(k\\) v polju za razmerje. Preden prebereš odčitek, napovej, s čim se pomnoži ploščina trikotnika.',
            'A dilation multiplies lengths by \\(|k|\\) and keeps angles, so the image has the same shape. Now \\(k=3\\), the centre is still \\((1,1)\\); also try other values of \\(k\\) in the ratio field. Before reading the readout, predict what the area of the triangle is multiplied by.',
        ),
        formulaIds: ['dilation'],
        observationPrompt: text('Zapiši napoved, nato preberi razmerje dolžin, razmerje ploščin in obe ploščini.', 'Write down your prediction, then read the ratio of lengths, the ratio of areas and both areas.'),
        expectedObservations: [text('Razmerje dolžin je \\(3\\), razmerje ploščin \\(9\\), ploščina \\(6\\) postane \\(54\\); izometrija: ne.', 'The ratio of lengths is \\(3\\), the ratio of areas \\(9\\), the area \\(6\\) becomes \\(54\\); isometry: no.')],
        scene: dilationScene('l3-ratio-scene', {centre: [1, 1], k: 3, turn: 'r0'},
            'Središče \\((1,1)\\), \\(k=3\\); razmerje dolžin \\(3\\), razmerje ploščin \\(9\\), ploščina \\(6\\mapsto54\\), izometrija ne.',
            'Centre \\((1,1)\\), \\(k=3\\); ratio of lengths \\(3\\), ratio of areas \\(9\\), area \\(6\\mapsto54\\), isometry no.'),
    }),
    step({
        id: 'l3-negative', order: 3,
        title: text('Negativno razmerje', 'A negative ratio'),
        purpose: text('Videti, kam gre slika pri negativnem \\(k\\) in kaj se zgodi z orientacijo.', 'Seeing where the image goes for a negative \\(k\\) and what happens to the orientation.'),
        explanation: text(
            'Zdaj je \\(k=-\\tfrac12\\), središče je \\((1,1)\\), formula je ista, \\(P\'=C+k\\,(P-C)\\). Preden prebereš odčitek, napovej sliko prvega oglišča \\((0,0)\\) in ali slika ohrani orientacijo trikotnika.',
            'Now \\(k=-\\tfrac12\\), the centre is \\((1,1)\\), the formula is the same, \\(P\'=C+k\\,(P-C)\\). Before reading the readout, predict the image of the first vertex \\((0,0)\\) and whether the image keeps the orientation of the triangle.',
        ),
        formulaIds: ['dilation'],
        observationPrompt: text('Zapiši napoved, nato preberi sliko oglišča 1, razmerje dolžin in orientacijo.', 'Write down your prediction, then read the image of vertex 1, the ratio of lengths and the orientation.'),
        expectedObservations: [text('Slika oglišča \\((0,0)\\) je \\((\\tfrac32,\\tfrac32)\\), na drugi strani središča; razmerje dolžin je \\(\\tfrac12\\), razmerje ploščin \\(\\tfrac14\\), orientacija je ohranjena. Negativno razmerje je razteg z \\(|k|\\), ki mu sledi polobrat okoli središča, vrtež pa orientacije ne obrne.', 'The image of the vertex \\((0,0)\\) is \\((\\tfrac32,\\tfrac32)\\), on the other side of the centre; the ratio of lengths is \\(\\tfrac12\\), the ratio of areas \\(\\tfrac14\\), the orientation is kept. A negative ratio is a dilation by \\(|k|\\) followed by a half-turn about the centre, and a rotation does not reverse the orientation.')],
        scene: dilationScene('l3-negative-scene', {centre: [1, 1], k: -0.5, turn: 'r0'},
            'Središče \\((1,1)\\), \\(k=-\\tfrac12\\); slika oglišča 1 je \\((\\tfrac32,\\tfrac32)\\), razmerje dolžin \\(\\tfrac12\\), razmerje ploščin \\(\\tfrac14\\), orientacija ohranjena.',
            'Centre \\((1,1)\\), \\(k=-\\tfrac12\\); the image of vertex 1 is \\((\\tfrac32,\\tfrac32)\\), ratio of lengths \\(\\tfrac12\\), ratio of areas \\(\\tfrac14\\), orientation kept.'),
    }),
    step({
        id: 'l3-similarity', order: 4,
        title: text('Razteg in vrtež sta podobnost', 'A dilation and a rotation make a similarity'),
        purpose: text('Videti, kaj se zgodi z negibno točko, ko raztegu dodamo vrtež okoli središča.', 'Seeing what happens to the fixed point when a rotation about the centre is added to the dilation.'),
        explanation: text(
            'Raztegu z \\(k=\\tfrac32\\) in središčem \\((1,1)\\) dodamo vrtež okoli središča s kosinusom \\(\\tfrac35\\) in sinusom \\(\\tfrac45\\). Dobimo podobnost z matriko \\(A=\\tfrac32\\cdot\\tfrac15\\begin{pmatrix}3&-4\\\\4&3\\end{pmatrix}\\). Preden prebereš odčitek, napovej, ali se negibna točka podobnosti premakne glede na čisti razteg.',
            'To the dilation with \\(k=\\tfrac32\\) and centre \\((1,1)\\) we add a rotation about the centre with cosine \\(\\tfrac35\\) and sine \\(\\tfrac45\\). We get a similarity with the matrix \\(A=\\tfrac32\\cdot\\tfrac15\\begin{pmatrix}3&-4\\\\4&3\\end{pmatrix}\\). Before reading the readout, predict whether the fixed point of the similarity moves compared with the pure dilation.',
        ),
        formulaIds: ['similarity'],
        workedExampleId: 'l3-similarity-vertex',
        observationPrompt: text('Zapiši napoved, nato preberi negibno točko, razmerji in sliko oglišča 1.', 'Write down your prediction, then read the fixed point, the two ratios and the image of vertex 1.'),
        expectedObservations: [text('Negibna točka je še vedno središče \\((1,1)\\); razmerje dolžin je \\(\\tfrac32\\), razmerje ploščin \\(\\tfrac94\\), orientacija je ohranjena, slika oglišča 1 pa je \\((\\tfrac{13}{10},-\\tfrac{11}{10})\\).', 'The fixed point is still the centre \\((1,1)\\); the ratio of lengths is \\(\\tfrac32\\), the ratio of areas \\(\\tfrac94\\), the orientation is kept, and the image of vertex 1 is \\((\\tfrac{13}{10},-\\tfrac{11}{10})\\).')],
        scene: dilationScene('l3-similarity-scene', {centre: [1, 1], k: 1.5, turn: 'pythagorean'},
            'Središče \\((1,1)\\), \\(k=\\tfrac32\\), vrtež s kosinusom \\(\\tfrac35\\) in sinusom \\(\\tfrac45\\); negibna točka \\((1,1)\\), razmerje ploščin \\(\\tfrac94\\), slika oglišča 1 je \\((\\tfrac{13}{10},-\\tfrac{11}{10})\\).',
            'Centre \\((1,1)\\), \\(k=\\tfrac32\\), rotation with cosine \\(\\tfrac35\\) and sine \\(\\tfrac45\\); fixed point \\((1,1)\\), ratio of areas \\(\\tfrac94\\), the image of vertex 1 is \\((\\tfrac{13}{10},-\\tfrac{11}{10})\\).'),
    }),
    step({
        id: 'l3-free', order: 5,
        title: text('Kdaj je razteg izometrija?', 'When is a dilation an isometry?'),
        purpose: text('Sami poiskati razmerja, pri katerih razteg ohrani dolžine.', 'Finding for yourself the ratios at which a dilation keeps lengths.'),
        explanation: text(
            'Zdaj sam izbiraj središče, razmerje in vrtež. V lekciji o razvrščanju gibanj smo spoznali izometrije; tukaj poišči, pri katerih razmerjih \\(k\\) odčitek Izometrija pokaže da, in primerjaj negibne točke pri teh razmerjih.',
            'Now choose the centre, the ratio and the turn yourself. In the lesson on classifying motions we met isometries; here find at which ratios \\(k\\) the Isometry readout shows yes, and compare the fixed points at those ratios.',
        ),
        formulaIds: ['dilation', 'similarity'],
        observationPrompt: text('Poišči vsa razmerja \\(k\\), pri katerih je izometrija da, in zapiši negibne točke pri vsakem.', 'Find all the ratios \\(k\\) at which the isometry readout is yes, and write down the fixed points at each.'),
        expectedObservations: [text('Izometrija je da samo pri \\(k=1\\) in \\(k=-1\\). Pri \\(k=1\\) je negibna točka vsaka točka (identiteta); pri \\(k=-1\\) je negibno samo središče \\((1,1)\\) in slika oglišča 1 je \\((2,2)\\): polobrat okoli središča.', 'The isometry readout is yes only at \\(k=1\\) and \\(k=-1\\). At \\(k=1\\) every point is fixed (the identity); at \\(k=-1\\) only the centre \\((1,1)\\) is fixed and the image of vertex 1 is \\((2,2)\\): a half-turn about the centre.')],
        scene: dilationScene('l3-free-scene', {centre: [1, 1], k: 2, turn: 'r0'},
            'Središče \\((1,1)\\), \\(k=2\\); izometrija ne, razmerje ploščin \\(4\\), negibna točka \\((1,1)\\), slika oglišča 1 je \\((-1,-1)\\).',
            'Centre \\((1,1)\\), \\(k=2\\); isometry no, ratio of areas \\(4\\), fixed point \\((1,1)\\), the image of vertex 1 is \\((-1,-1)\\).'),
    }),
];

const sources: GuidedLesson['sources'] = [
    {
        id: 'matura-catalogue-togi-premiki',
        citation: 'Predmetni izpitni katalog za splošno maturo, matematika (M-MAT-2026), poglavje 4.6 (togi premiki in skladnost: vzporedni premik, zrcaljenje, vrtež, orientacija trikotnika). Cited from the text extraction of the catalogue.',
        implementationCorrespondence: 'The lessons follow the topic list: reflection, translation, rotation and orientation; the glide reflection and the classification theorem are enrichment beyond the catalogue. Discrete outcomes are exact on rational data built from grid mirrors.',
    },
    {
        id: 'bezeg-isometry-implementation',
        citation: 'Bezeg source: src/isometry/isometry2.ts, src/isometry/isometryModel.ts and src/graphs/isometry/IsometryGraph.tsx.',
        implementationCorrespondence: 'A scene sets the graph\'s mode, its number of mirrors and the grid points of the mirrors it names; the text quotes only values of those scenes or plain arithmetic (labelled calculation), and isometriesGuidedLessons.test.ts recomputes them with integer arithmetic and reads the readouts of the real graph.',
    },
];

const l3Sources: GuidedLesson['sources'] = [
    {
        id: 'matura-catalogue-razteg-podobnost',
        citation: 'Predmetni izpitni katalog za splošno maturo, matematika (M-MAT-2026), poglavje 4.6 (središčni razteg, podobnost). Cited from the text extraction of the catalogue.',
        implementationCorrespondence: 'The lesson follows the topic: the central dilation with a positive and a negative ratio, the ratio of lengths and areas, and the similarity as a dilation with an isometry; the rotation about the centre of the dilation is a choice of the graph.',
    },
    sources[1],
];

const l1: GuidedLesson = {
    demonstrationId: 'isometries',
    title: text('Dve zrcali', 'Two mirrors'),
    summary: text(
        'Dve zrcaljenji skupaj sta vrtež okoli presečišča zrcal za dvakratnik kota med njima, pri vzporednih zrcalih pa vzporedni premik za dvakratnik razdalje.',
        'Two reflections together are a rotation about the meeting point of the mirrors by twice the angle between them, and with parallel mirrors a translation by twice the distance.',
    ),
    prerequisites: [text('Zrcaljenje, koordinatni sistem in osnove vektorjev.', 'Reflection, the coordinate plane and the basics of vectors.')],
    learningGoals: [
        text('Napoveš sliko točke v dveh zaporednih zrcaljenjih.', 'Predict the image of a point in two successive reflections.'),
        text('Veš, da sta dve zrcali, ki se sekata, vrtež za dvakratnik kota med njima.', 'Know that two mirrors that meet make a rotation by twice the angle between them.'),
        text('Veš, da vzporedni zrcali dasta vzporedni premik, in da vrstni red zrcal šteje.', 'Know that parallel mirrors make a translation and that the order of the mirrors matters.'),
    ],
    formulaBlocks: l1Formulas,
    workedExamples: l1Examples,
    steps: l1Steps,
    sources,
    edgeCases: [
        text('Če točki \\(P\\) in \\(Q\\) zrcala sovpadata, zrcalo ni določeno in graf to sporoči; razred gibanja ni izpisan.', 'If the points \\(P\\) and \\(Q\\) of a mirror coincide, the mirror is undefined and the graph says so; no class of motion is written.'),
        text('Če sta zrcali enaki, je sestavljeno gibanje identiteta.', 'If the two mirrors are equal, the composite motion is the identity.'),
        text('Kota vrtenja in med zrcaloma sta izračunana približka; razred in središče sta natančna.', 'The angle of rotation and the angle between the mirrors are computed approximations; the class and the centre are exact.'),
    ],
    unresolvedQuestions: [],
};

const l2: GuidedLesson = {
    demonstrationId: 'isometries',
    title: text('Razvrščanje gibanj', 'Classifying a motion'),
    summary: text(
        'Vsako gibanje, sestavljeno iz zrcal, je vzporedni premik, vrtež, zrcaljenje ali zrcalni zdrs; razred določata orientacija slike in število negibnih točk.',
        'Every motion made of mirrors is a translation, a rotation, a reflection or a glide reflection; the class is decided by the orientation of the image and the number of fixed points.',
    ),
    prerequisites: [text('Lekcija o dveh zrcalih in orientacija trikotnika.', 'The lesson on two mirrors and the orientation of a triangle.')],
    learningGoals: [
        text('Napoveš, ali gibanje ohrani orientacijo, iz števila zrcal.', 'Predict from the number of mirrors whether a motion keeps the orientation.'),
        text('Ločiš vzporedni premik, vrtež, zrcaljenje in zrcalni zdrs po orientaciji in negibnih točkah.', 'Tell a translation, a rotation, a reflection and a glide reflection apart by the orientation and the fixed points.'),
        text('Veš, da tri zrcala niso vedno zrcalni zdrs.', 'Know that three mirrors are not always a glide reflection.'),
    ],
    formulaBlocks: l2Formulas,
    workedExamples: l2Examples,
    steps: l2Steps,
    sources,
    edgeCases: [
        text('Če točki zrcala sovpadata, zrcalo ni določeno in graf to sporoči.', 'If the points of a mirror coincide, the mirror is undefined and the graph says so.'),
        text('Zrcaljenje je zrcalni zdrs z vektorjem \\((0,0)\\); graf ga izpiše kot zrcaljenje.', 'A reflection is a glide reflection with the vector \\((0,0)\\); the graph writes it as a reflection.'),
        text('Če so vsa zrcala enaka ali je njihovo sestavljeno gibanje identiteta, so negibne vse točke ravnine.', 'If the composite motion is the identity, every point of the plane is fixed.'),
    ],
    unresolvedQuestions: [],
};

const l3: GuidedLesson = {
    demonstrationId: 'isometries',
    title: text('Središčni razteg in podobnost', 'Central dilation and similarity'),
    summary: text(
        'Središčni razteg ohrani kote, dolžine pomnoži z \\(|k|\\), ploščine s \\(k^2\\). Podobnost je razteg, sestavljen z izometrijo.',
        'A central dilation keeps angles, multiplies lengths by \\(|k|\\) and areas by \\(k^2\\). A similarity is a dilation composed with an isometry.',
    ),
    prerequisites: [text('Lekciji o dveh zrcalih in o razvrščanju gibanj ter vektorji v ravnini.', 'The lessons on two mirrors and on classifying motions, and vectors in the plane.')],
    learningGoals: [
        text('Napoveš sliko točke pri raztegu s podanim središčem in razmerjem.', 'Predict the image of a point under a dilation with a given centre and ratio.'),
        text('Veš, da razteg dolžine pomnoži z \\(|k|\\), ploščine s \\(k^2\\) in da ni izometrija, razen če je \\(|k|=1\\).', 'Know that a dilation multiplies lengths by \\(|k|\\) and areas by \\(k^2\\) and is not an isometry unless \\(|k|=1\\).'),
        text('Veš, da je podobnost razteg, sestavljen z izometrijo.', 'Know that a similarity is a dilation composed with an isometry.'),
    ],
    formulaBlocks: l3Formulas,
    workedExamples: l3Examples,
    steps: l3Steps,
    sources: l3Sources,
    edgeCases: [
        text('Pri \\(k=1\\) je razteg identiteta: negibne so vse točke ravnine.', 'For \\(k=1\\) the dilation is the identity: every point of the plane is fixed.'),
        text('Pri \\(k=-1\\) je razteg polobrat okoli središča: izometrija z eno negibno točko.', 'For \\(k=-1\\) the dilation is a half-turn about the centre: an isometry with one fixed point.'),
        text('Razmerje \\(k=0\\) ni razteg; polje ga ne sprejme. Razmerje je večkratnik števila \\(1/4\\) z \\(|k|\\le4\\).', 'The ratio \\(k=0\\) is not a dilation; the field does not accept it. The ratio is a multiple of \\(1/4\\) with \\(|k|\\le4\\).'),
        text('Slike lahko ležijo zunaj prikazanega dela ravnine; graf to sporoči in lahko oddaljiš pogled.', 'Images can lie outside the visible part of the plane; the graph says so and you can zoom out.'),
    ],
    unresolvedQuestions: [],
};

export const isometryTwoMirrorsLesson: GuidedLesson = l1;
export const isometryClassifyLesson: GuidedLesson = l2;
export const isometryDilationLesson: GuidedLesson = l3;
