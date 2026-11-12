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

export const kinematicsVectorsLesson: GuidedLesson = kn1;
export const kinematicsSpeedLesson: GuidedLesson = kn2;
