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
import type {FunctionChoiceName, FunctionParameterName, FunctionVisibilityTarget, LessonAnimationId} from '../model';
import {additionalGuidedLessons} from './additionalGuidedLessons';
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
 * These names correspond to existing graph-wrapper methods:
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
 * - set-bernstein-degree -> BernsteinGraph's graph-owned degree action (integer 0-5)
 * - show-bernstein-stacked-area -> BernsteinGraph's graph-owned stacked-area view
 * - set-parameterization-alpha / -samples / -mode -> AlphaParam and UniformParam graph-owned parameterization actions (alpha in [0,1], integer samples 0-50, route bounds enforced by the graph, mode weighted|uniform)
 * - set-subdivision-parameter / subdivide -> SubdivisionGraph1 (and rational) parameter t in [0.01,0.99] and one split; on repeated-subdivision, subdivide is one halving step (at most 5)
 * - set-extrapolation-parameter / extrapolate -> ExtrapolationGraph (and rational) parameter t in [1,1.5] and one extrapolation
 * - show-spline-labels / hide-spline-fixed-points -> spline graphs' point-label and fixed-point display switches (boolean)
 * - set-spline-continuity / set-spline-degree -> OneSidedCnSplineGraph continuity r and degree n (integers; route bounds enforced by the graph)
 * - set-spline-beta -> G1 spline graphs' b/beta slider, value {index, value} (index is a non-negative integer; range enforced by the graph)
 * - show-farin-points / set-standard-form / set-rational-weights -> FarinPointsCurveGraph display, standard-form switch and weight vector (one positive finite weight per control point)
 * - set-circle-pieces -> RationalBezierCurveCircleGraphN piece counter (integer; route bounds enforced by the graph)
 * - affine transform names -> AffineTransformBezierCurveGraph's graph-owned operations
 * - show-function-element -> function graphs' optional elements (value {name, value}: name is a FunctionVisibilityTarget, value a boolean)
 * - set-function-choice -> function graphs' named choices, value {name, value} (name is a FunctionChoiceName, value one of the strings allowed for that name; the graph maps it)
 * - set-function-parameter -> function graphs' synchronous parameter model, value {name, value} (name is a FunctionParameterName; the graph enforces its own domain)
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

export type LessonScene = Readonly<{
    id: string;
    basedOn: 'demonstration-default';
    actions: readonly SceneAction[];
    expectedState: LocalizedText;
}>;

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
                calculationLatex: 'P_0=(-4,-3),\\;P_1=(-3,2),\\;P_2=(2,2),\\;P_3=(3,-2)',
                resultLatex: 'B(1/2)=\\frac18(P_0+3P_1+3P_2+P_3)=(-1/2,7/8)',
                check: text(
                    'Neodvisen izračun potrdi rezultat; premik kontrolne točke spremeni tudi vrednost v tej točki.',
                    'An independent calculation confirms the result; moving a control point changes the evaluated point as well.',
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
                scene: scene('bezier-default', [], 'Privzeta kubična krivulja z 4 kontrolnimi točkami.', 'The default cubic curve with 4 control points.'),
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
                scene: scene('bezier-control-polygon-and-hull', [action('show-control-polygon', true), action('show-convex-hull', true)], 'Prikažeta se kontrolni poligon in konveksna ovojnica.', 'The control polygon and convex hull are shown.'),
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
                frames: [frame('bezier-endpoints-explanation', 'explanation'), frame('bezier-endpoints-observation', 'observation')],
                observationPrompt: text('Premakni \\(P_1\\) ali \\(P_2\\) ter opiši, kaj se spremeni in kaj ostane nespremenjeno.', 'Move \\(P_1\\) or \\(P_2\\) and describe what changes and what remains invariant.'),
                expectedObservations: [text('Oblika krivulje se spremeni, krajišči pri \\(P_0\\) in \\(P_3\\) pa ostaneta enaki.', 'The shape changes, while the endpoints at \\(P_0\\) and \\(P_3\\) stay the same.')],
            },
            {
                id: 'bezier-evaluation', order: 4,
                title: text('Izračun pri \\(t=1/2\\)', 'Evaluate at \\(t=1/2\\)'),
                purpose: text('Primerjava analitičnega izračuna z označeno točko na krivulji.', 'A comparison between the analytical evaluation and the marked point on the curve.'),
                explanation: text(
                    'Za privzete točke je \\(B(1/2)=(-1/2,7/8)\\). To je utežena vsota vseh štirih kontrolnih točk, ne njihovo aritmetično povprečje.',
                    'For the default points, \\(B(1/2)=(-1/2,7/8)\\). It is a weighted sum of all four control points, not their arithmetic mean.',
                ),
                formulaIds: ['bezier-bernstein-form'],
                frames: [frame('bezier-evaluation-explanation', 'explanation'), frame('bezier-evaluation-calculation', 'calculation'), frame('bezier-evaluation-observation', 'observation')],
                workedExampleId: 'bezier-cubic-midpoint',
                scene: scene('bezier-evaluation-point', [action('show-evaluation-point', 0.5)], 'Na krivulji je označena točka \\(B(\\tfrac{1}{2})\\).', 'The point \\(B(\\tfrac{1}{2})\\) is marked on the curve.'),
                learnerInteraction: 'observe',
                observationPrompt: text('Preveri, ali izračunana točka leži v konveksni ovojnici kontrolnih točk.', 'Verify whether the evaluated point lies in the convex hull of the control points.'),
                expectedObservations: [text('Točka je na krivulji in znotraj konveksne ovojnice.', 'The point is on the curve and inside the convex hull.')],
            },
            {
                id: 'bezier-influence', order: 5,
                title: text('Vpliv premika', 'Effect of a move'),
                purpose: text('Lokalna geometrijska sprememba brez enega vnaprej določenega odgovora.', 'A local geometric change without a single predetermined answer.'),
                explanation: text(
                    'Premik notranje kontrolne točke spremeni krivuljo, kontrolni poligon in konveksno ovojnico; primerjava teh objektov pokaže lokalni vpliv točke.',
                    'Moving an interior control point changes the curve, control polygon, and convex hull; comparing these objects reveals the point’s local influence.',
                ),
                formulaIds: ['bezier-convex-hull'], learnerInteraction: 'drag-control-point',
                frames: [frame('bezier-influence-explanation', 'explanation'), frame('bezier-influence-observation', 'observation')],
                observationPrompt: text('Opiši, kako se sprememba položaja kontrolne točke odrazi na krivulji.', 'Describe how changing a control point affects the curve.'),
                expectedObservations: [text('Krivulja ostane povezana s krajiščema, njen potek pa sledi novi ovojnici.', 'The curve remains attached to its endpoints, while its path follows the new hull.')],
                scene: scene('bezier-exploration', [action('show-control-polygon', true), action('show-convex-hull', true)], 'Za raziskovanje sta vidna poligon in ovojnica.', 'The polygon and hull remain visible for exploration.'),
            },
            {
                id: 'bezier-free-exploration', order: 6,
                title: text('Samostojna analiza', 'Independent analysis'),
                purpose: text('Uporaba obravnavanih lastnosti v poljubni nastavitvi grafa.', 'Application of the properties discussed to an arbitrary graph configuration.'),
                explanation: text('V poljubni nastavitvi so vidni krajišči, konveksna ovojnica in vpliv kontrolnih točk na obliko krivulje.', 'An arbitrary configuration makes the endpoints, convex hull, and influence of the control points on the curve shape visible.'),
                formulaIds: ['bezier-endpoints', 'bezier-convex-hull'], learnerInteraction: 'observe',
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
                explanation: text('De Casteljaujeva konstrukcija vsako vrstico zgradi z linearno interpolacijo sosednjih točk pri istem \\(t\\).', 'De Casteljau’s construction builds each row by linearly interpolating neighboring points at the same \\(t\\).'),
                formulaIds: ['decasteljau-interpolation'], learnerInteraction: 'observe',
                frames: [frame('decasteljau-introduction-explanation', 'explanation'), frame('decasteljau-introduction-observation', 'observation')],
                animation: {animationId: 'decasteljau'},
                observationPrompt: text('Določi število novih točk v prvi interpolacijski vrstici.', 'Determine the number of new points in the first interpolation row.'),
                expectedObservations: [text('Pri petih začetnih točkah nastanejo štiri točke v prvi novi vrstici.', 'With five starting points, four points appear in the first new row.')],
                scene: scene('decasteljau-default', [action('show-decasteljau-construction', true), action('set-decasteljau-parameter', 0.5)], 'Konstrukcija je pripravljena pri \\(t=0{,}5\\); animacija lahko pokaže prehod od \\(t=0\\) do \\(t=1\\).', 'The construction is prepared at \\(t=0.5\\); replay can show the transition from \\(t=0\\) to \\(t=1\\).'),
            },
            {
                id: 'decasteljau-one-step', order: 2,
                title: text('Ena interpolacijska vrstica', 'One interpolation row'),
                purpose: text('Povezava interpolacijske formule z vidnimi odseki med točkami.', 'The relationship between the interpolation formula and the visible segments between points.'),
                explanation: text('Za vsak sosednji par \\(P_i\\) in \\(P_{i+1}\\) se izračuna interpolirana točka \\((1-t)P_i+tP_{i+1}\\); pri \\(t=1/2\\) rezultat predstavlja sredino odseka.', 'For each neighboring pair \\(P_i\\) and \\(P_{i+1}\\), the interpolated point is \\((1-t)P_i+tP_{i+1}\\); at \\(t=1/2\\), this point is the segment midpoint.'),
                formulaIds: ['decasteljau-interpolation'], learnerInteraction: 'adjust-construction-parameter',
                frames: [frame('decasteljau-one-step-explanation', 'explanation'), frame('decasteljau-one-step-observation', 'observation')],
                observationPrompt: text('Pri \\(t=1/2\\) preveri, ali prve vmesne točke sovpadajo s sredinami odsekov.', 'At \\(t=1/2\\), verify whether the first intermediate points coincide with the segment midpoints.'),
                expectedObservations: [text('Prva vrstica je sestavljena iz sredin štirih sosednjih odsekov.', 'The first row consists of the midpoints of the four neighboring segments.')],
                scene: scene('decasteljau-first-row', [action('show-decasteljau-construction', true), action('set-decasteljau-parameter', 0.5)], 'Parameter ostane pri \\(t=0{,}5\\), da lahko primerjaš sredine.', 'The parameter stays at \\(t=0.5\\) for midpoint comparison.'),
            },
            {
                id: 'decasteljau-final-point', order: 3,
                title: text('Končna točka je \\(B(t)\\)', 'The final point is \\(B(t)\\)'),
                purpose: text('Utemeljitev, zakaj zadnja vrstica določi točko na krivulji.', 'Why the final row determines a point on the curve.'),
                explanation: text('Ko se število točk po vrsticah zmanjša na eno, dobimo \\(P_0^{(n)}(t)=B(t)\\). Konstrukcija zato ni le približek.', 'When the rows reduce to one point, we get \\(P_0^{(n)}(t)=B(t)\\). The construction is therefore not merely an approximation.'),
                formulaIds: ['decasteljau-curve-point'], learnerInteraction: 'observe',
                frames: [frame('decasteljau-final-point-explanation', 'explanation'), frame('decasteljau-final-point-observation', 'observation')],
                observationPrompt: text('Preveri, ali zadnja točka konstrukcije leži na krivulji.', 'Verify whether the final construction point lies on the curve.'),
                expectedObservations: [text('Da; pri privzetem \\(t=0,5\\) je zadnja točka \\((0,7/4)\\).', 'Yes; at the default \\(t=0.5\\) the final point is \\((0,7/4)\\).')],
                scene: scene('decasteljau-final-point', [action('show-decasteljau-construction', true), action('set-decasteljau-parameter', 0.5)], 'Končna konstrukcijska točka je poudarjena pri \\(t=0{,}5\\).', 'The final construction point is highlighted at \\(t=0.5\\).'),
            },
            {
                id: 'decasteljau-change-parameter', order: 4,
                title: text('Spreminjanje parametra \\(t\\)', 'Varying the parameter \\(t\\)'),
                purpose: text('Razlikovanje spremembe položaja na krivulji od spremembe same krivulje.', 'The distinction between changing position on the curve and changing the curve itself.'),
                explanation: text('Ko spremeniš \\(t\\), se vmesne točke in končna točka premaknejo po isti konstrukciji kontrolnih točk. Kontrolne točke ostanejo na mestu.', 'When \\(t\\) changes, the intermediate and final points move through the same control-point construction. The control points stay fixed.'),
                formulaIds: ['decasteljau-curve-point'], learnerInteraction: 'adjust-construction-parameter',
                frames: [frame('decasteljau-change-parameter-explanation', 'explanation'), frame('decasteljau-change-parameter-observation', 'observation')],
                observationPrompt: text('Primerjaj \\(t=1/4\\) in \\(t=3/4\\) ter določi, katere točke se premaknejo.', 'Compare \\(t=1/4\\) and \\(t=3/4\\) and determine which points move.'),
                expectedObservations: [text('Premaknejo se vse vmesne konstrukcijske točke in končna točka; začetne kontrolne točke se ne.', 'All intermediate construction points and the final point move; the starting control points do not.')],
                scene: scene('decasteljau-quarter', [action('show-decasteljau-construction', true), action('set-decasteljau-parameter', 0.25)], 'Konstrukcija je pripravljena pri \\(t=0{,}25\\).', 'The construction is prepared at \\(t=0.25\\).'),
            },
            {
                id: 'decasteljau-reconstruct', order: 5,
                title: text('Numerično preverjanje', 'Numerical verification'),
                purpose: text('Skladnost numeričnega izračuna z vidno konstrukcijo.', 'The consistency of the numerical calculation with the visible construction.'),
                explanation: text('Pri \\(t=1/2\\) se ena vrstica nadaljuje do \\((0,7/4)\\); pri \\(t=1/4\\) konstrukcija določi novo končno točko.', 'At \\(t=1/2\\), one row continues to \\((0,7/4)\\); at \\(t=1/4\\), the construction determines a new final point.'),
                formulaIds: ['decasteljau-interpolation', 'decasteljau-curve-point'], learnerInteraction: 'adjust-construction-parameter',
                frames: [frame('decasteljau-reconstruct-explanation', 'explanation'), frame('decasteljau-reconstruct-observation', 'observation')],
                observationPrompt: text('Identificiraj korak konstrukcije, ki ustreza tvojemu izračunu.', 'Identify the construction step corresponding to your calculation.'),
                expectedObservations: [text('Vsaka vrstica uporabi isti \\(t\\), zadnja pa da točko na krivulji.', 'Every row uses the same \\(t\\), and the last one gives a point on the curve.')],
                scene: scene('decasteljau-half', [action('show-decasteljau-construction', true), action('set-decasteljau-parameter', 0.5)], 'Konstrukcija je vrnjena na \\(t=0{,}5\\) za preverjanje primera.', 'The construction is returned to \\(t=0.5\\) to check the example.'),
            },
            {
                id: 'decasteljau-free-exploration', order: 6,
                title: text('Samostojna analiza', 'Independent analysis'),
                purpose: text('Povezava algoritma z interaktivnim grafom in numeričnim izračunom.', 'The relationship between the algorithm, interactive graph, and numerical evaluation.'),
                explanation: text('Sistematična sprememba parametra \\(t\\) in prikaz celotne krivulje omogočata analizo vmesnih vrstic konstrukcije.', 'Systematic variation of \\(t\\) and display of the whole curve allow analysis of the intermediate construction rows.'),
                formulaIds: ['decasteljau-interpolation', 'decasteljau-curve-point'], learnerInteraction: 'adjust-construction-parameter',
                frames: [frame('decasteljau-free-exploration-explanation', 'explanation'), frame('decasteljau-free-exploration-observation', 'observation')],
                observationPrompt: text('Kateri del konstrukcije najbolje poveže numerični izračun z grafom?', 'Which part of the construction best relates the numerical evaluation to the graph?'),
                expectedObservations: [text('Pri vsakem \\(t\\) je zadnja točka na krivulji, vmesne vrstice pa razložijo, kako do nje pridemo.', 'For every \\(t\\) the final point is on the curve, while the intermediate rows explain how it is reached.')],
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
                title: text('Kontrolne točke iz privzetega hodografa', 'Control points from the default hodograph'),
                calculationLatex: 'P_0=(-4.2,-2),\\;w_0=(-3.5,-1.7),\\;w_1=(-2.6,1.7)',
                resultLatex: 'P_1\\approx(-1.08,1.9667),\\;P_2\\approx(2.9167,1.4567),\\;P_3\\approx(4.2067,-1.49)',
                check: text('Vrednosti so zaokrožene; graf uporablja iste izračune kot phControlPoints (ph-math.ts).', 'Values are rounded; the graph uses the same calculations as phControlPoints (ph-math.ts).'),
            },
            {
                id: 'ph-default-speed-at-half',
                title: text('Hitrost pri \\(t=1/2\\)', 'Speed at \\(t=1/2\\)'),
                calculationLatex: 'w(1/2)=(-3.05,0),\\qquad \\|r\'(1/2)\\|=\\|w(1/2)\\|^2=9.3025',
                resultLatex: '\\text{speed}(1/2)=9.3025',
                check: text('Pri privzetih generatorjih je srednji hodograf vodoraven; hitrost je kvadrat njegove norme.', 'With the default generators the midpoint hodograph is horizontal; speed is the square of its norm.'),
            },
        ],
        steps: [
            {
                id: 'ph-introduction', order: 1,
                title: text('PH-krivulja: vhodni in izpeljani podatki', 'PH curve: input and derived data'),
                purpose: text('Vloga hodografa kot generatorja krivulje, ne zgolj kot dodatnega prikaza.', 'The hodograph as a curve generator rather than merely an additional plot.'),
                explanation: text('Pri kubični PH-krivulji začetna točka \\(P_0\\) in generatorja \\(w_0\\), \\(w_1\\) določijo odvod, iz odvoda pa se izračunajo kontrolne točke krivulje.', 'For a cubic PH curve, the start point \\(P_0\\) and generators \\(w_0\\), \\(w_1\\) determine the derivative, from which the curve control points are generated.'),
                formulaIds: ['ph-hodograph', 'ph-cubic-control-points'], learnerInteraction: 'observe',
                frames: [
                    {...frame('ph-introduction-explanation', 'explanation'), formulaIds: ['ph-hodograph']},
                    {...frame('ph-introduction-control-points', 'explanation'), formulaIds: ['ph-cubic-control-points']},
                    frame('ph-introduction-observation', 'observation'),
                ],
                observationPrompt: text('Razvrsti podatke na vhodne in izpeljane količine.', 'Classify the quantities as inputs or derived values.'),
                expectedObservations: [text('\\(P_0\\), \\(w_0\\) in \\(w_1\\) so vhodni podatki; preostale kontrolne točke se izračunajo.', '\\(P_0\\), \\(w_0\\), and \\(w_1\\) are inputs; the remaining control points are derived.')],
                scene: scene('ph-cubic-default', [], 'Privzeta scena vsebuje \\(P_0=\\left(-4{,}2,\\,-2\\right)\\), \\(w_0=\\left(-3{,}5,\\,-1{,}7\\right)\\) in \\(w_1=\\left(-2{,}6,\\,1{,}7\\right)\\).', 'The default scene contains \\(P_0=\\left(-4.2,\\,-2\\right)\\), \\(w_0=\\left(-3.5,\\,-1.7\\right)\\), and \\(w_1=\\left(-2.6,\\,1.7\\right)\\).'),
            },
            {
                id: 'ph-generator', order: 2,
                title: text('Kvadrat hodografa in hitrost', 'Squared hodograph and speed'),
                purpose: text('Povezava generatorjev z odvodom in polinomsko hitrostjo.', 'The relationship between the generators, derivative, and polynomial speed.'),
                explanation: text('Linearni hodograf \\(w(t)\\) se pri kompleksnem množenju kvadrira v \\(r\'(t)\\). Dolžina odvoda je zato \\(\\|w(t)\\|^2\\), kar je polinom v \\(t\\).', 'The linear hodograph \\(w(t)\\) is squared by complex multiplication to obtain \\(r\'(t)\\). Therefore \\(\\|w(t)\\|^2\\) is polynomial in \\(t\\).'),
                formulaIds: ['ph-hodograph', 'ph-polynomial-speed'], learnerInteraction: 'observe',
                frames: [
                    {...frame('ph-generator-explanation', 'explanation'), formulaIds: ['ph-hodograph']},
                    {...frame('ph-generator-speed', 'explanation'), formulaIds: ['ph-polynomial-speed']},
                    frame('ph-generator-observation', 'observation'),
                ],
                observationPrompt: text('Pri \\(t=1/2\\) uporabi \\(w(1/2)=(-3,05,0)\\) za izračun hitrosti.', 'At \\(t=1/2\\), use \\(w(1/2)=(-3.05,0)\\) to calculate the speed.'),
                expectedObservations: [text('Hitrost je 9,3025, torej kvadrat dolžine srednjega hodografa.', 'The speed is 9.3025, the squared length of the midpoint hodograph.')],
            },
            {
                id: 'ph-offsets', order: 3,
                title: text('Odmik krivulje', 'Curve offset'),
                purpose: text('Odmična krivulja kot geometrijska posledica PH-strukture.', 'The offset curve as a geometric consequence of the PH structure.'),
                explanation: text('Pri nespremenjeni osnovni krivulji je prikazan odmik z razdaljo \\(d=0,2\\). Odmik je izračunan iz krivulje in njenega hodografa.', 'With the base curve unchanged, an offset at distance \\(d=0.2\\) is shown. The offset is computed from the curve and its hodograph.'),
                formulaIds: ['ph-hodograph'],
                frames: [frame('ph-offsets-explanation', 'explanation'), frame('ph-offsets-observation', 'observation')],
                scene: scene('ph-offset-positive', [action('set-offset-distance', 0.2), action('show-offset-curve', true)], 'Prikazan je odmik pri \\(d=0{,}2\\).', 'The offset at \\(d=0.2\\) is shown.'),
                learnerInteraction: 'adjust-offset-distance',
                observationPrompt: text('Preveri, ali je odmična krivulja na zaslonu povsod videti enako oddaljena.', 'Verify whether the offset curve appears equally distant everywhere on the screen.'),
                expectedObservations: [text('V rednem delu krivulje odmik sledi osnovni krivulji; prikaz uporablja izračunano odmično konstrukcijo.', 'On the regular part of the curve the offset follows the base curve; the display uses the computed offset construction.')],
            },
            {
                id: 'ph-offset-side', order: 4,
                title: text('Predznak odmika', 'Offset sign'),
                purpose: text('Analiziraj vpliv predznaka odmika pri nespremenjenih generatorjih.', 'Analyze the effect of the offset sign while keeping the generators fixed.'),
                explanation: text('Pri \\(d=-0,2\\) predznak izbere nasprotno stran odmika, osnovna PH-krivulja in njena kontrolna geometrija pa ostaneta isti.', 'At \\(d=-0.2\\), the sign selects the opposite offset side, while the base PH curve and its control geometry stay the same.'),
                formulaIds: [],
                frames: [frame('ph-offset-side-explanation', 'explanation'), frame('ph-offset-side-observation', 'observation')],
                scene: scene('ph-offset-negative', [action('set-offset-distance', -0.2), action('show-offset-curve', true)], 'Prikazan je odmik pri \\(d=-0{,}2\\).', 'The offset at \\(d=-0.2\\) is shown.'),
                learnerInteraction: 'adjust-offset-distance',
                observationPrompt: text('Primerjaj obe predznačeni vrednosti in določi, kaj se spremeni ter kaj ostane nespremenjeno.', 'Compare the two signed values and determine what changes and what remains unchanged.'),
                expectedObservations: [text('Spremeni se stran oziroma položaj odmika; osnovna krivulja ostane enaka.', 'The offset side or position changes; the base curve remains the same.')],
            },
            {
                id: 'ph-hodograph-edit', order: 5,
                title: text('Vpliv premika generatorja', 'Effect of moving a generator'),
                purpose: text('Vpliv spremembe vhodnega hodografa na krivuljo.', 'The effect of changing the input hodograph on the curve.'),
                explanation: text('Premik \\(w_0\\) ali \\(w_1\\) na sekundarnem grafu povzroči ponovni izračun kontrolnih točk PH-krivulje in osvežitev odmika.', 'Moving \\(w_0\\) or \\(w_1\\) on the secondary graph recomputes the PH control points and refreshes the offset.'),
                formulaIds: ['ph-hodograph', 'ph-cubic-control-points'], learnerInteraction: 'drag-hodograph-point',
                frames: [frame('ph-hodograph-edit-explanation', 'explanation'), frame('ph-hodograph-edit-observation', 'observation')],
                observationPrompt: text('Opiši spremembe oblike krivulje, hodografa in odmika.', 'Describe the changes in the curve shape, hodograph, and offset.'),
                expectedObservations: [text('Sprememba generatorja spremeni izračunane kontrolne točke, odvod in zato tudi prikazani odmik.', 'Changing a generator changes the derived control points, derivative, and therefore the displayed offset.')],
                scene: scene('ph-offset-after-edit', [action('show-offset-curve', true)], 'Odmik ostane viden med ročnim urejanjem hodografa.', 'The offset remains visible while the hodograph is edited manually.'),
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
                supports: ['default P₀,w₀,w₁', 'derived cubic control points', 'offset distance and visibility controls'],
            },
        ],
        edgeCases: [
            text('Če hodograf izgine oziroma je \\(w(t)=0\\), regularnost in normalna smer odmika nista zagotovljeni.', 'If the hodograph vanishes so that \\(w(t)=0\\), regularity and a normal offset direction are not guaranteed.'),
            text('Odmična konstrukcija uporablja racionalne krivulje; pri ničelnem imenovalcu lahko nastane nedoločen prikaz, ki ga runtime ne sme skriti.', 'The offset construction uses rational curves; a zero denominator can make the display undefined, which the runtime must not hide.'),
            text('Vrednosti v worked example so zaokrožene in niso nadomestilo za preverjanje v produkcijskem grafu.', 'Worked-example values are rounded and are not a substitute for checking the production graph.'),
        ],
        unresolvedQuestions: [
            text('Lastnik oziroma predmetni strokovnjak naj potrdi, ali je kompleksna notacija primerna za ciljno starost učencev.', 'The owner or subject-matter reviewer should confirm whether complex notation fits the target students.'),
            text('Pred classroom-ready pregledom je treba preveriti, ali naj se pri projekciji najprej prikaže sekundarni hodograf ali odmik.', 'Before classroom-ready review, decide whether projection mode should introduce the secondary hodograph or the offset first.'),
        ],
    },
];

const lessonByDemonstration = new Map(pilotGuidedLessons.map(lesson => [lesson.demonstrationId, lesson]));
const allLessonByDemonstration = new Map([...pilotGuidedLessons, ...additionalGuidedLessons, ...expansionGuidedLessons, ...foundationGuidedLessons, ...parameterizationGuidedLessons, ...constructionGuidedLessons, ...rationalConstructionGuidedLessons, ...splineGuidedLessons, ...functionGuidedLessons].map(lesson => [lesson.demonstrationId, lesson]));

/** Returns static content without resolving or freezing a locale. */
export function getPilotGuidedLesson(demonstrationId: 'bezier' | 'decasteljau' | 'ph-cubic'): GuidedLesson | undefined {
    return lessonByDemonstration.get(demonstrationId);
}

/** Returns content that has passed the static content and graph-capability review gate. */
export function getGuidedLesson(demonstrationId: DemonstrationId): GuidedLesson | undefined {
    return allLessonByDemonstration.get(demonstrationId);
}
