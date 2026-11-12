/**
 * Test support shared by the real-graph scene contracts: how a test changes a mounted graph's scene the way a user and
 * a lesson would, and what it compares afterwards (scene observation plus transient state and child-board view).
 * Graphs come from `graphFactories` through `realGraphTestHarness`; nothing here mocks a graph.
 */
import {CROSS_RATIO_EXAMPLES} from '../projective/crossRatioModel';
import {PASCAL_EXAMPLES} from '../projective/pascalModel';
import {SUMMARY_EXAMPLES} from '../../analysis/summaryStatisticsModel';
import {CORRELATION_EXAMPLES} from '../../analysis/correlationModel';
import {POLE_POLAR_EXAMPLES} from '../projective/polePolarModel';
import {act, fireEvent} from '@testing-library/react';
import type BaseGraph from './BaseGraph';
import type {BaseGraphState} from './BaseGraph';
import type {LessonAction} from '../../learning/model';
import type {Preset} from './presets/Presets';
import TensorPatchGraph from '../patches/TensorPatchGraph';
import TriangularPatchGraph from '../patches/TriangularPatchGraph';
import CoonsPatchGraph from '../patches/CoonsPatchGraph';
import type {Point3Dto} from '../patches/patchDto';
import {type MountedGraph, observe, observeScene, surfaceViewOf} from './realGraphTestHarness';

export type Internals = {
    board: JXG.Board;
    /** Protected on the graph: false for plots with free axes. */
    equalAxisUnits?: boolean;
    jxgCurves?: Array<{getJxgPoints(): unknown[]}>;
    exportPresetFigures(presets: Preset[]): Promise<void>;
    captureTransientState?: () => unknown;
    projectPersistedScene?: () => {data: unknown; graphState: Record<string, unknown>} | undefined;
    lessonFunctionActions?: () => {visibility?: Record<string, unknown>};
    exportPresetData(): unknown;
    importPresetData(data: unknown): void;
};
export const internals = (graph: BaseGraph<BaseGraphState>) => graph as unknown as Internals;

/** Graph fields known to hold transient state, read directly so a field the declaration leaves out is still compared. */
const TRANSIENT_FIELDS = ['stepsDone', 'elevationOverlayOn', 'polygonShownBeforeOverlay', 'parameter', 'pendingHodographBoundingBox'];

/**
 * Transient state: graph state outside Preset data and the scene store, both as the graph declares it and as its known
 * fields hold it (an independent observation of the same state).
 */
export function transient(graph: BaseGraph<BaseGraphState>): unknown {
    const g = graph as unknown as Record<string, unknown> & Internals;
    const fields = Object.fromEntries(TRANSIENT_FIELDS.filter(key => key in g).map(key => [key, g[key] ?? null]));
    return JSON.parse(JSON.stringify({declared: g.captureTransientState?.() ?? null, fields}));
}

/** The PH hodograph is a child board the inspector creates; its view is transient state of the PH graphs. */
export const hodograph = (graph: BaseGraph<BaseGraphState>) => (graph as unknown as {hodographBoard?: JXG.Board}).hodographBoard;
export const hodographView = (graph: BaseGraph<BaseGraphState>) => {
    const box = hodograph(graph)?.getBoundingBox();
    return box ? box.map(value => Math.round(value * 1e6) / 1e6) : null;
};

export const full = (mounted: MountedGraph) => ({...observe(mounted), transient: transient(mounted.graph), hodographView: hodographView(mounted.graph)});
export const scene = (graph: BaseGraph<BaseGraphState>) => ({...observeScene(graph), transient: transient(graph), hodographView: hodographView(graph)});
export type SceneView = ReturnType<typeof scene>;

/**
 * A scene as it stands before the host commits. The inspector recreates child boards (the PH hodograph) on commit, so
 * the hodograph is compared as its effective view: the board's, or the one waiting for the next board.
 */
export function mainScene({hodographView: view, transient: observed, ...main}: SceneView) {
    const {declared, fields} = observed as {declared: unknown; fields: Record<string, unknown>};
    const {pendingHodographBoundingBox: pending, ...otherFields} = fields;
    return {...main, transient: {declared, fields: otherFields}, hodograph: view ?? pending ?? null};
}

/** Writes a patch's model the way a lesson scene write would: its first control point moves in height, the rest stays. */
function perturbPatch(graph: TensorPatchGraph | TriangularPatchGraph, variant: 'a' | 'b'): void {
    const [entry] = graph.exportPresetData();
    const lift = (p: Point3Dto, i: number): Point3Dto => i === 0 ? [p[0], p[1], p[2] + (variant === 'a' ? 0.75 : -0.5)] : p;
    if (entry[0] === 'TensorProductBezierPatch') graph.importPresetData([[entry[0], {...entry[1], net: entry[1].net.map(lift)}]]);
    else if (entry[0] === 'TriangularBezierPatch') graph.importPresetData([[entry[0], {...entry[1], net: entry[1].net.map(lift)}]]);
}

/** Moves a Coons patch's boundary point `c0-1` (not a corner, so the corners stay linked) in height. */
function perturbCoons(graph: CoonsPatchGraph, variant: 'a' | 'b'): void {
    const [entry] = graph.exportPresetData();
    const c0 = entry[1].c0.map((p, i): Point3Dto => i === 1 ? [p[0], p[1], p[2] + (variant === 'a' ? 0.75 : -0.5)] : p);
    graph.importPresetData([[entry[0], {...entry[1], c0}]]);
}

/** Edits a function graph's model the way its controls would: each numeric field the graph accepts a nearby value for. */
export function perturbModel(graph: BaseGraph<BaseGraphState>, variant: 'a' | 'b'): void {
    if (graph instanceof TensorPatchGraph || graph instanceof TriangularPatchGraph) { perturbPatch(graph, variant); return; }
    if (graph instanceof CoonsPatchGraph) { perturbCoons(graph, variant); return; }
    const g = internals(graph);
    // Function graphs only: their Preset data is a model object, which their Preset collection checks.
    const collection = graph.presetCollection();
    const exported = g.exportPresetData();
    // Projective graphs: the model is a discrete example with nested integer points, so switch to another example.
    // (Told apart by collection key; importing the graph classes here would form an import cycle.)
    const pick = <T extends string>(a: T, b: T) => variant === 'a' ? a : b;
    switch (collection?.key) {
        case 'projective-cross-ratio': g.importPresetData(CROSS_RATIO_EXAMPLES[pick('harmonic', 'infinity')]); return;
        case 'projective-pascal': g.importPresetData(PASCAL_EXAMPLES[pick('pappus', 'infinity')]); return;
        case 'projective-pole-polar': g.importPresetData(POLE_POLAR_EXAMPLES[pick('inside', 'infinity')]); return;
        // Triangle solver: the model is nested (mode, grid vertices, solver data), so switch the mode and its inputs.
        case 'triangle-solver':
            g.importPresetData({...exported as object, ...(variant === 'a' ?
                {mode: 'solve', data: {type: 'ssa', a: 5, b: 8, angleA: 30}} : {mode: 'circle', C: {x: 3, y: 5}})});
            return;
        // Line geometry: the model is a mode and grid points (no numeric top-level field), so switch the mode and move a point.
        case 'line-geometry':
            g.importPresetData({...exported as object, ...(variant === 'a' ? {mode: 'distance', T: {x: -3, y: 5}} : {mode: 'angle', S: {x: 4, y: -2}})});
            return;
        // Summary statistics: the data are a list (no numeric field to nudge), so switch to another example's values.
        case 'prob-summary': g.importPresetData({...exported as object, values: SUMMARY_EXAMPLES[pick('even', 'outlier')]}); return;
        // Correlation: the points are a list (no numeric field to nudge), so switch to another example's points.
        case 'prob-correlation': g.importPresetData({...exported as object, points: CORRELATION_EXAMPLES[pick('parabola', 'ring')]}); return;
        // Level sets and linear programs: the data is a tagged entry holding the state, so change the function, the rows and the objective.
        case 'contour-map': {
            const [tag, state] = (exported as [string, object][])[0];
            g.importPresetData([[tag, {...state, fn: (variant === 'a' ? 'saddle' : 'valley'), levelCount: (variant === 'a' ? 3 : 5)}]]);
            return;
        }
        case 'linear-program': {
            const [tag, state] = (exported as [string, object][])[0];
            g.importPresetData([[tag, {...state, objective: (variant === 'a' ? {p: 2, q: 1} : {p: 1, q: 3}),
                constraints: (variant === 'a' ? [{a: 1, b: 1, c: 10}, {a: 2, b: 1, c: 14}, {a: 1, b: 3, c: 15}] : [{a: 1, b: 2, c: 12}, {a: 3, b: 1, c: 15}])}]]);
            return;
        }
        // Solids: another plane through the cube, then another number of discs.
        case 'solids': {
            const [tag, state] = (exported as [string, object][])[0];
            g.importPresetData([[tag, {...state, normal: (variant === 'a' ? [1, 1, 1] : [1, 0, 1]), offset: (variant === 'a' ? 3 : 6), discs: (variant === 'a' ? 7 : 13)}]]);
            return;
        }
        // Complex power and Euler circle: the data is a tagged entry holding the state, so change the base point or the angle and the other fields.
        case 'complex-power': {
            const [tag, state] = (exported as [string, object][])[0];
            g.importPresetData([[tag, {...state, A: (variant === 'a' ? 10 : -8), B: (variant === 'a' ? 6 : 12), n: (variant === 'a' ? 3 : 5)}]]);
            return;
        }
        case 'complex-euler': {
            const [tag, state] = (exported as [string, object][])[0];
            g.importPresetData([[tag, {...state, degrees: (variant === 'a' ? 90 : 210), omega: (variant === 'a' ? 3 : 1), degree: (variant === 'a' ? 7 : 12), mode: (variant === 'a' ? 'product' : 'motion')}]]);
            return;
        }
        case 'interp-lagrange': {
            // Interpolation: the only number is the position s in [0, 1], which variant b's nudges leave, so lift the second
            // point. A same-count import keeps the owned scene, so the change must be in the model, not in rebuilt objects.
            const {points} = exported as {points: [number, number][]};
            g.importPresetData({...exported as object, points: points.map((point, i) => i === 1 ? [point[0], point[1] + (variant === 'a' ? 0.5 : -0.5)] : point)});
            return;
        }
        case 'bspline-curve': {
            // B-spline graphs: move the first interior knot within its neighbours and lift the first control point.
            const {degree, knots, points} = exported as {degree: number, knots: number[], points: [number, number][]};
            const moved = knots.map((knot, i) => i === degree + 1 ? knots[degree] + (knots[degree + 2] - knots[degree]) * (variant === 'a' ? 0.75 : 0.25) : knot);
            g.importPresetData({...exported as object, knots: moved, points: points.map((point, i) => i === 0 ? [point[0], point[1] + (variant === 'a' ? 0.5 : -0.5)] : point)});
            return;
        }
    }
    if (!collection || exported === null || typeof exported !== 'object' || Array.isArray(exported)) return;
    let model = {...exported as Record<string, unknown>};
    for (const [key, value] of Object.entries(model)) {
        if (typeof value !== 'number') continue;
        for (const delta of variant === 'a' ? [0.5, 1, -0.5, -1] : [-1, -2, 1, 2]) {
            const checked = collection.check({...model, [key]: value + delta});
            const parsed = 'data' in checked ? checked.data as Record<string, unknown> : undefined;
            if (parsed && parsed[key] === value + delta) { model = parsed; break; }
        }
    }
    g.importPresetData(model);
}

/** Lesson actions that change the scene, in two variants; only the ones a graph supports are applied. */
export function sceneActions(graph: BaseGraph<BaseGraphState>, variant: 'a' | 'b'): LessonAction[] {
    const a = variant === 'a';
    const firstCurvePoints = internals(graph).jxgCurves?.[0]?.getJxgPoints().length ?? 0;
    const weights = Array.from({length: firstCurvePoints}, (_value, i) => a ? 1 + 0.5 * i : 2 - 0.25 * i);
    const functionTargets = Object.keys(internals(graph).lessonFunctionActions?.().visibility ?? {});
    const candidates: LessonAction[] = [
        {kind: 'subdivide'},
        {kind: 'degree-elevation'},
        {kind: 'parameter', name: 't', value: a ? 0.3 : 0.8},
        {kind: 'parameter', name: 'offset-distance', value: a ? 0.5 : -1},
        {kind: 'curve-visibility', target: 'decasteljau-full-curve', visible: a},
        {kind: 'curve-evaluation', parameter: a ? 0.3 : 0.7},
        {kind: 'subdivision-parameter', value: a ? 0.3 : 0.7},
        {kind: 'extrapolation-parameter', value: a ? 1.3 : 1.45},
        {kind: 'rational-weights', weights},
        {kind: 'farin-points', visible: a},
        {kind: 'standard-form', enabled: a},
        {kind: 'parameterization-alpha', value: a ? 0.3 : 0.7},
        {kind: 'parameterization-samples', count: a ? 7 : 3},
        {kind: 'circle-pieces', count: a ? 4 : 5},
        {kind: 'bernstein-degree', degree: a ? 4 : 2},
        ...functionTargets.map(target => ({kind: 'function-visibility', target, visible: a}) as LessonAction),
    ];
    return candidates.filter(action => graph.supportsLessonAction(action)
        && (action.kind !== 'rational-weights' || weights.length > 0));
}

export function applyActions(graph: BaseGraph<BaseGraphState>, actions: LessonAction[]): void {
    const capabilities = graph.getLessonCapabilities();
    for (const action of actions) capabilities.apply(action);
}

/** Flips every enabled switch in the inspector once (scene-store options and transient switches alike). */
export function flipSwitches(mounted: MountedGraph): void {
    const inspector = mounted.view.container.querySelector('#inspector-content')!;
    const switches = Array.from(inspector.querySelectorAll<HTMLInputElement>('input[type="checkbox"]'));
    for (const element of switches) {
        if (!element.isConnected || element.disabled) continue;
        act(() => { fireEvent.click(element); });
    }
}

export function selectFirstCurve(mounted: MountedGraph): void {
    const button = mounted.view.container.querySelector<HTMLButtonElement>('.workspace-curve-picker button[aria-pressed="false"]');
    if (button) act(() => { fireEvent.click(button); });
}

/**
 * Gestures in the main view of a graph without a board, sent the way the view reports them: orbiting the camera and
 * moving a control point. The two variants differ from each other and from the default.
 */
export function changeSurfaceView(graph: BaseGraph<BaseGraphState>, variant: 'a' | 'b'): void {
    const view = surfaceViewOf(graph)!;
    const a = variant === 'a';
    view.emit({kind: 'camera', camera: {...view.last.camera, az: a ? 1.1 : -0.4, el: a ? 0.3 : 0.9, distance: a ? 11 : 15}});
    // Absolute positions: a variant may follow one that hid the control net, so the point is not read back from the view.
    view.emit({kind: 'point', pointId: graph instanceof CoonsPatchGraph ? 'd0-1' : 'p-1-1', xyz: a ? [0.25, -0.75, 3.5] : [-0.25, 0.5, -1.25], phase: 'end'});
}

/** Changes the scene: lesson actions, the curve selection, every switch, the view and the display settings. */
export function changeScene(mounted: MountedGraph, variant: 'a' | 'b'): void {
    const {graph} = mounted;
    act(() => {
        applyActions(graph, sceneActions(graph, variant));
        perturbModel(graph, variant);
    });
    if (!internals(graph).board) changeSurfaceView(graph, variant);
    if (variant === 'a') selectFirstCurve(mounted);
    flipSwitches(mounted);
    if (!internals(graph).board) return;
    act(() => {
        internals(graph).board.setBoundingBox(variant === 'a' ? [-6, 4, 6, -4] : [-3, 6, 6, 0], true);
        graph.setElementSize(variant === 'a' ? 4 : 2);
        hodograph(graph)?.setBoundingBox(variant === 'a' ? [-3, 2, 3, -2] : [-6, 7, 6, -1], true);
    });
}

/** A figure Preset that carries only the view: the board's bounding box, or nothing for a graph without a board. */
export function viewOnlyPreset(reference: BaseGraph<BaseGraphState>): Preset {
    const board = internals(reference).board;
    return board ? {id: 'figure', boardState: {boundingBox: board.getBoundingBox() as [number, number, number, number]}} : {id: 'figure'};
}
