/**
 * Test support shared by the real-graph scene contracts: how a test changes a mounted graph's scene the way a user and
 * a lesson would, and what it compares afterwards (scene observation plus transient state and child-board view).
 * Graphs come from `graphFactories` through `realGraphTestHarness`; nothing here mocks a graph.
 */
import {act, fireEvent} from '@testing-library/react';
import type BaseGraph from './BaseGraph';
import type {BaseGraphState} from './BaseGraph';
import type {LessonAction} from '../../learning/model';
import type {Preset} from './presets/Presets';
import TensorPatchGraph from '../patches/TensorPatchGraph';
import type {Point3Dto} from '../patches/patchDto';
import {type MountedGraph, observe, observeScene, surfaceViewOf} from './realGraphTestHarness';

export type Internals = {
    board: JXG.Board;
    jxgCurves?: Array<{getJxgPoints(): unknown[]}>;
    exportPresetFigures(presets: Preset[]): Promise<void>;
    captureTransientState?: () => unknown;
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
function perturbPatch(graph: TensorPatchGraph, variant: 'a' | 'b'): void {
    const [entry] = graph.exportPresetData();
    if (entry[0] !== 'TensorProductBezierPatch') return;
    const dto = entry[1];
    const net = dto.net.map((p, i): Point3Dto => i === 0 ? [p[0], p[1], p[2] + (variant === 'a' ? 0.75 : -0.5)] : p);
    graph.importPresetData([[entry[0], {...dto, net}]]);
}

/** Edits a function graph's model the way its controls would: each numeric field the graph accepts a nearby value for. */
export function perturbModel(graph: BaseGraph<BaseGraphState>, variant: 'a' | 'b'): void {
    if (graph instanceof TensorPatchGraph) { perturbPatch(graph, variant); return; }
    const g = internals(graph);
    // Function graphs only: their Preset data is a model object, which their Preset collection checks.
    const collection = graph.presetCollection();
    const exported = g.exportPresetData();
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
    view.emit({kind: 'point', pointId: 'p-1-1', xyz: a ? [0.25, -0.75, 3.5] : [-0.25, 0.5, -1.25], phase: 'end'});
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
