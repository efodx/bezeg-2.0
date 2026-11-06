import React from 'react';
import {act, render, screen} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import type {GeometryElement} from 'jsxgraph';
import DegreeReductionGraph, {REDUCTION_ELEVATED_POINTS, REDUCTION_P2_POINTS, REDUCTION_P_POINTS} from './DegreeReductionGraph';
import {reduce} from '../../../bezeg/impl/kernels/degree-reduction';
import {setLanguage, t} from '../../../localization';
import {GraphHost} from '../../base/GraphHost';
import {LessonAction} from '../../../learning/model';

// jsdom has no canvas and no matchMedia; JSXGraph touches both while creating a board.
beforeAll(() => {
    const context = new Proxy({}, {get: (_target, name) => name === 'measureText' ? () => ({width: 0}) : () => undefined});
    HTMLCanvasElement.prototype.getContext = (() => context) as unknown as HTMLCanvasElement['getContext'];
    window.matchMedia = (() => ({matches: false, addEventListener: () => undefined, removeEventListener: () => undefined,
        addListener: () => undefined, removeListener: () => undefined})) as unknown as typeof window.matchMedia;
});

beforeEach(() => localStorage.clear());
afterEach(() => setLanguage('sl'));

type BoardObject = GeometryElement & {
    plaintext?: string; dataX?: number[]; dataY?: number[]; visPropCalc: { visible: boolean }; X?: () => number; Y?: () => number;
};

class Probe extends DegreeReductionGraph {
    liveBoard() { return this.board; }
    act(action: LessonAction) { this.applyLessonAction(action); }
    owned() { return this.reduction()!.ownedElements() as unknown as BoardObject[]; }
    /** The three control points of the reduced quadratic as drawn (the first three board points of the overlay). */
    quadraticPoints() { return this.owned().filter(e => e.elType === 'point').slice(0, 3).map(p => [p.X!(), p.Y!()]); }
    netPoints() { return this.owned().filter(e => e.elType === 'point').slice(3).map(p => [p.X!(), p.Y!()]); }
    captions() { return this.owned().filter(e => e.elType === 'text').map(e => e.plaintext ?? '').filter(Boolean); }
    published(): string { return this['liveReadout'].getSnapshot(); }
    movePoint(index: number, to: number[]) {
        const point = this.getFirstJxgCurve().getJxgPoints()[index];
        point.moveTo(to, 0);
        (point as unknown as { triggerEventHandlers(names: string[], args: unknown[]): void }).triggerEventHandlers(['drag'], []);
        this.liveBoard().update();
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

/** Sets the four control points of the cubic to P (the spec's default example). */
function useP(graph: Probe) {
    act(() => graph.act({kind: 'reduction-points', points: REDUCTION_P_POINTS as unknown as [number, number][]}));
}

const near = (actual: number[][], expected: number[][], tolerance = 1e-9) => {
    expect(actual).toHaveLength(expected.length);
    actual.forEach((p, i) => p.forEach((v, j) => expect(Math.abs(v - expected[i][j])).toBeLessThan(tolerance)));
};

describe('DegreeReductionGraph scene', () => {
    test('opens on the elevated quadratic, a cubic with the spec state, and the reduction is the quadratic itself', () => {
        const {graph, view} = mount();
        try {
            near(graph.controlRows()!, REDUCTION_ELEVATED_POINTS);
            expect(graph.state).toMatchObject({reductionMode: 'fixed', reductionShown: true, reductionElevationShown: false});
            near(graph.quadraticPoints(), [[0, 0], [2, 4], [4, 0]], 1e-12);
            expect(graph.reduction()!.result()!.reducible).toBe(true);
            expect(graph.captions()).toContain(t('reduction_readout_reducible'));
        } finally { view.unmount(); }
    });

    test('has no add, delete or elevate tools', () => {
        const {graph, view} = mount();
        try {
            for (const key of ['add_point', 'delete_point', 'elevate_degree']) expect(screen.queryByText(t(key as 'add_point'))).toBeNull();
            expect(graph.getGraphCommands()).toHaveLength(0);
        } finally { view.unmount(); }
    });

    test('the board objects match the kernel for P in both modes', () => {
        const {graph, view} = mount();
        try {
            useP(graph);
            near(graph.controlRows()!, REDUCTION_P_POINTS);
            near(graph.quadraticPoints(), [[0, 0], [2, 4.5], [4, 0]]);
            near(graph.quadraticPoints(), reduce(REDUCTION_P_POINTS, 'fixed'));
            act(() => graph.act({kind: 'reduction-mode', mode: 'free'}));
            near(graph.quadraticPoints(), [[-0.1, 0], [2, 4.5], [4.1, 0]]);
            near(graph.quadraticPoints(), reduce(REDUCTION_P_POINTS, 'free'));
        } finally { view.unmount(); }
    });

    test('the readouts of P are the spec numbers in both modes, formatted by locale', () => {
        const {graph, view} = mount();
        try {
            useP(graph);
            expect(graph.captions()).toContain(t('reduction_readout_max_error', {value0: '0,0962'}));
            expect(graph.captions()).toContain(t('reduction_readout_l2_error', {value0: '0,069007'}));
            expect(graph.captions().some(line => /^Tretja diferenca: \(.2; 0\)$/.test(line))).toBe(true);
            expect(graph.captions()).toContain(t('reduction_readout_not_reducible'));
            act(() => graph.setReductionMode('free'));
            expect(graph.captions()).toContain(t('reduction_readout_max_error', {value0: '0,1'}));
            expect(graph.captions()).toContain(t('reduction_readout_l2_error', {value0: '0,037796'}));
            expect(graph.captions()).toContain(t('reduction_readout_bound', {value0: '0,3'}));
            act(() => setLanguage('en'));
            expect(graph.captions()).toContain(t('reduction_readout_l2_error', {value0: '0.037796'}));
        } finally { view.unmount(); }
    });

    test('the default is reducible and a dragged point is not; the status names its tolerance', () => {
        const {graph, view} = mount();
        try {
            expect(graph.captions()).toContain(t('reduction_readout_reducible'));
            expect(t('reduction_readout_reducible')).toContain('10⁻⁹');
            graph.movePoint(1, [1, 4]);
            expect(graph.captions()).toContain(t('reduction_readout_not_reducible'));
            expect(graph.captions()).not.toContain(t('reduction_readout_reducible'));
            expect(t('reduction_readout_not_reducible')).toContain('10⁻⁹');
        } finally { view.unmount(); }
    });

    test('a drag recomputes the quadratic and the elevated net', () => {
        const {graph, view} = mount();
        try {
            act(() => graph.setReductionElevationShown(true));
            graph.movePoint(2, [3, 3]);
            graph.movePoint(1, [1, 3]);
            near(graph.controlRows()!, REDUCTION_P_POINTS);
            near(graph.quadraticPoints(), [[0, 0], [2, 4.5], [4, 0]]);
            const net = graph.netPoints();
            expect(net).toHaveLength(4);
            // The net of Q is the elevation of the drawn quadratic: its inner points lie two thirds of the way from Q's ends to q1.
            const q = graph.quadraticPoints();
            near([net[1]], [[q[0][0] / 3 + 2 * q[1][0] / 3, q[0][1] / 3 + 2 * q[1][1] / 3]]);
        } finally { view.unmount(); }
    });

    test('the switches show and hide the reduced objects and the net', () => {
        const {graph, view} = mount();
        try {
            const points = () => graph.owned().filter(e => e.elType === 'point');
            const visible = (from: number, to: number) => points().slice(from, to).every(p => p.visPropCalc.visible);
            expect(visible(0, 3)).toBe(true);
            expect(points().slice(3).some(p => p.visPropCalc.visible)).toBe(false);
            act(() => { graph.setReductionShown(false); graph.setReductionElevationShown(true); });
            expect(points().slice(0, 3).some(p => p.visPropCalc.visible)).toBe(false);
            expect(visible(3, 7)).toBe(true);
        } finally { view.unmount(); }
    });
});

describe('Reset, Presets and the live region', () => {
    test('Reset returns to the elevated quadratic, the fixed mode and the switches', async () => {
        const {graph, view} = mount();
        try {
            useP(graph);
            act(() => { graph.setReductionMode('free'); graph.setReductionShown(false); graph.setReductionElevationShown(true); });
            await settle(() => graph.reset());
            near(graph.controlRows()!, REDUCTION_ELEVATED_POINTS);
            expect(graph.state).toMatchObject({reductionMode: 'fixed', reductionShown: true, reductionElevationShown: false});
            near(graph.quadraticPoints(), [[0, 0], [2, 4], [4, 0]], 1e-12);
            expect(graph.captions()).toContain(t('reduction_readout_reducible'));
        } finally { view.unmount(); }
    });

    test('a saved Preset restores the points and the mode, and the overlay shows the restored scene', async () => {
        const {graph, view} = mount();
        try {
            act(() => graph.act({kind: 'reduction-points', points: REDUCTION_P2_POINTS as unknown as [number, number][]}));
            act(() => { graph.setReductionMode('free'); graph.setReductionElevationShown(true); });
            act(() => graph.saveCurrentPreset('p2'));
            useP(graph);
            act(() => { graph.setReductionMode('fixed'); graph.setReductionElevationShown(false); });
            await settle(() => graph.selectPreset('p2'));
            near(graph.controlRows()!, REDUCTION_P2_POINTS);
            expect(graph.state).toMatchObject({reductionMode: 'free', reductionElevationShown: true});
            near(graph.quadraticPoints(), [[-0.1, 0.6], [2, 3], [4.1, 2.4]]);
            expect(graph.captions()).toContain(t('reduction_readout_max_error', {value0: '0,6083'}));
            expect(screen.getByRole('combobox', {name: t('reduction_mode')})).toHaveValue('free');
        } finally { view.unmount(); }
    });

    test('the live region follows a scene replacement at once and a mode action', async () => {
        const {graph, view} = mount();
        try {
            useP(graph);
            act(() => graph.act({kind: 'reduction-mode', mode: 'free'}));
            await settle(() => graph.reset());
            expect(graph.published()).toBe(graph.reduction()!.readoutText());
            expect(graph.published()).toContain(t('reduction_readout_reducible'));
        } finally { view.unmount(); }
    });
});

describe('ownership', () => {
    test('dispose removes every overlay object, twice is harmless, and import recreates the overlay', async () => {
        const {graph, view} = mount();
        const board = graph.liveBoard();
        try {
            const owned = graph.owned().slice();
            expect(owned.length).toBeGreaterThan(0);
            expect(owned.every(element => board.objectsList.includes(element))).toBe(true);
            graph.reduction()!.dispose();
            expect(owned.some(element => board.objectsList.includes(element))).toBe(false);
            graph.reduction()!.dispose();
            await settle(() => graph.reset());
            const fresh = graph.owned();
            expect(fresh.some(element => owned.includes(element))).toBe(false);
            expect(fresh.every(element => board.objectsList.includes(element))).toBe(true);
        } finally { view.unmount(); }
    });
});

describe('lesson actions run in one synchronous tick', () => {
    test('a multi-action scene reads the state each earlier action wrote, and the readouts follow', () => {
        const {graph, view} = mount();
        try {
            act(() => {
                graph.act({kind: 'reduction-points', points: REDUCTION_P_POINTS as unknown as [number, number][]});
                near(graph.controlRows()!, REDUCTION_P_POINTS);
                graph.act({kind: 'reduction-mode', mode: 'free'});
                expect(graph.state.reductionMode).toBe('free');
                graph.act({kind: 'curve-visibility', target: 'reduction-elevation', visible: true});
                expect(graph.state.reductionElevationShown).toBe(true);
                graph.act({kind: 'curve-visibility', target: 'reduction-quadratic', visible: false});
                graph.act({kind: 'curve-visibility', target: 'reduction-quadratic', visible: true});
                graph.act({kind: 'reduction-mode', mode: 'fixed'});
                graph.act({kind: 'reduction-mode', mode: 'free'});
            });
            expect(graph.state).toMatchObject({reductionMode: 'free', reductionShown: true, reductionElevationShown: true});
            near(graph.quadraticPoints(), [[-0.1, 0], [2, 4.5], [4.1, 0]]);
            expect(graph.captions()).toContain(t('reduction_readout_max_error', {value0: '0,1'}));
            expect(graph.netPoints()).toHaveLength(4);
        } finally { view.unmount(); }
    });

    test('invalid values throw and leave the scene alone', () => {
        const {graph, view} = mount();
        try {
            const before = {...graph.state};
            const rows = graph.controlRows();
            expect(() => graph.act({kind: 'reduction-mode', mode: 'exact' as never})).toThrow();
            expect(() => graph.act({kind: 'reduction-points', points: [[0, 0], [1, 1], [2, 0]] as never})).toThrow();
            expect(() => graph.act({kind: 'reduction-points', points: [[0, 0], [1, 1], [2, NaN], [3, 0]] as never})).toThrow();
            expect(() => graph.act({kind: 'curve-visibility', target: 'reduction-elevation', visible: 'yes' as never})).toThrow();
            expect(graph.state).toEqual(before);
            expect(graph.controlRows()).toEqual(rows);
        } finally { view.unmount(); }
    });
});
