/**
 * Guided lessons of the waves family, batch C (docs/specs/waves-sampling-lessons.md): WV4, sampling and aliasing (the wheel), on `waves` (WavesGraph, sampling mode).
 * The lesson is the lesson of one section of the waves chapter (wavesChapterRegistry.ts adapts it on request). Scenes use only the `waves` actions the graph registers
 * (`set-mode`, `set-components`, `set-sampling`, `set-time`); no scene starts playback. The graph states the apparent motion on the first frame at every frequency
 * (rows Navidezno gibanje and Navidezna frekvenca, the status line), so every predicting step opens on the state BEFORE the change it asks for: the text asks for a
 * prediction with a reason, names the field and the value with its exact label, and then asks the learner to make the change and compare. The alias wave is hidden
 * (`showAlias: false`) in the steps where its picture would answer. Every number the text quotes is a readout of the graph for that scene, a value the learner reads
 * after an action the text asks for, or a value of arithmetic shown in the same step; the numbers are listed per step in docs/reviews/feature-streams/families-prep/notes/f3-waves-c.md.
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

/** What a sampling scene sets: the tone (frequency in whole hertz, phase in degrees on the 5 degree grid, amplitude), the rate, the switches and the time in seconds. */
export interface WavesSamplingSceneSpec {
    readonly f: number;
    readonly fs: number;
    readonly a?: number;
    readonly p?: number;
    readonly extra?: number;
    readonly showAlias: boolean;
    readonly showJoin?: boolean;
    readonly showSinc?: boolean;
    readonly t: number;
}

/** The actions of a sampling scene: the Demonstration default, the sampling mode (it resets the time), the tone, the sampling options, then the time. */
export const wavesSamplingSceneActions = (id: string, spec: WavesSamplingSceneSpec): LessonAction[] => [
    {kind: 'prepared-scene', sceneId: id, source: 'demonstration-default'},
    {kind: 'waves', operation: 'set-mode', mode: 'sampling'},
    {kind: 'waves', operation: 'set-components', f1: spec.f, p1: spec.p ?? 0, a1: spec.a ?? 1},
    {kind: 'waves', operation: 'set-sampling', fs: spec.fs, extra: spec.extra ?? 48, showAlias: spec.showAlias, showJoin: spec.showJoin ?? false, showSinc: spec.showSinc ?? false},
    {kind: 'waves', operation: 'set-time', t: spec.t},
];

const samplingScene = (id: string, spec: WavesSamplingSceneSpec, sl: string, en: string): LessonScene =>
    ({id, basedOn: 'demonstration-default', actions: wavesSamplingSceneActions(id, spec), expectedState: text(sl, en)});

/** The sampling rate of the wheel in WV4: 24 frames per second (the default of the film). */
export const WV4_RATE = 24;
/** The slow wheel of step 1 and the starting point of step 2, in revolutions per second. */
export const WV4_SLOW = 2;
/** The wheel of steps 2, 4, 5 and 7: close to the sampling rate from below. */
export const WV4_FAST = 23;
/** The wheel of step 3: close to the sampling rate from above. */
export const WV4_FASTER = 25;
/** Step 4 opens at the instant n = 12 and asks for the times between the instants. */
export const WV4_INSTANT_TIME = 0.5;
/** Step 6 opens on the wheel f = 9 at the rate 24 and asks for the rate 12, then f = 6, then f = 13 at the rate 24. */
export const WV4_CHANGE_F = 9;

// ---- WV4 -------------------------------------------------------------------------------------------------------------------------

const wv4Formulas: readonly FormulaBlock[] = [
    {
        id: 'alias-frequency',
        latex: 'f_a=f-kf_s,\\quad k\\in\\mathbb{Z},\\quad -\\tfrac{f_s}{2}<f_a<\\tfrac{f_s}{2}',
        notation: text(
            '\\(f\\) je frekvenca vrtenja v hercih, \\(f_s\\) frekvenca vzorčenja (posnetkov na sekundo), \\(f_a\\) navidezna frekvenca, \\(k\\) pa celo število, izbrano tako, da \\(f_a\\) pade v dani interval. Negativna \\(f_a\\) pomeni vrtenje nazaj.',
            '\\(f\\) is the frequency of the rotation in hertz, \\(f_s\\) the sampling rate (samples per second), \\(f_a\\) the apparent frequency, and \\(k\\) an integer chosen so that \\(f_a\\) falls in the given interval. A negative \\(f_a\\) means turning backwards.',
        ),
        explanation: text(
            'Vzorca \\(\\cos\\!\\left(2\\pi f\\tfrac{n}{f_s}+\\varphi\\right)\\) in \\(\\cos\\!\\left(2\\pi f_a\\tfrac{n}{f_s}+\\varphi\\right)\\) sta za vsako celo število \\(n\\) enaka: \\(f\\) in \\(f_a\\) se razlikujeta za \\(kf_s\\), zato se argumenta razlikujeta za \\(2\\pi kn\\), kosinus pa ima periodo \\(2\\pi\\). To je dokaz za vsak \\(f\\), \\(f_s\\) in \\(\\varphi\\); slike ponazarjajo posamezne primere. Če je \\(f\\) večkratnik \\(f_s\\), je \\(f_a=0\\) in kolo navidezno miruje. Če je \\(f-kf_s=\\pm\\tfrac{f_s}{2}\\) (kadar je \\(2f\\) lih večkratnik \\(f_s\\), na primer \\(2f=f_s\\)), interval ne določi \\(f_a\\) enolično: graf piše ni določeno in alias vala ne nariše.',
            'The samples \\(\\cos\\!\\left(2\\pi f\\tfrac{n}{f_s}+\\varphi\\right)\\) and \\(\\cos\\!\\left(2\\pi f_a\\tfrac{n}{f_s}+\\varphi\\right)\\) are equal for every integer \\(n\\): \\(f\\) and \\(f_a\\) differ by \\(kf_s\\), so the arguments differ by \\(2\\pi kn\\), and the cosine has the period \\(2\\pi\\). This is a proof for every \\(f\\), \\(f_s\\) and \\(\\varphi\\); the pictures illustrate single cases. If \\(f\\) is a multiple of \\(f_s\\), then \\(f_a=0\\) and the wheel seems to stand still. If \\(f-kf_s=\\pm\\tfrac{f_s}{2}\\) (when \\(2f\\) is an odd multiple of \\(f_s\\), for example \\(2f=f_s\\)), the interval does not determine \\(f_a\\): the graph writes not defined and draws no alias wave.',
        ),
    },
];

const wv4Examples: readonly WorkedExample[] = [
    {
        id: 'wv4-wheel-40',
        title: text('Kolo s frekvenco \\(40\\ \\mathrm{Hz}\\) ob \\(24\\) posnetkih na sekundo', 'A wheel of \\(40\\ \\mathrm{Hz}\\) at \\(24\\) samples per second'),
        calculationLatex: 'f_a=40-k\\cdot24,\\quad -12<f_a<12\\ \\Rightarrow\\ k=2,\\quad f_a=40-48',
        resultLatex: 'f_a=-8\\ \\mathrm{Hz}',
        check: text(
            'Graf pri teh nastavitvah piše Navidezna frekvenca \\(-8\\) obr/s, kolo se navidezno vrti nazaj z \\(8\\ \\mathrm{Hz}\\). Tanka krivulja ima pri \\(40\\ \\mathrm{Hz}\\) še vedno \\(\\tfrac{2048}{40}=51{,}2\\) točke na periodo, zato risanje samo ne ustvari lažne frekvence; lažna frekvenca nastane le pri pikah.',
            'At these settings the graph writes Apparent frequency \\(-8\\) rev/s, the wheel seems to turn backwards at \\(8\\ \\mathrm{Hz}\\). At \\(40\\ \\mathrm{Hz}\\) the thin curve still has \\(\\tfrac{2048}{40}=51.2\\) points per period, so the drawing itself creates no false frequency; the false frequency arises only at the dots.',
        ),
    },
];

const wv4Steps: readonly GuidedLessonStep[] = [
    step({
        id: 'wv4-slow', order: 1,
        title: text('Počasno kolo in kamera', 'A slow wheel and a camera'),
        purpose: text('Spoznati kolo, trenutke posnetkov in kazalca; napovedati, kdaj sta kazalca enaka.', 'Meeting the wheel, the instants of the samples and the two phasors; predicting when they coincide.'),
        explanation: text(
            'Točka na obodu kolesa naredi \\(f=2\\) obrata na sekundo, kamera pa kolo posname \\(f_s=24\\)-krat na sekundo, ob trenutkih \\(\\tfrac{n}{f_s}\\) za \\(n=0,1,2,\\dots\\) Kolo je levo od časovne osi: črtkana puščica je pravi kazalec ob času \\(t\\), polna puščica pa kazalec ob zadnjem vzorcu (posnetku). Črtice pod grafom so trenutki posnetkov, pike so vrednosti vala ob njih, odčitek Zadnji vzorec pove, kateri posnetek je zadnji. Napoved: ob katerih časih \\(t\\) polna puščica leži točno na črtkani in za kolikšen del obrata se kazalec premakne od enega posnetka do naslednjega?',
            'A point on the rim of a wheel makes \\(f=2\\) revolutions per second, and a camera takes \\(f_s=24\\) samples of the wheel per second, at the instants \\(\\tfrac{n}{f_s}\\) for \\(n=0,1,2,\\dots\\) The wheel is left of the time axis: the dashed arrow is the true phasor at time \\(t\\), and the solid arrow is the phasor at the last sample (a frame of the film). The ticks below the graph are the instants of the samples, the dots are the values of the wave at them, and the readout Last sample says which sample is the last one. Prediction: at which times \\(t\\) does the solid arrow lie exactly on the dashed one, and by what part of a turn does the phasor move from one sample to the next?',
        ),
        formulaIds: [],
        observationPrompt: text(
            'Zapiši napoved. Nato nastavi Čas t na \\(0{,}05\\) in na \\(0{,}25\\); vsakič primerjaj puščici in preberi Zadnji vzorec.',
            'Write down your prediction. Then set Time t to \\(0.05\\) and to \\(0.25\\); each time compare the arrows and read Last sample.',
        ),
        expectedObservations: [text(
            'Ob \\(t=0{,}25\\) je zadnji vzorec \\(n=6\\) (trenutek \\(\\tfrac{6}{24}=0{,}25\\ \\mathrm{s}\\)) in puščici sovpadata; sovpadata ob vsakem trenutku \\(\\tfrac{n}{24}\\). Ob \\(t=0{,}05\\) je zadnji vzorec še \\(n=1\\) (trenutek \\(\\tfrac{1}{24}\\approx0{,}0417\\ \\mathrm{s}\\)) in polna puščica zaostaja za črtkano. Med dvema posnetkoma se kazalec zavrti za \\(\\tfrac{2}{24}=\\tfrac{1}{12}\\) obrata, to je \\(30^\\circ\\). Film kolo prikaže pravilno: odčitek Navidezno gibanje piše, da se vrti naprej z \\(2\\ \\mathrm{Hz}\\).',
            'At \\(t=0.25\\) the last sample is \\(n=6\\) (instant \\(\\tfrac{6}{24}=0.25\\ \\mathrm{s}\\)) and the arrows coincide; they coincide at every instant \\(\\tfrac{n}{24}\\). At \\(t=0.05\\) the last sample is still \\(n=1\\) (instant \\(\\tfrac{1}{24}\\approx0.0417\\ \\mathrm{s}\\)) and the solid arrow lags behind the dashed one. Between two samples the phasor turns by \\(\\tfrac{2}{24}=\\tfrac{1}{12}\\) of a turn, that is \\(30^\\circ\\). The film shows the wheel correctly: the readout Apparent motion says it turns forwards at \\(2\\ \\mathrm{Hz}\\).',
        )],
        scene: samplingScene('wv4-slow-scene', {f: WV4_SLOW, fs: WV4_RATE, showAlias: false, t: 0},
            'Vzorčenje, kolo \\(2\\ \\mathrm{Hz}\\), \\(24\\) posnetkov na sekundo, alias val skrit, čas \\(0\\): zadnji vzorec \\(n=0\\), navidezno vrtenje naprej \\(2\\ \\mathrm{Hz}\\).',
            'Sampling, wheel \\(2\\ \\mathrm{Hz}\\), \\(24\\) samples per second, alias wave hidden, time \\(0\\): last sample \\(n=0\\), apparent motion forwards \\(2\\ \\mathrm{Hz}\\).'),
    }),
    step({
        id: 'wv4-fast', order: 2,
        title: text('Hitrejše kolo', 'A faster wheel'),
        purpose: text('Napovedati navidezno vrtenje pri \\(23\\ \\mathrm{Hz}\\) in ga primerjati z odčitkom.', 'Predicting the apparent rotation at \\(23\\ \\mathrm{Hz}\\) and comparing it with the readout.'),
        explanation: text(
            'Kamera ostane pri \\(24\\) posnetkih na sekundo, kolo pa zavrtimo hitreje. Napoved z razlogom: kolo naj se vrti s \\(23\\) obrati na sekundo. V katero smer in s katero frekvenco se bo kolo videlo vrteti na filmu? Pomisli, za kolikšen del obrata se zavrti med dvema posnetkoma in kam pride kazalec.',
            'The camera stays at \\(24\\) samples per second, and the wheel is made to turn faster. Prediction with a reason: let the wheel turn at \\(23\\) revolutions per second. In which direction and at what frequency will the wheel seem to turn on the film? Think by what part of a turn it turns between two samples and where the phasor arrives.',
        ),
        formulaIds: [],
        observationPrompt: text(
            'Zapiši napoved in razlog. Nato v polju Frekvenca tona v Hz nastavi \\(23\\) in preberi odčitek Navidezno gibanje. Nastavi še Čas t na \\(0{,}05\\) in primerjaj polno puščico z lego ob \\(t=0\\).',
            'Write down your prediction and the reason. Then set the field Frequency of the tone in Hz to \\(23\\) and read the readout Apparent motion. Also set Time t to \\(0.05\\) and compare the solid arrow with its position at \\(t=0\\).',
        ),
        expectedObservations: [text(
            'Navidezno gibanje: kolo se navidezno vrti nazaj s frekvenco \\(1\\ \\mathrm{Hz}\\); Navidezna frekvenca \\(-1\\) obr/s. Razlog: med dvema posnetkoma se kolo zavrti za \\(\\tfrac{23}{24}\\) obrata, kar je v posnetku enako kakor \\(\\tfrac{1}{24}\\) obrata nazaj, to je \\(15^\\circ\\). Ob \\(t=0{,}05\\) je zadnji vzorec \\(n=1\\) in polna puščica je za \\(15^\\circ\\) pred lego ob \\(t=0\\) v smeri nazaj, črtkana pa se je zavrtela za \\(23\\cdot0{,}05=1{,}15\\) obrata naprej.',
            'Apparent motion: the wheel seems to turn backwards at \\(1\\ \\mathrm{Hz}\\); Apparent frequency \\(-1\\) rev/s. The reason: between two samples the wheel turns by \\(\\tfrac{23}{24}\\) of a turn, which in the sample looks the same as \\(\\tfrac{1}{24}\\) of a turn backwards, that is \\(15^\\circ\\). At \\(t=0.05\\) the last sample is \\(n=1\\) and the solid arrow is \\(15^\\circ\\) back from its position at \\(t=0\\), while the dashed one has turned forwards by \\(23\\cdot0.05=1.15\\) turns.',
        )],
        scene: samplingScene('wv4-fast-scene', {f: WV4_SLOW, fs: WV4_RATE, showAlias: false, t: 0},
            'Vzorčenje, kolo \\(2\\ \\mathrm{Hz}\\), \\(24\\) posnetkov na sekundo, alias val skrit, čas \\(0\\): izhodišče, v katerem se frekvenca tona poveča na \\(23\\ \\mathrm{Hz}\\).',
            'Sampling, wheel \\(2\\ \\mathrm{Hz}\\), \\(24\\) samples per second, alias wave hidden, time \\(0\\): the starting point from which the frequency of the tone is raised to \\(23\\ \\mathrm{Hz}\\).'),
    }),
    step({
        id: 'wv4-crawl', order: 3,
        title: text('Blizu frekvence vzorčenja', 'Close to the sampling rate'),
        purpose: text('Napovedati smer pri \\(25\\ \\mathrm{Hz}\\) in jo primerjati s \\(23\\ \\mathrm{Hz}\\).', 'Predicting the direction at \\(25\\ \\mathrm{Hz}\\) and comparing it with \\(23\\ \\mathrm{Hz}\\).'),
        explanation: text(
            'Slika kaže kolo s \\(23\\ \\mathrm{Hz}\\) ob \\(24\\) posnetkih na sekundo. Zdaj naj se kolo vrti še hitreje, malo čez frekvenco vzorčenja. Napoved z razlogom: kako se bo kolo videlo vrteti pri \\(25\\) obratih na sekundo, v katero smer in s katero frekvenco, in kako se to razlikuje od \\(23\\ \\mathrm{Hz}\\)?',
            'The picture shows the wheel at \\(23\\ \\mathrm{Hz}\\) with \\(24\\) samples per second. Now let the wheel turn even faster, a little above the sampling rate. Prediction with a reason: how will the wheel seem to turn at \\(25\\) revolutions per second, in which direction and at what frequency, and how does that differ from \\(23\\ \\mathrm{Hz}\\)?',
        ),
        formulaIds: [],
        observationPrompt: text(
            'Zapiši napoved in razlog. Nato v polju Frekvenca tona v Hz nastavi \\(25\\) in preberi Navidezno gibanje in Navidezno frekvenco. Nastavi še Čas t na \\(0{,}05\\) in primerjaj polno puščico z lego ob \\(t=0\\).',
            'Write down your prediction and the reason. Then set the field Frequency of the tone in Hz to \\(25\\) and read Apparent motion and Apparent frequency. Also set Time t to \\(0.05\\) and compare the solid arrow with its position at \\(t=0\\).',
        ),
        expectedObservations: [text(
            'Kolo se navidezno vrti naprej s frekvenco \\(1\\ \\mathrm{Hz}\\); Navidezna frekvenca \\(1\\) obr/s. Med dvema posnetkoma se kolo zavrti za \\(\\tfrac{25}{24}\\) obrata, to je cel obrat in še \\(\\tfrac{1}{24}\\), torej \\(15^\\circ\\) naprej; ob \\(t=0{,}05\\) je polna puščica za \\(15^\\circ\\) naprej od lege ob \\(t=0\\). Pri \\(23\\ \\mathrm{Hz}\\) se kolo plazi nazaj, pri \\(25\\ \\mathrm{Hz}\\) naprej, vsakič z \\(1\\ \\mathrm{Hz}\\), čeprav se v resnici vrti skoraj tako hitro, kot kamera snema.',
            'The wheel seems to turn forwards at \\(1\\ \\mathrm{Hz}\\); Apparent frequency \\(1\\) rev/s. Between two samples the wheel turns by \\(\\tfrac{25}{24}\\) of a turn, one whole turn and another \\(\\tfrac{1}{24}\\), that is \\(15^\\circ\\) forwards; at \\(t=0.05\\) the solid arrow is \\(15^\\circ\\) forwards from its position at \\(t=0\\). At \\(23\\ \\mathrm{Hz}\\) the wheel crawls backwards, at \\(25\\ \\mathrm{Hz}\\) forwards, each time at \\(1\\ \\mathrm{Hz}\\), although it really turns almost as fast as the camera takes samples.',
        )],
        scene: samplingScene('wv4-crawl-scene', {f: WV4_FAST, fs: WV4_RATE, showAlias: false, t: 0},
            'Vzorčenje, kolo \\(23\\ \\mathrm{Hz}\\), \\(24\\) posnetkov na sekundo, alias val skrit, čas \\(0\\): navidezno vrtenje nazaj \\(1\\ \\mathrm{Hz}\\), Navidezna frekvenca \\(-1\\) obr/s; izhodišče, v katerem se frekvenca tona poveča na \\(25\\ \\mathrm{Hz}\\).',
            'Sampling, wheel \\(23\\ \\mathrm{Hz}\\), \\(24\\) samples per second, alias wave hidden, time \\(0\\): apparent motion backwards \\(1\\ \\mathrm{Hz}\\), Apparent frequency \\(-1\\) rev/s; the starting point from which the frequency of the tone is raised to \\(25\\ \\mathrm{Hz}\\).'),
    }),
    step({
        id: 'wv4-instants', order: 4,
        title: text('Posnetki ob trenutkih', 'Samples at the instants'),
        purpose: text('Napovedati, kaj se z obema kazalcema zgodi med dvema trenutkoma vzorčenja; prešteti dvige pik.', 'Predicting what both phasors do between two sampling instants; counting the swings of the dots.'),
        explanation: text(
            'Slika spet kaže \\(23\\ \\mathrm{Hz}\\) in \\(24\\) posnetkov na sekundo, ob času \\(t=0{,}5\\ \\mathrm{s}\\). Drsnik časa ni vezan na posnetke: postaviš ga lahko tudi med dve črtici pod grafom. Napoved: kaj se zgodi s polno in kaj s črtkano puščico, ko čas premakneš na \\(0{,}52\\ \\mathrm{s}\\) in nato na \\(0{,}55\\ \\mathrm{s}\\)? Kateri posnetek je tedaj zadnji?',
            'The picture again shows \\(23\\ \\mathrm{Hz}\\) and \\(24\\) samples per second, at the time \\(t=0.5\\ \\mathrm{s}\\). The time slider is not tied to the samples: you can also put it between two ticks below the graph. Prediction: what happens to the solid and what to the dashed arrow when you move the time to \\(0.52\\ \\mathrm{s}\\) and then to \\(0.55\\ \\mathrm{s}\\)? Which sample is the last one then?',
        ),
        formulaIds: [],
        observationPrompt: text(
            'Zapiši napoved. Nato nastavi Čas t na \\(0{,}52\\) in na \\(0{,}55\\) ter vsakič preberi Zadnji vzorec in primerjaj puščici. Nazadnje preštej, kolikokrat se pike od \\(t=0\\) do \\(t=1\\) dvignejo in spustijo, in primerjaj s tanko krivuljo.',
            'Write down your prediction. Then set Time t to \\(0.52\\) and to \\(0.55\\), each time read Last sample and compare the arrows. Finally count how many times the dots go up and down from \\(t=0\\) to \\(t=1\\), and compare with the thin curve.',
        ),
        expectedObservations: [text(
            'Ob \\(t=0{,}5\\) sta puščici enaki (\\(n=12\\)). Ob \\(0{,}52\\) je zadnji vzorec še \\(n=12\\) (\\(0{,}52\\cdot24=12{,}48\\)): polna puščica miruje, črtkana pa se je zavrtela naprej za \\(23\\cdot0{,}02=0{,}46\\) obrata. Ob \\(0{,}55\\) je zadnji vzorec \\(n=13\\) (\\(0{,}55\\cdot24=13{,}2\\), trenutek \\(\\tfrac{13}{24}\\approx0{,}5417\\ \\mathrm{s}\\)) in polna puščica skoči za \\(15^\\circ\\) nazaj. Vzorčevalnik so trenutki \\(\\tfrac{n}{24}\\), ne drsnik. Pike se v oknu dvignejo in spustijo samo enkrat, tanka krivulja pa ima \\(23\\) period.',
            'At \\(t=0.5\\) the arrows coincide (\\(n=12\\)). At \\(0.52\\) the last sample is still \\(n=12\\) (\\(0.52\\cdot24=12.48\\)): the solid arrow stays, while the dashed one has turned forwards by \\(23\\cdot0.02=0.46\\) of a turn. At \\(0.55\\) the last sample is \\(n=13\\) (\\(0.55\\cdot24=13.2\\), instant \\(\\tfrac{13}{24}\\approx0.5417\\ \\mathrm{s}\\)) and the solid arrow jumps back by \\(15^\\circ\\). The sampler is the instants \\(\\tfrac{n}{24}\\), not the slider. The dots go up and down only once in the window, while the thin curve has \\(23\\) periods.',
        )],
        scene: samplingScene('wv4-instants-scene', {f: WV4_FAST, fs: WV4_RATE, showAlias: false, t: WV4_INSTANT_TIME},
            'Vzorčenje, kolo \\(23\\ \\mathrm{Hz}\\), \\(24\\) posnetkov na sekundo, alias val skrit, čas \\(0{,}5\\): zadnji vzorec \\(n=12\\), obe puščici sovpadata.',
            'Sampling, wheel \\(23\\ \\mathrm{Hz}\\), \\(24\\) samples per second, alias wave hidden, time \\(0.5\\): last sample \\(n=12\\), both arrows coincide.'),
    }),
    step({
        id: 'wv4-alias-wave', order: 5,
        title: text('Val skozi iste pike', 'A wave through the same dots'),
        purpose: text('Napovedati, da val z navidezno frekvenco poteka skozi vse pike, in to utemeljiti.', 'Predicting that the wave with the apparent frequency passes through all the dots, and justifying it.'),
        explanation: text(
            'Slika kaže pravi val s \\(23\\ \\mathrm{Hz}\\) in \\(25\\) pik ob trenutkih \\(\\tfrac{n}{24}\\) v oknu od \\(0\\) do \\(1\\ \\mathrm{s}\\). Odčitek Navidezna frekvenca kaže število iz prejšnjih korakov. Napoved z razlogom: ali gre kosinusni val s to navidezno frekvenco skozi vse pike, ne le skozi nekatere, čeprav ima med pikami popolnoma drugačno obliko kot pravi val?',
            'The picture shows the true wave of \\(23\\ \\mathrm{Hz}\\) and \\(25\\) dots at the instants \\(\\tfrac{n}{24}\\) in the window from \\(0\\) to \\(1\\ \\mathrm{s}\\). The readout Apparent frequency shows the number from the previous steps. Prediction with a reason: does a cosine wave with this apparent frequency pass through all the dots, not only through some of them, although between the dots it has a completely different shape from the true wave?',
        ),
        formulaIds: [],
        observationPrompt: text(
            'Zapiši napoved in razlog. Nato vklopi stikalo Pojav lažne frekvence (aliasing) in primerjaj črtkani val s pikami in s tanko krivuljo.',
            'Write down your prediction and the reason. Then switch on the switch Aliasing and compare the dashed wave with the dots and with the thin curve.',
        ),
        expectedObservations: [text(
            'Črtkani val z navidezno frekvenco \\(-1\\ \\mathrm{Hz}\\) gre skozi vseh \\(25\\) pik; med njimi se od tanke krivulje močno loči, saj ima ena perioda, tanka pa \\(23\\). Utemeljitev je periodičnost kosinusa: za celo število \\(n\\) je \\(\\tfrac{23n}{24}=n-\\tfrac{n}{24}\\), torej \\(\\cos\\!\\left(2\\pi\\tfrac{23n}{24}\\right)=\\cos\\!\\left(2\\pi n-2\\pi\\tfrac{n}{24}\\right)=\\cos\\!\\left(2\\pi\\cdot(-1)\\tfrac{n}{24}\\right)\\). Enako velja pri vsaki fazi. Graf obe krivulji izračuna ob istih trenutkih; kolo je ponazoritev, dokaz pa je periodičnost.',
            'The dashed wave with the apparent frequency \\(-1\\ \\mathrm{Hz}\\) passes through all \\(25\\) dots; between them it differs strongly from the thin curve, as it has one period and the thin curve \\(23\\). The reason is the periodicity of the cosine: for an integer \\(n\\), \\(\\tfrac{23n}{24}=n-\\tfrac{n}{24}\\), so \\(\\cos\\!\\left(2\\pi\\tfrac{23n}{24}\\right)=\\cos\\!\\left(2\\pi n-2\\pi\\tfrac{n}{24}\\right)=\\cos\\!\\left(2\\pi\\cdot(-1)\\tfrac{n}{24}\\right)\\). The same holds at every phase. The graph evaluates both curves at the same instants; the wheel is an illustration, and the proof is the periodicity.',
        )],
        scene: samplingScene('wv4-alias-wave-scene', {f: WV4_FAST, fs: WV4_RATE, showAlias: false, t: 0},
            'Vzorčenje, kolo \\(23\\ \\mathrm{Hz}\\), \\(24\\) posnetkov na sekundo, alias val skrit, čas \\(0\\): navidezna frekvenca \\(-1\\) obr/s; izhodišče, v katerem se vklopi alias val.',
            'Sampling, wheel \\(23\\ \\mathrm{Hz}\\), \\(24\\) samples per second, alias wave hidden, time \\(0\\): apparent frequency \\(-1\\) rev/s; the starting point from which the alias wave is switched on.'),
    }),
    step({
        id: 'wv4-change-fs', order: 6,
        title: text('Spremeni frekvenco vzorčenja', 'Change the sampling rate'),
        purpose: text('Napovedati navidezno frekvenco pri treh nastavitvah in jih primerjati z odčitki.', 'Predicting the apparent frequency at three settings and comparing them with the readouts.'),
        explanation: text(
            'Slika kaže kolo z \\(9\\ \\mathrm{Hz}\\) ob \\(24\\) posnetkih na sekundo. Napoved za vsako od treh nastavitev, preden jo narediš: (a) frekvenca vzorčenja \\(12\\ \\mathrm{Hz}\\); (b) nato frekvenca tona \\(6\\ \\mathrm{Hz}\\) pri istih \\(12\\ \\mathrm{Hz}\\); (c) nato frekvenca tona \\(13\\ \\mathrm{Hz}\\) in frekvenca vzorčenja spet \\(24\\ \\mathrm{Hz}\\). Kakšna bo navidezna frekvenca in kako se bo kolo videlo vrteti?',
            'The picture shows the wheel at \\(9\\ \\mathrm{Hz}\\) with \\(24\\) samples per second. Predict each of three settings before you make it: (a) the sampling rate \\(12\\ \\mathrm{Hz}\\); (b) then the frequency of the tone \\(6\\ \\mathrm{Hz}\\) at the same \\(12\\ \\mathrm{Hz}\\); (c) then the frequency of the tone \\(13\\ \\mathrm{Hz}\\) and the sampling rate again \\(24\\ \\mathrm{Hz}\\). What will the apparent frequency be and how will the wheel seem to turn?',
        ),
        formulaIds: [],
        observationPrompt: text(
            'Zapiši tri napovedi. Nato nastavi (a) Frekvenca vzorčenja v Hz na \\(12\\); (b) Frekvenca tona v Hz na \\(6\\); (c) Frekvenca tona v Hz na \\(13\\) in Frekvenca vzorčenja v Hz na \\(24\\). Vsakič preberi Navidezno gibanje in Navidezno frekvenco.',
            'Write down three predictions. Then set (a) Sampling rate in Hz to \\(12\\); (b) Frequency of the tone in Hz to \\(6\\); (c) Frequency of the tone in Hz to \\(13\\) and Sampling rate in Hz to \\(24\\). Each time read Apparent motion and Apparent frequency.',
        ),
        expectedObservations: [text(
            '(a) Kolo se navidezno vrti nazaj s frekvenco \\(3\\ \\mathrm{Hz}\\), Navidezna frekvenca \\(-3\\) obr/s (\\(9-12=-3\\)). (b) Navidezna frekvenca ni določena, stanje piše, da pri \\(2f=f_s\\) smeri vrtenja ni mogoče določiti; alias val ni narisan, odčitek Vzorca pri 2f = fs pa piše \\(1\\) in \\(-1\\). (c) Kolo se navidezno vrti nazaj s frekvenco \\(11\\ \\mathrm{Hz}\\), Navidezna frekvenca \\(-11\\) obr/s (\\(13-24=-11\\)). V vseh treh primerih Nyquistova frekvenca piše, da je frekvenca vzorčenja pod \\(2f\\) ali enaka njej; obrazec v naslednjem koraku daje enake vrednosti.',
            '(a) The wheel seems to turn backwards at \\(3\\ \\mathrm{Hz}\\), Apparent frequency \\(-3\\) rev/s (\\(9-12=-3\\)). (b) Apparent frequency is not defined, the status says that at \\(2f=f_s\\) the direction of turning cannot be determined; no alias wave is drawn, and the readout Samples at 2f = fs says \\(1\\) and \\(-1\\). (c) The wheel seems to turn backwards at \\(11\\ \\mathrm{Hz}\\), Apparent frequency \\(-11\\) rev/s (\\(13-24=-11\\)). In all three cases the Nyquist rate row says the sampling rate is below \\(2f\\) or equal to it; the formula in the next step gives the same values.',
        )],
        scene: samplingScene('wv4-change-fs-scene', {f: WV4_CHANGE_F, fs: WV4_RATE, showAlias: true, t: 0},
            'Vzorčenje, kolo \\(9\\ \\mathrm{Hz}\\), \\(24\\) posnetkov na sekundo, alias val prikazan, čas \\(0\\): kolo se navidezno vrti naprej z \\(9\\ \\mathrm{Hz}\\); izhodišče, v katerem se frekvenca vzorčenja zmanjša na \\(12\\ \\mathrm{Hz}\\).',
            'Sampling, wheel \\(9\\ \\mathrm{Hz}\\), \\(24\\) samples per second, alias wave shown, time \\(0\\): the wheel seems to turn forwards at \\(9\\ \\mathrm{Hz}\\); the starting point from which the sampling rate is lowered to \\(12\\ \\mathrm{Hz}\\).'),
    }),
    step({
        id: 'wv4-explore', order: 7,
        title: text('Prosto raziskovanje', 'Free exploration'),
        purpose: text('Napovedati navidezno frekvenco po obrazcu za lastni nastavitvi in poiskati kolo, ki navidezno miruje.', 'Predicting the apparent frequency by the formula for settings of your own and finding a wheel that seems to stand still.'),
        explanation: text(
            'Obrazec spodaj povzame korake; primer za \\(f=40\\ \\mathrm{Hz}\\) je izračunan. Slika kaže kolo z \\(23\\ \\mathrm{Hz}\\) ob \\(24\\) posnetkih na sekundo, alias val je prikazan. Izberi svoj \\(f\\) (od \\(1\\) do \\(40\\)) in \\(f_s\\) (od \\(2\\) do \\(64\\)), najprej po obrazcu izračunaj \\(f_a\\), nato primerjaj z odčitkom Navidezna frekvenca. Poišči še nastavitev, pri kateri kolo navidezno miruje, in nastavitev, pri kateri navidezne frekvence ni mogoče določiti. Krivulje so narisane z \\(2048\\) točkami na sekundo, kar piše odčitek Ločljivost risanja.',
            'The formula below sums up the steps; the example for \\(f=40\\ \\mathrm{Hz}\\) is worked out. The picture shows the wheel at \\(23\\ \\mathrm{Hz}\\) with \\(24\\) samples per second, the alias wave is shown. Choose your own \\(f\\) (from \\(1\\) to \\(40\\)) and \\(f_s\\) (from \\(2\\) to \\(64\\)), first compute \\(f_a\\) by the formula, then compare with the readout Apparent frequency. Also find a setting at which the wheel seems to stand still and a setting at which the apparent frequency cannot be determined. The curves are drawn with \\(2048\\) points per second, as the readout Drawing resolution says.',
        ),
        formulaIds: ['alias-frequency'],
        workedExampleId: 'wv4-wheel-40',
        observationPrompt: text(
            'Najprej izračunaj \\(f_a\\) po obrazcu, nato ga primerjaj z odčitkom Navidezna frekvenca; poišči nastavitvi za mirovanje in za nedoločeno frekvenco.',
            'First compute \\(f_a\\) by the formula, then compare it with the readout Apparent frequency; find the settings for standing still and for the undetermined frequency.',
        ),
        expectedObservations: [text(
            'Račun in odčitek se ujemata. Kolo navidezno miruje, kadar je \\(f\\) večkratnik \\(f_s\\), na primer \\(f=24\\ \\mathrm{Hz}\\) pri \\(f_s=24\\ \\mathrm{Hz}\\): Navidezna frekvenca \\(0\\) obr/s, stanje piše, da kolo navidezno miruje. Nedoločeno je pri \\(2f=f_s\\), na primer \\(f=6\\ \\mathrm{Hz}\\) pri \\(f_s=12\\ \\mathrm{Hz}\\). Primer: \\(f=40\\ \\mathrm{Hz}\\) pri \\(24\\ \\mathrm{Hz}\\) daje \\(-8\\) obr/s.',
            'The computation and the readout agree. The wheel seems to stand still when \\(f\\) is a multiple of \\(f_s\\), for example \\(f=24\\ \\mathrm{Hz}\\) at \\(f_s=24\\ \\mathrm{Hz}\\): Apparent frequency \\(0\\) rev/s, the status says the wheel seems to stand still. It is undetermined at \\(2f=f_s\\), for example \\(f=6\\ \\mathrm{Hz}\\) at \\(f_s=12\\ \\mathrm{Hz}\\). Example: \\(f=40\\ \\mathrm{Hz}\\) at \\(24\\ \\mathrm{Hz}\\) gives \\(-8\\) rev/s.',
        )],
        scene: samplingScene('wv4-explore-scene', {f: WV4_FAST, fs: WV4_RATE, showAlias: true, t: 0},
            'Začetni primer: vzorčenje, kolo \\(23\\ \\mathrm{Hz}\\), \\(24\\) posnetkov na sekundo, alias val prikazan, čas \\(0\\).',
            'The starting case: sampling, wheel \\(23\\ \\mathrm{Hz}\\), \\(24\\) samples per second, alias wave shown, time \\(0\\).'),
    }),
];

// ---- Lessons ---------------------------------------------------------------------------------------------------------------------

const sources: GuidedLesson['sources'] = [
    {
        id: 'bezeg-waves-sampling-implementation',
        citation: 'Bezeg source: src/waves/sampling.ts (alias and Nyquist decision on integers) and src/graphs/functions/WavesGraph.tsx (sampling mode).',
        implementationCorrespondence: 'A scene sets the sampling mode, the tone, the sampling rate, the switches and the time of the waves graph; every number is a readout of that graph (frequencies in hertz, time in seconds), the text quotes only values of those scenes, values the learner reads after an action the text asks for, or values of arithmetic shown in the same step.',
    },
];

export const wavesAliasingLesson: GuidedLesson = {
    demonstrationId: 'waves',
    title: text('Vzorčenje in pojav lažne frekvence', 'Sampling and aliasing'),
    summary: text(
        'Kolo, ki se vrti, filmamo z določeno frekvenco posnetkov. Z grafom raziščemo, kaj nam film pove o dejanskem vrtenju, in to utemeljimo.',
        'A turning wheel is filmed at a fixed rate of samples. With the graph we explore what the film tells us about the real rotation, and justify it.',
    ),
    prerequisites: [text('Lekcija Seštevanje valov in faza (prva lekcija poglavja) ter kosinusni val s frekvenco in fazo.', 'The lesson Superposition and phase (the first lesson of the chapter) and the cosine wave with frequency and phase.')],
    learningGoals: [
        text('Veš, da se vrtenje, opazovano le ob trenutkih \\(\\tfrac{n}{f_s}\\), lahko vidi kot počasnejše ali celo nasprotno vrtenje.', 'Know that a rotation observed only at the instants \\(\\tfrac{n}{f_s}\\) can look like a slower or even a reversed rotation.'),
        text('Znaš izračunati navidezno frekvenco \\(f_a=f-kf_s\\) in jo primerjati z odčitkom grafa.', 'Can compute the apparent frequency \\(f_a=f-kf_s\\) and compare it with the readout of the graph.'),
        text('Znaš utemeljiti, da valova s \\(f\\) in \\(f_a\\) dasta enake vzorce, s periodičnostjo kosinusa; kolo je le ponazoritev.', 'Can justify, by the periodicity of the cosine, that the waves with \\(f\\) and \\(f_a\\) give equal samples; the wheel is only an illustration.'),
    ],
    formulaBlocks: wv4Formulas,
    workedExamples: wv4Examples,
    steps: wv4Steps,
    sources,
    edgeCases: [
        text('Pri \\(2f=f_s\\) (in kadar je \\(2f\\) lih večkratnik \\(f_s\\)) navidezne frekvence ni mogoče določiti: graf piše ni določeno in alias vala ne nariše.', 'At \\(2f=f_s\\) (and when \\(2f\\) is an odd multiple of \\(f_s\\)) the apparent frequency cannot be determined: the graph writes not defined and draws no alias wave.'),
        text('Če je \\(f\\) večkratnik \\(f_s\\), je navidezna frekvenca \\(0\\) in kolo navidezno miruje.', 'If \\(f\\) is a multiple of \\(f_s\\), the apparent frequency is \\(0\\) and the wheel seems to stand still.'),
        text('Vzorčevalnik so trenutki \\(\\tfrac{n}{f_s}\\), ne osveževanje zaslona; navidezna frekvenca je izračunana z vsemi celimi števili, tanke krivulje pa so narisane z \\(2048\\) točkami na sekundo, kar do \\(40\\ \\mathrm{Hz}\\) risanja ne popači (napaka tetive največ \\(0{,}00188\\) amplitude).', 'The sampler is the instants \\(\\tfrac{n}{f_s}\\), not the screen refresh; the apparent frequency is computed in integers, and the thin curves are drawn with \\(2048\\) points per second, which up to \\(40\\ \\mathrm{Hz}\\) does not distort the drawing (chord error at most \\(0.00188\\) of the amplitude).'),
    ],
    unresolvedQuestions: [],
};
