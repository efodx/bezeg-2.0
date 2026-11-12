import React from 'react';
import {act, render} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import {beforeAll, describe, expect, test} from 'vitest';
import {GraphHost} from '../../base/GraphHost';
import {installBoardShims} from '../../base/realGraphTestHarness';
import {ComplexPowerGraph} from '../ComplexPowerGraph';
import {EulerCircleGraph} from '../EulerCircleGraph';

beforeAll(installBoardShims);

const mountGraph = <G extends ComplexPowerGraph | EulerCircleGraph>(graph: G): G => {
    render(<MemoryRouter><GraphHost create={() => graph}/></MemoryRouter>);
    return graph;
};
const json = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T;
const boxOf = (graph: {liveBoard(): JXG.Board}) => graph.liveBoard().getBoundingBox().map(v => Number(v.toFixed(3)));
class ViewedPower extends ComplexPowerGraph { liveBoard() { return this.board; } }
class ViewedEuler extends EulerCircleGraph { liveBoard() { return this.board; } }

// A Preset file with a stored view keeps it (families-prep F2b): importing non-default data must not frame the board anew.
describe('a Preset file with a stored view keeps that view', () => {
    test('complex power: z^5 of another z imported with a stored boardState keeps the stored box', () => {
        const view: [number, number, number, number] = [-1.5, 2, 4.5, -2]; // 3:2
        const source = mountGraph(new ViewedPower());
        act(() => { source.setState({A: 12, B: -6, n: 5}); });
        const preset = {...json(source.exportPreset()), boardState: {boundingBox: view}};
        const fresh = mountGraph(new ViewedPower());
        act(() => { fresh.importPreset(preset); });
        expect(fresh.state).toMatchObject({A: 12, B: -6, n: 5});
        expect(boxOf(fresh)).toEqual(view);
    });
    test('complex power: a Preset without a stored view shows the opening view', () => {
        const source = mountGraph(new ViewedPower());
        const opening = boxOf(source);
        act(() => { source.setState({A: 12, B: -6, n: 5}); });
        const preset = json(source.exportPreset());
        const fresh = mountGraph(new ViewedPower());
        act(() => { fresh.importPreset(preset); });
        expect(fresh.state.n).toBe(5);
        expect(boxOf(fresh)).toEqual(opening);
    });
    test('Euler circle: product mode at another angle imported with a stored boardState keeps the stored box', () => {
        const view: [number, number, number, number] = [-1.5, 2, 4.5, -2];
        const source = mountGraph(new ViewedEuler());
        act(() => { source.setState({degrees: 150, mode: 'product', b: 80}); });
        const preset = {...json(source.exportPreset()), boardState: {boundingBox: view}};
        const fresh = mountGraph(new ViewedEuler());
        act(() => { fresh.importPreset(preset); });
        expect(fresh.state).toMatchObject({degrees: 150, mode: 'product', b: 80});
        expect(boxOf(fresh)).toEqual(view);
    });
    test('Euler circle: a Preset without a stored view shows the opening view', () => {
        const source = mountGraph(new ViewedEuler());
        const opening = boxOf(source);
        act(() => { source.setState({degrees: 150, mode: 'product', b: 80}); });
        const preset = json(source.exportPreset());
        const fresh = mountGraph(new ViewedEuler());
        act(() => { fresh.importPreset(preset); });
        expect(fresh.state.degrees).toBe(150);
        expect(boxOf(fresh)).toEqual(opening);
    });
});
