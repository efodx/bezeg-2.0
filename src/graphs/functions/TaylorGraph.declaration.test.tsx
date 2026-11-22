import {act} from '@testing-library/react';
import {beforeAll, beforeEach, describe, expect, test, vi} from 'vitest';
import {TaylorGraph, type TaylorIds} from './TaylorGraph';
import {installBoardShims, mountGraph, REAL_GRAPH_TEST_TIMEOUT} from '../base/realGraphTestHarness';
import {checkDeclaration, type FormattedValue, type GraphDeclaration, type ReadoutRow} from '../base/declare/graphDeclaration';
import {formatNumber} from '../../analysis/format';
import {taylorAbsoluteError, taylorExample, type TaylorExampleId} from '../../analysis/taylor';
import type {TaylorModel} from '../../analysis/taylorModel';
import {renderMessage, setLanguage, type Message, type MessageNumber} from '../../localization';
import {GraphPalette} from '../styles/GraphPalette';
import {currentWrite} from '../base/writes/writeSource';

vi.setConfig({testTimeout: REAL_GRAPH_TEST_TIMEOUT});
beforeAll(installBoardShims);
beforeEach(() => setLanguage('sl'));

type Write = [key: TaylorIds['param'], value: unknown];

/** Mounts a real graph on a real (jsdom) board and applies lesson writes, one per step, through the arbiter. */
function setup(...writes: Write[]) {
    const graph = new TaylorGraph();
    const {view} = mountGraph(graph);
    for (const [key, value] of writes) act(() => { graph.parameters!.write(key, value, 'lesson'); });
    return {graph, view, declaration: () => graph.getDeclaration() as GraphDeclaration<TaylorIds>};
}

const text = (value: MessageNumber | Message | FormattedValue): string =>
    !('kind' in value) ? renderMessage(value) : value.kind === 'formatted' ? value.text : formatNumber(value.value, 'sl', value.maxDecimals);
const readout = (id: string) => document.querySelector(`[data-readout="${id}"] dd`)?.textContent;
const rowsOf = (declaration: GraphDeclaration<TaylorIds>): ReadoutRow<TaylorIds>[] => (declaration.readouts ?? []).flatMap(group => [...group.rows]);

const states: {name: string; writes: Write[]}[] = [
    {name: 'default', writes: []},
    {name: 'sine', writes: [['taylor-example', 'sine']]},
    {name: 'geometric inside the convergence interval', writes: [['taylor-example', 'geometric']]},
    {name: 'geometric outside the convergence interval', writes: [['taylor-example', 'geometric'], ['taylor-center', 0.5], ['taylor-x', -0.5]]},
    {name: 'flat', writes: [['taylor-example', 'flat']]},
    {name: 'a high degree', writes: [['taylor-degree', 10]]},
];

describe('Taylor declaration', () => {
    for (const {name, writes} of states) {
        for (const shown of [false, true]) {
            test(`${name}, error estimate ${shown ? 'shown' : 'hidden'}: consistent, bound, drawn and equal to the inspector`, () => {
                const {graph, declaration} = setup(...writes);
                if (shown) act(() => graph.performAction('show-error'));
                const current = declaration();

                expect(checkDeclaration(current)).toEqual([]);
                for (const parameter of current.parameters ?? []) expect(graph.parameters!.keys()).toContain(parameter.key);

                // the legend resolves to drawn objects whose visibility matches the board
                const rows = rowsOf(current);
                const model = (graph as unknown as {model: TaylorModel}).model;
                const absoluteError = taylorAbsoluteError(taylorExample(model.example as TaylorExampleId), model.center, model.degree, model.x);
                const expectedVisible: Record<TaylorIds['legend'], boolean> = {
                    function: true, polynomial: true, error: absoluteError > 0,
                    bound: model.boundVisible && readout('bound') !== 'ni prikazana (glej opombo)', convergence: model.example === 'geometric', center: true, x: true,
                };
                for (const entry of current.legend ?? []) {
                    const drawn = graph.drawnObject(entry.object);
                    expect(drawn, entry.id).toBeDefined();
                    expect(drawn!.visible, entry.id).toBe(expectedVisible[entry.id]);
                }
                expect(graph.drawnObject('function')!.color).toBe(GraphPalette.primaryCurve);
                expect(graph.drawnObject('bound')!.color).toBe(GraphPalette.constructionAccent);

                // every readout row shows what the inspector shows
                for (const row of rows) expect(text(row.value), row.id).toBe(readout(row.id === 'hypothesis' ? 'bound-hypothesis' : row.id));
                const notes = Object.fromEntries((current.notes ?? []).map(note => [note.id, renderMessage(note.text)]));
                expect(notes.series).toBe(readout('convergence'));

                // the flat function's center is fixed: no center parameter
                expect((current.parameters ?? []).some(parameter => parameter.key === 'taylor-center')).toBe(model.example !== 'flat');
                expect(current.actions).toMatchObject([{id: 'show-error', placement: 'board', pressed: shown}]);
            });
        }
    }

    test('performAction toggles the error estimate as the learner and refuses an unknown action', () => {
        const sources: (string | undefined)[] = [];
        class Probe extends TaylorGraph {
            protected override setBoundVisible(visible: boolean) {
                sources.push(currentWrite()?.source);
                super.setBoundVisible(visible);
            }
        }
        const graph = new Probe();
        mountGraph(graph);
        const declaration = () => graph.getDeclaration() as GraphDeclaration<TaylorIds>;
        expect(declaration().actions![0].pressed).toBe(false);
        act(() => graph.performAction('show-error'));
        expect(declaration().actions![0].pressed).toBe(true);
        expect(readout('bound')).not.toBe('skrito');
        act(() => graph.performAction('show-error'));
        expect(declaration().actions![0].pressed).toBe(false);
        expect(() => graph.performAction('nothing')).toThrow('Unknown action');
        expect(sources).toEqual(['learner', 'learner']);
    });

    test('the example choice lists the four examples with the active one first-class', () => {
        const {declaration} = setup();
        const choice = declaration().parameters!.find(parameter => parameter.key === 'taylor-example');
        expect(choice?.kind === 'choice' && choice.options.map(option => option.value)).toEqual(['exp', 'sine', 'geometric', 'flat']);
    });
});
