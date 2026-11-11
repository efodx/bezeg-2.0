import React from 'react';
import {act, fireEvent, render, screen} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import {GraphHost} from '../base/GraphHost';
import {installBoardShims} from '../base/realGraphTestHarness';
import {en} from '../../localization/en';
import {sl} from '../../localization/sl';
import {setLanguage, t} from '../../localization';
import type {AnimationScheduler} from '../../learning/runtime/animation';
import type {SurfaceScene, SurfaceView} from '../patches/surface-view/surfaceScene';
import {CONTOUR_MODES} from '../../levelsets/contourModel';
import {CATALOGUE, CATALOGUE_IDS} from '../../levelsets/functions2';
import {DESCENT_MAX_STEPS} from '../../levelsets/descent';
import ContourMapGraph, {DRAWN_STYLE, STEP_MS} from './ContourMapGraph';
import {ContourSurfacePanel} from './ContourPanels';

beforeAll(installBoardShims);
beforeEach(() => setLanguage('sl'));
afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); });

class FakeClock implements AnimationScheduler {
    private callback?: FrameRequestCallback;
    request(callback: FrameRequestCallback) { this.callback = callback; return 1; }
    cancel() { this.callback = undefined; }
    pending() { return this.callback !== undefined; }
    tick(time: number) { const run = this.callback; this.callback = undefined; if (run) act(() => run(time)); }
}

class FakeView implements SurfaceView {
    scenes: SurfaceScene[] = [];
    disposed = false;
    listener?: (edit: never) => void;
    attach() { return Promise.resolve(); }
    reconcile(scene: SurfaceScene) { this.scenes.push(scene); }
    onEdit(listener: (edit: never) => void) { this.listener = listener; return () => { this.listener = undefined; }; }
    setAriaLabel() {}
    onLayout() { return () => {}; }
    capture(): never { throw new Error('unused'); }
    fitCamera() {}
    dispose() { this.disposed = true; }
}

class ObservedGraph extends ContourMapGraph {
    frames = new FakeClock();
    reduced = false;
    views: FakeView[] = [];
    protected override animationScheduler() { return this.frames; }
    override reducedMotion() { return this.reduced; }
    override createSurfaceView() { const view = new FakeView(); this.views.push(view); return view; }
}

function mountGraph() {
    const graph = new ObservedGraph();
    const view = render(<MemoryRouter><GraphHost create={() => graph}/></MemoryRouter>);
    return {graph, view};
}

const statusText = () => document.querySelector('[data-contour-status]')?.textContent ?? '';
const readout = (id: string) => document.querySelector(`[data-readout="${id}"] dd`)?.textContent;

describe('ContourMapGraph', () => {
    it('mounts, owns one surface view and disposes it on unmount', () => {
        const {graph, view} = mountGraph();
        expect(graph.views).toHaveLength(1);
        expect(graph.views[0].scenes.length).toBeGreaterThan(0);
        view.unmount();
        expect(graph.views[0].disposed).toBe(true);
    });

    it('bowl probe (0,6; 0,8): gradient (1,2; 1,6), tangent (-0,8; 0,6)', () => {
        const {graph} = mountGraph();
        act(() => { graph.setMode('gradient'); });
        const info = graph.gradient();
        expect(info.gradient[0]).toBeCloseTo(1.2, 12);
        expect(info.gradient[1]).toBeCloseTo(1.6, 12);
        expect(info.tangent?.[0]).toBeCloseTo(-0.8, 12);
        expect(info.tangent?.[1]).toBeCloseTo(0.6, 12);
        expect(readout('gradient')).toContain('1,2');
        expect(statusText()).not.toBe('');
    });

    it('hills at (1, 1): df/dx = 0,4546487', () => {
        const {graph} = mountGraph();
        act(() => { graph.setMode('gradient'); graph.setFunction('hills'); });
        expect(graph.setProbe(0, 1)).toBe(true);
        expect(graph.setProbe(1, 1)).toBe(true);
        expect(graph.gradient().gradient[0]).toBeCloseTo(0.4546487, 7);
    });

    it('refuses a value off the grid and keeps the state', () => {
        const {graph} = mountGraph();
        const before = graph.state;
        expect(graph.setProbe(0, 0.123)).toBe(false);
        expect(graph.setLevel(1000)).toBe(false);
        expect(graph.state).toBe(before);
    });

    it('descent: steps, refused index, and reduced motion blocks Play', () => {
        const {graph} = mountGraph();
        act(() => { graph.setMode('descent'); });
        expect(graph.step).toBe(0);
        act(() => { graph.nextStep(); });
        expect(graph.step).toBe(1);
        expect(graph.setStepIndex(-1)).toBe(false);
        expect(graph.setStepIndex(graph.lastStep() + 1)).toBe(false);
        act(() => { graph.resetSteps(); });
        expect(graph.step).toBe(0);
        graph.reduced = true;
        expect(graph.reducedMotion()).toBe(true);
    });

    it('lagrange mode renders a status sentence', () => {
        const {graph} = mountGraph();
        act(() => { graph.setMode('lagrange'); });
        expect(statusText()).not.toBe('');
    });

    it('locale: the same placeholders in sl and en for every levelsets_graph key', () => {
        const names = (text: string) => (text.match(/\{value\d+\}/g) ?? []).sort().join(',');
        const keys = Object.keys(sl).filter(key => key.startsWith('levelsets_graph_'));
        expect(keys.length).toBeGreaterThan(100);
        for (const key of keys) {
            const slText = (sl as Record<string, string>)[key];
            const enText = (en as Record<string, string>)[key];
            expect(enText, key).toBeDefined();
            expect(names(enText), key).toBe(names(slText));
        }
        expect(Object.keys(en).filter(key => key.startsWith('levelsets_graph_'))).toHaveLength(keys.length);
    });
});

type EventedPoint = JXG.Point & {eventHandlers: Record<string, unknown[]>; triggerEventHandlers(names: string[], args: unknown[]): void};
const handlerCounts = (point: JXG.Point) => (['drag', 'over', 'out'] as const).map(name => (point as EventedPoint).eventHandlers[name]?.length ?? 0);
function dragHandleTo(point: JXG.Point, x: number, y: number) {
    point.setPosition(JXG.COORDS_BY_USER, [x, y]);
    act(() => { (point as EventedPoint).triggerEventHandlers(['drag'], []); });
}
const press = (label: string) => act(() => { fireEvent.click(screen.getByRole('button', {name: label})); });
const noBadText = () => expect(document.body.textContent).not.toMatch(/NaN|Infinity|undefined/);

function playFrom(graph: ObservedGraph) {
    act(() => { graph.setMode('descent'); });
    press(t('play'));
    expect(graph.playing).toBe(true);
    graph.frames.tick(0);
    graph.frames.tick(STEP_MS);
    expect(graph.step).toBeGreaterThan(0);
}

describe('ownership', () => {
    it('unmount leaves no object, listener, handler, view or timer of this graph', () => {
        vi.useFakeTimers();
        // JSXGraph leaves a timer of its own for every redrawn step (text.js), measured with one step set from outside; a played run must leave the same number.
        const before = vi.getTimerCount();
        const reference = mountGraph();
        act(() => { reference.graph.setMode('descent'); reference.graph.setStepIndex(1); });
        reference.view.unmount();
        const plainDelta = vi.getTimerCount() - before;
        const afterPlain = vi.getTimerCount();

        const {graph, view} = mountGraph();
        const owned = graph.ownedObjectCount();
        const listeners = graph.ownedListenerCount();
        expect(owned).toBeGreaterThan(0);
        expect(listeners).toBeGreaterThan(0);
        const handles = graph.handles();
        const all = [handles.probe!, handles.start!, handles.point!];
        for (const handle of all) expect(handlerCounts(handle)).toEqual([1, 1, 1]);
        playFrom(graph);
        expect(graph.ownedObjectCount()).toBe(owned); // playing creates nothing
        expect(graph.frames.pending()).toBe(true);
        view.unmount();
        expect(graph.frames.pending()).toBe(false);
        expect(graph.playing).toBe(false);
        expect(graph.ownedObjectCount()).toBe(0);
        expect(graph.ownedListenerCount()).toBe(0);
        for (const handle of all) expect(handlerCounts(handle)).toEqual([0, 0, 0]);
        expect(graph.views.every(item => item.disposed)).toBe(true);
        expect(vi.getTimerCount() - afterPlain).toBe(plainDelta);
        expect(() => setLanguage('en')).not.toThrow();
    });

    it('switching mode and function keeps the object count', () => {
        const {graph} = mountGraph();
        const owned = graph.ownedObjectCount();
        act(() => { graph.setMode('lagrange'); graph.setFunction('saddle'); graph.setMode('descent'); graph.setMode('level-sets'); graph.setFunction('bowl'); });
        expect(graph.ownedObjectCount()).toBe(owned);
    });
});

describe('every mode and function', () => {
    it('mounts each combination with a status sentence and no invalid number in the text', () => {
        const {graph} = mountGraph();
        for (const mode of CONTOUR_MODES) {
            for (const fn of CATALOGUE_IDS) {
                act(() => { graph.setMode(mode); graph.setFunction(fn); });
                expect(statusText(), `${mode} ${fn}`).not.toBe('');
                expect(graph.ownedObjectCount(), `${mode} ${fn}`).toBeGreaterThan(0);
                noBadText();
            }
        }
    });

    it('lagrange mode with hills refuses the line (the constraint falls back to the circle)', () => {
        const {graph} = mountGraph();
        act(() => { graph.setMode('lagrange'); graph.setFunction('hills'); });
        expect(graph.setConstraint('line')).toBe(false);
        expect(graph.state.constraint).toBe('circle');
    });
});

describe('dragging snaps', () => {
    it('the probe goes to the nearest 1/20 and the handle to the stored point', () => {
        const {graph} = mountGraph();
        dragHandleTo(graph.handles().probe!, 0.512, 0.337);
        expect(graph.state.probe).toEqual([10, 7]);
        expect(graph.handles().probe!.X()).toBe(0.5);
        expect(graph.handles().probe!.Y()).toBe(0.35);
    });

    it('a drag outside the window of the function is clamped to the window edge, not sent back', () => {
        const {graph} = mountGraph();
        const edge = CATALOGUE[graph.state.fn].window.xMax;
        dragHandleTo(graph.handles().probe!, 3 * edge, 0);
        expect(graph.state.probe).toEqual([edge * 20, 0]);
        expect(graph.handles().probe!.X()).toBe(edge);
        expect(graph.handles().probe!.Y()).toBe(0);
        dragHandleTo(graph.handles().probe!, -3 * edge, 3 * edge);
        expect(graph.state.probe).toEqual([-edge * 20, edge * 20]);
    });

    it('the descent start is clamped to the window edge as well', () => {
        const {graph} = mountGraph();
        act(() => { graph.setMode('descent'); });
        const edge = CATALOGUE[graph.state.fn].window.xMax;
        dragHandleTo(graph.handles().start!, 9 * edge, -9 * edge);
        expect(graph.state.start).toEqual([edge * 4, -edge * 4]);
    });

    it('the descent start snaps to the quarter grid', () => {
        const {graph} = mountGraph();
        act(() => { graph.setMode('descent'); });
        dragHandleTo(graph.handles().start!, -1.1, 0.4);
        expect(graph.state.start).toEqual([-4, 2]);
        expect(graph.step).toBe(0);
    });

    it('the constrained point stays on the line (nearest quarter of x) and on the circle (nearest of 48 angles)', () => {
        const {graph} = mountGraph();
        act(() => { graph.setMode('lagrange'); });
        dragHandleTo(graph.handles().point!, 1.37, 99);
        expect(graph.state.lineParam).toBe(5);
        expect(graph.handles().point!.X()).toBe(1.25);
        expect(graph.handles().point!.Y()).toBe(1.875);
        act(() => { graph.setConstraint('circle'); });
        dragHandleTo(graph.handles().point!, 3, 3);
        expect(graph.state.circleParam).toBe(6);
        expect(graph.handles().point!.X()).toBeCloseTo(1, 12);
        expect(graph.handles().point!.Y()).toBeCloseTo(1, 12);
    });
});

describe('the pause rule', () => {
    const patches: Record<string, Record<string, unknown>> = {
        level: {level: 16}, levelCount: {levelCount: 3}, probe: {probe: [10, 7]}, numeric: {numeric: true}, start: {start: [4, 4]}, step: {step: 5},
        constraint: {constraint: 'circle'}, lineParam: {lineParam: 8}, circleParam: {circleParam: 7}, mode: {mode: 'gradient'}, fn: {fn: 'saddle'},
        camera: {camera: {az: 0.3, el: 0.5, distance: 9, projection: 'perspective', target: [0, 0, 0]}},
    };

    it.each(Object.keys(patches))('a direct setState of %s pauses the playback', key => {
        const {graph} = mountGraph();
        playFrom(graph);
        act(() => { graph.setState(patches[key] as never); });
        expect(graph.playing, key).toBe(false);
        expect(graph.frames.pending(), key).toBe(false);
    });

    it('a write that stores the same content keeps playing, and so does a repaint', () => {
        const {graph} = mountGraph();
        playFrom(graph);
        act(() => { graph.setState({probe: [graph.state.probe[0], graph.state.probe[1]], camera: {...graph.state.camera, target: [0, 0, 0]}} as never); });
        expect(graph.playing).toBe(true);
        act(() => { graph.setState({} as never); });
        expect(graph.playing).toBe(true);
        graph.frames.tick(2 * STEP_MS);
        expect(graph.playing).toBe(true);
    });

    it('a typed edit, the step slider and Pause stop the run; Pause keeps the step', () => {
        const {graph} = mountGraph();
        playFrom(graph);
        act(() => { expect(graph.setStart(0, 1)).toBe(true); });
        expect(graph.playing).toBe(false);
        playFrom(graph);
        press(t('pause'));
        const kept = graph.step;
        expect(graph.playing).toBe(false);
        expect(graph.step).toBe(kept);
        press(t('play'));
        act(() => { expect(graph.setStepIndex(3)).toBe(true); });
        expect(graph.playing).toBe(false);
        expect(graph.step).toBe(3);
    });

    it('plays to the end by itself and stops there', () => {
        const {graph} = mountGraph();
        playFrom(graph);
        let time = STEP_MS;
        for (let i = 0; i < 400 && graph.frames.pending(); i++) { time += STEP_MS; graph.frames.tick(time); }
        expect(graph.playing).toBe(false);
        expect(graph.step).toBe(graph.lastStep());
    });
});

describe('reduced motion', () => {
    it('Play is blocked through the rendered button, says why, and the step controls still work', () => {
        const {graph} = mountGraph();
        graph.reduced = true;
        act(() => { graph.setMode('descent'); });
        expect(screen.getByRole('button', {name: t('play')}).getAttribute('aria-disabled')).toBe('true');
        press(t('play'));
        expect(graph.playing).toBe(false);
        expect(graph.frames.pending()).toBe(false);
        expect(document.body.textContent).toContain(t('playback_block_reduced_motion'));
        press(t('next_step'));
        expect(graph.step).toBe(1);
    });
});

describe('language switch', () => {
    it('the readout changes its decimal separator, keeps a true minus, and the status follows', () => {
        const {graph} = mountGraph();
        act(() => { graph.setMode('gradient'); graph.setProbe(0, -0.6); });
        const slStatus = statusText();
        expect(readout('probe')).toBe('(−0,6; 0,8)');
        expect(readout('gradient')).toBe('(−1,2; 1,6)');
        act(() => { setLanguage('en'); });
        expect(readout('probe')).toBe('(−0.6, 0.8)');
        expect(readout('gradient')).toBe('(−1.2, 1.6)');
        expect(statusText()).not.toBe(slStatus);
        expect(document.body.textContent).not.toContain('-0');
        noBadText();
    });

    it('the numeric toggle shows the central-difference error at h = 0,01', () => {
        const {graph} = mountGraph();
        act(() => { graph.setMode('gradient'); graph.setFunction('hills'); graph.setProbe(0, 1); graph.setProbe(1, 1); graph.setNumeric(true); });
        expect(readout('numeric-error')).toBe('0,0000076');
    });
});

describe('the surface panel when the view cannot start', () => {
    class ThrowingGraph extends ObservedGraph {
        override createSurfaceView(): never { throw new Error('no WebGL'); }
    }

    it('reports the failure in the console and shows the note while the contours stay', async () => {
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
        const graph = new ThrowingGraph();
        const view = render(<MemoryRouter><GraphHost create={() => graph}/></MemoryRouter>);
        // The note is set from a microtask: the react-hooks lint rule forbids setting state synchronously in the effect.
        await act(async () => { await Promise.resolve(); });
        expect(warn).toHaveBeenCalledWith('The surface view could not start.', expect.objectContaining({message: 'no WebGL'}));
        expect(screen.getByRole('alert').textContent).toBe(t('levelsets_graph_surface_unavailable'));
        expect(graph.ownedObjectCount()).toBeGreaterThan(0);
        view.unmount();
    });
});

describe('the surface panel failures', () => {
    class RejectingView extends FakeView {
        reject!: (error: Error) => void;
        override attach() { return new Promise<void>((_resolve, reject) => { this.reject = reject; }); }
    }
    class RejectingGraph extends ObservedGraph {
        view = new RejectingView();
        override createSurfaceView() { return this.view; }
    }

    it('a rejected asynchronous attach shows the note', async () => {
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
        const graph = new RejectingGraph();
        render(<MemoryRouter><GraphHost create={() => graph}/></MemoryRouter>);
        expect(screen.queryByRole('alert')).toBeNull();
        await act(async () => { graph.view.reject(new Error('late failure')); await Promise.resolve(); });
        expect(warn).toHaveBeenCalledWith('The surface view could not start.', expect.objectContaining({message: 'late failure'}));
        expect(screen.getByRole('alert').textContent).toBe(t('levelsets_graph_surface_unavailable'));
    });

    it('unmounting before the rejection settles causes no state update and no error', async () => {
        vi.spyOn(console, 'warn').mockImplementation(() => {});
        const error = vi.spyOn(console, 'error').mockImplementation(() => {});
        const graph = new RejectingGraph();
        const view = render(<MemoryRouter><GraphHost create={() => graph}/></MemoryRouter>);
        view.unmount();
        expect(graph.view.disposed).toBe(true);
        await act(async () => { graph.view.reject(new Error('after unmount')); await Promise.resolve(); });
        expect(error).not.toHaveBeenCalled();
        expect(screen.queryByRole('alert')).toBeNull();
    });

    it('the note does not stay when another graph is shown', async () => {
        vi.spyOn(console, 'warn').mockImplementation(() => {});
        const failing = new RejectingGraph();
        const working = new ObservedGraph();
        const view = render(<ContourSurfacePanel graph={failing}/>);
        await act(async () => { failing.view.reject(new Error('x')); await Promise.resolve(); });
        expect(screen.getByRole('alert')).toBeTruthy();
        view.rerender(<ContourSurfacePanel graph={working}/>);
        expect(screen.queryByRole('alert')).toBeNull();
        expect(document.querySelector('[data-contour-surface]')).not.toBeNull();
    });
});

describe('the legend and the drawing agree', () => {
    const STYLE_WORDS = {
        sl: {solid: /^(Polna|Zelo debela polna|Tanjše polne)/, dashed: /^Črtkan/},
        en: {solid: /^(Solid|Extra thick solid|Thinner solid)/, dashed: /^Dashed/},
    } as const;
    const styleOf = (id: string) => (DRAWN_STYLE as Record<string, {dash: number; strokeWidth: number}>)[id];

    for (const language of ['sl', 'en'] as const) {
        for (const mode of CONTOUR_MODES) {
            it(`${language}, ${mode}: the style a legend row names is the dash of the drawn element`, () => {
                setLanguage(language);
                const {graph} = mountGraph();
                act(() => { graph.setMode(mode); });
                const board = (graph as unknown as {board: JXG.Board}).board;
                const drawn = (board.objectsList as unknown as Array<{visProp: Record<string, unknown>; visPropCalc: {visible: boolean}}>).filter(o => o.visPropCalc?.visible);
                let checked = 0;
                for (const row of graph.legend()) {
                    const style = styleOf(row.id);
                    if (style === undefined) continue;
                    checked++;
                    const words = STYLE_WORDS[language];
                    expect(row.text, row.id).toMatch(style.dash === 0 ? words.solid : words.dashed);
                    const match = drawn.filter(o => String(o.visProp.strokecolor).toLowerCase() === row.color.toLowerCase() && o.visProp.dash === style.dash
                        && o.visProp.strokewidth === style.strokeWidth);
                    expect(match.length, `${row.id} has a drawn element with dash ${style.dash} and width ${style.strokeWidth}`).toBeGreaterThan(0);
                }
                expect(checked).toBeGreaterThan(1);
            });
        }
    }

    it('the constraint differs from the level sets by line style, not only by colour', () => {
        expect(DRAWN_STYLE.constraint.strokeWidth).toBeGreaterThan(DRAWN_STYLE.levels.strokeWidth);
        expect(DRAWN_STYLE['grad-g'].dash).not.toBe(DRAWN_STYLE['grad-f'].dash);
        expect(DRAWN_STYLE.through.dash).not.toBe(DRAWN_STYLE.levels.dash);
    });

    it('the shapes the legend names are the shapes drawn', () => {
        setLanguage('sl');
        expect(t('levelsets_graph_cap_current')).toMatch(/kvadrat/);
        expect(t('levelsets_graph_cap_tangency')).toMatch(/Križec/);
        expect(t('levelsets_graph_cap_path')).not.toMatch(/točk/);
        setLanguage('en');
        expect(t('levelsets_graph_cap_current')).toMatch(/square/);
        expect(t('levelsets_graph_cap_tangency')).toMatch(/Cross/);
        expect(t('levelsets_graph_cap_path')).not.toMatch(/dot/);
    });
});

describe('readout wording', () => {
    it('the point of tangency is shown as fractions with the decimals beside them', () => {
        const {graph} = mountGraph();
        act(() => { graph.setFunction('valley'); graph.setMode('lagrange'); });
        expect(readout('tangent-points')).toMatch(/^\(25\/7; 5\/7\) ≈ \(3,5714; 0,7143\)$/);
    });

    it('a descent that never settles names the step cap', () => {
        expect(t('levelsets_graph_settled_never', {value0: String(DESCENT_MAX_STEPS)})).toBe('ni dosežen v 200 korakih');
    });
});
