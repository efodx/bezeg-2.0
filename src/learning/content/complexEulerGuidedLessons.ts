/**
 * Guided lesson M7 of the complex maps family (docs/specs/complex-maps-lessons.md, Batch D): Euler's formula as uniform circular motion, on `complex-euler` (EulerCircleGraph). Scenes use only the
 * `complex-euler` actions the graph registers (`set-angle`, `set-motion`, `set-mode`, `set-series`) after a `prepared-scene` of the Demonstration default (theta = 30 degrees, omega = 2, N = 5,
 * velocity on, acceleration off, motion mode). The graph cannot hide the point, its caption, the status line or the table of readouts, so a step asks about a change the learner has not made yet
 * (a new angle, a new omega, the product mode, a higher degree N); the velocity and the product are hidden by the opening state (velocity off, motion mode). Steps 1-5 open at the series degree N = 1,
 * so that no partial sum of the series step is on the board before step 6. Status of the claims: e^(i theta) := cos theta + i sin theta is the definition (step 1); the velocity and the acceleration are
 * arguments from cos' = -sin and sin' = cos (steps 3, 4); the product rule is a proof from the addition formulas (step 5); that the series converges to cos theta + i sin theta is a cited theorem
 * (Euler's formula, step 6) and the partial sums are an illustration. Only real theta is used. Every number the text quotes is a readout of the graph for that scene, a value the learner reads after an
 * action the text asks for, or stated arithmetic; the numbers are listed per step in docs/reviews/feature-streams/families-prep/notes/f3-cm-d.md.
 */
import type {LessonAction} from '../model';
import type {FormulaBlock, GuidedLesson, GuidedLessonFrame, GuidedLessonStep, LessonScene, LocalizedText} from './guidedLessons';

const text = (sl: string, en: string): LocalizedText => ({sl, en});
const frame = (id: string, kind: GuidedLessonFrame['kind']): GuidedLessonFrame => ({id, kind});

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
}

const step = (content: StepContent): GuidedLessonStep => ({
    ...content,
    frames: [frame(`${content.id}-explanation`, 'explanation'), frame(`${content.id}-observation`, 'observation')],
});

/**
 * The stored fields a scene may set: the angle theta in whole degrees 0..360, the angular speed omega 1..4, the two arrows, the mode with the second angle b (steps of 5 degrees, 0..360)
 * and the series degree N 1..30. A field left out keeps the Demonstration default (theta 30, omega 2, N 5, velocity on, acceleration off, motion mode, b 45).
 */
export interface EulerSceneSpec {
    readonly degrees?: number;
    readonly omega?: number;
    readonly velocity?: boolean;
    readonly acceleration?: boolean;
    readonly mode?: 'motion' | 'product';
    readonly b?: number;
    readonly degree?: number;
}

/** The actions of an Euler scene: the Demonstration default, then the motion fields, the angle, the series degree and the mode (each only when the spec names it). */
export const eulerSceneActions = (id: string, spec: EulerSceneSpec): LessonAction[] => {
    const motion = {
        ...(spec.omega !== undefined ? {omega: spec.omega} : {}),
        ...(spec.velocity !== undefined ? {velocity: spec.velocity} : {}),
        ...(spec.acceleration !== undefined ? {acceleration: spec.acceleration} : {}),
    };
    return [
        {kind: 'prepared-scene', sceneId: id, source: 'demonstration-default'},
        ...(Object.keys(motion).length > 0 ? [{kind: 'complex-euler', operation: 'set-motion', ...motion} as const] : []),
        ...(spec.degrees !== undefined ? [{kind: 'complex-euler', operation: 'set-angle', degrees: spec.degrees} as const] : []),
        ...(spec.degree !== undefined ? [{kind: 'complex-euler', operation: 'set-series', degree: spec.degree} as const] : []),
        ...(spec.mode !== undefined ? [{kind: 'complex-euler', operation: 'set-mode', mode: spec.mode, ...(spec.b !== undefined ? {b: spec.b} : {})} as const] : []),
    ];
};

const eulerScene = (id: string, spec: EulerSceneSpec, sl: string, en: string): LessonScene =>
    ({id, basedOn: 'demonstration-default', actions: eulerSceneActions(id, spec), expectedState: text(sl, en)});

/**
 * M7. Step 1 opens on theta 0, velocity off, N 1 (M7_PATH); the learner sets theta 90, 180 and 270. Step 2 opens on theta 90, omega 1, velocity off, N 1 (M7_PERIOD); the learner sets omega 2 and 4.
 * Step 3 opens on theta 30, omega 2, velocity off, N 1 (M7_VELOCITY); the learner switches the velocity on. Step 4 opens on theta 90, omega 2, velocity on, N 1 (M7_ACCELERATION); the learner
 * switches the acceleration on. Step 5 opens on theta 30, velocity off, N 1, motion mode (M7_PRODUCT); the learner switches on the product (second angle 45), then sets theta 90 and the second angle 90.
 * Step 6 opens on theta 180, velocity off, N 1 (M7_SERIES); the learner raises N to 3, 5, 9, 13 and 21. Step 7 starts from the Demonstration default.
 */
export const M7_PATH = {degrees: 0, velocity: false, degree: 1} as const;
export const M7_PERIOD = {degrees: 90, omega: 1, velocity: false, degree: 1} as const;
export const M7_VELOCITY = {degrees: 30, velocity: false, degree: 1} as const;
export const M7_ACCELERATION = {degrees: 90, degree: 1} as const;
export const M7_PRODUCT = {degrees: 30, velocity: false, degree: 1} as const;
export const M7_SERIES = {degrees: 180, velocity: false, degree: 1} as const;
export const M7_DEFAULT = {} as const;
export const M7_EXPLORE = M7_DEFAULT;

const formulas: readonly FormulaBlock[] = [
    {
        id: 'euler-definition',
        latex: 'e^{i\\theta}:=\\cos\\theta+i\\sin\\theta,\\qquad \\left|e^{i\\theta}\\right|=1,\\qquad \\theta\\in\\mathbb{R}',
        notation: text(
            '\\(\\theta\\) je realen kot v radianih, \\(i\\) imaginarna enota.',
            '\\(\\theta\\) is a real angle in radians and \\(i\\) is the imaginary unit.',
        ),
        explanation: text(
            'To je definicija zapisa \\(e^{i\\theta}\\) v tej lekciji, ne izrek. Točka \\((\\cos\\theta;\\sin\\theta)\\) leži na enotski krožnici, ker je \\(\\cos^2\\theta+\\sin^2\\theta=1\\). Zapis uporabljamo samo za realen \\(\\theta\\); o številu \\(e^z\\) za kompleksen \\(z\\) lekcija ne govori.',
            'This is the definition of the notation \\(e^{i\\theta}\\) in this lesson, not a theorem. The point \\((\\cos\\theta;\\sin\\theta)\\) lies on the unit circle because \\(\\cos^2\\theta+\\sin^2\\theta=1\\). The notation is used only for real \\(\\theta\\); the lesson says nothing about \\(e^z\\) for complex \\(z\\).',
        ),
    },
    {
        id: 'euler-velocity',
        latex: 'z(t)=e^{i\\omega t}\\ \\Longrightarrow\\ z^{\\prime}(t)=i\\omega\\,z(t)',
        notation: text(
            '\\(z(t)\\) je lega točke ob času \\(t\\), \\(\\omega\\) kotna hitrost, \\(z^{\\prime}\\) odvod po času.',
            '\\(z(t)\\) is the position of the point at time \\(t\\), \\(\\omega\\) is the angular speed and \\(z^{\\prime}\\) the derivative with respect to time.',
        ),
        explanation: text(
            'To je argument iz definicije: ker je \\(\\cos^{\\prime}=-\\sin\\) in \\(\\sin^{\\prime}=\\cos\\), je \\(z^{\\prime}(t)=\\omega(-\\sin\\omega t+i\\cos\\omega t)=i\\omega(\\cos\\omega t+i\\sin\\omega t)\\). Slika pokaže primer, argument velja za vsak \\(t\\).',
            'This is an argument from the definition: since \\(\\cos^{\\prime}=-\\sin\\) and \\(\\sin^{\\prime}=\\cos\\), we get \\(z^{\\prime}(t)=\\omega(-\\sin\\omega t+i\\cos\\omega t)=i\\omega(\\cos\\omega t+i\\sin\\omega t)\\). The picture shows an instance, the argument holds for every \\(t\\).',
        ),
    },
    {
        id: 'euler-series',
        latex: '\\sum_{k=0}^{N}\\frac{(i\\theta)^k}{k!}\\ \\xrightarrow[N\\to\\infty]{}\\ \\cos\\theta+i\\sin\\theta,\\qquad \\theta\\in\\mathbb{R}',
        notation: text(
            '\\(N\\) je stopnja delne vsote, \\(k!\\) fakulteta števila \\(k\\).',
            '\\(N\\) is the degree of the partial sum and \\(k!\\) is the factorial of \\(k\\).',
        ),
        explanation: text(
            'To je izrek (Eulerjeva formula), ki ga navajamo in tu ne dokazujemo: vrsta za realen \\(\\theta\\) konvergira k številu \\(\\cos\\theta+i\\sin\\theta\\). Delne vsote, ki jih riše graf, so ponazoritev: vsaka je končna vsota, izrek govori o limiti.',
            'This is a theorem (Euler’s formula) that we cite and do not prove here: for real \\(\\theta\\) the series converges to \\(\\cos\\theta+i\\sin\\theta\\). The partial sums the graph draws are an illustration: each is a finite sum, the theorem is about the limit.',
        ),
    },
];

const steps: readonly GuidedLessonStep[] = [
    step({
        id: 'm7-circle', order: 1,
        title: text('Točka na enotski krožnici', 'A point on the unit circle'),
        purpose: text('Napovedati pot točke \\(\\cos\\theta+i\\sin\\theta\\) in njene lege pri \\(90^\\circ\\), \\(180^\\circ\\) in \\(270^\\circ\\).', 'Predicting the path of the point \\(\\cos\\theta+i\\sin\\theta\\) and its positions at \\(90^\\circ\\), \\(180^\\circ\\) and \\(270^\\circ\\).'),
        explanation: text(
            'Za realen kot \\(\\theta\\) zapis \\(e^{i\\theta}\\) pomeni število \\(\\cos\\theta+i\\sin\\theta\\), to je točka \\((\\cos\\theta;\\sin\\theta)\\). Prikazan je \\(\\theta=0^\\circ\\): točka je \\(1\\). Napoved: po kakšni črti in v katero smer se točka giblje, ko kot \\(\\theta\\) raste, in katere točke so \\(e^{i\\theta}\\) pri \\(90^\\circ\\), \\(180^\\circ\\) in \\(270^\\circ\\)? Romb \\(S\\) je za zdaj nepomemben, pride na vrsto v koraku 6.',
            'For a real angle \\(\\theta\\) the notation \\(e^{i\\theta}\\) means the number \\(\\cos\\theta+i\\sin\\theta\\), the point \\((\\cos\\theta;\\sin\\theta)\\). The angle \\(\\theta=0^\\circ\\) is shown: the point is \\(1\\). Prediction: along what curve and in which direction does the point move as the angle \\(\\theta\\) grows, and which points are \\(e^{i\\theta}\\) at \\(90^\\circ\\), \\(180^\\circ\\) and \\(270^\\circ\\)? The diamond \\(S\\) does not matter yet, it comes in step 6.',
        ),
        formulaIds: ['euler-definition'],
        observationPrompt: text('Zapiši napoved, nato v polje Kot \\(\\theta\\) (stopinje) vpiši \\(90\\), \\(180\\) in \\(270\\) in primerjaj točko ter stavek pod grafom z napovedjo.', 'Write down the prediction, then type \\(90\\), \\(180\\) and \\(270\\) into the field Angle \\(\\theta\\) (degrees) and compare the point and the sentence under the graph with it.'),
        expectedObservations: [text(
            'Točka teče po enotski krožnici v nasprotni smeri urnega kazalca. Pri \\(90^\\circ\\) je \\(e^{i\\theta}=i\\), točka \\((0;1)\\), pri \\(180^\\circ\\) je \\(-1\\), točka \\((-1;0)\\), pri \\(270^\\circ\\) je \\(-i\\), točka \\((0;-1)\\); graf te točke označi kot natančne. Pri \\(360^\\circ\\) se točka vrne v \\(1\\).',
            'The point runs along the unit circle counterclockwise. At \\(90^\\circ\\) we have \\(e^{i\\theta}=i\\), the point \\((0;1)\\); at \\(180^\\circ\\) it is \\(-1\\), the point \\((-1;0)\\); at \\(270^\\circ\\) it is \\(-i\\), the point \\((0;-1)\\); the graph marks these points as exact. At \\(360^\\circ\\) the point returns to \\(1\\).',
        )],
        scene: eulerScene('m7-circle-scene', M7_PATH,
            'Kot \\(\\theta=0^\\circ\\), točka \\(1\\), hitrost skrita, \\(N=1\\); učenec nastavi \\(90^\\circ\\), \\(180^\\circ\\) in \\(270^\\circ\\).',
            'The angle \\(\\theta=0^\\circ\\), the point \\(1\\), velocity hidden, \\(N=1\\); the learner sets \\(90^\\circ\\), \\(180^\\circ\\) and \\(270^\\circ\\).'),
    }),
    step({
        id: 'm7-uniform-motion', order: 2,
        title: text('Čas in kotna hitrost', 'Time and angular speed'),
        purpose: text('Z zvezo \\(\\theta=\\omega t\\) napovedati čas in obhodni čas pri večji kotni hitrosti.', 'Using the relation \\(\\theta=\\omega t\\) to predict the time and the period at a larger angular speed.'),
        explanation: text(
            'Naj se kot veča enakomerno s časom: \\(\\theta=\\omega t\\), kjer je \\(\\omega\\) kotna hitrost v radianih na časovno enoto in \\(t\\) čas; točka tako kroži enakomerno. Prikazano je \\(\\omega=1\\) pri kotu \\(90^\\circ\\); vrstici Čas \\(t=\\theta/\\omega\\) in Obhodni čas \\(2\\pi/\\omega\\) kažeta čas do tega kota in čas enega obhoda. Napoved: kolikšna sta ta dva časa pri \\(\\omega=2\\) in kolikšna pri \\(\\omega=4\\)? Zapiši ju kot natančni vrednosti.',
            'Let the angle grow uniformly with time: \\(\\theta=\\omega t\\), where \\(\\omega\\) is the angular speed in radians per time unit and \\(t\\) is time; the point then moves uniformly. \\(\\omega=1\\) at the angle \\(90^\\circ\\) is shown; the rows Time \\(t=\\theta/\\omega\\) and Period of revolution \\(2\\pi/\\omega\\) show the time up to this angle and the time of one revolution. Prediction: what are these two times at \\(\\omega=2\\) and at \\(\\omega=4\\)? Write them as exact values.',
        ),
        formulaIds: [],
        observationPrompt: text('Zapiši napoved, nato nastavi Kotna hitrost \\(\\omega\\) na \\(2\\) in nato na \\(4\\) ter pri vsakem preberi vrstici Čas \\(t=\\theta/\\omega\\) in Obhodni čas \\(2\\pi/\\omega\\).', 'Write down the prediction, then set Angular speed \\(\\omega\\) to \\(2\\) and then to \\(4\\) and at each read the rows Time \\(t=\\theta/\\omega\\) and Period of revolution \\(2\\pi/\\omega\\).'),
        expectedObservations: [text(
            'Pri \\(\\omega=1\\) je čas do \\(90^\\circ\\) enak \\(\\tfrac{\\pi}{2}\\approx1{,}571\\) in obhodni čas \\(2\\pi\\approx6{,}283\\). Pri \\(\\omega=2\\) je čas \\(\\tfrac{\\pi}{4}\\approx0{,}785\\) in obhodni čas \\(\\pi\\approx3{,}142\\); pri \\(\\omega=4\\) je čas \\(\\tfrac{\\pi}{8}\\approx0{,}393\\) in obhodni čas \\(\\tfrac{\\pi}{2}\\approx1{,}571\\). Cel obhod je kot \\(2\\pi\\), zato je obhodni čas \\(2\\pi/\\omega\\); kot \\(\\theta\\) pa traja \\(\\theta/\\omega\\). Točka na enotski krožnici v času \\(t\\) opiše lok dolžine \\(\\omega t\\), zato je hitrost točke \\(\\omega\\).',
            'At \\(\\omega=1\\) the time to \\(90^\\circ\\) is \\(\\tfrac{\\pi}{2}\\approx1.571\\) and the period is \\(2\\pi\\approx6.283\\). At \\(\\omega=2\\) the time is \\(\\tfrac{\\pi}{4}\\approx0.785\\) and the period is \\(\\pi\\approx3.142\\); at \\(\\omega=4\\) the time is \\(\\tfrac{\\pi}{8}\\approx0.393\\) and the period is \\(\\tfrac{\\pi}{2}\\approx1.571\\). A full revolution is the angle \\(2\\pi\\), so the period is \\(2\\pi/\\omega\\); the angle \\(\\theta\\) takes \\(\\theta/\\omega\\). In time \\(t\\) the point on the unit circle covers an arc of length \\(\\omega t\\), so the speed of the point is \\(\\omega\\).',
        )],
        scene: eulerScene('m7-uniform-motion-scene', M7_PERIOD,
            'Kot \\(\\theta=90^\\circ\\), \\(\\omega=1\\): čas \\(\\tfrac{\\pi}{2}\\approx1{,}571\\), obhodni čas \\(2\\pi\\approx6{,}283\\); učenec nastavi \\(\\omega=2\\) in nato \\(\\omega=4\\).',
            'The angle \\(\\theta=90^\\circ\\), \\(\\omega=1\\): time \\(\\tfrac{\\pi}{2}\\approx1.571\\), period \\(2\\pi\\approx6.283\\); the learner sets \\(\\omega=2\\) and then \\(\\omega=4\\).'),
    }),
    step({
        id: 'm7-velocity', order: 3,
        title: text('Vektor hitrosti', 'The velocity vector'),
        purpose: text('Napovedati vektor hitrosti kot število \\(i\\omega\\) krat lega in ga preveriti na grafu.', 'Predicting the velocity vector as the number \\(i\\omega\\) times the position and checking it on the graph.'),
        explanation: text(
            'Prikazan je \\(\\theta=30^\\circ\\) pri \\(\\omega=2\\), točka \\(e^{i\\theta}=(\\tfrac{\\sqrt3}{2};\\tfrac12)\\); vektor hitrosti je skrit. Vektor hitrosti je smer in dolžina, s katerima se točka giblje; njegova dolžina je hitrost točke. Napoved: kolikšen kot oklepa vektor hitrosti z vektorjem lege, kolikšna je njegova dolžina in katero kompleksno število je ta vektor?',
            'The angle \\(\\theta=30^\\circ\\) at \\(\\omega=2\\) is shown, the point \\(e^{i\\theta}=(\\tfrac{\\sqrt3}{2};\\tfrac12)\\); the velocity vector is hidden. The velocity vector is the direction and the length with which the point moves; its length is the speed of the point. Prediction: what angle does the velocity vector make with the position vector, what is its length, and which complex number is this vector?',
        ),
        formulaIds: [],
        observationPrompt: text('Zapiši napoved, nato vklopi Prikaži hitrost in preberi vrstice Vektor hitrosti, Velikost hitrosti ter Kot med krajevnim vektorjem in vektorjem hitrosti.', 'Write down the prediction, then switch on Show the velocity and read the rows Velocity, Speed (length of the velocity) and Angle between position and velocity.'),
        expectedObservations: [text(
            'Vektor hitrosti je \\(i\\omega\\,e^{i\\theta}=2i\\bigl(\\tfrac{\\sqrt3}{2}+\\tfrac{i}{2}\\bigr)=-1+\\sqrt3\\,i\\approx-1+1{,}7320508\\,i\\), dolžina \\(2\\), kot z lego \\(90^\\circ\\). Množenje z \\(i\\) zavrti vektor za \\(90^\\circ\\), množenje z \\(\\omega\\) ga raztegne za faktor \\(\\omega\\). Argument za vsak čas: iz \\(\\cos^{\\prime}=-\\sin\\) in \\(\\sin^{\\prime}=\\cos\\) sledi \\(z^{\\prime}=i\\omega z\\) za \\(z(t)=e^{i\\omega t}\\) (formula v naslednjem koraku); hitrost je torej vedno \\(\\omega\\) in vedno pravokotna na lego. Graf pokaže en primer.',
            'The velocity vector is \\(i\\omega\\,e^{i\\theta}=2i\\bigl(\\tfrac{\\sqrt3}{2}+\\tfrac{i}{2}\\bigr)=-1+\\sqrt3\\,i\\approx-1+1.7320508\\,i\\), length \\(2\\), angle \\(90^\\circ\\) with the position. Multiplying by \\(i\\) turns a vector by \\(90^\\circ\\), multiplying by \\(\\omega\\) stretches it by the factor \\(\\omega\\). An argument for every time: from \\(\\cos^{\\prime}=-\\sin\\) and \\(\\sin^{\\prime}=\\cos\\) we get \\(z^{\\prime}=i\\omega z\\) for \\(z(t)=e^{i\\omega t}\\) (the formula of the next step); so the speed is always \\(\\omega\\) and always perpendicular to the position. The graph shows one instance.',
        )],
        scene: eulerScene('m7-velocity-scene', M7_VELOCITY,
            'Kot \\(\\theta=30^\\circ\\), \\(\\omega=2\\), hitrost skrita; učenec vklopi hitrost: vektor \\(-1+\\sqrt3\\,i\\), dolžina \\(2\\).',
            'The angle \\(\\theta=30^\\circ\\), \\(\\omega=2\\), velocity hidden; the learner switches the velocity on: the vector \\(-1+\\sqrt3\\,i\\), length \\(2\\).'),
    }),
    step({
        id: 'm7-acceleration', order: 4,
        title: text('Pospešek', 'The acceleration'),
        purpose: text('Iz zveze \\(z^{\\prime}=i\\omega z\\) napovedati pospešek in preveriti, kam kaže.', 'Predicting the acceleration from \\(z^{\\prime}=i\\omega z\\) and checking where it points.'),
        explanation: text(
            'Pospešek je odvod hitrosti, \\(z^{\\prime\\prime}=(z^{\\prime})^{\\prime}\\). Prikazan je \\(\\theta=90^\\circ\\) pri \\(\\omega=2\\): točka je \\(i\\), vektor hitrosti je viden. Uporabi zvezo \\(z^{\\prime}=i\\omega z\\) iz prejšnjega koraka in napovej: v katero smer kaže pospešek glede na krožnico, kolikšna je njegova dolžina in katero število je ta vektor?',
            'The acceleration is the derivative of the velocity, \\(z^{\\prime\\prime}=(z^{\\prime})^{\\prime}\\). \\(\\theta=90^\\circ\\) at \\(\\omega=2\\) is shown: the point is \\(i\\) and the velocity vector is visible. Use the relation \\(z^{\\prime}=i\\omega z\\) of the previous step and predict: in which direction does the acceleration point relative to the circle, what is its length, and which number is this vector?',
        ),
        formulaIds: ['euler-velocity'],
        observationPrompt: text('Zapiši napoved, nato vklopi Prikaži pospešek in preberi vrstico Vektor pospeška; preberi tudi napis ob puščici na grafu.', 'Write down the prediction, then switch on Show the acceleration and read the row Acceleration; also read the label next to the arrow on the graph.'),
        expectedObservations: [text(
            'Iz \\(z^{\\prime}=i\\omega z\\) sledi \\(z^{\\prime\\prime}=i\\omega z^{\\prime}=(i\\omega)^2z=-\\omega^2z\\). Pri \\(\\omega=2\\) je to \\(-4z\\); pri \\(z=i\\) dobimo \\(-4i\\), kar graf pokaže v vrstici. Pospešek kaže iz točke proti središču, njegova dolžina je \\(\\omega^2=4\\). Puščica je na grafu narisana v manjšem merilu, kar pove napis ob njej. Točka ima stalno hitrost, a nenehno pospešuje, ker se smer hitrosti spreminja.',
            'From \\(z^{\\prime}=i\\omega z\\) it follows that \\(z^{\\prime\\prime}=i\\omega z^{\\prime}=(i\\omega)^2z=-\\omega^2z\\). At \\(\\omega=2\\) this is \\(-4z\\); at \\(z=i\\) we get \\(-4i\\), which the graph shows in the row. The acceleration points from the point towards the centre, its length is \\(\\omega^2=4\\). The arrow is drawn on a smaller scale on the graph, which the label next to it says. The point has a constant speed yet it keeps accelerating, because the direction of the velocity changes.',
        )],
        scene: eulerScene('m7-acceleration-scene', M7_ACCELERATION,
            'Kot \\(\\theta=90^\\circ\\), \\(\\omega=2\\), točka \\(i\\), hitrost \\(-2\\), pospešek skrit; učenec vklopi pospešek: vektor \\(-4i\\).',
            'The angle \\(\\theta=90^\\circ\\), \\(\\omega=2\\), the point \\(i\\), velocity \\(-2\\), acceleration hidden; the learner switches the acceleration on: the vector \\(-4i\\).'),
    }),
    step({
        id: 'm7-product', order: 5,
        title: text('Zmnožek dveh točk', 'Two points multiplied'),
        purpose: text('Napovedati zmnožek točk \\(e^{i\\theta}\\) in \\(e^{i\\varphi}\\) in uporabiti pravilo pri kotih \\(90^\\circ\\).', 'Predicting the product of the points \\(e^{i\\theta}\\) and \\(e^{i\\varphi}\\) and applying the rule at the angles \\(90^\\circ\\).'),
        explanation: text(
            'Prikazan je \\(\\theta=30^\\circ\\), točka \\((\\tfrac{\\sqrt3}{2};\\tfrac12)\\); zmnožek je skrit. Ko vklopiš Zmnoži dve točki, se pojavi druga točka \\(e^{i\\varphi}\\) s \\(\\varphi=45^\\circ\\), kot \\(\\varphi\\) pa spreminja drsnik Drugi kot \\(\\varphi\\) (stopinje). Napoved (a): pri katerem kotu leži zmnožek \\(e^{i\\theta}\\cdot e^{i\\varphi}\\) za \\(\\theta=30^\\circ\\) in \\(\\varphi=45^\\circ\\) in kolikšni sta njegovi koordinati (približno)? Napoved (b): kolikšen je zmnožek pri \\(\\theta=90^\\circ\\) in \\(\\varphi=90^\\circ\\)?',
            'The angle \\(\\theta=30^\\circ\\) and the point \\((\\tfrac{\\sqrt3}{2};\\tfrac12)\\) are shown; the product is hidden. When you switch on Multiply two points, a second point \\(e^{i\\varphi}\\) with \\(\\varphi=45^\\circ\\) appears, and the slider Second angle \\(\\varphi\\) (degrees) changes the angle \\(\\varphi\\). Prediction (a): at which angle does the product \\(e^{i\\theta}\\cdot e^{i\\varphi}\\) lie for \\(\\theta=30^\\circ\\) and \\(\\varphi=45^\\circ\\), and what are its coordinates (approximately)? Prediction (b): what is the product at \\(\\theta=90^\\circ\\) and \\(\\varphi=90^\\circ\\)?',
        ),
        formulaIds: [],
        observationPrompt: text('Zapiši napoved (a), nato vklopi Zmnoži dve točki in preberi vrstici Kota se seštejeta ter Zmnožek. Nato zapiši napoved (b), v polje Kot \\(\\theta\\) (stopinje) vpiši \\(90\\), z drsnikom Drugi kot \\(\\varphi\\) nastavi \\(90\\) in preberi iste vrstice.', 'Write down prediction (a), then switch on Multiply two points and read the rows Angles add and Product. Then write down prediction (b), type \\(90\\) into the field Angle \\(\\theta\\) (degrees), set \\(90\\) with the slider Second angle \\(\\varphi\\) and read the same rows.'),
        expectedObservations: [text(
            '(a) Kota se seštejeta: \\(30^\\circ+45^\\circ=75^\\circ\\), zmnožek je \\((\\cos75^\\circ;\\sin75^\\circ)\\approx(0{,}258819;\\,0{,}9659258)\\); graf pokaže te vrednosti kot izračunane. (b) Kota \\(90^\\circ+90^\\circ=180^\\circ\\), zmnožek je \\((-1;0)\\), natančno. To je \\(i\\cdot i=-1=e^{i\\pi}\\). Pravilo je dokazano: \\((\\cos a+i\\sin a)(\\cos b+i\\sin b)=(\\cos a\\cos b-\\sin a\\sin b)+i(\\sin a\\cos b+\\cos a\\sin b)=\\cos(a+b)+i\\sin(a+b)\\) po adicijskih izrekih, torej \\(e^{ia}e^{ib}=e^{i(a+b)}\\) za vsaka realna \\(a\\) in \\(b\\); dva primera pravila ne dokažeta, dokaz je ta račun.',
            '(a) The angles add: \\(30^\\circ+45^\\circ=75^\\circ\\), the product is \\((\\cos75^\\circ;\\sin75^\\circ)\\approx(0.258819;\\,0.9659258)\\); the graph shows these values as computed. (b) The angles \\(90^\\circ+90^\\circ=180^\\circ\\), the product is \\((-1;0)\\), exact. This is \\(i\\cdot i=-1=e^{i\\pi}\\). The rule is proved: \\((\\cos a+i\\sin a)(\\cos b+i\\sin b)=(\\cos a\\cos b-\\sin a\\sin b)+i(\\sin a\\cos b+\\cos a\\sin b)=\\cos(a+b)+i\\sin(a+b)\\) by the addition formulas, so \\(e^{ia}e^{ib}=e^{i(a+b)}\\) for all real \\(a\\) and \\(b\\); two examples do not prove the rule, the proof is this computation.',
        )],
        scene: eulerScene('m7-product-scene', M7_PRODUCT,
            'Kot \\(\\theta=30^\\circ\\), način gibanja, zmnožek skrit; učenec vklopi zmnožek (\\(\\varphi=45^\\circ\\)), nato nastavi \\(\\theta=90^\\circ\\) in \\(\\varphi=90^\\circ\\).',
            'The angle \\(\\theta=30^\\circ\\), motion mode, the product hidden; the learner switches the product on (\\(\\varphi=45^\\circ\\)), then sets \\(\\theta=90^\\circ\\) and \\(\\varphi=90^\\circ\\).'),
    }),
    step({
        id: 'm7-series', order: 6,
        title: text('Vrsta za \\(\\cos\\theta+i\\sin\\theta\\)', 'The series for \\(\\cos\\theta+i\\sin\\theta\\)'),
        purpose: text('Z izrekom napovedati, kam gredo delne vsote pri \\(\\theta=180^\\circ\\), in to preveriti pri večjih \\(N\\).', 'Using the theorem to predict where the partial sums go at \\(\\theta=180^\\circ\\) and checking this at larger \\(N\\).'),
        explanation: text(
            'Eulerjeva formula je izrek, ki ga navajamo: vrsta \\(\\sum_{k\\ge0}(i\\theta)^k/k!\\) za realen \\(\\theta\\) konvergira k številu \\(\\cos\\theta+i\\sin\\theta\\). Delna vsota stopnje \\(N\\) je \\(S_N=\\sum_{k=0}^{N}(i\\theta)^k/k!\\). Prikazan je \\(\\theta=180^\\circ\\), to je \\(\\theta=\\pi\\), in \\(N=1\\), kjer je \\(S_1=1+i\\theta\\). Napoved: proti kateri točki gredo delne vsote \\(S_N\\), ko \\(N\\) raste, in ali so prve že blizu nje?',
            'Euler’s formula is a theorem that we cite: for real \\(\\theta\\) the series \\(\\sum_{k\\ge0}(i\\theta)^k/k!\\) converges to the number \\(\\cos\\theta+i\\sin\\theta\\). The partial sum of degree \\(N\\) is \\(S_N=\\sum_{k=0}^{N}(i\\theta)^k/k!\\). \\(\\theta=180^\\circ\\), that is \\(\\theta=\\pi\\), and \\(N=1\\) are shown, where \\(S_1=1+i\\theta\\). Prediction: towards which point do the partial sums \\(S_N\\) go as \\(N\\) grows, and are the first ones already close to it?',
        ),
        formulaIds: ['euler-series'],
        observationPrompt: text('Zapiši napoved, nato v polju Stopnja vrste \\(N\\) nastavi \\(3\\), \\(5\\), \\(9\\), \\(13\\) in \\(21\\) ter pri vsakem preberi vrstici Delna vsota stopnje \\(N\\) in Razdalja delne vsote od točke.', 'Write down the prediction, then set the field Series degree \\(N\\) to \\(3\\), \\(5\\), \\(9\\), \\(13\\) and \\(21\\) and at each read the rows Partial sum of degree \\(N\\) and Distance of the partial sum from the point.'),
        expectedObservations: [text(
            'Pri \\(\\theta=\\pi\\) je \\(e^{i\\theta}=\\cos\\pi+i\\sin\\pi=-1\\). Delne vsote so približno: \\(S_1=1+3{,}1416\\,i\\) (razdalja od točke približno \\(3{,}72\\)), \\(S_3\\approx-3{,}9348-2{,}0261\\,i\\) (\\(3{,}57\\)); \\(S_1\\) in \\(S_3\\) sta zunaj pogleda in ju graf ne nariše, kar pove stavek pod grafom. Nato \\(S_5\\approx0{,}1239+0{,}524\\,i\\) (\\(1{,}24\\)), \\(S_9\\approx-0{,}976+0{,}0069\\,i\\) (\\(0{,}025\\)), \\(S_{13}\\approx-0{,}9999\\) (\\(0{,}000103\\)) in \\(S_{21}\\approx-1\\) (\\(7{,}64\\cdot10^{-11}\\)). Prve delne vsote so daleč, kasnejše se približujejo točki \\(-1\\). Graf vsako vrstico imenuje delna vsota stopnje \\(N\\), ne enakost: končna vsota ni limita, izrek govori o limiti, slika ga ponazarja.',
            'At \\(\\theta=\\pi\\) we have \\(e^{i\\theta}=\\cos\\pi+i\\sin\\pi=-1\\). The partial sums are approximately: \\(S_1=1+3.1416\\,i\\) (distance from the point about \\(3.72\\)), \\(S_3\\approx-3.9348-2.0261\\,i\\) (\\(3.57\\)); \\(S_1\\) and \\(S_3\\) are outside the view and the graph does not draw them, which the sentence under the graph says. Then \\(S_5\\approx0.1239+0.524\\,i\\) (\\(1.24\\)), \\(S_9\\approx-0.976+0.0069\\,i\\) (\\(0.025\\)), \\(S_{13}\\approx-0.9999\\) (\\(0.000103\\)) and \\(S_{21}\\approx-1\\) (\\(7.64\\cdot10^{-11}\\)). The first partial sums are far away, the later ones approach the point \\(-1\\). The graph calls each row a partial sum of degree \\(N\\), not an equality: a finite sum is not the limit, the theorem is about the limit and the picture illustrates it.',
        )],
        scene: eulerScene('m7-series-scene', M7_SERIES,
            'Kot \\(\\theta=180^\\circ\\), točka \\(-1\\), \\(N=1\\): \\(S_1=1+3{,}1416\\,i\\) zunaj pogleda; učenec dvigne \\(N\\) na \\(3\\), \\(5\\), \\(9\\), \\(13\\) in \\(21\\).',
            'The angle \\(\\theta=180^\\circ\\), the point \\(-1\\), \\(N=1\\): \\(S_1=1+3.1416\\,i\\) outside the view; the learner raises \\(N\\) to \\(3\\), \\(5\\), \\(9\\), \\(13\\) and \\(21\\).'),
    }),
    step({
        id: 'm7-explore', order: 7,
        title: text('Prosto raziskovanje', 'Free exploration'),
        purpose: text('Pravila preizkusiti na svojih kotih.', 'Trying the rules on your own angles.'),
        explanation: text(
            'Zdaj je prikazano privzeto stanje: \\(\\theta=30^\\circ\\), \\(\\omega=2\\), \\(N=5\\), hitrost je vklopljena. Spreminjaj kot, kotno hitrost, stopnjo \\(N\\) in drugi kot \\(\\varphi\\), pred vsako spremembo pa napovej, kaj bo pokazal graf. Gumb Predvajaj poveča kot za \\(5^\\circ\\) na korak, Ponastavi pa vrne \\(\\theta=0^\\circ\\) in ustavi predvajanje.',
            'The Demonstration default is shown now: \\(\\theta=30^\\circ\\), \\(\\omega=2\\), \\(N=5\\), the velocity is on. Change the angle, the angular speed, the degree \\(N\\) and the second angle \\(\\varphi\\), and before each change predict what the graph will show. The button Play grows the angle by \\(5^\\circ\\) per step and Reset returns \\(\\theta=0^\\circ\\) and stops playback.',
        ),
        formulaIds: [],
        observationPrompt: text('Poišči kot \\(\\theta\\), pri katerem je točka \\((\\tfrac{\\sqrt2}{2};\\tfrac{\\sqrt2}{2})\\); pri \\(\\theta=30^\\circ\\) poišči \\(\\varphi\\), pri katerem je zmnožek enak \\(1\\); napoved obhodnega časa pri \\(\\omega=3\\) zapiši, preden ga nastaviš.', 'Find the angle \\(\\theta\\) at which the point is \\((\\tfrac{\\sqrt2}{2};\\tfrac{\\sqrt2}{2})\\); at \\(\\theta=30^\\circ\\) find \\(\\varphi\\) for which the product equals \\(1\\); write down the prediction of the period at \\(\\omega=3\\) before you set it.'),
        expectedObservations: [text(
            'Točka je \\((\\tfrac{\\sqrt2}{2};\\tfrac{\\sqrt2}{2})\\) pri \\(\\theta=45^\\circ\\). Zmnožek je \\(1\\), kadar se kota seštejeta v polni krog: \\(30^\\circ+\\varphi=360^\\circ\\), torej \\(\\varphi=330^\\circ\\). Obhodni čas pri \\(\\omega=3\\) je \\(\\tfrac{2\\pi}{3}\\approx2{,}094\\).',
            'The point is \\((\\tfrac{\\sqrt2}{2};\\tfrac{\\sqrt2}{2})\\) at \\(\\theta=45^\\circ\\). The product is \\(1\\) when the angles add up to a full turn: \\(30^\\circ+\\varphi=360^\\circ\\), so \\(\\varphi=330^\\circ\\). The period at \\(\\omega=3\\) is \\(\\tfrac{2\\pi}{3}\\approx2.094\\).',
        )],
        scene: eulerScene('m7-explore-scene', M7_EXPLORE,
            'Privzeto stanje \\(\\theta=30^\\circ\\), \\(\\omega=2\\), \\(N=5\\): nevtralno stanje za raziskovanje.',
            'The default \\(\\theta=30^\\circ\\), \\(\\omega=2\\), \\(N=5\\): a neutral state for exploring.'),
    }),
];

const sources: GuidedLesson['sources'] = [
    {
        id: 'bezeg-complex-euler-implementation',
        citation: 'Bezeg source: src/analysis/eulerCircle.ts (the exact trigonometric values and the partial-sum recurrence) and src/graphs/complex/EulerCircleGraph.tsx. Euler’s formula for real angles is a standard theorem about the power series of cosine and sine, cited and not proved here.',
        implementationCorrespondence: 'A scene sets the angle in whole degrees 0..360, the angular speed 1..4, the two arrows, the product mode with the second angle in steps of 5 degrees and the series degree 1..30. The rows give the angle, the time and the period as exact multiples of pi with a rounded decimal, the point and the product exactly where the model has exact trigonometry (otherwise marked as computed), the velocity and the acceleration as computed vectors, and the partial sum of degree N with its distance from the point; a partial sum outside the view is not drawn. The text quotes only values of those scenes, values the learner reads after an action the text asks for, or stated arithmetic.',
    },
];

export const complexEulerLesson: GuidedLesson = {
    demonstrationId: 'complex-euler',
    title: text('Eulerjeva formula: enakomerno kroženje', 'Euler’s formula: uniform circular motion'),
    summary: text(
        'Točka \\(e^{i\\theta}=\\cos\\theta+i\\sin\\theta\\) teče po enotski krožnici; ob \\(\\theta=\\omega t\\) kroži enakomerno. Njeno hitrost in pospešek izpeljemo iz definicije, pravilo za zmnožek iz adicijskih izrekov, vrsto pa kot izrek navedemo in ponazorimo z delnimi vsotami.',
        'The point \\(e^{i\\theta}=\\cos\\theta+i\\sin\\theta\\) runs along the unit circle; with \\(\\theta=\\omega t\\) it moves uniformly. We derive its velocity and acceleration from the definition, the product rule from the addition formulas, and we cite the series as a theorem and illustrate it with partial sums.',
    ),
    prerequisites: [text('Množenje kompleksnih števil in Moivreova formula iz lekcije o potencah; sinus in kosinus na enotski krožnici.', 'Multiplication of complex numbers and the de Moivre formula from the lesson on powers; sine and cosine on the unit circle.')],
    learningGoals: [
        text('Veš, da je \\(e^{i\\theta}:=\\cos\\theta+i\\sin\\theta\\) definicija za realen \\(\\theta\\) in da točka leži na enotski krožnici.', 'Know that \\(e^{i\\theta}:=\\cos\\theta+i\\sin\\theta\\) is a definition for real \\(\\theta\\) and that the point lies on the unit circle.'),
        text('Z zvezo \\(\\theta=\\omega t\\) izračunaš čas in obhodni čas ter veš, da sta hitrost \\(i\\omega z\\) in pospešek \\(-\\omega^2z\\) posledici odvajanja in da pospešek kaže proti središču.', 'Use \\(\\theta=\\omega t\\) to compute the time and the period and know that the velocity \\(i\\omega z\\) and the acceleration \\(-\\omega^2z\\) follow from differentiation and that the acceleration points to the centre.'),
        text('Veš, da se pri zmnožku točk koti seštejejo (iz adicijskih izrekov) in da vrsta za \\(\\cos\\theta+i\\sin\\theta\\) konvergira kot izrek, delne vsote pa so ponazoritev.', 'Know that the angles add when points are multiplied (from the addition formulas) and that the series for \\(\\cos\\theta+i\\sin\\theta\\) converges as a theorem, with the partial sums as an illustration.'),
    ],
    formulaBlocks: formulas,
    workedExamples: [],
    steps,
    sources,
    edgeCases: [
        text('Lekcija uporablja \\(e^{i\\theta}\\) samo za realen kot \\(\\theta\\); o številu \\(e^z\\) za kompleksen \\(z\\) ne govori.', 'The lesson uses \\(e^{i\\theta}\\) only for a real angle \\(\\theta\\); it says nothing about \\(e^z\\) for complex \\(z\\).'),
        text('Delna vsota zunaj pogleda je še vedno število \\(S_N\\); graf je ne nariše in to pove v stavku pod grafom.', 'A partial sum outside the view is still the number \\(S_N\\); the graph does not draw it and says so in the sentence under it.'),
        text('Točke pri kotih, ki niso večkratniki \\(30^\\circ\\) ali \\(45^\\circ\\), graf prikaže kot izračunane zaokrožene vrednosti, ne kot natančne.', 'Points at angles that are not multiples of \\(30^\\circ\\) or \\(45^\\circ\\) are shown by the graph as computed rounded values, not as exact ones.'),
    ],
    unresolvedQuestions: [],
};
