import type {DemonstrationId} from '../../demonstrations';
import {FUNCTION_CHOICE_NAMES, FUNCTION_CHOICE_VALUES, FUNCTION_PARAMETER_NAMES, FUNCTION_VISIBILITY_TARGETS} from '../model';
import type {FunctionChoiceName, FunctionParameterName, FunctionVisibilityTarget, LessonAction, LessonDefinition, LocalizedText, LessonFrame} from '../model';
import {getGuidedLesson, SceneAction} from '../content/guidedLessons';
import type {GuidedLessonFrame, GuidedLessonStep} from '../content/guidedLessons';

/**
 * The value of a scene action that carries a number. Only the shape is checked here: the range belongs to the graph that
 * applies the action, and `sceneContentAgainstGraphs.test.tsx` applies all authored content to the real graphs, so the
 * limits are defined once, by the module that enforces them.
 */
function finiteNumber(action: SceneAction): number {
    if (typeof action.value !== 'number' || !Number.isFinite(action.value)) {
        throw new Error(`The scene action “${action.name}” needs a finite number value.`);
    }
    return action.value;
}

function integerValue(action: SceneAction): number {
    if (typeof action.value !== 'number' || !Number.isInteger(action.value)) {
        throw new Error(`The scene action “${action.name}” needs an integer value.`);
    }
    return action.value;
}

/** Translates a content scene action into the typed action a graph applies, checking the value's type and shape. */
export function sceneAction(action: SceneAction): LessonAction {
    if (action.name === 'show-control-polygon' && typeof action.value === 'boolean') {
        return {kind: 'curve-visibility', target: 'control-polygon', visible: action.value};
    }
    if (action.name === 'show-convex-hull' && typeof action.value === 'boolean') {
        return {kind: 'curve-visibility', target: 'convex-hull', visible: action.value};
    }
    if (action.name === 'show-decasteljau-construction' && typeof action.value === 'boolean') {
        return {kind: 'curve-visibility', target: 'decasteljau-scheme', visible: action.value};
    }
    if (action.name === 'set-decasteljau-parameter') {
        return {kind: 'parameter', name: 't', value: finiteNumber(action)};
    }
    if (action.name === 'show-evaluation-point') {
        return {kind: 'curve-evaluation', parameter: finiteNumber(action)};
    }
    if (action.name === 'show-weights' && typeof action.value === 'boolean') {
        return {kind: 'curve-visibility', target: 'weights', visible: action.value};
    }
    if (action.name === 'elevate-degree' && action.value === true) {
        return {kind: 'degree-elevation'};
    }
    if (action.name === 'translate-x' && typeof action.value === 'number') {
        return {kind: 'affine-transform', operation: 'translate-x', value: action.value};
    }
    if (action.name === 'translate-y' && typeof action.value === 'number') {
        return {kind: 'affine-transform', operation: 'translate-y', value: action.value};
    }
    if (action.name === 'scale-affine' && typeof action.value === 'number') {
        return {kind: 'affine-transform', operation: 'scale', value: action.value};
    }
    if (action.name === 'rotate-affine' && typeof action.value === 'number') {
        return {kind: 'affine-transform', operation: 'rotate', value: action.value};
    }
    if (action.name === 'reflect-x' && action.value === true) {
        return {kind: 'affine-transform', operation: 'reflect-x'};
    }
    if (action.name === 'reflect-y' && action.value === true) {
        return {kind: 'affine-transform', operation: 'reflect-y'};
    }
    if (action.name === 'show-offset-curve' && typeof action.value === 'boolean') {
        return {kind: 'curve-visibility', target: 'offset-curve', visible: action.value};
    }
    if (action.name === 'set-offset-distance') {
        return {kind: 'parameter', name: 'offset-distance', value: finiteNumber(action)};
    }
    if (action.name === 'set-bernstein-degree') {
        return {kind: 'bernstein-degree', degree: integerValue(action)};
    }
    if (action.name === 'show-bernstein-stacked-area' && typeof action.value === 'boolean') {
        return {kind: 'bernstein-stacked-area', visible: action.value};
    }
    if (action.name === 'set-parameterization-alpha') {
        return {kind: 'parameterization-alpha', value: finiteNumber(action)};
    }
    if (action.name === 'set-parameterization-samples') {
        // The sample limits differ by Demonstration, so only the target graph can say which counts it accepts.
        return {kind: 'parameterization-samples', count: integerValue(action)};
    }
    if (action.name === 'set-parameterization-mode') {
        if (action.value !== 'weighted' && action.value !== 'uniform') {
            throw new Error('The parameterization mode must be "weighted" or "uniform".');
        }
        return {kind: 'parameterization-mode', mode: action.value};
    }
    if (action.name === 'set-subdivision-parameter') {
        return {kind: 'subdivision-parameter', value: finiteNumber(action)};
    }
    if (action.name === 'subdivide' && action.value === true) {
        return {kind: 'subdivide'};
    }
    if (action.name === 'set-extrapolation-parameter') {
        return {kind: 'extrapolation-parameter', value: finiteNumber(action)};
    }
    if (action.name === 'extrapolate' && action.value === true) {
        return {kind: 'extrapolate'};
    }
    if (action.name === 'show-spline-labels' || action.name === 'hide-spline-fixed-points'
        || action.name === 'show-farin-points' || action.name === 'set-standard-form') {
        if (typeof action.value !== 'boolean') throw new Error(`The scene action “${action.name}” needs a boolean value.`);
        if (action.name === 'show-spline-labels') return {kind: 'spline-label-points', visible: action.value};
        if (action.name === 'hide-spline-fixed-points') return {kind: 'spline-hide-fixed', hidden: action.value};
        if (action.name === 'show-farin-points') return {kind: 'farin-points', visible: action.value};
        return {kind: 'standard-form', enabled: action.value};
    }
    if (action.name === 'set-spline-continuity' || action.name === 'set-spline-degree' || action.name === 'set-circle-pieces') {
        if (typeof action.value !== 'number' || !Number.isInteger(action.value) || action.value < 0) {
            throw new Error(`The scene action “${action.name}” needs a non-negative integer value.`);
        }
        if (action.name === 'set-spline-continuity') return {kind: 'spline-continuity', value: action.value};
        if (action.name === 'set-spline-degree') return {kind: 'spline-degree', value: action.value};
        return {kind: 'circle-pieces', count: action.value};
    }
    if (action.name === 'set-spline-beta') {
        const value: unknown = action.value;
        if (typeof value !== 'object' || value === null || Array.isArray(value)) {
            throw new Error('The spline beta action needs a value of the form {index, value}.');
        }
        const {index, value: beta} = value as {index?: unknown; value?: unknown};
        if (typeof index !== 'number' || !Number.isInteger(index) || index < 0) throw new Error('The spline beta index must be a non-negative integer.');
        if (typeof beta !== 'number' || !Number.isFinite(beta) || beta <= 0) throw new Error('The spline beta value must be a finite positive number.');
        return {kind: 'spline-beta', index, value: beta};
    }
    if (action.name === 'set-rational-weights') {
        if (!Array.isArray(action.value) || action.value.length === 0 || !action.value.every(weight => typeof weight === 'number' && Number.isFinite(weight) && weight > 0)) {
            throw new Error('The rational weights must be a non-empty list of finite positive numbers.');
        }
        return {kind: 'rational-weights', weights: [...(action.value as readonly number[])]};
    }
    if (action.name === 'set-function-parameter') {
        const value: unknown = action.value;
        if (typeof value !== 'object' || value === null || Array.isArray(value)) {
            throw new Error('The function parameter action needs a value of the form {name, value}.');
        }
        const {name, value: parameter} = value as {name?: unknown; value?: unknown};
        if (typeof name !== 'string' || !FUNCTION_PARAMETER_NAMES.includes(name as FunctionParameterName)) {
            throw new Error(`The function parameter name must be one of ${FUNCTION_PARAMETER_NAMES.join(', ')}.`);
        }
        if (typeof parameter !== 'number' || !Number.isFinite(parameter)) throw new Error('The function parameter value must be a finite number.');
        return {kind: 'function-parameter', name: name as FunctionParameterName, value: parameter};
    }
    if (action.name === 'show-function-element') {
        const value: unknown = action.value;
        if (typeof value !== 'object' || value === null || Array.isArray(value)) {
            throw new Error('The function element action needs a value of the form {name, value}.');
        }
        const {name, value: visible} = value as {name?: unknown; value?: unknown};
        if (typeof name !== 'string' || !FUNCTION_VISIBILITY_TARGETS.includes(name as FunctionVisibilityTarget)) {
            throw new Error(`The function element name must be one of ${FUNCTION_VISIBILITY_TARGETS.join(', ')}.`);
        }
        if (typeof visible !== 'boolean') throw new Error('The function element value must be true or false.');
        return {kind: 'function-visibility', target: name as FunctionVisibilityTarget, visible};
    }
    if (action.name === 'set-function-choice') {
        const value: unknown = action.value;
        if (typeof value !== 'object' || value === null || Array.isArray(value)) {
            throw new Error('The function choice action needs a value of the form {name, value}.');
        }
        const {name, value: choice} = value as {name?: unknown; value?: unknown};
        if (typeof name !== 'string' || !FUNCTION_CHOICE_NAMES.includes(name as FunctionChoiceName)) {
            throw new Error(`The function choice name must be one of ${FUNCTION_CHOICE_NAMES.join(', ')}.`);
        }
        const allowed = FUNCTION_CHOICE_VALUES[name as FunctionChoiceName];
        if (typeof choice !== 'string' || !allowed.includes(choice)) {
            throw new Error(`The function choice “${name}” must be one of ${allowed.join(', ')}.`);
        }
        return {kind: 'function-choice', name: name as FunctionChoiceName, value: choice};
    }
    if (action.name === 'run-bisection-command') {
        if (action.value !== 'next-step' && action.value !== 'reset') throw new Error('The bisection command must be "next-step" or "reset".');
        return {kind: 'animation', animationId: 'bisection', command: action.value};
    }
    if (action.name === 'run-sequence-command') {
        if (action.value !== 'next-step' && action.value !== 'reset') throw new Error('The sequence command must be "next-step" or "reset".');
        return {kind: 'animation', animationId: 'sequence', command: action.value};
    }
    if (action.name === 'run-fixed-point-command') {
        if (action.value !== 'next-step' && action.value !== 'reset') throw new Error('The fixed-point command must be "next-step" or "reset".');
        return {kind: 'animation', animationId: 'fixed-point', command: action.value};
    }
    throw new Error(`Unsupported guided scene action “${action.name}”.`);
}

function frameForStep(
    step: GuidedLessonStep,
    frame: GuidedLessonFrame,
    formulas: ReadonlyMap<string, readonly LocalizedText[]>,
    workedExamples: ReadonlyMap<string, LessonFrame['workedExample']>,
): LessonFrame {
    const notation = (frame.formulaIds ?? step.formulaIds).flatMap(id => formulas.get(id) ?? []);
    if (frame.kind === 'calculation') {
        return {
            id: frame.id,
            kind: frame.kind,
            title: step.title as LocalizedText,
            workedExample: step.workedExampleId ? workedExamples.get(step.workedExampleId) : undefined,
        };
    }
    if (frame.kind === 'observation') {
        return {
            id: frame.id,
            kind: frame.kind,
            title: step.title as LocalizedText,
            prompt: step.observationPrompt as LocalizedText,
            animation: step.animation ? {animationId: step.animation.animationId} : undefined,
        };
    }
    return {
        id: frame.id,
        kind: frame.kind,
        title: step.title as LocalizedText,
        body: step.explanation as LocalizedText,
        notation,
    };
}

function adaptContent(demonstrationId: DemonstrationId): LessonDefinition | undefined {
    const content = getGuidedLesson(demonstrationId);
    if (!content) return undefined;
    const formulas = new Map(content.formulaBlocks.map(formula => [formula.id, [
        {sl: `\\[${formula.latex}\\]`, en: `\\[${formula.latex}\\]`} as LocalizedText,
        formula.notation as LocalizedText,
    ]]));
    const workedExamples = new Map(content.workedExamples.map(example => [example.id, {
        title: example.title as LocalizedText,
        calculation: {sl: `\\[${example.calculationLatex}\\]`, en: `\\[${example.calculationLatex}\\]`} as LocalizedText,
        result: {sl: `\\[${example.resultLatex}\\]`, en: `\\[${example.resultLatex}\\]`} as LocalizedText,
        check: example.check as LocalizedText,
    }]));
    return {
        id: `${content.demonstrationId}-${content.demonstrationId === 'bezier' || content.demonstrationId === 'decasteljau' || content.demonstrationId === 'ph-cubic' ? 'pilot' : 'guided'}`,
        demonstrationId: content.demonstrationId,
        title: content.title as LocalizedText, summary: content.summary as LocalizedText,
        steps: content.steps.map(step => ({
            id: step.id, title: step.title as LocalizedText, body: step.explanation as LocalizedText,
            notation: step.formulaIds.flatMap(id => formulas.get(id) ?? []),
            workedExample: step.workedExampleId ? workedExamples.get(step.workedExampleId) : undefined,
            prompt: step.observationPrompt as LocalizedText,
            frames: step.frames.map(frame => frameForStep(step, frame, formulas, workedExamples)),
            scene: step.scene ? {
                actions: [
                    {kind: 'prepared-scene', sceneId: step.scene.id, source: step.scene.basedOn},
                    ...step.scene.actions.map(sceneAction),
                ],
            } : undefined,
        })),
    };
}

const adaptedLessons = new Map<DemonstrationId, LessonDefinition | undefined>();

/**
 * Exact product allowlist for lessons that may be entered from the app.
 *
 * Keep this list deliberately boring: a route family, title, or similarly
 * named demonstration must never make an unreviewed lesson appear. New
 * content can be prepared in the content module first and added here only
 * after its graph capability and content review gates pass.
 */
export const GUIDED_LESSON_AVAILABLE_IDS = [
    'bezier',
    'decasteljau',
    'affine',
    'elevation',
    'rational',
    'rational-decasteljau',
    'ph-cubic',
    'ph-quintic',
    'bernstein',
    'rational-elevation',
    'weighted-parameterization',
    'uniform-parameterization',
    'subdivision',
    'repeated-subdivision',
    'rational-subdivision',
    'extrapolation',
    'rational-extrapolation',
    'decasteljau-alternative',
    'farin',
    'circle',
    'spline-cn',
    'spline-c1',
    'spline-c2',
    'spline-g1',
    'spline-g1-symmetric',
    'spline-parameterization',
    'linear-function',
    'exponential-function',
    'trigonometric-functions',
    'continuity',
    'derivative',
    'definite-integral',
    'area-between-curves',
    'arc-length',
    'bisection',
    'mean-value',
    'accumulation',
    'darboux',
    'extrema',
    'convexity',
    'taylor',
    'sequence',
    'uniform-convergence',
    'complex-multiplication',
    'fixed-point',
] as const satisfies readonly DemonstrationId[];

const availableLessonIds = new Set<DemonstrationId>(GUIDED_LESSON_AVAILABLE_IDS);

export function isGuidedLessonAvailable(id: DemonstrationId): boolean {
    return availableLessonIds.has(id) && Boolean(getLessonForDemonstration(id));
}

/** Stable lookup seam for the reviewed content module. */
export function getLessonForDemonstration(id: DemonstrationId): LessonDefinition | undefined {
    if (!availableLessonIds.has(id)) return undefined;
    if (!adaptedLessons.has(id)) adaptedLessons.set(id, adaptContent(id));
    return adaptedLessons.get(id);
}
