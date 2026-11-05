import React from 'react';
import {fireEvent, render, screen} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import CurvatureBezierCurveGraph, {CURVATURE_T_DEFAULT} from './CurvatureBezierCurveGraph';
import {currentLanguage, setLanguage, t} from '../../../localization';
import {formatNumber} from '../../../analysis/format';
import {GraphHost} from '../../base/GraphHost';

// jsdom has no canvas and no matchMedia; JSXGraph touches both while creating a board.
beforeAll(() => {
    const context = new Proxy({}, {get: (_target, name) => name === 'measureText' ? () => ({width: 0}) : () => undefined});
    HTMLCanvasElement.prototype.getContext = (() => context) as unknown as HTMLCanvasElement['getContext'];
    window.matchMedia = (() => ({matches: false, addEventListener: () => undefined, removeEventListener: () => undefined,
        addListener: () => undefined, removeListener: () => undefined})) as unknown as typeof window.matchMedia;
});

class ObservedCurvatureGraph extends CurvatureBezierCurveGraph {
    liveBoard() { return this.board; }

    /** Overlay-owned objects still on the board. */
    ownedOnBoard(board = this.board) {
        const owned = this['overlay']?.ownedElements() ?? [];
        return owned.filter(element => board.objectsList.includes(element)).length;
    }
}

test('on a real board the overlay exists after initialize, is recreated once by a preset import, and is gone after unmount', () => {
    const graph = new ObservedCurvatureGraph();
    const view = render(<MemoryRouter><GraphHost create={() => graph}/></MemoryRouter>);
    const board = graph.liveBoard();
    const created = graph['overlay']!.ownedElements().length;
    expect(created).toBeGreaterThan(8);
    expect(graph.ownedOnBoard()).toBe(created);
    const boardObjects = board.objectsList.length;
    const first = [...graph['overlay']!.ownedElements()];

    graph.importPresetData([['JSXBezierCurve', {points: [[-4, -3], [-3, 2], [2, 2], [3, -2]]}]]);
    expect(graph.ownedOnBoard()).toBe(created);
    expect(first.some(element => board.objectsList.includes(element))).toBe(false);
    // Same count of objects as before: the old overlay left, one new overlay arrived, no duplicates.
    const curveObjects = board.objectsList.length - created;
    expect(curveObjects).toBeGreaterThan(0);
    expect(boardObjects - created).toBeGreaterThan(0);

    const owned = [...graph['overlay']!.ownedElements()];
    view.unmount();
    expect(owned.some(element => board.objectsList.includes(element))).toBe(false);
});

test('the Edit tab offers the parameter slider, and moving it changes the board readout', () => {
    const graph = new ObservedCurvatureGraph();
    const host = render(<MemoryRouter><GraphHost create={() => graph}/></MemoryRouter>);
    const readout = () => (graph.liveBoard().objectsList as Array<{elType: string; plaintext?: string}>)
        .find(o => o.elType === 'text' && (o.plaintext ?? '').includes('κ'))?.plaintext;
    const slider = screen.getByRole('slider', {name: t('curvature_parameter_t')});
    expect(slider).toHaveValue(String(CURVATURE_T_DEFAULT));
    const before = readout();
    // Parabola y = x^2 at its vertex (t = 1/2): kappa = 2, R = 1/2.
    expect(before).toContain(formatNumber(2, currentLanguage(), 4));

    fireEvent.change(slider, {target: {value: '0.9'}});
    expect(graph.state.curvatureT).toBe(0.9);
    expect(screen.getByRole('slider', {name: t('curvature_parameter_t')})).toHaveValue('0.9');
    const after = readout();
    expect(after).toBeTruthy();
    expect(after).not.toBe(before);
    // At t = 0.9, x = 0.8: kappa = 2 / (1 + 4x^2)^(3/2).
    expect(after).toContain(formatNumber(2 / Math.pow(1 + 4 * 0.64, 1.5), currentLanguage(), 4));
    host.unmount();
});

const boardCircle = (graph: ObservedCurvatureGraph) => {
    const circle = (graph.liveBoard().objectsList as Array<any>).find(o => o.elType === 'circle')!;
    return {centre: [circle.center.X(), circle.center.Y()] as [number, number], radius: circle.Radius() as number};
};

test('dragging a control point keeps the drawn circle tangent to the moved curve (third-order residual)', () => {
    const graph = new ObservedCurvatureGraph();
    const host = render(<MemoryRouter><GraphHost create={() => graph}/></MemoryRouter>);
    try {
        const board = graph.liveBoard();
        const t = CURVATURE_T_DEFAULT;
        const before = boardCircle(graph);
        const jxgPoints = (graph as any).getFirstJxgCurve().getJxgPoints() as Array<any>;
        const controls = (graph as any).getFirstCurve().getPoints() as Array<any>;
        const [x, y] = [controls[1].X(), controls[1].Y()];
        // The way a drag moves a control point, then the board update a drag triggers.
        jxgPoints[1].setPosition(1, [x + 0.6, y + 0.6]);
        jxgPoints[1].triggerEventHandlers(['drag'], []);
        board.update();
        const after = boardCircle(graph);
        expect(Math.hypot(after.centre[0] - before.centre[0], after.centre[1] - before.centre[1]) + Math.abs(after.radius - before.radius)).toBeGreaterThan(0.1);

        const points = controls.map(p => [p.X(), p.Y()] as [number, number]);
        const at = (u: number) => { // de Casteljau
            let level = points;
            while (level.length > 1) level = level.slice(1).map((p, i) => [(1 - u) * level[i][0] + u * p[0], (1 - u) * level[i][1] + u * p[1]] as [number, number]);
            return level[0];
        };
        const [rx, ry] = at(t);
        expect(Math.hypot(rx - after.centre[0], ry - after.centre[1])).toBeCloseTo(after.radius, 9);
        const residual = (d: number) => { const [px, py] = at(t + d); return Math.abs(Math.hypot(px - after.centre[0], py - after.centre[1]) - after.radius); };
        for (const sign of [1, -1]) {
            const ratio = residual(sign * 0.02) / residual(sign * 0.01);
            expect(residual(sign * 0.02)).toBeGreaterThan(1e-12);
            expect(ratio).toBeGreaterThan(6.5);
            expect(ratio).toBeLessThan(9.5);
        }
    } finally {
        host.unmount();
    }
});

test('a language switch with the overlay alive rewrites the visible readout in the other language, same numbers', () => {
    const graph = new ObservedCurvatureGraph();
    const host = render(<MemoryRouter><GraphHost create={() => graph}/></MemoryRouter>);
    const readout = () => ((graph.liveBoard().objectsList as Array<{elType: string; plaintext?: string}>)
        .find(o => o.elType === 'text' && (o.plaintext ?? '').includes('κ'))?.plaintext ?? '').split('<br>');
    try {
        setLanguage('sl');
        graph.liveBoard().update();
        // Parabola vertex: kappa = 2, R = 1/2 (decimal comma versus point).
        expect(readout().slice(0, 2)).toEqual(['Ukrivljenost κ = 2', 'Krivinski polmer R = 0,5']);
        setLanguage('en');
        expect(readout().slice(0, 2)).toEqual(['Curvature κ = 2', 'Radius of curvature R = 0.5']);
        setLanguage('sl');
        expect(readout().slice(0, 2)).toEqual(['Ukrivljenost κ = 2', 'Krivinski polmer R = 0,5']);
    } finally {
        setLanguage('sl');
        host.unmount();
    }
});
