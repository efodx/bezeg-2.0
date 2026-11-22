import {act} from '@testing-library/react';
import {beforeAll, beforeEach, describe, expect, test, vi} from 'vitest';
import {FunctionTransformationGraph, type TransformationIds} from './FunctionTransformationGraph';
import {installBoardShims, mountGraph, REAL_GRAPH_TEST_TIMEOUT} from '../base/realGraphTestHarness';
import {checkDeclaration, type GraphDeclaration, type ReadoutRow} from '../base/declare/graphDeclaration';
import {formatNumber} from '../../analysis/format';
import {trackedPointOf, type FunctionTransformationModel} from '../../analysis/functionTransformationModel';
import {renderMessage, setLanguage, type Message, type MessageNumber} from '../../localization';
import {GraphPalette} from '../styles/GraphPalette';
import {currentWrite} from '../base/writes/writeSource';

vi.setConfig({testTimeout: REAL_GRAPH_TEST_TIMEOUT});
beforeAll(installBoardShims);
beforeEach(() => setLanguage('sl'));

type Write = [key: TransformationIds['param'], value: unknown];

/** Mounts a real graph on a real (jsdom) board and applies lesson writes through the arbiter. */
function setup(...writes: Write[]) {
    const graph = new FunctionTransformationGraph();
    mountGraph(graph);
    for (const [key, value] of writes) act(() => { graph.parameters!.write(key, value, 'lesson'); });
    return {graph, declaration: () => graph.getDeclaration() as GraphDeclaration<TransformationIds>};
}

const text = (value: MessageNumber | Message | {kind: 'formatted'; text: string}): string =>
    !('kind' in value) ? renderMessage(value) : value.kind === 'formatted' ? value.text : formatNumber(value.value, 'sl', value.maxDecimals);
const readout = (id: string) => document.querySelector(`[data-readout="${id}"] dd`)?.textContent;
const rowsOf = (declaration: GraphDeclaration<TransformationIds>): ReadoutRow<TransformationIds>[] => (declaration.readouts ?? []).flatMap(group => [...group.rows]);
const PANEL_ROWS: Record<string, string> = {rule: 'rule', 'base-point': 'base-point', 'image-point': 'image-point'};

const states: {name: string; writes: Write[]}[] = [
    {name: 'default', writes: []},
    {name: 'stretch and shift', writes: [['transform-a', 1.5], ['transform-b', 2], ['transform-c', -1], ['transform-d', 0.5]]},
    {name: 'reflected, compressed', writes: [['transform-a', -1], ['transform-b', 0.5], ['transform-c', 2], ['transform-d', -2]]},
    {name: 'sqrt', writes: [['transform-base', 'sqrt'], ['transform-u', 4]]},
    {name: 'reciprocal', writes: [['transform-base', 'reciprocal'], ['transform-u', 2]]},
    {name: 'ln', writes: [['transform-base', 'ln'], ['transform-u', 3], ['transform-c', 1.25]]},
    {name: 'abs', writes: [['transform-base', 'abs'], ['transform-u', -3]]},
];

describe('function transformation declaration', () => {
    for (const {name, writes} of states) {
        for (const ghost of [true, false]) {
            test(`${name}, ghost ${ghost ? 'shown' : 'hidden'}: consistent, bound, drawn and equal to the inspector`, () => {
                const {graph, declaration} = setup(...writes);
                if (!ghost) act(() => graph.performAction('toggle-ghost'));
                const current = declaration();

                expect(checkDeclaration(current)).toEqual([]);
                for (const parameter of current.parameters ?? []) expect(graph.parameters!.keys()).toContain(parameter.key);

                const model = (graph as unknown as {model: FunctionTransformationModel}).model;
                const tracked = trackedPointOf(model) !== undefined;
                const expectedVisible: Record<TransformationIds['legend'], boolean> = {curve: true, ghost: ghost, point: tracked};
                for (const entry of current.legend ?? []) {
                    const drawn = graph.drawnObject(entry.object);
                    expect(drawn, entry.id).toBeDefined();
                    expect(drawn!.visible, entry.id).toBe(expectedVisible[entry.id]);
                }
                expect(graph.drawnObject('curve')!.color).toBe(GraphPalette.primaryCurve);
                expect(graph.drawnObject('ghost')!.color).toBe(GraphPalette.referenceCurve);
                expect(graph.drawnObject('point')!.color).toBe(GraphPalette.constructionAccent);

                for (const row of rowsOf(current)) expect(text(row.value), row.id).toBe(readout(PANEL_ROWS[row.id]));
                expect(rowsOf(current).map(row => row.id)).toEqual(['rule', 'base-point', 'image-point']);

                const steps = [...document.querySelectorAll('[data-transform-steps] li')].map(item => item.textContent);
                const body = current.sections![0].body.slice(1).map(block => block.kind === 'text' ? renderMessage(block.text) : '');
                expect(body).toEqual(steps);

                expect(current.actions).toMatchObject([{id: 'toggle-ghost', placement: 'tools', pressed: ghost}]);
            });
        }
    }

    test('performAction toggles the ghost as the learner and refuses an unknown action', () => {
        const sources: (string | undefined)[] = [];
        class Probe extends FunctionTransformationGraph {
            protected override setGhostVisible(visible: boolean) {
                sources.push(currentWrite()?.source);
                super.setGhostVisible(visible);
            }
        }
        const graph = new Probe();
        mountGraph(graph);
        const declaration = () => graph.getDeclaration() as GraphDeclaration<TransformationIds>;
        expect(declaration().actions![0].pressed).toBe(true);
        act(() => graph.performAction('toggle-ghost'));
        expect(declaration().actions![0].pressed).toBe(false);
        act(() => graph.performAction('toggle-ghost'));
        expect(declaration().actions![0].pressed).toBe(true);
        expect(() => graph.performAction('nothing')).toThrow('Unknown action');
        expect(sources).toEqual(['learner', 'learner']);
    });

    test('the base choice lists the seven base functions', () => {
        const {declaration} = setup();
        const choice = declaration().parameters!.find(parameter => parameter.key === 'transform-base');
        expect(choice?.kind === 'choice' && choice.options.map(option => option.value)).toEqual(['square', 'cube', 'sqrt', 'reciprocal', 'abs', 'exp', 'ln']);
    });
});
