/**
 * Guided lessons of the circle-geometry family, batch A (docs/specs/circle-geometry-lessons.md): CG1, tangents from a point, and CG2, the radical axis
 * and the radical centre, both on `circle-construction` (CircleConstructionGraph). Each is the lesson of one section of the circle-geometry chapter
 * (circleGeometryChapterRegistry.ts adapts them on request; the lesson catalog itself holds none, as it keeps one lesson per Demonstration). Scenes use only
 * the `circle` actions CircleConstructionGraph registers (`set-mode`, `set-circle`, `set-point`) and every scene starts from the Demonstration default
 * and names the mode, the circles and the point it states. The radical mode always draws three circles; CG2 steps 1 to 5 keep the third at its default
 * place and the text names it as waiting for step 6. Every number the text quotes is either a readout of the graph for that scene (power, tangent length,
 * points of contact, chord, Thales circle, axes, radical centre and its power) or plain arithmetic shown in the same step; the numbers are listed per step in
 * docs/reviews/feature-streams/families-prep/notes/f3-circle-a.md.
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

/** A circle by centre and radius: a grid point and a multiple of 1/4. */
export type CircleSceneCircle = readonly [x: number, y: number, r: number];
export type CircleScenePoint = readonly [x: number, y: number];

/** What a scene sets: the mode, the circles it names and the point P; everything else is the mode's example. */
export interface CircleSceneSpec {
    readonly mode: 'tangents' | 'radical';
    readonly c1: CircleSceneCircle;
    readonly c2?: CircleSceneCircle;
    readonly c3?: CircleSceneCircle;
    readonly p: CircleScenePoint;
}

/** The actions of a scene: the Demonstration default, then the mode (which loads its example) and the circles and P the spec names. */
export const circleSceneActions = (id: string, spec: CircleSceneSpec): LessonAction[] => {
    const circles: LessonAction[] = [];
    if (spec.c1) circles.push({kind: 'circle', operation: 'set-circle', circle: 'c1', x: spec.c1[0], y: spec.c1[1], r: spec.c1[2]});
    if (spec.c2) circles.push({kind: 'circle', operation: 'set-circle', circle: 'c2', x: spec.c2[0], y: spec.c2[1], r: spec.c2[2]});
    if (spec.c3) circles.push({kind: 'circle', operation: 'set-circle', circle: 'c3', x: spec.c3[0], y: spec.c3[1], r: spec.c3[2]});
    return [
        {kind: 'prepared-scene', sceneId: id, source: 'demonstration-default'},
        {kind: 'circle', operation: 'set-mode', mode: spec.mode},
        ...circles,
        {kind: 'circle', operation: 'set-point', x: spec.p[0], y: spec.p[1]},
    ];
};

const scene = (id: string, spec: CircleSceneSpec, sl: string, en: string): LessonScene =>
    ({id, basedOn: 'demonstration-default', actions: circleSceneActions(id, spec), expectedState: text(sl, en)});

const O: CircleSceneCircle = [0, 0, 5];
const C2: CircleSceneCircle = [6, 0, 3];
const C3: CircleSceneCircle = [3, 6, 2];

// ---- CG1 -------------------------------------------------------------------------------------------------------------------------

const cg1Formulas: readonly FormulaBlock[] = [
    {
        id: 'power-of-point',
        latex: 'p(P)=|PO|^2-\\rho^2',
        notation: text(
            '\\(O\\) je središče in \\(\\rho\\) polmer krožnice, \\(P\\) poljubna točka ravnine, \\(p(P)\\) potenca točke \\(P\\) na krožnico.',
            '\\(O\\) is the centre and \\(\\rho\\) the radius of the circle, \\(P\\) is any point of the plane and \\(p(P)\\) is the power of \\(P\\) with respect to the circle.',
        ),
        explanation: text(
            'Definicija: potenca točke na krožnico je \\(|PO|^2-\\rho^2\\). Je negativna v notranjosti, \\(0\\) na krožnici in pozitivna zunaj nje. Zato predznak potence natančno odloči, koliko tangent gre skozi \\(P\\). Potenca je podrobneje v lekciji Potenca točke in inverzija.',
            'Definition: the power of a point with respect to a circle is \\(|PO|^2-\\rho^2\\). It is negative inside, \\(0\\) on the circle and positive outside. So the sign of the power decides exactly how many tangents pass through \\(P\\). The power is treated in more detail in the lesson Power of a point and inversion.',
        ),
    },
    {
        id: 'thales-contact',
        latex: '(T-O)\\cdot(T-P)=0',
        notation: text(
            '\\(T\\) je točka dotika, \\(O\\) središče krožnice, \\(P\\) zunanja točka; pika je skalarni produkt vektorjev.',
            '\\(T\\) is a point of contact, \\(O\\) the centre of the circle and \\(P\\) the outer point; the dot is the dot product of vectors.',
        ),
        explanation: text(
            'Izrek: točka \\(T\\) krožnice je točka dotika tangente iz \\(P\\) natanko tedaj, ko je kot \\(OTP\\) pravi, to je \\((T-O)\\cdot(T-P)=0\\). Tangenta je namreč pravokotna na polmer \\(OT\\) v točki \\(T\\). Pravi kot nad premerom \\(OP\\) pa pomeni, da \\(T\\) leži na Talesovi krožnici nad \\(OP\\).',
            'Theorem: a point \\(T\\) of the circle is a point of contact of a tangent from \\(P\\) exactly when the angle \\(OTP\\) is right, that is \\((T-O)\\cdot(T-P)=0\\). A tangent is perpendicular to the radius \\(OT\\) at \\(T\\). A right angle over the diameter \\(OP\\) means that \\(T\\) lies on the Thales circle over \\(OP\\).',
        ),
    },
    {
        id: 'tangent-length',
        latex: '|PT|^2=|PO|^2-\\rho^2=p(P)',
        notation: text(
            '\\(|PT|\\) je dolžina tangentnega odseka od \\(P\\) do točke dotika \\(T\\).',
            '\\(|PT|\\) is the length of the tangent segment from \\(P\\) to the point of contact \\(T\\).',
        ),
        explanation: text(
            'Posledica Pitagorovega izreka v pravokotnem trikotniku \\(OTP\\) z desnim kotom pri \\(T\\), katetama \\(|OT|=\\rho\\) in \\(|PT|\\) ter hipotenuzo \\(|PO|\\). Zato je kvadrat dolžine tangente enak potenci točke, obe tangenti iz \\(P\\) pa sta enako dolgi.',
            'A corollary of the Pythagorean theorem in the right triangle \\(OTP\\) with the right angle at \\(T\\), legs \\(|OT|=\\rho\\) and \\(|PT|\\) and hypotenuse \\(|PO|\\). So the square of the tangent length equals the power, and the two tangents from \\(P\\) are equally long.',
        ),
    },
];

const cg1Examples: readonly WorkedExample[] = [
    {
        id: 'cg1-lengths',
        title: text('Dolžina tangente iz \\(P=(13,0)\\) na krožnico s polmerom \\(5\\)', 'The tangent length from \\(P=(13,0)\\) to the circle of radius \\(5\\)'),
        calculationLatex: '|PO|^2=13^2+0^2=169,\\ \\ \\rho^2=25',
        resultLatex: '|PT|^2=169-25=144\\ \\Longrightarrow\\ |PT|=12',
        check: text(
            'Potenca je \\(144\\), zato je dolžina tangente \\(\\sqrt{144}=12\\). Preverek s pravim kotom: za \\(T_1=(\\tfrac{25}{13},\\tfrac{60}{13})\\) je \\(T_1-O=(\\tfrac{25}{13},\\tfrac{60}{13})\\) in \\(T_1-P=(-\\tfrac{144}{13},\\tfrac{60}{13})\\), skalarni produkt pa \\(\\tfrac{-3600+3600}{169}=0\\).',
            'The power is \\(144\\), so the tangent length is \\(\\sqrt{144}=12\\). Check with the right angle: for \\(T_1=(\\tfrac{25}{13},\\tfrac{60}{13})\\) we have \\(T_1-O=(\\tfrac{25}{13},\\tfrac{60}{13})\\) and \\(T_1-P=(-\\tfrac{144}{13},\\tfrac{60}{13})\\), and the dot product is \\(\\tfrac{-3600+3600}{169}=0\\).',
        ),
    },
];

const cg1Steps: readonly GuidedLessonStep[] = [
    step({
        id: 'cg1-predict', order: 1,
        title: text('Napoved števila tangent', 'Predicting the number of tangents'),
        purpose: text('Napovedati, koliko tangent gre skozi točko glede na njeno lego, preden to odčitamo.', 'Predicting how many tangents pass through a point depending on its position, before reading it.'),
        explanation: text(
            'Krožnica ima središče \\(O=(0,0)\\) in polmer \\(\\rho=5\\), točka \\(P\\) je v \\((13,0)\\). Tangenta je premica, ki ima s krožnico natanko eno skupno točko, to je točko dotika. Preden premakneš \\(P\\), napovej, koliko tangent gre skozi \\(P\\), kadar je \\(P\\) zunaj krožnice, na njej in v njeni notranjosti.',
            'The circle has centre \\(O=(0,0)\\) and radius \\(\\rho=5\\), and the point \\(P\\) is at \\((13,0)\\). A tangent is a line with exactly one common point with the circle, the point of contact. Before you move \\(P\\), predict how many tangents pass through \\(P\\) when \\(P\\) is outside the circle, on it and inside it.',
        ),
        formulaIds: [],
        observationPrompt: text('Zapiši tri napovedi, nato preberi stanje in število tangent v odčitku.', 'Write down three predictions, then read the status and the number of tangents in the readout.'),
        expectedObservations: [text('Pri \\(P=(13,0)\\) odčitek pove, da sta tangenti dve, potenca točke pa je \\(144\\).', 'At \\(P=(13,0)\\) the readout says there are two tangents and the power of the point is \\(144\\).')],
        scene: scene('cg1-predict-scene', {mode: 'tangents', c1: O, p: [13, 0]},
            'Krožnica s središčem \\((0,0)\\) in polmerom \\(5\\), točka \\(P=(13,0)\\); potenca je \\(144\\), tangenti sta dve.',
            'The circle with centre \\((0,0)\\) and radius \\(5\\), the point \\(P=(13,0)\\); the power is \\(144\\), there are two tangents.'),
    }),
    step({
        id: 'cg1-count', order: 2,
        title: text('Premakni točko \\(P\\) čez krožnico', 'Move \\(P\\) across the circle'),
        purpose: text('Videti, da predznak potence natančno loči med nobeno, eno in dvema tangentama.', 'Seeing that the sign of the power separates exactly between no, one and two tangents.'),
        explanation: text(
            'Premakni \\(P\\) v \\((3,0)\\): potenca je \\(3^2-25=-16\\), v notranjosti, zato tangent ni. Pri \\(P=(5,0)\\) je potenca \\(0\\): \\(P\\) je na krožnici, tangenta je ena, \\(x=5\\), in točka dotika je kar \\(P\\). Pri \\(P=(13,0)\\) je potenca \\(144>0\\) in tangenti sta dve. Odločitev je predznak natančno izračunane potence, ne videz slike. Skozi točko v notranjosti je vsaka premica sekanta, skozi točko na krožnici je vsaka premica razen tangente sekanta z drugim presečiščem na krožnici.',
            'Move \\(P\\) to \\((3,0)\\): the power is \\(3^2-25=-16\\), inside, so there is no tangent. At \\(P=(5,0)\\) the power is \\(0\\): \\(P\\) is on the circle, there is one tangent, \\(x=5\\), and its point of contact is \\(P\\) itself. At \\(P=(13,0)\\) the power is \\(144>0\\) and there are two tangents. The decision is the sign of the exactly computed power, not how the picture looks. Through a point inside every line is a secant; through a point on the circle every line except the tangent is a secant with a second point on the circle.',
        ),
        formulaIds: ['power-of-point'],
        observationPrompt: text('Povleci \\(P\\) čez krožnico in opazuj vrstici moči in števila tangent.', 'Drag \\(P\\) across the circle and watch the rows for the power and the number of tangents.'),
        expectedObservations: [text('Pri \\(P=(3,0)\\) je potenca \\(-16\\) in tangent ni; pri \\(P=(5,0)\\) je potenca \\(0\\) in tangenta je ena.', 'At \\(P=(3,0)\\) the power is \\(-16\\) and there is no tangent; at \\(P=(5,0)\\) the power is \\(0\\) and there is one tangent.')],
        scene: scene('cg1-count-scene', {mode: 'tangents', c1: O, p: [3, 0]},
            'Točka \\(P=(3,0)\\) je v notranjosti, potenca je \\(-16\\), tangent ni.',
            'The point \\(P=(3,0)\\) is inside, the power is \\(-16\\), there is no tangent.'),
    }),
    step({
        id: 'cg1-thales', order: 3,
        title: text('Krožnica nad premerom \\(OP\\)', 'The circle on the diameter \\(OP\\)'),
        purpose: text('Narisati Talesovo krožnico nad \\(OP\\) in videti, da seka dano krožnico v dveh točkah.', 'Drawing the Thales circle over \\(OP\\) and seeing that it meets the given circle in two points.'),
        explanation: text(
            'Za zunanjo točko \\(P=(13,0)\\) narišemo krožnico, ki ima \\(OP\\) za premer: njeno središče je razpolovišče \\((\\tfrac{13}{2},0)\\), kvadrat polmera pa \\(\\tfrac{169}{4}\\). Ta krožnica seka dano krožnico v dveh točkah \\(T_1\\) in \\(T_2\\); na odčitku sta približno \\((1{,}9231;\\ 4{,}6154)\\) in \\((1{,}9231;\\ -4{,}6154)\\), obe na tetivi dotikališč \\(13x=25\\). Zakaj sta to točki dotika, pokaže naslednji korak.',
            'For the outer point \\(P=(13,0)\\) we draw the circle that has \\(OP\\) as a diameter: its centre is the midpoint \\((\\tfrac{13}{2},0)\\) and its squared radius is \\(\\tfrac{169}{4}\\). This circle meets the given circle in two points \\(T_1\\) and \\(T_2\\); in the readout they are approximately \\((1.9231,\\ 4.6154)\\) and \\((1.9231,\\ -4.6154)\\), both on the chord of contact \\(13x=25\\). The next step shows why these are the points of contact.',
        ),
        formulaIds: [],
        observationPrompt: text('Poišči v odčitku Talesovo krožnico, obe točki dotika in tetivo dotikališč.', 'Find the Thales circle, both points of contact and the chord of contact in the readout.'),
        expectedObservations: [text('Talesova krožnica ima središče \\((\\tfrac{13}{2},0)\\) in kvadrat polmera \\(\\tfrac{169}{4}=42{,}25\\); tetiva dotikališč je \\(13x=25\\).', 'The Thales circle has centre \\((\\tfrac{13}{2},0)\\) and squared radius \\(\\tfrac{169}{4}=42.25\\); the chord of contact is \\(13x=25\\).')],
        scene: scene('cg1-thales-scene', {mode: 'tangents', c1: O, p: [13, 0]},
            'Točka \\(P=(13,0)\\); Talesova krožnica ima središče \\((\\tfrac{13}{2},0)\\), kvadrat polmera \\(\\tfrac{169}{4}\\); točki dotika \\((1{,}9231;\\ \\pm4{,}6154)\\), tetiva \\(13x=25\\).',
            'The point \\(P=(13,0)\\); the Thales circle has centre \\((\\tfrac{13}{2},0)\\) and squared radius \\(\\tfrac{169}{4}\\); the points of contact \\((1.9231,\\ \\pm4.6154)\\), the chord \\(13x=25\\).'),
    }),
    step({
        id: 'cg1-right-angle', order: 4,
        title: text('Pravi kot pri dotikališču', 'The right angle at the point of contact'),
        purpose: text('Utemeljiti, da sta premici \\(PT_1\\) in \\(PT_2\\) res tangenti.', 'Arguing that the lines \\(PT_1\\) and \\(PT_2\\) really are tangents.'),
        explanation: text(
            'Argument: točka \\(T\\) je na Talesovi krožnici nad \\(OP\\), zato je po Talesovem izreku kot \\(OTP\\) pravi (lekcija o obodnem kotu in Talesovem izreku). Torej je \\(PT\\perp OT\\). Ker je \\(T\\) tudi na dani krožnici, je \\(OT\\) polmer, premica skozi \\(T\\) pravokotno na polmer pa je tangenta. Isto pove račun \\((T-O)\\cdot(T-P)=0\\). Premica skozi \\(P\\) in katero koli drugo točko krožnice je sekanta. Premikanje točke \\(P\\) je ponazoritev, utemeljitev je pravi kot.',
            'Argument: the point \\(T\\) is on the Thales circle over \\(OP\\), so by Thales\' theorem the angle \\(OTP\\) is right (the lesson on the inscribed angle and Thales\' theorem). So \\(PT\\perp OT\\). Since \\(T\\) is also on the given circle, \\(OT\\) is a radius, and a line through \\(T\\) perpendicular to the radius is a tangent. The computation \\((T-O)\\cdot(T-P)=0\\) says the same. The line through \\(P\\) and any other point of the circle is a secant. Moving \\(P\\) is an illustration; the argument is the right angle.',
        ),
        formulaIds: ['thales-contact'],
        observationPrompt: text('Preveri, da so točke dotika res na obeh krožnicah, in poišči pravi kot pri njiju.', 'Check that the points of contact are on both circles, and find the right angle at them.'),
        expectedObservations: [text('Točki \\(T_1\\) in \\(T_2\\) sta na obeh krožnicah; za \\(T_1\\) je \\((T_1-O)\\cdot(T_1-P)=0\\).', 'The points \\(T_1\\) and \\(T_2\\) are on both circles; for \\(T_1\\) we have \\((T_1-O)\\cdot(T_1-P)=0\\).')],
        scene: scene('cg1-right-angle-scene', {mode: 'tangents', c1: O, p: [13, 0]},
            'Točka \\(P=(13,0)\\); obe tangenti in obe dotikališči, \\(T_{1,2}=(1{,}9231;\\ \\pm4{,}6154)\\).',
            'The point \\(P=(13,0)\\); both tangents and both points of contact, \\(T_{1,2}=(1.9231,\\ \\pm4.6154)\\).'),
    }),
    step({
        id: 'cg1-lengths', order: 5,
        title: text('Enaki tangentni odseka', 'Equal tangent segments'),
        purpose: text('Izračunati dolžino tangente in videti, da sta oba tangentna odseka enako dolga.', 'Computing the tangent length and seeing that both tangent segments are equally long.'),
        explanation: text(
            'Argument: trikotnika \\(OT_1P\\) in \\(OT_2P\\) imata pravi kot pri \\(T_1\\) oziroma \\(T_2\\), skupno hipotenuzo \\(OP\\) in kateto \\(\\rho=5\\). Po Pitagorovem izreku je \\(|PT_1|^2=|PT_2|^2=|PO|^2-\\rho^2=169-25=144\\), zato sta odseka \\(PT_1\\) in \\(PT_2\\) dolga \\(12\\). To je ravno potenca točke \\(P\\), ki jo odčitek pokaže kot \\(144\\), dolžina tangente pa kot \\(12\\).',
            'Argument: the triangles \\(OT_1P\\) and \\(OT_2P\\) have a right angle at \\(T_1\\) and \\(T_2\\), the common hypotenuse \\(OP\\) and a leg \\(\\rho=5\\). By the Pythagorean theorem \\(|PT_1|^2=|PT_2|^2=|PO|^2-\\rho^2=169-25=144\\), so the segments \\(PT_1\\) and \\(PT_2\\) are \\(12\\) long. This is exactly the power of the point \\(P\\), which the readout shows as \\(144\\), and the tangent length as \\(12\\).',
        ),
        formulaIds: ['tangent-length'],
        workedExampleId: 'cg1-lengths',
        observationPrompt: text('Preberi potenco in dolžino tangente ter preveri, da je kvadrat dolžine enak potenci.', 'Read the power and the tangent length and check that the square of the length equals the power.'),
        expectedObservations: [text('Potenca je \\(144\\), dolžina tangente \\(12\\) in \\(12^2=144\\).', 'The power is \\(144\\), the tangent length is \\(12\\) and \\(12^2=144\\).')],
        scene: scene('cg1-lengths-scene', {mode: 'tangents', c1: O, p: [13, 0]},
            'Točka \\(P=(13,0)\\); potenca \\(144\\), dolžina tangente \\(12\\), tetiva dotikališč \\(13x=25\\).',
            'The point \\(P=(13,0)\\); the power \\(144\\), the tangent length \\(12\\), the chord of contact \\(13x=25\\).'),
    }),
    step({
        id: 'cg1-explore', order: 6,
        title: text('Prosto raziskovanje', 'Free exploration'),
        purpose: text('Spreminjati krožnico in točko ter preizkusiti vse tri lege.', 'Changing the circle and the point and trying all three positions.'),
        explanation: text(
            'Spreminjaj središče, polmer in točko \\(P\\). Poišči lego, pri kateri je potenca \\(0\\), in lego z majhno pozitivno potenco, kjer sta dotikališči blizu skupaj. Če je \\(P=O\\), tangente ni: graf to pove v stanju. Polmer mora biti pozitiven. Potenca točke in sekante so v lekciji Potenca točke in inverzija v poglavju Geometrija trikotnika in inverzija. Vse, kar pokaže slika, je ponazoritev ene lege; velja le izrek in utemeljitev iz prejšnjih korakov.',
            'Change the centre, the radius and the point \\(P\\). Find a position where the power is \\(0\\), and one with a small positive power where the points of contact are close together. If \\(P=O\\) there is no tangent: the graph says so in the status. The radius must be positive. The power of a point and secants are in the lesson Power of a point and inversion in the chapter Triangle geometry and inversion. What the picture shows is an illustration of one position; only the theorem and the arguments of the previous steps hold.',
        ),
        formulaIds: [],
        observationPrompt: text('Poišči lego z eno tangento in lego brez tangente ter prebereš potenco v obeh.', 'Find a position with one tangent and one with none, and read the power in both.'),
        expectedObservations: [text('Število tangent je \\(2\\), \\(1\\) ali \\(0\\), glede na to, ali je potenca pozitivna, \\(0\\) ali negativna.', 'The number of tangents is \\(2\\), \\(1\\) or \\(0\\), depending on whether the power is positive, \\(0\\) or negative.')],
        scene: scene('cg1-explore-scene', {mode: 'tangents', c1: O, p: [13, 0]},
            'Začetni primer: krožnica s središčem \\((0,0)\\) in polmerom \\(5\\), točka \\(P=(13,0)\\).',
            'The starting case: the circle with centre \\((0,0)\\) and radius \\(5\\), the point \\(P=(13,0)\\).'),
    }),
];

// ---- CG2 -------------------------------------------------------------------------------------------------------------------------

const cg2Formulas: readonly FormulaBlock[] = [
    {
        id: 'equal-power',
        latex: '|X-O_1|^2-\\rho_1^2=|X-O_2|^2-\\rho_2^2',
        notation: text(
            '\\(O_1\\), \\(\\rho_1\\) in \\(O_2\\), \\(\\rho_2\\) so središči in polmera krožnic \\(c_1\\) in \\(c_2\\); \\(X\\) je poljubna točka ravnine.',
            '\\(O_1\\), \\(\\rho_1\\) and \\(O_2\\), \\(\\rho_2\\) are the centres and radii of the circles \\(c_1\\) and \\(c_2\\); \\(X\\) is any point of the plane.',
        ),
        explanation: text(
            'Definicija: točka \\(X\\) ima enako potenco na obe krožnici, kadar velja ta enačba. Potenca je \\(|XO|^2-\\rho^2\\), negativna v notranjosti krožnice.',
            'Definition: a point \\(X\\) has equal power with respect to both circles when this equation holds. The power is \\(|XO|^2-\\rho^2\\), negative inside the circle.',
        ),
    },
    {
        id: 'radical-axis',
        latex: '2(O_2-O_1)\\cdot X=|O_2|^2-|O_1|^2-\\rho_2^2+\\rho_1^2',
        notation: text(
            'Pika je skalarni produkt; enačba je linearna v \\(X\\), kadar je \\(O_1\\ne O_2\\).',
            'The dot is the dot product; the equation is linear in \\(X\\) when \\(O_1\\ne O_2\\).',
        ),
        explanation: text(
            'Izrek: množica točk z enako potenco na dve krožnici z različnima središčema je premica, potenčna premica, pravokotna na zveznico središč \\(O_1O_2\\). Utemeljitev: ko razvijemo \\(|X-O_i|^2=|X|^2-2O_i\\cdot X+|O_i|^2\\), se kvadrata \\(|X|^2\\) v enačbi odštejeta in ostane enačba, linearna v \\(X\\). Njen normalni vektor je \\(O_2-O_1\\).',
            'Theorem: the set of points with equal power with respect to two circles with different centres is a line, the radical axis, perpendicular to the line of centres \\(O_1O_2\\). Argument: expanding \\(|X-O_i|^2=|X|^2-2O_i\\cdot X+|O_i|^2\\), the squares \\(|X|^2\\) cancel in the equation and an equation linear in \\(X\\) remains. Its normal vector is \\(O_2-O_1\\).',
        ),
    },
];

const cg2Examples: readonly WorkedExample[] = [
    {
        id: 'cg2-axis',
        title: text('Potenčna premica krožnic \\(c_1\\) in \\(c_2\\)', 'The radical axis of the circles \\(c_1\\) and \\(c_2\\)'),
        calculationLatex: '2\\,(6,0)\\cdot X=6^2-0-3^2+5^2',
        resultLatex: '12x=52\\ \\Longrightarrow\\ x=\\frac{13}{3}',
        check: text(
            'Za \\(c_1\\) s središčem \\((0,0)\\) in polmerom \\(5\\) ter \\(c_2\\) s središčem \\((6,0)\\) in polmerom \\(3\\) je desna stran \\(36-9+25=52\\) in leva \\(12x\\). Premica \\(x=\\tfrac{13}{3}\\) je pravokotna na zveznico središč, ki je vodoravna. Preverek: v točki \\((\\tfrac{13}{3},y)\\) sta obe potenci enaki \\(y^2-\\tfrac{56}{9}\\).',
            'For \\(c_1\\) with centre \\((0,0)\\) and radius \\(5\\) and \\(c_2\\) with centre \\((6,0)\\) and radius \\(3\\), the right side is \\(36-9+25=52\\) and the left side \\(12x\\). The line \\(x=\\tfrac{13}{3}\\) is perpendicular to the line of centres, which is horizontal. Check: at the point \\((\\tfrac{13}{3},y)\\) both powers equal \\(y^2-\\tfrac{56}{9}\\).',
        ),
    },
];

const cg2Steps: readonly GuidedLessonStep[] = [
    step({
        id: 'cg2-predict', order: 1,
        title: text('Napoved točk z enako potenco', 'Predicting the points of equal power'),
        purpose: text('Napovedati, kje v ravnini je potenca na dve krožnici enaka, preden to izračunamo.', 'Predicting where in the plane the power with respect to two circles is equal, before computing it.'),
        explanation: text(
            'Krožnica \\(c_1\\) ima središče \\((0,0)\\) in polmer \\(5\\), krožnica \\(c_2\\) središče \\((6,0)\\) in polmer \\(3\\). Potenca točke na krožnico je \\(|XO|^2-\\rho^2\\), negativna v notranjosti. Tretja krožnica \\(c_3\\) (središče \\((3,6)\\), polmer \\(2\\)) je že narisana, ker graf vedno riše tri krožnice; počaka do šestega koraka, zato jo zaenkrat prezri. Napovej, katere točke ravnine imajo enako potenco na \\(c_1\\) in \\(c_2\\): ena točka, premica, krožnica ali kaj drugega?',
            'The circle \\(c_1\\) has centre \\((0,0)\\) and radius \\(5\\), and the circle \\(c_2\\) has centre \\((6,0)\\) and radius \\(3\\). The power of a point with respect to a circle is \\(|XO|^2-\\rho^2\\), negative inside. The third circle \\(c_3\\) (centre \\((3,6)\\), radius \\(2\\)) is already drawn because the graph always draws three circles; it waits for step 6, so ignore it for now. Predict which points of the plane have equal power with respect to \\(c_1\\) and \\(c_2\\): one point, a line, a circle or something else?',
        ),
        formulaIds: ['equal-power'],
        observationPrompt: text('Zapiši napoved in oglej si moči točke \\(P=(4,2)\\) v odčitku.', 'Write down your prediction and look at the powers of the point \\(P=(4,2)\\) in the readout.'),
        expectedObservations: [text('Točka \\(P=(4,2)\\) ima potenci \\(-5\\) na \\(c_1\\) in \\(-1\\) na \\(c_2\\); različni sta, zato \\(P\\) ni na potenčni premici.', 'The point \\(P=(4,2)\\) has the powers \\(-5\\) with respect to \\(c_1\\) and \\(-1\\) with respect to \\(c_2\\); they differ, so \\(P\\) is not on the radical axis.')],
        scene: scene('cg2-predict-scene', {mode: 'radical', c1: O, c2: C2, c3: C3, p: [4, 2]},
            'Krožnici \\(c_1\\) in \\(c_2\\) ter točka \\(P=(4,2)\\) s potencama \\(-5\\) in \\(-1\\); tretja krožnica čaka na šesti korak.',
            'The circles \\(c_1\\) and \\(c_2\\) and the point \\(P=(4,2)\\) with the powers \\(-5\\) and \\(-1\\); the third circle waits for step 6.'),
    }),
    step({
        id: 'cg2-probe', order: 2,
        title: text('Premakni točko \\(P\\)', 'Move the point \\(P\\)'),
        purpose: text('Primerjati obe potenci in videti, kje se razlika spremeni iz negativne v pozitivno.', 'Comparing both powers and seeing where the difference changes from negative to positive.'),
        explanation: text(
            'Pri \\(P=(4,2)\\) sta potenci \\(-5\\) in \\(-1\\), prva je manjša. Premakni \\(P\\) v \\((5,2)\\): potenci sta \\(4\\) in \\(-4\\), zdaj je prva večja. Razlika med potencama se je med \\(x=4\\) in \\(x=5\\) spremenila iz negativne v pozitivno, zato je nekje vmes enaka \\(0\\). To je ponazoritev na eni vodoravni črti; na mreži ni točke z enako potenco, zato je odčitek »Točka P na potenčni premici krožnic 1 in 2« tu vedno »ne«.',
            'At \\(P=(4,2)\\) the powers are \\(-5\\) and \\(-1\\), the first is smaller. Move \\(P\\) to \\((5,2)\\): the powers are \\(4\\) and \\(-4\\), now the first is larger. The difference of the powers changed from negative to positive between \\(x=4\\) and \\(x=5\\), so somewhere in between it is \\(0\\). This is an illustration on one horizontal line; there is no grid point of equal power, so the readout "P on the radical axis of circles 1 and 2" always says "no" here.',
        ),
        formulaIds: [],
        observationPrompt: text('Premikaj \\(P\\) po mreži in opazuj, kje se razlika potenc zamenja predznak.', 'Move \\(P\\) along the grid and watch where the difference of the powers changes sign.'),
        expectedObservations: [text('Pri \\(P=(5,2)\\) sta potenci \\(4\\) in \\(-4\\).', 'At \\(P=(5,2)\\) the powers are \\(4\\) and \\(-4\\).')],
        scene: scene('cg2-probe-scene', {mode: 'radical', c1: O, c2: C2, c3: C3, p: [5, 2]},
            'Točka \\(P=(5,2)\\) ima potenci \\(4\\) na \\(c_1\\) in \\(-4\\) na \\(c_2\\).',
            'The point \\(P=(5,2)\\) has the powers \\(4\\) with respect to \\(c_1\\) and \\(-4\\) with respect to \\(c_2\\).'),
    }),
    step({
        id: 'cg2-line', order: 3,
        title: text('Točke enake potence ležijo na premici', 'Points of equal power lie on a line'),
        purpose: text('Utemeljiti, da je množica točk z enako potenco premica pravokotna na zveznico središč.', 'Arguing that the set of points of equal power is a line perpendicular to the line of centres.'),
        explanation: text(
            'Argument: v enačbi \\(|X-O_1|^2-\\rho_1^2=|X-O_2|^2-\\rho_2^2\\) se člena \\(|X|^2\\) odštejeta, ostane \\(2(O_2-O_1)\\cdot X=|O_2|^2-|O_1|^2-\\rho_2^2+\\rho_1^2\\), enačba, linearna v \\(X\\). Za naši krožnici je to \\(12x=52\\), torej premica \\(x=\\tfrac{13}{3}\\approx4{,}3333\\), pravokotna na zveznico središč. Odčitek pokaže potenčno premico krožnic \\(1\\) in \\(2\\) kot \\(12x=52\\). Premikanje točke je ponazoritev, utemeljitev je linearna enačba.',
            'Argument: in the equation \\(|X-O_1|^2-\\rho_1^2=|X-O_2|^2-\\rho_2^2\\) the terms \\(|X|^2\\) cancel and what remains is \\(2(O_2-O_1)\\cdot X=|O_2|^2-|O_1|^2-\\rho_2^2+\\rho_1^2\\), an equation linear in \\(X\\). For our circles this is \\(12x=52\\), so the line \\(x=\\tfrac{13}{3}\\approx4.3333\\), perpendicular to the line of centres. The readout shows the radical axis of the circles \\(1\\) and \\(2\\) as \\(12x=52\\). Moving the point is an illustration; the argument is the linear equation.',
        ),
        formulaIds: ['radical-axis'],
        workedExampleId: 'cg2-axis',
        observationPrompt: text('Preberi enačbo potenčne premice krožnic \\(1\\) in \\(2\\) in preveri, da je pravokotna na zveznico središč.', 'Read the equation of the radical axis of the circles \\(1\\) and \\(2\\) and check that it is perpendicular to the line of centres.'),
        expectedObservations: [text('Potenčna premica krožnic \\(1\\) in \\(2\\) je \\(12x=52\\), to je \\(x=\\tfrac{13}{3}\\).', 'The radical axis of the circles \\(1\\) and \\(2\\) is \\(12x=52\\), that is \\(x=\\tfrac{13}{3}\\).')],
        scene: scene('cg2-line-scene', {mode: 'radical', c1: O, c2: C2, c3: C3, p: [4, 2]},
            'Potenčna premica krožnic \\(1\\) in \\(2\\) je \\(12x=52\\); točka \\(P=(4,2)\\) ni na njej.',
            'The radical axis of the circles \\(1\\) and \\(2\\) is \\(12x=52\\); the point \\(P=(4,2)\\) is not on it.'),
    }),
    step({
        id: 'cg2-common', order: 4,
        title: text('Premica skozi skupni točki', 'The line through the common points'),
        purpose: text('Videti, da potenčna premica poteka skozi presečišči krožnic.', 'Seeing that the radical axis passes through the intersection points of the circles.'),
        explanation: text(
            'Argument: skupna točka obeh krožnic ima potenco \\(0\\) na obe, zato ima enako potenco in leži na potenčni premici. Krožnici \\(c_1\\) in \\(c_2\\) se sekata v dveh točkah, odčitek pravi »dve skupni točki«. Ležita na \\(x=\\tfrac{13}{3}\\), kjer je \\(y^2=25-\\tfrac{169}{9}=\\tfrac{56}{9}\\), torej \\(y=\\pm\\tfrac{\\sqrt{56}}{3}\\approx\\pm2{,}4944\\). Preverek za \\(c_2\\): \\((\\tfrac{13}{3}-6)^2+\\tfrac{56}{9}=\\tfrac{25}{9}+\\tfrac{56}{9}=9=3^2\\).',
            'Argument: a common point of the two circles has power \\(0\\) with respect to both, so it has equal power and lies on the radical axis. The circles \\(c_1\\) and \\(c_2\\) meet in two points, and the readout says "two common points". They lie on \\(x=\\tfrac{13}{3}\\), where \\(y^2=25-\\tfrac{169}{9}=\\tfrac{56}{9}\\), so \\(y=\\pm\\tfrac{\\sqrt{56}}{3}\\approx\\pm2.4944\\). Check for \\(c_2\\): \\((\\tfrac{13}{3}-6)^2+\\tfrac{56}{9}=\\tfrac{25}{9}+\\tfrac{56}{9}=9=3^2\\).',
        ),
        formulaIds: [],
        observationPrompt: text('Poišči v odčitku vrstico skupnih točk in poglej, kje potenčna premica seka obe krožnici.', 'Find the row of common points in the readout and look where the radical axis meets both circles.'),
        expectedObservations: [text('Odčitek navede dve skupni točki, obe na premici \\(12x=52\\).', 'The readout lists two common points, both on the line \\(12x=52\\).')],
        scene: scene('cg2-common-scene', {mode: 'radical', c1: O, c2: C2, c3: C3, p: [4, 2]},
            'Krožnici \\(c_1\\) in \\(c_2\\) imata dve skupni točki na potenčni premici \\(12x=52\\).',
            'The circles \\(c_1\\) and \\(c_2\\) have two common points on the radical axis \\(12x=52\\).'),
    }),
    step({
        id: 'cg2-apart', order: 5,
        title: text('Krožnici se oddaljita in dotakneta', 'The circles move apart and touch'),
        purpose: text('Videti, kje je potenčna premica, ko se krožnici dotikata in ko sta ločeni.', 'Seeing where the radical axis is when the circles touch and when they are apart.'),
        explanation: text(
            'Postavi \\(c_2\\) v središče \\((8,0)\\) s polmerom \\(3\\): krožnici se od zunaj dotikata, odčitek pravi »ena skupna točka (dotik)«. Potenčna premica je \\(16x=80\\), to je \\(x=5\\), skozi dotikališče \\((5,0)\\) in pravokotna na zveznico središč, torej skupna tangenta. Nato postavi \\(c_2\\) v središče \\((10,0)\\) s polmerom \\(2\\): krožnici sta ločeni, odčitek pravi »ni skupnih točk«, potenčna premica pa je \\(20x=121\\), to je \\(x=\\tfrac{121}{20}=6{,}05\\), med njima, saj \\(c_1\\) sega do \\(x=5\\) in \\(c_2\\) od \\(x=8\\). Tretja krožnica še čaka na šesti korak.',
            'Put \\(c_2\\) at centre \\((8,0)\\) with radius \\(3\\): the circles touch externally and the readout says "one common point (touching)". The radical axis is \\(16x=80\\), that is \\(x=5\\), through the point of contact \\((5,0)\\) and perpendicular to the line of centres, so the common tangent. Then put \\(c_2\\) at centre \\((10,0)\\) with radius \\(2\\): the circles are apart, the readout says "no common points", and the radical axis is \\(20x=121\\), that is \\(x=\\tfrac{121}{20}=6.05\\), between them, since \\(c_1\\) reaches to \\(x=5\\) and \\(c_2\\) from \\(x=8\\). The third circle still waits for step 6.',
        ),
        formulaIds: ['radical-axis'],
        observationPrompt: text('Spreminjaj središče in polmer krožnice \\(c_2\\) ter opazuj, kam gre potenčna premica.', 'Change the centre and the radius of the circle \\(c_2\\) and watch where the radical axis goes.'),
        expectedObservations: [text('Pri dotiku je potenčna premica \\(16x=80\\), pri središču \\((10,0)\\) in polmeru \\(2\\) pa \\(20x=121\\).', 'At the touching position the radical axis is \\(16x=80\\), and at centre \\((10,0)\\) with radius \\(2\\) it is \\(20x=121\\).')],
        scene: scene('cg2-apart-scene', {mode: 'radical', c1: O, c2: [8, 0, 3], c3: C3, p: [4, 2]},
            'Krožnici se od zunaj dotikata v \\((5,0)\\); potenčna premica krožnic \\(1\\) in \\(2\\) je \\(16x=80\\).',
            'The circles touch externally at \\((5,0)\\); the radical axis of the circles \\(1\\) and \\(2\\) is \\(16x=80\\).'),
    }),
    step({
        id: 'cg2-centre', order: 6,
        title: text('Tretja krožnica in potenčno središče', 'A third circle and the radical centre'),
        purpose: text('Videti, da se potenčne premice treh krožnic s nekolinearnimi središči sekajo v eni točki.', 'Seeing that the radical axes of three circles with non-collinear centres meet in one point.'),
        explanation: text(
            'Zdaj upoštevaj še krožnico \\(c_3\\) s središčem \\((3,6)\\) in polmerom \\(2\\). Središča \\((0,0)\\), \\((6,0)\\), \\((3,6)\\) niso na isti premici. Potenčni premici krožnic \\(1\\), \\(3\\) in \\(2\\), \\(3\\) sta \\(6x+12y=66\\) in \\(-6x+12y=14\\); sekata se v potenčnem središču \\((\\tfrac{13}{3},\\tfrac{10}{3})\\approx(4{,}3333;\\ 3{,}3333)\\). Argument: ima enako potenco na \\(c_1\\) in \\(c_2\\) (leži na prvi premici) in na \\(c_1\\) in \\(c_3\\), zato tudi na \\(c_2\\) in \\(c_3\\), torej na vseh treh premicah. Skupna potenca je \\(\\tfrac{44}{9}\\approx4{,}8889\\) in je pozitivna: središče je zunaj vseh treh krožnic, njegova tangenta na vsako krožnico je dolga \\(\\sqrt{44/9}\\approx2{,}2111\\). Krožnica okoli središča s tem polmerom seka vse tri pravokotno.',
            'Now include the circle \\(c_3\\) with centre \\((3,6)\\) and radius \\(2\\). The centres \\((0,0)\\), \\((6,0)\\), \\((3,6)\\) are not on one line. The radical axes of the circles \\(1\\), \\(3\\) and \\(2\\), \\(3\\) are \\(6x+12y=66\\) and \\(-6x+12y=14\\); they meet in the radical centre \\((\\tfrac{13}{3},\\tfrac{10}{3})\\approx(4.3333,\\ 3.3333)\\). Argument: it has equal power with respect to \\(c_1\\) and \\(c_2\\) (it lies on the first line) and with respect to \\(c_1\\) and \\(c_3\\), so also with respect to \\(c_2\\) and \\(c_3\\), hence on all three lines. The common power is \\(\\tfrac{44}{9}\\approx4.8889\\) and is positive: the centre is outside all three circles, and its tangent length to each circle is \\(\\sqrt{44/9}\\approx2.2111\\). The circle about the centre with this radius cuts all three at right angles.',
        ),
        formulaIds: ['equal-power'],
        observationPrompt: text('Preberi potenčno središče, skupno potenco in kvadrat polmera pravokotne krožnice.', 'Read the radical centre, the common power and the squared radius of the orthogonal circle.'),
        expectedObservations: [text('Potenčno središče je \\((\\tfrac{13}{3},\\tfrac{10}{3})\\), skupna potenca in kvadrat polmera pravokotne krožnice sta \\(\\tfrac{44}{9}\\approx4{,}8889\\).', 'The radical centre is \\((\\tfrac{13}{3},\\tfrac{10}{3})\\); the common power and the squared radius of the orthogonal circle are \\(\\tfrac{44}{9}\\approx4.8889\\).')],
        scene: scene('cg2-centre-scene', {mode: 'radical', c1: O, c2: C2, c3: C3, p: [4, 2]},
            'Tri krožnice; potenčno središče \\((\\tfrac{13}{3},\\tfrac{10}{3})\\), skupna potenca \\(\\tfrac{44}{9}\\), osi \\(6x+12y=66\\) in \\(-6x+12y=14\\).',
            'Three circles; the radical centre \\((\\tfrac{13}{3},\\tfrac{10}{3})\\), the common power \\(\\tfrac{44}{9}\\), the axes \\(6x+12y=66\\) and \\(-6x+12y=14\\).'),
    }),
    step({
        id: 'cg2-explore', order: 7,
        title: text('Prosto raziskovanje', 'Free exploration'),
        purpose: text('Spreminjati krožnice in poiskati posebne lege: sosrediščni krožnici in kolinearna središča.', 'Changing the circles and finding special positions: concentric circles and collinear centres.'),
        explanation: text(
            'Spreminjaj središča in polmere vseh treh krožnic ter premikaj točko \\(P\\). Postavi dve krožnici v isto središče: potenčne premice ni, graf pove, da sta krožnici sosrediščni. Če so središča vseh treh na isti premici, sta premici vzporedni in potenčnega središča ni, razen če sovpadata (krožnice z isto potenčno premico, na primer tri krožnice skozi dve skupni točki). Slika kaže en primer; posplošitev dajeta utemeljitvi prejšnjih korakov.',
            'Change the centres and radii of all three circles and move the point \\(P\\). Put two circles at the same centre: there is no radical axis and the graph says the circles are concentric. If the centres of all three are on one line, the axes are parallel and there is no radical centre, unless they coincide (coaxal circles, for example three circles through two common points). The picture shows one case; the generalisation comes from the arguments of the previous steps.',
        ),
        formulaIds: [],
        observationPrompt: text('Poišči lego brez potenčnega središča in preberi, kaj pove stanje.', 'Find a position without a radical centre and read what the status says.'),
        expectedObservations: [text('Pri kolinearnih središčih stanje pove, da sta potenčni premici vzporedni in da potenčnega središča ni.', 'With collinear centres the status says the radical axes are parallel and there is no radical centre.')],
        scene: scene('cg2-explore-scene', {mode: 'radical', c1: O, c2: C2, c3: C3, p: [4, 2]},
            'Začetni primer: tri krožnice s središči \\((0,0)\\), \\((6,0)\\), \\((3,6)\\) in točka \\(P=(4,2)\\).',
            'The starting case: three circles with centres \\((0,0)\\), \\((6,0)\\), \\((3,6)\\) and the point \\(P=(4,2)\\).'),
    }),
];

const sources: GuidedLesson['sources'] = [
    {
        id: 'bezeg-circle-construction-implementation',
        citation: 'Bezeg source: src/compgeo/circleConstructions.ts, src/compgeo/circleConstructionModel.ts and src/graphs/compgeo/CircleConstructionGraph.tsx.',
        implementationCorrespondence: 'A scene sets the graph\'s mode, circles and point P on the grid; powers, the classification of the point and the radical axes and centre are exact rationals, the points of contact are rounded doubles; the text quotes only values of those scenes or plain arithmetic shown in the same step.',
    },
];

const cg1: GuidedLesson = {
    demonstrationId: 'circle-construction',
    title: text('Tangente iz točke', 'Tangents from a point'),
    summary: text(
        'Iz točke zunaj krožnice gresta dve tangenti, iz točke na krožnici ena, iz točke v notranjosti nobena. Dotikališči ležita na krožnici nad premerom \\(OP\\), tangentna odseka sta enako dolga in \\(|PT|^2=|PO|^2-\\rho^2\\).',
        'From a point outside a circle two tangents pass, from a point on it one, from a point inside none. The points of contact lie on the circle over the diameter \\(OP\\), the tangent segments are equally long and \\(|PT|^2=|PO|^2-\\rho^2\\).',
    ),
    prerequisites: [text('Talesov izrek in obodni kot ter Pitagorov izrek.', 'Thales\' theorem and the inscribed angle, and the Pythagorean theorem.')],
    learningGoals: [
        text('Odločiš, koliko tangent gre skozi točko, po predznaku potence točke na krožnico.', 'Decide how many tangents pass through a point from the sign of its power with respect to the circle.'),
        text('Sestaviš tangenti s Talesovo krožnico nad \\(OP\\) in utemeljiš pravi kot pri dotikališču.', 'Construct the tangents with the Thales circle over \\(OP\\) and argue the right angle at the point of contact.'),
        text('Izračunaš dolžino tangente iz \\(|PT|^2=|PO|^2-\\rho^2\\) in veš, da sta obe enako dolgi.', 'Compute the tangent length from \\(|PT|^2=|PO|^2-\\rho^2\\) and know that both are equally long.'),
    ],
    formulaBlocks: cg1Formulas,
    workedExamples: cg1Examples,
    steps: cg1Steps,
    sources,
    edgeCases: [
        text('Če je \\(P=O\\), tangente ni in graf to pove v stanju; polmer mora biti pozitiven.', 'If \\(P=O\\) there is no tangent and the graph says so in the status; the radius must be positive.'),
        text('Točka na krožnici (potenca \\(0\\)): ena tangenta, dotikališče je \\(P\\) sam.', 'A point on the circle (power \\(0\\)): one tangent, the point of contact is \\(P\\) itself.'),
        text('Točki dotika sta približni (zaokrožena decimalna števila); število tangent odloči natančen račun potence.', 'The points of contact are approximate (rounded decimals); the number of tangents is decided by the exact computation of the power.'),
    ],
    unresolvedQuestions: [],
};

const cg2: GuidedLesson = {
    demonstrationId: 'circle-construction',
    title: text('Potenčna premica in potenčno središče', 'Radical axis and radical centre'),
    summary: text(
        'Točke z enako potenco na dve krožnici z različnima središčema ležijo na premici, potenčni premici, pravokotni na zveznico središč; skozi skupni točki gre, če obstajata. Tri krožnice z nekolinearnimi središči imajo eno točko enake potence, potenčno središče.',
        'The points with equal power with respect to two circles with different centres lie on a line, the radical axis, perpendicular to the line of centres; it passes through the common points when they exist. Three circles with non-collinear centres have one point of equal power, the radical centre.',
    ),
    prerequisites: [text('Lekcija o tangentah iz točke in potenca točke na krožnico.', 'The lesson on tangents from a point, and the power of a point with respect to a circle.')],
    learningGoals: [
        text('Izpelješ enačbo potenčne premice dveh krožnic in poveš, da je pravokotna na zveznico središč.', 'Derive the equation of the radical axis of two circles and say that it is perpendicular to the line of centres.'),
        text('Veš, kje je potenčna premica pri sekajočih, dotikajočih in ločenih krožnicah.', 'Know where the radical axis is for crossing, touching and separate circles.'),
        text('Utemeljiš, da se tri potenčne premice sekajo v potenčnem središču, in poznaš izjemi: vzporedni premici in krožnice z isto potenčno premico.', 'Argue that the three radical axes meet in the radical centre, and know the exceptions: parallel axes and coaxal circles.'),
    ],
    formulaBlocks: cg2Formulas,
    workedExamples: cg2Examples,
    steps: cg2Steps,
    sources,
    edgeCases: [
        text('Sosrediščni krožnici nimata potenčne premice; enaki krožnici imata enako potenco povsod.', 'Concentric circles have no radical axis; equal circles have equal power everywhere.'),
        text('Kolinearna središča: potenčni premici sta vzporedni (ni potenčnega središča) ali sovpadata (krožnice z isto potenčno premico).', 'Collinear centres: the radical axes are parallel (no radical centre) or coincide (coaxal circles).'),
        text('Dotikajoči krožnici: potenčna premica gre skozi dotikališče in je njuna skupna tangenta.', 'Touching circles: the radical axis passes through the point of contact and is their common tangent.'),
    ],
    unresolvedQuestions: [],
};

export const circleTangentsLesson: GuidedLesson = cg1;
export const circleRadicalLesson: GuidedLesson = cg2;
