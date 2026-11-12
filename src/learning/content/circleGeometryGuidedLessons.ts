/**
 * Guided lessons of the circle-geometry family (docs/specs/circle-geometry-lessons.md): batch A, CG1 tangents from a point and CG2 the radical axis
 * and the radical centre, and batch B, CG3 the Apollonius circle and CG4 the common tangents of two circles, all on `circle-construction`
 * (CircleConstructionGraph). CG3 and CG4 scenes use `set-mode` with `set-apollonius` or `set-circle` (apolloniusScene, commonScene); their numbers are
 * the probe readouts or arithmetic shown in the same step, listed in docs/reviews/feature-streams/families-prep/notes/f3-circle-b.md.
 * Each is the lesson of one section of the circle-geometry chapter (circleGeometryChapterRegistry.ts adapts them on request; the lesson catalog itself
 * holds none, as it keeps one lesson per Demonstration). Scenes use only the `circle` actions CircleConstructionGraph registers (`set-mode`,
 * `set-circle`, `set-point`, `set-apollonius`) and every scene starts from the Demonstration default
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

/** CG3: the Apollonius mode with A=(0,0), B=(6,0) as the mode's example has them, the point P and the ratio k the scene names. */
const apolloniusScene = (id: string, spec: {readonly p: CircleScenePoint; readonly k: number}, sl: string, en: string): LessonScene => ({
    id, basedOn: 'demonstration-default', expectedState: text(sl, en),
    actions: [
        {kind: 'prepared-scene', sceneId: id, source: 'demonstration-default'},
        {kind: 'circle', operation: 'set-mode', mode: 'apollonius'},
        {kind: 'circle', operation: 'set-apollonius', a: {x: 0, y: 0}, b: {x: 6, y: 0}, p: {x: spec.p[0], y: spec.p[1]}, k: spec.k},
    ],
});

/** CG4: the common-tangents mode with the two circles the scene names. */
const commonScene = (id: string, c1: CircleSceneCircle, c2: CircleSceneCircle, sl: string, en: string): LessonScene => ({
    id, basedOn: 'demonstration-default', expectedState: text(sl, en),
    actions: [
        {kind: 'prepared-scene', sceneId: id, source: 'demonstration-default'},
        {kind: 'circle', operation: 'set-mode', mode: 'common'},
        {kind: 'circle', operation: 'set-circle', circle: 'c1', x: c1[0], y: c1[1], r: c1[2]},
        {kind: 'circle', operation: 'set-circle', circle: 'c2', x: c2[0], y: c2[1], r: c2[2]},
    ],
});

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

// ---- CG3 -------------------------------------------------------------------------------------------------------------------------

const cg3Formulas: readonly FormulaBlock[] = [
    {
        id: 'apollonius-ratio',
        latex: '|PA|=k\\,|PB|\\ \\Longleftrightarrow\\ |PA|^2=m\\,|PB|^2,\\ \\ m=k^2',
        notation: text(
            '\\(A\\) in \\(B\\) sta dani različni točki, \\(P\\) je poljubna točka ravnine, \\(k>0\\) je razmerje razdalj in \\(m=k^2\\).',
            '\\(A\\) and \\(B\\) are two given distinct points, \\(P\\) is any point of the plane, \\(k>0\\) is the ratio of the distances and \\(m=k^2\\).',
        ),
        explanation: text(
            'Definicija: množica točk \\(P\\) z razmerjem \\(|PA|:|PB|=k\\). Ker sta obe strani nenegativni, je enakost \\(|PA|=k|PB|\\) enakovredna enakosti kvadratov \\(|PA|^2=m|PB|^2\\). Ta oblika nima korenov, zato z njo natančno preverimo, ali ima točka z celoštevilskima koordinatama dano razmerje. V točki \\(P=B\\) je \\(|PB|=0\\) in razmerje ni določeno.',
            'Definition: the set of points \\(P\\) with the ratio \\(|PA|:|PB|=k\\). Since both sides are non-negative, the equality \\(|PA|=k|PB|\\) is equivalent to the equality of the squares \\(|PA|^2=m|PB|^2\\). This form has no roots, so with it we test exactly whether a point with integer coordinates has the given ratio. At \\(P=B\\) we have \\(|PB|=0\\) and the ratio is not defined.',
        ),
    },
    {
        id: 'apollonius-circle',
        latex: '|PA|^2-m|PB|^2=(1-m)(x^2+y^2)+2mb\\,x-mb^2',
        notation: text(
            'Koordinate so izbrane tako, da je \\(A=(0,0)\\), \\(B=(b,0)\\) in \\(P=(x,y)\\); \\(m=k^2\\).',
            'The coordinates are chosen so that \\(A=(0,0)\\), \\(B=(b,0)\\) and \\(P=(x,y)\\); \\(m=k^2\\).',
        ),
        explanation: text(
            'Argument: izraz dobimo z razvojem \\(|PA|^2=x^2+y^2\\) in \\(m|PB|^2=m\\bigl((x-b)^2+y^2\\bigr)\\). Pri \\(m\\ne1\\) ga delimo z \\(1-m\\): kvadrata \\(x^2\\) in \\(y^2\\) imata enak koeficient, člena \\(xy\\) ni, zato je to enačba krožnice s središčem \\(\\bigl(\\tfrac{mb}{m-1},0\\bigr)\\) in kvadratom polmera \\(\\tfrac{mb^2}{(m-1)^2}\\). Pri \\(m=1\\) odpadejo kvadratni členi in ostane \\(2bx-b^2=0\\), to je premica \\(x=\\tfrac b2\\), simetrala daljice \\(AB\\).',
            'Argument: the expression comes from expanding \\(|PA|^2=x^2+y^2\\) and \\(m|PB|^2=m\\bigl((x-b)^2+y^2\\bigr)\\). For \\(m\\ne1\\) we divide by \\(1-m\\): the squares \\(x^2\\) and \\(y^2\\) have the same coefficient and there is no \\(xy\\) term, so this is the equation of a circle with centre \\(\\bigl(\\tfrac{mb}{m-1},0\\bigr)\\) and squared radius \\(\\tfrac{mb^2}{(m-1)^2}\\). For \\(m=1\\) the quadratic terms cancel and \\(2bx-b^2=0\\) remains, a line \\(x=\\tfrac b2\\), the perpendicular bisector of \\(AB\\).',
        ),
    },
    {
        id: 'inverse-points',
        latex: '|OA|\\cdot|OB|=\\rho^2',
        notation: text(
            '\\(O\\) je središče in \\(\\rho\\) polmer krožnice, točki \\(A\\) in \\(B\\) ležita na istem poltraku iz \\(O\\).',
            '\\(O\\) is the centre and \\(\\rho\\) the radius of the circle, and the points \\(A\\) and \\(B\\) lie on the same ray from \\(O\\).',
        ),
        explanation: text(
            'Definicija: točki na istem poltraku iz središča \\(O\\) sta si inverzni glede na krožnico s polmerom \\(\\rho\\), kadar je zmnožek njunih razdalj do \\(O\\) enak \\(\\rho^2\\). Inverzija je podrobneje v lekciji Potenca točke in inverzija.',
            'Definition: two points on the same ray from the centre \\(O\\) are inverse with respect to the circle of radius \\(\\rho\\) when the product of their distances from \\(O\\) equals \\(\\rho^2\\). Inversion is treated in more detail in the lesson Power of a point and inversion.',
        ),
    },
];

const cg3Examples: readonly WorkedExample[] = [
    {
        id: 'cg3-expansion',
        title: text('Razvoj \\(|PA|^2=4|PB|^2\\) pri \\(A=(0,0)\\), \\(B=(6,0)\\)', 'Expanding \\(|PA|^2=4|PB|^2\\) for \\(A=(0,0)\\), \\(B=(6,0)\\)'),
        calculationLatex: 'x^2+y^2=4\\bigl((x-6)^2+y^2\\bigr)\\ \\Longrightarrow\\ 3x^2+3y^2-48x+144=0',
        resultLatex: '(x-8)^2+y^2=16',
        check: text(
            'Delimo s \\(3\\): \\(x^2-16x+y^2+48=0\\). Dopolnitev do popolnega kvadrata da \\((x-8)^2+y^2=64-48=16\\): središče \\((8,0)\\), kvadrat polmera \\(16\\), polmer \\(4\\). Isto dasta formuli za \\(b=6\\), \\(m=4\\): središče \\(\\tfrac{4\\cdot6}{3}=8\\) in kvadrat polmera \\(\\tfrac{4\\cdot36}{9}=16\\).',
            'Dividing by \\(3\\): \\(x^2-16x+y^2+48=0\\). Completing the square gives \\((x-8)^2+y^2=64-48=16\\): centre \\((8,0)\\), squared radius \\(16\\), radius \\(4\\). The formulas for \\(b=6\\), \\(m=4\\) give the same: centre \\(\\tfrac{4\\cdot6}{3}=8\\) and squared radius \\(\\tfrac{4\\cdot36}{9}=16\\).',
        ),
    },
];

const cg3Steps: readonly GuidedLessonStep[] = [
    step({
        id: 'cg3-predict', order: 1,
        title: text('Napoved množice točk', 'Predicting the set of points'),
        purpose: text('Napovedati obliko množice točk z danim razmerjem razdalj do dveh točk, preden jo graf nariše.', 'Predicting the shape of the set of points with a given ratio of distances to two points, before the graph draws it.'),
        explanation: text(
            'Točki \\(A=(0,0)\\) in \\(B=(6,0)\\) sta dani, točka \\(P\\) je poljubna. Razmerje \\(k=|PA|:|PB|\\) nastaviš v polju Razmerje. Zanima nas množica vseh točk \\(P\\), pri katerih je razmerje enako danemu \\(k\\). Preden karkoli spremeniš, napovej obliko te množice za \\(k=1\\), to je za \\(|PA|=|PB|\\), in za \\(k=2\\), to je za \\(|PA|=2|PB|\\), ter na kateri strani točk \\(A\\) in \\(B\\) leži.',
            'The points \\(A=(0,0)\\) and \\(B=(6,0)\\) are given and the point \\(P\\) is arbitrary. You set the ratio \\(k=|PA|:|PB|\\) in the field Ratio. We are interested in the set of all points \\(P\\) for which the ratio equals the given \\(k\\). Before you change anything, predict the shape of this set for \\(k=1\\), that is for \\(|PA|=|PB|\\), and for \\(k=2\\), that is for \\(|PA|=2|PB|\\), and on which side of the points \\(A\\) and \\(B\\) it lies.',
        ),
        formulaIds: [],
        observationPrompt: text('Zapiši dve napovedi, nato preberi stanje pri \\(k=1\\); nastavi \\(k=2\\) in preberi stanje še enkrat.', 'Write down two predictions, then read the status at \\(k=1\\); set \\(k=2\\) and read the status again.'),
        expectedObservations: [
            text('Pri \\(k=1\\) stanje pove, da so točke na simetrali daljice \\(AB\\); vrstica množice kaže \\(12x=36\\), to je premica \\(x=3\\).', 'At \\(k=1\\) the status says the points lie on the perpendicular bisector of \\(AB\\); the set row shows \\(12x=36\\), the line \\(x=3\\).'),
            text('Pri \\(k=2\\) stanje pove, da točke ležijo na krožnici; krožnica leži na strani točke \\(B\\) in jo obdaja, točke \\(A\\) pa ne.', 'At \\(k=2\\) the status says the points lie on a circle; the circle lies on the side of the point \\(B\\) and surrounds it, but not the point \\(A\\).'),
        ],
        scene: apolloniusScene('cg3-predict-scene', {p: [8, 4], k: 1},
            'Točki \\(A=(0,0)\\), \\(B=(6,0)\\), razmerje \\(k=1\\), točka \\(P=(8,4)\\); množica je premica \\(12x=36\\).',
            'The points \\(A=(0,0)\\), \\(B=(6,0)\\), the ratio \\(k=1\\), the point \\(P=(8,4)\\); the set is the line \\(12x=36\\).'),
    }),
    step({
        id: 'cg3-ratio', order: 2,
        title: text('Razmerje v točki \\(P\\)', 'The ratio at the point \\(P\\)'),
        purpose: text('Povleči \\(P\\) in prebrati razmerje razdalj ter videti, da v \\(B\\) ni določeno.', 'Dragging \\(P\\) and reading the ratio of the distances, and seeing that it is not defined at \\(B\\).'),
        explanation: text(
            'Odčitek v vrstici Razmerje PA : PB pokaže \\(|PA|:|PB|\\) za trenutno točko \\(P\\). Točka \\(P\\) ima celoštevilski koordinati, zato je preverjanje, ali je \\(P\\) na množici, natančno: primerjamo \\(|PA|^2\\) in \\(m|PB|^2\\). Razmerje v odčitku je kvadratni koren iz razmerja kvadratov in je zaokroženo, kadar ni celo število. Povleci \\(P\\) ali vpiši njene koordinate in opazuj razmerje; pri \\(k=1\\) vrstica Točka P na množici pove, ali ima \\(P\\) razmerje \\(1\\). Če je \\(P=B\\), je imenovalec \\(0\\) in razmerje ni določeno.',
            'The readout in the row Ratio PA : PB shows \\(|PA|:|PB|\\) for the current point \\(P\\). The point \\(P\\) has integer coordinates, so the test whether \\(P\\) is on the set is exact: we compare \\(|PA|^2\\) and \\(m|PB|^2\\). The ratio in the readout is the square root of the ratio of the squares and is rounded when it is not an integer. Drag \\(P\\) or type its coordinates and watch the ratio; at \\(k=1\\) the row P on the set says whether \\(P\\) has the ratio \\(1\\). If \\(P=B\\), the denominator is \\(0\\) and the ratio is not defined.',
        ),
        formulaIds: ['apollonius-ratio'],
        observationPrompt: text('Postavi \\(P\\) v \\((5,0)\\), v \\((3,3)\\) in v \\(B=(6,0)\\) ter preberi razmerje in vrstico Točka P na množici.', 'Put \\(P\\) at \\((5,0)\\), at \\((3,3)\\) and at \\(B=(6,0)\\), and read the ratio and the row P on the set.'),
        expectedObservations: [
            text('V \\((5,0)\\) je razmerje \\(5\\), saj je \\(|PA|=5\\) in \\(|PB|=1\\); v \\((3,3)\\) je razmerje \\(1\\), ker je \\(|PA|^2=|PB|^2=18\\), in točka je na množici; v \\(B\\) razmerje ni določeno.', 'At \\((5,0)\\) the ratio is \\(5\\), since \\(|PA|=5\\) and \\(|PB|=1\\); at \\((3,3)\\) the ratio is \\(1\\), because \\(|PA|^2=|PB|^2=18\\), and the point is on the set; at \\(B\\) the ratio is not defined.'),
        ],
        scene: apolloniusScene('cg3-ratio-scene', {p: [5, 0], k: 1},
            'Razmerje \\(k=1\\), točka \\(P=(5,0)\\): razmerje v \\(P\\) je \\(5\\), točka ni na množici.',
            'The ratio \\(k=1\\), the point \\(P=(5,0)\\): the ratio at \\(P\\) is \\(5\\), the point is not on the set.'),
    }),
    step({
        id: 'cg3-division', order: 3,
        title: text('Točki na premici \\(AB\\)', 'The points on the line \\(AB\\)'),
        purpose: text('Poiskati notranjo in zunanjo delilno točko daljice \\(AB\\) z razmerjem \\(k=2\\).', 'Finding the internal and external division points of \\(AB\\) with the ratio \\(k=2\\).'),
        explanation: text(
            'Nastavi \\(k=2\\). Na premici \\(AB\\) iščemo točke \\(X\\) z \\(|XA|=2|XB|\\). Ena taka točka, \\(N\\), leži med \\(A\\) in \\(B\\), druga, \\(Z\\), zunaj daljice \\(AB\\). Preden pogledaš odčitek, napovej obe x-koordinati; namig: za prvo velja \\(|NA|+|NB|=|AB|=6\\), za drugo razlika razdalj do \\(A\\) in \\(B\\) enaka \\(|AB|\\).',
            'Set \\(k=2\\). On the line \\(AB\\) we look for the points \\(X\\) with \\(|XA|=2|XB|\\). One such point, \\(I\\), lies between \\(A\\) and \\(B\\), the other, \\(E\\), outside the segment \\(AB\\). Before you look at the readout, predict both x-coordinates; hint: for the first one \\(|IA|+|IB|=|AB|=6\\), for the second the difference of the distances to \\(A\\) and \\(B\\) equals \\(|AB|\\).',
        ),
        formulaIds: [],
        observationPrompt: text('Zapiši napoved, nato preberi notranjo in zunanjo delilno točko v odčitku in preveri napoved.', 'Write down your prediction, then read the internal and the external division point in the readout and check the prediction.'),
        expectedObservations: [
            text('Notranja delilna točka je \\(N=(4,0)\\), zunanja \\(Z=(12,0)\\).', 'The internal division point is \\(I=(4,0)\\), the external one \\(E=(12,0)\\).'),
            text('Izpeljava notranje točke: \\(|NA|+|NB|=6\\) in \\(|NA|=2|NB|\\), zato \\(|NB|=2\\), \\(|NA|=4\\). Zunanja točka za \\(B\\): \\(|ZA|-|ZB|=6\\) in \\(|ZA|=2|ZB|\\), zato \\(|ZB|=6\\), \\(|ZA|=12\\). Isti točki dobimo kot presečišči notranje in zunanje simetrale kota \\(APB\\) s premico \\(AB\\) (izrek o simetrali kota).', 'Derivation of the internal point: \\(|IA|+|IB|=6\\) and \\(|IA|=2|IB|\\), so \\(|IB|=2\\), \\(|IA|=4\\). The external point beyond \\(B\\): \\(|EA|-|EB|=6\\) and \\(|EA|=2|EB|\\), so \\(|EB|=6\\), \\(|EA|=12\\). We get the same two points as the intersections of the internal and the external bisector of the angle \\(APB\\) with the line \\(AB\\) (the angle bisector theorem).'),
        ],
        scene: apolloniusScene('cg3-division-scene', {p: [8, 4], k: 2},
            'Razmerje \\(k=2\\): delilni točki \\(N=(4,0)\\) in \\(Z=(12,0)\\).',
            'The ratio \\(k=2\\): the division points \\(I=(4,0)\\) and \\(E=(12,0)\\).'),
    }),
    step({
        id: 'cg3-circle', order: 4,
        title: text('Krožnica nad premerom \\(NZ\\)', 'The circle on the diameter \\(IE\\)'),
        purpose: text('Primerjati krožnico nad premerom med delilnima točkama z množico, ki jo da račun.', 'Comparing the circle on the diameter between the division points with the set that the computation gives.'),
        explanation: text(
            'Daljica \\(NZ\\) je dolga \\(12-4=8\\), njeno razpolovišče je \\((8,0)\\). Krožnica s premerom \\(NZ\\) ima torej središče \\((8,0)\\) in polmer \\(\\rho=4\\). Ali je to res vsa množica, pokaže račun: enakost \\(|PA|^2=4|PB|^2\\) razvijemo v koordinatah, kot kaže primer. Razvoj je argument, da je množica krožnica; graf kaže isto krožnico.',
            'The segment \\(IE\\) is \\(12-4=8\\) long and its midpoint is \\((8,0)\\). So the circle with the diameter \\(IE\\) has centre \\((8,0)\\) and radius \\(\\rho=4\\). Whether this is the whole set is shown by a computation: we expand \\(|PA|^2=4|PB|^2\\) in coordinates, as the example shows. The expansion is the argument that the set is a circle; the graph shows the same circle.',
        ),
        formulaIds: ['apollonius-circle'],
        workedExampleId: 'cg3-expansion',
        observationPrompt: text('Preberi središče in kvadrat polmera v vrstici množice in preveri, da krožnica poteka skozi obe delilni točki.', 'Read the centre and the squared radius in the set row and check that the circle passes through both division points.'),
        expectedObservations: [text('Središče je \\((8,0)\\), kvadrat polmera \\(16\\); krožnica poteka skozi \\((4,0)\\) in \\((12,0)\\).', 'The centre is \\((8,0)\\), the squared radius is \\(16\\); the circle passes through \\((4,0)\\) and \\((12,0)\\).')],
        scene: apolloniusScene('cg3-circle-scene', {p: [8, 4], k: 2},
            'Razmerje \\(k=2\\): krožnica s središčem \\((8,0)\\) in kvadratom polmera \\(16\\).',
            'The ratio \\(k=2\\): the circle with centre \\((8,0)\\) and squared radius \\(16\\).'),
    }),
    step({
        id: 'cg3-points', order: 5,
        title: text('Druge točke na krožnici', 'Other points on the circle'),
        purpose: text('Preveriti, da imajo tudi druge točke krožnice razmerje \\(2\\), in to natančno.', 'Checking that other points of the circle also have the ratio \\(2\\), and exactly.'),
        explanation: text(
            'Točka \\((8,4)\\) je na krožnici \\((x-8)^2+y^2=16\\), ker je \\(0+16=16\\). Natančen račun: \\(|PA|^2=8^2+4^2=80\\), \\(|PB|^2=2^2+4^2=20\\) in \\(80=4\\cdot20\\), torej je razmerje \\(\\sqrt{80/20}=2\\) brez zaokrožitve. Zrcalna točka \\((8,-4)\\) da enako. Premikanje točke \\(P\\) je ponazoritev; da ima vsaka točka krožnice razmerje \\(2\\), sledi iz enakovrednosti v prejšnjem koraku.',
            'The point \\((8,4)\\) is on the circle \\((x-8)^2+y^2=16\\), because \\(0+16=16\\). The exact computation: \\(|PA|^2=8^2+4^2=80\\), \\(|PB|^2=2^2+4^2=20\\) and \\(80=4\\cdot20\\), so the ratio is \\(\\sqrt{80/20}=2\\) without rounding. The mirror point \\((8,-4)\\) gives the same. Moving \\(P\\) is an illustration; that every point of the circle has the ratio \\(2\\) follows from the equivalence in the previous step.',
        ),
        formulaIds: [],
        observationPrompt: text('Postavi \\(P\\) v \\((8,4)\\), \\((8,-4)\\), \\((4,0)\\), \\((12,0)\\) in nazadnje v \\((5,0)\\); preberi razmerje in vrstico Točka P na množici.', 'Put \\(P\\) at \\((8,4)\\), \\((8,-4)\\), \\((4,0)\\), \\((12,0)\\) and finally at \\((5,0)\\); read the ratio and the row P on the set.'),
        expectedObservations: [text('V prvih štirih točkah je razmerje \\(2\\) in točka je na množici; v \\((5,0)\\) je razmerje \\(5\\) in točka ni na množici.', 'At the first four points the ratio is \\(2\\) and the point is on the set; at \\((5,0)\\) the ratio is \\(5\\) and the point is not on the set.')],
        scene: apolloniusScene('cg3-points-scene', {p: [8, 4], k: 2},
            'Razmerje \\(k=2\\), točka \\(P=(8,4)\\): razmerje v \\(P\\) je \\(2\\), točka je na množici.',
            'The ratio \\(k=2\\), the point \\(P=(8,4)\\): the ratio at \\(P\\) is \\(2\\), the point is on the set.'),
    }),
    step({
        id: 'cg3-inverse', order: 6,
        title: text('\\(A\\) in \\(B\\) sta inverzni', '\\(A\\) and \\(B\\) are inverse'),
        purpose: text('Videti, da je \\(B\\) inverz točke \\(A\\) glede na Apolonijevo krožnico.', 'Seeing that \\(B\\) is the inverse of \\(A\\) with respect to the Apollonius circle.'),
        explanation: text(
            'Središče krožnice je \\(O=(8,0)\\), polmer \\(\\rho=4\\). Inverz točke \\(A\\) leži na poltraku iz \\(O\\) skozi \\(A\\), na razdalji \\(\\rho^2/|OA|\\) od \\(O\\). Preden pogledaš odčitek, napovej, kje leži inverz točke \\(A\\) in kakšen je njegov odnos do točke \\(B\\). Graf inverz izračuna natančno, brez zaokrožitve.',
            'The centre of the circle is \\(O=(8,0)\\) and the radius is \\(\\rho=4\\). The inverse of the point \\(A\\) lies on the ray from \\(O\\) through \\(A\\), at the distance \\(\\rho^2/|OA|\\) from \\(O\\). Before you look at the readout, predict where the inverse of \\(A\\) lies and how it relates to the point \\(B\\). The graph computes the inverse exactly, without rounding.',
        ),
        formulaIds: ['inverse-points'],
        observationPrompt: text('Zapiši napoved, nato preberi vrstico Inverz točke A v tej krožnici in preveri napoved.', 'Write down your prediction, then read the row Inverse of A in this circle and check the prediction.'),
        expectedObservations: [
            text('Inverz točke \\(A\\) je \\((6,0)\\), to je točka \\(B\\).', 'The inverse of \\(A\\) is \\((6,0)\\), the point \\(B\\).'),
            text('Izračun: \\(|OA|=8\\) in \\(|OB|=2\\) na istem poltraku iz \\(O\\), zato je \\(|OA|\\cdot|OB|=16=\\rho^2\\) in je \\(B\\) inverz točke \\(A\\). Za vsak \\(m\\ne1\\): iz središča \\(\\tfrac{mb}{m-1}\\) in kvadrata polmera \\(\\tfrac{mb^2}{(m-1)^2}\\) je \\(|OA|=\\tfrac{mb}{|m-1|}\\) in \\(|OB|=\\tfrac{b}{|m-1|}\\), njun zmnožek pa je \\(\\tfrac{mb^2}{(m-1)^2}=\\rho^2\\).', 'The computation: \\(|OA|=8\\) and \\(|OB|=2\\) on the same ray from \\(O\\), so \\(|OA|\\cdot|OB|=16=\\rho^2\\) and \\(B\\) is the inverse of \\(A\\). For every \\(m\\ne1\\): from the centre \\(\\tfrac{mb}{m-1}\\) and the squared radius \\(\\tfrac{mb^2}{(m-1)^2}\\) we get \\(|OA|=\\tfrac{mb}{|m-1|}\\) and \\(|OB|=\\tfrac{b}{|m-1|}\\), and their product is \\(\\tfrac{mb^2}{(m-1)^2}=\\rho^2\\).'),
        ],
        scene: apolloniusScene('cg3-inverse-scene', {p: [8, 4], k: 2},
            'Razmerje \\(k=2\\): inverz točke \\(A\\) v krožnici je \\((6,0)=B\\).',
            'The ratio \\(k=2\\): the inverse of \\(A\\) in the circle is \\((6,0)=B\\).'),
    }),
    step({
        id: 'cg3-explore', order: 7,
        title: text('Prosto raziskovanje', 'Free exploration'),
        purpose: text('Spreminjati razmerje in točki \\(A\\), \\(B\\) ter poiskati posebne lege.', 'Changing the ratio and the points \\(A\\), \\(B\\) and finding special positions.'),
        explanation: text(
            'Spreminjaj razmerje \\(k\\) v korakih po \\(\\tfrac12\\), točki \\(A\\), \\(B\\) in \\(P\\). Pri \\(k=\\tfrac12\\) in izvirnih \\(A\\), \\(B\\) je središče \\((-2,0)\\) in kvadrat polmera spet \\(16\\): krožnica je na strani točke \\(A\\). Pri \\(k=1\\) je množica premica. Če postaviš \\(A\\) in \\(B\\) v isto točko, stanje pove, da množica ni določena. Slika kaže posamezne primere; splošno velja argument iz razvoja.',
            'Change the ratio \\(k\\) in steps of \\(\\tfrac12\\), and the points \\(A\\), \\(B\\) and \\(P\\). At \\(k=\\tfrac12\\) and the original \\(A\\), \\(B\\) the centre is \\((-2,0)\\) and the squared radius is again \\(16\\): the circle is on the side of the point \\(A\\). At \\(k=1\\) the set is a line. If you put \\(A\\) and \\(B\\) at the same point, the status says that the set is not defined. The picture shows single cases; the general statement is the argument from the expansion.',
        ),
        formulaIds: [],
        observationPrompt: text('Nastavi \\(k=\\tfrac12\\) in preberi vrstico množice; nato postavi \\(B\\) v \\(A\\) in preberi stanje.', 'Set \\(k=\\tfrac12\\) and read the set row; then put \\(B\\) at \\(A\\) and read the status.'),
        expectedObservations: [
            text('Pri \\(k=\\tfrac12\\) je središče \\((-2,0)\\), kvadrat polmera \\(16\\).', 'At \\(k=\\tfrac12\\) the centre is \\((-2,0)\\) and the squared radius is \\(16\\).'),
            text('Ko \\(A\\) in \\(B\\) sovpadata, stanje pove, da množica točk ni določena.', 'When \\(A\\) and \\(B\\) coincide, the status says that the set of points is not defined.'),
        ],
        scene: apolloniusScene('cg3-explore-scene', {p: [8, 4], k: 2},
            'Začetni primer: \\(A=(0,0)\\), \\(B=(6,0)\\), \\(k=2\\), \\(P=(8,4)\\).',
            'The starting case: \\(A=(0,0)\\), \\(B=(6,0)\\), \\(k=2\\), \\(P=(8,4)\\).'),
    }),
];

const cg3: GuidedLesson = {
    demonstrationId: 'circle-construction',
    title: text('Apolonijeva krožnica', 'The Apollonius circle'),
    summary: text(
        'Obravnavamo množico točk, katerih razdalji do dveh danih točk imata stalno razmerje, njeno zvezo z delilnima točkama zveznice in z inverzijo.',
        'We study the set of points whose distances to two given points have a constant ratio, and its connection with the division points of the segment and with inversion.',
    ),
    prerequisites: [text('Lekcija o tangentah iz točke in inverzija (lekcija Potenca točke in inverzija).', 'The lesson on tangents from a point, and inversion (the lesson Power of a point and inversion).')],
    learningGoals: [
        text('Napoveš in nato utemeljiš z razvojem v koordinatah, kakšna je množica točk z danim razmerjem razdalj do dveh točk.', 'Predict, and then argue by expansion in coordinates, what the set of points with a given ratio of distances to two points is.'),
        text('Poiščeš notranjo in zunanjo delilno točko premice \\(AB\\) z danim razmerjem.', 'Find the internal and the external division point of the line \\(AB\\) with a given ratio.'),
        text('Veš, da sta \\(A\\) in \\(B\\) inverzni glede na to množico, kadar je ta krožnica.', 'Know that \\(A\\) and \\(B\\) are inverse with respect to this set when it is a circle.'),
    ],
    formulaBlocks: cg3Formulas,
    workedExamples: cg3Examples,
    steps: cg3Steps,
    sources,
    edgeCases: [
        text('V točki \\(P=B\\) razmerje ni določeno; graf to pove v odčitku in stanju.', 'At \\(P=B\\) the ratio is not defined; the graph says so in the readout and the status.'),
        text('Če \\(A\\) in \\(B\\) sovpadata, množica ni določena in graf to pove v stanju.', 'If \\(A\\) and \\(B\\) coincide, the set is not defined and the graph says so in the status.'),
        text('Pri \\(k=1\\) množica ni krožnica, ampak simetrala daljice \\(AB\\); zunanje delilne točke ni, inverza točke \\(A\\) pa ne kaže.', 'At \\(k=1\\) the set is not a circle but the perpendicular bisector of \\(AB\\); there is no external division point and no inverse of \\(A\\) is shown.'),
    ],
    unresolvedQuestions: [],
};

// ---- CG4 -------------------------------------------------------------------------------------------------------------------------

const cg4Formulas: readonly FormulaBlock[] = [
    {
        id: 'common-tangent-count',
        latex: 'd>r_1+r_2:\\ 4;\\ \\ d=r_1+r_2:\\ 3;\\ \\ |r_1-r_2|<d<r_1+r_2:\\ 2;\\ \\ d=|r_1-r_2|:\\ 1;\\ \\ d<|r_1-r_2|:\\ 0',
        notation: text(
            '\\(d\\) je razdalja središč, \\(r_1\\) in \\(r_2\\) sta polmera dveh različnih krožnic; za vsako lego je zapisano število skupnih tangent.',
            '\\(d\\) is the distance of the centres and \\(r_1\\) and \\(r_2\\) are the radii of two different circles; for each position the number of common tangents is written.',
        ),
        explanation: text(
            'Premica je skupna tangenta, če je od središč oddaljena za \\(r_1\\) in \\(r_2\\). Zunanji tangenti (krožnici sta na isti strani premice) obstajata dve, kadar je \\(d>|r_1-r_2|\\), ena pri \\(d=|r_1-r_2|\\), sicer ju ni. Notranji tangenti (krožnici sta na različnih straneh) obstajata dve, kadar je \\(d>r_1+r_2\\), ena pri \\(d=r_1+r_2\\), sicer ju ni. Vsota da navedena števila. Graf med položaji odloči z natančnim računom razdalje in polmerov.',
            'A line is a common tangent if its distances from the centres are \\(r_1\\) and \\(r_2\\). External tangents (the circles are on the same side of the line) number two when \\(d>|r_1-r_2|\\), one when \\(d=|r_1-r_2|\\), and none otherwise. Internal tangents (the circles are on different sides) number two when \\(d>r_1+r_2\\), one when \\(d=r_1+r_2\\), and none otherwise. The sum gives the listed numbers. The graph decides between the positions by an exact computation of the distance and the radii.',
        ),
    },
    {
        id: 'similarity-centre',
        latex: 'X=\\frac{r_2O_1-r_1O_2}{r_2-r_1},\\ \\ I=\\frac{r_2O_1+r_1O_2}{r_1+r_2}',
        notation: text(
            '\\(O_1\\), \\(O_2\\) sta središči in \\(r_1\\), \\(r_2\\) polmera krožnic; \\(X\\) je zunanje, \\(I\\) notranje središče raztega (pri \\(r_1\\ne r_2\\) za \\(X\\)).',
            '\\(O_1\\), \\(O_2\\) are the centres and \\(r_1\\), \\(r_2\\) the radii of the circles; \\(X\\) is the external and \\(I\\) the internal centre of similarity (for \\(X\\) with \\(r_1\\ne r_2\\)).',
        ),
        explanation: text(
            'Definicija: središče raztega je središče razteg, ki preslika eno krožnico v drugo. Razteg s pozitivnim koeficientom \\(\\tfrac{r_2}{r_1}\\) ima središče \\(X\\), zunanje središče raztega; razteg z negativnim koeficientom \\(-\\tfrac{r_2}{r_1}\\) ima središče \\(I\\), notranje središče raztega. Argument, da je tangenta iz središča raztega skupna tangenta: gre skozi središče raztega, zato se pri raztegu preslika sama vase, krožnica \\(c_1\\) pa v \\(c_2\\), tako da se premica, ki se dotika \\(c_1\\), dotika tudi \\(c_2\\). Raztegi so podrobneje v poglavju o središčnem raztegu.',
            'Definition: a centre of similarity is the centre of a dilation that maps one circle to the other. The dilation with the positive factor \\(\\tfrac{r_2}{r_1}\\) has the centre \\(X\\), the external centre of similarity; the dilation with the negative factor \\(-\\tfrac{r_2}{r_1}\\) has the centre \\(I\\), the internal centre of similarity. The argument that a tangent from a centre of similarity is a common tangent: it passes through the centre, so the dilation maps it to itself and maps \\(c_1\\) to \\(c_2\\), so a line touching \\(c_1\\) also touches \\(c_2\\). Dilations are treated in more detail in the chapter on the central dilation.',
        ),
    },
];

const cg4Examples: readonly WorkedExample[] = [
    {
        id: 'cg4-contact',
        title: text('Razdalja med dotikališčema zunanje tangente pri \\(r_1=3\\), \\(r_2=1\\), \\(d=10\\)', 'The distance between the points of contact of an external tangent for \\(r_1=3\\), \\(r_2=1\\), \\(d=10\\)'),
        calculationLatex: '|XO_1|^2-r_1^2=15^2-3^2=216,\\ \\ |XO_2|^2-r_2^2=5^2-1^2=24',
        resultLatex: '\\sqrt{216}-\\sqrt{24}=6\\sqrt6-2\\sqrt6=4\\sqrt6=\\sqrt{96}',
        check: text(
            'Dolžini tangentnih odsekov iz \\(X=(15,0)\\) sta po lekciji o tangentah \\(\\sqrt{216}\\) in \\(\\sqrt{24}\\); dotikališči sta na isti strani točke \\(X\\), zato je razdalja med njima razlika, \\(\\sqrt{96}\\approx9{,}798\\). Pri notranji tangenti iz \\(I=(\\tfrac{15}{2},0)\\) sta odseka \\(\\sqrt{47{,}25}\\) in \\(\\sqrt{5{,}25}\\) na različnih straneh točke \\(I\\), zato je razdalja vsota, \\(4\\sqrt{5{,}25}=\\sqrt{84}\\approx9{,}165\\).',
            'By the lesson on tangents the tangent segments from \\(X=(15,0)\\) are \\(\\sqrt{216}\\) and \\(\\sqrt{24}\\) long; the points of contact are on the same side of \\(X\\), so the distance between them is the difference, \\(\\sqrt{96}\\approx9.798\\). For an internal tangent from \\(I=(\\tfrac{15}{2},0)\\) the segments are \\(\\sqrt{47.25}\\) and \\(\\sqrt{5.25}\\) on different sides of \\(I\\), so the distance is the sum, \\(4\\sqrt{5.25}=\\sqrt{84}\\approx9.165\\).',
        ),
    },
];

const cg4Steps: readonly GuidedLessonStep[] = [
    step({
        id: 'cg4-predict', order: 1,
        title: text('Napoved števila skupnih tangent', 'Predicting the number of common tangents'),
        purpose: text('Napovedati, koliko premic se dotika obeh krožnic, glede na njuno lego, preden to odčitamo.', 'Predicting how many lines touch both circles depending on their position, before reading it.'),
        explanation: text(
            'Krožnici imata polmera \\(5\\) in \\(3\\), središči sta v \\((0,0)\\) in \\((13,0)\\). Skupna tangenta je premica, ki se dotika obeh krožnic. Preden premakneš drugo krožnico, napovej, koliko skupnih tangent imata krožnici, kadar sta daleč narazen, kadar se dotikata od zunaj, kadar se dotikata od znotraj, kadar se sekata in kadar leži ena v drugi.',
            'The circles have radii \\(5\\) and \\(3\\) and their centres are at \\((0,0)\\) and \\((13,0)\\). A common tangent is a line that touches both circles. Before you move the second circle, predict how many common tangents the circles have when they are far apart, when they touch externally, when they touch internally, when they cross and when one lies inside the other.',
        ),
        formulaIds: [],
        observationPrompt: text('Zapiši pet napovedi, nato preberi stanje in število skupnih tangent pri središču \\((13,0)\\).', 'Write down five predictions, then read the status and the number of common tangents at the centre \\((13,0)\\).'),
        expectedObservations: [text('Pri razdalji središč \\(13\\) sta krožnici ločeni: odčitek pove štiri skupne tangente, dve zunanji in dve notranji.', 'At the centre distance \\(13\\) the circles are separate: the readout says four common tangents, two external and two internal.')],
        scene: commonScene('cg4-predict-scene', [0, 0, 5], [13, 0, 3],
            'Krožnici s polmeroma \\(5\\) in \\(3\\), središči \\((0,0)\\) in \\((13,0)\\): štiri skupne tangente.',
            'Circles of radii \\(5\\) and \\(3\\) with centres \\((0,0)\\) and \\((13,0)\\): four common tangents.'),
    }),
    step({
        id: 'cg4-count', order: 2,
        title: text('Premakni drugo krožnico', 'Move the second circle'),
        purpose: text('Videti, kako se število skupnih tangent spreminja z razdaljo središč.', 'Seeing how the number of common tangents changes with the distance of the centres.'),
        explanation: text(
            'Polmera ostaneta \\(r_1=5\\), \\(r_2=3\\), zato je \\(r_1+r_2=8\\) in \\(|r_1-r_2|=2\\). Središče druge krožnice premikaj po osi \\(x\\) tako, da je razdalja središč \\(d\\) enaka \\(8\\), \\(7\\), \\(2\\) in \\(1\\), in pri vsaki preberi stanje in število skupnih tangent. Število se spremeni pri razdaljah \\(8\\) in \\(2\\), ko se krožnici dotakneta. O njem odloča natančen račun, ne videz slike.',
            'The radii stay \\(r_1=5\\), \\(r_2=3\\), so \\(r_1+r_2=8\\) and \\(|r_1-r_2|=2\\). Move the centre of the second circle along the \\(x\\) axis so that the distance of the centres \\(d\\) equals \\(8\\), \\(7\\), \\(2\\) and \\(1\\), and at each position read the status and the number of common tangents. The number changes at the distances \\(8\\) and \\(2\\), where the circles touch. It is decided by an exact computation, not by how the picture looks.',
        ),
        formulaIds: ['common-tangent-count'],
        observationPrompt: text('Nastavi središče druge krožnice na \\((8,0)\\), \\((7,0)\\), \\((2,0)\\) in \\((1,0)\\) ter pri vsakem preberi število skupnih tangent.', 'Set the centre of the second circle to \\((8,0)\\), \\((7,0)\\), \\((2,0)\\) and \\((1,0)\\) and read the number of common tangents at each.'),
        expectedObservations: [text('Pri \\(d=8\\) so tri tangente (zunanji dotik), pri \\(d=7\\) dve (krožnici se sekata), pri \\(d=2\\) ena (notranji dotik), pri \\(d=1\\) nobene (ena krožnica leži v drugi).', 'At \\(d=8\\) there are three tangents (external contact), at \\(d=7\\) two (the circles cross), at \\(d=2\\) one (internal contact), at \\(d=1\\) none (one circle lies inside the other).')],
        scene: commonScene('cg4-count-scene', [0, 0, 5], [8, 0, 3],
            'Polmera \\(5\\) in \\(3\\), središči \\((0,0)\\) in \\((8,0)\\): krožnici se od zunaj dotikata, tri skupne tangente.',
            'Radii \\(5\\) and \\(3\\), centres \\((0,0)\\) and \\((8,0)\\): the circles touch externally, three common tangents.'),
    }),
    step({
        id: 'cg4-external', order: 3,
        title: text('Zunanje središče raztega', 'The external centre of similarity'),
        purpose: text('Sestaviti zunanji skupni tangenti iz zunanjega središča raztega.', 'Constructing the two external common tangents from the external centre of similarity.'),
        explanation: text(
            'Krožnici imata polmera \\(3\\) in \\(1\\), središči sta \\((0,0)\\) in \\((10,0)\\). Razteg s pozitivnim koeficientom \\(\\tfrac13\\) preslika \\(c_1\\) v \\(c_2\\); njegovo središče \\(X\\) leži zunaj daljice \\(O_1O_2\\) z \\(|XO_1|:|XO_2|=3:1\\), zato je \\(|XO_1|=15\\), \\(|XO_2|=5\\) in \\(X=(15,0)\\). Tangenti iz \\(X\\) na \\(c_1\\) (konstrukcija iz lekcije o tangentah iz točke) sta po argumentu o raztegu skupni tangenti krožnic. Premica iz \\(X\\) ima s premico središč kot \\(\\arcsin\\tfrac{3}{15}\\approx11{,}54^\\circ\\).',
            'The circles have radii \\(3\\) and \\(1\\) and centres \\((0,0)\\) and \\((10,0)\\). The dilation with the positive factor \\(\\tfrac13\\) maps \\(c_1\\) to \\(c_2\\); its centre \\(X\\) lies outside the segment \\(O_1O_2\\) with \\(|XO_1|:|XO_2|=3:1\\), so \\(|XO_1|=15\\), \\(|XO_2|=5\\) and \\(X=(15,0)\\). By the argument about the dilation the two tangents from \\(X\\) to \\(c_1\\) (the construction from the lesson on tangents from a point) are common tangents of the circles. A line from \\(X\\) makes the angle \\(\\arcsin\\tfrac{3}{15}\\approx11.54^\\circ\\) with the line of centres.',
        ),
        formulaIds: ['similarity-centre'],
        workedExampleId: 'cg4-contact',
        observationPrompt: text('Preberi zunanje središče raztega in število skupnih tangent ter poišči tangenti, ki se sekata v njem.', 'Read the external centre of similarity and the number of common tangents, and find the tangents that meet at it.'),
        expectedObservations: [text('Zunanje središče raztega je \\((15,0)\\), skupnih tangent je \\(4\\); dve se sekata v \\(X\\).', 'The external centre of similarity is \\((15,0)\\), there are \\(4\\) common tangents; two of them meet at \\(X\\).')],
        scene: commonScene('cg4-external-scene', [0, 0, 3], [10, 0, 1],
            'Polmera \\(3\\) in \\(1\\), središči \\((0,0)\\) in \\((10,0)\\): zunanje središče raztega \\((15,0)\\), štiri tangente.',
            'Radii \\(3\\) and \\(1\\), centres \\((0,0)\\) and \\((10,0)\\): the external centre of similarity \\((15,0)\\), four tangents.'),
    }),
    step({
        id: 'cg4-internal', order: 4,
        title: text('Notranje središče raztega', 'The internal centre of similarity'),
        purpose: text('Sestaviti notranji skupni tangenti iz notranjega središča raztega.', 'Constructing the two internal common tangents from the internal centre of similarity.'),
        explanation: text(
            'Razteg z negativnim koeficientom \\(-\\tfrac13\\) tudi preslika \\(c_1\\) v \\(c_2\\); njegovo središče \\(I\\) leži med središčema z \\(|IO_1|:|IO_2|=3:1\\) in \\(|IO_1|+|IO_2|=10\\), zato je \\(|IO_1|=7{,}5\\) in \\(I=(\\tfrac{15}{2},0)\\). Isti argument kot prej: tangenti iz \\(I\\) na \\(c_1\\) se preslikata vsaka vase, zato sta skupni tangenti krožnic; ker središče raztega leži med krožnicama, prečkata prostor med njima. Premica iz \\(I\\) ima s premico središč kot \\(\\arcsin\\tfrac{3}{7{,}5}=\\arcsin0{,}4\\approx23{,}58^\\circ\\).',
            'The dilation with the negative factor \\(-\\tfrac13\\) also maps \\(c_1\\) to \\(c_2\\); its centre \\(I\\) lies between the centres with \\(|IO_1|:|IO_2|=3:1\\) and \\(|IO_1|+|IO_2|=10\\), so \\(|IO_1|=7.5\\) and \\(I=(\\tfrac{15}{2},0)\\). The same argument as before: each of the two tangents from \\(I\\) to \\(c_1\\) is mapped to itself, so they are common tangents of the circles; since the centre of similarity lies between the circles, they cross the space between them. A line from \\(I\\) makes the angle \\(\\arcsin\\tfrac{3}{7.5}=\\arcsin0.4\\approx23.58^\\circ\\) with the line of centres.',
        ),
        formulaIds: ['similarity-centre'],
        observationPrompt: text('Preberi notranje središče raztega in poišči tangenti, ki prečkata med krožnicama.', 'Read the internal centre of similarity and find the tangents that cross between the circles.'),
        expectedObservations: [text('Notranje središče raztega je \\((\\tfrac{15}{2},0)=(7{,}5;\\ 0)\\); skupaj z zunanjima sta to vse štiri skupne tangente.', 'The internal centre of similarity is \\((\\tfrac{15}{2},0)=(7.5,\\ 0)\\); together with the external two these are all four common tangents.')],
        scene: commonScene('cg4-internal-scene', [0, 0, 3], [10, 0, 1],
            'Polmera \\(3\\) in \\(1\\), središči \\((0,0)\\) in \\((10,0)\\): notranje središče raztega \\((\\tfrac{15}{2},0)\\).',
            'Radii \\(3\\) and \\(1\\), centres \\((0,0)\\) and \\((10,0)\\): the internal centre of similarity \\((\\tfrac{15}{2},0)\\).'),
    }),
    step({
        id: 'cg4-equal', order: 5,
        title: text('Enaka polmera', 'Equal radii'),
        purpose: text('Videti, da pri enakih polmerih zunanjega središča raztega ni in sta zunanji tangenti vzporedni.', 'Seeing that for equal radii there is no external centre of similarity and the external tangents are parallel.'),
        explanation: text(
            'Polmer prve krožnice je \\(3\\), središči sta \\((0,0)\\) in \\((10,0)\\). Zunanje središče raztega \\(X\\) leži na premici središč. Najprej nastavi polmer druge krožnice na \\(2\\), nato na \\(3\\). Preden preveriš, napovej, kam gre \\(X\\) pri \\(r_2=2\\) in kaj se zgodi z njim pri \\(r_2=3\\), ko sta polmera enaka.',
            'The radius of the first circle is \\(3\\) and the centres are \\((0,0)\\) and \\((10,0)\\). The external centre of similarity \\(X\\) lies on the line of centres. First set the radius of the second circle to \\(2\\), then to \\(3\\). Before you check, predict where \\(X\\) goes at \\(r_2=2\\) and what happens to it at \\(r_2=3\\), when the radii are equal.',
        ),
        formulaIds: [],
        observationPrompt: text('Zapiši napoved, nato nastavi \\(r_2=2\\) in \\(r_2=3\\), preberi zunanje in notranje središče raztega ter stanje in preveri napoved.', 'Write down your prediction, then set \\(r_2=2\\) and \\(r_2=3\\), read the external and the internal centre of similarity and the status, and check the prediction.'),
        expectedObservations: [
            text('Pri \\(r_2=2\\) je zunanje središče raztega \\((30,0)\\): \\(|XO_1|:|XO_2|=3:2\\) in \\(|XO_1|-|XO_2|=10\\), zato \\(|XO_1|=30\\). Večji ko je \\(r_2\\) proti \\(r_1\\), dlje je \\(X\\).', 'At \\(r_2=2\\) the external centre of similarity is \\((30,0)\\): \\(|XO_1|:|XO_2|=3:2\\) and \\(|XO_1|-|XO_2|=10\\), so \\(|XO_1|=30\\). The closer \\(r_2\\) comes to \\(r_1\\), the farther \\(X\\) is.'),
            text('Pri \\(r_2=3\\) zunanjega središča raztega ni, stanje to pove: koeficient \\(\\tfrac{r_2}{r_1}\\) je \\(1\\), razteg s tem koeficientom je premik. Zunanji tangenti sta vzporedni s premico središč in oddaljeni \\(3\\) od nje: \\(y=3\\) in \\(y=-3\\). Notranje središče raztega je razpolovišče \\((5,0)\\), tangent je \\(4\\), notranji tangenti pa imata s premico središč kot \\(\\arcsin\\tfrac35\\approx36{,}87^\\circ\\).', 'At \\(r_2=3\\) there is no external centre of similarity and the status says so: the factor \\(\\tfrac{r_2}{r_1}\\) is \\(1\\), and the dilation with this factor is a translation. The external tangents are parallel to the line of centres at the distance \\(3\\) from it: \\(y=3\\) and \\(y=-3\\). The internal centre of similarity is the midpoint \\((5,0)\\), there are \\(4\\) tangents, and the internal tangents make the angle \\(\\arcsin\\tfrac35\\approx36.87^\\circ\\) with the line of centres.'),
        ],
        scene: commonScene('cg4-equal-scene', [0, 0, 3], [10, 0, 3],
            'Polmera \\(3\\) in \\(3\\), središči \\((0,0)\\) in \\((10,0)\\): zunanjega središča raztega ni, notranje je \\((5,0)\\).',
            'Radii \\(3\\) and \\(3\\), centres \\((0,0)\\) and \\((10,0)\\): no external centre of similarity, the internal one is \\((5,0)\\).'),
    }),
    step({
        id: 'cg4-touching', order: 6,
        title: text('Dotikanje', 'Touching positions'),
        purpose: text('Videti, kaj se zgodi z notranjima tangentama, ko se krožnici dotakneta.', 'Seeing what happens to the internal tangents when the circles touch.'),
        explanation: text(
            'Krožnici imata polmera \\(3\\) in \\(1\\), prva ima središče \\((0,0)\\). Pri središču druge v \\((4,0)\\) je \\(d=4=r_1+r_2\\): krožnici se od zunaj dotikata. Pri središču v \\((2,0)\\) je \\(d=2=r_1-r_2\\): dotikata se od znotraj. Preden preveriš, napovej, kje leži notranje središče raztega, kadar je \\(d=r_1+r_2\\), in koliko skupnih tangent imata krožnici v obeh primerih.',
            'The circles have radii \\(3\\) and \\(1\\) and the first has its centre at \\((0,0)\\). With the centre of the second at \\((4,0)\\) we have \\(d=4=r_1+r_2\\): the circles touch externally. With the centre at \\((2,0)\\) we have \\(d=2=r_1-r_2\\): they touch internally. Before you check, predict where the internal centre of similarity lies when \\(d=r_1+r_2\\), and how many common tangents the circles have in both cases.',
        ),
        formulaIds: [],
        observationPrompt: text('Nastavi središče druge krožnice na \\((4,0)\\) in nato na \\((2,0)\\); preberi število tangent in središči raztega.', 'Set the centre of the second circle to \\((4,0)\\) and then to \\((2,0)\\); read the number of tangents and the centres of similarity.'),
        expectedObservations: [
            text('Pri \\((4,0)\\) so tri tangente, notranje središče raztega je \\((3,0)\\), to je točka dotika; zunanje je \\((6,0)\\).', 'At \\((4,0)\\) there are three tangents, the internal centre of similarity is \\((3,0)\\), the point of contact; the external one is \\((6,0)\\).'),
            text('Pri \\((2,0)\\) je ena tangenta, zunanje središče raztega je \\((3,0)\\), to je točka dotika.', 'At \\((2,0)\\) there is one tangent, the external centre of similarity is \\((3,0)\\), the point of contact.'),
        ],
        scene: commonScene('cg4-touching-scene', [0, 0, 3], [4, 0, 1],
            'Polmera \\(3\\) in \\(1\\), središči \\((0,0)\\) in \\((4,0)\\): zunanji dotik v \\((3,0)\\), tri tangente.',
            'Radii \\(3\\) and \\(1\\), centres \\((0,0)\\) and \\((4,0)\\): external contact at \\((3,0)\\), three tangents.'),
    }),
    step({
        id: 'cg4-explore', order: 7,
        title: text('Prosto raziskovanje', 'Free exploration'),
        purpose: text('Spreminjati krožnici in poiskati posebne lege: sosrediščni in sovpadajoči krožnici.', 'Changing the circles and finding special positions: concentric and coincident circles.'),
        explanation: text(
            'Spreminjaj središči in polmera obeh krožnic. Postavi središči v isto točko: če sta polmera različna, sta krožnici sosrediščni in skupnih tangent ni. Če sta tudi polmera enaka, krožnici sovpadata, skupnih tangent je neskončno mnogo in graf nobene ne nariše. Slika kaže posamezne primere; število tangent v splošnem ureja pravilo iz koraka 2.',
            'Change the centres and radii of both circles. Put the centres at the same point: if the radii differ, the circles are concentric and there are no common tangents. If the radii are equal too, the circles coincide, there are infinitely many common tangents and the graph draws none. The picture shows single cases; in general the number of tangents is given by the rule from step 2.',
        ),
        formulaIds: [],
        observationPrompt: text('Postavi obe središči v \\((0,0)\\) s polmeroma \\(5\\) in \\(3\\), nato oba polmera na \\(5\\) in preberi stanje.', 'Put both centres at \\((0,0)\\) with radii \\(5\\) and \\(3\\), then both radii at \\(5\\), and read the status.'),
        expectedObservations: [
            text('Pri polmerih \\(5\\) in \\(3\\) sta krožnici sosrediščni in skupnih tangent ni.', 'With radii \\(5\\) and \\(3\\) the circles are concentric and there are no common tangents.'),
            text('Pri enakih polmerih krožnici sovpadata: skupnih tangent je neskončno mnogo, nobene ne narišemo.', 'With equal radii the circles coincide: there are infinitely many common tangents, none is drawn.'),
        ],
        scene: commonScene('cg4-explore-scene', [0, 0, 3], [10, 0, 1],
            'Začetni primer: polmera \\(3\\) in \\(1\\), središči \\((0,0)\\) in \\((10,0)\\).',
            'The starting case: radii \\(3\\) and \\(1\\), centres \\((0,0)\\) and \\((10,0)\\).'),
    }),
];

const cg4: GuidedLesson = {
    demonstrationId: 'circle-construction',
    title: text('Skupne tangente dveh krožnic', 'Common tangents of two circles'),
    summary: text(
        'Obravnavamo premice, ki se dotikajo dveh krožnic hkrati, njihovo število glede na razdaljo središč in središči raztega, v katerih se te premice sekajo.',
        'We study the lines that touch two circles at once, how many there are depending on the distance of the centres, and the centres of similarity where these lines meet.',
    ),
    prerequisites: [text('Lekcija o tangentah iz točke in središčni razteg.', 'The lesson on tangents from a point, and the central dilation.')],
    learningGoals: [
        text('Napoveš in nato utemeljiš število skupnih tangent glede na razdaljo središč in polmera.', 'Predict, and then justify, the number of common tangents from the distance of the centres and the radii.'),
        text('Sestaviš zunanji in notranji tangenti iz zunanjega in notranjega središča raztega.', 'Construct the external and the internal tangents from the external and the internal centre of similarity.'),
        text('Poznaš posebna primera enakih polmerov in dotikanja.', 'Know the special cases of equal radii and of touching circles.'),
    ],
    formulaBlocks: cg4Formulas,
    workedExamples: cg4Examples,
    steps: cg4Steps,
    sources,
    edgeCases: [
        text('Pri enakih polmerih zunanjega središča raztega ni in sta zunanji tangenti vzporedni.', 'With equal radii there is no external centre of similarity and the external tangents are parallel.'),
        text('Sosrediščni krožnici nimata skupne tangente; sovpadajoči imata neskončno mnogo, graf pa nobene ne nariše.', 'Concentric circles have no common tangent; coincident circles have infinitely many and the graph draws none.'),
        text('Koti in razdalje med dotikališči v besedilu so približni (zaokroženi); število tangent odloči natančen račun.', 'The angles and the distances between the points of contact in the text are approximate (rounded); the number of tangents is decided by an exact computation.'),
    ],
    unresolvedQuestions: [],
};

export const circleTangentsLesson: GuidedLesson = cg1;
export const circleRadicalLesson: GuidedLesson = cg2;
export const circleApolloniusLesson: GuidedLesson = cg3;
export const circleCommonTangentsLesson: GuidedLesson = cg4;
