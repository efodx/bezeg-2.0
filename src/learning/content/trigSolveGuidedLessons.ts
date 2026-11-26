/**
 * Guided lesson of the trigonometry family, batch C (docs/specs/trigonometry-lessons.md): TR5, solving a triangle (SSS, SAS, ASA, SSA) on
 * `triangle-solver` (TriangleSolverGraph, mode `solve`). Host-free content: the chapter join and the Demonstration wiring come in the next slice.
 * Scenes use only the `triangle` actions the graph registers (`set-mode`, `set-data`) after the Demonstration default. The graph's status line
 * states every answer on the first frame, so each predicting step opens on the previous state, asks for a prediction, and names the control and
 * value that make the new state. The numbers the text quotes are readouts probed from the real graph (`.command-logs/trig-c/probe.txt`,
 * `probe2.txt`) or plain arithmetic.
 */
import type {LessonAction} from '../model';
import {frameDeclarer, type FrameDeclaration} from '../../graphs/base/declare/graphDeclaration';
import type {TriangleSolverIds} from '../../graphs/trig/TriangleSolverGraph';
import type {FormulaBlock, GuidedLesson, GuidedLessonFrame, GuidedLessonStep, LessonScene, LocalizedText} from './guidedLessons';

const text = (sl: string, en: string): LocalizedText => ({sl, en});
const solverFrame = frameDeclarer<TriangleSolverIds>();
const frame = (id: string, kind: GuidedLessonFrame['kind'], declare?: FrameDeclaration): GuidedLessonFrame => ({id, kind, ...(declare ? {declare} : {})});

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
    /** The puck the explanation asks the learner to use (the data type choice), opened with the frame. */
    readonly uses?: 'triangle-data';
}

const step = ({uses, ...content}: StepContent): GuidedLessonStep => ({
    ...content,
    frames: [frame(`${content.id}-explanation`, 'explanation', uses ? solverFrame({uses: [uses]}) : undefined), frame(`${content.id}-observation`, 'observation')],
});

/** What a scene sets: the data type and the given fields (omitted fields take the type's defaults, see `set-data`). */
export interface SolveSceneSpec {
    readonly type: 'sss' | 'sas' | 'asa' | 'ssa';
    readonly a?: number;
    readonly b?: number;
    readonly c?: number;
    readonly angleA?: number;
    readonly angleB?: number;
}

/** The actions of a scene: the Demonstration default, the mode `solve`, then the data type with its fields. */
export const triangleSolveSceneActions = (id: string, spec: SolveSceneSpec): LessonAction[] => [
    {kind: 'prepared-scene', sceneId: id, source: 'demonstration-default'},
    {kind: 'triangle', operation: 'set-mode', mode: 'solve'},
    {kind: 'triangle', operation: 'set-data', ...spec},
];

const scene = (id: string, spec: SolveSceneSpec, sl: string, en: string): LessonScene =>
    ({id, basedOn: 'demonstration-default', actions: triangleSolveSceneActions(id, spec), expectedState: text(sl, en)});

/** SSS with the sides 5, 6, 7 (the chooser's example): one triangle. */
export const TR5_SSS_5_6_7: SolveSceneSpec = {type: 'sss', a: 5, b: 6, c: 7};
/** SSS with the sides 2, 3, 6: no triangle (2 + 3 < 6). */
export const TR5_SSS_2_3_6: SolveSceneSpec = {type: 'sss', a: 2, b: 3, c: 6};
/** SAS with b = 5, c = 7 and A = 60 degrees (the chooser's example). */
export const TR5_SAS_5_7_60: SolveSceneSpec = {type: 'sas', b: 5, c: 7, angleA: 60};
/** ASA with A = 40 degrees, B = 60 degrees and c = 8 (the chooser's example). */
export const TR5_ASA_40_60_8: SolveSceneSpec = {type: 'asa', angleA: 40, angleB: 60, c: 8};
/** SSA with A = 30 degrees, b = 8 and a = 8: one isosceles triangle. */
export const TR5_SSA_30_8_A8: SolveSceneSpec = {type: 'ssa', a: 8, b: 8, angleA: 30};
/** SSA with A = 30 degrees, b = 8 and a = 5 (the chooser's example): two triangles. */
export const TR5_SSA_30_8_A5: SolveSceneSpec = {type: 'ssa', a: 5, b: 8, angleA: 30};

// ---- Formulas --------------------------------------------------------------------------------------------------------------------

const formulas: readonly FormulaBlock[] = [
    {
        id: 'cosine-rule-a',
        latex: 'a^2=b^2+c^2-2bc\\cos A',
        notation: text(
            '\\(a\\), \\(b\\), \\(c\\) so stranice nasproti kotov \\(A\\), \\(B\\), \\(C\\); kot \\(A\\) leži med stranicama \\(b\\) in \\(c\\).',
            '\\(a\\), \\(b\\), \\(c\\) are the sides opposite the angles \\(A\\), \\(B\\), \\(C\\); the angle \\(A\\) lies between the sides \\(b\\) and \\(c\\).',
        ),
        explanation: text(
            'Kosinusni izrek iz prejšnje lekcije, zapisan za stranico \\(a\\): iz dveh stranic in kota med njima izračunaš tretjo stranico.',
            'The cosine rule of the previous lesson, written for the side \\(a\\): from two sides and the angle between them you calculate the third side.',
        ),
    },
    {
        id: 'angle-sum-sine-rule',
        latex: 'C=180^\\circ-A-B,\\qquad \\frac{a}{\\sin A}=\\frac{c}{\\sin C}',
        notation: text(
            'Vsota kotov trikotnika je \\(180^\\circ\\); \\(a\\) in \\(c\\) sta stranici nasproti kotov \\(A\\) in \\(C\\).',
            'The angles of a triangle add up to \\(180^\\circ\\); \\(a\\) and \\(c\\) are the sides opposite the angles \\(A\\) and \\(C\\).',
        ),
        explanation: text(
            'Iz dveh kotov dobiš tretjega, nato iz sinusnega izreka vsako stranico, ko poznaš eno.',
            'Two angles give the third, and then the sine rule gives every side once one side is known.',
        ),
    },
];

// ---- Steps -----------------------------------------------------------------------------------------------------------------------

const steps: readonly GuidedLessonStep[] = [
    step({
        id: 'tr5-exists', order: 1,
        title: text('Podatki in trikotnik', 'Data and a triangle'),
        purpose: text('Napovedati, ali podane tri stranice dajo trikotnik, preden preberemo status.', 'Predicting whether three given sides give a triangle before reading the status.'),
        explanation: text(
            'Graf je v načinu Reševanje trikotnika, podani podatki so SSS (tri stranice): \\(a=5\\), \\(b=6\\), \\(c=7\\). Ti podatki določajo en trikotnik z odčitki stranic, kotov in ploščine. Napovej, ali tri stranice \\(2\\), \\(3\\), \\(6\\) dajo trikotnik, in zapiši razlog. Nato v poljih Stranica c, Stranica b in Stranica a vpiši po vrsti \\(c=6\\), \\(b=3\\) in nazadnje \\(a=2\\): status, ki ga prebereš, je tako status zadnjega vpisa.',
            'The graph is in the mode Solve a triangle, the given data are SSS (three sides): \\(a=5\\), \\(b=6\\), \\(c=7\\). These data fix one triangle with readouts of sides, angles and area. Predict whether the three sides \\(2\\), \\(3\\), \\(6\\) give a triangle, and write down a reason. Then type, in the fields Side c, Side b and Side a, in this order \\(c=6\\), \\(b=3\\) and last \\(a=2\\): the status you read is then the status of the last entry.',
        ),
        formulaIds: [],
        observationPrompt: text('Preberi status in odčitke po vpisu \\(a=2\\) ter ju primerjaj s svojo napovedjo in razlogom.', 'Read the status and the readouts after the entry \\(a=2\\) and compare them with your prediction and reason.'),
        expectedObservations: [text(
            'Status je «Takega trikotnika ni: vsota dveh stranic mora biti večja od tretje.», odčitkov rešitve ni in nič ni narisano. Razlog: \\(2+3=5<6\\), stranici \\(a\\) in \\(b\\) skupaj ne dosežeta stranice \\(c\\). Po vpisih \\(c=6\\) in \\(b=3\\) je graf še kazal trikotnik (\\(5\\), \\(3\\), \\(6\\)): tri podatke je mogoče vpisati, trikotnik pa iz njih ni nujno mogoč.',
            'The status is "No such triangle: the sum of two sides must exceed the third.", there are no solution readouts and nothing is drawn. The reason: \\(2+3=5<6\\), the sides \\(a\\) and \\(b\\) together do not reach the side \\(c\\). After the entries \\(c=6\\) and \\(b=3\\) the graph still showed a triangle (\\(5\\), \\(3\\), \\(6\\)): three data can be typed in, but a triangle does not have to follow from them.',
        )],
        scene: scene('tr5-exists-scene', TR5_SSS_5_6_7,
            'Način Reševanje trikotnika, podatki SSS \\(a=5\\), \\(b=6\\), \\(c=7\\): ena rešitev, koti \\(\\approx44{,}4153^\\circ\\), \\(\\approx57{,}1217^\\circ\\), \\(\\approx78{,}463^\\circ\\).',
            'The mode Solve a triangle, data SSS \\(a=5\\), \\(b=6\\), \\(c=7\\): one solution, angles \\(\\approx44.4153^\\circ\\), \\(\\approx57.1217^\\circ\\), \\(\\approx78.463^\\circ\\).'),
    }),
    step({
        id: 'tr5-inequality', order: 2,
        title: text('Druge tri stranice', 'Three other sides'),
        purpose: text('Napovedati, kaj stori status, ko je vsota dveh stranic enaka tretji in ko je večja od nje.', 'Predicting what the status does when the sum of two sides equals the third and when it exceeds it.'),
        explanation: text(
            'Stranice so zdaj \\(a=2\\), \\(b=3\\), \\(c=6\\) in status pravi, da trikotnika ni. Napovej, kaj pokaže graf, če v polje Stranica a vpišeš \\(3\\) (stranice \\(3\\), \\(3\\), \\(6\\)), in kaj, če nato vpišeš \\(4\\) (stranice \\(4\\), \\(3\\), \\(6\\)). Pri vsakem zapiši razlog.',
            'The sides are now \\(a=2\\), \\(b=3\\), \\(c=6\\) and the status says that there is no triangle. Predict what the graph shows if you type \\(3\\) in the field Side a (sides \\(3\\), \\(3\\), \\(6\\)), and what it shows if you then type \\(4\\) (sides \\(4\\), \\(3\\), \\(6\\)). Write down a reason for each.',
        ),
        formulaIds: [],
        observationPrompt: text('Preberi status po vpisu \\(a=3\\) in po vpisu \\(a=4\\) ter ju primerjaj s svojima napovedma.', 'Read the status after the entry \\(a=3\\) and after the entry \\(a=4\\) and compare them with your two predictions.'),
        expectedObservations: [text(
            'Pri \\(3\\), \\(3\\), \\(6\\) status pravi «Podatki dajo sploščen trikotnik (oglišča ležijo na premici).», odčitkov ni: \\(3+3=6\\), stranici ležita vzdolž tretje. Pri \\(4\\), \\(3\\), \\(6\\) pravi «Ena rešitev.»; kot \\(C\\) je \\(\\approx117{,}2796^\\circ\\), ker je \\(c\\) najdaljša stranica. Pravilo: trikotnik s stranicami \\(a\\), \\(b\\), \\(c\\) obstaja, ko je vsota vsakih dveh stranic večja od tretje: \\(a+b>c\\), \\(a+c>b\\), \\(b+c>a\\); dovolj je preveriti, da je najdaljša stranica krajša od vsote drugih dveh. Pri enakosti ležijo oglišča na premici, pri manjši vsoti pa trikotnika ni.',
            'For \\(3\\), \\(3\\), \\(6\\) the status says "The data give a flat triangle (the vertices lie on a line).", with no readouts: \\(3+3=6\\), the two sides lie along the third. For \\(4\\), \\(3\\), \\(6\\) it says "One solution."; the angle \\(C\\) is \\(\\approx117.2796^\\circ\\), because \\(c\\) is the longest side. The rule: a triangle with sides \\(a\\), \\(b\\), \\(c\\) exists when the sum of every two sides exceeds the third: \\(a+b>c\\), \\(a+c>b\\), \\(b+c>a\\); it is enough to check that the longest side is shorter than the sum of the other two. With equality the vertices lie on a line, and with a smaller sum there is no triangle.',
        )],
        scene: scene('tr5-inequality-scene', TR5_SSS_2_3_6,
            'Način Reševanje trikotnika, podatki SSS \\(a=2\\), \\(b=3\\), \\(c=6\\): status «Takega trikotnika ni», brez odčitkov.',
            'The mode Solve a triangle, data SSS \\(a=2\\), \\(b=3\\), \\(c=6\\): the status "No such triangle", no readouts.'),
    }),
    step({
        id: 'tr5-sas', uses: 'triangle-data', order: 3,
        title: text('Dve stranici in kot med njima', 'Two sides and the angle between them'),
        purpose: text('Izračunati tretjo stranico s kosinusnim izrekom, preden jo graf pokaže.', 'Calculating the third side with the cosine rule before the graph shows it.'),
        explanation: text(
            'Graf kaže podatke SSS \\(a=5\\), \\(b=6\\), \\(c=7\\). Pri podatkih SKS poznaš dve stranici in kot med njima. Vzemi \\(b=5\\), \\(c=7\\) in \\(A=60^\\circ\\) ter uporabi \\(\\cos60^\\circ=\\tfrac12\\): s kosinusnim izrekom izračunaj \\(a^2\\) in \\(a\\). Nato med možnostmi Podani podatki izberi «SKS (dve stranici in kot med njima)»; naloži se primer \\(b=5\\), \\(c=7\\), \\(A=60^\\circ\\).',
            'The graph shows the SSS data \\(a=5\\), \\(b=6\\), \\(c=7\\). In SAS data you know two sides and the angle between them. Take \\(b=5\\), \\(c=7\\) and \\(A=60^\\circ\\) and use \\(\\cos60^\\circ=\\tfrac12\\): calculate \\(a^2\\) and \\(a\\) with the cosine rule. Then under Given data choose "SAS (two sides and the included angle)"; the example \\(b=5\\), \\(c=7\\), \\(A=60^\\circ\\) loads.',
        ),
        formulaIds: ['cosine-rule-a'],
        observationPrompt: text('Preberi stranico \\(a\\) in kota \\(B\\), \\(C\\) v odčitkih ter ju primerjaj s svojim računom.', 'Read the side \\(a\\) and the angles \\(B\\), \\(C\\) in the readouts and compare them with your calculation.'),
        expectedObservations: [text(
            'Račun: \\(a^2=5^2+7^2-2\\cdot5\\cdot7\\cdot\\tfrac12=74-35=39\\), torej \\(a=\\sqrt{39}\\approx6{,}245\\); odčitek je \\(a\\approx6{,}245\\). Kot \\(B\\) iz kosinusnega izreka: \\(\\cos B=\\dfrac{a^2+c^2-b^2}{2ac}=\\dfrac{39+49-25}{14\\sqrt{39}}=\\dfrac{9}{2\\sqrt{39}}\\approx0{,}7206\\), kar da \\(B\\approx43{,}8979^\\circ\\) kot v odčitku, in \\(C\\approx180^\\circ-60^\\circ-43{,}8979^\\circ=76{,}1021^\\circ\\). Pri SKS najprej dobiš tretjo stranico s kosinusnim izrekom, nato kota.',
            'The calculation: \\(a^2=5^2+7^2-2\\cdot5\\cdot7\\cdot\\tfrac12=74-35=39\\), so \\(a=\\sqrt{39}\\approx6.245\\); the readout is \\(a\\approx6.245\\). The angle \\(B\\) from the cosine rule: \\(\\cos B=\\dfrac{a^2+c^2-b^2}{2ac}=\\dfrac{39+49-25}{14\\sqrt{39}}=\\dfrac{9}{2\\sqrt{39}}\\approx0.7206\\), which gives \\(B\\approx43.8979^\\circ\\) as in the readout, and \\(C\\approx180^\\circ-60^\\circ-43.8979^\\circ=76.1021^\\circ\\). With SAS you first get the third side from the cosine rule, then the angles.',
        )],
        scene: scene('tr5-sas-scene', TR5_SSS_5_6_7,
            'Način Reševanje trikotnika, podatki SSS \\(a=5\\), \\(b=6\\), \\(c=7\\); izbira SKS naloži \\(b=5\\), \\(c=7\\), \\(A=60^\\circ\\).',
            'The mode Solve a triangle, data SSS \\(a=5\\), \\(b=6\\), \\(c=7\\); choosing SAS loads \\(b=5\\), \\(c=7\\), \\(A=60^\\circ\\).'),
    }),
    step({
        id: 'tr5-asa', uses: 'triangle-data', order: 4,
        title: text('Stranica in priležna kota', 'A side and the two adjacent angles'),
        purpose: text('Izračunati tretji kot in stranico s sinusnim izrekom ter napovedati, kdaj kota ne moreta pripadati trikotniku.', 'Calculating the third angle and a side with the sine rule and predicting when the two angles cannot belong to a triangle.'),
        explanation: text(
            'Graf kaže podatke SKS \\(b=5\\), \\(c=7\\), \\(A=60^\\circ\\). Pri podatkih KSK poznaš stranico in kota ob njej: vzemi \\(A=40^\\circ\\), \\(B=60^\\circ\\), \\(c=8\\). Najprej izračunaj \\(C\\) iz vsote kotov, nato \\(a\\) iz sinusnega izreka \\(a:\\sin A=c:\\sin C\\). Nato med možnostmi Podani podatki izberi «KSK (stranica in priležna kota)»; naloži se primer \\(A=40^\\circ\\), \\(B=60^\\circ\\), \\(c=8\\). Napovej še, kaj se zgodi, če v polje Kot B (°) vpišeš \\(150\\), in ga vpiši.',
            'The graph shows the SAS data \\(b=5\\), \\(c=7\\), \\(A=60^\\circ\\). In ASA data you know a side and the two angles at its ends: take \\(A=40^\\circ\\), \\(B=60^\\circ\\), \\(c=8\\). First calculate \\(C\\) from the angle sum, then \\(a\\) from the sine rule \\(a:\\sin A=c:\\sin C\\). Then under Given data choose "ASA (a side and the two adjacent angles)"; the example \\(A=40^\\circ\\), \\(B=60^\\circ\\), \\(c=8\\) loads. Also predict what happens if you type \\(150\\) in the field Angle B (°), and type it.',
        ),
        formulaIds: ['angle-sum-sine-rule'],
        observationPrompt: text('Preberi kot \\(C\\) in stranico \\(a\\) pri primeru KSK, nato status po vpisu \\(B=150\\), ter primerjaj z napovedmi.', 'Read the angle \\(C\\) and the side \\(a\\) for the ASA example, then the status after the entry \\(B=150\\), and compare with your predictions.'),
        expectedObservations: [text(
            'Račun: \\(C=180^\\circ-40^\\circ-60^\\circ=80^\\circ\\) in \\(a=\\dfrac{8\\sin40^\\circ}{\\sin80^\\circ}\\approx5{,}22163\\); odčitka sta \\(C=80^\\circ\\) in \\(a\\approx5{,}22163\\). Stranica \\(b=\\dfrac{8\\sin60^\\circ}{\\sin80^\\circ}\\approx7{,}03508\\) se ujema z odčitkom. Pri \\(B=150^\\circ\\) status pravi «Takega trikotnika ni: vsota kotov bi bila najmanj 180°.» in odčitkov ni: \\(40^\\circ+150^\\circ=190^\\circ\\ge180^\\circ\\), za tretji kot ni prostora.',
            'The calculation: \\(C=180^\\circ-40^\\circ-60^\\circ=80^\\circ\\) and \\(a=\\dfrac{8\\sin40^\\circ}{\\sin80^\\circ}\\approx5.22163\\); the readouts are \\(C=80^\\circ\\) and \\(a\\approx5.22163\\). The side \\(b=\\dfrac{8\\sin60^\\circ}{\\sin80^\\circ}\\approx7.03508\\) agrees with the readout. For \\(B=150^\\circ\\) the status says "No such triangle: the angles would add up to at least 180°." and there are no readouts: \\(40^\\circ+150^\\circ=190^\\circ\\ge180^\\circ\\), there is no room for a third angle.',
        )],
        scene: scene('tr5-asa-scene', TR5_SAS_5_7_60,
            'Način Reševanje trikotnika, podatki SKS \\(b=5\\), \\(c=7\\), \\(A=60^\\circ\\); izbira KSK naloži \\(A=40^\\circ\\), \\(B=60^\\circ\\), \\(c=8\\).',
            'The mode Solve a triangle, data SAS \\(b=5\\), \\(c=7\\), \\(A=60^\\circ\\); choosing ASA loads \\(A=40^\\circ\\), \\(B=60^\\circ\\), \\(c=8\\).'),
    }),
    step({
        id: 'tr5-ssa', order: 5,
        title: text('Krožnica okoli oglišča \\(C\\)', 'The circle about the vertex \\(C\\)'),
        purpose: text('Napovedati število trikotnikov pri SSK iz konstrukcije s krožnico in poltrakom.', 'Predicting the number of triangles for SSA from the construction with a circle and a ray.'),
        explanation: text(
            'Podatki SSK so \\(A=30^\\circ\\), \\(b=8\\), \\(a=8\\): graf kaže en enakokrak trikotnik. Oglišče \\(B\\) leži na poltraku iz \\(A\\) in je od \\(C\\) oddaljeno za \\(a\\), torej na krožnici s središčem \\(C\\) in polmerom \\(a\\). Poltrak in krožnica se sekata v točkah, ki so možna oglišča \\(B\\). Višina iz \\(C\\) na poltrak je \\(h=b\\sin A=8\\sin30^\\circ=4\\) (odčitek Višina h). Napovej, koliko trikotnikov dobiš pri \\(a=5\\), in zapiši razlog. Nato v polje Stranica a vpiši \\(5\\).',
            'The SSA data are \\(A=30^\\circ\\), \\(b=8\\), \\(a=8\\): the graph shows one isosceles triangle. The vertex \\(B\\) lies on the ray from \\(A\\) and at the distance \\(a\\) from \\(C\\), so on the circle with centre \\(C\\) and radius \\(a\\). The ray and the circle meet in points that are the possible vertices \\(B\\). The height from \\(C\\) to the ray is \\(h=b\\sin A=8\\sin30^\\circ=4\\) (the readout Height h). Predict how many triangles you get for \\(a=5\\), and write down a reason. Then type \\(5\\) in the field Side a.',
        ),
        formulaIds: [],
        observationPrompt: text('Preberi status, odčitke obeh rešitev in sliko ter jih primerjaj s svojo napovedjo.', 'Read the status, the readouts of both solutions and the picture and compare them with your prediction.'),
        expectedObservations: [text(
            'Status je «Dve rešitvi (dvoumni primer)»: dva trikotnika, \\(B_1\\) (polna črta) s \\(c\\approx9{,}9282\\) in \\(B_2\\) (črtkana) s \\(c\\approx3{,}9282\\); krožnica seka poltrak v dveh točkah. To je argument za zgornjo mejo: premica in krožnica imata največ dve skupni točki, zato trikotnikov ni več kot dva. Kota pri \\(B\\) sta \\(\\approx53{,}1301^\\circ\\) in \\(\\approx126{,}8699^\\circ\\), vsota \\(180^\\circ\\): ker je \\(CB_1=CB_2=a\\), sta kota ob stranici \\(B_1B_2\\) v trikotniku \\(CB_1B_2\\) enaka, \\(B_2\\) pa leži med \\(A\\) in \\(B_1\\) (\\(c\\approx3{,}9282<9{,}9282\\)), zato je kot pri \\(B_2\\) dopolnilni kot kota pri \\(B_1\\) do \\(180^\\circ\\).',
            'The status is "Two solutions (the ambiguous case)": two triangles, \\(B_1\\) (solid) with \\(c\\approx9.9282\\) and \\(B_2\\) (dashed) with \\(c\\approx3.9282\\); the circle meets the ray in two points. This is the argument for the upper bound: a line and a circle have at most two common points, so there are at most two triangles. The angles at \\(B\\) are \\(\\approx53.1301^\\circ\\) and \\(\\approx126.8699^\\circ\\), with sum \\(180^\\circ\\): because \\(CB_1=CB_2=a\\), the angles at the side \\(B_1B_2\\) in the triangle \\(CB_1B_2\\) are equal, and \\(B_2\\) lies between \\(A\\) and \\(B_1\\) (\\(c\\approx3.9282<9.9282\\)), so the angle at \\(B_2\\) is the supplement of the angle at \\(B_1\\) to \\(180^\\circ\\).',
        )],
        scene: scene('tr5-ssa-scene', TR5_SSA_30_8_A8,
            'Način Reševanje trikotnika, podatki SSK \\(A=30^\\circ\\), \\(b=8\\), \\(a=8\\): ena rešitev, \\(B=30^\\circ\\), \\(C=120^\\circ\\), \\(c\\approx13{,}85641\\), višina \\(h\\approx4\\).',
            'The mode Solve a triangle, data SSA \\(A=30^\\circ\\), \\(b=8\\), \\(a=8\\): one solution, \\(B=30^\\circ\\), \\(C=120^\\circ\\), \\(c\\approx13.85641\\), height \\(h\\approx4\\).'),
    }),
    step({
        id: 'tr5-cases', order: 6,
        title: text('Več vrednosti stranice \\(a\\)', 'Several values of the side \\(a\\)'),
        purpose: text('Napovedati število rešitev pri \\(a=h\\), \\(a<h\\) in \\(a\\ge b\\) ter izreči celotno pravilo.', 'Predicting the number of solutions for \\(a=h\\), \\(a<h\\) and \\(a\\ge b\\) and stating the whole rule.'),
        explanation: text(
            'Pri \\(A=30^\\circ\\), \\(b=8\\), \\(a=5\\) graf kaže dva trikotnika; višina je \\(h=4\\). Za vsako od vrednosti \\(a=4\\), \\(a=3{,}5\\) in \\(a=9\\) napovej število rešitev in zapiši razlog. Nato jih po vrsti vpiši v polje Stranica a.',
            'For \\(A=30^\\circ\\), \\(b=8\\), \\(a=5\\) the graph shows two triangles; the height is \\(h=4\\). For each of the values \\(a=4\\), \\(a=3.5\\) and \\(a=9\\) predict the number of solutions and write down a reason. Then type them one after another in the field Side a.',
        ),
        formulaIds: [],
        observationPrompt: text('Preberi status ob vsaki vrednosti \\(a\\) in ga primerjaj s svojo napovedjo.', 'Read the status for each value of \\(a\\) and compare it with your prediction.'),
        expectedObservations: [text(
            'Pri \\(a=4\\): «Ena rešitev: stranica a je enaka višini h ≈ 4, zato je trikotnik pravokoten (pravi kot pri B).»; krožnica se poltraka le dotakne, \\(B=90^\\circ\\), \\(C=60^\\circ\\), \\(c\\approx6{,}9282\\). Pri \\(a=3{,}5\\): «Takega trikotnika ni: stranica a je krajša od višine h ≈ 4.»; krožnica poltraka ne doseže, narisani so poltrak, krožnica in višina, trikotnika ni. Pri \\(a=9\\): «Ena rešitev: poltrak in krožni lok se sekata v eni točki.»; \\(A\\) je znotraj krožnice (\\(b=8<9\\)), zato druga točka krožnice na premici leži na drugi strani \\(A\\), ne na poltraku. Celotno pravilo za oster kot \\(A\\), \\(h=b\\sin A\\): \\(a<h\\) nobene rešitve, \\(a=h\\) ena (pravi kot pri \\(B\\)), \\(h<a<b\\) dve, \\(a\\ge b\\) ena (pri \\(a=b\\) je drugo presečišče \\(A\\) sam, kar ni trikotnik). Za topi ali pravi kot \\(A\\) velja: ena rešitev natanko pri \\(a>b\\), sicer nobene; tega primera ta scena ne kaže.',
            'For \\(a=4\\): "One solution: side a equals the height h ≈ 4, so the triangle is right-angled (right angle at B)."; the circle only touches the ray, \\(B=90^\\circ\\), \\(C=60^\\circ\\), \\(c\\approx6.9282\\). For \\(a=3.5\\): "No such triangle: side a is shorter than the height h ≈ 4."; the circle does not reach the ray, the ray, the circle and the height are drawn but no triangle. For \\(a=9\\): "One solution: the ray and the circular arc meet in one point."; \\(A\\) is inside the circle (\\(b=8<9\\)), so the other point of the circle on the line lies on the other side of \\(A\\), not on the ray. The whole rule for an acute angle \\(A\\), \\(h=b\\sin A\\): \\(a<h\\) no solution, \\(a=h\\) one (right angle at \\(B\\)), \\(h<a<b\\) two, \\(a\\ge b\\) one (for \\(a=b\\) the other intersection is \\(A\\) itself, which is not a triangle). For an obtuse or right angle \\(A\\): one solution exactly when \\(a>b\\), otherwise none; this scene does not show that case.',
        )],
        scene: scene('tr5-cases-scene', TR5_SSA_30_8_A5,
            'Način Reševanje trikotnika, podatki SSK \\(A=30^\\circ\\), \\(b=8\\), \\(a=5\\): dve rešitvi, \\(c\\approx9{,}9282\\) in \\(c\\approx3{,}9282\\).',
            'The mode Solve a triangle, data SSA \\(A=30^\\circ\\), \\(b=8\\), \\(a=5\\): two solutions, \\(c\\approx9.9282\\) and \\(c\\approx3.9282\\).'),
    }),
    step({
        id: 'tr5-explore', uses: 'triangle-data', order: 7,
        title: text('Prosto raziskovanje', 'Free exploration'),
        purpose: text('Samostojno poiskati razpon stranice \\(a\\) z dvema rešitvama pri SSK.', 'Finding on your own the range of the side \\(a\\) with two solutions for SSA.'),
        explanation: text(
            'Izbiraj vrste podatkov in spreminjaj polja; status pove, koliko rešitev je, odčitki pa kažejo stranice, kote in ploščino vsake rešitve. Slike so primeri, pravila pa veljajo zaradi izreka o vsoti kotov, kosinusnega in sinusnega izreka ter konstrukcije s krožnico.',
            'Choose the data types and change the fields; the status tells how many solutions there are, and the readouts show the sides, angles and area of each solution. The pictures are examples, while the rules hold because of the angle sum, the cosine and sine rules and the construction with the circle.',
        ),
        formulaIds: [],
        observationPrompt: text('Izberi SSK (naloži se \\(A=30^\\circ\\), \\(b=8\\), \\(a=5\\)) in poišči najmanjšo in največjo stranico \\(a\\) na mreži \\(\\tfrac14\\), pri kateri sta dve rešitvi.', 'Choose SSA (\\(A=30^\\circ\\), \\(b=8\\), \\(a=5\\) loads) and find the smallest and the largest side \\(a\\) on the grid of \\(\\tfrac14\\) with two solutions.'),
        expectedObservations: [text(
            'Najmanjša stranica z dvema rešitvama je \\(a=4{,}25\\), največja \\(a=7{,}75\\); pri \\(a=4\\) je ena rešitev, pri \\(a=8\\) in \\(a=8{,}25\\) tudi ena. To se ujema s pravilom \\(h<a<b\\), kjer je \\(h=4\\) in \\(b=8\\).',
            'The smallest side with two solutions is \\(a=4.25\\), the largest \\(a=7.75\\); at \\(a=4\\) there is one solution, and at \\(a=8\\) and \\(a=8.25\\) there is one too. This agrees with the rule \\(h<a<b\\), where \\(h=4\\) and \\(b=8\\).',
        )],
        scene: scene('tr5-explore-scene', TR5_SSS_5_6_7,
            'Način Reševanje trikotnika, podatki SSS \\(a=5\\), \\(b=6\\), \\(c=7\\): ena rešitev.',
            'The mode Solve a triangle, data SSS \\(a=5\\), \\(b=6\\), \\(c=7\\): one solution.'),
    }),
];

// ---- Lesson ----------------------------------------------------------------------------------------------------------------------

const triangleSolve: GuidedLesson = {
    demonstrationId: 'triangle-solver',
    title: text('Reševanje trikotnika: SSS, SKS, KSK in SSK', 'Solving a triangle: SSS, SAS, ASA and SSA'),
    summary: text(
        'Iz treh podatkov o trikotniku izračunaš ostale stranice in kote s kosinusnim in sinusnim izrekom. Lekcija preizkuša, kdaj podatki trikotnik določijo; pri SSK to pove konstrukcija s krožnico in poltrakom.',
        'From three data of a triangle you calculate the other sides and angles with the cosine and sine rules. The lesson tests when the data fix a triangle; for SSA the construction with a circle and a ray decides.',
    ),
    prerequisites: [
        text('Lekcija o kosinusnem izreku in lekcija o sinusnem izreku in očrtani krožnici.', 'The lessons on the cosine rule and on the sine rule and the circumcircle.'),
    ],
    learningGoals: [
        text('Presodiš, ali tri stranice dajo trikotnik, in izrečeš trikotniško neenakost.', 'Judge whether three sides give a triangle and state the triangle inequality.'),
        text('Rešiš trikotnik, podan s SKS ali KSK, s kosinusnim izrekom, vsoto kotov in sinusnim izrekom.', 'Solve a triangle given by SAS or ASA with the cosine rule, the angle sum and the sine rule.'),
        text('Napoveš, ali podatki SSK dajo nobeno, eno ali dve rešitvi, in to utemeljiš s krožnico in poltrakom.', 'Predict whether SSA data give none, one or two solutions and justify it with the circle and the ray.'),
    ],
    formulaBlocks: formulas,
    workedExamples: [],
    steps,
    sources: [
        {
            id: 'matura-catalogue-trikotnik',
            citation: 'Predmetni izpitni katalog za splošno maturo, matematika (M-MAT-2026): kosinusni in sinusni izrek, reševanje trikotnika. Sections as cited in docs/specs/trigonometry-lessons.md from the text extraction of the catalogue.',
            implementationCorrespondence: 'The lesson follows the topic list: the four data types, the cosine rule, the angle sum with the sine rule, and the case analysis of SSA through the circle about C and the ray from A.',
        },
        {
            id: 'bezeg-triangle-solver-implementation',
            citation: 'Bezeg source: src/trig/ (solver and exact SSA case rule) and src/graphs/trig/TriangleSolverGraph.tsx.',
            implementationCorrespondence: 'A scene applies the mode and data-type edits of the graph itself; the text quotes only readouts of those scenes (probed from the real graph) or plain arithmetic.',
        },
    ],
    edgeCases: [
        text('Pri sploščenem trikotniku (SSS z \\(a+b=c\\)) graf izpiše status in nobenih odčitkov; kot \\(180^\\circ\\) ni narisan.', 'For a flat triangle (SSS with \\(a+b=c\\)) the graph shows a status and no readouts; no angle of \\(180^\\circ\\) is drawn.'),
        text('Pri \\(a=b\\) in ostrem kotu \\(A\\) pri SSK je drugo presečišče krožnice in poltraka oglišče \\(A\\), zato je rešitev ena.', 'For \\(a=b\\) and an acute angle \\(A\\) in SSA the second intersection of the circle and the ray is the vertex \\(A\\), so there is one solution.'),
        text('Odčitki so izmerjeni na narisanem trikotniku in zaokroženi, označeni z \\(\\approx\\); izbira vrste podatkov nadomesti vpisane vrednosti s primerom.', 'The readouts are measured on the drawn triangle and rounded, marked \\(\\approx\\); choosing a data type replaces the typed values with its example.'),
    ],
    unresolvedQuestions: [],
};

export const triangleSolveLesson: GuidedLesson = triangleSolve;
