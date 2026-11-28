/**
 * Guided lesson KN5 of the kinematics family, batch C (docs/specs/kinematics-lessons.md): tangential and normal acceleration with curvature, on `curve-kinematics`
 * (KinematicsGraph). Scenes use only the `kinematics` actions the graph registers (`set-motion`, `set-params`, `set-time`), start from the Demonstration default and
 * name what they set; no scene starts playback. Every readout of the graph shows on the first frame at any time, so every predicting step opens on the state BEFORE
 * the change it asks for: the learner predicts the effect of one control, makes the change and compares. Every number the text quotes is a readout of the graph for
 * that scene or for the state after the learner's change, or a value of a formula or arithmetic shown in the same step; the numbers are listed per step in
 * docs/reviews/feature-streams/families-prep/notes/f3-kin-c.md ("Slice 2").
 */
import type {LessonAction} from '../model';
import {frameDeclarer, type FrameDeclaration} from '../../graphs/base/declare/graphDeclaration';
import type {KinematicsIds} from '../../graphs/curves/kinematics/KinematicsGraph';
import type {FormulaBlock, GuidedLesson, GuidedLessonFrame, GuidedLessonStep, LessonScene, LocalizedText, WorkedExample} from './guidedLessons';
import {kinematicsSceneActions, type KinematicsSceneSpec} from './kinematicsGuidedLessons';

const text = (sl: string, en: string): LocalizedText => ({sl, en});
const frame = (id: string, kind: GuidedLessonFrame['kind'], declare?: FrameDeclaration): GuidedLessonFrame => ({id, kind, ...(declare ? {declare} : {})});
const kinematicsFrame = frameDeclarer<KinematicsIds>();

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
    /** What the frames of the step declare about the graph: the controls the text names, the rows it reads, the Orodja card it needs. */
    readonly declare?: FrameDeclaration;
}

const step = ({declare, ...content}: StepContent): GuidedLessonStep => ({
    ...content,
    frames: [
        frame(`${content.id}-explanation`, 'explanation', declare),
        ...(content.workedExampleId ? [frame(`${content.id}-calculation`, 'calculation')] : []),
        frame(`${content.id}-observation`, 'observation', declare),
    ],
});

const scene = (id: string, spec: KinematicsSceneSpec, sl: string, en: string): LessonScene => {
    const actions: LessonAction[] = kinematicsSceneActions(id, spec);
    return {id, basedOn: 'demonstration-default', actions, expectedState: text(sl, en)};
};

/** The arch of the cycloid at t = pi/2 s (a_T 0,707): the opening of step 1 and the projection step. */
export const KN5_ARCH_TIME = Math.PI / 2;
/** The top of the arch as the learner reaches it: the time grid is 0,01 s, so 3,14 (pi is not on the grid); a_T is then 0,001, not 0. */
export const KN5_TOP_TIME = 3.14;
/** The osculating-circle step: early on the arch (kappa about -1,010, radius about 0,990, centre about (0,98; -0,12)), where the whole circle and its centre are on the board; at the top (radius 4) the centre is below the board. */
export const KN5_OSCULATING_TIME = 0.5;
/** The time the projection step asks the learner to move to. */
export const KN5_PROJECTION_TIME = 2;
/** The speed step: the opening time and the time the learner moves to (a 0,1 s step). */
export const KN5_SPEED_TIME = 1;
export const KN5_SPEED_NEXT_TIME = 1.1;
/** The circular motion of step 6: radius 1 m, angular velocity 1 rad/s, both switches on; the learner sets the angular velocity to `KN5_HALF_OMEGA`. */
export const KN5_CIRCLE_PARAMS = {radius: 1, omega: 1, split: true, osculating: true} as const;
export const KN5_CIRCLE_TIME = 1;
export const KN5_HALF_OMEGA = 0.5;
/** The neutral state of the free exploration: the cycloid at 2 s with both switches on. */
export const KN5_EXPLORE_TIME = 2;

const kn5Formulas: readonly FormulaBlock[] = [
    {
        id: 'tangential-normal',
        latex: "a=a_T\\,T+a_N\\,N,\\qquad a_T=\\frac{\\mathrm{d}|v|}{\\mathrm{d}t},\\qquad a_N=\\kappa\\,|v|^2,\\qquad a_T^2+a_N^2=|a|^2",
        notation: text(
            '\\(T=v/|v|\\) je enotski tangentni vektor, \\(N\\) enotski normalni vektor (\\(T\\), zasukan za \\(90^\\circ\\) v levo), \\(\\kappa\\) predznačena ukrivljenost poti (pozitivna, ko pot zavija v levo, negativna, ko zavija v desno), \\(|v|\\) velikost hitrosti.',
            '\\(T=v/|v|\\) is the unit tangent vector, \\(N\\) the unit normal vector (\\(T\\) turned by \\(90^\\circ\\) to the left), \\(\\kappa\\) the signed curvature of the path (positive when the path turns left, negative when it turns right), \\(|v|\\) the speed.',
        ),
        explanation: text(
            'Argument: velja \\(v=|v|\\,T\\), odvajanje po času pa da \\(a=\\frac{\\mathrm{d}|v|}{\\mathrm{d}t}\\,T+|v|\\,\\frac{\\mathrm{d}T}{\\mathrm{d}t}\\). Tangenta se vrti s kotno hitrostjo \\(\\kappa|v|\\) (ukrivljenost je zasuk tangente na enoto dolžine poti, pot pa teče s hitrostjo \\(|v|\\)), zato je \\(\\frac{\\mathrm{d}T}{\\mathrm{d}t}=\\kappa|v|\\,N\\) in \\(a_N=\\kappa|v|^2\\). Ker sta \\(T\\) in \\(N\\) pravokotna enotska vektorja, sta \\(a_T\\) in \\(a_N\\) pravokotni projekciji vektorja \\(a\\) in po Pitagorovem izreku velja \\(a_T^2+a_N^2=|a|^2\\). Enačbe veljajo v točkah, kjer je \\(|v|>0\\). Številke na grafu so ponazoritve teh enačb.',
            'Argument: \\(v=|v|\\,T\\), and differentiating with respect to time gives \\(a=\\frac{\\mathrm{d}|v|}{\\mathrm{d}t}\\,T+|v|\\,\\frac{\\mathrm{d}T}{\\mathrm{d}t}\\). The tangent turns with angular velocity \\(\\kappa|v|\\) (the curvature is the turning of the tangent per unit of path length, and the path is traversed at speed \\(|v|\\)), so \\(\\frac{\\mathrm{d}T}{\\mathrm{d}t}=\\kappa|v|\\,N\\) and \\(a_N=\\kappa|v|^2\\). Since \\(T\\) and \\(N\\) are perpendicular unit vectors, \\(a_T\\) and \\(a_N\\) are the orthogonal projections of the vector \\(a\\), and by the Pythagorean theorem \\(a_T^2+a_N^2=|a|^2\\). The equations hold at points where \\(|v|>0\\). The numbers on the graph are illustrations of these equations.',
        ),
    },
];

const kn5Examples: readonly WorkedExample[] = [
    {
        id: 'kn5-cycloid',
        title: text('Cikloida ob \\(t=2\\ \\mathrm{s}\\)', 'The cycloid at \\(t=2\\ \\mathrm{s}\\)'),
        calculationLatex: "a_N=\\kappa\\,|v|^2\\approx-0{,}297\\cdot1{,}683^2,\\qquad a_T^2+a_N^2\\approx0{,}54^2+(-0{,}841)^2",
        resultLatex: "a_N\\approx-0{,}841,\\qquad a_T^2+a_N^2\\approx1",
        check: text(
            'Odčitka sta \\(\\kappa\\approx-0{,}297\\ \\mathrm{1/m}\\) in \\(|v|\\approx1{,}683\\ \\mathrm{m/s}\\); \\(1{,}683^2\\approx2{,}832\\) in \\(0{,}297\\cdot2{,}832\\approx0{,}841\\), kar je odčitek \\(a_N\\approx-0{,}841\\ \\mathrm{m/s^2}\\). Vsota \\(0{,}2916+0{,}7073\\approx1\\) je \\(|a|^2\\).',
            'The readouts are \\(\\kappa\\approx-0.297\\ \\mathrm{1/m}\\) and \\(|v|\\approx1.683\\ \\mathrm{m/s}\\); \\(1.683^2\\approx2.832\\) and \\(0.297\\cdot2.832\\approx0.841\\), which is the readout \\(a_N\\approx-0.841\\ \\mathrm{m/s^2}\\). The sum \\(0.2916+0.7073\\approx1\\) is \\(|a|^2\\).',
        ),
    },
];

const kn5Steps: readonly GuidedLessonStep[] = [
    step({
        id: 'kn5-along', order: 1,
        declare: kinematicsFrame({uses: ['kinematics-time'], highlight: ['a-t']}),
        title: text('Del pospeška vzdolž poti', 'The part of the acceleration along the path'),
        purpose: text('Napovedati tangentno komponento pospeška na vrhu loka cikloide.', 'Predicting the tangential component of the acceleration at the top of the cycloid arch.'),
        explanation: text(
            'Točka se giblje po cikloidi: kot točka na obodu kolesa s polmerom \\(1\\ \\mathrm{m}\\), ki se kotali. Pospešek točke razstavimo na dva dela. Tangentna komponenta pospeška \\(a_T\\) (odčitek Tangentni pospešek aₜ) je del vzdolž poti: ko je pozitivna, točka pospešuje, ko je negativna, zavira. Normalna komponenta \\(a_N\\) je del pravokotno na pot. Slika kaže točko ob \\(t=\\pi/2\\approx1{,}57\\ \\mathrm{s}\\): velikost hitrosti je približno \\(1{,}414\\ \\mathrm{m/s}\\) in \\(a_T\\approx0{,}707\\ \\mathrm{m/s^2}\\). Najvišja točka loka je ob \\(t\\approx\\pi\\); na krmilniku Čas jo najdeš pri \\(3{,}14\\ \\mathrm{s}\\). Preden ga premakneš, napovej: kolikšna je tam \\(a_T\\)? Zapiši tudi razlog.',
            'The point moves on a cycloid: like a point on the rim of a wheel of radius \\(1\\ \\mathrm{m}\\) that rolls. We split the acceleration of the point into two parts. The tangential component of the acceleration \\(a_T\\) (the readout Tangential acceleration aₜ) is the part along the path: when it is positive the point speeds up, when it is negative the point slows down. The normal component \\(a_N\\) is the part perpendicular to the path. The picture shows the point at \\(t=\\pi/2\\approx1.57\\ \\mathrm{s}\\): the speed is about \\(1.414\\ \\mathrm{m/s}\\) and \\(a_T\\approx0.707\\ \\mathrm{m/s^2}\\). The highest point of the arch is at \\(t\\approx\\pi\\); on the Time control you find it at \\(3.14\\ \\mathrm{s}\\). Before you move it, predict: what is \\(a_T\\) there? Write down a reason too.',
        ),
        formulaIds: [],
        observationPrompt: text(
            'Zapiši napoved in razlog, nato nastavi krmilnik Čas na \\(3{,}14\\) in preberi velikost hitrosti, \\(a_T\\) in stanje.',
            'Write down your prediction and the reason, then set the Time control to \\(3.14\\) and read the speed, \\(a_T\\) and the status.',
        ),
        expectedObservations: [text(
            'Ob \\(t=3{,}14\\ \\mathrm{s}\\) je velikost hitrosti \\(2\\ \\mathrm{m/s}\\), največja na loku, in \\(a_T=0{,}001\\ \\mathrm{m/s^2}\\), skoraj \\(0\\): hitrost tam doseže najvišjo vrednost in se za trenutek neha povečevati. Stanje še piše, da točka pospešuje, ker je \\(3{,}14\\) malo pred \\(\\pi\\approx3{,}1416\\) in je \\(a_T\\) še majhna pozitivna; ob \\(t=\\pi\\) bi bila \\(a_T=0\\).',
            'At \\(t=3.14\\ \\mathrm{s}\\) the speed is \\(2\\ \\mathrm{m/s}\\), the largest on the arch, and \\(a_T=0.001\\ \\mathrm{m/s^2}\\), almost \\(0\\): the speed reaches its highest value there and stops growing for a moment. The status still says the point speeds up, because \\(3.14\\) is a little before \\(\\pi\\approx3.1416\\) and \\(a_T\\) is still small and positive; at \\(t=\\pi\\) it would be \\(a_T=0\\).',
        )],
        scene: scene('kn5-along-scene', {t: KN5_ARCH_TIME},
            'Cikloida, čas \\(\\pi/2\\), stikalo za razstavitev pospeška izklopljeno; \\(a_T\\approx0{,}707\\ \\mathrm{m/s^2}\\), hitrost \\(\\approx1{,}414\\ \\mathrm{m/s}\\). Izhodišče, od koder premaknemo čas.',
            'Cycloid, time \\(\\pi/2\\), the switch for splitting the acceleration off; \\(a_T\\approx0.707\\ \\mathrm{m/s^2}\\), speed \\(\\approx1.414\\ \\mathrm{m/s}\\). The starting point from which the time is moved.'),
    }),
    step({
        id: 'kn5-axes', order: 2,
        declare: kinematicsFrame({uses: ['split'], highlight: ['a-t', 'a-n']}),
        title: text('Osi tangente in normale', 'The tangent and normal axes'),
        purpose: text('Napovedati, kateri del pospeška na vrhu loka izgine in kakšen predznak ima \\(a_N\\).', 'Predicting which part of the acceleration vanishes at the top of the arch and the sign of \\(a_N\\).'),
        explanation: text(
            'Slika kaže vrh loka ob \\(t=3{,}14\\ \\mathrm{s}\\). Pritisnil boš krmilnik Delitev pospeška: graf nariše dve tanki črti skozi točko, os tangente (vzdolž poti) in os normale (pravokotno nanjo), ter puščici \\(a_T\\) in \\(a_N\\) v merilu pospeška. Preden ga vklopiš, napovej: katera od puščic \\(a_T\\) in \\(a_N\\) bo na vrhu loka skoraj ali povsem nevidna, in ali bo \\(a_N\\) pozitiven ali negativen? Pomagaj si s tem, kar si videl v prejšnjem koraku, in s smerjo, v katero pot zavija.',
            'The picture shows the top of the arch at \\(t=3.14\\ \\mathrm{s}\\). You will press the Accel. split control: the graph draws two thin lines through the point, the tangent axis (along the path) and the normal axis (perpendicular to it), and the arrows \\(a_T\\) and \\(a_N\\) in the acceleration scale. Before you switch it on, predict: which of the arrows \\(a_T\\) and \\(a_N\\) will be almost or entirely invisible at the top of the arch, and will \\(a_N\\) be positive or negative? Use what you saw in the previous step and the direction in which the path turns.',
        ),
        formulaIds: [],
        observationPrompt: text(
            'Zapiši napoved, nato pritisni krmilnik Delitev pospeška in primerjaj osi s hitrostjo in pospeškom.',
            'Write down your prediction, then press the Accel. split control and compare the axes with the velocity and the acceleration.',
        ),
        expectedObservations: [text(
            'Puščice \\(a_T\\) ni videti: \\(a_T=0{,}001\\ \\mathrm{m/s^2}\\) je prekratka, da bi jo graf narisal. Puščica \\(a_N\\) kaže navzdol in pokriva puščico pospeška \\((0{,}002;\\,-1)\\ \\mathrm{m/s^2}\\), saj ta kaže skoraj natanko po normali: \\(a_N=-1\\ \\mathrm{m/s^2}\\). \\(a_N\\) je negativen, ker pot tu zavija v desno (podnapis na grafu). Os tangente je vodoravna, v smeri hitrosti \\((2;\\,0{,}002)\\ \\mathrm{m/s}\\), os normale je navpična.',
            'The arrow \\(a_T\\) is not visible: \\(a_T=0.001\\ \\mathrm{m/s^2}\\) is too short for the graph to draw it. The arrow \\(a_N\\) points down and covers the acceleration arrow \\((0.002;\\,-1)\\ \\mathrm{m/s^2}\\), since that points almost exactly along the normal: \\(a_N=-1\\ \\mathrm{m/s^2}\\). \\(a_N\\) is negative because the path turns right here (the caption on the graph). The tangent axis is horizontal, along the velocity \\((2;\\,0.002)\\ \\mathrm{m/s}\\), the normal axis is vertical.',
        )],
        scene: scene('kn5-axes-scene', {t: KN5_TOP_TIME},
            'Cikloida, čas \\(3{,}14\\), stikalo za razstavitev pospeška izklopljeno; \\(a_T=0{,}001\\ \\mathrm{m/s^2}\\), \\(a_N=-1\\ \\mathrm{m/s^2}\\). Izhodišče, od koder vklopimo stikalo.',
            'Cycloid, time \\(3.14\\), the switch for splitting the acceleration off; \\(a_T=0.001\\ \\mathrm{m/s^2}\\), \\(a_N=-1\\ \\mathrm{m/s^2}\\). The starting point from which the switch is turned on.'),
    }),
    step({
        id: 'kn5-projection', order: 3,
        declare: kinematicsFrame({uses: ['kinematics-time']}),
        title: text('Dela pospeška', 'The parts of the acceleration'),
        purpose: text('Napovedati zvezo med \\(a_T\\), \\(a_N\\) in \\(|a|\\) in jo preveriti ob drugem času.', 'Predicting the relation between \\(a_T\\), \\(a_N\\) and \\(|a|\\) and checking it at another time.'),
        explanation: text(
            'Razstavitev je vklopljena. Slika kaže točko ob \\(t=\\pi/2\\): puščico pospeška \\(a\\) in njena dela \\(a_T\\) (pikčasto) in \\(a_N\\) (dolge črtice); vse tri puščice izhajajo iz točke. Preden premakneš čas, napovej: ali bosta ob \\(t=2\\ \\mathrm{s}\\) vsota \\(a_T^2+a_N^2\\) in kvadrat velikosti pospeška \\(|a|^2\\) enaka, in zakaj?',
            'The split is switched on. The picture shows the point at \\(t=\\pi/2\\): the acceleration arrow \\(a\\) and its parts \\(a_T\\) (dotted) and \\(a_N\\) (long dashes); all three arrows start at the point. Before you move the time, predict: at \\(t=2\\ \\mathrm{s}\\), will the sum \\(a_T^2+a_N^2\\) and the square of the size of the acceleration \\(|a|^2\\) be equal, and why?',
        ),
        formulaIds: [],
        observationPrompt: text(
            'Zapiši napoved z razlogom, nato nastavi krmilnik Čas na \\(2\\), preberi \\(a\\), \\(a_T\\) in \\(a_N\\) ter izračunaj \\(a_T^2+a_N^2\\) in \\(|a|^2\\).',
            'Write down your prediction with the reason, then set the Time control to \\(2\\), read \\(a\\), \\(a_T\\) and \\(a_N\\), and compute \\(a_T^2+a_N^2\\) and \\(|a|^2\\).',
        ),
        expectedObservations: [text(
            'Ob \\(t=2\\ \\mathrm{s}\\) je \\(a=(0{,}909;\\,-0{,}416)\\), \\(a_T=0{,}54\\) in \\(a_N=-0{,}841\\ \\mathrm{m/s^2}\\). Račun: \\(a_T^2+a_N^2\\approx0{,}2916+0{,}7073\\approx1\\) in \\(|a|^2\\approx0{,}826+0{,}173\\approx1\\), enaka. Ob \\(t=\\pi/2\\) je \\(0{,}707^2+0{,}707^2\\approx1=|a|^2\\). Razlog: \\(a_T\\) in \\(a_N\\) sta pravokotni projekciji vektorja \\(a\\) na dve pravokotni osi, torej po Pitagorovem izreku \\(a_T^2+a_N^2=|a|^2\\); to velja ob vsakem času, kjer sta osi določeni.',
            'At \\(t=2\\ \\mathrm{s}\\) we have \\(a=(0.909;\\,-0.416)\\), \\(a_T=0.54\\) and \\(a_N=-0.841\\ \\mathrm{m/s^2}\\). Computation: \\(a_T^2+a_N^2\\approx0.2916+0.7073\\approx1\\) and \\(|a|^2\\approx0.826+0.173\\approx1\\), equal. At \\(t=\\pi/2\\) it is \\(0.707^2+0.707^2\\approx1=|a|^2\\). Reason: \\(a_T\\) and \\(a_N\\) are the orthogonal projections of the vector \\(a\\) onto two perpendicular axes, so by the Pythagorean theorem \\(a_T^2+a_N^2=|a|^2\\); this holds at every time where the axes are defined.',
        )],
        scene: scene('kn5-projection-scene', {params: {split: true}, t: KN5_ARCH_TIME},
            'Cikloida, čas \\(\\pi/2\\), razstavitev vklopljena: \\(a=(1;\\,0)\\ \\mathrm{m/s^2}\\), \\(a_T\\approx0{,}707\\), \\(a_N\\approx-0{,}707\\ \\mathrm{m/s^2}\\). Izhodišče, od koder premaknemo čas.',
            'Cycloid, time \\(\\pi/2\\), the split switched on: \\(a=(1;\\,0)\\ \\mathrm{m/s^2}\\), \\(a_T\\approx0.707\\), \\(a_N\\approx-0.707\\ \\mathrm{m/s^2}\\). The starting point from which the time is moved.'),
    }),
    step({
        id: 'kn5-speed', order: 4,
        declare: kinematicsFrame({uses: ['kinematics-time']}),
        title: text('Tangentni del spreminja hitrost', 'The tangential part changes the speed'),
        purpose: text('Napovedati velikost hitrosti po kratkem koraku iz \\(a_T\\) in primerjati z odčitkom.', 'Predicting the speed after a short step from \\(a_T\\) and comparing it with the readout.'),
        explanation: text(
            'Slika kaže točko ob \\(t=1\\ \\mathrm{s}\\): velikost hitrosti je približno \\(0{,}959\\ \\mathrm{m/s}\\), \\(a_T\\approx0{,}878\\ \\mathrm{m/s^2}\\) in \\(a_N\\approx-0{,}479\\ \\mathrm{m/s^2}\\). Čas boš premaknil za \\(0{,}1\\ \\mathrm{s}\\), na \\(1{,}1\\ \\mathrm{s}\\). Preden ga premakneš, napovej velikost hitrosti ob \\(t=1{,}1\\ \\mathrm{s}\\), samo iz odčitkov ob \\(t=1\\), in zapiši, kako si jo ocenil.',
            'The picture shows the point at \\(t=1\\ \\mathrm{s}\\): the speed is about \\(0.959\\ \\mathrm{m/s}\\), \\(a_T\\approx0.878\\ \\mathrm{m/s^2}\\) and \\(a_N\\approx-0.479\\ \\mathrm{m/s^2}\\). You will move the time by \\(0.1\\ \\mathrm{s}\\), to \\(1.1\\ \\mathrm{s}\\). Before you move it, predict the speed at \\(t=1.1\\ \\mathrm{s}\\) from the readouts at \\(t=1\\) alone, and write down how you estimated it.',
        ),
        formulaIds: [],
        observationPrompt: text(
            'Zapiši napoved in račun, nato nastavi krmilnik Čas na \\(1{,}1\\) ter preberi velikost hitrosti in \\(a_T\\).',
            'Write down your prediction and the computation, then set the Time control to \\(1.1\\) and read the speed and \\(a_T\\).',
        ),
        expectedObservations: [text(
            'Ocena: \\(a_T\\) je hitrost spreminjanja velikosti hitrosti, torej \\(0{,}959+0{,}1\\cdot0{,}878\\approx1{,}047\\ \\mathrm{m/s}\\); \\(a_N\\) velikosti hitrosti ne spreminja, le smer. Odčitek ob \\(t=1{,}1\\ \\mathrm{s}\\) je \\(1{,}045\\ \\mathrm{m/s}\\): blizu, a ocena je malo previsoka. Razlog: \\(a_T\\) velja za trenutek \\(t=1\\), v koraku pa se spremeni (ob \\(t=1{,}1\\) je \\(0{,}853\\), manj kot \\(0{,}878\\)), zato je račun s staro vrednostjo le približen, bolje pri krajših korakih.',
            'Estimate: \\(a_T\\) is the rate of change of the speed, so \\(0.959+0.1\\cdot0.878\\approx1.047\\ \\mathrm{m/s}\\); \\(a_N\\) does not change the speed, only the direction. The readout at \\(t=1.1\\ \\mathrm{s}\\) is \\(1.045\\ \\mathrm{m/s}\\): close, but the estimate is a little too high. Reason: \\(a_T\\) holds for the moment \\(t=1\\) and changes during the step (at \\(t=1.1\\) it is \\(0.853\\), less than \\(0.878\\)), so the computation with the old value is only approximate, better for shorter steps.',
        )],
        scene: scene('kn5-speed-scene', {params: {split: true}, t: KN5_SPEED_TIME},
            'Cikloida, čas \\(1\\), razstavitev vklopljena: hitrost \\(\\approx0{,}959\\ \\mathrm{m/s}\\), \\(a_T\\approx0{,}878\\), \\(a_N\\approx-0{,}479\\ \\mathrm{m/s^2}\\). Izhodišče, od koder premaknemo čas na \\(1{,}1\\).',
            'Cycloid, time \\(1\\), the split switched on: speed \\(\\approx0.959\\ \\mathrm{m/s}\\), \\(a_T\\approx0.878\\), \\(a_N\\approx-0.479\\ \\mathrm{m/s^2}\\). The starting point from which the time is moved to \\(1.1\\).'),
    }),
    step({
        id: 'kn5-circle', order: 5,
        declare: kinematicsFrame({uses: ['osculating'], highlight: ['kappa']}),
        title: text('Normalni del in krivinska krožnica', 'The normal part and the osculating circle'),
        purpose: text('Napovedati polmer in lego središča krivinske krožnice iz ukrivljenosti.', 'Predicting the radius and the centre of the osculating circle from the curvature.'),
        explanation: text(
            'Slika kaže točko blizu začetka loka ob \\(t=0{,}5\\ \\mathrm{s}\\), razstavitev je vklopljena. Ukrivljenost je \\(\\kappa\\approx-1{,}010\\ \\mathrm{1/m}\\); negativna je, ker pot zavija v desno. Krivinska krožnica je krožnica, ki se poti v točki najbolje prilega. Preden jo vklopiš, napovej: kolikšen je približno njen polmer in na kateri strani poti leži njeno središče?',
            'The picture shows the point near the start of the arch at \\(t=0.5\\ \\mathrm{s}\\), the split is switched on. The curvature is \\(\\kappa\\approx-1.010\\ \\mathrm{1/m}\\); it is negative because the path turns right. The osculating circle is the circle that fits the path best at the point. Before you switch it on, predict: about how large is its radius, and on which side of the path does its centre lie?',
        ),
        formulaIds: [],
        observationPrompt: text(
            'Zapiši napoved, nato pritisni krmilnik Krožnica κ in na mreži odčitaj, kje je središče in kako daleč je od točke.',
            'Write down your prediction, then press the Curvature circle control and read on the grid where the centre is and how far it is from the point.',
        ),
        expectedObservations: [text(
            'Polmer je \\(1/|\\kappa|\\approx1/1{,}010\\approx0{,}990\\ \\mathrm{m}\\), skoraj \\(1\\ \\mathrm{m}\\). Pot zavija v desno (\\(\\kappa<0\\)), zato središče leži desno od smeri gibanja: v približno \\((0{,}98;\\,-0{,}12)\\ \\mathrm{m}\\), točka pa je v približno \\((0{,}02;\\,0{,}12)\\ \\mathrm{m}\\). Cela krožnica je na sliki; črta od točke do središča je polmer in je pravokotna na pot. Ob \\(t=0{,}5\\) je \\(a_N\\approx-0{,}247\\ \\mathrm{m/s^2}\\), majhen, čeprav je krožnica majhna: hitrost je tu le približno \\(0{,}495\\ \\mathrm{m/s}\\).',
            'The radius is \\(1/|\\kappa|\\approx1/1.010\\approx0.990\\ \\mathrm{m}\\), almost \\(1\\ \\mathrm{m}\\). The path turns right (\\(\\kappa<0\\)), so the centre lies to the right of the direction of motion: at about \\((0.98;\\,-0.12)\\ \\mathrm{m}\\), while the point is at about \\((0.02;\\,0.12)\\ \\mathrm{m}\\). The whole circle is in the picture; the line from the point to the centre is the radius and is perpendicular to the path. At \\(t=0.5\\) it is \\(a_N\\approx-0.247\\ \\mathrm{m/s^2}\\), small although the circle is small: the speed here is only about \\(0.495\\ \\mathrm{m/s}\\).',
        )],
        scene: scene('kn5-circle-scene', {params: {split: true}, t: KN5_OSCULATING_TIME},
            'Cikloida, čas \\(0{,}5\\), razstavitev vklopljena, krivinska krožnica izklopljena; \\(\\kappa\\approx-1{,}010\\ \\mathrm{1/m}\\). Izhodišče, od koder vklopimo krožnico.',
            'Cycloid, time \\(0.5\\), the split switched on, the osculating circle off; \\(\\kappa\\approx-1.010\\ \\mathrm{1/m}\\). The starting point from which the circle is switched on.'),
    }),
    step({
        id: 'kn5-kappa-v2', order: 6,
        declare: kinematicsFrame({uses: ['kinematics-omega'], highlight: ['speed', 'kappa', 'kappa-v2']}),
        title: text('Normalni del in hitrost', 'The normal part and the speed'),
        purpose: text('Napovedati \\(a_N\\) pri polovični hitrosti na isti poti.', 'Predicting \\(a_N\\) at half the speed on the same path.'),
        explanation: text(
            'Pri cikloidi hitrosti ne moremo nastaviti, zato preklopimo na gibanje Kroženje s polmerom \\(R=1\\ \\mathrm{m}\\) in kotno hitrostjo \\(\\omega=1\\ \\mathrm{rad/s}\\), ob \\(t=1\\ \\mathrm{s}\\). Krivinska krožnica je tu kar sama pot. Odčitki: velikost hitrosti \\(1\\ \\mathrm{m/s}\\), \\(\\kappa=1\\ \\mathrm{1/m}\\), \\(a_N=1\\ \\mathrm{m/s^2}\\). Preden spremeniš, napovej: kolikšna sta \\(\\kappa\\) in \\(a_N\\), ko kotno hitrost zmanjšaš na polovico, \\(\\omega=0{,}5\\ \\mathrm{rad/s}\\) (nastavitev Kotna hitrost ω (rad/s))? Zapiši razlog.',
            'On the cycloid we cannot set the speed, so we switch to the motion Circular motion with radius \\(R=1\\ \\mathrm{m}\\) and angular velocity \\(\\omega=1\\ \\mathrm{rad/s}\\), at \\(t=1\\ \\mathrm{s}\\). The osculating circle is here the path itself. The readouts: speed \\(1\\ \\mathrm{m/s}\\), \\(\\kappa=1\\ \\mathrm{1/m}\\), \\(a_N=1\\ \\mathrm{m/s^2}\\). Before you change anything, predict: what are \\(\\kappa\\) and \\(a_N\\) when you halve the angular velocity to \\(\\omega=0.5\\ \\mathrm{rad/s}\\) (the setting Angular velocity ω (rad/s))? Write down a reason.',
        ),
        formulaIds: [],
        observationPrompt: text(
            'Zapiši napoved z razlogom, nato s krmilnikom Kotna hitrost nastavi ω na \\(0{,}5\\) in preberi velikost hitrosti, \\(\\kappa\\), \\(a_N\\) in \\(\\kappa\\cdot|v|^2\\).',
            'Write down your prediction with the reason, then use the Angular velocity control to set ω to \\(0.5\\) and read the speed, \\(\\kappa\\), \\(a_N\\) and \\(\\kappa\\cdot|v|^2\\).',
        ),
        expectedObservations: [text(
            'Velikost hitrosti je \\(0{,}5\\ \\mathrm{m/s}\\), polovica. Pot je ista krožnica, zato \\(\\kappa=1\\ \\mathrm{1/m}\\) ostane. Normalni del je \\(a_N=\\kappa|v|^2=1\\cdot0{,}5^2=0{,}25\\ \\mathrm{m/s^2}\\), štirikrat manj: hitrost je v kvadratu. Odčitek \\(\\kappa\\cdot|v|^2\\) je \\(0{,}25\\), enak \\(a_N\\); \\(a_T=0\\), ker je hitrost stalna.',
            'The speed is \\(0.5\\ \\mathrm{m/s}\\), half. The path is the same circle, so \\(\\kappa=1\\ \\mathrm{1/m}\\) stays. The normal part is \\(a_N=\\kappa|v|^2=1\\cdot0.5^2=0.25\\ \\mathrm{m/s^2}\\), four times smaller: the speed enters squared. The readout \\(\\kappa\\cdot|v|^2\\) is \\(0.25\\), equal to \\(a_N\\); \\(a_T=0\\), because the speed is constant.',
        )],
        scene: scene('kn5-kappa-v2-scene', {motion: 'circular', params: KN5_CIRCLE_PARAMS, t: KN5_CIRCLE_TIME},
            'Kroženje, \\(R=1\\ \\mathrm{m}\\), \\(\\omega=1\\ \\mathrm{rad/s}\\), čas \\(1\\), razstavitev in krivinska krožnica vklopljeni: hitrost \\(1\\ \\mathrm{m/s}\\), \\(\\kappa=1\\ \\mathrm{1/m}\\), \\(a_N=1\\ \\mathrm{m/s^2}\\). Izhodišče, od koder zmanjšamo \\(\\omega\\).',
            'Circular motion, \\(R=1\\ \\mathrm{m}\\), \\(\\omega=1\\ \\mathrm{rad/s}\\), time \\(1\\), the split and the osculating circle switched on: speed \\(1\\ \\mathrm{m/s}\\), \\(\\kappa=1\\ \\mathrm{1/m}\\), \\(a_N=1\\ \\mathrm{m/s^2}\\). The starting point from which \\(\\omega\\) is reduced.'),
    }),
    step({
        id: 'kn5-explore', order: 7,
        declare: kinematicsFrame({open: ['tools']}),
        title: text('Prosto raziskovanje', 'Free exploration'),
        purpose: text('Napovedati \\(a_N\\) po formuli na zbirki krivulj in jo preveriti.', 'Predicting \\(a_N\\) by the formula on the catalogue curves and checking it.'),
        explanation: text(
            'Enačbe spodaj povzamejo korake; primer za cikloido ob \\(t=2\\ \\mathrm{s}\\) je izračunan. Slika kaže cikloido z vklopljeno razstavitvijo in krivinsko krožnico. V seznamu Gibanje izberi drugo gibanje (Kardioida, Roža s tremi listi, Arhimedova spirala, Poševni met, Kroženje ali spet Cikloida (kolo se kotali)), nato čas; vsaka sprememba gibanja vrne čas na \\(0\\). Preden prebereš \\(a_N\\), ga izračunaj iz odčitkov \\(\\kappa\\) in velikosti hitrosti, in šele nato primerjaj. Na špici cikloide, ob \\(t=0\\), je hitrost \\(0\\): graf tam za \\(a_T\\), \\(a_N\\) in \\(\\kappa\\) piše ni določen, ne \\(0\\), in krivinske krožnice ni; ob \\(t=0{,}01\\ \\mathrm{s}\\) je že \\(\\kappa=-50\\ \\mathrm{1/m}\\) in polmer krožnice \\(0{,}02\\ \\mathrm{m}\\).',
            'The equations below sum up the steps; the example for the cycloid at \\(t=2\\ \\mathrm{s}\\) is worked out. The picture shows the cycloid with the split and the osculating circle switched on. In the Motion list choose another motion (Cardioid, Three-petal rose, Archimedean spiral, Projectile motion, Circular motion or the Cycloid (a rolling wheel) again), then the time; every change of motion returns the time to \\(0\\). Before you read \\(a_N\\), compute it from the readouts of \\(\\kappa\\) and the speed, and only then compare. At the cusp of the cycloid, at \\(t=0\\), the velocity is \\(0\\): \\(a_T\\), \\(a_N\\) and \\(\\kappa\\) are not defined there, not \\(0\\), and there is no osculating circle; at \\(t=0.01\\ \\mathrm{s}\\) we already have \\(\\kappa=-50\\ \\mathrm{1/m}\\) and a circle of radius \\(0.02\\ \\mathrm{m}\\).',
        ),
        formulaIds: ['tangential-normal'],
        workedExampleId: 'kn5-cycloid',
        observationPrompt: text(
            'Najprej izračunaj \\(\\kappa\\cdot|v|^2\\) in \\(a_T^2+a_N^2\\) iz odčitkov, nato ju primerjaj z \\(a_N\\) in \\(|a|^2\\).',
            'First compute \\(\\kappa\\cdot|v|^2\\) and \\(a_T^2+a_N^2\\) from the readouts, then compare them with \\(a_N\\) and \\(|a|^2\\).',
        ),
        expectedObservations: [text(
            'Račun in odčitki se ujemajo. Na primer kardioida ob \\(t=1\\ \\mathrm{s}\\): \\(\\kappa=0{,}855\\ \\mathrm{1/m}\\) (pozitivna: pot zavija v levo), \\(|v|=1{,}755\\ \\mathrm{m/s}\\), \\(\\kappa|v|^2\\approx2{,}633\\ \\mathrm{m/s^2}\\) je \\(a_N\\); \\(a_T=-0{,}479\\ \\mathrm{m/s^2}\\), točka zavira. Poševni met s privzetima \\(v_0=20\\ \\mathrm{m/s}\\), \\(\\alpha=45^\\circ\\), ob \\(t=1{,}44\\ \\mathrm{s}\\), tik ob vrhu: vodoravni del hitrosti \\(v_x\\approx14{,}142\\ \\mathrm{m/s}\\), pospešek je \\(g=9{,}81\\ \\mathrm{m/s^2}\\) navpično navzdol, \\(\\kappa\\approx g/v_x^2\\approx9{,}81/200\\approx0{,}049\\ \\mathrm{1/m}\\) (odčitek \\(-0{,}049\\): pot zavija v desno), polmer krivinske krožnice \\(\\approx20{,}4\\ \\mathrm{m}\\).',
            'The computation and the readouts agree. For example the cardioid at \\(t=1\\ \\mathrm{s}\\): \\(\\kappa=0.855\\ \\mathrm{1/m}\\) (positive: the path turns left), \\(|v|=1.755\\ \\mathrm{m/s}\\), \\(\\kappa|v|^2\\approx2.633\\ \\mathrm{m/s^2}\\) is \\(a_N\\); \\(a_T=-0.479\\ \\mathrm{m/s^2}\\), the point slows down. Projectile motion with the default \\(v_0=20\\ \\mathrm{m/s}\\), \\(\\alpha=45^\\circ\\), at \\(t=1.44\\ \\mathrm{s}\\), just next to the top: the horizontal part of the velocity \\(v_x\\approx14.142\\ \\mathrm{m/s}\\), the acceleration is \\(g=9.81\\ \\mathrm{m/s^2}\\) straight down, \\(\\kappa\\approx g/v_x^2\\approx9.81/200\\approx0.049\\ \\mathrm{1/m}\\) (the readout is \\(-0.049\\): the path turns right), the radius of the osculating circle \\(\\approx20.4\\ \\mathrm{m}\\).',
        )],
        scene: scene('kn5-explore-scene', {params: {split: true, osculating: true}, t: KN5_EXPLORE_TIME},
            'Začetni primer: cikloida, čas \\(2\\), razstavitev in krivinska krožnica vklopljeni.',
            'The starting case: cycloid, time \\(2\\), the split and the osculating circle switched on.'),
    }),
];

const sources: GuidedLesson['sources'] = [
    {
        id: 'bezeg-kinematics-implementation',
        citation: 'Bezeg source: src/kinematics/ (motions, decomposition, curvature, state model) and src/graphs/curves/kinematics/KinematicsGraph.tsx (tangent and normal axes, osculating circle).',
        implementationCorrespondence: 'A scene sets the motion, its parameters and the time of the kinematics graph; every number is a readout of that graph in SI units (lengths in metres, time in seconds), the text quotes only values of those scenes, values the learner reads after an action the text asks for, or values of a formula or arithmetic shown in the same step.',
    },
];

export const kinematicsDecompositionLesson: GuidedLesson = {
    demonstrationId: 'curve-kinematics',
    title: text('Tangentni in normalni pospešek z ukrivljenostjo', 'Tangential and normal acceleration with curvature'),
    summary: text(
        'Pospešek točke na krivulji razstavimo na del vzdolž poti in del proti zavoju. Z grafom raziščemo, kaj vsak od njiju pove o gibanju in kako je drugi povezan z ukrivljenostjo poti.',
        'We split the acceleration of a point on a curve into a part along the path and a part toward the bend. With the graph we explore what each of them says about the motion and how the second is related to the curvature of the path.',
    ),
    prerequisites: [text(
        'Lekcija o legi, hitrosti in pospešku (prva lekcija poglavja) in lekcija o ukrivljenosti krivulje (Geometrija krivulj).',
        'The lesson on position, velocity and acceleration (the first lesson of the chapter) and the lesson on the curvature of a curve (Geometry of curves).',
    )],
    learningGoals: [
        text('Veš, da tangentna komponenta pospeška spreminja velikost hitrosti, normalna pa smer gibanja.', 'Know that the tangential component of the acceleration changes the speed and the normal one the direction of motion.'),
        text('Utemeljiš, da sta komponenti pravokotni projekciji pospeška, in da je \\(a_N=\\kappa|v|^2\\); iz ukrivljenosti določiš polmer krivinske krožnice.', 'Argue that the components are orthogonal projections of the acceleration and that \\(a_N=\\kappa|v|^2\\); determine the radius of the osculating circle from the curvature.'),
        text('Napoveš predznak in velikost obeh komponent iz odčitkov in jih primerjaš z grafom.', 'Predict the sign and size of both components from the readouts and compare them with the graph.'),
    ],
    formulaBlocks: kn5Formulas,
    workedExamples: kn5Examples,
    steps: kn5Steps,
    sources,
    edgeCases: [
        text('Pri hitrosti \\(0\\) (špica cikloide ob \\(t=0\\)) sta \\(T\\) in \\(N\\) nedoločena: graf pokaže ni določen, ne \\(0\\), in ne nariše osi, komponent in krivinske krožnice.', 'At velocity \\(0\\) (the cusp of the cycloid at \\(t=0\\)) \\(T\\) and \\(N\\) are undefined: the graph shows not defined, not \\(0\\), and draws no axes, components or osculating circle.'),
        text('Čas na drsniku je na korakih po \\(0{,}01\\ \\mathrm{s}\\), zato je \\(\\pi\\) dosegljiv le kot \\(3{,}14\\); tam je \\(a_T=0{,}001\\ \\mathrm{m/s^2}\\) in stanje pove, da točka pospešuje.', 'The slider time is in steps of \\(0.01\\ \\mathrm{s}\\), so \\(\\pi\\) is reachable only as \\(3.14\\); there \\(a_T=0.001\\ \\mathrm{m/s^2}\\) and the status says the point speeds up.'),
        text('Krivinska krožnica je lahko večja od vidnega dela grafa (cikloida ob \\(t=3{,}14\\), polmer \\(4\\ \\mathrm{m}\\)); vidiš le njen lok.', 'The osculating circle can be larger than the visible part of the graph (the cycloid at \\(t=3.14\\), radius \\(4\\ \\mathrm{m}\\)); only an arc of it is seen.'),
    ],
    unresolvedQuestions: [],
};
