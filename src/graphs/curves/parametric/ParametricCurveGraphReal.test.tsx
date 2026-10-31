import React from 'react';
import {render} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import ParametricCurveGraph from './ParametricCurveGraph';
import {GraphHost} from '../../base/GraphHost';

// jsdom has no canvas and no matchMedia; JSXGraph touches both while creating a board.
beforeAll(() => {
    const context = new Proxy({}, {get: (_target, name) => name === 'measureText' ? () => ({width: 0}) : () => undefined});
    HTMLCanvasElement.prototype.getContext = (() => context) as unknown as HTMLCanvasElement['getContext'];
    window.matchMedia = (() => ({matches: false, addEventListener: () => undefined, removeEventListener: () => undefined,
        addListener: () => undefined, removeListener: () => undefined})) as unknown as typeof window.matchMedia;
});

class ObservedParametricGraph extends ParametricCurveGraph {
    liveBoard() { return this.board; }

    ownedElements() { return [...(this['scene']?.ownedElements() ?? [])]; }

    ownedOnBoard(board = this.board) {
        return this.ownedElements().filter(element => board.objectsList.includes(element)).length;
    }
}

test('on a real board the scene exists after initialize, is recreated once by a preset import, and is gone after unmount', () => {
    const graph = new ObservedParametricGraph();
    const view = render(<MemoryRouter><GraphHost create={() => graph}/></MemoryRouter>);
    const board = graph.liveBoard();
    const created = graph.ownedElements().length;
    expect(created).toBeGreaterThan(5);
    expect(graph.ownedOnBoard()).toBe(created);
    const first = graph.ownedElements();
    const total = board.objectsList.length;

    graph.importPresetData({curve: 'cardioid', radius: 1, parameter: 1});
    expect(first.some(element => board.objectsList.includes(element))).toBe(false);
    const second = graph.ownedElements();
    expect(graph.ownedOnBoard()).toBe(second.length);
    // The cardioid scene has no rolling circle but a radius ray; no duplicates of the old scene remain.
    expect(board.objectsList.length).toBe(total - created + second.length);

    view.unmount();
    expect(second.some(element => board.objectsList.includes(element))).toBe(false);
});
