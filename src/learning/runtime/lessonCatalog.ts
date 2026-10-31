import type {DemonstrationId} from '../../demonstrations';
import {patchGuidedExampleRegistry} from '../content/patchGuidedExampleRegistry';
import {CAMERA_PRESET_NAMES, FUNCTION_CHOICE_NAMES, FUNCTION_CHOICE_VALUES, FUNCTION_PARAMETER_NAMES, FUNCTION_VISIBILITY_TARGETS, PATCH_VISIBILITY_TARGETS} from '../model';
import type {LessonPatchFixture, LessonPoint3, LessonView3D} from '../model';
import type {FunctionChoiceName, FunctionParameterName, FunctionVisibilityTarget, LessonAction, LessonDefinition, LocalizedText, LessonFrame} from '../model';
import {getGuidedLesson, isPilotGuidedLesson, type LessonSceneAction, type SceneAction, type LessonScene} from '../content/guidedLessons';
import type {GuidedLessonFrame, GuidedLessonStep} from '../content/guidedLessons';
import {GUIDED_LESSON_AVAILABLE_IDS} from './lessonAvailability';
export {GUIDED_LESSON_AVAILABLE_IDS, isGuidedLessonAvailable} from './lessonAvailability';

/*
 * @deprecated Legacy string-action translation, removed by A9b (architecture backlog task 9). Everything from here to
 * `toLessonAction` only serves content files that still author `SceneAction` strings; migrated content authors the typed
 * `LessonAction` union (`../model`) directly and needs no translation.
 */

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


const SWEEP_COMMAND_NAMES = ['play', 'pause', 'replay', 'stop'] as const;

function objectValue(action: SceneAction, shape: string): Record<string, unknown> {
    const value: unknown = action.value;
    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
        throw new Error(`The scene action “${action.name}” needs a value of the form ${shape}.`);
    }
    return value as Record<string, unknown>;
}

function checkOnlyKeys(action: SceneAction, value: Record<string, unknown>, allowed: readonly string[]): void {
    const extra = Object.keys(value).filter(key => !allowed.includes(key));
    if (extra.length > 0) throw new Error(`The scene action “${action.name}” does not take ${extra.join(', ')}.`);
}

function patchDirection(action: SceneAction, direction: unknown): 'u' | 'v' {
    if (direction !== 'u' && direction !== 'v') throw new Error(`The scene action “${action.name}” needs the direction "u" or "v".`);
    return direction;
}

const isFinite = (x: unknown): x is number => typeof x === 'number' && Number.isFinite(x);

/** Translates a patch scene action; returns undefined for names that are not patch actions. */
function patchSceneAction(action: SceneAction): LessonAction | undefined {
    if (action.name === 'show-patch-point') {
        const value = objectValue(action, '{u, v} or {u, v, w}');
        checkOnlyKeys(action, value, ['u', 'v', 'w']);
        const {u, v, w} = value;
        if (!isFinite(u) || !isFinite(v) || (w !== undefined && !isFinite(w))) throw new Error('The patch point needs finite numbers u and v, and optionally w.');
        return w === undefined ? {kind: 'patch-evaluation', u, v} : {kind: 'patch-evaluation', u, v, w};
    }
    if (action.name === 'show-patch-element') {
        const value = objectValue(action, '{name, value}');
        checkOnlyKeys(action, value, ['name', 'value']);
        const {name, value: visible} = value;
        if (typeof name !== 'string' || !(PATCH_VISIBILITY_TARGETS as readonly string[]).includes(name)) {
            throw new Error(`The patch element name must be one of ${PATCH_VISIBILITY_TARGETS.join(', ')}.`);
        }
        if (typeof visible !== 'boolean') throw new Error('The patch element value must be true or false.');
        return {kind: 'patch-visibility', target: name as typeof PATCH_VISIBILITY_TARGETS[number], visible};
    }
    if (action.name === 'subdivide-patch') {
        const value = objectValue(action, '{direction, value} or {}');
        checkOnlyKeys(action, value, ['direction', 'value']);
        if (value.direction === undefined && value.value === undefined) return {kind: 'patch-subdivide'};
        const direction = patchDirection(action, value.direction);
        if (!isFinite(value.value)) throw new Error('The patch subdivision value must be a finite number.');
        return {kind: 'patch-subdivide', direction, value: value.value};
    }
    if (action.name === 'elevate-patch') {
        const value = objectValue(action, '{direction} or {}');
        checkOnlyKeys(action, value, ['direction']);
        return value.direction === undefined ? {kind: 'patch-elevate'} : {kind: 'patch-elevate', direction: patchDirection(action, value.direction)};
    }
    if (action.name === 'set-camera-preset') {
        if (typeof action.value !== 'string' || !(CAMERA_PRESET_NAMES as readonly string[]).includes(action.value)) {
            throw new Error(`The camera preset must be one of ${CAMERA_PRESET_NAMES.join(', ')}.`);
        }
        return {kind: 'camera-preset', view: action.value as typeof CAMERA_PRESET_NAMES[number]};
    }
    if (action.name === 'run-patch-u-sweep' || action.name === 'run-patch-v-sweep') {
        if (typeof action.value !== 'string' || !(SWEEP_COMMAND_NAMES as readonly string[]).includes(action.value)) {
            throw new Error(`The sweep command must be one of ${SWEEP_COMMAND_NAMES.join(', ')}.`);
        }
        return {kind: 'animation', animationId: action.name === 'run-patch-u-sweep' ? 'patch-u-sweep' : 'patch-v-sweep',
            command: action.value as typeof SWEEP_COMMAND_NAMES[number]};
    }
    return undefined;
}

function checkPoint3(point: unknown): LessonPoint3 {
    const p = point as {x?: unknown; y?: unknown; z?: unknown} | null;
    if (typeof p !== 'object' || p === null || !isFinite(p.x) || !isFinite(p.y) || !isFinite(p.z)) {
        throw new Error('Every patch control point needs finite x, y and z.');
    }
    return {x: p.x, y: p.y, z: p.z};
}

/** Checks a content patch fixture's shape: degrees 1 to 4 and the net size; the graph checks the rest. */
export function patchFixture(patch: LessonPatchFixture): LessonPatchFixture {
    const degree = (d: unknown): number => {
        if (typeof d !== 'number' || !Number.isInteger(d) || d < 1 || d > 4) throw new Error('A lesson patch degree must be an integer from 1 to 4.');
        return d;
    };
    if (!Array.isArray(patch.net)) throw new Error('A lesson patch needs a list of control points.');
    let expected: number;
    if (patch.kind === 'tensor') expected = (degree(patch.m) + 1) * (degree(patch.n) + 1);
    else if (patch.kind === 'triangular') expected = (degree(patch.n) + 1) * (patch.n + 2) / 2;
    else throw new Error('A lesson patch must be tensor or triangular.');
    if (patch.net.length !== expected) throw new Error(`This lesson patch needs ${expected} control points, got ${patch.net.length}.`);
    const net = patch.net.map(checkPoint3);
    return patch.kind === 'tensor' ? {kind: 'tensor', m: patch.m, n: patch.n, net} : {kind: 'triangular', n: patch.n, net};
}

/** Checks a content 3D camera: finite angles and a positive distance; the graph clamps like the user's own camera. */
export function view3dFixture(view: LessonView3D): LessonView3D {
    if (!isFinite(view.az) || !isFinite(view.el) || !isFinite(view.distance) || view.distance <= 0) throw new Error('The 3D view needs finite az and el and a positive distance.');
    if (view.projection !== undefined && view.projection !== 'perspective') throw new Error('The 3D view projection must be "perspective".');
    return {az: view.az, el: view.el, distance: view.distance, ...(view.target ? {target: checkPoint3(view.target)} : {}),
        ...(view.projection ? {projection: view.projection} : {})};
}

/** @deprecated Translates a legacy string action into the typed action a graph applies, checking the value's type and shape. Removed by A9b. */
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
    const patchAction = patchSceneAction(action);
    if (patchAction) return patchAction;
    throw new Error(`Unsupported guided scene action “${action.name}”.`);
}

/** A typed action runs as authored; a legacy string action is translated. @deprecated The legacy branch is removed by A9b. */
export function toLessonAction(action: LessonSceneAction): LessonAction {
    return 'kind' in action ? action : sceneAction(action);
}

/** The actions a content scene runs: its prepared scene, then its authored actions in order. */
export function sceneActions(scene: LessonScene): LessonAction[] {
    return [
        scene.basedOn === 'lesson-patch-fixture'
            ? {kind: 'prepared-scene', sceneId: scene.id, source: 'lesson-patch-fixture', patch: patchFixture(scene.patch),
                ...(scene.view3d ? {view3d: view3dFixture(scene.view3d)} : {})}
            : scene.basedOn === 'lesson-fixture'
            ? {kind: 'prepared-scene', sceneId: scene.id, source: 'lesson-fixture', curve: scene.curve,
                ...(scene.view ? {view: scene.view} : {})}
            : {kind: 'prepared-scene', sceneId: scene.id, source: 'demonstration-default',
                ...(scene.view ? {view: scene.view} : {})},
        ...scene.actions.map(toLessonAction),
    ];
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
            title: step.title,
            workedExample: step.workedExampleId ? workedExamples.get(step.workedExampleId) : undefined,
        };
    }
    if (frame.kind === 'observation') {
        return {
            id: frame.id,
            kind: frame.kind,
            title: step.title,
            prompt: step.observationPrompt,
            animation: step.animation ? {animationId: step.animation.animationId} : undefined,
        };
    }
    return {
        id: frame.id,
        kind: frame.kind,
        title: step.title,
        body: step.explanation,
        notation,
    };
}

function adaptContent(demonstrationId: DemonstrationId): LessonDefinition | undefined {
    const content = getGuidedLesson(demonstrationId);
    if (!content) return undefined;
    const formulas = new Map(content.formulaBlocks.map(formula => [formula.id, [
        {sl: `\\[${formula.latex}\\]`, en: `\\[${formula.latex}\\]`},
        formula.notation,
    ]]));
    const workedExamples = new Map(content.workedExamples.map(example => [example.id, {
        title: example.title,
        calculation: {sl: `\\[${example.calculationLatex}\\]`, en: `\\[${example.calculationLatex}\\]`},
        result: {sl: `\\[${example.resultLatex}\\]`, en: `\\[${example.resultLatex}\\]`},
        check: example.check,
    }]));
    return {
        id: `${content.demonstrationId}-${isPilotGuidedLesson(content.demonstrationId) ? 'pilot' : 'guided'}`,
        demonstrationId: content.demonstrationId,
        title: content.title, summary: content.summary,
        steps: content.steps.map(step => ({
            id: step.id, title: step.title, body: step.explanation,
            notation: step.formulaIds.flatMap(id => formulas.get(id) ?? []),
            workedExample: step.workedExampleId ? workedExamples.get(step.workedExampleId) : undefined,
            prompt: step.observationPrompt,
            frames: step.frames.map(frame => frameForStep(step, frame, formulas, workedExamples)),
            scene: step.scene ? {actions: sceneActions(step.scene)} : undefined,
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
const availableLessonIds = new Set<DemonstrationId>(GUIDED_LESSON_AVAILABLE_IDS);
/** Stable lookup seam for the reviewed content module. */
export function getLessonForDemonstration(id: DemonstrationId): LessonDefinition | undefined {
    if (!availableLessonIds.has(id)) return undefined;
    const patch = Object.values(patchGuidedExampleRegistry).find(lesson => lesson.demonstrationId === id);
    if (patch) return patch;
    if (!adaptedLessons.has(id)) adaptedLessons.set(id, adaptContent(id));
    return adaptedLessons.get(id);
}
