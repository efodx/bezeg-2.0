/**
 * Test support for mounting real graphs from `graphFactories` through the real `GraphHost` and a real JSXGraph board
 * in jsdom, and for describing what a graph currently shows. Observations name actual board objects and controls, so a
 * missing or empty scene shows up as a difference instead of passing silently.
 */
import React from 'react';
import {act, render, RenderResult} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import {GraphHost} from './GraphHost';
import BaseGraph, {BaseGraphState} from './BaseGraph';
import {graphFactories} from '../graphFactories';
import type {DemonstrationId} from '../../demonstrations';
import TensorDeCasteljauGraph from '../patches/TensorDeCasteljauGraph';
import TensorDerivativesGraph from '../patches/TensorDerivativesGraph';
import TensorSubdivisionGraph from '../patches/TensorSubdivisionGraph';
import TensorPatchGraph from '../patches/TensorPatchGraph';
import TriangularPatchGraph from '../patches/TriangularPatchGraph';
import {cameraSignature, FakeSurfaceView, sceneSignature} from '../patches/FakeSurfaceView';

/**
 * Test budget for a file that mounts real graphs, set with `vi.setConfig({testTimeout})` beside
 * `beforeAll(installBoardShims)`. A test mounting the subdivision graphs takes 4-6 s alone and several times longer
 * while the full suite fills every worker, which exceeds the 15 s default meant for ordinary component tests.
 */
export const REAL_GRAPH_TEST_TIMEOUT = 60_000;

/** jsdom has no canvas and no matchMedia; JSXGraph touches both while creating a board. Call from `beforeAll`. */
export function installBoardShims(): void {
    // jsdom lays nothing out; give every element a canvas-like size so boards get a finite view.
    for (const [name, size] of [['clientWidth', 600], ['clientHeight', 400], ['offsetWidth', 600], ['offsetHeight', 400]] as const) {
        Object.defineProperty(HTMLElement.prototype, name, {configurable: true, get: () => size});
    }
    HTMLElement.prototype.getBoundingClientRect = () => ({x: 0, y: 0, left: 0, top: 0, right: 600, bottom: 400,
        width: 600, height: 400, toJSON: () => ({})}) as DOMRect;
    // Child boards (the PH hodograph) size themselves on mount; nothing resizes afterwards.
    window.ResizeObserver ??= class {
        observe() {}
        unobserve() {}
        disconnect() {}
    } as unknown as typeof ResizeObserver;
    const context = new Proxy({}, {get: (_target, name) => name === 'measureText' ? () => ({width: 0}) : () => undefined});
    HTMLCanvasElement.prototype.getContext = (() => context) as unknown as HTMLCanvasElement['getContext'];
    window.matchMedia = (() => ({matches: false, addEventListener: () => undefined, removeEventListener: () => undefined,
        addListener: () => undefined, removeListener: () => undefined})) as unknown as typeof window.matchMedia;
}

export interface MountedGraph {
    graph: BaseGraph<BaseGraphState>;
    view: RenderResult;
}

/** The fake views of graphs without a board (their main view is a surface view), by graph. */
const surfaceViews = new WeakMap<object, FakeSurfaceView>();

/** The fake surface view of a graph created by `createGraph`, or undefined for a graph with a JSXGraph board. */
export const surfaceViewOf = (graph: BaseGraph<BaseGraphState>): FakeSurfaceView | undefined => surfaceViews.get(graph);

/**
 * A graph as `graphFactories` builds it, except that a graph with a surface view gets a fake one: jsdom has no WebGL,
 * and the real view would fail to start. Every other graph is the factory's own.
 */
export function createGraph(id: DemonstrationId): BaseGraph<BaseGraphState> {
    if (id !== 'patch-tensor' && id !== 'patch-decasteljau' && id !== 'patch-derivatives' && id !== 'patch-subdivision' && id !== 'patch-triangular') return graphFactories[id]();
    const view = new FakeSurfaceView();
    const options = {viewFactory: () => view};
    const graph = id === 'patch-tensor' ? new TensorPatchGraph(options) : id === 'patch-decasteljau' ? new TensorDeCasteljauGraph(options) : id === 'patch-derivatives' ? new TensorDerivativesGraph(options) : id === 'patch-subdivision' ? new TensorSubdivisionGraph(options) : new TriangularPatchGraph(options);
    surfaceViews.set(graph, view);
    return graph as unknown as BaseGraph<BaseGraphState>;
}

export function mountGraph(graph: BaseGraph<BaseGraphState>): MountedGraph {
    const view = render(<MemoryRouter><GraphHost create={() => graph}/></MemoryRouter>);
    return {graph, view};
}

/**
 * Starts a controller operation inside `act`, then lets the host commit in short `act` turns until the operation
 * settles. A single async `act` would hold back the commits that later steps of the operation (a figure batch's
 * scene replacements) wait for.
 */
export async function settle(start: () => Promise<void>): Promise<void> {
    let pending: Promise<void> = Promise.resolve();
    act(() => { pending = start(); });
    let done = false;
    let failure: { error: unknown } | undefined;
    pending.then(() => { done = true; }, error => { done = true; failure = {error}; });
    while (!done) await act(async () => { await new Promise(resolve => setTimeout(resolve, 1)); });
    if (failure) throw failure.error;
}

/** Lets the host commit in short `act` turns until `condition` holds (or a second passes). */
export async function waitUntil(condition: () => boolean): Promise<void> {
    const deadline = Date.now() + 1000;
    while (!condition() && Date.now() < deadline) await act(async () => { await new Promise(resolve => setTimeout(resolve, 1)); });
    if (!condition()) throw new Error('The condition did not hold in time.');
}

/** Protected graph members the observations read. Tests only. */
type GraphInternals = {
    board?: JXG.Board;
    jxgCurves?: Array<{
        getAttributes(): object;
        isSelected(): boolean;
        inStandardForm?: () => boolean;
        isShowingFarinPoints?: () => boolean;
        getCurve(): {getEffectiveWeights?: () => number[]};
    }>;
    exportPresetData(): unknown;
};

const round = (value: unknown): unknown => typeof value === 'number'
    ? (Number.isFinite(value) ? Math.round(value * 1e6) / 1e6 : String(value))
    : value;

function json<T>(value: T): T {
    return value === undefined ? value : JSON.parse(JSON.stringify(value, (_key, item) => round(item)));
}

/**
 * One line per visible board object (sorted): point coordinates, five samples along each curve's drawn points, text
 * content. Names are left out. Hidden objects are not listed: graphs hide some constructions and remove others, so
 * their presence is not scene state. State that is restorable but not drawn is checked by follow-up changes instead
 * (see `GraphTransientState.test.tsx`).
 */
export function boardSignature(board: JXG.Board): string[] {
    const lines: string[] = [];
    for (const object of board.objectsList as any[]) {
        if (!object.visPropCalc?.visible) continue;
        let line: string = object.elType;
        if (JXG.isPoint(object)) {
            line += ` ${round(object.coords.usrCoords[1])},${round(object.coords.usrCoords[2])}`;
        } else if (object.elType === 'curve' || object.elType === 'functiongraph') {
            // JSXGraph keeps entries past `numberPoints` from an earlier, longer data array and never draws them.
            const allPoints: Array<{usrCoords: number[]}> = object.points ?? [];
            const points = typeof object.numberPoints === 'number' ? allPoints.slice(0, object.numberPoints) : allPoints;
            // A curve with nothing to draw is the same picture as a hidden one; JSXGraph only hides it at creation.
            if (points.length === 0) continue;
            const sample = (i: number) => `${round(points[i]?.usrCoords[1])},${round(points[i]?.usrCoords[2])}`;
            const at = [0, 0.25, 0.5, 0.75, 1].map(fraction => Math.round(fraction * (points.length - 1)));
            line += ` n=${points.length} ${at.map(sample).join(' ')}`;
        } else if (object.elType === 'label' || object.isLabel) {
            line += ' label';
        } else if (object.elType === 'text' || object.elType === 'smartlabel') {
            line += ` ${String(object.plaintext ?? object.htmlStr ?? '')}`;
        }
        lines.push(line);
    }
    return lines.sort();
}

/**
 * The graph-owned scene: Preset data, scene store, view, curve adapters and the drawn board. For a graph without a
 * board, `view` is the camera of the last scene its surface view was given and `board` is that scene's signature.
 */
export interface SceneObservation {
    data: unknown;
    state: unknown;
    view: unknown;
    curves: unknown;
    board: string[];
}

export function observeScene(graph: BaseGraph<BaseGraphState>): SceneObservation {
    const internals = graph as unknown as GraphInternals;
    const board = internals.board;
    if (!board) {
        const last = surfaceViewOf(graph)?.last;
        return {data: json(internals.exportPresetData() ?? null), state: json(graph.state), view: json(cameraSignature(last)),
            curves: null, board: sceneSignature(last)};
    }
    return {
        data: json(internals.exportPresetData() ?? null),
        state: json(graph.state),
        view: json(board.getBoundingBox()),
        curves: json(internals.jxgCurves?.map(curve => ({
            attributes: curve.getAttributes(),
            selected: curve.isSelected(),
            standardForm: curve.inStandardForm?.(),
            farinPoints: curve.isShowingFarinPoints?.(),
            effectiveWeights: curve.getCurve().getEffectiveWeights?.(),
        })) ?? null),
        board: boardSignature(board),
    };
}

/** What the inspector controls show: switches, inputs, pressed buttons and status lines, in document order. */
export function controlsSignature(container: HTMLElement): string[] {
    const inspector = container.querySelector('#inspector-content') ?? container;
    const lines: string[] = [];
    inspector.querySelectorAll('input, select, button[aria-pressed], [role="status"]').forEach(element => {
        if (element instanceof HTMLInputElement) {
            if (element.type === 'text' && element.closest('#inspector-save')) return;
            lines.push(`${element.type}:${element.type === 'checkbox' ? element.checked : element.value}${element.disabled ? ':disabled' : ''}`);
        } else if (element instanceof HTMLSelectElement) {
            lines.push(`select:${element.value}`);
        } else if (element.hasAttribute('aria-pressed')) {
            lines.push(`button:${element.textContent}:${element.getAttribute('aria-pressed')}`);
        } else {
            lines.push(`status:${element.textContent}`);
        }
    });
    return lines;
}

export interface FullObservation extends SceneObservation {
    controls: string[];
}

export function observe(mounted: MountedGraph): FullObservation {
    return {...observeScene(mounted.graph), controls: controlsSignature(mounted.view.container)};
}
