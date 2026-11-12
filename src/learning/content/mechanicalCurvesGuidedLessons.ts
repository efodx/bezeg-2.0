/**
 * Guided lessons of the mechanical-curves family, batch A (docs/specs/mechanical-curves-lessons.md): MC1, the race, and MC2, drag the track, both on
 * `mechanics-descent` (DescentGraph). Each is the lesson of one section of the mechanical-curves chapter (mechanicalCurvesChapterRegistry.ts adapts them on
 * request; the lesson catalog holds none, as it keeps one lesson per Demonstration). Scenes use only the `descent` actions the graph registers (`set-mode`,
 * `set-params`, `set-time`) and every scene starts from the Demonstration default and names what it sets; no scene starts playback. Every number the text
 * quotes is a readout of the graph for that scene, a value the learner reads after an action the text asks for, or a value of a formula shown in the same
 * step; the numbers are listed per step in docs/reviews/feature-streams/families-prep/notes/f3-mech-a.md.
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

/** The fields `set-params` may carry (the stored fields of the graph other than the mode). */
export interface DescentSceneParams {
    readonly radius?: number;
    readonly endX?: number;
    readonly endY?: number;
    readonly p1x?: number;
    readonly p1y?: number;
    readonly p2x?: number;
    readonly p2y?: number;
    readonly showCycloid?: boolean;
}

/** What a descent scene sets: the experiment (the Demonstration default is the race), the parameters and the time in seconds. */
export interface DescentSceneSpec {
    readonly mode?: 'race' | 'track';
    readonly params?: DescentSceneParams;
    readonly t: number;
}

/** The actions of a descent scene: the Demonstration default, the mode (it resets the time), the parameters, then the time. */
export const descentSceneActions = (id: string, spec: DescentSceneSpec): LessonAction[] => [
    {kind: 'prepared-scene', sceneId: id, source: 'demonstration-default'},
    ...(spec.mode !== undefined && spec.mode !== 'race' ? [{kind: 'descent', operation: 'set-mode', mode: spec.mode} as const] : []),
    ...(spec.params !== undefined ? [{kind: 'descent', operation: 'set-params', ...spec.params} as const] : []),
    {kind: 'descent', operation: 'set-time', t: spec.t},
];

const descentScene = (id: string, spec: DescentSceneSpec, sl: string, en: string): LessonScene =>
    ({id, basedOn: 'demonstration-default', actions: descentSceneActions(id, spec), expectedState: text(sl, en)});

/** The slider end of the race with r = 1 (the slowest time 1,189 rounded up to the 0,01 grid). */
export const MC1_END = 1.19;
/** The track experiments: the default track and the two tracks to the end B = (3; 1,5) used by steps 3 and 5. */
export const MC2_B_SHORT = {endX: 3, endY: 1.5} as const;
export const MC2_LINE = {...MC2_B_SHORT, p1x: 1, p1y: 0.5, p2x: 2, p2y: 1} as const;
export const MC2_BENT = {...MC2_B_SHORT, p1x: 0.5, p1y: 1, p2x: 2, p2y: 1.75} as const;
export const MC2_CLOSE = {...MC2_B_SHORT, p1x: 0.25, p1y: 1, p2x: 1.5, p2y: 1.75} as const;
export const MC2_DRAGGED = {p1x: 0.25, p1y: 1.5, p2x: 1.5, p2y: 2.5} as const;
export const MC2_HORIZONTAL = {p1x: 1, p1y: 0} as const;

// ---- MC1 -------------------------------------------------------------------------------------------------------------------------

const mc1Formulas: readonly FormulaBlock[] = [
    {
        id: 'speed-energy',
        latex: 'v=\\sqrt{2gy},\\qquad T=\\int\\frac{\\mathrm{d}s}{\\sqrt{2gy}}',
        notation: text(
            '\\(y\\) je globina kroglice pod začetkom \\(A\\) v metrih, \\(g=9{,}81\\ \\mathrm{m/s^2}\\) težni pospešek (v modelu stalnica), \\(v\\) hitrost kroglice, \\(s\\) dolžina loka tira in \\(T\\) čas spusta.',
            '\\(y\\) is the depth of the bead below the start \\(A\\) in metres, \\(g=9.81\\ \\mathrm{m/s^2}\\) the gravitational acceleration (a constant of the model), \\(v\\) the speed of the bead, \\(s\\) the arc length of the track and \\(T\\) the descent time.',
        ),
        explanation: text(
            'Brez trenja se energija ohranja, zato je hitrost kroglice odvisna samo od globine: \\(\\tfrac12 v^2=gy\\). Čas spusta je vsota majhnih časov \\(\\mathrm{d}s/v\\) po vsej poti. Kroglica ne gre po tiru hitreje samo zato, ker je tir krajši: šteje, kako hitro pridobi globino.',
            'Without friction energy is conserved, so the speed of the bead depends on the depth only: \\(\\tfrac12 v^2=gy\\). The descent time is the sum of the small times \\(\\mathrm{d}s/v\\) along the whole path. A bead is not quicker on a track merely because the track is shorter: what counts is how fast it gains depth.',
        ),
    },
    {
        id: 'closed-forms',
        latex: 'T_{c}=\\pi\\sqrt{\\frac{r}{g}},\\qquad T_{l}=\\frac{L}{\\sqrt{gr}},\\quad L=\\sqrt{\\pi^2r^2+4r^2}',
        notation: text(
            '\\(T_c\\) je čas po cikloidi s polmerom kotalečega se kroga \\(r\\), \\(T_l\\) čas po premici od \\(A=(0;\\,0)\\) do \\(B=(\\pi r;\\,2r)\\) in \\(L\\) njena dolžina.',
            '\\(T_c\\) is the time along the cycloid with rolling-circle radius \\(r\\), \\(T_l\\) the time along the line from \\(A=(0;\\,0)\\) to \\(B=(\\pi r;\\,2r)\\) and \\(L\\) its length.',
        ),
        explanation: text(
            'Obe zaprti formuli veljata za ta dva tira: na cikloidi je kot kotaljenja \\(\\theta=t\\sqrt{g/r}\\) in doseže \\(\\pi\\) ob \\(t=\\pi\\sqrt{r/g}\\); po premici kroglica enakomerno pospešuje s pospeškom \\(g\\sin\\alpha=2gr/L\\), zato je \\(T=L/\\sqrt{gr}\\). Za krožni lok zaprte formule ni; njegov čas izračuna graf s številskim integriranjem.',
            'Both closed forms hold for these two tracks: on the cycloid the rolling angle is \\(\\theta=t\\sqrt{g/r}\\) and reaches \\(\\pi\\) at \\(t=\\pi\\sqrt{r/g}\\); along the line the bead accelerates uniformly with \\(g\\sin\\alpha=2gr/L\\), so \\(T=L/\\sqrt{gr}\\). The circular arc has no closed form; the graph computes its time by numerical integration.',
        ),
    },
];

const mc1Examples: readonly WorkedExample[] = [
    {
        id: 'mc1-closed',
        title: text('Časa po cikloidi in po premici pri \\(r=1\\ \\mathrm{m}\\)', 'The times along the cycloid and along the line for \\(r=1\\ \\mathrm{m}\\)'),
        calculationLatex: 'T_c=\\pi\\sqrt{\\frac{1}{9{,}81}},\\qquad L=\\sqrt{\\pi^2+4},\\quad T_l=\\frac{L}{\\sqrt{9{,}81\\cdot 1}}',
        resultLatex: 'T_c=1{,}0030,\\qquad L=3{,}7242,\\qquad T_l=1{,}1890',
        check: text(
            'Odčitka grafa sta \\(1{,}003\\ \\mathrm{s}\\) in \\(1{,}189\\ \\mathrm{s}\\), enaka zaprtima formulama na tri mesta. Količnik \\(1{,}1890/1{,}0030\\) je okoli \\(1{,}185\\), premica je torej počasnejša za \\(18{,}5\\,\\%\\).',
            'The readouts of the graph are \\(1.003\\ \\mathrm{s}\\) and \\(1.189\\ \\mathrm{s}\\), equal to the closed forms to three places. The quotient \\(1.1890/1.0030\\) is about \\(1.185\\), so the line is slower by \\(18.5\\,\\%\\).',
        ),
    },
];

const mc1Steps: readonly GuidedLessonStep[] = [
    step({
        id: 'mc1-start', order: 1,
        title: text('Trije tiri od \\(A\\) do \\(B\\)', 'Three tracks from \\(A\\) to \\(B\\)'),
        purpose: text('Napovedati zmagovalca, preden spustimo kroglice.', 'Predicting the winner before the beads are released.'),
        explanation: text(
            'Kroglica drsi brez trenja po tiru, to je po krivulji, po kateri teče. Vsi trije tiri se začnejo v točki \\(A\\) in končajo v isti točki \\(B\\), ki je konec enega loka cikloide s polmerom kotalečega se kroga \\(r=1\\ \\mathrm{m}\\), torej približno \\((3{,}14;\\,2)\\ \\mathrm{m}\\) (graf jo izračuna). To so premica, krožni lok in cikloida. Ponazoritev: graf pokaže tri tire in ne razloži, zakaj je eden najhitrejši. Preden premakneš čas, napovej, po katerem tiru bo kroglica prva v \\(B\\).',
            'A bead slides without friction along a track, that is, along the curve it runs on. All three tracks start at the point \\(A\\) and end at the same point \\(B\\), the end of one arch of the cycloid with rolling-circle radius \\(r=1\\ \\mathrm{m}\\), so approximately \\((3.14;\\,2)\\ \\mathrm{m}\\) (the graph computes it). They are a line, a circular arc and a cycloid. Illustration: the graph shows three tracks and does not explain why one is fastest. Before you move the time, predict which track brings the bead to \\(B\\) first.',
        ),
        formulaIds: [],
        observationPrompt: text('Zapiši napoved, nato v odčitku preberi konec \\(B\\).', 'Write down your prediction, then read the end \\(B\\) in the readout.'),
        expectedObservations: [text('Konec \\(B\\) je približno \\((3{,}14;\\,2)\\ \\mathrm{m}\\); ob času \\(0\\) so vse kroglice v \\(A\\).', 'The end \\(B\\) is approximately \\((3.14;\\,2)\\ \\mathrm{m}\\); at time \\(0\\) all beads are at \\(A\\).')],
        scene: descentScene('mc1-start-scene', {t: 0},
            'Tekma, \\(r=1\\ \\mathrm{m}\\), čas \\(0\\): tri kroglice v \\(A\\), konec \\(B\\) je \\((3{,}14;\\,2)\\ \\mathrm{m}\\).',
            'The race, \\(r=1\\ \\mathrm{m}\\), time \\(0\\): three beads at \\(A\\), the end \\(B\\) is \\((3.14;\\,2)\\ \\mathrm{m}\\).'),
    }),
    step({
        id: 'mc1-release', order: 2,
        title: text('Spusti kroglice', 'Release the beads'),
        purpose: text('Opazovati, katera kroglica je ob izbranem času najnižje.', 'Watching which bead is lowest at a chosen time.'),
        explanation: text(
            'Premakni drsnik časa od \\(0\\) do \\(1{,}19\\ \\mathrm{s}\\) ali pritisni Predvajaj. Pri času \\(0{,}4\\ \\mathrm{s}\\) je kroglica na premici višje kakor kroglici na loku in na cikloidi; ostali dve sta že precej globlje. Opazuj, katera kroglica prva doseže \\(B\\), in primerjaj z napovedjo.',
            'Move the time slider from \\(0\\) to \\(1.19\\ \\mathrm{s}\\) or press Play. At time \\(0.4\\ \\mathrm{s}\\) the bead on the line is higher than the beads on the arc and on the cycloid; those two are already much deeper. Watch which bead reaches \\(B\\) first and compare with your prediction.',
        ),
        formulaIds: [],
        observationPrompt: text('Poglej, katera kroglica je pri \\(0{,}4\\ \\mathrm{s}\\) najviše in katera prva doseže \\(B\\).', 'Look at which bead is highest at \\(0.4\\ \\mathrm{s}\\) and which reaches \\(B\\) first.'),
        expectedObservations: [text('Pri \\(0{,}4\\ \\mathrm{s}\\) je kroglica na premici najviše; prva v \\(B\\) je kroglica na cikloidi.', 'At \\(0.4\\ \\mathrm{s}\\) the bead on the line is the highest; the first at \\(B\\) is the bead on the cycloid.')],
        scene: descentScene('mc1-release-scene', {t: 0.4},
            'Tekma, čas \\(0{,}4\\ \\mathrm{s}\\): kroglica na premici je najviše, kroglici na loku in cikloidi sta globlje.',
            'The race, time \\(0.4\\ \\mathrm{s}\\): the bead on the line is the highest, the beads on the arc and the cycloid are deeper.'),
    }),
    step({
        id: 'mc1-readouts', order: 3,
        title: text('Časi spusta', 'The descent times'),
        purpose: text('Primerjati izračunane čase in preveriti zaprti formuli.', 'Comparing the computed times and checking the two closed forms.'),
        explanation: text(
            'Ponazoritev: ob koncu poskusa preberi časa spusta vseh treh tirov. Cikloida potrebuje \\(1{,}003\\ \\mathrm{s}\\), krožni lok \\(1{,}0285\\ \\mathrm{s}\\), premica \\(1{,}189\\ \\mathrm{s}\\); graf napiše, da je najhitrejša cikloida in da je premica počasnejša za \\(18{,}5\\,\\%\\). Najkrajša pot, premica, torej ni najhitrejša. Zaprti formuli v zgledu potrdita časa cikloide in premice.',
            'Illustration: at the end of the run read the descent times of all three tracks. The cycloid needs \\(1.003\\ \\mathrm{s}\\), the circular arc \\(1.0285\\ \\mathrm{s}\\), the line \\(1.189\\ \\mathrm{s}\\); the graph says the cycloid is the fastest and the line is slower by \\(18.5\\,\\%\\). The shortest path, the line, is therefore not the fastest. The closed forms in the example confirm the times of the cycloid and the line.',
        ),
        formulaIds: ['closed-forms'],
        workedExampleId: 'mc1-closed',
        observationPrompt: text('Preberi tri čase, najhitrejšo kroglico in odstotek za premico.', 'Read the three times, the fastest bead and the percentage for the line.'),
        expectedObservations: [text('Cikloida \\(1{,}003\\ \\mathrm{s}\\), krožni lok \\(1{,}0285\\ \\mathrm{s}\\), premica \\(1{,}189\\ \\mathrm{s}\\); premica je počasnejša za \\(18{,}5\\,\\%\\).', 'Cycloid \\(1.003\\ \\mathrm{s}\\), circular arc \\(1.0285\\ \\mathrm{s}\\), line \\(1.189\\ \\mathrm{s}\\); the line is slower by \\(18.5\\,\\%\\).')],
        scene: descentScene('mc1-readouts-scene', {t: MC1_END},
            'Tekma, konec poskusa: cikloida \\(1{,}003\\ \\mathrm{s}\\), krožni lok \\(1{,}0285\\ \\mathrm{s}\\), premica \\(1{,}189\\ \\mathrm{s}\\); premica počasnejša za \\(18{,}5\\,\\%\\).',
            'The race, end of the run: cycloid \\(1.003\\ \\mathrm{s}\\), circular arc \\(1.0285\\ \\mathrm{s}\\), line \\(1.189\\ \\mathrm{s}\\); the line slower by \\(18.5\\,\\%\\).'),
    }),
    step({
        id: 'mc1-why', order: 4,
        title: text('Zakaj premica izgubi', 'Why the line loses'),
        purpose: text('Utemeljiti z ohranitvijo energije, da strm začetek prinese hitrost.', 'Arguing from conservation of energy that a steep start brings speed.'),
        explanation: text(
            'Argument: hitrost je \\(v=\\sqrt{2gy}\\), odvisna samo od globine. Premica od \\(A\\) do \\(B\\) se spusti pod kotom \\(\\arctan(2/\\pi)\\), približno \\(32{,}5^\\circ\\), cikloida in krožni lok pa zapustita \\(A\\) navpično. Kroglica, ki se najprej strmo spusti, hitro pridobi hitrost; na premici globino in z njo hitrost pridobiva počasneje. To je razlaga, kako se tekma izide, ne dokaz o vseh tirih. Pri času \\(0{,}5\\ \\mathrm{s}\\) lahko to vidiš: cikloida in krožni lok sta že globlje kakor premica.',
            'Argument: the speed is \\(v=\\sqrt{2gy}\\), which depends on the depth only. The line from \\(A\\) to \\(B\\) descends at the angle \\(\\arctan(2/\\pi)\\), approximately \\(32.5^\\circ\\), while the cycloid and the circular arc leave \\(A\\) vertically. A bead that first drops steeply gains speed fast; on the line it gains depth, and with it speed, more slowly. This explains how the race comes out; it is not a proof about all tracks. At time \\(0.5\\ \\mathrm{s}\\) you can see it: the cycloid and the circular arc are already deeper than the line.',
        ),
        formulaIds: ['speed-energy'],
        observationPrompt: text('Primerjaj začetni naklon premice z začetkom loka in cikloide ter globine kroglic ob \\(0{,}5\\ \\mathrm{s}\\).', 'Compare the initial slope of the line with the starts of the arc and the cycloid, and the depths of the beads at \\(0.5\\ \\mathrm{s}\\).'),
        expectedObservations: [text('Premica se začne položneje; ob \\(0{,}5\\ \\mathrm{s}\\) sta kroglici na loku in cikloidi globlje kakor kroglica na premici.', 'The line starts flatter; at \\(0.5\\ \\mathrm{s}\\) the beads on the arc and the cycloid are deeper than the bead on the line.')],
        scene: descentScene('mc1-why-scene', {t: 0.5},
            'Tekma, čas \\(0{,}5\\ \\mathrm{s}\\): kroglici na loku in cikloidi sta globlje kakor kroglica na premici.',
            'The race, time \\(0.5\\ \\mathrm{s}\\): the beads on the arc and the cycloid are deeper than the bead on the line.'),
    }),
    step({
        id: 'mc1-arc', order: 5,
        title: text('Krožni lok: strm, a vseeno počasnejši', 'The circular arc: steep, yet slower'),
        purpose: text('Videti, da strm začetek sam ne zadošča.', 'Seeing that a steep start alone is not enough.'),
        explanation: text(
            'Krožni lok ima navpično začetno tangento kakor cikloida. Najprej se spusti pod \\(B\\), do globine okoli \\(2{,}21\\ \\mathrm{m}\\), nato se dvigne do \\(B\\). Napovej, ali bo zaradi strmega začetka prvi v cilju. Pri času \\(1{,}1\\ \\mathrm{s}\\) sta kroglici na cikloidi in loku že v \\(B\\), kroglica na premici še ne. Krožni lok potrebuje \\(1{,}0285\\ \\mathrm{s}\\), cikloida \\(1{,}003\\ \\mathrm{s}\\): lok je počasnejši za okoli \\(2{,}5\\,\\%\\). Primerjava z dvema tiroma je preverjanje primera, ne dokaz, da je cikloida najhitrejša od vseh tirov; to je izrek variacijskega računa, ki ga tu samo navajamo.',
            'The circular arc has a vertical initial tangent like the cycloid. It first descends below \\(B\\), to a depth of about \\(2.21\\ \\mathrm{m}\\), and then rises to \\(B\\). Predict whether the steep start makes it first at the end. At time \\(1.1\\ \\mathrm{s}\\) the beads on the cycloid and the arc are already at \\(B\\), the bead on the line is not. The circular arc needs \\(1.0285\\ \\mathrm{s}\\), the cycloid \\(1.003\\ \\mathrm{s}\\): the arc is slower by about \\(2.5\\,\\%\\). Comparing two tracks checks one case; it does not prove that the cycloid is the fastest of all tracks. That is a theorem of the calculus of variations, which we only cite here.',
        ),
        formulaIds: [],
        observationPrompt: text('Preberi čas krožnega loka in cikloide ter poglej, kje je kroglica na premici ob \\(1{,}1\\ \\mathrm{s}\\).', 'Read the time of the circular arc and of the cycloid, and look where the bead on the line is at \\(1.1\\ \\mathrm{s}\\).'),
        expectedObservations: [text('Krožni lok \\(1{,}0285\\ \\mathrm{s}\\), cikloida \\(1{,}003\\ \\mathrm{s}\\); ob \\(1{,}1\\ \\mathrm{s}\\) kroglica na premici še drsi.', 'Circular arc \\(1.0285\\ \\mathrm{s}\\), cycloid \\(1.003\\ \\mathrm{s}\\); at \\(1.1\\ \\mathrm{s}\\) the bead on the line is still sliding.')],
        scene: descentScene('mc1-arc-scene', {t: 1.1},
            'Tekma, čas \\(1{,}1\\ \\mathrm{s}\\): cikloida in lok sta v \\(B\\), premica še ne; lok \\(1{,}0285\\ \\mathrm{s}\\), cikloida \\(1{,}003\\ \\mathrm{s}\\).',
            'The race, time \\(1.1\\ \\mathrm{s}\\): the cycloid and the arc are at \\(B\\), the line is not; arc \\(1.0285\\ \\mathrm{s}\\), cycloid \\(1.003\\ \\mathrm{s}\\).'),
    }),
    step({
        id: 'mc1-explore', order: 6,
        title: text('Prosto raziskovanje: polmer', 'Free exploration: the radius'),
        purpose: text('Spreminjati polmer \\(r\\) in opazovati, da se vrstni red ne spremeni.', 'Changing the radius \\(r\\) and seeing that the order does not change.'),
        explanation: text(
            'Spreminjaj polmer \\(r\\) od \\(0{,}25\\ \\mathrm{m}\\) do \\(3\\ \\mathrm{m}\\) s korakom \\(0{,}25\\ \\mathrm{m}\\). Vse dolžine se pomnožijo z istim faktorjem, zato se vsi časi pomnožijo s \\(\\sqrt r\\). Pri \\(r=0{,}25\\ \\mathrm{m}\\) so časi polovični: cikloida \\(0{,}5015\\ \\mathrm{s}\\), krožni lok \\(0{,}5142\\ \\mathrm{s}\\), premica \\(0{,}5945\\ \\mathrm{s}\\). Pri \\(r=3\\ \\mathrm{m}\\) preberi cikloido \\(1{,}7373\\ \\mathrm{s}\\), krožni lok \\(1{,}7814\\ \\mathrm{s}\\) in premico \\(2{,}0595\\ \\mathrm{s}\\). Vrstni red in odstotek \\(18{,}5\\,\\%\\) ostaneta.',
            'Change the radius \\(r\\) from \\(0.25\\ \\mathrm{m}\\) to \\(3\\ \\mathrm{m}\\) in steps of \\(0.25\\ \\mathrm{m}\\). All lengths are multiplied by the same factor, so all times are multiplied by \\(\\sqrt r\\). At \\(r=0.25\\ \\mathrm{m}\\) the times are halved: cycloid \\(0.5015\\ \\mathrm{s}\\), circular arc \\(0.5142\\ \\mathrm{s}\\), line \\(0.5945\\ \\mathrm{s}\\). At \\(r=3\\ \\mathrm{m}\\) read the cycloid \\(1.7373\\ \\mathrm{s}\\), the circular arc \\(1.7814\\ \\mathrm{s}\\) and the line \\(2.0595\\ \\mathrm{s}\\). The order and the percentage \\(18.5\\,\\%\\) stay.',
        ),
        formulaIds: ['closed-forms'],
        observationPrompt: text('Poišči polmer, pri katerem cikloida ni najhitrejša, in preveri, da je odstotek za premico povsod isti.', 'Look for a radius at which the cycloid is not the fastest, and check that the percentage for the line is the same everywhere.'),
        expectedObservations: [text('Cikloida je najhitrejša pri vseh polmerih; premica je počasnejša za \\(18{,}5\\,\\%\\).', 'The cycloid is the fastest at every radius; the line is slower by \\(18.5\\,\\%\\).')],
        scene: descentScene('mc1-explore-scene', {params: {radius: 0.25}, t: 0.6},
            'Tekma, \\(r=0{,}25\\ \\mathrm{m}\\), konec poskusa: cikloida \\(0{,}5015\\ \\mathrm{s}\\), krožni lok \\(0{,}5142\\ \\mathrm{s}\\), premica \\(0{,}5945\\ \\mathrm{s}\\).',
            'The race, \\(r=0.25\\ \\mathrm{m}\\), end of the run: cycloid \\(0.5015\\ \\mathrm{s}\\), circular arc \\(0.5142\\ \\mathrm{s}\\), line \\(0.5945\\ \\mathrm{s}\\).'),
    }),
];

// ---- MC2 -------------------------------------------------------------------------------------------------------------------------

const mc2Formulas: readonly FormulaBlock[] = [
    {
        id: 'bezier-track',
        latex: 'P(u)=(1-u)^3P_0+3u(1-u)^2P_1+3u^2(1-u)P_2+u^3P_3,\\quad u\\in[0,1]',
        notation: text(
            'Tir je kubična Bézierjeva krivulja s kontrolnimi točkami \\(P_0=A=(0;\\,0)\\), \\(P_1\\), \\(P_2\\) in \\(P_3=B\\). Druga koordinata vsake točke je globina pod \\(A\\).',
            'The track is a cubic Bézier curve with control points \\(P_0=A=(0;\\,0)\\), \\(P_1\\), \\(P_2\\) and \\(P_3=B\\). The second coordinate of each point is the depth below \\(A\\).',
        ),
        explanation: text(
            'Točke \\(P_1\\), \\(P_2\\) in \\(B\\) ležijo na mreži s korakom \\(0{,}25\\ \\mathrm{m}\\), zato je vsak tir določen z natančnimi številkami. Čas spusta je integral \\(T=\\int \\mathrm{d}s/\\sqrt{2gy}\\), ki ga graf pri vsakem premiku izračuna znova; odčitek je označen kot izračunan.',
            'The points \\(P_1\\), \\(P_2\\) and \\(B\\) lie on a grid with step \\(0.25\\ \\mathrm{m}\\), so every track is given by exact numbers. The descent time is the integral \\(T=\\int \\mathrm{d}s/\\sqrt{2gy}\\), which the graph recomputes at every move; the readout is marked as computed.',
        ),
    },
    {
        id: 'brachistochrone',
        latex: 'x=r(\\theta-\\sin\\theta),\\quad y=r(1-\\cos\\theta),\\qquad \\frac{\\theta_B-\\sin\\theta_B}{1-\\cos\\theta_B}=\\frac{x_B}{y_B},\\quad T=\\theta_B\\sqrt{\\frac{r}{g}}',
        notation: text(
            'Cikloida skozi \\(A\\) in \\(B=(x_B;\\,y_B)\\): \\(\\theta_B\\) je kot kotaljenja pri \\(B\\), \\(r\\) polmer kotalečega se kroga in \\(T\\) čas spusta po njej.',
            'The cycloid through \\(A\\) and \\(B=(x_B;\\,y_B)\\): \\(\\theta_B\\) is the rolling angle at \\(B\\), \\(r\\) the radius of the rolling circle and \\(T\\) the descent time along it.',
        ),
        explanation: text(
            'Kot \\(\\theta_B\\) je rešitev enačbe, ki jo graf reši številsko; polmer sledi iz \\(r=y_B/(1-\\cos\\theta_B)\\). Čas po cikloidi je zaprta formula \\(\\theta_B\\sqrt{r/g}\\). Cikloida skozi dve točki, ki jo imenujemo brahistohrona (krivulja najhitrejšega spusta), je po izreku variacijskega računa najhitrejša od vseh tirov.',
            'The angle \\(\\theta_B\\) solves an equation that the graph solves numerically; the radius follows from \\(r=y_B/(1-\\cos\\theta_B)\\). The time along the cycloid is the closed form \\(\\theta_B\\sqrt{r/g}\\). The cycloid through two points, called the brachistochrone (the curve of fastest descent), is by a theorem of the calculus of variations the fastest of all tracks.',
        ),
    },
];

const mc2Examples: readonly WorkedExample[] = [
    {
        id: 'mc2-cycloid',
        title: text('Cikloida skozi \\(A\\) in \\(B=(3{,}25;\\,2)\\)', 'The cycloid through \\(A\\) and \\(B=(3.25;\\,2)\\)'),
        calculationLatex: '\\theta_B=3{,}1947,\\quad r=\\frac{2}{1-\\cos\\theta_B}=1{,}0007,\\quad T=\\theta_B\\sqrt{\\frac{r}{g}}=3{,}1947\\sqrt{\\frac{1{,}0007}{9{,}81}}',
        resultLatex: 'T=1{,}0203',
        check: text(
            'Odčitka grafa sta \\(\\theta_B=3{,}1947\\ \\mathrm{rad}\\) in \\(r=1{,}0007\\ \\mathrm{m}\\), čas \\(1{,}0203\\ \\mathrm{s}\\) je enak zaprti formuli. Polmer je blizu \\(1\\ \\mathrm{m}\\) iz tekme, ker je \\(B\\) blizu konca loka cikloide s tem polmerom.',
            'The readouts of the graph are \\(\\theta_B=3.1947\\ \\mathrm{rad}\\) and \\(r=1.0007\\ \\mathrm{m}\\), and the time \\(1.0203\\ \\mathrm{s}\\) equals the closed form. The radius is close to the \\(1\\ \\mathrm{m}\\) of the race because \\(B\\) is near the end of an arch of the cycloid with that radius.',
        ),
    },
];

const mc2Steps: readonly GuidedLessonStep[] = [
    step({
        id: 'mc2-track', order: 1,
        title: text('Upogljiv tir in njegov čas', 'A flexible track and its time'),
        purpose: text('Predstaviti Bézierjev tir in napovedati, ali ga je mogoče upogniti hitreje od premice.', 'Introducing the Bézier track and predicting whether it can be bent to beat the line.'),
        explanation: text(
            'Tir je zdaj kubična Bézierjeva krivulja od \\(A\\) do \\(B=(3{,}25;\\,2)\\ \\mathrm{m}\\) s kontrolnima točkama \\(P_1\\) in \\(P_2\\). Poskus se imenuje Tir. Preden prebereš odčitke, napovej: ali je ta upognjen tir hitrejši ali počasnejši od premice do \\(B\\) in koliko, na oko? Nato preberi čase.',
            'The track is now a cubic Bézier curve from \\(A\\) to \\(B=(3.25;\\,2)\\ \\mathrm{m}\\) with control points \\(P_1\\) and \\(P_2\\). The experiment is called Track. Before you read the readouts, predict: is this bent track faster or slower than the line to \\(B\\), and by how much, by eye? Then read the times.',
        ),
        formulaIds: ['bezier-track'],
        observationPrompt: text('Preberi čas tira, čas premice in čas cikloide.', 'Read the time of the track, of the line and of the cycloid.'),
        expectedObservations: [text('Tir \\(1{,}0366\\ \\mathrm{s}\\), premica \\(1{,}2184\\ \\mathrm{s}\\), cikloida \\(1{,}0203\\ \\mathrm{s}\\); tir je hitrejši od premice.', 'Track \\(1.0366\\ \\mathrm{s}\\), line \\(1.2184\\ \\mathrm{s}\\), cycloid \\(1.0203\\ \\mathrm{s}\\); the track is faster than the line.')],
        scene: descentScene('mc2-track-scene', {mode: 'track', t: 0},
            'Poskus Tir, čas \\(0\\): tir \\(1{,}0366\\ \\mathrm{s}\\), premica \\(1{,}2184\\ \\mathrm{s}\\), cikloida \\(1{,}0203\\ \\mathrm{s}\\).',
            'The experiment Track, time \\(0\\): track \\(1.0366\\ \\mathrm{s}\\), line \\(1.2184\\ \\mathrm{s}\\), cycloid \\(1.0203\\ \\mathrm{s}\\).'),
    }),
    step({
        id: 'mc2-drag', order: 2,
        title: text('Povleci \\(P_1\\) in \\(P_2\\)', 'Drag \\(P_1\\) and \\(P_2\\)'),
        purpose: text('Videti, da odčitek časa sledi obliki tira.', 'Seeing that the time readout follows the shape of the track.'),
        explanation: text(
            'Povleci \\(P_1\\) in \\(P_2\\) ali jima vpiši koordinate: točki se držita mreže s korakom \\(0{,}25\\ \\mathrm{m}\\). Čas tira se spreminja z vsakim premikom. Pri \\(P_1=(0{,}25;\\,1{,}5)\\) in \\(P_2=(1{,}5;\\,2{,}5)\\) je čas \\(1{,}0331\\ \\mathrm{s}\\), razlika do cikloide pa \\(0{,}0127\\ \\mathrm{s}\\) (\\(1{,}2\\,\\%\\)). Poskusi še druge lege in opazuj, kdaj je čas manjši in kdaj večji.',
            'Drag \\(P_1\\) and \\(P_2\\) or type their coordinates: the points keep to a grid with step \\(0.25\\ \\mathrm{m}\\). The time of the track changes with every move. At \\(P_1=(0.25;\\,1.5)\\) and \\(P_2=(1.5;\\,2.5)\\) the time is \\(1.0331\\ \\mathrm{s}\\), and the difference to the cycloid is \\(0.0127\\ \\mathrm{s}\\) (\\(1.2\\,\\%\\)). Try other positions and watch when the time gets smaller and when larger.',
        ),
        formulaIds: [],
        observationPrompt: text('Preberi čas tira in razliko do cikloide.', 'Read the time of the track and the difference to the cycloid.'),
        expectedObservations: [text('Čas tira \\(1{,}0331\\ \\mathrm{s}\\), razlika do cikloide \\(0{,}0127\\ \\mathrm{s}\\) (\\(1{,}2\\,\\%\\)).', 'Time of the track \\(1.0331\\ \\mathrm{s}\\), difference to the cycloid \\(0.0127\\ \\mathrm{s}\\) (\\(1.2\\,\\%\\)).')],
        scene: descentScene('mc2-drag-scene', {mode: 'track', params: MC2_DRAGGED, t: 1.04},
            'Tir z \\(P_1=(0{,}25;\\,1{,}5)\\), \\(P_2=(1{,}5;\\,2{,}5)\\): čas \\(1{,}0331\\ \\mathrm{s}\\), razlika do cikloide \\(0{,}0127\\ \\mathrm{s}\\) (\\(1{,}2\\,\\%\\)).',
            'The track with \\(P_1=(0.25;\\,1.5)\\), \\(P_2=(1.5;\\,2.5)\\): time \\(1.0331\\ \\mathrm{s}\\), difference to the cycloid \\(0.0127\\ \\mathrm{s}\\) (\\(1.2\\,\\%\\)).'),
    }),
    step({
        id: 'mc2-line', order: 3,
        title: text('Premica ni najboljša', 'The line is not the best'),
        purpose: text('Primerjati ravni tir z upognjenim do iste točke.', 'Comparing a straight track with a bent one to the same point.'),
        explanation: text(
            'Konec \\(B\\) je zdaj \\((3;\\,1{,}5)\\ \\mathrm{m}\\), točki \\(P_1=(1;\\,0{,}5)\\) in \\(P_2=(2;\\,1)\\) pa ležita enakomerno na premici od \\(A\\) do \\(B\\): tir je premica in njegov čas \\(1{,}2365\\ \\mathrm{s}\\) je enak času premice. Povleci \\(P_1\\) v \\((0{,}5;\\,1)\\) in \\(P_2\\) v \\((2;\\,1{,}75)\\): tir se upogne, čas pade na \\(1{,}002\\ \\mathrm{s}\\). Za ta \\(B\\) torej upognjen tir premaga premico; več ta primer ne pove.',
            'The end \\(B\\) is now \\((3;\\,1.5)\\ \\mathrm{m}\\), and the points \\(P_1=(1;\\,0.5)\\) and \\(P_2=(2;\\,1)\\) lie evenly on the line from \\(A\\) to \\(B\\): the track is the line and its time \\(1.2365\\ \\mathrm{s}\\) equals the time of the line. Drag \\(P_1\\) to \\((0.5;\\,1)\\) and \\(P_2\\) to \\((2;\\,1.75)\\): the track bends and the time drops to \\(1.002\\ \\mathrm{s}\\). So for this \\(B\\) a bent track beats the line; this case shows at least that.',
        ),
        formulaIds: [],
        observationPrompt: text('Preberi čas tira in premice, nato upogni tir in preberi čas znova.', 'Read the time of the track and of the line, then bend the track and read the time again.'),
        expectedObservations: [text('Najprej sta časa tira in premice enaka, \\(1{,}2365\\ \\mathrm{s}\\); po upogibu je čas tira \\(1{,}002\\ \\mathrm{s}\\).', 'First the times of the track and of the line are equal, \\(1.2365\\ \\mathrm{s}\\); after bending the time of the track is \\(1.002\\ \\mathrm{s}\\).')],
        scene: descentScene('mc2-line-scene', {mode: 'track', params: MC2_LINE, t: 1.24},
            'Tir je premica do \\(B=(3;\\,1{,}5)\\): čas tira in premice je \\(1{,}2365\\ \\mathrm{s}\\), cikloida \\(0{,}9866\\ \\mathrm{s}\\).',
            'The track is the line to \\(B=(3;\\,1.5)\\): the time of the track and of the line is \\(1.2365\\ \\mathrm{s}\\), the cycloid \\(0.9866\\ \\mathrm{s}\\).'),
    }),
    step({
        id: 'mc2-cycloid', order: 4,
        title: text('Cikloida skozi \\(A\\) in \\(B\\)', 'The cycloid through \\(A\\) and \\(B\\)'),
        purpose: text('Spoznati cikloido kot spodnjo mejo in njen čas.', 'Meeting the cycloid as the lower bound and its time.'),
        explanation: text(
            'Nazaj k \\(B=(3{,}25;\\,2)\\ \\mathrm{m}\\). Graf nariše cikloido skozi \\(A\\) in \\(B\\) (stikalo Pokaži cikloido) in izračuna njen kot \\(\\theta_B=3{,}1947\\ \\mathrm{rad}\\), polmer \\(1{,}0007\\ \\mathrm{m}\\) in čas \\(1{,}0203\\ \\mathrm{s}\\). Cikloide ne določa mreža: graf izračuna njen kot in polmer iz \\(B\\). Cikloida skozi dve točki je brahistohrona, krivulja najhitrejšega spusta. Izrek variacijskega računa pravi, da noben tir med \\(A\\) in \\(B\\) ni hitrejši; tu ga samo navajamo.',
            'Back to \\(B=(3.25;\\,2)\\ \\mathrm{m}\\). The graph draws the cycloid through \\(A\\) and \\(B\\) (the switch Show the cycloid) and computes its angle \\(\\theta_B=3.1947\\ \\mathrm{rad}\\), its radius \\(1.0007\\ \\mathrm{m}\\) and its time \\(1.0203\\ \\mathrm{s}\\). The grid does not fix the cycloid: the graph computes its angle and radius from \\(B\\). The cycloid through two points is the brachistochrone, the curve of fastest descent. A theorem of the calculus of variations says that no track between \\(A\\) and \\(B\\) is faster; here we only cite it.',
        ),
        formulaIds: ['brachistochrone'],
        workedExampleId: 'mc2-cycloid',
        observationPrompt: text('Preberi kot, polmer in čas cikloide.', 'Read the angle, the radius and the time of the cycloid.'),
        expectedObservations: [text('\\(\\theta_B=3{,}1947\\ \\mathrm{rad}\\), \\(r=1{,}0007\\ \\mathrm{m}\\), čas \\(1{,}0203\\ \\mathrm{s}\\).', '\\(\\theta_B=3.1947\\ \\mathrm{rad}\\), \\(r=1.0007\\ \\mathrm{m}\\), time \\(1.0203\\ \\mathrm{s}\\).')],
        scene: descentScene('mc2-cycloid-scene', {mode: 'track', t: 1.04},
            'Tir in cikloida do \\(B=(3{,}25;\\,2)\\): \\(\\theta_B=3{,}1947\\ \\mathrm{rad}\\), \\(r=1{,}0007\\ \\mathrm{m}\\), čas cikloide \\(1{,}0203\\ \\mathrm{s}\\).',
            'The track and the cycloid to \\(B=(3.25;\\,2)\\): \\(\\theta_B=3.1947\\ \\mathrm{rad}\\), \\(r=1.0007\\ \\mathrm{m}\\), time of the cycloid \\(1.0203\\ \\mathrm{s}\\).'),
    }),
    step({
        id: 'mc2-beat', order: 5,
        title: text('Poskusi premagati cikloido', 'Try to beat the cycloid'),
        purpose: text('Poskušati in videti, da razlika do cikloide ne pade pod \\(0\\).', 'Trying, and seeing that the difference to the cycloid does not fall below \\(0\\).'),
        explanation: text(
            'Konec je spet \\((3;\\,1{,}5)\\ \\mathrm{m}\\), tir pa ima \\(P_1=(0{,}25;\\,1)\\) in \\(P_2=(1{,}5;\\,1{,}75)\\). Njegov čas je \\(0{,}9884\\ \\mathrm{s}\\), cikloidin \\(0{,}9866\\ \\mathrm{s}\\), razlika \\(0{,}0018\\ \\mathrm{s}\\) (\\(0{,}2\\,\\%\\)). Premikaj \\(P_1\\), \\(P_2\\) in \\(B\\) in poskusi priti pod cikloido. Ponazoritev: odčitek se ji lahko približa, razlika pa ne postane negativna. Za izrek to ni dokaz, ker preizkusimo le nekaj tirov; trditev je izrek variacijskega računa (Euler–Lagrangeova enačba), vlečenje je ne dokaže.',
            'The end is again \\((3;\\,1.5)\\ \\mathrm{m}\\), and the track has \\(P_1=(0.25;\\,1)\\) and \\(P_2=(1.5;\\,1.75)\\). Its time is \\(0.9884\\ \\mathrm{s}\\), that of the cycloid \\(0.9866\\ \\mathrm{s}\\), the difference \\(0.0018\\ \\mathrm{s}\\) (\\(0.2\\,\\%\\)). Move \\(P_1\\), \\(P_2\\) and \\(B\\) and try to get below the cycloid. Illustration: the readout may come close, but the difference does not become negative. This is not a proof, because we try only a few tracks; the statement is a theorem of the calculus of variations (the Euler–Lagrange equation), and dragging does not prove it.',
        ),
        formulaIds: ['brachistochrone'],
        observationPrompt: text('Poskusi dobiti negativno razliko do cikloide in zapiši, kaj opaziš.', 'Try to get a negative difference to the cycloid and write down what you notice.'),
        expectedObservations: [text('Čas tira \\(0{,}9884\\ \\mathrm{s}\\), cikloide \\(0{,}9866\\ \\mathrm{s}\\), razlika \\(0{,}0018\\ \\mathrm{s}\\); razlika ni negativna.', 'Time of the track \\(0.9884\\ \\mathrm{s}\\), of the cycloid \\(0.9866\\ \\mathrm{s}\\), difference \\(0.0018\\ \\mathrm{s}\\); the difference is not negative.')],
        scene: descentScene('mc2-beat-scene', {mode: 'track', params: MC2_CLOSE, t: 0.99},
            'Tir blizu cikloide do \\(B=(3;\\,1{,}5)\\): čas \\(0{,}9884\\ \\mathrm{s}\\), cikloida \\(0{,}9866\\ \\mathrm{s}\\), razlika \\(0{,}0018\\ \\mathrm{s}\\) (\\(0{,}2\\,\\%\\)).',
            'A track close to the cycloid to \\(B=(3;\\,1.5)\\): time \\(0.9884\\ \\mathrm{s}\\), cycloid \\(0.9866\\ \\mathrm{s}\\), difference \\(0.0018\\ \\mathrm{s}\\) (\\(0.2\\,\\%\\)).'),
    }),
    step({
        id: 'mc2-horizontal', order: 6,
        title: text('Vodoraven začetek: kroglica ne zdrsne', 'A horizontal start: the bead does not slide'),
        purpose: text('Videti, da nekateri tiri nimajo časa spusta.', 'Seeing that some tracks have no descent time.'),
        explanation: text(
            'Povleci \\(P_1\\) na \\((1;\\,0)\\), na isto višino kakor \\(A\\). Tir se začne vodoravno, v točki \\(A\\) ni sile vzdolž tira in kroglica ostane, kjer je. Graf zato napiše, da kroglica na tem tiru ne zdrsne, in časa ne izračuna: v odčitkih je Tir brez časa. Podobno graf ne izračuna časa, če \\(P_1\\) ali \\(P_2\\) leži nad \\(A\\); to pravilo je previdno in zadosten pogoj, ne potreben.',
            'Drag \\(P_1\\) to \\((1;\\,0)\\), to the same height as \\(A\\). The track starts horizontally, at \\(A\\) there is no force along the track, and the bead stays where it is. The graph therefore says the bead does not start sliding on this track and computes no time: in the readouts the Track has no time. Likewise the graph computes no time if \\(P_1\\) or \\(P_2\\) lies above \\(A\\); this rule is cautious and sufficient, not necessary.',
        ),
        formulaIds: [],
        observationPrompt: text('Preberi stanje tira in čas tira. Nato premakni \\(P_1\\) nad \\(A\\), na \\((1;\\,-0{,}5)\\), in preberi stanje.', 'Read the track status and the time of the track. Then move \\(P_1\\) above \\(A\\), to \\((1;\\,-0.5)\\), and read the status.'),
        expectedObservations: [text('Stanje: kroglica ne zdrsne, čas tira ni izračunan; nad \\(A\\) pa stanje pove, da kontrolna točka leži nad začetkom.', 'Status: the bead does not start sliding, the time of the track is not computed; above \\(A\\) the status says that a control point lies above the start.')],
        scene: descentScene('mc2-horizontal-scene', {mode: 'track', params: MC2_HORIZONTAL, t: 1.03},
            'Tir s \\(P_1=(1;\\,0)\\): stanje pove, da kroglica ne zdrsne; čas tira ni izračunan, premica \\(1{,}2184\\ \\mathrm{s}\\), cikloida \\(1{,}0203\\ \\mathrm{s}\\).',
            'The track with \\(P_1=(1;\\,0)\\): the status says the bead does not start sliding; the time of the track is not computed, line \\(1.2184\\ \\mathrm{s}\\), cycloid \\(1.0203\\ \\mathrm{s}\\).'),
    }),
    step({
        id: 'mc2-explore', order: 7,
        title: text('Prosto raziskovanje: premakni tudi \\(B\\)', 'Free exploration: move \\(B\\) too'),
        purpose: text('Oblikovati svoj tir in opazovati čas v primerjavi s cikloido.', 'Shaping your own track and watching the time against the cycloid.'),
        explanation: text(
            'Premikaj \\(P_1\\), \\(P_2\\) in \\(B\\) ter prižigaj in ugašaj cikloido. Poišči tir, ki je od cikloide počasnejši za manj kot \\(0{,}5\\,\\%\\), in tir z največjo razliko. Cikloida je spodnja meja, ki je ne moreš preseči; to je izrek, ki ga tu samo ponazarjamo.',
            'Move \\(P_1\\), \\(P_2\\) and \\(B\\) and switch the cycloid on and off. Find a track that is slower than the cycloid by less than \\(0.5\\,\\%\\), and a track with the largest difference. The cycloid is the lower bound that you cannot beat; this is a theorem that we only illustrate here.',
        ),
        formulaIds: [],
        observationPrompt: text('Poišči tir z razliko do cikloide pod \\(0{,}5\\,\\%\\) in tir z veliko razliko.', 'Find a track with a difference to the cycloid below \\(0.5\\,\\%\\) and a track with a large difference.'),
        expectedObservations: [text('Razlika do cikloide je pri vsakem dopustnem tiru nenegativna.', 'The difference to the cycloid is not negative for every admissible track.')],
        scene: descentScene('mc2-explore-scene', {mode: 'track', t: 1.04},
            'Začetni primer: tir do \\(B=(3{,}25;\\,2)\\), cikloida prikazana, čas tira \\(1{,}0366\\ \\mathrm{s}\\).',
            'The starting case: the track to \\(B=(3.25;\\,2)\\), the cycloid shown, time of the track \\(1.0366\\ \\mathrm{s}\\).'),
    }),
];

// ---- Lesson assembly -------------------------------------------------------------------------------------------------------------

const sources: GuidedLesson['sources'] = [
    {
        id: 'bezeg-descent-implementation',
        citation: 'Bezeg source: src/mechanics/ (descent-time integrator, tracks, brachistochrone, state model) and src/graphs/mechanics/DescentGraph.tsx.',
        implementationCorrespondence: 'A scene sets the experiment, the radius or the track points and the elapsed time of the descent graph; every number is a readout of that graph (lengths in metres, time in seconds, g = 9,81 m/s^2), the text quotes only values of those scenes, values the learner reads after an action the text asks for, or values of a formula shown in the same step.',
    },
];

const mc1: GuidedLesson = {
    demonstrationId: 'mechanics-descent',
    title: text('Tekma: najkrajša pot ni najhitrejša', 'The race: the shortest path is not the fastest'),
    summary: text(
        'Kroglica brez trenja zdrsne od \\(A\\) do \\(B\\) po premici, krožnem loku in cikloidi. Premica je najkrajša, a najpočasnejša, najhitrejša je cikloida; to je izrek variacijskega računa, tekma pa ga le ponazori.',
        'A frictionless bead slides from \\(A\\) to \\(B\\) along a line, a circular arc and a cycloid. The line is the shortest but the slowest, the cycloid is the fastest; this is a theorem of the calculus of variations, and the race only illustrates it.',
    ),
    prerequisites: [text('Cikloida kot parametrična krivulja (Geometrija krivulj) in energija iz fizike.', 'The cycloid as a parametric curve (Geometry of curves) and energy from physics.')],
    learningGoals: [
        text('Veš, da najkrajša pot ni nujno najhitrejša in da cikloida od treh tirov potrebuje najmanj časa.', 'Know that the shortest path is not necessarily the fastest and that the cycloid takes the least time of the three tracks.'),
        text('Utemeljiš z ohranitvijo energije \\(v=\\sqrt{2gy}\\), zakaj strm začetek pomaga.', 'Argue with conservation of energy \\(v=\\sqrt{2gy}\\) why a steep start helps.'),
        text('Veš, da se vsi časi spreminjajo s \\(\\sqrt r\\) in da se vrstni red ne spremeni.', 'Know that all times change with \\(\\sqrt r\\) and that the order does not change.'),
    ],
    formulaBlocks: mc1Formulas,
    workedExamples: mc1Examples,
    steps: mc1Steps,
    sources,
    edgeCases: [
        text('Krožni lok se spusti pod \\(B\\) in se vrne; kroglica na žici ostane na tiru, zato je to dovoljeno.', 'The circular arc dips below \\(B\\) and returns; a bead on a wire stays on the track, so this is allowed.'),
        text('Trije tiri so ponazoritev, ne dokaz: da je cikloida najhitrejša od vseh tirov, je izrek variacijskega računa.', 'Three tracks are an illustration, not a proof: that the cycloid is the fastest of all tracks is a theorem of the calculus of variations.'),
    ],
    unresolvedQuestions: [],
};

const mc2: GuidedLesson = {
    demonstrationId: 'mechanics-descent',
    title: text('Povleci tir', 'Drag the track'),
    summary: text(
        'Čas spusta po upogljivem tiru je integral zakona hitrosti. Cikloida skozi \\(A\\) in \\(B\\) je spodnja meja, ki je tir ne preseže; vlečenje to ponazori, dokaz pa je izrek variacijskega računa.',
        'The descent time along a flexible track is the integral of the speed law. The cycloid through \\(A\\) and \\(B\\) is a lower bound that no track beats; dragging illustrates this, and the proof is a theorem of the calculus of variations.',
    ),
    prerequisites: [text('Lekcija Tekma (prva lekcija poglavja) in Bézierjeva krivulja s kontrolnimi točkami.', 'The lesson The race (the first lesson of the chapter) and a Bézier curve with control points.')],
    learningGoals: [
        text('Veš, da lahko z vlečenjem kontrolnih točk tir oblikuješ in da se čas spusta pri tem spreminja.', 'Know that dragging control points reshapes the track and that the descent time changes with it.'),
        text('Veš, da je cikloida skozi dve točki spodnja meja časa, in da je to izrek, ki ga vlečenje ne dokaže.', 'Know that the cycloid through two points is the lower bound of the time, and that this is a theorem that dragging does not prove.'),
        text('Veš, da pri vodoravnem začetku kroglica ne zdrsne in graf časa ne izračuna.', 'Know that with a horizontal start the bead does not slide and the graph computes no time.'),
    ],
    formulaBlocks: mc2Formulas,
    workedExamples: mc2Examples,
    steps: mc2Steps,
    sources,
    edgeCases: [
        text('Tir z začetno tangento vodoravno ali s kontrolno točko nad \\(A\\) nima izračunanega časa; graf namesto števila napiše stanje.', 'A track with a horizontal initial tangent or a control point above \\(A\\) has no computed time; the graph writes a status instead of a number.'),
        text('Pravilo za dopustne tire je zadosten pogoj, ne potreben: nekateri tiri s točko nad \\(A\\) bi lahko ostali pod njim, a jih graf ne meri.', 'The rule for admissible tracks is sufficient, not necessary: some tracks with a point above \\(A\\) could stay below it, but the graph does not time them.'),
    ],
    unresolvedQuestions: [],
};

export const mechanicalCurvesRaceLesson: GuidedLesson = mc1;
export const mechanicalCurvesTrackLesson: GuidedLesson = mc2;
