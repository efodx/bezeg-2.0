import React from 'react';
import {act, render, screen} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import type {GeometryElement} from 'jsxgraph';
import CurveOffsetGraph, {OFFSET_DISTANCE_DEFAULT, OFFSET_PARABOLA_POINTS} from './CurveOffsetGraph';
import {OFFSET_SAMPLES_DEFAULT, OFFSET_SAMPLES_MAX, offsetTrace} from './curveOffset';
import {setLanguage, t} from '../../../localization';
import {GraphHost} from '../../base/GraphHost';
import {LessonAction} from '../../../learning/model';

/** Counts live language subscriptions, so a leaked listener shows even though the overlay also guards its callback. */
const liveSubscriptions = vi.hoisted(() => ({count: 0}));
vi.mock('../../../localization', async importOriginal => {
    const original = await importOriginal<typeof import('../../../localization')>();
    return {
        ...original,
        onLanguageChange: (listener: () => void) => {
            liveSubscriptions.count++;
            const unsubscribe = original.onLanguageChange(listener);
            let released = false;
            return () => { if (!released) { released = true; liveSubscriptions.count--; } unsubscribe(); };
        },
    };
});

// jsdom has no canvas and no matchMedia; JSXGraph touches both while creating a board.
beforeAll(() => {
    const context = new Proxy({}, {get: (_target, name) => name === 'measureText' ? () => ({width: 0}) : () => undefined});
    HTMLCanvasElement.prototype.getContext = (() => context) as unknown as HTMLCanvasElement['getContext'];
    window.matchMedia = (() => ({matches: false, addEventListener: () => undefined, removeEventListener: () => undefined,
        addListener: () => undefined, removeListener: () => undefined})) as unknown as typeof window.matchMedia;
});

beforeEach(() => localStorage.clear());
afterEach(() => setLanguage('sl'));

type BoardObject = GeometryElement & { plaintext?: string; dataX?: number[]; dataY?: number[] };

class Probe extends CurveOffsetGraph {
    liveBoard() { return this.board; }
    act(action: LessonAction) { this.applyLessonAction(action); }
    trace() { return (this.offset()!.ownedElements() as unknown as BoardObject[]).find(element => element.elType === 'curve')!; }
    captions() { return (this.offset()!.ownedElements() as unknown as BoardObject[]).filter(element => element.elType === 'text').map(element => element.plaintext ?? '').filter(Boolean); }
    /** The text of the live region as the readout currently publishes it. */
    published(): string { return this['liveReadout'].getSnapshot(); }
    /** Board objects without tick labels (a pool whose size follows the view). */
    countWithoutTickLabels(): number {
        const owned = this.offset()?.ownedElements() ?? [];
        return (this.board.objectsList as GeometryElement[]).filter(element => !(element.elType === 'text' && !owned.includes(element))).length;
    }
}

function mount() {
    const graph = new Probe();
    const view = render(<MemoryRouter><GraphHost create={() => graph}/></MemoryRouter>);
    return {graph, view};
}

async function settle(start: () => Promise<void>): Promise<void> {
    let pending: Promise<void> = Promise.resolve();
    act(() => { pending = start(); });
    await act(async () => { await pending; });
}

describe('lesson actions run in one synchronous tick', () => {
    test('a multi-action scene reads the state each earlier action wrote, and the board follows once the host commits', () => {
        const {graph, view} = mount();
        try {
            const kinds: string[] = [];
            act(() => {
                graph.act({kind: 'offset-curve', curve: 'ph'});
                kinds.push(graph.curveKind());
                graph.act({kind: 'offset-distance', value: 1.5});
                expect(graph.state.offsetD).toBe(1.5);
                graph.act({kind: 'offset-samples', value: 100});
                graph.act({kind: 'curve-visibility', target: 'offset-trace', visible: false});
                expect(graph.state.offsetShown).toBe(false);
                graph.act({kind: 'curve-visibility', target: 'offset-trace', visible: true});
                graph.act({kind: 'curve-visibility', target: 'offset-cusps', visible: true});
                graph.act({kind: 'curve-visibility', target: 'offset-speed-plot', visible: true});
                // The values written by the earlier actions survive the scene replacement of the next one, within the same tick.
                graph.act({kind: 'offset-curve', curve: 'bezier'});
                kinds.push(graph.curveKind());
                expect(graph.state).toMatchObject({offsetD: 1.5, offsetSamples: 100, offsetShown: true, offsetCuspsShown: true, offsetSpeedPlotShown: true});
                graph.act({kind: 'offset-distance', value: -1});
            });
            expect(kinds).toEqual(['ph', 'bezier']);
            expect(graph.controlRows()).toEqual(OFFSET_PARABOLA_POINTS);
            expect(graph.trace().dataX).toEqual(offsetTrace(OFFSET_PARABOLA_POINTS, -1, 100).x);
            expect(graph.trace().dataX).toHaveLength(100);
            expect(graph.offset()!.cuspCount()).toBe(2);
            expect(screen.getByTestId('offset-speed-plot-curve').getAttribute('d')).toMatch(/^M/);
        } finally { view.unmount(); }
    });

    test('invalid values throw and leave the state alone', () => {
        const {graph, view} = mount();
        try {
            const before = {...graph.state};
            const bad: LessonAction[] = [
                {kind: 'offset-distance', value: 3.01}, {kind: 'offset-distance', value: -3.01}, {kind: 'offset-distance', value: NaN},
                {kind: 'offset-samples', value: 63}, {kind: 'offset-samples', value: OFFSET_SAMPLES_MAX + 1}, {kind: 'offset-samples', value: 100.5},
                {kind: 'offset-curve', curve: 'spline' as never},
                {kind: 'curve-visibility', target: 'offset-trace', visible: 'yes' as never},
            ];
            for (const action of bad) expect(() => graph.act(action)).toThrow();
            expect(graph.state).toEqual(before);
            expect(graph.curveKind()).toBe('bezier');
            // The limits themselves are valid.
            act(() => { graph.act({kind: 'offset-distance', value: 3}); graph.act({kind: 'offset-distance', value: -3}); graph.act({kind: 'offset-samples', value: 64}); });
            expect(graph.state).toMatchObject({offsetD: -3, offsetSamples: 64});
        } finally { view.unmount(); }
    });

    test('offset-curve is not a visibility target of this graph (it is the PH graph\'s exact offset)', () => {
        const {graph, view} = mount();
        try {
            const before = {...graph.state};
            expect(() => graph.act({kind: 'curve-visibility', target: 'offset-curve', visible: false})).toThrow(/does not support/);
            expect(graph.state).toEqual(before);
            expect(graph.trace().dataX!.length).toBe(OFFSET_SAMPLES_DEFAULT);
        } finally { view.unmount(); }
    });
});

describe('Preset round trip and Reset', () => {
    test('a saved Preset restores d, samples and the switches', async () => {
        const {graph, view} = mount();
        try {
            act(() => {
                graph.setOffsetDistance(-0.8); graph.setOffsetSamples(200); graph.setOffsetCuspsShown(true);
                graph.setOffsetSpeedPlotShown(true); graph.setOffsetShown(false);
            });
            act(() => graph.saveCurrentPreset('mine'));
            act(() => { graph.setOffsetDistance(1); graph.setOffsetSamples(64); graph.setOffsetCuspsShown(false); graph.setOffsetShown(true); });
            await settle(() => graph.selectPreset('mine'));
            expect(graph.state).toMatchObject({offsetD: -0.8, offsetSamples: 200, offsetCuspsShown: true, offsetSpeedPlotShown: true, offsetShown: false});
            expect(graph.offset()).toBeDefined();
            expect(graph.offset()!.cuspCount()).toBe(2);
            expect(screen.getByRole('slider', {name: t('offset_samples')})).toHaveValue('200');
        } finally { view.unmount(); }
    });

    test('out-of-range stored values are refused and the scene on show stays; live out-of-range state is clamped when read', async () => {
        const {graph, view} = mount();
        try {
            act(() => graph.saveCurrentPreset('wild'));
            const key = Object.keys(localStorage).find(name => name.includes('preset-curve-offset'))!;
            const stored = JSON.parse(localStorage.getItem(key)!);
            stored.data[0].graphState.offsetD = 99;
            stored.data[0].graphState.offsetSamples = 9999;
            localStorage.setItem(key, JSON.stringify(stored));
            const shown = graph.trace().dataX?.slice();
            const distance = (screen.getByRole('slider', {name: t('offset_distance')}) as HTMLInputElement).value;
            // The collection refuses offsetD and offsetSamples outside their ranges, as the file import does; nothing is drawn from them.
            await settle(() => graph.selectPreset('wild'));
            expect(graph.trace().dataX).toEqual(shown);
            expect(screen.getByRole('slider', {name: t('offset_distance')})).toHaveValue(distance);
            act(() => graph.setState({offsetD: NaN, offsetSamples: 100.4}));
            expect(graph.trace().dataX).toEqual(offsetTrace(OFFSET_PARABOLA_POINTS, OFFSET_DISTANCE_DEFAULT, 100).x);
        } finally { view.unmount(); }
    });

    test('Reset after the PH curve returns to the parabola and its view, and clears the PH offset', async () => {
        const {graph, view} = mount();
        const setBox = vi.spyOn(graph.liveBoard(), 'setBoundingBox');
        try {
            act(() => { graph.setCurveKind('ph'); graph.setOffsetDistance(1); });
            expect(setBox).toHaveBeenLastCalledWith([-6, 5, 6, -5], true);
            setBox.mockClear();
            await settle(() => graph.reset());
            expect(graph.curveKind()).toBe('bezier');
            expect(graph.controlRows()).toEqual(OFFSET_PARABOLA_POINTS);
            expect(setBox).toHaveBeenLastCalledWith([-2.6, 2.2, 2.6, -1.6], true);
            expect(graph.trace().dataX).toEqual(offsetTrace(OFFSET_PARABOLA_POINTS, graph.state.offsetD, graph.state.offsetSamples).x);
            expect(graph.state.offsetD).toBe(OFFSET_DISTANCE_DEFAULT);
            expect(graph.captions()).not.toContain(t('offset_readout_exact_ph'));
        } finally { view.unmount(); }
    });

    test('known limit: a PH Preset without board state is shown in the parabola view, not the PH view', async () => {
        const {graph, view} = mount();
        try {
            act(() => { graph.setCurveKind('ph'); graph.saveCurrentPreset('noview'); graph.setCurveKind('bezier'); });
            const key = Object.keys(localStorage).find(name => name.includes('preset-curve-offset'))!;
            const stored = JSON.parse(localStorage.getItem(key)!);
            delete stored.data[0].boardState;
            localStorage.setItem(key, JSON.stringify(stored));
            const setBox = vi.spyOn(graph.liveBoard(), 'setBoundingBox');
            await settle(() => graph.selectPreset('noview'));
            expect(graph.curveKind()).toBe('ph');
            // Observed: the view is the Bezier initial view, so the PH base point (-4.2, -2) lies outside it.
            expect(setBox).toHaveBeenLastCalledWith([-2.6, 2.2, 2.6, -1.6], true);
        } finally { view.unmount(); }
    });
});

describe('the live region', () => {
    test('is replaced at once on a scene replacement, with no stale text', () => {
        const {graph, view} = mount();
        try {
            const first = graph.published();
            expect(first).toBe(graph.offset()!.readoutText());
            act(() => graph.setOffsetDistance(-1));
            // A change is settled after a quiet period, so the region still shows the earlier text.
            expect(graph.published()).toBe(first);
            act(() => graph.setCurveKind('ph'));
            const expected = graph.offset()!.readoutText();
            expect(expected).toContain(t('offset_readout_exact_ph'));
            expect(graph.published()).toBe(expected);
            expect(document.querySelector('[data-readout-live]')).toHaveTextContent(expected);
            act(() => graph.setCurveKind('bezier'));
            expect(graph.published()).toBe(graph.offset()!.readoutText());
            expect(graph.published()).not.toContain(t('offset_readout_exact_ph'));
        } finally { view.unmount(); }
    });
});

describe('ownership and disposal', () => {
    test('the owned elements leave the board on dispose, which is idempotent', () => {
        const before = liveSubscriptions.count;
        const {graph, view} = mount();
        const board = graph.liveBoard();
        try {
            const overlay = graph.offset()!;
            const owned = [...overlay.ownedElements()];
            expect(owned.length).toBeGreaterThan(0);
            owned.forEach(element => expect(board.objectsList.includes(element)).toBe(true));
            const live = liveSubscriptions.count;
            overlay.dispose();
            overlay.dispose();
            expect(liveSubscriptions.count).toBe(live - 1);
            owned.forEach(element => expect(board.objectsList.includes(element)).toBe(false));
        } finally { view.unmount(); }
        expect(liveSubscriptions.count).toBe(before);
    });

    test('ten kind switches leave a constant board object count, and each old overlay is gone', () => {
        const {graph, view} = mount();
        const board = graph.liveBoard();
        try {
            const counts = new Map<string, number>([['bezier', graph.countWithoutTickLabels()]]);
            const seen: GeometryElement[] = [...graph.offset()!.ownedElements()];
            const subscriptions = liveSubscriptions.count;
            for (let i = 0; i < 10; i++) {
                const kind = i % 2 === 0 ? 'ph' : 'bezier';
                const previous = [...graph.offset()!.ownedElements()];
                act(() => graph.setCurveKind(kind));
                previous.forEach(element => expect(board.objectsList.includes(element)).toBe(false));
                graph.offset()!.ownedElements().forEach(element => expect(board.objectsList.includes(element)).toBe(true));
                seen.push(...graph.offset()!.ownedElements());
                const known = counts.get(kind);
                if (known === undefined) counts.set(kind, graph.countWithoutTickLabels());
                else expect(graph.countWithoutTickLabels()).toBe(known);
                expect(liveSubscriptions.count).toBe(subscriptions);
            }
            expect(graph.curveKind()).toBe('bezier');
            expect(graph.countWithoutTickLabels()).toBe(counts.get('bezier'));
            const last = [...graph.offset()!.ownedElements()];
            view.unmount();
            last.forEach(element => expect(board.objectsList.includes(element)).toBe(false));
            seen.forEach(element => expect(board.objectsList.includes(element)).toBe(false));
        } finally { view.unmount(); }
    });

    test('unmount releases the language subscription', () => {
        const before = liveSubscriptions.count;
        const {view} = mount();
        expect(liveSubscriptions.count).toBeGreaterThan(before);
        view.unmount();
        expect(liveSubscriptions.count).toBe(before);
    });
});
