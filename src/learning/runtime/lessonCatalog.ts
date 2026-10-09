import type {DemonstrationId} from '../../demonstrations';
import type {LessonAction, LessonDefinition, LocalizedText, LessonFrame} from '../model';
import {getGuidedLesson, SceneAction} from '../content/guidedLessons';
import type {GuidedLessonFrame, GuidedLessonStep} from '../content/guidedLessons';

function sceneAction(action: SceneAction): LessonAction {
    if (action.name === 'show-control-polygon' && typeof action.value === 'boolean') {
        return {kind: 'curve-visibility', target: 'control-polygon', visible: action.value};
    }
    if (action.name === 'show-convex-hull' && typeof action.value === 'boolean') {
        return {kind: 'curve-visibility', target: 'convex-hull', visible: action.value};
    }
    if (action.name === 'show-decasteljau-construction' && typeof action.value === 'boolean') {
        return {kind: 'curve-visibility', target: 'decasteljau-scheme', visible: action.value};
    }
    if (action.name === 'set-decasteljau-parameter' && typeof action.value === 'number') {
        if (action.value < 0 || action.value > 1 || !Number.isFinite(action.value)) throw new Error('The De Casteljau parameter must be between 0 and 1.');
        return {kind: 'parameter', name: 't', value: action.value};
    }
    if (action.name === 'show-evaluation-point' && typeof action.value === 'number') {
        if (action.value < 0 || action.value > 1 || !Number.isFinite(action.value)) throw new Error('The curve evaluation parameter must be between 0 and 1.');
        return {kind: 'curve-evaluation', parameter: action.value};
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
    if (action.name === 'set-offset-distance' && typeof action.value === 'number') {
        if (action.value < -3 || action.value > 3 || !Number.isFinite(action.value)) throw new Error('The PH offset distance must be between -3 and 3.');
        return {kind: 'parameter', name: 'offset-distance', value: action.value};
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
