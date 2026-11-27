import React from 'react';
import {act, render} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import {afterEach, beforeAll, beforeEach, describe, expect, test} from 'vitest';
import {renderMessage, setLanguage} from '../../localization';
import {legendLines} from '../legend/legendLines';
import {GraphHost} from '../base/GraphHost';
import {installBoardShims} from '../base/realGraphTestHarness';
import {ContourMapGraph} from './ContourMapGraph';
import {LinearProgramGraph} from './LinearProgramGraph';
import {contourWindow} from '../../levelsets/contourModel';
import {runAs} from '../base/writes/writeSource';

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
        act(() => runAs('learner', () => { source.setFunction('hills'); }));
        expect(boxOf(source)).not.toEqual(defaultBox);
        const preset = {...json(source.exportPreset()), boardState: {boundingBox: view}};
        const fresh = mountGraph(new ViewedContour());
        act(() => runAs('learner', () => { fresh.importPreset(preset); }));
        expect(fresh.state.fn).toBe('hills');
        expect(boxOf(fresh)).toEqual(view);
    });
    test('contour map: a Preset without a stored view is framed to its function window', () => {
        const source = mountGraph(new ViewedContour());
        act(() => runAs('learner', () => { source.setFunction('hills'); }));
        const framed = boxOf(source);
        const preset = json(source.exportPreset());
        const fresh = mountGraph(new ViewedContour());
        act(() => runAs('learner', () => { fresh.importPreset(preset); }));
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
            act(() => runAs('learner', () => { graph.setMode(mode); }));
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
        // Both legends are legend cards now (task 08 lanes L29 and the linear program): the board draws no legend rows to space, and a
        // long entry wraps inside the card, not into the data.
        test(`contour map: the legend is the card, the board draws no legend rows (${language})`, () => {
            setLanguage(language);
            const graph = mountGraph(new ViewedContour());
            let wrapped = false;
            for (const mode of ['level-sets', 'gradient', 'descent', 'lagrange'] as const) {
                act(() => runAs('learner', () => { graph.setMode(mode); }));
                expect(legendRows(graph.liveBoard()), mode).toHaveLength(0);
                const card = graph.getDeclaration()?.legend ?? [];
                expect(card.length).toBeGreaterThanOrEqual(3);
                wrapped ||= card.some(entry => legendLines(renderMessage(entry.label), 390) > 1);
            }
            // The Slovenian contour legend is short enough to take one line per entry at 390 px.
            if (language === 'en') expect(wrapped, 'some entry wraps at 390 px').toBe(true);
        });
    }
});

// The opening view frames the data on the board: both legends are cards, so no board strip pushes the data down.
describe('the opening view keeps the legend off the data', () => {
    const restore = [['clientWidth', 600], ['clientHeight', 400], ['offsetWidth', 600], ['offsetHeight', 400]] as const;
    const sizeBoard = (width: number, height: number) => {
        for (const [name, size] of Object.entries({clientWidth: width, offsetWidth: width, clientHeight: height, offsetHeight: height})) Object.defineProperty(HTMLElement.prototype, name, {configurable: true, get: () => size});
        HTMLElement.prototype.getBoundingClientRect = () => ({x: 0, y: 0, left: 0, top: 0, right: width, bottom: height, width, height, toJSON: () => ({})}) as DOMRect;
    };
    afterEach(() => {
        for (const [name, size] of restore) Object.defineProperty(HTMLElement.prototype, name, {configurable: true, get: () => size});
        HTMLElement.prototype.getBoundingClientRect = () => ({x: 0, y: 0, left: 0, top: 0, right: 600, bottom: 400, width: 600, height: 400, toJSON: () => ({})}) as DOMRect;
        setLanguage('sl');
    });
    type Row = {plaintext: unknown; Y(): number; visPropCalc: {visible: boolean}; evalVisProp(name: string): unknown};
    const pxFromTop = (board: JXG.Board, y: number): number => (board.getBoundingBox()[1] - y) * board.unitY;
    const sizes = [[600, 400], [390, 480]] as const;
    for (const [width, height] of sizes) {
        for (const language of ['sl', 'en'] as const) {
            test(`linear program: no board legend, the region and its vertices fill the whole board (${width} x ${height}, ${language})`, () => {
                sizeBoard(width, height);
                setLanguage(language);
                const graph = mountGraph(new ViewedLp());
                const board = graph.liveBoard();
                const vertices = graph.solution().result.vertices.map(v => [v.x.toNumber(), v.y.toNumber()]);
                const [left, , right] = board.getBoundingBox();
                const top = Math.min(...vertices.map(v => pxFromTop(board, v[1])));
                const bottom = Math.max(...vertices.map(v => pxFromTop(board, v[1])));
                expect((board.objectsList as unknown as Row[]).filter(o => o.visPropCalc.visible && o.evalVisProp('anchory') === 'top' && o.evalVisProp('anchorx') === 'left')).toHaveLength(0);
                expect(top).toBeGreaterThanOrEqual(0);
                expect(bottom).toBeLessThanOrEqual(height - 10);
                for (const v of vertices) { expect(v[0]).toBeGreaterThan(left); expect(v[0]).toBeLessThan(right); }
                // The region is not a small patch in a corner: it takes at least a third of the board.
                expect(bottom - top).toBeGreaterThanOrEqual(height / 3);
            });
        }
        for (const mode of ['level-sets', 'gradient', 'descent', 'lagrange'] as const) {
            test(`contour map ${mode}: no board legend, the window starts on the board (${width} x ${height})`, () => {
                sizeBoard(width, height);
                const graph = mountGraph(new ViewedContour());
                act(() => runAs('learner', () => { graph.setMode(mode); }));
                const board = graph.liveBoard();
                const window = contourWindow(graph.state.fn, mode);
                // the legend is the card (task 08 lane L29): no board legend strip for the window to start under
                expect((board.objectsList as unknown as Row[]).filter(o => o.visPropCalc.visible && o.evalVisProp('anchory') === 'top' && o.evalVisProp('anchorx') === 'left')).toHaveLength(0);
                expect(pxFromTop(board, window.yMax)).toBeGreaterThanOrEqual(0);
                expect(pxFromTop(board, window.yMin)).toBeLessThanOrEqual(height + 0.5);
            });
        }
    }
});
