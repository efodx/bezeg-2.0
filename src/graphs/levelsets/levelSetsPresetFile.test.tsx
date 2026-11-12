import React from 'react';
import {act, render} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import {afterEach, beforeAll, beforeEach, describe, expect, test} from 'vitest';
import {setLanguage} from '../../localization';
import {legendLines} from './legendLines';
import {GraphHost} from '../base/GraphHost';
import {installBoardShims} from '../base/realGraphTestHarness';
import {ContourMapGraph} from './ContourMapGraph';
import {LinearProgramGraph} from './LinearProgramGraph';

beforeAll(installBoardShims);

const mountGraph = <G extends ContourMapGraph | LinearProgramGraph>(graph: G): G => {
    render(<MemoryRouter><GraphHost create={() => graph}/></MemoryRouter>);
    return graph;
};
const json = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T;
const boxOf = (graph: {liveBoard(): JXG.Board}) => graph.liveBoard().getBoundingBox().map(v => Number(v.toFixed(3)));
class ViewedContour extends ContourMapGraph { liveBoard() { return this.board; } }
class ViewedLp extends LinearProgramGraph { liveBoard() { return this.board; } }

// A Preset file with a stored view keeps it (families-prep F2b): the view framed for the imported data must not replace it.
describe('a Preset file with a stored view keeps that view', () => {
    test('contour map: a hills imported with a stored boardState is not reframed to the hills window', () => {
        const view: [number, number, number, number] = [-1.5, 2, 4.5, -2]; // 3:2 like the 600 x 400 board
        const source = mountGraph(new ViewedContour());
        const defaultBox = boxOf(source);
        act(() => { source.setFunction('hills'); });
        expect(boxOf(source)).not.toEqual(defaultBox);
        const preset = {...json(source.exportPreset()), boardState: {boundingBox: view}};
        const fresh = mountGraph(new ViewedContour());
        act(() => { fresh.importPreset(preset); });
        expect(fresh.state.fn).toBe('hills');
        expect(boxOf(fresh)).toEqual(view);
    });
    test('contour map: a Preset without a stored view is framed to its function window', () => {
        const source = mountGraph(new ViewedContour());
        act(() => { source.setFunction('hills'); });
        const framed = boxOf(source);
        const preset = json(source.exportPreset());
        const fresh = mountGraph(new ViewedContour());
        act(() => { fresh.importPreset(preset); });
        expect(boxOf(fresh)).toEqual(framed);
    });
    test('linear program: a larger region imported with a stored boardState is not reframed to its window', () => {
        const view: [number, number, number, number] = [-3, 6, 9, -2]; // 3:2
        const source = mountGraph(new ViewedLp());
        const defaultBox = boxOf(source);
        act(() => { source.setState({constraints: [{a: 1, b: 1, c: 30}, {a: 1, b: -1, c: 10}, {a: 0, b: 1, c: 25}]}); });
        expect(boxOf(source)).not.toEqual(defaultBox);
        const preset = {...json(source.exportPreset()), boardState: {boundingBox: view}};
        const fresh = mountGraph(new ViewedLp());
        act(() => { fresh.importPreset(preset); });
        expect(fresh.state.constraints.length).toBe(3);
        expect(boxOf(fresh)).toEqual(view);
    });
    test('linear program: a Preset without a stored view is framed to its region', () => {
        const source = mountGraph(new ViewedLp());
        act(() => { source.setState({constraints: [{a: 1, b: 1, c: 30}, {a: 1, b: -1, c: 10}, {a: 0, b: 1, c: 25}]}); });
        const framed = boxOf(source);
        const preset = json(source.exportPreset());
        const fresh = mountGraph(new ViewedLp());
        act(() => { fresh.importPreset(preset); });
        expect(boxOf(fresh)).toEqual(framed);
    });
});

// Elements created hidden are skipped by regular updates (JSXGraph reads the stored visibility), so an element a state change makes
// visible must already hold its data when that change is committed, not after the next board update.
const drawnPoints = (board: JXG.Board): Record<string, number> => {
    const counts: Record<string, number> = {};
    for (const element of board.objectsList as unknown as {id: string; elementClass: number; numberPoints?: number; visPropCalc: {visible: boolean}}[]) {
        if (element.visPropCalc.visible && typeof element.numberPoints === 'number') counts[element.id] = element.numberPoints;
    }
    return counts;
};
describe('an element a state change makes visible is drawn at once', () => {
    test('contour map: every mode shows the same curves before and after a full board update', () => {
        const graph = mountGraph(new ViewedContour());
        for (const mode of ['gradient', 'descent', 'lagrange', 'level-sets'] as const) {
            act(() => { graph.setMode(mode); });
            const committed = drawnPoints(graph.liveBoard());
            act(() => { graph.liveBoard().fullUpdate(); });
            expect(committed, mode).toEqual(drawnPoints(graph.liveBoard()));
            expect(Object.keys(committed).length, `${mode} draws curves`).toBeGreaterThan(0);
            if (mode === 'descent') expect(Math.max(0, ...Object.values(committed)), 'the descent path has points').toBeGreaterThan(1);
        }
    });
    test('linear program: a state change that makes the sweep line visible draws it', () => {
        const graph = mountGraph(new ViewedLp());
        for (const constraints of [[{a: 1, b: 1, c: -1}, {a: -1, b: -1, c: -1}], [{a: 1, b: 1, c: 30}, {a: 1, b: -1, c: 10}, {a: 0, b: 1, c: 25}]]) {
            act(() => { graph.setState({constraints}); });
            const committed = drawnPoints(graph.liveBoard());
            act(() => { graph.liveBoard().fullUpdate(); });
            expect(committed).toEqual(drawnPoints(graph.liveBoard()));
        }
    });
});

// A legend row wider than the board wraps in the browser: the rows below start after the lines it takes, so none runs into the next.
describe('the legend on a narrow board (390 x 480 px)', () => {
    const sizes = {clientWidth: 390, offsetWidth: 390, clientHeight: 480, offsetHeight: 480} as const;
    const restore = [['clientWidth', 600], ['clientHeight', 400], ['offsetWidth', 600], ['offsetHeight', 400]] as const;
    beforeEach(() => {
        for (const [name, size] of Object.entries(sizes)) Object.defineProperty(HTMLElement.prototype, name, {configurable: true, get: () => size});
        HTMLElement.prototype.getBoundingClientRect = () => ({x: 0, y: 0, left: 0, top: 0, right: 390, bottom: 480, width: 390, height: 480, toJSON: () => ({})}) as DOMRect;
    });
    afterEach(() => {
        for (const [name, size] of restore) Object.defineProperty(HTMLElement.prototype, name, {configurable: true, get: () => size});
        HTMLElement.prototype.getBoundingClientRect = () => ({x: 0, y: 0, left: 0, top: 0, right: 600, bottom: 400, width: 600, height: 400, toJSON: () => ({})}) as DOMRect;
        setLanguage('sl');
    });
    type Row = {plaintext: unknown; Y(): number; visPropCalc: {visible: boolean}; evalVisProp(name: string): unknown};
    const legendRows = (board: JXG.Board): Row[] => (board.objectsList as unknown as Row[])
        .filter(o => o.visPropCalc.visible && o.evalVisProp('anchory') === 'top' && o.evalVisProp('anchorx') === 'left' && o.Y() > board.getBoundingBox()[1] - 200 / board.unitY && o.Y() <= board.getBoundingBox()[1])
        .sort((a, b) => b.Y() - a.Y());
    for (const language of ['sl', 'en'] as const) {
        for (const [name, create] of [['contour map', () => new ViewedContour()], ['linear program', () => new ViewedLp()]] as const) {
            test(`${name}: a row that wraps leaves room for its lines (${language})`, () => {
                setLanguage(language);
                const graph = mountGraph(create());
                let wrapped = false;
                for (const mode of graph instanceof ContourMapGraph ? ['level-sets', 'gradient', 'descent', 'lagrange'] as const : [undefined]) {
                    if (mode && graph instanceof ContourMapGraph) act(() => { graph.setMode(mode); });
                    const board = graph.liveBoard();
                    const rows = legendRows(board);
                    expect(rows.length).toBeGreaterThanOrEqual(3);
                    wrapped ||= rows.some(row => legendLines(String(row.plaintext), 390) > 1);
                    for (let i = 0; i + 1 < rows.length; i++) {
                        const gapPx = (rows[i].Y() - rows[i + 1].Y()) * board.unitY;
                        expect(gapPx, String(rows[i].plaintext)).toBeGreaterThanOrEqual(legendLines(String(rows[i].plaintext), 390) * 20 - 0.5);
                    }
                }
                // The Slovenian contour legend is short enough to take one line per row at 390 px.
                if (name !== 'contour map' || language === 'en') expect(wrapped, 'some row wraps at 390 px').toBe(true);
            });
        }
    }
});
