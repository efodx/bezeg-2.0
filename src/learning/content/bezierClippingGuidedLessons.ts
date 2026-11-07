/**
 * Guided lesson of the Bezier clipping Demonstration (docs/specs/advanced-bezier-lessons.md, D2). The text is a one-shot draft
 * (docs/specs/new-lesson-families.md, "One-shot lesson text"): every number it quotes is a readout of the scene it belongs to, and
 * `bezierClippingGuidedLessons.test.tsx` checks that against the real graph. A scene sets the whole curve pair, the tolerance, all
 * five overlays and the trace step, so it never leans on an earlier scene. `set-trace-step` comes last because `load-model` and
 * `set-clip-tolerance` return the trace to step 0.
 */
import type {LessonAction, LessonViewBox} from '../model';
import type {GuidedLesson, GuidedLessonFrame, GuidedLessonFrameKind, LessonScene, LocalizedText} from './guidedLessons';

const text = (sl: string, en: string): LocalizedText => ({sl, en});
const frame = (id: string, kind: GuidedLessonFrameKind): GuidedLessonFrame => ({id, kind});

/** High on the board: the lesson panel covers its upper part, and the curves (y from -1 to 4.5) stay below. */
export const CLIPPING_LESSON_VIEW: LessonViewBox = [-1.5, 9.5, 5.5, -1.5];

type Pair = ReadonlyArray<readonly [number, number]>;
/** A is the same quadratic in every pair; B is the second curve. Board units; the offset pair needs the half-unit grid. */
export const CLIPPING_CROSSING: Pair = [[0, 0], [2, 4], [4, 0], [0, 3], [2, -1], [4, 3]];
export const CLIPPING_TANGENT: Pair = [[0, 0], [2, 4], [4, 0], [0, 4], [2, 0], [4, 4]];
export const CLIPPING_OFFSET: Pair = [[0, 0], [2, 4], [4, 0], [0, 4.5], [2, 0.5], [4, 4.5]];

export interface ClippingSceneSpec {
    readonly pair: Pair;
    readonly gridStepExponent: number;
    readonly toleranceExponent: number;
    readonly overlays: {readonly control: boolean; readonly hull: boolean; readonly fatLine: boolean; readonly kept: boolean; readonly discarded: boolean};
    readonly step: number | 'end';
}

const overlay = (name: 'control' | 'hull' | 'fatLine' | 'kept' | 'discarded', visible: boolean): LessonAction =>
    ({kind: 'point-set', operation: 'set-overlay', overlay: name, visible}) as unknown as LessonAction;

/** The actions of a scene, in the order that makes them independent of any earlier scene. */
export const clippingSceneActions = (spec: ClippingSceneSpec): LessonAction[] => [
    {kind: 'point-set', operation: 'load-model', points: spec.pair, gridStepExponent: spec.gridStepExponent},
    {kind: 'point-set', operation: 'set-clip-tolerance', exponent: spec.toleranceExponent},
    overlay('control', spec.overlays.control), overlay('hull', spec.overlays.hull), overlay('fatLine', spec.overlays.fatLine),
    overlay('kept', spec.overlays.kept), overlay('discarded', spec.overlays.discarded),
    {kind: 'point-set', operation: 'set-trace-step', step: spec.step},
];

/** The scenes' contract, keyed by step id and shared with the test. */
export const CLIPPING_SCENES: Readonly<Record<string, ClippingSceneSpec>> = {
    'clipping-hulls': {pair: CLIPPING_CROSSING, gridStepExponent: 0, toleranceExponent: 6, step: 0,
        overlays: {control: true, hull: true, fatLine: false, kept: false, discarded: false}},
    'clipping-fat-line': {pair: CLIPPING_CROSSING, gridStepExponent: 0, toleranceExponent: 6, step: 0,
        overlays: {control: true, hull: false, fatLine: true, kept: false, discarded: false}},
    'clipping-clip-a': {pair: CLIPPING_CROSSING, gridStepExponent: 0, toleranceExponent: 6, step: 4,
        overlays: {control: false, hull: false, fatLine: true, kept: true, discarded: true}},
    'clipping-swap': {pair: CLIPPING_CROSSING, gridStepExponent: 0, toleranceExponent: 6, step: 5,
        overlays: {control: false, hull: false, fatLine: true, kept: true, discarded: true}},
    'clipping-repeat': {pair: CLIPPING_CROSSING, gridStepExponent: 0, toleranceExponent: 6, step: 'end',
        overlays: {control: false, hull: false, fatLine: false, kept: true, discarded: true}},
    'clipping-tangent': {pair: CLIPPING_TANGENT, gridStepExponent: 0, toleranceExponent: 10, step: 'end',
        overlays: {control: false, hull: false, fatLine: false, kept: true, discarded: true}},
    'clipping-offset': {pair: CLIPPING_OFFSET, gridStepExponent: -1, toleranceExponent: 6, step: 'end',
        overlays: {control: true, hull: true, fatLine: false, kept: true, discarded: true}},
    'clipping-explore': {pair: CLIPPING_CROSSING, gridStepExponent: 0, toleranceExponent: 6, step: 0,
        overlays: {control: true, hull: true, fatLine: true, kept: true, discarded: true}},
};

const scene = (stepId: string, sl: string, en: string): LessonScene =>
    ({id: `${stepId}-scene`, basedOn: 'demonstration-default', view: CLIPPING_LESSON_VIEW, actions: clippingSceneActions(CLIPPING_SCENES[stepId]), expectedState: text(sl, en)});

const bezierClippingLesson: GuidedLesson = {
    demonstrationId: 'bezier-clipping',
    title: text('Presečišča z Bézierovim rezanjem', 'Intersections by Bézier clipping'),
    summary: text(
        'Presečišča dveh Bézierjevih krivulj iščemo z Bézierovim rezanjem: kjer krivulja \\(A\\) leži zunaj debele premice krivulje \\(B\\), presečišča ni, zato ta del parametra zavržemo; nato vlogi zamenjamo in ponavljamo. Temu postopku pravimo Bézierovo rezanje. Pri presečišču se obsegi krčijo hitro, pri dotiku počasi. Toleranca je pravilo za ustavitev, ne dokaz. Prekrivanje ovojnic je potreben, ne zadosten pogoj za presečišče, končen tek pa algoritem ponazori in ničesar ne dokaže.',
        'Two Bézier curves are intersected by Bézier clipping: where the curve \\(A\\) lies outside the fat line of the curve \\(B\\) there is no intersection, so that part of the parameter is discarded; then the roles are swapped and the step is repeated. At a crossing the ranges shrink fast, at a tangency slowly. A tolerance is a stopping rule, not a proof. Overlapping hulls are necessary, not sufficient, for an intersection, and a finite run illustrates the algorithm and proves nothing.',
    ),
    prerequisites: [
        text('Potrebno je poznavanje konveksne ovojnice in razpolavljanja Bézierjevih krivulj (lekcija Nazaj k ovojnicam Bézierjevih krivulj) ter poglavja o Bézierjevih krivuljah (pot /bezier/clipping).', 'Assumes the convex hull and the halving of Bézier curves (the lesson Back to hulls of Bézier curves) and the Bézier chapter (the route /bezier/clipping).'),
    ],
    learningGoals: [
        text('Razložiš, kako debela premica krivulje \\(B\\) omeji obseg parametra krivulje \\(A\\) in zakaj zavrženi del ne vsebuje presečišča.', 'Explain how the fat line of the curve \\(B\\) restricts the parameter range of the curve \\(A\\) and why the discarded part contains no intersection.'),
        text('Poveš, da je toleranca pravilo za ustavitev in ne dokaz, da prekrivanje ovojnic ni dovolj za presečišče in da končen tek ničesar ne dokaže.', 'Say that a tolerance is a stopping rule and not a proof, that overlapping hulls are not enough for an intersection, and that a finite run proves nothing.'),
        text('Primerjaš hitro krčenje obsegov pri presečišču s počasnim pri dotiku in veš, da meja števila rezov pri dotiku ni napaka.', 'Compare the fast shrinking of the ranges at a crossing with the slow shrinking at a tangency, and know that the clip limit at a tangency is not an error.'),
    ],
    formulaBlocks: [
        {
            id: 'clipping-distance',
            latex: 'd(t)=\\mathbf{n}\\cdot\\bigl(A(t)-\\mathbf{b}_0\\bigr),\\qquad d_{\\min}\\le d\\le d_{\\max}',
            notation: text(
                '\\(\\mathbf{b}_0\\) je prva kontrolna točka krivulje \\(B\\), \\(\\mathbf{n}\\) enotska normala njene tetive, \\(d_{\\min}\\) in \\(d_{\\max}\\) najmanjša in največja predznačena razdalja kontrolnih točk krivulje \\(B\\) od tetive.',
                '\\(\\mathbf{b}_0\\) is the first control point of the curve \\(B\\), \\(\\mathbf{n}\\) the unit normal of its chord, and \\(d_{\\min}\\) and \\(d_{\\max}\\) the smallest and largest signed distance of the control points of \\(B\\) from the chord.',
            ),
            explanation: text(
                'Pas \\(d_{\\min}\\le d\\le d_{\\max}\\) je debela premica krivulje \\(B\\); krivulja \\(B\\) leži v njem. Razdalja \\(d(t)\\) krivulje \\(A\\) od tetive je polinom, katerega koeficienti so točke z abscisami \\(i/m\\), zato graf funkcije \\(d\\) leži v ovojnici teh točk. Obseg parametra, kjer ovojnica seka pas, ohranimo; ostalo ne more vsebovati presečišča in ga zavržemo.',
                'The strip \\(d_{\\min}\\le d\\le d_{\\max}\\) is the fat line of the curve \\(B\\); the curve \\(B\\) lies in it. The distance \\(d(t)\\) of the curve \\(A\\) from the chord is a polynomial whose coefficients are points with abscissae \\(i/m\\), so the graph of \\(d\\) lies in the hull of those points. The parameter range where the hull meets the strip is kept; the rest cannot contain an intersection and is discarded.',
            ),
        },
        {
            id: 'clipping-stopping',
            latex: 'b-a<10^{-k}',
            notation: text(
                '\\([a,b]\\) je živ obseg parametra v vsaki od obeh krivulj, \\(k\\) izbrana toleranca; rezanje se ustavi, ko sta oba obsega ožja od \\(10^{-k}\\), ali ob meji \\(200\\) rezov.',
                '\\([a,b]\\) is a live parameter range in each of the two curves and \\(k\\) the chosen tolerance; clipping stops when both ranges are narrower than \\(10^{-k}\\), or at the limit of \\(200\\) clips.',
            ),
            explanation: text(
                'Toleranca je pravilo za ustavitev: ozek obseg ne dokaže, da v njem res leži ničla. Zavrženi del je varen, ohranjeni del pa presečišča ne dokazuje. Stanje "meja" ne pove ničesar v nobeno smer: živi obsegi ostanejo na seznamu.',
                'The tolerance is a stopping rule: a narrow range does not prove that a root lies in it. A discarded part is safe, but a kept part does not prove an intersection. The status "limit" says nothing either way: the live ranges stay on the list.',
            ),
        },
    ],
    workedExamples: [
        {
            id: 'clipping-crossing-example',
            title: text('Presečišči krivulj \\(A\\) in \\(B\\)', 'The crossings of the curves \\(A\\) and \\(B\\)'),
            calculationLatex: '8t-8t^2=3-8t+8t^2\\ \\Longleftrightarrow\\ 16t^2-16t+3=(4t-1)(4t-3)=0',
            resultLatex: 't=\\tfrac14,\\quad t=\\tfrac34',
            check: text(
                'Obe krivulji imata \\(x=4t\\), zato se sekata, kjer sta enaki komponenti \\(y\\): \\(y_A=8t-8t^2\\) in \\(y_B=3-8t+8t^2\\). Presečišči sta \\((1;\\ 1{,}5)\\) in \\((3;\\ 1{,}5)\\); rezanje do tolerance najde \\(t=0{,}25\\) in \\(t=0{,}75\\) na obeh krivuljah.',
                'Both curves have \\(x=4t\\), so they meet where the \\(y\\)-components are equal: \\(y_A=8t-8t^2\\) and \\(y_B=3-8t+8t^2\\). The crossings are \\((1;\\ 1.5)\\) and \\((3;\\ 1.5)\\); clipping to the tolerance finds \\(t=0.25\\) and \\(t=0.75\\) on both curves.',
            ),
        },
        {
            id: 'clipping-offset-example',
            title: text('Navpična razlika zamaknjenega para', 'The vertical gap of the offset pair'),
            calculationLatex: 'y_B-y_A=\\bigl(\\tfrac92-8t+8t^2\\bigr)-\\bigl(8t-8t^2\\bigr)=\\tfrac92-16t+16t^2=16\\bigl(t-\\tfrac12\\bigr)^2+\\tfrac12',
            resultLatex: 'y_B-y_A\\ge\\tfrac12',
            check: text(
                'Krivulja \\(B=(0;\\ 4{,}5),(2;\\ 0{,}5),(4;\\ 4{,}5)\\) ima \\(y_B=4{,}5-8t+8t^2\\). Razlika je vedno vsaj \\(0{,}5\\), najmanjša pri \\(t=0{,}5\\), zato se krivulji ne sekata, čeprav se ovojnici kontrolnih točk prekrivata.',
                'The curve \\(B=(0;\\ 4.5),(2;\\ 0.5),(4;\\ 4.5)\\) has \\(y_B=4.5-8t+8t^2\\). The gap is always at least \\(0.5\\), smallest at \\(t=0.5\\), so the curves do not meet although the control hulls overlap.',
            ),
        },
    ],
    steps: [
        {
            id: 'clipping-hulls', order: 1,
            title: text('Krivulji in ovojnici', 'The curves and their hulls'),
            purpose: text('Pred rezanjem napovedati, ali se krivulji sekata, ko se ovojnici prekrivata.', 'Predicting, before any clipping, whether the curves meet when the hulls overlap.'),
            explanation: text(
                'Krivulja \\(A\\) s kontrolnimi točkami \\((0,0)\\), \\((2,4)\\), \\((4,0)\\) (polna črta) in krivulja \\(B\\) s \\((0,3)\\), \\((2,-1)\\), \\((4,3)\\) (črtkana črta) sta prikazani s kontrolnima mnogokotnikoma in ovojnicama. Ovojnici se prekrivata, zato se krivulji lahko sekata, ni pa nujno: prekrivanje je le potreben pogoj. Napovej, ali se res sekata in kolikokrat, še preden pritisneš Naslednji korak; stanje v podoknu Orodja je zdaj prekrivanje.',
                'The curve \\(A\\) with control points \\((0,0)\\), \\((2,4)\\), \\((4,0)\\) (solid) and the curve \\(B\\) with \\((0,3)\\), \\((2,-1)\\), \\((4,3)\\) (dashed) are shown with their control polygons and hulls. The hulls overlap, so the curves may meet, but they need not: overlap is only a necessary condition. Predict whether they really cross and how often before you press Next step; the status in the Tools panel is overlapping.',
            ),
            formulaIds: [],
            frames: [frame('clipping-hulls-explanation', 'explanation'), frame('clipping-hulls-observation', 'observation')],
            observationPrompt: text('Preglej, kje se ovojnici prekrivata, in napovej število presečišč.', 'Look at where the hulls overlap and predict the number of crossings.'),
            expectedObservations: [text('Ovojnici se prekrivata, število rezov je \\(0\\) in stanje je prekrivanje; iz tega še ne sledi presečišče.', 'The hulls overlap, the clip count is \\(0\\) and the status is overlapping; a crossing does not follow from that.')],
            scene: scene('clipping-hulls',
                'Krivulji \\(A\\) in \\(B\\) z ovojnicama, ki se prekrivata; število rezov je \\(0\\).',
                'The curves \\(A\\) and \\(B\\) with overlapping hulls; the clip count is \\(0\\).'),
        },
        {
            id: 'clipping-fat-line', order: 2,
            title: text('Debela premica in graf razdalje', 'The fat line and the distance graph'),
            purpose: text('Videti debelo premico krivulje \\(B\\) in razdaljo krivulje \\(A\\) od nje.', 'Seeing the fat line of the curve \\(B\\) and the distance of the curve \\(A\\) from it.'),
            explanation: text(
                'Debela premica krivulje \\(B\\) je pas ob njeni tetivi, ki vsebuje vse njene kontrolne točke. V podoknu Orodja graf razdalje kaže, kako daleč od tetive je krivulja \\(A\\): križci so točke razdalje, polna črta njihova ovojnica, črtkani pas debela premica. Kjer ovojnica pas seka, \\(A\\) še lahko seka \\(B\\); drugje ne more.',
                'The fat line of the curve \\(B\\) is a strip along its chord that contains all of its control points. In the Tools panel the distance graph shows how far the curve \\(A\\) is from the chord: crosses are the distance points, the solid line is their hull, the dashed strip is the fat line. Where the hull meets the strip \\(A\\) may still meet \\(B\\); elsewhere it cannot.',
            ),
            formulaIds: ['clipping-distance'],
            frames: [frame('clipping-fat-line-explanation', 'explanation'), frame('clipping-fat-line-observation', 'observation')],
            observationPrompt: text('Poišči v grafu razdalje del, kjer ovojnica leži zunaj pasu.', 'Find the part of the distance graph where the hull lies outside the strip.'),
            expectedObservations: [text('Debela premica je narisana okoli krivulje \\(B\\), graf razdalje pa kaže krivuljo \\(A\\); število rezov je še \\(0\\).', 'The fat line is drawn around the curve \\(B\\) and the distance graph shows the curve \\(A\\); the clip count is still \\(0\\).')],
            scene: scene('clipping-fat-line',
                'Debela premica krivulje \\(B\\) in graf razdalje krivulje \\(A\\); število rezov je \\(0\\).',
                'The fat line of the curve \\(B\\) and the distance graph of the curve \\(A\\); the clip count is \\(0\\).'),
        },
        {
            id: 'clipping-clip-a', order: 3,
            title: text('Obseg krivulje \\(A\\) in zavrženi deli', 'The range of \\(A\\) and the discarded parts'),
            purpose: text('Videti, da rez ohrani le obseg parametra, kjer ovojnica seka pas, ostalo pa zavrže.', 'Seeing that a clip keeps only the parameter range where the hull meets the strip and discards the rest.'),
            explanation: text(
                'Prvi rez krivulje \\(A\\) ne zavrže ničesar, ker ovojnica razdalje seka pas po vsem obsegu; rezanje obtiči, zato par razpolovimo. Zdaj je prikazan rez krivulje \\(A\\) ob debeli premici krivulje \\(B\\) na razpolovljenem paru: debeli črti sta ohranjena obsega, sive tanke črte zavrženi deli. Zavrženi del ne more vsebovati presečišča, ohranjeni ga še lahko.',
                'The first clip of the curve \\(A\\) discards nothing, because the hull of the distance meets the strip over the whole range; clipping stalls, so the pair is halved. Now a clip of the curve \\(A\\) against the fat line of the curve \\(B\\) on the halved pair is shown: thick lines are the kept ranges, thin grey lines the discarded parts. A discarded part cannot contain an intersection, a kept one still may.',
            ),
            formulaIds: ['clipping-distance'],
            frames: [frame('clipping-clip-a-explanation', 'explanation'), frame('clipping-clip-a-observation', 'observation')],
            observationPrompt: text('Primerjaj debele in tanke dele krivulje \\(A\\) in preberi živ obseg v tabeli.', 'Compare the thick and thin parts of the curve \\(A\\) and read the live range in the table.'),
            expectedObservations: [text('Del krivulje \\(A\\) je zavržen (siv), preostanek je ohranjen (debel); stanje je, da rezanje še poteka.', 'Part of the curve \\(A\\) is discarded (grey), the rest is kept (thick); the status is that clipping is still running.')],
            scene: scene('clipping-clip-a',
                'Rez krivulje \\(A\\) ob debeli premici krivulje \\(B\\): zavrženi deli so sivi, rezanje še poteka.',
                'A clip of the curve \\(A\\) against the fat line of the curve \\(B\\): the discarded parts are grey, clipping is still running.'),
        },
        {
            id: 'clipping-swap', order: 4,
            title: text('Zamenjava vlog: rez krivulje \\(B\\)', 'Swapping roles: clipping \\(B\\)'),
            purpose: text('Videti, da zdaj debela premica krivulje \\(A\\) reže krivuljo \\(B\\).', 'Seeing that the fat line of the curve \\(A\\) now clips the curve \\(B\\).'),
            explanation: text(
                'Naslednji rez zamenja vlogi: debela premica krivulje \\(A\\) (njenega ožje ohranjenega dela) reže krivuljo \\(B\\). Napis grafa razdalje se spremeni v razdaljo krivulje \\(B\\) do debele premice krivulje \\(A\\). Menjava pomaga, ker krajši ohranjeni del krivulje \\(A\\) da ožjo debelo premico, ta pa spet krajši del krivulje \\(B\\).',
                'The next clip swaps the roles: the fat line of the curve \\(A\\) (of its narrower kept part) clips the curve \\(B\\). The caption of the distance graph changes to the distance of the curve \\(B\\) from the fat line of the curve \\(A\\). The swap helps because a shorter kept part of \\(A\\) gives a narrower fat line, which in turn cuts a shorter part of \\(B\\).',
            ),
            formulaIds: ['clipping-distance'],
            frames: [frame('clipping-swap-explanation', 'explanation'), frame('clipping-swap-observation', 'observation')],
            observationPrompt: text('Preberi napis grafa razdalje in primerjaj ohranjena obsega obeh krivulj.', 'Read the caption of the distance graph and compare the kept ranges of the two curves.'),
            expectedObservations: [text('Graf razdalje kaže krivuljo \\(B\\) ob debeli premici krivulje \\(A\\); ohranjena obsega se krčita.', 'The distance graph shows the curve \\(B\\) against the fat line of the curve \\(A\\); the kept ranges are shrinking.')],
            scene: scene('clipping-swap',
                'Rez krivulje \\(B\\) ob debeli premici krivulje \\(A\\); rezanje še poteka.',
                'A clip of the curve \\(B\\) against the fat line of the curve \\(A\\); clipping is still running.'),
        },
        {
            id: 'clipping-repeat', order: 5,
            title: text('Ponavljanje do tolerance', 'Repeating to the tolerance'),
            purpose: text('Videti, kako se obsega krčita do tolerance, in prebrati rezultat.', 'Seeing the ranges shrink to the tolerance and reading the result.'),
            explanation: text(
                'Rezanje ponavljamo, dokler nista oba obsega ožja od tolerance \\(10^{-6}\\). Pri presečišču se obsegi krčijo hitro: po \\(21\\) rezih sta najdena obseg okoli \\(t=0{,}25\\) in obseg okoli \\(t=0{,}75\\) na obeh krivuljah, kar ujema z rešitvijo enačbe \\(16t^2-16t+3=0\\). Pri toleranci \\(10^{-3}\\) je rezov \\(17\\). Toleranca je pravilo za ustavitev, ne dokaz: ozek obseg ne dokazuje, da v njem leži ničla, in končen tek algoritem le ponazori.',
                'Clipping repeats until both ranges are narrower than the tolerance \\(10^{-6}\\). At a crossing the ranges shrink fast: after \\(21\\) clips there is one range around \\(t=0.25\\) and one around \\(t=0.75\\) on both curves, which agrees with the solution of the equation \\(16t^2-16t+3=0\\). With the tolerance \\(10^{-3}\\) there are \\(17\\) clips. A tolerance is a stopping rule, not a proof: a narrow range does not prove that a root lies in it, and a finite run only illustrates the algorithm.',
            ),
            formulaIds: ['clipping-stopping'], workedExampleId: 'clipping-crossing-example',
            frames: [frame('clipping-repeat-explanation', 'explanation'), frame('clipping-repeat-calculation', 'calculation'), frame('clipping-repeat-observation', 'observation')],
            observationPrompt: text('Najprej pritisni Skrij. Preberi obsega v tabeli in število rezov; nato v podoknu Orodja izberi toleranco \\(10^{-3}\\), pritisni Predvajaj do konca teka in primerjaj.', 'First press Hide. Read the ranges in the table and the clip count; then choose the tolerance \\(10^{-3}\\) in the Tools panel, press Play until the run ends and compare.'),
            expectedObservations: [text('Stanje je najdeno, število rezov \\(21\\), dva rezultata okoli \\(0{,}25\\) in \\(0{,}75\\); pri toleranci \\(10^{-3}\\) je rezov \\(17\\).', 'The status is found, the clip count is \\(21\\), two results around \\(0.25\\) and \\(0.75\\); with the tolerance \\(10^{-3}\\) there are \\(17\\) clips.')],
            scene: scene('clipping-repeat',
                'Toleranca \\(10^{-6}\\), konec teka: najdeno, \\(21\\) rezov, rezultata okoli \\(0{,}25\\) in \\(0{,}75\\).',
                'Tolerance \\(10^{-6}\\), end of the run: found, \\(21\\) clips, results around \\(0.25\\) and \\(0.75\\).'),
        },
        {
            id: 'clipping-tangent', order: 6,
            title: text('Dotik: počasno krčenje in meja rezov', 'A tangency: slow shrinking and the clip limit'),
            purpose: text('Videti, da se obsegi pri dotiku krčijo počasi in da rezanje pri visoki toleranci doseže mejo.', 'Seeing that the ranges shrink slowly at a tangency and that clipping reaches its limit at a high tolerance.'),
            explanation: text(
                'Krivulja \\(B=(0,4),(2,0),(4,4)\\) se krivulje \\(A\\) dotika v točki \\((2,2)\\) pri \\(t=0{,}5\\) (dvojna ničla enačbe \\(16t^2-16t+4=0\\)). Rezanje je tu počasno: pri toleranci \\(10^{-3}\\) je rezov \\(53\\), pri \\(10^{-6}\\) pa \\(113\\), približno \\(5{,}4\\)-krat več kot \\(21\\) pri presečišču. Pri zdaj izbrani toleranci \\(10^{-10}\\) se rezanje ustavi ob meji \\(200\\) rezov s stanjem meja: ostane en rezultat in \\(28\\) nerešenih parov. Od teh jih je \\(26\\) blizu \\(0{,}5\\), do zadnjih dveh pa rezanje ni prišlo in sta široka, zato je najširši obseg \\(1\\). Rezultat tabela zaokroži na \\(0{,}5\\), v resnici pa leži približno \\(5\\cdot10^{-7}\\) pod \\(t=0{,}5\\) in te vrednosti ne vsebuje, zato ni točka dotika: ta ostaja med nerešenimi pari. To ni napaka in ničesar ne dokaže: pri dotiku ovojnica ne more potrditi dvojne ničle.',
                'The curve \\(B=(0,4),(2,0),(4,4)\\) touches the curve \\(A\\) at the point \\((2,2)\\) at \\(t=0.5\\) (the double root of the equation \\(16t^2-16t+4=0\\)). Clipping is slow here: with the tolerance \\(10^{-3}\\) there are \\(53\\) clips, with \\(10^{-6}\\) there are \\(113\\), about \\(5.4\\) times as many as the \\(21\\) at the crossing. With the tolerance \\(10^{-10}\\), which is selected now, clipping stops at the limit of \\(200\\) clips with the status limit: one result and \\(28\\) unresolved pairs remain. Of these, \\(26\\) are near \\(0.5\\); clipping did not reach the last two, which are wide, so the widest range is \\(1\\). The table rounds the result to \\(0.5\\), but it lies about \\(5\\cdot10^{-7}\\) below \\(t=0.5\\) and does not contain that value, so it is not the touching point, which stays among the unresolved pairs. That is not an error and it proves nothing: at a tangency the hull cannot confirm a double root.',
            ),
            formulaIds: ['clipping-stopping'],
            frames: [frame('clipping-tangent-explanation', 'explanation'), frame('clipping-tangent-observation', 'observation')],
            observationPrompt: text('Najprej pritisni Skrij. Preberi stanje, število rezov in tabelo; nato izberi toleranco \\(10^{-3}\\), pritisni Predvajaj do konca teka in primerjaj število rezov.', 'First press Hide. Read the status, the clip count and the table; then choose the tolerance \\(10^{-3}\\), press Play until the run ends and compare the clip count.'),
            expectedObservations: [text('Stanje je meja, \\(200\\) rezov, en rezultat, \\(28\\) nerešenih parov in najširši obseg \\(1\\); pri \\(10^{-3}\\) je stanje najdeno s \\(53\\) rezi.', 'The status is limit, \\(200\\) clips, one result, \\(28\\) unresolved pairs and the widest range \\(1\\); with \\(10^{-3}\\) the status is found with \\(53\\) clips.')],
            scene: scene('clipping-tangent',
                'Dotikajoči se par pri toleranci \\(10^{-10}\\): meja, \\(200\\) rezov, \\(28\\) nerešenih parov.',
                'The tangent pair with the tolerance \\(10^{-10}\\): limit, \\(200\\) clips, \\(28\\) unresolved pairs.'),
        },
        {
            id: 'clipping-offset', order: 7,
            title: text('Zamaknjeni par: ovojnici se prekrivata, presečišča ni', 'The offset pair: overlapping hulls, no intersection'),
            purpose: text('Videti, da rezanje pokaže, da se krivulji ne sekata, čeprav se ovojnici prekrivata.', 'Seeing that clipping shows the curves do not meet although the hulls overlap.'),
            explanation: text(
                'Krivulja \\(B=(0;\\ 4{,}5),(2;\\ 0{,}5),(4;\\ 4{,}5)\\) je nad \\(A\\), vendar se ovojnici kontrolnih točk prekrivata. Pritisni Ponastavi in na začetku vidiš prekrivanje. Rezanje po \\(17\\) rezih zavrže vse obsege in stanje je prazno: navpična razlika \\(4{,}5-16t+16t^2\\) je vsaj \\(0{,}5\\), zato presečišča ni. Prekrivanje ovojnic je potreben, ne zadosten pogoj.',
                'The curve \\(B=(0;\\ 4.5),(2;\\ 0.5),(4;\\ 4.5)\\) is above \\(A\\), yet the control hulls overlap. Press Reset and you see the overlap at the start. After \\(17\\) clips clipping discards every range and the status is empty: the vertical gap \\(4.5-16t+16t^2\\) is at least \\(0.5\\), so there is no intersection. Overlapping hulls are necessary, not sufficient.',
            ),
            formulaIds: ['clipping-distance'], workedExampleId: 'clipping-offset-example',
            frames: [frame('clipping-offset-explanation', 'explanation'), frame('clipping-offset-calculation', 'calculation'), frame('clipping-offset-observation', 'observation')],
            observationPrompt: text('Preberi stanje na koncu, nato pritisni Ponastavi in preberi stanje na začetku.', 'Read the status at the end, then press Reset and read the status at the start.'),
            expectedObservations: [text('Na koncu je stanje prazno po \\(17\\) rezih in tabela nima obsega; na začetku je stanje prekrivanje.', 'At the end the status is empty after \\(17\\) clips and the table has no range; at the start the status is overlapping.')],
            scene: scene('clipping-offset',
                'Zamaknjeni par: konec teka, prazno po \\(17\\) rezih, brez obsega.',
                'The offset pair: end of the run, empty after \\(17\\) clips, no range.'),
        },
        {
            id: 'clipping-explore', order: 8,
            title: text('Prosto raziskovanje', 'Free exploration'),
            purpose: text('Samostojno premikati kontrolne točke in spreminjati toleranco.', 'Moving control points and changing the tolerance on your own.'),
            explanation: text(
                'Spet je prikazan prvi par. Premikaj kontrolne točke obeh krivulj, spreminjaj toleranco in pritiskaj Naslednji korak. Premik točke ali tolerance vrne prikaz na začetek. Poišči položaj, pri katerem se krivulji komaj dotikata, in položaj, pri katerem se ovojnici prekrivata, krivulji pa se ne sekata. Pomni: prekrivanje je potreben pogoj, toleranca je pravilo za ustavitev, končen tek pa ničesar ne dokaže. Stopnje nad \\(3\\) niso na voljo.',
                'The first pair is shown again. Move the control points of both curves, change the tolerance and press Next step. Moving a point or the tolerance returns the display to the start. Find a position where the curves barely touch and one where the hulls overlap but the curves do not meet. Remember: overlap is a necessary condition, a tolerance is a stopping rule, and a finite run proves nothing. Degrees above \\(3\\) are not offered.',
            ),
            formulaIds: ['clipping-distance', 'clipping-stopping'],
            frames: [frame('clipping-explore-explanation', 'explanation'), frame('clipping-explore-observation', 'observation')],
            observationPrompt: text('Poskusi najti položaj, pri katerem rezanje doseže mejo, in položaj, pri katerem je stanje prazno kljub prekrivanju ovojnic.', 'Try to find a position where clipping reaches the limit and one where the status is empty despite overlapping hulls.'),
            expectedObservations: [text('Blizu dotika število rezov hitro naraste in doseže mejo; pri prekrivanju ovojnic je stanje lahko prazno.', 'Near a tangency the clip count grows fast and reaches the limit; with overlapping hulls the status can still be empty.')],
            scene: scene('clipping-explore',
                'Prvi par spet na začetku, vse plasti prikazane; vse je prosto za raziskovanje.',
                'The first pair again at the start, every layer shown; everything is free to explore.'),
        },
    ],
    sources: [
        {id: 'sederberg-nishita', citation: 'Sederberg, T. W., Nishita, T. Curve intersection using Bézier clipping, Computer-Aided Design 22 (1990), 538-549.'},
        {
            id: 'bezeg-clipping-implementation',
            citation: 'Bezeg source: src/bezeg/impl/kernels/bezier-clipping.ts, src/graphs/compgeo/BezierClippingGraph.tsx and BezierClippingControls.tsx.',
            implementationCorrespondence: 'All values come from the clipping kernel; a lesson scene loads the curve pair, sets the tolerance, the five overlays and the trace step with the point-set actions load-model, set-clip-tolerance, set-overlay and set-trace-step. The fat line is the band of the minimum and maximum signed control-point distances; a range is discarded only if the hull misses the band by more than a margin of 10^-12 of the control-point scale.',
        },
    ],
    edgeCases: [
        text('Pri dotiku in sovpadajočih odsekih rezanje doseže mejo rezov: to je poročano, ne rešeno; tak par je zunaj obsega lekcije.', 'At a tangency and for coincident segments clipping reaches the clip limit: this is reported, not solved; such a pair is out of scope of the lesson.'),
        text('Stanje meja ne dokaže ne presečišča ne njegove odsotnosti; živi obsegi ostanejo na seznamu.', 'The status limit proves neither an intersection nor its absence; the live ranges stay on the list.'),
    ],
    unresolvedQuestions: [],
};

export const bezierClippingGuidedLessons: readonly GuidedLesson[] = [bezierClippingLesson];
