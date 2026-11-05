import React from 'react';
import {act, fireEvent, render, screen} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import CurveEvoluteGraph from './CurveEvoluteGraph';
import {CURVATURE_T_DEFAULT} from './CurvatureBezierCurveGraph';
import {evoluteCurvePresetCollection} from '../curvePresetCollections';
import {setLanguage, t} from '../../../localization';
import {GraphHost} from '../../base/GraphHost';
import type {LessonAction} from '../../../learning/model';
import type {Preset} from '../../base/presets/Presets';

// jsdom has no canvas and no matchMedia; JSXGraph touches both while creating a board.
beforeAll(() => {
    const context = new Proxy({}, {get: (_target, name) => name === 'measureText' ? () => ({width: 0}) : () => undefined});
    HTMLCanvasElement.prototype.getContext = (() => context) as unknown as HTMLCanvasElement['getContext'];
    window.matchMedia = (() => ({matches: false, addEventListener: () => undefined, removeEventListener: () => undefined,
        addListener: () => undefined, removeListener: () => undefined})) as unknown as typeof window.matchMedia;
});

/** The evolute overlay creates six elements: the trace curve, two auxiliary points, the normal line, the point E and its tag. */
const EVOLUTE_ELEMENTS = 6;

interface Drawn { elType: string; dataX?: number[]; dataY?: number[]; X?: () => number; Y?: () => number; plaintext?: string;
    evalVisProp: (name: string) => unknown; point1?: Drawn; point2?: Drawn }

class ObservedEvoluteGraph extends CurveEvoluteGraph {
    liveBoard() { return this.board; }

    apply(action: LessonAction) { this.applyLessonAction(action); }

    evoluteOwned(): Drawn[] { return [...this.evoluteElements()] as unknown as Drawn[]; }

    curvatureOwned() { return [...(this.overlay?.ownedElements() ?? [])]; }

    onBoard(elements: readonly unknown[], board = this.board) { return elements.filter(element => board.objectsList.includes(element as never)).length; }

    trace() { return this.evoluteOwned().find(e => e.elType === 'curve')!; }

    normalLine() { return this.evoluteOwned().find(e => e.elType === 'line')!; }

    /** The point E: the only diamond-faced point of the overlay is created fifth. */
    evolutePointElement() { return this.evoluteOwned()[4]; }

    /** The production path of a Preset: store it, select it; the scene replacement disposes the old scene and imports the new one. */
    async loadPreset(preset: Preset) {
        this.presetService!.savePreset(preset);
        await this.selectPreset(preset.id);
    }

    readout() {
        return ((this.board.objectsList as unknown as Drawn[]).find(o => o.elType === 'text' && (o.plaintext ?? '').includes('κ'))?.plaintext ?? '').split('<br>');
    }
}

function mount() {
    const graph = new ObservedEvoluteGraph();
    const view = render(<MemoryRouter><GraphHost create={() => graph}/></MemoryRouter>);
    return {graph, view};
}

/** Starts an operation inside `act` and awaits it outside, as the scene replacement needs the host to render meanwhile. */
async function settle(start: () => Promise<void>): Promise<void> {
    let pending: Promise<void> = Promise.resolve();
    act(() => { pending = start(); });
    await act(async () => { await pending; });
}

const flush = () => act(async () => { await Promise.resolve(); });
const lastFinite = (xs: number[], ys: number[]): [number, number] => {
    let i = xs.length - 1;
    while (i >= 0 && Number.isNaN(xs[i])) i--;
    return [xs[i], ys[i]];
};
const parabolaEvolute = (t: number): [number, number] => {
    const x = 2 * t - 1;
    return [-4 * x ** 3, 3 * x ** 2 + 0.5];
};
const distanceToLine = (line: Drawn, p: [number, number]) => {
    const a = line.point1!, b = line.point2!;
    const dx = b.X!() - a.X!(), dy = b.Y!() - a.Y!();
    return Math.abs(dx * (p[1] - a.Y!()) - dy * (p[0] - a.X!())) / Math.hypot(dx, dy);
};
const trace = (action: LessonAction['kind'] extends never ? never : 'hidden' | 'to-parameter' | 'full'): LessonAction => ({kind: 'evolute-trace', mode: action});

afterEach(() => setLanguage('sl'));

test('L4(2): on the real board the normal line passes through the evolute point E at several parameters, and E is the closed-form point', () => {
    const {graph, view} = mount();
    try {
        let checked = 0;
        for (const t of [0, 0.1, 0.3, 0.5, 0.8, 1]) {
            graph.setCurvatureT(t);
            graph.liveBoard().update();
            const e = graph.evolutePointElement();
            const expected = parabolaEvolute(t);
            expect(Math.abs(e.X!() - expected[0])).toBeLessThan(1e-9);
            expect(Math.abs(e.Y!() - expected[1])).toBeLessThan(1e-9);
            expect(distanceToLine(graph.normalLine(), [e.X!(), e.Y!()])).toBeLessThan(1e-9);
            checked++;
        }
        expect(checked).toBe(6);
        // The line is perpendicular to the curve: at x = 1 the tangent is (1, 2), so the normal is along (2, -1).
        const line = graph.normalLine();
        const [dx, dy] = [line.point2!.X!() - line.point1!.X!(), line.point2!.Y!() - line.point1!.Y!()];
        expect(Math.abs(dx * 1 + dy * 2) / Math.hypot(dx, dy) / Math.hypot(1, 2)).toBeLessThan(1e-9);
        expect(line.evalVisProp('straightFirst')).toBe(true);
        expect(line.evalVisProp('straightLast')).toBe(true);
    } finally {
        view.unmount();
    }
});

test('L4(4): the owned element count returns to the baseline after Reset, Preset import and unmount', async () => {
    const {graph, view} = mount();
    const board = graph.liveBoard();
    const baseline = board.objectsList.length;
    const owned = graph.evoluteOwned();
    const curvature = graph.curvatureOwned();
    expect(owned).toHaveLength(EVOLUTE_ELEMENTS);
    expect(curvature.length).toBeGreaterThan(8);
    expect(graph.onBoard(owned) + graph.onBoard(curvature)).toBe(owned.length + curvature.length);

    graph.setCurvatureT(0.9);
    graph.apply(trace('to-parameter'));
    await settle(() => graph.reset());
    await flush();
    expect(board.objectsList.length).toBe(baseline);
    expect(graph.evoluteOwned()).toHaveLength(EVOLUTE_ELEMENTS);
    expect(graph.onBoard(graph.evoluteOwned())).toBe(EVOLUTE_ELEMENTS);
    expect(graph.onBoard(owned)).toBe(0);
    expect(graph.state.curvatureT).toBe(CURVATURE_T_DEFAULT);
    expect(graph.state.evoluteTrace).toBe('full');

    const beforeImport = [...graph.evoluteOwned()];
    await settle(() => graph.loadPreset({id: 'quadratic', data: [['JSXBezierCurve', {points: [[-2, -1], [0, 3], [2, -1]]}]]}));
    await flush();
    expect(board.objectsList.length).toBe(baseline);
    expect(graph.onBoard(beforeImport)).toBe(0);
    expect(graph.onBoard(graph.evoluteOwned())).toBe(EVOLUTE_ELEMENTS);

    const last = [...graph.evoluteOwned(), ...graph.curvatureOwned()];
    view.unmount();
    expect(graph.onBoard(last, board)).toBe(0);
});

test('Edit controls and board agree at the start, after lesson actions, Reset, Preset import and a language switch', async () => {
    const {graph, view} = mount();
    const select = () => screen.getByLabelText(t('evolute_trace_label')) as HTMLSelectElement;
    const normalSwitch = () => screen.getByLabelText(t('evolute_normal_label')) as HTMLInputElement;
    const traceLength = () => graph.trace().dataX!.filter(v => !Number.isNaN(v)).length;
    const normalVisible = () => graph.normalLine().evalVisProp('visible');
    const agree = (mode: string, normal: boolean) => {
        expect(select().value).toBe(mode);
        expect(normalSwitch().checked).toBe(normal);
        expect(graph.state.evoluteTrace).toBe(mode);
        expect(graph.state.evoluteNormalShown).toBe(normal);
        expect(normalVisible()).toBe(normal);
        expect(traceLength() > 0).toBe(mode !== 'hidden');
    };
    try {
        agree('full', true);

        // Controls drive the board.
        fireEvent.change(select(), {target: {value: 'hidden'}});
        fireEvent.click(normalSwitch());
        await flush();
        agree('hidden', false);

        // Lesson actions drive the controls.
        act(() => { graph.apply(trace('to-parameter')); graph.apply({kind: 'curve-visibility', target: 'evolute-normal', visible: true}); });
        await flush();
        agree('to-parameter', true);

        // Bad values throw and change nothing.
        expect(() => graph.apply({kind: 'evolute-trace', mode: 'bogus' as never})).toThrow();
        expect(() => graph.apply({kind: 'curve-visibility', target: 'evolute-normal', visible: 'yes' as never})).toThrow();
        agree('to-parameter', true);

        // A Preset stored without the new fields restores the scene's starting values, as for the curvature flags (it does not carry the live ones over).
        await settle(() => graph.loadPreset({id: 'no-state', data: [['JSXBezierCurve', {points: [[-2, -1], [0, 3], [2, -1]]}]]}));
        await flush();
        agree('full', true);

        // Reset reloads the selected Preset; the default scene has the default values.
        act(() => { graph.apply(trace('hidden')); graph.apply({kind: 'curve-visibility', target: 'evolute-normal', visible: false}); });
        await settle(() => graph.selectPreset(''));
        await flush();
        agree('full', true);
        act(() => graph.apply(trace('hidden')));
        await settle(() => graph.reset());
        await flush();
        agree('full', true);

        // A language switch keeps the values and relabels the controls and the readout.
        act(() => graph.apply(trace('hidden')));
        setLanguage('en');
        await flush();
        expect(screen.getByLabelText('Evolute trace')).toHaveValue('hidden');
        expect(screen.getByLabelText('Normal at the point')).toBeInTheDocument();
        expect(graph.readout().at(-1)).toBe('Evolute point E = (0, 0.5)');
        setLanguage('sl');
        await flush();
        expect(screen.getByLabelText('Sled evolute')).toHaveValue('hidden');
        expect(graph.readout().at(-1)).toBe('Točka evolute E = (0, 0,5)');
        expect(graph.readout().slice(0, 2)).toEqual(['Ukrivljenost κ = 2', 'Krivinski polmer R = 0,5']);
    } finally {
        view.unmount();
    }
});

test('the readout shows E at the parameter, with the minus sign and decimal comma, and no negative zero', async () => {
    const {graph, view} = mount();
    try {
        graph.setCurvatureT(1);
        graph.liveBoard().update();
        expect(graph.readout().at(-1)).toBe('Točka evolute E = (−4, 3,5)');
        graph.setCurvatureT(0.5);
        graph.liveBoard().update();
        expect(graph.readout().at(-1)).not.toContain('−0');
        expect(graph.readout().at(-1)).toBe('Točka evolute E = (0, 0,5)');
    } finally {
        view.unmount();
    }
});

test('L4(3): where the evolute point does not exist the board tells so and E is hidden', async () => {
    const {graph, view} = mount();
    try {
        // A straight cubic: curvature 0 everywhere.
        await settle(() => graph.loadPreset({id: 'straight', data: [['JSXBezierCurve', {points: [[-2, -2], [-1, -1], [1, 1], [2, 2]]}]]}));
        await flush();
        graph.liveBoard().update();
        expect(graph.readout().at(-1)).toBe('Točke evolute ni: ukrivljenost je 0, središče krivinske krožnice je neskončno daleč');
        expect(graph.evolutePointElement().evalVisProp('visible')).toBe(false);
        expect(graph.trace().dataX).toEqual([]);
    } finally {
        view.unmount();
    }
});

test('L4(6)/(f): the to-parameter trace stops at the parameter and follows a parameter action; a multi-action sequence in one tick is read at once', async () => {
    const {graph, view} = mount();
    try {
        // One synchronous tick: state is written at once, the board follows after the host commits.
        act(() => {
            graph.apply(trace('to-parameter'));
            graph.apply({kind: 'parameter', name: 't', value: 0.3});
            expect(graph.state.evoluteTrace).toBe('to-parameter');
            expect(graph.state.curvatureT).toBe(0.3);
            graph.apply({kind: 'parameter', name: 't', value: 0.7});
            expect(graph.state.curvatureT).toBe(0.7);
        });
        await flush();
        const t1 = graph.trace();
        expect(t1.dataX!.length).toBeGreaterThan(100);
        let [lx, ly] = lastFinite(t1.dataX!, t1.dataY!);
        let [ex, ey] = parabolaEvolute(0.7);
        expect(lx).toBeCloseTo(ex, 9);
        expect(ly).toBeCloseTo(ey, 9);
        // It starts at t = 0, the point (4, 3.5).
        expect(t1.dataX![0]).toBeCloseTo(4, 9);

        act(() => graph.apply({kind: 'parameter', name: 't', value: 0.3}));
        await flush();
        [lx, ly] = lastFinite(graph.trace().dataX!, graph.trace().dataY!);
        [ex, ey] = parabolaEvolute(0.3);
        expect(lx).toBeCloseTo(ex, 9);
        expect(ly).toBeCloseTo(ey, 9);

        act(() => graph.apply(trace('full')));
        await flush();
        [lx, ly] = lastFinite(graph.trace().dataX!, graph.trace().dataY!);
        expect([lx, ly]).toEqual([expect.closeTo(-4, 9), expect.closeTo(3.5, 9)]);

        act(() => graph.apply(trace('hidden')));
        await flush();
        expect(graph.trace().dataX).toEqual([]);
    } finally {
        view.unmount();
    }
});

test('a scene that resets and sets the trace mode back within one batch still redraws what the overlay read mid-batch', async () => {
    const {graph, view} = mount();
    try {
        graph.apply(trace('hidden'));
        await flush();
        const committed = graph.state;
        // Mid-batch the board reads the other mode, then the batch returns to the committed value.
        graph.apply(trace('full'));
        graph.liveBoard().update();
        expect(graph.trace().dataX!.length).toBeGreaterThan(100);
        graph.apply(trace('hidden'));
        const boardUpdate = vi.fn();
        graph['boardUpdate'] = boardUpdate;
        graph['onStateChange']({...committed});
        expect(boardUpdate).toHaveBeenCalled();
    } finally {
        view.unmount();
    }
});

test('the evolute graph keeps its own Preset collection, view and default scene', () => {
    const graph = new ObservedEvoluteGraph();
    expect(graph.presetCollection()).toBe(evoluteCurvePresetCollection);
    expect(graph.getInitialState()).toMatchObject({evoluteTrace: 'full', evoluteNormalShown: true, curvatureT: CURVATURE_T_DEFAULT});
    const view = graph['initialView']();
    // The whole evolute (x in [-4, 4], y in [0.5, 3.5]) and the curve (y in [0, 1]) lie inside.
    expect(view[0]).toBeLessThan(-4);
    expect(view[2]).toBeGreaterThan(4);
    expect(view[1]).toBeGreaterThan(3.5);
    expect(view[3]).toBeLessThan(0);
    expect(evoluteCurvePresetCollection.check(JSON.parse(JSON.stringify(graph.defaultPreset())))).toHaveProperty('data');
});

test('a saved Preset restores the trace mode and the normal switch; the controls and the board follow', async () => {
    const {graph, view} = mount();
    try {
        act(() => { graph.apply(trace('to-parameter')); graph.apply({kind: 'curve-visibility', target: 'evolute-normal', visible: false}); });
        await flush();
        act(() => graph.saveCurrentPreset('mine'));
        act(() => { graph.apply(trace('hidden')); graph.apply({kind: 'curve-visibility', target: 'evolute-normal', visible: true}); });
        await flush();
        expect(graph.state.evoluteTrace).toBe('hidden');
        await settle(() => graph.selectPreset('mine'));
        await flush();
        expect(graph.state.evoluteTrace).toBe('to-parameter');
        expect(graph.state.evoluteNormalShown).toBe(false);
        expect((screen.getByLabelText(t('evolute_trace_label')) as HTMLSelectElement).value).toBe('to-parameter');
        expect((screen.getByLabelText(t('evolute_normal_label')) as HTMLInputElement).checked).toBe(false);
        expect(graph.normalLine().evalVisProp('visible')).toBe(false);
        expect(graph.trace().dataX!.length).toBeGreaterThan(100);
    } finally {
        view.unmount();
    }
});
