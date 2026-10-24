/**
 * Static, renderer-independent content for the first Guided lesson pilots.
 *
 * This is intentionally a raw content contract, not the lesson runtime model.
 * A runtime adapter should retrieve a lesson by demonstrationId, render the
 * localized fields, apply scene.actions through a demonstration-owned graph
 * capability, and treat learnerInteraction as an instruction rather than an
 * action to simulate. Content never reaches JSXGraph or the DOM.
 *
 * Scene action names are limited to operations already exposed by the current
 * graph wrappers. The runtime adapter maps them to those wrappers, validates
 * values, and reports unsupported actions explicitly.
 */

import type {DemonstrationId} from '../../demonstrations';
import type {FunctionChoiceName, FunctionParameterName, FunctionVisibilityTarget, LessonAnimationId, LessonCurveFixture, LessonViewBox} from '../model';
import {additionalGuidedLessons} from './additionalGuidedLessons';
import {analysisGuidedLessons} from './analysisGuidedLessons';
import {expansionGuidedLessons} from './expansionGuidedLessons';
import {foundationGuidedLessons} from './foundationGuidedLessons';
import {functionGuidedLessons} from './functionGuidedLessons';
import {parameterizationGuidedLessons} from './parameterizationGuidedLessons';
import {constructionGuidedLessons} from './constructionGuidedLessons';
import {rationalConstructionGuidedLessons} from './rationalConstructionGuidedLessons';
import {splineGuidedLessons} from './splineGuidedLessons';

export type LessonLocale = 'sl' | 'en';

/** Increment only when the raw content shape changes incompatibly for a runtime adapter. */
export const GUIDED_LESSON_CONTENT_VERSION = 2;

export type LocalizedText = Readonly<{
    sl: string;
    en: string;
}>;

export type FormulaBlock = Readonly<{
    id: string;
    latex: string;
    notation: LocalizedText;
    explanation: LocalizedText;
}>;

export type WorkedExample = Readonly<{
    id: string;
    title: LocalizedText;
    calculationLatex: string;
    resultLatex: string;
    check: LocalizedText;
}>;

/**
 * These names correspond to existing graph-wrapper methods. The list is closed (ADR 0013): content and runtime stay in
 * lockstep at compile time. Value ranges are not stated here or in `sceneAction()`: the graph that applies an action
 * defines and enforces its limits, and `sceneContentAgainstGraphs.test.tsx` applies every scene and Chapter activity
 * to the real graph of its Demonstration, so out-of-range content fails a test.
 *
 * - show-control-polygon -> AbstractJXGPointControlledCurve.showControllPolygon
 * - show-convex-hull -> AbstractJXGPointControlledCurve.showConvexHull
 * - show-decasteljau-construction -> AbstractJXGBezierCurve.showCurrentDecasteljauScheme
 * - set-decasteljau-parameter -> AbstractJXGBezierCurve.setDecasteljauT
 * - show-evaluation-point -> BaseCurveGraph's curve-owned evaluation marker
 * - show-weights -> JXGRationalBezierCurve.showwWeights
 * - elevate-degree -> ElevationGraph's graph-owned degree elevation operation
 * - show-offset-curve -> JXGPHBezierCurve.setShowOffsetCurve
 * - set-offset-distance -> JXGPHBezierCurve.setOffsetCurveDistance
 * - set-bernstein-degree -> BernsteinGraph's graph-owned degree action (an integer; BERNSTEIN_MAX_DEGREE bounds it)
 * - show-bernstein-stacked-area -> BernsteinGraph's graph-owned stacked-area view
 * - set-parameterization-alpha / -samples / -mode -> AlphaParam and UniformParam graph-owned parameterization actions (a number alpha, an integer sample count whose bounds differ by route, mode weighted|uniform; the target graph enforces the bounds, see parametrisationLimits.ts)
 * - set-subdivision-parameter / subdivide -> SubdivisionGraph1 (and rational) parameter t (SUBDIVISION_T_MIN..MAX) and one split; on repeated-subdivision, subdivide is one halving step (at most 5)
 * - set-extrapolation-parameter / extrapolate -> ExtrapolationGraph (and rational) parameter t (EXTRAPOLATION_T_MIN..MAX) and one extrapolation
 * - show-spline-labels / hide-spline-fixed-points -> spline graphs' point-label and fixed-point display switches (boolean)
 * - set-spline-continuity / set-spline-degree -> OneSidedCnSplineGraph continuity r and degree n (integers; route bounds enforced by the graph)
 * - set-spline-beta -> G1 spline graphs' b/beta slider, value {index, value} (index is a non-negative integer; range enforced by the graph)
 * - show-farin-points / set-standard-form / set-rational-weights -> FarinPointsCurveGraph display, standard-form switch and weight vector (one positive finite weight per control point)
 * - set-circle-pieces -> RationalBezierCurveCircleGraphN piece counter (integer; route bounds enforced by the graph)
 * - affine transform names -> AffineTransformBezierCurveGraph's graph-owned operations
 * - show-function-element -> function graphs' optional elements (value {name, value}: name is a FunctionVisibilityTarget, value a boolean)
 * - set-function-choice -> function graphs' named choices, value {name, value} (name is a FunctionChoiceName, value one of the strings allowed for that name; the graph maps it)
 * - set-function-parameter -> function graphs' synchronous parameter model, value {name, value} (name is a FunctionParameterName; the graph enforces its own domain)
 * - run-bisection-command -> BisectionGraph's iteration, value 'next-step' (one revealed step) or 'reset' (back to step 0); a scene repeats 'next-step' once per step it shows. Play and pause are not scene actions: playback is initially stopped and under the learner's control
 * - run-fixed-point-command -> FixedPointGraph's iteration, value 'next-step' (one more iterate) or 'reset' (back to step 0); a scene repeats 'next-step' once per step it shows. Play and pause are not scene actions
 * - run-sequence-command -> SequenceGraph's revealed terms, value 'next-step' (one more term) or 'reset' (back to one term); a scene repeats 'next-step' once per term it adds. Play and pause are not scene actions
 */
export const SUPPORTED_SCENE_ACTION_NAMES = [
    'show-control-polygon',
    'show-convex-hull',
    'show-decasteljau-construction',
    'set-decasteljau-parameter',
    'show-evaluation-point',
    'show-weights',
    'elevate-degree',
    'show-offset-curve',
    'set-offset-distance',
    'translate-x',
    'translate-y',
    'scale-affine',
    'rotate-affine',
    'reflect-x',
    'reflect-y',
    'set-bernstein-degree',
    'show-bernstein-stacked-area',
    'set-parameterization-alpha',
    'set-parameterization-samples',
    'set-parameterization-mode',
    'set-subdivision-parameter',
    'subdivide',
    'set-extrapolation-parameter',
    'extrapolate',
    'show-spline-labels',
    'hide-spline-fixed-points',
    'set-spline-continuity',
    'set-spline-degree',
    'set-spline-beta',
    'show-farin-points',
    'set-standard-form',
    'set-rational-weights',
    'set-circle-pieces',
    'set-function-parameter',
    'show-function-element',
    'set-function-choice',
    'run-bisection-command',
    'run-sequence-command',
    'run-fixed-point-command',
] as const;

export type SupportedSceneActionName = typeof SUPPORTED_SCENE_ACTION_NAMES[number];

export type SceneActionValue =
    | boolean
    | number
    | string
    | readonly number[]
    | Readonly<{index: number; value: number}>
    | Readonly<{name: FunctionParameterName; value: number}>
    | Readonly<{name: FunctionVisibilityTarget; value: boolean}>
    | Readonly<{name: FunctionChoiceName; value: string}>;

export type SceneAction = Readonly<{
    name: SupportedSceneActionName;
    value: SceneActionValue;
}>;

/**
 * A scene starts from the Demonstration's default scene, or from that scene with lesson-specific curve geometry and an
 * optional starting view (`lesson-fixture`); free-exploration defaults and Presets stay unchanged either way.
 */
export type LessonScene = Readonly<{
    id: string;
    actions: readonly SceneAction[];
    expectedState: LocalizedText;
} & (
    | {basedOn: 'demonstration-default'; view?: LessonViewBox}
    | {basedOn: 'lesson-fixture'; curve: LessonCurveFixture; view: LessonViewBox}
)>;

/** Existing UI gesture, recorded for the learner but never simulated by content. */
export type LearnerInteraction =
    | 'observe'
    | 'drag-control-point'
    | 'adjust-construction-parameter'
    | 'drag-hodograph-point'
    | 'adjust-offset-distance';

export type GuidedLessonFrameKind = 'explanation' | 'calculation' | 'observation';

export type GuidedLessonFrame = Readonly<{
    id: string;
    kind: GuidedLessonFrameKind;
    formulaIds?: readonly string[];
}>;

export type GuidedLessonAnimation = Readonly<{
    animationId: LessonAnimationId;
}>;

export type GuidedLessonStep = Readonly<{
    id: string;
    order: number;
    title: LocalizedText;
    purpose: LocalizedText;
    explanation: LocalizedText;
    formulaIds: readonly string[];
    frames: readonly GuidedLessonFrame[];
    workedExampleId?: string;
    animation?: GuidedLessonAnimation;
    scene?: LessonScene;
    learnerInteraction: LearnerInteraction;
    observationPrompt: LocalizedText;
    expectedObservations: readonly LocalizedText[];
}>;

export type ContentSource = Readonly<{
    id: string;
    citation: string;
    supports: readonly string[];
    implementationCorrespondence?: string;
}>;

export type GuidedLesson = Readonly<{
    demonstrationId: DemonstrationId;
    title: LocalizedText;
    summary: LocalizedText;
    prerequisites: readonly LocalizedText[];
    learningGoals: readonly LocalizedText[];
    formulaBlocks: readonly FormulaBlock[];
    workedExamples: readonly WorkedExample[];
    steps: readonly GuidedLessonStep[];
    sources: readonly ContentSource[];
    edgeCases: readonly LocalizedText[];
    unresolvedQuestions: readonly LocalizedText[];
}>;

const text = (sl: string, en: string): LocalizedText => ({sl, en});

const scene = (
    id: string,
    actions: readonly SceneAction[],
    sl: string,
    en: string,
): LessonScene => ({
    id,
    basedOn: 'demonstration-default',
    actions,
    expectedState: text(sl, en),
});

const action = (name: SupportedSceneActionName, value: boolean | number): SceneAction => ({name, value});

/** Cubic PH lesson fixture: P_0=(-2,-1), w_0=2, w_1=2+i, so w(t)=2+it, speed 4+t^2 and arc length 13/3. */
const phCubicFixture: LessonCurveFixture = {points: [[-2, -1]], hodographs: [[2, 0], [2, 1]]};
const phCubicView: LessonViewBox = [-3.2, 2.7, 3.4, -2.7];
const phCubicScene = (id: string, actions: readonly SceneAction[], sl: string, en: string): LessonScene => ({
    id,
    basedOn: 'lesson-fixture',
    curve: phCubicFixture,
    view: phCubicView,
    actions,
    expectedState: text(sl, en),
});

/**
 * Bézier lesson fixtures. The symmetric cubic has B(1/2)=(P_0+3P_1+3P_2+P_3)/8=(0,1); the asymmetric cubic has
 * B(1/2)=(3/8,3/4). Both fit `bezierView`; `bezierExamples.test.ts` recomputes these values independently.
 */
const bezierSymmetricFixture: LessonCurveFixture = {points: [[-3, -2], [-3, 2], [3, 2], [3, -2]]};
const bezierAsymmetricFixture: LessonCurveFixture = {points: [[-3, -2], [-1, 3], [2, -1], [3, 2]]};
const bezierView: LessonViewBox = [-4.5, 4, 4.5, -3.5];
const bezierScene = (id: string, curve: LessonCurveFixture, actions: readonly SceneAction[], sl: string, en: string): LessonScene => ({
    id,
    basedOn: 'lesson-fixture',
    curve,
    view: bezierView,
    actions,
    expectedState: text(sl, en),
});

/**
 * De Casteljau lesson fixtures at t=1/2: the quadratic has first row (-3/2,1),(3/2,1) and result (0,1); the symmetric
 * cubic has rows (-3,0),(0,2),(3,0) / (-3/2,1),(3/2,1) / (0,1). The quartic exploration uses the demonstration default.
 */
const decasteljauQuadraticFixture: LessonCurveFixture = {points: [[-3, -2], [0, 4], [3, -2]]};
const decasteljauView: LessonViewBox = [-4.5, 4.8, 4.5, -3];
const decasteljauScene = (id: string, curve: LessonCurveFixture, t: number, sl: string, en: string): LessonScene => ({
    id,
    basedOn: 'lesson-fixture',
    curve,
    view: decasteljauView,
    actions: [action('show-decasteljau-construction', true), action('set-decasteljau-parameter', t)],
    expectedState: text(sl, en),
});

const frame = (id: string, kind: GuidedLessonFrameKind): GuidedLessonFrame => ({id, kind});

const bezierFormulaBlocks: readonly FormulaBlock[] = [
    {
        id: 'bezier-bernstein-form',
        latex: 'B(t)=\\sum_{i=0}^{n}\\binom{n}{i}(1-t)^{n-i}t^iP_i,\\qquad 0\\le t\\le1',
        notation: text(
            '\\(P_i\\) so kontrolne točke, \\(n\\) je stopnja, \\(t\\) pa parameter od 0 do 1.',
            'The \\(P_i\\) are control points, \\(n\\) is the degree, and \\(t\\) is the parameter from 0 to 1.',
        ),
        explanation: text(
            'Krivulja je utežena vsota kontrolnih točk. Uteži so Bernsteinovi polinomi in se za \\(t\\) med 0 in 1 seštejejo v 1.',
            'The curve is a weighted sum of its control points. The weights are Bernstein polynomials and sum to 1 for \\(t\\) between 0 and 1.',
        ),
    },
    {
        id: 'bezier-endpoints',
        latex: 'B(0)=P_0,\\qquad B(1)=P_n',
        notation: text(
            'Začetna in končna točka krivulje sta prvi in zadnji kontrolni točki.',
            'The start and end points of the curve are the first and last control points.',
        ),
        explanation: text(
            'Na krajiščih ima ena utež vrednost 1, vse druge pa 0.',
            'At the endpoints, one weight is 1 and all the others are 0.',
        ),
    },
    {
        id: 'bezier-convex-hull',
        latex: 'B([0,1])\\subseteq\\operatorname{conv}\\{P_0,\\ldots,P_n\\}',
        notation: text(
            'Konveksna ovojnica je najmanjša konveksna množica, ki vsebuje kontrolne točke.',
            'The convex hull is the smallest convex set containing the control points.',
        ),
        explanation: text(
            'Ker so Bernsteinove uteži nenegativne in seštevek 1, je vsaka točka krivulje v konveksni ovojnici kontrolnih točk.',
            'Because the Bernstein weights are non-negative and sum to 1, every curve point lies in the convex hull of the control points.',
        ),
    },
];

const decasteljauFormulaBlocks: readonly FormulaBlock[] = [
    {
        id: 'decasteljau-interpolation',
        latex: 'P_i^{(0)}=P_i,\\qquad P_i^{(r)}(t)=(1-t)P_i^{(r-1)}(t)+tP_{i+1}^{(r-1)}(t)',
        notation: text(
            'V vsaki vrstici linearno interpoliramo sosednji točki; \\(r\\) označuje vrstico konstrukcije.',
            'Each row linearly interpolates neighboring points; \\(r\\) identifies the construction row.',
        ),
        explanation: text(
            'Po \\(n\\) korakih je \\(B(t)=P_0^{(n)}(t)\\). Konstrukcija uporablja iste uteži kot Bernsteinova oblika, vendar jih izračuna rekurzivno.',
            'After \\(n\\) steps, \\(B(t)=P_0^{(n)}(t)\\). The construction uses the same weights as the Bernstein form, but computes them recursively.',
        ),
    },
    {
        id: 'decasteljau-curve-point',
        latex: 'B(t)=P_0^{(n)}(t)',
        notation: text(
            'Končna točka zadnje vrstice leži na Bézierjevi krivulji pri parametru \\(t\\).',
            'The final point in the last row lies on the Bézier curve at parameter \\(t\\).',
        ),
        explanation: text(
            'Premikanje parametra \\(t\\) premakne vse vmesne točke in končno točko, ne spremeni pa kontrolnih točk.',
            'Changing \\(t\\) moves all intermediate points and the final point, but does not change the control points.',
        ),
    },
];

const phFormulaBlocks: readonly FormulaBlock[] = [
    {
        id: 'ph-hodograph',
        latex: 'w(t)=(1-t)w_0+tw_1,\\qquad r\'(t)=w(t)^2',
        notation: text(
            'Ravnino identificiramo s kompleksnimi števili; kvadrat kompleksnega hodografa določa odvod krivulje.',
            'The plane is identified with complex numbers; the square of the complex hodograph determines the curve derivative.',
        ),
        explanation: text(
            'Pri kubični PH krivulji sta \\(w_0\\) in \\(w_1\\) generatorja hodografa. Kvadrat je mišljen kot kompleksni produkt, ne kot krajšanje vektorja.',
            'For a cubic PH curve, \\(w_0\\) and \\(w_1\\) generate the hodograph. The square means complex multiplication, not a vector shortcut.',
        ),
    },
    {
        id: 'ph-polynomial-speed',
        latex: '\\|r\'(t)\\|=\\|w(t)\\|^2',
        notation: text(
            'Hitrost je kvadrat dolžine linearnega hodografa, zato je pri kubični PH krivulji polinom.',
            'The speed is the squared length of the linear hodograph, so it is polynomial for a cubic PH curve.',
        ),
        explanation: text(
            'To je bistvena lastnost PH: dolžino loka lahko izračunamo polinomsko, čeprav je oblika krivulje lahko ukrivljena.',
            'This is the defining PH property: arc length can be computed polynomially even when the curve is curved.',
        ),
    },
    {
        id: 'ph-cubic-control-points',
        latex: '\\begin{aligned}P_1&=P_0+\\frac13w_0^2\\\\P_2&=P_1+\\frac13w_0w_1\\\\P_3&=P_2+\\frac13w_1^2\\end{aligned}',
        notation: text(
            '\\(P_0\\) je začetna točka, \\(P_1\\), \\(P_2\\), \\(P_3\\) pa se izračunajo iz generatorjev \\(w_0\\), \\(w_1\\).',
            '\\(P_0\\) is the start point; \\(P_1\\), \\(P_2\\), \\(P_3\\) are generated from \\(w_0\\) and \\(w_1\\).',
        ),
        explanation: text(
            'To je obrazec, ki ga za kubično krivuljo uporablja Bezegov matematični model za generiranje kontrolnih točk.',
            'This is the formula used by Bezeg’s mathematical model to generate the cubic control points.',
        ),
    },
    {
        id: 'ph-offset',
        latex: 'r_d(t)=r(t)+d\\,n(t),\\qquad n(t)=\\frac{\\left(y\'(t),\\,-x\'(t)\\right)}{\\|r\'(t)\\|}',
        notation: text(
            '\\(n(t)\\) je enotska normala, ki leži desno od smeri potovanja; \\(d>0\\) zato premakne točko na desno, \\(d<0\\) pa na levo.',
            '\\(n(t)\\) is the unit normal lying to the right of the direction of travel, so \\(d>0\\) moves the point to the right and \\(d<0\\) to the left.',
        ),
        explanation: text(
            'Odmik je pri vsakem \\(t\\) natanko \\(|d|\\) oddaljen od točke krivulje, merjeno vzdolž normale, ne navpično na zaslonu. Je pa regularen le, dokler je \\(1+d\\kappa>0\\) (z \\(\\kappa\\) označimo predznačeno ukrivljenost).',
            'At every \\(t\\) the offset is exactly \\(|d|\\) from the curve point, measured along the normal rather than vertically on the screen. It is regular only while \\(1+d\\kappa>0\\) (where \\(\\kappa\\) is the signed curvature).',
        ),
    },
];

export const pilotGuidedLessons: readonly GuidedLesson[] = [
    {
        demonstrationId: 'bezier',
        title: text('Bézierjeva krivulja: od točk do oblike', 'Bézier curve: from points to shape'),
        summary: text(
            'Kontrolne točke določajo krivuljo; pri njihovem premiku se nekatere geometrijske lastnosti ohranijo.',
            'The lesson examines how control points determine the curve and which geometric properties are preserved when they move.',
        ),
        prerequisites: [
            text('Potrebno je osnovno poznavanje koordinat točk in linearnih kombinacij.', 'Assumes familiarity with point coordinates and linear combinations.'),
            text('Potrebno je razumevanje parametra \\(t\\) na intervalu \\([0,1]\\).', 'Assumes familiarity with the parameter \\(t\\) on the interval \\([0,1]\\).'),
        ],
        learningGoals: [
            text('Razložiš vlogo kontrolnih točk in kontrolnega poligona.', 'Explain the role of control points and the control polygon.'),
            text('Uporabiš krajiščni lastnosti \\(B(0)=P_0\\) in \\(B(1)=P_n\\).', 'Use the endpoint properties \\(B(0)=P_0\\) and \\(B(1)=P_n\\).'),
            text('Utemeljiš, zakaj je krivulja v konveksni ovojnici kontrolnih točk.', 'Explain why the curve lies in the convex hull of its control points.'),
        ],
        formulaBlocks: bezierFormulaBlocks,
        workedExamples: [
            {
                id: 'bezier-cubic-midpoint',
                title: text('Kubična krivulja pri \\(t=1/2\\)', 'Cubic curve at \\(t=1/2\\)'),
                calculationLatex: 'P_0=(-3,-2),\\;P_1=(-3,2),\\;P_2=(3,2),\\;P_3=(3,-2)',
                resultLatex: 'B(1/2)=\\frac18(P_0+3P_1+3P_2+P_3)=\\frac18(0,8)=(0,1)',
                check: text(
                    'Neodvisen izračun potrdi rezultat; premik kontrolne točke spremeni tudi vrednost v tej točki.',
                    'An independent calculation confirms the result; moving a control point changes the evaluated point as well.',
                ),
            },
            {
                id: 'bezier-asymmetric-midpoint',
                title: text('Nesimetrična kubična krivulja pri \\(t=1/2\\)', 'Asymmetric cubic curve at \\(t=1/2\\)'),
                calculationLatex: 'P_0=(-3,-2),\\;P_1=(-1,3),\\;P_2=(2,-1),\\;P_3=(3,2)',
                resultLatex: 'B(1/2)=\\frac18(P_0+3P_1+3P_2+P_3)=\\frac18(3,6)=(3/8,3/4)',
                check: text(
                    'Uteži \\(1/8,\\,3/8,\\,3/8,\\,1/8\\) so enake kot prej; drugačen rezultat je posledica drugačnih kontrolnih točk.',
                    'The weights \\(1/8,\\,3/8,\\,3/8,\\,1/8\\) are the same as before; the different result comes from the different control points.',
                ),
            },
        ],
        steps: [
            {
                id: 'bezier-introduction', order: 1,
                title: text('Osnovna ideja', 'Basic idea'),
                purpose: text('Vloga kontrolnih točk pri določanju krivulje in njena geometrijska predstavitev.', 'The role of control points in defining the curve and its geometric representation.'),
                explanation: text(
                    'Bézierjeva krivulja je določena s kontrolnimi točkami. Točke niso nujno na krivulji; vplivajo na njeno obliko.',
                    'A Bézier curve is determined by control points. The points do not all lie on the curve; they influence its shape.',
                ),
                formulaIds: [], learnerInteraction: 'observe',
                frames: [frame('bezier-introduction-explanation', 'explanation'), frame('bezier-introduction-observation', 'observation')],
                observationPrompt: text('Določi začetno in končno točko krivulje.', 'Identify the initial and terminal points of the curve.'),
                expectedObservations: [text('Krivulja se začne pri \\(P_0\\) in konča pri \\(P_3\\).', 'The curve starts at \\(P_0\\) and ends at \\(P_3\\).')],
                scene: bezierScene('bezier-symmetric-cubic', bezierSymmetricFixture, [], 'Simetrična kubična krivulja s kontrolnimi točkami \\((-3,-2)\\), \\((-3,2)\\), \\((3,2)\\) in \\((3,-2)\\).', 'A symmetric cubic curve with control points \\((-3,-2)\\), \\((-3,2)\\), \\((3,2)\\), and \\((3,-2)\\).'),
            },
            {
                id: 'bezier-control-polygon', order: 2,
                title: text('Kontrolni poligon in ovojnica', 'Control polygon and hull'),
                purpose: text('Povezava kontrolnega poligona s konveksno omejitvijo krivulje.', 'The relationship between the control polygon and the curve’s convex-hull constraint.'),
                explanation: text(
                    'Kontrolni poligon poveže \\(P_0\\), \\(P_1\\), \\(P_2\\), \\(P_3\\). Pri \\(0\\le t\\le 1\\) so Bernsteinove uteži nenegativne in seštevek je 1, zato krivulja ostane v konveksni ovojnici.',
                    'The control polygon joins \\(P_0\\), \\(P_1\\), \\(P_2\\), \\(P_3\\). For \\(0\\le t\\le 1\\) the Bernstein weights are non-negative and sum to 1, so the curve stays inside the convex hull.',
                ),
                formulaIds: ['bezier-convex-hull'],
                frames: [frame('bezier-control-polygon-explanation', 'explanation'), frame('bezier-control-polygon-observation', 'observation')],
                scene: bezierScene('bezier-control-polygon-and-hull', bezierSymmetricFixture, [action('show-control-polygon', true), action('show-convex-hull', true)], 'Prikažeta se kontrolni poligon in konveksna ovojnica pravokotnika s koti \\((\\pm3,\\pm2)\\).', 'The control polygon and the convex hull, the rectangle with corners \\((\\pm3,\\pm2)\\), are shown.'),
                learnerInteraction: 'observe',
                observationPrompt: text('Preveri, ali krivulja zapusti označeno konveksno ovojnico.', 'Verify whether the curve leaves the highlighted convex hull.'),
                expectedObservations: [text('Ne; pri običajnem parametru ostane znotraj konveksne ovojnice.', 'No; for the ordinary parameter range it stays inside the convex hull.')],
            },
            {
                id: 'bezier-endpoints', order: 3,
                title: text('Krajišči', 'Endpoints'),
                purpose: text('Posebna vloga prve in zadnje kontrolne točke.', 'The special role of the first and last control points.'),
                explanation: text(
                    'Pri \\(t=0\\) je teža \\(P_0\\) enaka 1, pri \\(t=1\\) pa je teža \\(P_3\\) enaka 1. Drugi kontrolni točki vplivata na potek, ne pa na krajišči.',
                    'At \\(t=0\\) the weight of \\(P_0\\) is 1, and at \\(t=1\\) the weight of \\(P_3\\) is 1. The other control points affect the path, not the endpoints.',
                ),
                formulaIds: ['bezier-endpoints'], learnerInteraction: 'drag-control-point',
                scene: bezierScene('bezier-endpoints-scene', bezierSymmetricFixture, [action('show-control-polygon', true)], 'Viden je kontrolni poligon; krivulja se začne v \\((-3,-2)\\) in konča v \\((3,-2)\\), notranji točki \\((-3,2)\\) in \\((3,2)\\) pa nista na krivulji.', 'The control polygon is visible; the curve starts at \\((-3,-2)\\) and ends at \\((3,-2)\\), while the interior points \\((-3,2)\\) and \\((3,2)\\) are not on the curve.'),
                frames: [frame('bezier-endpoints-explanation', 'explanation'), frame('bezier-endpoints-observation', 'observation')],
                observationPrompt: text('Premakni \\(P_1\\) ali \\(P_2\\) ter opiši, kaj se spremeni in kaj ostane nespremenjeno.', 'Move \\(P_1\\) or \\(P_2\\) and describe what changes and what remains invariant.'),
                expectedObservations: [text('Oblika krivulje se spremeni, krajišči pri \\(P_0\\) in \\(P_3\\) pa ostaneta enaki.', 'The shape changes, while the endpoints at \\(P_0\\) and \\(P_3\\) stay the same.')],
            },
            {
                id: 'bezier-evaluation', order: 4,
                title: text('Izračun pri \\(t=1/2\\)', 'Evaluate at \\(t=1/2\\)'),
                purpose: text('Primerjava analitičnega izračuna z označeno točko na krivulji.', 'A comparison between the analytical evaluation and the marked point on the curve.'),
                explanation: text(
                    'Za točke \\((-3,-2)\\), \\((-3,2)\\), \\((3,2)\\), \\((3,-2)\\) je \\(B(1/2)=\\tfrac18\\bigl((-3,-2)+3(-3,2)+3(3,2)+(3,-2)\\bigr)=(0,1)\\). To je utežena vsota vseh štirih kontrolnih točk z utežmi \\(1/8,\\,3/8,\\,3/8,\\,1/8\\), ne njihovo aritmetično povprečje \\((0,0)\\).',
                    'For the points \\((-3,-2)\\), \\((-3,2)\\), \\((3,2)\\), \\((3,-2)\\), \\(B(1/2)=\\tfrac18\\bigl((-3,-2)+3(-3,2)+3(3,2)+(3,-2)\\bigr)=(0,1)\\). It is a weighted sum of all four control points with weights \\(1/8,\\,3/8,\\,3/8,\\,1/8\\), not their arithmetic mean \\((0,0)\\).',
                ),
                formulaIds: ['bezier-bernstein-form'],
                frames: [frame('bezier-evaluation-explanation', 'explanation'), frame('bezier-evaluation-calculation', 'calculation'), frame('bezier-evaluation-observation', 'observation')],
                workedExampleId: 'bezier-cubic-midpoint',
                scene: bezierScene('bezier-evaluation-point', bezierSymmetricFixture, [action('show-control-polygon', true), action('show-convex-hull', true), action('show-evaluation-point', 0.5)], 'Na krivulji je označena točka \\(B(\\tfrac{1}{2})=(0,1)\\), vidna sta tudi poligon in ovojnica.', 'The point \\(B(\\tfrac{1}{2})=(0,1)\\) is marked on the curve, with the polygon and hull visible.'),
                learnerInteraction: 'observe',
                observationPrompt: text('Preveri, ali izračunana točka leži v konveksni ovojnici kontrolnih točk.', 'Verify whether the evaluated point lies in the convex hull of the control points.'),
                expectedObservations: [text('Točka je na krivulji in znotraj konveksne ovojnice.', 'The point is on the curve and inside the convex hull.')],
            },
            {
                id: 'bezier-influence', order: 5,
                title: text('Vpliv premika', 'Effect of a move'),
                purpose: text('Lokalna geometrijska sprememba brez enega vnaprej določenega odgovora.', 'A local geometric change without a single predetermined answer.'),
                explanation: text(
                    'Nesimetrična krivulja z \\((-3,-2)\\), \\((-1,3)\\), \\((2,-1)\\), \\((3,2)\\) ima pri \\(t=1/2\\) točko \\((3/8,3/4)\\) z istimi utežmi kot prej. Premik notranje kontrolne točke spremeni krivuljo, poligon in ovojnico; krajišči ostaneta.',
                    'The asymmetric curve with \\((-3,-2)\\), \\((-1,3)\\), \\((2,-1)\\), \\((3,2)\\) has the point \\((3/8,3/4)\\) at \\(t=1/2\\), with the same weights as before. Moving an interior control point changes the curve, polygon, and hull; the endpoints stay.',
                ),
                formulaIds: ['bezier-bernstein-form', 'bezier-convex-hull'], learnerInteraction: 'drag-control-point',
                workedExampleId: 'bezier-asymmetric-midpoint',
                frames: [frame('bezier-influence-explanation', 'explanation'), frame('bezier-influence-calculation', 'calculation'), frame('bezier-influence-observation', 'observation')],
                observationPrompt: text('Opiši, kako se sprememba položaja kontrolne točke odrazi na krivulji.', 'Describe how changing a control point affects the curve.'),
                expectedObservations: [text('Krivulja ostane povezana s krajiščema, njen potek pa sledi novi ovojnici.', 'The curve remains attached to its endpoints, while its path follows the new hull.')],
                scene: bezierScene('bezier-asymmetric-cubic', bezierAsymmetricFixture, [action('show-control-polygon', true), action('show-convex-hull', true), action('show-evaluation-point', 0.5)], 'Nesimetrična krivulja; označena je točka \\(B(\\tfrac12)=(3/8,3/4)\\), vidna sta poligon in ovojnica.', 'The asymmetric curve; the point \\(B(\\tfrac12)=(3/8,3/4)\\) is marked, with the polygon and hull visible.'),
            },
            {
                id: 'bezier-free-exploration', order: 6,
                title: text('Samostojna analiza', 'Independent analysis'),
                purpose: text('Uporaba obravnavanih lastnosti v poljubni nastavitvi grafa.', 'Application of the properties discussed to an arbitrary graph configuration.'),
                explanation: text('V poljubni nastavitvi so vidni krajišči, konveksna ovojnica in vpliv kontrolnih točk na obliko krivulje.', 'An arbitrary configuration makes the endpoints, convex hull, and influence of the control points on the curve shape visible.'),
                formulaIds: ['bezier-endpoints', 'bezier-convex-hull'], learnerInteraction: 'observe',
                scene: scene('bezier-default-exploration', [action('show-control-polygon', true), action('show-convex-hull', true)], 'Za samostojno raziskovanje se vrne privzeta kubična krivulja; vidna sta poligon in ovojnica.', 'The default cubic curve returns for independent exploration, with the polygon and hull visible.'),
                frames: [frame('bezier-free-exploration-explanation', 'explanation'), frame('bezier-free-exploration-observation', 'observation')],
                observationPrompt: text('Izberi lastnost, ki jo boš preveril z novo konfiguracijo kontrolnih točk.', 'Choose a property to test with a new control-point configuration.'),
                expectedObservations: [text('Različne kontrolne točke dajo različne krivulje, vendar veljajo iste osnovne lastnosti.', 'Different control points produce different curves, while the same basic properties remain.')],
            },
        ],
        sources: [
            {
                id: 'stampar-thesis-bezier',
                citation: 'Štampar, Kevin. Orodje za grafični prikaz lastnosti Bézierjevih in PH krivulj, magistrsko delo, Univerza v Ljubljani, 2024, §§2.3–2.5 (printed pp. 6–10).',
                supports: ['Bézier definition', 'endpoint interpolation', 'convex-hull property', 'De Casteljau recursion'],
                implementationCorrespondence: 'The thesis describes the same Bézier and De Casteljau constructions implemented by Bezeg; current source locations are recorded separately below.',
            },
            {
                id: 'farin-cagd',
                citation: 'Farin, G. Curves and Surfaces for CAGD: A Practical Guide, 5th ed., Morgan Kaufmann, 2002.',
                supports: ['Bernstein form', 'endpoint interpolation', 'convex-hull property'],
                implementationCorrespondence: 'The polynomial evaluator and full De Casteljau scheme are in src/bezeg/impl/curve/polynomial-bezier-curve.ts.',
            },
            {
                id: 'bezeg-polynomial-implementation',
                citation: 'Bezeg source: src/bezeg/impl/curve/polynomial-bezier-curve.ts and src/graphs/curves/object/JXGBezierCurve.ts.',
                supports: ['default control points', 'numerical evaluation', 'control-polygon and hull display capabilities'],
            },
        ],
        edgeCases: [
            text('Za \\(t\\) izven \\([0,1]\\) konveksna ovojnica ni več zagotovljena; ta pilot tega ne predstavlja kot običajno raziskovanje.', 'For \\(t\\) outside \\([0,1]\\) the convex-hull guarantee no longer applies; this pilot does not present that as ordinary exploration.'),
            text('Pri sovpadajočih kontrolnih točkah se lahko krivulja degenerira, vendar formula še vedno velja.', 'Coincident control points can produce a degenerate curve, while the formula still applies.'),
        ],
        unresolvedQuestions: [
            text('Lastnik naj potrdi, ali naj učenci v prvem pilotu uporabljajo tudi prikaz konveksne ovojnice ali le kontrolni poligon.', 'The owner should confirm whether the first pilot should show the convex hull as well as the control polygon.'),
            text('Pred oznako »classroom-ready« je potreben pregled slovenskega izraza »konveksna ovojnica« in vseh formul.', 'Before calling this classroom-ready, review the Slovenian term “konveksna ovojnica” and all formulas.'),
        ],
    },
    {
        demonstrationId: 'decasteljau',
        title: text('De Casteljaujeva konstrukcija', 'De Casteljau construction'),
        summary: text('Zaporedne linearne interpolacije od kontrolnih točk do točke na krivulji.', 'The sequence of linear interpolations from control points to a point on the curve.'),
        prerequisites: [
            text('Potrebno je osnovno poznavanje linearne interpolacije in Bézierjevih kontrolnih točk.', 'Assumes familiarity with linear interpolation and Bézier control points.'),
            text('Potrebno je razumevanje, da parameter \\(t\\) določa položaj na krivulji.', 'Assumes that the parameter \\(t\\) selects a position on the curve.'),
        ],
        learningGoals: [
            text('Prebereš eno vrstico De Casteljaujeve konstrukcije kot linearne interpolacije.', 'Read one row of De Casteljau’s construction as linear interpolations.'),
            text('Povežeš končno točko konstrukcije z \\(B(t)\\).', 'Connect the final construction point with \\(B(t)\\).'),
            text('Razlikuješ med spremembo parametra \\(t\\) in spremembo kontrolnih točk.', 'Distinguish changing \\(t\\) from changing the control points.'),
        ],
        formulaBlocks: decasteljauFormulaBlocks,
        workedExamples: [
            {
                id: 'decasteljau-quadratic-midpoint',
                title: text('Kvadratna krivulja pri \\(t=\\tfrac{1}{2}\\)', 'Quadratic curve at \\(t=\\tfrac{1}{2}\\)'),
                calculationLatex: '\\begin{array}{l}P^0=(-3,-2),(0,4),(3,-2)\\\\P^1=(-3/2,1),(3/2,1)\\\\P^2=(0,1)\\end{array}',
                resultLatex: 'P_0^{(2)}(1/2)=(0,1)',
                check: text('Bernsteinova oblika \\(\\tfrac14(P_0+2P_1+P_2)\\) da isto točko \\((0,1)\\).', 'The Bernstein form \\(\\tfrac14(P_0+2P_1+P_2)\\) gives the same point \\((0,1)\\).'),
            },
            {
                id: 'decasteljau-cubic-midpoint',
                title: text('Kubična krivulja pri \\(t=\\tfrac{1}{2}\\)', 'Cubic curve at \\(t=\\tfrac{1}{2}\\)'),
                calculationLatex: '\\begin{array}{l}P^0=(-3,-2),(-3,2),(3,2),(3,-2)\\\\P^1=(-3,0),(0,2),(3,0)\\\\P^2=(-3/2,1),(3/2,1)\\\\P^3=(0,1)\\end{array}',
                resultLatex: 'P_0^{(3)}(1/2)=(0,1)',
                check: text('Vrstica \\(P^2\\) kubičnega primera je enaka vrstici \\(P^1\\) kvadratnega primera; končna točka je ista kot pri Bernsteinovi obliki.', 'Row \\(P^2\\) of the cubic example equals row \\(P^1\\) of the quadratic example; the final point matches the Bernstein form.'),
            },
            {
                id: 'decasteljau-cubic-quarter',
                title: text('Kubična krivulja pri \\(t=\\tfrac{1}{4}\\)', 'Cubic curve at \\(t=\\tfrac{1}{4}\\)'),
                calculationLatex: '\\begin{array}{l}P^0=(-3,-2),(-3,2),(3,2),(3,-2)\\\\P^1=(-3,-1),(-3/2,2),(3,1)\\\\P^2=(-21/8,-1/4),(-3/8,7/4)\\\\P^3=(-33/16,1/4)\\end{array}',
                resultLatex: 'P_0^{(3)}(1/4)=(-33/16,1/4)',
                check: text('Točka je bliže \\(P_0\\) kot sredina; Bernsteinove uteži \\(27/64,\\,27/64,\\,9/64,\\,1/64\\) dajo isti rezultat.', 'The point is closer to \\(P_0\\) than the midpoint; the Bernstein weights \\(27/64,\\,27/64,\\,9/64,\\,1/64\\) give the same result.'),
            },
            {
                id: 'decasteljau-cubic-three-quarter',
                title: text('Kubična krivulja pri \\(t=\\tfrac{3}{4}\\)', 'Cubic curve at \\(t=\\tfrac{3}{4}\\)'),
                calculationLatex: '\\begin{array}{l}P^0=(-3,-2),(-3,2),(3,2),(3,-2)\\\\P^1=(-3,1),(3/2,2),(3,-1)\\\\P^2=(3/8,7/4),(21/8,-1/4)\\\\P^3=(33/16,1/4)\\end{array}',
                resultLatex: 'P_0^{(3)}(3/4)=(33/16,1/4)',
                check: text('Zaradi simetrije kontrolnih točk je konstrukcija zrcalna slika konstrukcije pri \\(t=1/4\\) čez os \\(y\\); vmesne vrstice niso sredine.', 'By the symmetry of the control points the construction is the mirror image of the one at \\(t=1/4\\) across the \\(y\\)-axis; the intermediate rows are not midpoints.'),
            },
            {
                id: 'decasteljau-degree-four-midpoint',
                title: text('Privzeta krivulja pri \\(t=\\tfrac{1}{2}\\)', 'Default curve at \\(t=\\tfrac{1}{2}\\)'),
                calculationLatex: '\\begin{array}{l}P^0=(-4,-3),(-3,2),(0,3),(3,2),(4,-3)\\\\P^1=(-7/2,-1/2),(-3/2,5/2),(3/2,5/2),(7/2,-1/2)\\\\P^2=(-5/2,1),(0,5/2),(5/2,1)\\\\P^3=(-5/4,7/4),(5/4,7/4)\\end{array}',
                resultLatex: 'P_0^{(4)}(1/2)=(0,7/4)',
                check: text('Vidne vmesne vrstice ustrezajo privzeti konstrukciji; zadnja točka leži na izrisani krivulji.', 'The visible intermediate rows correspond to the default construction; the final point lies on the drawn curve.'),
            },
        ],
        steps: [
            {
                id: 'decasteljau-introduction', order: 1,
                title: text('Od interpolacije do krivulje', 'From interpolation to curve'),
                purpose: text('Algoritem kot zaporedje linearnih interpolacij.', 'The algorithm as a sequence of linear interpolations.'),
                explanation: text('De Casteljaujeva konstrukcija vsako vrstico zgradi z linearno interpolacijo sosednjih točk pri istem \\(t\\). Začnemo s kvadratno krivuljo s kontrolnimi točkami \\((-3,-2)\\), \\((0,4)\\), \\((3,-2)\\) pri \\(t=1/2\\).', 'De Casteljau’s construction builds each row by linearly interpolating neighboring points at the same \\(t\\). We start with the quadratic curve with control points \\((-3,-2)\\), \\((0,4)\\), \\((3,-2)\\) at \\(t=1/2\\).'),
                formulaIds: ['decasteljau-interpolation'], learnerInteraction: 'observe',
                frames: [frame('decasteljau-introduction-explanation', 'explanation'), frame('decasteljau-introduction-observation', 'observation')],
                animation: {animationId: 'decasteljau'},
                observationPrompt: text('Določi število novih točk v prvi interpolacijski vrstici.', 'Determine the number of new points in the first interpolation row.'),
                expectedObservations: [text('Pri treh začetnih točkah nastaneta dve točki v prvi novi vrstici, nato ena končna točka.', 'With three starting points, two points appear in the first new row, then one final point.')],
                scene: decasteljauScene('decasteljau-quadratic', decasteljauQuadraticFixture, 0.5, 'Kvadratna konstrukcija je pripravljena pri \\(t=0{,}5\\); animacija lahko pokaže prehod od \\(t=0\\) do \\(t=1\\).', 'The quadratic construction is prepared at \\(t=0.5\\); replay can show the transition from \\(t=0\\) to \\(t=1\\).'),
            },
            {
                id: 'decasteljau-one-step', order: 2,
                title: text('Ena interpolacijska vrstica', 'One interpolation row'),
                purpose: text('Povezava interpolacijske formule z vidnimi odseki med točkami.', 'The relationship between the interpolation formula and the visible segments between points.'),
                explanation: text('Za vsak sosednji par \\(P_i\\) in \\(P_{i+1}\\) se izračuna interpolirana točka \\((1-t)P_i+tP_{i+1}\\); pri \\(t=1/2\\) rezultat predstavlja sredino odseka. Prva vrstica je \\((-3/2,1)\\) in \\((3/2,1)\\).', 'For each neighboring pair \\(P_i\\) and \\(P_{i+1}\\), the interpolated point is \\((1-t)P_i+tP_{i+1}\\); at \\(t=1/2\\), this point is the segment midpoint. The first row is \\((-3/2,1)\\) and \\((3/2,1)\\).'),
                formulaIds: ['decasteljau-interpolation'], learnerInteraction: 'adjust-construction-parameter',
                workedExampleId: 'decasteljau-quadratic-midpoint',
                frames: [frame('decasteljau-one-step-explanation', 'explanation'), frame('decasteljau-one-step-calculation', 'calculation'), frame('decasteljau-one-step-observation', 'observation')],
                observationPrompt: text('Pri \\(t=1/2\\) preveri, ali prvi vmesni točki sovpadata s sredinama odsekov.', 'At \\(t=1/2\\), verify whether the first intermediate points coincide with the segment midpoints.'),
                expectedObservations: [text('Prva vrstica je sestavljena iz sredin obeh sosednjih odsekov: \\((-3/2,1)\\) in \\((3/2,1)\\).', 'The first row consists of the midpoints of the two neighboring segments: \\((-3/2,1)\\) and \\((3/2,1)\\).')],
                scene: decasteljauScene('decasteljau-first-row', decasteljauQuadraticFixture, 0.5, 'Parameter ostane pri \\(t=0{,}5\\), da lahko primerjaš sredini.', 'The parameter stays at \\(t=0.5\\) for midpoint comparison.'),
            },
            {
                id: 'decasteljau-final-point', order: 3,
                title: text('Končna točka je \\(B(t)\\)', 'The final point is \\(B(t)\\)'),
                purpose: text('Utemeljitev, zakaj zadnja vrstica določi točko na krivulji.', 'Why the final row determines a point on the curve.'),
                explanation: text('Ko se število točk po vrsticah zmanjša na eno, dobimo \\(P_0^{(n)}(t)=B(t)\\). Pri kvadratni krivulji je \\(n=2\\): sredina točk \\((-3/2,1)\\) in \\((3/2,1)\\) je \\((0,1)\\). Konstrukcija zato ni le približek.', 'When the rows reduce to one point, we get \\(P_0^{(n)}(t)=B(t)\\). For the quadratic curve \\(n=2\\): the midpoint of \\((-3/2,1)\\) and \\((3/2,1)\\) is \\((0,1)\\). The construction is therefore not merely an approximation.'),
                formulaIds: ['decasteljau-curve-point'], learnerInteraction: 'observe',
                frames: [frame('decasteljau-final-point-explanation', 'explanation'), frame('decasteljau-final-point-observation', 'observation')],
                observationPrompt: text('Preveri, ali zadnja točka konstrukcije leži na krivulji.', 'Verify whether the final construction point lies on the curve.'),
                expectedObservations: [text('Da; pri \\(t=1/2\\) je zadnja točka \\((0,1)\\), kar je enako \\(\\tfrac14(P_0+2P_1+P_2)\\).', 'Yes; at \\(t=1/2\\) the final point is \\((0,1)\\), which equals \\(\\tfrac14(P_0+2P_1+P_2)\\).')],
                scene: decasteljauScene('decasteljau-final-point', decasteljauQuadraticFixture, 0.5, 'Končna konstrukcijska točka \\((0,1)\\) je poudarjena pri \\(t=0{,}5\\).', 'The final construction point \\((0,1)\\) is highlighted at \\(t=0.5\\).'),
            },
            {
                id: 'decasteljau-cubic', order: 4,
                title: text('Kubična krivulja: tri vrstice', 'Cubic curve: three rows'),
                purpose: text('Ista konstrukcija pri višji stopnji ima eno vrstico več.', 'The same construction at a higher degree has one more row.'),
                explanation: text('Pri kubični krivulji \\((-3,-2)\\), \\((-3,2)\\), \\((3,2)\\), \\((3,-2)\\) nastanejo vrstice s tremi, dvema in eno točko: \\((-3,0),(0,2),(3,0)\\), nato \\((-3/2,1),(3/2,1)\\) in na koncu \\((0,1)\\). Predzadnja vrstica je enaka prvi vrstici kvadratnega primera.', 'For the cubic curve \\((-3,-2)\\), \\((-3,2)\\), \\((3,2)\\), \\((3,-2)\\), the rows have three, two, and one point: \\((-3,0),(0,2),(3,0)\\), then \\((-3/2,1),(3/2,1)\\), and finally \\((0,1)\\). The second-to-last row equals the first row of the quadratic example.'),
                formulaIds: ['decasteljau-interpolation', 'decasteljau-curve-point'], learnerInteraction: 'observe',
                workedExampleId: 'decasteljau-cubic-midpoint',
                frames: [frame('decasteljau-cubic-explanation', 'explanation'), frame('decasteljau-cubic-calculation', 'calculation'), frame('decasteljau-cubic-observation', 'observation')],
                observationPrompt: text('Preštej točke v vsaki vrstici in poišči končno točko.', 'Count the points in each row and find the final point.'),
                expectedObservations: [text('Štiri začetne točke dajo vrstice s tremi, dvema in eno točko; končna točka je \\((0,1)\\).', 'Four starting points give rows of three, two, and one point; the final point is \\((0,1)\\).')],
                scene: decasteljauScene('decasteljau-cubic-half', bezierSymmetricFixture, 0.5, 'Kubična konstrukcija je pripravljena pri \\(t=0{,}5\\).', 'The cubic construction is prepared at \\(t=0.5\\).'),
            },
            {
                id: 'decasteljau-change-parameter', order: 5,
                title: text('Četrtina poti: \\(t=1/4\\)', 'A quarter of the way: \\(t=1/4\\)'),
                purpose: text('Razlikovanje spremembe položaja na krivulji od spremembe same krivulje.', 'The distinction between changing position on the curve and changing the curve itself.'),
                explanation: text('Ko spremeniš \\(t\\), se vmesne točke in končna točka premaknejo po isti konstrukciji kontrolnih točk. Pri \\(t=1/4\\) vrstice niso več sredine: prva vrstica je \\((-3,-1),(-3/2,2),(3,1)\\), končna točka pa \\((-33/16,1/4)\\). Kontrolne točke ostanejo na mestu.', 'When \\(t\\) changes, the intermediate and final points move through the same control-point construction. At \\(t=1/4\\) the rows are no longer midpoints: the first row is \\((-3,-1),(-3/2,2),(3,1)\\) and the final point is \\((-33/16,1/4)\\). The control points stay fixed.'),
                formulaIds: ['decasteljau-curve-point'], learnerInteraction: 'adjust-construction-parameter',
                workedExampleId: 'decasteljau-cubic-quarter',
                frames: [frame('decasteljau-change-parameter-explanation', 'explanation'), frame('decasteljau-change-parameter-calculation', 'calculation'), frame('decasteljau-change-parameter-observation', 'observation')],
                observationPrompt: text('Primerjaj končno točko pri \\(t=1/4\\) s tisto pri \\(t=1/2\\) in določi, katere točke se premaknejo.', 'Compare the final point at \\(t=1/4\\) with the one at \\(t=1/2\\) and determine which points move.'),
                expectedObservations: [text('Premaknejo se vse vmesne konstrukcijske točke in končna točka, ki je zdaj bliže \\(P_0\\); začetne kontrolne točke se ne.', 'All intermediate construction points and the final point move, and the final point is now closer to \\(P_0\\); the starting control points do not.')],
                scene: decasteljauScene('decasteljau-quarter', bezierSymmetricFixture, 0.25, 'Kubična konstrukcija je pripravljena pri \\(t=0{,}25\\).', 'The cubic construction is prepared at \\(t=0.25\\).'),
            },
            {
                id: 'decasteljau-three-quarter', order: 6,
                title: text('Tri četrtine poti: \\(t=3/4\\)', 'Three quarters of the way: \\(t=3/4\\)'),
                purpose: text('Primerjava dveh parametrov, ki nista sredina.', 'A comparison of two parameters that are not the midpoint.'),
                explanation: text('Pri \\(t=3/4\\) je prva vrstica \\((-3,1),(3/2,2),(3,-1)\\), končna točka pa \\((33/16,1/4)\\). Zaradi simetrije kontrolnih točk je cela konstrukcija zrcalna slika konstrukcije pri \\(t=1/4\\) čez os \\(y\\), vrstni red točk v vrsticah pa je obrnjen.', 'At \\(t=3/4\\) the first row is \\((-3,1),(3/2,2),(3,-1)\\) and the final point is \\((33/16,1/4)\\). By the symmetry of the control points the whole construction is the mirror image of the one at \\(t=1/4\\) across the \\(y\\)-axis, with the order of the points in each row reversed.'),
                formulaIds: ['decasteljau-interpolation', 'decasteljau-curve-point'], learnerInteraction: 'adjust-construction-parameter',
                workedExampleId: 'decasteljau-cubic-three-quarter',
                frames: [frame('decasteljau-three-quarter-explanation', 'explanation'), frame('decasteljau-three-quarter-calculation', 'calculation'), frame('decasteljau-three-quarter-observation', 'observation')],
                observationPrompt: text('Primerjaj končni točki pri \\(t=1/4\\) in \\(t=3/4\\).', 'Compare the final points at \\(t=1/4\\) and \\(t=3/4\\).'),
                expectedObservations: [text('Končni točki \\((-33/16,1/4)\\) in \\((33/16,1/4)\\) ležita na krivulji in sta simetrični; vrstice pri \\(t=3/4\\) so zrcalne slike vrstic pri \\(t=1/4\\) z obrnjenim vrstnim redom točk.', 'The final points \\((-33/16,1/4)\\) and \\((33/16,1/4)\\) lie on the curve and are symmetric; the rows at \\(t=3/4\\) are the mirror images of the rows at \\(t=1/4\\) with the point order reversed.')],
                scene: decasteljauScene('decasteljau-three-quarter', bezierSymmetricFixture, 0.75, 'Kubična konstrukcija je pripravljena pri \\(t=0{,}75\\).', 'The cubic construction is prepared at \\(t=0.75\\).'),
            },
            {
                id: 'decasteljau-free-exploration', order: 7,
                title: text('Kvartična krivulja in samostojna analiza', 'Quartic curve and independent analysis'),
                purpose: text('Povezava algoritma z interaktivnim grafom in numeričnim izračunom pri višji stopnji.', 'The relationship between the algorithm, interactive graph, and numerical evaluation at a higher degree.'),
                explanation: text('Privzeta kvartična krivulja s petimi točkami ima štiri vrstice; pri \\(t=1/2\\) se konstrukcija konča v točki \\((0,7/4)\\). Sistematična sprememba parametra \\(t\\) in prikaz celotne krivulje omogočata analizo vmesnih vrstic.', 'The default quartic curve with five points has four rows; at \\(t=1/2\\) the construction ends at \\((0,7/4)\\). Systematic variation of \\(t\\) and display of the whole curve allow analysis of the intermediate rows.'),
                formulaIds: ['decasteljau-interpolation', 'decasteljau-curve-point'], learnerInteraction: 'adjust-construction-parameter',
                workedExampleId: 'decasteljau-degree-four-midpoint',
                frames: [frame('decasteljau-free-exploration-explanation', 'explanation'), frame('decasteljau-free-exploration-calculation', 'calculation'), frame('decasteljau-free-exploration-observation', 'observation')],
                observationPrompt: text('Kateri del konstrukcije najbolje poveže numerični izračun z grafom?', 'Which part of the construction best relates the numerical evaluation to the graph?'),
                expectedObservations: [text('Pri vsakem \\(t\\) je zadnja točka na krivulji, vmesne vrstice pa razložijo, kako do nje pridemo.', 'For every \\(t\\) the final point is on the curve, while the intermediate rows explain how it is reached.')],
                scene: scene('decasteljau-default', [action('show-decasteljau-construction', true), action('set-decasteljau-parameter', 0.5)], 'Vrne se privzeta kvartična krivulja s petimi točkami pri \\(t=0{,}5\\).', 'The default quartic curve with five points returns at \\(t=0.5\\).'),
            },
        ],
        sources: [
            {
                id: 'stampar-thesis-decasteljau',
                citation: 'Štampar, Kevin. Orodje za grafični prikaz lastnosti Bézierjevih in PH krivulj, magistrsko delo, Univerza v Ljubljani, 2024, §2.4 (printed pp. 7–10).',
                supports: ['De Casteljau recursion', 'linear interpolation construction', 'geometric meaning of intermediate rows'],
                implementationCorrespondence: 'The thesis presents the full De Casteljau scheme and the current graph preserves those rows for visualization.',
            },
            {
                id: 'farin-decasteljau',
                citation: 'Farin, G. Curves and Surfaces for CAGD: A Practical Guide, 5th ed., Morgan Kaufmann, 2002.',
                supports: ['De Casteljau recursion', 'linear interpolation construction', 'equivalence with Bézier evaluation'],
                implementationCorrespondence: 'Bezeg retains the full rows through PolynomialBezierCurve.decasteljauScheme(t) for visible constructions.',
            },
            {
                id: 'bezeg-decasteljau-implementation',
                citation: 'Bezeg source: src/bezeg/impl/curve/polynomial-bezier-curve.ts and src/graphs/curves/bezier/DecasteljauGraph.tsx.',
                supports: ['default five-point scene', 't=0.5 default', 'partial curve and visible construction behavior'],
            },
        ],
        edgeCases: [
            text('Pri \\(t=0\\) ali \\(t=1\\) se vse interpolacije izberejo na enem krajišču; to je veljaven robni primer.', 'At \\(t=0\\) or \\(t=1\\) every interpolation selects one endpoint; this is a valid boundary case.'),
            text('Če se spremeni število kontrolnih točk, se spremeni število vrstic; runtime mora pri tem osvežiti pripravljeno sceno.', 'If the number of control points changes, the number of rows changes; the runtime must refresh the prepared scene.'),
        ],
        unresolvedQuestions: [
            text('Obstoječa stran ima tudi stikalo za celotno krivuljo in animacijo; runtime naj animacijo doda šele po preverjanju prekinitve.', 'The existing page also has full-curve and animation switches; the runtime should add animation only after cancellation is verified.'),
            text('Pred classroom-ready pregledom preveri, ali so oznake vmesnih točk razumljive pri projekciji.', 'Before classroom-ready review, check whether intermediate-point labels remain legible in projection mode.'),
        ],
    },
    {
        demonstrationId: 'ph-cubic',
        title: text('Kubična PH-krivulja', 'Cubic PH curve'),
        summary: text('Povezava med hodografom, odvodom, polinomsko hitrostjo in odmiki krivulje.', 'The relationship between the hodograph, derivative, polynomial speed, and curve offsets.'),
        prerequisites: [
            text('Potrebno je osnovno poznavanje Bézierjevih kontrolnih točk in odvoda parametrične krivulje.', 'Assumes familiarity with Bézier control points and the derivative of a parametric curve.'),
            text('Potrebno je poznavanje vektorjev oziroma kompleksne predstavitve ravnine.', 'Assumes familiarity with vectors or the complex representation of the plane.'),
        ],
        learningGoals: [
            text('Razložiš, kako generatorja \\(w_0\\) in \\(w_1\\) določita kubično PH-krivuljo.', 'Explain how the generators \\(w_0\\) and \\(w_1\\) determine a cubic PH curve.'),
            text('Povežeš kvadrat hodografa s polinomsko hitrostjo.', 'Connect the squared hodograph with polynomial speed.'),
            text('Analiziraš, kako znak in velikost odmika vplivata na prikazano odmično krivuljo.', 'Analyze how the sign and size of the offset affect the displayed offset curve.'),
        ],
        formulaBlocks: phFormulaBlocks,
        workedExamples: [
            {
                id: 'ph-default-control-points',
                title: text('Kontrolne točke iz hodografa lekcije', 'Control points from the lesson hodograph'),
                calculationLatex: 'P_0=(-2,-1),\\;w_0=2,\\;w_1=2+i:\\quad P_1=P_0+\\tfrac13w_0^2=\\left(-\\tfrac23,\\,-1\\right),\\;P_2=P_1+\\tfrac13w_0w_1=\\left(\\tfrac23,\\,-\\tfrac13\\right),\\;P_3=P_2+\\tfrac13w_1^2=\\left(\\tfrac53,\\,1\\right)',
                resultLatex: 'P_0=(-2,-1),\\;P_1=\\left(-\\tfrac23,-1\\right),\\;P_2=\\left(\\tfrac23,-\\tfrac13\\right),\\;P_3=\\left(\\tfrac53,1\\right)',
                check: text('Vrednosti so točni ulomki in jih izračuna tudi graf s phControlPoints (ph-math.ts).', 'The values are exact fractions and the graph computes them too with phControlPoints (ph-math.ts).'),
            },
            {
                id: 'ph-default-speed-at-half',
                title: text('Hitrost in dolžina loka', 'Speed and arc length'),
                calculationLatex: 'w(t)=2+it,\\;\\;w(\\tfrac12)=2+\\tfrac12i,\\;\\;\\|r\'(\\tfrac12)\\|=\\|w(\\tfrac12)\\|^2=4+\\tfrac14=\\tfrac{17}{4},\\;\\;L=\\int_0^1(4+t^2)\\,dt',
                resultLatex: '\\text{speed}(t)=4+t^2,\\quad \\text{speed}(\\tfrac12)=\\tfrac{17}{4},\\quad L=4+\\tfrac13=\\tfrac{13}{3}\\approx4.333',
                check: text('Dolžino loka \\(\\tfrac{13}{3}\\) prikaže tudi odčitek na grafu; polinomska hitrost omogoča integral brez numeričnega približka.', 'The graph shows the arc length \\(\\tfrac{13}{3}\\) in its readout; the polynomial speed allows an integral without numerical approximation.'),
            },
        ],
        steps: [
            {
                id: 'ph-introduction', order: 1,
                title: text('PH-krivulja: vhodni in izpeljani podatki', 'PH curve: input and derived data'),
                purpose: text('Vloga hodografa kot generatorja krivulje, ne zgolj kot dodatnega prikaza.', 'The hodograph as a curve generator rather than merely an additional plot.'),
                explanation: text('Pri kubični PH-krivulji začetna točka \\(P_0\\) in generatorja \\(w_0\\), \\(w_1\\) določijo odvod, iz odvoda pa se izračunajo kontrolne točke krivulje.', 'For a cubic PH curve, the start point \\(P_0\\) and generators \\(w_0\\), \\(w_1\\) determine the derivative, from which the curve control points are generated.'),
                formulaIds: ['ph-hodograph', 'ph-cubic-control-points'], learnerInteraction: 'observe',
                workedExampleId: 'ph-default-control-points',
                frames: [
                    frame('ph-introduction-explanation', 'explanation'),
                    frame('ph-introduction-calculation', 'calculation'),
                    frame('ph-introduction-observation', 'observation'),
                ],
                observationPrompt: text('Razvrsti podatke na vhodne in izpeljane količine ter z obrazcem izračunaj \\(P_1\\).', 'Classify the quantities as inputs or derived values and use the formula to calculate \\(P_1\\).'),
                expectedObservations: [text('\\(P_0\\), \\(w_0\\) in \\(w_1\\) so vhodni podatki; preostale kontrolne točke se izračunajo, na primer \\(P_1=P_0+\\tfrac13w_0^2=\\left(-\\tfrac23,\\,-1\\right)\\).', '\\(P_0\\), \\(w_0\\), and \\(w_1\\) are inputs; the remaining control points are derived, for example \\(P_1=P_0+\\tfrac13w_0^2=\\left(-\\tfrac23,\\,-1\\right)\\).')],
                scene: phCubicScene('ph-cubic-default', [], 'Scena vsebuje \\(P_0=\\left(-2,\\,-1\\right)\\), \\(w_0=\\left(2,\\,0\\right)\\) in \\(w_1=\\left(2,\\,1\\right)\\), torej \\(w_0=2\\) in \\(w_1=2+i\\); kontrolne točke so \\(\\left(-\\tfrac23,\\,-1\\right)\\), \\(\\left(\\tfrac23,\\,-\\tfrac13\\right)\\) in \\(\\left(\\tfrac53,\\,1\\right)\\).', 'The scene contains \\(P_0=\\left(-2,\\,-1\\right)\\), \\(w_0=\\left(2,\\,0\\right)\\), and \\(w_1=\\left(2,\\,1\\right)\\), so \\(w_0=2\\) and \\(w_1=2+i\\); the derived control points are \\(\\left(-\\tfrac23,\\,-1\\right)\\), \\(\\left(\\tfrac23,\\,-\\tfrac13\\right)\\), and \\(\\left(\\tfrac53,\\,1\\right)\\).'),
            },
            {
                id: 'ph-generator', order: 2,
                title: text('Kvadrat hodografa in hitrost', 'Squared hodograph and speed'),
                purpose: text('Povezava generatorjev z odvodom in polinomsko hitrostjo.', 'The relationship between the generators, derivative, and polynomial speed.'),
                explanation: text('Linearni hodograf \\(w(t)=2+it\\) se pri kompleksnem množenju kvadrira v \\(r\'(t)=(4-t^2)+4it\\). Dolžina odvoda je zato \\(\\|w(t)\\|^2=4+t^2\\), kar je polinom v \\(t\\).', 'The linear hodograph \\(w(t)=2+it\\) is squared by complex multiplication to obtain \\(r\'(t)=(4-t^2)+4it\\). Therefore \\(\\|w(t)\\|^2=4+t^2\\) is polynomial in \\(t\\).'),
                formulaIds: ['ph-hodograph', 'ph-polynomial-speed'], learnerInteraction: 'observe',
                workedExampleId: 'ph-default-speed-at-half',
                frames: [
                    frame('ph-generator-explanation', 'explanation'),
                    frame('ph-generator-calculation', 'calculation'),
                    frame('ph-generator-observation', 'observation'),
                ],
                observationPrompt: text('Pri \\(t=1/2\\) uporabi \\(w(1/2)=2+\\tfrac12i\\) za izračun hitrosti in primerjaj z označeno točko \\(r(\\tfrac12)\\).', 'At \\(t=1/2\\), use \\(w(1/2)=2+\\tfrac12i\\) to calculate the speed and compare with the marked point \\(r(\\tfrac12)\\).'),
                expectedObservations: [text('Hitrost je \\(\\tfrac{17}{4}=4{,}25\\), kvadrat dolžine srednjega hodografa; ker je hitrost \\(4+t^2\\), je dolžina loka \\(\\tfrac{13}{3}\\approx4{,}333\\), kar kaže tudi odčitek na grafu.', 'The speed is \\(\\tfrac{17}{4}=4.25\\), the squared length of the midpoint hodograph; since the speed is \\(4+t^2\\), the arc length is \\(\\tfrac{13}{3}\\approx4.333\\), which the readout on the graph also shows.')],
                scene: phCubicScene('ph-cubic-speed-scene', [action('show-evaluation-point', 0.5)], 'Označena je točka \\(r(\\tfrac12)=\\left(-\\tfrac1{24},\\,-\\tfrac12\\right)\\) osnovne krivulje.', 'The point \\(r(\\tfrac12)=\\left(-\\tfrac1{24},\\,-\\tfrac12\\right)\\) of the base curve is marked.'),
            },
            {
                id: 'ph-offsets', order: 3,
                title: text('Odmik krivulje', 'Curve offset'),
                purpose: text('Odmična krivulja kot geometrijska posledica PH-strukture.', 'The offset curve as a geometric consequence of the PH structure.'),
                explanation: text('Pri nespremenjeni osnovni krivulji je prikazan odmik z razdaljo \\(d=1\\). Pozitiven \\(d\\) premakne točko na desno od smeri potovanja, zato je odmik na začetku pod krivuljo: iz \\(\\left(-2,\\,-1\\right)\\) v \\(\\left(-2,\\,-2\\right)\\). Ker se krivulja povsod obrača v levo, je to zunanja stran in je odmik vedno regularen.', 'With the base curve unchanged, an offset at distance \\(d=1\\) is shown. A positive \\(d\\) moves the point to the right of the direction of travel, so the offset starts below the curve: from \\(\\left(-2,\\,-1\\right)\\) to \\(\\left(-2,\\,-2\\right)\\). Because the curve turns left everywhere, this is the outer side and the offset is always regular.'),
                formulaIds: ['ph-offset'],
                frames: [frame('ph-offsets-explanation', 'explanation'), frame('ph-offsets-observation', 'observation')],
                scene: phCubicScene('ph-offset-positive', [action('set-offset-distance', 1), action('show-offset-curve', true)], 'Prikazan je odmik pri \\(d=1\\), pod osnovno krivuljo.', 'The offset at \\(d=1\\) is shown, below the base curve.'),
                learnerInteraction: 'adjust-offset-distance',
                observationPrompt: text('Primerjaj navpični zamik točke odmika na levem koncu in pri \\(t=1\\), kjer je tangenta \\(r\'(1)=(3,4)\\). Ali je razdalja vzdolž normale povsod enaka?', 'Compare the vertical shift of the offset point at the left end and at \\(t=1\\), where the tangent is \\(r\'(1)=(3,4)\\). Is the distance along the normal the same everywhere?'),
                expectedObservations: [text('Vzdolž normale je razdalja povsod \\(1\\), navpični zamik pa ni: na levem koncu je \\(1\\), pri \\(t=1\\) pa \\(\\tfrac35\\), ker je tam normala \\(\\left(\\tfrac45,\\,-\\tfrac35\\right)\\).', 'Along the normal the distance is \\(1\\) everywhere, but the vertical shift is not: it is \\(1\\) at the left end and \\(\\tfrac35\\) at \\(t=1\\) because the normal there is \\(\\left(\\tfrac45,\\,-\\tfrac35\\right)\\).')],
            },
            {
                id: 'ph-offset-side', order: 4,
                title: text('Predznak odmika', 'Offset sign'),
                purpose: text('Analiziraj vpliv predznaka odmika pri nespremenjenih generatorjih.', 'Analyze the effect of the offset sign while keeping the generators fixed.'),
                explanation: text('Pri \\(d=-1\\) predznak izbere nasprotno stran: odmik leži nad krivuljo, na notranji strani zavoja. Polmer ukrivljenosti je \\(\\tfrac{(4+t^2)^2}{4}\\), torej med \\(4\\) in \\(\\tfrac{25}{4}\\), in je večji od \\(1\\), zato ostane odmik regularen; do ostrine bi prišlo šele pri \\(|d|\\ge4\\), kar je zunaj drsnika. Osnovna PH-krivulja in njena kontrolna geometrija ostaneta isti.', 'At \\(d=-1\\), the sign selects the opposite side: the offset lies above the curve, on the inner side of the bend. The radius of curvature is \\(\\tfrac{(4+t^2)^2}{4}\\), between \\(4\\) and \\(\\tfrac{25}{4}\\), and larger than \\(1\\), so the offset stays regular; a cusp would appear only at \\(|d|\\ge4\\), which is outside the slider. The base PH curve and its control geometry stay the same.'),
                formulaIds: ['ph-offset'],
                frames: [frame('ph-offset-side-explanation', 'explanation'), frame('ph-offset-side-observation', 'observation')],
                scene: phCubicScene('ph-offset-negative', [action('set-offset-distance', -1), action('show-offset-curve', true)], 'Prikazan je odmik pri \\(d=-1\\), nad osnovno krivuljo.', 'The offset at \\(d=-1\\) is shown, above the base curve.'),
                learnerInteraction: 'adjust-offset-distance',
                observationPrompt: text('Primerjaj odmika pri \\(d=1\\) in \\(d=-1\\): na kateri strani krivulje leži vsak in kaj ostane nespremenjeno?', 'Compare the offsets at \\(d=1\\) and \\(d=-1\\): which side of the curve does each lie on, and what stays unchanged?'),
                expectedObservations: [text('Odmik pri \\(d=1\\) leži pod krivuljo, pri \\(d=-1\\) nad njo, na notranji strani zavoja; osnovna krivulja ostane enaka.', 'The offset at \\(d=1\\) lies below the curve and at \\(d=-1\\) above it, on the inner side of the bend; the base curve remains the same.')],
            },
            {
                id: 'ph-hodograph-edit', order: 5,
                title: text('Vpliv premika generatorja', 'Effect of moving a generator'),
                purpose: text('Vpliv spremembe vhodnega hodografa na krivuljo.', 'The effect of changing the input hodograph on the curve.'),
                explanation: text('Premik \\(w_0\\) ali \\(w_1\\) na sekundarnem grafu povzroči ponovni izračun kontrolnih točk PH-krivulje in osvežitev odmika. Poskusi premakniti \\(w_1\\) v \\(2+2i\\): hitrost postane \\(4+4t^2\\), dolžina loka pa \\(\\tfrac{16}{3}\\approx5{,}333\\).', 'Moving \\(w_0\\) or \\(w_1\\) on the secondary graph recomputes the PH control points and refreshes the offset. Try moving \\(w_1\\) to \\(2+2i\\): the speed becomes \\(4+4t^2\\) and the arc length \\(\\tfrac{16}{3}\\approx5.333\\).'),
                formulaIds: ['ph-hodograph', 'ph-cubic-control-points'], learnerInteraction: 'drag-hodograph-point',
                frames: [frame('ph-hodograph-edit-explanation', 'explanation'), frame('ph-hodograph-edit-observation', 'observation')],
                observationPrompt: text('Opiši spremembe oblike krivulje, hodografa in odmika ter preveri odčitek dolžine loka pri \\(w_1=2+2i\\).', 'Describe the changes in the curve shape, hodograph, and offset, and check the arc-length readout at \\(w_1=2+2i\\).'),
                expectedObservations: [text('Sprememba generatorja spremeni izračunane kontrolne točke, odvod in zato tudi prikazani odmik; pri \\(w_1=2+2i\\) je dolžina loka \\(\\tfrac{16}{3}\\).', 'Changing a generator changes the derived control points, derivative, and therefore the displayed offset; at \\(w_1=2+2i\\) the arc length is \\(\\tfrac{16}{3}\\).')],
                scene: phCubicScene('ph-offset-after-edit', [action('set-offset-distance', 1), action('show-offset-curve', true)], 'Odmik pri \\(d=1\\) ostane viden med ročnim urejanjem hodografa.', 'The offset at \\(d=1\\) remains visible while the hodograph is edited manually.'),
            },
            {
                id: 'ph-free-exploration', order: 6,
                title: text('Samostojna analiza', 'Independent analysis'),
                purpose: text('Povezava vhodnih podatkov, hitrosti in odmikov v samostojni analizi.', 'The relationship between inputs, speed, and offsets in an independent analysis.'),
                explanation: text('Različni položaji \\(w_0\\), \\(w_1\\) in razdalje \\(d\\) omogočajo analizo, kateri deli ostanejo polinomski in kateri prikazi izhajajo iz odmične konstrukcije.', 'Different positions for \\(w_0\\), \\(w_1\\), and values of \\(d\\) allow analysis of which parts remain polynomial and which displays derive from the offset construction.'),
                formulaIds: ['ph-polynomial-speed'], learnerInteraction: 'drag-hodograph-point',
                frames: [frame('ph-free-exploration-explanation', 'explanation'), frame('ph-free-exploration-observation', 'observation')],
                observationPrompt: text('Izberi spremembo, ki jo lahko utemeljiš z enačbo za \\(w(t)\\) ali hitrost.', 'Choose a change that you can justify using the equation for \\(w(t)\\) or speed.'),
                expectedObservations: [text('Generatorja določata hitrost in obliko PH-krivulje; \\(d\\) določa prikazani odmik.', 'The generators determine the PH curve’s speed and shape; \\(d\\) determines the displayed offset.')],
            },
        ],
        sources: [
            {
                id: 'stampar-thesis-ph',
                citation: 'Štampar, Kevin. Orodje za grafični prikaz lastnosti Bézierjevih in PH krivulj, magistrsko delo, Univerza v Ljubljani, 2024, §§5.1–5.5 (printed pp. 29–34).',
                supports: ['hodograph definition', 'PH condition', 'polynomial speed', 'cubic PH control points'],
                implementationCorrespondence: 'Section 5.3 gives the cubic recurrence with the mixed term coefficient 1/3; the current model applies the same recurrence in phControlPoints (ph-math.ts).',
            },
            {
                id: 'farouki-ph',
                citation: 'Farouki, R. T. Pythagorean-Hodograph Curves: Algebra and Geometry Inseparable, Springer, 2008.',
                supports: ['PH hodograph representation', 'polynomial speed', 'offset-curve motivation'],
                implementationCorrespondence: 'The implementation uses complex-product formulas in src/bezeg/impl/curve/ph-bezier-curve.ts and exposes the hodograph in BasePhBezierCurveGraph.',
            },
            {
                id: 'bezeg-ph-implementation',
                citation: 'Bezeg source: src/bezeg/impl/curve/ph-bezier-curve.ts, src/graphs/curves/ph/CubicPhBezierCurveGraph.tsx, and src/graphs/curves/object/JXGPHBezierCurve.ts.',
                supports: ['lesson-fixture P₀,w₀,w₁', 'derived cubic control points', 'offset distance and visibility controls'],
            },
        ],
        edgeCases: [
            text('Če hodograf izgine oziroma je \\(w(t)=0\\), regularnost in normalna smer odmika nista zagotovljeni.', 'If the hodograph vanishes so that \\(w(t)=0\\), regularity and a normal offset direction are not guaranteed.'),
            text('Odmična konstrukcija uporablja racionalne krivulje; pri ničelnem imenovalcu lahko nastane nedoločen prikaz, ki ga runtime ne sme skriti.', 'The offset construction uses rational curves; a zero denominator can make the display undefined, which the runtime must not hide.'),
            text('Odmik na notranji strani zavoja postane ostan, ko je \\(|d|\\) vsaj enak polmeru ukrivljenosti. Pri tej krivulji je najmanjši polmer \\(4\\), zato bi do tega prišlo šele pri \\(|d|\\ge4\\), zunaj območja drsnika \\([-3,3]\\).', 'An offset on the inner side of a bend becomes singular once \\(|d|\\) reaches the radius of curvature. For this curve the smallest radius is \\(4\\), so this would happen only at \\(|d|\\ge4\\), outside the slider range \\([-3,3]\\).'),
            text('Vrednosti v worked example so točni ulomki; zaokrožene vrednosti, na primer \\(4{,}333\\), so le izpis na grafu.', 'Worked-example values are exact fractions; rounded values such as \\(4.333\\) are only the graph readout.'),
        ],
        unresolvedQuestions: [
            text('Lastnik oziroma predmetni strokovnjak naj potrdi, ali je kompleksna notacija primerna za ciljno starost učencev.', 'The owner or subject-matter reviewer should confirm whether complex notation fits the target students.'),
            text('Pred classroom-ready pregledom je treba preveriti, ali naj se pri projekciji najprej prikaže sekundarni hodograf ali odmik.', 'Before classroom-ready review, decide whether projection mode should introduce the secondary hodograph or the offset first.'),
        ],
    },
];

const lessonByDemonstration = new Map(pilotGuidedLessons.map(lesson => [lesson.demonstrationId, lesson]));
const allLessonByDemonstration = new Map([...pilotGuidedLessons, ...additionalGuidedLessons, ...expansionGuidedLessons, ...foundationGuidedLessons, ...parameterizationGuidedLessons, ...constructionGuidedLessons, ...rationalConstructionGuidedLessons, ...splineGuidedLessons, ...functionGuidedLessons, ...analysisGuidedLessons].map(lesson => [lesson.demonstrationId, lesson]));

/** Returns static content without resolving or freezing a locale. */
export function getPilotGuidedLesson(demonstrationId: 'bezier' | 'decasteljau' | 'ph-cubic'): GuidedLesson | undefined {
    return lessonByDemonstration.get(demonstrationId);
}

/** Returns content that has passed the static content and graph-capability review gate. */
export function getGuidedLesson(demonstrationId: DemonstrationId): GuidedLesson | undefined {
    return allLessonByDemonstration.get(demonstrationId);
}
