import React from 'react';
import {act, fireEvent, render, screen} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import CurveCombGraph, {
    COMB_COUNT_DEFAULT, COMB_CUBIC_POINTS, COMB_CURVE_KINDS, COMB_GAIN_DEFAULT, COMB_MAX_COUNT, COMB_MIN_COUNT, CombCurveKind, combPresetFor,
} from './CurveCombGraph';
import {setLanguage, t} from '../../../localization';
import {formatNumber} from '../../../analysis/format';
import {GraphHost} from '../../base/GraphHost';
import {BezierSpline} from '../../../bezeg/impl/curve/bezier-spline';
import {LessonAction} from '../../../learning/model';
import {curveCombPresetCollection} from '../geometry/collections';

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

/** Board objects of every JSXGraph kind, as the tests read them. */
type BoardObject = { elType: string; plaintext?: string; dataX?: number[]; dataY?: number[] };

class ObservedCombGraph extends CurveCombGraph {
    liveBoard() { return this.board; }
    act(action: LessonAction) { this.applyLessonAction(action); }
    boardObjects() { return this.board.objectsList as unknown as BoardObject[]; }
    ownedOnBoard(board = this.board) {
        return (this.comb()?.ownedElements() ?? []).filter(element => board.objectsList.includes(element)).length;
    }
    /** The comb's board text (the only text of the overlay). */
    readout() {
        return (this.comb()?.ownedElements() as unknown as BoardObject[] | undefined ?? [])
            .filter(o => o.elType === 'text').map(o => o.plaintext ?? '').filter(Boolean);
    }
    /** Replaces the scene with `data` through the lesson replacement path, as a Preset load does (a bare import appends). */
    replaceScene(data: ReturnType<typeof combPresetFor>) {
        this.runLessonReplacement({
            importData: () => this.importPresetData(data),
            state: () => ({...this.getInitialState(), ...this.lessonDefaultState()}),
            transientState: undefined,
        });
    }
}

function mount() {
    const graph = new ObservedCombGraph();
    const view = render(<MemoryRouter><GraphHost create={() => graph}/></MemoryRouter>);
    return {graph, view};
}

/** The board's comb curves in creation order: teeth, tip line, clipped marks. */
function combCurves(graph: ObservedCombGraph) {
    return (graph.comb()!.ownedElements() as unknown as BoardObject[]).filter(element => element.elType === 'curve');
}

/** Starts a controller operation inside `act` so the host commits its renders, then waits for it outside. */
async function settle(start: () => Promise<void>): Promise<void> {
    let pending: Promise<void> = Promise.resolve();
    act(() => { pending = start(); });
    await act(async () => { await pending; });
}

const slider = (name: string) => screen.getByRole('slider', {name});

describe('the default scene', () => {
    test('is the L2 cubic with the comb off, and the kind is derived from the live curve', () => {
        const {graph, view} = mount();
        try {
            expect(graph.curveKind()).toBe('cubic');
            expect(graph.spanRows()).toEqual([COMB_CUBIC_POINTS]);
            expect(graph.state.combShown).toBe(false);
            expect(graph.state.combCount).toBe(COMB_COUNT_DEFAULT);
            expect(graph.state.combGain).toBe(COMB_GAIN_DEFAULT);
            expect(Object.keys(graph.state).some(key => /kind/i.test(key))).toBe(false);
            // Comb off draws nothing and the readout is empty.
            combCurves(graph).forEach(curve => expect(curve.dataX).toEqual([]));
            expect(graph.readout()).toEqual([]);
            graph.liveBoard().update();
            combCurves(graph).forEach(curve => expect(curve.dataX).toEqual([]));
        } finally { view.unmount(); }
    });

    test.each(COMB_CURVE_KINDS)('the preset of %s passes the curve-comb collection', kind => {
        expect('data' in curveCombPresetCollection.check(combPresetFor(kind))).toBe(true);
    });

    test('the collection accepts exactly the four curve types', () => {
        const dto = {points: [[0, 0], [1, 1], [2, 0]]};
        for (const type of ['JSXRationalBezierCurve', 'JSXPHBezierCurve', 'JSXGenericSplineCurve', 'JSXSymmetricQuadraticG1SplineCurve']) {
            expect('rejection' in curveCombPresetCollection.check([[type, dto]])).toBe(true);
        }
    });
});

describe('the default gain', () => {
    test.each(COMB_CURVE_KINDS)('the longest tooth of the %s default is readable and not clipped', kind => {
        const {graph, view} = mount();
        try {
            act(() => { graph.setCurveKind(kind); graph.setCombShown(true); });
            const [teeth, , marks] = combCurves(graph);
            let longest = 0;
            for (let k = 0; k < teeth.dataX!.length; k += 3) {
                longest = Math.max(longest, Math.hypot(teeth.dataX![k + 1] - teeth.dataX![k], teeth.dataY![k + 1] - teeth.dataY![k]));
            }
            expect(longest).toBeGreaterThan(0.9);
            expect(longest).toBeLessThan(2.1);
            expect(marks.dataX).toEqual([]);
        } finally { view.unmount(); }
    });
});

describe('L3 (5): the comb objects are owned and disposed', () => {
    test('exactly 3 curves and 1 readout are added; the count returns to baseline after kind changes, a Preset import and unmount', () => {
        const {graph, view} = mount();
        const board = graph.liveBoard();
        try {
            graph.setCombShown(true);
            const kinds = new Map<CombCurveKind, number>();
            const owned = () => graph.comb()!.ownedElements();
            // 3 curves (teeth, tip line, clipped-tooth marks) + 1 readout text.
            expect(owned().map(e => (e as unknown as BoardObject).elType).sort()).toEqual(['curve', 'curve', 'curve', 'text']);
            expect(graph.ownedOnBoard()).toBe(4);
            kinds.set('cubic', board.objectsList.length);

            const seen: unknown[] = [...owned()];
            for (const kind of ['c1', 'c2', 'g1', 'cubic', 'g1', 'c1', 'cubic'] as CombCurveKind[]) {
                const before = [...owned()];
                graph.setCurveKind(kind);
                expect(graph.curveKind()).toBe(kind);
                expect(graph.ownedOnBoard()).toBe(4);
                expect(owned()).toHaveLength(4);
                before.forEach(element => expect(board.objectsList.includes(element)).toBe(false));
                seen.push(...owned());
                // A kind always has the same number of objects on the board: no leak accumulates over repeated changes.
                const previous = kinds.get(kind);
                if (previous === undefined) kinds.set(kind, board.objectsList.length);
                else expect(board.objectsList.length).toBe(previous);
            }
            // Back on the cubic: the initial object count.
            expect(board.objectsList.length).toBe(kinds.get('cubic'));

            const baseline = board.objectsList.length;
            act(() => graph.replaceScene(combPresetFor('c2')));
            expect(graph.ownedOnBoard()).toBe(4);
            expect(graph.curveKind()).toBe('c2');
            act(() => graph.replaceScene(combPresetFor('cubic')));
            expect(board.objectsList.length).toBe(baseline);

            const last = [...owned()];
            view.unmount();
            last.forEach(element => expect(board.objectsList.includes(element)).toBe(false));
            // Every comb object that ever existed is gone; none is left behind.
            seen.forEach(element => expect(board.objectsList.includes(element as never)).toBe(false));
        } finally { view.unmount(); }
    });

    test('the language subscription is released with each disposed overlay and on unmount', () => {
        const before = liveSubscriptions.count;
        const {graph, view} = mount();
        const withOverlay = liveSubscriptions.count;
        expect(withOverlay).toBeGreaterThan(before);
        for (const kind of ['c1', 'g1', 'cubic'] as CombCurveKind[]) {
            graph.setCurveKind(kind);
            expect(liveSubscriptions.count).toBe(withOverlay);
        }
        const overlay = graph.comb()!;
        overlay.dispose();
        overlay.dispose();
        expect(liveSubscriptions.count).toBe(withOverlay - 1);
        view.unmount();
        expect(liveSubscriptions.count).toBe(before);
    });
});

describe('what the board draws', () => {
    test('switching the comb on draws the cubic comb and keeps the kernel numbers', () => {
        const {graph, view} = mount();
        try {
            act(() => graph.setCombShown(true));
            const [teeth, tipLine, marks] = combCurves(graph);
            expect(teeth.dataX!.length).toBe(3 * COMB_COUNT_DEFAULT);
            expect(tipLine.dataX!.filter(x => !Number.isNaN(x))).toHaveLength(COMB_COUNT_DEFAULT);
            expect(marks.dataX).toEqual([]);
            // First tooth: base is the first control point; kappa(0) = 2/3, so the tooth is gain * 2/3 long.
            const length = Math.hypot(teeth.dataX![1] - teeth.dataX![0], teeth.dataY![1] - teeth.dataY![0]);
            expect(teeth.dataX![0]).toBeCloseTo(0, 9);
            expect(length).toBeCloseTo(COMB_GAIN_DEFAULT * 2 / 3, 9);
            // The cubic has no join: no readout.
            expect(graph.readout()).toEqual([]);
        } finally { view.unmount(); }
    });

    test('a gain or count change after the comb is drawn redraws it (the memo key includes both)', () => {
        const {graph, view} = mount();
        try {
            act(() => graph.setCombShown(true));
            const [teeth] = combCurves(graph);
            const toothLength = () => Math.hypot(teeth.dataX![1] - teeth.dataX![0], teeth.dataY![1] - teeth.dataY![0]);
            expect(toothLength()).toBeCloseTo(COMB_GAIN_DEFAULT * 2 / 3, 9);
            act(() => graph.setCombGain(3));
            expect(toothLength()).toBeCloseTo(3 * 2 / 3, 9);
            act(() => graph.setCombCount(32));
            expect(teeth.dataX).toHaveLength(3 * 32);
        } finally { view.unmount(); }
    });

    test('moving a control point refills the comb from the live curve without a listener', () => {
        const {graph, view} = mount();
        try {
            act(() => graph.setCombShown(true));
            const [teeth] = combCurves(graph);
            const before = teeth.dataX!.slice();
            const point = graph.getFirstJxgCurve().getJxgPoints()[1];
            point.moveTo([1, 1], 0);
            // The curve's own drag handler copies the handle into the model; the comb has no handler of its own.
            (point as unknown as { triggerEventHandlers(names: string[], args: unknown[]): void }).triggerEventHandlers(['drag'], []);
            graph.liveBoard().update();
            expect(teeth.dataX).not.toEqual(before);
            expect(graph.spanRows()![0][1]).toEqual([1, 1]);
        } finally { view.unmount(); }
    });

    test('the readout names the join with the largest jump, from the kernel, in both languages; singular says undefined', () => {
        const {graph, view} = mount();
        try {
            act(() => { graph.setCombShown(true); graph.setCurveKind('c1'); });
            const joins = graph.comb()!.joinCurvatures();
            expect(joins).toHaveLength(3);
            const best = graph.comb()!.largestJoin()!;
            expect(Math.abs(best.jump!)).toBe(Math.max(...joins.map(join => Math.abs(join.jump!))));
            const num = (v: number) => formatNumber(v, 'sl', 4);
            expect(graph.readout()).toEqual([`Stik ${best.index + 1}: ukrivljenost κ levo ${num(best.kappaLeft!)}, desno ${num(best.kappaRight!)}, skok ${num(best.jump!)}`]);
            act(() => setLanguage('en'));
            expect(graph.readout()).toEqual([`Join ${best.index + 1}: curvature κ left ${formatNumber(best.kappaLeft!, 'en', 4)}, right ${formatNumber(best.kappaRight!, 'en', 4)}, jump ${formatNumber(best.jump!, 'en', 4)}`]);
            act(() => setLanguage('sl'));
            expect(graph.readout()[0].startsWith('Stik')).toBe(true);

            // A join where the tangent vanishes (the control points 3 and 4 coincide, so the knot between them has speed 0).
            const singularScene = [['JSXQuadraticC1SplineCurve', {
                points: [[-4, 3], [-4, -3], [-1, -3], [-1, -3], [3, 3], [4, -3]], degree: 2, continuity: 1,
                state: {showingJxgPoints: true, showingControlPolygon: false, showingConvexHull: false},
            }]] as const;
            act(() => { graph.replaceScene(singularScene as never); graph.setCombShown(true); });
            const mixed = graph.comb()!.joinCurvatures();
            // The input really reached the case: one join is undefined and another has a defined jump.
            const undefinedJoin = mixed.find(join => join.jump === undefined);
            expect(undefinedJoin).toBeDefined();
            expect(mixed.some(join => join.jump !== undefined)).toBe(true);
            const defined = graph.comb()!.largestJoin()!;
            const text = graph.readout()[0];
            expect(text).toContain(`Stik ${defined.index + 1}: ukrivljenost κ levo`);
            expect(text).toContain(`Stik ${undefinedJoin!.index + 1}: ukrivljenost tu ni določena`);
            act(() => setLanguage('en'));
            expect(graph.readout()[0]).toContain(`Join ${undefinedJoin!.index + 1}: curvature is undefined here`);
            act(() => setLanguage('sl'));
        } finally { view.unmount(); }
    });
});

describe('controls and board agree', () => {
    test('after lesson actions, the controls show the same values as the state and the board', () => {
        const {graph, view} = mount();
        try {
            act(() => {
                graph.act({kind: 'curve-visibility', target: 'curvature-comb', visible: true});
                graph.act({kind: 'comb-gain', value: 3});
                graph.act({kind: 'comb-count', value: 32});
            });
            expect(slider(t('comb_gain'))).toHaveValue('3');
            expect(slider(t('comb_count'))).toHaveValue('32');
            expect(screen.getByRole('checkbox', {name: t('comb_shown')})).toBeChecked();
            const [teeth] = combCurves(graph);
            expect(teeth.dataX).toHaveLength(3 * 32);
            const length = Math.hypot(teeth.dataX![1] - teeth.dataX![0], teeth.dataY![1] - teeth.dataY![0]);
            expect(length).toBeCloseTo(3 * 2 / 3, 9);
        } finally { view.unmount(); }
    });

    test('the Edit controls change the state and the board', () => {
        const {graph, view} = mount();
        try {
            fireEvent.click(screen.getByRole('checkbox', {name: t('comb_shown')}));
            expect(graph.state.combShown).toBe(true);
            fireEvent.change(slider(t('comb_gain')), {target: {value: '2'}});
            expect(graph.state.combGain).toBe(2);
            fireEvent.change(slider(t('comb_count')), {target: {value: '40'}});
            expect(graph.state.combCount).toBe(40);
            expect(combCurves(graph)[0].dataX).toHaveLength(3 * 40);
            fireEvent.change(screen.getByRole('combobox', {name: t('parametric_curve_label')}), {target: {value: 'g1'}});
            expect(graph.curveKind()).toBe('g1');
            // The comb state survives the change, and the b sliders appear for the G1 spline.
            expect(graph.state.combShown).toBe(true);
            expect(graph.state.combGain).toBe(2);
            expect(graph.state.combCount).toBe(40);
            expect(screen.getAllByRole('slider', {name: new RegExp(t('spline_parameter_b'))})).toHaveLength(2);
            expect(screen.getByRole('combobox', {name: t('parametric_curve_label')})).toHaveValue('g1');
        } finally { view.unmount(); }
    });

    test('the comb controls render for every kind; the b sliders for the G1 only; the editing mode follows the live curve', async () => {
        const {graph, view} = mount();
        try {
            const bSliders = () => screen.queryAllByRole('slider', {name: new RegExp(t('spline_parameter_b'))});
            const expectControls = (kind: CombCurveKind) => {
                expect(graph.curveKind()).toBe(kind);
                // Structured editing is true for the cubic only (its tools are Bezier-only); a spline uses the selected-curve path.
                expect(graph['workspaceUsesStructuredEditing']()).toBe(kind === 'cubic');
                expect(screen.getByRole('combobox', {name: t('parametric_curve_label')})).toHaveValue(kind);
                expect(screen.getByRole('checkbox', {name: t('comb_shown')})).toBeInTheDocument();
                expect(slider(t('comb_gain'))).toBeInTheDocument();
                expect(slider(t('comb_count'))).toBeInTheDocument();
                expect(bSliders()).toHaveLength(kind === 'g1' ? 2 : 0);
            };
            expectControls('cubic');
            for (const kind of ['c1', 'c2', 'g1', 'cubic', 'g1'] as CombCurveKind[]) {
                act(() => graph.setCurveKind(kind));
                expectControls(kind);
            }
            // Select a spline through the control, save it, return to the cubic, then restore: the mode follows the restored curve.
            act(() => graph.setCurveKind('c2'));
            act(() => graph.saveCurrentPreset('spline'));
            act(() => graph.setCurveKind('cubic'));
            expectControls('cubic');
            await settle(() => graph.selectPreset('spline'));
            expectControls('c2');
            await settle(() => graph.reset());
            expectControls('c2');
            act(() => graph.setCurveKind('cubic'));
            await settle(() => graph.selectPreset(''));
            expectControls('cubic');
        } finally { view.unmount(); }
    });

    test('the hide-fixed and label-all switches appear for a spline only', () => {
        const {graph, view} = mount();
        try {
            // The Display tab is not mounted in this host; the switches are exercised through the graph's own render.
            expect(graph['workspaceGraphDisplay']()).toBeTruthy();
            act(() => graph.setCurveKind('c2'));
            const display = render(<>{graph['workspaceGraphDisplay']()}</>);
            expect(display.getByRole('checkbox', {name: t('hide_fixed_points')})).toBeInTheDocument();
            expect(display.getByRole('checkbox', {name: t('label_all_points')})).toBeInTheDocument();
            display.unmount();
        } finally { view.unmount(); }
    });

    test('Reset returns to the cubic with the comb off, and the controls follow', async () => {
        const {graph, view} = mount();
        try {
            act(() => { graph.setCombShown(true); graph.setCombGain(4); graph.setCombCount(100); graph.setCurveKind('c2'); });
            await settle(() => graph.reset());
            expect(graph.curveKind()).toBe('cubic');
            expect(graph.state.combShown).toBe(false);
            expect(slider(t('comb_gain'))).toHaveValue(String(COMB_GAIN_DEFAULT));
            expect(slider(t('comb_count'))).toHaveValue(String(COMB_COUNT_DEFAULT));
            expect(screen.getByRole('checkbox', {name: t('comb_shown')})).not.toBeChecked();
            expect(graph.ownedOnBoard()).toBe(4);
            expect(combCurves(graph)[0].dataX).toEqual([]);
            expect(graph.readout()).toEqual([]);
        } finally { view.unmount(); }
    });

    test('a saved Preset restores the kind, the comb state and a G1 b value', async () => {
        const {graph, view} = mount();
        try {
            act(() => {
                graph.act({kind: 'comb-curve', curve: 'g1'});
                graph.act({kind: 'curve-visibility', target: 'curvature-comb', visible: true});
                graph.act({kind: 'comb-gain', value: 2.5});
                graph.act({kind: 'comb-count', value: 40});
                graph.act({kind: 'spline-beta', index: 0, value: 0.4});
            });
            const jumpBefore = graph.comb()!.largestJoin()!.jump!;
            act(() => graph.saveCurrentPreset('mine'));
            act(() => { graph.setCombShown(false); graph.setCurveKind('cubic'); });
            expect(graph.curveKind()).toBe('cubic');
            await settle(() => graph.selectPreset('mine'));
            expect(graph.curveKind()).toBe('g1');
            expect((graph.getFirstCurve() as BezierSpline).getBs()[0]).toBeCloseTo(0.4, 12);
            expect(graph.state.combShown).toBe(true);
            expect(graph.state.combGain).toBe(2.5);
            expect(graph.state.combCount).toBe(40);
            expect(graph.ownedOnBoard()).toBe(4);
            expect(graph.comb()!.largestJoin()!.jump).toBeCloseTo(jumpBefore, 12);
            expect(slider(t('comb_gain'))).toHaveValue('2.5');
            expect(slider(t('comb_count'))).toHaveValue('40');
            const sliders = screen.getAllByRole('slider', {name: new RegExp(t('spline_parameter_b'))});
            expect(sliders[0]).toHaveValue('0.4');
        } finally { view.unmount(); }
    });
});

describe('lesson actions run in one synchronous tick', () => {
    test('a multi-action scene reads the state each earlier action wrote, and the board follows once the host commits', () => {
        const {graph, view} = mount();
        try {
            const kinds: CombCurveKind[] = [];
            act(() => {
                graph.act({kind: 'comb-curve', curve: 'c1'});
                kinds.push(graph.curveKind());
                graph.act({kind: 'curve-visibility', target: 'curvature-comb', visible: true});
                expect(graph.state.combShown).toBe(true);
                graph.act({kind: 'comb-gain', value: 2});
                graph.act({kind: 'comb-count', value: 48});
                graph.act({kind: 'comb-curve', curve: 'g1'});
                kinds.push(graph.curveKind());
                // The comb state written by the earlier actions survived the scene replacement within the same tick.
                expect(graph.state.combShown).toBe(true);
                expect(graph.state.combGain).toBe(2);
                expect(graph.state.combCount).toBe(48);
                graph.act({kind: 'spline-beta', index: 1, value: 2});
                expect((graph.getFirstCurve() as BezierSpline).getBs()[1]).toBe(2);
                graph.act({kind: 'comb-curve', curve: 'c2'});
                kinds.push(graph.curveKind());
                graph.act({kind: 'comb-gain', value: 1});
            });
            expect(kinds).toEqual(['c1', 'g1', 'c2']);
            expect(graph.ownedOnBoard()).toBe(4);
            const [teeth] = combCurves(graph);
            // 48 teeth shared over the C2 spline's 4 spans: 12 per span.
            expect(teeth.dataX).toHaveLength(3 * 48);
            expect(slider(t('comb_gain'))).toHaveValue('1');
            expect(slider(t('comb_count'))).toHaveValue('48');
        } finally { view.unmount(); }
    });

    test('bad values throw and change nothing', () => {
        const {graph, view} = mount();
        try {
            const state = graph.state;
            expect(() => graph.act({kind: 'comb-gain', value: NaN})).toThrow();
            expect(() => graph.act({kind: 'comb-gain', value: 100})).toThrow();
            expect(() => graph.act({kind: 'comb-count', value: 3})).toThrow();
            expect(() => graph.act({kind: 'comb-count', value: COMB_MAX_COUNT + 1})).toThrow();
            expect(() => graph.act({kind: 'comb-count', value: COMB_MIN_COUNT + 0.5})).toThrow();
            expect(() => graph.act({kind: 'comb-curve', curve: 'c3' as never})).toThrow();
            expect(() => graph.act({kind: 'curve-visibility', target: 'curvature-comb', visible: 1 as never})).toThrow();
            // A cubic has no junction parameter; a G1 spline rejects an index or value outside its range.
            expect(() => graph.act({kind: 'spline-beta', index: 0, value: 1})).toThrow();
            graph.act({kind: 'comb-curve', curve: 'g1'});
            expect(() => graph.act({kind: 'spline-beta', index: 2, value: 1})).toThrow();
            expect(() => graph.act({kind: 'spline-beta', index: 0, value: 0})).toThrow();
            expect((graph.getFirstCurve() as BezierSpline).getBs()).toEqual([1, 1]);
            expect(graph.state.combGain).toBe(state.combGain);
            expect(graph.state.combCount).toBe(state.combCount);
        } finally { view.unmount(); }
    });
});

test('a scene that changes the gain and sets it back within one batch still redraws what the overlay read mid-batch', async () => {
    const {graph, view} = mount();
    try {
        graph.act({kind: 'curve-visibility', target: 'curvature-comb', visible: true});
        await act(async () => { await Promise.resolve(); });
        const committed = graph.state;
        // Mid-batch the board reads another gain, then the batch returns to the committed value.
        graph.act({kind: 'comb-gain', value: 3});
        graph.liveBoard().update();
        graph.act({kind: 'comb-gain', value: committed.combGain});
        const boardUpdate = vi.fn();
        graph['boardUpdate'] = boardUpdate;
        graph['onStateChange']({...committed});
        expect(boardUpdate).toHaveBeenCalled();
    } finally { view.unmount(); }
});

describe('the polite live region follows the join readout once it has settled', () => {
    const region = () => document.querySelector('[data-readout-live]')!;
    const advance = (ms: number) => act(() => { vi.advanceTimersByTime(ms); });
    const spoken = (graph: ObservedCombGraph) => graph.readout().map(line => /[.!?]$/.test(line) ? line : `${line}.`).join(' ');
    beforeEach(() => { vi.useFakeTimers(); });
    afterEach(() => { vi.useRealTimers(); setLanguage('sl'); });

    test('empty while the comb is off or the curve is a cubic; a spline kind reaches the region once, after the quiet period', () => {
        const {graph, view} = mount();
        const mutations = new MutationObserver(() => undefined);
        try {
            expect(region().getAttribute('aria-live')).toBe('polite');
            expect(region().textContent).toBe('');
            mutations.observe(region(), {childList: true, characterData: true, subtree: true});
            act(() => { graph.setCombShown(true); graph.setCurveKind('c1'); });
            // Nothing was published yet, so the first text goes out at once (no quiet period).
            expect(region().textContent).toMatch(/^Stik \d: ukrivljenost κ levo/);
            expect(region().textContent).toBe(spoken(graph));
            // A kind switch replaces the scene, so its text goes out at once and no earlier kind's text can follow it.
            const c1Text = region().textContent;
            for (const kind of ['c2', 'g1'] as CombCurveKind[]) {
                act(() => graph.setCurveKind(kind));
                expect(region().textContent).toBe(spoken(graph));
            }
            expect(region().textContent).not.toBe(c1Text);
            // A burst of beta changes moves the join's curvature: one change, to the final value, after the quiet period.
            mutations.takeRecords();
            const g1Text = region().textContent;
            for (let i = 0; i < 10; i++) { act(() => (graph as unknown as { setBeta(index: number, value: number): void }).setBeta(0, 1.2 + i * 0.1)); advance(50); }
            expect(mutations.takeRecords()).toHaveLength(0);
            advance(600);
            expect(region().textContent).toBe(spoken(graph));
            expect(region().textContent).not.toBe(g1Text);
            expect(mutations.takeRecords().length).toBeGreaterThan(0);
            advance(5000);
            expect(mutations.takeRecords()).toHaveLength(0);
            // The cubic has no joins: after settling there is no stale join text.
            act(() => graph.setCurveKind('cubic'));
            advance(600);
            expect(region().textContent).toBe('');
            act(() => graph.setCurveKind('c1'));
            advance(600);
            act(() => graph.setCombShown(false));
            advance(600);
            expect(region().textContent).toBe('');
            expect(graph.readout()).toEqual([]);
        } finally {
            mutations.disconnect();
            view.unmount();
        }
    });

    test('a singular join, both languages, and a scene import keeps the region working', () => {
        const {graph, view} = mount();
        try {
            act(() => { graph.setCombShown(true); graph.setCurveKind('c1'); });
            advance(600);
            act(() => setLanguage('en'));
            advance(600);
            expect(region().textContent).toMatch(/^Join \d: curvature κ left /);
            expect(region().textContent).toContain(formatNumber(graph.comb()!.largestJoin()!.jump!, 'en', 4));
            act(() => setLanguage('sl'));
            const singularScene = [['JSXQuadraticC1SplineCurve', {
                points: [[-4, 3], [-4, -3], [-1, -3], [-1, -3], [3, 3], [4, -3]], degree: 2, continuity: 1,
                state: {showingJxgPoints: true, showingControlPolygon: false, showingConvexHull: false},
            }]] as const;
            act(() => graph.replaceScene(singularScene as never));
            act(() => graph.setCombShown(true));
            advance(600);
            expect(region().textContent).toContain('ukrivljenost tu ni določena');
            expect(region().textContent).toBe(spoken(graph));
        } finally {
            view.unmount();
        }
    });

    test('unmounting with a change pending publishes nothing later', () => {
        const {graph, view} = mount();
        const store = (graph as unknown as { liveReadout: { getSnapshot(): string } }).liveReadout;
        act(() => { graph.setCombShown(true); graph.setCurveKind('g1'); });
        advance(600);
        const before = store.getSnapshot();
        expect(before).not.toBe('');
        const timers = vi.getTimerCount();
        act(() => (graph as unknown as { setBeta(index: number, value: number): void }).setBeta(0, 1.7));
        expect(vi.getTimerCount()).toBeGreaterThan(timers);
        view.unmount();
        expect(() => vi.advanceTimersByTime(5000)).not.toThrow();
        expect(store.getSnapshot()).toBe(before);
    });
});
