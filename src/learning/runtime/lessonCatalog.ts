import type {DemonstrationId} from '../../demonstrations';
import {patchGuidedExampleRegistry} from '../content/patchGuidedExampleRegistry';
import type {LessonPatchFixture, LessonPoint3, LessonView3D} from '../model';
import type {LessonAction, LessonDefinition, LocalizedText, LessonFrame} from '../model';
import {getGuidedLesson, isPilotGuidedLesson, type LessonScene} from '../content/guidedLessons';
import type {GuidedLessonFrame, GuidedLessonStep} from '../content/guidedLessons';
import {isGuidedLessonAvailable} from './lessonAvailability';
export {GUIDED_LESSON_AVAILABLE_IDS, isGuidedLessonAvailable} from './lessonAvailability';

const isFinite = (x: unknown): x is number => typeof x === 'number' && Number.isFinite(x);

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
        ...scene.actions,
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

/** Stable lookup seam for the reviewed content module; only Demonstrations that offer a lesson (see lessonAvailability.ts) resolve. */
export function getLessonForDemonstration(id: DemonstrationId): LessonDefinition | undefined {
    if (!isGuidedLessonAvailable(id)) return undefined;
    const patch = Object.values(patchGuidedExampleRegistry).find(lesson => lesson.demonstrationId === id);
    if (patch) return patch;
    if (!adaptedLessons.has(id)) adaptedLessons.set(id, adaptContent(id));
    return adaptedLessons.get(id);
}
