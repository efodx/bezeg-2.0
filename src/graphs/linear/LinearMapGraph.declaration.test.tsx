import {act} from '@testing-library/react';
import {beforeAll, beforeEach, describe, expect, test, vi} from 'vitest';
import {LinearMapGraph, type LinearMapIds} from './LinearMapGraph';
import {installBoardShims, mountGraph, REAL_GRAPH_TEST_TIMEOUT} from '../base/realGraphTestHarness';
import {checkDeclaration, type FormattedValue, type GraphDeclaration, type ReadoutRow} from '../base/declare/graphDeclaration';
import {formatNumber} from '../../analysis/format';
import {normalise} from '../base/declare/parity';
import {renderMessage, setLanguage, type Message, type MessageNumber} from '../../localization';
import {currentWrite} from '../base/writes/writeSource';

vi.setConfig({testTimeout: REAL_GRAPH_TEST_TIMEOUT});
beforeAll(installBoardShims);
beforeEach(() => setLanguage('sl'));

type Write = [key: string, value: unknown];
type Step = Write | ['action', string];

function setup(...steps: Step[]) {
    const graph = new LinearMapGraph();
    mountGraph(graph);
    for (const step of steps) {
        if (step[0] === 'action') act(() => graph.performAction(step[1] as string));
        else act(() => { graph.parameters!.write(step[0], step[1], 'lesson'); });
    }
    return {graph, declaration: () => graph.getDeclaration() as GraphDeclaration<LinearMapIds>};
}

const text = (value: MessageNumber | Message | FormattedValue): string =>
    !('kind' in value) ? renderMessage(value) : value.kind === 'formatted' ? value.text : formatNumber(value.value, 'sl', value.maxDecimals);
const readout = (id: string) => normalise(document.querySelector(`[data-readout="${id}"] dd`)?.textContent ?? '');
const rowsOf = (declaration: GraphDeclaration<LinearMapIds>): ReadoutRow<LinearMapIds>[] => (declaration.readouts ?? []).flatMap(group => [...group.rows]);

const states: {name: string; steps: Step[]; mode: string; parameters: string[]; legend: string[]}[] = [
    {name: 'basis, default', steps: [], mode: 'basis', parameters: ['linear-map-mode', 'linear-map-example', 'linear-map-a11', 'linear-map-a21', 'linear-map-a12', 'linear-map-a22'],
        legend: ['source-grid', 'image-grid', 'square', 'curve', 'curve-image']},
    {name: 'basis, singular example', steps: [['linear-map-example', 'singular']], mode: 'basis', parameters: [], legend: []},
    {name: 'determinant, reversing matrix', steps: [['linear-map-mode', 'determinant'], ['linear-map-a11', 2], ['linear-map-a22', -1]], mode: 'determinant', parameters: [], legend: []},
    {name: 'determinant, square hidden', steps: [['linear-map-mode', 'determinant'], ['action', 'toggle-square']], mode: 'determinant', parameters: [], legend: []},
    {name: 'eigen at 45 degrees', steps: [['linear-map-mode', 'eigen'], ['linear-map-example', 'eigen-default'], ['linear-map-test-angle', 45]], mode: 'eigen',
        parameters: ['linear-map-test-angle'], legend: ['source-grid', 'image-grid', 'circle', 'v', 'av', 'lines']},
    {name: 'eigen, quarter turn (no real eigenvalues)', steps: [['linear-map-mode', 'eigen'], ['linear-map-example', 'quarter-turn']], mode: 'eigen', parameters: [], legend: []},
    {name: 'ellipse, symmetric', steps: [['linear-map-mode', 'ellipse'], ['linear-map-example', 'symmetric']], mode: 'ellipse', parameters: [],
        legend: ['source-grid', 'image-grid', 'circle', 'image', 'axes', 'directions', 'lines']},
    {name: 'ellipse with the conic', steps: [['linear-map-mode', 'ellipse'], ['linear-map-example', 'non-symmetric'], ['action', 'toggle-conic']], mode: 'ellipse', parameters: [],
        legend: ['source-grid', 'image-grid', 'circle', 'conic', 'conic-axes', 'lines']},
    {name: 'iterate, step 5', steps: [['linear-map-mode', 'iterate'], ['linear-map-example', 'eigen-default'], ['linear-map-step', 5]], mode: 'iterate',
        parameters: ['linear-map-step'], legend: ['source-grid', 'image-grid', 'iterates', 'unit', 'dominant', 'other']},
    {name: 'iterate, quarter turn at step 2', steps: [['linear-map-mode', 'iterate'], ['linear-map-example', 'quarter-turn'], ['linear-map-step', 2]], mode: 'iterate', parameters: [], legend: []},
    {name: 'trace-determinant, shear', steps: [['linear-map-mode', 'tracedet'], ['linear-map-example', 'shear']], mode: 'tracedet', parameters: [], legend: ['parabola', 'triangle', 'flow', 'point']},
    {name: 'composition, default', steps: [['linear-map-mode', 'composition']], mode: 'composition',
        parameters: ['linear-map-first-source', 'linear-map-second-source', 'linear-map-first-index', 'linear-map-second-index'],
        legend: ['source-grid', 'grid-a', 'grid-image', 'curve', 'curve-image', 'translation', 'pivot']},
    {name: 'composition, rotation then reflection with a pivot', steps: [['linear-map-mode', 'composition'], ['linear-map-first-source', 'rotation'], ['linear-map-first-index', 3],
        ['linear-map-second-source', 'reflection'], ['linear-map-second-index', 5], ['action', 'toggle-pivot']], mode: 'composition', parameters: [], legend: []},
];

describe('Linear map declaration', () => {
    test('a composition slot declares the angle or the free entries, never the one that does not apply', () => {
        const keysOf = (...steps: Step[]) => (setup(['linear-map-mode', 'composition'], ...steps).declaration().parameters ?? []).map(parameter => parameter.key);
        const none = (keys: string[], pattern: RegExp) => expect(keys.filter(key => pattern.test(key))).toEqual([]);

        const elements = keysOf();
        expect(elements).toEqual(expect.arrayContaining(['linear-map-first-index', 'linear-map-second-index']));
        none(elements, /^linear-map-[ab]\d\d$/);

        const mixed = keysOf(['linear-map-first-source', 'free']);
        expect(mixed).not.toContain('linear-map-first-index');
        expect(mixed).toEqual(expect.arrayContaining(['linear-map-a11', 'linear-map-a22', 'linear-map-second-index']));
        none(mixed, /^linear-map-b\d\d$/);
    });

    for (const {name, steps, mode, parameters, legend} of states) {
        test(`${name}: consistent, bound, drawn and equal to the inspector`, () => {
            const {graph, declaration} = setup(...steps);
            const current = declaration();
            expect((graph as unknown as {model: {mode: string}}).model.mode).toBe(mode);

            expect(checkDeclaration(current)).toEqual([]);
            for (const parameter of current.parameters ?? []) expect(graph.parameters!.keys()).toContain(parameter.key);
            const keys = (current.parameters ?? []).map(parameter => parameter.key);
            for (const key of parameters) expect(keys, key).toContain(key);
            if (legend.length > 0) expect((current.legend ?? []).map(entry => entry.id)).toEqual(legend);

            for (const entry of current.legend ?? []) {
                const drawn = graph.drawnObject(entry.object);
                expect(drawn, entry.id).toBeDefined();
                expect(drawn!.color, entry.id).toMatch(/^#|^rgb|^[a-z]+$/i);
            }

            const rows = rowsOf(current);
            expect(rows.length).toBeGreaterThanOrEqual(5);
            for (const row of rows) expect(normalise(text(row.value)), row.id).toBe(readout(row.id));
            const shown = [...document.querySelectorAll('[data-readout]:not([data-readout-live])')].map(element => element.getAttribute('data-readout'));
            expect(rows.map(row => row.id)).toEqual(shown);
            expect((current.notes ?? []).length).toBeGreaterThan(0);
        });
    }

    test('display switches are actions with their state, and performAction runs them as the learner', () => {
        const sources: string[] = [];
        class Probe extends LinearMapGraph {
            protected override setToggle(field: 'probeVisible' | 'curveVisible' | 'squareVisible' | 'conicVisible', visible: boolean) {
                sources.push(`${field}:${visible}:${currentWrite()?.source}`);
                super.setToggle(field, visible);
            }
        }
        const graph = new Probe();
        mountGraph(graph);
        const actions = () => (graph.getDeclaration() as GraphDeclaration<LinearMapIds>).actions!;
        expect(actions().find(action => action.id === 'toggle-square')).toMatchObject({pressed: true});
        act(() => graph.performAction('toggle-square'));
        expect(actions().find(action => action.id === 'toggle-square')).toMatchObject({pressed: false});
        expect(graph.drawnObject('square')!.visible).toBe(false);
        expect(sources).toEqual(['squareVisible:false:learner']);
        expect(() => graph.performAction('nothing')).toThrow('Unknown action');
    });

    test('the mode choice lists the seven modes and a statuses line is declared for the determinant mode', () => {
        const {declaration} = setup(['linear-map-mode', 'determinant']);
        const mode = declaration().parameters!.find(parameter => parameter.key === 'linear-map-mode')!;
        expect(mode.kind === 'choice' ? mode.options.map(option => option.value) : []).toEqual(['basis', 'determinant', 'eigen', 'ellipse', 'composition', 'iterate', 'tracedet']);
        expect(declaration().status!.map(line => line.id)).toContain('positive');
    });
});
