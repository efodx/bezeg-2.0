/**
 * Guided lessons of the phase-portraits family, batch C (docs/specs/phase-portraits-lessons.md): PP4, the logistic map beyond r = 3, and PP5, the bifurcation diagram, both on
 * `logistic-map` (LogisticMapGraph). The scenes use only the `phase` actions the graph registers (`set-r`, `set-seed`, `set-step`) and every scene starts from the Demonstration default
 * (r = 2,9, x0 = 0,2, no step drawn) and names what it sets. Every number the text quotes is a readout of the graph for that scene, an exact value computed in the same step, or a value the
 * learner reads after an action the text asks for; the numbers are listed per step in docs/reviews/feature-streams/families-prep/notes/f3-pp-c.md. Fixed point and 2-cycle statements are
 * exact (the multipliers 2 - r and 4 + 2r - r^2); every higher period, every orbit value and the diagram are computed in double precision and said so; for r past 3,56995 the graph makes
 * no period claim and the text does not either. A property seen at one r or one start is stated for that r and that start only.
 *
 * Batch A: PP1, the linear system x' = Ax, and PP2, the pendulum, both on `phase-portrait` (PhasePortraitGraph), with the `phase` actions `set-matrix`, `set-system` and `set-seeds`.
 * The graph shows the type, eigenvalues, H and the swing/rotation status at once and has no view modes, so each step opens on the previous state and asks for the effect of a change
 * before the learner makes it. Numbers per step: docs/reviews/feature-streams/families-prep/notes/pp-a-s2.md. PP3 (linearization) belongs to batch B.
 */
import type {LessonAction} from '../model';
import type {FormulaBlock, GuidedLesson, GuidedLessonFrame, GuidedLessonStep, LessonScene, LocalizedText, WorkedExample} from './guidedLessons';

/** The lesson text is written once with decimal commas in math (`{,}`); the English text gets decimal points. */
const text = (sl: string, en: string): LocalizedText => ({sl, en: en.replace(/\{,\}/g, '.')});
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

/** What a logistic-map scene sets on top of the Demonstration default: the stored integers `R` (r times 100), `X` (x0 times 100) and the number of drawn cobweb steps. */
export interface PhaseSceneSpec {
    readonly R?: number;
    readonly X?: number;
    readonly step?: number;
}

/** The actions of a logistic-map scene: the Demonstration default, then r, the start and the step count. */
export const phasePortraitsSceneActions = (id: string, spec: PhaseSceneSpec): LessonAction[] => [
    {kind: 'prepared-scene', sceneId: id, source: 'demonstration-default'},
    ...(spec.R !== undefined ? [{kind: 'phase', operation: 'set-r', R: spec.R} as const] : []),
    ...(spec.X !== undefined ? [{kind: 'phase', operation: 'set-seed', X: spec.X} as const] : []),
    ...(spec.step !== undefined ? [{kind: 'phase', operation: 'set-step', step: spec.step} as const] : []),
];

const phaseScene = (id: string, spec: PhaseSceneSpec, sl: string, en: string): LessonScene =>
    ({id, basedOn: 'demonstration-default', actions: phasePortraitsSceneActions(id, spec), expectedState: text(sl, en)});

/**
 * What a phase-plane scene sets on top of the Demonstration default (the matrix N = (-4 -1; -2 -3), one seed (1, 0), system `linear`): the system, the stored matrix entries
 * A, B, C, D (entry = value / 4) and the seeds (seed = X / 20, Y / 20; the pendulum reads a seed as (theta, omega)).
 */
export interface PhasePlaneSceneSpec {
    readonly system?: 'linear' | 'pendulum' | 'weak-spiral';
    /** 0 = (0, 0), 1 = (pi, 0) (pendulum only); applied after the system. */
    readonly equilibrium?: 0 | 1;
    /** Integer 0 to 4; the half-width of the view around the equilibrium is 4 / 2^zoom. */
    readonly zoom?: 0 | 1 | 2 | 3 | 4;
    readonly matrix?: {readonly A: number; readonly B: number; readonly C: number; readonly D: number};
    readonly seeds?: readonly {readonly X: number; readonly Y: number}[];
}

/** The actions of a phase-plane scene: the Demonstration default, then the system, the matrix and the seeds. */
export const phasePlaneSceneActions = (id: string, spec: PhasePlaneSceneSpec): LessonAction[] => [
    {kind: 'prepared-scene', sceneId: id, source: 'demonstration-default'},
    ...(spec.system !== undefined ? [{kind: 'phase', operation: 'set-system', system: spec.system} as const] : []),
    ...(spec.equilibrium !== undefined ? [{kind: 'phase', operation: 'set-equilibrium', equilibrium: spec.equilibrium} as const] : []),
    ...(spec.zoom !== undefined ? [{kind: 'phase', operation: 'set-zoom', zoom: spec.zoom} as const] : []),
    ...(spec.matrix !== undefined ? [{kind: 'phase', operation: 'set-matrix', ...spec.matrix} as const] : []),
    ...(spec.seeds !== undefined ? [{kind: 'phase', operation: 'set-seeds', seeds: spec.seeds} as const] : []),
];

const planeScene = (id: string, spec: PhasePlaneSceneSpec, sl: string, en: string): LessonScene =>
    ({id, basedOn: 'demonstration-default', actions: phasePlaneSceneActions(id, spec), expectedState: text(sl, en)});

/** PP1. Matrices in stored quarter units; E = (4 1; 2 3) of linear-maps L3 and N = -E (the Demonstration default). */
const MATRIX_E = {A: 16, B: 4, C: 8, D: 12} as const;
const MATRIX_N = {A: -16, B: -4, C: -8, D: -12} as const;
const MATRIX_NEAR_CENTRE = {A: 0, B: -4, C: 4, D: -1} as const;
const MATRIX_CENTRE = {A: 0, B: -4, C: 4, D: 0} as const;
export const PP1_UNSTABLE = {system: 'linear', matrix: MATRIX_E, seeds: [{X: 20, Y: 0}]} as const;
export const PP1_ON_FAST_LINE = {system: 'linear', matrix: MATRIX_N, seeds: [{X: 20, Y: 20}]} as const;
export const PP1_FOUR_SEEDS = {system: 'linear', matrix: MATRIX_N, seeds: [{X: 20, Y: 0}, {X: 0, Y: 20}, {X: 20, Y: 1}, {X: 1, Y: 20}]} as const;
export const PP1_NODE = {system: 'linear', matrix: MATRIX_N, seeds: [{X: 20, Y: 0}]} as const;
export const PP1_NEAR_CENTRE = {system: 'linear', matrix: MATRIX_NEAR_CENTRE, seeds: [{X: 20, Y: 0}]} as const;
export const PP1_CENTRE = {system: 'linear', matrix: MATRIX_CENTRE, seeds: [{X: 20, Y: 0}]} as const;
export const PP1_FREE = {system: 'linear', matrix: MATRIX_N, seeds: [{X: 20, Y: 0}]} as const;
/** PP2. The linearization of the pendulum at (0, 0) is (0 1; -1 0), a centre; seeds are (theta, omega). */
export const PP2_LINEAR_CENTRE = {system: 'linear', matrix: {A: 0, B: 4, C: -4, D: 0}, seeds: [{X: 20, Y: 0}]} as const;
export const PP2_SMALL = {system: 'pendulum', seeds: [{X: 20, Y: 0}]} as const;
export const PP2_LARGE = {system: 'pendulum', seeds: [{X: 0, Y: 38}]} as const;
export const PP2_ROTATION = {system: 'pendulum', seeds: [{X: 0, Y: 45}]} as const;
export const PP2_FREE = {system: 'pendulum', seeds: [{X: 20, Y: 0}]} as const;

/** PP3. Seeds are absolute (theta, omega) or (x, y), seed = X / 20: (3,15; 0,05) and (3,1; -0,05) are near the saddle (pi, 0); (0,1; 0) stays in view at zoom 3. */
export const PP3_LINEAR = {} as const;
export const PP3_SADDLE_NEAR = {system: 'pendulum', equilibrium: 1, seeds: [{X: 63, Y: 1}, {X: 62, Y: -1}]} as const;
export const PP3_SADDLE_UNIT = {system: 'pendulum', equilibrium: 1, seeds: [{X: 20, Y: 0}]} as const;
export const PP3_PENDULUM_CENTRE = {system: 'pendulum', equilibrium: 0, seeds: [{X: 20, Y: 0}]} as const;
export const PP3_WEAK_SMALL = {system: 'weak-spiral', seeds: [{X: 2, Y: 0}]} as const;
export const PP3_FREE = PP3_PENDULUM_CENTRE;

/** PP4. The Demonstration default is r = 2,9, x0 = 0,2, step 0. */
export const PP4_SETTLES = {R: 290, step: 20} as const;
export const PP4_NEUTRAL = {R: 300, step: 20} as const;
export const PP4_TWO_CYCLE = {R: 310, step: 59} as const;
export const PP4_FOUR_CYCLE = {R: 350, step: 56} as const;
export const PP4_EIGHT_CYCLE = {R: 355, step: 52} as const;
export const PP4_CHAOS = {R: 400, step: 5} as const;
export const PP4_FREE = {R: 350} as const;
/** PP5. */
export const PP5_BRANCH = {R: 290} as const;
export const PP5_FIRST_SPLIT = {R: 300} as const;
export const PP5_FASTER = {R: 345} as const;
export const PP5_WINDOW = {R: 383, step: 54} as const;
export const PP5_FREE = {R: 390} as const;

// ---- Formulas and worked examples --------------------------------------------------------------------------------------------------

const formulas: readonly FormulaBlock[] = [
    {
        id: 'logistic-fixed',
        latex: 'f(x)=rx(1-x),\\quad x^{*}=1-\\frac1r,\\quad f^{\\prime}(x^{*})=2-r',
        notation: text(
            '\\(f\\) je logistična preslikava, \\(r\\) njen parameter, \\(x^{*}\\) negibna točka (\\(f(x^{*})=x^{*}\\)) in \\(f^{\\prime}(x^{*})\\) množitelj negibne točke.',
            '\\(f\\) is the logistic map, \\(r\\) its parameter, \\(x^{*}\\) the fixed point (\\(f(x^{*})=x^{*}\\)) and \\(f^{\\prime}(x^{*})\\) the multiplier of the fixed point.',
        ),
        explanation: text(
            'Iteracija je zaporedje \\(x_{n+1}=f(x_n)\\). Negibna točka privlači, če je \\(|f^{\\prime}(x^{*})|<1\\), in odbija, če je \\(|f^{\\prime}(x^{*})|>1\\); pri \\(|f^{\\prime}(x^{*})|=1\\) odvod ne odloči. Ker je \\(f^{\\prime}(x^{*})=2-r\\), negibna točka privlači natanko za \\(1<r<3\\). To je račun z odvodom, cobweb (pajkova mreža) ga ponazori.',
            'The iteration is the sequence \\(x_{n+1}=f(x_n)\\). A fixed point attracts when \\(|f^{\\prime}(x^{*})|<1\\) and repels when \\(|f^{\\prime}(x^{*})|>1\\); at \\(|f^{\\prime}(x^{*})|=1\\) the derivative does not decide. Since \\(f^{\\prime}(x^{*})=2-r\\), the fixed point attracts exactly for \\(1<r<3\\). This is a derivative computation; the cobweb illustrates it.',
        ),
    },
    {
        id: 'logistic-two-cycle',
        latex: 'x_{1,2}=\\frac{(r+1)\\pm\\sqrt{(r+1)(r-3)}}{2r},\\quad m=f^{\\prime}(x_1)f^{\\prime}(x_2)=4+2r-r^{2}',
        notation: text(
            '\\(x_1\\) in \\(x_2\\) sta točki dvocikla (\\(f(x_1)=x_2\\), \\(f(x_2)=x_1\\)), \\(m\\) je množitelj dvocikla.',
            '\\(x_1\\) and \\(x_2\\) are the points of the 2-cycle (\\(f(x_1)=x_2\\), \\(f(x_2)=x_1\\)) and \\(m\\) is the multiplier of the 2-cycle.',
        ),
        explanation: text(
            'Argument: iz \\(f(f(x))=x\\) po deljenju z negibno točko ostane kvadratna enačba \\(r^{2}x^{2}-r(r+1)x+(r+1)=0\\) z vsoto korenov \\((r+1)/r\\) in produktom \\((r+1)/r^{2}\\). Realna korena obstajata za \\(r>3\\). Množitelj je \\(r^{2}(1-2x_1)(1-2x_2)=r^{2}-2r(r+1)+4(r+1)=4+2r-r^{2}\\). Dvocikel privlači, če je \\(|m|<1\\); za \\(r>3\\) je \\(m<1\\), zato privlači natanko, dokler je \\(m>-1\\), to je za \\(r<1+\\sqrt6\\).',
            'Argument: from \\(f(f(x))=x\\), after dividing out the fixed point, the quadratic \\(r^{2}x^{2}-r(r+1)x+(r+1)=0\\) remains, with sum of roots \\((r+1)/r\\) and product \\((r+1)/r^{2}\\). Real roots exist for \\(r>3\\). The multiplier is \\(r^{2}(1-2x_1)(1-2x_2)=r^{2}-2r(r+1)+4(r+1)=4+2r-r^{2}\\). The 2-cycle attracts when \\(|m|<1\\); for \\(r>3\\) we have \\(m<1\\), so it attracts exactly while \\(m>-1\\), that is for \\(r<1+\\sqrt6\\).',
        ),
    },
    {
        id: 'logistic-doublings',
        latex: 'r_1=3,\\quad r_2=1+\\sqrt6,\\quad \\delta_n=\\frac{r_{n+1}-r_n}{r_{n+2}-r_{n+1}}',
        notation: text(
            '\\(r_n\\) je parameter, pri katerem se perioda \\(2^{n-1}\\) podvoji v \\(2^{n}\\); \\(\\delta_n\\) je razmerje zaporednih razmakov med podvojitvami.',
            '\\(r_n\\) is the parameter at which the period \\(2^{n-1}\\) doubles to \\(2^{n}\\); \\(\\delta_n\\) is the ratio of consecutive gaps between doublings.',
        ),
        explanation: text(
            'Prvi dve podvojitvi sta točni: \\(r_1=3\\) (množitelj negibne točke \\(-1\\)) in \\(r_2=1+\\sqrt6\\) (množitelj dvocikla \\(-1\\)). Naslednje so le številske: \\(r_3\\) in \\(r_4\\) sta izračunani zunaj aplikacije (Newtonova metoda na pogoju, da je množitelj cikla \\(-1\\)), zato sta približni. Razmerja \\(\\delta_n\\) so približno \\(4{,}75\\) in \\(4{,}66\\); znana mejna vrednost, približno \\(4{,}669\\), je navedena, ne izračunana v aplikaciji.',
            'The first two doublings are exact: \\(r_1=3\\) (multiplier of the fixed point \\(-1\\)) and \\(r_2=1+\\sqrt6\\) (multiplier of the 2-cycle \\(-1\\)). The next are only numerical: \\(r_3\\) and \\(r_4\\) were computed outside the app (Newton\'s method on the condition that the multiplier of the cycle is \\(-1\\)), so they are approximate. The ratios \\(\\delta_n\\) are about \\(4{,}75\\) and \\(4{,}66\\); the known limit, about \\(4{,}669\\), is cited, not computed in the app.',
        ),
    },
];

const examples: readonly WorkedExample[] = [
    {
        id: 'pp4-two-cycle',
        title: text('Dvocikel pri \\(r=3{,}1\\)', 'The 2-cycle at \\(r=3{,}1\\)'),
        calculationLatex: 'x_{1,2}=\\frac{4{,}1\\pm\\sqrt{0{,}41}}{6{,}2}=\\frac{4{,}1\\pm0{,}6403124}{6{,}2},\\quad m=4+2\\cdot3{,}1-3{,}1^{2}',
        resultLatex: 'x_1\\approx0{,}558014,\\quad x_2\\approx0{,}764567,\\quad m=0{,}59',
        check: text(
            'Odčitek Dvocikel pri \\(r=3{,}1\\) kaže \\(0{,}558014\\leftrightarrow0{,}764567\\) in Množitelj dvocikla \\(0{,}59\\); ker je \\(|0{,}59|<1\\), dvocikel privlači (točen test), vrednosti pa so zaokrožene na šest decimalk.',
            'The readout 2-cycle at \\(r=3{,}1\\) shows \\(0{,}558014\\leftrightarrow0{,}764567\\) and Multiplier of the 2-cycle \\(0{,}59\\); since \\(|0{,}59|<1\\) the 2-cycle attracts (an exact test), and the values are rounded to six decimals.',
        ),
    },
    {
        id: 'pp5-ratios',
        title: text('Razmerja razmakov med podvojitvami', 'The ratios of the gaps between doublings'),
        calculationLatex: 'r_2-r_1=\\sqrt6-2\\approx0{,}449490,\\quad r_3-r_2\\approx0{,}094601,\\quad r_4-r_3\\approx0{,}020317',
        resultLatex: '\\delta_1\\approx\\frac{0{,}449490}{0{,}094601}\\approx4{,}75,\\quad \\delta_2\\approx\\frac{0{,}094601}{0{,}020317}\\approx4{,}66',
        check: text(
            'Vrednosti \\(r_3\\approx3{,}544090\\) in \\(r_4\\approx3{,}564407\\) sta številski, izračunani zunaj aplikacije; \\(r_1=3\\) in \\(r_2=1+\\sqrt6\\approx3{,}449490\\) sta točni. Razmerji sta približni in ne dokazujeta mejne vrednosti.',
            'The values \\(r_3\\approx3{,}544090\\) and \\(r_4\\approx3{,}564407\\) are numerical, computed outside the app; \\(r_1=3\\) and \\(r_2=1+\\sqrt6\\approx3{,}449490\\) are exact. The ratios are approximate and do not prove the limit.',
        ),
    },
];

// ---- PP1 ---------------------------------------------------------------------------------------------------------------------------

const pp1Formulas: readonly FormulaBlock[] = [
    {
        id: 'pp1-eigen',
        latex: 'x^{\\prime}=Ax,\\quad Av=\\lambda v\\ \\Rightarrow\\ x(t)=e^{\\lambda t}v,\\quad x(t)=c_1e^{\\lambda_1t}v_1+c_2e^{\\lambda_2t}v_2',
        notation: text(
            '\\(x\\) je točka ravnine, \\(A\\) matrika \\(2\\times2\\), \\(v\\neq0\\) lastni vektor z lastno vrednostjo \\(\\lambda\\); \\(v_1\\), \\(v_2\\) in \\(\\lambda_1\\), \\(\\lambda_2\\) sta dva lastna vektorja in njuni lastni vrednosti, \\(c_1\\), \\(c_2\\) konstanti.',
            '\\(x\\) is a point of the plane, \\(A\\) a \\(2\\times2\\) matrix, \\(v\\neq0\\) an eigenvector with eigenvalue \\(\\lambda\\); \\(v_1\\), \\(v_2\\) and \\(\\lambda_1\\), \\(\\lambda_2\\) are two eigenvectors and their eigenvalues, \\(c_1\\), \\(c_2\\) constants.',
        ),
        explanation: text(
            'Če je \\(Av=\\lambda v\\), je \\(x(t)=e^{\\lambda t}v\\) rešitev, ker je \\(x^{\\prime}=\\lambda e^{\\lambda t}v=A\\,e^{\\lambda t}v\\). Trajektorija, ki začne na premici skozi \\(v\\), na njej ostane: to je lastna smer. Pri dveh različnih realnih lastnih vrednostih je vsaka rešitev vsota takih členov. Skozi vsako točko poteka natanko ena trajektorija (enoličnost rešitve), zato se trajektorije ne sekajo; to je izrek (FMF Analiza 3, kot je navedeno), slika ga ne dokazuje.',
            'If \\(Av=\\lambda v\\), then \\(x(t)=e^{\\lambda t}v\\) is a solution, since \\(x^{\\prime}=\\lambda e^{\\lambda t}v=A\\,e^{\\lambda t}v\\). A trajectory that starts on the line through \\(v\\) stays on it: this is an eigen-direction. For two different real eigenvalues every solution is a sum of such terms. Exactly one trajectory passes through each point (uniqueness of solutions), so trajectories do not cross; this is a theorem (FMF Analiza 3, as cited), and the picture does not prove it.',
        ),
    },
    {
        id: 'pp1-classify',
        latex: '\\tau=a+d,\\quad \\delta=ad-bc,\\quad \\lambda^{2}-\\tau\\lambda+\\delta=0,\\quad \\Delta=\\tau^{2}-4\\delta,\\quad \\lambda_{1,2}=\\frac{\\tau\\pm\\sqrt{\\Delta}}{2}',
        notation: text(
            '\\(a\\), \\(b\\) sta elementa prve vrstice matrike \\(A\\), \\(c\\), \\(d\\) druge; \\(\\tau\\) je sled, \\(\\delta\\) determinanta, \\(\\Delta\\) diskriminanta karakteristične enačbe.',
            '\\(a\\), \\(b\\) are the entries of the first row of \\(A\\), \\(c\\), \\(d\\) of the second; \\(\\tau\\) is the trace, \\(\\delta\\) the determinant, \\(\\Delta\\) the discriminant of the characteristic equation.',
        ),
        explanation: text(
            'Lastni vrednosti sta korena enačbe \\(\\lambda^{2}-\\tau\\lambda+\\delta=0\\); odčitki Sled, Determinanta in Diskriminanta kažejo \\(\\tau\\), \\(\\delta\\) in \\(\\Delta\\), Lastni vrednosti (izračunani) pa korena.',
            'The eigenvalues are the roots of \\(\\lambda^{2}-\\tau\\lambda+\\delta=0\\); the readouts Trace, Determinant and Discriminant show \\(\\tau\\), \\(\\delta\\) and \\(\\Delta\\), and Eigenvalues (computed) the roots.',
        ),
    },
    {
        id: 'pp1-euler',
        latex: 'x_{k+1}=x_k+h\\,Ax_k',
        notation: text(
            '\\(h\\) je časovni korak, \\(x_k\\) približek rešitve ob času \\(kh\\).',
            '\\(h\\) is the time step, \\(x_k\\) the approximation of the solution at time \\(kh\\).',
        ),
        explanation: text(
            'Eulerjeva metoda gre iz \\(x_k\\) v smeri \\(Ax_k\\), ki je tangenta prave trajektorije, za korak \\(h\\). Graf Eulerja ne riše: orbite so izračunane z metodo RK4 s korakom \\(0{,}02\\), ki je zelo natančnejša, a tudi ni točna.',
            'The Euler method moves from \\(x_k\\) along \\(Ax_k\\), the tangent of the true trajectory, by a step \\(h\\). The graph does not draw Euler: the orbits are computed with RK4 at a step \\(0{,}02\\), which is far more accurate but not exact either.',
        ),
    },
    {
        id: 'pp1-types',
        latex: '\\delta<0;\\quad \\delta>0,\\ \\Delta\\geq0;\\quad \\delta>0,\\ \\Delta<0,\\ \\tau\\neq0;\\quad \\delta>0,\\ \\Delta<0,\\ \\tau=0',
        notation: text(
            'Po vrsti: sedlo; vozlišče; spirala; središče. Vozlišče in spirala sta stabilni pri \\(\\tau<0\\) in nestabilni pri \\(\\tau>0\\); \\(\\tau\\), \\(\\delta\\) in \\(\\Delta\\) določajo tip matrike \\(A\\).',
            'In order: saddle; node; spiral; centre. Node and spiral are stable for \\(\\tau<0\\) and unstable for \\(\\tau>0\\); \\(\\tau\\), \\(\\delta\\) and \\(\\Delta\\) determine the type of the matrix \\(A\\).',
        ),
        explanation: text(
            'Izrek o lastnih vrednostih (FMF Analiza 3, kot je navedeno): tip portreta je določen s \\(\\tau\\), \\(\\delta\\) in \\(\\Delta\\), spremeni pa se le čez \\(\\delta=0\\), \\(\\tau=0\\) in parabolo \\(\\tau^{2}=4\\delta\\). Pri \\(\\delta=0\\) je ravnovesnih točk več kot ena (premica ali ravnina), pri \\(\\Delta=0\\) je vozlišče zvezdasto ali degenerirano. Odčitek Tip matrike (točen) je izračunan iz celih števil brez tolerance; slika je ponazoritev ene same matrike.',
            'Theorem on eigenvalues (FMF Analiza 3, as cited): the type of the portrait is determined by \\(\\tau\\), \\(\\delta\\) and \\(\\Delta\\) and changes only across \\(\\delta=0\\), \\(\\tau=0\\) and the parabola \\(\\tau^{2}=4\\delta\\). At \\(\\delta=0\\) there is more than one equilibrium (a line or the whole plane), at \\(\\Delta=0\\) the node is a star or degenerate. The readout Type of the matrix (exact) is computed from integers without a tolerance; the picture is an illustration of one matrix.',
        ),
    },
];

const pp1Example: WorkedExample = {
    id: 'pp1-euler-radius',
    title: text('Eulerjev korak na središču', 'One Euler step on the centre'),
    calculationLatex: '\\lvert x_{k+1}\\rvert^{2}=\\lvert x_k\\rvert^{2}+2h\\,x_k\\cdot Ax_k+h^{2}\\lvert Ax_k\\rvert^{2},\\quad x_k\\cdot Ax_k=0,\\ \\lvert Ax_k\\rvert=\\lvert x_k\\rvert\\ \\Rightarrow\\ \\lvert x_{k+1}\\rvert^{2}=(1+h^{2})\\lvert x_k\\rvert^{2}',
    resultLatex: '\\lvert x_{63}\\rvert=(1+h^{2})^{31{,}5}\\lvert x_0\\rvert\\approx1{,}3681\\,\\lvert x_0\\rvert\\quad(h=0{,}1)',
    check: text(
        'Za \\(A=\\begin{pmatrix}0&-1\\\\1&0\\end{pmatrix}\\) je \\(x\\cdot Ax=-x_1x_2+x_2x_1=0\\) in \\(\\lvert Ax\\rvert=\\lvert x\\rvert\\). Faktor \\(1+h^{2}\\) je večji od \\(1\\) pri vsakem \\(h\\neq0\\): Eulerjev polmer raste, \\(63\\) korakov po \\(0{,}1\\) je čas \\(6{,}3\\), približno en obhod, in \\((1{,}01)^{31{,}5}\\approx1{,}3681\\). Rezultat je zaokrožen na štiri decimalke; ostane izračun, ne meritev na grafu.',
        'For \\(A=\\begin{pmatrix}0&-1\\\\1&0\\end{pmatrix}\\) we have \\(x\\cdot Ax=-x_1x_2+x_2x_1=0\\) and \\(\\lvert Ax\\rvert=\\lvert x\\rvert\\). The factor \\(1+h^{2}\\) exceeds \\(1\\) for every \\(h\\neq0\\): the Euler radius grows, \\(63\\) steps of \\(0{,}1\\) make time \\(6{,}3\\), about one revolution, and \\((1{,}01)^{31{,}5}\\approx1{,}3681\\). The result is rounded to four decimals; it is a computation, not a measurement on the graph.',
    ),
};

const pp1Steps: readonly GuidedLessonStep[] = [
    step({
        id: 'pp1-reverse', order: 1,
        title: text('Matrika \\(-E\\)', 'The matrix \\(-E\\)'),
        purpose: text('Napovedati, kaj zamenjava matrike \\(E\\) z \\(-E\\) stori s trajektorijami, tipom in lastnimi vrednostmi.', 'Predicting what replacing the matrix \\(E\\) by \\(-E\\) does to trajectories, type and eigenvalues.'),
        explanation: text(
            'Odpre se matrika \\(E=\\begin{pmatrix}4&1\\\\2&3\\end{pmatrix}\\) iz lekcije o linearnih preslikavah z začetno točko \\((1,0)\\); odčitki Tip matrike (točen), Sled, Determinanta, Diskriminanta in Lastni vrednosti (izračunani) so vidni takoj. Zapiši napoved: kaj se zgodi s trajektorijami (obliko in smerjo), ko \\(E\\) zamenjaš z matriko \\(-E\\), ki ima vsak element nasprotnega predznaka? Kakšen bo tip in kakšni bosta lastni vrednosti? Pomagaj si z enačbo \\(Av=\\lambda v\\).',
            'The matrix \\(E=\\begin{pmatrix}4&1\\\\2&3\\end{pmatrix}\\) from the linear-maps lesson opens with the start point \\((1,0)\\); the readouts Type of the matrix (exact), Trace, Determinant, Discriminant and Eigenvalues (computed) are visible at once. Write down a prediction: what happens to the trajectories (shape and direction) when you replace \\(E\\) by the matrix \\(-E\\), every entry of which has the opposite sign? What will the type and the eigenvalues be? Use the equation \\(Av=\\lambda v\\) to help.',
        ),
        formulaIds: ['pp1-eigen', 'pp1-classify'],
        observationPrompt: text(
            'V polja Matrika A: a (vrstica 1, stolpec 1), b, c in d vpiši \\(-4\\), \\(-1\\), \\(-2\\) in \\(-3\\). Preberi Tip matrike (točen), Sled, Determinanta, Diskriminanta, Lastni vrednosti (izračunani) in vrstico Začetna točka 1; primerjaj z napovedjo.',
            'Type \\(-4\\), \\(-1\\), \\(-2\\) and \\(-3\\) into the fields Matrix A: a (row 1, column 1), b, c and d. Read Type of the matrix (exact), Trace, Determinant, Discriminant, Eigenvalues (computed) and the row Seed 1; compare with your prediction.',
        ),
        expectedObservations: [text(
            'Tip je stabilno vozlišče, sled \\(-7\\), determinanta \\(10\\), diskriminanta \\(9\\), lastni vrednosti \\(-2\\) in \\(-5\\), nasprotni vrednostma \\(2\\) in \\(5\\) matrike \\(E\\). Iz \\(Av=\\lambda v\\) sledi \\((-A)v=-\\lambda v\\): lastne smeri so iste, lastne vrednosti imajo nasprotni predznak. Vrstica Začetna točka 1 se obrne: pri \\(E\\) je bila naprej ustavljena po \\(0{,}34\\) s in nazaj izračunana za vseh \\(10\\) s, pri \\(-E\\) je naprej izračunana za vseh \\(10\\) s in nazaj ustavljena po \\(0{,}34\\) s. Krivulje so iste, smer gibanja je obrnjena: če je \\(x(t)\\) rešitev za \\(E\\), je \\(x(-t)\\) rešitev za \\(-E\\).',
            'The type is stable node, trace \\(-7\\), determinant \\(10\\), discriminant \\(9\\), eigenvalues \\(-2\\) and \\(-5\\), the opposites of \\(2\\) and \\(5\\) for \\(E\\). From \\(Av=\\lambda v\\) it follows that \\((-A)v=-\\lambda v\\): the eigen-directions are the same, the eigenvalues change sign. The row Seed 1 turns around: for \\(E\\) it was stopped after \\(0{,}34\\) s forward and computed for all \\(10\\) s backward, for \\(-E\\) it is computed for all \\(10\\) s forward and stopped after \\(0{,}34\\) s backward. The curves are the same, the direction of motion is reversed: if \\(x(t)\\) is a solution for \\(E\\), then \\(x(-t)\\) is a solution for \\(-E\\).',
        )],
        scene: planeScene('pp1-reverse-scene', PP1_UNSTABLE,
            'Linearni sistem z \\(E\\), začetna točka \\((1,0)\\): nestabilno vozlišče, sled \\(7\\), determinanta \\(10\\), diskriminanta \\(9\\); naprej ustavljena po \\(0{,}34\\) s, nazaj izračunana za vseh \\(10\\) s.',
            'Linear system with \\(E\\), start point \\((1,0)\\): unstable node, trace \\(7\\), determinant \\(10\\), discriminant \\(9\\); stopped after \\(0{,}34\\) s forward, computed for all \\(10\\) s backward.'),
    }),
    step({
        id: 'pp1-slow', order: 2,
        title: text('Trajektorije in lastni smeri', 'Trajectories and the two eigen-directions'),
        purpose: text('Napovedati, k kateri lastni smeri se trajektorije bližajo ob izhodišču.', 'Predicting which eigen-direction trajectories approach near the origin.'),
        explanation: text(
            'Matrika je \\(A=\\begin{pmatrix}-4&-1\\\\-2&-3\\end{pmatrix}\\), narisani lastni smeri sta premici skozi \\((1,1)\\) in \\((1,-2)\\). Odpre se začetna točka \\((1,1)\\) na prvi premici. Izračunaj \\(A(1,1)\\) in \\(A(1,-2)\\) ter ugotovi, kateri lastni vrednosti pripadata. Zapiši napoved: kam se bo ob izhodišču dotikala trajektorija iz začetne točke, ki ne leži na nobeni od obeh premic, in zakaj? Uporabi razcep rešitve iz formule.',
            'The matrix is \\(A=\\begin{pmatrix}-4&-1\\\\-2&-3\\end{pmatrix}\\), the drawn eigen-directions are the lines through \\((1,1)\\) and \\((1,-2)\\). The start point \\((1,1)\\) on the first line opens. Compute \\(A(1,1)\\) and \\(A(1,-2)\\) and find which eigenvalue belongs to each. Write down a prediction: what will the trajectory from a start point on neither line touch near the origin, and why? Use the decomposition of the solution from the formula.',
        ),
        formulaIds: ['pp1-eigen'],
        observationPrompt: text(
            'V Začetna točka 1 vpiši \\(x=1\\), \\(y=0\\); z Dodaj začetno točko dodaj še tri začetne točke \\((0,1)\\), \\((-1,0)\\) in \\((0,-1)\\). Primerjaj, k kateri premici se vse trajektorije bližajo ob izhodišču.',
            'In Seed 1 type \\(x=1\\), \\(y=0\\); with Add a seed add three more start points \\((0,1)\\), \\((-1,0)\\) and \\((0,-1)\\). Compare which line all trajectories approach near the origin.',
        ),
        expectedObservations: [text(
            'Vse štiri trajektorije so naprej izračunane za vseh \\(10\\) s in se ob izhodišču dotikajo premice skozi \\((1,-2)\\), lastne smeri z lastno vrednostjo \\(-2\\): \\(A(1,-2)=(-2,4)=-2\\,(1,-2)\\), \\(A(1,1)=-5\\,(1,1)\\). Za to matriko velja \\(x(t)=c_1e^{-5t}(1,1)+c_2e^{-2t}(1,-2)\\), razmerje členov je \\(e^{-3t}\\to0\\), zato po dolgem času prevlada drugi člen, če je \\(c_2\\neq0\\). Za \\((1,0)\\) je \\(x(0)=\\tfrac23(1,1)+\\tfrac13(1,-2)\\) in \\(x(1)\\approx(0{,}0496;\\,-0{,}0857)\\). Ravne so le trajektorije na obeh lastnih premicah (\\(c_2=0\\) ali \\(c_1=0\\)); vse druge se ukrivijo.',
            'All four trajectories are computed for all \\(10\\) s forward and touch the line through \\((1,-2)\\) near the origin, the eigen-direction with eigenvalue \\(-2\\): \\(A(1,-2)=(-2,4)=-2\\,(1,-2)\\), \\(A(1,1)=-5\\,(1,1)\\). For this matrix \\(x(t)=c_1e^{-5t}(1,1)+c_2e^{-2t}(1,-2)\\), the ratio of the terms is \\(e^{-3t}\\to0\\), so after a long time the second term dominates if \\(c_2\\neq0\\). For \\((1,0)\\) we have \\(x(0)=\\tfrac23(1,1)+\\tfrac13(1,-2)\\) and \\(x(1)\\approx(0{,}0496;\\,-0{,}0857)\\). Only trajectories on the two eigen-lines (\\(c_2=0\\) or \\(c_1=0\\)) are straight; all others bend.',
        )],
        scene: planeScene('pp1-slow-scene', PP1_ON_FAST_LINE,
            'Matrika \\(A\\) s sledjo \\(-7\\) in determinanto \\(10\\), začetna točka \\((1,1)\\) na premici skozi \\((1,1)\\): naprej izračunana za vseh \\(10\\) s.',
            'The matrix \\(A\\) with trace \\(-7\\) and determinant \\(10\\), start point \\((1,1)\\) on the line through \\((1,1)\\): computed for all \\(10\\) s forward.'),
    }),
    step({
        id: 'pp1-saddle', order: 3,
        title: text('Diagonalna matrika z elementoma \\(1\\) in \\(-1\\)', 'The diagonal matrix with entries \\(1\\) and \\(-1\\)'),
        purpose: text('Napovedati tip in kateri trajektoriji se bližata izhodišču.', 'Predicting the type and which trajectories approach the origin.'),
        explanation: text(
            'Odpre se matrika \\(A\\) iz prejšnjega koraka s štirimi začetnimi točkami \\((1,0)\\), \\((0,1)\\), \\((1;0{,}05)\\) in \\((0{,}05;1)\\). V opazovanju jo zamenjaš z \\(a=1\\), \\(b=0\\), \\(c=0\\), \\(d=-1\\), torej \\(x^{\\prime}=x\\), \\(y^{\\prime}=-y\\). Zapiši napoved: kolikšna sta \\(\\tau\\) in \\(\\delta\\) in kakšen je tip? Iz enačb sklepaj, katera od štirih začetnih točk gre proti izhodišču naprej v času, katera nazaj, in kaj se zgodi z drugima?',
            'The matrix \\(A\\) of the previous step opens with four start points \\((1,0)\\), \\((0,1)\\), \\((1;0{,}05)\\) and \\((0{,}05;1)\\). In the observation you replace it with \\(a=1\\), \\(b=0\\), \\(c=0\\), \\(d=-1\\), that is \\(x^{\\prime}=x\\), \\(y^{\\prime}=-y\\). Write down a prediction: what are \\(\\tau\\) and \\(\\delta\\), and what is the type? From the equations, decide which of the four start points goes towards the origin forward in time, which backward, and what happens to the other two?',
        ),
        formulaIds: ['pp1-classify'],
        observationPrompt: text(
            'V polja Matrika A vpiši \\(a=1\\), \\(b=0\\), \\(c=0\\), \\(d=-1\\). Preberi Tip matrike (točen), Sled, Determinanta, Lastni vrednosti (izračunani) in vrstice Začetna točka 1 do 4.',
            'In the Matrix A fields type \\(a=1\\), \\(b=0\\), \\(c=0\\), \\(d=-1\\). Read Type of the matrix (exact), Trace, Determinant, Eigenvalues (computed) and the rows Seed 1 to 4.',
        ),
        expectedObservations: [text(
            'Tip je sedlo, sled \\(0\\), determinanta \\(-1\\), diskriminanta \\(4\\), lastni vrednosti \\(1\\) in \\(-1\\). Začetna točka \\((0,1)\\) je naprej izračunana za vseh \\(10\\) s (po osi \\(y\\) proti izhodišču), \\((1,0)\\) nazaj za vseh \\(10\\) s (po osi \\(x\\)); to sta edini ravni trajektoriji, ki se bližata izhodišču. Točki \\((1;0{,}05)\\) in \\((0{,}05;1)\\) ležita blizu osi, a izhodišču se ne približata: \\((1;0{,}05)\\) zapusti območje naprej po \\(1{,}4\\) s (\\(e^{t}=4\\) pri \\(t=\\ln4\\approx1{,}39\\)) in nazaj po \\(4{,}4\\) s, \\((0{,}05;1)\\) naprej po \\(4{,}4\\) s in nazaj po \\(1{,}4\\) s. Trajektorija blizu osi sledi osi in jo nato zapusti.',
            'The type is saddle, trace \\(0\\), determinant \\(-1\\), discriminant \\(4\\), eigenvalues \\(1\\) and \\(-1\\). The start point \\((0,1)\\) is computed for all \\(10\\) s forward (along the \\(y\\)-axis towards the origin), \\((1,0)\\) backward for all \\(10\\) s (along the \\(x\\)-axis); these are the only straight trajectories that approach the origin. The points \\((1;0{,}05)\\) and \\((0{,}05;1)\\) lie near an axis but do not approach the origin: \\((1;0{,}05)\\) leaves the region after \\(1{,}4\\) s forward (\\(e^{t}=4\\) at \\(t=\\ln4\\approx1{,}39\\)) and after \\(4{,}4\\) s backward, \\((0{,}05;1)\\) after \\(4{,}4\\) s forward and after \\(1{,}4\\) s backward. A trajectory near an axis follows it and then leaves it.',
        )],
        scene: planeScene('pp1-saddle-scene', PP1_FOUR_SEEDS,
            'Matrika \\(A\\) s sledjo \\(-7\\) in determinanto \\(10\\), štiri začetne točke \\((1,0)\\), \\((0,1)\\), \\((1;0{,}05)\\), \\((0{,}05;1)\\).',
            'The matrix \\(A\\) with trace \\(-7\\) and determinant \\(10\\), four start points \\((1,0)\\), \\((0,1)\\), \\((1;0{,}05)\\), \\((0{,}05;1)\\).'),
    }),
    step({
        id: 'pp1-parabola', order: 4,
        title: text('Spreminjanje elementa \\(c\\)', 'Changing the entry \\(c\\)'),
        purpose: text('Napovedati, pri katerem \\(c\\) se tip vozlišča spremeni, in preveriti, kam pade oznaka v ravnini sled–determinanta.', 'Predicting at which \\(c\\) the node type changes and checking where the mark falls in the trace–determinant plane.'),
        explanation: text(
            'Odpre se matrika \\(A=\\begin{pmatrix}-4&-1\\\\c&-3\\end{pmatrix}\\) pri \\(c=-2\\), začetna točka \\((1,0)\\); vstavek Ravnina sled–determinanta kaže oznako in parabolo \\(\\delta=\\tau^{2}/4\\). Spreminjaš le \\(c\\). Izračunaj \\(\\tau\\) in \\(\\delta=ad-bc\\) kot funkciji \\(c\\) in zapiši napoved: pri katerem \\(c\\) je \\(\\Delta=0\\) in kakšen je tip tik pod in tik nad tem \\(c\\)? Kam se premakne oznaka?',
            'The matrix \\(A=\\begin{pmatrix}-4&-1\\\\c&-3\\end{pmatrix}\\) opens at \\(c=-2\\), start point \\((1,0)\\); the inset Trace–determinant plane shows the mark and the parabola \\(\\delta=\\tau^{2}/4\\). You will change only \\(c\\). Compute \\(\\tau\\) and \\(\\delta=ad-bc\\) as functions of \\(c\\) and write down a prediction: at which \\(c\\) is \\(\\Delta=0\\), and what is the type just below and just above that \\(c\\)? How does the mark move?',
        ),
        formulaIds: ['pp1-classify'],
        observationPrompt: text(
            'V polje Matrika A: c (vrstica 2, stolpec 1) zaporedoma vpiši vrednosti od \\(-1\\) do \\(1\\) v korakih po \\(0{,}25\\). Pri vsaki preberi Tip matrike (točen), Determinanta, Diskriminanta, Lastni vrednosti (izračunani) in oznako v vstavku.',
            'In the field Matrix A: c (row 2, column 1) type the values from \\(-1\\) to \\(1\\) in steps of \\(0{,}25\\) in turn. For each, read Type of the matrix (exact), Determinant, Discriminant, Eigenvalues (computed) and the mark in the inset.',
        ),
        expectedObservations: [text(
            'Sled je ves čas \\(-7\\), ker se \\(c\\) v \\(a+d\\) ne pojavi; \\(\\delta=12+c\\) in \\(\\Delta=49-4(12+c)=1-4c\\), torej \\(\\Delta=0\\) pri \\(c=\\tfrac14\\). Pri \\(c=0\\): stabilno vozlišče, \\(\\delta=12\\), \\(\\Delta=1\\). Pri \\(c=0{,}25\\): stabilno degenerirano vozlišče, \\(\\delta=12{,}25=\\tfrac{49}{4}\\), \\(\\Delta=0\\), dvojna lastna vrednost \\(-3{,}5\\) z eno lastno smerjo; oznaka je na paraboli. Pri \\(c=0{,}5\\): stabilna spirala (žarišče), \\(\\delta=12{,}5\\), \\(\\Delta=-1\\), \\(\\lambda=-3{,}5\\pm0{,}5\\,i\\). Oznaka se pomika navpično in pri \\(\\delta=12{,}25\\) prečka parabolo; vozlišče postane spirala, ko \\(\\Delta\\) preide iz pozitivnega v negativno. Tip je izrek o lastnih vrednostih, slika kaže eno matriko.',
            'The trace stays \\(-7\\) because \\(c\\) does not appear in \\(a+d\\); \\(\\delta=12+c\\) and \\(\\Delta=49-4(12+c)=1-4c\\), so \\(\\Delta=0\\) at \\(c=\\tfrac14\\). At \\(c=0\\): stable node, \\(\\delta=12\\), \\(\\Delta=1\\). At \\(c=0{,}25\\): stable degenerate node, \\(\\delta=12{,}25=\\tfrac{49}{4}\\), \\(\\Delta=0\\), double eigenvalue \\(-3{,}5\\) with one eigen-direction; the mark is on the parabola. At \\(c=0{,}5\\): stable spiral, \\(\\delta=12{,}5\\), \\(\\Delta=-1\\), \\(\\lambda=-3{,}5\\pm0{,}5\\,i\\). The mark moves vertically and crosses the parabola at \\(\\delta=12{,}25\\); the node becomes a spiral when \\(\\Delta\\) passes from positive to negative. The type is a theorem on eigenvalues, the picture shows one matrix.',
        )],
        scene: planeScene('pp1-parabola-scene', PP1_NODE,
            'Matrika s \\(c=-2\\), začetna točka \\((1,0)\\): stabilno vozlišče, sled \\(-7\\), determinanta \\(10\\), diskriminanta \\(9\\); oznaka v vstavku je pri \\(\\tau=-7\\), \\(\\delta=10\\).',
            'The matrix with \\(c=-2\\), start point \\((1,0)\\): stable node, trace \\(-7\\), determinant \\(10\\), discriminant \\(9\\); the mark in the inset is at \\(\\tau=-7\\), \\(\\delta=10\\).'),
    }),
    step({
        id: 'pp1-centre', order: 5,
        title: text('Matrika z \\(a=0\\) in \\(b=-1\\)', 'The matrix with \\(a=0\\) and \\(b=-1\\)'),
        purpose: text('Napovedati, kakšen je tip, ko je sled \\(0\\), in kakšne so trajektorije.', 'Predicting the type when the trace is \\(0\\) and what the trajectories look like.'),
        explanation: text(
            'Odpre se matrika \\(\\begin{pmatrix}0&-1\\\\1&d\\end{pmatrix}\\) pri \\(d=-\\tfrac14\\), začetna točka \\((1,0)\\). Spreminjaš le \\(d\\). Izračunaj \\(\\tau\\), \\(\\delta\\) in \\(\\Delta\\) kot funkcije \\(d\\). Zapiši napoved: kakšen je tip pri \\(d=0\\), kakšne so lastne vrednosti in ali so trajektorije sklenjene?',
            'The matrix \\(\\begin{pmatrix}0&-1\\\\1&d\\end{pmatrix}\\) opens at \\(d=-\\tfrac14\\), start point \\((1,0)\\). You will change only \\(d\\). Compute \\(\\tau\\), \\(\\delta\\) and \\(\\Delta\\) as functions of \\(d\\). Write down a prediction: what is the type at \\(d=0\\), what are the eigenvalues and are the trajectories closed?',
        ),
        formulaIds: ['pp1-classify'],
        observationPrompt: text(
            'V polje Matrika A: d (vrstica 2, stolpec 2) vpiši \\(0\\). Preberi Tip matrike (točen), Sled, Determinanta, Diskriminanta, Lastni vrednosti (izračunani), vrstico Začetna točka 1 in oznako v vstavku; primerjaj z odprto matriko.',
            'In the field Matrix A: d (row 2, column 2) type \\(0\\). Read Type of the matrix (exact), Trace, Determinant, Discriminant, Eigenvalues (computed), the row Seed 1 and the mark in the inset; compare with the matrix that opened.',
        ),
        expectedObservations: [text(
            'Pri \\(d=-\\tfrac14\\) je bila stabilna spirala (sled \\(-0{,}25\\), determinanta \\(1\\), diskriminanta \\(-3{,}9375\\)). Pri \\(d=0\\) je tip središče (center): sled \\(0\\), determinanta \\(1\\), diskriminanta \\(-4\\), \\(\\lambda=0\\pm1\\,i\\); oznaka je na navpični osi pri \\(\\delta=1\\). Vrstica Začetna točka 1 je naprej in nazaj izračunana za vseh \\(10\\) s. Sklenjenost je izrek: pri \\(\\tau=0\\), \\(\\delta>0\\) sta lastni vrednosti \\(\\pm i\\sqrt\\delta\\) in rešitev iz \\((1,0)\\) je \\(x(t)=(\\cos t,\\sin t)\\), krog s periodo \\(2\\pi\\). Narisana orbita je izračunana z RK4 in je ponazoritev.',
            'At \\(d=-\\tfrac14\\) it was a stable spiral (trace \\(-0{,}25\\), determinant \\(1\\), discriminant \\(-3{,}9375\\)). At \\(d=0\\) the type is centre: trace \\(0\\), determinant \\(1\\), discriminant \\(-4\\), \\(\\lambda=0\\pm1\\,i\\); the mark is on the vertical axis at \\(\\delta=1\\). The row Seed 1 is computed for all \\(10\\) s forward and backward. Closedness is a theorem: for \\(\\tau=0\\), \\(\\delta>0\\) the eigenvalues are \\(\\pm i\\sqrt\\delta\\) and the solution from \\((1,0)\\) is \\(x(t)=(\\cos t,\\sin t)\\), a circle of period \\(2\\pi\\). The drawn orbit is computed with RK4 and is an illustration.',
        )],
        scene: planeScene('pp1-centre-scene', PP1_NEAR_CENTRE,
            'Matrika s \\(d=-\\tfrac14\\), začetna točka \\((1,0)\\): stabilna spirala, sled \\(-0{,}25\\), determinanta \\(1\\), diskriminanta \\(-3{,}9375\\).',
            'The matrix with \\(d=-\\tfrac14\\), start point \\((1,0)\\): stable spiral, trace \\(-0{,}25\\), determinant \\(1\\), discriminant \\(-3{,}9375\\).'),
    }),
    step({
        id: 'pp1-euler', order: 6,
        title: text('Euler in RK4 na istem sistemu', 'Euler and RK4 on the same system'),
        purpose: text('Napovedati smer odklona Eulerjeve metode na središču in ga izračunati.', 'Predicting the direction of the drift of the Euler method on the centre and computing it.'),
        explanation: text(
            'Odpre se središče \\(A=\\begin{pmatrix}0&-1\\\\1&0\\end{pmatrix}\\), začetna točka \\((1,0)\\). Eulerjev korak je \\(x_{k+1}=x_k+h\\,Ax_k\\); graf Eulerja ne riše, orbita je RK4. Preden odpreš izračun, zapiši napoved: ali Eulerjeva orbita na središču ostane krog, se vrti navzven ali navznoter, in zakaj? Pomagaj si s tem, da je \\(Ax_k\\) pravokoten na \\(x_k\\).',
            'The centre \\(A=\\begin{pmatrix}0&-1\\\\1&0\\end{pmatrix}\\) opens, start point \\((1,0)\\). The Euler step is \\(x_{k+1}=x_k+h\\,Ax_k\\); the graph does not draw Euler, the orbit is RK4. Before you open the calculation, write down a prediction: does the Euler orbit on the centre stay a circle, spiral outward or spiral inward, and why? Use that \\(Ax_k\\) is perpendicular to \\(x_k\\).',
        ),
        formulaIds: ['pp1-euler'],
        workedExampleId: 'pp1-euler-radius',
        observationPrompt: text(
            'Drsnik Čas t premakni na \\(6{,}28\\) in preberi vrstico Začetna točka 1; primerjaj lego kvadratka s točko \\((1,0)\\). Nato izračunaj Eulerjev polmer po \\(126\\) korakih s \\(h=0{,}05\\) in ga primerjaj z \\(1{,}3681\\).',
            'Move the slider Time t to \\(6{,}28\\) and read the row Seed 1; compare the position of the square with the point \\((1,0)\\). Then compute the Euler radius after \\(126\\) steps with \\(h=0{,}05\\) and compare it with \\(1{,}3681\\).',
        ),
        expectedObservations: [text(
            'Točna rešitev je \\((\\cos t,\\sin t)\\), pri \\(t=6{,}28\\) torej približno \\((1{,}0000;\\,-0{,}0032)\\): kvadratek je blizu \\((1,0)\\), po enem obhodu je orbita videti zaprta. RK4 z \\(h=0{,}02\\) tudi ni točna in se odkloni od kroga, a veliko manj kot Euler; narisane numerične orbite ne imenujemo natančno sklenjene. Pri \\(h=0{,}05\\) je polmer po \\(126\\) korakih (čas \\(6{,}3\\)) \\((1+0{,}05^{2})^{63}\\approx1{,}1704\\): približno polovica logaritma polmera pri \\(h=0{,}1\\) (\\(\\ln1{,}3681\\approx0{,}3134\\), \\(\\ln1{,}1704\\approx0{,}1573\\)); Eulerjev odklon se z manjšim korakom manjša, a ne izgine.',
            'The exact solution is \\((\\cos t,\\sin t)\\), so at \\(t=6{,}28\\) about \\((1{,}0000;\\,-0{,}0032)\\): the square is near \\((1,0)\\), the orbit looks closed over one revolution. RK4 with \\(h=0{,}02\\) is not exact either and drifts off the circle, but far less than Euler; a drawn numerical orbit is never called exactly closed. With \\(h=0{,}05\\) the radius after \\(126\\) steps (time \\(6{,}3\\)) is \\((1+0{,}05^{2})^{63}\\approx1{,}1704\\): about half the logarithm of the radius for \\(h=0{,}1\\) (\\(\\ln1{,}3681\\approx0{,}3134\\), \\(\\ln1{,}1704\\approx0{,}1573\\)); the Euler drift shrinks with a smaller step but does not vanish.',
        )],
        scene: planeScene('pp1-euler-scene', PP1_CENTRE,
            'Središče \\(\\tau=0\\), \\(\\delta=1\\), začetna točka \\((1,0)\\), naprej in nazaj izračunana za vseh \\(10\\) s; orbita je RK4.',
            'The centre \\(\\tau=0\\), \\(\\delta=1\\), start point \\((1,0)\\), computed for all \\(10\\) s forward and backward; the orbit is RK4.'),
    }),
    step({
        id: 'pp1-free', order: 7,
        title: text('Prosto raziskovanje', 'Free exploration'),
        purpose: text('Samostojno poiskati matrike z danimi tipi.', 'Finding matrices with given types on your own.'),
        explanation: text(
            'Matrika \\(A=\\begin{pmatrix}-4&-1\\\\-2&-3\\end{pmatrix}\\) z eno začetno točko \\((1,0)\\) je spet nastavljena. Spreminjaj elemente matrike in začetne točke. Formula povzame tipe po \\(\\tau\\), \\(\\delta\\) in \\(\\Delta\\).',
            'The matrix \\(A=\\begin{pmatrix}-4&-1\\\\-2&-3\\end{pmatrix}\\) with one start point \\((1,0)\\) is set again. Change the matrix entries and the start points. The formula summarises the types by \\(\\tau\\), \\(\\delta\\) and \\(\\Delta\\).',
        ),
        formulaIds: ['pp1-types'],
        observationPrompt: text(
            'Poišči matriko s sledjo \\(0\\), ki ni središče, in matriko z determinanto \\(0\\); preberi Tip matrike (točen) in oznako v vstavku. Poišči še matriko z nestabilno spiralo.',
            'Find a matrix with trace \\(0\\) that is not a centre and a matrix with determinant \\(0\\); read Type of the matrix (exact) and the mark in the inset. Also find a matrix with an unstable spiral.',
        ),
        expectedObservations: [text(
            'Sled \\(0\\) z determinanto \\(\\delta<0\\) (na primer \\(a=1\\), \\(d=-1\\), \\(b=c=0\\)) je sedlo; pri \\(\\delta=0\\) (na primer \\(a=1\\), ostali elementi \\(0\\)) odčitek pravi premica ravnovesnih točk. Nestabilna spirala potrebuje \\(\\tau>0\\) in \\(\\Delta<0\\), na primer \\(\\tau=0{,}5\\) in \\(\\delta=1\\).',
            'Trace \\(0\\) with determinant \\(\\delta<0\\) (for example \\(a=1\\), \\(d=-1\\), \\(b=c=0\\)) is a saddle; at \\(\\delta=0\\) (for example \\(a=1\\), all other entries \\(0\\)) the readout says line of equilibria. An unstable spiral needs \\(\\tau>0\\) and \\(\\Delta<0\\), for example \\(\\tau=0{,}5\\) and \\(\\delta=1\\).',
        )],
        scene: planeScene('pp1-free-scene', PP1_FREE,
            'Matrika \\(A\\) s sledjo \\(-7\\) in determinanto \\(10\\), začetna točka \\((1,0)\\); matrika in točke so prosti.',
            'The matrix \\(A\\) with trace \\(-7\\) and determinant \\(10\\), start point \\((1,0)\\); the matrix and the points are free.'),
    }),
];

// ---- PP2 ---------------------------------------------------------------------------------------------------------------------------

const pp2Formulas: readonly FormulaBlock[] = [
    {
        id: 'pp2-energy',
        latex: '\\theta^{\\prime}=\\omega,\\quad \\omega^{\\prime}=-\\sin\\theta,\\quad H(\\theta,\\omega)=\\frac{\\omega^{2}}{2}-\\cos\\theta,\\quad H^{\\prime}=-\\omega\\sin\\theta+\\sin\\theta\\,\\omega=0',
        notation: text(
            '\\(\\theta\\) je kot nihala, \\(\\omega\\) kotna hitrost, \\(H\\) energija (kinetična \\(\\omega^{2}/2\\) in potencialna \\(-\\cos\\theta\\)).',
            '\\(\\theta\\) is the angle of the pendulum, \\(\\omega\\) the angular velocity, \\(H\\) the energy (kinetic \\(\\omega^{2}/2\\) and potential \\(-\\cos\\theta\\)).',
        ),
        explanation: text(
            'Argument: vzdolž rešitve je \\(H^{\\prime}=\\omega\\omega^{\\prime}+\\sin\\theta\\,\\theta^{\\prime}=-\\omega\\sin\\theta+\\sin\\theta\\,\\omega=0\\), zato je \\(H\\) konstantna in je vsaka orbita del nivojnice \\(H\\). To je račun; narisana orbita je številska ponazoritev z majhnim odmikom, ne dokaz.',
            'Argument: along a solution \\(H^{\\prime}=\\omega\\omega^{\\prime}+\\sin\\theta\\,\\theta^{\\prime}=-\\omega\\sin\\theta+\\sin\\theta\\,\\omega=0\\), so \\(H\\) is constant and every orbit lies on a level curve of \\(H\\). This is a computation; the drawn orbit is a numerical illustration with a small drift, not a proof.',
        ),
    },
    {
        id: 'pp2-level',
        latex: '\\omega^{2}=2\\,(H+\\cos\\theta)',
        notation: text(
            'Isti \\(H\\) kot zgoraj, razrešen glede na \\(\\omega^{2}\\).',
            'The same \\(H\\) as above, solved for \\(\\omega^{2}\\).',
        ),
        explanation: text(
            'Ker je \\(\\omega^{2}\\geq0\\), orbita z energijo \\(H\\) leži samo tam, kjer je \\(H+\\cos\\theta\\geq0\\). Z njo lahko iz \\(H\\) izračunaš največji \\(\\lvert\\omega\\rvert\\) (pri \\(\\theta=0\\)) in skrajni \\(\\theta\\) (kjer je \\(\\omega=0\\)).',
            'Since \\(\\omega^{2}\\geq0\\), an orbit with energy \\(H\\) lies only where \\(H+\\cos\\theta\\geq0\\). With it you can compute from \\(H\\) the largest \\(\\lvert\\omega\\rvert\\) (at \\(\\theta=0\\)) and the extreme \\(\\theta\\) (where \\(\\omega=0\\)).',
        ),
    },
    {
        id: 'pp2-classes',
        latex: '\\omega^{2}=2\\,(H+\\cos\\theta)\\geq2\\,(H-1),\\qquad \\cos\\theta\\geq-H',
        notation: text(
            'Obe oceni sledita iz \\(\\cos\\theta\\geq-1\\) in \\(\\omega^{2}\\geq0\\).',
            'Both estimates follow from \\(\\cos\\theta\\geq-1\\) and \\(\\omega^{2}\\geq0\\).',
        ),
        explanation: text(
            'Pri \\(-1<H<1\\) mora veljati \\(\\cos\\theta\\geq-H>-1\\), zato orbita nikoli ne doseže \\(\\cos\\theta=-1\\): ne prečka nobene od premic \\(\\theta=\\pm\\pi,\\pm3\\pi,\\dots\\), ostane med sosednjima sedloma in niha okoli spodnje lege; pri \\(H=-1\\) nihalo miruje v spodnji legi. Pri \\(H>1\\) je \\(\\omega^{2}\\geq2(H-1)>0\\), zato \\(\\omega\\) ne spremeni predznaka in se nihalo vrti. Pri \\(H=1\\) je \\(\\omega=0\\) le pri \\(\\cos\\theta=-1\\), torej v sedlu \\((\\pm\\pi,0)\\): separatrisa. Na osi \\(\\omega\\) je \\(H=1\\) natanko pri \\(\\omega=\\pm2\\), točno na mreži. Odčitek Energija začetne točke primerja \\(H\\) z \\(1\\) in pri \\(\\theta=0\\), \\(\\lvert\\omega\\rvert=2\\) pove, da je točno na separatrisi; \\(\\cos\\) je izračunan, zato drugje trditve o enakosti ni.',
            'For \\(-1<H<1\\) we need \\(\\cos\\theta\\geq-H>-1\\), so the orbit never reaches \\(\\cos\\theta=-1\\): it crosses none of the lines \\(\\theta=\\pm\\pi,\\pm3\\pi,\\dots\\), stays between two neighbouring saddles and swings about the lower position; for \\(H=-1\\) the pendulum rests in the lower position. For \\(H>1\\) we have \\(\\omega^{2}\\geq2(H-1)>0\\), so \\(\\omega\\) never changes sign and the pendulum rotates. For \\(H=1\\), \\(\\omega=0\\) only at \\(\\cos\\theta=-1\\), that is at the saddle \\((\\pm\\pi,0)\\): the separatrix. On the \\(\\omega\\)-axis \\(H=1\\) exactly at \\(\\omega=\\pm2\\), exact on the grid. The readout Energy of seed compares \\(H\\) with \\(1\\) and says exactly on the separatrix at \\(\\theta=0\\), \\(\\lvert\\omega\\rvert=2\\); \\(\\cos\\) is computed, so there is no claim of equality elsewhere.',
        ),
    },
];

const pp2Steps: readonly GuidedLessonStep[] = [
    step({
        id: 'pp2-small', order: 1,
        title: text('Majhen začetni odmik', 'A small start angle'),
        purpose: text('Napovedati energijo in obliko orbite nihala iz začetka \\((1,0)\\) ter jo primerjati z linearnim sistemom.', 'Predicting the energy and shape of the pendulum orbit from \\((1,0)\\) and comparing it with the linear system.'),
        explanation: text(
            'Odpre se linearni sistem \\(\\theta^{\\prime}=\\omega\\), \\(\\omega^{\\prime}=-\\theta\\) z začetno točko \\((\\theta,\\omega)=(1,0)\\): središče, orbita je krog s polmerom \\(1\\). Pri nihalu je \\(\\omega^{\\prime}=-\\sin\\theta\\), kar je za majhen \\(\\theta\\) blizu \\(-\\theta\\). Zapiši napoved za nihalo z istim začetkom: kolikšna je energija \\(H\\)? Je orbita sklenjena? Je največji \\(\\lvert\\omega\\rvert\\) na orbiti večji, enak ali manjši od \\(1\\)? Uporabi ohranitev \\(H\\) iz formule.',
            'The linear system \\(\\theta^{\\prime}=\\omega\\), \\(\\omega^{\\prime}=-\\theta\\) opens with the start point \\((\\theta,\\omega)=(1,0)\\): a centre, the orbit is a circle of radius \\(1\\). For the pendulum \\(\\omega^{\\prime}=-\\sin\\theta\\), which is close to \\(-\\theta\\) for small \\(\\theta\\). Write down a prediction for the pendulum with the same start: what is the energy \\(H\\)? Is the orbit closed? Is the largest \\(\\lvert\\omega\\rvert\\) on the orbit greater than, equal to or smaller than \\(1\\)? Use the conservation of \\(H\\) from the formula.',
        ),
        formulaIds: ['pp2-energy'],
        observationPrompt: text(
            'V izbirniku Sistem izberi Nihalo (začetna točka ostane). Preberi vrstico Energija začetne točke 1 in stanje Tip linearizacije; primerjaj z napovedjo.',
            'In the chooser System pick Pendulum (the start point stays). Read the row Energy of seed 1 and the status Type of the linearization; compare with your prediction.',
        ),
        expectedObservations: [text(
            'Energija začetne točke je \\(H=-\\cos1\\), odčitek pravi \\(H=-0{,}540302<1\\): nihanje (sklenjena orbita). Na orbiti je pri \\(\\theta=0\\) \\(\\omega^{2}=2(H+1)=2(1-\\cos1)\\), torej \\(\\lvert\\omega\\rvert\\approx0{,}9589<1\\): orbita je nekoliko nižja od kroga linearnega sistema. Stanje pravi, da je linearizacija središče in da ni hiperbolična. Ohranitev \\(H\\) je račun iz formule, orbita je ponazoritev.',
            'The energy of the start point is \\(H=-\\cos1\\), the readout says \\(H=-0{,}540302<1\\): swing (closed orbit). On the orbit at \\(\\theta=0\\) we have \\(\\omega^{2}=2(H+1)=2(1-\\cos1)\\), so \\(\\lvert\\omega\\rvert\\approx0{,}9589<1\\): the orbit is a little lower than the circle of the linear system. The status says the linearization is a centre and not hyperbolic. The conservation of \\(H\\) is a computation from the formula, the orbit is an illustration.',
        )],
        scene: planeScene('pp2-small-scene', PP2_LINEAR_CENTRE,
            'Linearni sistem \\(\\theta^{\\prime}=\\omega\\), \\(\\omega^{\\prime}=-\\theta\\), začetna točka \\((1,0)\\): središče, sled \\(0\\), determinanta \\(1\\), naprej in nazaj izračunana za vseh \\(10\\) s.',
            'The linear system \\(\\theta^{\\prime}=\\omega\\), \\(\\omega^{\\prime}=-\\theta\\), start point \\((1,0)\\): centre, trace \\(0\\), determinant \\(1\\), computed for all \\(10\\) s forward and backward.'),
    }),
    step({
        id: 'pp2-larger', order: 2,
        title: text('Večji začetni odmik', 'A larger start angle'),
        purpose: text('Napovedati, kako se orbita razlikuje od kroga pri večji energiji.', 'Predicting how the orbit differs from a circle at higher energy.'),
        explanation: text(
            'Nihalo z začetkom \\((1,0)\\) je odprto. V opazovanju dodaš še začetni točki \\((2,0)\\) in \\((0;1{,}9)\\). Zapiši napoved: kolikšna je energija vsake? Kolikšen je pri \\((2,0)\\) največji \\(\\lvert\\omega\\rvert\\) in pri \\((0;1{,}9)\\) skrajni \\(\\theta\\), kjer je \\(\\omega=0\\), v primerjavi s krogom s polmerom \\(2\\) oziroma \\(1{,}9\\) v linearnem sistemu?',
            'The pendulum with start \\((1,0)\\) is open. You will add the start points \\((2,0)\\) and \\((0;1{,}9)\\). Write down a prediction: what is the energy of each? For \\((2,0)\\) what is the largest \\(\\lvert\\omega\\rvert\\), and for \\((0;1{,}9)\\) the extreme \\(\\theta\\) where \\(\\omega=0\\), compared with a circle of radius \\(2\\) and \\(1{,}9\\) respectively in the linear system?',
        ),
        formulaIds: ['pp2-level'],
        observationPrompt: text(
            'Dvakrat pritisni Dodaj začetno točko in v poljih Začetna točka 2: θ in ω nastavi \\((2,0)\\), v poljih Začetna točka 3: θ in ω pa \\((0;1{,}9)\\). Preberi vrstice Energija začetne točke 1 do 3 in primerjaj oblike orbit.',
            'Press Add a seed twice and set the fields Seed 2: θ and ω to \\((2,0)\\), and the fields Seed 3: θ and ω to \\((0;1{,}9)\\). Read the rows Energy of seed 1 to 3 and compare the shapes of the orbits.',
        ),
        expectedObservations: [text(
            'Energije so \\(H=-\\cos1\\approx-0{,}540302\\), \\(H=-\\cos2\\approx0{,}416147\\) in \\(H=0{,}805\\), vse manj od \\(1\\): nihanje. Pri \\((2,0)\\) je \\(\\omega^{2}=2(0{,}416147+1)\\) pri \\(\\theta=0\\), torej \\(\\lvert\\omega\\rvert\\approx1{,}683<2\\). Pri \\((0;1{,}9)\\) je skrajni \\(\\theta\\) iz \\(\\cos\\theta=-0{,}805\\), približno \\(2{,}51>1{,}9\\). Obe orbiti torej nista kroga: prva je nižja od kroga s polmerom \\(2\\), druga širša od kroga s polmerom \\(1{,}9\\) in sega proti \\(\\pi\\).',
            'The energies are \\(H=-\\cos1\\approx-0{,}540302\\), \\(H=-\\cos2\\approx0{,}416147\\) and \\(H=0{,}805\\), all below \\(1\\): swing. For \\((2,0)\\) we have \\(\\omega^{2}=2(0{,}416147+1)\\) at \\(\\theta=0\\), so \\(\\lvert\\omega\\rvert\\approx1{,}683<2\\). For \\((0;1{,}9)\\) the extreme \\(\\theta\\) comes from \\(\\cos\\theta=-0{,}805\\), about \\(2{,}51>1{,}9\\). So neither orbit is a circle: the first is lower than a circle of radius \\(2\\), the second wider than a circle of radius \\(1{,}9\\) and reaches towards \\(\\pi\\).',
        )],
        scene: planeScene('pp2-larger-scene', PP2_SMALL,
            'Nihalo, začetna točka \\((1,0)\\): \\(H=-0{,}540302<1\\), nihanje (sklenjena orbita).',
            'Pendulum, start point \\((1,0)\\): \\(H=-0{,}540302<1\\), swing (closed orbit).'),
    }),
    step({
        id: 'pp2-cross', order: 3,
        title: text('Višja energija z začetkom na osi \\(\\omega\\)', 'Higher energy with a start on the \\(\\omega\\)-axis'),
        purpose: text('Napovedati, kaj odčitek pove pri \\(\\omega=2\\) in \\(\\omega=2{,}25\\).', 'Predicting what the readout says at \\(\\omega=2\\) and \\(\\omega=2{,}25\\).'),
        explanation: text(
            'Odprta je začetna točka \\((0;1{,}9)\\) z nihanjem. V opazovanju spreminjaš le \\(\\omega\\) začetne točke, \\(\\theta=0\\). Z \\(\\omega^{2}=2(H+\\cos\\theta)\\) izračunaj \\(H\\) pri \\(\\omega=2\\) in pri \\(\\omega=2{,}25\\) in zapiši napoved: kaj pove odčitek v vsakem primeru in kaj se zgodi z orbito?',
            'The start point \\((0;1{,}9)\\) with a swing is open. You will change only the \\(\\omega\\) of the start point, with \\(\\theta=0\\). Use \\(\\omega^{2}=2(H+\\cos\\theta)\\) to compute \\(H\\) at \\(\\omega=2\\) and at \\(\\omega=2{,}25\\) and write down a prediction: what does the readout say in each case and what happens to the orbit?',
        ),
        formulaIds: ['pp2-level'],
        observationPrompt: text(
            'V polje Začetna točka 1: ω vpiši \\(2\\), nato \\(2{,}25\\). Pri vsakem preberi vrstico Energija začetne točke 1 in vrstico Začetna točka 1; opazuj krivuljo Separatrisa.',
            'In the field Seed 1: ω type \\(2\\), then \\(2{,}25\\). For each read the row Energy of seed 1 and the row Seed 1; watch the curve Separatrix.',
        ),
        expectedObservations: [text(
            'Pri \\(\\omega=2\\) je \\(H=1\\): odčitek pravi točno na separatrisi (\\(\\theta=0\\) in \\(\\lvert\\omega\\rvert=2\\)), točno zato, ker na osi \\(\\omega\\) velja \\(H=1\\) natanko pri \\(\\omega=\\pm2\\); orbita je naprej in nazaj izračunana za vseh \\(10\\) s. Pri \\(\\omega=2{,}25\\) je \\(H=1{,}53125>1\\): vrtenje; orbita ni sklenjena, ker \\(\\omega\\) ne preide skozi \\(0\\) in \\(\\theta\\) stalno narašča; obe polovici sta ustavljeni po \\(2{,}76\\) s, ker zapustita izračunano območje. Prehod iz nihanja v vrtenje je pri \\(H=1\\).',
            'At \\(\\omega=2\\) we have \\(H=1\\): the readout says exactly on the separatrix (\\(\\theta=0\\) and \\(\\lvert\\omega\\rvert=2\\)), exactly because on the \\(\\omega\\)-axis \\(H=1\\) precisely at \\(\\omega=\\pm2\\); the orbit is computed for all \\(10\\) s forward and backward. At \\(\\omega=2{,}25\\) we have \\(H=1{,}53125>1\\): rotation; the orbit is not closed because \\(\\omega\\) never passes through \\(0\\) and \\(\\theta\\) keeps increasing; both halves are stopped after \\(2{,}76\\) s because they leave the computed region. The change from swing to rotation is at \\(H=1\\).',
        )],
        scene: planeScene('pp2-cross-scene', PP2_LARGE,
            'Nihalo, začetna točka \\((0;1{,}9)\\): \\(H=0{,}805<1\\), nihanje (sklenjena orbita).',
            'Pendulum, start point \\((0;1{,}9)\\): \\(H=0{,}805<1\\), swing (closed orbit).'),
    }),
    step({
        id: 'pp2-separatrix', order: 4,
        title: text('Orbita na separatrisi', 'The orbit on the separatrix'),
        purpose: text('Napovedati, ali orbita na separatrisi doseže sedlo, in preveriti, kje se po \\(10\\) s konča.', 'Predicting whether the orbit on the separatrix reaches the saddle and checking where it ends after \\(10\\) s.'),
        explanation: text(
            'Odprta je začetna točka \\((0;2{,}25)\\) z vrtenjem. V opazovanju nastaviš \\(\\omega\\) na \\(2\\), ostane \\(\\theta=0\\). Zapiši napoved: ali orbita po končnem času doseže sedlo \\((\\pi,0)\\)? Navpični črtkani premici pri \\(\\theta=\\pm\\pi\\) označujeta ovitje: \\(\\theta\\) in \\(\\theta+2\\pi\\) sta isti kot, zato sta \\((\\pi,0)\\) in \\((-\\pi,0)\\) isto stanje nihala, pokonci.',
            'The start point \\((0;2{,}25)\\) with a rotation is open. You will change \\(\\omega\\) to \\(2\\), with \\(\\theta=0\\) staying. Write down a prediction: does the orbit reach the saddle \\((\\pi,0)\\) in finite time? The vertical dashed lines at \\(\\theta=\\pm\\pi\\) mark the wrap: \\(\\theta\\) and \\(\\theta+2\\pi\\) are the same angle, so \\((\\pi,0)\\) and \\((-\\pi,0)\\) are the same state of the pendulum, upright.',
        ),
        formulaIds: ['pp2-level'],
        observationPrompt: text(
            'V polje Začetna točka 1: ω vpiši \\(2\\), nato drsnik Čas t premakni na \\(10\\). Preberi vrstico Začetna točka 1, stanje ob koncu in lego kvadratka ob navpičnih črtkanih premicah.',
            'In the field Seed 1: ω type \\(2\\), then move the slider Time t to \\(10\\). Read the row Seed 1, the status at the end and the position of the square next to the vertical dashed lines.',
        ),
        expectedObservations: [text(
            'Orbita je naprej in nazaj izračunana za vseh \\(10\\) s in se konča blizu \\((\\pm3{,}1414;\\,0{,}0002)\\), tik pred sedlom \\(\\pm\\pi\\approx\\pm3{,}1416\\), ne v njem; stanje pravi Konec izračunanih trajektorij. Sedla orbita v končnem času nikoli ne doseže: ravnovesna točka je konstantna rešitev, orbita, ki bi jo dosegla, bi se po enoličnosti z njo ujemala; ob sedlu se razdalja zmanjšuje kot \\(e^{-t}\\) (lastna vrednost \\(-1\\)) in ne doseže \\(0\\). Številska orbita je ponazoritev z omejenim časom.',
            'The orbit is computed for all \\(10\\) s forward and backward and ends near \\((\\pm3{,}1414;\\,0{,}0002)\\), just short of the saddle \\(\\pm\\pi\\approx\\pm3{,}1416\\), not in it; the status says End of the computed trajectories. The orbit never reaches the saddle in finite time: an equilibrium is a constant solution, and an orbit that reached it would by uniqueness coincide with it; near the saddle the distance shrinks like \\(e^{-t}\\) (eigenvalue \\(-1\\)) and does not reach \\(0\\). The numerical orbit is an illustration with a limited time.',
        )],
        scene: planeScene('pp2-separatrix-scene', PP2_ROTATION,
            'Nihalo, začetna točka \\((0;2{,}25)\\): \\(H=1{,}53125>1\\), vrtenje; obe polovici sta ustavljeni po \\(2{,}76\\) s.',
            'Pendulum, start point \\((0;2{,}25)\\): \\(H=1{,}53125>1\\), rotation; both halves are stopped after \\(2{,}76\\) s.'),
    }),
    step({
        id: 'pp2-free', order: 5,
        title: text('Prosto raziskovanje', 'Free exploration'),
        purpose: text('Samostojno preizkusiti energijo, nihanje in vrtenje.', 'Trying energy, swing and rotation on your own.'),
        explanation: text(
            'Nihalo z začetkom \\((1,0)\\) je spet nastavljeno. Formula pojasni, zakaj je pri \\(H<1\\) nihanje, pri \\(H>1\\) vrtenje in pri \\(H=1\\) separatrisa.',
            'The pendulum with start \\((1,0)\\) is set again. The formula explains why \\(H<1\\) gives a swing, \\(H>1\\) a rotation and \\(H=1\\) the separatrix.',
        ),
        formulaIds: ['pp2-classes'],
        observationPrompt: text(
            'Dodaj začetno točko \\((-1,0)\\) in primerjaj njeno energijo z energijo točke \\((1,0)\\). Poišči začetno točko z \\(H>1\\), ki ni na osi \\(\\omega\\).',
            'With Add a seed add the start point \\((-1,0)\\) and compare its energy with that of \\((1,0)\\). Find a start point with \\(H>1\\) that is not on the \\(\\omega\\)-axis.',
        ),
        expectedObservations: [text(
            'Obe točki imata \\(H=-\\cos1\\approx-0{,}540302\\), ker je \\(\\cos\\) soda funkcija; orbiti sta zrcalni. Primer z \\(H>1\\) zunaj osi je \\((0{,}05;2)\\) z \\(H\\approx1{,}00125\\): vrtenje, odčitek primerja \\(H\\) z \\(1\\); obe polovici sta ustavljeni po \\(8{,}62\\) s oziroma \\(8{,}66\\) s.',
            'Both points have \\(H=-\\cos1\\approx-0{,}540302\\) because \\(\\cos\\) is an even function; the orbits are mirror images. An example with \\(H>1\\) off the axis is \\((0{,}05;2)\\) with \\(H\\approx1{,}00125\\): rotation, the readout compares \\(H\\) with \\(1\\); the two halves are stopped after \\(8{,}62\\) s and \\(8{,}66\\) s.',
        )],
        scene: planeScene('pp2-free-scene', PP2_FREE,
            'Nihalo, začetna točka \\((1,0)\\): \\(H=-0{,}540302<1\\), nihanje; sistem in točke so prosti.',
            'Pendulum, start point \\((1,0)\\): \\(H=-0{,}540302<1\\), swing; the system and the points are free.'),
    }),
];

// ---- PP3 ---------------------------------------------------------------------------------------------------------------------------

const pp3Formulas: readonly FormulaBlock[] = [
    {
        id: 'pp3-jacobian',
        latex: 'x^{\\prime}=f(x),\\quad f(x^{*})=0,\\quad J=\\begin{pmatrix}\\partial f_{1}/\\partial\\theta&\\partial f_{1}/\\partial\\omega\\\\\\partial f_{2}/\\partial\\theta&\\partial f_{2}/\\partial\\omega\\end{pmatrix}\\Bigg|_{x^{*}},\\quad \\xi^{\\prime}=J\\xi',
        notation: text(
            '\\(x=(\\theta,\\omega)\\) je točka ravnine, \\(f=(f_{1},f_{2})\\) desna stran sistema, \\(x^{*}\\) ravnovesna točka, \\(J\\) Jacobijeva matrika v njej, \\(\\xi=x-x^{*}\\) odmik od ravnovesne točke.',
            '\\(x=(\\theta,\\omega)\\) is a point of the plane, \\(f=(f_{1},f_{2})\\) the right-hand side of the system, \\(x^{*}\\) an equilibrium, \\(J\\) the Jacobian there, \\(\\xi=x-x^{*}\\) the offset from the equilibrium.',
        ),
        explanation: text(
            'Ravnovesna točka je rešitev \\(f(x^{*})=0\\). Linearizacija je linearni sistem \\(\\xi^{\\prime}=J\\xi\\) z matriko \\(J\\) iz parcialnih odvodov desne strani v \\(x^{*}\\); njen tip določita sled \\(\\tau\\) in determinanta \\(\\delta\\) matrike \\(J\\) kot pri linearnem sistemu v lekciji PP1. Pri nihalu je \\(f=(\\omega,\\,-\\sin\\theta)\\), ravnovesni točki sta \\((0,0)\\) in \\((\\pi,0)\\) (pa še njuni premiki za \\(2\\pi\\) po \\(\\theta\\)).',
            'An equilibrium is a solution of \\(f(x^{*})=0\\). The linearization is the linear system \\(\\xi^{\\prime}=J\\xi\\) with the matrix \\(J\\) of partial derivatives of the right-hand side at \\(x^{*}\\); its type is decided by the trace \\(\\tau\\) and the determinant \\(\\delta\\) of \\(J\\) as for the linear system in the lesson PP1. For the pendulum \\(f=(\\omega,\\,-\\sin\\theta)\\), the equilibria are \\((0,0)\\) and \\((\\pi,0)\\) (and their shifts by \\(2\\pi\\) in \\(\\theta\\)).',
        ),
    },
    {
        id: 'pp3-hartman-grobman',
        latex: '\\operatorname{Re}\\lambda_{1,2}\\neq0\\ \\Rightarrow\\ h\\bigl(\\Phi^{t}(x)\\bigr)=e^{tJ}\\,h(x)',
        notation: text(
            '\\(\\lambda_{1,2}\\) sta lastni vrednosti matrike \\(J\\); \\(\\operatorname{Re}\\) je realni del; \\(\\Phi^{t}\\) je tok sistema \\(x^{\\prime}=f(x)\\), \\(e^{tJ}\\) tok linearizacije (v odmiku \\(\\xi\\)), \\(h\\) homeomorfizem (zvezna obrnljiva preslikava z zvezno inverzno) v okolici \\(x^{*}\\).',
            '\\(\\lambda_{1,2}\\) are the eigenvalues of \\(J\\); \\(\\operatorname{Re}\\) is the real part; \\(\\Phi^{t}\\) is the flow of the system \\(x^{\\prime}=f(x)\\), \\(e^{tJ}\\) the flow of the linearization (in the offset \\(\\xi\\)), \\(h\\) a homeomorphism (a continuous invertible map with a continuous inverse) near \\(x^{*}\\).',
        ),
        explanation: text(
            'Izrek Hartman–Grobman (FMF Analiza 3, kot je navedeno): če nobena lastna vrednost matrike \\(J\\) nima realnega dela \\(0\\) (ravnovesna točka je hiperbolična), obstaja v okolici \\(x^{*}\\) homeomorfizem, ki rešitve nelinearnega sistema preslika v rešitve linearizacije. To je topološka ustreznost, ne trditev o razdalji med krivuljama; zato je približevanje krivulj pri večji povečavi ponazoritev. Če ima lastna vrednost realni del \\(0\\), izrek ne pove nič: portret je lahko podoben linearnemu ali pa ne, odloča račun za dani sistem, ne \\(J\\). Tip linearizacije in hiperboličnost sta točna testa na celih številih; lastni vrednosti sta izračunani.',
            'The Hartman–Grobman theorem (FMF Analiza 3, as cited): if no eigenvalue of \\(J\\) has real part \\(0\\) (the equilibrium is hyperbolic), there is near \\(x^{*}\\) a homeomorphism that maps solutions of the nonlinear system to solutions of the linearization. This is a topological equivalence, not a statement about the distance between curves; so the curves approaching each other under a larger zoom is an illustration. If an eigenvalue has real part \\(0\\), the theorem says nothing: the portrait may or may not resemble the linear one, and a computation for the given system decides, not \\(J\\). The type of the linearization and hyperbolicity are exact integer tests; the eigenvalues are computed.',
        ),
    },
];

const pp3Steps: readonly GuidedLessonStep[] = [
    step({
        id: 'pp3-jacobian', order: 1,
        title: text('Jacobijeva matrika v zgornji legi nihala', 'The Jacobian at the upright position of the pendulum'),
        purpose: text('Napovedati Jacobijevo matriko, tip in lastni vrednosti linearizacije nihala v \\((\\pi,0)\\) in jih primerjati z odčitki.', 'Predicting the Jacobian, the type and the eigenvalues of the linearization of the pendulum at \\((\\pi,0)\\) and comparing them with the readouts.'),
        explanation: text(
            'Odpre se linearni sistem z matriko \\(\\begin{pmatrix}-4&-1\\\\-2&-3\\end{pmatrix}\\) in začetno točko \\((1,0)\\). Nihalo \\(\\theta^{\\prime}=\\omega\\), \\(\\omega^{\\prime}=-\\sin\\theta\\) je nelinearno; njegovo linearizacijo v ravnovesni točki daje Jacobijeva matrika iz formule. Zapiši napoved za zgornjo lego \\((\\pi,0)\\), kjer je \\(\\cos\\pi=-1\\): kolikšna je \\(J\\), kolikšni so \\(\\tau\\), \\(\\delta\\), \\(\\Delta\\) in lastni vrednosti ter kakšen je tip linearizacije?',
            'The linear system with the matrix \\(\\begin{pmatrix}-4&-1\\\\-2&-3\\end{pmatrix}\\) and the start point \\((1,0)\\) opens. The pendulum \\(\\theta^{\\prime}=\\omega\\), \\(\\omega^{\\prime}=-\\sin\\theta\\) is nonlinear; its linearization at an equilibrium is given by the Jacobian in the formula. Write down a prediction for the upright position \\((\\pi,0)\\), where \\(\\cos\\pi=-1\\): what is \\(J\\), what are \\(\\tau\\), \\(\\delta\\), \\(\\Delta\\) and the eigenvalues, and what is the type of the linearization?',
        ),
        formulaIds: ['pp3-jacobian'],
        observationPrompt: text(
            'V izbirniku Sistem izberi Nihalo, nato v izbirniku Ravnovesna točka v središču pogleda izberi (π, 0): nihalo stoji pokonci. Ob izbiri Nihala se za hip pokaže spodnja lega \\((0,0)\\); njenih odčitkov še ne beri. Šele po izbiri \\((\\pi,0)\\) preberi Tip linearizacije (točen), Jacobijevo matriko v ravnovesni točki, Lastni vrednosti (izračunani) in vrstico Hiperbolična; primerjaj z napovedjo.',
            'In the chooser System pick Pendulum, then in the chooser Equilibrium in the centre of the view pick (π, 0): upright. Picking Pendulum briefly shows the lower position \\((0,0)\\); do not read its readouts yet. Only after picking \\((\\pi,0)\\) read Type of the linearization (exact), Jacobian at the equilibrium, Eigenvalues (computed) and the row Hyperbolic; compare with your prediction.',
        ),
        expectedObservations: [text(
            'Odvodi so \\(\\partial f_{1}/\\partial\\theta=0\\), \\(\\partial f_{1}/\\partial\\omega=1\\), \\(\\partial f_{2}/\\partial\\theta=-\\cos\\pi=1\\), \\(\\partial f_{2}/\\partial\\omega=0\\), torej \\(J=\\begin{pmatrix}0&1\\\\1&0\\end{pmatrix}\\), \\(\\tau=0\\), \\(\\delta=-1\\), \\(\\Delta=\\tau^{2}-4\\delta=4\\), iz \\(\\lambda^{2}-1=0\\) sta lastni vrednosti \\(1\\) in \\(-1\\). Odčitki pravijo: tip linearizacije sedlo (\\(\\tau=0\\), \\(\\delta=-1\\)), Jacobijeva matrika vrstica \\(1\\): \\((0;\\,1)\\), vrstica \\(2\\): \\((1;\\,0)\\), \\(\\lambda_{1}=1\\), \\(\\lambda_{2}=-1\\), hiperbolična: da. Tip je točen test na celih številih, lastni vrednosti sta izračunani.',
            'The derivatives are \\(\\partial f_{1}/\\partial\\theta=0\\), \\(\\partial f_{1}/\\partial\\omega=1\\), \\(\\partial f_{2}/\\partial\\theta=-\\cos\\pi=1\\), \\(\\partial f_{2}/\\partial\\omega=0\\), so \\(J=\\begin{pmatrix}0&1\\\\1&0\\end{pmatrix}\\), \\(\\tau=0\\), \\(\\delta=-1\\), \\(\\Delta=\\tau^{2}-4\\delta=4\\), and from \\(\\lambda^{2}-1=0\\) the eigenvalues are \\(1\\) and \\(-1\\). The readouts say: type of the linearization saddle (\\(\\tau=0\\), \\(\\delta=-1\\)), Jacobian row \\(1\\): \\((0,\\,1)\\), row \\(2\\): \\((1,\\,0)\\), \\(\\lambda_{1}=1\\), \\(\\lambda_{2}=-1\\), hyperbolic: yes. The type is an exact integer test, the eigenvalues are computed.',
        )],
        scene: planeScene('pp3-jacobian-scene', PP3_LINEAR,
            'Linearni sistem z matriko \\(-E\\), začetna točka \\((1,0)\\): stabilno vozlišče, \\(\\tau=-7\\), \\(\\delta=10\\); nihalo še ni izbrano.',
            'The linear system with the matrix \\(-E\\), start point \\((1,0)\\): stable node, \\(\\tau=-7\\), \\(\\delta=10\\); the pendulum is not yet chosen.'),
    }),
    step({
        id: 'pp3-zoom', order: 2,
        title: text('Povečava okoli sedla', 'Magnifying around the saddle'),
        purpose: text('Napovedati, kaj se zgodi s polnimi in črtkanimi krivuljami obroča pri večji povečavi, in primerjati sliko z odčitki.', 'Predicting what happens to the solid and dashed curves of the ring under a larger zoom and comparing the picture with the readouts.'),
        explanation: text(
            'Odprto je nihalo v \\((\\pi,0)\\) s povečavo \\(0\\) (polovična širina \\(4\\)) in začetnima točkama \\((3{,}15;\\,0{,}05)\\) ter \\((3{,}1;\\,-0{,}05)\\) blizu sedla; koordinate začetnih točk so absolutne, ne odmiki od ravnovesne točke. Okoli ravnovesne točke leži obroč \\(12\\) začetkov s polmerom \\(3/4\\) polovične širine pogleda. Polne črte so nelinearne trajektorije iz teh začetkov, črtkane trajektorije linearizacije iz istih začetkov; ravni črti sta lastni smeri linearizacije. Zapiši napoved: kako se bosta polne in črtkane krivulje obroča razlikovali pri povečavi \\(3\\) v primerjavi s povečavo \\(0\\)? Odčitka za obroč ne merita razdalje med krivuljama, primerjava je z očesom.',
            'The pendulum at \\((\\pi,0)\\) opens with zoom \\(0\\) (half-width \\(4\\)) and the start points \\((3{,}15;\\,0{,}05)\\) and \\((3{,}1;\\,-0{,}05)\\) near the saddle; the coordinates of the start points are absolute, not offsets from the equilibrium. Around the equilibrium lies a ring of \\(12\\) starts with radius \\(3/4\\) of the half-width of the view. The solid lines are nonlinear trajectories from these starts, the dashed ones trajectories of the linearization from the same starts; the straight lines are the eigen-directions of the linearization. Write down a prediction: how will the solid and dashed curves of the ring differ at zoom \\(3\\) compared with zoom \\(0\\)? The readouts for the ring do not measure the distance between the curves, the comparison is by eye.',
        ),
        formulaIds: ['pp3-jacobian'],
        observationPrompt: text(
            'Drsnik Povečava okoli ravnovesne točke nastavi na \\(3\\) (besedilo pravi polovična širina \\(0{,}5\\)). Primerjaj polne in črtkane krivulje obroča ter obe začetni točki z lastnima smerema; preberi vrstice Izračunano območje, Obroč trajektorij (izračunan) in Linearizacija na obroču (izračunana).',
            'Set the slider Zoom around the equilibrium to \\(3\\) (the text says half-width \\(0{,}5\\)). Compare the solid and dashed curves of the ring and the two start points with the eigen-directions; read the rows Computed region, Ring of trajectories (computed) and Linearization on the ring (computed).',
        ),
        expectedObservations: [text(
            'Pogled je \\(\\theta\\) od \\(2{,}6416\\) do \\(3{,}6416\\), \\(\\omega\\) od \\(-0{,}5\\) do \\(0{,}5\\), polmer obroča \\(0{,}375\\). Pri povečavi \\(0\\) odčitka pravita, da je ustavljenih \\(20\\) od \\(24\\) polovic nelinearnega obroča in \\(24\\) od \\(24\\) pri linearizaciji, pri povečavi \\(3\\) obakrat \\(24\\) od \\(24\\); to je število polovic, ki zapustijo pogled, ne razdalja. Začetni točki sta ob času \\(0\\) v pogledu, njuni trajektoriji pa ga zapustita: \\((3{,}15;\\,0{,}05)\\) je naprej ustavljena po \\(2{,}86\\) s in nazaj po \\(3{,}2\\) s, \\((3{,}1;\\,-0{,}05)\\) naprej po \\(2{,}4\\) s in nazaj po \\(4{,}8\\) s. Polne in črtkane krivulje primerjaj z očesom: pri majhnem polmeru pričakuješ, da sta si bližje kot pri polmeru \\(3\\). Tega slika ne dokazuje; račun velja za polje, ne za krivulje: pri \\(\\theta=\\pi+x\\) je \\(\\omega^{\\prime}=\\sin x\\) pri nihalu in \\(x\\) pri linearizaciji, razmerje \\(\\sin x/x\\) je pri \\(\\lvert x\\rvert\\leq0{,}375\\) vsaj \\(0{,}9767\\), pri \\(x=3\\) pa \\(0{,}0470\\). Hiperboličnost sama po izreku Hartman–Grobman (formula v koraku 6) zagotavlja topološko ustreznost, ne bližine krivulj.',
            'The view is \\(\\theta\\) from \\(2{,}6416\\) to \\(3{,}6416\\), \\(\\omega\\) from \\(-0{,}5\\) to \\(0{,}5\\), the ring radius is \\(0{,}375\\). At zoom \\(0\\) the readouts say that \\(20\\) of \\(24\\) halves of the nonlinear ring are stopped and \\(24\\) of \\(24\\) for the linearization, at zoom \\(3\\) both \\(24\\) of \\(24\\); this counts the halves that leave the view, not a distance. The two start points are in view at time \\(0\\), and their trajectories leave it: \\((3{,}15;\\,0{,}05)\\) is stopped after \\(2{,}86\\) s forward and \\(3{,}2\\) s backward, \\((3{,}1;\\,-0{,}05)\\) after \\(2{,}4\\) s forward and \\(4{,}8\\) s backward. Compare the solid and dashed curves by eye: at a small radius you expect them closer than at radius \\(3\\). The picture does not prove this; the computation is for the field, not for the curves: at \\(\\theta=\\pi+x\\) we have \\(\\omega^{\\prime}=\\sin x\\) for the pendulum and \\(x\\) for the linearization, the ratio \\(\\sin x/x\\) is at least \\(0{,}9767\\) for \\(\\lvert x\\rvert\\leq0{,}375\\) and \\(0{,}0470\\) at \\(x=3\\). By the Hartman–Grobman theorem (the formula in step 6) hyperbolicity alone gives a topological equivalence, not closeness of the curves.',
        )],
        scene: planeScene('pp3-zoom-scene', PP3_SADDLE_NEAR,
            'Nihalo v \\((\\pi,0)\\), povečava \\(0\\), začetni točki \\((3{,}15;\\,0{,}05)\\) in \\((3{,}1;\\,-0{,}05)\\): sedlo, \\(H>1\\) pri obeh (vrtenje); obroč \\(20\\) od \\(24\\) ustavljenih polovic, linearizacija \\(24\\) od \\(24\\).',
            'The pendulum at \\((\\pi,0)\\), zoom \\(0\\), start points \\((3{,}15;\\,0{,}05)\\) and \\((3{,}1;\\,-0{,}05)\\): saddle, \\(H>1\\) for both (rotation); ring \\(20\\) of \\(24\\) stopped halves, linearization \\(24\\) of \\(24\\).'),
    }),
    step({
        id: 'pp3-centre', order: 3,
        title: text('Jacobijeva matrika v spodnji legi nihala', 'The Jacobian at the lower position of the pendulum'),
        purpose: text('Napovedati Jacobijevo matriko in tip v \\((0,0)\\), kaj linearizacija tam določa, in ločiti to od energijskega argumenta.', 'Predicting the Jacobian and the type at \\((0,0)\\), what the linearization decides there, and separating this from the energy argument.'),
        explanation: text(
            'Odprto je nihalo v \\((\\pi,0)\\) z začetno točko \\((1,0)\\). Zapiši napoved za spodnjo lego \\((0,0)\\), kjer je \\(\\cos0=1\\): kolikšna je \\(J\\), kolikšni so \\(\\tau\\), \\(\\delta\\), \\(\\Delta\\) in lastni vrednosti, kakšen je tip in ali je ravnovesna točka hiperbolična? Kaj iz tega sklepaš o nihalu blizu \\((0,0)\\), in kaj lahko o tem sklepaš samo iz \\(J\\)?',
            'The pendulum at \\((\\pi,0)\\) with the start point \\((1,0)\\) is open. Write down a prediction for the lower position \\((0,0)\\), where \\(\\cos0=1\\): what is \\(J\\), what are \\(\\tau\\), \\(\\delta\\), \\(\\Delta\\) and the eigenvalues, what is the type and is the equilibrium hyperbolic? What do you conclude about the pendulum near \\((0,0)\\), and what can you conclude from \\(J\\) alone?',
        ),
        formulaIds: ['pp3-jacobian'],
        observationPrompt: text(
            'V izbirniku Ravnovesna točka v središču pogleda izberi (0, 0): nihalo visi. Preberi Tip linearizacije (točen), Jacobijevo matriko v ravnovesni točki, Lastni vrednosti (izračunani), vrstici Hiperbolična in Kaj določa linearizacija ter Energija začetne točke 1.',
            'In the chooser Equilibrium in the centre of the view pick (0, 0): hanging down. Read Type of the linearization (exact), Jacobian at the equilibrium, Eigenvalues (computed), the rows Hyperbolic and What the linearization decides, and Energy of seed 1.',
        ),
        expectedObservations: [text(
            'Odvodi so \\(\\partial f_{2}/\\partial\\theta=-\\cos0=-1\\), ostali kot prej: \\(J=\\begin{pmatrix}0&1\\\\-1&0\\end{pmatrix}\\), \\(\\tau=0\\), \\(\\delta=1\\), \\(\\Delta=-4\\), \\(\\lambda^{2}+1=0\\), torej \\(\\lambda=0\\pm i\\). Odčitki pravijo: tip linearizacije središče, Jacobijeva matrika vrstica \\(1\\): \\((0;\\,1)\\), vrstica \\(2\\): \\((-1;\\,0)\\), \\(\\lambda=0\\pm1\\,i\\), hiperbolična: ne, Kaj določa linearizacija: Ni hiperbolična: linearizacija ne določa lokalnega portreta. Realni del lastne vrednosti je \\(0\\), zato linearizacija o nihalu pri \\((0,0)\\) ne pove ničesar. Da je to središče tudi pri nihalu, sledi iz energije \\(H=\\omega^{2}/2-\\cos\\theta\\): je konstantna po rešitvah, \\(H+1=\\omega^{2}/2+(1-\\cos\\theta)\\) je pri \\((0,0)\\) enaka \\(0\\) in drugje blizu pozitivna, zato so nivojnice blizu \\((0,0)\\) sklenjene krivulje okoli te točke. To je argument iz \\(H\\), ne iz \\(J\\); odčitek začetne točke \\((1,0)\\) pravi \\(H=-0{,}540302<1\\): nihanje, naprej in nazaj izračunana za vseh \\(10\\) s.',
            'The derivatives are \\(\\partial f_{2}/\\partial\\theta=-\\cos0=-1\\), the others as before: \\(J=\\begin{pmatrix}0&1\\\\-1&0\\end{pmatrix}\\), \\(\\tau=0\\), \\(\\delta=1\\), \\(\\Delta=-4\\), \\(\\lambda^{2}+1=0\\), so \\(\\lambda=0\\pm i\\). The readouts say: type of the linearization centre, Jacobian row \\(1\\): \\((0,\\,1)\\), row \\(2\\): \\((-1,\\,0)\\), \\(\\lambda=0\\pm1\\,i\\), hyperbolic: no, What the linearization decides: Not hyperbolic: the linearization does not decide the local portrait. The real part of the eigenvalue is \\(0\\), so the linearization says nothing about the pendulum at \\((0,0)\\). That it is also a centre for the pendulum follows from the energy \\(H=\\omega^{2}/2-\\cos\\theta\\): it is constant along solutions, \\(H+1=\\omega^{2}/2+(1-\\cos\\theta)\\) equals \\(0\\) at \\((0,0)\\) and is positive nearby elsewhere, so level curves near \\((0,0)\\) are closed curves around that point. This is an argument from \\(H\\), not from \\(J\\); the readout of the start point \\((1,0)\\) says \\(H=-0{,}540302<1\\): swing, computed for all \\(10\\) s forward and backward.',
        )],
        scene: planeScene('pp3-centre-scene', PP3_SADDLE_UNIT,
            'Nihalo v \\((\\pi,0)\\), povečava \\(0\\), začetna točka \\((1,0)\\): sedlo, \\(\\tau=0\\), \\(\\delta=-1\\); \\(H=-0{,}540302<1\\).',
            'The pendulum at \\((\\pi,0)\\), zoom \\(0\\), start point \\((1,0)\\): saddle, \\(\\tau=0\\), \\(\\delta=-1\\); \\(H=-0{,}540302<1\\).'),
    }),
    step({
        id: 'pp3-weak', order: 4,
        title: text('Šibka spirala', 'The weak spiral'),
        purpose: text('Napovedati Jacobijevo matriko in tip šibke spirale in ali so njene orbite sklenjene, ter primerjati z nihalom.', 'Predicting the Jacobian and the type of the weak spiral and whether its orbits are closed, and comparing with the pendulum.'),
        explanation: text(
            'Odprto je nihalo v \\((0,0)\\) z začetno točko \\((1,0)\\). Šibka spirala je sistem \\(r^{\\prime}=-r^{3}\\), \\(\\theta^{\\prime}=1\\) v polarnih koordinatah \\(r=\\sqrt{x^{2}+y^{2}}\\), \\(\\theta\\); v kartezičnih je \\(x^{\\prime}=-(x^{2}+y^{2})x-y\\), \\(y^{\\prime}=x-(x^{2}+y^{2})y\\). Zapiši napoved: kolikšna je \\(J\\) v izhodišču, kolikšna sta \\(\\tau\\) in \\(\\delta\\) in kakšen je tip? Ali je tip enak kot pri nihalu, ali je matrika enaka in ali so orbite šibke spirale sklenjene kot pri nihalu? Če niso, kolikšen je polmer \\(r(t)\\) za \\(r_{0}=1\\) pri \\(t=10\\)?',
            'The pendulum at \\((0,0)\\) with the start point \\((1,0)\\) is open. The weak spiral is the system \\(r^{\\prime}=-r^{3}\\), \\(\\theta^{\\prime}=1\\) in polar coordinates \\(r=\\sqrt{x^{2}+y^{2}}\\), \\(\\theta\\); in Cartesian ones it is \\(x^{\\prime}=-(x^{2}+y^{2})x-y\\), \\(y^{\\prime}=x-(x^{2}+y^{2})y\\). Write down a prediction: what is \\(J\\) at the origin, what are \\(\\tau\\) and \\(\\delta\\), and what is the type? Is the type the same as for the pendulum, is the matrix the same, and are the orbits of the weak spiral closed as for the pendulum? If not, what is the radius \\(r(t)\\) for \\(r_{0}=1\\) at \\(t=10\\)?',
        ),
        formulaIds: ['pp3-jacobian'],
        observationPrompt: text(
            'V izbirniku Sistem izberi Šibka spirala (r′ = −r³, θ′ = 1). Preberi Tip linearizacije (točen), Jacobijevo matriko v ravnovesni točki, vrstico Hiperbolična, Začetna točka 1 ter vrstici Obroč trajektorij (izračunan) in Linearizacija na obroču (izračunana). Čas t nastavi na \\(10\\) in opazuj kvadratek; polmer \\(r(t)\\) odčitek ne pove, vidiš ga le v risbi.',
            'In the chooser System pick Weak spiral (r′ = −r³, θ′ = 1). Read Type of the linearization (exact), Jacobian at the equilibrium, the row Hyperbolic, Seed 1 and the rows Ring of trajectories (computed) and Linearization on the ring (computed). Set the time t to \\(10\\) and watch the square; no readout gives the radius \\(r(t)\\), you see it only in the drawing.',
        ),
        expectedObservations: [text(
            'Kubični členi pri \\((0,0)\\) ne prispevajo k \\(J\\): \\(J=\\begin{pmatrix}0&-1\\\\1&0\\end{pmatrix}\\), \\(\\tau=0\\), \\(\\delta=1\\), \\(\\lambda=0\\pm i\\). Odčitki pravijo: tip središče, Jacobijeva matrika vrstica \\(1\\): \\((0;\\,-1)\\), vrstica \\(2\\): \\((1;\\,0)\\), hiperbolična: ne. Tip je isti kot pri nihalu, matrika ni ista: \\(J\\) šibke spirale je \\(-J\\) nihala, zato se vrti v nasprotno smer. Orbite pa niso sklenjene: iz \\(r^{\\prime}=-r^{3}\\) sledi \\((1/r^{2})^{\\prime}=2\\), torej \\(r(t)=r_{0}/\\sqrt{1+2r_{0}^{2}t}\\); pri \\(r_{0}=1\\) je \\(r(1)\\approx0{,}5773503\\) in \\(r(10)\\approx0{,}2182179\\), \\(r\\) strogo pada, orbita se ne vrne. Začetna točka \\((1,0)\\) je naprej izračunana za vseh \\(10\\) s, nazaj ustavljena po \\(0{,}48\\) s, ker zapusti območje; pri nihalu sta bili obe polovici izračunani za vseh \\(10\\) s. Obroč: \\(12\\) od \\(24\\) polovic nelinearnega obroča ustavljenih, \\(0\\) od \\(24\\) pri linearizaciji.',
            'The cubic terms at \\((0,0)\\) do not contribute to \\(J\\): \\(J=\\begin{pmatrix}0&-1\\\\1&0\\end{pmatrix}\\), \\(\\tau=0\\), \\(\\delta=1\\), \\(\\lambda=0\\pm i\\). The readouts say: type centre, Jacobian row \\(1\\): \\((0,\\,-1)\\), row \\(2\\): \\((1,\\,0)\\), hyperbolic: no. The type is the same as for the pendulum, the matrix is not: \\(J\\) of the weak spiral is \\(-J\\) of the pendulum, so it turns the other way. The orbits are not closed, though: from \\(r^{\\prime}=-r^{3}\\) it follows that \\((1/r^{2})^{\\prime}=2\\), so \\(r(t)=r_{0}/\\sqrt{1+2r_{0}^{2}t}\\); for \\(r_{0}=1\\) we have \\(r(1)\\approx0{,}5773503\\) and \\(r(10)\\approx0{,}2182179\\), \\(r\\) strictly decreases, the orbit does not return. The start point \\((1,0)\\) is computed for all \\(10\\) s forward and stopped after \\(0{,}48\\) s backward because it leaves the region; for the pendulum both halves were computed for all \\(10\\) s. Ring: \\(12\\) of \\(24\\) halves of the nonlinear ring stopped, \\(0\\) of \\(24\\) for the linearization.',
        )],
        scene: planeScene('pp3-weak-scene', PP3_PENDULUM_CENTRE,
            'Nihalo v \\((0,0)\\), povečava \\(0\\), začetna točka \\((1,0)\\): središče, \\(\\tau=0\\), \\(\\delta=1\\), ni hiperbolična; začetna točka naprej in nazaj izračunana za vseh \\(10\\) s.',
            'The pendulum at \\((0,0)\\), zoom \\(0\\), start point \\((1,0)\\): centre, \\(\\tau=0\\), \\(\\delta=1\\), not hyperbolic; the start point computed for all \\(10\\) s forward and backward.'),
    }),
    step({
        id: 'pp3-undecided', order: 5,
        title: text('Povečava okoli šibke spirale', 'Magnifying around the weak spiral'),
        purpose: text('Napovedati, ali povečava naredi šibko spiralo podobno linearnemu središču, in ločiti sliko od računa.', 'Predicting whether magnifying makes the weak spiral resemble the linear centre, and separating the picture from the computation.'),
        explanation: text(
            'Odprta je šibka spirala s povečavo \\(0\\) in začetno točko \\((0{,}1;\\,0)\\). Pri sedlu je bila primerjava krivulj obroča pri povečavi \\(0\\) in \\(3\\). Račun iz prejšnjega koraka pove, da \\(r\\) strogo pada. Zapiši napoved za šibko spiralo pri povečavi \\(3\\): ali bo obroč nelinearnih krivulj videti bližje črtkanemu obroču linearizacije kot pri povečavi \\(0\\)? Ali bo orbita začetne točke na sliki videti sklenjena? Kaj potem odloča: slika ali račun?',
            'The weak spiral with zoom \\(0\\) and the start point \\((0{,}1;\\,0)\\) is open. At the saddle you compared the curves of the ring at zoom \\(0\\) and \\(3\\). The computation of the previous step says that \\(r\\) strictly decreases. Write down a prediction for the weak spiral at zoom \\(3\\): will the ring of nonlinear curves look closer to the dashed ring of the linearization than at zoom \\(0\\)? Will the orbit of the start point look closed in the picture? Which then decides: the picture or the computation?',
        ),
        formulaIds: ['pp3-jacobian'],
        observationPrompt: text(
            'Drsnik Povečava okoli ravnovesne točke nastavi na \\(3\\) (polovična širina \\(0{,}5\\)) in Čas t na \\(10\\). Primerjaj polni in črtkani obroč ter orbito začetne točke; preberi Začetna točka 1, Obroč trajektorij (izračunan), Linearizacija na obroču (izračunana) in Kaj določa linearizacija.',
            'Set the slider Zoom around the equilibrium to \\(3\\) (half-width \\(0{,}5\\)) and Time t to \\(10\\). Compare the solid and dashed rings and the orbit of the start point; read Seed 1, Ring of trajectories (computed), Linearization on the ring (computed) and What the linearization decides.',
        ),
        expectedObservations: [text(
            'Začetna točka \\((0{,}1;\\,0)\\) je pri povečavi \\(0\\) in \\(3\\) naprej in nazaj izračunana za vseh \\(10\\) s. Obroč: pri obeh povečavah \\(12\\) od \\(24\\) polovic nelinearnega obroča ustavljenih in \\(0\\) od \\(24\\) pri linearizaciji; ti števili se s povečavo ne spremenita. Na sliki se polni obroč pri povečavi \\(3\\) v \\(10\\) s skrči manj kot pri povečavi \\(0\\), zato je videti bližje črtkanemu, čeprav \\(r(t)\\) strogo pada in nobena orbita ni sklenjena. Orbita začetne točke je blizu sklenjene: \\(r(10)=0{,}1/\\sqrt{1+2\\cdot0{,}01\\cdot10}\\approx0{,}0912871\\) namesto \\(0{,}1\\), padec približno \\(0{,}0087\\), to je okoli \\(0{,}017\\) polovične širine \\(0{,}5\\). Slika te razlike ne loči zanesljivo od sklenjene krivulje; račun \\(r(t)=r_{0}/\\sqrt{1+2r_{0}^{2}t}\\) pove, da \\(r\\) strogo pada, torej orbita ni sklenjena. Vrstica Kaj določa linearizacija pravi: Ni hiperbolična: linearizacija ne določa lokalnega portreta. Pri nihalu je bilo središče, pri šibki spirali ni: o tem odloča sistem sam, ne \\(J\\); povečava ne odloči.',
            'The start point \\((0{,}1;\\,0)\\) is computed for all \\(10\\) s forward and backward at zoom \\(0\\) and \\(3\\). Ring: at both zooms \\(12\\) of \\(24\\) halves of the nonlinear ring are stopped and \\(0\\) of \\(24\\) for the linearization; these counts do not change with the zoom. In the picture the solid ring at zoom \\(3\\) shrinks less in \\(10\\) s than at zoom \\(0\\), so it looks closer to the dashed one, although \\(r(t)\\) strictly decreases and no orbit is closed. The orbit of the start point is nearly closed: \\(r(10)=0{,}1/\\sqrt{1+2\\cdot0{,}01\\cdot10}\\approx0{,}0912871\\) instead of \\(0{,}1\\), a drop of about \\(0{,}0087\\), around \\(0{,}017\\) of the half-width \\(0{,}5\\). The picture does not reliably tell this from a closed curve; the computation \\(r(t)=r_{0}/\\sqrt{1+2r_{0}^{2}t}\\) says that \\(r\\) strictly decreases, so the orbit is not closed. The row What the linearization decides says: Not hyperbolic: the linearization does not decide the local portrait. The pendulum was a centre, the weak spiral is not: the system itself decides, not \\(J\\); the zoom does not decide.',
        )],
        scene: planeScene('pp3-undecided-scene', PP3_WEAK_SMALL,
            'Šibka spirala, povečava \\(0\\), začetna točka \\((0{,}1;\\,0)\\): središče, \\(\\tau=0\\), \\(\\delta=1\\), ni hiperbolična; naprej in nazaj izračunana za vseh \\(10\\) s; obroč \\(12\\) od \\(24\\) ustavljenih polovic, linearizacija \\(0\\) od \\(24\\).',
            'The weak spiral, zoom \\(0\\), start point \\((0{,}1;\\,0)\\): centre, \\(\\tau=0\\), \\(\\delta=1\\), not hyperbolic; computed for all \\(10\\) s forward and backward; ring \\(12\\) of \\(24\\) stopped halves, linearization \\(0\\) of \\(24\\).'),
    }),
    step({
        id: 'pp3-free', order: 6,
        title: text('Prosto raziskovanje', 'Free exploration'),
        purpose: text('Samostojno preizkusiti sistem, ravnovesno točko in povečavo.', 'Trying the system, the equilibrium and the zoom on your own.'),
        explanation: text(
            'Nihalo v \\((0,0)\\) z začetno točko \\((1,0)\\) je spet nastavljeno. Formula pove, kaj izrek Hartman–Grobman zagotavlja pri hiperboličnih točkah in česa ne pove pri tistih, ki niso hiperbolične.',
            'The pendulum at \\((0,0)\\) with the start point \\((1,0)\\) is set again. The formula says what the Hartman–Grobman theorem guarantees at hyperbolic points and what it does not say at those that are not hyperbolic.',
        ),
        formulaIds: ['pp3-hartman-grobman'],
        observationPrompt: text(
            'Preizkusi vse tri sisteme in obe ravnovesni točki nihala pri povečavah od \\(0\\) do \\(4\\). Kaj se z povečavo spremeni v odčitkih Tip linearizacije in Jacobijeva matrika in kaj v vrsticah Obroč?',
            'Try all three systems and both equilibria of the pendulum at zooms from \\(0\\) to \\(4\\). What changes with the zoom in the readouts Type of the linearization and Jacobian, and what in the Ring rows?',
        ),
        expectedObservations: [text(
            'Tip linearizacije in Jacobijeva matrika se s povečavo ne spremenita (pri nihalu v \\((\\pi,0)\\): sedlo, \\(J=\\begin{pmatrix}0&1\\\\1&0\\end{pmatrix}\\) pri vseh povečavah \\(0\\) do \\(4\\)); spremeni se le pogled (polovična širina \\(4/2^{\\text{povečava}}\\)) in s tem obroč in ustavljene polovice. Pri nihalu v \\((\\pi,0)\\) je pri povečavi \\(0\\) ustavljenih \\(20\\) od \\(24\\) polovic nelinearnega obroča, pri povečavah \\(1\\) do \\(4\\) vseh \\(24\\); linearizacija ima \\(24\\) od \\(24\\) pri vseh. Pri nihalu v \\((0,0)\\) je pri povečavi \\(0\\) \\(20\\) od \\(24\\) pri nelinearnem obroču in \\(0\\) od \\(24\\) pri linearizaciji, pri povečavi \\(3\\) obakrat \\(0\\) od \\(24\\).',
            'The type of the linearization and the Jacobian do not change with the zoom (for the pendulum at \\((\\pi,0)\\): saddle, \\(J=\\begin{pmatrix}0&1\\\\1&0\\end{pmatrix}\\) at all zooms \\(0\\) to \\(4\\)); only the view changes (half-width \\(4/2^{\\text{zoom}}\\)) and with it the ring and the stopped halves. For the pendulum at \\((\\pi,0)\\) at zoom \\(0\\), \\(20\\) of \\(24\\) halves of the nonlinear ring are stopped, at zooms \\(1\\) to \\(4\\) all \\(24\\); the linearization has \\(24\\) of \\(24\\) at all. For the pendulum at \\((0,0)\\) at zoom \\(0\\) it is \\(20\\) of \\(24\\) for the nonlinear ring and \\(0\\) of \\(24\\) for the linearization, at zoom \\(3\\) both \\(0\\) of \\(24\\).',
        )],
        scene: planeScene('pp3-free-scene', PP3_FREE,
            'Nihalo v \\((0,0)\\), povečava \\(0\\), začetna točka \\((1,0)\\): središče, ni hiperbolična; sistem, ravnovesna točka, povečava in točke so prosti.',
            'The pendulum at \\((0,0)\\), zoom \\(0\\), start point \\((1,0)\\): centre, not hyperbolic; the system, the equilibrium, the zoom and the points are free.'),
    }),
];

// ---- PP4 ---------------------------------------------------------------------------------------------------------------------------

const pp4Steps: readonly GuidedLessonStep[] = [
    step({
        id: 'pp4-settles', order: 1,
        title: text('Pri \\(r=2{,}9\\) se orbita umiri', 'At \\(r=2{,}9\\) the orbit settles'),
        purpose: text('Napovedati, kam se iteracija umiri, in to preveriti z množiteljem negibne točke.', 'Predicting where the iteration settles and checking it with the multiplier of the fixed point.'),
        explanation: text(
            'Preslikava \\(f(x)=rx(1-x)\\) pri \\(r=2{,}9\\) in začetku \\(x_0=0{,}2\\) ima negibno točko \\(x^{*}=1-1/r\\). Cobweb (pajkova mreža) kaže prvih \\(20\\) korakov: od krivulje navpično, od diagonale vodoravno. Preden pogledaš odčitke, zapiši, h kateri vrednosti po tvoje gre \\(x_n\\) in ali se približuje z ene strani ali izmenično. Argument je množitelj \\(2-r=-0{,}9\\): \\(|{-0{,}9}|<1\\), zato negibna točka privlači. Cobweb je ponazoritev.',
            'The map \\(f(x)=rx(1-x)\\) at \\(r=2{,}9\\) and start \\(x_0=0{,}2\\) has the fixed point \\(x^{*}=1-1/r\\). The cobweb shows the first \\(20\\) steps: vertically to the curve, horizontally to the diagonal. Before you look at the readouts, write down which value you think \\(x_n\\) approaches and whether it approaches from one side or alternately. The argument is the multiplier \\(2-r=-0{,}9\\): \\(|{-0{,}9}|<1\\), so the fixed point attracts. The cobweb is an illustration.',
        ),
        formulaIds: ['logistic-fixed'],
        observationPrompt: text(
            'Preberi Negibna točka, Množitelj negibne točke in Perioda. Nato pritiskaj Naslednji korak ali Predvajaj do koraka \\(60\\) in preberi \\(x_{60}\\).',
            'Read Fixed point, Multiplier of the fixed point and Period. Then press Next step or Play up to step \\(60\\) and read \\(x_{60}\\).',
        ),
        expectedObservations: [text(
            'Negibna točka je \\(0{,}655172\\), množitelj \\(-0{,}9\\), perioda \\(1\\) (izračunano). Pri koraku \\(20\\) je \\(x_{20}=0{,}66383\\), pri koraku \\(60\\) pa \\(x_{60}=0{,}655302\\): vrednosti so okoli negibne točke in se ji približujejo.',
            'The fixed point is \\(0{,}655172\\), the multiplier \\(-0{,}9\\), the period \\(1\\) (computed). At step \\(20\\) we have \\(x_{20}=0{,}66383\\), and at step \\(60\\) \\(x_{60}=0{,}655302\\): the values lie around the fixed point and approach it.',
        )],
        scene: phaseScene('pp4-settles-scene', PP4_SETTLES,
            'Pri \\(r=2{,}9\\), \\(x_0=0{,}2\\) je narisanih \\(20\\) korakov, \\(x_{20}=0{,}66383\\); negibna točka \\(0{,}655172\\) z množiteljem \\(-0{,}9\\) privlači, perioda \\(1\\) (izračunano).',
            'At \\(r=2{,}9\\), \\(x_0=0{,}2\\) the \\(20\\) steps are drawn, \\(x_{20}=0{,}66383\\); the fixed point \\(0{,}655172\\) with multiplier \\(-0{,}9\\) attracts, period \\(1\\) (computed).'),
    }),
    step({
        id: 'pp4-neutral', order: 2,
        title: text('Pri \\(r=3\\) je množitelj \\(-1\\)', 'At \\(r=3\\) the multiplier is \\(-1\\)'),
        purpose: text('Napovedati, kaj se zgodi, ko je množitelj negibne točke po absolutni vrednosti natanko \\(1\\).', 'Predicting what happens when the multiplier of the fixed point has absolute value exactly \\(1\\).'),
        explanation: text(
            'Pri \\(r=3\\) je \\(f^{\\prime}(x^{*})=2-r=-1\\) natanko, torej \\(|f^{\\prime}(x^{*})|=1\\): test z odvodom ne pove ničesar. Zapiši napoved: ali bo \\(x_n\\) po \\(60\\) korakih pri negibni točki \\(x^{*}=2/3\\)? To je ponazoritev, odgovor v odčitkih je izračunan, ni dokaz.',
            'At \\(r=3\\) we have \\(f^{\\prime}(x^{*})=2-r=-1\\) exactly, so \\(|f^{\\prime}(x^{*})|=1\\): the derivative test says nothing. Write down a prediction: will \\(x_n\\) be at the fixed point \\(x^{*}=2/3\\) after \\(60\\) steps? This is an illustration; the answer in the readouts is computed, not a proof.',
        ),
        formulaIds: ['logistic-fixed'],
        observationPrompt: text(
            'Preberi Množitelj negibne točke in Perioda. Pritiskaj Naslednji korak do koraka \\(60\\) in primerjaj \\(x_{60}\\) z negibno točko.',
            'Read Multiplier of the fixed point and Period. Press Next step up to step \\(60\\) and compare \\(x_{60}\\) with the fixed point.',
        ),
        expectedObservations: [text(
            'Množitelj je \\(-1\\) in odčitek Perioda pravi, da do \\(64\\) ni najdena (izračunano). Pri koraku \\(20\\) je \\(x_{20}=0{,}709631\\), pri koraku \\(60\\) pa \\(x_{60}=0{,}694147\\), še vedno ne pri negibni točki \\(0{,}666667\\): v teh \\(60\\) korakih je približevanje počasno.',
            'The multiplier is \\(-1\\) and the readout Period says none was found up to \\(64\\) (computed). At step \\(20\\) we have \\(x_{20}=0{,}709631\\), and at step \\(60\\) \\(x_{60}=0{,}694147\\), still not at the fixed point \\(0{,}666667\\): within these \\(60\\) steps the approach is slow.',
        )],
        scene: phaseScene('pp4-neutral-scene', PP4_NEUTRAL,
            'Pri \\(r=3\\), \\(x_0=0{,}2\\) je narisanih \\(20\\) korakov, \\(x_{20}=0{,}709631\\); množitelj negibne točke \\(0{,}666667\\) je natanko \\(-1\\), perioda ni najdena do \\(64\\).',
            'At \\(r=3\\), \\(x_0=0{,}2\\) the \\(20\\) steps are drawn, \\(x_{20}=0{,}709631\\); the multiplier of the fixed point \\(0{,}666667\\) is exactly \\(-1\\), no period found up to \\(64\\).'),
    }),
    step({
        id: 'pp4-two-cycle', order: 3,
        title: text('Pri \\(r=3{,}1\\) nastane dvocikel', 'At \\(r=3{,}1\\) a 2-cycle appears'),
        purpose: text('Napovedati, kaj se zgodi z orbito, ko negibna točka odbija, in izračunati dvocikel.', 'Predicting what the orbit does once the fixed point repels, and computing the 2-cycle.'),
        explanation: text(
            'Pri \\(r=3{,}1\\) je množitelj negibne točke \\(2-r=-1{,}1\\), torej \\(|{-1{,}1}|>1\\) in negibna točka odbija. Zapiši napoved: kam gre orbita zdaj? Argument: enačba \\(f(f(x))=x\\) ima poleg negibne točke še dve rešitvi, \\(x_1\\) in \\(x_2\\), s \\(f(x_1)=x_2\\) in \\(f(x_2)=x_1\\), množitelj te dvojice pa je \\(m=4+2r-r^{2}=0{,}59\\), torej \\(|m|<1\\) in dvocikel privlači. Točno to pokaže račun v zgledu; cobweb je le ponazoritev.',
            'At \\(r=3{,}1\\) the multiplier of the fixed point is \\(2-r=-1{,}1\\), so \\(|{-1{,}1}|>1\\) and the fixed point repels. Write down a prediction: where does the orbit go now? Argument: the equation \\(f(f(x))=x\\) has two more solutions besides the fixed point, \\(x_1\\) and \\(x_2\\), with \\(f(x_1)=x_2\\) and \\(f(x_2)=x_1\\), and the multiplier of this pair is \\(m=4+2r-r^{2}=0{,}59\\), so \\(|m|<1\\) and the 2-cycle attracts. The computation in the example shows exactly this; the cobweb is only an illustration.',
        ),
        formulaIds: ['logistic-two-cycle'],
        workedExampleId: 'pp4-two-cycle',
        observationPrompt: text(
            'Preberi Dvocikel, Množitelj dvocikla in Perioda; nato enkrat pritisni Naslednji korak in primerjaj \\(x_{60}\\) z \\(x_{59}\\).',
            'Read 2-cycle, Multiplier of the 2-cycle and Period; then press Next step once and compare \\(x_{60}\\) with \\(x_{59}\\).',
        ),
        expectedObservations: [text(
            'Dvocikel je \\(0{,}558014\\leftrightarrow0{,}764567\\) z množiteljem \\(0{,}59\\), negibna točka \\(0{,}677419\\) odbija (\\(-1{,}1\\)), perioda \\(2\\) (izračunano). Pri koraku \\(59\\) je \\(x_{59}=0{,}558014\\), pri koraku \\(60\\) pa \\(x_{60}=0{,}764567\\): orbita izmenično obiskuje obe točki dvocikla.',
            'The 2-cycle is \\(0{,}558014\\leftrightarrow0{,}764567\\) with multiplier \\(0{,}59\\), the fixed point \\(0{,}677419\\) repels (\\(-1{,}1\\)), period \\(2\\) (computed). At step \\(59\\) we have \\(x_{59}=0{,}558014\\) and at step \\(60\\) \\(x_{60}=0{,}764567\\): the orbit visits the two points of the 2-cycle in turn.',
        )],
        scene: phaseScene('pp4-two-cycle-scene', PP4_TWO_CYCLE,
            'Pri \\(r=3{,}1\\), \\(x_0=0{,}2\\) je narisanih \\(59\\) korakov, \\(x_{59}=0{,}558014\\); dvocikel \\(0{,}558014\\leftrightarrow0{,}764567\\) z množiteljem \\(0{,}59\\) privlači, negibna točka \\(0{,}677419\\) odbija.',
            'At \\(r=3{,}1\\), \\(x_0=0{,}2\\) the \\(59\\) steps are drawn, \\(x_{59}=0{,}558014\\); the 2-cycle \\(0{,}558014\\leftrightarrow0{,}764567\\) with multiplier \\(0{,}59\\) attracts, the fixed point \\(0{,}677419\\) repels.'),
    }),
    step({
        id: 'pp4-four-cycle', order: 4,
        title: text('Dvocikel odpove: štiricikel', 'The 2-cycle fails: a 4-cycle'),
        purpose: text('Napovedati, kdaj dvocikel preneha privlačiti, in prebrati štiri vrednosti, ki se ponavljajo.', 'Predicting when the 2-cycle stops attracting and reading the four values that repeat.'),
        explanation: text(
            'Množitelj dvocikla \\(m=4+2r-r^{2}\\) pade pod \\(-1\\) pri \\(r=1+\\sqrt6\\approx3{,}449490\\) (točno: \\(m=-1\\) natanko tedaj); za \\(r\\) med \\(1+\\sqrt6\\) in \\(4\\) dvocikel odbija. Na primer pri \\(r=3{,}5\\) je \\(m=-1{,}25\\). Zapiši napoved, kaj orbita stori zdaj. Kaj stori orbita, graf izračuna: perioda \\(4\\) je izračunana (toleranca \\(10^{-9}\\)), ne točna.',
            'The multiplier of the 2-cycle \\(m=4+2r-r^{2}\\) falls below \\(-1\\) at \\(r=1+\\sqrt6\\approx3{,}449490\\) (exactly: \\(m=-1\\) precisely then); for \\(r\\) between \\(1+\\sqrt6\\) and \\(4\\) the 2-cycle repels. For example at \\(r=3{,}5\\) we have \\(m=-1{,}25\\). Write down a prediction of what the orbit does now. What the orbit does is computed by the graph: the period \\(4\\) is computed (tolerance \\(10^{-9}\\)), not exact.',
        ),
        formulaIds: ['logistic-two-cycle'],
        observationPrompt: text(
            'Pritisni Naslednji korak štirikrat in zapiši \\(x_{57}\\) do \\(x_{60}\\); primerjaj \\(x_{60}\\) z \\(x_{56}\\). Nato v polje Parameter r vpiši \\(3{,}46\\) in preberi Množitelj dvocikla in Perioda.',
            'Press Next step four times and write down \\(x_{57}\\) to \\(x_{60}\\); compare \\(x_{60}\\) with \\(x_{56}\\). Then type \\(3{,}46\\) in the field Parameter r and read Multiplier of the 2-cycle and Period.',
        ),
        expectedObservations: [text(
            'Pri \\(r=3{,}5\\) je \\(x_{56}=0{,}826941\\), nato \\(x_{57}=0{,}500884\\), \\(x_{58}=0{,}874997\\), \\(x_{59}=0{,}38282\\), \\(x_{60}=0{,}826941\\): štiri vrednosti se ponavljajo, perioda \\(4\\) (izračunano), množitelj dvocikla \\(-1{,}25\\). Pri \\(r=3{,}46\\) je množitelj dvocikla \\(-1{,}0516\\) in perioda \\(4\\) (izračunano).',
            'At \\(r=3{,}5\\) we have \\(x_{56}=0{,}826941\\), then \\(x_{57}=0{,}500884\\), \\(x_{58}=0{,}874997\\), \\(x_{59}=0{,}38282\\), \\(x_{60}=0{,}826941\\): four values repeat, period \\(4\\) (computed), multiplier of the 2-cycle \\(-1{,}25\\). At \\(r=3{,}46\\) the multiplier of the 2-cycle is \\(-1{,}0516\\) and the period \\(4\\) (computed).',
        )],
        scene: phaseScene('pp4-four-cycle-scene', PP4_FOUR_CYCLE,
            'Pri \\(r=3{,}5\\), \\(x_0=0{,}2\\) je narisanih \\(56\\) korakov, \\(x_{56}=0{,}826941\\); množitelj dvocikla \\(-1{,}25\\), perioda \\(4\\) (izračunano).',
            'At \\(r=3{,}5\\), \\(x_0=0{,}2\\) the \\(56\\) steps are drawn, \\(x_{56}=0{,}826941\\); multiplier of the 2-cycle \\(-1{,}25\\), period \\(4\\) (computed).'),
    }),
    step({
        id: 'pp4-eight-cycle', order: 5,
        title: text('Perioda \\(8\\) in naprej', 'Period \\(8\\) and beyond'),
        purpose: text('Napovedati, kje se perioda spet podvoji, in videti, da se to ponavlja.', 'Predicting where the period doubles again and seeing that it keeps happening.'),
        explanation: text(
            'Perioda \\(2\\), \\(4\\), \\(8\\), \\(16\\)... se podvaja, vsakič pri manjšem prirastku \\(r\\). Pri \\(r=3{,}55\\) pokaže odčitek periodo \\(8\\) (izračunano). Zapiši napoved: pri katerem \\(r\\) med \\(3{,}54\\) in \\(3{,}55\\) se je perioda \\(4\\) spremenila v \\(8\\)? Odčitki so le računski; po koraku \\(60\\) se osem vrednosti še ne ujema na šest decimalk.',
            'The period \\(2\\), \\(4\\), \\(8\\), \\(16\\)... keeps doubling, each time over a smaller increase of \\(r\\). At \\(r=3{,}55\\) the readout shows period \\(8\\) (computed). Write down a prediction: at which \\(r\\) between \\(3{,}54\\) and \\(3{,}55\\) did the period \\(4\\) change to \\(8\\)? The readouts are only computed; after step \\(60\\) the eight values do not yet agree to six decimals.',
        ),
        formulaIds: [],
        observationPrompt: text(
            'V polje Parameter r vpiši \\(3{,}54\\) in preberi Perioda, nato \\(3{,}55\\), nato \\(3{,}57\\) in preberi Perioda in Opomba. Pri \\(3{,}55\\) primerjaj \\(x_{52}\\) in \\(x_{60}\\).',
            'In the field Parameter r type \\(3{,}54\\) and read Period, then \\(3{,}55\\), then \\(3{,}57\\) and read Period and Note. At \\(3{,}55\\) compare \\(x_{52}\\) and \\(x_{60}\\).',
        ),
        expectedObservations: [text(
            'Pri \\(3{,}54\\) je perioda \\(4\\), pri \\(3{,}55\\) je \\(8\\) (obe izračunani). Pri \\(3{,}55\\) je \\(x_{52}=0{,}812682\\) in \\(x_{60}=0{,}812668\\), razlika je okoli \\(1{,}4\\cdot10^{-5}\\). Pri \\(3{,}57\\), večjem od \\(3{,}56995\\), odčitek Perioda ne trdi ničesar.',
            'At \\(3{,}54\\) the period is \\(4\\), at \\(3{,}55\\) it is \\(8\\) (both computed). At \\(3{,}55\\) we have \\(x_{52}=0{,}812682\\) and \\(x_{60}=0{,}812668\\), a difference of about \\(1{,}4\\cdot10^{-5}\\). At \\(3{,}57\\), larger than \\(3{,}56995\\), the readout Period makes no claim.',
        )],
        scene: phaseScene('pp4-eight-cycle-scene', PP4_EIGHT_CYCLE,
            'Pri \\(r=3{,}55\\), \\(x_0=0{,}2\\) je narisanih \\(52\\) korakov, \\(x_{52}=0{,}812682\\); perioda \\(8\\) (izračunano).',
            'At \\(r=3{,}55\\), \\(x_0=0{,}2\\) the \\(52\\) steps are drawn, \\(x_{52}=0{,}812682\\); period \\(8\\) (computed).'),
    }),
    step({
        id: 'pp4-chaos', order: 6,
        title: text('Pri \\(r=4\\) se bližnja začetka razmakneta', 'At \\(r=4\\) two close starts separate'),
        purpose: text('Napovedati, kaj se zgodi z dvema skoraj enakima začetkoma, in poznati mejo računskih orbit.', 'Predicting what happens to two almost equal starts and knowing the limit of computed orbits.'),
        explanation: text(
            'Pri \\(r=4\\) odčitek Perioda ne trdi nič, ker je \\(r\\) večji od \\(3{,}56995\\), in tudi dvocikel in negibna točka ne privlačita (množitelja \\(-4\\) in \\(-2\\)). Zapiši napoved: kako se po petih korakih razlikujeta orbiti z začetkoma \\(0{,}2\\) in \\(0{,}21\\)? Graf pozna le začetke na mreži \\(0{,}01\\): začetka, ki bi bila \\(10^{-10}\\) narazen, ne moreš nastaviti, zato ta par sam še ne pokaže občutljive odvisnosti od začetka. Računske vrednosti so dvojna natančnost: graf pravi, da so pri \\(r=4\\) po približno \\(50\\) korakih dolge orbite zaradi končne natančnosti nezanesljive, zato \\(x_{60}\\) ni zanesljivo število.',
            'At \\(r=4\\) the readout Period claims nothing, since \\(r\\) is larger than \\(3{,}56995\\), and neither the 2-cycle nor the fixed point attracts (multipliers \\(-4\\) and \\(-2\\)). Write down a prediction: how do the orbits with starts \\(0{,}2\\) and \\(0{,}21\\) differ after five steps? The graph only knows starts on the grid \\(0{,}01\\): starts \\(10^{-10}\\) apart cannot be set, so this pair alone does not yet show sensitive dependence on the start. The computed values are in double precision: the graph says that at \\(r=4\\) long orbits are unreliable after about \\(50\\) steps because of finite precision, so \\(x_{60}\\) is not a reliable number.',
        ),
        formulaIds: [],
        observationPrompt: text(
            'Preberi \\(x_5\\), nato v polje Začetek \\(x_0\\) vpiši \\(0{,}21\\) in spet preberi \\(x_5\\) (število narisanih korakov se pri spremembi začetka ohrani). Pritisni Ponastavi, dvakrat pritisni Naslednji korak in preberi \\(x_1\\) in \\(x_2\\); nato spet vpiši \\(0{,}2\\) in ju preberi še za ta začetek.',
            'Read \\(x_5\\), then type \\(0{,}21\\) in the field Start \\(x_0\\) and read \\(x_5\\) again (the number of drawn steps is kept when the start changes). Press Reset, press Next step twice and read \\(x_1\\) and \\(x_2\\); then type \\(0{,}2\\) again and read them for that start too.',
        ),
        expectedObservations: [text(
            'Pri začetku \\(0{,}2\\) je \\(x_5=0{,}585421\\), pri \\(0{,}21\\) je \\(x_5=0{,}209062\\): razlika je okoli \\(0{,}38\\), čeprav sta začetka \\(0{,}01\\) narazen. Za začetka \\(0{,}2\\) in \\(0{,}21\\) je \\(x_1=0{,}64\\) in \\(0{,}6636\\), \\(x_2=0{,}9216\\) in \\(0{,}89294\\). To velja za ta dva začetka: razlika ne naraste pri vsakem koraku (pri \\(x_8\\) sta \\(0{,}401974\\) in \\(0{,}37345\\)).',
            'With start \\(0{,}2\\) we have \\(x_5=0{,}585421\\), with \\(0{,}21\\) we have \\(x_5=0{,}209062\\): the difference is about \\(0{,}38\\), although the starts are \\(0{,}01\\) apart. For the starts \\(0{,}2\\) and \\(0{,}21\\) we have \\(x_1=0{,}64\\) and \\(0{,}6636\\), \\(x_2=0{,}9216\\) and \\(0{,}89294\\). This holds for these two starts: the difference does not grow at every step (at \\(x_8\\) they are \\(0{,}401974\\) and \\(0{,}37345\\)).',
        )],
        scene: phaseScene('pp4-chaos-scene', PP4_CHAOS,
            'Pri \\(r=4\\), \\(x_0=0{,}2\\) je narisanih \\(5\\) korakov, \\(x_5=0{,}585421\\); odčitek Perioda ne trdi ničesar, množitelja \\(-2\\) in \\(-4\\).',
            'At \\(r=4\\), \\(x_0=0{,}2\\) the \\(5\\) steps are drawn, \\(x_5=0{,}585421\\); the readout Period claims nothing, multipliers \\(-2\\) and \\(-4\\).'),
    }),
    step({
        id: 'pp4-free', order: 7,
        title: text('Prosto raziskovanje', 'Free exploration'),
        purpose: text('Samostojno poiskati, kje se obnašanje orbite spremeni, in ločiti točno od izračunanega.', 'Finding on your own where the behaviour of the orbit changes and telling exact from computed.'),
        explanation: text(
            'Zdaj raziskuj sam. Spreminjaj \\(r\\) in začetek, narisano število korakov pa z Naslednji korak ali Predvajaj. Preberi Perioda pri \\(r=3{,}55\\), \\(3{,}56\\) in \\(3{,}57\\), poišči največji \\(r\\) na mreži \\(0{,}01\\), pri katerem odčitek še pokaže število, in razloži, zakaj se \\(16\\) na tej mreži nikoli ne pojavi. Ločuj: vrsta negibne točke in dvocikla je točna, perioda in vrednosti \\(x_n\\) so izračunane.',
            'Now explore on your own. Change \\(r\\) and the start, and the number of drawn steps with Next step or Play. Read Period at \\(r=3{,}55\\), \\(3{,}56\\) and \\(3{,}57\\), find the largest \\(r\\) on the grid \\(0{,}01\\) at which the readout still shows a number, and explain why \\(16\\) never appears on this grid. Keep apart: the kind of the fixed point and of the 2-cycle is exact, the period and the values \\(x_n\\) are computed.',
        ),
        formulaIds: [],
        observationPrompt: text(
            'V polje Parameter r vpiši \\(3{,}55\\), \\(3{,}56\\) in \\(3{,}57\\) in vsakič preberi Perioda in Opomba; zapiši, kaj je točno in kaj izračunano ter zakaj se \\(16\\) ne pojavi.',
            'In the field Parameter r type \\(3{,}55\\), \\(3{,}56\\) and \\(3{,}57\\) and each time read Period and Note; write down what is exact and what is computed and why \\(16\\) does not appear.',
        ),
        expectedObservations: [text(
            'Pri \\(3{,}55\\) in \\(3{,}56\\) je perioda \\(8\\), pri \\(3{,}57\\) odčitek Perioda ne trdi ničesar: največji \\(r\\) na mreži s številom je \\(3{,}56\\). Perioda \\(16\\) se začne pri \\(r_4\\approx3{,}564407\\), med mrežnima točkama \\(3{,}56\\) in \\(3{,}57\\), zato je na tej mreži ne vidiš. Vrsta negibne točke in dvocikla je točna, perioda in vrednosti \\(x_n\\) so izračunane.',
            'At \\(3{,}55\\) and \\(3{,}56\\) the period is \\(8\\), at \\(3{,}57\\) the readout Period claims nothing: the largest \\(r\\) on the grid with a number is \\(3{,}56\\). The period \\(16\\) begins at \\(r_4\\approx3{,}564407\\), between the grid points \\(3{,}56\\) and \\(3{,}57\\), so you do not see it on this grid. The kind of the fixed point and of the 2-cycle is exact, the period and the values \\(x_n\\) are computed.',
        )],
        scene: phaseScene('pp4-free-scene', PP4_FREE,
            'Pri \\(r=3{,}5\\), \\(x_0=0{,}2\\) ni narisanega nobenega koraka; perioda \\(4\\) (izračunano); \\(r\\) in začetek sta prosta.',
            'At \\(r=3{,}5\\), \\(x_0=0{,}2\\) no step is drawn; period \\(4\\) (computed); \\(r\\) and the start are free.'),
    }),
];

// ---- PP5 ---------------------------------------------------------------------------------------------------------------------------

const pp5Steps: readonly GuidedLessonStep[] = [
    step({
        id: 'pp5-branch', order: 1,
        title: text('Ena veja', 'A single branch'),
        purpose: text('Povezati dolgoročno vrednost \\(x\\) v diagramu z negibno točko in kazalec z \\(r\\).', 'Connecting the long-run value of \\(x\\) in the diagram with the fixed point and the cursor with \\(r\\).'),
        explanation: text(
            'Bifurkacijski diagram kaže dolgoročne vrednosti \\(x\\) za vsak \\(r\\) od \\(2{,}5\\) do \\(4\\): za vsak \\(r\\) odstranimo začetne korake in narišemo, kje orbita potem leži. Kazalec stoji pri stolpcu diagrama, ki je najbližji \\(r\\), in odčitek navede \\(r\\) tega stolpca, ne vpisanega \\(r\\). Zapiši napoved: na kateri višini je veja pri \\(r=2{,}9\\)? Diagram je ponazoritev, izračunana z dvojno natančnostjo.',
            'The bifurcation diagram shows the long-run values of \\(x\\) for each \\(r\\) from \\(2{,}5\\) to \\(4\\): for each \\(r\\) the first steps are dropped and where the orbit lies afterwards is drawn. The cursor stands at the diagram column nearest to \\(r\\), and the readout gives the \\(r\\) of that column, not the typed \\(r\\). Write down a prediction: at what height is the branch at \\(r=2{,}9\\)? The diagram is an illustration, computed in double precision.',
        ),
        formulaIds: ['logistic-fixed'],
        observationPrompt: text(
            'Preberi Negibna točka in Stolpec diagrama pri kazalcu ter primerjaj višino kazalca na veji z negibno točko.',
            'Read Fixed point and Diagram column at the cursor and compare the height of the cursor on the branch with the fixed point.',
        ),
        expectedObservations: [text(
            'Negibna točka je \\(0{,}655172\\), perioda \\(1\\) (izračunano); kazalec stoji pri stolpcu \\(r=2{,}8985\\) (stolpec \\(107\\) od \\(400\\)), ne pri \\(2{,}9\\).',
            'The fixed point is \\(0{,}655172\\), the period \\(1\\) (computed); the cursor stands at the column \\(r=2{,}8985\\) (column \\(107\\) of \\(400\\)), not at \\(2{,}9\\).',
        )],
        scene: phaseScene('pp5-branch-scene', PP5_BRANCH,
            'Pri \\(r=2{,}9\\) kazalec stoji pri stolpcu \\(r=2{,}8985\\) na eni veji; negibna točka \\(0{,}655172\\), perioda \\(1\\) (izračunano).',
            'At \\(r=2{,}9\\) the cursor stands at the column \\(r=2{,}8985\\) on a single branch; the fixed point \\(0{,}655172\\), period \\(1\\) (computed).'),
    }),
    step({
        id: 'pp5-first-split', order: 2,
        title: text('Prvi razcep pri \\(r=3\\)', 'The first split at \\(r=3\\)'),
        purpose: text('Napovedati, kaj naredi veja po razcepu, in prebrati obe novi vrednosti.', 'Predicting what the branch does after the split and reading the two new values.'),
        explanation: text(
            'Črtkana navpična oznaka pri \\(r=3\\) je točna: tam je množitelj negibne točke \\(2-r=-1\\). Zapiši napoved: ali se veja za oznako nadaljuje, ali se razcepi, in kam gre vsaka nova veja? Argument za razcep je račun dvocikla iz zgleda PP4: za \\(r>3\\) ima \\(f(f(x))=x\\) še dve rešitvi.',
            'The dashed vertical mark at \\(r=3\\) is exact: there the multiplier of the fixed point is \\(2-r=-1\\). Write down a prediction: does the branch continue past the mark or does it split, and where does each new branch go? The argument for the split is the 2-cycle computation of PP4: for \\(r>3\\) the equation \\(f(f(x))=x\\) has two more solutions.',
        ),
        formulaIds: ['logistic-two-cycle'],
        observationPrompt: text(
            'V polje Parameter r vpiši \\(3{,}1\\) in preberi Dvocikel, Perioda in Stolpec diagrama pri kazalcu; kazalec stoji na dveh vejah.',
            'Type \\(3{,}1\\) in the field Parameter r and read 2-cycle, Period and Diagram column at the cursor; the cursor stands on two branches.',
        ),
        expectedObservations: [text(
            'Pri \\(r=3\\) je množitelj \\(-1\\), stolpec \\(r=3\\) in perioda ni najdena do \\(64\\) (izračunano). Pri \\(r=3{,}1\\) je dvocikel \\(0{,}558014\\leftrightarrow0{,}764567\\), perioda \\(2\\) (izračunano), stolpec \\(r=3{,}1015\\): dve veji.',
            'At \\(r=3\\) the multiplier is \\(-1\\), the column is \\(r=3\\) and no period is found up to \\(64\\) (computed). At \\(r=3{,}1\\) the 2-cycle is \\(0{,}558014\\leftrightarrow0{,}764567\\), period \\(2\\) (computed), column \\(r=3{,}1015\\): two branches.',
        )],
        scene: phaseScene('pp5-first-split-scene', PP5_FIRST_SPLIT,
            'Pri \\(r=3\\) kazalec stoji natanko na oznaki prvega razcepa; množitelj negibne točke \\(-1\\), stolpec \\(r=3\\).',
            'At \\(r=3\\) the cursor stands exactly on the mark of the first split; multiplier of the fixed point \\(-1\\), column \\(r=3\\).'),
    }),
    step({
        id: 'pp5-faster', order: 3,
        title: text('Razcepi so vedno bližje', 'The splits come faster'),
        purpose: text('Napovedati, kje je drugi razcep, in primerjati razmake med razcepi.', 'Predicting where the second split is and comparing the gaps between splits.'),
        explanation: text(
            'Drugi razcep je pri \\(r=1+\\sqrt6\\approx3{,}449490\\), kjer je množitelj dvocikla natanko \\(-1\\) (točno). Zapiši napoved, ali sta pri \\(r=3{,}44\\) in \\(3{,}45\\) še dve veji ali že štiri. Razmaki med razcepi se krčijo: razmerji sta približno \\(4{,}75\\) in \\(4{,}66\\), \\(r_3\\) in \\(r_4\\) pa sta številska, izračunana zunaj aplikacije. Diagram je ponazoritev; razmerja ne dokazujejo mejne vrednosti.',
            'The second split is at \\(r=1+\\sqrt6\\approx3{,}449490\\), where the multiplier of the 2-cycle is exactly \\(-1\\) (exact). Write down a prediction whether at \\(r=3{,}44\\) and \\(3{,}45\\) there are still two branches or already four. The gaps between splits shrink: the ratios are about \\(4{,}75\\) and \\(4{,}66\\), and \\(r_3\\) and \\(r_4\\) are numerical, computed outside the app. The diagram is an illustration; the ratios do not prove the limit.',
        ),
        formulaIds: ['logistic-doublings'],
        workedExampleId: 'pp5-ratios',
        observationPrompt: text(
            'V polje Parameter r vpiši \\(3{,}44\\) in preberi Množitelj dvocikla in Perioda; nato \\(3{,}45\\) in preberi isto.',
            'Type \\(3{,}44\\) in the field Parameter r and read Multiplier of the 2-cycle and Period; then \\(3{,}45\\) and read the same.',
        ),
        expectedObservations: [text(
            'Pri \\(3{,}44\\) je množitelj dvocikla \\(-0{,}9536\\), perioda \\(2\\), stolpec \\(r=3{,}4398\\); pri \\(3{,}45\\) je \\(-1{,}0025\\), perioda \\(4\\), stolpec \\(r=3{,}4511\\) (perioda je izračunana). Število \\(1+\\sqrt6\\) leži med \\(3{,}44\\) in \\(3{,}45\\).',
            'At \\(3{,}44\\) the multiplier of the 2-cycle is \\(-0{,}9536\\), the period \\(2\\), the column \\(r=3{,}4398\\); at \\(3{,}45\\) it is \\(-1{,}0025\\), the period \\(4\\), the column \\(r=3{,}4511\\) (the period is computed). The number \\(1+\\sqrt6\\) lies between \\(3{,}44\\) and \\(3{,}45\\).',
        )],
        scene: phaseScene('pp5-faster-scene', PP5_FASTER,
            'Pri \\(r=3{,}45\\) je množitelj dvocikla \\(-1{,}0025\\), perioda \\(4\\) (izračunano), stolpec \\(r=3{,}4511\\); oznaka \\(1+\\sqrt6\\) je tik pred kazalcem.',
            'At \\(r=3{,}45\\) the multiplier of the 2-cycle is \\(-1{,}0025\\), the period \\(4\\) (computed), the column \\(r=3{,}4511\\); the mark \\(1+\\sqrt6\\) is just before the cursor.'),
    }),
    step({
        id: 'pp5-window', order: 4,
        title: text('Kaotični pas in okno', 'The chaotic band and a window'),
        purpose: text('Napovedati, ali ima kaotični pas povsod enak videz, in prebrati okno v enem primeru.', 'Predicting whether the chaotic band looks the same everywhere and reading a window in one case.'),
        explanation: text(
            'Za \\(r\\) nad \\(3{,}56995\\) (navedeno, ne izračunano v aplikaciji) graf periode ne trdi več, v diagramu pa so svetle proge, okna. Zapiši napoved: kaj pokažejo zadnji koraki pri \\(r=3{,}83\\) in kaj pri \\(r=3{,}82\\)? To je opis ene slike, ne dokaz o intervalu \\(r\\): pri \\(r=3{,}83\\) in začetku \\(0{,}2\\) preberemo, kaj se ponavlja.',
            'For \\(r\\) above \\(3{,}56995\\) (cited, not computed in the app) the graph no longer claims periods, and in the diagram there are light strips, windows. Write down a prediction: what do the last steps show at \\(r=3{,}83\\) and what at \\(r=3{,}82\\)? This describes one picture, not a statement about an interval of \\(r\\): at \\(r=3{,}83\\) and start \\(0{,}2\\) we read what repeats.',
        ),
        formulaIds: [],
        observationPrompt: text(
            'Pritisni Naslednji korak šestkrat in zapiši \\(x_{54}\\) do \\(x_{60}\\). Nato vpiši začetek \\(0{,}8\\) in preberi \\(x_{60}\\). Potem vpiši \\(r=3{,}82\\), spet začetek \\(0{,}2\\), in preberi \\(x_{57}\\) in \\(x_{60}\\).',
            'Press Next step six times and write down \\(x_{54}\\) to \\(x_{60}\\). Then type the start \\(0{,}8\\) and read \\(x_{60}\\). Then type \\(r=3{,}82\\) and the start \\(0{,}2\\) again and read \\(x_{57}\\) and \\(x_{60}\\).',
        ),
        expectedObservations: [text(
            'Pri \\(r=3{,}83\\), začetku \\(0{,}2\\) se tri vrednosti ponavljajo: \\(x_{54}=x_{57}=x_{60}=0{,}504667\\), \\(x_{55}=x_{58}=0{,}957417\\), \\(x_{56}=x_{59}=0{,}156149\\); pri začetku \\(0{,}8\\) je spet \\(x_{60}=0{,}504667\\). Pri \\(r=3{,}82\\) je \\(x_{57}=0{,}8626\\) in \\(x_{60}=0{,}193532\\): v teh korakih se nič ne ponovi. Odčitek Perioda ne trdi ničesar; periodo \\(3\\) bi bilo treba računsko preveriti zunaj tega odčitka.',
            'At \\(r=3{,}83\\), start \\(0{,}2\\) three values repeat: \\(x_{54}=x_{57}=x_{60}=0{,}504667\\), \\(x_{55}=x_{58}=0{,}957417\\), \\(x_{56}=x_{59}=0{,}156149\\); with the start \\(0{,}8\\) again \\(x_{60}=0{,}504667\\). At \\(r=3{,}82\\) we have \\(x_{57}=0{,}8626\\) and \\(x_{60}=0{,}193532\\): in these steps nothing repeats. The readout Period claims nothing; a period \\(3\\) would have to be checked computationally outside this readout.',
        )],
        scene: phaseScene('pp5-window-scene', PP5_WINDOW,
            'Pri \\(r=3{,}83\\), \\(x_0=0{,}2\\) je narisanih \\(54\\) korakov, \\(x_{54}=0{,}504667\\); odčitek Perioda ne trdi ničesar.',
            'At \\(r=3{,}83\\), \\(x_0=0{,}2\\) the \\(54\\) steps are drawn, \\(x_{54}=0{,}504667\\); the readout Period claims nothing.'),
    }),
    step({
        id: 'pp5-free', order: 5,
        title: text('Prosto raziskovanje', 'Free exploration'),
        purpose: text('Samostojno sprehoditi \\(r\\) po diagramu in ločiti točno od izračunanega.', 'Walking \\(r\\) along the diagram on your own and telling exact from computed.'),
        explanation: text(
            'Zdaj raziskuj sam: premikaj \\(r\\) po celotnem diagramu, pritiskaj Naslednji korak in opazuj, kje kazalec stoji na eni, dveh, štirih vejah in kje ob svetlih progah. Zapiši, katere trditve v odčitkih so točne (vrsta negibne točke in dvocikla, oznaki \\(3\\) in \\(1+\\sqrt6\\)) in katere izračunane (perioda od \\(4\\) naprej, vrednosti \\(x_n\\), celoten diagram).',
            'Now explore on your own: move \\(r\\) along the whole diagram, press Next step and watch where the cursor stands on one, two, four branches and where beside the light strips. Write down which statements in the readouts are exact (the kind of the fixed point and of the 2-cycle, the marks \\(3\\) and \\(1+\\sqrt6\\)) and which are computed (the period from \\(4\\) on, the values \\(x_n\\), the whole diagram).',
        ),
        formulaIds: [],
        observationPrompt: text(
            'Poišči \\(r\\), pri katerem kazalec stoji na štirih vejah, in \\(r\\), pri katerem odčitek Perioda ne trdi ničesar; zapiši oba stolpca \\(r\\).',
            'Find an \\(r\\) at which the cursor stands on four branches and an \\(r\\) at which the readout Period claims nothing; write down both column values of \\(r\\).',
        ),
        expectedObservations: [text(
            'Štiri veje so pri \\(r=3{,}5\\) (perioda \\(4\\), izračunano); pri \\(r=3{,}9\\) odčitek Perioda ne trdi ničesar, stolpec je \\(r=3{,}8985\\).',
            'Four branches occur at \\(r=3{,}5\\) (period \\(4\\), computed); at \\(r=3{,}9\\) the readout Period claims nothing, the column is \\(r=3{,}8985\\).',
        )],
        scene: phaseScene('pp5-free-scene', PP5_FREE,
            'Pri \\(r=3{,}9\\), \\(x_0=0{,}2\\) ni narisanega nobenega koraka; odčitek Perioda ne trdi ničesar, stolpec \\(r=3{,}8985\\); \\(r\\) in začetek sta prosta.',
            'At \\(r=3{,}9\\), \\(x_0=0{,}2\\) no step is drawn; the readout Period claims nothing, the column \\(r=3{,}8985\\); \\(r\\) and the start are free.'),
    }),
];

// ---- The lessons -------------------------------------------------------------------------------------------------------------------

const sources: GuidedLesson['sources'] = [
    {
        id: 'bezeg-phase-implementation',
        citation: 'Bezeg source: src/dynamics/logistic.ts (the exact fixed-point and 2-cycle tests, the period detector), src/dynamics/bifurcation.ts (the raster) and src/graphs/dynamics/LogisticMapGraph.tsx.',
        implementationCorrespondence: 'A scene sets r, the start and the number of drawn cobweb steps of the logistic-map graph; the fixed point, the 2-cycle and their multipliers are exact, the periods and orbit values are computed in double precision with a stated tolerance, the diagram is a precomputed raster drawn once, and for r past 3,56995 the graph makes no period claim. The cobweb and the diagram illustrate the multiplier arguments; they are not proofs.',
    },
];

const edgeCasesOf = (extra: readonly LocalizedText[]): readonly LocalizedText[] => [
    text('Pri \\(r\\) nad \\(3{,}56995\\) graf periode ne trdi; vrednosti \\(x_n\\) so izračunane v dvojni natančnosti in pri \\(r=4\\) po približno \\(50\\) korakih ne ustrezajo več pravi orbiti.',
        'For \\(r\\) above \\(3{,}56995\\) the graph claims no period; the values \\(x_n\\) are computed in double precision and at \\(r=4\\) after about \\(50\\) steps they no longer match the true orbit.'),
    text('\\(r\\) in začetek sta na mreži \\(0{,}01\\); vrednosti zunaj nje graf zavrne.', '\\(r\\) and the start are on the grid \\(0{,}01\\); the graph refuses values outside it.'),
    ...extra,
];

const planeSources: GuidedLesson['sources'] = [
    {
        id: 'bezeg-phase-plane-implementation',
        citation: 'Bezeg source: src/dynamics/classify2.ts (the exact type test), rk4.ts, systems2.ts, phaseModel.ts and src/graphs/dynamics/PhasePortraitGraph.tsx; FMF Analiza 3 and Mehanika 1 (cited, not opened).',
        implementationCorrespondence: 'A scene sets the system, the matrix entries and the seeds of the phase-portrait graph; the type, trace, determinant, discriminant and the energy comparison with 1 are exact tests, the orbits are RK4 (step 0,02) computed for 10 s and are illustrations, never exactly closed.',
    },
];

const planeEdgeCases: readonly LocalizedText[] = [
    text('Elementi matrike in koordinate začetnih točk so na mreži \\(0{,}25\\) oziroma \\(0{,}05\\); vrednosti zunaj nje graf zavrne.', 'Matrix entries and start coordinates are on the grid \\(0{,}25\\) and \\(0{,}05\\); the graph refuses values outside it.'),
    text('Trajektorije, ki zapustijo izračunano območje, se ustavijo in odčitek to pove; narisane orbite so številske in niso natančno sklenjene.', 'Trajectories that leave the computed region stop and the readout says so; drawn orbits are numerical and not exactly closed.'),
];

const linearSystem: GuidedLesson = {
    demonstrationId: 'phase-portrait',
    title: text('Linearni sistem \\(x^{\\prime}=Ax\\) v ravnini', 'The linear system \\(x^{\\prime}=Ax\\) in the plane'),
    summary: text(
        'Linearni sistem \\(x^{\\prime}=Ax\\) v ravnini: lastne smeri, tip portreta, njegov položaj v ravnini sled–determinanta in numerična metoda. Tip je izrek o lastnih vrednostih, slika ponazoritev ene matrike.',
        'The linear system \\(x^{\\prime}=Ax\\) in the plane: eigen-directions, the type of the portrait, its place in the trace–determinant plane and a numerical method. The type is a theorem on eigenvalues, the picture an illustration of one matrix.',
    ),
    prerequisites: [text('Lastne vrednosti in lastne smeri matrike (lekcija o linearnih preslikavah).', 'Eigenvalues and eigen-directions of a matrix (the linear-maps lesson).')],
    learningGoals: [
        text('Znaš iz sledi, determinante in diskriminante določiti tip portreta in kdaj se spremeni.', 'Can determine the type of the portrait from trace, determinant and discriminant and say when it changes.'),
        text('Ločiš izrek o tipu od ponazoritve in veš, da numerična orbita ni natančno sklenjena.', 'Can tell the theorem on the type from the illustration and know that a numerical orbit is not exactly closed.'),
    ],
    formulaBlocks: pp1Formulas,
    workedExamples: [pp1Example],
    steps: pp1Steps,
    sources: planeSources,
    edgeCases: planeEdgeCases,
    unresolvedQuestions: [],
};

const pendulum: GuidedLesson = {
    demonstrationId: 'phase-portrait',
    title: text('Nihalo v faznem prostoru', 'The pendulum in the phase plane'),
    summary: text(
        'Nihalo \\(\\theta^{\\prime}=\\omega\\), \\(\\omega^{\\prime}=-\\sin\\theta\\) in njegova energija \\(H\\): orbite v ravnini \\((\\theta,\\omega)\\), ovitje kota in separatrisa. Ohranitev energije je račun, narisane orbite so ponazoritev.',
        'The pendulum \\(\\theta^{\\prime}=\\omega\\), \\(\\omega^{\\prime}=-\\sin\\theta\\) and its energy \\(H\\): orbits in the \\((\\theta,\\omega)\\) plane, the wrap of the angle and the separatrix. Conservation of energy is a computation, the drawn orbits are an illustration.',
    ),
    prerequisites: [text('Linearni sistem \\(x^{\\prime}=Ax\\) v ravnini.', 'The linear system \\(x^{\\prime}=Ax\\) in the plane.')],
    learningGoals: [
        text('Znaš z energijo \\(H\\) pojasniti nihanje, vrtenje in separatriso.', 'Can use the energy \\(H\\) to explain swing, rotation and the separatrix.'),
        text('Znaš pojasniti, kaj se dogaja z orbito na separatrisi ob sedlu.', 'Can explain what happens to the orbit on the separatrix near the saddle.'),
    ],
    formulaBlocks: pp2Formulas,
    workedExamples: [],
    steps: pp2Steps,
    sources: planeSources,
    edgeCases: planeEdgeCases,
    unresolvedQuestions: [],
};

const linearizationSources: GuidedLesson['sources'] = [
    {
        id: 'bezeg-phase-linearization-implementation',
        citation: 'Bezeg source: src/dynamics/classify2.ts (the exact type test and the hyperbolic test), systems2.ts (the Jacobians), phaseModel.ts (the ring and the zoom) and src/graphs/dynamics/PhasePortraitGraph.tsx; Hartman–Grobman theorem: FMF Analiza 3 (cited, not opened).',
        implementationCorrespondence: 'A scene sets the system, the equilibrium, the zoom and the seeds of the phase-portrait graph; the type of the linearization, the trace, the determinant and the hyperbolic test are exact, the eigenvalues, the orbits and the ring are computed (RK4, step 0,02, 10 s) and are illustrations. The Hartman–Grobman theorem is cited; the zoomed picture illustrates it and measures nothing.',
    },
];

const linearizationEdgeCases: readonly LocalizedText[] = [
    ...planeEdgeCases,
    text('Koordinate začetnih točk so absolutne, ne odmiki od ravnovesne točke; točka zunaj pogleda je ustavljena po \\(0\\) s. Odčitka za obroč štejeta ustavljene polovice in ne merita razdalje med krivuljama.', 'The coordinates of the start points are absolute, not offsets from the equilibrium; a point outside the view is stopped after \\(0\\) s. The readouts for the ring count stopped halves and do not measure the distance between the curves.'),
];

const linearization: GuidedLesson = {
    demonstrationId: 'phase-portrait',
    title: text('Linearizacija v ravnovesni točki', 'Linearization at an equilibrium'),
    summary: text(
        'Jacobijeva matrika nihala in šibke spirale v ravnovesni točki, tip linearizacije in povečava okoli točke. Tip in hiperboličnost sta točna testa, izrek Hartman–Grobman je naveden, slika je ponazoritev.',
        'The Jacobian of the pendulum and of the weak spiral at an equilibrium, the type of the linearization and a zoom around the point. The type and hyperbolicity are exact tests, the Hartman–Grobman theorem is cited, the picture is an illustration.',
    ),
    prerequisites: [
        text('Linearni sistem \\(x^{\\prime}=Ax\\) v ravnini (PP1).', 'The linear system \\(x^{\\prime}=Ax\\) in the plane (PP1).'),
        text('Nihalo v faznem prostoru (PP2).', 'The pendulum in the phase plane (PP2).'),
    ],
    learningGoals: [
        text('Znaš izračunati Jacobijevo matriko in tip linearizacije v ravnovesni točki.', 'Can compute the Jacobian and the type of the linearization at an equilibrium.'),
        text('Veš, kaj izrek Hartman–Grobman zagotavlja pri hiperbolični točki in da pri nehiperbolični linearizacija o portretu ne odloča.', 'Know what the Hartman–Grobman theorem guarantees at a hyperbolic point and that at a non-hyperbolic one the linearization does not decide the portrait.'),
    ],
    formulaBlocks: pp3Formulas,
    workedExamples: [],
    steps: pp3Steps,
    sources: linearizationSources,
    edgeCases: linearizationEdgeCases,
    unresolvedQuestions: [],
};

export const linearSystemLesson: GuidedLesson = linearSystem;
export const pendulumLesson: GuidedLesson = pendulum;
export const linearizationLesson: GuidedLesson = linearization;

const logisticMap: GuidedLesson = {
    demonstrationId: 'logistic-map',
    title: text('Logistična preslikava za \\(r>3\\)', 'The logistic map beyond \\(r=3\\)'),
    summary: text(
        'Negibna točka logistične preslikave pri \\(r=3\\) izgubi stabilnost, nastane dvocikel, nato štiricikel, osemcikel in nepravilno obnašanje. Točna sta množitelja negibne točke in dvocikla, višje periode so izračunane.',
        'The fixed point of the logistic map loses stability at \\(r=3\\), a 2-cycle appears, then a 4-cycle, an 8-cycle and irregular behaviour. The multipliers of the fixed point and of the 2-cycle are exact; higher periods are computed.',
    ),
    prerequisites: [text('Iteracija funkcije, negibna točka, cobweb (pajkova mreža).', 'Iterating a function, a fixed point, the cobweb.')],
    learningGoals: [
        text('Znaš z množiteljem utemeljiti, kdaj negibna točka in dvocikel privlačita.', 'Can use the multiplier to say when the fixed point and the 2-cycle attract.'),
        text('Ločiš točne trditve od izračunanih in veš, da pri \\(r\\) nad \\(3{,}56995\\) graf periode ne trdi.', 'Can tell exact statements from computed ones and know that above \\(3{,}56995\\) the graph claims no period.'),
    ],
    formulaBlocks: formulas.slice(0, 2),
    workedExamples: examples.slice(0, 1),
    steps: pp4Steps,
    sources,
    edgeCases: edgeCasesOf([]),
    unresolvedQuestions: [],
};

const bifurcation: GuidedLesson = {
    demonstrationId: 'logistic-map',
    title: text('Bifurkacijski diagram', 'The bifurcation diagram'),
    summary: text(
        'Diagram prikaže dolgoročne vrednosti \\(x\\) za vsak \\(r\\): eno vejo, razcepe pri \\(3\\) in \\(1+\\sqrt6\\), vedno bližje drug drugemu, in kaotični pas z okni. Diagram je ponazoritev, izračunana v dvojni natančnosti.',
        'The diagram shows the long-run values of \\(x\\) for each \\(r\\): one branch, splits at \\(3\\) and \\(1+\\sqrt6\\) and ever closer ones, and a chaotic band with windows. The diagram is an illustration computed in double precision.',
    ),
    prerequisites: [text('Logistična preslikava za \\(r>3\\) (PP4).', 'The logistic map beyond \\(r=3\\) (PP4).')],
    learningGoals: [
        text('Znaš prebrati razcepe v diagramu in jih povezati s kazalcem in odčitki.', 'Can read the splits in the diagram and connect them with the cursor and the readouts.'),
        text('Veš, kaj je točno (oznaki \\(3\\) in \\(1+\\sqrt6\\)) in kaj številsko (višji razcepi, razmerja, okna).', 'Know what is exact (the marks \\(3\\) and \\(1+\\sqrt6\\)) and what numerical (the higher splits, the ratios, the windows).'),
    ],
    formulaBlocks: [formulas[0], formulas[1], formulas[2]],
    workedExamples: examples.slice(1),
    steps: pp5Steps,
    sources,
    edgeCases: edgeCasesOf([]),
    unresolvedQuestions: [],
};

export const logisticMapLesson: GuidedLesson = logisticMap;
export const bifurcationLesson: GuidedLesson = bifurcation;
