/**
 * Guided lessons of the Projective geometry and conics family (docs/specs/projective-conics-lessons.md), batch A: K1, the cross-ratio,
 * on `projective-cross-ratio`. The text is a one-shot draft (docs/specs/new-lesson-families.md, "One-shot lesson text"): every number it
 * quotes is a value of the scene it belongs to, and `projectiveConicsGuidedLessons.test.ts` recomputes them with exact fractions, without
 * the projective kernel, and checks them against the real graph. Scenes use only the `projective` actions `CrossRatioGraph` registers
 * (`load-example` and `move-handle`), and every scene sets every value it states, so it does not depend on the scene before it.
 */
import type {LessonAction} from '../model';
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
    frames: [frame(`${content.id}-explanation`, 'explanation'), frame(`${content.id}-observation`, 'observation')],
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

export const projectiveConicsGuidedLessons: readonly GuidedLesson[] = [crossRatioLesson];
