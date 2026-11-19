/**
 * Guided lessons of the mechanical-curves family, batch A and B (docs/specs/mechanical-curves-lessons.md): MC1, the race, MC2, drag the track, and MC3, the tautochrone, all on
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
    readonly theta1?: number;
    readonly theta2?: number;
    readonly theta3?: number;
    readonly showArc?: boolean;
}

/** What a descent scene sets: the experiment (the Demonstration default is the race), the parameters and the time in seconds. */
export interface DescentSceneSpec {
    readonly mode?: 'race' | 'track' | 'tautochrone';
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

// ---- MC3 -------------------------------------------------------------------------------------------------------------------------

/** The slider ends of the tautochrone with the default angles 0,3; 1 and 2 (r = 1): the descent time 1,003 s rounded up to the 0,01 grid, and the same with the arc shown (its slowest time 1,0745 s). */
export const MC3_END = 1.01;
export const MC3_END_ARC = 1.08;

const mc3Formulas: readonly FormulaBlock[] = [
    {
        id: 'cycloid-angle',
        latex: 'x=r(\\theta-\\sin\\theta),\\qquad y=r(1-\\cos\\theta)',
        notation: text(
            '\\(r\\) je polmer kotalečega se kroga, \\(\\theta\\) kot kotaljenja, \\(x\\) vodoravna lega in \\(y\\) globina pod vrhom cikloide, vse v metrih in radianih. Kot \\(\\theta_0\\) je začetek kroglice, najnižja točka je pri \\(\\theta=\\pi\\).',
            '\\(r\\) is the radius of the rolling circle, \\(\\theta\\) the rolling angle, \\(x\\) the horizontal position and \\(y\\) the depth below the top of the cycloid, in metres and radians. The angle \\(\\theta_0\\) is the start of the bead, the lowest point is at \\(\\theta=\\pi\\).',
        ),
        explanation: text(
            'Globina \\(y=r(1-\\cos\\theta)\\) raste od \\(0\\) pri \\(\\theta=0\\), vrhu cikloide, do \\(2r\\) pri \\(\\theta=\\pi\\), najnižji točki. Kroglica, ki začne pri \\(\\theta_0\\), drsi do \\(\\theta=\\pi\\); manjši \\(\\theta_0\\) pomeni višji začetek.',
            'The depth \\(y=r(1-\\cos\\theta)\\) grows from \\(0\\) at \\(\\theta=0\\), the top of the cycloid, to \\(2r\\) at \\(\\theta=\\pi\\), the lowest point. A bead that starts at \\(\\theta_0\\) slides to \\(\\theta=\\pi\\); a smaller \\(\\theta_0\\) means a higher start.',
        ),
    },
    {
        id: 'tautochrone-time',
        latex: 'T=\\pi\\sqrt{\\frac{r}{g}},\\qquad 0\\le\\theta_0<\\pi',
        notation: text(
            '\\(T\\) je čas spusta od začetka \\(\\theta_0\\) do najnižje točke, \\(r\\) polmer kotalečega se kroga in \\(g=9{,}81\\ \\mathrm{m/s^2}\\) težni pospešek.',
            '\\(T\\) is the descent time from the start \\(\\theta_0\\) to the lowest point, \\(r\\) the radius of the rolling circle and \\(g=9.81\\ \\mathrm{m/s^2}\\) the gravitational acceleration.',
        ),
        explanation: text(
            'To je Huygensov izrek o tavtohroni, krivulji enakih časov; v aplikaciji ga navajamo, ne izpeljemo. Čas spusta je integral \\(\\int\\mathrm{d}s/v\\) s hitrostjo \\(v=\\sqrt{2g(y-y_0)}\\), kjer je \\(y_0\\) globina začetka. Po vpeljavi \\(z=\\cos(\\theta/2)\\) postane \\(T=2\\sqrt{r/g}\\int_0^{z_0}\\mathrm{d}z/\\sqrt{z_0^2-z^2}\\) z \\(z_0=\\cos(\\theta_0/2)\\in(0,1]\\), integral pa je \\(\\pi/2\\) za vsak tak \\(z_0\\): začetni kot se pokrajša.',
            'This is Huygens\'s tautochrone theorem, the curve of equal times; the app cites it and does not derive it. The descent time is the integral \\(\\int\\mathrm{d}s/v\\) with the speed \\(v=\\sqrt{2g(y-y_0)}\\), where \\(y_0\\) is the depth of the start. After the substitution \\(z=\\cos(\\theta/2)\\) it becomes \\(T=2\\sqrt{r/g}\\int_0^{z_0}\\mathrm{d}z/\\sqrt{z_0^2-z^2}\\) with \\(z_0=\\cos(\\theta_0/2)\\in(0,1]\\), and the integral is \\(\\pi/2\\) for every such \\(z_0\\): the start angle cancels.',
        ),
    },
];

const mc3Examples: readonly WorkedExample[] = [
    {
        id: 'mc3-closed',
        title: text('Čas spusta po cikloidi pri \\(r=1\\ \\mathrm{m}\\)', 'The descent time along the cycloid for \\(r=1\\ \\mathrm{m}\\)'),
        calculationLatex: 'T=\\pi\\sqrt{\\frac{1}{9{,}81}}',
        resultLatex: 'T=1{,}0030',
        check: text(
            'Rezultat je enak odčitku grafa \\(1{,}003\\ \\mathrm{s}\\) na prikazana mesta. Formula ne vsebuje kota \\(\\theta_0\\), zato je isti rezultat za vse tri kroglice.',
            'The result equals the readout of the graph, \\(1.003\\ \\mathrm{s}\\), to the places shown. The formula does not contain the angle \\(\\theta_0\\), so the result is the same for all three beads.',
        ),
    },
];

const mc3Steps: readonly GuidedLessonStep[] = [
    step({
        id: 'mc3-start', order: 1,
        title: text('Tri kroglice na cikloidi', 'Three beads on the cycloid'),
        purpose: text('Napovedati, katera kroglica pride prva na dno.', 'Predicting which bead reaches the bottom first.'),
        explanation: text(
            'Kroglica drsi brez trenja po tiru, to je po krivulji, po kateri teče, in se začne gibati iz mirovanja. Tir je cikloida s polmerom kotalečega se kroga \\(r=1\\ \\mathrm{m}\\), od vrha pri \\(\\theta=0\\) do najnižje točke pri \\(\\theta=\\pi\\). Tri kroglice začnejo na različnih višinah, pri kotih \\(\\theta\\), ki jih pokažejo odčitki. Ponazoritev: graf pokaže tri kroglice na enem tiru. Pred branjem odčitkov in stanja grafa napovej, katera kroglica bo prva v najnižji točki.',
            'A bead slides without friction along a track, that is, along the curve it runs on, and starts moving from rest. The track is a cycloid with rolling-circle radius \\(r=1\\ \\mathrm{m}\\), from the top at \\(\\theta=0\\) to the lowest point at \\(\\theta=\\pi\\). Three beads start at different heights, at the angles \\(\\theta\\) that the readouts show. Illustration: the graph shows three beads on one track. Before reading the readouts and the status line, predict which bead is first at the lowest point.',
        ),
        formulaIds: ['cycloid-angle'],
        observationPrompt: text('Zapiši napoved, nato preberi kote \\(\\theta\\) treh kroglic v odčitkih.', 'Write down your prediction, then read the angles \\(\\theta\\) of the three beads in the readouts.'),
        expectedObservations: [text(
            'Kroglice mirujejo pri kotih \\(\\theta=0{,}3\\), \\(1\\) in \\(2\\ \\mathrm{rad}\\); iz \\(y=r(1-\\cos\\theta)\\) so njihove globine približno \\(0{,}04\\), \\(0{,}46\\) in \\(1{,}42\\ \\mathrm{m}\\). Kroglica 1 začne najvišje, kroglica 3 najnižje.',
            'The beads rest at the angles \\(\\theta=0.3\\), \\(1\\) and \\(2\\ \\mathrm{rad}\\); from \\(y=r(1-\\cos\\theta)\\) their depths are approximately \\(0.04\\), \\(0.46\\) and \\(1.42\\ \\mathrm{m}\\). Bead 1 starts the highest, bead 3 the lowest.',
        )],
        scene: descentScene('mc3-start-scene', {mode: 'tautochrone', t: 0},
            'Tavtohrona, \\(r=1\\ \\mathrm{m}\\), čas \\(0\\): kroglice 1, 2 in 3 mirujejo pri \\(\\theta=0{,}3\\), \\(1\\) in \\(2\\ \\mathrm{rad}\\); krožni lok je skrit.',
            'The tautochrone, \\(r=1\\ \\mathrm{m}\\), time \\(0\\): beads 1, 2 and 3 rest at \\(\\theta=0.3\\), \\(1\\) and \\(2\\ \\mathrm{rad}\\); the circular arc is hidden.'),
    }),
    step({
        id: 'mc3-release', order: 2,
        title: text('Spusti kroglice', 'Release the beads'),
        purpose: text('Opazovati, v kakšnem vrstnem redu kroglice pridejo na dno.', 'Watching in which order the beads reach the bottom.'),
        explanation: text(
            'Premakni drsnik časa od \\(0\\) do konca drsnika ali pritisni Predvajaj. Opazuj, v kakšnem vrstnem redu kroglice dosežejo najnižjo točko, in primerjaj z napovedjo. Pomaga, če drsnik premikaš počasi, s korakom \\(0{,}01\\ \\mathrm{s}\\).',
            'Move the time slider from \\(0\\) to the end of the slider or press Play. Watch in which order the beads reach the lowest point and compare with your prediction. It helps to move the slider slowly, in steps of \\(0.01\\ \\mathrm{s}\\).',
        ),
        formulaIds: [],
        observationPrompt: text('Poglej, katera kroglica je prva v najnižji točki, in kje so kroglice ob koncu drsnika.', 'Look at which bead is first at the lowest point and where the beads are at the end of the slider.'),
        expectedObservations: [text(
            'Kroglice pridejo v najnižjo točko ob istem času: pri koraku drsnika \\(0{,}01\\ \\mathrm{s}\\) med njimi ni razlike in ob koncu drsnika, \\(1{,}01\\ \\mathrm{s}\\), so vse tri tam. Kroglica 3, ki začne najnižje, ni prva.',
            'The beads reach the lowest point at the same time: at the slider step of \\(0.01\\ \\mathrm{s}\\) there is no difference between them, and at the end of the slider, \\(1.01\\ \\mathrm{s}\\), all three are there. Bead 3, which starts the lowest, is not first.',
        )],
        scene: descentScene('mc3-release-scene', {mode: 'tautochrone', t: 0.5},
            'Tavtohrona, čas \\(0{,}5\\ \\mathrm{s}\\): kroglice so na poti proti najnižji točki; konec drsnika je pri \\(1{,}01\\ \\mathrm{s}\\).',
            'The tautochrone, time \\(0.5\\ \\mathrm{s}\\): the beads are on their way to the lowest point; the end of the slider is at \\(1.01\\ \\mathrm{s}\\).'),
    }),
    step({
        id: 'mc3-readouts', order: 3,
        title: text('Časi spusta kot števila', 'The descent times as numbers'),
        purpose: text('Primerjati izračunane čase treh kroglic.', 'Comparing the computed times of the three beads.'),
        explanation: text(
            'Ponazoritev: graf za vsako kroglico izračuna čas spusta po cikloidi od njenega začetka do najnižje točke in ga napiše v odčitku; v vrstici Zaprta formula je vrednost, ki jo spoznamo v naslednjem koraku. Napovej, na koliko decimalnih mest se trije časi in zaprta formula ujemajo. Trije časi veljajo samo za tri izbrane začetke; o drugih začetkih ne povedo ničesar.',
            'Illustration: for each bead the graph computes the descent time along the cycloid from its start to the lowest point and writes it in a readout; the Closed form row holds a value that we meet in the next step. Predict to how many decimal places the three times and the closed form agree. Three times hold only for the three chosen starts; they say nothing about other starts.',
        ),
        formulaIds: [],
        observationPrompt: text('Zapiši napoved, nato preberi tri čase kroglic in vrstico Zaprta formula.', 'Write down your prediction, then read the three times of the beads and the Closed form row.'),
        expectedObservations: [text(
            'Vse tri kroglice imajo čas \\(1{,}003\\ \\mathrm{s}\\), enak vrstici Zaprta formula, \\(1{,}003\\ \\mathrm{s}\\), na prikazana mesta; ob koncu poskusa so vse v najnižji točki.',
            'All three beads have the time \\(1.003\\ \\mathrm{s}\\), equal to the Closed form row, \\(1.003\\ \\mathrm{s}\\), to the places shown; at the end of the run all are at the lowest point.',
        )],
        scene: descentScene('mc3-readouts-scene', {mode: 'tautochrone', t: MC3_END},
            'Tavtohrona, konec poskusa (\\(1{,}01\\ \\mathrm{s}\\)): kroglice 1, 2 in 3 imajo časa \\(1{,}003\\ \\mathrm{s}\\), zaprta formula \\(1{,}003\\ \\mathrm{s}\\).',
            'The tautochrone, end of the run (\\(1.01\\ \\mathrm{s}\\)): beads 1, 2 and 3 have the times \\(1.003\\ \\mathrm{s}\\), the closed form \\(1.003\\ \\mathrm{s}\\).'),
    }),
    step({
        id: 'mc3-theorem', order: 4,
        title: text('Izrek o tavtohroni', 'The tautochrone theorem'),
        purpose: text('Povezati odčitke z izrekom in napovedati čas pri manjšem polmeru.', 'Connecting the readouts with the theorem and predicting the time for a smaller radius.'),
        explanation: text(
            'Argument (navedek, ne izpeljava v aplikaciji): cikloida je tavtohrona, krivulja enakih časov. Kroglica, ki se v mirovanju začne pri katerem koli \\(\\theta_0\\in[0,\\pi)\\), pride v najnižjo točko po istem času, ki ga daje formula. Trije enaki odčitki so ponazoritev tega izreka, ne njegov dokaz. Z isto formulo napovej čas pri polmeru \\(r=0{,}25\\ \\mathrm{m}\\), nato nastavi polmer in preberi odčitke.',
            'Argument (cited, not derived in the app): the cycloid is the tautochrone, the curve of equal times. A bead that starts at rest at any \\(\\theta_0\\in[0,\\pi)\\) reaches the lowest point after the same time, which the formula gives. Three equal readouts illustrate this theorem; they do not prove it. Use the same formula to predict the time for the radius \\(r=0.25\\ \\mathrm{m}\\), then set the radius and read the readouts.',
        ),
        formulaIds: ['tautochrone-time'],
        workedExampleId: 'mc3-closed',
        observationPrompt: text('Zapiši napoved za \\(r=0{,}25\\ \\mathrm{m}\\), nato nastavi polmer in preberi tri čase in vrstico Zaprta formula.', 'Write down your prediction for \\(r=0.25\\ \\mathrm{m}\\), then set the radius and read the three times and the Closed form row.'),
        expectedObservations: [text(
            'Iz formule je \\(T=\\pi\\sqrt{0{,}25/9{,}81}\\approx0{,}5015\\ \\mathrm{s}\\), polovica časa pri \\(r=1\\ \\mathrm{m}\\); odčitki vseh treh kroglic in zaprte formule so \\(0{,}5015\\ \\mathrm{s}\\).',
            'From the formula \\(T=\\pi\\sqrt{0.25/9.81}\\approx0.5015\\ \\mathrm{s}\\), half the time for \\(r=1\\ \\mathrm{m}\\); the readouts of all three beads and of the closed form are \\(0.5015\\ \\mathrm{s}\\).',
        )],
        scene: descentScene('mc3-theorem-scene', {mode: 'tautochrone', t: 0.8},
            'Tavtohrona, \\(r=1\\ \\mathrm{m}\\), čas \\(0{,}8\\ \\mathrm{s}\\): časi \\(1{,}003\\ \\mathrm{s}\\), kot v zgledu.',
            'The tautochrone, \\(r=1\\ \\mathrm{m}\\), time \\(0.8\\ \\mathrm{s}\\): the times are \\(1.003\\ \\mathrm{s}\\), as in the example.'),
    }),
    step({
        id: 'mc3-arc', order: 5,
        title: text('Krožni lok za primerjavo', 'The circular arc for comparison'),
        purpose: text('Primerjati čase po krožnem loku s časom po cikloidi.', 'Comparing the times along the circular arc with the time along the cycloid.'),
        explanation: text(
            'Graf nariše krožni lok s polmerom \\(4r=4\\ \\mathrm{m}\\), kar je polmer ukrivljenosti cikloide v najnižji točki, skozi isto najnižjo točko. Vsaka kroglica začne na loku v isti višini kakor na cikloidi. Odčitki Kroglica 1 do 3: čas po krožnem loku (izračunan) so časi spusta po loku, izračunani z numeričnim integriranjem. Napovej, ali bodo trije časi na loku enaki in kako se bodo uvrstili glede na čas po cikloidi.',
            'The graph draws a circular arc of radius \\(4r=4\\ \\mathrm{m}\\), the radius of curvature of the cycloid at the lowest point, through the same lowest point. Each bead starts on the arc at the same height as on the cycloid. The readouts Bead 1 to 3: time on the circular arc (computed) are the descent times along the arc, computed by numerical integration. Predict whether the three times on the arc are equal and how they compare with the time along the cycloid.',
        ),
        formulaIds: [],
        observationPrompt: text('Zapiši napoved, nato preberi tri čase po krožnem loku in jih primerjaj s časom po cikloidi.', 'Write down your prediction, then read the three times along the circular arc and compare them with the time along the cycloid.'),
        expectedObservations: [text(
            'Časi po krožnem loku so \\(1{,}0745\\ \\mathrm{s}\\), \\(1{,}0574\\ \\mathrm{s}\\) in \\(1{,}0221\\ \\mathrm{s}\\): različni in vsi daljši od \\(1{,}003\\ \\mathrm{s}\\) po cikloidi. Višji začetek pomeni daljši čas. Krožni lok torej ni tavtohrona.',
            'The times along the circular arc are \\(1.0745\\ \\mathrm{s}\\), \\(1.0574\\ \\mathrm{s}\\) and \\(1.0221\\ \\mathrm{s}\\): different, and all longer than \\(1.003\\ \\mathrm{s}\\) along the cycloid. A higher start means a longer time. So the circular arc is not a tautochrone.',
        )],
        scene: descentScene('mc3-arc-scene', {mode: 'tautochrone', params: {showArc: true}, t: MC3_END_ARC},
            'Tavtohrona, krožni lok prikazan, konec poskusa (\\(1{,}08\\ \\mathrm{s}\\)): po cikloidi \\(1{,}003\\ \\mathrm{s}\\), po loku \\(1{,}0745\\ \\mathrm{s}\\), \\(1{,}0574\\ \\mathrm{s}\\) in \\(1{,}0221\\ \\mathrm{s}\\).',
            'The tautochrone, circular arc shown, end of the run (\\(1.08\\ \\mathrm{s}\\)): along the cycloid \\(1.003\\ \\mathrm{s}\\), along the arc \\(1.0745\\ \\mathrm{s}\\), \\(1.0574\\ \\mathrm{s}\\) and \\(1.0221\\ \\mathrm{s}\\).'),
    }),
    step({
        id: 'mc3-starts', order: 6,
        title: text('Spremeni začetek', 'Change the start'),
        purpose: text('Preveriti na drugih začetkih, tudi na robovih, kaj se zgodi s časi.', 'Checking on other starts, including the edges, what happens to the times.'),
        explanation: text(
            'Kot \\(\\theta\\) vsake kroglice spremeniš z vlečenjem kroglice po cikloidi ali z drsniki Kroglica 1: kot θ, Kroglica 2: kot θ in Kroglica 3: kot θ (ali z vnosom števila ob njih) (korak \\(0{,}05\\)). Najprej nastavi kote \\(0{,}5\\), \\(1{,}5\\) in \\(2{,}5\\) in napovej čase po cikloidi in po krožnem loku. Nato nastavi kroglico 1 na kot \\(0\\), vrh cikloide, in kroglico 3 na najnižjo točko \\(\\theta=\\pi\\); na \\(\\pi\\) prideš z vlečenjem kroglice na dno ali s tipko ↑ iz \\(3{,}1\\).',
            'You change the angle \\(\\theta\\) of each bead by dragging the bead along the cycloid or with the sliders Bead 1: angle θ, Bead 2: angle θ and Bead 3: angle θ (or by typing a number beside them) (step \\(0.05\\)). First set the angles \\(0.5\\), \\(1.5\\) and \\(2.5\\) and predict the times along the cycloid and along the circular arc. Then set bead 1 to the angle \\(0\\), the top of the cycloid, and bead 3 to the lowest point \\(\\theta=\\pi\\); you reach \\(\\pi\\) by dragging the bead to the bottom or with the ↑ key from \\(3.1\\).',
        ),
        formulaIds: [],
        observationPrompt: text('Zapiši napoved za kote \\(0{,}5\\), \\(1{,}5\\), \\(2{,}5\\), nato preberi čase in poglej še kota \\(0\\) in \\(\\pi\\).', 'Write down your prediction for the angles \\(0.5\\), \\(1.5\\), \\(2.5\\), then read the times and also look at the angles \\(0\\) and \\(\\pi\\).'),
        expectedObservations: [text(
            'Po cikloidi imajo vse tri kroglice \\(1{,}003\\ \\mathrm{s}\\); po krožnem loku \\(1{,}0712\\ \\mathrm{s}\\), \\(1{,}0394\\ \\mathrm{s}\\) in \\(1{,}0094\\ \\mathrm{s}\\), časi so tem krajši, čim nižji je začetek. Kroglica pri \\(\\theta=0\\) ima po cikloidi še vedno \\(1{,}003\\ \\mathrm{s}\\); kroglica pri \\(\\theta=\\pi\\) je že v najnižji točki in časa ne dobi.',
            'Along the cycloid all three beads have \\(1.003\\ \\mathrm{s}\\); along the circular arc \\(1.0712\\ \\mathrm{s}\\), \\(1.0394\\ \\mathrm{s}\\) and \\(1.0094\\ \\mathrm{s}\\), the times are shorter the lower the start. The bead at \\(\\theta=0\\) still has \\(1.003\\ \\mathrm{s}\\) along the cycloid; the bead at \\(\\theta=\\pi\\) is already at the lowest point and gets no time.',
        )],
        scene: descentScene('mc3-starts-scene', {mode: 'tautochrone', params: {showArc: true}, t: 0},
            'Tavtohrona, krožni lok prikazan, čas \\(0\\): kroglice 1, 2 in 3 mirujejo pri \\(\\theta=0{,}3\\), \\(1\\) in \\(2\\ \\mathrm{rad}\\).',
            'The tautochrone, circular arc shown, time \\(0\\): beads 1, 2 and 3 rest at \\(\\theta=0.3\\), \\(1\\) and \\(2\\ \\mathrm{rad}\\).'),
    }),
    step({
        id: 'mc3-explore', order: 7,
        title: text('Prosto raziskovanje', 'Free exploration'),
        purpose: text('Spreminjati polmer, kote in krožni lok ter preizkusiti izrek.', 'Changing the radius, the angles and the circular arc, and testing the theorem.'),
        explanation: text(
            'Spreminjaj polmer \\(r\\) od \\(0{,}25\\ \\mathrm{m}\\) do \\(3\\ \\mathrm{m}\\) s korakom \\(0{,}25\\ \\mathrm{m}\\), kote kroglic in krožni lok. Napovej čas pri \\(r=3\\ \\mathrm{m}\\), preden ga nastaviš. Preveri, ali obstaja začetek, pri katerem čas po cikloidi ni enak vrstici Zaprta formula, in ali obstaja začetek, pri katerem je krožni lok hitrejši od cikloide. Navedeni izrek zagotavlja, da prvega ni; preizkus na nekaj začetkih izreka ne dokaže.',
            'Change the radius \\(r\\) from \\(0.25\\ \\mathrm{m}\\) to \\(3\\ \\mathrm{m}\\) in steps of \\(0.25\\ \\mathrm{m}\\), the angles of the beads and the circular arc. Predict the time for \\(r=3\\ \\mathrm{m}\\) before you set it. Test whether there is a start at which the time along the cycloid is not equal to the Closed form row, and whether there is a start at which the circular arc is faster than the cycloid. The cited theorem guarantees there is no first one; testing a few starts does not prove it.',
        ),
        formulaIds: ['tautochrone-time'],
        observationPrompt: text('Zapiši napoved za \\(r=3\\ \\mathrm{m}\\), nato jo preveri in preizkusi, ali kakšen začetek nasprotuje izreku ali primerjavi z lokom.', 'Write down your prediction for \\(r=3\\ \\mathrm{m}\\), then check it and test whether any start contradicts the theorem or the comparison with the arc.'),
        expectedObservations: [text(
            'Pri \\(r=3\\ \\mathrm{m}\\) je \\(T=\\pi\\sqrt{3/9{,}81}\\approx1{,}7373\\ \\mathrm{s}\\), odčitki vseh kroglic in zaprte formule so \\(1{,}7373\\ \\mathrm{s}\\). Čas po cikloidi je pri vsakem začetku, ki ga preizkusiš, enak vrstici Zaprta formula; krožni lok ni hitrejši od cikloide pri nobenem preizkušenem začetku.',
            'For \\(r=3\\ \\mathrm{m}\\) we get \\(T=\\pi\\sqrt{3/9.81}\\approx1.7373\\ \\mathrm{s}\\), the readouts of all beads and of the closed form are \\(1.7373\\ \\mathrm{s}\\). The time along the cycloid equals the Closed form row at every start you try; the circular arc is not faster than the cycloid at any start you try.',
        )],
        scene: descentScene('mc3-explore-scene', {mode: 'tautochrone', t: 0},
            'Tavtohrona, \\(r=1\\ \\mathrm{m}\\), čas \\(0\\), krožni lok skrit: kroglice 1, 2 in 3 mirujejo pri \\(\\theta=0{,}3\\), \\(1\\) in \\(2\\ \\mathrm{rad}\\).',
            'The tautochrone, \\(r=1\\ \\mathrm{m}\\), time \\(0\\), circular arc hidden: beads 1, 2 and 3 rest at \\(\\theta=0.3\\), \\(1\\) and \\(2\\ \\mathrm{rad}\\).'),
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

const mc3: GuidedLesson = {
    demonstrationId: 'mechanics-descent',
    title: text('Enaki časi: tavtohrona', 'Equal times: the tautochrone'),
    summary: text(
        'Kroglica brez trenja zdrsne po cikloidi iz mirovanja od izbranega začetka do najnižje točke. Lekcija raziskuje, kako čas spusta zavisi od začetka, in ga primerja s krožnim lokom; začetki so le trije, zato lekcija najprej opazuje, nato primerja.',
        'A frictionless bead slides along the cycloid from rest, from a chosen start to the lowest point. The lesson explores how the descent time depends on the start and compares it with a circular arc; there are only three starts, so the lesson first observes and then compares.',
    ),
    prerequisites: [text('Lekciji Tekma in Povleci tir (poglavje Mehanske krivulje) ter cikloida kot parametrična krivulja.', 'The lessons The race and Drag the track (chapter Mechanical curves) and the cycloid as a parametric curve.')],
    learningGoals: [
        text('Veš, da je čas spusta po cikloidi do najnižje točke za vsak začetek \\(\\theta_0\\in[0,\\pi)\\) enak \\(\\pi\\sqrt{r/g}\\), in da je to izrek, ki ga trije odčitki le ponazorijo.', 'Know that the descent time along the cycloid to the lowest point is \\(\\pi\\sqrt{r/g}\\) for every start \\(\\theta_0\\in[0,\\pi)\\), and that this is a theorem which three readouts only illustrate.'),
        text('Veš, da pri krožnem loku čas zavisi od začetka.', 'Know that on a circular arc the time depends on the start.'),
        text('Veš, da kroglica pri \\(\\theta=\\pi\\) že leži v najnižji točki in časa ne dobi.', 'Know that a bead at \\(\\theta=\\pi\\) already lies at the lowest point and gets no time.'),
    ],
    formulaBlocks: mc3Formulas,
    workedExamples: mc3Examples,
    steps: mc3Steps,
    sources,
    edgeCases: [
        text('Začetek \\(\\theta_0=0\\), vrh cikloide, ima enak čas kakor drugi začetki; začetek \\(\\theta_0=\\pi\\) je že najnižja točka, zato graf namesto časa napiše besedilo.', 'The start \\(\\theta_0=0\\), the top of the cycloid, has the same time as the other starts; the start \\(\\theta_0=\\pi\\) is already the lowest point, so the graph writes text instead of a time.'),
        text('Tri enaki časi so ponazoritev, ne dokaz: izrek o tavtohroni je navedek in ni izpeljan v aplikaciji.', 'Three equal times are an illustration, not a proof: the tautochrone theorem is cited and not derived in the app.'),
    ],
    unresolvedQuestions: [],
};

export const mechanicalCurvesRaceLesson: GuidedLesson = mc1;
export const mechanicalCurvesTrackLesson: GuidedLesson = mc2;
export const mechanicalTautochroneLesson: GuidedLesson = mc3;
