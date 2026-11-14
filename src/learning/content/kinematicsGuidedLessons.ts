/**
 * Guided lessons of the kinematics family, batch A (docs/specs/kinematics-lessons.md): KN1, position, velocity and acceleration vectors, and KN2, speed and
 * parametrization, both on `curve-kinematics` (KinematicsGraph). Each is the lesson of one section of the kinematics chapter (kinematicsChapterRegistry.ts
 * adapts them on request; the lesson catalog holds none, as it keeps one lesson per Demonstration). Scenes use only the `kinematics` actions the graph registers
 * (`set-motion`, `set-params`, `set-time`) and every scene starts from the Demonstration default and names what it sets; no scene starts playback. Every number the
 * text quotes is a readout of the graph for that scene, a value the learner reads after an action the text asks for, or a value of a formula shown in the same step;
 * the numbers are listed per step in docs/reviews/feature-streams/families-prep/notes/f3-kin-a.md.
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

/** The fields `set-params` may carry (the stored fields of the graph other than the motion). */
export interface KinematicsSceneParams {
    readonly v0?: number;
    readonly alpha?: number;
    readonly radius?: number;
    readonly omega?: number;
    readonly b?: number;
    readonly showVelocity?: boolean;
    readonly showAcceleration?: boolean;
    readonly split?: boolean;
    readonly trace?: boolean;
}

/** What a kinematics scene sets: the motion (the Demonstration default is the cycloid), its parameters and switches, and the time in seconds. */
export interface KinematicsSceneSpec {
    readonly motion?: 'cycloid' | 'cardioid' | 'rose' | 'spiral' | 'projectile' | 'circular';
    readonly params?: KinematicsSceneParams;
    readonly t: number;
}

/** The actions of a kinematics scene: the Demonstration default, the motion (it resets the time), the parameters, then the time. */
export const kinematicsSceneActions = (id: string, spec: KinematicsSceneSpec): LessonAction[] => [
    {kind: 'prepared-scene', sceneId: id, source: 'demonstration-default'},
    ...(spec.motion !== undefined && spec.motion !== 'cycloid' ? [{kind: 'kinematics', operation: 'set-motion', motion: spec.motion} as const] : []),
    ...(spec.params !== undefined ? [{kind: 'kinematics', operation: 'set-params', ...spec.params} as const] : []),
    {kind: 'kinematics', operation: 'set-time', t: spec.t},
];

const kinematicsScene = (id: string, spec: KinematicsSceneSpec, sl: string, en: string): LessonScene =>
    ({id, basedOn: 'demonstration-default', actions: kinematicsSceneActions(id, spec), expectedState: text(sl, en)});

/** The unit circle of KN2: radius 1 m and angular velocity 1 rad/s, so the uniform point has speed 1 m/s; the angle runs as t + b sin t. */
export const KN2_PARAMS = {radius: 1, omega: 1, b: 0.5} as const;
/** Moment at which the angle t + 0,5 sin t reaches pi/2 (solved numerically; rounded to four decimals, as quoted in the text). */
export const KN2_QUARTER_TURN = 1.1206;

const noArrows: KinematicsSceneParams = {showVelocity: false, showAcceleration: false};
const kn2Circle = (extra: KinematicsSceneParams = {}): KinematicsSceneParams => ({...KN2_PARAMS, ...extra});

// ---- KN1 -------------------------------------------------------------------------------------------------------------------------

const kn1Formulas: readonly FormulaBlock[] = [
    {
        id: 'velocity-acceleration',
        latex: "v(t)=r'(t),\\qquad a(t)=r''(t)",
        notation: text(
            '\\(r(t)\\) je lega točke ob času \\(t\\), \\(v(t)\\) njena hitrost (vektor) in \\(a(t)\\) njen pospešek (vektor); velikost hitrosti je \\(|v|\\).',
            '\\(r(t)\\) is the position of the point at time \\(t\\), \\(v(t)\\) its velocity (a vector) and \\(a(t)\\) its acceleration (a vector); the length of the velocity is the speed \\(|v|\\).',
        ),
        explanation: text(
            'Definicija: hitrost je prvi odvod lege po času, pospešek je odvod hitrosti, torej drugi odvod lege. Hitrost leži na tangenti poti in je dolga \\(|v|\\); pospešek pove, kako hitro se hitrost spreminja, in ni nujno vzporeden s hitrostjo. Sliki, ki to kažeta, sta ponazoritvi definicije: puščici sta \\(r\'\\) in \\(r\'\'\\) narisane poti. Pot je ista krivulja, kakor koli imenujemo parameter; imenovanje parametra za čas daje poti gibanje.',
            'Definition: the velocity is the first derivative of the position with respect to time, the acceleration is the derivative of the velocity, that is the second derivative of the position. The velocity lies on the tangent of the path and has length \\(|v|\\); the acceleration tells how fast the velocity changes and need not be parallel to the velocity. The pictures that show this are illustrations of the definition: the arrows are \\(r\'\\) and \\(r\'\'\\) of the drawn path. The path is the same curve whatever the parameter is called; calling the parameter time gives the path a motion.',
        ),
    },
    {
        id: 'cycloid-derivatives',
        latex: "r(t)=(t-\\sin t;\\,1-\\cos t),\\quad r'(t)=(1-\\cos t;\\,\\sin t),\\quad r''(t)=(\\sin t;\\,\\cos t)",
        notation: text(
            'Cikloida: točka na robu kolesa s polmerom \\(1\\ \\mathrm{m}\\), ki se kotali po tleh; komponente so ločene s podpičjem.',
            'The cycloid: a point on the rim of a wheel of radius \\(1\\ \\mathrm{m}\\) rolling on the ground; the components are separated by a semicolon.',
        ),
        explanation: text(
            'Odvajanje po komponentah da hitrost in pospešek cikloide. Iz njih preberemo vsak odčitek tega razdelka: \\(r\'(t)=(0;\\,0)\\) samo pri \\(t=0\\) (in pri \\(t=2\\pi\\)), \\(r\'\'(t)\\) pa ima dolžino \\(1\\ \\mathrm{m/s^2}\\) povsod.',
            'Differentiating by components gives the velocity and acceleration of the cycloid. Every readout of this section can be read from them: \\(r\'(t)=(0;\\,0)\\) only at \\(t=0\\) (and at \\(t=2\\pi\\)), and \\(r\'\'(t)\\) has length \\(1\\ \\mathrm{m/s^2}\\) everywhere.',
        ),
    },
];

const kn1Examples: readonly WorkedExample[] = [
    {
        id: 'kn1-top',
        title: text('Hitrost in pospešek na vrhu loka, \\(t=\\pi\\)', 'Velocity and acceleration at the top of the arch, \\(t=\\pi\\)'),
        calculationLatex: "r'(\\pi)=(1-\\cos\\pi;\\,\\sin\\pi)=(1-(-1);\\,0),\\qquad r''(\\pi)=(\\sin\\pi;\\,\\cos\\pi)=(0;\\,-1)",
        resultLatex: "r'(\\pi)=(2;\\,0),\\qquad r''(\\pi)=(0;\\,-1)",
        check: text(
            'Odčitka hitrosti in pospeška sta \\((2;\\,0)\\ \\mathrm{m/s}\\) in \\((0;\\,-1)\\ \\mathrm{m/s^2}\\). Točka se giblje vodoravno, pospešek kaže navpično navzdol.',
            'The readouts of the velocity and acceleration are \\((2;\\,0)\\ \\mathrm{m/s}\\) and \\((0;\\,-1)\\ \\mathrm{m/s^2}\\). The point moves horizontally, the acceleration points straight down.',
        ),
    },
];

const kn1Steps: readonly GuidedLessonStep[] = [
    step({
        id: 'kn1-start', order: 1,
        title: text('Točka na poti ob času 0', 'A point on a path at time 0'),
        purpose: text('Napovedati, kako se bo točka začela gibati, preden jo premaknemo.', 'Predicting how the point will start to move before it is moved.'),
        explanation: text(
            'Kolo s polmerom \\(1\\ \\mathrm{m}\\) se kotali po tleh, na robu pa ima označeno točko. Slika kaže pot te točke (cikloido) in točko ob času \\(t=0\\): njena lega je \\(r(0)=(0;\\,0)\\ \\mathrm{m}\\). Čas \\(t\\) merimo v sekundah, dolžine v metrih. Preden premakneš čas, napovej: v katero smer se bo točka začela premikati, vodoravno naprej ali navpično navzgor, in kako hitro?',
            'A wheel of radius \\(1\\ \\mathrm{m}\\) rolls on the ground, and a point on its rim is marked. The picture shows the path of that point (a cycloid) and the point at time \\(t=0\\): its position is \\(r(0)=(0;\\,0)\\ \\mathrm{m}\\). Time \\(t\\) is measured in seconds, lengths in metres. Before you move the time, predict: in which direction will the point start to move, horizontally forward or vertically up, and how fast?',
        ),
        formulaIds: [],
        observationPrompt: text('Zapiši napoved, nato v odčitku preberi lego ob času \\(0\\).', 'Write down your prediction, then read the position at time \\(0\\) in the readout.'),
        expectedObservations: [text('Ob \\(t=0\\) je lega \\((0;\\,0)\\ \\mathrm{m}\\), točka je na tleh.', 'At \\(t=0\\) the position is \\((0;\\,0)\\ \\mathrm{m}\\), the point is on the ground.')],
        scene: kinematicsScene('kn1-start-scene', {params: noArrows, t: 0},
            'Cikloida ob času \\(0\\), brez puščic; lega \\((0;\\,0)\\ \\mathrm{m}\\).',
            'The cycloid at time \\(0\\), no arrows; position \\((0;\\,0)\\ \\mathrm{m}\\).'),
    }),
    step({
        id: 'kn1-trace', order: 2,
        title: text('Pot, ki jo gradi čas', 'The path that time builds'),
        purpose: text('Videti, da čas samo vodi točko po isti poti.', 'Seeing that time only leads the point along the same path.'),
        explanation: text(
            'Premakni drsnik časa ali pritisni Predvajaj: debela črta kaže pot od \\(t=0\\) do izbranega časa, bleda črta pa vso pot. Pri \\(t=\\pi/2\\), to je okoli \\(1{,}57\\ \\mathrm{s}\\), je točka v \\(r=(0{,}571;\\,1)\\ \\mathrm{m}\\). Pot je ista krivulja, kakor koli imenujemo parameter; ker ga imenujemo čas, se točka giblje in lahko vprašamo, kako hitro. Napovej, v katero smer kaže hitrost v tej točki, preden jo prikažemo.',
            'Move the time slider or press Play: the thick line shows the path from \\(t=0\\) to the chosen time, and the faint line shows the whole path. At \\(t=\\pi/2\\), that is about \\(1.57\\ \\mathrm{s}\\), the point is at \\(r=(0.571;\\,1)\\ \\mathrm{m}\\). The path is the same curve whatever the parameter is called; because we call it time, the point moves and we can ask how fast. Predict in which direction the velocity points at this point before it is shown.',
        ),
        formulaIds: [],
        observationPrompt: text('Preberi lego in čas v odčitku.', 'Read the position and the time in the readout.'),
        expectedObservations: [text('Lega je \\((0{,}571;\\,1)\\ \\mathrm{m}\\), prepotovani del poti je debel.', 'The position is \\((0.571;\\,1)\\ \\mathrm{m}\\), the travelled part of the path is thick.')],
        scene: kinematicsScene('kn1-trace-scene', {params: noArrows, t: Math.PI / 2},
            'Cikloida ob \\(t=\\pi/2\\), brez puščic; lega \\((0{,}571;\\,1)\\ \\mathrm{m}\\).',
            'The cycloid at \\(t=\\pi/2\\), no arrows; position \\((0.571;\\,1)\\ \\mathrm{m}\\).'),
    }),
    step({
        id: 'kn1-velocity', order: 3,
        title: text('Hitrost je tangentna na pot', 'The velocity is tangent to the path'),
        purpose: text('Brati vektor hitrosti kot puščico na tangenti, dolgo \\(|v|\\).', 'Reading the velocity vector as an arrow on the tangent, of length \\(|v|\\).'),
        explanation: text(
            'Vklopljena je hitrost \\(v=r\'(t)\\), puščica iz točke. Pri \\(t=\\pi/2\\) je \\(v=(1;\\,1)\\ \\mathrm{m/s}\\), velikost hitrosti pa \\(|v|=\\sqrt2\\approx1{,}414\\ \\mathrm{m/s}\\). Puščica leži na tangenti poti, njena dolžina pa je sorazmerna z \\(|v|\\) v merilu, ki ga pove napis na grafu. To je ponazoritev definicije: narisana puščica je odvod narisane poti.',
            'The velocity \\(v=r\'(t)\\) is on, an arrow from the point. At \\(t=\\pi/2\\) the velocity is \\(v=(1;\\,1)\\ \\mathrm{m/s}\\) and the speed is \\(|v|=\\sqrt2\\approx1.414\\ \\mathrm{m/s}\\). The arrow lies on the tangent of the path, and its length is proportional to \\(|v|\\) in the scale stated by the caption on the graph. This is an illustration of the definition: the drawn arrow is the derivative of the drawn path.',
        ),
        formulaIds: ['velocity-acceleration', 'cycloid-derivatives'],
        observationPrompt: text('Preberi hitrost in njeno velikost ter merilo hitrosti.', 'Read the velocity, its length, and the scale of the velocity.'),
        expectedObservations: [text('Hitrost je \\((1;\\,1)\\ \\mathrm{m/s}\\), velikost \\(1{,}414\\ \\mathrm{m/s}\\), puščica leži na tangenti.', 'The velocity is \\((1;\\,1)\\ \\mathrm{m/s}\\), its length \\(1.414\\ \\mathrm{m/s}\\), the arrow lies on the tangent.')],
        scene: kinematicsScene('kn1-velocity-scene', {params: {showVelocity: true, showAcceleration: false}, t: Math.PI / 2},
            'Cikloida ob \\(t=\\pi/2\\) s puščico hitrosti: \\(v=(1;\\,1)\\ \\mathrm{m/s}\\), \\(|v|=1{,}414\\ \\mathrm{m/s}\\).',
            'The cycloid at \\(t=\\pi/2\\) with the velocity arrow: \\(v=(1;\\,1)\\ \\mathrm{m/s}\\), \\(|v|=1.414\\ \\mathrm{m/s}\\).'),
    }),
    step({
        id: 'kn1-acceleration', order: 4,
        title: text('Pospešek ni vzporeden s hitrostjo', 'The acceleration is not parallel to the velocity'),
        purpose: text('Napovedati smer pospeška na vrhu loka in jo primerjati s hitrostjo.', 'Predicting the direction of the acceleration at the top of the arch and comparing it with the velocity.'),
        explanation: text(
            'Ob \\(t=\\pi\\) je točka na vrhu loka in teče vodoravno. Napovej, kam kaže pospešek \\(a=r\'\'(t)\\). Zdaj sta narisani obe puščici, hitrost s polno črto in pospešek s črtkano, vsaka v svojem merilu (merili sta različni in sta napisani na grafu). Odčitek: \\(v=(2;\\,0)\\ \\mathrm{m/s}\\) in \\(a=(0;\\,-1)\\ \\mathrm{m/s^2}\\). Točka se giblje naprej, pospešek pa kaže navzdol, v notranjost zavoja poti. Pospešek pove, kako hitro se hitrost spreminja, in ne kaže nujno v smeri gibanja. Slika je ponazoritev definicije.',
            'At \\(t=\\pi\\) the point is at the top of the arch and runs horizontally. Predict where the acceleration \\(a=r\'\'(t)\\) points. Both arrows are now drawn, the velocity with a solid line and the acceleration with a dashed one, each in its own scale (the scales differ and are written on the graph). The readout: \\(v=(2;\\,0)\\ \\mathrm{m/s}\\) and \\(a=(0;\\,-1)\\ \\mathrm{m/s^2}\\). The point moves forward, but the acceleration points down, into the bend of the path. The acceleration tells how fast the velocity changes and does not necessarily point in the direction of motion. The picture is an illustration of the definition.',
        ),
        formulaIds: ['velocity-acceleration', 'cycloid-derivatives'],
        workedExampleId: 'kn1-top',
        observationPrompt: text('Primerjaj smeri hitrosti in pospeška ter obe merili.', 'Compare the directions of the velocity and the acceleration and the two scales.'),
        expectedObservations: [text('Hitrost je \\((2;\\,0)\\ \\mathrm{m/s}\\), pospešek \\((0;\\,-1)\\ \\mathrm{m/s^2}\\), pravokotna sta.', 'The velocity is \\((2;\\,0)\\ \\mathrm{m/s}\\), the acceleration \\((0;\\,-1)\\ \\mathrm{m/s^2}\\), and they are perpendicular.')],
        scene: kinematicsScene('kn1-acceleration-scene', {t: Math.PI},
            'Cikloida ob \\(t=\\pi\\) s puščicama hitrosti in pospeška: \\(v=(2;\\,0)\\ \\mathrm{m/s}\\), \\(a=(0;\\,-1)\\ \\mathrm{m/s^2}\\).',
            'The cycloid at \\(t=\\pi\\) with the velocity and acceleration arrows: \\(v=(2;\\,0)\\ \\mathrm{m/s}\\), \\(a=(0;\\,-1)\\ \\mathrm{m/s^2}\\).'),
    }),
    step({
        id: 'kn1-cusp', order: 5,
        title: text('Hitrost \\(0\\), pospešek ne', 'Velocity \\(0\\), acceleration not'),
        purpose: text('Videti, da lahko točka miruje v trenutku, ko se njena hitrost spreminja.', 'Seeing that a point can be at rest at the moment its velocity changes.'),
        explanation: text(
            'Ob \\(t=0\\) je točka v izhodišču z odčitkom \\(v=(0;\\,0)\\ \\mathrm{m/s}\\): miruje, zato graf pove, da je hitrost \\(0\\) in da puščice hitrosti ni (špica cikloide). Pospešek pa ni \\(0\\): \\(a=(0;\\,1)\\ \\mathrm{m/s^2}\\). Hitrost je v tem trenutku \\(0\\), a se spreminja, zato se točka takoj začne premikati, in sicer navpično navzgor. To je odgovor na napoved iz prvega koraka. Hitrost \\(0\\) ne pomeni pospeška \\(0\\); to preberemo iz \\(r\'(0)=(0;\\,0)\\) in \\(r\'\'(0)=(0;\\,1)\\).',
            'At \\(t=0\\) the point is at the origin with the readout \\(v=(0;\\,0)\\ \\mathrm{m/s}\\): it is at rest, so the graph says that the velocity is \\(0\\) and that there is no velocity arrow (the cusp of the cycloid). The acceleration is not \\(0\\), however: \\(a=(0;\\,1)\\ \\mathrm{m/s^2}\\). The velocity is \\(0\\) at this moment but changing, so the point starts to move at once, vertically up. This answers the prediction from the first step. A velocity \\(0\\) does not mean an acceleration \\(0\\); we read this from \\(r\'(0)=(0;\\,0)\\) and \\(r\'\'(0)=(0;\\,1)\\).',
        ),
        formulaIds: ['cycloid-derivatives'],
        observationPrompt: text('Preberi hitrost, velikost hitrosti in pospešek ter stanje pod odčitki.', 'Read the velocity, the speed and the acceleration, and the status below the readouts.'),
        expectedObservations: [text('Hitrost je \\((0;\\,0)\\ \\mathrm{m/s}\\), pospešek \\((0;\\,1)\\ \\mathrm{m/s^2}\\), stanje pove, da je hitrost \\(0\\).', 'The velocity is \\((0;\\,0)\\ \\mathrm{m/s}\\), the acceleration \\((0;\\,1)\\ \\mathrm{m/s^2}\\), the status says the velocity is \\(0\\).')],
        scene: kinematicsScene('kn1-cusp-scene', {t: 0},
            'Cikloida ob \\(t=0\\): \\(v=(0;\\,0)\\ \\mathrm{m/s}\\), \\(|v|=0\\ \\mathrm{m/s}\\), \\(a=(0;\\,1)\\ \\mathrm{m/s^2}\\); puščice hitrosti ni.',
            'The cycloid at \\(t=0\\): \\(v=(0;\\,0)\\ \\mathrm{m/s}\\), \\(|v|=0\\ \\mathrm{m/s}\\), \\(a=(0;\\,1)\\ \\mathrm{m/s^2}\\); there is no velocity arrow.'),
    }),
    step({
        id: 'kn1-explore', order: 6,
        title: text('Prosto raziskovanje', 'Free exploration'),
        purpose: text('Isti pogled uporabiti na drugih krivuljah.', 'Applying the same view to other curves.'),
        explanation: text(
            'Na seznamu Gibanje izberi kardioido, rožo ali spiralo in premikaj čas. Poišči trenutek, ko je hitrost \\(0\\) ali blizu \\(0\\), in trenutek, ko pospešek ni pravokoten na hitrost. Pri vsaki krivulji se merili puščic spremenita in sta napisani na grafu, zato dolžin puščic ne primerjaj med krivuljami. Izbrati smeš tudi poševni met ali kroženje; tema gibanjema sta namenjeni naslednji lekciji.',
            'In the Motion list choose the cardioid, the rose or the spiral and move the time. Find a moment when the velocity is \\(0\\) or close to \\(0\\), and a moment when the acceleration is not perpendicular to the velocity. For each curve the scales of the arrows change and are written on the graph, so do not compare arrow lengths between curves. You may also choose the projectile or the circular motion; the following lessons are about those.',
        ),
        formulaIds: [],
        observationPrompt: text('Poišči krivuljo in čas, pri katerem je hitrost \\(0\\), pospešek pa ni.', 'Find a curve and a time at which the velocity is \\(0\\) but the acceleration is not.'),
        expectedObservations: [text('Pri špicah (cikloida ob \\(t=0\\) in \\(t=2\\pi\\), kardioida ob \\(t=\\pi\\)) je hitrost \\(0\\); pospešek tam ni \\(0\\).', 'At cusps (the cycloid at \\(t=0\\) and \\(t=2\\pi\\), the cardioid at \\(t=\\pi\\)) the velocity is \\(0\\); the acceleration there is not \\(0\\).')],
        scene: kinematicsScene('kn1-explore-scene', {t: Math.PI / 2},
            'Začetni primer: cikloida ob \\(t=\\pi/2\\), obe puščici.',
            'The starting case: the cycloid at \\(t=\\pi/2\\), both arrows.'),
    }),
];

// ---- KN2 -------------------------------------------------------------------------------------------------------------------------

const kn2Formulas: readonly FormulaBlock[] = [
    {
        id: 'warped-circle',
        latex: "\\theta(t)=t+b\\sin t,\\qquad r(t)=(\\cos\\theta;\\,\\sin\\theta),\\qquad \\theta'(t)=1+b\\cos t",
        notation: text(
            '\\(\\theta\\) je kot točke na enotski krožnici, \\(b\\) razlika med najhitrejšim in povprečnim kroženjem; za \\(0\\le b<1\\) je \\(\\theta\'>0\\).',
            '\\(\\theta\\) is the angle of the point on the unit circle, \\(b\\) the amplitude of the speed variation; for \\(0\\le b<1\\) we have \\(\\theta\'>0\\).',
        ),
        explanation: text(
            'Pri \\(b=0\\) je \\(\\theta=t\\) enakomerno kroženje s hitrostjo \\(1\\ \\mathrm{m/s}\\). Pri \\(0<b<1\\) je \\(\\theta\'=1+b\\cos t>0\\), zato \\(\\theta\\) strogo narašča od \\(0\\) do \\(2\\pi\\) in točka v \\(2\\pi\\ \\mathrm{s}\\) enkrat obkroži isto krožnico v isto smer. Pot je ista, hitrost \\(|v|=\\theta\'\\) pa se spreminja. Zato drsnik za \\(b\\) sega samo do \\(0{,}9\\).',
            'At \\(b=0\\) the angle \\(\\theta=t\\) is uniform circular motion with speed \\(1\\ \\mathrm{m/s}\\). For \\(0<b<1\\) we have \\(\\theta\'=1+b\\cos t>0\\), so \\(\\theta\\) increases strictly from \\(0\\) to \\(2\\pi\\) and the point goes once around the same circle in the same direction in \\(2\\pi\\ \\mathrm{s}\\). The path is the same, but the speed \\(|v|=\\theta\'\\) varies. This is why the slider for \\(b\\) stops at \\(0.9\\).',
        ),
    },
    {
        id: 'chain-rule',
        latex: "r'=\\theta'\\,T,\\qquad a_T=\\theta'',\\qquad a_N=\\kappa v^2,\\quad \\kappa=1",
        notation: text(
            '\\(T=(-\\sin\\theta;\\,\\cos\\theta)\\) je enotski tangentni vektor krožnice, \\(a_T\\) tangentni in \\(a_N\\) normalni del pospeška, \\(\\kappa\\) ukrivljenost poti.',
            '\\(T=(-\\sin\\theta;\\,\\cos\\theta)\\) is the unit tangent vector of the circle, \\(a_T\\) and \\(a_N\\) the tangential and normal parts of the acceleration, \\(\\kappa\\) the curvature of the path.',
        ),
        explanation: text(
            'Argument (verižno pravilo): \\(r\'=\\theta\'\\,T\\) in \\(\\theta\'>0\\), zato je smer hitrosti pri istem položaju na krožnici enaka za vsako \\(b\\), spremeni se samo dolžina \\(|v|=\\theta\'\\). Drugi odvod da \\(a_T=\\theta\'\'=-b\\sin t\\) in \\(a_N=\\kappa v^2\\) z isto ukrivljenostjo \\(\\kappa=1\\ \\mathrm{1/m}\\) krožnice polmera \\(1\\ \\mathrm{m}\\): ukrivljenost je lastnost poti, ne parametrizacije. Za posamezni \\(b\\) je slika ponazoritev.',
            'Argument (the chain rule): \\(r\'=\\theta\'\\,T\\) and \\(\\theta\'>0\\), so at the same position on the circle the direction of the velocity is the same for every \\(b\\), and only the length \\(|v|=\\theta\'\\) changes. The second derivative gives \\(a_T=\\theta\'\'=-b\\sin t\\) and \\(a_N=\\kappa v^2\\) with the same curvature \\(\\kappa=1\\ \\mathrm{1/m}\\) of a circle of radius \\(1\\ \\mathrm{m}\\): curvature is a property of the path, not of the parametrization. For a particular \\(b\\) the picture is an illustration.',
        ),
    },
];

const kn2Examples: readonly WorkedExample[] = [
    {
        id: 'kn2-quarter',
        title: text('Pospešek ob \\(t=\\pi/2\\) pri \\(b=0{,}5\\)', 'The acceleration at \\(t=\\pi/2\\) for \\(b=0.5\\)'),
        calculationLatex: "v=1+b\\cos t=1+0{,}5\\cos\\tfrac\\pi2=1,\\qquad a_T=-b\\sin t=-0{,}5\\sin\\tfrac\\pi2=-0{,}5,\\qquad a_N=\\kappa v^2=1\\cdot1^2",
        resultLatex: "v=1,\\qquad a_T=-0{,}5,\\qquad a_N=1",
        check: text(
            'Odčitki so \\(|v|=1\\ \\mathrm{m/s}\\), \\(a_T=-0{,}5\\ \\mathrm{m/s^2}\\), \\(a_N=1\\ \\mathrm{m/s^2}\\) in \\(\\kappa=1\\ \\mathrm{1/m}\\).',
            'The readouts are \\(|v|=1\\ \\mathrm{m/s}\\), \\(a_T=-0.5\\ \\mathrm{m/s^2}\\), \\(a_N=1\\ \\mathrm{m/s^2}\\) and \\(\\kappa=1\\ \\mathrm{1/m}\\).',
        ),
    },
];

const kn2Steps: readonly GuidedLessonStep[] = [
    step({
        id: 'kn2-race', order: 1,
        title: text('Dve točki na isti krožnici', 'Two points on one circle'),
        purpose: text('Napovedati, katera od dveh točk na isti poti prej pride na vrh.', 'Predicting which of two points on the same path reaches the top first.'),
        explanation: text(
            'Na krožnici s polmerom \\(1\\ \\mathrm{m}\\) začneta ob \\(t=0\\) skupaj v \\((1;\\,0)\\) dve točki. Polna točka kroži s kotom \\(\\theta=t+0{,}5\\sin t\\), kvadratna primerjalna točka pa enakomerno s kotom \\(\\theta=t\\). Pot je ista krožnica. Napovej, katera bo prva na vrhu, v \\((0;\\,1)\\), in ali bo razlika velika. Še ne premikaj časa.',
            'On a circle of radius \\(1\\ \\mathrm{m}\\), two points start together at \\((1;\\,0)\\) at \\(t=0\\). The solid point moves with the angle \\(\\theta=t+0.5\\sin t\\), the square reference point uniformly with the angle \\(\\theta=t\\). The path is the same circle. Predict which will be at the top, \\((0;\\,1)\\), first and whether the difference is large. Do not move the time yet.',
        ),
        formulaIds: ['warped-circle'],
        observationPrompt: text('Zapiši napoved in preberi lego ob času \\(0\\).', 'Write down your prediction and read the position at time \\(0\\).'),
        expectedObservations: [text('Ob \\(t=0\\) je lega polne točke \\((1;\\,0)\\ \\mathrm{m}\\); primerjalna točka je na istem mestu.', 'At \\(t=0\\) the position of the solid point is \\((1;\\,0)\\ \\mathrm{m}\\); the reference point is at the same place.')],
        scene: kinematicsScene('kn2-race-scene', {motion: 'circular', params: kn2Circle(noArrows), t: 0},
            'Kroženje s polmerom \\(1\\ \\mathrm{m}\\), \\(b=0{,}5\\), čas \\(0\\); lega \\((1;\\,0)\\ \\mathrm{m}\\).',
            'Circular motion of radius \\(1\\ \\mathrm{m}\\), \\(b=0.5\\), time \\(0\\); position \\((1;\\,0)\\ \\mathrm{m}\\).'),
    }),
    step({
        id: 'kn2-top', order: 2,
        title: text('Kdo je prej na vrhu', 'Who gets to the top first'),
        purpose: text('Videti, da isti kraj dosežeta ob različnih časih.', 'Seeing that the same place is reached at different times.'),
        explanation: text(
            'Pritisni Predvajaj ali premakni čas. Polna točka je na vrhu že ob \\(t=1{,}1206\\ \\mathrm{s}\\) (odčitek časa pokaže zaokroženo \\(1{,}12\\ \\mathrm{s}\\)), njena lega je tedaj \\((0;\\,1)\\ \\mathrm{m}\\). Primerjalna točka je v tistem trenutku na kotu \\(1{,}1206\\ \\mathrm{rad}\\), tik pred vrhom, in pride na vrh šele ob \\(t=\\pi/2\\approx1{,}5708\\ \\mathrm{s}\\). Točki sta na isti poti, a isti kraj dosežeta ob različnih časih.',
            'Press Play or move the time. The solid point is at the top already at \\(t=1.1206\\ \\mathrm{s}\\) (the time readout shows it rounded as \\(1.12\\ \\mathrm{s}\\)), and its position is then \\((0;\\,1)\\ \\mathrm{m}\\). At that moment the reference point is at the angle \\(1.1206\\ \\mathrm{rad}\\), just before the top, and it reaches the top only at \\(t=\\pi/2\\approx1.5708\\ \\mathrm{s}\\). The two points are on the same path, but they reach the same place at different times.',
        ),
        formulaIds: ['warped-circle'],
        observationPrompt: text('Preberi čas in lego polne točke; poglej, kje je primerjalna točka.', 'Read the time and the position of the solid point; look where the reference point is.'),
        expectedObservations: [text('Polna točka je v \\((0;\\,1)\\ \\mathrm{m}\\), primerjalna točka še ni na vrhu.', 'The solid point is at \\((0;\\,1)\\ \\mathrm{m}\\), the reference point is not yet at the top.')],
        scene: kinematicsScene('kn2-top-scene', {motion: 'circular', params: kn2Circle(noArrows), t: KN2_QUARTER_TURN},
            'Kroženje, \\(b=0{,}5\\), čas \\(1{,}12\\ \\mathrm{s}\\) (točno \\(1{,}1206\\ \\mathrm{s}\\)); polna točka na vrhu, \\((0;\\,1)\\ \\mathrm{m}\\).',
            'Circular motion, \\(b=0.5\\), time \\(1.12\\ \\mathrm{s}\\) (exactly \\(1.1206\\ \\mathrm{s}\\)); the solid point at the top, \\((0;\\,1)\\ \\mathrm{m}\\).'),
    }),
    step({
        id: 'kn2-speed', order: 3,
        title: text('Hitrost se spreminja', 'The speed varies'),
        purpose: text('Brati hitrost polne točke ob različnih časih in jo primerjati z enakomerno.', 'Reading the speed of the solid point at different times and comparing it with the uniform one.'),
        explanation: text(
            'Graf ne riše hitrosti v odvisnosti od časa; hitrost polne točke je \\(|v|=1+0{,}5\\cos t\\) in jo preberemo iz odčitka. Ob \\(t=0\\) je \\(v=(0;\\,1{,}5)\\ \\mathrm{m/s}\\), hitrost pa \\(1{,}5\\ \\mathrm{m/s}\\). Primerjalna točka ima ves čas hitrost \\(1\\ \\mathrm{m/s}\\) (polmer \\(1\\ \\mathrm{m}\\), kotna hitrost \\(1\\ \\mathrm{rad/s}\\)). Napovej hitrost polne točke ob \\(t=\\pi\\), nato postavi drsnik časa na \\(3{,}14\\), kar je le približno \\(\\pi\\), in preberi odčitek: pokaže približno \\(0{,}5\\ \\mathrm{m/s}\\). Poskusi tudi \\(1{,}57\\approx\\pi/2\\).',
            'The graph does not draw the speed against time; the speed of the solid point is \\(|v|=1+0.5\\cos t\\) and is read from the readout. At \\(t=0\\) the velocity is \\(v=(0;\\,1.5)\\ \\mathrm{m/s}\\) and the speed \\(1.5\\ \\mathrm{m/s}\\). The reference point has speed \\(1\\ \\mathrm{m/s}\\) all the time (radius \\(1\\ \\mathrm{m}\\), angular velocity \\(1\\ \\mathrm{rad/s}\\)). Predict the speed of the solid point at \\(t=\\pi\\), then set the time slider to \\(3.14\\), which is only approximately \\(\\pi\\), and read the readout: it shows about \\(0.5\\ \\mathrm{m/s}\\). Also try \\(1.57\\approx\\pi/2\\).',
        ),
        formulaIds: ['warped-circle'],
        observationPrompt: text('Preberi velikost hitrosti ob \\(0\\), \\(1{,}57\\) in \\(3{,}14\\).', 'Read the speed at \\(0\\), \\(1.57\\) and \\(3.14\\).'),
        expectedObservations: [text('Velikost hitrosti je \\(1{,}5\\), \\(1\\) in \\(0{,}5\\ \\mathrm{m/s}\\).', 'The speed is \\(1.5\\), \\(1\\) and \\(0.5\\ \\mathrm{m/s}\\).')],
        scene: kinematicsScene('kn2-speed-scene', {motion: 'circular', params: kn2Circle({showVelocity: true, showAcceleration: false}), t: 0},
            'Kroženje, \\(b=0{,}5\\), čas \\(0\\), puščica hitrosti: \\(v=(0;\\,1{,}5)\\ \\mathrm{m/s}\\), \\(|v|=1{,}5\\ \\mathrm{m/s}\\).',
            'Circular motion, \\(b=0.5\\), time \\(0\\), velocity arrow: \\(v=(0;\\,1.5)\\ \\mathrm{m/s}\\), \\(|v|=1.5\\ \\mathrm{m/s}\\).'),
    }),
    step({
        id: 'kn2-tangent', order: 4,
        title: text('Ista smer, drugačna dolžina', 'The same direction, a different length'),
        purpose: text('Videti, da parametrizacija spremeni dolžino hitrosti, ne pa tangente.', 'Seeing that the parametrization changes the length of the velocity but not the tangent.'),
        explanation: text(
            'Polna točka je na vrhu in njena hitrost je \\(v=(-1{,}218;\\,0)\\ \\mathrm{m/s}\\), vodoravno v levo. Primerjalna točka pride na vrh šele ob \\(t=\\pi/2\\) in ima tam hitrost \\((-1;\\,0)\\ \\mathrm{m/s}\\), prav tako vodoravno v levo, a krajšo. Argument je verižno pravilo: \\(r\'=\\theta\'\\,T\\) in \\(\\theta\'>0\\), zato je smer hitrosti pri istem položaju na krožnici enaka, spremeni se samo dolžina \\(|v|=\\theta\'\\). Tangenta je lastnost poti.',
            'The solid point is at the top and its velocity is \\(v=(-1.218;\\,0)\\ \\mathrm{m/s}\\), horizontally to the left. The reference point reaches the top only at \\(t=\\pi/2\\), where its velocity is \\((-1;\\,0)\\ \\mathrm{m/s}\\), also horizontally to the left, but shorter. The argument is the chain rule: \\(r\'=\\theta\'\\,T\\) and \\(\\theta\'>0\\), so at the same position on the circle the direction of the velocity is the same and only the length \\(|v|=\\theta\'\\) changes. The tangent is a property of the path.',
        ),
        formulaIds: ['chain-rule'],
        observationPrompt: text('Preberi hitrost polne točke in primerjaj smer s tangento krožnice na vrhu.', 'Read the velocity of the solid point and compare its direction with the tangent of the circle at the top.'),
        expectedObservations: [text('Hitrost je \\((-1{,}218;\\,0)\\ \\mathrm{m/s}\\), vodoravna, kakor tangenta na vrhu.', 'The velocity is \\((-1.218;\\,0)\\ \\mathrm{m/s}\\), horizontal, like the tangent at the top.')],
        scene: kinematicsScene('kn2-tangent-scene', {motion: 'circular', params: kn2Circle({showVelocity: true, showAcceleration: false}), t: KN2_QUARTER_TURN},
            'Kroženje, \\(b=0{,}5\\), čas \\(1{,}12\\ \\mathrm{s}\\), polna točka na vrhu: \\(v=(-1{,}218;\\,0)\\ \\mathrm{m/s}\\).',
            'Circular motion, \\(b=0.5\\), time \\(1.12\\ \\mathrm{s}\\), the solid point at the top: \\(v=(-1.218;\\,0)\\ \\mathrm{m/s}\\).'),
    }),
    step({
        id: 'kn2-acceleration', order: 5,
        title: text('Pospešek ima tangentni del', 'The acceleration has a tangential part'),
        purpose: text('Videti, da sprememba hitrosti po velikosti da pospešek vzdolž poti.', 'Seeing that a change in the size of the speed gives an acceleration along the path.'),
        explanation: text(
            'Pospešek je razstavljen na tangentni del \\(a_T\\) (pikčasto) in normalni del \\(a_N\\) (dolge črtice). Ob \\(t=\\pi/2\\) je \\(a_T=-0{,}5\\ \\mathrm{m/s^2}\\): točka zavira, pospešek kaže delno nazaj. Normalni del je \\(a_N=1\\ \\mathrm{m/s^2}\\) in ukrivljenost \\(\\kappa=1\\ \\mathrm{1/m}\\). Primerjalna točka ima \\(a_T=0\\), ker kroži enakomerno; polna ima \\(a_T=\\theta\'\'=-0{,}5\\sin t\\). Ista pot, a drugačen pospešek.',
            'The acceleration is split into the tangential part \\(a_T\\) (dotted) and the normal part \\(a_N\\) (long dashes). At \\(t=\\pi/2\\) we have \\(a_T=-0.5\\ \\mathrm{m/s^2}\\): the point slows down, the acceleration points partly backwards. The normal part is \\(a_N=1\\ \\mathrm{m/s^2}\\) and the curvature \\(\\kappa=1\\ \\mathrm{1/m}\\). The reference point has \\(a_T=0\\) because it moves uniformly; the solid one has \\(a_T=\\theta\'\'=-0.5\\sin t\\). The same path, but a different acceleration.',
        ),
        formulaIds: ['chain-rule'],
        workedExampleId: 'kn2-quarter',
        observationPrompt: text('Preberi tangentni in normalni pospešek, ukrivljenost in stanje.', 'Read the tangential and normal accelerations, the curvature and the status.'),
        expectedObservations: [text('\\(a_T=-0{,}5\\ \\mathrm{m/s^2}\\), \\(a_N=1\\ \\mathrm{m/s^2}\\), \\(\\kappa=1\\ \\mathrm{1/m}\\); stanje pove, da točka zavira.', '\\(a_T=-0.5\\ \\mathrm{m/s^2}\\), \\(a_N=1\\ \\mathrm{m/s^2}\\), \\(\\kappa=1\\ \\mathrm{1/m}\\); the status says the point slows down.')],
        scene: kinematicsScene('kn2-acceleration-scene', {motion: 'circular', params: kn2Circle({split: true}), t: Math.PI / 2},
            'Kroženje, \\(b=0{,}5\\), čas \\(\\pi/2\\), razstavljen pospešek: \\(a_T=-0{,}5\\ \\mathrm{m/s^2}\\), \\(a_N=1\\ \\mathrm{m/s^2}\\), \\(\\kappa=1\\ \\mathrm{1/m}\\).',
            'Circular motion, \\(b=0.5\\), time \\(\\pi/2\\), split acceleration: \\(a_T=-0.5\\ \\mathrm{m/s^2}\\), \\(a_N=1\\ \\mathrm{m/s^2}\\), \\(\\kappa=1\\ \\mathrm{1/m}\\).'),
    }),
    step({
        id: 'kn2-invariant', order: 6,
        title: text('Dolžina in ukrivljenost sta enaki', 'The length and the curvature are equal'),
        purpose: text('Utemeljiti, da parametrizacija ne spremeni ukrivljenosti in dolžine poti.', 'Arguing that the parametrization changes neither the curvature nor the length of the path.'),
        explanation: text(
            'Argument: pot je ista krožnica, zato je ukrivljenost povsod \\(\\kappa=1\\ \\mathrm{1/m}\\), kakor koli jo prehodimo. Normalni pospešek je \\(a_N=\\kappa v^2\\): ob \\(t=\\pi\\) je \\(|v|=0{,}5\\ \\mathrm{m/s}\\), zato \\(a_N=1\\cdot0{,}5^2=0{,}25\\ \\mathrm{m/s^2}\\), ob \\(t=0\\) pa \\(1\\cdot1{,}5^2=2{,}25\\ \\mathrm{m/s^2}\\). Dolžina poti v \\(2\\pi\\ \\mathrm{s}\\) je enaka za obe točki, \\(\\int_0^{2\\pi}(1+0{,}5\\cos t)\\,\\mathrm dt=2\\pi\\ \\mathrm{m}\\approx6{,}283\\ \\mathrm{m}\\), ker krožnico obe obkrožita natanko enkrat. Ob \\(t=\\pi\\) je tangentni del približno \\(0\\) in graf pove, da se velikost hitrosti v tem trenutku približno ne spreminja.',
            'Argument: the path is the same circle, so the curvature is \\(\\kappa=1\\ \\mathrm{1/m}\\) everywhere, however it is traversed. The normal acceleration is \\(a_N=\\kappa v^2\\): at \\(t=\\pi\\) we have \\(|v|=0.5\\ \\mathrm{m/s}\\), so \\(a_N=1\\cdot0.5^2=0.25\\ \\mathrm{m/s^2}\\), and at \\(t=0\\) it is \\(1\\cdot1.5^2=2.25\\ \\mathrm{m/s^2}\\). The length of the path in \\(2\\pi\\ \\mathrm{s}\\) is the same for both points, \\(\\int_0^{2\\pi}(1+0.5\\cos t)\\,\\mathrm dt=2\\pi\\ \\mathrm{m}\\approx6.283\\ \\mathrm{m}\\), because both go around the circle exactly once. At \\(t=\\pi\\) the tangential part is approximately \\(0\\) and the graph says that the size of the speed is approximately not changing at this moment.',
        ),
        formulaIds: ['chain-rule'],
        observationPrompt: text('Preberi hitrost, \\(a_N\\), \\(\\kappa\\) in \\(\\kappa|v|^2\\) ob \\(t=\\pi\\).', 'Read the speed, \\(a_N\\), \\(\\kappa\\) and \\(\\kappa|v|^2\\) at \\(t=\\pi\\).'),
        expectedObservations: [text('\\(|v|=0{,}5\\ \\mathrm{m/s}\\), \\(a_N=0{,}25\\ \\mathrm{m/s^2}\\), \\(\\kappa=1\\ \\mathrm{1/m}\\), \\(\\kappa|v|^2=0{,}25\\ \\mathrm{m/s^2}\\).', '\\(|v|=0.5\\ \\mathrm{m/s}\\), \\(a_N=0.25\\ \\mathrm{m/s^2}\\), \\(\\kappa=1\\ \\mathrm{1/m}\\), \\(\\kappa|v|^2=0.25\\ \\mathrm{m/s^2}\\).')],
        scene: kinematicsScene('kn2-invariant-scene', {motion: 'circular', params: kn2Circle({split: true}), t: Math.PI},
            'Kroženje, \\(b=0{,}5\\), čas \\(\\pi\\): \\(|v|=0{,}5\\ \\mathrm{m/s}\\), \\(a_N=0{,}25\\ \\mathrm{m/s^2}\\), \\(\\kappa=1\\ \\mathrm{1/m}\\).',
            'Circular motion, \\(b=0.5\\), time \\(\\pi\\): \\(|v|=0.5\\ \\mathrm{m/s}\\), \\(a_N=0.25\\ \\mathrm{m/s^2}\\), \\(\\kappa=1\\ \\mathrm{1/m}\\).'),
    }),
    step({
        id: 'kn2-explore', order: 7,
        title: text('Prosto raziskovanje', 'Free exploration'),
        purpose: text('Spreminjati hitrostno spremembo \\(b\\) in opazovati, kaj ostane enako.', 'Changing the speed variation \\(b\\) and watching what stays the same.'),
        explanation: text(
            'Spreminjaj \\(b\\) od \\(0\\) do \\(0{,}9\\) s korakom \\(0{,}05\\) in premikaj čas. Pri \\(b=0\\) točki sovpadata in primerjalna točka ni več narisana. Pri večjem \\(b\\) se hitrost bolj spreminja, krožnica in njena ukrivljenost pa ostaneta. Če hočeš spreminjanje hitrosti odpraviti, glej lekciji o enakomerni parametrizaciji (enaki loki) in o naravni parametrizaciji; tam enake loke dosežemo po dolžini loka, tu jih nismo ponavljali.',
            'Change \\(b\\) from \\(0\\) to \\(0.9\\) in steps of \\(0.05\\) and move the time. At \\(b=0\\) the points coincide and the reference point is no longer drawn. A larger \\(b\\) makes the speed vary more, while the circle and its curvature stay. To remove the speed variation, see the lessons on uniform parametrization (equal arcs) and on arc-length parametrization; there equal arcs are reached by arc length, and we have not repeated that here.',
        ),
        formulaIds: [],
        observationPrompt: text('Poišči \\(b\\), pri katerem je najmanjša hitrost najmanjša, in preveri, da je \\(\\kappa\\) povsod \\(1\\).', 'Find the \\(b\\) at which the smallest speed is smallest and check that \\(\\kappa\\) is \\(1\\) everywhere.'),
        expectedObservations: [text('Najmanjša hitrost je \\(1-b\\), pri \\(b=0{,}9\\) torej \\(0{,}1\\ \\mathrm{m/s}\\); ukrivljenost je ves čas \\(1\\ \\mathrm{1/m}\\).', 'The smallest speed is \\(1-b\\), so \\(0.1\\ \\mathrm{m/s}\\) at \\(b=0.9\\); the curvature is \\(1\\ \\mathrm{1/m}\\) all the time.')],
        scene: kinematicsScene('kn2-explore-scene', {motion: 'circular', params: kn2Circle(), t: Math.PI / 2},
            'Začetni primer: kroženje, \\(b=0{,}5\\), čas \\(\\pi/2\\), obe puščici.',
            'The starting case: circular motion, \\(b=0.5\\), time \\(\\pi/2\\), both arrows.'),
    }),
];

// ---- KN3 -------------------------------------------------------------------------------------------------------------------------

/** The throw of KN3: launch speed 20 m/s (the graph's default) and, unless a scene says otherwise, the default angle of 45 degrees. */
const kn3Scene = (id: string, params: KinematicsSceneParams, t: number, sl: string, en: string): LessonScene =>
    kinematicsScene(id, {motion: 'projectile', params, t}, sl, en);

const kn3Formulas: readonly FormulaBlock[] = [
    {
        id: 'projectile-equations',
        latex: "r(t)=\\bigl(v_0\\cos\\alpha\\,t;\\;v_0\\sin\\alpha\\,t-\\tfrac12gt^2\\bigr),\\quad v(t)=\\bigl(v_0\\cos\\alpha;\\;v_0\\sin\\alpha-gt\\bigr),\\quad a(t)=(0;\\,-g)",
        notation: text(
            '\\(v_0\\) je začetna hitrost, \\(\\alpha\\) izstrelni kot, \\(g=9{,}81\\ \\mathrm{m/s^2}\\) težni pospešek; os \\(x\\) kaže vodoravno naprej, os \\(y\\) navpično navzgor, žoga je ob \\(t=0\\) v izhodišču.',
            '\\(v_0\\) is the launch speed, \\(\\alpha\\) the launch angle, \\(g=9.81\\ \\mathrm{m/s^2}\\) the gravitational acceleration; the \\(x\\) axis points horizontally forward, the \\(y\\) axis vertically up, and the ball is at the origin at \\(t=0\\).',
        ),
        explanation: text(
            'Ker je pospešek \\(a=(0;\\,-g)\\) stalen, dobimo hitrost in lego z integriranjem po komponentah, z začetnima pogojema \\(v(0)=(v_0\\cos\\alpha;\\,v_0\\sin\\alpha)\\) in \\(r(0)=(0;\\,0)\\). Odčitki grafa sledijo tem enačbam; slike ob njih so ponazoritve.',
            'Because the acceleration \\(a=(0;\\,-g)\\) is constant, the velocity and the position follow by integrating componentwise, with the initial conditions \\(v(0)=(v_0\\cos\\alpha;\\,v_0\\sin\\alpha)\\) and \\(r(0)=(0;\\,0)\\). The readouts of the graph follow these equations; the pictures beside them are illustrations.',
        ),
    },
    {
        id: 'projectile-range',
        latex: "T=\\frac{2v_0\\sin\\alpha}{g},\\qquad R=\\frac{v_0^2\\sin2\\alpha}{g},\\qquad H=\\frac{v_0^2\\sin^2\\alpha}{2g}",
        notation: text(
            '\\(T\\) je čas leta, \\(R\\) domet (vodoravna razdalja do pristanka na tleh) in \\(H\\) največja višina.',
            '\\(T\\) is the flight time, \\(R\\) the range (the horizontal distance to the landing on the ground) and \\(H\\) the maximum height.',
        ),
        explanation: text(
            'Argument: žoga pristane, ko je \\(y=0\\), torej \\(t\\bigl(v_0\\sin\\alpha-\\tfrac12gt\\bigr)=0\\); rešitev \\(t=0\\) je met, druga je \\(t=T\\). Domet je \\(R=x(T)=v_0\\cos\\alpha\\cdot T=v_0^2\\cdot2\\sin\\alpha\\cos\\alpha/g=v_0^2\\sin2\\alpha/g\\). Najvišje je žoga, ko je \\(v_y=0\\), torej ob \\(t=T/2\\); tam dobimo \\(H\\). Ker je \\(\\sin2\\alpha=\\sin(180^\\circ-2\\alpha)\\), dasta kota \\(\\alpha\\) in \\(90^\\circ-\\alpha\\) pri enakem \\(v_0\\) enak domet, največji domet pa je pri \\(\\alpha=45^\\circ\\), kjer je \\(\\sin2\\alpha=1\\). Primeri na grafu so ponazoritve te formule.',
            'Argument: the ball lands when \\(y=0\\), that is \\(t\\bigl(v_0\\sin\\alpha-\\tfrac12gt\\bigr)=0\\); the solution \\(t=0\\) is the throw, the other is \\(t=T\\). The range is \\(R=x(T)=v_0\\cos\\alpha\\cdot T=v_0^2\\cdot2\\sin\\alpha\\cos\\alpha/g=v_0^2\\sin2\\alpha/g\\). The ball is highest when \\(v_y=0\\), that is at \\(t=T/2\\); there we get \\(H\\). Because \\(\\sin2\\alpha=\\sin(180^\\circ-2\\alpha)\\), the angles \\(\\alpha\\) and \\(90^\\circ-\\alpha\\) give the same range at the same \\(v_0\\), and the range is largest at \\(\\alpha=45^\\circ\\), where \\(\\sin2\\alpha=1\\). The examples on the graph are illustrations of this formula.',
        ),
    },
];

const kn3Examples: readonly WorkedExample[] = [
    {
        id: 'kn3-range-45',
        title: text('Čas leta, domet in višina pri \\(45^\\circ\\)', 'Flight time, range and height at \\(45^\\circ\\)'),
        calculationLatex: "T=\\frac{2\\cdot20\\cdot\\sin45^\\circ}{9{,}81},\\qquad R=\\frac{20^2\\sin90^\\circ}{9{,}81},\\qquad H=\\frac{20^2\\sin^245^\\circ}{2\\cdot9{,}81}",
        resultLatex: "T\\approx2{,}883,\\qquad R\\approx40{,}775,\\qquad H\\approx10{,}194",
        check: text(
            'Odčitki so čas leta \\(\\approx2{,}883\\ \\mathrm{s}\\), domet \\(\\approx40{,}775\\ \\mathrm{m}\\) in največja višina \\(\\approx10{,}194\\ \\mathrm{m}\\); vrednosti so zaokrožene.',
            'The readouts are a flight time of \\(\\approx2.883\\ \\mathrm{s}\\), a range of \\(\\approx40.775\\ \\mathrm{m}\\) and a maximum height of \\(\\approx10.194\\ \\mathrm{m}\\); the values are rounded.',
        ),
    },
];

const kn3Steps: readonly GuidedLessonStep[] = [
    step({
        id: 'kn3-throw', order: 1,
        title: text('Met pod kotom \\(45^\\circ\\)', 'A throw at \\(45^\\circ\\)'),
        purpose: text('Napovedati, kdaj je žoga najvišje, in to primerjati s časom leta.', 'Predicting when the ball is highest and comparing it with the flight time.'),
        explanation: text(
            'Žogo vržemo s tal s hitrostjo \\(v_0=20\\ \\mathrm{m/s}\\) pod izstrelnim kotom \\(\\alpha=45^\\circ\\) glede na vodoravnico (poševni met). Zračnega upora ne upoštevamo: na žogo deluje samo težni pospešek \\(g=9{,}81\\ \\mathrm{m/s^2}\\) navpično navzdol. Slika kaže pot žoge in žogo ob času \\(t=0\\); čas merimo v sekundah, dolžine v metrih, žoga pa pristane na tleh. Preden premakneš čas, napovej: ob katerem času je žoga najvišje in kako ta čas primerjamo s časom leta?',
            'A ball is thrown from the ground with the speed \\(v_0=20\\ \\mathrm{m/s}\\) at the launch angle \\(\\alpha=45^\\circ\\) above the horizontal (projectile motion). Air resistance is ignored: the only acceleration of the ball is the gravitational acceleration \\(g=9.81\\ \\mathrm{m/s^2}\\) straight down. The picture shows the path of the ball and the ball at time \\(t=0\\); time is measured in seconds, lengths in metres, and the ball lands on the ground. Before you move the time, predict: at what time is the ball highest, and how does that time compare with the flight time?',
        ),
        formulaIds: [],
        observationPrompt: text('Zapiši napoved. Preberi čas leta, nato premikaj čas in poišči trenutek največje višine; preberi čas in lego.', 'Write down your prediction. Read the flight time, then move the time and find the moment of the greatest height; read the time and the position.'),
        expectedObservations: [text(
            'Čas leta je \\(\\approx2{,}883\\ \\mathrm{s}\\), domet \\(\\approx40{,}775\\ \\mathrm{m}\\), največja višina \\(\\approx10{,}194\\ \\mathrm{m}\\). Žoga je najvišje ob \\(t\\approx1{,}44\\ \\mathrm{s}\\), torej ob približno polovici časa leta (pri \\(t=1{,}44\\ \\mathrm{s}\\) je lega \\(\\approx(20{,}365;\\,10{,}194)\\ \\mathrm{m}\\)), in tedaj je vodoravno približno na polovici dometa.',
            'The flight time is \\(\\approx2.883\\ \\mathrm{s}\\), the range \\(\\approx40.775\\ \\mathrm{m}\\), the maximum height \\(\\approx10.194\\ \\mathrm{m}\\). The ball is highest at \\(t\\approx1.44\\ \\mathrm{s}\\), that is at about half of the flight time (at \\(t=1.44\\ \\mathrm{s}\\) the position is \\(\\approx(20.365;\\,10.194)\\ \\mathrm{m}\\)), and it is then horizontally at about half of the range.',
        )],
        scene: kn3Scene('kn3-throw-scene', noArrows, 0,
            'Poševni met, \\(v_0=20\\ \\mathrm{m/s}\\), \\(\\alpha=45^\\circ\\), čas \\(0\\), brez puščic; čas leta \\(\\approx2{,}883\\ \\mathrm{s}\\), domet \\(\\approx40{,}775\\ \\mathrm{m}\\), največja višina \\(\\approx10{,}194\\ \\mathrm{m}\\).',
            'Projectile motion, \\(v_0=20\\ \\mathrm{m/s}\\), \\(\\alpha=45^\\circ\\), time \\(0\\), no arrows; flight time \\(\\approx2.883\\ \\mathrm{s}\\), range \\(\\approx40.775\\ \\mathrm{m}\\), maximum height \\(\\approx10.194\\ \\mathrm{m}\\).'),
    }),
    step({
        id: 'kn3-velocity', order: 2,
        title: text('Vodoravni in navpični del hitrosti', 'The horizontal and the vertical part of the velocity'),
        purpose: text('Napovedati, kaj se med letom zgodi z delnima hitrostima.', 'Predicting what happens to the two parts of the velocity during the flight.'),
        explanation: text(
            'Puščica hitrosti \\(v\\) kaže, kam in kako hitro žoga leti; njen vodoravni del je \\(v_x\\), navpični \\(v_y\\), v odčitku sta to prva in druga komponenta hitrosti. Ob \\(t=1\\ \\mathrm{s}\\) je žoga še na poti navzgor. Napovej: kaj se med letom zgodi z \\(v_x\\) in kaj z \\(v_y\\), in kakšna je velikost hitrosti ob pristanku v primerjavi z začetno?',
            'The velocity arrow \\(v\\) shows where the ball is going and how fast; its horizontal part is \\(v_x\\), its vertical part \\(v_y\\), and in the readout they are the first and the second component of the velocity. At \\(t=1\\ \\mathrm{s}\\) the ball is still on its way up. Predict: what happens to \\(v_x\\) and to \\(v_y\\) during the flight, and how does the speed at the landing compare with the initial one?',
        ),
        formulaIds: [],
        observationPrompt: text('Zapiši napoved, nato preberi hitrost ob \\(t=0\\), \\(1\\), \\(2\\) in tik pred pristankom (\\(t=2{,}88\\ \\mathrm{s}\\)).', 'Write down your prediction, then read the velocity at \\(t=0\\), \\(1\\), \\(2\\) and just before the landing (\\(t=2.88\\ \\mathrm{s}\\)).'),
        expectedObservations: [text(
            'Vodoravni del je ves čas \\(14{,}142\\ \\mathrm{m/s}\\). Navpični del pada: \\(14{,}142\\) ob \\(t=0\\), \\(4{,}332\\) ob \\(t=1\\), \\(\\approx0\\) ob \\(t\\approx1{,}44\\) (odčitek \\(0{,}016\\) ob \\(1{,}44\\ \\mathrm{s}\\)), \\(-5{,}478\\) ob \\(t=2\\) in \\(-14{,}111\\) ob \\(t=2{,}88\\), vse v \\(\\mathrm{m/s}\\): žoga gre najprej navzgor, potem navzdol. Velikost hitrosti je ob \\(t=2{,}88\\) \\(\\approx19{,}978\\ \\mathrm{m/s}\\), skoraj enaka začetnim \\(20\\ \\mathrm{m/s}\\).',
            'The horizontal part is \\(14.142\\ \\mathrm{m/s}\\) all the time. The vertical part falls: \\(14.142\\) at \\(t=0\\), \\(4.332\\) at \\(t=1\\), \\(\\approx0\\) at \\(t\\approx1.44\\) (the readout is \\(0.016\\) at \\(1.44\\ \\mathrm{s}\\)), \\(-5.478\\) at \\(t=2\\) and \\(-14.111\\) at \\(t=2.88\\), all in \\(\\mathrm{m/s}\\): the ball first goes up, then down. The speed at \\(t=2.88\\) is \\(\\approx19.978\\ \\mathrm{m/s}\\), almost the initial \\(20\\ \\mathrm{m/s}\\).',
        )],
        scene: kn3Scene('kn3-velocity-scene', {showVelocity: true, showAcceleration: false}, 1,
            'Poševni met, \\(v_0=20\\ \\mathrm{m/s}\\), \\(\\alpha=45^\\circ\\), čas \\(1\\ \\mathrm{s}\\), puščica hitrosti: \\(v=(14{,}142;\\,4{,}332)\\ \\mathrm{m/s}\\).',
            'Projectile motion, \\(v_0=20\\ \\mathrm{m/s}\\), \\(\\alpha=45^\\circ\\), time \\(1\\ \\mathrm{s}\\), velocity arrow: \\(v=(14.142;\\,4.332)\\ \\mathrm{m/s}\\).'),
    }),
    step({
        id: 'kn3-acceleration', order: 3,
        title: text('Pospešek med letom', 'The acceleration during the flight'),
        purpose: text('Napovedati pospešek ob začetku, na vrhu in ob pristanku.', 'Predicting the acceleration at the start, at the top and at the landing.'),
        explanation: text(
            'Pospešek \\(a\\) pove, kako hitro se hitrost spreminja (črtkana puščica). Prejšnji korak je pokazal, da se hitrost med letom spreminja, na vrhu pa je njen navpični del \\(0\\). Napovej: kam kaže pospešek in kako velik je ob \\(t=0\\), na vrhu in tik pred pristankom? Ali je na vrhu enak \\(0\\), ker je tam \\(v_y=0\\)?',
            'The acceleration \\(a\\) tells how fast the velocity changes (the dashed arrow). The previous step showed that the velocity changes during the flight, and that at the top its vertical part is \\(0\\). Predict: where does the acceleration point and how large is it at \\(t=0\\), at the top and just before the landing? Is it \\(0\\) at the top, because \\(v_y=0\\) there?',
        ),
        formulaIds: [],
        observationPrompt: text('Zapiši napoved, nato preberi pospešek ob \\(t=0\\), \\(1{,}44\\) in \\(2{,}88\\ \\mathrm{s}\\).', 'Write down your prediction, then read the acceleration at \\(t=0\\), \\(1.44\\) and \\(2.88\\ \\mathrm{s}\\).'),
        expectedObservations: [text(
            'Pospešek je ob vseh treh časih \\((0;\\,-9{,}81)\\ \\mathrm{m/s^2}\\): navpično navzdol in enak povsod, tudi na vrhu, kjer je \\(v_y\\approx0\\), pospešek pa ni \\(0\\). Zato se navpični del hitrosti vsako sekundo zmanjša za \\(9{,}81\\ \\mathrm{m/s}\\) (primerjaj \\(14{,}142\\), \\(4{,}332\\), \\(-5{,}478\\) iz prejšnjega koraka), vodoravni del pa se ne spreminja.',
            'The acceleration is \\((0;\\,-9.81)\\ \\mathrm{m/s^2}\\) at all three times: straight down and the same everywhere, also at the top, where \\(v_y\\approx0\\) but the acceleration is not \\(0\\). So the vertical part of the velocity decreases by \\(9.81\\ \\mathrm{m/s}\\) every second (compare \\(14.142\\), \\(4.332\\), \\(-5.478\\) of the previous step), and the horizontal part does not change.',
        )],
        scene: kn3Scene('kn3-acceleration-scene', {showVelocity: true, showAcceleration: true}, 1,
            'Poševni met, \\(v_0=20\\ \\mathrm{m/s}\\), \\(\\alpha=45^\\circ\\), čas \\(1\\ \\mathrm{s}\\), obe puščici: \\(a=(0;\\,-9{,}81)\\ \\mathrm{m/s^2}\\).',
            'Projectile motion, \\(v_0=20\\ \\mathrm{m/s}\\), \\(\\alpha=45^\\circ\\), time \\(1\\ \\mathrm{s}\\), both arrows: \\(a=(0;\\,-9.81)\\ \\mathrm{m/s^2}\\).'),
    }),
    step({
        id: 'kn3-path', order: 4,
        title: text('Enačba poti', 'The equation of the path'),
        purpose: text('Napovedati vrsto krivulje, ki jo žoga opiše, in jo utemeljiti z izločitvijo časa.', 'Predicting the kind of curve the ball traces and arguing it by eliminating the time.'),
        explanation: text(
            'Lego žoge podajata \\(x(t)\\) in \\(y(t)\\) (enačbe spodaj); pot je množica točk \\((x(t);\\,y(t))\\). Če iz teh dveh enačb izločimo \\(t\\), dobimo \\(y\\) kot funkcijo od \\(x\\). Napovej: kakšen je predznak vodilnega koeficienta pri \\(x^2\\) in kje leži teme grafa: pri najvišji točki leta ali pri izstrelitvi?',
            'The position of the ball is given by \\(x(t)\\) and \\(y(t)\\) (the equations below); the path is the set of points \\((x(t);\\,y(t))\\). Eliminating \\(t\\) from these two equations gives \\(y\\) as a function of \\(x\\). Predict: what is the sign of the leading coefficient of \\(x^2\\), and where does the vertex of the graph lie: at the highest point of the flight or at the launch?',
        ),
        formulaIds: ['projectile-equations'],
        observationPrompt: text('Zapiši napoved, nato iz \\(x(t)\\) izrazi \\(t\\), vstavi v \\(y(t)\\) in preveri na legi ob \\(t=1\\ \\mathrm{s}\\).', 'Write down your prediction, then solve \\(x(t)\\) for \\(t\\), substitute into \\(y(t)\\) and check against the position at \\(t=1\\ \\mathrm{s}\\).'),
        expectedObservations: [text(
            'Iz \\(x=v_0\\cos\\alpha\\,t\\) je \\(t=x/(v_0\\cos\\alpha)\\), torej \\(y=x\\tan\\alpha-\\dfrac{g\\,x^2}{2v_0^2\\cos^2\\alpha}\\): kvadratna funkcija z negativnim vodilnim koeficientom, parabola, odprta navzdol. Njeno teme leži pri \\(x=R/2\\), torej na vrhu leta in ne ob izstrelitvi; tu je \\(x=20{,}387\\ \\mathrm{m}\\). Pri \\(\\alpha=45^\\circ\\) in \\(v_0=20\\ \\mathrm{m/s}\\) je \\(y=x-0{,}024525\\,x^2\\); za \\(x=14{,}142\\) dobimo \\(y\\approx9{,}237\\), kar je odčitana lega \\((14{,}142;\\,9{,}237)\\ \\mathrm{m}\\) ob \\(t=1\\ \\mathrm{s}\\).',
            'From \\(x=v_0\\cos\\alpha\\,t\\) we get \\(t=x/(v_0\\cos\\alpha)\\), so \\(y=x\\tan\\alpha-\\dfrac{g\\,x^2}{2v_0^2\\cos^2\\alpha}\\): a quadratic function with a negative leading coefficient, a parabola opening downwards. Its vertex lies at \\(x=R/2\\), so at the top of the flight and not at the launch; here \\(x=20.387\\ \\mathrm{m}\\). At \\(\\alpha=45^\\circ\\) and \\(v_0=20\\ \\mathrm{m/s}\\) it is \\(y=x-0.024525\\,x^2\\); for \\(x=14.142\\) we get \\(y\\approx9.237\\), which is the position \\((14.142;\\,9.237)\\ \\mathrm{m}\\) read at \\(t=1\\ \\mathrm{s}\\).',
        )],
        scene: kn3Scene('kn3-path-scene', noArrows, 1,
            'Poševni met, \\(v_0=20\\ \\mathrm{m/s}\\), \\(\\alpha=45^\\circ\\), čas \\(1\\ \\mathrm{s}\\), brez puščic; lega \\((14{,}142;\\,9{,}237)\\ \\mathrm{m}\\).',
            'Projectile motion, \\(v_0=20\\ \\mathrm{m/s}\\), \\(\\alpha=45^\\circ\\), time \\(1\\ \\mathrm{s}\\), no arrows; position \\((14.142;\\,9.237)\\ \\mathrm{m}\\).'),
    }),
    step({
        id: 'kn3-angles', order: 5,
        title: text('Kota \\(30^\\circ\\) in \\(60^\\circ\\)', 'The angles \\(30^\\circ\\) and \\(60^\\circ\\)'),
        purpose: text('Napovedati, kako domet zavisi od izstrelnega kota.', 'Predicting how the range depends on the launch angle.'),
        explanation: text(
            'Hitrost \\(v_0=20\\ \\mathrm{m/s}\\) pustimo in spreminjamo izstrelni kot (korak \\(5^\\circ\\)). Slika kaže met pod \\(30^\\circ\\). Napovej: ali bo domet pri \\(60^\\circ\\) večji, manjši ali enak kakor pri \\(30^\\circ\\), in kateri kot med \\(40^\\circ\\), \\(45^\\circ\\) in \\(50^\\circ\\) da največji domet?',
            'Keep the speed \\(v_0=20\\ \\mathrm{m/s}\\) and change the launch angle (in steps of \\(5^\\circ\\)). The picture shows the throw at \\(30^\\circ\\). Predict: will the range at \\(60^\\circ\\) be larger, smaller or equal to the range at \\(30^\\circ\\), and which angle among \\(40^\\circ\\), \\(45^\\circ\\) and \\(50^\\circ\\) gives the largest range?',
        ),
        formulaIds: [],
        observationPrompt: text('Zapiši napoved, nato nastavi \\(\\alpha=30^\\circ\\), \\(60^\\circ\\), \\(40^\\circ\\), \\(45^\\circ\\), \\(50^\\circ\\) in preberi domet, čas leta in največjo višino.', 'Write down your prediction, then set \\(\\alpha=30^\\circ\\), \\(60^\\circ\\), \\(40^\\circ\\), \\(45^\\circ\\), \\(50^\\circ\\) and read the range, the flight time and the maximum height.'),
        expectedObservations: [text(
            'Pri \\(30^\\circ\\) in pri \\(60^\\circ\\) je domet enak, \\(\\approx35{,}312\\ \\mathrm{m}\\); višini sta različni, \\(\\approx5{,}097\\ \\mathrm{m}\\) in \\(\\approx15{,}291\\ \\mathrm{m}\\), prav tako časa leta, \\(\\approx2{,}039\\ \\mathrm{s}\\) in \\(\\approx3{,}531\\ \\mathrm{s}\\). Pri \\(40^\\circ\\) in \\(50^\\circ\\) je domet enak, \\(\\approx40{,}155\\ \\mathrm{m}\\), pri \\(45^\\circ\\) pa največji med njimi, \\(\\approx40{,}775\\ \\mathrm{m}\\). V teh primerih se kota, ki se seštejeta v \\(90^\\circ\\), ujemata v dometu.',
            'At \\(30^\\circ\\) and at \\(60^\\circ\\) the range is the same, \\(\\approx35.312\\ \\mathrm{m}\\); the heights differ, \\(\\approx5.097\\ \\mathrm{m}\\) and \\(\\approx15.291\\ \\mathrm{m}\\), and so do the flight times, \\(\\approx2.039\\ \\mathrm{s}\\) and \\(\\approx3.531\\ \\mathrm{s}\\). At \\(40^\\circ\\) and \\(50^\\circ\\) the range is the same, \\(\\approx40.155\\ \\mathrm{m}\\), and at \\(45^\\circ\\) it is the largest of them, \\(\\approx40.775\\ \\mathrm{m}\\). In these cases the angles that add up to \\(90^\\circ\\) agree in the range.',
        )],
        scene: kn3Scene('kn3-angles-scene', {...noArrows, alpha: 30}, 0,
            'Poševni met, \\(v_0=20\\ \\mathrm{m/s}\\), \\(\\alpha=30^\\circ\\), čas \\(0\\), brez puščic; domet \\(\\approx35{,}312\\ \\mathrm{m}\\).',
            'Projectile motion, \\(v_0=20\\ \\mathrm{m/s}\\), \\(\\alpha=30^\\circ\\), time \\(0\\), no arrows; range \\(\\approx35.312\\ \\mathrm{m}\\).'),
    }),
    step({
        id: 'kn3-explore', order: 6,
        title: text('Prosto raziskovanje', 'Free exploration'),
        purpose: text('Z lastnima \\(v_0\\) in \\(\\alpha\\) napovedati domet po formuli in ga preveriti.', 'Predicting the range for your own \\(v_0\\) and \\(\\alpha\\) with the formula and checking it.'),
        explanation: text(
            'Formula spodaj povezuje \\(v_0\\), \\(\\alpha\\) in \\(g\\) s časom leta, dometom in višino; primer za \\(45^\\circ\\) je izračunan. Izberi svoj \\(v_0\\) (\\(5\\) do \\(30\\ \\mathrm{m/s}\\), korak \\(1\\)) in \\(\\alpha\\) (\\(5^\\circ\\) do \\(85^\\circ\\), korak \\(5^\\circ\\)), po formuli izračunaj domet in šele nato preberi odčitek. Kako močno se parabola ukrivlja na vrhu, pokaže lekcija Ukrivljenost in krivinska krožnica.',
            'The formula below connects \\(v_0\\), \\(\\alpha\\) and \\(g\\) with the flight time, the range and the height; the example for \\(45^\\circ\\) is worked out. Choose your own \\(v_0\\) (\\(5\\) to \\(30\\ \\mathrm{m/s}\\), step \\(1\\)) and \\(\\alpha\\) (\\(5^\\circ\\) to \\(85^\\circ\\), step \\(5^\\circ\\)), compute the range with the formula and only then read the readout. How strongly the parabola bends at the top is shown by the lesson Curvature and the osculating circle.',
        ),
        formulaIds: ['projectile-range'],
        workedExampleId: 'kn3-range-45',
        observationPrompt: text('Najprej izračunaj domet za svoja \\(v_0\\) in \\(\\alpha\\), nato ga primerjaj z odčitkom.', 'First compute the range for your own \\(v_0\\) and \\(\\alpha\\), then compare it with the readout.'),
        expectedObservations: [text(
            'Račun in odčitek se ujemata do prikazane zaokrožitve. Na primer \\(v_0=30\\ \\mathrm{m/s}\\): pri \\(45^\\circ\\) je \\(R=900/9{,}81\\approx91{,}743\\ \\mathrm{m}\\), pri \\(30^\\circ\\) pa \\(R=900\\sin60^\\circ/9{,}81\\approx79{,}452\\ \\mathrm{m}\\), kar sta tudi odčitka.',
            'The computation and the readout agree up to the displayed rounding. For example with \\(v_0=30\\ \\mathrm{m/s}\\): at \\(45^\\circ\\) we get \\(R=900/9.81\\approx91.743\\ \\mathrm{m}\\), and at \\(30^\\circ\\) we get \\(R=900\\sin60^\\circ/9.81\\approx79.452\\ \\mathrm{m}\\), which are also the readouts.',
        )],
        scene: kn3Scene('kn3-explore-scene', {}, 0,
            'Začetni primer: poševni met, \\(v_0=20\\ \\mathrm{m/s}\\), \\(\\alpha=45^\\circ\\), čas \\(0\\), obe puščici; domet \\(\\approx40{,}775\\ \\mathrm{m}\\).',
            'The starting case: projectile motion, \\(v_0=20\\ \\mathrm{m/s}\\), \\(\\alpha=45^\\circ\\), time \\(0\\), both arrows; range \\(\\approx40.775\\ \\mathrm{m}\\).'),
    }),
];

// ---- KN4 -------------------------------------------------------------------------------------------------------------------------

/** The circle of KN4: radius 2 m and angular velocity 1,5 rad/s (on the stepper grid), so the speed is 3 m/s, the acceleration 4,5 m/s2 and the period about 4,189 s. */
export const KN4_PARAMS = {radius: 2, omega: 1.5} as const;
/** A quarter of a turn at the angular velocity 1,5 rad/s: pi/3 s, the point is at the top of the circle. */
const KN4_QUARTER = Math.PI / 3;

const kn4Scene = (id: string, params: KinematicsSceneParams, t: number, sl: string, en: string): LessonScene =>
    kinematicsScene(id, {motion: 'circular', params: {...KN4_PARAMS, ...params}, t}, sl, en);

const kn4Formulas: readonly FormulaBlock[] = [
    {
        id: 'uniform-circle',
        latex: "r(t)=(R\\cos\\omega t;\\,R\\sin\\omega t),\\quad v(t)=\\omega R\\,(-\\sin\\omega t;\\,\\cos\\omega t),\\quad a(t)=-\\omega^2r(t)",
        notation: text(
            '\\(R\\) je polmer krožnice, \\(\\omega\\) kotna hitrost (kot v radianih na sekundo), središče krožnice je v izhodišču, točka je ob \\(t=0\\) v \\((R;\\,0)\\); obhodni čas je \\(T=2\\pi/\\omega\\).',
            '\\(R\\) is the radius of the circle, \\(\\omega\\) the angular velocity (the angle in radians per second), the centre of the circle is at the origin, the point is at \\((R;\\,0)\\) at \\(t=0\\); the period is \\(T=2\\pi/\\omega\\).',
        ),
        explanation: text(
            'Argument: odvajanje po komponentah da hitrost \\(v\\) in pospešek \\(a=-\\omega^2r\\). Dolžina hitrosti je \\(|v|=\\omega R\\), stalna, saj je \\((-\\sin\\omega t;\\,\\cos\\omega t)\\) enotski vektor. Pospešek je \\(-\\omega^2\\) krat lega, torej kaže proti središču (centripetalni ali radialni pospešek) in je velik \\(|a|=\\omega^2R\\). Ker je \\(\\omega=v/R\\), je \\(|a|=v^2/R\\). Slike na grafu so ponazoritve teh enačb.',
            'Argument: differentiating componentwise gives the velocity \\(v\\) and the acceleration \\(a=-\\omega^2r\\). The length of the velocity is \\(|v|=\\omega R\\), constant, because \\((-\\sin\\omega t;\\,\\cos\\omega t)\\) is a unit vector. The acceleration is \\(-\\omega^2\\) times the position, so it points to the centre (the centripetal or radial acceleration) and has size \\(|a|=\\omega^2R\\). Since \\(\\omega=v/R\\), we have \\(|a|=v^2/R\\). The pictures on the graph are illustrations of these equations.',
        ),
    },
];

const kn4Examples: readonly WorkedExample[] = [
    {
        id: 'kn4-formula',
        title: text('\\(R=2\\ \\mathrm{m}\\), \\(\\omega=1{,}5\\ \\mathrm{rad/s}\\)', '\\(R=2\\ \\mathrm{m}\\), \\(\\omega=1.5\\ \\mathrm{rad/s}\\)'),
        calculationLatex: "v=\\omega R=1{,}5\\cdot2,\\qquad a=\\omega^2R=1{,}5^2\\cdot2,\\qquad \\frac{v^2}{R}=\\frac{3^2}{2}",
        resultLatex: "v=3,\\qquad a=4{,}5,\\qquad \\frac{v^2}{R}=4{,}5",
        check: text(
            'Odčitka sta \\(|v|=3\\ \\mathrm{m/s}\\) in \\(|a|=4{,}5\\ \\mathrm{m/s^2}\\); izraza \\(\\omega^2R\\) in \\(v^2/R\\) dasta isto vrednost.',
            'The readouts are \\(|v|=3\\ \\mathrm{m/s}\\) and \\(|a|=4.5\\ \\mathrm{m/s^2}\\); the expressions \\(\\omega^2R\\) and \\(v^2/R\\) give the same value.',
        ),
    },
];

const kn4Steps: readonly GuidedLessonStep[] = [
    step({
        id: 'kn4-circle', order: 1,
        title: text('Točka na krožnici', 'A point on a circle'),
        purpose: text('Napovedati hitrost in obhodni čas iz polmera in kotne hitrosti.', 'Predicting the speed and the period from the radius and the angular velocity.'),
        explanation: text(
            'Točka kroži po krožnici s polmerom \\(R=2\\ \\mathrm{m}\\) in središčem v izhodišču. Njena kotna hitrost je \\(\\omega=1{,}5\\ \\mathrm{rad/s}\\): vsako sekundo opiše kot \\(1{,}5\\) radiana, vedno enako. Takšnemu gibanju rečemo enakomerno kroženje. Slika kaže točko ob \\(t=0\\) v \\((2;\\,0)\\ \\mathrm{m}\\). Preden premakneš čas, napovej: kolikšna je velikost hitrosti točke v \\(\\mathrm{m/s}\\) in kolikšen je obhodni čas, čas enega kroga?',
            'A point moves on a circle of radius \\(R=2\\ \\mathrm{m}\\) with its centre at the origin. Its angular velocity is \\(\\omega=1.5\\ \\mathrm{rad/s}\\): every second it sweeps an angle of \\(1.5\\) radians, always the same. This motion is called uniform circular motion. The picture shows the point at \\(t=0\\) at \\((2;\\,0)\\ \\mathrm{m}\\). Before you move the time, predict: what is the speed of the point in \\(\\mathrm{m/s}\\) and what is the period, the time of one full circle?',
        ),
        formulaIds: [],
        observationPrompt: text('Zapiši napoved, nato preberi velikost hitrosti in obhodni čas \\(T\\).', 'Write down your prediction, then read the speed and the period \\(T\\).'),
        expectedObservations: [text(
            'Velikost hitrosti je \\(3\\ \\mathrm{m/s}\\) (v sekundi točka opiše lok dolžine \\(1{,}5\\cdot2=3\\ \\mathrm{m}\\)), obhodni čas je \\(T=2\\pi/1{,}5\\approx4{,}189\\ \\mathrm{s}\\). Ob \\(t=0\\) je hitrost \\((0;\\,3)\\ \\mathrm{m/s}\\).',
            'The speed is \\(3\\ \\mathrm{m/s}\\) (in one second the point sweeps an arc of length \\(1.5\\cdot2=3\\ \\mathrm{m}\\)), the period is \\(T=2\\pi/1.5\\approx4.189\\ \\mathrm{s}\\). At \\(t=0\\) the velocity is \\((0;\\,3)\\ \\mathrm{m/s}\\).',
        )],
        scene: kn4Scene('kn4-circle-scene', noArrows, 0,
            'Kroženje, \\(R=2\\ \\mathrm{m}\\), \\(\\omega=1{,}5\\ \\mathrm{rad/s}\\), čas \\(0\\), brez puščic; hitrost \\(3\\ \\mathrm{m/s}\\), obhodni čas \\(\\approx4{,}189\\ \\mathrm{s}\\).',
            'Circular motion, \\(R=2\\ \\mathrm{m}\\), \\(\\omega=1.5\\ \\mathrm{rad/s}\\), time \\(0\\), no arrows; speed \\(3\\ \\mathrm{m/s}\\), period \\(\\approx4.189\\ \\mathrm{s}\\).'),
    }),
    step({
        id: 'kn4-velocity', order: 2,
        title: text('Puščica hitrosti med krogom', 'The velocity arrow during the circle'),
        purpose: text('Napovedati, kaj se z vektorjem hitrosti zgodi med krogom.', 'Predicting what happens to the velocity vector during the circle.'),
        explanation: text(
            'Hitrost \\(v\\) je vektor: ima dolžino (velikost hitrosti) in smer. Vklopljena je njena puščica. Premikaj čas ali pritisni Predvajaj. Napovej: kaj se med krogom spreminja, dolžina puščice, njena smer ali oboje?',
            'The velocity \\(v\\) is a vector: it has a length (the speed) and a direction. Its arrow is switched on. Move the time or press Play. Predict: what changes during the circle, the length of the arrow, its direction or both?',
        ),
        formulaIds: [],
        observationPrompt: text('Zapiši napoved in preberi hitrost ob \\(t=0\\), \\(1{,}05\\) in \\(2{,}09\\ \\mathrm{s}\\) ter stanje.', 'Write down your prediction and read the velocity at \\(t=0\\), \\(1.05\\) and \\(2.09\\ \\mathrm{s}\\), and the status.'),
        expectedObservations: [text(
            'Velikost hitrosti je vedno \\(3\\ \\mathrm{m/s}\\), spreminja se samo smer: hitrost je \\((0;\\,3)\\) ob \\(t=0\\), \\((-3;\\,0)\\) ob \\(t=\\pi/3\\approx1{,}05\\ \\mathrm{s}\\) (točka je takrat v \\((0;\\,2)\\)) in približno \\((0;\\,-3)\\ \\mathrm{m/s}\\) ob \\(t\\approx2{,}09\\ \\mathrm{s}\\). V teh primerih je hitrost pravokotna na polmer, kaže vzdolž tangente. Stanje pove, da je hitrost stalna.',
            'The speed is always \\(3\\ \\mathrm{m/s}\\), only the direction changes: the velocity is \\((0;\\,3)\\) at \\(t=0\\), \\((-3;\\,0)\\) at \\(t=\\pi/3\\approx1.05\\ \\mathrm{s}\\) (the point is then at \\((0;\\,2)\\)) and approximately \\((0;\\,-3)\\ \\mathrm{m/s}\\) at \\(t\\approx2.09\\ \\mathrm{s}\\). In these cases the velocity is perpendicular to the radius, along the tangent. The status says that the speed is constant.',
        )],
        scene: kn4Scene('kn4-velocity-scene', {showVelocity: true, showAcceleration: false}, KN4_QUARTER,
            'Kroženje, \\(R=2\\ \\mathrm{m}\\), \\(\\omega=1{,}5\\ \\mathrm{rad/s}\\), čas \\(\\pi/3\\), puščica hitrosti: \\(v=(-3;\\,0)\\ \\mathrm{m/s}\\).',
            'Circular motion, \\(R=2\\ \\mathrm{m}\\), \\(\\omega=1.5\\ \\mathrm{rad/s}\\), time \\(\\pi/3\\), velocity arrow: \\(v=(-3;\\,0)\\ \\mathrm{m/s}\\).'),
    }),
    step({
        id: 'kn4-acceleration', order: 3,
        title: text('Pospešek pri stalni hitrosti', 'The acceleration at constant speed'),
        purpose: text('Napovedati smer in velikost pospeška, ko je velikost hitrosti stalna.', 'Predicting the direction and size of the acceleration when the speed is constant.'),
        explanation: text(
            'Pospešek \\(a\\) pove, kako hitro se vektor hitrosti spreminja (črtkana puščica). Velikost hitrosti je stalna, smer pa ne. Slika kaže točko na vrhu krožnice, v \\((0;\\,2)\\ \\mathrm{m}\\), ob \\(t=\\pi/3\\). Napovej: ali je pospešek \\(0\\)? Če ni, kam kaže in kako velik je približno?',
            'The acceleration \\(a\\) tells how fast the velocity vector changes (the dashed arrow). The speed is constant, the direction is not. The picture shows the point at the top of the circle, at \\((0;\\,2)\\ \\mathrm{m}\\), at \\(t=\\pi/3\\). Predict: is the acceleration \\(0\\)? If not, where does it point and roughly how large is it?',
        ),
        formulaIds: [],
        observationPrompt: text('Zapiši napoved, nato preberi pospešek, lego in tangentni ter normalni pospešek; premakni čas in poglej, kam kaže pospešek drugje.', 'Write down your prediction, then read the acceleration, the position and the tangential and normal accelerations; move the time and see where the acceleration points elsewhere.'),
        expectedObservations: [text(
            'Pospešek ni \\(0\\): ob \\(t=\\pi/3\\) je \\((0;\\,-4{,}5)\\ \\mathrm{m/s^2}\\), točka je v \\((0;\\,2)\\), pospešek kaže navpično navzdol, proti središču \\((0;\\,0)\\). Ob \\(t=0\\) je \\((-4{,}5;\\,0)\\), ob \\(t=2\\pi/3\\approx2{,}09\\ \\mathrm{s}\\) približno \\((4{,}5;\\,0)\\): vedno proti središču, velik \\(4{,}5\\ \\mathrm{m/s^2}\\). To je centripetalni (radialni) pospešek, pospešek proti središču. Tangentni pospešek je \\(0\\), normalni \\(4{,}5\\ \\mathrm{m/s^2}\\).',
            'The acceleration is not \\(0\\): at \\(t=\\pi/3\\) it is \\((0;\\,-4.5)\\ \\mathrm{m/s^2}\\), the point is at \\((0;\\,2)\\), and the acceleration points straight down, to the centre \\((0;\\,0)\\). At \\(t=0\\) it is \\((-4.5;\\,0)\\), at \\(t=2\\pi/3\\approx2.09\\ \\mathrm{s}\\) approximately \\((4.5;\\,0)\\): always to the centre, with size \\(4.5\\ \\mathrm{m/s^2}\\). This is the centripetal (radial) acceleration, the acceleration towards the centre. The tangential acceleration is \\(0\\), the normal one \\(4.5\\ \\mathrm{m/s^2}\\).',
        )],
        scene: kn4Scene('kn4-acceleration-scene', {showVelocity: true, showAcceleration: true}, KN4_QUARTER,
            'Kroženje, \\(R=2\\ \\mathrm{m}\\), \\(\\omega=1{,}5\\ \\mathrm{rad/s}\\), čas \\(\\pi/3\\), obe puščici: \\(a=(0;\\,-4{,}5)\\ \\mathrm{m/s^2}\\).',
            'Circular motion, \\(R=2\\ \\mathrm{m}\\), \\(\\omega=1.5\\ \\mathrm{rad/s}\\), time \\(\\pi/3\\), both arrows: \\(a=(0;\\,-4.5)\\ \\mathrm{m/s^2}\\).'),
    }),
    step({
        id: 'kn4-omega', order: 4,
        title: text('Podvojimo kotno hitrost', 'Doubling the angular velocity'),
        purpose: text('Napovedati, kako se hitrost in pospešek spremenita ob dvakrat večji kotni hitrosti.', 'Predicting how the speed and the acceleration change when the angular velocity doubles.'),
        explanation: text(
            'Polmer pustimo pri \\(R=2\\ \\mathrm{m}\\), kotno hitrost podvojimo z \\(1{,}5\\) na \\(3\\ \\mathrm{rad/s}\\) (drsnik Kotna hitrost). Napovej: kolikšni sta potem velikost hitrosti in velikost pospeška? Pri \\(\\omega=1{,}5\\) sta bili \\(3\\ \\mathrm{m/s}\\) in \\(4{,}5\\ \\mathrm{m/s^2}\\).',
            'Keep the radius at \\(R=2\\ \\mathrm{m}\\) and double the angular velocity from \\(1.5\\) to \\(3\\ \\mathrm{rad/s}\\) (the Angular velocity slider). Predict: what are the speed and the size of the acceleration then? At \\(\\omega=1.5\\) they were \\(3\\ \\mathrm{m/s}\\) and \\(4.5\\ \\mathrm{m/s^2}\\).',
        ),
        formulaIds: [],
        observationPrompt: text('Zapiši napoved, nato nastavi \\(\\omega=3\\) in preberi hitrost, pospešek in obhodni čas.', 'Write down your prediction, then set \\(\\omega=3\\) and read the speed, the acceleration and the period.'),
        expectedObservations: [text(
            'Velikost hitrosti je \\(6\\ \\mathrm{m/s}\\) (dvakrat več), velikost pospeška pa \\(18\\ \\mathrm{m/s^2}\\), štirikrat več kot prej (\\(4\\cdot4{,}5=18\\)). Obhodni čas je \\(\\approx2{,}094\\ \\mathrm{s}\\), polovica prejšnjega.',
            'The speed is \\(6\\ \\mathrm{m/s}\\) (twice as large), and the size of the acceleration is \\(18\\ \\mathrm{m/s^2}\\), four times as large as before (\\(4\\cdot4.5=18\\)). The period is \\(\\approx2.094\\ \\mathrm{s}\\), half of the previous one.',
        )],
        scene: kn4Scene('kn4-omega-scene', {showVelocity: true, showAcceleration: true}, KN4_QUARTER,
            'Kroženje, \\(R=2\\ \\mathrm{m}\\), \\(\\omega=1{,}5\\ \\mathrm{rad/s}\\), čas \\(\\pi/3\\), obe puščici; izhodišče, od koder spreminjamo \\(\\omega\\): hitrost \\(3\\ \\mathrm{m/s}\\), pospešek \\(4{,}5\\ \\mathrm{m/s^2}\\).',
            'Circular motion, \\(R=2\\ \\mathrm{m}\\), \\(\\omega=1.5\\ \\mathrm{rad/s}\\), time \\(\\pi/3\\), both arrows; the starting point from which we change \\(\\omega\\): speed \\(3\\ \\mathrm{m/s}\\), acceleration \\(4.5\\ \\mathrm{m/s^2}\\).'),
    }),
    step({
        id: 'kn4-radius', order: 5,
        title: text('Podvojimo polmer pri enaki kotni hitrosti', 'Doubling the radius at the same angular velocity'),
        purpose: text('Napovedati učinek dvakrat večjega polmera pri stalni kotni hitrosti.', 'Predicting the effect of a doubled radius at a constant angular velocity.'),
        explanation: text(
            'Kotno hitrost vrnemo na \\(\\omega=1{,}5\\ \\mathrm{rad/s}\\) in podvojimo polmer z \\(2\\) na \\(4\\ \\mathrm{m}\\) (drsnik Polmer). Napovej: kolikšni sta velikost hitrosti in velikost pospeška, in ali se obhodni čas spremeni?',
            'Return the angular velocity to \\(\\omega=1.5\\ \\mathrm{rad/s}\\) and double the radius from \\(2\\) to \\(4\\ \\mathrm{m}\\) (the Radius slider). Predict: what are the speed and the size of the acceleration, and does the period change?',
        ),
        formulaIds: [],
        observationPrompt: text('Zapiši napoved, nato nastavi \\(R=4\\) in preberi hitrost, pospešek in obhodni čas.', 'Write down your prediction, then set \\(R=4\\) and read the speed, the acceleration and the period.'),
        expectedObservations: [text(
            'Velikost hitrosti je \\(6\\ \\mathrm{m/s}\\), velikost pospeška \\(9\\ \\mathrm{m/s^2}\\), dvakrat več kot pri \\(R=2\\) (\\(2\\cdot4{,}5=9\\)). Obhodni čas ostane \\(\\approx4{,}189\\ \\mathrm{s}\\): večja krožnica je dalj, a točka je hitrejša.',
            'The speed is \\(6\\ \\mathrm{m/s}\\), the size of the acceleration \\(9\\ \\mathrm{m/s^2}\\), twice as large as at \\(R=2\\) (\\(2\\cdot4.5=9\\)). The period stays \\(\\approx4.189\\ \\mathrm{s}\\): the larger circle is longer, but the point is faster.',
        )],
        scene: kn4Scene('kn4-radius-scene', {showVelocity: true, showAcceleration: true}, KN4_QUARTER,
            'Kroženje, \\(R=2\\ \\mathrm{m}\\), \\(\\omega=1{,}5\\ \\mathrm{rad/s}\\), čas \\(\\pi/3\\), obe puščici; izhodišče, od koder spreminjamo \\(R\\): hitrost \\(3\\ \\mathrm{m/s}\\), pospešek \\(4{,}5\\ \\mathrm{m/s^2}\\).',
            'Circular motion, \\(R=2\\ \\mathrm{m}\\), \\(\\omega=1.5\\ \\mathrm{rad/s}\\), time \\(\\pi/3\\), both arrows; the starting point from which we change \\(R\\): speed \\(3\\ \\mathrm{m/s}\\), acceleration \\(4.5\\ \\mathrm{m/s^2}\\).'),
    }),
    step({
        id: 'kn4-speed', order: 6,
        title: text('Podvojimo polmer pri enaki hitrosti', 'Doubling the radius at the same speed'),
        purpose: text('Napovedati pospešek pri dvakrat večjem polmeru, ko je velikost hitrosti enaka.', 'Predicting the acceleration at a doubled radius when the speed stays the same.'),
        explanation: text(
            'Graf ne drži hitrosti stalne sam, zato jo moramo ohraniti sami. Polmer podvojimo na \\(R=4\\ \\mathrm{m}\\), kotno hitrost pa nastavimo tako, da je velikost hitrosti spet \\(3\\ \\mathrm{m/s}\\) (kotne hitrosti so na korakih po \\(0{,}25\\ \\mathrm{rad/s}\\)). Napovej: katera kotna hitrost to je in kolikšen je tedaj pospešek?',
            'The graph does not hold the speed constant by itself, so we must keep it ourselves. Double the radius to \\(R=4\\ \\mathrm{m}\\) and set the angular velocity so that the speed is \\(3\\ \\mathrm{m/s}\\) again (the angular velocities are in steps of \\(0.25\\ \\mathrm{rad/s}\\)). Predict: which angular velocity is it, and what is the acceleration then?',
        ),
        formulaIds: [],
        observationPrompt: text('Zapiši napoved, nato nastavi \\(R=4\\) in \\(\\omega\\) ter preberi hitrost, pospešek in obhodni čas.', 'Write down your prediction, then set \\(R=4\\) and \\(\\omega\\) and read the speed, the acceleration and the period.'),
        expectedObservations: [text(
            'Treba je \\(\\omega=0{,}75\\ \\mathrm{rad/s}\\). Velikost hitrosti je \\(3\\ \\mathrm{m/s}\\), pospešek pa \\(2{,}25\\ \\mathrm{m/s^2}\\), polovica prejšnjih \\(4{,}5\\) (\\(v^2/R=9/4\\)). Obhodni čas je \\(\\approx8{,}378\\ \\mathrm{s}\\).',
            'It takes \\(\\omega=0.75\\ \\mathrm{rad/s}\\). The speed is \\(3\\ \\mathrm{m/s}\\) and the acceleration is \\(2.25\\ \\mathrm{m/s^2}\\), half of the previous \\(4.5\\) (\\(v^2/R=9/4\\)). The period is \\(\\approx8.378\\ \\mathrm{s}\\).',
        )],
        scene: kn4Scene('kn4-speed-scene', {showVelocity: true, showAcceleration: true}, KN4_QUARTER,
            'Kroženje, \\(R=2\\ \\mathrm{m}\\), \\(\\omega=1{,}5\\ \\mathrm{rad/s}\\), čas \\(\\pi/3\\), obe puščici; izhodišče, od koder spreminjamo \\(R\\) in \\(\\omega\\): hitrost \\(3\\ \\mathrm{m/s}\\), pospešek \\(4{,}5\\ \\mathrm{m/s^2}\\).',
            'Circular motion, \\(R=2\\ \\mathrm{m}\\), \\(\\omega=1.5\\ \\mathrm{rad/s}\\), time \\(\\pi/3\\), both arrows; the starting point from which we change \\(R\\) and \\(\\omega\\): speed \\(3\\ \\mathrm{m/s}\\), acceleration \\(4.5\\ \\mathrm{m/s^2}\\).'),
    }),
    step({
        id: 'kn4-explore', order: 7,
        title: text('Prosto raziskovanje', 'Free exploration'),
        purpose: text('Z lastnima \\(R\\) in \\(\\omega\\) napovedati pospešek po formuli in ga preveriti.', 'Predicting the acceleration for your own \\(R\\) and \\(\\omega\\) with the formula and checking it.'),
        explanation: text(
            'Enačbe spodaj povzamejo prejšnje korake; primer za \\(R=2\\ \\mathrm{m}\\), \\(\\omega=1{,}5\\ \\mathrm{rad/s}\\) je izračunan. Izberi svoj polmer (\\(0{,}5\\) do \\(4\\ \\mathrm{m}\\), korak \\(0{,}5\\)) in kotno hitrost (\\(0{,}5\\) do \\(4\\ \\mathrm{rad/s}\\), korak \\(0{,}25\\)), izračunaj velikost hitrosti in pospeška, in šele nato preberi odčitka. Preveri še, da pospešek kaže proti središču ob vsakem času. Lekcija o tangentnem in normalnem pospešku (naslednja v poglavju) isto razstavitev uporabi na poteh, ki niso krožnice.',
            'The equations below sum up the previous steps; the example for \\(R=2\\ \\mathrm{m}\\), \\(\\omega=1.5\\ \\mathrm{rad/s}\\) is worked out. Choose your own radius (\\(0.5\\) to \\(4\\ \\mathrm{m}\\), step \\(0.5\\)) and angular velocity (\\(0.5\\) to \\(4\\ \\mathrm{rad/s}\\), step \\(0.25\\)), compute the speed and the acceleration, and only then read the two readouts. Also check that the acceleration points to the centre at every time. The lesson on tangential and normal acceleration (the next one in the chapter) uses the same split on paths that are not circles.',
        ),
        formulaIds: ['uniform-circle'],
        workedExampleId: 'kn4-formula',
        observationPrompt: text('Najprej izračunaj \\(\\omega R\\) in \\(\\omega^2R\\) za svoja \\(R\\) in \\(\\omega\\), nato ju primerjaj z odčitkoma.', 'First compute \\(\\omega R\\) and \\(\\omega^2R\\) for your own \\(R\\) and \\(\\omega\\), then compare them with the readouts.'),
        expectedObservations: [text(
            'Račun in odčitka se ujemata. Na primer \\(R=3\\ \\mathrm{m}\\), \\(\\omega=2\\ \\mathrm{rad/s}\\): \\(\\omega R=6\\ \\mathrm{m/s}\\), \\(\\omega^2R=12\\ \\mathrm{m/s^2}\\) in \\(v^2/R=36/3=12\\ \\mathrm{m/s^2}\\); ob \\(t\\approx0{,}79\\) je lega približno \\((0;\\,3)\\), hitrost \\((-6;\\,0)\\) in pospešek \\((0;\\,-12)\\).',
            'The computation and the readouts agree. For example \\(R=3\\ \\mathrm{m}\\), \\(\\omega=2\\ \\mathrm{rad/s}\\): \\(\\omega R=6\\ \\mathrm{m/s}\\), \\(\\omega^2R=12\\ \\mathrm{m/s^2}\\) and \\(v^2/R=36/3=12\\ \\mathrm{m/s^2}\\); at \\(t\\approx0.79\\) the position is approximately \\((0;\\,3)\\), the velocity \\((-6;\\,0)\\) and the acceleration \\((0;\\,-12)\\).',
        )],
        scene: kn4Scene('kn4-explore-scene', {showVelocity: true, showAcceleration: true}, KN4_QUARTER,
            'Začetni primer: kroženje, \\(R=2\\ \\mathrm{m}\\), \\(\\omega=1{,}5\\ \\mathrm{rad/s}\\), čas \\(\\pi/3\\), obe puščici.',
            'The starting case: circular motion, \\(R=2\\ \\mathrm{m}\\), \\(\\omega=1.5\\ \\mathrm{rad/s}\\), time \\(\\pi/3\\), both arrows.'),
    }),
];

// ---- Lesson assembly -------------------------------------------------------------------------------------------------------------

const sources: GuidedLesson['sources'] = [
    {
        id: 'bezeg-kinematics-implementation',
        citation: 'Bezeg source: src/kinematics/ (motions, decomposition, arrow scales, state model) and src/graphs/curves/kinematics/KinematicsGraph.tsx.',
        implementationCorrespondence: 'A scene sets the motion, its parameters and the time of the kinematics graph; every number is a readout of that graph in SI units (lengths in metres, time in seconds), the text quotes only values of those scenes, values the learner reads after an action the text asks for, or values of a formula shown in the same step.',
    },
];

const kn1: GuidedLesson = {
    demonstrationId: 'curve-kinematics',
    title: text('Vektorji lege, hitrosti in pospeška', 'Position, velocity and acceleration vectors'),
    summary: text(
        'Lega \\(r(t)\\) je točka, hitrost \\(r\'(t)\\) leži na tangenti poti in je dolga toliko kakor hitrost, pospešek \\(r\'\'(t)\\) pa pove, kako hitro se hitrost spreminja. Hitrost \\(0\\) ne pomeni pospeška \\(0\\).',
        'The position \\(r(t)\\) is a point, the velocity \\(r\'(t)\\) lies on the tangent of the path and its length is the speed, and the acceleration \\(r\'\'(t)\\) tells how fast the velocity changes. A velocity \\(0\\) does not mean an acceleration \\(0\\).',
    ),
    prerequisites: [text('Lekcija o parametričnih krivuljah in tangenti (Geometrija krivulj).', 'The lesson on parametric curves and the tangent (Geometry of curves).')],
    learningGoals: [
        text('Veš, da je lega točka, hitrost tangentni vektor z dolžino, enako hitrosti, in pospešek odvod hitrosti.', 'Know that the position is a point, the velocity a tangent vector whose length is the speed, and the acceleration the derivative of the velocity.'),
        text('Veš, da pospešek ni nujno vzporeden s hitrostjo in da je lahko hitrost \\(0\\), pospešek pa ne.', 'Know that the acceleration need not be parallel to the velocity and that the velocity can be \\(0\\) while the acceleration is not.'),
        text('Prebereš lego, hitrost in pospešek iz odčitkov in puščic na grafu v enotah SI.', 'Read the position, velocity and acceleration from the readouts and arrows on the graph in SI units.'),
    ],
    formulaBlocks: kn1Formulas,
    workedExamples: kn1Examples,
    steps: kn1Steps,
    sources,
    edgeCases: [
        text('Pri hitrosti \\(0\\) (špica) je smer gibanja nedoločena: graf ne nariše puščice hitrosti in pove, da je hitrost \\(0\\) ali skoraj \\(0\\).', 'At velocity \\(0\\) (a cusp) the direction of motion is undefined: the graph draws no velocity arrow and says the velocity is \\(0\\) or almost \\(0\\).'),
        text('Merili puščic hitrosti in pospeška sta različni in se spremenita z gibanjem; dolžin puščic različnih enot ne primerjamo.', 'The scales of the velocity and acceleration arrows differ and change with the motion; arrows of different units are not compared in length.'),
    ],
    unresolvedQuestions: [],
};

const kn2: GuidedLesson = {
    demonstrationId: 'curve-kinematics',
    title: text('Hitrost in parametrizacija', 'Speed and parametrization'),
    summary: text(
        'Ista pot ima veliko parametrizacij: spremenijo hitrost, pospešek in čas, ob katerem pridemo na kraj, ne pa poti, njene dolžine, smeri tangente in ukrivljenosti.',
        'One path has many parametrizations: they change the speed, the acceleration and the time at which a place is reached, but not the path, its length, the direction of the tangent or the curvature.',
    ),
    prerequisites: [text('Lekcija o legi, hitrosti in pospešku (prva lekcija poglavja) in o dolžini loka s konstantnim parametrom.', 'The lesson on position, velocity and acceleration (the first lesson of the chapter) and the arc-length lesson with a constant parameter.')],
    learningGoals: [
        text('Veš, da ista pot dopušča različne parametrizacije z različnimi hitrostmi in pospeški.', 'Know that one path allows different parametrizations with different speeds and accelerations.'),
        text('Utemeljiš z verižnim pravilom, da se smer tangente ne spremeni, in da je \\(a_N=\\kappa v^2\\) z isto ukrivljenostjo.', 'Argue with the chain rule that the direction of the tangent does not change and that \\(a_N=\\kappa v^2\\) with the same curvature.'),
        text('Poznaš povezavo na enake loke (enakomerno parametrizacijo), s katero odpravimo spreminjanje hitrosti.', 'Know the link to equal arcs (uniform parametrization), which removes the speed variation.'),
    ],
    formulaBlocks: kn2Formulas,
    workedExamples: kn2Examples,
    steps: kn2Steps,
    sources,
    edgeCases: [
        text('Za \\(b\\ge1\\) kot \\(\\theta\\) ni več strogo naraščajoč in točka bi se vračala; drsnik zato sega samo do \\(0{,}9\\).', 'For \\(b\\ge1\\) the angle \\(\\theta\\) is no longer strictly increasing and the point would turn back; the slider therefore stops at \\(0.9\\).'),
        text('Ob \\(t=\\pi\\) je \\(a_T\\) približno \\(0\\): to je trenutek najmanjše hitrosti, ne stalna hitrost.', 'At \\(t=\\pi\\) the value \\(a_T\\) is approximately \\(0\\): this is the moment of smallest speed, not a constant speed.'),
    ],
    unresolvedQuestions: [],
};

const kn3: GuidedLesson = {
    demonstrationId: 'curve-kinematics',
    title: text('Poševni met in parabola', 'Projectile motion and the parabola'),
    summary: text(
        'Poševni met je gibanje žoge, na katero deluje samo težni pospešek. Z grafom raziščemo, kako se pri njem spreminjata hitrost in lega, kakšna je pot in kako domet zavisi od izstrelnega kota.',
        'Projectile motion is the motion of a ball with only the gravitational acceleration acting on it. With the graph we explore how its velocity and position change, what the path is and how the range depends on the launch angle.',
    ),
    prerequisites: [text('Lekcija o legi, hitrosti in pospešku (prva lekcija poglavja) in kvadratna funkcija.', 'The lesson on position, velocity and acceleration (the first lesson of the chapter) and the quadratic function.')],
    learningGoals: [
        text('Veš, da je pri poševnem metu vodoravni del hitrosti stalen, navpični pa se enakomerno spreminja, ker je pospešek stalen in navpičen.', 'Know that in projectile motion the horizontal part of the velocity is constant and the vertical part changes uniformly, because the acceleration is constant and vertical.'),
        text('Utemeljiš, da je pot parabola, z izločitvijo časa iz enačb lege.', 'Argue that the path is a parabola by eliminating the time from the equations of the position.'),
        text('Veš, da kota \\(\\alpha\\) in \\(90^\\circ-\\alpha\\) dasta enak domet, in izračunaš čas leta, domet in največjo višino.', 'Know that the angles \\(\\alpha\\) and \\(90^\\circ-\\alpha\\) give the same range, and compute the flight time, the range and the maximum height.'),
    ],
    formulaBlocks: kn3Formulas,
    workedExamples: kn3Examples,
    steps: kn3Steps,
    sources,
    edgeCases: [
        text('Na vrhu je navpični del hitrosti \\(0\\), hitrost pa ne, saj je vodoravni del \\(v_0\\cos\\alpha\\) pri vseh kotih lekcije (\\(\\alpha\\le85^\\circ\\)) večji od \\(0\\); pospešek je tudi na vrhu \\(g\\).', 'At the top the vertical part of the velocity is \\(0\\) but the velocity is not, because the horizontal part \\(v_0\\cos\\alpha\\) is larger than \\(0\\) for every angle of the lesson (\\(\\alpha\\le85^\\circ\\)); the acceleration at the top is also \\(g\\).'),
        text('Odčitki so zaokroženi na tri decimalke: ob \\(t=1{,}44\\ \\mathrm{s}\\) je navpični del hitrosti \\(0{,}016\\ \\mathrm{m/s}\\), ker je točen vrh ob \\(t\\approx1{,}4416\\ \\mathrm{s}\\).', 'The readouts are rounded to three decimals: at \\(t=1.44\\ \\mathrm{s}\\) the vertical part of the velocity is \\(0.016\\ \\mathrm{m/s}\\), because the exact top is at \\(t\\approx1.4416\\ \\mathrm{s}\\).'),
        text('Drsnik časa sega do časa leta; gibanje po pristanku ni del modela.', 'The time slider ends at the flight time; the motion after the landing is not part of the model.'),
    ],
    unresolvedQuestions: [],
};

const kn4: GuidedLesson = {
    demonstrationId: 'curve-kinematics',
    title: text('Enakomerno kroženje', 'Uniform circular motion'),
    summary: text(
        'Enakomerno kroženje je kroženje po krožnici s stalno kotno hitrostjo. Z grafom raziščemo, kaj se pri njem spreminja, kam kaže pospešek in kako njegova velikost zavisi od polmera in kotne hitrosti.',
        'Uniform circular motion is motion on a circle with a constant angular velocity. With the graph we explore what changes in it, where the acceleration points and how its size depends on the radius and the angular velocity.',
    ),
    prerequisites: [text('Lekcija o legi, hitrosti in pospešku (prva lekcija poglavja) in enotska krožnica.', 'The lesson on position, velocity and acceleration (the first lesson of the chapter) and the unit circle.')],
    learningGoals: [
        text('Veš, da se pri enakomernem kroženju vektor hitrosti spreminja samo po smeri in da pospešek kaže proti središču.', 'Know that in uniform circular motion the velocity vector changes only in direction and that the acceleration points to the centre.'),
        text('Veš, da je velikost centripetalnega pospeška \\(\\omega^2R=v^2/R\\) in izračunaš, kako se spremeni pri spremembi \\(R\\) ali \\(\\omega\\).', 'Know that the size of the centripetal acceleration is \\(\\omega^2R=v^2/R\\) and compute how it changes when \\(R\\) or \\(\\omega\\) changes.'),
        text('Iz odčitkov na grafu v enotah SI preveriš \\(v=\\omega R\\) in \\(T=2\\pi/\\omega\\).', 'Check \\(v=\\omega R\\) and \\(T=2\\pi/\\omega\\) from the readouts of the graph in SI units.'),
    ],
    formulaBlocks: kn4Formulas,
    workedExamples: kn4Examples,
    steps: kn4Steps,
    sources,
    edgeCases: [
        text('Tangentni pospešek \\(a_T=0\\) pri enakomernem kroženju izhaja iz izbire gibanja; graf ga pokaže kot zaokroženo vrednost.', 'The tangential acceleration \\(a_T=0\\) in uniform circular motion follows from the choice of motion; the graph shows it as a rounded value.'),
        text('Graf nima izbire, katero količino držimo stalno; pri spremembi polmera pri stalni velikosti hitrosti je treba kotno hitrost nastaviti sam (polje ima korake po \\(0{,}25\\ \\mathrm{rad/s}\\)).', 'The graph has no choice of which quantity to hold constant; to change the radius at a constant speed one must set the angular velocity oneself (the field has steps of \\(0.25\\ \\mathrm{rad/s}\\)).'),
    ],
    unresolvedQuestions: [],
};

export const kinematicsVectorsLesson: GuidedLesson = kn1;
export const kinematicsSpeedLesson: GuidedLesson = kn2;
export const kinematicsProjectileLesson: GuidedLesson = kn3;
export const kinematicsCircularLesson: GuidedLesson = kn4;
