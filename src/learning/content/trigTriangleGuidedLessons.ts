/**
 * Guided lessons of the trigonometry family, batch B (docs/specs/trigonometry-lessons.md): TR3, the sine rule via the circumcircle, and TR4, the
 * cosine rule, both on `triangle-solver` (TriangleSolverGraph, modes `sides` and `circle`). Host-free content: each is the lesson of one section of the
 * trigonometry chapter (the chapter join and the Demonstration wiring come in the next slice). Scenes use only the `triangle` actions the graph registers
 * (`set-mode`, `set-vertex`) after the Demonstration default, and every scene names the mode and all three vertices. The numbers the text quotes are
 * the readouts of those scenes, probed from the real graph (`.command-logs/f3-trig-b/probe.txt`); plain arithmetic is labelled as a calculation.
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

type Vertex = readonly [number, number];

/** What a scene sets: the mode and the three grid vertices (x from -2 to 8, y from -7 to 11, as the coordinate fields allow). */
export interface TriangleSceneSpec {
    readonly mode: 'sides' | 'circle';
    readonly A: Vertex;
    readonly B: Vertex;
    readonly C: Vertex;
}

/** The actions of a scene: the Demonstration default, then the mode and the three vertices. */
export const triangleSceneActions = (id: string, spec: TriangleSceneSpec): LessonAction[] => [
    {kind: 'prepared-scene', sceneId: id, source: 'demonstration-default'},
    {kind: 'triangle', operation: 'set-mode', mode: spec.mode},
    {kind: 'triangle', operation: 'set-vertex', vertex: 'A', x: spec.A[0], y: spec.A[1]},
    {kind: 'triangle', operation: 'set-vertex', vertex: 'B', x: spec.B[0], y: spec.B[1]},
    {kind: 'triangle', operation: 'set-vertex', vertex: 'C', x: spec.C[0], y: spec.C[1]},
];

const scene = (id: string, spec: TriangleSceneSpec, sl: string, en: string): LessonScene =>
    ({id, basedOn: 'demonstration-default', actions: triangleSceneActions(id, spec), expectedState: text(sl, en)});

/** The triangle of both lessons, the graph default: A = (0, 0), B = (7, 0), C = (2, 4). */
const DEFAULT: Pick<TriangleSceneSpec, 'A' | 'B' | 'C'> = {A: [0, 0], B: [7, 0], C: [2, 4]};

// ---- TR3 -------------------------------------------------------------------------------------------------------------------------

const tr3Formulas: readonly FormulaBlock[] = [
    {
        id: 'sine-rule',
        latex: '\\frac{a}{\\sin A}=\\frac{b}{\\sin B}=\\frac{c}{\\sin C}=2R',
        notation: text(
            '\\(a\\), \\(b\\), \\(c\\) so stranice nasproti kotov \\(A\\), \\(B\\), \\(C\\) (stranica \\(a\\) je \\(BC\\)), \\(R\\) je polmer očrtane krožnice, \\(2R\\) njen premer.',
            '\\(a\\), \\(b\\), \\(c\\) are the sides opposite the angles \\(A\\), \\(B\\), \\(C\\) (the side \\(a\\) is \\(BC\\)), \\(R\\) is the radius of the circumcircle and \\(2R\\) its diameter.',
        ),
        explanation: text(
            'Sinusni izrek: v vsakem trikotniku so razmerja stranice in sinusa nasprotnega kota enaka premeru očrtane krožnice. Argument za ostri kot \\(A\\): naj bo \\(A′\\) drugo krajišče premera iz \\(B\\). Po Talesovem izreku je kot pri \\(C\\) v trikotniku \\(BA′ C\\) pravi, njegova hipotenuza \\(BA′\\) pa ima dolžino \\(2R\\). Obodna kota nad tetivo \\(BC\\), ki ležita na istem loku, sta enaka, zato je kot pri \\(A′\\) enak kotu \\(A\\). V pravokotnem trikotniku je sinus kota enak razmerju kateta : hipotenuza, torej je \\(\\sin A=\\tfrac{a}{2R}\\) in \\(a=2R\\sin A\\). Za topi kot \\(A\\) velja drugi argument, ki ga pokaže eden od naslednjih korakov. Enako velja za \\(b\\) in \\(c\\), če oglišča preimenujemo. Premikanje oglišč v grafu je ponazoritev, konstrukcija pa argument.',
            'The sine rule: in every triangle the quotients of a side and the sine of the opposite angle equal the diameter of the circumcircle. Argument for an acute angle \\(A\\): let \\(A′\\) be the other end of the diameter from \\(B\\). By the theorem of Thales the angle at \\(C\\) in the triangle \\(BA′ C\\) is a right angle, and its hypotenuse \\(BA′\\) has length \\(2R\\). The inscribed angles over the chord \\(BC\\) that lie on the same arc are equal, so the angle at \\(A′\\) equals \\(A\\). In a right triangle the sine of an angle is the quotient leg : hypotenuse, so \\(\\sin A=\\tfrac{a}{2R}\\) and \\(a=2R\\sin A\\). For an obtuse angle \\(A\\) a second argument holds, which one of the next steps shows. The same holds for \\(b\\) and \\(c\\) after renaming the vertices. Moving the vertices in the graph is an illustration, the construction is the argument.',
        ),
    },
];

const tr3Examples: readonly WorkedExample[] = [
    {
        id: 'tr3-a-from-2r',
        title: text('Stranica \\(a\\) iz premera \\(2R\\) in kota \\(A\\)', 'The side \\(a\\) from the diameter \\(2R\\) and the angle \\(A\\)'),
        calculationLatex: 'a=2R\\sin A\\approx7{,}15891\\cdot0{,}894427',
        resultLatex: 'a\\approx6{,}40312',
        check: text(
            'Za kot \\(A\\approx63{,}4349^\\circ\\) je \\(\\sin A\\approx0{,}894427\\) in \\(2R\\approx7{,}15891\\), zato je \\(2R\\sin A\\approx7{,}15891\\cdot0{,}894427\\approx6{,}40312\\). To se do zaokrožitve ujema s stranico \\(a=\\sqrt{41}\\approx6{,}40312\\) v odčitku.',
            'For the angle \\(A\\approx63.4349^\\circ\\) we have \\(\\sin A\\approx0.894427\\) and \\(2R\\approx7.15891\\), so \\(2R\\sin A\\approx7.15891\\cdot0.894427\\approx6.40312\\). Up to rounding this agrees with the side \\(a=\\sqrt{41}\\approx6.40312\\) in the readout.',
        ),
    },
];

const tr3Steps: readonly GuidedLessonStep[] = [
    step({
        id: 'tr3-ratios', order: 1,
        title: text('Stranice, koti in njihova razmerja', 'Sides, angles and their quotients'),
        purpose: text('Napovedati, ali so razmerja stranice in sinusa nasprotnega kota povezana, preden jih odčitamo.', 'Predicting whether the quotients of a side and the sine of the opposite angle are related before reading them.'),
        explanation: text(
            'Trikotnik z oglišči \\(A=(0,0)\\), \\(B=(7,0)\\), \\(C=(2,4)\\) ima stranice \\(a\\approx6{,}40312\\), \\(b\\approx4{,}47214\\), \\(c=7\\) in kote \\(A\\approx63{,}4349^\\circ\\), \\(B\\approx38{,}6598^\\circ\\), \\(C\\approx77{,}9052^\\circ\\). Stranica \\(a\\) leži nasproti kota \\(A\\), stranica \\(b\\) nasproti kota \\(B\\), stranica \\(c\\) nasproti kota \\(C\\). Stranice so med seboj različne, koti prav tako. Preden pogledaš odčitke razmerij \\(a:\\sin A\\), \\(b:\\sin B\\) in \\(c:\\sin C\\), napovej: ali so ta tri razmerja med seboj povezana in kako?',
            'The triangle with the vertices \\(A=(0,0)\\), \\(B=(7,0)\\), \\(C=(2,4)\\) has the sides \\(a\\approx6.40312\\), \\(b\\approx4.47214\\), \\(c=7\\) and the angles \\(A\\approx63.4349^\\circ\\), \\(B\\approx38.6598^\\circ\\), \\(C\\approx77.9052^\\circ\\). The side \\(a\\) lies opposite the angle \\(A\\), the side \\(b\\) opposite \\(B\\), the side \\(c\\) opposite \\(C\\). The sides differ from one another, and so do the angles. Before you look at the readouts of the quotients \\(a:\\sin A\\), \\(b:\\sin B\\) and \\(c:\\sin C\\), predict: are these three quotients related, and how?',
        ),
        formulaIds: [],
        observationPrompt: text('Preberi odčitke treh razmerij in jih primerjaj s svojo napovedjo.', 'Read the three quotient readouts and compare them with your prediction.'),
        expectedObservations: [text(
            'Vsa tri razmerja so enaka, \\(\\approx7{,}15891\\), čeprav so stranice in koti različni. To je ponazoritev na enem trikotniku, ne dokaz.',
            'All three quotients are equal, \\(\\approx7.15891\\), although the sides and the angles differ. This is an illustration on one triangle, not a proof.',
        )],
        scene: scene('tr3-ratios-scene', {mode: 'sides', ...DEFAULT},
            'Način Stranice in kosinusni izrek; \\(A=(0,0)\\), \\(B=(7,0)\\), \\(C=(2,4)\\); vsa tri razmerja so \\(\\approx7{,}15891\\).',
            'The mode Sides and the cosine rule; \\(A=(0,0)\\), \\(B=(7,0)\\), \\(C=(2,4)\\); all three quotients are \\(\\approx7.15891\\).'),
    }),
    step({
        id: 'tr3-drag', order: 2,
        title: text('Premik oglišča', 'Moving a vertex'),
        purpose: text('Napovedati, kaj se zgodi z razmerji, ko premaknemo oglišče.', 'Predicting what happens to the quotients when a vertex moves.'),
        explanation: text(
            'Oglišče \\(C\\) je zdaj pri \\((6,5)\\). Premikaj ga po mreži, z vlečenjem ali z vrstico Oglišče C (polji x in y), in opazuj tri razmerja. Napovej: ali ostanejo razmerja med seboj enaka in ali ostane enaka tudi njihova skupna vrednost?',
            'The vertex \\(C\\) is now at \\((6,5)\\). Move it on the grid, by dragging or with the row Vertex C (fields x and y), and watch the three quotients. Predict: do the quotients stay equal to one another, and does their common value stay the same too?',
        ),
        formulaIds: [],
        observationPrompt: text('Primerjaj tri razmerja pri \\(C=(6,5)\\) z razmerji pri \\(C=(2,4)\\) in premakni \\(C\\) še na nekaj drugih točk.', 'Compare the three quotients at \\(C=(6,5)\\) with those at \\(C=(2,4)\\) and move \\(C\\) to a few other points.'),
        expectedObservations: [text(
            'Pri \\(C=(6,5)\\) so vsa tri razmerja \\(\\approx7{,}96492\\): še vedno so med seboj enaka, skupna vrednost pa se je spremenila (prej \\(\\approx7{,}15891\\)). Spremeni se, ker se spremeni trikotnik; enakost razmerij ostane.',
            'At \\(C=(6,5)\\) all three quotients are \\(\\approx7.96492\\): they are still equal to one another, but the common value has changed (before \\(\\approx7.15891\\)). It changes because the triangle changes; the equality of the quotients stays.',
        )],
        scene: scene('tr3-drag-scene', {mode: 'sides', A: [0, 0], B: [7, 0], C: [6, 5]},
            'Način Stranice in kosinusni izrek; \\(A=(0,0)\\), \\(B=(7,0)\\), \\(C=(6,5)\\); vsa tri razmerja so \\(\\approx7{,}96492\\).',
            'The mode Sides and the cosine rule; \\(A=(0,0)\\), \\(B=(7,0)\\), \\(C=(6,5)\\); all three quotients are \\(\\approx7.96492\\).'),
    }),
    step({
        id: 'tr3-circle', order: 3,
        title: text('Očrtana krožnica in premer iz oglišča \\(B\\)', 'The circumcircle and the diameter from the vertex \\(B\\)'),
        purpose: text(
            'Napovedati, kako je skupna vrednost razmerij povezana z očrtano krožnico in kakšna sta kota v pomožnem trikotniku, ki ga določa premer.',
            'Predicting how the common value of the quotients relates to the circumcircle and what the angles of the auxiliary triangle determined by the diameter are.',
        ),
        explanation: text(
            'Oglišče \\(C\\) je spet pri \\((2,4)\\), način pa je Očrtana krožnica in sinusni izrek. Skozi tri oglišča, ki niso na isti premici, gre natanko ena krožnica, očrtana krožnica; njen polmer je \\(R\\). Skupna vrednost razmerij je bila pri tem trikotniku \\(\\approx7{,}15891\\). Graf nariše tudi premer \\(BA′\\), ki gre iz oglišča \\(B\\) skozi središče krožnice, in pomožni trikotnik \\(BA′C\\) (črtkano). Napovej, preden pogledaš odčitke: (1) kako je skupna vrednost razmerij povezana z očrtano krožnico, (2) kolikšen je kot pri \\(C\\) v trikotniku \\(BA′C\\) in (3) kolikšen je kot pri \\(A′\\) v primerjavi s kotom \\(A\\) trikotnika \\(ABC\\)?',
            'The vertex \\(C\\) is back at \\((2,4)\\) and the mode is Circumcircle and the sine rule. Through three vertices that do not lie on one line there passes exactly one circle, the circumcircle; its radius is \\(R\\). The common value of the quotients for this triangle was \\(\\approx7.15891\\). The graph also draws the diameter \\(BA′\\), which runs from the vertex \\(B\\) through the centre of the circle, and the auxiliary triangle \\(BA′C\\) (dashed). Predict before you look at the readouts: (1) how the common value of the quotients is related to the circumcircle, (2) what the angle at \\(C\\) in the triangle \\(BA′C\\) is, and (3) how the angle at \\(A′\\) compares with the angle \\(A\\) of the triangle \\(ABC\\).',
        ),
        formulaIds: [],
        observationPrompt: text(
            'Preberi premer očrtane krožnice \\(2R\\), središče \\(O\\), točko \\(A′\\), skalarni produkt \\(CB\\cdot CA′\\) in kot pri \\(A′\\) ter jih primerjaj s svojimi napovedmi.',
            'Read the diameter of the circumcircle \\(2R\\), the centre \\(O\\), the point \\(A′\\), the dot product \\(CB\\cdot CA′\\) and the angle at \\(A′\\), and compare them with your predictions.',
        ),
        expectedObservations: [
            text(
                'Premer očrtane krožnice je \\(2R\\approx7{,}15891\\), enak skupni vrednosti razmerij; \\(R^2=\\tfrac{205}{16}\\) je točno. V tem trikotniku so torej razmerja enaka \\(2R\\).',
                'The diameter of the circumcircle is \\(2R\\approx7.15891\\), equal to the common value of the quotients; \\(R^2=\\tfrac{205}{16}\\) is exact. In this triangle the quotients therefore equal \\(2R\\).',
            ),
            text(
                'Središče je \\(O=(\\tfrac72,\\tfrac34)\\) in \\(A′=2O-B=(0,\\tfrac32)\\). Skalarni produkt \\(CB\\cdot CA′\\) je \\(0\\), torej je kot pri \\(C\\) pravi (Talesov izrek). Kot pri \\(A′\\) je \\(\\approx63{,}4349^\\circ\\), enak kotu \\(A\\) na prikazano natančnost: obodna kota nad tetivo \\(BC\\).',
                'The centre is \\(O=(\\tfrac72,\\tfrac34)\\) and \\(A′=2O-B=(0,\\tfrac32)\\). The dot product \\(CB\\cdot CA′\\) is \\(0\\), so the angle at \\(C\\) is a right angle (the theorem of Thales). The angle at \\(A′\\) is \\(\\approx63.4349^\\circ\\), equal to the angle \\(A\\) to the displayed accuracy: inscribed angles over the chord \\(BC\\).',
            ),
        ],
        scene: scene('tr3-circle-scene', {mode: 'circle', ...DEFAULT},
            'Način Očrtana krožnica in sinusni izrek; \\(A=(0,0)\\), \\(B=(7,0)\\), \\(C=(2,4)\\); \\(2R\\approx7{,}15891\\), \\(R^2=\\tfrac{205}{16}\\), \\(O=(\\tfrac72,\\tfrac34)\\), \\(A′=(0,\\tfrac32)\\), skalarni produkt \\(0\\), kot pri \\(A′\\) \\(\\approx63{,}4349^\\circ\\).',
            'The mode Circumcircle and the sine rule; \\(A=(0,0)\\), \\(B=(7,0)\\), \\(C=(2,4)\\); \\(2R\\approx7.15891\\), \\(R^2=\\tfrac{205}{16}\\), \\(O=(\\tfrac72,\\tfrac34)\\), \\(A′=(0,\\tfrac32)\\), dot product \\(0\\), the angle at \\(A′\\) \\(\\approx63.4349^\\circ\\).'),
    }),
    step({
        id: 'tr3-argument', order: 4,
        title: text('Argument: \\(a=2R\\sin A\\)', 'The argument: \\(a=2R\\sin A\\)'),
        purpose: text('Iz pravokotnega trikotnika izpeljati sinusni izrek za ostri kot \\(A\\).', 'Deriving the sine rule for an acute angle \\(A\\) from the right triangle.'),
        explanation: text(
            'Argument za ostri kot \\(A\\), ki ga ponazarja narisana slika. Trikotnik \\(BA′ C\\) ima pri \\(C\\) pravi kot, hipotenuza \\(BA′\\) je premer dolžine \\(2R\\), nasprotna kateta kota \\(A′\\) je \\(BC=a\\). Zato je \\(\\sin A′=\\tfrac{a}{2R}\\). Obodna kota \\(A\\) in \\(A′\\) nad tetivo \\(BC\\) ležita na istem loku in sta enaka (lekcija Obodni kot in Talesov izrek), torej je \\(a=2R\\sin A\\). Isti argument ob preimenovanju oglišč da \\(b=2R\\sin B\\) in \\(c=2R\\sin C\\), kadar je ustrezni kot ostri.',
            'The argument for an acute angle \\(A\\), which the drawn figure illustrates. The triangle \\(BA′ C\\) has a right angle at \\(C\\), its hypotenuse \\(BA′\\) is a diameter of length \\(2R\\), and the leg opposite the angle \\(A′\\) is \\(BC=a\\). Hence \\(\\sin A′=\\tfrac{a}{2R}\\). The inscribed angles \\(A\\) and \\(A′\\) over the chord \\(BC\\) lie on the same arc and are equal (the lesson The inscribed angle and Thales\' theorem), so \\(a=2R\\sin A\\). The same argument with the vertices renamed gives \\(b=2R\\sin B\\) and \\(c=2R\\sin C\\) whenever the corresponding angle is acute.',
        ),
        formulaIds: ['sine-rule'],
        workedExampleId: 'tr3-a-from-2r',
        observationPrompt: text('Primerjaj izračunano vrednost s stranico \\(a\\) v odčitku in na enak način preveri še \\(b=2R\\sin B\\) in \\(c=2R\\sin C\\).', 'Compare the computed value with the side \\(a\\) in the readout and check \\(b=2R\\sin B\\) and \\(c=2R\\sin C\\) in the same way.'),
        expectedObservations: [text(
            'Vse tri stranice se do zaokrožitve ujemajo z \\(2R\\) krat sinus nasprotnega kota. Račun z zaokroženimi števili je približen; natančna vrednost \\(a\\) je \\(\\sqrt{41}\\).',
            'All three sides agree up to rounding with \\(2R\\) times the sine of the opposite angle. A calculation with rounded numbers is approximate; the exact value of \\(a\\) is \\(\\sqrt{41}\\).',
        )],
        scene: scene('tr3-argument-scene', {mode: 'circle', ...DEFAULT},
            'Način Očrtana krožnica in sinusni izrek; \\(A=(0,0)\\), \\(B=(7,0)\\), \\(C=(2,4)\\); \\(a=\\sqrt{41}\\approx6{,}40312\\), \\(2R\\approx7{,}15891\\).',
            'The mode Circumcircle and the sine rule; \\(A=(0,0)\\), \\(B=(7,0)\\), \\(C=(2,4)\\); \\(a=\\sqrt{41}\\approx6.40312\\), \\(2R\\approx7.15891\\).'),
    }),
    step({
        id: 'tr3-obtuse', order: 5,
        title: text('Topi kot \\(A\\)', 'An obtuse angle \\(A\\)'),
        purpose: text('Napovedati, kaj se zgodi s pomožnim trikotnikom, kadar je kot \\(A\\) topi.', 'Predicting what happens to the auxiliary triangle when the angle \\(A\\) is obtuse.'),
        explanation: text(
            'Oglišče \\(C\\) je zdaj pri \\((-2,2)\\), kot \\(A\\) je topi (\\(A=135^\\circ\\)), \\(B\\) ostane pri \\((7,0)\\). Argument iz prejšnjega koraka je za ostri kot \\(A\\). Napovej: kje leži točka \\(A′\\) glede na oglišče \\(A\\), kolikšen je kot pri \\(A′\\) in ali še velja \\(a=2R\\sin A\\)?',
            'The vertex \\(C\\) is now at \\((-2,2)\\), the angle \\(A\\) is obtuse (\\(A=135^\\circ\\)), and \\(B\\) stays at \\((7,0)\\). The argument of the previous step is for an acute angle \\(A\\). Predict: where does the point \\(A′\\) lie relative to the vertex \\(A\\), what is the angle at \\(A′\\), and does \\(a=2R\\sin A\\) still hold?',
        ),
        formulaIds: [],
        observationPrompt: text('Preberi kot pri \\(A′\\), \\(2R\\) in razmerje \\(a:\\sin A\\) ter ugotovi, na katerem loku nad tetivo \\(BC\\) je \\(A′\\).', 'Read the angle at \\(A′\\), \\(2R\\) and the quotient \\(a:\\sin A\\), and find which arc over the chord \\(BC\\) holds \\(A′\\).'),
        expectedObservations: [
            text(
                'Kot pri \\(A′\\) je \\(45^\\circ\\), kot \\(A\\) pa \\(135^\\circ\\): vsota je \\(180^\\circ\\). Točka \\(A′\\) leži na drugem loku nad tetivo \\(BC\\) kot \\(A\\), štirikotnik \\(ABA′ C\\) je tetivni in njegova nasprotna kota pri \\(A\\) in \\(A′\\) se dopolnjujeta do \\(180^\\circ\\). Ker je \\(\\sin(180^\\circ-x)=\\sin x\\), je \\(\\sin A=\\sin A′=\\tfrac{a}{2R}\\) in \\(a=2R\\sin A\\) velja tudi za topi kot. To je drugi argument.',
                'The angle at \\(A′\\) is \\(45^\\circ\\) and the angle \\(A\\) is \\(135^\\circ\\): their sum is \\(180^\\circ\\). The point \\(A′\\) lies on the other arc over the chord \\(BC\\) than \\(A\\), the quadrilateral \\(ABA′ C\\) is cyclic, and its opposite angles at \\(A\\) and \\(A′\\) are supplementary, adding up to \\(180^\\circ\\). Since \\(\\sin(180^\\circ-x)=\\sin x\\), we get \\(\\sin A=\\sin A′=\\tfrac{a}{2R}\\) and \\(a=2R\\sin A\\) holds for an obtuse angle too. This is the second argument.',
            ),
            text(
                'Razmerje \\(a:\\sin A\\) je \\(\\approx13{,}0384\\), enako premeru \\(2R\\approx13{,}0384\\) (\\(R^2=\\tfrac{85}{2}\\)).',
                'The quotient \\(a:\\sin A\\) is \\(\\approx13.0384\\), equal to the diameter \\(2R\\approx13.0384\\) (\\(R^2=\\tfrac{85}{2}\\)).',
            ),
        ],
        scene: scene('tr3-obtuse-scene', {mode: 'circle', A: [0, 0], B: [7, 0], C: [-2, 2]},
            'Način Očrtana krožnica in sinusni izrek; \\(A=(0,0)\\), \\(B=(7,0)\\), \\(C=(-2,2)\\); \\(A=135^\\circ\\), kot pri \\(A′\\) \\(45^\\circ\\), \\(2R\\approx13{,}0384\\).',
            'The mode Circumcircle and the sine rule; \\(A=(0,0)\\), \\(B=(7,0)\\), \\(C=(-2,2)\\); \\(A=135^\\circ\\), the angle at \\(A′\\) \\(45^\\circ\\), \\(2R\\approx13.0384\\).'),
    }),
    step({
        id: 'tr3-explore', order: 6,
        title: text('Prosto raziskovanje', 'Free exploration'),
        purpose: text('Samostojno preizkusiti trikotnike, tudi posebne in sploščene.', 'Trying triangles on your own, including special and flat ones.'),
        explanation: text(
            'Premikaj oglišča ali vpisuj koordinate in opazuj tri razmerja, premer \\(2R\\) ter kot pri \\(A′\\). Poskusi tudi tri oglišča na isti premici. Primeri na sliki so ponazoritve; veljavnost sinusnega izreka zagotavljata argumenta iz prejšnjih korakov.',
            'Move the vertices or type coordinates and watch the three quotients, the diameter \\(2R\\) and the angle at \\(A′\\). Also try three vertices on one line. The examples in the picture are illustrations; the two arguments of the earlier steps establish the sine rule.',
        ),
        formulaIds: [],
        observationPrompt: text('Poišči postavitev, pri kateri je kot \\(A\\) pravi (na primer \\(A=(0,0)\\), \\(B=(4,0)\\), \\(C=(0,3)\\)), in preberi, kaj graf napiše o stranici \\(a\\).', 'Find a placement with a right angle \\(A\\) (for example \\(A=(0,0)\\), \\(B=(4,0)\\), \\(C=(0,3)\\)) and read what the graph says about the side \\(a\\).'),
        expectedObservations: [
            text(
                'Pri pravem kotu \\(A\\) je \\(A′=C\\): graf napiše, da je \\(BC\\) premer očrtane krožnice (\\(2R=5\\)) in da pomožnega trikotnika ni. Res je \\(a=2R\\), ker je \\(\\sin90^\\circ=1\\).',
                'With a right angle \\(A\\) we have \\(A′=C\\): the graph says that \\(BC\\) is a diameter of the circumcircle (\\(2R=5\\)) and that there is no auxiliary triangle. Indeed \\(a=2R\\) because \\(\\sin90^\\circ=1\\).',
            ),
            text(
                'Pri treh ogliščih na isti premici graf napiše, da točke ležijo na premici (sploščen trikotnik) in da očrtane krožnice ni; razmerij ne izpiše.',
                'With three vertices on one line the graph says that the points lie on a line (a flat triangle) and that there is no circumcircle; it shows no quotients.',
            ),
        ],
        scene: scene('tr3-explore-scene', {mode: 'circle', ...DEFAULT},
            'Način Očrtana krožnica in sinusni izrek; \\(A=(0,0)\\), \\(B=(7,0)\\), \\(C=(2,4)\\); prosto raziskovanje.',
            'The mode Circumcircle and the sine rule; \\(A=(0,0)\\), \\(B=(7,0)\\), \\(C=(2,4)\\); free exploration.'),
    }),
];

// ---- TR4 -------------------------------------------------------------------------------------------------------------------------

const tr4Formulas: readonly FormulaBlock[] = [
    {
        id: 'cosine-rule',
        latex: 'c^2=a^2+b^2-2ab\\cos C',
        notation: text(
            '\\(a\\), \\(b\\), \\(c\\) so stranice nasproti kotov \\(A\\), \\(B\\), \\(C\\); \\(2ab\\cos C\\) je popravek k Pitagorovemu izreku.',
            '\\(a\\), \\(b\\), \\(c\\) are the sides opposite the angles \\(A\\), \\(B\\), \\(C\\); \\(2ab\\cos C\\) is the correction to the theorem of Pythagoras.',
        ),
        explanation: text(
            'Kosinusni izrek: v vsakem trikotniku je \\(c^2=a^2+b^2-2ab\\cos C\\). Popravek \\(2ab\\cos C\\) je ničen natanko pri \\(C=90^\\circ\\), kjer dobimo Pitagorov izrek, pri ostrem kotu je pozitiven, pri topem negativen.',
            'The cosine rule: in every triangle \\(c^2=a^2+b^2-2ab\\cos C\\). The correction \\(2ab\\cos C\\) is zero exactly when \\(C=90^\\circ\\), where we get the theorem of Pythagoras; it is positive for an acute angle and negative for an obtuse one.',
        ),
    },
    {
        id: 'dot-identity',
        latex: 'c^2=a^2+b^2-2\\,\\overrightarrow{CA}\\cdot\\overrightarrow{CB}',
        notation: text(
            '\\(\\overrightarrow{CA}\\cdot\\overrightarrow{CB}\\) je skalarni produkt vektorjev iz \\(C\\) v \\(A\\) in iz \\(C\\) v \\(B\\); pri celoštevilskih koordinatah je celo število.',
            '\\(\\overrightarrow{CA}\\cdot\\overrightarrow{CB}\\) is the dot product of the vectors from \\(C\\) to \\(A\\) and from \\(C\\) to \\(B\\); with integer coordinates it is an integer.',
        ),
        explanation: text(
            'Argument: iz \\(\\overrightarrow{AB}=\\overrightarrow{CB}-\\overrightarrow{CA}\\) sledi \\(c^2=|\\overrightarrow{CB}|^2+|\\overrightarrow{CA}|^2-2\\,\\overrightarrow{CA}\\cdot\\overrightarrow{CB}\\), kar je \\(c^2=a^2+b^2-2\\,\\overrightarrow{CA}\\cdot\\overrightarrow{CB}\\). Ker je skalarni produkt \\(ab\\cos C\\), dobimo kosinusni izrek. Enakost velja za vsak trikotnik; pri celoštevilskih ogliščih jo izražajo cela števila natančno.',
            'Argument: from \\(\\overrightarrow{AB}=\\overrightarrow{CB}-\\overrightarrow{CA}\\) it follows that \\(c^2=|\\overrightarrow{CB}|^2+|\\overrightarrow{CA}|^2-2\\,\\overrightarrow{CA}\\cdot\\overrightarrow{CB}\\), which is \\(c^2=a^2+b^2-2\\,\\overrightarrow{CA}\\cdot\\overrightarrow{CB}\\). Since the dot product is \\(ab\\cos C\\), we get the cosine rule. The equality holds for every triangle; with integer vertices it is stated exactly by integers.',
        ),
    },
];

const tr4Examples: readonly WorkedExample[] = [
    {
        id: 'tr4-c-from-correction',
        title: text('Stranica \\(c\\) iz \\(a^2\\), \\(b^2\\) in popravka', 'The side \\(c\\) from \\(a^2\\), \\(b^2\\) and the correction'),
        calculationLatex: 'c^2=a^2+b^2-2ab\\cos C=41+20-12',
        resultLatex: 'c^2=49,\\quad c=7',
        check: text(
            'Pri \\(A=(0,0)\\), \\(B=(7,0)\\), \\(C=(2,4)\\) je \\(a^2=41\\), \\(b^2=20\\) in \\(\\overrightarrow{CA}\\cdot\\overrightarrow{CB}=6\\), zato je \\(2ab\\cos C=12\\) in \\(c^2=41+20-12=49\\). Iz tega je \\(\\cos C=\\tfrac{6}{\\sqrt{820}}\\approx0{,}2095\\); to je približna vrednost, račun s skalarnim produktom pa je natančen.',
            'For \\(A=(0,0)\\), \\(B=(7,0)\\), \\(C=(2,4)\\) we have \\(a^2=41\\), \\(b^2=20\\) and \\(\\overrightarrow{CA}\\cdot\\overrightarrow{CB}=6\\), so \\(2ab\\cos C=12\\) and \\(c^2=41+20-12=49\\). Hence \\(\\cos C=\\tfrac{6}{\\sqrt{820}}\\approx0.2095\\); this is an approximate value, while the calculation with the dot product is exact.',
        ),
    },
];

const tr4Steps: readonly GuidedLessonStep[] = [
    step({
        id: 'tr4-squares', order: 1,
        title: text('Kvadrati stranic', 'The squares of the sides'),
        purpose: text('Napovedati predznak razlike \\(c^2-a^2-b^2\\) pri ostrem kotu \\(C\\).', 'Predicting the sign of \\(c^2-a^2-b^2\\) for an acute angle \\(C\\).'),
        explanation: text(
            'V pravokotnem trikotniku s pravim kotom pri \\(C\\) je po Pitagorovem izreku \\(c^2=a^2+b^2\\). Desno od trikotnika \\(A=(0,0)\\), \\(B=(7,0)\\), \\(C=(2,4)\\) sta dve vodoravni vrstici v istem merilu: zgornja je dolga \\(c^2\\), spodnja \\(a^2+b^2\\), črtkani del je razlika, imenovana popravek. Kot \\(C\\) tu ni pravi. Napovej: kakšnega predznaka je \\(c^2-a^2-b^2\\), kadar je kot \\(C\\) oster?',
            'In a right triangle with the right angle at \\(C\\) the theorem of Pythagoras gives \\(c^2=a^2+b^2\\). To the right of the triangle \\(A=(0,0)\\), \\(B=(7,0)\\), \\(C=(2,4)\\) there are two horizontal rows on the same scale: the upper has length \\(c^2\\), the lower \\(a^2+b^2\\), and the dashed part is their difference, called the correction. The angle \\(C\\) is not a right angle here. Predict: what is the sign of \\(c^2-a^2-b^2\\) when the angle \\(C\\) is acute?',
        ),
        formulaIds: [],
        observationPrompt: text('Primerjaj vrstici, preberi popravek in status ter ju primerjaj s svojo napovedjo.', 'Compare the two rows, read the correction and the status, and compare them with your prediction.'),
        expectedObservations: [text(
            'Vrstica za \\(c^2=49\\) je krajša od vrstice za \\(a^2+b^2=61\\); popravek je \\(12\\), graf pa napiše, da je kot pri \\(C\\) oster. Torej je \\(c^2-a^2-b^2=-12<0\\), natančno \\(49=41+20-12\\). To je ponazoritev na enem trikotniku.',
            'The row for \\(c^2=49\\) is shorter than the row for \\(a^2+b^2=61\\); the correction is \\(12\\), and the graph says that the angle at \\(C\\) is acute. So \\(c^2-a^2-b^2=-12<0\\), exactly \\(49=41+20-12\\). This is an illustration on one triangle.',
        )],
        scene: scene('tr4-squares-scene', {mode: 'sides', ...DEFAULT},
            'Način Stranice in kosinusni izrek; \\(A=(0,0)\\), \\(B=(7,0)\\), \\(C=(2,4)\\); \\(c^2=49\\), \\(a^2+b^2=61\\), popravek \\(12\\).',
            'The mode Sides and the cosine rule; \\(A=(0,0)\\), \\(B=(7,0)\\), \\(C=(2,4)\\); \\(c^2=49\\), \\(a^2+b^2=61\\), correction \\(12\\).'),
    }),
    step({
        id: 'tr4-right', order: 2,
        title: text('Skozi pravi kot', 'Through the right angle'),
        purpose: text('Napovedati, kaj se zgodi s popravkom, ko kot \\(C\\) preide skozi \\(90^\\circ\\).', 'Predicting what happens to the correction when the angle \\(C\\) passes through \\(90^\\circ\\).'),
        explanation: text(
            'Oglišča so zdaj \\(A=(4,0)\\), \\(B=(0,3)\\), \\(C=(0,0)\\). Napovej, kolikšen je popravek v tej postavitvi, nato premakni \\(C\\) na \\((1,1)\\) in na \\((-1,-1)\\) ter napovej, kaj se zgodi s popravkom in z vrsticama.',
            'The vertices are now \\(A=(4,0)\\), \\(B=(0,3)\\), \\(C=(0,0)\\). Predict the correction in this placement, then move \\(C\\) to \\((1,1)\\) and to \\((-1,-1)\\) and predict what happens to the correction and the two rows.',
        ),
        formulaIds: [],
        observationPrompt: text('Preberi popravek in status v začetni postavitvi ter pri \\(C=(1,1)\\) in \\(C=(-1,-1)\\).', 'Read the correction and the status in the starting placement and at \\(C=(1,1)\\) and \\(C=(-1,-1)\\).'),
        expectedObservations: [text(
            'V začetni postavitvi je \\(c^2=25=9+16\\), popravek je \\(0\\) in graf napiše, da je pri \\(C\\) prav kot. Pri \\(C=(1,1)\\) je popravek \\(-10\\) (\\(25=5+10-(-10)\\)), kot pri \\(C\\) je top (\\(135^\\circ\\)); pri \\(C=(-1,-1)\\) je popravek \\(18\\) (\\(25=17+26-18\\)), kot je oster (\\(\\approx64{,}6538^\\circ\\)).',
            'In the starting placement \\(c^2=25=9+16\\), the correction is \\(0\\) and the graph says that the angle at \\(C\\) is a right angle. At \\(C=(1,1)\\) the correction is \\(-10\\) (\\(25=5+10-(-10)\\)) and the angle at \\(C\\) is obtuse (\\(135^\\circ\\)); at \\(C=(-1,-1)\\) the correction is \\(18\\) (\\(25=17+26-18\\)) and the angle is acute (\\(\\approx64.6538^\\circ\\)).',
        )],
        scene: scene('tr4-right-scene', {mode: 'sides', A: [4, 0], B: [0, 3], C: [0, 0]},
            'Način Stranice in kosinusni izrek; \\(A=(4,0)\\), \\(B=(0,3)\\), \\(C=(0,0)\\); \\(c^2=25=9+16\\), popravek \\(0\\), pravi kot pri \\(C\\).',
            'The mode Sides and the cosine rule; \\(A=(4,0)\\), \\(B=(0,3)\\), \\(C=(0,0)\\); \\(c^2=25=9+16\\), correction \\(0\\), a right angle at \\(C\\).'),
    }),
    step({
        id: 'tr4-dot', order: 3,
        title: text('Popravek in skalarni produkt', 'The correction and the dot product'),
        purpose: text('Napovedati, kako je popravek povezan s skalarnim produktom vektorjev iz \\(C\\).', 'Predicting how the correction relates to the dot product of the vectors from \\(C\\).'),
        explanation: text(
            'Spet \\(A=(0,0)\\), \\(B=(7,0)\\), \\(C=(2,4)\\). Vektorja iz \\(C\\) sta \\(\\overrightarrow{CA}=(-2,-4)\\) in \\(\\overrightarrow{CB}=(5,-4)\\); njun skalarni produkt je \\(\\overrightarrow{CA}\\cdot\\overrightarrow{CB}=(-2)\\cdot5+(-4)\\cdot(-4)\\), celo število. Napovej: kako je popravek povezan s tem skalarnim produktom?',
            'Again \\(A=(0,0)\\), \\(B=(7,0)\\), \\(C=(2,4)\\). The vectors from \\(C\\) are \\(\\overrightarrow{CA}=(-2,-4)\\) and \\(\\overrightarrow{CB}=(5,-4)\\); their dot product is \\(\\overrightarrow{CA}\\cdot\\overrightarrow{CB}=(-2)\\cdot5+(-4)\\cdot(-4)\\), an integer. Predict: how is the correction related to this dot product?',
        ),
        formulaIds: [],
        observationPrompt: text('Preberi skalarni produkt in popravek ter ju primerjaj.', 'Read the dot product and the correction and compare them.'),
        expectedObservations: [text(
            'Skalarni produkt je \\(6\\), popravek \\(12\\): popravek je dvakratnik skalarnega produkta. Predznak celoštevilskega skalarnega produkta določa, ali je kot \\(C\\) oster (pozitiven), pravi (\\(0\\)) ali top (negativen); graf tako odloči, ne iz izračunanega kota.',
            'The dot product is \\(6\\), the correction \\(12\\): the correction is twice the dot product. The sign of the integer dot product decides whether the angle \\(C\\) is acute (positive), right (\\(0\\)) or obtuse (negative); the graph decides this way, not from a computed angle.',
        )],
        scene: scene('tr4-dot-scene', {mode: 'sides', ...DEFAULT},
            'Način Stranice in kosinusni izrek; \\(A=(0,0)\\), \\(B=(7,0)\\), \\(C=(2,4)\\); skalarni produkt \\(6\\), popravek \\(12\\).',
            'The mode Sides and the cosine rule; \\(A=(0,0)\\), \\(B=(7,0)\\), \\(C=(2,4)\\); dot product \\(6\\), correction \\(12\\).'),
    }),
    step({
        id: 'tr4-integers', order: 4,
        title: text('Natančna enakost v celih številih', 'An exact equality in integers'),
        purpose: text('Napovedati, ali enakost velja natančno, kadar so oglišča na celoštevilski mreži.', 'Predicting whether the equality holds exactly when the vertices are on the integer grid.'),
        explanation: text(
            'Trikotnik \\(A=(0,0)\\), \\(B=(6,2)\\), \\(C=(1,4)\\) ima vsa oglišča na celoštevilski mreži. Napovej: ali so \\(a^2\\), \\(b^2\\), \\(c^2\\) in skalarni produkt cela števila in ali enakost med \\(c^2\\), \\(a^2+b^2\\) in popravkom velja natančno ali le približno?',
            'The triangle \\(A=(0,0)\\), \\(B=(6,2)\\), \\(C=(1,4)\\) has all its vertices on the integer grid. Predict: are \\(a^2\\), \\(b^2\\), \\(c^2\\) and the dot product integers, and does the equality between \\(c^2\\), \\(a^2+b^2\\) and the correction hold exactly or only approximately?',
        ),
        formulaIds: [],
        observationPrompt: text('Preberi vrstico Kosinusni izrek in skalarni produkt ter preveri račun s svinčnikom.', 'Read the row Cosine rule and the dot product and check the arithmetic by hand.'),
        expectedObservations: [text(
            'Odčitek je \\(40=29+17-6\\) v celih številih: \\(c^2=40\\), \\(a^2=29\\), \\(b^2=17\\), skalarni produkt \\(3\\), popravek \\(6\\). Enakost je natančna, čeprav sta stranici \\(a=\\sqrt{29}\\approx5{,}38516\\) in \\(c=\\sqrt{40}\\approx6{,}32456\\) iracionalni in le približno zapisani.',
            'The readout is \\(40=29+17-6\\) in integers: \\(c^2=40\\), \\(a^2=29\\), \\(b^2=17\\), the dot product \\(3\\), the correction \\(6\\). The equality is exact, although the sides \\(a=\\sqrt{29}\\approx5.38516\\) and \\(c=\\sqrt{40}\\approx6.32456\\) are irrational and written only approximately.',
        )],
        scene: scene('tr4-integers-scene', {mode: 'sides', A: [0, 0], B: [6, 2], C: [1, 4]},
            'Način Stranice in kosinusni izrek; \\(A=(0,0)\\), \\(B=(6,2)\\), \\(C=(1,4)\\); \\(40=29+17-6\\), skalarni produkt \\(3\\).',
            'The mode Sides and the cosine rule; \\(A=(0,0)\\), \\(B=(6,2)\\), \\(C=(1,4)\\); \\(40=29+17-6\\), dot product \\(3\\).'),
    }),
    step({
        id: 'tr4-formula', order: 5,
        title: text('Argument: kosinusni izrek', 'The argument: the cosine rule'),
        purpose: text('Iz razlike vektorjev izpeljati kosinusni izrek.', 'Deriving the cosine rule from the difference of vectors.'),
        explanation: text(
            'Argument za vsak trikotnik. Stranica \\(AB\\) je razlika vektorjev: \\(\\overrightarrow{AB}=\\overrightarrow{CB}-\\overrightarrow{CA}\\). Kvadrat njene dolžine je \\(c^2=a^2+b^2-2\\,\\overrightarrow{CA}\\cdot\\overrightarrow{CB}\\). Skalarni produkt je po definiciji \\(\\overrightarrow{CA}\\cdot\\overrightarrow{CB}=ab\\cos C\\), torej je \\(c^2=a^2+b^2-2ab\\cos C\\). Popravek \\(2ab\\cos C\\) je ničen natanko pri \\(C=90^\\circ\\). Narisana slika je ponazoritev, vektorski račun pa argument.',
            'The argument for every triangle. The side \\(AB\\) is a difference of vectors: \\(\\overrightarrow{AB}=\\overrightarrow{CB}-\\overrightarrow{CA}\\). The square of its length is \\(c^2=a^2+b^2-2\\,\\overrightarrow{CA}\\cdot\\overrightarrow{CB}\\). By definition the dot product is \\(\\overrightarrow{CA}\\cdot\\overrightarrow{CB}=ab\\cos C\\), so \\(c^2=a^2+b^2-2ab\\cos C\\). The correction \\(2ab\\cos C\\) is zero exactly when \\(C=90^\\circ\\). The drawn figure is an illustration, the vector calculation is the argument.',
        ),
        formulaIds: ['cosine-rule', 'dot-identity'],
        workedExampleId: 'tr4-c-from-correction',
        observationPrompt: text('Primerjaj račun z odčitkom Kosinusni izrek in preveri, da se ujemata.', 'Compare the calculation with the readout Cosine rule and check that they agree.'),
        expectedObservations: [text(
            'Odčitek je \\(49=41+20-(12)\\), enako kot račun; stranica \\(c=7\\).',
            'The readout is \\(49=41+20-(12)\\), the same as the calculation; the side \\(c=7\\).',
        )],
        scene: scene('tr4-formula-scene', {mode: 'sides', ...DEFAULT},
            'Način Stranice in kosinusni izrek; \\(A=(0,0)\\), \\(B=(7,0)\\), \\(C=(2,4)\\); \\(49=41+20-12\\).',
            'The mode Sides and the cosine rule; \\(A=(0,0)\\), \\(B=(7,0)\\), \\(C=(2,4)\\); \\(49=41+20-12\\).'),
    }),
    step({
        id: 'tr4-numeric', order: 6,
        title: text('Številski primer', 'A numeric example'),
        purpose: text('Izračunati stranico iz dveh stranic in vmesnega kota ter rezultat primerjati z odčitkom.', 'Computing a side from two sides and the included angle and comparing the result with the readout.'),
        explanation: text(
            'Trikotnik ima stranici \\(a=\\sqrt{13}\\approx3{,}60555\\) in \\(b=5\\) ter kot med njima \\(C\\approx86{,}8202^\\circ\\). S kosinusnim izrekom izračunaj \\(c^2\\) in \\(c\\) (kalkulator) ter napovej, ali bo \\(c\\) celo število.',
            'A triangle has the sides \\(a=\\sqrt{13}\\approx3.60555\\) and \\(b=5\\) and the angle between them \\(C\\approx86.8202^\\circ\\). Use the cosine rule to compute \\(c^2\\) and \\(c\\) (calculator) and predict whether \\(c\\) is an integer.',
        ),
        formulaIds: [],
        observationPrompt: text('Primerjaj svoj rezultat z odčitkoma \\(c\\) in popravek.', 'Compare your result with the readouts of \\(c\\) and the correction.'),
        expectedObservations: [text(
            'Odčitek je \\(c=6\\): \\(c^2=13+25-2=36\\), natančno: popravek \\(2ab\\cos C\\) je \\(2\\), ker je skalarni produkt \\(\\overrightarrow{CA}\\cdot\\overrightarrow{CB}=1\\). Popravek je majhen, ker je kot \\(C\\) blizu \\(90^\\circ\\). Kot \\(C\\approx86{,}8202^\\circ\\) je zaokrožen, \\(a^2\\), \\(b^2\\), popravek in \\(c\\) pa so točni.',
            'The readout is \\(c=6\\): \\(c^2=13+25-2=36\\), exactly: the correction \\(2ab\\cos C\\) is \\(2\\), because the dot product \\(\\overrightarrow{CA}\\cdot\\overrightarrow{CB}\\) is \\(1\\). The correction is small because the angle \\(C\\) is close to \\(90^\\circ\\). The angle \\(C\\approx86.8202^\\circ\\) is rounded, while \\(a^2\\), \\(b^2\\), the correction and \\(c\\) are exact.',
        )],
        scene: scene('tr4-numeric-scene', {mode: 'sides', A: [6, 0], B: [0, 0], C: [2, 3]},
            'Način Stranice in kosinusni izrek; \\(A=(6,0)\\), \\(B=(0,0)\\), \\(C=(2,3)\\); \\(c=6\\), \\(36=13+25-2\\), \\(C\\approx86{,}8202^\\circ\\).',
            'The mode Sides and the cosine rule; \\(A=(6,0)\\), \\(B=(0,0)\\), \\(C=(2,3)\\); \\(c=6\\), \\(36=13+25-2\\), \\(C\\approx86.8202^\\circ\\).'),
    }),
    step({
        id: 'tr4-explore', order: 7,
        title: text('Prosto raziskovanje', 'Free exploration'),
        purpose: text('Samostojno poiskati pravi kot z oglišči na mreži.', 'Finding a right angle with grid vertices on your own.'),
        explanation: text(
            'Premikaj oglišča ali vpisuj koordinate. Opazuj vrstici kvadratov, popravek, skalarni produkt in status. Slika kaže primere, kosinusni izrek pa velja za vsak trikotnik zaradi vektorskega argumenta.',
            'Move the vertices or type coordinates. Watch the two rows of squares, the correction, the dot product and the status. The picture shows examples, while the cosine rule holds for every triangle because of the vector argument.',
        ),
        formulaIds: [],
        observationPrompt: text('Ob \\(A=(0,0)\\) in \\(B=(4,0)\\) poišči vse lege oglišča \\(C\\) na mreži, pri katerih je kot \\(C\\) pravi.', 'With \\(A=(0,0)\\) and \\(B=(4,0)\\) find all positions of the vertex \\(C\\) on the grid at which the angle \\(C\\) is a right angle.'),
        expectedObservations: [text(
            'V poljih za koordinate imata pravi kot pri \\(C\\) le legi \\(C=(2,2)\\) in \\(C=(2,-2)\\): popravek je \\(0\\) in \\(16=8+8\\). Pri \\(C=(1,2)\\) popravek ni \\(0\\) (\\(2\\)).',
            'Within the coordinate fields only the positions \\(C=(2,2)\\) and \\(C=(2,-2)\\) give a right angle at \\(C\\): the correction is \\(0\\) and \\(16=8+8\\). At \\(C=(1,2)\\) the correction is not \\(0\\) (it is \\(2\\)).',
        )],
        scene: scene('tr4-explore-scene', {mode: 'sides', A: [0, 0], B: [4, 0], C: [1, 2]},
            'Način Stranice in kosinusni izrek; \\(A=(0,0)\\), \\(B=(4,0)\\), \\(C=(1,2)\\); popravek \\(2\\), kot pri \\(C\\) je oster.',
            'The mode Sides and the cosine rule; \\(A=(0,0)\\), \\(B=(4,0)\\), \\(C=(1,2)\\); correction \\(2\\), the angle at \\(C\\) is acute.'),
    }),
];

// ---- Lessons -------------------------------------------------------------------------------------------------------------------------

const sources: GuidedLesson['sources'] = [
    {
        id: 'matura-catalogue-trikotnik',
        citation: 'Predmetni izpitni katalog za splošno maturo, matematika (M-MAT-2026): kosinusni in sinusni izrek, polmer očrtanega kroga, povezava med skalarnim produktom in kosinusnim izrekom. Sections as cited in docs/specs/trigonometry-lessons.md from the text extraction of the catalogue.',
        implementationCorrespondence: 'The lessons follow the topic list: the sine rule with the circumcircle and the cosine rule with its vector form; the proofs are the Thales-diameter construction (acute and obtuse angle) and the vector difference stated in the lessons.',
    },
    {
        id: 'bezeg-triangle-solver-implementation',
        citation: 'Bezeg source: src/trig/sineCosineRules.ts, src/trig/trigModel.ts and src/graphs/trig/TriangleSolverGraph.tsx.',
        implementationCorrespondence: 'A scene applies the graph\'s own mode and vertex edits; the text quotes only values of those scenes (probed from the real graph readouts) or plain arithmetic labelled as a calculation.',
    },
];

const tr3: GuidedLesson = {
    demonstrationId: 'triangle-solver',
    title: text('Sinusni izrek in očrtana krožnica', 'The sine rule and the circumcircle'),
    summary: text(
        'V vsakem trikotniku so razmerja \\(a:\\sin A\\), \\(b:\\sin B\\) in \\(c:\\sin C\\) enaka premeru \\(2R\\) očrtane krožnice. Premer iz oglišča \\(B\\) in Talesov izrek dasta argument za ostri kot \\(A\\), dopolnilna obodna kota drugi argument za topi kot \\(A\\).',
        'In every triangle the quotients \\(a:\\sin A\\), \\(b:\\sin B\\) and \\(c:\\sin C\\) equal the diameter \\(2R\\) of the circumcircle. The diameter from the vertex \\(B\\) and the theorem of Thales give an argument for an acute angle \\(A\\), supplementary inscribed angles a second argument for an obtuse angle \\(A\\).',
    ),
    prerequisites: [
        text('Lekcija o enotski krožnici, sinusu in kosinusu.', 'The lesson on the unit circle, sine and cosine.'),
        text('Lekcija Obodni kot in Talesov izrek ter očrtana krožnica trikotnika iz lekcije o znamenitih točkah.', 'The lesson The inscribed angle and Thales\' theorem and the circumcircle of a triangle from the lesson on notable points.'),
    ],
    learningGoals: [
        text('Preveriš, da so razmerja stranice in sinusa nasprotnega kota v vsakem prikazanem trikotniku enaka, njihova skupna vrednost pa se spreminja.', 'Check that the quotients of a side and the sine of the opposite angle are equal in every triangle shown while their common value changes.'),
        text('Poveš skupno vrednost kot premer \\(2R\\) očrtane krožnice.', 'Say the common value as the diameter \\(2R\\) of the circumcircle.'),
        text('Utemeljiš \\(a=2R\\sin A\\) s premerom iz oglišča \\(B\\), za ostri in za topi kot \\(A\\).', 'Justify \\(a=2R\\sin A\\) with the diameter from the vertex \\(B\\), for an acute and for an obtuse angle \\(A\\).'),
    ],
    formulaBlocks: tr3Formulas,
    workedExamples: tr3Examples,
    steps: tr3Steps,
    sources,
    edgeCases: [
        text('Pri pravem kotu \\(A\\) je \\(A′=C\\) in pomožnega trikotnika ni: graf napiše, da je \\(BC\\) premer in \\(a=2R\\).', 'With a right angle \\(A\\) we have \\(A′=C\\) and there is no auxiliary triangle: the graph says that \\(BC\\) is a diameter and \\(a=2R\\).'),
        text('Pri treh ogliščih na isti premici ni trikotnika ne očrtane krožnice: graf izpiše status in nobenega razmerja.', 'Three vertices on one line give no triangle and no circumcircle: the graph shows a status and no quotient.'),
        text('Razmerja so zaokrožena in označena z \\(\\approx\\); \\(R^2\\), središče in \\(A′\\) so natančni ulomki.', 'The quotients are rounded and marked \\(\\approx\\); \\(R^2\\), the centre and \\(A′\\) are exact fractions.'),
    ],
    unresolvedQuestions: [],
};

const tr4: GuidedLesson = {
    demonstrationId: 'triangle-solver',
    title: text('Kosinusni izrek', 'The cosine rule'),
    summary: text(
        'Kosinusni izrek \\(c^2=a^2+b^2-2ab\\cos C\\) je Pitagorov izrek s popravkom, ki je ničen natanko pri \\(C=90^\\circ\\). Predznak popravka, to je predznak skalarnega produkta, loči ostri kot od topega.',
        'The cosine rule \\(c^2=a^2+b^2-2ab\\cos C\\) is the theorem of Pythagoras with a correction that is zero exactly when \\(C=90^\\circ\\). The sign of the correction, which is the sign of the dot product, tells an acute angle from an obtuse one.',
    ),
    prerequisites: [
        text('Lekcija o sinusnem izreku in očrtani krožnici (odčitki stranic).', 'The lesson on the sine rule and the circumcircle (the side readouts).'),
        text('Skalarni produkt vektorjev in Pitagorov izrek.', 'The dot product of vectors and the theorem of Pythagoras.'),
    ],
    learningGoals: [
        text('Prebereš popravek kot razliko med \\(a^2+b^2\\) in \\(c^2\\) in ugotoviš, kdaj je ničen.', 'Read the correction as the difference of \\(a^2+b^2\\) and \\(c^2\\) and find when it is zero.'),
        text('Poveš popravek kot dvakratnik skalarnega produkta in iz njegovega predznaka določiš vrsto kota \\(C\\).', 'State the correction as twice the dot product and determine the kind of the angle \\(C\\) from its sign.'),
        text('Izpelješ kosinusni izrek iz razlike vektorjev in ga uporabiš v številskem primeru.', 'Derive the cosine rule from a difference of vectors and use it in a numeric example.'),
    ],
    formulaBlocks: tr4Formulas,
    workedExamples: tr4Examples,
    steps: tr4Steps,
    sources,
    edgeCases: [
        text('Vrsta kota \\(C\\) je predznak celoštevilskega skalarnega produkta, ne izračunanega kota; pravi kot graf zato nikoli ne trdi iz decimalnega števila.', 'The kind of the angle \\(C\\) is the sign of the integer dot product, not of a computed angle; so the graph never claims a right angle from a decimal number.'),
        text('Pri sploščenem trikotniku (oglišča na premici) graf izpiše status in nobenega popravka.', 'For a flat triangle (vertices on a line) the graph shows a status and no correction.'),
        text('Računi z zaokroženimi števili so približni; enakost v celih številih je natančna.', 'Calculations with rounded numbers are approximate; the equality in integers is exact.'),
    ],
    unresolvedQuestions: [],
};

export const sineRuleLesson: GuidedLesson = tr3;
export const cosineRuleLesson: GuidedLesson = tr4;
