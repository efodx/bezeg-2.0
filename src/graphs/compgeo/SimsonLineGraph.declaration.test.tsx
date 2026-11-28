import {act} from '@testing-library/react';
import {beforeAll, beforeEach, describe, expect, test, vi} from 'vitest';
import {SimsonLineGraph, type SimsonLineIds} from './SimsonLineGraph';
import {installBoardShims, mountGraph, REAL_GRAPH_TEST_TIMEOUT} from '../base/realGraphTestHarness';
import {checkDeclaration, type GraphDeclaration, type RangeParameter} from '../base/declare/graphDeclaration';
import {normalise} from '../base/declare/parity';
import {renderMessage, setLanguage} from '../../localization';
import {runAs} from '../base/writes/writeSource';

vi.setConfig({testTimeout: REAL_GRAPH_TEST_TIMEOUT});
beforeAll(installBoardShims);
beforeEach(() => setLanguage('sl'));

const declare = (graph: SimsonLineGraph) => graph.getDeclaration() as GraphDeclaration<SimsonLineIds>;
const learner = (work: () => void) => act(() => runAs('learner', work));
const points = (list: [number, number][]) => ({mode: 'points' as const, closed: false, gridStepExponent: 0, points: list.map(([x, y]) => ({x, y}))});

const OVERLAYS = ['triangle', 'sidelines', 'circumcircle', 'perpendiculars', 'simson', 'pedal'];
const STATES: readonly {name: string; apply(graph: SimsonLineGraph): void; figure: boolean; glider: boolean}[] = [
    {name: 'default glider', apply: () => {}, figure: true, glider: true},
    {name: 'P moved', apply: graph => graph.setT(150), figure: true, glider: true},
    {name: 'offset', apply: graph => { graph.setT(250); graph.setEpsilon(0.2); }, figure: true, glider: true},
    {name: 'exact vertex', apply: graph => graph.loadExample('vertex'), figure: true, glider: false},
    {name: 'exact off the circle', apply: graph => graph.loadExample('grid-off-circle'), figure: true, glider: false},
    {name: 'degenerate', apply: graph => graph.loadModel(points([[0, 0], [1, 1], [3, 3]])), figure: false, glider: false},
    {name: 'two points', apply: graph => graph.loadModel(points([[0, 0], [4, 1]])), figure: false, glider: false},
    {name: 'empty', apply: graph => graph.clear(), figure: false, glider: false},
];

describe('Simson line declaration', () => {
    test.each(STATES)('$name: consistent, parameters and legend follow the figure, notes equal the panel', ({apply, figure, glider}) => {
        const graph = new SimsonLineGraph();
        const {view} = mountGraph(graph);
        learner(() => apply(graph));
        const declaration = declare(graph);

        expect(checkDeclaration(declaration)).toEqual([]);
        // the two glider pucks exist exactly when P glides; the arbiter binds both whatever the state
        expect((declaration.parameters ?? []).map(parameter => parameter.key)).toEqual(glider ? ['simson-t', 'simson-epsilon'] : []);
        expect((graph.parameters?.keys() ?? []).filter(key => key !== 'view').sort()).toEqual(['simson-epsilon', 'simson-t']);

        // the marks are the vertices, plus the circle's box (glider) or P-prime (exact) when there is a figure
        const vertices = graph.model.points.map(p => ({kind: 'point', x: p.x, y: p.y}));
        expect(declaration.marks!.must.slice(0, vertices.length)).toEqual(vertices);
        expect(declaration.marks!.must.length).toBe(vertices.length + (figure ? 1 : 0));
        if (figure) expect(declaration.marks!.must[vertices.length].kind).toBe(glider ? 'box' : 'point');

        // the legend resolves; P and the feet are drawn exactly when there is a figure
        expect(declaration.legend!.map(entry => entry.id)).toEqual(['points', ...(figure ? ['p', 'feet'] : []), ...OVERLAYS]);
        for (const entry of declaration.legend!) expect(graph.drawnObject(entry.object), entry.id).toBeDefined();
        expect(graph.drawnObject('p')!.visible).toBe(figure);
        expect(graph.drawnObject('feet')!.visible).toBe(figure);

        // the notes are the sentences of the panel, in its order
        const panel = [...view.container.querySelectorAll('[data-readout-note]')].map(element => normalise(element.textContent ?? ''));
        expect(declaration.notes!.map(note => normalise(renderMessage(note.text)))).toEqual(panel);
        expect(panel.length).toBeGreaterThan(0);
    });

    test('the glider angle is a range puck that writes through the setter', () => {
        const graph = new SimsonLineGraph();
        mountGraph(graph);
        const parameter = declare(graph).parameters![0] as RangeParameter;
        expect(parameter).toMatchObject({key: 'simson-t', kind: 'range', placement: 'board', symbol: 't', min: 0, max: 360});
        expect(graph.parameters!.read('simson-t')).toBe(graph.settings.t);
        act(() => { graph.parameters!.write('simson-t', 250, 'learner'); });
        expect(graph.settings.t).toBe(250);
        expect(graph.parameters!.read('simson-t')).toBe(250);
    });

    test('the offset puck snaps to the nearest of the slider stops', () => {
        const graph = new SimsonLineGraph();
        mountGraph(graph);
        const parameter = declare(graph).parameters![1] as RangeParameter;
        expect(parameter).toMatchObject({key: 'simson-epsilon', kind: 'range', placement: 'board', symbol: '\\varepsilon', min: -0.2, max: 0.2});
        for (const [typed, stop] of [[0.2, 0.2], [0.001, 0.001], [0.0004, 0], [0.04, 0.05], [-0.1, -0.05], [-0.2, -0.2]] as const) {
            act(() => { graph.parameters!.write('simson-epsilon', typed, 'learner'); });
            expect(graph.settings.epsilon, `typed ${typed}`).toBe(stop);
            expect(graph.parameters!.read('simson-epsilon')).toBe(stop);
        }
    });

    test('the overlay switches are display actions that run as the learner and follow the state', () => {
        const graph = new SimsonLineGraph();
        mountGraph(graph);
        expect(declare(graph).actions!.map(candidate => candidate.id)).toEqual(['grid', ...OVERLAYS]);
        expect(declare(graph).actions!.filter(candidate => candidate.puck)).toEqual([]);
        for (const id of ['grid', ...OVERLAYS]) {
            const was = declare(graph).actions!.find(candidate => candidate.id === id)!.pressed;
            act(() => graph.performAction(id));
            expect(declare(graph).actions!.find(candidate => candidate.id === id)!.pressed, id).toBe(!was);
        }
        expect(() => graph.performAction('nothing')).toThrow();
    });

    test('a hidden overlay hides its legend entry', () => {
        const graph = new SimsonLineGraph();
        mountGraph(graph);
        expect(graph.drawnObject('simson')!.visible).toBe(true);
        act(() => graph.performAction('simson'));
        expect(graph.drawnObject('simson')!.visible).toBe(false);
        expect(graph.drawnObject('nothing')).toBeUndefined();
    });
});
