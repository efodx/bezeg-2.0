import React from 'react';
import {fireEvent, render, screen} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import CurvatureBezierCurveGraph, {CURVATURE_T_DEFAULT} from './CurvatureBezierCurveGraph';
import {currentLanguage, t} from '../../../localization';
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
