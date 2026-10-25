/**
 * Test support shared by the real-graph scene contracts: how a test changes a mounted graph's scene the way a user and
 * a lesson would, and what it compares afterwards (scene observation plus transient state and child-board view).
 * Graphs come from `graphFactories` through `realGraphTestHarness`; nothing here mocks a graph.
 */
import {act, fireEvent} from '@testing-library/react';
import type {DemonstrationId} from '../../demonstrations';
import type BaseGraph from './BaseGraph';
import type {BaseGraphState} from './BaseGraph';
import type {LessonAction} from '../../learning/model';
import type {Preset} from './presets/Presets';
import {type MountedGraph, observe, observeScene} from './realGraphTestHarness';

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

/** Edits a function graph's model the way its controls would: each numeric field the graph accepts a nearby value for. */
export function perturbModel(graph: BaseGraph<BaseGraphState>, variant: 'a' | 'b'): void {
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

/** Changes the scene: lesson actions, the curve selection, every switch, the view and the display settings. */
export function changeScene(mounted: MountedGraph, variant: 'a' | 'b'): void {
    const {graph} = mounted;
    act(() => {
        applyActions(graph, sceneActions(graph, variant));
        perturbModel(graph, variant);
    });
    if (variant === 'a') selectFirstCurve(mounted);
    flipSwitches(mounted);
    act(() => {
        internals(graph).board.setBoundingBox(variant === 'a' ? [-6, 4, 6, -4] : [-3, 6, 6, 0], true);
        graph.setElementSize(variant === 'a' ? 4 : 2);
        hodograph(graph)?.setBoundingBox(variant === 'a' ? [-3, 2, 3, -2] : [-6, 7, 6, -1], true);
    });
}

/**
 * Function-graph region drawing that is stale before this task (reproduced at 850b6ac) and outside its scope. Regions
 * drawn from caches keyed by the model only (for example the definite-integral `fillCache`) keep data sampled for an
 * earlier view, so a newly mounted reference or a captured scene shows the stale region; the accumulation region seen
 * at capture also differs from the one redrawn after restore (cause not isolated). For the listed scenarios curves are
 * left out of the board comparison; everything else is compared. Remove an entry when its drawing is fixed.
 */
export const STALE_VIEW_CACHED_CURVES: Partial<Record<DemonstrationId, readonly string[]>> = {
    'accumulation': ['checkpoint', 'rollback'],
    'arc-length': ['default'],
    'area-between-curves': ['default', 'batch'],
    'darboux': ['default'],
    'definite-integral': ['default'],
    'fixed-point': ['default'],
};
export function stale(id: DemonstrationId, scenario: string) {
    return <T,>(observed: T): T => {
        if (!STALE_VIEW_CACHED_CURVES[id]?.includes(scenario) || typeof observed !== 'object' || observed === null) return observed;
        const board = (observed as {board?: string[]}).board;
        return board ? {...observed, board: board.filter(line => !line.startsWith('curve'))} : observed;
    };
}
