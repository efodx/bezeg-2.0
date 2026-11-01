/**
 * Auxiliary-board lifetime of the PH hodograph on the real cubic and quintic graphs: after every sequence that hides,
 * replaces or remounts the hodograph, exactly the live hodograph keeps a board, a parent link, a resize observer,
 * generating-point bindings and editor subscriptions.
 */
import {StrictMode} from 'react';
import {MemoryRouter} from 'react-router-dom';
import {act, render} from '@testing-library/react';
import {GraphHost} from '../../base/GraphHost';
import {graphFactories} from '../../graphFactories';
import type {DemonstrationId} from '../../../demonstrations';
import {installBoardShims, mountGraph, REAL_GRAPH_TEST_TIMEOUT} from '../../base/realGraphTestHarness';
import {setLanguage} from '../../../localization';

vi.setConfig({testTimeout: REAL_GRAPH_TEST_TIMEOUT});
beforeAll(installBoardShims);

/** ResizeObserver stand-in counting live observations of hodograph hosts (JSXGraph observes its own container too). */
const observers = {live: 0};
beforeAll(() => {
    (window as any).ResizeObserver = class {
        private targets = new Set<Element>();
        observe(target: Element) { if (target.id === 'hodograph-input-box' && !this.targets.has(target)) { this.targets.add(target); observers.live++; } }
        unobserve(target: Element) { if (this.targets.delete(target)) observers.live--; }
        disconnect() { observers.live -= this.targets.size; this.targets.clear(); }
    };
});
beforeEach(() => { observers.live = 0; });
afterEach(() => setLanguage('sl'));

type Internals = {
    board: JXG.Board;
    hodographBoard?: JXG.Board;
    getFirstCurveAsPHBezierCurve(): {w: Array<{changeListeners?: Set<unknown>}>};
    getSelectedCurve(): unknown;
    deselectSelectedCurve(): void;
    exportPresetData(): unknown;
    importPresetData(data: unknown): void;
};

const liveBoards = () => Object.keys((globalThis as any).JXG.boards ?? {}).length;

function snapshot(graph: Internals) {
    const hodograph = graph.hodographBoard;
    const w = graph.getFirstCurveAsPHBezierCurve().w;
    return {
        boards: liveBoards(),
        parentLinks: (graph.board as any).dependentBoards?.length ?? 0,
        observers: observers.live,
        bindings: w.reduce((sum, point) => sum + (point.changeListeners?.size ?? 0), 0),
        editorOnHodograph: hodograph ? ((hodograph as any).eventHandlers?.up?.length ?? 0) : 0,
    };
}

describe.each(['ph-cubic', 'ph-quintic'] as DemonstrationId[])('%s hodograph lifetime', id => {
    const open = () => {
        const mounted = mountGraph(graphFactories[id]());
        const graph = mounted.graph as unknown as Internals;
        act(() => (graph as any).selectCurve((graph as any).jxgCurves[0]));
        return {mounted, graph};
    };
    const baseline = {boards: 2, parentLinks: 1};

    test('a mounted graph owns exactly one hodograph board, link, observer and set of bindings', () => {
        const {mounted, graph} = open();
        const live = snapshot(graph);
        expect(document.querySelectorAll('#hodograph-input-box').length).toBe(1);
        expect(graph.hodographBoard).toBeDefined();
        expect(live).toMatchObject(baseline);
        expect(live.bindings).toBeGreaterThan(0);
        const bindingsPerShow = live.bindings;
        // hide and show again
        act(() => graph.deselectSelectedCurve());
        const hidden = snapshot(graph);
        expect(hidden).toMatchObject({boards: 1, parentLinks: 0, observers: 0, bindings: 0, editorOnHodograph: 0});
        act(() => (graph as any).selectCurve((graph as any).jxgCurves[0]));
        expect(snapshot(graph)).toMatchObject({...baseline, bindings: bindingsPerShow});
        mounted.view.unmount();
        expect(liveBoards()).toBe(0);
        expect(observers.live).toBe(0);
    });

    test('Preset replacement keeps one hodograph and releases the old one', () => {
        const {mounted, graph} = open();
        const live = snapshot(graph);
        const data = graph.exportPresetData();
        for (let i = 0; i < 2; i++) {
            act(() => graph.importPresetData(data));
            act(() => (graph as any).selectCurve((graph as any).jxgCurves[0]));
        }
        expect(snapshot(graph)).toMatchObject({...baseline, bindings: live.bindings});
        mounted.view.unmount();
        expect(liveBoards()).toBe(0);
    });

    test('a language redraw neither duplicates nor drops the hodograph', () => {
        const {mounted, graph} = open();
        const live = snapshot(graph);
        act(() => setLanguage('en'));
        act(() => setLanguage('sl'));
        expect(snapshot(graph)).toMatchObject({...baseline, bindings: live.bindings});
        mounted.view.unmount();
        expect(liveBoards()).toBe(0);
        expect(observers.live).toBe(0);
    });

    test('unmount releases every board, link, observer and binding', () => {
        const {mounted, graph} = open();
        const w = graph.getFirstCurveAsPHBezierCurve().w;
        const parent = graph.board;
        mounted.view.unmount();
        expect(liveBoards()).toBe(0);
        expect(observers.live).toBe(0);
        expect((parent as any).dependentBoards?.length ?? 0).toBe(0);
        expect(w.every(point => (point.changeListeners?.size ?? 0) === 0)).toBe(true);
    });

    test('StrictMode mounts, disposes and mounts again with one hodograph and no leftovers', () => {
        const graph = graphFactories[id]();
        const view = render(<StrictMode><MemoryRouter><GraphHost create={() => graph}/></MemoryRouter></StrictMode>);
        const internals = graph as unknown as Internals;
        act(() => (internals as any).selectCurve((internals as any).jxgCurves[0]));
        expect(document.querySelectorAll('#hodograph-input-box').length).toBe(1);
        expect(snapshot(internals)).toMatchObject(baseline);
        // The lifetime's observer and JSXGraph's own, one live host: a leaked StrictMode first mount would show 4.
        expect(observers.live).toBe(2);
        view.unmount();
        expect(liveBoards()).toBe(0);
        expect(observers.live).toBe(0);
    });
});
