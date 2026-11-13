/**
 * Guided lessons of the waves family, batch A (docs/specs/waves-sampling-lessons.md): WV1, superposition and phase, and WV2, beats, both on `waves` (WavesGraph).
 * Each is the lesson of one section of the waves chapter (wavesChapterRegistry.ts adapts them on request; the lesson catalog holds none, as it keeps one lesson per
 * Demonstration). Scenes use only the `waves` actions the graph registers (`set-mode`, `set-components`, `set-time`) and every scene starts from the Demonstration
 * default and names what it sets; no scene starts playback. Every number the text quotes is a readout of the graph for that scene, a value the learner reads after an
 * action the text asks for, or a value of a formula shown in the same step; the numbers are listed per step in docs/reviews/feature-streams/families-prep/notes/f3-waves-a.md.
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

/** The fields `set-components` may carry (the stored fields of the sum, beats and standing-wave pictures). */
export interface WavesSceneComponents {
    readonly a1?: number;
    readonly p1?: number;
    readonly a2?: number;
    readonly p2?: number;
    readonly f1?: number;
    readonly f2?: number;
    readonly showPhasors?: boolean;
    readonly showEnvelope?: boolean;
    readonly halfWaves?: number;
}

/** What a waves scene sets: the kind of waves (the Demonstration default is the sum), the components and the time in seconds. */
export interface WavesSceneSpec {
    readonly mode?: 'sum' | 'beats' | 'standing';
    readonly components?: WavesSceneComponents;
    readonly t: number;
}

/** The actions of a waves scene: the Demonstration default, the mode (it resets the time), the components, then the time. */
export const wavesSceneActions = (id: string, spec: WavesSceneSpec): LessonAction[] => [
    {kind: 'prepared-scene', sceneId: id, source: 'demonstration-default'},
    ...(spec.mode !== undefined && spec.mode !== 'sum' ? [{kind: 'waves', operation: 'set-mode', mode: spec.mode} as const] : []),
    ...(spec.components !== undefined ? [{kind: 'waves', operation: 'set-components', ...spec.components} as const] : []),
    {kind: 'waves', operation: 'set-time', t: spec.t},
];

const wavesScene = (id: string, spec: WavesSceneSpec, sl: string, en: string): LessonScene =>
    ({id, basedOn: 'demonstration-default', actions: wavesSceneActions(id, spec), expectedState: text(sl, en)});

/** The beats of WV2: two waves of amplitude 1 at 10 Hz and 12 Hz, the envelope hidden until the step that shows it. */
export const WV2_BEATS = {f1: 10, f2: 12, showEnvelope: false} as const;
export const WV2_ENVELOPE = {f1: 10, f2: 12} as const;
/** The amplitudes of the unequal pair of WV1 step 6. */
export const WV1_UNEQUAL = {a1: 3, a2: 2, p2: 90} as const;

// ---- WV1 -------------------------------------------------------------------------------------------------------------------------

const wv1Formulas: readonly FormulaBlock[] = [
    {
        id: 'same-frequency-sum',
        latex: 'A_1\\cos(2\\pi ft+\\varphi_1)+A_2\\cos(2\\pi ft+\\varphi_2)=A\\cos(2\\pi ft+\\varphi),\\quad A=\\sqrt{A_1^2+A_2^2+2A_1A_2\\cos\\Delta\\varphi},\\quad \\varphi=\\varphi_1+\\operatorname{atan2}\\!\\left(A_2\\sin\\Delta\\varphi,\\ A_1+A_2\\cos\\Delta\\varphi\\right)',
        notation: text(
            '\\(f\\) je skupna frekvenca obeh valov v hercih, \\(A_1\\) in \\(A_2\\) sta amplitudi, \\(\\varphi_1\\) in \\(\\varphi_2\\) fazi, \\(\\Delta\\varphi=\\varphi_2-\\varphi_1\\) razlika faz, \\(A\\) in \\(\\varphi\\) pa amplituda in faza vsote.',
            '\\(f\\) is the common frequency of both waves in hertz, \\(A_1\\) and \\(A_2\\) are the amplitudes, \\(\\varphi_1\\) and \\(\\varphi_2\\) the phases, \\(\\Delta\\varphi=\\varphi_2-\\varphi_1\\) the phase difference, and \\(A\\) and \\(\\varphi\\) the amplitude and phase of the sum.',
        ),
        explanation: text(
            'Obrazec velja samo za enaki frekvenci. Funkcija \\(\\operatorname{atan2}(y,x)\\) vrne kot točke \\((x;\\,y)\\) v območju od \\(-180^\\circ\\) do \\(180^\\circ\\). Če je \\(\\varphi_1=0\\), je \\(\\varphi\\) faza vsote glede na val 1; graf pri \\(\\varphi_1=0\\) piše prav to vrednost. Pri enakih amplitudah \\(A_1=A_2=a\\) se amplituda poenostavi v \\(A=2a\\left|\\cos\\tfrac{\\Delta\\varphi}{2}\\right|\\), vedno med \\(|A_1-A_2|\\) in \\(A_1+A_2\\).',
            'The formula holds only for equal frequencies. The function \\(\\operatorname{atan2}(y,x)\\) returns the angle of the point \\((x;\\,y)\\) in the range from \\(-180^\\circ\\) to \\(180^\\circ\\). If \\(\\varphi_1=0\\), then \\(\\varphi\\) is the phase of the sum relative to wave 1; at \\(\\varphi_1=0\\) the graph writes exactly this value. For equal amplitudes \\(A_1=A_2=a\\) the amplitude simplifies to \\(A=2a\\left|\\cos\\tfrac{\\Delta\\varphi}{2}\\right|\\), and it always lies between \\(|A_1-A_2|\\) and \\(A_1+A_2\\).',
        ),
    },
];

const wv1Examples: readonly WorkedExample[] = [
    {
        id: 'wv1-unequal',
        title: text('Valova z amplitudama \\(3\\) in \\(2\\) in razliko faz \\(90^\\circ\\)', 'Two waves with amplitudes \\(3\\) and \\(2\\) and a phase difference of \\(90^\\circ\\)'),
        calculationLatex: 'A=\\sqrt{3^2+2^2+2\\cdot3\\cdot2\\cdot\\cos 90^\\circ}=\\sqrt{13},\\qquad \\varphi=\\operatorname{atan2}(2\\sin 90^\\circ,\\ 3+2\\cos 90^\\circ)=\\operatorname{atan2}(2,\\,3)',
        resultLatex: 'A=3{,}606,\\qquad \\varphi=33{,}69^\\circ',
        check: text(
            'Odčitka grafa sta \\(3{,}606\\) in \\(33{,}69^\\circ\\). Pri \\(\\Delta\\varphi=60^\\circ\\) je \\(A=\\sqrt{9+4+12\\cdot\\tfrac12}=\\sqrt{19}\\), približno \\(4{,}359\\), in \\(\\varphi=\\operatorname{atan2}(\\sqrt3,\\,4)\\), približno \\(23{,}41^\\circ\\); tudi to graf odčita.',
            'The readouts of the graph are \\(3.606\\) and \\(33.69^\\circ\\). For \\(\\Delta\\varphi=60^\\circ\\) it is \\(A=\\sqrt{9+4+12\\cdot\\tfrac12}=\\sqrt{19}\\), approximately \\(4.359\\), and \\(\\varphi=\\operatorname{atan2}(\\sqrt3,\\,4)\\), approximately \\(23.41^\\circ\\); the graph reads these off as well.',
        ),
    },
];

const wv1Steps: readonly GuidedLessonStep[] = [
    step({
        id: 'wv1-one-wave', order: 1,
        title: text('En val in drugi val', 'One wave and a second one'),
        purpose: text('Napovedati vsoto dveh enakih valov, preden se drugi val prikaže.', 'Predicting the sum of two equal waves before the second wave appears.'),
        explanation: text(
            'Val je tu kosinusno nihanje \\(A\\cos(2\\pi ft+\\varphi)\\): amplituda \\(A\\) pove, kako visoko niha, frekvenca \\(f\\) v hercih, koliko nihajev opravi v sekundi, faza \\(\\varphi\\) pa, kdaj doseže vrh. Na grafu je prvi val z amplitudo \\(1\\) in frekvenco \\(3\\ \\mathrm{Hz}\\); drugi val ima zaenkrat amplitudo \\(0\\), torej ga ni, zato je vsota kar prvi val. Obema valoma je faza \\(0^\\circ\\). Napoved: kakšno vsoto dobimo, če drugemu valu nastavimo isto frekvenco in isto amplitudo, faza pa ostane \\(0^\\circ\\)? Kolikšna bo amplituda vsote in kakšne oblike bo?',
            'A wave here is a cosine oscillation \\(A\\cos(2\\pi ft+\\varphi)\\): the amplitude \\(A\\) says how high it swings, the frequency \\(f\\) in hertz how many oscillations it makes per second, and the phase \\(\\varphi\\) when it reaches its peak. The graph shows a first wave with amplitude \\(1\\) and frequency \\(3\\ \\mathrm{Hz}\\); the second wave has amplitude \\(0\\) for now, so it is absent and the sum is just the first wave. Both waves have phase \\(0^\\circ\\). Prediction: what sum do we get if the second wave gets the same frequency and the same amplitude, with the phase staying \\(0^\\circ\\)? How large will the amplitude of the sum be, and what shape?',
        ),
        formulaIds: [],
        observationPrompt: text('Zapiši napoved. Odčitek Amplituda vsote zaenkrat kaže \\(1\\).', 'Write down your prediction. The readout Sum amplitude shows \\(1\\) for now.'),
        expectedObservations: [text('Vsota je enaka prvemu valu: amplituda \\(1\\), vrednost ob času \\(0\\) je \\(1\\).', 'The sum equals the first wave: amplitude \\(1\\), the value at time \\(0\\) is \\(1\\).')],
        scene: wavesScene('wv1-one-wave-scene', {components: {a2: 0, p2: 0}, t: 0},
            'Seštevanje valov, \\(3\\ \\mathrm{Hz}\\): val 1 z amplitudo \\(1\\), val 2 z amplitudo \\(0\\); vsota je val 1, amplituda \\(1\\).',
            'Adding waves, \\(3\\ \\mathrm{Hz}\\): wave 1 with amplitude \\(1\\), wave 2 with amplitude \\(0\\); the sum is wave 1, amplitude \\(1\\).'),
    }),
    step({
        id: 'wv1-phase', order: 2,
        title: text('Premakni fazo drugega vala', 'Drag the phase of the second wave'),
        purpose: text('Videti, kako amplituda vsote sledi razliki faz.', 'Seeing how the amplitude of the sum follows the phase difference.'),
        explanation: text(
            'Drugi val ima zdaj enako amplitudo \\(1\\) in enako frekvenco, njegova faza je \\(60^\\circ\\). Vsota ima amplitudo približno \\(1{,}732\\) in fazo \\(30^\\circ\\): ni \\(2\\), ker vrhova nista hkrati. V polje Faza 2. vala v stopinjah vpiši \\(0\\), \\(60\\) in \\(120\\) in vsakič preberi Amplitudo vsote: \\(2\\), približno \\(1{,}732\\) in \\(1\\). Pri enakih amplitudah je \\(A=2\\left|\\cos\\tfrac{\\Delta\\varphi}{2}\\right|\\); to velja za vsako razliko faz, ne le za te tri vrednosti.',
            'The second wave now has the same amplitude \\(1\\) and the same frequency, its phase is \\(60^\\circ\\). The sum has amplitude approximately \\(1.732\\) and phase \\(30^\\circ\\): it is not \\(2\\), because the peaks do not coincide. Type \\(0\\), \\(60\\) and \\(120\\) into the field Phase of wave 2 in degrees and each time read the Sum amplitude: \\(2\\), approximately \\(1.732\\) and \\(1\\). For equal amplitudes \\(A=2\\left|\\cos\\tfrac{\\Delta\\varphi}{2}\\right|\\); this holds for every phase difference, not only for these three values.',
        ),
        formulaIds: ['same-frequency-sum'],
        observationPrompt: text('Vpiši faze \\(0\\), \\(60\\) in \\(120\\) in preberi Amplitudo vsote ter Fazo vsote.', 'Type the phases \\(0\\), \\(60\\) and \\(120\\) and read the Sum amplitude and the Sum phase.'),
        expectedObservations: [text(
            'Faza \\(0^\\circ\\): amplituda \\(2\\); \\(60^\\circ\\): približno \\(1{,}732\\) in faza vsote \\(30^\\circ\\); \\(120^\\circ\\): amplituda \\(1\\) in faza vsote \\(60^\\circ\\).',
            'Phase \\(0^\\circ\\): amplitude \\(2\\); \\(60^\\circ\\): approximately \\(1.732\\) and sum phase \\(30^\\circ\\); \\(120^\\circ\\): amplitude \\(1\\) and sum phase \\(60^\\circ\\).',
        )],
        scene: wavesScene('wv1-phase-scene', {components: {p2: 60}, t: 0},
            'Seštevanje valov, \\(3\\ \\mathrm{Hz}\\), razlika faz \\(60^\\circ\\): amplituda vsote približno \\(1{,}732\\), faza vsote \\(30^\\circ\\).',
            'Adding waves, \\(3\\ \\mathrm{Hz}\\), phase difference \\(60^\\circ\\): sum amplitude approximately \\(1.732\\), sum phase \\(30^\\circ\\).'),
    }),
    step({
        id: 'wv1-extremes', order: 3,
        title: text('V fazi in v nasprotni fazi', 'In phase and in opposite phase'),
        purpose: text('Spoznati skrajni vrednosti amplitude vsote.', 'Meeting the two extreme values of the amplitude of the sum.'),
        explanation: text(
            'Pri razliki faz \\(0^\\circ\\) se vrhova ujameta in se amplitudi seštejeta: \\(A=A_1+A_2=2\\). Pri \\(180^\\circ\\) je vrh enega vala natanko pri dolu drugega: ob vsakem času sta vrednosti nasprotni in se izničita. Na sliki je zdaj razlika faz \\(180^\\circ\\); odčitek piše, da se vala izničita, faza vsote pa je „ni določena“, ker vsota nima smeri nihanja. Izničenje je izrek za enaki amplitudi in razliko \\(180^\\circ\\), ne le slika: tedaj je \\(\\cos(\\omega t+\\varphi_1)+\\cos(\\omega t+\\varphi_1+180^\\circ)=0\\) pri vsakem \\(t\\). Če bi bili amplitudi različni, bi ostala amplituda \\(|A_1-A_2|\\).',
            'At a phase difference of \\(0^\\circ\\) the peaks coincide and the amplitudes add: \\(A=A_1+A_2=2\\). At \\(180^\\circ\\) the peak of one wave sits exactly at the trough of the other: at every time the two values are opposite and cancel. The picture now shows a phase difference of \\(180^\\circ\\); the readout says that the waves cancel, and the sum phase is “not defined” because the sum has no direction of oscillation. The cancellation is a theorem for equal amplitudes and a difference of \\(180^\\circ\\), not only a picture: then \\(\\cos(\\omega t+\\varphi_1)+\\cos(\\omega t+\\varphi_1+180^\\circ)=0\\) at every \\(t\\). With unequal amplitudes the amplitude \\(|A_1-A_2|\\) would remain.',
        ),
        formulaIds: ['same-frequency-sum'],
        observationPrompt: text('Preberi Amplitudo vsote pri \\(180^\\circ\\), nato vpiši \\(0\\) in jo preberi še enkrat.', 'Read the Sum amplitude at \\(180^\\circ\\), then type \\(0\\) and read it again.'),
        expectedObservations: [text(
            'Pri \\(180^\\circ\\): izničenje, vsota je \\(0\\), faza vsote ni določena. Pri \\(0^\\circ\\): amplituda \\(2\\).',
            'At \\(180^\\circ\\): cancellation, the sum is \\(0\\), the sum phase is not defined. At \\(0^\\circ\\): amplitude \\(2\\).',
        )],
        scene: wavesScene('wv1-extremes-scene', {components: {p2: 180}, t: 0},
            'Seštevanje valov, razlika faz \\(180^\\circ\\): vala se izničita, amplituda vsote \\(0\\), faza vsote ni določena.',
            'Adding waves, phase difference \\(180^\\circ\\): the waves cancel, sum amplitude \\(0\\), the sum phase is not defined.'),
    }),
    step({
        id: 'wv1-same-frequency', order: 4,
        title: text('Vsota je spet val iste frekvence', 'The sum is again a wave of the same frequency'),
        purpose: text('Razumeti, da je vsota dveh valov iste frekvence val z novo amplitudo in fazo.', 'Understanding that the sum of two waves of one frequency is a wave with a new amplitude and phase.'),
        explanation: text(
            'Vrni se k razliki faz \\(120^\\circ\\) pri enakih amplitudah \\(1\\). Debela krivulja vsote ima isto frekvenco \\(3\\ \\mathrm{Hz}\\) kakor oba vala, amplitudo \\(1\\) in fazo \\(60^\\circ\\), kar graf odčita. Ob času \\(0\\) je vrednost vsote \\(1+\\cos120^\\circ=1-0{,}5=0{,}5\\), in to je res \\(1\\cdot\\cos60^\\circ=0{,}5\\). Formula spodaj pove to za vsaka dva vala iste frekvence; pri različnih frekvencah ne velja, to je tema lekcije o utripanju.',
            'Return to a phase difference of \\(120^\\circ\\) with equal amplitudes \\(1\\). The thick sum curve has the same frequency \\(3\\ \\mathrm{Hz}\\) as both waves, amplitude \\(1\\) and phase \\(60^\\circ\\), which the graph reads off. At time \\(0\\) the value of the sum is \\(1+\\cos120^\\circ=1-0.5=0.5\\), and this is indeed \\(1\\cdot\\cos60^\\circ=0.5\\). The formula below says this for any two waves of one frequency; it does not hold for different frequencies, which is the topic of the lesson on beats.',
        ),
        formulaIds: ['same-frequency-sum'],
        observationPrompt: text('Preberi Amplitudo vsote, Fazo vsote in Vsoto ob času \\(0\\).', 'Read the Sum amplitude, the Sum phase and the Sum at time \\(0\\).'),
        expectedObservations: [text('Amplituda vsote \\(1\\), faza vsote \\(60^\\circ\\), vsota ob času \\(0\\) je \\(0{,}5\\); frekvenca ostane \\(3\\ \\mathrm{Hz}\\).', 'Sum amplitude \\(1\\), sum phase \\(60^\\circ\\), the sum at time \\(0\\) is \\(0.5\\); the frequency stays \\(3\\ \\mathrm{Hz}\\).')],
        scene: wavesScene('wv1-same-frequency-scene', {t: 0},
            'Seštevanje valov, \\(3\\ \\mathrm{Hz}\\), razlika faz \\(120^\\circ\\): amplituda vsote \\(1\\), faza vsote \\(60^\\circ\\), vsota ob času \\(0\\) je \\(0{,}5\\).',
            'Adding waves, \\(3\\ \\mathrm{Hz}\\), phase difference \\(120^\\circ\\): sum amplitude \\(1\\), sum phase \\(60^\\circ\\), the sum at time \\(0\\) is \\(0.5\\).'),
    }),
    step({
        id: 'wv1-arrows', order: 5,
        title: text('Vrteče se puščice', 'Rotating arrows'),
        purpose: text('Utemeljiti amplitudo in fazo vsote z vektorsko vsoto dveh kazalcev.', 'Justifying the amplitude and phase of the sum by the vector sum of two phasors.'),
        explanation: text(
            'Argument: val \\(A\\cos(2\\pi ft+\\varphi)\\) je višina puščice (kazalca) z dolžino \\(A\\), ki se z \\(f\\) obrati na sekundo vrti v nasprotni smeri urnega kazalca in je ob času \\(0\\) zasukana za kot \\(\\varphi\\). Kazalca obeh valov se vrtita z isto hitrostjo, zato se kot med njima ne spremeni. Višina vektorske vsote puščic je vsota višin, zato je vsota valov višina vsote puščic; dolžina vsote je amplituda, njen kot faza. Pri času \\(0{,}1\\ \\mathrm{s}\\) sta višini \\(-0{,}309\\) in \\(-0{,}669\\), njuna vsota je \\(-0{,}978\\) in to je višina tretje puščice. Dva kazalca dolžine \\(1\\) pod kotom \\(120^\\circ\\) dasta vsoto dolžine \\(2\\cos60^\\circ=1\\). Premakni drsnik časa ali pritisni Predvajaj: kot med kazalcema ostane \\(120^\\circ\\).',
            'Argument: a wave \\(A\\cos(2\\pi ft+\\varphi)\\) is the height of an arrow (phasor) of length \\(A\\) that turns counterclockwise by \\(f\\) revolutions per second and at time \\(0\\) is rotated by the angle \\(\\varphi\\). The phasors of both waves turn at the same rate, so the angle between them does not change. The height of the vector sum of the arrows is the sum of the heights, so the sum of the waves is the height of the summed arrow; its length is the amplitude, its angle the phase. At time \\(0.1\\ \\mathrm{s}\\) the heights are \\(-0.309\\) and \\(-0.669\\), their sum is \\(-0.978\\), and this is the height of the third arrow. Two phasors of length \\(1\\) at an angle of \\(120^\\circ\\) add up to a length of \\(2\\cos60^\\circ=1\\). Move the time slider or press Play: the angle between the phasors stays \\(120^\\circ\\).',
        ),
        formulaIds: [],
        observationPrompt: text('Preberi Val 1, Val 2 in Vsoto in preveri, da se vrednosti seštejejo; opazuj kot med kazalcema.', 'Read Wave 1, Wave 2 and the Sum and check that the values add; watch the angle between the phasors.'),
        expectedObservations: [text('Pri \\(0{,}1\\ \\mathrm{s}\\): val 1 \\(-0{,}309\\), val 2 \\(-0{,}669\\), vsota \\(-0{,}978\\); amplituda vsote ostane \\(1\\).', 'At \\(0.1\\ \\mathrm{s}\\): wave 1 \\(-0.309\\), wave 2 \\(-0.669\\), sum \\(-0.978\\); the sum amplitude stays \\(1\\).')],
        scene: wavesScene('wv1-arrows-scene', {t: 0.1},
            'Seštevanje valov s kazalci, čas \\(0{,}1\\ \\mathrm{s}\\): val 1 \\(-0{,}309\\), val 2 \\(-0{,}669\\), vsota \\(-0{,}978\\).',
            'Adding waves with phasors, time \\(0.1\\ \\mathrm{s}\\): wave 1 \\(-0.309\\), wave 2 \\(-0.669\\), sum \\(-0.978\\).'),
    }),
    step({
        id: 'wv1-amplitudes', order: 6,
        title: text('Različni amplitudi', 'Different amplitudes'),
        purpose: text('Uporabiti obrazec za amplitudi \\(3\\) in \\(2\\) in ugotoviti, med katerima vrednostma leži amplituda vsote.', 'Applying the formula for amplitudes \\(3\\) and \\(2\\) and finding between which values the amplitude of the sum lies.'),
        explanation: text(
            'Amplitudi sta zdaj \\(3\\) in \\(2\\), razlika faz je \\(90^\\circ\\). Amplituda vsote je \\(\\sqrt{13}\\), približno \\(3{,}606\\), faza vsote pa \\(33{,}69^\\circ\\) (izračun spodaj). Pri \\(60^\\circ\\) je amplituda približno \\(4{,}359\\) in faza \\(23{,}41^\\circ\\). Odčitek Možna amplituda vsote piše od \\(1\\) do \\(5\\), to je \\(|A_1-A_2|\\) do \\(A_1+A_2\\). Vpiši fazo drugega vala \\(0\\) in \\(180\\): amplituda je \\(5\\), nato \\(1\\); amplituda vsote ne pade na \\(0\\), ker se amplitudi ne uničita.',
            'The amplitudes are now \\(3\\) and \\(2\\), the phase difference is \\(90^\\circ\\). The amplitude of the sum is \\(\\sqrt{13}\\), approximately \\(3.606\\), and the sum phase is \\(33.69^\\circ\\) (calculation below). At \\(60^\\circ\\) the amplitude is approximately \\(4.359\\) and the phase \\(23.41^\\circ\\). The readout Possible sum amplitude says from \\(1\\) to \\(5\\), that is \\(|A_1-A_2|\\) to \\(A_1+A_2\\). Type the phases \\(0\\) and \\(180\\) for the second wave: the amplitude is \\(5\\), then \\(1\\); the amplitude of the sum does not fall to \\(0\\), because the amplitudes do not annihilate each other.',
        ),
        formulaIds: ['same-frequency-sum'],
        workedExampleId: 'wv1-unequal',
        observationPrompt: text('Preberi Amplitudo in Fazo vsote; vpiši fazo \\(60\\), \\(0\\) in \\(180\\) za drugi val.', 'Read the Sum amplitude and phase; type the phase \\(60\\), \\(0\\) and \\(180\\) for the second wave.'),
        expectedObservations: [text(
            'Pri \\(90^\\circ\\): \\(3{,}606\\) in \\(33{,}69^\\circ\\); pri \\(60^\\circ\\): \\(4{,}359\\) in \\(23{,}41^\\circ\\); pri \\(0^\\circ\\): \\(5\\); pri \\(180^\\circ\\): \\(1\\); možna amplituda od \\(1\\) do \\(5\\).',
            'At \\(90^\\circ\\): \\(3.606\\) and \\(33.69^\\circ\\); at \\(60^\\circ\\): \\(4.359\\) and \\(23.41^\\circ\\); at \\(0^\\circ\\): \\(5\\); at \\(180^\\circ\\): \\(1\\); possible amplitude from \\(1\\) to \\(5\\).',
        )],
        scene: wavesScene('wv1-amplitudes-scene', {components: WV1_UNEQUAL, t: 0},
            'Seštevanje valov, amplitudi \\(3\\) in \\(2\\), razlika faz \\(90^\\circ\\): amplituda vsote \\(3{,}606\\), faza vsote \\(33{,}69^\\circ\\), možna amplituda od \\(1\\) do \\(5\\).',
            'Adding waves, amplitudes \\(3\\) and \\(2\\), phase difference \\(90^\\circ\\): sum amplitude \\(3.606\\), sum phase \\(33.69^\\circ\\), possible amplitude from \\(1\\) to \\(5\\).'),
    }),
    step({
        id: 'wv1-explore', order: 7,
        title: text('Prosto raziskovanje', 'Free exploration'),
        purpose: text('Preveriti, da frekvenca ne spremeni amplitude in faze vsote.', 'Checking that the frequency changes neither the amplitude nor the phase of the sum.'),
        explanation: text(
            'Frekvenca obeh valov je zdaj \\(5\\ \\mathrm{Hz}\\), razlika faz spet \\(120^\\circ\\) in amplitudi \\(1\\). Amplituda vsote je še vedno \\(1\\) in faza \\(60^\\circ\\): izraza za \\(A\\) in \\(\\varphi\\) ne vsebujeta \\(f\\), zato je ta vedno skupna frekvenca obeh valov. Spreminjaj amplitudi, fazi in frekvenco, vklopi in izklopi kazalce ter ugotovi, kdaj je amplituda vsote največja in kdaj najmanjša. Ko dobita valova različni frekvenci, vsota ni več en val s stalno amplitudo; to pokaže lekcija Utripanje.',
            'The frequency of both waves is now \\(5\\ \\mathrm{Hz}\\), the phase difference is again \\(120^\\circ\\) and the amplitudes are \\(1\\). The amplitude of the sum is still \\(1\\) and the phase \\(60^\\circ\\): the expressions for \\(A\\) and \\(\\varphi\\) do not contain \\(f\\), so the sum always has the common frequency of the two waves. Change the amplitudes, phases and the frequency, switch the phasors on and off, and find when the amplitude of the sum is largest and smallest. When the waves get different frequencies, the sum is no longer one wave with a constant amplitude; the lesson Beats shows this.',
        ),
        formulaIds: [],
        observationPrompt: text('Poišči razliko faz, pri kateri je amplituda vsote največja, in tisto, pri kateri je najmanjša.', 'Find the phase difference at which the amplitude of the sum is largest, and the one at which it is smallest.'),
        expectedObservations: [text('Pri \\(5\\ \\mathrm{Hz}\\) in razliki faz \\(120^\\circ\\) je amplituda vsote \\(1\\), faza vsote \\(60^\\circ\\), kakor pri \\(3\\ \\mathrm{Hz}\\).', 'At \\(5\\ \\mathrm{Hz}\\) and a phase difference of \\(120^\\circ\\) the sum amplitude is \\(1\\), the sum phase \\(60^\\circ\\), as at \\(3\\ \\mathrm{Hz}\\).')],
        scene: wavesScene('wv1-explore-scene', {components: {f1: 5}, t: 0},
            'Seštevanje valov, \\(5\\ \\mathrm{Hz}\\), razlika faz \\(120^\\circ\\): amplituda vsote \\(1\\), faza vsote \\(60^\\circ\\).',
            'Adding waves, \\(5\\ \\mathrm{Hz}\\), phase difference \\(120^\\circ\\): sum amplitude \\(1\\), sum phase \\(60^\\circ\\).'),
    }),
];

// ---- WV2 -------------------------------------------------------------------------------------------------------------------------

const wv2Formulas: readonly FormulaBlock[] = [
    {
        id: 'beat-identity',
        latex: 'A\\cos(2\\pi f_1t)+A\\cos(2\\pi f_2t)=2A\\cos(\\pi\\,\\Delta f\\,t)\\,\\cos\\bigl(\\pi(f_1+f_2)\\,t\\bigr),\\qquad \\Delta f=|f_1-f_2|',
        notation: text(
            '\\(A\\) je skupna amplituda obeh valov, \\(f_1\\) in \\(f_2\\) sta frekvenci v hercih, \\(\\Delta f=|f_1-f_2|\\) je razlika frekvenc in \\(t\\) čas v sekundah.',
            '\\(A\\) is the common amplitude of both waves, \\(f_1\\) and \\(f_2\\) are the frequencies in hertz, \\(\\Delta f=|f_1-f_2|\\) is the frequency difference and \\(t\\) is the time in seconds.',
        ),
        explanation: text(
            'To je obrazec \\(\\cos a+\\cos b=2\\cos\\tfrac{a-b}{2}\\cos\\tfrac{a+b}{2}\\) za \\(a=2\\pi f_1t\\) in \\(b=2\\pi f_2t\\); velja za vsak \\(t\\) in vsaki frekvenci. Drugi faktor niha s povprečno frekvenco \\(\\tfrac{f_1+f_2}{2}\\). Ovojnica \\(2A\\left|\\cos(\\pi\\,\\Delta f\\,t)\\right|\\) ima periodo \\(\\tfrac{1}{\\Delta f}\\), torej frekvenco \\(\\Delta f\\), to je frekvenca utripanja. Faktor \\(\\cos(\\pi\\,\\Delta f\\,t)\\) brez absolutne vrednosti ima frekvenco samo \\(\\tfrac{\\Delta f}{2}\\) in pri vsakem vozlu ovojnice zamenja predznak (skok faze za \\(\\pi\\)); vsota je en sam val povprečne frekvence le znotraj ene izbokline.',
            'This is the identity \\(\\cos a+\\cos b=2\\cos\\tfrac{a-b}{2}\\cos\\tfrac{a+b}{2}\\) for \\(a=2\\pi f_1t\\) and \\(b=2\\pi f_2t\\); it holds for every \\(t\\) and any two frequencies. The second factor oscillates at the mean frequency \\(\\tfrac{f_1+f_2}{2}\\). The envelope \\(2A\\left|\\cos(\\pi\\,\\Delta f\\,t)\\right|\\) has period \\(\\tfrac{1}{\\Delta f}\\), so frequency \\(\\Delta f\\), the beat frequency. The factor \\(\\cos(\\pi\\,\\Delta f\\,t)\\) without the absolute value has frequency only \\(\\tfrac{\\Delta f}{2}\\) and changes sign at every node of the envelope (a phase jump of \\(\\pi\\)); the sum is a single wave of the mean frequency only within one lobe.',
        ),
    },
];

const wv2Examples: readonly WorkedExample[] = [
    {
        id: 'wv2-identity-check',
        title: text('Obrazec pri \\(f_1=10\\ \\mathrm{Hz}\\), \\(f_2=12\\ \\mathrm{Hz}\\) in \\(t=0{,}1\\ \\mathrm{s}\\)', 'The identity at \\(f_1=10\\ \\mathrm{Hz}\\), \\(f_2=12\\ \\mathrm{Hz}\\) and \\(t=0.1\\ \\mathrm{s}\\)'),
        calculationLatex: '\\cos(2\\pi\\cdot10\\cdot0{,}1)+\\cos(2\\pi\\cdot12\\cdot0{,}1)=1+0{,}3090,\\qquad 2\\cos(0{,}2\\pi)\\cos(2{,}2\\pi)=2\\cdot0{,}8090\\cdot0{,}8090',
        resultLatex: '1+0{,}3090=1{,}309,\\qquad 2|\\cos(0{,}2\\pi)|=1{,}618',
        check: text(
            'Graf odčita vsoto \\(1{,}309\\) in ovojnico \\(1{,}618\\). Leva in desna stran sta enaki na vsa mesta, ker je \\(\\cos(2{,}2\\pi)=\\cos(0{,}2\\pi)\\).',
            'The graph reads the sum \\(1.309\\) and the envelope \\(1.618\\). The left and right sides agree to all places, because \\(\\cos(2.2\\pi)=\\cos(0.2\\pi)\\).',
        ),
    },
];

const wv2Steps: readonly GuidedLessonStep[] = [
    step({
        id: 'wv2-close', order: 1,
        title: text('Dva blizu si valova', 'Two waves close in frequency'),
        purpose: text('Napovedati, kakšna je vsota dveh valov z blizu si frekvencama.', 'Predicting the sum of two waves with nearby frequencies.'),
        explanation: text(
            'Vrsta valovanja je zdaj Utripanje. Dva vala z amplitudo \\(1\\) imata frekvenci \\(10\\ \\mathrm{Hz}\\) in \\(12\\ \\mathrm{Hz}\\); okno obsega \\(2\\ \\mathrm{s}\\), ovojnica je še skrita. Ob času \\(0\\) sta oba vala na vrhu, vsota je \\(2\\). Napoved: ali bo vsota imela povsod isto amplitudo? Kolikokrat v sekundi doseže največ, ko se frekvenci razlikujeta za \\(2\\ \\mathrm{Hz}\\)? Odčitki že kažejo odgovor; najprej zapiši napoved.',
            'The kind of waves is now Beats. Two waves of amplitude \\(1\\) have the frequencies \\(10\\ \\mathrm{Hz}\\) and \\(12\\ \\mathrm{Hz}\\); the window is \\(2\\ \\mathrm{s}\\) long and the envelope is still hidden. At time \\(0\\) both waves are at their peak and the sum is \\(2\\). Prediction: will the sum have the same amplitude everywhere? How many times per second does it reach its maximum when the frequencies differ by \\(2\\ \\mathrm{Hz}\\)? The readouts already show the answer; write down the prediction first.',
        ),
        formulaIds: [],
        observationPrompt: text('Zapiši napoved, nato preberi Vsoto ob času \\(0\\).', 'Write down the prediction, then read the Sum at time \\(0\\).'),
        expectedObservations: [text('Ob času \\(0\\) je vsota \\(2\\); frekvenci sta \\(10\\ \\mathrm{Hz}\\) in \\(12\\ \\mathrm{Hz}\\).', 'At time \\(0\\) the sum is \\(2\\); the frequencies are \\(10\\ \\mathrm{Hz}\\) and \\(12\\ \\mathrm{Hz}\\).')],
        scene: wavesScene('wv2-close-scene', {mode: 'beats', components: WV2_BEATS, t: 0},
            'Utripanje, \\(10\\ \\mathrm{Hz}\\) in \\(12\\ \\mathrm{Hz}\\), amplituda \\(1\\), ovojnica skrita, čas \\(0\\): vsota \\(2\\).',
            'Beats, \\(10\\ \\mathrm{Hz}\\) and \\(12\\ \\mathrm{Hz}\\), amplitude \\(1\\), envelope hidden, time \\(0\\): sum \\(2\\).'),
    }),
    step({
        id: 'wv2-swell', order: 2,
        title: text('Vsota nabrekne in zamre', 'The sum swells and fades'),
        purpose: text('Videti, da amplituda vsote niha, in razložiti, zakaj.', 'Seeing that the amplitude of the sum oscillates, and explaining why.'),
        explanation: text(
            'Premakni drsnik časa od \\(0\\) do \\(2\\ \\mathrm{s}\\) ali pritisni Predvajaj. Vsota nabrekne, zamre in znova nabrekne. Razlog: val z \\(12\\ \\mathrm{Hz}\\) naredi na sekundo za \\(2\\) nihaja več kakor val z \\(10\\ \\mathrm{Hz}\\), torej ju vsakih \\(0{,}5\\ \\mathrm{s}\\) spet uskladi, pol tega časa, ob \\(0{,}25\\ \\mathrm{s}\\), pa je drugi val za pol nihaja pred prvim in sta vala nasprotna. Zato je vsota ob \\(0{,}25\\ \\mathrm{s}\\) enaka \\(0\\), ob \\(0{,}5\\ \\mathrm{s}\\) pa spet \\(2\\). Na sliki je čas \\(0{,}25\\ \\mathrm{s}\\).',
            'Move the time slider from \\(0\\) to \\(2\\ \\mathrm{s}\\) or press Play. The sum swells, fades and swells again. The reason: the wave of \\(12\\ \\mathrm{Hz}\\) makes \\(2\\) more oscillations per second than the wave of \\(10\\ \\mathrm{Hz}\\), so every \\(0.5\\ \\mathrm{s}\\) they are in step again, and half of that time, at \\(0.25\\ \\mathrm{s}\\), the second wave is half an oscillation ahead of the first and the waves are opposite. So the sum is \\(0\\) at \\(0.25\\ \\mathrm{s}\\) and \\(2\\) again at \\(0.5\\ \\mathrm{s}\\). The picture is at time \\(0.25\\ \\mathrm{s}\\).',
        ),
        formulaIds: [],
        observationPrompt: text('Premakni drsnik in opazuj, kje je vsota največja in kje \\(0\\); preberi Vsoto ob \\(0{,}25\\ \\mathrm{s}\\) in ob \\(0{,}5\\ \\mathrm{s}\\).', 'Move the slider and watch where the sum is largest and where it is \\(0\\); read the Sum at \\(0.25\\ \\mathrm{s}\\) and at \\(0.5\\ \\mathrm{s}\\).'),
        expectedObservations: [text('Vsota je \\(0\\) ob \\(0{,}25\\ \\mathrm{s}\\) in \\(2\\) ob \\(0\\) in ob \\(0{,}5\\ \\mathrm{s}\\).', 'The sum is \\(0\\) at \\(0.25\\ \\mathrm{s}\\) and \\(2\\) at \\(0\\) and at \\(0.5\\ \\mathrm{s}\\).')],
        scene: wavesScene('wv2-swell-scene', {mode: 'beats', components: WV2_BEATS, t: 0.25},
            'Utripanje, \\(10\\ \\mathrm{Hz}\\) in \\(12\\ \\mathrm{Hz}\\), čas \\(0{,}25\\ \\mathrm{s}\\): vsota je \\(0\\).',
            'Beats, \\(10\\ \\mathrm{Hz}\\) and \\(12\\ \\mathrm{Hz}\\), time \\(0.25\\ \\mathrm{s}\\): the sum is \\(0\\).'),
    }),
    step({
        id: 'wv2-envelope', order: 3,
        title: text('Pokaži ovojnico', 'Show the envelope'),
        purpose: text('Povezati izbokline vsote z ovojnico, ki jo graf izračuna iz obrazca.', 'Connecting the lobes of the sum to the envelope that the graph computes from the formula.'),
        explanation: text(
            'Ovojnica je krivulja, ki objame izbokline vsote od zunaj; graf jo izračuna iz obrazca \\(2A\\left|\\cos(\\pi\\,\\Delta f\\,t)\\right|\\), ne prilagodi je vsoti. Pri naših frekvencah je ovojnica \\(2\\left|\\cos(2\\pi t)\\right|\\), največ \\(2\\) in najmanj \\(0\\). Odčitek Ovojnica je ob času \\(0{,}25\\ \\mathrm{s}\\) enak \\(0\\), ob \\(0\\) in ob \\(0{,}5\\ \\mathrm{s}\\) pa \\(2\\): ponovi se vsakih \\(0{,}5\\ \\mathrm{s}\\), to je perioda utripanja. Znotraj izbokline niha vsota hitreje, približno \\(11\\ \\mathrm{Hz}\\), ovojnica pa počasneje.',
            'The envelope is the curve that wraps the lobes of the sum from outside; the graph computes it from the formula \\(2A\\left|\\cos(\\pi\\,\\Delta f\\,t)\\right|\\), it is not fitted to the sum. For our frequencies the envelope is \\(2\\left|\\cos(2\\pi t)\\right|\\), at most \\(2\\) and at least \\(0\\). The readout Envelope equals \\(0\\) at time \\(0.25\\ \\mathrm{s}\\) and \\(2\\) at \\(0\\) and at \\(0.5\\ \\mathrm{s}\\): it repeats every \\(0.5\\ \\mathrm{s}\\), which is the beat period. Inside a lobe the sum oscillates faster, about \\(11\\ \\mathrm{Hz}\\), and the envelope more slowly.',
        ),
        formulaIds: ['beat-identity'],
        observationPrompt: text('Preberi Ovojnico ob \\(0{,}25\\ \\mathrm{s}\\), nato premakni drsnik na \\(0\\) in na \\(0{,}5\\ \\mathrm{s}\\).', 'Read the Envelope at \\(0.25\\ \\mathrm{s}\\), then move the slider to \\(0\\) and to \\(0.5\\ \\mathrm{s}\\).'),
        expectedObservations: [text('Ovojnica je \\(0\\) ob \\(0{,}25\\ \\mathrm{s}\\) in \\(2\\) ob \\(0\\) ter \\(0{,}5\\ \\mathrm{s}\\); perioda utripanja \\(0{,}5\\ \\mathrm{s}\\).', 'The envelope is \\(0\\) at \\(0.25\\ \\mathrm{s}\\) and \\(2\\) at \\(0\\) and \\(0.5\\ \\mathrm{s}\\); the beat period is \\(0.5\\ \\mathrm{s}\\).')],
        scene: wavesScene('wv2-envelope-scene', {mode: 'beats', components: WV2_ENVELOPE, t: 0.25},
            'Utripanje, \\(10\\ \\mathrm{Hz}\\) in \\(12\\ \\mathrm{Hz}\\), ovojnica prikazana, čas \\(0{,}25\\ \\mathrm{s}\\): ovojnica \\(0\\), perioda utripanja \\(0{,}5\\ \\mathrm{s}\\).',
            'Beats, \\(10\\ \\mathrm{Hz}\\) and \\(12\\ \\mathrm{Hz}\\), envelope shown, time \\(0.25\\ \\mathrm{s}\\): envelope \\(0\\), beat period \\(0.5\\ \\mathrm{s}\\).'),
    }),
    step({
        id: 'wv2-difference', order: 4,
        title: text('Spremeni drugo frekvenco', 'Change the second frequency'),
        purpose: text('Odčitati, kako frekvenca utripanja sledi razliki frekvenc.', 'Reading how the beat frequency follows the frequency difference.'),
        explanation: text(
            'Drugi val ima zdaj \\(13\\ \\mathrm{Hz}\\), prvi ostane pri \\(10\\ \\mathrm{Hz}\\). Frekvenca utripanja je \\(|f_1-f_2|=3\\ \\mathrm{Hz}\\), povprečna frekvenca \\(\\tfrac{f_1+f_2}{2}=11{,}5\\ \\mathrm{Hz}\\) in perioda utripanja \\(\\tfrac13\\ \\mathrm{s}\\), približno \\(0{,}333\\ \\mathrm{s}\\). V polje Frekvenca 2. vala v Hz vpiši \\(14\\): frekvenca utripanja \\(4\\ \\mathrm{Hz}\\), povprečna \\(12\\ \\mathrm{Hz}\\), perioda \\(0{,}25\\ \\mathrm{s}\\). Večja razlika frekvenc pomeni pogostejše utripanje; povprečna frekvenca je sredina obeh frekvenc.',
            'The second wave now has \\(13\\ \\mathrm{Hz}\\), the first stays at \\(10\\ \\mathrm{Hz}\\). The beat frequency is \\(|f_1-f_2|=3\\ \\mathrm{Hz}\\), the mean frequency \\(\\tfrac{f_1+f_2}{2}=11.5\\ \\mathrm{Hz}\\) and the beat period \\(\\tfrac13\\ \\mathrm{s}\\), approximately \\(0.333\\ \\mathrm{s}\\). Type \\(14\\) into the field Frequency of wave 2 in Hz: beat frequency \\(4\\ \\mathrm{Hz}\\), mean \\(12\\ \\mathrm{Hz}\\), period \\(0.25\\ \\mathrm{s}\\). A larger frequency difference means more frequent beats; the mean frequency is the middle of the two frequencies.',
        ),
        formulaIds: ['beat-identity'],
        observationPrompt: text('Preberi Frekvenco utripanja, Povprečno frekvenco in Periodo utripanja pri \\(13\\ \\mathrm{Hz}\\) in pri \\(14\\ \\mathrm{Hz}\\).', 'Read the Beat frequency, the Mean frequency and the Beat period at \\(13\\ \\mathrm{Hz}\\) and at \\(14\\ \\mathrm{Hz}\\).'),
        expectedObservations: [text(
            'Pri \\(13\\ \\mathrm{Hz}\\): \\(3\\ \\mathrm{Hz}\\), \\(11{,}5\\ \\mathrm{Hz}\\), \\(0{,}333\\ \\mathrm{s}\\); pri \\(14\\ \\mathrm{Hz}\\): \\(4\\ \\mathrm{Hz}\\), \\(12\\ \\mathrm{Hz}\\), \\(0{,}25\\ \\mathrm{s}\\).',
            'At \\(13\\ \\mathrm{Hz}\\): \\(3\\ \\mathrm{Hz}\\), \\(11.5\\ \\mathrm{Hz}\\), \\(0.333\\ \\mathrm{s}\\); at \\(14\\ \\mathrm{Hz}\\): \\(4\\ \\mathrm{Hz}\\), \\(12\\ \\mathrm{Hz}\\), \\(0.25\\ \\mathrm{s}\\).',
        )],
        scene: wavesScene('wv2-difference-scene', {mode: 'beats', components: {f1: 10, f2: 13}, t: 0},
            'Utripanje, \\(10\\ \\mathrm{Hz}\\) in \\(13\\ \\mathrm{Hz}\\): frekvenca utripanja \\(3\\ \\mathrm{Hz}\\), povprečna frekvenca \\(11{,}5\\ \\mathrm{Hz}\\), perioda utripanja približno \\(0{,}333\\ \\mathrm{s}\\).',
            'Beats, \\(10\\ \\mathrm{Hz}\\) and \\(13\\ \\mathrm{Hz}\\): beat frequency \\(3\\ \\mathrm{Hz}\\), mean frequency \\(11.5\\ \\mathrm{Hz}\\), beat period approximately \\(0.333\\ \\mathrm{s}\\).'),
    }),
    step({
        id: 'wv2-predict', order: 5,
        title: text('Napovej periodo utripanja', 'Predict the beat period'),
        purpose: text('Uporabiti pravilo za novo dvojico frekvenc, preden jo preberemo.', 'Applying the rule to a new pair of frequencies before reading it.'),
        explanation: text(
            'Napoved: prvi val ima \\(10\\ \\mathrm{Hz}\\), drugi \\(11\\ \\mathrm{Hz}\\). Kolikšna je razlika frekvenc in kolikšna je perioda utripanja \\(\\tfrac{1}{\\Delta f}\\)? Nato preberi odčitke: frekvenca utripanja \\(1\\ \\mathrm{Hz}\\), povprečna \\(10{,}5\\ \\mathrm{Hz}\\), perioda \\(1\\ \\mathrm{s}\\), zato okno \\(2\\ \\mathrm{s}\\) vsebuje dve utripanji. Ovojnica je ob \\(0{,}5\\ \\mathrm{s}\\) enaka \\(0\\), ob \\(1\\ \\mathrm{s}\\) pa \\(2\\); na sliki je čas \\(0{,}5\\ \\mathrm{s}\\).',
            'Prediction: the first wave has \\(10\\ \\mathrm{Hz}\\), the second \\(11\\ \\mathrm{Hz}\\). What is the frequency difference and what is the beat period \\(\\tfrac{1}{\\Delta f}\\)? Then read the readouts: beat frequency \\(1\\ \\mathrm{Hz}\\), mean \\(10.5\\ \\mathrm{Hz}\\), period \\(1\\ \\mathrm{s}\\), so the window of \\(2\\ \\mathrm{s}\\) holds two beats. The envelope is \\(0\\) at \\(0.5\\ \\mathrm{s}\\) and \\(2\\) at \\(1\\ \\mathrm{s}\\); the picture is at time \\(0.5\\ \\mathrm{s}\\).',
        ),
        formulaIds: [],
        observationPrompt: text('Zapiši napoved, nato preberi Periodo utripanja in Ovojnico ob \\(0{,}5\\ \\mathrm{s}\\) in ob \\(1\\ \\mathrm{s}\\).', 'Write down the prediction, then read the Beat period and the Envelope at \\(0.5\\ \\mathrm{s}\\) and at \\(1\\ \\mathrm{s}\\).'),
        expectedObservations: [text('Frekvenca utripanja \\(1\\ \\mathrm{Hz}\\), perioda \\(1\\ \\mathrm{s}\\), ovojnica \\(0\\) ob \\(0{,}5\\ \\mathrm{s}\\) in \\(2\\) ob \\(1\\ \\mathrm{s}\\).', 'Beat frequency \\(1\\ \\mathrm{Hz}\\), period \\(1\\ \\mathrm{s}\\), envelope \\(0\\) at \\(0.5\\ \\mathrm{s}\\) and \\(2\\) at \\(1\\ \\mathrm{s}\\).')],
        scene: wavesScene('wv2-predict-scene', {mode: 'beats', components: {f1: 10, f2: 11}, t: 0.5},
            'Utripanje, \\(10\\ \\mathrm{Hz}\\) in \\(11\\ \\mathrm{Hz}\\), čas \\(0{,}5\\ \\mathrm{s}\\): frekvenca utripanja \\(1\\ \\mathrm{Hz}\\), perioda \\(1\\ \\mathrm{s}\\), ovojnica \\(0\\).',
            'Beats, \\(10\\ \\mathrm{Hz}\\) and \\(11\\ \\mathrm{Hz}\\), time \\(0.5\\ \\mathrm{s}\\): beat frequency \\(1\\ \\mathrm{Hz}\\), period \\(1\\ \\mathrm{s}\\), envelope \\(0\\).'),
    }),
    step({
        id: 'wv2-identity', order: 6,
        title: text('Obrazec za vsoto kosinusov', 'The identity for a sum of cosines'),
        purpose: text('Utemeljiti ovojnico in povprečno frekvenco z obrazcem, ki velja za vsak čas.', 'Justifying the envelope and the mean frequency by an identity that holds for every time.'),
        explanation: text(
            'Argument: obrazec \\(\\cos a+\\cos b=2\\cos\\tfrac{a-b}{2}\\cos\\tfrac{a+b}{2}\\) je točen, zato je vsota dveh valov enake amplitude produkt počasnega in hitrega faktorja; to ni slika, ampak enakost. Ob času \\(0{,}1\\ \\mathrm{s}\\) za \\(10\\ \\mathrm{Hz}\\) in \\(12\\ \\mathrm{Hz}\\) sta obe strani enaki \\(1{,}309\\), ovojnica je tedaj \\(1{,}618\\) (izračun spodaj). Ta slika je zgolj ponazoritev za izbrani frekvenci; enakost velja za vsak par. Ovojnica in utripanje imata frekvenco \\(\\Delta f\\), faktor \\(\\cos(\\pi\\,\\Delta f\\,t)\\) pa le \\(\\tfrac{\\Delta f}{2}\\), ob vozlu ovojnice se mu spremeni predznak.',
            'Argument: the identity \\(\\cos a+\\cos b=2\\cos\\tfrac{a-b}{2}\\cos\\tfrac{a+b}{2}\\) is exact, so the sum of two waves of equal amplitude is a product of a slow and a fast factor; this is not a picture but an equality. At time \\(0.1\\ \\mathrm{s}\\) for \\(10\\ \\mathrm{Hz}\\) and \\(12\\ \\mathrm{Hz}\\) both sides equal \\(1.309\\), and the envelope is then \\(1.618\\) (calculation below). This picture illustrates only the chosen frequencies; the equality holds for every pair. The envelope and the beat have frequency \\(\\Delta f\\), but the factor \\(\\cos(\\pi\\,\\Delta f\\,t)\\) only \\(\\tfrac{\\Delta f}{2}\\), and it changes sign at a node of the envelope.',
        ),
        formulaIds: ['beat-identity'],
        workedExampleId: 'wv2-identity-check',
        observationPrompt: text('Preberi Vsoto in Ovojnico ob \\(0{,}1\\ \\mathrm{s}\\) in ju primerjaj z izračunom.', 'Read the Sum and the Envelope at \\(0.1\\ \\mathrm{s}\\) and compare them with the calculation.'),
        expectedObservations: [text('Vsota \\(1{,}309\\), ovojnica \\(1{,}618\\), kakor v izračunu.', 'Sum \\(1.309\\), envelope \\(1.618\\), as in the calculation.')],
        scene: wavesScene('wv2-identity-scene', {mode: 'beats', components: WV2_ENVELOPE, t: 0.1},
            'Utripanje, \\(10\\ \\mathrm{Hz}\\) in \\(12\\ \\mathrm{Hz}\\), čas \\(0{,}1\\ \\mathrm{s}\\): vsota \\(1{,}309\\), ovojnica \\(1{,}618\\).',
            'Beats, \\(10\\ \\mathrm{Hz}\\) and \\(12\\ \\mathrm{Hz}\\), time \\(0.1\\ \\mathrm{s}\\): sum \\(1.309\\), envelope \\(1.618\\).'),
    }),
    step({
        id: 'wv2-explore', order: 7,
        title: text('Prosto raziskovanje', 'Free exploration'),
        purpose: text('Preizkusiti pravilo na svojih frekvencah in ugotoviti, kdaj utripanja ni.', 'Trying the rule on your own frequencies and finding when there are no beats.'),
        explanation: text(
            'Spreminjaj frekvenci in amplitudo vsakega vala, vklopi in izklopi ovojnico in drsnik časa premakni po vsem oknu. Napovej frekvenco in periodo utripanja, preden ju prebereš. Če sta frekvenci enaki, utripanja ni: odčitek piše, da ga ni, vsota pa ima stalno amplitudo \\(2A\\). Frekvenci sta v modelu celi števili do \\(40\\ \\mathrm{Hz}\\), zato je razlika vedno cela in perioda je \\(\\tfrac{1}{\\Delta f}\\).',
            'Change the frequencies and the amplitude of each wave, switch the envelope on and off, and move the time slider through the whole window. Predict the beat frequency and period before reading them. If the frequencies are equal there are no beats: the readout says so and the sum has the constant amplitude \\(2A\\). The model\'s frequencies are whole numbers up to \\(40\\ \\mathrm{Hz}\\), so the difference is always a whole number and the period is \\(\\tfrac{1}{\\Delta f}\\).',
        ),
        formulaIds: [],
        observationPrompt: text('Poišči par frekvenc z utripanjem pogosteje kot \\(5\\)-krat na sekundo in par brez utripanja.', 'Find a pair of frequencies with beats more often than \\(5\\) times per second and a pair with no beats.'),
        expectedObservations: [text('Primer: pri \\(10\\ \\mathrm{Hz}\\) in \\(16\\ \\mathrm{Hz}\\) je frekvenca utripanja \\(6\\ \\mathrm{Hz}\\), torej pogosteje kot \\(5\\)-krat na sekundo, povprečna \\(13\\ \\mathrm{Hz}\\), perioda \\(0{,}167\\ \\mathrm{s}\\). Par brez utripanja: enaki frekvenci, odčitek piše, da utripanja ni.', 'Example: at \\(10\\ \\mathrm{Hz}\\) and \\(16\\ \\mathrm{Hz}\\) the beat frequency is \\(6\\ \\mathrm{Hz}\\), so more often than \\(5\\) times per second, the mean \\(13\\ \\mathrm{Hz}\\), the period \\(0.167\\ \\mathrm{s}\\). A pair with no beats: equal frequencies, the readout says there are no beats.')],
        scene: wavesScene('wv2-explore-scene', {mode: 'beats', components: {f1: 10, f2: 16, showEnvelope: true}, t: 0},
            'Utripanje, \\(10\\ \\mathrm{Hz}\\) in \\(16\\ \\mathrm{Hz}\\), ovojnica prikazana: frekvenca utripanja \\(6\\ \\mathrm{Hz}\\), povprečna \\(13\\ \\mathrm{Hz}\\), perioda \\(0{,}167\\ \\mathrm{s}\\).',
            'Beats, \\(10\\ \\mathrm{Hz}\\) and \\(16\\ \\mathrm{Hz}\\), envelope shown: beat frequency \\(6\\ \\mathrm{Hz}\\), mean \\(13\\ \\mathrm{Hz}\\), period \\(0.167\\ \\mathrm{s}\\).'),
    }),
];

// ---- WV3 -------------------------------------------------------------------------------------------------------------------------

/** The standing wave of WV3: two waves of amplitude 1 on the length 2 with 2 half waves (wavelength 2, period 1 s), the Demonstration default of the mode. */
export const WV3_DEFAULT = {halfWaves: 2, a1: 1} as const;
/** Step 5: three half waves (wavelength 4/3). */
export const WV3_THREE = {halfWaves: 3, a1: 1} as const;
/** Step 6: four half waves (wavelength 1) and amplitude 1.5 of each wave. */
export const WV3_EXPLORE = {halfWaves: 4, a1: 1.5} as const;

const wv3Formulas: readonly FormulaBlock[] = [
    {
        id: 'standing-identity',
        latex: '\\sin(kx-\\omega t)+\\sin(kx+\\omega t)=2\\sin kx\\,\\cos\\omega t',
        notation: text(
            '\\(x\\) je lega, \\(t\\) čas v sekundah, \\(k\\) pove, kako gosto so valovi razporejeni po osi \\(x\\) (valovna dolžina je \\(\\lambda=\\tfrac{2\\pi}{k}\\)), \\(\\omega\\) pa je krožna frekvenca (perioda je \\(T=\\tfrac{2\\pi}{\\omega}\\)). Prvi člen je val v desno, drugi val v levo.',
            '\\(x\\) is the position, \\(t\\) the time in seconds, \\(k\\) tells how densely the waves are spread along the \\(x\\)-axis (the wavelength is \\(\\lambda=\\tfrac{2\\pi}{k}\\)), and \\(\\omega\\) is the angular frequency (the period is \\(T=\\tfrac{2\\pi}{\\omega}\\)). The first term is a wave moving right, the second a wave moving left.',
        ),
        explanation: text(
            'Enakost sledi iz obrazca \\(\\sin a+\\sin b=2\\sin\\tfrac{a+b}{2}\\cos\\tfrac{a-b}{2}\\) za \\(a=kx-\\omega t\\) in \\(b=kx+\\omega t\\): polovična vsota je \\(kx\\), polovična razlika je \\(-\\omega t\\), kosinus pa je soda funkcija. Velja za vsak \\(x\\) in vsak \\(t\\). Prvi faktor \\(2\\sin kx\\) je odvisen samo od lege, drugi faktor \\(\\cos\\omega t\\) samo od časa; zato vsota ni potujoč val, ampak produkt obeh. Graf uporablja \\(k=\\tfrac{m\\pi}{2}\\) in \\(\\omega=2\\pi\\), kjer je \\(m\\) število polvalov na dolžini \\(2\\).',
            'The equality follows from the identity \\(\\sin a+\\sin b=2\\sin\\tfrac{a+b}{2}\\cos\\tfrac{a-b}{2}\\) for \\(a=kx-\\omega t\\) and \\(b=kx+\\omega t\\): half the sum is \\(kx\\), half the difference is \\(-\\omega t\\), and the cosine is an even function. It holds for every \\(x\\) and every \\(t\\). The first factor \\(2\\sin kx\\) depends only on the position, the second factor \\(\\cos\\omega t\\) only on the time; so the sum is not a travelling wave but the product of the two. The graph uses \\(k=\\tfrac{m\\pi}{2}\\) and \\(\\omega=2\\pi\\), where \\(m\\) is the number of half waves on the length \\(2\\).',
        ),
    },
];

const wv3Examples: readonly WorkedExample[] = [
    {
        id: 'wv3-product-check',
        title: text('Obrazec pri \\(k=\\pi\\), \\(\\omega=2\\pi\\), \\(x=\\tfrac12\\) in \\(t=\\tfrac12\\ \\mathrm{s}\\)', 'The identity at \\(k=\\pi\\), \\(\\omega=2\\pi\\), \\(x=\\tfrac12\\) and \\(t=\\tfrac12\\ \\mathrm{s}\\)'),
        calculationLatex: '\\sin\\left(\\tfrac{\\pi}{2}-\\pi\\right)+\\sin\\left(\\tfrac{\\pi}{2}+\\pi\\right)=-1+(-1),\\qquad 2\\sin\\tfrac{\\pi}{2}\\,\\cos\\pi=2\\cdot1\\cdot(-1)',
        resultLatex: '-2',
        check: text(
            'Obe strani dasta \\(-2\\), kakor je prvi izraz po vrsti \\(\\sin(-\\tfrac{\\pi}{2})=-1\\) in \\(\\sin\\tfrac{3\\pi}{2}=-1\\). Na grafu je ob času \\(0{,}5\\ \\mathrm{s}\\) romb pri \\(x=0{,}5\\) na višini \\(-2\\).',
            'Both sides give \\(-2\\), as the terms on the left are \\(\\sin(-\\tfrac{\\pi}{2})=-1\\) and \\(\\sin\\tfrac{3\\pi}{2}=-1\\). On the graph at time \\(0.5\\ \\mathrm{s}\\) the diamond at \\(x=0.5\\) is at height \\(-2\\).',
        ),
    },
];

const wv3Steps: readonly GuidedLessonStep[] = [
    step({
        id: 'wv3-two-waves', order: 1,
        title: text('Dva vala v nasprotnih smereh', 'Two waves in opposite directions'),
        purpose: text('Napovedati vsoto dveh enakih valov, ki potujeta v nasprotnih smereh, ob času \\(0\\).', 'Predicting the sum of two equal waves travelling in opposite directions at time \\(0\\).'),
        explanation: text(
            'Vrsta valovanja je zdaj Stoječe valovanje. Graf nariše dva vala z amplitudo \\(1\\): črtkani val potuje v desno, drugi črtkani val v levo; debela krivulja je njuna vsota. Obseg je dolžina \\(2\\), polvalov je \\(2\\), perioda je \\(1\\ \\mathrm{s}\\). Napoved: kakšne oblike je vsota ob času \\(0\\) in kolikšna je njena največja višina? Odčitki že kažejo odgovor; najprej zapiši napoved.',
            'The kind of waves is now Standing wave. The graph draws two waves of amplitude \\(1\\): one dashed wave travels right, the other dashed wave left; the thick curve is their sum. The graph covers the length \\(2\\), there are \\(2\\) half waves and the period is \\(1\\ \\mathrm{s}\\). Prediction: what shape does the sum have at time \\(0\\), and how high does it reach? The readouts already show the answer; write down the prediction first.',
        ),
        formulaIds: [],
        observationPrompt: text('Zapiši napoved, nato preberi Amplitudo hrbta in Valovno dolžino.', 'Write down the prediction, then read the Amplitude of an antinode and the Wavelength.'),
        expectedObservations: [text(
            'Vsota je val iste oblike, dvakrat višji: amplituda hrbta je \\(2\\), valovna dolžina je \\(2\\), ker se vala prekrivata.',
            'The sum is a wave of the same shape, twice as high: the amplitude of an antinode is \\(2\\) and the wavelength is \\(2\\), because the waves coincide.',
        )],
        scene: wavesScene('wv3-two-waves-scene', {mode: 'standing', components: WV3_DEFAULT, t: 0},
            'Stoječe valovanje, \\(2\\) polvala, amplituda vsakega vala \\(1\\), čas \\(0\\): amplituda hrbta \\(2\\), valovna dolžina \\(2\\).',
            'Standing wave, \\(2\\) half waves, amplitude of each wave \\(1\\), time \\(0\\): amplitude of an antinode \\(2\\), wavelength \\(2\\).'),
    }),
    step({
        id: 'wv3-move', order: 2,
        title: text('Pusti, da vala potujeta', 'Let the waves travel'),
        purpose: text('Napovedati vsoto, ko se vala premakneta vsak za četrtino valovne dolžine.', 'Predicting the sum once each wave has moved by a quarter of the wavelength.'),
        explanation: text(
            'Drsnik Čas t premika čas od \\(0\\) do \\(1\\ \\mathrm{s}\\); predvajanje dela isto. Črtkana vala se pri tem razmikata: desni se pomika v desno, levi v levo, vsak za \\(\\tfrac{\\lambda}{T}\\,t\\), pri \\(t=\\tfrac14\\ \\mathrm{s}\\) torej vsak za četrtino valovne dolžine, to je za \\(0{,}5\\). Napoved: kakšna je vsota ob času \\(0{,}25\\ \\mathrm{s}\\) in kaj se z debelo krivuljo zgodi med časoma \\(0\\) in \\(1\\ \\mathrm{s}\\)? Ali potuje v desno ali v levo? Najprej zapiši napoved, nato premakni drsnik.',
            'The time slider Time t moves the time from \\(0\\) to \\(1\\ \\mathrm{s}\\); playing does the same. The dashed waves move apart: the right one moves right, the left one left, each by \\(\\tfrac{\\lambda}{T}\\,t\\), so at \\(t=\\tfrac14\\ \\mathrm{s}\\) each has moved a quarter of the wavelength, that is \\(0.5\\). Prediction: what is the sum at time \\(0.25\\ \\mathrm{s}\\), and what happens to the thick curve between \\(0\\) and \\(1\\ \\mathrm{s}\\)? Does it travel right or left? Write down the prediction first, then move the slider.',
        ),
        formulaIds: [],
        observationPrompt: text('Zapiši napoved, nato s časom \\(0{,}25\\ \\mathrm{s}\\) in drugimi časi preveri debelo krivuljo.', 'Write down the prediction, then check the thick curve at time \\(0.25\\ \\mathrm{s}\\) and at other times.'),
        expectedObservations: [text(
            'Ob času \\(0{,}25\\ \\mathrm{s}\\) je vsota povsod nič: debela krivulja je ravna črta. Nikamor ne potuje; v času do \\(1\\ \\mathrm{s}\\) se samo izprazni in se napolni nazaj, ob \\(0{,}5\\ \\mathrm{s}\\) je zrcalna slika (navzdol), ob \\(1\\ \\mathrm{s}\\) spet takšna kot ob \\(0\\).',
            'At time \\(0.25\\ \\mathrm{s}\\) the sum is zero everywhere: the thick curve is a straight line. It does not travel anywhere; up to \\(1\\ \\mathrm{s}\\) it only empties and fills again, at \\(0.5\\ \\mathrm{s}\\) it is the mirror image (flipped down), at \\(1\\ \\mathrm{s}\\) it is again as at \\(0\\).',
        )],
        scene: wavesScene('wv3-move-scene', {mode: 'standing', components: WV3_DEFAULT, t: 0},
            'Stoječe valovanje, \\(2\\) polvala, čas \\(0\\); po premiku drsnika na \\(0{,}25\\ \\mathrm{s}\\) je vsota povsod nič, desni val je premaknjen za \\(0{,}5\\) v desno, levi za \\(0{,}5\\) v levo.',
            'Standing wave, \\(2\\) half waves, time \\(0\\); after moving the slider to \\(0.25\\ \\mathrm{s}\\) the sum is zero everywhere, the right wave has moved \\(0.5\\) to the right and the left wave \\(0.5\\) to the left.'),
    }),
    step({
        id: 'wv3-identity', order: 3,
        title: text('Vsota kot produkt', 'The sum as a product'),
        purpose: text('Utemeljiti stoječe valovanje z enakostjo \\(\\sin(kx-\\omega t)+\\sin(kx+\\omega t)=2\\sin kx\\cos\\omega t\\) in z njo napovedati čase, ko je vsota povsod nič.', 'Justifying the standing wave by the identity \\(\\sin(kx-\\omega t)+\\sin(kx+\\omega t)=2\\sin kx\\cos\\omega t\\) and using it to predict the times when the sum is zero everywhere.'),
        explanation: text(
            'Izračunaj vsoto na dva načina: po členih in po produktu, pri \\(x=\\tfrac12\\) in \\(t=\\tfrac12\\ \\mathrm{s}\\) (izračun spodaj). Obrazec velja za vsak \\(x\\) in \\(t\\), zato ga lahko uporabiš tudi drugje. Napoved: po obrazcu poišči vse čase med \\(0\\) in \\(1\\ \\mathrm{s}\\), ko je vsota povsod nič; en tak čas, \\(0{,}25\\ \\mathrm{s}\\), že poznaš. Zapiši napoved in jo preveri z drsnikom.',
            'Compute the sum in two ways: term by term and by the product, at \\(x=\\tfrac12\\) and \\(t=\\tfrac12\\ \\mathrm{s}\\) (the calculation below). The identity holds for every \\(x\\) and \\(t\\), so you can use it elsewhere too. Prediction: use the identity to find all times between \\(0\\) and \\(1\\ \\mathrm{s}\\) at which the sum is zero everywhere; you already know one such time, \\(0.25\\ \\mathrm{s}\\). Write down the prediction and check it with the slider.',
        ),
        formulaIds: ['standing-identity'],
        workedExampleId: 'wv3-product-check',
        observationPrompt: text('Zapiši napoved, nato preveri izračun z romboma in poišči čase z ravno krivuljo.', 'Write down the prediction, then check the calculation with the diamonds and find the times with a flat curve.'),
        expectedObservations: [text(
            'Vsota je povsod nič, kadar je \\(\\cos\\omega t=0\\), torej \\(2\\pi t=\\tfrac{\\pi}{2}\\) ali \\(\\tfrac{3\\pi}{2}\\): pri \\(t=0{,}25\\ \\mathrm{s}\\) in \\(t=0{,}75\\ \\mathrm{s}\\). Ob \\(0{,}5\\ \\mathrm{s}\\) je romb pri \\(x=0{,}5\\) na višini \\(-2\\).',
            'The sum is zero everywhere when \\(\\cos\\omega t=0\\), that is \\(2\\pi t=\\tfrac{\\pi}{2}\\) or \\(\\tfrac{3\\pi}{2}\\): at \\(t=0.25\\ \\mathrm{s}\\) and \\(t=0.75\\ \\mathrm{s}\\). At \\(0.5\\ \\mathrm{s}\\) the diamond at \\(x=0.5\\) is at height \\(-2\\).',
        )],
        scene: wavesScene('wv3-identity-scene', {mode: 'standing', components: WV3_DEFAULT, t: 0.5},
            'Stoječe valovanje, \\(2\\) polvala, čas \\(0{,}5\\ \\mathrm{s}\\): vsota je \\(-2\\sin kx\\), romb pri \\(x=0{,}5\\) je na višini \\(-2\\).',
            'Standing wave, \\(2\\) half waves, time \\(0.5\\ \\mathrm{s}\\): the sum is \\(-2\\sin kx\\), the diamond at \\(x=0.5\\) is at height \\(-2\\).'),
    }),
    step({
        id: 'wv3-nodes', order: 4,
        title: text('Vozli in hrbti', 'Nodes and antinodes'),
        purpose: text('Napovedati višini hrbtov ob času \\(0{,}1\\ \\mathrm{s}\\) in ali se vozli premikajo.', 'Predicting the heights of the antinodes at time \\(0.1\\ \\mathrm{s}\\) and whether the nodes move.'),
        explanation: text(
            'Kvadrati na grafu označujejo vozle, rombi pa hrbte; njihove lege si prebral že v prvem koraku. Napoved: nastavi čas na \\(0{,}1\\ \\mathrm{s}\\). Po obrazcu \\(2\\sin kx\\cos\\omega t\\) napovej, na kateri višini sta zdaj oba hrbta, in ali se vozli premikajo, ko spreminjaš čas. Zapiši napoved, nato premakni drsnik po vsem oknu.',
            'The squares on the graph mark the nodes and the diamonds the antinodes; you have already read their positions in the first step. Prediction: set the time to \\(0.1\\ \\mathrm{s}\\). Using the formula \\(2\\sin kx\\cos\\omega t\\), predict at what height the two antinodes are now, and whether the nodes move as you change the time. Write down the prediction, then move the slider through the whole window.',
        ),
        formulaIds: [],
        observationPrompt: text('Zapiši napoved, nato preberi Vozle valovanja in Hrbte ter premakni drsnik časa.', 'Write down the prediction, then read the Nodes and the Antinodes and move the time slider.'),
        expectedObservations: [text(
            'Ob času \\(0{,}1\\ \\mathrm{s}\\) je hrbet pri \\(x=0{,}5\\) na višini \\(2\\cos 0{,}2\\pi\\approx1{,}618\\), hrbet pri \\(x=1{,}5\\) pa na \\(-1{,}618\\): sosednja hrbta sta nasprotna. Vozli (pri \\(x=0\\), \\(1\\) in \\(2\\)) ostanejo pri istih \\(x\\) ob vsakem času; premikajo se samo višine hrbtov, po \\(2\\cos 2\\pi t\\) in v mejah amplitude \\(2\\).',
            'At time \\(0.1\\ \\mathrm{s}\\) the antinode at \\(x=0.5\\) is at height \\(2\\cos 0.2\\pi\\approx1.618\\) and the antinode at \\(x=1.5\\) at \\(-1.618\\): neighbouring antinodes are opposite. The nodes (at \\(x=0\\), \\(1\\) and \\(2\\)) stay at the same \\(x\\) at every time; only the heights of the antinodes change, following \\(2\\cos 2\\pi t\\) and within the amplitude \\(2\\).',
        )],
        scene: wavesScene('wv3-nodes-scene', {mode: 'standing', components: WV3_DEFAULT, t: 0},
            'Stoječe valovanje, \\(2\\) polvala, čas \\(0\\): začetno stanje; po nastavitvi časa \\(0{,}1\\ \\mathrm{s}\\) sta hrbta na višinah \\(1{,}618\\) in \\(-1{,}618\\), vozli ostanejo pri \\(0\\), \\(1\\), \\(2\\).',
            'Standing wave, \\(2\\) half waves, time \\(0\\): the starting state; after setting the time to \\(0.1\\ \\mathrm{s}\\) the antinodes are at heights \\(1.618\\) and \\(-1.618\\), the nodes stay at \\(0\\), \\(1\\), \\(2\\).'),
    }),
    step({
        id: 'wv3-half-waves', order: 5,
        title: text('Spremeni število polvalov', 'Change the number of half waves'),
        purpose: text('Napovedati število in lege vozlov ter valovno dolžino za tri polvale.', 'Predicting the number and positions of the nodes and the wavelength for three half waves.'),
        explanation: text(
            'Polval je del krivulje med dvema sosednjima vozloma. V polje Število polvalov vpiši \\(3\\) (dovoljena cela števila so od \\(1\\) do \\(6\\)); dolžina ostane \\(2\\). Napoved: koliko vozlov bo vključno z obema krajiščema, kje bodo in kolikšna bo valovna dolžina? Namig: valovna dolžina obsega dva polvala. Zapiši napoved, nato preberi odčitke.',
            'A half wave is the part of the curve between two neighbouring nodes. Type \\(3\\) into the field Number of half waves (allowed are the whole numbers from \\(1\\) to \\(6\\)); the length stays \\(2\\). Prediction: how many nodes will there be including both ends, where will they be, and what will the wavelength be? Hint: the wavelength contains two half waves. Write down the prediction, then read the readouts.',
        ),
        formulaIds: [],
        observationPrompt: text('Zapiši napoved, nato preberi Vozle valovanja, Hrbte in Valovno dolžino.', 'Write down the prediction, then read the Nodes, the Antinodes and the Wavelength.'),
        expectedObservations: [text(
            'Vozli so štirje, pri \\(0\\), približno \\(0{,}667\\), približno \\(1{,}333\\) in \\(2\\) (razmik \\(\\tfrac23\\)); hrbti so pri približno \\(0{,}333\\), \\(1\\) in približno \\(1{,}667\\), amplituda hrbta je \\(2\\). Valovna dolžina je \\(\\tfrac43\\), približno \\(1{,}333\\), dvakratnik razmika vozlov. Pri \\(m\\) polvalih na dolžini \\(2\\) je vozlov \\(m+1\\) in \\(\\lambda=\\tfrac4m\\).',
            'There are four nodes, at \\(0\\), approximately \\(0.667\\), approximately \\(1.333\\) and \\(2\\) (spacing \\(\\tfrac23\\)); the antinodes are at approximately \\(0.333\\), \\(1\\) and approximately \\(1.667\\), the amplitude of an antinode is \\(2\\). The wavelength is \\(\\tfrac43\\), approximately \\(1.333\\), twice the node spacing. For \\(m\\) half waves on the length \\(2\\) there are \\(m+1\\) nodes and \\(\\lambda=\\tfrac4m\\).',
        )],
        scene: wavesScene('wv3-half-waves-scene', {mode: 'standing', components: WV3_DEFAULT, t: 0},
            'Stoječe valovanje, \\(2\\) polvala, čas \\(0\\): začetno stanje; po vpisu \\(3\\) polvalov so vozli pri \\(0\\), \\(0{,}667\\), \\(1{,}333\\), \\(2\\) in valovna dolžina je \\(1{,}333\\).',
            'Standing wave, \\(2\\) half waves, time \\(0\\): the starting state; after typing \\(3\\) half waves the nodes at \\(0\\), \\(0.667\\), \\(1.333\\), \\(2\\); wavelength \\(1.333\\).'),
    }),
    step({
        id: 'wv3-explore', order: 6,
        title: text('Prosto raziskovanje', 'Free exploration'),
        purpose: text('Preizkusiti pravilo na svojih številih polvalov in amplitudah.', 'Trying the rule on your own numbers of half waves and amplitudes.'),
        explanation: text(
            'Spreminjaj število polvalov od \\(1\\) do \\(6\\) in amplitudo vsakega vala ter premikaj čas. Napovej število vozlov, valovno dolžino in amplitudo hrbta, preden ju prebereš. Izbrana števila so ponazoritev; enakost za vsoto velja za vsak \\(k\\) in \\(\\omega\\). Za izbirni pogled naprej: vzorci, ki jih tukaj vidiš, so tudi načini nihanja idealne strune, vpete na obeh koncih; vsako nihanje take strune je vsota takih vzorcev (Fourierova vrsta), a tega za lekcijo ne potrebuješ.',
            'Change the number of half waves from \\(1\\) to \\(6\\) and the amplitude of each wave, and move the time. Predict the number of nodes, the wavelength and the amplitude of an antinode before reading them. The chosen numbers are an illustration; the identity for the sum holds for every \\(k\\) and \\(\\omega\\). An optional look ahead: the patterns you see here are also the modes of an ideal string fixed at both ends; every vibration of such a string is a sum of such patterns (a Fourier series), but you do not need this for the lesson.',
        ),
        formulaIds: [],
        observationPrompt: text('Poišči število polvalov z valovno dolžino \\(1\\) in amplitudo hrbta, ko ima vsak val amplitudo \\(1{,}5\\).', 'Find the number of half waves giving wavelength \\(1\\), and the amplitude of an antinode when each wave has amplitude \\(1.5\\).'),
        expectedObservations: [text(
            'Pri \\(4\\) polvalih je valovna dolžina \\(1\\), vozlov je \\(5\\), pri \\(0\\), \\(0{,}5\\), \\(1\\), \\(1{,}5\\), \\(2\\). Pri amplitudi \\(1{,}5\\) vsakega vala je amplituda hrbta \\(3\\).',
            'At \\(4\\) half waves the wavelength is \\(1\\) and there are \\(5\\) nodes, at \\(0\\), \\(0.5\\), \\(1\\), \\(1.5\\), \\(2\\). With amplitude \\(1.5\\) of each wave the amplitude of an antinode is \\(3\\).',
        )],
        scene: wavesScene('wv3-explore-scene', {mode: 'standing', components: WV3_DEFAULT, t: 0},
            'Stoječe valovanje, \\(2\\) polvala, amplituda vsakega vala \\(1\\): začetno stanje; po nastavitvi \\(4\\) polvalov in amplitude \\(1{,}5\\) je valovna dolžina \\(1\\), pet vozlov, amplituda hrbta \\(3\\).',
            'Standing wave, \\(2\\) half waves, amplitude of each wave \\(1\\): the starting state; after setting \\(4\\) half waves and amplitude \\(1.5\\) the wavelength is \\(1\\), five nodes, amplitude of an antinode \\(3\\).'),
    }),
];

// ---- Lessons ---------------------------------------------------------------------------------------------------------------------

const sources: GuidedLesson['sources'] = [
    {
        id: 'bezeg-waves-implementation',
        citation: 'Bezeg source: src/waves/ (sinusoid sum, phasor sum, beats, state model) and src/graphs/functions/WavesGraph.tsx.',
        implementationCorrespondence: 'A scene sets the kind of waves, the components and the time of the waves graph; every number is a readout of that graph (frequencies in hertz, phases in degrees, time in seconds), the text quotes only values of those scenes, values the learner reads after an action the text asks for, or values of a formula shown in the same step. The amplitude and phase of the sum are computed from the closed formula and the drawn maximum agrees with it; the envelope is drawn from its formula, not fitted to the sum.',
    },
];

const wv1: GuidedLesson = {
    demonstrationId: 'waves',
    title: text('Seštevanje valov in faza', 'Superposition and phase'),
    summary: text(
        'Dva vala iste frekvence se seštejeta v nov val iste frekvence; njegova amplituda je od \\(|A_1-A_2|\\) do \\(A_1+A_2\\) in je odvisna od razlike faz. Vrteči se puščice (kazalci) se seštejejo kakor vektorji.',
        'Two waves of the same frequency add up to a new wave of that frequency; its amplitude is between \\(|A_1-A_2|\\) and \\(A_1+A_2\\) and depends on the phase difference. Rotating arrows (phasors) add like vectors.',
    ),
    prerequisites: [text('Amplituda, frekvenca in faza kosinusnega vala (lekciji o kotnih funkcijah) ter kot in puščica v enotski krožnici.', 'Amplitude, frequency and phase of a cosine wave (the lessons on trigonometric functions), and the angle and the arrow in the unit circle.')],
    learningGoals: [
        text('Veš, da je vsota dveh valov iste frekvence spet val te frekvence z novo amplitudo in fazo, ki ju daje obrazec.', 'Know that the sum of two waves of the same frequency is again a wave of that frequency with a new amplitude and phase given by the formula.'),
        text('Veš, da je amplituda vsote od \\(|A_1-A_2|\\) (nasprotna faza) do \\(A_1+A_2\\) (enaka faza) in da se enaka vala v nasprotni fazi izničita.', 'Know that the amplitude of the sum is from \\(|A_1-A_2|\\) (opposite phase) to \\(A_1+A_2\\) (equal phase) and that equal waves in opposite phase cancel.'),
        text('Znaš utemeljiti amplitudo in fazo vsote z vektorsko vsoto dveh vrtečih se kazalcev.', 'Can justify the amplitude and phase of the sum by the vector sum of two rotating phasors.'),
    ],
    formulaBlocks: wv1Formulas,
    workedExamples: wv1Examples,
    steps: wv1Steps,
    sources,
    edgeCases: [
        text('Pri enaki amplitudi in razliki faz \\(180^\\circ\\) se vala izničita; izračunana amplituda je ostanek zaokroževanja, graf pa piše izničenje, fazo vsote pa označi kot nedoločeno.', 'With equal amplitudes and a phase difference of \\(180^\\circ\\) the waves cancel; the computed amplitude would be a rounding residue, so the graph writes cancellation and marks the sum phase as not defined.'),
        text('Pravilo velja samo za enaki frekvenci; valova z različnima frekvencama ne dasta enega vala s stalno amplitudo (lekcija Utripanje).', 'The rule holds only for equal frequencies; waves with different frequencies do not give one wave with a constant amplitude (the lesson Beats).'),
        text('Posamezne amplitude in faze so ponazoritev; formula velja za vsak par valov iste frekvence.', 'The particular amplitudes and phases are an illustration; the formula holds for every pair of waves of one frequency.'),
    ],
    unresolvedQuestions: [],
};

const wv2: GuidedLesson = {
    demonstrationId: 'waves',
    title: text('Utripanje', 'Beats'),
    summary: text(
        'Dva vala blizu si frekvenc se seštejeta v val s povprečno frekvenco, katerega amplituda nabrekne in zamre s frekvenco \\(\\Delta f=|f_1-f_2|\\); ovojnica sledi iz obrazca za vsoto kosinusov.',
        'Two waves of nearby frequencies add up to a wave of the mean frequency whose amplitude swells and fades at the frequency \\(\\Delta f=|f_1-f_2|\\); the envelope follows from the identity for a sum of cosines.',
    ),
    prerequisites: [text('Lekcija Seštevanje valov in faza (prva lekcija poglavja) ter kosinusni val.', 'The lesson Superposition and phase (the first lesson of the chapter) and the cosine wave.')],
    learningGoals: [
        text('Veš, da se frekvenca utripanja ujema z razliko frekvenc \\(|f_1-f_2|\\) in perioda utripanja z \\(\\tfrac{1}{\\Delta f}\\).', 'Know that the beat frequency equals the frequency difference \\(|f_1-f_2|\\) and the beat period equals \\(\\tfrac{1}{\\Delta f}\\).'),
        text('Veš, da vsoto razložimo v produkt ovojnice in vala povprečne frekvence in da je to enakost, ne le slika.', 'Know that the sum factors into a product of an envelope and a wave of the mean frequency, and that this is an equality, not only a picture.'),
        text('Veš, da ima faktor \\(\\cos(\\pi\\,\\Delta f\\,t)\\) frekvenco \\(\\tfrac{\\Delta f}{2}\\) in da mu ob vozlih ovojnice zamenja predznak.', 'Know that the factor \\(\\cos(\\pi\\,\\Delta f\\,t)\\) has frequency \\(\\tfrac{\\Delta f}{2}\\) and changes sign at the nodes of the envelope.'),
    ],
    formulaBlocks: wv2Formulas,
    workedExamples: wv2Examples,
    steps: wv2Steps,
    sources,
    edgeCases: [
        text('Pri enakih frekvencah utripanja ni: vsota ima stalno amplitudo \\(2A\\) in graf piše, da utripanja ni.', 'With equal frequencies there are no beats: the sum has the constant amplitude \\(2A\\) and the graph says there are no beats.'),
        text('Izbrani frekvenci sta ponazoritev; enakost za vsoto kosinusov velja za vsak par. Vsota je en val povprečne frekvence le znotraj ene izbokline.', 'The chosen frequencies are an illustration; the identity for a sum of cosines holds for every pair. The sum is one wave of the mean frequency only within a single lobe.'),
        text('Graf riše krivulje z \\(2048\\) točkami na sekundo okna, zato so frekvence omejene na \\(40\\ \\mathrm{Hz}\\) in risanje krivulj ne popači.', 'The graph draws \\(2048\\) points per second of window, so frequencies are limited to \\(40\\ \\mathrm{Hz}\\) and the drawing does not distort the curves.'),
    ],
    unresolvedQuestions: [],
};

const wv3: GuidedLesson = {
    demonstrationId: 'waves',
    title: text('Stoječe valovanje', 'Standing waves'),
    summary: text(
        'Dva enaka vala, ki potujeta v nasprotnih smereh, se seštejeta v vzorec z vozli in hrbti; vozle, hrbte in obrazec za vsoto spoznaš po korakih.',
        'Two equal waves travelling in opposite directions add up to a pattern with nodes and antinodes; you meet the nodes, the antinodes and the formula for the sum step by step.',
    ),
    prerequisites: [text('Lekcija Seštevanje valov in faza (prva lekcija poglavja) ter kosinusni in sinusni val.', 'The lesson Superposition and phase (the first lesson of the chapter) and the cosine and sine wave.')],
    learningGoals: [
        text('Veš, da je vsota dveh enakih valov v nasprotnih smereh produkt \\(2\\sin kx\\cos\\omega t\\), torej vzorec, ki ne potuje, in da to utemeljiš z enakostjo za vsoto sinusov.', 'Know that the sum of two equal waves in opposite directions is the product \\(2\\sin kx\\cos\\omega t\\), a pattern that does not travel, and justify it by the identity for a sum of sines.'),
        text('Veš, da so vozli lege, kjer je \\(\\sin kx=0\\), in da ostanejo na istem mestu ob vsakem času, hrbti pa imajo amplitudo \\(2A\\).', 'Know that the nodes are the positions where \\(\\sin kx=0\\) and that they stay in place at every time, while the antinodes have amplitude \\(2A\\).'),
        text('Veš, da je na dolžini \\(2\\) pri \\(m\\) polvalih \\(m+1\\) vozlov in valovna dolžina \\(\\tfrac4m\\).', 'Know that on the length \\(2\\) with \\(m\\) half waves there are \\(m+1\\) nodes and the wavelength is \\(\\tfrac4m\\).'),
    ],
    formulaBlocks: wv3Formulas,
    workedExamples: wv3Examples,
    steps: wv3Steps,
    sources,
    edgeCases: [
        text('Graf vedno nariše oba vala hkrati, zato enega samega vala ni mogoče pokazati; njuno vsoto vidimo takoj.', 'The graph always draws both waves at once, so a single wave cannot be shown on its own; their sum is visible at once.'),
        text('Ob časih \\(\\tfrac14\\ \\mathrm{s}\\) in \\(\\tfrac34\\ \\mathrm{s}\\) je vsota povsod nič, čeprav vala obstajata; vozli pa so nič ob vsakem času.', 'At the times \\(\\tfrac14\\ \\mathrm{s}\\) and \\(\\tfrac34\\ \\mathrm{s}\\) the sum is zero everywhere although the two waves exist; the nodes are zero at every time.'),
        text('Dolžina \\(2\\), perioda \\(1\\ \\mathrm{s}\\) in cela števila polvalov od \\(1\\) do \\(6\\) so izbira modela; enakost za vsoto sinusov velja za vsak \\(k\\) in \\(\\omega\\). Navedeni položaji vozlov so ponazoritev.', 'The length \\(2\\), the period \\(1\\ \\mathrm{s}\\) and whole numbers of half waves from \\(1\\) to \\(6\\) are the model\'s choice; the identity for a sum of sines holds for every \\(k\\) and \\(\\omega\\). The stated node positions are an illustration.'),
    ],
    unresolvedQuestions: [],
};

export const wavesSuperpositionLesson: GuidedLesson = wv1;
export const wavesBeatsLesson: GuidedLesson = wv2;
export const wavesStandingLesson: GuidedLesson = wv3;
