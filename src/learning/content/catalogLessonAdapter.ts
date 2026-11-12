import type {DemonstrationId} from '../../demonstrations';
import type {LessonPatchFixture, LessonPoint3, LessonView3D} from '../model';
import type {LessonAction, LessonDefinition, LocalizedText, LessonFrame} from '../model';
import {getGuidedLesson, isPilotGuidedLesson, type LessonScene} from './guidedLessons';
import type {GuidedLesson, GuidedLessonFrame, GuidedLessonStep} from './guidedLessons';
import {parseHullAlgorithm} from '../../graphs/compgeo/hullTraceRun';
import {isGuidedLessonAvailable} from '../runtime/lessonAvailability';

/**
 * The content adapter: turns the reviewed guided-lesson content of one Demonstration into a lesson definition. It imports
 * neither chapter ownership nor the runtime catalog, so chapter registries that reuse catalog-authored content call it
 * directly (lesson-authoring architecture, section 2).
 */
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

/** A guard for an array of exactly `length` integers that are 0 or more. */
const isIndexList = (length: number) => (value: unknown): boolean =>
    Array.isArray(value) && value.length === length && value.every(i => Number.isInteger(i) && i >= 0);

/** Checks the shape and finiteness of a `point-set` action; the graph enforces the grid, range and limits. Other kinds pass through. */
function checkAuthoredAction(action: LessonAction): LessonAction {
    if (action.kind !== 'point-set') return action;
    const data: unknown = action;
    const {operation, points, mode, overlay, visible, closed} = data as Record<string, unknown>;
    if (operation === 'set-points') {
        if (!Array.isArray(points) || !points.every(p => Array.isArray(p) && p.length === 2 && isFinite(p[0]) && isFinite(p[1]))) {
            throw new Error('A point-set set-points action needs a list of [x, y] pairs of finite numbers.');
        }
        if (mode !== 'points' && mode !== 'polygon' && mode !== 'segments' && mode !== 'intervals') throw new Error('A point-set set-points action needs the mode "points", "polygon", "segments" or "intervals".');
        if (closed !== undefined && typeof closed !== 'boolean') throw new Error('A point-set set-points action needs a boolean closed.');
    } else if (operation === 'set-overlay') {
        if (typeof overlay !== 'string' || typeof visible !== 'boolean') throw new Error('A point-set set-overlay action needs an overlay name and a boolean visible.');
    } else if (operation === 'set-algorithm') {
        if (parseHullAlgorithm((data as Record<string, unknown>).algorithm) === undefined) throw new Error('A point-set set-algorithm action needs one of the hull algorithms.');
    } else if (operation === 'set-trace-step') {
        const step = (data as Record<string, unknown>).step;
        if (step !== 'end' && !(typeof step === 'number' && isFinite(step))) throw new Error('A point-set set-trace-step action needs a finite number or "end" as step.');
    } else if (operation === 'load-model') {
        const {gridStepExponent} = data as Record<string, unknown>;
        if (!Array.isArray(points) || !points.every(p => Array.isArray(p) && p.length === 2 && isFinite(p[0]) && isFinite(p[1]))) {
            throw new Error('A point-set load-model action needs a list of [x, y] pairs of finite numbers.');
        }
        if (typeof gridStepExponent !== 'number' || !Number.isInteger(gridStepExponent)) throw new Error('A point-set load-model action needs an integer gridStepExponent.');
    } else if (operation === 'set-clip-tolerance') {
        const exponent = (data as Record<string, unknown>).exponent;
        if (typeof exponent !== 'number' || !isFinite(exponent)) throw new Error('A point-set set-clip-tolerance action needs a finite number as exponent.');
    } else if (operation === 'set-triangulation') {
        const triangles = (data as Record<string, unknown>).triangles;
        if (!Array.isArray(triangles) || !triangles.every(isIndexList(3))) throw new Error('A point-set set-triangulation action needs a list of triangles, each a list of three integer point indices (0 or more).');
    } else if (operation === 'flip-edge') {
        if (!isIndexList(2)((data as Record<string, unknown>).edge)) throw new Error('A point-set flip-edge action needs an edge of two integer point indices (0 or more).');
    } else if (operation === 'select-edge') {
        const edge = (data as Record<string, unknown>).edge;
        if (edge !== null && !isIndexList(2)(edge)) throw new Error('A point-set select-edge action needs an edge of two integer point indices (0 or more), or null.');
    } else if (operation === 'select-triangle') {
        const triangle = (data as Record<string, unknown>).triangle;
        if (triangle !== null && !(typeof triangle === 'number' && Number.isInteger(triangle) && triangle >= 0)) throw new Error('A point-set select-triangle action needs a triangle index (an integer, 0 or more), or null.');
    } else if (operation === 'select-site') {
        const site = (data as Record<string, unknown>).site;
        if (site !== null && !(typeof site === 'number' && Number.isInteger(site) && site >= 0)) throw new Error('A point-set select-site action needs a site index (an integer, 0 or more), or null.');
    } else if (operation === 'set-construction') {
        const count = (data as Record<string, unknown>).count;
        if (count !== 'end' && !(typeof count === 'number' && Number.isInteger(count) && count >= 0)) throw new Error('A point-set set-construction action needs a count (an integer, 0 or more) or "end".');
    } else if (operation === 'set-query-point') {
        const point = (data as Record<string, unknown>).point;
        if (point !== null && !(Array.isArray(point) && point.length === 2 && isFinite(point[0]) && isFinite(point[1]))) throw new Error('A point-set set-query-point action needs an [x, y] pair of finite numbers, or null.');
    } else if (operation === 'set-polygon') {
        const polygon = (data as Record<string, unknown>).polygon;
        if (polygon !== 'notched' && polygon !== 'pentagram') throw new Error('A point-set set-polygon action needs the polygon "notched" or "pentagram".');
    } else if (operation === 'set-mode') {
        const mode = (data as Record<string, unknown>).mode;
        if (mode !== 'sites' && mode !== 'four-point' && mode !== 'chain' && mode !== 'kettner') throw new Error('A point-set set-mode action needs the mode "sites", "four-point", "chain" or "kettner".');
    } else if (operation === 'set-pop-rule') {
        const rule = (data as Record<string, unknown>).rule;
        if (rule !== 'non-left' && rule !== 'right') throw new Error('A point-set set-pop-rule action needs the rule "non-left" or "right".');
    } else if (operation === 'set-duplicates') {
        const duplicates = (data as Record<string, unknown>).duplicates;
        if (duplicates !== 'merge' && duplicates !== 'keep') throw new Error('A point-set set-duplicates action needs duplicates "merge" or "keep".');
    } else if (operation === 'set-panel') {
        const panel = (data as Record<string, unknown>).panel;
        if (panel !== 'inexact' && panel !== 'exact') throw new Error('A point-set set-panel action needs the panel "inexact" or "exact".');
    } else if (operation === 'select-cell') {
        const {i, j} = data as Record<string, unknown>;
        const cell = (v: unknown): boolean => typeof v === 'number' && Number.isInteger(v) && v >= 0 && v <= 63;
        if (!cell(i) || !cell(j)) throw new Error('A point-set select-cell action needs integer cell coordinates i and j from 0 to 63.');
    } else {
        throw new Error('A point-set action needs the operation set-points, set-overlay, set-algorithm, set-trace-step, load-model, set-clip-tolerance, set-triangulation, flip-edge, select-edge, select-triangle, select-site, set-construction, set-query-point, set-polygon, set-mode, set-pop-rule, set-duplicates, set-panel or select-cell.');
    }
    return action;
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
        ...scene.actions.map(checkAuthoredAction),
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
            expectedObservations: step.expectedObservations.length > 0 ? step.expectedObservations : undefined,
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

/** Adapts reviewed lesson content that is not the catalog lesson of its Demonstration (a chapter lesson written in the catalog format) under `lessonId`. */
export function adaptGuidedLessonContent(content: GuidedLesson, lessonId: string): LessonDefinition {
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
        id: lessonId,
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

function adaptContent(demonstrationId: DemonstrationId): LessonDefinition | undefined {
    const content = getGuidedLesson(demonstrationId);
    return content && adaptGuidedLessonContent(content, `${content.demonstrationId}-${isPilotGuidedLesson(content.demonstrationId) ? 'pilot' : 'guided'}`);
}

const adaptedLessons = new Map<DemonstrationId, LessonDefinition | undefined>();

/** The lesson adapted from the reviewed content of Demonstration `id`, ignoring chapter ownership; cached per Demonstration. */
export function adaptCatalogLesson(id: DemonstrationId): LessonDefinition | undefined {
    if (!isGuidedLessonAvailable(id)) return undefined;
    if (!adaptedLessons.has(id)) adaptedLessons.set(id, adaptContent(id));
    return adaptedLessons.get(id);
}
