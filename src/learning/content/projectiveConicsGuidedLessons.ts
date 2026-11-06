/**
 * Guided lessons of the Projective geometry and conics family (docs/specs/projective-conics-lessons.md), batch A: K1, the cross-ratio,
 * on `projective-cross-ratio`, K2, Pascal's theorem, on `projective-pascal`, K3, pole and polar, on `projective-pole-polar`, and K4, the five-point conic, on `projective-five-point` (its own module), and K5, one conic in three views, on `projective-three-views` (its own module). The text is a one-shot draft (docs/specs/new-lesson-families.md, "One-shot lesson text"): every number it
 * quotes is a value of the scene it belongs to, and `projectiveConicsGuidedLessons.test.ts` recomputes them with exact fractions, without
 * the projective kernel, and checks them against the real graph. Scenes use only the `projective` actions the graph of their lesson registers
 * (K1: `load-example` and `move-handle`; K2: the `pascal-*` operations; K3: the `pole-polar-*` operations), and every scene sets every value it states, so it does not depend on the scene before it.
 */
import type {LessonAction} from '../model';
import {fivePointLesson} from './projectiveFivePointGuidedLesson';
import {threeViewsLesson} from './projectiveThreeViewsGuidedLesson';
import type {GuidedLesson, GuidedLessonFrame, GuidedLessonFrameKind, GuidedLessonStep, LessonScene, LocalizedText} from './guidedLessons';

const text = (sl: string, en: string): LocalizedText => ({sl, en});
const frame = (id: string, kind: GuidedLessonFrameKind): GuidedLessonFrame => ({id, kind});

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

export type CrossRatioLessonExample = 'default' | 'harmonic' | 'infinity';

/** A K1 scene from the default scene: an example, then the handle moves (handles 0-3 are A-D, 4 is the centre O, 5-6 are M and N). */
const crossRatioScene = (
    id: string, example: CrossRatioLessonExample, moves: readonly (readonly [handle: number, x: number, y?: number])[], sl: string, en: string,
): LessonScene => {
    const actions: LessonAction[] = [
        {kind: 'prepared-scene', sceneId: id, source: 'demonstration-default'},
        {kind: 'projective', operation: 'load-example', exampleId: example},
        ...moves.map(([handle, x, y]): LessonAction => ({kind: 'projective', operation: 'move-handle', handle, x, y})),
    ];
    return {id, basedOn: 'demonstration-default', actions, expectedState: text(sl, en)};
};

export type PascalLessonExample = 'default' | 'infinity';
export type PolePolarLessonExample = 'default' | 'on' | 'infinity';
type PolePolarSceneOperation = Extract<LessonAction, {kind: 'projective'; operation: 'pole-polar-set-conic' | 'pole-polar-place' | 'pole-polar-set-direction'}>;
type PascalSceneOperation = Extract<LessonAction, {kind: 'projective'; operation: 'pascal-set-conic' | 'pascal-set-order' | 'pascal-set-index'}>;

/** The direction-table index of the line direction (5, 4), the position of the point D in the K2 drag scene (the test pins it to that direction). */
export const PASCAL_DRAG_INDEX = 52;

const crossRatioLesson: GuidedLesson = {
    demonstrationId: 'projective-cross-ratio',
    title: text('Dvorazmerje', 'Cross-ratio'),
    summary: text(
        'Štiri točke na premici imajo število, dvorazmerje \\((A,B;C,D)=\\frac{(C-A)(D-B)}{(C-B)(D-A)}\\), ki se pri središčni projekciji iz točke na drugo premico ne spremeni, čeprav se dolžine in njihova razmerja spremenijo. Harmonična četverka je primer z dvorazmerjem \\(-1\\). Točka, ki se projicira v neskončnost, je obravnavana z isto formulo kot mejni primer.',
        'Four points on a line have a number, the cross-ratio \\((A,B;C,D)=\\frac{(C-A)(D-B)}{(C-B)(D-A)}\\), that a central projection from a point onto another line does not change, although lengths and their ratios do. A harmonic quadruple is the case \\(-1\\). A point that projects to infinity is handled by the same formula as a limit case.',
    ),
    prerequisites: [
        text('Potrebno je le poznavanje koordinat na premici; točka v neskončnosti je v lekciji predstavljena kot meja točke, ki beži stran.', 'Only coordinates on a line are needed; the lesson introduces a point at infinity as the limit of a point running away.'),
    ],
    learningGoals: [
        text('Izračunaš dvorazmerje \\((A,B;C,D)\\) štirih točk na premici iz njihovih abscis.', 'Compute the cross-ratio \\((A,B;C,D)\\) of four points on a line from their abscissae.'),
        text('Razložiš, da se pri središčni projekciji dolžine in njihova razmerja spremenijo, dvorazmerje pa ne (izrek), in da je premik točk na grafu ilustracija, ne dokaz.', 'Explain that under a central projection lengths and their ratios change but the cross-ratio does not (a theorem), and that dragging the points on the graph illustrates it without proving it.'),
        text('Prepoznaš harmonično četverko po vrednosti \\(-1\\) in razumeš, kako se formula nadaljuje, ko se ena slika preseli v neskončnost.', 'Recognise a harmonic quadruple by the value \\(-1\\) and see how the formula continues when one image moves to infinity.'),
    ],
    formulaBlocks: [
        {
            id: 'cross-ratio-definition',
            latex: '(A,B;C,D)=\\frac{(C-A)(D-B)}{(C-B)(D-A)}',
            notation: text(
                '\\(A\\), \\(B\\), \\(C\\), \\(D\\) so abscise štirih različnih točk na premici; poimenovanje točk je vrstni red v zapisu \\((A,B;C,D)\\).',
                '\\(A\\), \\(B\\), \\(C\\), \\(D\\) are the abscissae of four distinct points on a line; the order of the points is the order in \\((A,B;C,D)\\).',
            ),
            explanation: text(
                'Izrek (invariantnost dvorazmerja): če štiri kolinearne točke iz središča \\(O\\), ki ne leži na nobeni od obeh premic, projiciramo na drugo premico, imajo slike isto dvorazmerje kot izvirne točke. Izrek je naveden po temi dvorazmerje v učnem načrtu FMF (Afina in projektivna geometrija) in v standardnih učbenikih projektivne geometrije; lekcija ga ne dokazuje. Premik točk na grafu je ilustracija izreka, ne dokaz.',
                'Theorem (invariance of the cross-ratio): if four collinear points are projected from a centre \\(O\\) that lies on neither line onto another line, their images have the same cross-ratio as the original points. The theorem is stated after the topic cross-ratio in the FMF syllabus (Afina in projektivna geometrija) and in standard textbooks of projective geometry; the lesson does not prove it. Dragging the points on the graph illustrates the theorem and is not a proof.',
            ),
        },
        {
            id: 'cross-ratio-limit',
            latex: '(A,B;C,\\infty)=\\frac{C-A}{C-B}',
            notation: text(
                '\\(\\infty\\) je točka v neskončnosti, ki jo dobimo, ko \\(D\\) beži proč po premici; faktor \\(D\\) se v obeh delih ulomka okrajša.',
                '\\(\\infty\\) is the point at infinity obtained as \\(D\\) runs away along the line; the factor \\(D\\) cancels in numerator and denominator.',
            ),
            explanation: text(
                'Ko \\(D\\to\\pm\\infty\\), gre \\(\\frac{D-B}{D-A}\\to1\\), zato ostane \\(\\frac{C-A}{C-B}\\). Enako velja za sliko, ki leži v neskončnosti: graf takrat prikaže puščico v smeri druge premice in izpiše mejno formulo.',
                'As \\(D\\to\\pm\\infty\\), \\(\\frac{D-B}{D-A}\\to1\\), so \\(\\frac{C-A}{C-B}\\) remains. The same holds for an image at infinity: the graph then draws an arrow along the direction of the second line and writes the limit formula.',
            ),
        },
    ],
    workedExamples: [
        {
            id: 'k1-default-ratio',
            title: text('Dvorazmerje točk \\(0,1,3,4\\)', 'The cross-ratio of the points \\(0,1,3,4\\)'),
            calculationLatex: '\\frac{(3-0)(4-1)}{(3-1)(4-0)}',
            resultLatex: '\\frac98',
            check: text(
                'Števec je \\(3\\cdot3=9\\), imenovalec \\(2\\cdot4=8\\), zato je \\((A,B;C,D)=\\tfrac98=1{,}125\\). Slike imajo abscise \\(0\\), \\(\\tfrac8{11}\\), \\(\\tfrac{24}{13}\\), \\(\\tfrac{16}7\\); števec je \\(\\tfrac{24}{13}\\cdot\\tfrac{120}{77}=\\tfrac{2880}{1001}\\), imenovalec \\(\\tfrac{160}{143}\\cdot\\tfrac{16}7=\\tfrac{2560}{1001}\\) in količnik je spet \\(\\tfrac98\\).',
                'The numerator is \\(3\\cdot3=9\\), the denominator \\(2\\cdot4=8\\), so \\((A,B;C,D)=\\tfrac98=1.125\\). The images have abscissae \\(0\\), \\(\\tfrac8{11}\\), \\(\\tfrac{24}{13}\\), \\(\\tfrac{16}7\\); the numerator is \\(\\tfrac{24}{13}\\cdot\\tfrac{120}{77}=\\tfrac{2880}{1001}\\), the denominator \\(\\tfrac{160}{143}\\cdot\\tfrac{16}7=\\tfrac{2560}{1001}\\) and the quotient is again \\(\\tfrac98\\).',
            ),
        },
        {
            id: 'k1-infinity-ratio',
            title: text('Dvorazmerje točk \\(0,1,3,-10\\)', 'The cross-ratio of the points \\(0,1,3,-10\\)'),
            calculationLatex: '\\frac{(3-0)(-10-1)}{(3-1)(-10-0)}',
            resultLatex: '\\frac{33}{20}',
            check: text(
                'Števec je \\(3\\cdot(-11)=-33\\), imenovalec \\(2\\cdot(-10)=-20\\), zato je \\((A,B;C,D)=\\tfrac{33}{20}=1{,}65\\). Za sliko, ki ima \\(D^{\\prime}\\) v neskončnosti, mejna formula da \\(\\frac{C^{\\prime}-A^{\\prime}}{C^{\\prime}-B^{\\prime}}=\\frac{24/13}{160/143}=\\tfrac{33}{20}\\).',
                'The numerator is \\(3\\cdot(-11)=-33\\), the denominator \\(2\\cdot(-10)=-20\\), so \\((A,B;C,D)=\\tfrac{33}{20}=1.65\\). For the image with \\(D^{\\prime}\\) at infinity the limit formula gives \\(\\frac{C^{\\prime}-A^{\\prime}}{C^{\\prime}-B^{\\prime}}=\\frac{24/13}{160/143}=\\tfrac{33}{20}\\).',
            ),
        },
    ],
    steps: [
        step({
            id: 'ratio-predict', order: 1,
            title: text('Štiri točke na premici', 'Four points on a line'),
            purpose: text('Napovedati, kaj se pri projekciji ohrani, preden to izmerimo.', 'Predicting what a projection keeps before measuring it.'),
            explanation: text(
                'Na premici \\(y=0\\) so točke \\(A\\), \\(B\\), \\(C\\), \\(D\\) z abscisami \\(0\\), \\(1\\), \\(3\\), \\(4\\). Iz središča \\(O=(0,5)\\) jih projiciramo na drugo premico \\(y=1+\\tfrac x2\\): žarek iz \\(O\\) skozi točko prve premice zadene drugo premico v sliki te točke. Razmiki izvirnih točk so \\(1\\), \\(2\\), \\(1\\). Pred naslednjim korakom napovej, kaj se pri tem ne spremeni.',
                'On the line \\(y=0\\) the points \\(A\\), \\(B\\), \\(C\\), \\(D\\) have abscissae \\(0\\), \\(1\\), \\(3\\), \\(4\\). From the centre \\(O=(0,5)\\) they are projected onto the second line \\(y=1+\\tfrac x2\\): the ray from \\(O\\) through a point of the first line meets the second line in the image of that point. The gaps between the original points are \\(1\\), \\(2\\), \\(1\\). Before the next step, predict what stays fixed.',
            ),
            formulaIds: [],
            observationPrompt: text('Poišči središče \\(O\\), obe premici in žarke ter zapiši, kaj meniš, da se ohrani.', 'Find the centre \\(O\\), both lines and the rays, and write down what you think stays fixed.'),
            expectedObservations: [text('Štiri točke na prvi premici imajo slike na drugi premici, ki ležijo na žarkih iz \\(O\\).', 'The four points of the first line have images on the second line that lie on the rays from \\(O\\).')],
            scene: crossRatioScene('ratio-predict-scene', 'default', [],
                'Točke \\(A,B,C,D\\) imajo abscise \\(0,1,3,4\\), središče je \\(O=(0,5)\\), druga premica je \\(y=1+\\tfrac x2\\); slika točke \\(A\\) je \\((0,1)\\).',
                'The points \\(A,B,C,D\\) have abscissae \\(0,1,3,4\\), the centre is \\(O=(0,5)\\), the second line is \\(y=1+\\tfrac x2\\); the image of \\(A\\) is \\((0,1)\\).'),
        }),
        step({
            id: 'ratio-lengths', order: 2,
            title: text('Dolžine se spremenijo', 'Lengths change'),
            purpose: text('Videti, da dolžine in razmerja dolžin niso tisto, kar se ohrani.', 'Seeing that lengths and ratios of lengths are not what is kept.'),
            explanation: text(
                'Slike imajo abscise \\(0\\), \\(\\tfrac8{11}\\), \\(\\tfrac{24}{13}\\), \\(\\tfrac{16}7\\), njihovi razmiki pa so \\(\\tfrac8{11}\\), \\(\\tfrac{160}{143}\\), \\(\\tfrac{40}{91}\\). Izvirni razmiki \\(AB\\) in \\(CD\\) sta enaka (oba \\(1\\)), razmika slik pa sta različna: približno \\(0{,}73\\) in \\(0{,}44\\). Tudi razmerje \\(AB:BC=1:2\\) postane \\(A^{\\prime}B^{\\prime}:B^{\\prime}C^{\\prime}=13:20\\). Dolžine in razmerja dolžin torej niso invariante središčne projekcije.',
                'The images have abscissae \\(0\\), \\(\\tfrac8{11}\\), \\(\\tfrac{24}{13}\\), \\(\\tfrac{16}7\\), and their gaps are \\(\\tfrac8{11}\\), \\(\\tfrac{160}{143}\\), \\(\\tfrac{40}{91}\\). The original gaps \\(AB\\) and \\(CD\\) are equal (both \\(1\\)), but the gaps of the images differ: about \\(0.73\\) and \\(0.44\\). The ratio \\(AB:BC=1:2\\) also becomes \\(A^{\\prime}B^{\\prime}:B^{\\prime}C^{\\prime}=13:20\\). Lengths and ratios of lengths are therefore not invariants of a central projection.',
            ),
            formulaIds: [],
            observationPrompt: text('Primerjaj razmik \\(A^{\\prime}B^{\\prime}\\) z razmikom \\(C^{\\prime}D^{\\prime}\\), čeprav sta \\(AB\\) in \\(CD\\) enaka.', 'Compare the gap \\(A^{\\prime}B^{\\prime}\\) with the gap \\(C^{\\prime}D^{\\prime}\\), although \\(AB\\) and \\(CD\\) are equal.'),
            expectedObservations: [text('Enaka razmika \\(AB\\) in \\(CD\\) imata različni sliki; razmerje \\(1:2\\) postane \\(13:20\\).', 'The equal gaps \\(AB\\) and \\(CD\\) have different images; the ratio \\(1:2\\) becomes \\(13:20\\).')],
            scene: crossRatioScene('ratio-lengths-scene', 'default', [],
                'Isti primer: \\(A,B,C,D\\) pri \\(0,1,3,4\\), slike \\(A^{\\prime}=(0,1)\\), \\(B^{\\prime}=(\\tfrac8{11},\\tfrac{15}{11})\\), \\(C^{\\prime}=(\\tfrac{24}{13},\\tfrac{25}{13})\\), \\(D^{\\prime}=(\\tfrac{16}7,\\tfrac{15}7)\\).',
                'The same example: \\(A,B,C,D\\) at \\(0,1,3,4\\), images \\(A^{\\prime}=(0,1)\\), \\(B^{\\prime}=(\\tfrac8{11},\\tfrac{15}{11})\\), \\(C^{\\prime}=(\\tfrac{24}{13},\\tfrac{25}{13})\\), \\(D^{\\prime}=(\\tfrac{16}7,\\tfrac{15}7)\\).'),
        }),
        step({
            id: 'ratio-invariant', order: 3,
            title: text('Dvorazmerje se ohrani', 'The cross-ratio is kept'),
            purpose: text('Izračunati dvorazmerje izvirnih točk in slik ter videti, da je enako.', 'Computing the cross-ratio of the original points and of the images and seeing that it is the same.'),
            explanation: text(
                'Dvorazmerje je \\((A,B;C,D)=\\frac{(C-A)(D-B)}{(C-B)(D-A)}\\). Za izvirne točke je \\(\\frac{(3-0)(4-1)}{(3-1)(4-0)}=\\tfrac98=1{,}125\\), za slike pa graf izpiše isto vrednost \\(\\tfrac98\\). Izrek pravi, da je to res za vsako središčno projekcijo; to, da sta števili enaki, je njegova posledica na tem primeru.',
                'The cross-ratio is \\((A,B;C,D)=\\frac{(C-A)(D-B)}{(C-B)(D-A)}\\). For the original points it is \\(\\frac{(3-0)(4-1)}{(3-1)(4-0)}=\\tfrac98=1.125\\), and for the images the graph writes the same value \\(\\tfrac98\\). The theorem says this holds for every central projection; the equality of the two numbers is its consequence in this example.',
            ),
            formulaIds: ['cross-ratio-definition'],
            workedExampleId: 'k1-default-ratio',
            observationPrompt: text('Primerjaj odčitek za izvirne točke z odčitkom za slike.', 'Compare the readout for the original points with the readout for the images.'),
            expectedObservations: [text('Oba odčitka kažeta \\(\\tfrac98\\), decimalno \\(1{,}125\\).', 'Both readouts show \\(\\tfrac98\\), as a decimal \\(1.125\\).')],
            scene: crossRatioScene('ratio-invariant-scene', 'default', [],
                'Dvorazmerje izvirnih točk \\(0,1,3,4\\) je \\(\\tfrac98\\) in dvorazmerje njihovih slik je prav tako \\(\\tfrac98\\); vrednost je \\(1{,}125\\).',
                'The cross-ratio of the original points \\(0,1,3,4\\) is \\(\\tfrac98\\) and the cross-ratio of their images is also \\(\\tfrac98\\); the value is \\(1.125\\).'),
        }),
        step({
            id: 'ratio-drag', order: 4,
            title: text('Premik središča in druge premice', 'Moving the centre and the second line'),
            purpose: text('Preizkusiti izrek na drugi postavitvi; premik je ilustracija, ne dokaz.', 'Trying the theorem on another set-up; moving is an illustration, not a proof.'),
            explanation: text(
                'Središče je premaknjeno v \\(O=(3,6)\\), druga premica pa v \\(y=1\\) (skozi \\(M=(0,1)\\) in \\(N=(4,1)\\)). Premici sta vzporedni, zato je projekcija podobnost s faktorjem \\(\\tfrac56\\): slike imajo abscise \\(\\tfrac12\\), \\(\\tfrac43\\), \\(3\\), \\(\\tfrac{23}6\\). Dvorazmerje je spet \\(\\tfrac98\\). Premakni središče ali točko \\(N\\) še sam: odčitek ostane \\(\\tfrac98\\), dokler je projekcija določena. To je ilustracija; dokaz je izrek.',
                'The centre is moved to \\(O=(3,6)\\) and the second line to \\(y=1\\) (through \\(M=(0,1)\\) and \\(N=(4,1)\\)). The lines are parallel, so the projection is a similarity with factor \\(\\tfrac56\\): the images have abscissae \\(\\tfrac12\\), \\(\\tfrac43\\), \\(3\\), \\(\\tfrac{23}6\\). The cross-ratio is again \\(\\tfrac98\\). Move the centre or the point \\(N\\) yourself: the readout stays \\(\\tfrac98\\) as long as the projection is defined. This is an illustration; the proof is the theorem.',
            ),
            formulaIds: ['cross-ratio-definition'],
            observationPrompt: text('Premakni središče in opazuj, kako se slike premikajo in odčitek ostane enak.', 'Move the centre and watch the images move while the readout stays the same.'),
            expectedObservations: [text('Slike se premaknejo, dvorazmerje ostane \\(\\tfrac98\\).', 'The images move, the cross-ratio stays \\(\\tfrac98\\).')],
            scene: crossRatioScene('ratio-drag-scene', 'default', [[4, 3, 6], [6, 4, 1]],
                'Središče je \\(O=(3,6)\\), druga premica je \\(y=1\\) skozi \\(M=(0,1)\\) in \\(N=(4,1)\\); slike so \\((\\tfrac12,1)\\), \\((\\tfrac43,1)\\), \\((3,1)\\), \\((\\tfrac{23}6,1)\\); dvorazmerje izvirnih točk in slik je \\(\\tfrac98\\).',
                'The centre is \\(O=(3,6)\\), the second line is \\(y=1\\) through \\(M=(0,1)\\) and \\(N=(4,1)\\); the images are \\((\\tfrac12,1)\\), \\((\\tfrac43,1)\\), \\((3,1)\\), \\((\\tfrac{23}6,1)\\); the cross-ratio of the original points and of the images is \\(\\tfrac98\\).'),
        }),
        step({
            id: 'ratio-harmonic', order: 5,
            title: text('Harmonična četverka', 'A harmonic quadruple'),
            purpose: text('Spoznati posebno vrednost \\(-1\\).', 'Meeting the special value \\(-1\\).'),
            explanation: text(
                'Točke z abscisami \\(0\\), \\(6\\), \\(2\\), \\(-6\\) imajo dvorazmerje \\(\\frac{(2-0)(-6-6)}{(2-6)(-6-0)}=\\frac{-24}{24}=-1\\); takšni četverki pravimo harmonična četverka. Iz središča \\(O=(0,5)\\) so slike v točkah \\((0,1)\\), \\((3,\\tfrac52)\\), \\((\\tfrac43,\\tfrac53)\\), \\((-12,-5)\\) in njihovo dvorazmerje je spet \\(-1\\). Negativna vrednost pove, da točki \\(C\\) in \\(D\\) ločita točki \\(A\\) in \\(B\\).',
                'The points with abscissae \\(0\\), \\(6\\), \\(2\\), \\(-6\\) have the cross-ratio \\(\\frac{(2-0)(-6-6)}{(2-6)(-6-0)}=\\frac{-24}{24}=-1\\); such a quadruple is called a harmonic quadruple. From the centre \\(O=(0,5)\\) the images are the points \\((0,1)\\), \\((3,\\tfrac52)\\), \\((\\tfrac43,\\tfrac53)\\), \\((-12,-5)\\) and their cross-ratio is again \\(-1\\). The negative value says that the points \\(C\\) and \\(D\\) separate the points \\(A\\) and \\(B\\).',
            ),
            formulaIds: ['cross-ratio-definition'],
            observationPrompt: text('Preberi odčitek za izvirne točke in za slike.', 'Read the readout for the original points and for the images.'),
            expectedObservations: [text('Oba odčitka kažeta \\(-1\\).', 'Both readouts show \\(-1\\).')],
            scene: crossRatioScene('ratio-harmonic-scene', 'harmonic', [],
                'Točke \\(A,B,C,D\\) imajo abscise \\(0,6,2,-6\\); dvorazmerje izvirnih točk in slik je \\(-1\\); slika točke \\(D\\) je \\((-12,-5)\\).',
                'The points \\(A,B,C,D\\) have abscissae \\(0,6,2,-6\\); the cross-ratio of the original points and of the images is \\(-1\\); the image of \\(D\\) is \\((-12,-5)\\).'),
        }),
        step({
            id: 'ratio-infinity', order: 6,
            title: text('Točka gre v neskončnost', 'A point goes to infinity'),
            purpose: text('Videti, da formula teče naprej, ko je ena slika točka v neskončnosti.', 'Seeing that the formula carries on when one image is a point at infinity.'),
            explanation: text(
                'Točka \\(D\\) je pri \\(-10\\). Žarek iz \\(O=(0,5)\\) skozi \\(D\\) ima smer \\((-10,-5)\\), ki je vzporedna drugi premici, zato je \\(D^{\\prime}\\) točka v neskončnosti te premice; graf zapiše njeno smer kot \\((2,1)\\) in jo nariše kot puščico. Dvorazmerje izvirnih točk \\(0,1,3,-10\\) je \\(\\tfrac{33}{20}=1{,}65\\). Za slike odčitek preklopi na mejno formulo \\(\\frac{C^{\\prime}-A^{\\prime}}{C^{\\prime}-B^{\\prime}}\\), ki da prav tako \\(\\tfrac{33}{20}\\), kot izrek zahteva tudi za sliko v neskončnosti.',
                'The point \\(D\\) is at \\(-10\\). The ray from \\(O=(0,5)\\) through \\(D\\) has the direction \\((-10,-5)\\), which is parallel to the second line, so \\(D^{\\prime}\\) is the point at infinity of that line; the graph writes its direction as \\((2,1)\\) and draws it as an arrow. The cross-ratio of the original points \\(0,1,3,-10\\) is \\(\\tfrac{33}{20}=1.65\\). For the images the readout switches to the limit formula \\(\\frac{C^{\\prime}-A^{\\prime}}{C^{\\prime}-B^{\\prime}}\\), which also gives \\(\\tfrac{33}{20}\\), as the theorem requires for an image at infinity too.',
            ),
            formulaIds: ['cross-ratio-limit'],
            workedExampleId: 'k1-infinity-ratio',
            observationPrompt: text('Poišči puščico točke \\(D^{\\prime}\\) in preberi, katero formulo uporablja odčitek.', 'Find the arrow of the point \\(D^{\\prime}\\) and read which formula the readout uses.'),
            expectedObservations: [text('\\(D^{\\prime}\\) je v neskončnosti, odčitek navede mejno formulo in vrednost \\(\\tfrac{33}{20}\\).', '\\(D^{\\prime}\\) is at infinity, and the readout names the limit formula and the value \\(\\tfrac{33}{20}\\).')],
            scene: crossRatioScene('ratio-infinity-scene', 'infinity', [],
                'Točke \\(A,B,C,D\\) imajo abscise \\(0,1,3,-10\\); \\(D^{\\prime}\\) je točka v neskončnosti v smeri \\((2,1)\\) (žarek ima smer \\((-10,-5)\\)); dvorazmerje izvirnih točk je \\(\\tfrac{33}{20}\\) in mejna formula za slike da prav tako \\(\\tfrac{33}{20}\\).',
                'The points \\(A,B,C,D\\) have abscissae \\(0,1,3,-10\\); \\(D^{\\prime}\\) is a point at infinity in the direction \\((2,1)\\) (the ray has the direction \\((-10,-5)\\)); the cross-ratio of the original points is \\(\\tfrac{33}{20}\\) and the limit formula for the images also gives \\(\\tfrac{33}{20}\\).'),
        }),
        step({
            id: 'ratio-explore', order: 7,
            title: text('Samostojno raziskovanje', 'Free exploration'),
            purpose: text('Preizkusiti izrek na lastnih postavitvah in videti, kdaj projekcija ni določena.', 'Testing the theorem on your own set-ups and seeing when the projection is undefined.'),
            explanation: text(
                'Točke imajo abscise \\(0,1,2,4\\) in dvorazmerje je \\(\\frac{(2-0)(4-1)}{(2-1)(4-0)}=\\tfrac32=1{,}5\\). Premikaj točke, središče in drugo premico in preveri, da se dvorazmerje slik ujema z dvorazmerjem izvirnih točk. Če postaviš središče na eno od premic ali ujameš dve točki, graf navede, da dvorazmerje ni določeno, in ne izpiše vrednosti.',
                'The points have abscissae \\(0,1,2,4\\) and the cross-ratio is \\(\\frac{(2-0)(4-1)}{(2-1)(4-0)}=\\tfrac32=1.5\\). Move the points, the centre and the second line and check that the cross-ratio of the images matches that of the original points. If you put the centre on one of the lines or make two points coincide, the graph states that the cross-ratio is undefined and shows no value.',
            ),
            formulaIds: ['cross-ratio-definition', 'cross-ratio-limit'],
            observationPrompt: text('Poišči postavitev, pri kateri je odčitek \\(-1\\), in postavitev, pri kateri je slika v neskončnosti.', 'Find a set-up where the readout is \\(-1\\) and one where an image is at infinity.'),
            expectedObservations: [text('Dokler je projekcija določena, je dvorazmerje slik enako dvorazmerju izvirnih točk.', 'As long as the projection is defined, the cross-ratio of the images equals that of the original points.')],
            scene: crossRatioScene('ratio-explore-scene', 'default', [[2, 2]],
                'Točke \\(A,B,C,D\\) imajo abscise \\(0,1,2,4\\); dvorazmerje izvirnih točk in slik je \\(\\tfrac32\\); središče je \\(O=(0,5)\\).',
                'The points \\(A,B,C,D\\) have abscissae \\(0,1,2,4\\); the cross-ratio of the original points and of the images is \\(\\tfrac32\\); the centre is \\(O=(0,5)\\).'),
        }),
    ],
    sources: [
        {
            id: 'fmf-projective-geometry-syllabus',
            citation: 'Fakulteta za matematiko in fiziko, Univerza v Ljubljani, učni načrt Afina in projektivna geometrija (1Mate/2Mate 2025), tema dvorazmerje in harmonična četverka. Cited from the syllabus topic list; not opened beyond the list.',
            implementationCorrespondence: 'The theorem of the invariance of the cross-ratio under central projection, with the point at infinity included, is the statement of docs/specs/projective-conics-lessons.md section K1 and is checked in the app by the exact kernel src/projective/homogeneous.ts.',
        },
        {
            id: 'coxeter-projective-geometry',
            citation: 'Coxeter, H. S. M. Projective Geometry, 2nd ed., Springer, 1987, chapter on the cross-ratio. Standard text, cited and not opened.',
            implementationCorrespondence: 'The text supplies the theorem and the definition of a harmonic quadruple that the lesson states; the lesson does not reproduce a proof, and the drag on the graph is labelled an illustration.',
        },
        {
            id: 'bezeg-cross-ratio-implementation',
            citation: 'Bezeg source: src/projective/homogeneous.ts, src/graphs/projective/crossRatioModel.ts and src/graphs/projective/CrossRatioGraph.tsx.',
            implementationCorrespondence: 'A scene loads an example and moves handles on the integer grid by the graph\'s own edit path; the lesson text quotes only values of those scenes, and the test recomputes them with exact fractions.',
        },
    ],
    edgeCases: [
        text('Če središče leži na eni od obeh premic ali če se dve izvirni točki ujemata, graf navede, da dvorazmerje ni določeno; vrednosti ne izpiše.', 'If the centre lies on either line or two original points coincide, the graph states that the cross-ratio is undefined and shows no value.'),
        text('Največ ena slika je lahko v neskončnosti; takrat odčitek za slike uporabi mejno formulo in to izrecno navede.', 'At most one image can be at infinity; the readout for the images then uses the limit formula and says so.'),
        text('Točke in središče so na celoštevilski mreži z \\(|x|,|y|\\le30\\), zato so vsa dvorazmerja natančni ulomki.', 'The points and the centre sit on an integer grid with \\(|x|,|y|\\le30\\), so every cross-ratio is an exact fraction.'),
    ],
    unresolvedQuestions: [],
};

/** A K2 scene from the default scene: `pascal-load-example`, then the conic, order and position operations (PascalGraph's own control actions). */
const pascalScene = (
    id: string, example: PascalLessonExample, operations: readonly PascalSceneOperation[], sl: string, en: string,
): LessonScene => {
    const actions: LessonAction[] = [
        {kind: 'prepared-scene', sceneId: id, source: 'demonstration-default'},
        {kind: 'projective', operation: 'pascal-load-example', exampleId: example},
        ...operations,
    ];
    return {id, basedOn: 'demonstration-default', actions, expectedState: text(sl, en)};
};

const pascalLesson: GuidedLesson = {
    demonstrationId: 'projective-pascal',
    title: text('Pascalov izrek', 'Pascal\'s theorem'),
    summary: text(
        'Če je šest točk \\(A_1,\\dots,A_6\\) na stožnici in je šestkotnik \\(A_1A_2A_3A_4A_5A_6\\), ležijo presečišča nasprotnih stranic, \\(P_1=s_1\\cap s_4\\), \\(P_2=s_2\\cap s_5\\) in \\(P_3=s_3\\cap s_6\\), na eni premici (Pascalov izrek). Za izrojeno stožnico, par premic, je to Pappusov izrek. Presečišče lahko leži v neskončnosti; takrat ga graf ne nariše kot končno točko, ampak navede smer.',
        'If six points \\(A_1,\\dots,A_6\\) lie on a conic and form the hexagon \\(A_1A_2A_3A_4A_5A_6\\), the intersections of opposite sides, \\(P_1=s_1\\cap s_4\\), \\(P_2=s_2\\cap s_5\\) and \\(P_3=s_3\\cap s_6\\), lie on one line (Pascal\'s theorem). For a degenerate conic, a pair of lines, this is Pappus\'s theorem. An intersection may lie at infinity; the graph then does not draw it as a finite point but states its direction.',
    ),
    prerequisites: [
        text('Koordinate točk v ravnini in enačba premice skozi dve točki; lekcija o dvorazmerju pomaga pri točkah v neskončnosti, vendar ni pogoj.', 'Coordinates of points in the plane and the equation of a line through two points; the cross-ratio lesson helps with points at infinity but is not required.'),
    ],
    learningGoals: [
        text('Poiščeš tri presečišča nasprotnih stranic šestkotnika s šestimi točkami na stožnici in preveriš, da ležijo na isti premici.', 'Find the three intersections of opposite sides of a hexagon with six points on a conic and check that they lie on one line.'),
        text('Razložiš Pascalov izrek kot izrek, ki ga lekcija ne dokazuje, in premikanje točk po stožnici kot ilustracijo, ne dokaz.', 'State Pascal\'s theorem as a theorem that the lesson does not prove, and dragging the points along the conic as an illustration, not a proof.'),
        text('Prepoznaš Pappusov izrek kot izrek o paru premic in presečišče nasprotnih stranic v neskončnosti kot smer.', 'Recognise Pappus\'s theorem as the theorem for a pair of lines, and an intersection of opposite sides at infinity as a direction.'),
    ],
    formulaBlocks: [
        {
            id: 'pascal-points',
            latex: 'P_1=s_1\\cap s_4,\\quad P_2=s_2\\cap s_5,\\quad P_3=s_3\\cap s_6',
            notation: text(
                '\\(s_i\\) je stranica, ki povezuje \\(i\\)-to in \\((i+1)\\)-to oglišče šestkotnika (\\(s_6\\) zadnje z prvim); \\(P_1\\), \\(P_2\\), \\(P_3\\) so presečišča nasprotnih stranic in jih graf poimenuje enako.',
                '\\(s_i\\) is the side joining the \\(i\\)-th and \\((i+1)\\)-th vertex of the hexagon (\\(s_6\\) joins the last to the first); \\(P_1\\), \\(P_2\\), \\(P_3\\) are the intersections of opposite sides and the graph names them the same way.',
            ),
            explanation: text(
                'Izrek (Pascal): za šest točk na stožnici so \\(P_1\\), \\(P_2\\) in \\(P_3\\) kolinearne, kar velja za vsak vrstni red oglišč, tudi za prekrižan šestkotnik. Izrek je naveden po temi Pascalov izrek v učnem načrtu FMF (Afina in projektivna geometrija) in v standardnem učbeniku projektivne geometrije; lekcija ga ne dokazuje. Premikanje točk po stožnici je ilustracija izreka, ne dokaz.',
                'Theorem (Pascal): for six points on a conic, \\(P_1\\), \\(P_2\\) and \\(P_3\\) are collinear, for every order of the vertices, including a self-crossing hexagon. The theorem is stated after the topic Pascal\'s theorem in the FMF syllabus (Afina in projektivna geometrija) and in a standard textbook of projective geometry; the lesson does not prove it. Dragging the points along the conic is an illustration of the theorem, not a proof.',
            ),
        },
        {
            id: 'pascal-collinear',
            latex: 'D=\\begin{vmatrix}x_1&y_1&w_1\\\\x_2&y_2&w_2\\\\x_3&y_3&w_3\\end{vmatrix}=0',
            notation: text(
                '\\((x_i,y_i,w_i)\\) so homogene koordinate točke \\(P_i\\); točka v neskončnosti ima \\(w_i=0\\). Tri točke so kolinearne natanko tedaj, ko je \\(D=0\\).',
                '\\((x_i,y_i,w_i)\\) are the homogeneous coordinates of the point \\(P_i\\); a point at infinity has \\(w_i=0\\). Three points are collinear exactly when \\(D=0\\).',
            ),
            explanation: text(
                'Točke imajo celoštevilske ali ulomljene koordinate, zato graf izračuna \\(D\\) natančno z ulomki in izpiše \\(0\\) ali pravo vrednost; zaokroževalne napake ne obstajajo. Pascalov izrek zagotavlja \\(D=0\\); odčitek je preverjanje na primeru.',
                'The points have integer or fractional coordinates, so the graph computes \\(D\\) exactly with fractions and writes \\(0\\) or the actual value; there are no rounding errors. Pascal\'s theorem guarantees \\(D=0\\); the readout is a check on an example.',
            ),
        },
    ],
    workedExamples: [
        {
            id: 'k2-default-point',
            title: text('Presečišče \\(P_1\\) na elipsi', 'The intersection \\(P_1\\) on the ellipse'),
            calculationLatex: '6x+5y=30,\\quad 9x+5y=-15',
            resultLatex: 'P_1=(-15,24)',
            check: text(
                'Stranica \\(s_1\\) povezuje \\(A=(5,0)\\) in \\(B=(3,\\tfrac{12}5)\\) in ima enačbo \\(6x+5y=30\\); stranica \\(s_4\\) povezuje \\(D=(-3,\\tfrac{12}5)\\) in \\(E=(0,-3)\\) in ima enačbo \\(9x+5y=-15\\). Odštejemo: \\(-3x=45\\), zato je \\(x=-15\\) in \\(y=\\tfrac{30+90}5=24\\), torej \\(P_1=(-15,24)\\).',
                'The side \\(s_1\\) joins \\(A=(5,0)\\) and \\(B=(3,\\tfrac{12}5)\\) and has the equation \\(6x+5y=30\\); the side \\(s_4\\) joins \\(D=(-3,\\tfrac{12}5)\\) and \\(E=(0,-3)\\) and has the equation \\(9x+5y=-15\\). Subtracting gives \\(-3x=45\\), so \\(x=-15\\) and \\(y=\\tfrac{30+90}5=24\\), hence \\(P_1=(-15,24)\\).',
            ),
        },
        {
            id: 'k2-pappus-point',
            title: text('Presečišče \\(P_1\\) pri Pappusovem izreku', 'The intersection \\(P_1\\) in Pappus\'s theorem'),
            calculationLatex: 'y=\\tfrac34x,\\quad y=6-3x',
            resultLatex: 'P_1=\\left(\\tfrac85,\\tfrac65\\right)',
            check: text(
                'Stranica \\(s_1\\) povezuje \\(A_1=(0,0)\\) in \\(B_2=(4,3)\\), zato je \\(y=\\tfrac34x\\); stranica \\(s_4\\) povezuje \\(B_1=(1,3)\\) in \\(A_2=(2,0)\\), zato je \\(y=6-3x\\). Iz \\(\\tfrac34x=6-3x\\) sledi \\(\\tfrac{15}4x=6\\), torej \\(x=\\tfrac85\\) in \\(y=\\tfrac65\\).',
                'The side \\(s_1\\) joins \\(A_1=(0,0)\\) and \\(B_2=(4,3)\\), so \\(y=\\tfrac34x\\); the side \\(s_4\\) joins \\(B_1=(1,3)\\) and \\(A_2=(2,0)\\), so \\(y=6-3x\\). From \\(\\tfrac34x=6-3x\\) we get \\(\\tfrac{15}4x=6\\), so \\(x=\\tfrac85\\) and \\(y=\\tfrac65\\).',
            ),
        },
    ],
    steps: [
        step({
            id: 'pascal-predict', order: 1,
            title: text('Šest točk na elipsi', 'Six points on an ellipse'),
            purpose: text('Napovedati, kaj lahko rečemo o presečiščih nasprotnih stranic, preden jih poiščemo.', 'Predicting what can be said about the intersections of opposite sides before finding them.'),
            explanation: text(
                'Elipsa \\(\\tfrac{x^2}{25}+\\tfrac{y^2}9=1\\) ima točke \\(A=(5,0)\\), \\(B=(3,\\tfrac{12}5)\\), \\(C=(0,3)\\), \\(D=(-3,\\tfrac{12}5)\\), \\(E=(0,-3)\\), \\(F=(4,-\\tfrac95)\\). Šestkotnik \\(ABCDEF\\) ima stranice \\(s_1=AB\\), \\(s_2=BC\\), \\(s_3=CD\\), \\(s_4=DE\\), \\(s_5=EF\\), \\(s_6=FA\\); nasprotni stranici sta \\(s_1\\) in \\(s_4\\), \\(s_2\\) in \\(s_5\\), \\(s_3\\) in \\(s_6\\). Napovej, kje bodo ležala njihova presečišča.',
                'The ellipse \\(\\tfrac{x^2}{25}+\\tfrac{y^2}9=1\\) has the points \\(A=(5,0)\\), \\(B=(3,\\tfrac{12}5)\\), \\(C=(0,3)\\), \\(D=(-3,\\tfrac{12}5)\\), \\(E=(0,-3)\\), \\(F=(4,-\\tfrac95)\\). The hexagon \\(ABCDEF\\) has the sides \\(s_1=AB\\), \\(s_2=BC\\), \\(s_3=CD\\), \\(s_4=DE\\), \\(s_5=EF\\), \\(s_6=FA\\); the opposite sides are \\(s_1\\) and \\(s_4\\), \\(s_2\\) and \\(s_5\\), \\(s_3\\) and \\(s_6\\). Predict where their intersections will lie.',
            ),
            formulaIds: ['pascal-points'],
            observationPrompt: text('Poišči šest točk, šest stranic in preberi vrstni red oglišč v seznamu.', 'Find the six points and the six sides and read the order of the vertices in the list.'),
            expectedObservations: [text('Šest točk leži na elipsi, vrstni red oglišč je \\(A\\,B\\,C\\,D\\,E\\,F\\).', 'The six points lie on the ellipse, and the order of the vertices is \\(A\\,B\\,C\\,D\\,E\\,F\\).')],
            scene: pascalScene('pascal-predict-scene', 'default', [],
                'Elipsa \\(\\tfrac{x^2}{25}+\\tfrac{y^2}9=1\\), točke \\(A=(5,0)\\), \\(B=(3,\\tfrac{12}5)\\), \\(C=(0,3)\\), \\(D=(-3,\\tfrac{12}5)\\), \\(E=(0,-3)\\), \\(F=(4,-\\tfrac95)\\) in vrstni red \\(A\\,B\\,C\\,D\\,E\\,F\\).',
                'The ellipse \\(\\tfrac{x^2}{25}+\\tfrac{y^2}9=1\\), the points \\(A=(5,0)\\), \\(B=(3,\\tfrac{12}5)\\), \\(C=(0,3)\\), \\(D=(-3,\\tfrac{12}5)\\), \\(E=(0,-3)\\), \\(F=(4,-\\tfrac95)\\) and the order \\(A\\,B\\,C\\,D\\,E\\,F\\).'),
        }),
        step({
            id: 'pascal-points', order: 2,
            title: text('Tri presečišča in premica', 'The three intersections and the line'),
            purpose: text('Izračunati presečišča nasprotnih stranic in videti, da so kolinearna.', 'Computing the intersections of opposite sides and seeing that they are collinear.'),
            explanation: text(
                'Presečišča so \\(P_1=s_1\\cap s_4=(-15,24)\\), \\(P_2=s_2\\cap s_5=(12,\\tfrac35)\\) in \\(P_3=s_3\\cap s_6=(\\tfrac{15}2,\\tfrac92)\\). Prvo smo izračunali ročno; graf jih označi z imeni \\(P_1\\), \\(P_2\\), \\(P_3\\) in izpiše tudi v seznamu, premico \\(p\\) skoznje pa nariše. \\(P_1\\) je zunaj prikazanega območja, zato je v seznamu, v grafu pa ni narisana. Determinanta \\(D\\) je natanko \\(0\\) in graf zapiše, da so presečišča natančno kolinearna. To je Pascalov izrek na enem primeru; primer izreka ne dokazuje.',
                'The intersections are \\(P_1=s_1\\cap s_4=(-15,24)\\), \\(P_2=s_2\\cap s_5=(12,\\tfrac35)\\) and \\(P_3=s_3\\cap s_6=(\\tfrac{15}2,\\tfrac92)\\). The first was computed by hand; the graph labels them \\(P_1\\), \\(P_2\\), \\(P_3\\), also lists them as text and draws the line \\(p\\) through them. \\(P_1\\) is outside the visible area, so it is in the list and not drawn. The determinant \\(D\\) is exactly \\(0\\), and the graph writes that the intersections are exactly collinear. This is Pascal\'s theorem on one example; an example does not prove the theorem.',
            ),
            formulaIds: ['pascal-points', 'pascal-collinear'],
            workedExampleId: 'k2-default-point',
            observationPrompt: text('Preberi tri presečišča v seznamu in odčitek determinante.', 'Read the three intersections in the list and the determinant readout.'),
            expectedObservations: [text('Odčitek navede determinanto \\(0\\) in da so presečišča natančno kolinearna.', 'The readout gives the determinant \\(0\\) and says that the intersections are exactly collinear.')],
            scene: pascalScene('pascal-points-scene', 'default', [],
                'Presečišča so \\(P_1=(-15,24)\\), \\(P_2=(12,\\tfrac35)\\), \\(P_3=(\\tfrac{15}2,\\tfrac92)\\); determinanta je \\(0\\) in graf navede, da so natančno kolinearna.',
                'The intersections are \\(P_1=(-15,24)\\), \\(P_2=(12,\\tfrac35)\\), \\(P_3=(\\tfrac{15}2,\\tfrac92)\\); the determinant is \\(0\\) and the graph states that they are exactly collinear.'),
        }),
        step({
            id: 'pascal-drag', order: 3,
            title: text('Premik točke po stožnici', 'Moving a point along the conic'),
            purpose: text('Preizkusiti izrek na drugi postavitvi; premik je ilustracija, ne dokaz.', 'Trying the theorem on another set-up; moving is an illustration, not a proof.'),
            explanation: text(
                'Točka \\(D\\) se s puščičnimi tipkami ali z vlečenjem premakne po elipsi v \\(D=(-\\tfrac75,\\tfrac{72}{25})\\); drugih pet točk ostane. Presečišči \\(P_1=(-3,\\tfrac{48}5)\\) in \\(P_3=(7,\\tfrac{18}5)\\) se premakneta, ker stranici \\(s_3\\) in \\(s_4\\) vsebujeta \\(D\\), \\(P_2=(12,\\tfrac35)\\) pa ostane, ker \\(s_2\\) in \\(s_5\\) nista povezani z \\(D\\). Determinanta je spet natanko \\(0\\). Opazovanje na več položajih ilustrira izrek in ga ne dokaže.',
                'The point \\(D\\) moves along the ellipse, with the arrow keys or by dragging, to \\(D=(-\\tfrac75,\\tfrac{72}{25})\\); the other five points stay. The intersections \\(P_1=(-3,\\tfrac{48}5)\\) and \\(P_3=(7,\\tfrac{18}5)\\) move because the sides \\(s_3\\) and \\(s_4\\) contain \\(D\\), while \\(P_2=(12,\\tfrac35)\\) stays because \\(s_2\\) and \\(s_5\\) do not touch \\(D\\). The determinant is again exactly \\(0\\). Watching several positions illustrates the theorem and does not prove it.',
            ),
            formulaIds: ['pascal-collinear'],
            observationPrompt: text('Premikaj točko \\(D\\) in spremljaj, katera presečišča se premikajo in kaj kaže determinanta.', 'Move the point \\(D\\) and watch which intersections move and what the determinant shows.'),
            expectedObservations: [text('\\(P_1\\) in \\(P_3\\) se premikata, \\(P_2\\) ostane, determinanta ostane \\(0\\).', '\\(P_1\\) and \\(P_3\\) move, \\(P_2\\) stays, the determinant stays \\(0\\).')],
            scene: pascalScene('pascal-drag-scene', 'default', [{kind: 'projective', operation: 'pascal-set-index', handle: 3, index: PASCAL_DRAG_INDEX}],
                'Točka \\(D=(-\\tfrac75,\\tfrac{72}{25})\\); presečišča so \\(P_1=(-3,\\tfrac{48}5)\\), \\(P_2=(12,\\tfrac35)\\), \\(P_3=(7,\\tfrac{18}5)\\); determinanta je \\(0\\).',
                'The point \\(D=(-\\tfrac75,\\tfrac{72}{25})\\); the intersections are \\(P_1=(-3,\\tfrac{48}5)\\), \\(P_2=(12,\\tfrac35)\\), \\(P_3=(7,\\tfrac{18}5)\\); the determinant is \\(0\\).'),
        }),
        step({
            id: 'pascal-order', order: 4,
            title: text('Prekrižan šestkotnik', 'A self-crossing hexagon'),
            purpose: text('Videti, da izrek velja za vsak vrstni red oglišč, premica pa se spremeni.', 'Seeing that the theorem holds for every order of the vertices while the line changes.'),
            explanation: text(
                'Točke so spet kot v koraku 1, vrstni red pa je \\(A\\,E\\,C\\,D\\,B\\,F\\), zato se stranice križajo. Presečišča so \\(P_1=(9,\\tfrac{12}5)\\), \\(P_2=(0,15)\\) in \\(P_3=(\\tfrac{15}2,\\tfrac92)\\); \\(P_2\\) je zunaj prikazanega območja, zato je v seznamu in ni narisana. Determinanta je \\(0\\), premica pa je druga kot pri običajnem vrstnem redu. Pascalov izrek ne zahteva izbočenega šestkotnika.',
                'The points are again those of step 1, and the order is \\(A\\,E\\,C\\,D\\,B\\,F\\), so the sides cross. The intersections are \\(P_1=(9,\\tfrac{12}5)\\), \\(P_2=(0,15)\\) and \\(P_3=(\\tfrac{15}2,\\tfrac92)\\); \\(P_2\\) is outside the visible area, so it is in the list and not drawn. The determinant is \\(0\\) and the line is different from the one for the usual order. Pascal\'s theorem does not require a convex hexagon.',
            ),
            formulaIds: ['pascal-points'],
            observationPrompt: text('Preklopi med vrstnima redoma in primerjaj premici skozi presečišča.', 'Switch between the two orders and compare the lines through the intersections.'),
            expectedObservations: [text('Točke so iste, presečišča in premica so drugi, determinanta ostane \\(0\\).', 'The points are the same, the intersections and the line are different, the determinant stays \\(0\\).')],
            scene: pascalScene('pascal-order-scene', 'default', [{kind: 'projective', operation: 'pascal-set-order', order: 'pappus'}],
                'Vrstni red \\(A\\,E\\,C\\,D\\,B\\,F\\); presečišča so \\(P_1=(9,\\tfrac{12}5)\\), \\(P_2=(0,15)\\) (izven prikazanega območja), \\(P_3=(\\tfrac{15}2,\\tfrac92)\\); determinanta je \\(0\\).',
                'The order \\(A\\,E\\,C\\,D\\,B\\,F\\); the intersections are \\(P_1=(9,\\tfrac{12}5)\\), \\(P_2=(0,15)\\) (outside the visible area), \\(P_3=(\\tfrac{15}2,\\tfrac92)\\); the determinant is \\(0\\).'),
        }),
        step({
            id: 'pascal-pappus', order: 5,
            title: text('Par premic: Pappusov izrek', 'A pair of lines: Pappus\'s theorem'),
            purpose: text('Prepoznati, da je Pappusov izrek Pascalov izrek za izrojeno stožnico.', 'Recognising Pappus\'s theorem as Pascal\'s theorem for a degenerate conic.'),
            explanation: text(
                'Stožnica je zdaj izrojena stožnica, par premic \\(y=0\\) in \\(y=3\\). Na prvi so \\(A_1=(0,0)\\), \\(A_2=(2,0)\\), \\(A_3=(5,0)\\), na drugi \\(B_1=(1,3)\\), \\(B_2=(4,3)\\), \\(B_3=(6,3)\\), šestkotnik pa je \\(A_1B_2A_3B_1A_2B_3\\). Presečišča so \\(P_1=(\\tfrac85,\\tfrac65)\\), \\(P_2=(\\tfrac{22}5,\\tfrac95)\\), \\(P_3=(3,\\tfrac32)\\) in determinanta je natanko \\(0\\). To je Pappusov izrek, naveden po standardnem učbeniku projektivne geometrije in ne dokazan v lekciji.',
                'The conic is now a degenerate conic, the pair of lines \\(y=0\\) and \\(y=3\\). On the first are \\(A_1=(0,0)\\), \\(A_2=(2,0)\\), \\(A_3=(5,0)\\), on the second \\(B_1=(1,3)\\), \\(B_2=(4,3)\\), \\(B_3=(6,3)\\), and the hexagon is \\(A_1B_2A_3B_1A_2B_3\\). The intersections are \\(P_1=(\\tfrac85,\\tfrac65)\\), \\(P_2=(\\tfrac{22}5,\\tfrac95)\\), \\(P_3=(3,\\tfrac32)\\) and the determinant is exactly \\(0\\). This is Pappus\'s theorem, stated after a standard textbook of projective geometry and not proved in the lesson.',
            ),
            formulaIds: ['pascal-points', 'pascal-collinear'],
            workedExampleId: 'k2-pappus-point',
            observationPrompt: text('Poišči šest točk na obeh premicah in preberi odčitek determinante.', 'Find the six points on the two lines and read the determinant readout.'),
            expectedObservations: [text('Presečišča so natančno kolinearna kljub izrojeni stožnici.', 'The intersections are exactly collinear although the conic is degenerate.')],
            scene: pascalScene('pascal-pappus-scene', 'default', [
                {kind: 'projective', operation: 'pascal-set-conic', conic: 'linePair'},
                {kind: 'projective', operation: 'pascal-set-order', order: 'pappus'},
            ],
                'Par premic \\(y=0\\) in \\(y=3\\), vrstni red \\(A_1\\,B_2\\,A_3\\,B_1\\,A_2\\,B_3\\); presečišča so \\(P_1=(\\tfrac85,\\tfrac65)\\), \\(P_2=(\\tfrac{22}5,\\tfrac95)\\), \\(P_3=(3,\\tfrac32)\\); determinanta je \\(0\\).',
                'The pair of lines \\(y=0\\) and \\(y=3\\), the order \\(A_1\\,B_2\\,A_3\\,B_1\\,A_2\\,B_3\\); the intersections are \\(P_1=(\\tfrac85,\\tfrac65)\\), \\(P_2=(\\tfrac{22}5,\\tfrac95)\\), \\(P_3=(3,\\tfrac32)\\); the determinant is \\(0\\).'),
        }),
        step({
            id: 'pascal-infinity', order: 6,
            title: text('Vzporedni stranici: presečišče v neskončnosti', 'Parallel sides: an intersection at infinity'),
            purpose: text('Videti, da izrek velja tudi, ko je presečišče točka v neskončnosti.', 'Seeing that the theorem also holds when an intersection is a point at infinity.'),
            explanation: text(
                'Točke \\(A_1=(0,0)\\), \\(A_2=(1,0)\\), \\(A_3=(6,0)\\) in \\(B_1=(4,3)\\), \\(B_2=(3,3)\\), \\(B_3=(8,3)\\) dajo vzporedni stranici \\(s_1=A_1B_2\\) in \\(s_4=B_1A_2\\) (obe imata smer \\((1,1)\\)). Njuno presečišče \\(P_1\\) je zato točka v neskončnosti; graf je ne nariše kot končno točko, ampak navede njeno smer. Drugi presečišči sta \\(P_2=(\\tfrac92,\\tfrac32)\\) in \\(P_3=(\\tfrac{24}5,\\tfrac95)\\) in ležita na premici z naklonom \\(1\\), torej v smeri \\(P_1\\). Determinanta je natanko \\(0\\).',
                'The points \\(A_1=(0,0)\\), \\(A_2=(1,0)\\), \\(A_3=(6,0)\\) and \\(B_1=(4,3)\\), \\(B_2=(3,3)\\), \\(B_3=(8,3)\\) give parallel sides \\(s_1=A_1B_2\\) and \\(s_4=B_1A_2\\) (both have the direction \\((1,1)\\)). Their intersection \\(P_1\\) is therefore a point at infinity; the graph does not draw it as a finite point but states its direction. The other two intersections are \\(P_2=(\\tfrac92,\\tfrac32)\\) and \\(P_3=(\\tfrac{24}5,\\tfrac95)\\) and they lie on a line of slope \\(1\\), the direction of \\(P_1\\). The determinant is exactly \\(0\\).',
            ),
            formulaIds: ['pascal-collinear'],
            observationPrompt: text('Poišči presečišče, ki ga graf navede kot točko v neskončnosti, in primerjaj njegovo smer z naklonom premice skozi drugi dve presečišči.', 'Find the intersection that the graph lists as a point at infinity and compare its direction with the slope of the line through the other two.'),
            expectedObservations: [text('\\(P_1\\) je v neskončnosti v smeri \\((1,1)\\), premica \\(p\\) ima naklon \\(1\\).', '\\(P_1\\) is at infinity in the direction \\((1,1)\\), and the line \\(p\\) has slope \\(1\\).')],
            scene: pascalScene('pascal-infinity-scene', 'infinity', [],
                'Par premic \\(y=0\\) in \\(y=3\\), vrstni red \\(A_1\\,B_2\\,A_3\\,B_1\\,A_2\\,B_3\\); \\(P_1\\) je točka v neskončnosti v smeri \\((1,1)\\); \\(P_2=(\\tfrac92,\\tfrac32)\\), \\(P_3=(\\tfrac{24}5,\\tfrac95)\\) ležita na premici z naklonom \\(1\\); determinanta je \\(0\\).',
                'The pair of lines \\(y=0\\) and \\(y=3\\), the order \\(A_1\\,B_2\\,A_3\\,B_1\\,A_2\\,B_3\\); \\(P_1\\) is a point at infinity in the direction \\((1,1)\\); \\(P_2=(\\tfrac92,\\tfrac32)\\), \\(P_3=(\\tfrac{24}5,\\tfrac95)\\) lie on a line of slope \\(1\\); the determinant is \\(0\\).'),
        }),
        step({
            id: 'pascal-explore', order: 7,
            title: text('Samostojno raziskovanje', 'Free exploration'),
            purpose: text('Preizkusiti izrek na drugih stožnicah in položajih.', 'Testing the theorem on other conics and positions.'),
            explanation: text(
                'Stožnica je hiperbola \\(\\tfrac{x^2}{16}-\\tfrac{y^2}9=1\\), oglišča so v običajnem vrstnem redu \\(A\\,B\\,C\\,D\\,E\\,F\\). Izberi parabolo, elipso, hiperbolo ali par premic, spremeni vrstni red in premikaj točke s puščičnimi tipkami; Shift premakne za več položajev. Če se dve sosednji točki ujameta, stranica ni določena in graf to navede namesto presečišč. Vsak položaj, ki ga preizkusiš, je ilustracija izreka, ne dokaz.',
                'The conic is the hyperbola \\(\\tfrac{x^2}{16}-\\tfrac{y^2}9=1\\), and the vertices are in the usual order \\(A\\,B\\,C\\,D\\,E\\,F\\). Choose a parabola, ellipse, hyperbola or pair of lines, change the order and move the points with the arrow keys; Shift moves several positions. If two neighbouring points coincide, the side is undefined and the graph says so instead of listing intersections. Every position you try is an illustration of the theorem, not a proof.',
            ),
            formulaIds: ['pascal-points', 'pascal-collinear'],
            observationPrompt: text('Poišči položaj, pri katerem se dve sosednji točki ujameta, in preberi, kaj graf navede.', 'Find a position where two neighbouring points coincide and read what the graph says.'),
            expectedObservations: [text('Dokler so stranice določene, je determinanta \\(0\\); sicer graf navede, katera stranica ni določena.', 'As long as the sides are defined, the determinant is \\(0\\); otherwise the graph says which side is undefined.')],
            scene: pascalScene('pascal-explore-scene', 'default', [{kind: 'projective', operation: 'pascal-set-conic', conic: 'hyperbola'}],
                'Hiperbola \\(\\tfrac{x^2}{16}-\\tfrac{y^2}9=1\\), vrstni red \\(A\\,B\\,C\\,D\\,E\\,F\\); determinanta presečišč je \\(0\\) in graf navede, da so natančno kolinearna.',
                'The hyperbola \\(\\tfrac{x^2}{16}-\\tfrac{y^2}9=1\\), the order \\(A\\,B\\,C\\,D\\,E\\,F\\); the determinant of the intersections is \\(0\\) and the graph states that they are exactly collinear.'),
        }),
    ],
    sources: [
        {
            id: 'fmf-pascal-syllabus',
            citation: 'Fakulteta za matematiko in fiziko, Univerza v Ljubljani, učni načrt Afina in projektivna geometrija (1Mate/2Mate 2025), tema Pascalov izrek. Cited from the syllabus topic list; not opened beyond the list.',
            implementationCorrespondence: 'Pascal\'s theorem for six points on a conic, with intersections that may be points at infinity, is the statement of docs/specs/projective-conics-lessons.md section K2 and is checked in the app by the exact determinant of the three intersections on the examples; the lesson does not prove it.',
        },
        {
            id: 'coxeter-pascal-pappus',
            citation: 'Coxeter, H. S. M. Projective Geometry, 2nd ed., Springer, 1987, the chapters on conics and on Pascal\'s and Pappus\'s theorems. Standard text, cited and not opened.',
            implementationCorrespondence: 'The text supplies Pascal\'s theorem and Pappus\'s theorem (the case of a degenerate conic) that the lesson states; the lesson reproduces no proof, and moving the points on the graph is labelled an illustration.',
        },
        {
            id: 'bezeg-pascal-implementation',
            citation: 'Bezeg source: src/projective/homogeneous.ts, src/graphs/projective/pascalModel.ts and src/graphs/projective/PascalGraph.tsx.',
            implementationCorrespondence: 'A scene loads an example and applies the graph\'s own conic, order and position edits; the lesson text quotes only values of those scenes, and the test recomputes them with exact fractions.',
        },
    ],
    edgeCases: [
        text('Če se dve sosednji točki šestkotnika ujameta, stranica ni določena; graf to navede in presečišč ne izpiše.', 'If two neighbouring vertices of the hexagon coincide, the side is undefined; the graph says so and lists no intersections.'),
        text('Presečišče je lahko točka v neskončnosti; graf navede smer, nikoli velike končne koordinate, in Pascalova premica je lahko premica v neskončnosti, kar navede v besedilu.', 'An intersection may be a point at infinity; the graph gives the direction, never a huge finite coordinate, and the Pascal line may be the line at infinity, which it states in text.'),
        text('Točke ležijo na tabeli smeri, zato so koordinate natančni ulomki in je determinanta natančna za vsak položaj.', 'The points sit on a table of directions, so the coordinates are exact fractions and the determinant is exact for every position.'),
    ],
    unresolvedQuestions: [],
};

/** A K3 scene from the default scene: `pole-polar-load-example`, then the conic and position operations (PolePolarGraph's own control actions). */
const polePolarScene = (
    id: string, example: PolePolarLessonExample, operations: readonly PolePolarSceneOperation[], sl: string, en: string,
): LessonScene => {
    const actions: LessonAction[] = [
        {kind: 'prepared-scene', sceneId: id, source: 'demonstration-default'},
        {kind: 'projective', operation: 'pole-polar-load-example', exampleId: example},
        ...operations,
    ];
    return {id, basedOn: 'demonstration-default', actions, expectedState: text(sl, en)};
};

const polePolarLesson: GuidedLesson = {
    demonstrationId: 'projective-pole-polar',
    title: text('Pol in polara', 'Pole and polar'),
    summary: text(
        'Vsaki točki \\(P\\) ravnine pripada glede na stožnico premica, njena polara. Če je \\(P\\) zunaj stožnice, polara poteka skozi obe dotikališči tangent iz \\(P\\); če je \\(P\\) na stožnici, je polara tangenta v \\(P\\); če je \\(P\\) znotraj stožnice, polara stožnice ne seka. Polara središča je premica v neskončnosti. To je izrek o polari (pol in polara glede na stožnico), ki ga lekcija navaja in ne dokazuje; premikanje točke \\(P\\) je ilustracija.',
        'Every point \\(P\\) of the plane has a line with respect to a conic, its polar. If \\(P\\) is outside the conic, the polar passes through both points of tangency of the tangents from \\(P\\); if \\(P\\) is on the conic, the polar is the tangent at \\(P\\); if \\(P\\) is inside the conic, the polar does not meet the conic. The polar of the centre is the line at infinity. This is the theorem on the polar (pole and polar with respect to a conic), which the lesson states and does not prove; moving the point \\(P\\) is an illustration.',
    ),
    prerequisites: [
        text('Koordinate in enačba premice ter enačba tangente na krožnico ali elipso v dani točki; lekcija o Pascalovem izreku pomaga, vendar ni pogoj.', 'Coordinates, the equation of a line, and the equation of a tangent to a circle or ellipse at a given point; the Pascal lesson helps but is not required.'),
    ],
    learningGoals: [
        text('Iz točke \\(P\\) zunaj elipse poiščeš dotikališči tangent in preveriš, da polara točke \\(P\\) poteka skozi obe.', 'From a point \\(P\\) outside an ellipse find the points of tangency of the tangents and check that the polar of \\(P\\) passes through both.'),
        text('Razločiš lege točke \\(P\\) zunaj, na in znotraj stožnice in odčitaš, kaj je polara v vsaki od njih.', 'Tell the positions of \\(P\\) outside, on and inside a conic apart and read what the polar is in each.'),
        text('Poveš, da je polara točke v neskončnosti premer skozi središče, da je pol premice druga smer iste preslikave in da parabola nima končnega središča.', 'State that the polar of a point at infinity is a diameter through the centre, that the pole of a line is the same map read backwards, and that a parabola has no finite centre.'),
    ],
    formulaBlocks: [
        {
            id: 'pole-polar-polar',
            latex: '\\frac{x\\,x_0}{a^2}+\\frac{y\\,y_0}{b^2}=1',
            notation: text(
                'Elipsa \\(\\tfrac{x^2}{a^2}+\\tfrac{y^2}{b^2}=1\\) in točka \\(P=(x_0,y_0)\\). Leva stran je enačba polare točke \\(P\\); kadar je \\(P\\) na elipsi, je to enačba tangente v \\(P\\). V lekciji je \\(a^2=25\\), \\(b^2=9\\).',
                'The ellipse \\(\\tfrac{x^2}{a^2}+\\tfrac{y^2}{b^2}=1\\) and the point \\(P=(x_0,y_0)\\). The left side is the equation of the polar of \\(P\\); when \\(P\\) is on the ellipse it is the equation of the tangent at \\(P\\). In the lesson \\(a^2=25\\), \\(b^2=9\\).',
            ),
            explanation: text(
                'Izrek (pol in polara): če je \\(P\\) zunaj stožnice, polara točke \\(P\\) poteka skozi obe dotikališči tangent iz \\(P\\); če je \\(P\\) na stožnici, je polara tangenta v \\(P\\); če je \\(P\\) znotraj, polara stožnice ne seka; polara središča je premica v neskončnosti. Izrek je naveden po temi pol in polara v učnem načrtu FMF (Afina in projektivna geometrija) in v standardnem učbeniku projektivne geometrije; lekcija ga ne dokazuje. Premikanje točke \\(P\\) je ilustracija izreka, ne dokaz.',
                'Theorem (pole and polar): if \\(P\\) is outside a conic, the polar of \\(P\\) passes through both points of tangency of the tangents from \\(P\\); if \\(P\\) is on the conic, the polar is the tangent at \\(P\\); if \\(P\\) is inside, the polar does not meet the conic; the polar of the centre is the line at infinity. The theorem is stated after the topic pole and polar in the FMF syllabus (Afina in projektivna geometrija) and in a standard textbook of projective geometry; the lesson does not prove it. Moving the point \\(P\\) is an illustration of the theorem, not a proof.',
            ),
        },
        {
            id: 'pole-polar-region',
            latex: '\\frac{x_0^2}{a^2}+\\frac{y_0^2}{b^2}\\gtrless 1',
            notation: text(
                'Vrednost \\(>1\\) pomeni, da je \\(P\\) zunaj elipse, \\(=1\\), da je na njej, in \\(<1\\), da je znotraj nje.',
                'A value \\(>1\\) means that \\(P\\) is outside the ellipse, \\(=1\\) that it is on it, and \\(<1\\) that it is inside it.',
            ),
            explanation: text(
                'Lega točke \\(P\\) se odloči natančno iz predznaka te vrednosti, brez tolerance. Če sta dotikališči iracionalni, graf njuni koordinati in tangenti navede kot številčni vrednosti z navedeno toleranco; lega točke ostane natančna.',
                'The position of \\(P\\) is decided exactly from the sign of this value, with no tolerance. If the points of tangency are irrational, the graph gives their coordinates and the tangents as numerical values with a stated tolerance; the position of the point stays exact.',
            ),
        },
    ],
    workedExamples: [
        {
            id: 'k3-default-point',
            title: text('Presečišče tangent v \\(T_1\\) in \\(T_2\\)', 'The intersection of the tangents at \\(T_1\\) and \\(T_2\\)'),
            calculationLatex: '-9x+20y=75,\\quad 4x+5y=25',
            resultLatex: 'P=\\left(1,\\tfrac{21}5\\right)',
            check: text(
                'Tangenta v \\(T_1=(-3,\\tfrac{12}5)\\) je \\(-\\tfrac{3x}{25}+\\tfrac{4y}{15}=1\\), torej \\(-9x+20y=75\\); tangenta v \\(T_2=(4,\\tfrac95)\\) je \\(\\tfrac{4x}{25}+\\tfrac y5=1\\), torej \\(4x+5y=25\\). Drugo pomnožimo s \\(4\\): \\(16x+20y=100\\). Od tega odštejemo prvo: \\(25x=25\\), zato je \\(x=1\\) in \\(y=\\tfrac{25-4}5=\\tfrac{21}5\\), torej \\(P=(1,\\tfrac{21}5)\\).',
                'The tangent at \\(T_1=(-3,\\tfrac{12}5)\\) is \\(-\\tfrac{3x}{25}+\\tfrac{4y}{15}=1\\), that is \\(-9x+20y=75\\); the tangent at \\(T_2=(4,\\tfrac95)\\) is \\(\\tfrac{4x}{25}+\\tfrac y5=1\\), that is \\(4x+5y=25\\). Multiply the second by \\(4\\): \\(16x+20y=100\\). Subtract the first from it: \\(25x=25\\), so \\(x=1\\) and \\(y=\\tfrac{25-4}5=\\tfrac{21}5\\), hence \\(P=(1,\\tfrac{21}5)\\).',
            ),
        },
    ],
    steps: [
        step({
            id: 'pole-polar-predict', order: 1,
            title: text('Elipsa in točka \\(P\\)', 'An ellipse and a point \\(P\\)'),
            purpose: text('Napovedati, kje se tangenti iz točke dotikata stožnice, preden ju narišemo.', 'Predicting where the tangents from a point touch the conic before they are drawn.'),
            explanation: text(
                'Elipsa je \\(9x^2+25y^2=225\\), to je \\(\\tfrac{x^2}{25}+\\tfrac{y^2}9=1\\), točka pa je \\(P=(1,\\tfrac{21}5)\\). Ker je \\(\\tfrac1{25}+\\tfrac{441}{225}=2>1\\), točka \\(P\\) leži zunaj elipse, zato iz nje potekata dve tangenti. Napovej, kje se dotikata elipse.',
                'The ellipse is \\(9x^2+25y^2=225\\), that is \\(\\tfrac{x^2}{25}+\\tfrac{y^2}9=1\\), and the point is \\(P=(1,\\tfrac{21}5)\\). Since \\(\\tfrac1{25}+\\tfrac{441}{225}=2>1\\), the point \\(P\\) lies outside the ellipse, so two tangents pass through it. Predict where they touch the ellipse.',
            ),
            formulaIds: ['pole-polar-region'],
            observationPrompt: text('Preberi stanje točke \\(P\\) in poišči dotikališči.', 'Read the status of the point \\(P\\) and find the points of tangency.'),
            expectedObservations: [text('Stanje pravi, da \\(P\\) leži zunaj stožnice.', 'The status says that \\(P\\) lies outside the conic.')],
            scene: polePolarScene('pole-polar-predict-scene', 'default', [],
                'Elipsa \\(9x^2+25y^2=225\\) in točka \\(P=(1,\\tfrac{21}5)\\), ki leži zunaj elipse (\\(\\tfrac1{25}+\\tfrac{441}{225}=2>1\\)).',
                'The ellipse \\(9x^2+25y^2=225\\) and the point \\(P=(1,\\tfrac{21}5)\\), which lies outside the ellipse (\\(\\tfrac1{25}+\\tfrac{441}{225}=2>1\\)).'),
        }),
        step({
            id: 'pole-polar-tangents', order: 2,
            title: text('Tangenti in dotikališči', 'The tangents and the points of tangency'),
            purpose: text('Videti obe tangenti iz točke \\(P\\) in njuni dotikališči.', 'Seeing both tangents from the point \\(P\\) and their points of tangency.'),
            explanation: text(
                'Tangenti iz \\(P\\) se elipse dotikata v \\(T_1=(-3,\\tfrac{12}5)\\) in \\(T_2=(4,\\tfrac95)\\). Tangenta v točki \\((x_0,y_0)\\) elipse ima enačbo \\(\\tfrac{x x_0}{25}+\\tfrac{y y_0}9=1\\), zato je \\(t_1\\): \\(-\\tfrac{3x}{25}+\\tfrac{4y}{15}=1\\) in \\(t_2\\): \\(\\tfrac{4x}{25}+\\tfrac y5=1\\); graf ju zapiše kot \\(9x-20y+75=0\\) in \\(4x+5y-25=0\\). Obe potekata skozi \\(P\\): \\(9-20\\cdot\\tfrac{21}5+75=0\\) in \\(4+5\\cdot\\tfrac{21}5-25=0\\).',
                'The tangents from \\(P\\) touch the ellipse at \\(T_1=(-3,\\tfrac{12}5)\\) and \\(T_2=(4,\\tfrac95)\\). The tangent at the point \\((x_0,y_0)\\) of the ellipse has the equation \\(\\tfrac{x x_0}{25}+\\tfrac{y y_0}9=1\\), so \\(t_1\\) is \\(-\\tfrac{3x}{25}+\\tfrac{4y}{15}=1\\) and \\(t_2\\) is \\(\\tfrac{4x}{25}+\\tfrac y5=1\\); the graph writes them as \\(9x-20y+75=0\\) and \\(4x+5y-25=0\\). Both pass through \\(P\\): \\(9-20\\cdot\\tfrac{21}5+75=0\\) and \\(4+5\\cdot\\tfrac{21}5-25=0\\).',
            ),
            formulaIds: ['pole-polar-polar'],
            workedExampleId: 'k3-default-point',
            observationPrompt: text('Preberi enačbi tangent in koordinati dotikališč v seznamu.', 'Read the equations of the tangents and the coordinates of the points of tangency in the list.'),
            expectedObservations: [text('Seznam navede dotikališči \\(T_1\\) in \\(T_2\\) ter tangenti \\(t_1\\) in \\(t_2\\).', 'The list gives the points of tangency \\(T_1\\) and \\(T_2\\) and the tangents \\(t_1\\) and \\(t_2\\).')],
            scene: polePolarScene('pole-polar-tangents-scene', 'default', [],
                'Točka \\(P=(1,\\tfrac{21}5)\\), dotikališči \\(T_1=(-3,\\tfrac{12}5)\\), \\(T_2=(4,\\tfrac95)\\) in tangenti \\(9x-20y+75=0\\), \\(4x+5y-25=0\\).',
                'The point \\(P=(1,\\tfrac{21}5)\\), the points of tangency \\(T_1=(-3,\\tfrac{12}5)\\), \\(T_2=(4,\\tfrac95)\\) and the tangents \\(9x-20y+75=0\\), \\(4x+5y-25=0\\).'),
        }),
        step({
            id: 'pole-polar-polar', order: 3,
            title: text('Premica skozi dotikališči je polara', 'The line through the points of tangency is the polar'),
            purpose: text('Videti, da polara točke \\(P\\) poteka skozi obe dotikališči.', 'Seeing that the polar of the point \\(P\\) passes through both points of tangency.'),
            explanation: text(
                'Polara točke \\(P=(1,\\tfrac{21}5)\\) glede na elipso je \\(\\tfrac x{25}+\\tfrac{7y}{15}=1\\); graf jo zapiše kot \\(3x+35y-75=0\\). Skozi \\(T_1\\) poteka: \\(-\\tfrac3{25}+\\tfrac{7\\cdot 12}{15\\cdot 5}=-\\tfrac3{25}+\\tfrac{28}{25}=1\\); skozi \\(T_2\\) tudi: \\(\\tfrac4{25}+\\tfrac{7\\cdot 9}{15\\cdot 5}=\\tfrac4{25}+\\tfrac{21}{25}=1\\). Da to velja za vsak \\(P\\) zunaj stožnice, je izrek o polari; ta primer ga ilustrira, ne dokaže.',
                'The polar of the point \\(P=(1,\\tfrac{21}5)\\) with respect to the ellipse is \\(\\tfrac x{25}+\\tfrac{7y}{15}=1\\); the graph writes it as \\(3x+35y-75=0\\). It passes through \\(T_1\\): \\(-\\tfrac3{25}+\\tfrac{7\\cdot 12}{15\\cdot 5}=-\\tfrac3{25}+\\tfrac{28}{25}=1\\); and through \\(T_2\\): \\(\\tfrac4{25}+\\tfrac{7\\cdot 9}{15\\cdot 5}=\\tfrac4{25}+\\tfrac{21}{25}=1\\). That this holds for every \\(P\\) outside a conic is the theorem on the polar; this example illustrates it and does not prove it.',
            ),
            formulaIds: ['pole-polar-polar'],
            observationPrompt: text('Preberi enačbo polare in preveri, da leži na njej vsaka od točk \\(T_1\\), \\(T_2\\).', 'Read the equation of the polar and check that each of the points \\(T_1\\), \\(T_2\\) lies on it.'),
            expectedObservations: [text('Polara \\(3x+35y-75=0\\) poteka skozi \\(T_1\\) in \\(T_2\\).', 'The polar \\(3x+35y-75=0\\) passes through \\(T_1\\) and \\(T_2\\).')],
            scene: polePolarScene('pole-polar-polar-scene', 'default', [],
                'Točka \\(P=(1,\\tfrac{21}5)\\), polara \\(3x+35y-75=0\\) skozi dotikališči \\(T_1=(-3,\\tfrac{12}5)\\) in \\(T_2=(4,\\tfrac95)\\).',
                'The point \\(P=(1,\\tfrac{21}5)\\), the polar \\(3x+35y-75=0\\) through the points of tangency \\(T_1=(-3,\\tfrac{12}5)\\) and \\(T_2=(4,\\tfrac95)\\).'),
        }),
        step({
            id: 'pole-polar-on', order: 4,
            title: text('\\(P\\) na elipsi in znotraj nje', '\\(P\\) on the ellipse and inside it'),
            purpose: text('Videti, kaj je polara, ko točka \\(P\\) leži na stožnici in ko leži znotraj nje.', 'Seeing what the polar is when the point \\(P\\) lies on the conic and when it lies inside it.'),
            explanation: text(
                'Premakni \\(P\\) na elipso, v \\(P=(4,\\tfrac95)\\): \\(\\tfrac{16}{25}+\\tfrac{(9/5)^2}9=\\tfrac{16}{25}+\\tfrac9{25}=1\\), zato je \\(P\\) na elipsi. Polara je tedaj tangenta v \\(P\\), \\(\\tfrac{4x}{25}+\\tfrac y5=1\\), dotikališče pa je ena sama točka. Nato izberi primer Točka znotraj elipse, točko \\((1,1)\\): \\(\\tfrac1{25}+\\tfrac19=\\tfrac{34}{225}<1\\). Tangent ni, polara \\(9x+25y-225=0\\) pa elipse ne seka. Tudi to ilustrira izrek o polari.',
                'Move \\(P\\) onto the ellipse, to \\(P=(4,\\tfrac95)\\): \\(\\tfrac{16}{25}+\\tfrac{(9/5)^2}9=\\tfrac{16}{25}+\\tfrac9{25}=1\\), so \\(P\\) is on the ellipse. The polar is then the tangent at \\(P\\), \\(\\tfrac{4x}{25}+\\tfrac y5=1\\), and the point of tangency is the single point \\(P\\). Then choose the example Point inside the ellipse, the point \\((1,1)\\): \\(\\tfrac1{25}+\\tfrac19=\\tfrac{34}{225}<1\\). There are no tangents, and the polar \\(9x+25y-225=0\\) does not meet the ellipse. This too illustrates the theorem on the polar.',
            ),
            formulaIds: ['pole-polar-polar', 'pole-polar-region'],
            observationPrompt: text('Primerjaj polaro in tangento v točki \\(P\\), nato preberi stanje za točko znotraj elipse.', 'Compare the polar and the tangent at the point \\(P\\), then read the status for the point inside the ellipse.'),
            expectedObservations: [text('Na elipsi je polara \\(4x+5y-25=0\\) tangenta v \\(P\\); znotraj elipse tangent ni.', 'On the ellipse the polar \\(4x+5y-25=0\\) is the tangent at \\(P\\); inside the ellipse there are no tangents.')],
            scene: polePolarScene('pole-polar-on-scene', 'on', [],
                'Točka \\(P=(4,\\tfrac95)\\) na elipsi \\(9x^2+25y^2=225\\); polara \\(4x+5y-25=0\\) je tangenta v \\(P\\) in dotikališče je \\(P\\).',
                'The point \\(P=(4,\\tfrac95)\\) on the ellipse \\(9x^2+25y^2=225\\); the polar \\(4x+5y-25=0\\) is the tangent at \\(P\\) and the point of tangency is \\(P\\).'),
        }),
        step({
            id: 'pole-polar-infinity', order: 5,
            title: text('Točka v neskončnosti in njena polara', 'A point at infinity and its polar'),
            purpose: text('Videti, da je polara točke v neskončnosti premer skozi središče.', 'Seeing that the polar of a point at infinity is a diameter through the centre.'),
            explanation: text(
                'Točka v neskončnosti v smeri \\((1,0)\\), to je homogeno \\((1,0,0)\\), leži zunaj elipse \\(9x^2+25y^2=225\\) (vrednost \\(9>0\\)). Njena polara je \\(9x=0\\), torej premica \\(x=0\\), kot jo zapiše graf; poteka skozi središče \\((0,0)\\) elipse, je premer. Tangenti iz te točke sta vzporedni, \\(y=-3\\) in \\(y=3\\), z dotikališčema \\(T_1=(0,-3)\\) in \\(T_2=(0,3)\\). Obratno je središče pol premice v neskončnosti.',
                'The point at infinity in the direction \\((1,0)\\), that is homogeneously \\((1,0,0)\\), lies outside the ellipse \\(9x^2+25y^2=225\\) (the value is \\(9>0\\)). Its polar is \\(9x=0\\), that is the line \\(x=0\\) as the graph writes it; it passes through the centre \\((0,0)\\) of the ellipse, so it is a diameter. The tangents from this point are parallel, \\(y=-3\\) and \\(y=3\\), with the points of tangency \\(T_1=(0,-3)\\) and \\(T_2=(0,3)\\). Conversely, the centre is the pole of the line at infinity.',
            ),
            formulaIds: ['pole-polar-polar'],
            observationPrompt: text('Preberi smer točke \\(P\\), polaro in središče elipse.', 'Read the direction of the point \\(P\\), the polar and the centre of the ellipse.'),
            expectedObservations: [text('Polara \\(x=0\\) poteka skozi središče \\((0,0)\\); tangenti sta vzporedni.', 'The polar \\(x=0\\) passes through the centre \\((0,0)\\); the tangents are parallel.')],
            scene: polePolarScene('pole-polar-infinity-scene', 'infinity', [],
                'Točka \\(P\\) v neskončnosti v smeri \\((1,0)\\); polara \\(x=0\\) poteka skozi središče \\((0,0)\\) elipse \\(9x^2+25y^2=225\\); tangenti \\(y=-3\\) in \\(y=3\\) se dotikata v \\(T_1=(0,-3)\\) in \\(T_2=(0,3)\\).',
                'The point \\(P\\) at infinity in the direction \\((1,0)\\); the polar \\(x=0\\) passes through the centre \\((0,0)\\) of the ellipse \\(9x^2+25y^2=225\\); the tangents \\(y=-3\\) and \\(y=3\\) touch at \\(T_1=(0,-3)\\) and \\(T_2=(0,3)\\).'),
        }),
        step({
            id: 'pole-polar-line', order: 6,
            title: text('Pol premice: ista preslikava nazaj', 'The pole of a line: the same map in reverse'),
            purpose: text('Videti, da iz polare dobimo točko \\(P\\) kot presečišče tangent.', 'Seeing that from the polar we recover the point \\(P\\) as the intersection of the tangents.'),
            explanation: text(
                'Premica \\(p\\): \\(x+7y=25\\) seka krožnico \\(x^2+y^2=25\\) v \\(T_1=(-3,4)\\) in \\(T_2=(4,3)\\), saj je \\(-3+28=25\\) in \\(4+21=25\\). Tangenti v teh točkah sta \\(-3x+4y=25\\) in \\(4x+3y=25\\) in se sekata v \\(P=(1,7)\\). Torej je \\(P\\) pol premice \\(p\\) glede na krožnico, \\(p\\) pa polara točke \\(P\\): slika je ista kot prej, preslikava pa je prebrana v nasprotni smeri.',
                'The line \\(p\\): \\(x+7y=25\\) meets the circle \\(x^2+y^2=25\\) at \\(T_1=(-3,4)\\) and \\(T_2=(4,3)\\), since \\(-3+28=25\\) and \\(4+21=25\\). The tangents at these points are \\(-3x+4y=25\\) and \\(4x+3y=25\\), and they meet at \\(P=(1,7)\\). So \\(P\\) is the pole of the line \\(p\\) with respect to the circle, and \\(p\\) is the polar of the point \\(P\\): the picture is the same as before, and the map is read in the opposite direction.',
            ),
            formulaIds: ['pole-polar-polar'],
            observationPrompt: text('Preberi polaro, obe tangenti in dotikališči.', 'Read the polar, both tangents and the points of tangency.'),
            expectedObservations: [text('Polara \\(x+7y-25=0\\) poteka skozi \\(T_1\\) in \\(T_2\\), tangenti se sekata v \\(P\\).', 'The polar \\(x+7y-25=0\\) passes through \\(T_1\\) and \\(T_2\\), and the tangents meet at \\(P\\).')],
            scene: polePolarScene('pole-polar-line-scene', 'default', [
                {kind: 'projective', operation: 'pole-polar-set-conic', conic: 'circle'},
                {kind: 'projective', operation: 'pole-polar-place', x: 5, y: 35},
            ],
                'Krožnica \\(x^2+y^2=25\\), točka \\(P=(1,7)\\) zunaj nje, polara \\(x+7y-25=0\\) skozi \\(T_1=(-3,4)\\) in \\(T_2=(4,3)\\); tangenti \\(3x-4y+25=0\\) in \\(4x+3y-25=0\\).',
                'The circle \\(x^2+y^2=25\\), the point \\(P=(1,7)\\) outside it, the polar \\(x+7y-25=0\\) through \\(T_1=(-3,4)\\) and \\(T_2=(4,3)\\); the tangents \\(3x-4y+25=0\\) and \\(4x+3y-25=0\\).'),
        }),
        step({
            id: 'pole-polar-explore', order: 7,
            title: text('Samostojno raziskovanje: parabola', 'Free exploration: a parabola'),
            purpose: text('Preizkusiti polaro na drugi stožnici in videti, da parabola nima končnega središča.', 'Trying the polar on another conic and seeing that a parabola has no finite centre.'),
            explanation: text(
                'Stožnica je parabola \\(x^2=4y\\), točka je \\(P=(2,0)\\), zunaj parabole. Polara je \\(x-y=0\\) in seka parabolo v \\(T_1=(0,0)\\) in \\(T_2=(4,4)\\); tangenti sta \\(y=0\\) in \\(2x-y-4=0\\). Središče parabole je pol premice v neskončnosti: to je točka v neskončnosti v smeri osi \\((0,1)\\), zato končnega središča ni in graf nobenega ne nariše. Izberi drugo stožnico ali premikaj \\(P\\) s puščičnimi tipkami; vsak položaj je ilustracija, ne dokaz.',
                'The conic is the parabola \\(x^2=4y\\), and the point is \\(P=(2,0)\\), outside the parabola. The polar is \\(x-y=0\\) and meets the parabola at \\(T_1=(0,0)\\) and \\(T_2=(4,4)\\); the tangents are \\(y=0\\) and \\(2x-y-4=0\\). The centre of the parabola is the pole of the line at infinity: it is the point at infinity in the direction of the axis \\((0,1)\\), so there is no finite centre and the graph draws none. Choose another conic or move \\(P\\) with the arrow keys; every position is an illustration, not a proof.',
            ),
            formulaIds: ['pole-polar-polar', 'pole-polar-region'],
            observationPrompt: text('Preberi, kje je središče parabole.', 'Read where the centre of the parabola is.'),
            expectedObservations: [text('Središče je v neskončnosti v smeri \\((0,1)\\); končnega središča ni.', 'The centre is at infinity in the direction \\((0,1)\\); there is no finite centre.')],
            scene: polePolarScene('pole-polar-explore-scene', 'default', [
                {kind: 'projective', operation: 'pole-polar-set-conic', conic: 'parabola'},
                {kind: 'projective', operation: 'pole-polar-place', x: 10, y: 0},
            ],
                'Parabola \\(x^2=4y\\), točka \\(P=(2,0)\\) zunaj nje, polara \\(x-y=0\\) skozi \\(T_1=(0,0)\\) in \\(T_2=(4,4)\\); središče je v neskončnosti v smeri \\((0,1)\\) in ni narisano.',
                'The parabola \\(x^2=4y\\), the point \\(P=(2,0)\\) outside it, the polar \\(x-y=0\\) through \\(T_1=(0,0)\\) and \\(T_2=(4,4)\\); the centre is at infinity in the direction \\((0,1)\\) and is not drawn.'),
        }),
    ],
    sources: [
        {
            id: 'fmf-pole-polar-syllabus',
            citation: 'Fakulteta za matematiko in fiziko, Univerza v Ljubljani, učni načrt Afina in projektivna geometrija (1Mate/2Mate 2025), tema pol in polara. Cited from the syllabus topic list; not opened beyond the list.',
            implementationCorrespondence: 'The theorem on the polar (outside, on, inside, the polar of the centre) is the statement of docs/specs/projective-conics-lessons.md section K3 and is checked in the app by exact residuals of the points of tangency on the polar and the tangents; the lesson does not prove it.',
        },
        {
            id: 'coxeter-pole-polar',
            citation: 'Coxeter, H. S. M. Projective Geometry, 2nd ed., Springer, 1987, the chapters on conics and on pole and polar. Standard text, cited and not opened.',
            implementationCorrespondence: 'The text supplies the theorem on the polar that the lesson states; the lesson reproduces no proof, and moving the point P on the graph is labelled an illustration.',
        },
        {
            id: 'bezeg-pole-polar-implementation',
            citation: 'Bezeg source: src/projective/conic.ts, src/graphs/projective/polePolarModel.ts and src/graphs/projective/PolePolarGraph.tsx.',
            implementationCorrespondence: 'A scene loads an example and applies the graph\'s own conic and position edits; the lesson text quotes only values of those scenes, and the test recomputes them with exact fractions.',
        },
    ],
    edgeCases: [
        text('Če je stožnica izrojena, lega točke ni določena; graf to navede namesto tangent.', 'If the conic is degenerate, the position of the point is not determined; the graph says so instead of drawing tangents.'),
        text('Če sta dotikališči iracionalni, graf njuni koordinati in tangenti navede kot številčni vrednosti z navedeno toleranco; zunaj, na in znotraj se odloči natančno.', 'If the points of tangency are irrational, the graph gives their coordinates and the tangents as numerical values with a stated tolerance; outside, on and inside are decided exactly.'),
        text('Točka je na mreži s korakom \\(\\tfrac15\\), točka v neskončnosti pa ima celoštevilsko smer, zato so polare natančne.', 'The point sits on a grid of step \\(\\tfrac15\\) and a point at infinity has an integer direction, so the polars are exact.'),
    ],
    unresolvedQuestions: [],
};

export const projectiveConicsGuidedLessons: readonly GuidedLesson[] = [crossRatioLesson, pascalLesson, polePolarLesson, fivePointLesson, threeViewsLesson];
